# Module 4: Inbound Operations — Database Documentation

> **Module:** M4 - Inbound Operations  
> **Database:** PostgreSQL  
> **ORM:** Prisma  
> **Last Updated:** 2026-03-25 (Receipt status refactor + Unloading: locationId + unloadSequenceNo)

---

## 1. Tổng quan

Module 4 sử dụng 10 bảng chính để quản lý lifecycle của Purchase Order, Receipt và Inbound Documents:

| Table | Mục đích | Record Type |
|-------|----------|-------------|
| `purchase_orders` | Header Purchase Order | Runtime |
| `purchase_order_lines` | Dòng hàng trong PO | Runtime |
| `purchase_order_warehouses` | Many-to-many PO ↔ Warehouse (NEW 2026-03-17) | Runtime |
| `receipt_header` | Header phiếu nhận hàng | Runtime |
| `receipt_line` | Dòng hàng trong receipt | Runtime |
| `inbound_document` | Chứng từ nhập kho | Runtime |
| `receipt_weighing_log` | Log cân weigh-in/weigh-out | Audit/Log |
| `receipt_status_history` | Lịch sử chuyển trạng thái | Audit/Log |
| `receipt_exception_log` | Log exception nghiệp vụ | Audit/Log |
| `receipt_integration_state` | Trạng thái sync với M3/M7/M10 | Control |

---

## 2. Enums

### 2.0 PurchaseOrderType (NEW - 2026-03-15)
```
SEA   - Nhập đường thủy (có thông tin tàu, B/L)
LAND  - Nhập đường bộ
```

### 2.0.1 PurchaseOrderStatus
```
NEW        - Tạo mới, chưa confirm (có thể unconfirm từ CONFIRMED về đây)
CONFIRMED  - Đã xác nhận, có thể tạo Receipt
CLOSED     - Đã đóng (terminal)
CANCELLED  - Đã hủy (terminal)
```

**PO Transitions:**
- `NEW` → `CONFIRMED` (confirm)
- `CONFIRMED` → `NEW` (unconfirm - chỉ khi chưa có receipt)
- `CONFIRMED` → `CLOSED` (close)
- `NEW` / `CONFIRMED` → `CANCELLED` (cancel)

### 2.0.2 PurchaseOrderLineStatus
```
OPEN      - Chưa nhận
PARTIAL   - Đã nhận một phần
RECEIVED  - Đã nhận đủ
CANCELLED - Đã hủy
```

### 2.1 ReceiptType
```
STANDARD  - Nhập hàng thông thường (xe tải)
VESSEL    - Nhập hàng từ tàu (có B/L)
```

### 2.2 ReceiptStatus (Refactored 2026-03-25)
```
NEW               - Tạo mới, chưa confirm
CONFIRMED         - Đã xác nhận, chờ tạo phiếu cân
AWAITING_WEIGHING - Đã tạo phiếu cân, chờ xác nhận phiếu cân
WEIGHING_1        - Phiếu cân đã xác nhận / đang cân lần 1
UNLOADING         - Đang dỡ hàng (sau cân gross, chưa dỡ xong)
UNLOADED          - Đã dỡ hàng xong, chờ cân lần 2 (tare)
WEIGHING_2        - Đang cân lần 2 (transient)
COMPLETED         - Hoàn thành (tolerance pass, inventory posted)
CLOSED            - Terminal - đã đóng
REJECTED          - Tolerance fail (reweigh → CONFIRMED)
CANCELLED         - Terminal - đã hủy
ERROR             - Lỗi nghiệp vụ
```

