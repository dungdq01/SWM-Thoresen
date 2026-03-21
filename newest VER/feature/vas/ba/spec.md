# VAS Module — Feature Specification

> **Version**: 1.0
> **Date**: 2026-03-18
> **Author**: BA Agent
> **Status**: PENDING APPROVAL
> **Complexity**: Complex

---

## 1. Overview

### 1.1 Bối cảnh nghiệp vụ

VAS (Value-Added Services) là nhóm dịch vụ gia tăng mà TVL cung cấp cho chủ hàng ngay tại kho, bao gồm các nghiệp vụ biến đổi hàng hóa như đóng bao, rã bao, đổi bao. Hàng hóa đầu vào (nguyên vật liệu) được tiêu hao và tạo ra thành phẩm đầu ra theo công thức được định nghĩa trước (BOM).

Thiết kế này thay thế hoàn toàn module `bagging_work_order` / `bagging_progress` cũ (chưa implement) bằng một kiến trúc tổng quát, mở rộng được.

### 1.2 Phạm vi

| Trong scope | Ngoài scope |
|-------------|-------------|
| Đóng bao (BAGGING) | Quality check |
| Rã bao (DE_BAGGING) | Cân lại sản phẩm (weighbridge) |
| Đổi bao (RE_BAGGING) | Kế hoạch sản lượng per session |
| BOM (Bill of Materials) | |
| Multi-session per Work Order | |
| Multi-lot per source item per session | |
| Lot Traceability | |
| Auto InventTrans per session confirm | |
| Billing VAS | |

---

## 2. User Stories

### US-VAS-01: Quản lý BOM VAS
```
As a warehouse administrator,
I want to create and manage BOM (Bill of Materials) for each VAS service type,
So that work orders always use the correct material consumption formula.
```

### US-VAS-02: Tạo lệnh sản xuất VAS
```
As a warehouse manager,
I want to create a VAS Work Order by selecting BOM, owner, warehouse, and planned quantity,
So that the system plans materials and creates a target lot for traceability.
```

### US-VAS-03: Ghi nhận tiến độ ca làm việc
```
As a warehouse operator,
I want to record output quantity per session during VAS execution,
So that production progress is tracked in real time without waiting for completion.
```

### US-VAS-04: Xác nhận kết thúc ca — auto-tạo lệnh xuất/nhập
```
As a warehouse operator,
I want to confirm end-of-session by inputting:
  (a) material consumed per source item per lot (including waste),
  (b) pick location per source lot,
  (c) put location for the produced target item,
So that the system automatically creates Issue InventTrans for materials
and Receipt InventTrans for the target item, all referenced to this session.
```

### US-VAS-05: Hoàn thành lệnh sản xuất
```
As a warehouse manager,
I want to complete a VAS Work Order after all sessions are confirmed,
So that the final production quantity is locked and billing is triggered.
```

### US-VAS-06: Lot Traceability
```
As a warehouse manager or owner,
I want to trace which source lots were consumed to produce a given target lot,
So that origin, grade, and vessel information is preserved end-to-end.
```

---

## 3. Data Model

### 3.1 Sơ đồ quan hệ

```
vas_bom (1) ──< (N) vas_bom_line
    │
    │ bom_id
    ▼
vas_work_order (VWO)
    │
    ├──< vas_work_order_source   (planned source materials + lot selection)
    │
    └──< vas_session
              └──< vas_session_line   (1 line per source_item × lot)
```

### 3.2 `vas_bom` — Công thức sản xuất VAS

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `tenant_id` | UUID | NO | Multi-tenancy |
| `bom_code` | varchar(50) | NO | UNIQUE(tenant_id, bom_code) |
| `bom_name` | varchar(200) | NO | Tên công thức |
| `service_type` | VasType | NO | BAGGING / DE_BAGGING / RE_BAGGING |
| `target_item_id` | UUID → item | NO | Item thành phẩm |
| `is_active` | bool | NO | DEFAULT true |
| `notes` | varchar(500) | YES | |
| audit fields | | | created_at/by, updated_at/by |

**UNIQUE**: `(tenant_id, service_type, target_item_id)` — 1 target item chỉ có 1 BOM active per service type.

