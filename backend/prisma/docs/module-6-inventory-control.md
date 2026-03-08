# Module 6: Inventory Control — Database Documentation

**Version:** 1.1  
**Ngày tạo:** 2025-01-08  
**Cập nhật:** 2025-03-09

---

## 1. Tổng quan

Module 6 sử dụng **13 bảng database** để quản lý các nghiệp vụ kiểm soát tồn kho. Tất cả bảng đều có prefix `ic_` (inventory control).

---

## 2. Enums

### IcMoveOrderStatus
```
DRAFT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | FAILED
```

### IcMoveLineStatus
```
OPEN | EXECUTING | COMPLETED | CANCELLED | FAILED
```

### IcExecutionMode
```
DIRECT | WORK_BASED
```

### IcTransferOrderStatus
```
CREATED | RELEASED | SHIPPED | IN_TRANSIT | PARTIALLY_RECEIVED | RECEIVED | CLOSED | CANCELLED | FAILED
```

### IcTransferLineStatus
```
OPEN | SHIPPED | PARTIALLY_RECEIVED | RECEIVED | CLOSED | CANCELLED
```

### IcStatusChangeStatus
```
CREATED | POSTED | REVERSED | FAILED | CANCELLED
```

### IcCycleCountStatus
```
CREATED | RELEASED | COUNTING | SUBMITTED | APPROVED | POSTED | CANCELLED
```

### IcCycleCountLineStatus
```
OPEN | COUNTED | VARIANCE | APPROVED | POSTED | CANCELLED
```

### IcAdjustmentStatus
```
DRAFT | SUBMITTED | APPROVED | POSTED | CANCELLED | FAILED
```

### IcAdjustmentLineStatus
```
OPEN | APPROVED | POSTED | FAILED | CANCELLED
```

### IcAdjustmentType
```
INCREASE | DECREASE | MIXED
```

### IcAdjustmentSourceType
```
MANUAL | COUNT | RECONCILIATION | TRANSFER_VARIANCE
```

### IcReconciliationStatus
```
OPEN | INVESTIGATING | RESOLVED | CLOSED
```

### IcReconciliationSeverity
```
LOW | MEDIUM | HIGH | CRITICAL
```

### IcResolutionType
```
NO_ACTION | ADJUSTMENT | REVERSE | INVESTIGATION
```

### IcDocumentEntityType
```
MOVE | TRANSFER | STATUS_CHANGE | COUNT | ADJUSTMENT | RECONCILIATION
```

### IcPostingStatus
```
PENDING | POSTED | FAILED
```

---

## 3. Tables

### 3.1 ic_move_order

