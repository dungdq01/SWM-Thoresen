# SWM-Thoresen — Tài liệu Điều hướng cho Senior Manager

**Phiên bản:** 1.2
**Cập nhật:** 2026-03-09
**Mục đích:** Hướng dẫn Senior Manager xác định đúng tài liệu cần đọc, theo đúng thứ tự, để review từng module backend/frontend một cách hiệu quả.

---

## Mục lục

1. [Bản đồ tài liệu dự án](#1-bản-đồ-tài-liệu-dự-án)
2. [Trạng thái module hiện tại](#2-trạng-thái-module-hiện-tại)
3. [Flow review chuẩn cho 1 module](#3-flow-review-chuẩn-cho-1-module)
4. [Review từng module chi tiết](#4-review-từng-module-chi-tiết)
5. [Tài liệu nền bắt buộc đọc trước](#5-tài-liệu-nền-bắt-buộc-đọc-trước)
6. [Quick Reference — Tra cứu nhanh](#6-quick-reference--tra-cứu-nhanh)
7. [Critical Issues — Phải fix trước Go-Live](#7-critical-issues--phải-fix-trước-go-live)
8. [Warehouse Visualization Roadmap](#8-warehouse-visualization-roadmap)

---

## 1. Bản đồ tài liệu dự án

```
SWM-Thoresen/
│
├── flow.md                          ← BẠN ĐANG Ở ĐÂY
│
├── check-report/                    ← KẾT QUẢ REVIEW CODE + SYSTEM MAPS
│   ├── Module_X_Code_Review_Report.md         (điểm số, critical issues, verdict)
│   ├── Module_X_Fix_Verification_Report*.md   (xác nhận đã fix theo bao nhiêu vòng)
│   ├── TVL_SWM_Improve.md                    ← ROADMAP CẢI TIẾN & ADVANCED FEATURES ⭐
│   ├── TVL_SWM_BA_PO_Master.md               ← TÀI LIỆU BA CHỦ ĐẠO
│   ├── TVL_SWM_StateMachine.md               (state machine toàn hệ thống)
│   ├── TVL_SWM_SystemControlMap.md           (6 posting points + audit control)
│   ├── TVL_SWM_SystemFlow_EndToEnd.md        (luồng end-to-end PO → Billing)
│   └── TVL_SWM_UserFlow_A_to_Z.md            (user journey theo từng role)
│
├── description-docs/
│   └── AI- MARKDOWN (.MD)/          ← TÀI LIỆU GỐC — BRD + PRD + KIẾN TRÚC
│       ├── THORESEN_SWM_PRD_VIBECODING_v2_0.md        (PRD đầy đủ — MUST READ)
│       ├── TVL_SWM_Business_Problem_Statement_v1_0.md (bối cảnh nghiệp vụ)
│       ├── PROJECT_CHARTER_v1_1.md                    (phạm vi, timeline, mục tiêu)
│       ├── TVL_SWM_EndToEnd_Blueprint_V1.md           (kiến trúc tổng thể)
│       ├── TVL_SWM_Business_Rules_Document.md         (77+ business rules gốc)
│       ├── TVL_SWM_InventoryTransaction_Spec.md       (InventTrans ledger spec)
│       ├── TVL_SWM_State_Machine_*v3_1*.md            (state machine chi tiết)
│       ├── TVL_SWM_Reservation_Allocation_Spec.md     (allocation-based hold)
│       └── TVL_SWM_MasterData_DataDictionary.md       (data dictionary)
│
├── backend/                         ← CODE THỰC TẾ (NestJS + Prisma + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma            (database schema — source of truth cho DB)
│   │   ├── migrations/              (lịch sử migration)
│   │   └── docs/
│   │       └── module-X-*.md        (mô tả DB per module — đọc khi review schema)
│   ├── src/modules/
│   │   ├── foundation/              (M1: RBAC, Audit, NumberSequence)
│   │   ├── master-data/             (M2: Owner, Item, Warehouse, Location...)
│   │   ├── inventory-core/          (M3: InventTrans ledger, OnHand, Posting Engine)
│   │   ├── inbound/                 (M4: PO Receipt → Weighbridge → Putaway)
│   │   ├── outbound/                (M5: SO → Shipment → Pick → Ship)
│   │   ├── inventory-control/       (M6: Cycle Count, Adjustment, Transfer)
│   │   ├── work-execution/          (M7: WorkHeader/WorkLine, Mobile Sync)
│   │   └── integration/             (M8+: Weighbridge, OCR, ERP sync)
│   └── docs/                        ← MÔ TẢ API BACKEND PER MODULE
│       └── module-X-*.md
│
└── docs/                            ← ĐẶC TẢ CHI TIẾT + KẾ HOẠCH + FEEDBACK
    ├── spec/                        (11 file spec chi tiết — M1 đến M11)
    │   └── module_X_*_spec.md
    ├── plan/                        (kế hoạch build từng module — M1 đến M7)
    │   └── module-X-*-plan.md
    ├── report/                      (báo cáo hoàn thành build — M1 đến M7)
    │   └── module-X-*-report.md
    ├── feedback/                    (feedback vòng lặp thô — fb_M0X.md)
    ├── feedback_docs/               (feedback structured per module — M1 đến M11)
    │   └── Module_X_*_Feedback.md
    ├── stack/                       (tech stack per module)
    │   └── Module_X_techstack.md
    └── architecture/
        ├── architecture-be.md       (kiến trúc backend)
        └── architecture-fe.md       (kiến trúc frontend)
```

---

## 2. Trạng thái module hiện tại

| Module | Tên | Spec | Code Review | Score | Verdict | Vấn đề còn mở |
|--------|-----|------|-------------|-------|---------|----------------|
| M1 | Foundation & Governance | v1.2 ✅ | ✅ Fix v1 | **9.0** | ✅ PASS | — |
| M2 | Master Data Management | v1.2 ✅ | ✅ Fix v4 | **9.0** | ✅ PASS | — |
| M3 | Inventory Core Engine | v1.2 ✅ | ✅ Fix v2 | **8.8** | ⚠️ COND PASS | Concurrent OnHand rebuild |
| M4 | Inbound Operations | v1.2 ✅ | ✅ Fix v3 | **8.8** | ✅ PASS | — |
| M5 | Outbound Operations | v1.2 ✅ | ✅ Fix v3 | **9.0** | ✅ PASS | — |
| M6 | Inventory Control | v1.2 ✅ | ✅ Fix v1 | **8.5** | ⚠️ COND PASS | Cycle count approval flow |
| M7 | Work Execution & Mobile | v1.2 ✅ | ✅ Fix v1 | **9.2** | ✅ PASS | — |
| M8 | Weighbridge & Integration | v1.2 ✅ | ✅ Fix v2 | **8.8** | ✅ PASS | OCR extraction là MOCK |
| M9 | VAS / Bagging | v1.2 ✅ | ✅ Fix v1 | **9.2** | ✅ PASS | — |
| M10 | Billing & Commercial | v1.2 ✅ | ✅ Fix v1 | **8.8** | ✅ PASS | StorageSnapshot = placeholder |
| M11 | Reporting & Go-Live | v1.2 ✅ | ✅ Fix v1 | **8.5** | ⚠️ COND PASS | Go-Live gate logic |
| Auth | Auth Module | — | ✅ Fix v1 | **8.5** | ⚠️ COND PASS | RequestUser field mismatch |

**Chú thích:**
- **Spec v1.2** = đã apply tất cả feedback từ feedback_docs vào spec file
- **COND PASS** = Conditional Pass — cần fix vấn đề ghi chú trước go-live
- **Code Review** = `check-report/Module_X_Code_Review_Report.md`
- **Fix vN** = số vòng fix verification: `Module_X_Fix_Verification_Report_vN.md`
- Chi tiết full re-check: `check-report/TVL_SWM_Improve.md`

---

## 3. Flow review chuẩn cho 1 module

Dưới đây là thứ tự đọc tài liệu khuyến nghị khi review **bất kỳ module nào**:

```
BƯỚC 1 — HIỂU ĐẶC TẢ (30 phút)
│
├── docs/spec/module_X_*_spec.md
│     Đọc: Scope, Design Principles, State Machine, Business Rules, AC Summary
│     Chú ý: TO-CONFIRM items (P1 BLOCKER cần unlock trước Sprint)
│
BƯỚC 2 — ĐỌC FEEDBACK (10 phút)
│
├── docs/feedback_docs/Module_X_*_Feedback.md
│     Đọc: Score, Verdict, Action Items (AI-1..n)
│     Kiểm tra: Các AI đã được apply vào spec chưa? (dấu [AI-x v1.2] trong spec)
│
BƯỚC 3 — XEM CODE REVIEW (nếu module đã build)
│
├── check-report/Module_X_Code_Review_Report.md
│     Đọc: Score, CRITICAL/HIGH issues còn mở
│
├── check-report/Module_X_Fix_Verification_Report*.md (vòng mới nhất)
│     Đọc: Tất cả issues đã fix chưa? Còn vấn đề nào OPEN?
│
BƯỚC 4 — REVIEW IMPLEMENTATION (nếu cần đi vào code)
│
├── backend/docs/module-X-*.md          (mô tả API và data flow)
├── backend/prisma/docs/module-X-*.md   (mô tả DB schema)
├── backend/src/modules/[module]/       (source code)
├── docs/plan/module-X-*-plan.md        (kế hoạch gốc)
└── docs/report/module-X-*-report.md    (báo cáo hoàn thành)
│
BƯỚC 5 — CROSS-MODULE VERIFICATION (khi cần)
│
├── check-report/TVL_SWM_StateMachine.md      (state transitions đúng không?)
├── check-report/TVL_SWM_SystemControlMap.md  (posting points đúng không?)
└── check-report/TVL_SWM_SystemFlow_EndToEnd.md (flow tổng thể consistent không?)
```

---

## 4. Review từng module chi tiết

### Module 1 — Foundation & Governance
**Mục đích:** RBAC, phân quyền, audit log, number sequence, idempotency baseline

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/Module_1_Foundation_and_Governance_Spec.md` |
| Feedback | `docs/feedback_docs/Module_1_Foundation_Governance_Feedback.md` |
| Code Review | `check-report/Module_1_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_1_Fix_Verification_Report.md` |
| DB Docs | `backend/prisma/docs/module-1-foundation.md` |
| Build Plan | `docs/plan/module-1-plan.md` |
| Build Report | `docs/report/module-1-report.md` |

**Điểm chú ý khi review:**
- Code Review 7.0/10 → **Fix Verified 9.0/10 PASS** (5 CRITICAL đã fix: DENY permission, ownerScope, idempotency, PrismaService, timezone)
- Đây là module nền — các module sau phụ thuộc vào RBAC và NumberSequence từ M1
- Kiểm tra: `common/guards/permission.guard.ts` đã enforce DENY chưa?

---

### Module 2 — Master Data Management
**Mục đích:** Owner, Item, Warehouse, Location, Zone, VehicleType, UOM, InventoryStatus

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_2_master_data_management_spec.md` |
| Feedback | `docs/feedback_docs/Module_2_Master_Data_Management_Feedback.md` |
| Code Review | `check-report/Module_2_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_2_Fix_Verification_Report_v4.md` (vòng cuối) |
| DB Docs | `backend/prisma/docs/module-2-master-data.md` |
| Build Plan | `docs/plan/module-2-master-data-plan.md` |
| Build Report | `docs/report/module-2-master-data-report.md` |

**Điểm chú ý khi review:**
- Đã fix 4 vòng (v1 → v4) — đọc bản v4 là bản mới nhất
- Phase 1: 5 InventDim = Site + Warehouse + Location + Owner + Status (KHÔNG có Batch/Lot)
- `Location` table có sẵn `x_coord`, `y_coord`, `area_m2`, `max_height_m` → nền cho Warehouse Visualization (Section 8)

---

### Module 3 — Inventory Core Engine
**Mục đích:** InventTrans (immutable ledger), OnHand (SUM), Posting Engine, Reconciliation

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_3_inventory_core_engine_spec.md` |
| Feedback | `docs/feedback_docs/Module_3_Inventory_Core_Engine_Feedback.md` |
| Code Review | `check-report/Module_3_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_3_Fix_Verification_Report_v2.md` |
| DB Docs | `backend/prisma/docs/module-3-inventory-core.md` |
| Build Plan | `docs/plan/module-3-inventory-core-plan.md` |
| Build Report | `docs/report/module-3-inventory-core-report.md` |
| Baseline Spec | `description-docs/.../TVL_SWM_InventoryTransaction_Spec.md` |

**Điểm chú ý khi review:**
- **Invariant cốt lõi:** `OnHand = SUM(InventTrans)` — KHÔNG được update OnHand trực tiếp
- `posting-engine.service.js` là file quan trọng nhất — kiểm tra tính atomic và immutable
- 6 Posting Points (PP-1 đến PP-6): xem `check-report/TVL_SWM_SystemControlMap.md`
- `reserved_qty_shipment` + `reserved_qty_vas` là 2 field riêng trên OnHand (v1.1 ADR)
- **COND PASS:** Cần xử lý Concurrent OnHand rebuild trước go-live

---

### Module 4 — Inbound Operations
**Mục đích:** PO → Receipt → Weighbridge → Tolerance → Putaway

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_4_inbound_operations_spec.md` |
| Feedback | `docs/feedback_docs/Module_4_Inbound_Operations_Feedback.md` |
| Code Review | `check-report/Module_4_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_4_Fix_Verification_Report_v3.md` (vòng cuối) |
| DB Docs | `backend/prisma/docs/module-4-inbound.md` |
| Build Plan | `docs/plan/module-4-inbound-plan.md` |
| Build Report | `docs/report/module-4-inbound-report.md` |

**Điểm chú ý khi review:**
- Posting point PP-1 = RECEIVED state (khi hàng xác nhận nhập kho)
- Tolerance FAIL → REJECTED (không qua approval). Chỉ Outbound mới PENDING_APPROVAL
- Hàng bao: cân từng xe, validate tại PO level. Hàng xá: không blocking inbound
- DPM dual tracking: InventTrans = actual weight; Billing = bag_count × nominal_weight

---

### Module 5 — Outbound Operations
**Mục đích:** SO → Shipment → Allocation-based Hold → Pick → Ship

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_5_outbound_operations_spec.md` |
| Feedback | `docs/feedback_docs/Module_5_Outbound_Operations_Feedback.md` |
| Code Review | `check-report/Module_5_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_5_Fix_Verification_Report_v3.md` (vòng cuối) |
| DB Docs | `backend/prisma/docs/module-5-outbound.md` |
| Build Plan | `docs/plan/module-5-outbound-plan.md` |
| Build Report | `docs/report/module-5-outbound-report.md` |

**Điểm chú ý khi review:**
- **Allocation-based Hold:** `reserved_qty_shipment` tăng ngay khi tạo Shipment, `physical_qty` chỉ giảm khi SHIPPED (PP-3)
- `available = physical_qty - reserved_qty_shipment - reserved_qty_vas` — phải exclude cả M9 VAS reservations
- Tolerance FAIL outbound → PENDING_APPROVAL (khác với inbound)
- **Score 9.0/10 — PASS** (Allocation REAL + M3 posting REAL + RBAC đã wired hoàn toàn)

---

### Module 6 — Inventory Control
**Mục đích:** Cycle Count, Adjustment, Move Order, Transfer Order, Status Change

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_6_inventory_control_spec.md` |
| Feedback | `docs/feedback_docs/Module_6_Inventory_Control_Feedback.md` |
| Code Review | `check-report/Module_6_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_6_Fix_Verification_Report.md` |
| DB Docs | `backend/prisma/docs/module-6-inventory-control.md` |
| Build Plan | `docs/plan/module-6-inventory-control-plan.md` |
| Build Report | `docs/report/module-6-inventory-control-report.md` |

**Điểm chú ý khi review:**
- Transfer Order state: CREATED → **RELEASED** → SHIPPED → IN_TRANSIT → RECEIVED → CLOSED
- **RELEASED (TR-02)** = đúng tên state — không phải CONFIRMED (lỗi thường gặp ở M7)
- PP-5 = MOVE/TRANSFER posting. PP-6 = ADJUSTMENT/COUNT posting
- **COND PASS 8.5/10:** Cycle count approval flow chưa hoàn chỉnh (đã qua 1 vòng fix)

---

### Module 7 — Work Execution & Mobile
**Mục đích:** WorkHeader/WorkLine, mobile offline-first, PUTAWAY/PICK/MOVE tasks

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_7_work_execution_spec.md` |
| Feedback | `docs/feedback_docs/Module_7_Work_Execution_Feedback.md` |
| Code Review | `check-report/Module_7_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_7_Fix_Verification_Report.md` |
| DB Docs | `backend/prisma/docs/module-7-work-execution.md` |
| Build Plan | `docs/plan/module-7-work-execution-plan.md` |
| Build Report | `docs/report/module-7-work-execution-report.md` |

**Điểm chú ý khi review:**
- WorkLine COMPLETED → **PHẢI** sinh InventTrans posting tương ứng (PP-2 PUTAWAY, PP-5 MOVE)
- Transfer Work: dim SHIP = FROM warehouse, dim RECEIVE = TO warehouse. Net OnHand = 0 nếu cùng owner
- QR scan trong mobile = scan **LOCATION QR** (validate vị trí), KHÔNG phải scan hàng hóa
- **Score 9.2/10 — PASS** (cao nhất trong các module đã build, đã qua 1 vòng fix)
- ⚠️ Work module scaffold (M12) chưa connect vào actual flows — xem IMP-08 ở Section 7

---

### Module 8 — Weighbridge & Integration
**Mục đích:** Weighbridge COM port, OCR, ERP sync, Mobile offline-first

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_8_weighbridge_integration_spec.md` |
| Feedback | `docs/feedback_docs/Module_8_Weighbridge_Integration_Feedback.md` |
| Code Review | `check-report/Module_8_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_8_Fix_Verification_Report_v2.md` (vòng cuối) |

**Trạng thái build:**
- **Score 8.8/10 — PASS**
- Backend API: 5 OCR endpoints có (upload, extract, confirm, link, reject), DB `IntOcrRecord` có sẵn
- ⚠️ **CRITICAL:** `OcrService.extractData()` = MOCK — trả về data giả hardcoded. Chưa có real OCR provider
- ⚠️ Frontend OCR: **KHÔNG TỒN TẠI** — không có upload page, không có confirm UI
- Xem chi tiết fix: **IMP-02** ở Section 7, và OCR roadmap ở `check-report/TVL_SWM_Improve.md` Section 2

---

### Module 9 — VAS / Bagging
**Mục đích:** Bulk → Bagged, packaging ownership TVL/CLIENT, reservation với M5

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_9_vas_bagging_spec.md` |
| Feedback | `docs/feedback_docs/Module_9_VAS_Bagging_Feedback.md` |
| Code Review | `check-report/Module_9_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_9_Fix_Verification_Report.md` |

**Trạng thái build:**
- **Score 9.2/10 — PASS** (cùng cao nhất với M7)
- **v1.1 ADR đã chốt:** `reserved_qty_vas` trên on_hand table (Option A — shared field, không API call)
- Posting: **CHỈ** tại WO COMPLETED — 3 InventTrans atomic (consume bulk + produce bagged + consume packaging)
- **TO-CONFIRM còn mở:**
  - **#1 — P1 BLOCKER:** Tier pricing reset: monthly hay rolling cumulative?
  - **#6 — P1 BLOCKER:** VAS reservation tại location-level hay warehouse-level?

---

### Module 10 — Billing & Commercial Control
**Mục đích:** Storage fee, Handling fee, Bagging fee, Debit Note, ERP push

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_10_billing_spec.md` |
| Feedback | `docs/feedback_docs/Module_10_Billing_Feedback.md` |
| Code Review | `check-report/Module_10_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_10_Fix_Verification_Report.md` |

**Trạng thái build:**
- **Score 8.8/10 — PASS**
- ⚠️ **CRITICAL:** `StorageSnapshotService` = placeholder. Daily snapshot (Opening + Inbound) × rate chưa tính thật
- **Formula quan trọng:** `billable_qty = opening + inbound` (KHÔNG trừ outbound)
- **Combined multiplier:** 1 bảng lookup duy nhất (day_type × OT) — KHÔNG nhân 2 hệ số riêng
- **TO-CONFIRM còn mở:**
  - **#1 — P1 BLOCKER:** EOD cut-off: global 23:59 hay per warehouse?
  - **#5 — P1 BLOCKER — Deadline 13/03/2026:** DAMAGED/BLOCKED có tính phí lưu kho không?

---

### Module 11 — Reporting, Audit & Go-Live
**Mục đích:** Dashboard, báo cáo inventory/billing/audit, reconciliation, go-live checklist

| Loại tài liệu | Đường dẫn |
|--------------|-----------|
| Spec (v1.2) | `docs/spec/module_11_reporting_spec.md` |
| Feedback | `docs/feedback_docs/Module_11_Reporting_Feedback.md` |
| Code Review | `check-report/Module_11_Code_Review_Report.md` |
| Fix Verified | `check-report/Module_11_Fix_Verification_Report.md` |

**Trạng thái build:**
- **Score 8.5/10 — CONDITIONAL PASS**
- M11 **KHÔNG** tạo business transaction — chỉ đọc. Control metadata (RECON result, go-live gate) thì được tạo
- SQL query On-Hand Summary: dùng `SUM(t.qty)` — M3 dùng signed qty, KHÔNG có field `direction`
- Go-Live: 12 gates (GL-001..012). Tất cả phải PASS hoặc WAIVED (có lý do) trước go-live
- RECON-001 chạy hourly, phải xong trong <=5 phút — index `(status, invent_dim_id)` bắt buộc
- ⚠️ Go-Live gate logic chưa hoàn chỉnh — dashboard charts là placeholder (SVG mini-charts)

---

## 5. Tài liệu nền bắt buộc đọc trước

Senior Manager cần đọc các tài liệu sau **một lần** trước khi bắt đầu review bất kỳ module nào:

### 5.1 Hiểu bối cảnh nghiệp vụ (đọc theo thứ tự)

| # | Tài liệu | Đường dẫn | Thời gian đọc |
|---|---------|-----------|---------------|
| 1 | Business Problem Statement | `description-docs/.../TVL_SWM_Business_Problem_Statement_v1_0.md` | 10 phút |
| 2 | Project Charter | `description-docs/.../PROJECT_CHARTER_v1_1.md` | 15 phút |
| 3 | PRD đầy đủ | `description-docs/.../THORESEN_SWM_PRD_VIBECODING_v2_0.md` | 45 phút |
| 4 | End-to-End Blueprint | `description-docs/.../TVL_SWM_EndToEnd_Blueprint_V1.md` | 30 phút |
| 5 | BA/PO Master | `check-report/TVL_SWM_BA_PO_Master.md` | 30 phút |
| 6 | Business Rules (77+) | `description-docs/.../TVL_SWM_Business_Rules_Document.md` | 20 phút |

### 5.2 Hiểu kiến trúc kỹ thuật

| # | Tài liệu | Đường dẫn | Ghi chú |
|---|---------|-----------|---------|
| 1 | State Machine toàn hệ thống | `check-report/TVL_SWM_StateMachine.md` | Tham chiếu khi review state transitions |
| 2 | System Control Map | `check-report/TVL_SWM_SystemControlMap.md` | 6 posting points + ledger integrity |
| 3 | End-to-End Flow | `check-report/TVL_SWM_SystemFlow_EndToEnd.md` | PO receipt → Billing complete |
| 4 | User Flow | `check-report/TVL_SWM_UserFlow_A_to_Z.md` | Per-role journey |
| 5 | InventTrans Spec | `description-docs/.../TVL_SWM_InventoryTransaction_Spec.md` | Core ledger design |
| 6 | Backend Architecture | `docs/architecture/architecture-be.md` | NestJS module structure |
| 7 | **Improve & Roadmap** ⭐ | `check-report/TVL_SWM_Improve.md` | Full re-check + advanced features roadmap |

---

## 6. Quick Reference — Tra cứu nhanh

### 6.1 Các Business Rules quan trọng nhất

| Rule | Nội dung | Nguồn |
|------|---------|-------|
| **Invariant #1** | `OnHand = SUM(InventTrans)`. KHÔNG update OnHand trực tiếp | CFM-01, BR-INV-001 |
| **Storage Fee** | `billable_qty = opening + inbound`. KHÔNG trừ outbound | BR-BIL-001 |
| **Allocation Hold** | `available = physical_qty - reserved_qty_shipment - reserved_qty_vas` | v1.1 ADR |
| **Inbound Tol FAIL** | → REJECTED (không approval) | BR-IN-008 |
| **Outbound Tol FAIL** | → PENDING_APPROVAL (cần WH_MANAGER) | BR-OUT-007 |
| **VAS Posting** | Chỉ tại WO COMPLETED (3 trans atomic) | BR-VAS-003 |
| **OT Multiplier** | 1 bảng lookup (day_type × OT). Không nhân riêng | v1.1 |
| **DPM Dual Track** | InventTrans = actual weight; Billing = bag_count × nominal | CFM-03 |

### 6.2 RBAC Roles (8 roles)

| Role | Mô tả |
|------|-------|
| WH_KEEPER | Nhân viên kho — thực hiện task |
| WH_MANAGER | Quản lý kho — approve, complete WO |
| WH_ADMIN | Admin kho — config master data |
| BILLING_OFC | Kế toán billing — tạo và lock Debit Note |
| CUST_VIEWER | Khách hàng — xem data của owner mình (LOCKED DN only) |
| ADMIN | System admin — toàn quyền |
| WB_OPERATOR | Nhân viên cân — vận hành weighbridge |
| OPS_SUPER | Giám sát vận hành — xem tổng thể, run reconciliation |

### 6.3 TO-CONFIRM Items còn mở (P1 BLOCKERS)

| Module | Item | Deadline |
|--------|------|---------|
| M7 | Short pick threshold (%) | Trước Sprint 1 |
| M8 | OCR engine selection | Trước Sprint 1 |
| M9 | Tier pricing reset: monthly vs rolling | Trước FS M9/M10 |
| M9 | VAS reservation: location-level vs warehouse-level | Trước FS M9 |
| M10 | EOD cut-off: global 23:59 vs per warehouse | Trước FS M10 |
| M10 | DAMAGED/BLOCKED có tính storage fee không | **13/03/2026** |
| M10 | Tier pricing reset (liên quan M9) | Trước FS M9/M10 |

### 6.4 6 Posting Points (PP)

| PP | Tên | Module | Trigger | Trans Type |
|----|-----|--------|---------|-----------|
| PP-1 | INBOUND | M4 | Receipt → RECEIVED | RECEIVE |
| PP-2 | PUTAWAY-MOVE | M7 | WorkLine PUTAWAY COMPLETED | MOVE (not PUTAWAY — M7 posts all work types as MOVE) |
| PP-3 | OUTBOUND | M5 | Shipment → SHIPPED | SHIP |
| PP-4 | VAS | M9 | VAS WO → COMPLETED | VAS_CONSUME + VAS_PRODUCE |
| PP-5 | MOVE/TRANSFER | M6/M7 | Move/Transfer COMPLETED | MOVE / TRANSFER_SHIP + RECEIVE |
| PP-6 | ADJUSTMENT | M6 | Cycle Count / Adjustment COMPLETED | ADJUST |

### 6.5 Transfer Order State Machine

```
CREATED → RELEASED → SHIPPED → IN_TRANSIT → RECEIVED → CLOSED
  (TR-01)    (TR-02)    (TR-03)    (TR-04)      (TR-05)    (TR-06)
```
**Lưu ý:** State là **RELEASED** (không phải CONFIRMED). Đây là lỗi thường gặp khi dev.

### 6.6 VAS Work Order State Machine

```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
         ↓               ↓
      CANCELLED       CANCELLED
```
- Sessions chỉ là progress log — KHÔNG post inventory
- Cancel: chỉ release `reserved_qty_vas`, không reverse InventTrans (vì chưa post gì)

---

## 7. Critical Issues — Phải fix trước Go-Live

> Source: `check-report/TVL_SWM_Improve.md` Section 4.1 (IMP-01..08)
> Đây là 8 issues **MUST DO** — không có ngoại lệ.

| # | Issue | Module | Mô tả | Effort |
|---|-------|--------|-------|--------|
| **IMP-01** | **Auth RequestUser field mismatch** | Auth | 24 tham chiếu đến `user.userId`, `user.sessionId`, `user.channel` không tồn tại trên `RequestUser`. Phá vỡ logout, profile, session, password endpoints tại runtime | 2 giờ |
| **IMP-02** | **Real OCR provider** | M8 | `OcrService.extractData()` = MOCK, trả về fake data hardcoded. Cần tích hợp Google Vision API / Azure Computer Vision | 1 tuần |
| **IMP-03** | **StorageSnapshot daily calc** | M10 | `StorageSnapshotService` = placeholder/stub. Core cho tính phí lưu kho chính xác | 1 tuần |
| **IMP-04** | **Rate limiting on auth** | Auth | Không có throttle guard trên login/refresh/password reset | 2 giờ |
| **IMP-05** | **Remove hardcoded API key** | Auth | Fallback `['internal-service-key']` hardcoded trong code | 1 giờ |
| **IMP-06** | **Swagger decorators** | Auth | Auth controllers thiếu `@ApiTags` và `@ApiOperation` | 4 giờ |
| **IMP-07** | **Delete dead stub files** | Auth | Các stub guard cũ vẫn còn trên disk | 30 phút |
| **IMP-08** | **Connect Work module** | M7/M12 | WorkHeader/WorkLine generation chưa kết nối vào inbound/outbound/VAS flows | 2 tuần |

### Sprint Plan khuyến nghị

| Sprint | Tuần | Nội dung |
|--------|------|----------|
| **Sprint 1** | W1-2 | IMP-01, 04, 05, 06, 07 (Auth fixes) + IMP-14 (Testing infra) |
| **Sprint 2** | W3-4 | IMP-02 (Real OCR) + IMP-03 (Storage snapshot) + IMP-10 (2D floor plan V1) + IMP-11 (Dashboard charts) |
| **Sprint 3** | W5-6 | IMP-10 V2/V3 (Occupancy + click-to-inspect) + IMP-12 (WebSocket) + IMP-15, 16, 19 (UX) |
| **Sprint 4** | W7-8 | IMP-08 (Work module) + IMP-13 (Offline PWA) + IMP-17, 18 (Notifications, Bulk ops) |

---

## 8. Warehouse Visualization Roadmap

> Source: `check-report/TVL_SWM_Improve.md` Section 3

### 8.1 Current State

| Layer | Trạng thái |
|-------|-----------|
| **DB Schema** | ✅ SẴN SÀNG — `Location.x_coord`, `y_coord`, `area_m2`, `max_height_m` đã có |
| **DB Schema** | ✅ SẴN SÀNG — `Zone.zoneType` (RECEIVING, STORAGE, STAGING, SHIPPING, VAS, QC, QUARANTINE) |
| **Backend API** | ⚠️ Chỉ có CRUD cơ bản — `GET /locations`, `GET /locations/:id` |
| **Frontend** | ❌ KHÔNG TỒN TẠI — chỉ có table list view, zero visualization code |

**Kết luận: Cần frontend work là chính. Backend API cần thêm aggregated endpoint.**

### 8.2 Implementation Phases

| Phase | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| **V1** | 2D floor plan (SVG) — zones color-coded, location grid | 2 tuần | x_coord/y_coord phải được populate |
| **V2** | Occupancy overlay — real-time inventory per location | 1 tuần | V1 + OnHand API per location |
| **V3** | Click-to-inspect — click location → show inventory details | 1 tuần | V2 |
| **V4** | 3D rack view — Three.js/React Three Fiber | 3 tuần | V3 + height data populated |
| **V5** | Heatmap + time slider — historical occupancy | 2 tuần | V4 + daily_storage_snapshot working |
| **V6** | Real-time worker positions (BLE/RFID) | 4+ tuần | IoT hardware integration |

### 8.3 Tech Recommendations

| Feature | Option A | Option B | Option C |
|---------|---------|---------|---------|
| **2D Floor Plan** | SVG + D3.js (static, đơn giản) | **Konva.js** (canvas, drag-zoom-pan) ⭐ | Leaflet.js (kho rất lớn) |
| **3D Rack View** | **React Three Fiber** (React wrapper) ⭐ | Three.js (raw) | Babylon.js (nhiều built-in hơn) |
| **Heatmap / 4D** | D3.js + time slider | deck.gl (high-performance) | — |

### 8.4 Backend API mới cần thêm

```
GET /api/locations?include=onhand,zone
→ Returns: { locations: [{ id, x, y, zone, onhand_qty, max_height, status }] }

GET /api/zones?include=locations,occupancy
→ Returns: aggregated occupancy per zone
```

### 8.5 Frontend pages cần tạo

```
pages/warehouse-visualization/
├── floor-plan/          (V1-V3: 2D interactive floor plan)
└── rack-view/           (V4: 3D rack visualization)

pages/reporting/dashboard/
└── (V5: heatmap + time slider tích hợp vào dashboard)
```

---

*Cập nhật flow.md khi có thay đổi lớn về structure tài liệu hoặc khi module mới được build/review.*
*Version history: v1.0 (2026-03-08) → v1.1 (2026-03-09, cập nhật scores M5/M7, bổ sung M8-M11 review status, Auth module, Section 7 Critical Issues, Section 8 Visualization Roadmap) → v1.2 (2026-03-09, sửa Fix Verified cho M6-M11 + Auth, cập nhật bảng Section 2 phản ánh đúng số vòng fix)*
