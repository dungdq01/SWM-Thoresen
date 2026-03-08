/**
 * Module 6: Inventory Control - Adjustment Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createAdjustmentHeader(data, tx = prisma) {
  return tx.icAdjustmentHeader.create({
    data: {
      adjustmentNumber: data.adjustmentNumber,
      warehouseId: data.warehouseId,
      adjustmentType: data.adjustmentType,
      sourceType: data.sourceType,
      status: data.status || 'DRAFT',
      totalLineCount: data.lines?.length || 0,
      totalAbsQty: data.totalAbsQty || 0,
      requestedBy: data.requestedBy,
      reasonCode: data.reasonCode,
      remarks: data.remarks,
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
      lines: {
        create: data.lines.map((line, index) => ({
          lineNo: index + 1,
          itemId: line.itemId,
          ownerId: line.ownerId,
          warehouseId: data.warehouseId,
          locationId: line.locationId,
          inventoryStatus: line.inventoryStatus,
          qtyDelta: line.qtyDelta,
          uom: line.uom,
          reasonCode: line.reasonCode || data.reasonCode,
          lineStatus: 'OPEN',
        })),
      },
    },
    include: { lines: true },
  });
}

async function findAdjustmentById(id, tx = prisma) {
  return tx.icAdjustmentHeader.findUnique({
    where: { id },
    include: { lines: true },
  });
}

async function findAdjustmentByNumber(adjustmentNumber, tx = prisma) {
  return tx.icAdjustmentHeader.findUnique({
    where: { adjustmentNumber },
    include: { lines: true },
  });
}

async function findAdjustmentByExternalId(externalId, tx = prisma) {
  return tx.icAdjustmentHeader.findUnique({
    where: { externalId },
    include: { lines: true },
  });
}

async function findAdjustments(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icAdjustmentHeader.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icAdjustmentHeader.count({ where }),
  ]);
  
  return { items, total };
}

async function updateAdjustment(id, data, tx = prisma) {
  return tx.icAdjustmentHeader.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
    include: { lines: true },
  });
}

async function updateAdjustmentLine(id, data, tx = prisma) {
  return tx.icAdjustmentLine.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockAdjustmentForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_adjustment_header WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createAdjustmentHeader,
  findAdjustmentById,
  findAdjustmentByNumber,
  findAdjustmentByExternalId,
  findAdjustments,
  updateAdjustment,
  updateAdjustmentLine,
  lockAdjustmentForUpdate,
};
