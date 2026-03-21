# Plan: EF Foundation (TASK 0)

**Feature**: tvl-swm-ef-foundation
**Date**: 2026-03-13
**Source**: docs/feature/tvl-swm-dev-phases/ba/ef-migration-breakdown.md
**Risk Level**: Medium

---

## Goal

Create all EF Core entity classes, enums, configurations, and run a single migration (`AddWmsSchema`) so that ~52 new WMS tables exist in the database. After this, multiple devs can implement CRUD/business logic in parallel without migration conflicts.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | `TenantEntity` extends `BaseEntity` + `TenantId` (Guid) | All WMS business tables need tenant isolation |
| D2 | `TenantSoftDeletedEntity` extends `TenantEntity` + soft-delete | Master data tables need soft-delete + tenant |
| D3 | `AppendOnlyEntity` = no BaseEntity, has Id + TenantId + CreatedTime + CreatedBy | For invent_trans, audit_log — immutable records |
| D4 | No `Tenant` table | External TenantAdmin API manages tenants |
| D5 | New schemas: `inv`, `billing` | Added to DatabaseConstants.Schemas |
| D6 | `TenantSaveChangesInterceptor` auto-sets tenant_id on INSERT | Prevents null tenant_id in WMS entities |
| D7 | Global query filter on TenantEntity: `WHERE tenant_id = @current` | Auto-isolates tenant data in queries |
| D8 | 7 existing entities REUSED (User, UserRole, SecurityGroup, UserGroup, UserRoleDependency, AppConfig, UserFormSetting) | Already in system schema, no tenant_id needed |

## Sub-Tasks

### 0.1 Base Infrastructure
- Create `TenantEntity`, `TenantSoftDeletedEntity`, `AppendOnlyEntity` in `Domain/TenantEntity.cs`
- Add `ITenantEntity` interface to Domain
- Update `EntityConfigurationExtensions` with tenant-aware methods
- Add `inv` and `billing` schemas to `DatabaseConstants`
- Create `TenantSaveChangesInterceptor`
- Register interceptor in DI

### 0.2 Enum Types (~47 enums in 11 files)
- Create 11 enum files in `Domain/Enums/`

### 0.3 Entity Classes (~52 NEW entities)
- Auth: 1 entity (UserWarehouseAccess)
- Foundation: 8 entities
- MasterData: 12 entities
- Inventory: 7 entities
- Weighbridge: 2 entities
- Inbound: 6 entities
- Outbound: 5 entities
- Transfer: 2 entities
- Billing: 11 entities
- VAS: 2 entities (some entities may share folders)

### 0.4 EF Configurations (~52 config files)
- One `IEntityTypeConfiguration<T>` per entity
- Follow existing pattern: `ToTable()`, `ConfigureDefault()`, property mappings, relationships

### 0.5 DbContext & Interface Update
- Add ~52 DbSet properties to `IAppDbContext` and `AppDbContext`
- Register `OnModelCreating` to apply all configurations
- Run `dotnet ef migrations add AddWmsSchema`

## Risks

| Risk | Mitigation |
|------|-----------|
| Large migration might fail | Review generated SQL before applying |
| FK references across phases | Create entities in dependency order |
| AppendOnlyEntity has no RowVersion | By design — immutable records don't need concurrency control |
