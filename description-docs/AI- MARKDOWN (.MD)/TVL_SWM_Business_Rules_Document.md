# THORESEN VINAMA LOGISTICS (TVL) — Smart Warehouse Management (SWM)

# BUSINESS RULES DOCUMENT (BRD)

**Tổng hợp 77 Business Rules từ toàn bộ tài liệu dự án**

| Key | Value |
|-----|-------|
| **Version** | 1.0 |
| **Date** | March 2026 |
| **Status** | Draft for Review |
| **Prepared by** | Smartlog Solution Team |
| **Source Documents** | PRD Vibecoding v3.0, State Machine v2.0, MasterData PRD v2.1, Gap Analysis QA Confirmed |

---

## 1. WEIGHBRIDGE & WEIGHT MANAGEMENT (5 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-WB-001 | Weighbridge | Xe lên bàn cân | Weight MUST come from scale hardware (COM port). Hệ thống đọc trọng lượng tự động từ thiết bị cân. | Manual weight entry chỉ WH_MANAGER được phép, bắt buộc reason_code + audit_log. | Xe lên cân → Scale đọc 48,500 kg → POST /api/weighbridge/weigh-in → receipt.gross = 48,500 kg |
| BR-WB-002 | Weighbridge API | POST weigh-in/weigh-out thất bại | Queue locally + retry 3 lần, mỗi lần cách 30 giây. | Sau 3 lần vẫn fail → fallback manual entry (cần WH_MANAGER approve). | Scale POST fail → retry tại 0s, 30s, 60s → nếu vẫn fail → WH_MANAGER nhập tay |
| BR-WB-003 | Weighbridge | Latency đo từ scale read đến SWM response | Phải < 2 giây. | Nếu vượt 2s → log warning, kiểm tra kết nối. | Scale read 48,500 kg → SWM nhận và phản hồi trong ≤ 2s |
| BR-WB-004 | Weighbridge | Lưu dữ liệu cân | Mỗi lần cân tạo 1 weighbridge_log record với: gross, tare, net, photos (ALPR + cargo), vehicle_number, timestamp. | Nếu is_manual_entry = TRUE → bắt buộc manual_reason_code + approved_by. | weighbridge_log: gross=48,500, tare=18,200, net=30,300, is_manual=FALSE |
| BR-WB-005 | Weighbridge – Outbound | Xe xuất có nhiều mã hàng (multi-trip) | Cân từng mã hàng: Tare (lần 0) → Gross_1 (line 1) → Gross_N (line N). Net_1 = Gross_1 − Tare. Net_N = Gross_N − Gross_(N−1). Cross-check: Total_net = Gross_final − Tare. | Nếu cross-check lệch → log warning, ưu tiên net từng line. | Tare=15,000 \| Gross_1=45,000 → Net_1=30,000 \| Gross_2=70,000 → Net_2=25,000 \| Gross_3=90,000 → Net_3=20,000. Cross: 90,000−15,000=75,000 ✓ |

---

