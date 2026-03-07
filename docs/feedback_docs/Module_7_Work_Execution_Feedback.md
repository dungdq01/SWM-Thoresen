# Module 7 — Work Execution & Mobile Operations: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_7_work_execution_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 5 action items before build

> **Luu y:** Spec M7 v1.1 da fix posting ownership (Section 5), putaway model, shipment state handoff, force-complete governance. Day la nhung diem chinh dung va chat luong cao.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PARTIAL | WorkHeader WH-01..WH-07 + WorkLine WL-01..WL-05 co. Shipment handoff co. Nhung forbidden transitions chi liet ke cho WorkHeader terminal — WorkLine forbidden transitions thieu |
| 2 | Posting point / control point documented? | PASS | Section 5 rat ro — posting ownership table per event type. PUTAWAY=M7(MOVE), PICK=M7(MOVE), RECEIVED=M4, SHIPPED=M5. Day la diem manh nhat cua spec |
| 3 | Exception flows co AC ro? | PASS | Short pick, location mismatch, item not found co AC. Manager override (v1.1) co ban evidence requirement. OK |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 21: 6 items voi P1/P2. 3 P1 blockers ro rang |
| 5 | RBAC phan quyen dung role? | PASS | Section 18: RBAC matrix day du. WH_KEEPER (execute), WH_MANAGER (cancel/override), WH_ADMIN (config) |
| 6 | Test case cover happy path + exception? | PASS | 33 ACs cho 8 sub-modules. Reference StateMachine WRK-TC + WRL-TC |
| 7 | Audit trail du? | PASS | Sub-module 8 cover idempotency + correlation_id. Manager override log. Offline sync idempotent |
| 8 | Integration voi module khac tested? | NEED ACTION | Transfer Order trigger state naming KHONG khop voi M6. M6 dung RELEASED, M7 dung "CONFIRMED". Xem AI-1 |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 5 Action Items

### AI-1: Lap lai Transfer Order trigger state voi M6 state machine [HIGH]
**Problem:** Section 10.1 va 16.2 noi "Transfer Order CONFIRMED (M6) → Auto-create TRANSFER_PICK". Nhung M6 State Machine (TR-01..TR-06) KHONG co state "CONFIRMED". M6 Transfer Order flow la: CREATED → RELEASED → SHIPPED → IN_TRANSIT → RECEIVED → CLOSED.
**Impact:** Dev M7 build trigger on "CONFIRMED" nhung M6 fire event at "RELEASED" (TR-02). TRANSFER_PICK work se khong bao gio duoc tao → break end-to-end.
**Action:** Chinh lai Section 10.1 va 16.2:
- TRANSFER_PICK trigger: Transfer Order → **RELEASED** (TR-02), khong phai "CONFIRMED"
- TRANSFER_PUT trigger: Transfer Order → **IN_TRANSIT** (TR-04, goods arrive at dest), khong phai "IN_TRANSIT arrive" (mo ho)
- Dong bo voi M6 Section 10.2 bang TR-01..TR-06

### AI-2: Them WorkLine Forbidden Transitions [MEDIUM]
**Problem:** Section 17.4 chi liet ke WorkHeader forbidden transitions (COMPLETED/CANCELLED terminal). WorkLine forbidden transitions KHONG co bang tuong tu.
**Impact:** QA va Dev co the bo sot test case negative quan trong.
**Action:** Them bang forbidden transitions cho WorkLine:

| From | Forbidden To | Reason |
|------|-------------|--------|
| OPEN | COMPLETED | Phai qua IN_PROGRESS; phai scan location |
| COMPLETED | Any | Terminal; InventTrans da posted |
| CANCELLED | Any | Terminal |
| SKIPPED | Any | Terminal |

### AI-3: Lam ro reserved_qty release khi Pick WorkLine COMPLETED [MEDIUM]
**Problem:** Section 12.1 noi pick complete tao InventTrans MOVE (STORAGE→STAGING). Nhung khong noi gi ve allocation.reserved_qty. M5 giu reserved_qty cho den khi SHIPPED. Khi pick COMPLETED → STAGING, hang o trong warehouse nhung reserved_qty van giu duoc khong?
**Impact:** Dev M5 co the release reserved_qty sau khi pick complete (sai) hoac giu den khi SHIPPED (dung). Can explicit contract.
**Action:** Bo sung vao Section 12.2 hoac Section 5:
- Pick WorkLine COMPLETED → InventTrans MOVE posted. reserved_qty KHONG thay doi.
- reserved_qty chi release khi: (a) M5 post SHIPPED (released = shipped), hoac (b) Shipment CANCELLED (released = no ship)
- Lay le: STAGING location = holding area truoc khi len xe. Tren OnHand van con tai warehouse.

