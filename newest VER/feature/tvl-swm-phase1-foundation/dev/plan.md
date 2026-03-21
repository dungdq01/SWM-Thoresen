# Plan: Phase 1 Foundation — Auth & Platform Services

## Summary

Implement the foundational backend services and frontend management UIs for TVL SWM v5.1 Phase 1. This phase delivers 7 modules (Tenant Auth, Number Sequence, UoM, Reason Codes, System Config, Audit Log, Document Templates & Notifications) that ALL subsequent phases depend on. Entities and EF configurations already exist from the completed EF Foundation task — this plan covers Application layer (CQRS handlers), Domain Services, API Controllers, and Frontend feature UIs.

## Requirements

### Module 1.1: Tenant Context & UserWarehouseAccess (P0)
- **R1.1.1**: Verify existing TenantIdentificationMiddleware extracts tenant_id from JWT correctly
- **R1.1.2**: Verify TenantSaveChangesInterceptor auto-sets tenant_id on INSERT
- **R1.1.3**: Verify global query filters auto-filter by tenant_id
- **R1.1.4**: UserWarehouseAccess CRUD — Assign/Remove/List warehouse access per user
- **R1.1.5**: API returns 401/403 for requests without valid tenant context

### Module 1.2: Number Sequence Service (P0)
- **R1.2.1**: NumberSequence CRUD — Create/Update format patterns per entity type
- **R1.2.2**: `INumberSequenceService.NextAsync()` — Thread-safe next number generation
- **R1.2.3**: Format pattern: `{prefix}-{date}-{seq}` (e.g., `PO-20260313-0001`)
- **R1.2.4**: Daily reset logic — Reset counter at midnight when `daily_reset = true`
- **R1.2.5**: Concurrency safety — Use `SELECT FOR UPDATE` / advisory lock to prevent duplicates

### Module 1.3: UoM Service (P1)
- **R1.3.1**: Uom CRUD — Standard CRUD with tenant scope
- **R1.3.2**: UomConversion CRUD — From/To UoM + conversion factor
- **R1.3.3**: `IUomService.ConvertAsync()` — Convert quantity between UoMs using conversion table
- **R1.3.4**: Seed default UoMs: KG, MT (1000 KG), BAG, PIECE per tenant

### Module 1.4: Reason Code Service (P1)
- **R1.4.1**: ReasonCode CRUD — Code, category (9 types), requires_approval flag
- **R1.4.2**: Filter by category
- **R1.4.3**: Lookup endpoint for downstream modules

### Module 1.5: System Config (P1)
- **R1.5.1**: SystemConfig CRUD — Key-value store (JSONB) for WMS config
- **R1.5.2**: `ISystemConfigService.GetAsync<T>()` — Typed access with known keys
- **R1.5.3**: In-memory cache per tenant, invalidate on update
- **R1.5.4**: Known config keys: `lot_hash_attrs`, `default_tolerance_pct`, `allocation_expiry_hours`, `snapshot_time`, `vat_rate`, `max_reweigh_attempts`

### Module 1.6: Audit Log (P1)
- **R1.6.1**: AuditSaveChangesInterceptor — Auto-capture INSERT/UPDATE/DELETE with old/new values
- **R1.6.2**: Store in `audit_log` table with JSONB old_values/new_values
- **R1.6.3**: Query with filter by table_name, record_id, date range, user
- **R1.6.4**: Configurable field exclusion (e.g., passwords)

### Module 1.7: Document Template & Notification (P2)
- **R1.7.1**: DocumentTemplate CRUD — 8 document types with template content
- **R1.7.2**: NotificationConfig CRUD — 11 alert types, trigger conditions, recipients
- **R1.7.3**: NotificationLog append — Immutable log of sent notifications
- **R1.7.4**: `INotificationService.SendAsync()` — Queue notification based on config

## Impact Analysis

### Files to Create — Backend

#### Domain Services (Interfaces)
- `Application/Services/Abstractions/INumberSequenceService.cs`
- `Application/Services/Abstractions/IUomService.cs`
- `Application/Services/Abstractions/ISystemConfigService.cs`
- `Application/Services/Abstractions/INotificationService.cs`
- `Application/Services/Abstractions/IAuditLogService.cs`

