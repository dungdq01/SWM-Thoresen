/**
 * Sales Orders Module - Validation Schemas (Joi)
 */

const Joi = require('joi');

const CARGO_FORMS = [
  'BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG',
  'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER',
];

const ORDER_TYPES = ['STANDARD', 'CONSIGNMENT', 'INTERNAL'];

const SO_STATUSES = [
  'DRAFT', 'CONFIRMED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED',
  'SHIPPED', 'CLOSED', 'CANCELLED',
];

const SOURCE_APPS = ['WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM', 'SWM'];

// ── Line schema ──
const soLineSchema = Joi.object({
  itemId: Joi.string().uuid().required(),
  cargoForm: Joi.string().valid(...CARGO_FORMS).required(),
  uomId: Joi.string().uuid().required(),
  expectedQty: Joi.number().positive().required(),
  expectedQtyKg: Joi.number().positive().required(),
  unitPrice: Joi.number().min(0).optional().allow(null),
  bagCount: Joi.number().integer().positive().optional().allow(null),
  nominalWeightPerBag: Joi.number().positive().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, ''),
});

// ── Create SO ──
const createSalesOrderSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  externalSoNumber: Joi.string().max(100).optional().allow(null, ''),
  orderType: Joi.string().valid(...ORDER_TYPES).default('STANDARD'),
  ownerId: Joi.string().uuid().required(),
  customerId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().required(),
  expectedDeliveryDate: Joi.date().iso().optional().allow(null),
  deliveryAddress: Joi.string().max(500).optional().allow(null, ''),
  notes: Joi.string().max(2000).optional().allow(null, ''),
  currency: Joi.string().max(10).default('VND'),
  lines: Joi.array().items(soLineSchema).min(1).required(),
});

// ── Update SO (DRAFT only) ──
const updateSalesOrderSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  externalSoNumber: Joi.string().max(100).optional().allow(null, ''),
  expectedDeliveryDate: Joi.date().iso().optional().allow(null),
  deliveryAddress: Joi.string().max(500).optional().allow(null, ''),
  notes: Joi.string().max(2000).optional().allow(null, ''),
  lines: Joi.array().items(soLineSchema).min(1).optional(),
});

// ── Cancel SO ──
const cancelSalesOrderSchema = Joi.object({
  reasonCode: Joi.string().max(50).required(),
  note: Joi.string().max(500).optional().allow(null, ''),
});

// ── Close SO ──
const closeSalesOrderSchema = Joi.object({
  note: Joi.string().max(500).optional().allow(null, ''),
});

// ── Release Shipment from SO ──
const releaseLineSchema = Joi.object({
  soLineId: Joi.string().uuid().required(),
  releaseQtyKg: Joi.number().positive().required(),
  bagCount: Joi.number().integer().positive().optional().allow(null),
});

const releaseShipmentSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  vehicleNumber: Joi.string().max(30).required(),
  vehicleTypeId: Joi.string().uuid().optional().allow(null),
  lines: Joi.array().items(releaseLineSchema).min(1).required(),
});

// ── Query params ──
const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  soNumber: Joi.string().max(40).optional(),
  externalSoNumber: Joi.string().max(100).optional(),
  ownerId: Joi.string().uuid().optional(),
  customerId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  status: Joi.string().valid(...SO_STATUSES).optional(),
  orderType: Joi.string().valid(...ORDER_TYPES).optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
  search: Joi.string().max(100).optional(),
});

const dashboardQuerySchema = Joi.object({
  warehouseId: Joi.string().uuid().optional(),
  ownerId: Joi.string().uuid().optional(),
});

module.exports = {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  cancelSalesOrderSchema,
  closeSalesOrderSchema,
  releaseShipmentSchema,
  listQuerySchema,
  dashboardQuerySchema,
};
