# Module 7: Work Execution - Database Schema

## Tổng quan

Module 7 quản lý work execution với 10 bảng chính:

| Bảng | Mô tả | Record Volume |
|------|-------|---------------|
| `we_work_header` | Container work chính | High |
| `we_work_line` | Từng dòng thực thi | High |
| `we_work_assignment_history` | Lịch sử claim/release | Medium |
| `we_work_status_history` | Lịch sử status changes | High |
| `we_work_posting_link` | Liên kết M3 posting | High |
| `we_work_event_log` | Event audit log | Very High |
| `we_work_exception` | Exception tracking | Medium |
| `we_mobile_sync_batch` | Mobile sync batches | Medium |
| `we_mobile_sync_event` | Từng event trong batch | High |
| `we_work_outbox_event` | Outbox cho callbacks | Medium |

---

## Enums

### WeWorkType
```
PUTAWAY       - Putaway từ receiving vào storage
PICK          - Pick từ storage ra staging
MOVE          - Di chuyển nội bộ
TRANSFER_PICK - Transfer pick (source warehouse)
TRANSFER_PUT  - Transfer put (dest warehouse)
```

### WeWorkStatus
```
OPEN        - Mới tạo, chưa ai claim
IN_PROGRESS - Đang thực thi
COMPLETED   - Hoàn tất
CANCELLED   - Đã hủy
```

### WeWorkLineStatus
```
OPEN        - Chưa bắt đầu
IN_PROGRESS - Đang thực thi
COMPLETED   - Hoàn tất + posted
SKIPPED     - Bỏ qua (có reason)
CANCELLED   - Hủy theo header
```

### WePostingStatus
```
PENDING  - Chưa post
POSTED   - Đã post thành công
FAILED   - Post thất bại
REVERSED - Đã reverse (khi cancel work có completed lines)
```

### WeExceptionType
```
SHORT_PICK        - Variance > threshold
LOCATION_MISMATCH - Scan sai location
ITEM_NOT_FOUND    - Không tìm thấy hàng
SYNC_CONFLICT     - Mobile sync conflict
POSTING_FAILED    - M3 posting lỗi
```

---

## Bảng chi tiết

### we_work_header

Container nghiệp vụ chính của work.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | Technical key |
| work_id | VARCHAR(40) | UNIQUE | Business key `WRK-*` |
| work_type | WeWorkType | NOT NULL | Loại work |
| status | WeWorkStatus | NOT NULL | Trạng thái hiện tại |
| priority_no | INT | NOT NULL | 1-100, số nhỏ = ưu tiên cao |
| warehouse_id | UUID | NOT NULL | Warehouse scope |
| zone_id | UUID | NULL | Zone filter (optional) |
| source_module | WeSourceModule | NOT NULL | M4/M5/M6/MANUAL |
| source_type | WeSourceType | NOT NULL | RECEIPT/SHIPMENT/etc |
| source_ref_id | VARCHAR(50) | NOT NULL | Mã document nguồn |
| source_ref_line_id | VARCHAR(50) | NULL | Mã line nguồn |
| source_owner_id | UUID | NULL | Owner denormalized |
| assigned_to | UUID | NULL | User đã claim |
| assigned_at | TIMESTAMP | NULL | Thời điểm claim |
| started_at | TIMESTAMP | NULL | Thời điểm start |
| completed_at | TIMESTAMP | NULL | Thời điểm complete |
| cancelled_at | TIMESTAMP | NULL | Thời điểm cancel |
| cancel_reason_code | VARCHAR(50) | NULL | Reason khi cancel |
| assignment_mode | WeAssignmentMode | NOT NULL | SELF_CLAIM/DIRECTED |
| external_id | VARCHAR(120) | UNIQUE | Idempotency key |
| correlation_id | UUID | NOT NULL | Trace ID |
| source_app | SourceApp | NOT NULL | WEB/MOBILE/SYSTEM |
| version_no | BIGINT | NOT NULL | Optimistic lock |
| created_by | UUID | NULL | User tạo |
| created_at | TIMESTAMP | NOT NULL | Thời điểm tạo |
| updated_by | UUID | NULL | User update |
| updated_at | TIMESTAMP | NOT NULL | Thời điểm update |

**Unique Constraints:**
- `work_id`
- `external_id`
- `(source_module, source_type, source_ref_id, source_ref_line_id, work_type)` - chống duplicate từ trigger

