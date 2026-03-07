# TVL SWM — END-TO-END BLUEPRINT V1

> **Version:** 1.0 | **Date:** March 2026 | **Prepared by:** Smartlog Solution Team  
> **Status:** DRAFT | **Classification:** INTERNAL

| Field | Detail |
|-------|--------|
| Client | Thoresen Vinama Logistics (TVL) |
| Project | SWM - Smart Warehouse Management |
| Scale | ~81,500 m², 11 warehouses (WH5.1 – WH5.6.2) |
| Cargo Type | Bulk Cargo (hàng xá/rời) + Bagged goods (post-bagging VAS) |
| Phase | Phase 1 – Go-Live MVP |
| Timeline | 8 tuần (02/03/2026 – 24/04/2026) |

---

# 1. EXECUTIVE SUMMARY

Tài liệu này mô tả chi tiết toàn bộ quy trình vận hành kho end-to-end của hệ thống SWM dành cho TVL, từ Inbound (nhập hàng) → Storage (lưu kho) → Outbound (xuất hàng) → Billing (tính phí), bao gồm cả VAS (gia công đóng bao) và Inventory Management. Mỗi quy trình được mô tả theo cấu trúc: Actors → Pre-conditions → Main Flow → State Machine → InventTrans Impact → Exceptions → Open Issues.

## 1.1 Đặc điểm chính của TVL

- KHÔNG có barcode/RFID → hoàn toàn phụ thuộc vào cân (weighbridge) để xác định khối lượng
- Dual inbound flows: Vessel (B/L-based) + Standard (xe đăng ký trước)
- Weight tolerance giữa inbound/outbound phải quản lý chặt (shrinkage)
- Doanh thu phụ thuộc vào Billing System được feed bởi InventTrans (atomic transaction logs)
- Inbound: Vượt tolerance → REJECTED (không dùng approval) [TVL CONFIRMED]
- Outbound: Multi-trip weighing, Keeper chọn tự do thứ tự lines [TVL CONFIRMED]

## 1.2 Modules Overview

| Module | Key Responsibilities |
|--------|---------------------|
| Master Data | Owner, Product/SKU, Warehouse, Location, Vehicle Type, Reason Code, Rate Card, InventDim, OnHand, InventoryStatus, NumberSequence |
| Inbound | PO, ASN/Receipt, Weighbridge In, Putaway, OCR scan, Vessel + Standard flows, REJECTED + Re-weigh flow |
| Outbound | Sale Order, Shipment, Allocation, Picking, Loading, Weighbridge Out, Container Stuffing, Split, Flexible weighing + Retry loop |
| Inventory | On-Hand tracking, Movement ledger, Move/Transfer, Status change, Cycle count, Adjustment, InventTrans ledger |
| VAS / Bagging | Bagging Work Orders, BOM consumption, Packaging ownership (TVL/Client), Multi-session progress |
| Billing | Fee setup, Contract/Rate card, Day type config, Auto-capture, Debit Note, Lock, Export Excel |
| Integration & IoT | Weighbridge Local Agent (COM port), Mobile App sync, OCR, ERP sync (one-way push), Work Execution (WorkHeader/WorkLine) |

## 1.3 In-Scope vs Out-of-Scope (Phase 1)

| In-Scope (Go-Live) | Out-of-Scope (Phase 1 → Phase 2) |
|---------------------|----------------------------------|
| Web Admin Portal (desktop) | Full ERP accounting integration |
| Mobile App (Android/iOS/Web Mobile) cho floor operations | Multi-currency billing |
| Weighbridge integration (Local Edge Agent) | Cross-dock operations |
| Full billing cycle: setup → auto-capture → debit note → lock | RFID/Barcode for cargo |
| OCR for port delivery notes | LPN/Pallet tracking [CFM-04] |
| 2D Layout map for warehouse locations | Batch/Lot tracking [CFM-09] |
| Dashboard + Reports | Credit Note workflow [TC-17] |
| Full Work model (WorkHeader/WorkLine) [CFM-06] | ALPR camera [TC-16] → nhập tay biển số |
| Inter-warehouse Transfer [CFM-03] | FEFO allocation (chỉ FIFO Phase 1) |

---

# 2. MASTER DATA MODULE

Master Data là nền tảng của toàn bộ hệ thống. Phải setup đầy đủ trước khi chạy bất kỳ transaction nào.

## 2.1 Danh sách Entities chính (9 entities)

| # | Entity | Mô tả | Trường quan trọng |
|---|--------|-------|-------------------|
| 1 | Owner | Chủ hàng gửi kho. Liên kết inventory, billing, contract. | storerkey, short_name, default_tolerance_pct, billing_currency, payment_terms |
| 2 | Vendor | Nhà cung cấp giao hàng đến kho TVL. | storerkey, vessel_name, supplier_group |
| 3 | Item/Product | Mã hàng hóa. Bảng QUAN TRỌNG NHẤT cho hàng xá. | sku, cargo_form (BULK/BAGGED), tolerance_pct_inbound/outbound, is_catch_weight, density_mt_per_m3 |
| 4 | Warehouse | 11 kho, ~81,500 m². | code (WH5.1–WH5.6.2), warehouse_type (COVERED/OPEN_YARD), total_capacity_mt |
| 5 | Location | Vị trí lưu kho cụ thể. | loc, location_type (RECEIVING/STORAGE/STAGING/SHIPPING), capacity_mt, is_billing_location |
| 6 | Vehicle Type | Loại xe vận chuyển. | code, description, default_tare_weight_kg |
| 7 | Reason Code | Mã lý do cho adjustment, cancel, damage... | code, reason_group, description |
| 8 | InventDim | Tổ hợp dimension cho tracking tồn kho. | site_id + warehouse_id + location_id + owner_id + inventory_status + dim_hash |
| 9 | NumberSequence | Auto-generate số chứng từ. | prefix, scope (PER_WAREHOUSE), current_value, daily_reset |

