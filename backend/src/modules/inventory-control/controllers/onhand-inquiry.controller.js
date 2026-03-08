/**
 * Module 6: Inventory Control - On-Hand Inquiry Controller
 */

const onhandInquiryService = require('../services/onhand-inquiry.service');
const { buildPagination, buildResponse } = require('../../../shared/utils/responseBuilder');

async function getOnHand(req, reply) {
  const { warehouseId, locationId, ownerId, itemId, inventoryStatusId, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await onhandInquiryService.getOnHandSummary(
    { warehouseId, locationId, ownerId, itemId, inventoryStatusId },
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

async function getOnHandByItem(req, reply) {
  const { itemId } = req.params;
  const { warehouseId, ownerId } = req.query;

  const result = await onhandInquiryService.getOnHandByItem(itemId, { warehouseId, ownerId });

  return buildResponse(reply, 200, { data: result });
}

async function getMovementHistory(req, reply) {
  const { itemId, ownerId, warehouseId, transType, refType, fromDate, toDate, page = 1, limit = 50 } = req.query;
  const pagination = buildPagination(page, limit);

  const result = await onhandInquiryService.getMovementHistory(
    { itemId, ownerId, warehouseId, transType, refType, fromDate, toDate },
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

module.exports = {
  getOnHand,
  getOnHandByItem,
  getMovementHistory,
};
