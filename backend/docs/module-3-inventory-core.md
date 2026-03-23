# Module 3: Inventory Core Engine - API Documentation

**Status:** ✅ Completed  
**Code Path:** `src/modules/inventory-core`  
**Version:** 3.1
**Last Updated:** 2026-03-23

---

## 1. Module Overview

Module 3 là **trái tim dữ liệu vận hành** của SWM, chịu trách nhiệm quản lý toàn bộ inventory backbone:

- **InventDim**: Dimension tồn kho (site, warehouse, location, owner, status)
- **InventTrans**: Ledger bất biến ghi nhận mọi biến động tồn kho theo **stage** (EXPECTED → REGISTERED → ALLOCATED → DE_ALLOCATED → PHYSICAL → DEDUCTED)
- **OnHand**: Current balance projection với 4 bucket gốc: `physicalQty`, `allocatedQty`, `inboundOrderedQty`, `outboundOrderedQty`
- **Posting Engine**: Cổng vào duy nhất — ghi ledger (`invent_trans`) ONLY, không update `on_hand` trực tiếp
- **Materialization Service**: Thành phần DUY NHẤT update `on_hand` — đọc delta từ ledger, apply vào read model
- **Reversal Engine**: Đảo chiều transaction — ghi reversal ledger, materializer update on_hand
- **Allocation**: Capability nội bộ — advisory lock + ledger-based check + post ledger
- **Reconciliation**: So sánh ledger vs on-hand để phát hiện bất thường
- **Snapshot**: Chụp daily storage snapshot cho M10 Billing

### Nguyên tắc cốt lõi
- Mọi thay đổi tồn kho **PHẢI** đi qua Posting Engine
- Ledger (`invent_trans`) là **bất biến** - không UPDATE/DELETE
- Correction phải dùng **reversal transaction**
- `OnHand` là **read model** — chỉ được update bởi `MaterializationService`, không bao giờ bởi posting engine hoặc hold service trực tiếp
- `availableQty` **không phải bucket gốc** — chỉ là giá trị tính ra khi query: `available = physical - allocated`
- Allocation/hold là capability nội bộ, không expose như nghiệp vụ public độc lập
- Không tạo bucket reserve riêng theo module (không có `reserved_qty_vas`, `reserved_qty_outbound`...)
- `lot.service.js` tồn tại trong M3 nhưng chỉ là thin wrapper gọi M2. Lot lifecycle thuộc M2

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
│   ├── invent-dim.service.js         # Dimension service
│   ├── materialization.service.js    # ONLY component that updates on_hand (read model)
│   ├── reconciliation.service.js     # Reconciliation service (HI-1 fix)
│   └── snapshot.service.js           # Daily snapshot service (HI-1 fix)
└── infra/
    ├── invent-dim.repository.js      # InventDim data access
    ├── invent-trans.repository.js    # InventTrans data access
    ├── onhand.repository.js          # OnHand data access (optimistic lock)
    ├── hold.repository.js            # Hold data access (NumberSequence)
    ├── reversal-link.repository.js   # ReversalLink data access
    ├── event-mapping.repository.js   # EventMapping data access
    └── audit-log.adapter.js          # M1 AuditLog integration (HI-4 fix)
