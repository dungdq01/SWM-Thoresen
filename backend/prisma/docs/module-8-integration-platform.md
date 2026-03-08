# Module 8: Integration Platform - Database Documentation

**Module Path:** `src/modules/integration-platform`  
**Schema Prefix:** `m8_`  
**Total Tables:** 11

---

## 1. Tổng quan

Module 8 quản lý các bảng dữ liệu cho:
- **Weighbridge Integration** - Log cân và device management
- **OCR Intake** - Kết quả OCR và confirmed snapshots
- **Mobile Sync** - Batch và event synchronization
- **ERP Push** - Job push sang ERP
- **Monitoring** - Alerts và channel health

---

## 2. Enums

### M8WeighingType
| Value | Mô tả |
|-------|-------|
| `WEIGH_IN` | Cân vào (inbound) |
| `WEIGH_OUT` | Cân ra (inbound) |
| `TARE` | Tare weight (outbound) |
| `GROSS_LINE` | Gross per line (outbound) |
| `MANUAL_ENTRY` | Nhập tay |

### M8DeviceStatus
| Value | Mô tả |
|-------|-------|
| `ONLINE` | Device hoạt động bình thường |
| `OFFLINE` | Device mất kết nối |
| `DEGRADED` | Device hoạt động có vấn đề |

### M8WeighEventProcessingStatus
| Value | Mô tả |
|-------|-------|
| `RECEIVED` | Event đã nhận |
| `VALIDATED` | Event đã validate |
| `LINKED` | Event đã link với business object |
| `DUPLICATE` | Event duplicate |
| `FAILED` | Event thất bại |

### M8CallbackStatus
| Value | Mô tả |
|-------|-------|
| `PENDING` | Chờ callback |
| `SENT` | Đã gửi callback |
| `ACKED` | Module đích đã acknowledge |
| `FAILED` | Callback thất bại |

### M8OcrStatus
| Value | Mô tả |
|-------|-------|
| `UPLOADED` | Đã upload file |
| `EXTRACTING` | Đang extract |
| `EXTRACTED` | Đã extract xong |
| `REVIEW_REQUIRED` | Cần operator review |
| `CONFIRMED` | Operator đã confirm |
| `LINKED` | Đã link với receipt |
| `REJECTED` | Bị reject |

### M8OcrLinkMethod
| Value | Mô tả |
|-------|-------|
| `AUTO_MATCHED` | Hệ thống tự match |
| `OPERATOR_SELECTED` | Operator chọn receipt có sẵn |
| `OPERATOR_CREATED` | Operator tạo receipt mới |

### M8SyncBatchStatus
| Value | Mô tả |
|-------|-------|
| `QUEUED` | Đang chờ xử lý |
| `PROCESSING` | Đang xử lý |
| `PARTIAL_SUCCESS` | Thành công một phần |
| `SUCCESS` | Thành công |
| `FAILED` | Thất bại |
| `CONFLICTED` | Có conflict |

### M8SyncEventStatus
| Value | Mô tả |
|-------|-------|
| `RECEIVED` | Event đã nhận |
| `DUPLICATE` | Event duplicate |
| `DISPATCHED` | Đã dispatch sang module đích |
| `APPLIED` | Module đích đã apply |
| `CONFLICTED` | Conflict với state hiện tại |
| `FAILED` | Thất bại |

### M8ErpPushStatus
| Value | Mô tả |
|-------|-------|
| `PENDING` | Chờ gửi |
| `SENT` | Đã gửi |
| `ACK_SUCCESS` | ERP xác nhận thành công |
| `ACK_FAILED` | ERP xác nhận thất bại |
| `RETRY_SCHEDULED` | Đã lên lịch retry |
| `DEAD_LETTER` | Dead letter (hết retry) |
| `CANCELLED` | Đã hủy |

### M8AlertSeverity
| Value | Mô tả |
|-------|-------|
| `INFO` | Thông tin |
| `WARN` | Cảnh báo |
| `ERROR` | Lỗi |
| `CRITICAL` | Nghiêm trọng |

### M8AlertStatus
| Value | Mô tả |
|-------|-------|
| `OPEN` | Đang mở |
| `ACKNOWLEDGED` | Đã acknowledge |
| `RESOLVED` | Đã resolve |
| `SUPPRESSED` | Đã suppress |

