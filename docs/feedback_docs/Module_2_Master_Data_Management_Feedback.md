# Module 2 — Master Data Management: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_2_master_data_management_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 7.5 / 10
**Verdict:** CONDITIONALLY APPROVED — 7 action items truoc build

---

## Review Gate Checklist (8 items)

| #   | Gate Question                                                  | Result      | Note                                                                                |
| -----| ----------------------------------------------------------------| -------------| -------------------------------------------------------------------------------------|
| 1   | 4 inventory statuses dung, AVAILABLE-only allocation enforced? | PASS        | Section 16.6 ro rang, [CONFIRMED] tag co                                            |
| 2   | cargo_form -> billing rate mapping dung?                       | NEED ACTION | Mapping chi co trong BA_PO_Master (US-M2-002 AC2), spec chua co bang mapping cu the |
| 3   | Tolerance per owner+item hoat dong dung?                       | NEED ACTION | MD-BR-009 co rule nhung thieu schema chi tiet cho owner_item_policy                 |
| 4   | Location type restriction: putaway chi vao STORAGE?            | PASS        | Section 14.6 ro, Case 2 co                                                          |
| 5   | Capacity calculation dung cong thuc?                           | NEED ACTION | Cong thuc chi co trong BA_PO_Master (AC2), spec chua co                             |
| 6   | [TO-CONFIRM] items da chot?                                    | NEED ACTION | 10 items chua co priority/impact                                                    |
| 7   | Import Excel: validation dung, error report ro rang?           | PASS        | Sub-module 8 kha chi tiet                                                           |
| 8   | Owner segregation: CUST_VIEWER chi thay hang cua minh?         | PASS        | Cross-ref dung voi M1 RBAC                                                          |

**Result: 4/8 PASS, 4 NEED ACTION**

---

## 7 Action Items

### AI-1: Them bang cargo_form -> billing rate mapping [HIGH]
**Problem:** BA_PO_Master (US-M2-002 AC2) da ghi: BULK=21K/MT, BAGGED_50KG=28K/MT, JUMBO=32K/MT. Nhung trong spec M2 chi noi chung "cargo_form map rate" ma KHONG co bang cu the.
**Impact:** Dev khong biet exact mapping → hard-code hoac hoi lai → delay.
**Action:** Them bang mapping vao Sub-module 7 (Billing Reference Master):
| cargo_form | Rate (VND/MT/day) | Service Type | Source |
|---|---|---|---|
| BULK | 21,000 | STORAGE | [TO-CONFIRM voi TVL] |
| BAGGED_25KG | ? | STORAGE | [TO-CONFIRM] |
| BAGGED_50KG | 28,000 | STORAGE | [TO-CONFIRM] |
| JUMBO_1000KG | 32,000 | STORAGE | [TO-CONFIRM] |
| PACKAGING | N/A | N/A | Khong tinh phi luu kho |