```

---

## 3. Các thành phần dùng chung mà module dựa vào

### Guards & Middleware
- `middleware/auth.middleware.js` - Express middleware wrapper cho authentication
- `middleware/auth.middleware.js` - Express middleware wrapper cho permission check

### Foundation Services (từ Module 1)
- `NumberSequenceService` - Sinh transId (TRX-*), holdNo (HLD-*)
- `ReasonCode` - Validate reason codes cho reversal/adjustment
- `LogService` - AuditLog integration qua `audit-log.adapter.js`

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
  "eventCode": "SHIP_CONFIRMED",
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
    "transType": "ISSUE",
    "stage": "DEDUCTED",
    "itemId": "uuid-item-1",
    "qty": "25000.000",
    "onHandAfter": {
      "physicalQty": "5000.000",
      "allocatedQty": "0.000",
      "inboundOrderedQty": "0.000",
      "outboundOrderedQty": "0.000",
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
      "allocatedQty": "10000.000",
      "inboundOrderedQty": "5000.000",
      "outboundOrderedQty": "3000.000",
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

**Mục đích:** Check available stock cho allocation. Internally sử dụng **ledger-based calculation + pessimistic lock** theo item + dim để tránh oversell khi concurrent request.

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
    "allocatedQty": "10000.000",
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
      "transType": "ISSUE",
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
    "transType": "ISSUE",
    "qty": "-25000.000",
    "stage": "DEDUCTED",
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

> **Lưu ý:** Hold/Allocation là **capability nội bộ** phục vụ outbound flow (M5). Không phải nghiệp vụ public độc lập.

**Mục đích:** Tạo allocation (giữ chỗ) stock cho outbound.

**Allocation Flow (per customer guide):**
1. **Advisory lock** — `pg_advisory_xact_lock(hashtext(item_id|invent_dim_id))` via `$executeRawUnsafe` — chặn concurrent allocation, auto-release on commit/rollback
2. **Tính available từ LEDGER** — `calculateAvailableFromLedger()`:
   - `ledgerPhysical` = SUM(invent_trans) cho item+dim với stage IN (PHYSICAL, DEDUCTED)
   - `onHandPhysical` = on_hand.physical_qty (fallback cho seeded data chưa có ledger entries)
   - `physical` = MAX(ledgerPhysical, onHandPhysical)
   - `allocated` = SUM(active inventory_hold.hold_qty - released_qty)
   - `available` = physical - allocated
3. **Validate** available >= requested
4. **Insert** `inventory_hold`
5. **Post ledger** `ALLOCATION_CREATED` → tạo `invent_trans` stage=ALLOCATED → posting engine update on_hand allocatedQty += qty
6. **Commit** — advisory lock tự release

**Release/Cancel Flow:**
1. **Advisory lock** — cùng key (item_id|invent_dim_id)
2. **Post ledger** `ALLOCATION_RELEASED` → tạo `invent_trans` stage=DE_ALLOCATED → posting engine update on_hand allocatedQty -= qty
3. **Update hold status** → PARTIALLY_RELEASED / RELEASED / CANCELLED

> **Fallback logic:** `physical = MAX(ledger, on_hand)` — đảm bảo seeded data (chỉ có on_hand, chưa có invent_trans) vẫn có thể allocate. Khi hệ thống chạy lâu, tất cả data đều đi qua posting engine nên ledger = on_hand.

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

**Mục đích:** Cancel hold và release toàn bộ allocated qty.

**Request Body:**
```json
{
  "correlationId": "corr-cancel-001"
}
```

---

### 3.11 Reconciliation APIs

#### POST /api/v1/inventory/reconciliation/runs

**Mục đích:** Tạo reconciliation run mới để so sánh ledger vs on-hand.

**Request Body:**
```json
{
  "runType": "ON_DEMAND",
  "scopeType": "WAREHOUSE",
  "warehouseId": "uuid",
  "correlationId": "corr-recon-001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "runNo": "RECON-20260309-001",
    "status": "RUNNING",
    "startedAt": "2026-03-09T10:00:00Z"
  }
}
```

---

#### GET /api/v1/inventory/reconciliation/runs

**Mục đích:** List reconciliation runs.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | RUNNING, COMPLETED, FAILED |
| warehouseId | uuid | No | Filter by warehouse |
| fromDate | date | No | From started date |
| toDate | date | No | To started date |

---

#### GET /api/v1/inventory/reconciliation/runs/:runId

**Mục đích:** Get chi tiết reconciliation run với results.

---

#### POST /api/v1/inventory/reconciliation/results/:resultId/review

**Mục đích:** Mark reconciliation result as reviewed.

---

#### POST /api/v1/inventory/reconciliation/results/:resultId/resolve

**Mục đích:** Resolve reconciliation result (tạo adjustment posting nếu cần).

---

### 3.12 POST /api/v1/inventory/materialization/rebuild

**Mục đích:** Rebuild toàn bộ `on_hand` từ `invent_trans` ledger. Dùng khi nghi ngờ on_hand bị lệch hoặc sau migration.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rebuilt": 32,
    "total": 32,
    "message": "Rebuilt 32/32 on_hand records from ledger"
  }
}
```

> **Cảnh báo:** Rebuild lock toàn bộ on_hand records — chỉ chạy khi không có posting đang xử lý.

---

### 3.13 Snapshot APIs

