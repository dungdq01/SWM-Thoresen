/**
 * Module 7: Work Execution - Mobile Sync Repository
 */

class MobileSyncRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createBatch(data, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncBatch.create({
      data,
      include: { events: true },
    });
  }

  async createEvent(data, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncEvent.create({ data });
  }

  async createEvents(dataArray, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncEvent.createMany({ data: dataArray });
  }

  async findBatchById(id, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncBatch.findUnique({
      where: { id },
      include: { events: { orderBy: { deviceSequenceNo: 'asc' } } },
    });
  }

  async findBatchByBatchNo(batchNo, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncBatch.findUnique({
      where: { batchNo },
      include: { events: { orderBy: { deviceSequenceNo: 'asc' } } },
    });
  }

  async findEventByExternalId(externalId, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncEvent.findUnique({
      where: { externalId },
    });
  }

  async updateBatch(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncBatch.update({
      where: { id },
      data,
    });
  }

  async updateEvent(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.weMobileSyncEvent.update({
      where: { id },
      data,
    });
  }

  async updateBatchCounts(batchId, tx = null) {
    const db = tx || this.prisma;
    const events = await db.weMobileSyncEvent.findMany({
      where: { syncBatchId: batchId },
      select: { processingResult: true },
    });

    const successCount = events.filter(e => e.processingResult === 'SUCCESS').length;
    const duplicateCount = events.filter(e => e.processingResult === 'DUPLICATE').length;
    const conflictCount = events.filter(e => e.processingResult === 'CONFLICT').length;
    const rejectedCount = events.filter(e => e.processingResult === 'REJECTED').length;
    const pendingCount = events.filter(e => e.processingResult === 'PENDING').length;

    let syncStatus = 'SUCCESS';
    if (pendingCount > 0) {
      syncStatus = 'PROCESSING';
    } else if (conflictCount > 0 || rejectedCount > 0) {
      syncStatus = successCount > 0 ? 'PARTIAL' : 'FAILED';
    }

    return db.weMobileSyncBatch.update({
      where: { id: batchId },
      data: {
        successCount,
        duplicateCount,
        conflictCount,
        syncStatus,
        processedAt: pendingCount === 0 ? new Date() : null,
      },
    });
  }

  async findUserBatches(userId, pagination, tx = null) {
    const db = tx || this.prisma;
    const [items, total] = await Promise.all([
      db.weMobileSyncBatch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      db.weMobileSyncBatch.count({ where: { userId } }),
    ]);
    return { items, total };
  }
}

module.exports = { MobileSyncRepository };
