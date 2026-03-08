/**
 * Module 3: Inventory Core Engine - Domain Types
 */

const InventoryTransType = {
  RECEIPT_IN: 'RECEIPT_IN',
  SHIPMENT_OUT: 'SHIPMENT_OUT',
  MOVE: 'MOVE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ADJUSTMENT: 'ADJUSTMENT',
  COUNT_GAIN: 'COUNT_GAIN',
  COUNT_LOSS: 'COUNT_LOSS',
  VAS_CONSUME: 'VAS_CONSUME',
  VAS_PRODUCE: 'VAS_PRODUCE',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
};

const InventoryStage = {
  PHYSICAL: 'PHYSICAL',
  EXPECTED: 'EXPECTED',
  ORDERED: 'ORDERED',
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
  [InventoryTransType.RECEIPT_IN]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.SHIPMENT_OUT]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.MOVE]: { dimFrom: true, dimTo: true, sign: 0 },
  [InventoryTransType.STATUS_CHANGE]: { dimFrom: true, dimTo: true, sign: 0 },
  [InventoryTransType.ADJUSTMENT]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.COUNT_GAIN]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.COUNT_LOSS]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.VAS_CONSUME]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.VAS_PRODUCE]: { dimFrom: false, dimTo: true, sign: 1 },
  [InventoryTransType.TRANSFER_OUT]: { dimFrom: true, dimTo: false, sign: -1 },
  [InventoryTransType.TRANSFER_IN]: { dimFrom: false, dimTo: true, sign: 1 },
};

const REASON_REQUIRED_TRANS_TYPES = [
  InventoryTransType.ADJUSTMENT,
  InventoryTransType.COUNT_GAIN,
  InventoryTransType.COUNT_LOSS,
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