#### POST /api/v1/inventory/snapshots/runs

**Mục đích:** Tạo snapshot run để capture daily storage.

**Request Body:**
```json
{
  "snapshotDate": "2026-03-09",
  "warehouseId": "uuid",
  "runMode": "MANUAL",
  "correlationId": "corr-snap-001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "runNo": "SNAP-20260309-001",
    "status": "RUNNING",
    "snapshotDate": "2026-03-09"
  }
}
```

---

#### GET /api/v1/inventory/snapshots/runs

**Mục đích:** List snapshot runs.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | RUNNING, COMPLETED, FAILED |
| warehouseId | uuid | No | Filter by warehouse |
| snapshotDate | date | No | Filter by snapshot date |

---

#### GET /api/v1/inventory/snapshots/runs/:runId

**Mục đích:** Get chi tiết snapshot run.

---

#### GET /api/v1/inventory/snapshots/billing

**Mục đích:** Query snapshot data cho M10 Billing.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| ownerId | uuid | Yes | Owner ID |
| fromDate | date | Yes | From date |
| toDate | date | Yes | To date |
| warehouseId | uuid | No | Filter by warehouse |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "snapshotDate": "2026-03-09",
      "ownerId": "uuid",
      "itemId": "uuid",
      "warehouseId": "uuid",
      "openingQty": "10000.000",
      "inboundTodayQty": "5000.000",
      "outboundTodayQty": "2000.000",
      "closingQty": "13000.000"
    }
  ]
}
```

---

#### GET /api/v1/inventory/snapshots/billing/aggregate

**Mục đích:** Aggregate snapshot data theo owner/warehouse cho billing period.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| ownerId | uuid | Yes | Owner ID |
| fromDate | date | Yes | From date |
| toDate | date | Yes | To date |
| groupBy | string | No | warehouse, item (default: warehouse) |

---

## 5. Inventory Stages

Mỗi transaction được gắn một `stage` thể hiện bước nào trong lifecycle nghiệp vụ:

| Stage | Ý nghĩa | Ảnh hưởng bucket |
|-------|---------|-------------------|
| `EXPECTED` | Có kế hoạch/demand, chưa tác động vật lý | Inbound: +`inboundOrderedQty`; Outbound: +`outboundOrderedQty` |
| `REGISTERED` | Đã tạo chứng từ, chưa thay đổi tồn thực | Chưa thay đổi bucket chính |
| `ALLOCATED` | Giữ chỗ hàng cho nhu cầu đã commit | +`allocatedQty` (giảm available) |
| `DE_ALLOCATED` | Giải phóng phần đã allocate | -`allocatedQty` (tăng available) |
| `PHYSICAL` | Thay đổi vật lý thật trên hàng | ±`physicalQty` |
| `DEDUCTED` | Hoàn tất trừ tồn logic cuối cùng | -`physicalQty`, -`allocatedQty`, -`outboundOrderedQty` |

---

## 6. Transaction Types

| Trans Type | Description | Qty Sign | Dim From | Dim To |
|------------|-------------|----------|----------|--------|
| RECEIPT | Nhập kho (dùng cho mọi stage inbound) | + | No | Yes |
| ISSUE | Xuất kho (dùng cho mọi stage outbound) | - | Yes | No |
| MOVE | Di chuyển nội bộ | ±0 | Yes | Yes |
| STATUS_CHANGE | Thay đổi status | ±0 | Yes | Yes |
| ADJUSTMENT | Điều chỉnh manual / count / waste | ± | Yes/No | Yes/No |
| TRANSFER_ISSUE | Chuyển kho xuất (phía kho nguồn) | - | Yes | No |
| TRANSFER_RECEIPT | Chuyển kho nhập (phía kho đích) | + | No | Yes |

---

## 7. Event Codes – Stage-based Mapping

### 6.1 Inbound Postings (M4 → M3)

| Event Code | Source | Stage | Trans Type | Bucket Effect |
|------------|--------|-------|------------|---------------|
| `PO_CONFIRMED` | M4 (Receipt create) | EXPECTED | RECEIPT | +`inboundOrderedQty` — posted khi tạo phiếu nhập (Receipt), không phải khi confirm PO |
| `RECEIPT_CREATED` | M4 | REGISTERED | RECEIPT | (ghi nhận chứng từ, chưa thay đổi bucket) |
| `GOODS_RECEIVED` | M4 | PHYSICAL | RECEIPT | +`physicalQty`, -`inboundOrderedQty` |
| `PUTAWAY_COMPLETED` | M7 | PHYSICAL | MOVE | move location (tổng physicalQty không đổi) |

**Inbound Lifecycle Example (v3.1):**
```
PO-001: đặt mua 500 KG WHEAT-SOFT (Cargill)
  ┌─ PO Confirm         → chỉ đổi status PO → CONFIRMED
  │                        (KHÔNG post M3 — PO "kho phân phối" là planning)
  │
  ├─ Receipt-001 (phiếu nhập 1, chọn kho WH5.1)
  │  ├─ Create           → PO_CONFIRMED (EXPECTED)    → inboundOrderedQty += 200 tại WH5.1
  │  └─ Nhận hàng 200kg → GOODS_RECEIVED (PHYSICAL)   → physicalQty += 200, inboundOrderedQty -= 200
  │
  ├─ Receipt-002 (phiếu nhập 2, chọn kho WH-02)
  │  ├─ Create           → PO_CONFIRMED (EXPECTED)    → inboundOrderedQty += 300 tại WH-02
  │  └─ Nhận hàng 300kg → GOODS_RECEIVED (PHYSICAL)   → physicalQty += 300, inboundOrderedQty -= 300
  │
  └─ Receipt Cancel:
     → Reverse PO_CONFIRMED → inboundOrderedQty -= reversed qty (floor 0)
