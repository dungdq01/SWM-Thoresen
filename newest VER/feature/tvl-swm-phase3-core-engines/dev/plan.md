# Plan: Phase 3 — Core Engines (Lot + InventDim, InventTrans, Weighbridge)

## Summary

Implement 3 parallel engine tracks that form the inventory backbone and weighbridge integration for the TVL SWM v5.1 WMS. Track 3A provides Lot/InventDim hash services consumed by Track 3B. Track 3B builds the append-only InventTrans ledger, materialization worker, and allocation engine. Track 3C delivers the Weighbridge CRUD + log processing with auto-resolve and cascading. All entities and EF configurations already exist — this phase builds the Application layer (services, CQRS handlers, controllers) and frontend for weighbridge.

## Task Analysis

- **Feature Name:** Phase 3 Core Engines
- **Type:** New Feature (3 sub-features)
- **Scope:** Full Stack (Backend heavy, Frontend only for Weighbridge)
- **Priority:** High (Critical path — blocks Phase 4 Operations)
- **Complexity:** Complex (event-sourced inventory, background workers, hardware integration)

## Requirements

### Track 3A: Lot + InventDim Engine
- [x] InventoryStatus CRUD with seed data (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT)
- [x] Lot hash computation (SHA-256 from configurable attributes via `system_config.lot_hash_attrs`)
- [x] `ILotService.GetOrCreateLotAsync()` — hash lookup → create if not exists
- [x] Lot CRUD (create via GetOrCreate, read, update attributes, archive)
- [x] Lot list + query (filter by item, owner, status, attributes)
- [x] Lot traceability (source_lot_id chain)
- [x] InventDim hash computation (SHA-256 of warehouse+location+owner+status+lot)
- [x] `IInventDimService.GetOrCreateAsync()` — dim_hash lookup → create if not exists
- [x] Lot merge detection (same hash = same lot)
- [x] Cross-warehouse lot (hash excludes warehouse_id)

### Track 3B: InventTrans Engine (Critical Path)
- [x] `IInventTransService` interface (Post, PostPair, PostBatch)
- [x] InventTrans append-only INSERT (seq_no BIGSERIAL, batch_id, external_id)
- [x] Stage transition state machine validation
- [x] InventoryEventOutbox INSERT in same transaction
- [x] MaterializationWorker background service (poll outbox → update on_hand)
- [x] OnHand upsert with row_version optimistic concurrency
- [x] MaterializationCheckpoint incremental tracking
- [x] Full rebuild from invent_trans
- [x] `IAllocationService` with advisory lock + FIFO
- [x] Negative inventory prevention (available_qty >= requested)
- [x] Idempotency (reject duplicate external_id)
- [x] OnHand query API + InventTrans query API

### Track 3C: Weighbridge Engine
- [x] Weighbridge CRUD (code, warehouse, capacity, integration_mode)
- [x] `POST /api/weighbridge-logs` single endpoint (inbound + outbound)
- [x] Auto-resolve business keys (document_number → receipt/order, sku → item)
- [x] Weight calculation (net = |gross - tare|, auto-detect type)
- [x] Cascading weighing (previous_log_id chain, ±50kg tolerance)
- [x] UOM-based qty update logic
- [x] Weight tolerance check (running total vs expected)
- [x] Retry support (multiple logs per document line)
- [x] Scale capacity validation ([min_weight, max_capacity])
- [x] Weighbridge frontend CRUD page

## Impact Analysis

### Files to Create

#### Backend — Domain.Shared (Constants + Business Rules)
- `Constants/LotConsts.cs`
- `Constants/InventDimConsts.cs`
- `Constants/InventTransConsts.cs`
- `Constants/InventoryStatusConsts.cs`
- `Constants/WeighbridgeConsts.cs`
- `Constants/WeighbridgeLogConsts.cs`
- `BusinessRule.Inventory.cs` (partial class)
- `BusinessRule.Weighbridge.cs` (partial class)

#### Backend — Application Services
- `Services/Abstractions/ILotService.cs`
- `Services/Abstractions/IInventDimService.cs`
- `Services/Abstractions/IInventTransService.cs`
- `Services/Abstractions/IAllocationService.cs`
- `Services/Abstractions/IOnHandQueryService.cs`
- `Services/Abstractions/IWeighbridgeService.cs`
- `Services/LotService.cs`
- `Services/InventDimService.cs`
- `Services/InventTransService.cs`
- `Services/AllocationService.cs`
- `Services/OnHandQueryService.cs`
- `Services/WeighbridgeService.cs`
- `Services/MaterializationWorker.cs` (BackgroundService)

#### Backend — Application Features

