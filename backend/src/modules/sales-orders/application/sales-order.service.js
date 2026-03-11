/**
 * Sales Orders Module - Application Service
 * Core business logic + orchestration
 */

const { v4: uuidv4 } = require('uuid');
const { Decimal } = require('decimal.js');
const { SalesOrderRepository } = require('../infra/sales-order.repository');
const { SalesOrderStatusHistoryRepository } = require('../infra/sales-order-status-history.repository');
const { SalesOrderStateMachine, SO_STATUS, SO_LINE_STATUS, SO_ACTIONS } = require('../domain/sales-order.state-machine');
const { BlockingPolicy, MasterDataValidation } = require('../domain/sales-order.policy');
const {
  SalesOrderError,
  createNotFoundError,
  createInvalidStateError,
  createNoLinesError,
  createDuplicateExternalIdError,
  createNotDraftError,
  createHasShipmentsError,
  createBlockingExceededError,
  createMasterRefError,
  createNotShippedError,
  createOptimisticLockError,
} = require('../domain/sales-order.errors');

class SalesOrderService {
  constructor(prisma) {
    this.prisma = prisma;
    this.repo = new SalesOrderRepository(prisma);
    this.historyRepo = new SalesOrderStatusHistoryRepository(prisma);
  }

  // ──────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────
  async createSalesOrder(input, context) {
    // Idempotency check
    const existing = await this.repo.findByExternalId(input.externalId);
    if (existing) {
      return { salesOrder: existing, idempotentReplay: true };
    }

    // Validate master data references
    const refErrors = await MasterDataValidation.validateReferences(this.prisma, {
      ownerId: input.ownerId,
      customerId: input.customerId,
      warehouseId: input.warehouseId,
    });
    if (refErrors.length > 0) {
      throw createMasterRefError(refErrors[0].entity, refErrors[0].id);
    }

    // Validate lines
    if (!input.lines || input.lines.length === 0) {
      throw createNoLinesError();
    }

    const lineErrors = await MasterDataValidation.validateLineItems(this.prisma, input.lines);
    if (lineErrors.length > 0) {
      throw createMasterRefError(lineErrors[0].entity, lineErrors[0].id);
    }

    // Generate SO number
    const soNumber = await this._generateSoNumber();
    const correlationId = uuidv4();

    // Calculate totals
    const totalExpectedQtyKg = input.lines.reduce(
      (sum, l) => new Decimal(sum).plus(l.expectedQtyKg).toNumber(),
      0
    );

    const salesOrder = await this.prisma.$transaction(async (tx) => {
      const so = await new SalesOrderRepository(tx).create({
        soNumber,
        externalSoNumber: input.externalSoNumber || null,
        orderType: input.orderType || 'STANDARD',
        status: SO_STATUS.DRAFT,
        ownerId: input.ownerId,
        customerId: input.customerId,
        warehouseId: input.warehouseId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        deliveryAddress: input.deliveryAddress || null,
        notes: input.notes || null,
        currency: input.currency || 'VND',
        totalExpectedQtyKg,
        externalId: input.externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: context.userId,
        updatedBy: context.userId,
        lines: {
          create: input.lines.map((line, idx) => ({
            lineNumber: idx + 1,
            itemId: line.itemId,
            cargoForm: line.cargoForm,
            uomId: line.uomId,
            expectedQty: line.expectedQty,
            expectedQtyKg: line.expectedQtyKg,
            unitPrice: line.unitPrice || null,
            bagCount: line.bagCount || null,
            nominalWeightPerBag: line.nominalWeightPerBag || null,
            notes: line.notes || null,
            status: SO_LINE_STATUS.OPEN,
            createdBy: context.userId,
            updatedBy: context.userId,
          })),
        },
      });

      // Record status history
      await new SalesOrderStatusHistoryRepository(tx).create({
        soId: so.id,
        entityLevel: 'HEADER',
        fromStatus: null,
        toStatus: SO_STATUS.DRAFT,
        triggerAction: 'CREATE',
        changedBy: context.userId,
        correlationId,
      });

      return so;
    });

    return { salesOrder, idempotentReplay: false };
  }

