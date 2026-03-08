/**
 * Module 6: Inventory Control - Transfer Order Service
 */

const prisma = require('../../../shared/db/prismaClient');
const transferOrderRepo = require('../infra/transfer-order.repository');
const validationService = require('./ic-validation.service');
const stateMachine = require('./ic-state-machine.service');
const postingAdapter = require('./ic-posting-adapter.service');
const statusHistoryRepo = require('../infra/ic-status-history.repository');
const { validateTransferOrderLines } = require('../domain/ic.policy');
const { IcTransferOrderStatus, IcTransferLineStatus, IcDocumentEntityType, IcExceptionType } = require('../domain/ic.enums');
const { IcValidationError, IcIdempotencyConflictError, IcNotFoundError } = require('../domain/ic.errors');

async function generateTransferNumber(fromWarehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('TRANSFER_ORDER', { warehouseId: fromWarehouseId }, tx);
}

async function createTransferOrder(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await transferOrderRepo.findTransferOrderByExternalId(data.externalId);
  if (existing) {
    throw new IcIdempotencyConflictError(data.externalId);
  }

  const lineErrors = validateTransferOrderLines(data.lines, data.fromWarehouseId, data.toWarehouseId);
  if (lineErrors.length > 0) {
    throw new IcValidationError('Invalid transfer order lines', { errors: lineErrors });
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateTransferOrderCreate(data, tx);

    const transferNumber = await generateTransferNumber(data.fromWarehouseId, tx);

    const transferOrder = await transferOrderRepo.createTransferOrder({
      transferNumber,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      executionMode: data.executionMode || 'DIRECT',
      status: IcTransferOrderStatus.CREATED,
      requestedShipDate: data.requestedShipDate,
      inTransitSlaHours: data.inTransitSlaHours || 48,
      vehicleNumber: data.vehicleNumber,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
      lines: data.lines,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.TRANSFER,
      transferOrder.id,
      null,
      IcTransferOrderStatus.CREATED,
      userId,
      correlationId,
      null,
      'Created',
      tx
    );

    return transferOrder;
  });
}

async function releaseTransferOrder(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const transferOrder = await transferOrderRepo.findTransferOrderById(id, tx);
    if (!transferOrder) {
      throw new IcNotFoundError('TransferOrder', id);
    }

    const newStatus = await stateMachine.transitionTransferOrder(
      transferOrder,
      IcTransferOrderStatus.RELEASED,
      userId,
      correlationId,
      null,
      'Released',
      tx
    );

    for (const line of transferOrder.lines) {
      await validationService.checkAvailableStock(
        line.itemId,
        line.ownerId,
        transferOrder.fromWarehouseId,
        line.fromLocationId,
        line.inventoryStatus,
        line.requestedQty,
        tx
      );
    }

    return transferOrderRepo.updateTransferOrder(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function shipTransferOrder(id, shipData, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    await transferOrderRepo.lockTransferOrderForUpdate(id, tx);

    const transferOrder = await transferOrderRepo.findTransferOrderById(id, tx);
    if (!transferOrder) {
      throw new IcNotFoundError('TransferOrder', id);
    }

    await stateMachine.transitionTransferOrder(
      transferOrder,
      IcTransferOrderStatus.SHIPPED,
      userId,
      correlationId,
      null,
      'Shipped',
      tx
    );

    for (const line of transferOrder.lines) {
      const shippedQty = shipData.lines?.find(l => l.lineNo === line.lineNo)?.shippedQty || line.requestedQty;
      await transferOrderRepo.updateTransferOrderLine(line.id, {
        shippedQty,
        lineStatus: IcTransferLineStatus.SHIPPED,
      }, tx);
    }

    const updatedOrder = await transferOrderRepo.findTransferOrderById(id, tx);

    try {
      const postingResult = await postingAdapter.postTransferShip(
        updatedOrder,
        updatedOrder.lines,
        correlationId,
        tx
      );

      for (const result of postingResult.results) {
        await transferOrderRepo.updateTransferOrderLine(result.lineId, {
          postedShipTransId: result.transId,
        }, tx);
      }

      return transferOrderRepo.updateTransferOrder(id, {
        status: IcTransferOrderStatus.IN_TRANSIT,
        postingShipStatus: 'POSTED',
        shippedBy: userId,
        actualShipAt: new Date(),
        vehicleNumber: shipData.vehicleNumber || transferOrder.vehicleNumber,
        updatedBy: userId,
      }, tx);
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.TRANSFER,
        entityId: id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: error.message,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      throw error;
    }
  });
}

