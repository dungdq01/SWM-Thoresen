# Tasks: EF Foundation (TASK 0)

**Feature**: tvl-swm-ef-foundation
**Status**: COMPLETED (build verified)

---

## 0.1 Base Infrastructure
- [x] 0.1.1 Create `ITenantEntity` interface + `TenantEntity` base class
- [x] 0.1.2 Create `TenantSoftDeletedEntity` base class
- [x] 0.1.3 Create `AppendOnlyEntity` base class
- [x] 0.1.4 Update `EntityConfigurationExtensions` — add tenant-aware methods
- [x] 0.1.5 Add `Inventory` and `Billing` schemas to `DatabaseConstants`
- [x] 0.1.6 Create `TenantSaveChangesInterceptor`
- [x] 0.1.7 Register interceptor in `ServiceConfigurations`

## 0.2 Enum Types
- [x] 0.2.1–0.2.11 All 11 enum files created (~47 enums)

## 0.3 Entity Classes
- [x] 0.3.1 `UserWarehouseAccess` (Auth)
- [x] 0.3.2–0.3.9 Foundation entities (8)
- [x] 0.3.10–0.3.21 MasterData entities (12)
- [x] 0.3.22–0.3.28 Inventory entities (7)
- [x] 0.3.29–0.3.30 Weighbridge entities (2)
- [x] 0.3.31–0.3.36 Inbound entities (6)
- [x] 0.3.37–0.3.41 Outbound entities (5)
- [x] 0.3.42–0.3.43 Transfer entities (2)
- [x] 0.3.44–0.3.54 Billing entities (11)
- [x] 0.3.55–0.3.56 VAS entities (2)

## 0.4 EF Configurations
- [x] 0.4.1–0.4.10 All 52 config files created

## 0.5 DbContext & Migration
- [x] 0.5.1 Update `IAppDbContext` with ~52 new DbSet properties
- [x] 0.5.2 Update `AppDbContext` with ~52 new DbSet properties
- [x] 0.5.3 Build verified — 0 errors, 0 warnings
- [ ] 0.5.4 Run `dotnet ef migrations add AddWmsSchema` (requires DB connection)
- [ ] 0.5.5 Verify migration SQL
