# Plan: VAS (Value-Added Services) Module

> **Version**: 1.0
> **Date**: 2026-03-19
> **Status**: READY FOR IMPLEMENTATION
> **Feature Slug**: `vas`
> **Complexity**: Complex

---

## Summary

Replace the stub `bagging_work_order` / `bagging_progress` tables with a generalised VAS module supporting BAGGING, DE_BAGGING, and RE_BAGGING service types. The implementation adds 6 new domain entities with BOM-driven work orders and session-level InventTrans creation, and replaces the existing Bagging frontend with three new screens (BOM, Work Order, Session).

---

## Requirements

| # | Requirement | Source |
|---|-------------|--------|
| R-01 | 6 new tables in `ops` schema: `vas_bom`, `vas_bom_line`, `vas_work_order`, `vas_work_order_source`, `vas_session`, `vas_session_line` | BA spec §3 |
| R-02 | Drop old tables: `bagging_work_order`, `bagging_progress`; drop ENUM `bagging_status` | BA spec §10 |
| R-03 | New ENUMs: `VasType`, `VasWorkOrderStatus`, `VasSessionStatus`; extend `InventTrans.ReferenceType` with `"VAS"` | BA spec §7 |
| R-04 | CQRS vertical slices under `Application/Features/Vas/` for BOM, WorkOrder, Session | BA spec §2 |
| R-05 | Confirm WO creates `vas_work_order_source` rows + auto-creates target lot via `ILotService` | BA spec §5 |
| R-06 | Confirm Session creates InventTrans ISSUE/DEDUCTED per session_line and RECEIPT/PHYSICAL for target — all in single DB transaction | BA spec §4.2 |
| R-07 | CLIENT_OWNED packaging: skip InventTrans ISSUE (BR-VAS-005) | BA spec §6 |
| R-08 | DE_BAGGING: skip InventTrans RECEIPT for empty bags (BR-VAS-006) | BA spec §6 |
| R-09 | Complete WO triggers billing via `IBillingCaptureService.CaptureBaggingFeeAsync` (BR-VAS-008) | BA spec §6 |
| R-10 | Frontend: BOM management, Work Order list/create/confirm, Session management, WO detail page | BA spec §8 |
| R-11 | Sidebar, i18n keys (en + vi) registered for new VAS routes | Dev lesson 2026-03-09 |

---

## Impact Analysis

### Files to Create

#### Backend — Domain
- `backend/src/Smartlog.Domain/Entities/Vas/VasBom.cs`
- `backend/src/Smartlog.Domain/Entities/Vas/VasBomLine.cs`
- `backend/src/Smartlog.Domain/Entities/Vas/VasWorkOrder.cs`
- `backend/src/Smartlog.Domain/Entities/Vas/VasWorkOrderSource.cs`
- `backend/src/Smartlog.Domain/Entities/Vas/VasSession.cs`
- `backend/src/Smartlog.Domain/Entities/Vas/VasSessionLine.cs`

#### Backend — Application (CQRS Slices)
**BOM**
- `Application/Features/Vas/Bom/Commands/CreateVasBom.cs`
- `Application/Features/Vas/Bom/Commands/UpdateVasBom.cs`
- `Application/Features/Vas/Bom/Commands/ToggleVasBomStatus.cs`
- `Application/Features/Vas/Bom/Queries/GetVasBomList.cs`
- `Application/Features/Vas/Bom/Queries/GetVasBomById.cs`
- `Application/Features/Vas/Bom/Dtos/VasBomDto.cs`
- `Application/Features/Vas/Bom/Mappings/VasBomMappings.cs`

**Work Order**
- `Application/Features/Vas/WorkOrders/Commands/CreateVasWorkOrder.cs`
- `Application/Features/Vas/WorkOrders/Commands/ConfirmVasWorkOrder.cs`
- `Application/Features/Vas/WorkOrders/Commands/CompleteVasWorkOrder.cs`
- `Application/Features/Vas/WorkOrders/Commands/CancelVasWorkOrder.cs`
- `Application/Features/Vas/WorkOrders/Queries/GetVasWorkOrderList.cs`
- `Application/Features/Vas/WorkOrders/Queries/GetVasWorkOrderById.cs`
- `Application/Features/Vas/WorkOrders/Dtos/VasWorkOrderDto.cs`
- `Application/Features/Vas/WorkOrders/Mappings/VasWorkOrderMappings.cs`

