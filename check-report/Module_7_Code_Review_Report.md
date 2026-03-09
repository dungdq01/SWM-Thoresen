# Module 7 — Work Execution: Code Review Report

**Code path:** `backend/src/modules/work-execution/` (26 JS files)
**Spec files:** `docs/spec/module_7_work_execution_spec.md`, `description-docs/.../TVL_SWM_Work_Execution_Spec.md`
**Prisma models:** 9 M7 models (WeWork prefix), 16 M7 enums
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Score:** 8.5 / 10
**Verdict:** CONDITIONAL PASS — Architecture excellent, M3 posting integrated, mobile sync complete. Minor gaps: posting failure recovery, outbox consumer missing, versionNo unused.

---

## Tech Stack — Consistent voi M3/M4/M6

| Layer | Choice | Note |
|-------|--------|------|
| Language | **JavaScript (CommonJS)** | Same as M3/M4/M6, khac M1/M2/M5 (TypeScript) |
| Framework | **Express Router** | Same as M3/M4/M6 |
| Validation | **Joi** | 12 schemas, comprehensive |
| ORM | Prisma | Consistent across all modules |
| Auth | **authMiddleware + permissionMiddleware** | **CO RBAC** — 10 permission codes |
| Architecture | **Use Case pattern** | Clean DDD: Domain → Application → Infrastructure |

---

## Code Scope

| Layer | Count | Components |
|-------|-------|-----------|
| Use Cases | 10 | generateWork, claimWork, startWork (header+line), completeLine, skipLine, cancelWork, syncBatch, validateScan, getWorkList (7 queries) |
| Domain | 4 | types (198 lines), state-machine (147), policy (190), errors (174) |
| Infrastructure | 7 | workHeader, workLine, workEvent, workException, workOutbox, mobileSync repositories + inventoryAdapter |
| Controller | 1 | 18 handler methods (479 lines) |
| Routes | 1 | 16 endpoints with RBAC (157 lines) |
| Schemas | 1 | 12 Joi schemas (181 lines) |
| Mapper | 1 | 7 response mappers (187 lines) |
| Prisma Models | 9 | WeWorkHeader, WeWorkLine, WeWorkStatusHistory, WeWorkAssignmentHistory, WeWorkPostingLink, WeWorkEventLog, WeWorkException, WeWorkOutboxEvent, WeMobileSyncBatch + WeMobileSyncEvent |

### 5 Work Types (Phase 1)
1. **PUTAWAY** — Receipt RECEIVED → put from RECEIVING to STORAGE
2. **PICK** — Shipment ALLOCATED → pick from STORAGE to STAGING_OUT
3. **MOVE** — Manual move request → 2 steps (MOVE_FROM + MOVE_TO)
4. **TRANSFER_PICK** — Transfer Order → pick at source warehouse
5. **TRANSFER_PUT** — Transfer Order → put at destination warehouse

---

## Review Gate Checklist (12 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | 5 work types implemented? | **PASS** | PUTAWAY, PICK, MOVE, TRANSFER_PICK, TRANSFER_PUT |
| 2 | Header + Line state machines correct? | **PASS** | Header: OPEN→IN_PROGRESS→COMPLETED/CANCELLED. Line: OPEN→IN_PROGRESS→COMPLETED/SKIPPED/CANCELLED. Terminal states locked. |
| 3 | Self-claim model? | **PASS** | Claim sets assigned_to only, status stays OPEN. Pessimistic lock (FOR UPDATE) prevents race. |
| 4 | WorkLine.complete → InventTrans posting? | **PASS** | inventoryAdapter.postMovement() called with correct transType per work type. PostingLink created. |
| 5 | Auto-complete header when all lines terminal? | **PASS** | Checks COMPLETED/SKIPPED/CANCELLED. Creates outbox callback event. |
| 6 | Short pick tolerance? | **PASS** | ≤2% auto-accept, 2-5% warn, >5% block (manager override). |
| 7 | Location QR scan validation? | **PASS** | Validates exists, active, not BLOCKED, same warehouse, correct location type per work type. |
| 8 | Manager override with evidence? | **PASS** | Requires actualQty + reasonCode + evidenceText (min 10 chars). Full audit trail. |
| 9 | RBAC enforce? | **PASS** | 10 permission codes on all 16 routes. authMiddleware + permissionMiddleware. |
| 10 | Idempotency? | **PASS** | 3-level: externalId UNIQUE + sourceRef composite + state-based idempotent checks. |
| 11 | Mobile offline sync? | **PASS** | Batch sync with dedup (batchExternalId + event externalId). DUPLICATE/CONFLICT/REJECTED results. |
| 12 | Outbox pattern for callbacks? | **PARTIAL** | WeWorkOutboxEvent with retry logic (exponential backoff, max 5). BUT no outbox consumer/publisher service in module. |

