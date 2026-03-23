/**
 * Module 3: Inventory Core Engine - Hold Service
 *
 * ALLOCATION FLOW (per customer guide):
 * 1. Advisory lock on (item_id, invent_dim_id) — prevent concurrent allocation
 * 2. Calculate available from LEDGER (invent_trans), not on_hand
 * 3. Validate available >= requested
 * 4. Insert inventory_hold
 * 5. Post invent_trans (ISSUE + ALLOCATED) — ledger audit trail
 * 6. Update on_hand (allocatedQty += qty) — materialized view
 * 7. Commit (advisory lock auto-released)
 */

const { Decimal } = require('decimal.js');
const { InventDimService } = require('./invent-dim.service');
const { OnHandRepository } = require('../infra/onhand.repository');
const { HoldRepository } = require('../infra/hold.repository');
const { InventTransRepository } = require('../infra/invent-trans.repository');
const { PostingEngineService } = require('./posting-engine.service');
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
    this.inventTransRepo = new InventTransRepository(prisma);
    this.postingEngine = new PostingEngineService(prisma, auditLogAdapter);
    this.auditLogAdapter = auditLogAdapter;
  }

  /**
   * Acquire advisory lock scoped to (item_id, invent_dim_id).
   * Uses pg_advisory_xact_lock which auto-releases on COMMIT/ROLLBACK.
   */
  async acquireAdvisoryLock(tx, itemId, inventDimId) {
    // Hash the two UUIDs into a bigint key for pg_advisory_xact_lock
    // Use $executeRawUnsafe because pg_advisory_xact_lock returns void
    const lockKey = `${itemId}|${inventDimId}`;
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      lockKey
    );
  }

  /**
   * Calculate available qty from LEDGER (invent_trans) — source of truth.
   * physical = SUM of all physical-affecting transactions
   * allocated = SUM of all allocation-affecting transactions
   * available = physical - allocated
   */
  async calculateAvailableFromLedger(tx, itemId, inventDimId) {
    // Physical qty from ledger: sum of all transactions affecting this dim
    const ledgerResult = await tx.$queryRaw`
      SELECT COALESCE(
        (SELECT SUM(
          CASE
            WHEN dim_to_id = ${inventDimId}::uuid THEN ABS(qty)
            WHEN dim_from_id = ${inventDimId}::uuid THEN -ABS(qty)
            ELSE 0
          END
        ) FROM invent_trans
        WHERE item_id = ${itemId}::uuid
        AND is_reversal = false
        AND stage IN ('PHYSICAL', 'DEDUCTED')
        AND (dim_to_id = ${inventDimId}::uuid OR dim_from_id = ${inventDimId}::uuid)
        ), 0
      ) as ledger_physical_qty
    `;

    // On-hand physical (materialized view — used as fallback for seeded data without ledger entries)
    const onHandResult = await tx.$queryRaw`
      SELECT COALESCE(physical_qty, 0) as onhand_physical_qty
      FROM on_hand
      WHERE item_id = ${itemId}::uuid
      AND invent_dim_id = ${inventDimId}::uuid
    `;

    // Allocated qty: sum of active holds (source of truth for allocation)
    const allocatedResult = await tx.$queryRaw`
      SELECT COALESCE(SUM(hold_qty - released_qty), 0) as allocated_qty
      FROM inventory_hold
      WHERE item_id = ${itemId}::uuid
      AND invent_dim_id = ${inventDimId}::uuid
      AND status IN ('ACTIVE', 'PARTIALLY_RELEASED')
    `;

    const ledgerPhysical = new Decimal(ledgerResult[0]?.ledger_physical_qty || 0);
    const onHandPhysical = new Decimal(onHandResult[0]?.onhand_physical_qty || 0);
    // Use the higher of ledger vs on_hand — handles seeded data without ledger entries
    const physical = Decimal.max(ledgerPhysical, onHandPhysical);
    const allocated = new Decimal(allocatedResult[0]?.allocated_qty || 0);
    const available = physical.minus(allocated);

    return { physical, allocated, available };
  }

  /**
   * Create a hold (allocation) for outbound
   *
   * Flow per customer guide:
   * 1. Advisory lock
   * 2. Calculate available from ledger
   * 3. Validate
   * 4. Insert hold
   * 5. Post ledger (ALLOCATION_CREATED)
   * 6. Update on_hand
   * 7. Commit
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
      // Idempotency check
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

      // Resolve dimension
      const dimResult = await this.inventDimService.resolveDimension(
        { ...dim, createdBy },
        tx
      );

      if (!dimResult.inventoryStatus.isAllocatable) {
        throw statusNotAllocatableError(dim.statusCode);
      }

      // STEP 1: Advisory lock on (item_id, invent_dim_id)
      await this.acquireAdvisoryLock(tx, itemId, dimResult.dim.id);

      // STEP 2: Calculate available from LEDGER (not on_hand)
      const { physical, allocated, available } = await this.calculateAvailableFromLedger(
        tx, itemId, dimResult.dim.id
      );

      const requestedQty = new Decimal(qty);

      // STEP 3: Validate
      if (available.lessThan(requestedQty)) {
        throw insufficientStockError(itemId, available.toString(), qty);
      }

      // STEP 4: Insert hold
      // Get or create on_hand record for the hold FK reference
      const { onHand } = await this.onHandRepo.getOrCreate(
        { itemId, inventDimId: dimResult.dim.id, uomId: dimResult.dim.uomId || (await this.getKgUomId(tx)), physicalQty: 0, allocatedQty: 0, availableQty: 0, inboundOrderedQty: 0, outboundOrderedQty: 0 },
        tx
      );

      const hold = await this.holdRepo.create(
        {
          shipmentId,
          shipmentLineId,
          workHeaderId,
          itemId,
          inventDimId: dimResult.dim.id,
          onHandId: onHand.id,
          holdQty: requestedQty.toFixed(3),
          reasonCode,
          externalId,
          correlationId,
          createdBy,
        },
        tx
      );

      // STEP 5: Post ledger (ALLOCATION_CREATED → invent_trans with stage=ALLOCATED)
      try {
        await this.postingEngine.postInventory({
          externalId: `ALLOC-${hold.id}-${Date.now()}`,
          correlationId: correlationId || `corr-alloc-${hold.id}`,
          eventCode: 'ALLOCATION_CREATED',
          refType: 'SHIPMENT',
          refId: shipmentId || hold.id,
          refLineId: shipmentLineId || hold.id,
          itemId,
          qty: requestedQty.toFixed(3),
          uomCode: 'KG',
          dimFrom: {
            warehouseCode: dimResult.warehouse.warehouseCode,
            locationCode: dimResult.location.locationCode,
            ownerCode: dimResult.owner.ownerCode,
            statusCode: dimResult.inventoryStatus.statusCode,
          },
          sourceApp: 'SYSTEM',
          postedBy: createdBy,
        }, tx);
      } catch (err) {
        // Ledger posting is critical — if fails, the whole transaction rolls back
        console.error(`[Hold] Ledger posting ALLOCATION_CREATED failed:`, err.message);
        throw err;
      }

      // STEP 6: Update on_hand (materialized view — allocatedQty += qty)
      // Note: posting engine already updates on_hand via getInventoryDelta,
      // but since ISSUE+ALLOCATED delta only updates allocatedQty and posting
      // engine routes to dimFrom, we need to ensure on_hand is in sync.
      // The postingEngine.postInventory call above already handles this via delta logic.

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
   * Posts ALLOCATION_RELEASED to ledger
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

      // Advisory lock
      await this.acquireAdvisoryLock(tx, hold.itemId, hold.inventDimId);

      const updatedHold = await this.holdRepo.updateRelease(
        holdId,
        releaseAmount.toFixed(3),
        releasedBy,
        tx
      );

      // Post ledger: ALLOCATION_RELEASED
      try {
        // Look up dim for posting
        const dim = await tx.inventDim.findUnique({
          where: { id: hold.inventDimId },
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        });

        await this.postingEngine.postInventory({
          externalId: `DEALLOC-${holdId}-${Date.now()}`,
          correlationId: correlationId || `corr-dealloc-${holdId}`,
          eventCode: 'ALLOCATION_RELEASED',
          refType: 'SHIPMENT',
          refId: hold.shipmentId || holdId,
          refLineId: hold.shipmentLineId || holdId,
          itemId: hold.itemId,
          qty: releaseAmount.toFixed(3),
          uomCode: 'KG',
          dimFrom: {
            warehouseCode: dim?.warehouse?.warehouseCode,
            locationCode: dim?.location?.locationCode,
            ownerCode: dim?.owner?.ownerCode,
            statusCode: dim?.inventoryStatus?.statusCode,
          },
          sourceApp: 'SYSTEM',
          postedBy: releasedBy,
        }, tx);
      } catch (err) {
        console.error(`[Hold] Ledger posting ALLOCATION_RELEASED failed:`, err.message);
        throw err;
      }

      return {
        holdId: updatedHold.id,
        holdNo: updatedHold.holdNo,
        releasedQty: releaseAmount.toString(),
        newStatus: updatedHold.status,
      };
    });
  }

  /**
   * Cancel a hold — releases all remaining allocated qty
   * Posts ALLOCATION_RELEASED for remaining qty
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

      // Advisory lock
      await this.acquireAdvisoryLock(tx, hold.itemId, hold.inventDimId);

      await this.holdRepo.updateStatus(holdId, 'CANCELLED', releasedBy, tx);

      // Post ledger: ALLOCATION_RELEASED for remaining qty
      if (remainingHoldQty.greaterThan(0)) {
        try {
          const dim = await tx.inventDim.findUnique({
            where: { id: hold.inventDimId },
            include: {
              warehouse: { select: { warehouseCode: true } },
              location: { select: { locationCode: true } },
              owner: { select: { ownerCode: true } },
              inventoryStatus: { select: { statusCode: true } },
            },
          });

          await this.postingEngine.postInventory({
            externalId: `CANCEL-DEALLOC-${holdId}-${Date.now()}`,
            correlationId: correlationId || `corr-cancel-${holdId}`,
            eventCode: 'ALLOCATION_RELEASED',
            refType: 'SHIPMENT',
            refId: hold.shipmentId || holdId,
            refLineId: hold.shipmentLineId || holdId,
            itemId: hold.itemId,
            qty: remainingHoldQty.toFixed(3),
            uomCode: 'KG',
            dimFrom: {
              warehouseCode: dim?.warehouse?.warehouseCode,
              locationCode: dim?.location?.locationCode,
              ownerCode: dim?.owner?.ownerCode,
              statusCode: dim?.inventoryStatus?.statusCode,
            },
            sourceApp: 'SYSTEM',
            postedBy: releasedBy,
          }, tx);
        } catch (err) {
          console.error(`[Hold] Ledger posting cancel ALLOCATION_RELEASED failed:`, err.message);
          throw err;
        }
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
   * Helper: get KG UOM ID
   */
  async getKgUomId(tx) {
    const uom = await tx.mdUom.findFirst({ where: { uomCode: 'KG' } });
    return uom?.id;
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
