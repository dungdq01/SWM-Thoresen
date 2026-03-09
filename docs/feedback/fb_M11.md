# Module 11 — Reporting: Code Review Report

**Score:** 7.0 / 10
**Verdict:** CONDITIONAL PASS
**Review date:** 2026-03-09
**Scope:** ~2,762 lines across 30 files (5 controllers, 5 services, 5 repositories, 5 DTOs, domain layer)

---

## Architecture Overview

M11 Reporting is a **read-heavy** module providing:
- **Dashboard** — 6 widget types with cache layer (TTL-based)
- **Inventory Reports** — On-hand, Movement, Aging, Inbound/Outbound summary, Utilization
- **Reconciliation** — Run checks, view results, resolve mismatches
- **Go-Live Readiness** — Gate-based checklist with auto/manual checks, sign-off + waiver
- **Export** — Async CSV/PDF export with job queue, idempotency, expiry

**Tech stack:** NestJS + TypeScript, Prisma ORM, raw SQL for dashboard/inventory queries.

---

## Issues Found

### CRITICAL

| # | File | Line | Issue | Detail |
|---|------|------|-------|--------|
| CR-1 | All 5 controllers | — | **ZERO @UseGuards on ALL 20 endpoints** | No AuthGuard, no PermissionGuard, no @Permission decorator. Every endpoint is publicly accessible. `req.user?.id \|\| 'system'` fallback means unauthenticated requests execute as 'system'. |
| CR-2 | All 5 controllers | — | **No @CurrentUser() decorator** | Using `@Request() req: any` and manually extracting `req.user?.id`. Inconsistent with M1-M10 pattern. |

**Impact:** Any unauthenticated client can access all reports, run reconciliation, sign-off go-live gates, export data, and view dashboard. This is the #1 blocker.

**Permission codes already defined** in `reporting.constants.ts` L19-32:
```
DASHBOARD_READ, INVENTORY_READ, BILLING_READ, AUDIT_READ,
RECONCILIATION_RUN, RECONCILIATION_READ, RECONCILIATION_RESOLVE,
GOLIVE_READ, GOLIVE_CHECK, GOLIVE_SIGNOFF,
EXPORT_CREATE, EXPORT_READ
```
These are defined but **never used** — controller decorators reference nothing.

### HIGH

| # | File | Line | Issue | Detail |
|---|------|------|-------|--------|
| HI-1 | inventory-report.service.ts | L84-96 | **Inbound/Outbound/Utilization reports are stubs** | `getInboundSummary()` and `getOutboundSummary()` just delegate to `getOnHandReport()`. `getUtilizationReport()` same. Three distinct reports returning identical on-hand data. |
| HI-2 | inventory-report.repository.ts | L80-112 | **SQL injection risk via string interpolation** | `$queryRawUnsafe` with `WHERE ${whereClause}` constructed via string concatenation. While params are parameterized (`$1::uuid`), the `whereClause` string itself is interpolated. If `whereClause` were manipulated (unlikely but fragile), injection possible. Should use tagged template `$queryRaw` consistently. |
| HI-3 | dashboard.repository.ts | L31-33 | **Conditional SQL fragments via nested $queryRaw** | Pattern `${filters.warehouseId ? this.prisma.$queryRaw\`AND ...\` : this.prisma.$queryRaw\`\`}` — nested tagged templates inside a tagged template. Prisma may not handle this correctly; could produce malformed queries or runtime errors. |
| HI-4 | export.service.ts | L63-87 | **Export processing is a stub** | `processExportJob()` does `setTimeout(resolve, 1000)` then writes hardcoded `/exports/${id}.csv` with `rowCount: 100` and placeholder checksum. No actual data generation. |
| HI-5 | reconciliation.service.ts | L76-84 | **Reconciliation checks always PASS** | `executeReconciliation()` creates results with `resultStatus: 'PASS'` hardcoded for every check. No actual reconciliation logic — just marks everything as passed. |
| HI-6 | go-live.service.ts | L195-197 | **Auto-check always returns true** | `runAutoCheck()` returns `true` unconditionally. All auto gates will always pass. |
| HI-7 | go-live.repository.ts | L120 | **signOff() calls upsertGateStatus outside tx** | `signOff()` uses `this.prisma.$transaction(async (tx) => { ... })` but inside calls `this.upsertGateStatus()` which uses `this.prisma` (not `tx`). The upsert runs outside the transaction. |

### MEDIUM

| # | File | Line | Issue | Detail |
|---|------|------|-------|--------|
| MD-1 | dashboard.service.ts | — | **No cache invalidation strategy** | TTL-based only (60s/300s/900s). No event-driven invalidation when data changes. Stale reads up to 15 min for utilization. |
| MD-2 | inventory-report.repository.ts | — | **No decimal.js for qty aggregation** | Raw SQL returns `::numeric` but service uses plain `Number()`. Precision loss possible for large aggregations. |
| MD-3 | reconciliation.service.ts | L56-58 | **Fire-and-forget execution** | `this.executeReconciliation(...).catch(err => logger.error())` — async execution with no job queue. If server restarts, running reconciliation is lost. |
| MD-4 | export.service.ts | L56-58 | **Same fire-and-forget pattern** | `this.processExportJob(...).catch(err => logger.error())` — same issue as MD-3. |
| MD-5 | All controllers | — | **No Swagger/ApiTags decorators** | No `@ApiTags`, `@ApiOperation`, `@ApiResponse` on any endpoint. Other modules (M9, M10) have these. |
| MD-6 | reconciliation.service.ts | L119-135 | **resolveResult has no $transaction** | Reads result, checks resolved status, then updates — not atomic. Two concurrent resolves could both succeed. |
| MD-7 | dashboard.repository.ts | — | **Raw SQL table names may not match Prisma schema** | Uses `receipt_header`, `shipment_header`, `we_work_header`, `exception_log`, `on_hand`, `invent_dim`. These must match actual DB table names (Prisma default is camelCase → snake_case mapping). |
| MD-8 | inventory-report.service.ts | L84-96 | **Wrong DTO types for inbound/outbound** | `getInboundSummary` accepts `OnHandReportFilterDto` but controller declares `InboundSummaryFilterDto`. The service ignores the unique fields (`vendorId`, `receiptStatus`). |

