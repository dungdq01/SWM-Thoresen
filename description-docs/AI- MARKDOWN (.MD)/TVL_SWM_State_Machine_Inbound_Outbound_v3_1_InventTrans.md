# THORESEN VINAMA (TVL) — SWM SYSTEM

## STATE MACHINE SPECIFICATION — Inbound & Outbound Module

### WITH INVENTTRANS MAPPING

**Version:** 3.1 | **Date:** 2026-03-04 | **Prepared by:** Smartlog Solution Team

**Based on:** Gap Analysis v3.0 + MasterData PRD Supplement v2.1 + **TVL To-Confirm Register v1.0 [ALL 18 TC CONFIRMED]**

---

## CHANGE LOG v3.0 → v3.1

| # | Thay đổi | TC liên quan | Impact |
|---|----------|-------------|--------|
| 1 | **BỎ PENDING_APPROVAL inbound.** Vượt tolerance → REJECTED (báo lỗi, không ghi nhận). Không dùng approval process. | TC-06 [TVL CONFIRMED] | State machine inbound thay đổi lớn |
| 2 | **Thêm RE-WEIGH flow.** REJECTED → AWAITING_WEIGHING (cân lại). Giữ receipt number. | TC-18 [TVL CONFIRMED] | Thêm state transition ngược + weighbridge_log mới |
| 3 | **Outbound weighing sequence = FLEXIBLE.** Keeper chọn tự do thứ tự cân lines, không bắt buộc sequence ASC. | TC-09 [TVL CONFIRMED] | Multi-trip loop UI + net calculation |
| 4 | **PUTAWAY tách riêng + auto-transition.** Giữ state PUTAWAY, auto-transition nếu location đã là STORAGE. | TC-14 [TVL CONFIRMED] | Chuyển từ assumption sang confirmed |
| 5 | **Cancel cho phép ở WEIGHED_IN / PROCESSING.** Bắt buộc reason_code + audit. | TC-13 [TVL CONFIRMED] | Mở rộng cancel states |
| 6 | Cập nhật Assumptions: chuyển các items đã confirmed, bổ sung decisions mới. | TC-01→18 | Section 10 restructured |

---

# 1. DOCUMENT OVERVIEW

Tài liệu này là bản cập nhật State Machine Specification v3.0, cập nhật theo **18 quyết định TVL đã chốt** (To-Confirm Register v1.0). Bổ sung InventTrans mapping cho mỗi trạng thái.

## 1.1 Nguyên tắc thiết kế InventTrans (từ D365 Reference)

- **Rule 1:** KHÔNG cập nhật OnHand trực tiếp từ chứng từ. Luôn thông qua InventTrans event.
- **Rule 2:** Mỗi WorkLine.complete PHẢI tạo 1 InventTrans. Không có ngoại lệ.
- **Rule 3:** external_id BẮT BUỘC check trước khi insert (idempotency).
- **[TVL CONFIRMED] Rule 4:** Posting points: **Inbound = RECEIVED state. Outbound = SHIPPED state.** Các state trung gian KHÔNG tạo InventTrans stage=PHYSICAL.
- **Rule 5:** KHÔNG BAO GIỜ xóa InventTrans. Reverse = tạo trans mới với qty ngược lại.

## 1.2 Quyết định TVL đã chốt ảnh hưởng State Machine

| TC | Quyết định | Ảnh hưởng |
|---|-----------|-----------|
| TC-06 | Vượt tolerance → **REJECT + báo lỗi**. BỎ approval process. | Inbound: bỏ PENDING_APPROVAL, thêm REJECTED |
| TC-09 | Outbound weighing sequence **FLEXIBLE** (Keeper chọn tự do) | Multi-trip loop: không ép thứ tự |
| TC-13 | **Cho phép cancel** ở WEIGHED_IN / PROCESSING | Mở rộng cancel states |
| TC-14 | PUTAWAY **tách riêng** + auto-transition nếu location=STORAGE | Giữ state, auto nếu bulk |
| TC-18 | Manager reject → **Re-weigh** (quay AWAITING_WEIGHING) | Thêm transition ngược |
| TC-01 | Tolerance **per owner+product**, default fallback | Config, không đổi state machine |
| TC-10 | Line fail → **cả shipment PENDING** (tập trung cuối) | Outbound PENDING_APPROVAL giữ nguyên |
| TC-11 | Bulk surplus → **BLOCK** mặc định, Manager override | Outbound blocking rule |
| TC-12 | Blocking hàng bao nhập **PO level** | Inbound blocking rule |

---

# 2. INBOUND MODULE — State Transition Table

**v3.1 THAY ĐỔI CHÍNH:** Bỏ PENDING_APPROVAL. Thêm REJECTED + RE-WEIGH flow.

