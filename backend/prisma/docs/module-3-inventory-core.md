# Module 3: Inventory Core Engine - Database Documentation

**Module:** Inventory Core Engine
**Database:** PostgreSQL
**Total Tables:** 10
**Total Services:** 8
**Last Updated:** 2026-03-23 (v2.1 — stage-based delta logic)

---

## 1. Overview

Module 3 quản lý inventory backbone của hệ thống SWM với các bảng chính:

| Category | Tables |
|----------|--------|
| Core | `invent_dim`, `invent_trans`, `on_hand` |
| Hold/Allocation | `inventory_hold`, `inventory_reversal_link` |
| Control/Quality | `inventory_reconciliation_run`, `inventory_reconciliation_result` |
| Snapshot | `inventory_snapshot_run`, `daily_storage_snapshot` |
| Config | `inventory_event_mapping` |

### Backend Services (8 services)

| Service | File | Description |
|---------|------|-------------|
| PostingEngineService | `posting-engine.service.js` | Core posting logic — map eventCode → transType + stage |
| ReversalEngineService | `reversal-engine.service.js` | Reversal with idempotency |
| HoldService | `hold.service.js` | Allocation/hold — capability nội bộ phục vụ outbound |
| OnHandService | `onhand.service.js` | OnHand query with Decimal.js |
| TransactionQueryService | `transaction-query.service.js` | Transaction history |
| InventDimService | `invent-dim.service.js` | Dimension management |
| ReconciliationService | `reconciliation.service.js` | Ledger vs OnHand comparison |
| SnapshotService | `snapshot.service.js` | Daily storage snapshot for M10 |

> **Lưu ý:** LotService **không thuộc M3** — đã chuyển sang Module 2 (Master Data). M3 chỉ nhận `lotId` như dimension/reference.

### Infrastructure (7 components)

| Component | File | Description |
|-----------|------|-------------|
| InventDimRepository | `invent-dim.repository.js` | Dimension CRUD |
| InventTransRepository | `invent-trans.repository.js` | Ledger CRUD + idempotency |
| OnHandRepository | `onhand.repository.js` | OnHand CRUD + optimistic lock |
| HoldRepository | `hold.repository.js` | Hold CRUD + NumberSequence |
| ReversalLinkRepository | `reversal-link.repository.js` | Reversal tracking |
| EventMappingRepository | `event-mapping.repository.js` | Event config |
| AuditLogAdapter | `audit-log.adapter.js` | M1 LogService integration |

---

## 2. Entity Relationship Diagram

```
md_warehouse ──┬──< invent_dim >──┬── md_location
               │                  │
md_owner ──────┼──────────────────┼── md_inventory_status
               │                  │
               └──────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │     invent_dim      │
              └─────────────────────┘
                   │         │
          ┌────────┘         └────────┐
          ▼                           ▼
   ┌─────────────┐             ┌─────────────┐
   │ invent_trans │             │   on_hand   │
   └─────────────┘             └─────────────┘
          │                           │
          ▼                           ▼
   ┌──────────────────┐        ┌─────────────────┐
   │ reversal_link    │        │ inventory_hold  │
   └──────────────────┘        └─────────────────┘
```

---

## 3. Table Definitions

### 3.1 `invent_dim` - Inventory Dimension

**Purpose:** Chuẩn hóa dimension combination Phase 1.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| dim_id | VARCHAR(40) | UNIQUE NOT NULL | Business-safe dim key |
| dim_hash | VARCHAR(64) | UNIQUE NOT NULL | SHA-256 normalized fields |
| site_id | VARCHAR(50) | NOT NULL | Site identifier |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| location_id | UUID | FK NOT NULL | → md_location |
| owner_id | UUID | FK NOT NULL | → md_owner |
| inventory_status_id | UUID | FK NOT NULL | → md_inventory_status |
| is_active | BOOLEAN | NOT NULL DEFAULT true | Active flag |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| created_by | UUID | NULL | Creator user ID |

**Indexes:**
- `UNIQUE (dim_hash)`
- `INDEX (warehouse_id, location_id, owner_id, inventory_status_id)`

**Hash Formula:**
```
SHA-256(site_id|warehouse_code|location_code|owner_code|status_code)
```

---

