/**
 * Module 3: Inventory Core Engine - Hold Service
 */

const { Decimal } = require('decimal.js');
const { InventDimService } = require('./invent-dim.service');
const { OnHandRepository } = require('../infra/onhand.repository');
const { HoldRepository } = require('../infra/hold.repository');
const {
  insufficientStockError,
  holdNotFoundError,
  statusNotAllocatableError,
  createInventoryError,
  InventoryErrorCodes,
} = require('../domain/inventory.errors');

class HoldService {
  constructor(prisma, auditLogAdapter = null) {
    this.prisma = prisma;
    this.inventDimService = new InventDimService(prisma);
    this.onHandRepo = new OnHandRepository(prisma);
    this.holdRepo = new HoldRepository(prisma);
    this.auditLogAdapter = auditLogAdapter;
  }

  /**
   * Create a hold (allocation) for outbound
   */
  async createHold(command) {
    const {
      externalId,
      correlationId,
      shipmentId,
      shipmentLineId,
      workHeaderId,
      itemId,
      qty,
      dim,
      reasonCode,
      createdBy,
    } = command;

    return this.prisma.$transaction(async (tx) => {
      if (externalId) {
        const existingHold = await this.holdRepo.findByExternalId(externalId, tx);
        if (existingHold) {
          return {
            holdId: existingHold.id,
            holdNo: existingHold.holdNo,
            idempotentReplay: true,
          };
        }
      }

      const dimResult = await this.inventDimService.resolveDimension(
        { ...dim, createdBy },
        tx
      );

      if (!dimResult.inventoryStatus.isAllocatable) {
        throw statusNotAllocatableError(dim.statusCode);
      }

      const onHand = await tx.$queryRaw`
        SELECT * FROM on_hand 
        WHERE item_id = ${itemId}::uuid 
        AND invent_dim_id = ${dimResult.dim.id}::uuid 
        FOR UPDATE
      `;

      const onHandRecord = onHand[0];
      if (!onHandRecord) {
        throw insufficientStockError(itemId, '0', qty);
      }

      const availableQty = new Decimal(onHandRecord.available_qty);
      const requestedQty = new Decimal(qty);

      if (availableQty.lessThan(requestedQty)) {
        throw insufficientStockError(itemId, availableQty.toString(), qty);
      }

      const hold = await this.holdRepo.create(
        {
          shipmentId,
          shipmentLineId,
          workHeaderId,
          itemId,
          inventDimId: dimResult.dim.id,
          onHandId: onHandRecord.id,
          holdQty: requestedQty.toFixed(3),
          reasonCode,
          externalId,
          correlationId,
          createdBy,
        },
        tx
      );

      await this.onHandRepo.updateQty(
        onHandRecord.id,
        { allocatedDelta: requestedQty.toFixed(3), isMovement: false },
        tx
      );

      return {
        holdId: hold.id,
        holdNo: hold.holdNo,
        holdQty: String(hold.holdQty),
        idempotentReplay: false,
      };
    });
  }

  /**
   * Release a hold (partial or full)
   */
  async releaseHold(holdId, releaseQty, releasedBy, correlationId) {
    return this.prisma.$transaction(async (tx) => {
      const hold = await this.holdRepo.findById(holdId, tx);
      if (!hold) {
        throw holdNotFoundError(holdId);
      }

      if (hold.status === 'RELEASED' || hold.status === 'CANCELLED') {
        throw createInventoryError(
          InventoryErrorCodes.HOLD_NOT_FOUND,
          `Hold ${holdId} is already ${hold.status}`,
          { holdId, status: hold.status }
        );
      }

      const releaseAmount = releaseQty
        ? new Decimal(releaseQty)
        : new Decimal(hold.holdQty).minus(hold.releasedQty);

      const remainingHoldQty = new Decimal(hold.holdQty)
        .minus(hold.releasedQty)
        .minus(releaseAmount);

      if (remainingHoldQty.lessThan(0)) {
        throw createInventoryError(
          InventoryErrorCodes.HOLD_INSUFFICIENT_QTY,
          'Release qty exceeds remaining hold qty',
          {
            holdId,
            remainingHoldQty: new Decimal(hold.holdQty).minus(hold.releasedQty).toString(),
            requestedReleaseQty: releaseAmount.toString(),
          }
        );
      }

      const updatedHold = await this.holdRepo.updateRelease(
        holdId,
        releaseAmount.toFixed(3),
        releasedBy,
        tx
      );

      await this.onHandRepo.updateQty(
        hold.onHandId,
        { allocatedDelta: releaseAmount.negated().toFixed(3), isMovement: false },
        tx
      );

      return {
        holdId: updatedHold.id,
        holdNo: updatedHold.holdNo,
        releasedQty: releaseAmount.toString(),
        newStatus: updatedHold.status,
      };
    });
  }

