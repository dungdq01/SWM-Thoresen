/**
 * Module 3: Inventory Core Engine - Materialization Service
 *
 * Per guide: on_hand is a READ MODEL (projection), not a write target.
 * This service is the ONLY component that updates on_hand.
 *
 * Flow:
 *   Posting Engine → ghi ledger (invent_trans) ONLY
 *   Materialization Service → đọc transaction → update on_hand
 *
 * Can be called:
 *   - Sync: immediately after posting (current phase — monolith)
 *   - Async: via outbox + worker (future phase — microservice)
 */

const { Decimal } = require('decimal.js');
const { OnHandRepository } = require('../infra/onhand.repository');
const { InventTransRepository } = require('../infra/invent-trans.repository');
const { getInventoryDelta, getOnHandImpact } = require('../domain/inventory.rules');

class MaterializationService {
  constructor(prisma) {
    this.prisma = prisma;
    this.onHandRepo = new OnHandRepository(prisma);
    this.inventTransRepo = new InventTransRepository(prisma);
  }

  /**
   * Materialize a single transaction into on_hand.
   * Called sync after posting engine writes ledger.
   *
   * @param {Object} trans - The invent_trans record just created
   * @param {string} uomId - UOM ID for getOrCreate
   * @param {Object} tx - Prisma transaction client
   * @returns {Object|null} Updated on_hand record
   */
  async materializeTransaction(trans, uomId, tx) {
    const { transType, stage, qty, itemId, dimFromId, dimToId } = trans;
    const isMoveLike = transType === 'MOVE' || transType === 'STATUS_CHANGE';

    if (isMoveLike) {
      return this.materializeMove(trans, uomId, tx);
    }

    // Stage-based delta
    const delta = getInventoryDelta(transType, stage, Math.abs(Number(qty)));

    const targetDimId = dimToId || dimFromId;
    if (!targetDimId || !this.hasDeltaEffect(delta)) {
      return null;
    }

    return this.applyDelta(itemId, targetDimId, uomId, delta, tx);
  }

  /**
   * Materialize MOVE/STATUS_CHANGE — uses dim from/to physical impact
   */
  async materializeMove(trans, uomId, tx) {
    const { transType, qty, itemId, dimFromId, dimToId } = trans;
    const { fromImpact, toImpact } = getOnHandImpact(transType, qty);
    const zero = new Decimal(0);

    let lastUpdated = null;

    if (dimFromId && !fromImpact.equals(0)) {
      await this.applyDelta(itemId, dimFromId, uomId, {
        physicalDelta: fromImpact,
        allocatedDelta: zero,
        inboundOrderedDelta: zero,
        outboundOrderedDelta: zero,
      }, tx);
    }

    if (dimToId && !toImpact.equals(0)) {
      lastUpdated = await this.applyDelta(itemId, dimToId, uomId, {
        physicalDelta: toImpact,
        allocatedDelta: zero,
        inboundOrderedDelta: zero,
        outboundOrderedDelta: zero,
      }, tx);
    }

    return lastUpdated;
  }

  /**
   * Apply delta to on_hand — get-or-create then update
   */
  async applyDelta(itemId, inventDimId, uomId, delta, tx) {
    const { onHand } = await this.onHandRepo.getOrCreate(
      {
        itemId,
        inventDimId,
        uomId,
        physicalQty: 0,
        allocatedQty: 0,
        availableQty: 0,
        inboundOrderedQty: 0,
        outboundOrderedQty: 0,
      },
      tx
    );

    return this.onHandRepo.updateQty(
      onHand.id,
      {
        physicalDelta: delta.physicalDelta.toFixed(3),
        allocatedDelta: delta.allocatedDelta.toFixed(3),
        inboundOrderedDelta: delta.inboundOrderedDelta.toFixed(3),
        outboundOrderedDelta: delta.outboundOrderedDelta.toFixed(3),
        isMovement: true,
      },
      tx
    );
  }

  /**
   * Check if delta has any non-zero effect
   */
  hasDeltaEffect(delta) {
    return !delta.physicalDelta.equals(0) ||
      !delta.allocatedDelta.equals(0) ||
      !delta.inboundOrderedDelta.equals(0) ||
      !delta.outboundOrderedDelta.equals(0);
  }

  /**
   * Format on_hand for API response
   */
  formatOnHandAfter(onHand) {
    if (!onHand) return null;
    return {
      physicalQty: String(onHand.physicalQty),
      allocatedQty: String(onHand.allocatedQty),
      inboundOrderedQty: String(onHand.inboundOrderedQty),
      outboundOrderedQty: String(onHand.outboundOrderedQty),
      availableQty: String(onHand.availableQty),
    };
  }

