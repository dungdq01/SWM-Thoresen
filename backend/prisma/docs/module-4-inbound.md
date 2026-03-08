# Module 4: Inbound Operations — Database Documentation

> **Module:** M4 - Inbound Operations  
> **Database:** PostgreSQL  
> **ORM:** Prisma

---

## 1. Tổng quan

Module 4 sử dụng 6 bảng chính để quản lý lifecycle của Receipt:

| Table | Mục đích | Record Type |
|-------|----------|-------------|
| `receipt_header` | Header phiếu nhận hàng | Runtime |
| `receipt_line` | Dòng hàng trong receipt | Runtime |
| `receipt_weighing_log` | Log cân weigh-in/weigh-out | Audit/Log |
| `receipt_status_history` | Lịch sử chuyển trạng thái | Audit/Log |
| `receipt_exception_log` | Log exception nghiệp vụ | Audit/Log |
| `receipt_integration_state` | Trạng thái sync với M3/M7/M10 | Control |

---

## 2. Enums

### 2.1 ReceiptType
```
STANDARD  - Nhập hàng thông thường (xe tải)
VESSEL    - Nhập hàng từ tàu (có B/L)
```

### 2.2 ReceiptStatus
```
DRAFT             - Vừa tạo, chưa confirm
AWAITING_WEIGHING - Đang chờ cân gross
WEIGHED_IN        - Đã cân gross
PROCESSING        - Đang dỡ hàng
WEIGHED_OUT       - Đã cân tare (transient)
RECEIVED          - Tolerance pass, đã accept
PUTAWAY           - Putaway completed
CLOSED            - Terminal - đã đóng
REJECTED          - Tolerance fail
CANCELLED         - Terminal - đã hủy
```

### 2.3 ReceiptLineStatus
```
OPEN      - Chưa nhận
RECEIVED  - Đã nhận
CANCELLED - Đã hủy
```

### 2.4 WeighPhase
```
IN  - Weigh-in (gross)
OUT - Weigh-out (tare)
```

### 2.5 IntegrationDeliveryStatus
```
PENDING     - Chờ gửi
PROCESSING  - Đang gửi
SUCCEEDED   - Thành công
FAILED      - Thất bại
DEAD_LETTER - Đã hết retry
```

---

## 3. Chi tiết bảng

### 3.1 `receipt_header`

**Mục đích:** Lưu thông tin header của phiếu nhận hàng

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_number` | VARCHAR(40) | YES | Số phiếu (sinh khi confirm) |
| `receipt_type` | ENUM | NO | STANDARD / VESSEL |
| `po_id` | VARCHAR(50) | NO | Mã PO tham chiếu |
| `asn_id` | VARCHAR(50) | YES | Mã ASN nếu có |
| `owner_id` | UUID | NO | FK → md_owner |
| `vendor_id` | UUID | NO | FK → md_vendor |
| `warehouse_id` | UUID | NO | FK → md_warehouse |
| `receiving_location_id` | UUID | NO | FK → md_location |
| `vehicle_number` | VARCHAR(30) | NO | Biển số xe |
| `bl_number` | VARCHAR(50) | YES | Số B/L (vessel) |
| `expected_qty` | DECIMAL(18,3) | NO | Số lượng kỳ vọng |
| `gross_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng gross |
| `tare_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng tare |
| `net_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng net |
| `status` | ENUM | NO | Trạng thái hiện tại |
| `attempt_number` | INT | NO | Số lần cân (default 1) |
| `tolerance_pct_applied` | DECIMAL(8,4) | YES | Tolerance đã áp dụng |
| `variance_pct` | DECIMAL(8,4) | YES | Variance tính được |
| `is_manual_entry` | BOOLEAN | NO | Có nhập tay không |
| `manual_entry_reason_code` | VARCHAR(50) | YES | Reason code nhập tay |
| `posted_trans_id` | VARCHAR(40) | YES | Trans ID từ M3 |
| `putaway_work_id` | VARCHAR(50) | YES | Work ID từ M7 |
| `cancel_reason_code` | VARCHAR(50) | YES | Reason code cancel |
| `cancelled_by` | UUID | YES | Người cancel |
| `cancelled_at` | TIMESTAMP | YES | Thời gian cancel |
| `external_id` | VARCHAR(120) | NO | Idempotency key |
| `correlation_id` | VARCHAR(120) | NO | Trace ID |
| `source_app` | ENUM | NO | WEB/MOBILE/API/... |
| `row_version` | BIGINT | NO | Optimistic lock |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `created_by` | UUID | YES | Người tạo |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |
| `updated_by` | UUID | YES | Người cập nhật |

