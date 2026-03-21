# Plan: Phase 4 Operations — Inbound / Outbound / Transfer

## Summary

Implement the full operational layer for TVL SWM: Purchase Order → Receipt → Putaway (Inbound), Sale Order → Order → Allocation → Pick → Load → Ship (Outbound), and Transfer + Inventory Adjustment workflows. All domain entities, EF configurations, and enums already exist. This plan covers Application layer (CQRS handlers, DTOs, mappings, validators), API controllers, QueryConfigs, Constants, BusinessRules, and Frontend feature modules.

## Requirements

### Track 4A: Inbound (PO → Receipt → Putaway)
- PurchaseOrder CRUD with status machine (Draft → Confirmed → PartialReceived → Received → Closed → Cancelled)
- PurchaseOrderLine CRUD with lot attributes
- PO Confirm → post InventTrans EXPECTED
- InboundReceipt CRUD with auto-number
- InboundReceiptLine with lot assignment via ILotService.GetOrCreateLotAsync()
- Receipt → InventTrans PHYSICAL at RECEIVING + reverse EXPECTED
- Weighbridge integration for net weight
- Over-receipt tolerance check
- WorkHeader/WorkLine CRUD (PUTAWAY type)
- Putaway → InventTrans pair (RECV → STORAGE)
- Work order self-claim and completion

### Track 4B: Outbound (SO → Order → Allocation → Ship)
- SaleOrder CRUD with status machine (Draft → Confirmed → Allocated → Picking → Loaded → Shipped → Cancelled)
- SaleOrderDetail with immutable original_qty after approval
- SO Approve → post InventTrans EXPECTED (-qty)
- OrderHeader CRUD (1 per vehicle, auto-number)
- OrderDetail with multi-stage qty tracking
- FIFO allocation engine via IAllocationService
- AllocationRecord management with expiry
- Pick → InventTrans pair (STORAGE → STAGING) + work orders
- Load → InventTrans pair (STAGING → SHIPPING)
- Weighbridge verification (weight capture only)
- Ship → InventTrans DEDUCTED + reverse EXPECTED
- Post-ship residual cleanup

### Track 4C: Transfer + Inventory Adjustment
- TransferHeader CRUD with status machine
- TransferLine with planned/shipped/received qty tracking
- Transfer Ship → InventTrans DEDUCTED at source + PHYSICAL at TRANSIT
- Transfer Receive → InventTrans DEDUCTED at TRANSIT + PHYSICAL at dest
- Lot preservation across warehouses
- Transit loss → auto adjustment
- Inventory Adjustment approval workflow (extends Phase 3)

## Impact Analysis

### Files to Create (~120+ files)

**Backend Constants (3 files)**:
- `Constants/PurchaseOrderConsts.cs`, `SaleOrderConsts.cs`, `TransferConsts.cs`

**Backend BusinessRules (3 files)**:
- `BusinessRule.Inbound.cs`, `BusinessRule.Outbound.cs`, `BusinessRule.Transfer.cs`

**Backend Application - Track 4A (~25 files)**:
- `Features/Inbound/PurchaseOrders/Commands/` (Create, Update, Confirm, Close)
- `Features/Inbound/PurchaseOrders/Queries/` (GetById, GetList, GetLookup)
- `Features/Inbound/PurchaseOrders/Dtos/`, `Mappings/`
- `Features/Inbound/PurchaseOrderLines/Commands/` (AddLine, UpdateLine, RemoveLine)
- `Features/Inbound/InboundReceipts/Commands/` (Create, Receive)
- `Features/Inbound/InboundReceipts/Queries/` (GetById, GetList)
- `Features/Inbound/InboundReceipts/Dtos/`, `Mappings/`
- `Features/Inbound/InboundReceiptLines/Commands/` (Update, ReceiveLine)
- `Features/Inbound/WorkOrders/Commands/` (Claim, Complete)
- `Features/Inbound/WorkOrders/Queries/` (GetById, GetList)
- `Features/Inbound/WorkOrders/Dtos/`, `Mappings/`

**Backend Application - Track 4B (~30 files)**:
- `Features/Outbound/SaleOrders/Commands/` (Create, Update, Approve)
- `Features/Outbound/SaleOrders/Queries/` (GetById, GetList, GetLookup)
- `Features/Outbound/SaleOrders/Dtos/`, `Mappings/`
- `Features/Outbound/SaleOrderDetails/Commands/` (AddDetail, UpdateDetail)
- `Features/Outbound/Orders/Commands/` (Create, Update, Allocate, Pick, Load, Ship)
- `Features/Outbound/Orders/Queries/` (GetById, GetList)
- `Features/Outbound/Orders/Dtos/`, `Mappings/`
- `Features/Outbound/OrderDetails/Commands/` (Update, AllocateDetail)
- `Features/Outbound/Allocations/Commands/` (Cancel)
- `Features/Outbound/Allocations/Queries/` (GetList)

