/**
 * Module 4: Inbound Operations - Receipt Service
 * Core service cho CRUD và command operations
 */

const { ReceiptRepository } = require('../infra/receipt.repository');
const { ReceiptStatusHistoryRepository } = require('../infra/receipt-status-history.repository');
const { ReceiptWeighingRepository } = require('../infra/receipt-weighing.repository');
const { ReceiptStateMachine, RECEIPT_STATUS, RECEIPT_ACTIONS } = require('../domain/inbound.state-machine');
const { TolerancePolicy, WeightValidationPolicy, CancelPolicy } = require('../domain/inbound.policy');
const {
  InboundError,
  ERROR_CODES,
  createReceiptNotFoundError,
  createDuplicateExternalIdError,
  createInvalidStateError,
  createMasterReferenceError,
  createLocationTypeError,
  createDuplicateWeightEventError,
  createReweighLimitError,
  createInvalidWeightError,
  createToleranceLookupError,
} = require('../domain/inbound.errors');

class ReceiptService {
  constructor(prisma) {
    this.prisma = prisma;
    this.receiptRepo = new ReceiptRepository(prisma);
    this.historyRepo = new ReceiptStatusHistoryRepository(prisma);
    this.weighingRepo = new ReceiptWeighingRepository(prisma);
  }

  /**
   * Tạo receipt mới
   */
  async createReceipt(data, context = {}) {
    const { externalId, ownerId, vendorId, warehouseId, receivingLocationId, lines } = data;

    // Check idempotency
    const existing = await this.receiptRepo.findByExternalId(externalId);
    if (existing) {
      return { receipt: existing, idempotentReplay: true };
    }

    // Validate master data references
    await this.validateMasterReferences({ ownerId, vendorId, warehouseId, receivingLocationId });

    // Validate receiving location type
    const location = await this.prisma.mdLocation.findUnique({
      where: { id: receivingLocationId },
      select: { locationType: true },
    });
    if (location.locationType !== 'RECEIVING') {
      throw createLocationTypeError(location.locationType);
    }

    // Validate lines
    if (!lines || lines.length === 0) {
      throw new InboundError(ERROR_CODES.LINE_REQUIRED, 'Receipt phải có ít nhất 1 line');
    }
    for (const line of lines) {
      await this.validateLineItem(line);
    }

    // Create receipt
    const receipt = await this.receiptRepo.createWithLines({
      ...data,
      status: RECEIPT_STATUS.DRAFT,
      correlationId: context.correlationId || `corr-${Date.now()}`,
      sourceApp: data.sourceApp || 'WEB',
    });

    // Log initial status
    await this.historyRepo.create({
      receiptHeaderId: receipt.id,
      fromStatus: null,
      toStatus: RECEIPT_STATUS.DRAFT,
      transitionCode: 'CREATE',
      triggeredBy: context.userId,
      triggerRole: context.userRole,
      correlationId: receipt.correlationId,
    });

    return { receipt, idempotentReplay: false };
  }

