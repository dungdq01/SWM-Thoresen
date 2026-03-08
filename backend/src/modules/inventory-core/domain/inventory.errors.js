/**
 * Module 3: Inventory Core Engine - Domain Errors
 */

class InventoryError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
    this.details = details;
  }
}

const InventoryErrorCodes = {
  DUPLICATE_EXTERNAL_ID: 'INV_DUPLICATE_EXTERNAL_ID',
  IDEMPOTENCY_CONFLICT: 'INV_IDEMPOTENCY_CONFLICT',
  INVALID_EVENT_CODE: 'INV_INVALID_EVENT_CODE',
  INVALID_DIMENSION: 'INV_INVALID_DIMENSION',
  MASTER_INACTIVE: 'INV_MASTER_INACTIVE',
  INSUFFICIENT_STOCK: 'INV_INSUFFICIENT_STOCK',
  NEGATIVE_STOCK_BLOCKED: 'INV_NEGATIVE_STOCK_BLOCKED',
  REVERSAL_NOT_ALLOWED: 'INV_REVERSAL_NOT_ALLOWED',
  ALREADY_REVERSED: 'INV_ALREADY_REVERSED',
  HOLD_NOT_FOUND: 'INV_HOLD_NOT_FOUND',
  HOLD_INSUFFICIENT_QTY: 'INV_HOLD_INSUFFICIENT_QTY',
  LOCK_TIMEOUT: 'INV_LOCK_TIMEOUT',
  RECON_SCOPE_INVALID: 'INV_RECON_SCOPE_INVALID',
  SNAPSHOT_VERSION_CONFLICT: 'INV_SNAPSHOT_VERSION_CONFLICT',
  TRANS_NOT_FOUND: 'INV_TRANS_NOT_FOUND',
  REASON_CODE_REQUIRED: 'INV_REASON_CODE_REQUIRED',
  ONHAND_NOT_FOUND: 'INV_ONHAND_NOT_FOUND',
  ITEM_NOT_FOUND: 'INV_ITEM_NOT_FOUND',
  UOM_NOT_FOUND: 'INV_UOM_NOT_FOUND',
  WAREHOUSE_NOT_FOUND: 'INV_WAREHOUSE_NOT_FOUND',
  LOCATION_NOT_FOUND: 'INV_LOCATION_NOT_FOUND',
  OWNER_NOT_FOUND: 'INV_OWNER_NOT_FOUND',
  STATUS_NOT_FOUND: 'INV_STATUS_NOT_FOUND',
  STATUS_NOT_ALLOCATABLE: 'INV_STATUS_NOT_ALLOCATABLE',
};

function createInventoryError(code, message, details = null) {
  return new InventoryError(code, message, details);
}

function duplicateExternalIdError(externalId, transType) {
  return createInventoryError(
    InventoryErrorCodes.DUPLICATE_EXTERNAL_ID,
    `Duplicate external_id: ${externalId} for trans_type: ${transType}`,
    { externalId, transType }
  );
}

function insufficientStockError(itemId, availableQty, requestedQty) {
  return createInventoryError(
    InventoryErrorCodes.INSUFFICIENT_STOCK,
    'Insufficient available stock for allocation/posting',
    { itemId, availableQty: String(availableQty), requestedQty: String(requestedQty) }
  );
}

function negativeStockBlockedError(itemId, currentQty, changeQty) {
  return createInventoryError(
    InventoryErrorCodes.NEGATIVE_STOCK_BLOCKED,
    'Operation would result in negative stock which is not allowed',
    { itemId, currentQty: String(currentQty), changeQty: String(changeQty) }
  );
}

function invalidEventCodeError(eventCode) {
  return createInventoryError(
    InventoryErrorCodes.INVALID_EVENT_CODE,
    `Invalid or inactive event_code: ${eventCode}`,
    { eventCode }
  );
}

function masterInactiveError(entityType, entityId) {
  return createInventoryError(
    InventoryErrorCodes.MASTER_INACTIVE,
    `${entityType} is inactive or not found`,
    { entityType, entityId }
  );
}

function reasonCodeRequiredError(transType) {
  return createInventoryError(
    InventoryErrorCodes.REASON_CODE_REQUIRED,
    `Reason code is required for trans_type: ${transType}`,
    { transType }
  );
}

function transNotFoundError(transId) {
  return createInventoryError(
    InventoryErrorCodes.TRANS_NOT_FOUND,
    `Transaction not found: ${transId}`,
    { transId }
  );
}

function alreadyReversedError(transId) {
  return createInventoryError(
    InventoryErrorCodes.ALREADY_REVERSED,
    `Transaction already reversed: ${transId}`,
    { transId }
  );
}

function holdNotFoundError(holdId) {
  return createInventoryError(
    InventoryErrorCodes.HOLD_NOT_FOUND,
    `Hold not found: ${holdId}`,
    { holdId }
  );
}

function statusNotAllocatableError(statusCode) {
  return createInventoryError(
    InventoryErrorCodes.STATUS_NOT_ALLOCATABLE,
    `Status is not allocatable: ${statusCode}`,
    { statusCode }
  );
}

module.exports = {
  InventoryError,
  InventoryErrorCodes,
  createInventoryError,
  duplicateExternalIdError,
  insufficientStockError,
  negativeStockBlockedError,
  invalidEventCodeError,
  masterInactiveError,
  reasonCodeRequiredError,
  transNotFoundError,
  alreadyReversedError,
  holdNotFoundError,
  statusNotAllocatableError,
};