**Mô tả:** Header lệnh di chuyển nội bộ trong cùng warehouse

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| move_number | VARCHAR(50) | No | - | Số lệnh di chuyển (unique) |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| execution_mode | IcExecutionMode | No | - | DIRECT hoặc WORK_BASED |
| status | IcMoveOrderStatus | No | DRAFT | Trạng thái document |
| reason_code | VARCHAR(50) | Yes | - | Mã lý do |
| remarks | TEXT | Yes | - | Ghi chú |
| requested_by | UUID | No | - | Người yêu cầu |
| confirmed_by | UUID | Yes | - | Người xác nhận |
| confirmed_at | TIMESTAMP | Yes | - | Thời điểm confirm |
| completed_by | UUID | Yes | - | Người hoàn thành |
| completed_at | TIMESTAMP | Yes | - | Thời điểm complete |
| work_header_id | VARCHAR(50) | Yes | - | Link work (nếu WORK_BASED) |
| posting_status | IcPostingStatus | No | PENDING | Trạng thái posting M3 |
| posted_ref | VARCHAR(100) | Yes | - | Reference từ M3 |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | Optimistic lock |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | Auto update |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(correlation_id)`

---

### 3.2 ic_move_order_line

**Mô tả:** Line chi tiết lệnh di chuyển

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| move_order_id | UUID | No | - | FK → ic_move_order |
| line_no | INT | No | - | Số thứ tự line |
| item_id | UUID | No | - | FK → md_item |
| owner_id | UUID | No | - | FK → md_owner |
| from_location_id | UUID | No | - | FK → md_location (nguồn) |
| to_location_id | UUID | No | - | FK → md_location (đích) |
| inventory_status | VARCHAR(30) | No | - | Trạng thái inventory |
| requested_qty | DECIMAL(18,3) | No | - | Số lượng yêu cầu |
| executed_qty | DECIMAL(18,3) | Yes | - | Số lượng thực tế |
| uom | VARCHAR(20) | No | - | Đơn vị tính |
| line_status | IcMoveLineStatus | No | OPEN | Trạng thái line |
| shortage_reason_code | VARCHAR(50) | Yes | - | Lý do thiếu |
| posted_trans_group_id | VARCHAR(100) | Yes | - | Trans ID từ M3 |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| updated_at | TIMESTAMP | No | - | - |

**Constraints:**
- UNIQUE `(move_order_id, line_no)`

**Indexes:**
- `(item_id, owner_id, from_location_id)`
- `(to_location_id)`
- `(line_status)`

---

### 3.3 ic_transfer_order

**Mô tả:** Header lệnh chuyển hàng giữa các warehouse

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| transfer_number | VARCHAR(50) | No | - | Số lệnh chuyển kho (unique) |
| from_warehouse_id | UUID | No | - | FK → md_warehouse (nguồn) |
| to_warehouse_id | UUID | No | - | FK → md_warehouse (đích) |
| execution_mode | IcExecutionMode | No | - | DIRECT hoặc WORK_BASED |
| status | IcTransferOrderStatus | No | CREATED | Trạng thái document |
| requested_ship_date | DATE | Yes | - | Ngày yêu cầu ship |
| actual_ship_at | TIMESTAMP | Yes | - | Thời điểm ship thực tế |
| actual_receive_at | TIMESTAMP | Yes | - | Thời điểm nhận thực tế |
| in_transit_sla_hours | INT | Yes | - | SLA in-transit (giờ) |
| vehicle_number | VARCHAR(50) | Yes | - | Biển số xe |
| shipped_by | UUID | Yes | - | Người ship |
| received_by | UUID | Yes | - | Người nhận |
| cancel_reason_code | VARCHAR(50) | Yes | - | Lý do hủy |
| close_reason_code | VARCHAR(50) | Yes | - | Lý do đóng |
| posting_ship_status | IcPostingStatus | No | PENDING | Trạng thái posting ship |
| posting_receive_status | IcPostingStatus | No | PENDING | Trạng thái posting receive |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(from_warehouse_id, status, created_at DESC)`
- `(to_warehouse_id, status, requested_ship_date)`
- `(actual_ship_at)`
- `(actual_receive_at)`

---

### 3.4 ic_transfer_order_line

**Mô tả:** Line chi tiết lệnh chuyển kho

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| transfer_order_id | UUID | No | - | FK → ic_transfer_order |
| line_no | INT | No | - | Số thứ tự line |
| item_id | UUID | No | - | FK → md_item |
| owner_id | UUID | No | - | FK → md_owner |
| uom | VARCHAR(20) | No | - | Đơn vị tính |
| requested_qty | DECIMAL(18,3) | No | - | Số lượng yêu cầu |
| shipped_qty | DECIMAL(18,3) | Yes | - | Số lượng đã ship |
| received_qty | DECIMAL(18,3) | Yes | - | Số lượng đã nhận |
| variance_qty | DECIMAL(18,3) | Yes | - | Chênh lệch |
| from_location_id | UUID | No | - | FK → md_location (nguồn) |
| to_location_id | UUID | Yes | - | FK → md_location (đích) |
| inventory_status | VARCHAR(30) | No | - | Trạng thái inventory |
| line_status | IcTransferLineStatus | No | OPEN | Trạng thái line |
| variance_reason_code | VARCHAR(50) | Yes | - | Lý do variance |
| issue_flag | BOOLEAN | No | false | Flag có issue |
| posted_ship_trans_id | VARCHAR(100) | Yes | - | Ship trans ID từ M3 |
| posted_receive_trans_id | VARCHAR(100) | Yes | - | Receive trans ID từ M3 |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| updated_at | TIMESTAMP | No | - | - |

