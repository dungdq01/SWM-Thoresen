# Module 10 — Billing & Commercial Control: Code Review Report

**Code path:** `backend/src/modules/billing/` (31 TS files, ~2,839 lines)
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 8.0 / 10
**Verdict:** CONDITIONAL PASS — Business logic xuất sắc (rate resolution, charge calc, DN state machine). Nhưng thiếu PermissionGuard, lockForUpdate không sử dụng, storage snapshot chưa có, và ERP push chưa wire.

---

## Tech Stack — NestJS (same as M1/M2/M5/M8/M9)

| Layer | Choice | Note |
|-------|--------|------|
| Language | **TypeScript** | Same paradigm as other NestJS modules |
| Framework | **NestJS** | Controllers + Injectable services |
| Validation | **class-validator** | All DTOs with decorators, nested validation |
| ORM | Prisma | Consistent across all modules |
| Precision | **decimal.js** | Charge calculation uses `new Decimal()` |
| Auth | **AuthGuard only** | Authentication YES, authorization (PermissionGuard) NO |
| M1 Integration | **NumberSequenceService** | Contract + DN number via M1 Foundation |

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Controllers | 6 | BillingContract, BillingDayType, BillingEvent (public), BillingEvent (internal), DebitNote, BillingException |
| Services | 7 | billing-contract (230L), billing-day-type (51L), billing-event (104L), rate-resolution (130L), charge-calculation (151L), debit-note (408L), billing-exception (115L) |
| Repositories | 5 | billing-contract (142L), billing-day-type (75L), billing-event (109L), debit-note (141L), billing-exception (107L) |
| Domain | 3 | billing.enums (111L, 14 enums), billing.errors (113L, 28 error codes), debit-note-state-machine (105L) |
| DTOs | 6 | create-contract (147L), day-type (51L), billing-event (100L), debit-note (96L), exception (45L), index |

### API Endpoints (22 total)

**Contracts (7):**
```
POST   /api/v1/billing/contracts              → Create contract
GET    /api/v1/billing/contracts              → List contracts
GET    /api/v1/billing/contracts/:id          → Get contract
PUT    /api/v1/billing/contracts/:id          → Update contract
POST   /api/v1/billing/contracts/:id/activate → Activate
POST   /api/v1/billing/contracts/:id/deactivate → Deactivate
GET    /api/v1/billing/contracts/:id/fee-lines → Get fee lines
```

**Day Types (3):**
```
POST   /api/v1/billing/day-types              → Upsert day type
POST   /api/v1/billing/day-types/bulk         → Bulk upsert
GET    /api/v1/billing/day-types              → Query
```

**Events (3):**
```
GET    /api/v1/billing/events                 → List events
GET    /api/v1/billing/events/:id             → Get event
POST   /internal/billing/events/capture       → Capture event (internal, NO auth)
```

**Debit Notes (6):**
```
POST   /api/v1/billing/debit-notes            → Generate DN
GET    /api/v1/billing/debit-notes            → List DNs
GET    /api/v1/billing/debit-notes/:id        → Get DN
PUT    /api/v1/billing/debit-notes/:id/review → Review (DRAFT→REVIEWED)
PUT    /api/v1/billing/debit-notes/:id/approve → Approve (REVIEWED→APPROVED)
PUT    /api/v1/billing/debit-notes/:id/lock   → Lock (APPROVED→LOCKED)
GET    /api/v1/billing/debit-notes/:id/history → State history
```

**Exceptions (3):**
```
GET    /api/v1/billing/exceptions             → List exceptions
GET    /api/v1/billing/exceptions/:id         → Get exception
PUT    /api/v1/billing/exceptions/:id/resolve → Resolve
```

---