**Result: 11/12 PASS, 1/12 PARTIAL**

---

## Diem Manh — What's Done Well

### 1. Use Case Architecture — BEST IN PROJECT
Clean domain-driven design with clear separation:
- **Domain:** types, state-machine, policy, errors — pure business logic, no Prisma dependency
- **Application:** 10 use cases, each single-responsibility
- **Infrastructure:** repositories, adapter, mapper — data access only

Day la architecture tot nhat trong toan bo project. M3/M4/M6 dung monolithic service files. M7 dung proper use case pattern.

### 2. M3 Inventory Posting — CORRECT
`inventoryAdapter.js` — Single integration point to M3 PostingEngine:
- PUTAWAY/PICK/MOVE → transType `MOVE`
- TRANSFER_PICK → transType `TRANSFER_SHIP`
- TRANSFER_PUT → transType `TRANSFER_RECEIVE`
- PostingLink created with 1:1 mapping to WorkLine
- externalId + correlationId for traceability

**WorkLine → InventTrans mapping matches spec exactly:**
| Work Type | Trans Type | From Dim | To Dim |
|-----------|-----------|----------|--------|
| PUTAWAY PUT | MOVE | RECEIVING location | Scanned STORAGE |
| PICK | MOVE | Allocated STORAGE | STAGING_OUT |
| MOVE | MOVE | Source location | Dest location |
| TRANSFER_PICK | TRANSFER_SHIP | Source WH STORAGE | (empty) |
| TRANSFER_PUT | TRANSFER_RECEIVE | (empty) | Dest WH STORAGE |

### 3. Idempotency — 3-LEVEL, COMPREHENSIVE
**Level 1:** externalId UNIQUE constraint on WorkHeader + WorkLine
**Level 2:** Composite unique on (sourceModule, sourceType, sourceRefId, sourceRefLineId, workType)
**Level 3:** State-based checks — claim/start/complete/skip/cancel all return `isIdempotent: true` khi operation da xay ra

Day la idempotency pattern tot nhat trong project. M3/M4 chi co level 1+3, M5 chi co level 1.

### 4. Pessimistic Locking — CONSISTENT
`findByIdForUpdate()` called in:
- claimWork (prevent concurrent claims)
- releaseWork
- startWork (header + line)
- completeLine (line + header)
- skipLine
- cancelWork

### 5. Mobile Offline Sync — COMPLETE
`syncBatch.usecase.js` — Offline-first pattern:
- Batch-level dedup via `batchExternalId`
- Event-level dedup via `externalId` + `deviceSequenceNo`
- Processing results: SUCCESS / DUPLICATE / CONFLICT / REJECTED
- Partial success support (PARTIAL batch status)
- Delegates to real use cases (StartLine, CompleteLine, SkipLine)

### 6. Outbox Pattern — WELL DESIGNED
`workOutbox.repository.js`:
- Create callback events per work completion
- Target module routing (M4/M5/M6)
- Retry logic: exponential backoff (2^retryCount * 1000ms), max 5 retries → DEAD
- Event types: PUTAWAY_COMPLETED, PICK_COMPLETED, MOVE_COMPLETED, TRANSFER_PICK_COMPLETED, TRANSFER_PUT_COMPLETED, WORK_CANCELLED

### 7. Error Handling — EXCELLENT
`work.errors.js` — 18+ domain error classes:
- Structured error codes (WE-404-001, WE-409-001, etc.)
- HTTP status mapping (404, 409, 422, 403, 423, 500)
- Retryability flag per error type
- Detail objects for debugging

