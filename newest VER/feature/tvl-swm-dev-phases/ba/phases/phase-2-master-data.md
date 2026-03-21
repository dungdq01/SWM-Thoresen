# Phase 2: Master Data CRUD — 4 Parallel Tracks

**Devs:** 3-4 (parallel)
**Effort:** ~2-3 sprints per track
**Blocking:** Phase 1 (tenant context)
**Key Rule:** Each track owns exclusive folders. Zero cross-track file edits.

---

## Parallelism Map

```
Phase 1 Done
    │
    ├──► Track 2A: Warehouse Hierarchy    ← Dev A (3 entities)
    │
    ├──► Track 2B: Business Partners      ← Dev B (3 entities)
    │
    ├──► Track 2C: Items & Carriers       ← Dev C (5 entities)
    │
    └──► Track 2D: Billing Setup CRUD     ← Dev D (5 entities)
                                            ↑ NO dependency on operations!
```

**Why 2D can start here:** Billing setup (FeeType, DayTypeConfig, CalendarDetail, BillingContract, ContractFeeLine, BillingCondition) is pure CRUD with NO dependency on inbound/outbound. Only billing *calculation* (Phase 5) needs operational data.

---

## Track 2A: Warehouse Hierarchy (Dev A)

**Entities:** Warehouse, Zone, Location
**Folder:** `Application/Features/Warehouses/`, `Zones/`, `Locations/`
**Frontend:** `/warehouses`, `/zones`, `/locations`

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 2A.1 | Warehouse CRUD | CRUD | code, name, type (COVERED/OPEN_YARD/BONDED), address, max_capacity_mt, has_weighbridge | P0 |
| 2A.2 | Warehouse list + DynamicGrid | Query | Sortable, filterable grid with search | P0 |
| 2A.3 | Zone CRUD | CRUD | code, zone_type, is_billing_zone, FK → Warehouse | P0 |
| 2A.4 | Zone list (by warehouse) | Query | Filter by warehouse_id | P0 |
| 2A.5 | Location CRUD | CRUD | code, location_type (7 types), capacity_mt, is_mixed, FK → Warehouse + Zone | P0 |
| 2A.6 | Location list (by warehouse/zone) | Query | Hierarchical filter: warehouse → zone → locations | P0 |
| 2A.7 | Location capacity validation | Logic | Prevent creating locations that exceed zone/warehouse capacity | P1 |
| 2A.8 | Warehouse soft-delete | Logic | Cannot deactivate warehouse with active inventory (check in Phase 3) | P1 |

### API Endpoints

```
# Warehouse
GET    /api/warehouses                      ← List (DynamicGrid)
GET    /api/warehouses/{id}                 ← Detail
POST   /api/warehouses                      ← Create
PUT    /api/warehouses/{id}                 ← Update
DELETE /api/warehouses/{id}                 ← Soft delete

# Zone
GET    /api/zones                           ← List (filter: warehouseId)
POST   /api/zones                           ← Create
PUT    /api/zones/{id}                      ← Update
DELETE /api/zones/{id}                      ← Soft delete

# Location
GET    /api/locations                       ← List (filter: warehouseId, zoneId, locationType)
POST   /api/locations                       ← Create
PUT    /api/locations/{id}                  ← Update
DELETE /api/locations/{id}                  ← Soft delete
```

### Business Rules

- BR-2A-001: Warehouse code must be unique per tenant
- BR-2A-002: Zone must belong to exactly 1 warehouse
- BR-2A-003: Location must belong to exactly 1 warehouse and optionally 1 zone
- BR-2A-004: Location types: RECEIVING, STORAGE, STAGING, SHIPPING, DAMAGE, TRANSIT, VAS
- BR-2A-005: Cannot soft-delete warehouse/zone/location with active references

---

## Track 2B: Business Partners (Dev B)

**Entities:** Owner, OwnerWarehouseAccess, Vendor
**Folder:** `Application/Features/Owners/`, `Vendors/`
**Frontend:** `/owners`, `/vendors`

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 2B.1 | Owner CRUD | CRUD | storerkey, company, owner_type (CUSTOMER/INTERNAL/CONSIGNED), dual_tracking_enabled, contact_info | P0 |
| 2B.2 | Owner list + DynamicGrid | Query | Searchable grid | P0 |
| 2B.3 | OwnerWarehouseAccess CRUD | CRUD | M:N assign owner ↔ warehouse | P0 |
| 2B.4 | Owner detail with warehouses | Query | Show assigned warehouses on owner detail page | P1 |
| 2B.5 | Vendor CRUD | CRUD | storerkey, company, supplier_group, contact_info | P1 |
| 2B.6 | Vendor list + DynamicGrid | Query | Searchable grid | P1 |
| 2B.7 | Owner soft-delete validation | Logic | Cannot deactivate owner with active inventory or contracts | P1 |

