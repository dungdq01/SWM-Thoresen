# THORESEN VINAMA LOGISTICS — Smart Warehouse Management (SWM)

## Inventory Transaction Specification

| Key | Value |
|-----|-------|
| **Version** | 1.0 |
| **Date** | March 2026 |
| **Status** | Draft for Review |
| **Priority** | CRITICAL (Gap Analysis: 0% completion) |
| **Reference** | D365 WMS Inventory Transaction Layer |
| **Source** | TVL_SWM_Gap_Analysis_Restructuring_Plan.docx — Task B1 |
| **Deliverables** | 1) TVL_SWM_InventoryTransaction_Spec.docx  2) Transaction_DD.xlsx  3) ERD |
| **TVL Confirmed** | Per-line posting ・ RECEIVED/SHIPPED post ・ 4 Status ・ No QC_HOLD ・ No approval for adjustment |
| **Prepared by** | Smartlog Solution Team |

---

# TABLE OF CONTENTS

1. Executive Summary & Design Principles
2. InventTrans Schema
3. OnHand Model Specification
4. InventDim Configuration
5. Event Mapping: Business Event → InventTrans Record
6. Idempotency Rules
7. Audit Log Specification
8. Stock Ledger Reconciliation Rules
9. Daily Storage Snapshot (Billing)
10. ERD Reference
11. Assumptions & To-Confirm

---

# 1. Executive Summary & Design Principles

Document này định nghĩa **Inventory Transaction Layer** — lớp backbone của kiến trúc D365 WMS cho hệ thống THORESEN SWM. Theo Gap Analysis, đây là **GAP NGHIÊM TRỌNG NHẤT** (0% hoàn thiện) cần được xây dựng ĐẦU TIÊN trước khi update State Machine và các module khác.

Inventory Transaction Layer gồm 3 thành phần cốt lõi:
- **InventTrans** — transaction ledger ghi nhận MỌI biến động tồn kho
- **OnHand** — tồn kho hiện tại (single source of truth)
- **InventDim** — dimension key table xác định hàng ở đâu, của ai, trạng thái gì

## 1.1 Design Rules (D365 Reference + TVL Confirmed)

| Rule | Description |
|------|-------------|
| **Rule 1** | Chứng từ KHÔNG cập nhật OnHand trực tiếp → luôn thông qua InventTrans event |
| **Rule 2** | OnHand(item, dim) = SUM(InventTrans.qty WHERE item AND dim). Quy tắc reconciliation bất biến |
| **Rule 3** | Mọi InventTrans có RefType + RefId + RefLineId → truy vết 100% nguồn gốc biến động |
| **Rule 4** | `[TVL CONFIRMED]` Inventory dimensions Phase 1: Site + Warehouse + Location + Owner + Status. Batch/Lot = OFF |
| **Rule 5** | `[TVL CONFIRMED]` InventTrans posting: Inbound post tại RECEIVED state. Outbound post tại SHIPPED state |
| **Rule 6** | Idempotent — mọi API có ExternalId để chống tạo trùng |
| **Rule 7** | `[TVL CONFIRMED]` 4 Inventory Status Go-Live: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. Không có QC_HOLD |
| **Rule 8** | `[TVL CONFIRMED]` Adjustment chỉ cần reason_code + audit_log. KHÔNG cần approval workflow |

## 1.2 Scope

**In-scope:** InventTrans schema, OnHand model, InventDim configuration, Event mapping (Inbound, Outbound, Inventory, Transfer, VAS), Idempotency rules, Audit log, Stock ledger reconciliation, Daily snapshot cho billing.

**Out-of-scope:** Reservation/Allocation logic chi tiết (→ TVL_SWM_Reservation_Allocation_Spec.docx), Work Execution model (→ TVL_SWM_Work_Execution_Spec.docx), Billing calculation logic (→ Billing Module spec).

---

# 2. InventTrans Schema

