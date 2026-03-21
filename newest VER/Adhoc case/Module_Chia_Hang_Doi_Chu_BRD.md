# Module Chia Hàng (Đổi Chủ) — Mô Tả Nghiệp Vụ

> **Phiên bản:** 1.0
> **Ngày tạo:** 2026-03-20
> **Tác giả:** Squad 2 — Smartlog
> **Trạng thái:** Draft

---

## 1. Bối cảnh nghiệp vụ (Business Context)

Trong vận hành logistics đường thuỷ và đường bộ, tồn tại tình huống phổ biến: **một đơn vị được uỷ quyền đứng ra nhận hàng từ phương tiện vận tải (tàu, xe) cho nhiều chủ hàng khác nhau**. Tại thời điểm nhập kho, toàn bộ hàng hoá được ghi nhận dưới tên một chủ hàng đại diện (chủ hàng uỷ quyền). Sau khi hoàn tất nhận hàng và cân thực tế, mới tiến hành **chia lại hàng hoá cho các chủ hàng thực tế** theo tỉ lệ phân bổ đã thoả thuận.

**Khách hàng áp dụng:** TVL (Thoresen Vận Tải & Logistics)

**Ví dụ thực tế:**

- Tàu VINACHEMS chở hàng mã A cho 3 chủ hàng khác nhau.
- TVL được uỷ quyền đứng ra nhận toàn bộ hàng từ tàu.
- PO được tạo với chủ hàng = TVL, mã hàng A, số lượng dự kiến = **50 tấn**.
- Qua nhiều lần nhập kho, tổng cân thực tế tại TVL = **49 tấn** (hao hụt tự nhiên trong vận chuyển).
- Sau nhận hàng, cần chia lại cho: Chủ hàng A (25 tấn), Chủ hàng B (15 tấn), Chủ hàng C (10 tấn).

---

## 2. Mục tiêu module

- Cho phép user thực hiện **chia hàng (đổi chủ)** từ một PO đã nhận hàng sang nhiều chủ hàng thực tế.
- Tự động **tính tỉ lệ phân bổ** dựa trên số lượng kế hoạch của từng chủ hàng.
- Tự động **phân bổ lại số lượng thực tế** dựa trên tỉ lệ đã tính, đảm bảo tổng phân bổ = tổng cân thực tế.
- **Cập nhật tồn kho** chính xác theo từng chủ hàng sau khi chia.
- Đảm bảo **truy vết (traceability)** toàn bộ quá trình chia hàng.

---

## 3. Phạm vi áp dụng

| Tiêu chí | Mô tả |
|---|---|
| Loại PO áp dụng | PO đường thuỷ, PO đường bộ (có uỷ quyền nhận hàng) |
| Thời điểm chia hàng | Sau khi PO đã hoàn tất nhận hàng (tất cả GRN đã close hoặc PO đã nhận đủ) |
| Đơn vị tính | Tấn (hoặc đơn vị tính theo cấu hình mã hàng) |
| Số lượng chủ hàng thực tế | Tối thiểu 2, không giới hạn tối đa |

---

## 4. Quy trình nghiệp vụ chi tiết

### 4.1. Điều kiện tiên quyết (Preconditions)

Trước khi truy cập module Chia hàng, hệ thống phải đảm bảo:

1. **PO đã hoàn tất nhận hàng** — tất cả các lần nhập kho (GRN — Goods Receipt Note) đã được xác nhận, số cân thực tế đã chốt.
2. **Tồn kho hiện tại** đang ghi nhận toàn bộ số lượng dưới tên chủ hàng uỷ quyền (chủ hàng gốc trên PO).
3. **PO chưa từng được chia hàng trước đó**, hoặc nếu hỗ trợ chia lại thì phải có cơ chế rollback (xem mục 7 — Edge Cases).

