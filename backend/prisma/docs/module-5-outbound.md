# Module 5: Outbound Operations — Database Documentation

**Schema Location:** `prisma/schema.prisma`  
**Module:** Outbound Operations  
**Status:** ✅ Active (Sales Order + Shipment Management)  
**Tables:** 10 (Sales Order + Shipment + Document tables)
**Version:** 2.6.0
**Last Updated:** 2026-03-24  

---

## 1. Tổng quan

Module 5 sử dụng các bảng database để quản lý **luồng xuất hàng (Outbound Operations)**.

### Chức năng hiện tại
- **Sales Order Management**: Tạo và quản lý đơn xuất hàng
- **Shipment Management**: Tạo và quản lý phiếu xuất kho từ SO
- **Chi tiết hàng hóa**: Theo dõi SL dự kiến và SL đã xuất theo dòng

---

## 2. Database Schema

### 2.1 Sales Order Tables (Đang sử dụng)

| Table | Model | Mục đích |
|-------|-------|----------|
| `sales_orders` | SalesOrder | Header đơn xuất hàng |
| `sales_order_lines` | SalesOrderLine | Chi tiết dòng hàng |
| `sales_order_status_history` | SalesOrderStatusHistory | Lịch sử thay đổi trạng thái |

### 2.2 Shipment Tables (Đang sử dụng)

| Group | Tables | Mục đích | Status |
|-------|--------|----------|--------|
| **Runtime** | `shipment_header`, `shipment_line` | Dữ liệu nghiệp vụ chính | ✅ Active |
| **Audit** | `shipment_status_history`, `shipment_exception_log` | Lịch sử và exceptions | 🟡 Pending |
| **Control** | `shipment_pick_work_link`, `shipment_posting_link`, `shipment_so_link` | Liên kết với modules khác | 🟡 Pending |

### 2.3 Document Tables (Đang sử dụng)

| Group | Tables | Mục đích | Status |
|-------|--------|----------|--------|
| **Runtime** | `outbound_document` | Chứng từ xuất kho (B/L, packing list, ...) | ✅ Active |

---

## 3. Sales Order Schema Detail

### 3.1 SalesOrder (sales_orders)

```prisma
model SalesOrder {
  id                   String           @id @default(uuid())
  soNumber             String           @unique          // Số SO (auto-gen)
  externalSoNumber     String?                           // Số B/L (blNumber từ frontend)
  orderType            SalesOrderType   @default(STANDARD) // SEA=STANDARD, LAND=CONSIGNMENT
  status               SalesOrderStatus @default(DRAFT)  // DRAFT=NEW
  ownerId              String                            // FK -> MdOwner
  customerId           String                            // FK -> MdCustomer
  warehouseId          String                            // FK -> MdWarehouse
  expectedDeliveryDate DateTime?
  deliveryAddress      String?
  notes                String?
  totalExpectedQtyKg   Decimal          @default(0)      // Tổng SL dự kiến
  totalReleasedQtyKg   Decimal          @default(0)
  totalShippedQtyKg    Decimal          @default(0)      // Tổng SL đã xuất
  ...
}
```

### 3.2 SalesOrderLine (sales_order_lines)

```prisma
model SalesOrderLine {
  id              String               @id @default(uuid())
  soId            String                                 // FK -> SalesOrder
  lineNumber      Int
  itemId          String                                 // FK -> MdItem
  cargoForm       CargoForm
  uomId           String                                 // FK -> MdUom
  expectedQty     Decimal                                // SL dự kiến
  expectedQtyKg   Decimal
  releasedQtyKg   Decimal              @default(0)
  shippedQtyKg    Decimal              @default(0)       // SL đã xuất
  unitPrice       Decimal?
  notes           String?
  status          SalesOrderLineStatus @default(OPEN)
  ...
}
```

---

## 4. Enums

### Sales Order Enums (Đang sử dụng)

```prisma
enum SalesOrderStatus {
  DRAFT              // Frontend: NEW
  CONFIRMED          // Frontend: CONFIRMED
  PARTIALLY_RELEASED // Frontend: PARTIAL
  FULLY_RELEASED     // Frontend: SHIPPED
  CLOSED             // Frontend: CLOSED
  CANCELLED          // Frontend: CANCELLED
}

enum SalesOrderType {
  STANDARD           // Frontend: SEA (Đường thủy)
  CONSIGNMENT        // Frontend: LAND (Đường bộ)
  INTERNAL
}

enum SalesOrderLineStatus {
  OPEN               // Mới
  PARTIAL            // Xuất 1 phần
  SHIPPED            // Đã xuất
  CANCELLED          // Đã hủy
}
```

### Shipment Enums (Đang sử dụng)

```prisma
enum ShipmentStatus {
  DRAFT              // Frontend: NEW
  CONFIRMED          // Frontend: CONFIRMED
  PICKING            // Frontend: PICKING (🟡 Pending)
  LOADING            // Frontend: LOADING (🟡 Pending)
  SHIPPED            // Frontend: SHIPPED
  CLOSED             // Frontend: CLOSED
  CANCELLED          // Frontend: CANCELLED
}

enum ShipmentLineStatus {
  PENDING            // Chờ xử lý
  PICKING            // Đang lấy hàng
  PICKED             // Đã lấy
  LOADING            // Đang xếp hàng
  SHIPPED            // Đã xuất
  CANCELLED          // Đã hủy
}

enum ShipmentSourceType {
  SO                 // Từ Sales Order (✅ Active)
  DELIVERY_REQUEST   // Từ yêu cầu giao hàng
  STANDALONE         // Độc lập
}
```

