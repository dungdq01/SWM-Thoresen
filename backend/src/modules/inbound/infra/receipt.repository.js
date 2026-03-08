/**
 * Module 4: Inbound Operations - Receipt Repository
 */

class ReceiptRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Tạo receipt header với lines
   */
  async createWithLines(data, tx = null) {
    const db = tx || this.prisma;
    const { lines, ...headerData } = data;

    return db.receiptHeader.create({
      data: {
        ...headerData,
        lines: {
          create: lines.map((line, index) => ({
            ...line,
            lineNumber: index + 1,
          })),
        },
      },
      include: { lines: true },
    });
  }

  /**
   * Tìm receipt theo ID
   */
  async findById(id, includeRelations = true) {
    return this.prisma.receiptHeader.findUnique({
      where: { id },
      include: includeRelations ? {
        lines: true,
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        vendor: { select: { id: true, vendorCode: true, vendorName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        receivingLocation: { select: { id: true, locationCode: true, locationType: true } },
      } : undefined,
    });
  }

  /**
   * Tìm receipt theo external_id
   */
  async findByExternalId(externalId) {
    return this.prisma.receiptHeader.findUnique({
      where: { externalId },
      include: { lines: true },
    });
  }

  /**
   * Tìm receipt theo receipt_number
   */
  async findByReceiptNumber(receiptNumber) {
    return this.prisma.receiptHeader.findUnique({
      where: { receiptNumber },
      include: { lines: true },
    });
  }

  /**
   * Cập nhật receipt header
   */
  async update(id, data, tx = null) {
    const db = tx || this.prisma;
    return db.receiptHeader.update({
      where: { id },
      data: {
        ...data,
        rowVersion: { increment: 1 },
      },
      include: { lines: true },
    });
  }

  /**
   * List receipts với filter và pagination
   */
  async findMany(filter = {}, options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filter);

    const [data, total] = await Promise.all([
      this.prisma.receiptHeader.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lines: true,
          owner: { select: { ownerCode: true, ownerName: true } },
          vendor: { select: { vendorCode: true, vendorName: true } },
          warehouse: { select: { warehouseCode: true, warehouseName: true } },
        },
      }),
      this.prisma.receiptHeader.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Build where clause từ filter
   */
  buildWhereClause(filter) {
    const where = {};

    if (filter.receiptNumber) {
      where.receiptNumber = { contains: filter.receiptNumber, mode: 'insensitive' };
    }
    if (filter.vehicleNumber) {
      where.vehicleNumber = { contains: filter.vehicleNumber, mode: 'insensitive' };
    }
    if (filter.blNumber) {
      where.blNumber = { contains: filter.blNumber, mode: 'insensitive' };
    }
    if (filter.poId) {
      where.poId = filter.poId;
    }
    if (filter.asnId) {
      where.asnId = filter.asnId;
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status };
      } else {
        where.status = filter.status;
      }
    }
    if (filter.ownerId) {
      where.ownerId = filter.ownerId;
    }
    if (filter.warehouseId) {
      where.warehouseId = filter.warehouseId;
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        where.createdAt.lte = new Date(filter.dateTo);
      }
    }

    return where;
  }

  /**
   * Lock receipt for update (SELECT FOR UPDATE)
   */
  async lockForUpdate(id, tx) {
    const result = await tx.$queryRaw`
      SELECT * FROM receipt_header 
      WHERE id = ${id}::uuid 
      FOR UPDATE
    `;
    return result[0] || null;
  }

  /**
   * Count receipts by status
   */
  async countByStatus(warehouseId = null) {
    const where = warehouseId ? { warehouseId } : {};
    
    const result = await this.prisma.receiptHeader.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    return result.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});
  }
}

module.exports = { ReceiptRepository };
