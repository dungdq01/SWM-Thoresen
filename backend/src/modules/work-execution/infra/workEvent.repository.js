/**
 * Module 7: Work Execution - Event & History Repository
 */

class WorkEventRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createEventLog(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkEventLog.create({ data });
  }

  async createStatusHistory(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkStatusHistory.create({ data });
  }

  async createAssignmentHistory(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkAssignmentHistory.create({ data });
  }

  async createPostingLink(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkPostingLink.create({ data });
  }

  async updatePostingLink(workLineId, data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkPostingLink.update({
      where: { workLineId },
      data,
    });
  }

  async findPostingLinkByLineId(workLineId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkPostingLink.findUnique({
      where: { workLineId },
    });
  }

  async getWorkHistory(workHeaderId, tx = null) {
    const db = tx || this.prisma;
    
    const [statusHistory, assignmentHistory, eventLogs] = await Promise.all([
      db.weWorkStatusHistory.findMany({
        where: { workHeaderId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.weWorkAssignmentHistory.findMany({
        where: { workHeaderId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.weWorkEventLog.findMany({
        where: { workHeaderId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    
    const combined = [
      ...statusHistory.map(h => ({ type: 'STATUS', ...h })),
      ...assignmentHistory.map(h => ({ type: 'ASSIGNMENT', ...h })),
      ...eventLogs.map(h => ({ type: 'EVENT', ...h })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return combined;
  }

  async getLineHistory(workLineId, tx = null) {
    const db = tx || this.prisma;
    
    const [statusHistory, eventLogs, postingLink] = await Promise.all([
      db.weWorkStatusHistory.findMany({
        where: { workLineId },
        orderBy: { createdAt: 'desc' },
      }),
      db.weWorkEventLog.findMany({
        where: { workLineId },
        orderBy: { createdAt: 'desc' },
      }),
      db.weWorkPostingLink.findUnique({
        where: { workLineId },
      }),
    ]);
    
    return { statusHistory, eventLogs, postingLink };
  }
}

module.exports = { WorkEventRepository };