| # | From | To | Trigger | Actor | Điều kiện | InventTrans |
|---|------|----|---------|-------|-----------|-------------|
| T1 | DRAFT | AWAITING_WEIGHING | Xe lên bàn cân | WB Operator | Receipt đã có đủ thông tin | Không |
| T2 | AWAITING_WEIGHING | WEIGHED_IN | Scale POST weigh-in API | Scale System | gross_weight > 0 | Không |
| T3 | WEIGHED_IN | PROCESSING | WH Keeper accept + bắt đầu xuống hàng | WH Keeper | Receipt lines tồn tại | Không |
| T4 | PROCESSING | WEIGHED_OUT | Scale POST weigh-out API | Scale System | tare_weight > 0 | Không |
| T5a | WEIGHED_OUT | **RECEIVED** | Auto-receive | System | **|variance_pct| ≤ tolerance_pct** | 🟢 POST PHYSICAL |
| **T5b** | **WEIGHED_OUT** | **REJECTED** | **Tolerance exceeded → báo lỗi** | **System** | **|variance_pct| > tolerance_pct** | **Không** |
| **T5c** | **REJECTED** | **AWAITING_WEIGHING** | **Re-weigh (xe cân lại)** | **WB Operator** | **attempt_number ≤ max_reweigh (default=3)** | **Không** |
| **T5d** | **REJECTED** | **CANCELLED** | **User hủy (không cân lại)** | **WH Manager / WB Operator** | **Chưa có inventory_txn** | **Không** |
| T6 | RECEIVED | PUTAWAY | Putaway task hoàn tất | WH Keeper | All lines putaway | 🔵 POST MOVE |
| T6' | RECEIVED | PUTAWAY | **Auto-transition** (bulk, location=STORAGE) | System | Location type = STORAGE | 🔵 POST MOVE (same loc) |
| T7 | PUTAWAY | CLOSED | All lines closed | System | Không còn pending | Không |
| T8a | DRAFT / AWAITING_WEIGHING | CANCELLED | User hủy | Varies | Chưa có inventory_txn | Không |
| **T8b** | **WEIGHED_IN / PROCESSING** | **CANCELLED** | **User hủy (sự cố)** | **WH Manager** | **reason_code bắt buộc** | **Không (chưa có inv_txn)** |
| T8c | REJECTED | CANCELLED | User hủy | Varies | Chưa có inventory_txn | Không |
| 🔴T9 | RECEIVED+ (edge case) | CANCELLED | Force cancel | WH Manager | Đã có inventory_txn → **REVERSAL bắt buộc** | POST REVERSAL (-qty) |

---

# 3. INBOUND MODULE — InventTrans Event Mapping

🟢 = POSTING POINT | 🔵 = MOVE | 🔴 = REVERSAL | 🚫 = REJECTED (không post)

| # | State | InventTrans Event | Stage | RefType | Qty | Status Transition | DimFrom | DimTo | OnHand Impact | Trigger / Notes |
|---|-------|-------------------|-------|---------|-----|-------------------|---------|-------|---------------|-----------------|
| 1 | DRAFT | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Chưa có hoạt động vật lý |
| 2 | AWAITING_WEIGHING | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Chờ cân. weighbridge_log tạo (attempt_number=1) |
| 3 | WEIGHED_IN | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Ghi weighbridge_log: gross_weight. Chưa biết net |
| 4 | PROCESSING | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | WH Keeper xuống hàng. Chưa posting point |
| 5 | WEIGHED_OUT | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Tính net, check variance. Phân nhánh: PASS/FAIL |
| 🟢6 | **RECEIVED** (variance ≤ tol) | **POST InventTrans: INBOUND RECEIPT** | **PHYSICAL** | ASN | **+net_weight_kg** | ORDERED → AVAILABLE | NULL (bên ngoài) | InventDim{wh, loc=RECEIVING, lot, owner} | **+Physical, +Available** | **[TVL CONFIRMED] Posting point Inbound.** Atomic transaction |
| 6' | RECEIVED | BILLING EVENT (đồng thời) | PHYSICAL | ASN | +net_weight_kg | -- | -- | -- | N/A (billing) | billing_transaction: INBOUND_HANDLING, INBOUND_WEIGHING |
| 🚫5b | **REJECTED** (variance > tol) | **Không tạo InventTrans** | -- | -- | -- | -- | -- | -- | **Không** | **[TC-06 CONFIRMED] Hệ thống REJECT, báo lỗi. KHÔNG ghi nhận tồn kho. Xe phải cân lại hoặc hủy.** |
| 5c | REJECTED → AWAITING_WEIGHING | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | **[TC-18 CONFIRMED] Re-weigh.** weighbridge_log mới (attempt_number++). Receipt number giữ nguyên. |
| 🔵7 | **PUTAWAY** | **POST InventTrans: MOVE (per line)** | **PHYSICAL** | MOVE | net_weight_kg | AVAILABLE → AVAILABLE | InventDim{loc=RECEIVING} | InventDim{loc=STORAGE} | -Physical@RECEIVING, +Physical@STORAGE | **[TC-14 CONFIRMED]** Tách riêng. Auto-transition nếu location=STORAGE. |
| 8 | CLOSED | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Lock. billing ⇒ READY_FOR_BILLING |
| 9a | CANCELLED (chưa inv_txn) | Không tạo InventTrans | CANCELLED | -- | -- | -- | -- | -- | Không | Từ DRAFT/AWAITING/WEIGHED_IN/PROCESSING/REJECTED |
| 🔴9b | CANCELLED (đã inv_txn) | **POST REVERSAL** | CANCELLED | ASN | -net_weight_kg | AVAILABLE → CANCELLED | InventDim{loc} | NULL | -Physical, -Available | Edge case. is_reversed=true |

---

# 4. INBOUND — TOLERANCE CHECK FLOW (v3.1 — BỎ APPROVAL)

**[TC-06 TVL CONFIRMED]:** Vượt tolerance → REJECTED (báo lỗi, không ghi nhận). KHÔNG dùng approval process.

```
WEIGHED_OUT
    │
    ├── |variance_pct| ≤ tolerance_pct ──→ RECEIVED (auto) ──→ POST InventTrans (+net_weight_kg)
    │
    └── |variance_pct| > tolerance_pct ──→ REJECTED (báo lỗi, KHÔNG ghi nhận)
                                               │
                                               ├── Re-weigh (attempt ≤ 3) ──→ AWAITING_WEIGHING (cân lại)
                                               │                                    │
                                               │                                    └── ... lặp lại flow cân ...
                                               │
                                               └── Hủy ──→ CANCELLED
```

**Chi tiết state REJECTED:**

