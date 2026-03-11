/**
 * Sales Orders Module - Routes
 */

const express = require('express');
const { SalesOrderController } = require('./sales-order.controller');

const PERMISSION_CODES = {
  SO_VIEW: 'sales_order.view',
  SO_CREATE: 'sales_order.create',
  SO_UPDATE: 'sales_order.update',
  SO_CONFIRM: 'sales_order.confirm',
  SO_CANCEL: 'sales_order.cancel',
  SO_CLOSE: 'sales_order.close',
  SO_RELEASE: 'sales_order.release',
  DASHBOARD_VIEW: 'sales_order.dashboard.view',
};

function createSalesOrderRoutes(prisma, authMiddleware, permissionMiddleware) {
  const router = express.Router();
  const controller = new SalesOrderController(prisma);

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // Dashboard — static route FIRST to avoid :id collision
  router.get('/dashboard/summary',
    permissionMiddleware(PERMISSION_CODES.DASHBOARD_VIEW),
    (req, res) => controller.getDashboardSummary(req, res)
  );

  // CRUD
  router.post('/',
    permissionMiddleware(PERMISSION_CODES.SO_CREATE),
    (req, res) => controller.create(req, res)
  );

  router.get('/',
    permissionMiddleware(PERMISSION_CODES.SO_VIEW),
    (req, res) => controller.list(req, res)
  );

  router.get('/:id',
    permissionMiddleware(PERMISSION_CODES.SO_VIEW),
    (req, res) => controller.getById(req, res)
  );

  router.put('/:id',
    permissionMiddleware(PERMISSION_CODES.SO_UPDATE),
    (req, res) => controller.update(req, res)
  );

  // Actions
  router.post('/:id/confirm',
    permissionMiddleware(PERMISSION_CODES.SO_CONFIRM),
    (req, res) => controller.confirm(req, res)
  );

  router.post('/:id/cancel',
    permissionMiddleware(PERMISSION_CODES.SO_CANCEL),
    (req, res) => controller.cancel(req, res)
  );

  router.post('/:id/close',
    permissionMiddleware(PERMISSION_CODES.SO_CLOSE),
    (req, res) => controller.close(req, res)
  );

  router.post('/:id/release-shipment',
    permissionMiddleware(PERMISSION_CODES.SO_RELEASE),
    (req, res) => controller.releaseShipment(req, res)
  );

  // Queries
  router.get('/:id/fulfillment',
    permissionMiddleware(PERMISSION_CODES.SO_VIEW),
    (req, res) => controller.getFulfillment(req, res)
  );

  router.get('/:id/shipments',
    permissionMiddleware(PERMISSION_CODES.SO_VIEW),
    (req, res) => controller.getShipments(req, res)
  );

  router.get('/:id/history',
    permissionMiddleware(PERMISSION_CODES.SO_VIEW),
    (req, res) => controller.getHistory(req, res)
  );

  return router;
}

module.exports = { createSalesOrderRoutes, PERMISSION_CODES };
