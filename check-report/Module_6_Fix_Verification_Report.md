# Module 6 — Inventory Control: Fix Verification Report

**Previous review:** `Module_6_Code_Review_Report.md` (Score 7.5 CONDITIONAL PASS)
**New Score:** 8.5 / 10
**Verdict:** CONDITIONAL PASS — CR-1 RBAC FIXED, 4/6 HIGH FIXED. decimal.js van chua dung.

---

## Issue Status

| ID | Issue | Severity | Previous | Current | Evidence |
|----|-------|----------|----------|---------|----------|
| CR-1 | Zero RBAC — 46 routes | CRITICAL | FAIL | **FIXED** | `inventory-control.routes.js`: ALL 46 routes co `authPreHandler` + `permissionPreHandler`. 36 permission codes defined. |
| HI-1 | Cycle count post khong goi M3 | HIGH | FAIL | **FIXED** | `cycle-count.service.js` L352: `await postingAdapter.postAdjustment(...)` called BEFORE marking POSTED. |
| HI-2 | Status change reverse khong goi M3 | HIGH | FAIL | **FIXED** | `status-change.service.js` L193: `await postingAdapter.postStatusChange(reversedStatusChange, ...)`. Swapped fromStatus/toStatus + `-REV` externalId. |
| HI-3 | Idempotency returns 409 | HIGH | FAIL | **FIXED** | All 6 services return `{ ...existing, idempotentReplay: true }` thay vi throw ConflictError. |
| HI-4 | No lockForUpdate | HIGH | FAIL | **FIXED** | `SELECT ... FOR UPDATE` in move execute (L123), adjustment post (L138), transfer ship (L113), transfer receive (L183). |
| HI-5 | No M1 AuditLog | HIGH | FAIL | **PARTIAL** | `ic-audit-log.adapter.js` created (170 lines, 6 entity-specific functions). Imported in all 6 services. Nhung actual invocation tai moi state change chua du — infrastructure ready, wiring partial. |
| HI-6 | decimal.js not consistent | HIGH | FAIL | **NOT FIXED** | Zero `decimal.js` imports in toan module. `parseFloat()` + native arithmetic dung khap noi: validation (L104-109), variance calc (L199-203), qty checks. |

**Fixed: 5/7 | Partial: 1/7 | Not Fixed: 1/7**

---

## Detail: What Changed

### FIXED — RBAC on All 46 Routes (CR-1)

`inventory-control.routes.js` + `middleware/auth.middleware.js`:

**Auth middleware:**
- `authPreHandler()` — JWT Bearer token validation, resolves user permissions + warehouse/owner scopes
- `permissionPreHandler(code)` — checks permission code against `req.user.permissionCodes`
- Fastify-compatible preHandler hooks

**36 permission codes covering all 7 controllers:**

| Resource | Actions |
|----------|---------|
| IC.ONHAND | READ |
| IC.MOVE_ORDER | CREATE, READ, EXECUTE, CANCEL |
| IC.TRANSFER_ORDER | CREATE, READ, SHIP, RECEIVE, CANCEL, CLOSE |
| IC.STATUS_CHANGE | CREATE, READ, EXECUTE, REVERSE |
| IC.CYCLE_COUNT | PLAN_CREATE, PLAN_READ, CREATE, READ, COUNT, POST, CANCEL |
| IC.ADJUSTMENT | CREATE, READ, SUBMIT, APPROVE, REJECT, POST |
| IC.RECONCILIATION | RUN, READ, REVIEW, RESOLVE |

**Verification:** Moi route co dang:
```javascript
fastify.get('/on-hand', { preHandler: [auth, permissionPreHandler(PERMISSION_CODES.ONHAND_READ)] }, controller.getOnHand);
```

### FIXED — Cycle Count Post → M3 (HI-1)

`cycle-count.service.js` `postCycleCount()` L286-384:

```javascript
// L331-348: Create adjustment from variance lines
const adjustment = await adjustmentRepo.createAdjustment({ ... });

// L351: Fetch full adjustment with lines
const adjustmentWithLines = await adjustmentRepo.findAdjustmentById(adjustment.id, tx);

// L352: POST to M3 ← KEY FIX
await postingAdapter.postAdjustment(adjustmentWithLines, adjustmentWithLines.lines, correlationId, tx);

// L355-359: Update adjustment status to POSTED (only after M3 succeeds)
await adjustmentRepo.updateAdjustment(adjustment.id, { status: 'POSTED' }, tx);
```

**Sequence correct:** Create adjustment → post to M3 → mark POSTED. M3 fail = transaction rollback.

### FIXED — Status Change Reverse → M3 (HI-2)

`status-change.service.js` `reverseStatusChange()` L169-227:

```javascript
// L183-189: Create reversed object
const reversedStatusChange = {
  ...statusChange,
  fromStatus: statusChange.toStatus,    // Swapped
  toStatus: statusChange.fromStatus,    // Swapped
  externalId: `${statusChange.externalId}-REV`,
};

// L193: POST reversal to M3
const postingResult = await postingAdapter.postStatusChange(reversedStatusChange, correlationId, tx);

// L195-203: Mark REVERSED only after M3 succeeds
await statusChangeRepo.update(id, { status: 'REVERSED', reversedTransGroupId: postingResult.transGroupId }, tx);
```

**Error handling:** L212-225 catches posting failures, logs to status history.

### FIXED — Idempotency Returns Existing (HI-3)

All 6 services follow same pattern:
```javascript
const existing = await repo.findByExternalId(data.externalId);
if (existing) {
  return { ...existing, idempotentReplay: true };
}
```

Verified in: move-order (L24-27), transfer-order (L24-27), status-change (L24-27), cycle-count (L43-46), adjustment (L24-27), reconciliation (L20-23).

Controller returns HTTP 200 for replays, 201 for new creates.

### FIXED — lockForUpdate in Execute/Post (HI-4)

All high-concurrency operations now use pessimistic locking:

| Operation | File | Line | Lock Pattern |
|-----------|------|------|-------------|
| Move execute | move-order.service.js | L123 | `lockMoveOrderForUpdate(id, tx)` |
| Adjustment post | adjustment.service.js | L138 | `lockAdjustmentForUpdate(id, tx)` |
| Transfer ship | transfer-order.service.js | L113 | `lockTransferOrderForUpdate(id, tx)` |
| Transfer receive | transfer-order.service.js | L183 | `lockTransferOrderForUpdate(id, tx)` |

Repository implementation: `SELECT * FROM ic_[table] WHERE id = ${id}::uuid FOR UPDATE`

---

## Detail: What's Still Open

### HI-5: AuditLog — Infrastructure Ready, Wiring Partial

`ic-audit-log.adapter.js` (170 lines):
- `logMoveOrderAction()`, `logTransferOrderAction()`, `logStatusChangeAction()`, `logCycleCountAction()`, `logAdjustmentAction()`, `logReconciliationAction()`
- Delegates to M1 `LogService.createAuditLog()`
- Imported in all 6 services

**Gap:** Adapter imported nhung actual `auditLogAdapter.logXxxAction()` calls chua thay consistently tai moi state transition. Infrastructure co nhung coverage chua 100%.

### HI-6: decimal.js NOT USED — parseFloat Everywhere

Zero `decimal.js` / `Decimal` imports in toan module. Examples:

```javascript
// ic-validation.service.js L104-109
const available = parseFloat(onHand.availableQty);
const requested = parseFloat(requestedQty);
if (available < requested) { ... }

// ic.policy.js L199-203
const system = parseFloat(systemQty) || 0;
const counted = parseFloat(countedQty) || 0;
const varianceQty = counted - system;
const variancePct = system !== 0 ? (varianceQty / system) * 100 : ...

// cycle-count.service.js L297
parseFloat(l.varianceQty || 0) !== 0

// adjustment.service.js L39
Math.abs(parseFloat(l.qtyDelta))
```

