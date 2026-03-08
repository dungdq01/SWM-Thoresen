# Module 5: Outbound Operations — Database Documentation

**Schema Location:** `prisma/schema.prisma`  
**Module:** Outbound Operations  
**Tables:** 10  
**Last Updated:** 2026-03-08  

---

## 1. Tổng quan

Module 5 sử dụng 10 bảng để quản lý luồng xuất hàng từ shipment đến posting inventory.

### Phân loại bảng:

| Group | Tables | Mục đích |
|-------|--------|----------|
| **Runtime** | `shipment_header`, `shipment_line`, `shipment_allocation_record` | Dữ liệu nghiệp vụ chính |
| **Weighing** | `shipment_weighing_attempt` | Log cân nặng |
| **Audit** | `shipment_status_history`, `shipment_exception_log`, `shipment_approval_decision` | Lịch sử và exceptions |
| **Control** | `shipment_pick_work_link`, `shipment_posting_link`, `shipment_so_link` | Liên kết với modules khác |

---

## 2. Enums

### ShipmentStatus
```prisma
enum ShipmentStatus {
  DRAFT
  CONFIRMED
  ALLOCATED
  PICKING
  PICKED
  WEIGHING_TARE
  LOADING
  ALL_WEIGHED
  PENDING_APPROVAL
  SHIPPED
  CLOSED
  CANCELLED
}
```

### ShipmentLineStatus
```prisma
enum ShipmentLineStatus {
  PENDING
  ALLOCATED
  PICKING
  PICKED
  LOADING
  WEIGHED_PASS
  WEIGHED_FAIL
  LINE_SHIPPED
  CANCELLED
}
```

### ShipmentSourceType
```prisma
enum ShipmentSourceType {
  SO                 -- Từ Sales Order
  DELIVERY_REQUEST   -- Từ yêu cầu giao hàng
  STANDALONE         -- Tạo độc lập
}
```

### AllocationStatus
```prisma
enum AllocationStatus {
  ALLOCATED   -- Đã phân bổ
  PICKED      -- Đã pick
  RELEASED    -- Đã giải phóng
  POSTED      -- Đã post inventory
  CANCELLED   -- Đã hủy
}
```

### WeighType / WeighSourceMode
```prisma
enum WeighType {
  TARE   -- Cân xe không
  GROSS  -- Cân xe có hàng
}

enum WeighSourceMode {
  SCALE_AGENT  -- Từ cân tự động
  MANUAL       -- Nhập tay
}
```

### ShipmentExceptionType / Status
```prisma
enum ShipmentExceptionType {
  ALLOCATION_FAIL
  TOLERANCE_FAIL
  SO_BLOCK
  DUPLICATE_WEIGHT
  POSTING_FAIL
  SHORT_PICK
  WORK_CREATE_FAIL
  INTEGRATION_FAIL
}

enum ShipmentExceptionStatus {
  OPEN
  RESOLVED
  REJECTED
}
```

### ApprovalDecisionType / Scope
```prisma
enum ApprovalDecisionType {
  APPROVE
  REJECT
  REWEIGH_REQUEST
}

enum ApprovalScope {
  LINE
  SHIPMENT
}
```

### WorkLinkType / Status
```prisma
enum WorkLinkType {
  PICK
  LOAD
}

enum WorkLinkStatus {
  REQUESTED
  CREATED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  FAILED
}
```

### PostingAction / Status
```prisma
enum PostingAction {
  POST
  REVERSE
}

enum PostingStatus {
  PENDING
  SUCCESS
  FAILED
}
```

---

## 3. Tables Detail

### 3.1 shipment_header

