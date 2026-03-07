# TVL SWM — User Flow A-Z theo Role

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)
**Mục tiêu tài liệu:** Bản đồ hành trình đầy đủ của từng nhân vật trong hệ thống — mỗi bước làm gì, đi qua module nào, hệ thống phản hồi gì, trạng thái chuyển thế nào.

> **Hướng dẫn đọc:**
> - Tài liệu này là bản nhìn từ góc độ người dùng — không thay thế API Spec hay State Machine chi tiết.
> - Dùng để: onboarding nhân sự mới, review module, training, UAT scenario mapping.
> - Mỗi role có role card + 2–5 flows chính.
> - Legend: **[ACTION]** = user thao tác | **[SYSTEM]** = system tự động | **[DECISION]** = điểm phân nhánh | **[POST]** = inventory/billing posting

---

## LEGEND

| Ký hiệu | Nghĩa |
|---|---|
| **[ACTION]** | Người dùng chủ động thực hiện |
| **[SYSTEM]** | Hệ thống tự động xử lý |
| **[DECISION]** | Điểm rẽ nhánh (pass/fail, approve/reject) |
| **[POST]** | Ghi InventTrans hoặc Billing Event |
| **[CONFIRMED]** | Quyết định đã TVL chốt |
| **[TO-CONFIRM]** | Còn mở, chưa chốt |

---

## DANH SÁCH ROLE

| # | Role Code | Tên | Môi trường | Module chính |
|---|---|---|---|---|
| 1 | WB_OPERATOR | Nhân viên trạm cân | Web + App | M4 Inbound, M5 Outbound, M8 Weighbridge |
| 2 | WH_KEEPER | Thủ kho / Nhân viên kho | Mobile App | M4 Inbound, M5 Outbound, M6 Inv Control, M7 Work Execution, M9 VAS |
| 3 | WH_MANAGER | Quản lý kho | Web + App | M4, M5, M6, M7, M10 Billing approval |
| 4 | WH_ADMIN | Admin kho | Web | M1 Foundation, M2 Master Data |
| 5 | BILLING_OFC | Nhân viên billing | Web | M10 Billing & Commercial |
| 6 | OPS_SUPER | Giám sát vận hành | Web + App | M7 Work, M11 Reporting |
| 7 | ADMIN | Quản trị hệ thống | Web | M1 Foundation (toàn hệ thống) |
| 8 | CUST_VIEWER | Khách hàng xem hàng | Web | M11 Reporting (read-only, own cargo) |

---

# 1. WB_OPERATOR — Nhân viên trạm cân

**Mô tả:** Ngồi tại trạm cân, điều hành quy trình cân xe vào/ra. Dùng màn hình gắn tại trạm cân.
**Quyền:** Initiate re-weigh; confirm OCR; xem ASN/Shipment; KHÔNG approve tolerance, KHÔNG điều chỉnh tồn kho.
**Module chính:** M8 Weighbridge/OCR, M4 Inbound (cân vào), M5 Outbound (cân ra).

---

### FLOW 1.1 — Inbound weigh-in: Xe nhập chuẩn (Standard)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** Xe vào cân, WB_OPERATOR mở màn hình cân inbound | M8 | Hiển thị danh sách ASN chờ cân hôm nay | — | ASN đã được tạo trước bởi WH_ADMIN/WH_MANAGER |
| 2 | **[ACTION]** Tìm ASN theo biển số xe, chọn Receipt tương ứng | M4 | Hiển thị thông tin Receipt: owner, item, expected_qty | Receipt: DRAFT | Nếu không tìm thấy → báo lỗi, không cho cân |
| 3 | **[ACTION]** Bấm "Weigh In" (xe còn chở hàng) | M8 | Scale đọc gross weight tự động từ COM port [CONFIRMED] | Receipt: AWAITING_WEIGHING | Latency ≤ 2 giây [BR-WB-003] |
| 4 | **[SYSTEM]** Auto: ghi weighbridge_log với gross_weight + timestamp | M8 | Log lưu: gross, vehicle, timestamp, receipt_id | — | 1 lần cân = 1 weighbridge_log record [BR-WB-004] |
| 5 | **[ACTION]** Xác nhận, bấm "Confirm Weigh-In" | M4 | Receipt chuyển trạng thái | Receipt: WEIGHED_IN | — |
| 6 | **[SYSTEM]** Xe vào kho để dỡ hàng (WH_KEEPER xử lý trong kho) | M4 | Hệ thống chờ weigh-out | Receipt: PROCESSING | WH_KEEPER đang làm việc trong kho |
| 7 | **[ACTION]** Xe ra cân, WB_OPERATOR bấm "Weigh Out" (xe không hàng) | M8 | Scale đọc tare weight tự động | Receipt: PROCESSING | — |
| 8 | **[SYSTEM]** Auto tính net_weight = gross − tare. Ghi weighbridge_log tare | M8 | net_weight_kg hiển thị cho WB_OPERATOR | Receipt: WEIGHED_OUT | — |
| 9 | **[ACTION]** Bấm "Confirm Weigh-Out" | M4 | Chạy tolerance check tự động | Receipt: WEIGHED_OUT → … | **[DECISION]** xem Step 10A/10B |
| 10A | **[SYSTEM]** Variance ≤ tolerance → AUTO pass | M4 | Receipt chuyển RECEIVED, InventTrans INBOUND posted [CONFIRMED] | Receipt: RECEIVED | **[POST]** +net_weight_kg vào tồn [BR-IN-004] |
| 10B | **[SYSTEM]** Variance > tolerance → REJECTED | M4 | Hiển thị lỗi, variance%, WB_OPERATOR thấy nút "Re-weigh" | Receipt: REJECTED | Xe KHÔNG đi được cho đến khi xử lý |

