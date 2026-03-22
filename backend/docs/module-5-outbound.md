# Module 5: Outbound Operations — API Documentation

**Module Path:** `src/modules/outbound`  
**Status:** ✅ Active (Sales Order Management)  
**Version:** 3.6.0  
**Last Updated:** 2026-03-17  

---

## 1. Tổng quan

Module 5 quản lý **luồng xuất hàng (Outbound Operations)**, bắt đầu từ việc tạo đơn xuất hàng (Sales Order - SO).

### Chức năng chính
- **Sales Order Management**: Tạo, cập nhật, xác nhận, hủy đơn xuất hàng
- **Shipment Management**: Tạo phiếu xuất kho từ SO đã xác nhận
- Quản lý chi tiết hàng hóa theo dòng (SO Lines, Shipment Lines)
- Theo dõi SL dự kiến và SL đã xuất

---

## 2. Cấu trúc Code

```
src/modules/outbound/
├── outbound.module.ts                    # Module definition
│
├── controllers/
│   ├── sales-order.controller.ts         # Sales Order REST endpoints
│   ├── simple-shipment.controller.ts     # Simple Shipment CRUD (từ SO)
│   ├── shipment.controller.ts            # Full Shipment với M3 integration
│   ├── allocation.controller.ts          # Allocation endpoints
│   ├── weighing.controller.ts            # Weighing endpoints
│   ├── approval.controller.ts            # Approval endpoints
│   ├── outbound-query.controller.ts      # Query/Dashboard endpoints
│   └── outbound-document.controller.ts   # Document list endpoint
│
├── services/
│   ├── sales-order.service.ts            # Business logic cho SO
│   ├── simple-shipment.service.ts        # Simple Shipment từ SO
│   ├── shipment.service.ts               # Core shipment service
│   ├── shipment-command.service.ts       # Shipment commands
│   ├── shipment-query.service.ts         # Shipment queries
│   ├── shipment-state-machine.service.ts # State machine rules
│   ├── shipment-line-state.service.ts    # Line state management
│   ├── allocation.service.ts             # Allocation logic
│   ├── weighing.service.ts               # Weighing logic
│   ├── tolerance.service.ts              # Tolerance check
│   ├── approval.service.ts               # Approval logic
│   ├── so-qty-rollup.service.ts          # SO quantity rollup
│   ├── post-ship-residual.service.ts     # Post-ship residual handling
│   └── outbound-document.service.ts      # Document service
│
├── application/
│   ├── createShipment.usecase.ts         # Create shipment use case
│   ├── allocateShipment.usecase.ts       # Allocate với M3 OnHand/Hold
│   ├── shipShipment.usecase.ts           # Ship với M3 Posting
│   └── receiveOutboundWeight.usecase.ts  # Receive weight use case
│
├── repositories/
│   ├── shipment-header.repository.ts
│   ├── shipment-line.repository.ts
│   ├── allocation-record.repository.ts
│   ├── weighing-attempt.repository.ts
│   ├── status-history.repository.ts
│   ├── exception-log.repository.ts
│   ├── approval-decision.repository.ts
│   ├── pick-work-link.repository.ts
│   └── posting-link.repository.ts
│
├── domain/
│   ├── outbound.state-machine.ts         # State machine definitions
│   ├── outbound.policy.ts                # Business policies
│   └── outbound.errors.ts                # Error definitions
│
├── infra/
│   └── m3-adapter.service.ts             # M3 OnHand/Hold/Posting wrapper
│
└── dto/
    ├── sales-order.dto.ts                # DTOs cho SO
    ├── shipment.dto.ts                   # DTOs cho Shipment
    ├── create-shipment.dto.ts            # Create shipment DTO
    └── shipment-response.dto.ts          # Response DTOs
```

---

## 3. API Endpoints

### 3.1 Sales Order Management

#### GET /api/v1/outbound/sales-orders/next-number
**Mục đích:** Lấy số SO tiếp theo (auto-gen)

**Response:** `200 OK`
```json
{
  "code": "SO-202603-00001"
}
```

---

#### GET /api/v1/outbound/sales-orders
**Mục đích:** Danh sách Sales Orders với phân trang và filter

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Trang (default: 1) |
| pageSize | number | Số items/trang (default: 20) |
| keyword | string | Tìm theo số SO, số B/L |
| status | string | Filter theo trạng thái |
| ownerId | uuid | Filter theo chủ hàng |

