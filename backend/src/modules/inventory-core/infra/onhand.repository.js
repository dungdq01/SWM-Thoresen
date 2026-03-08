/**
 * Module 3: Inventory Core Engine - OnHand Repository
 */

const { Decimal } = require('decimal.js');

class OnHandRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Find on-hand by ID
   */
  async findById(id, tx = null) {
    const client = tx || this.prisma;
    return client.onHand.findUnique({
      where: { id },
      include: {
        item: { select: { itemCode: true, itemName: true } },
        inventDim: {
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
        uom: { select: { uomCode: true } },
      },
    });
  }

  /**
   * Find on-hand by item and dimension (unique key)
   */
  async findByItemAndDim(itemId, inventDimId, tx = null) {
    const client = tx || this.prisma;
    return client.onHand.findUnique({
      where: {
        itemId_inventDimId: { itemId, inventDimId },
      },
    });
  }

  /**
   * Find on-hand by item and dimension with lock for update
   */
  async findByItemAndDimForUpdate(itemId, inventDimId, tx) {
    if (!tx) {
      throw new Error('Transaction required for findByItemAndDimForUpdate');
    }
    const result = await tx.$queryRaw`
      SELECT * FROM on_hand 
      WHERE item_id = ${itemId}::uuid 
      AND invent_dim_id = ${inventDimId}::uuid 
      FOR UPDATE
    `;
    return result[0] || null;
  }

  /**
   * Create new on-hand record
   */
  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.onHand.create({
      data: {
        itemId: data.itemId,
        inventDimId: data.inventDimId,
        physicalQty: data.physicalQty || 0,
        reservedQty: data.reservedQty || 0,
        availableQty: data.availableQty || 0,
        orderedQty: data.orderedQty || 0,
        uomId: data.uomId,
        lastMovementAt: data.lastMovementAt,
        lastCountAt: data.lastCountAt,
        rowVersion: 0,
      },
    });
  }

  /**
   * Update on-hand quantities
   * MD-2 Fix: Added rowVersion WHERE clause for optimistic locking defense
   */
  async updateQty(id, qtyChanges, tx = null) {
    const client = tx || this.prisma;

    const current = await client.onHand.findUnique({ where: { id } });
    if (!current) {
      return null;
    }

    const physicalQty = new Decimal(current.physicalQty).plus(qtyChanges.physicalDelta || 0);
    const reservedQty = new Decimal(current.reservedQty).plus(qtyChanges.reservedDelta || 0);
    const availableQty = physicalQty.minus(reservedQty);

    const updated = await client.onHand.updateMany({
      where: { 
        id,
        rowVersion: current.rowVersion,
      },
      data: {
        physicalQty: physicalQty.toFixed(3),
        reservedQty: reservedQty.toFixed(3),
        availableQty: availableQty.toFixed(3),
        lastMovementAt: qtyChanges.isMovement ? new Date() : current.lastMovementAt,
        lastCountAt: qtyChanges.isCount ? new Date() : current.lastCountAt,
        rowVersion: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new Error(`Optimistic lock failed for on_hand id=${id}. Row was modified by another transaction.`);
    }

    return client.onHand.findUnique({ where: { id } });
  }

  /**
   * Get or create on-hand record
   */
  async getOrCreate(data, tx = null) {
    const client = tx || this.prisma;

    let onHand = await this.findByItemAndDim(data.itemId, data.inventDimId, client);
    if (onHand) {
      return { onHand, created: false };
    }

    try {
      onHand = await this.create(data, client);
      return { onHand, created: true };
    } catch (error) {
      if (error.code === 'P2002') {
        onHand = await this.findByItemAndDim(data.itemId, data.inventDimId, client);
        if (onHand) {
          return { onHand, created: false };
        }
      }
      throw error;
    }
  }

  /**
   * Find on-hand with filters and pagination
   */
  async findMany(filters, pagination = {}, tx = null) {
    const client = tx || this.prisma;
    const { page = 1, pageSize = 50 } = pagination;

    const where = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters.warehouseId) {
      where.inventDim = { warehouseId: filters.warehouseId };
    }
    if (filters.locationId) {
      where.inventDim = { ...where.inventDim, locationId: filters.locationId };
    }
    if (filters.ownerId) {
      where.inventDim = { ...where.inventDim, ownerId: filters.ownerId };
    }
    if (filters.inventoryStatusId) {
      where.inventDim = { ...where.inventDim, inventoryStatusId: filters.inventoryStatusId };
    }
    if (filters.hasStock !== undefined) {
      where.physicalQty = filters.hasStock ? { gt: 0 } : { lte: 0 };
    }

    const [items, total] = await Promise.all([
      client.onHand.findMany({
        where,
        include: {
          item: { select: { itemCode: true, itemName: true, cargoForm: true } },
          inventDim: {
            include: {
              warehouse: { select: { warehouseCode: true, warehouseName: true } },
              location: { select: { locationCode: true, locationType: true } },
              owner: { select: { ownerCode: true, ownerName: true } },
              inventoryStatus: { select: { statusCode: true, description: true, isAllocatable: true } },
            },
          },
          uom: { select: { uomCode: true, description: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      client.onHand.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get all on-hand for reconciliation
   */
  async findAllForReconciliation(filters = {}, tx = null) {
    const client = tx || this.prisma;

    const where = {};

    if (filters.warehouseId) {
      where.inventDim = { warehouseId: filters.warehouseId };
    }
    if (filters.ownerId) {
      where.inventDim = { ...where.inventDim, ownerId: filters.ownerId };
    }
    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    return client.onHand.findMany({
      where,
      select: {
        id: true,
        itemId: true,
        inventDimId: true,
        physicalQty: true,
        reservedQty: true,
        availableQty: true,
      },
    });
  }
}

module.exports = { OnHandRepository };
