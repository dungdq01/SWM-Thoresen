/**
 * Sales Orders Module - Entry Point
 */

const { createSalesOrderRoutes, PERMISSION_CODES } = require('./sales-order.routes');
const { SalesOrderService } = require('./application/sales-order.service');
const { SalesOrderController } = require('./sales-order.controller');

module.exports = {
  createSalesOrderRoutes,
  SalesOrderService,
  SalesOrderController,
  PERMISSION_CODES,
};
