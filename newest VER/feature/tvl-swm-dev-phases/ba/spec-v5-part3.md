# TVL SWM Spec v5.0 — Part 3: Phase 6–9 + Timeline + Decisions

---

## Phase 6 — Inter-Warehouse Transfer [v5.0: ISS-06 FIX]

**Sprints:** 18–19 (4 tuần)

### Bảng trong scope

| Table | tenant_id | Dependency | Độ phức tạp |
|-------|-----------|------------|-------------|
| transfer_header | ✅ UUID | Phase 1, 2 | Complex |
| transfer_line | ✅ UUID | transfer_header | Complex |
| work_header (MOVE) | ✅ UUID | transfer | Medium |

### transfer_header Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| transfer_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| transfer_number | VARCHAR(50) | Y | |
| source_warehouse_id | UUID FK | Y | |
| dest_warehouse_id | UUID FK | Y | |
| requested_by | UUID FK → users | Y | |
| approved_by | UUID FK → users | N | |
| transfer_reason | UUID FK → reason_code | Y | |
| expected_ship_date | DATE | N | |
| expected_arrival_date | DATE | N | |
| use_weighbridge | BOOLEAN | Y | Default FALSE [I-01] |
| vehicle_plate | VARCHAR(20) | N | |
| status | ENUM | Y | CREATED / APPROVED / RELEASED / SHIPPED / IN_TRANSIT / RECEIVED / CLOSED / CANCELLED |
| UNIQUE | (tenant_id, transfer_number) | | |

### transfer_line Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| transfer_line_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| transfer_id | UUID FK | Y | |
| line_number | INT | Y | |
| item_id | UUID FK | Y | |
| **lot_id** | **UUID FK → lot** | **N** | **Lot preserved through transfer** |
| planned_qty_kg | DECIMAL(14,2) | Y | |
| shipped_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| received_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| variance_kg | DECIMAL(14,2) | N | |
| line_status | ENUM | Y | OPEN / PICKED / SHIPPED / IN_TRANSIT / RECEIVED / CLOSED / CANCELLED |

### Transfer InventTrans Flow [v5.0: ISS-06 FIX]

```
SHIPPED at source:
  InventTrans #1 (deduct from source):
    trans_type = TRANSFER_ISSUE, stage = DEDUCTED
    qty = -shipped_qty
    invent_dim = (source WH, STORAGE loc, AVAILABLE, lot_id)

  InventTrans #2 (create IN_TRANSIT):
    trans_type = TRANSFER_ISSUE, stage = PHYSICAL
    qty = +shipped_qty
    invent_dim = (source WH, TRANSIT loc, IN_TRANSIT, lot_id)

RECEIVED at destination (full qty):
  InventTrans #3 (clear transit):
    trans_type = TRANSFER_RECEIPT, stage = DEDUCTED
    qty = -shipped_qty
    invent_dim = (source WH, TRANSIT loc, IN_TRANSIT, lot_id)

  InventTrans #4 (receive at dest):
    trans_type = TRANSFER_RECEIPT, stage = PHYSICAL
    qty = +received_qty
    invent_dim = (dest WH, RECV loc, AVAILABLE, lot_id)  ← lot preserved cross-WH

TRANSIT LOSS [ISS-06 FIX: deduct from IN_TRANSIT, not source STORAGE]:
  IF received_qty < shipped_qty:
    loss = shipped_qty - received_qty
    
    InventTrans #3 (clear only received portion from transit):
      qty = -received_qty (NOT -shipped_qty)
      invent_dim = (source WH, TRANSIT, IN_TRANSIT, lot_id)

    InventTrans #4 (receive at dest):
      qty = +received_qty
      invent_dim = (dest WH, RECV, AVAILABLE, lot_id)

    InventTrans #5 (loss from transit): [ISS-06 FIX]
      trans_type = ADJUSTMENT, stage = PHYSICAL
      qty = -loss
      invent_dim = (source WH, TRANSIT, IN_TRANSIT, lot_id)
      reason_code = TRANSIT_LOSS
    
    → IN_TRANSIT on_hand = shipped - received - loss = 0 ✅
    → Loss tracked via ADJUSTMENT from TRANSIT bucket
    → Alert WH_MANAGER both warehouses [I-03]

DAMAGE in transit:
  InventTrans #4 split:
    +good_qty to (dest, RECV, AVAILABLE, lot_id)
    +damage_qty to (dest, RECV, DAMAGED, lot_id)
```