## 2.2 Inventory Dimensions (Phase 1)

[TVL CONFIRMED] Phase 1 track theo 5 dimensions: Site + Warehouse + Location + Owner + Status.

- Site: luôn = 'TVL-SITE' (1 site duy nhất)
- Warehouse + Location + Owner + Status: BẮT BUỘC
- Batch/Lot: OFF Phase 1 (batch_id luôn NULL)
- Serial: KHÔNG dùng cho bulk cargo

## 2.3 Inventory Status

| Status | Mô tả | Allocate được? |
|--------|-------|----------------|
| AVAILABLE | Hàng sẵn sàng xuất kho | CÓ |
| DAMAGED | Hàng hư hỏng | KHÔNG |
| BLOCKED | Hàng bị khóa (chờ xử lý) | KHÔNG |
| IN_TRANSIT | Hàng đang chuyển kho | KHÔNG |

---

# 3. QUY TRÌNH INBOUND (NHẬP HÀNG)

## 3.1 Tổng quan

Inbound bao gồm toàn bộ quy trình từ khi tạo PO (Purchase Order) cho đến khi hàng được putaway vào vị trí lưu kho. TVL có 2 luồng nhập: Vessel (tàu biển, B/L-based) và Standard (xe đăng ký trước).

**Actors:** WH Admin, WH Keeper, Weighbridge Operator (WB Operator), System  
**Pre-conditions:** PO đã tạo, Master Data (Owner, Product, Warehouse, Location) đã setup

## 3.2 State Machine – Inbound Receipt

10 trạng thái (thêm REJECTED so với v3.0):

| # | State | Mô tả | InventTrans | Trigger |
|---|-------|-------|-------------|---------|
| 1 | DRAFT | Tạo receipt, chưa gửi | Không | User tạo mới |
| 2 | AWAITING_WEIGHING | Chờ xe lên cân | Không | Confirm receipt |
| 3 | WEIGHED_IN | Cân gross xong (xe có hàng) | Không | WB ghi gross_weight |
| 4 | PROCESSING | Xe đang dỡ hàng | Không | Barrier mở |
| 5 | WEIGHED_OUT | Cân tare xong (xe rỗng) | Không | WB ghi tare_weight |
| 6 | RECEIVED | Tolerance PASS → ghi nhận | +net_weight (PHYSICAL) | Auto nếu \|var%\| ≤ tol% |
| 7 | REJECTED | Tolerance FAIL → từ chối | KHÔNG ghi nhận | \|var%\| > tol% [TC-06] |
| 8 | PUTAWAY | Hàng đã được xếp vào STORAGE | MOVE (RECV→STORAGE) | Work completed |
| 9 | CLOSED | Khóa, immutable | Không | Auto sau putaway |
| 10 | CANCELLED | Hủy receipt | Reversal nếu đã post | User cancel |

## 3.3 Main Flow – Happy Path (Standard Vehicle)

| Step | Actor | Thao tác | System Response | InventTrans |
|------|-------|---------|-----------------|-------------|
| 1 | WH Admin | Tạo PO trên Web (owner, product, expected_qty, vehicle info). Hoặc upload Excel. | PO → CONFIRMED. Tạo Receipt → DRAFT. | Không |
| 2 | WH Admin | Confirm receipt → AWAITING_WEIGHING. | Receipt sẵn sàng cho weighbridge. | Không |
| 3 | WB Operator | Xe lên trạm cân. Hệ thống ghi gross_weight_kg từ weighbridge. | Receipt → WEIGHED_IN. Barrier mở. | Không |
| 4 | WH Keeper | Xe vào kho, dỡ hàng tại RECEIVING area. | Receipt → PROCESSING. | Không |
| 5 | WB Operator | Xe rỗng lên cân lại. Ghi tare_weight_kg. | net_weight = gross - tare. Receipt → WEIGHED_OUT. | Không |
| 6 | System | Tolerance check: \|var%\| = \|net - expected\| / expected. | Nếu PASS → RECEIVED. Post InventTrans INBOUND +net_weight. | TRX: +net_weight_kg |
| 7 | System | Auto-create Putaway Work (WRK type=PUTAWAY). | WorkHeader OPEN. WorkLine: from=RECEIVING, to=STORAGE. | Không |
| 8 | WH Keeper | Mở mobile app, Claim + Start Work. Scan QR location đích. | Validate location. WorkLine COMPLETED. | TRX: MOVE -RECV +STORAGE |
| 9 | System | Work COMPLETED → Receipt → PUTAWAY → CLOSED. | OnHand tại STORAGE location cập nhật. | Không |

## 3.4 Exception Flow – Tolerance REJECTED [TC-06]

Khi |variance_pct| > tolerance_pct:

- Receipt → REJECTED. Hiển thị lỗi: "Variance X.X% vượt tolerance Y.Y%"
- Inventory KHÔNG cộng. weighbridge_log giữ nguyên cho audit.
- Barrier mở — xe rời bàn cân.
- Action A: Re-weigh → AWAITING_WEIGHING (attempt_number++). Max 3 lần [TC-18].
- Action B: Hủy → CANCELLED (cần WH Manager sau 3 lần).

## 3.5 Exception Flow – Cancel WEIGHED_IN / PROCESSING [TC-13]

[TVL CONFIRMED] Cho phép cancel ở WEIGHED_IN hoặc PROCESSING. Nếu chưa có InventTrans → đơn giản set CANCELLED. Nếu đã có InventTrans → post reversal.

