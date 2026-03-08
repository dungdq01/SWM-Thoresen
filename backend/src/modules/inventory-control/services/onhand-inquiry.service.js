/**
 * Module 6: Inventory Control - On-Hand Inquiry Service
 * Query service for inventory on-hand and movement history
 */

const prisma = require('../../../shared/db/prismaClient');

async function getOnHandSummary(filters, pagination) {
  const where = {};
  
  if (filters.warehouseId) {
    where.inventDim = { ...where.inventDim, warehouseId: filters.warehouseId };
  }
  if (filters.locationId) {
    where.inventDim = { ...where.inventDim, locationId: filters.locationId };
  }
  if (filters.ownerId) {
    where.inventDim = { ...where.inventDim, ownerId: filters.ownerId };
  }
  if (filters.itemId) {
    where.itemId = filters.itemId;
  }
  if (filters.inventoryStatusId) {
    where.inventDim = { ...where.inventDim, inventoryStatusId: filters.inventoryStatusId };
  }

  const [items, total] = await Promise.all([
    prisma.onHand.findMany({
      where,
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        inventDim: {
          include: {
            warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
            location: { select: { id: true, locationCode: true } },
            owner: { select: { id: true, ownerCode: true, ownerName: true } },
            inventoryStatus: { select: { id: true, statusCode: true, description: true } },
          },
        },
        uom: { select: { id: true, uomCode: true } },
      },
      orderBy: [
        { item: { itemCode: 'asc' } },
        { inventDim: { location: { locationCode: 'asc' } } },
      ],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.onHand.count({ where }),
  ]);

  return {
    items: items.map(oh => ({
      id: oh.id,
      item: oh.item,
      warehouse: oh.inventDim.warehouse,
      location: oh.inventDim.location,
      owner: oh.inventDim.owner,
      inventoryStatus: oh.inventDim.inventoryStatus,
      uom: oh.uom,
      physicalQty: oh.physicalQty,
      reservedQty: oh.reservedQty,
      availableQty: oh.availableQty,
      orderedQty: oh.orderedQty,
      lastMovementAt: oh.lastMovementAt,
      lastCountAt: oh.lastCountAt,
    })),
    total,
  };
}

async function getOnHandByItem(itemId, filters = {}) {
  const where = { itemId };
  
  if (filters.warehouseId) {
    where.inventDim = { ...where.inventDim, warehouseId: filters.warehouseId };
  }
  if (filters.ownerId) {
    where.inventDim = { ...where.inventDim, ownerId: filters.ownerId };
  }

  const onHandRecords = await prisma.onHand.findMany({
    where,
    include: {
      item: { select: { id: true, itemCode: true, itemName: true } },
      inventDim: {
        include: {
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
          location: { select: { id: true, locationCode: true } },
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          inventoryStatus: { select: { id: true, statusCode: true, description: true } },
        },
      },
      uom: { select: { id: true, uomCode: true } },
    },
    orderBy: { inventDim: { location: { locationCode: 'asc' } } },
  });

  const summary = {
    totalPhysical: 0,
    totalReserved: 0,
    totalAvailable: 0,
    byWarehouse: {},
    byOwner: {},
    byStatus: {},
  };

  for (const oh of onHandRecords) {
    const physical = parseFloat(oh.physicalQty);
    const reserved = parseFloat(oh.reservedQty);
    const available = parseFloat(oh.availableQty);

    summary.totalPhysical += physical;
    summary.totalReserved += reserved;
    summary.totalAvailable += available;

    const whCode = oh.inventDim.warehouse.warehouseCode;
    if (!summary.byWarehouse[whCode]) {
      summary.byWarehouse[whCode] = { physical: 0, reserved: 0, available: 0 };
    }
    summary.byWarehouse[whCode].physical += physical;
    summary.byWarehouse[whCode].reserved += reserved;
    summary.byWarehouse[whCode].available += available;

    const ownerCode = oh.inventDim.owner.ownerCode;
    if (!summary.byOwner[ownerCode]) {
      summary.byOwner[ownerCode] = { physical: 0, reserved: 0, available: 0 };
    }
    summary.byOwner[ownerCode].physical += physical;
    summary.byOwner[ownerCode].reserved += reserved;
    summary.byOwner[ownerCode].available += available;

    const statusCode = oh.inventDim.inventoryStatus.statusCode;
    if (!summary.byStatus[statusCode]) {
      summary.byStatus[statusCode] = { physical: 0, reserved: 0, available: 0 };
    }
    summary.byStatus[statusCode].physical += physical;
    summary.byStatus[statusCode].reserved += reserved;
    summary.byStatus[statusCode].available += available;
  }

  return {
    item: onHandRecords[0]?.item || null,
    summary,
    details: onHandRecords.map(oh => ({
      id: oh.id,
      warehouse: oh.inventDim.warehouse,
      location: oh.inventDim.location,
      owner: oh.inventDim.owner,
      inventoryStatus: oh.inventDim.inventoryStatus,
      uom: oh.uom,
      physicalQty: oh.physicalQty,
      reservedQty: oh.reservedQty,
      availableQty: oh.availableQty,
      lastMovementAt: oh.lastMovementAt,
    })),
  };
}

async function getMovementHistory(filters, pagination) {
  const where = {};
  
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.warehouseId) {
    where.OR = [
      { dimFrom: { warehouseId: filters.warehouseId } },
      { dimTo: { warehouseId: filters.warehouseId } },
    ];
  }
  if (filters.transType) where.transType = filters.transType;
  if (filters.refType) where.refType = filters.refType;
  if (filters.fromDate) where.postedAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.postedAt = { ...where.postedAt, lte: new Date(filters.toDate) };
  }

  const [items, total] = await Promise.all([
    prisma.inventTrans.findMany({
      where,
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        uom: { select: { id: true, uomCode: true } },
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
      },
      orderBy: { postedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.inventTrans.count({ where }),
  ]);

  return {
    items: items.map(t => ({
      id: t.id,
      transId: t.transId,
      transType: t.transType,
      refType: t.refType,
      refId: t.refId,
      refLineId: t.refLineId,
      item: t.item,
      owner: t.owner,
      qty: t.qty,
      uom: t.uom,
      from: t.dimFrom ? {
        warehouse: t.dimFrom.warehouse?.warehouseCode,
        location: t.dimFrom.location?.locationCode,
        status: t.dimFrom.inventoryStatus?.statusCode,
      } : null,
      to: t.dimTo ? {
        warehouse: t.dimTo.warehouse?.warehouseCode,
        location: t.dimTo.location?.locationCode,
        status: t.dimTo.inventoryStatus?.statusCode,
      } : null,
      reasonCode: t.reasonCode,
      postedAt: t.postedAt,
      postedBy: t.postedBy,
      sourceApp: t.sourceApp,
      isReversal: t.isReversal,
    })),
    total,
  };
}

module.exports = {
  getOnHandSummary,
  getOnHandByItem,
  getMovementHistory,
};
