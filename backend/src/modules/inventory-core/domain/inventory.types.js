/**
 * Module 3: Inventory Core Engine - Domain Types
 */

const InventoryTransType = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  MOVE: 'MOVE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER_ISSUE: 'TRANSFER_ISSUE',
  TRANSFER_RECEIPT: 'TRANSFER_RECEIPT',

  // --- Backward-compatible aliases (deprecated, remove after full migration) ---
  RECEIPT_IN: 'RECEIPT',
  SHIPMENT_OUT: 'ISSUE',
  COUNT_GAIN: 'ADJUSTMENT',
  COUNT_LOSS: 'ADJUSTMENT',
  VAS_CONSUME: 'ISSUE',
  VAS_PRODUCE: 'RECEIPT',
  TRANSFER_OUT: 'TRANSFER_ISSUE',
  TRANSFER_IN: 'TRANSFER_RECEIPT',
};

const InventoryStage = {
  EXPECTED: 'EXPECTED',
  REGISTERED: 'REGISTERED',
  ALLOCATED: 'ALLOCATED',
  DE_ALLOCATED: 'DE_ALLOCATED',
  PHYSICAL: 'PHYSICAL',
  DEDUCTED: 'DEDUCTED',
};

const HoldStatus = {
  ACTIVE: 'ACTIVE',
  PARTIALLY_RELEASED: 'PARTIALLY_RELEASED',
  RELEASED: 'RELEASED',
  CONSUMED: 'CONSUMED',
  CANCELLED: 'CANCELLED',
};

const SourceApp = {
  WEB: 'WEB',
  MOBILE: 'MOBILE',
  API: 'API',
  INTEGRATION: 'INTEGRATION',
  SYSTEM: 'SYSTEM',
};

const ReconciliationRunType = {
  SCHEDULED: 'SCHEDULED',
  ON_DEMAND: 'ON_DEMAND',
  SYSTEM: 'SYSTEM',
};

const ReconciliationScopeType = {
  FULL: 'FULL',
  WAREHOUSE: 'WAREHOUSE',
  OWNER: 'OWNER',
  ITEM: 'ITEM',
};

const ReconciliationSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  INFO: 'INFO',
};

const ReconciliationResultStatus = {
  MISMATCH: 'MISMATCH',
  OK: 'OK',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
};

const SnapshotRunMode = {
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
  RERUN: 'RERUN',
};

const SnapshotRunStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

const TRANS_TYPE_IMPACT = {
  [InventoryTransType.RECEIPT]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.ISSUE]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.MOVE]: { dimFrom: true, dimTo: true, sign: 0 },
  [InventoryTransType.STATUS_CHANGE]: { dimFrom: true, dimTo: true, sign: 0 },
  [InventoryTransType.ADJUSTMENT]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.TRANSFER_ISSUE]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.TRANSFER_RECEIPT]: { dimFrom: false, dimTo: true, sign: 1 },
};

const REASON_REQUIRED_TRANS_TYPES = [
  InventoryTransType.ADJUSTMENT,
  InventoryTransType.STATUS_CHANGE,
];

module.exports = {
  InventoryTransType,
  InventoryStage,
  HoldStatus,
  SourceApp,
  ReconciliationRunType,
  ReconciliationScopeType,
  ReconciliationSeverity,
  ReconciliationResultStatus,
  SnapshotRunMode,
  SnapshotRunStatus,
  TRANS_TYPE_IMPACT,
  REASON_REQUIRED_TRANS_TYPES,
};
