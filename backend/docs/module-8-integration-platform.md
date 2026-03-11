# Module 8: Integration Platform

**Module Path:** `src/modules/integration-platform`  
**Status:** ✅ Implemented  
**Last Updated:** 2026-03-09

---

## 1. Tổng quan Module

Module 8 - Integration Platform là **integration backbone** của hệ thống SWM, chịu trách nhiệm:

1. **Weighbridge Integration** - Thu thập dữ liệu cân từ local agent
2. **OCR Intake** - Upload và xử lý OCR chứng từ
3. **Mobile Sync** - Đồng bộ dữ liệu từ mobile offline
4. **ERP Push** - Đẩy dữ liệu sang ERP
5. **Integration Monitoring** - Dashboard và quản lý alerts

**Nguyên tắc cốt lõi:**
- M8 chỉ là **data acquisition + transport layer**, không chứa business rules
- M8 KHÔNG được post inventory vào M3
- Mọi command phải idempotent theo `external_id` + `correlation_id` + `source_channel`

---

## 2. Cấu trúc Code

```
src/modules/integration-platform/
├── integration-platform.module.ts          # Module definition
├── controllers/
│   ├── weighbridge.controller.ts           # Weighbridge APIs
│   ├── ocr.controller.ts                   # OCR APIs
│   ├── mobile-sync.controller.ts           # Mobile Sync APIs
│   ├── erp-push.controller.ts              # ERP Push APIs
│   └── monitoring.controller.ts            # Monitoring APIs
├── services/
│   ├── weighbridge-ingest.service.ts       # Xử lý ingest weigh events
│   ├── weighbridge-log.service.ts          # Query weigh logs
│   ├── weighbridge-device.service.ts       # Device management
│   ├── ocr-upload.service.ts               # OCR upload
│   ├── ocr-extract.service.ts              # OCR extraction
│   ├── ocr-confirmation.service.ts         # OCR confirm/link
│   ├── mobile-sync-batch.service.ts        # Mobile batch processing
│   ├── mobile-sync-dispatch.service.ts     # Event dispatch
│   ├── erp-push.service.ts                 # ERP push jobs
│   ├── erp-payload-mapper.service.ts       # Payload mapping
│   ├── alert.service.ts                    # Alert management
│   ├── channel-health.service.ts           # Channel health
│   └── monitoring.service.ts               # Dashboard overview
├── repositories/
│   ├── weighbridge-device.repository.ts
│   ├── weighbridge-log.repository.ts
│   ├── weighbridge-event-state.repository.ts
│   ├── ocr-result.repository.ts
│   ├── ocr-confirmed-snapshot.repository.ts
│   ├── mobile-sync-batch.repository.ts
│   ├── mobile-sync-event.repository.ts
│   ├── erp-push-log.repository.ts
│   ├── integration-alert.repository.ts
│   ├── channel-health.repository.ts
│   └── device-heartbeat.repository.ts
├── dto/
│   └── weighbridge/
│       ├── create-weigh-event.dto.ts
│       └── weigh-log-query.dto.ts
└── domain/
    ├── integration.enums.ts                # All enums
    └── integration.errors.ts               # Error classes
```

---

## 3. API Endpoints

### 3.1 Weighbridge APIs

| Method | Endpoint | Mô tả | Response |
|--------|----------|-------|----------|
| **POST** | `/api/v1/integration/weighbridge/events` | Ingest weigh event từ local agent | `{ id, weighbridgeEventId, isDuplicate, processingStatus, message }` |
| **POST** | `/api/v1/integration/weighbridge/heartbeat` | Device heartbeat | `{ success, deviceCode, status }` |
| **GET** | `/api/v1/integration/weighbridge/logs` | Query danh sách weigh logs | `{ data: [], pagination }` |
| **GET** | `/api/v1/integration/weighbridge/logs/:id` | Chi tiết weigh log | Weigh log detail object |
| **POST** | `/api/v1/integration/weighbridge/events/:id/reprocess` | Reprocess callback | `{ success, logId, message }` |
| **GET** | `/api/v1/integration/weighbridge/devices` | Danh sách devices | `{ data: [], total }` |