---

### FLOW 1.2 — Inbound re-weigh: Cân lại sau REJECTED

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** WB_OPERATOR bấm "Initiate Re-weigh" (sau REJECTED) | M4 | Hiển thị attempt count (lần 1/2/3) | Receipt: AWAITING_WEIGHING | Quyền re-weigh: WB_OPERATOR [PRD CFM] |
| 2 | **[ACTION]** Cân lại quy trình weigh-in/out như Flow 1.1 Steps 3–9 | M8 | Ghi weighbridge_log mới, link cùng receipt_id | — | Giữ nguyên receipt number [CONFIRMED] |
| 3A | **[SYSTEM]** Lần cân mới: Variance ≤ tolerance → RECEIVED | M4 | Receipt RECEIVED, InventTrans posted | Receipt: RECEIVED | **[POST]** Flow bình thường |
| 3B | **[SYSTEM]** Vẫn fail → REJECTED lần 2/3 | M4 | Hiển thị attempt = 2/3 | Receipt: REJECTED | — |
| 4 | **[SYSTEM]** Sau 3 lần fail → nút "Re-weigh" bị khóa | M4 | Chỉ WH_MANAGER mới có thể cancel [CONFIRMED] | Receipt: REJECTED (locked) | WB_OPERATOR thông báo WH_MANAGER |

---

### FLOW 1.3 — Inbound Vessel: OCR từ phiếu giao hàng cảng

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** WB_OPERATOR chọn "Vessel Inbound", upload ảnh phiếu giao hàng cảng | M8 | OCR Engine xử lý ảnh | — | OCR extract: B/L no, vehicle, product, vessel name |
| 2 | **[SYSTEM]** OCR trích xuất fields + confidence score | M8 | Hiển thị kết quả OCR với highlight field | — | Confidence > 90% → gợi ý auto-link |
| 3A | **[SYSTEM]** Match B/L với PO trong hệ thống → auto-create Receipt | M4 | Receipt DRAFT tạo tự động với receipt_type=VESSEL | Receipt: DRAFT | [BR-IN-002] |
| 3B | **[ACTION]** OCR sai/không match → WB_OPERATOR chọn tay owner + B/L | M4 | Dropdown owner, B/L list | — | Manual confirm bắt buộc khi OCR fail |
| 4 | **[ACTION]** Bấm "Confirm & Start Weighing" | M4 | Chuyển sang flow cân bình thường (Flow 1.1 Steps 3–10) | Receipt: AWAITING_WEIGHING | — |

---

