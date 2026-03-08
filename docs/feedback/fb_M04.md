# Module 4 — Inbound Operations: Code Review Report

**Code path:** `backend/src/modules/inbound/` (11 JS files)
**Spec file:** `docs/spec/module_4_inbound_operations_spec.md`
**Prisma models:** 6 M4 models in `backend/prisma/schema.prisma`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 7.0 / 10
**Verdict:** CONDITIONAL PASS — State machine + tolerance + weighing logic tot, nhung thieu M3 inventory posting (gap lon nhat).

---

## Tech Stack — Consistent voi M3

| Layer | Choice | Note |
|-------|--------|------|
| Language | JavaScript (CommonJS) | Same as M3, khac M1/M2 (TypeScript) |
| Framework | Express Router | Same as M3 |
| Validation | Joi | Same as M3 |
| ORM | Prisma | Same across all modules |
| Precision | decimal.js | Good |
| Auth | Custom middleware | Matches M3 pattern |

---

## Code Scope

| Layer | Files | Components |
|-------|-------|-----------|
| Application | 1 | receipt.service.js (~618 lines — largest file) |
| Domain | 3 | state-machine (10 states, 10 actions), policy (4 policies), errors (13 codes) |
| Infrastructure | 3 | receipt, receipt-weighing, receipt-status-history repositories |
| Controller | 1 | 12 methods |
| Schema | 1 | 7 Joi schemas |
| Routes | 1 | 12 Express routes |
| Prisma Models | 6 | ReceiptHeader, ReceiptLine, WeighingLog, StatusHistory, ExceptionLog, IntegrationState |

---

## Review Gate Checklist (10 items — per Spec AC)

| #   | Gate Question                    | Result   | Note                                                                                                     |
| -----| ----------------------------------| ----------| ----------------------------------------------------------------------------------------------------------|
| 1   | Receipt state machine 10 states? | **PASS** | DRAFT→AWAITING_WEIGHING→WEIGHED_IN→PROCESSING→WEIGHED_OUT→RECEIVED→PUTAWAY→CLOSED + REJECTED + CANCELLED |
| 2   | Weigh-in/out capture correct?    | **PASS** | Gross/tare/net with per-attempt logging, decimal.js precision                                            |
| 3   | Tolerance check 4-level cascade? | **PASS** | OwnerItemPolicy → Item → Owner → ENV default                                                             |
| 4   | Pass=RECEIVED, Fail=REJECTED?    | **PASS** | Auto-accept/auto-reject, no PENDING_APPROVAL                                                             |
| 5   | Re-weigh max 3, keeps receipt#?  | **PASS** | canReweigh checks attemptNumber, same receipt number                                                     |
| 6   | Inbound posting at RECEIVED?     | **FAIL** | Side effects declared but **NOT IMPLEMENTED**                                                            |
| 7   | Putaway work auto-created?       | **FAIL** | putawayComplete action defined but **NO service method**                                                 |
| 8   | RBAC enforce?                    | **PASS** | 8 permission codes on all 12 routes                                                                      |
| 9   | Idempotency?                     | **PASS** | externalId on receipt, eventId on weighing                                                               |
| 10  | Audit trail?                     | **PASS** | StatusHistory + WeighingLog + ExceptionLog + correlationId                                               |

**Result: 8/10 PASS, 2/10 FAIL**

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: NO M3 Inventory Posting at RECEIVED [CRITICAL]

**Spec ref:** INB-BR-011 — "Inbound posting only at RECEIVED". Sub-module 5 — "Handoff to M3".
**Code:** `receipt.service.js` `receiveWeighOut()` — khi tolerance pass, sets status `RECEIVED` va updates line `receivedQty` nhung **KHONG goi M3 PostingEngine**.

**State machine declares side effects:**
```javascript
sideEffects: ['postInventory', 'createPutawayWork', 'captureBillingEvent']
```
Nhung day chi la **documentation** — KHONG co code thuc thi.

**Impact:** Hàng nhap kho nhung InventTrans KHONG duoc tao → OnHand KHONG tang → M5 Outbound se thay tồn = 0 → M10 Billing khong co data.
**Day la gap lon nhat cua M4.** Khong co posting = M4 chi la "receipt management" chu khong phai "inbound operations".