**State Transitions:**
```
NEW ──confirm──> CONFIRMED ──tạo phiếu cân──> AWAITING_WEIGHING
  ──xác nhận phiếu cân──> WEIGHING_1 ──ghi gross──> UNLOADING/UNLOADED
  ──hoàn thành dỡ──> UNLOADED ──ghi tare──> WEIGHING_2 ──auto_accept──> COMPLETED
CONFIRMED/AWAITING_WEIGHING/WEIGHING_1/UNLOADING → CANCELLED (cancel)
REJECTED ──reweigh──> CONFIRMED
COMPLETED ──close──> CLOSED
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

### 2.6 InboundDocumentType (NEW - 2026-03-16)
```
BILL_OF_LADING       - Vận đơn (B/L)
PACKING_LIST         - Phiếu đóng gói
COMMERCIAL_INVOICE   - Hóa đơn thương mại
CERTIFICATE_OF_ORIGIN - Giấy chứng nhận xuất xứ
QUALITY_CERTIFICATE  - Chứng nhận chất lượng
WEIGHT_CERTIFICATE   - Phiếu cân
OTHER                - Khác
```

### 2.7 InboundDocumentStatus (NEW - 2026-03-16)
```
DRAFT   - Chờ scan (mặc định khi upload)
SCANNED - Đã scan (xác nhận OK)
ERROR   - Lỗi (có vấn đề cần xử lý)
```

**State Transitions:**
```
DRAFT ──xác nhận──> SCANNED
DRAFT ──báo lỗi──> ERROR
DRAFT ──xóa──> (deleted)
```

---

## 3. Chi tiết bảng

### 3.0 `purchase_orders` (NEW - 2026-03-15)

**Mục đích:** Lưu thông tin header của Purchase Order

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `po_number` | VARCHAR(40) | NO | Số PO (unique, auto-gen) |
| `po_type` | ENUM | NO | `SEA` (đường thủy) / `LAND` (đường bộ). Default: `SEA` |
| `status` | ENUM | NO | NEW / CONFIRMED / CLOSED / CANCELLED |
| `owner_id` | UUID | NO | FK → md_owner (Chủ hàng) |
| `vendor_id` | UUID | NO | FK → md_vendor (Nhà vận tải) |
| `warehouse_id` | UUID | NO | FK → md_warehouse (Kho phân phối) |
| `vessel_name` | VARCHAR(200) | YES | Tên tàu / Nguồn gốc (chỉ dùng khi `po_type=SEA`) |
| `origin` | VARCHAR(200) | YES | Nguồn gốc hàng hóa (chỉ dùng khi `po_type=SEA`) |
| `bl_number` | VARCHAR(100) | YES | Số Bill of Lading (chỉ dùng khi `po_type=SEA`) |
| `notes` | TEXT | YES | Ghi chú |
| `total_expected_qty` | DECIMAL(18,3) | NO | Tổng số lượng dự kiến (quy đổi sang KG) |
| `total_received_qty` | DECIMAL(18,3) | NO | Tổng số lượng đã nhận |
| `cancel_reason_code` | VARCHAR(50) | YES | Reason code khi cancel |
| `row_version` | BIGINT | NO | Optimistic lock |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `created_by` | UUID | YES | Người tạo |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |
| `updated_by` | UUID | YES | Người cập nhật |

**Indexes:**
- `UNIQUE(po_number)`
- `INDEX(status, created_at DESC)`
- `INDEX(owner_id, vendor_id, status)`
- `INDEX(po_number)`
- `INDEX(po_type, status)` - Filter theo loại PO

**Relations:**
- `owner` → `md_owner`
- `vendor` → `md_vendor`
- `warehouse` → `md_warehouse`
- `lines` → `purchase_order_lines[]`

**Ghi chú:**
- Khi `po_type = SEA`: Các trường `vessel_name`, `origin`, `bl_number` được sử dụng
- Khi `po_type = LAND`: Các trường trên có thể để trống
- `total_expected_qty` được tự động quy đổi sang KG dựa trên `md_uom_conversion`
- `warehouse_id` giữ lại cho backward compatibility, nhưng khuyến khích dùng `purchase_order_warehouses`

---

### 3.0.1 `purchase_order_warehouses` (NEW - 2026-03-17)

**Mục đích:** Junction table cho quan hệ many-to-many giữa PO và Warehouse

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `po_id` | UUID | NO | FK → purchase_orders |
| `warehouse_id` | UUID | NO | FK → md_warehouse |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |

**Indexes:**
- `UNIQUE(po_id, warehouse_id)` - Tránh duplicate
- `INDEX(warehouse_id)` - Query PO theo warehouse

**Relations:**
- `purchaseOrder` → `purchase_orders`
- `warehouse` → `md_warehouse`

**Ghi chú:**
- Cho phép 1 PO gắn với nhiều kho (multi-warehouse support)
- Khi tạo Receipt từ PO, dropdown kho chỉ hiển thị các kho đã chọn trong PO

---

### 3.0.2 `purchase_order_lines` (NEW - 2026-03-15)

**Mục đích:** Lưu các dòng hàng trong Purchase Order

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `po_id` | UUID | NO | FK → purchase_orders |
| `line_number` | INT | NO | Số thứ tự dòng |
| `item_id` | UUID | NO | FK → md_item (Mặt hàng) |
| `uom_id` | UUID | YES | FK → md_uom (Đơn vị tính) - Optional |
| `expected_qty` | DECIMAL(18,3) | NO | Số lượng dự kiến |
| `received_qty` | DECIMAL(18,3) | NO | Số lượng đã nhận (default 0) |
| `notes` | TEXT | YES | Ghi chú dòng |
| `status` | ENUM | NO | OPEN / PARTIAL / RECEIVED / CANCELLED |

**Indexes:**
- `UNIQUE(po_id, line_number)`

**Relations:**
- `po` → `purchase_orders`
- `item` → `md_item`
- `uom` → `md_uom` (optional)

**Ghi chú:**
- `uom_id` là optional, cho phép không chọn đơn vị tính khi tạo line
- `status` tự động cập nhật dựa trên `received_qty` so với `expected_qty`
- Khi tạo/cập nhật PO, `expected_qty` của mỗi line sẽ được quy đổi sang KG để tính `total_expected_qty`

---

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
| `vehicle_number` | VARCHAR(30) | NO | Biển số xe |
| `bl_number` | VARCHAR(50) | YES | Số B/L (vessel) |
| `expected_qty` | DECIMAL(18,3) | NO | Số lượng kỳ vọng |
| `gross_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng gross |
| `tare_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng tare |
| `net_weight_kg` | DECIMAL(18,3) | YES | Trọng lượng net |
| `notes` | VARCHAR(500) | YES | Ghi chú phiếu nhập |
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
| `notes` | VARCHAR(500) | YES | Ghi chú dòng hàng |
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

### 3.3 `inbound_document` (NEW - 2026-03-16)

**Mục đích:** Lưu thông tin chứng từ nhập kho (B/L, phiếu đóng gói, hóa đơn, ...)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `document_code` | VARCHAR(50) | NO | Mã chứng từ tự sinh (DOCyyyyMMddxxxx) |
| `receipt_header_id` | UUID | YES | FK → receipt_header (liên kết ASN) |
| `doc_type` | ENUM | NO | Loại chứng từ (InboundDocumentType) |
| `owner_id` | UUID | YES | FK → md_owner |
| `vehicle_number` | VARCHAR(30) | YES | Biển số xe |
| `file_name` | VARCHAR(255) | NO | Tên file gốc |
| `file_path` | VARCHAR(500) | NO | Đường dẫn lưu file |
| `file_size` | INT | NO | Kích thước file (bytes) |
| `mime_type` | VARCHAR(100) | NO | MIME type của file |
| `notes` | VARCHAR(500) | YES | Ghi chú |
| `status` | ENUM | NO | Trạng thái: DRAFT, SCANNED, ERROR |
| `uploaded_at` | TIMESTAMP | NO | Thời gian upload |
| `uploaded_by` | UUID | YES | Người upload |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |

**Indexes:**
- `UNIQUE(document_code)`
- `INDEX(receipt_header_id)`
- `INDEX(owner_id, doc_type)`
- `INDEX(status, uploaded_at DESC)`

**Relations:**
- `receiptHeader` → `receipt_header` (optional)
- `owner` → `md_owner` (optional)

**Storage Path:** `backend/uploads/inbound-documents/`

**Allowed File Types:** PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)

---

### 3.4 `receipt_weighing_log`

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
# Purchase Order Relations
purchase_orders      1───N purchase_order_lines
purchase_orders      N───1 md_owner
purchase_orders      N───1 md_vendor
purchase_orders      N───1 md_warehouse
purchase_order_lines N───1 md_item
purchase_order_lines N───1 md_uom (optional)

# Receipt Relations
receipt_header 1───N receipt_line
receipt_header 1───N receipt_weighing_log
receipt_header 1───N receipt_status_history
receipt_header 1───N receipt_exception_log
receipt_header 1───N receipt_integration_state
receipt_header 1───N inbound_document
receipt_header N───1 md_owner
receipt_header N───1 md_vendor
receipt_header N───1 md_warehouse
receipt_line   N───1 md_item
receipt_line   N───1 md_uom

# Inbound Document Relations
inbound_document N───1 receipt_header (optional)
inbound_document N───1 md_owner (optional)
```