### Business Rules — Transfer

- 2+ InventTrans per line: ISSUE (source) + RECEIPT (dest)
- IN_TRANSIT: NOT billable, NOT allocatable
- **Transit loss: deduct from IN_TRANSIT bucket** [ISS-06 FIX]
- use_weighbridge default FALSE, TRUE for external [I-01]
- Overdue > 24h → alert [I-03]
- Approval: WH_MANAGER of source warehouse [I-04]
- Cancel only before SHIPPED
- **lot_id preserved across warehouses** [v5.0]

---

## Phase 7 — Billing Engine

**Sprints:** 20–25 (12 tuần)

### Bảng trong scope

| Table | tenant_id | Độ phức tạp |
|-------|-----------|-------------|
| fee_type | ✅ UUID | Simple |
| day_type_config | ✅ UUID | Simple |
| calendar_detail | ✅ UUID | Simple |
| billing_condition | ✅ UUID | Medium |
| billing_contract | ✅ UUID | Complex |
| contract_fee_line | ✅ UUID | Complex |
| billing_transaction | ✅ UUID | Complex |
| daily_storage_snapshot | ✅ UUID | Complex |
| debit_note | ✅ UUID | Complex |
| debit_note_line | ✅ UUID | Medium |
| credit_note | ✅ UUID | Medium |

### Storage Fee Formula

```
daily_fee = billable_qty_mt × unit_price × day_type_multiplier

billable_qty_mt = daily_storage_snapshot.closing_qty_mt [B-02: CLOSING]
unit_price = contract_fee_line.unit_price
day_type_multiplier: WORKING=1.0, DAY_OFF=1.5, HOLIDAY=2.0 [B-03]

Excluded: IN_TRANSIT stock
```

### daily_storage_snapshot [v5.0: + lot_id]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| snapshot_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| snapshot_date | DATE | Y | |
| owner_id | UUID FK | Y | |
| item_id | UUID FK | Y | |
| warehouse_id | UUID FK | Y | |
| inventory_status | ENUM | Y | |
| **lot_id** | **UUID FK → lot** | **N** | **Per lot for free days calc** |
| opening_qty_mt | DECIMAL(14,3) | Y | |
| inbound_qty_mt | DECIMAL(14,3) | Y | |
| outbound_qty_mt | DECIMAL(14,3) | Y | |
| adjustment_qty_mt | DECIMAL(14,3) | Y | |
| closing_qty_mt | DECIMAL(14,3) | Y | |

### Free Days [C-02: 3 modes, v5.0 lot-aware]

```
free_days_mode per contract_fee_line:
  PER_CONTRACT: apply to all receipts of owner
  PER_BL: per B/L number → lot.bl_number
  PER_RECEIPT: per individual receipt → lot.first_received_date

With lot_id in snapshot:
  PER_BL mode:
    JOIN lot ON snapshot.lot_id = lot.lot_id
    free_start = lot.first_received_date
    IF snapshot_date ≤ free_start + free_days → skip billing for this lot's qty
    
  → Lot tracking enables PRECISE per-BL free days calculation
```

### Billing Methods (configurable per contract_fee_line)

```
FLAT_RATE:     Fixed amount per period
PER_UNIT:      qty × unit_price
HIGHER_OF_TWO: MAX(guaranteed_min × rate, actual × rate)
TIERED:        Volume-based (MARGINAL or FLAT, MONTHLY or CUMULATIVE reset)
```

### Debit Note + Dispute

```
DRAFT → REVIEWED → APPROVED → LOCKED (immutable)
REVIEWED → DISPUTED → resolved → APPROVED
LOCKED + error → credit_note (Phase 1 basic)
```

### Business Rules — Billing