  /**
   * Cancel a hold
   */
  async cancelHold(holdId, releasedBy, correlationId) {
    return this.prisma.$transaction(async (tx) => {
      const hold = await this.holdRepo.findById(holdId, tx);
      if (!hold) {
        throw holdNotFoundError(holdId);
      }

      if (hold.status === 'CANCELLED') {
        return {
          holdId: hold.id,
          holdNo: hold.holdNo,
          newStatus: 'CANCELLED',
          idempotentReplay: true,
        };
      }

      const remainingHoldQty = new Decimal(hold.holdQty).minus(hold.releasedQty);

      await this.holdRepo.updateStatus(holdId, 'CANCELLED', releasedBy, tx);

      if (remainingHoldQty.greaterThan(0)) {
        await this.onHandRepo.updateQty(
          hold.onHandId,
          { allocatedDelta: remainingHoldQty.negated().toFixed(3), isMovement: false },
          tx
        );
      }

      return {
        holdId: hold.id,
        holdNo: hold.holdNo,
        releasedQty: remainingHoldQty.toString(),
        newStatus: 'CANCELLED',
        idempotentReplay: false,
      };
    });
  }

  /**
   * Get hold by ID
   */
  async getHoldById(holdId) {
    return this.holdRepo.findById(holdId);
  }

  /**
   * List holds with filters
   */
  async listHolds(filters, pagination) {
    return this.holdRepo.findMany(filters, pagination);
  }

  /**
   * Get holds by shipment
   */
  async getHoldsByShipment(shipmentId, shipmentLineId = null) {
    return this.holdRepo.findByShipment(shipmentId, shipmentLineId);
  }

  /**
   * Log hold creation to audit trail (fire-and-forget)
   */
  async logHoldCreateAudit(command, result) {
    if (!this.auditLogAdapter || result.idempotentReplay) return;
    try {
      await this.auditLogAdapter.logHoldCreate({
        holdId: result.holdId,
        holdNo: result.holdNo,
        holdQty: result.holdQty,
        itemId: command.itemId,
        onHandId: null,
        createdBy: command.createdBy,
        reasonCode: command.reasonCode,
        correlationId: command.correlationId,
        requestId: command.requestId,
      });
    } catch (err) {
      console.error('Audit log hold create failed (non-blocking):', err.message);
    }
  }

  /**
   * Log hold release to audit trail (fire-and-forget)
   */
  async logHoldReleaseAudit(command, result) {
    if (!this.auditLogAdapter) return;
    try {
      await this.auditLogAdapter.logHoldRelease({
        holdId: result.holdId,
        oldStatus: 'ACTIVE',
        newStatus: result.newStatus,
        oldReleasedQty: '0',
        newReleasedQty: result.releasedQty,
        releaseQty: result.releasedQty,
        releasedBy: command.releasedBy,
        correlationId: command.correlationId,
        requestId: command.requestId,
      });
    } catch (err) {
      console.error('Audit log hold release failed (non-blocking):', err.message);
    }
  }

  /**
   * Log hold cancellation to audit trail (fire-and-forget)
   */
  async logHoldCancelAudit(command, result) {
    if (!this.auditLogAdapter || result.idempotentReplay) return;
    try {
      await this.auditLogAdapter.logHoldCancel({
        holdId: result.holdId,
        oldStatus: 'ACTIVE',
        holdQty: result.releasedQty,
        cancelledBy: command.releasedBy,
        reasonCode: command.reasonCode,
        correlationId: command.correlationId,
        requestId: command.requestId,
      });
    } catch (err) {
      console.error('Audit log hold cancel failed (non-blocking):', err.message);
    }
  }
}

module.exports = { HoldService };