### FLOW 1.4 — Outbound: Tare + Multi-line gross weighing

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** Xe ra cân tare (xe rỗng), WB_OPERATOR tìm Shipment theo biển số | M5 | Hiển thị Shipment info: owner, lines, expected_qty | Shipment: WEIGHING_TARE | — |
| 2 | **[ACTION]** Bấm "Weigh Tare" | M8 | Scale đọc tare weight, ghi weighbridge_log | — | Tare = xe không hàng |
| 3 | **[ACTION]** Bấm "Confirm Tare", chọn line đầu tiên cần cân (Keeper chọn tự do thứ tự) [CONFIRMED] | M5 | Hiển thị line list, Keeper chọn line_1 | Shipment: LOADING (line 1) | Flexible sequence [TC-09] |
| 4 | **[ACTION]** Hàng được xếp lên xe, bấm "Weigh Gross Line 1" | M8 | Scale đọc gross_1, tính net_1 = gross_1 − tare | — | net_line_1 = gross_1 − tare [BR-WB-005] |
| 5 | **[SYSTEM]** Tolerance check line 1 | M5 | Pass → LINE_SHIPPED. Fail → PENDING_APPROVAL (không chặn giữa chừng) [CONFIRMED] | Line 1: LINE_SHIPPED hoặc PENDING | Fail không dừng vòng lặp [TC-10] |
| 6 | **[ACTION]** Chọn line tiếp theo, lặp lại Steps 4–5 cho đến hết lines | M5, M8 | net_line_N = gross_N − gross_(N−1) [CONFIRMED] | Mỗi line → trạng thái tương ứng | Cross-check cuối: total_net = gross_final − tare |
| 7 | **[SYSTEM]** Hết tất cả lines → Shipment ALL_WEIGHED | M5 | Hiển thị summary: tất cả lines, pass/fail status | Shipment: ALL_WEIGHED | — |
| 8A | **[SYSTEM]** Tất cả pass → Auto SHIPPED | M5 | InventTrans OUTBOUND posted, billing event created | Shipment: SHIPPED | **[POST]** −qty per line [CONFIRMED] |
| 8B | **[SYSTEM]** Có line PENDING_APPROVAL → WH_MANAGER nhận notification | M5 | Shipment giữ PENDING_APPROVAL cho đến khi manager xử lý | Shipment: PENDING_APPROVAL | WB_OPERATOR đã xong việc |

---

# 2. WH_KEEPER — Thủ kho / Nhân viên kho

**Mô tả:** Làm việc tại sàn kho với mobile app. Self-claim task, thực hiện putaway, pick, move, VAS bagging.
**Quyền:** Claim/execute work; scan location QR; KHÔNG approve exception, KHÔNG điều chỉnh tồn kho.
**Module chính:** M7 Work Execution, M4 Inbound (putaway), M5 Outbound (pick), M9 VAS.

---

### FLOW 2.1 — Putaway: Đưa hàng từ RECEIVING vào STORAGE

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** Receipt RECEIVED → hệ thống auto-create Putaway WorkHeader | M7 | WorkHeader OPEN xuất hiện trên mobile app của Keeper | Work: OPEN | [CONFIRMED] [BR-WRK-002] |
| 2 | **[ACTION]** WH_KEEPER mở app, xem danh sách work OPEN, bấm "Claim" trên Putaway task | M7 | `assigned_to = keeper_id`; WorkHeader vẫn OPEN [CONFIRMED] | Work: OPEN (assigned) | Claim ≠ IN_PROGRESS |
| 3 | **[ACTION]** Bấm "Start" để bắt đầu thực hiện | M7 | WorkHeader chuyển IN_PROGRESS | Work: IN_PROGRESS | Ghi timestamp `started_at` |
| 4 | **[ACTION]** Đến khu RECEIVING, scan QR code của location nguồn để xác nhận vị trí | M7 | Validate: location tồn tại, đúng type RECEIVING, đúng warehouse [BR-IN-008] | — | Scan location QR = xác nhận vị trí, KHÔNG scan hàng |
| 5 | **[ACTION]** Chọn destination location trong STORAGE, scan QR của location đích | M7 | Validate: type = STORAGE, không phải STAGING [BR-MD-002]; capacity check | — | Nếu sai type → block, báo lỗi |
| 6 | **[ACTION]** Xác nhận qty putaway, bấm "Complete WorkLine" | M7 | WorkLine COMPLETED → trigger M3 post InventTrans MOVE | — | **[POST]** MOVE: RECEIVING → STORAGE [CONFIRMED] |
| 7 | **[SYSTEM]** Tất cả WorkLine COMPLETED → WorkHeader COMPLETED | M7 | Receipt chuyển PUTAWAY; billing inbound event sẵn sàng | Receipt: PUTAWAY | — |
| 8 | **[SYSTEM]** (Sau khi WH_MANAGER close) Receipt CLOSED | M4 | Immutable — không sửa được | Receipt: CLOSED | WH_KEEPER không close được; chỉ WH_MANAGER |
| — | **[NGOẠI LỆ]** Offline: queue putaway locally, sync khi có mạng [CONFIRMED] | M8 | Conflict check khi sync | — | [BR-AUD-004] |

