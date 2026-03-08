# Module 11: Reporting, Audit & Go-Live Control — Implementation Plan

**Version:** 1.0  
**Date:** 2026-03-09  
**Status:** In Progress

---

## 1. Mô tả nghiệp vụ

Module 11 là **read-heavy control layer** của toàn hệ thống SWM, chịu trách nhiệm:

- **Dashboard**: Tổng hợp KPIs từ M4-M10 cho ops/manager/customer
- **Inventory Reports**: On-hand, movement, aging, shrinkage, utilization
- **Billing Reports**: Events, debit notes, revenue, unbilled exceptions  
- **Audit Reports**: User activity, state transitions, posting trace
- **Reconciliation Engine**: Detect mismatch, không auto-fix, lưu history
- **Go-Live Control**: Gate matrix, auto/manual check, sign-off workflow
- **Export Engine**: CSV/PDF async export với job queue

**Ownership boundary:**
- M11 **SỞ HỮU**: control tables (export_job, reconciliation_run/result, go_live_gate/status)
- M11 **KHÔNG SỞ HỮU**: inventory truth (invent_trans, on_hand), billing objects (billing_event, debit_note)

---

## 2. Database Tables (12 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `rpt_export_job` | Export job header | Export |
| `rpt_export_job_event` | Export job events | Export |
| `rpt_reconciliation_run` | Reconciliation run header | Reconciliation |
| `rpt_reconciliation_result` | Reconciliation mismatch results | Reconciliation |
| `rpt_reconciliation_resolution` | Resolution history | Reconciliation |
| `rpt_go_live_gate` | Gate catalog | Go-Live |
| `rpt_go_live_gate_status` | Effective gate status | Go-Live |
| `rpt_go_live_signoff_history` | Sign-off history | Go-Live |
| `rpt_report_run_log` | Report execution log | Logging |
| `rpt_dashboard_cache` | Dashboard widget cache | Cache |
| `rpt_reconciliation_check` | Check catalog | Config |
| `rpt_report_catalog` | Report catalog | Config |

---

## 3. Dependencies

### Module 11 depends on:
| Module | Usage |
|--------|-------|
| Module 1 | NumberSequence, ReasonCode, AuditLog, Idempotency |
| Module 2 | MdOwner, MdWarehouse, MdItem, MdLocation |
| Module 3 | InventTrans, OnHand, InventDim (read-only) |
| Module 4 | Receipt data (read-only) |
| Module 5 | Shipment data (read-only) |
| Module 6 | IC documents (read-only) |
| Module 7 | Work data (read-only) |
| Module 8 | Weighbridge/OCR data (read-only) |
| Module 9 | VAS data (read-only) |
| Module 10 | Billing events, DN data (read-only) |

---

## 4. API Endpoints

### 4.1 Dashboard (2 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/dashboard/summary` | Dashboard widgets summary |
| GET | `/api/v1/reporting/dashboard/widgets/:code` | Single widget data |

### 4.2 Inventory Reports (6 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/inventory/on-hand` | On-hand report |
| GET | `/api/v1/reporting/inventory/movement` | Movement history |
| GET | `/api/v1/reporting/inventory/aging` | Aging report |
| GET | `/api/v1/reporting/inventory/inbound-summary` | Inbound summary |
| GET | `/api/v1/reporting/inventory/outbound-summary` | Outbound summary |
| GET | `/api/v1/reporting/inventory/utilization` | Location utilization |

### 4.3 Billing Reports (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/billing/events` | Billing events report |
| GET | `/api/v1/reporting/billing/debit-notes` | DN report |
| GET | `/api/v1/reporting/billing/revenue-summary` | Revenue summary |
| GET | `/api/v1/reporting/billing/unbilled-exceptions` | Unbilled exceptions |

### 4.4 Audit Reports (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/audit/user-activity` | User activity log |
| GET | `/api/v1/reporting/audit/state-transitions` | State transition log |
| GET | `/api/v1/reporting/audit/posting-trace` | Posting trace detail |

