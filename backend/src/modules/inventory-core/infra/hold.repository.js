/**
 * Module 3: Inventory Core Engine - InventoryHold Repository
 */

class HoldRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Generate hold number
   */
  generateHoldNo() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HLD-${dateStr}-${random}`;
  }

  /**
   * Find hold by ID
   */
  async findById(id, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryHold.findUnique({
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
        onHand: true,
      },
    });
  }

  /**
   * Find hold by hold number
   */
  async findByHoldNo(holdNo, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryHold.findUnique({
      where: { holdNo },
    });
  }

  /**
   * Find hold by external ID
   */
  async findByExternalId(externalId, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryHold.findFirst({
      where: { externalId },
    });
  }

  /**
   * Create new hold
   */
  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryHold.create({
      data: {
        holdNo: data.holdNo || this.generateHoldNo(),
        shipmentId: data.shipmentId,
        shipmentLineId: data.shipmentLineId,
        workHeaderId: data.workHeaderId,
        itemId: data.itemId,
        inventDimId: data.inventDimId,
        onHandId: data.onHandId,
        holdQty: data.holdQty,
        releasedQty: 0,
        status: 'ACTIVE',
        reasonCode: data.reasonCode,
        externalId: data.externalId,
        correlationId: data.correlationId,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Update hold for partial release
   */
  async updateRelease(id, releaseQty, releasedBy, tx = null) {
    const client = tx || this.prisma;

    const hold = await client.inventoryHold.findUnique({ where: { id } });
    if (!hold) {
      return null;
    }

    const newReleasedQty = parseFloat(hold.releasedQty) + parseFloat(releaseQty);
    const holdQty = parseFloat(hold.holdQty);

    let newStatus = 'PARTIALLY_RELEASED';
    if (newReleasedQty >= holdQty) {
      newStatus = 'RELEASED';
    }

    return client.inventoryHold.update({
      where: { id },
      data: {
        releasedQty: newReleasedQty,
        status: newStatus,
        releasedAt: new Date(),
        releasedBy,
      },
    });
  }

  /**
   * Update hold status
   */
  async updateStatus(id, status, releasedBy = null, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryHold.update({
      where: { id },
      data: {
        status,
        releasedAt: status !== 'ACTIVE' ? new Date() : null,
        releasedBy,
      },
    });
  }

  /**
   * Find holds by shipment
   */
  async findByShipment(shipmentId, shipmentLineId = null, tx = null) {
    const client = tx || this.prisma;

    const where = { shipmentId };
    if (shipmentLineId) {
      where.shipmentLineId = shipmentLineId;
    }

    return client.inventoryHold.findMany({
      where,
      include: {
        item: { select: { itemCode: true } },
        inventDim: {
          include: {
            location: { select: { locationCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find holds with filters
   */
  async findMany(filters, pagination = {}, tx = null) {
    const client = tx || this.prisma;
    const { page = 1, pageSize = 50 } = pagination;

    const where = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters.inventDimId) {
      where.inventDimId = filters.inventDimId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.shipmentId) {
      where.shipmentId = filters.shipmentId;
    }
    if (filters.ownerId) {
      where.inventDim = { ownerId: filters.ownerId };
    }

    const [items, total] = await Promise.all([
      client.inventoryHold.findMany({
        where,
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
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      client.inventoryHold.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Sum active holds for item + dim
   */
  async sumActiveHoldsForItemDim(itemId, inventDimId, tx = null) {
    const client = tx || this.prisma;

    const result = await client.inventoryHold.aggregate({
      where: {
        itemId,
        inventDimId,
        status: 'ACTIVE',
      },
      _sum: {
        holdQty: true,
      },
    });

    return parseFloat(result._sum.holdQty || 0);
  }
}

module.exports = { HoldRepository };
