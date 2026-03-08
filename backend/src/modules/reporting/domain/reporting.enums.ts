export enum ExportJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum ExportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
}

export enum ReconciliationRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ReconciliationTriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export enum ReconciliationResultStatus {
  PASS = 'PASS',
  WARNING = 'WARNING',
  FAIL = 'FAIL',
}

export enum ReconciliationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ReconciliationResolutionAction {
  RESOLVED = 'RESOLVED',
  REOPENED = 'REOPENED',
  COMMENT = 'COMMENT',
}

export enum GoLiveGateType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum GoLiveMilestone {
  BEFORE_SIT = 'BEFORE_SIT',
  BEFORE_UAT = 'BEFORE_UAT',
  BEFORE_GO_LIVE = 'BEFORE_GO_LIVE',
}

export enum GoLiveGateStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WAIVED = 'WAIVED',
  PENDING = 'PENDING',
}

export enum ReportRunMode {
  SCREEN = 'SCREEN',
  EXPORT = 'EXPORT',
  API = 'API',
}

export enum ReportRunStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ReportGroup {
  INVENTORY = 'INVENTORY',
  BILLING = 'BILLING',
  AUDIT = 'AUDIT',
  DASHBOARD = 'DASHBOARD',
}

export enum WidgetCode {
  INBOUND_TODAY = 'INBOUND_TODAY',
  OUTBOUND_TODAY = 'OUTBOUND_TODAY',
  WORK_QUEUE = 'WORK_QUEUE',
  EXCEPTION_COUNT = 'EXCEPTION_COUNT',
  VAS_IN_PROGRESS = 'VAS_IN_PROGRESS',
  PENDING_DN = 'PENDING_DN',
  WEIGHBRIDGE_QUEUE = 'WEIGHBRIDGE_QUEUE',
  UTILIZATION = 'UTILIZATION',
}
