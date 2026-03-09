# Module 8 — Weighbridge, OCR & Integration Platform: Code Review Report

**Code path:** `backend/src/modules/integration-platform/` (34 TS files)
**Spec file:** `docs/spec/module_8_weighbridge_integration_spec.md` (784 lines, v1.2)
**Prisma models:** 11 M8 models (M8 prefix)
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 7.0 / 10
**Verdict:** CONDITIONAL PASS — All 6 sub-modules implemented, good architecture, proper state machines + idempotency. Nhung ZERO RBAC, mock OCR/ERP, no $transaction, no decimal.js.

---

## Tech Stack — NestJS (same as M1/M2/M5)

| Layer | Choice | Note |
|-------|--------|------|
| Language | **TypeScript** | Same paradigm as M1/M2/M5 |
| Framework | **NestJS** | Controllers + Injectable services |
| Validation | **class-validator** | DTOs with decorators |
| ORM | Prisma | Consistent across all modules |
| Auth | **NONE** | Zero @UseGuards, zero @Permission on any controller |
| Architecture | **Service-Repository** | Clean separation, domain errors + enums |

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Controllers | 5 | Weighbridge, OCR, MobileSync, ErpPush, Monitoring |
| Services | 13 | weighbridge-ingest, weighbridge-log, weighbridge-device, ocr-upload, ocr-extract, ocr-confirmation, mobile-sync-batch, mobile-sync-dispatch, erp-push, erp-payload-mapper, alert, channel-health, monitoring |
| Repositories | 11 | weighbridge-log, weighbridge-device, weighbridge-event-state, ocr-result, ocr-confirmed-snapshot, mobile-sync-batch, mobile-sync-event, erp-push-log, integration-alert, channel-health, device-heartbeat |
| Domain | 2 | integration.enums.ts (124 lines, 13 enums), integration.errors.ts (81 lines, 5 error classes) |
| DTOs | 2 | create-weigh-event.dto.ts (101 lines), weigh-log-query.dto.ts |
| Module | 1 | integration-platform.module.ts (87 lines) |

### 6 Sub-Modules
1. **Weighbridge** — Ingest weigh events, device management, heartbeat, callback processing
2. **OCR** — Upload image, extract data, confirm/reject, link to receipt
3. **Mobile Sync** — Batch sync from mobile app, event dispatch, replay
4. **ERP Push** — Queue debit notes, exponential backoff retry, dead letter
5. **Monitoring** — Channel health, alert management, dashboard overview
6. **Alert** — Raise/acknowledge/resolve alerts with severity levels

### API Endpoints (29 total)

**Weighbridge (6):**
```
POST   /api/v1/integration/weighbridge/events           → Ingest weigh event
POST   /api/v1/integration/weighbridge/heartbeat        → Device heartbeat
GET    /api/v1/integration/weighbridge/logs             → Query logs (paginated)
GET    /api/v1/integration/weighbridge/logs/:id         → Get log detail
POST   /api/v1/integration/weighbridge/events/:id/reprocess → Reprocess callback
GET    /api/v1/integration/weighbridge/devices          → List devices
```

**OCR (6):**
```
POST   /api/v1/integration/ocr/uploads                  → Upload image
GET    /api/v1/integration/ocr/results                  → Query results
GET    /api/v1/integration/ocr/results/:id              → Get detail
POST   /api/v1/integration/ocr/results/:id/confirm      → Operator confirm
POST   /api/v1/integration/ocr/results/:id/link         → Link to receipt
POST   /api/v1/integration/ocr/results/:id/reject       → Reject
```

**Mobile Sync (5):**
```
POST   /api/v1/integration/mobile-sync/batches          → Submit sync batch
GET    /api/v1/integration/mobile-sync/batches          → Query batches
GET    /api/v1/integration/mobile-sync/batches/:id      → Get batch detail
GET    /api/v1/integration/mobile-sync/events/:id       → Get event detail
POST   /api/v1/integration/mobile-sync/events/:id/replay → Replay failed event
```

