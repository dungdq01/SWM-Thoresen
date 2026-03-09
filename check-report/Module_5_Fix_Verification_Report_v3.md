# Module 5 — Outbound Operations: Fix Verification Report v3

**Previous review:** `Module_5_Fix_Verification_Report_v2.md` (Score 7.0 CONDITIONAL FAIL)
**New Score:** 8.0 / 10
**Verdict:** FAIL → **CONDITIONAL PASS** — CR-1 allocation REAL (FIFO + HoldService), CR-2 posting REAL (PostingEngine + hold release). Nhung weighing controller chua wire vao usecase → ALL_WEIGHED + line history KHONG chay.

---

## Issue Status

| ID | Issue | Severity | v2 Status | v3 Status | Evidence |
|----|-------|----------|-----------|-----------|----------|
| CR-1 | Allocation MOCK | CRITICAL | NOT FIXED | **FIXED (primary path)** | `allocateShipment.usecase.ts` L143-218: Real OnHand query via `m3Adapter.queryAvailableForFifo()`, real `m3Adapter.createHold()`, FIFO loop, real locationId/inventDimId/holdNo. Controller wired to usecase. |
| CR-2 | No M3 posting at SHIPPED | CRITICAL | NOT FIXED | **FIXED** | `shipShipment.usecase.ts` L89: `m3Adapter.postShipmentShipped()`. L108-120: `m3Adapter.releaseHold()` per allocation. Controller wired to usecase. |
| CR-3 | Zero RBAC | CRITICAL | FIXED | FIXED | All 5 controllers verified. |
| HI-1 | LOADING → ALL_WEIGHED | HIGH | PARTIAL | **PARTIAL (unchanged)** | Logic in `receiveOutboundWeight.usecase.ts` L205-248. BUT `weighing.controller.ts` injects `WeighingService`, NOT usecase → logic KHONG chay. |
| HI-4 | decidedBy | HIGH | FIXED | FIXED | `@CurrentUser()` verified. |
| HI-5 | Line-level history | HIGH | PARTIAL | **PARTIAL (unchanged)** | Logic in usecase L169-179 (entityLevel='LINE'). Same problem: controller dung old service. |
| HI-6 | lockForUpdate partial | HIGH | PARTIAL | **PARTIAL** | In allocation usecase (L50) + ship usecase (L49). Van missing in weighing + approval. |
| HI-7 | DTO validation | HIGH | PARTIAL | **PARTIAL** | CreateShipmentDto ok. RecordTareDto/RecordGrossDto/ApprovalDto van inline, no decorators. |
| NEW-1 | Dual code path: legacy service | HIGH | NEW | **NEW** | `AllocationService` (mock) van ton tai, injected vao `ShipmentCommandService`. Secondary paths co the goi mock. |
| NEW-2 | PostingLink status never updated | MEDIUM | NEW | **NEW** | `shipShipment.usecase.ts` creates PostingLink PENDING, never calls `markSuccess()`/`markFailed()`. |

**Fixed: 4/10 | Partial: 4/10 | Not Fixed: 0/10 | New: 2/10**

---

## Detail: CRITICAL Fixes — Major Milestone

### CR-1: Allocation NOW REAL — OnHand + HoldService + FIFO

**Day la fix quan trong nhat cua M5 — sau 3 vong flag.**

`allocateShipment.usecase.ts` L129-221:

```typescript
// L143-148: REAL M3 OnHand query with FIFO ordering
const availableSources = await this.m3Adapter.queryAvailableForFifo({
  itemId: line.itemId,
  ownerId: shipment.ownerId,
  warehouseId: shipment.warehouseId,
  statusCode: 'AVAILABLE',
});

// L159-186: FIFO allocation loop
let remainingQty = line.expectedQtyKg;
let fifoRank = 0;
for (const source of availableSources) {
  if (remainingQty.lte(0)) break;
  fifoRank++;
  const allocQty = Decimal.min(remainingQty, source.availableQty);

  // L166-176: REAL hold creation via M3
  const hold = await this.m3Adapter.createHold({
    itemId: line.itemId,
    qty: allocQty.toString(),
    locationId: source.locationId,
    inventDimId: source.inventDimId,
    shipmentId: shipment.id,
    shipmentLineId: line.id,
  });

  // L200-218: Allocation record with REAL data
  await this.allocationRepo.create({
    ...allocationData,
    locationId: source.locationId,      // REAL location
    inventDimId: source.inventDimId,    // REAL dimension
    holdRef: hold.holdNo,               // REAL hold reference
    fifoRank: fifoRank,                 // REAL FIFO ranking
    allocatedQtyKg: allocQty,
  });
  remainingQty = remainingQty.minus(allocQty);
}
```