- Max 1 active contract per owner per tenant
- Storage fee = CLOSING qty × rate × day_type [B-02, B-03]
- **Free days per lot via lot.first_received_date** [v5.0]
- **Snapshot per lot for precise billing** [v5.0]
- EOD snapshot 23:59 UTC+7 [C-01]
- IN_TRANSIT excluded from billing
- All billing parameters configurable per tenant
- VAT 10% (configurable)
- Debit note LOCKED = immutable, corrections via credit_note
- Auto-capture only (no manual billing_transaction)

---

## Phase 8 — VAS / Bagging [v5.0: ISS-15 + ISS-16 FIX]

**Sprints:** 26–27 (4 tuần)

### Bảng trong scope

| Table | tenant_id | Dependency | Độ phức tạp |
|-------|-----------|------------|-------------|
| bagging_work_order | ✅ UUID | Phase 1, 2, 7 | Complex |
| bagging_progress | ✅ UUID | bagging_work_order | Medium |

### bagging_work_order Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| bwo_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| bwo_number | VARCHAR(50) | Y | |
| owner_id | UUID FK | Y | |
| warehouse_id | UUID FK | Y | |
| source_item_id | UUID FK → item | Y | Bulk SKU |
| target_item_id | UUID FK → item | Y | Bagged SKU |
| packaging_item_id | UUID FK → item | N | |
| **source_lot_id** | **UUID FK → lot** | **N** | **Lot to consume (FIFO if NULL)** |
| source_location_id | UUID FK | Y | |
| target_location_id | UUID FK | Y | location_type = VAS [H-05] |
| planned_qty_kg | DECIMAL(14,2) | Y | |
| planned_bag_count | INT | Y | |
| actual_qty_kg | DECIMAL(14,2) | N | |
| actual_bag_count | INT | N | |
| waste_qty_kg | DECIMAL(14,2) | N | |
| waste_tolerance_pct | DECIMAL(5,2) | Y | Default 0.5% |
| packaging_ownership | ENUM | Y | TVL_OWNED / CLIENT_OWNED |
| status | ENUM | Y | DRAFT / CONFIRMED / IN_PROGRESS / PARTIALLY_COMPLETED / COMPLETED / CANCELLED |
| UNIQUE | (tenant_id, bwo_number) | | |

### VAS InventTrans [v5.0: ISS-15 FIX — use existing trans_types]

```
At COMPLETED:

  InventTrans #1 (consume bulk): [ISS-15 FIX: use ISSUE, not VAS_CONSUME]
    trans_type = ISSUE
    stage = DEDUCTED
    qty = -actual_qty_kg
    item_id = source_item_id (BULK)
    invent_dim = (source_location, AVAILABLE, source_lot_id)
    reference_type = BAGGING
    reference_id = bwo_id

  InventTrans #2 (consume packaging — if TVL_OWNED):
    trans_type = ISSUE
    stage = DEDUCTED
    qty = -actual_bag_count (in PIECE UOM → convert to tracking UOM)
    item_id = packaging_item_id
    reference_type = BAGGING

  InventTrans #3 (produce bagged): [ISS-15 FIX: use RECEIPT, not VAS_PRODUCE]
    trans_type = RECEIPT
    stage = PHYSICAL
    qty = +actual_qty_kg
    item_id = target_item_id (BAGGED)
    invent_dim = (target_location VAS, AVAILABLE, new_lot_id)
    reference_type = BAGGING
    
    new_lot_id: auto-created lot for bagged product
      lot.source_lot_id = source_lot_id (traceability)
      lot attrs inherited from source lot

  InventTrans #4 (waste — if waste > 0):
    trans_type = ADJUSTMENT
    stage = PHYSICAL
    qty = -waste_qty_kg
    item_id = source_item_id
    reference_type = BAGGING
    reason_code = BAGGING_WASTE
```

### DPM Dual Tracking [H-01, ISS-16 FIX]

