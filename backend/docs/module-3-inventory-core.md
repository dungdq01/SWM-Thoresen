# Module 3: Inventory Core Engine - API Documentation

**Status:** ✅ Completed  
**Code Path:** `src/modules/inventory-core`  
**Version:** 1.1  
**Last Updated:** 2026-03-09

---

## 1. Module Overview

Module 3 là **trái tim dữ liệu vận hành** của SWM, chịu trách nhiệm quản lý toàn bộ inventory backbone:

- **InventDim**: Dimension tồn kho (site, warehouse, location, owner, status)
- **InventTrans**: Ledger bất biến ghi nhận mọi biến động tồn kho
- **OnHand**: Current balance projection
- **Posting Engine**: Cổng vào duy nhất để các module khác ghi nhận tồn kho
- **Reversal Engine**: Đảo chiều transaction khi cần correction
- **Hold/Allocation**: Giữ hàng cho outbound

### Nguyên tắc cốt lõi
- Mọi thay đổi tồn kho **PHẢI** đi qua Posting Engine
- Ledger (`invent_trans`) là **bất biến** - không UPDATE/DELETE
- Correction phải dùng **reversal transaction**
- `OnHand` chỉ được update qua posting/hold service

---

## 2. File Structure

```
src/modules/inventory-core/
├── index.js                          # Main export
├── inventory-core.routes.js          # Express routes (RBAC protected)
├── inventory-core.controller.js      # Request handlers
├── inventory-core.schema.js          # Joi validation schemas
├── middleware/
│   └── auth.middleware.js            # Auth + Permission middleware
├── domain/
│   ├── inventory.types.js            # Enums & constants
│   ├── inventory.errors.js           # Error definitions
│   └── inventory.rules.js            # Business rules
├── application/
│   ├── posting-engine.service.js     # Main posting service
│   ├── reversal-engine.service.js    # Reversal service (idempotent)
│   ├── hold.service.js               # Hold/allocation service
│   ├── onhand.service.js             # OnHand query service (Decimal.js)
│   ├── transaction-query.service.js  # Transaction query service
│   └── invent-dim.service.js         # Dimension service
└── infra/
    ├── invent-dim.repository.js      # InventDim data access
    ├── invent-trans.repository.js    # InventTrans data access
    ├── onhand.repository.js          # OnHand data access (optimistic lock)
    ├── hold.repository.js            # Hold data access (NumberSequence)
    ├── reversal-link.repository.js   # ReversalLink data access
    └── event-mapping.repository.js   # EventMapping data access
```

---

## 3. Các thành phần dùng chung mà module dựa vào

### Guards & Middleware
- `middleware/auth.middleware.js` - Express middleware wrapper cho authentication
- `middleware/auth.middleware.js` - Express middleware wrapper cho permission check

### Foundation Services (từ Module 1)
- `NumberSequenceService` - Sinh transId (TRX-*), holdNo (HLD-*)
- `ReasonCode` - Validate reason codes cho reversal/adjustment

### Master Data (từ Module 2)
- `MdWarehouse`, `MdLocation`, `MdOwner`, `MdInventoryStatus` - Dimension validation
- `MdItem`, `MdUom` - Item và UOM validation

## 3.1 RBAC Protection

Tất cả routes đều được bảo vệ bởi RBAC middleware:

| Permission Code | Description |
|-----------------|-------------|
| `INVENTORY.POSTING.CREATE` | Tạo inventory transaction |
| `INVENTORY.POSTING.READ` | Xem inventory transaction |
| `INVENTORY.REVERSAL.CREATE` | Reverse transaction |
| `INVENTORY.ONHAND.READ` | Query on-hand |
| `INVENTORY.HOLD.CREATE` | Tạo hold |
| `INVENTORY.HOLD.READ` | Xem hold |
| `INVENTORY.HOLD.RELEASE` | Release hold |
| `INVENTORY.HOLD.CANCEL` | Cancel hold |
| `INVENTORY.TRANSACTION.READ` | Xem transaction history |

---

## 4. API Endpoints

### 4.1 POST /api/v1/inventory/postings

**Mục đích:** Tạo inventory transaction từ business event hợp lệ.

**Ai gọi:** M4 Inbound, M5 Outbound, M6 Inventory Control, M7 Work Execution, M9 VAS