**Checklist:**
- OnHand query: **YES** — `m3Adapter.queryAvailableForFifo()`
- FIFO logic: **YES** — loop through sources ordered by lot_date
- HoldService: **YES** — `m3Adapter.createHold()` returns real holdNo
- Real locationId/inventDimId: **YES** — from OnHand source
- reserved_qty increases: **YES** — via M3 hold creation
- Pessimistic locking: **YES** — `lockForUpdate(shipmentId, tx)` at L50

**Controller wiring:** `allocation.controller.ts` L39-43 calls `this.allocateUseCase.execute()` — **CORRECT.**

### CR-2: M3 Posting at SHIPPED NOW REAL

`shipShipment.usecase.ts` L88-157:

```typescript
// L89: REAL M3 posting
const postingResult = await this.m3Adapter.postShipmentShipped({
  shipmentId: shipment.id,
  lineId: line.id,
  itemId: line.itemId,
  qty: (-line.netWeightKg).toString(),  // Negative = outbound
  dimFrom: { warehouseCode, locationCode, ownerCode, statusCode: 'AVAILABLE' },
  correlationId,
});

// L108-120: REAL hold release
for (const alloc of lineAllocations) {
  await this.m3Adapter.releaseHold(alloc.holdRef, line.netWeightKg);
}

// L124-135: PostingLink created (status tracking)
await this.postingLinkRepo.create({
  shipmentLineId: line.id,
  postedTransId: postingResult.transId,
  postingRequestType: 'OUTBOUND_SHIP',
  status: 'PENDING',  // NOTE: never updated to SUCCESS
});
```

**Checklist:**
- PostingEngine call: **YES** — `m3Adapter.postShipmentShipped()`
- Negative qty (outbound): **YES** — `-line.netWeightKg`
- Hold release: **YES** — `m3Adapter.releaseHold()` per allocation
- InventTrans reference: **YES** — `postingResult.transId` stored
- Transaction wrap: **YES** — `$transaction` at L48
- lockForUpdate: **YES** — L49

**Controller wiring:** `shipment.controller.ts` L143-148 calls `this.shipUseCase.execute()` — **CORRECT.**

---

## Detail: Weighing Controller NOT Wired — Blocks HI-1 + HI-5

**Day la gap lon nhat con lai.**

`weighing.controller.ts`:
```typescript
constructor(
  private readonly weighingService: WeighingService,  // OLD service
  private readonly queryService: ShipmentQueryService,
) {}

@Post(':id/gross')
async recordGross(...) {
  return this.weighingService.recordGross(...);  // OLD — no orchestration
}
```

`receiveOutboundWeight.usecase.ts` co:
- ALL_WEIGHED orchestration (L205-248) — **KHONG CHAY**
- Line-level status history (L169-179) — **KHONG CHAY**
- lockForUpdate — **KHONG CHAY**

**Fix (1h):** Inject usecase vao controller:
```typescript
constructor(
  private readonly receiveWeight: ReceiveOutboundWeightUseCase,
  private readonly queryService: ShipmentQueryService,
) {}

@Post(':id/gross')
async recordGross(...) {
  return this.receiveWeight.execute(...);  // NEW — with orchestration
}
```

---

## Detail: Legacy Service Still Active (NEW-1)

`AllocationService` (mock code) van ton tai va injected vao `ShipmentCommandService`:
```typescript
// shipment-command.service.ts L10
constructor(private readonly allocationService: AllocationService) {}
```

**Risk:** Neu code flow qua `ShipmentCommandService.allocateShipment()` thay vi controller → mock allocation chay.

