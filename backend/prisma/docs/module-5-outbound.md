# Module 5: Outbound Operations — Database Documentation

**Schema Location:** `prisma/schema.prisma`  
**Module:** Outbound Operations  
**Status:** ✅ Active (Sales Order Management)  
**Tables:** 13 (Sales Order + Shipment tables)  
**Last Updated:** 2026-03-17  

---

## 1. Tổng quan

Module 5 sử dụng các bảng database để quản lý **luồng xuất hàng (Outbound Operations)**.

### Chức năng hiện tại
- **Sales Order Management**: Tạo và quản lý đơn xuất hàng
- **Chi tiết hàng hóa**: Theo dõi SL dự kiến và SL đã xuất theo dòng

---

## 2. Database Schema

### 2.1 Sales Order Tables (Đang sử dụng)

| Table | Model | Mục đích |
|-------|-------|----------|
| `sales_orders` | SalesOrder | Header đơn xuất hàng |
| `sales_order_lines` | SalesOrderLine | Chi tiết dòng hàng |
| `sales_order_status_history` | SalesOrderStatusHistory | Lịch sử thay đổi trạng thái |

### 2.2 Shipment Tables (Sẵn sàng cho phase tiếp theo)

| Group | Tables | Mục đích |
|-------|--------|----------|
| **Runtime** | `shipment_header`, `shipment_line`, `shipment_allocation_record` | Dữ liệu nghiệp vụ chính |
| **Weighing** | `shipment_weighing_attempt` | Log cân nặng |
| **Audit** | `shipment_status_history`, `shipment_exception_log`, `shipment_approval_decision` | Lịch sử và exceptions |
| **Control** | `shipment_pick_work_link`, `shipment_posting_link`, `shipment_so_link` | Liên kết với modules khác |

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

### Shipment Enums (Sẵn sàng cho phase tiếp theo)
- `ShipmentStatus`, `ShipmentLineStatus`, `ShipmentSourceType`
- `AllocationStatus`, `WeighType`, `WeighSourceMode`
- `ShipmentExceptionType`, `ShipmentExceptionStatus`
- `ApprovalDecisionType`, `ApprovalScope`
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

## 6. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial schema |
| 2.0.0 | 2026-03-17 | RESET: Logic xóa để định nghĩa lại |
| 2.1.0 | 2026-03-17 | Implement Sales Order: sử dụng bảng sales_orders, sales_order_lines với data mapping cho soType và blNumber |
| 2.2.0 | 2026-03-17 | **REMOVED FE Features:** Phân bổ, Cân hàng, Phê duyệt (chưa implement backend). Module 5 FE chỉ còn: Sales Order, Shipments |