### Shipment Enums (Pending)
- `ShipmentExceptionType`, `ShipmentExceptionStatus`
- `WorkLinkType`, `WorkLinkStatus`, `PostingAction`, `PostingStatus`

---

## 5. Data Mapping (Frontend ↔ Database)

| Frontend Field | Database Field | Notes |
|----------------|----------------|-------|
| soType: "SEA" | orderType: "STANDARD" | Đường thủy |
| soType: "LAND" | orderType: "CONSIGNMENT" | Đường bộ |
| blNumber | externalSoNumber | Số B/L |
| status: "NEW" | status: "DRAFT" | Nháp |
| totalExpectedQty | totalExpectedQtyKg | SL dự kiến |
| totalShippedQty | totalShippedQtyKg | SL đã xuất |

---

## 6. Shipment Schema Detail

### 6.1 ShipmentHeader (shipment_header)

```prisma
model ShipmentHeader {
  id                   String             @id @default(uuid())
  shipmentNumber       String?            @unique          // Số phiếu xuất (auto-gen)
  soId                 String?                             // Số SO (reference)
  salesOrderId         String?                             // FK -> SalesOrder
  sourceType           ShipmentSourceType                  // SO, DELIVERY_REQUEST, STANDALONE
  ownerId              String                              // FK -> MdOwner
  customerId           String?                             // FK -> MdCustomer
  warehouseId          String                              // FK -> MdWarehouse
  vehicleNumber        String                              // Biển số xe
  notes                String?            @db.Text         // Ghi chú header (v2.4.0)
  status               ShipmentStatus     @default(DRAFT)  // DRAFT=NEW
  cancelReasonCode     String?                             // Lý do báo lỗi/hủy
  ...
}
```

### 6.2 ShipmentLine (shipment_line)

```prisma
model ShipmentLine {
  id                  String             @id @default(uuid())
  shipmentHeaderId    String                               // FK -> ShipmentHeader
  lineNumber          Int
  soLineId            String?                              // FK -> SalesOrderLine (reference)
  itemId              String                               // FK -> MdItem
  cargoForm           CargoForm                            // BULK, BAGGED, CONTAINER
  uomId               String                               // FK -> MdUom
  expectedQty         Decimal                              // SL dự kiến
  expectedQtyKg       Decimal
  shippedQty          Decimal?                             // SL đã xuất
  lineStatus          ShipmentLineStatus @default(PENDING)
  notes               String?            @db.Text         // Ghi chú dòng (v2.4.0)
  ...
}
```

---

## 7. Outbound Document Schema Detail

### 7.1 OutboundDocument (outbound_document)

```prisma
model OutboundDocument {
  id               String                 @id @default(uuid())
  documentCode     String                 @map("document_code")     // Mã chứng từ tự sinh
  shipmentHeaderId String?                                          // FK -> ShipmentHeader
  docType          OutboundDocumentType                             // Loại chứng từ
  ownerId          String?                                          // FK -> MdOwner
  vehicleNumber    String?                                          // Biển số xe
  fileName         String                                           // Tên file gốc
  filePath         String                                           // Đường dẫn lưu file
  fileSize         Int                                              // Kích thước file (bytes)
  mimeType         String                                           // MIME type
  notes            String?                                          // Ghi chú
  status           OutboundDocumentStatus @default(DRAFT)           // DRAFT, SCANNED, ERROR
  uploadedAt       DateTime               @default(now())
  uploadedBy       String?
  ...
}
```

### 7.2 OutboundDocumentType Enum

```prisma
enum OutboundDocumentType {
  BILL_OF_LADING       // Vận đơn (B/L)
  PACKING_LIST         // Phiếu đóng gói
  COMMERCIAL_INVOICE   // Hóa đơn thương mại
  DELIVERY_ORDER       // Lệnh giao hàng
  WEIGHT_CERTIFICATE   // Phiếu cân
  OTHER                // Khác
}
```

### 7.3 OutboundDocumentStatus Enum

```prisma
enum OutboundDocumentStatus {
  DRAFT    // Chờ scan (mặc định khi upload)
  SCANNED  // Đã scan (xác nhận OK)
  ERROR    // Lỗi (có vấn đề cần xử lý)
}
```

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial schema |
| 2.0.0 | 2026-03-17 | RESET: Logic xóa để định nghĩa lại |
| 2.1.0 | 2026-03-17 | Implement Sales Order: sử dụng bảng sales_orders, sales_order_lines với data mapping cho soType và blNumber |
| 2.2.0 | 2026-03-17 | **REMOVED FE Features:** Phân bổ, Cân hàng, Phê duyệt (chưa implement backend). Module 5 FE chỉ còn: Sales Order, Shipments |
| 2.3.0 | 2026-03-17 | **Shipment Management:** Sử dụng `shipment_header`, `shipment_line` để lưu phiếu xuất từ SO |
| 2.4.0 | 2026-03-17 | **Shipment Notes:** Thêm field `notes` cho `shipment_header` và `shipment_line` |
| 2.5.0 | 2026-03-22 | **Outbound Document:** Thêm bảng `outbound_document` để lưu chứng từ xuất kho (B/L, packing list, ...) |
| 2.6.0 | 2026-03-24 | **REMOVED Tables:** Xóa `shipment_allocation_record`, `shipment_weighing_attempt`, `shipment_approval_decision`. Xóa fields `tareWeightKg`, `totalGrossKg`, `totalNetKg`, `allLinesPassed`, `pendingApprovalCount` từ `shipment_header`. Xóa relation fields liên quan từ các model khác |