### 3.3 `vas_bom_line` — Nguyên vật liệu đầu vào

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `bom_id` | UUID → vas_bom | NO | FK |
| `tenant_id` | UUID | NO | |
| `source_item_id` | UUID → item | NO | Item nguồn |
| `qty_ratio` | decimal(18,6) | NO | Tỷ lệ tiêu hao per 1 đơn vị target |
| `is_packaging_material` | bool | NO | DEFAULT false |
| `packaging_ownership` | PackagingOwnership | YES | TVL_OWNED / CLIENT_OWNED (chỉ khi is_packaging=true) |
| `sequence_no` | int | NO | Thứ tự hiển thị |

> **qty_ratio ví dụ**: 1 kg bulk → 1 kg bagged: qty_ratio=1.0 cho bulk. 1 kg bulk cần 0.05 bao: qty_ratio=0.05 cho bao bì.

### 3.4 `vas_work_order` — Lệnh sản xuất VAS

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `tenant_id` | UUID | NO | |
| `vwo_number` | varchar(50) | NO | UNIQUE, auto-generated |
| `service_type` | VasType | NO | Copy từ BOM khi tạo |
| `bom_id` | UUID → vas_bom | NO | BOM áp dụng |
| `owner_id` | UUID → owner | NO | Chủ hàng |
| `warehouse_id` | UUID → warehouse | NO | Kho thực hiện |
| `target_item_id` | UUID → item | NO | Copy từ BOM |
| `target_lot_id` | UUID → lot | YES | Auto-create khi CONFIRMED |
| `planned_qty` | decimal(18,3) | NO | Kế hoạch tổng (UOM target item) |
| `actual_qty` | decimal(18,3) | NO | DEFAULT 0, aggregate từ sessions |
| `status` | VasWorkOrderStatus | NO | DEFAULT DRAFT |
| `notes` | varchar(1000) | YES | |
| audit fields | | | created_at/by, updated_at/by |

### 3.5 `vas_work_order_source` — Kế hoạch nguyên vật liệu

*Tạo khi WO → CONFIRMED. 1 row per (vwo, bom_line, source_lot).*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `vwo_id` | UUID → vas_work_order | NO | FK |
| `tenant_id` | UUID | NO | |
| `bom_line_id` | UUID → vas_bom_line | NO | Reference BOM line |
| `source_item_id` | UUID → item | NO | Copy từ bom_line |
| `source_lot_id` | UUID → lot | NO | **Lot được chọn khi confirm WO** |
| `planned_qty` | decimal(18,3) | NO | planned_qty_VWO × qty_ratio |
| `actual_qty` | decimal(18,3) | NO | DEFAULT 0, aggregate từ session_lines |

### 3.6 `vas_session` — Ca làm việc

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `vwo_id` | UUID → vas_work_order | NO | FK |
| `tenant_id` | UUID | NO | |
| `session_number` | int | NO | Số thứ tự trong WO, auto-increment |
| `output_qty` | decimal(18,3) | NO | Số lượng thành phẩm ca này |
| `target_location_id` | UUID → location | YES | **Confirm khi end session** |
| `invent_trans_receipt_id` | UUID → invent_trans | YES | Auto-created Receipt trans |
| `status` | VasSessionStatus | NO | OPEN → CONFIRMED / CANCELLED |
| `is_overtime` | bool | NO | DEFAULT false |
| `confirmed_at` | timestamp | YES | |
| `confirmed_by` | varchar(200) | YES | |
| `notes` | varchar(500) | YES | |
| audit fields | | | created_at/by, updated_at/by |

### 3.7 `vas_session_line` — Nguyên vật liệu tiêu hao per ca

*1 row per (session × source_item × source_lot). Hỗ trợ multi-lot per source item.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|--------|
| `id` | UUID | NO | PK |
| `session_id` | UUID → vas_session | NO | FK |
| `tenant_id` | UUID | NO | |
| `vwo_source_id` | UUID → vas_work_order_source | NO | Link lại BOM line + lot kế hoạch |
| `source_item_id` | UUID → item | NO | Copy từ vwo_source |
| `source_lot_id` | UUID → lot | NO | **Lot thực tế tiêu hao** (có thể khác lot kế hoạch khi split) |
| `source_location_id` | UUID → location | NO | **Vị trí lấy hàng — confirm khi end session** |
| `consumed_qty` | decimal(18,3) | NO | **Bao gồm cả waste** |
| `invent_trans_issue_id` | UUID → invent_trans | YES | Auto-created Issue trans |