## 2. INBOUND / RECEIPT (12 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-IN-001 | Receipt | Tạo inbound receipt | 1 receipt = 1 chuyến xe (1 trip), liên kết 1 PO. Receipt number: RCV-{YYYYMMDD}-{SEQ}. | N/A | PO-001 có 5 chuyến → 5 receipts: RCV-20260315-000001 → 000005 |
| BR-IN-002 | Receipt – Vessel | OCR scan phiếu giao hàng cảng | System extract B/L, vehicle, product, vessel → match PO → auto-create ASN với receipt_type=VESSEL. | Nếu không match B/L → WB Operator chọn thủ công Owner + B/L. | OCR scan → B/L=VN2026001 → tìm PO có B/L → tạo RCV-20260315-000001 |
| BR-IN-003 | Receipt – Normal | Nhập từ khách (Standard) | PO + ASN phải pre-create trước với vehicle list. ASN được chọn theo vehicle_number. | N/A | ASN đã tạo sẵn → xe đến → match theo biển số 51F-12345 |
| BR-IN-004 | Receipt – Tolerance | \|variance_pct\| ≤ tolerance_pct | Hệ thống auto-receive. Tạo inventory_transaction (INBOUND, +net_weight_kg) + billing_transaction (INBOUND_HANDLING, INBOUND_WEIGHING). Nhận theo cân thực tế, KHÔNG theo expected. | N/A | Expected=30,000 \| Net=30,300 \| Var=+1% \| Tol=2% → 1%≤2% → RECEIVED ✓ |
| BR-IN-005 | Receipt – Tolerance | \|variance_pct\| > tolerance_pct | PENDING_APPROVAL. Gửi notification tới WH_MANAGER. Inventory CHƯA được cộng (hàng ở trạng thái treo). Xe vẫn được rời kho. | Manager approve + reason_code → RECEIVED. Manager reject → CANCELLED hoặc re-weigh. | Expected=30,000 \| Net=31,800 \| Var=+6% \| Tol=2% → 6%>2% → PENDING_APPROVAL |
| BR-IN-006 | Receipt – Tolerance | tolerance_pct config | Config theo cặp owner + product (không phải global duy nhất). Default = 0.50%. Override bởi contract nếu có. | N/A | Owner CUST001 + SKU Cassava: tol=2%. Owner TVL + Clinker: tol=0.5% |
| BR-IN-007 | Receipt – Approval | WH Manager approve exception | Bắt buộc chọn reason_code + ghi audit_log (user_id, action=APPROVE_EXCEPTION, variance_pct, approved_at). | Reason codes: MOISTURE_LOSS, SCALE_CALIBRATION, LOADING_LEFTOVER, DOCUMENTATION_ERROR. | Manager approve: reason=MOISTURE_LOSS, var=+6%, by=USER-MGR-001 |
| BR-IN-008 | Receipt – Processing | WH Keeper scan location QR | Validate: (1) Location tồn tại, (2) Location KHÔNG phải STAGING, (3) Location thuộc warehouse hiện tại. | Nếu scan sai → thông báo lỗi, không cho tiếp tục. | Scan WH5.1-A → valid, type=STORAGE → PASS. Scan STAGE-01 → type=STAGING → BLOCK |
| BR-IN-009 | Receipt – Cancel | Cancel receipt | Chỉ được cancel từ DRAFT, AWAITING_WEIGHING, PENDING_APPROVAL. KHÔNG thể cancel đã RECEIVED/PUTAWAY/CLOSED. | Nếu đã có inventory_transaction (edge case) → tạo reversal (-qty) + reason. | Receipt ở DRAFT → cancel OK. Receipt ở RECEIVED → dùng Inventory Adjustment |
| BR-IN-010 | Receipt – Close | Receipt CLOSED | Immutable – không thể sửa/xóa. Chỉ view, export, print. Billing transactions ở READY_FOR_BILLING. | Nếu cần điều chỉnh sau CLOSED → dùng Inventory Adjustment module. | RCV-20260315-000001: CLOSED → lock toàn bộ |
| BR-IN-011 | Receipt – Blocking (Bagged) | Hàng bao nhập kho | CHẶN TỔNG PO: SUM(confirmed_bag_count across all receipts for PO) + current_bag_count ≤ PO.expected_bag_count. Nếu vượt → BLOCK + thông báo lỗi. | Hàng xá (BULK): KHÔNG áp dụng blocking. | PO=2,000 bao \| R1=800 \| R2=700 \| R3=600 → Total=2,100 > 2,000 → BLOCK! Tối đa còn 500 bao |
| BR-IN-012 | Receipt – Transition | PROCESSING → WEIGHED_OUT | Chỉ chuyển khi Scale System gửi weigh-out data, KHÔNG phải khi WH Keeper xong tất cả lines. | N/A | WH Keeper xong 3 lines nhưng xe chưa lên cân → vẫn PROCESSING |

---

