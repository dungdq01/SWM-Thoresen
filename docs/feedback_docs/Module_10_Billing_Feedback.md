# Module 10 — Billing & Commercial Control: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_10_billing_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 5 action items before build

> **Luu y:** Spec M10 v1.1 da address: free-days per lot lineage (Section 8.5), event ownership contract (Section 5), combined multiplier formula (Section 8.3), billable inventory statuses (Section 9.4), CUST_VIEWER decision. Day la nhung bo sung co gia tri cao.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | DN-01..DN-05 voi guards + side effects + forbidden transitions. Khop StateMachine DN-TC-01..10 |
| 2 | Posting point / control point documented? | PASS | Section 5: M4/M5/M9 publish events, M10 consumes. Storage = M10 tu generate tu snapshot. "M10 KHONG tu query InventTrans" — rat dung |
| 3 | Exception flows co AC ro? | PASS | AC-EVT-2: missing event = billing exception. AC-3.4: free days per lot. Unbilled events endpoint co |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 14: 6 items voi P1 BLOCKER / P2. 3 P1 blockers duoc identify |
| 5 | RBAC phan quyen dung role? | PASS | Section 11: BILLING_OFC (generate/review/approve/lock), WH_ADMIN (rate card), CUST_VIEWER (LOCKED only) — khop voi UserFlow |
| 6 | Test case cover happy path + exception? | NEED ACTION | AC count "~17+" qua mo ho. Phai co exact AC per sub-module theo pattern M5/M6 |
| 7 | Audit trail du? | PASS | debit_note_line.calculation_trace (JSON). billing_event.correlation_id. DN locked_by + locked_at. Day du |
| 8 | Integration voi module khac tested? | PASS | Section 5: event publisher model ro rang. M8 ERP push trigger co. Day type calendar tu WH_ADMIN. OK |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 5 Action Items

### AI-1: Bo sung Acceptance Criteria day du per sub-module [HIGH]
**Problem:** Section 15 AC Summary noi "~17+" — con dau "~" va "+" la khong chap nhan duoc. M5 co 30 ACs, M6 co 24 ACs, moi AC co ID ro rang. M10 la module billing — module quan trong nhat ve doanh thu — can AC chinh xac.
**Impact:** QA khong biet test gi, Dev khong biet "done" la gi cho billing. Revenue leakage neu miss test case.
**Action:** Liet ke day du AC per sub-module (tuong tu M5 Section 23.1). Toi thieu cho:
- Sub-module 1 (Rate Card): 3 AC — contract overlap check, inactive contract khong ap dung, cargo_form rate lookup
- Sub-module 2 (Event Capture): da co AC-EVT-1..3 (3 AC) — OK
- Sub-module 3 (Snapshot): da co AC-3.1..3.6 (6 AC) — OK
- Sub-module 4 (Charge Calculation): 5 AC — storage formula, handling formula, combined multiplier, bagging tier, free days
- Sub-module 5 (Debit Note): 5 AC — DN-TC-01..10 reference StateMachine, lock immutable, CUST_VIEWER filter
- Sub-module 6 (Exception): 2 AC — unbilled event flag, orphan detection
- Sub-module 7 (Audit): 2 AC — calculation_trace readable, DN history immutable

### AI-2: Remove hoac clarify "HOLD" status — khong co trong Phase 1 InventStatus [HIGH]
**Problem:** Section 9.4 Billable Inventory Statuses liet ke HOLD la "Yes (billable)" nhung:
- M2 spec (Phase 1) chi co 4 inventory statuses: AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT
- HOLD KHONG ton tai trong Phase 1 schema
- M3 InventDim va OnHand chi dung 4 statuses tren
**Impact:** Snapshot job se query on inventory_status = 'HOLD' nhung field nay khong ton tai → query fail hoac tra empty result → missing billable data.
**Action:**
- Remove "HOLD" khoi Section 9.4. Giu lai 4 statuses chinh: AVAILABLE (billable=Yes), DAMAGED ([TO-CONFIRM]), BLOCKED ([TO-CONFIRM]), IN_TRANSIT (billable=No — not in warehouse)
- Neu HOLD la requirement Phase 1: can them vao M2 spec va M3 InventStatus enum truoc build

### AI-3: Lam ro free_days scope: per fee_line hay per contract [HIGH]
**Problem:** Inconsistency trong spec:
- Section 8.5 formula noi: `contract.free_days` (cap do contract)
- Schema Section 7.2 `contract_fee_line`: `free_days INT N` (cap do fee_line)
- Cap do nao dung? 1 contract co the co STORAGE fee_line voi free_days=7 va HANDLING fee_line voi free_days=0?
**Impact:** Dev may implement theo schema (fee_line) nhung formula trong Charge Calculation Engine dung `contract.free_days` → sai. Hoac nguoc lai.
**Action:**
- Quyet dinh: free_days la per fee_line (moi loai phi co free_days rieng) hay per contract (chung cho moi phi)?
- **Khuyén nghi**: per fee_line vi STORAGE co free days nhung HANDLING thuong khong co.
- Cap nhat formula Section 8.5 cho nhat quan: `days_in_storage <= fee_line.free_days (WHERE fee_type=STORAGE)`
- Cap nhat Section 9.2 snapshot cho nhat quan