## 3.6 Ví dụ End-to-End: Nhập 30,000 kg CaCO3 Bulk

| Step | Actor | Action | System Response | OnHand Impact |
|------|-------|--------|-----------------|---------------|
| 1 | WB Op | Xe cân gross = 45,300 kg | Receipt WEIGHED_IN | Không |
| 2 | Keeper | Dỡ hàng tại RECEIVING | Receipt PROCESSING | Không |
| 3 | WB Op | Xe rỗng cân tare = 15,000 kg | net = 30,300 kg. Var = +1.0% | Không |
| 4 | System | 1.0% ≤ tolerance 2% → RECEIVED | TRX-001: INBOUND +30,300kg | physical=30,300 @ RECV |
| 5 | System | Auto-create Putaway Work WRK-001 | PUTAWAY, OPEN, priority=50 | Không |
| 6 | Keeper | Claim WRK-001, scan B-03 (STORAGE) | Validate B-03 OK | Không |
| 7 | Keeper | Confirm qty=30,300. Complete work. | TRX-002: MOVE -30,300@RECV +30,300@B-03 | B-03: 30,300 available |

---

# 4. QUY TRÌNH OUTBOUND (XUẤT HÀNG)

## 4.1 Tổng quan

Outbound bao gồm toàn bộ quy trình từ khi tạo Sale Order (SO) cho đến khi hàng xuất khỏi kho và cân xong. Đặc điểm TVL: multi-trip weighing (1 xe chở nhiều mã hàng, cân từng mã một), Keeper chọn tự do thứ tự cân.

**Actors:** WH Admin, WH Keeper, Weighbridge Operator, WH Manager (approve), System  
**Pre-conditions:** SO đã tạo, Tồn kho available đủ, Contract billing đã setup

## 4.2 State Machine – Outbound Shipment

12+ trạng thái (bao gồm multi-trip weighing loop):

| # | State | Mô tả | InventTrans | OnHand Impact |
|---|-------|-------|-------------|---------------|
| 1 | DRAFT | Tạo shipment | Không | Không |
| 2 | CONFIRMED | Xác nhận shipment | EXPECTED (optional) | +ordered |
| 3 | ALLOCATED | FIFO allocate tồn kho | REGISTERED | -available, +reserved |
| 4 | PICKING | WH Keeper đang lấy hàng | Không | Không |
| 5 | PICKED | Hàng đã lấy xong, tại STAGING | Status tracking | -reserved, +picked |
| 6 | WEIGHING_TARE | Cân xe rỗng (tare) | Không | Không |
| 7 | LOADING→GROSS_N | Loop: load + cân từng mã hàng | Không | Không |
| 8 | ALL_WEIGHED | Tất cả lines đã cân xong | Không | Không |
| 9 | SHIPPED | Cân PASS → xuất kho | ISSUE -qty (PHYSICAL) | -physical, -picked |
| 10 | PENDING_APPROVAL | ≥1 line FAIL tolerance | Không | Không |
| 11 | CLOSED | Lock, immutable | Không | Không |
| 12 | CANCELLED | Hủy shipment | Reversal | +available (restore) |

## 4.3 Main Flow – Happy Path

| Step | Actor | Thao tác | System Response | InventTrans |
|------|-------|---------|-----------------|-------------|
| 1 | WH Admin | Tạo SO trên Web (owner, product, qty, delivery date). Hoặc upload Excel. | SO → CONFIRMED. | Không |
| 2 | WH Admin | Tạo Shipment từ SO. Hệ thống auto-allocate (FIFO). | Shipment → ALLOCATED. allocation_records tạo. | -available, +reserved |
| 3 | WH Admin | Click Start Pick. | Shipment → PICKING. Pick Works tạo (1 per line). | Không |
| 4 | WH Keeper | Mở app, Claim + Start Work. Scan location, confirm qty. | WorkLine PICK + STAGE COMPLETED. | MOVE: STORAGE→STAGING |
| 5 | WH Keeper | Hoàn thành tất cả pick works. | Shipment → PICKED. | -reserved, +picked |
| 6 | WB Op | Xe rỗng lên cân. Ghi tare_weight. | Shipment → WEIGHING_TARE. | Không |
| 7 | Keeper | Load hàng lên xe (chọn line bất kỳ). Xe cân gross. | net_line = gross_N - gross_(N-1). weighbridge_trip_log ghi. | Không |
| 8 | System | Lặp lại step 7 cho từng line đến ALL_WEIGHED. | Kiểm tra tolerance từng line. | Không |
| 9 | System | Tất cả PASS → SHIPPED. Post InventTrans ISSUE per line. | TRX ISSUE -qty cho mỗi line. | -physical per line |
| 10 | System | Shipment → CLOSED. Tạo billing_txn. | Lock. billing READY. | Không |

## 4.4 Multi-Trip Weighing Loop [TC-09 CONFIRMED]

Keeper chọn tự do thứ tự cân lines. Công thức: net_line = gross_N - gross_(N-1) KHÔNG phụ thuộc thứ tự line. Ví dụ 3 mã hàng:

| Trip | Keeper chọn line | gross_before | gross_after | net_line |
|------|-----------------|-------------|-------------|----------|
| 1 | CaO (line 2) | 15,000 (=tare) | 40,000 | 25,000 kg |
| 2 | Dolomite (line 3) | 40,000 | 60,000 | 20,000 kg |
| 3 | CaCO3 (line 1) | 60,000 | 90,000 | 30,000 kg |

## 4.5 Blocking Rules

### 4.5.1 Hàng xá / Bulk [BR-OUT-004]

