# Module 11: Reporting Database Schema

**Status:** ✅ Implemented  
**Version:** 1.1.0  
**Last Updated:** 2026-03-09  
**API Docs:** [`backend/docs/module-11-reporting.md`](../../docs/module-11-reporting.md)

---

## Tổng quan

Module 11 sở hữu **12 tables** cho các chức năng reporting, reconciliation, go-live control và export.

---

## 1. Enums

### RptExportJobStatus
| Value | Description |
|-------|-------------|
| QUEUED | Job đang chờ xử lý |
| RUNNING | Job đang chạy |
| COMPLETED | Job hoàn thành |
| FAILED | Job thất bại |
| EXPIRED | Job đã hết hạn |

### RptExportFormat
| Value | Description |
|-------|-------------|
| CSV | File CSV |
| PDF | File PDF |

### RptReconciliationRunStatus
| Value | Description |
|-------|-------------|
| QUEUED | Run đang chờ |
| RUNNING | Run đang chạy |
| COMPLETED | Run hoàn thành |
| FAILED | Run thất bại |

### RptReconciliationTriggerType
| Value | Description |
|-------|-------------|
| MANUAL | Trigger thủ công |
| SCHEDULED | Trigger theo lịch |

### RptReconciliationResultStatus
| Value | Description |
|-------|-------------|
| PASS | Không có mismatch |
| WARNING | Có variance nhỏ |
| FAIL | Có mismatch |

### RptReconciliationSeverity
| Value | Description |
|-------|-------------|
| LOW | Mức độ thấp |
| MEDIUM | Mức độ trung bình |
| HIGH | Mức độ cao |
| CRITICAL | Mức độ nghiêm trọng |

### RptGoLiveGateType
| Value | Description |
|-------|-------------|
| AUTO | Gate tự động check |
| MANUAL | Gate cần sign-off thủ công |

### RptGoLiveMilestone
| Value | Description |
|-------|-------------|
| BEFORE_SIT | Trước SIT |
| BEFORE_UAT | Trước UAT |
| BEFORE_GO_LIVE | Trước Go-Live |

### RptGoLiveGateStatus
| Value | Description |
|-------|-------------|
| PASS | Gate đạt |
| FAIL | Gate không đạt |
| WAIVED | Gate được waive |
| PENDING | Gate chưa check |

---

## 2. Tables

### 2.1 rpt_report_catalog

**Mô tả:** Catalog các report có sẵn trong hệ thống

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| report_id | VARCHAR(50) | No | Report ID (unique) |
| report_name | VARCHAR(150) | No | Tên report |
| report_group | VARCHAR(50) | No | Nhóm report (INVENTORY, BILLING, AUDIT) |
| description | TEXT | Yes | Mô tả |
| source_module | VARCHAR(20) | No | Module nguồn dữ liệu |
| allow_export | BOOLEAN | No | Cho phép export |
| max_export_rows | INT | Yes | Số dòng tối đa export |
| is_active | BOOLEAN | No | Trạng thái active |
| created_at | TIMESTAMP | No | Thời điểm tạo |
| updated_at | TIMESTAMP | No | Thời điểm cập nhật |

**Indexes:**
- `report_group, is_active`

---

### 2.2 rpt_reconciliation_check

**Mô tả:** Catalog các check reconciliation

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| check_id | VARCHAR(30) | No | Check ID (unique) |
| check_name | VARCHAR(150) | No | Tên check |
| description | TEXT | Yes | Mô tả |
| source_module | VARCHAR(20) | No | Module nguồn |
| compare_with | VARCHAR(100) | No | So sánh với gì |
| check_query | TEXT | Yes | Query SQL |
| is_active | BOOLEAN | No | Trạng thái active |
| sort_order | INT | No | Thứ tự |
| created_at | TIMESTAMP | No | Thời điểm tạo |
| updated_at | TIMESTAMP | No | Thời điểm cập nhật |

**Indexes:**
- `source_module, is_active`

---

### 2.3 rpt_export_job

**Mô tả:** Header của export job

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| export_job_id | VARCHAR(36) | No | Export job ID (unique) |
| report_catalog_id | UUID | Yes | FK → rpt_report_catalog |
| report_id | VARCHAR(50) | No | Report ID |
| export_format | ENUM | No | CSV hoặc PDF |
| requested_by | UUID | No | User ID yêu cầu |
| requested_role | VARCHAR(30) | No | Role của user |
| owner_scope_id | UUID | Yes | Owner scope |
| warehouse_scope_json | JSON | Yes | Warehouse scope |
| filter_payload | JSON | No | Filter parameters |
| job_status | ENUM | No | Trạng thái job |
| row_count | INT | Yes | Số dòng export |
| file_uri | TEXT | Yes | URI file |
| file_size_bytes | BIGINT | Yes | Kích thước file |
| checksum_sha256 | VARCHAR(64) | Yes | Checksum SHA256 |
| expires_at | TIMESTAMP | Yes | Thời điểm hết hạn |
| failure_reason | TEXT | Yes | Lý do lỗi |
| idempotency_key | VARCHAR(100) | Yes | Idempotency key |
| correlation_id | UUID | No | Correlation ID |
| created_at | TIMESTAMP | No | Thời điểm tạo |
| updated_at | TIMESTAMP | No | Thời điểm cập nhật |

