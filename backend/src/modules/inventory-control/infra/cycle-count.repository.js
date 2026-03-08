/**
 * Module 6: Inventory Control - Cycle Count Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createCycleCountPlan(data, tx = prisma) {
  return tx.icCycleCountPlan.create({
    data: {
      planCode: data.planCode,
      warehouseId: data.warehouseId,
      scopeType: data.scopeType,
      frequency: data.frequency,
      selectionRule: data.selectionRule,
      blindCount: data.blindCount ?? true,
      recountThresholdPct: data.recountThresholdPct,
      autoPostThresholdPct: data.autoPostThresholdPct,
      maxRecount: data.maxRecount ?? 1,
      isActive: true,
      createdBy: data.createdBy,
    },
  });
}

async function findCycleCountPlanById(id, tx = prisma) {
  return tx.icCycleCountPlan.findUnique({
    where: { id },
    include: { cycleCountHeaders: true },
  });
}

async function findCycleCountPlanByCode(planCode, tx = prisma) {
  return tx.icCycleCountPlan.findUnique({ where: { planCode } });
}

async function createCycleCountHeader(data, tx = prisma) {
  return tx.icCycleCountHeader.create({
    data: {
      countNumber: data.countNumber,
      cycleCountPlanId: data.cycleCountPlanId,
      warehouseId: data.warehouseId,
      countScopeSnapshot: data.countScopeSnapshot,
      status: data.status || 'CREATED',
      blindCount: data.blindCount,
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
    },
    include: { lines: true, plan: true },
  });
}

async function createCycleCountLines(headerId, lines, tx = prisma) {
  return tx.icCycleCountLine.createMany({
    data: lines.map((line, index) => ({
      cycleCountHeaderId: headerId,
      lineNo: index + 1,
      itemId: line.itemId,
      ownerId: line.ownerId,
      warehouseId: line.warehouseId,
      locationId: line.locationId,
      inventoryStatus: line.inventoryStatus,
      systemQty: line.systemQty,
      lineStatus: 'OPEN',
    })),
  });
}

async function findCycleCountById(id, tx = prisma) {
  return tx.icCycleCountHeader.findUnique({
    where: { id },
    include: { lines: true, plan: true },
  });
}

async function findCycleCountByNumber(countNumber, tx = prisma) {
  return tx.icCycleCountHeader.findUnique({
    where: { countNumber },
    include: { lines: true, plan: true },
  });
}

async function findCycleCountByExternalId(externalId, tx = prisma) {
  return tx.icCycleCountHeader.findUnique({
    where: { externalId },
    include: { lines: true, plan: true },
  });
}

async function findCycleCounts(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.cycleCountPlanId) where.cycleCountPlanId = filters.cycleCountPlanId;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icCycleCountHeader.findMany({
      where,
      include: { lines: true, plan: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icCycleCountHeader.count({ where }),
  ]);
  
  return { items, total };
}

async function updateCycleCount(id, data, tx = prisma) {
  return tx.icCycleCountHeader.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
    include: { lines: true, plan: true },
  });
}

async function updateCycleCountLine(id, data, tx = prisma) {
  return tx.icCycleCountLine.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockCycleCountForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_cycle_count_header WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createCycleCountPlan,
  findCycleCountPlanById,
  findCycleCountPlanByCode,
  createCycleCountHeader,
  createCycleCountLines,
  findCycleCountById,
  findCycleCountByNumber,
  findCycleCountByExternalId,
  findCycleCounts,
  updateCycleCount,
  updateCycleCountLine,
  lockCycleCountForUpdate,
};
