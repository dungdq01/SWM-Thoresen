# Tasks: Sale Order Detail UI Enhancement

> Plan: `docs/feature/sale-order-detail-ui/dev/plan.md`
> Context: `docs/feature/sale-order-detail-ui/dev/context.json`

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create RemoveSaleOrderDetail command | /backend | None | Pending |
| 2 | Update UpdateSaleOrder to accept detail lines (replace-all) | /backend | None | Pending |
| 3 | Add DELETE endpoint to SaleOrdersController | /backend | #1 | Pending |
| 4 | Add SaleOrderDetail schema + update API types | /frontend | None | Pending |
| 5 | Update input config with line item schema + defaults | /frontend | None | Pending |
| 6 | Create SaleOrdersActionDialog with useFieldArray | /frontend | #4, #5 | Pending |
| 7 | Update SaleOrdersDialogs to use custom dialog | /frontend | #6 | Pending |
| 8 | Add i18n translations for detail fields (EN + VI) | /frontend | None | Pending |
| 9 | Build verification (backend + frontend) | /reviewer | #1-#8 | Pending |