### M8ChannelStatus
| Value | Mô tả |
|-------|-------|
| `HEALTHY` | Hoạt động tốt |
| `DEGRADED` | Có vấn đề |
| `DOWN` | Không hoạt động |

---

## 3. Tables

### 3.1 m8_weighbridge_device

**Mô tả:** Cấu hình thiết bị cân (weighbridge)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `device_code` | VARCHAR(50) | No | - | Mã device (unique) |
| `device_name` | VARCHAR(150) | No | - | Tên device |
| `warehouse_id` | UUID | Yes | - | FK to warehouse |
| `port_name` | VARCHAR(50) | Yes | - | Serial port (COM3, etc.) |
| `baud_rate` | INT | Yes | - | Baud rate |
| `data_bits` | INT | Yes | - | Data bits |
| `stop_bits` | INT | Yes | - | Stop bits |
| `parity` | VARCHAR(20) | Yes | - | Parity |
| `frame_format` | VARCHAR(100) | Yes | - | Frame format |
| `heartbeat_interval_sec` | INT | No | 300 | Heartbeat interval |
| `stable_window_ms` | INT | No | 1000 | Stable window |
| `is_active` | BOOLEAN | No | true | Active flag |
| `last_seen_at` | TIMESTAMP | Yes | - | Last heartbeat time |
| `last_status` | ENUM | Yes | - | Last known status |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(warehouse_id, is_active)`
- `(last_seen_at)`

---

### 3.2 m8_weighbridge_log

**Mô tả:** Immutable log của weigh events (không được update/delete)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `weighbridge_event_id` | VARCHAR(100) | No | - | Event ID từ agent (unique, idempotency key) |
| `receipt_id` | UUID | Yes | - | FK to receipt (inbound) |
| `shipment_id` | UUID | Yes | - | FK to shipment (outbound) |
| `vehicle_number` | VARCHAR(50) | No | - | Biển số xe |
| `weighing_type` | ENUM | No | - | Loại cân |
| `weighing_sequence` | INT | No | - | Sequence number |
| `gross_weight_kg` | DECIMAL(18,3) | Yes | - | Gross weight |
| `tare_weight_kg` | DECIMAL(18,3) | Yes | - | Tare weight |
| `net_weight_kg` | DECIMAL(18,3) | Yes | - | Net weight |
| `raw_weight_value` | VARCHAR(100) | Yes | - | Raw value từ cân |
| `raw_payload` | JSONB | Yes | - | Raw payload từ agent |
| `is_stable_weight` | BOOLEAN | No | false | Cân ổn định |
| `is_duplicate_signal` | BOOLEAN | No | false | Tín hiệu duplicate |
| `duplicate_of_event_id` | VARCHAR(100) | Yes | - | ID của event gốc nếu duplicate |
| `is_manual_entry` | BOOLEAN | No | false | Nhập tay |
| `manual_reason_code` | VARCHAR(50) | Yes | - | Reason code cho manual |
| `approved_by` | UUID | Yes | - | Người approve manual |
| `scale_device_id` | VARCHAR(50) | No | - | FK to device |
| `photo_alpr_path` | VARCHAR(500) | Yes | - | Path ảnh biển số |
| `photo_cargo_path` | VARCHAR(500) | Yes | - | Path ảnh hàng |
| `latency_ms` | INT | Yes | - | Latency từ agent đến server |
| `external_id` | VARCHAR(100) | No | - | External correlation |
| `correlation_id` | UUID | No | - | Correlation ID |
| `source_channel` | VARCHAR(30) | No | - | Source channel |
| `weighing_timestamp` | TIMESTAMP | No | - | Thời điểm cân |
| `created_by` | VARCHAR(100) | No | - | Người tạo |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |

**Indexes:**
- `(receipt_id)`
- `(shipment_id)`
- `(scale_device_id, created_at DESC)`
- `(vehicle_number, created_at DESC)`
- `(correlation_id)`
- `(weighing_timestamp)`

**Constraints:**
- `weighbridge_event_id` UNIQUE

---

### 3.3 m8_weighbridge_event_state

**Mô tả:** Processing state của weigh event (tách để có thể update)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `weighbridge_log_id` | UUID | No | - | FK to weighbridge_log (unique) |
| `processing_status` | ENUM | No | - | Processing status |
| `linked_module` | VARCHAR(20) | Yes | - | Module đã link (M4, M5) |
| `linked_object_id` | UUID | Yes | - | ID của object đã link |
| `callback_status` | ENUM | Yes | - | Callback status |
| `callback_error` | TEXT | Yes | - | Callback error message |
| `retry_count` | INT | No | 0 | Số lần retry |
| `last_retry_at` | TIMESTAMP | Yes | - | Lần retry cuối |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(processing_status, updated_at DESC)`
- `(callback_status)`

