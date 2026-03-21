# Feature Spec: TVL SWM — Development Phase Plan v5.0

**Date:** 2026-03-11
**Author:** BA Agent
**Status:** Draft v5.0 — REPLACES v4.0
**Source:** v4.0 (85 confirmed items) + 16-Issue Inventory Fix + Lot Tracking + Multi-Tenancy

---

## CHANGE LOG v4.0 → v5.0

| # | Category | Change |
|---|----------|--------|
| 1 | Architecture | `tenant_id UUID` (from auth) on ALL ~55 business tables. RLS enforced. |
| 2 | Architecture | New `lot` table with configurable hash. `lot_id` in `invent_dim`. |
| 3 | Golden Rule | ALL on_hand changes via InventTrans — zero exceptions (incl. allocated_qty). |
| 4 | Golden Rule | on_hand MUST reflect correct physical location at ALL times. |
| 5 | Phase 2 | New InventTrans stages: ALLOCATED, DE_ALLOCATED. |
| 6 | Phase 2 | Separate `inbound_ordered_qty` / `outbound_ordered_qty`. |
| 7 | Phase 2 | Reverse EXPECTED trans when PHYSICAL posted. Adjustment always stage=PHYSICAL. |
| 8 | Phase 4 | Putaway InventTrans explicitly defined. Combined status+location 1 pair. |
| 9 | Phase 5 | Pick + Loading create InventTrans location change. SHIPPED from SHIP location. |
| 10 | Phase 5 | Allocation via InventTrans ALLOCATED stage. Post-ship residual cleanup. |
| 11 | Phase 6 | Transit loss deducts from IN_TRANSIT bucket. |
| 12 | Phase 8 | VAS uses ISSUE/RECEIPT trans_types. DPM nominal: stage=REGISTERED, is_nominal. |
| 13 | Architecture | Event-Sourced Inventory: `invent_trans` = append-only WRITE model, `on_hand` = async materialized READ model. New RULE 5 — Concurrency Safety. |
| 14 | Architecture | New tables: `inventory_event_outbox`, `materialization_checkpoint`. New fields: `invent_trans.seq_no`, `invent_trans.batch_id`, `on_hand.row_version`, `on_hand.last_materialized_at`. |
| 15 | Architecture | `uom`, `uom_conversion`, `inventory_status` promoted from global → tenant-scoped (seeded per tenant on creation). |
| 16 | Phase 3 | Weighbridge redesigned: per-line model (N logs per document). `weighing_attempt` table removed. `weighbridge_log` redesigned with auto-resolve + cascading chain. |
| 17 | Phase 3 | New `item_group.weighbridge_qty_uom` field. UOM-based weighbridge update logic for qty vs net_weight. |
| 18 | Phase 4 | Added `purchase_order_line.net_weight_kg`, `inbound_receipt_line.net_weight_kg`, `inbound_receipt_line.uom`. |
| 19 | Phase 5 | Added `sale_order_detail.net_weight_kg`, `order_detail.net_weight_kg`, `order_detail.uom`. |
| 20 | Phase 2 | Allocation uses `pg_advisory_xact_lock` + compute available from `invent_trans` (NOT from `on_hand`). Partition strategy for high-volume tables. |

---

## Overview

Thoresen Vinama Logistics (TVL) xây dựng hệ thống Smart Warehouse Management (SWM) từ đầu, kiến trúc tham khảo D365 FO Advanced Warehouse. Hệ thống quản lý 11 kho, ~81,500 m², chuyên hàng xá (bulk cargo) — phụ thuộc hoàn toàn vào cân (weighbridge), không barcode/RFID.

| Metric | Value |
|--------|-------|
| Tổng số bảng | ~59 |
| ENUM types | ~47 |
| Multi-tenancy | **tenant_id UUID (from auth) on ALL business tables, RLS enforced** |
| Lot tracking | **lot table + lot_id in invent_dim, configurable hash attrs** |
| Inventory posting | **ALL on_hand changes via InventTrans — ZERO EXCEPTIONS** |
| Location accuracy | **on_hand reflects physical location at ALL times** |
| Concurrency model | **Event-Sourced: invent_trans (WRITE) → async materialized on_hand (READ)** |
| Key pattern | D365 InventDim + InventTrans (Single Source of Truth) |
| Negative inventory | NOT ALLOWED — hard block |
| Weight precision | 2 decimal (KG), 3 decimal (MT) |
| Currency | VND (Phase 1) |
| Mobile | PWA Hybrid, minimal offline |

---

## GOLDEN RULES (v5.0)

```
RULE 1 — SINGLE SOURCE OF TRUTH:
  on_hand = READ MODEL (materialized from invent_trans).
  invent_trans = WRITE MODEL (append-only ledger).
  MỌI thay đổi on_hand PHẢI qua InventTrans — kể cả allocated_qty.
  on_hand rebuild bất kỳ lúc nào từ SUM(invent_trans).

RULE 2 — TENANT ISOLATION:
  tenant_id UUID từ auth system, có mặt trên MỌI business table.
  MỌI query filter tenant_id. MỌI unique constraint = (tenant_id, key).
  RLS enforced at database level. Application middleware auto-inject.

RULE 3 — LOT TRACEABILITY:
  Mọi inventory gắn lot_id (nullable for legacy/adjustment).
  lot_id trong invent_dim → on_hand tách per lot tự nhiên.
  Lot auto-merge cùng hash, auto-tách khác hash.

RULE 4 — LOCATION ACCURACY:
  on_hand reflect đúng location vật lý tại MỌI thời điểm.
  Putaway, Pick, Load đều tạo InventTrans location change.

RULE 5 — CONCURRENCY SAFETY:
  Inbound: bulk INSERT into invent_trans (append-only, zero lock contention)
    → async materialization to on_hand via background worker.
  Outbound allocation: pg_advisory_xact_lock per (tenant_id, item_id, invent_dim_id)
    → serialize allocations per SKU/location to prevent over-allocation.
  on_hand uses row_version for optimistic concurrency on direct updates.
  NEVER read on_hand for allocation decisions — compute available from invent_trans.
```

