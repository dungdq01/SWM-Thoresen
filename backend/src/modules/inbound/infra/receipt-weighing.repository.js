/**
 * Module 4: Inbound Operations - Receipt Weighing Log Repository
 */

class ReceiptWeighingRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Tạo weigh log entry
   */
  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.receiptWeighingLog.create({ data });
  }

  /**
   * Kiểm tra event_id đã tồn tại chưa (idempotency)
   */
  async existsByEventId(eventId) {
    if (!eventId) return false;
    const count = await this.prisma.receiptWeighingLog.count({
      where: { eventId },
    });
    return count > 0;
  }

  /**
   * Kiểm tra ticket_id + phase đã tồn tại chưa
   */
  async existsByTicketAndPhase(ticketId, weighPhase) {
    if (!ticketId) return false;
    const count = await this.prisma.receiptWeighingLog.count({
      where: { ticketId, weighPhase },
    });
    return count > 0;
  }

  /**
   * Tìm weigh log theo receipt và attempt
   */
  async findByReceiptAndAttempt(receiptHeaderId, attemptNumber, weighPhase = null) {
    const where = { receiptHeaderId, attemptNumber };
    if (weighPhase) {
      where.weighPhase = weighPhase;
    }
    return this.prisma.receiptWeighingLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Tìm tất cả weigh logs của receipt
   */
  async findByReceiptId(receiptHeaderId) {
    return this.prisma.receiptWeighingLog.findMany({
      where: { receiptHeaderId },
      orderBy: [{ attemptNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Tìm latest weigh log của receipt
   */
  async findLatest(receiptHeaderId, weighPhase) {
    return this.prisma.receiptWeighingLog.findFirst({
      where: { receiptHeaderId, weighPhase },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = { ReceiptWeighingRepository };