---

### 3.4 m8_ocr_result

**Mô tả:** Kết quả OCR extraction (raw, immutable)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `ocr_request_id` | VARCHAR(100) | No | - | Request ID (unique) |
| `image_path` | VARCHAR(500) | No | - | Path to image |
| `provider_name` | VARCHAR(50) | No | - | OCR provider name |
| `provider_request_id` | VARCHAR(100) | Yes | - | Provider request ID |
| `bl_number` | VARCHAR(50) | Yes | - | Extracted BL number |
| `bl_confidence` | DECIMAL(5,2) | Yes | - | BL confidence % |
| `vehicle_number` | VARCHAR(50) | Yes | - | Extracted vehicle |
| `vehicle_confidence` | DECIMAL(5,2) | Yes | - | Vehicle confidence % |
| `product_name` | VARCHAR(200) | Yes | - | Extracted product |
| `product_confidence` | DECIMAL(5,2) | Yes | - | Product confidence % |
| `vessel_name` | VARCHAR(200) | Yes | - | Extracted vessel |
| `vessel_confidence` | DECIMAL(5,2) | Yes | - | Vessel confidence % |
| `qty_extracted` | DECIMAL(18,3) | Yes | - | Extracted quantity |
| `qty_uom` | VARCHAR(20) | Yes | - | UOM |
| `qty_confidence` | DECIMAL(5,2) | Yes | - | Qty confidence % |
| `overall_confidence` | DECIMAL(5,2) | Yes | - | Overall confidence % |
| `raw_response` | JSONB | Yes | - | Raw provider response |
| `linked_receipt_id` | UUID | Yes | - | FK to receipt |
| `link_method` | ENUM | Yes | - | Link method |
| `operator_confirmed` | BOOLEAN | No | false | Operator đã confirm |
| `status` | ENUM | No | UPLOADED | OCR status |
| `external_id` | VARCHAR(100) | No | - | External ID |
| `correlation_id` | UUID | No | - | Correlation ID |
| `source_channel` | VARCHAR(20) | No | OCR | Source channel |
| `warehouse_id` | UUID | Yes | - | FK to warehouse |
| `created_by` | VARCHAR(100) | No | - | Người tạo |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(status, created_at DESC)`
- `(bl_number)`
- `(linked_receipt_id)`
- `(correlation_id)`
- `(warehouse_id, status)`

---

### 3.5 m8_ocr_confirmed_snapshot

**Mô tả:** Confirmed/corrected OCR data (tách để giữ raw immutable)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `ocr_result_id` | UUID | No | - | FK to ocr_result (unique) |
| `confirmed_bl_number` | VARCHAR(50) | Yes | - | Confirmed BL |
| `confirmed_vehicle_number` | VARCHAR(50) | Yes | - | Confirmed vehicle |
| `confirmed_product_name` | VARCHAR(200) | Yes | - | Confirmed product |
| `confirmed_vessel_name` | VARCHAR(200) | Yes | - | Confirmed vessel |
| `confirmed_qty` | DECIMAL(18,3) | Yes | - | Confirmed qty |
| `confirmed_qty_uom` | VARCHAR(20) | Yes | - | Confirmed UOM |
| `corrections_json` | JSONB | Yes | - | Corrections details |
| `confirmed_by` | UUID | No | - | Người confirm |
| `confirmed_at` | TIMESTAMP | No | - | Thời điểm confirm |
| `remarks` | TEXT | Yes | - | Ghi chú |

---

### 3.6 m8_mobile_sync_batch

**Mô tả:** Batch envelope từ mobile offline queue

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `batch_id` | VARCHAR(100) | No | - | Batch ID từ mobile (unique) |
| `device_id` | VARCHAR(50) | No | - | Mobile device ID |
| `keeper_user_id` | UUID | No | - | FK to user |
| `app_version` | VARCHAR(30) | Yes | - | App version |
| `event_count` | INT | No | - | Số events trong batch |
| `payload` | JSONB | No | - | Raw batch payload |
| `status` | ENUM | No | QUEUED | Batch status |
| `duplicate_count` | INT | No | 0 | Số events duplicate |
| `conflict_count` | INT | No | 0 | Số events conflict |
| `accepted_count` | INT | No | 0 | Số events accepted |
| `rejected_count` | INT | No | 0 | Số events rejected |
| `first_sequence_no` | BIGINT | Yes | - | First sequence |
| `last_sequence_no` | BIGINT | Yes | - | Last sequence |
| `received_at` | TIMESTAMP | No | now() | Thời điểm nhận |
| `processed_at` | TIMESTAMP | Yes | - | Thời điểm xử lý xong |
| `external_id` | VARCHAR(100) | No | - | External ID |
| `correlation_id` | UUID | No | - | Correlation ID |
| `source_channel` | VARCHAR(20) | No | MOBILE_SYNC | Source channel |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(device_id, received_at DESC)`
- `(keeper_user_id, received_at DESC)`
- `(status, received_at DESC)`