---

## 5. Migration Notes

### 5.1 Dependencies
- Cần có sẵn: `md_owner`, `md_vendor`, `md_warehouse`, `md_location`, `md_item`, `md_uom`
- Enums: `SourceApp`, `ExceptionSeverity`, `CargoForm` (từ Module 2)

### 5.2 New Enums
- `PurchaseOrderType` (NEW - 2026-03-15)
- `PurchaseOrderStatus`
- `PurchaseOrderLineStatus`
- `ReceiptType`
- `ReceiptStatus`
- `ReceiptLineStatus`
- `WeighPhase`
- `IntegrationDeliveryStatus`
- `InboundDocumentType` (NEW - 2026-03-16)
- `InboundDocumentStatus` (NEW - 2026-03-16): DRAFT, SCANNED, ERROR

### 5.4 Migration: PO Schema Update (2026-03-15)

**New Tables:**
- `purchase_orders` - Header PO với `po_type` (SEA/LAND)
- `purchase_order_lines` - Dòng hàng PO

**Status Change:**
- `DRAFT` → `NEW` (Tạo mới)

**UOM Conversion Logic:**
- Khi tạo/cập nhật PO, hệ thống tự động quy đổi số lượng từ các ĐVT bao (BAG25, BAG40, BAG50, JUMBO) sang KG
- Sử dụng bảng `md_uom_conversion` để lấy hệ số quy đổi
- `total_expected_qty` luôn được tính theo KG

