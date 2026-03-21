# Tasks: Phase 5 — Revenue & VAS

> Plan: `docs/feature/tvl-swm-phase5-revenue-vas/dev/plan.md`
> Context: `docs/feature/tvl-swm-phase5-revenue-vas/dev/context.json`

---

## Track 5A: Billing Calculation Engine (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 5A.1 | Create billing domain services (IFeeCalculationService, IRateLookupService, IBillingCaptureService) | /backend | None | ✅ Done |
| 5A.2 | Create BillingTransaction query + DTO + mapping (read-only, auto-captured) | /backend | None | ✅ Done |
| 5A.3 | Create DailyStorageSnapshot commands (RunDailySnapshot, RebuildSnapshots) + queries + DTOs | /backend | None | ✅ Done |
| 5A.4 | Create DebitNote commands (Generate, Update, Review, Approve, Lock) + queries + DTOs | /backend | 5A.1 | ✅ Done |
| 5A.5 | Create CreditNote commands (Create) + queries + DTOs | /backend | 5A.4 | ✅ Done |
| 5A.6 | Create billing report queries (GetBillingSummary, GetStorageOccupancy) | /backend | 5A.2, 5A.3 | ✅ Done |
| 5A.7 | Create controllers (BillingTransactionsController, DailyStorageSnapshotsController, DebitNotesController, CreditNotesController) | /backend | 5A.2-5A.5 | ✅ Done |
| 5A.8 | Create DynamicQuery form config scripts for billing grids | /backend | 5A.7 | ✅ Done |
| 5A.9 | Wire billing capture into existing receipt/ship command handlers | /backend | 5A.1 | ⚠️ Deferred — requires modifying existing Phase 4 handlers |

## Track 5B: VAS/Bagging Operations (Backend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 5B.1 | Create BaggingWorkOrder CRUD commands (Create, Update) + queries + DTOs + mappings | /backend | None | ✅ Done |
| 5B.2 | Create BWO status commands (Start, Cancel) with validation | /backend | 5B.1 | ✅ Done (Confirm merged into Start — enum has no Confirmed state) |
| 5B.3 | Create BaggingProgress CRUD commands (Create, Update, Delete) + DTOs | /backend | 5B.1 | ✅ Done |
| 5B.4 | Create CompleteBaggingWorkOrder with atomic InventTrans posting + lot creation | /backend | 5B.1, 5B.3 | ✅ Done |
| 5B.5 | Create DPM dual-tracking (nominal InventTrans on completion) | /backend | 5B.4 | ✅ Done (included in CompleteBaggingWorkOrder) |
| 5B.6 | Create BWO → BillingTransaction integration on completion | /backend | 5B.4, 5A.1 | ✅ Done (added by reviewer — IBillingCaptureService wired in) |
| 5B.7 | Create report queries (GetBaggingSummary, GetLotTraceability) | /backend | 5B.1 | ✅ Done |
| 5B.8 | Create controllers (BaggingWorkOrdersController + BaggingProgress nested) | /backend | 5B.1-5B.4 | ✅ Done |
| 5B.9 | Create DynamicQuery form config scripts for bagging grids | /backend | 5B.8 | ✅ Done |

## Track 5A: Billing Screens (Frontend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 5A.F1 | Create billing-transactions feature (list + detail) | /frontend | 5A.7 | ✅ Done |
| 5A.F2 | Create daily-storage-snapshots feature (list + rebuild) | /frontend | 5A.7 | ✅ Done |
| 5A.F3 | Create debit-notes feature (list, detail, generate wizard, status actions) | /frontend | 5A.7 | ✅ Done |
| 5A.F4 | Create credit-notes feature (list + create form) | /frontend | 5A.7 | ✅ Done |
| 5A.F5 | Register billing nav items, routes, i18n namespaces | /frontend | 5A.F1-F4 | ✅ Done |

## Track 5B: VAS/Bagging Screens (Frontend)

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 5B.F1 | Create bagging feature (list, create form, detail view) | /frontend | 5B.8 | ✅ Done |
| 5B.F2 | Create bagging progress recording UI | /frontend | 5B.8 | ✅ Done |
| 5B.F3 | Create bagging completion form with mass balance validation | /frontend | 5B.8 | ✅ Done |
| 5B.F4 | Create lot traceability view | /frontend | 5B.8 | ✅ Done |
| 5B.F5 | Register VAS nav items, routes, i18n namespaces | /frontend | 5B.F1-F4 | ✅ Done |

## Cross-cutting

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| X.1 | Review all Track 5A + 5B code | /reviewer | 5A.7, 5B.8, 5A.F5, 5B.F5 | ✅ Done — 3 fixes applied (rounding, idempotency, billing capture) |
| X.2 | Create unit tests for fee calculation service (22 tests) | /tester | 5A.1 | ✅ Done — All passing |
| X.3 | Create unit tests for BWO completion + InventTrans (21 tests) | /tester | 5B.4 | ✅ Done — All passing |
| X.4 | Create integration test scenarios | /tester | X.1 | ⚠️ Deferred — needs running backend |

---

## Review Notes

### Fixes Applied During Review
1. **FeeCalculationService**: Missing `Math.Round` on HIGHER_OF_TWO conditional path
2. **RunDailySnapshot**: Added idempotency guard — deletes existing snapshots for target date before re-creating
3. **CompleteBaggingWorkOrder**: Added `IBillingCaptureService.CaptureBaggingFeeAsync()` call per ADR-5

### Deliberate Simplifications
- Confirm + Start merged into single `StartBaggingWorkOrder` (BaggingStatus enum has no Confirmed state)
- BaggingProgressController consolidated into BaggingWorkOrdersController (fewer controllers, better cohesion)