**ERP Push (5):**
```
POST   /api/v1/integration/erp-push/jobs                → Enqueue push job
GET    /api/v1/integration/erp-push/jobs                → Query jobs
GET    /api/v1/integration/erp-push/jobs/:id            → Get job detail
POST   /api/v1/integration/erp-push/jobs/:id/retry      → Manual retry
POST   /api/v1/integration/erp-push/jobs/:id/cancel     → Cancel job
```

**Monitoring & Alerts (7):**
```
GET    /api/v1/integration/monitoring/overview           → Dashboard
GET    /api/v1/integration/monitoring/channel-health     → Channel health
GET    /api/v1/integration/monitoring/stats              → Statistics
GET    /api/v1/integration/alerts                       → Query alerts
GET    /api/v1/integration/alerts/:id                   → Get alert
POST   /api/v1/integration/alerts/:id/acknowledge       → Acknowledge
POST   /api/v1/integration/alerts/:id/resolve           → Resolve
```

---

## Review Gate Checklist (12 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | Weighbridge event ingest with idempotency? | **PASS** | `weighbridgeEventId` unique check → returns existing on duplicate |
| 2 | Immutable weigh log (1 event = 1 log)? | **PASS** | Log created once, no update methods for weight fields |
| 3 | Manual weight governance? | **PASS** | `isManualEntry` → requires `manualReasonCode` + `approvedBy` |
| 4 | Device heartbeat + offline detection? | **PASS** | 10-min timeout for offline status, heartbeat endpoint |
| 5 | OCR upload + extraction + confidence? | **PASS** | Status: UPLOADED→EXTRACTING→EXTRACTED/REVIEW_REQUIRED. ≥80% = EXTRACTED |
| 6 | OCR confirm/reject/link workflow? | **PASS** | Confirm with corrections, link to receipt, reject with reason |
| 7 | Mobile sync batch + event idempotency? | **PASS** | `batchId` + `eventExternalId` dual idempotency |
| 8 | ERP push with exponential backoff? | **PASS** | [1s,2s,4s,8s,16s,32s,60s×4], max 10 attempts → dead letter |
| 9 | Integration monitoring dashboard? | **PASS** | Channel health, alert stats, overview endpoint |
| 10 | Alert management (raise/ack/resolve)? | **PASS** | CRITICAL requires resolution note. Severity levels. |
| 11 | RBAC on all endpoints? | **FAIL** | Zero @UseGuards, zero @Permission on all 5 controllers |
| 12 | Latency tracking? | **PASS** | `latencyMs = Date.now() - eventTime` stored per weigh log |

**Result: 10/12 PASS, 0/12 PARTIAL, 2/12 FAIL**

---

## Diem Manh — What's Done Well

### 1. State Machines — COMPREHENSIVE (4 state machines)

**Weighbridge Event:**
```
RECEIVED → VALIDATED → LINKED / DUPLICATE / FAILED
```

**OCR Result:**
```
UPLOADED → EXTRACTING → EXTRACTED / REVIEW_REQUIRED → CONFIRMED → LINKED / REJECTED
```

**Mobile Sync:**
- Batch: `QUEUED → PROCESSING → SUCCESS / PARTIAL_SUCCESS / FAILED / CONFLICTED`
- Event: `RECEIVED → DUPLICATE / DISPATCHED → APPLIED / CONFLICTED / FAILED`

**ERP Push:**
```
PENDING → SENT → ACK_SUCCESS / ACK_FAILED → RETRY_SCHEDULED → ... → DEAD_LETTER / CANCELLED
```

### 2. Domain Error Classes — CLEAN

```typescript
IntegrationError (base) → WeighbridgeError, OcrError, MobileSyncError, ErpPushError
```
25 error codes organized by sub-module: `INT_WB_001..007`, `INT_OCR_001..007`, `INT_SYNC_001..007`, `INT_ERP_001..006`, `INT_ALERT_001..003`.

