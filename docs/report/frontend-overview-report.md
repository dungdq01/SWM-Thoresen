# Frontend — Tổng quan Implementation Report

**Ngày:** 2026-03-10
**Phiên bản:** 1.1
**Phạm vi:** Toàn bộ frontend SWM TVL (React/Vite)

---

## 1. Trạng thái tổng quan

| Module | Pages Built | Domain Layer | Mock Data | Real API | Trạng thái |
|--------|-------------|--------------|-----------|----------|------------|
| **M1** Foundation / Settings | 7 pages ✅ | `domains/auth` ✅ | `foundation.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M2** Master Data | 11 pages ✅ | `domains/master-data` ✅ | `masterData.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M3** Inventory Core | 4 pages ✅ | `domains/inventory-core` ✅ | `inventoryCore.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M4** Inbound Operations | 5 pages ✅ | `domains/inbound-operations` ✅ | `inboundOperations.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M5** Outbound Operations | 5 pages ✅ | `domains/outbound-operations` ✅ | `outboundOperations.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M6** Inventory Control | 6 pages ✅ | `domains/inventory-control` ✅ | `inventoryControl.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M7** Work Execution | 4 pages ✅ | `domains/work-execution` ✅ | `workExecution.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M8** Integration & IoT | 4 pages ✅ | `domains/integration` ✅ | `integration.mock.js` ✅ | Wired ✅ | ⚠️ OCR UI MISSING |
| **M9** VAS / Bagging | 3 pages ✅ | `domains/vas` ✅ | `vas.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M10** Billing | 4 pages ✅ | `domains/billing` ✅ | `billing.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M11** Reporting & Go-Live | 6 pages ✅ | `domains/reporting` ✅ | `reporting.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **Dashboard** | 1 page ✅ | — | Inline mock ✅ | Partial | ⚠️ Placeholder charts |
| **Landing Page** | 1 page ✅ | — | — | — | ✅ DONE |

**Tổng:** 61 pages (+ 11 layout files = 72 files JSX trong `src/pages/`). Tất cả module đã có ít nhất 1 page. M8 còn thiếu OCR UI.

---

## 2. Kiến trúc Frontend

### 2.1 Tech Stack

| Layer | Công nghệ | Phiên bản | Ghi chú |
|-------|----------|-----------|---------|
| Framework | React | 18.2 | |
| Build tool | Vite | 5.4.21 | Port 8386 |
| Routing | React Router | v6 | Lazy loading + Suspense |
| Data fetching | TanStack Query | v5.24 | Cache + invalidation |
| HTTP client | Axios | 1.6 | Interceptors wired |
| Form | React Hook Form + Zod | — | Schema validation |
| UI | Lucide React + Custom | — | Không dùng component lib nặng |
| Animation | Framer Motion | 11 | |
| Date | Day.js | 1.11 | |
| i18n | Custom LanguageContext | — | Tiếng Việt/Anh |

### 2.2 Cấu trúc thư mục — Feature-Sliced Design (FSD)

