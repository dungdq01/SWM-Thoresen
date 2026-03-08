# Module 5 — Outbound Operations: Code Review Report

**Code path:** `backend/src/modules/outbound/` (27 TS files)
**Spec file:** `docs/spec/module_5_outbound_operations_spec.md`
**Prisma models:** 10 M5 models, 16 M5 enums
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 5.5 / 10
**Verdict:** FAIL — Core allocation la MOCK, khong co M3 posting, khong co RBAC. State machine + weighing logic tot nhung infrastructure chua production-ready.

---

## Tech Stack — KHAC VOI M3/M4, QUAY LAI M1/M2

| Layer | Choice | Note |
|-------|--------|------|
| Language | **TypeScript** | Quay lai TS — KHAC voi M3/M4 (JS) |
| Framework | **NestJS** | @Controller, @Injectable, @Module — consistent voi M1/M2 |
| Validation | **class-validator** | Partial — chi CreateShipmentDto, weighing/approval DTOs thieu |
| ORM | Prisma | Consistent |
| Auth | **NONE** | Zero guards, zero permissions |

**Architecture inconsistency:** M1/M2 = TS+NestJS, M3/M4 = JS+Express, M5 = TS+NestJS. 2 paradigms trong cung backend.

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Controllers | 5 | shipment, allocation, weighing, approval, outbound-query |
| Services | 9 | shipment, shipment-command, shipment-query, state-machine, line-state, allocation, weighing, tolerance, approval |
| Repositories | 9 | header, line, allocation-record, weighing-attempt, status-history, exception-log, approval-decision, pick-work-link, posting-link |
| DTOs | 2 | create-shipment, shipment-response |
| Prisma Models | 10 | Header, Line, AllocationRecord, WeighingAttempt, StatusHistory, ExceptionLog, ApprovalDecision, PickWorkLink, PostingLink, SoLink |

---

## Review Gate Checklist (10 items)

| #   | Gate Question                   | Result      | Note                                                 |
| -----| ---------------------------------| -------------| ------------------------------------------------------|
| 1   | Shipment state machine correct? | **PASS**    | 12 header states, 9 line states, 20+ transitions     |
| 2   | Allocation FIFO + hold?         | **FAIL**    | MOCK — hardcoded zero UUIDs, no OnHand query         |
| 3   | Multi-trip weighing?            | **PASS**    | Tare + cumulative gross, net = diff, idempotent      |
| 4   | Outbound tolerance per-line?    | **PARTIAL** | Logic correct but tolerance% hardcoded 2%            |
| 5   | PENDING_APPROVAL flow?          | **PASS**    | Line-level + shipment-level approval, beforeSnapshot |
| 6   | Posting at SHIPPED?             | **FAIL**    | PostingLink infra ready nhung zero calls             |
| 7   | RBAC enforce?                   | **FAIL**    | Zero guards on all 5 controllers                     |
| 8   | Idempotency?                    | **PARTIAL** | Shipment + weighing yes, allocation + approval no    |
| 9   | Audit trail?                    | **PARTIAL** | Header history yes, line-level history missing       |
| 10  | DPM dual tracking?              | **PARTIAL** | isDpmLine flag set nhung no special billing logic    |

**Result: 2/10 PASS, 4/10 PARTIAL, 4/10 FAIL**

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: Allocation la MOCK — Khong Co Real Inventory Integration [CRITICAL]

**Spec ref:** Sub-module 2 — "Allocation-Based Hold (FIFO)". OUT-BR-002, OUT-BR-003.
**Code:** `allocation.service.ts` `allocateLine()`:
- Hardcoded zero-UUID cho `locationId` va `inventDimId`
- KHONG query OnHand de tim available stock
- KHONG goi M3 HoldService de create hold (reserved_qty)
- KHONG co FIFO logic (fifoRank hardcoded = 1)
- KHONG co pessimistic locking (SELECT FOR UPDATE)
- `holdRef` = random UUID (khong link to M3 InventoryHold)

**Impact:** Allocation thanh cong luon nhung khong check ton kho → co the allocate stock khong ton tai. Reserved_qty khong tang → M3 available_qty khong giam → concurrent shipments co the over-commit cung stock.

