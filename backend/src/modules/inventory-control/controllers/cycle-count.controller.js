/**
 * Module 6: Inventory Control - Cycle Count Controller
 */

const cycleCountService = require('../services/cycle-count.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function createCycleCountPlan(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.createCycleCountPlan(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Cycle count plan created successfully',
  });
}

async function createCycleCount(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.createCycleCount(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: 'Cycle count created successfully',
  });
}

async function getCycleCount(req, reply) {
  const { id } = req.params;
  const result = await cycleCountService.getCycleCount(id);
  return buildResponse(reply, 200, { data: result });
}

async function listCycleCounts(req, reply) {
  const { warehouseId, status, cycleCountPlanId, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await cycleCountService.listCycleCounts(
    { warehouseId, status, cycleCountPlanId, fromDate, toDate },
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

async function releaseCycleCount(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.releaseCycleCount(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Cycle count released successfully',
  });
}

async function submitCycleCount(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.submitCycleCount(id, req.body, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Cycle count submitted successfully',
  });
}

async function recountCycleCount(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.recountCycleCount(id, req.body, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Recount requested successfully',
  });
}

async function approveCycleCount(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.approveCycleCount(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Cycle count approved successfully',
  });
}

async function postCycleCount(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.postCycleCount(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Cycle count posted successfully',
  });
}

async function cancelCycleCount(req, reply) {
  const { id } = req.params;
  const { cancelReasonCode } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await cycleCountService.cancelCycleCount(id, cancelReasonCode, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Cycle count cancelled successfully',
  });
}

module.exports = {
  createCycleCountPlan,
  createCycleCount,
  getCycleCount,
  listCycleCounts,
  releaseCycleCount,
  submitCycleCount,
  recountCycleCount,
  approveCycleCount,
  postCycleCount,
  cancelCycleCount,
};
