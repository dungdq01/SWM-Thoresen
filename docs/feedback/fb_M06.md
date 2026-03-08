# Module 6 — Inventory Control: Code Review Report

**Code path:** `backend/src/modules/inventory-control/` (31 JS files)
**Spec file:** `docs/spec/module_6_inventory_control_spec.md`
**Prisma models:** 12 M6 models, 8 M6 enums
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 7.5 / 10
**Verdict:** CONDITIONAL PASS — Clean architecture, good M3 integration pattern, nhung no RBAC va some posting gaps.

---

## Tech Stack — Consistent voi M3/M4

| Layer | Choice | Note |
|-------|--------|------|
| Language | **JavaScript (CommonJS)** | Same as M3/M4, khac M1/M2/M5 (TypeScript) |
| Framework | **Express Router** | Same as M3/M4 |
| Validation | **Joi** | Consistent voi M3/M4 |
| ORM | Prisma | Consistent across all modules |
| Precision | decimal.js | Good — same as M3/M4 |
| Auth | **NONE** | Zero middleware on all 46 routes |

**Architecture note:** M6 follows M3/M4 paradigm (JS/Express/Joi). 2 paradigms van ton tai trong backend: M1/M2/M5 = TS/NestJS, M3/M4/M6 = JS/Express.

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Controllers | 7 | move-order, transfer-order, status-change, cycle-count, adjustment, reconciliation, ic-query |
| Services | 8+ | move-order, transfer-order, status-change, cycle-count, adjustment, ic-posting-adapter, ic-state-machine, ic-validation |
| Repositories | 7 | move-order, transfer-order, status-change, cycle-count, adjustment, reconciliation-review, ic-status-history |
| Routes | 7 | 46 total Express routes |
| Joi Schemas | 7 | Per document type |
| Prisma Models | 12 | IcMoveOrder/Line, IcTransferOrder/Line, IcInventoryStatusChange, IcCycleCountPlan/Header/Line, IcAdjustmentHeader/Line, IcReconciliationReview, IcDocumentStatusHistory, IcExceptionLog |

### 6 Document Types
1. **MoveOrder** — Move stock between locations within same warehouse
2. **TransferOrder** — Transfer stock between warehouses (2-leg: OUT + IN)
3. **StatusChange** — Change inventory status code (e.g., AVAILABLE → HOLD)
4. **CycleCount** — Plan → Count → Variance → Adjust
5. **Adjustment** — Direct qty adjustment (gain/loss) with approval
6. **ReconciliationReview** — Review discrepancies from M3 reconciliation

---

## Review Gate Checklist (10 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | 6 document types implemented? | **PASS** | Move, Transfer, StatusChange, CycleCount, Adjustment, Reconciliation |
| 2 | State machine per document type? | **PASS** | Centralized `ic-state-machine.service.js` with per-type transition maps |
| 3 | M3 PostingEngine integration? | **PASS** | `ic-posting-adapter.service.js` — single integration point, 5 posting types |
| 4 | Move: same warehouse validation? | **PASS** | Validates fromLocation ≠ toLocation, same warehouse |
| 5 | Transfer: 2-leg posting? | **PASS** | TRANSFER_OUT (negative from source) + TRANSFER_IN (positive to dest) |
| 6 | Cycle count: variance → adjustment? | **PARTIAL** | Creates IcAdjustmentHeader nhung KHONG call adjustment posting flow to M3 |
| 7 | Adjustment: approval workflow? | **PASS** | PENDING_APPROVAL → APPROVED/REJECTED → POSTED states |
| 8 | RBAC enforce? | **FAIL** | Zero auth middleware on all 46 routes |
| 9 | Idempotency? | **PARTIAL** | externalId unique check nhung returns 409 instead of existing record |
| 10 | Audit trail? | **PASS** | IcDocumentStatusHistory + IcExceptionLog per document |

**Result: 6/10 PASS, 2/10 PARTIAL, 2/10 FAIL**

---

## Diem Manh — What's Done Well

