# Frontend Module 8 — Weighbridge & Integration

**Ngày:** 2026-03-09 | **Trạng thái:** ⚠️ PARTIAL — OCR UI MISSING

---

## 1. Scope

Giao diện giám sát integration: Weighbridge monitoring, Integration channels, Alerts. **OCR UI chưa build.**

## 2. Pages & Routes

| Route | Page Component | Mô tả | Trạng thái |
|-------|---------------|-------|-----------|
| `/app/integration/monitoring` | `MonitoringPage` | Giám sát trạng thái hệ thống tích hợp | ✅ |
| `/app/integration/alerts` | `AlertsPage` | Cảnh báo từ weighbridge, ERP, OCR | ✅ |
| `/app/integration/weighbridge` | `WeighbridgePage` | Live weighbridge readings + log | ✅ |
| `/app/integration/channels` | `ChannelsPage` | Config integration channels (ERP, OCR endpoint) | ✅ |
| `/app/integration/ocr` | **KHÔNG TỒN TẠI** | Upload, extract, confirm, link OCR | ❌ |

**Default redirect:** `/app/integration` → `/app/integration/monitoring`

## 3. Domain Layer

**Thư mục:** `src/domains/integration/`

| File | Nội dung |
|------|---------|
| `api/integration.api.js` | weighbridgeApi, channelsApi, alertsApi, monitoringApi — `ocrApi` **THIẾU** |
| `hooks/useIntegration.js` | useWeighbridgeLogs, useChannels, useAlerts, useMonitoringStatus |

## 4. Mock Data

**File:** `src/mocks/integration.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_wb_readings` | Live weighbridge readings (mô phỏng COM port data) |
| `swm_mock_channels` | 3 channels: ERP, OCR_PROVIDER, MOBILE_SYNC |
| `swm_mock_alerts` | 5 alerts: WEIGHBRIDGE_OFFLINE, OCR_TIMEOUT, ERP_SYNC_FAIL |
| `swm_mock_monitoring` | System health stats |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/integration/weighbridge/logs
GET  /api/v1/integration/channels
PUT  /api/v1/integration/channels/:id
GET  /api/v1/integration/alerts
POST /api/v1/integration/alerts/:id/acknowledge
GET  /api/v1/integration/monitoring/health
```

**OCR endpoints (backend có nhưng frontend KHÔNG wire):**
```
POST /api/v1/integration/ocr/upload     ← Không có UI
POST /api/v1/integration/ocr/:id/extract ← Không có UI
POST /api/v1/integration/ocr/:id/confirm ← Không có UI
POST /api/v1/integration/ocr/:id/link   ← Không có UI
```

## 6. GAP — OCR UI cần build (IMP-02)

### Cần tạo thêm:

**Pages:**
```
src/pages/integration/OcrUploadPage.jsx       ← Upload ảnh (xe/container)
src/pages/integration/OcrReviewPage.jsx       ← Review extracted data + sửa
src/pages/integration/OcrConfirmPage.jsx      ← Confirm + link tới PO/SO
```

**Routes cần thêm vào `routes.jsx`:**
```js
{ path: 'ocr', children: [
  { path: 'upload', element: withSuspense(OcrUploadPage) },
  { path: ':id/review', element: withSuspense(OcrReviewPage) },
  { path: ':id/confirm', element: withSuspense(OcrConfirmPage) },
]}
```

**Domain cần thêm:**
```
src/domains/integration/api/integration.api.js  ← Thêm ocrApi
src/domains/integration/hooks/useOcr.js         ← useOcrUpload, useOcrExtract, useOcrConfirm
```

**Backend fix cần (IMP-02):**
- `OcrService.extractData()` đang MOCK → cần real provider (Google Vision API / Azure CV)

## 7. Ghi chú

- `WeighbridgePage` hiển thị mock COM port readings — không có live WebSocket stream (IMP-12)
- `MonitoringPage` hiện dùng polling 30s (TanStack Query refetchInterval) không phải WebSocket push
- ERP sync channel: stub mapper, chưa connect thật (IMP-23 Phase 2)