## 3. OUTBOUND / SHIPMENT (10 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-OUT-001 | Shipment | Tạo shipment order | 1 shipment = 1 xe (1 trip). Shipment number: SHP-{YYYYMMDD}-{SEQ}. Có thể link SO hoặc standalone. | N/A | SO-001 → SHP-20260315-000001 (trip 1), SHP-20260315-000002 (trip 2) |
| BR-OUT-002 | Allocation | Auto-allocate | Mặc định FIFO theo ngày nhập (earliest lot first). System chọn locations có available qty đủ, sort by lot_date ASC. | Manual allocate: user chọn cụ thể location + lot + qty. Unallocate: giải phóng reserved qty. | Lot A (01/03) 500MT + Lot B (05/03) 300MT → FIFO lấy Lot A trước |
| BR-OUT-003 | Allocation | allocated_qty vs available_qty | allocated_qty KHÔNG được vượt available_qty tại mỗi location + product + lot. Available = Physical (on-hand). TVL không dùng reservation. | Nếu tổng available < expected → allocation FAIL. | Location A: available=400MT, allocate 500MT → FAIL |
| BR-OUT-004 | Shipment – Blocking (Bulk) | Hàng xá xuất kho | CHẶN TỔNG SO: SUM(shipped_qty under SO) + current_net ≤ SO.expected_qty_kg. Check tại 2 điểm: khi tạo/confirm shipment VÀ khi cân. | N/A | SO=100MT \| Shipped=80MT \| Current trip=25MT → 80+25=105 > 100 → BLOCK |
| BR-OUT-005 | Shipment – Blocking (Bagged) | Hàng bao xuất kho | CHẶN TỪNG XE: tolerance_kg = 2 × bag_shell_weight_kg × bag_count. \|actual_net − (bag_count × bag_weight_kg)\| ≤ tolerance_kg. Check mỗi trip. | Nếu vượt → PENDING_APPROVAL → WH_MANAGER xét duyệt. | 1,000 bao x 50kg, vỏ=0.15kg → tol=2×0.15×1,000=±300kg. Actual=50,200 → \|200\|≤300 → PASS |
| BR-OUT-006 | Shipment – Shipped | Trạng thái SHIPPED | Atomic: (1) inventory_txn OUTBOUND (-net), (2) update stock_on_hand, (3) billing_txn (OUTBOUND_LOADING, OUTBOUND_WEIGHING), (4) Dual tracking (bao): trừ theo cân thực, báo cáo theo bag_count, (5) Cập nhật SO shipped_qty. | Variance giữa net_weight và bag_count×bag_weight → ghi log, KHÔNG auto-adjust. | Ship 1,000 bao: actual_net=50,500kg (KHÔNG phải 50,000kg) → kho trừ 50,500 \| báo cáo -1,000 bao |
| BR-OUT-007 | Shipment – Split | Tách đơn xuất | Chọn shipment → nhập split qty → hệ thống tạo shipment mới với phần còn lại. | N/A | SHP-001 (50MT) → split 20MT → SHP-001 (30MT) + SHP-002 (20MT) |
| BR-OUT-008 | Shipment – Cancel | Cancel shipment | Cho phép từ DRAFT, CONFIRMED, ALLOCATED, PICKING, PENDING_APPROVAL. KHÔNG thể cancel đã SHIPPED/CLOSED. | Nếu có allocation → RELEASED. Nếu có pick_task → CANCELLED. Nếu đã ship 1-2 lines giữa vòng lặp → reversal bắt buộc. | SHP ở ALLOCATED → cancel → release allocation → available qty phục hồi |
| BR-OUT-009 | Container Stuffing | Tạo container stuffing order | Fee = MAX(flat_rate, qty × per_mt_rate). Method: HIGHER_OF_TWO. | N/A | 40ft, 18MT: Flat=1,400K vs PerMT=18×32K=576K → Bill=1,400,000 VND |
| BR-OUT-010 | Shipment – Weighing Loop | Vòng lặp cân multi-trip | Thứ tự cân theo line_sequence ASC. Mỗi trip: line_status → LOADING → WEIGHING_GROSS_N → LINE_SHIPPED. Hết line → ALL_WEIGHED. | Nếu 1 line FAIL giữa vòng lặp → vẫn cho cân tiếp, PENDING_APPROVAL xử lý tập trung cuối. | 3 lines: Load CaCO3 → cân → Load CaO → cân → Load Dolomite → cân → ALL_WEIGHED |

---

