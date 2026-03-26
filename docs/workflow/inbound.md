# Luồng Vận Hành Nhập Kho (Inbound Workflow)

## Tổng quan

Hệ thống mô phỏng hoạt động nhập hàng vào kho trung gian (transit warehouse). Chủ hàng (Owner) gửi hàng đến kho bằng xe tải/tàu. Xe vào kho **đã có hàng sẵn**, cần cân → dỡ hàng xuống vị trí kho → cân lại → tính khối lượng tịnh → cộng tồn kho.

**Đặc điểm quan trọng:** Nếu xe chở **N loại hàng** → cần **N+1 lần cân**. Giữa mỗi 2 lần cân phải dỡ **đúng 1 item**. Net weight = lần cân trước − lần cân sau.

**So sánh với luồng xuất (Outbound):**

| | Nhập kho (Inbound) | Xuất kho (Outbound) |
|--|---------------------|---------------------|
| Đơn hàng | PO (Purchase Order) | SO (Sales Order) |
| Phiếu | ASN / Receipt | SHP (Shipment) |
| Cân lần 1 | **Gross** (xe có hàng) | Tare (xe rỗng) |
| Thao tác hàng | **Dỡ hàng** xuống kho | Xếp hàng lên xe |
| Số lần cân | **N+1** (N = số item) | 2 (tare + gross) |
| Tồn kho | **Cộng** physicalQty | Trừ physicalQty |
| Loại cân | WEIGH_IN | WEIGH_OUT |
| Inventory posting | **Ngay sau mỗi lần cân** | Sau cân lần 2 |

---

## Các bước chi tiết

### Bước 1: Tạo Đơn Nhập Hàng (Purchase Order — PO)

**Màn hình:** Vận hành nhập > Đơn nhập hàng (`/app/inbound-operations/purchase-orders`)

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Loại PO | Đường thủy (SEA) / Đường bộ (LAND) | Đường bộ |
| Chủ hàng | Owner sẽ nhập hàng vào kho | OWN-001 — Thoresen Vietnamese Logistics |
| Nhà cung cấp | Vendor gửi hàng | VND-004 — Vận tải Phú Mỹ |
| Kho hàng | Kho thuộc chủ hàng (có thể chọn nhiều) | WH-01 — Kho 1 Hàng rời |
| Số PO | Tự động sinh | PO-20260325-002 |
| Ghi chú | Tùy chọn | — |

**Logic filter cascade trên form PO:**

```
Chủ hàng (Owner)
  └─► Kho hàng: chỉ hiện kho có owner_id = ownerId đã chọn
        └─► Mặt hàng: chỉ hiện items thuộc nhóm hàng hóa (item_group)
              được phép ở các kho đã chọn (qua junction table md_item_group_warehouse)
              └─► ĐVT: tự động fill từ base_uom_id của mặt hàng (không cho đổi, phải sửa ở Master Data)
```

**Chi tiết cascade:**

1. **Chọn Chủ hàng** → dropdown Kho filter theo `md_warehouse.owner_id = ownerId`. Reset kho + dòng hàng.
2. **Chọn Kho** (1 hoặc nhiều) → gọi API `GET /lookups/item-group-ids-by-warehouses?warehouseIds=id1,id2` → trả về danh sách `itemGroupId` được phép từ junction table `md_item_group_warehouse`. Reset dòng hàng.
3. **Mặt hàng** trong dòng hàng chỉ hiện items có `item_group_id` nằm trong danh sách được phép.
4. **ĐVT** tự động fill từ `base_uom_id` của mặt hàng. Dropdown ĐVT bị **disabled** — muốn đổi phải sửa ở Master Data > Mặt hàng.

**Chi tiết hàng hóa (PO Lines):** Có thể thêm nhiều dòng

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Mã hàng hóa | Mặt hàng nhập (filter theo kho → nhóm hàng) | DAP-50 — Phân DAP bao 50kg |
| SL dự kiến | Số lượng dự kiến nhập | 100 |
| ĐVT | Tự động từ master data mặt hàng (disabled) | KG |