**Session**
- `Application/Features/Vas/Sessions/Commands/OpenVasSession.cs`
- `Application/Features/Vas/Sessions/Commands/ConfirmVasSession.cs`
- `Application/Features/Vas/Sessions/Commands/CancelVasSession.cs`
- `Application/Features/Vas/Sessions/Queries/GetVasSessionList.cs`
- `Application/Features/Vas/Sessions/Dtos/VasSessionDto.cs`
- `Application/Features/Vas/Sessions/Mappings/VasSessionMappings.cs`

#### Backend — Infrastructure
- `Infrastructure/EntityFramework/Configurations/Vas/VasBomConfiguration.cs`
- `Infrastructure/EntityFramework/Configurations/Vas/VasBomLineConfiguration.cs`
- `Infrastructure/EntityFramework/Configurations/Vas/VasWorkOrderConfiguration.cs`
- `Infrastructure/EntityFramework/Configurations/Vas/VasWorkOrderSourceConfiguration.cs`
- `Infrastructure/EntityFramework/Configurations/Vas/VasSessionConfiguration.cs`
- `Infrastructure/EntityFramework/Configurations/Vas/VasSessionLineConfiguration.cs`
- `Infrastructure/EntityFramework/Migrations/<timestamp>_AddVasModule.cs` (EF generated)

#### Backend — API
- `Smartlog.Api/Controllers/VasBomController.cs`
- `Smartlog.Api/Controllers/VasWorkOrdersController.cs`
- `Smartlog.Api/Controllers/VasSessionsController.cs`

#### Backend — QueryConfigs
- `QueryConfigs/VasBomList.json` (form code `OPSVASBOMG01`)
- `QueryConfigs/VasWorkOrderList.json` (form code `OPSVWOG01`)
- `QueryConfigs/VasSessionList.json` (form code `OPSVSLG01`)

#### Frontend
- `frontend/src/features/vas-bom/api/vas-bom.ts`
- `frontend/src/features/vas-bom/api/vas-bom-queries.ts`
- `frontend/src/features/vas-bom/api/query-keys.ts`
- `frontend/src/features/vas-bom/components/vas-bom-list.tsx`
- `frontend/src/features/vas-bom/components/vas-bom-form.tsx`
- `frontend/src/features/vas-bom/components/vas-bom-lines-grid.tsx`
- `frontend/src/features/vas-bom/index.tsx`
- `frontend/src/features/vas-work-order/api/vas-work-order.ts`
- `frontend/src/features/vas-work-order/api/vas-work-order-queries.ts`
- `frontend/src/features/vas-work-order/api/query-keys.ts`
- `frontend/src/features/vas-work-order/components/vas-work-order-list.tsx`
- `frontend/src/features/vas-work-order/components/vas-work-order-form.tsx`
- `frontend/src/features/vas-work-order/components/vas-work-order-confirm-dialog.tsx`
- `frontend/src/features/vas-work-order/components/vas-work-order-detail.tsx`
- `frontend/src/features/vas-work-order/index.tsx`
- `frontend/src/features/vas-session/api/vas-session.ts`
- `frontend/src/features/vas-session/api/vas-session-queries.ts`
- `frontend/src/features/vas-session/api/query-keys.ts`
- `frontend/src/features/vas-session/components/vas-session-list.tsx`
- `frontend/src/features/vas-session/components/vas-session-confirm-dialog.tsx`
- `frontend/src/features/vas-session/index.tsx`
- `frontend/src/routes/_authenticated/vas/bom/index.tsx`
- `frontend/src/routes/_authenticated/vas/bom/$bomId.tsx`
- `frontend/src/routes/_authenticated/vas/work-orders/index.tsx`
- `frontend/src/routes/_authenticated/vas/work-orders/$vwoId.tsx`

### Files to Modify

#### Backend — Domain
- `backend/src/Smartlog.Domain/Enums/VasEnums.cs` — Replace `BaggingStatus`/`PackagingOwnership` with `VasType`, `VasWorkOrderStatus`, `VasSessionStatus`, `PackagingOwnership` (keep)
- `backend/src/Smartlog.Domain/IAppDbContext.cs` — Replace `BaggingWorkOrder`/`BaggingProgress` DbSets with 6 new VAS DbSets