**Mục đích:** Header nghiệp vụ cho trip outbound

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_number` | VARCHAR(40) | Yes | Số shipment (auto-gen) |
| `so_id` | VARCHAR(50) | Yes | Sales Order ID |
| `source_type` | ENUM | No | Loại nguồn |
| `owner_id` | UUID | No | FK → md_owner |
| `customer_id` | UUID | Yes | Customer ID |
| `warehouse_id` | UUID | No | FK → md_warehouse |
| `vehicle_number` | VARCHAR(30) | No | Biển số xe |
| `vehicle_type_id` | UUID | Yes | FK → md_vehicle_type |
| `status` | ENUM | No | Trạng thái hiện tại |
| `tare_weight_kg` | DECIMAL(18,3) | Yes | Cân tare |
| `total_gross_kg` | DECIMAL(18,3) | Yes | Tổng gross |
| `total_net_kg` | DECIMAL(18,3) | Yes | Tổng net |
| `all_lines_passed` | BOOLEAN | No | Tất cả lines pass tolerance |
| `pending_approval_count` | INT | No | Số lines chờ approval |
| `is_dpm_shipment` | BOOLEAN | No | Có hàng DPM không |
| `cancel_reason_code` | VARCHAR(50) | Yes | Mã lý do hủy |
| `close_reason_code` | VARCHAR(50) | Yes | Mã lý do đóng |
| `shipped_at` | TIMESTAMP | Yes | Thời điểm ship |
| `closed_at` | TIMESTAMP | Yes | Thời điểm đóng |
| `external_id` | VARCHAR(120) | No | ID ngoài (idempotency) |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |
| `source_app` | ENUM | No | Nguồn ứng dụng |
| `row_version` | BIGINT | No | Optimistic locking |
| `created_at` | TIMESTAMP | No | Thời điểm tạo |
| `created_by` | UUID | Yes | Người tạo |
| `updated_at` | TIMESTAMP | No | Thời điểm cập nhật |
| `updated_by` | UUID | Yes | Người cập nhật |

**Indexes:**
- `(vehicle_number, status, created_at DESC)`
- `(so_id, status, created_at DESC)`
- `(owner_id, warehouse_id, status, created_at DESC)`
- `(status, created_at DESC)`
- `(correlation_id)`

**Unique Constraints:**
- `shipment_number`
- `external_id`

---

### 3.2 shipment_line

**Mục đích:** Dòng hàng trong shipment

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `line_number` | INT | No | Số thứ tự dòng |
| `so_line_id` | VARCHAR(50) | Yes | SO line reference |
| `item_id` | UUID | No | FK → md_item |
| `cargo_form` | ENUM | No | Hình thức hàng hóa |
| `uom_id` | UUID | No | FK → md_uom |
| `expected_qty` | DECIMAL(18,3) | No | SL yêu cầu |
| `expected_qty_kg` | DECIMAL(18,3) | No | SL yêu cầu (KG) |
| `allocated_qty` | DECIMAL(18,3) | No | SL đã allocate |
| `picked_qty` | DECIMAL(18,3) | No | SL đã pick |
| `loaded_qty` | DECIMAL(18,3) | No | SL đã load |
| `shipped_qty` | DECIMAL(18,3) | Yes | SL đã ship |
| `bag_count` | INT | Yes | Số bao (DPM) |
| `nominal_weight_per_bag` | DECIMAL(18,3) | Yes | Trọng lượng danh nghĩa/bao |
| `tolerance_pct_applied` | DECIMAL(8,4) | Yes | % tolerance áp dụng |
| `variance_pct` | DECIMAL(8,4) | Yes | % chênh lệch thực tế |
| `gross_weight_kg` | DECIMAL(18,3) | Yes | Cân gross |
| `net_weight_kg` | DECIMAL(18,3) | Yes | Cân net |
| `weigh_sequence_no` | INT | Yes | Thứ tự cân |
| `line_status` | ENUM | No | Trạng thái dòng |
| `posted_trans_id` | VARCHAR(40) | Yes | ID transaction đã post |
| `is_dpm_line` | BOOLEAN | No | Là line DPM |
| `dpm_nominal_qty_kg` | DECIMAL(18,3) | Yes | SL danh nghĩa DPM |

**Indexes:**
- `(item_id, cargo_form)`
- `(shipment_header_id, line_status)`
- `(so_line_id)`

**Unique Constraints:**
- `(shipment_header_id, line_number)`

---

### 3.3 shipment_allocation_record

**Mục đích:** Trace allocation từ stock source

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | No | FK → shipment_line |
| `location_id` | UUID | No | FK → md_location |
| `invent_dim_id` | UUID | No | FK → invent_dim |
| `item_id` | UUID | No | FK → md_item |
| `owner_id` | UUID | No | FK → md_owner |
| `allocated_qty` | DECIMAL(18,3) | No | SL đã allocate |
| `picked_qty` | DECIMAL(18,3) | No | SL đã pick |
| `released_qty` | DECIMAL(18,3) | No | SL đã release |
| `posted_qty` | DECIMAL(18,3) | No | SL đã post |
| `lot_date` | DATE | No | Ngày lot (FIFO) |
| `fifo_rank` | INT | Yes | Thứ tự FIFO |
| `status` | ENUM | No | Trạng thái allocation |
| `hold_ref` | VARCHAR(50) | Yes | Reference hold trong M3 |
| `external_id` | VARCHAR(120) | Yes | External ID |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_line_id, status)`
- `(shipment_header_id, status)`
- `(invent_dim_id, status)`
- `(item_id, owner_id, lot_date, status)`
- `(hold_ref)`

