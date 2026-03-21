/**
 * Module 3: Inventory Core Engine - Main Export
 */

const { createInventoryCoreRoutes } = require('./inventory-core.routes');
const { InventoryCoreController } = require('./inventory-core.controller');
const { PostingEngineService } = require('./application/posting-engine.service');
const { ReversalEngineService } = require('./application/reversal-engine.service');
const { HoldService } = require('./application/hold.service');
const { OnHandService } = require('./application/onhand.service');
const { TransactionQueryService } = require('./application/transaction-query.service');
const { InventDimService } = require('./application/invent-dim.service');
const { ReconciliationService } = require('./application/reconciliation.service');
const { SnapshotService } = require('./application/snapshot.service');
const { LotService } = require('./application/lot.service');

const { InventDimRepository } = require('./infra/invent-dim.repository');
const { InventTransRepository } = require('./infra/invent-trans.repository');
const { OnHandRepository } = require('./infra/onhand.repository');
const { HoldRepository } = require('./infra/hold.repository');
const { ReversalLinkRepository } = require('./infra/reversal-link.repository');
const { EventMappingRepository } = require('./infra/event-mapping.repository');
const { AuditLogAdapter, createAuditLogAdapter } = require('./infra/audit-log.adapter');

const {
  InventoryTransType,
  InventoryStage,
  HoldStatus,
  SourceApp,
  ReconciliationRunType,
  ReconciliationScopeType,
  SnapshotRunMode,
  SnapshotRunStatus,
} = require('./domain/inventory.types');

const {
  InventoryError,
  InventoryErrorCodes,
} = require('./domain/inventory.errors');

module.exports = {
  createInventoryCoreRoutes,
  InventoryCoreController,
  PostingEngineService,
  ReversalEngineService,
  HoldService,
  OnHandService,
  TransactionQueryService,
  InventDimService,
  ReconciliationService,
  SnapshotService,
  LotService,
  InventDimRepository,
  InventTransRepository,
  OnHandRepository,
  HoldRepository,
  ReversalLinkRepository,
  EventMappingRepository,
  AuditLogAdapter,
  createAuditLogAdapter,
  InventoryTransType,
  InventoryStage,
  HoldStatus,
  SourceApp,
  ReconciliationRunType,
  ReconciliationScopeType,
  SnapshotRunMode,
  SnapshotRunStatus,
  InventoryError,
  InventoryErrorCodes,
  LotService,
};