**Ví dụ quy đổi:**
| Line | ĐVT | SL dự kiến | Hệ số | Quy đổi KG |
|------|-----|------------|-------|------------|
| 1 | BAG50 | 100 | 50 | 5,000 kg |
| 2 | KG | 2,000 | 1 | 2,000 kg |
| **Tổng** | | | | **7,000 kg** |

**Schema Changes:**
```sql
-- Add new enum
CREATE TYPE "PurchaseOrderType" AS ENUM ('SEA', 'LAND');

-- Add new column to purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "po_type" "PurchaseOrderType" NOT NULL DEFAULT 'SEA';
ALTER TABLE "purchase_orders" ADD COLUMN "vessel_name" VARCHAR(200);
ALTER TABLE "purchase_orders" ADD COLUMN "origin" VARCHAR(200);
ALTER TABLE "purchase_orders" ADD COLUMN "bl_number" VARCHAR(100);

-- Remove deprecated columns
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "external_po_number";
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "expected_delivery_date";
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "currency";

-- Make uom_id optional in purchase_order_lines
ALTER TABLE "purchase_order_lines" ALTER COLUMN "uom_id" DROP NOT NULL;

-- Remove unit_price from purchase_order_lines
ALTER TABLE "purchase_order_lines" DROP COLUMN IF EXISTS "unit_price";

-- Add new index
CREATE INDEX "purchase_orders_po_type_status_idx" ON "purchase_orders"("po_type", "status");
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_po_type_vessel_fields
```

