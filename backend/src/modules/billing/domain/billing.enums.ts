/**
 * Module 10: Billing & Commercial Control - Enums
 */

export enum BilContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum BilFeeType {
  STORAGE = 'STORAGE',
  HANDLING_INBOUND = 'HANDLING_INBOUND',
  HANDLING_OUTBOUND = 'HANDLING_OUTBOUND',
  BAGGING = 'BAGGING',
  STUFFING = 'STUFFING',
}

export enum BilDayType {
  WORKING_DAY = 'WORKING_DAY',
  DAY_OFF = 'DAY_OFF',
  HOLIDAY = 'HOLIDAY',
}

export enum BilEventType {
  INBOUND_HANDLING = 'INBOUND_HANDLING',
  OUTBOUND_HANDLING = 'OUTBOUND_HANDLING',
  BAGGING_FEE = 'BAGGING_FEE',
  STORAGE = 'STORAGE',
}

export enum BilEventRateStatus {
  UNRESOLVED = 'UNRESOLVED',
  RESOLVED = 'RESOLVED',
  MISSING = 'MISSING',
  BLOCKED = 'BLOCKED',
}

export enum BilEventBillingStatus {
  CAPTURED = 'CAPTURED',
  BILLED = 'BILLED',
  UNBILLED = 'UNBILLED',
  IGNORED = 'IGNORED',
}

export enum BilSnapshotRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum BilDebitNoteStatus {
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
}

export enum BilErpPushStatus {
  NOT_SENT = 'NOT_SENT',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum BilExceptionType {
  MISSING_RATE = 'MISSING_RATE',
  DUP_EVENT = 'DUP_EVENT',
  ORPHAN_EVENT = 'ORPHAN_EVENT',
  LATE_EVENT = 'LATE_EVENT',
  SNAPSHOT_FAIL = 'SNAPSHOT_FAIL',
  ERP_FAIL = 'ERP_FAIL',
  DATA_MISMATCH = 'DATA_MISMATCH',
}

export enum BilExceptionSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  BLOCKER = 'BLOCKER',
}

export enum BilExceptionStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

export enum BilOutboxStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEAD = 'DEAD',
}

export enum BilDnActionCode {
  GENERATED = 'GENERATED',
  REGENERATED = 'REGENERATED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
  EXPORT = 'EXPORT',
  ERP_RETRY = 'ERP_RETRY',
}

export const BIL_DEFAULT_VAT_RATE = 0.1;
export const BIL_DEFAULT_CURRENCY = 'VND';