### 3.2 `invent_trans` - Inventory Transaction Ledger

**Purpose:** Ledger bất biến của mọi biến động tồn kho. Mỗi record gắn `trans_type` + `stage`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| trans_id | VARCHAR(40) | UNIQUE NOT NULL | Business key `TRX-YYYYMMDD-SEQ` |
| ref_type | VARCHAR(40) | NOT NULL | PURCHASE_ORDER/RECEIPT/SALES_ORDER/SHIPMENT/TRANSFER/VAS_ORDER/... |
| ref_id | VARCHAR(50) | NOT NULL | Source header ID |
| ref_line_id | VARCHAR(50) | NULL | Source line ID |
| trans_type | ENUM | NOT NULL | InventoryTransType enum |
| item_id | UUID | FK NOT NULL | → md_item |
| qty | DECIMAL(18,3) | NOT NULL | Signed quantity |
| uom_id | UUID | FK NOT NULL | → md_uom |
| dim_from_id | UUID | FK NULL | → invent_dim (source) |
| dim_to_id | UUID | FK NULL | → invent_dim (destination) |
| status_from_code | VARCHAR(30) | NULL | Denorm status from |
| status_to_code | VARCHAR(30) | NULL | Denorm status to |
| stage | ENUM | NOT NULL | InventoryStage enum (EXPECTED/REGISTERED/ALLOCATED/DE_ALLOCATED/PHYSICAL/DEDUCTED) |
| external_id | VARCHAR(120) | NOT NULL | Idempotency key |
| correlation_id | VARCHAR(120) | NOT NULL | Trace correlation |
| reason_code | VARCHAR(50) | NULL | → reason_code.code |
| source_app | ENUM | NOT NULL | SourceApp enum |
| posted_by | UUID | NULL | Actor user ID |
| posted_at | TIMESTAMP | NOT NULL | Posting timestamp |
| owner_id | UUID | FK NOT NULL | Denorm for fast filtering |
| weighbridge_ticket_id | VARCHAR(50) | NULL | Optional weighbridge link |
| is_reversal | BOOLEAN | NOT NULL DEFAULT false | Reversal flag |
| reversal_of_trans_id | VARCHAR(40) | NULL | Link to original trans_id |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- `UNIQUE (trans_id)`
- `UNIQUE (external_id, trans_type)`
- `INDEX (ref_type, ref_id, ref_line_id)`
- `INDEX (item_id, posted_at DESC)`
- `INDEX (owner_id, posted_at DESC)`
- `INDEX (dim_to_id, posted_at DESC)`
- `INDEX (dim_from_id, posted_at DESC)`
- `INDEX (correlation_id)`

**Protection Rules:**
- **IMMUTABLE**: Không UPDATE/DELETE sau khi insert
- Correction phải dùng reversal transaction

---

### 3.3 `on_hand` - Current Stock Balance

**Purpose:** Current balance dùng cho query vận hành. Có 4 bucket gốc + 1 computed value.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| physical_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Physical stock — hàng thực có |
| allocated_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Allocated/held — hàng đã giữ chỗ |
| available_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Computed: physical - allocated |
| inbound_ordered_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Dự kiến nhập (PO confirmed chưa receive) |
| outbound_ordered_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Nhu cầu xuất (SO confirmed chưa ship) |
| lot_number | VARCHAR(50) | NULL | Lot number reference |
| lot_id | UUID | FK NULL | → md_lot (M2 master data) |
| uom_id | UUID | FK NOT NULL | → md_uom |
| last_movement_at | TIMESTAMP | NULL | Last movement time |
| last_count_at | TIMESTAMP | NULL | Last cycle count time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |
| row_version | BIGINT | NOT NULL DEFAULT 0 | Optimistic lock version |

**Indexes:**
- `UNIQUE (item_id, invent_dim_id)`
- `INDEX (lot_id)`

**Invariants:**
- `available_qty = physical_qty - allocated_qty`
- `physical_qty >= 0` (Phase 1 không cho âm tồn)
- `availableQty` **không phải bucket gốc** — chỉ là giá trị tính ra khi query

**Update Rules:**
- Chỉ update qua posting engine hoặc hold service
- Không cho API CRUD trực tiếp
- Không tạo bucket reserve riêng theo module (không có `reserved_qty_vas`, `reserved_qty_outbound`...)