```

> **v3.1:** `inboundOrderedQty` post ở level Receipt (phiếu nhập), không phải PO. Receipt mới biết kho cụ thể nhận hàng.
> **Floor to 0:** Nếu nhận quá (over-receive), inboundOrdered không bao giờ âm.

### 6.2 Outbound Postings (M5 → M3)

| Event Code | Source | Stage | Trans Type | Bucket Effect |
|------------|--------|-------|------------|---------------|
| `SO_CONFIRMED` | M5 (SHP create) | EXPECTED | ISSUE | +`outboundOrderedQty` — posted khi tạo phiếu xuất (SHP), không phải khi confirm SO |
| `ALLOCATION_CREATED` | M5 | ALLOCATED | ISSUE | +`allocatedQty` |
| `ALLOCATION_RELEASED` | M5 | DE_ALLOCATED | ISSUE | -`allocatedQty` |
| `PICK_CONFIRMED` | M7 | PHYSICAL | ISSUE | move nội bộ (storage → staging/picking zone) |
| `LOAD_CONFIRMED` | M5 | PHYSICAL | ISSUE | move nội bộ (staging → dock/vehicle) |
| `SHIP_CONFIRMED` | M5 | DEDUCTED | ISSUE | -`physicalQty`, -`allocatedQty`, -`outboundOrderedQty` |

**Outbound Lifecycle Example (v3.1):**
```
SO-001: xuất 1000 KG RICE-5T (OWN-001)
  ┌─ SO Confirm         → chỉ đổi status SO → CONFIRMED
  │                        (KHÔNG post M3 — SO không biết kho cụ thể)
  │
  ├─ SHP Create (chọn kho WH-01)
  │   → SO_CONFIRMED (EXPECTED) → outboundOrderedQty += 1000 tại WH-01
  │   → Availability check: nếu kho thiếu tồn → block + báo lỗi
  │
  ├─ Allocate 1000      → ALLOCATION_CREATED (ALLOCATED) → allocatedQty += 1000
  │                                                        → availableQty -= 1000
  │
  ├─ Pick (nếu có)      → PICK_CONFIRMED (PHYSICAL)     → move location (storage → staging)
  │
  ├─ Load (nếu có)      → LOAD_CONFIRMED (PHYSICAL)     → move location (staging → dock)
  │
  ├─ Ship Confirm       → SHIP_CONFIRMED (DEDUCTED)     → physicalQty -= 1000
  │                                                       → allocatedQty -= 1000
  │                                                       → outboundOrderedQty -= 1000
  │
  └─ SHP Cancel         → Reverse SO_CONFIRMED           → outboundOrderedQty -= 1000