**Indexes:**
- `(status, warehouse_id, work_type, priority_no, created_at DESC)` - mobile list
- `(assigned_to, status, warehouse_id)` - my works
- `(source_module, source_ref_id, work_type)` - trigger lookup

---

### we_work_line

Đơn vị thực thi nhỏ nhất, mỗi line = 1 posting.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| work_header_id | UUID | FK NOT NULL | → we_work_header |
| line_num | INT | NOT NULL | Sequence trong header |
| step_type | WeStepType | NOT NULL | PUT/PICK/MOVE/etc |
| status | WeWorkLineStatus | NOT NULL | Trạng thái line |
| item_id | UUID | NOT NULL | Item thực thi |
| owner_id | UUID | NOT NULL | Owner |
| from_warehouse_id | UUID | NULL | Source warehouse |
| from_location_id | UUID | NULL | Source location |
| to_warehouse_id | UUID | NULL | Dest warehouse |
| to_location_id | UUID | NULL | Dest location (có thể set lúc complete) |
| expected_qty | DECIMAL(18,3) | NOT NULL | Số lượng dự kiến |
| actual_qty | DECIMAL(18,3) | NULL | Số lượng thực tế |
| variance_qty | DECIMAL(18,3) | NULL | actual - expected |
| uom | VARCHAR(20) | NOT NULL | Đơn vị |
| inventory_status_from | VARCHAR(30) | NULL | Status nguồn |
| inventory_status_to | VARCHAR(30) | NULL | Status đích |
| scanned_location_code | VARCHAR(50) | NULL | Raw QR value |
| scanned_location_id | UUID | NULL | Normalized location |
| reason_code | VARCHAR(50) | NULL | Skip/override reason |
| evidence_text | TEXT | NULL | Manager override evidence |
| started_at | TIMESTAMP | NULL | |
| completed_at | TIMESTAMP | NULL | |
| completed_by | UUID | NULL | |
| posting_status | WePostingStatus | NOT NULL | PENDING/POSTED/FAILED |
| posting_ref_type | VARCHAR(30) | NULL | MOVE/TRANSFER_SHIP/etc |
| posting_ref_id | VARCHAR(50) | NULL | Trans ID từ M3 |
| posting_error_code | VARCHAR(50) | NULL | |
| posting_error_message | TEXT | NULL | |
| reversal_ref_id | VARCHAR(50) | NULL | Trans ID của reversal (khi cancel) |
| external_id | VARCHAR(120) | UNIQUE NULL | Command idempotency |
| version_no | BIGINT | NOT NULL | Optimistic lock |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique Constraints:**
- `(work_header_id, line_num)`
- `external_id` WHERE NOT NULL

**Indexes:**
- `(work_header_id, status, line_num)`
- `(scanned_location_id)`

---

### we_work_assignment_history

Lịch sử claim/release/reassign.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| work_header_id | UUID | FK NOT NULL | |
| action_type | WeAssignmentAction | NOT NULL | CLAIM/RELEASE/REASSIGN |
| from_user_id | UUID | NULL | User trước |
| to_user_id | UUID | NULL | User sau |
| reason_code | VARCHAR(50) | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

---

### we_work_status_history

Lịch sử chuyển trạng thái.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| object_type | WeStatusObjectType | NOT NULL | HEADER/LINE |
| object_id | UUID | NOT NULL | Header hoặc line ID |
| from_status | VARCHAR(20) | NULL | Status trước |
| to_status | VARCHAR(20) | NOT NULL | Status sau |
| trigger_action | WeTriggerAction | NOT NULL | CREATE/START/COMPLETE/etc |
| reason_code | VARCHAR(50) | NULL | |
| remark | TEXT | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| work_header_id | UUID | NULL | FK for querying |
| work_line_id | UUID | NULL | FK for querying |

---

### we_work_posting_link

Liên kết work line với inventory posting từ M3.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| work_line_id | UUID | UNIQUE NOT NULL | 1 line → 1 posting |
| posting_module | VARCHAR(20) | NOT NULL | Default 'M3' |
| posting_request_type | VARCHAR(30) | NOT NULL | MOVE/TRANSFER_SHIP/etc |
| posting_ref_id | VARCHAR(50) | NULL | Trans ID từ M3 |
| posting_status | WePostingStatus | NOT NULL | |
| posted_at | TIMESTAMP | NULL | |
| error_code | VARCHAR(50) | NULL | |
| error_message | TEXT | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

