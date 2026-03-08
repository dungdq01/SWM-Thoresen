# Module 11: Reporting, Audit & Go-Live Control

## 1. Mục đích

Module 11 là **read-heavy control layer** của hệ thống SWM, cung cấp:
- **Dashboard**: Tổng hợp KPIs từ các module M4-M10
- **Inventory Reports**: On-hand, movement, aging, inbound/outbound summary, utilization
- **Billing Reports**: Billing events, debit notes, revenue summary, unbilled exceptions
- **Audit Reports**: User activity, state transitions, posting trace
- **Reconciliation Engine**: Phát hiện mismatch giữa các nguồn dữ liệu
- **Go-Live Control**: Quản lý gate matrix và sign-off workflow
- **Export Engine**: Async export CSV/PDF

**Lưu ý quan trọng:**
- Module 11 **KHÔNG TẠO** business truth mới
- Module 11 **CHỈ ĐỌC** dữ liệu từ các module khác
- Module 11 **SỞ HỮU** các control tables (export_job, reconciliation_*, go_live_*)

---

## 2. Code Structure

```
src/modules/reporting/
├── reporting.module.ts
├── controllers/
│   ├── dashboard.controller.ts
│   ├── inventory-report.controller.ts
│   ├── reconciliation.controller.ts
│   ├── go-live.controller.ts
│   └── export.controller.ts
├── services/
│   ├── dashboard.service.ts
│   ├── inventory-report.service.ts
│   ├── reconciliation.service.ts
│   ├── go-live.service.ts
│   └── export.service.ts
├── repositories/
│   ├── dashboard.repository.ts
│   ├── inventory-report.repository.ts
│   ├── reconciliation.repository.ts
│   ├── go-live.repository.ts
│   └── export-job.repository.ts
├── dto/
│   ├── dashboard.dto.ts
│   ├── report-filter.dto.ts
│   ├── reconciliation.dto.ts
│   ├── go-live.dto.ts
│   └── export.dto.ts
└── domain/
    ├── reporting.enums.ts
    ├── reporting.errors.ts
    └── reporting.constants.ts
```

---

## 3. API Endpoints

### 3.1 Dashboard APIs

#### GET /api/v1/reporting/dashboard/summary
**Mô tả:** Lấy tổng hợp các widget dashboard

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| ownerId | UUID | No | Filter theo owner |
| warehouseId | UUID | No | Filter theo warehouse |
| date | string | No | Ngày report (ISO format), default: today |

**Response:**
```json
{
  "widgets": [
    {
      "code": "INBOUND_TODAY",
      "label": "Inbound Today",
      "value": 15,
      "subValue": 245.5,
      "unit": "receipt / MT",
      "stale": false
    }
  ],
  "lastRefreshedAt": "2024-03-09T10:30:00Z",
  "appliedFilters": {
    "date": "2024-03-09"
  }
}
```

**Files liên quan:**
- `controllers/dashboard.controller.ts`
- `services/dashboard.service.ts`
- `repositories/dashboard.repository.ts`

---

#### GET /api/v1/reporting/dashboard/widgets/:code
**Mô tả:** Lấy data của một widget cụ thể

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| code | string | Widget code (INBOUND_TODAY, OUTBOUND_TODAY, WORK_QUEUE, etc.) |

---

### 3.2 Inventory Report APIs

#### GET /api/v1/reporting/inventory/on-hand
**Mô tả:** Báo cáo tồn kho hiện tại

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| ownerId | UUID | No | Filter theo owner |
| warehouseId | UUID | No | Filter theo warehouse |
| itemId | UUID | No | Filter theo item |
| inventoryStatus | string | No | Filter theo status |
| page | number | No | Page number (default: 1) |
| pageSize | number | No | Page size (max: 500) |

**Response:**
```json
{
  "data": [
    {
      "warehouseCode": "WH01",
      "warehouseName": "Kho chính",
      "ownerCode": "OWNER01",
      "ownerName": "Khách hàng A",
      "itemCode": "ITEM001",
      "itemName": "Gạo thơm",
      "inventoryStatus": "AVAILABLE",
      "qty": 1000.5,
      "reservedQty": 50.0,
      "availableQty": 950.5
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 150,
    "totalPages": 3
  },
  "totals": {
    "totalQty": 50000,
    "totalReserved": 2500,
    "totalAvailable": 47500
  },
  "generatedAt": "2024-03-09T10:30:00Z"
}
```

