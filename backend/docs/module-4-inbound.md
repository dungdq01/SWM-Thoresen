# Module 4: Inbound Operations — Backend Documentation

> **Module:** M4 - Inbound Operations  
> **Status:** ✅ Implemented (Feedback Fixed v4 - Multi-line ASN + Multi-warehouse PO)  
> **Code Path:** `src/modules/inbound`  
> **Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
> **Last Updated:** 2026-03-25 (Receipt status refactor + Unloading + Weighbridge auto-sync)

---

## 1. Mục đích Module

Module 4 quản lý toàn bộ **lifecycle của Receipt** (phiếu nhận hàng) và **Purchase Order** từ khi tạo đến khi đóng. Đây là **operational gatekeeper** cho luồng nhập hàng vào kho.

### 1.1 Chức năng chính

- **Purchase Order Management**: Tạo, confirm, cancel, close PO (đường thủy/đường bộ)
- **Receipt Management**: Tạo, confirm, cancel, close receipt
- **Weighing Flow**: Nhận dữ liệu cân gross/tare từ weighbridge
- **Tolerance Check**: Tự động kiểm tra variance so với expected quantity
- **State Machine**: Quản lý trạng thái receipt theo business rules
- **M3 Integration**: Gọi PostingEngine ở 2 điểm: PO confirm (`PO_CONFIRMED` → +inboundOrderedQty) và Receipt received (`GOODS_RECEIVED` → +physicalQty, -inboundOrderedQty)
- **Integration Ready**: Interface để gọi M7 (putaway work)

### 1.2 Nguyên tắc quan trọng

- **Không tự update inventory** - Chỉ gọi M3 Posting Engine
- **Post PO_CONFIRMED khi confirm PO** - Tăng inboundOrderedQty (stage EXPECTED)
- **Post GOODS_RECEIVED khi receive** - Tăng physicalQty, giảm inboundOrderedQty (stage PHYSICAL)
- **Weigh event phải idempotent** - Dedupe theo event_id/ticket_id
- **State machine enforce ở backend** - Không dựa vào UI

---

## 2. Cấu trúc Code

```
src/modules/inbound/
├── inbound.module.ts                   # NestJS module registration
├── controllers/
│   ├── purchase-order.controller.ts    # PO NestJS controller
│   ├── receipt.controller.ts           # Receipt NestJS controller
│   └── inbound-document.controller.ts  # Inbound document controller
├── services/
│   ├── purchase-order.service.ts       # PO business logic (+ M3 PO_CONFIRMED integration)
│   ├── receipt.service.ts              # Receipt NestJS service
│   └── inbound-document.service.ts     # Inbound document service
├── dto/
│   ├── purchase-order.dto.ts           # PO DTOs & validation
│   ├── receipt.dto.ts                  # Receipt DTOs
│   └── inbound-document.dto.ts         # Document DTOs
├── application/
│   └── receipt.service.js              # Receipt core logic (+ M3 GOODS_RECEIVED integration)
├── domain/
│   ├── inbound.errors.js               # Error definitions
│   ├── inbound.policy.js               # Business policies
│   └── inbound.state-machine.js        # State machine rules
├── infra/
│   ├── receipt.repository.js           # Receipt CRUD
│   ├── purchase-order.repository.js    # PO CRUD
│   ├── receipt-weighing.repository.js  # Weighing logs
│   └── receipt-status-history.repository.js # Status history
└── inbound.schema.js                   # Validation schemas
```

---

## 3. API Endpoints

### 3.1 Purchase Order Management

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/purchase-orders` | Tạo PO mới (hỗ trợ multi-warehouse) | `INBOUND.PO.CREATE` |
| GET | `/api/v1/inbound/purchase-orders` | List POs (filter, paginate) | `INBOUND.PO.READ` |
| GET | `/api/v1/inbound/purchase-orders/:id` | Get PO detail (bao gồm warehouses) | `INBOUND.PO.READ` |
| GET | `/api/v1/inbound/purchase-orders/next-number` | Get next PO number | `INBOUND.PO.READ` |
| PUT | `/api/v1/inbound/purchase-orders/:id` | Update PO | `INBOUND.PO.UPDATE` |
| POST | `/api/v1/inbound/purchase-orders/:id/confirm` | Confirm PO | `INBOUND.PO.CONFIRM` |
| POST | `/api/v1/inbound/purchase-orders/:id/close` | Close PO | `INBOUND.PO.CLOSE` |
| POST | `/api/v1/inbound/purchase-orders/:id/cancel` | Cancel PO | `INBOUND.PO.CANCEL` |
| POST | `/api/v1/inbound/purchase-orders/:id/unconfirm` | Hủy xác nhận PO (về NEW) | `INBOUND.PO.CONFIRM` |

### 3.2 Receipt Management

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới (hỗ trợ multi-line) | `INBOUND.RECEIPT.CREATE` |
| GET | `/api/v1/inbound/receipts` | List receipts (filter, paginate) | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt detail | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/next-number` | Get next ASN number (sequential) | `INBOUND.RECEIPT.READ` |
| PUT | `/api/v1/inbound/receipts/:id` | Cập nhật receipt (chỉ DRAFT) | `INBOUND.RECEIPT.CREATE` |
| DELETE | `/api/v1/inbound/receipts/:id` | Xóa receipt (chỉ DRAFT) | `INBOUND.RECEIPT.CREATE` |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt | `INBOUND.RECEIPT.CONFIRM` |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt | `INBOUND.RECEIPT.CANCEL` |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh receipt | `INBOUND.RECEIPT.REWEIGH` |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt | `INBOUND.RECEIPT.CLOSE` |
| POST | `/api/v1/inbound/receipts/:id/report-error` | Báo lỗi receipt (DRAFT → ERROR) | `INBOUND.RECEIPT.CONFIRM` |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing | `INBOUND.WEIGH.RECEIVE` |
| POST | `/api/v1/inbound/receipts/:id/putaway-complete` | Hoàn thành putaway | `INBOUND.RECEIPT.CLOSE` |
| POST | `/api/v1/inbound/receipts/:id/manual-weight` | Nhập cân thủ công | `INBOUND.WEIGH.RECEIVE` |

### 3.3 Inbound Documents

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/documents/upload` | Upload chứng từ nhập | `INBOUND.DOCUMENT.CREATE` |
| GET | `/api/v1/inbound/documents` | List documents (filter, paginate) | `INBOUND.DOCUMENT.READ` |
| GET | `/api/v1/inbound/documents/:id` | Get document detail | `INBOUND.DOCUMENT.READ` |
| PUT | `/api/v1/inbound/documents/:id` | Update document (status, notes) | `INBOUND.DOCUMENT.UPDATE` |
| DELETE | `/api/v1/inbound/documents/:id` | Delete document (chỉ DRAFT) | `INBOUND.DOCUMENT.DELETE` |

### 3.4 Weighing Events

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/weigh-events/in` | Nhận weigh-in (gross) | `INBOUND.WEIGH.RECEIVE` |
| POST | `/api/v1/inbound/weigh-events/out` | Nhận weigh-out (tare) | `INBOUND.WEIGH.RECEIVE` |

