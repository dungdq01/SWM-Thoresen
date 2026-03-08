/**
 * Module 6: Inventory Control - Transfer Order Controller
 */

const transferOrderService = require('../services/transfer-order.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function createTransferOrder(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.createTransferOrder(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Transfer order created successfully',
  });
}

async function getTransferOrder(req, reply) {
  const { id } = req.params;
  const result = await transferOrderService.getTransferOrder(id);
  return buildResponse(reply, 200, { data: result });
}

async function listTransferOrders(req, reply) {
  const { fromWarehouseId, toWarehouseId, status, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await transferOrderService.listTransferOrders(
    { fromWarehouseId, toWarehouseId, status, fromDate, toDate },
    pagination
  );

  return buildResponse(reply, 200, {
    data: result.items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

async function getAgingTransfers(req, reply) {
  const { slaHours = 48 } = req.query;
  const result = await transferOrderService.getAgingTransfers(parseInt(slaHours));
  return buildResponse(reply, 200, { data: result });
}

async function releaseTransferOrder(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.releaseTransferOrder(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Transfer order released successfully',
  });
}

async function shipTransferOrder(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.shipTransferOrder(id, req.body, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Transfer order shipped successfully',
  });
}

async function receiveTransferOrder(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.receiveTransferOrder(id, req.body, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Transfer order received successfully',
  });
}

async function closeTransferOrder(req, reply) {
  const { id } = req.params;
  const { closeReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.closeTransferOrder(id, closeReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Transfer order closed successfully',
  });
}

async function cancelTransferOrder(req, reply) {
  const { id } = req.params;
  const { cancelReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await transferOrderService.cancelTransferOrder(id, cancelReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Transfer order cancelled successfully',
  });
}

module.exports = {
  createTransferOrder,
  getTransferOrder,
  listTransferOrders,
  getAgingTransfers,
  releaseTransferOrder,
  shipTransferOrder,
  receiveTransferOrder,
  closeTransferOrder,
  cancelTransferOrder,
};
