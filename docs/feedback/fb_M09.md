# Module 9 — VAS/Bagging: Code Review Report

**Code path:** `backend/src/modules/vas/` (33 TS files)
**Spec file:** `docs/spec/module_9_vas_bagging_spec.md` (1045 lines, v1.2)
**Prisma models:** 5 M9 models (VasWorkOrder, VasSession, VasStateHistory, VasExceptionLog, VasOutbox)
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 7.5 / 10
**Verdict:** CONDITIONAL PASS — Architecture excellent, business logic solid, dual locking implemented. Nhung M3 posting = STUB, zero RBAC, va no packaging check during session.

---

## Tech Stack — NestJS (same as M1/M2/M5/M8)

| Layer | Choice | Note |
|-------|--------|------|
| Language | **TypeScript** | Same paradigm as M1/M2/M5/M8 |
| Framework | **NestJS** | Controllers + Injectable services |
| Validation | **class-validator** | All DTOs with decorators |
| ORM | Prisma | Consistent across all modules |
| Precision | **Prisma.Decimal** | All weight/qty fields (18,3) |
| Auth | **NONE** | Zero @UseGuards, hardcoded actor |

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Controllers | 3 | vas-wo-command (103L), vas-wo-query (54L), vas-session (33L) |
| Services | 9 | create-vas-wo (124L), update-vas-wo (78L), confirm-vas-wo (132L), complete-vas-wo (145L), cancel-vas-wo (67L), add-vas-session (104L), vas-state-machine (82L), vas-validation (172L), vas-query (87L) |
| Repositories | 5 | vas-work-order (234L), vas-session (83L), vas-state-history (50L), vas-exception-log (57L), vas-outbox (107L) |
| Facades | 2 | vas-inventory (151L), vas-billing (91L) |
| Domain | 2 | vas.enums (51L, 6 enums), vas.errors (101L, 8 error classes) |
| DTOs | 7 | create (81L), update (49L), confirm (10L), complete (54L), cancel (21L), add-session (75L), query (88L) |
| Module | 1 | vas.module.ts (60L) |

### VAS Work Order Lifecycle
```
DRAFT → CONFIRMED (stock check + reserve) → IN_PROGRESS (first session) → COMPLETED (post + billing)
  ↓         ↓                                   ↓
CANCELLED  CANCELLED                          CANCELLED (release reservation)
```

---

## Review Gate Checklist (12 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | WO CRUD with state machine? | **PASS** | DRAFT→CONFIRMED→IN_PROGRESS→COMPLETED/CANCELLED. Terminal states locked. |
| 2 | Bulk + packaging stock check at CONFIRM? | **PASS** | `getBulkAvailable()` + `getPackagingAvailable()` — compares with planned qty |
| 3 | Stock reservation at CONFIRM? | **PARTIAL** | `reserveVasBulk()` is STUB — logs only, no M3 Hold creation |
| 4 | Session tracking (shift, hours, productivity)? | **PASS** | VasSession with shiftCode (MORNING/AFTERNOON/NIGHT), workHours, isOvertime, productivityRate |
| 5 | Auto-transition CONFIRMED→IN_PROGRESS on first session? | **PASS** | `add-vas-session.service.ts` detects first session and transitions |
| 6 | Material balance validation at COMPLETE? | **PASS** | consumed ≥ output enforced. Process loss = consumed - output. |
| 7 | Yield variance reason when loss > 2%? | **PASS** | `requiresVarianceReason()` checks processLoss/consumed > 0.02 |
| 8 | M3 posting at COMPLETED? | **FAIL** | `postVasCompletion()` returns STUB IDs — no real InventTrans |
| 9 | Billing event via outbox? | **PASS** | `BAGGING_FEE_CAPTURE` event with dedup via eventKey. Includes qtyKg, qtyMt, bagCount, overtime. |
| 10 | RBAC enforce? | **FAIL** | Zero @UseGuards on all 3 controllers. Hardcoded actor. |
| 11 | Idempotency? | **PASS** | externalId on WO + Session. Returns existing on duplicate. |
| 12 | Audit trail? | **PASS** | VasStateHistory (immutable append) + VasExceptionLog (with resolve) |

**Result: 8/12 PASS, 1/12 PARTIAL, 3/12 FAIL**

---

## Diem Manh — What's Done Well

### 1. Dual Locking — BEST PRACTICE

**Pessimistic locking** (`vas-work-order.repository.ts` L56-64):
```typescript
async findByIdForUpdate(id: string, tx: Prisma.TransactionClient) {
  const result = await tx.$queryRaw<VasWorkOrder[]>`
    SELECT * FROM vas_work_order WHERE id = ${id}::uuid FOR UPDATE
  `;
  return result[0] || null;
}
```