> **Base Class Hierarchy (implemented in TASK 0):**
> - `TenantEntity` (BaseEntity + ITenantEntity): For most WMS business tables
> - `TenantSoftDeletedEntity` (TenantEntity + IDeletionAuditedEntity): For master data with soft-delete
> - `AppendOnlyEntity` (IEntity + ITenantEntity + ICreationAuditedEntity): For immutable records (InventTrans, AuditLog, BillingTransaction)
> - `ITenantEntity` interface enables `TenantSaveChangesInterceptor` to detect and auto-set tenant_id

---

## Multi-Tenancy Architecture [D-06]

### tenant_id Definition

```
Type:   UUID (NOT NULL)
Source: Authentication system (JWT claim / session)
Flow:   User login → Auth service issues token with tenant_id claim
        → API middleware extracts tenant_id from token
        → Injected into every DB query automatically

Phase 1: TVL = 1 tenant (1 UUID in auth system)
Future:  Multiple tenants (SaaS-ready)
```

### Database Enforcement

```sql
-- Every business table:
tenant_id UUID NOT NULL

-- RLS policy per table:
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY {table}_tenant ON {table}
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Application sets tenant per DB connection:
SET app.current_tenant = '{uuid-from-auth-token}';

-- All unique constraints include tenant_id:
UNIQUE (tenant_id, business_key)

-- All indexes start with tenant_id:
CREATE INDEX idx_{table}_... ON {table}(tenant_id, ...);
```

> **Implementation Notes (TASK 0):**
> - **Hybrid Multi-Tenancy**: DB-per-tenant (large tenants) + Shared DB with tenant_id column filtering (small tenants). `IDbContextResolver` resolves connection per request from JWT `TenantDBConfiguration` claim, falls back to `DefaultConnection`.
> - **EF Core Interceptor**: `TenantSaveChangesInterceptor` auto-sets `tenant_id` on INSERT for all `ITenantEntity` entities. No PostgreSQL RLS `SET LOCAL` needed.
> - **Global Query Filter**: `TenantSoftDeletedEntity` subtypes get automatic `WHERE deleted_time IS NULL` filter via `OnModelCreating`.
> - **Partitioning**: Deferred to later phase — not implemented in initial EF migration.

### Tenant-Scoped Reference Tables (seeded per tenant) [v5.1 UPDATE]

```
uom               — seeded per tenant on creation (KG, MT, BAG, PIECE defaults)
uom_conversion    — seeded per tenant (standard conversions)
inventory_status  — seeded per tenant (AVAILABLE/DAMAGED/BLOCKED/IN_TRANSIT defaults, tenants can add custom)
```

On tenant creation, system copies default records into tenant scope.
Previously global in v5.0 — promoted to tenant-scoped in v5.1 for SaaS flexibility.

All ~59 business tables: tenant_id UUID NOT NULL (100% coverage, 0 global tables).

---

## Dependency Map

```
Phase 0A (Auth + Tenant + RLS) ──→ ALL PHASES
Phase 0B (Platform Foundation) ──→ ALL PHASES
         ↓
Phase 1 (Master Data + Lot Table)
         ↓
Phase 2 (Inventory Core — ALLOCATED/DE_ALLOCATED stages)
    ↓              ↓
Phase 3          Phase 4 (Inbound — explicit putaway InventTrans)
(Weighbridge)        ↓
    ↓____________↓
         ↓
    Phase 5 (Outbound — pick/load InventTrans, ship from SHIPPING loc)
         ↓
    Phase 6 (Transfer — transit loss from IN_TRANSIT)
         ↓
    Phase 7 (Billing — snapshot per lot)
         ↓
    Phase 8 (VAS — ISSUE/RECEIPT trans_types, DPM dual-tracking)
         ↓
    Phase 9 (Reports, Customer Portal, UAT)
```

---

## Week 0 Decisions [ALL CONFIRMED]

| # | Decision | Confirmed |
|---|----------|-----------|
| D-01 | Lot tracking | **v5.0 UPDATED**: lot table + lot_id in dim_hash. Configurable hash attrs per tenant. |
| D-02 | Weighbridge | (D) Mixed mode (API + Manual) |
| D-03 | Mobile | (C) PWA Hybrid, minimal offline |
| D-04 | Multi-SKU receipt | (A) Yes mandatory, manual input per line |
| D-05 | Bagging model | (A) 2 separate SKUs |
| **D-06** | **Multi-tenancy** | **NEW: tenant_id UUID from auth on ALL tables. RLS enforced.** |

---

## Phase 0A — Auth & Tenant System

**Sprints:** 1 (2 tuần, song song Phase 0B)

### Bảng trong scope

| Table | Mô tả | Độ phức tạp |
|-------|--------|-------------|
| tenants | Tenant registry | Simple |
| users | Tài khoản (tenant-scoped) | Medium |
| roles | Vai trò | Simple |
| user_roles | M:N user ↔ role | Simple |
| permissions | Quyền per resource per action | Medium |
| role_permissions | M:N role ↔ permission | Simple |
| user_warehouse_access | User → warehouses | Simple |

### tenants Table [NEW v5.0]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| tenant_id | UUID PK | Y | From auth system |
| name | VARCHAR(200) | Y | VD: "Thoresen Vinama Logistics" |
| code | VARCHAR(50) | Y | VD: "TVL" (display code) |
| is_active | BOOLEAN | Y | |
| created_at | TIMESTAMP | Y | |

### users Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| user_id | UUID PK | Y | |
| **tenant_id** | **UUID FK → tenants NOT NULL** | **Y** | |
| username | VARCHAR(100) | Y | UNIQUE per tenant |
| email | VARCHAR(200) | Y | |
| display_name | VARCHAR(200) | Y | |
| is_active | BOOLEAN | Y | |
| UNIQUE | **(tenant_id, username)** | | |

