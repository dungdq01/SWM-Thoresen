/**
 * Module 4: Inbound Operations - Validation Schemas
 */

const Joi = require('joi');

const lineSchema = Joi.object({
  itemId: Joi.string().uuid().required(),
  uomId: Joi.string().uuid().required(),
  expectedQty: Joi.number().positive().required(),
  bagCount: Joi.number().integer().positive().optional(),
  nominalWeightPerBag: Joi.number().positive().optional(),
  cargoForm: Joi.string().valid(
    'BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG', 
    'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER'
  ).required(),
});

const createReceiptSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  receiptType: Joi.string().valid('STANDARD', 'VESSEL').default('STANDARD'),
  poId: Joi.string().max(50).required(),
  asnId: Joi.string().max(50).optional(),
  ownerId: Joi.string().uuid().required(),
  vendorId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().required(),
  receivingLocationId: Joi.string().uuid().optional(),
  vehicleNumber: Joi.string().max(30).required(),
  blNumber: Joi.string().max(50).optional(),
  expectedQty: Joi.number().positive().required(),
  sourceApp: Joi.string().valid('WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM').default('WEB'),
  lines: Joi.array().items(lineSchema).min(1).required(),
});

const confirmReceiptSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
});

const cancelReceiptSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  reasonCode: Joi.string().max(50).required(),
  note: Joi.string().max(500).optional(),
});

const weighInSchema = Joi.object({
  eventId: Joi.string().max(120).optional(),
  ticketId: Joi.string().max(80).optional(),
  grossWeightKg: Joi.number().positive().required(),
  eventTimestamp: Joi.date().iso().required(),
  sourceApp: Joi.string().valid('WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM').default('INTEGRATION'),
  rawPayload: Joi.object().optional(),
});

const weighOutSchema = Joi.object({
  eventId: Joi.string().max(120).optional(),
  ticketId: Joi.string().max(80).optional(),
  tareWeightKg: Joi.number().positive().required(),
  eventTimestamp: Joi.date().iso().required(),
  sourceApp: Joi.string().valid('WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM').default('INTEGRATION'),
  rawPayload: Joi.object().optional(),
});

const manualWeightSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  phase: Joi.string().valid('IN', 'OUT').required(),
  weightKg: Joi.number().positive().required(),
  reasonCode: Joi.string().max(50).required(),
  note: Joi.string().max(500).optional(),
});

const receiptQuerySchema = Joi.object({
  receiptNumber: Joi.string().max(40).optional(),
  vehicleNumber: Joi.string().max(30).optional(),
  blNumber: Joi.string().max(50).optional(),
  poId: Joi.string().max(50).optional(),
  asnId: Joi.string().max(50).optional(),
  status: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  ownerId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'receiptNumber', 'vehicleNumber', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// ── Purchase Order Schemas ──

const poLineSchema = Joi.object({
  itemId: Joi.string().uuid().required(),
  uomId: Joi.string().uuid().optional().allow(''),
  expectedQty: Joi.number().positive().required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const createPurchaseOrderSchema = Joi.object({
  poType: Joi.string().valid('SEA', 'LAND').default('SEA'),
  ownerId: Joi.string().uuid().required(),
  vendorId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().required(),
  vesselName: Joi.string().max(200).optional().allow(''),
  origin: Joi.string().max(200).optional().allow(''),
  blNumber: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  lines: Joi.array().items(poLineSchema).min(1).required(),
});

const updatePurchaseOrderSchema = Joi.object({
  poType: Joi.string().valid('SEA', 'LAND').optional(),
  ownerId: Joi.string().uuid().optional(),
  vendorId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  vesselName: Joi.string().max(200).optional().allow(''),
  origin: Joi.string().max(200).optional().allow(''),
  blNumber: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  rowVersion: Joi.number().integer().min(0).required(),
});

const cancelPurchaseOrderSchema = Joi.object({
  reasonCode: Joi.string().max(50).optional(),
  note: Joi.string().max(500).optional(),
});

const purchaseOrderQuerySchema = Joi.object({
  keyword: Joi.string().max(100).optional(),
  status: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  ownerId: Joi.string().uuid().optional(),
  vendorId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'poNumber', 'status', 'expectedDeliveryDate').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createReceiptSchema,
  confirmReceiptSchema,
  cancelReceiptSchema,
  weighInSchema,
  weighOutSchema,
  manualWeightSchema,
  receiptQuerySchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  purchaseOrderQuerySchema,
};