**Fix:**
```javascript
// In receiveWeighOut(), after setting status RECEIVED:
const postingResult = await this.postingEngine.postInventory({
  externalId: `RCPT-${receipt.id}-${line.id}`,
  correlationId: context.correlationId,
  eventCode: 'INBOUND_RECEIVED',
  refType: 'RECEIPT',
  refId: receipt.id,
  refLineId: line.id,
  itemId: line.itemId,
  qty: netWeightKg.toString(),
  uomCode: line.uomCode || 'KG',
  dimTo: {
    warehouseCode: receipt.warehouse.warehouseCode,
    locationCode: receipt.receivingLocation.locationCode,
    ownerCode: receipt.owner.ownerCode,
    statusCode: 'AVAILABLE',
  },
  sourceApp: 'WEB',
  postedBy: context.userId,
});
// Store reference
await tx.receiptHeader.update({
  where: { id: receipt.id },
  data: { postedTransId: postingResult.transId },
});
```

**Prerequisite:** Event mapping `INBOUND_RECEIVED` phai co trong seed data cua M3.

### CR-2: createReceipt Khong Co Transaction [CRITICAL]

**Code:** `receipt.service.js` `createReceipt()` — idempotency check (`findByExternalId`) va `create` la 2 operations RIENG BIET, khong trong $transaction.
**Impact:** 2 concurrent requests cung `externalId` co the ca 2 pass idempotency check → duplicate receipt.
**Fix:** Wrap trong `this.prisma.$transaction()` giong nhu cac method khac.

---

## HIGH Issues (Fix truoc Sprint tiep)

### HI-1: BaggedPolicy.checkOverReceipt — Dead Code [HIGH]

**Spec ref:** INB-BR-015 — "Bagged inbound: PO-level bag_count blocking"
**Code:** `inbound.policy.js` — `BaggedPolicy.checkOverReceipt()` exported nhung **KHONG BAO GIO duoc goi** trong receipt.service.js.
**Impact:** Bagged cargo co the nhan vuot so bag cua PO. Vi pham INB-BR-015.
**Fix:** Goi `BaggedPolicy.checkOverReceipt()` trong `receiveWeighOut()` truoc khi set status RECEIVED, khi receipt co cargoForm khac BULK.

### HI-2: Putaway Workflow Missing [HIGH]

**Spec ref:** INB-BR-012 — "RECEIVED must auto-create putaway work". Sub-module 6.
**Code:** State machine co `putawayComplete` action (RECEIVED → PUTAWAY) nhung:
- KHONG co `putawayHandoff()` service method
- `putawayWorkId` field tren ReceiptHeader KHONG BAO GIO duoc populate
- `ReceiptIntegrationState` model KHONG duoc su dung

**Impact:** After RECEIVED, khong co putaway work tu dong → hàng nam o receiving location vinh vien.
**Fix:** Sau M3 posting tai RECEIVED, goi M7 WorkExecutionService.createPutawayWork(). Luu `putawayWorkId` vao receipt header.

### HI-3: Receipt Number Generation Not Concurrent-Safe [HIGH]

**Code:** `receipt.service.js` `confirmReceipt()` — generates receipt number via `count()` + increment.
**Impact:** 2 concurrent confirms co the tao cung receipt number → unique constraint violation.
**Fix:** Dung M1 NumberSequenceService (da co RCV sequence seeded) hoac database sequence.

### HI-4: lockForUpdate Never Called [HIGH]

**Code:** `receipt.repository.js` co method `lockForUpdate()` (SELECT FOR UPDATE) nhung **KHONG BAO GIO duoc goi** boi service.
**Impact:** Concurrent updates to same receipt (e.g., 2 weigh-out requests) co the race condition.
**Fix:** Goi `lockForUpdate()` tai dau moi $transaction trong service truoc khi read + validate + update.

### HI-5: No M1 AuditLog Integration [HIGH]

**Code:** Khong co LogService injection. Khong co createAuditLog() calls. Console.error only.
**Impact:** M1 AuditLog table thieu inbound events.
**Fix:** Inject LogService, goi createAuditLog() sau moi state transition.

### HI-6: receiveWeighOut Single-Line Assumption [HIGH]

