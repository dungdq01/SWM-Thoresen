# Frontend Module 11 — Reporting, Audit & Go-Live

**Ngày:** 2026-03-10 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Dashboard tổng hợp KPI, báo cáo inventory/billing/audit, reconciliation viewer, go-live checklist. Module read-only — không sinh business transaction.

## 2. Pages & Routes

| Route | Page Component | Mô tả | Role |
|-------|---------------|-------|------|
| `/app/reporting/dashboard` | `ReportingDashboardPage` | KPI dashboard tổng hợp + charts | WH_MANAGER, OPS_SUPER |
| `/app/reporting/inventory` | `InventoryReportPage` | Báo cáo On-Hand theo owner/location/status | All |
| `/app/reporting/billing` | `BillingReportPage` | Báo cáo doanh thu, outstanding DNs, by service type | BILLING_OFC, CUST_VIEWER |
| `/app/reporting/audit` | `AuditTrailPage` | Searchable audit trail với date filter + pagination | OPS_SUPER, ADMIN |
| `/app/reporting/reconciliation` | `ReconciliationPage` | RECON-001 results viewer (hourly runs) | OPS_SUPER |
| `/app/reporting/go-live` | `GoLiveChecklistPage` | 12 gates GL-001..012 status: PASS/FAIL/WAIVED | ADMIN, OPS_SUPER |

**Default redirect:** `/app/reporting` → `/app/reporting/dashboard`

**Tổng:** 6 pages + 1 layout (`ReportingLayout.jsx`)

## 3. Domain Layer

**Thư mục:** `src/domains/reporting/`

| File | Nội dung |
|------|---------|
| `api/reporting.api.js` | `reportingApi`: getDashboard, getInventoryReport, getBillingReport, getAuditLogs, getReconResults, getGoLiveGates, updateGoLiveGate |
| `hooks/useReporting.js` | useReportingDashboard, useInventoryReport, useBillingReport, useAuditLogs, useReconResults, useGoLiveGates, useUpdateGoLiveGate |

**TanStack Query staleTime:**
- Dashboard: 30s (auto-refetch mỗi 60s)
- Inventory Report: 15s
- Recon Results: 30s (auto-refetch mỗi 120s)
- Go-Live Gates: 10s

## 4. Mock Data

**File:** `src/mocks/reporting.mock.js`

| Collection (in-memory) | Sample data |
|------------------------|-------------|
| `dashboard` | KPIs: onHandQtyKg=142500, activeShipments=8, inboundToday=5, outboundToday=3, pendingBillingEvents=12, openAlerts=2, reconPassRate=97.8%, warehouseUtilPct=68%; kpiByOwner (3 owners); movementTrend (7 ngày) |
| `inventoryReport` | 7 rows: DPM/TCT/VNF items tại TVL-WH1; các cột onHandKg, reservedKg, availableKg, bagCount, statusCode |
| `billingReport` | Summary + byOwner (3 owners) + byServiceType (STORAGE/HANDLING_IN/HANDLING_OUT/VAS_BAGGING) |
| `auditLogs` | 12 entries: các entityType PO, INVENT_TRANS, SHIPMENT, DEBIT_NOTE, MOVE_ORDER, RATE_CARD, VAS_WORK_ORDER, CYCLE_COUNT, OWNER |
| `reconResults` | 8 runs RECON-001: 7 PASS + 1 FAIL (với discrepancy detail) |
| `goLiveGates` | 12 gates GL-001..012: 8 PASS, 2 FAIL (GL-009, GL-011, GL-012), 1 WAIVED (GL-010 Weighbridge) |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/reporting/dashboard/summary
GET  /api/v1/reporting/inventory/on-hand        ?ownerId, warehouseId, statusCode, keyword, page, limit
GET  /api/v1/reporting/billing/summary          ?ownerId, periodFrom, periodTo
GET  /api/v1/reporting/audit                    ?entityType, userId, action, dateFrom, dateTo, keyword, page, limit
GET  /api/v1/reporting/reconciliation/results   ?status, page, limit
GET  /api/v1/reporting/go-live/status
PUT  /api/v1/reporting/go-live/:id              { status, waivedReason, checkedBy }
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Module read-only | Không có form create/edit trừ Go-Live gate controls |
| Go-Live: 12 gates, tất cả PASS hoặc WAIVED | GoLiveChecklistPage: badge PASS/FAIL/WAIVED, nút cập nhật status + waivedReason input cho WAIVED |
| RECON-001: hourly, <=5 phút | ReconciliationPage: cột durationSec, timestamp, PASS/FAIL badge; FAIL row hiển thị discrepancy note |
| Audit trail immutable | AuditTrailPage chỉ read; có filter entityType/userId/action/date range |
| Inventory: available = onHand - reserved | InventoryReportPage 3 cột số: onHandKg / reservedKg / availableKg — màu đỏ nếu available <= 0 |
| CUST_VIEWER: chỉ xem owner của mình | BillingReportPage: forced filter theo ownerId của user |

## 7. Charts & Components

**ReportingDashboardPage** sử dụng các charting components thật (không phải SVG placeholder):
- `StatHighlight` — KPI cards (onHand, activeShipments, pendingBilling, openAlerts)
- `SummaryDonut` — phân bổ doanh thu theo service type
- `ProgressRing` — warehouse utilization %
- `TrendMiniChart` — movement trend 7 ngày (inbound vs outbound line chart)

Components nằm trong `src/shared/ui/` — dùng chung với các module khác.

## 8. Go-Live Gates (GL-001..012)

| Gate | Tên | Category | Trạng thái mock |
|------|-----|----------|----------------|
| GL-001 | Master Data Completeness | DATA | ✅ PASS |
| GL-002 | RBAC Roles & Permissions | SECURITY | ✅ PASS |
| GL-003 | Inbound Flow E2E | FUNCTIONAL | ✅ PASS |
| GL-004 | Outbound Flow E2E | FUNCTIONAL | ✅ PASS |
| GL-005 | Inventory Posting Correctness | INTEGRITY | ✅ PASS |
| GL-006 | Cycle Count & Adjustment | FUNCTIONAL | ✅ PASS |
| GL-007 | VAS / Bagging Flow | FUNCTIONAL | ✅ PASS |
| GL-008 | Billing Rate Cards & DN | BILLING | ✅ PASS |
| GL-009 | First Production Debit Note | BILLING | ❌ FAIL |
| GL-010 | Weighbridge Integration | INTEGRATION | ⚠️ WAIVED |
| GL-011 | OCR Integration | INTEGRATION | ❌ FAIL |
| GL-012 | UAT Sign-off | GOVERNANCE | ❌ FAIL |

## 9. Ghi chú

- `AuditTrailPage` (KHÔNG phải `AuditReportPage` như spec cũ) — tên file thực tế: `AuditTrailPage.jsx`
- Dashboard auto-refetch mỗi 60 giây — không cần manual refresh cho KPI
- `updateGoLiveGate` là mutation duy nhất trong M11 — chỉ ADMIN/OPS_SUPER được phép
- FA-06 đã FIX trong code: `reporting.api.js` dùng đúng sub-path `/reporting/dashboard/summary`, `/reporting/inventory/on-hand`, `/reporting/billing/summary`, `/reporting/audit` (không phải `/reporting/summary`, `/reporting/on-hand` như spec gốc)
- Backend M11 cần implement: `ReportingModule`, `ReportingController`, aggregation queries; Go-Live gates cần `GoLiveGate` entity trong DB