#### POST /api/v1/integration/weighbridge/events

**Request Body:**
```json
{
  "weighbridgeEventId": "WB-20260309-0001",
  "scaleDeviceId": "WB-01",
  "vehicleNumber": "51A-12345",
  "weighingType": "WEIGH_IN",
  "weighingSequence": 1,
  "grossWeightKg": 25000,
  "tareWeightKg": 5000,
  "netWeightKg": 20000,
  "rawPayload": {},
  "isManualEntry": false,
  "referenceType": "RECEIPT",
  "referenceId": "uuid",
  "correlationId": "uuid",
  "sourceChannel": "LOCAL_AGENT",
  "eventTime": "2026-03-09T10:00:00+07:00"
}
```

**Response:**
```json
{
  "id": "uuid",
  "weighbridgeEventId": "WB-20260309-0001",
  "isDuplicate": false,
  "processingStatus": "RECEIVED",
  "message": "Weigh event received and queued for processing"
}
```

**Idempotency:** Dựa vào `weighbridgeEventId` - nếu đã tồn tại sẽ trả về record cũ với `isDuplicate: true`

---

### 3.2 OCR APIs

| Method | Endpoint | Mô tả | Response |
|--------|----------|-------|----------|
| **POST** | `/api/v1/integration/ocr/uploads` | Upload file để OCR | OCR result object |
| **GET** | `/api/v1/integration/ocr/results` | Danh sách OCR results | `{ data: [], pagination }` |
| **GET** | `/api/v1/integration/ocr/results/:id` | Chi tiết OCR result | OCR result with snapshot |
| **POST** | `/api/v1/integration/ocr/results/:id/confirm` | Confirm/correct OCR | Updated OCR result |
| **POST** | `/api/v1/integration/ocr/results/:id/link` | Link OCR với receipt | Updated OCR result |
| **POST** | `/api/v1/integration/ocr/results/:id/reject` | Reject OCR result | Updated OCR result |

#### POST /api/v1/integration/ocr/uploads

**Request Body:**
```json
{
  "imagePath": "/uploads/ocr/document.jpg",
  "providerName": "default",
  "warehouseId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "ocrRequestId": "OCR-1709974800-abc123",
  "imagePath": "/uploads/ocr/document.jpg",
  "status": "UPLOADED",
  "createdAt": "2026-03-09T10:00:00Z"
}
```

#### POST /api/v1/integration/ocr/results/:id/confirm

**Request Body:**
```json
{
  "confirmedBlNumber": "BL-12345678",
  "confirmedVehicleNumber": "51A-12345",
  "confirmedProductName": "Steel Coil Grade A",
  "confirmedVesselName": "MV Ocean Star",
  "confirmedQty": 25000,
  "confirmedQtyUom": "KG",
  "corrections": { "blNumber": { "from": "BL-1234567", "to": "BL-12345678" } },
  "remarks": "Corrected BL number"
}
```

---

### 3.3 Mobile Sync APIs

| Method | Endpoint | Mô tả | Response |
|--------|----------|-------|----------|
| **POST** | `/api/v1/integration/mobile-sync/batches` | Submit batch events | Batch result |
| **GET** | `/api/v1/integration/mobile-sync/batches` | Danh sách batches | `{ data: [], pagination }` |
| **GET** | `/api/v1/integration/mobile-sync/batches/:id` | Chi tiết batch | Batch with events |
| **GET** | `/api/v1/integration/mobile-sync/events/:id` | Chi tiết event | Event detail |
| **POST** | `/api/v1/integration/mobile-sync/events/:id/replay` | Replay failed event | Replay result |

#### POST /api/v1/integration/mobile-sync/batches

