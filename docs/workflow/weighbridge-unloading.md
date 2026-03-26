# Luồng Trạm Cân + Dỡ Hàng (Weighbridge & Unloading Workflow)

> **Last Updated:** 2026-03-27
> **Backend Docs:** [`backend/docs/module-8-weighbridge.md`](../../backend/docs/module-8-weighbridge.md)
> **Database Docs:** [`backend/prisma/docs/module-8-weighbridge.md`](../../backend/prisma/docs/module-8-weighbridge.md)
> **Inbound Docs:** [`docs/workflow/inbound.md`](./inbound.md)

---

## Tổng quan

Trạm cân và Dỡ hàng là 2 trang hoạt động **xen kẽ** trong luồng nhập kho multi-item. Mỗi vòng lặp: **Dỡ 1 item → Cân → Dỡ item tiếp → Cân → ... → Cân cuối (tare)**.

### Đặc điểm N+1 lần cân

- N items trên xe → cần N+1 lần cân
- Lần 1 = Gross (xe đầy hàng)
- Lần 2..N = Intermediate (sau mỗi lần dỡ 1 item)
- Lần N+1 = Tare (xe rỗng, lần cuối)
- **Net mỗi item = TL lần trước − TL lần này**

---

## Luồng chi tiết

### Bước 1: Tạo phiếu cân (Trạm cân)

**Màn hình:** `/app/weighbridge` → Nút "Tạo phiếu cân"

**Form:**
- Chọn ASN (phiếu nhập đã xác nhận)
- Kho, Xe, Chủ hàng: auto-fill từ ASN
- Hiển thị bảng **tất cả items** từ ASN (không chọn 1 item)
- Ghi chú: "Phiếu cân áp dụng cho tất cả N mặt hàng"

**Side effect:** Receipt: CONFIRMED → AWAITING_WEIGHING

### Bước 2: Xác nhận phiếu cân (Trạm cân)

**Hành động:** Nút ✓ (chấp nhận) trên danh sách phiếu cân

**Side effect:**
- Phiếu cân: RECEIVED → VALIDATED
- Receipt: AWAITING_WEIGHING → WEIGHING_1

### Bước 3: Cân lần 1 — Gross (Trạm cân)

**Hành động:** Nút cân (⚖) → Modal "Cân lần 1"

**Modal hiển thị:**
- Thông tin xe, chủ hàng, phiếu nhập
- Danh sách items trên xe (badges)
- Ghi chú: "Cân lần 1 ghi TL tổng (xe + tất cả hàng). Phân bổ từng item khi dỡ hàng."
- Input: Trọng lượng lần 1 (KG)

**Side effect:**
- Tạo WeighbridgeWeightRecord #1 (sequence=1, gross)
- Log: grossWeightKg = input
- Receipt: → UNLOADING

### Bước 4: Dỡ hàng (Trang Dỡ hàng)

**Màn hình:** `/app/inbound-operations/unloading`

**Quy trình:**
1. Chọn phiếu nhập bên trái (trạng thái "Đang dỡ")
2. Mục "Trên xe": hiển thị items chưa dỡ (OPEN)
3. Chọn vị trí dỡ (dropdown filter theo kho của receipt, chỉ STORAGE + RECEIVING)
4. Bấm "Dỡ xuống kho" → Modal xác nhận: "Xác nhận dỡ {item} xuống vị trí {location}?"
5. Bấm "Xác nhận dỡ hàng"

**Side effect:** Receipt Line: OPEN → UNLOADED (ghi `location_id`)

**Sau khi dỡ:**
- Item chuyển sang mục "Đã dỡ — chờ cân" (vàng, có nút Hoàn tác)
- Thông báo cam: "Đã dỡ {item name} xuống kho. Đưa xe đến Trạm cân..."
- Link: "Đến Trạm cân →"

**Quy tắc:**
- Chỉ dỡ 1 item mỗi lần (nếu đã có item UNLOADED → block "Đưa xe đi cân trước")
- Dropdown vị trí chỉ hiện STORAGE + RECEIVING locations thuộc kho receipt

### Bước 5: Cân lần 2+ — Intermediate (Trạm cân)

**Hành động:** Quay lại `/app/weighbridge` → Nút cân (⚖) → Modal "Cân lần 2"

**Modal hiển thị:**
- TL lần trước (đã ghi nhận): **900 KG** (không phải gross 1000 — là TL lần cân gần nhất)
- Card xanh: "Hàng vừa dỡ — lần cân này tính cho: **RICE-JB — Gạo xuất khẩu (Jumbo)**"
- Công thức: "TL ròng = 900 KG (lần 1) − TL lần 2"
- Input: Trọng lượng (KG)
- Preview: "TL hàng ròng (dự kiến): **100 KG** = 900 − 800"

**Validations frontend:**
- Nếu chưa dỡ hàng → cảnh báo đỏ: "Chưa dỡ mặt hàng nào" + link Dỡ hàng → nút Ghi nhận **disabled**
- TL phải < TL lần trước → error message

