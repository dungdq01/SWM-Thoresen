# Tasks: Phase 2 Master Data CRUD — 4 Parallel Tracks

> Plan: `docs/feature/tvl-swm-phase2-master-data/dev/plan.md`
> Context: `docs/feature/tvl-swm-phase2-master-data/dev/context.json`

## Shared Infrastructure

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create BusinessRule.MasterData.cs (16 entity rule structs, MD-2xxx codes) | /backend | None | Done |
| 2 | Create Constants files (11 Consts.cs for column max lengths) | /backend | None | Done |

## Track 2A: Warehouse Hierarchy (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3 | Warehouse CRUD (Create, Update, Delete, GetList, GetById, GetLookup) + Controller | /backend | #1, #2 | Done |
| 4 | Zone CRUD (Create, Update, Delete, GetList, GetById, GetLookup) + Controller | /backend | #1, #2 | Done |
| 5 | Location CRUD (Create, Update, Delete, GetList, GetById, GetLookup) + Controller | /backend | #1, #2 | Done |
| 6 | QueryConfigs: Warehouses.json, Zones.json, Locations.json | /backend | #3-5 | Done |
| 7 | FormConfigs: MDTWHSG01/S01, MDTZNSG01/S01, MDTLOCG01/S01 | /backend | #3-5 | Done |

## Track 2B: Business Partners (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 8 | Owner CRUD (Create, Update, Delete, GetList, GetById, GetLookup) + Controller | /backend | #1, #2 | Done |
| 9 | OwnerWarehouseAccess (Assign, Remove, GetList) + Controller | /backend | #1, #2 | Done |
| 10 | Vendor CRUD (Create, Update, Delete, GetList, GetById, GetLookup) + Controller | /backend | #1, #2 | Done |
| 11 | QueryConfigs: Owners.json, Vendors.json | /backend | #8-10 | Done |
| 12 | FormConfigs: MDTOWNG01/S01, MDTVNDG01/S01 | /backend | #8-10 | Done |

## Track 2C: Items & Carriers (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 13 | ItemGroup CRUD + Controller | /backend | #1, #2 | Done |
| 14 | Item CRUD + Controller | /backend | #1, #2 | Done |
| 15 | ItemIncompatibility (Create, Delete, GetList) + Controller | /backend | #1, #2 | Done |
| 16 | VehicleType CRUD + Controller | /backend | #1, #2 | Done |
| 17 | Carrier CRUD + Controller | /backend | #1, #2 | Done |
| 18 | QueryConfigs: ItemGroups.json, Items.json, VehicleTypes.json, Carriers.json | /backend | #13-17 | Done |
| 19 | FormConfigs: MDTITMGG01/S01, MDTITMG01/S01, MDTVHTG01/S01, MDTCRRG01/S01 | /backend | #13-17 | Done |

## Track 2D: Billing Setup (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 20 | FeeType CRUD + Controller | /backend | #1, #2 | Done |
| 21 | DayTypeConfig (CreateOrUpdate, GetList) + Controller | /backend | #1, #2 | Done |
| 22 | CalendarDetail (BulkCreate, Update, GetList) + Controller | /backend | #1, #2 | Done |
| 23 | BillingContract composite (Create, Update, Clone, GetList, GetById) + Controller | /backend | #1, #2 | Done |
| 24 | ContractFeeLine (Create, Update, Delete) + Controller | /backend | #1, #2 | Done |
| 25 | BillingCondition (Create, Update, Delete) + Controller | /backend | #1, #2 | Done |
| 26 | QueryConfigs: FeeTypes.json, BillingContracts.json | /backend | #20-25 | Done |
| 27 | FormConfigs: BILFETG01/S01, BILCTRG01/S01 | /backend | #20-25 | Done |

## Frontend Tasks

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 28 | Warehouses feature (CRUD UI) | /frontend | #3 | Done |
| 29 | Zones feature (CRUD UI with warehouse filter) | /frontend | #4 | Done |
| 30 | Locations feature (CRUD UI with warehouse/zone filter) | /frontend | #5 | Done |
| 31 | Owners feature (CRUD UI + OwnerWarehouseAccess) | /frontend | #8, #9 | Done |
| 32 | Vendors feature (CRUD UI) | /frontend | #10 | Done |
| 33 | ItemGroups feature (CRUD UI) | /frontend | #13 | Done |
| 34 | Items feature (CRUD UI with owner/group filter) | /frontend | #14 | Done |
| 35 | VehicleTypes feature (CRUD UI) | /frontend | #16 | Done |
| 36 | Carriers feature (CRUD UI) | /frontend | #17 | Done |
| 37 | FeeTypes feature (CRUD UI) | /frontend | #20 | Done |
| 38 | DayTypes feature (config editor) | /frontend | #21 | Done |
| 39 | Calendar feature (year view) | /frontend | #22 | Done |
| 40 | BillingContracts feature (composite UI) | /frontend | #23-25 | Done |
| 41 | Register sidebar navigation (Master Data + Billing groups) | /frontend | #28-40 | Done |
| 42 | Register i18n namespaces (13 new) + locale files | /frontend | #28-40 | Done |
| 43 | Create route files (13 new routes) | /frontend | #28-40 | Done |

## Build & Review

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 44 | Backend build verification (`dotnet build`) | /backend | #3-27 | Done |
| 45 | Frontend build verification (`pnpm build`) | /frontend | #28-43 | Done |
| 46 | Code review — pattern compliance, cross-layer contract, security | /reviewer | #44, #45 | In Progress |