**Indexes:**
- `UNIQUE(receipt_number)`
- `UNIQUE(external_id)`
- `INDEX(vehicle_number, status, created_at DESC)`
- `INDEX(bl_number, status, created_at DESC)`
- `INDEX(owner_id, warehouse_id, status, created_at DESC)`
- `INDEX(po_id, asn_id)`
- `INDEX(status, created_at DESC)`
- `INDEX(correlation_id)`

**Relations:**
- `owner` → `md_owner`
- `vendor` → `md_vendor`
- `warehouse` → `md_warehouse`
- `receiving_location` → `md_location`

---

### 3.2 `receipt_line`

**Mục đích:** Lưu các dòng hàng trong receipt

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_header_id` | UUID | NO | FK → receipt_header |
| `line_number` | INT | NO | Số thứ tự dòng |
| `item_id` | UUID | NO | FK → md_item |
| `uom_id` | UUID | NO | FK → md_uom |
| `expected_qty` | DECIMAL(18,3) | NO | Số lượng kỳ vọng |
| `received_qty` | DECIMAL(18,3) | YES | Số lượng thực nhận |
| `bag_count` | INT | YES | Số bao (bagged) |
| `nominal_weight_per_bag` | DECIMAL(18,3) | YES | Trọng lượng/bao |
| `cargo_form` | ENUM | NO | BULK/BAGGED_XX/... |
| `status` | ENUM | NO | OPEN/RECEIVED/CANCELLED |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `created_by` | UUID | YES | Người tạo |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |
| `updated_by` | UUID | YES | Người cập nhật |

**Indexes:**
- `UNIQUE(receipt_header_id, line_number)`
- `INDEX(item_id, cargo_form)`
- `INDEX(receipt_header_id, status)`

---

### 3.3 `receipt_weighing_log`

**Mục đích:** Lưu lịch sử cân (weigh-in/weigh-out), hỗ trợ audit và dispute

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_header_id` | UUID | NO | FK → receipt_header |
| `attempt_number` | INT | NO | Số lần cân |
| `weigh_phase` | ENUM | NO | IN / OUT |
| `ticket_id` | VARCHAR(80) | YES | Ticket từ weighbridge |
| `event_id` | VARCHAR(120) | YES | Event ID (dedupe key) |
| `gross_weight_kg` | DECIMAL(18,3) | YES | Gross weight (phase=IN) |
| `tare_weight_kg` | DECIMAL(18,3) | YES | Tare weight (phase=OUT) |
| `net_weight_kg` | DECIMAL(18,3) | YES | Net weight snapshot |
| `is_manual` | BOOLEAN | NO | Có nhập tay không |
| `manual_reason_code` | VARCHAR(50) | YES | Reason code nhập tay |
| `source_app` | ENUM | NO | Nguồn gửi event |
| `event_timestamp` | TIMESTAMP | NO | Thời gian event |
| `received_at` | TIMESTAMP | NO | Thời gian nhận |
| `raw_payload` | JSONB | YES | Payload gốc (forensic) |
| `created_by` | UUID | YES | Người tạo |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |

**Indexes:**
- `UNIQUE(event_id)` WHERE event_id IS NOT NULL
- `INDEX(receipt_header_id, attempt_number, weigh_phase)`
- `INDEX(ticket_id, weigh_phase)`
- `INDEX(event_timestamp DESC)`

**Ghi chú:**
- Bảng này rất quan trọng cho dispute và duplicate prevention
- `raw_payload` nên được giữ có kiểm soát, tránh PII không cần thiết

---

### 3.4 `receipt_status_history`

