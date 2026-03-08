# Module 3 — Inventory Core Engine: Code Review Report

**Code path:** `backend/src/modules/inventory-core/` (20 JS files)
**Spec file:** `docs/spec/module_3_inventory_core_engine_spec.md`
**Prisma models:** 10 M3 models in `backend/prisma/schema.prisma`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 7.5 / 10
**Verdict:** CONDITIONAL PASS — Core inventory logic cuc ky tot, nhung 2 CRITICAL architecture issues can fix truoc merge.

---

## Tech Stack — KHAC BIET HOAN TOAN VOI M1/M2

| Layer | M3 Choice | M1/M2 Choice | Gap |
|-------|-----------|-------------|-----|
| Language | **JavaScript** | TypeScript | **CRITICAL** — no type safety |
| Framework | **Express Router** | NestJS | No DI container, no decorators |
| Validation | **Joi** | class-validator | Different validation paradigm |
| DI | Manual `new Service(prisma)` | NestJS @Injectable | No dependency injection |
| Auth/RBAC | **NONE** | AuthGuard + PermissionGuard | **CRITICAL** — all routes public |
| Module System | CommonJS require/exports | ES modules / TS imports | Inconsistent |
| ORM | Prisma (same) | Prisma (same) | OK |
| Precision | decimal.js | N/A | Good choice |

---

## Code Scope

| Layer | Files | Components |
|-------|-------|-----------|
| Domain | 3 | types (11 trans types, 5 hold statuses, 5 source apps), rules (9 pure functions), errors (19 error codes) |
| Application | 6 | PostingEngine, ReversalEngine, OnHand, InventDim, Hold, TransactionQuery |
| Infrastructure | 6 | InventDim, InventTrans, OnHand, Hold, ReversalLink, EventMapping repositories |
| Controller | 1 | 11 endpoints |
| Schema/Validation | 1 | 8 Joi schemas |
| Routes | 1 | 11 Express routes |
| Prisma Models | 10 | InventDim, InventTrans, OnHand, InventoryHold, ReversalLink, EventMapping, DailyStorageSnapshot, ReconciliationRun, ReconciliationResult, SnapshotRun |

---

## Review Gate Checklist (10 items — per Spec AC)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | InventDim 5-dim dedup? | **PASS** | SHA-256 hash + unique constraint + P2002 retry |
| 2 | InventTrans immutable? | **PASS** | No update/delete methods. Append-only. |
| 3 | OnHand = f(InventTrans)? | **PASS** | Updated atomically within $transaction after posting |
| 4 | Posting engine event-driven? | **PASS** | Data-driven via event_mapping table |
| 5 | Reversal via opposite trans? | **PASS** | Negated qty + swapped dims + ReversalLink |
| 6 | Idempotency (external_id)? | **PASS** | Compound unique [externalId, transType] + upfront check |
| 7 | Pessimistic locking (hold)? | **PASS** | SELECT FOR UPDATE on on_hand row |
| 8 | Reconciliation service? | **FAIL** | Prisma models exist, NO service implemented |
| 9 | Daily snapshot service? | **FAIL** | Prisma models exist, NO service implemented |
| 10 | RBAC enforce? | **FAIL** | Zero auth middleware on all routes |

**Result: 7/10 PASS, 3/10 FAIL**

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: JavaScript — Khong co Type Safety tren Module Loi [CRITICAL]

**Spec context:** M3 la "transaction truth engine" — module loi ma MOIS module khac phu thuoc vao.
**Code:** Toan bo 20 files la `.js` (CommonJS). Khong co TypeScript. Khong co compile-time type checking.
**Impact:**
- Sai field name, sai data type, thieu parameter se chi biet tai runtime.
- M1/M2 dung TypeScript → M3 dung JS tao 2 paradigm trong cung codebase.
- Downstream modules (M4-M11) import M3 services se khong co type hints.
- PR review kho hon vi khong co type contract.

**Options:**
1. **Recommended:** Convert to TypeScript + NestJS module (consistent voi M1/M2). Effort: 2-3 days. Business logic giu nguyen, chi them types + decorators.
2. **Minimum viable:** Giu JS nhung them JSDoc type annotations + `.d.ts` declaration files. Effort: 1 day.
3. **Accept as-is:** Giu JS, accept risk. Phai co comprehensive test coverage bu dap.

**Assessment:** Option 1 la correct path. M3 la module quan trong nhat — can type safety nhat. Nhung neu timeline khong cho phep, Option 3 co the chap nhan voi dieu kien test coverage > 90%.

### CR-2: Zero RBAC — All 11 Endpoints Public [CRITICAL]

**Spec ref:** M1 RBAC contract — moi endpoint phai co auth + permission check.
**Code:** `inventory-core.routes.js` khong co bat ky auth middleware nao. 11 routes deu public.
**Impact:** Bat ky ai cung co the post inventory transaction, reverse, create hold. Day la module co impact lon nhat tren du lieu kho.

