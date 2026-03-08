# Module 4: Inbound Operations — Backend Documentation

> **Module:** M4 - Inbound Operations  
> **Status:** ✅ Implemented (Feedback Fixed v3 - CR-1 DONE)  
> **Code Path:** `src/modules/inbound`  
> **Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
> **Last Updated:** 2026-03-08 (FB-v3)

---

## 1. Mục đích Module

Module 4 quản lý toàn bộ **lifecycle của Receipt** (phiếu nhận hàng) từ khi tạo đến khi đóng. Đây là **operational gatekeeper** cho luồng nhập hàng vào kho.

### 1.1 Chức năng chính

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
├── application/
│   └── receipt.service.js          # Core business logic
├── domain/
│   ├── inbound.errors.js           # Error definitions
│   ├── inbound.policy.js           # Business policies
│   └── inbound.state-machine.js    # State machine rules
├── infra/
│   ├── receipt.repository.js               # Receipt CRUD
│   ├── receipt-weighing.repository.js      # Weighing logs
│   └── receipt-status-history.repository.js # Status history
├── inbound.controller.js           # HTTP handlers
├── inbound.routes.js               # Route definitions
├── inbound.schema.js               # Validation schemas
└── index.js                        # Module exports
```

---

## 3. API Endpoints

### 3.1 Receipt Management

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới | `INBOUND.RECEIPT.CREATE` |
| GET | `/api/v1/inbound/receipts` | List receipts (filter, paginate) | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt detail | `INBOUND.RECEIPT.READ` |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history | `INBOUND.RECEIPT.READ` |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt | `INBOUND.RECEIPT.CONFIRM` |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt | `INBOUND.RECEIPT.CANCEL` |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh receipt | `INBOUND.RECEIPT.REWEIGH` |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt | `INBOUND.RECEIPT.CLOSE` |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing | `INBOUND.WEIGH.RECEIVE` |

### 3.2 Weighing Events

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/inbound/weigh-events/in` | Nhận weigh-in (gross) | `INBOUND.WEIGH.RECEIVE` |
| POST | `/api/v1/inbound/weigh-events/out` | Nhận weigh-out (tare) | `INBOUND.WEIGH.RECEIVE` |

### 3.3 Dashboard

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/inbound/dashboard/summary` | Dashboard summary | `INBOUND.DASHBOARD.READ` |

---

## 4. Chi tiết từng API

### 4.1 POST `/api/v1/inbound/receipts` - Tạo Receipt

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
  "receivingLocationId": "uuid-location",
  "vehicleNumber": "51D-12345",
  "blNumber": "BL-2026-001",
  "expectedQty": 30000,
  "sourceApp": "WEB",
  "lines": [
    {
      "itemId": "uuid-item",
      "uomId": "uuid-uom",
      "expectedQty": 30000,
      "cargoForm": "BULK"
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
- `ownerId`, `vendorId`, `warehouseId`, `receivingLocationId` phải active
- `receivingLocationId` phải có `locationType = RECEIVING`
- `lines` phải có ít nhất 1 item

---

### 4.2 POST `/api/v1/inbound/receipts/:id/confirm` - Confirm Receipt

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

### 5.1 States

| State | Description |
|-------|-------------|
| `DRAFT` | Receipt vừa tạo, chưa confirm |
| `AWAITING_WEIGHING` | Đang chờ weigh-in |
| `WEIGHED_IN` | Đã cân gross, đang chờ processing |
| `PROCESSING` | Đang dỡ hàng |
| `WEIGHED_OUT` | Đã cân tare (transient state) |
| `RECEIVED` | Tolerance pass, đã accept |
| `PUTAWAY` | Work putaway completed |
| `CLOSED` | Đã đóng (terminal) |
| `REJECTED` | Tolerance fail |
| `CANCELLED` | Đã hủy (terminal) |

### 5.2 Transitions

```
DRAFT ──confirm──> AWAITING_WEIGHING ──weighIn──> WEIGHED_IN
                                                      │
                                           startProcessing
                                                      ↓
                                                 PROCESSING
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

| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.RECEIPT.CREATE` | Tạo receipt |
| `INBOUND.RECEIPT.READ` | Xem receipt |
| `INBOUND.RECEIPT.CONFIRM` | Confirm receipt |
| `INBOUND.RECEIPT.CANCEL` | Cancel receipt |
| `INBOUND.RECEIPT.REWEIGH` | Reweigh receipt |
| `INBOUND.RECEIPT.CLOSE` | Close receipt |
| `INBOUND.WEIGH.RECEIVE` | Nhận weigh events |
| `INBOUND.DASHBOARD.READ` | Xem dashboard |
