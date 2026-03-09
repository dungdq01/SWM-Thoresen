# Frontend Module 11 — Reporting, Audit & Go-Live

**Ngày:** 2026-03-09 | **Trạng thái:** ❌ CHƯA BUILD

---

## 1. Scope

Dashboard tổng hợp, báo cáo inventory/billing/audit, reconciliation viewer, go-live checklist.

## 2. Trạng thái build

| Layer | Trạng thái | Ghi chú |
|-------|-----------|---------|
| Pages | ❌ 0 pages | Không có route, không có file |
| Domain layer | ❌ Không có | Không có `domains/reporting/` |
| Mock data | ❌ Không có | Không có `reporting.mock.js` |
| Route config | ❌ Không có | `routes.jsx` không có `/app/reporting` |

## 3. Pages cần build

| Route | Page | Mô tả | Role |
|-------|------|-------|------|
| `/app/reporting/dashboard` | `ReportingDashboardPage` | KPI dashboard tổng hợp | WH_MANAGER, OPS_SUPER |
| `/app/reporting/inventory` | `InventoryReportPage` | Báo cáo tồn kho (On-Hand Summary, Movement Summary) | All |
| `/app/reporting/billing` | `BillingReportPage` | Báo cáo doanh thu, outstanding DNs | BILLING_OFC, CUST_VIEWER |
| `/app/reporting/audit` | `AuditReportPage` | Searchable audit trail viewer | OPS_SUPER, ADMIN |
| `/app/reporting/reconciliation` | `ReconciliationPage` | RECON-001 results viewer | OPS_SUPER |
| `/app/reporting/go-live` | `GoLiveChecklistPage` | 12 gates GL-001..012 status | ADMIN, OPS_SUPER |

## 4. Domain cần tạo

```
src/domains/reporting/
├── api/reporting.api.js
│     reportingApi: {
│       getDashboard, getInventoryReport, getBillingReport,
│       getAuditReport, getReconciliationResults, getGoLiveStatus
│     }
└── hooks/useReporting.js
      useReportingDashboard, useInventoryReport, useBillingReport,
      useAuditReport, useReconciliation, useGoLiveChecklist
```

## 5. Mock data cần tạo

```
src/mocks/reporting.mock.js
  swm_mock_reporting_dashboard  → KPI numbers
  swm_mock_inventory_report     → aggregated on-hand by owner
  swm_mock_billing_report       → revenue by period/owner
  swm_mock_audit_report         → paginated audit log
  swm_mock_recon_results        → RECON-001 pass/fail history
  swm_mock_go_live_gates        → 12 gates status
```

## 6. Routes cần thêm vào `routes.jsx`

```js
const ReportingLayout = lazy(() => import('@pages/reporting').then(m => ({ default: m.ReportingLayout })))
const ReportingDashboardPage = lazy(...)
const InventoryReportPage = lazy(...)
// ... (6 pages)

{
  path: 'reporting',
  element: withSuspense(ReportingLayout),
  children: [
    { index: true, element: <Navigate to="/app/reporting/dashboard" replace /> },
    { path: 'dashboard', element: withSuspense(ReportingDashboardPage) },
    { path: 'inventory', element: withSuspense(InventoryReportPage) },
    { path: 'billing', element: withSuspense(BillingReportPage) },
    { path: 'audit', element: withSuspense(AuditReportPage) },
    { path: 'reconciliation', element: withSuspense(ReconciliationPage) },
    { path: 'go-live', element: withSuspense(GoLiveChecklistPage) },
  ],
}
```

## 7. Business Rules cần implement

| Rule | UI behavior |
|------|-------------|
| M11 chỉ đọc (không tạo business transaction) | Không có form create/edit trừ go-live gate controls |
| SQL On-Hand: `SUM(t.qty)` signed qty | InventoryReportPage tính và hiển thị đúng signed qty |
| Go-Live: 12 gates, tất cả PASS hoặc WAIVED | GoLiveChecklistPage: badge PASS/FAIL/WAIVED + reason input cho WAIVED |
| RECON-001: hourly, <=5 phút | ReconciliationPage: hiển thị duration, timestamp, PASS/FAIL |
| CUST_VIEWER: chỉ xem LOCKED DN + own owner | BillingReportPage: forced filter |

## 8. Ưu tiên build

```
Sprint 3 (theo Improve.md):
  1. ReportingDashboardPage (với Recharts thật — IMP-11)
  2. AuditReportPage (IMP-16)
  3. GoLiveChecklistPage (blocker cho go-live)
  4. ReconciliationPage

Sprint 4:
  5. InventoryReportPage
  6. BillingReportPage
```

## 9. Ghi chú

- Dashboard charts cần thư viện thật: **Recharts** hoặc **Chart.js** (IMP-11). Không dùng SVG placeholder
- `AuditReportPage` phải có pagination + date filter + entity type filter (spec M11 AC-AUD-1..3)
- `GoLiveChecklistPage` là gate cuối cùng trước khi hệ thống go-live — thiếu page này = không go-live được