### 4.2. Luồng xử lý chính (Main Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Chọn PO cần chia hàng                                     │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 2: Hệ thống hiển thị thông tin PO & số cân thực tế           │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 3: User nhập danh sách chủ hàng thực tế + số lượng kế hoạch  │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 4: Hệ thống tính tỉ lệ phân bổ                               │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 5: Hệ thống tính số lượng thực tế phân bổ theo tỉ lệ         │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 6: User xác nhận kết quả phân bổ                              │
├─────────────────────────────────────────────────────────────────────┤
│  BƯỚC 7: Hệ thống cập nhật tồn kho theo chủ hàng                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### **BƯỚC 1 — Chọn PO cần chia hàng**

User truy cập module **Chia hàng (Đổi chủ)** và chọn PO cần thực hiện chia.

**Bộ lọc tìm kiếm PO:**

- Mã PO / Số PO
- Chủ hàng gốc (chủ hàng uỷ quyền)
- Mã hàng (SKU)
- Ngày nhận hàng (khoảng thời gian)
- Trạng thái PO: chỉ hiển thị PO đã hoàn tất nhận hàng (`status = RECEIVED`) và chưa chia hàng (`split_status = NOT_SPLIT`)

**Validation:**

- PO phải ở trạng thái `RECEIVED`.
- PO chưa được chia hàng (`split_status ≠ SPLIT_COMPLETED`).

---

#### **BƯỚC 2 — Hiển thị thông tin PO & số cân thực tế**

Hệ thống hiển thị bảng tổng hợp thông tin PO đã chọn:

| Trường | Giá trị ví dụ | Nguồn dữ liệu |
|---|---|---|
| Mã PO | PO-2026-0315 | PO Header |
| Loại PO | Đường thuỷ | PO Header |
| Chủ hàng uỷ quyền | TVL | PO Header → Customer |
| Mã hàng (SKU) | A | PO Line |
| Số lượng dự kiến PO | 50 tấn | PO Line → `planned_qty` |
| Số lần nhập kho (GRN) | 5 lần | COUNT(GRN) where PO = ... |
| **Tổng cân thực tế** | **49 tấn** | SUM(GRN → `actual_weight`) |
| Chênh lệch | -1 tấn (hao hụt 2%) | `planned_qty - actual_qty` |

**Lưu ý quan trọng:** Số **tổng cân thực tế (49 tấn)** là con số nền tảng để phân bổ. Đây là số đã qua cân tại kho, không phải số dự kiến trên PO.

---

#### **BƯỚC 3 — User nhập danh sách chủ hàng thực tế + số lượng kế hoạch**

User nhập bảng phân bổ:

| # | Chủ hàng thực tế | Số lượng kế hoạch (tấn) | Ghi chú |
|---|---|---|---|
| 1 | Chủ hàng A | 25 | Chủ hàng chính |
| 2 | Chủ hàng B | 15 | |
| 3 | Chủ hàng C | 10 | |
| | **Tổng** | **50** | |

**Validation tại bước này:**

| Rule ID | Rule | Mô tả |
|---|---|---|
| V3.1 | Tổng số lượng kế hoạch phải > 0 | Không cho phép nhập toàn bộ = 0 |
| V3.2 | Mỗi chủ hàng phải có số lượng kế hoạch > 0 | Không cho phép dòng có qty = 0 |
| V3.3 | Không trùng chủ hàng | Một chủ hàng chỉ xuất hiện 1 lần trong bảng phân bổ |
| V3.4 | Chủ hàng phải tồn tại trong Master Data | Chủ hàng phải là customer hợp lệ trong hệ thống |
| V3.5 | Tối thiểu 2 chủ hàng | Nếu chỉ 1 chủ hàng thì không cần chia, không cho phép thực hiện |
| V3.6 | Tổng kế hoạch nên ≈ số lượng dự kiến PO | Cảnh báo (warning) nếu chênh lệch > 5%, nhưng không block — vì thực tế số kế hoạch chia có thể khác PO |

---

#### **BƯỚC 4 — Hệ thống tính tỉ lệ phân bổ**

**Công thức:**

```
Tỉ lệ phân bổ (%) = Số lượng kế hoạch của chủ hàng / Tổng số lượng kế hoạch × 100
```

