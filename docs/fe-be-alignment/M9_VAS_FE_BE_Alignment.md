# M9 — VAS / Bagging Operations: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** VAS / Bagging Operations
**FE Pages:** `frontend/src/pages/vas/` (3 pages + layout)
**FE Domain:** `frontend/src/domains/vas/`
**BE Module:** `backend/src/modules/vas/` (NestJS TypeScript)
**BE Docs:** `backend/docs/module-9-vas.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ❌ CRITICAL — 12/12 FE calls sai path |
| BASE_URL | ❌ Double-prefix + Sai base path |
| BE Controller prefix | ❌ **CÙNG double-prefix bug** như Outbound (`@Controller('api/v1/vas-wo')`) |
| FE ↔ BE lifecycle | ❌ **STATE MACHINE MISMATCH** — FE: DRAFT→RELEASED→IN_PROGRESS, BE: DRAFT→CONFIRMED→IN_PROGRESS |
| Session model | ❌ **DESIGN MISMATCH** — FE standalone sessions vs BE per-WO session |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — VasModule chưa được import |

---

## 2. BLOCKER hệ thống

> `vas.module.ts` là NestJS module nhưng **chưa được import vào `app.module.ts`**.
> Fix: Thêm `VasModule` vào imports trong `app.module.ts`.

---

## 3. CRITICAL: Cả FE lẫn BE đều có double-prefix (KHÔNG match nhau)

### Vấn đề FE

```js
const BASE_URL = '/api/v1/vas'  // SAI
// axios combineURLs → http://localhost:3000/api/v1/api/v1/vas/...
```

### Vấn đề BE (từ `vas-wo-command.controller.ts:33`)

```typescript
@Controller('api/v1/vas-wo')  // SAI — đã có NestJS global prefix 'api/v1'
// Full route → /api/v1/api/v1/vas-wo/...
```

### Kết quả

| | BE path hiện tại | FE path hiện tại | Kết quả |
|-|------------------|------------------|---------|
| Trạng thái hiện tại | `/api/v1/api/v1/vas-wo/...` | `/api/v1/api/v1/vas/...` | ❌ KHÔNG match (cả sai lẫn khác path) |
| Sau khi fix đúng | `/api/v1/vas-wo/...` | `/api/v1/vas-wo/...` | ✅ |

> **Fix FE:** `BASE_URL = '/api/v1/vas'` → `BASE_URL = '/vas-wo'`
> **Fix BE:** `@Controller('api/v1/vas-wo')` → `@Controller('vas-wo')` (cả 3 controllers)

---

## 4. CRITICAL: Path scheme mismatch

FE thêm `/work-orders/` prefix vào tất cả paths, BE không có:

| FE Path | BE Route | Trạng thái |
|---------|---------|-----------|
| `${BASE_URL}/work-orders` | `GET /api/v1/vas-wo` | ❌ `/work-orders` thừa |
| `${BASE_URL}/work-orders/${id}` | `GET /api/v1/vas-wo/:id` | ❌ `/work-orders/` thừa |
| `${BASE_URL}/work-orders/${id}/complete` | `POST /api/v1/vas-wo/:id/complete` | ❌ `/work-orders/` thừa (sub-action đúng) |
| `${BASE_URL}/work-orders/${id}/cancel` | `POST /api/v1/vas-wo/:id/cancel` | ❌ `/work-orders/` thừa (sub-action đúng) |

> **Fix:** Bỏ `/work-orders` segment khỏi FE paths. Dùng trực tiếp `${BASE_URL}/${id}/...`

---

## 5. CRITICAL: State Machine Mismatch

FE và BE có lifecycle commands hoàn toàn khác nhau:

| FE Action | FE API Call | BE Route | Kết quả |
|-----------|------------|---------|---------|
| Release WO | `POST ${BASE_URL}/work-orders/${id}/release` | ❌ **BE không có `/release`** | 404 |
| Start WO | `POST ${BASE_URL}/work-orders/${id}/start` | ❌ **BE không có `/start` cho header** | 404 |
| **[Không có FE]** | — | `POST /api/v1/vas-wo/:id/confirm` | ⚠️ FE thiếu `confirm` action |

**State Machine so sánh:**

| FE State | BE State | Match? |
|----------|----------|--------|
| DRAFT | DRAFT | ✅ |
| RELEASED | ❌ **CONFIRMED** (khác tên) | ❌ |
| IN_PROGRESS | IN_PROGRESS | ✅ |
| COMPLETED | COMPLETED | ✅ |
| CANCELLED | CANCELLED | ✅ |

> **Fix FE:** Đổi:
> - `releaseWorkOrder` → `confirmWorkOrder` (gọi `/confirm`)
> - Xóa `startWorkOrder` (BE không có; `IN_PROGRESS` được trigger bởi session đầu tiên)
> - Update page: bỏ "RELEASED" status, dùng "CONFIRMED"
> - Update page: bỏ Start button; Release button → Confirm button

---

## 6. CRITICAL: Session Model Mismatch

FE có standalone session CRUD không tồn tại trong BE:

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getSessions(params)` | `GET ${BASE_URL}/sessions` | ❌ **Không tồn tại** | 404 |
| `startSession(data)` | `POST ${BASE_URL}/sessions/start` | ❌ **Không tồn tại** | 404 |
| `endSession(id)` | `POST ${BASE_URL}/sessions/${id}/end` | ❌ **Không tồn tại** | 404 |
| `recordBag(sessionId, data)` | `POST ${BASE_URL}/sessions/${sessionId}/bags` | ❌ **Không tồn tại** | 404 |