### 1. M3 PostingEngine Integration — EXCELLENT PATTERN
`ic-posting-adapter.service.js` — Single adapter encapsulating all M3 posting calls:
- `postMove(moveOrder)` — MOVE type, fromDim → toDim
- `postTransferOut(transferOrder)` — TRANSFER_OUT, negative qty from source
- `postTransferIn(transferOrder)` — TRANSFER_IN, positive qty to dest
- `postStatusChange(statusChange)` — STATUS_CHANGE, fromStatus → toStatus
- `postAdjustment(adjustment)` — COUNT_GAIN or COUNT_LOSS based on qty sign

Each method constructs proper PostingEngine payload with:
- `externalId` for idempotency
- `correlationId` for tracing
- `refType` + `refId` + `refLineId` for document linkage
- `dimFrom` / `dimTo` with proper InventDim fields
- `qty` as string via decimal.js

**Day la cach M4 va M5 nen integrate voi M3.** Clean, centralized, traceable.

### 2. Centralized State Machine — CLEAN
`ic-state-machine.service.js`:
- Per-type transition maps (moveOrderTransitions, transferOrderTransitions, etc.)
- `validateTransition(docType, fromStatus, toStatus)` — returns allowed/forbidden
- `recordTransition()` — writes to IcDocumentStatusHistory
- All services delegate state management to this single service

### 3. Validation Service — COMPREHENSIVE
`ic-validation.service.js`:
- Master data validation (item exists + active, location exists + active, warehouse exists)
- Stock availability check (OnHand query for sufficient qty)
- Location type validation (storage vs receiving vs shipping)
- Owner permission validation
- Used consistently across all 6 document services

### 4. Transfer Order 2-Leg — CORRECT
- TRANSFER_OUT: negative qty from source warehouse/location
- TRANSFER_IN: positive qty to destination warehouse/location
- Both posted atomically in $transaction
- In-transit state between legs (SHIPPED → RECEIVED)
- Proper InventDim handling for cross-warehouse moves

### 5. Adjustment Approval Workflow — COMPLETE
- DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED/REJECTED
- APPROVED → POSTED (after M3 posting)
- `approvedBy` / `rejectedBy` from request context
- Threshold-based auto-approval option (small adjustments)
- Reason code required for all adjustments

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: Zero RBAC — All 46 Routes Unprotected [CRITICAL]

**Code:** 7 controllers, 46 routes, ZERO `authMiddleware`, ZERO `permissionMiddleware`.
**Impact:** Bat ky ai cung co the move stock, adjust inventory, approve cycle count variances.
**Spec ref:** WH_KEEPER execute moves/counts, WH_MANAGER approve adjustments, WH_ADMIN configure count plans.

**Fix:** Add to every route file:
```javascript
const { authMiddleware, permissionMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', permissionMiddleware('IC.MOVE_ORDER.CREATE'), controller.create);
router.post('/:id/execute', permissionMiddleware('IC.MOVE_ORDER.EXECUTE'), controller.execute);
```

**Permission codes needed:**
| Resource | Actions |
|----------|---------|
| IC.MOVE_ORDER | CREATE, READ, EXECUTE, CANCEL |
| IC.TRANSFER_ORDER | CREATE, READ, SHIP, RECEIVE, CANCEL |
| IC.STATUS_CHANGE | CREATE, READ, EXECUTE, REVERSE |
| IC.CYCLE_COUNT | PLAN, CREATE, READ, COUNT, POST, CANCEL |
| IC.ADJUSTMENT | CREATE, READ, SUBMIT, APPROVE, REJECT, POST |
| IC.RECONCILIATION | READ, REVIEW, RESOLVE |

---

## HIGH Issues

### HI-1: Cycle Count Post Does NOT Actually Post to M3 [HIGH]

**Code:** `cycle-count.service.js` `postCycleCount()`:
- Calculates variance per line (counted_qty - system_qty)
- Creates `IcAdjustmentHeader` + `IcAdjustmentLine` records for variances
- Sets cycle count status to POSTED
- **BUT does NOT call `ic-posting-adapter.postAdjustment()`**

**Impact:** Variance is recorded as adjustment document nhung inventory khong thay doi. OnHand van giu gia tri cu. Cycle count tro thanh "document management" — no actual inventory correction.

