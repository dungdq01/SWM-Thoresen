export class ReportingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReportingError';
  }
}

export class ReportNotFoundError extends ReportingError {
  constructor(reportId: string) {
    super('RPT_NOT_FOUND', `Report not found: ${reportId}`, { reportId });
  }
}

export class ExportJobNotFoundError extends ReportingError {
  constructor(exportJobId: string) {
    super('EXPORT_JOB_NOT_FOUND', `Export job not found: ${exportJobId}`, { exportJobId });
  }
}

export class ExportJobExpiredError extends ReportingError {
  constructor(exportJobId: string) {
    super('EXPORT_JOB_EXPIRED', `Export job has expired: ${exportJobId}`, { exportJobId });
  }
}

export class ExportRowLimitExceededError extends ReportingError {
  constructor(estimatedRows: number, maxRows: number) {
    super('EXPORT_ROW_LIMIT_EXCEEDED', `Estimated rows (${estimatedRows}) exceeds max limit (${maxRows})`, { estimatedRows, maxRows });
  }
}

export class ReconciliationRunNotFoundError extends ReportingError {
  constructor(runId: string) {
    super('RECON_RUN_NOT_FOUND', `Reconciliation run not found: ${runId}`, { runId });
  }
}

export class ReconciliationResultNotFoundError extends ReportingError {
  constructor(resultId: string) {
    super('RECON_RESULT_NOT_FOUND', `Reconciliation result not found: ${resultId}`, { resultId });
  }
}

export class ReconciliationAlreadyResolvedError extends ReportingError {
  constructor(resultId: string) {
    super('RECON_ALREADY_RESOLVED', `Reconciliation result already resolved: ${resultId}`, { resultId });
  }
}

export class GoLiveGateNotFoundError extends ReportingError {
  constructor(gateId: string) {
    super('GOLIVE_GATE_NOT_FOUND', `Go-live gate not found: ${gateId}`, { gateId });
  }
}

export class GoLiveSignoffNotAllowedError extends ReportingError {
  constructor(gateId: string, reason: string) {
    super('GOLIVE_SIGNOFF_NOT_ALLOWED', `Sign-off not allowed for gate ${gateId}: ${reason}`, { gateId, reason });
  }
}

export class GoLiveWaiverRequiredError extends ReportingError {
  constructor(gateId: string) {
    super('GOLIVE_WAIVER_REQUIRED', `Waiver reason required for gate: ${gateId}`, { gateId });
  }
}

export class ScopeAccessDeniedError extends ReportingError {
  constructor(resource: string, scope: string) {
    super('SCOPE_ACCESS_DENIED', `Access denied to ${resource} for scope: ${scope}`, { resource, scope });
  }
}

export class DateRangeExceededError extends ReportingError {
  constructor(maxDays: number) {
    super('DATE_RANGE_EXCEEDED', `Date range exceeds maximum of ${maxDays} days`, { maxDays });
  }
}

export class InvalidFilterError extends ReportingError {
  constructor(field: string, reason: string) {
    super('INVALID_FILTER', `Invalid filter for ${field}: ${reason}`, { field, reason });
  }
}