**Request Body:**
```json
{
  "batchId": "MB-20260309-0001",
  "deviceId": "MOBILE-01",
  "keeperUserId": "uuid",
  "appVersion": "1.0.0",
  "correlationId": "uuid",
  "events": [
    {
      "eventExternalId": "EV-001",
      "eventType": "COMPLETE_LINE",
      "workId": "uuid",
      "workLineId": "uuid",
      "sourceModule": "M7",
      "deviceEventTime": "2026-03-09T10:00:00+07:00",
      "sequenceNo": 1001,
      "payload": { "actual_qty": 1000, "to_location_id": "uuid" }
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "batchId": "MB-20260309-0001",
  "isDuplicate": false,
  "status": "QUEUED",
  "eventCount": 1,
  "duplicateCount": 0,
  "acceptedCount": 1,
  "message": "Batch accepted for processing"
}
```

---

### 3.4 ERP Push APIs

| Method | Endpoint | Mô tả | Response |
|--------|----------|-------|----------|
| **POST** | `/api/v1/integration/erp-push/jobs` | Enqueue push job | Job result |
| **GET** | `/api/v1/integration/erp-push/jobs` | Danh sách jobs | `{ data: [], pagination }` |
| **GET** | `/api/v1/integration/erp-push/jobs/:id` | Chi tiết job | Job detail |
| **POST** | `/api/v1/integration/erp-push/jobs/:id/retry` | Manual retry | `{ success, jobId, message }` |
| **POST** | `/api/v1/integration/erp-push/jobs/:id/cancel` | Cancel job | `{ success, jobId, message }` |

#### POST /api/v1/integration/erp-push/jobs

**Request Body:**
```json
{
  "pushType": "DEBIT_NOTE",
  "referenceId": "DN-20260309-0001",
  "payload": {
    "debitNoteNumber": "DN-20260309-0001",
    "customerId": "uuid",
    "amount": 1000000
  },
  "correlationId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "pushJobId": "ERP-DEBIT_NOTE-1709974800-abc123",
  "isDuplicate": false,
  "status": "PENDING",
  "message": "Job enqueued for processing"
}
```

---

### 3.5 Monitoring APIs

| Method | Endpoint | Mô tả | Response |
|--------|----------|-------|----------|
| **GET** | `/api/v1/integration/monitoring/overview` | Dashboard overview | Dashboard summary |
| **GET** | `/api/v1/integration/monitoring/channel-health` | Channel health | Array of channel health |
| **GET** | `/api/v1/integration/monitoring/stats` | Detailed stats | Stats object |
| **GET** | `/api/v1/integration/alerts` | Danh sách alerts | `{ data: [], pagination }` |
| **GET** | `/api/v1/integration/alerts/:id` | Chi tiết alert | Alert detail |
| **POST** | `/api/v1/integration/alerts/:id/acknowledge` | Acknowledge alert | Updated alert |
| **POST** | `/api/v1/integration/alerts/:id/resolve` | Resolve alert | Updated alert |

#### GET /api/v1/integration/monitoring/overview

**Response:**
```json
{
  "channels": {
    "weighbridge": {
      "status": "HEALTHY",
      "openAlertCount": 0,
      "backlogCount": 0,
      "successRate1h": 99.5,
      "avgLatencyMs1h": 150
    },
    "ocr": { "status": "HEALTHY", "openAlertCount": 0, "backlogCount": 2 },
    "mobileSync": { "status": "HEALTHY", "openAlertCount": 0, "backlogCount": 0 },
    "erpPush": { "status": "DEGRADED", "openAlertCount": 2, "backlogCount": 5 }
  },
  "alerts": {
    "criticalCount": 0,
    "openCount": 2
  },
  "devices": {
    "onlineCount": 2,
    "offlineCount": 1,
    "degradedCount": 0
  }
}
```

---

## 4. Business Rules

### 4.1 Weighbridge
- `weighbridgeEventId` must be unique (idempotency key)
- `scaleDeviceId` phải active
- Manual entry yêu cầu `manualReasonCode` + `approvedBy`
- Callback to M4/M5 phải async (không block response)
- Log immutable, corrections qua event_state

