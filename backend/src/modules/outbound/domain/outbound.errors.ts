/**
 * Outbound Errors - Domain Layer
 * Custom error types for outbound operations
 */

export class OutboundDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OutboundDomainError';
  }
}

export class ShipmentNotFoundError extends OutboundDomainError {
  constructor(shipmentId: string) {
    super('SHIPMENT_NOT_FOUND', `Shipment ${shipmentId} not found`, { shipmentId });
  }
}

export class ShipmentLineNotFoundError extends OutboundDomainError {
  constructor(lineId: string) {
    super('LINE_NOT_FOUND', `Shipment line ${lineId} not found`, { lineId });
  }
}

export class InvalidStateTransitionError extends OutboundDomainError {
  constructor(currentStatus: string, action: string) {
    super(
      'INVALID_STATE_TRANSITION',
      `Cannot perform ${action} when shipment is in ${currentStatus} status`,
      { currentStatus, action },
    );
  }
}

export class AllocationFailedError extends OutboundDomainError {
  constructor(lineId: string, reason: string) {
    super('ALLOCATION_FAILED', `Allocation failed for line ${lineId}: ${reason}`, {
      lineId,
      reason,
    });
  }
}

export class InsufficientStockError extends OutboundDomainError {
  constructor(itemId: string, required: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for item ${itemId}. Required: ${required}, Available: ${available}`,
      { itemId, required, available },
    );
  }
}

export class ToleranceExceededError extends OutboundDomainError {
  constructor(lineId: string, variancePct: number, tolerancePct: number) {
    super(
      'TOLERANCE_EXCEEDED',
      `Tolerance exceeded for line ${lineId}. Variance: ${variancePct.toFixed(2)}%, Tolerance: ${tolerancePct}%`,
      { lineId, variancePct, tolerancePct },
    );
  }
}

export class TareRequiredError extends OutboundDomainError {
  constructor(shipmentId: string) {
    super('TARE_REQUIRED', `Must record tare weight before gross for shipment ${shipmentId}`, {
      shipmentId,
    });
  }
}

export class ApprovalRequiredError extends OutboundDomainError {
  constructor(shipmentId: string, failedLineCount: number) {
    super(
      'APPROVAL_REQUIRED',
      `Shipment ${shipmentId} has ${failedLineCount} lines requiring approval`,
      { shipmentId, failedLineCount },
    );
  }
}

export class ShipmentAlreadyExistsError extends OutboundDomainError {
  constructor(externalId: string) {
    super('SHIPMENT_ALREADY_EXISTS', `Shipment with externalId ${externalId} already exists`, {
      externalId,
    });
  }
}

export class PostingFailedError extends OutboundDomainError {
  constructor(shipmentId: string, reason: string) {
    super('POSTING_FAILED', `Failed to post inventory for shipment ${shipmentId}: ${reason}`, {
      shipmentId,
      reason,
    });
  }
}

export const ERROR_CODES = {
  SHIPMENT_NOT_FOUND: 'OUT-001',
  LINE_NOT_FOUND: 'OUT-002',
  INVALID_STATE_TRANSITION: 'OUT-003',
  ALLOCATION_FAILED: 'OUT-004',
  INSUFFICIENT_STOCK: 'OUT-005',
  TOLERANCE_EXCEEDED: 'OUT-006',
  TARE_REQUIRED: 'OUT-007',
  APPROVAL_REQUIRED: 'OUT-008',
  SHIPMENT_ALREADY_EXISTS: 'OUT-009',
  POSTING_FAILED: 'OUT-010',
  NO_LINES: 'OUT-011',
  ALREADY_ALLOCATED: 'OUT-012',
  NOT_PENDING_APPROVAL: 'OUT-013',
};