## Review Gate Checklist (14 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | Rate card (contract + fee lines) CRUD? | **PASS** | Full CRUD, nested fee lines, overlap check on activate |
| 2 | Scoring-based rate resolution? | **PASS** | cargoForm +100, warehouse +50, dayType +25, -priorityRank. Elegant. |
| 3 | Charge calculation with decimal.js? | **PASS** | qty × unitRate × multiplier, minimum charge, detailed trace |
| 4 | Day type calendar (working/off/holiday)? | **PASS** | Upsert per date, OT multiplier per dayType + isOvertime |
| 5 | Event capture with idempotency? | **PASS** | externalId dedup, auto dayType + multiplier resolution |
| 6 | DN generation from unbilled events? | **PASS** | Aggregates by eventType + feeLineId, VAT calc, M1 NumberSequence |
| 7 | DN state machine (DRAFT→REVIEWED→APPROVED→LOCKED)? | **PASS** | Clean state machine, blocker exception check before lock |
| 8 | DN immutability after LOCKED? | **PASS** | `isLocked()` + `validateModifiable()` in state machine |
| 9 | Exception management with blocker severity? | **PASS** | 7 types, 4 severities, BLOCKER blocks DN lock |
| 10 | DN audit trail (history)? | **PASS** | BilDebitNoteHistory with actionCode per state change |
| 11 | PermissionGuard (role-based authorization)? | **FAIL** | Only AuthGuard. No BILLING_OFC/WH_MANAGER role check. |
| 12 | Storage daily snapshot (23:59)? | **FAIL** | Not implemented — no daily_storage_snapshot service |
| 13 | ERP push integration (DN → M8)? | **FAIL** | No connection to M8 ErpPushService |
| 14 | lockForUpdate on DN state transitions? | **FAIL** | Method exists in repo but NEVER called in service |

**Result: 10/14 PASS, 0/14 PARTIAL, 4/14 FAIL**

---

## Diem Manh — What's Done Well

### 1. Rate Resolution — SCORING ALGORITHM (Best in project)

`rate-resolution.service.ts` L48-84:
```typescript
const scored = feeLines.map(line => {
  let score = 0;
  if (line.cargoForm && line.cargoForm === input.cargoForm) score += 100;
  else if (line.cargoForm && line.cargoForm !== input.cargoForm) score -= 1000;

  if (line.warehouseId && line.warehouseId === input.warehouseId) score += 50;
  else if (line.warehouseId && line.warehouseId !== input.warehouseId) score -= 1000;

  if (line.dayTypeScope) {
    const scopes = line.dayTypeScope.split(',');
    if (input.dayType && scopes.includes(input.dayType)) score += 25;
    else if (input.dayType && !scopes.includes(input.dayType) && !scopes.includes('ALL')) score -= 1000;
  }

  score -= line.priorityRank;
  return { line, score };
});

const eligible = scored.filter(s => s.score > -500);
eligible.sort((a, b) => b.score - a.score);
```

**Tốt:** Negative scoring (-1000) eliminates mismatches. Positive scoring rewards specificity. `priorityRank` breaks ties. Spec-compliant multi-factor matching.

### 2. Charge Calculation — FULL TRACE

`charge-calculation.service.ts` L52-95:
```typescript
const qty = new Decimal(input.billingQtyMt);
const unitRate = new Decimal(rate.unitRate);
const multiplier = new Decimal(input.combinedMultiplier ?? 1);

let baseAmount = qty.times(unitRate);
if (rate.minimumCharge && baseAmount.lt(new Decimal(rate.minimumCharge))) {
  baseAmount = new Decimal(rate.minimumCharge);
  minimumApplied = true;
}
const finalAmount = baseAmount.times(multiplier);

// Full trace includes formula, rates, multiplier, minimum flag
```

**Auditability:** Every charge has `calculationTrace` with input, rate, formula, baseAmount, multiplier, minimumApplied. DN lines store `calculationTraceJson` — full audit trail for billing disputes.

### 3. Debit Note State Machine — CLEAN

`debit-note-state-machine.ts`:
```
DRAFT → REVIEWED → APPROVED → LOCKED (immutable)
Regenerate: allowed in DRAFT/REVIEWED/APPROVED, blocked in LOCKED
```

- Static methods: `canTransition()`, `validateTransition()`, `isLocked()`, `validateModifiable()`
- DN lock checks for blocker exceptions before allowing transition
- History entry created for every state change

### 4. DN Generation — COMPREHENSIVE

`debit-note.service.ts` generate():
1. Idempotency via `externalId`
2. Period validation + duplicate draft check
3. Find active contract for owner
4. Aggregate unbilled events by eventType + feeLineId
5. Calculate charges with rate resolution + charge calculation
6. Generate DN number via M1 `NumberSequenceService`
7. Wrap in `$transaction`: create DN → create lines → mark events BILLED → create history
8. VAT calc: `totalBeforeVat × BIL_DEFAULT_VAT_RATE(10%) = vatAmount`

### 5. Exception Management — BUSINESS-AWARE

```typescript
enum BilExceptionType {
  MISSING_RATE, DUP_EVENT, ORPHAN_EVENT, LATE_EVENT,
  SNAPSHOT_FAIL, ERP_FAIL, DATA_MISMATCH,
}
enum BilExceptionSeverity { INFO, WARN, ERROR, BLOCKER }

// BLOCKER exceptions block DN lock:
const blockers = await this.exceptionRepo.findBlockersByDebitNote(id);
if (blockers.length > 0) throw createBillingError('DN_BLOCKER_EXCEPTION', {...});
```

