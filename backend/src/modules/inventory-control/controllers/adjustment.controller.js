/**
 * Module 6: Inventory Control - Adjustment Controller
 */

const adjustmentService = require('../services/adjustment.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function createAdjustment(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await adjustmentService.createAdjustment(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Adjustment created successfully',
  });
}

async function getAdjustment(req, reply) {
  const { id } = req.params;
  const result = await adjustmentService.getAdjustment(id);
  return buildResponse(reply, 200, { data: result });
}

async function listAdjustments(req, reply) {
  const { warehouseId, status, sourceType, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await adjustmentService.listAdjustments(
    { warehouseId, status, sourceType, fromDate, toDate },
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

async function submitAdjustment(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await adjustmentService.submitAdjustment(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Adjustment submitted successfully',
  });
}

async function approveAdjustment(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await adjustmentService.approveAdjustment(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Adjustment approved successfully',
  });
}

async function postAdjustment(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await adjustmentService.postAdjustment(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Adjustment posted successfully',
  });
}

async function cancelAdjustment(req, reply) {
  const { id } = req.params;
  const { cancelReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await adjustmentService.cancelAdjustment(id, cancelReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Adjustment cancelled successfully',
  });
}

module.exports = {
  createAdjustment,
  getAdjustment,
  listAdjustments,
  submitAdjustment,
  approveAdjustment,
  postAdjustment,
  cancelAdjustment,
};
