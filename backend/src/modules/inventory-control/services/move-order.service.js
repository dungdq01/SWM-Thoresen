/**
 * Module 6: Inventory Control - Move Order Service
 */

const prisma = require('../../../shared/db/prismaClient');
const moveOrderRepo = require('../infra/move-order.repository');
const validationService = require('./ic-validation.service');
const stateMachine = require('./ic-state-machine.service');
const postingAdapter = require('./ic-posting-adapter.service');
const auditLogAdapter = require('./ic-audit-log.adapter');
const statusHistoryRepo = require('../infra/ic-status-history.repository');
const { validateMoveOrderLines } = require('../domain/ic.policy');
const { IcMoveOrderStatus, IcMoveLineStatus, IcDocumentEntityType, IcExceptionType } = require('../domain/ic.enums');
const { IcValidationError, IcIdempotencyConflictError, IcNotFoundError } = require('../domain/ic.errors');

async function generateMoveNumber(warehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('MOVE_ORDER', { warehouseId }, tx);
}

async function createMoveOrder(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await moveOrderRepo.findMoveOrderByExternalId(data.externalId);
  if (existing) {
    return { ...existing, idempotentReplay: true };
  }

  const lineErrors = validateMoveOrderLines(data.lines, data.warehouseId);
  if (lineErrors.length > 0) {
    throw new IcValidationError('Invalid move order lines', { errors: lineErrors });
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateMoveOrderCreate(data, tx);

    const moveNumber = await generateMoveNumber(data.warehouseId, tx);

    const moveOrder = await moveOrderRepo.createMoveOrder({
      moveNumber,
      warehouseId: data.warehouseId,
      executionMode: data.executionMode || 'DIRECT',
      status: IcMoveOrderStatus.DRAFT,
      reasonCode: data.reasonCode,
      remarks: data.remarks,
      requestedBy: userId,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
      lines: data.lines,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.MOVE,
      moveOrder.id,
      null,
      IcMoveOrderStatus.DRAFT,
      userId,
      correlationId,
      null,
      'Created',
      tx
    );

    return moveOrder;
  });
}

async function confirmMoveOrder(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const moveOrder = await moveOrderRepo.findMoveOrderById(id, tx);
    if (!moveOrder) {
      throw new IcNotFoundError('MoveOrder', id);
    }

    const newStatus = await stateMachine.transitionMoveOrder(
      moveOrder,
      IcMoveOrderStatus.CONFIRMED,
      userId,
      correlationId,
      null,
      'Confirmed',
      tx
    );

    for (const line of moveOrder.lines) {
      await validationService.checkAvailableStock(
        line.itemId,
        line.ownerId,
        moveOrder.warehouseId,
        line.fromLocationId,
        line.inventoryStatus,
        line.requestedQty,
        tx
      );

      await validationService.checkReservedStock(
        line.itemId,
        line.ownerId,
        moveOrder.warehouseId,
        line.fromLocationId,
        line.inventoryStatus,
        tx
      );
    }

    return moveOrderRepo.updateMoveOrder(id, {
      status: newStatus,
      confirmedBy: userId,
      confirmedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function executeMoveOrder(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    await moveOrderRepo.lockMoveOrderForUpdate(id, tx);

    const moveOrder = await moveOrderRepo.findMoveOrderById(id, tx);
    if (!moveOrder) {
      throw new IcNotFoundError('MoveOrder', id);
    }

    await stateMachine.transitionMoveOrder(
      moveOrder,
      IcMoveOrderStatus.IN_PROGRESS,
      userId,
      correlationId,
      null,
      'Executing',
      tx
    );

    await moveOrderRepo.updateMoveOrder(id, {
      status: IcMoveOrderStatus.IN_PROGRESS,
      updatedBy: userId,
    }, tx);

    try {
      const postingResult = await postingAdapter.postInternalMove(
        moveOrder,
        moveOrder.lines,
        correlationId,
        tx
      );

      for (const result of postingResult.results) {
        await moveOrderRepo.updateMoveOrderLine(result.lineId, {
          lineStatus: IcMoveLineStatus.COMPLETED,
          executedQty: moveOrder.lines.find(l => l.id === result.lineId).requestedQty,
          postedTransGroupId: result.transId,
        }, tx);
      }

      return moveOrderRepo.updateMoveOrder(id, {
        status: IcMoveOrderStatus.COMPLETED,
        postingStatus: 'POSTED',
        postedRef: postingResult.results.map(r => r.transId).join(','),
        completedBy: userId,
        completedAt: new Date(),
        updatedBy: userId,
      }, tx);
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.MOVE,
        entityId: id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: error.message,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      await moveOrderRepo.updateMoveOrder(id, {
        status: IcMoveOrderStatus.FAILED,
        postingStatus: 'FAILED',
        updatedBy: userId,
      }, tx);

      throw error;
    }
  });
}

async function cancelMoveOrder(id, reasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const moveOrder = await moveOrderRepo.findMoveOrderById(id, tx);
    if (!moveOrder) {
      throw new IcNotFoundError('MoveOrder', id);
    }

    const newStatus = await stateMachine.transitionMoveOrder(
      moveOrder,
      IcMoveOrderStatus.CANCELLED,
      userId,
      correlationId,
      reasonCode,
      'Cancelled',
      tx
    );

    for (const line of moveOrder.lines) {
      await moveOrderRepo.updateMoveOrderLine(line.id, {
        lineStatus: IcMoveLineStatus.CANCELLED,
      }, tx);
    }

    return moveOrderRepo.updateMoveOrder(id, {
      status: newStatus,
      reasonCode,
      updatedBy: userId,
    }, tx);
  });
}

async function getMoveOrder(id) {
  const moveOrder = await moveOrderRepo.findMoveOrderById(id);
  if (!moveOrder) {
    throw new IcNotFoundError('MoveOrder', id);
  }
  return moveOrder;
}

async function listMoveOrders(filters, pagination) {
  return moveOrderRepo.findMoveOrders(filters, pagination);
}

module.exports = {
  createMoveOrder,
  confirmMoveOrder,
  executeMoveOrder,
  cancelMoveOrder,
  getMoveOrder,
  listMoveOrders,
};