SUM(shipped_qty under SO) + current_net ≤ SO.expected_qty_kg. Nếu vượt → BLOCK trip. Manager có thể override [TC-11].

### 4.5.2 Hàng bao / Bagged [BR-OUT-005]

tolerance_kg = 2 × bag_shell_weight_kg × bag_count. |actual_net − (bag_count × bag_weight_kg)| ≤ tolerance_kg. Nếu vượt → PENDING_APPROVAL [TC-10].

## 4.6 Exception: Line FAIL → PENDING_APPROVAL [TC-10]

≥1 line FAIL tolerance → cả shipment PENDING_APPROVAL (tập trung cuối). WH Manager approve → SHIPPED hoặc reject → CANCELLED.

## 4.7 Allocation Logic

- Mặc định FIFO (earliest lot first). Phase 1 chỉ FIFO [TC-03 Assumed].
- TVL KHÔNG dùng reservation. Available = Physical (on-hand). [CFM-05]
- Pre-Allocation Checklist: (1) Shipment CONFIRMED, (2) available ≥ expected, (3) Blocking rule, (4) Owner match, (5) Warehouse match, (6) Status = AVAILABLE.
- Concurrency: Pessimistic Lock (SELECT FOR UPDATE) cho Phase 1. [CFM-05 Recommended]

---

# 5. QUY TRÌNH INVENTORY MANAGEMENT

## 5.1 On-Hand Formula

[TVL CONFIRMED] Available = Physical (không có reservation). Công thức:

**QUY TẮC VÀNG:** OnHand.physical_qty(item, dim) = SUM(InventTrans.qty WHERE item AND dim AND stage = PHYSICAL)

KHÔNG BAO GIỜ cập nhật on_hand trực tiếp từ UI/API. Luôn thông qua InventTrans → trigger update on_hand.

## 5.2 Movement Types

| Movement | Type | Weight | Trigger | InventTrans |
|----------|------|--------|---------|-------------|
| Receive goods | INBOUND | +qty | Receipt RECEIVED | POST: +physical, +available |
| Ship goods | OUTBOUND | -qty | Shipment SHIPPED | POST: -physical, -picked |
| Move (source) | MOVE_OUT | -qty | Transfer/Move | 2 records (pair) |
| Move (dest) | MOVE_IN | +qty | Transfer/Move | 2 records (pair) |
| Bagging consume | VAS_CONSUME | -qty (bulk) | WO completed | ref_type=ADJUSTMENT |
| Bagging produce | VAS_PRODUCE | +qty (bagged) | WO completed | ref_type=ADJUSTMENT |
| Shrinkage adjust | SHRINKAGE_ADJUST | -qty | Adjustment | [TVL] Không cần approval |
| Cycle count | CYCLE_COUNT_ADJUST | ±qty | Count approval | Approval + reason_code |
| Status change | STATUS_CHANGE | 0 (dim change) | Manual | reason_code BẮT BUỘC |

## 5.3 Cycle Count Workflow

- Step 1: WH Admin tạo Count Order trên Web (chọn warehouse, locations, count type).
- Step 2: System sinh count lines với system_qty per location+product.
- Step 3: Counter (đi tới location, nhập counted_qty trên App/Web).
- Step 4: System tính variance. Nếu ≠ 0 → chỉ cần reason_code + audit [CFM-08 CONFIRMED].
- Step 5: Tạo InventTrans CYCLE_COUNT_ADJUST. Cập nhật OnHand.

## 5.4 Inter-warehouse Transfer [CFM-03 CONFIRMED]

State machine: Created → Released → Shipped → In-Transit → Received → Closed.

- Ship từ source WH: status AVAILABLE → IN_TRANSIT, physical giảm.
- Receive tại dest WH: status IN_TRANSIT → AVAILABLE, physical tăng.
- Ví dụ: WH5.1 → WH5.3: 50MT Cassava → Ship: -50MT tại WH5.1 + IN_TRANSIT → Receive: +50MT tại WH5.3.

## 5.5 Inventory Adjustment [CFM-08]

[TVL CONFIRMED] Chỉ cần reason_code (bắt buộc) + audit_log (auto). KHÔNG cần approval workflow.

## 5.6 Reconciliation

Batch job (daily hoặc on-demand) kiểm tra: với mỗi (item_id, invent_dim_id), SUM(invent_trans.qty WHERE stage=PHYSICAL) phải = on_hand.physical_qty. Nếu chênh lệch → log vào recon_variance table + alert WH Manager. KHÔNG auto-fix.

---

# 6. QUY TRÌNH VAS / BAGGING (ĐÓNG BAO)

## 6.1 Work Order Lifecycle

DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED (hoặc CANCELLED từ DRAFT/CONFIRMED).

**Actors:** WH Admin (tạo WO), WH Keeper (thực hiện đóng bao), System

## 6.2 Main Flow

- Step 1: WH Admin tạo WO: chọn owner, bulk product (input), bag type (output), expected qty, packaging ownership (TVL/CLIENT).
- Step 2: Confirm WO: hệ thống validate tồn kho bulk đủ cho WO. Nếu thiếu → FAIL.
- Step 3: Start WO: Keeper bắt đầu đóng bao. Multi-session (nhiều phiên làm việc).
- Step 4: Mỗi session ghi: qty_kg, bag_count, work_date, is_overtime.
- Step 5: Complete WO: tạo 3 InventTrans: VAS_CONSUME (-bulk), VAS_PRODUCE (+bagged), VAS_CONSUME (-packaging nếu TVL_OWNED).

## 6.3 InventTrans Impact