### API Endpoints

```
# Owner
GET    /api/owners                          ← List (DynamicGrid)
GET    /api/owners/{id}                     ← Detail (include warehouse access)
POST   /api/owners                          ← Create
PUT    /api/owners/{id}                     ← Update
DELETE /api/owners/{id}                     ← Soft delete

# Owner Warehouse Access
POST   /api/owner-warehouse-access          ← Assign
DELETE /api/owner-warehouse-access/{id}     ← Remove

# Vendor
GET    /api/vendors                         ← List (DynamicGrid)
POST   /api/vendors                         ← Create
PUT    /api/vendors/{id}                    ← Update
DELETE /api/vendors/{id}                    ← Soft delete
```

### Business Rules

- BR-2B-001: Owner storerkey must be unique per tenant
- BR-2B-002: Owner type determines billing behavior (only CUSTOMER gets billed)
- BR-2B-003: `dual_tracking_enabled` enables DPM nominal tracking (used in Phase 5B)
- BR-2B-004: Owner can only access assigned warehouses

---

## Track 2C: Items & Carriers (Dev C)

**Entities:** ItemGroup, Item, ItemIncompatibility, Carrier, VehicleType
**Folder:** `Application/Features/Items/`, `ItemGroups/`, `Carriers/`, `VehicleTypes/`
**Frontend:** `/item-groups`, `/items`, `/carriers`, `/vehicle-types`

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 2C.1 | ItemGroup CRUD | CRUD | code, name, preferred_zone, weighbridge_qty_uom (default 'KG') | P0 |
| 2C.2 | Item CRUD | CRUD | sku, name, cargo_form (6 types), is_catch_weight, tolerance_pct, bag_shell_weight_kg, billing_uom='MT', FK → Owner + ItemGroup | P0 |
| 2C.3 | Item list + DynamicGrid | Query | Filter by owner, item_group, cargo_form | P0 |
| 2C.4 | ItemIncompatibility CRUD | CRUD | M:N between ItemGroups (cannot store together) | P2 |
| 2C.5 | VehicleType CRUD | CRUD | code, default_tare_weight_kg, max_payload_kg | P1 |
| 2C.6 | Carrier CRUD | CRUD | storerkey, company, mode_of_delivery, FK → VehicleType | P1 |
| 2C.7 | Item validation | Logic | cargo_form determines valid UoMs; bag_shell_weight only for BAGGED types | P1 |

### API Endpoints

```
# Item Group
GET    /api/item-groups                     ← List (DynamicGrid)
POST   /api/item-groups                     ← Create
PUT    /api/item-groups/{id}                ← Update
DELETE /api/item-groups/{id}                ← Soft delete

# Item
GET    /api/items                           ← List (DynamicGrid, filter: ownerId, groupId)
GET    /api/items/{id}                      ← Detail
POST   /api/items                           ← Create
PUT    /api/items/{id}                      ← Update
DELETE /api/items/{id}                      ← Soft delete

# Item Incompatibility
GET    /api/item-incompatibilities          ← List
POST   /api/item-incompatibilities          ← Create
DELETE /api/item-incompatibilities/{id}     ← Remove

# Vehicle Type
GET    /api/vehicle-types                   ← List
POST   /api/vehicle-types                   ← Create
PUT    /api/vehicle-types/{id}              ← Update

# Carrier
GET    /api/carriers                        ← List
POST   /api/carriers                        ← Create
PUT    /api/carriers/{id}                   ← Update
DELETE /api/carriers/{id}                   ← Soft delete
```

### Business Rules

- BR-2C-001: Item SKU must be unique per tenant
- BR-2C-002: CargoForm: BULK, BAGGED_25KG, BAGGED_40KG, BAGGED_50KG, JUMBO, PACKAGING
- BR-2C-003: `bag_shell_weight_kg` required for BAGGED cargo forms, null for BULK
- BR-2C-004: `weighbridge_qty_uom` on ItemGroup determines if weighbridge updates qty
- BR-2C-005: `billing_uom` always 'MT' (metric ton)
- BR-2C-006: `tolerance_pct` default from system_config if not set on item

---

## Track 2D: Billing Setup CRUD (Dev D)

**Entities:** FeeType, DayTypeConfig, CalendarDetail, BillingContract, ContractFeeLine, BillingCondition
**Folder:** `Application/Features/Billing/FeeTypes/`, `DayTypes/`, `Calendars/`, `Contracts/`
**Frontend:** `/billing/fee-types`, `/billing/day-types`, `/billing/calendar`, `/billing/contracts`