---

## 4. Process Flow

### 4.1 Happy Path — Vòng đời Work Order

```
DRAFT
  │ Operator tạo WO, chọn BOM, owner, warehouse, planned_qty
  │
  ▼ [Confirm WO]
CONFIRMED
  │ System: (a) Tạo vas_work_order_source từ BOM × planned_qty × qty_ratio
  │         (b) Operator chọn source lots (có thể multi-lot)
  │         (c) System auto-create target_lot (với source_lot_id = lot vật tư chính)
  │
  ▼ [Bắt đầu session đầu tiên]
IN_PROGRESS
  │
  │  ┌── Vòng lặp session ──────────────────────────────────────┐
  │  │                                                           │
  │  │  OPEN session                                            │
  │  │    │ Operator record: output_qty                         │
  │  │    │                                                      │
  │  │    ▼ [Confirm end session]                               │
  │  │  Operator nhập per source item × lot:                    │
  │  │    - consumed_qty (incl. waste)                          │
  │  │    - source_location_id                                  │
  │  │  Operator nhập:                                          │
  │  │    - target_location_id                                  │
  │  │                                                           │
  │  │  System auto-tạo InventTrans:                            │
  │  │    - ISSUE/DEDUCTED per session_line (source → void)     │
  │  │    - RECEIPT/PHYSICAL: target item → target_location     │
  │  │    (ref_type=VAS, ref_id=session_id)                    │
  │  │                                                           │
  │  │  Session → CONFIRMED                                     │
  │  │  VWO.actual_qty += session.output_qty                    │
  │  └───────────────────────────────────────────────────────── ┘
  │
  ▼ [Complete WO — all sessions CONFIRMED]
COMPLETED
  │ System: Tạo billing_transaction (VAS fee)
  ▼
[Done]
```

### 4.2 InventTrans tạo khi Session CONFIRMED

| Trans | trans_type | stage | Item | Qty | Location | lot_id | ref_type | ref_id |
|-------|-----------|-------|------|-----|----------|--------|----------|--------|
| Tiêu hao vật tư chính | ISSUE | DEDUCTED | source_item | -consumed_qty | source_location | source_lot_id | VAS | session_id |
| Tiêu hao bao bì (TVL_OWNED) | ISSUE | DEDUCTED | packaging_item | -consumed_qty | source_location | source_lot_id | VAS | session_id |
| Sản xuất thành phẩm | RECEIPT | PHYSICAL | target_item | +output_qty | target_location | target_lot_id | VAS | session_id |

> **CLIENT_OWNED packaging**: Không tạo InventTrans Issue — bao bì không theo dõi trong hệ thống.
> **DE_BAGGING empty bags**: Bỏ đi, không tạo RECEIPT trans cho bao rỗng.

### 4.3 Waste Handling

- **Không có InventTrans riêng cho waste**.
- `consumed_qty` trên `vas_session_line` ĐÃ bao gồm waste.
- Waste (báo cáo) = `consumed_qty` − (`session.output_qty` × `bom_line.qty_ratio`)
- Hệ thống trừ thẳng vào InventTrans Issue với số lượng `consumed_qty` (actual consumed incl. waste).

### 4.4 Multi-Lot Source per Session

Trong 1 session, operator có thể pick từ nhiều lots của cùng 1 source item:

```
Session #1 — Output: 5,000 kg bagged
  └── Bulk SKU:
        session_line[1]: Lot A, Location STOR-01, consumed=3,000 kg
        session_line[2]: Lot B, Location STOR-02, consumed=2,050 kg  ← incl. 50 kg waste
  └── Bao bì (TVL_OWNED):
        session_line[3]: Lot C, Location STOR-10, consumed=250 bags
```

---

## 5. Lot Traceability Design

### 5.1 Target Lot Creation

Khi WO → CONFIRMED, system tạo lot mới cho target item:

```sql
-- Target lot
lot.item_id       = target_item_id
lot.owner_id      = vwo.owner_id
lot.source_lot_id = source_lot_id của BOM line vật tư CHÍNH (non-packaging)
                    (nếu multi-lot nguồn → source_lot_id = lot đầu tiên / lot có qty lớn nhất)
```

### 5.2 Chuỗi truy xuất

```
Bagged Lot C
  └── source_lot_id → Bulk Lot A
        ├── origin, grade, vessel, BL number
        └── first_received_date

Truy xuất: Từ hàng bao Lot C → biết đây là hàng từ lô bulk nào, tàu nào, BL nào.
```

### 5.3 Per VAS Type

| VAS Type | Source Lot | Target Lot | source_lot_id |
|----------|-----------|------------|---------------|
| BAGGING | Bulk lot | Mới tạo (bagged) | → Bulk lot |
| DE_BAGGING | Bagged lot | Mới tạo (bulk) | → Bagged lot |
| RE_BAGGING | Bagged lot (old) | Mới tạo (bagged new) | → Old bagged lot |

---

## 6. Business Rules

### BR-VAS-001 — BOM Uniqueness
- **Category**: Constraint
- **Description**: Mỗi (tenant, service_type, target_item) chỉ có 1 BOM `is_active=true`.
- **Trigger**: Tạo hoặc activate BOM.
- **Exception**: Không có.

### BR-VAS-002 — BOM Deactivation Guard
- **Category**: Constraint
- **Description**: BOM không thể deactivate nếu có VWO đang ở trạng thái CONFIRMED hoặc IN_PROGRESS đang dùng BOM đó.
- **Trigger**: Deactivate BOM.

### BR-VAS-003 — WO Confirm: Kiểm tra Available Qty
- **Category**: Validation
- **Description**: Khi WO → CONFIRMED, với mỗi source item, system tính `planned_qty = planned_qty_VWO × qty_ratio` và kiểm tra `available_qty ≥ planned_qty` cho từng lot được chọn.
- **Trigger**: Confirm WO action.
- **Exception**: Soft warning nếu CLIENT_OWNED packaging (không kiểm tra qty).

### BR-VAS-004 — Session Confirm: Validate Input
- **Category**: Validation
- **Description**: Session không thể CONFIRMED nếu:
  - `output_qty ≤ 0`
  - `target_location_id` chưa chọn
  - Bất kỳ session_line nào có `consumed_qty ≤ 0` hoặc `source_location_id` chưa chọn
- **Trigger**: Confirm session action.

### BR-VAS-005 — CLIENT_OWNED Packaging Skip
- **Category**: Derivation
- **Description**: Với BOM line có `packaging_ownership = CLIENT_OWNED`, không tạo InventTrans ISSUE khi session confirm.
- **Trigger**: Session confirm.

### BR-VAS-006 — DE_BAGGING: Không Receipt bao rỗng
- **Category**: Constraint
- **Description**: Với VAS type DE_BAGGING, bao bì sau khi rã không tạo InventTrans RECEIPT (bỏ đi).
- **Trigger**: Session confirm, service_type = DE_BAGGING.

### BR-VAS-007 — WO Completion Guard
- **Category**: Sequencing
- **Description**: WO chỉ COMPLETED khi tất cả sessions của WO đều ở trạng thái CONFIRMED (không còn session OPEN).
- **Trigger**: Complete WO action.

### BR-VAS-008 — Billing Trigger
- **Category**: Sequencing
- **Description**: Khi WO → COMPLETED, system tạo `billing_transaction` cho fee type VAS (PER_UNIT, basis = actual_qty).
- **Trigger**: WO COMPLETED.

### BR-VAS-009 — Immutable Confirmed Session
- **Category**: Constraint
- **Description**: Session đã CONFIRMED không thể edit. Nếu cần sửa, phải cancel session (tạo session_lines đảo chiều) và tạo session mới.
- **Trigger**: Mọi update request trên CONFIRMED session.

### BR-VAS-010 — Source Lot Availability Check per Session Line
- **Category**: Validation
- **Description**: Khi operator nhập consumed_qty per lot per session, system kiểm tra available_qty của lot đó tại thời điểm confirm ≥ consumed_qty.
- **Trigger**: Session confirm.