#### Backend — Infrastructure
- `backend/src/Smartlog.Infrastructure/EntityFramework/AppDbContext.cs` — Replace old Bagging DbSets with new VAS DbSets
- `backend/src/Smartlog.Infrastructure/EntityFramework/Configurations/Vas/BaggingWorkOrderConfiguration.cs` — Delete (or leave for migration to DROP)
- `backend/src/Smartlog.Infrastructure/EntityFramework/Configurations/Vas/BaggingProgressConfiguration.cs` — Delete

#### Frontend — Navigation
- `frontend/src/components/layout/data/sidebar-data.ts` — Replace "Bagging" with "BOM", "Work Orders" under VAS group
- `frontend/src/i18n/locales/en/navigation.json` — Add new VAS nav keys
- `frontend/src/i18n/locales/vi/navigation.json` — Add new VAS nav keys

### Database Changes
- DROP: `ops.bagging_work_order`, `ops.bagging_progress`
- DROP ENUM: `bagging_status`
- CREATE ENUMs: `vas_type`, `vas_work_order_status`, `vas_session_status`
- CREATE 6 tables (see schema below)
- `invent_trans.reference_type` is varchar(50) — no ENUM change needed, just use `"VAS"` string value

### API Changes (new endpoints)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/vas-bom` | BOM list + create |
| GET/PUT | `/api/vas-bom/{id}` | BOM detail + update |
| POST | `/api/vas-bom/{id}/toggle-status` | Activate/deactivate BOM |
| GET/POST | `/api/vas-work-orders` | WO list + create |
| GET | `/api/vas-work-orders/{id}` | WO detail |
| POST | `/api/vas-work-orders/{id}/confirm` | Confirm WO (source lot selection) |
| POST | `/api/vas-work-orders/{id}/complete` | Complete WO |
| POST | `/api/vas-work-orders/{id}/cancel` | Cancel WO |
| GET/POST | `/api/vas-work-orders/{vwoId}/sessions` | Sessions per WO |
| POST | `/api/vas-work-orders/{vwoId}/sessions/{id}/confirm` | Confirm session (atomic InventTrans) |
| POST | `/api/vas-work-orders/{vwoId}/sessions/{id}/cancel` | Cancel session |

### Breaking Changes
- `BaggingWorkOrdersController` will be replaced — inform frontend team
- `BaggingWorkOrder`/`BaggingProgress` entities and their EF configurations removed
- `BaggingStatus` enum removed, `PackagingOwnership` values renamed: `Warehouse` → `TvlOwned`, `Owner` → `ClientOwned`

---

## Architecture Decisions

### ADR-01: ReferenceType as varchar, not ENUM
`InventTrans.ReferenceType` is already `varchar(50)` (not a database ENUM). The `InventTransCommand` record accepts `string? ReferenceType`. Therefore, no schema change is needed — pass `"VAS"` as the string value. The BA spec note about "extending ref_type ENUM" is a misread of the current schema.

### ADR-02: PackagingOwnership Enum Values
Current values are `Warehouse` (TVL-owned) and `Owner` (client-owned). BA spec uses `TVL_OWNED`/`CLIENT_OWNED`. Plan: keep the existing enum name `PackagingOwnership` but rename values to `TvlOwned` / `ClientOwned` for clarity. EF config stores as string, migration handles rename.

### ADR-03: InventDim for VAS InventTrans
Session confirm uses `IInventDimService.GetOrCreateAsync(warehouseId, locationId, ownerId, Available, lotId)`. The `warehouseId` comes from `VasWorkOrder.WarehouseId`, `ownerId` from `VasWorkOrder.OwnerId`.

### ADR-04: Billing Integration
Use existing `IBillingCaptureService.CaptureBaggingFeeAsync` from `CompleteVasWorkOrder`. If no billing contract exists, log warning and continue (non-blocking per BR-VAS-008).

### ADR-05: Atomic Session Confirm Transaction
All InventTrans inserts inside `ConfirmVasSession` must be inside the same `SaveChangesAsync` call. Use `IInventTransService.PostBatchAsync` for multiple ISSUE commands, then `PostAsync` for the single RECEIPT. Wrap in `IDbContextTransaction` if needed (EF SaveChanges is already transactional for the same context, but cross-service calls require explicit transaction).