**Request Body:**
```json
{
  "externalId": "evt-ship-001-line-01",
  "correlationId": "corr-20260308-001",
  "eventCode": "SHIPMENT_SHIPPED",
  "refType": "SHIPMENT",
  "refId": "SHP-20260308-000001",
  "refLineId": "LINE-01",
  "itemId": "uuid-item-1",
  "qty": "25000.000",
  "uomCode": "KG",
  "dimFrom": {
    "siteCode": "TVL-SITE",
    "warehouseCode": "WH5.1",
    "locationCode": "STORAGE-A1",
    "ownerCode": "CUST001",
    "statusCode": "AVAILABLE"
  },
  "sourceApp": "API",
  "postedBy": "user-uuid"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "transId": "TRX-20260308-000123",
    "transDbId": "uuid",
    "transType": "SHIPMENT_OUT",
    "itemId": "uuid-item-1",
    "qty": "25000.000",
    "onHandAfter": {
      "physicalQty": "5000.000",
      "reservedQty": "0.000",
      "availableQty": "5000.000"
    },
    "idempotentReplay": false
  }
}
```

**Error Responses:**
| Code | Error | Description |
|------|-------|-------------|
| 400 | VALIDATION_ERROR | Invalid request payload |
| 409 | INV_DUPLICATE_EXTERNAL_ID | Duplicate external_id |
| 422 | INV_INVALID_EVENT_CODE | Event code not found/inactive |
| 422 | INV_MASTER_INACTIVE | Item/Owner/Location/Status inactive |
| 422 | INV_NEGATIVE_STOCK_BLOCKED | Would result in negative stock |
| 422 | INV_REASON_CODE_REQUIRED | Reason code required for this trans type |

---

### 3.2 POST /api/v1/inventory/postings/reverse

**Mục đích:** Reverse một transaction đã post mà không sửa ledger gốc.

**Request Body:**
```json
{
  "externalId": "reverse-trx-000123",
  "correlationId": "corr-rev-001",
  "originalTransId": "TRX-20260308-000123",
  "reasonCode": "DOCUMENT_ERROR",
  "note": "Posted wrong location"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "originalTransId": "TRX-20260308-000123",
    "reversalTransId": "REV-20260308-ABCD",
    "reversalTransDbId": "uuid",
    "reversedQty": "-25000.000"
  }
}
```

**Error Responses:**
| Code | Error | Description |
|------|-------|-------------|
| 400 | INV_REASON_CODE_REQUIRED | Reason code is mandatory |
| 404 | INV_TRANS_NOT_FOUND | Original transaction not found |
| 409 | INV_ALREADY_REVERSED | Transaction already reversed |
| 422 | INV_REVERSAL_NOT_ALLOWED | Cannot reverse this transaction |

---

### 3.3 GET /api/v1/inventory/onhand

**Mục đích:** Query tồn hiện tại theo các filters.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | uuid | No | Filter by item |
| warehouseId | uuid | No | Filter by warehouse |
| locationId | uuid | No | Filter by location |
| ownerId | uuid | No | Filter by owner |
| inventoryStatusId | uuid | No | Filter by status |
| hasStock | boolean | No | Only show records with stock > 0 |
| page | number | No | Page number (default: 1) |
| pageSize | number | No | Items per page (default: 50, max: 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "item": { "itemCode": "ITEM001", "itemName": "Gạo 5%" },
      "inventDimId": "uuid",
      "inventDim": {
        "warehouse": { "warehouseCode": "WH5.1" },
        "location": { "locationCode": "STORAGE-A1" },
        "owner": { "ownerCode": "CUST001" },
        "inventoryStatus": { "statusCode": "AVAILABLE", "isAllocatable": true }
      },
      "physicalQty": "30000.000",
      "reservedQty": "10000.000",
      "availableQty": "20000.000",
      "uom": { "uomCode": "KG" }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 3.4 GET /api/v1/inventory/onhand/availability

**Mục đích:** Check available stock cho allocation.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | uuid | Yes | Item ID |
| inventDimId | uuid | Yes | Dimension ID |
| qty | string | Yes | Requested quantity |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "physicalQty": "30000.000",
    "reservedQty": "10000.000",
    "availableQty": "20000.000",
    "requestedQty": "15000.000",
    "shortfall": "0"
  }
}
```

---

### 3.5 GET /api/v1/inventory/transactions

**Mục đích:** Query transaction history.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | uuid | No | Filter by item |
| ownerId | uuid | No | Filter by owner |
| refType | string | No | Filter by reference type |
| refId | string | No | Filter by reference ID |
| transType | string | No | Filter by transaction type |
| fromDate | date | No | From posted date |
| toDate | date | No | To posted date |
| correlationId | string | No | Filter by correlation ID |
| page | number | No | Page number |
| pageSize | number | No | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transId": "TRX-20260308-000123",
      "refType": "SHIPMENT",
      "refId": "SHP-20260308-000001",
      "transType": "SHIPMENT_OUT",
      "qty": "-25000.000",
      "postedAt": "2026-03-08T10:30:00Z",
      "item": { "itemCode": "ITEM001" },
      "owner": { "ownerCode": "CUST001" },
      "dimFrom": { ... },
      "dimTo": null
    }
  ],
  "pagination": { ... }
}
```