**Table:** `invent_trans`

Inventory transaction ledger — ghi nhận MỌI biến động tồn kho trong hệ thống. Mỗi sự kiện nghiệp vụ (nhận hàng, xuất kho, chuyển kho, điều chỉnh, kiểm kê, đổi trạng thái) đều tạo 1 hoặc nhiều records.

> **CRITICAL:** Đây là GAP LỚN NHẤT trong hệ thống hiện tại (0% hoàn thiện). Cần xây dựng ĐẦU TIÊN.

> **CRITICAL:** MỌI WorkLine.complete PHẢI tạo 1 InventTrans. Không có ngoại lệ.

> **CRITICAL:** external_id BẮT BUỘC check trước khi insert — idempotency rule. Nếu trùng → reject, return trans_id cũ.

> **CRITICAL:** `[TVL CONFIRMED]` Posting points: Inbound = RECEIVED state. Outbound = SHIPPED state. State trung gian KHÔNG post.

> *Note:* qty DƯƠNG = nhận vào. qty ÂM = xuất ra.
> *Note:* dim_from_id / dim_to_id cho phép track chuyển động từ đâu đến đâu.
> *Note:* KHÔNG BAO GIỜ xóa InventTrans. Reverse = tạo trans mới với qty ngược lại.

## 2.1 Field Definitions

### --- IDENTIFICATION ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khóa chính tự động |
| **trans_id** | VARCHAR(30) | UNIQUE, NOT NULL | Mã giao dịch readable. Format: TRX-YYYYMMDD-SEQ. NumberSequence scope=PER_WAREHOUSE |
| **posted_at** | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Thời điểm post. IMMUTABLE sau khi post. Critical cho reconciliation |

### --- REFERENCE (Link to source document) ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **ref_type** | ENUM | NOT NULL | PO, ASN, SO, SHIPMENT, TRANSFER, ADJUSTMENT, CYCLE_COUNT, STATUS_CHANGE, MOVE |
| **ref_id** | VARCHAR(30) | NOT NULL | Mã chứng từ gốc (Header ID). VD: 'RCV-20260315-001' |
| **ref_line_id** | VARCHAR(30) | NULLABLE | `[TVL CONFIRMED]` Per line. NULL cho header-level events |
| **external_id** | VARCHAR(50) | NULLABLE | Idempotency check. Nếu trùng → reject, return trans_id cũ |

### --- ITEM & QUANTITY ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **item_id** | VARCHAR(50) | FK → item(sku), NOT NULL | 1 InventTrans = 1 SKU (không mix) |
| **qty** | DECIMAL(15,3) | NOT NULL | DƯƠNG = nhận vào. ÂM = xuất ra. VD: +15200.500 / -8500.000 |
| **uom** | VARCHAR(10) | FK → uom(code), NOT NULL, DEFAULT 'KG' | Mặc định KG cho bulk cargo TVL |

### --- DIMENSIONS (From / To) ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **dim_from_id** | UUID | FK → invent_dim(id), NULLABLE | Dimension xuất. NULL cho receipt (không có nguồn nội bộ) |
| **dim_to_id** | UUID | FK → invent_dim(id), NULLABLE | Dimension nhập. NULL cho issue (hàng ra khỏi kho) |

### --- STATUS & STAGE ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **status_from** | ENUM | NULLABLE | `[TVL]` Trạng thái trước. Bỏ QC_HOLD |
| **status_to** | ENUM | NOT NULL | Trạng thái sau |
| **stage** | ENUM | NOT NULL | `[TVL CONFIRMED]` EXPECTED, REGISTERED, PHYSICAL, DEDUCTED, CANCELLED |