#### Domain Services (Implementations)
- `Application/Services/NumberSequenceService.cs`
- `Application/Services/UomService.cs`
- `Application/Services/SystemConfigService.cs`
- `Application/Services/NotificationService.cs`

#### Application — UserWarehouseAccess
- `Application/Features/Auth/UserWarehouseAccess/Commands/AssignWarehouseAccess.cs`
- `Application/Features/Auth/UserWarehouseAccess/Commands/RemoveWarehouseAccess.cs`
- `Application/Features/Auth/UserWarehouseAccess/Queries/GetUserWarehouseAccessList.cs`
- `Application/Features/Auth/UserWarehouseAccess/Dtos/UserWarehouseAccessDto.cs`
- `Application/Features/Auth/UserWarehouseAccess/Mappings/UserWarehouseAccessMappings.cs`

#### Application — NumberSequence
- `Application/Features/Foundation/NumberSequences/Commands/CreateNumberSequence.cs`
- `Application/Features/Foundation/NumberSequences/Commands/UpdateNumberSequence.cs`
- `Application/Features/Foundation/NumberSequences/Commands/GenerateNextNumber.cs`
- `Application/Features/Foundation/NumberSequences/Queries/GetNumberSequenceList.cs`
- `Application/Features/Foundation/NumberSequences/Queries/GetNumberSequenceById.cs`
- `Application/Features/Foundation/NumberSequences/Dtos/NumberSequenceDto.cs`
- `Application/Features/Foundation/NumberSequences/Mappings/NumberSequenceMappings.cs`

#### Application — Uom
- `Application/Features/Foundation/Uoms/Commands/CreateUom.cs`
- `Application/Features/Foundation/Uoms/Commands/UpdateUom.cs`
- `Application/Features/Foundation/Uoms/Queries/GetUomList.cs`
- `Application/Features/Foundation/Uoms/Queries/GetUomById.cs`
- `Application/Features/Foundation/Uoms/Queries/GetUomLookup.cs`
- `Application/Features/Foundation/Uoms/Dtos/UomDto.cs`
- `Application/Features/Foundation/Uoms/Mappings/UomMappings.cs`

#### Application — UomConversion
- `Application/Features/Foundation/UomConversions/Commands/CreateUomConversion.cs`
- `Application/Features/Foundation/UomConversions/Commands/UpdateUomConversion.cs`
- `Application/Features/Foundation/UomConversions/Commands/DeleteUomConversion.cs`
- `Application/Features/Foundation/UomConversions/Queries/GetUomConversionList.cs`
- `Application/Features/Foundation/UomConversions/Dtos/UomConversionDto.cs`
- `Application/Features/Foundation/UomConversions/Mappings/UomConversionMappings.cs`

#### Application — ReasonCode
- `Application/Features/Foundation/ReasonCodes/Commands/CreateReasonCode.cs`
- `Application/Features/Foundation/ReasonCodes/Commands/UpdateReasonCode.cs`
- `Application/Features/Foundation/ReasonCodes/Queries/GetReasonCodeList.cs`
- `Application/Features/Foundation/ReasonCodes/Queries/GetReasonCodeById.cs`
- `Application/Features/Foundation/ReasonCodes/Queries/GetReasonCodeLookup.cs`
- `Application/Features/Foundation/ReasonCodes/Dtos/ReasonCodeDto.cs`
- `Application/Features/Foundation/ReasonCodes/Mappings/ReasonCodeMappings.cs`

#### Application — SystemConfig
- `Application/Features/Foundation/SystemConfigs/Commands/UpdateSystemConfig.cs`
- `Application/Features/Foundation/SystemConfigs/Queries/GetSystemConfigList.cs`
- `Application/Features/Foundation/SystemConfigs/Queries/GetSystemConfigByKey.cs`
- `Application/Features/Foundation/SystemConfigs/Dtos/SystemConfigDto.cs`
- `Application/Features/Foundation/SystemConfigs/Mappings/SystemConfigMappings.cs`