## 4. INVENTORY MANAGEMENT (10 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-INV-001 | Inventory | Mọi thay đổi tồn kho | PHẢI tạo inventory_transaction (InventTrans) trong DB transaction atomic (BEGIN...COMMIT). KHÔNG cập nhật OnHand trực tiếp. | N/A | Nhập 30MT → BEGIN → INSERT invent_trans(+30MT) → UPDATE on_hand → COMMIT |
| BR-INV-002 | Inventory | Công thức On-Hand | on_hand(item, dim) = SUM(invent_trans.qty WHERE item AND dim). Đây là invariant – bất kỳ lúc nào cũng phải đúng. | N/A | Location A: +500 (IN) -200 (OUT) +100 (MOVE_IN) = 400 MT on-hand |
| BR-INV-003 | Inventory | InventTrans posting point | Inbound: post tại RECEIVED state. Outbound: post tại SHIPPED state. Các state trung gian KHÔNG post. [TVL CONFIRMED] | N/A | Receipt ở PROCESSING → chưa có InventTrans. Chỉ khi RECEIVED mới tạo. |
| BR-INV-004 | Inventory | InventTrans traceability | Mọi InventTrans có RefType + RefId + RefLineId → truy vết 100% nguồn gốc biến động. Ghi per receipt_line / shipment_line. [TVL CONFIRMED] | N/A | InventTrans: ref_type=RECEIPT, ref_id=RCV-001, ref_line_id=LINE-001 |
| BR-INV-005 | Inventory | Inventory Dimensions Phase 1 | Track theo: Item + Warehouse + Location + Owner + Status. Batch/Lot = OFF. Serial = OFF. [TVL CONFIRMED] | Phase 2: xem xét bật Batch/Lot tracking. | on_hand key: SKU=CASSAVA + WH=WH5.1 + LOC=A01 + Owner=CUST001 + Status=AVAILABLE |
| BR-INV-006 | Inventory Status | 4 trạng thái Go-Live | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. KHÔNG có QC_HOLD. [TVL CONFIRMED] | Phase 2: có thể thêm WET, CONTAMINATED. | Hàng nhập mới → default AVAILABLE. Hàng hư → DAMAGED |
| BR-INV-007 | Cycle Count | Kiểm kê | Tạo count order → system sinh count lines với system_qty → Counter nhập counted_qty → Nếu variance ≠ 0 → manager approve với reason_code → tạo CYCLE_COUNT_ADJUST. | N/A | Location A: system=500MT, counted=495MT → var=-5MT → approve → adjust -5MT |
| BR-INV-008 | Adjustment | Inventory adjustment | Chỉ cần reason_code (bắt buộc) + audit_log (auto). KHÔNG cần approval workflow. [TVL CONFIRMED] | N/A | Adjust -2MT: reason=SHRINKAGE, audit: user=MGR01, time=2026-03-15 10:30 |
| BR-INV-009 | Shrinkage | Tính hao hụt | Shrinkage = Total Inbound − Total Outbound. Tính khi SKU đã xuất hết (fully shipped). | N/A | SKU-A: IN=1,000MT, OUT=985MT → Shrinkage=15MT (1.5%) |
| BR-INV-010 | Transfer | Chuyển kho inter-warehouse | TVL CÓ nghiệp vụ chuyển kho giữa các warehouse. State machine: Created → Released → Shipped → In-Transit → Received → Closed. [TVL CONFIRMED] | N/A | WH5.1 → WH5.3: 50MT Cassava → Ship: -50MT tại WH5.1 + status IN_TRANSIT → Receive: +50MT tại WH5.3 |

---

