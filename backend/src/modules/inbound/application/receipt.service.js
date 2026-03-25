/**
 * Module 4: Inbound Operations - Receipt Service
 * Core service cho CRUD và command operations
 */

const { ReceiptRepository } = require('../infra/receipt.repository');
const { ReceiptStatusHistoryRepository } = require('../infra/receipt-status-history.repository');
const { ReceiptWeighingRepository } = require('../infra/receipt-weighing.repository');
const { ReceiptStateMachine, RECEIPT_STATUS, RECEIPT_ACTIONS } = require('../domain/inbound.state-machine');
// CR-1 FIX: Import M3 PostingEngine for inventory posting
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
const { ReversalEngineService } = require('../../inventory-core/application/reversal-engine.service');
const { TolerancePolicy, WeightValidationPolicy, CancelPolicy, BaggedPolicy } = require('../domain/inbound.policy');
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
  /**
   * @param {PrismaClient} prisma
   * @param {PostingEngineService} postingEngine - Optional, defaults to new instance
   */
  constructor(prisma, postingEngine = null) {
    this.prisma = prisma;
    this.receiptRepo = new ReceiptRepository(prisma);
    this.historyRepo = new ReceiptStatusHistoryRepository(prisma);
    this.weighingRepo = new ReceiptWeighingRepository(prisma);
    // CR-1 FIX: Inject M3 PostingEngine + ReversalEngine
    this.postingEngine = postingEngine || new PostingEngineService(prisma);
    this.reversalEngine = new ReversalEngineService(prisma);
  }

  /**
   * Tạo receipt mới
   * CR-2 FIX: Wrapped trong $transaction để tránh race condition
   */
  async createReceipt(data, context = {}) {
    const { externalId, ownerId, vendorId, warehouseId, lines } = data;

    return this.prisma.$transaction(async (tx) => {
      // Check idempotency (trong transaction để tránh race condition)
      const existing = await tx.receiptHeader.findUnique({
        where: { externalId },
        include: { lines: true },
      });
      if (existing) {
        return { receipt: existing, idempotentReplay: true };
      }

      // Validate master data references
      await this.validateMasterReferences({ ownerId, vendorId, warehouseId }, tx);

      // Validate lines
      if (!lines || lines.length === 0) {
        throw new InboundError(ERROR_CODES.LINE_REQUIRED, 'Receipt phải có ít nhất 1 line');
      }

      // Multi-line receipts are now supported
      for (const line of lines) {
        await this.validateLineItem(line, tx);
      }

      // Calculate totalExpectedQty in KG (convert from source UOM to KG)
      const kgUom = await tx.mdUom.findFirst({ where: { uomCode: 'KG' } });
      console.log('[Receipt] KG UOM found:', kgUom?.id, kgUom?.uomCode);
      let totalExpectedQtyKg = 0;
      const linesWithConversion = [];

      for (const line of lines) {
        const qty = Number(line.expectedQty) || 0;
        let expectedQtyKg = qty;

        if (line.uomId && kgUom && line.uomId !== kgUom.id) {
          // Try to find item-specific conversion first, then global conversion
          let conversion = await tx.mdUomConversion.findFirst({
            where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
          });
          if (!conversion) {
            conversion = await tx.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
            });
          }
          console.log(`[Receipt] Line UOM conversion: uomId=${line.uomId}, qty=${qty}, conversion=${conversion?.conversionFactor}`);
          if (conversion) {
            expectedQtyKg = qty * Number(conversion.conversionFactor);
          } else {
            // Log warning for missing conversion
            console.warn(`[Receipt] No UOM conversion found: ${line.uomId} -> KG for item ${line.itemId}`);
          }
        }
        console.log(`[Receipt] Line: itemId=${line.itemId}, qty=${qty}, expectedQtyKg=${expectedQtyKg}`);

        totalExpectedQtyKg += expectedQtyKg;
        linesWithConversion.push({
          ...line,
          expectedQtyKg,
        });
      }

      // Create receipt - use connect for relations
      const receipt = await tx.receiptHeader.create({
        data: {
          externalId: data.externalId,
          receiptType: data.receiptType || 'STANDARD',
          poId: data.poId || null,
          asnId: data.asnId || null,
          vehicleNumber: data.vehicleNumber,
          blNumber: data.blNumber || null,
          expectedQty: totalExpectedQtyKg,
          notes: data.notes || null,
          status: RECEIPT_STATUS.NEW,
          correlationId: context.correlationId || `corr-${Date.now()}`,
          sourceApp: data.sourceApp || 'WEB',
          owner: { connect: { id: data.ownerId } },
          vendor: { connect: { id: data.vendorId } },
          warehouse: { connect: { id: data.warehouseId } },
          lines: {
            create: linesWithConversion.map((line, index) => ({
              item: { connect: { id: line.itemId } },
              uom: { connect: { id: line.uomId } },
              expectedQty: line.expectedQtyKg,
              cargoForm: line.cargoForm || 'BULK',
              notes: line.notes || null,
              lineNumber: index + 1,
            })),
          },
        },
        include: {
          lines: {
            include: {
              item: { select: { id: true, itemCode: true, itemName: true, cargoForm: true } },
              uom: { select: { id: true, uomCode: true, description: true } },
            },
            orderBy: { lineNumber: 'asc' },
          },
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          vendor: { select: { id: true, vendorCode: true, vendorName: true } },
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        },
      });

      // Log initial status
      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receipt.id,
          fromStatus: null,
          toStatus: RECEIPT_STATUS.NEW,
          transitionCode: 'CREATE',
          triggeredBy: context.userId,
          triggerRole: context.userRole,
          correlationId: receipt.correlationId,
        },
      });

      // M3 PO_CONFIRMED posting moved to confirmReceipt() — only post after confirm, not on draft create
      return { receipt, idempotentReplay: false };
    });
  }

  /**
   * Confirm receipt (DRAFT → AWAITING_WEIGHING)
   * HI-4 FIX: Gọi lockForUpdate để tránh concurrent updates
   */
  async confirmReceipt(receiptId, data, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      // Check idempotency
      if (data.externalId) {
        const existing = await this.receiptRepo.findByExternalId(data.externalId);
        if (existing && existing.id !== receiptId && existing.status !== RECEIPT_STATUS.NEW) {
          return { receipt: existing, idempotentReplay: true };
        }
      }

      // Validate state transition
      const canTransition = ReceiptStateMachine.canTransition(receipt.status, RECEIPT_ACTIONS.CONFIRM);
      if (!canTransition.allowed) {
        throw createInvalidStateError(receipt.status, RECEIPT_ACTIONS.CONFIRM);
      }

      // HI-3 FIX: Atomic receipt number generation
      let receiptNumber = receipt.receiptNumber;
      if (!receiptNumber) {
        receiptNumber = await this.generateReceiptNumberAtomic(tx);
      }

      // Update receipt
      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          receiptNumber,
          status: RECEIPT_STATUS.CONFIRMED,
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
          toStatus: RECEIPT_STATUS.CONFIRMED,
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
   * HI-4 FIX: Gọi lockForUpdate
   */
  async receiveWeighIn(receiptId, data, context = {}) {
    const { eventId, ticketId, grossWeightKg, eventTimestamp, sourceApp, rawPayload } = data;

    // Check duplicate event
    if (eventId && await this.weighingRepo.existsByEventId(eventId)) {
      const receipt = await this.receiptRepo.findById(receiptId);
      return { receipt, idempotentReplay: true };
    }

    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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
          status: RECEIPT_STATUS.WEIGHING_1,
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
          toStatus: RECEIPT_STATUS.WEIGHING_1,
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
   * HI-4 FIX: Gọi lockForUpdate
   */
  async startProcessing(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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
          status: RECEIPT_STATUS.UNLOADING,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: RECEIPT_STATUS.UNLOADING,
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
   * HI-4 FIX: Gọi lockForUpdate
   * HI-1 FIX: Wire BaggedPolicy.checkOverReceipt
   */
  async receiveWeighOut(receiptId, data, context = {}) {
    const { eventId, ticketId, tareWeightKg, eventTimestamp, sourceApp, rawPayload } = data;

    // Check duplicate event
    if (eventId && await this.weighingRepo.existsByEventId(eventId)) {
      const receipt = await this.receiptRepo.findById(receiptId);
      return { receipt, idempotentReplay: true, toleranceResult: null };
    }

    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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

      // Multi-line receipts supported - check bagged policy for all bagged lines
      for (const line of receipt.lines) {
        if (line.cargoForm && line.cargoForm !== 'BULK' && line.bagCount) {
          const lineData = {
            expectedQty: line.expectedQty,
            nominalWeightPerBag: line.nominalWeightPerBag,
          };
          const baggedCheck = await BaggedPolicy.checkOverReceipt(tx, receipt.poId, line.bagCount, lineData);
          if (baggedCheck.overReceiptBlocked) {
            throw new InboundError(ERROR_CODES.INVALID_STATE, 'Vượt quá số lượng bag cho phép của PO', baggedCheck);
          }
        }
      }

      // Lookup tolerance using first line's item (tolerance applies to overall receipt)
      const firstLine = receipt.lines[0];
      const toleranceLookup = await TolerancePolicy.lookupTolerance(tx, receipt.ownerId, firstLine.itemId);
      
      if (toleranceLookup.tolerance === null) {
        throw createToleranceLookupError(receipt.ownerId, firstLine.itemId);
      }

      const variancePct = TolerancePolicy.calculateVariance(netWeightKg, Number(receipt.expectedQty));
      const toleranceResult = TolerancePolicy.checkTolerance(variancePct, toleranceLookup.tolerance);

      // Determine next status
      const nextStatus = toleranceResult.pass ? RECEIPT_STATUS.COMPLETED : RECEIPT_STATUS.REJECTED;
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

      // If accepted, update received qty on lines and post inventory for each line
      if (toleranceResult.pass) {
        // Calculate total expected qty for ratio distribution
        const totalExpectedQty = receipt.lines.reduce((sum, l) => sum + Number(l.expectedQty || 0), 0);
        
        let lastPostingResult = null;
        for (const line of receipt.lines) {
          // Distribute netWeightKg proportionally to each line's expectedQty
          const lineRatio = totalExpectedQty > 0 ? Number(line.expectedQty || 0) / totalExpectedQty : 1 / receipt.lines.length;
          const lineReceivedQty = netWeightKg * lineRatio;

          await tx.receiptLine.update({
            where: { id: line.id },
            data: { receivedQty: lineReceivedQty, status: 'RECEIVED' },
          });

          // Post inventory for each line
          lastPostingResult = await this.postingEngine.postInventory({
            externalId: `RCPT-${receipt.id}-${line.id}`,
            correlationId: receipt.correlationId,
            eventCode: 'GOODS_RECEIVED',
            refType: 'RECEIPT',
            refId: receipt.id,
            refLineId: line.id,
            itemId: line.itemId,
            qty: String(lineReceivedQty),
            uomCode: line.uom?.uomCode || 'KG',
            dimTo: {
              warehouseCode: receipt.warehouse?.warehouseCode,
              locationCode: receipt.receivingLocation?.locationCode,
              ownerCode: receipt.owner?.ownerCode,
              statusCode: 'AVAILABLE',
            },
            sourceApp: context.sourceApp || 'WEB',
            postedBy: context.userId,
          }, tx);
        }

        // Save last posting reference to receipt header
        if (lastPostingResult) {
          updateData.postedTransId = lastPostingResult.transId;
        }
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
          toStatus: RECEIPT_STATUS.WEIGHING_2,
          transitionCode: RECEIPT_ACTIONS.WEIGH_OUT,
          triggeredBy: context.userId,
          correlationId: receipt.correlationId,
          metadata: { tareWeightKg, netWeightKg },
        },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: RECEIPT_STATUS.WEIGHING_2,
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
   * HI-4 FIX: Gọi lockForUpdate
   */
  async reweighReceipt(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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
          status: RECEIPT_STATUS.CONFIRMED,
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
          toStatus: RECEIPT_STATUS.CONFIRMED,
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
   * HI-4 FIX: Gọi lockForUpdate
   */
  async cancelReceipt(receiptId, data, context = {}) {
    const { reasonCode, note } = data;

    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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
   * HI-4 FIX: Gọi lockForUpdate
   */
  async closeReceipt(receiptId, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // HI-4: Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      // BUG-FIX: Pass tx to read within transaction context
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
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
   * Report error receipt (DRAFT → ERROR)
   * Cho phép đánh dấu phiếu nhập có lỗi cần xử lý
   */
  async reportErrorReceipt(receiptId, data = {}, context = {}) {
    return this.prisma.$transaction(async (tx) => {
      // Lock receipt for update
      await this.receiptRepo.lockForUpdate(receiptId, tx);
      const receipt = await this.receiptRepo.findById(receiptId, true, tx);
      if (!receipt) {
        throw createReceiptNotFoundError(receiptId);
      }

      // Chỉ cho phép báo lỗi khi status = DRAFT
      if (receipt.status !== RECEIPT_STATUS.NEW) {
        throw createInvalidStateError(receipt.status, 'REPORT_ERROR');
      }

      const updated = await tx.receiptHeader.update({
        where: { id: receiptId },
        data: {
          status: 'ERROR',
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
        include: { lines: true },
      });

      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: 'ERROR',
          transitionCode: 'REPORT_ERROR',
          triggeredBy: context.userId,
          triggerRole: context.userRole,
          note: data.note || null,
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

  async validateMasterReferences({ ownerId, vendorId, warehouseId }, tx = null) {
    const db = tx || this.prisma;
    const [owner, vendor, warehouse] = await Promise.all([
      db.mdOwner.findUnique({ where: { id: ownerId }, select: { isActive: true } }),
      db.mdVendor.findUnique({ where: { id: vendorId }, select: { isActive: true } }),
      db.mdWarehouse.findUnique({ where: { id: warehouseId }, select: { isActive: true } }),
    ]);

    if (!owner?.isActive) throw createMasterReferenceError('Owner', ownerId);
    if (!vendor?.isActive) throw createMasterReferenceError('Vendor', vendorId);
    if (!warehouse?.isActive) throw createMasterReferenceError('Warehouse', warehouseId);
  }

  async validateLineItem(line, tx = null) {
    const db = tx || this.prisma;
    const item = await db.mdItem.findUnique({
      where: { id: line.itemId },
      select: { isActive: true },
    });
    if (!item?.isActive) {
      throw createMasterReferenceError('Item', line.itemId);
    }
  }

  /**
   * HI-3 FIX: Atomic receipt number generation using database sequence
   * Sử dụng advisory lock để tránh race condition
   */
  async generateReceiptNumberAtomic(tx) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCV-${dateStr}`;
    
    // Use advisory lock to ensure atomic sequence generation
    const lockKey = parseInt(dateStr);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    
    // Get max sequence for today
    const result = await tx.$queryRaw`
      SELECT receipt_number 
      FROM receipt_header 
      WHERE receipt_number LIKE ${prefix + '%'}
      ORDER BY receipt_number DESC 
      LIMIT 1
    `;
    
    let nextSeq = 1;
    if (result.length > 0 && result[0].receipt_number) {
      const lastNum = result[0].receipt_number;
      const lastSeq = parseInt(lastNum.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    
    const seq = String(nextSeq).padStart(6, '0');
    return `${prefix}-${seq}`;
  }

  // Deprecated: use generateReceiptNumberAtomic instead
  async generateReceiptNumber(tx) {
    return this.generateReceiptNumberAtomic(tx);
  }
}

module.exports = { ReceiptService };
