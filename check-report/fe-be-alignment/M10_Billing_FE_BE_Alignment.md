# M10 — Billing & Commercial Control: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Billing & Commercial Control
**FE Pages:** `frontend/src/pages/billing/`
**FE Domain:** `frontend/src/domains/billing/`
**BE Module:** `backend/src/modules/billing/` (NestJS TypeScript)
**BE Docs:** `backend/docs/module-10-billing.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ❌ CRITICAL — 10/10 FE calls sai path |
| BASE_URL | ❌ Double-prefix (`/api/v1/billing`) |
| BE Controller prefix | ❌ **Tất cả 5 BE controllers đều double-prefix** (`@Controller('api/v1/billing/...')`) |
| Double-prefix coincidence | ⚠️ Giống Outbound — cả hai bên đều double-prefix, nhưng resource names KHÁC nhau → KHÔNG match |
| FE terminology | ❌ **SEMANTIC MISMATCH** — FE dùng `invoices`/`rate-cards`/`billable-events`, BE dùng `debit-notes`/`contracts`/`events` |
| FE lifecycle | ❌ FE: generate→approve→cancel; BE: generate→review→approve→lock (khác nhau) |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — BillingModule chưa được import |

---

## 2. BLOCKER hệ thống

> `billing.module.ts` là NestJS module nhưng **chưa được import vào `app.module.ts`**.
> Fix: Thêm `BillingModule` vào imports trong `app.module.ts`.

---

## 3. Double-prefix trên cả hai bên (KHÔNG match vì path khác)

### FE double-prefix
```js
const BASE_URL = '/api/v1/billing'
// axios combineURLs → http://localhost:3000/api/v1/api/v1/billing/...
```

### BE double-prefix (tất cả 5 controllers)
```typescript
@Controller('api/v1/billing/contracts')      // SAI
@Controller('api/v1/billing/debit-notes')    // SAI
@Controller('api/v1/billing/events')         // SAI
@Controller('api/v1/billing/exceptions')     // SAI
@Controller('api/v1/billing/day-types')      // SAI
// NestJS global prefix 'api/v1' + controller 'api/v1/...' → /api/v1/api/v1/billing/...
```

### Kết quả: Double-prefix match nhau nhưng resource names KHÁC
| | FE gọi | BE serve | Match? |
|-|--------|---------|--------|
| Debit Notes | `/api/v1/api/v1/billing/invoices` | `/api/v1/api/v1/billing/debit-notes` | ❌ |
| Contracts | `/api/v1/api/v1/billing/rate-cards` | `/api/v1/api/v1/billing/contracts` | ❌ |
| Events | `/api/v1/api/v1/billing/billable-events` | `/api/v1/api/v1/billing/events` | ❌ |

> **Fix FE:** `BASE_URL = '/api/v1/billing'` → `BASE_URL = '/billing'`
> **Fix BE:** `@Controller('api/v1/billing/...')` → `@Controller('billing/...')` trong 5 controllers (trừ `internal/billing/events` — đúng rồi)

---

## 4. CRITICAL: Semantic mismatch — FE dùng sai tên resource

### 4.1 Debit Note vs "Invoice"

FE đặt tên theo "Invoice" nhưng BE dùng "Debit Note":

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getInvoices(params)` | `GET .../invoices` | `GET /billing/debit-notes` | ❌ `/invoices` → `/debit-notes` |
| `getInvoiceById(id)` | `GET .../invoices/${id}` | `GET /billing/debit-notes/:id` | ❌ same |
| `generateInvoice(data)` | `POST .../invoices/generate` | `POST /billing/debit-notes` | ❌ path sai + thừa `/generate` |
| `approveInvoice(id)` | `POST .../invoices/${id}/approve` | `PUT /billing/debit-notes/:id/approve` | ❌ path sai + method POST≠PUT |
| `cancelInvoice(id)` | `POST .../invoices/${id}/cancel` | ❌ **BE không có `/cancel`** | 404 |

---

### 4.2 Contract vs "Rate Card"