**Kết quả tính toán:**

| Chủ hàng | Số lượng kế hoạch | Tỉ lệ phân bổ |
|---|---|---|
| Chủ hàng A | 25 tấn | 25 / 50 = **50.00%** |
| Chủ hàng B | 15 tấn | 15 / 50 = **30.00%** |
| Chủ hàng C | 10 tấn | 10 / 50 = **20.00%** |
| **Tổng** | **50 tấn** | **100.00%** |

**Lưu ý kỹ thuật:** Tỉ lệ lưu trữ dạng decimal (precision 6 chữ số thập phân) để tránh sai lệch khi phân bổ số lượng lớn.

---

#### **BƯỚC 5 — Hệ thống tính số lượng thực tế phân bổ**

**Công thức:**

```
Số lượng thực tế phân bổ = Tổng cân thực tế × Tỉ lệ phân bổ
```

**Kết quả phân bổ:**

| Chủ hàng | Tỉ lệ | Số lượng thực tế phân bổ | Công thức |
|---|---|---|---|
| Chủ hàng A | 50.00% | 49 × 50% = **24.500 tấn** | 49 × 0.5 |
| Chủ hàng B | 30.00% | 49 × 30% = **14.700 tấn** | 49 × 0.3 |
| Chủ hàng C | 20.00% | 49 × 20% = **9.800 tấn** | 49 × 0.2 |
| **Tổng** | **100%** | **49.000 tấn** | ✅ Khớp tổng cân thực tế |

**Xử lý sai lệch do làm tròn (Rounding Adjustment):**

Khi phân bổ có số lẻ, tổng các dòng sau làm tròn có thể không bằng tổng cân thực tế. Hệ thống xử lý như sau:

1. Làm tròn mỗi dòng đến **3 chữ số thập phân** (hoặc theo cấu hình đơn vị tính).
2. Tính chênh lệch: `delta = tổng_cân_thực_tế - SUM(các_dòng_đã_làm_tròn)`.
3. Nếu `delta ≠ 0`: **cộng/trừ delta vào dòng có tỉ lệ phân bổ lớn nhất** (chủ hàng A trong ví dụ).
4. Đảm bảo: `SUM(actual_split_qty) = total_actual_qty` — luôn luôn chính xác.

**Ví dụ khi có sai lệch làm tròn:**

Giả sử tổng thực tế = 49 tấn, chia cho 3 chủ hàng tỉ lệ 33.33% / 33.33% / 33.34%:

| Chủ hàng | Trước làm tròn | Sau làm tròn | Sau adjustment |
|---|---|---|---|
| X | 16.3317 | 16.332 | 16.332 |
| Y | 16.3317 | 16.332 | 16.332 |
| Z | 16.3366 | 16.337 | **16.336** ← điều chỉnh -0.001 |
| **Tổng** | 49.000 | 49.001 | **49.000** ✅ |

---

#### **BƯỚC 6 — User xác nhận kết quả phân bổ**

Hệ thống hiển thị **bảng tổng hợp phân bổ** để user review trước khi confirm:

| Chủ hàng | KH (tấn) | Tỉ lệ (%) | Thực tế phân bổ (tấn) | Chênh lệch vs KH |
|---|---|---|---|---|
| Chủ hàng A | 25.000 | 50.00% | 24.500 | -0.500 |
| Chủ hàng B | 15.000 | 30.00% | 14.700 | -0.300 |
| Chủ hàng C | 10.000 | 20.00% | 9.800 | -0.200 |
| **Tổng** | **50.000** | **100%** | **49.000** | **-1.000** |

**Thông tin bổ sung hiển thị:**

- Tổng hao hụt: 1.000 tấn (2.00% so với dự kiến PO)
- Hao hụt được phân bổ đều theo tỉ lệ cho tất cả chủ hàng

**Hành động của user:**

- **Xác nhận (Confirm):** Tiến hành cập nhật tồn kho → chuyển sang Bước 7.
- **Chỉnh sửa (Edit):** Quay lại Bước 3 để sửa số lượng kế hoạch.
- **Huỷ (Cancel):** Thoát khỏi phiên chia hàng, không thay đổi dữ liệu.