### ADR-06: Lot Auto-Creation on WO Confirm
Call `ILotService.GetOrCreateLotAsync` for the target item with `LotAttributes` derived from the WO (vwo_number, creation date). Set `SourceLotId` = primary source lot (non-packaging BOM line with largest planned qty).

### ADR-07: Session Number Sequencing
`VasSession.SessionNumber` is an integer scoped to the WO. Set to `MAX(session_number) + 1` queried from existing sessions for the same WO. Default 1 for first session.

### ADR-08: Drop Old Bagging Code
The old `BaggingWorkOrder` / `BaggingProgress` entities, EF configs, commands, queries, controller, and frontend feature (`bagging`) are fully replaced. The migration will DROP the old tables. No data migration needed (tables were never populated in production).

### ADR-09: Frontend Feature Structure
Three separate feature modules: `vas-bom`, `vas-work-order`, `vas-session`. Routes nested under `/vas/` matching existing sidebar group. Existing `/vas/bagging` route replaced.

### ADR-10: QueryConfig Form Codes
| List | Grid FormCode | Search FormCode |
|------|--------------|----------------|
| VAS BOM | `OPSVASBOMG01` | `OPSVASBOMS01` |
| VAS Work Order | `OPSVWOG01` | `OPSVWOS01` |
| VAS Session | `OPSVSLG01` | `OPSVSLG01` |

---

## Database Schema (New Tables)

### `ops.vas_bom`
```sql
id                UUID PK
tenant_id         UUID NOT NULL
bom_code          varchar(50) NOT NULL
bom_name          varchar(200) NOT NULL
service_type      varchar(20) NOT NULL  -- VasType enum
target_item_id    UUID NOT NULL → cat.item
is_active         bool NOT NULL DEFAULT true
notes             varchar(500)
-- audit: created_time, created_by, updated_time, updated_by
UNIQUE (tenant_id, bom_code)
PARTIAL UNIQUE INDEX: (tenant_id, service_type, target_item_id) WHERE is_active = true
```

### `ops.vas_bom_line`
```sql
id                     UUID PK
bom_id                 UUID NOT NULL → ops.vas_bom
tenant_id              UUID NOT NULL
source_item_id         UUID NOT NULL → cat.item
qty_ratio              decimal(18,6) NOT NULL
is_packaging_material  bool NOT NULL DEFAULT false
packaging_ownership    varchar(20)   -- PackagingOwnership enum, nullable
sequence_no            int NOT NULL
```

### `ops.vas_work_order`
```sql
id               UUID PK
tenant_id        UUID NOT NULL
vwo_number       varchar(50) NOT NULL
service_type     varchar(20) NOT NULL
bom_id           UUID NOT NULL → ops.vas_bom
owner_id         UUID NOT NULL → cat.owner
warehouse_id     UUID NOT NULL → cat.warehouse
target_item_id   UUID NOT NULL → cat.item
target_lot_id    UUID → cat.lot  (nullable, filled on CONFIRM)
planned_qty      decimal(18,3) NOT NULL
actual_qty       decimal(18,3) NOT NULL DEFAULT 0
status           varchar(20) NOT NULL DEFAULT 'DRAFT'
notes            varchar(1000)
-- audit fields
UNIQUE (tenant_id, vwo_number)
```

### `ops.vas_work_order_source`
```sql
id              UUID PK
vwo_id          UUID NOT NULL → ops.vas_work_order
tenant_id       UUID NOT NULL
bom_line_id     UUID NOT NULL → ops.vas_bom_line
source_item_id  UUID NOT NULL → cat.item
source_lot_id   UUID NOT NULL → cat.lot
planned_qty     decimal(18,3) NOT NULL
actual_qty      decimal(18,3) NOT NULL DEFAULT 0
```

### `ops.vas_session`
```sql
id                       UUID PK
vwo_id                   UUID NOT NULL → ops.vas_work_order
tenant_id                UUID NOT NULL
session_number           int NOT NULL
output_qty               decimal(18,3) NOT NULL
target_location_id       UUID → cat.location
invent_trans_receipt_id  UUID → inv.invent_trans
status                   varchar(20) NOT NULL DEFAULT 'OPEN'
is_overtime              bool NOT NULL DEFAULT false
confirmed_at             timestamp
confirmed_by             varchar(200)
notes                    varchar(500)
-- audit fields
UNIQUE (vwo_id, session_number)
```