**Optimistic locking** (`vas-work-order.repository.ts` L78-93):
```typescript
async updateWithOptimisticLock(id, expectedRowVersion, data, tx) {
  const result = await client.vasWorkOrder.updateMany({
    where: { id, rowVersion: expectedRowVersion },
    data: { ...data, rowVersion: { increment: 1 } },
  });
  if (result.count === 0) throw new Error('OPTIMISTIC_LOCK_FAILED');
}
```

**Used correctly:** Pessimistic in all state transitions (confirm, complete, cancel). Optimistic in update (DRAFT only). rowVersion incremented in all mark* methods.

### 2. $transaction on ALL Write Operations

Every command service wraps in `prisma.$transaction()`:
- `create-vas-wo.service.ts` L42
- `confirm-vas-wo.service.ts` L35
- `complete-vas-wo.service.ts` L39
- `cancel-vas-wo.service.ts` L28
- `add-vas-session.service.ts` L36

Repositories accept optional `Prisma.TransactionClient` — proper tx propagation.

### 3. Prisma.Decimal Precision — CONSISTENT

All weight fields use `Prisma.Decimal`:
- `getBulkAvailable()`: `.plus()`, `.minus()`, `.lessThan()`, `.greaterThan()`
- `postVasCompletion()`: receives `Prisma.Decimal`
- DTOs: `maxDecimalPlaces: 3` for kg quantities
- Billing facade: `.dividedBy(1000)` for MT conversion, `.toNumber()` for JSON

### 4. Billing Facade — CLEAN OUTBOX PATTERN

`vas-billing.facade.ts`:
- Dedup via `eventKey: BAGGING_FEE:${wo_number}` — prevents double billing
- Complete payload: qtyKg, qtyMt (kg/1000), bagCount, packagingOwnership, overtime sessions
- Runs inside same $transaction as completion — atomic
- Outbox repo: exponential backoff retry (2^n × 1000ms, cap 1h, max 10 → DEAD)

### 5. Exception Logging — WELL STRUCTURED

`VasExceptionLog` records business exceptions with:
- `exceptionCode` (13 defined codes)
- `severity` (ERROR level for stock shortages)
- `payloadJson` with context (available vs required quantities)
- `resolve()` method for manual resolution
- Logged at CONFIRM when stock insufficient

### 6. State Machine — CORRECT

`vas-state-machine.service.ts`:
- Transition table: explicit from→to mappings
- Guard methods: `assertCanConfirm()`, `assertCanComplete()`, etc.
- Terminal states: COMPLETED and CANCELLED — no transitions allowed
- Cancel allowed from any non-terminal state

### 7. Validation Service — COMPREHENSIVE

`vas-validation.service.ts` (172 lines):
- Master data: owner, warehouse, bulk item (BULK cargoForm), bagged item (BAGGED_* cargoForm), packaging item (isPackaging), packaging owner
- Material balance: consumed ≥ output
- Yield variance threshold: process_loss/consumed > 2% → requires reason code
- Parallel `Promise.all` for master data validation

### 8. DTO Validation — THOROUGH

All 7 DTOs use class-validator:
- `CreateVasWoDto`: 12 fields with `@IsUUID()`, `@IsNumber()`, `@IsEnum()`, `@IsDateString()`, `@MaxLength()`, `@IsOptional()`
- `CompleteVasWoDto`: `actualConsumedQtyKg`, `actualOutputQtyKg`, `actualBagCount`, `yieldVarianceReasonCode`
- `AddVasSessionDto`: includes shift code (MORNING/AFTERNOON/NIGHT), isOvertime, workHours
- `UpdateVasWoDto`: includes `rowVersion` for optimistic lock
- `QueryVasWoDto`: comprehensive filtering + pagination

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: M3 Posting is STUB — No Real InventTrans [CRITICAL]

**Code:** `vas-inventory.facade.ts` L133-149:
```typescript
async postVasCompletion(command: VasPostingCommand, _tx) {
  this.logger.log(`[STUB] Posting VAS completion for WO ${command.woNumber}`);
  const stubTransIds = [
    `STUB-VAS-C-${Date.now()}`,  // Consume bulk
    `STUB-VAS-P-${Date.now()}`,  // Produce bagged
    `STUB-VAS-K-${Date.now()}`,  // Consume packaging
  ];
  return stubTransIds;
}
```

**Same for reservation (L110-123, L125-131):**
```typescript
async reserveVasBulk(woId, params, _tx) {
  this.logger.log(`[STUB] Reserving bulk for WO ${woId}: ${params.qtyKg}kg`);
}
async releaseVasReservation(woId, _tx) {
  this.logger.log(`[STUB] Releasing VAS reservation for WO ${woId}`);
}
```

