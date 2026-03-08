/**
 * Module 7: Work Execution & Mobile Operations
 * 
 * This module handles warehouse work execution including:
 * - Putaway work (from M4 Inbound)
 * - Pick work (from M5 Outbound)
 * - Move/Transfer work (from M6 Inventory Control)
 * - Mobile sync and offline support
 * - Exception handling and SLA tracking
 */

const { createWorkExecutionRoutes, PERMISSION_CODES } = require('./work-execution.routes');
const { WorkExecutionController } = require('./work-execution.controller');

const { WorkHeaderRepository } = require('./infra/workHeader.repository');
const { WorkLineRepository } = require('./infra/workLine.repository');
const { WorkEventRepository } = require('./infra/workEvent.repository');
const { WorkExceptionRepository } = require('./infra/workException.repository');
const { WorkOutboxRepository } = require('./infra/workOutbox.repository');
const { MobileSyncRepository } = require('./infra/mobileSync.repository');
const { InventoryAdapter } = require('./infra/inventoryAdapter');
const { AuditLogAdapter } = require('./infra/auditLogAdapter');

const { GenerateWorkUseCase } = require('./application/generateWork.usecase');
const { DeliverOutboxUseCase } = require('./application/deliverOutbox.usecase');
const { ClaimWorkUseCase, ReleaseWorkUseCase } = require('./application/claimWork.usecase');
const { StartWorkUseCase, StartLineUseCase } = require('./application/startWork.usecase');
const { CompleteLineUseCase } = require('./application/completeLine.usecase');
const { SkipLineUseCase } = require('./application/skipLine.usecase');
const { CancelWorkUseCase } = require('./application/cancelWork.usecase');
const { SyncBatchUseCase } = require('./application/syncBatch.usecase');
const { ValidateScanUseCase } = require('./application/validateScan.usecase');

const workTypes = require('./domain/work.types');
const workErrors = require('./domain/work.errors');
const workStateMachine = require('./domain/work.state-machine');
const workPolicy = require('./domain/work.policy');

module.exports = {
  createWorkExecutionRoutes,
  PERMISSION_CODES,
  WorkExecutionController,
  
  WorkHeaderRepository,
  WorkLineRepository,
  WorkEventRepository,
  WorkExceptionRepository,
  WorkOutboxRepository,
  MobileSyncRepository,
  InventoryAdapter,
  AuditLogAdapter,
  
  GenerateWorkUseCase,
  DeliverOutboxUseCase,
  ClaimWorkUseCase,
  ReleaseWorkUseCase,
  StartWorkUseCase,
  StartLineUseCase,
  CompleteLineUseCase,
  SkipLineUseCase,
  CancelWorkUseCase,
  SyncBatchUseCase,
  ValidateScanUseCase,
  
  ...workTypes,
  ...workErrors,
  ...workStateMachine,
  ...workPolicy,
};