| Thuộc tính | Mô tả |
|-----------|-------|
| **Ý nghĩa** | Variance vượt tolerance — hệ thống TỪ CHỐI, KHÔNG ghi nhận tồn kho |
| **Trigger vào** | |variance_pct| > tolerance_pct (config per owner+product [TC-01 CONFIRMED]) |
| **Hành vi hệ thống** | (1) receipt.status ⇒ REJECTED. (2) Hiển thị lỗi: "Variance X.X% vượt tolerance Y.Y%. Vui lòng cân lại." (3) Inventory KHÔNG cộng. (4) weighbridge_log giữ nguyên cho audit. (5) Barrier mở — xe rời bàn cân |
| **Actions tiếp theo** | (A) **Re-weigh**: WB Operator chọn "Cân lại" → receipt quay AWAITING_WEIGHING, attempt_number++. (B) **Hủy**: User chọn "Hủy receipt" → CANCELLED |
| **Giới hạn** | max_reweigh_attempts = 3 (configurable). Sau 3 lần → chỉ có thể CANCELLED (cần WH Manager) |
| **Audit log** | action=TOLERANCE_REJECTED, variance_pct, tolerance_pct, attempt_number |

**So sánh v3.0 vs v3.1:**

| | v3.0 (cũ) | v3.1 (mới — TVL confirmed) |
|---|-----------|---------------------------|
| Vượt tolerance | → PENDING_APPROVAL (chờ Manager) | → **REJECTED** (báo lỗi, không chờ) |
| Manager approve | Có — Manager approve + reason_code → RECEIVED | **BỎ** — không có approval process |
| Tồn kho | Treo (chưa cộng) chờ approve | **Không ghi nhận** cho đến khi cân lại PASS |
| Xe | Cho đi, chờ approve offline | Cho đi, quay lại cân lại nếu cần |
| Re-weigh | Không có (chỉ cancel) | **CÓ** — REJECTED → AWAITING_WEIGHING [TC-18] |

---

# 5. INBOUND — Ví Dụ End-to-End

## 5.1 Scenario A: Happy Path (trong tolerance)

**PO-001 nhập 30,000 kg CaCO3 xá. Variance = +1.0% < tolerance 2%.**

| Step | State Transition | InventTrans Event | Stage | Qty (kg) | Status | DimFrom | DimTo | Notes |
|------|------------------|-------------------|-------|----------|--------|---------|-------|-------|
| 1 | → DRAFT | -- | -- | -- | -- | -- | -- | RCV-20260315-001 tạo, PO-001, 30T CaCO3 |
| 2 | → AWAITING_WEIGHING | -- | -- | -- | -- | -- | -- | Xe lên bàn cân. weighbridge_log #1 |
| 3 | → WEIGHED_IN | -- | -- | -- | -- | -- | -- | Gross = 48,500 kg |
| 4 | → PROCESSING | -- | -- | -- | -- | -- | -- | WH Keeper scan location, confirm lines |
| 5 | → WEIGHED_OUT | -- | -- | -- | -- | -- | -- | Tare = 18,200. Net = 30,300. Var = +1.0%. Tol = 2% ⇒ **PASS** |
| 🟢6 | **→ RECEIVED** | **TRX-20260315-001 INBOUND** | **PHYSICAL** | **+30,300** | ORDERED→AVAILABLE | NULL | WH01-A-01 | **★ POSTING POINT ★** |
| 🔵7 | → PUTAWAY | TRX-20260315-002 MOVE | PHYSICAL | 30,300 | AVAIL→AVAIL | WH01-A-01 | WH01-B-03 | RECEIVING → STORAGE |
| 8 | → CLOSED | -- | -- | -- | -- | -- | -- | Lock. billing ⇒ READY |

## 5.2 Scenario B: REJECTED + Re-weigh (vượt tolerance)

**PO-002 nhập 30,000 kg Clinker. Lần 1 vượt tolerance → REJECTED → cân lại lần 2 PASS.**

| Step | State Transition | InventTrans Event | Stage | Qty (kg) | Status | DimFrom | DimTo | Notes |
|------|------------------|-------------------|-------|----------|--------|---------|-------|-------|
| 1 | → DRAFT | -- | -- | -- | -- | -- | -- | RCV-20260315-002 tạo, PO-002, 30T Clinker |
| 2 | → AWAITING_WEIGHING | -- | -- | -- | -- | -- | -- | Xe lên bàn cân. weighbridge_log attempt=1 |
| 3 | → WEIGHED_IN | -- | -- | -- | -- | -- | -- | Gross = 50,000 kg |
| 4 | → PROCESSING | -- | -- | -- | -- | -- | -- | WH Keeper xuống hàng |
| 5 | → WEIGHED_OUT | -- | -- | -- | -- | -- | -- | Tare = 18,200. Net = 31,800. Var = **+6.0%**. Tol = 2% ⇒ **FAIL** |
| 🚫5b | **→ REJECTED** | **Không tạo InventTrans** | -- | -- | -- | -- | -- | **Hệ thống báo lỗi. KHÔNG ghi nhận tồn kho.** Receipt number giữ nguyên. |
| 5c | **→ AWAITING_WEIGHING** | -- | -- | -- | -- | -- | -- | **Re-weigh.** weighbridge_log attempt=2. Xe quay lại bàn cân. |
| 3' | → WEIGHED_IN (lần 2) | -- | -- | -- | -- | -- | -- | Gross = 48,600 kg (xe đã bỏ bớt hàng) |
| 4' | → PROCESSING | -- | -- | -- | -- | -- | -- | WH Keeper xác nhận lại |
| 5' | → WEIGHED_OUT (lần 2) | -- | -- | -- | -- | -- | -- | Tare = 18,200. Net = 30,400. Var = +1.3%. Tol = 2% ⇒ **PASS** |
| 🟢6 | **→ RECEIVED** | **TRX-20260315-003 INBOUND** | **PHYSICAL** | **+30,400** | ORDERED→AVAILABLE | NULL | WH01-C-02 | **★ POSTING POINT ★** Attempt 2 PASS |
| 🔵7 | → PUTAWAY | TRX-20260315-004 MOVE | PHYSICAL | 30,400 | AVAIL→AVAIL | WH01-C-02 | WH01-D-01 | RECEIVING → STORAGE |
| 8 | → CLOSED | -- | -- | -- | -- | -- | -- | Lock. billing ⇒ READY |