```

> **v3.1:** `outboundOrderedQty` post ở level SHP (phiếu xuất), không phải SO (đơn bán hàng). SHP mới biết kho cụ thể → nhu cầu xuất hiện đúng warehouse trên tồn kho.
> **Availability check:** Khi tạo SHP, check tồn kho tại warehouse đó. Nếu không đủ → block + hiện lỗi chi tiết trong form.

### 6.3 Transfer Postings (M6 → M3)

| Event Code | Source | Stage | Trans Type | Bucket Effect |
|------------|--------|-------|------------|---------------|
| `TRANSFER_ORDER_CONFIRMED` | M6 | EXPECTED | TRANSFER_ISSUE | +`outboundOrderedQty` (kho nguồn) |
| `TRANSFER_ISSUED` | M6 | DEDUCTED | TRANSFER_ISSUE | -`physicalQty` (kho nguồn), -`outboundOrderedQty` |
| `TRANSFER_RECEIVED` | M6 | PHYSICAL | TRANSFER_RECEIPT | +`physicalQty` (kho đích) |

### 6.4 VAS Postings (M9 → M3)

| Event Code | Source | Stage | Trans Type | Bucket Effect |
|------------|--------|-------|------------|---------------|
| `VAS_ORDER_CONFIRMED` | M9 | EXPECTED | ISSUE | +`outboundOrderedQty` (nguyên liệu) |
| `VAS_CONSUMED` | M9 | DEDUCTED | ISSUE | -`physicalQty` (nguyên liệu), -`outboundOrderedQty` |
| `VAS_PRODUCED` | M9 | PHYSICAL | RECEIPT | +`physicalQty` (thành phẩm) |
| `VAS_WASTE` | M9 | PHYSICAL | ADJUSTMENT | -`physicalQty` (hao hụt) |

### 6.5 Inventory Control Postings (M6 → M3)

| Event Code | Source | Stage | Trans Type | Bucket Effect |
|------------|--------|-------|------------|---------------|
| `MOVE_COMPLETED` | M6 | PHYSICAL | MOVE | move location |
| `STATUS_CHANGE_CONFIRMED` | M6 | PHYSICAL | STATUS_CHANGE | change dim status |
| `ADJUSTMENT_APPROVED` | M6 | PHYSICAL | ADJUSTMENT | ±`physicalQty` |
| `COUNT_GAIN_RECONCILED` | M6 | PHYSICAL | ADJUSTMENT | +`physicalQty` |
| `COUNT_LOSS_RECONCILED` | M6 | PHYSICAL | ADJUSTMENT | -`physicalQty` |

---

## 8. Stage-based Delta Logic (`getInventoryDelta`)

Posting Engine sử dụng hàm `getInventoryDelta(transType, stage, qty)` trong `inventory.rules.js` để tính delta cho **tất cả 4 bucket** khi post transaction. Đây là core business rule.

### 7.1 Delta Matrix — `(transType + stage) → bucket effects`

| transType | stage | physicalDelta | allocatedDelta | inboundOrderedDelta | outboundOrderedDelta |
|-----------|-------|:---:|:---:|:---:|:---:|
| RECEIPT | EXPECTED | 0 | 0 | **+qty** | 0 |
| RECEIPT | REGISTERED | 0 | 0 | 0 | 0 |
| RECEIPT | PHYSICAL | **+qty** | 0 | **-qty** | 0 |
| ISSUE | EXPECTED | 0 | 0 | 0 | **+qty** |
| ISSUE | ALLOCATED | 0 | **+qty** | 0 | 0 |
| ISSUE | DE_ALLOCATED | 0 | **-qty** | 0 | 0 |
| ISSUE | PHYSICAL | 0 | 0 | 0 | 0 |
| ISSUE | DEDUCTED | **-qty** | **-qty** | 0 | **-qty** |
| TRANSFER_ISSUE | EXPECTED | 0 | 0 | 0 | **+qty** |
| TRANSFER_ISSUE | DEDUCTED | **-qty** | 0 | 0 | **-qty** |
| TRANSFER_RECEIPT | PHYSICAL | **+qty** | 0 | 0 | 0 |
| ADJUSTMENT | PHYSICAL | **+qty** | 0 | 0 | 0 |
| MOVE | * | 0 | 0 | 0 | 0 |
| STATUS_CHANGE | * | 0 | 0 | 0 | 0 |

> **MOVE/STATUS_CHANGE** không dùng delta matrix — chúng dùng legacy dim from/to logic (trừ physicalQty ở source dim, cộng ở target dim).

> **ISSUE + PHYSICAL** (pick/load) trả delta = 0 vì pick/load là internal move giữa locations, xử lý bằng dim from/to riêng.

### 7.2 On-Hand Update Flow

```
eventCode → EventMapping → { transType, stage }
                              ↓
                     getInventoryDelta(transType, stage, qty)
                              ↓
                   { physicalDelta, allocatedDelta, inboundOrderedDelta, outboundOrderedDelta }
                              ↓
                     onHandRepo.updateQty(id, deltas)
                              ↓
                   physicalQty += physicalDelta
                   allocatedQty += allocatedDelta
                   inboundOrderedQty += inboundOrderedDelta  (floor 0)
                   outboundOrderedQty += outboundOrderedDelta (floor 0)
                   availableQty = physicalQty - allocatedQty
