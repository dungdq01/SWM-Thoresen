# EF Migration-First Breakdown — TVL SWM v5.1

**Date:** 2026-03-13
**Author:** BA Agent
**Source:** data-model-sketch v5.1, wms-domain-knowledge v5.0, spec-v5-part1/2/3
**Strategy:** Tạo toàn bộ EF entities + migration TRƯỚC → devs implement CRUD/business logic SONG SONG

---

## Chiến lược tổng thể

```
PHASE 0: EF Foundation (1 migration duy nhất, ~59 tables + ~47 enums)
  │
  │  Migration chạy xong → DB schema sẵn sàng
  │
  ▼
PHASE 1-8: Parallel Dev Tracks (nhiều dev cùng implement)
  │
  │  Mỗi dev nhận 1 track, implement CRUD + business logic
  │  Không conflict migration vì schema đã có sẵn
  │
  ▼
INTEGRATION: Cross-track testing + review
```

### Tại sao EF-First?

1. **Zero migration conflict** — Schema tạo 1 lần, devs không tạo thêm migration khi implement CRUD
2. **Parallel-safe** — Devs chỉ thêm Commands/Queries/Controllers, không chạm EF configurations
3. **Contract rõ ràng** — Entity classes = shared contract giữa tất cả devs
4. **Test sớm** — DB schema có sẵn để test queries ngay từ đầu

---

## Multi-Tenancy: Hybrid Approach (DB-per-tenant + Shared DB)

