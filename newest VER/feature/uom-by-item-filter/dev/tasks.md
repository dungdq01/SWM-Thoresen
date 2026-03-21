# Tasks: UOM Selection Filtered by Item's UOM Conversions

> Plan: `docs/feature/uom-by-item-filter/dev/plan.md`
> Context: `docs/feature/uom-by-item-filter/dev/context.json`

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create GetUomLookupByItem query handler + add endpoint to controller | /backend | None | Pending |
| 2 | Add frontend API method + query key + register data source | /frontend | #1 | Pending |
| 3 | Update PO dialog UOM SelectField to use uoms-by-item with watchField | /frontend | #2 | Pending |
| 4 | Update SO dialog UOM SelectField to use uoms-by-item with watchField | /frontend | #2 | Pending |
| 5 | Update Order dialog UOM SelectField to use uoms-by-item with watchField | /frontend | #2 | Pending |
| 6 | Update Receipt create/edit dialogs UOM Select with itemId-filtered options | /frontend | #2 | Pending |
| 7 | Build verification (backend + frontend) | /team | #1-#6 | Pending |
