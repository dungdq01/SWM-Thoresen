/**
 * Module 3: Inventory Core Engine - InventTrans Repository
 */

class InventTransRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Find transaction by ID
   */
  async findById(id, tx = null) {
    const client = tx || this.prisma;
    return client.inventTrans.findUnique({
      where: { id },
      include: {
        item: { select: { itemCode: true, itemName: true } },
        uom: { select: { uomCode: true, description: true } },
        dimFrom: {
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
        dimTo: {
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
        owner: { select: { ownerCode: true, ownerName: true } },
      },
    });
  }

  /**
   * Find transaction by trans_id (business key)
   */
  async findByTransId(transId, tx = null) {
    const client = tx || this.prisma;
    return client.inventTrans.findUnique({
      where: { transId },
      include: {
        item: { select: { itemCode: true, itemName: true } },
        uom: { select: { uomCode: true } },
        dimFrom: true,
        dimTo: true,
        owner: { select: { ownerCode: true } },
      },
    });
  }

  /**
   * Find transaction by external_id and trans_type (idempotency check)
   */
  async findByExternalIdAndType(externalId, transType, tx = null) {
    const client = tx || this.prisma;
    return client.inventTrans.findFirst({
      where: {
        externalId,
        transType,
      },
    });
  }

  /**
   * Create new transaction
   */
  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.inventTrans.create({
      data: {
        transId: data.transId,
        refType: data.refType,
        refId: data.refId,
        refLineId: data.refLineId,
        transType: data.transType,
        itemId: data.itemId,
        qty: data.qty,
        uomId: data.uomId,
        dimFromId: data.dimFromId,
        dimToId: data.dimToId,
        statusFromCode: data.statusFromCode,
        statusToCode: data.statusToCode,
        stage: data.stage || 'PHYSICAL',
        externalId: data.externalId,
        correlationId: data.correlationId,
        reasonCode: data.reasonCode,
        sourceApp: data.sourceApp,
        postedBy: data.postedBy,
        postedAt: data.postedAt || new Date(),
        ownerId: data.ownerId,
        weighbridgeTicketId: data.weighbridgeTicketId,
        isReversal: data.isReversal || false,
        reversalOfTransId: data.reversalOfTransId,
      },
    });
  }

  /**
   * Find transactions with filters and pagination
   */
  async findMany(filters, pagination = {}, tx = null) {
    const client = tx || this.prisma;
    const { page = 1, pageSize = 50 } = pagination;

    const where = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }
    if (filters.refType) {
      where.refType = filters.refType;
    }
    if (filters.refId) {
      where.refId = filters.refId;
    }
    if (filters.transType) {
      where.transType = filters.transType;
    }
    if (filters.dimToId) {
      where.dimToId = filters.dimToId;
    }
    if (filters.dimFromId) {
      where.dimFromId = filters.dimFromId;
    }
    if (filters.fromDate || filters.toDate) {
      where.postedAt = {};
      if (filters.fromDate) {
        where.postedAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.postedAt.lte = new Date(filters.toDate);
      }
    }
    if (filters.correlationId) {
      where.correlationId = filters.correlationId;
    }

    const [items, total] = await Promise.all([
      client.inventTrans.findMany({
        where,
        include: {
          item: { select: { itemCode: true, itemName: true } },
          uom: { select: { uomCode: true } },
          dimFrom: {
            include: {
              warehouse: { select: { warehouseCode: true } },
              location: { select: { locationCode: true } },
              inventoryStatus: { select: { statusCode: true } },
            },
          },
          dimTo: {
            include: {
              warehouse: { select: { warehouseCode: true } },
              location: { select: { locationCode: true } },
              inventoryStatus: { select: { statusCode: true } },
            },
          },
          owner: { select: { ownerCode: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { postedAt: 'desc' },
      }),
      client.inventTrans.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Aggregate ledger qty by item and dim for reconciliation
   */
  async aggregateLedgerQty(filters = {}, tx = null) {
    const client = tx || this.prisma;

    const where = {
      stage: 'PHYSICAL',
    };

    if (filters.warehouseId) {
      where.OR = [
        { dimFrom: { warehouseId: filters.warehouseId } },
        { dimTo: { warehouseId: filters.warehouseId } },
      ];
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }
    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    const transactions = await client.inventTrans.findMany({
      where,
      select: {
        itemId: true,
        dimFromId: true,
        dimToId: true,
        qty: true,
        transType: true,
      },
    });

    const ledgerMap = new Map();

    for (const trans of transactions) {
      const qty = parseFloat(trans.qty);

      if (trans.dimToId) {
        const key = `${trans.itemId}|${trans.dimToId}`;
        const current = ledgerMap.get(key) || 0;
        ledgerMap.set(key, current + Math.abs(qty));
      }

      if (trans.dimFromId) {
        const key = `${trans.itemId}|${trans.dimFromId}`;
        const current = ledgerMap.get(key) || 0;
        ledgerMap.set(key, current - Math.abs(qty));
      }
    }

    return ledgerMap;
  }

  /**
   * Find reversals for a transaction
   */
  async findReversals(originalTransId, tx = null) {
    const client = tx || this.prisma;
    return client.inventTrans.findMany({
      where: {
        reversalOfTransId: originalTransId,
        isReversal: true,
      },
    });
  }
}

module.exports = { InventTransRepository };