### 3.5 Dashboard

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/inbound/dashboard/summary` | Dashboard summary | `INBOUND.DASHBOARD.READ` |

---

## 4. Chi tiết từng API

### 4.1 Purchase Order APIs

#### 4.1.1 POST `/api/v1/inbound/purchase-orders` - Tạo PO

**Mục đích:** Tạo Purchase Order mới (đường thủy hoặc đường bộ)

**Request Body:**
```json
{
  "poType": "SEA",
  "ownerId": "uuid-owner",
  "vendorId": "uuid-vendor",
  "warehouseId": "uuid-warehouse",
  "vesselName": "MV OCEAN STAR",
  "origin": "Thailand",
  "blNumber": "BL-2026-RICE-001",
  "notes": "Ghi chú PO",
  "lines": [
    {
      "itemId": "uuid-item",
      "uomId": "uuid-uom",
      "expectedQty": 30000,
      "notes": "Ghi chú dòng"
    }
  ]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `poType` | enum | No | `SEA` (đường thủy) hoặc `LAND` (đường bộ). Default: `SEA` |
| `ownerId` | UUID | Yes | Chủ hàng (Owner) |
| `vendorId` | UUID | Yes | Nhà vận tải (Vendor) |
| `warehouseId` | UUID | Yes | Kho phân phối (Warehouse) |
| `vesselName` | string | No | Tên tàu / Nguồn gốc (chỉ dùng khi `poType=SEA`) |
| `origin` | string | No | Nguồn gốc hàng hóa (chỉ dùng khi `poType=SEA`) |
| `blNumber` | string | No | Số Bill of Lading (chỉ dùng khi `poType=SEA`) |
| `notes` | string | No | Ghi chú PO |
| `lines` | array | Yes | Danh sách dòng hàng (min 1) |

**Line Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | UUID | Yes | Mặt hàng |
| `uomId` | UUID | No | Đơn vị tính |
| `expectedQty` | number | Yes | Số lượng dự kiến |
| `notes` | string | No | Ghi chú dòng |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-po",
    "poNumber": "PO-20260315-001",
    "poType": "SEA",
    "status": "NEW",
    "ownerId": "uuid-owner",
    "vendorId": "uuid-vendor",
    "warehouseId": "uuid-warehouse",
    "vesselName": "MV OCEAN STAR",
    "blNumber": "BL-2026-RICE-001",
    "totalExpectedQty": 30000,
    "lines": [...]
  }
}
```

#### 4.1.2 PUT `/api/v1/inbound/purchase-orders/:id` - Update PO

**Request Body:**
```json
{
  "poType": "SEA",
  "ownerId": "uuid-owner",
  "vendorId": "uuid-vendor",
  "warehouseId": "uuid-warehouse",
  "vesselName": "MV OCEAN STAR",
  "origin": "Thailand",
  "blNumber": "BL-2026-RICE-001",
  "notes": "Ghi chú cập nhật",
  "rowVersion": 0
}
```

**Validation:**
- `rowVersion` bắt buộc để kiểm tra optimistic locking
- Chỉ update được khi `status = NEW`

---

### 4.2 POST `/api/v1/inbound/receipts` - Tạo Receipt

**Mục đích:** Tạo receipt mới với thông tin PO, vehicle, expected qty

**Request Body:**
```json
{
  "externalId": "ext-rcv-001",
  "receiptType": "STANDARD",
  "poId": "PO-2026-001",
  "asnId": "ASN-001",
  "ownerId": "uuid-owner",
  "vendorId": "uuid-vendor",
  "warehouseId": "uuid-warehouse",
  "vehicleNumber": "51D-12345",
  "blNumber": "BL-2026-001",
  "expectedQty": 30000,
  "notes": "Ghi chú phiếu nhập",
  "sourceApp": "WEB",
  "lines": [
    {
      "itemId": "uuid-item",
      "uomId": "uuid-uom",
      "expectedQty": 30000,
      "cargoForm": "BULK",
      "notes": "Ghi chú dòng hàng"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "receiptNumber": null,
    "status": "DRAFT",
    "externalId": "ext-rcv-001",
    "correlationId": "corr-xxx",
    "...": "other fields"
  },
  "idempotentReplay": false
}
```

**Validation:**
- `externalId` phải unique (idempotency key)
- `ownerId`, `vendorId`, `warehouseId` phải active
- `lines` phải có ít nhất 1 item

---

### 4.2.1 PUT `/api/v1/inbound/receipts/:id` - Cập nhật Receipt

**Mục đích:** Cập nhật thông tin receipt (chỉ cho phép khi status = DRAFT)

**Request Body:**
```json
{
  "warehouseId": "uuid-warehouse",
  "vehicleNumber": "51D-99999",
  "expectedQty": 35000,
  "notes": "Ghi chú phiếu nhập (cập nhật)",
  "lines": [
    {
      "itemId": "uuid-item",
      "uomId": "uuid-uom",
      "expectedQty": 35000,
      "cargoForm": "BULK",
      "notes": "Ghi chú dòng hàng (cập nhật)"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid-receipt",
    "status": "DRAFT",
    "vehicleNumber": "51D-99999",
    "expectedQty": 35000,
    "lines": [...]
  }
}
```

**Validation:**
- Chỉ cho phép cập nhật khi `status = DRAFT`
- Nếu status khác DRAFT, trả về lỗi 400

---

### 4.2.2 DELETE `/api/v1/inbound/receipts/:id` - Xóa Receipt

**Mục đích:** Xóa hoàn toàn receipt khỏi database (chỉ cho phép khi status = DRAFT)

**Response (200 OK):**
```json
{
  "message": "Đã xóa phiếu nhập thành công"
}
```

**Validation:**
- Chỉ cho phép xóa khi `status = DRAFT`
- Nếu status khác DRAFT, trả về lỗi 400
- Xóa cascade: lines, status_history, weighing_logs, exception_logs, integration_states

---

### 4.2.3 POST `/api/v1/inbound/receipts/:id/confirm` - Confirm Receipt

**Mục đích:** Chuyển receipt từ DRAFT → AWAITING_WEIGHING, sinh receipt_number

**Request Body:**
```json
{
  "externalId": "ext-confirm-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "receiptNumber": "RCV-20260308-000001",
    "status": "AWAITING_WEIGHING",
    "...": "other fields"
  }
}
```

**Side Effects:**
- Sinh `receipt_number` theo format `RCV-YYYYMMDD-NNNNNN`
- Ghi `receipt_status_history`

---

### 4.2.4 POST `/api/v1/inbound/receipts/:id/report-error` - Báo lỗi Receipt

**Mục đích:** Đánh dấu receipt có lỗi cần xử lý (DRAFT → ERROR)

**Request Body:**
```json
{
  "note": "Ghi chú lý do báo lỗi (tùy chọn)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "status": "ERROR",
    "...": "other fields"
  }
}
```

**Validation:**
- Chỉ cho phép báo lỗi khi `status = DRAFT`
- Nếu status khác DRAFT, trả về lỗi 400

**Side Effects:**
- Ghi `receipt_status_history` với `transitionCode = REPORT_ERROR`

---

### 4.3 POST `/api/v1/inbound/weigh-events/in` - Weigh In

**Mục đích:** Nhận gross weight từ weighbridge

**Request Body:**
```json
{
  "receiptId": "uuid-receipt",
  "eventId": "wb-evt-001",
  "ticketId": "TICKET-001",
  "grossWeightKg": 45200,
  "eventTimestamp": "2026-03-08T09:00:00+07:00",
  "sourceApp": "INTEGRATION"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "status": "WEIGHED_IN",
    "grossWeightKg": 45200,
    "...": "other fields"
  },
  "idempotentReplay": false
}
```

**Validation:**
- `status` phải là `AWAITING_WEIGHING`
- `grossWeightKg` > 0
- `eventId` phải unique (dedupe)

---

### 4.4 POST `/api/v1/inbound/weigh-events/out` - Weigh Out

**Mục đích:** Nhận tare weight, tính net weight, check tolerance

**Request Body:**
```json
{
  "receiptId": "uuid-receipt",
  "eventId": "wb-evt-002",
  "ticketId": "TICKET-002",
  "tareWeightKg": 14900,
  "eventTimestamp": "2026-03-08T10:30:00+07:00",
  "sourceApp": "INTEGRATION"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "status": "RECEIVED",
    "grossWeightKg": 45200,
    "tareWeightKg": 14900,
    "netWeightKg": 30300,
    "tolerancePctApplied": 2.0000,
    "variancePct": 0.9901,
    "...": "other fields"
  },
  "toleranceResult": {
    "pass": true,
    "variancePct": 0.9901,
    "tolerancePct": 2.0000
  }
}
```

**Logic:**
1. Tính `netWeightKg = grossWeightKg - tareWeightKg`
2. Lookup tolerance từ hierarchy: `owner_item_policy` → `item` → `owner.default`
3. Tính `variancePct = |netWeight - expectedQty| / expectedQty * 100`
4. Nếu `variancePct <= tolerancePct` → `RECEIVED`, ngược lại → `REJECTED`

---

### 4.5 POST `/api/v1/inbound/receipts/:id/reweigh` - Reweigh

**Mục đích:** Cho phép cân lại khi receipt bị REJECTED

**Điều kiện:**
- `status = REJECTED`
- `attemptNumber < 3`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "AWAITING_WEIGHING",
    "attemptNumber": 2,
    "grossWeightKg": null,
    "tareWeightKg": null,
    "netWeightKg": null
  }
}
```