**Fix (neu giu Express):**
```javascript
const { authMiddleware, permissionMiddleware } = require('../../common/middleware');

router.post('/postings',
  authMiddleware,
  permissionMiddleware('INVENTORY.POSTING.CREATE'),
  controller.postInventory.bind(controller)
);
```

**Fix (neu convert NestJS):**
```typescript
@Controller('inventory')
@UseGuards(AuthGuard, PermissionGuard)
export class InventoryCoreController {
  @Post('postings')
  @Permission('INVENTORY.POSTING.CREATE')
  async postInventory(@Body() dto, @CurrentUser() user) { ... }
}
```

**Permission codes can cho M3:**
| Resource | Actions |
|----------|---------|
| INVENTORY.POSTING | CREATE, READ |
| INVENTORY.REVERSAL | CREATE |
| INVENTORY.ONHAND | READ |
| INVENTORY.HOLD | CREATE, READ, RELEASE, CANCEL |
| INVENTORY.TRANSACTION | READ |

---

## HIGH Issues (Fix truoc Sprint tiep)

### HI-1: Reconciliation & Snapshot Service CHUA IMPLEMENT [HIGH]

**Spec ref:** Sub-module 7 — "Reconciliation & Daily Snapshot". AC-7.1, AC-7.2, AC-7.3.
**Code:** Prisma models da co (`DailyStorageSnapshot`, `InventoryReconciliationRun`, `InventoryReconciliationResult`, `InventorySnapshotRun`) nhung KHONG co application service nao implement logic.
**Missing services:**
- `reconciliation.service.js` — So khop OnHand vs SUM(InventTrans), log mismatches
- `snapshot.service.js` — Chot daily storage snapshot luc 23:59

**Impact:** M10 Billing can `DailyStorageSnapshot` lam dau vao storage fee. M11 Reporting can reconciliation results. Thieu 2 service nay se block M10/M11.

**Fix:** Implement 2 services:
1. **ReconciliationService**: Query `InventTrans` aggregate (already in `aggregateLedgerQty`), compare vs OnHand, write to `InventoryReconciliationRun` + `InventoryReconciliationResult`.
2. **SnapshotService**: For each (warehouse, owner, item, location), compute opening_qty + inbound_today + outbound_today + closing_qty, write to `DailyStorageSnapshot`. Cut-off 23:59 Vietnam time.

### HI-2: Reversal Idempotency Incomplete [HIGH]

**Code:** `reversal-engine.service.js` — Khong check `externalId` truoc khi reverse. Neu retry cung request, se nhan `alreadyReversedError` thay vi idempotent replay.
**Impact:** Mobile/integration retry reversal se fail thay vi gracefully return existing result.
**Spec ref:** AC-8.2 — "Retry cung external_id → response tra trans cu"

**Fix:**
```javascript
// Add at start of reverseTransaction():
const existing = await this.inventTransRepo.findByExternalIdAndType(
  command.externalId, 'REVERSAL', tx
);
if (existing) return { ...existing, idempotentReplay: true };
```

### HI-3: aggregateOnHand — 10K Limit + parseFloat Precision [HIGH]

**Code:** `onhand.service.js` line ~aggregateOnHand method:
- Loads max 10,000 rows then groups in-memory.
- Uses `parseFloat()` cho arithmetic thay vi `Decimal.js`.

**Impact:**
- Warehouses co >10K on-hand rows se bi silent data loss.
- `parseFloat` co floating-point errors (e.g., `0.1 + 0.2 !== 0.3`). Inconsistent voi phần con lai dung Decimal.js.

**Fix:** Dung database-level `GROUP BY` aggregation thay vi in-memory. Hoac cursor-based iteration. Va dung Decimal.js nhu toan bo codebase khac.

### HI-4: Khong Goi M1 AuditLog Service [HIGH]

**Code:** Khong co service nao inject LogService hoac goi createAuditLog(). M3 co `postedBy`, `correlationId` tren InventTrans (good) nhung KHONG ghi vao AuditLog table cua M1.
**Impact:** M1 AuditLog table se thieu inventory posting/reversal events. M11 Reporting se khong co complete audit trail.

**Fix:** Sau moi posting/reversal/hold mutation, goi LogService.createAuditLog() voi:
- entityType: 'INVENT_TRANS' / 'INVENTORY_HOLD'
- entityId: transId / holdId
- action: 'POST' / 'REVERSE' / 'HOLD_CREATE' / 'HOLD_RELEASE'
- userId, correlationId, sourceModule: 'INVENTORY_CORE'

---

## MEDIUM Issues

