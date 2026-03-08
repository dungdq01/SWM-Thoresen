/**
 * Module 7: Work Execution - Work Line Repository
 */

class WorkLineRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findById(id, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.findUnique({
      where: { id },
      include: { header: true },
    });
  }

  async findByHeaderAndLineNum(workHeaderId, lineNum, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.findUnique({
      where: {
        workHeaderId_lineNum: { workHeaderId, lineNum },
      },
      include: { header: true },
    });
  }

  async findByIdForUpdate(id, tx) {
    const result = await tx.$queryRaw`
      SELECT * FROM we_work_line WHERE id = ${id}::uuid FOR UPDATE
    `;
    return result[0] || null;
  }

  async findByExternalId(externalId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.findUnique({
      where: { externalId },
    });
  }

  async findByHeaderId(workHeaderId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.findMany({
      where: { workHeaderId },
      orderBy: { lineNum: 'asc' },
    });
  }

  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.create({ data });
  }

  async createMany(dataArray, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.createMany({ data: dataArray });
  }

  async update(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.update({
      where: { id },
      data: {
        ...data,
        versionNo: { increment: 1 },
      },
      include: { header: true },
    });
  }

  async updateMany(where, data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.updateMany({ where, data });
  }

  async countByHeaderAndStatus(workHeaderId, statuses, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkLine.count({
      where: {
        workHeaderId,
        status: { in: statuses },
      },
    });
  }

  async getLinesSummary(workHeaderId, tx = null) {
    const db = tx || this.prisma;
    const lines = await db.weWorkLine.findMany({
      where: { workHeaderId },
      select: { id: true, status: true, lineNum: true },
    });
    
    const total = lines.length;
    const completed = lines.filter(l => l.status === 'COMPLETED').length;
    const skipped = lines.filter(l => l.status === 'SKIPPED').length;
    const cancelled = lines.filter(l => l.status === 'CANCELLED').length;
    const inProgress = lines.filter(l => l.status === 'IN_PROGRESS').length;
    const open = lines.filter(l => l.status === 'OPEN').length;
    
    return { total, completed, skipped, cancelled, inProgress, open };
  }
}

module.exports = { WorkLineRepository };