---

#### **BƯỚC 7 — Hệ thống cập nhật tồn kho theo chủ hàng**

Sau khi user xác nhận, hệ thống thực hiện **transaction cập nhật tồn kho** (phải đảm bảo atomicity — tất cả hoặc không gì cả):

**7.1. Trừ tồn kho chủ hàng gốc (TVL):**

```
Inventory(TVL, SKU=A, Warehouse=W1) -= 49.000 tấn
```

**7.2. Cộng tồn kho cho từng chủ hàng thực tế:**

```
Inventory(Chủ hàng A, SKU=A, Warehouse=W1) += 24.500 tấn
Inventory(Chủ hàng B, SKU=A, Warehouse=W1) += 14.700 tấn
Inventory(Chủ hàng C, SKU=A, Warehouse=W1) += 9.800 tấn
```

**7.3. Tạo Inventory Transaction Log:**

Mỗi lần chia hàng sinh ra các dòng transaction:

| Transaction ID | Type | Customer | SKU | Qty | Direction | Reference |
|---|---|---|---|---|---|---|
| TXN-001 | SPLIT_OUT | TVL | A | 49.000 | OUT | SPLIT-2026-0001 |
| TXN-002 | SPLIT_IN | Chủ hàng A | A | 24.500 | IN | SPLIT-2026-0001 |
| TXN-003 | SPLIT_IN | Chủ hàng B | A | 14.700 | IN | SPLIT-2026-0001 |
| TXN-004 | SPLIT_IN | Chủ hàng C | A | 9.800 | IN | SPLIT-2026-0001 |

**7.4. Cập nhật trạng thái PO:**

```
PO.split_status = 'SPLIT_COMPLETED'
PO.split_reference = 'SPLIT-2026-0001'
PO.split_date = NOW()
PO.split_by = current_user
```

---

## 5. Mô hình dữ liệu (Data Model)

### 5.1. Bảng `goods_split_header` — Phiếu chia hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `split_id` | VARCHAR(20) PK | Mã phiếu chia hàng (auto-gen: SPLIT-YYYY-NNNN) |
| `po_id` | VARCHAR(20) FK | Mã PO gốc |
| `original_customer_id` | VARCHAR(20) FK | Chủ hàng uỷ quyền (chủ hàng gốc trên PO) |
| `sku` | VARCHAR(50) FK | Mã hàng |
| `warehouse_id` | VARCHAR(20) FK | Kho thực hiện chia hàng |
| `planned_total_qty` | DECIMAL(18,3) | Tổng số lượng kế hoạch phân bổ |
| `actual_total_qty` | DECIMAL(18,3) | Tổng cân thực tế (từ GRN) |
| `variance_qty` | DECIMAL(18,3) | Chênh lệch (actual - planned PO) |
| `variance_pct` | DECIMAL(8,4) | % chênh lệch |
| `status` | ENUM | `DRAFT`, `CONFIRMED`, `CANCELLED` |
| `created_by` | VARCHAR(50) | User tạo |
| `created_at` | DATETIME | Ngày tạo |
| `confirmed_by` | VARCHAR(50) | User xác nhận |
| `confirmed_at` | DATETIME | Ngày xác nhận |
| `note` | TEXT | Ghi chú |

### 5.2. Bảng `goods_split_detail` — Chi tiết phân bổ từng chủ hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `split_detail_id` | BIGINT PK AUTO | ID tự tăng |
| `split_id` | VARCHAR(20) FK | Mã phiếu chia hàng |
| `target_customer_id` | VARCHAR(20) FK | Chủ hàng thực tế nhận hàng |
| `planned_qty` | DECIMAL(18,3) | Số lượng kế hoạch của chủ hàng này |
| `allocation_ratio` | DECIMAL(10,6) | Tỉ lệ phân bổ (0.000000 → 1.000000) |
| `actual_allocated_qty` | DECIMAL(18,3) | Số lượng thực tế được phân bổ |
| `rounding_adjustment` | DECIMAL(18,3) | Số lượng điều chỉnh do làm tròn |
| `note` | TEXT | Ghi chú riêng cho dòng |

