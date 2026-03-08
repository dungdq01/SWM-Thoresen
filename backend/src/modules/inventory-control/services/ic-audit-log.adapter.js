/**
 * Module 6: Inventory Control - Audit Log Adapter
 * Adapter to call Module 1 (Foundation) LogService for audit logging
 */

const SOURCE_MODULE = 'INVENTORY_CONTROL';

/**
 * Log an audit event to M1 Foundation
 * @param {Object} data - Audit log data
 * @param {string} data.entityType - Type of entity (e.g., 'MOVE_ORDER', 'TRANSFER_ORDER')
 * @param {string} data.entityId - ID of the entity
 * @param {string} data.action - Action performed (e.g., 'CREATE', 'CONFIRM', 'EXECUTE')
 * @param {Object} data.oldValue - Previous state (optional)
 * @param {Object} data.newValue - New state (optional)
 * @param {string} data.userId - User performing the action
 * @param {string} data.userRole - User's role
 * @param {string} data.reasonCode - Reason code (optional)
 * @param {string} data.notes - Additional notes (optional)
 * @param {string} data.correlationId - Correlation ID for tracing
 * @param {string} data.requestId - Request ID
 * @param {string} data.warehouseCode - Warehouse code (optional)
 * @param {string} data.ownerId - Owner ID (optional)
 * @param {Object} data.metadata - Additional metadata (optional)
 */
async function logAudit(data) {
  try {
    const logRepository = require('../../foundation/repositories/log.repository');
    
    await logRepository.createAuditLog({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      oldValue: data.oldValue ? JSON.stringify(data.oldValue) : undefined,
      newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
      userId: data.userId,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      deviceType: data.deviceType,
      reasonCode: data.reasonCode,
      notes: data.notes,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: SOURCE_MODULE,
      warehouseCode: data.warehouseCode,
      ownerId: data.ownerId,
      metadata: data.metadata,
    });
  } catch (error) {
    console.error('[IC AuditLog] Failed to log audit:', error.message);
  }
}

/**
 * Log a Move Order action
 */
async function logMoveOrderAction(moveOrder, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_MOVE_ORDER',
    entityId: moveOrder.id,
    action,
    oldValue,
    newValue: { status: moveOrder.status, moveNumber: moveOrder.moveNumber },
    userId,
    correlationId,
    warehouseCode: moveOrder.warehouseId,
    notes,
  });
}

/**
 * Log a Transfer Order action
 */
async function logTransferOrderAction(transferOrder, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_TRANSFER_ORDER',
    entityId: transferOrder.id,
    action,
    oldValue,
    newValue: { status: transferOrder.status, transferNumber: transferOrder.transferNumber },
    userId,
    correlationId,
    warehouseCode: transferOrder.fromWarehouseId,
    notes,
  });
}

/**
 * Log a Status Change action
 */
async function logStatusChangeAction(statusChange, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_STATUS_CHANGE',
    entityId: statusChange.id,
    action,
    oldValue,
    newValue: { 
      status: statusChange.status, 
      statusChangeNumber: statusChange.statusChangeNumber,
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
    },
    userId,
    correlationId,
    warehouseCode: statusChange.warehouseId,
    notes,
  });
}

/**
 * Log a Cycle Count action
 */
async function logCycleCountAction(cycleCount, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_CYCLE_COUNT',
    entityId: cycleCount.id,
    action,
    oldValue,
    newValue: { status: cycleCount.status, countNumber: cycleCount.countNumber },
    userId,
    correlationId,
    warehouseCode: cycleCount.warehouseId,
    notes,
  });
}

/**
 * Log an Adjustment action
 */
async function logAdjustmentAction(adjustment, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_ADJUSTMENT',
    entityId: adjustment.id,
    action,
    oldValue,
    newValue: { status: adjustment.status, adjustmentNumber: adjustment.adjustmentNumber },
    userId,
    correlationId,
    warehouseCode: adjustment.warehouseId,
    notes,
  });
}

/**
 * Log a Reconciliation action
 */
async function logReconciliationAction(reconciliation, action, userId, correlationId, oldValue = null, notes = null) {
  await logAudit({
    entityType: 'IC_RECONCILIATION',
    entityId: reconciliation.id,
    action,
    oldValue,
    newValue: { status: reconciliation.status, reconciliationNo: reconciliation.reconciliationNo },
    userId,
    correlationId,
    warehouseCode: reconciliation.warehouseId,
    notes,
  });
}

module.exports = {
  logAudit,
  logMoveOrderAction,
  logTransferOrderAction,
  logStatusChangeAction,
  logCycleCountAction,
  logAdjustmentAction,
  logReconciliationAction,
};