### Quyết định kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│  HYBRID MULTI-TENANCY                                        │
│                                                              │
│  Mode 1: DB-per-tenant (Large tenants — performance)         │
│    JWT → tenant_id → TenantAdmin API → dedicated DB conn     │
│    tenant_id column vẫn có, RLS optional (1 value duy nhất)  │
│                                                              │
│  Mode 2: Shared DB + RLS (Small tenants — cost-effective)    │
│    JWT → tenant_id → shared DB conn                          │
│    tenant_id column + RLS policy isolate data                │
│                                                              │
│  CODE PATH GIỐNG NHAU cho cả 2 mode:                         │
│    - Entity luôn có tenant_id                                │
│    - ICurrentUser.TenantId inject từ JWT                     │
│    - SaveChanges auto-set tenant_id                          │
│    - Global query filter WHERE tenant_id = @current          │
└──────────────────────────────────────────────────────────────┘
```

| Quyết định | Chi tiết |
|-----------|---------|
| **GIỮ `TenantEntity`** base class | Tất cả WMS entities kế thừa → luôn có `tenant_id` column |
| **BỎ table `Tenant`** | Tenant CRUD quản lý bởi external TenantAdmin API (Refit client đã có) |
| **GIỮ RLS** | Cần cho shared DB mode. Dedicated DB mode không ảnh hưởng |
| **`tenant_id` = `ICurrentUser.TenantId`** | Inject từ JWT, auto-set trong SaveChanges interceptor |
| **Existing entities (User, UserRole...)** | Giữ nguyên KHÔNG thêm tenant_id — chúng thuộc system schema, đã được isolate bởi DB-per-tenant hoặc quản lý từ external service |

---

## TASK 0: EF Foundation (Blocking — phải xong trước khi devs bắt đầu)

> **STATUS: COMPLETED (2026-03-13)**
>
> **Implementation Summary:**
> - 0.1 Base Infrastructure: DONE — Created `TenantEntity`, `TenantSoftDeletedEntity`, `AppendOnlyEntity`, `ITenantEntity` interface, `TenantSaveChangesInterceptor`, updated `EntityConfigurationExtensions` with tenant-aware methods, added `inv` and `billing` DB schemas
> - 0.2 Enum Types: DONE — 47 enums across 11 files in `Domain/Enums/`
> - 0.3 Entity Classes: DONE — 53 NEW entities (including SystemConfig) + 7 REUSED from System schema = 60 total DbSet registrations
> - 0.4 EF Configurations: DONE — 53 configuration files in `Infrastructure/EntityFramework/Configurations/`
> - 0.5 DbContext Update: DONE — `IAppDbContext` and `AppDbContext` updated with all DbSet properties. Build passes with 0 errors.
>
> **Key Decisions:**
> - `tenants` table NOT created — managed by external TenantAdmin API (Refit client). tenant_id from JWT.
> - Auth entities (User, UserRole, SecurityGroup, etc.) REUSED from existing System schema — NOT tenant-scoped.
> - `system_config` is a SEPARATE entity from existing `AppConfig` — both coexist.
> - All enums stored as strings via `.HasConversion<string>()`.
> - Migration generation deferred — requires DB connection.

### TASK 0.1: Base Infrastructure ✅

| # | Công việc | Files | Mô tả |
|---|----------|-------|--------|
| 0.1.1 | Tạo `TenantEntity` base class | `Domain/TenantEntity.cs` | Extends `BaseEntity` + `TenantId` (Guid). Tất cả WMS business tables kế thừa từ đây |
| 0.1.2 | Tạo `TenantSoftDeletedEntity` base class | `Domain/TenantEntity.cs` | Extends `TenantEntity` + soft-delete (DeletedTime, DeletedBy) |
| 0.1.3 | Tạo `AppendOnlyEntity` base class | `Domain/TenantEntity.cs` | Cho invent_trans, audit_log — TenantId + CreatedTime/CreatedBy, KHÔNG có update/delete |
| 0.1.4 | Update `EntityConfigurationExtensions` | `Infrastructure/EF/Configurations/` | Thêm `ConfigureTenantEntity()` auto-map `tenant_id` column + global query filter |
| 0.1.5 | Thêm schemas mới vào `DatabaseConstants` | `Infrastructure/EF/DatabaseConstants.cs` | Thêm `Inventory = "inv"`, `Billing = "billing"` nếu cần |
| 0.1.6 | Tạo `TenantSaveChangesInterceptor` | `Infrastructure/EF/Interceptors/` | Auto-set `TenantId` = `ICurrentUser.TenantId` trên INSERT cho tất cả `TenantEntity` |

### TASK 0.2: Enum Types (~47 enums) ✅

Tất cả enums đặt trong `Domain/Enums/`:

| # | Enum file | Enums bên trong |
|---|-----------|----------------|
| 0.2.1 | `WarehouseEnums.cs` | `WarehouseType` (COVERED/OPEN_YARD/BONDED), `LocationType` (7 types), `ZoneType` |
| 0.2.2 | `InventoryEnums.cs` | `InventoryStatusCode`, `TransType` (6 types), `TransStage` (6 stages), `CargoForm` (6 types) |
| 0.2.3 | `InboundEnums.cs` | `PoType`, `PoStatus` (6), `ReceiptStatus` (9) |
| 0.2.4 | `OutboundEnums.cs` | `SoStatus` (7), `OrderStatus` (13), `OrderDetailStatus` (12), `AllocationStatus` (5), `AllocationMethod` |
| 0.2.5 | `TransferEnums.cs` | `TransferStatus` (8) |
| 0.2.6 | `WorkEnums.cs` | `WorkType` (4), `WorkStatus` (4), `WorkStepType` |
| 0.2.7 | `BillingEnums.cs` | `FeeGroup` (6), `DayType` (3), `BillingMethod` (4), `DebitNoteStatus` (4), `FreeDaysMode` (3) |
| 0.2.8 | `VasEnums.cs` | `BaggingStatus` (6), `PackagingOwnership` (2) |
| 0.2.9 | `WeighbridgeEnums.cs` | `IntegrationMode` (4), `WeighbridgeLogType` (2), `WeighbridgeLogStatus` (3) |
| 0.2.10 | `CommonEnums.cs` | `ReasonCodeCategory` (9), `AlertType` (11), `NotificationChannel`, `DocumentType` (8) |
| 0.2.11 | `AuthEnums.cs` | `RoleCode` (10) |

### TASK 0.3: Entity Classes (~59 entities) ✅

Tất cả entities đặt trong `Domain/Entities/{Phase}/`:

#### Phase 0A — Auth (1 NEW entity + 5 REUSE)

**Existing entities đã mapping — SKIP tạo mới:**

| Existing Entity | WMS Spec Mapping | Status |
|----------------|-----------------|--------|
| `User` (BaseSoftDeletedEntity) | `users` — Email, Name, RoleId, AuthId, IsActive, ProfileDetails | **REUSE** — richer than spec |
| `UserRole` (BaseSoftDeletedEntity) | `roles` — Code, Name, SecurityGroupId | **REUSE** — same concept |
| `SecurityGroup` (BaseSoftDeletedEntity) | `permissions` + `role_permissions` — PermissionDetails JSONB | **REUSE** — permissions embedded |
| `UserGroup` (CreationAuditedEntity) | `user_roles` M:N — UserId ↔ GroupId(SecurityGroup) | **REUSE** — User↔SecurityGroup M:N |
| `AppConfig` (BaseSoftDeletedEntity) | NOT `system_config` — these are SEPARATE entities. AppConfig is for app-level settings; `SystemConfig` is a NEW WMS entity | **REUSE** — AppConfig kept as-is, `SystemConfig` created separately |

> **Note**: `UserRoleDependency` và `UserFormSetting` là framework entities, không có trong WMS spec nhưng giữ nguyên.
>
> **`Tenant` table BỎ** — Tenant CRUD quản lý bởi external TenantAdmin API (Refit client). `tenant_id` inject từ JWT via `ICurrentUser.TenantId`.

**Entity MỚI cần tạo:**

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.1 | `UserWarehouseAccess` | `Entities/Auth/UserWarehouseAccess.cs` | `TenantEntity` | `system` | M:N user ↔ warehouse. FK → User (existing) + Warehouse (Phase 1) |

#### Phase 0B — Platform Foundation (8 NEW entities, AppConfig REUSE)

> **`AppConfig`** và `SystemConfig` là SEPARATE entities — `AppConfig` (existing) cho app-level settings, `SystemConfig` (NEW) cho WMS-specific config (e.g., `lot_hash_attrs`). Cả hai coexist.

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.3 | `NumberSequence` | `Entities/Foundation/NumberSequence.cs` | `TenantEntity` | `system` | prefix, format_pattern, daily_reset |
| 0.3.4 | `AuditLog` | `Entities/Foundation/AuditLog.cs` | `AppendOnlyEntity` | `logging` | table_name, record_id, old/new_values (JSONB) |
| 0.3.5 | `Uom` | `Entities/Foundation/Uom.cs` | `TenantEntity` | `cat` | code, uom_class, decimal_precision |
| 0.3.6 | `UomConversion` | `Entities/Foundation/UomConversion.cs` | `TenantEntity` | `cat` | from_uom, to_uom, conversion_factor |
| 0.3.7 | `ReasonCode` | `Entities/Foundation/ReasonCode.cs` | `TenantEntity` | `cat` | code, category, requires_approval |
| 0.3.8 | `NotificationConfig` | `Entities/Foundation/NotificationConfig.cs` | `TenantEntity` | `system` | alert_type, trigger, recipients |
| 0.3.9 | `NotificationLog` | `Entities/Foundation/NotificationLog.cs` | `AppendOnlyEntity` | `logging` | notification history |
| 0.3.10 | `DocumentTemplate` | `Entities/Foundation/DocumentTemplate.cs` | `TenantEntity` | `system` | 8 document types |

#### Phase 1 — Master Data + Lot (12 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.17 | `Warehouse` | `Entities/MasterData/Warehouse.cs` | `TenantSoftDeletedEntity` | `cat` | code, name, type, max_capacity_mt, has_weighbridge |
| 0.3.18 | `Zone` | `Entities/MasterData/Zone.cs` | `TenantSoftDeletedEntity` | `cat` | code, zone_type, is_billing_zone → Warehouse |
| 0.3.19 | `Location` | `Entities/MasterData/Location.cs` | `TenantSoftDeletedEntity` | `cat` | code, location_type (7), capacity_mt → Warehouse, Zone |
| 0.3.20 | `Owner` | `Entities/MasterData/Owner.cs` | `TenantSoftDeletedEntity` | `cat` | storerkey, owner_type, dual_tracking_enabled |
| 0.3.21 | `OwnerWarehouseAccess` | `Entities/MasterData/OwnerWarehouseAccess.cs` | `TenantEntity` | `cat` | M:N owner ↔ warehouse |
| 0.3.22 | `Vendor` | `Entities/MasterData/Vendor.cs` | `TenantSoftDeletedEntity` | `cat` | storerkey, company, supplier_group |
| 0.3.23 | `Item` | `Entities/MasterData/Item.cs` | `TenantSoftDeletedEntity` | `cat` | sku, cargo_form, is_catch_weight, tolerance_pct → Owner, ItemGroup |
| 0.3.24 | `ItemGroup` | `Entities/MasterData/ItemGroup.cs` | `TenantSoftDeletedEntity` | `cat` | code, preferred_zone, weighbridge_qty_uom |
| 0.3.25 | `ItemIncompatibility` | `Entities/MasterData/ItemIncompatibility.cs` | `TenantEntity` | `cat` | group_a, group_b → ItemGroup × 2 |
| 0.3.26 | `Carrier` | `Entities/MasterData/Carrier.cs` | `TenantSoftDeletedEntity` | `cat` | storerkey, mode_of_delivery → VehicleType |
| 0.3.27 | `VehicleType` | `Entities/MasterData/VehicleType.cs` | `TenantSoftDeletedEntity` | `cat` | code, default_tare_weight_kg, max_payload_kg |
| 0.3.28 | `Lot` | `Entities/MasterData/Lot.cs` | `TenantEntity` | `cat` | lot_number, lot_attr_01..12, lot_hash, source_lot_id (self-ref) → Item, Owner |

#### Phase 2 — Inventory Core (7 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.29 | `InventDim` | `Entities/Inventory/InventDim.cs` | `TenantEntity` | `inv` | site_id, warehouse_id, location_id, owner_id, inventory_status, lot_id, dim_hash |
| 0.3.30 | `OnHand` | `Entities/Inventory/OnHand.cs` | `TenantEntity` | `inv` | item_id, invent_dim_id, physical_qty, reserved_qty, allocated_qty, row_version, last_materialized_at. **Composite PK: (tenant_id, item_id, invent_dim_id)** |
| 0.3.31 | `InventTrans` | `Entities/Inventory/InventTrans.cs` | `AppendOnlyEntity` | `inv` | seq_no (BIGSERIAL), batch_id, item_id, invent_dim_id, trans_type, stage, qty, qty_mt, reference_type/id, posted_at. **Append-only** |
| 0.3.32 | `InventoryStatus` | `Entities/Inventory/InventoryStatus.cs` | `TenantEntity` | `inv` | code, name, is_available_for_allocation, is_available_for_pick |
| 0.3.33 | `InventoryAdjustment` | `Entities/Inventory/InventoryAdjustment.cs` | `TenantEntity` | `inv` | item_id, location_id, qty, reason_code, status |
| 0.3.34 | `InventoryEventOutbox` | `Entities/Inventory/InventoryEventOutbox.cs` | `TenantEntity` | `inv` | batch_id, event_type, payload (JSONB), status |
| 0.3.35 | `MaterializationCheckpoint` | `Entities/Inventory/MaterializationCheckpoint.cs` | Entity (no Id — composite PK) | `inv` | tenant_id, item_id, invent_dim_id, last_trans_seq, last_updated_at |

#### Phase 3 — Weighbridge (2 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.36 | `Weighbridge` | `Entities/Weighbridge/Weighbridge.cs` | `TenantSoftDeletedEntity` | `ops` | code, max_capacity_kg, integration_mode → Warehouse |
| 0.3.37 | `WeighbridgeLog` | `Entities/Weighbridge/WeighbridgeLog.cs` | `TenantEntity` | `ops` | log_number, type, document_number, gross/tare/net_weight_kg, previous_log_id (self-ref), status |

#### Phase 4 — Inbound (6 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.38 | `PurchaseOrder` | `Entities/Inbound/PurchaseOrder.cs` | `TenantEntity` | `ops` | po_number, po_type, status → Owner, Vendor, Warehouse |
| 0.3.39 | `PurchaseOrderLine` | `Entities/Inbound/PurchaseOrderLine.cs` | `TenantEntity` | `ops` | line_number, expected_qty_kg, received_qty_kg, net_weight_kg, uom, lot_attr_01..12 → PO, Item |
| 0.3.40 | `InboundReceipt` | `Entities/Inbound/InboundReceipt.cs` | `TenantEntity` | `ops` | receipt_number, vehicle_plate, status → PO |
| 0.3.41 | `InboundReceiptLine` | `Entities/Inbound/InboundReceiptLine.cs` | `TenantEntity` | `ops` | expected/received_qty_kg, net_weight_kg, uom, lot_id → Receipt, POLine, Item, Lot |
| 0.3.42 | `WorkHeader` | `Entities/Inbound/WorkHeader.cs` | `TenantEntity` | `ops` | work_number, work_type, reference_id, status |
| 0.3.43 | `WorkLine` | `Entities/Inbound/WorkLine.cs` | `TenantEntity` | `ops` | step_type, from/to_location_id, qty_kg, status → WorkHeader |

> **Note**: `WorkHeader` / `WorkLine` dùng chung cho Inbound (PUTAWAY), Outbound (PICK), Transfer (MOVE). Đặt ở Inbound vì tạo lần đầu ở Phase 4.

#### Phase 5 — Outbound (5 entities, reuse WorkHeader/WorkLine)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.44 | `SaleOrder` | `Entities/Outbound/SaleOrder.cs` | `TenantEntity` | `ops` | so_number, order_type, status → Owner |
| 0.3.45 | `SaleOrderDetail` | `Entities/Outbound/SaleOrderDetail.cs` | `TenantEntity` | `ops` | original_qty, allocated/picked/shipped_qty, net_weight_kg, uom → SO, Item, Lot (optional) |
| 0.3.46 | `OrderHeader` | `Entities/Outbound/OrderHeader.cs` | `TenantEntity` | `ops` | order_number, vehicle_plate, container_number, status → SO, Carrier |
| 0.3.47 | `OrderDetail` | `Entities/Outbound/OrderDetail.cs` | `TenantEntity` | `ops` | expected/allocated/picked/loaded/weighed/shipped_qty_kg, net_weight_kg, uom, line_status → OrderHeader, SODetail, Item |
| 0.3.48 | `AllocationRecord` | `Entities/Outbound/AllocationRecord.cs` | `TenantEntity` | `ops` | allocated_qty_kg, allocation_method, status, expires_at → OrderDetail, InventDim |

#### Phase 6 — Transfer (2 entities, reuse WorkHeader/WorkLine)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.49 | `TransferHeader` | `Entities/Transfer/TransferHeader.cs` | `TenantEntity` | `ops` | transfer_number, source/dest_warehouse_id, transfer_reason, status → Owner |
| 0.3.50 | `TransferLine` | `Entities/Transfer/TransferLine.cs` | `TenantEntity` | `ops` | planned/shipped/received_qty_kg, variance_kg → Transfer, Item, Lot |

#### Phase 7 — Billing (11 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.51 | `FeeType` | `Entities/Billing/FeeType.cs` | `TenantEntity` | `billing` | code, fee_group |
| 0.3.52 | `DayTypeConfig` | `Entities/Billing/DayTypeConfig.cs` | `TenantEntity` | `billing` | day_type, multiplier |
| 0.3.53 | `CalendarDetail` | `Entities/Billing/CalendarDetail.cs` | `TenantEntity` | `billing` | calendar_date, day_type |
| 0.3.54 | `BillingCondition` | `Entities/Billing/BillingCondition.cs` | `TenantEntity` | `billing` | min/max_value, unit → ContractFeeLine |
| 0.3.55 | `BillingContract` | `Entities/Billing/BillingContract.cs` | `TenantEntity` | `billing` | start/end_date, status → Owner |
| 0.3.56 | `ContractFeeLine` | `Entities/Billing/ContractFeeLine.cs` | `TenantEntity` | `billing` | billing_method, unit_price, free_days → Contract, FeeType |
| 0.3.57 | `BillingTransaction` | `Entities/Billing/BillingTransaction.cs` | `AppendOnlyEntity` | `billing` | qty, amount, reference_type/id → Owner, Contract, FeeType |
| 0.3.58 | `DailyStorageSnapshot` | `Entities/Billing/DailyStorageSnapshot.cs` | `AppendOnlyEntity` | `billing` | snapshot_date, opening/closing_qty_mt, lot_id → Owner, Item, Warehouse |
| 0.3.59 | `DebitNote` | `Entities/Billing/DebitNote.cs` | `TenantEntity` | `billing` | dn_number, period_from/to, total_amount, status → Owner |
| 0.3.60 | `DebitNoteLine` | `Entities/Billing/DebitNoteLine.cs` | `TenantEntity` | `billing` | qty, unit_price, amount → DebitNote, FeeType |
| 0.3.61 | `CreditNote` | `Entities/Billing/CreditNote.cs` | `TenantEntity` | `billing` | amount, reason → DebitNote |

#### Phase 8 — VAS/Bagging (2 entities)

| # | Entity | File | Base Class | Schema | Notes |
|---|--------|------|------------|--------|-------|
| 0.3.62 | `BaggingWorkOrder` | `Entities/Vas/BaggingWorkOrder.cs` | `TenantEntity` | `ops` | bwo_number, planned/actual_qty_kg, waste_qty_kg, packaging_ownership, status → Owner, source/target Item, source Lot |
| 0.3.63 | `BaggingProgress` | `Entities/Vas/BaggingProgress.cs` | `TenantEntity` | `ops` | session_number, bags_this_session, weight_this_session, is_overtime → BWO |

### TASK 0.4: EF Configurations ✅

Mỗi entity cần 1 `IEntityTypeConfiguration<T>` file trong `Infrastructure/EntityFramework/Configurations/{Phase}/`:

| # | Folder | Entities | Key config notes |
|---|--------|----------|-----------------|
| 0.4.1 | `Configurations/Auth/` | 1 NEW entity (UserWarehouseAccess). Existing 5 entities đã có config → SKIP | FK → User + Warehouse |
| 0.4.2 | `Configurations/Foundation/` | 8 entities | AuditLog, NotificationLog → append-only, schema `logging` |
| 0.4.3 | `Configurations/MasterData/` | 12 entities | All soft-delete except join tables. Lot: unique (tenant_id, lot_hash). ItemGroup: weighbridge_qty_uom default 'KG' |
| 0.4.4 | `Configurations/Inventory/` | 7 entities | InventTrans: append-only, seq_no identity. OnHand: composite PK. MaterializationCheckpoint: composite PK |
| 0.4.5 | `Configurations/Weighbridge/` | 2 entities | WeighbridgeLog: self-ref previous_log_id |
| 0.4.6 | `Configurations/Inbound/` | 6 entities | WorkHeader/WorkLine shared across phases |
| 0.4.7 | `Configurations/Outbound/` | 5 entities | 4-level: SO → SODetail → OrderHeader → OrderDetail |
| 0.4.8 | `Configurations/Transfer/` | 2 entities | TransferHeader: dual FK to Warehouse (source/dest) |
| 0.4.9 | `Configurations/Billing/` | 11 entities | BillingTransaction, DailyStorageSnapshot → append-only. Schema `billing` |
| 0.4.10 | `Configurations/Vas/` | 2 entities | BaggingWorkOrder: multi-FK to Item (source/target) |

### TASK 0.5: DbContext & Migration ✅

| # | Công việc | Mô tả |
|---|----------|--------|
| 0.5.1 | Update `IAppDbContext` | Thêm DbSet cho tất cả ~59 entities (grouped by region comments) |
| 0.5.2 | Update `AppDbContext` | Thêm DbSet properties tương ứng |
| 0.5.3 | Chạy `dotnet ef migrations add AddWmsSchema` | Tạo migration cho toàn bộ schema |
| 0.5.4 | Verify migration | Review generated SQL, đảm bảo đúng schema/table/column names |
| 0.5.5 | Chạy `dotnet ef database update` | Apply migration lên dev database |

### TASK 0.6: SQL Init Script (optional)

| # | Công việc | Mô tả |
|---|----------|--------|
| 0.6.1 | Seed data cho default tenant | Tenant mặc định (TVL) |
| 0.6.2 | Seed inventory_status | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT per tenant |
| 0.6.3 | Seed default UoM | KG, MT, BAG, PIECE per tenant |
| 0.6.4 | Seed default reason codes | 9 categories per tenant |
| 0.6.5 | Seed roles | 10 default roles per tenant |

---

## PARALLEL DEV TRACKS (sau khi TASK 0 hoàn thành)

```
                    ┌─────────────────────────────────────────┐
                    │   TASK 0: EF Foundation + Migration     │
                    │   (1 dev, blocking)                     │
                    └──────────────────┬──────────────────────┘
                                       │
              ┌────────────┬───────────┼───────────┬────────────┐
              ▼            ▼           ▼           ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐
        │ Track A  │ │ Track B  │ │Track C │ │ Track D  │ │Track E │
        │ Auth +   │ │ Master   │ │Inventory│ │ Inbound  │ │Billing │
        │Foundation│ │ Data     │ │ Core   │ │+Outbound │ │+ VAS   │
        │          │ │ + Lot    │ │+WB     │ │+Transfer │ │        │
        └──────────┘ └──────────┘ └────────┘ └──────────┘ └────────┘
          Dev 1        Dev 2       Dev 3       Dev 4        Dev 5
