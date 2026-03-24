# Luồng Vận Hành Xuất Kho (Outbound Workflow)

## Tổng quan

Hệ thống mô phỏng hoạt động xuất hàng tại kho trung gian (transit warehouse). Chủ hàng (Owner) đã nhập hàng vào kho tại các vị trí cụ thể và muốn xuất hàng ra khỏi kho để vận chuyển đi.

**Ví dụ minh họa:** OWN-001 (Thoresen Vietnamese Logistics) đã nhập 120.000 kg Clinker xi măng (CLINKER) vào vị trí WH01-B-01 (Kho 1 — Hàng rời). Nay họ muốn xuất hàng ra.

---

## Các bước chi tiết

### Bước 1: Tạo Đơn Xuất Hàng (Sales Order — SO)

**Màn hình:** Vận hành xuất > Đơn bán hàng (`/app/outbound-operations/sales-orders`)

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Loại SO | Đường bộ / Đường thủy | Đường bộ |
| Chủ hàng | Owner sở hữu hàng trong kho | OWN-001 — Thoresen Vietnamese Logistics |
| Số B/L | Số vận đơn | 123213 |
| Số SO | Tự động sinh `SO-YYMMDD-NNNNN` | SO-202603-00001 |
| Ghi chú | Tùy chọn | — |
| Tên tàu | Phương tiện vận chuyển (nếu đường thủy) | VSL-001 — MV Sông Hồng Star |
| Biển số xe | Xe chở hàng | 1232131 |

**Chi tiết hàng hóa (SO Lines):**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng hóa | Mặt hàng cần xuất — **filter theo tồn kho AVAILABLE của chủ hàng** | CLINKER — Clinker xi măng |
| SL dự kiến | Số lượng dự kiến xuất | 111 |
| ĐVT | Đơn vị tính | BAG25 |

> **Filter mã hàng hóa theo chủ hàng:** Khi chọn Chủ hàng, dropdown Mã hàng hóa chỉ hiển thị các mặt hàng mà chủ hàng đó **có tồn kho ở trạng thái AVAILABLE** (có thể xuất). Query `on_hand` theo `ownerId` + `hasStock=true`, filter `inventoryStatus.statusCode === 'AVAILABLE'`. Nếu chưa chọn chủ hàng → hiển thị tất cả.

**Kết quả:** SO được tạo với trạng thái **Tạo mới** (DB: DRAFT, API: NEW).

---

### Bước 2: Xác nhận Đơn Xuất Hàng (Confirm SO)

**Hành động:** Nhấn nút xác nhận (✓) trên dòng SO trong danh sách.

**Trạng thái SO:** Tạo mới → **Đã xác nhận**

**Ý nghĩa:** SO đã được duyệt, sẵn sàng để tạo phiếu xuất kho.

---

### Bước 3: Tạo Phiếu Xuất Kho (Shipment — SHP)

**Màn hình:** Từ SO đã xác nhận, nhấn tạo phiếu xuất kho.

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Số SO | Tự động liên kết từ SO | SO-202603-00001 |
| Loại phiếu | Tự động theo loại SO | Đường bộ |
| Số phiếu xuất | Tự động sinh `SHP-YYMMDD-NNNNN` | SHP-202603-00001 |
| Kho | Chọn kho (chỉ hiển thị kho có tồn kho của owner) | WH-01 — Kho 1 — Hàng rời |
| Biển số xe | Kế thừa từ SO | 1232131 |

**Chi tiết phiếu xuất (SHP Lines):**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng hóa | Kế thừa từ SO line | CLINKER — Clinker xi măng |
| SL xuất | Số lượng xuất (expectedQtyKg) | 2.775 kg |
| ĐVT | Đơn vị tính | BAG25 |

> **Lưu ý:** Dropdown kho filter theo owner — chỉ hiển thị kho có tồn kho thực tế của chủ hàng (query `on_hand` theo `ownerId`).

