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
│   └── simple-shipment.controller.ts     # Shipment REST endpoints
│
├── services/
│   ├── sales-order.service.ts            # Business logic cho SO
│   └── simple-shipment.service.ts        # Business logic cho Shipment
│
└── dto/
    ├── sales-order.dto.ts                # DTOs cho SO
    └── shipment.dto.ts                   # DTOs cho Shipment
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

| Module | Usage |
|--------|-------|
| M2 Master Data | Owner, Item, Warehouse, UOM |
| Infrastructure | PrismaService |

---

## 7. Changelog

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