### 5.3 Partition Strategy (Future)
Khi volume tăng, cân nhắc partition theo tháng:
- `receipt_status_history`
- `receipt_exception_log`
- `receipt_weighing_log`

---

## 6. Feedback Fixes Applied

### 6.1 Concurrency & Transaction Safety

| Issue | Description | Fix | Impact |
|-------|-------------|-----|--------|
| CR-2 | createReceipt race condition | Wrap trong `$transaction` | Data integrity |
| HI-3 | Receipt number race | `pg_advisory_xact_lock` | Unique numbers |
| HI-4 | Concurrent updates | `SELECT FOR UPDATE` | Prevent lost updates |

### 6.2 Business Logic Fixes

| Issue | Description | Fix | Impact |
|-------|-------------|-----|--------|
| HI-1 | BaggedPolicy dead code | Enable `overReceiptBlocked` | Over-receipt prevention |
| HI-6 | Multi-line assumption | Guard `lines.length > 1` | Explicit constraint |

### 6.3 M3 Integration (✅ Fixed v3)

| Issue | Description                   | Fix                                  | Status  |
| -------| -------------------------------| --------------------------------------| ---------|
| CR-1  | M3 PostingEngine              | `postInventory()` called at RECEIVED | ✅ Fixed |
| HI-1  | BaggedPolicy expectedBagCount | Calculate from lineData              | ✅ Fixed |

**Data Flow (CR-1):**
- Receipt RECEIVED → `postInventory()` → `InventTrans` created → `OnHand` updated
- `postedTransId` field populated with M3 transId

### 6.4 Pending (Module Dependencies)

| Issue | Description | Dependency |
|-------|-------------|------------|
| HI-2 | Putaway workflow | M7 Work ready |
| HI-5 | AuditLog integration | M1 LogService ready |

---

## 7. Schema Changes — Unloading (2026-03-25)

### 7.1 `receipt_line` — New Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `location_id` | UUID | YES | FK → `md_location` — vị trí dỡ hàng (set khi unload item) |
| `unload_sequence_no` | INT | YES | Thứ tự dỡ hàng |

**New Relation:**
```prisma
location MdLocation? @relation(fields: [locationId], references: [id])
```

**New Index:**
```prisma
@@index([locationId])
```

**Ghi chú:**
- `location_id` nullable — chỉ được set khi dỡ hàng (bước 7)
- Ghi nhận vị trí thực tế dỡ hàng vào kho
- Dùng cho `dimTo.locationCode` khi post `GOODS_RECEIVED` inventory transaction
- Tương tự `shipment_line.location_id` cho outbound

### 7.2 `md_location` — New Relation

```prisma
receiptLines ReceiptLine[]
```

### 7.3 Inventory Integration

Sau cân lần 2 (WEIGH_IN), `weighbridge-log.service.ts` tự động:
1. Update `receipt_line.received_qty` = net weight (proportional split)
2. Update `receipt_line.net_weight_kg` = net weight
3. Update `receipt_header`: `gross_weight_kg`, `tare_weight_kg`, `net_weight_kg`
4. Post `GOODS_RECEIVED` → `invent_trans` (RECEIPT/RECEIVED) → `on_hand.physical_qty` **tăng**

### 7.4 On-Hand Enhancement

Cột **"Đã nhập"** trên trang Tồn kho hiện tại:
- Backend: `inventory-core.controller.js` enrich `inboundReceivedQty` = tổng `receipt_line.received_qty` (>0, not CANCELLED) group by `item_id + warehouse_id`
- Frontend: `InventoryOnHandPage.jsx` cột "Đã nhập" (màu xanh dương)