```

### Track A: Auth & Foundation (Dev 1)

**Scope**: Phase 0A + 0B — 9 NEW entities (5 existing REUSE: User, UserRole, SecurityGroup, UserGroup, AppConfig)
**Dependencies**: None (foundational)
**Estimated effort**: 2-3 sprints

| Task | Type | Entities | Priority |
|------|------|----------|----------|
| A.1 | REUSE | User, UserRole, SecurityGroup — CRUD đã có. Tenant quản lý bởi external TenantAdmin API | P0 |
| A.2 | CRUD | UserWarehouseAccess (NEW) | P0 |
| A.3 | CRUD | NumberSequence (auto-generate format) | P0 |
| A.4 | CRUD | Uom, UomConversion | P1 |
| A.5 | CRUD | ReasonCode | P1 |
| A.6 | REUSE | AppConfig đã có → extend nếu cần JSONB value | P1 |
| A.7 | CRUD | DocumentTemplate | P2 |
| A.8 | CRUD | NotificationConfig + NotificationLog | P2 |
| A.9 | Logic | AuditLog auto-capture (EF interceptor) | P1 |
| A.10 | Logic | TenantSaveChangesInterceptor (auto-set tenant_id) | P0 |
| A.11 | Logic | Global query filter cho TenantEntity (WHERE tenant_id = @current) | P0 |
| A.12 | Logic | RLS migration script (shared DB mode) | P1 |

### Track B: Master Data + Lot (Dev 2)

**Scope**: Phase 1 — 12 entities
**Dependencies**: Track A (tenant context phải hoạt động)
**Estimated effort**: 3-4 sprints

| Task | Type | Entities | Priority |
|------|------|----------|----------|
| B.1 | CRUD | Warehouse (COVERED/OPEN_YARD/BONDED) | P0 |
| B.2 | CRUD | Zone (+ zone_type, is_billing_zone) | P0 |
| B.3 | CRUD | Location (7 types, capacity_mt, mixed rules) | P0 |
| B.4 | CRUD | Owner (+ dual_tracking_enabled for DPM) | P0 |
| B.5 | CRUD | OwnerWarehouseAccess | P1 |
| B.6 | CRUD | Vendor | P1 |
| B.7 | CRUD | ItemGroup (+ weighbridge_qty_uom) | P0 |
| B.8 | CRUD | Item (sku, cargo_form, tolerance_pct, bag_shell_weight_kg) | P0 |
| B.9 | CRUD | ItemIncompatibility (M:N) | P2 |
| B.10 | CRUD | Carrier + VehicleType | P1 |
| B.11 | CRUD | Lot (lot_hash generation, auto-merge) | P0 |
| B.12 | Logic | `get_or_create_lot` service (hash computation, lookup/insert) | P0 |
| B.13 | Logic | Lot hash configurability (system_config.lot_hash_attrs) | P1 |

### Track C: Inventory Core + Weighbridge (Dev 3)

**Scope**: Phase 2 + Phase 3 — 9 entities
**Dependencies**: Track B (Item, Location, Lot phải có)
**Estimated effort**: 4-5 sprints (most complex)

| Task | Type | Entities | Priority |
|------|------|----------|----------|
| C.1 | CRUD | InventoryStatus (seeded per tenant) | P0 |
| C.2 | Logic | InventDim (dim_hash computation, upsert) | P0 |
| C.3 | Logic | InventTrans (append-only INSERT, stage machine) | P0 |
| C.4 | Logic | OnHand (read model, materialization) | P0 |
| C.5 | Logic | InventoryEventOutbox (transactional outbox pattern) | P1 |
| C.6 | Logic | MaterializationCheckpoint + background worker | P1 |
| C.7 | Logic | Allocation: advisory lock + compute from invent_trans | P0 |
| C.8 | Logic | Negative inventory prevention | P0 |
| C.9 | CRUD | InventoryAdjustment (+ approval workflow) | P1 |
| C.10 | CRUD | Weighbridge (registration + config) | P0 |
| C.11 | API | `POST /api/weighbridge-logs` (single endpoint, auto-resolve) | P0 |
| C.12 | Logic | Cascading weighing (previous_log_id chain) | P1 |
| C.13 | Logic | UOM-based update logic (qty vs net_weight) | P0 |
| C.14 | Logic | Tolerance check (running total vs expected) | P1 |

### Track D: Inbound + Outbound + Transfer (Dev 4)

**Scope**: Phase 4 + 5 + 6 — 13 entities
**Dependencies**: Track C (InventTrans, OnHand, Weighbridge phải hoạt động)
**Estimated effort**: 5-6 sprints

| Task | Type | Entities | Priority |
|------|------|----------|----------|
| D.1 | CRUD | PurchaseOrder + PurchaseOrderLine | P0 |
| D.2 | Logic | PO status machine (DRAFT → CONFIRMED → ... → CLOSED) | P0 |
| D.3 | CRUD | InboundReceipt + InboundReceiptLine | P0 |
| D.4 | Logic | Receipt → lot assignment (get_or_create_lot) | P0 |
| D.5 | Logic | Receipt → InventTrans (EXPECTED → PHYSICAL + Reverse EXPECTED) | P0 |
| D.6 | Logic | WorkHeader/WorkLine (PUTAWAY: RECV → STORAGE) | P1 |
| D.7 | Logic | Putaway → InventTrans pair (-RECV, +STORAGE) | P1 |
| D.8 | CRUD | SaleOrder + SaleOrderDetail | P0 |
| D.9 | CRUD | OrderHeader + OrderDetail | P0 |
| D.10 | Logic | SO → InventTrans EXPECTED | P0 |
| D.11 | Logic | FIFO Allocation → AllocationRecord + InventTrans ALLOCATED | P0 |
| D.12 | Logic | Pick (STORAGE→STAGING) + DE_ALLOCATED | P1 |
| D.13 | Logic | Load (STAGING→SHIPPING) | P1 |
| D.14 | Logic | Ship (DEDUCTED from SHIPPING + Reverse EXPECTED) | P0 |
| D.15 | Logic | Post-ship residual cleanup | P2 |
| D.16 | CRUD | TransferHeader + TransferLine | P1 |
| D.17 | Logic | Transfer InventTrans flow (DEDUCTED source → PHYSICAL dest) | P1 |
| D.18 | Logic | Transit loss from IN_TRANSIT bucket | P2 |

### Track E: Billing + VAS (Dev 5)

**Scope**: Phase 7 + 8 — 13 entities
**Dependencies**: Track D (Receipt/Ship events trigger billing)
**Estimated effort**: 4-5 sprints

| Task | Type | Entities | Priority |
|------|------|----------|----------|
| E.1 | CRUD | FeeType (6 fee groups) | P0 |
| E.2 | CRUD | DayTypeConfig + CalendarDetail | P0 |
| E.3 | CRUD | BillingContract + ContractFeeLine | P0 |
| E.4 | CRUD | BillingCondition (tier pricing) | P1 |
| E.5 | Logic | BillingTransaction auto-capture (handling in/out fees) | P0 |
| E.6 | Logic | DailyStorageSnapshot (EOD 23:59 UTC+7, per lot) | P0 |
| E.7 | Logic | Storage fee calculation (qty × rate × day_type_multiplier) | P0 |
| E.8 | Logic | Free days (3 modes: PER_CONTRACT / PER_BL / PER_RECEIPT) | P1 |
| E.9 | CRUD | DebitNote + DebitNoteLine (status machine) | P1 |
| E.10 | CRUD | CreditNote (corrections for LOCKED DNs) | P2 |
| E.11 | CRUD | BaggingWorkOrder (BWO) | P1 |
| E.12 | CRUD | BaggingProgress (multi-session) | P1 |
| E.13 | Logic | BWO → InventTrans (ISSUE bulk + RECEIPT bagged + waste ADJUSTMENT) | P1 |
| E.14 | Logic | DPM dual tracking (nominal trans: REGISTERED + is_nominal) | P2 |

---

## Dependency Map

```
Track A (Auth+Foundation) ──────────────────────────────────────────────────►
     │
     │ tenant context ready
     ▼
