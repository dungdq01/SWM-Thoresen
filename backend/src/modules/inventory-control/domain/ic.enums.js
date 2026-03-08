/**
 * Module 6: Inventory Control - Enums
 * Định nghĩa các enum cho module inventory control
 */

const IcMoveOrderStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const IcMoveLineStatus = {
  OPEN: 'OPEN',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const IcExecutionMode = {
  DIRECT: 'DIRECT',
  WORK_BASED: 'WORK_BASED',
};

const IcTransferOrderStatus = {
  CREATED: 'CREATED',
  RELEASED: 'RELEASED',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const IcTransferLineStatus = {
  OPEN: 'OPEN',
  SHIPPED: 'SHIPPED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

const IcStatusChangeStatus = {
  CREATED: 'CREATED',
  POSTED: 'POSTED',
  REVERSED: 'REVERSED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

const IcCycleCountStatus = {
  CREATED: 'CREATED',
  RELEASED: 'RELEASED',
  COUNTING: 'COUNTING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
};

const IcCycleCountLineStatus = {
  OPEN: 'OPEN',
  COUNTED: 'COUNTED',
  VARIANCE: 'VARIANCE',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
};

const IcAdjustmentStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const IcAdjustmentLineStatus = {
  OPEN: 'OPEN',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

const IcAdjustmentType = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  MIXED: 'MIXED',
};

const IcAdjustmentSourceType = {
  MANUAL: 'MANUAL',
  COUNT: 'COUNT',
  RECONCILIATION: 'RECONCILIATION',
  TRANSFER_VARIANCE: 'TRANSFER_VARIANCE',
};

const IcReconciliationStatus = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

const IcReconciliationSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const IcResolutionType = {
  NO_ACTION: 'NO_ACTION',
  ADJUSTMENT: 'ADJUSTMENT',
  REVERSE: 'REVERSE',
  INVESTIGATION: 'INVESTIGATION',
};

const IcDocumentEntityType = {
  MOVE: 'MOVE',
  TRANSFER: 'TRANSFER',
  STATUS_CHANGE: 'STATUS_CHANGE',
  COUNT: 'COUNT',
  ADJUSTMENT: 'ADJUSTMENT',
  RECONCILIATION: 'RECONCILIATION',
};

const IcExceptionType = {
  RESERVED_STOCK: 'RESERVED_STOCK',
  POST_FAIL: 'POST_FAIL',
  LIMIT_BREACH: 'LIMIT_BREACH',
  VARIANCE: 'VARIANCE',
  DUPLICATE: 'DUPLICATE',
  WORK_CALLBACK_MISS: 'WORK_CALLBACK_MISS',
  VALIDATION_FAIL: 'VALIDATION_FAIL',
};

const IcExceptionStatus = {
  OPEN: 'OPEN',
  ACK: 'ACK',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED',
};

const IcPostingStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
};

const IcCycleCountScopeType = {
  LOCATION: 'LOCATION',
  ITEM: 'ITEM',
  LOCATION_ITEM: 'LOCATION_ITEM',
  OWNER: 'OWNER',
};

const IcCycleCountPlanFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  ADHOC: 'ADHOC',
};

const IcReconciliationScopeType = {
  WAREHOUSE: 'WAREHOUSE',
  ITEM: 'ITEM',
  OWNER: 'OWNER',
  GLOBAL: 'GLOBAL',
};

module.exports = {
  IcMoveOrderStatus,
  IcMoveLineStatus,
  IcExecutionMode,
  IcTransferOrderStatus,
  IcTransferLineStatus,
  IcStatusChangeStatus,
  IcCycleCountStatus,
  IcCycleCountLineStatus,
  IcAdjustmentStatus,
  IcAdjustmentLineStatus,
  IcAdjustmentType,
  IcAdjustmentSourceType,
  IcReconciliationStatus,
  IcReconciliationSeverity,
  IcResolutionType,
  IcDocumentEntityType,
  IcExceptionType,
  IcExceptionStatus,
  IcPostingStatus,
  IcCycleCountScopeType,
  IcCycleCountPlanFrequency,
  IcReconciliationScopeType,
};