---

### 3.4 shipment_weighing_attempt

**Mục đích:** Log tare/gross/manual override

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | Yes | FK → shipment_line (null cho tare) |
| `weigh_type` | ENUM | No | TARE hoặc GROSS |
| `sequence_no` | INT | No | Số thứ tự cân |
| `source_mode` | ENUM | No | Nguồn dữ liệu cân |
| `raw_weight_kg` | DECIMAL(18,3) | No | Giá trị cân thô |
| `calculated_net_kg` | DECIMAL(18,3) | Yes | Net tính toán |
| `scale_ticket_no` | VARCHAR(80) | Yes | Số phiếu cân |
| `external_event_id` | VARCHAR(120) | Yes | Event ID ngoài |
| `captured_at` | TIMESTAMP | No | Thời điểm cân |
| `captured_by` | UUID | Yes | Người cân |
| `duplicate_of_attempt_id` | UUID | Yes | ID bản gốc nếu trùng |
| `is_valid` | BOOLEAN | No | Còn hiệu lực |
| `reason_code` | VARCHAR(50) | Yes | Mã lý do (manual) |
| `remark` | TEXT | Yes | Ghi chú |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_header_id, captured_at DESC)`
- `(shipment_line_id, captured_at DESC)`
- `(scale_ticket_no)`
- `(external_event_id)`

---

### 3.5 shipment_status_history

**Mục đích:** Lịch sử chuyển trạng thái

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | Yes | FK → shipment_line |
| `entity_level` | VARCHAR(10) | No | HEADER hoặc LINE |
| `from_status` | VARCHAR(30) | Yes | Trạng thái trước |
| `to_status` | VARCHAR(30) | No | Trạng thái sau |
| `trigger_action` | VARCHAR(50) | No | Action gây chuyển |
| `changed_by` | UUID | Yes | Người thay đổi |
| `changed_at` | TIMESTAMP | No | Thời điểm |
| `reason_code` | VARCHAR(50) | Yes | Mã lý do |
| `note` | TEXT | Yes | Ghi chú |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_header_id, changed_at DESC)`
- `(shipment_line_id, changed_at DESC)`
- `(to_status, changed_at DESC)`

---

### 3.6 shipment_exception_log