FE đặt tên "Rate Card" nhưng BE dùng "Contract":

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getRateCards(params)` | `GET .../rate-cards` | ❌ **BE không có `/rate-cards`** — dùng `/contracts` | 404 |
| `createRateCard(data)` | `POST .../rate-cards` | ❌ **BE không có `/rate-cards`** | 404 |
| `updateRateCard(id)` | `PUT .../rate-cards/${id}` | ❌ **BE không có `/rate-cards`** | 404 |

> Rate card logic trong BE nằm trong **Contract → Fee Lines** (nested resource)

---

### 4.3 Events vs "Billable Events"

| FE API Call | FE Path | BE Route | Trạng thái |
|------------|---------|---------|-----------|
| `getBillableEvents(params)` | `GET .../billable-events` | `GET /billing/events` | ❌ `/billable-events` → `/events` |

---

### 4.4 Dashboard — BE không có endpoint này

```js
getDashboard: (params) => httpClient.get(`${BASE_URL}/dashboard`, { params })
// BE không có GET /api/v1/billing/dashboard
```

---

## 5. CRITICAL: Lifecycle mismatch — Debit Note

| FE Action | FE API Call | BE Route | Trạng thái |
|-----------|------------|---------|-----------|
| Generate | `POST .../invoices/generate` | `POST /billing/debit-notes` (body có periodStart/periodEnd) | ❌ path sai |
| **[Không có FE]** | — | `PUT /billing/debit-notes/:id/review` | ⚠️ FE thiếu Review step |
| Approve | `POST .../invoices/${id}/approve` | `PUT /billing/debit-notes/:id/approve` | ❌ path sai + POST≠PUT |
| **[Không có FE]** | — | `PUT /billing/debit-notes/:id/lock` | ⚠️ FE thiếu Lock step (quan trọng nhất — triggers ERP push) |
| Cancel | `POST .../invoices/${id}/cancel` | ❌ **BE không có cancel** | 404 |

---

## 6. BE có, FE hoàn toàn không gọi

| BE Resource | BE Routes | Ghi chú |
|-------------|----------|---------|
| Contracts | `POST/GET/GET:id/PUT/POST:id/activate/POST:id/deactivate/GET:id/fee-lines` (7 routes) | FE dùng "rate-cards" thay thế |
| Day Types | `POST/POST bulk/GET` (3 routes) | Không có DayTypePage trong FE |
| Exceptions | `GET/GET:id/PUT:id/resolve` (3 routes) | Không có ExceptionsPage trong FE |
| DN Review | `PUT /debit-notes/:id/review` | FE không có review step |
| DN Lock | `PUT /debit-notes/:id/lock` | FE không có lock step |
| DN History | `GET /debit-notes/:id/history` | FE không có history view |
| Internal Capture | `POST /internal/billing/events/capture` | Internal-only, OK nếu không có FE |

---

## 7. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | `app.module.ts` không import BillingModule | Thêm `BillingModule` vào imports |

### 🔴 CRITICAL

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/billing'` — double-prefix | `billing.api.js:5` | Đổi thành `'/billing'` |
| C2 | 5 BE controllers dùng `@Controller('api/v1/billing/...')` | 5 controller files | Đổi thành `'billing/...'` trong 5 controllers |
| C3 | FE dùng `/invoices/` — BE dùng `/debit-notes/` | `billing.api.js` lines 14,18,22,26,29 | Đổi tất cả `/invoices` → `/debit-notes` |
| C4 | FE dùng `/rate-cards/` — BE dùng `/contracts/` với fee-lines | `billing.api.js` lines 33,37,41 | Redesign: dùng contract CRUD thay rate-cards |
| C5 | FE dùng `/billable-events` — BE dùng `/events` | `billing.api.js:44` | Đổi `/billable-events` → `/events` |
| C6 | `generateInvoice` gọi `POST /invoices/generate` — BE là `POST /debit-notes` | `billing.api.js:22` | Fix path + bỏ `/generate` suffix |
| C7 | `approveInvoice` dùng POST — BE dùng PUT | `billing.api.js:26` | Đổi `httpClient.post` → `httpClient.put` |
| C8 | `cancelInvoice` — BE không có cancel endpoint | `billing.api.js:29` | Xóa hoặc thay bằng action khác |
| C9 | `getDashboard` — BE không có endpoint này | `billing.api.js:48` | Xóa hoặc tính từ FE |

### ⚠️ WARNING — BE có, FE thiếu (blocking nếu muốn full billing workflow)

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | Không có contracts management UI (7 routes) | Critical — rate setup không có FE |
| W2 | Không có DN Review step | Review → Approve flow bị thiếu |
| W3 | Không có DN Lock step | Lock triggers ERP push — quan trọng nhất trong billing |
| W4 | Không có Exceptions page (3 routes) | Billing exceptions không visible |
| W5 | Không có Day Types calendar page | Holiday/OT multiplier setup |

---

## 8. Bảng tóm tắt coverage

| Nhóm | BE routes | FE calls | Đúng path | Sai path | FE thiếu |
|------|-----------|----------|-----------|----------|----------|
| Contracts | 7 | 3 (rate-cards) | 0 | 3 | 4 |
| Day Types | 3 | 0 | 0 | 0 | 3 |
| Events | 2 | 1 | 0 | 1 | 1 |
| Debit Notes | 7 | 5 | 0 | 4+cancel | 2 (review+lock) |
| Exceptions | 3 | 0 | 0 | 0 | 3 |
| **Tổng** | **22** | **10** | **0** | **8** | **13** |

---

## 9. Trạng thái tổng thể Module 10 (Billing)

| Mục | Điểm |
|-----|------|
| API coverage | 0% correct paths |
| Path/naming accuracy | ❌ CRITICAL — invoices/rate-cards/billable-events ≠ debit-notes/contracts/events |
| BE Controller prefix | ❌ CRITICAL — double-prefix trong 5 controllers |
| Lifecycle | ❌ CRITICAL — thiếu review step + lock step; có cancel không tồn tại |
| HTTP method | ❌ approve dùng POST thay PUT |
| Module registration | ❌ Chưa import vào app.module.ts |
| **Tổng** | **🔴 BLOCKED — Cần rename resource paths + fix lifecycle + fix BE prefixes + register module** |

> **Ưu tiên fixes (theo thứ tự):**
> 1. Fix BE controllers: `@Controller('api/v1/billing/...')` → `@Controller('billing/...')` (5 files)
> 2. Fix FE BASE_URL: `/api/v1/billing` → `/billing`
> 3. Rename FE resources: `invoices` → `debit-notes`, `rate-cards` → `contracts`, `billable-events` → `events`
> 4. Fix `generateInvoice`: remove `/generate` suffix; fix method `approveInvoice`: POST → PUT
> 5. Add `reviewDebitNote`, `lockDebitNote` API calls + UI buttons
> 6. Add contracts CRUD UI (essential for rate setup)
> 7. Đăng ký BillingModule vào app.module.ts
