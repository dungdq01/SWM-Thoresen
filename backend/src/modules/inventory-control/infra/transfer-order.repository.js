/**
 * Module 6: Inventory Control - Transfer Order Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createTransferOrder(data, tx = prisma) {
  return tx.icTransferOrder.create({
    data: {
      transferNumber: data.transferNumber,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      executionMode: data.executionMode,
      status: data.status || 'CREATED',
      requestedShipDate: data.requestedShipDate,
      inTransitSlaHours: data.inTransitSlaHours,
      vehicleNumber: data.vehicleNumber,
      postingShipStatus: 'PENDING',
      postingReceiveStatus: 'PENDING',
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
      lines: {
        create: data.lines.map((line, index) => ({
          lineNo: index + 1,
          itemId: line.itemId,
          ownerId: line.ownerId,
          uom: line.uom,
          requestedQty: line.requestedQty,
          fromLocationId: line.fromLocationId,
          toLocationId: line.toLocationId,
          inventoryStatus: line.inventoryStatus,
          lineStatus: 'OPEN',
        })),
      },
    },
    include: { lines: true },
  });
}

async function findTransferOrderById(id, tx = prisma) {
  return tx.icTransferOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
}

async function findTransferOrderByNumber(transferNumber, tx = prisma) {
  return tx.icTransferOrder.findUnique({
    where: { transferNumber },
    include: { lines: true },
  });
}

async function findTransferOrderByExternalId(externalId, tx = prisma) {
  return tx.icTransferOrder.findUnique({
    where: { externalId },
    include: { lines: true },
  });
}

async function findTransferOrders(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.fromWarehouseId) where.fromWarehouseId = filters.fromWarehouseId;
  if (filters.toWarehouseId) where.toWarehouseId = filters.toWarehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icTransferOrder.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icTransferOrder.count({ where }),
  ]);
  
  return { items, total };
}

async function findAgingTransfers(slaHours, tx = prisma) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - slaHours);
  
  return tx.icTransferOrder.findMany({
    where: {
      status: { in: ['SHIPPED', 'IN_TRANSIT'] },
      actualShipAt: { lt: cutoffDate },
    },
    include: { lines: true },
    orderBy: { actualShipAt: 'asc' },
  });
}

async function updateTransferOrder(id, data, tx = prisma) {
  return tx.icTransferOrder.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
    include: { lines: true },
  });
}

async function updateTransferOrderLine(id, data, tx = prisma) {
  return tx.icTransferOrderLine.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockTransferOrderForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_transfer_order WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createTransferOrder,
  findTransferOrderById,
  findTransferOrderByNumber,
  findTransferOrderByExternalId,
  findTransferOrders,
  findAgingTransfers,
  updateTransferOrder,
  updateTransferOrderLine,
  lockTransferOrderForUpdate,
};