**Kết quả:** SHP được tạo với trạng thái **Tạo mới** (DB: DRAFT, API: NEW).

---

### Bước 4: Xác nhận Phiếu Xuất Kho (Confirm SHP)

**Màn hình:** Vận hành xuất > Phiếu xuất kho (`/app/outbound-operations/shipments`)

**Hành động:** Nhấn nút xác nhận (✓) trên dòng SHP.

**Trạng thái SHP:** Tạo mới → **Đã xác nhận** (CONFIRMED)

**Ý nghĩa:** Xe đã được gán để đến kho chở hàng. SHP sẵn sàng cho quy trình cân và xếp hàng.

---

### Bước 5: Tạo Phiếu Cân (Weighbridge Event)

**Màn hình:** Trạm cân (`/app/weighbridge`)

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã phiếu cân | Tự động sinh `WB-EVT-{timestamp}` | WB-EVT-1774376817791-736 |
| Loại cân | **Cân ra** (outbound) | Cân ra |
| Mã phiếu xuất | Liên kết SHP | SHP-202603-00001 |
| Kho | Tự động theo SHP | WH-01 — Kho 1 — Hàng rời |
| Số xe | Kế thừa từ SHP | 1232131 |
| Chủ hàng | Tự động | Thoresen Vietnamese Logistics |
| Mã hàng | Tự động theo SHP | CLINKER |

**Kết quả:** Phiếu cân được tạo với trạng thái **Tạo mới** (VALIDATED).

---

### Bước 6: Cân lần 1 — Tare (Xe rỗng)

**Màn hình:** Trạm cân — nhấn xác nhận phiếu cân → nhập trọng lượng lần 1

**Hành động:** Xe rỗng lên trạm cân, nhập trọng lượng xe → hệ thống ghi nhận `grossWeightKg` (lần 1 cho WEIGH_OUT).

**Trạng thái phiếu cân:** VALIDATED → **WEIGHING** (Đang cân lần 2)

> **Ràng buộc quan trọng:**
> - Cân lần 1 (tare) là **bắt buộc** trước khi xếp hàng
> - Nếu xe chưa cân tare → hệ thống **không cho phép xếp hàng**: *"Xe chưa cân tare. Vui lòng đưa xe đến Trạm cân trước khi xếp hàng."*

---

### Bước 7: Xếp hàng (Loading)

**Màn hình:** Vận hành xuất > Xếp hàng (`/app/outbound-operations/loading`)

**Điều kiện tiên quyết:** Xe đã cân tare (cân lần 1) thành công.

**Quy trình:**

1. Chọn phiếu xuất (SHP) từ danh sách bên trái (chỉ hiện SHP ở CONFIRMED hoặc LOADING)
2. Hệ thống hiển thị trạng thái cân:
   - **Cân lần 1 — Tare (xe rỗng):** Đã cân ✓
   - **Cân lần 2 — Gross (xe có hàng):** Chờ xếp hàng xong
3. Nhấn **"Bắt đầu xếp hàng"**
4. **Trạng thái SHP:** CONFIRMED → **LOADING** (Đang xếp hàng)

#### Chọn vị trí lấy hàng (Location Picking)

**Bối cảnh:** Tại bước tạo SHP, chỉ chọn **kho** (VD: WH-01). Một kho có nhiều vị trí (WH01-A-01, WH01-B-01...). Cần xác định trừ tồn kho ở vị trí nào.

##### Giao diện Web (hiện tại) — Dropdown chọn vị trí

Với mỗi dòng hàng chưa xếp, hiển thị:

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng | Readonly, từ SHP line | CLINKER — Clinker xi măng |
| Vị trí lấy hàng | **Dropdown** — chỉ hiển thị vị trí trong kho SHP có tồn kho (`availableQty > 0`) cho mặt hàng này | WH01-B-01 (tồn: 120.000 KG) |

