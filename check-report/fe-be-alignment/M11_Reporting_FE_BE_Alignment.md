# M11 — Reporting, Audit & Go-Live Control: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Reporting, Audit & Go-Live Control
**FE Pages:** `frontend/src/pages/reporting/`
**FE Domain:** `frontend/src/domains/reporting/`
**BE Module:** `backend/src/modules/reporting/` (NestJS TypeScript)
**BE Docs:** `backend/docs/module-11-reporting.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ❌ CRITICAL — 7/7 FE calls sai path |
| BASE_URL | ❌ Double-prefix (`/api/v1/reporting`) |
| BE Controller prefix | ❌ **Tất cả 5 BE controllers đều double-prefix** (`@Controller('api/v1/reporting/...')`) |
| Double-prefix coincidence | ⚠️ Cả hai bên đều double-prefix — NHƯNG FE paths thiếu sub-segment → vẫn không match |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — ReportingModule chưa được import |

---

## 2. BLOCKER hệ thống

> `reporting.module.ts` là NestJS module nhưng **chưa được import vào `app.module.ts`**.
> Fix: Thêm `ReportingModule` vào imports trong `app.module.ts`.

---

## 3. Double-prefix trên cả hai bên (vẫn không match vì FE thiếu sub-segments)

### BE Controllers (tất cả double-prefix — confirmed từ code)
```typescript
@Controller('api/v1/reporting/dashboard')      // routes: @Get('summary'), @Get('widgets/:code')
@Controller('api/v1/reporting/inventory')      // routes: @Get('on-hand'), @Get('movement'), ...
@Controller('api/v1/reporting/reconciliation') // routes: @Post('run'), @Get('results'), ...
@Controller('api/v1/reporting/go-live')        // routes: @Get('status'), @Post('check'), ...
@Controller('api/v1/reporting/exports')        // routes: @Post(), @Get(':id'), ...
```

### FE BASE_URL
```js
const BASE_URL = '/api/v1/reporting'
// axios combineURLs → http://localhost:3000/api/v1/api/v1/reporting/...
```

### Tại sao vẫn không match dù cả hai có double-prefix

| FE Path (sau double-prefix) | BE Path (sau double-prefix) | Match? |
|-----------------------------|----------------------------|--------|
| `/api/v1/api/v1/reporting/dashboard` | `/api/v1/api/v1/reporting/dashboard/summary` | ❌ Thiếu `/summary` |
| `/api/v1/api/v1/reporting/inventory` | `/api/v1/api/v1/reporting/inventory/on-hand` | ❌ Thiếu `/on-hand` |
| `/api/v1/api/v1/reporting/reconciliation` | `/api/v1/api/v1/reporting/reconciliation/results` | ❌ Thiếu `/results` |
| `/api/v1/api/v1/reporting/go-live` | `/api/v1/api/v1/reporting/go-live/status` | ❌ Thiếu `/status` |

> **Fix FE:** `BASE_URL = '/api/v1/reporting'` → `BASE_URL = '/reporting'`
> **Fix BE:** `@Controller('api/v1/reporting/...')` → `@Controller('reporting/...')` trong 5 controllers

---

## 4. Kiểm tra từng API endpoint

### 4.1 Dashboard

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getDashboard()` | `GET .../reporting/dashboard` | `GET /reporting/dashboard/summary` | ❌ Thiếu `/summary` |
| **[Không có FE]** | — | `GET /reporting/dashboard/widgets/:code` | ⚠️ FE không gọi |

---

### 4.2 Inventory Reports

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getInventoryReport(params)` | `GET .../reporting/inventory` | `GET /reporting/inventory/on-hand` | ❌ Thiếu `/on-hand` sub-segment |
| **[Không có FE]** | — | `GET /reporting/inventory/movement` | ⚠️ FE không gọi |
| **[Không có FE]** | — | `GET /reporting/inventory/aging` | ⚠️ FE không gọi |
| **[Không có FE]** | — | `GET /reporting/inventory/inbound-summary` | ⚠️ FE không gọi |
| **[Không có FE]** | — | `GET /reporting/inventory/outbound-summary` | ⚠️ FE không gọi |
| **[Không có FE]** | — | `GET /reporting/inventory/utilization` | ⚠️ FE không gọi |

> FE gọi 1 endpoint `/inventory` nhưng BE có 6 sub-report endpoints. FE cần split thành 6 calls.

---

### 4.3 Billing & Audit Reports — FE gọi nhưng BE không có trong M11

| FE API Call | FE Path | Tình trạng |
|------------|---------|-----------|
| `getBillingReport(params)` | `GET .../reporting/billing` | ❌ BE M11 không có endpoint `/billing` — báo cáo billing nằm trong M10 |
| `getAuditLogs(params)` | `GET .../reporting/audit` | ❌ BE M11 không có endpoint `/audit` trong docs (có thể không implement) |

---

### 4.4 Reconciliation

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getReconResults(params)` | `GET .../reporting/reconciliation` | `GET /reporting/reconciliation/results` | ❌ Thiếu `/results` sub-segment |
| **[Không có FE]** | — | `POST /reporting/reconciliation/run` | ⚠️ FE không có trigger reconciliation |
| **[Không có FE]** | — | `GET /reporting/reconciliation/results/:id` | ⚠️ FE không có detail view |
| **[Không có FE]** | — | `POST /reporting/reconciliation/results/:id/resolve` | ⚠️ FE không có resolve action |

