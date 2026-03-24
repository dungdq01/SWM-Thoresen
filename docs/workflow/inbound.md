# Luồng Vận Hành Nhập Kho (Inbound Workflow)

## Tổng quan

Hệ thống mô phỏng hoạt động nhập hàng vào kho trung gian (transit warehouse). Chủ hàng (Owner) gửi hàng đến kho bằng xe tải/tàu. Xe vào kho **đã có hàng sẵn**, cần cân → dỡ hàng xuống vị trí kho → cân xe rỗng → tính khối lượng tịnh → cộng tồn kho.

**So sánh với luồng xuất (Outbound):**

| | Nhập kho (Inbound) | Xuất kho (Outbound) |
|--|---------------------|---------------------|
| Đơn hàng | PO (Purchase Order) | SO (Sales Order) |
| Phiếu | ASN / Receipt | SHP (Shipment) |
| Cân lần 1 | **Gross** (xe có hàng) | Tare (xe rỗng) |
| Thao tác hàng | **Dỡ hàng** xuống kho | Xếp hàng lên xe |
| Cân lần 2 | **Tare** (xe rỗng) | Gross (xe có hàng) |
| Tồn kho | **Cộng** physicalQty | Trừ physicalQty |
| Loại cân | WEIGH_IN | WEIGH_OUT |
| Net weight | Lần 1 − Lần 2 | Lần 2 − Lần 1 |

---

## Các bước chi tiết

### Bước 1: Tạo Đơn Nhập Hàng (Purchase Order — PO)

**Màn hình:** Vận hành nhập > Đơn nhập hàng (`/app/inbound-operations/purchase-orders`)

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Loại PO | Đường thủy (SEA) / Đường bộ (LAND) | Đường bộ |
| Chủ hàng | Owner sẽ nhập hàng vào kho | OWN-001 — Thoresen Vietnamese Logistics |
| Nhà cung cấp | Vendor gửi hàng | Nhà máy Xi Măng Hà Tiên |
| Số B/L | Số vận đơn | BL-2026-CLK-001 |
| Số PO | Tự động sinh | PO-202603-00001 |
| Biển số xe | Xe chở hàng đến | 51C-12345 |
| Tên tàu | Nếu đường thủy | — |
| Ghi chú | Tùy chọn | — |

**Chi tiết hàng hóa (PO Lines):**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng hóa | Mặt hàng nhập | CLINKER — Clinker xi măng |
| SL dự kiến | Số lượng dự kiến nhập (kg) | 50.000 |
| ĐVT | Đơn vị tính | KG |

**Kết quả:** PO được tạo với trạng thái **Tạo mới** (NEW).

---

### Bước 2: Xác nhận Đơn Nhập Hàng (Confirm PO)

**Hành động:** Nhấn nút xác nhận (✓) trên dòng PO.

**Trạng thái PO:** NEW → **CONFIRMED**

**Ý nghĩa:** PO đã được duyệt, sẵn sàng để tạo phiếu nhập kho.

---

### Bước 3: Tạo Phiếu Nhập Kho (Receipt / ASN)

**Màn hình:** Vận hành nhập > Phiếu nhập kho (`/app/inbound-operations/receipts`)

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Số PO | Liên kết từ PO đã xác nhận | PO-202603-00001 |
| Loại phiếu | Tự động theo loại PO | Đường bộ |
| Số phiếu nhập | Tự động sinh `RCV-YYMMDD-NNNNN` | RCV-202603-00001 |
| Kho nhập | Kho sẽ nhận hàng | WH-01 — Kho 1 — Hàng rời |
| Biển số xe | Kế thừa từ PO | 51C-12345 |

**Chi tiết phiếu nhập (Receipt Lines):**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng hóa | Kế thừa từ PO line | CLINKER — Clinker xi măng |
| SL dự kiến | Số lượng dự kiến nhập (kg) | 50.000 |
| ĐVT | Đơn vị tính | KG |

**Kết quả:** Receipt được tạo với trạng thái **DRAFT**.

---

### Bước 4: Xác nhận Phiếu Nhập (Confirm Receipt)

**Hành động:** Xác nhận phiếu nhập.

**Trạng thái Receipt:** DRAFT → **AWAITING_WEIGHING** (Chờ cân)

