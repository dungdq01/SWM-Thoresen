# Module 5 — Outbound Operations: Fix Verification Report

**Previous review:** `Module_5_Code_Review_Report.md` (2026-03-09, Score 5.5 FAIL)
**New Score:** 6.5 / 10
**Verdict:** FAIL — 3 CRITICAL van open (allocation MOCK, no posting, no RBAC). Tolerance cascade + $transaction FIXED.

---

## Issue Status

| ID | Issue | Severity | Previous | Current | Evidence |
|----|-------|----------|----------|---------|----------|
| CR-1 | Allocation la MOCK | CRITICAL | **FAIL** | **NOT FIXED** | Hardcoded zero UUIDs cho locationId va inventDimId. KHONG query OnHand, KHONG goi HoldService. fifoRank hardcoded = 1. holdRef = random UUID. |
| CR-1a | Allocation not in $transaction | CRITICAL (sub) | **FAIL** | **FIXED** | `allocateShipment()` now wrapped in `this.prisma.$transaction()`. Partial allocation eliminated. |
| CR-2 | No M3 posting at SHIPPED | CRITICAL | **FAIL** | **NOT FIXED** | PostingLinkRepository fully built nhung zero service code goi no. SHIPPED transition khong tao InventTrans. |
| CR-3 | Zero RBAC | CRITICAL | **FAIL** | **NOT FIXED** | 5 controllers van co ZERO `@UseGuards()`, ZERO `@Permission()`. |
| HI-1 | LOADING → ALL_WEIGHED missing | HIGH | **FAIL** | **NOT FIXED** | After all lines weighed, header van o LOADING. No orchestration code. |
| HI-2 | Tolerance % hardcoded 2% | HIGH | **FAIL** | **FIXED** | Now implements 4-level cascade: OwnerItemPolicy → Item → Owner → ENV default. Consistent voi M4 pattern. |
| HI-3 | Allocation not in $transaction | HIGH | **FAIL** | **FIXED** | (Merged with CR-1a above) |
| HI-4 | Approval decidedBy zero-UUID | HIGH | **FAIL** | **PARTIAL** | Now reads from `x-user-id` header, nhung fallback = zero-UUID khi header missing. Chua dung @CurrentUser() decorator. |
| HI-5 | No line-level status history | HIGH | **FAIL** | **NOT FIXED** | Van chi co header-level history. Line state changes (PENDING→ALLOCATED, LOADING→WEIGHED_PASS) NOT audited. |
| HI-6 | lockForUpdate never called | HIGH | **FAIL** | **PARTIAL** | Called in allocation.service (before allocate). NOT called in weighing.service or approval.service. |
| HI-7 | DTO validation missing | HIGH | **FAIL** | **NOT FIXED** | RecordTareDto, RecordGrossDto, ApprovalDto van la inline classes KHONG co class-validator decorators. |

**Fixed: 2/11 | Partial: 2/11 | Not Fixed: 7/11**

---

## Detail: What Changed

### FIXED — Tolerance Cascade (HI-2)
`tolerance.service.ts` — `getTolerancePct()` now implements 4-level lookup:
1. OwnerItemPolicy (owner + item specific)
2. Item default tolerance
3. Owner default tolerance
4. ENV `DEFAULT_TOLERANCE_PCT` fallback

Uses Prisma queries with proper null-coalescing. Consistent voi M4 inbound tolerance pattern. **Good fix.**

### FIXED — $transaction Wrap (CR-1a / HI-3)
`allocation.service.ts` — `allocateShipment()` now wraps entire allocation loop inside `this.prisma.$transaction()`. If any line allocation fails, all lines rollback. Addresses OUT-BR-003 "No partial allocation".

Also calls `lockForUpdate()` on shipment header before allocation — prevents concurrent allocation race condition on same shipment.

### PARTIAL — decidedBy (HI-4)
`approval.controller.ts` — `decidedBy` now reads from `req.headers['x-user-id']` instead of hardcoded zero-UUID. Nhung:
- Fallback van la zero-UUID khi header missing
- Khong dung NestJS `@CurrentUser()` decorator
- Khong validate UUID format
- Header co the bi forge (no auth verification)

After RBAC added (CR-3), should switch to `@CurrentUser()` from JWT payload.

### PARTIAL — lockForUpdate (HI-6)
Called in `allocation.service.ts` before allocate. NOT called in:
- `weighing.service.ts` — concurrent weigh-in/out co the race
- `approval.service.ts` — concurrent approve/reject co the race