---

### 4.6 POST `/api/v1/inbound/receipts/:id/cancel` - Cancel Receipt

**Request Body:**
```json
{
  "reasonCode": "RCV_CANCEL_BY_MANAGER",
  "note": "Vehicle no-show"
}
```

**Điều kiện:**
- `status` phải trong: `DRAFT`, `AWAITING_WEIGHING`, `WEIGHED_IN`, `PROCESSING`
- Không thể cancel nếu đã post inventory (`postedTransId != null`)

---

### 4.7 POST `/api/v1/inbound/receipts/:id/putaway-complete` - Hoàn thành Putaway

**Mục đích:** Đánh dấu receipt đã hoàn thành putaway (chuyển RECEIVED → PUTAWAY)

**Request Body:**
```json
{
  "workId": "uuid-work-id",
  "notes": "Ghi chú hoàn thành putaway"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "status": "PUTAWAY",
    "putawayWorkId": "uuid-work-id"
  }
}
```

**Điều kiện:**
- `status` phải là `RECEIVED`

---

### 4.8 POST `/api/v1/inbound/receipts/:id/manual-weight` - Nhập cân thủ công

**Mục đích:** Cho phép nhập trọng lượng thủ công khi weighbridge gặp sự cố

**Request Body:**
```json
{
  "grossWeightKg": 45200,
  "tareWeightKg": 14900,
  "reasonCode": "WEIGHBRIDGE_ERROR",
  "notes": "Cân bị lỗi, nhập tay theo phiếu cân tay"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-receipt",
    "status": "RECEIVED",
    "grossWeightKg": 45200,
    "tareWeightKg": 14900,
    "netWeightKg": 30300,
    "isManualEntry": true,
    "manualEntryReasonCode": "WEIGHBRIDGE_ERROR"
  }
}
```

**Điều kiện:**
- `status` phải trong: `AWAITING_WEIGHING`, `WEIGHED_IN`, `PROCESSING`
- `reasonCode` bắt buộc để audit

---

## 5. State Machine

### 5.0 PO State Machine

**PO Statuses:**

| State | Description |
|-------|-------------|
| `NEW` | PO vừa tạo, có thể edit |
| `CONFIRMED` | PO đã xác nhận, có thể tạo Receipt |
| `RECEIVING` | Đang nhập hàng (có ASN đang cân) |
| `CLOSED` | PO đã đóng (terminal) |
| `CANCELLED` | PO đã hủy (terminal) |

**PO Transitions:**

```
NEW ──confirm──> CONFIRMED ──(ASN weighing)──> RECEIVING ──close──> CLOSED
 │                    │                            │
 │              unconfirm                          │
 │                    │                            │
 └──cancel──────<─────┘                            │
                      └──cancel──> CANCELLED <─────┘
```

**Business Rules:**
- Chỉ có thể **edit PO** khi `status = NEW`
- Chỉ có thể **tạo Receipt từ PO** khi `status = CONFIRMED`
- Chỉ có thể **unconfirm PO** khi chưa có Receipt nào được tạo từ PO đó
- `totalExpectedQty` được tính bằng cách convert tất cả lines về KG (sử dụng `md_uom_conversion`)

### 5.0.1 PO ↔ ASN Status Cascade (DRAFT)

> ⚠️ **DRAFT**: Logic này chưa được xác nhận với khách hàng, có thể thay đổi.

**Logic:** 1 PO có nhiều ASN (Receipt). Khi có **ít nhất 1 ASN** chuyển sang trạng thái "đang cân" (`WEIGHED_IN`), PO tự động chuyển sang trạng thái "đang nhập" (`RECEIVING`).

