# Tasks: UOM Conversion & Weight Tracking in Inventory

> Plan: `docs/feature/uom-weight-onhand/dev/plan.md`
> Context: `docs/feature/uom-weight-onhand/dev/context.json`
> Spec: `docs/feature/uom-weight-onhand/ba/spec.md`

---

## Phase 1: Domain + Infrastructure (Sequential — blocks all)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1.1 | **Entity: Item** — Add `BaseUomId` (Guid, required), `WeightUomId` (Guid?, nullable). Add navigation `BaseUom`, `WeightUom` to `Uom`. Keep `DefaultUom`/`BagShellWeightKg` for backward compat | /backend | None | Done |
| 1.2 | **Entity: UomConversion** — Add `PackagingWeightKg` (decimal, default 0), `NetWeightPerUnitKg` (decimal?, null), `GrossWeightPerUnitKg` (decimal?, null) | /backend | None | Done |
| 1.3 | **Entity: InventTrans** — Add `UomId` (Guid, required), `GrossWeightKg` (decimal?, null). Rename `QtyMt` → `NetWeightKg`. Add navigation `Uom` | /backend | None | Done |
| 1.4 | **Entity: OnHand** — Add `NetWeightKg` (decimal, default 0), `GrossWeightKg` (decimal, default 0) | /backend | None | Done |
| 1.5 | **Entity: PurchaseOrderLine** — Add 7 fields: `TransactionQty`, `TransactionUomId`, `BaseQty`, `BaseUomId`, `ConversionFactor`, `PackagingWeightKg`, `GrossWeightKg` | /backend | None | Done |
| 1.6 | **Entity: InboundReceiptLine** — Add same 7 fields | /backend | None | Done |
| 1.7 | **Entity: SaleOrderDetail** — Add same 7 fields | /backend | None | Done |
| 1.8 | **Entity: OrderDetail** — Add same 7 fields | /backend | None | Done |
| 1.9 | **Entity: TransferLine** — Add 7 conversion fields + 6 weight loss fields: `ShippedNetWeightKg`, `ShippedGrossWeightKg`, `ReceivedNetWeightKg`, `ReceivedGrossWeightKg`, `WeightLossKg`, `WeightLossPct` | /backend | None | Done |
| 1.10 | **EF Config: Item** — Map `BaseUomId` (FK → Uom, restrict), `WeightUomId` (FK → Uom, restrict, optional) | /backend | 1.1 | Done |
| 1.11 | **EF Config: UomConversion** — Map 3 new fields with precision(18,4) | /backend | 1.2 | Done |
| 1.12 | **EF Config: InventTrans** — Map `UomId` (FK → Uom), rename column `qty_mt`→`net_weight_kg`, add `gross_weight_kg` | /backend | 1.3 | Done |
| 1.13 | **EF Config: OnHand** — Map `net_weight_kg` precision(18,4) default 0, `gross_weight_kg` precision(18,4) default 0 | /backend | 1.4 | Done |
| 1.14 | **EF Config: PurchaseOrderLine** — Map 7 fields with FK constraints | /backend | 1.5 | Done |
| 1.15 | **EF Config: InboundReceiptLine** — Map 7 fields | /backend | 1.6 | Done |
| 1.16 | **EF Config: SaleOrderDetail** — Map 7 fields | /backend | 1.7 | Done |
| 1.17 | **EF Config: OrderDetail** — Map 7 fields | /backend | 1.8 | Done |
| 1.18 | **EF Config: TransferLine** — Map 13 fields | /backend | 1.9 | Done |
| 1.19 | **Migration** — Generate EF migration `AddUomWeightFields`. Verify SQL: rename column `qty_mt`→`net_weight_kg`, add defaults, add FKs | /backend | 1.10–1.18 | Done |
| 1.20 | **InventTransCommand** — Update record: add `UomId` (Guid), rename `QtyMt`→`NetWeightKg`, add `GrossWeightKg` (decimal?) | /backend | 1.3 | Done |
| 1.21 | **InventTransService** — Update `PostInternalAsync` and `PostReversalBatchAsync` to map new fields to entity | /backend | 1.20 | Done |
| 1.22 | **UomService** — Add `GetConversionInfoAsync(Guid itemId, Guid transactionUomId, Guid baseUomId)` → returns `UomConversionInfo(decimal Factor, decimal PackagingWeightKg, decimal? NetWeightPerUnitKg)`. Lookup `UomConversion` where `ItemId + FromUomId + ToUomId` | /backend | 1.2 | Done |
| 1.23 | **IUomService** — Add interface method for `GetConversionInfoAsync` | /backend | 1.22 | Done |
| 1.24 | **MaterializationWorker** — In `UpsertOnHandAsync`, add weight accumulation alongside PhysicalQty: `+= trans.NetWeightKg ?? 0` and `+= trans.GrossWeightKg ?? 0` for positive cases; `-=` for negative | /backend | 1.4, 1.3 | Done |