```
src/
├── app/                    ← App entry: routes, layouts, providers
│   ├── App.jsx
│   ├── routes.jsx          ← Toàn bộ routing định nghĩa ở đây
│   ├── layouts/
│   │   ├── MainLayout.jsx
│   │   ├── SettingsLayout.jsx
│   │   └── components/AppSidebar.jsx
│   └── providers/
│       ├── QueryProvider.jsx
│       └── ToastProvider.jsx
│
├── pages/                  ← UI layer: 1 thư mục / module
│   ├── settings/           (M1 — 7 pages)
│   ├── master-data/        (M2 — 11 pages)
│   ├── inventory-core/     (M3 — 4 pages)
│   ├── inbound-operations/ (M4 — 5 pages)
│   ├── outbound-operations/(M5 — 5 pages)
│   ├── inventory-control/  (M6 — 6 pages)
│   ├── work-execution/     (M7 — 4 pages)
│   ├── integration/        (M8 — 4 pages)
│   ├── vas/                (M9 — 3 pages)
│   ├── billing/            (M10 — 4 pages)
│   ├── reporting/          (M11 — 6 pages)
│   ├── dashboard/          (1 page)
│   └── landing/            (1 page)
│
├── features/               ← Reusable form drawers, actions
│   ├── master-data/        → 9 form drawers (customer, item, location, owner, uom, vehicle-type, vendor, warehouse, zone)
│   └── settings/           → 5 modals (roles, assign-permission, reason-codes, number-sequences, governance)
│
├── domains/                ← Data layer: API + hooks per domain
│   ├── auth/               → api, hooks, model, components
│   ├── master-data/        → api, hooks, components, model
│   ├── inventory-core/     → api, hooks
│   ├── inbound-operations/ → api, hooks
│   ├── outbound-operations/→ api, hooks
│   ├── inventory-control/  → api, hooks
│   ├── work-execution/     → api, hooks
│   ├── integration/        → api, hooks
│   ├── vas/                → api, hooks
│   ├── billing/            → api, hooks
│   └── reporting/          → api, hooks
│
├── shared/                 ← Shared across all layers
│   ├── api/
│   │   ├── httpClient.js   ← Axios instance + interceptors
│   │   └── queryClient.js
│   ├── hooks/
│   │   ├── useMockData.js
│   │   └── useScrollAnimation.js
│   ├── lib/
│   │   ├── mockStorage.js  ← Core mock CRUD (localStorage + TTL)
│   │   └── mockSeedData.js
│   ├── i18n/               ← Translations VN/EN
│   └── ui/                 ← Shared UI components
│       ├── Badge, Button, Card, Input, Modal, Table, Tabs...
│       ├── StatHighlight, SummaryDonut, ProgressRing, TrendMiniChart  ← charting
│       ├── PageVisualDashboard.jsx
│       ├── guided-tour/    ← Tour hướng dẫn user mới
│       └── command-search/ ← Command palette (Ctrl+K)
│
├── mocks/                  ← Mock data per module
│   ├── masterData.mock.js
│   ├── foundation.mock.js
│   ├── inboundOperations.mock.js
│   ├── outboundOperations.mock.js
│   ├── inventoryControl.mock.js
│   ├── inventoryCore.mock.js
│   ├── workExecution.mock.js
│   ├── integration.mock.js
│   ├── vas.mock.js
│   ├── billing.mock.js
│   ├── reporting.mock.js   ← M11 mock (dashboard, inventory, billing, audit, recon, go-live)
│   └── utils.js            ← isMockApiEnabled(), paginate(), delay()
│
└── widgets/
    └── landing/            ← Landing page sections
```

---

## 3. Patterns kiến trúc quan trọng

### 3.1 Mock/Real API Switch — `withDataSource()`

Mọi domain API đều dùng pattern này:

```js
// domains/master-data/api/masterData.api.js
const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const ownerApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.ownerApi.getList(params),  // mock
    (params) => httpClient.get('/master-data/owners', { params })  // real
  ),
  create: withDataSource(
    (data) => masterDataMockApi.ownerApi.create(data),
    (data) => httpClient.post('/master-data/owners', data)
  ),
  // ...
}
```

**Hệ quả:** Chuyển từ mock → real chỉ cần gọi `setMockEnabled(false)` — không cần sửa code.

### 3.2 Mock Data Storage — `mockStorage.js`

```
localStorage key prefix: "swm_mock_"
TTL: 24 giờ (tự xóa sau khi seed)
Operations: getAll, getById, create, update, remove, seedCollection
```

- Data **persist qua refresh** (không phải RAM-only)
- Auto-seed lần đầu với default data từ `*.mock.js`
- User tạo/sửa trong mock mode → lưu vào localStorage → sống đến khi TTL hết hoặc clearAllMockData()

### 3.3 HTTP Client — `httpClient.js` (Axios)

```js
baseURL: VITE_API_URL || 'http://localhost:3000' + '/api/v1'
timeout: 30000ms

Request interceptors:
  - x-user-code: từ localStorage ('admin' mặc định)
  - x-warehouse-code: từ localStorage (nếu có)
  - Idempotency-Key: auto-generate UUID cho POST/PUT/DELETE

Response interceptors:
  - Unwrap response.data
  - Normalize error format
```

### 3.4 Data Fetching — TanStack Query v5

```js
// Query (read)
useQuery({ queryKey: [...KEYS.owners, filters], queryFn: () => ownerApi.getList(filters), staleTime: 30000 })

// Mutation (write)
useMutation({
  mutationFn: (data) => ownerApi.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.owners }),
  onError: (error) => toast.error(error?.error?.message)
})
```

### 3.5 Routing — React Router v6 Lazy Loading

```js
const OwnersPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.OwnersPage })))

// Route config: Suspense với PageLoader fallback
{ path: 'owners', element: withSuspense(OwnersPage) }
```

---

