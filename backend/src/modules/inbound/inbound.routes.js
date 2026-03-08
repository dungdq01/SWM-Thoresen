/**
 * Module 4: Inbound Operations - Routes
 */

const express = require('express');
const { InboundController } = require('./inbound.controller');

const PERMISSION_CODES = {
  RECEIPT_CREATE: 'INBOUND.RECEIPT.CREATE',
  RECEIPT_READ: 'INBOUND.RECEIPT.READ',
  RECEIPT_CONFIRM: 'INBOUND.RECEIPT.CONFIRM',
  RECEIPT_CANCEL: 'INBOUND.RECEIPT.CANCEL',
  RECEIPT_REWEIGH: 'INBOUND.RECEIPT.REWEIGH',
  RECEIPT_CLOSE: 'INBOUND.RECEIPT.CLOSE',
  WEIGH_RECEIVE: 'INBOUND.WEIGH.RECEIVE',
  DASHBOARD_READ: 'INBOUND.DASHBOARD.READ',
};

function createInboundRoutes(prisma, authMiddleware, permissionMiddleware) {
  const router = express.Router();
  const controller = new InboundController(prisma);

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // Receipt CRUD
  router.post('/receipts',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_CREATE),
    (req, res) => controller.createReceipt(req, res)
  );

  router.get('/receipts',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_READ),
    (req, res) => controller.listReceipts(req, res)
  );

  router.get('/receipts/:id',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_READ),
    (req, res) => controller.getReceipt(req, res)
  );

  router.get('/receipts/:id/history',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_READ),
    (req, res) => controller.getReceiptHistory(req, res)
  );

  // Receipt Commands
  router.post('/receipts/:id/confirm',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_CONFIRM),
    (req, res) => controller.confirmReceipt(req, res)
  );

  router.post('/receipts/:id/cancel',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_CANCEL),
    (req, res) => controller.cancelReceipt(req, res)
  );

  router.post('/receipts/:id/reweigh',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_REWEIGH),
    (req, res) => controller.reweighReceipt(req, res)
  );

  router.post('/receipts/:id/close',
    permissionMiddleware(PERMISSION_CODES.RECEIPT_CLOSE),
    (req, res) => controller.closeReceipt(req, res)
  );

  router.post('/receipts/:id/start-processing',
    permissionMiddleware(PERMISSION_CODES.WEIGH_RECEIVE),
    (req, res) => controller.startProcessing(req, res)
  );

  // Weigh Events
  router.post('/weigh-events/in',
    permissionMiddleware(PERMISSION_CODES.WEIGH_RECEIVE),
    (req, res) => controller.receiveWeighIn(req, res)
  );

  router.post('/weigh-events/out',
    permissionMiddleware(PERMISSION_CODES.WEIGH_RECEIVE),
    (req, res) => controller.receiveWeighOut(req, res)
  );

  // Dashboard
  router.get('/dashboard/summary',
    permissionMiddleware(PERMISSION_CODES.DASHBOARD_READ),
    (req, res) => controller.getDashboardSummary(req, res)
  );

  return router;
}

module.exports = { createInboundRoutes, PERMISSION_CODES };