---

## Phase 2: Application Handlers (Sequential after Phase 1)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2.1 | **Item CRUD** — Update `CreateItem`/`UpdateItem` commands: require `BaseUomId`, optional `WeightUomId`. Update `ItemDto` and `ItemMappings`. Update validators | /backend | 1.1, 1.10 | Done |
| 2.2 | **UomConversion CRUD** — Update `CreateUomConversion`/`UpdateUomConversion` commands: accept `PackagingWeightKg`, `NetWeightPerUnitKg`, `GrossWeightPerUnitKg`. Update `UomConversionDto` and mappings | /backend | 1.2, 1.11 | Done |
| 2.3 | **PO Confirm** — `ConfirmPurchaseOrder`: Use `line.BaseQty` (if populated) or `line.ExpectedQtyKg` (fallback) for InventTrans.Qty. Pass `UomId = item.BaseUomId`. Pass `NetWeightKg = line.NetWeightKg`, `GrossWeightKg = line.GrossWeightKg` | /backend | 1.20, 1.21 | Done |
| 2.4 | **PO Line Create/Update** — When creating PO line with `TransactionUomId` ≠ `BaseUomId`: call `UomService.GetConversionInfoAsync()`, snapshot ConversionFactor + PackagingWeightKg, auto-calc BaseQty. When same UOM: factor=1.0, packaging from ItemUom or 0 | /backend | 1.5, 1.22 | Done |
| 2.5 | **Receipt Line Create** — Same conversion snapshot logic as PO Line | /backend | 1.6, 1.22 | Done |
| 2.6 | **WeighOut Inbound** — Refactor to use `ItemGroup.WeighbridgeQtyUom` config to decide which fields receive weighbridge values: **(A)** If `line.TransactionUomId` matches `ItemGroup.WeighbridgeQtyUom` (bulk): weighbridge updates **both** qty (`TransactionQty` = proportional cargo, recalc `BaseQty = TransactionQty × ConversionFactor`) AND weight (`NetWeightKg`, `GrossWeightKg`). **(B)** If not match (non-bulk, e.g. BAG): weighbridge updates **only weight** fields (`NetWeightKg`, `GrossWeightKg` with BagNetWeightMode logic). Qty stays as entered. Also store `GrossWeightKg` on line (= weighbridge gross before tare deduction for this line's proportion) | /backend | 1.6, 1.22 | Done |
| 2.7 | **Receive Inbound Receipt** — Post InventTrans with `Qty = line.BaseQty` (already converted to base unit by WeighOut/creation), `UomId = item.BaseUomId`, `NetWeightKg = line.NetWeightKg`, `GrossWeightKg = line.GrossWeightKg` | /backend | 1.20, 2.5 | Done |
| 2.8 | **Receive Inbound Receipt Line** — Same as 2.7 for single-line flow | /backend | 1.20, 2.5 | Done |
| 2.9 | **SO Detail Create** — Conversion snapshot when creating SO Detail | /backend | 1.7, 1.22 | Done |
| 2.10 | **Order Detail Create** — Conversion snapshot when creating Order Detail | /backend | 1.8, 1.22 | Done |
| 2.11 | **Outbound Ship** — Post InventTrans with `Qty = BaseQty`, pass weights. Update all outbound handlers that call InventTransService | /backend | 1.20 | Done |
| 2.12 | **Transfer Line Create** — Conversion snapshot fields | /backend | 1.9, 1.22 | Done |
| 2.13 | **Transfer Ship** — Store `ShippedNetWeightKg`, `ShippedGrossWeightKg` from weighbridge. Post InventTrans with BaseQty + weights | /backend | 1.9, 1.20 | Done |
| 2.14 | **Transfer Receive** — Store `ReceivedNetWeightKg`, `ReceivedGrossWeightKg`. Auto-calc `WeightLossKg = Shipped - Received`, `WeightLossPct`. Post InventTrans with received weights | /backend | 2.13 | Done |
| 2.15 | **PO Close/Unlock** — Update reversal InventTrans posts to include UomId + weight fields | /backend | 1.20 | Done |
| 2.16 | **Reject Inbound Receipt** — Update reversal InventTrans posts | /backend | 1.20 | Done |

---

## Phase 3: Query Config + Frontend (Parallel after Phase 2)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3.1 | **QueryConfig: OnHand.json** — Remove `estimated_weight_mt` and `bag_shell_weight_kg` columns. Add `net_weight_kg` (oh.net_weight_kg), `gross_weight_kg` (oh.gross_weight_kg), `net_weight_mt` (ROUND(oh.net_weight_kg/1000.0, 4)), `base_uom_code`. Add JOIN to `cat.uom bu ON i.base_uom_id = bu.id` | /backend | Phase 2 | Done |
| 3.2 | **FormConfig: INVOHG01.json** — Add columns for `netWeightKg`, `grossWeightKg`, `netWeightMt`, `baseUomCode`. Remove `estimatedWeightMt`, `bagShellWeightKg` | /backend | 3.1 | Done |
| 3.3 | **Frontend: on-hand.ts** — Update Zod schema: remove `estimatedWeightMt`, `bagShellWeightKg`. Add `netWeightKg`, `grossWeightKg`, `netWeightMt`, `baseUomCode` (all z.number/z.string optional nullable) | /frontend | 3.1 | Done |
| 3.4 | **Frontend: i18n** — Update `en/on-hand.json` and `vi/on-hand.json`: add labels "Net Weight (KG)"/"T.L Tịnh (KG)", "Gross Weight (KG)"/"T.L Tổng (KG)", "Net Weight (MT)"/"T.L Tịnh (MT)", "Base UOM"/"ĐVT Cơ sở". Remove deprecated labels | /frontend | 3.3 | Done |

---

## Phase 4: Data Migration + Verification

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 4.1 | **Data Migration Script** — SQL backfill script at `backend/scripts/backfill_uom_weight_fields.sql`. Sets BaseUomId=KG for items, UomId=KG for InventTrans, backfills conversion snapshot on all document lines, migrates BagShellWeightKg → PackagingWeightKg | /backend | Phase 3 | Done |
| 4.2 | **Admin Review UI** — Add BaseUomId + WeightUomId fields to Item create/edit form (SelectField with 'uoms' dataSource). Fix GetItemById to Include BaseUom/WeightUom navigations. Add baseUomName to Items grid + QueryConfig | /frontend + /backend | 2.1 | Done |
| 4.3 | **OnHand Rebuild** — Trigger OnHand rebuild via existing `POST /api/inventory/rebuild` endpoint after running backfill script + migration | /backend | 4.1 | Done (operational — run manually after deploy) |
| 4.4 | **Verification** — Compare OnHand totals before/after rebuild. Verify weight columns populated correctly | /backend | 4.3 | Done (operational — verify after deploy) |

---

## Phase 5: Review + Test

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 5.1 | **Code Review** — Review all backend + frontend changes against plan. Found 2 critical + 4 important issues, all fixed | /reviewer | Phase 3, 4 | Done |
| 5.2 | **Test Scenarios** — Unit tests for UomService.GetConversionInfoAsync, MaterializationWorker weight accumulation, conversion snapshot on document lines, weight loss calculation | /tester | Phase 3 | Deferred (no test framework in project yet) |

---

## Summary

| Phase | Tasks | Agent(s) | Parallel? |
|-------|-------|----------|-----------|
| Phase 1 | 1.1–1.24 | /backend | Tasks 1.1–1.9 parallel, rest sequential |
| Phase 2 | 2.1–2.16 | /backend | 2.1+2.2 parallel, rest mostly sequential |
| Phase 3 | 3.1–3.4 | /backend + /frontend | 3.1–3.2 (BE) ∥ 3.3–3.4 (FE) after Phase 2 |
| Phase 4 | 4.1–4.4 | /backend + /frontend | 4.1 → 4.3 → 4.4 sequential. 4.2 parallel |
| Phase 5 | 5.1–5.2 | /reviewer + /tester | Parallel |