**Kết quả:** PO được tạo với trạng thái **NEW**.

---

### Bước 2: Xác nhận PO

**Trạng thái PO:** NEW → **CONFIRMED**

---

### Bước 3: Tạo Phiếu Nhập Kho (Receipt / ASN)

**Màn hình:** Vận hành nhập > Phiếu nhập kho (`/app/inbound-operations/receipts`)

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Số PO | Liên kết từ PO đã xác nhận | PO-20260325-002 |
| Loại phiếu | Tự động theo loại PO | Đường bộ |
| Số phiếu nhập | Tự động sinh | RCV-20260325-000003 |
| Kho nhập | Kho sẽ nhận hàng | MX-01 — Kho tổng hợp |
| Biển số xe | Xe chở hàng đến | 1123123 |

**Chi tiết phiếu nhập:** Kế thừa từ PO lines (có thể chỉnh sửa)

**Kết quả:** Receipt được tạo với trạng thái **NEW**.

---

### Bước 4: Xác nhận Phiếu Nhập

**Trạng thái Receipt:** NEW → **CONFIRMED**

---

### Bước 5: Tạo Phiếu Cân

**Màn hình:** Trạm cân (`/app/weighbridge`)

| Trường | Mô tả |
|--------|-------|
| Loại cân | **Cân vào** (WEIGH_IN) |
| Mã phiếu nhập | Receipt ở trạng thái CONFIRMED |
| Kho, Số xe, Chủ hàng | Tự động từ Receipt |

**Kết quả:** Phiếu cân tạo → Receipt tự động: CONFIRMED → **AWAITING_WEIGHING**

> Nếu phiếu cân bị hủy/reject → Receipt quay về **CONFIRMED**

---

### Bước 5b: Xác nhận Phiếu Cân

**Hành động:** Nhấn nút xác nhận (✓) trên phiếu cân.

**Trạng thái Receipt:** AWAITING_WEIGHING → **WEIGHING_1**

---

### Bước 6: Cân lần 1 — Gross (Xe có hàng)

Xe **đầy hàng** lên trạm cân → nhập trọng lượng. Đây là trọng lượng tổng (xe + tất cả hàng).

**Trạng thái Receipt:** → **UNLOADING** (Đang dỡ hàng)

**Hệ thống tạo WeighbridgeWeightRecord #1** (sequence=1, gross).

> Sau bước này, xe quay lại kho để bắt đầu dỡ hàng.

---

### Bước 7: Vòng lặp Dỡ hàng — Cân (lặp N lần)

**Đây là bước cốt lõi cho multi-item.** Mỗi vòng lặp gồm 2 bước:

#### 7a. Dỡ 1 item xuống kho

**Màn hình:** Vận hành nhập > Dỡ hàng (`/app/inbound-operations/unloading`)

- Chọn phiếu nhập từ danh sách bên trái
- Hệ thống hiện **lịch sử cân** và danh sách items theo nhóm:
  - **Trên xe** (OPEN) — chọn vị trí + bấm "Dỡ xuống kho"
  - **Đã dỡ — chờ cân** (UNLOADED) — không thể dỡ thêm cho đến khi cân
  - **Đã hoàn thành** (RECEIVED) — hiển thị net weight

**Quy tắc:** Chỉ cho dỡ **1 item mỗi lần**. Sau khi dỡ, phải đưa xe đi cân rồi mới dỡ tiếp.

**Receipt Line:** OPEN → **UNLOADED** (ghi `locationId` vị trí dỡ)

#### 7b. Cân lần N (intermediate)

**Màn hình:** Trạm cân (`/app/weighbridge`)

- Modal hiện: "Cân lần N" với **trọng lượng lần gần nhất** (không phải lần 1)
- Nhập trọng lượng → hệ thống tính: **Net = lần trước − lần này**

**Validation:**
- Phải có ít nhất 1 line UNLOADED (đã dỡ nhưng chưa cân)
- Trọng lượng phải nhỏ hơn lần trước (vì xe nhẹ dần)