**Fix:**
```typescript
// 1. Query available stock from M3 OnHand (FIFO by lot_date)
const available = await this.onHandService.queryOnHand({
  itemId: line.itemId,
  ownerId: shipment.ownerId,
  warehouseId: shipment.warehouseId,
  statusCode: 'AVAILABLE',
});

// 2. Lock + allocate via M3 HoldService
const hold = await this.holdService.createHold({
  externalId: `ALLOC-${shipment.id}-${line.id}`,
  itemId: line.itemId,
  qty: line.expectedQtyKg.toString(),
  dim: { warehouseCode, locationCode, ownerCode, statusCode: 'AVAILABLE' },
  shipmentId: shipment.id,
  shipmentLineId: line.id,
});

// 3. Store real allocation record
await this.allocationRepo.create({
  ...allocationData,
  inventDimId: hold.inventDimId,
  locationId: hold.locationId,
  holdRef: hold.holdNo,
});
```

### CR-2: No M3 Posting at SHIPPED [CRITICAL]

**Spec ref:** Sub-module 6 — "Outbound Posting Control". OUT-BR-006.
**Code:** `PostingLinkRepository` fully built nhung **KHONG co service code goi no**. SHIPPED transition khong tao InventTrans.
**Impact:** Hang xuat kho nhung physical_qty khong giam → ton kho sai → billing sai.

**Fix:** Implement `shipOutbound()` method:
```typescript
async ship(shipmentId: string, context) {
  // For each line:
  const posting = await this.postingEngine.postInventory({
    externalId: `SHIP-${shipment.id}-${line.id}`,
    eventCode: 'SHIPMENT_SHIPPED',
    refType: 'SHIPMENT',
    refId: shipment.id,
    refLineId: line.id,
    itemId: line.itemId,
    qty: (-line.netWeightKg).toString(),
    dimFrom: { warehouseCode, locationCode, ownerCode, statusCode: 'AVAILABLE' },
    sourceApp: 'WEB',
  });
  // Release hold
  await this.holdService.releaseHold(line.holdId, line.netWeightKg);
  // Store posting link
  await this.postingLinkRepo.create({ shipmentLineId: line.id, postedTransId: posting.transId });
}
```

### CR-3: Zero RBAC — All 5 Controllers Unprotected [CRITICAL]

**Code:** 5 controllers co ZERO `@UseGuards()`, ZERO `@Permissions()` decorators.
**Impact:** Bat ky ai cung co the allocate, approve tolerance failure, ship outbound.
**Spec ref:** WH_MANAGER approve, WH_KEEPER pick, WB_OPERATOR weigh. Section 32.

**Fix:** Add to every controller:
```typescript
@Controller('outbound/shipments')
@UseGuards(AuthGuard, PermissionGuard)
export class ShipmentController {
  @Post()
  @Permission('OUTBOUND.SHIPMENT.CREATE')
  create() { ... }
}
```

**Permission codes needed:**
| Resource | Actions |
|----------|---------|
| OUTBOUND.SHIPMENT | CREATE, READ, CONFIRM, CANCEL, CLOSE |
| OUTBOUND.ALLOCATION | ALLOCATE, UNALLOCATE |
| OUTBOUND.WEIGHING | RECORD_TARE, RECORD_GROSS |
| OUTBOUND.APPROVAL | APPROVE, REJECT, REWEIGH |
| OUTBOUND.SHIP | EXECUTE |

---

## HIGH Issues

### HI-1: Missing Header Transition LOADING → ALL_WEIGHED [HIGH]

**Code:** Weighing service records gross per-line nhung **KHONG co code check** "all lines weighed?" va advance header to ALL_WEIGHED.
**Impact:** After all lines weighed, header van o LOADING vinh vien. Cannot proceed to SHIP.
**Fix:** After each recordGross(), check if all lines have WEIGHED_PASS/WEIGHED_FAIL. If all weighed and no WEIGHED_FAIL → transition to ALL_WEIGHED.

### HI-2: Tolerance % Hardcoded 2% [HIGH]

**Code:** `tolerance.service.ts` — `getTolerancePct()` always returns 2.0%. No M2 lookup.
**Spec ref:** OUT-BR-007 — tolerance by owner_item_policy → item → owner → system default (same cascade as M4).
**Fix:** Implement same 4-level cascade as M4 inbound (OwnerItemPolicy → Item → Owner → ENV).

### HI-3: Allocation Not In $transaction [HIGH]

