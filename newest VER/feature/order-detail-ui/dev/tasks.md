# Tasks: Order Detail UI Enhancement

> Plan: `docs/feature/order-detail-ui/dev/plan.md`
> Context: `docs/feature/order-detail-ui/dev/context.json`

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create AddOrderDetail command | /backend | None | Pending |
| 2 | Create RemoveOrderDetail command | /backend | None | Pending |
| 3 | Update UpdateOrder to accept detail lines (replace-all) | /backend | None | Pending |
| 4 | Add POST detail + DELETE detail endpoints to controller | /backend | #1, #2 | Pending |
| 5 | Add OrderDetail schema + update API types | /frontend | None | Pending |
| 6 | Update input config with line item schema + defaults | /frontend | None | Pending |
| 7 | Create OrdersActionDialog with useFieldArray | /frontend | #5, #6 | Pending |
| 8 | Update OrdersDialogs to use custom dialog | /frontend | #7 | Pending |
| 9 | Add i18n translations for detail fields (EN + VI) | /frontend | None | Pending |
| 10 | Build verification (backend + frontend) | /reviewer | #1-#9 | Pending |