| # | Issue | File | Description | Fix |
|---|-------|------|-------------|-----|
| MD-1 | PostingEngine.updateOnHand redundant if/else | posting-engine.service.js | Both branches of if(created)/else execute identical code | Remove redundant condition |
| MD-2 | OnHand.updateQty no rowVersion WHERE clause | onhand.repository.js | `rowVersion: { increment: 1 }` nhung khong check rowVersion trong WHERE. Pessimistic lock covers it nhung optimistic check la defense-in-depth. | Add `where: { id, rowVersion: currentVersion }` |
| MD-3 | holdNo generation uses random, not NumberSequence | hold.repository.js | `HLD-YYYYMMDD-{random6}` thay vi dung M1 NumberSequence (consistency voi TRX-*) | Integrate M1 NumberSequenceService |
| MD-4 | Event mapping seed data not verified | event-mapping.repository.js | Event mappings (PP-1 to PP-6) phai co trong seed.ts | Verify/add seed data cho 6 posting points |
| MD-5 | No API route for reconciliation/snapshot | inventory-core.routes.js | Routes chi co 11 endpoints, thieu `/reconciliation/run`, `/snapshots/daily` | Add sau khi HI-1 service duoc implement |
| MD-6 | checkAvailability returns object, not validates | onhand.service.js | Returns availability info nhung khong lock. M5 caller phai lock rieng. | Document clearly in API contract |

---

## Diem Manh — Inventory Logic Excellent

### 1. InventTrans Immutable Ledger — PERFECT
- No update/delete methods trong repository. Append-only.
- Reversal tao trans moi voi qty nguoc + dim swap + link.
- `posted_at` va `created_at` immutable.
- Spec requirement IC-BR-007, IC-BR-008 fully met.

### 2. InventDim Deduplication — CORRECT
- SHA-256 hash cua 5 normalized uppercase dimensions.
- Unique constraint + P2002 retry pattern (thread-safe).
- Same input → same dim_id (AC-1.1, AC-1.4, AC-1.5 met).

### 3. Posting Engine — WELL DESIGNED
- Data-driven event mapping (not hardcoded posting points).
- Full $transaction wrapping (trans + on-hand update atomic).
- Idempotency check truoc insert (external_id + transType compound unique).
- Validates item active, UOM active, dimension valid.
- `TRANS_TYPE_IMPACT` lookup table cho qty sign + dim requirements.
- Spec requirement AC-4.1, AC-4.2, AC-4.3 met.

### 4. Hold Service — PRODUCTION-GRADE
- SELECT FOR UPDATE pessimistic locking on on_hand row.
- Partial release support (for multi-trip outbound).
- Cancel returns reserved qty to available.
- Idempotent createHold via externalId.
- Spec requirement for concurrent allocation protection met.

### 5. Domain Layer — CLEAN SEPARATION
- Pure functions trong `inventory.rules.js` (testable, no side effects).
- Decimal.js throughout (no floating-point errors).
- 19 specific error codes voi factory functions.
- `TRANS_TYPE_IMPACT` defines posting behavior per trans type.

### 6. Reversal — CORRECT
- Negated qty + swapped dims + swapped statuses.
- ReversalLink table + InventTrans.reversalOfTransId (dual tracking).
- Domain rule blocks reversing a reversal or already-reversed trans.
- Reason code mandatory.
- AC-5.1, AC-5.2, AC-5.3 met.

---

## Cross-Check: Code vs Spec Sub-Modules

| Sub-Module | Spec | Code | Status |
|------------|------|------|--------|
| 1. InventDim Engine | 5-dim, dedup, dim_hash | SHA-256 hash, getOrCreate, P2002 retry | **PASS** |
| 2. InventTrans Ledger | Immutable, typed, traced | Append-only, 11 trans types, full audit fields | **PASS** |
| 3. OnHand Balance | physical/reserved/available | Atomic update, decimal.js precision | **PASS** |
| 4. Posting Engine | Event-driven, idempotent | EventMapping table, $transaction, external_id check | **PASS** |
| 5. Reversal Control | Opposite trans, link, reason | Negated qty, ReversalLink, reason required | **PASS** |
| 6. Availability/Hold | Query + hold + locking | SELECT FOR UPDATE, partial release, cancel | **PASS** |
| 7. Reconciliation/Snapshot | Compare ledger vs on-hand, daily snapshot | Prisma models only, **NO service** | **FAIL** |
| 8. Technical Safeguards | Idempotency, correlation, concurrent | external_id, correlationId, $transaction | **PASS** |

**7/8 sub-modules implemented. 1 missing (Reconciliation/Snapshot).**

---