```
When owner.dual_tracking_enabled = TRUE:

  InventTrans #1 (PRIMARY): actual weight — affects on_hand
    stage = PHYSICAL (or DEDUCTED)
    is_nominal = FALSE (default)

  InventTrans #2 (NOMINAL): nominal - actual — reference only [ISS-16 FIX]
    stage = REGISTERED  ← does NOT affect on_hand
    is_nominal = TRUE   ← reconciliation skips this
    qty = (bag_count × nominal_per_unit) - actual_qty
    reference_type = BAGGING
    notes = 'DPM nominal adjustment'

  on_hand tracks ACTUAL weight only.
  Reports: DPM-specific shows both actual and nominal.
  Billing: configurable (actual or nominal) per contract.
```

### Business Rules — VAS

- 2 separate SKUs: bulk + bagged [D-05]
- **VAS uses ISSUE/RECEIPT trans_types with reference_type=BAGGING** [ISS-15 FIX]
- **DPM nominal: stage=REGISTERED, is_nominal=TRUE** [ISS-16 FIX]
- Waste > threshold → WARNING + alert [H-03]
- Packaging material: full InventTrans tracking [H-02]
- Partial complete: PARTIALLY_COMPLETED state [H-04]
- VAS location type [H-05]
- **Lot traceability: source_lot_id on produced lot** [v5.0]
- Multi-session, OT tracking per session [H-07]

---

## Phase 9 — Reports, Customer Portal & UAT

**Sprints:** 28–30 (6 tuần)

### Reports

**RPT-01: Inventory Position** — WH, Location, Owner, Item, **Lot**, Status, Physical/Allocated/Available
**RPT-02: Inventory Movement** — Date, Trans Type, Ref, Item, Owner, **Lot**, From/To Loc, Qty
**RPT-03: Warehouse Capacity** — WH, Type, Max/Current, Utilization %
**RPT-04: Weighbridge Log** — Date, Ticket#, Direction, Vehicle, Gross/Tare/Net
**RPT-05: Billing Summary** — Owner, Period, Fee Type, **Lot/BL**, Qty, Rate, Amount
**RPT-06: Debit Note** — DN#, Owner, Period, Fee Breakdown, Status
**RPT-07: Lot Traceability** [NEW] — Input lot# or BL → receipt → on_hand → shipments → VAS

### Dashboard KPIs

| KPI | Warning Threshold |
|-----|-------------------|
| Warehouse Utilization | ≥ 80% |
| Pending Inbound | > 10 POs |
| Pending Outbound | > 10 SOs |
| Truck Turnaround | > 3 hours |
| Receipt-to-Putaway | > 24 hours |
| Order-to-Ship | > 48 hours |
| Weighing Reject Rate | > 5% |
| Billing Pending Approval | > 5 DNs |
| Overdue Transfers | > 0 |
| Inventory Accuracy | < 98% |

### Customer Portal [K-03]

```
Phase 1 scope:
  - View own inventory per lot: item, lot#, BL, vessel, origin, grade, qty
  - View own debit notes
  - Read-only
  - Role: CUST_VIEWER, auto-filtered by tenant_id + owner_id
```

### Opening Balance [K-06: Excel import]

```
Columns: warehouse_code, location_code, item_sku, owner_storerkey,
         qty_kg, inventory_status,
         lot_attr_01..12 (optional)

Process:
  1. Upload Excel
  2. Validate references (tenant-scoped)
  3. get_or_create_lot per row (if lot attrs provided)
  4. InventTrans ADJUSTMENT per row (stage=PHYSICAL)
  5. lot_id = NULL if no lot attrs → "legacy" on_hand record
```

---

## Timeline Summary