```
PO (CONFIRMED)
├── ASN-1 (DRAFT)
├── ASN-2 (AWAITING_WEIGHING) → WEIGHED_IN  ← Trigger
└── ASN-3 (DRAFT)

→ PO chuyển sang RECEIVING
```

**Trigger 1 - ASN đang cân:**
- Khi M8 Weighbridge xác nhận phiếu cân (`confirmLog()`)
- ASN tương ứng chuyển từ `AWAITING_WEIGHING` → `WEIGHED_IN`
- Cascade: PO chuyển từ `CONFIRMED` → `RECEIVING`

**Trigger 2 - ASN cân xong:**
- Khi M8 Weighbridge ghi nhận cân lần 2 (`recordWeight()` → `COMPLETED`)
- ASN tương ứng chuyển từ `WEIGHED_IN` → `WEIGHED_OUT`
- Fill `netWeightKg` vào `ReceiptLine.receivedQty`
- Aggregate: `PO.totalReceivedQty` = SUM của `Receipt.netWeightKg` từ các ASN đã done

```
PO (RECEIVING)
├── ASN-1 (DRAFT)                     → receivedQty = 0
├── ASN-2 (WEIGHED_OUT, net=1500kg)   → receivedQty = 1500
└── ASN-3 (WEIGHED_OUT, net=2000kg)   → receivedQty = 2000

→ PO.totalReceivedQty = 3500 kg
```

**Điều kiện:**
- PO phải đang ở trạng thái `CONFIRMED` hoặc `RECEIVING`
- ASN phải có `poId` link với PO

**Files liên quan:**
- `src/modules/integration-platform/adapters/inbound-bridge.adapter_draft.ts`
- `src/modules/integration-platform/config/feature-flags_draft.ts`

**Cách tắt logic này:**
- Set `FEATURES.M8_M4_AUTO_SYNC = false` trong `feature-flags_draft.ts`

### 5.1 Inbound Document Data Model

**InboundDocument Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `documentCode` | `String` | Mã chứng từ tự sinh (DOCyyyyMMddxxxx) |
| `receiptHeaderId` | `UUID?` | FK → receipt_header (liên kết ASN) |
| `docType` | `InboundDocumentType` | Loại chứng từ |
| `ownerId` | `UUID?` | FK → md_owner |
| `vehicleNumber` | `String?` | Biển số xe |
| `fileName` | `String` | Tên file gốc |
| `filePath` | `String` | Đường dẫn lưu file |
| `fileSize` | `Int` | Kích thước file (bytes) |
| `mimeType` | `String` | MIME type của file |
| `notes` | `String?` | Ghi chú |
| `status` | `InboundDocumentStatus` | Trạng thái (DRAFT, SCANNED, ERROR) |

**InboundDocumentStatus Enum:**
- `DRAFT` - Chờ scan (mặc định khi upload)
- `SCANNED` - Đã scan (xác nhận OK)
- `ERROR` - Lỗi (có vấn đề cần xử lý)

**InboundDocumentType Enum:**
- `BILL_OF_LADING` - Vận đơn (B/L)
- `PACKING_LIST` - Phiếu đóng gói
- `COMMERCIAL_INVOICE` - Hóa đơn thương mại
- `CERTIFICATE_OF_ORIGIN` - Giấy chứng nhận xuất xứ
- `QUALITY_CERTIFICATE` - Chứng nhận chất lượng
- `WEIGHT_CERTIFICATE` - Phiếu cân
- `OTHER` - Khác

**Storage Path:** `backend/uploads/inbound-documents/`

**Allowed File Types:** PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)

---

#### POST `/api/v1/inbound/documents/upload`

Upload chứng từ nhập kho.