**Response:** `200 OK`
```json
{
  "data": [...],
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### GET /api/v1/outbound/sales-orders/:id
**Mục đích:** Chi tiết Sales Order theo ID

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "soNumber": "SO-202603-00001",
  "soType": "SEA",
  "blNumber": "BL-2026-RICE-001",
  "status": "NEW",
  "owner": { "ownerCode": "TVL", "ownerName": "Thoresen" },
  "totalExpectedQty": 5000,
  "totalShippedQty": 0,
  "lines": [...]
}
```

---

#### POST /api/v1/outbound/sales-orders
**Mục đích:** Tạo Sales Order mới

**Request Body:**
```json
{
  "soType": "SEA",
  "ownerId": "uuid",
  "blNumber": "BL-2026-RICE-001",
  "notes": "Ghi chú",
  "lines": [
    {
      "itemId": "uuid",
      "expectedQty": 1000,
      "uomId": "uuid",
      "notes": "Ghi chú dòng"
    }
  ]
}
```

**Response:** `201 Created`

---

#### PATCH /api/v1/outbound/sales-orders/:id
**Mục đích:** Cập nhật Sales Order (chỉ khi status = NEW/Tạo mới)

**Request Body:**
```json
{
  "soType": "LAND",
  "ownerId": "uuid",
  "blNumber": "BL-2026-RICE-002",
  "notes": "Ghi chú mới",
  "lines": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "expectedQty": 1500,
      "uomId": "uuid",
      "notes": "Ghi chú dòng"
    }
  ]
}
```

**Note:** `lines[].id` là optional, dùng cho việc update line có sẵn.

---

#### POST /api/v1/outbound/sales-orders/:id/confirm
**Mục đích:** Xác nhận Sales Order (Tạo mới → Đã xác nhận)

---

#### POST /api/v1/outbound/sales-orders/:id/cancel
**Mục đích:** Xóa/Hủy Sales Order (chỉ khi status = Tạo mới)

---

#### POST /api/v1/outbound/sales-orders/:id/unconfirm
**Mục đích:** Hủy xác nhận Sales Order (Đã xác nhận → Tạo mới)

**Note:** Chỉ có thể unconfirm SO ở trạng thái CONFIRMED.

---

#### POST /api/v1/outbound/sales-orders/:id/close
**Mục đích:** Đóng Sales Order (SHIPPED → CLOSED)

---

### 3.2 Shipment Management

#### GET /api/v1/outbound/shipments
**Mục đích:** Danh sách Phiếu xuất kho với phân trang và filter

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Trang (default: 1) |
| pageSize | number | Số items/trang (default: 20) |
| keyword | string | Tìm theo số phiếu, số SO, biển số xe |
| status | string | Filter theo trạng thái |
| ownerId | uuid | Filter theo chủ hàng |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "shipmentNumber": "SHP-202603-00001",
      "soNumber": "SO-202603-00001",
      "blNumber": "BL-2026-RICE-001",
      "owner": { "ownerCode": "TVL", "ownerName": "Thoresen" },
      "vehicleNumber": "29A-12345",
      "status": "NEW",
      "expectedQty": 1000,
      "shippedQty": 0,
      "lines": [...]
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 10, "totalPages": 1 }
}
```

---

#### GET /api/v1/outbound/shipments/:id
**Mục đích:** Chi tiết Phiếu xuất theo ID

---

#### POST /api/v1/outbound/shipments
**Mục đích:** Tạo Phiếu xuất kho từ SO đã xác nhận

**Request Body:**
```json
{
  "salesOrderId": "uuid",
  "warehouseId": "uuid",
  "vehicleNumber": "29A-12345",
  "blNumber": "BL-2026-RICE-001",
  "notes": "Ghi chú header",
  "lines": [
    {
      "itemId": "uuid",
      "uomId": "uuid",
      "expectedQty": 500,
      "soLineId": "uuid",
      "notes": "Ghi chú dòng"
    }
  ]
}
```

**Response:** `201 Created`

**Note:** Chỉ có thể tạo phiếu xuất từ SO đang ở trạng thái CONFIRMED.

---

#### PATCH /api/v1/outbound/shipments/:id
**Mục đích:** Cập nhật Phiếu xuất (chỉ khi status = NEW)

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "vehicleNumber": "29A-12345",
  "notes": "Ghi chú mới",
  "lines": [
    {
      "itemId": "uuid",
      "uomId": "uuid",
      "expectedQty": 600,
      "soLineId": "uuid",
      "notes": "Ghi chú dòng mới"
    }
  ]
}
```

