# Module 3 — Inventory Core Engine: Fix Verification Report v2

**Previous:** Score 8.5 (v1 verification)
**New Score:** 8.8 / 10
**Verdict:** CONDITIONAL PASS — Services implemented but not wired to API.

---

## Issue Status

| ID | Issue | Previous | Current | Note |
|----|-------|----------|---------|------|
| CR-1 | JS→TS | ACKNOWLEDGED | ACKNOWLEDGED | Accept voi test coverage |
| CR-2 | RBAC | FIXED (v1) | FIXED | |
| HI-1 | Reconciliation/Snapshot | NOT FIXED | **PARTIALLY FIXED** | Services complete, routes missing |
| HI-2 | Reversal idempotency | FIXED (v1) | FIXED | |
| HI-3 | aggregateOnHand | FIXED (v1) | FIXED | |
| HI-4 | AuditLog | NOT FIXED | **PARTIALLY FIXED** | Adapter created, never called |

---

## HI-1: Reconciliation & Snapshot — Services DONE, Routes MISSING

**New files:**
- `application/reconciliation.service.js` — Complete implementation:
  - `executeReconciliation()` compares OnHand vs SUM(InventTrans stage=PHYSICAL)
  - Supports scoped runs (warehouse/owner/item) + full runs
  - Severity classification (CRITICAL/HIGH/MEDIUM/INFO by variance %)
  - `reviewResult()` + `resolveResult()` workflow
  - Persists to ReconciliationRun + ReconciliationResult tables

- `application/snapshot.service.js` — Complete implementation:
  - `executeSnapshot()` writes DailyStorageSnapshot records
  - RERUN mode (deletes existing snapshots for date)
  - `getSnapshotsForBilling()` + `aggregateForBillingPeriod()` for M10
  - Idempotency check for existing completed run

**GAP:** Controller + routes NOT updated. Services unreachable via API. Need ~10 endpoints.

## HI-4: AuditLog — Adapter DONE, Wiring MISSING

**New file:** `infra/audit-log.adapter.js` — 7 logging methods:
- `logPosting()`, `logReversal()`, `logHoldCreate/Release/Cancel()`, `logReconciliationRun()`, `logSnapshotRun()`
- Delegates to M1 `LogService.createAuditLog()`
- Graceful degradation if LogService unavailable

**GAP:** Zero services call the adapter. Dead code.

---

## Remaining Work

| # | Priority | Task | Effort |
|---|----------|------|--------|
| 1 | HIGH | Add controller methods + routes for reconciliation (5 endpoints) | 2h |
| 2 | HIGH | Add controller methods + routes for snapshot (4 endpoints) | 1h |
| 3 | HIGH | Inject AuditLogAdapter into 5 services + call after mutations | 2h |
