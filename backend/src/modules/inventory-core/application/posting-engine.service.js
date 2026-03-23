/**
 * Module 3: Inventory Core Engine - Posting Engine Service
 * 
 * This is the central service for all inventory postings.
 * All inventory changes MUST go through this service.
 */

const { Decimal } = require('decimal.js');
const { InventDimService } = require('./invent-dim.service');
const { MaterializationService } = require('./materialization.service');
const { InventTransRepository } = require('../infra/invent-trans.repository');
const { OnHandRepository } = require('../infra/onhand.repository');
const { EventMappingRepository } = require('../infra/event-mapping.repository');
const { InventoryTransType, TRANS_TYPE_IMPACT } = require('../domain/inventory.types');
const {
  duplicateExternalIdError,
  invalidEventCodeError,
  negativeStockBlockedError,
  reasonCodeRequiredError,
  masterInactiveError,
} = require('../domain/inventory.errors');
const { requiresReasonCode, getOnHandImpact, getInventoryDelta } = require('../domain/inventory.rules');

class PostingEngineService {
  constructor(prisma, auditLogAdapter = null) {
    this.prisma = prisma;
    this.inventDimService = new InventDimService(prisma);
    this.inventTransRepo = new InventTransRepository(prisma);
    this.onHandRepo = new OnHandRepository(prisma);
    this.eventMappingRepo = new EventMappingRepository(prisma);
    this.materializer = new MaterializationService(prisma);
    this.auditLogAdapter = auditLogAdapter;
  }

  /**
   * Post inventory transaction
   * Main entry point for all inventory postings
   * BUG-FIX: Added optional externalTx parameter to participate in caller's transaction
   * instead of creating a nested transaction which breaks atomicity
   */
  async postInventory(command, externalTx = null) {
    const {
      externalId,
      correlationId,
      eventCode,
      refType,
      refId,
      refLineId,
      itemId,
      qty,
      uomCode,
      dimFrom,
      dimTo,
      reasonCode,
      sourceApp,
      postedBy,
      weighbridgeTicketId,
    } = command;

    const executePosting = async (tx) => {
      const eventMapping = await this.eventMappingRepo.findActiveByEventCode(eventCode, tx);
      if (!eventMapping) {
        throw invalidEventCodeError(eventCode);
      }

      const transType = eventMapping.transType;
      const stage = eventMapping.stage || 'PHYSICAL';

      const existingTrans = await this.inventTransRepo.findByExternalIdAndType(
        externalId,
        transType,
        tx
      );
      if (existingTrans) {
        return {
          transId: existingTrans.transId,
          transDbId: existingTrans.id,
          transType: existingTrans.transType,
          itemId: existingTrans.itemId,
          qty: String(existingTrans.qty),
          idempotentReplay: true,
        };
      }

      if (requiresReasonCode(transType) && !reasonCode) {
        throw reasonCodeRequiredError(transType);
      }

      const item = await tx.mdItem.findUnique({ where: { id: itemId } });
      if (!item || !item.isActive) {
        throw masterInactiveError('Item', itemId);
      }

      const uom = await tx.mdUom.findFirst({
        where: { uomCode, isActive: true },
      });
      if (!uom) {
        throw masterInactiveError('UOM', uomCode);
      }

      let dimFromResolved = null;
      let dimToResolved = null;
      let ownerId = null;

      if (dimFrom) {
        const fromResult = await this.inventDimService.resolveDimension(
          { ...dimFrom, createdBy: postedBy },
          tx
        );
        dimFromResolved = fromResult.dim;
        ownerId = fromResult.owner.id;
      }

      if (dimTo) {
        const toResult = await this.inventDimService.resolveDimension(
          { ...dimTo, createdBy: postedBy },
          tx
        );
        dimToResolved = toResult.dim;
        if (!ownerId) {
          ownerId = toResult.owner.id;
        }
      }

      // Stage-based delta — determines which buckets to update
      const delta = getInventoryDelta(transType, stage, qty);

      // For MOVE/STATUS_CHANGE, use legacy dim from/to physical impact
      const isMoveLike = transType === 'MOVE' || transType === 'STATUS_CHANGE';
      const { fromImpact, toImpact } = isMoveLike
        ? getOnHandImpact(transType, qty)
        : { fromImpact: new Decimal(0), toImpact: new Decimal(0) };

      // Negative stock check — only when physical decreases
      if (delta.physicalDelta.lessThan(0)) {
        const targetDimId = dimFromResolved?.id || dimToResolved?.id;
        if (targetDimId) {
          const onHandCheck = await this.onHandRepo.findByItemAndDim(itemId, targetDimId, tx);
          const currentPhysical = onHandCheck ? new Decimal(onHandCheck.physicalQty) : new Decimal(0);
          if (currentPhysical.plus(delta.physicalDelta).lessThan(0)) {
            throw negativeStockBlockedError(itemId, currentPhysical.toString(), delta.physicalDelta.toString());
          }
        }
      }
      // Also check negative for MOVE from-side
      if (isMoveLike && dimFromResolved && fromImpact.lessThan(0)) {
        const onHandFrom = await this.onHandRepo.findByItemAndDim(itemId, dimFromResolved.id, tx);
        const currentPhysical = onHandFrom ? new Decimal(onHandFrom.physicalQty) : new Decimal(0);
        if (currentPhysical.plus(fromImpact).lessThan(0)) {
          throw negativeStockBlockedError(itemId, currentPhysical.toString(), fromImpact.toString());
        }
      }

      const transId = await this.generateTransId(tx);

      const inventTrans = await this.inventTransRepo.create(
        {
          transId,
          refType,
          refId,
          refLineId,
          transType,
          itemId,
          qty: new Decimal(qty).toFixed(3),
          uomId: uom.id,
          dimFromId: dimFromResolved?.id,
          dimToId: dimToResolved?.id,
          statusFromCode: dimFrom?.statusCode,
          statusToCode: dimTo?.statusCode,
          stage,
          externalId,
          correlationId,
          reasonCode,
          sourceApp,
          postedBy,
          postedAt: new Date(),
          ownerId,
          weighbridgeTicketId,
          isReversal: false,
        },
        tx
      );

      // === MATERIALIZATION ===
      // Per guide: posting engine does NOT update on_hand directly.
      // Materialization service is the ONLY component that updates on_hand.
      // Called sync here (monolith phase). Will be async via outbox in microservice phase.
      const updatedOnHand = await this.materializer.materializeTransaction(
        inventTrans, uom.id, tx
      );

      const result = {
        transId: inventTrans.transId,
        transDbId: inventTrans.id,
        transType: inventTrans.transType,
        itemId: inventTrans.itemId,
        qty: String(inventTrans.qty),
        onHandAfter: this.materializer.formatOnHandAfter(updatedOnHand),
        idempotentReplay: false,
      };

      return result;
    };

    // BUG-FIX: If externalTx is provided, execute within that transaction (no nesting)
    // Otherwise create own transaction (backward compatible for standalone callers)
    if (externalTx) {
      return executePosting(externalTx);
    }
    return this.prisma.$transaction(executePosting);
  }

