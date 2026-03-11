/**
 * Sales Orders Module - Status History Repository
 */

class SalesOrderStatusHistoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.salesOrderStatusHistory.create({ data });
  }

  async findBySoId(soId) {
    return this.prisma.salesOrderStatusHistory.findMany({
      where: { soId },
      orderBy: { changedAt: 'desc' },
    });
  }
}

module.exports = { SalesOrderStatusHistoryRepository };
