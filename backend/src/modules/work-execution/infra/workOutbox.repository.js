/**
 * Module 7: Work Execution - Outbox Repository
 */

class WorkOutboxRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.create({ data });
  }

  async findPendingEvents(limit = 100, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.findMany({
      where: {
        deliveryStatus: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findFailedEvents(limit = 100, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.findMany({
      where: {
        deliveryStatus: 'FAILED',
        retryCount: { lt: 5 },
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });
  }

  async markSent(id, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.update({
      where: { id },
      data: {
        deliveryStatus: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  async markFailed(id, tx = null) {
    const db = tx || this.prisma;
    const event = await db.weWorkOutboxEvent.findUnique({ where: { id } });
    const newRetryCount = (event?.retryCount || 0) + 1;
    const nextRetryDelay = Math.min(Math.pow(2, newRetryCount) * 1000, 3600000);
    
    return db.weWorkOutboxEvent.update({
      where: { id },
      data: {
        deliveryStatus: newRetryCount >= 5 ? 'DEAD' : 'FAILED',
        retryCount: newRetryCount,
        nextRetryAt: new Date(Date.now() + nextRetryDelay),
      },
    });
  }

  async markDead(id, errorMessage = null, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.update({
      where: { id },
      data: { 
        deliveryStatus: 'DEAD',
        lastError: errorMessage,
      },
    });
  }

  async markAsSent(id, tx = null) {
    return this.markSent(id, tx);
  }

  async markAsFailed(id, errorMessage = null, tx = null) {
    const db = tx || this.prisma;
    const event = await db.weWorkOutboxEvent.findUnique({ where: { id } });
    const newRetryCount = (event?.retryCount || 0) + 1;
    const nextRetryDelay = Math.min(Math.pow(2, newRetryCount) * 1000, 3600000);
    
    return db.weWorkOutboxEvent.update({
      where: { id },
      data: {
        deliveryStatus: newRetryCount >= 5 ? 'DEAD' : 'FAILED',
        retryCount: newRetryCount,
        nextRetryAt: new Date(Date.now() + nextRetryDelay),
        lastError: errorMessage,
      },
    });
  }

  async findFailedEventsReadyForRetry(limit = 20, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkOutboxEvent.findMany({
      where: {
        deliveryStatus: 'FAILED',
        retryCount: { lt: 5 },
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });
  }

  async incrementRetry(id, errorMessage = null, tx = null) {
    const db = tx || this.prisma;
    const event = await db.weWorkOutboxEvent.findUnique({ where: { id } });
    const newRetryCount = (event?.retryCount || 0) + 1;
    const nextRetryDelay = Math.min(Math.pow(2, newRetryCount) * 1000, 3600000);
    
    return db.weWorkOutboxEvent.update({
      where: { id },
      data: {
        retryCount: newRetryCount,
        nextRetryAt: new Date(Date.now() + nextRetryDelay),
        lastError: errorMessage,
      },
    });
  }

  async getOutboxStats(tx = null) {
    const db = tx || this.prisma;
    const [pending, failed, dead, sent] = await Promise.all([
      db.weWorkOutboxEvent.count({ where: { deliveryStatus: 'PENDING' } }),
      db.weWorkOutboxEvent.count({ where: { deliveryStatus: 'FAILED' } }),
      db.weWorkOutboxEvent.count({ where: { deliveryStatus: 'DEAD' } }),
      db.weWorkOutboxEvent.count({ where: { deliveryStatus: 'SENT' } }),
    ]);
    return { pending, failed, dead, sent };
  }
}

module.exports = { WorkOutboxRepository };