### 5.3. Bảng `goods_split_transaction` — Log giao dịch tồn kho

| Cột | Kiểu | Mô tả |
|---|---|---|
| `txn_id` | BIGINT PK AUTO | ID giao dịch |
| `split_id` | VARCHAR(20) FK | Mã phiếu chia hàng |
| `txn_type` | ENUM | `SPLIT_OUT` (trừ kho gốc), `SPLIT_IN` (cộng kho chủ hàng) |
| `customer_id` | VARCHAR(20) FK | Chủ hàng liên quan |
| `sku` | VARCHAR(50) | Mã hàng |
| `warehouse_id` | VARCHAR(20) | Kho |
| `qty` | DECIMAL(18,3) | Số lượng giao dịch |
| `direction` | ENUM | `IN`, `OUT` |
| `created_at` | DATETIME | Thời điểm ghi nhận |

---

## 6. Business Rules tổng hợp

| Rule ID | Mô tả | Loại |
|---|---|---|
| BR-01 | Chỉ PO có `status = RECEIVED` mới được phép chia hàng | Hard block |
| BR-02 | Mỗi PO chỉ được chia hàng **1 lần**. Muốn chia lại phải huỷ phiếu cũ trước | Hard block |
| BR-03 | Tổng `actual_allocated_qty` của tất cả chủ hàng phải = `actual_total_qty` (không sai lệch) | Hard block |
| BR-04 | Tỉ lệ phân bổ tính dựa trên **số lượng kế hoạch** do user nhập, KHÔNG dựa trên số dự kiến PO | Logic rule |
| BR-05 | Số lượng thực tế phân bổ tính dựa trên **tổng cân thực tế** (từ GRN), KHÔNG dựa trên planned PO qty | Logic rule |
| BR-06 | Tồn kho chủ hàng gốc phải ≥ `actual_total_qty` tại thời điểm confirm. Nếu không đủ → block và báo lỗi | Hard block |
| BR-07 | Phiếu chia hàng ở trạng thái `DRAFT` có thể chỉnh sửa tự do. Sau `CONFIRMED` thì chỉ huỷ được | State rule |
| BR-08 | Cập nhật tồn kho phải thực hiện trong **1 database transaction** (atomicity). Nếu bất kỳ dòng nào fail → rollback toàn bộ | Technical rule |
| BR-09 | Sai lệch do làm tròn được điều chỉnh vào chủ hàng có tỉ lệ phân bổ lớn nhất | Logic rule |
| BR-10 | Cảnh báo nếu tổng kế hoạch chia chênh lệch > 5% so với qty dự kiến PO, nhưng không block | Soft warning |

---

## 7. Edge Cases & Xử lý ngoại lệ

### 7.1. PO có nhiều mã hàng (multi-line PO)

Nếu PO có nhiều SKU, mỗi SKU cần được chia hàng **độc lập**. Phiếu chia hàng sẽ có nhiều bộ detail tương ứng từng SKU, hoặc tạo nhiều phiếu chia hàng riêng cho mỗi SKU. **Đề xuất:** tạo 1 phiếu chia hàng cho 1 PO line (1 SKU). Nếu PO có 3 SKU → tạo 3 phiếu chia hàng.

### 7.2. Chủ hàng thực tế trùng với chủ hàng gốc

Trường hợp TVL vừa là chủ hàng uỷ quyền, vừa là 1 trong các chủ hàng thực tế nhận hàng. Hệ thống cần cho phép điều này — khi xử lý tồn kho, phần của TVL sẽ **không cần chuyển đi**, chỉ cần ghi nhận lại đúng số lượng. Cách xử lý: vẫn trừ hết rồi cộng lại — đảm bảo logic nhất quán và audit trail rõ ràng.

