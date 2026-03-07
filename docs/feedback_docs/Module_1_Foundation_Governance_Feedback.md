# Module 1 — Foundation & Governance: Senior Manager Review Feedback

**Spec file:** `docs/spec/Module_1_Foundation_and_Governance_Spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 6 action items before build

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | Module 1 khong co state machine chinh — dung vi day la Foundation |
| 2 | Posting point / control point documented? | PASS | Audit trail schema 14 fields, NumberSequence gap-free |
| 3 | Exception flows co AC ro? | PASS | FG-BR-009 (duplicate), FG-BR-012 (inactive entity) |
| 4 | [TO-CONFIRM] items da chot? | NEED ACTION | 7 open items chua co priority/impact |
| 5 | RBAC phan quyen dung role? | PASS | 8 roles, permission matrix day du |
| 6 | Test case cover happy path + business exception? | PASS | Implied qua AC, chua co explicit test case list |
| 7 | Audit trail du (user, timestamp, reason code)? | PASS | Section 10 audit schema rat chi tiet |
| 8 | Integration voi module khac tested? | PASS | Dependency map Section 27 ro rang |

**Result: 6/8 PASS, 2 NEED ACTION**

---

## 6 Action Items

### AI-1: Map FG-BR codes sang BRD codes [MEDIUM]
**Problem:** Spec dinh nghia FG-BR-001..014 rieng, khong reference ve Business Rules Document (BR-* codes).
**Impact:** Dev/QA khong biet FG-BR-003 tuong ung BR nao trong BRD → risk miss rule hoac duplicate rule.
**Action:** Them cot "BRD Reference" vao bang business rules. Vi du:
- FG-BR-001 (Unique entity code) → BR-MD-001
- FG-BR-003 (Soft delete) → BR-MD-003
- FG-BR-009 (Duplicate check) → BR-MD-002

### AI-2: Them [CONFIRMED] / [TO-CONFIRM] tags [HIGH]
**Problem:** Spec viet nhu moi thu da chot, nhung thuc te co 7 open items (Section 29). Doc spec khong biet dau la confirmed, dau la assumption.
**Impact:** Dev build tren assumption → phai re-work neu assumption sai.
**Action:** Tag moi decision point trong spec:
- `[CONFIRMED]` = da chot voi TVL (co CFM-XX reference)
- `[TO-CONFIRM]` = assumption, can TVL sign-off truoc build
- Uu tien tag: Sub-module 3 (Reason Code), Sub-module 7 (Number Sequence format)

### AI-3: Mark Sub-module 2 + 8 la [PROCESS] khong phai code [MEDIUM]
**Problem:** Sub-module 2 (Governance Framework) va Sub-module 8 (Compliance Monitoring) doc nhu functional spec nhung thuc te la process/policy, khong phai code.
**Impact:** Dev co the hieu nham va build UI/logic khong can thiet.
**Action:** Them tag `[PROCESS — NOT CODE]` o dau moi sub-module nay. Lam ro:
- Sub-module 2: Day la quy trinh quan ly, khong phai feature
- Sub-module 8: Day la checklist compliance, khong phai monitoring dashboard

### AI-4: Them Acceptance Criteria per sub-module [HIGH]
**Problem:** Spec co business rules nhung thieu AC cu the cho tung sub-module. QA khong biet "done" la gi.
**Impact:** QA viet test case khong du, miss edge case.
**Action:** Moi sub-module them 3-5 AC. Vi du cho Sub-module 1 (RBAC):
- AC-1: User khong co permission → API tra 403 + audit log ghi "ACCESS_DENIED"
- AC-2: Role assignment thay doi → co hieu luc ngay, khong can re-login
- AC-3: ADMIN role khong the tu xoa chinh minh

### AI-5: Section 29 — Them priority + impact cho TO-CONFIRM items [MEDIUM]
**Problem:** 7 open items liet ke flat, khong co priority. Manager khong biet item nao can chot truoc.
**Impact:** Risk chot sai thu tu → block module khac.
**Action:** Them cot Priority (P1/P2/P3) va Impact (module nao bi block). Vi du:
- "Reason code list for go-live" → P1 (block M4 Inbound, M5 Outbound)
- "Audit retention policy" → P3 (khong block build)

### AI-6: List specific reason codes cho go-live [HIGH]
**Problem:** Spec noi "reason codes configurable" nhung khong list ra cac reason code can co ngay go-live.
**Impact:** Go-live ma chua co reason code → user khong the thao tac adjustment, rejection, etc.
**Action:** Dinh nghia minimum reason code set:
- **Inbound:** DAMAGED, SHORT_DELIVERY, OVER_DELIVERY, WRONG_ITEM
- **Outbound:** CUSTOMER_REJECT, WEIGHT_MISMATCH, QUALITY_ISSUE
- **Inventory:** CYCLE_COUNT_ADJUST, DAMAGE_WRITEOFF, STATUS_CHANGE
- **General:** OTHER (bat buoc co note)

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-2: [CONFIRMED]/[TO-CONFIRM] tags | BA | Truoc Sprint 1 |
| HIGH | AI-4: Acceptance Criteria per sub-module | BA + QA | Truoc Sprint 1 |
| HIGH | AI-6: Reason code list cho go-live | BA + TVL | Truoc Sprint 2 |
| MEDIUM | AI-1: FG-BR → BRD mapping | BA | Sprint 1 |
| MEDIUM | AI-3: [PROCESS] tags | BA | Sprint 1 |
| MEDIUM | AI-5: TO-CONFIRM priority | PM + BA | Truoc Sprint 1 |

---

## Next Review
Module 2 — Master Data Spec (khi co)