**Fix:** After creating adjustment records, call posting adapter:
```javascript
// After creating IcAdjustmentHeader + Lines:
for (const line of adjustmentLines) {
  await this.postingAdapter.postAdjustment({
    adjustmentId: adjustment.id,
    lineId: line.id,
    itemId: line.itemId,
    qty: line.varianceQty, // positive = gain, negative = loss
    warehouseCode, locationCode, ownerCode, statusCode,
    correlationId: context.correlationId,
    userId: context.userId,
  });
}
```

**Alternative:** If adjustment requires approval before posting, the posting should happen at adjustment APPROVED → POSTED transition, not at cycle count post. Verify business rule.

### HI-2: Status Change Reverse Does NOT Call M3 [HIGH]

**Code:** `status-change.service.js` `reverseStatusChange()`:
- Creates a new StatusChange document with swapped fromStatus/toStatus
- Sets original document status to REVERSED
- **BUT does NOT call `ic-posting-adapter.postStatusChange()` for the reversal**

**Impact:** Original status change posted to M3 (InventTrans created), nhung reversal only creates M6 document — no reversal InventTrans. OnHand inventory status dimension incorrect.

**Fix:** Call posting adapter for the reverse document:
```javascript
await this.postingAdapter.postStatusChange({
  ...reverseDoc,
  // fromStatus and toStatus already swapped
});
```

### HI-3: Idempotency Returns 409 Instead of Existing Record [HIGH]

**Code:** All services check `externalId` uniqueness nhung:
```javascript
const existing = await this.repo.findByExternalId(dto.externalId);
if (existing) {
  throw new ConflictError('Document with this externalId already exists');
}
```

**Spec pattern (M3/M4):** Should return existing record with `{ ...existing, idempotentReplay: true }` and HTTP 200.

**Impact:** Client retry after network timeout gets 409 error instead of successful response. Breaks idempotency contract.

**Fix:**
```javascript
const existing = await this.repo.findByExternalId(dto.externalId);
if (existing) {
  return { ...existing, idempotentReplay: true }; // Controller returns 200
}
// ... create new
return { ...created, idempotentReplay: false }; // Controller returns 201
```

### HI-4: No lockForUpdate in Execute/Post Operations [HIGH]

**Code:** Move/Transfer/StatusChange execute operations read document, validate state, then update — all WITHOUT `SELECT FOR UPDATE`.
**Impact:** Concurrent execute requests on same document co the race condition.
**Fix:** Add `lockForUpdate()` at start of every $transaction before state validation.

### HI-5: No M1 AuditLog Integration [HIGH]