- VAS_CONSUME: -bulk_qty_kg tại location xá (giảm on-hand bulk)
- VAS_PRODUCE: +bagged_qty_kg tại location bao (tăng on-hand bagged)
- VAS_CONSUME: -packaging_qty nếu packaging_ownership = TVL_OWNED

---

# 7. QUY TRÌNH BILLING (TÍNH PHÍ)

## 7.1 Pipeline 5 Giai đoạn

| Stage | Tên | Mô tả | Output |
|-------|-----|-------|--------|
| 1 | Setup | Fee types, day types, conditions, contracts | Master data billing sẵn sàng |
| 2 | Capture | Billing transactions auto-created bởi WMS events | billing_transaction records |
| 3 | Review | View 'Sản lượng tính phí', filter + search | Verified transactions |
| 4 | Debit Note | Select transactions → generate debit note | DN draft |
| 5 | Lock | Review → approve → lock (immutable) | DN locked → ERP sync |

## 7.2 Công thức tính phí

### 7.2.1 Storage Fee – Inventory-based [BR-BIL-001]

**Daily =** (Opening Inventory + Inbound Today) × Unit Price (VND/MT/day)  
**Monthly =** SUM(Daily) for billing period  
**Source:** daily_storage_snapshot table (batch job 23:59)

Chỉ tính khi hàng ở STORAGE location (không tính RECEIVING/STAGING).

*Ví dụ: Day1: Open=0, In=500MT → 500×500đ=250K | Day2: Open=500, In=200 → 700×500đ=350K | Day3: Open=700, Out=300 → 700×500đ=350K (dùng opening+inbound, KHÔNG dùng closing).*

### 7.2.2 Handling Fees [BR-BIL-003]

**Inbound:** Net Weight (MT) × Unit Price (by vehicle type) × Day Type Rate %  
**Outbound:** Shipped Qty (MT) × Unit Price (by cargo form) × Day Type Rate %

| Day Type | Rate % | OT Rate % |
|----------|--------|-----------|
| WORKING_DAY | 100% | 130% |
| DAY_OFF | 150% | 200% |
| HOLIDAY | 200% | 300% |

### 7.2.3 Bagging Fee [BR-BIL-005]

**Labor:** Actual Qty (MT) × Unit Price  
**Material:** Bag Count × Price/Bag  
**Tier Pricing:** 0-1000MT → 111K/MT, 1001-5000 → 105K/MT, >5000 → 100K/MT

### 7.2.4 Container Stuffing Fee

**Method:** HIGHER_OF_TWO → Fee = MAX(Flat Rate per container, Qty MT × Per MT Rate)

## 7.3 Debit Note Lifecycle [BR-BIL-009]

DRAFT → REVIEWED → APPROVED → LOCKED (immutable). Credit Note = Phase 2.

Locked debit notes → one-way push to ERP. Idempotent: debit_note_number là unique key.

## 7.4 Free Days [BR-BIL-007]

Free days tính từ ngày putaway đầu tiên per lot. Cấu hình trong contract_fee_line.free_days.

*Ví dụ: Free days=7, Putaway 01/03 → tính phí từ 08/03.*

---

# 8. WORK EXECUTION (MOBILE APP)

## 8.1 Work Model [CFM-06 CONFIRMED]

Phase 1 dùng Work model đầy đủ: WorkHeader + WorkLine. Không dùng simplified pick_task.

## 8.2 Work Types (Phase 1)

| Work Type | Mô tả | Trigger |
|-----------|-------|---------|
| PUTAWAY | Xếp hàng từ RECEIVING vào STORAGE | Receipt RECEIVED |
| PICK | Lấy hàng từ STORAGE ra STAGING | Shipment Start Pick |
| MOVE | Di chuyển hàng nội bộ (internal move) | Manual request |

## 8.3 Work Lifecycle

OPEN → IN_PROGRESS → COMPLETED (hoặc CANCELLED từ OPEN).

- [CFM-12 CONFIRMED] Self-Claim: Nhân viên tự nhận work trên mobile. assigned_to luôn NULL khi tạo.
- WorkLine: PENDING → IN_PROGRESS → COMPLETED. Mỗi line = 1 bước thực hiện.
- Tolerance cho actual_qty: ≤2% → auto-accept. >2% và ≤5% → flag manager. >5% → block.

## 8.4 RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | Notes |
|--------|-----------|------------|----------|-------|
| View Work List | Yes (own WH) | Yes (all WH) | Yes | |
| Claim Work | Yes | Yes | No | Admin không thao tác kho |
| Start / Complete WorkLine | Yes (assigned) | Yes | No | |
| Cancel Work (OPEN) | No | Yes | Yes | |
| Cancel Work (IN_PROGRESS) | No | Yes | No | Cần reason_code |
| Override Location Mismatch | No | Yes | No | Log override reason |
| Create Manual Move | Yes | Yes | No | |

---

# 9. INTEGRATION & IoT

## 9.1 Weighbridge Local Agent

- Kết nối COM port đọc dữ liệu từ cân điện tử.
- Gửi dữ liệu qua WebSocket/REST lên SWM backend.
- Local service (đề xuất Electron/Python) chạy trên máy tính tại trạm cân.

## 9.2 Mobile App Sync

- Offline-first cho work execution: cache works, sync khi có mạng.
- Idempotent sync via external_id. Batch sync endpoint: POST /api/v1/mobile/works/sync.

## 9.3 OCR

OCR cho phiếu giao hàng cảng (port delivery notes). Scan → extract fields → confirm/edit → link to receipt.

## 9.4 ERP Sync

SWM → ERP (one-way push). Chỉ push Locked Debit Notes. Idempotent: debit_note_number là unique key.

---

# 10. REPORTS & DASHBOARD

## 10.1 Reports