**Validations backend:**
- Phải có ≥1 line UNLOADED: `BadRequestException('Chưa dỡ mặt hàng nào...')`
- weightKg < previousWeight: `BadRequestException('Trọng lượng phải nhỏ hơn...')`

**Side effect:**
- Tạo WeighbridgeWeightRecord #N (net = previous - current, unloadedLineIds)
- Receipt Lines UNLOADED → RECEIVED (receivedQty = net)
- **Post GOODS_RECEIVED ngay** → cộng tồn kho
- Update PO totalReceivedQty

### Bước 6: Lặp lại Bước 4-5

Quay lại Dỡ hàng → dỡ item tiếp → quay lại Trạm cân → cân tiếp...

### Bước 7: Cân lần cuối — Tare (Trạm cân)

Khi tất cả items đã dỡ (không còn line OPEN), lần cân tiếp là lần cuối.

**Side effect:**
- `isFinal = true`
- Item cuối: UNLOADED → RECEIVED
- Receipt: UNLOADING → **COMPLETED**
- Phiếu cân: → **COMPLETED**
- Log: tareWeightKg, netWeightKg (total)

---

## Sơ đồ xen kẽ Trạm cân ↔ Dỡ hàng

```
TRẠM CÂN                              DỠ HÀNG
─────────                              ────────
1. Tạo phiếu cân
2. Xác nhận
3. Cân lần 1 (Gross: 1000 kg)
                                       4. Dỡ item A → WH01-A-02
                                          "Đưa xe đến Trạm cân →"
5. Cân lần 2 (900 kg)
   → Net A = 1000 - 900 = 100 kg
   → A: RECEIVED ✓
   → Post inventory: +100 kg
                                       6. Dỡ item B → WH01-B-01
                                          "Đưa xe đến Trạm cân →"
7. Cân lần 3 / Tare (850 kg)
   → Net B = 900 - 850 = 50 kg
   → B: RECEIVED ✓
   → Post inventory: +50 kg
   → Receipt: COMPLETED
   → Total net: 1000 - 850 = 150 kg
```

---

## Chi tiết phiếu cân (ViewWeighTicketModal)

Bảng per-item với TL cân trước/sau:

| STT | Mặt hàng | TL cân trước | TL cân sau | TL ròng | Trạng thái |
|-----|----------|-------------|-----------|---------|-----------|
| 1 | Gạo xuất khẩu (RICE-JB) | 1.000 Kg | 900 Kg | 100 Kg | Đã nhận |
| 2 | Clinker xi măng (CLINKER) | 900 Kg | 850 Kg | 50 Kg | Đã nhận |
| **Tổng** | | **1.000 Kg** | **850 Kg** | **150 Kg** | |

**Logic tính:** `runningWeight` bắt đầu từ gross, mỗi item received trừ `receivedQty`.

---

## Xóa phiếu cân (Soft Delete)

**Điều kiện:** Chỉ ở trạng thái "Tạo mới" (RECEIVED)

**UI:** Nút 🗑 → Modal confirm styled (không dùng window.confirm):
- "Bạn có chắc muốn xóa phiếu cân này?"
- "Phiếu nhập liên kết sẽ quay về trạng thái Đã xác nhận."

**Side effect:**
- Phiếu cân: RECEIVED → REJECTED (callbackError='SOFT_DELETED')
- Receipt: AWAITING_WEIGHING → CONFIRMED
- Sau xóa: invalidate cả weighbridge logs + inbound receipts → dropdown ASN xuất hiện lại

---

## Dropdown vị trí dỡ hàng

**Backend:** `GET /inbound/receipts/:id/locations-available`

**Filter:**
```sql
WHERE warehouse_id = receipt.warehouse_id
  AND is_active = true
  AND status = 'OK'
  AND location_type IN ('STORAGE', 'RECEIVING')
ORDER BY location_code ASC
```

Loại bỏ: VIRTUAL, QC, SHIPPING, STAGING, DAMAGED

**Frontend hiển thị:** `WH01-A-01 (STORAGE) — 200.000 kg`

---

## Trạng thái tổng hợp

### Phiếu cân (M8WeighbridgeLog)

```
RECEIVED ──confirm──> VALIDATED ──cân lần 1──> WEIGHING
  ──cân lần 2+──> WEIGHING
  ──cân lần cuối──> COMPLETED
RECEIVED ──reject/delete──> REJECTED
```

### Receipt (liên quan trạm cân)

```
CONFIRMED ──tạo phiếu cân──> AWAITING_WEIGHING
  ──xác nhận phiếu cân──> WEIGHING_1
  ──cân gross──> UNLOADING
  ──cân tare (final)──> COMPLETED
AWAITING_WEIGHING ──xóa/từ chối phiếu cân──> CONFIRMED
```

### Receipt Line (liên quan dỡ hàng + cân)

```
OPEN ──dỡ xuống kho──> UNLOADED ──cân xong──> RECEIVED
UNLOADED ──hoàn tác──> OPEN
```
