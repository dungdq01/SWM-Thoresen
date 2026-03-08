# Module 9 — VAS / Bagging Operations: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_9_vas_bagging_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 5 action items before build

> **Luu y:** Spec M9 v1.1 da fix packaging ownership (Model A — always consume), cancel/reversal logic (no session posting), reservation contract voi M5, approval workflow decision. Day la nhung fix dung va quan trong.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | VAS-01..VAS-08 voi guards + side effects + forbidden transitions. Khop voi StateMachine doc VAS-TC-01..09 |
| 2 | Posting point / control point documented? | PASS | Section 9.1: PP-4 at COMPLETED only. Atomic 3 trans (bulk consume + bagged produce + pkg consume). BEGIN/COMMIT block. Dung |
| 3 | Exception flows co AC ro? | PASS | Shortage, yield variance, cancel flow co AC. Cancel releases reservation only (no reversal) — v1.1 fix dung |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 16: 6 items voi P1 BLOCKER / P2 / P3. 2 P1 blockers ro rang |
| 5 | RBAC phan quyen dung role? | PASS | Section 13: WH_MANAGER (confirm/complete/cancel), WH_KEEPER (start session), OPS_SUPER can confirm |
| 6 | Test case cover happy path + exception? | PASS | 21 ACs cho 5 sub-modules + 4 user stories. StateMachine VAS-TC-01..09 cung cover |
| 7 | Audit trail du? | PASS | correlation_id, external_id co tren WO. Session co created_by. Atomic posting co ref_type + ref_id |
| 8 | Integration voi module khac tested? | NEED ACTION | M5 allocation contract co (Section 6.3) nhung co "hoac" ambiguity — chua chot mechanism: shared on_hand field hay M9 API query. Xem AI-1 |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 5 Action Items

### AI-1: Chot reserved_qty mechanism M9 ↔ M5 [HIGH — P1 BLOCKER]
**Problem:** Section 6.3 noi: "M5 MUST query M9 VAS reservations khi tinh available. **Hoac** su dung shared reserved_qty field tren on_hand table."
- Option A: Shared field tren on_hand table — M9 va M5 deu UPDATE reserved_qty tren cung row → risk concurrent conflict, cung lock
- Option B: M5 goi API M9 de lay VAS reserved qty at allocation time → coupling giua M5 va M9
**Impact:** Chua chot → Dev M3 (OnHand schema), Dev M5 (allocation logic), Dev M9 (reservation logic) build khong dong bo → over-allocation risk.
**Action:** Can chot ADR truoc Sprint 1:
- **Khuyén nghi Option A** (shared field): on_hand table co `reserved_qty_shipment` va `reserved_qty_vas` rieng biet. M5 allocation check: `available = physical_qty - reserved_qty_shipment - reserved_qty_vas`.
- Uu diem: 1 query, atomic update, khong coupling M5↔M9
- Bo sung vao M3 spec Section (OnHand schema) va M9 Section 6.2

### AI-2: Lam ro actual_qty_kg trong VAS posting = consumed hay produced [HIGH]
**Problem:** Section 9.1 posting block co `VAS_CONSUME: -actual_qty_kg (bulk source item)` nhung Schema Section 7.1 co ca `actual_qty_kg` va field nay khong ro la bulk consumed qty hay bagged output qty. Section 9.2 Material Balance noi:
- `actual_consumed_qty` = VAS_CONSUME bulk qty
- `actual_output_qty` = VAS_PRODUCE bagged qty
- `process_loss_qty` = consumed - produced (co the > 0)
**Impact:** Neu actual_qty_kg trong WO = output qty nhung dev map nham vao VAS_CONSUME = over-consume on OnHand bulk.
**Action:** Doi ten field trong Schema (Section 7.1):
- `actual_qty_kg` → `actual_output_qty_kg` (= bags produced, MT equivalent)
- Them field: `actual_consumed_qty_kg` (= bulk consumed = actual_output + process_loss)
- Posting block (Section 9.1) dung `actual_consumed_qty_kg` cho VAS_CONSUME va `actual_output_qty_kg` cho VAS_PRODUCE