**Impact:**
- WO completes nhưng inventory KHÔNG thay đổi
- Bulk stock không giảm, bagged stock không tăng
- Reservation không tạo → over-commit risk
- Billing event fires nhưng inventory basis sai

**Spec requires 3 InventTrans per completion:**
1. **CONSUME**: -actualConsumedQtyKg from bulk source item
2. **PRODUCE**: +actualOutputQtyKg to bagged output item
3. **CONSUME_PACKAGING**: -packagingQtyActual from packaging item

**Fix:** Integrate with M3 PostingEngine:
```typescript
async postVasCompletion(command, tx) {
  const transIds: string[] = [];
  // 1. Consume bulk
  const t1 = await this.postingEngine.post({
    eventCode: 'VAS_CONSUME_BULK',
    refType: 'VAS_WO', refId: command.woId,
    itemId: command.bulkSourceItemId,
    qty: command.actualConsumedQtyKg.negated().toString(),
    ...dims
  }, tx);
  transIds.push(t1.transId);
  // 2. Produce bagged
  // 3. Consume packaging
  return transIds;
}
```

### CR-2: Zero RBAC — All Routes Unprotected [CRITICAL]

**Code:** 3 controllers, ~12 routes, ZERO `@UseGuards()`.

All controllers hardcode actor:
```typescript
const actor = { userId: '00000000-0000-0000-0000-000000000001', role: 'SYSTEM' };
```

**Spec roles:**
| Action | Required Role |
|--------|-------------|
| CREATE WO | WH_MANAGER |
| CONFIRM WO | WH_MANAGER |
| ADD SESSION | WH_KEEPER |
| COMPLETE WO | WH_MANAGER |
| CANCEL WO | WH_MANAGER |
| READ | WH_KEEPER, WH_MANAGER, OPS_SUPER |

**Fix:** Same pattern as M5 — add `@UseGuards(AuthGuard, PermissionGuard)` + `@Permission()` + `@CurrentUser()`.

---

## HIGH Issues

### HI-1: Stock Check Reads OnHand but Reservation is STUB [HIGH]

**Interesting split:** `getBulkAvailable()` (L34-78) and `getPackagingAvailable()` (L80-108) CORRECTLY query OnHand and calculate available = physical - reserved. This code is REAL.

But `reserveVasBulk()` is STUB → confirm passes stock check but doesn't actually reserve. Next WO on same stock may also pass check → over-commit.

**Fix:** Implement reservation via M3 HoldService (same pattern as M5 allocation).

### HI-2: No Packaging Check During Session [HIGH]

**Spec AC-6.4:** Block session if packaging insufficient for cumulative bag count.

**Code:** `add-vas-session.service.ts` tracks `sessionBagCount` per session but does NOT check packaging availability before adding session.

**Impact:** Sessions can continue consuming packaging beyond available stock.

**Fix:** Before creating session, check cumulative bag count vs packaging available.

### HI-3: No M1 AuditLog Integration [HIGH]

Zero references to M1 LogService. Module has VasStateHistory (good for domain audit) but no cross-module audit trail.

### HI-4: No Outbox Consumer [HIGH]

`BAGGING_FEE_CAPTURE` events created in VasOutbox nhưng no scheduled consumer to deliver them to M10 Billing. Same issue as M7 HI-1.

**Outbox infrastructure ready:** `markSent()`, `markFailed()`, exponential backoff, `findPending()` — but no process triggers delivery.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | WO number sequence manual | create-vas-wo.service.ts | VAS-YYYYMMDD-SEQ — potential duplicate in concurrent creation. No M1 NumberSequence integration. |
| MD-2 | Session productivity rate basic | add-vas-session.service.ts | `rate = qtyKg / workHours` — simple formula. No trending or benchmarking. |
| MD-3 | Cancel doesn't reverse completed sessions | cancel-vas-wo.service.ts | Cancel from IN_PROGRESS releases reservation nhưng session data vẫn giữ. Acceptable? |
| MD-4 | Packaging owner validation basic | vas-validation.service.ts | Validates packaging owner exists nhưng no TVL_OWNED vs CLIENT_OWNED business rule enforcement |
| MD-5 | No pagination on sessions query | vas-query.service.ts | `getSessions()` returns all sessions without pagination |

---