### 4.5 Reconciliation (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reporting/reconciliation/run` | Trigger reconciliation |
| GET | `/api/v1/reporting/reconciliation/results` | List results |
| GET | `/api/v1/reporting/reconciliation/results/:id` | Get result detail |
| POST | `/api/v1/reporting/reconciliation/results/:id/resolve` | Resolve mismatch |

### 4.6 Go-Live Control (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/go-live/status` | Overall readiness status |
| POST | `/api/v1/reporting/go-live/check` | Run auto gate checks |
| POST | `/api/v1/reporting/go-live/gates/:id/sign-off` | Manual sign-off |
| GET | `/api/v1/reporting/go-live/history` | Sign-off history |

### 4.7 Export (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reporting/exports` | Create export job |
| GET | `/api/v1/reporting/exports/:id` | Get export status |
| GET | `/api/v1/reporting/exports/:id/download` | Download file |

**Total: 26 endpoints**

---

## 5. Business Rules & Acceptance Criteria

### 5.1 Dashboard
- [x] Polling ≤ 60s cho critical widgets
- [x] Stale fallback khi source timeout
- [x] CUST_VIEWER chỉ thấy owner scope của mình

### 5.2 Reports
- [x] Date range limit 92 ngày cho screen query
- [x] Page size max 500 cho screen
- [x] Scope filter enforce ở backend

### 5.3 Reconciliation
- [x] Không auto-fix mismatch
- [x] Result immutable theo từng run
- [x] Resolve cần note/evidence
- [x] Idempotency window 10 phút

### 5.4 Go-Live
- [x] Auto gate chạy từ data modules nguồn
- [x] Manual sign-off cần quyền cao
- [x] Waiver cần waiver_reason
- [x] History không xóa

### 5.5 Export
- [x] CSV > 5000 rows → async
- [x] PDF > 10000 rows → reject
- [x] File expires_at + cleanup job
- [x] Download re-check permission

---

## 6. Code Structure

```
src/modules/reporting/
├── reporting.module.ts
├── controllers/
│   ├── dashboard.controller.ts
│   ├── inventory-report.controller.ts
│   ├── billing-report.controller.ts
│   ├── audit-report.controller.ts
│   ├── reconciliation.controller.ts
│   ├── go-live.controller.ts
│   └── export.controller.ts
├── services/
│   ├── dashboard.service.ts
│   ├── inventory-report.service.ts
│   ├── billing-report.service.ts
│   ├── audit-report.service.ts
│   ├── reconciliation.service.ts
│   ├── go-live.service.ts
│   ├── export.service.ts
│   └── scope-filter.service.ts
├── repositories/
│   ├── dashboard.repository.ts
│   ├── inventory-report.repository.ts
│   ├── billing-report.repository.ts
│   ├── audit-report.repository.ts
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

## 7. RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `REPORTING.DASHBOARD.READ` | View dashboard |
| `REPORTING.INVENTORY.READ` | View inventory reports |
| `REPORTING.BILLING.READ` | View billing reports |
| `REPORTING.AUDIT.READ` | View audit reports |
| `REPORTING.RECONCILIATION.RUN` | Run reconciliation |
| `REPORTING.RECONCILIATION.READ` | View reconciliation results |
| `REPORTING.RECONCILIATION.RESOLVE` | Resolve mismatch |
| `REPORTING.GOLIVE.READ` | View go-live status |
| `REPORTING.GOLIVE.CHECK` | Run go-live checks |
| `REPORTING.GOLIVE.SIGNOFF` | Sign-off gates |
| `REPORTING.EXPORT.CREATE` | Create export jobs |
| `REPORTING.EXPORT.READ` | View/download exports |

---

## 8. Implementation Phases

### Phase 1: Foundation (Current)
- [x] Plan & design
- [ ] Database schema (12 tables)
- [ ] Seed data (gate catalog, check catalog, report catalog)

### Phase 2: Core Reports
- [ ] Dashboard APIs
- [ ] Inventory reports
- [ ] Billing reports
- [ ] Audit reports

### Phase 3: Control Features
- [ ] Reconciliation engine
- [ ] Go-live control
- [ ] Export engine

### Phase 4: Hardening
- [ ] Cache layer
- [ ] Performance tuning
- [ ] Security tests
