/**
 * Module 7: Work Execution - Validation Schemas
 */

const Joi = require('joi');

const claimWorkSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
});

const releaseWorkSchema = Joi.object({
  reasonCode: Joi.string().max(50).optional(),
});

const startWorkSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
});

const cancelWorkSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  reasonCode: Joi.string().max(50).required(),
  remark: Joi.string().max(500).optional(),
});

const startLineSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
});

const completeLineSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  actualQty: Joi.number().positive().required(),
  scannedLocationCode: Joi.string().max(50).optional(),
  scannedLocationId: Joi.string().uuid().optional(),
  reasonCode: Joi.string().max(50).optional(),
  evidenceText: Joi.string().max(1000).optional(),
  deviceEventTime: Joi.date().iso().optional(),
});

const skipLineSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  reasonCode: Joi.string().max(50).required(),
  remark: Joi.string().max(500).optional(),
});

const managerOverrideSchema = Joi.object({
  lineNum: Joi.number().integer().positive().required(),
  externalId: Joi.string().max(120).optional(),
  actualQty: Joi.number().positive().required(),
  reasonCode: Joi.string().max(50).required(),
  evidenceText: Joi.string().min(10).max(1000).required(),
  scannedLocationCode: Joi.string().max(50).optional(),
});

const validateScanSchema = Joi.object({
  workId: Joi.string().max(40).required(),
  lineNum: Joi.number().integer().positive().required(),
  scannedLocationCode: Joi.string().max(50).required(),
});

const syncEventSchema = Joi.object({
  externalId: Joi.string().max(120).required(),
  sequenceNo: Joi.number().integer().required(),
  eventType: Joi.string().valid('START_LINE', 'COMPLETE_LINE', 'SKIP_LINE').required(),
  workId: Joi.string().max(40).required(),
  workLineId: Joi.string().uuid().optional(),
  payload: Joi.object({
    lineNum: Joi.number().integer().positive().required(),
    actualQty: Joi.number().positive().optional(),
    scannedLocationCode: Joi.string().max(50).optional(),
    reasonCode: Joi.string().max(50).optional(),
    remark: Joi.string().max(500).optional(),
  }).required(),
});

const syncBatchSchema = Joi.object({
  batchExternalId: Joi.string().max(40).required(),
  deviceId: Joi.string().max(80).required(),
  correlationId: Joi.string().uuid().optional(),
  events: Joi.array().items(syncEventSchema).min(1).max(100).required(),
});

const generateWorkSchema = Joi.object({
  externalId: Joi.string().max(120).optional(),
  correlationId: Joi.string().uuid().optional(),
  workType: Joi.string().valid('PUTAWAY', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT').required(),
  warehouseId: Joi.string().uuid().required(),
  zoneId: Joi.string().uuid().optional(),
  sourceModule: Joi.string().valid('M4', 'M5', 'M6', 'MANUAL').required(),
  sourceType: Joi.string().valid('RECEIPT', 'SHIPMENT', 'MOVE_ORDER', 'TRANSFER_ORDER').required(),
  sourceRefId: Joi.string().max(50).required(),
  sourceRefLineId: Joi.string().max(50).optional(),
  sourceOwnerId: Joi.string().uuid().optional(),
  priorityNo: Joi.number().integer().min(1).max(100).optional(),
  assignmentMode: Joi.string().valid('SELF_CLAIM', 'DIRECTED').optional(),
  lines: Joi.array().items(Joi.object({
    stepType: Joi.string().valid('PUT', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT').optional(),
    itemId: Joi.string().uuid().required(),
    ownerId: Joi.string().uuid().required(),
    fromWarehouseId: Joi.string().uuid().optional(),
    fromLocationId: Joi.string().uuid().optional(),
    toWarehouseId: Joi.string().uuid().optional(),
    toLocationId: Joi.string().uuid().optional(),
    expectedQty: Joi.number().positive().required(),
    uom: Joi.string().max(20).required(),
    inventoryStatusFrom: Joi.string().max(30).optional(),
    inventoryStatusTo: Joi.string().max(30).optional(),
  })).min(1).required(),
});

const listWorksQuerySchema = Joi.object({
  warehouseId: Joi.string().uuid().optional(),
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
  workType: Joi.string().valid('PUTAWAY', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT').optional(),
  assignedTo: Joi.string().uuid().optional(),
  sourceModule: Joi.string().valid('M4', 'M5', 'M6', 'MANUAL').optional(),
  sourceRefId: Joi.string().max(50).optional(),
  createdFrom: Joi.date().iso().optional(),
  createdTo: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const availableWorksQuerySchema = Joi.object({
  warehouseId: Joi.string().uuid().required(),
  workTypes: Joi.array().items(Joi.string().valid('PUTAWAY', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT')).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(20),
});

const myWorksQuerySchema = Joi.object({
  statuses: Joi.array().items(Joi.string().valid('OPEN', 'IN_PROGRESS', 'COMPLETED')).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(20),
});

function validateRequest(schema) {
  return (req, res, next) => {
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    const { error, value } = schema.validate(dataToValidate, { abortEarly: false, stripUnknown: true });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        },
      });
    }
    
    if (req.method === 'GET') {
      req.validatedQuery = value;
    } else {
      req.validatedBody = value;
    }
    next();
  };
}

module.exports = {
  claimWorkSchema,
  releaseWorkSchema,
  startWorkSchema,
  cancelWorkSchema,
  startLineSchema,
  completeLineSchema,
  skipLineSchema,
  managerOverrideSchema,
  validateScanSchema,
  syncBatchSchema,
  generateWorkSchema,
  listWorksQuerySchema,
  availableWorksQuerySchema,
  myWorksQuerySchema,
  validateRequest,
};