### --- BUSINESS CONTEXT ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **reason_code** | VARCHAR(20) | FK → reason_code(code), NULLABLE | BẮT BUỘC cho: ADJUSTMENT, STATUS_CHANGE, discrepancy |
| **owner_id** | VARCHAR(20) | FK → owner(storerkey), NOT NULL | Denormalize từ dim (3PL requirement) |
| **weighbridge_ticket_id** | VARCHAR(30) | NULLABLE | TVL specific: link trans → phiếu cân |
| **notes** | VARCHAR(500) | NULLABLE | Ghi chú bổ sung |

### --- AUDIT ---

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_by** | UUID | FK → users, NOT NULL | Người thực hiện |
| **is_reversed** | BOOLEAN | NOT NULL, DEFAULT FALSE | Reverse = tạo trans mới, KHÔNG xóa trans cũ |
| **reversed_by_trans_id** | VARCHAR(30) | NULLABLE | Cặp link 2 chiều với trans reverse |

## 2.2 Indexes

| Type | Fields | Purpose |
|------|--------|---------|
| PK | id | Primary Key |
| UNIQUE | trans_id | Readable transaction ID |
| INDEX | (ref_type, ref_id, ref_line_id) | Lookup theo chứng từ |
| INDEX | (item_id, posted_at) | Stock ledger report |
| INDEX | (owner_id, posted_at) | Báo cáo theo chủ hàng |
| INDEX | (external_id) WHERE NOT NULL | Idempotency check |
| INDEX | (posted_at) | Partition key (monthly) |

## 2.3 Sign Convention & Stage Lifecycle

**Sign:** qty > 0 = nhận vào kho. qty < 0 = xuất ra khỏi kho.

| Stage | Khi nào | OnHand Impact | Ví dụ |
|-------|---------|---------------|-------|
| **EXPECTED** | PO/SO confirm | ordered_qty += | Confirm PO → ghi nhận demand |
| **REGISTERED** | Allocation done | available -=, reserved += | FIFO allocate cho SO |
| **PHYSICAL** | RECEIVED / SHIPPED | physical_qty ±= | 🟢 Posting point |
| **DEDUCTED** | Outbound final issue | physical -=, reserved -= | Hàng đã xuất physical |
| **CANCELLED** | Reverse / Cancel | Ngược lại original | Tạo trans mới qty ngược |

---

# 3. OnHand Model Specification

**Table:** `on_hand`

Single source of truth cho số lượng tồn kho thực tế. Hệ thống KHÔNG truy vấn chứng từ (ASN/SO) để tính tồn — chỉ dùng on_hand table này.

> **QUY TẮC VÀNG:** OnHand.physical_qty(item, dim) = SUM(InventTrans.qty WHERE item AND dim AND stage IN (PHYSICAL))

> **CRITICAL:** KHÔNG BAO GIỜ cập nhật on_hand trực tiếp từ UI hoặc API. Luôn thông qua InventTrans → trigger update on_hand.

## 3.1 OnHand Fields

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khóa chính |
| **item_id** | VARCHAR(50) | FK → item(sku), NOT NULL | UNIQUE(item_id, invent_dim_id) |
| **invent_dim_id** | UUID | FK → invent_dim(id), NOT NULL | Tham chiếu dimension |
| **physical_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | = SUM(invent_trans WHERE stage=PHYSICAL) |
| **reserved_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | = SUM(active allocations) |
| **available_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | `[TVL]` = physical - reserved (bỏ qc_hold) |
| **ordered_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | = SUM(trans WHERE stage=EXPECTED) |
| **uom** | VARCHAR(10) | FK, NOT NULL, DEFAULT 'KG' | Đơn vị tính |
| **last_movement_at** | TIMESTAMPTZ | NULLABLE | Báo cáo hàng tồn lâu + storage fee |
| **last_count_at** | TIMESTAMPTZ | NULLABLE | Xác định vị trí cần cycle count |
| **updated_at** | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-update |

## 3.2 OnHand Update Trigger Logic

