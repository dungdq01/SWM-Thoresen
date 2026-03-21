# Outbound Flow Redesign — Task List

> **CR**: CR-001 | **Status**: Approved | **Date**: 2026-03-17

---

## Decisions (Confirmed)

| # | Decision |
|---|----------|
| 1 | **Interleaved per-SKU**: LOAD từng SKU → WEIGH-OUT ngay → lặp lại cho SKU tiếp |
| 2 | **Deprecated endpoints**: Giữ lại `/allocate`, `/pick`, `/load` (order-level) — internally batch per-line |
| 3 | **Ship requires ALL lines Weighed**: Tất cả OrderDetails phải có LineStatus = Weighed trước khi Ship |

## New Flow (Final)

```
CREATE ORDER → WEIGH-IN (xe rỗng)
  → [Per SKU: ALLOCATE+PICK → LOAD → WEIGH-OUT]
  → SHIP (khi tất cả lines = Weighed)
```

**Example with 3 SKUs:**
```
WEIGH-IN (W0)
  → ALLOCATE+PICK SKU-1 → LOAD SKU-1 → WEIGH-OUT SKU-1 (W1, Net=|W1-W0|)
  → ALLOCATE+PICK SKU-2 → LOAD SKU-2 → WEIGH-OUT SKU-2 (W2, Net=|W2-W1|)
  → ALLOCATE+PICK SKU-3 → LOAD SKU-3 → WEIGH-OUT SKU-3 (W3, Net=|W3-W2|)
  → SHIP
```

---

## Phase 0: Documents (trước khi code)

| # | Task | Files | Status |
|---|------|-------|--------|
| D-1 | Update outbound flow trong `references/wms-domain-knowledge.md` | `references/wms-domain-knowledge.md` | ⬜ Pending |
| D-2 | Update Phase 5 Outbound section trong `references/data-model-sketch.md` | `references/data-model-sketch.md` | ⬜ Pending |
| D-3 | Update database diagram (WeighbridgeLog new fields, outbound status changes) | `docs/shared/database-diagram.md` | ⬜ Pending |
| D-4 | Viết feature spec đầy đủ cho outbound redesign | `docs/feature/outbound-flow-redesign/ba/spec.md` | ⬜ Pending |

---

## Phase 1: Backend — Domain & Enums

| # | Task | Files | Status |
|---|------|-------|--------|
| B-1 | Update `OrderStatus` enum: `Draft, Confirmed, Weighing, Processing, Shipped, Cancelled` | `Domain/Enums/OutboundEnums.cs` | ⬜ Pending |
| B-2 | Simplify `OrderDetailStatus` enum: `Pending, Picked, Loaded, Weighed, Shipped, Cancelled` | `Domain/Enums/OutboundEnums.cs` | ⬜ Pending |
| B-3 | Add fields to `WeighbridgeLog` entity: SequenceNo, Sku, ResolvedItemId, ResolvedOrderDetailId, ResolvedWarehouseId, ResolvedOwnerId, OwnerCode, WarehouseCode, ErrorMessage | `Domain/Entities/Weighbridge/WeighbridgeLog.cs` | ⬜ Pending |
| B-4 | Add new business rules: BR-OUT-001 → BR-OUT-012 | `Domain.Shared/BusinessRule.Outbound.cs` | ⬜ Pending |

---

## Phase 2: Backend — Infrastructure

| # | Task | Files | Status |
|---|------|-------|--------|
| B-5 | Update WeighbridgeLog EF configuration: new columns, FKs (Item, OrderDetail), indexes | `Infrastructure/EF/Configurations/Weighbridge/WeighbridgeLogConfiguration.cs` | ⬜ Pending |
| B-6 | Create database migration for WeighbridgeLog new columns + enum changes | `Infrastructure/Migrations/` | ⬜ Pending |

---

## Phase 3: Backend — Commands (Core Logic)

| # | Task | Files | Deps | Status |
|---|------|-------|------|--------|
| B-7 | **MODIFY** `WeighInOrder.cs`: precondition `Draft/Confirmed → Weighing` | `Orders/Commands/WeighInOrder.cs` | B-1 | ⬜ Pending |
| B-8 | **NEW** `AllocateAndPickOrderLine.cs`: combined FIFO allocate + pick for 1 OrderDetail. Precondition: Order ≥ Weighing, Line = Pending. Post InventTrans STORAGE→STAGING. Update header → Processing | `OrderDetails/Commands/AllocateAndPickOrderLine.cs` | B-1,B-2 | ⬜ Pending |
| B-9 | **NEW** `LoadOrderLine.cs`: load 1 OrderDetail (Picked → Loaded). Post InventTrans STAGING→SHIPPING | `OrderDetails/Commands/LoadOrderLine.cs` | B-2 | ⬜ Pending |
| B-10 | **REWRITE** `WeighOutOrder.cs`: accept `OrderDetailId` + `WeightKg`. Cascading: chain via PreviousLogId, Gross=prev Tare. Update OrderDetail.WeighedQtyKg. Precondition: Line = Loaded | `Orders/Commands/WeighOutOrder.cs` | B-3,B-5 | ⬜ Pending |
| B-11 | **MODIFY** `ShipOrder.cs`: require ALL lines LineStatus = Weighed. Post DEDUCTED + reverse EXPECTED | `Orders/Commands/ShipOrder.cs` | B-1,B-2 | ⬜ Pending |
| B-12 | **DEPRECATE** `AllocateOrder.cs`: keep functional, internally loop AllocateAndPickOrderLine per line | `Orders/Commands/AllocateOrder.cs` | B-8 | ⬜ Pending |
| B-13 | **DEPRECATE** `PickOrder.cs`: keep functional, internally no-op if lines already picked | `Orders/Commands/PickOrder.cs` | B-8 | ⬜ Pending |
| B-14 | **DEPRECATE** `LoadOrder.cs`: keep functional, internally loop LoadOrderLine per Picked line | `Orders/Commands/LoadOrder.cs` | B-9 | ⬜ Pending |

