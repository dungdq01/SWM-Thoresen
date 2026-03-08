/**
 * Module 6: Inventory Control - Error Definitions
 */

const { DomainError } = require('../../../shared/errors/DomainError');

class IcValidationError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-400-001', details);
  }
}

class IcInvalidStateTransitionError extends DomainError {
  constructor(currentStatus, targetStatus, entityType) {
    super(
      `Invalid state transition from ${currentStatus} to ${targetStatus} for ${entityType}`,
      'IC-400-002',
      { currentStatus, targetStatus, entityType }
    );
  }
}

class IcInvalidQuantityError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-400-003', details);
  }
}

class IcInvalidStatusMatrixError extends DomainError {
  constructor(fromStatus, toStatus) {
    super(
      `Status change from ${fromStatus} to ${toStatus} is not allowed`,
      'IC-400-004',
      { fromStatus, toStatus }
    );
  }
}

class IcInvalidLocationError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-400-005', details);
  }
}

class IcPermissionDeniedError extends DomainError {
  constructor(action, resource) {
    super(
      `Permission denied for action ${action} on ${resource}`,
      'IC-403-001',
      { action, resource }
    );
  }
}

class IcOwnerScopeDeniedError extends DomainError {
  constructor(ownerId) {
    super(
      `Owner scope denied for owner ${ownerId}`,
      'IC-403-002',
      { ownerId }
    );
  }
}

class IcIdempotencyConflictError extends DomainError {
  constructor(externalId) {
    super(
      `Idempotency conflict: external_id ${externalId} already exists`,
      'IC-409-001',
      { externalId }
    );
  }
}

class IcVersionConflictError extends DomainError {
  constructor(entityType, entityId) {
    super(
      `Version conflict for ${entityType} with id ${entityId}`,
      'IC-409-002',
      { entityType, entityId }
    );
  }
}

class IcReservedStockConflictError extends DomainError {
  constructor(itemId, locationId, reservedQty) {
    super(
      `Cannot modify reserved stock. Item ${itemId} at location ${locationId} has ${reservedQty} reserved`,
      'IC-409-003',
      { itemId, locationId, reservedQty }
    );
  }
}

class IcPostingAlreadyCompletedError extends DomainError {
  constructor(documentType, documentId) {
    super(
      `Posting already completed for ${documentType} ${documentId}`,
      'IC-409-004',
      { documentType, documentId }
    );
  }
}

class IcInsufficientQtyError extends DomainError {
  constructor(itemId, locationId, available, requested) {
    super(
      `Insufficient available qty. Item ${itemId} at location ${locationId}: available=${available}, requested=${requested}`,
      'IC-422-001',
      { itemId, locationId, available, requested }
    );
  }
}

class IcLocationCapacityBlockedError extends DomainError {
  constructor(locationId, reason) {
    super(
      `Location ${locationId} capacity/profile blocked: ${reason}`,
      'IC-422-002',
      { locationId, reason }
    );
  }
}

class IcRecountPolicyExceededError extends DomainError {
  constructor(lineId, currentRecount, maxRecount) {
    super(
      `Recount policy exceeded for line ${lineId}. Current: ${currentRecount}, Max: ${maxRecount}`,
      'IC-422-003',
      { lineId, currentRecount, maxRecount }
    );
  }
}

class IcAdjustmentLimitExceededError extends DomainError {
  constructor(userId, limit, requested) {
    super(
      `Adjustment limit exceeded for user. Limit: ${limit}, Requested: ${requested}`,
      'IC-422-004',
      { userId, limit, requested }
    );
  }
}

class IcPostingAdapterError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-500-001', details);
  }
}

class IcWorkHandoffError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-500-002', details);
  }
}

class IcRecoveryRequiredError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'IC-500-003', details);
  }
}

class IcNotFoundError extends DomainError {
  constructor(entityType, identifier) {
    super(
      `${entityType} not found: ${identifier}`,
      'IC-404-001',
      { entityType, identifier }
    );
  }
}

module.exports = {
  IcValidationError,
  IcInvalidStateTransitionError,
  IcInvalidQuantityError,
  IcInvalidStatusMatrixError,
  IcInvalidLocationError,
  IcPermissionDeniedError,
  IcOwnerScopeDeniedError,
  IcIdempotencyConflictError,
  IcVersionConflictError,
  IcReservedStockConflictError,
  IcPostingAlreadyCompletedError,
  IcInsufficientQtyError,
  IcLocationCapacityBlockedError,
  IcRecountPolicyExceededError,
  IcAdjustmentLimitExceededError,
  IcPostingAdapterError,
  IcWorkHandoffError,
  IcRecoveryRequiredError,
  IcNotFoundError,
};
