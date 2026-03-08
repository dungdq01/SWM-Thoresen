/**
 * Module 6: Inventory Control - Document Status History Repository
 */

const prisma = require('../../../shared/db/prismaClient');

async function createStatusHistory(data, tx = prisma) {
  return tx.icDocumentStatusHistory.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      changedBy: data.changedBy,
      reasonCode: data.reasonCode,
      notes: data.notes,
      correlationId: data.correlationId,
    },
  });
}

async function findStatusHistoryByEntity(entityType, entityId, tx = prisma) {
  return tx.icDocumentStatusHistory.findMany({
    where: { entityType, entityId },
    orderBy: { changedAt: 'desc' },
  });
}

async function createExceptionLog(data, tx = prisma) {
  return tx.icExceptionLog.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      exceptionType: data.exceptionType,
      severity: data.severity,
      message: data.message,
      payloadJson: data.payloadJson,
      status: data.status || 'OPEN',
      createdBy: data.createdBy,
      correlationId: data.correlationId,
    },
  });
}

async function findExceptionsByEntity(entityType, entityId, tx = prisma) {
  return tx.icExceptionLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateException(id, data, tx = prisma) {
  return tx.icExceptionLog.update({
    where: { id },
    data,
  });
}

module.exports = {
  createStatusHistory,
  findStatusHistoryByEntity,
  createExceptionLog,
  findExceptionsByEntity,
  updateException,
};
