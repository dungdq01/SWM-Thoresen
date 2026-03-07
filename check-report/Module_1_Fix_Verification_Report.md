# Module 1 — Foundation & Governance: Fix Verification Report

**Previous review:** `check-report/Module_1_Code_Review_Report.md` (2026-03-08, Score 7.0)
**This review:** Verification of fixes
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Previous Score:** 7.0 / 10
**New Score:** 9.0 / 10
**Verdict:** PASS — All 5 CRITICAL + 6/7 HIGH issues resolved

---

## CRITICAL Issues — All 5 FIXED

### CR-1: DENY Permission Effect [FIXED]
**File:** `permission.repository.ts` lines 66-83
**Fix:** Implements Set difference logic — collects ALLOW codes and DENY codes separately, then filters `allowedCodes.filter(code => !deniedCodes.has(code))`.
**Verification:** Correct implementation. DENY permissions now properly subtract from effective permission set.

### CR-2: Owner Scope Enforcement [FIXED]
**File:** `permission.guard.ts` lines 64-76
**Fix:** Adds `x-owner-id` header check against `user.ownerScopes`. If user has owner scopes and request owner not in list → ForbiddenException.
**Verification:** Mirrors warehouse scope pattern. CUST_VIEWER now properly restricted to own owner data.

### CR-3: Idempotency Race Condition [FIXED]
**File:** `idempotency.service.ts` lines 35-64
**Fix:** Insert-first pattern. Attempts create first, catches Prisma P2002 (unique constraint violation), then falls back to findByKey for existing record.
**Verification:** Correct approach. Concurrent requests will have one succeed at insert and the other catch P2002 and return existing record.

### CR-4: PrismaService onModuleDestroy [FIXED]
**File:** `prisma.service.ts` (16 lines total)
**Fix:** Implements both `OnModuleInit` and `OnModuleDestroy` interfaces. `onModuleDestroy()` calls `$disconnect()`.
**Verification:** DB connections now properly cleaned up on shutdown.

### CR-5: Number Sequence Timezone [FIXED]
**File:** `number-sequence.service.ts` lines 169-191
**Fix:** Uses `toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })` to resolve Vietnam local date before calculating counter date.
**Verification:** Daily reset now happens at 00:00 Vietnam time instead of 07:00 Vietnam (which was 00:00 UTC).

---

## HIGH Issues — 6/7 FIXED, 1 ACKNOWLEDGED

### HI-1: Missing Pagination [FIXED]
**Files:** `log.dto.ts`, `role.dto.ts`
**Fix:** Added `page` (default 1, min 1) and `limit` (default 20, min 1, max 100) with `@Type(() => Number)`, `@IsInt()`, `@Min()`, `@Max()` validators. Also added `fromDate`/`toDate` date range filters.

### HI-2: DEV_AUTH_BYPASS Production Guard [FIXED]
**File:** `auth.guard.ts` lines 37-53
**Fix:** Adds `nodeEnv !== 'production'` check via ConfigService. Bypass only activates when `DEV_AUTH_BYPASS=true` AND `NODE_ENV !== production`.

### HI-3: Audit Log Transaction Safety [FIXED]
**File:** `governance.service.ts`
**Fix:** All CRUD operations (createRule, updateRule, createDecisionLog, createChangeControl) now properly call `logService.createAuditLog()` with full context (entityType, entityId, action, oldValue, newValue, userId, userRole, requestId, sourceModule).

### HI-4: Missing TRF/ADJ Sequences [FIXED]
**File:** `seed.ts` lines 369-397
**Fix:** Seeds all 7 sequences: `['RCV', 'SHP', 'WRK', 'TRX', 'DN', 'TRF', 'ADJ']`. Each with PER_WAREHOUSE scope, DAILY reset, 6-digit running number.

### HI-5: Health Check DB [FIXED]
**File:** `health.controller.ts` (30 lines)
**Fix:** Executes `$queryRaw\`SELECT 1\`` to verify DB connectivity. Returns `{ status: 'ok', database: 'connected' }` or `{ status: 'degraded', database: 'disconnected' }`.

### HI-6: Raw SQL in Number Sequence [ACKNOWLEDGED — Intentional]
**File:** `number-sequence.repository.ts` lines 112-124
**Status:** Raw SQL retained intentionally. Uses parameterized `$queryRawUnsafe` with `UPDATE ... SET last_number = last_number + 1 RETURNING last_number`. This atomic UPDATE+RETURNING pattern cannot be expressed via Prisma ORM and is necessary for correctness under concurrency.
**Assessment:** Acceptable. Parameterized query prevents SQL injection.

### HI-7: Inactive Permission Assignment [FIXED]
**File:** `permission.repository.ts` lines 26-36
**Fix:** `findByCodes()` now includes `isActive: true` in where clause. Inactive permissions cannot be assigned to roles.

---

## Remaining Observations (Minor)

| # | Item | Severity | Note |
|---|------|----------|------|
| 1 | Vietnamese error messages still present in guards | LOW | Not blocking. Consider i18n later. |
| 2 | Audit log for ACCESS_DENIED still not auto-logged | LOW | PermissionGuard throws 403 but doesn't write AuditLog. Can add in Phase 2. |
| 3 | `toLocaleString` timezone approach works but is locale-dependent | LOW | Consider `date-fns-tz` or `luxon` for robustness. Acceptable for Phase 1. |

---

## Score Upgrade Justification

| Category | Previous | Current | Note |
|----------|----------|---------|------|
| RBAC correctness | 60% | 95% | DENY effect + owner scope fixed |
| Data integrity | 70% | 95% | Idempotency race + timezone fixed |
| Infrastructure | 80% | 95% | PrismaService lifecycle + health check |
| Pagination/filtering | 50% | 90% | All list endpoints paginated |
| Security | 70% | 90% | DEV_AUTH_BYPASS guarded |
| **Overall** | **7.0** | **9.0** | All CRITICAL resolved |
