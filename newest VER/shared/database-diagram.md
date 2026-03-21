# TVL Smart Warehouse Management — Database Relationship Diagram

> **Version**: v5.1 | **Total Entities**: 62 | **ENUMs**: ~47
> **Architecture**: Multi-Tenant + Event-Sourced Inventory + Lot Tracking
> **Generated**: 2026-03-17

---

## Entity Relationship Diagram (Full System)

```mermaid
erDiagram
    %% ============================================================
    %% PHASE 0A — AUTH & TENANT (System Schema)
    %% ============================================================

    User {
        Guid Id PK
        string Email
        string LastName
        string FirstName
        string FullName
        string DisplayName
        string PhoneNumber
        bool IsActive
        Guid RoleId FK
        Guid AuthId
        bool IsSuperAdmin
        Guid SecurityGroupId FK
        json ProfileDetails
    }

    UserRole {
        Guid Id PK
        string Code
        string Name
        string Note
        bool IsActive
        Guid SecurityGroupId FK
    }

    UserRoleDependency {
        Guid Id PK
        Guid RoleId FK
        Guid DependentRoleId FK
    }

    SecurityGroup {
        Guid Id PK
        string Code
        string Name
        string Description
        bool IsActive
        enum SecurityEntity
        json PermissionDetails
    }

    UserGroup {
        Guid Id PK
        Guid UserId FK
        Guid GroupId FK
    }

    UserFormSetting {
        Guid Id PK
        Guid UserId FK
        string FormCode
        int FormSeq
        string SettingName
        bool IsDefault
        string SettingsJson
    }

    AppConfig {
        Guid Id PK
        string Name
        string Value
        string Description
    }

    User ||--o{ UserGroup : "belongs to"
    User }o--|| UserRole : "has role"
    User }o--o| SecurityGroup : "direct group"
    User ||--o{ UserFormSetting : "has settings"
    UserRole }o--|| SecurityGroup : "inherits permissions"
    UserRole ||--o{ UserRoleDependency : "parent of"
    UserGroup }o--|| SecurityGroup : "references"

    %% ============================================================
    %% PHASE 0B — PLATFORM FOUNDATION
    %% ============================================================

    NumberSequence {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Prefix
        string FormatPattern
        long CurrentValue
        bool DailyReset
        DateTime LastResetDate
    }

    AuditLog {
        Guid Id PK
        Guid TenantId FK
        string TableName
        Guid RecordId
        string Action
        string OldValues
        string NewValues
        DateTime CreatedTime
    }

    Uom {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        string UomClass
        int DecimalPrecision
    }

    UomConversion {
        Guid Id PK
        Guid TenantId FK
        Guid ItemId FK
        Guid FromUomId FK
        Guid ToUomId FK
        decimal ConversionFactor
    }

    ReasonCode {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        enum Category
        bool RequiresApproval
        bool IsActive
    }

    NotificationConfig {
        Guid Id PK
        Guid TenantId FK
        enum AlertType
        string TriggerCondition
        enum Channel
        string Recipients
        bool IsActive
    }

    NotificationLog {
        Guid Id PK
        Guid TenantId FK
        enum AlertType
        enum Channel
        string Recipient
        string Subject
        string Body
        bool IsSent
        DateTime SentAt
    }

    DocumentTemplate {
        Guid Id PK
        Guid TenantId FK
        enum DocumentType
        string Name
        string TemplateContent
        bool IsDefault
        bool IsActive
    }

    SystemConfig {
        Guid Id PK
        Guid TenantId FK
        string ConfigKey
        string ConfigValue
        string Description
    }

    UomConversion }o--|| Uom : "from"
    UomConversion }o--|| Uom : "to"

    %% ============================================================
    %% PHASE 1 — MASTER DATA + LOT
    %% ============================================================

    Warehouse {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        enum WarehouseType
        decimal MaxCapacityMt
        bool HasWeighbridge
        string Address
        bool IsActive
    }

    Zone {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        enum ZoneType
        bool IsBillingZone
        Guid WarehouseId FK
        bool IsActive
    }

    Location {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        enum LocationType
        decimal CapacityMt
        bool IsMixed
        Guid WarehouseId FK
        Guid ZoneId FK
        bool IsActive
    }

    Owner {
        Guid Id PK
        Guid TenantId FK
        string StorerKey
        string Name
        string OwnerType
        bool DualTrackingEnabled
        string ContactPerson
        string ContactEmail
        string ContactPhone
        decimal DefaultTolerancePct
        bool IsActive
    }

    OwnerWarehouseAccess {
        Guid Id PK
        Guid TenantId FK
        Guid OwnerId FK
        Guid WarehouseId FK
    }

    UserWarehouseAccess {
        Guid Id PK
        Guid TenantId FK
        Guid UserId FK
        Guid WarehouseId FK
    }

    Vendor {
        Guid Id PK
        Guid TenantId FK
        string StorerKey
        string Name
        string Company
        string SupplierGroup
        string ContactPerson
        string ContactEmail
        string ContactPhone
        bool IsActive
    }

    Item {
        Guid Id PK
        Guid TenantId FK
        string Sku
        string Name
        string Description
        enum CargoForm
        bool IsCatchWeight
        decimal TolerancePct
        decimal TolerancePctInbound
        decimal BagShellWeightKg
        string DefaultUom
        Guid OwnerId FK
        Guid ItemGroupId FK
        bool IsActive
    }

    ItemGroup {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        Guid PreferredZoneId FK
        string WeighbridgeQtyUom
        bool IsActive
    }

    ItemIncompatibility {
        Guid Id PK
        Guid TenantId FK
        Guid GroupAId FK
        Guid GroupBId FK
        string Reason
    }

    Carrier {
        Guid Id PK
        Guid TenantId FK
        string StorerKey
        string Name
        string ModeOfDelivery
        Guid DefaultVehicleTypeId FK
        string ContactPerson
        string ContactPhone
        bool IsActive
    }

    VehicleType {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        decimal DefaultTareWeightKg
        decimal MaxPayloadKg
        bool IsActive
    }

    Lot {
        Guid Id PK
        Guid TenantId FK
        string LotNumber
        string LotAttr01
        string LotAttr02
        string LotAttr03
        string LotAttr04
        string LotHash
        Guid SourceLotId FK
        Guid ItemId FK
        Guid OwnerId FK
    }

    Warehouse ||--o{ Zone : "contains"
    Warehouse ||--o{ Location : "contains"
    Zone ||--o{ Location : "groups"
    Owner ||--o{ Item : "owns"
    Owner ||--o{ OwnerWarehouseAccess : "accesses"
    Warehouse ||--o{ OwnerWarehouseAccess : "accessed by"
    User ||--o{ UserWarehouseAccess : "accesses"
    Warehouse ||--o{ UserWarehouseAccess : "accessed by"
    Item }o--o| ItemGroup : "categorized by"
    ItemGroup }o--o| Zone : "preferred zone"
    ItemIncompatibility }o--|| ItemGroup : "group A"
    ItemIncompatibility }o--|| ItemGroup : "group B"
    Carrier }o--o| VehicleType : "default vehicle"
    Lot }o--|| Item : "tracks"
    Lot }o--|| Owner : "owned by"
    Lot }o--o| Lot : "source lot"
    UomConversion }o--|| Item : "for item"

    %% ============================================================
    %% PHASE 2 — INVENTORY CORE
    %% ============================================================

    InventDim {
        Guid Id PK
        Guid TenantId FK
        Guid SiteId
        Guid WarehouseId FK
        Guid LocationId FK
        Guid OwnerId FK
        enum InventoryStatus
        Guid LotId FK
        string DimHash
    }

    OnHand {
        Guid Id PK
        Guid TenantId FK
        Guid ItemId FK
        Guid InventDimId FK
        decimal PhysicalQty
        decimal ReservedQty
        decimal AllocatedQty
        DateTime LastMaterializedAt
        uint RowVersion
    }

    InventTrans {
        Guid Id PK
        Guid TenantId FK
        long SeqNo
        Guid BatchId
        Guid ItemId FK
        Guid InventDimId FK
        enum TransType
        enum Stage
        decimal Qty
        decimal QtyMt
        string ReferenceType
        Guid ReferenceId
        DateTime PostedAt
    }

    InventoryStatus {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        bool IsAvailableForAllocation
        bool IsAvailableForPick
        bool IsActive
    }

    InventoryAdjustment {
        Guid Id PK
        Guid TenantId FK
        Guid ItemId FK
        Guid LocationId FK
        decimal Qty
        Guid ReasonCodeId FK
        string Status
        string Notes
    }

    InventoryEventOutbox {
        Guid Id PK
        Guid TenantId FK
        Guid BatchId
        string EventType
        string Payload
        string Status
        DateTime ProcessedAt
    }

    MaterializationCheckpoint {
        Guid TenantId FK
        Guid ItemId FK
        Guid InventDimId FK
        long LastTransSeq
        DateTime LastUpdatedAt
    }

    InventDim }o--|| Warehouse : "in warehouse"
    InventDim }o--o| Location : "at location"
    InventDim }o--|| Owner : "belongs to"
    InventDim }o--o| Lot : "lot tracked"
    OnHand }o--|| Item : "stock of"
    OnHand }o--|| InventDim : "dimensioned by"
    InventTrans }o--|| Item : "transacts"
    InventTrans }o--|| InventDim : "dimensioned by"
    InventoryAdjustment }o--|| Item : "adjusts"
    InventoryAdjustment }o--o| Location : "at location"
    InventoryAdjustment }o--o| ReasonCode : "reason"

    %% ============================================================
    %% PHASE 3 — WEIGHBRIDGE
    %% ============================================================

    Weighbridge {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        decimal MaxCapacityKg
        enum IntegrationMode
        Guid WarehouseId FK
        bool IsActive
    }

    WeighbridgeLog {
        Guid Id PK
        Guid TenantId FK
        string LogNumber
        enum Type
        string DocumentNumber
        decimal GrossWeightKg
        decimal TareWeightKg
        decimal NetWeightKg
        string VehiclePlate
        Guid PreviousLogId FK
        enum Status
        Guid WeighbridgeId FK
    }

    Weighbridge }o--|| Warehouse : "installed at"
    WeighbridgeLog }o--|| Weighbridge : "recorded on"
    WeighbridgeLog }o--o| WeighbridgeLog : "previous log"

    %% ============================================================
    %% PHASE 4 — INBOUND
    %% ============================================================

    PurchaseOrder {
        Guid Id PK
        Guid TenantId FK
        string PoNumber
        enum PoType
        enum Status
        Guid OwnerId FK
        Guid VendorId FK
        Guid WarehouseId FK
        DateTime ExpectedDate
        string Notes
        Guid CarrierId FK
        string VesselName
        string BlNumber
        string ApprovedBy
        DateTime ApprovedAt
    }

    PurchaseOrderLine {
        Guid Id PK
        Guid TenantId FK
        int LineNumber
        decimal ExpectedQtyKg
        decimal ReceivedQtyKg
        decimal NetWeightKg
        string Uom
        string LotAttr01
        Guid PurchaseOrderId FK
        Guid ItemId FK
    }

    InboundReceipt {
        Guid Id PK
        Guid TenantId FK
        string ReceiptNumber
        string VehiclePlate
        enum Status
        Guid PurchaseOrderId FK
        string Notes
        string DriverName
        enum ToleranceStatus
        decimal ToleranceVariancePct
        string OverrideBy
        string OverrideReason
    }

    InboundReceiptLine {
        Guid Id PK
        Guid TenantId FK
        decimal ExpectedQtyKg
        decimal ReceivedQtyKg
        decimal NetWeightKg
        string Uom
        Guid InboundReceiptId FK
        Guid PurchaseOrderLineId FK
        Guid ItemId FK
        Guid LotId FK
        Guid StorageLocationId FK
        bool DamageFlag
        bool RecountFlag
        string LineNotes
    }

    WorkHeader {
        Guid Id PK
        Guid TenantId FK
        string WorkNumber
        enum WorkType
        Guid ReferenceId
        enum Status
    }

    WorkLine {
        Guid Id PK
        Guid TenantId FK
        int StepNumber
        enum StepType
        Guid FromLocationId FK
        Guid ToLocationId FK
        decimal QtyKg
        enum Status
        Guid WorkHeaderId FK
    }

    PurchaseOrder }o--|| Owner : "ordered by"
    PurchaseOrder }o--o| Vendor : "supplied by"
    PurchaseOrder }o--|| Warehouse : "received at"
    PurchaseOrder }o--o| Carrier : "transported by"
    PurchaseOrder ||--o{ PurchaseOrderLine : "contains"
    PurchaseOrder ||--o{ InboundReceipt : "received via"
    PurchaseOrderLine }o--|| Item : "for item"
    InboundReceipt }o--|| PurchaseOrder : "receipts for"
    InboundReceipt ||--o{ InboundReceiptLine : "contains"
    InboundReceiptLine }o--|| Item : "receives item"
    InboundReceiptLine }o--o| PurchaseOrderLine : "matches PO line"
    InboundReceiptLine }o--o| Lot : "assigned lot"
    InboundReceiptLine }o--o| Location : "stored at"
    WorkHeader ||--o{ WorkLine : "contains steps"
    WorkLine }o--o| Location : "from"
    WorkLine }o--o| Location : "to"

    %% ============================================================
    %% PHASE 5 — OUTBOUND (4-Level Hierarchy)
    %% ============================================================

    SaleOrder {
        Guid Id PK
        Guid TenantId FK
        string SoNumber
        string OrderType
        enum Status
        Guid OwnerId FK
        DateTime RequestedDate
        string Notes
        string VesselName
        string BlNumber
    }

    SaleOrderDetail {
        Guid Id PK
        Guid TenantId FK
        decimal OriginalQty
        decimal AllocatedQty
        decimal PickedQty
        decimal ShippedQty
        decimal NetWeightKg
        string Uom
        Guid SaleOrderId FK
        Guid ItemId FK
        Guid LotId FK
    }

    OrderHeader {
        Guid Id PK
        Guid TenantId FK
        string OrderNumber
        string VehiclePlate
        string ContainerNumber
        string VesselName
        string BlNumber
        enum Status "Draft|Confirmed|Weighing|Processing|Shipped|Cancelled"
        Guid SaleOrderId FK
        Guid CarrierId FK
    }

    OrderDetail {
        Guid Id PK
        Guid TenantId FK
        decimal ExpectedQtyKg
        decimal AllocatedQtyKg
        decimal PickedQtyKg
        decimal LoadedQtyKg
        decimal WeighedQtyKg
        decimal ShippedQtyKg
        decimal NetWeightKg
        string Uom
        enum LineStatus "Pending|Picked|Loaded|Weighed|Shipped|Cancelled"
        Guid OrderHeaderId FK
        Guid SaleOrderDetailId FK
        Guid ItemId FK
    }

    AllocationRecord {
        Guid Id PK
        Guid TenantId FK
        decimal AllocatedQtyKg
        enum AllocationMethod
        enum Status
        DateTime ExpiresAt
        Guid OrderDetailId FK
        Guid InventDimId FK
    }

    SaleOrder }o--|| Owner : "ordered by"
    SaleOrder ||--o{ SaleOrderDetail : "contains"
    SaleOrder ||--o{ OrderHeader : "ships via"
    SaleOrderDetail }o--|| Item : "for item"
    SaleOrderDetail }o--o| Lot : "specific lot"
    OrderHeader }o--|| SaleOrder : "fulfills"
    OrderHeader }o--o| Carrier : "carried by"
    OrderHeader ||--o{ OrderDetail : "contains"
    OrderDetail }o--|| OrderHeader : "belongs to"
    OrderDetail }o--o| SaleOrderDetail : "from SO detail"
    OrderDetail }o--|| Item : "ships item"
    AllocationRecord }o--|| OrderDetail : "allocates for"
    AllocationRecord }o--|| InventDim : "from inventory"

    %% ============================================================
    %% PHASE 6 — TRANSFER
    %% ============================================================

    TransferHeader {
        Guid Id PK
        Guid TenantId FK
        string TransferNumber
        Guid SourceWarehouseId FK
        Guid DestWarehouseId FK
        string TransferReason
        enum Status
        Guid OwnerId FK
    }

    TransferLine {
        Guid Id PK
        Guid TenantId FK
        decimal PlannedQtyKg
        decimal ShippedQtyKg
        decimal ReceivedQtyKg
        decimal VarianceKg
        Guid TransferHeaderId FK
        Guid ItemId FK
        Guid LotId FK
    }

    TransferHeader }o--|| Warehouse : "from warehouse"
    TransferHeader }o--|| Warehouse : "to warehouse"
    TransferHeader }o--|| Owner : "owned by"
    TransferHeader ||--o{ TransferLine : "contains"
    TransferLine }o--|| Item : "transfers item"
    TransferLine }o--o| Lot : "lot tracked"

    %% ============================================================
    %% PHASE 7 — BILLING
    %% ============================================================

    FeeType {
        Guid Id PK
        Guid TenantId FK
        string Code
        string Name
        enum FeeGroup
        bool IsActive
    }

    DayTypeConfig {
        Guid Id PK
        Guid TenantId FK
        enum DayType
        decimal Multiplier
    }

    CalendarDetail {
        Guid Id PK
        Guid TenantId FK
        DateTime CalendarDate
        enum DayType
        string Description
    }

    BillingContract {
        Guid Id PK
        Guid TenantId FK
        string ContractNumber
        DateTime StartDate
        DateTime EndDate
        string Status
        Guid OwnerId FK
    }

    ContractFeeLine {
        Guid Id PK
        Guid TenantId FK
        enum BillingMethod
        decimal UnitPrice
        int FreeDays
        enum FreeDaysMode
        Guid BillingContractId FK
        Guid FeeTypeId FK
    }

    BillingCondition {
        Guid Id PK
        Guid TenantId FK
        decimal MinValue
        decimal MaxValue
        string Unit
        decimal Rate
        Guid ContractFeeLineId FK
    }

    BillingTransaction {
        Guid Id PK
        Guid TenantId FK
        decimal Qty
        decimal Amount
        string ReferenceType
        Guid ReferenceId
        Guid OwnerId FK
        Guid BillingContractId FK
        Guid FeeTypeId FK
        DateTime CreatedTime
    }

    DailyStorageSnapshot {
        Guid Id PK
        Guid TenantId FK
        DateTime SnapshotDate
        decimal OpeningQtyMt
        decimal ClosingQtyMt
        Guid OwnerId FK
        Guid ItemId FK
        Guid WarehouseId FK
        Guid LotId FK
        DateTime CreatedTime
    }

    DebitNote {
        Guid Id PK
        Guid TenantId FK
        string DnNumber
        DateTime PeriodFrom
        DateTime PeriodTo
        decimal TotalAmount
        enum Status
        Guid OwnerId FK
    }

    DebitNoteLine {
        Guid Id PK
        Guid TenantId FK
        decimal Qty
        decimal UnitPrice
        decimal Amount
        Guid DebitNoteId FK
        Guid FeeTypeId FK
    }

    CreditNote {
        Guid Id PK
        Guid TenantId FK
        decimal Amount
        string Reason
        Guid DebitNoteId FK
    }

    BillingContract }o--|| Owner : "bills"
    BillingContract ||--o{ ContractFeeLine : "has fee lines"
    ContractFeeLine }o--|| FeeType : "fee type"
    ContractFeeLine ||--o{ BillingCondition : "tiered pricing"
    BillingTransaction }o--|| Owner : "charged to"
    BillingTransaction }o--|| BillingContract : "under contract"
    BillingTransaction }o--|| FeeType : "fee type"
    DailyStorageSnapshot }o--|| Owner : "for owner"
    DailyStorageSnapshot }o--|| Item : "for item"
    DailyStorageSnapshot }o--|| Warehouse : "at warehouse"
    DailyStorageSnapshot }o--o| Lot : "per lot"
    DebitNote }o--|| Owner : "invoiced to"
    DebitNote ||--o{ DebitNoteLine : "contains"
    DebitNote ||--o{ CreditNote : "credited by"
    DebitNoteLine }o--|| FeeType : "fee type"

    %% ============================================================
    %% PHASE 8 — VAS / BAGGING
    %% ============================================================

    BaggingWorkOrder {
        Guid Id PK
        Guid TenantId FK
        string BwoNumber
        decimal PlannedQtyKg
        decimal ActualQtyKg
        decimal WasteQtyKg
        enum PackagingOwnership
        enum Status
        Guid OwnerId FK
        Guid SourceItemId FK
        Guid TargetItemId FK
        Guid SourceLotId FK
    }

    BaggingProgress {
        Guid Id PK
        Guid TenantId FK
        string SessionNumber
        int BagsThisSession
        decimal WeightThisSession
        bool IsOvertime
        Guid BaggingWorkOrderId FK
    }

    BaggingWorkOrder }o--|| Owner : "for owner"
    BaggingWorkOrder }o--|| Item : "source (bulk)"
    BaggingWorkOrder }o--|| Item : "target (bagged)"
    BaggingWorkOrder }o--o| Lot : "source lot"
    BaggingWorkOrder ||--o{ BaggingProgress : "tracks progress"
```