### AI-2: Them capacity calculation formula [HIGH]
**Problem:** BA_PO_Master ghi cong thuc `capacity_mt = area_m2 x max_height_m x density x 1.10` nhung spec M2 chi noi "max_capacity_mt" nhu 1 field input.
**Impact:** Khong ro capacity la static field hay calculated field → Dev build sai.
**Action:** Them vao Sub-module 4 (Warehouse & Location):
- Lam ro: capacity la **calculated** theo formula hay **manual input** field?
- Neu calculated: density lay tu item hay tu zone/kho? (dang la TO-CONFIRM #4 trong Section 29)
- Neu manual: ai nhap va khi nao cap nhat?
- Capacity warning thresholds: 85% (yellow), 100% (red) — da co trong BA_PO_Master, chua co trong spec

### AI-3: Them owner_item_policy schema chi tiet [MEDIUM]
**Problem:** MD-BR-009 noi "owner+item override > item default > owner default" nhung khong co schema bang owner_item_policy. Section 23.1 chi liet ke ten bang ma khong co field.
**Impact:** Dev tu thiet ke schema → co the thieu field hoac sai lookup logic.
**Action:** Them schema toi thieu:
```
owner_item_policy:
  - id (PK)
  - owner_id (FK → owner)
  - item_id (FK → item)
  - tolerance_pct_inbound (nullable — override item default)
  - tolerance_pct_outbound (nullable — override item default)
  - is_dpm_dual_tracking (boolean — flag DPM special case)
  - effective_from (date)
  - effective_to (date, nullable)
  - is_active (boolean)
  - created_by, updated_by, created_at, updated_at
```
Va lam ro lookup algorithm:
1. Tim owner_item_policy (owner+item) con active → dung gia tri nay
2. Neu khong co → dung item.tolerance_pct_*
3. Neu item cung null → dung owner.default_tolerance_pct

### AI-4: Them DPM dual-tracking flag vao Item master [HIGH]
**Problem:** DPM (Dam Phu My) la case dac biet da CONFIRMED: InventTrans tru actual weight, billing/report theo bag_count x nominal_weight. Day la requirement da xuat hien trong:
- BA_PO_Master US-M5-005
- StateMachine SHP-TC-10
- SystemFlow EndToEnd
Nhung spec M2 Item master KHONG co field nao flag DPM behavior.
**Impact:** Dev khong biet item nao la DPM → khong build dual tracking logic.
**Action:** Them vao Item master (Section 13.3) hoac owner_item_policy:
- `is_dpm_dual_tracking` (boolean) — khi TRUE: InventTrans.qty = actual_net, billing/report = bag_count x nominal_weight_per_bag
- Hoac flag o muc owner+item policy (vi DPM la context cua 1 owner cu the)

### AI-5: Them BRD Reference column vao business rules table [MEDIUM]
**Problem:** Giong nhu M1, bang MD-BR-001..014 khong co mapping ve BR codes trong BRD goc.
**Impact:** Dev/QA khong biet MD-BR-005 tuong ung BR nao → risk miss rule.
**Action:** Them cot "BRD Reference" vao Section 21 (giong pattern da lam cho M1).

### AI-6: Them priority + impact cho Section 29 TO-CONFIRM items [MEDIUM]
**Problem:** 10 TO-CONFIRM items liet ke flat, khong co priority. Manager khong biet item nao can chot truoc.
**Impact:** Risk chot sai thu tu → block downstream modules.
**Action:** Chuyen thanh bang co Priority (P1/P2/P3) + Impact (module nao bi block) + Deadline. Cu the:
- P1: #1 (item key policy — block M3,M4,M5), #3 (cargo_form mapping — block M10), #5 (service/rate/day_type — block M10)
- P2: #2 (tolerance hierarchy), #7 (import upsert policy), #9 (approval for billing master change), #10 (owner_item_policy design)
- P3: #4 (capacity formula), #6 (vehicle type), #8 (import field list)

### AI-7: Them Acceptance Criteria per sub-module [MEDIUM]
**Problem:** Chi co AC o muc module (Section 25, 10 items). Thieu AC cu the cho tung sub-module de QA viet test case.
**Impact:** QA viet test case chung chung, miss edge case.
**Action:** Them 3-5 AC cho moi sub-module co logic (Sub-module 1,2,3,4,6,7,8). Pattern giong da lam cho M1 Section 25.1.

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| SystemControlMap | Data Ownership Map ghi "M2 Activated → unblock M3 InventDim creation" — spec chua co readiness trigger mechanism |
| BA_PO_Master | US-M2-002 AC2 co rate mapping cu the, spec khong co. US-M2-003 AC2 co capacity formula, spec khong co |
| StateMachine | M2 khong co state machine (dung — master data chi active/inactive). Nhung DPM flag (SHP-TC-10) can item master support |
| SystemFlow E2E | DPM SPECIAL CASE [CONFIRMED] — can flag trong item/owner_item_policy |

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: cargo_form → rate mapping table | BA + TVL | Truoc Sprint 1 |
| HIGH | AI-2: Capacity calculation formula | BA + TVL | Truoc Sprint 1 |
| HIGH | AI-4: DPM dual-tracking flag | BA | Truoc Sprint 2 |
| MEDIUM | AI-3: owner_item_policy schema | BA + Dev Lead | Sprint 1 |
| MEDIUM | AI-5: BRD Reference mapping | BA | Sprint 1 |
| MEDIUM | AI-6: TO-CONFIRM priority table | PM + BA | Truoc Sprint 1 |
| MEDIUM | AI-7: AC per sub-module | BA + QA | Sprint 1 |

---

## Diem manh cua spec

1. Cau truc tot — 8 sub-modules phu hop, boundary voi M3 rat ro (M2 = master definitions, M3 = runtime records)
2. [CONFIRMED] tags da co o Section 6 (principles) — tot hon M1 ban dau
3. Import & Validation (Sub-module 8) kha chi tiet, co case idempotent re-import
4. Business rules (MD-BR-001..014) day du va logic
5. Cross-reference validation duoc de cap nhieu cho — tot cho data integrity

---

## Next Review
Module 3 — Inventory Core Engine Spec (khi co)