### 4.2 OCR
- File types: jpg, jpeg, png, pdf
- Max file size: 10MB (configurable)
- Raw result immutable, corrections trong confirmed_snapshot
- Confirm chỉ khi status = EXTRACTED hoặc REVIEW_REQUIRED

### 4.3 Mobile Sync
- `batchId` unique (idempotency)
- `eventExternalId` unique per event
- Partial success allowed (không rollback cả batch)
- Out-of-order events accepted, conflict flagged

### 4.4 ERP Push
- `pushType + referenceId` unique
- Retry backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s
- Max attempts: 10
- Dead-letter after max attempts + alert

### 4.5 Alerts
- States: OPEN → ACKNOWLEDGED → RESOLVED (or SUPPRESSED)
- Resolution note bắt buộc cho CRITICAL alerts

---

## 5. Dependencies

### Module 8 depends on:
| Module | Entity/Service | Usage |
|--------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh IDs |
| Module 1 | `ReasonCode` | manual_weight, recovery |
| Module 1 | `AuditLog` | Audit trail |
| Module 2 | `MdWarehouse` | Device scope |
| Module 2 | `MdLocation` | Mobile sync validation |

### Modules consuming Module 8:
| Module | Dependency | Usage |
|--------|------------|-------|
| Module 4 | `WeightCaptured`, `OCRConfirmed` | Inbound weighing + OCR |
| Module 5 | `WeightCaptured` | Outbound weighing |
| Module 7 | `MobileSyncEventReceived` | Work execution |
| Module 10 | `ERPPushCompleted` | Billing sync |

---

## 6. Error Codes

| Code | Tên | Mô tả |
|------|-----|-------|
| `INT_WB_001` | DEVICE_NOT_FOUND | Device không tồn tại |
| `INT_WB_002` | DEVICE_INACTIVE | Device không active |
| `INT_WB_003` | DUPLICATE_WEIGH_EVENT | Weigh event đã tồn tại |
| `INT_WB_005` | MANUAL_ENTRY_REQUIRES_APPROVAL | Manual entry cần approval |
| `INT_WB_006` | WEIGH_EVENT_NOT_FOUND | Weigh event không tồn tại |
| `INT_OCR_001` | OCR_UPLOAD_FAILED | Upload thất bại |
| `INT_OCR_003` | OCR_RESULT_NOT_FOUND | OCR result không tồn tại |
| `INT_OCR_004` | OCR_INVALID_STATUS_TRANSITION | Status không hợp lệ |
| `INT_OCR_005` | OCR_ALREADY_CONFIRMED | OCR đã confirmed |
| `INT_OCR_007` | OCR_INVALID_FILE_TYPE | File type không hợp lệ |
| `INT_SYNC_001` | DUPLICATE_BATCH | Batch đã tồn tại |
| `INT_SYNC_003` | BATCH_NOT_FOUND | Batch không tồn tại |
| `INT_SYNC_004` | EVENT_NOT_FOUND | Event không tồn tại |
| `INT_ERP_001` | DUPLICATE_PUSH_JOB | Push job đã tồn tại |
| `INT_ERP_002` | PUSH_JOB_NOT_FOUND | Push job không tồn tại |
| `INT_ERP_003` | INVALID_PUSH_STATUS | Status không cho phép action |
| `INT_ALERT_001` | ALERT_NOT_FOUND | Alert không tồn tại |
| `INT_ALERT_003` | RESOLUTION_NOTE_REQUIRED | Resolution note bắt buộc |

---

## 7. Enums

### WeighingType
- `WEIGH_IN` - Cân vào
- `WEIGH_OUT` - Cân ra
- `TARE` - Tare weight
- `GROSS_LINE` - Gross per line
- `MANUAL_ENTRY` - Nhập tay

### DeviceStatus
- `ONLINE` - Hoạt động
- `OFFLINE` - Mất kết nối
- `DEGRADED` - Hoạt động có vấn đề

### OcrStatus
- `UPLOADED` - Đã upload
- `EXTRACTING` - Đang extract
- `EXTRACTED` - Đã extract
- `REVIEW_REQUIRED` - Cần review
- `CONFIRMED` - Đã confirm
- `LINKED` - Đã link với receipt
- `REJECTED` - Đã reject