---

## Phase 4: Backend — Controllers & API

| # | Task | Files | Deps | Status |
|---|------|-------|------|--------|
| B-15 | Add `POST /order-details/{id}/allocate-and-pick` endpoint | `OrderDetailsController.cs` | B-8 | ⬜ Pending |
| B-16 | Add `POST /order-details/{id}/load` endpoint | `OrderDetailsController.cs` | B-9 | ⬜ Pending |
| B-17 | Update `POST /orders/{id}/weigh-in` — new precondition | `OrdersController.cs` | B-7 | ⬜ Pending |
| B-18 | Update `POST /orders/{id}/weigh-out` — new params (OrderDetailId, WeightKg) | `OrdersController.cs` | B-10 | ⬜ Pending |
| B-19 | Update `GetOrderById` query: include cascading WBLogs (N per order), per-line WBLog links | `Queries/GetOrderById.cs` | B-3 | ⬜ Pending |

---

## Phase 5: Frontend

| # | Task | Files | Deps | Status |
|---|------|-------|------|--------|
| F-1 | Update `OrderStatus` + `OrderDetailStatus` enum constants | `data/schema.ts` | B-1,B-2 | ⬜ Pending |
| F-2 | Update Order grid row actions visibility (Weigh-In on Draft/Confirmed, Ship only when all Weighed) | `config/orders-list.config.ts` | F-1 | ⬜ Pending |
| F-3 | Add `allocateAndPickLine`, `loadLine` API methods + update `weighOutOrder` params | `api/orders.ts` | B-15,B-16,B-18 | ⬜ Pending |
| F-4 | Add mutation hooks for new per-line APIs | `api/orders-queries.ts` | F-3 | ⬜ Pending |
| F-5 | **REWRITE** `order-weigh-dialog.tsx`: WEIGH-OUT needs OrderDetail/SKU selector, show cascading chain (prev weights), display calculated Net | `components/order-weigh-dialog.tsx` | F-3 | ⬜ Pending |
| F-6 | Add per-line action buttons in Order Detail view: Allocate+Pick, Load, Weigh-Out per row | New component or modify detail view | F-3 | ⬜ Pending |
| F-7 | Update i18n (en + vi): new labels for per-line actions, simplified statuses, cascading weigh messages | `i18n/locales/en/orders.json`, `vi/orders.json` | — | ⬜ Pending |

---

## Phase 6: Testing & Verification

| # | Task | Deps | Status |
|---|------|------|--------|
| T-1 | Unit tests: AllocateAndPickOrderLine (FIFO, insufficient inventory, wrong status) | B-8 | ⬜ Pending |
| T-2 | Unit tests: LoadOrderLine (status transitions, InventTrans pairs) | B-9 | ⬜ Pending |
| T-3 | Unit tests: WeighOutOrder cascading (1 SKU, 2 SKU, N SKU, chain validation) | B-10 | ⬜ Pending |
| T-4 | Unit tests: WeighInOrder new preconditions | B-7 | ⬜ Pending |
| T-5 | Unit tests: ShipOrder requires all lines Weighed | B-11 | ⬜ Pending |
| T-6 | Integration: full interleaved flow (WEIGH-IN → [ALLOC+PICK → LOAD → WEIGH-OUT] × N → SHIP) | All | ⬜ Pending |
| T-7 | Frontend: verify per-line action buttons + cascading weigh-out dialog | F-5,F-6 | ⬜ Pending |

---

## Summary

| Category | Count |
|----------|-------|
| Document updates | 4 |
| Backend — Domain/Enums | 4 |
| Backend — Infrastructure | 2 |
| Backend — Commands | 8 |
| Backend — Controllers/API | 5 |
| Frontend | 7 |
| Testing | 7 |
| **Total** | **37** |

---

## Execution Order

```
Phase 0: Documents (D-1 → D-4)              ← Review
    ↓
Phase 1: Domain + Enums (B-1 → B-4)         ← Foundation changes
    ↓
Phase 2: Infrastructure (B-5 → B-6)         ← DB migration
    ↓
Phase 3: Commands (B-7 → B-14)              ← Core logic
    │
    ├── B-7 (WeighIn)      ─┐
    ├── B-8 (AllocatePick)  ├── Can parallelize
    ├── B-9 (LoadLine)      ├── (independent commands)
    ├── B-10 (WeighOut)    ─┘
    ├── B-11 (Ship)         ← After B-10
    └── B-12,B-13,B-14      ← Deprecation wrappers
    ↓
Phase 4: Controllers (B-15 → B-19)          ← API layer
    ↓
Phase 5: Frontend (F-1 → F-7)               ← UI
    ↓
Phase 6: Testing (T-1 → T-7)                ← Verification
```