**Code:** `allocation.service.ts` — allocate loop is sequential but NOT inside `$transaction`. If line 3 fails, lines 1-2 remain allocated → partial/inconsistent state.
**Spec ref:** OUT-BR-003 — "No partial allocation".
**Fix:** Wrap entire allocate in `this.prisma.$transaction()`.

### HI-4: Approval decidedBy Hardcoded Zero-UUID [HIGH]

**Code:** `approval.controller.ts` — `decidedBy` hardcoded as `'00000000-0000-0000-0000-000000000000'`.
**Impact:** Audit trail khong biet ai approve/reject. Vi pham audit requirement.
**Fix:** Extract from `@CurrentUser()` after RBAC is added.

### HI-5: No Line-Level Status History [HIGH]

**Code:** StatusHistory supports `entityLevel: 'LINE'` nhung allocation + weighing services only write HEADER-level history. Line state changes (PENDING→ALLOCATED, LOADING→WEIGHED_PASS) NOT audited.
**Fix:** Add line-level history writes in allocation.service and weighing.service.

### HI-6: lockForUpdate Never Called [HIGH]

**Code:** `ShipmentHeaderRepository.lockForUpdate()` exists (SELECT FOR UPDATE) nhung **ZERO calls** from any service.
**Impact:** Concurrent state transitions co the race condition.
**Fix:** Call lockForUpdate at start of every $transaction before state checks.

### HI-7: Inline DTO Validation Missing [HIGH]

**Code:** `RecordTareDto`, `RecordGrossDto`, `ApprovalDto` la inline classes trong controllers KHONG co class-validator decorators. Only `CreateShipmentDto` co proper validation.
**Impact:** Invalid data co the pass validation layer.
**Fix:** Add @IsUUID, @IsNumber, @IsString, @IsEnum decorators. Move to dedicated DTO files.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | DPM dual tracking not implemented | weighing.service.ts | `isDpmLine` flag set nhung no special billing qty calculation |
| MD-2 | ShipmentSoLink never populated | Prisma schema | Model exists, no code uses it |
| MD-3 | shipmentNumber never auto-generated | shipment.service.ts | Field nullable, never set |
| MD-4 | No M2 master validation | shipment.service.ts | Trusts Prisma FK, no active/exists checks |
| MD-5 | rowVersion never checked by callers | repositories | Incremented but no WHERE guard |
| MD-6 | Allocation externalId = random UUID | allocation.service.ts | Not caller-supplied, not truly idempotent for retry |

---

## Diem Manh — What's Done Well

### 1. State Machine — COMPREHENSIVE
- 12 header states + 9 line states with clear transition maps
- Terminal states properly locked
- Cancellation matrix (DRAFT/CONFIRMED/ALLOCATED only)
- Forbidden transitions documented
- `canTransition()` + `validateTransition()` pattern

### 2. Multi-Trip Weighing — CORRECT
- Tare first, then cumulative gross per line in flexible order
- Net = gross_N - previous_weight (cumulative delta)
- Idempotent via `externalEventId`
- Raw weighbridge data preserved
- `sourceMode` supports SCALE_AGENT + MANUAL

### 3. Approval Flow — COMPLETE
- Line-level + shipment-level approval
- APPROVE/REJECT/REWEIGH actions
- BeforeSnapshot captured for audit
- Auto-resolve header when all lines resolved
- ShipmentExceptionLog with severity classification

### 4. Infrastructure Readiness — GOOD
- PostingLinkRepository fully built (ready for M3 integration)
- PickWorkLinkRepository ready for M7 integration
- StatusHistory comprehensive at header level
- Proper NestJS module structure with DI

### 5. Idempotency — PARTIAL BUT GOOD START
- Shipment creation via externalId unique
- Weighing attempts via externalEventId
- Controller returns 200 vs 201 correctly

---

## Cross-Check: Code vs Spec Sub-Modules