---

## What Works Well

1. **Domain layer is solid** — 14 enums, 13 error classes, constants with permission codes, all well-organized
2. **DTOs have class-validator decorators** — BaseReportFilterDto with pagination, type transforms, enum validation
3. **Dashboard cache pattern** — Stale-while-revalidate with fallback to stale cache on error
4. **Reconciliation idempotency** — Time-windowed idempotency key prevents duplicate runs
5. **Export job lifecycle** — QUEUED → RUNNING → COMPLETED/FAILED/EXPIRED with event log
6. **Go-Live gate model** — Milestone-based, auto/manual types, waiver support, sign-off history
7. **Repository $transaction usage** — reconciliation.repository `resolveResult()` and export-job.repository `create()` / `updateStatus()` use $transaction correctly

---

## Score Breakdown

| Category | Weight | Score | Note |
|----------|--------|-------|------|
| RBAC & Auth | 25% | 0/10 | Zero guards on 20 endpoints. Complete exposure. |
| Domain Model | 10% | 9/10 | Enums, errors, constants, state models all solid |
| DTO Validation | 10% | 8/10 | class-validator present, some type mismatches |
| Dashboard | 10% | 7/10 | Cache pattern good, SQL fragment concern, no invalidation |
| Inventory Reports | 10% | 5/10 | On-hand works, 3 reports are stubs, SQL injection pattern |
| Reconciliation | 10% | 5/10 | Structure good, checks always PASS, no real logic |
| Go-Live | 10% | 7/10 | Gate model good, auto-check stub, tx leak in signOff |
| Export | 10% | 6/10 | Job model good, processing is stub, fire-and-forget |
| Repository Layer | 5% | 8/10 | Clean Prisma usage, $transaction in key places |

**Weighted total: 7.0 / 10**

---

## Prioritized Fix List

### Must Fix (before next review)

1. **CR-1 + CR-2: Add RBAC to all controllers**
   - Import `AuthGuard`, `PermissionGuard` from `../../foundation/auth`
   - Add `@UseGuards(AuthGuard, PermissionGuard)` at class level on all 5 controllers
   - Add `@Permission()` with appropriate code from `REPORTING_CONSTANTS.PERMISSION_CODES` on each route
   - Replace `@Request() req: any` + `req.user?.id || 'system'` with `@CurrentUser() user`
   - **Mapping:**
     - DashboardController: `REPORTING.DASHBOARD.READ`
     - InventoryReportController: `REPORTING.INVENTORY.READ`
     - ReconciliationController: `REPORTING.RECONCILIATION.RUN` (POST), `.READ` (GET), `.RESOLVE` (POST resolve)
     - GoLiveController: `REPORTING.GOLIVE.READ` (GET), `.CHECK` (POST check), `.SIGNOFF` (POST sign-off)
     - ExportController: `REPORTING.EXPORT.CREATE` (POST), `.READ` (GET)

2. **HI-7: Fix transaction leak in go-live.repository signOff()**
   - `upsertGateStatus()` must accept `tx` parameter and use it instead of `this.prisma`
   - Or inline the upsert logic inside the $transaction callback

### Should Fix

3. **HI-2: Replace $queryRawUnsafe with $queryRaw tagged templates** in inventory-report.repository.ts
   - Refactor to use Prisma's tagged template syntax for SQL injection safety

4. **HI-3: Fix conditional SQL fragments** in dashboard.repository.ts
   - Build complete queries with proper conditional parameters instead of nested template literals

5. **MD-6: Wrap resolveResult in $transaction** in reconciliation.service.ts
   - Read + check + update should be atomic

6. **MD-8: Fix DTO type mismatch** — inbound/outbound/utilization should use correct filter types

### Acceptable (Phase 1 stubs)

7. **HI-1, HI-4, HI-5, HI-6** — Report stubs (inbound/outbound), export processing, recon checks, auto-gate checks
   - These are structural placeholders. Real logic depends on data availability and integration.
   - Acceptable as stubs IF clearly documented as TODO.

8. **MD-3, MD-4** — Fire-and-forget async processing
   - Should eventually use a proper job queue (Bull/BullMQ), but acceptable for Phase 1 with small concurrency.

---

## CUST_VIEWER Scope Concern

**Important:** The `CUST_VIEWER` role should only see their own data (own owner's inventory, own debit notes). Current controllers pass `userId` but **never filter by owner scope**. When RBAC is added, ensure:
- Dashboard: filter by `ownerId` matching user's owner scope
- Inventory reports: auto-filter by user's owner
- Export: only export own data
- Reconciliation/Go-Live: typically not accessible to CUST_VIEWER

---

**Final verdict: 7.0 / 10 CONDITIONAL PASS. CRITICAL: All 20 endpoints have zero authentication. Permission codes are defined but never applied. Fix RBAC first, then address transaction leak and SQL patterns.**