---

### 3.4 `inventory_hold` - Stock Allocation/Hold

**Purpose:** Lưu chi tiết allocation-based hold cho outbound. Đây là **capability nội bộ** phục vụ M5 outbound — không phải nghiệp vụ public độc lập.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| hold_no | VARCHAR(40) | UNIQUE NOT NULL | Business key |
| shipment_id | VARCHAR(50) | NULL | Source shipment |
| shipment_line_id | VARCHAR(50) | NULL | Source shipment line |
| work_header_id | VARCHAR(50) | NULL | Optional work header |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| on_hand_id | UUID | FK NOT NULL | → on_hand |
| hold_qty | DECIMAL(18,3) | NOT NULL | Hold quantity |
| released_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Released quantity |
| status | ENUM | NOT NULL DEFAULT ACTIVE | HoldStatus enum |
| reason_code | VARCHAR(50) | NULL | Release reason |
| external_id | VARCHAR(120) | NULL | Idempotency key |
| correlation_id | VARCHAR(120) | NOT NULL | Trace correlation |
| created_by | UUID | NULL | Creator user ID |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update time |
| released_at | TIMESTAMP | NULL | Release timestamp |
| released_by | UUID | NULL | Release user ID |

**Indexes:**
- `UNIQUE (hold_no)`
- `INDEX (shipment_id, shipment_line_id)`
- `INDEX (item_id, invent_dim_id, status)`
- `INDEX (external_id)`

**Status Values:**
- `ACTIVE`: Đang hold
- `PARTIALLY_RELEASED`: Đã release một phần
- `RELEASED`: Đã release hết
- `CONSUMED`: Đã ship
- `CANCELLED`: Đã hủy

---

### 3.5 `inventory_reversal_link` - Reversal Tracking

**Purpose:** Link transaction gốc và transaction reverse.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| original_trans_id | UUID | FK NOT NULL | → invent_trans.id |
| reversal_trans_id | UUID | FK NOT NULL | → invent_trans.id |
| reverse_reason_code | VARCHAR(50) | NOT NULL | Reason code |
| reverse_note | TEXT | NULL | Additional notes |
| reversed_by | UUID | NULL | Reversal actor |
| reversed_at | TIMESTAMP | NOT NULL | Reversal timestamp |
| correction_ref_type | VARCHAR(40) | NULL | Correction reference type |
| correction_ref_id | VARCHAR(50) | NULL | Correction reference ID |
| correlation_id | VARCHAR(120) | NOT NULL | Trace correlation |

**Indexes:**
- `UNIQUE (original_trans_id, reversal_trans_id)`

---

### 3.6 `inventory_reconciliation_run` - Reconciliation Run Header

**Purpose:** Header của mỗi lần chạy reconciliation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| run_no | VARCHAR(40) | UNIQUE NOT NULL | Business key |
| run_type | ENUM | NOT NULL | ReconciliationRunType |
| scope_type | ENUM | NOT NULL | ReconciliationScopeType |
| warehouse_id | UUID | FK NULL | Scope filter |
| owner_id | UUID | FK NULL | Scope filter |
| item_id | UUID | FK NULL | Scope filter |
| started_at | TIMESTAMP | NOT NULL | Start time |
| completed_at | TIMESTAMP | NULL | Completion time |
| status | ENUM | NOT NULL | ReconciliationRunStatus |
| mismatch_count | INT | NOT NULL DEFAULT 0 | Number of mismatches |
| requested_by | UUID | NULL | Requester user ID |
| correlation_id | VARCHAR(120) | NOT NULL | Trace correlation |

---

### 3.7 `inventory_reconciliation_result` - Reconciliation Results

**Purpose:** Chi tiết lệch giữa ledger và on-hand.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| run_id | UUID | FK NOT NULL | → reconciliation_run.id |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| ledger_qty | DECIMAL(18,3) | NOT NULL | Sum from ledger |
| onhand_physical_qty | DECIMAL(18,3) | NOT NULL | OnHand physical |
| allocated_qty | DECIMAL(18,3) | NOT NULL | OnHand allocated |
| available_qty | DECIMAL(18,3) | NOT NULL | OnHand available (computed) |
| diff_qty | DECIMAL(18,3) | NOT NULL | Difference |
| severity | ENUM | NOT NULL | ReconciliationSeverity |
| rule_code | VARCHAR(40) | NOT NULL | Rule that triggered |
| result_status | ENUM | NOT NULL | ReconciliationResultStatus |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