  /**
   * REBUILD: Rebuild on_hand for a specific item+dim from ledger.
   * Deletes existing on_hand and recalculates from all invent_trans.
   */
  async rebuildOnHand(itemId, inventDimId, tx = null) {
    const client = tx || this.prisma;

    // Calculate physical from ledger
    const transactions = await client.inventTrans.findMany({
      where: {
        itemId,
        isReversal: false,
        OR: [
          { dimToId: inventDimId },
          { dimFromId: inventDimId },
        ],
      },
      select: { transType: true, stage: true, qty: true, dimFromId: true, dimToId: true },
    });

    let physical = new Decimal(0);
    let allocated = new Decimal(0);
    let inboundOrdered = new Decimal(0);
    let outboundOrdered = new Decimal(0);

    for (const t of transactions) {
      const isMoveLike = t.transType === 'MOVE' || t.transType === 'STATUS_CHANGE';

      if (isMoveLike) {
        const q = new Decimal(t.qty || 0).abs();
        if (t.dimToId === inventDimId) physical = physical.plus(q);
        if (t.dimFromId === inventDimId) physical = physical.minus(q);
      } else {
        const delta = getInventoryDelta(t.transType, t.stage, Math.abs(Number(t.qty)));
        const isTarget = (t.dimToId === inventDimId) || (t.dimFromId === inventDimId);
        if (isTarget) {
          physical = physical.plus(delta.physicalDelta);
          allocated = allocated.plus(delta.allocatedDelta);
          inboundOrdered = inboundOrdered.plus(delta.inboundOrderedDelta);
          outboundOrdered = outboundOrdered.plus(delta.outboundOrderedDelta);
        }
      }
    }

    // Also add reversed transactions (negated)
    const reversals = await client.inventTrans.findMany({
      where: {
        itemId,
        isReversal: true,
        OR: [
          { dimToId: inventDimId },
          { dimFromId: inventDimId },
        ],
      },
      select: { transType: true, stage: true, qty: true, dimFromId: true, dimToId: true },
    });

    for (const t of reversals) {
      const isMoveLike = t.transType === 'MOVE' || t.transType === 'STATUS_CHANGE';
      if (isMoveLike) {
        const q = new Decimal(t.qty || 0).abs();
        // Reversal swaps dims, so dimTo on reversal = original dimFrom
        if (t.dimToId === inventDimId) physical = physical.plus(q);
        if (t.dimFromId === inventDimId) physical = physical.minus(q);
      } else {
        const delta = getInventoryDelta(t.transType, t.stage, Math.abs(Number(t.qty)));
        const isTarget = (t.dimToId === inventDimId) || (t.dimFromId === inventDimId);
        if (isTarget) {
          // Reversal negates the delta
          physical = physical.minus(delta.physicalDelta);
          allocated = allocated.minus(delta.allocatedDelta);
          inboundOrdered = inboundOrdered.minus(delta.inboundOrderedDelta);
          outboundOrdered = outboundOrdered.minus(delta.outboundOrderedDelta);
        }
      }
    }

    // Floor ordered qtys to 0
    inboundOrdered = Decimal.max(0, inboundOrdered);
    outboundOrdered = Decimal.max(0, outboundOrdered);
    allocated = Decimal.max(0, allocated);
    const available = physical.minus(allocated);

    // Update on_hand
    const existing = await this.onHandRepo.findByItemAndDim(itemId, inventDimId, client);
    if (existing) {
      return client.onHand.update({
        where: { id: existing.id },
        data: {
          physicalQty: physical.toFixed(3),
          allocatedQty: allocated.toFixed(3),
          inboundOrderedQty: inboundOrdered.toFixed(3),
          outboundOrderedQty: outboundOrdered.toFixed(3),
          availableQty: available.toFixed(3),
          rowVersion: { increment: 1 },
        },
      });
    }

    return null;
  }

  /**
   * REBUILD ALL: Rebuild all on_hand records from ledger.
   */
  async rebuildAll() {
    const onHandRecords = await this.prisma.onHand.findMany({
      select: { itemId: true, inventDimId: true },
    });

    let rebuilt = 0;
    for (const record of onHandRecords) {
      await this.rebuildOnHand(record.itemId, record.inventDimId);
      rebuilt++;
    }

    return { rebuilt, total: onHandRecords.length };
  }
}

module.exports = { MaterializationService };
