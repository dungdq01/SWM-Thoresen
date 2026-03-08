/**
 * Module 4: Inbound Operations - Domain Errors
 */

class InboundError extends Error {
  constructor(code, message, details = null, httpStatus = 400) {
    super(message);
    this.name = 'InboundError';
    this.code = code;
    this.details = details;
    this.httpStatus = httpStatus;
  }

  toJSON() {
    return {
      success: false,
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

const ERROR_CODES = {
  INVALID_STATE: 'INB-400-INVALID_STATE',
  INVALID_WEIGHT: 'INB-400-INVALID_WEIGHT',
  TOLERANCE_LOOKUP_FAIL: 'INB-400-TOLERANCE_LOOKUP_FAIL',
  BAGGED_OVER_RECEIPT: 'INB-422-BAGGED_OVER_RECEIPT',
  FORBIDDEN_ACTION: 'INB-403-FORBIDDEN_ACTION',
  RECEIPT_NOT_FOUND: 'INB-404-RECEIPT_NOT_FOUND',
  DUPLICATE_EXTERNAL_ID: 'INB-409-DUPLICATE_EXTERNAL_ID',
  DUPLICATE_WEIGHT_EVENT: 'INB-409-DUPLICATE_WEIGHT_EVENT',
  REWEIGH_LIMIT_REACHED: 'INB-409-REWEIGH_LIMIT_REACHED',
  ALREADY_POSTED: 'INB-409-ALREADY_POSTED',
  MASTER_REFERENCE_INVALID: 'INB-422-MASTER_REFERENCE_INVALID',
  M3_POSTING_UNAVAILABLE: 'INB-503-M3_POSTING_UNAVAILABLE',
  M7_HANDOFF_UNAVAILABLE: 'INB-503-M7_HANDOFF_UNAVAILABLE',
  VALIDATION_ERROR: 'INB-400-VALIDATION_ERROR',
  LINE_REQUIRED: 'INB-400-LINE_REQUIRED',
  LOCATION_TYPE_INVALID: 'INB-422-LOCATION_TYPE_INVALID',
};

function createInvalidStateError(currentStatus, action) {
  return new InboundError(
    ERROR_CODES.INVALID_STATE,
    `Không thể thực hiện action "${action}" khi receipt đang ở trạng thái "${currentStatus}"`,
    { currentStatus, action },
    400
  );
}

function createReceiptNotFoundError(receiptId) {
  return new InboundError(
    ERROR_CODES.RECEIPT_NOT_FOUND,
    `Không tìm thấy receipt với ID: ${receiptId}`,
    { receiptId },
    404
  );
}

function createDuplicateExternalIdError(externalId) {
  return new InboundError(
    ERROR_CODES.DUPLICATE_EXTERNAL_ID,
    `External ID đã tồn tại: ${externalId}`,
    { externalId },
    409
  );
}

function createDuplicateWeightEventError(eventId) {
  return new InboundError(
    ERROR_CODES.DUPLICATE_WEIGHT_EVENT,
    `Weight event đã được xử lý: ${eventId}`,
    { eventId },
    409
  );
}

function createReweighLimitError(attemptNumber) {
  return new InboundError(
    ERROR_CODES.REWEIGH_LIMIT_REACHED,
    `Đã vượt quá số lần reweigh cho phép (tối đa 3 lần). Attempt hiện tại: ${attemptNumber}`,
    { attemptNumber, maxAttempts: 3 },
    409
  );
}

function createInvalidWeightError(message, details = {}) {
  return new InboundError(
    ERROR_CODES.INVALID_WEIGHT,
    message,
    details,
    400
  );
}

function createMasterReferenceError(entity, id) {
  return new InboundError(
    ERROR_CODES.MASTER_REFERENCE_INVALID,
    `${entity} không hợp lệ hoặc không active: ${id}`,
    { entity, id },
    422
  );
}

function createLocationTypeError(locationType) {
  return new InboundError(
    ERROR_CODES.LOCATION_TYPE_INVALID,
    `Location type phải là RECEIVING, nhưng hiện tại là: ${locationType}`,
    { locationType, expected: 'RECEIVING' },
    422
  );
}

function createToleranceLookupError(ownerId, itemId) {
  return new InboundError(
    ERROR_CODES.TOLERANCE_LOOKUP_FAIL,
    `Không thể tìm tolerance cho owner: ${ownerId}, item: ${itemId}`,
    { ownerId, itemId },
    400
  );
}

module.exports = {
  InboundError,
  ERROR_CODES,
  createInvalidStateError,
  createReceiptNotFoundError,
  createDuplicateExternalIdError,
  createDuplicateWeightEventError,
  createReweighLimitError,
  createInvalidWeightError,
  createMasterReferenceError,
  createLocationTypeError,
  createToleranceLookupError,
};