**Backend Application - Track 4C (~15 files)**:
- `Features/Transfers/Commands/` (Create, Update, Approve, Ship, Receive, Close)
- `Features/Transfers/Queries/` (GetById, GetList)
- `Features/Transfers/Dtos/`, `Mappings/`
- `Features/Transfers/TransferLines/Commands/` (AddLine, UpdateLine, RemoveLine)

**API Controllers (6 files)**:
- `PurchaseOrdersController.cs`
- `InboundReceiptsController.cs`
- `WorkOrdersController.cs`
- `SaleOrdersController.cs`
- `OrdersController.cs`
- `TransfersController.cs`

**QueryConfigs (6 files)**:
- `PurchaseOrders.json`, `InboundReceipts.json`, `WorkOrders.json`
- `SaleOrders.json`, `Orders.json`, `Transfers.json`

**Frontend Features (3 modules, ~36 files each track)**:
- `features/purchase-orders/` (api, components, config, data, index)
- `features/inbound-receipts/`
- `features/sale-orders/`
- `features/orders/`
- `features/transfers/`
- Route files, i18n locale files, sidebar registration

### Files to Modify
- `IAppDbContext.cs` — already has DbSets (no change needed)
- `sidebar-data.ts` — add Inbound, Outbound, Transfer nav groups
- `i18n/index.ts` — register new namespaces
- `i18n-helpers.ts` — add namespace prefixes

### Database Changes
- No new migrations needed (entities + EF configs already exist from Phase 3 EF migration)

### Breaking Changes
- None — all new endpoints and features

## Architecture Decisions

### ADR-4.1: Status Machines as Command Pattern
Each status transition is a dedicated command (ConfirmPO, ApproveSO, ShipTransfer, etc.) rather than a generic "update status" endpoint. This ensures business rules are enforced per transition.

### ADR-4.2: Shared WorkHeader/WorkLine
WorkHeader/WorkLine entities live in Inbound namespace but are used by all tracks via WorkType enum (Putaway, Pick, Move). Single controller with workType filter. Track 4A creates base CRUD, 4B/4C extend with their work types.

### ADR-4.3: InventTrans Integration
All inventory movements go through IInventTransService. Commands call the service directly — no domain events for inventory posting (keeps it simple and transactional).

### ADR-4.4: FIFO Allocation
Outbound allocation uses IAllocationService.AllocateFifoAsync() from Phase 3B. AllocationRecord tracks per-location allocations with expiry.

### ADR-4.5: Nested Create Pattern
PO and SO create commands include lines/details in a single transaction. Separate AddLine/AddDetail commands exist for post-creation additions.

### ADR-4.6: Frontend Feature Per Entity Group
Each major entity group gets its own frontend feature module. PO and Receipt are separate features. SO and Order are separate features.

## Execution Plan

### Phase 1: Backend Shared (Constants + BusinessRules)
Agent: `/backend`
- Create Constants files for all Phase 4 entities
- Create BusinessRule partial classes

### Phase 2: Backend Track 4A + 4B + 4C (Parallel)
Agent: `/backend` x3 (parallel subagents)
- Track 4A: PurchaseOrders → InboundReceipts → WorkOrders (sequential within track)
- Track 4B: SaleOrders → Orders → Allocations (sequential within track)
- Track 4C: Transfers (single sequential flow)

### Phase 3: Backend Controllers + QueryConfigs
Agent: `/backend`
- All 6 controllers
- All 6 QueryConfigs

### Phase 4: Frontend (Parallel per track)
Agent: `/frontend` x3 (parallel subagents)
- Track 4A: purchase-orders, inbound-receipts features
- Track 4B: sale-orders, orders features
- Track 4C: transfers feature
- Shared: sidebar, i18n registration

### Phase 5: Review
Agent: `/reviewer`

### Phase 6: Testing
Agent: `/tester`

## Notes & Risks

- **HIGH RISK**: Complex status machines with InventTrans integration — must test all state transitions
- **MEDIUM RISK**: FIFO allocation correctness under concurrent access (mitigated by Phase 3 advisory locks)
- **MEDIUM RISK**: Cross-track WorkHeader/WorkLine coordination — must avoid conflicting patterns
- **LOW RISK**: Frontend is standard CRUD pattern, low complexity
- **Dependencies**: IInventTransService, IAllocationService, ILotService, IWeighbridgeService, INumberSequenceService all from Phase 3
