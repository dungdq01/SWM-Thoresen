/**
 * Module 6: Inventory Control - Status Change Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createStatusChange(data, tx = prisma) {
  return tx.icInventoryStatusChange.create({
    data: {
      statusChangeNumber: data.statusChangeNumber,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      itemId: data.itemId,
      ownerId: data.ownerId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      qty: data.qty,
      uom: data.uom,
      reasonCode: data.reasonCode,
      reasonText: data.reasonText,
      attachmentRef: data.attachmentRef,
      status: data.status || 'CREATED',
      requestedBy: data.requestedBy,
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
    },
  });
}

async function findStatusChangeById(id, tx = prisma) {
  return tx.icInventoryStatusChange.findUnique({ where: { id } });
}

async function findStatusChangeByNumber(statusChangeNumber, tx = prisma) {
  return tx.icInventoryStatusChange.findUnique({ where: { statusChangeNumber } });
}

async function findStatusChangeByExternalId(externalId, tx = prisma) {
  return tx.icInventoryStatusChange.findUnique({ where: { externalId } });
}

async function findStatusChanges(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.status) where.status = filters.status;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icInventoryStatusChange.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icInventoryStatusChange.count({ where }),
  ]);
  
  return { items, total };
}

async function updateStatusChange(id, data, tx = prisma) {
  return tx.icInventoryStatusChange.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockStatusChangeForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_inventory_status_change WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createStatusChange,
  findStatusChangeById,
  findStatusChangeByNumber,
  findStatusChangeByExternalId,
  findStatusChanges,
  updateStatusChange,
  lockStatusChangeForUpdate,
};
