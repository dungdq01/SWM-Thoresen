/**
 * Module 6: Inventory Control - Status Change Service
 */

const prisma = require('../../../shared/db/prismaClient');
const statusChangeRepo = require('../infra/status-change.repository');
const validationService = require('./ic-validation.service');
const stateMachine = require('./ic-state-machine.service');
const postingAdapter = require('./ic-posting-adapter.service');
const auditLogAdapter = require('./ic-audit-log.adapter');
const statusHistoryRepo = require('../infra/ic-status-history.repository');
const { isStatusChangeAllowed } = require('../domain/ic.policy');
const { IcStatusChangeStatus, IcDocumentEntityType, IcExceptionType } = require('../domain/ic.enums');
const { IcValidationError, IcIdempotencyConflictError, IcNotFoundError, IcInvalidStatusMatrixError } = require('../domain/ic.errors');

async function generateStatusChangeNumber(warehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('STATUS_CHANGE', { warehouseId }, tx);
}

async function createStatusChange(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await statusChangeRepo.findStatusChangeByExternalId(data.externalId);
  if (existing) {
    return { ...existing, idempotentReplay: true };
  }

  if (!isStatusChangeAllowed(data.fromStatus, data.toStatus)) {
    throw new IcInvalidStatusMatrixError(data.fromStatus, data.toStatus);
  }

  if (!data.reasonCode) {
    throw new IcValidationError('Reason code is required for status change');
  }

  if (!data.qty || parseFloat(data.qty) <= 0) {
    throw new IcValidationError('Quantity must be greater than 0');
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateStatusChangeCreate(data, tx);

    await validationService.checkAvailableStock(
      data.itemId,
      data.ownerId,
      data.warehouseId,
      data.locationId,
      data.fromStatus,
      data.qty,
      tx
    );

    await validationService.checkReservedStock(
      data.itemId,
      data.ownerId,
      data.warehouseId,
      data.locationId,
      data.fromStatus,
      tx
    );

    const statusChangeNumber = await generateStatusChangeNumber(data.warehouseId, tx);

    const statusChange = await statusChangeRepo.createStatusChange({
      statusChangeNumber,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      itemId: data.itemId,
      ownerId: data.ownerId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      qty: data.qty,
      uom: data.uom,
      reasonCode: data.reasonCode,
      reasonText: data.reasonText,
      attachmentRef: data.attachmentRef,
      status: IcStatusChangeStatus.CREATED,
      requestedBy: userId,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.STATUS_CHANGE,
      statusChange.id,
      null,
      IcStatusChangeStatus.CREATED,
      userId,
      correlationId,
      null,
      'Created',
      tx
    );

    try {
      const postingResult = await postingAdapter.postStatusChange(statusChange, correlationId, tx);

      const updatedStatusChange = await statusChangeRepo.updateStatusChange(statusChange.id, {
        status: IcStatusChangeStatus.POSTED,
        postedTransGroupId: postingResult.transId,
        postedAt: new Date(),
        updatedBy: userId,
      }, tx);

      await stateMachine.recordStatusChange(
        IcDocumentEntityType.STATUS_CHANGE,
        statusChange.id,
        IcStatusChangeStatus.CREATED,
        IcStatusChangeStatus.POSTED,
        userId,
        correlationId,
        null,
        'Posted',
        tx
      );

      return updatedStatusChange;
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.STATUS_CHANGE,
        entityId: statusChange.id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: error.message,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      await statusChangeRepo.updateStatusChange(statusChange.id, {
        status: IcStatusChangeStatus.FAILED,
        updatedBy: userId,
      }, tx);

      throw error;
    }
  });
}

async function cancelStatusChange(id, cancelReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const statusChange = await statusChangeRepo.findStatusChangeById(id, tx);
    if (!statusChange) {
      throw new IcNotFoundError('StatusChange', id);
    }

    const newStatus = await stateMachine.transitionStatusChange(
      statusChange,
      IcStatusChangeStatus.CANCELLED,
      userId,
      correlationId,
      cancelReasonCode,
      'Cancelled',
      tx
    );

    return statusChangeRepo.updateStatusChange(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function reverseStatusChange(id, reverseReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const statusChange = await statusChangeRepo.findStatusChangeById(id, tx);
    if (!statusChange) {
      throw new IcNotFoundError('StatusChange', id);
    }

    if (statusChange.status !== IcStatusChangeStatus.POSTED) {
      throw new IcValidationError(`Only POSTED status changes can be reversed. Current: ${statusChange.status}`);
    }

    // Create reversed status change object (swap from/to)
    const reversedStatusChange = {
      ...statusChange,
      fromStatus: statusChange.toStatus,
      toStatus: statusChange.fromStatus,
      externalId: `${statusChange.externalId}-REV`,
      reasonCode: reverseReasonCode || statusChange.reasonCode,
    };

    // Post reversal to M3 Inventory Core
    try {
      const postingResult = await postingAdapter.postStatusChange(reversedStatusChange, correlationId, tx);

      const newStatus = await stateMachine.transitionStatusChange(
        statusChange,
        IcStatusChangeStatus.REVERSED,
        userId,
        correlationId,
        reverseReasonCode,
        'Reversed via M3',
        tx
      );

      return statusChangeRepo.updateStatusChange(id, {
        status: newStatus,
        reversedTransGroupId: postingResult.transId,
        reversedAt: new Date(),
        reversedBy: userId,
        updatedBy: userId,
      }, tx);
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.STATUS_CHANGE,
        entityId: statusChange.id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: `Reversal failed: ${error.message}`,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      throw error;
    }
  });
}

async function getStatusChange(id) {
  const statusChange = await statusChangeRepo.findStatusChangeById(id);
  if (!statusChange) {
    throw new IcNotFoundError('StatusChange', id);
  }
  return statusChange;
}

async function listStatusChanges(filters, pagination) {
  return statusChangeRepo.findStatusChanges(filters, pagination);
}

module.exports = {
  createStatusChange,
  cancelStatusChange,
  reverseStatusChange,
  getStatusChange,
  listStatusChanges,
};