**Sau khi ghi cân:**
1. Line UNLOADED → **RECEIVED** (ghi `receivedQty` = net weight)
2. **Post `GOODS_RECEIVED` ngay** → cộng tồn kho tại vị trí đã dỡ
3. **Update PO `totalReceivedQty`** ngay
4. Ghi lịch sử giao dịch vào `invent_trans`
5. Tạo WeighbridgeWeightRecord (sequence, weightKg, netWeightKg, unloadedLineIds)

> **Lặp lại 7a → 7b** cho đến khi hết items trên xe.

---

### Bước 8: Cân lần cuối — Tare (Xe rỗng)

Khi **tất cả items đã dỡ** (không còn line OPEN), lần cân tiếp là lần cuối.

**Sau khi ghi cân lần cuối:**
1. Net item cuối = lần trước − lần này
2. Line cuối → RECEIVED + post inventory
3. Receipt → **COMPLETED**
4. Phiếu cân → COMPLETED
5. Update `grossWeightKg` = lần 1, `tareWeightKg` = lần cuối, `netWeightKg` = tổng

---

## Ví dụ minh họa — 3 items

ASN có: Phân DAP (A), Bắp vàng (B), Phân NPK (C). Xe số 1123123.

```
Lần cân 1 (Gross):  1.000 kg    ← Xe đầy A+B+C        [ASN: UNLOADING]
  → Dỡ Bắp vàng (B) → OY02-STG-01                     [Line B: UNLOADED]
Lần cân 2:            993 kg    → Net B = 1.000 - 993 = 7 kg
  → Post GOODS_RECEIVED B: 7 kg                        [Line B: RECEIVED ✓]
  → Dỡ Phân DAP (A) → OY02-STG-01                     [Line A: UNLOADED]
Lần cân 3:            983 kg    → Net A = 993 - 983 = 10 kg
  → Post GOODS_RECEIVED A: 10 kg                       [Line A: RECEIVED ✓]
  → Dỡ Phân NPK (C) → OY02-STG-01                     [Line C: UNLOADED]
Lần cân 4 (Tare):     968 kg    → Net C = 983 - 968 = 15 kg
  → Post GOODS_RECEIVED C: 15 kg                       [Line C: RECEIVED ✓]
  → ASN: COMPLETED                                      Tổng net = 32 kg
```

---

## Sơ đồ trạng thái

### Receipt (ASN)

```
NEW ──xác nhận──> CONFIRMED ──tạo phiếu cân──> AWAITING_WEIGHING ──xác nhận phiếu cân──> WEIGHING_1
 ↓                    ↓         ↑ (hủy phiếu cân)                                           ↓
CANCELLED         CANCELLED                                                          (ghi cân lần 1 gross)
                                                                                             ↓
                                                                                         UNLOADING
                                                                                      (dỡ 1 item → cân → dỡ 1 item → cân → ...)
                                                                                             ↓
                                                                                    (cân lần cuối, hết items)
                                                                                             ↓
                                                                                         COMPLETED → CLOSED
```

### Receipt Line

```
OPEN ──dỡ xuống kho──> UNLOADED ──cân xong (net tính)──> RECEIVED
 ↓
CANCELLED
```

> Không dùng WEIGHED — line chuyển thẳng UNLOADED → RECEIVED vì inventory post ngay.

### WeighbridgeWeightRecord (N+1 records per phiếu cân)

```
#1: Gross (sequence=1, isFinal=false, netWeightKg=null)
#2: Intermediate (sequence=2, isFinal=false, netWeightKg=lần1-lần2, unloadedLineIds=[B])
#3: Intermediate (sequence=3, isFinal=false, netWeightKg=lần2-lần3, unloadedLineIds=[A])
#4: Tare (sequence=4, isFinal=true, netWeightKg=lần3-lần4, unloadedLineIds=[C])
```

---

## Flow UI — Trang Dỡ hàng