```

### 7.3 Reversal Logic

Reversal negate toàn bộ delta gốc của transaction:
- Lấy `transType` + `stage` từ original transaction
- Gọi `getInventoryDelta(transType, stage, qty)` → lấy delta gốc
- Negate tất cả: `{ -physicalDelta, -allocatedDelta, -inboundOrderedDelta, -outboundOrderedDelta }`
- Apply vào on-hand

**Auto-reversal khi cancel:**
| Module | Action | Reversal target | Effect |
|--------|--------|----------------|--------|
| M4 | Receipt cancel | Reverse `PO_CONFIRMED` (stage=EXPECTED) refId=receiptId | -`inboundOrderedQty` |
| M5 | SHP cancel | Reverse `SO_CONFIRMED` (stage=EXPECTED) refId=shipmentId | -`outboundOrderedQty` |

> **v3.1:** SO cancel/unconfirm KHÔNG reverse M3 (vì SO không post M3). SHP cancel mới reverse.

Logic: tìm tất cả `InventTrans` có `refId=entityId`, `stage=EXPECTED`, `isReversal=false` → reverse từng trans. Skip nếu đã reversed.

### 7.3.1 Idempotency khi re-confirm

Khi PO/SO được unconfirm rồi confirm lại, caller **phải dùng externalId unique mỗi lần** (ví dụ chứa timestamp). Nếu dùng externalId cố định:
- M3 idempotency check tìm thấy transaction cũ (đã bị reversed)
- Trả `idempotentReplay: true` → không tạo transaction mới
- `inboundOrderedQty` / `outboundOrderedQty` không tăng lại

Pattern đúng: `externalId: PO-CONFIRM-{poId}-{lineId}-{Date.now()}`

### 7.4 `availableQty` luôn là computed

```
availableQty = physicalQty - allocatedQty
```

Không bao giờ update `availableQty` trực tiếp. Nó được tính lại mỗi khi `physicalQty` hoặc `allocatedQty` thay đổi.

### 7.5 Ordered qty floor = 0

`inboundOrderedQty` và `outboundOrderedQty` được floor về 0 khi update — không cho phép giá trị âm. Điều này xử lý trường hợp short receive hoặc partial cancel.

---

## 8.5 Architecture: Write Path vs Read Model (per customer guide)

```
                    ┌─────────────────────────────┐
 Business Module    │  postInventory(eventCode)    │
 (M4/M5/M6/M7/M9)  └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
 Posting Engine     │  1. Validate event mapping   │
 (WRITE PATH)       │  2. Resolve dimensions       │
                    │  3. INSERT invent_trans       │  ← LEDGER (source of truth)
                    │  4. Call materializer         │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
 Materializer       │  5. Read delta from trans     │
 (READ MODEL SYNC)  │  6. UPDATE on_hand           │  ← READ MODEL (projection)
                    └─────────────────────────────┘