#### Application — AuditLog
- `Application/Features/Foundation/AuditLogs/Queries/GetAuditLogList.cs`
- `Application/Features/Foundation/AuditLogs/Dtos/AuditLogDto.cs`
- `Application/Features/Foundation/AuditLogs/Mappings/AuditLogMappings.cs`

#### Application — DocumentTemplate
- `Application/Features/Foundation/DocumentTemplates/Commands/CreateDocumentTemplate.cs`
- `Application/Features/Foundation/DocumentTemplates/Commands/UpdateDocumentTemplate.cs`
- `Application/Features/Foundation/DocumentTemplates/Queries/GetDocumentTemplateList.cs`
- `Application/Features/Foundation/DocumentTemplates/Queries/GetDocumentTemplateById.cs`
- `Application/Features/Foundation/DocumentTemplates/Dtos/DocumentTemplateDto.cs`
- `Application/Features/Foundation/DocumentTemplates/Mappings/DocumentTemplateMappings.cs`

#### Application — Notification
- `Application/Features/Foundation/Notifications/Commands/CreateNotificationConfig.cs`
- `Application/Features/Foundation/Notifications/Commands/UpdateNotificationConfig.cs`
- `Application/Features/Foundation/Notifications/Queries/GetNotificationConfigList.cs`
- `Application/Features/Foundation/Notifications/Queries/GetNotificationLogList.cs`
- `Application/Features/Foundation/Notifications/Dtos/NotificationConfigDto.cs`
- `Application/Features/Foundation/Notifications/Dtos/NotificationLogDto.cs`
- `Application/Features/Foundation/Notifications/Mappings/NotificationMappings.cs`

#### API Controllers
- `Api/Controllers/UserWarehouseAccessController.cs`
- `Api/Controllers/NumberSequencesController.cs`
- `Api/Controllers/UomsController.cs`
- `Api/Controllers/UomConversionsController.cs`
- `Api/Controllers/ReasonCodesController.cs`
- `Api/Controllers/SystemConfigsController.cs`
- `Api/Controllers/AuditLogsController.cs`
- `Api/Controllers/DocumentTemplatesController.cs`
- `Api/Controllers/NotificationConfigsController.cs`
- `Api/Controllers/NotificationLogsController.cs`

#### Infrastructure — Interceptor
- `Infrastructure/EntityFramework/Interceptors/AuditSaveChangesInterceptor.cs`

### Files to Modify — Backend
- `Application/ServiceConfigurations.cs` — Register new services (INumberSequenceService, IUomService, ISystemConfigService, INotificationService)
- `Infrastructure/ServiceConfigurations.cs` — Register AuditSaveChangesInterceptor

### Files to Create — Frontend (6 feature modules)

#### Feature: Number Sequences (`frontend/src/features/number-sequences/`)
- `api/number-sequences.ts`, `api/query-keys.ts`, `api/number-sequences-queries.ts`
- `components/number-sequences-context.ts`, `components/number-sequences-provider.tsx`, `components/use-number-sequences.ts`, `components/number-sequences-dialogs.tsx`
- `config/number-sequences-input.config.ts`, `config/number-sequences-list.config.ts`
- `data/schema.ts`
- `index.tsx`

#### Feature: UoMs (`frontend/src/features/uoms/`)
- Same structure as above + UomConversions sub-feature

#### Feature: Reason Codes (`frontend/src/features/reason-codes/`)
- Same structure

#### Feature: System Config (`frontend/src/features/system-config/`)
- Key-value editor UI (not standard CRUD grid)

#### Feature: Audit Logs (`frontend/src/features/audit-logs/`)
- Read-only log viewer with filters

#### Feature: Document Templates (`frontend/src/features/document-templates/`)
- Same CRUD structure + template content editor

#### Feature: Notifications (`frontend/src/features/notifications/`)
- Config management + log viewer (2 tabs/views)

### Files to Modify — Frontend
- `src/i18n/index.ts` — Register 7 new i18n namespaces
- `src/i18n/locales/en/*.json` — Create 7 locale files
- `src/i18n/locales/vi/*.json` — Create 7 locale files
- `src/components/layout/data/sidebar-data.ts` — Add Foundation nav group
- `src/routes/_authenticated/` — Add 7 route files