## 5. BILLING & FEE CALCULATION (12 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-BIL-001 | Billing – Storage | Tính phí lưu kho (Inventory-based) | Daily = (Opening Inventory + Inbound Today) × Unit Price (VND/MT/day). Monthly = SUM(Daily). Source: daily_storage_snapshot (EOD 23:59). | Chỉ tính khi hàng ở STORAGE location (không tính RECEIVING/STAGING). | Day1: Open=0, In=500 → 500×500đ=250K \| Day2: Open=500, In=200 → 700×500đ=350K |
| BR-BIL-002 | Billing – Storage | Phí lưu kho Area-based | Fixed: Monthly = Area(m²) × Price(VND/m²/month). Variable: Monthly = Avg Daily Used Area × Price. | N/A | Kho 500m², giá=50K/m²/tháng → 25,000K/tháng |
| BR-BIL-003 | Billing – Handling | Phí xử lý nhập/xuất | Inbound: Net Weight(MT) × Unit Price(by vehicle type) × Day Type Rate%. Outbound: Shipped Qty(MT) × Unit Price(by cargo form) × Day Type Rate%. | cargo_form quyết định đơn giá (21K/28K/32K per MT). | 25MT unloading on Holiday, rate=29,150: 25×29,150×200% = 1,457,500 VND |
| BR-BIL-004 | Billing – Day Type | Day type điều chỉnh giá | WORKING_DAY=100% (OT=130%). DAY_OFF=150% (OT=200%). HOLIDAY=200% (OT=300%). | Có calendar_detail cho override ngày cụ thể. | Ngày 30/4 (Holiday): handling ×200%. OT ngày 30/4: ×300% |
| BR-BIL-005 | Billing – Bagging | Phí đóng bao (VAS) | Labor: Actual Qty(MT) × Unit Price. Material: Bag Count × Price/Bag. Tier Pricing: 0-1000MT→111K, 1001-5000→105K, >5000→100K. | packaging_ownership (TVL/CLIENT) quyết định tính phí nguyên liệu hay không. | 800MT → Tier 1: 800×111K=88,800K. 3,000MT → 1000×111K + 2000×105K=321,000K |
| BR-BIL-006 | Billing – Contract | Hợp đồng/Rate card | Max 1 active contract per owner per date range. Contract DEFAULT (áp dụng cho tất cả khi không có contract riêng). | Nếu overlap date range → hệ thống cảnh báo. | CUST001: Contract C-001 (01/01-30/06). DEFAULT áp dụng cho owner chưa có contract |
| BR-BIL-007 | Billing – Free Days | Ngày miễn phí lưu kho | Free days tính từ ngày putaway đầu tiên per lot. Cấu hình trong contract_fee_line.free_days. | N/A | Free days=7 \| Putaway 01/03 → tính phí từ 08/03 |
| BR-BIL-008 | Billing – EOD Snapshot | Batch job EOD | Chạy tại 23:59 Việt Nam (UTC+7) hàng ngày. Capture daily_storage_snapshot: opening, inbound, outbound, closing per owner/product/location/lot. | N/A | 23:59 01/03: snapshot → Open=500, In=200, Out=100, Close=600 |
| BR-BIL-009 | Billing – Debit Note | Vòng đời Debit Note | DRAFT → REVIEWED → APPROVED → LOCKED (immutable). Locked debit note KHÔNG thể sửa. | Credit Note = Phase 2. | DN-001: DRAFT → review → approve → LOCKED by BILLING_OFC, locked_at=2026-03-15 |
| BR-BIL-010 | Billing – VAT | Thuế GTGT | VAT rate = 10% áp dụng đồng nhất. grand_total = total_amount × 1.10. | N/A | Total=10,000K → VAT=1,000K → Grand=11,000K VND |
| BR-BIL-011 | Billing – ERP Sync | Đồng bộ ERP | SWM → ERP (one-way push). Chỉ push Locked Debit Notes. Idempotent: debit_note_number là unique key → re-push không tạo trùng. | N/A | Push DN-001 lần 1: tạo. Push lần 2: skip (idempotent) |
| BR-BIL-012 | Billing – Billing UOM | Đơn vị tính phí | Billing UOM = MT (tấn). Inventory UOM = KG. Hệ thống tự động quy đổi: billing_qty_mt = weight_kg / 1000. | N/A | Nhập 30,300 kg → billing = 30.3 MT |

---

## 6. VAS / BAGGING — GIA CÔNG ĐÓNG BAO (5 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-VAS-001 | Bagging WO | Tạo Work Order đóng bao | Gồm: owner, bulk product (input), bag type (output), qty, packaging ownership (TVL/CLIENT). State: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED. | CANCELLED từ DRAFT/CONFIRMED. | WO-001: 500MT Cassava Bulk → 10,000 bao 50kg |
| BR-VAS-002 | Bagging WO | Confirm Work Order | Validate: tồn kho bulk đủ cho WO. Nếu thiếu → không cho confirm. | N/A | WO cần 500MT, on-hand=400MT → FAIL |
| BR-VAS-003 | Bagging WO | Complete Work Order | Auto-create: VAS_CONSUME (-bulk qty) + VAS_PRODUCE (+bagged qty) + VAS_CONSUME (-packaging material) + billing_transaction (BAGGING_FEE). | N/A | Complete 500MT: -500MT bulk + +500MT bagged + -10,000 bao PP + billing |
| BR-VAS-004 | Bagging – Packaging | Ownership bao bì | TVL_OWNED: BOM trừ từ TVL inventory. Bill bao gồm labor + material. CLIENT_OWNED: Cần inbound packaging trước. Trừ từ client inventory. Bill chỉ labor. | is_charge_packaging_storage: cấu hình có tính phí lưu kho bao bì không. | Client gửi 20,000 bao PP → nhập kho → WO dùng 10,000 bao → trừ từ client inventory |
| BR-VAS-005 | Bagging – Progress | Ghi nhận tiến độ | Mỗi session ghi: qty_kg, bag_count, work_date, is_overtime. Multi-session support. | N/A | WO-001: Session 1 (100MT, 2000 bao, OT=false) + Session 2 (150MT, 3000 bao, OT=true) |

