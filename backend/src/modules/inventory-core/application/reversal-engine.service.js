/**
 * Module 3: Inventory Core Engine - Reversal Engine Service
 */

const { Decimal } = require('decimal.js');
const { InventTransRepository } = require('../infra/invent-trans.repository');
const { OnHandRepository } = require('../infra/onhand.repository');
const { ReversalLinkRepository } = require('../infra/reversal-link.repository');
const { getOnHandImpact, canReverseTrans } = require('../domain/inventory.rules');
const {
  transNotFoundError,
  alreadyReversedError,
  reasonCodeRequiredError,
  createInventoryError,
  InventoryErrorCodes,
} = require('../domain/inventory.errors');

class ReversalEngineService {
  constructor(prisma) {
    this.prisma = prisma;
    this.inventTransRepo = new InventTransRepository(prisma);
    this.onHandRepo = new OnHandRepository(prisma);
    this.reversalLinkRepo = new ReversalLinkRepository(prisma);
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
      const { fromImpact, toImpact } = getOnHandImpact(originalTrans.transType, originalQty.abs());

      if (originalTrans.dimToId && !toImpact.equals(0)) {
        await this.updateOnHandReverse(
          originalTrans.itemId,
          originalTrans.dimToId,
          toImpact.negated(),
          tx
        );
      }

      if (originalTrans.dimFromId && !fromImpact.equals(0)) {
        await this.updateOnHandReverse(
          originalTrans.itemId,
          originalTrans.dimFromId,
          fromImpact.negated(),
          tx
        );
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
   * Update on-hand for reversal
   */
  async updateOnHandReverse(itemId, inventDimId, qtyChange, tx) {
    const onHand = await this.onHandRepo.findByItemAndDim(itemId, inventDimId, tx);
    if (!onHand) {
      return null;
    }

    return this.onHandRepo.updateQty(
      onHand.id,
      { physicalDelta: qtyChange.toFixed(3), isMovement: true },
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