- API: `GET /outbound/loading/:shipmentId/locations-with-stock?itemId=xxx`
- Dropdown hiển thị: `{locationCode} (tồn: {availableQty} {uomCode})`
- Nhấn **"Xếp lên xe"** → ghi nhận `locationId` vào shipment line
- Mục "Đã xếp" hiển thị vị trí: `CLINKER @ WH01-B-01`

##### Giao diện Mobile (tương lai) — Quét mã vạch

1. Nhân viên kho dùng **điện thoại** mở màn hình xếp hàng
2. Chọn SHP → thấy danh sách hàng cần lấy
3. Đi đến vị trí → **quét mã vạch vị trí (location barcode)**
4. Hệ thống tự xác định kho + vị trí + kiểm tra tồn kho
5. Xác nhận lấy hàng → hệ thống trừ tồn kho tại vị trí đó

5. Sau khi xếp xong tất cả hàng, nhấn **"Hoàn thành xếp hàng"**

**Trạng thái SHP:** LOADING → **LOADED** (Đã xếp xong)

> **Ràng buộc:** Phải xếp **tất cả** mặt hàng trước khi hoàn thành. Nếu còn item chưa xếp → báo lỗi.

---

### Bước 8: Cân lần 2 — Gross (Xe có hàng)

**Màn hình:** Trạm cân (`/app/weighbridge`)

**Điều kiện tiên quyết:** SHP phải ở trạng thái **LOADED** (đã xếp hàng xong). Nếu chưa xếp xong → báo lỗi: *"Xe chưa xếp hàng xong. Vui lòng hoàn thành xếp hàng trước khi cân lần 2."*

**Hành động:** Xe đã xếp hàng lên trạm cân → nhập trọng lượng lần 2.

**Tính toán:**
```
Khối lượng tịnh (Net Weight) = Cân lần 2 (Gross) − Cân lần 1 (Tare)
VD: 200 kg − 5 kg = 195 kg
```

**Cập nhật tự động sau khi cân lần 2:**

1. **Phiếu cân:** WEIGHING → **COMPLETED**
2. **Shipment Lines:** Cập nhật `shippedQty` = net weight (chia tỷ lệ nếu nhiều line)
3. **SHP header:** SL đã xuất = tổng `shippedQty` của tất cả lines
4. **Inventory Transaction:** Tự động post `SHIP_CONFIRMED` vào Module 3 (Inventory Core):
   - Event: `SHIP_CONFIRMED` → Transaction type: `ISSUE`, Stage: `DEDUCTED`
   - Trừ `physicalQty` và `allocatedQty` trên `on_hand` tại vị trí đã chọn khi xếp hàng
   - Ghi lịch sử giao dịch vào `invent_trans` (loại SHIPMENT)
5. **Tồn kho hiện tại:** Cột "Thực tế" giảm, cột "Đã xuất" hiện SL đã ship

---

### Bước 9: Hoàn tất xuất kho

Sau khi cân lần 2 hoàn tất:

| Đối tượng | Trạng thái/Cập nhật |
|-----------|-------------------|
| **Phiếu cân** | COMPLETED |
| **SHP** | LOADED, SL đã xuất = net weight |
| **SO** | Cập nhật tổng SL đã xuất từ tất cả SHP |
| **Tồn kho (on_hand)** | `physicalQty` giảm, `availableQty` giảm |
| **Lịch sử giao dịch (invent_trans)** | Record mới: ISSUE/DEDUCTED, refType=SHIPMENT |

---

## Sơ đồ trạng thái

### Sales Order (SO)
```
DRAFT (Tạo mới) → CONFIRMED (Đã xác nhận) → PARTIALLY_RELEASED (Xuất 1 phần) → FULLY_RELEASED (Xuất đủ) → CLOSED (Đã đóng)
       ↓
   CANCELLED (Đã hủy)
```

### Shipment (SHP)
```
DRAFT (Tạo mới) → CONFIRMED (Đã xác nhận) → LOADING (Đang xếp) → LOADED (Đã xếp xong) → SHIPPED (Đã xuất) → CLOSED (Đã đóng)
       ↓                    ↓
   CANCELLED            CANCELLED (báo lỗi)
```