### AI-4: Chot Short Pick Threshold truoc Sprint 1 [HIGH — P1 BLOCKER]
**Problem:** WE-BR-005 viet "Short pick >2% flag, >5% block" nhung co ghi chua [TO-CONFIRM threshold — P1 blocker]. Spec vua co gia tri cu the (2%/5%) vua noi TO-CONFIRM → inconsistent.
**Impact:** Dev khong biet phai hardcode 2%/5% hay de configurable. Test case khong biet dung threshold nao.
**Action:**
- Neu TVL chap nhan 2%/5%: xoa "[TO-CONFIRM]" tag, mark "[CONFIRMED]"
- Neu TVL muon configurable per owner: bo sung field `short_pick_warn_pct` + `short_pick_block_pct` vao owner_item_policy (M2)
- Deadline: truoc Sprint 1 schema design cho M7

### AI-5: Them explicit AC cho Transfer Work posting chain [MEDIUM]
**Problem:** AC-7.1..7.4 cover Transfer Work trigger va state transition nhung KHONG co AC kiem tra InventTrans cu the: TRANSFER_SHIP co dim dung (source WH, STAGING location) va TRANSFER_RECEIVE co dim dung (dest WH, STORAGE location)?
**Impact:** Dev co the post dung trans_type nhung sai dim → OnHand dung nhung location wrong.
**Action:** Bo sung ACs:
- **AC-7.5**: TRANSFER_SHIP InventTrans: dim = {warehouse=source, location=STAGING_OUT, owner, item}. qty dau (-)
- **AC-7.6**: TRANSFER_RECEIVE InventTrans: dim = {warehouse=dest, location=scanned STORAGE, owner, item}. qty duong (+)
- **AC-7.7**: Net OnHand change = 0 tai source WH sau TRANSFER_SHIP + 0 tai dest WH truoc TRANSFER_RECEIVE. Chi thay doi khi ca 2 trans posted.

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| StateMachine | WorkHeader WH-01..WH-07 khop. WorkLine WL-01..WL-05 khop. Nhung forbidden trans cho WorkLine chua co trong spec |
| SystemControlMap | Section 5 (Posting Ownership) khop 100% voi SystemControlMap PP-1..PP-6. Rat tot. |
| BA_PO_Master | US-M7-001..005 khop. Manager override complete (US-M7-004 evidence requirement) da address |
| UserFlow A-Z | WH_KEEPER flows 2.1-2.4 khop. Offline flow khop |
| M6 Spec | Transfer Order state machine TR-01..TR-06: CONFIRMED khong ton tai. Can fix AI-1 |
| M5 Spec | Shipment state handoff (Section 17.3) da khop M5 ALLOCATED→PICKING→PICKED. Tot |

---

## Diem manh cua spec

1. **Posting Ownership Table (Section 5)** — day la diem manh nhat. Bang nay giai quyet het nhung confusion ve double-posting giua M4↔M7 va M5↔M7. Version 1.1 fix dung.
2. **13 Business Rules** (WE-BR-001..013) voi BRD reference day du.
3. **33 Acceptance Criteria** — dense coverage cho 8 sub-modules.
4. **Force-complete governance (v1.1)** — Manager override bat buoc actual_qty + evidence. Khong co blind force-complete. Rat dung.
5. **TO-CONFIRM priority** (Section 21) — 3 P1 blockers ro rang voi impact + deadline.
6. **Transfer Work sub-module (Section 16)** — TRANSFER_PICK + TRANSFER_PUT 2 WorkHeaders rieng, link to Transfer Order. Dung.

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: Align Transfer Order trigger state (RELEASED not CONFIRMED) | BA + Dev Lead | Truoc Sprint 1 |
| HIGH | AI-4: Chot short pick threshold (2%/5% configurable or fixed?) | BA + TVL | Truoc Sprint 1 |
| MEDIUM | AI-2: Them WorkLine forbidden transitions table | BA + QA | Sprint 1 |
| MEDIUM | AI-3: Lam ro reserved_qty lifecycle khi Pick COMPLETED | BA + Dev Lead | Truoc Sprint 1 |
| MEDIUM | AI-5: Them AC cho Transfer Work InventTrans dim correctness | BA + QA | Sprint 1 |

---

## Next Review
Module 8 — Weighbridge, OCR & Integration Spec (khi co)
