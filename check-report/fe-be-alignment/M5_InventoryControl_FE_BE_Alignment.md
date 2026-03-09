# M5 — Inventory Control: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Inventory Control
**FE Pages:** `frontend/src/pages/inventory-control/` (6 pages)
**FE Domain:** `frontend/src/domains/inventory-control/`
**BE Module:** `backend/src/modules/inventory-control/` (**Fastify** framework)
**BE Docs:** `backend/docs/module-6-inventory-control.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ❌ CRITICAL — `BASE_URL = '/api/v1/inventory-control'` double-prefix + 3 path mismatches |
| Response format | ✅ KHỚP |
| Auth header | ✅ KHỚP |
| Idempotency-Key | ✅ KHỚP |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — inventory-control không được import |
| BE tech stack | ⚠️ **Fastify** (khác với Foundation/MasterData dùng NestJS và Inbound/InventoryCore dùng Express) |

> **Ghi chú kiến trúc:** Dự án đang dùng 3 framework web khác nhau:
> - NestJS (TypeScript): Foundation, MasterData, Auth, Billing, Outbound, Reporting, VAS, Integration Platform
> - Express.js: Inbound, Inventory Core
> - **Fastify**: Inventory Control

---

## 2. BLOCKER hệ thống

> `app.module.ts` chỉ import 3 modules (Foundation, MasterData, Auth). inventory-control chưa được đăng ký.
> Inventory-control dùng Fastify — tích hợp vào NestJS app sẽ cần hybrid adapter hoặc chuyển đổi sang NestJS.

---

## 3. CRITICAL: BASE_URL double-prefix bug

```js
const BASE_URL = '/api/v1/inventory-control'  // SAI
// Kết quả: http://localhost:3000/api/v1/api/v1/inventory-control/...  ← 404
// Fix: BASE_URL = '/inventory-control'
```

---

## 4. CRITICAL: Path Mismatches (3 nhóm)

### 4.1 Move Orders — FE dùng `/move-orders`, BE dùng `/moves`

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|----------|-----------|
| `getMoveOrders(params)` | `GET .../move-orders` | `GET /moves` | ❌ PATH MISMATCH |
| `getMoveOrderById(id)` | `GET .../move-orders/:id` | `GET /moves/:id` | ❌ PATH MISMATCH |
| `createMoveOrder(data)` | `POST .../move-orders` | `POST /moves` | ❌ PATH MISMATCH |
| `confirmMoveOrder(id)` | `POST .../move-orders/:id/confirm` | `POST /moves/:id/confirm` | ❌ PATH MISMATCH |
| `executeMoveOrder(id)` | `POST .../move-orders/:id/execute` | `POST /moves/:id/execute` | ❌ PATH MISMATCH |
| `cancelMoveOrder(id, data)` | `POST .../move-orders/:id/cancel` | `POST /moves/:id/cancel` | ❌ PATH MISMATCH |

> **Fix FE:** Đổi tất cả `/move-orders` → `/moves` trong `inventoryControl.api.js`

---

### 4.2 Transfer Orders — FE dùng `/transfer-orders`, BE dùng `/transfers`

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|----------|-----------|
| `getTransferOrders(params)` | `GET .../transfer-orders` | `GET /transfers` | ❌ PATH MISMATCH |
| `getTransferOrderById(id)` | `GET .../transfer-orders/:id` | `GET /transfers/:id` | ❌ PATH MISMATCH |
| `createTransferOrder(data)` | `POST .../transfer-orders` | `POST /transfers` | ❌ PATH MISMATCH |
| `releaseTransferOrder(id)` | `POST .../transfer-orders/:id/release` | `POST /transfers/:id/release` | ❌ PATH MISMATCH |
| `shipTransferOrder(id)` | `POST .../transfer-orders/:id/ship` | `POST /transfers/:id/ship` | ❌ PATH MISMATCH |
| `receiveTransferOrder(id)` | `POST .../transfer-orders/:id/receive` | `POST /transfers/:id/receive` | ❌ PATH MISMATCH |
| `closeTransferOrder(id)` | `POST .../transfer-orders/:id/close` | `POST /transfers/:id/close` | ❌ PATH MISMATCH |
| `cancelTransferOrder(id)` | `POST .../transfer-orders/:id/cancel` | `POST /transfers/:id/cancel` | ❌ PATH MISMATCH |

> **Fix FE:** Đổi tất cả `/transfer-orders` → `/transfers` trong `inventoryControl.api.js`

---

### 4.3 OnHand by Item — FE dùng `/on-hand/item/:id`, BE dùng `/on-hand/:itemId`

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|----------|-----------|
| `getOnHandByItem(itemId)` | `GET .../on-hand/item/${itemId}` | `GET /on-hand/:itemId` | ❌ PATH MISMATCH (extra `/item/` segment) |

> **Fix FE:** Đổi `` `${BASE_URL}/on-hand/item/${itemId}` `` → `` `${BASE_URL}/on-hand/${itemId}` ``

---

## 5. Kiểm tra các nhóm còn lại

### 5.1 On-Hand Inquiry

| BE Route | FE API Call | Trạng thái |
|---------|------------|-----------|
| `GET /on-hand` | `getOnHand(params)` | ✅ KHỚP (path đúng) |
| `GET /on-hand/:itemId` | `getOnHandByItem(itemId)` | ❌ PATH MISMATCH (xem 4.3) |
| `GET /movement-history` | `getMovementHistory(params)` | ✅ KHỚP |

---

### 5.2 Status Changes

| BE Route | FE API Call | Trạng thái |
|---------|------------|-----------|
| `GET /status-changes` | `getStatusChanges(params)` | ✅ KHỚP |
| `POST /status-changes` | `createStatusChange(data)` | ✅ KHỚP |
| `GET /status-changes/:id` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi |
| `POST /status-changes/:id/cancel` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi — StatusChangePage không có Cancel btn |
| `POST /status-changes/:id/reverse` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi — StatusChangePage không có Reverse btn |

---

### 5.3 Cycle Counts

| BE Route | FE API Call | Trạng thái |
|---------|------------|-----------|
| `POST /cycle-count-plans` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi |
| `POST /cycle-counts` | `createCycleCount(data)` | ✅ KHỚP |
| `GET /cycle-counts` | `getCycleCounts(params)` | ✅ KHỚP |
| `GET /cycle-counts/:id` | `getCycleCountById(id)` | ✅ KHỚP |
| `POST /cycle-counts/:id/release` | `releaseCycleCount(id)` | ✅ KHỚP |
| `POST /cycle-counts/:id/submit` | `submitCycleCount(id, data)` | ✅ KHỚP |
| `POST /cycle-counts/:id/recount` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi — CycleCountPage không có Recount btn |
| `POST /cycle-counts/:id/approve` | `approveCycleCount(id)` | ✅ KHỚP |
| `POST /cycle-counts/:id/post` | `postCycleCount(id)` | ✅ KHỚP |
| `POST /cycle-counts/:id/cancel` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi — không có Cancel btn |

---

### 5.4 Adjustments

| BE Route | FE API Call | Trạng thái |
|---------|------------|-----------|
| `POST /adjustments` | `createAdjustment(data)` | ✅ KHỚP |
| `GET /adjustments` | `getAdjustments(params)` | ✅ KHỚP |
| `GET /adjustments/:id` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi |
| `POST /adjustments/:id/submit` | `submitAdjustment(id)` | ✅ KHỚP |
| `POST /adjustments/:id/approve` | `approveAdjustment(id)` | ✅ KHỚP |
| `POST /adjustments/:id/post` | `postAdjustment(id)` | ✅ KHỚP |
| `POST /adjustments/:id/cancel` | **KHÔNG CÓ** | ⚠️ BE có, FE không gọi — AdjustmentsPage không có Cancel btn |

---

### 5.5 Reconciliation

| BE Route | FE API Call | Trạng thái |
|---------|------------|-----------|
| `POST /reconciliation-reviews/run` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |
| `GET /reconciliation-reviews` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |
| `GET /reconciliation-reviews/:id` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |
| `POST /reconciliation-reviews/:id/assign` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |
| `POST /reconciliation-reviews/:id/resolve` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |
| `POST /reconciliation-reviews/:id/close` | **KHÔNG CÓ** | ❌ Không có FE page Reconciliation |

> **Kết luận:** Toàn bộ Reconciliation Review feature có BE nhưng **không có FE page/UI** nào. Đây là UI gap lớn.

---

## 6. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | app.module.ts không import inventory-control | Đăng ký vào NestJS app |
| SB2 | inventory-control dùng Fastify, không phải NestJS | Chuyển sang NestJS hoặc dùng Fastify adapter |

### 🔴 CRITICAL

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/inventory-control'` double-prefix | `inventoryControl.api.js:5` | Đổi thành `'/inventory-control'` |
| C2 | FE dùng `/move-orders`, BE dùng `/moves` (6 calls) | `inventoryControl.api.js` lines 24–47 | Đổi tất cả `move-orders` → `moves` |
| C3 | FE dùng `/transfer-orders`, BE dùng `/transfers` (8 calls) | `inventoryControl.api.js` lines 48–79 | Đổi tất cả `transfer-orders` → `transfers` |
| C4 | FE dùng `on-hand/item/${itemId}`, BE dùng `on-hand/:itemId` | `inventoryControl.api.js:18` | Đổi `/on-hand/item/${itemId}` → `/on-hand/${itemId}` |