---

### 3.6 GET /api/v1/inventory/transactions/:transId

**Mục đích:** Get chi tiết một transaction.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "transId": "TRX-20260308-000123",
    "refType": "SHIPMENT",
    "refId": "SHP-20260308-000001",
    "transType": "SHIPMENT_OUT",
    "qty": "-25000.000",
    "stage": "PHYSICAL",
    "correlationId": "corr-001",
    "reasonCode": null,
    "sourceApp": "API",
    "postedBy": "user-uuid",
    "postedAt": "2026-03-08T10:30:00Z",
    "isReversal": false,
    "reversalInfo": {
      "hasBeenReversed": false,
      "isReversal": false,
      "reversalLink": null
    }
  }
}
```

---

### 3.7 POST /api/v1/inventory/holds

**Mục đích:** Tạo hold/reserve stock cho outbound allocation.

**Request Body:**
```json
{
  "externalId": "hold-ship-001-line-01",
  "correlationId": "corr-hold-001",
  "shipmentId": "SHP-20260308-000001",
  "shipmentLineId": "LINE-01",
  "itemId": "uuid-item-1",
  "qty": "10000.000",
  "dim": {
    "warehouseCode": "WH5.1",
    "locationCode": "STORAGE-A1",
    "ownerCode": "CUST001",
    "statusCode": "AVAILABLE"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "holdId": "uuid",
    "holdNo": "HLD-20260308-ABCDEF",
    "holdQty": "10000.000",
    "idempotentReplay": false
  }
}
```

**Error Responses:**
| Code | Error | Description |
|------|-------|-------------|
| 422 | INV_INSUFFICIENT_STOCK | Not enough available stock |
| 422 | INV_STATUS_NOT_ALLOCATABLE | Status is not allocatable |

---

### 3.8 GET /api/v1/inventory/holds

**Mục đích:** List holds với filters.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | uuid | No | Filter by item |
| status | string | No | ACTIVE, RELEASED, CANCELLED |
| shipmentId | string | No | Filter by shipment |
| ownerId | uuid | No | Filter by owner |
| page | number | No | Page number |
| pageSize | number | No | Items per page |

---

### 3.9 POST /api/v1/inventory/holds/:holdId/release

**Mục đích:** Release hold (partial hoặc full).

**Request Body:**
```json
{
  "releaseQty": "5000.000",
  "correlationId": "corr-release-001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "holdId": "uuid",
    "holdNo": "HLD-20260308-ABCDEF",
    "releasedQty": "5000.000",
    "newStatus": "PARTIALLY_RELEASED"
  }
}
```

---

### 3.10 POST /api/v1/inventory/holds/:holdId/cancel

**Mục đích:** Cancel hold và release toàn bộ reserved qty.

**Request Body:**
```json
{
  "correlationId": "corr-cancel-001"
}
```

---

## 4. Transaction Types

| Trans Type | Description | Qty Sign | Dim From | Dim To |
|------------|-------------|----------|----------|--------|
| RECEIPT_IN | Nhập kho từ receipt | + | No | Yes |
| SHIPMENT_OUT | Xuất kho từ shipment | - | Yes | No |
| MOVE | Di chuyển nội bộ | ±0 | Yes | Yes |
| STATUS_CHANGE | Thay đổi status | ±0 | Yes | Yes |
| ADJUSTMENT | Điều chỉnh manual | ± | Yes/No | Yes/No |
| COUNT_GAIN | Kiểm kê thừa | + | No | Yes |
| COUNT_LOSS | Kiểm kê thiếu | - | Yes | No |
| VAS_CONSUME | VAS tiêu thụ | - | Yes | No |
| VAS_PRODUCE | VAS sản xuất | + | No | Yes |
| TRANSFER_OUT | Chuyển kho xuất | - | Yes | No |
| TRANSFER_IN | Chuyển kho nhập | + | No | Yes |

---

## 5. Event Codes (Mapping)

| Event Code | Source Module | Trigger State | Trans Type |
|------------|---------------|---------------|------------|
| RECEIPT_RECEIVED | M4 | RECEIVED | RECEIPT_IN |
| PUTAWAY_COMPLETED | M7 | COMPLETED | MOVE |
| SHIPMENT_SHIPPED | M5 | SHIPPED | SHIPMENT_OUT |
| MOVE_COMPLETED | M6 | COMPLETED | MOVE |
| STATUS_CHANGE_CONFIRMED | M6 | CONFIRMED | STATUS_CHANGE |
| ADJUSTMENT_APPROVED | M6 | APPROVED | ADJUSTMENT |
| COUNT_GAIN_RECONCILED | M6 | RECONCILED | COUNT_GAIN |
| COUNT_LOSS_RECONCILED | M6 | RECONCILED | COUNT_LOSS |

---

## 6. Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INV_DUPLICATE_EXTERNAL_ID | 409 | Duplicate external_id for same trans_type |
| INV_IDEMPOTENCY_CONFLICT | 409 | Same key, different payload |
| INV_INVALID_EVENT_CODE | 422 | Event code not found or inactive |
| INV_INVALID_DIMENSION | 422 | Dimension validation failed |
| INV_MASTER_INACTIVE | 422 | Item/Owner/Location/Status inactive |
| INV_INSUFFICIENT_STOCK | 422 | Not enough available stock |
| INV_NEGATIVE_STOCK_BLOCKED | 422 | Would result in negative stock |
| INV_REVERSAL_NOT_ALLOWED | 422 | Cannot reverse this transaction |
| INV_ALREADY_REVERSED | 409 | Transaction already reversed |
| INV_HOLD_NOT_FOUND | 404 | Hold not found |
| INV_HOLD_INSUFFICIENT_QTY | 422 | Release qty exceeds hold qty |
| INV_TRANS_NOT_FOUND | 404 | Transaction not found |
| INV_REASON_CODE_REQUIRED | 400 | Reason code required |
| INV_STATUS_NOT_ALLOCATABLE | 422 | Status is not allocatable |

---

## 7. Dependencies

### Module 1 - Foundation
- **RBAC**: Permission check (inventory.post, inventory.reverse, etc.)
- **Audit**: Ghi audit log cho mọi posting/reversal
- **Number Sequence**: Sinh trans_id (TRX)
- **Reason Code**: Validate reason cho reversal/adjustment

### Module 2 - Master Data
- **md_owner**: Owner dimension validation
- **md_warehouse**: Warehouse dimension validation
- **md_location**: Location dimension validation
- **md_inventory_status**: Status dimension validation
- **md_item**: Item validation
- **md_uom**: UOM validation

---

## 8. Usage Examples

### Example 1: Post Receipt Inbound
```javascript
const response = await fetch('/api/v1/inventory/postings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    externalId: `rcpt-${receiptId}-${lineId}`,
    correlationId: requestId,
    eventCode: 'RECEIPT_RECEIVED',
    refType: 'RECEIPT',
    refId: receiptId,
    refLineId: lineId,
    itemId: item.id,
    qty: '50000.000',
    uomCode: 'KG',
    dimTo: {
      warehouseCode: 'WH5.1',
      locationCode: 'RECEIVING-01',
      ownerCode: 'CUST001',
      statusCode: 'AVAILABLE'
    },
    sourceApp: 'API'
  })
});
```

### Example 2: Create Hold for Allocation
```javascript
const response = await fetch('/api/v1/inventory/holds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    externalId: `alloc-${shipmentId}-${lineId}`,
    correlationId: requestId,
    shipmentId: shipmentId,
    shipmentLineId: lineId,
    itemId: item.id,
    qty: '10000.000',
    dim: {
      warehouseCode: 'WH5.1',
      locationCode: 'STORAGE-A1',
      ownerCode: 'CUST001',
      statusCode: 'AVAILABLE'
    }
  })
});
```

### Example 3: Query Available Stock
```javascript
const response = await fetch(
  `/api/v1/inventory/onhand/availability?itemId=${itemId}&inventDimId=${dimId}&qty=10000`
);
const { data } = await response.json();
if (data.available) {
  // Proceed with allocation
}
```