## 5.3 Scenario C: REJECTED 3 lần → CANCELLED

| Step | State | Notes |
|------|-------|-------|
| 1-5 | DRAFT → ... → WEIGHED_OUT | Attempt 1: Var = +8% > Tol 2% → FAIL |
| 5b | → REJECTED | attempt=1. Báo lỗi. |
| 5c | → AWAITING_WEIGHING | Re-weigh attempt=2 |
| ... | → WEIGHED_OUT | Attempt 2: Var = +5% > Tol 2% → FAIL |
| 5b | → REJECTED | attempt=2. Báo lỗi. |
| 5c | → AWAITING_WEIGHING | Re-weigh attempt=3 |
| ... | → WEIGHED_OUT | Attempt 3: Var = +4% > Tol 2% → FAIL |
| 5b | → REJECTED | attempt=3. **Đạt max_reweigh_attempts.** UI chỉ hiển thị "Hủy", không cho cân lại. |
| 5d | → CANCELLED | WH Manager hủy receipt. Reason_code bắt buộc. |

---

# 6. OUTBOUND MODULE — State Transition Table

**v3.1 THAY ĐỔI:** Weighing sequence flexible [TC-09]. Cả shipment PENDING nếu line fail [TC-10]. BLOCK surplus [TC-11].

| # | From | To | Trigger | Actor | Điều kiện | InventTrans |
|---|------|----|---------|-------|-----------|-------------|
| T1 | DRAFT | CONFIRMED | User confirm | WH Planner | Shipment có lines | EXPECTED (optional) |
| T2 | CONFIRMED | ALLOCATED | System allocate (FIFO) / Manual | System / User | Available ≥ requested | 🟡 REGISTERED |
| T2' | ALLOCATED | CONFIRMED | Unallocate | User | -- | REVERSE allocation |
| T3 | ALLOCATED | PICKING | Pick task tạo | System | -- | Status update |
| T4 | PICKING | PICKED | All pick tasks done | WH Keeper | -- | Không |
| T4' | PICKED | ALLOCATED | Unpick | User | -- | REVERSE pick status |
| T5 | PICKED | WEIGHING_TARE | Xe lên bàn cân lần 1 | WB Operator | -- | Không |
| T6 | WEIGHING_TARE | LOADING | Tare done, bắt đầu load | WH Keeper | tare_weight > 0 | Không |
| T7 | LOADING | WEIGHING_GROSS_N | Xe lên cân sau khi load line N | WB Operator | **Keeper chọn line bất kỳ chưa cân [TC-09]** | Không |
| T8 | WEIGHING_GROSS_N | LINE_SHIPPED | Net line OK | System | net_line > 0 | Không (chưa post) |
| T8' | WEIGHING_GROSS_N | LINE_SHIPPED | Net line OK nhưng **tolerance FAIL** | System | |var| > tolerance → **flag line** | Không |
| T9 | LINE_SHIPPED | LOADING | Còn lines chưa cân | System | uncompleted_lines > 0 | Không |
| T10 | LINE_SHIPPED (last) | ALL_WEIGHED | Tất cả lines đã cân | System | uncompleted_lines = 0 | Không |
| T11a | ALL_WEIGHED | **SHIPPED** | Tất cả lines PASS tolerance | System | Không có flagged lines | 🟢 POST PHYSICAL |
| **T11b** | **ALL_WEIGHED** | **PENDING_APPROVAL** | **≥1 line FAIL tolerance** | **System** | **[TC-10 CONFIRMED] Cả shipment PENDING** | **Không** |
| T12a | PENDING_APPROVAL | SHIPPED | Manager approve | WH Manager | reason_code bắt buộc | 🟢 POST PHYSICAL |
| T12b | PENDING_APPROVAL | CANCELLED | Manager reject | WH Manager | reason_code bắt buộc | REVERSE alloc |
| T13 | SHIPPED | CLOSED | Auto-close | System | -- | Không |
| T14 | DRAFT/CONFIRMED/ALLOCATED/PICKING/PICKED | CANCELLED | User hủy | Varies | Release allocation nếu có | REVERSE nếu có |

**Lưu ý outbound vẫn giữ PENDING_APPROVAL** (khác với inbound đã bỏ). Lý do: outbound PENDING áp dụng cho cả shipment sau khi cân xong tất cả lines — Manager review tập trung 1 lần. Inbound bỏ vì TVL muốn reject ngay + cân lại.

---

# 7. OUTBOUND MODULE — InventTrans Event Mapping

🟢 = POSTING POINT | 🟡 = ALLOCATION | 🔴 = REVERSAL

**[TC-09 TVL CONFIRMED]:** Trong vòng lặp cân, **Keeper chọn tự do thứ tự lines**. Hệ thống KHÔNG bắt buộc line_sequence ASC.