**Request (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | File chứng từ |
| `docType` | String | ✅ | Loại chứng từ (enum) |
| `receiptHeaderId` | UUID | | ID phiếu nhập (ASN) để liên kết |
| `ownerId` | UUID | | ID chủ hàng |
| `vehicleNumber` | String | | Biển số xe |
| `notes` | String | | Ghi chú |

**Response (201):**

```json
{
  "id": "uuid",
  "documentCode": "DOC20260316001",
  "docType": "BILL_OF_LADING",
  "fileName": "bl-001.pdf",
  "fileSize": 102400,
  "status": "DRAFT",
  "receiptHeader": {
    "id": "uuid",
    "receiptNumber": "RCV-001"
  },
  "owner": {
    "id": "uuid",
    "ownerCode": "OWN001",
    "ownerName": "Công ty ABC"
  },
  "uploadedAt": "2026-03-16T10:00:00Z"
}
```

**Auto-fill Logic:**
- Khi chọn `receiptHeaderId` (ASN), các trường `ownerId` và `vehicleNumber` được tự động điền từ thông tin phiếu nhập

---

### 5.2 Receipt Data Model

**ReceiptHeader Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `notes` | `String?` | Ghi chú phiếu nhập (tối đa 500 ký tự) |
| `vehicleNumber` | `String` | Biển số xe |
| `expectedQty` | `Decimal` | Tổng số lượng dự kiến |
| `status` | `ReceiptStatus` | Trạng thái phiếu (DRAFT, AWAITING_WEIGHING, ...) |

**ReceiptLine Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `itemId` | `UUID` | ID mặt hàng |
| `uomId` | `UUID` | ID đơn vị tính |
| `expectedQty` | `Decimal` | Số lượng dự kiến |
| `receivedQty` | `Decimal?` | Số lượng đã nhận |
| `cargoForm` | `CargoForm` | Hình thức hàng hóa (BULK, BAGGED_25KG, ...) |
| `notes` | `String?` | Ghi chú dòng hàng (tối đa 500 ký tự) |

### 5.2 Receipt States

| State | Description |
|-------|-------------|
| `DRAFT` | Receipt vừa tạo, chưa confirm |
| `CONFIRMED` | Receipt đã xác nhận (alias của AWAITING_WEIGHING) |
| `ERROR` | Receipt có lỗi cần xử lý |
| `AWAITING_WEIGHING` | Đang chờ weigh-in |
| `WEIGHED_IN` | Đã cân gross, đang chờ processing |
| `PROCESSING` | Đang dỡ hàng |
| `WEIGHED_OUT` | Đã cân tare (transient state) |
| `RECEIVED` | Tolerance pass, đã accept |
| `PUTAWAY` | Work putaway completed |
| `CLOSED` | Đã đóng (terminal) |
| `REJECTED` | Tolerance fail |
| `CANCELLED` | Đã hủy (terminal) |

### 5.3 Receipt Transitions

```
DRAFT ──confirm──> AWAITING_WEIGHING ──weighIn──> WEIGHED_IN
  │                                                    │
  │                                         startProcessing
  │                                                    ↓
  └──report-error──> ERROR                        PROCESSING
                                                      │
                                                  weighOut
                                                      ↓
                                                WEIGHED_OUT
                                                   /    \
                                        (pass)   /      \  (fail)
                                                ↓        ↓
                                            RECEIVED   REJECTED
                                                │        │
                                      putawayComplete  reweigh
                                                ↓        │
                                             PUTAWAY     │
                                                │        │
                                              close      │
                                                ↓        ↓
                                             CLOSED  AWAITING_WEIGHING

Any cancellable state ──cancel──> CANCELLED
```

---

## 6. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `INB-400-INVALID_STATE` | 400 | Action không hợp lệ với state hiện tại |
| `INB-400-INVALID_WEIGHT` | 400 | Gross/tare/net không hợp lệ |
| `INB-400-TOLERANCE_LOOKUP_FAIL` | 400 | Không resolve được tolerance |
| `INB-400-LINE_REQUIRED` | 400 | Receipt phải có ít nhất 1 line |
| `INB-403-FORBIDDEN_ACTION` | 403 | Không đủ quyền |
| `INB-404-RECEIPT_NOT_FOUND` | 404 | Không tìm thấy receipt |
| `INB-409-DUPLICATE_EXTERNAL_ID` | 409 | External ID trùng |
| `INB-409-DUPLICATE_WEIGHT_EVENT` | 409 | Event cân trùng |
| `INB-409-REWEIGH_LIMIT_REACHED` | 409 | Đã vượt 3 lần reweigh |
| `INB-422-MASTER_REFERENCE_INVALID` | 422 | Owner/item/location không hợp lệ |
| `INB-422-LOCATION_TYPE_INVALID` | 422 | Location không phải RECEIVING |

---

## 7. Dependencies

### 7.1 Module 4 phụ thuộc

| Module | Service/Data | Usage |
|--------|--------------|-------|
| M1 - Foundation | `NumberSequence` | Sinh receipt_number |
| M1 - Foundation | `ReasonCode` | Validate reason codes |
| M2 - Master Data | `MdOwner`, `MdVendor`, `MdItem`, `MdWarehouse`, `MdLocation` | Validate master references |
| M2 - Master Data | `MdOwnerItemPolicy` | Lookup tolerance |

### 7.2 M3 Integration (✅ Stage-based — 4 integration points)

| Target | Event Code | Stage | Trigger | Bucket Effect | Status |
|--------|-----------|-------|---------|---------------|--------|
| M3 | `PO_CONFIRMED` | EXPECTED | PO confirm | +`inboundOrderedQty` | ✅ Done |
| M3 | `GOODS_RECEIVED` | PHYSICAL | Receipt received | +`physicalQty`, -`inboundOrderedQty` | ✅ Done |
| M3 | Reversal of `PO_CONFIRMED` | — | PO cancel / unconfirm | -`inboundOrderedQty` | ✅ Done |
| M3 | (qty converted to KG) | — | All postings | UOM conversion via `mdUomConversion` | ✅ Done |

**Flow 1: PO Confirm → M3 PO_CONFIRMED**
1. `PurchaseOrderService.confirm()` update PO status → CONFIRMED
2. Cho mỗi PO line: convert qty sang KG via `mdUomConversion`
3. Gọi `PostingEngineService.postInventory()` với:
   - `externalId: PO-CONFIRM-{poId}-{lineId}-{timestamp}` (unique mỗi lần confirm)
   - `eventCode: 'PO_CONFIRMED'`, `uomCode: 'KG'`
   - `refType: 'PURCHASE_ORDER'`
   - `dimTo: { warehouseCode, locationCode (first active), ownerCode, statusCode: 'AVAILABLE' }`
   - `sourceApp: 'SYSTEM'`
4. M3 tạo `InventTrans` stage=EXPECTED, tăng `inboundOrderedQty` trên `OnHand`
5. Non-blocking: nếu M3 fail, PO vẫn confirm thành công (error logged)

> **Lưu ý idempotency:** `externalId` chứa timestamp để hỗ trợ re-confirm sau khi unconfirm. Nếu dùng externalId cố định, M3 sẽ trả `idempotentReplay=true` khi confirm lại cùng PO và không tạo transaction mới.

**Flow 2: Receipt Received → M3 GOODS_RECEIVED**
1. `receiveWeighOut()` tính net weight và check tolerance
2. Nếu tolerance pass → status = RECEIVED
3. Gọi `PostingEngineService.postInventory()` cho mỗi receipt line với:
   - `eventCode: 'GOODS_RECEIVED'`
   - `refType: 'RECEIPT'`
   - `dimTo: { warehouseCode, locationCode, ownerCode, statusCode: 'AVAILABLE' }`
4. M3 tạo `InventTrans` stage=PHYSICAL, tăng `physicalQty`, giảm `inboundOrderedQty`
5. Lưu `postedTransId` vào `receipt_header`

**Flow 3: PO Cancel / Unconfirm → M3 Reversal**
1. `cancel()` hoặc `unconfirm()` update PO status
2. Gọi `reversePoConfirmedPostings()` — tìm tất cả `InventTrans` có `refId=poId`, `stage=EXPECTED`, `isReversal=false`
3. Cho mỗi trans: gọi `ReversalEngineService.reverseTransaction()` với `reasonCode: 'PO_CANCELLED'` hoặc `'PO_UNCONFIRMED'`
4. M3 tạo reversal trans, giảm `inboundOrderedQty` trên `OnHand`
5. Non-blocking + skip nếu đã reversed

### 7.3 Integration Points (Future)

| Target | Event/Command | Description | Status |
|--------|---------------|-------------|--------|
| M7 - Work | `CreatePutawayWork` | Tạo putaway work | 🔜 Pending |
| M10 - Billing | `InboundHandlingCaptured` | Capture billing event | 🔜 Pending |

---

## 8. Files Code

| File | Description |
|------|-------------|
| `inbound.module.ts` | NestJS module registration |
| `controllers/purchase-order.controller.ts` | PO NestJS controller |
| `controllers/receipt.controller.ts` | Receipt NestJS controller |
| `controllers/inbound-document.controller.ts` | Inbound document controller |
| `services/purchase-order.service.ts` | PO business logic + M3 PO_CONFIRMED integration |
| `services/receipt.service.ts` | Receipt NestJS service |
| `services/inbound-document.service.ts` | Inbound document service |
| `application/receipt.service.js` | Receipt core logic + M3 GOODS_RECEIVED integration |
| `domain/inbound.state-machine.js` | State machine rules |
| `domain/inbound.policy.js` | Business policies |
| `domain/inbound.errors.js` | Error definitions |
| `infra/receipt.repository.js` | Receipt CRUD |
| `infra/purchase-order.repository.js` | PO CRUD |
| `infra/receipt-weighing.repository.js` | Weighing logs |
| `infra/receipt-status-history.repository.js` | Status history |
| `inbound.schema.js` | Validation schemas |

> **Removed:** `inbound.controller.js`, `inbound.routes.js`, `index.js`, `application/purchase-order.service.js` — Express legacy files, không còn dùng. Toàn bộ traffic đi qua NestJS controllers.

---

## 9. Concurrency & Data Integrity (Feedback Fixes)

### 9.1 Transaction Safety

| Issue | Fix | Location |
|-------|-----|----------|
| CR-2: createReceipt race condition | Wrap trong `$transaction` | `receipt.service.js:createReceipt()` |
| HI-4: Concurrent updates | Gọi `lockForUpdate()` (SELECT FOR UPDATE) | Tất cả command methods |
| HI-3: Receipt number race | Dùng `pg_advisory_xact_lock` | `generateReceiptNumberAtomic()` |

### 9.2 Multi-Line ASN Support (✅ Updated 2026-03-17)

- **Status:** Multi-line ASN đã được hỗ trợ
- **UOM Conversion:** Mỗi line được quy đổi sang KG theo `md_uom_conversion`
- **Tolerance Check:** Dựa trên tổng `expectedQty` của header
- **Inventory Posting:** Post cho từng line với `receivedQty` phân bổ theo tỷ lệ `expectedQty`
- **Location:** `createReceipt()` và `receiveWeighOut()` trong `receipt.service.js`

### 9.3 Bagged Over-Receipt Check (✅ Fixed v3)

- **Policy:** `BaggedPolicy.checkOverReceipt(prisma, poId, bagCount, lineData)`
- **Trigger:** Khi `cargoForm !== 'BULK'` và có `bagCount`
- **Location:** `receiveWeighOut()` trước khi set RECEIVED
- **Status:** ✅ Fixed (v3) - `expectedBagCount` tính từ lineData
- **Logic:** `expectedBagCount = Math.ceil(expectedQty / nominalWeightPerBag)`
- **Blocking:** `overReceiptBlocked = totalWithCurrent > expectedBagCount`

### 9.4 Idempotency Keys

| Entity | Key | Usage |
|--------|-----|-------|
| Receipt | `externalId` | Dedupe create receipt |
| Weigh Event | `eventId` | Dedupe weigh-in/weigh-out |
| Confirm | `externalId` (optional) | Dedupe confirm action |

---

## 10. Multi-Vehicle Receipt — Per-Vehicle Kho & Items (Frontend)

> **Updated:** 2026-03-18
> **File:** `frontend/src/features/inbound-operations/purchase-order/CreateInboundReceiptModal.jsx`

### 10.1 Bài toán

Khi 1 PO có nhiều kho (multi-warehouse) và user muốn tạo nhiều phiếu nhập cùng lúc cho nhiều xe:

- **Xe A** chở **Item A** đi **Kho A** (VD: OY-01 — Bãi hở A)
- **Xe B** chở **Item B** đi **Kho B** (VD: OY-02 — Container)

### 10.2 Cách hoạt động

**Single vehicle (0–1 xe):** UI y hệt cũ — Kho chọn ở Section 1, items ở Section 2.

**Multi vehicle (≥2 xe):** Khi user nhập nhiều biển số phân cách bằng `,` hoặc `;`:

1. **Section 1 — Thông tin chung:** Dropdown Kho bị ẩn, thay bằng info box: _"Kho được chọn riêng cho từng xe ở phần Chi tiết phiếu bên dưới"_
2. **Section 2 — Chi tiết phiếu:** Hiển thị **Tabs**, mỗi tab = 1 xe, chứa:
   - Dropdown **Kho** riêng (filter từ kho của PO)
   - Danh sách **items** riêng (thêm/xoá/sửa độc lập)
3. **Tab trigger:** Hiển thị biển số xe + tên kho đã chọn + badge valid/invalid
4. **Submit:** Mỗi xe tạo 1 API call riêng với `warehouseId` và `lines` riêng

### 10.3 State Model (Frontend)

```javascript
draft = {
  warehouseId: '',           // Dùng khi single vehicle
  vehiclePlate: '',          // Raw input: "29A-111; 29A-222"
  notes: '',
  lines: [...],              // Dùng khi single vehicle
  vehicleLines: {            // Dùng khi multi vehicle, key = plate
    '29A-111': [{ itemId, expectedQty, uomId, ... }],
    '29A-222': [{ itemId, expectedQty, uomId, ... }],
  },
  vehicleWarehouses: {       // Dùng khi multi vehicle, key = plate
    '29A-111': 'warehouse-uuid-A',
    '29A-222': 'warehouse-uuid-B',
  },
}
```

### 10.4 Sync Logic (vehiclePlates ↔ vehicleLines/vehicleWarehouses)

| Transition | Hành vi |
|------------|---------|
| 1 xe → N xe | Clone `draft.lines` → mỗi tab. Kế thừa `warehouseId` chung → mỗi `vehicleWarehouses[plate]` |
| Thêm xe mới | Khởi tạo lines từ PO lines gốc. `vehicleWarehouses[plate]` = `''` |
| Xoá xe | Xoá `vehicleLines[plate]` và `vehicleWarehouses[plate]` |
| N xe → 1 xe | Copy lines + warehouse của plate còn lại về `draft.lines` / `draft.warehouseId` |

### 10.5 Validation (Multi-vehicle)

Mỗi tab phải thỏa:
- `vehicleWarehouses[plate]` không rỗng (phải chọn kho)
- Ít nhất 1 dòng hàng với `itemId` + `uomId` + `expectedQty > 0`

Form chỉ valid khi **tất cả** tab đều valid. Tab invalid hiển thị icon `AlertCircle` đỏ.

### 10.6 Submit Payload (Per vehicle)

```javascript
// Gọi N lần cho N xe
{
  externalId: "WEB-{timestamp}-{random}",   // Idempotency key
  poId: "PO-20260317-002",
  asnId: "ASN-20260318-000001",             // Từ API /receipts/next-number
  ownerId: "uuid",
  vendorId: "uuid",
  warehouseId: vehicleWarehouses[plate],    // Kho RIÊNG cho xe này
  vehicleNumber: "29A-111",
  blNumber: "BL-xxx",
  expectedQty: 45,                          // Tổng qty của lines xe này
  notes: "...",
  sourceApp: "WEB",
  lines: [...]                              // Items RIÊNG cho xe này
}
```

---

## 11. ASN Number Generation & Display (Bug Fix 2026-03-18)

### 11.1 Vấn đề

Cột "Mã ASN" trên trang Phiếu nhập thay đổi khi bấm Xác nhận receipt. VD: hiện `42afe6a3` → sau confirm → hiện `RCV-20260317-000001`.

### 11.2 Root Cause (3 bug chồng nhau)

**Bug 1 — API route thiếu:**
- Frontend gọi `GET /api/v1/inbound/receipts/next-number` → **404** vì route không tồn tại trong Express app
- Fallback frontend tạo ASN nhưng parse response sai → `asnId = undefined` → lưu `null` vào DB

**Bug 2 — Payload thiếu trường required:**
- Schema (`inbound.schema.js`) yêu cầu `externalId` (required) và `receivingLocationId` (required)
- Frontend không gửi → validation fail → receipt không tạo được qua Express API
- `receivingLocationId` không được dùng trong service → đổi thành `optional`

**Bug 3 — Frontend fallback chain hiển thị sai:**
- Display logic: `asnId || receiptNumber || id.slice(0,8)`
- Khi DRAFT: `asnId=null`, `receiptNumber=null` → hiển thị UUID cắt ngắn (`42afe6a3`)
- Khi confirm: backend sinh `receiptNumber=RCV-xxx` → hiển thị `receiptNumber` → trông như "mã bị đổi"

### 11.3 Fixes

**Fix 1 — Thêm Express route + controller method:**

```
GET /api/v1/inbound/receipts/next-number
```

- File route: `inbound.routes.js` — thêm **trước** `/receipts/:id` để tránh `:id` match
- File controller: `inbound.controller.js` — method `getNextReceiptNumber()`
- Logic: Query `receipt_header` tìm `asn_id` lớn nhất với prefix `ASN-{YYYYMMDD}`, tăng sequence
- Response: `{ success: true, data: { code: "ASN-20260318-000001" } }`

**Fix 2 — Frontend gửi đủ payload:**

```javascript
// CreateInboundReceiptModal.jsx - handleSubmit
const payload = {
  externalId: `WEB-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  // ... other fields
}
```

- Backend schema: `receivingLocationId` đổi từ `required` → `optional`

**Fix 3 — Frontend hiển thị ưu tiên receiptNumber:**

```javascript
// InboundReceiptsPage.jsx - Cột "Mã ASN / Số phiếu"
// Trước: receipt.asnId || receipt.receiptNumber || receipt.id?.slice(0,8)
// Sau:
receipt.receiptNumber || receipt.asnId || receipt.id?.slice(0, 8)
// + Hiển thị asnId nhỏ bên dưới nếu khác receiptNumber
```

### 11.4 Phân biệt asnId vs receiptNumber

| Field | Khi nào sinh | Format | Mục đích |
|-------|-------------|--------|----------|
| `asnId` | Khi **tạo** receipt (frontend gọi API) | `ASN-YYYYMMDD-NNNNNN` | Mã tham chiếu trước khi confirm |
| `receiptNumber` | Khi **confirm** receipt (backend sinh) | `RCV-YYYYMMDD-NNNNNN` | Mã chính thức sau khi xác nhận |

- DRAFT: hiển thị `asnId` (hoặc UUID nếu null)
- After confirm: hiển thị `receiptNumber` (mã chính thức), `asnId` hiển thị nhỏ bên dưới

### 11.5 Files thay đổi

| File | Thay đổi |
|------|----------|
| `backend/src/modules/inbound/inbound.routes.js` | Thêm route `GET /receipts/next-number` |
| `backend/src/modules/inbound/inbound.controller.js` | Thêm method `getNextReceiptNumber()` |
| `backend/src/modules/inbound/inbound.schema.js` | `receivingLocationId`: required → optional |
| `frontend/.../CreateInboundReceiptModal.jsx` | Thêm `externalId` vào payload, fix parse API response |
| `frontend/.../InboundReceiptsPage.jsx` | Fix cột display: ưu tiên `receiptNumber`, header đổi thành "Mã ASN / Số phiếu" |

---

## 12. RBAC Permissions

### 10.1 Purchase Order Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.PO.CREATE` | Tạo Purchase Order |
| `INBOUND.PO.READ` | Xem Purchase Order |
| `INBOUND.PO.UPDATE` | Cập nhật Purchase Order |
| `INBOUND.PO.CONFIRM` | Xác nhận PO |
| `INBOUND.PO.CLOSE` | Đóng Purchase Order |
| `INBOUND.PO.CANCEL` | Hủy Purchase Order |