### 3. Idempotency — CONSISTENT across all sub-modules

| Sub-Module | Idempotency Key | Pattern |
|------------|----------------|---------|
| Weighbridge | `weighbridgeEventId` | findByEventId → return existing on duplicate |
| Mobile Sync Batch | `batchId` | findByBatchId → return existing |
| Mobile Sync Event | `eventExternalId` | existsByExternalId → skip |
| ERP Push | `pushType + referenceId` | findByReference → return existing |

### 4. ERP Push Retry — SPEC COMPLIANT

`erp-push.service.ts`:
- Exponential backoff: `[1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s]` — matches spec exactly
- Max 10 attempts → dead letter queue
- Dead letter raises CRITICAL alert automatically
- Manual retry + cancel endpoints
- Payload hash (SHA256) for integrity tracking
- Retryable status validation before retry

### 5. Alert System — WELL DESIGNED

`alert.service.ts`:
- Severity levels: INFO → WARN → ERROR → CRITICAL
- Status flow: OPEN → ACKNOWLEDGED → RESOLVED / SUPPRESSED
- CRITICAL alerts require resolution note (L114)
- Auto-raise on device offline, ERP dead letter, sync conflict
- Stats aggregation by status × severity + by source

### 6. DTO Validation — GOOD (for weighbridge)

`create-weigh-event.dto.ts` — 15 validated fields:
- `@IsString()` weighbridgeEventId, scaleDeviceId, vehicleNumber
- `@IsEnum(WeighingType)` weighingType
- `@IsNumber()` weighingSequence, grossWeightKg, tareWeightKg
- `@IsUUID()` correlationId, approvedBy, referenceId
- `@IsDateString()` eventTime
- `@IsOptional()` for non-required fields
- `@IsBoolean()` isManualEntry

### 7. Monitoring — COMPREHENSIVE

3 complementary services:
- **ChannelHealthService**: Per-channel health (HEALTHY/DEGRADED/DOWN) based on alert count, backlog, success rate, latency
- **MonitoringService**: Dashboard overview combining all channels
- **AlertService**: Operational alert management

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: Zero RBAC — All 29 Routes Unprotected [CRITICAL]

**Code:** 5 controllers, 29 routes, ZERO `@UseGuards()`, ZERO `@Permission()`.

**Impact:** Bất kỳ ai cũng có thể ingest weigh events, confirm OCR, retry ERP push, resolve alerts.

**Evidence — controllers use hardcoded users:**
```typescript
// weighbridge.controller.ts L20
const createdBy = 'system-agent';

// ocr.controller.ts L45
const createdBy = 'operator'; // In production, from auth context

// erp-push.controller.ts
const userId = 'admin-user';
```

**Fix:** Add to every controller:
```typescript
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard, PermissionGuard)
export class WeighbridgeController {
  @Post('events')
  @Permission('INTEGRATION.WEIGHBRIDGE.INGEST')
  async ingestWeighEvent(@Body() dto, @CurrentUser() user: RequestUser) {
    return this.ingestService.ingestWeighEvent(dto, user.id);
  }
}
```

**Permission codes needed:**
| Resource | Actions |
|----------|---------|
| INTEGRATION.WEIGHBRIDGE | INGEST, READ, REPROCESS |
| INTEGRATION.WEIGHBRIDGE_DEVICE | READ, HEARTBEAT |
| INTEGRATION.OCR | UPLOAD, READ, CONFIRM, LINK, REJECT |
| INTEGRATION.MOBILE_SYNC | SUBMIT, READ, REPLAY |
| INTEGRATION.ERP_PUSH | ENQUEUE, READ, RETRY, CANCEL |
| INTEGRATION.MONITORING | VIEW |
| INTEGRATION.ALERT | READ, ACKNOWLEDGE, RESOLVE |

---

## HIGH Issues

### HI-1: OCR Extraction is MOCK [HIGH]