---

### 3.8 `inventory_snapshot_run` - Snapshot Run Header

**Purpose:** Quản lý mỗi lần chạy snapshot.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| run_no | VARCHAR(40) | UNIQUE NOT NULL | Business key |
| snapshot_date | DATE | NOT NULL | Snapshot date |
| warehouse_id | UUID | FK NULL | Scope filter |
| cut_off_time | TIMESTAMP | NOT NULL | Cut-off timestamp |
| run_mode | ENUM | NOT NULL | SnapshotRunMode |
| version_no | INT | NOT NULL DEFAULT 1 | Version number |
| status | ENUM | NOT NULL | SnapshotRunStatus |
| started_at | TIMESTAMP | NOT NULL | Start time |
| completed_at | TIMESTAMP | NULL | Completion time |
| requested_by | UUID | NULL | Requester user ID |
| correlation_id | VARCHAR(120) | NOT NULL | Trace correlation |

**Indexes:**
- `UNIQUE (snapshot_date, warehouse_id, version_no)`

---

### 3.9 `daily_storage_snapshot` - Daily Snapshot Data

**Purpose:** Snapshot billing-safe theo ngày.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| snapshot_run_id | UUID | FK NOT NULL | → snapshot_run.id |
| snapshot_date | DATE | NOT NULL | Snapshot date |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| location_id | UUID | FK NOT NULL | → md_location |
| owner_id | UUID | FK NOT NULL | → md_owner |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| opening_qty | DECIMAL(18,3) | NOT NULL | Opening balance |
| inbound_today_qty | DECIMAL(18,3) | NOT NULL | Inbound today |
| outbound_today_qty | DECIMAL(18,3) | NOT NULL | Outbound today |
| closing_qty | DECIMAL(18,3) | NOT NULL | Closing balance |
| cut_off_time | TIMESTAMP | NOT NULL | Cut-off time |
| snapshot_source | VARCHAR(50) | NOT NULL | service/batch |
| correlation_id | VARCHAR(120) | NULL | Trace correlation |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- `INDEX (snapshot_date, warehouse_id, owner_id)`
- `INDEX (owner_id, item_id, snapshot_date)`

---

### 3.10 `inventory_event_mapping` - Event to Transaction Mapping

**Purpose:** Chuẩn hóa event-to-transaction mapping theo stage-based approach.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| event_code | VARCHAR(50) | UNIQUE NOT NULL | Event identifier |
| source_module | VARCHAR(20) | NOT NULL | M4, M5, M6, M7, M9 |
| source_object | VARCHAR(40) | NOT NULL | PURCHASE_ORDER, RECEIPT, SHIPMENT, etc. |
| trigger_state | VARCHAR(40) | NOT NULL | CONFIRMED, RECEIVED, SHIPPED, etc. |
| trans_type | ENUM | NOT NULL | InventoryTransType |
| stage | ENUM | NOT NULL DEFAULT PHYSICAL | InventoryStage — stage trong lifecycle |
| affect_physical | BOOLEAN | NOT NULL | Affects physical qty |
| affect_ordered | BOOLEAN | NOT NULL DEFAULT false | Affects inbound/outbound ordered qty |
| affect_hold | BOOLEAN | NOT NULL | Affects allocated qty |
| reversible | BOOLEAN | NOT NULL | Can be reversed |
| active_flag | BOOLEAN | NOT NULL DEFAULT true | Active flag |
| notes | TEXT | NULL | Additional notes |

**Seeded Event Codes (29 total):**