---

## 7. MASTER DATA (8 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-MD-001 | Location | Công thức Capacity | capacity_mt = area_m2 × max_height_m × density × 1.10 (buffer 10%). | N/A | Area=500m², H=5m, Density=0.55 → 500×5×0.55×1.10 = 1,512.5 MT |
| BR-MD-002 | Location | Location type restriction | Putaway location PHẢI là STORAGE type. KHÔNG được STAGING/RECEIVING/SHIPPING. | N/A | Putaway → WH5.1-A (STORAGE) → OK. Putaway → STAGE-01 → BLOCK |
| BR-MD-003 | Product/SKU | Catch Weight | Hàng xá: is_catch_weight=TRUE → mọi movement dùng actual weight từ cân, KHÔNG dùng stdnetwgt. | Hàng bao: dùng stdnetwgt làm reference, actual từ cân. | Cassava Bulk: catch_weight=TRUE → always use weighbridge data |
| BR-MD-004 | Product/SKU | product_group + cargo_form | Quyết định billing rate handling fees và logic xử lý. BULK/BAGGED_25KG/BAGGED_50KG/JUMBO → đơn giá khác nhau (21K/28K/32K per MT). | N/A | BULK → 21K/MT \| BAGGED_50KG → 28K/MT \| JUMBO_1000KG → 32K/MT |
| BR-MD-005 | Number Sequence | Sinh số tự động | Scope = PER_WAREHOUSE → mỗi kho counter riêng. Format: PREFIX-DATE-SEQNUM. Daily reset. [TVL CONFIRMED] | Concurrency: dùng SELECT FOR UPDATE hoặc atomic increment để tránh trùng số. | WH5.1: RCV-20260315-000001. WH5.3: RCV-20260315-000001 (khác kho) |
| BR-MD-006 | Weight | Đơn vị trọng lượng | Nội bộ lưu bằng KG. Hiển thị bằng MT (÷1000). Tất cả tính toán bằng KG. | N/A | Nhập 30,300 kg → hiển thị 30.3 MT |
| BR-MD-007 | Warehouse | Dashboard warning | Capacity warning tại 85%. Full tại 100%. Dashboard hiện màu vàng/đỏ. | N/A | WH5.1: 87% → Yellow warning trên dashboard |
| BR-MD-008 | InventDim | Dimension uniqueness | UNIQUE constraint trên (site_id, warehouse_id, location_id, batch_id, serial_id, inventory_status, owner_id). Dùng dim_hash (SHA-256) để check nhanh. | N/A | dim_hash = SHA-256(TVL-SITE\|WH5.1\|A01\|NULL\|NULL\|AVAILABLE\|CUST001) |

---

## 8. WORK EXECUTION (2 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-WRK-001 | Work Model | Gán việc (Work Assignment) | Self-Claim: nhân viên tự chủ động nhận work trên mobile app. assigned_to luôn NULL khi tạo. KHÔNG có directed assignment. [TVL CONFIRMED] | N/A | Work WRK-001 → hiện trên app → Keeper A nhận → assigned_to=Keeper A |
| BR-WRK-002 | Work Model | Full Work model Phase 1 | WorkHeader + WorkLine bắt buộc Phase 1. Work types: Putaway, Pick, Move, CycleCount. Mỗi WorkLine link InventTrans khi complete. [TVL CONFIRMED] | N/A | Putaway: WorkHeader(WRK-001) → WorkLine(Pick from RCV zone → Put to STORAGE) |

---