**Code:** `receiveWeighOut()` — uses `receipt.lines[0]` cho tolerance lookup va sets ALL lines' receivedQty to same netWeightKg.
**Spec ref:** Phase 1 co the la single-line, nhung code should be explicit about this constraint.
**Impact:** Multi-line receipts se co sai so lieu (moi line nhan cung total net weight).
**Fix:** Add explicit guard:
```javascript
if (receipt.lines.length > 1) throw new Error('Multi-line receipt not supported in Phase 1');
```
Hoac distribute qty proportionally.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | `manualWeightSchema` dead code | inbound.schema.js | Defined nhung khong co route/method |
| MD-2 | `ReceiptIntegrationState` unused | Prisma schema | Model exists nhung zero code touches it |
| MD-3 | Controller ternary bug | inbound.controller.js line ~113 | `result.idempotentReplay ? 200 : 200` — both branches return 200 |
| MD-4 | Controller receiveWeighIn extracts receiptId from req.body | inbound.controller.js | Should use validated `value` object |
| MD-5 | `rowVersion` incremented but never checked | receipt.repository.js | No WHERE rowVersion guard against lost updates |
| MD-6 | No dashboard service implementation | receipt.service.js | Dashboard route exists nhung `getDashboardSummary` not implemented |
| MD-7 | Vessel flow not differentiated | receipt.service.js | ReceiptType has STANDARD/VESSEL nhung no flow difference in code |

---

## Diem Manh — What's Done Well

### 1. State Machine — EXCELLENT
- 10 states, 10 actions, clear transition map.
- Terminal states (CLOSED, CANCELLED) properly locked.
- Re-weigh max 3 attempts enforced.
- `canTransition()` returns `{ allowed, toStatus, sideEffects }` — clean design.
- Forbidden transitions explicitly documented.

### 2. Tolerance Logic — COMPLETE
- 4-level cascade lookup (OwnerItemPolicy → Item → Owner → ENV).
- decimal.js precision for variance calculation.
- Tolerance and variance snapshotted at decision time (immutable).
- Auto-accept/auto-reject per spec (no PENDING_APPROVAL).

### 3. Weighing Flow — SOLID
- Separate weigh-in and weigh-out with proper state transitions.
- `net_weight = gross - tare` calculated server-side (never from client).
- Per-attempt logging in `ReceiptWeighingLog`.
- `eventId` idempotency per weigh event.
- Raw weighbridge payload preserved (`rawPayload` JSON field).

### 4. RBAC — CONSISTENT
- 8 permission codes on 12 routes.
- auth middleware validates JWT + resolves permissions.
- Warehouse/owner scope enforcement.
- DEV_AUTH_BYPASS production guard.

### 5. Status History — COMPREHENSIVE
- Every state transition logged with: fromStatus, toStatus, transitionCode, triggeredBy, correlationId, metadata JSON.
- Exception events logged separately.
- WeighingLog with attemptNumber tracing.

### 6. Error Handling — GOOD
- 13 specific error codes with HTTP status mapping.
- Factory functions for common errors.
- Prisma P2002 caught as 409.
- Structured JSON error response.

---

## Cross-Check: Code vs Spec Business Rules

| Rule | Description | Code Status |
|------|-------------|-------------|
| INB-BR-001 | 1 receipt = 1 trip = 1 vehicle | **PASS** — receipt links to single vehicle |
| INB-BR-002 | PO/ASN pre-create + vehicle matching | **PARTIAL** — PO reference exists, vehicle matching not explicit |
| INB-BR-003 | Weigh data from weighbridge; manual = exception | **PARTIAL** — manual weight schema exists but no endpoint |
| INB-BR-004 | Every weigh event has weighbridge log | **PASS** — WeighingLog created per event |
| INB-BR-005 | net = gross - tare | **PASS** — server-side calculation |
| INB-BR-006 | variance = \|net - expected\| / expected | **PASS** — decimal.js precision |
| INB-BR-007 | Tolerance by owner+item, not global | **PASS** — 4-level cascade |
| INB-BR-008 | variance <= tolerance → RECEIVED | **PASS** — auto-accept |
| INB-BR-009 | variance > tolerance → REJECTED | **PASS** — auto-reject |
| INB-BR-010 | Re-weigh max 3, keeps receipt# | **PASS** — attemptNumber check |
| INB-BR-011 | Posting only at RECEIVED | **FAIL** — posting NOT IMPLEMENTED |
| INB-BR-012 | RECEIVED → putaway work | **FAIL** — putaway NOT IMPLEMENTED |
| INB-BR-013 | Putaway → STORAGE location | **FAIL** — putaway NOT IMPLEMENTED |
| INB-BR-014 | Close only when putaway complete | **PARTIAL** — close method exists but no putaway check |
| INB-BR-015 | Bagged PO-level blocking | **FAIL** — BaggedPolicy dead code |
| INB-BR-016 | Cancel + manual weight need reason + audit | **PASS** — reasonCode required |