```
┌──────────────────────────────────────────────────────────────────┐
│ RCV-20260325-000003    Xe: 1123123              Status: UNLOADING│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Lịch sử cân (2 lần)                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Lần 1:  1.000 kg  (Gross)                                 │  │
│  │ Lần 2:    993 kg              Net: 7 kg                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Trên xe (2)                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Đã dỡ 1 mặt hàng. Vui lòng đưa xe đi cân trước khi     │  │
│  │  dỡ tiếp.                                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  (hoặc nếu chưa dỡ: hiện dropdown chọn vị trí + nút Dỡ)       │
│                                                                  │
│  Đã dỡ — chờ cân (1)     ← item đã dỡ nhưng chưa cân          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Phân DAP (DAP-50)  → OY02-STG-01          [Hoàn tác]     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ⚠ Vui lòng đưa xe đến Trạm cân để tính khối lượng             │
│                                                                  │
│  Đã hoàn thành (1)                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bắp vàng (CORN-YELLOW) → OY02-STG-01       Net: 7 kg     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quy tắc nghiệp vụ

1. **N items → N+1 lần cân:** Mỗi lần dỡ 1 item, cân 1 lần. Net = lần trước − lần sau.
2. **Chỉ dỡ 1 item mỗi lần:** Sau khi dỡ 1 item, phải đưa xe đi cân trước khi dỡ tiếp.
3. **Cân gross bắt buộc trước dỡ:** Chưa cân lần 1 → không cho dỡ.
4. **Phải dỡ trước khi cân tiếp:** Giữa 2 lần cân phải có ≥ 1 line UNLOADED.
5. **Xe nhẹ dần:** Trọng lượng mỗi lần cân phải nhỏ hơn lần trước.
6. **Inventory post ngay:** Sau mỗi lần cân (không đợi lần cuối), post `GOODS_RECEIVED` → cộng tồn kho tại vị trí dỡ.
7. **PO update ngay:** `totalReceivedQty` trên PO được cập nhật sau mỗi lần cân.
8. **Backward compatible:** Single-item vẫn hoạt động (1 item = 2 lần cân: gross + tare).
9. **Tổng net = Gross − Tare:** SUM(net từng item) = cân lần 1 − cân lần cuối.

---

## Trạng thái triển khai

| Bước | Trạng thái | Ghi chú |
|------|-----------|---------|
| 1. Tạo PO | ✅ | CRUD + confirm/cancel/close |
| 2. Xác nhận PO | ✅ | |
| 3. Tạo Receipt (ASN) | ✅ | Multi-line, liên kết PO |
| 4. Xác nhận Receipt | ✅ | NEW → CONFIRMED |
| 5. Tạo phiếu cân | ✅ | CONFIRMED → AWAITING_WEIGHING |
| 5b. Xác nhận phiếu cân | ✅ | AWAITING_WEIGHING → WEIGHING_1 |
| 6. Cân lần 1 (Gross) | ✅ | → UNLOADING + WeighbridgeWeightRecord #1 |
| 7. Dỡ hàng + Cân intermediate | ✅ | N lần: dỡ 1 item → cân → post inventory ngay |
| 8. Cân lần cuối (Tare) | ✅ | → COMPLETED |
| 9. Cộng tồn kho | ✅ | Post GOODS_RECEIVED ngay mỗi lần cân |
| 10. Update PO | ✅ | totalReceivedQty cập nhật ngay |

---

## Thay đổi Database

| Bảng | Field | Mô tả |
|------|-------|-------|
| `receipt_line` | `location_id` (FK) | Vị trí dỡ hàng |
| `receipt_line` | `unload_sequence_no` | Thứ tự dỡ |
| `receipt_line` | `weigh_sequence_no` | Lần cân nào tính net |
| `ReceiptLineStatus` | `UNLOADED`, `WEIGHED` | Trạng thái mới (WEIGHED không dùng — line → RECEIVED trực tiếp) |
| `weighbridge_weight_record` | **(bảng mới)** | Ghi mỗi lần cân: sequence, weightKg, netWeightKg, unloadedLineIds, isFinal |
| `m8_weighbridge_log` | `weightRecords[]` relation | 1-N relation đến WeighbridgeWeightRecord |

---

## So sánh Single-Item vs Multi-Item

| | Single-Item | Multi-Item |
|--|------------|-----------|
| Số lần cân | 2 (gross + tare) | N+1 |
| Phân bổ net | Toàn bộ = gross − tare | Mỗi item = lần trước − lần sau |
| Dỡ hàng | Dỡ tất cả → cân tare | Dỡ 1 item → cân → dỡ 1 item → cân → ... |
| ASN status | UNLOADING → COMPLETED | UNLOADING suốt → COMPLETED khi cân cuối |
| Inventory posting | 1 lần sau cân tare | Mỗi lần cân → post ngay |
| PO update | 1 lần | Mỗi lần cân → update ngay |

---

## Master Data — Quan hệ dữ liệu nền phục vụ Inbound

### Mô hình quan hệ

```
MdOwner (Chủ hàng)
  │
  ├── 1:N ──► MdWarehouse (Kho hàng)          via md_warehouse.owner_id
  │               │
  │               └── M:N ──► MdItemGroup      via md_item_group_warehouse (junction)
  │                               │
  │                               └── 1:N ──► MdItem (Mặt hàng)  via md_item.item_group_id
  │                                               │
  │                                               └── FK ──► MdUom (ĐVT)  via md_item.base_uom_id
  │
  └── (cũ) M:N ──► MdOwnerWarehouseAccess     (phân quyền truy cập, không dùng cho filter PO)