| Phase | Sprints | Tuần | Tables | Key v5.0 Changes |
|-------|---------|------|--------|-------------------|
| 0A: Auth + Tenant | 1 | 1–2 | 7 | tenant_id, RLS, JWT tenant claim |
| 0B: Foundation | 1–2 | 1–4 | 9 | system_config per tenant |
| 1: Master Data | 3–6 | 5–12 | **12** | **+ lot table** |
| 2: Inventory | 7–8 | 13–16 | **7** | **ALLOCATED/DE_ALLOCATED stages, split ordered_qty** **+ event-sourced infra (outbox, checkpoint, row_version)** |
| 3: Weighbridge | 9–10 | 17–20 | **2** | **weighing_attempt removed, weighbridge_log redesigned per-line** |
| 4: Inbound | 11–13 | 21–26 | 6 | **Explicit putaway InventTrans, lot_id at receipt** |
| 5: Outbound | 14–17 | 27–34 | 7 | **Pick/Load InventTrans, ship from SHIPPING, residual cleanup** |
| 6: Transfer | 18–19 | 35–38 | 3 | **Transit loss from IN_TRANSIT** |
| 7: Billing | 20–25 | 39–50 | 11 | **Snapshot per lot, free days per lot** |
| 8: VAS | 26–27 | 51–54 | 2 | **ISSUE/RECEIPT trans_types, DPM is_nominal** |
| 9: Reports + UAT | 28–32 | 55–64 | — | **Lot traceability report, customer portal per lot** |
| **TOTAL** | **~32 sprints** | **~64 tuần** | **~59** | |

> **Implementation Note (TASK 0):** 53 NEW entities + 7 REUSED from System schema = 60 total entity registrations in DbContext. The `tenants` table is NOT in this DB — managed by external TenantAdmin API.

*+2 sprints vs v4.0 for tenant infrastructure + lot tracking*

---

## Risk Register

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Weighbridge hardware | High | High | Site visit Sprint 0, mixed mode |
| InventTrans volume (more trans per operation) | Medium | High | Index strategy [F-04]. Monitor from Phase 4. |
| Lot table growth | Medium | Medium | Partial index is_active=TRUE. Nightly archival. |
| Billing configurable complexity | High | High | Config UI + default presets |
| 4-level outbound + pick/load InventTrans | High | High | Full trace test per operation. Reconciliation daily. |
| DPM dual-tracking is_nominal | Medium | Medium | Dedicated test scenarios |
| Free days per lot | High | Medium | Unit tests per mode |
| Tenant RLS performance | Low | Medium | Test with RLS on/off benchmark |
| Pick InventTrans negative check | Medium | High | Pre-check before every physical move |
| Post-ship residual accumulation | Medium | Medium | Monitor SHIPPING location daily |
| Cross-tenant data leak | Low | Critical | RLS + application middleware + integration tests |
| Event-sourced materialization lag | Medium | Medium | Monitor p99 latency < 100ms, alert on lag > 1s |
| Advisory lock contention (hot SKUs) | Low | Medium | Lock scope = (tenant, item, dim), different SKUs parallel |

---

## CONFIRMED DECISIONS REGISTER (v5.0)

### Architecture Decisions

| ID | Decision | Status |
|----|----------|--------|
| D-01 | Lot tracking: **lot table + lot_id in dim_hash, configurable hash per tenant** | ★ UPDATED v5.0 |
| D-02 | Weighbridge: Mixed mode (API + Manual) | Unchanged |
| D-03 | Mobile: PWA Hybrid, minimal offline | Unchanged |
| D-04 | Multi-SKU receipt: Yes mandatory, manual input | Unchanged |
| D-05 | Bagging: 2 separate SKUs | Unchanged |
| D-06 | **Multi-tenancy: tenant_id UUID from auth, RLS, all tables** | ★ NEW v5.0 |
| **D-07** | **Hybrid Multi-Tenancy**: DB-per-tenant for large tenants + Shared DB with tenant_id filtering for small tenants. `IDbContextResolver` resolves per request. No PostgreSQL RLS `SET LOCAL` — tenant isolation via EF Core `TenantSaveChangesInterceptor` | ★ NEW (TASK 0) |
| **D-08** | **No Tenant Table in WMS DB**: Tenant lifecycle managed by external TenantAdmin API (Refit). `tenant_id` from JWT claim only. Auth entities (User, UserRole, etc.) reused from existing System schema | ★ NEW (TASK 0) |
| **D-09** | **Base Class Hierarchy**: `TenantEntity`, `TenantSoftDeletedEntity`, `AppendOnlyEntity` base classes + `ITenantEntity` interface for interceptor pattern | ★ NEW (TASK 0) |
| **D-10** | **Enum Storage**: All enums stored as strings via `.HasConversion<string>()` in EF configurations for readability and portability | ★ NEW (TASK 0) |