> **NOTE:** This track is ONLY the CRUD setup for billing configuration.
> Billing *calculation*, DebitNote, CreditNote are in Phase 5A.

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| 2D.1 | FeeType CRUD | CRUD | code, name, fee_group (6 groups: STORAGE, HANDLING_IN, HANDLING_OUT, BAGGING, CONTAINER_STUFFING, OTHER) | P0 |
| 2D.2 | DayTypeConfig CRUD | CRUD | day_type (WORKING=1.0, DAY_OFF=1.5, HOLIDAY=2.0), multiplier | P0 |
| 2D.3 | CalendarDetail CRUD | CRUD | calendar_date, day_type. Bulk import for year | P0 |
| 2D.4 | Calendar year view | Query | Show full year calendar with day types color-coded | P1 |
| 2D.5 | BillingContract CRUD | CRUD | owner_id, start/end_date, status. Max 1 active per owner | P0 |
| 2D.6 | ContractFeeLine CRUD | CRUD | billing_method (FLAT/PER_UNIT/HIGHER_OF_TWO/TIERED), unit_price, free_days, free_days_mode | P0 |
| 2D.7 | BillingCondition CRUD | CRUD | min/max_value, unit → ContractFeeLine (tier pricing) | P1 |
| 2D.8 | Contract detail view | Query | Show contract with all fee lines and conditions | P1 |
| 2D.9 | Contract validation | Logic | Only 1 active contract per owner per tenant at any time | P0 |
| 2D.10 | Contract clone | Logic | Clone existing contract as DRAFT for new period | P2 |

### API Endpoints

```
# Fee Type
GET    /api/fee-types                       ← List (filter: feeGroup)
POST   /api/fee-types                       ← Create
PUT    /api/fee-types/{id}                  ← Update

# Day Type Config
GET    /api/day-type-configs                ← List
POST   /api/day-type-configs                ← Create/Update

# Calendar Detail
GET    /api/calendar-details                ← List (filter: year, month)
POST   /api/calendar-details/bulk           ← Bulk create/update for date range
PUT    /api/calendar-details/{id}           ← Update single date

# Billing Contract
GET    /api/billing-contracts               ← List (filter: ownerId, status)
GET    /api/billing-contracts/{id}          ← Detail (include fee lines + conditions)
POST   /api/billing-contracts               ← Create
PUT    /api/billing-contracts/{id}          ← Update
POST   /api/billing-contracts/{id}/clone    ← Clone as DRAFT

# Contract Fee Line
POST   /api/contract-fee-lines              ← Create
PUT    /api/contract-fee-lines/{id}         ← Update
DELETE /api/contract-fee-lines/{id}         ← Remove

# Billing Condition
POST   /api/billing-conditions              ← Create
PUT    /api/billing-conditions/{id}         ← Update
DELETE /api/billing-conditions/{id}         ← Remove
```

### Business Rules

- BR-2D-001: Max 1 active BillingContract per owner at any time
- BR-2D-002: Contract dates cannot overlap for same owner
- BR-2D-003: DayType multipliers: WORKING=1.0, DAY_OFF=1.5, HOLIDAY=2.0
- BR-2D-004: BillingMethod determines calculation logic (used in Phase 5A)
- BR-2D-005: FreeDaysMode: PER_CONTRACT, PER_BL, PER_RECEIPT (logic in Phase 5A)

---

## Integration Points (Cross-Track)

| From | To | What | When |
|------|----|------|------|
| 2A | 2B | OwnerWarehouseAccess needs Warehouse | 2A.1 must complete before 2B.3 |
| 2A | 2C | Item needs Location (for validation in later phases) | No blocking dependency for CRUD |
| 2B | 2C | Item FK → Owner | 2B.1 must complete before 2C.2 can test with real data |
| 2B | 2D | BillingContract FK → Owner | 2B.1 must complete before 2D.5 can test with real data |

> **Note:** For unit tests with mocks, tracks are fully independent. Dependencies only matter for integration tests.

---

## Definition of Done (Per Track)

- [ ] All CRUD operations work (Create, Read, Update, Soft-Delete)
- [ ] DynamicGrid query with sorting, filtering, pagination
- [ ] Validation rules enforced (unique codes, required fields)
- [ ] Tenant isolation verified (cross-tenant data invisible)
- [ ] Integration tests for each endpoint
- [ ] Frontend pages with forms and grids (or API-only if frontend deferred)
- [ ] Swagger documentation updated
