/**
 * Module 6: Inventory Control - Move Order Controller
 */

const moveOrderService = require('../services/move-order.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function createMoveOrder(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await moveOrderService.createMoveOrder(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Move order created successfully',
  });
}

async function getMoveOrder(req, reply) {
  const { id } = req.params;
  const result = await moveOrderService.getMoveOrder(id);
  return buildResponse(reply, 200, { data: result });
}

async function listMoveOrders(req, reply) {
  const { warehouseId, status, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await moveOrderService.listMoveOrders(
    { warehouseId, status, fromDate, toDate },
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

async function confirmMoveOrder(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await moveOrderService.confirmMoveOrder(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Move order confirmed successfully',
  });
}

async function executeMoveOrder(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await moveOrderService.executeMoveOrder(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Move order executed successfully',
  });
}

async function cancelMoveOrder(req, reply) {
  const { id } = req.params;
  const { reasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await moveOrderService.cancelMoveOrder(id, reasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Move order cancelled successfully',
  });
}

module.exports = {
  createMoveOrder,
  getMoveOrder,
  listMoveOrders,
  confirmMoveOrder,
  executeMoveOrder,
  cancelMoveOrder,
};