---

### FLOW 2.2 — Pick: Lấy hàng chuẩn bị xuất kho

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** Shipment ALLOCATED → Shipment PICKING → auto-create Pick WorkHeader (1 per shipment line) [CONFIRMED] | M7 | Pick Work OPEN trên mobile | Work: OPEN | — |
| 2 | **[ACTION]** WH_KEEPER claim task, bấm "Start" | M7 | WorkHeader: IN_PROGRESS | Work: IN_PROGRESS | — |
| 3 | **[ACTION]** Đến source location (từ allocation record), scan location QR | M7 | Validate source location khớp allocation | — | Nếu không khớp → location mismatch error |
| 4 | **[ACTION]** Lấy hàng, nhập actual_qty picked | M7 | System so sánh actual vs expected | — | **[DECISION]** xem Step 5A/5B |
| 5A | **[SYSTEM]** actual_qty = expected → WorkLine COMPLETED | M7 | **[POST]** InventTrans PICK posted via M3 | Work: COMPLETED | — |
| 5B | **[SYSTEM]** actual_qty < expected (short pick) | M7 | Flag short pick, [TO-CONFIRM] ≤2% auto-accept / 2–5% flag manager / >5% block | Work: IN_PROGRESS (flag) | Chưa chốt threshold |
| 6 | **[ACTION]** Đưa hàng đến STAGING/SHIPPING area, xác nhận destination location | M7 | WorkLine hoàn tất | — | — |
| 7 | **[SYSTEM]** Tất cả Pick Work COMPLETED → Shipment PICKED | M5 | Hệ thống báo WB_OPERATOR xe đã sẵn sàng cân | Shipment: PICKED | — |

---

### FLOW 2.3 — Move nội bộ: Di chuyển hàng trong kho

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** WH_MANAGER (hoặc tự tạo) tạo Move request, WH_KEEPER nhận Work | M6, M7 | Move WorkHeader OPEN | Work: OPEN | — |
| 2 | **[ACTION]** Claim → Start, scan source location QR | M7 | Validate source: có đủ qty, đúng warehouse | — | — |
| 3 | **[ACTION]** Scan destination location QR, nhập qty | M7 | Validate destination: STORAGE type, capacity | — | — |
| 4 | **[ACTION]** Confirm complete | M7 | **[POST]** 2 InventTrans: −qty source / +qty destination | Work: COMPLETED | Net zero — tổng tồn không đổi |

---

### FLOW 2.4 — VAS Bagging: Thực hiện đóng bao

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** VAS Work Order đã CONFIRMED, WH_KEEPER nhận task trên mobile | M9 | WO info: bulk source, bag type, planned qty | WO: IN_PROGRESS | — |
| 2 | **[ACTION]** Bấm "Start Session", nhập ca/shift | M9 | Ghi session start | — | Multi-session support [CONFIRMED] |
| 3 | **[ACTION]** Sau mỗi mẻ đóng bao, nhập actual_qty_kg + bag_count | M9 | Cập nhật progress theo WO | — | Ghi per session |
| 4 | **[ACTION]** Khi xong ca, bấm "End Session" | M9 | Lưu session: qty, bag_count, is_overtime | — | — |
| 5 | **[ACTION]** Khi WO hoàn tất, bấm "Complete WO" | M9 | **[POST]** 3 InventTrans: VAS_CONSUME bulk, VAS_PRODUCE bagged, VAS_CONSUME packaging (nếu TVL_OWNED) [CONFIRMED] | WO: COMPLETED | Billing event tạo tự động |
| — | **[NGOẠI LỆ]** Thiếu bulk hoặc bao bì → không cho complete | M9 | Error: insufficient stock | — | [BR-VAS-002] |

---

# 3. WH_MANAGER — Quản lý kho

**Mô tả:** Xử lý tất cả ngoại lệ vận hành. Quyền override tolerance, manual weight, adjustment, close receipt/shipment.
**Quyền:** Approve outbound exception; manual weight; cancel receipt; inventory adjustment; close documents; [TO-CONFIRM] approve cycle count variance.
**Module chính:** M4, M5, M6, M10 (Debit Note approve), M7 (monitor).

---