### 10.2 Receipt Permissions

| Permission Code           | Description       |
| ---------------------------| -------------------|
| `INBOUND.RECEIPT.CREATE`  | Tạo receipt       |
| `INBOUND.RECEIPT.READ`    | Xem receipt       |
| `INBOUND.RECEIPT.CONFIRM` | Confirm receipt   |
| `INBOUND.RECEIPT.CANCEL`  | Cancel receipt    |
| `INBOUND.RECEIPT.REWEIGH` | Reweigh receipt   |
| `INBOUND.RECEIPT.CLOSE`   | Close receipt     |
| `INBOUND.WEIGH.RECEIVE`   | Nhận weigh events |
| `INBOUND.DASHBOARD.READ`  | Xem dashboard     |

---

## 11. Unloading (Dỡ hàng) — NEW 2026-03-25

### 11.1 Tổng quan

Tính năng dỡ hàng cho phép nhân viên kho dỡ hàng từ xe xuống vị trí kho, tương tự Loading của outbound nhưng ngược chiều.

**Luồng:** Cân Gross (xe có hàng) → **Dỡ hàng** (chọn vị trí) → Cân Tare (xe rỗng) → Cộng tồn kho

### 11.2 Code Structure

```
src/modules/inbound/
├── controllers/
│   └── unloading.controller.ts        # ✅ NEW: REST endpoints dỡ hàng
├── services/
│   └── unloading.service.ts           # ✅ NEW: Business logic dỡ hàng
```

