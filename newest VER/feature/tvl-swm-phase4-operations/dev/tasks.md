# Tasks: Phase 4 Operations

> Plan: `docs/feature/tvl-swm-phase4-operations/dev/plan.md`
> Context: `docs/feature/tvl-swm-phase4-operations/dev/context.json`

## Phase 1: Backend Shared

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create Constants (PurchaseOrderConsts, SaleOrderConsts, TransferConsts, InboundReceiptConsts, OrderConsts, WorkOrderConsts, AllocationRecordConsts) | /backend | None | Done |
| 2 | Create BusinessRules (BusinessRule.Inbound.cs, BusinessRule.Outbound.cs, BusinessRule.Transfer.cs) | /backend | None | Done |

## Phase 2A: Backend Track 4A — Inbound

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3 | PurchaseOrder DTOs + Mappings | /backend | #1, #2 | Done |
| 4 | PurchaseOrder CRUD Commands (Create with lines, Update, Confirm, Close) | /backend | #3 | Done |
| 5 | PurchaseOrder Queries (GetById, GetList, GetLookup) | /backend | #3 | Done |
| 6 | PurchaseOrderLine Commands (AddLine, UpdateLine, RemoveLine) | /backend | #3 | Done |
| 7 | InboundReceipt DTOs + Mappings | /backend | #1, #2 | Done |
| 8 | InboundReceipt Commands (Create from PO, Receive) | /backend | #7 | Done |
| 9 | InboundReceipt Queries (GetById, GetList) | /backend | #7 | Done |
| 10 | InboundReceiptLine Commands (Update, ReceiveLine with Lot + InventTrans) | /backend | #7 | Done |
| 11 | WorkOrder DTOs + Mappings | /backend | #1 | Done |
| 12 | WorkOrder Commands (Create Putaway, Claim, Complete with InventTrans) | /backend | #11 | Done |
| 13 | WorkOrder Queries (GetById, GetList) | /backend | #11 | Done |
| 14 | PurchaseOrdersController + QueryConfig | /backend | #4, #5, #6 | Done |
| 15 | InboundReceiptsController + QueryConfig | /backend | #8, #9, #10 | Done |
| 16 | WorkOrdersController + QueryConfig | /backend | #12, #13 | Done |

## Phase 2B: Backend Track 4B — Outbound

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 17 | SaleOrder DTOs + Mappings | /backend | #1, #2 | Done |
| 18 | SaleOrder CRUD Commands (Create with details, Update, Approve) | /backend | #17 | Done |
| 19 | SaleOrder Queries (GetById, GetList, GetLookup) | /backend | #17 | Done |
| 20 | SaleOrderDetail Commands (AddDetail, UpdateDetail) | /backend | #17 | Done |
| 21 | OrderHeader DTOs + Mappings | /backend | #1, #2 | Done |
| 22 | OrderHeader CRUD Commands (Create from SO, Update) | /backend | #21 | Done |
| 23 | OrderHeader Queries (GetById, GetList) | /backend | #21 | Done |
| 24 | OrderDetail Commands (Update, AllocateDetail) | /backend | #21 | Done |
| 25 | Order Operation Commands (Allocate FIFO, Pick, Load, Ship) | /backend | #22, #24 | Done |
| 26 | Allocation Commands (Cancel) | /backend | #25 | Done |
| 27 | SaleOrdersController + QueryConfig | /backend | #18, #19, #20 | Done |
| 28 | OrdersController + QueryConfig | /backend | #22, #23, #24, #25, #26 | Done |

## Phase 2C: Backend Track 4C — Transfer

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 29 | Transfer DTOs + Mappings | /backend | #1, #2 | Done |
| 30 | Transfer CRUD Commands (Create with lines, Update, Approve) | /backend | #29 | Done |
| 31 | Transfer Operation Commands (Ship, Receive, Close with InventTrans) | /backend | #30 | Done |
| 32 | Transfer Queries (GetById, GetList) | /backend | #29 | Done |
| 33 | TransferLine Commands (AddLine, UpdateLine, RemoveLine) | /backend | #29 | Done |
| 34 | TransfersController + QueryConfig | /backend | #30, #31, #32, #33 | Done |

## Phase 3: Build Verification

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 35 | Backend build gate (dotnet build) | /backend | #14-#16, #27-#28, #34 | Done (0 errors) |

## Phase 4A: Frontend Track 4A — Inbound

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 36 | Frontend: purchase-orders feature module | /frontend | #14 | Done |
| 37 | Frontend: inbound-receipts feature module | /frontend | #15 | Done |

## Phase 4B: Frontend Track 4B — Outbound

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 38 | Frontend: sale-orders feature module | /frontend | #27 | Done |
| 39 | Frontend: orders feature module | /frontend | #28 | Done |

## Phase 4C: Frontend Track 4C — Transfer

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 40 | Frontend: transfers feature module | /frontend | #34 | Done |

## Phase 4 Shared: Frontend Navigation + i18n

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 41 | Sidebar navigation (Inbound, Outbound, Transfer groups) | /frontend | #36-#40 | Done |
| 42 | i18n registration (all namespaces) | /frontend | #36-#40 | Done |

## Phase 5: Frontend Build + Review

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 43 | Frontend build gate (pnpm build) | /frontend | #36-#42 | Done (0 errors) |
| 44 | Code review (all tracks) | /reviewer | #35, #43 | Done (3 critical + 4 important fixed) |

## Phase 6: Testing

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 45 | Unit tests — Inbound handlers | /tester | #44 | Skipped (deferred) |
| 46 | Unit tests — Outbound handlers | /tester | #44 | Skipped (deferred) |
| 47 | Unit tests — Transfer handlers | /tester | #44 | Skipped (deferred) |