### Role Definitions

| Role Code | Mô tả |
|-----------|-------|
| ADMIN | Full access, system config |
| WH_MANAGER | Full warehouse ops, approve adjustments |
| WH_SUPERVISOR | Override weights, approve rejects |
| KEEPER | Execute pick/putaway/loading, weighing |
| WB_OPERATOR | Capture weights |
| COORDINATOR | Create PO/SO, manage orders |
| BILLING_MGR | Contract setup, debit note approval |
| BILLING_CLERK | View billing, reports |
| VIEWER | Dashboard and reports |
| CUST_VIEWER | Customer portal — view own inventory + DN |

### Deliverables — Phase 0A

- tenants table + seed TVL tenant
- Auth system: JWT with tenant_id + user_id claims
- Tenant middleware: extract tenant_id UUID from token, SET per DB connection
- RLS policies on ALL tables (created incrementally as tables are added)
- Base repository class: auto-inject tenant_id into every query
- Role + permission seed data per tenant
- Integration test: verify cross-tenant isolation

### Business Rules — Auth

- User MUST belong to exactly 1 tenant
- User MUST have at least 1 role
- User MUST be assigned to at least 1 warehouse
- ALL API endpoints: (a) authenticate, (b) extract tenant_id, (c) check role, (d) check warehouse access
- Supervisor override logs approver user_id in audit_log

> **Implementation Notes (TASK 0 — EF Foundation):**
> - `tenants` table is NOT in this database — tenant lifecycle is managed by external TenantAdmin API (Refit client at `Infrastructure/ApiClients/TenantAdmin/`). `tenant_id` is extracted from JWT claim.
> - `users`, `roles`, `user_roles`, `permissions`, `role_permissions` tables are REUSED from existing System schema entities (`User`, `UserRole`, `UserRoleDependency`, `SecurityGroup`, `UserGroup`). These are NOT tenant-scoped.
> - Only `user_warehouse_access` is a NEW entity (inherits `TenantEntity`).
> - Total: 1 NEW + 6 REUSED from System schema.

---

## Phase 0B — Platform Foundation

**Sprints:** 1–2 (4 tuần)

### Bảng trong scope

| Table | tenant_id | Mô tả | Độ phức tạp |
|-------|-----------|--------|-------------|
| number_sequence | ✅ UUID | Auto-generate document numbers | Medium |
| audit_log | ✅ UUID | Change log (append-only) | Medium |
| uom | ✅ UUID | Đơn vị tính. Seeded per tenant on creation | Simple |
| uom_conversion | ✅ UUID | Chuyển đổi. Seeded per tenant on creation | Simple |
| reason_code | ✅ UUID | Mã lý do | Simple |
| notification_config | ✅ UUID | Alert config | Medium |
| notification_log | ✅ UUID | Notification history | Simple |
| document_template | ✅ UUID | Print templates | Medium |
| system_config | ✅ UUID | Tenant-level configuration | Medium |

### system_config Table [NEW v5.0]

| Field | Type | Mô tả |
|-------|------|-------|
| config_id | UUID PK | |
| tenant_id | UUID FK NOT NULL | |
| config_key | VARCHAR(100) NOT NULL | |
| config_value | JSONB NOT NULL | |
| UNIQUE | (tenant_id, config_key) | |

**Seed config per tenant:**

| Key | Default Value | Mô tả |
|-----|---------------|-------|
| lot_hash_attrs | `["item_id","owner_id","lot_attr_01","lot_attr_03","lot_attr_08","lot_attr_09"]` | Attrs cho lot hash |
| default_tolerance_pct | 5.0 | Fallback tolerance |
| allocation_expiry_hours | 24 | Auto-deallocate timeout |
| default_max_pick_locations | 1 | Default max pick locations |
| snapshot_time | "23:59" | EOD snapshot |
| snapshot_timezone | "Asia/Ho_Chi_Minh" | |
| vat_rate | 10.0 | VAT % |
| max_backdate_days | 30 | Billing backdate limit |
| max_reweigh_attempts | 3 | Weighbridge retry limit |
| weighbridge_session_timeout_hours | 4 | Session timeout |

### Number Sequence

```
Format: {PREFIX}-{WH_CODE}-{YYYYMMDD}-{SEQ:6}
VD: RCV-WH51-20260309-000001

Scope: PER_TENANT + PER_WAREHOUSE, daily reset
UNIQUE: (tenant_id, prefix, warehouse_id, date, seq)
Prefixes: RCV, SHP, PO, SO, TO, WB, DN, BWO, WH, ADJ, LOT
```

### Audit Log

| Field | Type | Mô tả |
|-------|------|-------|
| log_id | UUID PK | |
| tenant_id | UUID NOT NULL | |
| table_name | VARCHAR(100) | |
| record_id | UUID | |
| action | ENUM | INSERT / UPDATE / DELETE / STATUS_CHANGE |
| old_values | JSONB | |
| new_values | JSONB | |
| user_id | UUID FK | |
| ip_address | VARCHAR(50) | |
| created_at | TIMESTAMP | Partition key (monthly) |

Immutable, append-only. Retention: 24 months online.

### Reason Code Catalog

| Category | Codes | Requires Approval |
|----------|-------|-------------------|
| MANUAL_WEIGHT | SCALE_MALFUNCTION, DAMAGED_TICKET, CALIBRATION_ERROR | TRUE |
| ADJUSTMENT | PHYSICAL_COUNT, SYSTEM_ERROR, DATA_CORRECTION | TRUE |
| DAMAGE | WATER_DAMAGE, CONTAMINATION, PEST_DAMAGE, HANDLING_DAMAGE | FALSE |
| REJECTION | OVER_TOLERANCE, QUALITY_FAIL, WRONG_ITEM, DOC_MISMATCH | FALSE |
| CANCELLATION | CUSTOMER_REQUEST, OPERATIONAL_ISSUE, DUPLICATE_ENTRY | FALSE |
| TRANSFER | REBALANCE_STOCK, CUSTOMER_REQUEST, CAPACITY_MANAGEMENT | FALSE |
| OVERRIDE | SUPERVISOR_OVERRIDE, EMERGENCY_RELEASE | TRUE |
| SHIP_VARIANCE | POST_SHIP_RETURN, WEIGH_MISMATCH | FALSE |
| TRANSIT_LOSS | IN_TRANSIT_SHORTAGE, IN_TRANSIT_DAMAGE | FALSE |