## 9. RBAC & PERMISSIONS (6 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-RBAC-001 | Permission | Manual weight entry | Chỉ WH_MANAGER được phép. Bắt buộc reason_code + audit_log. | N/A | WH_MANAGER nhập tay 30,000kg, reason=SCALE_CALIBRATION |
| BR-RBAC-002 | Permission | Approve tolerance exception | Chỉ WH_MANAGER. | N/A | Inbound var=+6% → WH_MANAGER approve |
| BR-RBAC-003 | Permission | Create/Edit Rate Card | ADMIN hoặc BILLING_OFC. | N/A | BILLING_OFC tạo rate card cho CUST001 |
| BR-RBAC-004 | Permission | Lock Debit Note | Chỉ BILLING_OFC. | N/A | BILLING_OFC lock DN-001 → immutable |
| BR-RBAC-005 | Permission | Inventory Adjustment | Chỉ WH_MANAGER. | N/A | WH_MANAGER adjust -5MT, reason=SHRINKAGE |
| BR-RBAC-006 | Permission | CUST_VIEWER | Chỉ xem inventory, reports của hàng mình (own cargo only). | KHÔNG được xem hàng của owner khác. | CUST001 viewer chỉ thấy hàng của CUST001 |

---

## 10. AUDIT, COMPLIANCE & SYSTEM (7 rules)

| Rule ID | Context / Module | Condition (IF) | Action / Result (THEN) | Exceptions | Example |
|---------|-----------------|----------------|----------------------|------------|---------|
| BR-AUD-001 | Audit | Audit log bắt buộc | Mọi state change ghi: entity_type, entity_id, action, old/new values, reason_code, user_id, timestamp. Manual entries bắt buộc reason_code. | N/A | audit_log: entity=RECEIPT, id=RCV-001, action=APPROVE, old=PENDING, new=RECEIVED, by=MGR01 |
| BR-AUD-002 | Data Retention | Lưu trữ dữ liệu | Tất cả transaction logs: tối thiểu 7 năm. | N/A | inventory_transactions, billing_transactions, audit_logs: 7+ năm |
| BR-AUD-003 | Integration | Idempotency | Mọi API có ExternalId để chống tạo trùng. Re-push = no duplicate. | N/A | POST receipt với external_id=EXT-001 lần 2 → skip |
| BR-AUD-004 | Mobile | Offline capability | Queue operations locally cho putaway/pick. Sync khi online. | Cần internet cho các thao tác khác. | Putaway offline → queue → kết nối lại → sync lên server |
| BR-AUD-005 | Backup | Backup dữ liệu | Daily automated backup với point-in-time recovery. | N/A | Backup 23:00 hàng ngày → recover bất kỳ thời điểm |
| BR-AUD-006 | NFR | API response time | < 500ms single operations. < 3s reports. | N/A | GET /inventory: ≤ 500ms. GET /reports/inbound: ≤ 3s |
| BR-AUD-007 | NFR | Concurrent users | 50+ người dùng đồng thời Web + Mobile. | N/A | 30 Web + 20 Mobile = 50 concurrent sessions |

---

## SUMMARY & STATISTICS

| Category | Rules | % Total |
|----------|-------|---------|
| 1. Weighbridge & Weight Management | 5 | 6.5% |
| 2. Inbound / Receipt | 12 | 15.6% |
| 3. Outbound / Shipment | 10 | 13.0% |
| 4. Inventory Management | 10 | 13.0% |
| 5. Billing & Fee Calculation | 12 | 15.6% |
| 6. VAS / Bagging | 5 | 6.5% |
| 7. Master Data | 8 | 10.4% |
| 8. Work Execution | 2 | 2.6% |
| 9. RBAC & Permissions | 6 | 7.8% |
| 10. Audit, Compliance & System | 7 | 9.1% |
| **TOTAL** | **77** | **100%** |

---

## ASSUMPTIONS & TO-CONFIRM

Các giả định đã được đánh dấu [TVL CONFIRMED] trong tài liệu. Các điểm còn cần xác nhận:

- **Q1:** Tolerance % chính xác theo từng owner? Hay system-wide default?
- **Q2:** EOD cut-off time – đúng 23:59 hay configurable?
- **Q3:** Free-time (free storage days) – per contract hay per B/L?
- **Q4:** Tiered pricing: reset theo lịch tháng hay rolling?
- **Q5:** Hàng Damaged/Hold – có tính phí lưu kho không? Config per owner?
- **Q6:** Packaging wastage cost – TVL hay Client chịu?
- **Q7:** Multi-warehouse billing – combined debit note hay per warehouse?
- **Q8:** Bag shell weight: fixed value hay tính từ thực tế cân?
- **Q9:** Thứ tự cân lines outbound: bắt buộc theo sequence hay tự do?

---

*Confidential — Thoresen Vinama Logistics / Smartlog*
