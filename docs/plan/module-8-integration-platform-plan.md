# Module 8: Integration Platform — Implementation Plan

**Module Name:** Integration Platform (Weighbridge, OCR, Mobile Sync, ERP Push)  
**Code Path:** `src/modules/integration-platform`  
**Status:** 🚧 In Progress  
**Created:** 2026-03-09

---

## 1. Mô tả nghiệp vụ Module

Module 8 là **integration backbone** của SWM, chịu trách nhiệm:

1. **Weighbridge Integration**: Thu thập dữ liệu cân từ local agent, normalize, lưu log immutable, callback sang M4/M5
2. **OCR Intake**: Upload ảnh chứng từ, gọi OCR provider, lưu raw/confirmed result, handoff sang M4
3. **Mobile Sync**: Nhận batch events từ mobile offline queue, dedupe, dispatch sang M7/M6
4. **ERP Push**: Enqueue job push debit note sang ERP, retry/backoff/dead-letter
5. **Integration Monitoring**: Dashboard health, alert lifecycle, recovery APIs

**Nguyên tắc cốt lõi:**
- M8 chỉ là **data acquisition + transport layer**, không chứa business rules
- M8 không được post inventory vào M3
- Mọi command phải idempotent theo external_id + correlation_id + source_channel

---

## 2. Database Tables (11 tables)

| # | Table Name | Description | Group |
|---|------------|-------------|-------|
| 1 | `m8_weighbridge_device` | Cấu hình thiết bị cân + trạng thái | Weighbridge |
| 2 | `m8_weighbridge_log` | Immutable log weigh events | Weighbridge |
| 3 | `m8_weighbridge_event_state` | Processing state của weigh event | Weighbridge |
| 4 | `m8_ocr_result` | Raw OCR extraction result | OCR |
| 5 | `m8_ocr_confirmed_snapshot` | Confirmed/corrected OCR data | OCR |
| 6 | `m8_mobile_sync_batch` | Batch envelope từ mobile | Mobile Sync |
| 7 | `m8_mobile_sync_event` | Từng event trong batch | Mobile Sync |
| 8 | `m8_erp_push_log` | ERP push job + response history | ERP Push |
| 9 | `m8_integration_alert` | Alert read model cho monitoring | Monitoring |
| 10 | `m8_channel_health_snapshot` | Dashboard summary nhanh | Monitoring |
| 11 | `m8_device_heartbeat` | Heartbeat history | Monitoring |

---

## 3. Dependencies

### Module 8 depends on:

| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh alert_no, push_job_id |
| Module 1 | `ReasonCode` | manual_weight, recovery, override |
| Module 1 | `AuditLog` | Audit trail cho admin actions |
| Module 1 | `IdempotencyService` | Dedupe ingest APIs |
| Module 2 | `MdWarehouse` | Device scope, dashboard filter |
| Module 2 | `MdLocation` | Mobile sync validation |
| Module 2 | `MdOwner/MdItem` | OCR object matching |

### Modules that consume Module 8:

| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 4 | `WeightCaptured`, `OCRConfirmed` | Inbound weighing + OCR data |
| Module 5 | `WeightCaptured` | Outbound weighing |
| Module 7 | `MobileSyncEventReceived` | Work execution from mobile |
| Module 10 | `ERPPushCompleted` | Billing sync status |

---

## 4. API Endpoints (~30 endpoints)

### 4.1 Weighbridge APIs (6 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/weighbridge/events` | Ingest weigh event |
| POST | `/api/v1/integration/weighbridge/heartbeat` | Device heartbeat |
| GET | `/api/v1/integration/weighbridge/logs` | Query weigh logs |
| GET | `/api/v1/integration/weighbridge/logs/:id` | Get log detail |
| POST | `/api/v1/integration/weighbridge/events/:id/reprocess` | Reprocess callback |
| GET | `/api/v1/integration/weighbridge/devices` | List devices |