Track B (Master Data+Lot) ─────────────────────────────────────────────────►
     │
     │ Item, Location, Lot entities ready
     ▼
Track C (Inventory+WB) ────────────────────────────────────────────────────►
     │
     │ InventTrans, OnHand, Weighbridge ready
     ▼
Track D (Inbound+Outbound+Transfer) ──────────────────────────────────────►
     │
     │ Receipt/Ship events available
     ▼
Track E (Billing+VAS) ─────────────────────────────────────────────────────►
```

**Parallelism Note**: Tracks A-E có dependency chain, nhưng:
- Track B có thể **bắt đầu CRUD** song song với Track A (chỉ cần wait cho RLS middleware)
- Track C có thể **bắt đầu entity services** song song (chỉ wait khi cần test integration)
- **Frontend** cho mỗi Track có thể chạy song song ngay từ đầu (mock API)
- Trong thực tế, 3-4 devs có thể chạy overlap significant nếu coordinate API contracts

---

## Summary

| Metric | Value |
|--------|-------|
| Entities MỚI cần tạo | ~52 (bỏ 7 existing + bỏ Tenant table) |
| Entities REUSE (đã có) | 7 (User, UserRole, SecurityGroup, UserGroup, UserRoleDependency, AppConfig, UserFormSetting) |
| Tenant table | BỎ — quản lý bởi external TenantAdmin API |
| Multi-tenancy | Hybrid: DB-per-tenant + Shared DB + RLS (code path giống nhau) |
| Tổng enums | ~47 (11 enum files) |
| EF configurations MỚI | ~52 files |
| Migration | 1 lần duy nhất (AddWmsSchema) |
| Parallel tracks | 5 tracks (A-E) |
| Devs cần | 3-5 devs |
| Total effort | ~18-23 sprints (overlapping) |
| Critical path | Track A → B → C → D (sequential dependency) |
