# Module 8: Trạm Cân (Weighbridge) — Backend Documentation

> **Module:** M8 - Integration Platform / Weighbridge
> **Status:** ✅ Implemented (Multi-item N+1 weighing, soft delete, cascade filter)
> **Code Path:** `src/modules/integration-platform/`
> **Database Docs:** [`prisma/docs/module-8-weighbridge.md`](../prisma/docs/module-8-weighbridge.md)
> **Workflow Docs:** [`docs/workflow/weighbridge-unloading.md`](../docs/workflow/weighbridge-unloading.md)
> **Last Updated:** 2026-03-27

---

## 1. Mục đích Module

Module 8 quản lý **phiếu cân** (weighbridge ticket) và tích hợp trạm cân tự động/thủ công. Hỗ trợ:

- **Multi-item N+1 weighing:** 1 xe chở N items → cân N+1 lần (gross + N intermediate/tare)
- **Inventory posting tức thì:** Sau mỗi lần cân intermediate, tồn kho được cộng ngay
- **Liên kết Receipt/Shipment:** Phiếu cân gắn với phiếu nhập (inbound) hoặc phiếu xuất (outbound)
- **Soft delete:** Xóa phiếu cân ở trạng thái Tạo mới → revert receipt về CONFIRMED

---

## 2. Cấu trúc Code

```
src/modules/integration-platform/
├── controllers/
│   └── weighbridge.controller.ts       # REST endpoints
├── services/
│   ├── weighbridge-ingest.service.ts   # Ingest events (auto + manual)
│   ├── weighbridge-log.service.ts      # Log CRUD, recordWeight, softDelete
│   ├── weighbridge-device.service.ts   # Device heartbeat
│   └── weighbridge-cascading.service.ts # Cascading weigh chain
├── repositories/
│   ├── weighbridge-log.repository.ts   # Log CRUD + include weightRecords
│   └── weighbridge-event-state.repository.ts
├── dto/
│   └── weighbridge/
│       ├── create-weigh-event.dto.ts
│       └── weigh-log-query.dto.ts
└── errors/
    └── weighbridge.error.ts
```

---

## 3. API Endpoints

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/events` | Ingest weigh event (auto) | `INTEGRATION.WEIGHBRIDGE.INGEST` |
| POST | `/events/manual` | Tạo phiếu cân thủ công | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| GET | `/logs` | List phiếu cân (filter, paginate) | `INTEGRATION.WEIGHBRIDGE.READ` |
| GET | `/logs/:id` | Chi tiết phiếu cân | `INTEGRATION.WEIGHBRIDGE.READ` |
| PATCH | `/logs/:id` | Cập nhật ghi chú | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| POST | `/logs/:id/confirm` | Xác nhận phiếu cân (RECEIVED → VALIDATED) | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| POST | `/logs/:id/reject` | Từ chối phiếu cân | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| DELETE | `/logs/:id` | Soft delete phiếu cân (chỉ RECEIVED) | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| POST | `/logs/:id/record-weight` | Ghi nhận trọng lượng (lần 1..N+1) | `INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE` |
| POST | `/events/:id/reprocess` | Reprocess event | `INTEGRATION.WEIGHBRIDGE.REPROCESS` |
| GET | `/devices` | Danh sách thiết bị cân | `INTEGRATION.WEIGHBRIDGE_DEVICE.READ` |

> Base path: `/api/v1/integration/weighbridge`

---

## 4. Chi tiết API

### 4.1 POST `/events/manual` — Tạo phiếu cân thủ công

**Request Body:**
```json
{
  "weighbridgeEventId": "WB-EVT-17745...",
  "vehicleNumber": "19A-12333",
  "weighingType": "WEIGH_IN",
  "weighingSequence": 1,
  "isManualEntry": true,
  "manualReasonCode": "MANUAL_CREATE",
  "sourceChannel": "WEB_MANUAL",
  "eventTime": "2026-03-26T11:56:09.938Z",
  "referenceType": "RECEIPT",
  "referenceId": "uuid-receipt-id",
  "warehouseId": "uuid-warehouse-id",
  "ownerId": "uuid-owner-id",
  "notes": "Ghi chú"
}
```

**Frontend:** Modal "Tạo phiếu cân" không chọn 1 item mà hiển thị tất cả items từ ASN. Phiếu cân liên kết với cả receipt.

**Side effect:** Receipt chuyển từ CONFIRMED → AWAITING_WEIGHING.

### 4.2 POST `/logs/:id/confirm` — Xác nhận phiếu cân

**Side effect:**
- Phiếu cân: RECEIVED → VALIDATED
- Receipt: AWAITING_WEIGHING → WEIGHING_1

### 4.3 POST `/logs/:id/record-weight` — Ghi nhận trọng lượng

**Request Body:**
```json
{
  "weightKg": 900
}
```

**Logic phân luồng:**
- `weighingType === WEIGH_IN && receiptId` → gọi `recordInboundWeight()` (multi-item N+1)
- Còn lại → logic 2 lần cân (outbound)

### 4.4 DELETE `/logs/:id` — Soft delete

**Điều kiện:** Chỉ xóa phiếu cân ở trạng thái RECEIVED (Tạo mới).

**Side effect:**
- Phiếu cân: RECEIVED → REJECTED (callbackError = 'SOFT_DELETED')
- Receipt: AWAITING_WEIGHING → CONFIRMED (cho phép tạo lại phiếu cân)

---

## 5. Multi-item Inbound Weighing (N+1 lần cân)

### 5.1 Flow

```
Lần 1 (Gross):  recordInboundWeight()
  → Tạo WeighbridgeWeightRecord #1 (sequence=1, weightKg=1000)
  → Ghi grossWeightKg vào log
  → Receipt: → UNLOADING