### FLOW 3.1 — Override outbound exception (PENDING_APPROVAL → SHIPPED)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** Shipment có line fail tolerance → PENDING_APPROVAL. WH_MANAGER nhận notification | M5 | Dashboard hiển thị Shipment PENDING_APPROVAL | Shipment: PENDING_APPROVAL | — |
| 2 | **[ACTION]** WH_MANAGER mở Shipment, xem detail từng line: actual vs expected, variance% | M5 | Hiển thị đầy đủ weighing history, variance per line | — | — |
| 3 | **[DECISION]** WH_MANAGER quyết định approve hoặc reject | — | — | — | — |
| 4A | **[ACTION]** Approve: chọn reason_code, ghi ghi chú, bấm "Force Approve" | M5 | **[POST]** InventTrans OUTBOUND posted, billing event created | Shipment: SHIPPED | Audit log: user, reason, variance%, timestamp [BR-AUD-001] |
| 4B | **[ACTION]** Reject: bấm "Reject Shipment", chọn reason_code | M5 | Shipment CANCELLED, allocation released | Shipment: CANCELLED | available_qty phục hồi |
| 4C | **[ACTION]** Re-pick: yêu cầu WH_KEEPER pick lại một phần | M7 | Tạo new Pick Work | Shipment: PICKING | — |

---

### FLOW 3.2 — Cancel receipt sau 3 lần re-weigh thất bại

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | WB_OPERATOR báo WH_MANAGER: Receipt đã 3 lần REJECTED, nút re-weigh bị lock | M4 | Dashboard hiển thị Receipt REJECTED với attempt=3 | Receipt: REJECTED (locked) | — |
| 2 | **[ACTION]** WH_MANAGER xem lịch sử 3 lần cân, xem variance details | M4 | 3 weighbridge_log records, variance history | — | — |
| 3 | **[ACTION]** Bấm "Cancel Receipt", chọn reason_code [CONFIRMED] | M4 | Receipt CANCELLED. Không có InventTrans nào được tạo | Receipt: CANCELLED | Không cần reverse vì chưa post [BR-IN-009] |
| 4 | **[SYSTEM]** Xe được phép rời kho | — | — | — | — |

---

### FLOW 3.3 — Manual weight entry (khi scale bị lỗi)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | Scale fail sau 3 lần retry → WB_OPERATOR báo WH_MANAGER | M8 | System hiển thị scale error, auto-retry đã fail | — | [BR-WB-002] |
| 2 | **[ACTION]** WH_MANAGER mở Receipt, bấm "Manual Weight Entry" | M4 | Form nhập tay với `is_manual_entry=TRUE` | — | Chỉ WH_MANAGER có quyền [BR-RBAC-001] |
| 3 | **[ACTION]** Nhập gross_weight (hoặc tare), chọn reason_code bắt buộc (e.g. SCALE_CALIBRATION) | M4 | Validate: reason_code có trong catalog, không trống | — | — |
| 4 | **[ACTION]** Bấm "Submit Manual Weight" | M4 | Ghi weighbridge_log với `is_manual_entry=TRUE`, `approved_by=manager_id` | — | Audit trail đầy đủ [BR-WB-004] |
| 5 | **[SYSTEM]** Tolerance check chạy bình thường với manual weight | M4 | RECEIVED hoặc REJECTED như flow thông thường | — | — |

---

### FLOW 3.4 — Inventory Adjustment (xử lý hao hụt/tìm thấy hàng)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** WH_MANAGER vào Inventory Control → Adjustment, tạo mới | M6 | Form: item, warehouse, location, qty (+ hoặc −), reason_code | — | — |
| 2 | **[ACTION]** Nhập qty_adjustment (âm hoặc dương), chọn reason_code bắt buộc | M6 | Validate: reason_code hợp lệ, location tồn tại, không vượt available (nếu là trừ) | — | [BR-INV-008] |
| 3 | **[ACTION]** Bấm "Post Adjustment" | M6 | **[POST]** InventTrans ADJUSTMENT created via M3 | — | Không cần approval workflow [CONFIRMED] |
| 4 | **[SYSTEM]** OnHand cập nhật tự động | M3 | Audit log tự động ghi | — | Audit: user, before/after, reason [BR-AUD-001] |

---

