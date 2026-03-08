export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class WeighbridgeError extends IntegrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'WeighbridgeError';
  }
}

export class OcrError extends IntegrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'OcrError';
  }
}

export class MobileSyncError extends IntegrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'MobileSyncError';
  }
}

export class ErpPushError extends IntegrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'ErpPushError';
  }
}

export const IntegrationErrorCodes = {
  // Weighbridge
  DEVICE_NOT_FOUND: 'INT_WB_001',
  DEVICE_INACTIVE: 'INT_WB_002',
  DUPLICATE_WEIGH_EVENT: 'INT_WB_003',
  INVALID_WEIGHING_TYPE: 'INT_WB_004',
  MANUAL_ENTRY_REQUIRES_APPROVAL: 'INT_WB_005',
  WEIGH_EVENT_NOT_FOUND: 'INT_WB_006',
  CALLBACK_FAILED: 'INT_WB_007',

  // OCR
  OCR_UPLOAD_FAILED: 'INT_OCR_001',
  OCR_EXTRACTION_FAILED: 'INT_OCR_002',
  OCR_RESULT_NOT_FOUND: 'INT_OCR_003',
  OCR_INVALID_STATUS_TRANSITION: 'INT_OCR_004',
  OCR_ALREADY_CONFIRMED: 'INT_OCR_005',
  OCR_FILE_TOO_LARGE: 'INT_OCR_006',
  OCR_INVALID_FILE_TYPE: 'INT_OCR_007',

  // Mobile Sync
  DUPLICATE_BATCH: 'INT_SYNC_001',
  DUPLICATE_EVENT: 'INT_SYNC_002',
  BATCH_NOT_FOUND: 'INT_SYNC_003',
  EVENT_NOT_FOUND: 'INT_SYNC_004',
  INVALID_EVENT_TYPE: 'INT_SYNC_005',
  EVENT_CONFLICT: 'INT_SYNC_006',
  DISPATCH_FAILED: 'INT_SYNC_007',

  // ERP Push
  DUPLICATE_PUSH_JOB: 'INT_ERP_001',
  PUSH_JOB_NOT_FOUND: 'INT_ERP_002',
  INVALID_PUSH_STATUS: 'INT_ERP_003',
  MAX_RETRY_EXCEEDED: 'INT_ERP_004',
  ERP_CONNECTION_FAILED: 'INT_ERP_005',
  INVALID_PAYLOAD: 'INT_ERP_006',

  // Alert
  ALERT_NOT_FOUND: 'INT_ALERT_001',
  INVALID_ALERT_STATUS: 'INT_ALERT_002',
  RESOLUTION_NOTE_REQUIRED: 'INT_ALERT_003',
} as const;
