# Tasks: Phase 1 Foundation — Auth & Platform Services

> Plan: `docs/feature/tvl-swm-phase1-foundation/dev/plan.md`
> Context: `docs/feature/tvl-swm-phase1-foundation/dev/context.json`

## Backend Tasks

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create AuditSaveChangesInterceptor (auto-capture INSERT/UPDATE/DELETE with old/new JSONB values) | /backend | None | Done |
| 2 | Create INumberSequenceService + implementation (optimistic concurrency with RowVersion, daily reset) | /backend | None | Done |
| 3 | Create IUomService + implementation (ConvertAsync between UoMs using conversion table) | /backend | None | Done |
| 4 | Create ISystemConfigService + implementation (GetAsync<T>, typed access, IMemoryCache per tenant with invalidation) | /backend | None | Done |
| 5 | Create INotificationService + implementation (SendAsync — append to NotificationLog) | /backend | None | Done |
| 6 | Create UserWarehouseAccess CQRS (AssignWarehouseAccess, RemoveWarehouseAccess, GetUserWarehouseAccessList) + Controller | /backend | None | Done |
| 7 | Create NumberSequence CQRS (Create, Update, GetList, GetById, GenerateNextNumber) + Controller | /backend | #2 | Done |
| 8 | Create Uom CQRS (Create, Update, GetList, GetById, GetLookup) + Controller | /backend | None | Done |
| 9 | Create UomConversion CQRS (Create, Update, Delete, GetList) + Controller | /backend | #8 | Done |
| 10 | Create ReasonCode CQRS (Create, Update, GetList, GetById, GetLookup) + Controller | /backend | None | Done |
| 11 | Create SystemConfig CQRS (UpdateConfig, GetConfigList, GetConfigByKey) + Controller | /backend | #4 | Done |
| 12 | Create AuditLog Query (GetAuditLogList with filters) + Controller | /backend | #1 | Done |
| 13 | Create DocumentTemplate CQRS (Create, Update, GetList, GetById) + Controller | /backend | None | Done |
| 14 | Create NotificationConfig CQRS (Create, Update, GetConfigList, GetById) + Controller | /backend | None | Done |
| 15 | Create NotificationLog Query (GetNotificationLogList) + Controller | /backend | #5 | Done |
| 16 | Register all new services in DI (Application + Infrastructure ServiceConfigurations) | /backend | #1-#15 | Done |
| 17 | Backend build verification (`dotnet build`) | /backend | #16 | Done (0 errors) |

## Frontend Tasks

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 18 | Create NumberSequences feature (CRUD UI + GenerateNext action) | /frontend | #7, #17 | Done |
| 19 | Create Uoms feature (CRUD UI) + UomConversions (sub-tab/section) | /frontend | #8, #9, #17 | Done |
| 20 | Create ReasonCodes feature (CRUD UI with category filter) | /frontend | #10, #17 | Done |
| 21 | Create SystemConfig feature (key-value editor UI) | /frontend | #11, #17 | Done |
| 22 | Create AuditLogs feature (read-only log viewer with filters) | /frontend | #12, #17 | Done |
| 23 | Create DocumentTemplates feature (CRUD UI with template content editor) | /frontend | #13, #17 | Done |
| 24 | Create Notifications feature (Config management + Log viewer) | /frontend | #14, #15, #17 | Done |
| 25 | Register sidebar navigation (Foundation group), i18n namespaces, route entries | /frontend | #18-#24 | Done |
| 26 | Frontend build verification (`pnpm build`) | /frontend | #25 | Done (0 errors) |

## Review & Testing

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 27 | Code review — pattern compliance, cross-layer contract, security | /reviewer | #17, #26 | Done |
| 27a | Fix C-1: NumberSequenceService concurrency (optimistic with RowVersion) | /reviewer | #27 | Done |
| 27b | Fix C-2: Remove non-existent delete endpoints from frontend (5 features) | /reviewer | #27 | Done |
| 27c | Fix C-3: Document hard delete policy for junction tables | /reviewer | #27 | Done |
| 27d | Fix C-4: Remove dead IsActive from GetUomLookup | /reviewer | #27 | Done |
| 27e | Fix W-1: Use FormatPattern in NumberSequenceService | /reviewer | #27 | Done |
| 27f | Fix W-2: Add re-entry guard to AuditSaveChangesInterceptor | /reviewer | #27 | Done |
| 27g | Fix W-3: Inline projection for UomConversionList query | /reviewer | #27 | Done |
| 27h | Fix W-4: Rename formConfigCode → formCode in all frontend search APIs | /reviewer | #27 | Done |
| 27i | Fix W-5: Add GetById endpoint to NotificationConfigsController | /reviewer | #27 | Done |
| 27j | Fix W-6: Use GetOrCreateAsync in SystemConfigService | /reviewer | #27 | Done |
| 28 | Unit tests — NumberSequenceService, UomService, SystemConfigService, AuditInterceptor | /tester | #27 | Pending |
| 29 | Integration test scenarios — API endpoint verification | /tester | #27 | Pending |