### 4.2 OCR APIs (6 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/ocr/uploads` | Upload file for OCR |
| GET | `/api/v1/integration/ocr/results` | List OCR results |
| GET | `/api/v1/integration/ocr/results/:id` | Get OCR result detail |
| POST | `/api/v1/integration/ocr/results/:id/confirm` | Confirm/correct OCR |
| POST | `/api/v1/integration/ocr/results/:id/link` | Link to receipt |
| POST | `/api/v1/integration/ocr/results/:id/reject` | Reject OCR result |

### 4.3 Mobile Sync APIs (5 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/mobile-sync/batches` | Submit batch events |
| GET | `/api/v1/integration/mobile-sync/batches` | List batches |
| GET | `/api/v1/integration/mobile-sync/batches/:id` | Get batch detail |
| GET | `/api/v1/integration/mobile-sync/events/:id` | Get event detail |
| POST | `/api/v1/integration/mobile-sync/events/:id/replay` | Replay event |

### 4.4 ERP Push APIs (5 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/erp-push/jobs` | Enqueue push job |
| GET | `/api/v1/integration/erp-push/jobs` | List push jobs |
| GET | `/api/v1/integration/erp-push/jobs/:id` | Get job detail |
| POST | `/api/v1/integration/erp-push/jobs/:id/retry` | Manual retry |
| POST | `/api/v1/integration/erp-push/jobs/:id/cancel` | Cancel job |

### 4.5 Monitoring APIs (6 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/integration/monitoring/overview` | Dashboard summary |
| GET | `/api/v1/integration/monitoring/channel-health` | Channel health |
| GET | `/api/v1/integration/alerts` | List alerts |
| GET | `/api/v1/integration/alerts/:id` | Get alert detail |
| POST | `/api/v1/integration/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/v1/integration/alerts/:id/resolve` | Resolve alert |

---

## 5. Business Rules & Acceptance Criteria

### 5.1 Weighbridge
- `weighbridge_event_id` must be unique (idempotency key)
- `scale_device_id` must be active
- Manual entry requires `manual_reason_code` + `approved_by`
- Callback to M4/M5 must be async (không block response)
- Log immutable, corrections via event_state

### 5.2 OCR
- File types: jpg, jpeg, png, pdf
- Max file size: 10MB (configurable)
- Raw result immutable, corrections in confirmed_snapshot
- Confirm only when status = EXTRACTED or REVIEW_REQUIRED

### 5.3 Mobile Sync
- `batch_id` unique (idempotency)
- `event_external_id` unique per event
- Partial success allowed (không rollback cả batch)
- Out-of-order events accepted, conflict flagged

### 5.4 ERP Push
- `push_type + reference_id` unique
- Retry backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s
- Max attempts: 10
- Dead-letter after max attempts + alert

### 5.5 Monitoring
- Alert states: OPEN → ACKNOWLEDGED → RESOLVED (or SUPPRESSED)
- Device offline alert when heartbeat timeout > 10 minutes
- Dashboard reads from aggregate tables, không full scan logs

---

## 6. Implementation Phases

### Phase 1: Core Platform (Step 1-2)
- [x] Plan document
- [ ] Database schema (11 tables)
- [ ] Enums & shared types
- [ ] Migration
- [ ] Seed data

### Phase 2: Weighbridge (Step 3)
- [ ] weighbridge.controller.ts
- [ ] weighbridge-ingest.service.ts
- [ ] weighbridge-log.repository.ts
- [ ] weighbridge-device.repository.ts
- [ ] Callback adapter to M4/M5

### Phase 3: OCR (Step 3)
- [ ] ocr.controller.ts
- [ ] ocr-upload.service.ts
- [ ] ocr-extract.service.ts (mock provider)
- [ ] ocr-result.repository.ts

### Phase 4: Mobile Sync (Step 3)
- [ ] mobile-sync.controller.ts
- [ ] mobile-sync-batch.service.ts
- [ ] mobile-sync-dispatch.service.ts
- [ ] mobile-sync.repository.ts

### Phase 5: ERP Push (Step 3)
- [ ] erp-push.controller.ts
- [ ] erp-push.service.ts
- [ ] erp-payload-mapper.service.ts
- [ ] erp-push-log.repository.ts

