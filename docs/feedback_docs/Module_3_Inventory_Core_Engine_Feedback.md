# Module 3 — Inventory Core Engine: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_3_inventory_core_engine_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED voi 6 action items bo sung truoc build

> **Luu y:** File spec ban dau nam sai o `feedback_docs/`. Da move sang `docs/spec/`.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | M3 khong co state machine rieng — dung vi day la engine, posting point map Section 14.5 day du |
| 2 | Posting point / control point documented? | PASS | Section 14.5 co bang 6 PP khop voi SystemControlMap |
| 3 | Exception flows co AC ro? | PASS | Reversal (Sub-module 5) co AC testable, reconciliation co exception report |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 26 co bang 7 items voi Priority + Impact + Deadline |
| 5 | RBAC phan quyen dung role? | PASS | Section 19 ro ownership, M1 enforce |
| 6 | Test case cover happy path + exception? | PASS | Section 23.1 co 18 testable AC cho 8 sub-modules |
| 7 | Audit trail du? | PASS | Sub-module 8 cover idempotency + correlation_id + technical audit |
| 8 | Integration voi module khac tested? | NEED ACTION | Dependency map co nhung thieu locking strategy cho concurrent allocation |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 6 Action Items

### AI-1: Them dim_hash mechanism cho InventDim [HIGH]
**Problem:** SystemControlMap va BA_PO_Master deu ghi ro: `dim_hash = SHA-256(site|warehouse|location|batch|serial|status|owner)`. Spec M3 noi "mot combination chi co mot dim_id" nhung KHONG ghi co che dedup cu the (hash hay unique constraint?).
**Impact:** Dev tu implement → co the dung unique composite index (cham) hoac hash (nhanh) — can chot.
**Action:** Bo sung vao Sub-module 1 (InventDim):
- dim_hash = SHA-256 cua concatenation cac dimension values
- Truoc moi posting: lookup dim_hash → reuse neu co, tao moi neu chua
- Index tren dim_hash cho lookup performance

### AI-2: Them daily_storage_snapshot schema [HIGH]
**Problem:** Section 17 noi "daily storage snapshot cho billing" nhung KHONG co schema. Day la dau vao truc tiep cho M10 Billing (storage fee formula).
**Impact:** M10 khong biet snapshot chua gi → khong build duoc billing engine.
**Action:** Bo sung schema toi thieu:
- snapshot_date, warehouse_id, location_id, owner_id, item_id
- opening_qty (ton dau ngay)
- inbound_today_qty (tong inbound trong ngay)
- outbound_today_qty (tong outbound trong ngay — ghi nhan nhung KHONG tru khi tinh phi)
- closing_qty (ton cuoi ngay)
- cut_off_time (23:59 local)
- Formula reference: `billable_qty = opening_qty + inbound_today_qty` [CONFIRMED — BR-BIL-001]

### AI-3: Them concurrent allocation locking strategy [MEDIUM]
**Problem:** Section 16 noi "allocation-based hold" nhung khong noi locking strategy. SystemFlow EndToEnd va BA_PO_Master deu flag: "Pessimistic locking [TO-CONFIRM: can ADR]".
**Impact:** Concurrent shipment allocation co the over-commit stock.
**Action:** Bo sung vao Sub-module 6 hoac TO-CONFIRM section:
- Khuyen nghi: Pessimistic Locking (SELECT FOR UPDATE tren on_hand row)
- Can ADR chinh thuc truoc build M5
- Test case: 2 shipment concurrent allocate cung stock → chi 1 thanh cong, 1 fail gracefully

### AI-4: Them BRD Reference + Rule ID cho business rules [MEDIUM]
**Problem:** Section 20 dung numbered list 1-12 khong co Rule ID code. Khong nhat quan voi M1 (FG-BR-*) va M2 (MD-BR-*). Khong co BRD mapping.
**Action:** Chuyen thanh bang co Rule ID (IC-BR-001..012) + cot BRD Reference.

### AI-5: Them InventTrans full schema [MEDIUM]
**Problem:** Section 12.3 co Input table nhung do la "input cho posting", KHONG phai full DB schema. Dev can biet full schema de design DB.
**Action:** Bo sung schema table giong M2 da lam cho owner_item_policy. Toi thieu:
- id, trans_id (generated), ref_type, ref_id, ref_line_id
- item_id, qty, uom, dim_from_id, dim_to_id
- status_from, status_to, stage
- trans_type (INBOUND/OUTBOUND/MOVE/ADJUSTMENT/VAS_CONSUME/VAS_PRODUCE/CYCLE_COUNT_ADJUST)
- reason_code, external_id, correlation_id
- posted_by, posted_at, source_app
- is_reversed, reversed_by_trans_id
- created_at (immutable)

### AI-6: File location — da move [DONE]
**Problem:** Spec nam trong `feedback_docs/` thay vi `docs/spec/`.
**Action:** Da move sang `docs/spec/module_3_inventory_core_engine_spec.md`.

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| SystemControlMap | dim_hash SHA-256 mechanism thieu trong spec. LIR-01 OnHand invariant co nhung spec chua reference LIR code |
| BA_PO_Master | US-M3-001 AC2 dim_hash, AC3 reuse logic, AC5 dim_hash index — spec chua co |
| StateMachine | DN-TC-07 Storage formula (Opening+Inbound)×rate — snapshot schema can phan anh formula nay |
| SystemFlow E2E | Pessimistic locking flag cho concurrent allocation — spec chua address |

---

## Diem manh cua spec

1. **Nguyen tac thiet ke (Section 6)** — 10 principles voi [CONFIRMED] tags, rat chat che
2. **Posting Points (Section 14.5)** — khop 100% voi SystemControlMap 6 PP
3. **Testable AC (Section 23.1)** — 18 AC cho 8 sub-modules, QA dung duoc ngay
4. **User Stories (Section 24)** — 4 stories MUST HAVE voi AC, du cho Sprint planning
5. **Ownership boundary (Section 19)** — "Receipt/Shipment KHONG so huu ton kho" — rat ro rang
6. **API baseline (Section 25)** — 8 endpoints + command payload toi thieu
7. **TO-CONFIRM (Section 26)** — 7 items da co Priority + Impact + Deadline

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: dim_hash SHA-256 mechanism | Dev Lead | Truoc Sprint 1 |
| HIGH | AI-2: daily_storage_snapshot schema | BA + Dev Lead | Truoc FS M10 |
| MEDIUM | AI-3: Concurrent allocation locking ADR | Tech Lead | Truoc FS M5 |
| MEDIUM | AI-4: Rule ID + BRD Reference | BA | Sprint 1 |
| MEDIUM | AI-5: InventTrans full schema | BA + Dev Lead | Truoc Sprint 1 |
| DONE | AI-6: Move file to docs/spec/ | — | Done |

---

## Next Review
Module 4 — Inbound Operations Spec (khi co)