**Mục đích:** Log exception nghiệp vụ

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | Yes | FK → shipment_line |
| `exception_type` | ENUM | No | Loại exception |
| `exception_code` | VARCHAR(50) | No | Mã exception |
| `severity` | ENUM | No | Mức độ nghiêm trọng |
| `status` | ENUM | No | Trạng thái xử lý |
| `reason_code` | VARCHAR(50) | Yes | Mã lý do |
| `detail_json` | JSONB | Yes | Chi tiết |
| `created_at` | TIMESTAMP | No | Thời điểm tạo |
| `created_by` | UUID | Yes | Người tạo |
| `resolved_at` | TIMESTAMP | Yes | Thời điểm resolve |
| `resolved_by` | UUID | Yes | Người resolve |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_header_id, status, created_at DESC)`
- `(exception_type, status, created_at DESC)`

---

### 3.7 shipment_approval_decision

**Mục đích:** Quyết định approve/reject

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | Yes | FK → shipment_line |
| `decision_type` | ENUM | No | Loại quyết định |
| `approval_scope` | ENUM | No | LINE hoặc SHIPMENT |
| `reason_code` | VARCHAR(50) | No | Mã lý do |
| `note` | TEXT | Yes | Ghi chú |
| `decided_by` | UUID | No | Người quyết định |
| `decided_at` | TIMESTAMP | No | Thời điểm |
| `before_snapshot` | JSONB | Yes | Snapshot trước |
| `after_snapshot` | JSONB | Yes | Snapshot sau |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_header_id, decided_at DESC)`
- `(shipment_line_id, decided_at DESC)`

---

### 3.8 shipment_pick_work_link

**Mục đích:** Mapping với work từ Module 7

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | Yes | FK → shipment_line |
| `work_type` | ENUM | No | PICK hoặc LOAD |
| `work_header_id` | VARCHAR(50) | No | Work header ID |
| `work_line_id` | VARCHAR(50) | Yes | Work line ID |
| `status` | ENUM | No | Trạng thái link |
| `external_id` | VARCHAR(120) | No | External ID |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |
| `requested_at` | TIMESTAMP | No | Thời điểm yêu cầu |
| `completed_at` | TIMESTAMP | Yes | Thời điểm hoàn thành |
| `payload_json` | JSONB | Yes | Payload request |

**Indexes:**
- `(shipment_header_id, status)`
- `(shipment_line_id, work_type, status)`

**Unique Constraints:**
- `external_id`

---

### 3.9 shipment_posting_link

**Mục đích:** Mapping với posting sang Module 3

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `shipment_line_id` | UUID | No | FK → shipment_line |
| `posting_action` | ENUM | No | POST hoặc REVERSE |
| `m3_external_id` | VARCHAR(120) | No | External ID cho M3 |
| `m3_trans_id` | VARCHAR(40) | Yes | Trans ID từ M3 |
| `status` | ENUM | No | Trạng thái posting |
| `request_payload` | JSONB | Yes | Payload request |
| `response_payload` | JSONB | Yes | Payload response |
| `requested_at` | TIMESTAMP | No | Thời điểm request |
| `finished_at` | TIMESTAMP | Yes | Thời điểm hoàn thành |
| `correlation_id` | VARCHAR(120) | No | Correlation ID |

**Indexes:**
- `(shipment_header_id, status)`
- `(shipment_line_id, posting_action, status)`

**Unique Constraints:**
- `m3_external_id`

---

### 3.10 shipment_so_link

**Mục đích:** Link shipment với Sales Order

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `shipment_header_id` | UUID | No | FK → shipment_header |
| `so_id` | VARCHAR(50) | No | Sales Order ID |
| `so_line_id` | VARCHAR(50) | Yes | SO Line ID |
| `expected_qty_kg` | DECIMAL(18,3) | No | SL yêu cầu |
| `allocated_qty_kg` | DECIMAL(18,3) | No | SL đã allocate |
| `shipped_qty_kg` | DECIMAL(18,3) | No | SL đã ship |
| `is_reconciled` | BOOLEAN | No | Đã reconcile |
| `reconciled_at` | TIMESTAMP | Yes | Thời điểm reconcile |
| `created_at` | TIMESTAMP | No | Thời điểm tạo |
| `updated_at` | TIMESTAMP | No | Thời điểm cập nhật |