### Phase 6: Monitoring (Step 3)
- [ ] monitoring.controller.ts
- [ ] alert.service.ts
- [ ] channel-health.service.ts
- [ ] alert.repository.ts

---

## 7. RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INTEGRATION.WEIGHBRIDGE.INGEST` | Ingest weigh events (agent) |
| `INTEGRATION.WEIGHBRIDGE.READ` | View weighbridge logs |
| `INTEGRATION.WEIGHBRIDGE.REPROCESS` | Reprocess callback |
| `INTEGRATION.OCR.UPLOAD` | Upload OCR files |
| `INTEGRATION.OCR.READ` | View OCR results |
| `INTEGRATION.OCR.CONFIRM` | Confirm/correct OCR |
| `INTEGRATION.OCR.LINK` | Link OCR to receipt |
| `INTEGRATION.MOBILE_SYNC.SUBMIT` | Submit mobile batch |
| `INTEGRATION.MOBILE_SYNC.READ` | View sync status |
| `INTEGRATION.MOBILE_SYNC.REPLAY` | Replay failed events |
| `INTEGRATION.ERP_PUSH.READ` | View ERP push jobs |
| `INTEGRATION.ERP_PUSH.RETRY` | Manual retry job |
| `INTEGRATION.ERP_PUSH.CANCEL` | Cancel job |
| `INTEGRATION.MONITORING.READ` | View dashboard |
| `INTEGRATION.ALERT.ACKNOWLEDGE` | Acknowledge alert |
| `INTEGRATION.ALERT.RESOLVE` | Resolve alert |

---

## 8. File Structure

```
src/modules/integration-platform/
├── integration-platform.module.ts
├── controllers/
│   ├── weighbridge.controller.ts
│   ├── ocr.controller.ts
│   ├── mobile-sync.controller.ts
│   ├── erp-push.controller.ts
│   └── monitoring.controller.ts
├── services/
│   ├── weighbridge-ingest.service.ts
│   ├── weighbridge-log.service.ts
│   ├── weighbridge-device.service.ts
│   ├── ocr-upload.service.ts
│   ├── ocr-extract.service.ts
│   ├── ocr-confirmation.service.ts
│   ├── mobile-sync-batch.service.ts
│   ├── mobile-sync-dispatch.service.ts
│   ├── erp-push.service.ts
│   ├── erp-payload-mapper.service.ts
│   ├── alert.service.ts
│   ├── channel-health.service.ts
│   └── monitoring.service.ts
├── repositories/
│   ├── weighbridge-log.repository.ts
│   ├── weighbridge-device.repository.ts
│   ├── weighbridge-event-state.repository.ts
│   ├── ocr-result.repository.ts
│   ├── ocr-confirmed-snapshot.repository.ts
│   ├── mobile-sync-batch.repository.ts
│   ├── mobile-sync-event.repository.ts
│   ├── erp-push-log.repository.ts
│   ├── integration-alert.repository.ts
│   └── channel-health.repository.ts
├── dto/
│   ├── weighbridge/
│   ├── ocr/
│   ├── mobile-sync/
│   ├── erp-push/
│   └── monitoring/
├── domain/
│   ├── integration.enums.ts
│   ├── integration.errors.ts
│   ├── weighbridge.policy.ts
│   ├── ocr.policy.ts
│   ├── mobile-sync.policy.ts
│   ├── erp-push.policy.ts
│   └── alert.state-machine.ts
└── adapters/
    ├── ocr-provider.adapter.ts
    ├── erp-http.adapter.ts
    ├── inbound-callback.adapter.ts
    └── outbound-callback.adapter.ts
```

---

## 9. Testing Checklist

- [ ] Unit tests cho domain policies
- [ ] Integration tests cho repositories
- [ ] API tests cho all endpoints
- [ ] Idempotency tests (duplicate weigh, duplicate batch)
- [ ] Retry/backoff tests cho ERP push
- [ ] Alert lifecycle tests

---

## 10. Notes

- Module 8 folder name: `integration-platform` (theo architecture-be.md)
- All files < 800 lines
- PostgreSQL database
- Reuse M1 services: AuditLog, Idempotency, NumberSequence
- Reuse M2 services: Warehouse, Location validation