### FLOW 3.5 — Cycle Count approval (kiểm kê có variance)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** WH_MANAGER tạo Count Session, chọn locations cần kiểm kê | M6 | System sinh Count Lines với system_qty (blind count — WH_KEEPER không thấy system_qty) | Count: OPEN | [BR-INV-007] |
| 2 | **[ACTION]** WH_KEEPER nhận task đếm, nhập counted_qty thực tế | M7 | Lưu counted_qty per location per item | — | Blind: WH_KEEPER chưa thấy variance |
| 3 | **[SYSTEM]** WH_MANAGER xem Count Results: variance = counted − system | M6 | Hiển thị per line: system_qty, counted_qty, variance | — | — |
| 4A | **[SYSTEM]** Variance = 0 → auto-close line | M6 | No posting needed | Line: MATCHED | — |
| 4B | **[ACTION]** Variance ≠ 0 → WH_MANAGER chọn reason_code, approve | M6 | **[POST]** InventTrans CYCLE_COUNT_ADJUST | Line: ADJUSTED | [BR-INV-007] Reason bắt buộc |
| 5 | **[SYSTEM]** Tất cả lines xử lý → Count Session CLOSED | M6 | Reconciliation report available | Count: CLOSED | — |

---

# 4. WH_ADMIN — Admin kho

**Mô tả:** Chuẩn bị data nền cho hệ thống hoạt động. Không can thiệp vào vận hành hàng ngày.
**Quyền:** Create/edit master data; setup rate card; configure tolerance; [TO-CONFIRM] RBAC setup (hay do ADMIN?).
**Module chính:** M1 Foundation, M2 Master Data.

---

### FLOW 4.1 — Setup Owner + Item + Location (chuẩn bị Go-Live)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** Tạo Owner: nhập code, name, tax_code, contact | M2 | Validate: code UNIQUE, không trống | Owner: active | — |
| 2 | **[ACTION]** Tạo Item/SKU: nhập code, cargo_form (BULK/BAGGED), tolerance_pct inbound/outbound, is_catch_weight | M2 | Validate: tolerance_pct > 0, cargo_form hợp lệ | Item: active | Tolerance per owner+item [BR-IN-006] |
| 3 | **[ACTION]** Setup Owner-Item tolerance override (nếu cần khác default) | M2 | Ghi config per cặp owner+item | — | Default 0.5% [TO-CONFIRM] |
| 4 | **[ACTION]** Tạo Location: nhập warehouse, location_code, location_type, area_m2, max_height_m | M2 | Validate: warehouse tồn tại, location_type hợp lệ | Location: active | capacity_mt auto-tính [BR-MD-001] |
| 5 | **[ACTION]** Import hàng loạt từ Excel nếu cần | M2 | Validate: check trùng mã, thiếu trường, sai reference | — | Error report per row |

---

### FLOW 4.2 — Setup Rate Card + Billing Terms

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[ACTION]** Vào Billing Master, tạo Contract mới cho Owner | M2 | Form: owner, effective_from, effective_to, free_days | Contract: DRAFT | Max 1 active contract per owner per date range [BR-BIL-006] |
| 2 | **[ACTION]** Add fee lines: storage_rate/MT/day, handling_rate_inbound, handling_rate_outbound, bagging_rate | M2 | Validate: rate > 0, cargo_form mapping | — | Rate theo cargo_form (BULK/BAGGED) |
| 3 | **[ACTION]** Setup day type calendar: đánh dấu ngày nghỉ/lễ | M2 | Calendar hiển thị, có thể override per ngày | — | DAY_OFF=150%, HOLIDAY=200% [BR-BIL-004] |
| 4 | **[ACTION]** Activate contract | M2 | Validate: không overlap với contract hiện có | Contract: ACTIVE | Cảnh báo nếu overlap date range [BR-BIL-006] |

---

# 5. BILLING_OFC — Nhân viên Billing

**Mô tả:** Quản lý toàn bộ chu kỳ billing: từ xem events → tính phí → tạo debit note → lock → push ERP.
**Quyền:** Review/lock Debit Note; xử lý billing exception; push ERP. KHÔNG chỉnh sửa InventTrans.
**Module chính:** M10 Billing & Commercial, M11 Reporting (billing reports).

---