| # | State | InventTrans Event | Stage | RefType | Qty | Status Transition | DimFrom | DimTo | OnHand Impact | Trigger / Notes |
|---|-------|-------------------|-------|---------|-----|-------------------|---------|-------|---------------|-----------------|
| 1 | DRAFT | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Shipment chưa xác nhận |
| 2 | CONFIRMED | InventTrans EXPECTED (optional) | EXPECTED | SHIPMENT | -expected_qty_kg | -- → ORDERED | -- | -- | +Ordered | Ghi nhận demand. KHÔNG ảnh hưởng Physical/Available |
| 🟡3 | **ALLOCATED** | **UPDATE InventTrans stage** | **REGISTERED** | SHIPMENT | -allocated_qty_kg | **AVAILABLE → RESERVED** | InventDim{loc, lot, owner} | NULL | **-Available, +Reserved** | FIFO allocation. on_hand không đổi |
| 3' | UNALLOCATE (reverse) | REVERSE allocation InventTrans | REGISTERED | SHIPMENT | +allocated_qty (reverse) | RESERVED → AVAILABLE | InventDim{loc, lot} | -- | +Available (restore) | Giải phóng reservation |
| 4 | PICKING | UPDATE InventTrans status | REGISTERED | SHIPMENT | -- | RESERVED → PICKED | InventDim{storage} | InventDim{staging} | Không thay đổi Physical | Status tracking only |
| 5 | PICKED | Không tạo InventTrans mới | -- | -- | -- | -- | -- | -- | Không | Pick tasks done. Chờ cân |
| 6 | WEIGHING_TARE | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Ghi weighbridge_log baseline tare |
| 7 | LOADING / WEIGHING_GROSS_N / LINE_SHIPPED | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | **[TC-09] Keeper chọn tự do line.** weighbridge_trip_log per line. CHƯA post InventTrans |
| 7' | ALL_WEIGHED | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Check: nếu có line flagged → PENDING_APPROVAL [TC-10] |
| 7'' | PENDING_APPROVAL | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | **[TC-10 CONFIRMED] Cả shipment PENDING** khi ≥1 line fail tolerance |
| 🟢8 | **SHIPPED (per line)** | **POST InventTrans: OUTBOUND ISSUE** | **PHYSICAL** | SHIPMENT | **-shipped_qty_kg (per line)** | **PICKED → DEDUCTED** | InventDim{wh, loc, lot, owner} | NULL (ra khỏi kho) | **-Physical, -Reserved** | **[TVL CONFIRMED] Posting point Outbound.** 1 InventTrans per shipment_line |
| 8' | SHIPPED (billing) | BILLING EVENT (đồng thời) | PHYSICAL | SHIPMENT | -shipped_qty_kg | -- | -- | -- | N/A (billing) | billing_transaction: OUTBOUND_LOADING, OUTBOUND_WEIGHING |
| 8'' | SHIPPED (hàng bao dual) | POST InventTrans: BAGGED DUAL | PHYSICAL | SHIPMENT | -net_weight_kg (cân thực tế) | PICKED → DEDUCTED | InventDim{...} | NULL | Tồn kho trừ KG thực cân | **CRITICAL:** qty = net_weight (KHÔNG phải bag_count × bag_weight). Variance ghi log |
| 9 | CLOSED | Không tạo InventTrans | -- | -- | -- | -- | -- | -- | Không | Lock. Immutable |
| 🔴10 | CANCELLED (có allocation) | REVERSE alloc + pick InventTrans | CANCELLED | SHIPMENT | +reversed_qty | RESERVED/PICKED → AVAILABLE | -- | -- | +Available (restore) | Release tất cả. Nếu đã ship lines → reversal per line |

---

# 8. OUTBOUND — MULTI-TRIP WEIGHING LOOP (v3.1 — FLEXIBLE SEQUENCE)

**[TC-09 TVL CONFIRMED]:** Keeper chọn tự do thứ tự cân lines. Hệ thống KHÔNG ép line_sequence ASC.

```
WEIGHING_TARE (xe rỗng — Tare)
    │
    └──→ LOADING (load hàng lên xe)
              │
              ├── Keeper chọn line bất kỳ chưa cân ──→ WEIGHING_GROSS_N
              │                                              │
              │                                              ├── net_line = gross_N - gross_(N-1) ✓
              │                                              │
              │                                              └── LINE_SHIPPED (ghi weighbridge_trip_log)
              │                                                       │
              │                                                       ├── Còn lines ──→ quay lại LOADING
              │                                                       │
              │                                                       └── Hết lines ──→ ALL_WEIGHED
              │
              └── ALL_WEIGHED
                       │
                       ├── Tất cả PASS tolerance ──→ SHIPPED (post InventTrans per line)
                       │
                       └── ≥1 line FAIL ──→ PENDING_APPROVAL [TC-10: cả shipment]
                                                 │
                                                 ├── Manager approve ──→ SHIPPED
                                                 └── Manager reject ──→ CANCELLED
```

**Flexible sequence — Net calculation:**

Công thức `net_line = gross_N - gross_(N-1)` **KHÔNG phụ thuộc thứ tự line** vì đây là incremental weight:

| Trip | Keeper chọn line | gross_before_load | gross_after_load | net_line |
|------|-----------------|-------------------|------------------|----------|
| 1 | CaO (line 2) | 15,000 (=tare) | 40,000 | 25,000 kg |
| 2 | Dolomite (line 3) | 40,000 | 60,000 | 20,000 kg |
| 3 | CaCO3 (line 1) | 60,000 | 90,000 | 30,000 kg |

Thứ tự load: 2→3→1 (Keeper chọn tự do). Net calculation vẫn chính xác. Mỗi trip, Keeper chọn `shipment_line_id` để gắn vào `weighbridge_trip_log`.

**Blocking rules trong loop:**

| Rule | Mô tả | TC |
|------|-------|----|
| **Bulk SO blocking** | SUM(shipped_qty under SO) + current_net ≤ SO.expected_qty_kg. Check mỗi trip. Nếu vượt → **BLOCK trip** [TC-11 CONFIRMED] | TC-11 |
| **Bagged tolerance** | tolerance_kg = 2 × bag_shell_weight_kg × bag_count. Check per line. shell_weight = **fixed value product master** [TC-08 CONFIRMED] | TC-08 |
| **Line fail** | Flag line, tiếp tục cân. **Cả shipment PENDING cuối** [TC-10 CONFIRMED] | TC-10 |