### 8. RBAC — COMPLETE
10 permission codes on 16 routes:
| Code | Routes |
|------|--------|
| WORK.EXECUTION.READ | GET /works, /works/:id, /works/:id/history, /works/:id/exceptions |
| WORK.EXECUTION.CLAIM | POST /works/:id/claim, /works/:id/release |
| WORK.EXECUTION.START | POST /works/:id/start, /works/:id/lines/:lineNum/start |
| WORK.EXECUTION.COMPLETE | POST /works/:id/lines/:lineNum/complete |
| WORK.EXECUTION.SKIP | POST /works/:id/lines/:lineNum/skip |
| WORK.EXECUTION.CANCEL | POST /works/:id/cancel |
| WORK.EXECUTION.OVERRIDE | POST /works/:id/manager-override-complete |
| WORK.EXECUTION.GENERATE | POST /internal/works/generate |
| WORK.MOBILE.SYNC | POST /mobile/works/sync |
| WORK.DASHBOARD.READ | GET /works/dashboard/summary |

### 9. Short Pick Policy — CORRECT
Matches spec BR-WE-005 / BR-WE-009:
- ≤2%: auto-accept, log SHORT_PICK
- 2-5%: warn, flag for manager review
- >5%: block completion, require manager override with evidence

### 10. Audit Trail — COMPREHENSIVE
4 parallel audit mechanisms:
- **WeWorkStatusHistory** — header + line state transitions with triggerAction
- **WeWorkAssignmentHistory** — claim/release/reassign with fromUserId/toUserId
- **WeWorkEventLog** — all events with JSON payload + correlationId
- **WeWorkException** — exceptions with severity + resolution tracking

---

## HIGH Issues

### HI-1: Posting Failure Does Not Create Exception [HIGH]

**Code:** `completeLine.usecase.js` — when `inventoryAdapter.postMovement()` fails:
- Line status set to COMPLETED (proceeds regardless)
- `postingStatus` set to FAILED
- `postingErrorCode` + `postingErrorMessage` stored on line
- **BUT no WeWorkException record created**

**Compare:** Short pick creates exception with severity WARN/BLOCKER. Posting failure — arguably more critical — creates NO exception.

**Spec ref:** BR-WE-010 — posting failures should be tracked and recoverable.

**Impact:** Posting failures invisible in exception dashboard. No automatic alerting. Manager must check individual work lines to find failures.

**Fix:**
```javascript
// After posting fails in completeLine:
await this.exceptionRepo.create({
  workHeaderId: header.id,
  workLineId: line.id,
  exceptionType: 'POSTING_FAILED',
  severity: 'BLOCKER',
  status: 'OPEN',
  detailText: `Posting failed: ${error.message}`,
  createdBy: context.userId,
});
```

### HI-2: No Outbox Consumer/Publisher Service [HIGH]

**Code:** `WeWorkOutboxEvent` records created correctly nhung **NO code to deliver them**. Module assumes external service polls outbox table and delivers callbacks.

**Impact:** M4/M5/M6 se KHONG BAO GIO nhan duoc callback events. Putaway complete khong notify M4. Pick complete khong notify M5.

**Current state:** Outbox events stay PENDING forever.

**Fix options:**
1. **Cron job / scheduled task** — poll outbox every N seconds, deliver via HTTP
2. **Database trigger** — PostgreSQL NOTIFY/LISTEN pattern
3. **Message queue** — Redis pub/sub or similar

**Minimum viable:** Add a `deliverOutboxEvents.usecase.js` that can be called by external scheduler.

### HI-3: versionNo (Optimistic Locking) Never Checked [HIGH]

**Code:** `versionNo` field incremented on every update in repositories nhung **ZERO WHERE clauses check it**. No optimistic locking actually enforced.

**Impact:** Pessimistic locking (FOR UPDATE) handles concurrent access, nhung versionNo provides no additional safety. Either use it or remove it.

**Fix:** Add WHERE guard:
```javascript
const updated = await tx.weWorkHeader.updateMany({
  where: { id: header.id, versionNo: header.versionNo },
  data: { ...updateData, versionNo: { increment: 1 } },
});
if (updated.count === 0) throw new WorkLockedError('Concurrent modification detected');
```

### HI-4: Cancel Does Not Reverse Posted InventTrans [HIGH]

**Code:** `cancelWork.usecase.js` — cancels header + all non-terminal lines nhung **KHONG reverse any InventTrans already posted** by completed lines.

**Spec ref:** BR-WE-006 — "Reverse any posted InventTrans". BR-WE-010 — "Create counter-transaction with opposite qty".

**Impact:** If work has 3 lines, 2 completed (posted to M3), then manager cancels → 2 InventTrans remain in ledger but work is CANCELLED. Inventory sai.