### 11.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inbound/unloading/receipts` | Danh sách receipt cần dỡ (AWAITING_WEIGHING + WEIGHED_IN + PROCESSING) |
| GET | `/inbound/unloading/:id/status` | Trạng thái dỡ hàng + thông tin cân |
| GET | `/inbound/unloading/:id/locations-available` | Vị trí active trong kho receipt |
| POST | `/inbound/unloading/:id/start` | Bắt đầu dỡ (yêu cầu đã cân gross) → PROCESSING |
| POST | `/inbound/unloading/:id/unload-item` | Dỡ 1 item + ghi locationId |
| POST | `/inbound/unloading/:id/undo-unload-item` | Hoàn tác dỡ 1 item |
| POST | `/inbound/unloading/:id/complete` | Hoàn thành dỡ hàng |

### 11.4 POST /inbound/unloading/:id/unload-item

**Request Body:**
```json
{
  "receiptLineId": "uuid",
  "locationId": "uuid"
}
```

### 11.5 GET /inbound/unloading/:id/status

**Response:**
```json
{
  "receiptId": "uuid",
  "receiptNumber": "RCV-20260324-000001",
  "vehicleNumber": "123132",
  "status": "PROCESSING",
  "owner": { "id": "uuid", "ownerCode": "CARGILL", "ownerName": "Cargill Vietnam" },
  "warehouse": { "id": "uuid", "warehouseCode": "MX-01", "warehouseName": "Kho tổng hợp" },
  "hasGross": true,
  "hasTare": false,
  "allUnloaded": false,
  "lines": [
    {
      "id": "uuid",
      "lineNumber": 1,
      "itemId": "uuid",
      "itemCode": "DAP-50",
      "itemName": "Phân DAP — bao 50kg",
      "uomCode": "BAG50",
      "expectedQty": 5500,
      "unloadSequence": 1,
      "lineStatus": "RECEIVED",
      "locationId": "uuid",
      "locationCode": "LOC-1",
      "isUnloaded": true
    }
  ]
}
```