### Issue Fixes Incorporated (v5.0)

| Issue | Fix | Phase |
|-------|-----|-------|
| ISS-01 | Pick creates InventTrans STORAGE → STAGING | 5 |
| ISS-02 | Allocation via ALLOCATED/DE_ALLOCATED stages | 2, 5 |
| ISS-03 | SHIPPED deducts from SHIPPING location | 5 |
| ISS-04 | Post-ship residual cleanup | 5 |
| ISS-05 | Loading creates InventTrans STAGING → SHIPPING | 5 |
| ISS-06 | Transit loss from IN_TRANSIT bucket | 6 |
| ISS-07 | Over-pick via pick_variance_kg | 5 |
| ISS-08 | EXPECTED uses default receipt location | 2, 4 |
| ISS-09 | Reverse EXPECTED when PHYSICAL/SHIPPED | 2, 4, 5 |
| ISS-10 | Separate inbound/outbound ordered_qty | 2 |
| ISS-11 | Putaway InventTrans explicit | 4 |
| ISS-12 | Adjustment always stage=PHYSICAL | 2 |
| ISS-13 | Combined status+location = 1 pair | 4 |
| ISS-14 | Max 1 loc default, coordinator override | 5 |
| ISS-15 | VAS uses ISSUE/RECEIPT trans_types | 8 |
| ISS-16 | DPM nominal: REGISTERED + is_nominal | 8 |
| v5.1 | Event-sourced inventory: append-only invent_trans + async on_hand materialization | 2 |
| v5.1 | uom/uom_conversion/inventory_status promoted to tenant-scoped | 0B, 2 |
| v5.1 | Weighbridge redesigned: per-line model, weighing_attempt removed | 3 |
| v5.1 | Advisory lock for allocation (replaces FOR UPDATE on on_hand) | 5 |
| v5.1 | UOM-based weighbridge update logic + item_group.weighbridge_qty_uom | 3, 4, 5 |
| v5.1 | EF Core Interceptor pattern: `TenantSaveChangesInterceptor` auto-sets `tenant_id` on INSERT for all `ITenantEntity` entities | 0A |
| v5.1 | Base class hierarchy: `TenantEntity`, `TenantSoftDeletedEntity`, `AppendOnlyEntity` + `ITenantEntity` interface | 0A |
| v5.1 | DB Schema mapping: `system`, `cat` (master data), `ops` (operations), `inv` (inventory), `billing`, `logging` | 0B |

### Previously Confirmed (unchanged from v4.0)

| Series | Count | Status |
|--------|-------|--------|
| B-01 → B-10 | 10 Conflict Resolutions | ✅ |
| C-01 → C-15 | 15 Billing configs | ✅ |
| D-01 → D-06 | 6 Inbound configs | ✅ |
| E-01 → E-10 | 10 Outbound configs | ✅ |
| F-01 → F-08 | 8 Inventory configs | ✅ |
| G-01 → G-06 | 6 Weighbridge configs | ✅ |
| H-01 → H-08 | 8 VAS/DPM configs | ✅ |
| I-01 → I-04 | 4 Transfer configs | ✅ |
| J-01 → J-05 | 5 Master Data configs | ✅ |
| K-01 → K-08 | 8 Platform configs | ✅ |
| CFM-01 → CFM-12 | 12 Gap Analysis | ✅ |
| TC-01 → TC-18 | 10 TVL To-Confirm | ✅ |

---

## Open Questions (Operational Only)

| # | Question | Owner | When |
|---|---------|-------|------|
| OQ-01 | Weighbridge hardware model per kho | TVL Ops | Sprint 9 |
| OQ-02 | Billing rate card samples | TVL Finance | Sprint 20 |
| OQ-03 | Document template existing forms | TVL Ops | Sprint 28 |
| OQ-04 | DPM billing base (actual vs nominal) | TVL + DPM | Sprint 26 |
| OQ-05 | lot_hash_attrs final list confirmation | TVL Ops | Sprint 3 |

---

## Appendix: Complete Table Inventory by Phase