Resolve actions: RESOLVE / IGNORE / REQUEUE — flexible workflow.

### 6. M1 Integration — NUMBER SEQUENCE

```typescript
const seqResult = await this.numberSequenceService.getNextNumber('DN', 'GLOBAL', { actorUserId: userId });
const dnNumber = seqResult.value;
```

Both Contract and DN use M1 NumberSequenceService — no manual sequence generation.

### 7. DTO Validation — THOROUGH

All 6 DTO files use class-validator:
- `CreateContractDto`: Nested `@ValidateNested({ each: true }) @Type(() => CreateContractFeeLineDto)` for fee lines
- `CaptureEventDto`: `@IsEnum(BilEventType)`, `@IsNumber() @Min(0) billingQtyMt`
- `GenerateDebitNoteDto`: `@IsUUID() ownerId`, `@IsDateString() periodStart/End`
- All query DTOs: pagination + optional filters

### 8. Idempotency — CONSISTENT

| Entity | Key | Pattern |
|--------|-----|---------|
| Contract | `externalId` | findByExternalId → return existing with `isReplay: true` |
| Event | `externalId` | findByExternalId → return existing with `isReplay: true` |
| Debit Note | `externalId` | findByExternalId → return existing with `isReplay: true` |

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: No PermissionGuard — Only Authentication, No Authorization [CRITICAL]

**Code:** All 5 public controllers use `@UseGuards(AuthGuard)` — authentication only. No `PermissionGuard`, no `@Permission()` decorator.

```typescript
// debit-note.controller.ts L25
@UseGuards(AuthGuard)  // ← Only checks "is user logged in", NOT "can user do this"
export class DebitNoteController {
```

**Impact:** Any authenticated user (WH_KEEPER, CUST_VIEWER) can:
- Generate/review/approve/lock debit notes (should be BILLING_OFC/WH_MANAGER)
- Modify contracts + rates (should be WH_ADMIN/BILLING_OFC)
- Resolve billing exceptions (should be BILLING_OFC)

**Spec roles:**
| Action | Required Role |
|--------|-------------|
| Contract CRUD | WH_ADMIN, BILLING_OFC |
| Day Type config | WH_ADMIN |
| Event capture | System (internal) |
| DN generate | BILLING_OFC |
| DN review | BILLING_OFC |
| DN approve | WH_MANAGER |
| DN lock | WH_MANAGER |
| Exception resolve | BILLING_OFC |
| Event/DN read | BILLING_OFC, WH_MANAGER, OPS_SUPER, CUST_VIEWER (own only) |

**Fix:** Add PermissionGuard + @Permission() on all routes (same pattern as M8/M9 fixed versions).

### CR-2: Internal Capture Endpoint — ZERO Auth [CRITICAL]

**Code:** `billing-event.controller.ts` L45-59:
```typescript
@Controller('internal/billing/events')
export class BillingEventInternalController {
  // NO @UseGuards at all
  @Post('capture')
  async capture(@Body() dto: CaptureEventDto) { ... }
}
```

**Impact:** Anyone can POST billing events without authentication. This is the entry point for ALL billing charges.

**Fix:** Internal endpoints should use service-to-service auth (API key, internal auth token, or at minimum IP whitelist).

---

## HIGH Issues

### HI-1: Race Condition in DN generate() — Events Read Outside Transaction [HIGH]

**Code:** `debit-note.service.ts` L82-87 + L147:
```typescript
// L82-87: Read outside transaction
const unbilledEvents = await this.eventRepo.findUnbilledByOwnerAndPeriod(...);

// ... charge calculation loop ...

// L147: Transaction starts AFTER events were read
return this.prisma.$transaction(async (tx) => {
  // Events may have been billed by concurrent DN generation
  // but we still create lines based on stale data
```

**Impact:** Two concurrent `generate()` calls for same owner/period → both read same unbilled events → both create DN lines → events double-billed.

**Fix:** Move entire read + calculate + create into single $transaction:
```typescript
return this.prisma.$transaction(async (tx) => {
  const unbilledEvents = await this.eventRepo.findUnbilledByOwnerAndPeriod(ownerId, start, end, tx);
  // ... rest of logic
});
```

### HI-2: lockForUpdate Exists But NEVER Used [HIGH]