```

### Bảng junction: `md_item_group_warehouse`

Cho phép **1 nhóm hàng hóa thuộc nhiều kho** và **1 kho chứa nhiều nhóm hàng**:

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | UUID PK | |
| `item_group_id` | UUID FK → `md_item_groups.id` | Nhóm hàng hóa |
| `warehouse_id` | UUID FK → `md_warehouse.id` | Kho hàng |
| `created_at` | TIMESTAMPTZ | |

**UNIQUE constraint:** `(item_group_id, warehouse_id)`

### Bảng: `md_warehouse` — field `owner_id`

| Field | Type | Mô tả |
|-------|------|-------|
| `owner_id` | UUID FK → `md_owner.id` (nullable) | Chủ kho — xác định kho này thuộc owner nào |

### Ví dụ dữ liệu seed

**Chủ hàng → Kho:**

| Owner | Kho |
|-------|-----|
| OWN-001 (TVL) | WH-01 (Hàng rời), WH5.1 |
| OWN-002 (NSMT) | WH-02 (Hàng bao) |
| OWN-003 (TTCV) | WH-04 (Ngoại quan) |
| OWN-004 (PVFCCo) | WH-03 (Phân bón) |
| OWN-005 (COFCO) | OY-02 (Container) |
| OWN-006 (VNSteel) | OY-01 (Thép & Sắt) |
| OWN-007 (HCDA) | MX-01 (Tổng hợp) |

**Nhóm hàng → Kho (junction):**

| Nhóm hàng | Kho được phép |
|-----------|--------------|
| GRP-RICE (Lúa gạo) | WH-01, WH-02 |
| GRP-RICE-B (Gạo đóng bao) | WH-02 |
| GRP-FERT (Phân bón) | WH-03 |
| GRP-STEEL (Thép) | OY-01, OY-02 |
| GRP-CHEM (Hóa chất) | MX-01, WH-04 |
| GRP-BULK (Hàng rời tổng hợp) | WH-01, MX-01 |
| GRAIN (Nông sản hạt) | WH-01, WH-02 |
| FEED (Thức ăn chăn nuôi) | WH-02, WH-01 |

### API Lookup phục vụ cascade filter

| Endpoint | Params | Response | Mục đích |
|----------|--------|----------|----------|
| `GET /lookups/warehouses` | — | `[{ id, code, name, extra: { warehouseType, ownerId } }]` | Filter kho theo owner |
| `GET /lookups/item-group-ids-by-warehouses` | `warehouseIds=id1,id2` | `["groupId1", "groupId2", ...]` | Lấy nhóm hàng được phép ở kho |
| `GET /lookups/items` | — | `[{ id, code, name, extra: { cargoForm, itemGroupId, baseUomId, billingUomId } }]` | Filter item theo nhóm hàng + autofill ĐVT |