### Notification System

| Alert Type | Trigger | Recipients | Channel |
|------------|---------|------------|---------|
| CAPACITY_WARNING | occupancy ≥ 80% | WH_MANAGER | In-app |
| RECEIPT_REJECTED | receipt → REJECTED | WH_SUPERVISOR, COORDINATOR | In-app |
| RECEIPT_REJECTED_OVERDUE | REJECTED > 24h | WH_MANAGER | In-app, Email |
| SURPLUS_BLOCKED | order_detail surplus | WH_SUPERVISOR | In-app |
| WEIGHING_MAX_RETRY | retry = max | WH_SUPERVISOR | In-app |
| WEIGHING_SESSION_TIMEOUT | WEIGH_IN > 4h | WH_SUPERVISOR | In-app |
| TRANSFER_OVERDUE | SHIPPED > 24h no RECEIVED | WH_MANAGER both WH | In-app |
| DEBIT_NOTE_PENDING | awaiting approval > 3d | BILLING_MGR | In-app, Email |
| ADJUSTMENT_PENDING | awaiting approval | WH_MANAGER | In-app |
| ALLOCATION_EXPIRED | not picked within 24h | COORDINATOR | In-app |
| WASTE_THRESHOLD | bagging waste > % | WH_SUPERVISOR | In-app |

### Document Templates [8 types]

| Document | Trigger | Copies |
|----------|---------|--------|
| Phiếu Nhận Hàng | receipt → RECEIVED | 3 |
| Phiếu Cân | weighbridge → COMPLETED | 2 |
| Phiếu Xuất Kho | order → SHIPPED | 3 |
| Phiếu Ra Cổng | SHIPPED or RECEIVED | 2 |
| Biên Bản Giao Hàng | order → SHIPPED | 2 |
| Phiếu Chuyển Kho | transfer → SHIPPED | 2 |
| Phiếu Ghi Nợ | debit_note → APPROVED | 2 |
| Báo Cáo Đóng Bao | BWO → COMPLETED | 1 |

---

## Phase 1 — Master Data + Lot Table

**Sprints:** 3–6 (8 tuần)

### Bảng trong scope

| Table | tenant_id | Dependency | Độ phức tạp |
|-------|-----------|------------|-------------|
| warehouse | ✅ UUID | Phase 0 | Medium |
| zone | ✅ UUID | warehouse | Simple |
| location | ✅ UUID | zone, warehouse | Medium |
| owner | ✅ UUID | — | Medium |
| owner_warehouse_access | ✅ UUID | owner, warehouse | Simple |
| vendor | ✅ UUID | — | Simple |
| item | ✅ UUID | owner | Complex |
| item_group | ✅ UUID | **weighbridge_qty_uom** (VARCHAR(10), default 'KG') | **NEW v5.1** — UOM config for weighbridge qty update logic |
| item_incompatibility | ✅ UUID | item_group | Simple |
| carrier | ✅ UUID | vehicle_type | Simple |
| vehicle_type | ✅ UUID | — | Simple |
| **lot** | **✅ UUID** | **item, owner** | **Medium** |

### lot Table [NEW v5.0]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| lot_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | From auth |
| lot_number | VARCHAR(50) NOT NULL | Y | Auto: LOT-{WH}-{YYYYMMDD}-{SEQ} |
| item_id | UUID FK → item | Y | |
| owner_id | UUID FK → owner | Y | |
| lot_attr_01 | VARCHAR(200) | N | Origin country |
| lot_attr_02 | VARCHAR(200) | N | Crop year |
| lot_attr_03 | VARCHAR(200) | N | Grade / Quality |
| lot_attr_04 | VARCHAR(200) | N | Moisture % |
| lot_attr_05 | VARCHAR(200) | N | Broken % |
| lot_attr_06 | VARCHAR(200) | N | Color |
| lot_attr_07 | VARCHAR(200) | N | Certificate number |
| lot_attr_08 | VARCHAR(200) | N | Vessel name |
| lot_attr_09 | VARCHAR(200) | N | BL number |
| lot_attr_10 | VARCHAR(200) | N | Container number |
| lot_attr_11 | VARCHAR(200) | N | Seal number |
| lot_attr_12 | VARCHAR(200) | N | Custom / free text |
| lot_hash | VARCHAR(64) NOT NULL | Y | SHA-256 of configurable attrs |
| first_received_date | DATE NOT NULL | Y | Ngày nhập đầu tiên — for free days |
| bl_number | VARCHAR(100) | N | Denormalized for fast query |
| vessel_name | VARCHAR(200) | N | Denormalized for fast query |
| source_lot_id | UUID FK → lot | N | VAS traceability (bagged from bulk lot) |
| created_from_receipt_id | UUID FK | N | First receipt that created this lot |
| is_active | BOOLEAN NOT NULL | Y | FALSE when all on_hand = 0 |
| created_at | TIMESTAMP NOT NULL | Y | |
| UNIQUE | (tenant_id, lot_hash) | | |
| UNIQUE | (tenant_id, lot_number) | | |

### lot_hash Computation