| Report | Filters | Export |
|--------|---------|--------|
| Inbound Report | Date range, owner, product, warehouse, status | Excel |
| Outbound Report | Date range, owner, product, warehouse, vehicle type | Excel |
| Inventory Report | Owner, product, location, warehouse | Excel |
| Shrinkage Report | Owner, date range (khi SKU fully shipped) | Excel |
| Custom Template | Per uploaded customer template | Excel |

## 10.2 Dashboard Charts

| Chart | Type | Key Features |
|-------|------|-------------|
| Capacity & Utilization | Bar + Line (6-month) | Warning at 85%, Full at 100% |
| Inventory Aging | Stacked Bar | 0-30d (green), 31-60 (yellow), 61-90 (orange), >90 (red) |
| Expiry Tracking | Stacked Bar | By % remaining shelf life, 5 segments |

---

# 11. DATA MODEL SUMMARY

## 11.1 InventTrans – Posting Points

| Module | Event | qty | stage | OnHand Impact |
|--------|-------|-----|-------|---------------|
| Inbound | RECEIVED | +net_weight_kg | PHYSICAL | +physical, +available |
| Inbound | PUTAWAY (Move) | ±qty (pair) | PHYSICAL | LOC_FROM → LOC_TO |
| Outbound | ALLOCATED | -allocated_qty | REGISTERED | -available, +reserved |
| Outbound | SHIPPED | -shipped_qty | PHYSICAL | -physical, -picked |
| Inventory | Internal Move | ±qty (pair) | PHYSICAL | LOC_FROM → LOC_TO |
| Inventory | Cycle Count | ±variance | PHYSICAL | ±physical, ±available |
| VAS | WO Complete | -bulk/+bagged | PHYSICAL | Consume + Produce |
| Transfer | Ship/Receive | -source/+dest | PHYSICAL | Status AVAIL↔TRANSIT |

## 11.2 OnHand Impact Matrix

| OnHand Field | IB: RECEIVED | IB: REJECTED | OB: ALLOCATED | OB: SHIPPED |
|-------------|-------------|-------------|--------------|------------|
| physical_qty | +net_weight | Không đổi | Không đổi | -shipped_qty |
| available_qty | +net_weight | Không đổi | -allocated_qty | Không đổi (đã giảm) |
| reserved_qty | 0 | 0 | +allocated_qty | -shipped_qty |
| ordered_qty | 0 | 0 | +expected_qty | 0 |

## 11.3 Idempotency Rules

| Rule | Scope | Check Method | Response |
|------|-------|-------------|----------|
| IDEM-001 | external_id | SELECT WHERE external_id = :ext_id | HTTP 409. Return existing trans |
| IDEM-002 | trans_id | UNIQUE constraint | Retry với SEQ mới |
| IDEM-004 | Receipt posting | Check (ref_type, ref_id, ref_line_id, stage=PHYSICAL) | Skip nếu đã post |
| IDEM-005 | Shipment posting | Check (ref_type, ref_id, ref_line_id, stage=PHYSICAL) | Skip nếu đã post |
| IDEM-006 | InventDim dedup | dim_hash check (SHA-256) | Return existing dim_id |

---

# 12. ĐIỂM VƯỚNG MẮC & CÂU HỎI MỞ (OPEN ISSUES)

Dưới đây là tổng hợp tất cả các điểm còn vướng mắc, giả định chưa chốt, và câu hỏi cần TVL trả lời. Phân loại theo module và mức độ ưu tiên.

## 12.1 Tổng hợp Assumptions (14 items – cần TVL confirm)

| ID | Module | Giả định | Risk | Status |
|----|--------|---------|------|--------|
| ASM-01 | Weighbridge | Tolerance % config theo cặp owner + product. Default = 0.50%. | 🔴 HIGH | Chưa chốt |
| ASM-02 | Billing | EOD snapshot chạy tại 23:59 Vietnam timezone (UTC+7). | 🔴 HIGH | Chưa chốt |
| ASM-03 | Billing | Storage fee tính từ ngày putaway (không từ ngày receipt). | 🔴 HIGH | Chưa chốt |
| ASM-04 | Billing | VAT = 10% đồng nhất cho mọi loại phí. | 🟡 MED | Chưa chốt |
| ASM-05 | Billing | Container stuffing: HIGHER_OF_TWO method là mặc định. | 🟡 MED | Chưa chốt |
| ASM-06 | Outbound | Max 1 shipment per xe per trip. | 🟡 MED | Chưa chốt |
| ASM-07 | Work | Phase 1: 3 Work Types (PUTAWAY, PICK, MOVE). CYCLE_COUNT = Phase 2. | 🟢 LOW | Chưa chốt |
| ASM-08 | InventTrans | InventTrans là immutable – chỉ INSERT, không UPDATE/DELETE. | 🟢 LOW | Giả định |
| ASM-09 | InventTrans | Timezone cho snapshot và posted_at = Asia/Bangkok UTC+7. | 🟢 LOW | Giả định |
| ASM-10 | InventTrans | NumberSequence TRX-YYYYMMDD-SEQ scope = PER_WAREHOUSE. | 🟢 LOW | Giả định |
| ASM-11 | System | Reconciliation job KHÔNG auto-fix – chỉ log + alert. | 🟢 LOW | Giả định |
| ASM-12 | System | Audit_log retention = 7 năm. | 🟢 LOW | Giả định |
| ASM-13 | Allocation | Phase 1 chỉ FIFO, không cần location priority. | 🟢 LOW | Chưa chốt |
| ASM-14 | Transfer | Transfer module có weighbridge integration không? | 🟡 MED | Chưa chốt |

