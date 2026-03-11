/**
 * Module 3: Inventory Core Engine - Posting Engine Service
 * 
 * This is the central service for all inventory postings.
 * All inventory changes MUST go through this service.
 */

const { Decimal } = require('decimal.js');
const { InventDimService } = require('./invent-dim.service');
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
const { requiresReasonCode, getOnHandImpact } = require('../domain/inventory.rules');

class PostingEngineService {
  constructor(prisma, auditLogAdapter = null) {
    this.prisma = prisma;
    this.inventDimService = new InventDimService(prisma);
    this.inventTransRepo = new InventTransRepository(prisma);
    this.onHandRepo = new OnHandRepository(prisma);
    this.eventMappingRepo = new EventMappingRepository(prisma);
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

      const { fromImpact, toImpact } = getOnHandImpact(transType, qty);

      if (dimFromResolved && fromImpact.lessThan(0)) {
        const onHandFrom = await this.onHandRepo.findByItemAndDim(
          itemId,
          dimFromResolved.id,
          tx
        );
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
          stage: 'PHYSICAL',
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

      let onHandAfter = null;

      if (dimFromResolved && !fromImpact.equals(0)) {
        await this.updateOnHand(itemId, dimFromResolved.id, uom.id, fromImpact, tx);
      }

      if (dimToResolved && !toImpact.equals(0)) {
        const updatedOnHand = await this.updateOnHand(itemId, dimToResolved.id, uom.id, toImpact, tx);
        onHandAfter = {
          physicalQty: String(updatedOnHand.physicalQty),
          reservedQty: String(updatedOnHand.reservedQty),
          availableQty: String(updatedOnHand.availableQty),
        };
      }

      const result = {
        transId: inventTrans.transId,
        transDbId: inventTrans.id,
        transType: inventTrans.transType,
        itemId: inventTrans.itemId,
        qty: String(inventTrans.qty),
        onHandAfter,
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

  /**
   * Update on-hand record
   * MD-1 Fix: Removed redundant if/else condition
   */
  async updateOnHand(itemId, inventDimId, uomId, qtyChange, tx) {
    const { onHand } = await this.onHandRepo.getOrCreate(
      {
        itemId,
        inventDimId,
        uomId,
        physicalQty: 0,
        reservedQty: 0,
        availableQty: 0,
      },
      tx
    );

    return this.onHandRepo.updateQty(
      onHand.id,
      { physicalDelta: qtyChange.toFixed(3), isMovement: true },
      tx
    );
  }

  /**
   * Generate transaction ID using number sequence
   */
  async generateTransId(tx) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const sequence = await tx.numberSequence.findFirst({
      where: { sequenceCode: 'TRX', isActive: true },
    });

    if (!sequence) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `TRX-${dateStr}-${random}`;
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
    return `TRX-${dateStr}-${seqNo}`;
  }
}

module.exports = { PostingEngineService };
