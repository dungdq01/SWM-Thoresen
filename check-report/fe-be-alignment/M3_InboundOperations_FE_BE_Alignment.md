# M3 — Inbound Operations: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Inbound Operations
**FE Pages:** `frontend/src/pages/inbound-operations/` (4 pages)
**FE Domain:** `frontend/src/domains/inbound-operations/`
**BE Module:** `backend/src/modules/inbound/` (Express.js)
**BE Docs:** `backend/docs/module-4-inbound.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ❌ CRITICAL — `BASE_URL = '/api/v1/inbound'` bị double-prefix với httpClient baseURL |
| Response format | ✅ KHỚP — httpClient unwrap response.data |
| Auth header | ✅ KHỚP — auto-attach x-user-code |
| Idempotency-Key | ✅ KHỚP — auto-generate cho POST |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — InboundModule KHÔNG được import vào NestJS app |
| BE tech stack | ⚠️ Inbound dùng Express.js (`.js` files), không phải NestJS TypeScript |

---

## 2. BLOCKER hệ thống: app.module.ts

> **Kiểm tra thực tế `backend/src/app.module.ts`:**
> ```
> imports: [FoundationModule, MasterDataModule, AuthModule]
> ```
> **Chỉ có 3 module được đăng ký.** Toàn bộ module Inbound, Outbound, Billing, Inventory, VAS, Reporting, Integration **chưa được import vào NestJS app**.

> **Riêng Inbound:** Module này dùng Express.js (`inbound.routes.js`, `inbound.controller.js`, `index.js`), **không phải NestJS**. Không thể import trực tiếp bằng `@Module`. Cần 1 trong 2 cách:
> - **Option A (recommended):** Chuyển đổi sang NestJS pattern (tạo `inbound.module.ts`, controller/service TypeScript)
> - **Option B:** Dùng NestJS hybrid adapter để mount Express Router từ `createInboundRoutes()`

> **Impact:** Khi switch sang real BE, 100% API inbound sẽ 404. **Fix bắt buộc trước khi go-live.**

---

## 3. CRITICAL: BASE_URL double-prefix bug

### Vấn đề
```js
// inboundOperations.api.js
const BASE_URL = '/api/v1/inbound'  // ← SAI