### ⚠️ WARNING — BE có nhưng FE thiếu (không blocker cho MVP)

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | Không có ReconciliationPage (6 BE endpoints không có FE) | Feature này thường dùng bởi Manager — có thể phase 2 |
| W2 | Không có `POST /cycle-counts/:id/recount` trong FE | Recount button thiếu trong CycleCountPage |
| W3 | Không có cancel/reverse cho Status Change | StatusChangePage thiếu Cancel/Reverse btn |
| W4 | Không có cancel cho Adjustment | AdjustmentsPage thiếu Cancel btn |
| W5 | Không có cancel cho Cycle Count | CycleCountPage thiếu Cancel btn |
| W6 | Không có `POST /cycle-count-plans` trong FE | Planned count chưa có UI |

---

## 7. Bảng tóm tắt coverage

| Nhóm | BE routes | FE gọi đúng | Path mismatch | FE thiếu |
|------|-----------|-------------|---------------|----------|
| On-Hand | 3 | 2 | 1 | 0 |
| Move Orders | 6 | 0 | 6 | 0 |
| Transfer Orders | 9 | 0 | 8 | 1 (aging) |
| Status Changes | 5 | 2 | 0 | 3 |
| Cycle Counts | 9 | 6 | 0 | 3 |
| Adjustments | 6 | 5 | 0 | 1 |
| Reconciliation | 6 | 0 | 0 | 6 |
| **Tổng** | **44** | **15** | **15** | **14** |

---

## 8. Trạng thái tổng thể Module 5 (Inventory Control)

| Mục | Điểm |
|-----|------|
| API coverage | 34% (15/44 BE routes được FE gọi đúng path) |
| Path accuracy | CRITICAL — 15 path mismatches (move-orders/transfers/on-hand) |
| URL base path | ❌ SAI — cần fix BASE_URL |
| Module registration | ❌ Chưa đăng ký vào NestJS app |
| **Tổng** | **🔴 BLOCKED — System blocker + C1-C4 critical fixes bắt buộc trước khi switch real BE** |

> **Ưu tiên fixes (theo thứ tự):**
> 1. Fix BASE_URL: `/api/v1/inventory-control` → `/inventory-control`
> 2. Fix path: `move-orders` → `moves` (6 occurrences)
> 3. Fix path: `transfer-orders` → `transfers` (8 occurrences)
> 4. Fix path: `on-hand/item/${itemId}` → `on-hand/${itemId}` (1 occurrence)
> 5. Tích hợp module vào NestJS app (coordination với BE team)
