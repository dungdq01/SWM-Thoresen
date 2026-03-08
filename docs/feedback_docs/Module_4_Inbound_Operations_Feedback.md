# Module 4 — Inbound Operations: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_4_inbound_operations_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 6 action items before build

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | 10 states khop voi StateMachine doc (R-01..R-14). Cancel matrix co. |
| 2 | Posting point / control point documented? | PASS | Section 14.5: PP-1 RECEIVED only. Mapping RECEIVED/cancel/reverse ro rang |
| 3 | Exception flows co AC ro? | PASS | Sub-module 7 co cancel matrix, manual weight rules, re-weigh max 3. AC-7.1..7.3 testable |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 26 co 7 items voi P1/P2 + Impact + Deadline |
| 5 | RBAC phan quyen dung role? | PASS | WB_OPERATOR (weigh), WH_MANAGER (cancel/manual/close), WH_ADMIN (planning) — khop UserFlow |
| 6 | Test case cover happy path + exception? | PASS | Section 23.1 co 24 AC cho 8 sub-modules, kha day du |
| 7 | Audit trail du? | PASS | Sub-module 8 cover idempotency + correlation_id + KPI hooks |
| 8 | Integration voi module khac tested? | NEED ACTION | Thieu state transition table chi tiet (guards + side effects). Billing event payload chua ro |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 6 Action Items

### AI-1: Them state transition table chi tiet voi guards va side effects [HIGH]
**Problem:** StateMachine doc co bang R-01..R-14 chi tiet: From → To, Actor, Guard condition, Side Effect. Spec M4 chi co state list (Section 12.3) va cancel matrix (Section 16.6), nhung KHONG co full transition table.
**Impact:** Dev khong biet: ai trigger transition, dieu kien gi, side effect gi cho moi buoc. Phai doc StateMachine doc rieng → risk inconsistency.
**Action:** Bo sung vao Section 12 (sau 12.3) mot bang state transition day du:

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|---|---|---|---|---|---|---|
| R-01 | DRAFT | AWAITING_WEIGHING | Confirm Receipt | WH_MANAGER/WH_ADMIN | PO/ASN valid; vehicle match | Number sequence assigned |
| R-02 | AWAITING_WEIGHING | WEIGHED_IN | Weigh-In event | WB_OPERATOR/System | weighbridge_log created; gross > 0 | weighbridge_log gan receipt |
| R-03 | WEIGHED_IN | PROCESSING | Vehicle enters yard | WB_OPERATOR | — | timestamp processing_started_at |
| R-04 | PROCESSING | WEIGHED_OUT | Weigh-Out event | WB_OPERATOR/System | tare > 0; tare < gross | net_weight_kg = gross - tare |
| R-05 | WEIGHED_OUT | RECEIVED | Tolerance PASS | System | variance_pct <= tolerance_pct | InventTrans INBOUND; Billing INBOUND_HANDLING; auto-create Putaway Work |
| R-06 | WEIGHED_OUT | REJECTED | Tolerance FAIL | System | variance_pct > tolerance_pct | attempt_count++ |
| R-07 | REJECTED | AWAITING_WEIGHING | Re-weigh | WB_OPERATOR | attempt_count < 3 | Giu receipt number; weighbridge_log moi |
| R-08 | REJECTED | CANCELLED | Manager cancel | WH_MANAGER | attempt_count = 3; re-weigh locked | Reason code bat buoc |
| R-09 | RECEIVED | PUTAWAY | Putaway work done | System (M7 callback) | WorkHeader COMPLETED | InventTrans MOVE posted |
| R-10 | PUTAWAY | CLOSED | Manager close | WH_MANAGER | No pending WorkLines | Receipt immutable |
| R-11..14 | DRAFT/AWAITING/WEIGHED_IN/PROCESSING | CANCELLED | Cancel | WH_MANAGER | — | Reason code bat buoc (tru DRAFT) |

### AI-2: Them [CONFIRMED] / [TO-CONFIRM] tags vao spec [HIGH]
**Problem:** Spec viet nhu moi thu da chot. Nhung nhieu quyet dinh da duoc CONFIRMED (tu PRD, StateMachine, UserFlow) va mot so van [TO-CONFIRM]. Doc spec khong phan biet duoc.
**Impact:** Dev khong biet dau la baseline chac chan, dau la assumption.
**Action:** Tag cac decision points:
- `[CONFIRMED]`: 1 receipt = 1 trip (CFM), posting only at RECEIVED (CFM), re-weigh max 3 (CFM), REJECTED not PENDING_APPROVAL (CFM), putaway auto-create (CFM), scale auto-read (CFM)
- `[TO-CONFIRM]`: tolerance default 0.5%, putaway split, cancel at WEIGHED_IN/WEIGHED_OUT, OCR override level, bulk auto-transition

### AI-3: Them tolerance lookup algorithm reference [MEDIUM]
**Problem:** INB-BR-007 noi "tolerance lay theo owner + item" nhung KHONG ghi ro fallback chain khi khong co cau hinh. M2 spec da co 4-level lookup algorithm nhung M4 khong reference.
**Impact:** Dev tu implement lookup → co the miss fallback levels → tolerance check sai.
**Action:** Bo sung vao Section 13 (Tolerance Check):
- Reference M2 tolerance lookup algorithm:
  1. owner_item_policy (highest priority)
  2. item.tolerance_pct_inbound
  3. owner.default_tolerance_pct
  4. system default 0.5% [TO-CONFIRM]
- Lam ro: M4 goi M2 lookup function, KHONG tu query truc tiep