**Code:** `debit-note.repository.ts` L138-140:
```typescript
async lockForUpdate(id: string, tx: Prisma.TransactionClient) {
  return tx.$queryRaw`SELECT * FROM bil_debit_note WHERE id = ${id}::uuid FOR UPDATE`;
}
```

**Never called:** The `review()`, `approve()`, `lock()` methods in debit-note.service.ts all:
1. Read DN outside transaction (line 256/293/330)
2. Start transaction
3. Update without acquiring lock

**Impact:** Concurrent review/approve on same DN may race.

**Fix:** Use lockForUpdate inside transaction:
```typescript
async review(id, dto, userId) {
  return this.prisma.$transaction(async (tx) => {
    const dn = await this.dnRepo.lockForUpdate(id, tx);  // ← acquire lock
    if (!dn) throw ...;
    DebitNoteStateMachine.validateTransition(...);
    await this.dnRepo.update(id, {...}, tx);
    await this.dnRepo.createHistory({...}, tx);
    return this.dnRepo.findById(id, tx);
  });
}
```

### HI-3: No Storage Snapshot Service [HIGH]

**Spec:** Storage fee = (Opening Balance + Inbound Today) × daily rate. Calculated from `daily_storage_snapshot` at 23:59.

**Code:** Zero references to snapshot service, snapshot run, or daily calculation. `BilSnapshotRunStatus` enum exists (PENDING/RUNNING/SUCCESS/FAILED/PARTIAL) but no service uses it.

**Impact:** Storage fee — potentially the largest billing item — cannot be calculated. Only handling/bagging events can be billed.

**Fix:** Create `storage-snapshot.service.ts`:
1. Run daily at 23:59 (cron or scheduled task)
2. For each owner×warehouse: query OnHand → calculate billable qty (Opening + Inbound)
3. Create storage billing event → captured into billing pipeline

### HI-4: No ERP Push Integration [HIGH]

**Code:** DN reaches LOCKED state but goes nowhere. No integration with M8 `ErpPushService`.

`BilErpPushStatus` enum exists (NOT_SENT/PENDING/SUCCESS/FAILED) but no code uses it.

**Impact:** Locked debit notes stay in WMS. No push to ERP for accounting/invoicing.

**Fix:** After DN lock, enqueue push job to M8:
```typescript
// In lock() method, after status update:
await this.erpPushService.enqueuePushJob({
  pushType: 'DEBIT_NOTE',
  referenceId: dn.dnNumber,
  payload: { ... },
  correlationId,
});
```

### HI-5: DN lock() Checks Blockers Outside Transaction [HIGH]

**Code:** `debit-note.service.ts` L329-346:
```typescript
async lock(id, dto, userId) {
  const dn = await this.dnRepo.findById(id);     // ← outside tx
  DebitNoteStateMachine.validateTransition(...);

  const blockers = await this.exceptionRepo.findBlockersByDebitNote(id);  // ← outside tx
  if (blockers.length > 0) throw ...;

  return this.prisma.$transaction(async (tx) => {
    // Blocker could be created between check and lock
```

**Impact:** Race: exception resolved → lock passes → but new blocker created concurrently → DN locked with unresolved blocker.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | No regenerate endpoint | debit-note.service.ts | State machine supports `canRegenerate()` but no controller route or service method |
| MD-2 | bulkUpsert without $transaction | billing-day-type.service.ts L43-50 | Sequential loop, partial failure = inconsistent calendar |
| MD-3 | No M1 AuditLog integration | All services | DN history is good, but no cross-module audit trail |
| MD-4 | activate() without $transaction | billing-contract.service.ts L181-204 | Check overlap → update. Race condition possible. |
| MD-5 | CUST_VIEWER access not scoped | All controllers | No `ownerId` filter enforcement — customer can see all DNs |
| MD-6 | No export endpoint | debit-note.controller.ts | ExportDebitNoteDto exists in DTO but no controller route |

---