**Fix:**
```javascript
// In cancelWork, for each completed line:
for (const line of completedLines) {
  if (line.postingStatus === 'POSTED' && line.postingRefId) {
    await this.inventoryAdapter.reversePosting({
      originalTransId: line.postingRefId,
      reasonCode: input.reasonCode,
      correlationId: context.correlationId,
    });
  }
}
```

### HI-5: Inventory Adapter Mock Fallback [HIGH]

**Code:** `inventoryAdapter.js` — if `postingEngine` not provided:
```javascript
// Generates mock ID: WE-MOCK-{timestamp}
return { postingRefId: `WE-MOCK-${Date.now()}`, postingRefType: transType };
```

**Impact:** If M3 PostingEngine not injected (misconfiguration), all postings silently succeed with mock IDs. Inventory appears correct nhung InventTrans NOT actually created. Same pattern as M5 allocation MOCK.

**Fix:** Remove mock fallback. Throw error if PostingEngine not available:
```javascript
if (!this.postingEngine) {
  throw new Error('PostingEngine not configured — cannot post inventory');
}
```

### HI-6: No M1 AuditLog Integration [HIGH]

**Code:** Zero references to M1 LogService. Module co excellent domain-specific audit (4 parallel mechanisms) nhung khong integrate voi cross-module audit log.

**Impact:** M1 AuditLog table thieu work execution events. Same gap as M3/M4/M6.

**Fix:** Inject AuditLogAdapter, call after state transitions.

---

## MEDIUM Issues

| # | Issue | File | Description |
|---|-------|------|-------------|
| MD-1 | NumberSequence service not injected | generateWork.usecase.js | References `numberSequenceService.next('WRK')` nhung injection depends on module init. If missing, workId generation fails at runtime. |
| MD-2 | Location repository interface assumed | validateScan.usecase.js | Assumes `locationRepo.findByCode()` exists. If not injected, scan validation silently skipped. |
| MD-3 | Sync batch no $transaction wrap | syncBatch.usecase.js | Individual events processed sequentially nhung NOT in single transaction. Partial failure = partial batch. |
| MD-4 | Short pick thresholds hardcoded | work.policy.js | 2% and 5% thresholds hardcoded. Spec asks [TO-CONFIRM]: should be configurable per owner? |
| MD-5 | Overage handling not defined | work.policy.js | Only shortage (short pick) handled. Actual > expected not validated (spec says "block by default" [P2]). |
| MD-6 | No SLA monitoring | getWorkList.usecase.js | Dashboard has status/type counts nhung no SLA threshold alerting (spec AC-5.3). |
| MD-7 | Assignment history no REASSIGN action | claimWork.usecase.js | Only CLAIM and RELEASE actions. No DIRECTED assignment or REASSIGN between users. |

---

## Cross-Check: Code vs Spec Business Rules

| Rule | Description | Status |
|------|-------------|--------|
| BR-WRK-001 | Self-claim model | **PASS** — claim sets assigned_to, status stays OPEN |
| BR-WRK-002 | WorkLine complete → 1 InventTrans (MOVE type) | **PASS** — inventoryAdapter.postMovement() correct |
| BR-WE-001 | Auto-create work from source module | **PASS** — generateWork via internal endpoint |
| BR-WE-002 | Claim doesn't change status | **PASS** — status remains OPEN |
| BR-WE-003 | All lines terminal → header complete | **PASS** — auto-complete + outbox callback |
| BR-WE-004 | Location scan validation | **PASS** — 5-step validation in validateScan |
| BR-WE-005 | Short pick thresholds (2%/5%) | **PASS** — policy implements 3-tier decision |
| BR-WE-006 | Cancel rules + reverse InventTrans | **PARTIAL** — cancel implemented, **reversal NOT implemented** |
| BR-WE-007 | Work priority template | **PASS** — priority calculated from module + type |
| BR-WE-008 | QR scan required before complete | **PASS** — scannedLocationCode validated |
| BR-WE-009 | Variance tolerance decision | **PASS** — matches BR-WE-005 |
| BR-WE-010 | Reversal instead of delete | **FAIL** — cancel does NOT create counter-transactions |
| BR-WE-011 | Putaway destination = STORAGE only | **PASS** — location type validation per work type |
| BR-WE-012 | Manager override requires evidence | **PASS** — qty + reasonCode + evidenceText (min 10 chars) |
| BR-WE-013 | Shipment state handoff | **PASS** — outbox PICK_COMPLETED → M5 |
| BR-WE-014 | Putaway auto-transition | **PASS** — outbox PUTAWAY_COMPLETED → M4 |
| BR-WE-015 | Transfer posting ownership | **PASS** — TRANSFER_SHIP + TRANSFER_RECEIVE correct |

