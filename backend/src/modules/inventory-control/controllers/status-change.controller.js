/**
 * Module 6: Inventory Control - Status Change Controller
 */

const statusChangeService = require('../services/status-change.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function createStatusChange(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await statusChangeService.createStatusChange(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Status change created and posted successfully',
  });
}

async function getStatusChange(req, reply) {
  const { id } = req.params;
  const result = await statusChangeService.getStatusChange(id);
  return buildResponse(reply, 200, { data: result });
}

async function listStatusChanges(req, reply) {
  const { warehouseId, itemId, ownerId, status, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await statusChangeService.listStatusChanges(
    { warehouseId, itemId, ownerId, status, fromDate, toDate },
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

async function cancelStatusChange(req, reply) {
  const { id } = req.params;
  const { cancelReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await statusChangeService.cancelStatusChange(id, cancelReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Status change cancelled successfully',
  });
}

async function reverseStatusChange(req, reply) {
  const { id } = req.params;
  const { reverseReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await statusChangeService.reverseStatusChange(id, reverseReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Status change reversed successfully',
  });
}

module.exports = {
  createStatusChange,
  getStatusChange,
  listStatusChanges,
  cancelStatusChange,
  reverseStatusChange,
};