---

#### POST /api/v1/outbound/shipments/:id/confirm
**Mục đích:** Xác nhận Phiếu xuất (NEW → CONFIRMED)

---

#### DELETE /api/v1/outbound/shipments/:id
**Mục đích:** Xóa Phiếu xuất (chỉ khi status = NEW)

---

#### POST /api/v1/outbound/shipments/:id/report-error
**Mục đích:** Báo lỗi Phiếu xuất (NEW/CONFIRMED → CANCELLED)

**Request Body:**
```json
{
  "reasonCode": "Lý do báo lỗi"
}
```

---

#### POST /api/v1/outbound/shipments/:id/ship
**Mục đích:** Xuất hàng và post inventory sang M3

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "SHIPPED",
    "postedTransIds": ["TRX-001", "TRX-002"]
  }
}
```

**Note:** Chỉ ship được khi shipment ở trạng thái ALLOCATED hoặc ALL_WEIGHED với ít nhất 1 line PASSED.

---

### 3.3 Allocation Management

#### POST /api/v1/outbound/shipments/:id/allocate
**Mục đích:** Phân bổ tồn kho cho shipment lines

**Response:** `200 OK`
```json
{
  "success": true,
  "allocations": [
    {
      "lineId": "uuid",
      "allocatedQty": 500,
      "holdId": "HLD-001",
      "sources": [{ "onHandId": "uuid", "qty": 500 }]
    }
  ]
}
```

**M3 Integration:** Gọi `OnHandService.queryAvailable()` (FIFO) và `HoldService.createHold()`

---

#### POST /api/v1/outbound/shipments/:id/unallocate
**Mục đích:** Giải phóng phân bổ cho shipment

**Response:** `200 OK`

**M3 Integration:** Gọi `HoldService.releaseHold()`

---

#### GET /api/v1/outbound/shipments/:id/allocations
**Mục đích:** Xem danh sách phân bổ của shipment

**Response:** `200 OK`

---

### 3.4 Weighing Management

#### POST /api/v1/outbound/shipments/:id/weigh/tare
**Mục đích:** Ghi nhận trọng lượng tare (xe không)

**Request Body:**
```json
{
  "rawWeightKg": 14500,
  "sourceMode": "SCALE_AGENT",
  "scaleTicketNo": "TICKET-001",
  "externalEventId": "evt-001"
}
```

---

#### POST /api/v1/outbound/shipments/:id/weigh/gross
**Mục đích:** Ghi nhận trọng lượng gross (xe có hàng), tính net và check tolerance

**Request Body:**
```json
{
  "lineId": "uuid",
  "rawWeightKg": 45200,
  "sourceMode": "SCALE_AGENT",
  "scaleTicketNo": "TICKET-002",
  "externalEventId": "evt-002"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "netWeightKg": 30700,
    "variancePct": 2.3,
    "tolerancePct": 3.0,
    "result": "PASSED"
  }
}
```

---

#### GET /api/v1/outbound/shipments/:id/weighing-history
**Mục đích:** Xem lịch sử cân của shipment

---

### 3.5 Approval Management

#### GET /api/v1/outbound/approvals/pending
**Mục đích:** Danh sách shipments đang chờ phê duyệt

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | uuid | Filter theo kho |

---

#### POST /api/v1/outbound/shipments/:id/approve
**Mục đích:** Phê duyệt shipment hoặc line (khi tolerance fail)

**Request Body:**
```json
{
  "lineId": "uuid",
  "reasonCode": "MANAGER_OVERRIDE",
  "note": "Approved by manager"
}
```

---

#### POST /api/v1/outbound/shipments/:id/reject
**Mục đích:** Từ chối shipment hoặc line

**Request Body:**
```json
{
  "lineId": "uuid",
  "reasonCode": "EXCESS_VARIANCE",
  "note": "Variance quá lớn"
}
```

---

### 3.6 Query & Dashboard

#### GET /api/v1/outbound/shipments/:id/history
**Mục đích:** Lịch sử thay đổi trạng thái shipment

---

#### GET /api/v1/outbound/shipments/:id/exceptions
**Mục đích:** Danh sách exceptions của shipment

---

#### GET /api/v1/outbound/dashboard/summary
**Mục đích:** Tổng hợp dashboard

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | uuid | Filter theo kho |

---

#### GET /api/v1/outbound/dashboard/kpis
**Mục đích:** KPI metrics

---

### 3.7 Outbound Documents

#### GET /api/v1/outbound/documents
**Mục đích:** Danh sách chứng từ xuất kho

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| shipmentHeaderId | uuid | Filter theo shipment |
| ownerId | uuid | Filter theo chủ hàng |
| status | string | Filter theo trạng thái |

---

## 4. State Machine

### Sales Order Status Flow
```
Tạo mới → Đã xác nhận → Xuất 1 phần → Xuất đủ → Đã đóng
    ↓
  Đã hủy