| Sub-Module | Spec | Code | Status |
|------------|------|------|--------|
| 1. SO Intake & Shipment Creation | Create, confirm, split | Create + confirm implemented | **PARTIAL** (no SO link) |
| 2. Allocation-Based Hold | FIFO, lock, hold | **MOCK** — zero real logic | **FAIL** |
| 3. Pick Work Handoff to M7 | Auto-create work | PickWorkLink ready, no creation | **NOT IMPL** |
| 4. Multi-Trip Weighing | Tare + multi-gross | Implemented | **PASS** |
| 5. Tolerance Check | Per-line, per-owner | Logic ok, % hardcoded | **PARTIAL** |
| 6. Outbound Posting | SHIPPED → InventTrans | PostingLink ready, no calls | **NOT IMPL** |
| 7. DPM Dual Tracking | actual vs nominal | Flag set, no logic | **NOT IMPL** |
| 8. Cancel & Exception | Cancel matrix, close | Cancel ok, close basic | **PARTIAL** |
| 9. Auditability | Idempotency, trace | Partial idempotency | **PARTIAL** |

**1/9 PASS, 4/9 PARTIAL, 2/9 NOT IMPLEMENTED, 2/9 FAIL**

---

## Cross-Check: Code vs Spec Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| OUT-BR-001 | 1 shipment = 1 trip = 1 vehicle | **PASS** |
| OUT-BR-002 | FIFO allocation by lot_date | **FAIL** — mock, no FIFO |
| OUT-BR-003 | No partial allocation | **FAIL** — no $transaction wrap |
| OUT-BR-004 | Bulk blocking per SO | **NOT IMPL** |
| OUT-BR-005 | Bagged blocking per trip | **NOT IMPL** |
| OUT-BR-006 | SHIPPED = atomic post + billing + DPM | **NOT IMPL** |
| OUT-BR-007 | Tolerance by owner/item cascade | **FAIL** — hardcoded 2% |
| OUT-BR-008 | Manual weight governance | **NOT IMPL** |
| OUT-BR-009 | Container stuffing | Phase 2 |
| OUT-BR-010 | DPM dual tracking | **PARTIAL** — flag only |
| OUT-BR-011 | Cancel before SHIPPED only | **PASS** |
| OUT-BR-012 | Shipment close rules | **PASS** |
| OUT-BR-013 | Tolerance fail doesn't stop vehicle | **PASS** |
| OUT-BR-014 | PENDING_APPROVAL by WH_MANAGER | **PARTIAL** — no RBAC check |

**4/14 PASS, 3/14 PARTIAL, 3/14 FAIL, 4/14 NOT IMPLEMENTED**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| State machine | 90% | Comprehensive header + line states |
| Allocation | 5% | MOCK — biggest gap |
| Weighing | 85% | Multi-trip correct, missing header orchestration |
| Tolerance | 40% | Logic ok, % hardcoded, no cascade |
| M3 integration | 5% | Infra ready, zero calls |
| RBAC | 0% | Zero guards |
| Audit trail | 50% | Header history only, no line-level |
| Data integrity | 30% | No $transaction, no lockForUpdate, no rowVersion |
| **Overall** | **5.5** | Good design, incomplete implementation |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | Real allocation with M3 OnHand + HoldService + FIFO | 3 days | Truoc merge |
| 2 | **CRITICAL** | M3 posting at SHIPPED + hold release | 1 day | Truoc merge |
| 3 | **CRITICAL** | RBAC guards on all 5 controllers | 3h | Truoc merge |
| 4 | **HIGH** | Header LOADING→ALL_WEIGHED orchestration | 2h | Sprint 4 |
| 5 | **HIGH** | Tolerance cascade from M2 (replace hardcoded 2%) | 2h | Sprint 4 |
| 6 | **HIGH** | Wrap allocation in $transaction | 1h | Sprint 4 |
| 7 | **HIGH** | Fix approval decidedBy (use @CurrentUser) | 30m | Sprint 4 |
| 8 | **HIGH** | Line-level status history | 2h | Sprint 4 |
| 9 | **HIGH** | lockForUpdate in all state transitions | 1h | Sprint 4 |
| 10 | **HIGH** | DTO validation on Tare/Gross/Approval | 1h | Sprint 4 |

**Estimated total: ~6 days for CRITICAL + HIGH.**

---

## Verdict

**FAIL (5.5/10).** M5 co state machine + weighing + approval logic tot, va TypeScript architecture quay lai consistent voi M1/M2 (good). Nhung allocation la **MOCK placeholder** va posting **chua implement** — day la 2 core functions cua outbound. Khong co allocation that → M5 chi la "shipment document management" chu khong phai "outbound operations".

Dev team PHAI implement real allocation + posting truoc merge. RBAC cung la non-negotiable.
