/**
 * Module 6: Inventory Control - State Machine Service
 * Centralized state transition logic for all IC documents
 */

const { IcInvalidStateTransitionError } = require('../domain/ic.errors');
const {
  canTransitionMoveOrder,
  canTransitionTransferOrder,
  canTransitionStatusChange,
  canTransitionCycleCount,
  canTransitionAdjustment,
  canTransitionReconciliation,
} = require('../domain/ic.policy');
const { IcDocumentEntityType } = require('../domain/ic.enums');
const statusHistoryRepo = require('../infra/ic-status-history.repository');

function validateMoveOrderTransition(currentStatus, targetStatus) {
  if (!canTransitionMoveOrder(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'MOVE_ORDER');
  }
}

function validateTransferOrderTransition(currentStatus, targetStatus) {
  if (!canTransitionTransferOrder(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'TRANSFER_ORDER');
  }
}

function validateStatusChangeTransition(currentStatus, targetStatus) {
  if (!canTransitionStatusChange(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'STATUS_CHANGE');
  }
}

function validateCycleCountTransition(currentStatus, targetStatus) {
  if (!canTransitionCycleCount(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'CYCLE_COUNT');
  }
}

function validateAdjustmentTransition(currentStatus, targetStatus) {
  if (!canTransitionAdjustment(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'ADJUSTMENT');
  }
}

function validateReconciliationTransition(currentStatus, targetStatus) {
  if (!canTransitionReconciliation(currentStatus, targetStatus)) {
    throw new IcInvalidStateTransitionError(currentStatus, targetStatus, 'RECONCILIATION');
  }
}

async function recordStatusChange(entityType, entityId, oldStatus, newStatus, changedBy, correlationId, reasonCode = null, notes = null, tx) {
  await statusHistoryRepo.createStatusHistory({
    entityType,
    entityId,
    oldStatus,
    newStatus,
    changedBy,
    reasonCode,
    notes,
    correlationId,
  }, tx);
}

async function transitionMoveOrder(moveOrder, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateMoveOrderTransition(moveOrder.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.MOVE,
    moveOrder.id,
    moveOrder.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

async function transitionTransferOrder(transferOrder, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateTransferOrderTransition(transferOrder.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.TRANSFER,
    transferOrder.id,
    transferOrder.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

async function transitionStatusChange(statusChange, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateStatusChangeTransition(statusChange.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.STATUS_CHANGE,
    statusChange.id,
    statusChange.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

async function transitionCycleCount(cycleCount, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateCycleCountTransition(cycleCount.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.COUNT,
    cycleCount.id,
    cycleCount.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

async function transitionAdjustment(adjustment, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateAdjustmentTransition(adjustment.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.ADJUSTMENT,
    adjustment.id,
    adjustment.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

async function transitionReconciliation(reconciliation, targetStatus, userId, correlationId, reasonCode = null, notes = null, tx) {
  validateReconciliationTransition(reconciliation.status, targetStatus);
  await recordStatusChange(
    IcDocumentEntityType.RECONCILIATION,
    reconciliation.id,
    reconciliation.status,
    targetStatus,
    userId,
    correlationId,
    reasonCode,
    notes,
    tx
  );
  return targetStatus;
}

module.exports = {
  validateMoveOrderTransition,
  validateTransferOrderTransition,
  validateStatusChangeTransition,
  validateCycleCountTransition,
  validateAdjustmentTransition,
  validateReconciliationTransition,
  recordStatusChange,
  transitionMoveOrder,
  transitionTransferOrder,
  transitionStatusChange,
  transitionCycleCount,
  transitionAdjustment,
  transitionReconciliation,
};
