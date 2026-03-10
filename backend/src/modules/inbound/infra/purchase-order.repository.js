/**
 * Module 4: Inbound Operations - Purchase Order Repository
 */

class PurchaseOrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /** Select clause for full PO detail */
  _includeDetail() {
    return {
      owner: { select: { ownerCode: true, ownerName: true } },
      vendor: { select: { vendorCode: true, vendorName: true } },
      warehouse: { select: { warehouseCode: true, warehouseName: true } },
      lines: {
        include: {
          item: { select: { itemCode: true, itemName: true, cargoForm: true } },
          uom: { select: { uomCode: true, description: true, decimalPrecision: true } },
        },
        orderBy: { lineNumber: 'asc' },
      },
    };
  }

  async findById(id) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this._includeDetail(),
    });
  }

  async findByPoNumber(poNumber) {
    return this.prisma.purchaseOrder.findUnique({ where: { poNumber } });
  }

  async findMany({ page = 1, limit = 20, keyword, status, ownerId, vendorId, warehouseId, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    const where = {};
    if (status) {
      // Support comma-separated multi-status
      const statuses = Array.isArray(status) ? status : status.split(',').map((s) => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (ownerId) where.ownerId = ownerId;
    if (vendorId) where.vendorId = vendorId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (keyword) {
      where.OR = [
        { poNumber: { contains: keyword, mode: 'insensitive' } },
        { externalPoNumber: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const validSortFields = { createdAt: 'createdAt', poNumber: 'poNumber', status: 'status', expectedDeliveryDate: 'expectedDeliveryDate' };
    const orderField = validSortFields[sortBy] || 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this._includeDetail(),
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data) {
    return this.prisma.purchaseOrder.create({
      data,
      include: this._includeDetail(),
    });
  }

  async update(id, data, expectedVersion) {
    return this.prisma.purchaseOrder.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: this._includeDetail(),
    });
  }

  async updateStatus(id, status, extraData = {}) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status, rowVersion: { increment: 1 }, ...extraData },
      include: this._includeDetail(),
    });
  }

  async getNextPoNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${today}-`;

    const existing = await this.prisma.purchaseOrder.findMany({
      where: { poNumber: { startsWith: prefix } },
      select: { poNumber: true },
    });

    const numbers = existing
      .map((r) => parseInt(r.poNumber.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }
}

module.exports = { PurchaseOrderRepository };