**Mục đích:** Append-only history cho mọi transition state

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_header_id` | UUID | NO | FK → receipt_header |
| `from_status` | VARCHAR(30) | YES | Trạng thái trước |
| `to_status` | VARCHAR(30) | NO | Trạng thái sau |
| `transition_code` | VARCHAR(30) | NO | Mã action (confirm, weighIn, ...) |
| `triggered_by` | UUID | YES | Người thực hiện |
| `trigger_role` | VARCHAR(50) | YES | Role người thực hiện |
| `reason_code` | VARCHAR(50) | YES | Reason code nếu có |
| `note` | TEXT | YES | Ghi chú |
| `correlation_id` | VARCHAR(120) | NO | Trace ID |
| `occurred_at` | TIMESTAMP | NO | Thời gian xảy ra |
| `metadata` | JSONB | YES | Dữ liệu bổ sung |

**Indexes:**
- `INDEX(receipt_header_id, occurred_at DESC)`
- `INDEX(to_status, occurred_at DESC)`

---

### 3.5 `receipt_exception_log`

**Mục đích:** Ghi lỗi/ngoại lệ nghiệp vụ và kỹ thuật

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_header_id` | UUID | YES | FK → receipt_header |
| `exception_type` | VARCHAR(50) | NO | Loại exception |
| `severity` | ENUM | NO | LOW/MEDIUM/HIGH/CRITICAL |
| `stage` | VARCHAR(30) | NO | Giai đoạn xảy ra |
| `reason_code` | VARCHAR(50) | YES | Reason code |
| `message` | TEXT | NO | Thông báo lỗi |
| `details` | JSONB | YES | Chi tiết lỗi |
| `integration_target` | VARCHAR(30) | YES | M3/M7/M10 nếu integration |
| `external_id` | VARCHAR(120) | YES | External ID liên quan |
| `correlation_id` | VARCHAR(120) | NO | Trace ID |
| `occurred_by` | UUID | YES | Người gây ra |
| `occurred_at` | TIMESTAMP | NO | Thời gian xảy ra |
| `is_resolved` | BOOLEAN | NO | Đã resolve chưa |
| `resolved_at` | TIMESTAMP | YES | Thời gian resolve |
| `resolved_by` | UUID | YES | Người resolve |

**Indexes:**
- `INDEX(receipt_header_id, occurred_at DESC)`
- `INDEX(exception_type, severity, occurred_at DESC)`
- `INDEX(integration_target, is_resolved)`

---

### 3.6 `receipt_integration_state`

**Mục đích:** Tách trạng thái delivery integration khỏi business state

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `receipt_header_id` | UUID | NO | FK → receipt_header |
| `target_module` | VARCHAR(20) | NO | M3/M7/M10 |
| `action_code` | VARCHAR(40) | NO | PostInbound/CreateWork/... |
| `delivery_status` | ENUM | NO | PENDING/PROCESSING/... |
| `attempt_count` | INT | NO | Số lần retry |
| `last_request_payload` | JSONB | YES | Request cuối |
| `last_response_payload` | JSONB | YES | Response cuối |
| `last_error_code` | VARCHAR(50) | YES | Error code cuối |
| `last_error_message` | TEXT | YES | Error message cuối |
| `next_retry_at` | TIMESTAMP | YES | Thời gian retry tiếp |
| `last_attempt_at` | TIMESTAMP | YES | Thời gian attempt cuối |
| `completed_at` | TIMESTAMP | YES | Thời gian hoàn thành |
| `correlation_id` | VARCHAR(120) | NO | Trace ID |
| `external_id` | VARCHAR(120) | NO | Idempotency key |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |

**Indexes:**
- `UNIQUE(receipt_header_id, target_module, action_code)`
- `INDEX(delivery_status, next_retry_at)`

**Ghi chú:**
- Không dùng trường này để suy ra business state
- Dùng cho retry job và support investigation

---

## 4. Quan hệ dữ liệu

```
receipt_header 1───N receipt_line
receipt_header 1───N receipt_weighing_log
receipt_header 1───N receipt_status_history
receipt_header 1───N receipt_exception_log
receipt_header 1───N receipt_integration_state
receipt_header N───1 md_owner
receipt_header N───1 md_vendor
receipt_header N───1 md_warehouse
receipt_header N───1 md_location
receipt_line   N───1 md_item
receipt_line   N───1 md_uom
```

---

## 5. Migration Notes

### 5.1 Dependencies
- Cần có sẵn: `md_owner`, `md_vendor`, `md_warehouse`, `md_location`, `md_item`, `md_uom`
- Enums: `SourceApp`, `ExceptionSeverity`, `CargoForm` (từ Module 2)

### 5.2 New Enums
- `ReceiptType`
- `ReceiptStatus`
- `ReceiptLineStatus`
- `WeighPhase`
- `IntegrationDeliveryStatus`

### 5.3 Partition Strategy (Future)
Khi volume tăng, cân nhắc partition theo tháng:
- `receipt_status_history`
- `receipt_exception_log`
- `receipt_weighing_log`