---

## 7. ENUM Changes

### Thêm mới
```
VasType:              BAGGING | DE_BAGGING | RE_BAGGING
VasWorkOrderStatus:   DRAFT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
VasSessionStatus:     OPEN | CONFIRMED | CANCELLED
```

### Loại bỏ
```
bagging_status      → thay bằng VasWorkOrderStatus
```

### Giữ nguyên
```
PackagingOwnership: TVL_OWNED | CLIENT_OWNED  (chuyển từ bagging_work_order sang vas_bom_line)
```

---

## 8. UI Notes

### 8.1 BOM Management Screen

- List BOM với filter: service_type, target_item, is_active
- Form tạo BOM: chọn service_type + target_item → tự động check uniqueness
- BOM Lines table: source_item, qty_ratio, is_packaging, packaging_ownership
- Deactivate action: disabled nếu có WO đang active

### 8.2 VAS Work Order Form

- Chọn service_type → lọc BOM available
- Chọn BOM → auto-fill target_item
- Nhập planned_qty
- Confirm WO: hiển thị bảng chọn source lot per source item (multi-lot allowed)

### 8.3 Session Confirm Screen

```
[Ca #N — Kết thúc ca]

Thành phẩm sản xuất
  Số lượng: [___] kg
  Vị trí đặt: [dropdown — VAS/STORAGE locations]

Nguyên vật liệu tiêu hao
  ┌─────────────────┬──────────────────────┬──────────────┬────────────────┐
  │ Item            │ Lot                  │ Tiêu hao (kg)│ Lấy tại        │
  ├─────────────────┼──────────────────────┼──────────────┼────────────────┤
  │ Bulk SKU        │ [Lot A — 3,000 avail]│ [___]        │ [dropdown]     │
  │                 │ [+ Thêm lot]         │              │                │
  │ Bao bì (TVL)    │ [Lot C — 500 avail]  │ [___]        │ [dropdown]     │
  └─────────────────┴──────────────────────┴──────────────┴────────────────┘

  [Waste tự tính: consumed - (output × ratio)] ← chỉ hiển thị, không input

  [Xác nhận kết thúc ca]
```

### 8.4 Indicators

- WO progress: `actual_qty / planned_qty` progress bar
- Per source: `SUM(consumed) / planned_qty_source` utilization
- Session count per WO

---

## 9. Dependencies

| Dependency | Mô tả |
|-----------|--------|
| `item` (master data) | source_item, target_item, packaging_item |
| `lot` | Source lot selection, target lot creation |
| `location` | Source pick location, target put location — type VAS/STORAGE |
| `invent_trans` | ISSUE/RECEIPT trans creation — cần extend ref_type enum thêm VAS |
| `on_hand` | Available qty check per lot per location |
| `billing_transaction` | Trigger khi WO COMPLETED |
| `number_sequence` | VWO number generation |

---

## 10. Migration Impact

| Đối tượng | Hành động | Ghi chú |
|----------|-----------|---------|
| `ops.bagging_work_order` | DROP | Phase 8 chưa implement → không có data |
| `ops.bagging_progress` | DROP | Phase 8 chưa implement → không có data |
| ENUM `bagging_status` | DROP | |
| `ops.vas_bom` | CREATE | |
| `ops.vas_bom_line` | CREATE | |
| `ops.vas_work_order` | CREATE | |
| `ops.vas_work_order_source` | CREATE | |
| `ops.vas_session` | CREATE | |
| `ops.vas_session_line` | CREATE | |
| ENUM `vas_type` | CREATE | BAGGING / DE_BAGGING / RE_BAGGING |
| ENUM `vas_work_order_status` | CREATE | |
| ENUM `vas_session_status` | CREATE | |
| `invent_trans.ref_type` ENUM | EXTEND | Thêm giá trị VAS |

---

## 11. Open Questions

*Tất cả open questions đã được resolved. Spec sẵn sàng cho review.*

---

## 12. Approval

| Role | Người | Trạng thái | Ngày |
|------|-------|-----------|------|
| BA | BA Agent | SUBMITTED | 2026-03-18 |
| Product Owner | | PENDING | |
| Tech Lead | | PENDING | |
