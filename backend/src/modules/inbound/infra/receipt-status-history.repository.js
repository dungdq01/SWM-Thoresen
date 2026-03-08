/**
 * Module 4: Inbound Operations - Receipt Status History Repository
 */

class ReceiptStatusHistoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Tạo status history entry
   */
  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.receiptStatusHistory.create({ data });
  }

  /**
   * Tìm history theo receipt
   */
  async findByReceiptId(receiptHeaderId) {
    return this.prisma.receiptStatusHistory.findMany({
      where: { receiptHeaderId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Tìm latest transition
   */
  async findLatest(receiptHeaderId) {
    return this.prisma.receiptStatusHistory.findFirst({
      where: { receiptHeaderId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Count transitions by type
   */
  async countByTransitionCode(receiptHeaderId) {
    const result = await this.prisma.receiptStatusHistory.groupBy({
      by: ['transitionCode'],
      where: { receiptHeaderId },
      _count: { id: true },
    });
    return result.reduce((acc, item) => {
      acc[item.transitionCode] = item._count.id;
      return acc;
    }, {});
  }
}

module.exports = { ReceiptStatusHistoryRepository };
