/**
 * Module 7: Work Execution - Work Header Repository
 */

class WorkHeaderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findById(id, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.findUnique({
      where: { id },
      include: { lines: true },
    });
  }

  async findByWorkId(workId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.findUnique({
      where: { workId },
      include: { lines: { orderBy: { lineNum: 'asc' } } },
    });
  }

  async findByIdForUpdate(id, tx) {
    const result = await tx.$queryRaw`
      SELECT * FROM we_work_header WHERE id = ${id}::uuid FOR UPDATE
    `;
    return result[0] || null;
  }

  async findByExternalId(externalId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.findUnique({
      where: { externalId },
    });
  }

  async findBySourceRef(sourceModule, sourceType, sourceRefId, sourceRefLineId, workType, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.findFirst({
      where: {
        sourceModule,
        sourceType,
        sourceRefId,
        sourceRefLineId: sourceRefLineId || null,
        workType,
      },
    });
  }

  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.create({
      data,
      include: { lines: true },
    });
  }

  async update(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkHeader.update({
      where: { id },
      data: {
        ...data,
        versionNo: { increment: 1 },
      },
      include: { lines: { orderBy: { lineNum: 'asc' } } },
    });
  }

  async findMany(filters, pagination, tx = null) {
    const db = tx || this.prisma;
    const where = this._buildWhereClause(filters);
    
    const [items, total] = await Promise.all([
      db.weWorkHeader.findMany({
        where,
        include: {
          lines: { select: { id: true, status: true, lineNum: true } },
        },
        orderBy: [
          { priorityNo: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: pagination.offset,
        take: pagination.limit,
      }),
      db.weWorkHeader.count({ where }),
    ]);
    
    return { items, total };
  }

  async findAvailableWorks(warehouseId, workTypes, pagination, tx = null) {
    const db = tx || this.prisma;
    const where = {
      warehouseId,
      status: 'OPEN',
      assignedTo: null,
      ...(workTypes?.length && { workType: { in: workTypes } }),
    };
    
    const [items, total] = await Promise.all([
      db.weWorkHeader.findMany({
        where,
        include: {
          lines: { select: { id: true, status: true, lineNum: true, itemId: true, expectedQty: true, uom: true } },
        },
        orderBy: [
          { priorityNo: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: pagination.offset,
        take: pagination.limit,
      }),
      db.weWorkHeader.count({ where }),
    ]);
    
    return { items, total };
  }

  async findMyWorks(userId, statuses, pagination, tx = null) {
    const db = tx || this.prisma;
    const where = {
      assignedTo: userId,
      ...(statuses?.length && { status: { in: statuses } }),
    };
    
    const [items, total] = await Promise.all([
      db.weWorkHeader.findMany({
        where,
        include: {
          lines: { orderBy: { lineNum: 'asc' } },
        },
        orderBy: [
          { priorityNo: 'asc' },
          { startedAt: 'desc' },
          { assignedAt: 'desc' },
        ],
        skip: pagination.offset,
        take: pagination.limit,
      }),
      db.weWorkHeader.count({ where }),
    ]);
    
    return { items, total };
  }

  async getDashboardSummary(warehouseId, tx = null) {
    const db = tx || this.prisma;
    
    const [statusCounts, typeCounts, exceptionCount] = await Promise.all([
      db.weWorkHeader.groupBy({
        by: ['status'],
        where: { warehouseId },
        _count: { id: true },
      }),
      db.weWorkHeader.groupBy({
        by: ['workType'],
        where: { warehouseId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        _count: { id: true },
      }),
      db.weWorkException.count({
        where: {
          status: 'OPEN',
          header: { warehouseId },
        },
      }),
    ]);
    
    return {
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      byType: typeCounts.reduce((acc, item) => {
        acc[item.workType] = item._count.id;
        return acc;
      }, {}),
      openExceptions: exceptionCount,
    };
  }

  _buildWhereClause(filters) {
    const where = {};
    
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;
    if (filters.statuses?.length) where.status = { in: filters.statuses };
    if (filters.workType) where.workType = filters.workType;
    if (filters.workTypes?.length) where.workType = { in: filters.workTypes };
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.sourceModule) where.sourceModule = filters.sourceModule;
    if (filters.sourceRefId) where.sourceRefId = filters.sourceRefId;
    
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) where.createdAt.gte = new Date(filters.createdFrom);
      if (filters.createdTo) where.createdAt.lte = new Date(filters.createdTo);
    }
    
    return where;
  }
}

module.exports = { WorkHeaderRepository };