### Database Changes
- No new migrations needed — entities and EF configs already created in EF Foundation
- Run existing migration: `dotnet ef database update`

### API Changes
- 20+ new API endpoints (see spec for full list)

### Breaking Changes
- None — all new endpoints

## Architecture Decisions

### AD-1: AuditSaveChangesInterceptor Design
**Decision**: Create a separate `AuditSaveChangesInterceptor` (not merge into existing `TenantSaveChangesInterceptor`)
**Rationale**: Single Responsibility. The tenant interceptor sets TenantId; the audit interceptor captures change history. They run independently and can be toggled separately.

### AD-2: NumberSequence Concurrency Strategy
**Decision**: Use PostgreSQL `SELECT ... FOR UPDATE` with raw SQL via EF Core
**Rationale**: Advisory locks are database-specific and harder to test. `FOR UPDATE` row-level lock is standard SQL, works within the existing transaction decorator, and is sufficient for single-DB deployments.

### AD-3: SystemConfig Caching Strategy
**Decision**: `IMemoryCache` with tenant-scoped keys, invalidated on write operations
**Rationale**: No external cache dependency (Redis). Cache key pattern: `sys_config:{tenantId}:{key}`. Invalidation happens in UpdateSystemConfig command handler via `ISystemConfigService.InvalidateCache()`.

### AD-4: Frontend Feature Grouping
**Decision**: Separate frontend features per module (not one monolithic "foundation" feature)
**Rationale**: Each module has independent routes, i18n, and API layers. Grouping would create coupling. Sidebar groups them visually under "Foundation" nav section.

### AD-5: Audit Log Field Exclusion
**Decision**: Static exclusion list in `AuditSaveChangesInterceptor` constructor, not database-driven
**Rationale**: Excluded fields (e.g., password hashes) rarely change. A config file or constant list avoids an extra DB query on every SaveChanges call.

### AD-6: Notification Service — Queue-Only Pattern
**Decision**: Phase 1 `INotificationService.SendAsync()` only writes to NotificationLog. Actual delivery (email, SMS) is deferred to Phase 5 or external integration.
**Rationale**: Phase 1 scope is foundation. Building SMTP/SMS connectors is out of scope. The append-only log serves as the notification queue for future consumers.

## Execution Plan

### Phase 1: Backend Services & Infrastructure → /backend
1. Create AuditSaveChangesInterceptor
2. Create domain service interfaces (INumberSequenceService, IUomService, ISystemConfigService, INotificationService)
3. Create domain service implementations
4. Create Application layer: Commands, Queries, DTOs, Mappings for all 7 modules
5. Create API Controllers for all modules
6. Register services in DI
7. Build verification

### Phase 2: Frontend Features → /frontend
1. Create 7 feature modules with standard CRUD pattern
2. Create routing entries
3. Create i18n locale files (en + vi)
4. Register i18n namespaces
5. Update sidebar navigation
6. Build verification

### Phase 3: Review → /reviewer
- Pattern compliance check
- Cross-layer contract validation
- Security review (tenant isolation, auth)

### Phase 4: Testing → /tester
- Unit tests for service logic (NumberSequence concurrency, UoM conversion, SystemConfig caching)
- Command/Query handler tests
- Controller integration test scenarios

## Notes & Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | NumberSequence race condition under concurrent load | High | `SELECT FOR UPDATE` within transaction; integration test with parallel requests |
| 2 | AuditLog performance impact on high-write tables | Medium | Batch audit writes; exclude high-frequency tables if needed |
| 3 | SystemConfig cache stale across app instances | Medium | For Phase 1 (single instance), IMemoryCache is sufficient. Distributed cache (Redis) can be added later |
| 4 | Large audit log table growth | Low | Add index on (tenant_id, table_name, created_time); consider partitioning in future |
| 5 | Notification delivery not implemented | Low | By design — Phase 1 only queues; delivery deferred to Phase 5 |
