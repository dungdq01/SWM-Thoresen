# Module: Sales Orders — API Documentation

**Module Path:** `src/modules/sales-orders`  
**Status:** ✅ Implemented & Tested  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**PRD Reference:** Section 5.5, 7.1 (THORESEN_SWM_PRD_VIBECODING_v2_0.md)

---

## 1. Mục đích Module

Module Sales Orders quản lý **đơn bán hàng (Sales Order)** — là chứng từ thương mại cha (parent document) của Shipment trong luồng Outbound. Tương tự cách PurchaseOrder là parent của Receipt trong luồng Inbound.

### Vai trò trong hệ thống:

```
Sale Order (SO) ←── chứng từ thương mại gốc
    │
    ├── Shipment 1 (một phần qty)
    ├── Shipment 2 (một phần qty)
    └── Shipment N (phần còn lại)
```

### Các chức năng chính:
- **SO Management**: Tạo, cập nhật, confirm, cancel, close Sales Order
- **SO Line Management**: Quản lý chi tiết mặt hàng, số lượng, đơn giá
- **Shipment Release**: Kiểm soát qty khi tạo Shipment từ SO (blocking rule)
- **SO Fulfillment Tracking**: Theo dõi tiến độ giao hàng theo SO
- **State Machine**: Quản lý lifecycle SO theo business rules từ PRD
- **Audit & History**: Lưu lịch sử trạng thái

### Nguyên tắc thiết kế:
- **SO không sở hữu inventory** — chỉ là context dẫn đến Shipment → Allocation → Ship → InventTrans
- **Blocking rule**: SUM(shipment.expected_qty) ≤ SO.expected_qty per line [TC-11 CONFIRMED]
- **Idempotency**: Mọi command API nhận `externalId` để ngăn duplicate
- **State machine enforce ở backend** — không dựa vào UI

---

## 2. Cấu trúc Code (Clean Architecture)

```
src/modules/sales-orders/
├── sales-order.module.js           # Module exports + route registration
│
├── sales-order.controller.js       # HTTP handlers (CRUD + actions)
├── sales-order.routes.js           # Route definitions
├── sales-order.schema.js           # Joi validation schemas
│
├── application/
│   └── sales-order.service.js      # Core business logic + orchestration
│
├── domain/
│   ├── sales-order.state-machine.js  # SO status transitions
│   ├── sales-order.policy.js         # Business policies & blocking rules
│   └── sales-order.errors.js         # Domain-specific errors
│
├── infra/
│   ├── sales-order.repository.js          # SO Header CRUD
│   ├── sales-order-line.repository.js     # SO Line CRUD
│   └── sales-order-status-history.repository.js # Status history
│
└── index.js                        # Module entry point
```

