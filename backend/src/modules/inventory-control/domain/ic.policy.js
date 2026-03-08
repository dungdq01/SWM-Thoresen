/**
 * Module 6: Inventory Control - Domain Policies
 * Business rules và validation logic
 */

const {
  IcMoveOrderStatus,
  IcTransferOrderStatus,
  IcStatusChangeStatus,
  IcCycleCountStatus,
  IcAdjustmentStatus,
  IcReconciliationStatus,
} = require('./ic.enums');

const MOVE_ORDER_TRANSITIONS = {
  [IcMoveOrderStatus.DRAFT]: [IcMoveOrderStatus.CONFIRMED, IcMoveOrderStatus.CANCELLED],
  [IcMoveOrderStatus.CONFIRMED]: [IcMoveOrderStatus.IN_PROGRESS, IcMoveOrderStatus.CANCELLED],
  [IcMoveOrderStatus.IN_PROGRESS]: [IcMoveOrderStatus.COMPLETED, IcMoveOrderStatus.FAILED],
  [IcMoveOrderStatus.COMPLETED]: [],
  [IcMoveOrderStatus.CANCELLED]: [],
  [IcMoveOrderStatus.FAILED]: [IcMoveOrderStatus.IN_PROGRESS],
};

const TRANSFER_ORDER_TRANSITIONS = {
  [IcTransferOrderStatus.CREATED]: [IcTransferOrderStatus.RELEASED, IcTransferOrderStatus.CANCELLED],
  [IcTransferOrderStatus.RELEASED]: [IcTransferOrderStatus.SHIPPED, IcTransferOrderStatus.CANCELLED],
  [IcTransferOrderStatus.SHIPPED]: [IcTransferOrderStatus.IN_TRANSIT],
  [IcTransferOrderStatus.IN_TRANSIT]: [IcTransferOrderStatus.PARTIALLY_RECEIVED, IcTransferOrderStatus.RECEIVED, IcTransferOrderStatus.FAILED],
  [IcTransferOrderStatus.PARTIALLY_RECEIVED]: [IcTransferOrderStatus.RECEIVED, IcTransferOrderStatus.FAILED],
  [IcTransferOrderStatus.RECEIVED]: [IcTransferOrderStatus.CLOSED],
  [IcTransferOrderStatus.CLOSED]: [],
  [IcTransferOrderStatus.CANCELLED]: [],
  [IcTransferOrderStatus.FAILED]: [IcTransferOrderStatus.IN_TRANSIT],
};

const STATUS_CHANGE_TRANSITIONS = {
  [IcStatusChangeStatus.CREATED]: [IcStatusChangeStatus.POSTED, IcStatusChangeStatus.CANCELLED, IcStatusChangeStatus.FAILED],
  [IcStatusChangeStatus.POSTED]: [IcStatusChangeStatus.REVERSED],
  [IcStatusChangeStatus.REVERSED]: [],
  [IcStatusChangeStatus.FAILED]: [IcStatusChangeStatus.CREATED],
  [IcStatusChangeStatus.CANCELLED]: [],
};

const CYCLE_COUNT_TRANSITIONS = {
  [IcCycleCountStatus.CREATED]: [IcCycleCountStatus.RELEASED, IcCycleCountStatus.CANCELLED],
  [IcCycleCountStatus.RELEASED]: [IcCycleCountStatus.COUNTING, IcCycleCountStatus.CANCELLED],
  [IcCycleCountStatus.COUNTING]: [IcCycleCountStatus.SUBMITTED, IcCycleCountStatus.CANCELLED],
  [IcCycleCountStatus.SUBMITTED]: [IcCycleCountStatus.APPROVED, IcCycleCountStatus.COUNTING],
  [IcCycleCountStatus.APPROVED]: [IcCycleCountStatus.POSTED],
  [IcCycleCountStatus.POSTED]: [],
  [IcCycleCountStatus.CANCELLED]: [],
};

const ADJUSTMENT_TRANSITIONS = {
  [IcAdjustmentStatus.DRAFT]: [IcAdjustmentStatus.SUBMITTED, IcAdjustmentStatus.CANCELLED],
  [IcAdjustmentStatus.SUBMITTED]: [IcAdjustmentStatus.APPROVED, IcAdjustmentStatus.DRAFT, IcAdjustmentStatus.CANCELLED],
  [IcAdjustmentStatus.APPROVED]: [IcAdjustmentStatus.POSTED, IcAdjustmentStatus.FAILED],
  [IcAdjustmentStatus.POSTED]: [],
  [IcAdjustmentStatus.CANCELLED]: [],
  [IcAdjustmentStatus.FAILED]: [IcAdjustmentStatus.APPROVED],
};

const RECONCILIATION_TRANSITIONS = {
  [IcReconciliationStatus.OPEN]: [IcReconciliationStatus.INVESTIGATING, IcReconciliationStatus.RESOLVED, IcReconciliationStatus.CLOSED],
  [IcReconciliationStatus.INVESTIGATING]: [IcReconciliationStatus.RESOLVED, IcReconciliationStatus.CLOSED],
  [IcReconciliationStatus.RESOLVED]: [IcReconciliationStatus.CLOSED],
  [IcReconciliationStatus.CLOSED]: [],
};

const ALLOWED_STATUS_CHANGE_MATRIX = {
  AVAILABLE: ['BLOCKED', 'DAMAGED', 'QC_HOLD'],
  BLOCKED: ['AVAILABLE', 'DAMAGED'],
  DAMAGED: ['AVAILABLE', 'BLOCKED', 'SCRAPPED'],
  QC_HOLD: ['AVAILABLE', 'BLOCKED', 'DAMAGED'],
  SCRAPPED: [],
  IN_TRANSIT: [],
};