**Ý nghĩa:** Xe đã đến kho, sẵn sàng lên trạm cân.

---

### Bước 5: Tạo Phiếu Cân (Weighbridge Event)

**Màn hình:** Trạm cân (`/app/weighbridge`)

**Thông tin cần nhập:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã phiếu cân | Tự động sinh | WB-EVT-{timestamp} |
| Loại cân | **Cân vào** (inbound) | Cân vào (WEIGH_IN) |
| Mã phiếu nhập | Liên kết Receipt | RCV-202603-00001 |
| Kho | Tự động theo Receipt | WH-01 |
| Số xe | Kế thừa | 51C-12345 |
| Chủ hàng | Tự động | OWN-001 |
| Mã hàng | Tự động | CLINKER |

**Kết quả:** Phiếu cân được tạo.

---

### Bước 6: Cân lần 1 — Gross (Xe có hàng)

**Hành động:** Xe **có hàng** lên trạm cân → nhập trọng lượng lần 1.

**Khác với outbound:** Ở inbound, xe vào kho đã chở hàng nên cân lần 1 là **gross** (xe nặng).

**Trạng thái Receipt:** AWAITING_WEIGHING → **WEIGHED_IN**

**Trạng thái phiếu cân:** → WEIGHING (Đang cân lần 2)

> **Ràng buộc:** Cân lần 1 (gross) là **bắt buộc** trước khi dỡ hàng. Nếu xe chưa cân lần 1, hệ thống **không cho phép dỡ hàng**: *"Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng."*

---

### Bước 7: Dỡ hàng (Unloading) — ✅ Đã triển khai

**Màn hình:** Vận hành nhập > Dỡ hàng (`/app/inbound-operations/unloading`)

**Điều kiện tiên quyết:** Xe đã cân lần 1 (gross) thành công. Receipt status = WEIGHED_IN hoặc PROCESSING.

**Quy trình:**

1. Chọn phiếu nhập (Receipt) từ danh sách bên trái (WEIGHED_IN / PROCESSING)
2. Hệ thống hiển thị trạng thái cân:
   - **Cân lần 1 — Gross (xe có hàng):** Đã cân ✓
   - **Cân lần 2 — Tare (xe rỗng):** Chờ dỡ hàng xong
3. Nhấn **"Bắt đầu dỡ hàng"**
4. **Trạng thái Receipt:** WEIGHED_IN → **PROCESSING** (Đang dỡ hàng)

#### Chọn vị trí dỡ hàng (Location Picking)

**Bối cảnh:** Khi tạo Receipt, chỉ chọn **kho** (VD: WH-01). Cần xác định dỡ hàng vào **vị trí** nào trong kho.

##### Giao diện Web (hiện tại) — Dropdown chọn vị trí

Với mỗi dòng hàng cần dỡ, hiển thị:

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng | Readonly, từ Receipt line | CLINKER — Clinker xi măng |
| Vị trí dỡ hàng | **Dropdown** — hiển thị các vị trí lưu trữ (STORAGE) trong kho Receipt, có đủ sức chứa | WH01-B-01 (sức chứa: 100.000 kg) |
| SL dỡ | Số lượng dỡ vào vị trí này | 50.000 |

- Nếu 1 vị trí không đủ → nhấn **"+ Thêm vị trí"** để dỡ vào nhiều vị trí
- Hệ thống validate: tổng SL dỡ = SL dự kiến của dòng hàng

##### Giao diện Mobile (tương lai) — Quét mã vạch

1. Nhân viên dùng **điện thoại** mở màn hình dỡ hàng
2. Đi đến vị trí sẽ dỡ hàng → **quét mã vạch vị trí**
3. Hệ thống xác định kho + vị trí
4. Nhập SL dỡ → ghi nhận
5. Di chuyển sang vị trí khác nếu cần → quét tiếp

5. Sau khi dỡ xong tất cả hàng, nhấn **"Hoàn thành dỡ hàng"**

> **Tại sao cần chọn vị trí dỡ hàng?**
> - Hàng nhập cần được đặt đúng vị trí trong kho
> - Mỗi kho có nhiều vị trí lưu trữ với sức chứa khác nhau
> - Tồn kho sẽ được **cộng đúng vị trí** khi inventory transaction được post
> - Đảm bảo dữ liệu tồn kho theo vị trí chính xác với thực tế