### AI-4: Them receipt_header va receipt_line schema [MEDIUM]
**Problem:** Section 8 liet ke data objects (receipt_header, receipt_line, receipt_attempt...) nhung KHONG co schema chi tiet. M3 da co InventTrans schema 24 fields. M4 thieu tuong duong.
**Impact:** Dev tu thiet ke schema → co the thieu field quan trong (vd: bag_count, attempt_number, is_manual_entry).
**Action:** Bo sung schema toi thieu:

**receipt_header:**
- id, receipt_number (auto-generated), receipt_type (STANDARD/VESSEL)
- po_id, asn_id, owner_id, vendor_id, item_id
- warehouse_id, receiving_location_id
- expected_qty, net_weight_kg, gross_weight_kg, tare_weight_kg
- vehicle_number, bl_number (nullable — vessel only)
- status (DRAFT/AWAITING_WEIGHING/.../CLOSED/REJECTED/CANCELLED)
- attempt_number (current re-weigh count)
- is_manual_entry (boolean)
- tolerance_pct_applied, variance_pct
- posted_trans_id (FK → invent_trans, nullable)
- putaway_work_id (FK → work_header, nullable)
- cancel_reason_code, cancel_by, cancel_at
- external_id (idempotency), correlation_id
- created_by, created_at, updated_by, updated_at

**receipt_line:**
- id, receipt_header_id (FK)
- line_number, item_id, uom
- expected_qty, received_qty (= net_weight)
- bag_count (nullable — bagged goods only)
- nominal_weight_per_bag (nullable — bagged only)
- status
- created_at, updated_at

### AI-5: Them bagged blocking formula cu the [MEDIUM]
**Problem:** INB-BR-015 noi "hang bao ap dung PO-level blocking" nhung KHONG co formula. BA_PO_Master US-M4-007 AC3 ghi ro: `SUM(bag_count across all receipts for PO) + current <= PO.expected_bag_count`.
**Impact:** Dev khong biet formula → implement sai blocking logic.
**Action:** Bo sung vao Section 13 hoac Sub-module 6:
- Formula: `total_received_bags = SUM(bag_count FROM receipts WHERE po_id = X AND status IN (RECEIVED, PUTAWAY, CLOSED))`
- Check: `total_received_bags + current_receipt.bag_count <= po.expected_bag_count`
- Neu vuot → BLOCK receipt, khong cho vao RECEIVED
- Hang xa (BULK): KHONG ap dung formula nay [BR-IN-011]
- Can lam ro: bag_count la field bat buoc tren receipt_line khi cargo_form = BAGGED_*

### AI-6: Them billing event payload structure [LOW]
**Problem:** Spec noi "billing trigger/event cho M10" nhieu lan nhung khong mo ta event payload. SystemControlMap va SystemFlow ghi: event = INBOUND_HANDLING, data = net_weight_mt x rate x day_type%.
**Impact:** M10 team khong biet event chua gi → integration contract thieu.
**Action:** Bo sung event structure toi thieu vao Section 14 hoac Section 18:

| Event | Trigger Point | Payload |
|---|---|---|
| INBOUND_HANDLING | Receipt → RECEIVED | receipt_id, owner_id, item_id, warehouse_id, net_weight_mt, cargo_form, receipt_type, event_timestamp, correlation_id |

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| SystemControlMap | M4 co trong Event Choreography day du. PP-1 khop. Exception ownership (EX-RULE-02) khop. Thieu state transition table chi tiet trong spec |
| BA_PO_Master | US-M4-001..007 ACs day du hon spec — spec can import: tolerance default [TO-CONFIRM], putaway split [TO-CONFIRM], bagged blocking formula, cancel states chi tiet |
| StateMachine | R-01..R-14 transition table + RCV-TC-01..14 test cases co — spec thieu transition table chi tiet. 14 test cases co the reference |
| SystemFlow E2E | Inbound flow khop. Billing event INBOUND_HANDLING co. DPM case [CONFIRMED] nhung M4 khong can xu ly dac biet (actual weight da dung cho posting) |
| UserFlow A-Z | Flow 1.1 (Standard), 1.2 (Re-weigh), 1.3 (Vessel) khop voi M4 spec. Manual weight flow (Flow 3.3) khop. Putaway flow (2.1) khop |

---

## Diem manh cua spec

1. **Business context rat tot (Section 3)** — giai thich ro vi sao can module, risk neu khong co
2. **Business rules co Rule ID + BRD Reference (Section 20)** — INB-BR-001..016 da co mapping, khong can bo sung
3. **Cancel matrix (Section 16.6)** — bang ro rang state nao duoc cancel
4. **User stories day du (Section 24)** — 7 MUST HAVE stories voi 5 AC moi
5. **AC per sub-module (Section 23.1)** — 24 AC cho 8 sub-modules, QA dung duoc ngay
6. **TO-CONFIRM co priority (Section 26)** — 7 items voi P1/P2, Impact, Deadline
7. **API baseline (Section 25)** — 10 endpoints + command payload
8. **Ownership boundaries (Section 19)** — rat ro: M4 khong tu ghi InventTrans, M8 khong tu quyet receipt

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: State transition table (guards + side effects) | BA + Dev Lead | Truoc Sprint 1 |
| HIGH | AI-2: [CONFIRMED]/[TO-CONFIRM] tags | BA | Truoc Sprint 1 |
| MEDIUM | AI-3: Tolerance lookup algorithm reference | BA | Truoc Sprint 1 |
| MEDIUM | AI-4: receipt_header/receipt_line schema | BA + Dev Lead | Truoc Sprint 1 |
| MEDIUM | AI-5: Bagged blocking formula | BA | Truoc Sprint 1 |
| LOW | AI-6: Billing event payload structure | BA + M10 Lead | Truoc FS M10 |

---

## Next Review
Module 5 — Outbound Operations Spec (khi co)
