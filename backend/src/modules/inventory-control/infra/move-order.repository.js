/**
 * Module 6: Inventory Control - Move Order Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createMoveOrder(data, tx = prisma) {
  return tx.icMoveOrder.create({
    data: {
      moveNumber: data.moveNumber,
      warehouseId: data.warehouseId,
      executionMode: data.executionMode,
      status: data.status || 'DRAFT',
      reasonCode: data.reasonCode,
      remarks: data.remarks,
      requestedBy: data.requestedBy,
      postingStatus: 'PENDING',
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
      lines: {
        create: data.lines.map((line, index) => ({
          lineNo: index + 1,
          itemId: line.itemId,
          ownerId: line.ownerId,
          fromLocationId: line.fromLocationId,
          toLocationId: line.toLocationId,
          inventoryStatus: line.inventoryStatus,
          requestedQty: line.requestedQty,
          uom: line.uom,
          lineStatus: 'OPEN',
        })),
      },
    },
    include: { lines: true },
  });
}

async function findMoveOrderById(id, tx = prisma) {
  return tx.icMoveOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
}

async function findMoveOrderByNumber(moveNumber, tx = prisma) {
  return tx.icMoveOrder.findUnique({
    where: { moveNumber },
    include: { lines: true },
  });
}

async function findMoveOrderByExternalId(externalId, tx = prisma) {
  return tx.icMoveOrder.findUnique({
    where: { externalId },
    include: { lines: true },
  });
}

async function findMoveOrders(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icMoveOrder.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icMoveOrder.count({ where }),
  ]);
  
  return { items, total };
}

async function updateMoveOrder(id, data, tx = prisma) {
  return tx.icMoveOrder.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
    include: { lines: true },
  });
}

async function updateMoveOrderWithVersionCheck(id, rowVersion, data, tx = prisma) {
  return tx.icMoveOrder.updateMany({
    where: { id, rowVersion },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function updateMoveOrderLine(id, data, tx = prisma) {
  return tx.icMoveOrderLine.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockMoveOrderForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_move_order WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createMoveOrder,
  findMoveOrderById,
  findMoveOrderByNumber,
  findMoveOrderByExternalId,
  findMoveOrders,
  updateMoveOrder,
  updateMoveOrderWithVersionCheck,
  updateMoveOrderLine,
  lockMoveOrderForUpdate,
};