### 11.6 Weighbridge Validation (WEIGH_IN)

| Constraint | Location | Error |
|------------|----------|-------|
| Chưa cân gross → không dỡ | `unloading.service.ts` `startUnloading()` | Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng. |
| Chưa dỡ xong → không cân tare | `weighbridge-log.service.ts` `recordWeight()` | Xe chưa dỡ hàng xong. Vui lòng hoàn thành dỡ hàng trước khi cân lần 2. |

### 11.7 Inventory Posting sau cân lần 2 (WEIGH_IN)

Khi weighbridge hoàn thành cân lần 2 cho WEIGH_IN:

1. Update `receivedQty` + `netWeightKg` trên receipt lines (proportional split)
2. Update receipt header: `grossWeightKg`, `tareWeightKg`, `netWeightKg`
3. Post `GOODS_RECEIVED` inventory transaction:
   ```javascript
   {
     eventCode: 'GOODS_RECEIVED',
     refType: 'RECEIPT',
     refId: receiptId,
     dimTo: {
       warehouseCode: receipt.warehouse.warehouseCode,
       locationCode: line.location.locationCode,  // vị trí dỡ hàng
       ownerCode: receipt.owner.ownerCode,
       statusCode: 'AVAILABLE',
     },
     qty: netWeight,
   }
   ```
4. `on_hand.physicalQty` **tăng** tại vị trí dỡ hàng
5. Ghi `invent_trans` record (RECEIPT/RECEIVED)

### 11.8 Frontend

| Component | File | Route |
|-----------|------|-------|
| InboundUnloadingPage | `pages/inbound-operations/InboundUnloadingPage.jsx` | `/app/inbound-operations/unloading` |
| LocationPicker | (inline) | Dropdown vị trí trong kho |

**Sidebar:** Vận hành nhập > Dỡ hàng

### 11.9 On-Hand Page Enhancement

Cột **"Đã nhập"** (`inboundReceivedQty`) = tổng `receivedQty` từ receipt lines có `receivedQty > 0`, group theo `itemId + warehouseId`.

---

## 12. Receipt Status Refactor — 2026-03-25

### 12.1 Enum Migration

| Enum cũ | Enum mới | Ý nghĩa |
|---------|----------|---------|
| `DRAFT` | `NEW` | Tạo mới |
| — | `CONFIRMED` | Đã xác nhận, chờ tạo phiếu cân |
| `AWAITING_WEIGHING` | `AWAITING_WEIGHING` | Đã tạo phiếu cân, chờ xác nhận |
| `WEIGHED_IN` | `WEIGHING_1` | Đang cân lần 1 / phiếu cân đã xác nhận |
| `PROCESSING` | `UNLOADING` | Đang dỡ hàng |
| — | `UNLOADED` | Đã dỡ xong, chờ cân lần 2 |
| `WEIGHED_OUT` | `WEIGHING_2` | Đang cân lần 2 (transient) |
| `RECEIVED` | `COMPLETED` | Hoàn thành |
| `PUTAWAY` | _(removed)_ | Không dùng — hàng đã ở đúng vị trí từ bước dỡ |
| — | `ERROR` | Lỗi |

### 12.2 State Machine Flow

```
NEW → CONFIRMED → AWAITING_WEIGHING → WEIGHING_1 → UNLOADING → UNLOADED → WEIGHING_2 → COMPLETED → CLOSED
```

### 12.3 Trigger Points — Tự động đổi trạng thái Receipt

| Sự kiện | Trigger location | Transition |
|---------|-----------------|------------|
| Xác nhận receipt | `receipt.service.js` `confirmReceipt()` | NEW → CONFIRMED |
| Tạo phiếu cân | `weighbridge-ingest.service.ts` `createManualWeighEvent()` | CONFIRMED → AWAITING_WEIGHING |
| Hủy/reject phiếu cân | `weighbridge-log.service.ts` `rejectLog()` | AWAITING_WEIGHING → CONFIRMED |
| Xác nhận phiếu cân | `weighbridge-log.service.ts` `confirmLog()` | AWAITING_WEIGHING → WEIGHING_1 |
| Ghi gross (cân lần 1) | `weighbridge-log.service.ts` `recordWeight()` lần 1 | WEIGHING_1 → UNLOADING (chưa dỡ) / UNLOADED (đã dỡ) |
| Bắt đầu dỡ hàng | `unloading.service.ts` `startUnloading()` | → UNLOADING |
| Hoàn thành dỡ hàng | `unloading.service.ts` `completeUnloading()` | UNLOADING → UNLOADED |
| Ghi tare (cân lần 2) | `weighbridge-log.service.ts` `recordWeight()` lần 2 | UNLOADED → WEIGHING_2 → COMPLETED |
| Đóng receipt | `receipt.service.ts` `putawayComplete()` | COMPLETED → CLOSED |

### 12.4 Validation Rules

| Rule | Check point | Error message |
|------|-----------|---------------|
| Chưa cân gross → không dỡ | `unloading.service.ts` `startUnloading()` | Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước |
| Chưa dỡ xong → không cân lần 2 | `weighbridge-log.service.ts` `recordWeight()` | Receipt status phải = UNLOADED |
| Chỉ edit/delete ở NEW | `receipt.service.ts` | Chỉ có thể chỉnh sửa ở trạng thái Tạo mới |

### 12.5 Frontend Status Labels

| Status | Label VN | Badge color |
|--------|---------|-------------|
| NEW | Tạo mới | default (gray) |
| CONFIRMED | Xác nhận | success (green) |
| AWAITING_WEIGHING | Chờ cân | info (blue) |
| WEIGHING_1 | Đang cân lần 1 | info (blue) |
| UNLOADING | Đang dỡ hàng | warning (yellow) |
| UNLOADED | Chờ cân lần 2 | info (blue) |
| WEIGHING_2 | Đang cân lần 2 | warning (yellow) |
| COMPLETED | Hoàn thành | success (green) |
| CANCELLED | Đã hủy | danger (red) |
| ERROR | Lỗi | danger (red) |