[Dỡ hàng: user dỡ 1 item → line OPEN → UNLOADED]

Lần 2 (Intermediate):  recordInboundWeight()
  → Validation: phải có ≥1 line UNLOADED
  → Validation: weightKg < previousWeight (xe nhẹ dần)
  → net = previousWeight - weightKg
  → Tạo WeighbridgeWeightRecord #2 (net=100, unloadedLineIds=[lineA])
  → Line A: UNLOADED → RECEIVED (receivedQty = 100)
  → Post GOODS_RECEIVED ngay → cộng tồn kho
  → Update PO totalReceivedQty

[Dỡ hàng: user dỡ item tiếp]

Lần 3 (Tare / Final):  recordInboundWeight()
  → isFinal = true (no OPEN lines left)
  → Line B: UNLOADED → RECEIVED
  → Post GOODS_RECEIVED
  → Receipt: UNLOADING → COMPLETED
  → Log: tareWeightKg, netWeightKg (total), COMPLETED
```

### 5.2 Validations

| Validation | Khi nào | Error message |
|-----------|---------|---------------|
| Phải có line UNLOADED | Lần 2+ | `Chưa dỡ mặt hàng nào. Vui lòng dỡ ít nhất 1 mặt hàng trước khi cân tiếp.` |
| Xe nhẹ dần | Lần 2+ | `Trọng lượng (X kg) phải nhỏ hơn lần cân trước (Y kg) vì đã dỡ hàng.` |
| PO number format | Update PO | Tìm PO bằng `poNumber` (VarChar) rồi dùng `po.id` (UUID) để update |

### 5.3 Response enrichment

List logs (`GET /logs`) trả thêm:

| Field | Type | Mô tả |
|-------|------|-------|
| `lastWeightKg` | number | TL lần cân gần nhất (từ WeighbridgeWeightRecord cuối) |
| `weightRecordCount` | number | Số lần đã cân |
| `receipt` | object | `{ id, lines: [{ id, item, expectedQty, receivedQty, status, uomCode }] }` |

---

## 6. Frontend Integration

### 6.1 Tạo phiếu cân (CreateWeighTicketModal)

- Chọn ASN → auto-fill kho, xe, chủ hàng
- Hiển thị bảng tất cả items từ ASN (không chọn 1 item)
- Ghi chú: "Phiếu cân sẽ áp dụng cho tất cả N mặt hàng"

### 6.2 Modal cân (WeighingModal)

- **Lần 1:** Hiện danh sách items trên xe + ghi chú "Cân lần 1 ghi TL tổng"
- **Lần 2+:**
  - Hiện `lastWeightKg` (TL lần cân trước, VD: 900 KG — không phải gross 1000)
  - Hiện item đã dỡ (UNLOADED): "Hàng vừa dỡ — lần cân này tính cho: RICE-JB"
  - Nếu chưa dỡ hàng: **block** nhập + cảnh báo đỏ + link đến trang Dỡ hàng
  - Preview net weight: `previousWeight - inputWeight`

### 6.3 Chi tiết phiếu cân (ViewWeighTicketModal)

Bảng per-item:

| STT | Mặt hàng | TL cân trước | TL cân sau | TL ròng | Trạng thái |
|-----|----------|-------------|-----------|---------|-----------|
| 1 | RICE-JB | 1.000 Kg | 900 Kg | 100 Kg | Đã nhận |
| 2 | CLINKER | 900 Kg | 850 Kg | 50 Kg | Đã nhận |
| **Tổng** | | **1.000 Kg** | **850 Kg** | **150 Kg** | |

Logic tính: duyệt tuần tự, `runningWeight` bắt đầu từ gross, trừ dần theo `receivedQty` mỗi line.

### 6.4 Soft delete

- Nút xóa (Trash2) chỉ hiện khi status = RECEIVED
- Modal confirm styled (không dùng `window.confirm`)
- Sau xóa: invalidate cả weighbridge logs + inbound receipts queries

---

## 7. Tích hợp với Module khác

| Module | Tích hợp | Chi tiết |
|--------|---------|---------|
| M4 (Inbound) | Receipt status | CONFIRMED → AWAITING_WEIGHING → WEIGHING_1 → UNLOADING → COMPLETED |
| M4 (Inbound) | PO update | `totalReceivedQty` cập nhật sau mỗi lần cân (query PO bằng `poNumber`) |
| M3 (Inventory) | Posting | `GOODS_RECEIVED` post ngay sau mỗi lần cân intermediate/tare |
| M4 (Unloading) | Line status | OPEN → UNLOADED (dỡ hàng) → RECEIVED (sau cân) |
