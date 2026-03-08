# Module 10: Billing & Commercial Control - Database Documentation

**Version:** 1.1.0  
**Total Tables:** 12  
**Last Updated:** 2026-03-09  

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐
│   BilContract   │────<│ BilContractFeeLine  │
└─────────────────┘     └─────────────────────┘
        │
        v
┌─────────────────┐     ┌─────────────────────┐
│  BilDebitNote   │────<│  BilDebitNoteLine   │
└─────────────────┘     └─────────────────────┘
        │                        │
        v                        v
┌─────────────────┐     ┌─────────────────────┐
│BilDebitNoteHist │     │     BilEvent        │
└─────────────────┘     └─────────────────────┘
        │
        v
┌─────────────────┐     ┌─────────────────────┐
│  BilException   │     │ BilStorageSnapshot  │
└─────────────────┘     └─────────────────────┘
        │                        │
        v                        v
┌─────────────────┐     ┌─────────────────────┐
│BilErpPushOutbox │────<│   BilErpPushLog     │
└─────────────────┘     └─────────────────────┘
                        ┌─────────────────────┐
                        │ BilDayTypeCalendar  │
                        └─────────────────────┘
                        ┌─────────────────────┐
                        │   BilSnapshotRun    │
                        └─────────────────────┘
```

---

## Tables

### 1. bil_contract

Header contract tính phí cho owner.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| contract_number | VARCHAR(30) | NO | Unique contract number |
| owner_id | UUID | NO | FK → md_owner |
| contract_scope | VARCHAR(20) | NO | Default 'OWNER' |
| effective_from | DATE | NO | Ngày bắt đầu hiệu lực |
| effective_to | DATE | NO | Ngày kết thúc hiệu lực |
| currency_code | VARCHAR(10) | NO | Default 'VND' |
| is_default | BOOLEAN | NO | Default false |
| status | ENUM | NO | DRAFT, ACTIVE, INACTIVE, EXPIRED |
| notes | TEXT | YES | Ghi chú |
| version_no | INT | NO | Version number |
| superseded_contract_id | UUID | YES | Contract thay thế |
| external_id | VARCHAR(100) | NO | Unique external ID |
| created_by | UUID | NO | User tạo |
| created_at | TIMESTAMP | NO | Thời gian tạo |
| updated_by | UUID | NO | User cập nhật |
| updated_at | TIMESTAMP | NO | Thời gian cập nhật |

**Indexes:**
- `idx_bil_contract_owner_dates` ON (owner_id, effective_from, effective_to, status)

---

### 2. bil_contract_fee_line

Fee lines theo contract.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| contract_id | UUID | NO | FK → bil_contract |
| fee_type | ENUM | NO | STORAGE, HANDLING_INBOUND, ... |
| cargo_form | ENUM | YES | BULK, BAGGED, CONTAINERIZED |
| warehouse_id | UUID | YES | FK → md_warehouse |
| day_type_scope | VARCHAR(20) | YES | WORKING_DAY, HOLIDAY, ALL |
| billing_uom | VARCHAR(10) | NO | Default 'MT' |
| unit_rate | DECIMAL(18,2) | NO | Đơn giá |
| minimum_charge | DECIMAL(18,2) | YES | Phí tối thiểu |
| free_days | INT | YES | Số ngày miễn phí |
| material_rate_per_bag | DECIMAL(18,2) | YES | Giá bao bì/bao |
| tier_rule_code | VARCHAR(30) | YES | Rule tiered pricing |
| priority_rank | INT | NO | Thứ tự ưu tiên |
| is_active | BOOLEAN | NO | Default true |

**Unique Constraint:**
- `uniq_fee_line` ON (contract_id, fee_type, cargo_form, warehouse_id, priority_rank)

---

### 3. bil_day_type_calendar

Day type và multiplier calendar.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| calendar_date | DATE | NO | UNIQUE - ngày |
| day_type | ENUM | NO | WORKING_DAY, DAY_OFF, HOLIDAY |
| default_ot_multiplier | DECIMAL(6,3) | NO | Multiplier mặc định |
| no_ot_multiplier | DECIMAL(6,3) | NO | Multiplier không OT |
| with_ot_multiplier | DECIMAL(6,3) | NO | Multiplier có OT |
| notes | TEXT | YES | Ghi chú |

---

### 4. bil_event

Billing events đã normalize từ các module nghiệp vụ.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| event_type | ENUM | NO | INBOUND_HANDLING, OUTBOUND_HANDLING, ... |
| ref_type | VARCHAR(30) | NO | RECEIPT, SHIPMENT, VAS_WO |
| ref_id | VARCHAR(50) | NO | Reference ID |
| ref_line_id | VARCHAR(50) | YES | Reference line ID |
| owner_id | UUID | NO | FK → md_owner |
| warehouse_id | UUID | NO | FK → md_warehouse |
| item_id | UUID | YES | FK → md_item |
| cargo_form | ENUM | YES | BULK, BAGGED, CONTAINERIZED |
| billing_qty_mt | DECIMAL(18,3) | NO | Số lượng tính phí (MT) |
| event_date | DATE | NO | Ngày event |
| operation_timestamp | TIMESTAMP | NO | Thời điểm thực hiện |
| day_type | ENUM | NO | Day type tại ngày event |
| is_overtime | BOOLEAN | NO | Có OT không |
| combined_multiplier | DECIMAL(6,3) | NO | Multiplier tổng hợp |
| rate_status | ENUM | NO | UNRESOLVED, RESOLVED, MISSING |
| billing_status | ENUM | NO | CAPTURED, BILLED, UNBILLED |
| source_module | VARCHAR(10) | NO | M4, M5, M9 |
| source_payload_json | JSON | YES | Payload gốc |
| external_id | VARCHAR(100) | NO | UNIQUE - idempotency |
| correlation_id | UUID | NO | Correlation ID |
| debit_note_line_id | UUID | YES | FK → bil_debit_note_line |
| captured_at | TIMESTAMP | NO | Thời gian capture |

**Indexes:**
- `idx_bil_event_owner_date` ON (owner_id, event_date, billing_status)
- `idx_bil_event_source` ON (source_module, ref_id)

---

### 5. bil_snapshot_run

Snapshot run metadata.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| snapshot_date | DATE | NO | Ngày snapshot |
| warehouse_scope | VARCHAR(50) | YES | Scope warehouse |
| status | ENUM | NO | PENDING, RUNNING, SUCCESS, FAILED |
| started_at | TIMESTAMP | NO | Thời gian bắt đầu |
| finished_at | TIMESTAMP | YES | Thời gian kết thúc |
| record_count | INT | NO | Số records |
| error_count | INT | NO | Số lỗi |
| error_summary | TEXT | YES | Tóm tắt lỗi |
| triggered_by | VARCHAR(30) | NO | SCHEDULER, MANUAL |
| external_id | VARCHAR(100) | NO | UNIQUE |

**Unique Constraint:**
- `uniq_snapshot_run` ON (snapshot_date, warehouse_scope)

---

### 6. bil_storage_snapshot

Daily storage snapshot.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| snapshot_run_id | UUID | NO | FK → bil_snapshot_run |
| snapshot_date | DATE | NO | Ngày snapshot |
| cut_off_time | TIMESTAMP | NO | Thời điểm cắt |
| warehouse_id | UUID | NO | FK → md_warehouse |
| location_id | UUID | NO | FK → md_location |
| owner_id | UUID | NO | FK → md_owner |
| item_id | UUID | NO | FK → md_item |
| receipt_line_id | UUID | YES | FK để track free days |
| inventory_status | VARCHAR(20) | NO | AVAILABLE, HOLD, ... |
| is_billable_status | BOOLEAN | NO | Status có billable |
| first_putaway_date | DATE | YES | Ngày putaway đầu |
| days_in_storage | INT | YES | Số ngày lưu kho |
| opening_qty_mt | DECIMAL(18,3) | NO | Tồn đầu ngày |
| inbound_today_mt | DECIMAL(18,3) | NO | Nhập trong ngày |
| outbound_today_mt | DECIMAL(18,3) | NO | Xuất trong ngày |
| closing_qty_mt | DECIMAL(18,3) | NO | Tồn cuối ngày |
| billable_qty_mt | DECIMAL(18,3) | NO | Số lượng tính phí |
| free_days_allowed | INT | YES | Số ngày free |
| is_free_day | BOOLEAN | NO | Có phải ngày free |
| applied_rate_per_mt_day | DECIMAL(18,2) | YES | Rate áp dụng |
| daily_amount_vnd | DECIMAL(18,2) | YES | Phí ngày |
| trace_json | JSON | YES | Trace tính toán |
| debit_note_line_id | UUID | YES | FK → bil_debit_note_line |

---

### 7. bil_debit_note

DN header.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| dn_number | VARCHAR(30) | NO | UNIQUE - số DN |
| owner_id | UUID | NO | FK → md_owner |
| contract_id | UUID | YES | FK → bil_contract |
| billing_period_start | DATE | NO | Kỳ từ |
| billing_period_end | DATE | NO | Kỳ đến |
| generation_basis | VARCHAR(20) | NO | PERIOD, ADHOC |
| status | ENUM | NO | DRAFT, REVIEWED, APPROVED, LOCKED |
| total_before_vat | DECIMAL(18,2) | NO | Tổng trước VAT |
| vat_rate | DECIMAL(6,3) | NO | Default 0.10 |
| vat_amount | DECIMAL(18,2) | NO | Tiền VAT |
| grand_total | DECIMAL(18,2) | NO | Tổng cộng |
| currency_code | VARCHAR(10) | NO | Default 'VND' |
| contract_version_json | JSON | YES | Snapshot contract |
| reviewed_by | UUID | YES | User review |
| reviewed_at | TIMESTAMP | YES | Thời gian review |
| approved_by | UUID | YES | User approve |
| approved_at | TIMESTAMP | YES | Thời gian approve |
| locked_by | UUID | YES | User lock |
| locked_at | TIMESTAMP | YES | Thời gian lock |
| erp_push_status | ENUM | NO | NOT_SENT, PENDING, SUCCESS, FAILED |
| external_id | VARCHAR(100) | NO | UNIQUE |
| correlation_id | UUID | NO | Correlation ID |
| created_by | UUID | NO | User tạo |
| created_at | TIMESTAMP | NO | Thời gian tạo |
| updated_by | UUID | NO | User cập nhật |
| updated_at | TIMESTAMP | NO | Thời gian cập nhật |

**Indexes:**
- `idx_bil_dn_owner_period` ON (owner_id, billing_period_start, billing_period_end)
- `idx_bil_dn_status` ON (status, locked_at)

---

### 8. bil_debit_note_line

DN charge lines.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| debit_note_id | UUID | NO | FK → bil_debit_note |
| line_seq | INT | NO | Số thứ tự dòng |
| charge_code | VARCHAR(30) | NO | Mã phí |
| description | VARCHAR(500) | NO | Mô tả phí |
| fee_type | ENUM | NO | Loại phí |
| source_type | VARCHAR(30) | NO | BILLING_EVENT, SNAPSHOT |
| source_ref_id | VARCHAR(50) | YES | Reference ID |
| owner_id | UUID | NO | FK → md_owner |
| item_id | UUID | YES | FK → md_item |
| cargo_form | ENUM | YES | Cargo form |
| billing_qty_mt | DECIMAL(18,3) | NO | Số lượng |
| unit_rate | DECIMAL(18,2) | NO | Đơn giá |
| combined_multiplier | DECIMAL(6,3) | YES | Multiplier |
| amount_vnd | DECIMAL(18,2) | NO | Thành tiền |
| vat_included_flag | BOOLEAN | NO | Đã bao gồm VAT |
| calculation_trace_json | JSON | NO | Trace tính toán |

**Unique Constraint:**
- `uniq_dn_line` ON (debit_note_id, line_seq)

---

### 9. bil_debit_note_history

DN state history.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| debit_note_id | UUID | NO | FK → bil_debit_note |
| action_code | VARCHAR(30) | NO | GENERATED, REVIEWED, APPROVED, LOCKED |
| from_status | ENUM | YES | Status trước |
| to_status | ENUM | YES | Status sau |
| action_by | UUID | NO | User thực hiện |
| action_at | TIMESTAMP | NO | Thời gian |
| reason_code | VARCHAR(50) | YES | Mã lý do |
| remarks | TEXT | YES | Ghi chú |
| before_json | JSON | YES | Data trước |
| after_json | JSON | YES | Data sau |

---

### 10. bil_exception

Exception queue.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| exception_type | ENUM | NO | MISSING_RATE, DUP_EVENT, ... |
| severity | ENUM | NO | INFO, WARN, ERROR, BLOCKER |
| status | ENUM | NO | OPEN, IN_REVIEW, RESOLVED, IGNORED |
| owner_id | UUID | YES | FK → md_owner |
| source_module | VARCHAR(10) | YES | Module nguồn |
| source_ref_type | VARCHAR(30) | YES | Loại reference |
| source_ref_id | VARCHAR(50) | YES | Reference ID |
| billing_event_id | UUID | YES | FK → bil_event |
| snapshot_run_id | UUID | YES | FK → bil_snapshot_run |
| debit_note_id | UUID | YES | FK → bil_debit_note |
| message | TEXT | NO | Mô tả lỗi |
| detail_json | JSON | YES | Chi tiết lỗi |
| assigned_to | UUID | YES | User được assign |
| resolved_by | UUID | YES | User resolve |
| resolved_at | TIMESTAMP | YES | Thời gian resolve |
| resolution_code | VARCHAR(50) | YES | Mã resolution |

---

### 11. bil_erp_push_outbox

ERP push outbox.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| debit_note_id | UUID | NO | FK → bil_debit_note |
| outbox_type | VARCHAR(30) | NO | ERP_PUSH |
| payload_json | JSON | NO | Payload push |
| status | ENUM | NO | PENDING, SENT, FAILED, DEAD |
| attempt_count | INT | NO | Số lần thử |
| next_retry_at | TIMESTAMP | YES | Retry tiếp theo |
| last_error_code | VARCHAR(50) | YES | Mã lỗi cuối |
| last_error_message | TEXT | YES | Lỗi cuối |
| external_id | VARCHAR(100) | NO | UNIQUE |

---

### 12. bil_erp_push_log

ERP push log.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| debit_note_id | UUID | NO | FK → bil_debit_note |
| outbox_id | UUID | NO | FK → bil_erp_push_outbox |
| request_payload_json | JSON | NO | Request payload |
| response_payload_json | JSON | YES | Response payload |
| http_status | INT | YES | HTTP status |
| result_status | VARCHAR(20) | NO | SUCCESS, FAILED |
| attempt_no | INT | NO | Số lần thử |
| pushed_at | TIMESTAMP | NO | Thời gian push |
| correlation_id | UUID | YES | Correlation ID |

---

## Enums

### BilContractStatus
- `DRAFT` - Nháp
- `ACTIVE` - Đang hiệu lực
- `INACTIVE` - Ngưng hiệu lực
- `EXPIRED` - Hết hạn

### BilFeeType
- `STORAGE` - Phí lưu kho
- `HANDLING_INBOUND` - Phí bốc xếp nhập
- `HANDLING_OUTBOUND` - Phí bốc xếp xuất
- `BAGGING` - Phí đóng bao
- `STUFFING` - Phí đóng container

### BilDayType
- `WORKING_DAY` - Ngày làm việc
- `DAY_OFF` - Ngày nghỉ
- `HOLIDAY` - Ngày lễ

### BilEventType
- `INBOUND_HANDLING` - Xử lý nhập
- `OUTBOUND_HANDLING` - Xử lý xuất
- `BAGGING_FEE` - Phí đóng bao
- `STORAGE` - Lưu kho

### BilDebitNoteStatus
- `DRAFT` - Nháp
- `REVIEWED` - Đã review
- `APPROVED` - Đã duyệt
- `LOCKED` - Đã khóa (immutable)

### BilExceptionType
- `MISSING_RATE` - Thiếu rate
- `DUP_EVENT` - Event trùng
- `ORPHAN_EVENT` - Event mồ côi
- `LATE_EVENT` - Event muộn
- `SNAPSHOT_FAIL` - Snapshot lỗi
- `ERP_FAIL` - ERP push lỗi
- `DATA_MISMATCH` - Dữ liệu không khớp

### BilExceptionSeverity
- `INFO` - Thông tin
- `WARN` - Cảnh báo
- `ERROR` - Lỗi
- `BLOCKER` - Chặn workflow