### FLOW 5.1 — Tính phí hàng tháng & lock Debit Note

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** EOD 23:59 hàng ngày → batch job chạy, tạo daily_storage_snapshot | M10 | Snapshot: opening, inbound_today, closing per owner/item/location | — | Không trừ outbound trong ngày [BR-BIL-001] [CONFIRMED] |
| 2 | **[SYSTEM]** Billing events tự động capture khi Receipt RECEIVED / Shipment SHIPPED / VAS WO COMPLETED | M10 | Event queue: loại phí, qty, owner, rate basis | — | — |
| 3 | **[ACTION]** BILLING_OFC mở Billing module, chọn period cần tính phí (e.g. tháng 3/2026) | M10 | Hiển thị danh sách events chưa bill + snapshots | — | — |
| 4 | **[ACTION]** Bấm "Generate Draft Debit Note" cho owner | M10 | Charge Calculation Engine chạy: events × rate × day_type_factor | DN: DRAFT | Calculation trace lưu đầy đủ |
| 5 | **[ACTION]** Review từng charge line: storage fee, handling fee, bagging fee, VAT | M10 | Hiển thị breakdown: qty, rate, amount, VAT 10% [BR-BIL-010] | — | Có thể re-generate nếu thấy sai (trước lock) |
| 6 | **[ACTION]** Bấm "Approve" (review pass) | M10 | DN chuyển REVIEWED → APPROVED | DN: APPROVED | — |
| 7 | **[ACTION]** Bấm "Lock Debit Note" — chỉ BILLING_OFC [CONFIRMED] | M10 | DN immutable — không thể sửa nữa [BR-BIL-009] | DN: LOCKED | Audit: locked_by, locked_at |
| 8 | **[ACTION]** Bấm "Push to ERP" | M10, M8 | ERP one-way push: payload gửi qua M8 [CONFIRMED] | — | Idempotent: DN number là unique key [BR-BIL-011] |
| 9A | **[SYSTEM]** ERP nhận thành công | M8 | sync_status = SUCCESS | — | — |
| 9B | **[SYSTEM]** ERP reject (mapping lỗi) → retry | M8 | Alert BILLING_OFC; retry tự động | — | Retry idempotent [BR-AUD-003] |

---

### FLOW 5.2 — Xử lý billing exception (thiếu rate card)

| Step | Người dùng làm | Module | System phản hồi | State chuyển | Ghi chú |
|------|---------------|--------|-----------------|--------------|---------|
| 1 | **[SYSTEM]** Billing event không tìm được rate card → event flag "UNBILLED" | M10 | Alert BILLING_OFC | Event: UNBILLED | — |
| 2 | **[ACTION]** BILLING_OFC xem danh sách UNBILLED events | M10 | List: owner, service type, date, reason unbilled | — | — |
| 3A | **[ACTION]** Nếu thiếu rate card: nhờ WH_ADMIN thêm rate card | M2 | Sau khi rate card được thêm → re-process event | Event: PENDING | — |
| 3B | **[ACTION]** Nếu event orphan (không có giao dịch gốc): flag to investigate | M10 | Ghi audit log investigation | Event: FLAGGED | — |

---

# 6. OPS_SUPER — Giám sát vận hành

**Mô tả:** Nhìn tổng quan vận hành, không thực hiện giao dịch trực tiếp.
**Quyền:** View tất cả; approve Work Order VAS; run reports. KHÔNG lock billing, KHÔNG adjust inventory.
**Module chính:** M7 Work Execution (monitor), M11 Reporting, M9 VAS (approve WO).

---

### FLOW 6.1 — Monitor công việc hàng ngày

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Mở Operational Dashboard | M11 | Hiển thị: throughput hôm nay, work queue OPEN/IN_PROGRESS, pending exceptions, capacity per warehouse | Real-time |
| 2 | **[ACTION]** Xem Work Queue: filter theo warehouse, shift, status | M7 | List WorkHeader: assigned, unassigned, overdue | — |
| 3 | **[ACTION]** Xem exception list: PENDING_APPROVAL (outbound), REJECTED (inbound), scale fail | M4, M5 | Exception dashboard: loại, thời gian tạo, SLA | Báo WH_MANAGER nếu treo quá lâu |
| 4 | **[ACTION]** Approve VAS Work Order [TO-CONFIRM: OPS_SUPER hay WH_MANAGER approve?] | M9 | WO chuyển CONFIRMED | — |

---

### FLOW 6.2 — Chạy báo cáo tồn kho & reconciliation

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Mở Reports, chọn "Inventory Report", filter: date range, owner, warehouse | M11 | Tổng hợp: on-hand per owner/location/status, movement history | — |
| 2 | **[ACTION]** Chọn "Shrinkage Report" cho owner đã xuất hết hàng | M11 | Shrinkage = Total Inbound − Total Outbound per SKU per owner [BR-INV-009] | — |
| 3 | **[ACTION]** Chạy Reconciliation: Ledger vs OnHand vs Billing | M11 | Bảng đối soát 3 chiều; flag discrepancy | Không auto-fix — chỉ log + alert [CONFIRMED] |
| 4 | **[ACTION]** Export Excel | M11 | Download file | — |

