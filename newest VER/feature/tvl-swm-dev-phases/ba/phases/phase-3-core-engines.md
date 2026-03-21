# Phase 3: Core Engines — 3 Parallel Tracks

**Devs:** 3 (parallel)
**Effort:** ~3-4 sprints per track
**Blocking:** Phase 2 (Master Data entities must exist)
**Complexity:** HIGH — event-sourced inventory + hardware integration

---

## Parallelism Map

```
Phase 2 Done (Master Data CRUD available)
    │
    ├──► Track 3A: Lot + InventDim Engine     ← Dev A
    │    (lot hash, dim hash, get_or_create)
    │
    ├──► Track 3B: InventTrans Engine         ← Dev B (MOST COMPLEX)
    │    (append-only ledger, materialization,
    │     outbox, background worker)
    │
    └──► Track 3C: Weighbridge Engine         ← Dev C
         (hardware API, auto-resolve,
          cascading weighing)
```

**Cross-track contract:** Track 3A provides `ILotService` and `IInventDimService` interfaces that Track 3B consumes. Agree on interface early (Sprint 1).

---

## Track 3A: Lot + InventDim Engine (Dev A)

**Entities:** Lot, InventDim, InventoryStatus
**Folder:** `Application/Features/Lots/`, `InventDims/`, `InventoryStatuses/`
**Complexity:** Medium

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 3A.1 | InventoryStatus CRUD + Seed | CRUD | Seed: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT per tenant. Support custom statuses | P0 |
| 3A.2 | Lot hash computation | Logic | SHA-256(tenant_id \| item_id \| owner_id \| configurable lot_attrs). Read `system_config.lot_hash_attrs` | P0 |
| 3A.3 | `ILotService.GetOrCreateLot()` | Logic | Compute hash → lookup → create if not exists → return lot_id. Handle MERGE (same hash) | P0 |
| 3A.4 | Lot CRUD (read-heavy) | CRUD | Create (via GetOrCreate), Read, Update attributes, Archive. Lot number auto-generated | P0 |
| 3A.5 | Lot list + query | Query | Filter by item, owner, status, lot_attr fields | P1 |
| 3A.6 | Lot traceability | Query | Given lot → trace source_lot_id chain (e.g., bagged → bulk origin) | P1 |
| 3A.7 | InventDim hash computation | Logic | SHA-256(site_id \| warehouse_id \| location_id \| owner_id \| status \| lot_id) | P0 |
| 3A.8 | `IInventDimService.GetOrCreate()` | Logic | Compute dim_hash → lookup → create if not exists → return invent_dim_id | P0 |
| 3A.9 | Lot merge detection | Logic | When lot_hash matches existing lot → merge (same lot entity, no duplicate) | P1 |
| 3A.10 | Cross-warehouse lot | Logic | Hash excludes warehouse_id → same lot tracked across warehouses | P1 |

### Interface Contract (for Track 3B)

```csharp
public interface ILotService
{
    Task<Guid> GetOrCreateLotAsync(Guid itemId, Guid ownerId,
        Dictionary<string, string?> lotAttributes, CancellationToken ct);
    Task<Lot?> GetByHashAsync(string lotHash, CancellationToken ct);
}

public interface IInventDimService
{
    Task<Guid> GetOrCreateAsync(Guid warehouseId, Guid locationId,
        Guid ownerId, Guid statusId, Guid? lotId, CancellationToken ct);
    Task<InventDim> GetByIdAsync(Guid inventDimId, CancellationToken ct);
}
```

### API Endpoints

```
# Inventory Status
GET    /api/inventory-statuses              ← List
POST   /api/inventory-statuses              ← Create custom status

# Lot
GET    /api/lots                            ← List (filter: itemId, ownerId, status)
GET    /api/lots/{id}                       ← Detail (include attributes, source lot chain)
GET    /api/lots/{id}/traceability          ← Full source chain

# InventDim (internal, no public CRUD — managed by services)
```

### Business Rules

- BR-3A-001: Lot hash is deterministic — same inputs always produce same hash
- BR-3A-002: Lot hash config read from `system_config.lot_hash_attrs` (default: item_id + owner_id + lot_attr_01 + lot_attr_03 + lot_attr_08 + lot_attr_09)
- BR-3A-003: InventDim is immutable once created — new combination = new row
- BR-3A-004: Lot lifecycle: CREATED → ACTIVE → INACTIVE → ARCHIVED
- BR-3A-005: Cross-warehouse: hash excludes warehouse_id so same lot can exist in multiple warehouses

---

## Track 3B: InventTrans Engine (Dev B) — CRITICAL PATH

**Entities:** InventTrans, OnHand, InventoryEventOutbox, MaterializationCheckpoint
**Folder:** `Application/Features/Inventory/`
**Complexity:** HIGH — event-sourced architecture

### Architecture Overview