---

### Bước 8: Cân lần 2 — Tare (Xe rỗng)

**Màn hình:** Trạm cân (`/app/weighbridge`)

**Điều kiện tiên quyết:** Hàng đã dỡ xong. Receipt phải ở trạng thái **PROCESSING** và đã hoàn thành dỡ hàng.

> **Ràng buộc:** Nếu chưa dỡ hàng xong → báo lỗi: *"Xe chưa dỡ hàng xong. Vui lòng hoàn thành dỡ hàng trước khi cân lần 2."*

**Hành động:** Xe **đã dỡ hàng** (rỗng) lên trạm cân → nhập trọng lượng lần 2.

**Tính toán:**
```
Khối lượng tịnh (Net Weight) = Cân lần 1 (Gross) − Cân lần 2 (Tare)
VD: 55.000 kg − 5.000 kg = 50.000 kg
```

**Cập nhật tự động sau khi cân lần 2:**

1. **Phiếu cân:** → COMPLETED
2. **Receipt:** PROCESSING → **WEIGHED_OUT**
3. **Kiểm tra dung sai (Tolerance Check):**
   - Tính variance: `|netWeight - expectedQty| / expectedQty × 100%`
   - Nếu variance ≤ tolerance → **AUTO_ACCEPT** → Receipt status → **RECEIVED**
   - Nếu variance > tolerance → **AUTO_REJECT** → Receipt status → **REJECTED** (có thể reweigh tối đa 3 lần)
4. **Receipt Lines:** Cập nhật `receivedQty` = net weight
5. **Inventory Transaction:** Tự động post `GOODS_RECEIVED` vào Module 3 (Inventory Core):
   - Event: `GOODS_RECEIVED` → Transaction type: `RECEIPT`, Stage: `RECEIVED`
   - **Cộng** `physicalQty` trên `on_hand` tại vị trí đã chọn khi dỡ hàng
   - Ghi lịch sử giao dịch vào `invent_trans` (loại RECEIPT)
6. **Tồn kho hiện tại:** Cột "Thực tế" tăng, "Khả dụng" tăng

---

### Bước 9: Cất hàng / Putaway (Tùy chọn)

**Trạng thái Receipt:** RECEIVED → **PUTAWAY** (sau khi xác nhận cất hàng)

> Bước này tùy chọn — hàng đã ở đúng vị trí từ bước dỡ hàng. Putaway dùng khi cần di chuyển hàng từ vị trí nhận hàng tạm sang vị trí lưu trữ chính thức.

---

### Bước 10: Đóng phiếu nhập

**Trạng thái Receipt:** PUTAWAY → **CLOSED**

**PO:** Cập nhật tổng SL đã nhận từ tất cả Receipt liên quan.

---

## Sơ đồ trạng thái

### Purchase Order (PO)
```
NEW (Tạo mới) → CONFIRMED (Đã xác nhận) → RECEIVING (Đang nhận) → CLOSED (Đã đóng)
       ↓
   CANCELLED
```

### Receipt (ASN / Phiếu nhập)
```
DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT
  ↓                                                        ↓
CANCELLED                                           ┌──────┴──────┐
                                                    ↓             ↓
                                                RECEIVED      REJECTED
                                                    ↓         (reweigh ≤3)
                                                PUTAWAY           ↓
                                                    ↓      AWAITING_WEIGHING
                                                CLOSED
```

### Phiếu cân (Weighbridge Event — WEIGH_IN)
```
VALIDATED → WEIGHING (Đã cân lần 1 gross) → COMPLETED (Đã cân lần 2 tare)
```

---