### `ops.vas_session_line`
```sql
id                    UUID PK
session_id            UUID NOT NULL → ops.vas_session
tenant_id             UUID NOT NULL
vwo_source_id         UUID NOT NULL → ops.vas_work_order_source
source_item_id        UUID NOT NULL → cat.item
source_lot_id         UUID NOT NULL → cat.lot
source_location_id    UUID NOT NULL → cat.location
consumed_qty          decimal(18,3) NOT NULL
invent_trans_issue_id UUID → inv.invent_trans
```

---

## Business Rules Implementation Map

| BR | Where Enforced | Implementation Note |
|----|---------------|---------------------|
| BR-VAS-001 | `CreateVasBom` + `ToggleVasBomStatus` | Check DB for existing active BOM with same (tenant, service_type, target_item_id) |
| BR-VAS-002 | `ToggleVasBomStatus` | Count active WOs using this BOM |
| BR-VAS-003 | `ConfirmVasWorkOrder` | Check `on_hand` available qty per source lot |
| BR-VAS-004 | `ConfirmVasSession` | Validate output_qty > 0, target_location set, all lines complete |
| BR-VAS-005 | `ConfirmVasSession` | Skip ISSUE trans for CLIENT_OWNED packaging BOM lines |
| BR-VAS-006 | `ConfirmVasSession` | Skip RECEIPT trans when `service_type = DE_BAGGING` |
| BR-VAS-007 | `CompleteVasWorkOrder` | Count OPEN sessions; block if > 0 |
| BR-VAS-008 | `CompleteVasWorkOrder` | Call `IBillingCaptureService.CaptureBaggingFeeAsync`; catch + warn if no contract |
| BR-VAS-009 | `ConfirmVasSession` handler guard | Throw if session already CONFIRMED |
| BR-VAS-010 | `ConfirmVasSession` | Check available qty per lot via `IInventDimService` + on_hand calc at confirm time |

---

## InventTrans Creation Logic (Session Confirm)

```
FOR each session_line in session.Lines:
  IF bom_line.PackagingOwnership == ClientOwned → SKIP

  dimId = IInventDimService.GetOrCreate(
    warehouseId, session_line.SourceLocationId, ownerId,
    Available, session_line.SourceLotId)

  POST InventTrans ISSUE/DEDUCTED:
    itemId = session_line.SourceItemId
    qty    = -session_line.ConsumedQty
    ref    = ("VAS", session.Id)
  → session_line.InventTransIssueId = new trans id

IF service_type != DE_BAGGING:
  receiptDimId = IInventDimService.GetOrCreate(
    warehouseId, session.TargetLocationId, ownerId,
    Available, vwo.TargetLotId)

  POST InventTrans RECEIPT/PHYSICAL:
    itemId = vwo.TargetItemId
    qty    = +session.OutputQty
    ref    = ("VAS", session.Id)
  → session.InventTransReceiptId = new trans id

session.Status = CONFIRMED
session.ConfirmedAt = DateTime.UtcNow
vwo.ActualQty += session.OutputQty
UPDATE vas_work_order_source.ActualQty += consumed per source

ALL in single SaveChangesAsync (EF transaction scope)
```

---

## Notes & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `IInventTransService.PostBatchAsync` vs multiple `PostAsync` calls — atomicity | Use explicit `IDbContextTransaction` wrapping all trans + session update in `ConfirmVasSession` |
| R2 | `PackagingOwnership` enum value rename (`Warehouse`→`TvlOwned`, `Owner`→`ClientOwned`) may break existing bagging data | No data exists in old tables (spec confirms); migration safe |
| R3 | Available qty check at session confirm (BR-VAS-010) requires querying `invent_trans` directly, not `on_hand` cache | Use same pattern as existing availability checks; document in handler |
| R4 | `ILotService.GetOrCreateLotAsync` uses hash-based dedup — target lot attributes must produce a unique hash per WO | Include `vwo_number` in LotAttributes to ensure uniqueness |
| R5 | Frontend session confirm dialog is the most complex UI (multi-lot table + add/remove rows) | Use react-hook-form field array; keep state local to dialog |
| R6 | Session cancel should reverse InventTrans — current spec says "tạo đảo chiều" (reversal) but implementation is deferred | In CancelVasSession: if session is CONFIRMED, call `PostReversalBatchAsync` for all existing trans; if OPEN, just set status CANCELLED |
