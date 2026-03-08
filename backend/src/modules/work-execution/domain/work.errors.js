/**
 * Module 7: Work Execution - Error Definitions
 */

const { DomainError } = require('../../../shared/errors/DomainError');

const WORK_ERROR_CODES = {
  WORK_NOT_FOUND: 'WE-404-001',
  WORK_LINE_NOT_FOUND: 'WE-404-002',
  WORK_ALREADY_CLAIMED: 'WE-409-001',
  INVALID_STATE_TRANSITION: 'WE-409-002',
  WORK_ALREADY_COMPLETED: 'WE-409-003',
  DUPLICATE_EXTERNAL_ID: 'WE-409-004',
  INVALID_SCANNED_LOCATION: 'WE-422-001',
  LOCATION_TYPE_NOT_ALLOWED: 'WE-422-002',
  ACTUAL_QUANTITY_INVALID: 'WE-422-003',
  SHORT_PICK_THRESHOLD_EXCEEDED: 'WE-422-004',
  MANAGER_EVIDENCE_REQUIRED: 'WE-422-005',
  WORK_LOCKED: 'WE-423-001',
  INVENTORY_POSTING_FAILED: 'WE-500-001',
  CALLBACK_DELIVERY_FAILED: 'WE-500-002',
  SYNC_BATCH_PROCESSING_FAILED: 'WE-500-003',
  NOT_ASSIGNED: 'WE-403-001',
  NOT_AUTHORIZED: 'WE-403-002',
  WORK_NOT_CLAIMED: 'WE-409-005',
  LINE_NOT_STARTED: 'WE-409-006',
  REASON_CODE_REQUIRED: 'WE-422-006',
};

class WorkNotFoundError extends DomainError {
  constructor(workId) {
    super(`Work not found: ${workId}`, WORK_ERROR_CODES.WORK_NOT_FOUND, { workId });
  }
}

class WorkLineNotFoundError extends DomainError {
  constructor(workId, lineNum) {
    super(`Work line not found: ${workId} line ${lineNum}`, WORK_ERROR_CODES.WORK_LINE_NOT_FOUND, { workId, lineNum });
  }
}

class WorkAlreadyClaimedError extends DomainError {
  constructor(workId, assignedTo) {
    super(`Work ${workId} already claimed by ${assignedTo}`, WORK_ERROR_CODES.WORK_ALREADY_CLAIMED, { workId, assignedTo });
  }
}

class InvalidStateTransitionError extends DomainError {
  constructor(objectType, objectId, fromStatus, toStatus, action) {
    super(
      `Invalid state transition for ${objectType} ${objectId}: ${fromStatus} -> ${toStatus} via ${action}`,
      WORK_ERROR_CODES.INVALID_STATE_TRANSITION,
      { objectType, objectId, fromStatus, toStatus, action }
    );
  }
}

class WorkAlreadyCompletedError extends DomainError {
  constructor(workId) {
    super(`Work ${workId} is already completed`, WORK_ERROR_CODES.WORK_ALREADY_COMPLETED, { workId });
  }
}

class DuplicateExternalIdError extends DomainError {
  constructor(externalId) {
    super(`Duplicate external ID: ${externalId}`, WORK_ERROR_CODES.DUPLICATE_EXTERNAL_ID, { externalId });
    this.isIdempotent = true;
  }
}

class InvalidScannedLocationError extends DomainError {
  constructor(locationCode, reason) {
    super(`Invalid scanned location ${locationCode}: ${reason}`, WORK_ERROR_CODES.INVALID_SCANNED_LOCATION, { locationCode, reason });
  }
}

class LocationTypeNotAllowedError extends DomainError {
  constructor(locationCode, locationType, expectedTypes) {
    super(
      `Location ${locationCode} has type ${locationType}, expected: ${expectedTypes.join(', ')}`,
      WORK_ERROR_CODES.LOCATION_TYPE_NOT_ALLOWED,
      { locationCode, locationType, expectedTypes }
    );
  }
}

class ActualQuantityInvalidError extends DomainError {
  constructor(actualQty, reason) {
    super(`Invalid actual quantity ${actualQty}: ${reason}`, WORK_ERROR_CODES.ACTUAL_QUANTITY_INVALID, { actualQty, reason });
  }
}

class ShortPickThresholdExceededError extends DomainError {
  constructor(expectedQty, actualQty, variancePct, thresholdPct) {
    super(
      `Short pick variance ${variancePct.toFixed(2)}% exceeds threshold ${thresholdPct}%`,
      WORK_ERROR_CODES.SHORT_PICK_THRESHOLD_EXCEEDED,
      { expectedQty, actualQty, variancePct, thresholdPct }
    );
  }
}

class ManagerEvidenceRequiredError extends DomainError {
  constructor(field) {
    super(`Manager override requires ${field}`, WORK_ERROR_CODES.MANAGER_EVIDENCE_REQUIRED, { field });
  }
}

class WorkLockedError extends DomainError {
  constructor(workId) {
    super(`Work ${workId} is locked by another operation`, WORK_ERROR_CODES.WORK_LOCKED, { workId });
  }
}

class InventoryPostingFailedError extends DomainError {
  constructor(workLineId, reason) {
    super(`Inventory posting failed for line ${workLineId}: ${reason}`, WORK_ERROR_CODES.INVENTORY_POSTING_FAILED, { workLineId, reason });
    this.retryable = true;
  }
}

class CallbackDeliveryFailedError extends DomainError {
  constructor(targetModule, reason) {
    super(`Callback to ${targetModule} failed: ${reason}`, WORK_ERROR_CODES.CALLBACK_DELIVERY_FAILED, { targetModule, reason });
    this.retryable = true;
  }
}

class NotAssignedError extends DomainError {
  constructor(workId, userId) {
    super(`User ${userId} is not assigned to work ${workId}`, WORK_ERROR_CODES.NOT_ASSIGNED, { workId, userId });
  }
}

class WorkNotClaimedError extends DomainError {
  constructor(workId) {
    super(`Work ${workId} is not claimed`, WORK_ERROR_CODES.WORK_NOT_CLAIMED, { workId });
  }
}

class LineNotStartedError extends DomainError {
  constructor(workId, lineNum) {
    super(`Line ${lineNum} of work ${workId} is not started`, WORK_ERROR_CODES.LINE_NOT_STARTED, { workId, lineNum });
  }
}

class ReasonCodeRequiredError extends DomainError {
  constructor(action) {
    super(`Reason code is required for ${action}`, WORK_ERROR_CODES.REASON_CODE_REQUIRED, { action });
  }
}

module.exports = {
  WORK_ERROR_CODES,
  WorkNotFoundError,
  WorkLineNotFoundError,
  WorkAlreadyClaimedError,
  InvalidStateTransitionError,
  WorkAlreadyCompletedError,
  DuplicateExternalIdError,
  InvalidScannedLocationError,
  LocationTypeNotAllowedError,
  ActualQuantityInvalidError,
  ShortPickThresholdExceededError,
  ManagerEvidenceRequiredError,
  WorkLockedError,
  InventoryPostingFailedError,
  CallbackDeliveryFailedError,
  NotAssignedError,
  WorkNotClaimedError,
  LineNotStartedError,
  ReasonCodeRequiredError,
};