  // ──────────────────────────────────────────────
  // UPDATE (DRAFT only)
  // ──────────────────────────────────────────────
  async updateSalesOrder(soId, input, context) {
    const so = await this._findOrThrow(soId);

    if (so.status !== SO_STATUS.DRAFT) {
      throw createNotDraftError(so.status);
    }

    return this.prisma.$transaction(async (tx) => {
      const txRepo = new SalesOrderRepository(tx);

      // Update header fields
      const headerData = {};
      if (input.customerId !== undefined) headerData.customerId = input.customerId;
      if (input.expectedDeliveryDate !== undefined) headerData.expectedDeliveryDate = input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null;
      if (input.deliveryAddress !== undefined) headerData.deliveryAddress = input.deliveryAddress;
      if (input.notes !== undefined) headerData.notes = input.notes;
      if (input.externalSoNumber !== undefined) headerData.externalSoNumber = input.externalSoNumber;
      headerData.updatedBy = context.userId;

      // Handle lines if provided
      if (input.lines) {
        // Delete existing lines and recreate
        await tx.salesOrderLine.deleteMany({ where: { soId } });

        let totalExpectedQtyKg = 0;
        for (let i = 0; i < input.lines.length; i++) {
          const line = input.lines[i];
          totalExpectedQtyKg = new Decimal(totalExpectedQtyKg).plus(line.expectedQtyKg).toNumber();
          await tx.salesOrderLine.create({
            data: {
              soId,
              lineNumber: i + 1,
              itemId: line.itemId,
              cargoForm: line.cargoForm,
              uomId: line.uomId,
              expectedQty: line.expectedQty,
              expectedQtyKg: line.expectedQtyKg,
              unitPrice: line.unitPrice || null,
              bagCount: line.bagCount || null,
              nominalWeightPerBag: line.nominalWeightPerBag || null,
              notes: line.notes || null,
              status: SO_LINE_STATUS.OPEN,
              createdBy: context.userId,
              updatedBy: context.userId,
            },
          });
        }
        headerData.totalExpectedQtyKg = totalExpectedQtyKg;
      }

      return txRepo.update(soId, headerData);
    });
  }