| Event Code | Module | Stage | Trans Type | Auto-called by |
|------------|--------|-------|------------|----------------|
| `PO_CONFIRMED` | M4 | EXPECTED | RECEIPT | ✅ `purchase-order.service.js` → confirmPO |
| `RECEIPT_CREATED` | M4 | REGISTERED | RECEIPT | — (chưa integrate) |
| `GOODS_RECEIVED` | M4 | PHYSICAL | RECEIPT | ✅ `receipt.service.js` → receiveGoods |
| `PUTAWAY_COMPLETED` | M7 | PHYSICAL | MOVE |
| `SO_CONFIRMED` | M5 | EXPECTED | ISSUE | ✅ `sales-order.service.ts` → confirm |
| `ALLOCATION_CREATED` | M5 | ALLOCATED | ISSUE |
| `ALLOCATION_RELEASED` | M5 | DE_ALLOCATED | ISSUE |
| `PICK_CONFIRMED` | M7 | PHYSICAL | ISSUE |
| `LOAD_CONFIRMED` | M5 | PHYSICAL | ISSUE |
| `SHIP_CONFIRMED` | M5 | DEDUCTED | ISSUE |
| `TRANSFER_ORDER_CONFIRMED` | M6 | EXPECTED | TRANSFER_ISSUE |
| `TRANSFER_ISSUED` | M6 | DEDUCTED | TRANSFER_ISSUE |
| `TRANSFER_RECEIVED` | M6 | PHYSICAL | TRANSFER_RECEIPT |
| `VAS_ORDER_CONFIRMED` | M9 | EXPECTED | ISSUE |
| `VAS_CONSUMED` | M9 | DEDUCTED | ISSUE |
| `VAS_PRODUCED` | M9 | PHYSICAL | RECEIPT |
| `VAS_WASTE` | M9 | PHYSICAL | ADJUSTMENT |
| `MOVE_COMPLETED` | M6 | PHYSICAL | MOVE |
| `STATUS_CHANGE_CONFIRMED` | M6 | PHYSICAL | STATUS_CHANGE |
| `ADJUSTMENT_APPROVED` | M6 | PHYSICAL | ADJUSTMENT |
| `COUNT_GAIN_RECONCILED` | M6 | PHYSICAL | ADJUSTMENT |
| `COUNT_LOSS_RECONCILED` | M6 | PHYSICAL | ADJUSTMENT |
| `RECEIPT_RECEIVED` | M4 | PHYSICAL | RECEIPT | *(deprecated → use GOODS_RECEIVED)* |
| `SHIPMENT_SHIPPED` | M5 | DEDUCTED | ISSUE | *(deprecated → use SHIP_CONFIRMED)* |

---

## 4. Enums

### InventoryTransType
```sql
-- Primary (active)
RECEIPT, ISSUE, MOVE, STATUS_CHANGE, ADJUSTMENT, TRANSFER_ISSUE, TRANSFER_RECEIPT

-- Deprecated (backward compat, sẽ remove)
RECEIPT_IN, SHIPMENT_OUT, COUNT_GAIN, COUNT_LOSS, VAS_CONSUME, VAS_PRODUCE,
TRANSFER_OUT, TRANSFER_IN, RESIDUAL_RETURN
```

### InventoryStage
```sql
EXPECTED, REGISTERED, ALLOCATED, DE_ALLOCATED, PHYSICAL, DEDUCTED
```

### HoldStatus
```sql
ACTIVE, PARTIALLY_RELEASED, RELEASED, CONSUMED, CANCELLED
```

### SourceApp
```sql
WEB, MOBILE, API, INTEGRATION, SYSTEM
```

### ReconciliationRunType
```sql
SCHEDULED, ON_DEMAND, SYSTEM
```

### ReconciliationScopeType
```sql
FULL, WAREHOUSE, OWNER, ITEM
```

### ReconciliationSeverity
```sql
CRITICAL, HIGH, MEDIUM, INFO
```

### ReconciliationResultStatus
```sql
MISMATCH, OK, REVIEWED, RESOLVED
```

### SnapshotRunMode
```sql
SCHEDULED, MANUAL, RERUN
```

### SnapshotRunStatus
```sql
RUNNING, COMPLETED, FAILED
```

---

## 5. Foreign Key Relationships