```

| From | To | Action | UI Button |
|------|-----|--------|-----------|
| Tạo mới (NEW) | Đã xác nhận (CONFIRMED) | confirm | ✓ Xác nhận |
| Tạo mới (NEW) | Đã hủy (CANCELLED) | cancel | 🗑 Xóa |
| Đã xác nhận | Tạo mới | unconfirm | ↩ Hủy xác nhận |
| Đã xác nhận | Xuất 1 phần | - | Tự động khi có shipment |
| Xuất 1 phần | Xuất đủ | - | Tự động khi xuất hết |
| Xuất đủ | Đã đóng | close | - |

### UI Actions theo trạng thái

| Trạng thái | Chỉnh sửa | Xác nhận | Xóa | Hủy xác nhận | Tạo phiếu xuất |
|------------|-----------|----------|-----|--------------|----------------|
| Tạo mới | ✅ | ✅ | ✅ | ❌ | ❌ |
| Đã xác nhận | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xuất 1 phần | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xuất đủ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Đã đóng | ❌ | ❌ | ❌ | ❌ | ❌ |
| Đã hủy | ❌ | ❌ | ❌ | ❌ | ❌ |

### Shipment Status Flow
```
Tạo mới (NEW) → Đã xác nhận (CONFIRMED) → ... → Đã xuất (SHIPPED) → Đã đóng (CLOSED)
    ↓
  Đã hủy (CANCELLED)
