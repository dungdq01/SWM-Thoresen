# M6 — Outbound Operations: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Outbound Operations
**FE Pages:** `frontend/src/pages/outbound-operations/` (4 pages)
**FE Domain:** `frontend/src/domains/outbound-operations/`
**BE Module:** `backend/src/modules/outbound/` (NestJS TypeScript — `outbound.module.ts` tồn tại)
**BE Docs:** `backend/docs/module-5-outbound.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API path alignment | ✅ KHỚP — 18/18 FE calls match BE routes |
| Response format | ✅ KHỚP |
| Auth header | ✅ KHỚP |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — OutboundModule chưa được import |
| **Double-prefix (đặc biệt)** | ⚠️ Cả FE lẫn BE đều có double-prefix — **tình cờ match nhau** nhưng cần fix cả hai |

---

## 2. BLOCKER hệ thống

> Outbound là NestJS module (`.module.ts` tồn tại) nhưng **chưa được import vào `app.module.ts`**.
> Fix: Thêm `OutboundModule` vào imports trong `app.module.ts` — sau khi cũng fix double-prefix (xem mục 3).

---

## 3. ⚠️ Double-Prefix Tình Cờ Match (Cần Fix Cả Hai Bên)

### Vấn đề FE
```js
const BASE_URL = '/api/v1/outbound'  // SAI — double-prefix với httpClient baseURL
// axios combineURLs → http://localhost:3000/api/v1/api/v1/outbound/...
```

### Vấn đề BE
```typescript
// shipment.controller.ts
@Controller('api/v1/outbound/shipments')  // SAI — đã có NestJS global prefix 'api/v1'
// Full route → /api/v1/api/v1/outbound/shipments/...
```

### Kết quả
| | Prefix BE | Prefix FE | Kết quả |
|-|-----------|-----------|---------|
| Trạng thái hiện tại | `/api/v1/api/v1/outbound/...` | `/api/v1/api/v1/outbound/...` | ⚠️ Match nhau nhưng đường dẫn sai |
| Sau khi fix đúng | `/api/v1/outbound/...` | `/api/v1/outbound/...` | ✅ Match đúng chuẩn |

> **PHẢI FIX ĐỒNG BỘ CẢ HAI:** Nếu chỉ fix một bên, tất cả API sẽ 404.
>
> **Fix FE:** `BASE_URL = '/api/v1/outbound'` → `BASE_URL = '/outbound'`
> **Fix BE:** `@Controller('api/v1/outbound/shipments')` → `@Controller('outbound/shipments')` (tất cả 4 controllers)

---

## 4. Kiểm tra từng API endpoint

### 4.1 Shipment Management

| BE Controller + Route | FE API Call | UI | Trạng thái |
|----------------------|------------|-----|-----------|
| `@Controller('api/v1/outbound/shipments')` | | | |
| `@Post()` | `createShipment(data)` | OutboundShipmentsPage Create btn | ✅ KHỚP |
| `@Get()` | `getShipments(params)` | OutboundShipmentsPage list | ✅ KHỚP |
| `@Get(':id')` | `getShipmentById(id)` | (API có, không dùng trong page) | ✅ KHỚP |
| `@Post(':id/confirm')` | `confirmShipment(id)` | OutboundShipmentsPage Confirm btn | ✅ KHỚP |
| `@Post(':id/cancel')` | `cancelShipment(id, data)` | OutboundShipmentsPage Cancel btn | ✅ KHỚP |
| `@Post(':id/ship')` | `shipShipment(id)` | OutboundWeighingPage Ship btn | ✅ KHỚP |

---

### 4.2 Allocation

| BE Controller + Route | FE API Call | UI | Trạng thái |
|----------------------|------------|-----|-----------|
| `@Controller('api/v1/outbound/shipments')` | | | |
| `@Post(':id/allocate')` | `allocateShipment(id)` | OutboundAllocationPage Allocate btn | ✅ KHỚP |
| `@Post(':id/unallocate')` | `unallocateShipment(id)` | OutboundAllocationPage Unallocate btn | ✅ KHỚP |
| `@Get(':id/allocations')` | `getAllocations(id)` | OutboundAllocationPage detail | ✅ KHỚP |

---

### 4.3 Weighing

| BE Controller + Route | FE API Call | UI | Trạng thái |
|----------------------|------------|-----|-----------|
| `@Controller('api/v1/outbound/shipments')` | | | |
| `@Post(':id/weigh/tare')` | `recordTare(id, data)` | OutboundWeighingPage Tare form | ✅ KHỚP |
| `@Post(':id/weigh/gross')` | `recordGross(id, data)` | OutboundWeighingPage Gross form | ✅ KHỚP |
| `@Get(':id/weighing-history')` | `getWeighingHistory(id)` | OutboundWeighingPage history | ✅ KHỚP |

---

### 4.4 Approval

| BE Controller + Route | FE API Call | UI | Trạng thái |
|----------------------|------------|-----|-----------|
| `@Controller('api/v1/outbound')` | | | |
| `@Get('approvals/pending')` | `getPendingApprovals(warehouseId)` | OutboundApprovalsPage list | ✅ KHỚP |
| `@Post('shipments/:id/approve')` | `approveShipment(id, data)` | OutboundApprovalsPage Approve btn | ✅ KHỚP |
| `@Post('shipments/:id/reject')` | `rejectShipment(id, data)` | OutboundApprovalsPage Reject btn | ✅ KHỚP |

---

### 4.5 Query & Dashboard

| BE Controller + Route | FE API Call | UI | Trạng thái |
|----------------------|------------|-----|-----------|
| `@Controller('api/v1/outbound')` | | | |
| `@Get('dashboard/summary')` | `getDashboardSummary(warehouseId)` | OutboundShipmentsPage cards | ✅ KHỚP |
| `@Get('shipments/:id/history')` | `getShipmentHistory(id)` | (API có, không dùng trong pages) | ✅ KHỚP — API sẵn sàng, chưa có UI |
| `@Get('shipments/:id/exceptions')` | `getShipmentExceptions(id)` | OutboundApprovalsPage exceptions panel | ✅ KHỚP |
| `@Get('dashboard/kpis')` | **KHÔNG CÓ** | Không có UI | ⚠️ BE có, FE không gọi |

---

## 5. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | `app.module.ts` không import OutboundModule | Thêm `OutboundModule` vào imports |

### ⚠️ WARNING — Cần fix đồng bộ (không gây ngay lập tức break, nhưng sai về thiết kế)

| # | Vấn đề | Fix |
|---|--------|-----|
| W1 | FE `BASE_URL = '/api/v1/outbound'` — double-prefix | Đổi thành `'/outbound'` |
| W2 | BE `@Controller('api/v1/outbound/...')` — double-prefix với NestJS global prefix | Đổi thành `'outbound/...'` trong 4 controllers |

> **Lưu ý:** W1 + W2 hiện tại tình cờ match nhau. Nhưng khi fix một trong hai mà không fix cái kia → 100% API 404. **Phải fix đồng thời.**

### ℹ️ MINOR — Không phải lỗi

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| I1 | `GET /dashboard/kpis` có trong BE, FE không gọi | Feature analytics bổ sung, không cần thiết cho MVP |
| I2 | `getShipmentHistory(id)` trong API nhưng không được dùng trong page | Sẵn sàng khi cần, không phải lỗi |

---

## 6. Trạng thái tổng thể Module 6 (Outbound)

| Mục | Điểm |
|-----|------|
| API coverage | **100%** (18/18 FE calls match BE routes) |
| Data format alignment | 100% |
| URL path alignment | ⚠️ Cả hai bên cùng có double-prefix — tình cờ match, cần clean up |
| Module registration | ❌ Chưa import vào app.module.ts |
| **Tổng** | **⚠️ CONDITIONAL PASS — Clean nhất trong các module chưa đăng ký. Chỉ cần: (1) import module, (2) fix double-prefix đồng bộ.** |
