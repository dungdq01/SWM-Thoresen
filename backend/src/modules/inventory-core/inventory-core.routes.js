/**
 * Module 3: Inventory Core Engine - Routes
 * All routes protected with RBAC middleware
 */

const express = require('express');
const { InventoryCoreController } = require('./inventory-core.controller');
const { authMiddleware, permissionMiddleware, PERMISSION_CODES } = require('./middleware/auth.middleware');

function createInventoryCoreRoutes(prisma, authorizationService, configService, options = {}) {
  const router = express.Router();
  const { createAuditLogAdapter } = require('./infra/audit-log.adapter');

  // Try to resolve LogService from M1 Foundation for audit trail
  let auditLogAdapter = null;
  try {
    const logService = options.logService || null;
    auditLogAdapter = createAuditLogAdapter(logService);
  } catch (_) {
    // Graceful degradation if LogService unavailable
  }

  const controller = new InventoryCoreController(prisma, auditLogAdapter);

  // When embedded in NestJS, skip Express auth middleware (NestJS guards handle auth)
  const skipAuth = options.skipAuth === true;
  const auth = skipAuth ? [] : [authMiddleware(authorizationService, configService)];
  const perm = (code) => skipAuth ? [] : [permissionMiddleware(code)];

  // Posting APIs
  router.post('/postings',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.postInventory(req, res)
  );
  router.post('/postings/reverse',
    ...auth,
    ...perm(PERMISSION_CODES.REVERSAL_CREATE),
    (req, res) => controller.reversePosting(req, res)
  );

  // On-Hand Query APIs
  router.get('/onhand',
    ...auth,
    ...perm(PERMISSION_CODES.ONHAND_READ),
    (req, res) => controller.queryOnHand(req, res)
  );
  router.get('/onhand/availability',
    ...auth,
    ...perm(PERMISSION_CODES.ONHAND_READ),
    (req, res) => controller.checkAvailability(req, res)
  );

  // Transaction Query APIs
  router.get('/transactions',
    ...auth,
    ...perm(PERMISSION_CODES.TRANSACTION_READ),
    (req, res) => controller.queryTransactions(req, res)
  );
  router.get('/transactions/:transId',
    ...auth,
    ...perm(PERMISSION_CODES.TRANSACTION_READ),
    (req, res) => controller.getTransaction(req, res)
  );

  // Hold APIs
  router.post('/holds',
    ...auth,
    ...perm(PERMISSION_CODES.HOLD_CREATE),
    (req, res) => controller.createHold(req, res)
  );
  router.get('/holds',
    ...auth,
    ...perm(PERMISSION_CODES.HOLD_READ),
    (req, res) => controller.queryHolds(req, res)
  );
  router.get('/holds/:holdId',
    ...auth,
    ...perm(PERMISSION_CODES.HOLD_READ),
    (req, res) => controller.getHold(req, res)
  );
  router.post('/holds/:holdId/release',
    ...auth,
    ...perm(PERMISSION_CODES.HOLD_RELEASE),
    (req, res) => controller.releaseHold(req, res)
  );
  router.post('/holds/:holdId/cancel',
    ...auth,
    ...perm(PERMISSION_CODES.HOLD_CANCEL),
    (req, res) => controller.cancelHold(req, res)
  );

  // Reconciliation APIs
  router.post('/reconciliation/runs',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.createReconciliationRun(req, res)
  );
  router.get('/reconciliation/runs',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_READ),
    (req, res) => controller.listReconciliationRuns(req, res)
  );
  router.get('/reconciliation/runs/:runId',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_READ),
    (req, res) => controller.getReconciliationRun(req, res)
  );
  router.post('/reconciliation/results/:resultId/review',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.reviewReconciliationResult(req, res)
  );
  router.post('/reconciliation/results/:resultId/resolve',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.resolveReconciliationResult(req, res)
  );

  // Snapshot APIs
  router.post('/snapshots/runs',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.createSnapshotRun(req, res)
  );
  router.get('/snapshots/runs',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_READ),
    (req, res) => controller.listSnapshotRuns(req, res)
  );
  router.get('/snapshots/runs/:runId',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_READ),
    (req, res) => controller.getSnapshotRun(req, res)
  );
  router.get('/snapshots/billing',
    ...auth,
    ...perm(PERMISSION_CODES.ONHAND_READ),
    (req, res) => controller.getSnapshotsForBilling(req, res)
  );
  router.get('/snapshots/billing/aggregate',
    ...auth,
    ...perm(PERMISSION_CODES.ONHAND_READ),
    (req, res) => controller.aggregateSnapshotsForBilling(req, res)
  );

  // Materialization / Rebuild
  router.post('/materialization/rebuild',
    ...auth,
    ...perm(PERMISSION_CODES.POSTING_CREATE),
    (req, res) => controller.rebuildOnHand(req, res)
  );

  return router;
}

module.exports = { createInventoryCoreRoutes };