**Track 3A: InventoryStatuses/**
- `Commands/CreateInventoryStatus.cs`
- `Queries/GetInventoryStatusList.cs`, `GetInventoryStatusLookup.cs`
- `Dtos/InventoryStatusDto.cs`, `Mappings/InventoryStatusMappings.cs`

**Track 3A: Lots/**
- `Commands/CreateLot.cs`, `UpdateLot.cs`, `ArchiveLot.cs`
- `Queries/GetLotById.cs`, `GetLotList.cs`, `GetLotLookup.cs`, `GetLotTraceability.cs`
- `Dtos/LotDto.cs`, `LotTraceabilityDto.cs`
- `Mappings/LotMappings.cs`

**Track 3B: Inventory/OnHand/**
- `Queries/GetOnHandList.cs`, `GetOnHandSummary.cs`
- `Dtos/OnHandDto.cs`, `OnHandSummaryDto.cs`
- `Mappings/OnHandMappings.cs`

**Track 3B: Inventory/InventTrans/**
- `Queries/GetInventTransList.cs`
- `Dtos/InventTransDto.cs`
- `Mappings/InventTransMappings.cs`

**Track 3B: Inventory/Admin/**
- `Commands/RebuildOnHand.cs`
- `Queries/GetMaterializationStatus.cs`

**Track 3B: Inventory/Adjustments/**
- `Commands/CreateInventoryAdjustment.cs`, `ApproveAdjustment.cs`, `RejectAdjustment.cs`
- `Queries/GetAdjustmentList.cs`
- `Dtos/InventoryAdjustmentDto.cs`
- `Mappings/InventoryAdjustmentMappings.cs`

**Track 3C: Weighbridge/Weighbridges/**
- `Commands/CreateWeighbridge.cs`, `UpdateWeighbridge.cs`, `DeleteWeighbridge.cs`
- `Queries/GetWeighbridgeById.cs`, `GetWeighbridgeList.cs`, `GetWeighbridgeLookup.cs`
- `Dtos/WeighbridgeDto.cs`, `Mappings/WeighbridgeMappings.cs`

**Track 3C: Weighbridge/WeighbridgeLogs/**
- `Commands/CreateWeighbridgeLog.cs`
- `Queries/GetWeighbridgeLogById.cs`, `GetWeighbridgeLogList.cs`
- `Dtos/WeighbridgeLogDto.cs`, `Mappings/WeighbridgeLogMappings.cs`

#### Backend — API Controllers
- `InventoryStatusesController.cs`
- `LotsController.cs`
- `OnHandController.cs`
- `InventTransController.cs`
- `InventoryAdjustmentsController.cs`
- `WeighbridgesController.cs`
- `WeighbridgeLogsController.cs`

#### Backend — QueryConfigs
- `InventoryStatuses.json`
- `Lots.json`
- `OnHand.json`
- `InventTrans.json`
- `InventoryAdjustments.json`
- `Weighbridges.json`
- `WeighbridgeLogs.json`

#### Frontend — Weighbridge Feature
- `features/weighbridges/` — full feature module (api, components, config, data, index.tsx)
- `features/weighbridge-logs/` — log feature module
- `i18n/locales/en/weighbridges.json`, `vi/weighbridges.json`
- Route files: `routes/_authenticated/weighbridges/index.tsx`
- Sidebar nav update

### Files to Modify
- `Application/ServiceConfigurations.cs` — register new services (ILotService, IInventDimService, etc.)
- `Api/Program.cs` — register MaterializationWorker as hosted service
- `frontend/src/components/layout/data/sidebar-data.ts` — add Weighbridge nav items
- `frontend/src/i18n/index.ts` — register weighbridge namespace

### Database Changes
- No migrations — entities and configurations already exist
- Seed data needed for InventoryStatus (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT)

### API Changes (New Endpoints)
- `GET/POST /api/inventory-statuses` — InventoryStatus CRUD
- `GET /api/lots`, `GET /api/lots/{id}`, `GET /api/lots/{id}/traceability` — Lot queries
- `GET /api/on-hand`, `GET /api/on-hand/summary` — OnHand read model
- `GET /api/invent-trans` — InventTrans audit trail
- `POST /api/inventory-adjustments`, `PUT .../approve`, `PUT .../reject` — Adjustments
- `POST /api/inventory/rebuild`, `GET /api/inventory/materialization-status` — Admin
- `GET/POST/PUT/DELETE /api/weighbridges` — Weighbridge CRUD
- `POST /api/weighbridge-logs`, `GET /api/weighbridge-logs` — Weighbridge logs

## Architecture Decisions

### ADR-3.1: Lot Hash Computation
- **Decision:** SHA-256 hash of (tenant_id | item_id | owner_id | configurable lot_attrs)
- **Config:** Read from `system_config` key `lot_hash_attrs` (default: `item_id,owner_id,lot_attr_01,lot_attr_03,lot_attr_08,lot_attr_09`)
- **Rationale:** Deterministic deduplication — same physical lot always maps to same entity

### ADR-3.2: InventDim Immutability
- **Decision:** InventDim rows are immutable. New dimension combination = new row.
- **Hash:** SHA-256(site_id | warehouse_id | location_id | owner_id | status | lot_id)
- **Rationale:** Referential integrity for invent_trans — once a dim_id is referenced, it must never change

### ADR-3.3: Event-Sourced Inventory
- **Decision:** Append-only invent_trans + async materialization to on_hand
- **Pattern:** Write hot path (no locks) → Outbox → Background worker → OnHand upsert (optimistic concurrency)
- **Rationale:** High throughput writes, eventually consistent reads (< 1 sec typical lag)

### ADR-3.4: Allocation via Advisory Lock
- **Decision:** Use `pg_advisory_xact_lock(tenant_id, item_id, invent_dim_id)` for FIFO allocation
- **Rationale:** Prevents overselling while avoiding table-level locks. Lock scoped to transaction.

### ADR-3.5: Stage Transition State Machine
- **Valid transitions:**
  ```
  EXPECTED → REGISTERED → ALLOCATED → DE_ALLOCATED → PHYSICAL → DEDUCTED
  EXPECTED → PHYSICAL (direct receipt)
  ALLOCATED → DE_ALLOCATED (cancel allocation)
  PHYSICAL → DEDUCTED (direct ship)
  ```
- **Rationale:** Prevents invalid inventory state changes at the service level

### ADR-3.6: Weighbridge Single Endpoint
- **Decision:** Single `POST /api/weighbridge-logs` handles both inbound and outbound
- **Auto-detect:** gross > tare = INBOUND, tare > gross = OUTBOUND
- **Rationale:** Hardware/API integrations send to one endpoint regardless of direction

### ADR-3.7: MaterializationWorker as IHostedService
- **Decision:** Register as `BackgroundService` polling outbox every 500ms
- **Retry:** Max 3 attempts per event on row_version conflict
- **Rationale:** Decoupled from write path, self-healing with retry

## Execution Plan

### Phase 1: Backend Track 3A (Lot + InventDim) → `/backend`
Constants, business rules, services (ILotService, IInventDimService), CQRS handlers, controller, QueryConfigs.

### Phase 2: Backend Track 3B (InventTrans Engine) → `/backend`
Constants, business rules, services (IInventTransService, IAllocationService, IOnHandQueryService), MaterializationWorker, CQRS handlers, controllers, QueryConfigs. **PARALLEL with Phase 1 after interface contract agreed.**

### Phase 3: Backend Track 3C (Weighbridge Engine) → `/backend`
Constants, business rules, services (IWeighbridgeService), CQRS handlers, controllers, QueryConfigs. **PARALLEL with Phase 1 & 2.**

### Phase 4: Frontend Track 3C (Weighbridge) → `/frontend`
Feature modules, routes, sidebar, i18n. **After Track 3C backend done.**

### Phase 5: Review → `/reviewer`
Cross-track review of all implementations.

### Phase 6: Testing → `/tester`
Unit tests for hash services, state machine, materialization, allocation, weighbridge logic.

## Business Rules Reference

### Track 3A
- BR-3A-001: Lot hash is deterministic — same inputs always produce same hash
- BR-3A-002: Lot hash config read from `system_config.lot_hash_attrs`
- BR-3A-003: InventDim is immutable once created
- BR-3A-004: Lot lifecycle: CREATED → ACTIVE → INACTIVE → ARCHIVED
- BR-3A-005: Cross-warehouse: hash excludes warehouse_id

### Track 3B
- BR-3B-001: invent_trans is APPEND-ONLY — never update or delete
- BR-3B-002: on_hand = materialized view of invent_trans, rebuildable
- BR-3B-003: available_qty = physical_qty - reserved_qty - allocated_qty (>= 0)
- BR-3B-004: Allocation uses `pg_advisory_xact_lock` for FIFO
- BR-3B-005: Materialization retry max 3 on row_version conflict
- BR-3B-006: DPM nominal trans excluded from materialization

### Track 3C
- BR-3C-001: Single endpoint for inbound + outbound
- BR-3C-002: Auto-detect type: gross > tare = INBOUND
- BR-3C-003: Cascading: log[n].gross ≈ log[n-1].tare (±50kg)
- BR-3C-004: UOM rule: weighbridge_qty_uom match → update qty + net_weight
- BR-3C-005: Weight within [min_weight_kg, max_capacity_kg]
- BR-3C-006: Per-line model with unlimited retries

## Notes & Risks

1. **Risk (High):** MaterializationWorker requires careful concurrency handling — row_version conflicts on OnHand under high write load
2. **Risk (Medium):** Advisory lock deadlocks if allocation spans multiple (item, dim) pairs — mitigate with consistent lock ordering
3. **Risk (Medium):** Weighbridge auto-resolve depends on Phase 4 entities (Receipt/Order) not yet built — implement with nullable resolution (resolve what exists, null for Phase 4 refs)
4. **Open Question:** DPM nominal transaction handling (is_nominal=true) is P2 — defer to Phase 5 if needed
5. **Dependency:** Track 3A interface contract (`ILotService`, `IInventDimService`) must be agreed before Track 3B starts consuming them