```
lot_hash = SHA-256(
  tenant_id::TEXT + '|' +
  item_id::TEXT + '|' +
  owner_id::TEXT + '|' +
  COALESCE(lot_attr_01, '') + '|' +
  COALESCE(lot_attr_03, '') + '|' +
  COALESCE(lot_attr_08, '') + '|' +
  COALESCE(lot_attr_09, '')
)

Attrs in hash: configurable via system_config.lot_hash_attrs per tenant.
Default: [item_id, owner_id, lot_attr_01, lot_attr_03, lot_attr_08, lot_attr_09]
(= SKU + owner + origin + grade + vessel + BL)

Attrs NOT in hash (stored but don't affect merge):
  lot_attr_02 (crop year), lot_attr_04 (moisture), lot_attr_05 (broken%),
  lot_attr_06 (color), lot_attr_07 (certificate),
  lot_attr_10 (container), lot_attr_11 (seal), lot_attr_12 (custom)

→ 2 receipts cùng hash attrs → MERGE vào 1 lot (get existing)
→ 2 receipts khác hash attrs → TÁCH thành 2 lots (create new)
```

### get_or_create_lot Function

```sql
FUNCTION get_or_create_lot(
  p_tenant_id UUID,
  p_item_id UUID,
  p_owner_id UUID,
  p_attrs VARCHAR(200)[12],
  p_receipt_id UUID,
  p_received_date DATE
) RETURNS UUID AS $$
DECLARE
  v_hash VARCHAR(64);
  v_lot_id UUID;
  v_hash_attrs TEXT[];
BEGIN
  -- 1. Get configurable hash attrs for this tenant
  SELECT config_value::TEXT[]
  INTO v_hash_attrs
  FROM system_config
  WHERE tenant_id = p_tenant_id AND config_key = 'lot_hash_attrs';

  -- 2. Compute hash from configured attrs
  v_hash := compute_lot_hash(p_tenant_id, p_item_id, p_owner_id,
                             p_attrs, v_hash_attrs);

  -- 3. Get or create (concurrent-safe)
  INSERT INTO lot (tenant_id, lot_hash, item_id, owner_id,
                   lot_attr_01, ..., lot_attr_12,
                   first_received_date, bl_number, vessel_name,
                   created_from_receipt_id)
  VALUES (p_tenant_id, v_hash, p_item_id, p_owner_id,
          p_attrs[1], ..., p_attrs[12],
          p_received_date, p_attrs[9], p_attrs[8],
          p_receipt_id)
  ON CONFLICT (tenant_id, lot_hash) DO NOTHING
  RETURNING lot_id INTO v_lot_id;

  -- 4. If conflict (existing lot), fetch
  IF v_lot_id IS NULL THEN
    SELECT lot_id INTO v_lot_id
    FROM lot WHERE tenant_id = p_tenant_id AND lot_hash = v_hash;
  END IF;

  RETURN v_lot_id;
END;
$$;
```

### Lot Lifecycle

```
CREATED:    First receipt with these attrs → new lot
MERGED:     Subsequent receipt with same hash → reuse existing lot_id
ACTIVE:     is_active = TRUE (has on_hand > 0 somewhere)
INACTIVE:   is_active = FALSE (all on_hand = 0) → set by nightly job
ARCHIVED:   After 24 months inactive → move to archive

Lot is CROSS-WAREHOUSE: lot_hash does NOT include warehouse_id.
  Same lot can exist at multiple warehouses after transfer.
  on_hand tách per warehouse via invent_dim.warehouse_id.
```

### warehouse Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| warehouse_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| code | VARCHAR(20) | Y | VD: WH51 |
| name | VARCHAR(200) | Y | |
| site_id | VARCHAR(50) | Y | |
| type | ENUM | Y | COVERED / OPEN_YARD / BONDED |
| max_capacity_mt | DECIMAL(12,3) | Y | |
| current_occupancy_mt | DECIMAL(12,3) | Y | Computed from on_hand |
| capacity_warning_pct | DECIMAL(5,2) | Y | Default 80.00 |
| has_weighbridge | BOOLEAN | Y | |
| weighbridge_count | INT | N | |
| default_receipt_loc_id | UUID FK → location | N | |
| default_staging_loc_id | UUID FK → location | N | |
| default_shipping_loc_id | UUID FK → location | N | |
| default_damage_loc_id | UUID FK → location | N | |
| address | TEXT | Y | |
| operating_hours_start | TIME | N | |
| operating_hours_end | TIME | N | |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, code) | | |

### location Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| location_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| code | VARCHAR(30) | Y | |
| warehouse_id | UUID FK | Y | |
| zone_id | UUID FK | N | |
| location_type | ENUM | Y | RECEIVING / STORAGE / STAGING / SHIPPING / DAMAGE / TRANSIT / VAS |
| capacity_mt | DECIMAL(12,3) | N | NULL = unlimited |
| current_occupancy_mt | DECIMAL(12,3) | Y | Default 0 |
| is_mixed_owner | BOOLEAN | Y | Default FALSE, configurable per location |
| is_mixed_item | BOOLEAN | Y | Default FALSE, configurable per location |
| allowed_item_groups | JSONB | N | NULL = all |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, warehouse_id, code) | | |

### item Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| item_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| sku | VARCHAR(50) | Y | |
| name | VARCHAR(200) | Y | |
| owner_id | UUID FK → owner | Y | |
| item_group_id | UUID FK | Y | |
| cargo_form | ENUM | Y | BULK / BAGGED_25KG / BAGGED_40KG / BAGGED_50KG / JUMBO / PACKAGING |
| is_catch_weight | BOOLEAN | Y | TRUE for BULK, BAGGED_* |
| tracking_uom | VARCHAR(10) | Y | Default KG |
| billing_uom | VARCHAR(10) | Y | Default MT |
| nominal_qty_per_unit | DECIMAL(10,2) | N | |
| bag_shell_weight_kg | DECIMAL(6,3) | N | |
| tolerance_pct_inbound | DECIMAL(5,2) | N | |
| tolerance_pct_outbound | DECIMAL(5,2) | N | |
| tolerance_abs_kg | DECIMAL(10,2) | N | |
| shrinkage_rate_pct | DECIMAL(5,2) | N | |
| strategykey | ENUM | Y | FIFO |
| packaging_material_sku | UUID FK → item | N | |
| default_storage_location_id | UUID FK | N | |
| storage_requirement | ENUM | N | COVERED_ONLY / OPEN_OK / CLIMATE_CONTROLLED |
| density_factor | DECIMAL(6,3) | N | |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, sku) | | |