---

# 7. ADMIN — Quản trị hệ thống

**Mô tả:** Quản lý user, quyền, cấu hình hệ thống. Không can thiệp vào vận hành kho hay billing.
**Quyền:** Full system config; create/edit users; manage roles; view audit logs.
**Module chính:** M1 Foundation.

---

### FLOW 7.1 — Quản lý user & phân quyền

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Tạo user mới: username, full_name, email, gán role | M1 | Validate: email unique, role hợp lệ | — |
| 2 | **[ACTION]** Gán warehouse scope cho user (user chỉ thấy data của warehouse được gán) | M1 | Permission matrix cập nhật | — |
| 3 | **[ACTION]** Deactivate user (nhân viên nghỉ việc) | M1 | User inactive, session bị revoke | Không xóa — giữ audit trail |
| 4 | **[ACTION]** Xem audit log toàn hệ thống: filter theo user, module, action, date | M1 | Audit trail 7 năm [BR-AUD-002] | — |

---

### FLOW 7.2 — Setup Number Sequence & Reason Code

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Setup Number Sequence: PREFIX, scope (PER_WAREHOUSE), daily reset flag | M1 | Validate: prefix unique per document type | [CONFIRMED] Format: PREFIX-YYYYMMDD-SEQ [BR-MD-005] |
| 2 | **[ACTION]** Tạo Reason Code: code, description, áp dụng cho action nào | M1 | Reason code catalog cập nhật | Dùng cho manual weight, adjustment, cancel, override |

---

# 8. CUST_VIEWER — Khách hàng xem hàng

**Mô tả:** Đại diện của chủ hàng, truy cập để theo dõi hàng hóa và billing của riêng mình.
**Quyền:** Read-only; chỉ thấy data của owner mình [CONFIRMED]; KHÔNG thấy data owner khác [BR-RBAC-006].
**Module chính:** M11 Reporting (read-only).

---

### FLOW 8.1 — Xem tồn kho của mình

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Login với tài khoản CUST_VIEWER | M1 | Hệ thống filter tự động theo owner_id của user | Auto filter — không thể xem owner khác |
| 2 | **[ACTION]** Mở Inventory View, filter: date, warehouse, item, status | M11 | Hiển thị on-hand: item, location, qty, status, aging | — |
| 3 | **[ACTION]** Xem movement history: inbound/outbound history theo ngày | M11 | Transaction history với receipt/shipment reference | — |
| 4 | **[ACTION]** Export Excel | M11 | Download file trong phạm vi quyền của mình | — |

---

### FLOW 8.2 — Xem Debit Note

| Step | Người dùng làm | Module | System phản hồi | Ghi chú |
|------|---------------|--------|-----------------|---------|
| 1 | **[ACTION]** Mở Billing section, xem Debit Note list | M10 | Chỉ hiển thị DN của owner mình: DRAFT (ẩn?), LOCKED | [TO-CONFIRM]: CUST_VIEWER có xem DRAFT không? |
| 2 | **[ACTION]** Mở DN detail, xem breakdown: storage, handling, bagging, VAT | M10 | Charge breakdown + calculation basis | — |
| 3 | **[ACTION]** Download PDF / Excel | M10 | Export file | — |

---

# PHỤ LỤC — Cross-role Flow: End-to-end Inbound → Billing

```
WH_ADMIN/WH_MANAGER    WB_OPERATOR          WH_KEEPER            BILLING_OFC
──────────────────────  ───────────────────  ───────────────────  ─────────────
Tạo PO + ASN           Xe vào, match ASN
                        Weigh-In
                        Confirm Weigh-In
                                             Dỡ hàng trong kho
                        Xe ra, Weigh-Out
                        Tolerance check
                        ├─ PASS → RECEIVED                        EOD: Billing event
                        │                    Nhận Putaway Work    captured
                        │                    Claim + Execute
                        │                    Scan location QR
                        │                    Complete WorkLine
                        │                    → MOVE posted
                        │                    Receipt PUTAWAY
WH_MANAGER Close →      │                                         Cuối tháng:
Receipt CLOSED          │                                         Generate DN
                        └─ FAIL → REJECTED
                        Re-weigh (max 3)
                        3 fail → WH_MANAGER Cancel
```

---

*TVL SWM User Flow A-Z — Phiên bản phục vụ Senior Manager Review & Team Onboarding*
*Nguồn gốc: TVL_SWM_overview_spec_module.md + Business Rules Document v1.0 + PRD v4.0*
