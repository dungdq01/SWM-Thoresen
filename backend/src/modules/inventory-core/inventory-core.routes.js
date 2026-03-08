/**
 * Module 3: Inventory Core Engine - Routes
 */

const express = require('express');
const { InventoryCoreController } = require('./inventory-core.controller');

function createInventoryCoreRoutes(prisma) {
  const router = express.Router();
  const controller = new InventoryCoreController(prisma);

  // Posting APIs
  router.post('/postings', (req, res) => controller.postInventory(req, res));
  router.post('/postings/reverse', (req, res) => controller.reversePosting(req, res));

  // On-Hand Query APIs
  router.get('/onhand', (req, res) => controller.queryOnHand(req, res));
  router.get('/onhand/availability', (req, res) => controller.checkAvailability(req, res));

  // Transaction Query APIs
  router.get('/transactions', (req, res) => controller.queryTransactions(req, res));
  router.get('/transactions/:transId', (req, res) => controller.getTransaction(req, res));

  // Hold APIs
  router.post('/holds', (req, res) => controller.createHold(req, res));
  router.get('/holds', (req, res) => controller.queryHolds(req, res));
  router.get('/holds/:holdId', (req, res) => controller.getHold(req, res));
  router.post('/holds/:holdId/release', (req, res) => controller.releaseHold(req, res));
  router.post('/holds/:holdId/cancel', (req, res) => controller.cancelHold(req, res));

  return router;
}

module.exports = { createInventoryCoreRoutes };