```
WRITE (hot path):
  Business operation → IInventTransService.PostAsync()
      → INSERT invent_trans (append-only, no locks)
      → INSERT inventory_event_outbox (same transaction)

MATERIALIZE (async background):
  MaterializationWorker polls outbox
      → Read new invent_trans by seq_no
      → UPDATE on_hand (optimistic concurrency via row_version)
      → UPDATE materialization_checkpoint

READ (warm path):
  Query on_hand for current inventory
      → Eventually consistent (lag: < 1 second typical)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 3B.1 | `IInventTransService` interface | Logic | Define PostAsync(batch), PostPairAsync(issue+receipt), stage transitions | P0 |
| 3B.2 | InventTrans append-only INSERT | Logic | seq_no auto-increment (BIGSERIAL), batch_id grouping, external_id for idempotency | P0 |
| 3B.3 | Stage transition validation | Logic | State machine: EXPECTED → REGISTERED → ALLOCATED → DE_ALLOCATED → PHYSICAL → DEDUCTED | P0 |
| 3B.4 | InventoryEventOutbox INSERT | Logic | Same transaction as invent_trans. Payload = batch summary | P0 |
| 3B.5 | MaterializationWorker (background service) | Logic | Poll outbox → process events → update on_hand | P0 |
| 3B.6 | OnHand upsert | Logic | physical_qty, reserved_qty, allocated_qty, inbound/outbound_ordered_qty. Row version for concurrency | P0 |
| 3B.7 | MaterializationCheckpoint tracking | Logic | Track last_trans_seq per (tenant, item, dim) for incremental processing | P1 |
| 3B.8 | Full rebuild from invent_trans | Logic | `POST /api/inventory/rebuild` — recreate on_hand from scratch | P1 |
| 3B.9 | Allocation service | Logic | `pg_advisory_xact_lock` per (tenant, item, dim) → FIFO allocation | P0 |
| 3B.10 | Negative inventory prevention | Logic | Check available_qty >= requested before ALLOCATED/DEDUCTED | P0 |
| 3B.11 | Idempotency check | Logic | Reject duplicate external_id per tenant | P1 |
| 3B.12 | OnHand query API | Query | Filter by warehouse, owner, item, location, lot, status | P0 |
| 3B.13 | InventTrans query API | Query | Filter by item, reference_type/id, date range, stage | P1 |
| 3B.14 | DPM nominal transactions | Logic | is_nominal=true for dual tracking, skip in materialization | P2 |
| 3B.15 | InventoryAdjustment CRUD | CRUD | Manual adjustment with approval workflow | P1 |

### Interface Contract (consumed by Phase 4)

```csharp
public interface IInventTransService
{
    // Post a single transaction
    Task PostAsync(InventTransCommand cmd, CancellationToken ct);

    // Post a pair (location/status change): issue from source + receipt at dest
    Task PostPairAsync(InventTransCommand issue, InventTransCommand receipt, CancellationToken ct);

    // Post batch (e.g., 10K receipt lines)
    Task PostBatchAsync(IEnumerable<InventTransCommand> cmds, Guid batchId, CancellationToken ct);
}

public interface IAllocationService
{
    // FIFO allocate qty for item at specific dim
    Task<List<AllocationResult>> AllocateFifoAsync(
        Guid itemId, Guid ownerId, Guid warehouseId,
        decimal qtyKg, Guid? preferredLotId, CancellationToken ct);

    // Release allocation
    Task DeallocateAsync(Guid allocationId, CancellationToken ct);
}

public interface IOnHandQueryService
{
    Task<List<OnHandDto>> GetAsync(OnHandFilter filter, CancellationToken ct);
    Task<decimal> GetAvailableQtyAsync(Guid itemId, Guid inventDimId, CancellationToken ct);
}
```

### API Endpoints

```
# OnHand (read model)
GET    /api/on-hand                         ← List (filter: warehouseId, ownerId, itemId, lotId)
GET    /api/on-hand/summary                 ← Aggregated by item/owner/warehouse

# InventTrans (audit trail)
GET    /api/invent-trans                    ← List (filter: itemId, referenceType, dateRange)

# Inventory Adjustment
GET    /api/inventory-adjustments           ← List
POST   /api/inventory-adjustments           ← Create (pending approval)
PUT    /api/inventory-adjustments/{id}/approve ← Approve → post InventTrans
PUT    /api/inventory-adjustments/{id}/reject  ← Reject