**Primary path (controller → usecase):** CORRECT — real allocation.
**Secondary path (internal service calls):** RISK — may use mock.

**Fix:** Remove `AllocationService` dependency from `ShipmentCommandService`. All allocation must go through `AllocateShipmentUseCase`.

---

## Score Upgrade Justification

| Category | v2 | v3 | Note |
|----------|----|----|------|
| State machine | 90% | 90% | Unchanged |
| **Allocation** | **15%** | **80%** | **FIFO + OnHand + HoldService — MAJOR FIX** |
| Weighing | 85% | 85% | Orchestration code exists nhung not wired |
| Tolerance | 90% | 90% | 4-level cascade verified |
| **M3 integration** | **5%** | **80%** | **Real posting + hold release — MAJOR FIX** |
| RBAC | 85% | 85% | Verified |
| Audit trail | 55% | 55% | Line history code exists (not wired) |
| Data integrity | 60% | 70% | lockForUpdate in alloc + ship |
| **Overall** | **7.0** | **8.0** | +1.0 — CR-1 + CR-2 resolved |

---

## Cross-Check: Business Rules Update

| Rule | v2 | v3 | Note |
|------|----|----|------|
| OUT-BR-002 | FAIL | **PASS** | FIFO allocation from OnHand sources |
| OUT-BR-003 | FIXED | FIXED | $transaction wrap |
| OUT-BR-006 | NOT IMPL | **PASS** | Real posting at SHIPPED + hold release |
| OUT-BR-007 | FIXED | FIXED | 4-level cascade tolerance |
| OUT-BR-011 | PASS | PASS | Cancel before SHIPPED only |
| OUT-BR-014 | PASS | PASS | RBAC + @CurrentUser on approval |

---

## Remaining Work — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **HIGH** | Wire `ReceiveOutboundWeightUseCase` vao `weighing.controller.ts` | 1h | Sprint 5 |
| 2 | **HIGH** | Remove/deprecate `AllocationService` mock + cleanup `ShipmentCommandService` | 1h | Sprint 5 |
| 3 | **HIGH** | lockForUpdate in weighing usecase + approval service | 1h | Sprint 5 |
| 4 | **HIGH** | DTO validation: extract + decorate RecordTare/Gross/Approval DTOs | 1h | Sprint 5 |
| 5 | **MEDIUM** | PostingLink: call `markSuccess()` after posting | 15m | Sprint 5 |
| 6 | **MEDIUM** | Remove old `WeighingService` sau khi wire usecase | 30m | Sprint 5 |

**Estimated total: ~5h for all remaining issues.**

---

## Verdict

**CONDITIONAL PASS (8.0/10).** Day la buoc nhay lon tu 7.0 FAIL → 8.0 CONDITIONAL PASS:

**2 CRITICAL da fix (sau 3 vong flag):**
1. **Allocation REAL** — FIFO from OnHand, M3 HoldService, real locationId/inventDimId. Khong con mock.
2. **M3 Posting REAL** — PostingEngine call at SHIPPED, hold release, InventTrans reference stored.

**Gap con lai (khong con CRITICAL):**
1. **Weighing controller chua wire usecase** (1h fix) — ALL_WEIGHED + line history logic exists nhung KHONG chay
2. **Legacy mock service chua xoa** — risk o secondary paths
3. **DTO validation** — 3 inline DTOs chua co class-validator
4. **lockForUpdate** — missing in weighing + approval

**M5 co the merge** voi dieu kien fix weighing controller wiring (1h). Sau do score co the len 8.5+.

---

## Timeline: M5 qua 4 vong review

| Round | Score | Verdict | Key Changes |
|-------|-------|---------|-------------|
| Initial | 5.5 | FAIL | Allocation MOCK, no posting, no RBAC |
| Fix v1 | 6.5 | FAIL | Tolerance cascade + $transaction fixed |
| Fix v2 | 7.0 | CONDITIONAL FAIL | RBAC fixed, use cases added nhung not wired |
| **Fix v3** | **8.0** | **CONDITIONAL PASS** | **Allocation REAL, posting REAL, RBAC REAL** |
