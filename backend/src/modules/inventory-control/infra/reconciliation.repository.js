/**
 * Module 6: Inventory Control - Reconciliation Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createReconciliationReview(data, tx = prisma) {
  return tx.icReconciliationReview.create({
    data: {
      reconciliationReviewNumber: data.reconciliationReviewNumber,
      warehouseId: data.warehouseId,
      scopeType: data.scopeType,
      sourceRunId: data.sourceRunId,
      status: data.status || 'OPEN',
      mismatchCount: data.mismatchCount || 0,
      severity: data.severity,
      assignedTo: data.assignedTo,
      summary: data.summary,
      externalId: data.externalId,
      correlationId: data.correlationId,
      sourceApp: data.sourceApp,
      createdBy: data.createdBy,
    },
  });
}

async function findReconciliationById(id, tx = prisma) {
  return tx.icReconciliationReview.findUnique({ where: { id } });
}

async function findReconciliationByNumber(reconciliationReviewNumber, tx = prisma) {
  return tx.icReconciliationReview.findUnique({ where: { reconciliationReviewNumber } });
}

async function findReconciliationByExternalId(externalId, tx = prisma) {
  return tx.icReconciliationReview.findUnique({ where: { externalId } });
}

async function findReconciliations(filters, pagination, tx = prisma) {
  const where = {};
  
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.assignedTo) where.assignedTo = filters.assignedTo;
  if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
  if (filters.toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
  }
  
  const [items, total] = await Promise.all([
    tx.icReconciliationReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    tx.icReconciliationReview.count({ where }),
  ]);
  
  return { items, total };
}

async function updateReconciliation(id, data, tx = prisma) {
  return tx.icReconciliationReview.update({
    where: { id },
    data: {
      ...data,
      rowVersion: { increment: 1 },
    },
  });
}

async function lockReconciliationForUpdate(id, tx) {
  const result = await tx.$queryRaw`
    SELECT * FROM ic_reconciliation_review WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0];
}

module.exports = {
  createReconciliationReview,
  findReconciliationById,
  findReconciliationByNumber,
  findReconciliationByExternalId,
  findReconciliations,
  updateReconciliation,
  lockReconciliationForUpdate,
};
