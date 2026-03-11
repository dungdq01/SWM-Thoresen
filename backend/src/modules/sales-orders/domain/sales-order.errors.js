/**
 * Sales Orders Module - Domain Errors
 */

class SalesOrderError extends Error {
  constructor(code, message, details = null, httpStatus = 400) {
    super(message);
    this.name = 'SalesOrderError';
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
  NOT_FOUND: 'SO_001',
  INVALID_STATE: 'SO_002',
  NO_LINES: 'SO_003',
  DUPLICATE_EXTERNAL_ID: 'SO_004',
  NOT_DRAFT: 'SO_005',
  HAS_SHIPMENTS: 'SO_006',
  BLOCKING_EXCEEDED: 'SO_007',
  MASTER_REF_INVALID: 'SO_008',
  NOT_SHIPPED: 'SO_009',
  OPTIMISTIC_LOCK: 'SO_010',
  VALIDATION_ERROR: 'SO_400',
};

function createNotFoundError(soId) {
  return new SalesOrderError(
    ERROR_CODES.NOT_FOUND,
    `Không tìm thấy Sales Order: ${soId}`,
    { soId },
    404
  );
}

function createInvalidStateError(currentStatus, action) {
  return new SalesOrderError(
    ERROR_CODES.INVALID_STATE,
    `Không thể thực hiện "${action}" khi SO đang ở trạng thái "${currentStatus}"`,
    { currentStatus, action },
    409
  );
}

function createNoLinesError() {
  return new SalesOrderError(
    ERROR_CODES.NO_LINES,
    'Sales Order phải có ít nhất 1 line',
    null,
    400
  );
}

function createDuplicateExternalIdError(externalId, existingId) {
  return new SalesOrderError(
    ERROR_CODES.DUPLICATE_EXTERNAL_ID,
    `External ID đã tồn tại: ${externalId}`,
    { externalId, existingId },
    409
  );
}

function createNotDraftError(currentStatus) {
  return new SalesOrderError(
    ERROR_CODES.NOT_DRAFT,
    `Chỉ có thể cập nhật SO ở trạng thái DRAFT. Hiện tại: ${currentStatus}`,
    { currentStatus },
    409
  );
}

function createHasShipmentsError(soId, shipmentCount) {
  return new SalesOrderError(
    ERROR_CODES.HAS_SHIPMENTS,
    `Không thể cancel SO đã có ${shipmentCount} shipment(s). Hãy cancel hết shipments trước.`,
    { soId, shipmentCount },
    409
  );
}

function createBlockingExceededError(lineNumber, itemCode, remaining, requested) {
  return new SalesOrderError(
    ERROR_CODES.BLOCKING_EXCEEDED,
    `Line ${lineNumber} (${itemCode}): qty release ${requested} kg vượt quá remaining ${remaining} kg`,
    { lineNumber, itemCode, remaining, requested },
    400
  );
}

function createMasterRefError(entity, id) {
  return new SalesOrderError(
    ERROR_CODES.MASTER_REF_INVALID,
    `${entity} không hợp lệ hoặc không active: ${id}`,
    { entity, id },
    400
  );
}

function createNotShippedError(soId, activeShipments) {
  return new SalesOrderError(
    ERROR_CODES.NOT_SHIPPED,
    `Không thể close SO — còn ${activeShipments} shipment(s) chưa SHIPPED`,
    { soId, activeShipments },
    409
  );
}

function createOptimisticLockError() {
  return new SalesOrderError(
    ERROR_CODES.OPTIMISTIC_LOCK,
    'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại và thử lại.',
    null,
    409
  );
}

module.exports = {
  SalesOrderError,
  ERROR_CODES,
  createNotFoundError,
  createInvalidStateError,
  createNoLinesError,
  createDuplicateExternalIdError,
  createNotDraftError,
  createHasShipmentsError,
  createBlockingExceededError,
  createMasterRefError,
  createNotShippedError,
  createOptimisticLockError,
};