### SyncBatchStatus
- `QUEUED` - Đang chờ xử lý
- `PROCESSING` - Đang xử lý
- `PARTIAL_SUCCESS` - Thành công một phần
- `SUCCESS` - Thành công
- `FAILED` - Thất bại
- `CONFLICTED` - Có conflict

### ErpPushStatus
- `PENDING` - Chờ gửi
- `SENT` - Đã gửi
- `ACK_SUCCESS` - ERP xác nhận thành công
- `ACK_FAILED` - ERP xác nhận thất bại
- `RETRY_SCHEDULED` - Đã lên lịch retry
- `DEAD_LETTER` - Dead letter
- `CANCELLED` - Đã hủy

### AlertSeverity
- `INFO` - Thông tin
- `WARN` - Cảnh báo
- `ERROR` - Lỗi
- `CRITICAL` - Nghiêm trọng

### AlertStatus
- `OPEN` - Đang mở
- `ACKNOWLEDGED` - Đã acknowledge
- `RESOLVED` - Đã resolve
- `SUPPRESSED` - Đã suppress

---

## 8. Notes cho Developer

### 8.1 Để sử dụng Module 8:

1. **Ingest weigh event:**
```typescript
import { WeighbridgeIngestService } from './modules/integration-platform/services/weighbridge-ingest.service';

const result = await weighbridgeIngestService.ingestWeighEvent({
  weighbridgeEventId: 'WB-001',
  scaleDeviceId: 'WB-01',
  vehicleNumber: '51A-12345',
  weighingType: 'WEIGH_IN',
  // ...
}, 'system-agent');
```

2. **Submit mobile sync batch:**
```typescript
import { MobileSyncBatchService } from './modules/integration-platform/services/mobile-sync-batch.service';

const result = await mobileSyncBatchService.submitBatch({
  batchId: 'MB-001',
  deviceId: 'MOBILE-01',
  events: [...],
  // ...
});
```

3. **Enqueue ERP push:**
```typescript
import { ErpPushService } from './modules/integration-platform/services/erp-push.service';

const result = await erpPushService.enqueuePushJob({
  pushType: 'DEBIT_NOTE',
  referenceId: 'DN-001',
  payload: {...},
  correlationId: 'uuid',
});
```

### 8.2 Lưu ý quan trọng:
- Module 8 là **thin adapter layer**, không chứa business logic
- Mọi weigh event đều immutable, corrections qua event_state
- OCR raw result immutable, corrections qua confirmed_snapshot
- ERP push có retry với exponential backoff
- Alert lifecycle: OPEN → ACKNOWLEDGED → RESOLVED
- **Tất cả endpoints đều được bảo vệ bởi RBAC** (AuthGuard + PermissionGuard)
- Weight calculations sử dụng **decimal.js** để đảm bảo độ chính xác
- Multi-step operations sử dụng **$transaction** để đảm bảo atomicity

---

## 9. RBAC Permissions

Tất cả endpoints trong Module 8 được bảo vệ bởi `AuthGuard` và `PermissionGuard`.

### Permission Codes