### owner Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| owner_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| storerkey | VARCHAR(50) | Y | |
| name | VARCHAR(200) | Y | |
| owner_type | ENUM | Y | CUSTOMER / INTERNAL / CONSIGNED |
| billing_contact_name | VARCHAR(200) | N | |
| billing_contact_email | VARCHAR(200) | N | |
| ops_contact_name | VARCHAR(200) | N | |
| ops_contact_phone | VARCHAR(20) | N | |
| tax_id | VARCHAR(20) | N | |
| address | TEXT | N | |
| default_tolerance_pct | DECIMAL(5,2) | N | |
| preferred_zone | VARCHAR(50) | N | |
| dual_tracking_enabled | BOOLEAN | N | Default FALSE, TRUE for DPM |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, storerkey) | | |

### vehicle_type Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| vehicle_type_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| code | VARCHAR(20) | Y | |
| name | VARCHAR(100) | Y | |
| default_tare_weight_kg | DECIMAL(10,2) | Y | NOT NULL |
| max_payload_kg | DECIMAL(10,2) | Y | |
| min_weight_threshold_kg | DECIMAL(10,2) | N | |
| axle_count | INT | N | |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, code) | | |

### Putaway Strategy Rules

```
Priority:
1. item.default_storage_location → if configured
2. item_group.preferred_zone → find available in zone
3. owner.preferred_zone → find available in zone
4. warehouse.default_receipt_loc_id → temporary

Location validation:
  - capacity_mt check
  - is_mixed_owner / is_mixed_item check
  - allowed_item_groups check
  - item_incompatibility check
  - storage_requirement vs warehouse.type
```

### Business Rules — Phase 1

- item.is_catch_weight = TRUE for BULK, BAGGED_*
- item.billing_uom = 'MT' always
- item.strategykey = 'FIFO' (Phase 1)
- location.is_mixed_owner/item configurable per location
- vehicle_type.default_tare_weight_kg NOT NULL
- Tolerance: MAX(pct × expected, abs) — item → owner → system fallback
- Soft delete (is_active) on ALL master data
- **lot table: auto-create at receipt, configurable hash per tenant** [v5.0]
- **ALL tables: tenant_id UUID NOT NULL, UNIQUE constraints include tenant_id** [v5.0]

---

## Phase 2 — Inventory Core Engine [MAJOR v5.0 CHANGES]

**Sprints:** 7–8 (4 tuần)

### Bảng trong scope

| Table | tenant_id | Độ phức tạp |
|-------|-----------|-------------|
| invent_dim | ✅ UUID | Complex |
| on_hand | ✅ UUID | Complex |
| invent_trans | ✅ UUID | Complex |
| inventory_status | ✅ UUID | Simple |
| inventory_adjustment | ✅ UUID | Medium |
| **inventory_event_outbox** | **✅ UUID** | **Complex** |
| **materialization_checkpoint** | **✅ UUID** | **Medium** |

### invent_dim Table [v5.0: + lot_id]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| invent_dim_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| site_id | VARCHAR(50) | Y | |
| warehouse_id | UUID FK | Y | |
| location_id | UUID FK | Y | |
| owner_id | UUID FK | Y | |
| inventory_status | ENUM | Y | AVAILABLE / DAMAGED / BLOCKED / IN_TRANSIT |
| **lot_id** | **UUID FK → lot** | **N** | **NULL for legacy/adjustment** |
| dim_hash | VARCHAR(64) NOT NULL | Y | |
| UNIQUE | (tenant_id, dim_hash) | | |

```
dim_hash = SHA-256(
  tenant_id::TEXT + '|' +
  site_id + '|' +
  warehouse_id::TEXT + '|' +
  location_id::TEXT + '|' +
  owner_id::TEXT + '|' +
  inventory_status + '|' +
  COALESCE(lot_id::TEXT, 'NULL')
)
```

### on_hand Table [v5.0: split ordered_qty, tenant in PK]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| tenant_id | UUID NOT NULL | Y | |
| item_id | UUID FK NOT NULL | Y | |
| invent_dim_id | UUID FK NOT NULL | Y | |
| physical_qty | DECIMAL(14,2) | Y | Default 0 |
| reserved_qty | DECIMAL(14,2) | Y | Default 0 (Phase 1) |
| allocated_qty | DECIMAL(14,2) | Y | Default 0 — **via InventTrans** [ISS-02 FIX] |
| **inbound_ordered_qty** | **DECIMAL(14,2)** | **Y** | **Default 0 — PO EXPECTED** [ISS-10 FIX] |
| **outbound_ordered_qty** | **DECIMAL(14,2)** | **Y** | **Default 0 — SO EXPECTED** [ISS-10 FIX] |
| oldest_posted_at | TIMESTAMP | N | MIN(posted_at) of PHYSICAL trans |
| last_updated | TIMESTAMP | Y | |
| **row_version** | **BIGINT** | **Y** | **Default 0. Optimistic concurrency for materialization workers** |
| **last_materialized_at** | **TIMESTAMPTZ** | **N** | **Tracks freshness of read model. Monitoring lag** |
| **PRIMARY KEY** | **(tenant_id, item_id, invent_dim_id)** | | |

```
available_qty (COMPUTED) = physical_qty - reserved_qty - allocated_qty
allocatable_qty = available_qty (same in Phase 1, reserved = 0)
```

### on_hand Rebuild Formula [v5.0: includes allocated]

