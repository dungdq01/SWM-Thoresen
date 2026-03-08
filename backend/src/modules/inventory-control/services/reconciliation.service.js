/**
 * Module 6: Inventory Control - Reconciliation Service
 */

const prisma = require('../../../shared/db/prismaClient');
const reconciliationRepo = require('../infra/reconciliation.repository');
const stateMachine = require('./ic-state-machine.service');
const auditLogAdapter = require('./ic-audit-log.adapter');
const { IcReconciliationStatus, IcReconciliationSeverity, IcDocumentEntityType } = require('../domain/ic.enums');
const { IcIdempotencyConflictError, IcNotFoundError, IcValidationError } = require('../domain/ic.errors');

async function generateReconciliationNumber(warehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('RECONCILIATION', { warehouseId }, tx);
}

async function runReconciliation(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await reconciliationRepo.findReconciliationByExternalId(data.externalId);
  if (existing) {
    return { ...existing, idempotentReplay: true };
  }

  return prisma.$transaction(async (tx) => {
    let reconciliationRun = null;
    try {
      const reconciliationService = require('../../inventory-core/application/reconciliationService');
      reconciliationRun = await reconciliationService.runReconciliation({
        scopeType: data.scopeType,
        warehouseId: data.warehouseId,
        ownerId: data.ownerId,
        itemId: data.itemId,
        correlationId,
        requestedBy: userId,
      }, tx);
    } catch (error) {
      reconciliationRun = { runNo: null, mismatchCount: 0 };
    }

    const mismatchCount = reconciliationRun.mismatchCount || 0;

    if (mismatchCount === 0) {
      return {
        status: 'NO_MISMATCH',
        mismatchCount: 0,
        sourceRunId: reconciliationRun.runNo,
      };
    }

    let severity = IcReconciliationSeverity.LOW;
    if (mismatchCount > 100) severity = IcReconciliationSeverity.CRITICAL;
    else if (mismatchCount > 50) severity = IcReconciliationSeverity.HIGH;
    else if (mismatchCount > 10) severity = IcReconciliationSeverity.MEDIUM;

    const reconciliationReviewNumber = await generateReconciliationNumber(data.warehouseId, tx);

    const review = await reconciliationRepo.createReconciliationReview({
      reconciliationReviewNumber,
      warehouseId: data.warehouseId,
      scopeType: data.scopeType,
      sourceRunId: reconciliationRun.runNo,
      status: IcReconciliationStatus.OPEN,
      mismatchCount,
      severity,
      summary: `Found ${mismatchCount} mismatches in scope ${data.scopeType}`,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.RECONCILIATION,
      review.id,
      null,
      IcReconciliationStatus.OPEN,
      userId,
      correlationId,
      null,
      'Created from reconciliation run',
      tx
    );

    return review;
  });
}

async function assignReconciliation(id, assignedTo, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const review = await reconciliationRepo.findReconciliationById(id, tx);
    if (!review) {
      throw new IcNotFoundError('ReconciliationReview', id);
    }

    await stateMachine.transitionReconciliation(
      review,
      IcReconciliationStatus.INVESTIGATING,
      userId,
      correlationId,
      null,
      `Assigned to ${assignedTo}`,
      tx
    );

    return reconciliationRepo.updateReconciliation(id, {
      status: IcReconciliationStatus.INVESTIGATING,
      assignedTo,
      updatedBy: userId,
    }, tx);
  });
}

async function resolveReconciliation(id, resolveData, requestContext) {
  const { userId, correlationId } = requestContext;

  if (!resolveData.resolutionType) {
    throw new IcValidationError('Resolution type is required');
  }

  return prisma.$transaction(async (tx) => {
    const review = await reconciliationRepo.findReconciliationById(id, tx);
    if (!review) {
      throw new IcNotFoundError('ReconciliationReview', id);
    }

    const newStatus = await stateMachine.transitionReconciliation(
      review,
      IcReconciliationStatus.RESOLVED,
      userId,
      correlationId,
      null,
      `Resolved: ${resolveData.resolutionType}`,
      tx
    );

    return reconciliationRepo.updateReconciliation(id, {
      status: newStatus,
      resolutionType: resolveData.resolutionType,
      resolutionRef: resolveData.resolutionRef,
      summary: resolveData.summary || review.summary,
      updatedBy: userId,
    }, tx);
  });
}

async function closeReconciliation(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const review = await reconciliationRepo.findReconciliationById(id, tx);
    if (!review) {
      throw new IcNotFoundError('ReconciliationReview', id);
    }

    if (!review.resolutionType) {
      throw new IcValidationError('Cannot close without resolution type');
    }

    const newStatus = await stateMachine.transitionReconciliation(
      review,
      IcReconciliationStatus.CLOSED,
      userId,
      correlationId,
      null,
      'Closed',
      tx
    );

    return reconciliationRepo.updateReconciliation(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function getReconciliation(id) {
  const review = await reconciliationRepo.findReconciliationById(id);
  if (!review) {
    throw new IcNotFoundError('ReconciliationReview', id);
  }
  return review;
}

async function listReconciliations(filters, pagination) {
  return reconciliationRepo.findReconciliations(filters, pagination);
}

module.exports = {
  runReconciliation,
  assignReconciliation,
  resolveReconciliation,
  closeReconciliation,
  getReconciliation,
  listReconciliations,
};