### 7.3. Huỷ phiếu chia hàng đã confirm

Nếu cho phép huỷ phiếu đã confirm:

- Tạo transaction đảo (reverse): trừ tồn kho các chủ hàng thực tế, cộng lại cho chủ hàng gốc.
- Cập nhật PO: `split_status = NOT_SPLIT`.
- **Điều kiện huỷ:** tồn kho các chủ hàng thực tế phải còn đủ số lượng đã phân bổ (chưa xuất đi).
- Nếu bất kỳ chủ hàng nào đã xuất kho một phần → không cho phép huỷ.

### 7.4. Số cân thực tế = 0

Trường hợp PO tạo nhưng thực tế không nhận được hàng (hư hỏng, mất mát toàn bộ). Hệ thống không cho phép chia hàng khi `actual_total_qty = 0` → hiển thị thông báo phù hợp.

### 7.5. Chủ hàng chưa tồn tại trong Master Data

User không được nhập chủ hàng tự do. Phải chọn từ danh sách Customer Master. Nếu chủ hàng mới → phải tạo trong Customer Master trước khi thực hiện chia hàng.

### 7.6. PO nhận hàng nhiều lần, chưa close hết GRN

Nếu PO vẫn đang trong quá trình nhận hàng (còn GRN chưa confirm), không cho phép chia hàng. Phải đợi tất cả GRN hoàn tất để có số cân thực tế chính xác.

---

## 8. Phân quyền (Authorization)

| Quyền | Role | Mô tả |
|---|---|---|
| `SPLIT_VIEW` | Warehouse Staff, Supervisor, Manager | Xem danh sách phiếu chia hàng |
| `SPLIT_CREATE` | Warehouse Supervisor, Manager | Tạo phiếu chia hàng mới |
| `SPLIT_CONFIRM` | Warehouse Manager | Xác nhận phiếu chia hàng (trigger cập nhật tồn kho) |
| `SPLIT_CANCEL` | Warehouse Manager | Huỷ phiếu chia hàng đã confirm |

**Lưu ý:** Nên tách quyền `CREATE` và `CONFIRM` để đảm bảo nguyên tắc **four-eyes** (người tạo khác người duyệt).

---

## 9. Tích hợp hệ thống (System Integration)

| Hệ thống | Hướng | Mô tả |
|---|---|---|
| **WMS — Inventory Module** | Outbound | Cập nhật tồn kho theo chủ hàng sau khi confirm |
| **PO Module** | Bidirectional | Đọc thông tin PO, GRN. Ghi lại `split_status` vào PO |
| **Customer Master** | Inbound | Validate và lấy thông tin chủ hàng thực tế |
| **Reporting Module** | Outbound | Cung cấp dữ liệu cho báo cáo phân bổ hàng hoá, hao hụt |
| **Audit Log** | Outbound | Ghi nhận mọi thao tác tạo, sửa, confirm, huỷ phiếu |

---

## 10. Báo cáo liên quan

| Báo cáo | Mô tả |
|---|---|
| **Báo cáo chia hàng theo PO** | Chi tiết phân bổ của từng PO: chủ hàng, tỉ lệ, số lượng KH vs thực tế |
| **Báo cáo hao hụt theo chủ hàng** | Tổng hợp hao hụt (chênh lệch KH vs thực tế) theo từng chủ hàng trong kỳ |
| **Báo cáo tồn kho theo chủ hàng** | Tồn kho hiện tại chi tiết theo từng chủ hàng, SKU, kho |
| **Audit trail chia hàng** | Lịch sử thao tác: ai tạo, ai confirm, thời gian, dữ liệu trước/sau |

---

## 11. Giao diện (UI Wireframe mô tả)

### 11.1. Màn hình danh sách phiếu chia hàng

- Bảng danh sách: Mã phiếu | PO | Chủ hàng gốc | SKU | Tổng thực tế | Trạng thái | Ngày tạo
- Bộ lọc: theo PO, chủ hàng, trạng thái, khoảng thời gian
- Nút: [+ Tạo phiếu chia hàng]

