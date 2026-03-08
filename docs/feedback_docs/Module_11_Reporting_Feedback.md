# Module 11 — Reporting, Audit & Go-Live Control: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_11_reporting_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 4 action items before build

> **Luu y:** Spec M11 v1.1 da fix: shrinkage split thanh 2 reports (RPT-INV-007/008), NFR polling targets thuc te (<=60s), retention policy, reconciliation actor boundary, read-only principle. Nhung thay doi nay dung huong.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | M11 khong co state machine rieng — dung vi day la read-only module. go_live_gate_status co PENDING/PASS/FAIL/WAIVED. reconciliation_result co PASS/FAIL/WARNING. Du |
| 2 | Posting point / control point documented? | PASS | Section 4 Principle 1 ro rang: M11 KHONG tao InventTrans, billing_event hay business entity. Chi tao control metadata (reconciliation_result, go_live_gate). Dung |
| 3 | Exception flows co AC ro? | PASS | RECON-001 FAIL → CRITICAL alert (AC-5.2). Go-live gate FAIL → block (AC-6.3). Billing exception → flag BILLING_OFC (AC-EVT-2 in M10). OK |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 16: 5 items voi P1/P2/P3 + deadline |
| 5 | RBAC phan quyen dung role? | PASS | Section 13: Phan quyen chi tiet per action. OPS_SUPER run recon, ADMIN resolve. WH_MANAGER view only. CUST_VIEWER limited own data |
| 6 | Test case cover happy path + exception? | PASS | 31 ACs cho 7 sub-modules. Go-Live 12 gates. Reconciliation 7 checks. Cover du |
| 7 | Audit trail du? | PASS | RPT-AUD-001..006 cover user activity, state transitions, posting trace, exceptions, permission changes, overrides. Retention 7 years |
| 8 | Integration voi module khac tested? | NEED ACTION | SQL query mau Section 7.2 KHONG khop voi M3 InventTrans schema (dung direction='IN'/'OUT' nhung M3 dung trans_type + qty sign). Xem AI-1 |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 4 Action Items

### AI-1: Fix SQL query mau trong Section 7.2 cho khop M3 InventTrans schema [HIGH]
**Problem:** Section 7.2 On-Hand Summary SQL dung:
```sql
SUM(CASE WHEN t.direction = 'IN' THEN t.qty ELSE -t.qty END)
```
Nhung M3 InventTrans schema (M3 AI-5 confirmed) KHONG co field `direction`. M3 dung:
- `trans_type` (INBOUND, OUTBOUND, MOVE, ADJUSTMENT, VAS_CONSUME, VAS_PRODUCE, etc.)
- `qty` voi sign (positive = in, negative = out) — hoac qty >= 0 va `direction` rieng?
**Impact:** Dev copy SQL mau → query loi ngay → bao cao On-Hand sai.
**Action:** Kiem tra M3 InventTrans schema chinh xac, sau do sua SQL cho dung. Pattern khuyen nghi (neu qty co sign):
```sql
SELECT
  id.item_id, id.owner_id, id.warehouse_id, id.inventory_status,
  SUM(t.qty) AS on_hand_qty
FROM invent_trans t
JOIN invent_dim id ON t.invent_dim_id = id.id
WHERE t.is_reversed = FALSE
GROUP BY id.item_id, id.owner_id, id.warehouse_id, id.inventory_status
HAVING SUM(t.qty) != 0
```
Hoac neu qty luon duong voi direction enum rieng — update accordingly. Phai dong bo voi Dev M3 truoc khi finalize M11 query spec.

### AI-2: Dong bo GL-003 Go-Live gate voi M1 seed data [MEDIUM]
**Problem:** Section 11.1 GL-003 check "All sequences (RCV, SHP, WRK, TRX, DN, **VAS**) initialized". Nhung M1 Code Review (HI-4) da phat hien: M1 seed.ts chi seed RCV, SHP, WRK, TRX, DN — **KHONG co VAS, TRF, ADJ**.
- VAS sequence can cho M9
- TRF sequence can cho M6 Transfer Order
- ADJ sequence can cho M6 Adjustment
**Impact:** GL-003 AUTO check se FAIL ngay go-live neu sequences chua co. Project bi block go-live vi loi seed data M1.
**Action:**
- Bo sung VAS, TRF, ADJ vao GL-003 check list
- Escalate ve M1 fix: them seed sequences VAS, TRF, ADJ (da la HI-4 trong Module_1_Code_Review_Report.md)
- GL-003 pass criteria: `["RCV", "SHP", "WRK", "TRX", "DN", "VAS", "TRF", "ADJ"] all initialized`

