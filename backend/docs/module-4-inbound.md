# Module 4: Inbound Operations — Backend Documentation

> **Module:** M4 - Inbound Operations  
> **Status:** ✅ Implemented (Feedback Fixed v3 - CR-1 DONE)  
> **Code Path:** `src/modules/inbound`  
> **Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
> **Last Updated:** 2026-03-16 (Added report-error API + ERROR status for receipts)

---

## 1. Mục đích Module

Module 4 quản lý toàn bộ **lifecycle của Receipt** (phiếu nhận hàng) và **Purchase Order** từ khi tạo đến khi đóng. Đây là **operational gatekeeper** cho luồng nhập hàng vào kho.

### 1.1 Chức năng chính

- **Purchase Order Management**: Tạo, confirm, cancel, close PO (đường thủy/đường bộ)
- **Receipt Management**: Tạo, confirm, cancel, close receipt
- **Weighing Flow**: Nhận dữ liệu cân gross/tare từ weighbridge
- **Tolerance Check**: Tự động kiểm tra variance so với expected quantity
- **State Machine**: Quản lý trạng thái receipt theo business rules
- **M3 Integration**: Gọi PostingEngine khi RECEIVED để tạo InventTrans và tăng OnHand
- **Integration Ready**: Interface để gọi M7 (putaway work)

### 1.2 Nguyên tắc quan trọng

- **Không tự update inventory** - Chỉ gọi M3 Posting Engine
- **Post inventory tại state RECEIVED** - Không post ở state khác
- **Weigh event phải idempotent** - Dedupe theo event_id/ticket_id
- **State machine enforce ở backend** - Không dựa vào UI

---

## 2. Cấu trúc Code

```
src/modules/inbound/
├── controllers/
│   └── purchase-order.controller.ts    # PO NestJS controller
├── services/
│   └── purchase-order.service.ts       # PO business logic
├── dto/
│   └── purchase-order.dto.ts           # PO DTOs & validation
├── application/
│   └── receipt.service.js              # Receipt business logic
├── domain/
│   ├── inbound.errors.js               # Error definitions
│   ├── inbound.policy.js               # Business policies
│   └── inbound.state-machine.js        # State machine rules
├── infra/
│   ├── receipt.repository.js           # Receipt CRUD
│   ├── receipt-weighing.repository.js  # Weighing logs
│   └── receipt-status-history.repository.js # Status history
├── inbound.controller.js               # Receipt HTTP handlers (Express)
├── inbound.routes.js                   # Route definitions (Express)
├── inbound.schema.js                   # Validation schemas
└── index.js                            # Module exports
```

---

## 3. API Endpoints

