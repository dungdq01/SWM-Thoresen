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

const { InventDimRepository } = require('./infra/invent-dim.repository');
const { InventTransRepository } = require('./infra/invent-trans.repository');
const { OnHandRepository } = require('./infra/onhand.repository');
const { HoldRepository } = require('./infra/hold.repository');
const { ReversalLinkRepository } = require('./infra/reversal-link.repository');
const { EventMappingRepository } = require('./infra/event-mapping.repository');

const {
  InventoryTransType,
  InventoryStage,
  HoldStatus,
  SourceApp,
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
  InventDimRepository,
  InventTransRepository,
  OnHandRepository,
  HoldRepository,
  ReversalLinkRepository,
  EventMappingRepository,
  InventoryTransType,
  InventoryStage,
  HoldStatus,
  SourceApp,
  InventoryError,
  InventoryErrorCodes,
};