---

## Detail: What's Still Broken

### CR-1: Allocation STILL MOCK
`allocation.service.ts` `allocateLine()`:
```typescript
// STILL hardcoded:
locationId: '00000000-0000-0000-0000-000000000000',
inventDimId: '00000000-0000-0000-0000-000000000000',
fifoRank: 1,
holdRef: randomUUID(), // not linked to M3 InventoryHold
```
- No OnHand query → allocates non-existent stock
- No HoldService.createHold() → reserved_qty khong tang → over-commit possible
- No FIFO logic → violates OUT-BR-002
- $transaction wrap (FIXED) helps consistency nhung wraps a MOCK operation

### CR-2: No M3 Posting at SHIPPED
- `PostingLinkRepository` co full CRUD
- `PostingLink` Prisma model co `postedTransId`, `transType`, `postedAt`
- Nhung ZERO service code goi PostingEngine
- SHIPPED state transition khong tao InventTrans
- Hold khong duoc release
- Impact: physical_qty khong giam → inventory sai → billing sai

### CR-3: Zero RBAC
5 controllers, 0 guards:
- `ShipmentController` — CREATE/READ/CONFIRM/CANCEL unprotected
- `AllocationController` — ALLOCATE/UNALLOCATE unprotected
- `WeighingController` — RECORD_TARE/RECORD_GROSS unprotected
- `ApprovalController` — APPROVE/REJECT/REWEIGH unprotected
- `OutboundQueryController` — all query endpoints unprotected

---

## Score Upgrade Justification

| Category | Previous | Current | Note |
|----------|----------|---------|------|
| State machine | 90% | 90% | Unchanged |
| Allocation | 5% | 15% | $transaction + lockForUpdate nhung van MOCK |
| Weighing | 85% | 85% | Unchanged — still missing ALL_WEIGHED orchestration |
| Tolerance | 40% | 90% | **4-level cascade implemented — major fix** |
| M3 integration | 5% | 5% | Still no posting calls |
| RBAC | 0% | 0% | Zero guards |
| Audit trail | 50% | 50% | Still header-only |
| Data integrity | 30% | 55% | $transaction + partial lockForUpdate |
| **Overall** | **5.5** | **6.5** | Tolerance + transaction fixes cai thien |

---

## Cross-Check: Business Rules Update

| Rule | Previous | Current | Note |
|------|----------|---------|------|
| OUT-BR-002 | FAIL | **FAIL** | No FIFO, no real allocation |
| OUT-BR-003 | FAIL | **FIXED** | $transaction wrap — no partial allocation |
| OUT-BR-006 | NOT IMPL | **NOT IMPL** | No posting at SHIPPED |
| OUT-BR-007 | FAIL | **FIXED** | 4-level cascade tolerance |
| OUT-BR-014 | PARTIAL | **PARTIAL** | No RBAC check on approval |

---

## Remaining Work — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | Real allocation with M3 OnHand + HoldService + FIFO | 3 days | Truoc merge |
| 2 | **CRITICAL** | M3 posting at SHIPPED + hold release | 1 day | Truoc merge |
| 3 | **CRITICAL** | RBAC guards on all 5 controllers | 3h | Truoc merge |
| 4 | **HIGH** | Header LOADING → ALL_WEIGHED orchestration | 2h | Sprint 4 |
| 5 | **HIGH** | lockForUpdate in weighing + approval services | 1h | Sprint 4 |
| 6 | **HIGH** | Line-level status history | 2h | Sprint 4 |
| 7 | **HIGH** | DTO validation (class-validator decorators) | 1h | Sprint 4 |
| 8 | **HIGH** | decidedBy from @CurrentUser (after RBAC) | 30m | Sprint 4 |

**Estimated total: ~5 days for CRITICAL + HIGH.**

---

## Verdict

**FAIL (6.5/10).** Cai thien tu 5.5 → 6.5 nho tolerance cascade va $transaction wrap — 2 fixes co chat luong tot. Nhung 3 CRITICAL van open:

1. **Allocation van la MOCK** — day la core function cua outbound. Khong co real allocation = khong co inventory reservation = over-commit risk.
2. **No posting at SHIPPED** — hang xuat kho nhung inventory khong giam. PostingLink infra ready nhung zero calls.
3. **Zero RBAC** — bat ky ai cung co the allocate, approve, ship.

M5 KHONG the merge voi 3 CRITICAL nay. Dev team PHAI fix allocation + posting + RBAC truoc.