// httpClient.js
baseURL: `${API_BASE_URL}/api/v1`  // = 'http://localhost:3000/api/v1'
```

### axios combineURLs logic (đã verify từ source code):
```js
combineURLs('http://localhost:3000/api/v1', '/api/v1/inbound/receipts')
= 'http://localhost:3000/api/v1' + '/' + 'api/v1/inbound/receipts'   // leading '/' stripped
= 'http://localhost:3000/api/v1/api/v1/inbound/receipts'   ← 404!
```

### Fix đúng (theo pattern của master-data và auth):
```js
const BASE_URL = '/inbound'  // ĐÚNG — httpClient baseURL tự thêm /api/v1
// Kết quả: http://localhost:3000/api/v1/inbound/receipts ✅
```

> **Impact:** Trong mock mode: bình thường (mock bypass URL). Khi switch sang real BE: 100% API call 404.
> **Tầm rộng:** Lỗi này ảnh hưởng 8 module FE (billing, inbound, integration, inventory-control, outbound, reporting, vas, work-execution). Chỉ master-data và inventory-core dùng đúng pattern.

---

## 4. Kiểm tra từng API endpoint

### 4.1 Dashboard

| BE Route | FE API Call | UI | Trạng thái |
|---------|------------|-----|-----------|
| `GET /inbound/dashboard/summary` | `inboundOperationsApi.getDashboardSummary()` | InboundReceiptsPage summary cards | ✅ KHỚP (sau khi fix BASE_URL) |

---

### 4.2 Receipt CRUD & State Commands

| BE Route | FE API Call | UI | Trạng thái |
|---------|------------|-----|-----------|
| `POST /inbound/receipts` | `createReceipt(data)` | InboundReceiptsPage Create form | ✅ KHỚP |
| `GET /inbound/receipts` | `getReceipts(params)` | InboundReceiptsPage list | ✅ KHỚP |
| `GET /inbound/receipts/:id` | `getReceiptById(id)` | Detail / drawer | ✅ KHỚP |
| `GET /inbound/receipts/:id/history` | `getReceiptHistory(id)` | InboundExecutionPage history tab | ✅ KHỚP |
| `POST /inbound/receipts/:id/confirm` | `confirmReceipt(id)` | InboundReceiptsPage Confirm btn | ✅ KHỚP |
| `POST /inbound/receipts/:id/start-processing` | `startProcessing(id)` | InboundExecutionPage Start btn | ✅ KHỚP |
| `POST /inbound/receipts/:id/reweigh` | `reweighReceipt(id)` | InboundExceptionsPage Reweigh btn | ✅ KHỚP |
| `POST /inbound/receipts/:id/cancel` | `cancelReceipt(id, data)` | InboundExceptionsPage Cancel btn | ✅ KHỚP |
| `POST /inbound/receipts/:id/close` | `completePutaway(id)` | InboundPutawayPage Complete btn | ✅ KHỚP — FE đặt tên `completePutaway` nhưng gọi đúng `/close` |

---

### 4.3 Weighing Events

| BE Route | FE API Call | UI | Trạng thái |
|---------|------------|-----|-----------|
| `POST /inbound/weigh-events/in` | `recordWeighIn(data)` | InboundExecutionPage Weigh-In form | ✅ KHỚP |
| `POST /inbound/weigh-events/out` | `recordWeighOut(data)` | InboundExecutionPage Weigh-Out form | ✅ KHỚP |

---

### 4.4 FE-only calls (BE không có route)

| FE API Call | FE URL | UI sử dụng | Trạng thái |
|------------|--------|------------|-----------|
| `applyManualWeight(id, data)` | `POST /inbound/receipts/:id/manual-weight` | InboundExecutionPage (manual weight form) | ❌ **BE KHÔNG CÓ** — 404 khi kết nối real BE |
| `getExceptions(params)` | `GET /inbound/exceptions` | InboundExceptionsPage list | ❌ **BE KHÔNG CÓ** — không có route trong inbound.routes.js |
| `getPutawayQueue(params)` | `GET /inbound/putaway-queue` | InboundPutawayPage list | ❌ **BE KHÔNG CÓ** — không có route trong inbound.routes.js |
| `getWeighLogs(id)` | `GET /inbound/receipts/:id/weigh-logs` | InboundExecutionPage weigh history tab | ❌ **BE KHÔNG CÓ** — không có route trong inbound.routes.js |

> **Ghi chú:**
> - `getExceptions`: InboundExceptionsPage thực chất là filter các receipts có status REJECTED/CANCELLED. BE có thể lấy từ `GET /receipts?status=REJECTED` — FE cần dùng route đó thay vì gọi `/exceptions` riêng.
> - `getPutawayQueue`: Tương tự — có thể dùng `GET /receipts?status=RECEIVED` thay vì `/putaway-queue`.
> - `getWeighLogs`: BE có `receipt_weighing` repository nhưng không expose qua HTTP endpoint.
> - `applyManualWeight`: Feature này không có trong BE docs — cần xác nhận thiết kế nghiệp vụ.

---

## 5. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Impact | Fix |
|---|--------|--------|-----|
| SB1 | `app.module.ts` không import InboundModule | 100% API inbound 404 khi switch sang real BE | Đăng ký module vào NestJS app |
| SB2 | Inbound dùng Express.js, không phải NestJS | Không thể import trực tiếp vào NestJS | Chuyển sang NestJS hoặc dùng hybrid adapter |

### 🔴 CRITICAL

| # | Vấn đề | File | Impact | Fix |
|---|--------|------|--------|-----|
| C1 | `BASE_URL = '/api/v1/inbound'` double-prefix | `inboundOperations.api.js:5` | 100% API call 404 | Đổi thành `'/inbound'` |
| C2 | `applyManualWeight` gọi endpoint không tồn tại | `inboundOperations.api.js:44` | Manual weight sẽ 404 | BE thêm endpoint hoặc remove FE feature |
| C3 | `getExceptions` gọi endpoint không tồn tại | `inboundOperations.api.js:57` | InboundExceptionsPage sẽ 404 | FE dùng `GET /receipts?status=...` filter thay thế |
| C4 | `getPutawayQueue` gọi endpoint không tồn tại | `inboundOperations.api.js:61` | InboundPutawayPage sẽ 404 | FE dùng `GET /receipts?status=RECEIVED` thay thế |
| C5 | `getWeighLogs` gọi endpoint không tồn tại | `inboundOperations.api.js:73` | Weigh history tab sẽ 404 | BE expose `/receipts/:id/weigh-logs` hoặc FE dùng `/receipts/:id/history` |

### ✅ MATCH (sau khi fix SB1, SB2, C1)

- Receipt lifecycle: Create, Confirm, StartProcessing, ReweighIn, WeighOut, Reweigh, Cancel, Close ✅
- Dashboard summary ✅
- Weigh events (in/out) ✅
- Receipt history ✅

---

## 6. Khuyến nghị

### Ưu tiên 1 (Blockers trước go-live)
1. **SB1/SB2:** Quyết định và implement việc tích hợp Inbound module vào NestJS app
2. **C1:** Fix `BASE_URL` trong `inboundOperations.api.js` — đổi `/api/v1/inbound` → `/inbound`

### Ưu tiên 2 (Missing endpoints)
3. **C3 (Easy fix):** Đổi `getExceptions` gọi `GET /receipts` với filter `status=REJECTED,CANCELLED` thay vì `/exceptions`
4. **C4 (Easy fix):** Đổi `getPutawayQueue` gọi `GET /receipts` với filter `status=RECEIVED` thay vì `/putaway-queue`
5. **C5:** BE thêm `GET /receipts/:id/weigh-logs` endpoint (data đã có trong `receipt-weighing.repository.js`)
6. **C2:** Xác nhận xem Manual Weight feature có trong thiết kế nghiệp vụ không; nếu không → remove khỏi FE

---

## 7. Trạng thái tổng thể Module 3 (Inbound)

| Mục | Điểm |
|-----|------|
| API coverage | 56% (9/16 FE API calls có BE route tương ứng) |
| Data format alignment | 100% |
| Auth/header alignment | 100% |
| URL base path | ❌ SAI — cần fix BASE_URL |
| Module registration | ❌ Chưa đăng ký vào NestJS app |
| **Tổng** | **🔴 BLOCKED — 2 system blockers + 5 criticals cần resolve trước khi switch real BE** |
