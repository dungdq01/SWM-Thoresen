# Frontend Module 10 — Billing & Commercial Control

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE (⚠️ StorageSnapshot backend là placeholder)

---

## 1. Scope

Giao diện billing: Invoices (Debit Notes), Rate Cards, Billable Events, Billing Dashboard.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/billing/invoices` | `InvoicesPage` | Danh sách Debit Notes: DRAFT → LOCKED → SENT |
| `/app/billing/rate-cards` | `RateCardsPage` | Config rate cards: storage, handling, bagging, container |
| `/app/billing/events` | `BillableEventsPage` | Danh sách billing events theo owner/period |
| `/app/billing/dashboard` | `BillingDashboardPage` | Tổng hợp revenue, outstanding DNs, top clients |

**Default redirect:** `/app/billing` → `/app/billing/invoices`

## 3. Domain Layer

**Thư mục:** `src/domains/billing/`

| File | Nội dung |
|------|---------|
| `api/billing.api.js` | invoiceApi, rateCardApi, billableEventApi, billingDashboardApi |
| `hooks/useBilling.js` | useInvoiceList, useCreateInvoice, useLockInvoice, useRateCardList, useBillableEvents, useBillingDashboard |

## 4. Mock Data

**File:** `src/mocks/billing.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_debit_notes` | 8 DNs: DRAFT (2), LOCKED (3), SENT (3) — từ nhiều owners |
| `swm_mock_rate_cards` | Rate cards: storage/MT/day, handling/trip, bagging/bag, container stuffing/container |
| `swm_mock_billing_events` | 20+ events: STORAGE_DAILY, HANDLING_IN, HANDLING_OUT, BAGGING, CONTAINER_STUFFING |
| `swm_mock_billing_dashboard` | Revenue stats, outstanding amount, top 5 clients |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/billing/invoices
POST /api/v1/billing/invoices
GET  /api/v1/billing/invoices/:id
POST /api/v1/billing/invoices/:id/lock
POST /api/v1/billing/invoices/:id/send
GET  /api/v1/billing/rate-cards
POST /api/v1/billing/rate-cards
PUT  /api/v1/billing/rate-cards/:id
GET  /api/v1/billing/events
GET  /api/v1/billing/dashboard
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Chỉ CUST_VIEWER xem LOCKED DN của owner mình | `InvoicesPage` filter forced: nếu role = CUST_VIEWER, chỉ show LOCKED + owner = mình |
| Storage fee = opening + inbound (không trừ outbound) | `BillingDashboardPage` tooltip giải thích formula |
| Combined OT multiplier (1 bảng, không nhân riêng) | `RateCardsPage` hiển thị bảng day_type × OT multiplier |
| BILLING_OFC tạo và lock DN | Nút "Lock" chỉ hiện khi role = BILLING_OFC |
| StorageSnapshot = placeholder (backend) | ⚠️ `BillingDashboardPage` storage fee chart có thể hiển thị số sai cho đến khi IMP-03 fix |

## 7. Ghi chú

- `InvoicesPage` là trang BILLING_OFC dùng nhiều nhất — export DN ra PDF chưa có (IMP-19)
- `BillingDashboardPage` chart là placeholder SVG — cần Recharts/Chart.js thật (IMP-11)
- CUST_VIEWER filter đã implement ở UI level — cần verify backend cũng enforce (đã spec trong M11 AC)
- ERP sync button trong `InvoicesPage` là stub — ERP connector chưa thật (IMP-23)