Mỗi khi InventTrans được post:
1. Xác định (item_id, dim_to_id hoặc dim_from_id) tương ứng
2. Tìm on_hand record theo (item_id, invent_dim_id). Nếu chưa tồn tại → INSERT mới
3. Cập nhật qty tương ứng theo stage: PHYSICAL → physical_qty, EXPECTED → ordered_qty
4. Tự động recalculate: available_qty = physical_qty - reserved_qty
5. Update last_movement_at = NOW()

## 3.3 Daily Storage Snapshot

Hệ thống chụp snapshot on_hand cuối mỗi ngày (23:59 local timezone warehouse) để tính storage billing. Table `daily_storage_snapshot` lưu: snapshot_date, item_id, invent_dim_id, physical_qty, owner_id, warehouse_id. Snapshot là **immutable** — không sửa sau khi tạo.

---

# 4. InventDim Configuration

**Table:** `invent_dim`

Dimension key table theo D365. Mỗi tổ hợp duy nhất = 1 record InventDim.

> **CRITICAL:** `[TVL CONFIRMED]` Phase 1: Site + Warehouse + Location + Owner + Status BẮT BUỘC. Batch/Lot = OFF (luôn NULL).

## 4.1 Phase 1 Configuration

| Dimension | Sample Value | Phase 1 | Notes |
|-----------|-------------|---------|-------|
| **Site** | TVL-SITE | Always TVL-SITE | 1 site duy nhất |
| **Warehouse** | WH5.1, WH5.3, YARD01 | **BẮT BUỘC** | Mã kho |
| **Location** | WH51-ZONE-A-01 | **BẮT BUỘC cho on-hand** | NULL khi transit |
| **Owner** | CUST001, CUST002 | **BẮT BUỘC** | 3PL requirement |
| **Inventory Status** | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT | **BẮT BUỘC** | `[TVL]` 4 status. Bỏ QC_HOLD |
| **Batch/Lot** | NULL | OFF Phase 1 | Phase 2: xem xét bật |
| **Serial** | NULL | OFF | Không dùng cho bulk cargo |

## 4.2 Dim Hash Strategy

`dim_hash = SHA-256(site_id|warehouse_id|location_id|batch_id|serial_id|inventory_status|owner_id)`

Quy trình tạo InventDim: 1) Tính dim_hash → 2) SELECT WHERE dim_hash = :hash → 3) Nếu tồn tại → return existing id → 4) Nếu chưa → INSERT mới.

---

# 5. Event Mapping: Business Event → InventTrans Record

## 5.1 Inbound Module

**Posting point:** RECEIVED state. Các state trước RECEIVED KHÔNG tạo InventTrans physical.

| ID | State | qty | stage | Dimension | OnHand Impact | Type |
|----|-------|-----|-------|-----------|---------------|------|
| 🟢 IB-1 | RECEIVED | +net_weight_kg | PHYSICAL | NULL → {WH,STAGE,owner} | +physical, +available | **POSTING POINT** |
| 🚫 IB-2 | REJECTED | — | — | — | **ZERO IMPACT** | Không tạo InventTrans |
| 🔵 IB-3 | PUTAWAY | ±qty (pair) | PHYSICAL | STAGE → STORAGE | Net 0 (move) | 2 trans records |
| 🔴 IB-4 | Force Cancel | -net_weight_kg | PHYSICAL | LOC → NULL | -physical | **REVERSAL** |
| IB-5 | Cancel (pre-RECEIVED) | — | — | — | **ZERO IMPACT** | Chưa có InventTrans |

## 5.2 Outbound Module

**Posting point:** SHIPPED state (per line). Allocation tạo InventTrans stage=REGISTERED.

