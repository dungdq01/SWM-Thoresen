/**
 * Module 3: Inventory Core Engine - Reversal Engine Service
 */

const { Decimal } = require('decimal.js');
const { InventTransRepository } = require('../infra/invent-trans.repository');
const { OnHandRepository } = require('../infra/onhand.repository');
const { ReversalLinkRepository } = require('../infra/reversal-link.repository');
const { getOnHandImpact, getInventoryDelta, canReverseTrans } = require('../domain/inventory.rules');
const {
  transNotFoundError,
  alreadyReversedError,
  reasonCodeRequiredError,
  createInventoryError,
  InventoryErrorCodes,
} = require('../domain/inventory.errors');

class ReversalEngineService {
  constructor(prisma, auditLogAdapter = null) {
    this.prisma = prisma;
    this.inventTransRepo = new InventTransRepository(prisma);
    this.onHandRepo = new OnHandRepository(prisma);
    this.reversalLinkRepo = new ReversalLinkRepository(prisma);
    this.auditLogAdapter = auditLogAdapter;
  }

  /**
   * Reverse an inventory transaction
   * HI-2 Fix: Added idempotency check for reversal
   */
  async reverseTransaction(command) {
    const {
      externalId,
      correlationId,
      originalTransId,
      reasonCode,
      note,
      reversedBy,
      correctionRefType,
      correctionRefId,
    } = command;

    if (!reasonCode) {
      throw reasonCodeRequiredError('REVERSAL');
    }

    return this.prisma.$transaction(async (tx) => {
      // HI-2 Fix: Check idempotency for reversal via externalId
      if (externalId) {
        const existingReversal = await this.inventTransRepo.findByExternalId(externalId, tx);
        if (existingReversal && existingReversal.isReversal) {
          return {
            originalTransId: existingReversal.reversalOfTransId,
            reversalTransId: existingReversal.transId,
            reversalTransDbId: existingReversal.id,
            reversedQty: String(existingReversal.qty),
            idempotentReplay: true,
          };
        }
      }

      const originalTrans = await this.inventTransRepo.findByTransId(originalTransId, tx);
      if (!originalTrans) {
        throw transNotFoundError(originalTransId);
      }

      const existingLink = await this.reversalLinkRepo.findByOriginalTransId(
        originalTrans.id,
        tx
      );

      const canReverse = canReverseTrans(originalTrans, existingLink);
      if (!canReverse.allowed) {
        if (existingLink) {
          throw alreadyReversedError(originalTransId);
        }
        throw createInventoryError(
          InventoryErrorCodes.REVERSAL_NOT_ALLOWED,
          canReverse.reason,
          { originalTransId }
        );
      }

      const reversalTransId = await this.generateReversalTransId(originalTrans.transId, tx);

      const reversedQty = new Decimal(originalTrans.qty).negated();

      const reversalTrans = await tx.inventTrans.create({
        data: {
          transId: reversalTransId,
          refType: originalTrans.refType,
          refId: originalTrans.refId,
          refLineId: originalTrans.refLineId,
          transType: originalTrans.transType,
          itemId: originalTrans.itemId,
          qty: reversedQty.toFixed(3),
          uomId: originalTrans.uomId,
          dimFromId: originalTrans.dimToId,
          dimToId: originalTrans.dimFromId,
          statusFromCode: originalTrans.statusToCode,
          statusToCode: originalTrans.statusFromCode,
          stage: originalTrans.stage,
          externalId,
          correlationId,
          reasonCode,
          sourceApp: 'SYSTEM',
          postedBy: reversedBy,
          postedAt: new Date(),
          ownerId: originalTrans.ownerId,
          isReversal: true,
          reversalOfTransId: originalTrans.transId,
        },
      });

      await this.reversalLinkRepo.create(
        {
          originalTransId: originalTrans.id,
          reversalTransId: reversalTrans.id,
          reverseReasonCode: reasonCode,
          reverseNote: note,
          reversedBy,
          reversedAt: new Date(),
          correctionRefType,
          correctionRefId,
          correlationId,
        },
        tx
      );

      const originalQty = new Decimal(originalTrans.qty);
      const isMoveLike = originalTrans.transType === 'MOVE' || originalTrans.transType === 'STATUS_CHANGE';

      if (isMoveLike) {
        // MOVE/STATUS_CHANGE: reverse physical dim from/to
        const { fromImpact, toImpact } = getOnHandImpact(originalTrans.transType, originalQty.abs());
        if (originalTrans.dimToId && !toImpact.equals(0)) {
          await this.updateOnHandReverse(originalTrans.itemId, originalTrans.dimToId, {
            physicalDelta: toImpact.negated().toFixed(3),
          }, tx);
        }
        if (originalTrans.dimFromId && !fromImpact.equals(0)) {
          await this.updateOnHandReverse(originalTrans.itemId, originalTrans.dimFromId, {
            physicalDelta: fromImpact.negated().toFixed(3),
          }, tx);
        }
      } else {
        // Stage-based: negate the original delta
        const originalDelta = getInventoryDelta(originalTrans.transType, originalTrans.stage, originalQty.abs());
        const reversedDelta = {
          physicalDelta: originalDelta.physicalDelta.negated().toFixed(3),
          allocatedDelta: originalDelta.allocatedDelta.negated().toFixed(3),
          inboundOrderedDelta: originalDelta.inboundOrderedDelta.negated().toFixed(3),
          outboundOrderedDelta: originalDelta.outboundOrderedDelta.negated().toFixed(3),
        };
        const targetDimId = originalTrans.dimToId || originalTrans.dimFromId;
        if (targetDimId) {
          await this.updateOnHandReverse(originalTrans.itemId, targetDimId, reversedDelta, tx);
        }
      }

      return {
        originalTransId: originalTrans.transId,
        reversalTransId: reversalTrans.transId,
        reversalTransDbId: reversalTrans.id,
        reversedQty: reversedQty.toString(),
      };
    });
  }

  /**
   * Log reversal to audit trail (fire-and-forget)
   */
  async logReversalAudit(command, result) {
    if (!this.auditLogAdapter || result.idempotentReplay) return;
    try {
      await this.auditLogAdapter.logReversal({
        originalTransId: result.originalTransId,
        reversalTransId: result.reversalTransId,
        reversedQty: result.reversedQty,
        reversedBy: command.reversedBy,
        reasonCode: command.reasonCode,
        correlationId: command.correlationId,
        requestId: command.requestId,
        correctionRefType: command.correctionRefType,
        correctionRefId: command.correctionRefId,
      });
    } catch (err) {
      console.error('Audit log reversal failed (non-blocking):', err.message);
    }
  }

  /**
   * Update on-hand for reversal — accepts full delta object
   */
  async updateOnHandReverse(itemId, inventDimId, deltaChanges, tx) {
    const onHand = await this.onHandRepo.findByItemAndDim(itemId, inventDimId, tx);
    if (!onHand) {
      return null;
    }

    return this.onHandRepo.updateQty(
      onHand.id,
      { ...deltaChanges, isMovement: true },
      tx
    );
  }

  /**
   * Generate reversal transaction ID
   */
  async generateReversalTransId(originalTransId, tx) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REV-${dateStr}-${random}`;
  }
}

module.exports = { ReversalEngineService };
