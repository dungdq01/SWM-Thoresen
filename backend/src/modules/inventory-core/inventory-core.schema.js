/**
 * Module 3: Inventory Core Engine - Validation Schemas
 */

const Joi = require('joi');

const dimInputSchema = Joi.object({
  siteCode: Joi.string().max(50).optional(),
  warehouseCode: Joi.string().max(50).required(),
  locationCode: Joi.string().max(50).required(),
  ownerCode: Joi.string().max(50).required(),
  statusCode: Joi.string().max(30).required(),
});

const postingSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  correlationId: Joi.string().max(120).required(),
  eventCode: Joi.string().max(50).required(),
  refType: Joi.string().max(40).required(),
  refId: Joi.string().max(50).required(),
  refLineId: Joi.string().max(50).optional(),
  itemId: Joi.string().uuid().required(),
  qty: Joi.string().required(),
  uomCode: Joi.string().max(20).required(),
  dimFrom: dimInputSchema.optional(),
  dimTo: dimInputSchema.optional(),
  reasonCode: Joi.string().max(50).optional(),
  sourceApp: Joi.string().valid('WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM').required(),
  postedBy: Joi.string().uuid().optional(),
  weighbridgeTicketId: Joi.string().max(50).optional(),
});

const reversalSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  correlationId: Joi.string().max(120).required(),
  originalTransId: Joi.string().max(40).required(),
  reasonCode: Joi.string().max(50).required(),
  note: Joi.string().max(500).optional(),
  correctionRefType: Joi.string().max(40).optional(),
  correctionRefId: Joi.string().max(50).optional(),
});

const holdCreateSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  correlationId: Joi.string().max(120).required(),
  shipmentId: Joi.string().max(50).optional(),
  shipmentLineId: Joi.string().max(50).optional(),
  workHeaderId: Joi.string().max(50).optional(),
  itemId: Joi.string().uuid().required(),
  qty: Joi.string().required(),
  dim: dimInputSchema.required(),
  reasonCode: Joi.string().max(50).optional(),
});

const holdReleaseSchema = Joi.object({
  releaseQty: Joi.string().optional(),
  correlationId: Joi.string().max(120).required(),
});

const onhandQuerySchema = Joi.object({
  itemId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  locationId: Joi.string().uuid().optional(),
  ownerId: Joi.string().uuid().optional(),
  inventoryStatusId: Joi.string().uuid().optional(),
  hasStock: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
});

const transactionQuerySchema = Joi.object({
  itemId: Joi.string().uuid().optional(),
  ownerId: Joi.string().uuid().optional(),
  refType: Joi.string().max(40).optional(),
  refId: Joi.string().max(50).optional(),
  transType: Joi.string().optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  correlationId: Joi.string().max(120).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
});

const holdQuerySchema = Joi.object({
  itemId: Joi.string().uuid().optional(),
  inventDimId: Joi.string().uuid().optional(),
  status: Joi.string().valid('ACTIVE', 'PARTIALLY_RELEASED', 'RELEASED', 'CONSUMED', 'CANCELLED').optional(),
  shipmentId: Joi.string().max(50).optional(),
  ownerId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
});

module.exports = {
  dimInputSchema,
  postingSchema,
  reversalSchema,
  holdCreateSchema,
  holdReleaseSchema,
  onhandQuerySchema,
  transactionQuerySchema,
  holdQuerySchema,
};
