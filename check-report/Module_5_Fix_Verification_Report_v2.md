# Module 5 — Outbound Operations: Fix Verification Report v2

**Previous review:** `Module_5_Fix_Verification_Report.md` (Score 6.5 FAIL)
**New Score:** 7.0 / 10
**Verdict:** FAIL → **CONDITIONAL FAIL** — CR-3 RBAC FIXED, nhung CR-1 (allocation MOCK) va CR-2 (no posting) van KHONG FIXED. Them code moi (use cases) nhung chua wire dung vao controller.

---

## Issue Status

| ID | Issue | Severity | v1 Status | v2 Status | Evidence |
|----|-------|----------|-----------|-----------|----------|
| CR-1 | Allocation la MOCK | CRITICAL | NOT FIXED | **NOT FIXED** | `allocation.service.ts` L133-134: hardcoded zero UUIDs. `allocateShipment.usecase.ts` L142-143: same. TODO comments acknowledge need for OnHand+HoldService+FIFO. |
| CR-2 | No M3 posting at SHIPPED | CRITICAL | NOT FIXED | **NOT FIXED** | `shipShipment.usecase.ts` L62-90: TODO comment, mock UUID generated, PostingLink created nhung no real PostingEngine call. Hold KHONG release. |
| CR-3 | Zero RBAC | CRITICAL | NOT FIXED | **FIXED** | All 5 controllers now have `@UseGuards(AuthGuard, PermissionGuard)` + `@Permission()` on every endpoint. |
| HI-1 | LOADING → ALL_WEIGHED | HIGH | NOT FIXED | **PARTIAL** | Logic exists in `receiveOutboundWeight.usecase.ts` L205-248, nhung controller dung `weighingService` thay vi usecase → logic KHONG chay. |
| HI-2 | Tolerance hardcoded 2% | HIGH | FIXED | FIXED | 4-level cascade van hoat dong. |
| HI-3 | $transaction wrap | HIGH | FIXED | FIXED | Van hoat dong. |
| HI-4 | decidedBy zero-UUID | HIGH | PARTIAL | **FIXED** | `approval.controller.ts` L56, 80: `@CurrentUser() user` → `user.id`. No zero-UUID fallback. |
| HI-5 | No line-level history | HIGH | NOT FIXED | **PARTIAL** | Exists in `receiveOutboundWeight.usecase.ts` L169-179 (entityLevel='LINE'). Nhung controller dung `weighingService` → history KHONG ghi. |
| HI-6 | lockForUpdate partial | HIGH | PARTIAL | **PARTIAL** | Added in `shipShipment.usecase.ts` L45. Van missing in `weighing.service.ts` + `approval.service.ts`. |
| HI-7 | DTO validation missing | HIGH | NOT FIXED | **PARTIAL** | `CreateShipmentDto` full validation. `RecordTareDto`, `RecordGrossDto`, `ApprovalDto` van la inline classes KHONG co class-validator decorators. |

**Fixed: 4/10 | Partial: 4/10 | Not Fixed: 2/10**

---

## Detail: What Changed (Round 2)

### FIXED — RBAC on All 5 Controllers (CR-3)

**Day la fix quan trong nhat cua round nay.**

| Controller | Guard | Permissions |
|------------|-------|-------------|
| `shipment.controller.ts` | `@UseGuards(AuthGuard, PermissionGuard)` | OUTBOUND.SHIPMENT.CREATE, .READ, .CONFIRM, .CANCEL, .CLOSE |
| `allocation.controller.ts` | `@UseGuards(AuthGuard, PermissionGuard)` | OUTBOUND.ALLOCATION.ALLOCATE, .UNALLOCATE, .READ |
| `weighing.controller.ts` | `@UseGuards(AuthGuard, PermissionGuard)` | OUTBOUND.WEIGHING.RECORD_TARE, .RECORD_GROSS, .READ |
| `approval.controller.ts` | `@UseGuards(AuthGuard, PermissionGuard)` | OUTBOUND.APPROVAL.APPROVE, .REJECT, .REWEIGH |
| `outbound-query.controller.ts` | `@UseGuards(AuthGuard, PermissionGuard)` | OUTBOUND.QUERY.READ (4 endpoints) |

### FIXED — decidedBy from @CurrentUser (HI-4)

`approval.controller.ts`:
```typescript
@Post(':id/decide')
@Permission('OUTBOUND.APPROVAL.APPROVE')
async decide(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: ApprovalDto) {
  const decidedBy = user.id;  // From JWT, not header
  ...
}
```

No zero-UUID fallback. Clean implementation.

### NEW — Use Case Files Added

Dev team added application layer use cases:
- `application/allocateShipment.usecase.ts` — allocation logic (still MOCK)
- `application/shipShipment.usecase.ts` — ship logic (still mock posting)
- `application/receiveOutboundWeight.usecase.ts` — weighing + orchestration + line history

**Problem:** Use cases have improved logic (ALL_WEIGHED orchestration, line history) nhung **controllers van dung old services** (weighingService, not usecase). New logic KHONG chay.

---

## Detail: What's Still Broken

### CR-1: Allocation STILL MOCK (flag lan 3)

**File:** `allocation.service.ts` + `allocateShipment.usecase.ts`