### Phiếu cân (Weighbridge Event)
```
VALIDATED (Tạo mới) → WEIGHING (Đã cân lần 1) → COMPLETED (Đã cân lần 2)
       ↓
   REJECTED
```

### Shipment Line
```
PENDING (Chờ xếp) → LOADING (Đang xếp/đã xếp lên xe) → WEIGHED_PASS (Hoàn thành xếp)
       ↓
   CANCELLED
```

---

## Luồng tổng quan (Flow Summary)

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 1. Tạo SO       │────>│ 2. Xác nhận SO   │────>│ 3. Tạo SHP           │
│    (DRAFT)      │     │    (CONFIRMED)   │     │    (chọn kho Owner)  │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
                                                            v
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 6. Cân lần 1    │<────│ 5. Tạo phiếu cân │<────│ 4. Xác nhận SHP      │
│    Tare         │     │    (Cân ra)      │     │    (CONFIRMED)       │
│    (xe rỗng)    │     │                  │     │                      │
└────────┬────────┘     └──────────────────┘     └──────────────────────┘
         │
         v
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 7. Xếp hàng     │────>│ 7b. Hoàn thành   │────>│ 8. Cân lần 2         │
│    (chọn vị trí │     │     xếp hàng     │     │    Gross (xe có hàng)│
│     lấy hàng)   │     │    (LOADED)      │     │                      │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
                                                            v
                                                 ┌──────────────────────┐
                                                 │ 9. Hệ thống tự động: │
                                                 │  • Net = Gross - Tare│
                                                 │  • Update SHP/SO qty │
                                                 │  • Post SHIP_CONFIRMED│
                                                 │    → Trừ tồn kho     │
                                                 │  • Ghi lịch sử GD   │
                                                 └──────────────────────┘
```

---

## Quy tắc nghiệp vụ quan trọng

1. **Kho filter theo Owner:** Dropdown kho khi tạo SHP chỉ hiển thị kho có tồn kho của chủ hàng.
2. **Bắt buộc cân tare trước xếp hàng:** Chưa cân lần 1 → không cho xếp hàng.
3. **Bắt buộc xếp hàng xong trước cân lần 2:** SHP chưa LOADED → không cho cân lần 2.
4. **Chọn vị trí khi xếp hàng:** Web dùng dropdown vị trí có tồn kho, mobile (tương lai) quét barcode. Location được ghi vào `shipment_line.location_id`.
5. **Khối lượng tịnh tự động:** Net = Gross − Tare, không nhập tay.
6. **Tự động trừ tồn kho:** Sau cân lần 2, hệ thống post `SHIP_CONFIRMED` → trừ `physicalQty` tại vị trí đã chọn khi xếp hàng.
7. **Ghi lịch sử giao dịch:** Mỗi lần xuất tạo record trong `invent_trans` (loại SHIPMENT) với đầy đủ thông tin dim (warehouse, location, owner, status).
8. **Một SO có thể có nhiều SHP:** Xuất 1 phần → tạo thêm SHP.
9. **Liên kết xuyên suốt:** SO → SHP → Phiếu cân → Xếp hàng → Tồn kho, tất cả liên kết qua mã SO và mã SHP.

---

## Hiển thị tồn kho sau xuất

Trang **Tồn kho hiện tại** (`/app/inventory-core/on-hand`) hiển thị:

| Cột | Nguồn | Mô tả |
|-----|-------|-------|
| Thực tế | `on_hand.physicalQty` | Số lượng vật lý thực tế (giảm sau cân lần 2) |
| Đã giữ | `on_hand.allocatedQty` | Số lượng đã phân bổ/giữ chờ |
| Đã xuất | Tổng `shipment_line.shippedQty` theo item+warehouse | Tổng SL đã xuất thực tế |
| Khả dụng | `on_hand.availableQty` = physicalQty − allocatedQty | Số lượng có thể sử dụng |