### 11.2. Màn hình tạo/chỉnh sửa phiếu chia hàng

- **Phần header:** Dropdown chọn PO → auto-fill thông tin PO, chủ hàng gốc, SKU, tổng cân thực tế
- **Phần detail (bảng editable):**
  - Cột: Chủ hàng (dropdown) | Số lượng KH (input) | Tỉ lệ (auto) | Thực tế phân bổ (auto) | Ghi chú
  - Nút [+ Thêm dòng], [🗑 Xoá dòng]
  - Dòng tổng (auto-sum) ở cuối bảng
- **Phần action:** [Lưu nháp] [Xác nhận] [Huỷ]

### 11.3. Màn hình xác nhận

- Popup hoặc màn hình riêng hiển thị bảng tổng hợp (như Bước 6)
- Cảnh báo nếu có chênh lệch bất thường
- Nút [Xác nhận chia hàng] [Quay lại chỉnh sửa]

---

## 12. Acceptance Criteria (Tiêu chí nghiệm thu)

| # | Tiêu chí | Expected Result |
|---|---|---|
| AC-01 | Tạo phiếu chia hàng từ PO đã nhận hàng | Phiếu tạo thành công, trạng thái DRAFT |
| AC-02 | Nhập 3 chủ hàng với số lượng KH, hệ thống tính đúng tỉ lệ | Tỉ lệ = qty_kh / tổng_qty_kh, chính xác 6 decimal |
| AC-03 | Hệ thống phân bổ thực tế đúng theo tỉ lệ | SUM(actual_allocated) = total_actual_qty, sai lệch = 0 |
| AC-04 | Xác nhận phiếu → tồn kho chủ hàng gốc giảm đúng | Inventory(TVL) giảm đúng bằng actual_total_qty |
| AC-05 | Xác nhận phiếu → tồn kho từng chủ hàng tăng đúng | Inventory(A/B/C) tăng đúng bằng actual_allocated_qty tương ứng |
| AC-06 | Không cho chia PO chưa nhận hàng xong | Hiển thị lỗi, không cho tạo phiếu |
| AC-07 | Không cho chia PO đã chia rồi | Hiển thị lỗi, không cho tạo phiếu |
| AC-08 | Huỷ phiếu đã confirm → tồn kho rollback đúng | Tồn kho trở về trạng thái trước chia |
| AC-09 | Transaction fail giữa chừng → rollback toàn bộ | Không có dữ liệu dở dang, tồn kho không sai lệch |
| AC-10 | Audit trail ghi nhận đầy đủ | Mọi thao tác đều có log: user, thời gian, dữ liệu |

---

## 13. Vấn đề mở (Open Questions)

| # | Câu hỏi | Đề xuất | Quyết định |
|---|---|---|---|
| OQ-01 | Tổng kế hoạch chia có bắt buộc phải = qty dự kiến PO không? | Không bắt buộc, chỉ warning. Vì thực tế tổng chia có thể khác PO | Chờ confirm |
| OQ-02 | Một PO multi-line có chia cùng lúc nhiều SKU trong 1 phiếu không? | 1 phiếu / 1 SKU để đơn giản. Nhiều SKU thì tạo nhiều phiếu | Chờ confirm |
| OQ-03 | Có cho phép chỉnh sửa số lượng KH sau khi CONFIRM không? | Không. Phải huỷ phiếu cũ, tạo mới | Chờ confirm |
| OQ-04 | Có cần tích hợp tính phí lưu kho theo chủ hàng sau chia không? | Phase 2 nếu cần | Chờ confirm |
| OQ-05 | Hao hụt có cần quy trách nhiệm riêng hay chia đều theo tỉ lệ? | Chia đều theo tỉ lệ (mặc định). Nếu cần quy riêng → Phase 2 | Chờ confirm |
| OQ-06 | Có cần hỗ trợ chia hàng cho PO đường bộ ngay Phase 1? | Nên hỗ trợ vì logic giống nhau, chỉ khác PO type | Chờ confirm |
