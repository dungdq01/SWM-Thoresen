# Frontend — Tổng quan Implementation Report

**Ngày:** 2026-03-09
**Phiên bản:** 1.0
**Phạm vi:** Toàn bộ frontend SWM TVL (React/Vite)

---

## 1. Trạng thái tổng quan

| Module | Pages Built | Domain Layer | Mock Data | Real API | Trạng thái |
|--------|-------------|--------------|-----------|----------|------------|
| **M1** Foundation / Settings | 6 pages ✅ | `domains/auth` ✅ | `foundation.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M2** Master Data | 9 pages ✅ | `domains/master-data` ✅ | `masterData.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M3** Inventory Core | 4 pages ✅ | `domains/inventory-core` ✅ | `inventoryCore.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M4** Inbound Operations | 4 pages ✅ | `domains/inbound-operations` ✅ | `inboundOperations.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M5** Outbound Operations | 4 pages ✅ | `domains/outbound-operations` ✅ | `outboundOperations.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M6** Inventory Control | 6 pages ✅ | `domains/inventory-control` ✅ | `inventoryControl.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M7** Work Execution | 4 pages ✅ | `domains/work-execution` ✅ | `workExecution.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M8** Integration & IoT | 4 pages ✅ | `domains/integration` ✅ | `integration.mock.js` ✅ | Wired ✅ | ⚠️ OCR UI MISSING |
| **M9** VAS / Bagging | 3 pages ✅ | `domains/vas` ✅ | `vas.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M10** Billing | 4 pages ✅ | `domains/billing` ✅ | `billing.mock.js` ✅ | Wired ✅ | ✅ DONE |
| **M11** Reporting & Go-Live | ❌ 0 pages | ❌ không có | ❌ không có | ❌ | ❌ CHƯA BUILD |
| **Dashboard** | 1 page ✅ | — | Inline mock ✅ | Partial | ⚠️ Placeholder charts |
| **Landing Page** | 1 page ✅ | — | — | — | ✅ DONE |

**Tổng:** 51 pages, ~109 components (theo Improve.md). M11 là module duy nhất chưa có page nào.

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
│   ├── settings/           (M1)
│   ├── master-data/        (M2)
│   ├── inventory-core/     (M3)
│   ├── inbound-operations/ (M4)
│   ├── outbound-operations/(M5)
│   ├── inventory-control/  (M6)
│   ├── work-execution/     (M7)
│   ├── integration/        (M8)
│   ├── vas/                (M9)
│   ├── billing/            (M10)
│   ├── dashboard/
│   └── landing/
│
├── features/               ← Reusable form drawers, actions
│   └── master-data/
│       ├── item/ItemFormDrawer.jsx
│       ├── owner/OwnerFormDrawer.jsx
│       ├── uom/UomFormDrawer.jsx
│       ├── vehicle-type/VehicleTypeFormDrawer.jsx
│       └── vendor/VendorFormDrawer.jsx
│
├── domains/                ← Data layer: API + hooks per domain
│   ├── auth/               → api, hooks, model
│   ├── master-data/        → api, hooks, components, model
│   ├── inventory-core/     → api, hooks
│   ├── inbound-operations/ → api, hooks
│   ├── outbound-operations/→ api, hooks
│   ├── inventory-control/  → api, hooks
│   ├── work-execution/     → api, hooks
│   ├── integration/        → api, hooks
│   ├── vas/                → api, hooks
│   └── billing/            → api, hooks
│
├── shared/                 ← Shared across all layers
│   ├── api/
│   │   ├── httpClient.js   ← Axios instance + interceptors
│   │   └── queryClient.js
│   ├── hooks/
│   │   ├── useMockData.js  ← Hook quản lý mock data (localStorage)
│   │   └── useScrollAnimation.js
│   ├── lib/
│   │   ├── mockStorage.js  ← Core mock CRUD (localStorage + TTL)
│   │   └── mockSeedData.js
│   ├── i18n/               ← Translations VN/EN
│   └── ui/                 ← Shared UI components
│       ├── Badge, Button, Card, Input, Modal, Table, Tabs...
│       └── PageVisualDashboard.jsx (mini dashboard widget)
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
│   └── utils.js            ← isMockApiEnabled()
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

### 5.1 Module chưa build

| Gap | Module | Ưu tiên |
|-----|--------|---------|
| **M11 Reporting** — Không có page, domain, mock | M11 | P1 |
| **OCR Upload/Review UI** — Không có page | M8 | P1 (IMP-02) |

### 5.2 Chưa implement

| Feature | Ghi chú |
|---------|---------|
| Dashboard charts | SVG placeholder — chưa dùng charting lib thật (Recharts/Chart.js) |
| WebSocket real-time | Không có — UI không update live |
| Offline PWA | Không có Service Worker, không có IndexedDB cache |
| Barcode scanner | Không có |
| Print / PDF export | Chưa có jsPDF |
| Testing | Zero tests (unit + integration) |

### 5.3 Auth

- Frontend dùng `x-user-code` header (lấy từ localStorage) thay vì JWT token
- Không có login page — bypass auth bằng hardcoded `userCode = 'admin'`
- Phù hợp cho dev/demo, **PHẢI thay bằng JWT auth trước go-live**

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

| Module | File report |
|--------|-------------|
| M1 Foundation | `docs/report/frontend-module-1-foundation-report.md` |
| M2 Master Data | `docs/report/frontend-module-2-master-data-report.md` |
| M3 Inventory Core | `docs/report/frontend-module-3-inventory-core-report.md` |
| M4 Inbound Operations | `docs/report/frontend-module-4-inbound-report.md` |
| M5 Outbound Operations | `docs/report/frontend-module-5-outbound-report.md` |
| M6 Inventory Control | `docs/report/frontend-module-6-inventory-control-report.md` |
| M7 Work Execution | `docs/report/frontend-module-7-work-execution-report.md` |
| M8 Integration & IoT | `docs/report/frontend-module-8-integration-report.md` |
| M9 VAS / Bagging | `docs/report/frontend-module-9-vas-report.md` |
| M10 Billing | `docs/report/frontend-module-10-billing-report.md` |
| M11 Reporting | `docs/report/frontend-module-11-reporting-report.md` |
