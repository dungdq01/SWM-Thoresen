# Tasks: Phase 3 — Core Engines

> Plan: `docs/feature/tvl-swm-phase3-core-engines/dev/plan.md`
> Context: `docs/feature/tvl-swm-phase3-core-engines/dev/context.json`

---

## Track 3A: Lot + InventDim Engine

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3A.1 | Create Constants (LotConsts, InventDimConsts, InventoryStatusConsts) | /backend | None | Done |
| 3A.2 | Create BusinessRule.Inventory.cs (Lot, InventDim, InventoryStatus rules) | /backend | None | Done |
| 3A.3 | Create ILotService + LotService (hash computation, GetOrCreate) | /backend | 3A.1, 3A.2 | Done |
| 3A.4 | Create IInventDimService + InventDimService (hash computation, GetOrCreate) | /backend | 3A.1, 3A.2 | Done |
| 3A.5 | Create InventoryStatus CRUD (commands, queries, DTOs, controller) | /backend | 3A.1, 3A.2 | Done |
| 3A.6 | Create Lot CRUD (commands, queries, DTOs, mappings, controller) | /backend | 3A.3 | Done |
| 3A.7 | Create Lot traceability query (GetLotTraceability) | /backend | 3A.6 | Done |
| 3A.8 | Create QueryConfigs (InventoryStatuses.json, Lots.json) | /backend | 3A.5, 3A.6 | Done |
| 3A.9 | Register services in DI (ServiceConfigurations.cs) | /backend | 3A.3, 3A.4, 3A.5 | Done |

## Track 3B: InventTrans Engine (Critical Path)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3B.1 | Create Constants (InventTransConsts) + BusinessRule extensions | /backend | None | Done |
| 3B.2 | Create IInventTransService + InventTransService (Post, PostPair, PostBatch) | /backend | 3A.4, 3B.1 | Done |
| 3B.3 | Implement stage transition state machine validation | /backend | 3B.2 | Done |
| 3B.4 | Create InventoryEventOutbox integration (same-transaction INSERT) | /backend | 3B.2 | Done |
| 3B.5 | Create MaterializationWorker (BackgroundService: poll → process → upsert OnHand) | /backend | 3B.4 | Done |
| 3B.6 | Implement OnHand upsert with row_version concurrency + checkpoint | /backend | 3B.5 | Done |
| 3B.7 | Create IAllocationService + AllocationService (advisory lock, FIFO, negative prevention) | /backend | 3B.2 | Done |
| 3B.8 | Create IOnHandQueryService + OnHandQueryService | /backend | 3B.6 | Done |
| 3B.9 | Create OnHand queries (GetOnHandList, GetOnHandSummary) | /backend | 3B.8 | Done |
| 3B.10 | Create InventTrans query (GetInventTransList) | /backend | 3B.2 | Done |
| 3B.11 | Create Inventory Admin commands (RebuildOnHand, GetMaterializationStatus) | /backend | 3B.5 | Done |
| 3B.12 | Create InventoryAdjustment CRUD (create, approve, reject) | /backend | 3B.2 | Done |
| 3B.13 | Create API Controllers (OnHandController, InventTransController, InventoryAdjustmentsController) | /backend | 3B.9, 3B.10, 3B.12 | Done |
| 3B.14 | Create QueryConfigs (OnHand.json, InventTrans.json, InventoryAdjustments.json) | /backend | 3B.13 | Done |
| 3B.15 | Implement idempotency check (duplicate external_id) | /backend | 3B.2 | Done |
| 3B.16 | Register services + MaterializationWorker in DI | /backend | 3B.2-3B.8 | Done |

## Track 3C: Weighbridge Engine

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3C.1 | Create Constants (WeighbridgeConsts, WeighbridgeLogConsts) + BusinessRule.Weighbridge.cs | /backend | None | Done |
| 3C.2 | Create Weighbridge CRUD (commands, queries, DTOs, mappings, controller) | /backend | 3C.1 | Done |
| 3C.3 | Create IWeighbridgeService + WeighbridgeService (process log, auto-resolve, weight calc) | /backend | 3C.1 | Done |
| 3C.4 | Implement cascading weighing logic (previous_log_id chain, ±50kg tolerance) | /backend | 3C.3 | Done |
| 3C.5 | Implement UOM-based qty update logic | /backend | 3C.3 | Done |
| 3C.6 | Implement scale capacity validation + tolerance check | /backend | 3C.3 | Done |
| 3C.7 | Create WeighbridgeLog commands/queries (CreateWeighbridgeLog, GetLogList, GetLogById) | /backend | 3C.3 | Done |
| 3C.8 | Create WeighbridgeLogsController | /backend | 3C.7 | Done |
| 3C.9 | Create QueryConfigs (Weighbridges.json, WeighbridgeLogs.json) | /backend | 3C.2, 3C.8 | Done |
| 3C.10 | Register services in DI | /backend | 3C.3 | Done |

## Track 3C: Frontend (Weighbridge)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3C.F1 | Create weighbridges frontend feature module (api, components, config, data, index) | /frontend | 3C.2 | Done |
| 3C.F2 | Create weighbridge-logs frontend feature module | /frontend | 3C.8 | Done |
| 3C.F3 | Create route files + sidebar navigation | /frontend | 3C.F1 | Done |
| 3C.F4 | Create i18n translations (en/vi) | /frontend | 3C.F1 | Done |

## Cross-Track

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| X.1 | Code review all 3 tracks | /reviewer | All above | Done |
| X.2 | Fix critical review issues (C1-C4, I1, I5) | /team | X.1 | Done |
| X.3 | Build verification (dotnet build + pnpm build) | /team | X.2 | Done |
| X.4 | Unit/integration tests | /tester | X.3 | Pending |

## Review Issues Summary

### Fixed (Critical)
- **C1**: Missing `ON` prefix in Weighbridge QueryConfigs JOIN_INFO
- **C2**: Advisory lock using `context.Connection` instead of EF Relational extension
- **C3**: ArchiveLot sets `LotAttr12 = "ARCHIVED"` as interim convention
- **C4**: OnHand xmin concurrency token configured in EF

### Fixed (Important)
- **I1**: Stage transition validated against last InventTrans per item+dim (proper from→to check)
- **I5**: ApproveAdjustment InventDim lookup includes WarehouseId + OwnerId via Location join

### Deferred (Important, non-blocking)
- **I2**: WeighbridgeService min_weight validation (enhancement)
- **I3**: RebuildOnHand memory optimization for large datasets (operational)
- **I4**: ExternalId field on InventTrans entity (schema change)
- **I6**: Folder convention inconsistency (cosmetic)