Both contain:
```typescript
// TODO: CR-1 - Replace mock with real M3 OnHand + HoldService + FIFO
locationId: '00000000-0000-0000-0000-000000000000',
inventDimId: '00000000-0000-0000-0000-000000000000',
fifoRank: 1,  // hardcoded, no FIFO
holdRef: `HOLD-${uuidv4().substring(0, 8)}`,  // random, not from HoldService
```

Missing:
- No `OnHandService` injection/import
- No `HoldService` injection/import
- No FIFO logic (no lotDate sort)
- No `SELECT FOR UPDATE` on OnHand rows
- `reserved_qty_shipment` KHONG tang

**Impact:** Allocation luon thanh cong bat ke stock co hay khong. Over-commit possible.

### CR-2: No M3 Posting at SHIPPED (flag lan 3)

**File:** `shipShipment.usecase.ts` L62-90:
```typescript
// TODO: CR-2 - Replace mock with real M3 PostingEngine call
const mockInventTransId = uuidv4();
inventTransIds.push(mockInventTransId);

await this.postingLinkRepo.create({
  shipmentLineId: line.id,
  postingRequestType: 'OUTBOUND_SHIP',
  status: 'PENDING',
  requestPayload: { ... },
});
```

Missing:
- No `PostingEngine` import/injection
- No real `InventTrans` created
- No `physical_qty` decrement
- No hold release (`HoldService.releaseHold()`)
- PostingLink status stays PENDING forever (no `markSuccess`/`markFailed`)

---

## NEW Issue: Dual Code Path (Controller vs UseCase)

**Day la van de moi phat sinh tu round 2.**

Dev team viet use cases moi (`receiveOutboundWeight.usecase.ts`) voi logic tot:
- ALL_WEIGHED orchestration (L205-248)
- Line-level status history (L169-179)

Nhung **controller van inject va goi old service**:
```typescript
// weighing.controller.ts
constructor(private readonly weighingService: WeighingService) {}

@Post(':id/tare')
async recordTare(...) {
  return this.weighingService.recordTare(...);  // OLD service, no orchestration
}
```

**Impact:**
- HI-1 (ALL_WEIGHED) — logic exists nhung KHONG chay
- HI-5 (line history) — logic exists nhung KHONG chay
- Dev team lam 2 lan nhung khong wire dung

**Fix:** Inject use case vao controller:
```typescript
constructor(private readonly receiveWeight: ReceiveOutboundWeightUseCase) {}

@Post(':id/gross')
async recordGross(...) {
  return this.receiveWeight.execute(...);  // NEW usecase with orchestration
}
```

---

## Score Upgrade Justification

| Category | v1 | v2 | Note |
|----------|----|----|------|
| State machine | 90% | 90% | Unchanged |
| Allocation | 15% | 15% | Van MOCK |
| Weighing | 85% | 85% | Orchestration code exists nhung not wired |
| Tolerance | 90% | 90% | Unchanged — 4-level cascade |
| M3 integration | 5% | 5% | Van no posting |
| **RBAC** | **0%** | **85%** | **All 5 controllers protected** |
| Audit trail | 50% | 55% | Line history code exists (not wired) |
| Data integrity | 55% | 60% | lockForUpdate added in ship usecase |
| **Overall** | **6.5** | **7.0** | RBAC fix = major improvement |

---

## Cross-Check: Business Rules Update

| Rule | v1 | v2 | Note |
|------|----|----|------|
| OUT-BR-002 | FAIL | **FAIL** | No FIFO, no real allocation |
| OUT-BR-003 | FIXED | FIXED | $transaction wrap |
| OUT-BR-006 | NOT IMPL | **NOT IMPL** | No posting at SHIPPED |
| OUT-BR-007 | FIXED | FIXED | 4-level cascade tolerance |
| OUT-BR-014 | PARTIAL | **PASS** | RBAC + @CurrentUser on approval |

---

## Remaining Work — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **CRITICAL** | Real allocation: M3 OnHand query + HoldService.createHold + FIFO sort | 3 days | Truoc merge |
| 2 | **CRITICAL** | Real M3 posting at SHIPPED: PostingEngine call + hold release | 1 day | Truoc merge |
| 3 | **HIGH** | Wire use cases vao controllers (replace weighingService → usecase) | 1h | Sprint 5 |
| 4 | **HIGH** | lockForUpdate in weighing + approval services | 1h | Sprint 5 |
| 5 | **HIGH** | DTO validation: extract inline DTOs, add class-validator | 1h | Sprint 5 |
| 6 | **HIGH** | PostingLink status update (markSuccess/markFailed after posting) | 30m | Sprint 5 |
| 7 | **MEDIUM** | Remove duplicate service/usecase code (consolidate) | 2h | Sprint 5 |

**Estimated total: ~5 days for CRITICAL + HIGH.**

---

## Verdict

**CONDITIONAL FAIL (7.0/10).** Cai thien tu 6.5 → 7.0 nho RBAC fix tren all 5 controllers — day la 1 trong 3 CRITICAL da fix.

Nhung 2 CRITICAL con lai van KHONG FIXED (flag lan 3):
1. **Allocation van MOCK** — zero UUIDs, no OnHand, no HoldService, no FIFO
2. **No M3 posting** — mock UUID, PostingLink PENDING forever, hold KHONG release

Them van de moi: **dual code path** — dev viet use cases moi co logic tot nhung controller van goi old services. Logic moi KHONG chay.

**M5 van KHONG the merge.** Dev team phai:
1. Implement real allocation (3 days)
2. Implement real posting (1 day)
3. Wire use cases vao controllers (1h — quick win)