```

### Shipment UI Actions theo trạng thái

| Trạng thái | Chỉnh sửa | Xác nhận | Xóa | Báo lỗi |
|------------|-----------|----------|-----|----------|
| Tạo mới (NEW) | ✅ | ✅ | ✅ | ❌ |
| Đã xác nhận | ❌ | ❌ | ❌ | ✅ |
| Khác | ❌ | ❌ | ❌ | ❌ |

---

## 5. Data Mapping

### Frontend ↔ Backend Mapping

| Frontend Field | Backend Field | Notes |
|----------------|---------------|-------|
| soType (SEA/LAND) | orderType (STANDARD/CONSIGNMENT) | Mapping trong service |
| blNumber | externalSoNumber | Số B/L lưu trong externalSoNumber |
| status (NEW/CONFIRMED/...) | status (DRAFT/CONFIRMED/...) | Mapping trong service |

---

## 6. Dependencies

### Module 5 phụ thuộc

| Module | Service/Data | Usage |
|--------|--------------|-------|
| M1 - Foundation | `NumberSequence` | Sinh SO number (SO-*), shipment number (SHP-*) |
| M1 - Foundation | `ReasonCode` | Validate reason codes |
| M1 - Foundation | `AuditLog` | Audit trail |
| M1 - Foundation | `Idempotency` | External ID check |
| M2 - Master Data | `MdOwner` | Owner validation |
| M2 - Master Data | `MdItem` | Item validation + tolerance |
| M2 - Master Data | `MdWarehouse` | Warehouse validation |
| M2 - Master Data | `MdLocation` | Location validation |
| M2 - Master Data | `MdInventoryStatus` | Status check (AVAILABLE) |
| M2 - Master Data | `MdVehicleType` | Vehicle type lookup |
| **M3 - Inventory Core** | **`OnHandService`** | **Query available stock (FIFO)** |
| **M3 - Inventory Core** | **`HoldService`** | **Create/release allocation holds** |
| **M3 - Inventory Core** | **`PostingEngine`** | **Post outbound transaction** |

### M3 Integration (✅ Implemented)

| Use Case | M3 Service | Event Code |
|----------|------------|------------|
| Allocate | `OnHandService.queryAvailable()` + `HoldService.createHold()` | - |
| Unallocate | `HoldService.releaseHold()` | - |
| Ship | `PostingEngineService.postInventory()` | `SHIPMENT_SHIPPED` |

---

## 7. RBAC Permissions

### Sales Order Permissions
| Permission Code | Description |
|-----------------|-------------|
| `OUTBOUND.SO.CREATE` | Tạo Sales Order |
| `OUTBOUND.SO.READ` | Xem Sales Order |
| `OUTBOUND.SO.UPDATE` | Cập nhật Sales Order |
| `OUTBOUND.SO.CONFIRM` | Xác nhận Sales Order |
| `OUTBOUND.SO.CANCEL` | Hủy Sales Order |
| `OUTBOUND.SO.CLOSE` | Đóng Sales Order |

### Shipment Permissions
| Permission Code | Description |
|-----------------|-------------|
| `OUTBOUND.SHIPMENT.CREATE` | Tạo Shipment |
| `OUTBOUND.SHIPMENT.READ` | Xem Shipment |
| `OUTBOUND.SHIPMENT.CONFIRM` | Xác nhận Shipment |
| `OUTBOUND.SHIPMENT.CANCEL` | Hủy Shipment |
| `OUTBOUND.SHIPMENT.SHIP` | Xuất hàng (post M3) |

### Allocation & Weighing Permissions
| Permission Code | Description |
|-----------------|-------------|
| `OUTBOUND.ALLOCATION.EXECUTE` | Phân bổ / giải phóng |
| `OUTBOUND.WEIGH.RECEIVE` | Nhận sự kiện cân |
| `OUTBOUND.APPROVAL.DECIDE` | Phê duyệt / từ chối |
| `OUTBOUND.DASHBOARD.READ` | Xem dashboard |

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial implementation |
| 3.0.0 | 2026-03-17 | RESET: Xóa toàn bộ logic cũ |
| 3.1.0 | 2026-03-17 | Implement Sales Order Management: Controller, Service, DTO, API endpoints |
| 3.2.0 | 2026-03-17 | - Đổi label trạng thái "Nháp" → "Tạo mới"<br>- Thêm UpdateSoLineDto với field `id` cho update lines<br>- Thêm `ownerId` vào UpdateSalesOrderDto<br>- UI: Button xóa chỉ hiển thị khi status = Tạo mới |
| 3.3.0 | 2026-03-17 | **REMOVED Features:**<br>- Xóa Phân bổ (Allocation) - chưa implement<br>- Xóa Cân hàng (Weighing) - chưa implement<br>- Xóa Phê duyệt (Approvals) - chưa implement<br>Module 5 hiện chỉ còn: Sales Order, Shipments |
| 3.4.0 | 2026-03-17 | - Thêm endpoint `POST /sales-orders/:id/unconfirm` (Đã xác nhận → Tạo mới)<br>- Thêm UI buttons: Hủy xác nhận, Tạo phiếu xuất cho trạng thái Đã xác nhận<br>- Tạo CreateShipmentModal component |
| 3.5.0 | 2026-03-17 | **Shipment Management:**<br>- Thêm `SimpleShipmentService` và `SimpleShipmentController`<br>- Endpoints: `GET/POST /outbound/shipments`, `GET /outbound/shipments/:id`<br>- Tạo phiếu xuất từ SO đã xác nhận<br>- Lưu vào `shipment_header`, `shipment_line` |
| 3.6.0 | 2026-03-17 | **Shipment CRUD:**<br>- Thêm `PATCH /shipments/:id` (cập nhật)<br>- Thêm `POST /shipments/:id/confirm` (xác nhận)<br>- Thêm `DELETE /shipments/:id` (xóa)<br>- Thêm `POST /shipments/:id/report-error` (báo lỗi)<br>- Thêm field `notes` cho ShipmentHeader và ShipmentLine |
