/**
 * Module 6: Inventory Control - Routes
 * All routes protected with RBAC middleware
 */

const onhandInquiryController = require('./controllers/onhand-inquiry.controller');
const moveOrderController = require('./controllers/move-order.controller');
const transferOrderController = require('./controllers/transfer-order.controller');
const statusChangeController = require('./controllers/status-change.controller');
const cycleCountController = require('./controllers/cycle-count.controller');
const adjustmentController = require('./controllers/adjustment.controller');
const reconciliationController = require('./controllers/reconciliation.controller');
const { authPreHandler, permissionPreHandler, PERMISSION_CODES } = require('./middleware/auth.middleware');

async function routes(fastify, options) {
  const { authorizationService, configService } = options;
  const auth = authPreHandler(authorizationService, configService);

  // ========== On-Hand Inquiry Routes ==========
  fastify.get('/on-hand', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ONHAND_READ)],
    handler: onhandInquiryController.getOnHand,
  });
  fastify.get('/on-hand/:itemId', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ONHAND_READ)],
    handler: onhandInquiryController.getOnHandByItem,
  });
  fastify.get('/movement-history', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVEMENT_READ)],
    handler: onhandInquiryController.getMovementHistory,
  });

  // ========== Move Order Routes ==========
  fastify.post('/moves', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_CREATE)],
    handler: moveOrderController.createMoveOrder,
  });
  fastify.get('/moves', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_READ)],
    handler: moveOrderController.listMoveOrders,
  });
  fastify.get('/moves/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_READ)],
    handler: moveOrderController.getMoveOrder,
  });
  fastify.post('/moves/:id/confirm', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_CONFIRM)],
    handler: moveOrderController.confirmMoveOrder,
  });
  fastify.post('/moves/:id/execute', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_EXECUTE)],
    handler: moveOrderController.executeMoveOrder,
  });
  fastify.post('/moves/:id/cancel', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.MOVE_CANCEL)],
    handler: moveOrderController.cancelMoveOrder,
  });

  // ========== Transfer Order Routes ==========
  fastify.post('/transfers', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_CREATE)],
    handler: transferOrderController.createTransferOrder,
  });
  fastify.get('/transfers', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_READ)],
    handler: transferOrderController.listTransferOrders,
  });
  fastify.get('/transfers/aging', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_READ)],
    handler: transferOrderController.getAgingTransfers,
  });
  fastify.get('/transfers/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_READ)],
    handler: transferOrderController.getTransferOrder,
  });
  fastify.post('/transfers/:id/release', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_RELEASE)],
    handler: transferOrderController.releaseTransferOrder,
  });
  fastify.post('/transfers/:id/ship', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_SHIP)],
    handler: transferOrderController.shipTransferOrder,
  });
  fastify.post('/transfers/:id/receive', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_RECEIVE)],
    handler: transferOrderController.receiveTransferOrder,
  });
  fastify.post('/transfers/:id/close', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_CLOSE)],
    handler: transferOrderController.closeTransferOrder,
  });
  fastify.post('/transfers/:id/cancel', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.TRANSFER_CANCEL)],
    handler: transferOrderController.cancelTransferOrder,
  });

  // ========== Status Change Routes ==========
  fastify.post('/status-changes', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.STATUS_CREATE)],
    handler: statusChangeController.createStatusChange,
  });
  fastify.get('/status-changes', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.STATUS_READ)],
    handler: statusChangeController.listStatusChanges,
  });
  fastify.get('/status-changes/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.STATUS_READ)],
    handler: statusChangeController.getStatusChange,
  });
  fastify.post('/status-changes/:id/cancel', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.STATUS_CANCEL)],
    handler: statusChangeController.cancelStatusChange,
  });
  fastify.post('/status-changes/:id/reverse', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.STATUS_REVERSE)],
    handler: statusChangeController.reverseStatusChange,
  });

  // ========== Cycle Count Routes ==========
  fastify.post('/cycle-count-plans', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_CREATE)],
    handler: cycleCountController.createCycleCountPlan,
  });
  fastify.post('/cycle-counts', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_CREATE)],
    handler: cycleCountController.createCycleCount,
  });
  fastify.get('/cycle-counts', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_READ)],
    handler: cycleCountController.listCycleCounts,
  });
  fastify.get('/cycle-counts/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_READ)],
    handler: cycleCountController.getCycleCount,
  });
  fastify.post('/cycle-counts/:id/release', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_RELEASE)],
    handler: cycleCountController.releaseCycleCount,
  });
  fastify.post('/cycle-counts/:id/submit', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_SUBMIT)],
    handler: cycleCountController.submitCycleCount,
  });
  fastify.post('/cycle-counts/:id/recount', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_SUBMIT)],
    handler: cycleCountController.recountCycleCount,
  });
  fastify.post('/cycle-counts/:id/approve', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_APPROVE)],
    handler: cycleCountController.approveCycleCount,
  });
  fastify.post('/cycle-counts/:id/post', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_POST)],
    handler: cycleCountController.postCycleCount,
  });
  fastify.post('/cycle-counts/:id/cancel', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.CYCLE_COUNT_CANCEL)],
    handler: cycleCountController.cancelCycleCount,
  });

  // ========== Adjustment Routes ==========
  fastify.post('/adjustments', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_CREATE)],
    handler: adjustmentController.createAdjustment,
  });
  fastify.get('/adjustments', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_READ)],
    handler: adjustmentController.listAdjustments,
  });
  fastify.get('/adjustments/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_READ)],
    handler: adjustmentController.getAdjustment,
  });
  fastify.post('/adjustments/:id/submit', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_SUBMIT)],
    handler: adjustmentController.submitAdjustment,
  });
  fastify.post('/adjustments/:id/approve', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_APPROVE)],
    handler: adjustmentController.approveAdjustment,
  });
  fastify.post('/adjustments/:id/post', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_POST)],
    handler: adjustmentController.postAdjustment,
  });
  fastify.post('/adjustments/:id/cancel', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ADJUSTMENT_CANCEL)],
    handler: adjustmentController.cancelAdjustment,
  });

  // ========== Reconciliation Routes ==========
  fastify.post('/reconciliation-reviews/run', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_RUN)],
    handler: reconciliationController.runReconciliation,
  });
  fastify.get('/reconciliation-reviews', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_READ)],
    handler: reconciliationController.listReconciliations,
  });
  fastify.get('/reconciliation-reviews/:id', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_READ)],
    handler: reconciliationController.getReconciliation,
  });
  fastify.post('/reconciliation-reviews/:id/assign', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_ASSIGN)],
    handler: reconciliationController.assignReconciliation,
  });
  fastify.post('/reconciliation-reviews/:id/resolve', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_RESOLVE)],
    handler: reconciliationController.resolveReconciliation,
  });
  fastify.post('/reconciliation-reviews/:id/close', {
    preHandler: [auth, permissionPreHandler(PERMISSION_CODES.RECONCILIATION_CLOSE)],
    handler: reconciliationController.closeReconciliation,
  });
}

module.exports = routes;
