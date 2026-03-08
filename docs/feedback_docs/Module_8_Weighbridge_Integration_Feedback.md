# Module 8 — Weighbridge, OCR & Integration: Senior Manager Review Feedback

**Spec file:** `docs/spec/module_8_weighbridge_integration_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 8.5 / 10
**Verdict:** APPROVED with 5 action items before build

> **Luu y:** Spec M8 v1.1 da address ownership boundary (Section 5), retry policy matrix (Section 6), OCR→M4 handoff contract (Section 12.2), correlation_id trail (Section 16). Day la nhung bo sung quan trong va dung.

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | State machine dung + day du? | PASS | M8 khong co state machine rieng — dung vi day la data acquisition layer. weighbridge_log va erp_push_log co status tracking du |
| 2 | Posting point / control point documented? | PASS | M8 KHONG post InventTrans (Section 7 principle 1). Chi capture va chuyen data. Day la boundary dung |
| 3 | Exception flows co AC ro? | PASS | Retry matrix (Section 6) chi tiet. Manual fallback co governance. ERP push fail co alert. OCR fail co operator path |
| 4 | [TO-CONFIRM] items da co priority? | PASS | Section 20: 6 items voi P1/P2. ERP API spec la P1 BLOCKER |
| 5 | RBAC phan quyen dung role? | PASS | Section 17: WB_OPERATOR (weigh/OCR), WH_MANAGER (manual weight), BILLING_OFC (ERP push), WH_KEEPER (mobile sync) |
| 6 | Test case cover happy path + exception? | PASS | 26 ACs cho 7 sub-modules + traceability |
| 7 | Audit trail du? | PASS | Section 16: correlation trail end-to-end tu weighbridge → ERP push. external_id + correlation_id + source_channel tren moi event |
| 8 | Integration voi module khac tested? | NEED ACTION | Thieu lam ro mechanism weighbridge_log → receipt/shipment linking. Schema co receipt_id FK nhung khong noi ai populate va luc nao |

**Result: 7/8 PASS, 1 NEED ACTION**

---

## 5 Action Items

### AI-1: Lam ro weighbridge_log → receipt/shipment linking mechanism [HIGH]
**Problem:** weighbridge_log schema co `receipt_id` FK va `shipment_id` FK (nullable). Nhung spec KHONG giai thich ai populate cac FK nay va luc nao.
- Option A: WB_OPERATOR select receipt/shipment truoc khi can → FK set at weigh time
- Option B: M4/M5 link weighbridge_log vao receipt/shipment sau khi can
- Option C: Vehicle number matching automatic → FK set by system
**Impact:** Dev khong biet implementation → co the design sai → weighbridge_log orphan hoac duplicate link.
**Action:** Bo sung vao Section 10 (Sub-module 1) va Section 11 (Sub-module 2):
- Lam ro: WB_OPERATOR select receipt/shipment truoc khi bam "Record Weigh" → weighbridge_log.receipt_id duoc set tai thoi diem tao log
- Hoac: M8 tao log voi receipt_id = NULL, M4/M5 goi API link sau khi receive weigh event
- Chot 1 option va mo ta flow cu the trong Section 10.1

### AI-2: Nang cap OCR engine selection len P1 [HIGH]
**Problem:** TO-CONFIRM #2 "OCR engine selection (cloud vs on-prem)" duoc rate P2. Nhung quyet dinh nay anh huong den:
- Latency: Cloud OCR co the vi pham <= 2s neu network cham
- Cost: Cloud billing per request vs on-prem fixed cost
- Privacy: Port delivery note co the chua thong tin bay mat
- Architecture: On-prem can them component (container, GPU)
**Impact:** Neu chon sai → re-architecture sau → delay.
**Action:** Chuyen TO-CONFIRM #2 len P1. Them criteria de quyet dinh:
- Latency benchmark: OCR phai response trong <= 5s (tach khoi weighbridge 2s SLA)
- Data sensitivity: port delivery note co thong tin gi nhay cam?
- Khuyến nghi evaluate: Google Vision API (cloud) vs Tesseract (on-prem) truoc Sprint 1

### AI-3: Them photo storage strategy [MEDIUM]
**Problem:** weighbridge_log schema co `photo_alpr BYTEA` va `photo_cargo BYTEA`. BYTEA = store binary trong PostgreSQL. Day la anti-pattern cho production:
- Database size se tang nhanh neu chup nhieu anh
- Backup/restore cham vi anh lon
- Performance query se bi anh huong
**Impact:** O quy mo TVL (nhieu xe/ngay), anh BYTEA trong DB se la performance bottleneck.
**Action:** Sua lai schema thanh VARCHAR path:
```
photo_alpr_path   VARCHAR(500) N  -- Object storage path (S3, MinIO, local NFS)
photo_cargo_path  VARCHAR(500) N  -- Tuong tu
```
Hoac them note trong spec: "Photo stored via object storage, DB giu duong dan. Chua to spec chi la placeholder — phai chot storage strategy truoc Sprint 2."

### AI-4: Them manual ERP push resolution workflow [MEDIUM]
**Problem:** AC-5.3 noi "After max 10 attempts → alert BILLING_OFC" va co API endpoint `POST /api/v1/erp/retry/{id}`. Nhung spec KHONG mo ta workflow sau do:
- BILLING_OFC nhan alert → lam gi tiep?
- Manual retry co khac auto retry khong? (Phai fix ERP data truoc?)
- Neu ERP van fail sau manual retry → leo thang cho ai?
**Impact:** BILLING_OFC khong co process ro rang → ERP push FAILED lau ngay -> billing data gap.
**Action:** Bo sung vao Sub-module 5 (ERP Push) Section 14:
- Manual retry flow: BILLING_OFC xem error detail → contact ERP team → sau khi ERP fix → bam Retry
- Escalation: BILLING_OFC → WH_ADMIN → ADMIN neu fail > 24h sau alert
- Note: Manual retry PHAI reset attempt_count hoac co next_retry_at = now() (khong exponential backoff nua)

### AI-5: Them explicit AC cho correlation_id chain end-to-end [MEDIUM]
**Problem:** Section 16.2 mo ta trace path dep: weighbridge_log → receipt → InventTrans → billing → erp_push. Nhung AC-T.1 va AC-T.2 chi kiem tra "co external_id + correlation_id + source_channel" va "trace duoc nguoc". Thieu AC testable cu the.
**Impact:** QA khong co test case cu the de verify chain hoat dong.
**Action:** Them vao AC Summary:
- **AC-T.3**: Inbound flow: weighbridge_log.correlation_id == receipt.correlation_id (phai set khi link)
- **AC-T.4**: Outbound flow: weighbridge_log.correlation_id == shipment.correlation_id
- **AC-T.5**: ERP flow: erp_push_log.correlation_id == debit_note.correlation_id

---

## Cross-Check voi Check-Report Documents

| Check-Report Doc | Gap phat hien |
|-----------------|---------------|
| SystemControlMap | M8 ownership boundary khop (Section 5). Data acquisition only, no business rules. Dung. |
| BA_PO_Master | US-M8-001..004 khop. Retry policy matrix (Section 6) chi tiet hon BA_PO_Master |
| StateMachine | M8 khong co state machine — dung. weighbridge_log immutable khop BR-WB-004 |
| SystemFlow E2E | Weighbridge flow khop. ERP push flow khop. OCR handoff M4 khop |
| UserFlow A-Z | WB_OPERATOR flows 1.1-1.4 khop. Manual entry flow khop |
| M4/M5 Spec | Manual weight governance (Section 10.2) — "M8 capture, M4/M5 authorize" — dung, khop voi M4 Section 13 |

---

## Diem manh cua spec

1. **Ownership Boundary (Section 5)** — table phan biet 4 sub-capabilities, ai so huu queue, ai so huu monitoring. Rat ro rang cho multi-team implementation.
2. **Retry Policy Matrix (Section 6)** — weighbridge (3x30s fixed) vs ERP (exponential backoff) vs Mobile (unlimited) — chinh xac, khong ap chung policy.
3. **OCR → M4 Handoff Contract (Section 12.2)** — table day du: confidence threshold, auto-match priority, link_method, operator correction flow. Dev M4 biet exactly gi nhan tu M8.
4. **Correlation Trail (Section 16)** — tu weighbridge_log → receipt → InventTrans → billing → ERP push qua 1 correlation_id. Design tot.
5. **Manual Weight Governance (Section 10.2)** — "M8 capture, M4/M5 authorize" boundary ro rang. Tranh confusion ai enforce state check.
6. **10 Business Rules** voi BRD reference.

---

## Summary for Dev Team

| Priority | Action Item | Owner | Deadline |
|----------|------------|-------|----------|
| HIGH | AI-1: Weighbridge_log → receipt/shipment linking mechanism | BA + Dev Lead | Truoc Sprint 1 |
| HIGH | AI-2: Nang cap OCR engine selection len P1 | PM + Tech Lead | Truoc Sprint 1 |
| MEDIUM | AI-3: Photo storage — BYTEA → path (object storage) | Dev Lead | Truoc FS M8 |
| MEDIUM | AI-4: Manual ERP push resolution workflow | BA + BILLING_OFC | Truoc Sprint 2 |
| MEDIUM | AI-5: Them AC cho correlation_id chain testable | BA + QA | Sprint 1 |

> **P1 BLOCKER chua trong spec:** ERP API spec (endpoint, auth, payload, response) — TO-CONFIRM #1. Module M8 ERP push KHONG the build cho den khi co API spec tu ERP team. PM can escalate ngay.

---

## Next Review
Module 9 — VAS / Bagging Operations Spec (khi co)