**Indexes:**
- `requested_by, created_at DESC`
- `job_status, created_at DESC`
- `report_id, created_at DESC`
- `expires_at`
- `idempotency_key`

---

### 2.4 rpt_export_job_event

**Mô tả:** Events của export job

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| export_job_id | UUID | No | FK → rpt_export_job |
| event_type | VARCHAR(30) | No | Loại event |
| event_payload | JSON | Yes | Payload |
| created_by | UUID | Yes | User ID tạo |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Indexes:**
- `export_job_id, created_at DESC`

---

### 2.5 rpt_reconciliation_run

**Mô tả:** Header của reconciliation run

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| run_id | VARCHAR(36) | No | Run ID (unique) |
| trigger_type | ENUM | No | MANUAL hoặc SCHEDULED |
| requested_by | UUID | Yes | User ID yêu cầu |
| check_ids | JSON | No | Danh sách check IDs |
| run_scope | JSON | No | Scope của run |
| run_status | ENUM | No | Trạng thái run |
| accepted_checks_count | INT | No | Số check được accept |
| completed_checks_count | INT | No | Số check hoàn thành |
| failure_reason | TEXT | Yes | Lý do lỗi |
| idempotency_key | VARCHAR(100) | Yes | Idempotency key |
| correlation_id | UUID | No | Correlation ID |
| started_at | TIMESTAMP | Yes | Thời điểm bắt đầu |
| completed_at | TIMESTAMP | Yes | Thời điểm hoàn thành |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Indexes:**
- `run_status, created_at DESC`
- `requested_by, created_at DESC`
- `idempotency_key`

---

### 2.6 rpt_reconciliation_result

**Mô tả:** Kết quả của mỗi check trong run

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| result_id | VARCHAR(36) | No | Result ID (unique) |
| run_id | UUID | No | FK → rpt_reconciliation_run |
| check_id | UUID | No | FK → rpt_reconciliation_check |
| check_code | VARCHAR(30) | No | Check code |
| check_name | VARCHAR(100) | No | Check name |
| result_status | ENUM | No | PASS, WARNING, FAIL |
| severity | ENUM | No | Mức độ nghiêm trọng |
| dimension_key | JSON | Yes | Key dimension |
| source_module | VARCHAR(20) | No | Module nguồn |
| source_ref_type | VARCHAR(30) | Yes | Loại ref |
| source_ref_id | VARCHAR(50) | Yes | Ref ID |
| expected_value | DECIMAL(20,3) | Yes | Giá trị expected |
| actual_value | DECIMAL(20,3) | Yes | Giá trị actual |
| variance_value | DECIMAL(20,3) | Yes | Variance |
| mismatch_detail | JSON | Yes | Chi tiết mismatch |
| is_resolved | BOOLEAN | No | Đã resolved |
| resolved_at | TIMESTAMP | Yes | Thời điểm resolved |
| resolved_by | UUID | Yes | User ID resolved |
| resolution_note | TEXT | Yes | Note resolved |
| evidence_ref | TEXT | Yes | Evidence reference |
| supersedes_result_id | UUID | Yes | Supersede result |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Indexes:**
- `check_code, created_at DESC`
- `result_status, severity, created_at DESC`
- `is_resolved, severity, created_at DESC`
- `source_module, source_ref_id`

---

### 2.7 rpt_reconciliation_resolution

**Mô tả:** Lịch sử resolution của result

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| reconciliation_result_id | UUID | No | FK → rpt_reconciliation_result |
| action_type | ENUM | No | RESOLVED, REOPENED, COMMENT |
| resolution_note | TEXT | No | Note |
| evidence_ref | TEXT | Yes | Evidence reference |
| source_module | VARCHAR(20) | Yes | Module nguồn fix |
| source_ref_id | VARCHAR(50) | Yes | Ref ID fix |
| created_by | UUID | No | User ID tạo |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Indexes:**
- `reconciliation_result_id, created_at DESC`

---

### 2.8 rpt_go_live_gate