## 12.2 To-Confirm Questions (18 items – cần TVL trả lời)

| ID | Câu hỏi | Priority | Module |
|----|---------|----------|--------|
| Q-IT-1 | Outbound EXPECTED InventTrans: cần tạo khi confirm SO? Hay chỉ document tracking? | MEDIUM | InventTrans |
| Q-IT-2 | PICKING InventTrans: ghi riêng hay chỉ WorkLine level? | MEDIUM | InventTrans |
| Q-IT-3 | Reconciliation frequency: Daily auto hay on-demand? | LOW | Inventory |
| Q-IT-4 | InventTrans partitioning: partition theo posted_at monthly? | LOW | InventTrans |
| Q-IT-5 | Audit log: cần ghi device_type + ip_address không? | LOW | System |
| Q-IT-6 | Snapshot cut-off time: 23:59 hay configurable per warehouse? | LOW | Billing |
| TC-1 | Short pick: difference giữa allocated và actual pick xử lý thế nào? Auto-adjust? | HIGH | Outbound |
| TC-2 | Cho phép re-allocate khi PICKING? (đề xuất: có nếu chưa pick COMPLETED) | MEDIUM | Allocation |
| TC-3 | Allocation priority ngoài FIFO? (VD: gần cửa kho trước) | LOW | Allocation |
| TC-4 | Split shipment xử lý allocation cũ thế nào? (unallocate → re-allocate?) | MEDIUM | Outbound |
| Q-BIL-1 | Storage fee free days: tính cho tất cả owner hay chỉ một số? | HIGH | Billing |
| Q-BIL-2 | Bagging tier pricing reset mỗi tháng hay cumulative? | HIGH | Billing |
| Q-BIL-3 | OT (Overtime) xác định thế nào? Theo giờ cụ thể hay tag manual? | MEDIUM | Billing |
| Q-VAS-1 | Packaging material (bao) có track tồn kho riêng không? | MEDIUM | VAS |
| Q-VAS-2 | Bagging waste/scrap rate có cần thiết kế không? | LOW | VAS |
| Q-TRF-1 | Transfer cần weighbridge ở cả 2 đầu (ship + receive)? | MEDIUM | Transfer |
| Q-TRF-2 | Transfer có tolerance check giữa ship qty và receive qty? | MEDIUM | Transfer |
| Q-MOB-1 | Mobile app cần chụp ảnh chứng từ (VD: hàng hư hỏng, biên bản giao nhận)? | MEDIUM | Mobile |

## 12.3 Vướng mắc thiết kế cần làm rõ

### 12.3.1 Billing Module
- Storage fee formula dùng opening+inbound (KHÔNG dùng closing). Khách hàng đã xác nhận chưa?
- Day type override: calendar_detail cho phép override ngày cụ thể. Nhưng quy trình ai nhập/duyệt calendar?
- Contract overlap: Max 1 active contract per owner per date range. Nếu overlap → cảnh báo hay block?
- Credit Note workflow = Phase 2. Nhưng nếu Go-Live phát hiện sai sót billing, workaround là gì?

### 12.3.2 Outbound Module
- Short pick (lấy ít hơn allocated): auto-adjust hay cần manager approve? [TC-1]
- Outbound multi-trip: nếu xe có vấn đề giữa chừng (VD: cân hỏng), quy trình xử lý?
- Shipment split khi đã ALLOCATED: unallocate cả 2 rồi re-allocate? Hay chỉ chia allocation?

### 12.3.3 Transfer Module
- State machine Transfer chưa có spec chi tiết. Cần tạo document riêng.
- Transfer có cần weighbridge ở cả 2 đầu (ship WH + receive WH)?
- Tolerance check giữa ship qty và receive qty?

### 12.3.4 VAS / Bagging
- Bagging waste/scrap: hiện tại KHÔNG có spec cho loss trong quá trình đóng bao.
- Packaging material inventory: có track riêng không hay chỉ tính vào chi phí?

### 12.3.5 System / Integration
- ERP sync: chỉ push Debit Note hay có sync master data 2 chiều?
- Weighbridge agent: spec kết nối COM port chưa chi tiết (protocol, baud rate, data format).
- ALPR camera = Phase 2. Go-Live nhập tay biển số → cần UI design cho nhập nhanh.
- OCR accuracy: target accuracy bao nhiêu %? Quy trình xử lý khi OCR sai?

---

# 13. CONFIRMED DECISIONS REGISTRY (12 items)

Những quyết định đã chốt với TVL — baseline, KHÔNG cần hỏi lại.

| ID | Chủ đề | Quyết định chốt | Impact |
|----|--------|-----------------|--------|
| CFM-01 | InventTrans Granularity | Per line (per receipt_line / shipment_line) | ref_line_id NOT NULL |
| CFM-02 | OnHand Dimensions | Item + WH + Location + Owner + Status. Phase 2: Batch. | InventDim composite 5 dims |
| CFM-03 | Inter-WH Transfer | TVL CÓ nghiệp vụ chuyển kho | Cần Transfer module |
| CFM-04 | LPN/Pallet | KHÔNG cần Phase 1 | Bỏ lpn_header, lpn_line |
| CFM-05 | Reservation | KHÔNG reserve. Available = Physical. | Bỏ reservation. Reserved = 0 |
| CFM-06 | Work Model | Full WorkHeader/WorkLine Phase 1 | Mobile app cần full UI |
| CFM-07 | Posting Point | Inbound: RECEIVED. Outbound: SHIPPED. | State trung gian không post |
| CFM-08 | Adjustment | Chỉ reason_code + audit. Không approval. | Đơn giản hóa adjustment |
| CFM-09 | Batch/Lot | OFF Phase 1. batch_id luôn NULL. | Đơn giản hóa dimension |
| CFM-10 | NumberSequence | PER_WAREHOUSE. Daily reset. | Mỗi kho counter riêng |
| CFM-11 | Inventory Status | 4 status: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT | Bỏ QC_HOLD |
| CFM-12 | Work Assignment | Self-Claim. Nhân viên tự nhận. | Không có Supervisor assign |

