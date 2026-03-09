# Module 8 — Integration Platform: Fix Verification Report

**Previous score:** 7.0 / 10 (CONDITIONAL PASS)
**New score:** 8.5 / 10
**Verdict:** PASS
**Review date:** 2026-03-09

---

## Fix Verification Summary

| # | Issue | Severity | Status | Note |
|---|-------|----------|--------|------|
| CR-1 | Zero RBAC on all 29 routes | CRITICAL | **FIXED** | All 5 controllers: @UseGuards + @Permission + @CurrentUser |
| HI-1 | OCR extraction is MOCK | HIGH | **ACCEPTED** | Mock vẫn giữ, acceptable Phase 1 |
| HI-2 | ERP push is MOCK | HIGH | **ACCEPTED** | Mock vẫn giữ, acceptable Phase 1 |
| HI-3 | No $transaction in any service | HIGH | **PARTIAL** | weighbridge-ingest ✅ fixed. mobile-sync-batch ❌, ocr-confirmation ❌ |
| HI-4 | No decimal.js for weight | HIGH | **FIXED** | `import Decimal from 'decimal.js'` + `.minus()` |
| HI-5 | OCR confidence 80% vs spec 90% | HIGH | **FIXED** | Per-field threshold: BL/Vehicle 90%, Product/Vessel/Qty 85% |
| HI-6 | Callback dispatch not implemented | HIGH | **NOT FIXED** | Still stub — just logs |
| HI-7 | DTOs missing for most controllers | HIGH | **FIXED** | All 5 controllers now have validated DTOs |
| MD-1 | No M1 AuditLog integration | MEDIUM | NOT FIXED | Chấp nhận deferred |
| MD-2 | OCR auto-match not implemented | MEDIUM | NOT FIXED | Chấp nhận deferred |
| MD-3 | Mobile sync dispatch is stub | MEDIUM | NOT FIXED | mockDispatchToModule() |
| MD-4 | No lockForUpdate anywhere | MEDIUM | NOT FIXED | Chấp nhận deferred |

**Result: 4 FIXED, 2 ACCEPTED, 2 PARTIAL/NOT FIXED (HIGH), 4 NOT FIXED (MEDIUM)**

---

## Detailed Verification

### CR-1: RBAC — FULLY FIXED ✅

**All 5 controllers verified:**

**weighbridge.controller.ts:**
```typescript
@Controller('api/v1/integration/weighbridge')
@UseGuards(AuthGuard, PermissionGuard)
export class WeighbridgeController {
  @Post('events')
  @Permission('INTEGRATION.WEIGHBRIDGE.INGEST')
  async ingestWeighEvent(@Body() dto, @CurrentUser() user: RequestUser) {
    return this.ingestService.ingestWeighEvent(dto, user.id); // ← dùng user.id thay vì hardcoded
  }
```

**Permission matrix (29 routes):**
| Controller | Routes | Permissions |
|-----------|--------|-------------|
| Weighbridge | 6 | WEIGHBRIDGE.INGEST, .READ, .REPROCESS, WEIGHBRIDGE_DEVICE.HEARTBEAT, .READ |
| OCR | 6 | OCR.UPLOAD, .READ, .CONFIRM, .LINK, .REJECT |
| MobileSync | 5 | MOBILE_SYNC.SUBMIT, .READ, .REPLAY |
| ErpPush | 5 | ERP_PUSH.ENQUEUE, .READ, .RETRY, .CANCEL |
| Monitoring | 7 | MONITORING.VIEW, ALERT.READ, .ACKNOWLEDGE, .RESOLVE |

**No more hardcoded users** — `createdBy = user.id` from `@CurrentUser()` decorator throughout.

### HI-3: $transaction — PARTIAL FIX ⚠️

**weighbridge-ingest.service.ts — FIXED:**
```typescript
// L80-119: Atomic log + event state creation
const log = await this.prisma.$transaction(async (tx) => {
  const createdLog = await tx.m8WeighbridgeLog.create({...});
  await tx.m8WeighbridgeEventState.create({...});
  return createdLog;
});
```

**mobile-sync-batch.service.ts — NOT FIXED:**
- L56: `batchRepo.create()` (separate call)
- L75-97: Loop creating events one by one (separate calls)
- L100: `batchRepo.updateCounts()` (separate call)
- **Risk:** If event creation fails mid-loop → batch exists but events are partial. No rollback.

**ocr-confirmation.service.ts — NOT FIXED:**
- L52: `snapshotRepo.upsertByOcrResultId()` (separate call)
- L66: `ocrResultRepo.update()` (separate call)
- **Risk:** Snapshot created but status not updated → inconsistent state.

### HI-4: decimal.js — FIXED ✅

```typescript
// weighbridge-ingest.service.ts L4
import Decimal from 'decimal.js';

// L67
netWeightKg = new Decimal(dto.grossWeightKg).minus(dto.tareWeightKg).toNumber();
```

Consistent với M3/M4 pattern.

### HI-5: OCR Confidence — FIXED ✅