### AI-3: Them packaging availability check khi Start Session [MEDIUM]
**Problem:** VAS-02 (Confirm WO) check "bulk_on_hand >= planned_qty AND packaging available". Nhung check packaging_available tai CONFIRM time la check tren planned_qty. Giua CONFIRMED va start session, packaging co the duoc consume boi WO khac.
- AC-6.1 chi check at Confirm time
- Section 12.1 Exception noi "Insufficient packaging during session: block session start" nhung KHONG co AC testable.
**Impact:** WO confirmed OK nhung khi WH_KEEPER bat dau session, packaging het → exception chua co flow ro rang.
**Action:** Bo sung:
- AC-6.4 (NEW): Start session check packaging_qty_actual remaining >= bags_planned_this_session. Neu khong du → block + notify WH_MANAGER.
- Lam ro "block all sessions or allow partial" phai chot (TO-CONFIRM #4 — can chuyen len P1)

### AI-4: Them BRD Reference cho Business Rules thieu [MEDIUM]
**Problem:** VAS-BR-001..011 — cac rule duoc danh dau "v1.1" deu co BRD Reference la "v1.1" (khong phai BR code). Se kho trace neu audit.
| Rule ID | BRD Reference hien tai |
|---------|----------------------|
| VAS-BR-008 | v1.1 |
| VAS-BR-009 | v1.1 |
| VAS-BR-010 | v1.1 |
| VAS-BR-011 | v1.1 |
**Action:** Mapping sang BRD codes hoac mark [CONFIRMED — TVL sign-off]:
- VAS-BR-008 (material balance) → BR-VAS-006 hoac mark [CONFIRMED — Engineering baseline]
- VAS-BR-009 (VAS reservation visible to M5) → mark [CONFIRMED — voi M5 spec sign-off]
- VAS-BR-010 (cancel = release only) → BR-VAS-007 hoac mark [CONFIRMED — v1.1 decision]
- VAS-BR-011 (no approval Phase 1) → mark [CONFIRMED — BA decision 2026-03-08]

### AI-5: Them AC cho OT multiplier source chain [LOW]
**Problem:** Section 11.3 noi "OT multiplier theo M10 day type matrix. Bagging OT: neu bat ky session is_overtime = TRUE → apply". Nhung KHONG co AC kiem tra:
- Neu session 1 is_overtime=FALSE, session 2 is_overtime=TRUE → billing event has_overtime = TRUE?
- OT multiplier apply cho toan bo WO hay chi phan session co OT?
**Impact:** BILLING_OFC co the thay billing sai neu logic khong ro.
**Action:** Bo sung AC va clarify Section 11.3:
- **AC-5.5** (NEW): Neu bat ky vas_session.is_overtime = TRUE → billing_event.has_overtime = TRUE → combined_multiplier dung cot "With OT" tu M10 Table 8.3
- Clarify: OT multiplier apply cho TOAN BO WO labor amount (khong chi session OT). Neu TVL muon pro-rate → [TO-CONFIRM]

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| StateMachine | VAS-TC-01..09 khop voi spec state machine. VAS-04 (Complete atomic 3 trans) khop Section 9.1 |
| SystemControlMap | PP-4 VAS posting: VAS_CONSUME/VAS_PRODUCE/VAS_CONSUME packaging — khop Section 9.1 |
| BA_PO_Master | US-M9-001..004 khop. Tier pricing (BR-BIL-005) khop Section 11.1 |
| SystemFlow E2E | VAS flow: bulk → session → complete → billing — khop |
| M5 Spec | Allocation contract (Section 6.3) tham chieu M5 reserved_qty nhung co "hoac" ambiguity — AI-1 |
| M10 Spec | Day type multiplier matrix — M9 references M10 Section 8.3. Tham chieu dung. |

---

## Diem manh cua spec

1. **Atomic Posting (Section 9.1)** — BEGIN/COMMIT block voi 3 InventTrans ro rang. TVL/CLIENT_OWNED deu consume packaging. v1.1 fix dung.
2. **Material Balance Formula (Section 9.2)** — consumed = produced + process_loss. Testable via RECON-005.
3. **No session-level posting (v1.1)** — sessions = progress log only. Simplified design, tranh partial reversal complexity.
4. **Reservation Contract (Section 6)** — explicit section cho M5 integration. reserved_qty lifecycle (confirm → cancel/complete) day du.
5. **No approval Phase 1 (VAS-BR-011)** — decision chot, khong de mo.
6. **TO-CONFIRM priority** — 2 P1 blockers (tier reset, reservation granularity) ro rang.

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: Chot reserved_qty mechanism M9↔M5 (shared field vs API query) | Tech Lead + BA | Truoc Sprint 1 — blocks M3/M5/M9 |
| HIGH | AI-2: Doi ten actual_qty_kg → actual_output/consumed rieng | BA + Dev Lead | Truoc Sprint 1 |
| MEDIUM | AI-3: Packaging check at session start + AC-6.4 | BA + QA | Sprint 1 |
| MEDIUM | AI-4: BRD Reference cho v1.1 rules | BA | Sprint 1 |
| LOW | AI-5: OT multiplier apply scope AC | BA + BILLING_OFC | Truoc FS M10 |

> **P1 BLOCKER chua trong spec:** Tier pricing reset rule (TO-CONFIRM #1) va VAS reservation granularity (TO-CONFIRM #6). Ca 2 can chot voi TVL truoc khi design schema M9 + M5 allocation engine.

---

## Next Review
Module 10 — Billing & Commercial Control Spec (khi co)
