/**
 * Module 7: Work Execution - Exception Repository
 */

class WorkExceptionRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.create({ data });
  }

  async update(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.update({
      where: { id },
      data,
    });
  }

  async findById(id, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.findUnique({
      where: { id },
      include: { header: true, line: true },
    });
  }

  async findByWorkHeaderId(workHeaderId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.findMany({
      where: { workHeaderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByWorkLineId(workLineId, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.findMany({
      where: { workLineId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenExceptions(filters, pagination, tx = null) {
    const db = tx || this.prisma;
    const where = {
      status: 'OPEN',
      ...(filters.warehouseId && {
        header: { warehouseId: filters.warehouseId },
      }),
      ...(filters.exceptionType && { exceptionType: filters.exceptionType }),
      ...(filters.severity && { severity: filters.severity }),
    };

    const [items, total] = await Promise.all([
      db.weWorkException.findMany({
        where,
        include: { header: true, line: true },
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      db.weWorkException.count({ where }),
    ]);

    return { items, total };
  }

  async resolve(id, resolvedBy, resolutionText, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
        resolutionText,
      },
    });
  }

  async close(id, tx = null) {
    const db = tx || this.prisma;
    return db.weWorkException.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }
}

module.exports = { WorkExceptionRepository };