## 4. Mock Data — Behavior khi test

| Scenario | Behavior |
|---------|----------|
| Lần đầu load | Auto-seed default data từ `*.mock.js` vào localStorage |
| User tạo/sửa record | Lưu vào localStorage ngay (persist qua refresh) |
| Refresh page | Data vẫn còn (localStorage) |
| Sau 24 giờ | `checkAndClearExpired()` tự xóa, re-seed từ default |
| Close tab / reopen | Data vẫn còn (localStorage, không phải sessionStorage) |
| Clear browser data | Mất tất cả mock data |
| `clearAllMockData()` | Xóa toàn bộ keys có prefix `swm_mock_*` |

---

## 5. Gaps và Issues

### 5.1 Tính năng chưa build

| Gap | Module | Ưu tiên |
|-----|--------|---------|
| **OCR Upload/Review UI** — 3 pages: OcrUploadPage, OcrReviewPage, OcrConfirmPage | M8 | P1 (IMP-02) |
| **BE Customer CRUD** — FE đã build CustomersPage + CustomerFormDrawer, BE chưa có | M2/BE | P1 |
| **BE DropdownConfig CRUD** — FE mock hoàn chỉnh, BE chưa implement | M1+M2/BE | P2 |
| **BE next-code** endpoints — thiếu cho Owner, Vendor, Item, Customer | M2/BE | P2 |

### 5.2 Chưa implement

| Feature | Ghi chú |
|---------|---------|
| WebSocket real-time | Không có — UI không update live |
| Offline PWA | Không có Service Worker, không có IndexedDB cache (IMP-13) |
| Barcode/QR camera scan | Không có — dùng keyboard input (IMP-32) |
| Print / PDF export | Chưa có jsPDF |
| Testing | Zero tests (unit + integration) |
| JWT auth | Dùng `x-user-code` header hardcoded — phải thay trước go-live |

### 5.3 FA Issues (FE ↔ BE Alignment)

| ID | Issue | Trạng thái |
|----|-------|-----------|
| FA-01 | ReportingModule / BillingModule chưa đăng ký trong app.module.ts | ⚠️ BE cần fix |
| FA-02 | Double-prefix `/api/v1/api/v1/...` trong một số domain hooks cũ | ✅ Fixed trong code |
| FA-03 | Work Execution endpoint paths không khớp | ⚠️ Cần verify |
| FA-04 | VAS: `confirmWorkOrder` và session endpoint | ✅ Fixed trong `vas.api.js` |
| FA-05 | Billing: semantic gap trong endpoint naming | ⚠️ Cần verify |
| FA-06 | Reporting: sub-path format không khớp | ✅ Fixed trong `reporting.api.js` |

---

## 6. Hướng dẫn chạy

```bash
cd frontend
npm install
npm run dev        # http://localhost:8386
```

**Biến môi trường `.env`:**
```env
VITE_API_URL=http://localhost:3000   # Backend URL
```

**Switch mock ↔ real API:**
```js
// Trong browser console:
localStorage.setItem('swm_mock_enabled', 'true')   // dùng mock
localStorage.setItem('swm_mock_enabled', 'false')  // gọi backend thật
```

---

## 7. Danh sách file report chi tiết per module

| Module | File report | Trạng thái |
|--------|-------------|-----------|
| M1 Foundation | `docs/report/frontend-module-1-foundation-report.md` | ✅ DONE |
| M2 Master Data | `docs/report/frontend-module-2-master-data-report.md` | ✅ DONE |
| M3 Inventory Core | `docs/report/frontend-module-3-inventory-core-report.md` | ✅ DONE |
| M4 Inbound Operations | `docs/report/frontend-module-4-inbound-report.md` | ✅ DONE |
| M5 Outbound Operations | `docs/report/frontend-module-5-outbound-report.md` | ✅ DONE |
| M6 Inventory Control | `docs/report/frontend-module-6-inventory-control-report.md` | ✅ DONE |
| M7 Work Execution | `docs/report/frontend-module-7-work-execution-report.md` | ✅ DONE |
| M8 Integration & IoT | `docs/report/frontend-module-8-integration-report.md` | ✅ DONE |
| M9 VAS / Bagging | `docs/report/frontend-module-9-vas-report.md` | ✅ DONE |
| M10 Billing | `docs/report/frontend-module-10-billing-report.md` | ✅ DONE |
| M11 Reporting | `docs/report/frontend-module-11-reporting-report.md` | ✅ DONE |