**Constraints:**
- UNIQUE `(transfer_order_id, line_no)`

**Indexes:**
- `(item_id, owner_id, line_status)`
- `(issue_flag)`

---

### 3.5 ic_inventory_status_change

**Mô tả:** Yêu cầu đổi trạng thái tồn kho

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| status_change_number | VARCHAR(50) | No | - | Số document (unique) |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| location_id | UUID | No | - | FK → md_location |
| item_id | UUID | No | - | FK → md_item |
| owner_id | UUID | No | - | FK → md_owner |
| from_status | VARCHAR(30) | No | - | Status hiện tại |
| to_status | VARCHAR(30) | No | - | Status mới |
| qty | DECIMAL(18,3) | No | - | Số lượng |
| uom | VARCHAR(20) | No | - | Đơn vị tính |
| reason_code | VARCHAR(50) | No | - | Mã lý do (bắt buộc) |
| reason_text | TEXT | Yes | - | Mô tả lý do |
| attachment_ref | VARCHAR(255) | Yes | - | Link chứng từ |
| status | IcStatusChangeStatus | No | CREATED | Trạng thái document |
| posted_trans_group_id | VARCHAR(100) | Yes | - | Trans ID từ M3 |
| requested_by | UUID | No | - | Người yêu cầu |
| approved_by | UUID | Yes | - | Người duyệt |
| posted_at | TIMESTAMP | Yes | - | Thời điểm post |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(item_id, owner_id, location_id)`
- `(correlation_id)`

---

### 3.6 ic_cycle_count_plan

**Mô tả:** Kế hoạch kiểm kê chu kỳ

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| plan_code | VARCHAR(50) | No | - | Mã kế hoạch (unique) |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| scope_type | IcCycleCountScopeType | No | - | LOCATION/ITEM/... |
| frequency | IcCycleCountPlanFrequency | No | - | DAILY/WEEKLY/... |
| selection_rule | JSON | Yes | - | Rule chọn scope |
| blind_count | BOOLEAN | No | true | Ẩn system qty |
| recount_threshold_pct | DECIMAL(8,4) | Yes | - | Ngưỡng % recount |
| auto_post_threshold_pct | DECIMAL(8,4) | Yes | - | Ngưỡng % auto post |
| max_recount | INT | No | 1 | Số lần recount tối đa |
| is_active | BOOLEAN | No | true | Active flag |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, is_active)`

---

### 3.7 ic_cycle_count_header