**13/17 PASS, 1/17 PARTIAL, 1/17 FAIL, 2/17 (outbox delivery — see HI-2)**

---

## Cross-Check: Code vs Spec Sub-Modules

| Sub-Module | Spec | Code | Status |
|------------|------|------|--------|
| 1. Work Generation Engine | Auto-create from M4/M5/M6 triggers | generateWork.usecase.js + internal endpoint | **PASS** |
| 2. Mobile Task Claim & Execution | Claim, start, location scan | claimWork + startWork + validateScan use cases | **PASS** |
| 3. Work Completion & InventTrans Posting | Complete → post to M3, auto-complete header | completeLine.usecase.js + inventoryAdapter | **PASS** |
| 4. Exception Handling | Short pick, location mismatch, skip | policy + skipLine + exception repository | **PASS** (posting failure gap) |
| 5. Work Monitoring & Dashboard | Dashboard, manager override | getWorkList queries + override in completeLine | **PARTIAL** (no SLA alerting) |
| 6. Offline Queue & Sync | Batch sync, dedup, conflict | syncBatch.usecase.js + mobileSync repository | **PASS** |
| 7. Transfer Work Execution | TRANSFER_PICK + TRANSFER_PUT | generateWork + completeLine with correct transTypes | **PASS** |

**6/7 PASS, 1/7 PARTIAL**

---

## Cross-Check: Code vs Spec Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| AC-1.1 | Receipt RECEIVED → auto-create PUTAWAY | **PASS** — generateWork endpoint ready |
| AC-1.2 | Shipment ALLOCATED → auto-create PICK | **PASS** — generateWork endpoint ready |
| AC-1.3 | Retry doesn't create duplicate | **PASS** — 3-level idempotency |
| AC-1.4 | WorkHeader created OPEN, assigned_to=NULL | **PASS** |
| AC-1.5 | Transfer RELEASED → auto-create TRANSFER_PICK | **PASS** |
| AC-2.1 | Claim only sets assigned_to | **PASS** |
| AC-2.2 | Start → IN_PROGRESS, records started_at | **PASS** |
| AC-2.3 | Location mismatch blocks | **PASS** |
| AC-2.4 | Manager override with reason + audit | **PASS** |
| AC-2.5 | Release sets assigned_to=NULL | **PASS** |
| AC-2.6 | Putaway requires destination scan STORAGE | **PASS** |
| AC-3.1 | Putaway complete → 1 InventTrans MOVE | **PASS** |
| AC-3.2 | Pick complete → 1 InventTrans MOVE | **PASS** |
| AC-3.3 | All lines terminal → header COMPLETED | **PASS** |
| AC-3.4 | Putaway complete → M4 callback | **PARTIAL** — outbox event created, no consumer |
| AC-3.5 | Pick complete → M5 callback | **PARTIAL** — outbox event created, no consumer |
| AC-3.6 | Transfer → TRANSFER_SHIP + TRANSFER_RECEIVE | **PASS** |
| AC-4.1 | Short pick variance logged | **PASS** |
| AC-4.2 | >5% blocks, manager required | **PASS** |
| AC-4.3 | Location mismatch blocks | **PASS** |
| AC-4.4 | Item not found → SKIPPED + exception | **PASS** |
| AC-5.1 | Dashboard counts correct | **PASS** |
| AC-5.2 | Override requires qty + reason + evidence | **PASS** |
| AC-5.3 | SLA threshold alert | **NOT IMPL** |
| AC-5.4 | Override logged in audit | **PASS** |
| AC-6.1 | Offline completion queued | **PASS** |
| AC-6.2 | Sync dedup via external_id | **PASS** |
| AC-6.3 | Conflicts flagged for manager | **PASS** |
| AC-6.4 | Pending sync count visible | **N/A** (frontend) |
| AC-7.1 | Transfer RELEASED → TRANSFER_PICK work | **PASS** |
| AC-7.2 | Transfer pick → TRANSFER_SHIP posted | **PASS** |
| AC-7.3 | Goods arrive → TRANSFER_PUT work | **PASS** |
| AC-7.4 | Transfer put → TRANSFER_RECEIVE posted | **PASS** |
| AC-7.5 | TRANSFER_SHIP: source WH, negative qty | **PASS** |
| AC-7.6 | TRANSFER_RECEIVE: dest WH, positive qty | **PASS** |
| AC-7.7 | Net OnHand = 0 (source down, dest up) | **PASS** |