---

### 4.5 Go-Live Control

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getGoLiveGates()` | `GET .../reporting/go-live` | `GET /reporting/go-live/status` | ❌ Thiếu `/status` |
| `updateGoLiveGate(id, data)` | `PATCH .../reporting/go-live/${id}` | `POST /reporting/go-live/gates/:id/sign-off` | ❌ Path sai + Method PATCH≠POST |
| **[Không có FE]** | — | `POST /reporting/go-live/check` | ⚠️ FE không có auto-check trigger |
| **[Không có FE]** | — | `GET /reporting/go-live/history` | ⚠️ FE không có history view |

---

### 4.6 Export APIs — FE không gọi gì cả

| BE Route | Ghi chú |
|---------|---------|
| `POST /reporting/exports` | FE không có export feature |
| `GET /reporting/exports/:id` | FE không có export status polling |
| `GET /reporting/exports/:id/download` | FE không có download |

---

## 5. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | `app.module.ts` không import ReportingModule | Thêm `ReportingModule` vào imports |

### 🔴 CRITICAL

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/reporting'` — double-prefix | `reporting.api.js:5` | Đổi thành `'/reporting'` |
| C2 | 5 BE controllers dùng `@Controller('api/v1/reporting/...')` | 5 controller files | Đổi thành `'reporting/...'` |
| C3 | `getDashboard` gọi `/reporting/dashboard` | `reporting.api.js:14` | Đổi thành `/reporting/dashboard/summary` |
| C4 | `getInventoryReport` gọi `/reporting/inventory` | `reporting.api.js:18` | Cần tách thành 6 calls (`/inventory/on-hand`, `/movement`, etc.) |
| C5 | `getReconResults` gọi `/reporting/reconciliation` | `reporting.api.js:33` | Đổi thành `/reporting/reconciliation/results` |
| C6 | `getGoLiveGates` gọi `/reporting/go-live` | `reporting.api.js:37` | Đổi thành `/reporting/go-live/status` |
| C7 | `updateGoLiveGate` dùng `PATCH .../go-live/${id}` | `reporting.api.js:42` | Đổi thành `POST .../go-live/gates/:id/sign-off` + method POST |

### ⚠️ WARNING — FE gọi endpoints không tồn tại trong M11

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | `getBillingReport` → `/reporting/billing` — không có trong M11 | Billing reports thuộc M10 (billing/events) |
| W2 | `getAuditLogs` → `/reporting/audit` — không trong M11 docs | Cần confirm với BE team xem endpoint này có implement không |

### ⚠️ WARNING — BE có, FE thiếu (coverage gap)

| # | Feature | BE routes | Ghi chú |
|---|---------|-----------|---------|
| W3 | Dashboard widget detail | 1 | `GET /dashboard/widgets/:code` |
| W4 | Inventory sub-reports | 5 | movement, aging, inbound/outbound summary, utilization |
| W5 | Reconciliation run + resolve | 3 | run trigger, detail view, resolve action |
| W6 | Go-Live check + history | 2 | auto-check trigger, sign-off history |
| W7 | Export feature | 3 | create job, status, download |

---

## 6. Bảng tóm tắt coverage

| Nhóm | BE routes | FE calls | Đúng path | Sai path | FE gọi không tồn tại |
|------|-----------|----------|-----------|----------|-----------------------|
| Dashboard | 2 | 1 | 0 | 1 | 0 |
| Inventory | 6 | 1 | 0 | 1 | 0 |
| Reconciliation | 4 | 1 | 0 | 1 | 0 |
| Go-Live | 4 | 2 | 0 | 2 | 0 |
| Export | 3 | 0 | 0 | 0 | 0 |
| N/A (FE only) | 0 | 2 | 0 | 0 | 2 (billing+audit) |
| **Tổng** | **19** | **7** | **0** | **5** | **2** |

---

## 7. Trạng thái tổng thể Module 11 (Reporting)

| Mục | Điểm |
|-----|------|
| API coverage | 0% correct paths |
| Path accuracy | ❌ CRITICAL — tất cả FE paths thiếu sub-segments |
| BE Controller prefix | ❌ CRITICAL — double-prefix trong 5 controllers |
| FE calls non-existent routes | ❌ `/reporting/billing` + `/reporting/audit` không tồn tại trong M11 |
| Go-Live update method | ❌ PATCH vs POST + path sai hoàn toàn |
| Module registration | ❌ Chưa import vào app.module.ts |
| **Tổng** | **🔴 BLOCKED — Tất cả 7 calls đều sai path; 2 calls gọi endpoint không tồn tại** |

> **Ưu tiên fixes (theo thứ tự):**
> 1. Fix BE controllers: `@Controller('api/v1/reporting/...')` → `@Controller('reporting/...')` (5 files)
> 2. Fix FE BASE_URL: `/api/v1/reporting` → `/reporting`
> 3. Fix `getDashboard` → thêm `/summary`
> 4. Fix `getInventoryReport` → tách thành 6 sub-report calls
> 5. Fix `getReconResults` → thêm `/results`
> 6. Fix `getGoLiveGates` → thêm `/status`
> 7. Fix `updateGoLiveGate` → đổi method PATCH→POST + path → `/go-live/gates/:id/sign-off`
> 8. Xác nhận `getBillingReport` và `getAuditLogs` với BE team (các endpoint này không có trong docs M11)
> 9. Đăng ký ReportingModule vào app.module.ts