**Code:** `ocr-extract.service.ts` L71-92:
```typescript
private async mockOcrExtraction(imagePath: string): Promise<OcrExtractedData> {
  return {
    blNumber: `BL-${Date.now().toString().slice(-8)}`,
    blConfidence: 95.5,
    vehicleNumber: '51A-12345',
    // ... all hardcoded mock data
    overallConfidence: 90.2,
    rawResponse: { provider: 'mock' },
  };
}
```

**Impact:** OCR always returns same data. Confidence always 90.2% (always EXTRACTED, never REVIEW_REQUIRED). Khong co real extraction.

**Acceptable?** YES for Phase 1 nếu OCR engine chưa chọn (BLOCKER-2). Nhưng phải:
1. Log warning khi sử dụng mock
2. Feature flag để switch mock → real
3. Document rõ đây là mock

### HI-2: ERP Push is MOCK [HIGH]

**Code:** `erp-push.service.ts` L212-215:
```typescript
private async mockErpCall(job: any) {
  // Mock implementation - always succeeds for demo
  return { success: true, code: 200, body: { status: 'OK', referenceId: job.referenceId } };
}
```

**Impact:** ERP push always succeeds → retry/dead-letter logic never exercises. Real ERP failures invisible.

**Acceptable?** YES for Phase 1 nếu ERP API chưa sẵn sàng (BLOCKER-1). Same conditions as HI-1.

### HI-3: No $transaction in Any Service [HIGH]

**Code:** Zero `prisma.$transaction()` calls across all 13 services.

**Affected operations:**
- `weighbridge-ingest.service.ts` — Creates log + event state in 2 separate Prisma calls (L77-106). Race condition nếu event state create fails.
- `mobile-sync-batch.service.ts` — Creates batch then iterates events creating each individually (L56-97). Partial failure = orphaned events.
- `ocr-confirmation.service.ts` — Confirms + creates snapshot + links in separate calls.

**Impact:** Concurrent requests hoặc partial failures có thể tạo inconsistent state.

**Fix:** Wrap multi-step operations in `prisma.$transaction()`:
```typescript
return this.prisma.$transaction(async (tx) => {
  const log = await tx.m8WeighbridgeLog.create({...});
  await tx.m8WeighbridgeEventState.create({...});
  return log;
});
```

### HI-4: No decimal.js for Weight Calculations [HIGH]

**Code:** `weighbridge-ingest.service.ts` L63-65:
```typescript
if (!netWeightKg && dto.grossWeightKg && dto.tareWeightKg) {
  netWeightKg = dto.grossWeightKg - dto.tareWeightKg;  // Native JS arithmetic
}
```

**Impact:** Floating-point precision errors on boundary cases. M3/M4 use decimal.js — M8 should too.

**Fix:**
```typescript
import Decimal from 'decimal.js';
netWeightKg = new Decimal(dto.grossWeightKg).minus(dto.tareWeightKg).toNumber();
```

### HI-5: OCR Confidence Threshold Hardcoded 80% [HIGH]

**Code:** `ocr-extract.service.ts` L49:
```typescript
const status = extractedData.overallConfidence && extractedData.overallConfidence >= 80
  ? OcrStatus.EXTRACTED
  : OcrStatus.REVIEW_REQUIRED;
```

**Spec says:** ≥90% per field (bl_number 90%, vehicle 90%, product 85%, vessel 85%, qty 85%). Current code only checks `overallConfidence ≥ 80%` — no per-field confidence check.

**Fix:** Implement per-field confidence validation matching spec:
```typescript
const fieldThresholds = { bl: 90, vehicle: 90, product: 85, vessel: 85, qty: 85 };
const allFieldsPass = extractedData.blConfidence >= 90
  && extractedData.vehicleConfidence >= 90 ...;
```

### HI-6: Callback Dispatch Not Implemented [HIGH]

**Code:** `weighbridge-ingest.service.ts` L122-126:
```typescript
private async dispatchCallbackAsync(logId, referenceType, referenceId) {
  // In production, this would enqueue to BullMQ/Redis
  this.logger.log(`Callback queued for log ${logId}, ref: ${referenceType}/${referenceId}`);
}
```