---

# 14. UI SCREENS & API SUMMARY

## 14.1 Web Admin Portal (~52 screens)

| Module | Screens | Key Actions |
|--------|---------|-------------|
| Auth | Login, Warehouse Selector | Login, select warehouse context |
| Master Data | Owner/Product/Warehouse/Location CRUD, 2D Layout, Inventory Status Config, Number Sequence Config | Create/edit/view master data + visual map |
| Inbound | PO List/Detail, Receipt List/Detail, OCR Mgmt, Re-weigh History | Tạo PO, upload Excel, manage OCR, view rejected/re-weigh attempts |
| Outbound | SO List/Detail, Shipment List/Detail, Container Stuffing, Weighing Attempts | Tạo SO, allocate, pick, ship, split, view retry history |
| Inventory | On-Hand, Movement History, Move, Status Change, Cycle Count, InventTrans Ledger | View stock, trace movements, move, count & adjust |
| VAS | Bagging WO List/Detail | Tạo/manage work orders, record progress |
| Billing | Fee Types, Day Types, Calendar, Conditions, Contract List/Detail, Billing Txns, Debit Note | Full billing setup → calculate → debit note → lock |
| Reports | Inbound/Outbound/Inventory/Shrinkage Reports, Dashboard | Filter, export Excel, dashboard charts |

## 14.2 Mobile App (~8 screens)

| Screen | Mô tả | Key Actions |
|--------|-------|-------------|
| Login + WH Select | Đăng nhập và chọn kho làm việc | Login, select warehouse |
| Work List | Danh sách work available/assigned | View, filter, claim work |
| Work Execution | Thực hiện từng step (scan, confirm qty) | Scan QR, enter qty, complete step |
| Cycle Count | Nhập số đếm thực tế | Enter counted_qty per location |
| Move/Transfer | Di chuyển hàng nội bộ | Scan from/to, confirm qty |
| Weighbridge | Xem thông tin cân (nếu tích hợp) | View weight, confirm |
| Notifications | Cảnh báo, đơn hàng mới | View alerts |
| Settings | Profile, sync, offline mode | Sync data, configure |

---

# 15. APPENDIX

## 15.1 So sánh Inbound vs Outbound

| Tiêu chí | Inbound Receipt | Outbound Shipment |
|----------|----------------|-------------------|
| Số trạng thái | 10 (thêm REJECTED) | 12+ (có multi-trip loop) |
| Parent document | Purchase Order (PO) | Sale Order (SO) |
| Thứ tự cân | Gross (xe có hàng) → Tare (xe rỗng) | Tare (xe rỗng) → Gross (từng mã) |
| Số lần cân | 2 lần (1 Gross + 1 Tare) | 1 + N lần (1 Tare + N Gross) |
| Thứ tự line cân | N/A (1 line/receipt) | Keeper chọn tự do [TC-09] |
| Vượt tolerance | REJECTED — báo lỗi [TC-06] | PENDING_APPROVAL [TC-10] |
| Re-weigh | CÓ [TC-18] | KHÔNG |
| Approval process | KHÔNG [TC-06] | CÓ (WH Manager) |
| Inventory impact | +qty (tạo tồn kho) | -qty (trừ tồn kho) |
| Point of no return | RECEIVED | SHIPPED |
| Blocking Bulk | Không chặn | Chặn tổng SO [TC-11: BLOCK] |
| Blocking Bagged | Chặn tổng PO [TC-12] | Chặn từng xe (dung sai vỏ) |

## 15.2 Tech Stack Recommendation

| Layer | Technology |
|-------|-----------|
| Frontend Web | React / Next.js + TailwindCSS |
| Mobile App | React Native / Flutter HOẶC Progressive Web App |
| Backend API | Node.js (NestJS) hoặc Python (FastAPI) |
| Database | PostgreSQL (primary) + Redis (cache/queue) |
| Weighbridge Agent | Local service (Electron/Python) reading COM port → WebSocket/REST |
| OCR | Cloud OCR service hoặc Tesseract |
| File Storage | S3-compatible cho documents, photos |
| Auth | JWT + RBAC middleware |
| Batch Jobs | Cron-based hoặc message queue (EOD snapshot, billing calc) |

## 15.3 Glossary

| Term | Definition |
|------|-----------|
| InventTrans | Bản ghi giao dịch tồn kho (immutable ledger). Mọi biến động tồn kho đều ghi nhận bằng 1+ InventTrans. |
| InventDim | Tổ hợp dimension để xác định hàng ở đâu, của ai, trạng thái gì. |
| OnHand | Tồn kho hiện tại = SUM(InventTrans). Single source of truth. |
| Allocation | Phân bổ tồn kho cụ thể (location + qty) cho shipment line. |
| FIFO | First In First Out — ưu tiên hàng nhập sớm nhất. |
| Tolerance | Sai số cho phép giữa số lượng kỳ vọng và thực tế cân. |
| Shrinkage | Hao hụt = Total Inbound − Total Outbound. |
| Debit Note | Chứng từ tính phí. DRAFT → REVIEWED → APPROVED → LOCKED. |
| WorkHeader/WorkLine | Mô hình work execution cho mobile. 1 Header = nhiều Lines. |

---

*— Document End — TVL_SWM_EndToEnd_Blueprint_V1*