### 3.1 Purchase Order Management

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/purchase-orders` | Tạo PO mới | `INBOUND.PO.CREATE` |
| GET | `/api/v1/inbound/purchase-orders` | List POs (filter, paginate) | `INBOUND.PO.READ` |
| GET | `/api/v1/inbound/purchase-orders/:id` | Get PO detail | `INBOUND.PO.READ` |
| GET | `/api/v1/inbound/purchase-orders/next-number` | Get next PO number | `INBOUND.PO.READ` |
| PUT | `/api/v1/inbound/purchase-orders/:id` | Update PO | `INBOUND.PO.UPDATE` |
| POST | `/api/v1/inbound/purchase-orders/:id/confirm` | Confirm PO | `INBOUND.PO.CONFIRM` |
| POST | `/api/v1/inbound/purchase-orders/:id/close` | Close PO | `INBOUND.PO.CLOSE` |
| POST | `/api/v1/inbound/purchase-orders/:id/cancel` | Cancel PO | `INBOUND.PO.CANCEL` |
| POST | `/api/v1/inbound/purchase-orders/:id/unconfirm` | Hủy xác nhận PO (về NEW) | `INBOUND.PO.CONFIRM` |

### 3.2 Receipt Management

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới | `INBOUND.RECEIPT.CREATE` |
| GET | `/api/v1/inbound/receipts` | List receipts (filter, paginate) | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt detail | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history | `INBOUND.RECEIPT.READ` |
| PUT | `/api/v1/inbound/receipts/:id` | Cập nhật receipt (chỉ DRAFT) | `INBOUND.RECEIPT.CREATE` |
| DELETE | `/api/v1/inbound/receipts/:id` | Xóa receipt (chỉ DRAFT) | `INBOUND.RECEIPT.CREATE` |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt | `INBOUND.RECEIPT.CONFIRM` |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt | `INBOUND.RECEIPT.CANCEL` |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh receipt | `INBOUND.RECEIPT.REWEIGH` |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt | `INBOUND.RECEIPT.CLOSE` |
| POST | `/api/v1/inbound/receipts/:id/report-error` | Báo lỗi receipt (DRAFT → ERROR) | `INBOUND.RECEIPT.CONFIRM` |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing | `INBOUND.WEIGH.RECEIVE` |

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

### 7.2 M3 Integration (✅ Implemented - FB-v3)

| Target | Event/Command | Description | Status |
|--------|---------------|-------------|--------|
| M3 - Inventory Core | `postInventory()` | Post inventory khi RECEIVED | ✅ Done |
| M3 - Inventory Core | `RECEIPT_RECEIVED` event | Event code cho inbound | ✅ Done |

**Flow:**
1. `receiveWeighOut()` tính net weight và check tolerance
2. Nếu tolerance pass → status = RECEIVED
3. Gọi `PostingEngineService.postInventory()` với:
   - `eventCode: 'RECEIPT_RECEIVED'`
   - `refType: 'RECEIPT'`
   - `dimTo: { warehouseCode, locationCode, ownerCode, statusCode: 'AVAILABLE' }`
4. Lưu `postedTransId` vào `receipt_header`
5. Kết quả: `InventTrans` được tạo, `OnHand` tăng

### 7.3 Integration Points (Future)

| Target | Event/Command | Description | Status |
|--------|---------------|-------------|--------|
| M7 - Work | `CreatePutawayWork` | Tạo putaway work | 🔜 Pending |
| M10 - Billing | `InboundHandlingCaptured` | Capture billing event | 🔜 Pending |

---

## 8. Files Code

| File | Lines | Description |
|------|-------|-------------|
| `application/receipt.service.js` | ~500 | Core business logic |
| `domain/inbound.state-machine.js` | ~170 | State machine rules |
| `domain/inbound.policy.js` | ~180 | Business policies |
| `domain/inbound.errors.js` | ~130 | Error definitions |
| `infra/receipt.repository.js` | ~180 | Receipt CRUD |
| `infra/receipt-weighing.repository.js` | ~70 | Weighing logs |
| `infra/receipt-status-history.repository.js` | ~50 | Status history |
| `inbound.controller.js` | ~320 | HTTP handlers |
| `inbound.routes.js` | ~90 | Route definitions |
| `inbound.schema.js` | ~100 | Validation schemas |
| `index.js` | ~40 | Module exports |

**Total:** ~1,900 lines (tất cả files < 800 lines)

---

## 9. Concurrency & Data Integrity (Feedback Fixes)

### 9.1 Transaction Safety

| Issue | Fix | Location |
|-------|-----|----------|
| CR-2: createReceipt race condition | Wrap trong `$transaction` | `receipt.service.js:createReceipt()` |
| HI-4: Concurrent updates | Gọi `lockForUpdate()` (SELECT FOR UPDATE) | Tất cả command methods |
| HI-3: Receipt number race | Dùng `pg_advisory_xact_lock` | `generateReceiptNumberAtomic()` |

### 9.2 Single-Line Constraint (Phase 1)

- **Guard:** `if (lines.length > 1) throw Error`
- **Location:** `createReceipt()` và `receiveWeighOut()`
- **Reason:** Multi-line receipt chưa được support trong Phase 1

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

## 10. RBAC Permissions

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
