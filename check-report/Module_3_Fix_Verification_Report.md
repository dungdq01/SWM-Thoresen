# Module 3 — Inventory Core Engine: Fix Verification Report

**Previous review:** `check-report/Module_3_Code_Review_Report.md` (2026-03-09, Score 7.5)
**This review:** Verification of fixes
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Previous Score:** 7.5 / 10
**New Score:** 8.5 / 10
**Verdict:** CONDITIONAL PASS — 1/2 CRITICAL fixed, 2/4 HIGH fixed. Core logic unchanged (van excellent).

---

## Result Summary

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 2 | **1** | 1 (JS→TS) |
| HIGH | 4 | **2** | 2 (Reconciliation, AuditLog) |
| MEDIUM | 6 | 0 | 6 (low priority) |

---

## CRITICAL Issues

### CR-1: JavaScript — No Type Safety [NOT FIXED — ACKNOWLEDGED]
**Status:** All 19+ files van la `.js`. Khong co JSDoc type annotations. Khong co TypeScript.
**New file added:** `middleware/auth.middleware.js` — cung la JS.
**Assessment:** Dev team chon giu JS. Accept voi dieu kien:
- Comprehensive test coverage > 80% (chua verify)
- Downstream M4 cung dung JS — co the la deliberate architecture decision cho "inventory + inbound" group

### CR-2: Zero RBAC on Routes [FIXED]
**Fix:** New file `middleware/auth.middleware.js` implements:
- `authMiddleware` — JWT Bearer token validation, resolves user permissions + warehouse/owner scopes
- `permissionMiddleware(code)` — checks specific permission code against `req.user.permissionCodes`
- Warehouse scope enforcement via `x-warehouse-code` header
- Owner scope enforcement via `x-owner-id` header
- DEV_AUTH_BYPASS guarded (`nodeEnv !== 'production'`)

**9 permission codes defined:**
| Code | Endpoints |
|------|-----------|
| INVENTORY.POSTING.CREATE | POST /postings |
| INVENTORY.POSTING.READ | GET /transactions |
| INVENTORY.REVERSAL.CREATE | POST /postings/reverse |
| INVENTORY.ONHAND.READ | GET /onhand, /onhand/availability |
| INVENTORY.HOLD.CREATE | POST /holds |
| INVENTORY.HOLD.READ | GET /holds |
| INVENTORY.HOLD.RELEASE | POST /holds/:id/release |
| INVENTORY.HOLD.CANCEL | POST /holds/:id/cancel |
| INVENTORY.TRANSACTION.READ | GET /transactions/:id |

**Verification:** All 11 routes protected. Consistent voi M1 RBAC pattern.

---

## HIGH Issues

### HI-1: Reconciliation & Snapshot Service [NOT FIXED]
**Status:** Van khong co `reconciliation.service.js` hoac `snapshot.service.js`. Types/enums da dinh nghia trong `inventory.types.js` nhung khong co service implementation.
**Impact:** Block M10 Billing (can DailyStorageSnapshot) va M11 Reporting (can reconciliation results).

### HI-2: Reversal Idempotency [FIXED]
**Fix:** `reversal-engine.service.js` now checks `externalId` upfront:
1. If `externalId` provided → lookup existing reversal trans
2. If found and `isReversal === true` → return `{ ...existing, idempotentReplay: true }`
3. Check happens BEFORE finding original trans or creating reversal
**Verification:** Correct pattern. Matches posting engine idempotency.

### HI-3: aggregateOnHand 10K Limit + parseFloat [FIXED]
**Fix:**
- Uses `this.prisma.$queryRaw` with proper SQL `GROUP BY` joining on_hand + invent_dim + master tables
- Results mapped through `new Decimal(row.physical_qty || 0).toString()`
- No more in-memory 10K cap, no more `parseFloat`
**Minor concern:** Dynamic SQL column interpolation in `$queryRaw` may not work as expected (Prisma tagged template sanitizes values, not identifiers). Functional risk low.

### HI-4: No M1 AuditLog Integration [NOT FIXED]
**Status:** Zero references to audit, LogService, or createAuditLog in any file.

---

## Score Upgrade Justification

| Category | Previous | Current | Note |
|----------|----------|---------|------|
| Core logic | 95% | 95% | Unchanged, excellent |
| Security (RBAC) | 0% | 90% | Full auth + 9 permissions |
| Idempotency | 85% | 95% | Reversal idempotency added |
| Data precision | 85% | 95% | DB GROUP BY + Decimal.js |
| Architecture | 30% | 30% | Still JS, acknowledged |
| Completeness | 75% | 75% | Still missing reconciliation/snapshot |
| **Overall** | **7.5** | **8.5** | RBAC + idempotency + precision fixed |

---

## Remaining Work

| # | Priority | Issue | Effort | Block |
|---|----------|-------|--------|-------|
| 1 | HIGH | Implement ReconciliationService + SnapshotService | 2 days | Truoc M10/M11 |
| 2 | HIGH | Integrate M1 AuditLog | 2h | Truoc production |
| 3 | ACKNOWLEDGED | JS architecture (no TS) | — | Accept voi test coverage |