| Resource | Permission Code | Mô tả |
|----------|-----------------|-------|
| **Weighbridge** | `INTEGRATION.WEIGHBRIDGE.INGEST` | Ingest weigh events |
| | `INTEGRATION.WEIGHBRIDGE.READ` | Query weigh logs |
| | `INTEGRATION.WEIGHBRIDGE.REPROCESS` | Reprocess callbacks |
| **Weighbridge Device** | `INTEGRATION.WEIGHBRIDGE_DEVICE.READ` | List devices |
| | `INTEGRATION.WEIGHBRIDGE_DEVICE.HEARTBEAT` | Send heartbeat |
| **OCR** | `INTEGRATION.OCR.UPLOAD` | Upload for OCR |
| | `INTEGRATION.OCR.READ` | Query OCR results |
| | `INTEGRATION.OCR.CONFIRM` | Confirm OCR result |
| | `INTEGRATION.OCR.LINK` | Link to receipt |
| | `INTEGRATION.OCR.REJECT` | Reject OCR result |
| **Mobile Sync** | `INTEGRATION.MOBILE_SYNC.SUBMIT` | Submit sync batch |
| | `INTEGRATION.MOBILE_SYNC.READ` | Query batches/events |
| | `INTEGRATION.MOBILE_SYNC.REPLAY` | Replay failed event |
| **ERP Push** | `INTEGRATION.ERP_PUSH.ENQUEUE` | Enqueue push job |
| | `INTEGRATION.ERP_PUSH.READ` | Query jobs |
| | `INTEGRATION.ERP_PUSH.RETRY` | Manual retry |
| | `INTEGRATION.ERP_PUSH.CANCEL` | Cancel job |
| **Monitoring** | `INTEGRATION.MONITORING.VIEW` | View dashboard |
| **Alerts** | `INTEGRATION.ALERT.READ` | Query alerts |
| | `INTEGRATION.ALERT.ACKNOWLEDGE` | Acknowledge alert |
| | `INTEGRATION.ALERT.RESOLVE` | Resolve alert |

---

## 10. OCR Confidence Thresholds

OCR extraction sử dụng per-field confidence thresholds theo spec:

| Field | Threshold | Mô tả |
|-------|-----------|-------|
| BL Number | ≥90% | Số BL phải có độ tin cậy cao |
| Vehicle Number | ≥90% | Biển số xe phải rõ ràng |
| Product Name | ≥85% | Tên sản phẩm |
| Vessel Name | ≥85% | Tên tàu |
| Quantity | ≥85% | Số lượng |

- Nếu tất cả fields đạt threshold → Status: `EXTRACTED`
- Nếu bất kỳ field nào dưới threshold → Status: `REVIEW_REQUIRED`
- Phải có ít nhất BL hoặc Vehicle với confidence đạt threshold

---

## 11. Transaction Boundaries

Các operations sau sử dụng `$transaction` để đảm bảo atomicity:

| Service | Operation | Tables Affected |
|---------|-----------|-----------------|
| `weighbridge-ingest.service.ts` | `ingestWeighEvent()` | `m8_weighbridge_log` + `m8_weighbridge_event_state` |
| `mobile-sync-batch.service.ts` | `submitBatch()` | `m8_mobile_sync_batch` + `m8_mobile_sync_event` |
| `ocr-confirmation.service.ts` | `confirmOcrResult()` | `m8_ocr_confirmed_snapshot` + `m8_ocr_result` |

**Pattern:**
```typescript
await this.prisma.$transaction(async (tx) => {
  // All writes within transaction
  const record1 = await tx.model1.create({...});
  await tx.model2.create({...});
  return record1;
});
```

---

## 12. Known Limitations (Phase 1)

| Item | Status | Note |
|------|--------|------|
| OCR extraction | **MOCK** | Trả về mock data, chưa integrate real OCR provider |
| ERP push | **MOCK** | Trả về mock response, chưa integrate real ERP |
| Callback dispatch | **STUB** | Chỉ log, chưa có BullMQ/HTTP call đến M4/M5 |
| Mobile sync dispatch | **STUB** | `mockDispatchToModule()`, chưa call M6/M7 |
| M1 AuditLog | **NOT INTEGRATED** | Chưa gọi AuditLog service |

Các items này sẽ được implement trong Sprint 5.

---

## Changelog — FE-BE Alignment Fixes (2026-03-11)

| Fix | Mô tả |
|-----|-------|
| Controller prefix | Fix double-prefix `@Controller('api/v1/integration/...')` → `@Controller('integration/...')` trong 5 controllers (`weighbridge`, `ocr`, `monitoring`, `mobile-sync`, `erp-push`). Routes đúng chuẩn: `/api/v1/integration/...` |
| Module registration | Register `IntegrationPlatformModule` vào `app.module.ts` |