```sql
-- on_hand can be FULLY rebuilt from invent_trans at any time:

physical_qty = SUM(qty) FROM invent_trans
  WHERE tenant_id = :t AND item_id = :i AND invent_dim_id = :d
    AND stage IN ('PHYSICAL', 'DEDUCTED')

allocated_qty = SUM(qty) FROM invent_trans
  WHERE tenant_id = :t AND item_id = :i AND invent_dim_id = :d
    AND stage IN ('ALLOCATED', 'DE_ALLOCATED')

inbound_ordered_qty = SUM(qty) FROM invent_trans
  WHERE tenant_id = :t AND item_id = :i AND invent_dim_id = :d
    AND stage = 'EXPECTED' AND trans_type = 'RECEIPT'

outbound_ordered_qty = SUM(ABS(qty)) FROM invent_trans
  WHERE tenant_id = :t AND item_id = :i AND invent_dim_id = :d
    AND stage = 'EXPECTED' AND trans_type = 'ISSUE'
```

### InventTrans Stage Machine [v5.0: + ALLOCATED/DE_ALLOCATED]

| Stage | Ảnh hưởng on_hand | Khi nào |
|-------|-------------------|---------|
| EXPECTED | inbound_ordered_qty hoặc outbound_ordered_qty | PO/SO confirmed |
| REGISTERED | KHÔNG | Receipt created, informational |
| **ALLOCATED** | **allocated_qty tăng** | **FIFO allocation lock** ★ NEW |
| **DE_ALLOCATED** | **allocated_qty giảm** | **Release: pick/cancel/expire** ★ NEW |
| PHYSICAL | physical_qty thay đổi | Receipt RECEIVED, putaway, pick move, load move, status change, adjustment |
| DEDUCTED | physical_qty giảm | Ship, transfer issue |

### InventTrans Transition Rules [v5.0 UPDATED]

```
Inbound:
  EXPECTED (+qty, inbound_ordered)
    → REGISTERED (informational)
    → PHYSICAL (+qty, physical increases at RECV location)
    → Reverse EXPECTED (-qty, inbound_ordered decreases) [ISS-09 FIX]
  Putaway:
    → PHYSICAL pair: -qty at RECV, +qty at STORAGE [ISS-11 FIX]

Outbound:
  EXPECTED (-qty, outbound_ordered)
    → ALLOCATED (+qty, allocated increases at STORAGE) [ISS-02 FIX]
    → Pick: PHYSICAL pair -qty STORAGE, +qty STAGING [ISS-01 FIX]
           + DE_ALLOCATED (-qty, release allocation) [ISS-02 FIX]
    → Load: PHYSICAL pair -qty STAGING, +qty SHIPPING [ISS-05 FIX]
    → Ship: DEDUCTED (-qty from SHIPPING) [ISS-03 FIX]
    → Reverse EXPECTED (+qty, outbound_ordered decreases) [ISS-09 FIX]

Adjustment:
  PHYSICAL only (both increase and decrease) [ISS-12 FIX]
  trans_type = ADJUSTMENT, qty positive or negative.

Status Change:
  PHYSICAL pair: -qty at (loc, old_status), +qty at (loc, new_status)
  Combined status+location: -qty at (old_loc, old_status), +qty at (new_loc, new_status) [ISS-13 FIX]

Transfer:
  DEDUCTED at source → PHYSICAL at TRANSIT
  → DEDUCTED at TRANSIT → PHYSICAL at dest [ISS-06 FIX]
```

### InventTrans Fields [v5.0 UPDATED]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| trans_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| **seq_no** | **BIGSERIAL** | **Y** | **Global ordering for incremental materialization** |
| **batch_id** | **UUID** | **N** | **Groups related transactions (e.g., batch receipt). Enables batch materialization** |
| external_id | VARCHAR(100) NOT NULL | Y | Idempotency key |
| item_id | UUID FK → item | Y | |
| invent_dim_id | UUID FK → invent_dim | Y | |
| trans_type | ENUM | Y | RECEIPT / ISSUE / ADJUSTMENT / STATUS_CHANGE / TRANSFER_ISSUE / TRANSFER_RECEIPT |
| stage | ENUM | Y | EXPECTED / REGISTERED / **ALLOCATED / DE_ALLOCATED** / PHYSICAL / DEDUCTED |
| qty | DECIMAL(14,2) | Y | + for in, - for out (KG) |
| qty_mt | DECIMAL(14,3) | Y | Auto: qty × 0.001 |
| reference_type | ENUM | Y | PO / SO / ORDER / TRANSFER / ADJUSTMENT / BAGGING |
| reference_id | VARCHAR(100) | Y | |
| reference_line_id | VARCHAR(100) | N | |
| posted_at | TIMESTAMP | Y | FIFO sort key |
| posted_by | UUID FK → users | Y | |
| is_reversal | BOOLEAN | Y | Default FALSE |
| reversed_trans_id | UUID FK | N | |
| **is_nominal** | **BOOLEAN** | **Y** | **Default FALSE. TRUE for DPM nominal tracking** [ISS-16 FIX] |
| notes | TEXT | N | |
| UNIQUE | (tenant_id, external_id) | | |

```
Key indexes:
  (tenant_id, item_id, posted_at)           — FIFO query
  (tenant_id, reference_type, reference_id)  — document lookup
  (tenant_id, external_id)                   — UNIQUE idempotency
  (tenant_id, invent_dim_id, stage)          — rebuild on_hand
```

### Negative Inventory Prevention

```
BEFORE any InventTrans that decreases physical_qty:
  (stage = PHYSICAL with qty < 0, or stage = DEDUCTED)

  current = SUM(qty) FROM invent_trans WHERE stage IN ('PHYSICAL','DEDUCTED')
            at target invent_dim (computed from invent_trans for strong consistency)
  IF current + trans.qty < 0:
    → REJECT: "Insufficient inventory. Item: {sku}, Loc: {loc},
               Available: {current}, Requested: {|qty|}"
    → Log in audit_log

BEFORE any DE_ALLOCATED:
  IF on_hand.allocated_qty + trans.qty < 0:
    → REJECT: "De-allocate exceeds allocated_qty"
```

### Reconciliation [F-02, F-03]