| ID | State | qty | stage | OnHand Impact | Notes |
|----|-------|-----|-------|---------------|-------|
| OB-1 | CONFIRMED | -expected_qty | EXPECTED | +ordered | Demand ghi nhận (optional) |
| 🟡 OB-2 | ALLOCATED | -allocated_qty | REGISTERED | -available, +reserved | FIFO allocation |
| OB-3 | UNALLOCATE | +allocated_qty | REGISTERED | +available, -reserved | Reverse allocation |
| OB-4 | PICKING | — | REGISTERED | Status tracking | RESERVED → PICKED |
| 🟢 OB-5 | SHIPPED/line | -shipped_qty | PHYSICAL | -physical, -reserved | **POSTING POINT** |
| 🔴 OB-6 | Force Cancel | +shipped_qty | PHYSICAL | +physical | **REVERSAL** |

## 5.3 Inventory Module

| ID | Event | qty | stage | OnHand Impact | Notes |
|----|-------|-----|-------|---------------|-------|
| INV-1 | Internal Move | ±qty (pair) | PHYSICAL | LOC_FROM → LOC_TO | 2 InventTrans records |
| INV-2 | Status Change | 0 | PHYSICAL | available thay đổi | reason_code BẮT BUỘC |
| INV-3 | Cycle Count (+) | +variance | PHYSICAL | +physical, +available | Approval + reason_code |
| INV-4 | Cycle Count (-) | -variance | PHYSICAL | -physical, -available | Approval + reason_code |
| INV-5 | Shrinkage Adjust | -shrinkage | PHYSICAL | -physical, -available | `[TVL]` Không cần approval |

## 5.4 Transfer Module

Transfer inter-warehouse tạo 2 InventTrans:
1. **Ship** từ source WH: status AVAILABLE → IN_TRANSIT, physical giảm
2. **Receive** tại dest WH: status IN_TRANSIT → AVAILABLE, physical tăng

`[TVL CONFIRMED]` TVL CÓ nghiệp vụ chuyển kho inter-warehouse.

## 5.5 VAS / Bagging Module

Work order completed tạo 3 InventTrans:
- **VAS_CONSUME:** -bulk qty (ref_type=ADJUSTMENT)
- **VAS_PRODUCE:** +bagged qty (ref_type=ADJUSTMENT)
- **VAS_CONSUME:** -packaging qty nếu TVL_OWNED (ref_type=ADJUSTMENT)

---

# 6. Idempotency Rules

| Rule ID | Scope | Check Method | Response |
|---------|-------|-------------|----------|
| IDEM-001 | external_id | SELECT WHERE external_id = :ext_id | HTTP 409. Return existing trans_id |
| IDEM-002 | trans_id | UNIQUE constraint | Retry với SEQ mới |
| IDEM-003 | WorkLine 1:1 | Check ref_type=WORK AND ref_line_id | Skip nếu đã tồn tại |
| IDEM-004 | Receipt posting | Check (ref_type, ref_id, ref_line_id, stage=PHYSICAL) | Skip nếu đã post |
| IDEM-005 | Shipment posting | Check (ref_type, ref_id, ref_line_id, stage=PHYSICAL) | Skip nếu đã post |
| IDEM-006 | InventDim dedup | dim_hash check | Return existing dim_id |
| IDEM-007 | Reversal prevention | is_reversed = FALSE check | Reject: already reversed |
| IDEM-008 | Allocation lock | shipment.status check | Row-level lock |

---

# 7. Audit Log Specification

**Table:** `audit_log`

