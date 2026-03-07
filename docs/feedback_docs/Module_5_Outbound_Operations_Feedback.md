# Module 5 — Outbound Operations: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_5_outbound_operations_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 9.0 / 10
**Verdict:** APPROVED — spec duoc tao tu check-report docs, da address hau het gaps tu M1-M4 feedback

> **Luu y:** Spec M5 duoc tao moi (khong co ban draft truoc). Duoc viet dua tren 5 check-report docs + BRD + pattern da hoc tu M1-M4 review.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | S-01..S-19 transitions + forbidden transitions + cancel matrix. Khop voi StateMachine doc |
| 2 | Posting point / control point documented? | PASS | Section 15: PP-3 SHIPPED only. Mapping SHIPPED/cancel/reverse ro rang |
| 3 | Exception flows co AC ro? | PASS | PENDING_APPROVAL flow ro: approve → SHIPPED, reject → CANCELLED. Edge case cancel giua vong can co |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 26: 7 items voi P1/P2 + Impact + Deadline |
| 5 | RBAC phan quyen dung role? | PASS | WH_MANAGER (confirm/allocate/approve/cancel/close), WB_OPERATOR (weigh), WH_KEEPER (pick) |
| 6 | Test case cover happy path + exception? | PASS | Section 23.1: 30 AC cho 9 sub-modules. Reference SHP-TC-01..13 |
| 7 | Audit trail du? | PASS | Sub-module 9: idempotency + correlation_id + KPI hooks |
| 8 | Integration voi module khac tested? | PASS | Billing event payload (Section 15.6), M3 mapping (15.7), M7 pick trigger (12) |

**Result: 8/8 PASS**

---

## Diem manh cua spec

1. **Da co tu dau nhung thu M1-M4 phai bo sung sau review:**
   - [CONFIRMED]/[TO-CONFIRM] tags tren design principles (Section 6)
   - State transition table S-01..S-19 voi guards + side effects (Section 17.3)
   - Business rules co Rule ID + BRD Reference (Section 20 — 14 rules)
   - AC per sub-module (Section 23.1 — 30 ACs cho 9 sub-modules)
   - TO-CONFIRM items co priority + impact + deadline (Section 26)
   - Schema chi tiet: shipment_header, shipment_line, allocation_record (Section 8)
   - Tolerance lookup algorithm reference M2 (Section 14.3B)
   - Billing event payload structure (Section 15.6)
   - Blocking formulas cu the cho hang bao + hang xa (Section 14.4)

2. **DPM dual tracking co sub-module rieng (Section 16)** — giai thich ro logic va flag

3. **Multi-trip weighing formula ro rang** (Section 13.4) — voi cross-check total_net

4. **Cancel matrix + edge case cancel giua vong can** (Section 17.4, 17.5) — rat thuc te

5. **14 API endpoints** (Section 25) — day du hon M4

6. **Baseline source note** (Section 30) — reference 6 source documents

---

## Remaining items de luu y (khong phai action items vi da address)

| Item | Status | Note |
|---|---|---|
| State machine | Da co | S-01..S-19, khop StateMachine doc |
| BRD mapping | Da co | 14 rules voi BRD ref |
| Schema | Da co | 3 tables voi fields chi tiet |
| Tolerance lookup | Da co | 4-level algorithm reference M2 |
| Blocking formulas | Da co | Hang bao per trip, hang xa per SO |
| DPM dual tracking | Da co | Sub-module 7 rieng |
| Billing event | Da co | Payload table Section 15.6 |
| Concurrent locking | Noted | Can ADR — reference M3 Section 16.5 |

---

## Suggestions cho improvement (optional, khong block build)

1. **Container stuffing (BR-OUT-009):** Spec liet ke rule nhung chua co sub-module rieng. Can lam ro Phase 1 hay Phase 2.
2. **Outbound state machine diagram (ASCII art):** StateMachine doc co diagram, spec chua co. Co the copy sang spec de Dev xem nhanh.
3. **Short pick threshold:** Van [TO-CONFIRM] — can chot voi TVL truoc Sprint 1.

---

## Summary for Dev Team

| Priority | Item | Owner | Deadline |
|----------|------|-------|----------|
| P1 | Chot tolerance default | BA + TVL | Truoc FS M5 |
| P1 | Chot short pick threshold | BA + TVL | Truoc FS M5/M7 |
| P1 | ADR concurrent allocation locking | Tech Lead | Truoc FS M5 |
| P2 | Lam ro container stuffing Phase 1/2 | BA | Truoc Sprint planning |
| P2 | Lam ro standalone shipment use cases | BA + TVL | Truoc FS M5 |

---

## Next Review
Module 6 — Inventory Control Spec (khi co)