**BE chỉ có 1 session endpoint:**
```
POST /api/v1/vas-wo/:id/session   ← cần woId trong path, không phải sessionId
```

> **Fix FE:** Toàn bộ session API phải được thiết kế lại theo model BE:
> - Không có standalone `/sessions` collection
> - Session được thêm vào WO cụ thể qua `POST /vas-wo/:woId/session`
> - Request body cần: sessionDate, shiftCode, sessionQtyKg, sessionBagCount, workHours, startTime, endTime

---

## 7. CRITICAL: Dashboard endpoint không tồn tại trong BE

```js
getDashboard: (params) => httpClient.get(`${BASE_URL}/dashboard`, { params })
// BE không có GET /api/v1/vas-wo/dashboard hay GET /api/v1/vas/dashboard
```

> **Fix:** BE cần tạo thêm `GET /api/v1/vas-wo/dashboard/summary` endpoint, hoặc FE tính toán từ WO list.

---

## 8. BE có, FE không gọi

| BE Route | Ghi chú |
|---------|---------|
| `PATCH /api/v1/vas-wo/:id` | Update WO (DRAFT only) — FE không có Edit form |
| `GET /api/v1/vas-wo/:id/sessions` | Chi tiết sessions của WO — FE không có |
| `GET /api/v1/vas-wo/:id/history` | Lịch sử WO — FE không có |

---

## 9. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | `app.module.ts` không import VasModule | Thêm `VasModule` vào imports |

### 🔴 CRITICAL

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/vas'` — double-prefix + sai path | `vas.api.js:5` | Đổi thành `'/vas-wo'` |
| C2 | `@Controller('api/v1/vas-wo')` — double-prefix trong NestJS | `vas-wo-command.controller.ts:33`, `vas-session.controller.ts:24`, `vas-wo-query.controller.ts` | Đổi thành `'vas-wo'` trong 3 controllers |
| C3 | Tất cả FE paths dùng `/work-orders/` prefix thừa | `vas.api.js` lines 14,18,22,27,31,34,38 | Bỏ `/work-orders` segment |
| C4 | `releaseWorkOrder` gọi `/release` — BE dùng `/confirm` | `vas.api.js:27` | Đổi → `confirmWorkOrder` calling `/confirm` |
| C5 | `startWorkOrder` gọi `/start` — BE không có | `vas.api.js:31` | Xóa API call; logic trigger IN_PROGRESS qua session |
| C6 | Standalone sessions (`startSession`, `endSession`, `recordBag`) — BE không có | `vas.api.js` lines 43-55 | Thiết kế lại: dùng `POST /vas-wo/:woId/session` với payload đủ fields |
| C7 | `getDashboard` — BE không có endpoint này | `vas.api.js:57` | Tạo BE endpoint hoặc tính từ WO list |
| C8 | FE page dùng status `RELEASED` — BE dùng `CONFIRMED` | `VasWorkOrdersPage.jsx:10,75,113` | Đổi tất cả `RELEASED` → `CONFIRMED` trong page |

### ⚠️ WARNING — BE có, FE thiếu

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | `PATCH /vas-wo/:id` — không có Edit form trong FE | Cần nếu muốn edit DRAFT WO |
| W2 | `GET /vas-wo/:id/sessions` — không có sessions view | FE có VasExecutionPage nhưng không dùng endpoint này |
| W3 | `GET /vas-wo/:id/history` — không có history view | State history cho WO |

---

## 10. Bảng tóm tắt

| Nhóm | BE routes | FE calls đúng | FE sai path | FE thiếu |
|------|-----------|---------------|-------------|----------|
| WO Command | 6 | 0 | 6 | 0 |
| WO Query | 4 | 0 | 2 | 2 |
| Session | 1 | 0 | 0 | 1 |
| **Tổng** | **11** | **0** | **8** | **3** |

---

## 11. Trạng thái tổng thể Module 9 (VAS) — CẬP NHẬT 2026-03-11

| Mục | Điểm |
|-----|------|
| API coverage | 0% correct paths |
| Path accuracy | ❌ CRITICAL — BASE_URL sai + `/work-orders/` thừa |
| BE Controller prefix | ❌ CRITICAL — double-prefix trong BE controllers |
| State machine | ❌ CRITICAL — FE dùng RELEASED/release/start, BE dùng CONFIRMED/confirm |
| Session model | ❌ CRITICAL — FE standalone sessions không tồn tại trong BE |
| Module registration | ❌ Chưa import vào app.module.ts |
| **Tổng** | **🔴 BLOCKED — Cần redesign FE API + fix BE controller prefix + register module** |

> **Ưu tiên fixes (theo thứ tự):**
> 1. Fix BE controller: `@Controller('api/v1/vas-wo')` → `@Controller('vas-wo')` (3 files) — phải đồng bộ với fix FE
> 2. Fix FE BASE_URL: `/api/v1/vas` → `/vas-wo`
> 3. Fix FE paths: bỏ `/work-orders` segment trong tất cả calls
> 4. Fix state machine: `release` → `confirm`, xóa `start`, đổi status label
> 5. Redesign session API: thay standalone sessions bằng `POST /vas-wo/:id/session`
> 6. Xử lý `getDashboard`: tạo BE endpoint hoặc tính từ FE side
> 7. Đăng ký VasModule vào app.module.ts (phối hợp BE team)