---

# 9. OUTBOUND — Ví Dụ End-to-End (Multi-Trip 3 Lines — Flexible)

**Scenario:** SO-001 xuất 3 mã hàng (CaCO3 30T, CaO 25T, Dolomite 20T). **Keeper chọn cân CaO trước.**

| Step | State Transition | InventTrans Event | Stage | Qty (kg) | Status | DimFrom | DimTo | Notes |
|------|------------------|-------------------|-------|----------|--------|---------|-------|-------|
| 1 | → DRAFT | -- | -- | -- | -- | -- | -- | SHP-20260315-001, SO-001, 3 lines |
| 2 | → CONFIRMED | TRX (EXPECTED) | EXPECTED | -75,000 | →ORDERED | -- | -- | Ghi nhận demand |
| 🟡3 | → ALLOCATED | TRX (REGISTER) | REGISTERED | -75,000 | AVAIL→RESERVED | WH01-B-* | NULL | FIFO allocate |
| 4 | → PICKING → PICKED | Status update | REGISTERED | -- | RESERVED→PICKED | STORAGE | STAGING | WH Keeper lấy hàng |
| 5 | → WEIGHING_TARE | -- | -- | -- | -- | -- | -- | Tare = 15,000 kg |
| 6a | Loop: LOADING | -- | -- | -- | -- | -- | -- | **Keeper chọn CaO (line 2)** — load lên xe |
| 6b | → WEIGHING_GROSS_1 | -- | -- | -- | -- | -- | -- | Gross = 40,000. Net_CaO = 40,000 - 15,000 = **25,000 kg** ✓ |
| 6c | → LINE_SHIPPED (L2) | -- | -- | -- | -- | -- | -- | CaO done. weighbridge_trip_log ghi |
| 6d | → LOADING | -- | -- | -- | -- | -- | -- | **Keeper chọn Dolomite (line 3)** |
| 6e | → WEIGHING_GROSS_2 | -- | -- | -- | -- | -- | -- | Gross = 60,000. Net_Dolomite = 60,000 - 40,000 = **20,000 kg** ✓ |
| 6f | → LINE_SHIPPED (L3) | -- | -- | -- | -- | -- | -- | Dolomite done |
| 6g | → LOADING | -- | -- | -- | -- | -- | -- | **Keeper chọn CaCO3 (line 1)** |
| 6h | → WEIGHING_GROSS_3 | -- | -- | -- | -- | -- | -- | Gross = 90,000. Net_CaCO3 = 90,000 - 60,000 = **30,000 kg** ✓ |
| 6i | → ALL_WEIGHED | -- | -- | -- | -- | -- | -- | 3/3 lines done. All PASS tolerance. Total = 75T ✓ |
| 🟢7a | **→ SHIPPED (L2 CaO)** | **TRX-001 ISSUE** | **PHYSICAL** | **-25,000** | PICKED→DEDUCTED | WH01-B-05 | NULL | **★ POSTING POINT ★** |
| 🟢7b | → SHIPPED (L3 Dolomite) | TRX-002 ISSUE | PHYSICAL | -20,000 | PICKED→DEDUCTED | WH01-C-01 | NULL | 1 InventTrans per line |
| 🟢7c | → SHIPPED (L1 CaCO3) | TRX-003 ISSUE | PHYSICAL | -30,000 | PICKED→DEDUCTED | WH01-B-03 | NULL | Total = 75T cross-check ✓ |
| 8 | → CLOSED | -- | -- | -- | -- | -- | -- | Lock. billing ⇒ READY |

---

# 10. ONHAND IMPACT SUMMARY

| OnHand Field | IB: RECEIVED | IB: REJECTED | OB: CONFIRMED | OB: ALLOCATED | OB: SHIPPED | Reconciliation Rule |
|-------------|-------------|-------------|--------------|--------------|------------|---------------------|
| **physical_qty** | +net_weight_kg | **Không đổi** | Không đổi | Không đổi | -shipped_qty_kg | physical = SUM(invent_trans WHERE stage=PHYSICAL) |
| **available_qty** | +net_weight_kg | **Không đổi** | Không đổi | -allocated_qty_kg | Không đổi (đã giảm khi allocate) | available = physical - reserved - blocked |
| **reserved_qty** | Không đổi | **Không đổi** | Không đổi | +allocated_qty_kg | -shipped_qty_kg | reserved = SUM(allocation.qty WHERE status=ACTIVE) |
| **ordered_qty** | Không đổi | **Không đổi** | +expected_qty_kg | Không đổi | Không đổi | ordered = SUM(invent_trans WHERE stage=EXPECTED) |

**IB: REJECTED = zero impact.** Hệ thống không ghi nhận bất kỳ thay đổi tồn kho nào. Chỉ tạo audit log + weighbridge_log.

---

# 11. INVENTTRANS SCHEMA QUICK REFERENCE

