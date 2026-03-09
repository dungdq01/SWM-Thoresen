# M4 — Inventory Core: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Inventory Core Engine
**FE Pages:** `frontend/src/pages/inventory-core/` (4 pages)
**FE Domain:** `frontend/src/domains/inventory-core/`
**BE Module:** `backend/src/modules/inventory-core/` (Express.js)
**BE Docs:** `backend/docs/module-3-inventory-core.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ✅ KHỚP — `BASE_URL = '/inventory'` (đúng pattern, không double-prefix) |
| Response format | ✅ KHỚP — httpClient unwrap response.data |
| Auth header | ✅ KHỚP — auto-attach x-user-code |
| Idempotency-Key | ✅ KHỚP — auto-generate cho POST |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — inventory-core KHÔNG được import (cùng blocker với M3 Inbound) |
| BE tech stack | ⚠️ Express.js (`.js` files), không phải NestJS TypeScript |

---

## 2. BLOCKER hệ thống

> Giống M3 Inbound, module `inventory-core` dùng **Express.js** và **không được đăng ký** trong `app.module.ts`. Khi switch sang real BE, tất cả API inventory core sẽ trả về 404.
>
> **Fix:** Tích hợp vào NestJS app (chuyển sang NestJS hoặc dùng hybrid Express adapter).

---

## 3. Kiểm tra từng API endpoint

### 3.1 Postings (Posting Engine)

| BE Route | FE API Call | Hook | UI | Trạng thái |
|---------|------------|------|----|-----------|
| `POST /inventory/postings` | `inventoryCoreApi.createPosting()` | `useCreatePosting` | InventoryPostingWorkbenchPage | ✅ KHỚP |
| `POST /inventory/postings/reverse` | `inventoryCoreApi.reversePosting()` | `useReversePosting` | InventoryPostingWorkbenchPage | ✅ KHỚP |

---

### 3.2 On-Hand Queries

| BE Route | FE API Call | Hook | UI | Trạng thái |
|---------|------------|------|----|-----------|
| `GET /inventory/onhand` | `inventoryCoreApi.getOnHand()` | `useOnHandList` | InventoryOnHandPage | ✅ KHỚP |
| `GET /inventory/onhand/availability` | `inventoryCoreApi.getAvailability()` | `useAvailabilityCheck` | (internal — M5 Outbound dùng) | ✅ KHỚP |

---

### 3.3 Transaction History

| BE Route | FE API Call | Hook | UI | Trạng thái |
|---------|------------|------|----|-----------|
| `GET /inventory/transactions` | `inventoryCoreApi.getTransactions()` | `useTransactionList` | InventoryTransactionsPage | ✅ KHỚP |
| `GET /inventory/transactions/:transId` | `inventoryCoreApi.getTransactionById()` | `useTransactionDetail` | (detail via row click) | ✅ KHỚP |

---

### 3.4 Hold / Allocation

| BE Route | FE API Call | Hook | UI | Trạng thái |
|---------|------------|------|----|-----------|
| `POST /inventory/holds` | `inventoryCoreApi.createHold()` | `useCreateHold` | InventoryHoldsPage Create form | ✅ KHỚP |
| `GET /inventory/holds` | `inventoryCoreApi.getHolds()` | `useHoldList` | InventoryHoldsPage list | ✅ KHỚP |
| `GET /inventory/holds/:holdId` | N/A | N/A | Không có UI | ⚠️ BE có, FE không gọi (không cần — list đủ) |
| `POST /inventory/holds/:holdId/release` | `inventoryCoreApi.releaseHold()` | `useReleaseHold` | InventoryHoldsPage Release btn | ✅ KHỚP |
| `POST /inventory/holds/:holdId/cancel` | `inventoryCoreApi.cancelHold()` | `useCancelHold` | InventoryHoldsPage Cancel btn | ✅ KHỚP |

---

## 4. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Impact | Fix |
|---|--------|--------|-----|
| SB1 | `app.module.ts` không import inventory-core | 100% API 404 khi switch real BE | Tích hợp module vào NestJS app |
| SB2 | inventory-core dùng Express.js, không phải NestJS | Không import trực tiếp được | Chuyển sang NestJS hoặc dùng hybrid adapter |

### ⚠️ WARNING — Minor gap

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | `GET /inventory/holds/:holdId` không có FE call | Không cần thiết — list view đủ. Không phải lỗi. |

### ✅ MATCH — Hoàn toàn khớp (sau khi giải quyết blocker)

- Posting Engine: createPosting + reversePosting ✅
- OnHand: getOnHand + getAvailability ✅
- Transactions: getTransactions + getTransactionById ✅
- Holds: createHold + getHolds + releaseHold + cancelHold ✅
- URL base path: `/inventory` đúng (không double-prefix) ✅
- Hook chain hoàn chỉnh: API → hook → page cho tất cả operations ✅

---

## 5. Trạng thái tổng thể Module 4 (Inventory Core)

| Mục | Điểm |
|-----|------|
| API coverage | 100% (10/10 FE API calls có BE route tương ứng) |
| Data format alignment | 100% |
| URL base path | ✅ ĐÚNG (`/inventory`) |
| Auth/header alignment | 100% |
| Module registration | ❌ Chưa đăng ký vào NestJS app |
| **Tổng** | **⚠️ CONDITIONAL PASS — 1 system blocker (chung với tất cả modules ngoài M1/M2/Auth), không có critical riêng** |
