/**
 * Module 10: Billing & Commercial Control - Error Definitions
 */

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

export const BillingErrorCodes = {
  // Contract errors
  CONTRACT_NOT_FOUND: 'BIL-CONTRACT-NOT-FOUND-404',
  CONTRACT_OVERLAP: 'BIL-CONTRACT-OVERLAP-409',
  CONTRACT_INVALID_DATE_RANGE: 'BIL-CONTRACT-INVALID-DATE-RANGE-422',
  CONTRACT_ALREADY_ACTIVE: 'BIL-CONTRACT-ALREADY-ACTIVE-409',
  CONTRACT_EXTERNAL_ID_EXISTS: 'BIL-CONTRACT-EXTERNAL-ID-EXISTS-409',

  // Fee Line errors
  FEE_LINE_INVALID_RATE: 'BIL-FEE-LINE-INVALID-RATE-422',
  FEE_LINE_INVALID_FREE_DAYS: 'BIL-FEE-LINE-INVALID-FREE-DAYS-422',

  // Day Type errors
  DAY_TYPE_NOT_FOUND: 'BIL-DAY-TYPE-NOT-FOUND-404',

  // Event errors
  EVENT_NOT_FOUND: 'BIL-EVENT-NOT-FOUND-404',
  EVENT_DUPLICATE: 'BIL-EVENT-DUPLICATE-409',
  EVENT_ALREADY_BILLED: 'BIL-EVENT-ALREADY-BILLED-409',

  // Rate errors
  RATE_NOT_FOUND: 'BIL-RATE-NOT-FOUND-422',
  RATE_MISSING: 'BIL-RATE-MISSING-422',

  // Snapshot errors
  SNAPSHOT_NOT_FOUND: 'BIL-SNAPSHOT-NOT-FOUND-404',
  SNAPSHOT_RUN_FAILED: 'BIL-SNAPSHOT-RUN-FAILED-500',
  SNAPSHOT_ALREADY_EXISTS: 'BIL-SNAPSHOT-ALREADY-EXISTS-409',

  // Debit Note errors
  DN_NOT_FOUND: 'BIL-DN-NOT-FOUND-404',
  DN_INVALID_STATE: 'BIL-DN-INVALID-STATE-409',
  DN_LOCKED_IMMUTABLE: 'BIL-DN-LOCKED-IMMUTABLE-409',
  DN_LOCK_FORBIDDEN: 'BIL-DN-LOCK-FORBIDDEN-403',
  DN_EXTERNAL_ID_EXISTS: 'BIL-DN-EXTERNAL-ID-EXISTS-409',
  DN_NO_CHARGES: 'BIL-DN-NO-CHARGES-422',
  DN_SNAPSHOT_NOT_READY: 'BIL-DN-SNAPSHOT-NOT-READY-422',
  DN_BLOCKER_EXCEPTION: 'BIL-DN-BLOCKER-EXCEPTION-422',

  // Exception errors
  EXCEPTION_NOT_FOUND: 'BIL-EXCEPTION-NOT-FOUND-404',
  EXCEPTION_ALREADY_RESOLVED: 'BIL-EXCEPTION-ALREADY-RESOLVED-409',

  // ERP Push errors
  ERP_PUSH_NOT_ALLOWED: 'BIL-ERP-PUSH-NOT-ALLOWED-409',
  ERP_PUSH_FAILED: 'BIL-ERP-PUSH-FAILED-500',

  // General errors
  OWNER_NOT_FOUND: 'BIL-OWNER-NOT-FOUND-404',
  WAREHOUSE_NOT_FOUND: 'BIL-WAREHOUSE-NOT-FOUND-404',
  ITEM_NOT_FOUND: 'BIL-ITEM-NOT-FOUND-404',
  INVALID_PERIOD: 'BIL-INVALID-PERIOD-422',
  EXTERNAL_ID_REPLAY: 'BIL-EXTERNAL-ID-REPLAY-200',
} as const;

export function createBillingError(
  code: keyof typeof BillingErrorCodes,
  details?: Record<string, unknown>,
): BillingError {
  const errorCode = BillingErrorCodes[code];
  const messages: Record<string, string> = {
    CONTRACT_NOT_FOUND: 'Contract not found',
    CONTRACT_OVERLAP: 'Contract date range overlaps with existing active contract',
    CONTRACT_INVALID_DATE_RANGE: 'Invalid contract date range: effectiveFrom must be <= effectiveTo',
    CONTRACT_ALREADY_ACTIVE: 'Contract is already active',
    CONTRACT_EXTERNAL_ID_EXISTS: 'Contract with this external ID already exists',
    FEE_LINE_INVALID_RATE: 'Fee line unit rate must be >= 0',
    FEE_LINE_INVALID_FREE_DAYS: 'Fee line free days must be >= 0',
    DAY_TYPE_NOT_FOUND: 'Day type calendar entry not found',
    EVENT_NOT_FOUND: 'Billing event not found',
    EVENT_DUPLICATE: 'Duplicate billing event',
    EVENT_ALREADY_BILLED: 'Event has already been billed',
    RATE_NOT_FOUND: 'Rate not found for this combination',
    RATE_MISSING: 'Rate missing for billing calculation',
    SNAPSHOT_NOT_FOUND: 'Snapshot not found',
    SNAPSHOT_RUN_FAILED: 'Snapshot run failed',
    SNAPSHOT_ALREADY_EXISTS: 'Snapshot already exists for this date/scope',
    DN_NOT_FOUND: 'Debit note not found',
    DN_INVALID_STATE: 'Invalid debit note state transition',
    DN_LOCKED_IMMUTABLE: 'Locked debit note cannot be modified',
    DN_LOCK_FORBIDDEN: 'Not authorized to lock debit note',
    DN_EXTERNAL_ID_EXISTS: 'Debit note with this external ID already exists',
    DN_NO_CHARGES: 'No charges found for debit note generation',
    DN_SNAPSHOT_NOT_READY: 'Snapshot not ready for billing period',
    DN_BLOCKER_EXCEPTION: 'Blocker exception exists for this debit note',
    EXCEPTION_NOT_FOUND: 'Billing exception not found',
    EXCEPTION_ALREADY_RESOLVED: 'Exception has already been resolved',
    ERP_PUSH_NOT_ALLOWED: 'ERP push not allowed in current state',
    ERP_PUSH_FAILED: 'ERP push failed',
    OWNER_NOT_FOUND: 'Owner not found',
    WAREHOUSE_NOT_FOUND: 'Warehouse not found',
    ITEM_NOT_FOUND: 'Item not found',
    INVALID_PERIOD: 'Invalid billing period',
    EXTERNAL_ID_REPLAY: 'Request is a replay of existing external ID',
  };

  return new BillingError(errorCode, messages[code] || code, details);
}
