# M8 — Integration Platform: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Integration Platform
**FE Pages:** `frontend/src/pages/integration/` (4 pages)
**FE Domain:** `frontend/src/domains/integration/`
**BE Module:** `backend/src/modules/integration-platform/` (NestJS TypeScript)
**BE Docs:** `backend/docs/module-8-integration-platform.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths (10 FE calls) | ✅ KHỚP — sub-paths đúng hết |
| BASE_URL | ❌ Double-prefix — `/api/v1/integration` → fix thành `/integration` |
| Response format | ✅ KHỚP |
| Auth header | ✅ KHỚP |
| **app.module.ts** | ❌ **SYSTEM BLOCKER** — IntegrationPlatformModule chưa được import |
| FE scope | ⚠️ FE chỉ cover Monitoring + Alerts + Weighbridge (thiếu OCR, ERP Push, Mobile Sync UI) |

---

## 2. BLOCKER hệ thống

> `integration-platform.module.ts` là NestJS module nhưng **chưa được import vào `app.module.ts`**.
> Fix: Thêm `IntegrationPlatformModule` vào imports trong `app.module.ts`.

---

## 3. BASE_URL double-prefix

```js
const BASE_URL = '/api/v1/integration'  // SAI
// axios combineURLs → http://localhost:3000/api/v1/api/v1/integration/...
// Fix: BASE_URL = '/integration'
```

---

## 4. Kiểm tra từng API endpoint

### 4.1 Monitoring

| BE Route | FE API Call | Sub-path | Trạng thái |
|---------|------------|----------|-----------|
| `GET /api/v1/integration/monitoring/overview` | `getOverview()` | `/monitoring/overview` | ✅ Sub-path KHỚP |
| `GET /api/v1/integration/monitoring/channel-health` | `getChannelHealth()` | `/monitoring/channel-health` | ✅ Sub-path KHỚP |
| `GET /api/v1/integration/monitoring/stats` | `getDetailedStats()` | `/monitoring/stats` | ✅ Sub-path KHỚP |

---

### 4.2 Alerts

| BE Route | FE API Call | Sub-path | Trạng thái |
|---------|------------|----------|-----------|
| `GET /api/v1/integration/alerts` | `getAlerts(params)` | `/alerts` | ✅ Sub-path KHỚP |
| `GET /api/v1/integration/alerts/:id` | `getAlertById(id)` | `/alerts/${id}` | ✅ Sub-path KHỚP |
| `POST /api/v1/integration/alerts/:id/acknowledge` | `acknowledgeAlert(id, data)` | `/alerts/${id}/acknowledge` | ✅ Sub-path KHỚP |
| `POST /api/v1/integration/alerts/:id/resolve` | `resolveAlert(id, data)` | `/alerts/${id}/resolve` | ✅ Sub-path KHỚP |

---

### 4.3 Weighbridge

| BE Route | FE API Call | Sub-path | Trạng thái |
|---------|------------|----------|-----------|
| `GET /api/v1/integration/weighbridge/logs` | `getWeighbridgeLogs(params)` | `/weighbridge/logs` | ✅ Sub-path KHỚP |
| `GET /api/v1/integration/weighbridge/devices` | `getWeighbridgeDevices(params)` | `/weighbridge/devices` | ✅ Sub-path KHỚP |
| `POST /api/v1/integration/weighbridge/events/:id/reprocess` | `reprocessWeighEvent(id, data)` | `/weighbridge/events/${id}/reprocess` | ✅ Sub-path KHỚP |

---

### 4.4 BE có, FE không gọi (Agent/Operational APIs)

| BE Route | Ghi chú |
|---------|---------|
| `POST /integration/weighbridge/events` | Ingest từ local weighbridge agent — không phải web UI |
| `POST /integration/weighbridge/heartbeat` | Agent heartbeat — không phải web UI |
| `GET /integration/weighbridge/logs/:id` | Chi tiết log — chưa có WeighbridgeDetailPage |
| `POST /integration/ocr/uploads` | **Không có OCRPage trong FE** |
| `GET /integration/ocr/results` | **Không có OCRPage trong FE** |
| `GET /integration/ocr/results/:id` | **Không có OCRPage trong FE** |
| `POST /integration/ocr/results/:id/confirm` | **Không có OCRPage trong FE** |
| `POST /integration/ocr/results/:id/link` | **Không có OCRPage trong FE** |
| `POST /integration/ocr/results/:id/reject` | **Không có OCRPage trong FE** |
| `POST /integration/mobile-sync/batches` | Mobile App trực tiếp call — không qua web UI |
| `GET /integration/mobile-sync/batches` | Chưa có MobileSyncManagementPage |
| `GET /integration/mobile-sync/batches/:id` | Chưa có MobileSyncManagementPage |
| `GET /integration/mobile-sync/events/:id` | Chưa có MobileSyncManagementPage |
| `POST /integration/mobile-sync/events/:id/replay` | Chưa có MobileSyncManagementPage |
| `POST /integration/erp-push/jobs` | Chưa có ERPPushPage |
| `GET /integration/erp-push/jobs` | Chưa có ERPPushPage |
| `GET /integration/erp-push/jobs/:id` | Chưa có ERPPushPage |
| `POST /integration/erp-push/jobs/:id/retry` | Chưa có ERPPushPage |
| `POST /integration/erp-push/jobs/:id/cancel` | Chưa có ERPPushPage |

---

## 5. Tổng hợp issues

### 🔴 SYSTEM BLOCKER

| # | Vấn đề | Fix |
|---|--------|-----|
| SB1 | `app.module.ts` không import IntegrationPlatformModule | Thêm `IntegrationPlatformModule` vào imports |

### 🔴 CRITICAL (blocking khi switch sang real BE)

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| C1 | `BASE_URL = '/api/v1/integration'` double-prefix | `integration.api.js:5` | Đổi thành `'/integration'` |

### ⚠️ WARNING — FE thiếu UI cho các features BE đã có

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | Không có OCRPage (6 endpoints) | Document OCR là phase 2 feature, BE đã mock |
| W2 | Không có MobileSyncManagementPage (4 endpoints) | Admin view cho mobile sync batches |
| W3 | Không có ERPPushPage (5 endpoints) | Admin view cho ERP push jobs |
| W4 | Không có Weighbridge detail page (`GET /logs/:id`) | Minor — list view đã có |
| W5 | Weighbridge ingest/heartbeat endpoints | Agent-side, không cần web FE |

---

## 6. Bảng tóm tắt coverage

| Nhóm | BE routes | FE gọi đúng sub-path | FE thiếu |
|------|-----------|---------------------|----------|
| Monitoring | 3 | 3 | 0 |
| Alerts | 4 | 4 | 0 |
| Weighbridge | 6 | 3 | 3 (agent+detail) |
| OCR | 6 | 0 | 6 |
| Mobile Sync | 5 | 0 | 5 |
| ERP Push | 5 | 0 | 5 |
| **Tổng** | **29** | **10** | **19** |

---

## 7. Trạng thái tổng thể Module 8 (Integration Platform) — CẬP NHẬT 2026-03-11

| Mục | Điểm |
|-----|------|
| API coverage (FE scope) | **100%** (10/10 FE calls match sub-paths) |
| Path accuracy | ✅ Tất cả sub-paths đúng |
| BASE_URL | ❌ Double-prefix — chỉ cần 1 dòng fix |
| Module registration | ❌ Chưa import vào app.module.ts |
| FE feature coverage | 34% (10/29 BE routes) — OCR, Mobile Sync, ERP Push admin UI thiếu |
| **Tổng** | **⚠️ CONDITIONAL PASS** — FE scope khớp 100%, chỉ cần fix BASE_URL + register module. Missing UI cho OCR/ERP Push/MobileSync là gap riêng (không phải path mismatch). |