---

## Module Summary

| Phase | Module | Tables | Key Relationships |
|-------|--------|--------|-------------------|
| 0A | Auth & Tenant | 7 | User → UserRole → SecurityGroup |
| 0B | Platform Foundation | 9 | NumberSequence, AuditLog, Uom, ReasonCode, Notifications |
| 1 | Master Data + Lot | 12 | Warehouse → Zone → Location, Owner → Item → Lot |
| 2 | Inventory Core | 7 | InventDim × (Warehouse, Location, Owner, Lot) → OnHand, InventTrans |
| 3 | Weighbridge | 2 | Weighbridge → WeighbridgeLog (self-referencing chain) |
| 4 | Inbound | 6 | PO → POLine, InboundReceipt → ReceiptLine → Lot, WorkHeader → WorkLine |
| 5 | Outbound | 7 | SO → SODetail → OrderHeader → OrderDetail → AllocationRecord → InventDim |
| 6 | Transfer | 3 | TransferHeader → TransferLine (source WH → dest WH) |
| 7 | Billing | 11 | BillingContract → ContractFeeLine → BillingCondition, DebitNote → CreditNote |
| 8 | VAS | 2 | BaggingWorkOrder → BaggingProgress |

**Total**: 62 entities | ~47 ENUMs

---

## Key Relationship Patterns

