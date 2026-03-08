/**
 * Module 6: Inventory Control - Adjustment Service
 */

const prisma = require('../../../shared/db/prismaClient');
const adjustmentRepo = require('../infra/adjustment.repository');
const validationService = require('./ic-validation.service');
const stateMachine = require('./ic-state-machine.service');
const postingAdapter = require('./ic-posting-adapter.service');
const statusHistoryRepo = require('../infra/ic-status-history.repository');
const { validateAdjustmentLines, determineAdjustmentType } = require('../domain/ic.policy');
const { IcAdjustmentStatus, IcAdjustmentLineStatus, IcDocumentEntityType, IcExceptionType } = require('../domain/ic.enums');
const { IcValidationError, IcIdempotencyConflictError, IcNotFoundError } = require('../domain/ic.errors');

async function generateAdjustmentNumber(warehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('ADJUSTMENT', { warehouseId }, tx);
}

async function createAdjustment(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await adjustmentRepo.findAdjustmentByExternalId(data.externalId);
  if (existing) {
    throw new IcIdempotencyConflictError(data.externalId);
  }

  const lineErrors = validateAdjustmentLines(data.lines);
  if (lineErrors.length > 0) {
    throw new IcValidationError('Invalid adjustment lines', { errors: lineErrors });
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateAdjustmentCreate(data, tx);

    const adjustmentNumber = await generateAdjustmentNumber(data.warehouseId, tx);
    const adjustmentType = determineAdjustmentType(data.lines);
    const totalAbsQty = data.lines.reduce((sum, l) => sum + Math.abs(parseFloat(l.qtyDelta)), 0);

    const adjustment = await adjustmentRepo.createAdjustmentHeader({
      adjustmentNumber,
      warehouseId: data.warehouseId,
      adjustmentType,
      sourceType: data.sourceType || 'MANUAL',
      status: IcAdjustmentStatus.DRAFT,
      totalAbsQty,
      requestedBy: userId,
      reasonCode: data.reasonCode,
      remarks: data.remarks,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
      lines: data.lines,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.ADJUSTMENT,
      adjustment.id,
      null,
      IcAdjustmentStatus.DRAFT,
      userId,
      correlationId,
      null,
      'Created',
      tx
    );

    return adjustment;
  });
}

async function submitAdjustment(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const adjustment = await adjustmentRepo.findAdjustmentById(id, tx);
    if (!adjustment) {
      throw new IcNotFoundError('Adjustment', id);
    }

    const newStatus = await stateMachine.transitionAdjustment(
      adjustment,
      IcAdjustmentStatus.SUBMITTED,
      userId,
      correlationId,
      null,
      'Submitted for approval',
      tx
    );

    return adjustmentRepo.updateAdjustment(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function approveAdjustment(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const adjustment = await adjustmentRepo.findAdjustmentById(id, tx);
    if (!adjustment) {
      throw new IcNotFoundError('Adjustment', id);
    }

    const newStatus = await stateMachine.transitionAdjustment(
      adjustment,
      IcAdjustmentStatus.APPROVED,
      userId,
      correlationId,
      null,
      'Approved',
      tx
    );

    for (const line of adjustment.lines) {
      await adjustmentRepo.updateAdjustmentLine(line.id, {
        lineStatus: IcAdjustmentLineStatus.APPROVED,
      }, tx);
    }

    return adjustmentRepo.updateAdjustment(id, {
      status: newStatus,
      approvedBy: userId,
      approvedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function postAdjustment(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    await adjustmentRepo.lockAdjustmentForUpdate(id, tx);

    const adjustment = await adjustmentRepo.findAdjustmentById(id, tx);
    if (!adjustment) {
      throw new IcNotFoundError('Adjustment', id);
    }

    try {
      const postingResult = await postingAdapter.postAdjustment(
        adjustment,
        adjustment.lines,
        correlationId,
        tx
      );

      for (const result of postingResult.results) {
        await adjustmentRepo.updateAdjustmentLine(result.lineId, {
          postedTransId: result.transId,
          lineStatus: IcAdjustmentLineStatus.POSTED,
        }, tx);
      }

      const newStatus = await stateMachine.transitionAdjustment(
        adjustment,
        IcAdjustmentStatus.POSTED,
        userId,
        correlationId,
        null,
        'Posted',
        tx
      );

      return adjustmentRepo.updateAdjustment(id, {
        status: newStatus,
        postedAt: new Date(),
        updatedBy: userId,
      }, tx);
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.ADJUSTMENT,
        entityId: id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: error.message,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      for (const line of adjustment.lines) {
        await adjustmentRepo.updateAdjustmentLine(line.id, {
          lineStatus: IcAdjustmentLineStatus.FAILED,
        }, tx);
      }

      await adjustmentRepo.updateAdjustment(id, {
        status: IcAdjustmentStatus.FAILED,
        updatedBy: userId,
      }, tx);

      throw error;
    }
  });
}

async function cancelAdjustment(id, cancelReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const adjustment = await adjustmentRepo.findAdjustmentById(id, tx);
    if (!adjustment) {
      throw new IcNotFoundError('Adjustment', id);
    }

    const newStatus = await stateMachine.transitionAdjustment(
      adjustment,
      IcAdjustmentStatus.CANCELLED,
      userId,
      correlationId,
      cancelReasonCode,
      'Cancelled',
      tx
    );

    for (const line of adjustment.lines) {
      await adjustmentRepo.updateAdjustmentLine(line.id, {
        lineStatus: IcAdjustmentLineStatus.CANCELLED,
      }, tx);
    }

    return adjustmentRepo.updateAdjustment(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function getAdjustment(id) {
  const adjustment = await adjustmentRepo.findAdjustmentById(id);
  if (!adjustment) {
    throw new IcNotFoundError('Adjustment', id);
  }
  return adjustment;
}

async function listAdjustments(filters, pagination) {
  return adjustmentRepo.findAdjustments(filters, pagination);
}

module.exports = {
  createAdjustment,
  submitAdjustment,
  approveAdjustment,
  postAdjustment,
  cancelAdjustment,
  getAdjustment,
  listAdjustments,
};