## Luồng tổng quan (Flow Summary)

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 1. Tạo PO       │────>│ 2. Xác nhận PO   │────>│ 3. Tạo Receipt (ASN) │
│    (NEW)        │     │    (CONFIRMED)   │     │    (DRAFT)           │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
                                                            v
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 6. Cân lần 1    │<────│ 5. Tạo phiếu cân │<────│ 4. Xác nhận Receipt  │
│    Gross        │     │    (Cân vào)     │     │    (AWAITING_WEIGHING)│
│    (xe có hàng) │     │                  │     │                      │
└────────┬────────┘     └──────────────────┘     └──────────────────────┘
         │
         v
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 7. Dỡ hàng      │────>│ 7b. Hoàn thành   │────>│ 8. Cân lần 2         │
│    (chọn vị trí │     │     dỡ hàng      │     │    Tare (xe rỗng)    │
│     dỡ vào kho) │     │                  │     │                      │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
                                                            v
                                                 ┌──────────────────────┐
                                                 │ 9. Hệ thống tự động: │
                                                 │  • Net = Gross - Tare│
                                                 │  • Tolerance check   │
                                                 │  • Post GOODS_RECEIVED│
                                                 │    → Cộng tồn kho    │
                                                 │  • Ghi lịch sử GD   │
                                                 └──────────────────────┘
```

---

## Quy tắc nghiệp vụ quan trọng

1. **Cân lần 1 là xe có hàng (Gross):** Khác outbound — inbound cân xe nặng trước, xe rỗng sau.
2. **Bắt buộc cân gross trước dỡ hàng:** Chưa cân lần 1 → không cho dỡ hàng.
3. **Bắt buộc dỡ hàng xong trước cân lần 2:** Chưa dỡ xong → không cho cân lần 2 (tare).
4. **Chọn vị trí dỡ hàng:** Web dùng dropdown vị trí trong kho, mobile (tương lai) quét barcode. Location được ghi vào receipt line.
5. **Net = Gross − Tare:** Lần 1 − Lần 2 (ngược outbound: lần 2 − lần 1).
6. **Tolerance check tự động:** So sánh net weight vs expected qty. Nếu vượt dung sai → REJECTED (reweigh tối đa 3 lần).
7. **Tự động cộng tồn kho:** Sau cân lần 2 + accept → post `GOODS_RECEIVED` → cộng `physicalQty` tại vị trí đã chọn.
8. **Ghi lịch sử giao dịch:** Record trong `invent_trans` loại RECEIPT.
9. **Một PO có thể có nhiều Receipt:** Nhập nhiều chuyến xe cho cùng 1 PO.

---

## Trạng thái triển khai

| Bước | Trạng thái | Ghi chú |
|------|-----------|---------|
| 1. Tạo PO | ✅ Đã triển khai | CRUD + confirm/cancel/close |
| 2. Xác nhận PO | ✅ Đã triển khai | |
| 3. Tạo Receipt (ASN) | ✅ Đã triển khai | Multi-line, liên kết PO |
| 4. Xác nhận Receipt | ✅ Đã triển khai | DRAFT → AWAITING_WEIGHING |
| 5. Tạo phiếu cân | ✅ Đã triển khai | Trạm cân, loại Cân vào |
| 6. Cân lần 1 (Gross) | ✅ Đã triển khai | Weighbridge WEIGH_IN |
| 7. Dỡ hàng (Unloading) | ✅ Đã triển khai | Chọn vị trí dỡ, dropdown locations |
| 8. Cân lần 2 (Tare) | ✅ Đã triển khai | Validation chưa dỡ xong → block |
| 9. Cộng tồn kho | ✅ Đã triển khai | Post GOODS_RECEIVED → cộng on_hand |
| 10. Tolerance check | ✅ Đã triển khai | Auto accept/reject |

---

## So sánh Loading (Outbound) vs Unloading (Inbound)

| | Loading (Outbound) | Unloading (Inbound) |
|--|---------------------|---------------------|
| Hành động | Lấy hàng từ kho → xếp lên xe | Lấy hàng từ xe → dỡ vào kho |
| Vị trí | Chọn vị trí **lấy** hàng (có tồn kho) | Chọn vị trí **dỡ** hàng (trong kho) |
| Dropdown filter | Vị trí có `availableQty > 0` cho item | Tất cả vị trí active trong kho |
| Inventory | Trừ tồn kho (ISSUE/DEDUCTED) | Cộng tồn kho (RECEIPT/RECEIVED) |
| Cân trước | Tare (xe rỗng) | Gross (xe có hàng) |
| Cân sau | Gross (xe có hàng) | Tare (xe rỗng) |
| Event code | SHIP_CONFIRMED | GOODS_RECEIVED |
| dim | dimFrom (vị trí lấy) | dimTo (vị trí dỡ) |