**Files liên quan:**
- `controllers/inventory-report.controller.ts`
- `services/inventory-report.service.ts`
- `repositories/inventory-report.repository.ts`

---

#### GET /api/v1/reporting/inventory/movement
**Mô tả:** Lịch sử movement inventory

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| fromDate | string | No | Từ ngày (ISO format) |
| toDate | string | No | Đến ngày (ISO format) |
| transType | string | No | Loại transaction |
| itemId | UUID | No | Filter theo item |

---

#### GET /api/v1/reporting/inventory/aging
**Mô tả:** Báo cáo aging inventory

#### GET /api/v1/reporting/inventory/inbound-summary
**Mô tả:** Tổng hợp inbound

#### GET /api/v1/reporting/inventory/outbound-summary
**Mô tả:** Tổng hợp outbound

#### GET /api/v1/reporting/inventory/utilization
**Mô tả:** Báo cáo sử dụng location

---

### 3.3 Reconciliation APIs

#### POST /api/v1/reporting/reconciliation/run
**Mô tả:** Trigger chạy reconciliation

**Request Body:**
```json
{
  "checkIds": ["RECON-001", "RECON-002"],
  "warehouseId": "uuid-optional",
  "ownerId": "uuid-optional",
  "fromDate": "2024-03-01",
  "toDate": "2024-03-09"
}
```

**Response:**
```json
{
  "runId": "abc123-uuid",
  "triggerType": "MANUAL",
  "checkIds": ["RECON-001", "RECON-002"],
  "runStatus": "QUEUED",
  "acceptedChecksCount": 2,
  "completedChecksCount": 0,
  "createdAt": "2024-03-09T10:30:00Z"
}
```

**Files liên quan:**
- `controllers/reconciliation.controller.ts`
- `services/reconciliation.service.ts`
- `repositories/reconciliation.repository.ts`

---

#### GET /api/v1/reporting/reconciliation/results
**Mô tả:** Danh sách kết quả reconciliation

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| checkId | string | Filter theo check ID |
| resultStatus | enum | PASS, WARNING, FAIL |
| severity | enum | LOW, MEDIUM, HIGH, CRITICAL |
| isResolved | boolean | Filter theo trạng thái resolved |

---

#### GET /api/v1/reporting/reconciliation/results/:id
**Mô tả:** Chi tiết một kết quả reconciliation

---

#### POST /api/v1/reporting/reconciliation/results/:id/resolve
**Mô tả:** Resolve một mismatch

**Request Body:**
```json
{
  "resolutionNote": "Đã kiểm tra và xác nhận số liệu đúng",
  "evidenceRef": "ticket-123",
  "sourceModule": "M3",
  "sourceRefId": "trans-id-xxx"
}
```

---

### 3.4 Go-Live Control APIs

#### GET /api/v1/reporting/go-live/status
**Mô tả:** Lấy trạng thái go-live tổng quan

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| snapshotNo | string | Snapshot number (default: CURRENT) |
| milestone | enum | BEFORE_SIT, BEFORE_UAT, BEFORE_GO_LIVE |

**Response:**
```json
{
  "snapshotNo": "CURRENT",
  "milestone": "BEFORE_GO_LIVE",
  "overallStatus": "PENDING",
  "gates": [
    {
      "gateId": "GL-001",
      "gateName": "Master Data Completeness",
      "gateType": "AUTO",
      "milestone": "BEFORE_UAT",
      "waiverAllowed": false,
      "currentStatus": {
        "status": "PASS",
        "lastCheckType": "AUTO",
        "effectiveAt": "2024-03-09T10:00:00Z"
      }
    }
  ],
  "summary": {
    "total": 10,
    "passed": 5,
    "failed": 1,
    "waived": 0,
    "pending": 4
  }
}
```

**Files liên quan:**
- `controllers/go-live.controller.ts`
- `services/go-live.service.ts`
- `repositories/go-live.repository.ts`

---

#### POST /api/v1/reporting/go-live/check
**Mô tả:** Chạy auto check các gate

