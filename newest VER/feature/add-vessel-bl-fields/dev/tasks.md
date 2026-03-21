# Tasks: Add VesselName & BlNumber to InboundReceipt, SaleOrder, OrderHeader

> Plan: `docs/feature/add-vessel-bl-fields/dev/plan.md`
> Context: `docs/feature/add-vessel-bl-fields/dev/context.json`

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Add properties to 3 domain entities | /backend | None | Done |
| 2 | Add EF column configurations for 3 entities | /backend | #1 | Done |
| 3 | Update Create/Update commands for 3 entities (6 files) | /backend | #1 | Done |
| 4 | Update DTOs for 3 entities (3 files) | /backend | #1 | Done |
| 5 | Update Mappings for 3 entities (3 files) | /backend | #4 | Done |
| 6 | Create EF migration | /backend | #1, #2 | Done |
| 7 | Update frontend schemas (3 files) | /frontend | #4 | Done |
| 8 | Update frontend API interfaces (3 files) | /frontend | #4 | Done |
| 9 | Update frontend input configs + defaults (3 files) | /frontend | #7 | Done |
| 10 | Update i18n files (6 files: en + vi × 3 features) | /frontend | None | Done |
| 11 | Build verification (backend + frontend) | /reviewer | #1-#10 | Done |