## Cross-Check: Code vs Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| VAS-BR-001 | Bulk → Bagged transformation with packaging | **PASS** — 3 item types: bulk source, bagged output, packaging |
| VAS-BR-002 | Material balance: consumed ≥ output, track process loss | **PASS** — validated at COMPLETE with variance threshold |
| VAS-BR-003 | Session-based labor tracking (shift, hours, overtime) | **PASS** — VasSession captures all fields |
| VAS-BR-004 | Packaging ownership: TVL_OWNED or CLIENT_OWNED | **PASS** — enum enforced, stored on WO |
| VAS-BR-005 | Stock check at CONFIRM (bulk + packaging) | **PASS** — queries OnHand, compares available vs planned |
| VAS-BR-006 | Reserve bulk at CONFIRM | **PARTIAL** — code path exists, M3 integration STUB |
| VAS-BR-007 | 3 InventTrans at COMPLETE | **FAIL** — STUB returns fake IDs |
| VAS-BR-008 | Billing event with output qty + bag count | **PASS** — outbox event with all required fields |
| VAS-BR-009 | RBAC per action type | **FAIL** — zero auth |
| VAS-BR-010 | Yield variance > 2% requires reason | **PASS** — validated and enforced |

**6/10 PASS, 1/10 PARTIAL, 3/10 FAIL**

---

## Cross-Check: Code vs Spec Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| AC-1.1 | Create WO with bulk/bagged/packaging items | **PASS** |
| AC-1.2 | Validate master data (items, owner, warehouse) | **PASS** |
| AC-2.1 | Stock check at CONFIRM | **PASS** (check real, reserve stub) |
| AC-2.2 | Exception log on insufficient stock | **PASS** |
| AC-3.1 | First session → IN_PROGRESS | **PASS** |
| AC-3.2 | Session captures shift, hours, overtime | **PASS** |
| AC-3.3 | Productivity rate calculated | **PASS** |
| AC-4.1 | Material balance at COMPLETE | **PASS** |
| AC-4.2 | Yield variance check | **PASS** |
| AC-4.3 | Post 3 InventTrans | **FAIL** — STUB |
| AC-4.4 | Release reservation at COMPLETE | **PARTIAL** — STUB |
| AC-5.1 | Billing event via outbox | **PASS** (no consumer) |
| AC-5.2 | Outbox idempotency | **PASS** |
| AC-6.1 | Cancel with reason code | **PASS** |
| AC-6.2 | Release reservation on cancel | **PARTIAL** — STUB |
| AC-6.3 | Cancel from any non-terminal state | **PASS** |
| AC-6.4 | Block session if packaging insufficient | **FAIL** |
| AC-7.1 | WO query with filtering | **PASS** |
| AC-7.2 | Session + history + exception detail | **PASS** |

**13/19 PASS, 3/19 PARTIAL, 3/19 FAIL**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Architecture | 90% | Clean service per command, facades for cross-module, domain errors |
| State machine | 95% | Correct transitions, terminal states locked |
| Validation | 90% | Master data + material balance + yield variance |
| M3 integration | 10% | Stock check REAL, reservation + posting = STUB |
| M10 billing | 80% | Outbox pattern correct, no consumer |
| RBAC | 0% | Zero auth on all routes |
| Data integrity | 90% | $transaction + dual locking + Prisma.Decimal |
| Idempotency | 90% | externalId on WO + Session |
| Audit trail | 85% | State history + exception log (no M1 AuditLog) |
| DTO validation | 90% | All 7 DTOs with class-validator |
| **Overall** | **7.5** | Good architecture, M3 posting is the blocking gap |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | M3 posting — 3 InventTrans at COMPLETE | 1 day | Truoc merge |
| 2 | **CRITICAL** | M3 reservation at CONFIRM (HoldService) | 4h | Truoc merge |
| 3 | **CRITICAL** | RBAC on all controllers | 2h | Truoc merge |
| 4 | **HIGH** | Packaging check during session add (AC-6.4) | 1h | Sprint 5 |
| 5 | **HIGH** | Outbox consumer for billing events | 2h | Sprint 5 |
| 6 | **HIGH** | M1 AuditLog integration | 2h | Before production |
| 7 | **MEDIUM** | WO number sequence via M1 NumberSequence | 1h | Sprint 6 |

**Estimated total: ~2.5 days for CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL PASS (7.5/10).** M9 có architecture solid — best practices từ M5/M7 được áp dụng tốt:

**Điểm mạnh:**
- **Dual locking** (pessimistic + optimistic) — implementation tốt nhất sau M7
- **$transaction trên ALL writes** — consistent, correct tx propagation
- **Prisma.Decimal** — proper precision cho weight calculations
- **Billing outbox** — clean dedup via eventKey, atomic with completion
- **State machine** — correct, all transitions guarded
- **Validation** — material balance + yield variance + master data
- **DTOs** — all 7 with class-validator decorators

**Gaps chính:**
1. **M3 posting = STUB** — WO hoàn thành nhưng inventory không thay đổi. Day là core function của VAS.
2. **RBAC = 0** — same pattern across all new modules
3. **Packaging check missing** during session — có thể vượt số bao available

**So với modules khác:** M9 data integrity tốt hơn M8 (có $transaction + dual locking). Architecture tương đương M5 nhưng STUB issue giống M5 ban đầu. RBAC = common blocking issue.