---

### 3.7 m8_mobile_sync_event

**Mô tả:** Từng event trong batch

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `batch_id` | UUID | No | - | FK to batch |
| `event_external_id` | VARCHAR(100) | No | - | Event ID từ mobile (unique) |
| `event_type` | VARCHAR(50) | No | - | Event type |
| `work_id` | UUID | Yes | - | FK to work |
| `work_line_id` | UUID | Yes | - | FK to work line |
| `source_module` | VARCHAR(20) | No | - | Source module (M7, M6) |
| `device_id` | VARCHAR(50) | No | - | Device ID |
| `device_event_time` | TIMESTAMP | No | - | Thời điểm event trên device |
| `sequence_no` | BIGINT | No | - | Sequence number |
| `payload` | JSONB | No | - | Event payload |
| `process_status` | ENUM | No | RECEIVED | Processing status |
| `process_error` | TEXT | Yes | - | Processing error |
| `dispatched_at` | TIMESTAMP | Yes | - | Thời điểm dispatch |
| `applied_at` | TIMESTAMP | Yes | - | Thời điểm apply |
| `correlation_id` | UUID | No | - | Correlation ID |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |

**Indexes:**
- `(device_id, sequence_no)`
- `(work_id)`
- `(work_line_id)`
- `(process_status, created_at DESC)`

---

### 3.8 m8_erp_push_log

