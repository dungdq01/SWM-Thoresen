/**
 * Module 7: Work Execution - Routes
 */

const express = require('express');
const { WorkExecutionController } = require('./work-execution.controller');
const {
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
} = require('./work-execution.schema');

const PERMISSION_CODES = {
  WORK_READ: 'WORK.EXECUTION.READ',
  WORK_CLAIM: 'WORK.EXECUTION.CLAIM',
  WORK_START: 'WORK.EXECUTION.START',
  WORK_COMPLETE: 'WORK.EXECUTION.COMPLETE',
  WORK_SKIP: 'WORK.EXECUTION.SKIP',
  WORK_CANCEL: 'WORK.EXECUTION.CANCEL',
  WORK_OVERRIDE: 'WORK.EXECUTION.OVERRIDE',
  WORK_GENERATE: 'WORK.EXECUTION.GENERATE',
  MOBILE_SYNC: 'WORK.MOBILE.SYNC',
  DASHBOARD_READ: 'WORK.DASHBOARD.READ',
};

function createWorkExecutionRoutes(prisma, authMiddleware, permissionMiddleware, postingEngine, locationRepo, numberSequenceService) {
  const router = express.Router();
  const controller = new WorkExecutionController(prisma, postingEngine, locationRepo, numberSequenceService);

  router.use(authMiddleware);

  // Query APIs
  router.get('/works',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    validateRequest(listWorksQuerySchema),
    (req, res) => controller.listWorks(req, res)
  );

  router.get('/works/dashboard/summary',
    permissionMiddleware(PERMISSION_CODES.DASHBOARD_READ),
    (req, res) => controller.getDashboardSummary(req, res)
  );

  router.get('/works/:id',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    (req, res) => controller.getWork(req, res)
  );

  router.get('/works/:id/history',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    (req, res) => controller.getWorkHistory(req, res)
  );

  router.get('/works/:id/exceptions',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    (req, res) => controller.getWorkExceptions(req, res)
  );

  // Command APIs - Header Level
  router.post('/works/:id/claim',
    permissionMiddleware(PERMISSION_CODES.WORK_CLAIM),
    validateRequest(claimWorkSchema),
    (req, res) => controller.claimWork(req, res)
  );

  router.post('/works/:id/release',
    permissionMiddleware(PERMISSION_CODES.WORK_CLAIM),
    validateRequest(releaseWorkSchema),
    (req, res) => controller.releaseWork(req, res)
  );

  router.post('/works/:id/start',
    permissionMiddleware(PERMISSION_CODES.WORK_START),
    validateRequest(startWorkSchema),
    (req, res) => controller.startWork(req, res)
  );

  router.post('/works/:id/cancel',
    permissionMiddleware(PERMISSION_CODES.WORK_CANCEL),
    validateRequest(cancelWorkSchema),
    (req, res) => controller.cancelWork(req, res)
  );

  // Command APIs - Line Level
  router.post('/works/:id/lines/:lineNum/start',
    permissionMiddleware(PERMISSION_CODES.WORK_START),
    validateRequest(startLineSchema),
    (req, res) => controller.startLine(req, res)
  );

  router.post('/works/:id/lines/:lineNum/complete',
    permissionMiddleware(PERMISSION_CODES.WORK_COMPLETE),
    validateRequest(completeLineSchema),
    (req, res) => controller.completeLine(req, res)
  );

  router.post('/works/:id/lines/:lineNum/skip',
    permissionMiddleware(PERMISSION_CODES.WORK_SKIP),
    validateRequest(skipLineSchema),
    (req, res) => controller.skipLine(req, res)
  );

  router.post('/works/:id/manager-override-complete',
    permissionMiddleware(PERMISSION_CODES.WORK_OVERRIDE),
    validateRequest(managerOverrideSchema),
    (req, res) => controller.managerOverrideComplete(req, res)
  );

  // Mobile APIs
  router.get('/mobile/works/available',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    validateRequest(availableWorksQuerySchema),
    (req, res) => controller.getAvailableWorks(req, res)
  );

  router.get('/mobile/works/my',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    validateRequest(myWorksQuerySchema),
    (req, res) => controller.getMyWorks(req, res)
  );

  router.post('/mobile/scan/validate',
    permissionMiddleware(PERMISSION_CODES.WORK_READ),
    validateRequest(validateScanSchema),
    (req, res) => controller.validateScan(req, res)
  );

  router.post('/mobile/works/sync',
    permissionMiddleware(PERMISSION_CODES.MOBILE_SYNC),
    validateRequest(syncBatchSchema),
    (req, res) => controller.syncBatch(req, res)
  );

  // Internal API for M4/M5/M6 triggers
  router.post('/internal/works/generate',
    permissionMiddleware(PERMISSION_CODES.WORK_GENERATE),
    validateRequest(generateWorkSchema),
    (req, res) => controller.generateWork(req, res)
  );

  return router;
}

module.exports = { createWorkExecutionRoutes, PERMISSION_CODES };