| From Table | Column | To Table | Column |
|------------|--------|----------|--------|
| invent_dim | warehouse_id | md_warehouse | id |
| invent_dim | location_id | md_location | id |
| invent_dim | owner_id | md_owner | id |
| invent_dim | inventory_status_id | md_inventory_status | id |
| invent_trans | item_id | md_item | id |
| invent_trans | uom_id | md_uom | id |
| invent_trans | dim_from_id | invent_dim | id |
| invent_trans | dim_to_id | invent_dim | id |
| invent_trans | owner_id | md_owner | id |
| on_hand | item_id | md_item | id |
| on_hand | invent_dim_id | invent_dim | id |
| on_hand | uom_id | md_uom | id |
| on_hand | lot_id | md_lot | id |
| inventory_hold | item_id | md_item | id |
| inventory_hold | invent_dim_id | invent_dim | id |
| inventory_hold | on_hand_id | on_hand | id |
| inventory_reversal_link | original_trans_id | invent_trans | id |
| inventory_reversal_link | reversal_trans_id | invent_trans | id |

---

## 6. Data Integrity Rules

1. **Ledger Immutability**: `invent_trans` không được UPDATE/DELETE sau insert
2. **On-Hand Formula**: `available_qty = physical_qty - allocated_qty` (computed, not stored independently)
3. **No Negative Stock**: `physical_qty >= 0` (Phase 1)
4. **Ordered Qty Floor**: `inbound_ordered_qty >= 0` và `outbound_ordered_qty >= 0` (floor to 0 khi update)
5. **Hold Integrity**: Tổng active holds không vượt quá `allocated_qty`
6. **Dimension Uniqueness**: Mỗi combination dim chỉ có 1 record trong `invent_dim`
7. **No module-specific reserve buckets**: Không có `reserved_qty_vas`, `reserved_qty_outbound`...
8. **Stage from mapping**: Posting engine lấy stage từ `inventory_event_mapping`, không hardcode
9. **Delta-based update**: Mọi on-hand update đi qua `getInventoryDelta(transType, stage, qty)` → 4 bucket deltas
10. **Lot belongs to M2**: M3 chỉ nhận `lot_id` như dimension reference, không quản lý lot lifecycle

---

## 7. Stage-based Delta Logic

Posting engine sử dụng hàm `getInventoryDelta(transType, stage, qty)` để xác định ảnh hưởng lên 4 bucket gốc của `on_hand`.

### Delta Matrix

| trans_type + stage | physical_qty | allocated_qty | inbound_ordered_qty | outbound_ordered_qty |
|---|:---:|:---:|:---:|:---:|
| RECEIPT + EXPECTED | 0 | 0 | +qty | 0 |
| RECEIPT + REGISTERED | 0 | 0 | 0 | 0 |
| RECEIPT + PHYSICAL | +qty | 0 | -qty | 0 |
| ISSUE + EXPECTED | 0 | 0 | 0 | +qty |
| ISSUE + ALLOCATED | 0 | +qty | 0 | 0 |
| ISSUE + DE_ALLOCATED | 0 | -qty | 0 | 0 |
| ISSUE + PHYSICAL | 0 | 0 | 0 | 0 |
| ISSUE + DEDUCTED | -qty | -qty | 0 | -qty |
| TRANSFER_ISSUE + EXPECTED | 0 | 0 | 0 | +qty |
| TRANSFER_ISSUE + DEDUCTED | -qty | 0 | 0 | -qty |
| TRANSFER_RECEIPT + PHYSICAL | +qty | 0 | 0 | 0 |
| ADJUSTMENT + PHYSICAL | ±qty | 0 | 0 | 0 |
| MOVE + * | dim from/to | 0 | 0 | 0 |
| STATUS_CHANGE + * | dim from/to | 0 | 0 | 0 |

### Update Flow

```
POST /inventory/postings { eventCode, qty, dims }
  → EventMapping lookup → { transType, stage }
  → getInventoryDelta(transType, stage, qty) → 4 deltas
  → onHand.updateQty(id, { physicalDelta, allocatedDelta, inboundOrderedDelta, outboundOrderedDelta })
  → available_qty = physical_qty - allocated_qty (recalculated)
  → inbound_ordered_qty = max(0, current + delta) (floored)
  → outbound_ordered_qty = max(0, current + delta) (floored)
```

### Reversal

Reversal = negate delta gốc:
```
original: getInventoryDelta(transType, stage, qty) → { +100, 0, -100, 0 }
reversal: { -100, 0, +100, 0 }
```