**Mô tả:** Header đợt kiểm kê

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| count_number | VARCHAR(50) | No | - | Số đợt kiểm kê (unique) |
| cycle_count_plan_id | UUID | Yes | - | FK → ic_cycle_count_plan |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| count_scope_snapshot | JSON | No | - | Snapshot scope tại thời điểm tạo |
| status | IcCycleCountStatus | No | CREATED | Trạng thái document |
| blind_count | BOOLEAN | No | - | Ẩn system qty |
| released_at | TIMESTAMP | Yes | - | Thời điểm release |
| submitted_at | TIMESTAMP | Yes | - | Thời điểm submit |
| approved_at | TIMESTAMP | Yes | - | Thời điểm approve |
| posted_at | TIMESTAMP | Yes | - | Thời điểm post |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(cycle_count_plan_id)`

---

### 3.8 ic_cycle_count_line

**Mô tả:** Line chi tiết kiểm kê

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| cycle_count_header_id | UUID | No | - | FK → ic_cycle_count_header |
| line_no | INT | No | - | Số thứ tự line |
| item_id | UUID | No | - | FK → md_item |
| owner_id | UUID | No | - | FK → md_owner |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| location_id | UUID | No | - | FK → md_location |
| inventory_status | VARCHAR(30) | No | - | Trạng thái inventory |
| system_qty | DECIMAL(18,3) | Yes | - | Số lượng hệ thống (null nếu blind) |
| counted_qty | DECIMAL(18,3) | Yes | - | Số lượng đếm được |
| variance_qty | DECIMAL(18,3) | Yes | - | Chênh lệch = counted - system |
| variance_pct | DECIMAL(8,4) | Yes | - | % chênh lệch |
| recount_no | INT | No | 0 | Số lần recount |
| line_status | IcCycleCountLineStatus | No | OPEN | Trạng thái line |
| adjustment_header_id | UUID | Yes | - | Link adjustment nếu có |
| evidence_ref | VARCHAR(255) | Yes | - | Link ảnh/chứng từ |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| updated_at | TIMESTAMP | No | - | - |

**Constraints:**
- UNIQUE `(cycle_count_header_id, line_no)`

**Indexes:**
- `(warehouse_id, location_id, line_status)`
- `(item_id, owner_id)`

---

### 3.9 ic_adjustment_header

**Mô tả:** Header điều chỉnh tồn kho

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| adjustment_number | VARCHAR(50) | No | - | Số điều chỉnh (unique) |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| adjustment_type | IcAdjustmentType | No | - | INCREASE/DECREASE/MIXED |
| source_type | IcAdjustmentSourceType | No | - | MANUAL/COUNT/... |
| status | IcAdjustmentStatus | No | DRAFT | Trạng thái document |
| total_line_count | INT | No | 0 | Tổng số line |
| total_abs_qty | DECIMAL(18,3) | No | 0 | Tổng abs(qtyDelta) |
| requested_by | UUID | No | - | Người yêu cầu |
| approved_by | UUID | Yes | - | Người duyệt |
| approved_at | TIMESTAMP | Yes | - | Thời điểm duyệt |
| posted_at | TIMESTAMP | Yes | - | Thời điểm post |
| reason_code | VARCHAR(50) | No | - | Mã lý do |
| remarks | TEXT | Yes | - | Ghi chú |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(source_type, status)`
- `(correlation_id)`

---

### 3.10 ic_adjustment_line

**Mô tả:** Line chi tiết điều chỉnh

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| adjustment_header_id | UUID | No | - | FK → ic_adjustment_header |
| line_no | INT | No | - | Số thứ tự line |
| item_id | UUID | No | - | FK → md_item |
| owner_id | UUID | No | - | FK → md_owner |
| warehouse_id | UUID | No | - | FK → md_warehouse |
| location_id | UUID | No | - | FK → md_location |
| inventory_status | VARCHAR(30) | No | - | Trạng thái inventory |
| qty_delta | DECIMAL(18,3) | No | - | Số lượng điều chỉnh (+/-) |
| uom | VARCHAR(20) | No | - | Đơn vị tính |
| reason_code | VARCHAR(50) | No | - | Mã lý do |
| posted_trans_id | VARCHAR(100) | Yes | - | Trans ID từ M3 |
| line_status | IcAdjustmentLineStatus | No | OPEN | Trạng thái line |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| updated_at | TIMESTAMP | No | - | - |

**Constraints:**
- UNIQUE `(adjustment_header_id, line_no)`

**Indexes:**
- `(item_id, owner_id, location_id, created_at DESC)`
- `(line_status)`

---

### 3.11 ic_reconciliation_review