### we_work_event_log

Event log cho audit và tracing.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| work_header_id | UUID | NULL | |
| work_line_id | UUID | NULL | |
| event_type | VARCHAR(40) | NOT NULL | WORK_CREATED/LINE_COMPLETED/etc |
| event_payload | JSONB | NOT NULL | Full payload |
| correlation_id | UUID | NOT NULL | |
| source_app | SourceApp | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

**Indexes:**
- `(work_header_id, created_at DESC)`
- `(event_type, created_at DESC)`

---

### we_work_exception

Exception tracking.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| work_header_id | UUID | NULL | |
| work_line_id | UUID | NULL | |
| exception_type | WeExceptionType | NOT NULL | |
| severity | WeExceptionSeverity | NOT NULL | INFO/WARN/BLOCKER |
| status | WeExceptionStatus | NOT NULL | OPEN/RESOLVED/CLOSED |
| reason_code | VARCHAR(50) | NULL | |
| detail_text | TEXT | NULL | |
| resolution_text | TEXT | NULL | |
| resolved_by | UUID | NULL | |
| resolved_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

---

### we_mobile_sync_batch

Batch sync từ mobile.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| batch_no | VARCHAR(40) | UNIQUE | Business key |
| device_id | VARCHAR(80) | NOT NULL | |
| user_id | UUID | NOT NULL | |
| sync_status | WeSyncBatchStatus | NOT NULL | RECEIVED/SUCCESS/PARTIAL/FAILED |
| event_count | INT | NOT NULL | Tổng events |
| success_count | INT | NOT NULL | Thành công |
| duplicate_count | INT | NOT NULL | Duplicate |
| conflict_count | INT | NOT NULL | Conflict |
| correlation_id | UUID | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| processed_at | TIMESTAMP | NULL | |

---

### we_mobile_sync_event

Từng event trong batch.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| sync_batch_id | UUID | FK NOT NULL | |
| external_id | VARCHAR(120) | UNIQUE | Idempotency từ mobile |
| device_sequence_no | BIGINT | NOT NULL | Sequence từ device |
| event_type | WeSyncEventType | NOT NULL | START_LINE/COMPLETE_LINE/SKIP_LINE |
| work_id | VARCHAR(40) | NOT NULL | |
| work_line_id | UUID | NULL | |
| event_payload | JSONB | NOT NULL | |
| processing_result | WeSyncResult | NOT NULL | SUCCESS/DUPLICATE/CONFLICT/REJECTED |
| result_message | TEXT | NULL | |
| processed_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |

---

### we_work_outbox_event

Outbox cho async callbacks.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|-------|
| id | UUID | PK | |
| aggregate_type | VARCHAR(30) | NOT NULL | 'WORK' |
| aggregate_id | UUID | NOT NULL | Header/line ID |
| event_type | VARCHAR(40) | NOT NULL | PUTAWAY_COMPLETED/etc |
| target_module | VARCHAR(20) | NOT NULL | M4/M5/M6 |
| payload | JSONB | NOT NULL | Callback data |
| delivery_status | WeOutboxStatus | NOT NULL | PENDING/SENT/FAILED/DEAD |
| retry_count | INT | NOT NULL | |
| next_retry_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| sent_at | TIMESTAMP | NULL | |
| last_error | TEXT | NULL | Last error message (HI-2 fix) |
| work_header_id | UUID | NULL | FK |

---

## Relationships

```
we_work_header
    │
    ├── 1:N ── we_work_line
    │              │
    │              └── 1:1 ── we_work_posting_link
    │
    ├── 1:N ── we_work_assignment_history
    ├── 1:N ── we_work_status_history
    ├── 1:N ── we_work_event_log
    ├── 1:N ── we_work_exception
    └── 1:N ── we_work_outbox_event

we_mobile_sync_batch
    │
    └── 1:N ── we_mobile_sync_event
```

---

## Indexing Strategy

**High-frequency queries:**
1. Available works list (mobile) → composite index on header
2. My works (user) → index on assigned_to
3. Dashboard aggregates → status groupings
4. Idempotency checks → unique indexes on external_id

**Partition considerations (Phase 2):**
- `we_work_event_log` → partition by month
- `we_mobile_sync_event` → partition by month
- `we_work_outbox_event` → archive after delivery