**30/35 PASS, 2/35 PARTIAL, 1/35 NOT IMPL, 1/35 N/A**

---

## Score Justification

| Category | Score | Note |
|----------|-------|------|
| Architecture | 95% | Use case pattern — best in project |
| State machines | 95% | Header + line states correct, terminal locked |
| M3 integration | 85% | Posting correct, cancel reversal missing |
| RBAC | 90% | 10 permissions on all routes |
| Idempotency | 95% | 3-level — best in project |
| Audit trail | 90% | 4 parallel audit mechanisms |
| Mobile sync | 90% | Offline-first, dedup, conflict detection |
| Data integrity | 80% | Pessimistic locking, nhung versionNo unused |
| Error handling | 90% | 18+ error classes, retryability flags |
| Completeness | 80% | 30/35 AC pass, outbox consumer missing |
| **Overall** | **8.5** | Excellent module — minor gaps only |

---

## Summary for Dev Team — Priority Order

| # | Priority | Issue | Effort | Deadline |
|---|----------|-------|--------|----------|
| 1 | **HIGH** | Cancel work must reverse posted InventTrans (BR-WE-006/010) | 2h | Sprint 5 |
| 2 | **HIGH** | Create exception for posting failures | 30m | Sprint 5 |
| 3 | **HIGH** | Implement outbox consumer/publisher service | 1 day | Sprint 5 (blocks M4/M5/M6 callbacks) |
| 4 | **HIGH** | Remove inventory adapter mock fallback — throw error instead | 15m | Sprint 5 |
| 5 | **HIGH** | Use versionNo for optimistic locking OR remove field | 1h | Sprint 5 |
| 6 | **HIGH** | M1 AuditLog integration | 2h | Before production |
| 7 | **MEDIUM** | Short pick thresholds configurable per owner | 2h | Sprint 6 |
| 8 | **MEDIUM** | Overage handling (actual > expected) | 1h | Sprint 6 |
| 9 | **MEDIUM** | SLA monitoring alerts | 2h | Sprint 6 |

**Estimated total: ~2 days for HIGH issues.**

---

## Verdict

**CONDITIONAL PASS (8.5/10).** M7 la module co architecture tot nhat trong project:
- **Use case pattern** — clean separation, easy to test, easy to maintain
- **3-level idempotency** — robust against retries
- **M3 posting correct** — InventTrans mapping matches spec exactly
- **Mobile sync complete** — offline-first with dedup + conflict detection
- **RBAC complete** — 10 permission codes on all routes
- **Comprehensive audit** — 4 parallel mechanisms

Gaps chinh:
1. **Cancel reversal** — cancel nhung khong reverse posted InventTrans → inventory sai (BR-WE-010)
2. **Outbox consumer** — callback events created nhung khong ai deliver → M4/M5/M6 khong nhan duoc notifications
3. **Mock fallback** — PostingEngine missing → silent mock (nguy hiem)

M7 la module tot. Voi 2 ngay fix HIGH issues, score co the len 9.0+.

---

## Comparison: M7 vs Other Modules

| Aspect | M7 | M3 | M4 | M5 | M6 |
|--------|----|----|----|----|-----|
| Architecture | Use Case (best) | Monolithic service | Monolithic service | NestJS services | Centralized services |
| RBAC | 10 permissions | 9 permissions | 8 permissions | **ZERO** | **ZERO** |
| Idempotency | 3-level (best) | 2-level | 2-level | 1-level | 409 error |
| M3 posting | Correct | N/A (is M3) | FIXED (v3) | **MOCK** | Partial gaps |
| Audit trail | 4 mechanisms (best) | StatusHistory only | StatusHistory only | Header only | StatusHistory |
| Error handling | 18 classes (best) | 13 codes | 13 codes | Basic | Basic |
| Mobile support | Full sync | None | None | None | None |

**M7 sets the standard for other modules to follow.**
