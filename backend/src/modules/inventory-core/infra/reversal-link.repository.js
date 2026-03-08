/**
 * Module 3: Inventory Core Engine - ReversalLink Repository
 */

class ReversalLinkRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Find reversal link by original transaction ID
   */
  async findByOriginalTransId(originalTransId, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryReversalLink.findFirst({
      where: { originalTransId },
      include: {
        originalTrans: true,
        reversalTrans: true,
      },
    });
  }

  /**
   * Create reversal link
   */
  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryReversalLink.create({
      data: {
        originalTransId: data.originalTransId,
        reversalTransId: data.reversalTransId,
        reverseReasonCode: data.reverseReasonCode,
        reverseNote: data.reverseNote,
        reversedBy: data.reversedBy,
        reversedAt: data.reversedAt || new Date(),
        correctionRefType: data.correctionRefType,
        correctionRefId: data.correctionRefId,
        correlationId: data.correlationId,
      },
    });
  }

  /**
   * Find all reversal links for a list of transaction IDs
   */
  async findByTransIds(transIds, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryReversalLink.findMany({
      where: {
        OR: [
          { originalTransId: { in: transIds } },
          { reversalTransId: { in: transIds } },
        ],
      },
    });
  }
}

module.exports = { ReversalLinkRepository };
