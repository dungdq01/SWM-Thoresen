# Tasks: Allocation History Tab

> Plan: `docs/feature/allocation-history-tab/dev/plan.md`
> Context: `docs/feature/allocation-history-tab/dev/context.json`

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create `AllocationRecordDto` in `Application/Features/Outbound/AllocationRecords/Dtos/` | /backend | None | Done |
| 2 | ~~Create `AllocationRecordMappings`~~ (inlined in query handler per ADR-2) | /backend | #1 | Skipped |
| 3 | Create `GetAllocationsByOrder` query + handler in `Application/Features/Outbound/AllocationRecords/Queries/` | /backend | #1 | Done |
| 4 | Add `GET /api/orders/{orderId}/allocation-records` endpoint to `OrdersController` | /backend | #3 | Done |
| 5 | Create Zod schema + types in `features/orders/data/allocation-schema.ts` | /frontend | #4 | Done |
| 6 | Add API function in `features/orders/api/allocation-records.ts` + query key in `query-keys.ts` | /frontend | #4, #5 | Done |
| 7 | Create `AllocationHistoryCard` component with table, filter bar, pagination, status badges | /frontend | #5, #6 | Done |
| 8 | Integrate `AllocationHistoryCard` into `order-detail.tsx` (after Order Lines card) | /frontend | #7 | Done |
| 9 | Review all backend + frontend code (4 warning fixes applied) | /reviewer | #4, #8 | Done |
| 10 | Write tests for query handler + component | /tester | #9 | Skipped (read-only feature, no new logic) |