#### POST /api/v1/reporting/go-live/gates/:id/sign-off
**Mô tả:** Manual sign-off một gate

**Request Body:**
```json
{
  "status": "PASS",
  "note": "Đã kiểm tra và đạt yêu cầu",
  "evidenceRef": "doc-link",
  "waiverReason": "required if status=WAIVED"
}
```

#### GET /api/v1/reporting/go-live/history
**Mô tả:** Lịch sử sign-off

---

### 3.5 Export APIs

#### POST /api/v1/reporting/exports
**Mô tả:** Tạo export job

**Request Body:**
```json
{
  "reportId": "RPT-INV-001",
  "exportFormat": "CSV",
  "filters": {
    "ownerId": "uuid",
    "fromDate": "2024-03-01",
    "toDate": "2024-03-09"
  }
}
```

**Response:**
```json
{
  "exportJobId": "job-uuid",
  "reportId": "RPT-INV-001",
  "exportFormat": "CSV",
  "jobStatus": "QUEUED",
  "createdAt": "2024-03-09T10:30:00Z"
}
```

**Files liên quan:**
- `controllers/export.controller.ts`
- `services/export.service.ts`
- `repositories/export-job.repository.ts`

---

#### GET /api/v1/reporting/exports/:id
**Mô tả:** Lấy trạng thái export job

#### GET /api/v1/reporting/exports/:id/download
**Mô tả:** Download file export

---

## 4. Business Rules

### 4.1 Dashboard
- Cache TTL: 60 giây cho critical widgets
- Stale fallback khi source timeout
- CUST_VIEWER chỉ thấy owner scope của mình

### 4.2 Reports
- Date range limit: 92 ngày cho screen query
- Page size max: 500 cho screen
- Scope filter enforce ở backend

### 4.3 Reconciliation
- Không auto-fix mismatch
- Result immutable theo từng run
- Resolve cần note/evidence
- Idempotency window: 10 phút

### 4.4 Go-Live
- Auto gate chạy từ data modules nguồn
- Manual sign-off cần quyền cao
- Waiver cần waiver_reason
- History không xóa

### 4.5 Export
- CSV > 5000 rows → async
- PDF > 10000 rows → reject
- File expires_at + cleanup job
- Download re-check permission

---

## 5. Error Codes

| Code | Description |
|------|-------------|
| RPT_NOT_FOUND | Report không tồn tại |
| EXPORT_JOB_NOT_FOUND | Export job không tồn tại |
| EXPORT_JOB_EXPIRED | Export job đã hết hạn |
| EXPORT_ROW_LIMIT_EXCEEDED | Vượt quá số dòng cho phép |
| RECON_RUN_NOT_FOUND | Reconciliation run không tồn tại |
| RECON_RESULT_NOT_FOUND | Reconciliation result không tồn tại |
| RECON_ALREADY_RESOLVED | Đã resolved trước đó |
| GOLIVE_GATE_NOT_FOUND | Gate không tồn tại |
| GOLIVE_SIGNOFF_NOT_ALLOWED | Không được phép sign-off |
| GOLIVE_WAIVER_REQUIRED | Cần waiver reason |
| SCOPE_ACCESS_DENIED | Không có quyền truy cập scope |
| DATE_RANGE_EXCEEDED | Vượt quá date range cho phép |

---

## 6. RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| REPORTING.DASHBOARD.READ | Xem dashboard |
| REPORTING.INVENTORY.READ | Xem inventory reports |
| REPORTING.BILLING.READ | Xem billing reports |
| REPORTING.AUDIT.READ | Xem audit reports |
| REPORTING.RECONCILIATION.RUN | Chạy reconciliation |
| REPORTING.RECONCILIATION.READ | Xem kết quả reconciliation |
| REPORTING.RECONCILIATION.RESOLVE | Resolve mismatch |
| REPORTING.GOLIVE.READ | Xem go-live status |
| REPORTING.GOLIVE.CHECK | Chạy go-live checks |
| REPORTING.GOLIVE.SIGNOFF | Sign-off gates |
| REPORTING.EXPORT.CREATE | Tạo export jobs |
| REPORTING.EXPORT.READ | Xem/download exports |