### AI-4: Them event capture schema (billing_event linking to domain events) [MEDIUM]
**Problem:** M10 chi chua domain events tu M4/M5/M9 nhung khong co bang nao luu raw domain event payload truoc khi tinh tien. billing_event table co amount_vnd (da tinh) nhung neu can re-calculate:
- Lay lai raw payload tu dau? (receipt_id, shipment_id, wo_number → co trong billing_event)
- Luu lich su re-calculate o dau?
**Impact:** BILLING_OFC khong the verify tai sao amount = X neu khong co trace tu raw payload.
**Action:** Them field vao billing_event:
- `raw_event_payload JSON` — full domain event payload luc capture (immutable)
- Hoac tham chieu: "source_ref = receipt_id/shipment_id/wo_number co the lookup M4/M5/M9 API"
- Lam ro: billing_event la immutable sau khi captured? (can note nay)

### AI-5: Clarify billing cho hang DAMAGED/BLOCKED (TO-CONFIRM #5) — can escalate len P1 [MEDIUM]
**Problem:** TO-CONFIRM #5 "DAMAGED/BLOCKED inventory charged storage?" duoc ghi P1 nhung verdict "Recommended: AVAILABLE and HOLD billable" thieu decision. Day la cau hoi thuc te rat quan trong vi:
- Neu DAMAGED charged: TVL thu phi ngay ca hang bi hong — client co the dispute
- Neu DAMAGED free: TVL co the "misuse" DAMAGED status de tron phi
**Impact:** Neu chua chot truoc build, snapshot job se filter sai → over hoac under bill.
**Action:**
- **Escalate**: P1 BLOCKER, can sign-off tu TVL truoc Sprint 2
- **Khuyén nghi TVL**: DAMAGED billable voi discount rate? BLOCKED billable voi normal rate?
- Sua TO-CONFIRM #5 trong spec voi deadline ro rang: truoc ngay 15/03/2026 (truoc khi dev snapshot job)
- Lam ro va update Section 9.4 sau khi co sign-off

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| StateMachine | DN-TC-01..10 khop voi DN-01..DN-05 state machine. DN-TC-07 storage formula khop Section 8.1. DN-TC-09 free days khop Section 8.5 |
| SystemControlMap | Event ownership contract (Section 5) khop. M10 consumes, khong tu derive tu InventTrans — dung |
| BA_PO_Master | US-M10-001..006 khop. BR-BIL-001..012 khop business rules table |
| SystemFlow E2E | Billing flow: domain events → M10 calculate → DN LOCKED → ERP push — khop |
| M3 Spec | daily_storage_snapshot schema (M3 AI-2) khop voi Section 7.4. receipt_line_id per lot — dung |
| M9 Spec | BAGGING_FEE event payload (M9 Section 11.2) khop voi billing_event schema. OT source (vas_session.is_overtime) khop Section 8.3 |

---

## Diem manh cua spec

1. **Event Ownership Contract (Section 5)** — table publisher/consumer/trigger point rat ro. "M10 khong tu query InventTrans" la principle manh, tranh coupling toi M3.
2. **Combined Multiplier Table (Section 8.3)** — 1 lookup table, khong nhan rieng. "Dev KHONG duoc tu dien day_type_multiplier x ot_multiplier" — instruction cu the.
3. **Free-Days Per Lot (Section 8.5)** — per receipt_line_id la correct granularity. Moi lot co free period rieng.
4. **Billing Formula Documentation** — Section 8.1..8.7 co day du storage, handling, bagging, VAT, UOM. Testable.
5. **Calculation Trace in DN Line** — debit_note_line.calculation_trace JSON. BILLING_OFC trace duoc.
6. **14 Business Rules** voi BRD reference.

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: Bo sung exact AC per sub-module (replace "~17+") | BA + QA | Truoc Sprint 2 |
| HIGH | AI-2: Remove HOLD status (not in Phase 1 schema) | BA + Dev Lead | Truoc Sprint 1 |
| HIGH | AI-3: Chot free_days scope (per fee_line hay per contract) | BA + TVL | Truoc Sprint 1 |
| MEDIUM | AI-4: Them raw_event_payload field vao billing_event | BA + Dev Lead | Truoc FS M10 |
| MEDIUM | AI-5: Escalate DAMAGED/BLOCKED billing decision len TVL | BA + PM | Truoc 15/03/2026 |

> **P1 BLOCKERS chua chot:**
> - TO-CONFIRM #1: EOD cut-off global vs per warehouse → blocks snapshot job design
> - TO-CONFIRM #2: WH_MANAGER approval step truoc lock → blocks DN state machine
> - TO-CONFIRM #3: Tier pricing reset → shared blocker voi M9

---

## Next Review
Module 11 — Reporting, Audit & Go-Live Control Spec (khi co)