## 7.1 Audit Log Schema

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK | Khóa chính |
| **entity_type** | ENUM | NOT NULL | INVENT_TRANS, ON_HAND, RECEIPT, SHIPMENT, TRANSFER, WORK_ORDER, ADJUSTMENT |
| **entity_id** | VARCHAR(50) | NOT NULL | ID entity bị thay đổi |
| **action** | ENUM | NOT NULL | CREATE, UPDATE, DELETE, REVERSE, POST, CANCEL, APPROVE, REJECT |
| **field_name** | VARCHAR(50) | NULLABLE | Tên field thay đổi |
| **old_value** | TEXT | NULLABLE | Giá trị cũ |
| **new_value** | TEXT | NULLABLE | Giá trị mới |
| **user_id** | UUID | FK → users, NOT NULL | Người thực hiện |
| **user_role** | VARCHAR(30) | NOT NULL | Role tại thời điểm action |
| **ip_address** | VARCHAR(45) | NULLABLE | IPv4/IPv6 |
| **device_type** | ENUM | NULLABLE | WEB, MOBILE, API, SYSTEM |
| **timestamp** | TIMESTAMPTZ | NOT NULL | Thời điểm action |
| **reason_code** | VARCHAR(20) | NULLABLE | BẮT BUỘC cho REVERSE, CANCEL, ADJUST |
| **notes** | VARCHAR(500) | NULLABLE | Ghi chú |
| **correlation_id** | VARCHAR(50) | NULLABLE | Group related audit entries |

## 7.2 Audit Scope

| Entity | Actions Tracked |
|--------|----------------|
| invent_trans | CREATE, REVERSE |
| on_hand | UPDATE (qty change) |
| receipt_header | CREATE, UPDATE status, CANCEL |
| shipment_header | CREATE, UPDATE status, CANCEL |
| transfer_header | CREATE, SHIP, RECEIVE, CANCEL |
| adjustment | CREATE |

## 7.3 Audit Requirements

1. Mọi InventTrans CREATE tự động tạo audit_log entry
2. Reverse phải log cả trans gốc lẫn trans reverse, với correlation_id
3. Status change trên chứng từ phải log old_status → new_status
4. Retention: 7 năm minimum. Partition theo timestamp (monthly)
5. Không xóa audit_log

---

# 8. Stock Ledger Reconciliation Rules

## 8.1 Critical Rules

| Rule ID | Rule Name | Validation | Frequency | Severity |
|---------|-----------|-----------|-----------|----------|
| RCN-001 | Physical = SUM(Trans) | physical_qty == SUM(trans.qty WHERE stage=PHYSICAL) | Daily 23:00 + On-demand | **CRITICAL** |
| RCN-002 | Available formula | available == physical - reserved | Real-time | HIGH |
| RCN-003 | No negative physical | physical_qty >= 0 | Pre-check before post | **CRITICAL** |
| RCN-004 | Trans immutability | No UPDATE/DELETE on invent_trans | DB trigger | **CRITICAL** |
| RCN-005 | Snapshot consistency | snapshot(date).qty == on_hand(23:59) | After EOD | HIGH |
| RCN-006 | Cross-entity balance | SUM(on_hand per owner) == SUM(trans per owner) | Weekly | MEDIUM |
| RCN-007 | External ID uniqueness | COUNT per external_id == 1 | Real-time (unique index) | **CRITICAL** |
| RCN-008 | Reversal pair integrity | reversed → reversed_by exists with -qty | Daily | MEDIUM |
| RCN-009 | Dim hash uniqueness | 1 dim_hash = 1 dimension combination | On INSERT | HIGH |
| RCN-010 | Total balance | SUM(receipt) == SUM(issue) + on_hand + adjustments | Monthly | HIGH |

## 8.2 Reconciliation Job

**Frequency:** Daily (23:00) + On-demand manual trigger.

**Process:**
1. Cho mỗi (item_id, invent_dim_id) trong on_hand, tính SUM(invent_trans.qty WHERE stage=PHYSICAL)
2. So sánh với on_hand.physical_qty
3. Nếu chênh lệch > 0 → log vào `recon_variance` table
4. Alert WH Manager nếu variance vượt threshold
5. **KHÔNG auto-fix** — chờ manual review

## 8.3 Recon Variance Table

**Table:** `recon_variance` — Lưu chênh lệch phát hiện.

Fields: id, run_id, item_id, invent_dim_id, expected_qty, actual_qty, variance, severity, resolved, resolved_by, resolved_at, resolution_action (AUTO_FIX | MANUAL_ADJUST | ACKNOWLEDGED), created_at.