**Mô tả:** Review sai lệch đối chiếu

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| reconciliation_review_number | VARCHAR(50) | No | - | Số review (unique) |
| warehouse_id | UUID | Yes | - | FK → md_warehouse |
| scope_type | IcReconciliationScopeType | No | - | WAREHOUSE/ITEM/OWNER/GLOBAL |
| source_run_id | VARCHAR(100) | Yes | - | ID run từ M3 |
| status | IcReconciliationStatus | No | OPEN | Trạng thái review |
| mismatch_count | INT | No | 0 | Số lượng mismatch |
| severity | IcReconciliationSeverity | No | - | LOW/MEDIUM/HIGH/CRITICAL |
| assigned_to | UUID | Yes | - | Người được giao |
| summary | TEXT | Yes | - | Tóm tắt |
| resolution_type | IcResolutionType | Yes | - | Loại resolution |
| resolution_ref | VARCHAR(100) | Yes | - | Link adjustment/ticket |
| external_id | VARCHAR(100) | No | - | Idempotency key (unique) |
| correlation_id | VARCHAR(50) | No | - | Trace ID |
| source_app | SourceApp | No | - | WEB/MOBILE/API |
| row_version | BIGINT | No | 0 | - |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | No | - | - |
| updated_at | TIMESTAMP | No | - | - |
| updated_by | UUID | Yes | - | - |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(severity, status)`
- `(assigned_to, status)`

---

### 3.12 ic_document_status_history

**Mô tả:** Lịch sử chuyển trạng thái document

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| entity_type | IcDocumentEntityType | No | - | MOVE/TRANSFER/... |
| entity_id | UUID | No | - | ID của document |
| old_status | VARCHAR(30) | Yes | - | Trạng thái cũ |
| new_status | VARCHAR(30) | No | - | Trạng thái mới |
| changed_by | UUID | No | - | Người thay đổi |
| changed_at | TIMESTAMP | No | now() | Thời điểm |
| reason_code | VARCHAR(50) | Yes | - | Mã lý do |
| notes | TEXT | Yes | - | Ghi chú |
| correlation_id | VARCHAR(50) | No | - | Trace ID |

**Indexes:**
- `(entity_type, entity_id, changed_at DESC)`
- `(changed_at DESC)`

---

### 3.13 ic_exception_log

**Mô tả:** Log exception nghiệp vụ

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| id | UUID | No | uuid() | Primary key |
| entity_type | IcDocumentEntityType | No | - | MOVE/TRANSFER/... |
| entity_id | UUID | No | - | ID của document |
| exception_type | IcExceptionType | No | - | RESERVED_STOCK/POST_FAIL/... |
| severity | ExceptionSeverity | No | - | LOW/MEDIUM/HIGH/CRITICAL |
| message | TEXT | No | - | Error message |
| payload_json | JSON | Yes | - | Chi tiết error |
| status | IcExceptionStatus | No | OPEN | OPEN/ACK/RESOLVED/IGNORED |
| created_at | TIMESTAMP | No | now() | - |
| created_by | UUID | Yes | - | - |
| resolved_at | TIMESTAMP | Yes | - | - |
| resolved_by | UUID | Yes | - | - |
| correlation_id | VARCHAR(50) | No | - | Trace ID |

**Indexes:**
- `(entity_type, entity_id, created_at DESC)`
- `(exception_type, status, created_at DESC)`

---

## 4. Foreign Key Dependencies

### Module 2 (Master Data)
- `ic_move_order.warehouse_id` → `md_warehouse.id`
- `ic_move_order_line.item_id` → `md_item.id`
- `ic_move_order_line.owner_id` → `md_owner.id`
- `ic_move_order_line.from_location_id` → `md_location.id`
- `ic_move_order_line.to_location_id` → `md_location.id`
- `ic_transfer_order.from_warehouse_id` → `md_warehouse.id`
- `ic_transfer_order.to_warehouse_id` → `md_warehouse.id`
- (tương tự cho các bảng khác...)

### Module 6 Internal
- `ic_move_order_line.move_order_id` → `ic_move_order.id`
- `ic_transfer_order_line.transfer_order_id` → `ic_transfer_order.id`
- `ic_cycle_count_header.cycle_count_plan_id` → `ic_cycle_count_plan.id`
- `ic_cycle_count_line.cycle_count_header_id` → `ic_cycle_count_header.id`
- `ic_adjustment_line.adjustment_header_id` → `ic_adjustment_header.id`

---

## 5. Migration Notes

```sql
-- Tạo migration cho Module 6
npx prisma migrate dev --name add_module6_inventory_control
```

Các bảng được tạo theo thứ tự:
1. Enums (IcMoveOrderStatus, IcTransferOrderStatus, ...)
2. Headers (ic_move_order, ic_transfer_order, ...)
3. Lines (ic_move_order_line, ic_transfer_order_line, ...)
4. Support tables (ic_document_status_history, ic_exception_log)
