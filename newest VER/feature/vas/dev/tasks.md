# Tasks: VAS (Value-Added Services) Module

> Plan: `docs/feature/vas/dev/plan.md`
> Context: `docs/feature/vas/dev/context.json`

---

## Phase 1 — Backend

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1.1 | Update `VasEnums.cs`: replace `BaggingStatus` with `VasType`, `VasWorkOrderStatus`, `VasSessionStatus`; rename `PackagingOwnership` values to `TvlOwned`/`ClientOwned` | /backend | None | Pending |
| 1.2 | Create 6 domain entities: `VasBom`, `VasBomLine`, `VasWorkOrder`, `VasWorkOrderSource`, `VasSession`, `VasSessionLine` in `Domain/Entities/Vas/` | /backend | 1.1 | Pending |
| 1.3 | Update `IAppDbContext.cs` — remove old Bagging DbSets, add 6 new VAS DbSets | /backend | 1.2 | Pending |
| 1.4 | Update `AppDbContext.cs` — mirror IAppDbContext changes | /backend | 1.3 | Pending |
| 1.5 | Create 6 EF configurations in `Infrastructure/EntityFramework/Configurations/Vas/` (replace Bagging configs) | /backend | 1.2 | Pending |
| 1.6 | BOM Commands: `CreateVasBom`, `UpdateVasBom`, `ToggleVasBomStatus` (BR-VAS-001, BR-VAS-002) | /backend | 1.3 | Pending |
| 1.7 | BOM Queries: `GetVasBomList` (DynamicQuery, formCode `OPSVASBOMG01`), `GetVasBomById` | /backend | 1.3 | Pending |
| 1.8 | BOM Dto + Mappings | /backend | 1.7 | Pending |
| 1.9 | WorkOrder Commands: `CreateVasWorkOrder`, `ConfirmVasWorkOrder` (creates sources + target lot, BR-VAS-003) | /backend | 1.3 | Pending |
| 1.10 | WorkOrder Commands: `CompleteVasWorkOrder` (billing trigger, BR-VAS-007, BR-VAS-008), `CancelVasWorkOrder` | /backend | 1.3 | Pending |
| 1.11 | WorkOrder Queries: `GetVasWorkOrderList` (DynamicQuery, formCode `OPSVWOG01`), `GetVasWorkOrderById` | /backend | 1.3 | Pending |
| 1.12 | WorkOrder Dto + Mappings | /backend | 1.11 | Pending |
| 1.13 | Session Commands: `OpenVasSession` (session_number auto-increment, WO→IN_PROGRESS) | /backend | 1.3 | Pending |
| 1.14 | Session Command: `ConfirmVasSession` — atomic InventTrans creation (BR-VAS-004, BR-VAS-005, BR-VAS-006, BR-VAS-009, BR-VAS-010) | /backend | 1.3 | Pending |
| 1.15 | Session Command: `CancelVasSession` — reverse InventTrans if CONFIRMED, just set CANCELLED if OPEN | /backend | 1.3 | Pending |
| 1.16 | Session Queries: `GetVasSessionList` (DynamicQuery, formCode `OPSVSLG01`) | /backend | 1.3 | Pending |
| 1.17 | Session Dto + Mappings | /backend | 1.16 | Pending |
| 1.18 | Create `VasBomController`, `VasWorkOrdersController`, `VasSessionsController` | /backend | 1.8, 1.12, 1.17 | Pending |
| 1.19 | QueryConfigs: `VasBomList.json`, `VasWorkOrderList.json`, `VasSessionList.json` | /backend | 1.5 | Pending |
| 1.20 | EF Migration: `AddVasModule` — DROP old tables/enum, CREATE new tables/enums | /backend | 1.5 | Pending |
| 1.21 | Delete old files: `BaggingWorkOrderConfiguration.cs`, `BaggingProgressConfiguration.cs` (done as part of migration task) | /backend | 1.20 | Pending |

---

## Phase 2 — Frontend

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2.1 | `vas-bom` feature: API types (Zod schemas), query keys, `vas-bom.ts` API client | /frontend | Phase 1 done | Pending |
| 2.2 | `vas-bom` components: `VasBomList` (DynamicGrid), `VasBomForm`, `VasBomLinesGrid` (add/remove rows) | /frontend | 2.1 | Pending |
| 2.3 | `vas-work-order` feature: API types, query keys, `vas-work-order.ts` API client | /frontend | Phase 1 done | Pending |
| 2.4 | `vas-work-order` components: `VasWorkOrderList`, `VasWorkOrderForm` (BOM dropdown → auto-fill target_item) | /frontend | 2.3 | Pending |
| 2.5 | `VasWorkOrderConfirmDialog` — source lot selection table (multi-lot per source item, qty allocation, available qty check) | /frontend | 2.3 | Pending |
| 2.6 | `VasWorkOrderDetail` — summary card + progress bar (actual/planned), sessions table, waste report | /frontend | 2.3 | Pending |
| 2.7 | `vas-session` feature: API types, query keys, `vas-session.ts` API client | /frontend | Phase 1 done | Pending |
| 2.8 | `VasSessionConfirmDialog` — output qty, target location, consumed-per-lot table (add/remove lot rows), waste display | /frontend | 2.7 | Pending |
| 2.9 | Routes: `vas/bom/index.tsx`, `vas/bom/$bomId.tsx`, `vas/work-orders/index.tsx`, `vas/work-orders/$vwoId.tsx` | /frontend | 2.2, 2.6 | Pending |
| 2.10 | Update sidebar (`sidebar-data.ts`): replace Bagging item with "BOM" + "Work Orders" under VAS group | /frontend | 2.9 | Pending |
| 2.11 | Update i18n: `en/navigation.json` + `vi/navigation.json` — add vasBom, vasWorkOrders keys; add `en/vas.json` + `vi/vas.json` for screen labels | /frontend | 2.9 | Pending |
| 2.12 | Remove old bagging route/files if still present after replacement | /frontend | 2.9 | Pending |

---

## Phase 3 — Review

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3.1 | Review backend code (entities, CQRS handlers, EF configs, controllers) | /reviewer | Phase 1 | Pending |
| 3.2 | Review frontend code (feature structure, component logic, API integration) | /reviewer | Phase 2 | Pending |
| 3.3 | Verify InventTrans atomicity in ConfirmVasSession | /reviewer | 3.1 | Pending |

---

## Phase 4 — Testing

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| 4.1 | Unit tests: `CreateVasBom`, `ToggleVasBomStatus` (BR-VAS-001, BR-VAS-002) | /tester | Phase 3 | Pending |
| 4.2 | Unit tests: `ConfirmVasWorkOrder` (source creation, lot creation, BR-VAS-003) | /tester | Phase 3 | Pending |
| 4.3 | Unit tests: `ConfirmVasSession` (InventTrans creation, CLIENT_OWNED skip, DE_BAGGING skip, BR-VAS-004/010) | /tester | Phase 3 | Pending |
| 4.4 | Unit tests: `CompleteVasWorkOrder` (BR-VAS-007, billing trigger graceful failure) | /tester | Phase 3 | Pending |

---

## Status Legend
- `Pending` — not started
- `In Progress` — actively being worked
- `Done` — completed
- `Blocked` — waiting on dependency
