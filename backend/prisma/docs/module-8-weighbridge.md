# Module 8: Trạm Cân (Weighbridge) — Database Documentation

> **Module:** M8 - Integration Platform / Weighbridge
> **Database:** PostgreSQL
> **ORM:** Prisma
> **Last Updated:** 2026-03-27

---

## 1. Tổng quan

Module 8 sử dụng 4 bảng chính:

| Table | Mục đích | Record Type |
|-------|----------|-------------|
| `m8_weighbridge_log` | Phiếu cân chính | Runtime |
| `weighbridge_weight_record` | Ghi từng lần cân (N+1) | Runtime |
| `m8_weighbridge_event_state` | Trạng thái xử lý phiếu cân | Control |
| `m8_weighbridge_device` | Thiết bị cân | Config |

---

## 2. Enums

### 2.1 M8WeighingType
```
WEIGH_IN   - Cân vào (inbound: xe đầy → dỡ hàng → xe nhẹ dần)
WEIGH_OUT  - Cân ra (outbound: xe rỗng → xếp hàng → xe nặng dần)
```

### 2.2 M8WeighEventProcessingStatus
```
RECEIVED   - Tạo mới (chưa xác nhận)
VALIDATED  - Đã xác nhận (sẵn sàng cân)
WEIGHING   - Đang cân (đã ghi ≥1 lần cân)
COMPLETED  - Hoàn thành (tất cả items đã cân)
REJECTED   - Từ chối / Soft-deleted
LINKED     - Đã liên kết
FAILED     - Thất bại
DUPLICATE  - Trùng lặp
```

### 2.3 M8CallbackStatus
```
PENDING     - Chờ callback
PROCESSING  - Đang xử lý
SUCCEEDED   - Thành công
FAILED      - Thất bại
DEAD_LETTER - Hết retry
```

### 2.4 M8LogMode
```
WEIGHING   - Cân thông thường
CHECK_IN   - Chỉ check-in (không cân)
```

---

## 3. Chi tiết bảng

### 3.1 `m8_weighbridge_log`

**Mục đích:** Phiếu cân chính — 1 record per xe/phiếu nhập

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `weighbridge_event_id` | VARCHAR(100) | NO | Mã phiếu cân (unique, auto-gen) |
| `receipt_id` | UUID | YES | FK → `receipt_header` (inbound) |
| `shipment_id` | UUID | YES | FK → `shipment_header` (outbound) |
| `vehicle_number` | VARCHAR(50) | NO | Biển số xe |
| `weighing_type` | ENUM | NO | `WEIGH_IN` / `WEIGH_OUT` |
| `weighing_sequence` | INT | NO | Sequence cân |
| `gross_weight_kg` | DECIMAL(18,3) | YES | TL gross (lần 1) |
| `tare_weight_kg` | DECIMAL(18,3) | YES | TL tare (lần cuối) |
| `net_weight_kg` | DECIMAL(18,3) | YES | TL ròng tổng (gross - tare) |
| `warehouse_id` | UUID | YES | FK → `md_warehouse` |
| `owner_id` | UUID | YES | FK → `md_owner` (manual entry) |
| `item_code` | VARCHAR(50) | YES | Mã hàng (legacy single-item) |
| `notes` | TEXT | YES | Ghi chú |
| `gross_weight_at` | TIMESTAMP | YES | Thời gian cân gross |
| `tare_weight_at` | TIMESTAMP | YES | Thời gian cân tare |
| `is_manual_entry` | BOOLEAN | NO | Tạo thủ công? |
| `manual_reason_code` | VARCHAR(50) | YES | Lý do tạo thủ công |
| `source_channel` | VARCHAR(30) | NO | Kênh nguồn (WEB_MANUAL, AUTO, etc.) |
| `external_id` | VARCHAR(100) | NO | ID ngoại |
| `correlation_id` | UUID | NO | Correlation ID |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |
| `created_by` | VARCHAR(100) | NO | Người tạo |

**Indexes:**
- `UNIQUE(weighbridge_event_id)`
- `INDEX(receipt_id)`
- `INDEX(shipment_id)`
- `INDEX(vehicle_number, created_at DESC)`
- `INDEX(correlation_id)`

**Relations:**
- `eventState` → `m8_weighbridge_event_state` (1:1)
- `weightRecords` → `weighbridge_weight_record[]` (1:N, ordered by sequence)
- `device` → `m8_weighbridge_device`

---

### 3.2 `weighbridge_weight_record`

**Mục đích:** Ghi từng lần cân trong flow N+1 (multi-item inbound)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `weighbridge_log_id` | UUID | NO | FK → `m8_weighbridge_log` |
| `sequence` | INT | NO | Thứ tự lần cân (1 = gross, 2..N = intermediate, N+1 = tare) |
| `weight_kg` | DECIMAL(18,3) | NO | Trọng lượng lần cân này |
| `recorded_at` | TIMESTAMP | NO | Thời gian ghi |
| `unloaded_line_ids` | JSON | YES | UUID[] các receipt lines đã dỡ trước lần cân này |
| `net_weight_kg` | DECIMAL(18,3) | YES | TL ròng = lần trước - lần này |
| `is_final` | BOOLEAN | NO | Lần cân cuối (tare)? |
| `created_at` | TIMESTAMP | NO | Thời gian tạo |

