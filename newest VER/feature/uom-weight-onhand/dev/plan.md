# Plan: UOM Conversion & Weight Tracking in Inventory

## Summary

Extend inventory system to support multi-UOM per item with a mandatory Base Unit, accumulate actual net/gross weight from weighbridge into OnHand, snapshot conversion info on all document lines, and track weight loss on transfers. Core change: `UomConversion` gains weight fields, `InventTrans.Qty` becomes Base Unit-only, `OnHand` gains weight accumulators.

## Requirements

- **REQ-1**: Item must have `BaseUomId` — Base Unit for inventory. All `InventTrans.Qty` and `OnHand.PhysicalQty` are in this unit.
- **REQ-2**: `UomConversion` extended with `PackagingWeightKg`, `NetWeightPerUnitKg`, `GrossWeightPerUnitKg` per (Item, FromUom, ToUom).
- **REQ-3**: Document lines (PO Line, Receipt Line, SO Detail, Order Detail, Transfer Line) store conversion snapshot: `TransactionQty`, `TransactionUomId`, `BaseQty`, `BaseUomId`, `ConversionFactor`, `PackagingWeightKg`, `GrossWeightKg`.
- **REQ-4**: `InventTrans` gains `UomId`, `GrossWeightKg`; rename `QtyMt` → `NetWeightKg`.
- **REQ-5**: `OnHand` gains `NetWeightKg`, `GrossWeightKg` (accumulated via MaterializationWorker).
- **REQ-6**: On Hand view displays actual net weight (KG, MT) and gross weight from weighbridge.
- **REQ-7**: TransferLine tracks weight loss: `ShippedNetWeightKg`, `ReceivedNetWeightKg`, `WeightLossKg`, `WeightLossPct`.
- **REQ-8**: Admin reviews each item to set `BaseUomId` (not bulk default).

## Impact Analysis

### Files to Create

| File | Layer | Description |
|------|-------|-------------|
| `Migration: AddUomWeightFields` | Infrastructure | Add all new DB columns + rename `qty_mt` |

### Files to Modify

**Domain Entities (7 files)**:

| File | Changes |
|------|---------|
| `Domain/Entities/MasterData/Item.cs` | Add `BaseUomId`, `WeightUomId`. Navigation to `Uom` |
| `Domain/Entities/Foundation/UomConversion.cs` | Add `PackagingWeightKg`, `NetWeightPerUnitKg`, `GrossWeightPerUnitKg` |
| `Domain/Entities/Inventory/InventTrans.cs` | Add `UomId`, `GrossWeightKg`. Rename `QtyMt` → `NetWeightKg` |
| `Domain/Entities/Inventory/OnHand.cs` | Add `NetWeightKg`, `GrossWeightKg` |
| `Domain/Entities/Inbound/PurchaseOrderLine.cs` | Add 7 conversion snapshot fields |
| `Domain/Entities/Inbound/InboundReceiptLine.cs` | Add 7 conversion snapshot fields |
| `Domain/Entities/Outbound/SaleOrderDetail.cs` | Add 7 conversion snapshot fields |
| `Domain/Entities/Outbound/OrderDetail.cs` | Add 7 conversion snapshot fields |
| `Domain/Entities/Transfer/TransferLine.cs` | Add 7 conversion + 6 weight loss fields |

**EF Configurations (9 files)**:

| File | Changes |
|------|---------|
| `Configurations/MasterData/ItemConfiguration.cs` | Map `BaseUomId`, `WeightUomId` + FK to Uom |
| `Configurations/Foundation/UomConversionConfiguration.cs` | Map 3 new weight fields |
| `Configurations/Inventory/InventTransConfiguration.cs` | Map `UomId`, rename column, add `GrossWeightKg` |
| `Configurations/Inventory/OnHandConfiguration.cs` | Map `NetWeightKg`, `GrossWeightKg` |
| `Configurations/Inbound/PurchaseOrderLineConfiguration.cs` | Map 7 fields |
| `Configurations/Inbound/InboundReceiptLineConfiguration.cs` | Map 7 fields |
| `Configurations/Outbound/SaleOrderDetailConfiguration.cs` | Map 7 fields |
| `Configurations/Outbound/OrderDetailConfiguration.cs` | Map 7 fields |
| `Configurations/Transfer/TransferLineConfiguration.cs` | Map 13 fields |

**Application Layer (10+ files)**:

| File | Changes |
|------|---------|
| `InventTrans/InventTransCommand.cs` | Add `UomId`, rename `QtyMt`→`NetWeightKg`, add `GrossWeightKg` |
| `Services/InventTransService.cs` | Pass new fields to entity creation |
| `Services/MaterializationWorker.cs` | Accumulate `NetWeightKg`, `GrossWeightKg` into OnHand |
| `Services/UomService.cs` | Add `GetConversionInfoAsync()` returning factor + weight fields |
| `Services/Abstractions/IUomService.cs` | Add new method signature |
| `Features/Inbound/InboundReceipts/Commands/ReceiveInboundReceipt.cs` | Use BaseQty from line, pass weights to InventTrans |
| `Features/Inbound/InboundReceipts/Commands/WeighOutInboundReceipt.cs` | Store GrossWeightKg on line |
| `Features/Inbound/InboundReceiptLines/Commands/ReceiveInboundReceiptLine.cs` | Use BaseQty from line |
| `Features/Inbound/PurchaseOrders/Commands/ConfirmPurchaseOrder.cs` | Use BaseQty from line |
| `Features/Outbound/*` (ship, allocate handlers) | Use BaseQty, pass weights |
| `Features/Transfer/*` (ship, receive handlers) | Use BaseQty, calc weight loss |
| `Features/MasterData/Items/Commands/CreateItem.cs` | Require BaseUomId |
| `Features/MasterData/Items/Commands/UpdateItem.cs` | Require BaseUomId |
| `Features/Foundation/UomConversions/Commands/Create/Update` | Handle new weight fields |
| `Features/Foundation/UomConversions/Dtos/UomConversionDto.cs` | Add weight fields |

**Query Configs**:

| File | Changes |
|------|---------|
| `QueryConfigs/OnHand.json` | Remove `estimatedWeightMt`/`bagShellWeightKg`, add `netWeightKg`, `grossWeightKg`, `netWeightMt`, `baseUomCode`. Add JOIN to `uom` table |

**Frontend**:

| File | Changes |
|------|---------|
| `features/on-hand/api/on-hand.ts` | Update Zod schema: remove deprecated, add new weight fields |
| `i18n/locales/en/on-hand.json` | Add labels for new weight columns |
| `i18n/locales/vi/on-hand.json` | Add Vietnamese labels |
| `FormConfigs/INVOHG01.json` | Add new columns, remove deprecated |

### Database Changes

- 1 migration: add columns, rename column, add FKs
- OnHand rebuild required after migration (existing endpoint)

### API Changes

- No new endpoints. Existing endpoints return new fields.
- `UomConversion` CRUD endpoints return 3 new weight fields.
- `Item` CRUD endpoints accept/return `BaseUomId`, `WeightUomId`.

### Breaking Changes

- `InventTransCommand`: signature change (add `UomId`, rename `QtyMt`)
- All callers of `InventTransService.PostAsync()` must be updated in same deployment
- `QtyMt` column renamed to `net_weight_kg` in DB — breaking for raw SQL queries

## Architecture Decisions

### ADR-1: Extend `UomConversion` Instead of New `ItemUom` Table

**Decision**: Add weight fields to existing `UomConversion` entity.

**Rationale**:
- `UomConversion` already has `(TenantId, ItemId, FromUomId, ToUomId)` — exact granularity needed
- CRUD already exists (controller, commands, queries, DTOs)
- Single source of truth for conversion + weight data
- No lookup priority ambiguity ("which table to check first?")

**Trade-off**: `UomConversion` becomes slightly overloaded (conversion + weight config). Acceptable because weight is intrinsically tied to the UOM conversion context.

### ADR-2: `ToUomId` Always = `Item.BaseUomId` for Inventory Flow

**Decision**: For inventory conversion lookups, always query `UomConversion` where `ToUomId = item.BaseUomId`.

**Rationale**: Simplifies lookup — no chain conversion needed. Direct: `FromUom → BaseUom`.

**Constraint**: Admin must configure conversions TO the base unit specifically.

### ADR-3: Snapshot Pattern on Document Lines

**Decision**: Copy `ConversionFactor`, `PackagingWeightKg`, `BaseUomId` to each document line at creation time.

**Rationale**:
- Immutability: changing UomConversion later doesn't corrupt historical documents
- Performance: no JOIN needed to reconstruct calculations
- Auditability: every line is self-contained with its conversion context

### ADR-4: Weight Always in KG (Stored), MT Derived at Display

**Decision**: All `*WeightKg` fields stored in KG. MT = `KG / 1000` computed in query/display.