### 1. Event-Sourced Inventory
```
InventTrans (append-only) ──async materialize──▶ OnHand (read model)
     │                                               │
     ├── ItemId ──▶ Item                              ├── ItemId ──▶ Item
     └── InventDimId ──▶ InventDim                    └── InventDimId ──▶ InventDim
                              │
                              ├── WarehouseId ──▶ Warehouse
                              ├── LocationId ──▶ Location
                              ├── OwnerId ──▶ Owner
                              └── LotId ──▶ Lot
```

### 2. Outbound 4-Level Hierarchy
```
SaleOrder (1) ──▶ SaleOrderDetail (N)
     │                    │
     ▼                    ▼
OrderHeader (N) ──▶ OrderDetail (N) ──▶ AllocationRecord (N) ──▶ InventDim
     │
     └── CarrierId ──▶ Carrier
```

### 3. Inbound Flow
```
PurchaseOrder (1) ──▶ PurchaseOrderLine (N)
     │                         │
     ▼                         ▼
InboundReceipt (N) ──▶ InboundReceiptLine (N) ──▶ Lot
                                │
                                └── StorageLocationId ──▶ Location
```

### 4. Billing Structure
```
Owner (1) ──▶ BillingContract (1 active)
                    │
                    ▼
              ContractFeeLine (N) ──▶ FeeType
                    │
                    ▼
              BillingCondition (N)    (tiered pricing)

BillingTransaction ──▶ (Owner, Contract, FeeType)
DailyStorageSnapshot ──▶ (Owner, Item, Warehouse, Lot)
DebitNote (1) ──▶ DebitNoteLine (N) + CreditNote (N)
```

### 5. Multi-Tenancy Pattern
```
ALL 55+ business tables have:
  tenant_id UUID NOT NULL
  UNIQUE constraints = (tenant_id, business_key)
  RLS enforced at database level

System schema (User, UserRole, SecurityGroup) — no tenant_id
```

### 6. Immutable (Append-Only) Tables
- `InventTrans` — inventory ledger
- `AuditLog` — change tracking
- `NotificationLog` — notification history
- `BillingTransaction` — billing records
- `DailyStorageSnapshot` — storage snapshots
