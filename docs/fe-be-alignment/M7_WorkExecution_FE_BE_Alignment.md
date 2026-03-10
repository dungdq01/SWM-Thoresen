# M7 — Work Execution: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Work Execution & Mobile Operations
**FE Pages:** `frontend/src/pages/work-execution/` (4 pages)
**FE Domain:** `frontend/src/domains/work-execution/`
**BE Module:** `backend/src/modules/work-execution/` (Express.js JavaScript)
**BE Docs:** `backend/docs/module-7-work-execution.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API path alignment | ❌ CRITICAL — 16/16 FE calls sai path (BASE_URL hoàn toàn sai) |
| Response format | ✅ Không có mismatch format |
| Auth header | ✅ KHỚP |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — WorkExecution (Express.js) chưa được wired vào NestJS app |
| **BASE_URL** | ❌ CRITICAL — `/api/v1/work-execution` hoàn toàn sai: double-prefix **và** sai base path |

---

## 2. BLOCKER hệ thống

> `work-execution` là Express.js module (JavaScript, không phải NestJS TypeScript).
> Giống với Inbound và InventoryCore — module này **không được đăng ký** vào NestJS `app.module.ts`.
> Ngoài ra, BE routes được mount tại root `/api/v1/` — không có `/work-execution` base path.

---

## 3. CRITICAL: BASE_URL sai hoàn toàn

### Vấn đề đôi

```js
const BASE_URL = '/api/v1/work-execution'
// Lỗi 1 — double-prefix với httpClient baseURL:
// axios combineURLs → http://localhost:3000/api/v1/api/v1/work-execution/...
//
// Lỗi 2 — sai base path:
// BE không có route nào bắt đầu bằng /work-execution
// BE routes: GET /api/v1/works, GET /api/v1/mobile/works/available, POST /api/v1/internal/works/generate
```

### BE Route Groups (từ `work-execution.routes.js`)

| Group | BE Path Pattern | FE Nên Dùng |
|-------|-----------------|-------------|
| Standard Work | `/works`, `/works/:id`, `/works/:id/*` | `BASE_WORKS = '/works'` |
| Mobile | `/mobile/works/available`, `/mobile/works/my`, `/mobile/scan/validate`, `/mobile/works/sync` | `BASE_MOBILE = '/mobile'` |
| Internal | `/internal/works/generate` | `BASE_INTERNAL = '/internal'` |

### Fix FE

```js
// Thay:
const BASE_URL = '/api/v1/work-execution'

// Bằng:
const BASE_WORKS = '/works'
const BASE_MOBILE = '/mobile'
const BASE_INTERNAL = '/internal'
```

---

## 4. Kiểm tra từng API endpoint

### 4.1 Query APIs

| BE Route | FE API Call | FE Path Hiện Tại | Trạng thái |
|---------|------------|------------------|-----------|
| `GET /api/v1/works` | `getWorks(params)` | `${BASE_URL}/works` | ❌ BASE_URL sai → `/api/v1/api/v1/work-execution/works` |
| `GET /api/v1/works/dashboard/summary` | `getDashboardSummary(warehouseId)` | `${BASE_URL}/dashboard/summary` | ❌ Thiếu `/works/` trong path + BASE_URL sai |
| `GET /api/v1/works/:id` | `getWorkById(id)` | `${BASE_URL}/works/${id}` | ❌ BASE_URL sai |
| `GET /api/v1/works/:id/history` | `getWorkHistory(id)` | `${BASE_URL}/works/${id}/history` | ❌ BASE_URL sai |
| `GET /api/v1/works/:id/exceptions` | `getWorkExceptions(id)` | `${BASE_URL}/works/${id}/exceptions` | ❌ BASE_URL sai |

---

### 4.2 Mobile APIs

| BE Route | FE API Call | FE Path Hiện Tại | Trạng thái |
|---------|------------|------------------|-----------|
| `GET /api/v1/mobile/works/available` | `getAvailableWorks(params)` | `${BASE_URL}/works/available` | ❌ MISMATCH — thiếu `/mobile/` prefix |
| `GET /api/v1/mobile/works/my` | `getMyWorks(params)` | `${BASE_URL}/works/my` | ❌ MISMATCH — thiếu `/mobile/` prefix |
| `POST /api/v1/mobile/scan/validate` | `validateScan(data)` | `${BASE_URL}/scan/validate` | ❌ MISMATCH — thiếu `/mobile/` prefix |
| `POST /api/v1/mobile/works/sync` | **KHÔNG CÓ** | — | ⚠️ BE có, FE không gọi |

---

### 4.3 Command APIs — Header Level

| BE Route | FE API Call | FE Path Hiện Tại | Trạng thái |
|---------|------------|------------------|-----------|
| `POST /api/v1/works/:id/claim` | `claimWork(id, data)` | `${BASE_URL}/works/${id}/claim` | ❌ BASE_URL sai (sub-path đúng) |
| `POST /api/v1/works/:id/release` | `releaseWork(id, data)` | `${BASE_URL}/works/${id}/release` | ❌ BASE_URL sai (sub-path đúng) |
| `POST /api/v1/works/:id/start` | `startWork(id, data)` | `${BASE_URL}/works/${id}/start` | ❌ BASE_URL sai (sub-path đúng) |
| `POST /api/v1/works/:id/cancel` | `cancelWork(id, data)` | `${BASE_URL}/works/${id}/cancel` | ❌ BASE_URL sai (sub-path đúng) |

---

### 4.4 Command APIs — Line Level

| BE Route | FE API Call | FE Path Hiện Tại | Trạng thái |
|---------|------------|------------------|-----------|
| `POST /api/v1/works/:id/lines/:lineNum/start` | `startLine(workId, lineId, data)` | `${BASE_URL}/works/${workId}/lines/${lineId}/start` | ❌ BASE_URL sai + **`lineId` (UUID) ≠ `:lineNum` (integer)** |
| `POST /api/v1/works/:id/lines/:lineNum/complete` | `completeLine(workId, lineId, data)` | `${BASE_URL}/works/${workId}/lines/${lineId}/complete` | ❌ BASE_URL sai + **`lineId` (UUID) ≠ `:lineNum` (integer)** |
| `POST /api/v1/works/:id/lines/:lineNum/skip` | `skipLine(workId, lineId, data)` | `${BASE_URL}/works/${workId}/lines/${lineId}/skip` | ❌ BASE_URL sai + **`lineId` (UUID) ≠ `:lineNum` (integer)** |
| `POST /api/v1/works/:id/manager-override-complete` | **KHÔNG CÓ** | — | ⚠️ BE có, FE không gọi |

---

### 4.5 Internal API

| BE Route | FE API Call | FE Path Hiện Tại | Trạng thái |
|---------|------------|------------------|-----------|
| `POST /api/v1/internal/works/generate` | `generateWork(data)` | `${BASE_URL}/works/generate` | ❌ MISMATCH — thiếu `/internal/` prefix |

---

## 5. Line Parameter Mismatch (đặc biệt quan trọng)

```js
// FE (WorkExecutePage.jsx:47):
completeLine.mutateAsync({ workId: work.id, lineId: selectedLineId, ... })
// selectedLineId = line.id = UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")

// FE API (workExecution.api.js:58-66):
(workId, lineId, data) => httpClient.post(`${BASE_URL}/works/${workId}/lines/${lineId}/complete`, data)
// → /api/v1/work-execution/works/{workId}/lines/{UUID}/complete

// BE Route (work-execution.routes.js:103):
router.post('/works/:id/lines/:lineNum/complete', ...)
// BE expects :lineNum = integer (e.g., 1, 2, 3)
```

**Fix:** FE phải truyền `line.lineNum` (integer) thay vì `line.id` (UUID) trong 3 line operations.

---

## 6. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | Express.js work-execution module chưa được wired vào NestJS app | Cần integrate tương tự Inbound/InventoryCore |

### 🔴 CRITICAL

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/work-execution'` — double-prefix + sai base path | `workExecution.api.js:5` | Thay bằng 3 constants: `BASE_WORKS='/works'`, `BASE_MOBILE='/mobile'`, `BASE_INTERNAL='/internal'` |
| C2 | `getDashboardSummary` dùng `${BASE_URL}/dashboard/summary` | `workExecution.api.js:14` | Đổi thành `${BASE_WORKS}/dashboard/summary` |
| C3 | `getAvailableWorks` dùng `${BASE_URL}/works/available` | `workExecution.api.js:34` | Đổi thành `${BASE_MOBILE}/works/available` |
| C4 | `getMyWorks` dùng `${BASE_URL}/works/my` | `workExecution.api.js:38` | Đổi thành `${BASE_MOBILE}/works/my` |
| C5 | `validateScan` dùng `${BASE_URL}/scan/validate` | `workExecution.api.js:74` | Đổi thành `${BASE_MOBILE}/scan/validate` |
| C6 | `generateWork` dùng `${BASE_URL}/works/generate` | `workExecution.api.js:42` | Đổi thành `${BASE_INTERNAL}/works/generate` |
| C7 | Line operations truyền `lineId` (UUID), BE expect `lineNum` (integer) | `workExecution.api.js:58,62,66` + pages | Đổi param từ `lineId` → `lineNum`, FE page phải truyền `line.lineNum` |

### ⚠️ WARNING — BE có, FE không gọi

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | `POST /works/:id/manager-override-complete` không có FE | Manager override feature — cần UI trong WorkMonitorPage/WorkExecutePage |
| W2 | `POST /mobile/works/sync` không có FE | Offline sync cho mobile — cần nếu muốn mobile offline-first |

---

## 7. Bảng tóm tắt coverage

| Nhóm | BE routes | FE calls đúng path | FE calls sai path | FE thiếu |
|------|-----------|-------------------|-------------------|----------|
| Query / Dashboard | 5 | 0 | 5 | 0 |
| Mobile | 4 | 0 | 3 | 1 (sync) |
| Command Header | 4 | 0 | 4 | 0 |
| Command Line | 4 | 0 | 3 | 1 (override) |
| Internal | 1 | 0 | 1 | 0 |
| **Tổng** | **18** | **0** | **16** | **2** |

---

## 8. Trạng thái tổng thể Module 7 (Work Execution) — CẬP NHẬT 2026-03-11

| Mục | Điểm |
|-----|------|
| API coverage | 0% correct paths (16/16 FE calls có wrong path) |
| Path accuracy | ❌ CRITICAL — BASE_URL sai cả double-prefix lẫn base path |
| Line param alignment | ❌ CRITICAL — `lineId` UUID vs `lineNum` integer |
| Module registration | ❌ Chưa wired vào NestJS app |
| **Tổng** | **🔴 BLOCKED — Tất cả 16 API calls đều 404 khi switch sang real BE** |

> **Ưu tiên fixes (theo thứ tự):**
> 1. Thay `BASE_URL` bằng 3 constants: `BASE_WORKS='/works'`, `BASE_MOBILE='/mobile'`, `BASE_INTERNAL='/internal'`
> 2. Fix `getDashboardSummary` path: thêm `/works/` prefix
> 3. Fix mobile endpoints: thêm `/mobile/` prefix cho `getAvailableWorks`, `getMyWorks`, `validateScan`
> 4. Fix internal endpoint: thêm `/internal/` prefix cho `generateWork`
> 5. Fix line operations: truyền `lineNum` (integer) thay `lineId` (UUID)
> 6. Wired Express.js module vào app (coordination với BE team)