## Cross-Check: Code vs Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| BR-BIL-001 | Rate card per owner with fee lines | **PASS** — Contract + fee lines, activate/deactivate lifecycle |
| BR-BIL-002 | Multi-factor rate resolution | **PASS** — Scoring: cargoForm, warehouse, dayType, priority |
| BR-BIL-003 | Charge = qty × unitRate × multiplier | **PASS** — decimal.js, minimum charge, full trace |
| BR-BIL-004 | Day type calendar (working/off/holiday) | **PASS** — Calendar per date, OT/no-OT multiplier |
| BR-BIL-005 | Event capture idempotent | **PASS** — externalId dedup |
| BR-BIL-006 | Storage fee = (Opening + Inbound) × rate daily | **FAIL** — No snapshot service |
| BR-BIL-007 | DN generation from unbilled events | **PASS** — Aggregation + VAT + number sequence |
| BR-BIL-008 | DN approval flow DRAFT→REVIEWED→APPROVED→LOCKED | **PASS** — State machine + blocker check |
| BR-BIL-009 | LOCKED DN immutable | **PASS** — validateModifiable() guard |
| BR-BIL-010 | DN push to ERP | **FAIL** — Not implemented |
| BR-BIL-011 | RBAC per action type | **PARTIAL** — AuthGuard yes, PermissionGuard no |
| BR-BIL-012 | Billing exception management | **PASS** — 7 types, 4 severities, resolve/ignore/requeue |

**8/12 PASS, 1/12 PARTIAL, 3/12 FAIL**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Architecture | 90% | Clean NestJS, domain separation, M1 integration |
| Rate resolution | 95% | Best-in-project scoring algorithm |
| Charge calculation | 90% | decimal.js, minimum charge, full audit trace |
| DN lifecycle | 85% | State machine correct, but lockForUpdate unused |
| Event capture | 90% | Idempotent, auto dayType/multiplier |
| Exception mgmt | 90% | 7 types, BLOCKER blocks lock |
| Storage fee | 0% | Not implemented — biggest billing item missing |
| RBAC | 40% | AuthGuard only, no PermissionGuard, internal endpoint open |
| Data integrity | 55% | $transaction present but race conditions in generate/lock |
| DTO validation | 90% | All DTOs validated, nested fee lines |
| ERP integration | 0% | Not connected to M8 |
| M1 integration | 90% | NumberSequence + AuthGuard from Foundation |
| **Overall** | **8.0** | Strong business logic, authorization + data integrity gaps |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | PermissionGuard + @Permission on all routes | 2h | Truoc merge |
| 2 | **CRITICAL** | Internal capture endpoint auth (API key or service auth) | 1h | Truoc merge |
| 3 | **HIGH** | Move event read inside $transaction in generate() | 30m | Sprint 5 |
| 4 | **HIGH** | Use lockForUpdate in review/approve/lock | 1h | Sprint 5 |
| 5 | **HIGH** | Move blocker check inside $transaction in lock() | 30m | Sprint 5 |
| 6 | **HIGH** | Storage snapshot service (daily_storage_snapshot) | 1 day | Sprint 5 |
| 7 | **HIGH** | ERP push integration (DN LOCKED → M8 ErpPush) | 2h | Sprint 6 |
| 8 | **MEDIUM** | Regenerate DN endpoint | 2h | Sprint 6 |
| 9 | **MEDIUM** | bulkUpsert + activate in $transaction | 1h | Sprint 6 |
| 10 | **MEDIUM** | CUST_VIEWER ownerId scope enforcement | 1h | Before production |

**Estimated total: ~2.5 days for CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL PASS (8.0/10).** M10 là module có business logic tốt nhất trong project:

**Điểm mạnh:**
- **Rate resolution scoring** — multi-factor matching algorithm sạch, extensible
- **Charge calculation** — decimal.js + minimum charge + full trace cho audit
- **DN state machine** — correct lifecycle, blocker check before lock, immutability guard
- **Exception management** — 7 types, BLOCKER severity, resolve/ignore/requeue
- **M1 integration** — NumberSequence cho contract + DN, AuthGuard from Foundation
- **Idempotency** — externalId consistent trên 3 entity types
- **DTO validation** — thorough, nested fee lines with `@ValidateNested`

**Gaps chính:**
1. **RBAC = 40%** — AuthGuard only, no PermissionGuard. Billing operations cần role separation (BILLING_OFC vs WH_MANAGER).
2. **Storage snapshot = 0%** — Phí lưu kho là fee lớn nhất nhưng chưa có daily snapshot service.
3. **Data integrity gaps** — lockForUpdate exists but unused. Race conditions in generate(), lock().
4. **ERP push = 0%** — DN locked nhưng không push to ERP.

**So với modules khác:** M10 business logic tốt hơn mọi module khác (rate scoring, charge trace). Architecture ngang M9 (NestJS, clean domain). Nhưng data integrity kém hơn M9/M7 (lockForUpdate unused, race conditions). RBAC tốt hơn M8/M9 ban đầu (có AuthGuard) nhưng thiếu PermissionGuard.