**Rationale**: Single unit eliminates conversion errors. KG is the weighbridge native unit.

### ADR-5: OnHand Weight via Materialization (Not Direct Update)

**Decision**: `OnHand.NetWeightKg/GrossWeightKg` accumulated through `MaterializationWorker`, never updated directly.

**Rationale**: Follows existing event-sourced pattern. OnHand is READ MODEL — all changes via InventTrans. Supports full rebuild from InventTrans.

### ADR-6: InventTrans.Qty Semantic Change (KG → Base Unit)

**Decision**: `InventTrans.Qty` becomes "quantity in Item's Base Unit" instead of "always KG".

**Rationale**: Enables multi-UOM. Base Unit could be KG, BAG, MT, or any unit.

**Risk**: Existing InventTrans data has Qty in KG. After migration, semantics change. **Mitigation**: For existing items, set `BaseUomId = KG` so existing data remains correct.

### ADR-7: WeighOut Field Assignment Driven by ItemGroup.WeighbridgeQtyUom

**Decision**: `ItemGroup.WeighbridgeQtyUom` determines which fields on a document line receive the weighbridge result.

**Rule**:
- If `line.TransactionUomId` **matches** `ItemGroup.WeighbridgeQtyUom`:
  - **Bulk line** — weighbridge updates BOTH quantity AND weight fields:
    - `TransactionQty` = proportional cargo weight
    - `BaseQty` = `TransactionQty × ConversionFactor` (auto-recalc)
    - `NetWeightKg` = net weight from cân
    - `GrossWeightKg` = gross weight allocation
- If `line.TransactionUomId` **does NOT match** `ItemGroup.WeighbridgeQtyUom`:
  - **Non-bulk line** (e.g., BAG) — weighbridge updates ONLY weight fields:
    - `NetWeightKg` = calculated per `BagNetWeightMode` (NET: cargo - shell deduction, GROSS: cargo as-is)
    - `GrossWeightKg` = proportional gross weight allocation
    - `TransactionQty` and `BaseQty` UNCHANGED (bag count from StartUnloading)

**Rationale**: Existing pattern in `WeighOutInboundReceipt.cs` (lines 84–128) already implements this — bulk vs non-bulk split. New fields (`TransactionQty`, `BaseQty`, `GrossWeightKg`) follow the same split logic.

**Source config**: `ItemGroup.WeighbridgeQtyUom` (default "KG") + `ItemGroup.BagNetWeightMode` (default "GROSS").

## Execution Phases

### Phase 1: Backend Domain + Infrastructure (Sequential, blocks all others)

1. Modify entities (Item, UomConversion, InventTrans, OnHand, 5 document lines)
2. Modify EF configurations
3. Create migration
4. Modify InventTransCommand
5. Modify UomService (add `GetConversionInfoAsync`)
6. Modify MaterializationWorker (accumulate weights)

### Phase 2: Backend Application Handlers (Sequential after Phase 1)

7. Modify Item CRUD (require BaseUomId)
8. Modify UomConversion CRUD (handle weight fields)
9. Modify PO/Receipt handlers (use conversion snapshot + BaseQty)
10. Modify SO/Order handlers (use conversion snapshot + BaseQty)
11. Modify Transfer handlers (conversion snapshot + weight loss)
12. Modify WeighOut handlers (store GrossWeightKg)

### Phase 3: Backend Query + Frontend (Parallel after Phase 2)

13. Update OnHand.json query config
14. Update INVOHG01 form config
15. Update frontend schema, i18n, view

### Phase 4: Data Migration + Verification

16. Admin review screen for Item BaseUomId assignment
17. Data migration script (backfill existing data)
18. OnHand rebuild
19. Verification: compare before/after OnHand totals

## Notes & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `InventTransCommand` signature change breaks ALL callers | High | Single deployment, update all callers in same PR |
| Existing InventTrans data has Qty=KG, after migration "Base Unit" might differ | Medium | Set existing items `BaseUomId = KG` so data stays correct |
| OnHand rebuild takes time on large datasets | Medium | Run during off-hours, use existing rebuild endpoint |
| Rename `qty_mt` → `net_weight_kg` breaks raw SQL | Low | No known raw SQL outside QueryConfigs; search and update |
| MaterializationWorker change requires zero-downtime deploy | Medium | Deploy during low-traffic, worker auto-recovers |
| Document lines: new fields NOT NULL requires default for existing rows | Medium | Migration sets defaults: `ConversionFactor=1.0`, `PackagingWeightKg=0`, `BaseQty=existing qty` |