function canTransitionMoveOrder(fromStatus, toStatus) {
  const allowed = MOVE_ORDER_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function canTransitionTransferOrder(fromStatus, toStatus) {
  const allowed = TRANSFER_ORDER_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function canTransitionStatusChange(fromStatus, toStatus) {
  const allowed = STATUS_CHANGE_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function canTransitionCycleCount(fromStatus, toStatus) {
  const allowed = CYCLE_COUNT_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function canTransitionAdjustment(fromStatus, toStatus) {
  const allowed = ADJUSTMENT_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function canTransitionReconciliation(fromStatus, toStatus) {
  const allowed = RECONCILIATION_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function isStatusChangeAllowed(fromInventoryStatus, toInventoryStatus) {
  const allowed = ALLOWED_STATUS_CHANGE_MATRIX[fromInventoryStatus] || [];
  return allowed.includes(toInventoryStatus);
}

function validateMoveOrderLines(lines, warehouseId) {
  const errors = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.itemId) {
      errors.push({ lineNo: i + 1, field: 'itemId', message: 'Item is required' });
    }
    if (!line.ownerId) {
      errors.push({ lineNo: i + 1, field: 'ownerId', message: 'Owner is required' });
    }
    if (!line.fromLocationId) {
      errors.push({ lineNo: i + 1, field: 'fromLocationId', message: 'From location is required' });
    }
    if (!line.toLocationId) {
      errors.push({ lineNo: i + 1, field: 'toLocationId', message: 'To location is required' });
    }
    if (line.fromLocationId === line.toLocationId) {
      errors.push({ lineNo: i + 1, field: 'toLocationId', message: 'Source and destination must be different' });
    }
    if (!line.requestedQty || parseFloat(line.requestedQty) <= 0) {
      errors.push({ lineNo: i + 1, field: 'requestedQty', message: 'Quantity must be greater than 0' });
    }
    if (line.inventoryStatus === 'IN_TRANSIT') {
      errors.push({ lineNo: i + 1, field: 'inventoryStatus', message: 'Cannot use IN_TRANSIT status for move' });
    }
  }
  
  return errors;
}

function validateTransferOrderLines(lines, fromWarehouseId, toWarehouseId) {
  const errors = [];
  
  if (fromWarehouseId === toWarehouseId) {
    errors.push({ field: 'toWarehouseId', message: 'Source and destination warehouse must be different' });
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.itemId) {
      errors.push({ lineNo: i + 1, field: 'itemId', message: 'Item is required' });
    }
    if (!line.ownerId) {
      errors.push({ lineNo: i + 1, field: 'ownerId', message: 'Owner is required' });
    }
    if (!line.fromLocationId) {
      errors.push({ lineNo: i + 1, field: 'fromLocationId', message: 'From location is required' });
    }
    if (!line.requestedQty || parseFloat(line.requestedQty) <= 0) {
      errors.push({ lineNo: i + 1, field: 'requestedQty', message: 'Quantity must be greater than 0' });
    }
  }
  
  return errors;
}

function validateAdjustmentLines(lines) {
  const errors = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.itemId) {
      errors.push({ lineNo: i + 1, field: 'itemId', message: 'Item is required' });
    }
    if (!line.ownerId) {
      errors.push({ lineNo: i + 1, field: 'ownerId', message: 'Owner is required' });
    }
    if (!line.locationId) {
      errors.push({ lineNo: i + 1, field: 'locationId', message: 'Location is required' });
    }
    if (line.qtyDelta === undefined || line.qtyDelta === null || parseFloat(line.qtyDelta) === 0) {
      errors.push({ lineNo: i + 1, field: 'qtyDelta', message: 'Quantity delta must be non-zero' });
    }
    if (!line.reasonCode) {
      errors.push({ lineNo: i + 1, field: 'reasonCode', message: 'Reason code is required' });
    }
  }
  
  return errors;
}

function calculateVariance(systemQty, countedQty) {
  const system = parseFloat(systemQty) || 0;
  const counted = parseFloat(countedQty) || 0;
  const varianceQty = counted - system;
  const variancePct = system !== 0 ? (varianceQty / system) * 100 : (counted !== 0 ? 100 : 0);
  
  return {
    varianceQty: varianceQty.toFixed(3),
    variancePct: variancePct.toFixed(4),
  };
}

function shouldRecount(variancePct, thresholdPct) {
  return Math.abs(parseFloat(variancePct)) > parseFloat(thresholdPct);
}

function determineAdjustmentType(lines) {
  let hasIncrease = false;
  let hasDecrease = false;
  
  for (const line of lines) {
    const delta = parseFloat(line.qtyDelta);
    if (delta > 0) hasIncrease = true;
    if (delta < 0) hasDecrease = true;
  }
  
  if (hasIncrease && hasDecrease) return 'MIXED';
  if (hasIncrease) return 'INCREASE';
  if (hasDecrease) return 'DECREASE';
  return 'MIXED';
}

module.exports = {
  MOVE_ORDER_TRANSITIONS,
  TRANSFER_ORDER_TRANSITIONS,
  STATUS_CHANGE_TRANSITIONS,
  CYCLE_COUNT_TRANSITIONS,
  ADJUSTMENT_TRANSITIONS,
  RECONCILIATION_TRANSITIONS,
  ALLOWED_STATUS_CHANGE_MATRIX,
  canTransitionMoveOrder,
  canTransitionTransferOrder,
  canTransitionStatusChange,
  canTransitionCycleCount,
  canTransitionAdjustment,
  canTransitionReconciliation,
  isStatusChangeAllowed,
  validateMoveOrderLines,
  validateTransferOrderLines,
  validateAdjustmentLines,
  calculateVariance,
  shouldRecount,
  determineAdjustmentType,
};