### Architecture Notes:
- Theo pattern của Module 4 Inbound (JavaScript, Express routes, Joi validation)
- **domain/**: Pure business logic, state machine, blocking rules
- **application/**: Service orchestration, gọi repository + domain
- **infra/**: Prisma data access
- **controller**: HTTP layer, validation, response mapping

---

## 3. Database Schema (Prisma)

### 3.1 Enums

```prisma
// ========== Sales Orders Enums ==========

enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_RELEASED
  FULLY_RELEASED
  SHIPPED
  CLOSED
  CANCELLED
}

enum SalesOrderLineStatus {
  OPEN
  PARTIALLY_RELEASED
  FULLY_RELEASED
  SHIPPED
  CLOSED
  CANCELLED
}

enum SalesOrderType {
  STANDARD        // Đơn bán thông thường
  CONSIGNMENT     // Gửi bán
  INTERNAL        // Xuất nội bộ
}
```

### 3.2 SalesOrder (Header)

```prisma
model SalesOrder {
  id                   String             @id @default(uuid()) @db.Uuid
  soNumber             String             @unique @map("so_number") @db.VarChar(40)
  externalSoNumber     String?            @map("external_so_number") @db.VarChar(100)
  orderType            SalesOrderType     @default(STANDARD) @map("order_type")
  status               SalesOrderStatus   @default(DRAFT)
  ownerId              String             @map("owner_id") @db.Uuid
  customerId           String             @map("customer_id") @db.Uuid
  warehouseId          String             @map("warehouse_id") @db.Uuid
  expectedDeliveryDate DateTime?          @map("expected_delivery_date") @db.Date
  deliveryAddress      String?            @map("delivery_address") @db.VarChar(500)
  notes                String?            @db.Text
  currency             String             @default("VND") @db.VarChar(10)
  totalExpectedQtyKg   Decimal            @default(0) @map("total_expected_qty_kg") @db.Decimal(18, 3)
  totalReleasedQtyKg   Decimal            @default(0) @map("total_released_qty_kg") @db.Decimal(18, 3)
  totalShippedQtyKg    Decimal            @default(0) @map("total_shipped_qty_kg") @db.Decimal(18, 3)
  cancelReasonCode     String?            @map("cancel_reason_code") @db.VarChar(50)
  closedAt             DateTime?          @map("closed_at")
  externalId           String             @unique @map("external_id") @db.VarChar(120)
  correlationId        String             @map("correlation_id") @db.VarChar(120)
  sourceApp            SourceApp          @map("source_app")
  rowVersion           BigInt             @default(0) @map("row_version")
  createdAt            DateTime           @default(now()) @map("created_at")
  createdBy            String?            @map("created_by") @db.Uuid
  updatedAt            DateTime           @updatedAt @map("updated_at")
  updatedBy            String?            @map("updated_by") @db.Uuid

  owner     MdOwner     @relation(fields: [ownerId], references: [id])
  customer  MdCustomer  @relation(fields: [customerId], references: [id])
  warehouse MdWarehouse @relation(fields: [warehouseId], references: [id])

  lines         SalesOrderLine[]
  statusHistory SalesOrderStatusHistory[]

  @@index([status, createdAt(sort: Desc)])
  @@index([ownerId, customerId, status])
  @@index([soNumber])
  @@index([externalSoNumber])
  @@index([correlationId])
  @@map("sales_orders")
}
```

### 3.3 SalesOrderLine

```prisma
model SalesOrderLine {
  id              String               @id @default(uuid()) @db.Uuid
  soId            String               @map("so_id") @db.Uuid
  lineNumber      Int                  @map("line_number")
  itemId          String               @map("item_id") @db.Uuid
  cargoForm       CargoForm            @map("cargo_form")
  uomId           String               @map("uom_id") @db.Uuid
  expectedQty     Decimal              @map("expected_qty") @db.Decimal(18, 3)
  expectedQtyKg   Decimal              @map("expected_qty_kg") @db.Decimal(18, 3)
  releasedQtyKg   Decimal              @default(0) @map("released_qty_kg") @db.Decimal(18, 3)
  shippedQtyKg    Decimal              @default(0) @map("shipped_qty_kg") @db.Decimal(18, 3)
  unitPrice       Decimal?             @map("unit_price") @db.Decimal(18, 4)
  bagCount        Int?                 @map("bag_count")
  nominalWeightPerBag Decimal?         @map("nominal_weight_per_bag") @db.Decimal(18, 3)
  notes           String?              @db.Text
  status          SalesOrderLineStatus @default(OPEN)
  createdAt       DateTime             @default(now()) @map("created_at")
  createdBy       String?              @map("created_by") @db.Uuid
  updatedAt       DateTime             @updatedAt @map("updated_at")
  updatedBy       String?              @map("updated_by") @db.Uuid

  so   SalesOrder @relation(fields: [soId], references: [id])
  item MdItem     @relation(fields: [itemId], references: [id])
  uom  MdUom      @relation(fields: [uomId], references: [id])

  @@unique([soId, lineNumber])
  @@index([itemId, cargoForm])
  @@index([soId, status])
  @@map("sales_order_lines")
}
```

### 3.4 SalesOrderStatusHistory

```prisma
model SalesOrderStatusHistory {
  id            String   @id @default(uuid()) @db.Uuid
  soId          String   @map("so_id") @db.Uuid
  soLineId      String?  @map("so_line_id") @db.Uuid
  entityLevel   String   @map("entity_level") @db.VarChar(10)  // HEADER | LINE
  fromStatus    String?  @map("from_status") @db.VarChar(30)
  toStatus      String   @map("to_status") @db.VarChar(30)
  triggerAction String   @map("trigger_action") @db.VarChar(50)
  changedBy     String?  @map("changed_by") @db.Uuid
  changedAt     DateTime @default(now()) @map("changed_at")
  reasonCode    String?  @map("reason_code") @db.VarChar(50)
  note          String?  @db.Text
  correlationId String   @map("correlation_id") @db.VarChar(120)

  so SalesOrder @relation(fields: [soId], references: [id])

  @@index([soId, changedAt(sort: Desc)])
  @@index([soLineId, changedAt(sort: Desc)])
  @@index([toStatus, changedAt(sort: Desc)])
  @@map("sales_order_status_history")
}
```

### 3.5 Cập nhật ShipmentHeader (FK mới)

Cần thêm FK thực từ `ShipmentHeader` → `SalesOrder`:

```prisma
// Trong ShipmentHeader, thay soId string → FK thực
model ShipmentHeader {
  // ... existing fields ...
  salesOrderId  String?  @map("sales_order_id") @db.Uuid   // NEW: FK thực
  // soId giữ lại cho backward compatibility (external SO reference)

  salesOrder  SalesOrder? @relation(fields: [salesOrderId], references: [id])
}
```

### 3.6 Cập nhật ShipmentSoLink

`ShipmentSoLink` đã tồn tại nhưng chỉ dùng string `soId`. Cần thêm FK thực:

```prisma
model ShipmentSoLink {
  // ... existing fields ...
  salesOrderId     String?  @map("sales_order_id") @db.Uuid     // NEW
  salesOrderLineId String?  @map("sales_order_line_id") @db.Uuid // NEW

  salesOrder     SalesOrder?     @relation(fields: [salesOrderId], references: [id])
  salesOrderLine SalesOrderLine? @relation(fields: [salesOrderLineId], references: [id])
}
```

---

## 4. State Machine

### 4.1 SO Header States (PRD Section 7.1)

```
DRAFT → CONFIRMED → PARTIALLY_RELEASED → FULLY_RELEASED → SHIPPED → CLOSED
  ↓         ↓
CANCELLED  CANCELLED
```

### 4.2 SO Line States

```
OPEN → PARTIALLY_RELEASED → FULLY_RELEASED → SHIPPED → CLOSED
  ↓
CANCELLED
```

### 4.3 Allowed Transitions

| From | To | Action | Điều kiện |
|------|----|--------|-----------|
| DRAFT | CONFIRMED | CONFIRM | SO phải có ≥ 1 line, customer + owner hợp lệ |
| DRAFT | CANCELLED | CANCEL | Chưa có shipment nào |
| CONFIRMED | PARTIALLY_RELEASED | RELEASE_SHIPMENT | Tạo shipment, SUM(released) < SO.expected |
| CONFIRMED | FULLY_RELEASED | RELEASE_SHIPMENT | SUM(released) ≥ SO.expected |
| CONFIRMED | CANCELLED | CANCEL | Chưa có shipment nào được tạo |
| PARTIALLY_RELEASED | FULLY_RELEASED | RELEASE_SHIPMENT | SUM(released) ≥ SO.expected |
| FULLY_RELEASED | SHIPPED | SHIP_COMPLETE | Tất cả shipments đã SHIPPED |
| PARTIALLY_RELEASED | SHIPPED | SHIP_COMPLETE | Tất cả shipments đã SHIPPED (partial delivery) |
| SHIPPED | CLOSED | CLOSE | User/System close |
| CLOSED | — | — | Final state, immutable |
| CANCELLED | — | — | Final state |

### 4.4 Auto-Transition Rules

| Trigger | From | To | Điều kiện |
|---------|------|----|-----------|
| Shipment created | CONFIRMED | PARTIALLY_RELEASED | Lần đầu tạo shipment từ SO |
| Shipment created | PARTIALLY_RELEASED | FULLY_RELEASED | SUM(shipment.expected_qty_kg) ≥ SO.expected_qty_kg (per line) |
| Shipment SHIPPED | PARTIALLY_RELEASED / FULLY_RELEASED | SHIPPED | Tất cả linked shipments đều SHIPPED |

---

## 5. API Endpoints

### 5.1 Sales Order Management

#### POST /api/v1/sales-orders
**Mục đích:** Tạo Sales Order mới  
**Permission:** `SALES_ORDER.CREATE`

**Request Body:**
```json
{
  "externalId": "EXT-SO-001",
  "externalSoNumber": "CUST-PO-12345",
  "orderType": "STANDARD",
  "ownerId": "uuid",
  "customerId": "uuid",
  "warehouseId": "uuid",
  "expectedDeliveryDate": "2026-03-20",
  "deliveryAddress": "123 Nguyễn Huệ, Q.1, TP.HCM",
  "notes": "Giao hàng trước 10h sáng",
  "currency": "VND",
  "lines": [
    {
      "itemId": "uuid",
      "cargoForm": "BULK",
      "uomId": "uuid",
      "expectedQty": 500,
      "expectedQtyKg": 500000,
      "unitPrice": 5000000,
      "notes": "Sắn lát bulk"
    },
    {
      "itemId": "uuid",
      "cargoForm": "BAGGED_50KG",
      "uomId": "uuid",
      "expectedQty": 200,
      "expectedQtyKg": 10000,
      "bagCount": 200,
      "nominalWeightPerBag": 50,
      "unitPrice": 6000000
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "soNumber": "SO-20260312-000001",
    "status": "DRAFT",
    "orderType": "STANDARD",
    "owner": { "ownerCode": "TVL", "ownerName": "Thoresen" },
    "customer": { "customerCode": "CUST001", "customerName": "Khách hàng ABC" },
    "warehouse": { "warehouseCode": "WH01" },
    "totalExpectedQtyKg": 510000,
    "totalReleasedQtyKg": 0,
    "totalShippedQtyKg": 0,
    "lines": [...],
    "createdAt": "2026-03-12T04:00:00Z"
  }
}
```

**Business Rules:**
- `externalId` unique → idempotent (return existing nếu trùng)
- `soNumber` auto-generated từ NumberSequence (prefix: SO)
- Validate: owner, customer, warehouse, items phải active
- Validate: ≥ 1 line bắt buộc
- `totalExpectedQtyKg` = SUM(lines.expectedQtyKg)

---

#### GET /api/v1/sales-orders
**Mục đích:** Danh sách SO với phân trang và filter  
**Permission:** `SALES_ORDER.READ`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Trang (default: 1) |
| pageSize | number | Số items/trang (default: 20, max: 100) |
| soNumber | string | Filter theo số SO |
| externalSoNumber | string | Filter theo mã SO bên ngoài |
| ownerId | uuid | Filter theo owner |
| customerId | uuid | Filter theo customer |
| warehouseId | uuid | Filter theo warehouse |
| status | enum | Filter theo trạng thái |
| orderType | enum | Filter theo loại SO |
| fromDate | date | Filter từ ngày tạo |
| toDate | date | Filter đến ngày tạo |
| search | string | Tìm kiếm soNumber hoặc externalSoNumber |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

#### GET /api/v1/sales-orders/:id
**Mục đích:** Chi tiết SO theo ID  
**Permission:** `SALES_ORDER.READ`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "soNumber": "SO-20260312-000001",
    "externalSoNumber": "CUST-PO-12345",
    "status": "PARTIALLY_RELEASED",
    "orderType": "STANDARD",
    "owner": { "id": "uuid", "ownerCode": "TVL", "ownerName": "Thoresen" },
    "customer": { "id": "uuid", "customerCode": "CUST001", "customerName": "Khách hàng ABC" },
    "warehouse": { "id": "uuid", "warehouseCode": "WH01" },
    "expectedDeliveryDate": "2026-03-20",
    "totalExpectedQtyKg": 510000,
    "totalReleasedQtyKg": 250000,
    "totalShippedQtyKg": 0,
    "lines": [
      {
        "id": "uuid",
        "lineNumber": 1,
        "item": { "itemCode": "CASSAVA-BULK", "itemName": "Sắn lát" },
        "cargoForm": "BULK",
        "expectedQtyKg": 500000,
        "releasedQtyKg": 250000,
        "shippedQtyKg": 0,
        "status": "PARTIALLY_RELEASED"
      }
    ],
    "fulfillment": {
      "totalShipments": 2,
      "shippedShipments": 0,
      "releasePct": 49.02,
      "shipPct": 0
    },
    "createdAt": "2026-03-12T04:00:00Z"
  }
}
```

---

#### PUT /api/v1/sales-orders/:id
**Mục đích:** Cập nhật SO (chỉ ở trạng thái DRAFT)  
**Permission:** `SALES_ORDER.UPDATE`

**Request Body:** (partial update)
```json
{
  "customerId": "uuid",
  "expectedDeliveryDate": "2026-03-25",
  "deliveryAddress": "456 Lê Lợi, Q.1, TP.HCM",
  "notes": "Updated notes",
  "lines": [
    {
      "id": "uuid-existing-line",
      "expectedQty": 600,
      "expectedQtyKg": 600000,
      "unitPrice": 5500000
    },
    {
      "itemId": "uuid",
      "cargoForm": "BULK",
      "uomId": "uuid",
      "expectedQty": 100,
      "expectedQtyKg": 100000
    }
  ]
}
```

**Business Rules:**
- Chỉ update được ở trạng thái **DRAFT**
- Lines có `id` → update, lines không có `id` → thêm mới
- Lines bị xóa = lines hiện tại nhưng không có trong payload (soft delete hoặc remove)
- Recalculate `totalExpectedQtyKg`

---

### 5.2 SO Actions

#### POST /api/v1/sales-orders/:id/confirm
**Mục đích:** Xác nhận SO (DRAFT → CONFIRMED)  
**Permission:** `SALES_ORDER.CONFIRM`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "soNumber": "SO-20260312-000001",
    "status": "CONFIRMED",
    "updatedAt": "2026-03-12T05:00:00Z"
  }
}
```

**Business Rules:**
- SO phải có ≥ 1 line
- Tất cả items, owner, customer, warehouse phải active
- Ghi status history

---

#### POST /api/v1/sales-orders/:id/cancel
**Mục đích:** Hủy SO  
**Permission:** `SALES_ORDER.CANCEL`

**Request Body:**
```json
{
  "reasonCode": "CUSTOMER_REQUEST",
  "note": "Khách hàng hủy đơn"
}
```

**Business Rules:**
- Chỉ cancel được ở **DRAFT** hoặc **CONFIRMED**
- Nếu đã có shipment (PARTIALLY_RELEASED+) → không cho cancel trực tiếp, phải cancel hết shipments trước
- `reasonCode` bắt buộc
- Ghi audit log + status history

---

#### POST /api/v1/sales-orders/:id/close
**Mục đích:** Đóng SO (SHIPPED → CLOSED)  
**Permission:** `SALES_ORDER.CLOSE`

**Request Body:**
```json
{
  "note": "Đã giao hàng hoàn tất"
}
```

**Business Rules:**
- Chỉ close được ở **SHIPPED**
- Ghi `closedAt` timestamp
- Final state — immutable

---

### 5.3 SO Fulfillment & Shipment Release

#### GET /api/v1/sales-orders/:id/fulfillment
**Mục đích:** Xem tiến độ giao hàng chi tiết  
**Permission:** `SALES_ORDER.READ`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "soId": "uuid",
    "soNumber": "SO-20260312-000001",
    "lines": [
      {
        "lineNumber": 1,
        "itemCode": "CASSAVA-BULK",
        "expectedQtyKg": 500000,
        "releasedQtyKg": 300000,
        "shippedQtyKg": 150000,
        "remainingQtyKg": 200000,
        "shipments": [
          {
            "shipmentNumber": "SHP-20260312-00001",
            "expectedQtyKg": 150000,
            "shippedQtyKg": 150000,
            "status": "SHIPPED"
          },
          {
            "shipmentNumber": "SHP-20260312-00002",
            "expectedQtyKg": 150000,
            "shippedQtyKg": 0,
            "status": "ALLOCATED"
          }
        ]
      }
    ],
    "summary": {
      "releasePct": 58.82,
      "shipPct": 29.41,
      "totalShipments": 2,
      "activeShipments": 1,
      "completedShipments": 1
    }
  }
}
```

---

#### POST /api/v1/sales-orders/:id/release-shipment
**Mục đích:** Tạo Shipment từ SO (release qty cho shipment mới)  
**Permission:** `SALES_ORDER.RELEASE`

**Request Body:**
```json
{
  "externalId": "EXT-SHP-FROM-SO-001",
  "vehicleNumber": "51C-12345",
  "vehicleTypeId": "uuid",
  "lines": [
    {
      "soLineId": "uuid",
      "releaseQtyKg": 150000,
      "bagCount": null
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "salesOrder": {
      "id": "uuid",
      "soNumber": "SO-20260312-000001",
      "status": "PARTIALLY_RELEASED",
      "totalReleasedQtyKg": 150000
    },
    "shipment": {
      "id": "uuid",
      "shipmentNumber": "SHP-20260312-00003",
      "status": "DRAFT",
      "sourceType": "SO",
      "lines": [...]
    }
  }
}
```

**Business Rules (Blocking — TC-11 CONFIRMED):**
- SO phải ở **CONFIRMED**, **PARTIALLY_RELEASED**, hoặc **FULLY_RELEASED**
- Per line: `releasedQtyKg + releaseQtyKg ≤ expectedQtyKg`
  - Nếu vượt → reject với error `SO_BLOCKING_EXCEEDED`
- Tạo `ShipmentHeader` với `sourceType: SO`, `salesOrderId: soId`
- Tạo `ShipmentSoLink` records per line
- Cập nhật `releasedQtyKg` trên SO header và lines
- Auto-transition SO status:
  - Nếu SUM(released) < SUM(expected) → `PARTIALLY_RELEASED`
  - Nếu SUM(released) ≥ SUM(expected) → `FULLY_RELEASED`

---

#### GET /api/v1/sales-orders/:id/shipments
**Mục đích:** Danh sách shipments linked to SO  
**Permission:** `SALES_ORDER.READ`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "shipmentNumber": "SHP-20260312-00001",
      "status": "SHIPPED",
      "vehicleNumber": "51C-12345",
      "totalNetKg": 150000,
      "shippedAt": "2026-03-12T14:00:00Z"
    }
  ]
}
```

---

### 5.4 SO History

#### GET /api/v1/sales-orders/:id/history
**Mục đích:** Lịch sử trạng thái SO  
**Permission:** `SALES_ORDER.READ`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "fromStatus": "DRAFT",
      "toStatus": "CONFIRMED",
      "triggerAction": "CONFIRM",
      "changedBy": "uuid",
      "changedAt": "2026-03-12T05:00:00Z"
    },
    {
      "fromStatus": "CONFIRMED",
      "toStatus": "PARTIALLY_RELEASED",
      "triggerAction": "RELEASE_SHIPMENT",
      "changedBy": "uuid",
      "changedAt": "2026-03-12T06:00:00Z"
    }
  ]
}
```

---

### 5.5 Dashboard

#### GET /api/v1/sales-orders/dashboard/summary
**Mục đích:** Tổng quan SO  
**Permission:** `SALES_ORDER.READ`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | uuid | Filter theo warehouse |
| ownerId | uuid | Filter theo owner |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalDraft": 5,
    "totalConfirmed": 12,
    "totalPartiallyReleased": 8,
    "totalFullyReleased": 3,
    "totalShipped": 25,
    "overdueCount": 2,
    "todayExpectedDeliveries": 4
  }
}
```

---

## 6. Business Rules Registry

| Code | Rule | Source |
|------|------|--------|
| SO_BR_001 | SO phải có ≥ 1 line để confirm | PRD 7.1 |
| SO_BR_002 | Blocking: SUM(shipment.expected_qty) ≤ SO.expected_qty per line | TC-11 CONFIRMED |
| SO_BR_003 | Cancel chỉ được ở DRAFT hoặc CONFIRMED (chưa có shipment) | PRD 7.1 |
| SO_BR_004 | Close chỉ được khi tất cả shipments đã SHIPPED | PRD 7.1 |
| SO_BR_005 | soNumber auto-generated từ NumberSequence, prefix SO | System |
| SO_BR_006 | externalId phải unique, dùng cho idempotency | PRD Design Rule 9 |
| SO_BR_007 | Update chỉ được ở DRAFT | Business |
| SO_BR_008 | Auto-transition CONFIRMED → PARTIALLY_RELEASED khi tạo shipment đầu tiên | PRD 7.1 |
| SO_BR_009 | Auto-transition → FULLY_RELEASED khi SUM(released) ≥ SUM(expected) | PRD 7.1 |
| SO_BR_010 | Auto-transition → SHIPPED khi tất cả linked shipments SHIPPED | PRD 7.1 |
| SO_BR_011 | reasonCode bắt buộc khi cancel | PRD Design Rule 5 |

---

## 7. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| SO_001 | 404 | Sales Order không tìm thấy |
| SO_002 | 409 | Không thể chuyển trạng thái (invalid transition) |
| SO_003 | 400 | SO không có line nào |
| SO_004 | 409 | Duplicate external ID (idempotent — trả existing) |
| SO_005 | 409 | Không thể update — SO không ở trạng thái DRAFT |
| SO_006 | 409 | Không thể cancel — SO đã có shipment |
| SO_007 | 400 | Blocking: qty release vượt SO expected qty per line |
| SO_008 | 400 | Owner/Customer/Warehouse/Item không active hoặc không tồn tại |
| SO_009 | 409 | Không thể close — còn shipment chưa SHIPPED |
| SO_010 | 409 | Optimistic locking conflict (rowVersion mismatch) |

---

## 8. Integration Points

### 8.1 Module Dependencies

| Module | Usage | Direction |
|--------|-------|-----------|
| M1 Foundation | NumberSequence (SO number), ReasonCode, AuditLog | SO → M1 |
| M2 Master Data | Owner, Customer, Item, Warehouse, UOM, VehicleType | SO → M2 (read) |
| M5 Outbound | Tạo Shipment từ SO (release-shipment) | SO → M5 (write) |
| M5 Outbound | Nhận callback khi Shipment SHIPPED → update SO fulfillment | M5 → SO (callback) |

### 8.2 Outbound Integration Flow

```
1. User tạo SO → DRAFT
2. User confirm → CONFIRMED
3. User release-shipment → Tạo ShipmentHeader (sourceType=SO) + ShipmentSoLink
4. Outbound module xử lý: Allocate → Pick → Weigh → Ship
5. Khi Shipment SHIPPED → callback cập nhật SO:
   - Update SO line.shippedQtyKg
   - Update SO header.totalShippedQtyKg
   - Check auto-transition → SHIPPED nếu all done
```

### 8.3 Callback: Shipment Status Changed

Outbound module gọi `SalesOrderService.onShipmentStatusChanged()` khi:
- Shipment SHIPPED → cập nhật shippedQty, check auto-transition
- Shipment CANCELLED → rollback releasedQty

---

## 9. RBAC Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `SALES_ORDER.CREATE` | Tạo SO mới | ADMIN, WH_MANAGER, OPS_SUPER |
| `SALES_ORDER.READ` | Xem danh sách, chi tiết SO | ADMIN, WH_MANAGER, WH_KEEPER, OPS_SUPER, CUST_VIEWER |
| `SALES_ORDER.UPDATE` | Cập nhật SO (DRAFT only) | ADMIN, WH_MANAGER |
| `SALES_ORDER.CONFIRM` | Xác nhận SO | ADMIN, WH_MANAGER, OPS_SUPER |
| `SALES_ORDER.CANCEL` | Hủy SO | ADMIN, WH_MANAGER |
| `SALES_ORDER.CLOSE` | Đóng SO | ADMIN, WH_MANAGER |
| `SALES_ORDER.RELEASE` | Tạo shipment từ SO | ADMIN, WH_MANAGER, OPS_SUPER |

---

## 10. Cần cập nhật ở các module khác

### 10.1 Prisma Schema
- Thêm 3 models: `SalesOrder`, `SalesOrderLine`, `SalesOrderStatusHistory`
- Thêm 3 enums: `SalesOrderStatus`, `SalesOrderLineStatus`, `SalesOrderType`
- Thêm relations trên `MdOwner`, `MdCustomer`, `MdWarehouse`, `MdItem`, `MdUom`
- Thêm `salesOrderId` FK trên `ShipmentHeader`
- Thêm `salesOrderId`, `salesOrderLineId` FK trên `ShipmentSoLink`

### 10.2 AppModule
- Register `SalesOrderModule` vào `app.module.ts` (hoặc routes trong Express)

### 10.3 Outbound Module
- Cập nhật `ShipShipmentUseCase` → gọi callback `SalesOrderService.onShipmentStatusChanged()`
- Cập nhật `CancelShipmentService` → gọi callback rollback releasedQty

### 10.4 Sidebar / Frontend
- Thêm menu "Đơn bán hàng" (Sales Orders) vào nhóm Outbound

---

## 11. Migration Checklist

| # | Task | Priority |
|---|------|----------|
| 1 | Tạo Prisma migration: enums + 3 tables + FK updates | HIGH |
| 2 | Tạo seed data: sample SO records | MEDIUM |
| 3 | Implement backend module (controller, service, repository, domain) | HIGH |
| 4 | Integrate với Outbound: release-shipment + callback | HIGH |
| 5 | Register module vào app + routes | HIGH |
| 6 | Thêm RBAC permissions vào seed | HIGH |
| 7 | Frontend: SO list, detail, create/edit form | HIGH |
| 8 | Frontend: Fulfillment tracking view | MEDIUM |
| 9 | E2E tests: CRUD + state machine + blocking rules | MEDIUM |

---

## 12. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-12 | Initial design based on PRD v4.0 Section 5.5, 7.1 |