**Indexes:**
- `(so_id, so_line_id)`

**Unique Constraints:**
- `(shipment_header_id, so_id, so_line_id)`

---

## 4. Foreign Key Relationships

```
shipment_header
  ├── owner_id → md_owner.id
  ├── warehouse_id → md_warehouse.id
  └── vehicle_type_id → md_vehicle_type.id

shipment_line
  ├── shipment_header_id → shipment_header.id
  ├── item_id → md_item.id
  └── uom_id → md_uom.id

shipment_allocation_record
  ├── shipment_header_id → shipment_header.id
  ├── shipment_line_id → shipment_line.id
  ├── location_id → md_location.id
  ├── invent_dim_id → invent_dim.id
  ├── item_id → md_item.id
  └── owner_id → md_owner.id

shipment_weighing_attempt
  ├── shipment_header_id → shipment_header.id
  └── shipment_line_id → shipment_line.id

shipment_status_history
  └── shipment_header_id → shipment_header.id

shipment_exception_log
  └── shipment_header_id → shipment_header.id

shipment_approval_decision
  ├── shipment_header_id → shipment_header.id
  └── shipment_line_id → shipment_line.id

shipment_pick_work_link
  ├── shipment_header_id → shipment_header.id
  └── shipment_line_id → shipment_line.id

shipment_posting_link
  ├── shipment_header_id → shipment_header.id
  └── shipment_line_id → shipment_line.id

shipment_so_link
  └── shipment_header_id → shipment_header.id
```

---

## 5. Migration Notes

### Thứ tự tạo bảng:
1. Tạo enums
2. `shipment_header`
3. `shipment_line`
4. `shipment_allocation_record`
5. `shipment_weighing_attempt`
6. `shipment_status_history`
7. `shipment_exception_log`
8. `shipment_approval_decision`
9. `shipment_pick_work_link`
10. `shipment_posting_link`
11. `shipment_so_link`

### Seed data cần chuẩn bị:
- Không có seed data bắt buộc cho Module 5
- Test data có thể tạo qua API

---

## 6. Performance Considerations

### Indexes đã tối ưu cho:
- Query theo vehicle_number + status
- Query theo SO ID
- Query theo owner + warehouse
- Query allocation theo lot_date (FIFO)
- Query exceptions theo type + status

### Partitioning (future):
- `shipment_status_history` có thể partition theo tháng
- `shipment_weighing_attempt` có thể partition theo tháng

---

## 7. Tolerance Lookup Priority

Module 5 sử dụng 4-level cascade để lookup tolerance percentage:

| Priority | Source | Field | Description |
|----------|--------|-------|-------------|
| 1 | `md_owner_item_policy` | `tolerance_pct` | Owner+Item specific |
| 2 | `md_item` | `tolerance_pct` | Item default |
| 3 | `md_owner` | `default_tolerance_pct` | Owner default |
| 4 | ENV | `OUTBOUND_TOLERANCE_PCT` | System default (2%) |

**Query logic:**
```typescript
// Level 1: OwnerItemPolicy
const policy = await prisma.mdOwnerItemPolicy.findFirst({
  where: { ownerId, itemId, isActive: true },
});
if (policy?.tolerancePct != null) return policy.tolerancePct;

// Level 2: Item
const item = await prisma.mdItem.findUnique({ where: { id: itemId } });
if (item?.tolerancePct != null) return item.tolerancePct;

// Level 3: Owner
const owner = await prisma.mdOwner.findUnique({ where: { id: ownerId } });
if (owner?.defaultTolerancePct != null) return owner.defaultTolerancePct;

// Level 4: ENV default
return parseFloat(process.env.OUTBOUND_TOLERANCE_PCT || '2.0');
```