```

**Key rules:**
- Posting engine **KHÔNG** update `on_hand` trực tiếp
- Hold service **KHÔNG** update `on_hand` trực tiếp
- `MaterializationService` là thành phần **DUY NHẤT** update `on_hand`
- `on_hand` có thể **rebuild** từ `invent_trans` bất kỳ lúc nào via `POST /materialization/rebuild`

**Rebuild API:**
```
POST /api/v1/inventory/materialization/rebuild
→ { rebuilt: 32, total: 32, message: "Rebuilt 32/32 on_hand records from ledger" }
```

---

## 9. Error Codes (24 total)

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
| INV_LOCK_TIMEOUT | 503 | Optimistic lock failed (concurrent update) |
| INV_TRANS_NOT_FOUND | 404 | Transaction not found |
| INV_REASON_CODE_REQUIRED | 400 | Reason code required |
| INV_ONHAND_NOT_FOUND | 404 | On-hand record not found |
| INV_ITEM_NOT_FOUND | 404 | Item not found or inactive |
| INV_UOM_NOT_FOUND | 404 | UOM not found or inactive |
| INV_WAREHOUSE_NOT_FOUND | 404 | Warehouse not found or inactive |
| INV_LOCATION_NOT_FOUND | 404 | Location not found or inactive |
| INV_OWNER_NOT_FOUND | 404 | Owner not found or inactive |
| INV_STATUS_NOT_FOUND | 404 | Inventory status not found or inactive |
| INV_STATUS_NOT_ALLOCATABLE | 422 | Status is not allocatable |
| INV_RECON_SCOPE_INVALID | 422 | Invalid reconciliation scope |
| INV_SNAPSHOT_VERSION_CONFLICT | 409 | Snapshot already exists for this date |

---

## 10. Concurrency & Idempotency Patterns

### 9.1 Idempotency

| Operation | Dedup Key | Behavior |
|-----------|----------|----------|
| Posting | `externalId + transType` | Returns existing result with `idempotentReplay: true` |
| Reversal | `externalId` | Returns existing reversal with `idempotentReplay: true` |
| Hold | `externalId` | Returns existing hold with `idempotentReplay: true` |
| Snapshot | `snapshotDate + warehouseId` | Returns ALREADY_EXISTS (unless RERUN mode) |

> **Re-confirm pattern**: callers phải dùng `externalId` chứa timestamp (ví dụ `PO-CONFIRM-{id}-{lineId}-{Date.now()}`) để tránh idempotent replay khi confirm lại sau unconfirm.

### 9.2 Concurrency Control

| Pattern | Location | Description |
|---------|----------|-------------|
| **Advisory Lock** | `hold.service.js` | `pg_advisory_xact_lock(hashtext(item\|dim))` via `$executeRawUnsafe` — chặn concurrent allocation, auto-release on commit |
| **Ledger-based Check** | `hold.service.js` | `calculateAvailableFromLedger()` — physical từ MAX(ledger, on_hand), allocated từ active holds |
| Optimistic Locking | `onhand.repository.js` | `rowVersion` WHERE clause — throw error nếu concurrent update |
| Transaction Wrapping | All services | Prisma `$transaction()` cho atomic operations |
| External Transaction | `posting-engine.service.js` | `externalTx` param cho caller's transaction participation |

### 9.3 Decimal Precision

Tất cả quantity calculations dùng `Decimal.js` — tránh floating-point rounding errors. Quantities lưu DB dạng `DECIMAL(18,3)`, truyền qua API dạng string.

---

## 11. Audit Log Actions

M3 ghi audit log qua `AuditLogAdapter` (fire-and-forget, non-blocking):

| Action | Entity | Trigger |
|--------|--------|---------|
| `INVENTORY_POSTING` | `INVENT_TRANS` | postInventory thành công |
| `INVENTORY_REVERSAL` | `INVENT_TRANS` | reverseTransaction thành công |
| `HOLD_CREATE` | `INVENTORY_HOLD` | createHold thành công |
| `HOLD_RELEASE` | `INVENTORY_HOLD` | releaseHold thành công |
| `HOLD_CANCEL` | `INVENTORY_HOLD` | cancelHold thành công |
| `RECONCILIATION_EXECUTE` | `RECONCILIATION_RUN` | createReconciliationRun |
| `SNAPSHOT_EXECUTE` | `SNAPSHOT_RUN` | createSnapshotRun |

---

## 12. Validation Schemas (Joi)

Defined in `inventory-core.schema.js`. Key schemas:

### postingSchema
```
externalId: string(120) required
correlationId: string(120) required
eventCode: string(50) required
refType: string(40) required
refId: string(50) required
refLineId: string(50) optional
itemId: uuid required
qty: string required
uomCode: string(20) required
dimFrom: { warehouseCode, locationCode, ownerCode, statusCode } optional
dimTo: { warehouseCode, locationCode, ownerCode, statusCode } optional
reasonCode: string(50) optional
sourceApp: enum(WEB|MOBILE|API|INTEGRATION|SYSTEM) required
postedBy: uuid optional
weighbridgeTicketId: string(50) optional
```

### holdCreateSchema
```
externalId: string(120) optional
correlationId: string(120) required
shipmentId: string(50) optional
shipmentLineId: string(50) optional
workHeaderId: string(50) optional
itemId: uuid required
qty: string required
dim: { warehouseCode, locationCode, ownerCode, statusCode } required
reasonCode: string(50) optional
```

---

## 13. Dependencies

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

## 14. Usage Examples

### Example 1: Inbound – PO Confirmed (stage EXPECTED)
```javascript
await fetch('/api/v1/inventory/postings', {
  method: 'POST',
  body: JSON.stringify({
    externalId: `po-${poId}-${lineId}`,
    correlationId: requestId,
    eventCode: 'PO_CONFIRMED',
    refType: 'PURCHASE_ORDER',
    refId: poId,
    refLineId: lineId,
    itemId: item.id,
    qty: '50000.000',
    uomCode: 'KG',
    dimTo: {
      warehouseCode: 'WH5.1',
      ownerCode: 'CUST001'
    },
    sourceApp: 'API'
  })
});
// → stage=EXPECTED, transType=RECEIPT, +inboundOrderedQty
```

### Example 2: Inbound – Goods Received (stage PHYSICAL)
```javascript
await fetch('/api/v1/inventory/postings', {
  method: 'POST',
  body: JSON.stringify({
    externalId: `rcpt-${receiptId}-${lineId}`,
    correlationId: requestId,
    eventCode: 'GOODS_RECEIVED',
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
// → stage=PHYSICAL, transType=RECEIPT, +physicalQty, -inboundOrderedQty
```

### Example 3: Outbound – SO Confirmed (stage EXPECTED)
```javascript
await fetch('/api/v1/inventory/postings', {
  method: 'POST',
  body: JSON.stringify({
    externalId: `so-${soId}-${lineId}`,
    correlationId: requestId,
    eventCode: 'SO_CONFIRMED',
    refType: 'SALES_ORDER',
    refId: soId,
    refLineId: lineId,
    itemId: item.id,
    qty: '10000.000',
    uomCode: 'KG',
    dimFrom: {
      warehouseCode: 'WH5.1',
      ownerCode: 'CUST001'
    },
    sourceApp: 'API'
  })
});
// → stage=EXPECTED, transType=ISSUE, +outboundOrderedQty
```

### Example 4: Outbound – Allocation (stage ALLOCATED, internal)
```javascript
// Thường được gọi bởi M5 outbound service, không phải user trực tiếp
await fetch('/api/v1/inventory/holds', {
  method: 'POST',
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
// → stage=ALLOCATED, +allocatedQty
```

### Example 5: Outbound – Ship Confirmed (stage DEDUCTED)
```javascript
await fetch('/api/v1/inventory/postings', {
  method: 'POST',
  body: JSON.stringify({
    externalId: `ship-${shipmentId}-${lineId}`,
    correlationId: requestId,
    eventCode: 'SHIP_CONFIRMED',
    refType: 'SHIPMENT',
    refId: shipmentId,
    refLineId: lineId,
    itemId: item.id,
    qty: '10000.000',
    uomCode: 'KG',
    dimFrom: {
      warehouseCode: 'WH5.1',
      locationCode: 'DOCK-01',
      ownerCode: 'CUST001',
      statusCode: 'AVAILABLE'
    },
    sourceApp: 'API'
  })
});
// → stage=DEDUCTED, transType=ISSUE, -physicalQty, -allocatedQty, -outboundOrderedQty
```

### Example 6: Query Available Stock
```javascript
const { data } = await fetch(
  `/api/v1/inventory/onhand/availability?itemId=${itemId}&inventDimId=${dimId}&qty=10000`
).then(r => r.json());
// data.availableQty = physicalQty - allocatedQty (computed, not stored as bucket)
if (data.available) {
  // Proceed with allocation
}
```