**Indexes:**
- `UNIQUE(weighbridge_log_id, sequence)` - 1 sequence per log
- `INDEX(weighbridge_log_id)`

**Ghi chú:**
- Lần 1 (gross): `net_weight_kg = NULL`, `unloaded_line_ids = NULL`, `is_final = false`
- Lần 2..N (intermediate): `net_weight_kg = previous - current`, `unloaded_line_ids = [lineId]`
- Lần N+1 (tare): `is_final = true`, hàng cuối cùng

**Ví dụ 3 items:**

| sequence | weight_kg | net_weight_kg | unloaded_line_ids | is_final |
|----------|-----------|---------------|-------------------|----------|
| 1 | 1000 | NULL | NULL | false |
| 2 | 900 | 100 | [lineA] | false |
| 3 | 750 | 150 | [lineB] | false |
| 4 | 700 | 50 | [lineC] | true |

---

### 3.3 `m8_weighbridge_event_state`

**Mục đích:** Trạng thái xử lý phiếu cân (1:1 với log)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `weighbridge_log_id` | UUID | NO | FK → `m8_weighbridge_log` (unique) |
| `processing_status` | ENUM | NO | Trạng thái xử lý |
| `linked_module` | VARCHAR(20) | YES | Module đã liên kết |
| `linked_object_id` | UUID | YES | ID object đã liên kết |
| `callback_status` | ENUM | YES | Trạng thái callback |
| `callback_error` | TEXT | YES | Lỗi callback (hoặc 'SOFT_DELETED') |
| `retry_count` | INT | NO | Số lần retry |
| `updated_at` | TIMESTAMP | NO | Thời gian cập nhật |

**State Transitions:**
```
RECEIVED ──confirm──> VALIDATED ──record gross──> WEIGHING
  ──record intermediate──> WEIGHING (vẫn WEIGHING, chỉ thêm weight record)
  ──record tare (final)──> COMPLETED
RECEIVED ──reject──> REJECTED
RECEIVED ──soft delete──> REJECTED (callbackError='SOFT_DELETED')
```

---

## 4. Quan hệ với Module khác

### 4.1 Receipt Header (`receipt_header`)

| Event | Receipt status change | Ghi chú |
|-------|----------------------|---------|
| Tạo phiếu cân | CONFIRMED → AWAITING_WEIGHING | |
| Xác nhận phiếu cân | AWAITING_WEIGHING → WEIGHING_1 | |
| Cân gross (lần 1) | WEIGHING_1 → UNLOADING | |
| Cân intermediate/tare | UNLOADING → COMPLETED (nếu final) | |
| Xóa phiếu cân | AWAITING_WEIGHING → CONFIRMED | Cho phép tạo lại |
| Từ chối phiếu cân | AWAITING_WEIGHING → CONFIRMED | |

### 4.2 Receipt Line (`receipt_line`)

| Event | Line status change | Ghi chú |
|-------|-------------------|---------|
| Dỡ hàng (Unloading module) | OPEN → UNLOADED | Ghi `location_id` |
| Cân intermediate/tare | UNLOADED → RECEIVED | Ghi `received_qty`, `net_weight_kg` |
| Hoàn tác dỡ (Undo) | UNLOADED → OPEN | Xóa `location_id` |

### 4.3 Purchase Order (`purchase_orders`)

- `receipt_header.po_id` lưu **PO number** (VarChar), không phải UUID
- Khi update PO, phải query `purchaseOrder.findUnique({ where: { poNumber: receipt.poId } })` rồi dùng `po.id` (UUID) để update

### 4.4 Inventory Posting (M3)

- `GOODS_RECEIVED` post ngay sau mỗi lần cân intermediate/tare
- `dimTo.warehouseCode`, `dimTo.locationCode`, `dimTo.ownerCode` lấy từ receipt + line
- Mỗi line UNLOADED → RECEIVED đều trigger 1 inventory posting call

---

## 5. Data Flow — N+1 Weighing

```
                    WeighbridgeWeightRecord
m8_weighbridge_log ──┬── #1: gross  1000 kg
                     ├── #2: inter   900 kg  net=100  [lineA]
                     ├── #3: inter   750 kg  net=150  [lineB]
                     └── #4: tare    700 kg  net=50   [lineC] (final)

receipt_header:
  gross_weight_kg = 1000
  tare_weight_kg  = 700
  net_weight_kg   = 300 (1000-700)

receipt_line:
  lineA: RECEIVED, received_qty=100, net_weight_kg=100
  lineB: RECEIVED, received_qty=150, net_weight_kg=150
  lineC: RECEIVED, received_qty=50,  net_weight_kg=50
```