# Admin
POST   /api/inventory/rebuild              ← Full rebuild on_hand from invent_trans
GET    /api/inventory/materialization-status ← Check lag/health
```

### Business Rules

- BR-3B-001: invent_trans is APPEND-ONLY — never update or delete
- BR-3B-002: on_hand = materialized view of invent_trans, can be rebuilt at any time
- BR-3B-003: available_qty = physical_qty - reserved_qty - allocated_qty (must be >= 0)
- BR-3B-004: Allocation uses `pg_advisory_xact_lock(tenant_id, item_id, invent_dim_id)` for FIFO
- BR-3B-005: Materialization retry max 3 times on row_version conflict
- BR-3B-006: DPM nominal trans (is_nominal=true) excluded from materialization

---

## Track 3C: Weighbridge Engine (Dev C)

**Entities:** Weighbridge, WeighbridgeLog
**Folder:** `Application/Features/Weighbridge/`
**Frontend:** `/weighbridge`
**Complexity:** Medium-High (hardware integration)

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 3C.1 | Weighbridge CRUD | CRUD | code, warehouse_id, max_capacity_kg, min_weight_kg, scale_division_kg, integration_mode (API/SERIAL/MANUAL/MIXED) | P0 |
| 3C.2 | WeighbridgeLog POST endpoint | API | Single `POST /api/weighbridge-logs` for both UI and hardware | P0 |
| 3C.3 | Auto-resolve business keys | Logic | document_number → receipt/order, sku → item_id, warehouse_code → warehouse_id, owner_code → owner_id | P0 |
| 3C.4 | Weight calculation | Logic | net_weight_kg = \|gross_weight_kg - tare_weight_kg\|. Auto-detect type: gross > tare = INBOUND | P0 |
| 3C.5 | Cascading weighing | Logic | previous_log_id chain: each log's gross = previous log's tare (±50kg tolerance) | P1 |
| 3C.6 | UOM-based qty update | Logic | If line.uom = item_group.weighbridge_qty_uom → update qty + net_weight. Else → only net_weight | P0 |
| 3C.7 | Weight tolerance check | Logic | Running total of net_weights vs expected qty. Alert if exceeds tolerance_pct | P1 |
| 3C.8 | Weighbridge log list | Query | Filter by document_number, date, status, weighbridge | P0 |
| 3C.9 | Retry support | Logic | Multiple logs per document line (unlimited retries). Only latest COMPLETED counts | P1 |
| 3C.10 | Scale capacity validation | Logic | Reject weight > max_capacity_kg or < min_weight_kg | P0 |

### API Endpoints

```
# Weighbridge
GET    /api/weighbridges                    ← List
POST   /api/weighbridges                    ← Create
PUT    /api/weighbridges/{id}               ← Update
DELETE /api/weighbridges/{id}               ← Soft delete

# Weighbridge Log
POST   /api/weighbridge-logs                ← Create log (single endpoint for all)
GET    /api/weighbridge-logs                ← List (filter: documentNumber, date, status)
GET    /api/weighbridge-logs/{id}           ← Detail (include chain)
```

### Interface Contract (consumed by Phase 4)

```csharp
public interface IWeighbridgeService
{
    Task<WeighbridgeLogResult> ProcessLogAsync(WeighbridgeLogCommand cmd, CancellationToken ct);
    Task<decimal> GetTotalNetWeightAsync(string documentNumber, Guid itemId, CancellationToken ct);
}
```

### Business Rules

- BR-3C-001: Single endpoint handles both inbound (receipt) and outbound (order) weighing
- BR-3C-002: Type auto-detected: gross > tare → INBOUND, tare > gross → OUTBOUND
- BR-3C-003: Cascading: log[n].gross must equal log[n-1].tare ± 50kg
- BR-3C-004: UOM rule: weighbridge_qty_uom match → update qty; mismatch → only net_weight
- BR-3C-005: Weight must be within [min_weight_kg, max_capacity_kg] of the weighbridge
- BR-3C-006: Per-line model: 1 log per SKU per weighing session, unlimited retries

---

## Cross-Track Dependencies

```
Track 3A (Lot+Dim) ──── provides ILotService, IInventDimService ────► Track 3B (InventTrans)
                                                                         │
Track 3C (Weighbridge) ── independent, provides IWeighbridgeService ─►  Phase 4
```

### Sprint 1 Coordination

| Day | Action |
|-----|--------|
| Day 1 | All 3 devs agree on interface contracts (ILotService, IInventDimService, IInventTransService, IWeighbridgeService) |
| Day 2-5 | Independent implementation behind interfaces |
| Sprint 1 end | Integration test: create lot → create dim → post invent_trans → verify on_hand |

---

## Definition of Done

### Track 3A
- [ ] `GetOrCreateLot` produces deterministic hashes
- [ ] Same lot attributes → same lot entity (no duplicates)
- [ ] InventDim correctly computes dim_hash
- [ ] Cross-warehouse lot sharing works (hash excludes warehouse)

### Track 3B
- [ ] InventTrans append-only (no UPDATE/DELETE possible)
- [ ] Materialization worker processes events within 1 second
- [ ] OnHand reflects correct available qty after operations
- [ ] Concurrent allocation doesn't oversell (advisory lock test)
- [ ] Full rebuild produces identical on_hand as incremental
- [ ] Negative inventory prevented

### Track 3C
- [ ] Single POST endpoint handles both inbound/outbound
- [ ] Auto-resolve correctly maps business keys to internal IDs
- [ ] Cascading chain validated (tolerance ±50kg)
- [ ] UOM-based qty update logic correct
- [ ] Scale capacity limits enforced