| Phase | Table | tenant_id | lot-aware |
|-------|-------|-----------|-----------|
| 0A | tenants | — (is root) | — |
| 0A | users | ✅ UUID | — |
| 0A | roles | ✅ UUID | — |
| 0A | user_roles | ✅ UUID | — |
| 0A | permissions | ✅ UUID | — |
| 0A | role_permissions | ✅ UUID | — |
| 0A | user_warehouse_access | ✅ UUID | — |
| 0B | number_sequence | ✅ UUID | — |
| 0B | audit_log | ✅ UUID | — |
| 0B | uom | ✅ UUID | — |
| 0B | uom_conversion | ✅ UUID | — |
| 0B | reason_code | ✅ UUID | — |
| 0B | notification_config | ✅ UUID | — |
| 0B | notification_log | ✅ UUID | — |
| 0B | document_template | ✅ UUID | — |
| 0B | system_config | ✅ UUID | — |
| 1 | warehouse | ✅ UUID | — |
| 1 | zone | ✅ UUID | — |
| 1 | location | ✅ UUID | — |
| 1 | owner | ✅ UUID | — |
| 1 | owner_warehouse_access | ✅ UUID | — |
| 1 | vendor | ✅ UUID | — |
| 1 | item | ✅ UUID | — |
| 1 | item_group | ✅ UUID | — |
| 1 | item_incompatibility | ✅ UUID | — |
| 1 | carrier | ✅ UUID | — |
| 1 | vehicle_type | ✅ UUID | — |
| 1 | **lot** | **✅ UUID** | **★ Root** |
| 2 | invent_dim | ✅ UUID | ✅ lot_id FK |
| 2 | on_hand | ✅ UUID | via invent_dim |
| 2 | invent_trans | ✅ UUID | via invent_dim |
| 2 | inventory_adjustment | ✅ UUID | — |
| 2 | inventory_status | ✅ UUID | — |
| 2 | **inventory_event_outbox** | **✅ UUID** | — | **NEW v5.1** |
| 2 | **materialization_checkpoint** | **✅ UUID** | — | **NEW v5.1** |
| 3 | weighbridge | ✅ UUID | — |
| 3 | weighbridge_log | ✅ UUID | — |
| 4 | purchase_order | ✅ UUID | — |
| 4 | purchase_order_line | ✅ UUID | lot_attrs stored |
| 4 | inbound_receipt | ✅ UUID | — |
| 4 | inbound_receipt_line | ✅ UUID | ✅ lot_id FK |
| 4 | work_header | ✅ UUID | — |
| 4 | work_line | ✅ UUID | — |
| 5 | sale_order | ✅ UUID | — |
| 5 | sale_order_detail | ✅ UUID | ✅ optional lot_id |
| 5 | order_header | ✅ UUID | — |
| 5 | order_detail | ✅ UUID | via allocation |
| 5 | allocation_record | ✅ UUID | via invent_dim |
| 6 | transfer_header | ✅ UUID | — |
| 6 | transfer_line | ✅ UUID | ✅ lot_id FK |
| 7 | fee_type | ✅ UUID | — |
| 7 | day_type_config | ✅ UUID | — |
| 7 | calendar_detail | ✅ UUID | — |
| 7 | billing_condition | ✅ UUID | — |
| 7 | billing_contract | ✅ UUID | — |
| 7 | contract_fee_line | ✅ UUID | — |
| 7 | billing_transaction | ✅ UUID | — |
| 7 | daily_storage_snapshot | ✅ UUID | ✅ lot_id FK |
| 7 | debit_note | ✅ UUID | — |
| 7 | debit_note_line | ✅ UUID | — |
| 7 | credit_note | ✅ UUID | — |
| 8 | bagging_work_order | ✅ UUID | ✅ source_lot_id |
| 8 | bagging_progress | ✅ UUID | — |

**Total: ~59 tables. ALL with tenant_id UUID (100% tenant isolation, 0 global tables).**

---

*END OF SPEC v5.1 — Replaces v5.0*

*Prepared by: Smartlog Solution Team — Squad 2 BA — March 2026*