**Mô tả:** Catalog các gate go-live

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| gate_id | VARCHAR(20) | No | Gate ID (unique) |
| gate_name | VARCHAR(150) | No | Tên gate |
| gate_type | ENUM | No | AUTO hoặc MANUAL |
| owner_role | VARCHAR(30) | No | Role owner |
| reviewer_role | VARCHAR(30) | No | Role reviewer |
| milestone | ENUM | No | Milestone |
| waiver_allowed | BOOLEAN | No | Cho phép waive |
| is_active | BOOLEAN | No | Trạng thái active |
| check_config | JSON | Yes | Config check |
| display_order | INT | No | Thứ tự hiển thị |
| created_at | TIMESTAMP | No | Thời điểm tạo |
| updated_at | TIMESTAMP | No | Thời điểm cập nhật |

**Indexes:**
- `milestone, is_active`

---

### 2.9 rpt_go_live_gate_status

**Mô tả:** Trạng thái effective của gate

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| gate_id | UUID | No | FK → rpt_go_live_gate |
| snapshot_no | VARCHAR(30) | No | Snapshot number |
| status | ENUM | No | PASS, FAIL, WAIVED, PENDING |
| last_check_type | ENUM | No | Loại check cuối |
| last_run_ref | VARCHAR(36) | Yes | Ref run cuối |
| effective_at | TIMESTAMP | No | Thời điểm effective |
| effective_by | UUID | Yes | User ID |
| evidence_ref | TEXT | Yes | Evidence reference |
| note | TEXT | Yes | Note |
| waiver_reason | TEXT | Yes | Lý do waive |
| created_at | TIMESTAMP | No | Thời điểm tạo |
| updated_at | TIMESTAMP | No | Thời điểm cập nhật |

**Unique Constraint:** `gate_id, snapshot_no`

**Indexes:**
- `snapshot_no, status`

---

### 2.10 rpt_go_live_signoff_history

**Mô tả:** Lịch sử sign-off

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| gate_status_id | UUID | No | FK → rpt_go_live_gate_status |
| gate_code | VARCHAR(20) | No | Gate code |
| action_status | ENUM | No | Trạng thái action |
| note | TEXT | No | Note |
| evidence_ref | TEXT | Yes | Evidence reference |
| waiver_reason | TEXT | Yes | Lý do waive |
| signed_by | UUID | No | User ID sign |
| signed_at | TIMESTAMP | No | Thời điểm sign |

**Indexes:**
- `gate_status_id, signed_at DESC`

---

### 2.11 rpt_report_run_log

**Mô tả:** Log chạy report

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| report_catalog_id | UUID | Yes | FK → rpt_report_catalog |
| report_id | VARCHAR(50) | No | Report ID |
| run_mode | ENUM | No | SCREEN, EXPORT, API |
| requested_by | UUID | No | User ID yêu cầu |
| filter_payload | JSON | No | Filter parameters |
| duration_ms | INT | Yes | Thời gian chạy (ms) |
| row_count | INT | Yes | Số dòng trả về |
| cache_hit | BOOLEAN | No | Cache hit |
| status | ENUM | No | SUCCESS, FAILED |
| error_code | VARCHAR(50) | Yes | Error code |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Indexes:**
- `report_id, created_at DESC`
- `requested_by, created_at DESC`
- `status, created_at DESC`

---

### 2.12 rpt_dashboard_cache

**Mô tả:** Cache dashboard widgets

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| widget_code | VARCHAR(50) | No | Widget code |
| cache_key | VARCHAR(150) | No | Cache key |
| cache_payload | JSON | No | Cache data |
| source_fresh_at | TIMESTAMP | No | Thời điểm data fresh |
| expires_at | TIMESTAMP | No | Thời điểm hết hạn |
| created_at | TIMESTAMP | No | Thời điểm tạo |

**Unique Constraint:** `widget_code, cache_key`

**Indexes:**
- `expires_at`

---

## 3. Relationships

```
rpt_report_catalog
  └── rpt_export_job (1:N)
  └── rpt_report_run_log (1:N)

rpt_reconciliation_check
  └── rpt_reconciliation_result (1:N)

rpt_reconciliation_run
  └── rpt_reconciliation_result (1:N)

rpt_reconciliation_result
  └── rpt_reconciliation_resolution (1:N)

rpt_export_job
  └── rpt_export_job_event (1:N)

rpt_go_live_gate
  └── rpt_go_live_gate_status (1:N)

rpt_go_live_gate_status
  └── rpt_go_live_signoff_history (1:N)
```

---

## 4. Seed Data

### Report Catalog
- RPT-INV-001: On-Hand Report
- RPT-INV-002: Movement History
- RPT-INV-003: Aging Report
- RPT-BIL-001: Billing Events
- RPT-BIL-002: Debit Notes
- RPT-AUD-001: User Activity Log

### Reconciliation Checks
- RECON-001: OnHand vs InventTrans SUM
- RECON-002: Billing Event Completeness
- RECON-003: DN Line Completeness
- RECON-004 → RECON-009

### Go-Live Gates
- GL-001: Master Data Completeness
- GL-002: RBAC Configured
- GL-003 → GL-010