async function receiveTransferOrder(id, receiveData, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    await transferOrderRepo.lockTransferOrderForUpdate(id, tx);

    const transferOrder = await transferOrderRepo.findTransferOrderById(id, tx);
    if (!transferOrder) {
      throw new IcNotFoundError('TransferOrder', id);
    }

    let allReceived = true;
    for (const line of transferOrder.lines) {
      const receiveLineData = receiveData.lines?.find(l => l.lineNo === line.lineNo);
      const receivedQty = receiveLineData?.receivedQty || 0;
      const prevReceived = parseFloat(line.receivedQty || 0);
      const totalReceived = prevReceived + parseFloat(receivedQty);
      const shipped = parseFloat(line.shippedQty || 0);

      if (totalReceived < shipped) {
        allReceived = false;
      }

      const varianceQty = totalReceived - shipped;
      const lineStatus = totalReceived >= shipped ? IcTransferLineStatus.RECEIVED : IcTransferLineStatus.PARTIALLY_RECEIVED;

      await transferOrderRepo.updateTransferOrderLine(line.id, {
        receivedQty: totalReceived,
        varianceQty,
        toLocationId: receiveLineData?.toLocationId || line.toLocationId,
        lineStatus,
        issueFlag: varianceQty !== 0,
        varianceReasonCode: varianceQty !== 0 ? receiveLineData?.varianceReasonCode : null,
      }, tx);
    }

    const newStatus = allReceived ? IcTransferOrderStatus.RECEIVED : IcTransferOrderStatus.PARTIALLY_RECEIVED;

    await stateMachine.transitionTransferOrder(
      transferOrder,
      newStatus,
      userId,
      correlationId,
      null,
      allReceived ? 'Received' : 'Partially Received',
      tx
    );

    const updatedOrder = await transferOrderRepo.findTransferOrderById(id, tx);

    try {
      const linesToPost = updatedOrder.lines.filter(l => {
        const receiveLineData = receiveData.lines?.find(rl => rl.lineNo === l.lineNo);
        return receiveLineData && parseFloat(receiveLineData.receivedQty) > 0;
      });

      if (linesToPost.length > 0) {
        const postingResult = await postingAdapter.postTransferReceive(
          updatedOrder,
          linesToPost,
          correlationId,
          tx
        );

        for (const result of postingResult.results) {
          await transferOrderRepo.updateTransferOrderLine(result.lineId, {
            postedReceiveTransId: result.transId,
          }, tx);
        }
      }

      return transferOrderRepo.updateTransferOrder(id, {
        status: newStatus,
        postingReceiveStatus: allReceived ? 'POSTED' : 'PENDING',
        receivedBy: userId,
        actualReceiveAt: allReceived ? new Date() : null,
        updatedBy: userId,
      }, tx);
    } catch (error) {
      await statusHistoryRepo.createExceptionLog({
        entityType: IcDocumentEntityType.TRANSFER,
        entityId: id,
        exceptionType: IcExceptionType.POST_FAIL,
        severity: 'HIGH',
        message: error.message,
        payloadJson: { error: error.details || {} },
        createdBy: userId,
        correlationId,
      }, tx);

      throw error;
    }
  });
}

async function closeTransferOrder(id, closeReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const transferOrder = await transferOrderRepo.findTransferOrderById(id, tx);
    if (!transferOrder) {
      throw new IcNotFoundError('TransferOrder', id);
    }

    const newStatus = await stateMachine.transitionTransferOrder(
      transferOrder,
      IcTransferOrderStatus.CLOSED,
      userId,
      correlationId,
      closeReasonCode,
      'Closed',
      tx
    );

    for (const line of transferOrder.lines) {
      await transferOrderRepo.updateTransferOrderLine(line.id, {
        lineStatus: IcTransferLineStatus.CLOSED,
      }, tx);
    }

    return transferOrderRepo.updateTransferOrder(id, {
      status: newStatus,
      closeReasonCode,
      updatedBy: userId,
    }, tx);
  });
}

async function cancelTransferOrder(id, cancelReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const transferOrder = await transferOrderRepo.findTransferOrderById(id, tx);
    if (!transferOrder) {
      throw new IcNotFoundError('TransferOrder', id);
    }

    const newStatus = await stateMachine.transitionTransferOrder(
      transferOrder,
      IcTransferOrderStatus.CANCELLED,
      userId,
      correlationId,
      cancelReasonCode,
      'Cancelled',
      tx
    );

    for (const line of transferOrder.lines) {
      await transferOrderRepo.updateTransferOrderLine(line.id, {
        lineStatus: IcTransferLineStatus.CANCELLED,
      }, tx);
    }

    return transferOrderRepo.updateTransferOrder(id, {
      status: newStatus,
      cancelReasonCode,
      updatedBy: userId,
    }, tx);
  });
}

async function getTransferOrder(id) {
  const transferOrder = await transferOrderRepo.findTransferOrderById(id);
  if (!transferOrder) {
    throw new IcNotFoundError('TransferOrder', id);
  }
  return transferOrder;
}

async function listTransferOrders(filters, pagination) {
  return transferOrderRepo.findTransferOrders(filters, pagination);
}

async function getAgingTransfers(slaHours = 48) {
  return transferOrderRepo.findAgingTransfers(slaHours);
}

module.exports = {
  createTransferOrder,
  releaseTransferOrder,
  shipTransferOrder,
  receiveTransferOrder,
  closeTransferOrder,
  cancelTransferOrder,
  getTransferOrder,
  listTransferOrders,
  getAgingTransfers,
};