**Mô tả:** ERP push job và response history

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `push_job_id` | VARCHAR(100) | No | - | Job ID (unique) |
| `push_type` | VARCHAR(30) | No | - | Push type (DEBIT_NOTE, etc.) |
| `reference_id` | VARCHAR(50) | No | - | Reference ID |
| `payload` | JSONB | No | - | Payload |
| `payload_hash` | VARCHAR(128) | Yes | - | Payload hash |
| `status` | ENUM | No | PENDING | Job status |
| `attempt_count` | INT | No | 0 | Số lần attempt |
| `max_attempts` | INT | No | 10 | Max attempts |
| `last_attempt_at` | TIMESTAMP | Yes | - | Lần attempt cuối |
| `next_retry_at` | TIMESTAMP | Yes | - | Lần retry tiếp theo |
| `response_code` | INT | Yes | - | HTTP response code |
| `response_body` | JSONB | Yes | - | Response body |
| `error_message` | TEXT | Yes | - | Error message |
| `endpoint_name` | VARCHAR(100) | Yes | - | Endpoint name |
| `external_id` | VARCHAR(100) | No | - | External ID |
| `correlation_id` | UUID | No | - | Correlation ID |
| `source_channel` | VARCHAR(20) | No | ERP_PUSH | Source channel |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(status, next_retry_at)`
- `(reference_id)`
- `(correlation_id)`

**Constraints:**
- `(push_type, reference_id)` UNIQUE

---

### 3.9 m8_integration_alert

**Mô tả:** Alert read model cho monitoring dashboard

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `alert_code` | VARCHAR(50) | No | - | Alert code |
| `alert_source` | VARCHAR(30) | No | - | Source (WEIGHBRIDGE, OCR, etc.) |
| `severity` | ENUM | No | - | Severity |
| `source_ref_type` | VARCHAR(30) | Yes | - | Reference type |
| `source_ref_id` | VARCHAR(100) | Yes | - | Reference ID |
| `title` | VARCHAR(200) | No | - | Alert title |
| `description` | TEXT | Yes | - | Alert description |
| `status` | ENUM | No | OPEN | Alert status |
| `owner_role` | VARCHAR(30) | Yes | - | Owner role |
| `warehouse_id` | UUID | Yes | - | FK to warehouse |
| `correlation_id` | UUID | Yes | - | Correlation ID |
| `first_raised_at` | TIMESTAMP | No | now() | First raised |
| `last_seen_at` | TIMESTAMP | No | now() | Last seen |
| `acknowledged_by` | UUID | Yes | - | Acknowledged by |
| `acknowledged_at` | TIMESTAMP | Yes | - | Acknowledged at |
| `resolved_by` | UUID | Yes | - | Resolved by |
| `resolved_at` | TIMESTAMP | Yes | - | Resolved at |
| `resolution_note` | TEXT | Yes | - | Resolution note |
| `created_at` | TIMESTAMP | No | now() | Created timestamp |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

**Indexes:**
- `(status, severity, last_seen_at DESC)`
- `(alert_source, status)`
- `(warehouse_id, status)`
- `(source_ref_type, source_ref_id)`

---

### 3.10 m8_channel_health_snapshot

**Mô tả:** Dashboard summary (được update định kỳ bởi background job)

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `channel_name` | VARCHAR(30) | No | - | Channel name (unique) |
| `status` | ENUM | No | HEALTHY | Channel status |
| `open_alert_count` | INT | No | 0 | Open alert count |
| `backlog_count` | INT | No | 0 | Backlog count |
| `success_rate_1h` | DECIMAL(5,2) | Yes | - | Success rate 1h |
| `avg_latency_ms_1h` | INT | Yes | - | Avg latency 1h |
| `updated_at` | TIMESTAMP | No | - | Updated timestamp |

---

### 3.11 m8_device_heartbeat

**Mô tả:** Heartbeat history từ weighbridge agents

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | UUID | No | uuid() | Primary key |
| `device_code` | VARCHAR(50) | No | - | FK to device |
| `agent_version` | VARCHAR(30) | Yes | - | Agent version |
| `port_name` | VARCHAR(50) | Yes | - | Port name |
| `last_weight_read_at` | TIMESTAMP | Yes | - | Last weight read |
| `buffer_pending_count` | INT | No | 0 | Buffer pending |
| `health_status` | VARCHAR(30) | Yes | - | Health status |
| `received_at` | TIMESTAMP | No | now() | Received timestamp |

**Indexes:**
- `(device_code, received_at DESC)`

---

## 4. Relationships

```
m8_weighbridge_device ─┬─< m8_weighbridge_log
                       └─< m8_device_heartbeat

m8_weighbridge_log ──── m8_weighbridge_event_state (1:1)

m8_ocr_result ──── m8_ocr_confirmed_snapshot (1:1)

m8_mobile_sync_batch ──< m8_mobile_sync_event
```

---

## 5. Data Retention

| Table | Retention Policy |
|-------|------------------|
| `m8_weighbridge_log` | 2 years (audit requirement) |
| `m8_device_heartbeat` | 7 days (cleanup job) |
| `m8_mobile_sync_event` | 90 days |
| `m8_erp_push_log` | 1 year |
| `m8_integration_alert` | 90 days (resolved) |

---

## 6. Notes

1. **Immutability:** `m8_weighbridge_log` và `m8_ocr_result` (raw fields) là immutable. Mọi corrections/updates được lưu trong bảng state/snapshot tách riêng.

2. **Idempotency Keys:**
   - Weighbridge: `weighbridge_event_id`
   - OCR: `ocr_request_id`
   - Mobile Sync Batch: `batch_id`
   - Mobile Sync Event: `event_external_id`
   - ERP Push: `(push_type, reference_id)`

3. **Indexes:** Đã tối ưu cho các query phổ biến (by status, by date range, by reference).
