# Module 3: Inventory Core Engine - Database Documentation

**Module:** Inventory Core Engine  
**Database:** PostgreSQL  
**Total Tables:** 10  
**Total Services:** 8  
**Last Updated:** 2026-03-09

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
| PostingEngineService | `posting-engine.service.js` | Core posting logic |
| ReversalEngineService | `reversal-engine.service.js` | Reversal with idempotency |
| HoldService | `hold.service.js` | Hold/allocation management |
| OnHandService | `onhand.service.js` | OnHand query with Decimal.js |
| TransactionQueryService | `transaction-query.service.js` | Transaction history |
| InventDimService | `invent-dim.service.js` | Dimension management |
| ReconciliationService | `reconciliation.service.js` | Ledger vs OnHand comparison |
| SnapshotService | `snapshot.service.js` | Daily storage snapshot for M10 |

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

**Purpose:** Ledger bất biến của mọi biến động tồn kho.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| trans_id | VARCHAR(40) | UNIQUE NOT NULL | Business key `TRX-YYYYMMDD-SEQ` |
| ref_type | VARCHAR(40) | NOT NULL | RECEIPT/SHIPMENT/TRANSFER/... |
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
| stage | ENUM | NOT NULL DEFAULT PHYSICAL | InventoryStage enum |
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

**Purpose:** Current balance dùng cho query vận hành.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| physical_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Physical stock |
| reserved_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Reserved/held |
| available_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Physical - reserved |
| ordered_qty | DECIMAL(18,3) | NOT NULL DEFAULT 0 | Expected inbound |
| uom_id | UUID | FK NOT NULL | → md_uom |
| last_movement_at | TIMESTAMP | NULL | Last movement time |
| last_count_at | TIMESTAMP | NULL | Last cycle count time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |
| row_version | BIGINT | NOT NULL DEFAULT 0 | Optimistic lock version |

**Indexes:**
- `UNIQUE (item_id, invent_dim_id)`

**Invariants:**
- `available_qty = physical_qty - reserved_qty`
- `physical_qty >= 0` (Phase 1 không cho âm tồn)

**Update Rules:**
- Chỉ update qua posting/hold service
- Không cho API CRUD trực tiếp

---

### 3.4 `inventory_hold` - Stock Allocation/Hold

**Purpose:** Lưu chi tiết allocation-based hold cho outbound.

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
| reserved_qty | DECIMAL(18,3) | NOT NULL | OnHand reserved |
| available_qty | DECIMAL(18,3) | NOT NULL | OnHand available |
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

**Purpose:** Chuẩn hóa event-to-transaction mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Technical key |
| event_code | VARCHAR(50) | UNIQUE NOT NULL | Event identifier |
| source_module | VARCHAR(20) | NOT NULL | M4, M5, M6, M7, M9 |
| source_object | VARCHAR(40) | NOT NULL | RECEIPT, SHIPMENT, etc. |
| trigger_state | VARCHAR(40) | NOT NULL | RECEIVED, SHIPPED, etc. |
| trans_type | ENUM | NOT NULL | InventoryTransType |
| affect_physical | BOOLEAN | NOT NULL | Affects physical qty |
| affect_hold | BOOLEAN | NOT NULL | Affects hold/reserved |
| reversible | BOOLEAN | NOT NULL | Can be reversed |
| active_flag | BOOLEAN | NOT NULL DEFAULT true | Active flag |
| notes | TEXT | NULL | Additional notes |

---

## 4. Enums

### InventoryTransType
```sql
RECEIPT_IN, SHIPMENT_OUT, MOVE, STATUS_CHANGE, ADJUSTMENT,
COUNT_GAIN, COUNT_LOSS, VAS_CONSUME, VAS_PRODUCE, TRANSFER_OUT, TRANSFER_IN
```

### InventoryStage
```sql
PHYSICAL, EXPECTED, ORDERED
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
| inventory_hold | item_id | md_item | id |
| inventory_hold | invent_dim_id | invent_dim | id |
| inventory_hold | on_hand_id | on_hand | id |
| inventory_reversal_link | original_trans_id | invent_trans | id |
| inventory_reversal_link | reversal_trans_id | invent_trans | id |

---

## 6. Data Integrity Rules

1. **Ledger Immutability**: `invent_trans` không được UPDATE/DELETE sau insert
2. **On-Hand Formula**: `available_qty = physical_qty - reserved_qty`
3. **No Negative Stock**: `physical_qty >= 0` (Phase 1)
4. **Hold Integrity**: Tổng active holds không vượt quá reserved_qty
5. **Dimension Uniqueness**: Mỗi combination dim chỉ có 1 record trong `invent_dim`

