/**
 * Module 6: Inventory Control - Routes
 */

const onhandInquiryController = require('./controllers/onhand-inquiry.controller');
const moveOrderController = require('./controllers/move-order.controller');
const transferOrderController = require('./controllers/transfer-order.controller');
const statusChangeController = require('./controllers/status-change.controller');
const cycleCountController = require('./controllers/cycle-count.controller');
const adjustmentController = require('./controllers/adjustment.controller');
const reconciliationController = require('./controllers/reconciliation.controller');

async function routes(fastify, options) {
  // ========== On-Hand Inquiry Routes ==========
  fastify.get('/on-hand', onhandInquiryController.getOnHand);
  fastify.get('/on-hand/:itemId', onhandInquiryController.getOnHandByItem);
  fastify.get('/movement-history', onhandInquiryController.getMovementHistory);

  // ========== Move Order Routes ==========
  fastify.post('/moves', moveOrderController.createMoveOrder);
  fastify.get('/moves', moveOrderController.listMoveOrders);
  fastify.get('/moves/:id', moveOrderController.getMoveOrder);
  fastify.post('/moves/:id/confirm', moveOrderController.confirmMoveOrder);
  fastify.post('/moves/:id/execute', moveOrderController.executeMoveOrder);
  fastify.post('/moves/:id/cancel', moveOrderController.cancelMoveOrder);

  // ========== Transfer Order Routes ==========
  fastify.post('/transfers', transferOrderController.createTransferOrder);
  fastify.get('/transfers', transferOrderController.listTransferOrders);
  fastify.get('/transfers/aging', transferOrderController.getAgingTransfers);
  fastify.get('/transfers/:id', transferOrderController.getTransferOrder);
  fastify.post('/transfers/:id/release', transferOrderController.releaseTransferOrder);
  fastify.post('/transfers/:id/ship', transferOrderController.shipTransferOrder);
  fastify.post('/transfers/:id/receive', transferOrderController.receiveTransferOrder);
  fastify.post('/transfers/:id/close', transferOrderController.closeTransferOrder);
  fastify.post('/transfers/:id/cancel', transferOrderController.cancelTransferOrder);

  // ========== Status Change Routes ==========
  fastify.post('/status-changes', statusChangeController.createStatusChange);
  fastify.get('/status-changes', statusChangeController.listStatusChanges);
  fastify.get('/status-changes/:id', statusChangeController.getStatusChange);
  fastify.post('/status-changes/:id/cancel', statusChangeController.cancelStatusChange);
  fastify.post('/status-changes/:id/reverse', statusChangeController.reverseStatusChange);

  // ========== Cycle Count Routes ==========
  fastify.post('/cycle-count-plans', cycleCountController.createCycleCountPlan);
  fastify.post('/cycle-counts', cycleCountController.createCycleCount);
  fastify.get('/cycle-counts', cycleCountController.listCycleCounts);
  fastify.get('/cycle-counts/:id', cycleCountController.getCycleCount);
  fastify.post('/cycle-counts/:id/release', cycleCountController.releaseCycleCount);
  fastify.post('/cycle-counts/:id/submit', cycleCountController.submitCycleCount);
  fastify.post('/cycle-counts/:id/recount', cycleCountController.recountCycleCount);
  fastify.post('/cycle-counts/:id/approve', cycleCountController.approveCycleCount);
  fastify.post('/cycle-counts/:id/post', cycleCountController.postCycleCount);
  fastify.post('/cycle-counts/:id/cancel', cycleCountController.cancelCycleCount);

  // ========== Adjustment Routes ==========
  fastify.post('/adjustments', adjustmentController.createAdjustment);
  fastify.get('/adjustments', adjustmentController.listAdjustments);
  fastify.get('/adjustments/:id', adjustmentController.getAdjustment);
  fastify.post('/adjustments/:id/submit', adjustmentController.submitAdjustment);
  fastify.post('/adjustments/:id/approve', adjustmentController.approveAdjustment);
  fastify.post('/adjustments/:id/post', adjustmentController.postAdjustment);
  fastify.post('/adjustments/:id/cancel', adjustmentController.cancelAdjustment);

  // ========== Reconciliation Routes ==========
  fastify.post('/reconciliation-reviews/run', reconciliationController.runReconciliation);
  fastify.get('/reconciliation-reviews', reconciliationController.listReconciliations);
  fastify.get('/reconciliation-reviews/:id', reconciliationController.getReconciliation);
  fastify.post('/reconciliation-reviews/:id/assign', reconciliationController.assignReconciliation);
  fastify.post('/reconciliation-reviews/:id/resolve', reconciliationController.resolveReconciliation);
  fastify.post('/reconciliation-reviews/:id/close', reconciliationController.closeReconciliation);
}

module.exports = routes;
