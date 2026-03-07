# Module 6 — Inventory Control: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_6_inventory_control_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 9.0 / 10
**Verdict:** APPROVED — spec duoc tao tu check-report docs, da address hau het gaps tu M1-M5 feedback

> **Luu y:** Spec M6 duoc tao moi (khong co ban draft truoc). Duoc viet dua tren 5 check-report docs + BRD + pattern da hoc tu M1-M5 review.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | Transfer Order TR-01..TR-06 + forbidden transitions. Move/Count/Adjustment states documented. Khop StateMachine doc |
| 2 | Posting point / control point documented? | PASS | Section 15: PP-5 (MOVE/TRANSFER), PP-6 (ADJUSTMENT/COUNT). InventTrans type mapping chi tiet |
| 3 | Exception flows co AC ro? | PASS | Section 21: Move, Transfer, Count, Adjustment exceptions voi handling cu the |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 22: 6 items voi P1/P2 + Impact + Deadline |
| 5 | RBAC phan quyen dung role? | PASS | Section 16: WH_KEEPER (execute/count), WH_MANAGER (create/approve/adjust), WH_ADMIN (config) |
| 6 | Test case cover happy path + exception? | PASS | Section 26: 12 test cases. Section 23: 24 AC cho 5 sub-modules |
| 7 | Audit trail du? | PASS | Sub-module 6: idempotency + correlation_id + event publishing + KPI hooks |
| 8 | Integration voi module khac tested? | PASS | Section 19: M3 posting API, M7 work generation, M8 mobile, M10 billing events |

**Result: 8/8 PASS**

---

## Diem manh cua spec

1. **Da co tu dau nhung thu M1-M5 phai bo sung sau review:**
   - [CONFIRMED]/[TO-CONFIRM] tags tren design principles (Section 6)
   - Transfer Order state transition table TR-01..TR-06 voi guards + side effects (Section 10.2)
   - Forbidden transitions table (Section 10.3)
   - Schema chi tiet: 7 tables voi fields day du (Section 8)
   - Business rules co Rule ID + BRD Reference (Section 20 — 12 rules)
   - AC per sub-module (Section 23 — 24 ACs cho 5 sub-modules)
   - TO-CONFIRM items co priority + impact + deadline (Section 22)
   - Event publishing payload cho M10 integration (Section 14.3)
   - InventTrans type mapping chi tiet (Section 15.2)

2. **Posting control rat chi tiet** — Section 15.2 mapping moi operation → trans_type, dim changes, qty sign

3. **Ownership boundaries ro rang** (Section 18) — M6 KHONG write InventTrans truc tiep, goi M3 API

4. **12 test cases** (Section 26) cover happy path + exception + edge case

5. **19 API endpoints** (Section 25) — day du cho 5 sub-modules

---

## Remaining items de luu y (khong phai action items vi da address)

| Item | Status | Note |
|---|---|---|
| Transfer Order state machine | Da co | TR-01..TR-06, khop StateMachine doc |
| BRD mapping | Da co | 12 rules voi BRD ref |
| Schema | Da co | 7 tables voi fields chi tiet |
| Posting control | Da co | PP-5, PP-6 voi InventTrans type mapping |
| Event publishing | Da co | 6 events voi payload |
| RBAC matrix | Da co | 4 roles x 11 actions |
| Blind count logic | Da co | system_qty hidden, variance calc, threshold |
| Concurrent locking | Noted | M3 owns — M6 references M3 API |

---

## Suggestions cho improvement (optional, khong block build)

1. **Cycle count plan configuration:** Spec co cycle_count_plan nhung chua chi tiet schema. Can lam ro frequency, location selection logic (random? ABC analysis?).
2. **Transfer Order weighbridge integration:** TO-CONFIRM #1 — neu TVL confirm can, can them flow weighbridge cho transfer tuong tu M4/M5.
3. **Batch status change:** Phase 1 chi change 1 item/location tai 1 thoi diem. Neu can bulk status change (e.g., block all stock from 1 owner), can them API endpoint.

---

## Summary for Dev Team

| Priority | Item | Owner | Deadline |
|----------|------|-------|----------|
| P1 | Chot weighbridge cho transfer (TO-CONFIRM #1) | BA + TVL | Truoc FS M6 |
| P1 | Chot recount threshold default (TO-CONFIRM #2) | BA + TVL | Truoc FS M6 |
| P2 | Chot auto-adjust threshold default | BA | Truoc Sprint 1 |
| P2 | Lam ro cycle count plan config | BA | Truoc Sprint 2 |
| P2 | Chot IN_TRANSIT stuck alert threshold | BA + OPS | Truoc Sprint 2 |

---

## Next Review
Module 7 — Work Execution Spec (khi co)