  /**
   * Confirm receipt (DRAFT → AWAITING_WEIGHING)
   */
  async confirmReceipt(receiptId, data, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // Lock receipt
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      // Check idempotency
      if (data.externalId) {
        const existing = await this.receiptRepo.findByExternalId(data.externalId);
        if (existing && existing.id !== receiptId && existing.status !== RECEIPT_STATUS.DRAFT) {
          return { receipt: existing, idempotentReplay: true };
        }
      }

      // Validate state transition
      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.CONFIRM);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.CONFIRM);
      }

      // Generate receipt number if not exists
      let receiptNumber = receipt.receiptNumber;
      if (!receiptNumber) {
        receiptNumber = await this.generateReceiptNumber(tx);
      }

      // Update receipt
      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          receiptNumber,
          status: RECEIPT_STATUS.AWAITING_WEIGHING,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      // Log status change
      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.AWAITING_WEIGHING,
          transitionCode: RECEIPT_ACTIONS.CONFIRM,
          triggeredBy: context.userId,
          triggerRole: context.userRole,
          correlationId: receipt.correlationId,
        },
      });

      return { receipt: updated, idempotentReplay: false };
    });
  }

  /**
   * Nhận weigh-in event
   */
  async receiveWeighIn(receiptId, data, context = {}) {
    const { eventId, ticketId, grossWeightKg, eventTimestamp, sourceApp, rawPayload } = data;

    // Check duplicate event
    if (eventId && await this.weighingRepo.existsByEventId(eventId)) {
      const receipt = await this.receiptRepo.findById(receiptId);
      return { receipt, idempotentReplay: true };
    }

    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      // Validate state
      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.WEIGH_IN);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.WEIGH_IN);
      }

      // Validate weight
      const weightValidation = WeightValidationPolicy.validateGrossWeight(grossWeightKg);
      if (!weightValidation.valid) {
        throw createInvalidWeightError(weightValidation.reason, { grossWeightKg });
      }

      // Create weigh log
      await tx.receiptWeighingLog.create({
        data: {
          receiptHeaderId: receiptId,
          attemptNumber: receipt.attemptNumber,
          weighPhase: 'IN',
          ticketId,
          eventId,
          grossWeightKg,
          sourceApp: sourceApp || 'INTEGRATION',
          eventTimestamp: new Date(eventTimestamp),
          rawPayload,
          createdBy: context.userId,
        },
      });

      // Update receipt
      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          grossWeightKg,
          status: RECEIPT_STATUS.WEIGHED_IN,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      // Log status change
      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.WEIGHED_IN,
          transitionCode: RECEIPT_ACTIONS.WEIGH_IN,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
          metadata: { grossWeightKg, eventId, ticketId },
        },
      });

      return { receipt: updated, idempotentReplay: false };
    });
  }

  /**
   * Start processing (WEIGHED_IN → PROCESSING)
   */
  async startProcessing(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.START_PROCESSING);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.START_PROCESSING);
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          status: RECEIPT_STATUS.PROCESSING,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.PROCESSING,
          transitionCode: RECEIPT_ACTIONS.START_PROCESSING,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
        },
      });

      return { receipt: updated };
    });
  }

  /**
   * Nhận weigh-out event và check tolerance
   */
  async receiveWeighOut(receiptId, data, context = {}) {
    const { eventId, ticketId, tareWeightKg, eventTimestamp, sourceApp, rawPayload } = data;

    // Check duplicate event
    if (eventId && await this.weighingRepo.existsByEventId(eventId)) {
      const receipt = await this.receiptRepo.findById(receiptId);
      return { receipt, idempotentReplay: true, toleranceResult: null };
    }

    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      // Validate state
      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.WEIGH_OUT);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.WEIGH_OUT);
      }

      // Validate weight
      const grossWeightKg = Number(receipt.grossWeightKg);
      const weightValidation = WeightValidationPolicy.validateTareWeight(tareWeightKg, grossWeightKg);
      if (!weightValidation.valid) {
        throw createInvalidWeightError(weightValidation.reason, { tareWeightKg, grossWeightKg });
      }

      // Calculate net weight
      const netWeightKg = WeightValidationPolicy.calculateNetWeight(grossWeightKg, tareWeightKg);

      // Create weigh log
      await tx.receiptWeighingLog.create({
        data: {
          receiptHeaderId: receiptId,
          attemptNumber: receipt.attemptNumber,
          weighPhase: 'OUT',
          ticketId,
          eventId,
          tareWeightKg,
          netWeightKg,
          sourceApp: sourceApp || 'INTEGRATION',
          eventTimestamp: new Date(eventTimestamp),
          rawPayload,
          createdBy: context.userId,
        },
      });

      // Lookup tolerance và check
      const line = receipt.lines[0]; // Phase 1: single line
      const toleranceLookup = await TolerancePolicy.lookupTolerance(tx, receipt.ownerId, line.itemId);
      
      if (toleranceLookup.tolerance === null) {
        throw createToleranceLookupError(receipt.ownerId, line.itemId);
      }

      const variancePct = TolerancePolicy.calculateVariance(netWeightKg, Number(receipt.expectedQty));
      const toleranceResult = TolerancePolicy.checkTolerance(variancePct, toleranceLookup.tolerance);

      // Determine next status
      const nextStatus = toleranceResult.pass ? RECEIPT_STATUS.RECEIVED : RECEIPT_STATUS.REJECTED;
      const transitionCode = toleranceResult.pass ? RECEIPT_ACTIONS.AUTO_ACCEPT : RECEIPT_ACTIONS.AUTO_REJECT;

      // Update receipt
      const updateData = {
        tareWeightKg,
        netWeightKg,
        status: nextStatus,
        tolerancePctApplied: toleranceLookup.tolerance,
        variancePct,
        rowVersion: { increment: 1 },
        updatedBy: context.userId,
      };

      // If accepted, update received qty on lines
      if (toleranceResult.pass) {
        await tx.receiptLine.updateMany({
          where: { receiptHeaderId: receiptId },
          data: { receivedQty: netWeightKg, status: 'RECEIVED' },
        });
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: updateData,
        include: { lines: true },
      });

      // Log status changes (WEIGHED_OUT first, then RECEIVED/REJECTED)
      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.WEIGHED_OUT,
          transitionCode: RECEIPT_ACTIONS.WEIGH_OUT,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
          metadata: { tareWeightKg, netWeightKg },
        },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: RECEIPT_STATUS.WEIGHED_OUT,
          toStatus: nextStatus,
          transitionCode,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
          metadata: { variancePct, tolerancePct: toleranceLookup.tolerance, toleranceSource: toleranceLookup.source },
        },
      });

      // If rejected, log exception
      if (!toleranceResult.pass) {
        await tx.receiptExceptionLog.create({
          data: {
            receiptHeaderId: receiptId,
            exceptionType: 'TOLERANCE_FAIL',
            severity: 'HIGH',
            stage: 'WEIGH_OUT',
            message: `Variance ${variancePct.toFixed(2)}% vượt tolerance ${toleranceLookup.tolerance}%`,
            details: { variancePct, tolerancePct: toleranceLookup.tolerance, netWeightKg, expectedQty: receipt.expectedQty },
            correlationId: receipt.correlationId,
            occurredBy: context.userId,
          },
        });
      }

      return { receipt: updated, idempotentReplay: false, toleranceResult };
    });
  }

  /**
   * Reweigh receipt (REJECTED → AWAITING_WEIGHING)
   */
  async reweighReceipt(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      const canReweigh = ReceiptStateMachine.canReweigh(receipt.status, receipt.attemptNumber);
      if (!canReweigh.allowed) {
        if (receipt.attemptNumber >= 3) {
          throw createReweighLimitError(receipt.attemptNumber);
        }
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.REWEIGH);
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          status: RECEIPT_STATUS.AWAITING_WEIGHING,
          attemptNumber: { increment: 1 },
          grossWeightKg: null,
          tareWeightKg: null,
          netWeightKg: null,
          variancePct: null,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.AWAITING_WEIGHING,
          transitionCode: RECEIPT_ACTIONS.REWEIGH,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
          metadata: { previousAttempt: receipt.attemptNumber, newAttempt: receipt.attemptNumber + 1 },
        },
      });

      return { receipt: updated };
    });
  }

  /**
   * Cancel receipt
   */
  async cancelReceipt(receiptId, data, context = {}) {
    const { reasonCode, note } = data;

    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      const canCancel = CancelPolicy.canCancel(receipt.status, !!receipt.postedTransId);
      if (!canCancel.allowed) {
        throw new InboundError(ERROR_CODES.INVALID_STATE, canCancel.reason, { status: receipt.status });
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          status: RECEIPT_STATUS.CANCELLED,
          cancelReasonCode: reasonCode,
          cancelledBy: context.userId,
          cancelledAt: new Date(),
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      // Update lines to cancelled
      await tx.receiptLine.updateMany({
        where: { receiptHeaderId: receiptId },
        data: { status: 'CANCELLED' },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.CANCELLED,
          transitionCode: RECEIPT_ACTIONS.CANCEL,
          triggeredBy: context.userId,
          triggerRole: context.userRole,
          reasonCode,
          note,
          correlationId: receipt.correlationId,
        },
      });

      return { receipt: updated };
    });
  }

  /**
   * Close receipt (PUTAWAY → CLOSED)
   */
  async closeReceipt(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await this.receiptRepo.findById(receiptId);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.CLOSE);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.CLOSE);
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          status: RECEIPT_STATUS.CLOSED,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.CLOSED,
          transitionCode: RECEIPT_ACTIONS.CLOSE,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
        },
      });

      return { receipt: updated };
    });
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId) {
    const receipt = await this.receiptRepo.findById(receiptId);
    if (!receipt) {
      throw createReceiptNotFoundError(receiptId);
    }
    return receipt;
  }

  /**
   * List receipts
   */
  async listReceipts(filter, options) {
    return this.receiptRepo.findMany(filter, options);
  }

  /**
   * Get receipt history
   */
  async getReceiptHistory(receiptId) {
    const receipt = await this.receiptRepo.findById(receiptId, false);
    if (!receipt) {
      throw createReceiptNotFoundError(receiptId);
    }

    const [statusHistory, weighingLogs] = await Promise.all([
      this.historyRepo.findByReceiptId(receiptId),
      this.weighingRepo.findByReceiptId(receiptId),
    ]);

    return { statusHistory, weighingLogs };
  }

  // === Helper Methods ===

  async validateMasterReferences({ ownerId, vendorId, warehouseId, receivingLocationId }) {
    const [owner, vendor, warehouse, location] = await Promise.all([
      this.prisma.mdOwner.findUnique({ where: { id: ownerId }, select: { isActive: true } }),
      this.prisma.mdVendor.findUnique({ where: { id: vendorId }, select: { isActive: true } }),
      this.prisma.mdWarehouse.findUnique({ where: { id: warehouseId }, select: { isActive: true } }),
      this.prisma.mdLocation.findUnique({ where: { id: receivingLocationId }, select: { isActive: true } }),
    ]);

    if (!owner?.isActive) throw createMasterReferenceError('Owner', ownerId);
    if (!vendor?.isActive) throw createMasterReferenceError('Vendor', vendorId);
    if (!warehouse?.isActive) throw createMasterReferenceError('Warehouse', warehouseId);
    if (!location?.isActive) throw createMasterReferenceError('Location', receivingLocationId);
  }

  async validateLineItem(line) {
    const item = await this.prisma.mdItem.findUnique({
      where: { id: line.itemId },
      select: { isActive: true },
    });
    if (!item?.isActive) {
      throw createMasterReferenceError('Item', line.itemId);
    }
  }

  async generateReceiptNumber(tx) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get next sequence (simplified - in production use NumberSequence service)
    const count = await tx.receiptHeader.count({
      where: {
        receiptNumber: { startsWith: `RCV-${dateStr}` },
      },
    });
    
    const seq = String(count + 1).padStart(6, '0');
    return `RCV-${dateStr}-${seq}`;
  }
}

module.exports = { ReceiptService };