## Cross-Check: Code vs Spec Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| AC-1.1 | Same dim combination → same dim_id | **PASS** |
| AC-1.2 | Location not in warehouse → reject | **PASS** (InventDimService validates) |
| AC-1.3 | Invalid status → reject | **PASS** (validates against MdInventoryStatus) |
| AC-1.4 | dim_hash reuse | **PASS** |
| AC-1.5 | Unique index on dim_hash | **PASS** (Prisma @unique) |
| AC-2.1 | Inbound +qty, Outbound -qty | **PASS** (TRANS_TYPE_IMPACT.sign) |
| AC-2.2 | Missing ref_id/item_id → reject | **PASS** (Joi required validation) |
| AC-2.3 | Adjustment no reason → reject | **PASS** (requiresReasonCode check) |
| AC-2.4 | Posted trans immutable | **PASS** (no update/delete methods) |
| AC-3.1 | Inbound increases physical | **PASS** |
| AC-3.2 | Allocate increases reserved, not physical | **PASS** (hold creates reservedDelta) |
| AC-3.3 | Ship decreases physical | **PASS** |
| AC-4.1 | Unknown event → reject | **PASS** (invalidEventCodeError) |
| AC-4.2 | Putaway creates movement | **PASS** (MOVE type in TRANS_TYPE_IMPACT) |
| AC-4.3 | Same external_id → 1 trans | **PASS** (idempotent replay) |
| AC-5.1 | Reverse creates opposite trans | **PASS** |
| AC-5.2 | Reverse no reason → reject | **PASS** |
| AC-5.3 | On-hand updated after reverse | **PASS** |
| AC-6.1 | AVAILABLE → eligible | **PASS** (isAllocatable check) |
| AC-6.2 | DAMAGED → not eligible | **PASS** |
| AC-6.3 | Different owner → separate | **PASS** (dim includes owner) |
| AC-7.1 | Reconciliation OnHand vs ledger | **NOT IMPLEMENTED** |
| AC-7.2 | Detect mismatch | **NOT IMPLEMENTED** |
| AC-7.3 | Snapshot traceable | **NOT IMPLEMENTED** |
| AC-8.1 | Concurrent → no conflict | **PASS** (SELECT FOR UPDATE) |
| AC-8.2 | Retry → existing result | **PARTIAL** (posting yes, reversal no) |
| AC-8.3 | correlation_id trace | **PASS** |

**21/26 AC PASS, 3 NOT IMPLEMENTED, 1 PARTIAL, 1 PASS**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Core inventory logic | 95% | InventTrans, OnHand, Posting, Reversal, Hold — all excellent |
| Idempotency | 85% | Posting full, Hold full, Reversal partial |
| Concurrency/Locking | 95% | SELECT FOR UPDATE + $transaction |
| Data integrity | 90% | Immutable ledger, decimal.js, atomic updates |
| Architecture consistency | 30% | JS vs TS, Express vs NestJS — 2 paradigms |
| Security (RBAC) | 0% | Zero auth on all routes |
| Completeness | 75% | 7/8 sub-modules, missing reconciliation/snapshot |
| **Overall** | **7.5** | Excellent logic, poor architecture/security layer |

---

## Summary for Dev Team

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | Convert to TypeScript + NestJS OR accept JS voi JSDoc+tests | 2-3 days / 1 day | Truoc merge |
| 2 | **CRITICAL** | Add auth middleware to all 11 routes | 2h (Express) / part of NestJS convert | Truoc merge |
| 3 | **HIGH** | Implement ReconciliationService + SnapshotService | 2 days | Truoc M10/M11 build |
| 4 | **HIGH** | Fix reversal idempotency (external_id check) | 30m | Sprint 3 |
| 5 | **HIGH** | Fix aggregateOnHand (DB GROUP BY, Decimal.js) | 1h | Sprint 3 |
| 6 | **HIGH** | Integrate M1 AuditLog service | 2h | Sprint 3 |
| 7 | **MEDIUM** | Seed event mappings for PP-1 to PP-6 | 30m | Sprint 3 |
| 8 | **MEDIUM** | Fix updateOnHand redundant branch | 10m | Sprint 3 |
| 9 | **MEDIUM** | Add rowVersion WHERE clause defense | 15m | Sprint 3 |
| 10 | **MEDIUM** | Use NumberSequence for holdNo | 30m | Sprint 3 |

---

## Verdict

**CONDITIONAL PASS (7.5/10).** Core inventory logic la **production-grade quality** — immutable ledger, pessimistic locking, decimal precision, event-driven posting, idempotency. Day la module tot nhat ve mat business logic trong 3 modules da review.

Tuy nhien, 2 CRITICAL issues (JS architecture + zero RBAC) can phai address truoc merge. Recommend **strongly** convert to TypeScript + NestJS de consistent voi M1/M2. Neu khong convert, thi phai co comprehensive test suite + JSDoc types + auth middleware.

Reconciliation/Snapshot service phai implement truoc M10 Billing build.
