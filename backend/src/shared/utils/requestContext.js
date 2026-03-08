/**
 * Request Context Builder
 */

const { v4: uuidv4 } = require('uuid');

function buildRequestContext(req) {
  return {
    userId: req.user?.id || req.headers['x-user-id'] || null,
    role: req.user?.role || req.headers['x-user-role'] || null,
    correlationId: req.headers['x-correlation-id'] || uuidv4(),
    sourceApp: req.headers['x-source-app'] || 'WEB',
    warehouseId: req.headers['x-warehouse-id'] || null,
  };
}

module.exports = {
  buildRequestContext,
};