Trích từ MasterData PRD Supplement v2.1 [TVL Confirmed].

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK | Khóa chính tự động |
| trans_id | VARCHAR(30) | UNIQUE | TRX-YYYYMMDD-SEQ |
| posted_at | TIMESTAMPTZ | NOT NULL | Thời điểm post. Immutable |
| ref_type | ENUM | NOT NULL | PO, ASN, SO, SHIPMENT, TRANSFER, ADJUSTMENT, CYCLE_COUNT, STATUS_CHANGE, MOVE |
| ref_id | VARCHAR(30) | NOT NULL | Mã chứng từ gốc (Header ID) |
| ref_line_id | VARCHAR(30) | NULLABLE | Mã dòng chứng từ (Line ID) — [TVL CONFIRMED: per line] |
| external_id | VARCHAR(50) | NULLABLE | Idempotency check |
| item_id | VARCHAR(50) | FK → item | 1 InventTrans = 1 SKU |
| qty | DECIMAL(15,3) | NOT NULL | DƯƠNG = nhận vào. ÂM = xuất ra |
| uom | VARCHAR(10) | DEFAULT 'KG' | Đơn vị tính |
| dim_from_id | UUID | FK → invent_dim | Dimension xuất. NULL cho receipt |
| dim_to_id | UUID | FK → invent_dim | Dimension nhập. NULL cho issue |
| status_from | ENUM | NULLABLE | ORDERED/REGISTERED/AVAILABLE/RESERVED/PICKED/DAMAGED/BLOCKED/IN_TRANSIT |
| status_to | ENUM | NOT NULL | Trạng thái sau |
| stage | ENUM | NOT NULL | EXPECTED/REGISTERED/PHYSICAL/DEDUCTED/CANCELLED |
| reason_code | VARCHAR(20) | NULLABLE | BẮT BUỘC cho ADJUSTMENT, STATUS_CHANGE |
| owner_id | VARCHAR(20) | FK → owner | Chủ hàng (3PL requirement) |
| weighbridge_ticket_id | VARCHAR(30) | NULLABLE | Link phiếu cân (TVL bulk cargo) |
| is_reversed | BOOLEAN | DEFAULT FALSE | Reverse = tạo trans mới |
| reversed_by_trans_id | VARCHAR(30) | NULLABLE | Link 2 chiều với trans reverse |

---

# 12. INVENTTRANS STAGE LIFECYCLE

## 12.1 Inbound Receipt (v3.1 — có REJECTED)

```
                                                    ┌── REJECTED (variance > tol)
                                                    │       │
                                                    │       ├── Re-weigh → AWAITING_WEIGHING (loop)
                                                    │       └── Cancel → CANCELLED
EXPECTED (PO, optional) → REGISTERED (ASN, optional) → PHYSICAL (RECEIVED state) → [CANCELLED nếu hủy]
```

*TVL Go-Live: skip EXPECTED/REGISTERED. Post thẳng PHYSICAL tại RECEIVED. REJECTED nếu vượt tolerance.*

## 12.2 Outbound Shipment

```
EXPECTED (SO/Shipment Confirm) → REGISTERED (Allocate) → PHYSICAL (SHIPPED state) → DEDUCTED (final) → [CANCELLED nếu hủy]
                                                                                          ↑
                                                                               PENDING_APPROVAL (nếu line fail tol)
```

*REGISTERED stage = FIFO allocation. PHYSICAL = point of no return. PENDING_APPROVAL cho cả shipment [TC-10].*

## 12.3 Stage vs OnHand Mapping

| Stage | Ý nghĩa | Ảnh hưởng OnHand | Inbound | Outbound |
|-------|---------|-------------------|---------|----------|
| EXPECTED | Dự kiến (demand/supply) | ordered_qty only | PO Confirm (optional P1) | SO/Shipment Confirm |
| REGISTERED | Đã đăng ký (reservation) | reserved_qty / registered_qty | ASN Register (optional) | Allocate (FIFO) |
| **PHYSICAL** | **Đã thực hiện vật lý** | **physical_qty + available_qty** | **RECEIVED state ★** | **SHIPPED state ★** |
| DEDUCTED | Đã trừ cuối cùng (outbound) | N/A (đã trừ ở PHYSICAL) | N/A | Final stage sau SHIPPED |
| CANCELLED | Đã hủy / reversal | Reverse tương ứng | Cancel + reversal | Cancel + release alloc |

---

# 13. CRITICAL BUSINESS RULES CHO INVENTTRANS

## BR-IT-001: Inbound Posting = Net Weight từ Cân

InventTrans.qty = net_weight_kg (gross - tare), KHÔNG phải expected_qty_kg từ PO. Bulk cargo luôn có variance. Cân thực tế là source of truth.

## BR-IT-002: Inbound Tolerance = REJECT (không approval)

**[TC-06 TVL CONFIRMED]** |variance_pct| > tolerance_pct → REJECTED. Hệ thống báo lỗi, KHÔNG ghi nhận tồn kho. Không có approval process. Tolerance config per owner+product [TC-01].

## BR-IT-003: Re-weigh Flow

**[TC-18 TVL CONFIRMED]** REJECTED → AWAITING_WEIGHING (cân lại). Receipt number giữ nguyên. weighbridge_log tạo mới (attempt_number++). Max 3 lần (configurable). Sau max → chỉ CANCELLED.

## BR-IT-004: Outbound Posting = Net Weight per Line từ Multi-Trip

Mỗi shipment_line tạo 1 InventTrans riêng. qty = shipped_qty_kg = net_line = gross_N - gross_(N-1). **Keeper chọn tự do thứ tự lines [TC-09].** Net calculation vẫn đúng (incremental weight).

## BR-IT-005: Hàng Bao Dual Tracking

InventTrans.qty luôn bằng KG (cân thực tế). Báo cáo theo bao (bag_count) là VIEW/REPORT layer. Variance = net_weight - (bag_count × bag_weight) ghi vào notes. bag_shell_weight = fixed product master [TC-08].

## BR-IT-006: Reversal thay vì Delete

KHÔNG BAO GIỜ xóa InventTrans. Hủy = tạo trans mới qty ngược, set is_reversed=true, link reversed_by_trans_id.

## BR-IT-007: Idempotency via external_id

Mỗi API call tạo InventTrans PHẢI kèm external_id. Trùng ⇒ return trans_id cũ.