**Impact:** Floating-point precision errors co the xay ra o boundary cases. M3/M4 dung `decimal.js` — M6 la module duy nhat khong dung.

**Fix:** Replace all `parseFloat` qty comparisons:
```javascript
const { Decimal } = require('decimal.js');
const available = new Decimal(onHand.availableQty || 0);
const requested = new Decimal(requestedQty || 0);
if (available.lt(requested)) { ... }
```

---

## MEDIUM Issues Update

| # | Issue | Previous | Current | Note |
|---|-------|----------|---------|------|
| MD-1 | ReconciliationReview | PARTIAL | **PARTIAL** | `runReconciliation()` calls M3, creates review records. Auto-create tu M3 results functional. |
| MD-2 | Transfer in-transit tracking | BASIC | **FUNCTIONAL** | IN_TRANSIT status, SLA hours, aging query. |
| MD-3 | Cycle count plan scheduling | NOT IMPL | **NOT IMPL** | Plan CRUD exists, no auto-generate from plan. |
| MD-4 | rowVersion enforcement | PARTIAL | **PARTIAL** | `updateWithVersionCheck()` exists in repos nhung not used by services. |
| MD-5 | Exception severity | BASIC | **IMPROVED** | Reconciliation has LOW/MEDIUM/HIGH/CRITICAL classification. |
| MD-6 | Dashboard endpoints | NOT IMPL | **NOT IMPL** | List endpoints only, no aggregation. |

---

## Score Upgrade Justification

| Category | Previous | Current | Note |
|----------|----------|---------|------|
| Architecture | 90% | 90% | Unchanged — clean separation |
| M3 integration | 75% | **95%** | Cycle count + status reverse posting FIXED |
| State machines | 90% | 90% | Unchanged |
| Validation | 85% | 85% | Unchanged |
| **RBAC** | **0%** | **90%** | **36 permissions on 46 routes** |
| **Data integrity** | **60%** | **85%** | **lockForUpdate + idempotency fixed** |
| Audit trail | 70% | 80% | AuditLog adapter ready, partial wiring |
| Precision | 60% | 60% | decimal.js van chua dung |
| **Overall** | **7.5** | **8.5** | +1.0 — major improvements |

---

## Remaining Work — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **HIGH** | Replace parseFloat voi decimal.js toan module | 2h | Sprint 5 |
| 2 | **HIGH** | Complete AuditLog calls tai moi state transition | 1h | Sprint 5 |
| 3 | MEDIUM | Enforce rowVersion optimistic locking | 1h | Sprint 6 |
| 4 | MEDIUM | Cycle count plan scheduling | 2h | Sprint 6 |
| 5 | MEDIUM | Dashboard aggregation endpoints | 2h | Sprint 6 |

**Estimated total: ~1 day for HIGH, ~1 day for MEDIUM.**

---

## Verdict

**CONDITIONAL PASS (8.5/10).** Major improvements tu 7.5 → 8.5:

- **CR-1 RBAC: FIXED** — 36 permission codes on 46 routes. Consistent voi M3/M4 pattern.
- **HI-1 + HI-2: M3 posting chain complete** — Cycle count → adjustment → M3 posting. Status reverse → M3 posting. Transaction integrity maintained.
- **HI-3 + HI-4: Idempotency + locking FIXED** — Professional patterns matching M3/M7 standard.

**Gap con lai:**
1. **decimal.js** — M6 la module duy nhat dung `parseFloat` cho qty calculations. Risk thap nhung inconsistent voi M3/M4.
2. **AuditLog wiring** — adapter ready, coverage partial.

M6 da san sang merge voi dieu kien fix decimal.js. Score co the len 9.0 sau 1 ngay fix.