**Impact:** Weighbridge events ingested but M4/M5 NEVER notified. Same issue as M7 outbox consumer.

**Fix:** Integrate with BullMQ/Redis or implement direct HTTP callback (like M7's deliverOutbox pattern).

### HI-7: DTOs Missing for Most Controllers [HIGH]

**Code:** Only weighbridge has proper DTOs with class-validator decorators. Other controllers use inline classes WITHOUT decorators:

- `ocr.controller.ts` L7-32: `UploadOcrDto`, `ConfirmOcrDto`, `LinkOcrDto`, `RejectOcrDto` — NO `@IsString()`, `@IsUUID()`, etc.
- `mobile-sync.controller.ts`: inline DTO classes — NO validation decorators
- `erp-push.controller.ts`: inline DTO classes — NO validation decorators
- `monitoring.controller.ts`: uses raw @Query() params

**Impact:** Invalid input passes through to services. Possible crashes or data corruption.

**Fix:** Add class-validator decorators to all DTOs (like weighbridge DTOs).

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | No M1 AuditLog integration | All services | Zero references to M1 LogService. Domain events not audited cross-module. |
| MD-2 | OCR auto-match not implemented | ocr-confirmation.service.ts | Spec: ≥90% + exactly 1 receipt → AUTO_MATCHED. Code: only manual link. |
| MD-3 | Mobile sync dispatch is stub | mobile-sync-dispatch.service.ts | Event dispatch to M6/M7 referenced but no actual HTTP call |
| MD-4 | No lockForUpdate anywhere | All services | Zero pessimistic locking. Concurrent weigh events, sync batches may race |
| MD-5 | Weighbridge retry 3×30s not coded | weighbridge-ingest.service.ts | Spec: fixed interval 3 retries. Code: only single ingest + reprocess endpoint |
| MD-6 | Channel health snapshot not persisted | channel-health.service.ts | Computes health on-the-fly, no historical snapshots |
| MD-7 | No Prisma schema file in module | - | 11 M8 models referenced but Prisma schema not found in module dir |

---

## Cross-Check: Code vs Spec Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| IO-BR-001 | Manual weight requires WH_MANAGER + reason_code | **PARTIAL** — Checks manualReasonCode + approvedBy nhưng no RBAC to verify WH_MANAGER role |
| IO-BR-002 | Weighbridge retry 3×30s fixed interval | **NOT IMPL** — No agent-side retry logic |
| IO-BR-003 | Latency ≤ 2 seconds | **TRACKED** — latencyMs computed + stored per event |
| IO-BR-004 | 1 weigh = 1 immutable log | **PASS** — Create only, no weight field updates |
| IO-BR-005 | Multi-trip: Net_N = Gross_N - Gross_(N-1) | **PARTIAL** — Net calc exists nhung no multi-trip sequence tracking in M8 (handled by M5) |
| IO-BR-006 | ERP push idempotent exponential backoff max 10 | **PASS** — Correctly implemented |
| IO-BR-007 | OCR ≥90% auto-suggest, <90% operator confirm | **PARTIAL** — Uses 80% threshold, no per-field check, no auto-match |
| IO-BR-008 | Mobile offline queue + sync via external_id | **PASS** — Batch + event idempotency |
| IO-BR-009 | M8 capture, M4/M5 authorize manual weight | **PARTIAL** — M8 captures nhưng callback to M4/M5 not implemented |
| IO-BR-010 | All events: external_id + correlation_id + source_channel | **PASS** — All 4 sub-modules include these fields |

**5/10 PASS, 4/10 PARTIAL, 1/10 NOT IMPL**

---

## Cross-Check: Code vs Spec Sub-Modules

| Sub-Module | Spec | Code | Status |
|------------|------|------|--------|
| 1. Weighbridge Local Agent | COM port, retry, heartbeat | Ingest + heartbeat + device mgmt. No COM port (expected). | **PASS** (agent = client-side) |
| 2. Weighbridge Log Management | Immutable log, manual weight, latency | Create, query, manual check, latency tracking | **PASS** |
| 3. OCR Intake & M4 Handoff | Upload, extract, confidence, auto-match, confirm | Upload, mock extract, confirm/link/reject. No auto-match. | **PARTIAL** |
| 4. Mobile Sync & Offline | Batch, dedup, conflict, dispatch | Batch, dedup, replay. Dispatch stub. | **PARTIAL** |
| 5. ERP One-Way Push | Queue, backoff, dead letter, manual retry | Full retry chain, dead letter alert, cancel | **PASS** |
| 6. Integration Monitoring | Dashboard, alerts, health | Channel health, alert CRUD, monitoring overview | **PASS** |

**4/6 PASS, 2/6 PARTIAL**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Architecture | 80% | Clean NestJS service-repository, good domain separation |
| Weighbridge | 85% | Ingest + idempotency + device + latency tracking. No callback dispatch. |
| OCR | 50% | Mock extraction, no auto-match, 80% vs spec 90% threshold |
| Mobile Sync | 70% | Batch + event dedup good, dispatch stub |
| ERP Push | 85% | Exponential backoff + dead letter + alert. Mock actual call. |
| Monitoring | 85% | Channel health + alert management + dashboard |
| RBAC | 0% | Zero auth on 29 routes |
| Data integrity | 30% | No $transaction, no lockForUpdate, no decimal.js |
| DTO validation | 40% | Only weighbridge DTOs have decorators. Others bare. |
| State machines | 90% | 4 complete state machines, correct transitions |
| **Overall** | **7.0** | Good first implementation. RBAC + data integrity must fix. |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | RBAC on all 29 routes | 3h | Truoc merge |
| 2 | **HIGH** | $transaction wrap multi-step operations | 2h | Sprint 5 |
| 3 | **HIGH** | class-validator decorators on OCR/Sync/ERP DTOs | 1h | Sprint 5 |
| 4 | **HIGH** | decimal.js for weight calculations | 30m | Sprint 5 |
| 5 | **HIGH** | OCR confidence per-field check (90% spec) | 1h | Sprint 5 |
| 6 | **HIGH** | Callback dispatch implementation (BullMQ or HTTP) | 1 day | Sprint 5 |
| 7 | **HIGH** | Mobile sync dispatch to M6/M7 | 2h | Sprint 5 |
| 8 | **MEDIUM** | OCR auto-match logic | 2h | Sprint 6 |
| 9 | **MEDIUM** | M1 AuditLog integration | 2h | Before production |
| 10 | **MEDIUM** | lockForUpdate on concurrent operations | 1h | Sprint 6 |

**Estimated total: ~2.5 days for CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL PASS (7.0/10).** M8 đã implement đầy đủ 6 sub-modules với architecture tốt:

**Điểm mạnh:**
- 4 state machines cho 4 integration objects — correct flows
- Idempotency consistent trên tất cả sub-modules
- ERP push retry chain hoàn chỉnh (exponential backoff + dead letter + alert)
- Alert management với severity + resolution workflow
- Weighbridge DTO validation tốt (class-validator)
- Domain errors well-structured (25 error codes)

**Gaps chính:**
1. **RBAC = 0** — 29 routes unprotected, hardcoded user IDs in controllers
2. **No $transaction** — multi-step operations risk inconsistent state
3. **Mock OCR + ERP** — acceptable cho Phase 1 nhưng phải document rõ
4. **OCR threshold 80%** — spec yêu cầu 90% per-field
5. **DTO validation missing** trên 4/5 controllers

**So với modules khác:** M8 architecture tốt hơn M4/M6 (JS monolithic) nhưng thiếu data integrity patterns (lockForUpdate, $transaction, decimal.js) mà M5/M7 đã có. RBAC = blocking issue giống M5 ban đầu.