## BR-IT-008: Weighbridge Ticket Link

Mỗi InventTrans tại posting point PHẢI có weighbridge_ticket_id. Audit trail bắt buộc cho bulk cargo.

## BR-IT-009: Cancel ở WEIGHED_IN / PROCESSING

**[TC-13 TVL CONFIRMED]** Cho phép cancel ở WEIGHED_IN và PROCESSING. Bắt buộc reason_code + audit log. Chưa có inventory_txn nên không cần reversal.

## BR-IT-010: PUTAWAY tách riêng + Auto-transition

**[TC-14 TVL CONFIRMED]** Giữ state PUTAWAY. Nếu WH Keeper scan location có type=STORAGE → auto-transition RECEIVED→PUTAWAY. Keeper không cần thao tác thêm cho bulk cargo.

---

# 14. SO SÁNH INBOUND vs OUTBOUND (v3.1 Updated)

| Tiêu chí | Inbound Receipt | Outbound Shipment |
|----------|----------------|-------------------|
| Số trạng thái | 10 (thêm REJECTED) | 12+ (có multi-trip loop) |
| Parent document | Purchase Order (PO) | Sale Order (SO) |
| Thứ tự cân | Gross (xe có hàng) → Tare (xe rỗng) | Tare (xe rỗng) → Gross (từng mã hàng) |
| Số lần cân | 2 lần (1 Gross + 1 Tare) | 1 + N lần (1 Tare + N Gross) |
| **Thứ tự line cân** | N/A (1 line/receipt) | **Keeper chọn tự do [TC-09]** |
| Có Allocation? | Không | Có (FIFO + Manual) |
| Có Picking? | Không | Có (pick tasks) |
| **Vượt tolerance** | **REJECTED — báo lỗi, không ghi nhận [TC-06]** | PENDING_APPROVAL — cả shipment [TC-10] |
| **Re-weigh** | **CÓ — REJECTED → AWAITING [TC-18]** | KHÔNG — Manager approve/reject |
| **Approval process** | **KHÔNG [TC-06]** | CÓ (WH Manager) |
| Inventory impact | +qty (tạo tồn kho) | -qty (trừ tồn kho) |
| Point of no return | RECEIVED | SHIPPED |
| **Cancel WEIGHED_IN/PROCESSING** | **CÓ [TC-13]** | N/A |
| Blocking Bulk | Không chặn | Chặn tổng SO [TC-11: BLOCK] |
| Blocking Bagged | Chặn tổng PO [TC-12: PO level] | Chặn từng xe (dung sai vỏ bao) |
| Dual tracking? | Không | Có (tồn kho KG, báo cáo bao) |

---

# 15. CONFIRMED DECISIONS & ASSUMPTIONS (v3.1)

## 15.1 TVL Confirmed Decisions (từ To-Confirm Register)

| TC | Quyết định | Status |
|---|-----------|--------|
| TC-01 | Tolerance per owner+product, default fallback | ✅ CONFIRMED |
| TC-06 | Vượt tolerance → REJECT + báo lỗi. BỎ approval process | ✅ CONFIRMED |
| TC-08 | Bag shell weight = fixed value product master | ✅ CONFIRMED |
| TC-09 | Outbound weighing sequence = Keeper chọn tự do | ✅ CONFIRMED |
| TC-10 | Line fail → cả shipment PENDING_APPROVAL (tập trung cuối) | ✅ CONFIRMED |
| TC-11 | Bulk surplus → BLOCK mặc định. Manager override | ✅ CONFIRMED |
| TC-12 | Blocking hàng bao nhập = PO level | ✅ CONFIRMED |
| TC-13 | Cho phép cancel ở WEIGHED_IN / PROCESSING | ✅ CONFIRMED |
| TC-14 | PUTAWAY tách riêng + auto-transition nếu location=STORAGE | ✅ CONFIRMED |
| TC-18 | Manager reject inbound → Re-weigh (quay AWAITING_WEIGHING) | ✅ CONFIRMED |

## 15.2 InventTrans-specific Assumptions (giữ từ v3.0)

| # | Assumption | Status |
|---|-----------|--------|
| A-IT-1 | Inbound EXPECTED stage skip cho Go-Live Phase 1 | Giả định — đề xuất skip |
| A-IT-2 | Outbound EXPECTED tạo InventTrans để track ordered_qty, nhưng blocking dùng SO.expected_qty trực tiếp | Giả định |
| A-IT-3 | PICKING chỉ update status (RESERVED→PICKED), không tạo trans mới | Giả định |
| A-IT-4 | Multi-trip loop KHÔNG tạo InventTrans. Chỉ weighbridge_trip_log | Giả định |
| A-IT-5 | PUTAWAY tạo InventTrans MOVE. **Tách riêng + auto-transition** [TC-14 CONFIRMED] | ✅ CONFIRMED |

## 15.3 To Confirm còn lại (InventTrans specific)

| # | Câu hỏi | Priority |
|---|---------|----------|
| Q-IT-1 | Outbound EXPECTED InventTrans: cần tạo khi confirm SO? Hay chỉ document tracking? | MEDIUM |
| Q-IT-2 | PICKING InventTrans: ghi riêng hay chỉ WorkLine level? | MEDIUM |
| Q-IT-3 | Reconciliation frequency: Daily auto hay on-demand? | LOW |
| Q-IT-4 | InventTrans partitioning: partition theo posted_at monthly? Volume dự kiến? | LOW |

---

*END OF DOCUMENT — Version 3.1*

*Change from v3.0: Applied 18 TVL Confirmed decisions. Major changes: Removed PENDING_APPROVAL inbound (TC-06), Added REJECTED + Re-weigh flow (TC-06/TC-18), Flexible outbound weighing sequence (TC-09).*