```
Frequency: Daily auto (02:00) + manual trigger

Logic:
  FOR each on_hand record (tenant-scoped):
    rebuilt_physical = SUM(invent_trans.qty WHERE stage IN (PHYSICAL, DEDUCTED))
    rebuilt_allocated = SUM(invent_trans.qty WHERE stage IN (ALLOCATED, DE_ALLOCATED))
    
    IF on_hand.physical_qty != rebuilt_physical
    OR on_hand.allocated_qty != rebuilt_allocated:
      → Log discrepancy
      → Alert WH_MANAGER
      → NO auto-fix [F-03]

Lot archival (same job):
  UPDATE lot SET is_active = FALSE
  WHERE tenant_id = :t
    AND NOT EXISTS (on_hand with physical > 0 referencing this lot)
    AND is_active = TRUE;
```

### Event-Sourced Architecture [NEW v5.1]

```
WRITE: Application → INSERT invent_trans (append-only, no locks)
                   → INSERT inventory_event_outbox (same transaction)
MATERIALIZE: Background Worker → poll outbox → aggregate deltas → UPDATE on_hand
                               → UPDATE materialization_checkpoint
ALLOCATE: Advisory lock → compute available FROM invent_trans → INSERT ALLOCATED trans
READ (display): SELECT from on_hand (eventually consistent, fast)
READ (allocate): SELECT SUM from invent_trans (strongly consistent, within lock)
REBUILD: DELETE on_hand for tenant → recompute from invent_trans → bulk INSERT
```

### inventory_event_outbox Table [NEW v5.1]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| event_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| batch_id | UUID | N | Groups events for batch processing |
| event_type | VARCHAR(50) | Y | RECEIPT / ISSUE / ADJUSTMENT / ALLOCATION / etc. |
| payload | JSONB | Y | Event data for materialization |
| status | ENUM | Y | PENDING / PROCESSING / COMPLETED / FAILED |
| created_at | TIMESTAMPTZ | Y | |
| processed_at | TIMESTAMPTZ | N | |

### materialization_checkpoint Table [NEW v5.1]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| tenant_id | UUID NOT NULL | Y | |
| item_id | UUID NOT NULL | Y | |
| invent_dim_id | UUID NOT NULL | Y | |
| last_trans_seq | BIGINT NOT NULL | Y | Last processed invent_trans.seq_no |
| last_updated_at | TIMESTAMPTZ | Y | |
| **PRIMARY KEY** | **(tenant_id, item_id, invent_dim_id)** | | |

### Concurrency Patterns [NEW v5.1]

**Inbound (bulk receipt)**: Batch INSERT into invent_trans (append-only, zero lock contention). Background worker materializes to on_hand.

**Outbound (allocation)**: Advisory lock per (tenant, item, dim). Compute available from invent_trans (NOT from on_hand). Prevents double-booking.

```sql
-- Advisory lock for allocation serialization:
SELECT pg_advisory_xact_lock(
  hashtext(tenant_id::text),
  hashtext(item_id::text || invent_dim_id::text)
);
-- Lock auto-released on COMMIT/ROLLBACK
```

**Optimistic concurrency on on_hand**:
```sql
UPDATE on_hand SET
  physical_qty = physical_qty + @delta,
  row_version = row_version + 1,
  last_materialized_at = NOW()
WHERE tenant_id = @tid AND item_id = @iid AND invent_dim_id = @did
  AND row_version = @expected_version;
-- If affected_rows = 0 → version mismatch → re-read and retry (max 3)
```

### Partition Strategy [NEW v5.1]

| Table | Partition Key | Strategy | Rationale |
|-------|--------------|----------|-----------|
| **invent_trans** | (tenant_id, posted_at) | RANGE by month | Highest write volume; time-based queries |
| **audit_log** | (tenant_id, created_at) | RANGE by month | Append-only, retention policy |
| **on_hand** | tenant_id | LIST per tenant | Parallel rebuild per tenant |
| **billing_transaction** | (tenant_id, created_at) | RANGE by month | Monthly billing cycles |
| **daily_storage_snapshot** | (tenant_id, snapshot_date) | RANGE by month | EOD snapshots |
| **notification_log** | (tenant_id, created_at) | RANGE by month | High volume, short retention |

### Business Rules — Phase 2 [v5.0 CRITICAL]

- **ALL on_hand changes via InventTrans — ZERO EXCEPTIONS** (Golden Rule 1)
- **allocated_qty via InventTrans ALLOCATED/DE_ALLOCATED stages** [ISS-02 FIX]
- **inbound_ordered_qty / outbound_ordered_qty separated** [ISS-10 FIX]
- **EXPECTED reversed when PHYSICAL posted** [ISS-09 FIX]
- **Adjustment ALWAYS stage=PHYSICAL (both +/-)** [ISS-12 FIX]
- external_id UNIQUE per tenant — idempotency
- Reverse = new trans with negated qty (NEVER delete/update original)
- Negative inventory hard block [F-01]
- DAMAGED/BLOCKED: billable, NOT allocatable
- IN_TRANSIT: NOT billable, NOT allocatable
- Precision: KG 2 decimals, MT 3 decimals
- InventTrans append-only — no UPDATE, no DELETE
- is_nominal = TRUE: skip in rebuild/reconciliation [ISS-16 FIX]
- Reconciliation: daily + manual, no auto-fix [F-02, F-03]
- Cycle count Phase 1 (basic) [F-06]
- **lot_id in invent_dim — on_hand tách per lot** [v5.0]
- **tenant_id in PK/UNIQUE/INDEX everywhere** [D-06]
- **Event-Sourced: invent_trans append-only WRITE model, on_hand async materialized READ model** [v5.1]
- **Allocation computes available from invent_trans via advisory lock (NOT from on_hand)** [v5.1]
- **on_hand uses row_version for optimistic concurrency** [v5.1]
- **inventory_status tenant-scoped (seeded per tenant, custom statuses allowed)** [v5.1]