---

# 9. Daily Storage Snapshot (Billing)

Batch job chạy tại 23:59 daily (local timezone warehouse).

## 9.1 Snapshot Table

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK | Khóa chính |
| snapshot_date | DATE | NOT NULL | UNIQUE(snapshot_date, item_id, invent_dim_id) |
| item_id | VARCHAR(50) | FK | Mã hàng |
| invent_dim_id | UUID | FK | Dimension |
| physical_qty | DECIMAL(15,3) | NOT NULL | Tồn kho tại thời điểm snapshot |
| owner_id | VARCHAR(20) | FK | Denormalize cho billing |
| warehouse_id | VARCHAR(10) | FK | Denormalize |
| location_id | VARCHAR(30) | FK | Denormalize |
| is_billing_location | BOOLEAN | NOT NULL | STAGING = FALSE |
| created_at | TIMESTAMPTZ | NOT NULL | Thời gian snapshot |

Billing: `SUM(snapshot.physical_qty * rate_per_kg_per_day)` cho mỗi owner, mỗi ngày. Chỉ tính location có is_billing_location = TRUE.

---

# 10. ERD Reference

Xem file: `TVL_SWM_InventTrans_ERD.mermaid`

**Core Relationships:**

- `invent_trans` ─(N:1)─→ `item` (via item_id)
- `invent_trans` ─(N:1)─→ `invent_dim` (via dim_from_id) [Source]
- `invent_trans` ─(N:1)─→ `invent_dim` (via dim_to_id) [Target]
- `invent_trans` ─(N:1)─→ `owner` (via owner_id)
- `invent_trans` ─(N:1)─→ `receipt_header | shipment_header | transfer_header` (via ref_id, polymorphic on ref_type)
- `on_hand` ─(N:1)─→ `item` + `invent_dim` [UNIQUE composite]
- `invent_dim` ─(N:1)─→ `warehouse` + `location` + `owner`
- `work_line` ─(1:1)─→ `invent_trans` [Mỗi WorkLine.complete = 1 InventTrans]
- `daily_snapshot` ─(N:1)─→ `item` + `invent_dim`
- `audit_log` ─ polymorphic ─→ any entity (via entity_type + entity_id)

---

# 11. Assumptions & To-Confirm

## 11.1 Assumptions

| ID | Assumption | Basis |
|----|-----------|-------|
| A-1 | InventTrans là immutable — chỉ INSERT, không UPDATE/DELETE | D365 standard |
| A-2 | Timezone = Asia/Bangkok (UTC+7) | TVL single timezone |
| A-3 | NumberSequence TRX-YYYYMMDD-SEQ scope = PER_WAREHOUSE | Consistent |
| A-4 | Reconciliation KHÔNG auto-fix — chỉ log + alert | Conservative |
| A-5 | Audit_log retention = 7 năm | Regulatory |
| A-6 | Partition: monthly by posted_at | Volume ~1-5M/year |

## 11.2 To-Confirm

| ID | Question | Priority |
|----|---------|----------|
| Q-IT-1 | Outbound EXPECTED InventTrans: cần tạo khi confirm SO? Hay chỉ document tracking? | MEDIUM |
| Q-IT-2 | PICKING InventTrans: ghi riêng hay chỉ WorkLine level? | MEDIUM |
| Q-IT-3 | Reconciliation frequency: Daily auto hay on-demand? | LOW |
| Q-IT-4 | InventTrans partitioning: monthly? Volume dự kiến? | LOW |
| Q-IT-5 | Audit log: cần device_type + ip_address không? | LOW |
| Q-IT-6 | Snapshot cut-off time: 23:59 hay configurable per warehouse? | LOW |

---

*END OF DOCUMENT — Version 1.0*

*Prepared by: Smartlog Solution Team | CONFIDENTIAL*