### AI-3: Them performance note cho RECON-001 hourly [MEDIUM]
**Problem:** RECON-001 "OnHand vs SUM(InventTrans)" chay hourly. Tren production:
- InventTrans table co the co hang trieu rows (moi receipt/shipment/workline tao trans)
- GROUP BY item + owner + warehouse + status tren table lon = full table scan
- Chay hourly = 24 lan/ngay, se anh huong performance
**Impact:** Khong co NFR cho reconciliation query → co the gây chiem CPU, slow down production queries.
**Action:** Bo sung vao Section 10 (Reconciliation Engine):
- **Index requirement**: M3 cần index tren `invent_trans(is_reversed, invent_dim_id)` cho RECON-001
- **NFR**: RECON-001 query phai complete trong <= 30 giay voi data toi da Y rows
- Hoac **optimization strategy**: Incremental recon (chi check InventTrans duoc tao/update trong 1 gio qua, khong full scan)
- Neu full scan qua cham: reduce frequency RECON-001 tu hourly → 2 hour hoac add partition by day

### AI-4: Lam ro RPT-BIL-002 filter cho CUST_VIEWER [MEDIUM]
**Problem:** RPT-BIL-002 "Debit Note Status" — RBAC table Section 13 noi CUST_VIEWER co the xem "Billing Reports: Y (own DN)". Nhung chua co explicit filter rule trong report spec:
- CUST_VIEWER chi xem DN cua owner minh — OK da ro (owner filter tu RBAC)
- CUST_VIEWER chi xem LOCKED DN (per M10 BIL-BR-014) — **chua co filter nay trong M11 RPT-BIL-002**
- CUST_VIEWER co the xem DRAFT/REVIEWED DN cua minh khong? (Theo M10 recommendation: LOCKED only)
**Impact:** Dev co the expose DRAFT DN cho CUST_VIEWER vi API filter chi dung owner scope, quen status filter.
**Action:** Bo sung vao RPT-BIL-002 description:
- "CUST_VIEWER: chi query debit_note WHERE owner_id = current_user.owner_id AND status = 'LOCKED'"
- Tuong tu RPT-AUD va RPT-INV: CUST_VIEWER filters documented explicitly trong moi report description

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| SystemControlMap | LIR-01 OnHand invariant khop RECON-001. LIR-02 Immutability khop AuditLog append-only rule |
| BA_PO_Master | US-M11-001..004 khop. Retention 7 years khop RPT-BR-004. Shrinkage split khop v1.1 |
| StateMachine | 9. QA Master Test Checklist A-E — Section A (state machine) khop RECON-006. Section B (posting) khop RECON-003/004 |
| M1 Code Review | HI-4: Missing TRF, ADJ sequences — affects GL-003. AI-2 escalates nay. |
| M9 Spec | RECON-005 VAS material balance formula = M9 Section 9.2. Khop. |
| M10 Spec | RECON-002 Billing Events vs DN Lines. Event ownership contract (M10 Section 5) khop AC-EVT logic |

---

## Diem manh cua spec

1. **7 Reconciliation Checks (Section 10.1)** — formulas cu the, testable. RECON-001..007 cover inventory, billing, work, VAS, transfer. Day la "safety net" quan trong nhat cua he thong.
2. **Go-Live Readiness (Section 11)** — 12 gates (7 auto + 5 manual) thuc te va cover het: data, RBAC, weighbridge, reconciliation, UAT, backup, ERP, training, rollback.
3. **Two Shrinkage Reports (v1.1)** — RPT-INV-007 (adjustment-based) va RPT-INV-008 (lifecycle-based) — phan biet ro, khong gom chung.
4. **Read-Only Principle (Section 4 Principle 1)** — "M11 DUOC PHEP tao control/audit metadata nhung KHONG tao business transaction truth" — boundary ro rang.
5. **Retention Policy (Section 9.3)** — Audit 7 years, InventTrans 7 years, Recon results 3 years. Co nguon (BA-PO Master).
6. **31 Acceptance Criteria** — du cho 7 sub-modules. QA dung duoc ngay.

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: Fix SQL query mau Section 7.2 khop M3 InventTrans schema | BA + Dev Lead | Truoc Sprint M11 |
| MEDIUM | AI-2: Dong bo GL-003 sequences voi M1 fix (VAS, TRF, ADJ) | Dev Lead M1 | Truoc Sprint 2 |
| MEDIUM | AI-3: Them performance note + index req cho RECON-001 hourly | Dev Lead M3/M11 | Truoc Sprint 2 |
| MEDIUM | AI-4: Explicit CUST_VIEWER filter (LOCKED only) vao RPT-BIL-002 | BA | Sprint 1 |

> **Luu y quan trong:** M11 la module cuoi cung build — phu thuoc tat ca 10 module truoc. Nhung Go-Live Readiness (Sub-module 6) va Reconciliation Engine (Sub-module 5) can duoc build som hon de serve UAT. Neu doi den cuoi se khong co thoi gian chay RECON-001..007 truoc go-live.
> **Khuyén nghi**: Build Sub-module 5 (Reconciliation) va Sub-module 6 (Go-Live Readiness) o Sprint 5-6, song song voi M9/M10. Sub-module 1-4 (Dashboard + Reports) co the build o Sprint 7.

---

## Next Review
N/A — Day la module cuoi cung trong 11 modules. Tat ca specs M1-M11 da duoc review.