**ocr-extract.service.ts L79-101** — `evaluateConfidence()`:
```typescript
private evaluateConfidence(data: OcrExtractedData): boolean {
  const thresholds = {
    blConfidence: 90,      // spec: ≥90%
    vehicleConfidence: 90, // spec: ≥90%
    productConfidence: 85, // spec: ≥85%
    vesselConfidence: 85,  // spec: ≥85%
    qtyConfidence: 85,     // spec: ≥85%
  };

  // Per-field check + requires at least 1 primary field (BL or vehicle)
  if (data.blNumber && (data.blConfidence ?? 0) < thresholds.blConfidence) return false;
  // ... similar for all fields

  const hasPrimaryField =
    (!!data.blNumber && (data.blConfidence ?? 0) >= thresholds.blConfidence) ||
    (!!data.vehicleNumber && (data.vehicleConfidence ?? 0) >= thresholds.vehicleConfidence);
  return !!hasPrimaryField;
}
```

**Matches spec exactly.** Thay vì `overallConfidence >= 80`, giờ check từng field + yêu cầu primary field.

### HI-6: Callback Dispatch — NOT FIXED ❌

```typescript
// weighbridge-ingest.service.ts L135-139
private async dispatchCallbackAsync(logId, referenceType, referenceId) {
  // In production, this would enqueue to BullMQ/Redis
  this.logger.log(`Callback queued for log ${logId}, ref: ${referenceType}/${referenceId}`);
}
```

Vẫn stub. Weighbridge events ingested nhưng M4/M5 không nhận callback.

### HI-7: DTOs — FIXED ✅

**OCR DTOs (inline in controller, nhưng có decorators):**
```typescript
class UploadOcrDto {
  @IsString() imagePath!: string;
  @IsOptional() @IsString() providerName?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
}
class ConfirmOcrDto { /* 8 validated fields */ }
class LinkOcrDto { @IsUUID() receiptId!: string; @IsString() linkMethod!: string; }
class RejectOcrDto { @IsString() reason!: string; }
```

**Mobile Sync DTOs (with nested validation):**
```typescript
class SyncEventDto {
  @IsString() eventExternalId!: string;
  @IsString() eventType!: string;
  @IsOptional() @IsUUID() workId?: string;
  @IsNumber() sequenceNo!: number;
  // ...
}
class SubmitBatchDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => SyncEventDto)
  events!: SyncEventDto[];  // ← proper nested validation
}
```

**ERP Push DTOs:**
```typescript
class EnqueuePushJobDto {
  @IsString() pushType!: string;
  @IsString() referenceId!: string;
  @IsUUID() correlationId!: string;
}
```

**Monitoring DTOs:**
```typescript
class ResolveAlertDto { @IsString() resolutionNote!: string; }
class AcknowledgeAlertDto { @IsOptional() @IsString() notes?: string; }
```

---

## Remaining Issues (re-prioritized)

| # | Priority | Issue | Effort | Impact |
|---|----------|-------|--------|--------|
| 1 | **HIGH** | $transaction missing: mobile-sync-batch + ocr-confirmation | 1h | Partial failures → inconsistent state |
| 2 | **HIGH** | Callback dispatch still stub (weighbridge → M4/M5) | 1 day | Weighbridge events don't reach inbound/outbound |
| 3 | **MEDIUM** | Mobile sync dispatch mock (→ M6/M7) | 2h | Sync events don't reach target modules |
| 4 | **MEDIUM** | No lockForUpdate on concurrent operations | 1h | Race conditions possible |
| 5 | **MEDIUM** | OCR auto-match not implemented | 2h | All OCR requires manual confirm |
| 6 | **MEDIUM** | M1 AuditLog integration | 2h | No audit trail for integration operations |

**Estimated: ~1.5 days for remaining HIGH items.**

---

## Score Justification

| Category | Before | After | Change |
|----------|--------|-------|--------|
| RBAC | 0% | **95%** | +95% — All 29 routes protected, @CurrentUser, proper permissions |
| DTO validation | 40% | **90%** | +50% — All controllers have validated DTOs |
| Data integrity | 30% | **55%** | +25% — weighbridge $transaction + decimal.js, but sync/ocr still missing |
| OCR | 50% | **70%** | +20% — Per-field confidence thresholds match spec |
| Weighbridge | 85% | **90%** | +5% — $transaction + decimal.js + auth |
| ERP Push | 85% | **85%** | No change (mock acceptable) |
| Monitoring | 85% | **90%** | +5% — Auth added |
| Mobile Sync | 70% | **75%** | +5% — DTOs + auth, but no $transaction |
| **Overall** | **7.0** | **8.5** | **+1.5** |

---

## Verdict

**PASS (8.5/10).** Dev đã fix đúng trọng tâm:

**Đã fix (quan trọng nhất):**
1. **RBAC 0→95%** — 29 routes protected, @CurrentUser thay hardcoded IDs
2. **DTOs 40→90%** — Tất cả controllers có class-validator decorators, nested validation cho mobile sync
3. **decimal.js** — Weighbridge weight calc dùng Prisma Decimal
4. **OCR confidence** — Per-field threshold đúng spec (90%/85%)
5. **weighbridge $transaction** — Log + event state atomic

**Còn cần fix (Sprint 5):**
1. `mobile-sync-batch.service.ts` — Wrap batch + events creation trong $transaction
2. `ocr-confirmation.service.ts` — Wrap snapshot + status update trong $transaction
3. Callback dispatch (weighbridge → M4/M5) — Cần BullMQ hoặc HTTP pattern

**So với modules khác:** M8 giờ ngang level M4 (8.8) về chất lượng. RBAC + DTO validation giờ tốt hơn M4/M6 (JS modules). Chỉ thiếu $transaction ở 2 services và callback dispatch.