  /**
   * Log posting to audit trail (fire-and-forget)
   */
  async logPostingAudit(command, result) {
    if (!this.auditLogAdapter || result.idempotentReplay) return;
    try {
      await this.auditLogAdapter.logPosting({
        transId: result.transId,
        transType: result.transType,
        itemId: result.itemId,
        qty: result.qty,
        dimFromId: command.dimFrom ? undefined : null,
        dimToId: command.dimTo ? undefined : null,
        postedBy: command.postedBy,
        correlationId: command.correlationId,
        requestId: command.requestId,
        refType: command.refType,
        refId: command.refId,
        externalId: command.externalId,
      });
    } catch (err) {
      console.error('Audit log posting failed (non-blocking):', err.message);
    }
  }

  // NOTE: updateOnHandDelta, hasDeltaEffect, formatOnHandAfter
  // have been moved to MaterializationService (per guide: posting engine does NOT update on_hand)

  /**
   * Generate transaction ID using number sequence
   * BUG-FIX: Added random suffix to prevent duplicate transId on concurrent requests
   */
  async generateTransId(tx) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    // Always add random suffix to guarantee uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const sequence = await tx.numberSequence.findFirst({
      where: { sequenceCode: 'TRX', isActive: true },
    });

    if (!sequence) {
      return `TRX-${dateStr}-${randomSuffix}${Date.now().toString(36).toUpperCase()}`;
    }

    const counter = await tx.numberSequenceCounter.upsert({
      where: {
        sequenceId_scopeKey_counterDate: {
          sequenceId: sequence.id,
          scopeKey: 'GLOBAL',
          counterDate: new Date(date.toISOString().slice(0, 10)),
        },
      },
      update: {
        lastNumber: { increment: 1 },
      },
      create: {
        sequenceId: sequence.id,
        scopeKey: 'GLOBAL',
        counterDate: new Date(date.toISOString().slice(0, 10)),
        lastNumber: 1,
      },
    });

    const seqNo = String(counter.lastNumber).padStart(sequence.runningNoLength, '0');
    return `TRX-${dateStr}-${seqNo}-${randomSuffix}`;
  }
}

module.exports = { PostingEngineService };