**Code:** Zero references to M1 LogService. Only domain-specific IcDocumentStatusHistory and IcExceptionLog.
**Impact:** M1 AuditLog table thieu inventory control events. Cross-module audit trail incomplete.
**Fix:** Inject LogService adapter (like M3's `audit-log.adapter.js`) and call after state transitions.

### HI-6: decimal.js Not Used Consistently [HIGH]

**Code:** Most qty calculations use decimal.js nhung some validation checks use native JS arithmetic:
- Stock availability check: `if (onHand.physicalQty >= requiredQty)` — comparing Decimal with number
- Variance calc in cycle count: some lines use `parseFloat()` before comparison

**Impact:** Floating-point precision errors possible on boundary cases.
**Fix:** Ensure ALL qty comparisons use `new Decimal(a).gte(new Decimal(b))` pattern.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | ReconciliationReview incomplete | reconciliation.service.js | Review + resolve implemented nhung no auto-create from M3 reconciliation results |
| MD-2 | Transfer order in-transit tracking basic | transfer-order.service.js | SHIPPED state exists nhung no in-transit location tracking |
| MD-3 | Cycle count plan scheduling not implemented | cycle-count.service.js | Plan CRUD exists nhung no auto-generate counts from plan |
| MD-4 | rowVersion incremented but never checked | repositories | Same pattern as M4/M5 — no WHERE guard |
| MD-5 | Exception severity not classified | ic-exception-log | ExceptionLog captures events nhung no severity (CRITICAL/HIGH/MEDIUM) classification |
| MD-6 | No dashboard/summary endpoints | ic-query.controller.js | Query controller basic — no aggregated views |

---

## Cross-Check: Code vs Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| IC-BR-001 | Move within same warehouse only | **PASS** — validated |
| IC-BR-002 | Transfer between warehouses, 2-leg posting | **PASS** — TRANSFER_OUT + TRANSFER_IN |
| IC-BR-003 | Status change = dimension change only | **PASS** — only status dim changes |
| IC-BR-004 | Cycle count plan → header → lines | **PASS** — 3-level hierarchy |
| IC-BR-005 | Variance = counted - system, auto-adjust | **PARTIAL** — variance calc ok, adjustment created, NOT posted to M3 |
| IC-BR-006 | Adjustment requires approval | **PASS** — approval workflow complete |
| IC-BR-007 | All operations need reason code | **PASS** — required in Joi schemas |
| IC-BR-008 | RBAC per operation type | **FAIL** — zero auth |
| IC-BR-009 | Every operation = InventTrans | **PARTIAL** — move/transfer/status change yes, cycle count adjustment no |
| IC-BR-010 | Reversal for status change | **PARTIAL** — creates document, no M3 posting |

**5/10 PASS, 3/10 PARTIAL, 2/10 FAIL**

---

## Cross-Check: Code vs Document Types

| Document | CRUD | State Machine | Validation | M3 Posting | Status |
|----------|------|---------------|------------|------------|--------|
| MoveOrder | Yes | DRAFT→CONFIRMED→EXECUTED | Yes | Yes (MOVE) | **PASS** |
| TransferOrder | Yes | DRAFT→CONFIRMED→SHIPPED→RECEIVED | Yes | Yes (OUT+IN) | **PASS** |
| StatusChange | Yes | DRAFT→EXECUTED | Yes | Yes | **PASS** (reverse gap) |
| CycleCount | Yes | PLANNED→IN_PROGRESS→COUNTED→POSTED | Yes | **NO** (creates adj, no M3 call) | **PARTIAL** |
| Adjustment | Yes | DRAFT→SUBMITTED→APPROVED→POSTED | Yes | Yes (GAIN/LOSS) | **PASS** |
| Reconciliation | Yes | PENDING→REVIEWED→RESOLVED | Partial | N/A | **PARTIAL** |

**4/6 PASS, 2/6 PARTIAL**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Architecture | 90% | Clean separation, centralized state machine + validation + posting adapter |
| M3 integration | 75% | Posting adapter excellent, cycle count gap, status reverse gap |
| State machines | 90% | All 6 document types have proper state flows |
| Validation | 85% | Comprehensive Joi schemas + business validation service |
| RBAC | 0% | Zero auth on 46 routes |
| Data integrity | 60% | No lockForUpdate, decimal.js inconsistent |
| Audit trail | 70% | Domain-specific history, no M1 AuditLog |
| Completeness | 80% | 6 document types fully implemented, minor gaps |
| **Overall** | **7.5** | Good architecture, needs RBAC + posting gaps fixed |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | RBAC on all 46 routes | 3h | Truoc merge |
| 2 | **HIGH** | Cycle count post → M3 adjustment posting | 2h | Sprint 4 |
| 3 | **HIGH** | Status change reverse → M3 posting | 1h | Sprint 4 |
| 4 | **HIGH** | Idempotency return existing (not 409) | 1h | Sprint 4 |
| 5 | **HIGH** | lockForUpdate in execute/post operations | 1h | Sprint 4 |
| 6 | **HIGH** | M1 AuditLog integration | 2h | Sprint 4 |
| 7 | **HIGH** | decimal.js consistency | 1h | Sprint 4 |
| 8 | **MEDIUM** | Reconciliation auto-create from M3 | 2h | Sprint 5 |

**Estimated total: ~2 days for CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL PASS (7.5/10).** M6 co architecture tot nhat trong nhom JS modules (M3/M4/M6):
- **ic-posting-adapter** la exemplar pattern cho M3 integration — M4 va M5 nen follow
- Centralized state machine + validation service = clean, maintainable
- 6 document types all implemented with proper state flows

Gap chinh:
1. **RBAC = 0** — same pattern as M5, must fix truoc merge
2. **Cycle count → M3 posting chain broken** — variance recorded nhung inventory khong doi
3. **Status change reverse** — document created nhung no M3 reversal posting

So voi cac module khac: M6 architecture tot hon M4 (cleaner separation) va tot hon M5 (real M3 integration vs MOCK). RBAC la blocking issue duy nhat cho merge.
