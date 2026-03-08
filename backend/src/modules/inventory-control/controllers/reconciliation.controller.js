/**
 * Module 6: Inventory Control - Reconciliation Controller
 */

const reconciliationService = require('../services/reconciliation.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');
const { buildRequestContext } = require('../../../shared/utils/requestContext');

async function runReconciliation(req, reply) {
  const requestContext = buildRequestContext(req);
  const result = await reconciliationService.runReconciliation(req.body, requestContext);
  return buildResponse(reply, 201, {
    data: result,
    message: result.status === 'NO_MISMATCH' 
      ? 'Reconciliation completed with no mismatches' 
      : 'Reconciliation review created',
  });
}

async function getReconciliation(req, reply) {
  const { id } = req.params;
  const result = await reconciliationService.getReconciliation(id);
  return buildResponse(reply, 200, { data: result });
}

async function listReconciliations(req, reply) {
  const { warehouseId, status, severity, assignedTo, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await reconciliationService.listReconciliations(
    { warehouseId, status, severity, assignedTo, fromDate, toDate },
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

async function assignReconciliation(req, reply) {
  const { id } = req.params;
  const { assignedTo } = req.body;
  const requestContext = buildRequestContext(req);
  const result = await reconciliationService.assignReconciliation(id, assignedTo, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Reconciliation assigned successfully',
  });
}

async function resolveReconciliation(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await reconciliationService.resolveReconciliation(id, req.body, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Reconciliation resolved successfully',
  });
}

async function closeReconciliation(req, reply) {
  const { id } = req.params;
  const requestContext = buildRequestContext(req);
  const result = await reconciliationService.closeReconciliation(id, requestContext);
  return buildResponse(reply, 200, {
    data: result,
    message: 'Reconciliation closed successfully',
  });
}

module.exports = {
  runReconciliation,
  getReconciliation,
  listReconciliations,
  assignReconciliation,
  resolveReconciliation,
  closeReconciliation,
};