**10/16 PASS/PARTIAL, 4/16 FAIL (all related to M3 posting + putaway + bagged blocking)**

---

## Cross-Check: Code vs Spec Sub-Modules

| Sub-Module | Spec | Code Status |
|------------|------|-------------|
| 1. Receipt Creation | PO→Receipt, idempotency, number | **PASS** (except number generation concurrency) |
| 2. Vehicle/OCR Matching | Vehicle search, OCR, B/L | **NOT IMPLEMENTED** — no vehicle search/OCR endpoints |
| 3. Weigh Execution | Gross/tare/net capture | **PASS** |
| 4. Tolerance/Accept/Reject | Variance calc, auto-accept/reject, re-weigh | **PASS** |
| 5. Inbound Posting | Handoff to M3 at RECEIVED | **NOT IMPLEMENTED** |
| 6. Putaway Handoff | Auto-create work, close rules | **NOT IMPLEMENTED** |
| 7. Exception Handling | Cancel, manual weight | **PARTIAL** — cancel yes, manual weight schema only |
| 8. Auditability | Dedupe, correlation, KPI | **PASS** |

**4/8 PASS, 1/8 PARTIAL, 3/8 NOT IMPLEMENTED**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| State machine correctness | 95% | 10 states, proper transitions, terminal locks |
| Tolerance logic | 95% | 4-level cascade, decimal.js, snapshot |
| Weighing flow | 90% | Gross/tare/net, per-attempt log, eventId idempotency |
| RBAC | 85% | 8 permissions on all routes |
| M3 integration | 0% | Posting NOT IMPLEMENTED — biggest gap |
| M7 integration | 0% | Putaway NOT IMPLEMENTED |
| Data integrity | 60% | createReceipt not transactional, no lockForUpdate |
| Completeness | 50% | 4/8 sub-modules, 10/16 BRs |
| **Overall** | **7.0** | Good standalone receipt mgmt, missing critical integrations |

---

## Summary for Dev Team

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | Implement M3 posting at RECEIVED state | 1 day | Truoc merge |
| 2 | **CRITICAL** | Wrap createReceipt in $transaction | 30m | Truoc merge |
| 3 | **HIGH** | Wire BaggedPolicy.checkOverReceipt | 1h | Sprint 3 |
| 4 | **HIGH** | Implement putaway handoff to M7 | 1 day | Sprint 3 (after M7 ready) |
| 5 | **HIGH** | Use NumberSequence for receipt# generation | 30m | Sprint 3 |
| 6 | **HIGH** | Call lockForUpdate in service transactions | 1h | Sprint 3 |
| 7 | **HIGH** | Integrate M1 AuditLog service | 2h | Sprint 3 |
| 8 | **HIGH** | Guard single-line assumption explicitly | 15m | Sprint 3 |
| 9 | **MEDIUM** | Clean up dead code (manualWeightSchema, IntegrationState) | 30m | Sprint 4 |
| 10 | **MEDIUM** | Fix controller bugs (ternary, receiptId source) | 15m | Sprint 4 |

**Estimated total: ~3 days to address CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL PASS (7.0/10).** M4 co state machine + tolerance + weighing logic rat tot. Architecture consistent voi M3 (Express/JS/Joi/Prisma). RBAC, idempotency, audit trail da co.

Gap lon nhat la **thieu M3 inventory posting** — day la ly do M4 ton tai (inbound = post inventory). Dev team PHAI implement posting truoc merge. Putaway handoff co the doi M7 ready nhung posting la non-negotiable.
