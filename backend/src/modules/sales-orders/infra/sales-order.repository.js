/**
 * Sales Orders Module - Repository (Data Access Layer)
 */

const INCLUDE_DETAIL = {
  owner: { select: { id: true, ownerCode: true, ownerName: true, shortName: true } },
  customer: { select: { id: true, customerCode: true, customerName: true, shortName: true } },
  warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
  lines: {
    orderBy: { lineNumber: 'asc' },
    include: {
      item: { select: { id: true, itemCode: true, itemName: true, cargoForm: true } },
      uom: { select: { id: true, uomCode: true, description: true } },
    },
  },
};

const INCLUDE_LIST = {
  owner: { select: { id: true, ownerCode: true, ownerName: true } },
  customer: { select: { id: true, customerCode: true, customerName: true } },
  warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
  _count: { select: { lines: true, shipmentHeaders: true } },
};

class SalesOrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.salesOrder.create({
      data,
      include: INCLUDE_DETAIL,
    });
  }

  async findById(id, tx = null) {
    const client = tx || this.prisma;
    return client.salesOrder.findUnique({
      where: { id },
      include: INCLUDE_DETAIL,
    });
  }

  async findByExternalId(externalId) {
    return this.prisma.salesOrder.findUnique({
      where: { externalId },
      include: INCLUDE_DETAIL,
    });
  }

  async findBySoNumber(soNumber) {
    return this.prisma.salesOrder.findUnique({
      where: { soNumber },
      include: INCLUDE_DETAIL,
    });
  }

  async findMany({ page = 1, pageSize = 20, filters = {} }) {
    const where = this._buildWhereClause(filters);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: INCLUDE_LIST,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async update(id, data, tx = null) {
    const client = tx || this.prisma;
    return client.salesOrder.update({
      where: { id },
      data,
      include: INCLUDE_DETAIL,
    });
  }

  async updateWithOptimisticLock(id, rowVersion, data, tx = null) {
    const client = tx || this.prisma;
    const result = await client.salesOrder.updateMany({
      where: { id, rowVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
    if (result.count === 0) {
      return null; // Optimistic lock conflict
    }
    return this.findById(id, tx);
  }

  async getLinkedShipmentCount(soId) {
    return this.prisma.shipmentHeader.count({
      where: { salesOrderId: soId, status: { not: 'CANCELLED' } },
    });
  }

  async getLinkedShipments(soId) {
    return this.prisma.shipmentHeader.findMany({
      where: { salesOrderId: soId },
      select: {
        id: true,
        shipmentNumber: true,
        status: true,
        vehicleNumber: true,
        totalNetKg: true,
        shippedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveShipmentCount(soId) {
    return this.prisma.shipmentHeader.count({
      where: {
        salesOrderId: soId,
        status: { notIn: ['SHIPPED', 'CLOSED', 'CANCELLED'] },
      },
    });
  }

  async getDashboardSummary(filters = {}) {
    const where = {};
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.ownerId) where.ownerId = filters.ownerId;

    const counts = await this.prisma.salesOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const summary = {
      totalDraft: 0,
      totalConfirmed: 0,
      totalPartiallyReleased: 0,
      totalFullyReleased: 0,
      totalShipped: 0,
      totalClosed: 0,
      totalCancelled: 0,
    };

    for (const c of counts) {
      const key = `total${c.status.charAt(0)}${c.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, l) => l.toUpperCase())}`;
      if (key in summary) summary[key] = c._count.id;
    }

    // Overdue count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    summary.overdueCount = await this.prisma.salesOrder.count({
      where: {
        ...where,
        expectedDeliveryDate: { lt: today },
        status: { notIn: ['SHIPPED', 'CLOSED', 'CANCELLED'] },
      },
    });

    // Today expected deliveries
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    summary.todayExpectedDeliveries = await this.prisma.salesOrder.count({
      where: {
        ...where,
        expectedDeliveryDate: { gte: today, lt: tomorrow },
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      },
    });

    return summary;
  }

  _buildWhereClause(filters) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.orderType) where.orderType = filters.orderType;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.soNumber) where.soNumber = { contains: filters.soNumber, mode: 'insensitive' };
    if (filters.externalSoNumber) where.externalSoNumber = { contains: filters.externalSoNumber, mode: 'insensitive' };
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) {
        const to = new Date(filters.toDate);
        to.setDate(to.getDate() + 1);
        where.createdAt.lt = to;
      }
    }
    if (filters.search) {
      where.OR = [
        { soNumber: { contains: filters.search, mode: 'insensitive' } },
        { externalSoNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}

module.exports = { SalesOrderRepository };