  // ──────────────────────────────────────────────
  // CONFIRM (DRAFT → CONFIRMED)
  // ──────────────────────────────────────────────
  async confirmSalesOrder(soId, context) {
    const so = await this._findOrThrow(soId);

    const transition = SalesOrderStateMachine.canTransition(so.status, SO_ACTIONS.CONFIRM);
    if (!transition.allowed) {
      throw createInvalidStateError(so.status, SO_ACTIONS.CONFIRM);
    }

    if (!so.lines || so.lines.length === 0) {
      throw createNoLinesError();
    }

    // Validate master data still active
    const refErrors = await MasterDataValidation.validateReferences(this.prisma, {
      ownerId: so.ownerId,
      customerId: so.customerId,
      warehouseId: so.warehouseId,
    });
    if (refErrors.length > 0) {
      throw createMasterRefError(refErrors[0].entity, refErrors[0].id);
    }

    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      const updated = await new SalesOrderRepository(tx).update(soId, {
        status: SO_STATUS.CONFIRMED,
        updatedBy: context.userId,
        rowVersion: { increment: 1 },
      });

      await new SalesOrderStatusHistoryRepository(tx).create({
        soId,
        entityLevel: 'HEADER',
        fromStatus: SO_STATUS.DRAFT,
        toStatus: SO_STATUS.CONFIRMED,
        triggerAction: SO_ACTIONS.CONFIRM,
        changedBy: context.userId,
        correlationId,
      });

      return updated;
    });
  }

  // ──────────────────────────────────────────────
  // CANCEL
  // ──────────────────────────────────────────────
  async cancelSalesOrder(soId, input, context) {
    const so = await this._findOrThrow(soId);

    if (!SalesOrderStateMachine.canCancel(so.status)) {
      throw createInvalidStateError(so.status, SO_ACTIONS.CANCEL);
    }

    // Check no active shipments
    const shipmentCount = await this.repo.getLinkedShipmentCount(soId);
    if (shipmentCount > 0) {
      throw createHasShipmentsError(soId, shipmentCount);
    }

    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // Cancel all lines
      await tx.salesOrderLine.updateMany({
        where: { soId, status: { not: SO_LINE_STATUS.CANCELLED } },
        data: { status: SO_LINE_STATUS.CANCELLED, updatedBy: context.userId },
      });

      const updated = await new SalesOrderRepository(tx).update(soId, {
        status: SO_STATUS.CANCELLED,
        cancelReasonCode: input.reasonCode,
        updatedBy: context.userId,
        rowVersion: { increment: 1 },
      });

      await new SalesOrderStatusHistoryRepository(tx).create({
        soId,
        entityLevel: 'HEADER',
        fromStatus: so.status,
        toStatus: SO_STATUS.CANCELLED,
        triggerAction: SO_ACTIONS.CANCEL,
        changedBy: context.userId,
        reasonCode: input.reasonCode,
        note: input.note || null,
        correlationId,
      });

      return updated;
    });
  }

  // ──────────────────────────────────────────────
  // CLOSE (SHIPPED → CLOSED)
  // ──────────────────────────────────────────────
  async closeSalesOrder(soId, input, context) {
    const so = await this._findOrThrow(soId);

    const transition = SalesOrderStateMachine.canTransition(so.status, SO_ACTIONS.CLOSE);
    if (!transition.allowed) {
      throw createInvalidStateError(so.status, SO_ACTIONS.CLOSE);
    }

    // Check all shipments are SHIPPED/CLOSED/CANCELLED
    const activeCount = await this.repo.getActiveShipmentCount(soId);
    if (activeCount > 0) {
      throw createNotShippedError(soId, activeCount);
    }

    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // Close all lines
      await tx.salesOrderLine.updateMany({
        where: { soId, status: { not: SO_LINE_STATUS.CANCELLED } },
        data: { status: SO_LINE_STATUS.CLOSED, updatedBy: context.userId },
      });

      const updated = await new SalesOrderRepository(tx).update(soId, {
        status: SO_STATUS.CLOSED,
        closedAt: new Date(),
        updatedBy: context.userId,
        rowVersion: { increment: 1 },
      });

      await new SalesOrderStatusHistoryRepository(tx).create({
        soId,
        entityLevel: 'HEADER',
        fromStatus: SO_STATUS.SHIPPED,
        toStatus: SO_STATUS.CLOSED,
        triggerAction: SO_ACTIONS.CLOSE,
        changedBy: context.userId,
        note: input?.note || null,
        correlationId,
      });

      return updated;
    });
  }

  // ──────────────────────────────────────────────
  // RELEASE SHIPMENT (SO → Shipment)
  // ──────────────────────────────────────────────
  async releaseShipment(soId, input, context) {
    const so = await this._findOrThrow(soId);

    if (!SalesOrderStateMachine.canRelease(so.status)) {
      throw createInvalidStateError(so.status, SO_ACTIONS.RELEASE_SHIPMENT);
    }

    // Validate blocking per line (TC-11)
    const lineMap = {};
    for (const line of so.lines) {
      lineMap[line.id] = line;
    }

    for (const releaseLine of input.lines) {
      const soLine = lineMap[releaseLine.soLineId];
      if (!soLine) {
        throw new SalesOrderError('SO_400', `SO line không tồn tại: ${releaseLine.soLineId}`, null, 400);
      }
      const check = BlockingPolicy.checkLineBlocking(
        soLine.expectedQtyKg,
        soLine.releasedQtyKg,
        releaseLine.releaseQtyKg
      );
      if (!check.allowed) {
        throw createBlockingExceededError(
          soLine.lineNumber,
          soLine.item?.itemCode || soLine.itemId,
          new Decimal(soLine.expectedQtyKg).minus(soLine.releasedQtyKg).toNumber(),
          releaseLine.releaseQtyKg
        );
      }
    }

    const correlationId = uuidv4();
    const shipmentExternalId = input.externalId || `SHP-FROM-SO-${soId}-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // Generate shipment number
      const shipmentNumber = await this._generateShipmentNumber();

      // Calculate total release qty
      let totalReleaseQtyKg = 0;

      // Create ShipmentHeader
      const shipment = await tx.shipmentHeader.create({
        data: {
          shipmentNumber,
          soId: so.soNumber,
          salesOrderId: soId,
          sourceType: 'SO',
          ownerId: so.ownerId,
          customerId: so.customerId,
          warehouseId: so.warehouseId,
          vehicleNumber: input.vehicleNumber,
          vehicleTypeId: input.vehicleTypeId || null,
          status: 'DRAFT',
          externalId: shipmentExternalId,
          correlationId,
          sourceApp: 'WEB',
          createdBy: context.userId,
          updatedBy: context.userId,
          lines: {
            create: input.lines.map((releaseLine, idx) => {
              const soLine = lineMap[releaseLine.soLineId];
              totalReleaseQtyKg = new Decimal(totalReleaseQtyKg).plus(releaseLine.releaseQtyKg).toNumber();
              return {
                lineNumber: idx + 1,
                soLineId: releaseLine.soLineId,
                itemId: soLine.itemId,
                cargoForm: soLine.cargoForm,
                uomId: soLine.uomId,
                expectedQty: releaseLine.releaseQtyKg,
                expectedQtyKg: releaseLine.releaseQtyKg,
                bagCount: releaseLine.bagCount || soLine.bagCount || null,
                nominalWeightPerBag: soLine.nominalWeightPerBag || null,
                lineStatus: 'PENDING',
                createdBy: context.userId,
                updatedBy: context.userId,
              };
            }),
          },
        },
        include: {
          lines: true,
        },
      });

      // Create ShipmentSoLink records
      for (const releaseLine of input.lines) {
        const soLine = lineMap[releaseLine.soLineId];
        await tx.shipmentSoLink.create({
          data: {
            shipmentHeaderId: shipment.id,
            soId: so.soNumber,
            soLineId: String(soLine.lineNumber),
            salesOrderId: soId,
            salesOrderLineId: releaseLine.soLineId,
            expectedQtyKg: releaseLine.releaseQtyKg,
          },
        });
      }

      // Update SO lines releasedQtyKg
      for (const releaseLine of input.lines) {
        const soLine = lineMap[releaseLine.soLineId];
        const newReleased = new Decimal(soLine.releasedQtyKg).plus(releaseLine.releaseQtyKg).toNumber();
        const lineStatus = SalesOrderStateMachine.computeLineStatusAfterRelease(
          Number(soLine.expectedQtyKg),
          newReleased
        );

        await tx.salesOrderLine.update({
          where: { id: releaseLine.soLineId },
          data: {
            releasedQtyKg: newReleased,
            status: lineStatus,
            updatedBy: context.userId,
          },
        });
      }

      // Update SO header totals and status
      const newTotalReleased = new Decimal(so.totalReleasedQtyKg).plus(totalReleaseQtyKg).toNumber();
      const newSoStatus = SalesOrderStateMachine.computeStatusAfterRelease(
        Number(so.totalExpectedQtyKg),
        newTotalReleased
      );

      const updatedSo = await new SalesOrderRepository(tx).update(soId, {
        totalReleasedQtyKg: newTotalReleased,
        status: newSoStatus,
        updatedBy: context.userId,
        rowVersion: { increment: 1 },
      });

      // Record status history if status changed
      if (so.status !== newSoStatus) {
        await new SalesOrderStatusHistoryRepository(tx).create({
          soId,
          entityLevel: 'HEADER',
          fromStatus: so.status,
          toStatus: newSoStatus,
          triggerAction: SO_ACTIONS.RELEASE_SHIPMENT,
          changedBy: context.userId,
          correlationId,
        });
      }

      return { salesOrder: updatedSo, shipment };
    });
  }

  // ──────────────────────────────────────────────
  // CALLBACK: Shipment Status Changed
  // Called by Outbound module when shipment status changes
  // ──────────────────────────────────────────────
  async onShipmentStatusChanged(shipmentId, newStatus, context) {
    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id: shipmentId },
      select: { id: true, salesOrderId: true, status: true, totalNetKg: true },
    });

    if (!shipment?.salesOrderId) return null;

    const soId = shipment.salesOrderId;

    if (newStatus === 'SHIPPED') {
      return this._handleShipmentShipped(soId, shipment, context);
    }

    if (newStatus === 'CANCELLED') {
      return this._handleShipmentCancelled(soId, shipment, context);
    }

    return null;
  }

  async _handleShipmentShipped(soId, shipment, context) {
    const so = await this._findOrThrow(soId);
    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // Update SO shipped qty from ShipmentSoLinks
      const soLinks = await tx.shipmentSoLink.findMany({
        where: { shipmentHeaderId: shipment.id, salesOrderId: soId },
      });

      for (const link of soLinks) {
        if (link.salesOrderLineId) {
          await tx.salesOrderLine.update({
            where: { id: link.salesOrderLineId },
            data: {
              shippedQtyKg: { increment: Number(link.shippedQtyKg || link.expectedQtyKg) },
              updatedBy: context?.userId,
            },
          });
        }
      }

      // Recalculate total shipped
      const lines = await tx.salesOrderLine.findMany({ where: { soId } });
      const totalShipped = lines.reduce((sum, l) => new Decimal(sum).plus(l.shippedQtyKg).toNumber(), 0);

      // Check if all shipments are shipped
      const activeCount = await tx.shipmentHeader.count({
        where: {
          salesOrderId: soId,
          status: { notIn: ['SHIPPED', 'CLOSED', 'CANCELLED'] },
        },
      });

      let newStatus = so.status;
      if (activeCount === 0 && totalShipped > 0) {
        newStatus = SO_STATUS.SHIPPED;
        // Update line statuses
        await tx.salesOrderLine.updateMany({
          where: { soId, status: { notIn: [SO_LINE_STATUS.CANCELLED] } },
          data: { status: SO_LINE_STATUS.SHIPPED, updatedBy: context?.userId },
        });
      }

      const updated = await new SalesOrderRepository(tx).update(soId, {
        totalShippedQtyKg: totalShipped,
        status: newStatus,
        updatedBy: context?.userId,
        rowVersion: { increment: 1 },
      });

      if (so.status !== newStatus) {
        await new SalesOrderStatusHistoryRepository(tx).create({
          soId,
          entityLevel: 'HEADER',
          fromStatus: so.status,
          toStatus: newStatus,
          triggerAction: SO_ACTIONS.SHIP_COMPLETE,
          changedBy: context?.userId,
          correlationId,
        });
      }

      return updated;
    });
  }

  async _handleShipmentCancelled(soId, shipment, context) {
    const so = await this._findOrThrow(soId);
    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // Rollback released qty from ShipmentSoLinks
      const soLinks = await tx.shipmentSoLink.findMany({
        where: { shipmentHeaderId: shipment.id, salesOrderId: soId },
      });

      for (const link of soLinks) {
        if (link.salesOrderLineId) {
          const soLine = await tx.salesOrderLine.findUnique({
            where: { id: link.salesOrderLineId },
          });
          if (soLine) {
            const newReleased = Math.max(0, new Decimal(soLine.releasedQtyKg).minus(link.expectedQtyKg).toNumber());
            const lineStatus = SalesOrderStateMachine.computeLineStatusAfterRelease(
              Number(soLine.expectedQtyKg),
              newReleased
            );
            await tx.salesOrderLine.update({
              where: { id: link.salesOrderLineId },
              data: {
                releasedQtyKg: newReleased,
                status: lineStatus,
                updatedBy: context?.userId,
              },
            });
          }
        }
      }

      // Recalculate totals
      const lines = await tx.salesOrderLine.findMany({ where: { soId } });
      const totalReleased = lines.reduce((sum, l) => new Decimal(sum).plus(l.releasedQtyKg).toNumber(), 0);
      const newStatus = SalesOrderStateMachine.computeStatusAfterRollback(
        Number(so.totalExpectedQtyKg),
        totalReleased
      );

      const updated = await new SalesOrderRepository(tx).update(soId, {
        totalReleasedQtyKg: totalReleased,
        status: newStatus,
        updatedBy: context?.userId,
        rowVersion: { increment: 1 },
      });

      if (so.status !== newStatus) {
        await new SalesOrderStatusHistoryRepository(tx).create({
          soId,
          entityLevel: 'HEADER',
          fromStatus: so.status,
          toStatus: newStatus,
          triggerAction: SO_ACTIONS.ROLLBACK_RELEASE,
          changedBy: context?.userId,
          correlationId,
        });
      }

      return updated;
    });
  }

  // ──────────────────────────────────────────────
  // QUERIES
  // ──────────────────────────────────────────────
  async getSalesOrder(soId) {
    return this._findOrThrow(soId);
  }

  async listSalesOrders(query) {
    return this.repo.findMany(query);
  }

  async getStatusHistory(soId) {
    await this._findOrThrow(soId);
    return this.historyRepo.findBySoId(soId);
  }

  async getLinkedShipments(soId) {
    await this._findOrThrow(soId);
    return this.repo.getLinkedShipments(soId);
  }

  async getFulfillment(soId) {
    const so = await this._findOrThrow(soId);
    const shipments = await this.repo.getLinkedShipments(soId);

    const lines = so.lines.map((line) => {
      const lineShipments = shipments.filter((s) => {
        // We'd need to join through ShipmentSoLink for precise per-line mapping
        // For now, return all shipments at SO level
        return true;
      });

      return {
        lineNumber: line.lineNumber,
        itemCode: line.item?.itemCode,
        itemName: line.item?.itemName,
        expectedQtyKg: Number(line.expectedQtyKg),
        releasedQtyKg: Number(line.releasedQtyKg),
        shippedQtyKg: Number(line.shippedQtyKg),
        remainingQtyKg: new Decimal(line.expectedQtyKg).minus(line.releasedQtyKg).toNumber(),
        status: line.status,
      };
    });

    const totalExpected = Number(so.totalExpectedQtyKg);
    const totalReleased = Number(so.totalReleasedQtyKg);
    const totalShipped = Number(so.totalShippedQtyKg);

    return {
      soId: so.id,
      soNumber: so.soNumber,
      status: so.status,
      lines,
      shipments: shipments.map((s) => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber,
        status: s.status,
        vehicleNumber: s.vehicleNumber,
        totalNetKg: s.totalNetKg ? Number(s.totalNetKg) : null,
        shippedAt: s.shippedAt,
      })),
      summary: {
        releasePct: totalExpected > 0 ? Number(new Decimal(totalReleased).dividedBy(totalExpected).times(100).toFixed(2)) : 0,
        shipPct: totalExpected > 0 ? Number(new Decimal(totalShipped).dividedBy(totalExpected).times(100).toFixed(2)) : 0,
        totalShipments: shipments.length,
        activeShipments: shipments.filter((s) => !['SHIPPED', 'CLOSED', 'CANCELLED'].includes(s.status)).length,
        completedShipments: shipments.filter((s) => s.status === 'SHIPPED' || s.status === 'CLOSED').length,
      },
    };
  }

  async getDashboardSummary(filters) {
    return this.repo.getDashboardSummary(filters);
  }

  // ──────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────
  async _findOrThrow(soId) {
    const so = await this.repo.findById(soId);
    if (!so) throw createNotFoundError(soId);
    return so;
  }

  async _generateSoNumber() {
    // Use NumberSequence from Foundation module if available
    try {
      const seq = await this.prisma.numberSequence.findFirst({
        where: { sequenceCode: 'SO', isActive: true },
      });
      if (seq) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const currentDate = now.toISOString().slice(0, 10);

        let nextVal = seq.currentValue + 1;
        if (seq.currentDate.toISOString().slice(0, 10) !== currentDate) {
          nextVal = 1;
        }

        await this.prisma.numberSequence.update({
          where: { id: seq.id },
          data: { currentValue: nextVal, currentDate: new Date(currentDate) },
        });

        const seqStr = String(nextVal).padStart(seq.sequenceLength, '0');
        return `${seq.prefix}${seq.separator}${dateStr}${seq.separator}${seqStr}`;
      }
    } catch {
      // Fallback if NumberSequence not configured
    }

    // Fallback: timestamp-based
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    return `SO-${dateStr}-${rand}`;
  }

  async _generateShipmentNumber() {
    try {
      const seq = await this.prisma.numberSequence.findFirst({
        where: { sequenceCode: 'SHP', isActive: true },
      });
      if (seq) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const currentDate = now.toISOString().slice(0, 10);

        let nextVal = seq.currentValue + 1;
        if (seq.currentDate.toISOString().slice(0, 10) !== currentDate) {
          nextVal = 1;
        }

        await this.prisma.numberSequence.update({
          where: { id: seq.id },
          data: { currentValue: nextVal, currentDate: new Date(currentDate) },
        });

        const seqStr = String(nextVal).padStart(seq.sequenceLength, '0');
        return `${seq.prefix}${seq.separator}${dateStr}${seq.separator}${seqStr}`;
      }
    } catch {
      // Fallback
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    return `SHP-${dateStr}-${rand}`;
  }
}

module.exports = { SalesOrderService };
