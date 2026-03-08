import { HttpException, HttpStatus } from '@nestjs/common';
import { VasExceptionCode } from './vas.enums';

export class VasDomainError extends HttpException {
  constructor(
    public readonly code: VasExceptionCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export class VasWoNotFoundError extends VasDomainError {
  constructor(woId: string) {
    super(
      VasExceptionCode.VAS_WO_NOT_FOUND,
      `VAS Work Order not found: ${woId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VasInvalidStateError extends VasDomainError {
  constructor(currentStatus: string, expectedStatuses: string[]) {
    super(
      VasExceptionCode.VAS_INVALID_STATE,
      `Invalid state transition. Current: ${currentStatus}, Expected: ${expectedStatuses.join(', ')}`,
      HttpStatus.CONFLICT,
      { currentStatus, expectedStatuses },
    );
  }
}

export class VasDuplicateExternalIdError extends VasDomainError {
  constructor(externalId: string) {
    super(
      VasExceptionCode.VAS_DUPLICATE_EXTERNAL_ID,
      `Request already processed with externalId: ${externalId}`,
      HttpStatus.CONFLICT,
      { externalId },
    );
  }
}

export class VasInsufficientBulkError extends VasDomainError {
  constructor(available: number, required: number) {
    super(
      VasExceptionCode.VAS_INSUFFICIENT_BULK,
      `Insufficient bulk stock. Available: ${available}, Required: ${required}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { available, required },
    );
  }
}

export class VasInsufficientPackagingError extends VasDomainError {
  constructor(available: number, required: number) {
    super(
      VasExceptionCode.VAS_INSUFFICIENT_PACKAGING,
      `Insufficient packaging stock. Available: ${available}, Required: ${required}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { available, required },
    );
  }
}

export class VasInvalidMaterialBalanceError extends VasDomainError {
  constructor(consumed: number, output: number) {
    super(
      VasExceptionCode.VAS_INVALID_MATERIAL_BALANCE,
      `Invalid material balance. Consumed (${consumed}) must be >= Output (${output})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { consumed, output },
    );
  }
}

export class VasReasonRequiredError extends VasDomainError {
  constructor(action: string) {
    super(
      VasExceptionCode.VAS_REASON_REQUIRED,
      `Reason code is required for action: ${action}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { action },
    );
  }
}

export class VasOptimisticLockError extends VasDomainError {
  constructor(woId: string) {
    super(
      VasExceptionCode.VAS_OPTIMISTIC_LOCK_FAILED,
      `Optimistic lock failed for WO: ${woId}. Record was modified by another transaction.`,
      HttpStatus.CONFLICT,
      { woId },
    );
  }
}
