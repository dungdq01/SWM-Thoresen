# Module 5: Outbound Operations — Database Documentation

**Schema Location:** `prisma/schema.prisma`
**Module:** Outbound Operations
**Status:** ✅ Active (Sales Order + Shipment + Loading + Weighbridge Integration)
**Tables:** 10 (Sales Order + Shipment + Document tables)
**Version:** 3.0.0
**Last Updated:** 2026-03-25

---

## 1. Tổng quan

Module 5 sử dụng các bảng database để quản lý **luồng xuất hàng (Outbound Operations)**.

### Chức năng hiện tại
- **Sales Order Management**: Tạo và quản lý đơn xuất hàng
- **Shipment Management**: Tạo và quản lý phiếu xuất kho từ SO
- **Loading (Xếp hàng)**: Xếp hàng lên xe với chọn vị trí lấy hàng
- **Weighbridge Integration**: Cân xe (tare/gross), tính khối lượng tịnh, post inventory
- **Inventory Deduction**: Trừ tồn kho theo vị trí sau khi cân lần 2

---

## 2. Database Schema

### 2.1 Sales Order Tables

| Table | Model | Mục đích |
|-------|-------|----------|
| `sales_orders` | SalesOrder | Header đơn xuất hàng |
| `sales_order_lines` | SalesOrderLine | Chi tiết dòng hàng |
| `sales_order_status_history` | SalesOrderStatusHistory | Lịch sử thay đổi trạng thái |

### 2.2 Shipment Tables

| Table | Model | Mục đích | Status |
|-------|-------|----------|--------|
| `shipment_header` | ShipmentHeader | Header phiếu xuất | ✅ Active |
| `shipment_line` | ShipmentLine | Chi tiết dòng hàng + **vị trí lấy hàng** | ✅ Active |
| `shipment_status_history` | ShipmentStatusHistory | Lịch sử trạng thái | ✅ Active |

### 2.3 Document Tables

| Table | Model | Mục đích | Status |
|-------|-------|----------|--------|
| `outbound_document` | OutboundDocument | Chứng từ xuất kho | ✅ Active |

### 2.4 Related Tables (Module khác)

| Table | Module | Liên kết |
|-------|--------|----------|
| `m8_weighbridge_log` | M8 Integration | Phiếu cân liên kết SHP qua `shipmentId` |
| `invent_trans` | M3 Inventory | Transaction ISSUE/DEDUCTED sau cân lần 2 |
| `on_hand` | M3 Inventory | Tồn kho bị trừ sau cân lần 2 |

---

## 3. Sales Order Schema Detail

### 3.1 SalesOrder (sales_orders)

```prisma
model SalesOrder {
  id                   String           @id @default(uuid())
  soNumber             String           @unique          // Số SO (auto-gen: SO-YYMMDD-NNNNN)
  externalSoNumber     String?                           // Số B/L (blNumber từ frontend)
  orderType            SalesOrderType   @default(STANDARD) // SEA=STANDARD, LAND=CONSIGNMENT
  status               SalesOrderStatus @default(DRAFT)  // DRAFT=NEW (API trả "NEW")
  ownerId              String                            // FK -> MdOwner
  customerId           String                            // FK -> MdCustomer
  warehouseId          String                            // FK -> MdWarehouse
  totalExpectedQtyKg   Decimal          @default(0)      // Tổng SL dự kiến (kg)
  totalShippedQtyKg    Decimal          @default(0)      // Tổng SL đã xuất (kg)
  notes                String?
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
  expectedQty     Decimal                                // SL dự kiến (ĐVT gốc)
  expectedQtyKg   Decimal                                // SL dự kiến (kg)
  shippedQtyKg    Decimal              @default(0)       // SL đã xuất (kg)
  status          SalesOrderLineStatus @default(OPEN)
  ...
}
```

---

## 4. Shipment Schema Detail

### 4.1 ShipmentHeader (shipment_header)

```prisma
model ShipmentHeader {
  id                   String             @id @default(uuid())
  shipmentNumber       String?            @unique          // SHP-YYMMDD-NNNNN
  soId                 String?                             // Số SO (reference text)
  salesOrderId         String?                             // FK -> SalesOrder
  sourceType           ShipmentSourceType                  // SO, STANDALONE
  ownerId              String                              // FK -> MdOwner
  warehouseId          String                              // FK -> MdWarehouse (kho cấp header)
  vehicleNumber        String                              // Biển số xe
  status               ShipmentStatus     @default(DRAFT)  // DRAFT → CONFIRMED → LOADING → LOADED → SHIPPED
  notes                String?
  ...
}
```

### 4.2 ShipmentLine (shipment_line) — ✅ Updated v3.0.0

```prisma
model ShipmentLine {
  id                  String             @id @default(uuid())
  shipmentHeaderId    String                               // FK -> ShipmentHeader
  lineNumber          Int
  soLineId            String?                              // Reference tới SO line
  itemId              String                               // FK -> MdItem
  cargoForm           CargoForm
  uomId               String                               // FK -> MdUom
  expectedQty         Decimal                              // SL dự kiến (ĐVT gốc)
  expectedQtyKg       Decimal                              // SL dự kiến (kg)
  loadedQty           Decimal            @default(0)       // SL đã xếp lên xe
  shippedQty          Decimal?                             // SL đã xuất (net weight sau cân lần 2)
  netWeightKg         Decimal?                             // Khối lượng tịnh (kg)
  locationId          String?                              // ← NEW: FK -> MdLocation (vị trí lấy hàng, ghi khi xếp hàng)
  weighSequenceNo     Int?                                 // Thứ tự xếp hàng
  lineStatus          ShipmentLineStatus @default(PENDING) // PENDING → LOADING → WEIGHED_PASS
  ...

  location MdLocation?    @relation(fields: [locationId], references: [id])
}
```

**Field mới `locationId`:**
- Nullable — chỉ được set khi xếp hàng (bước 7)
- Ghi nhận vị trí thực tế lấy hàng trong kho
- Dùng để xác định `dimFrom` khi post inventory transaction (trừ tồn kho đúng vị trí)

---

## 5. Enums

### Sales Order Enums

```prisma
enum SalesOrderStatus {
  DRAFT              // API: NEW, Frontend: Tạo mới
  CONFIRMED          // Đã xác nhận
  PARTIALLY_RELEASED // Xuất 1 phần
  FULLY_RELEASED     // Xuất đủ
  CLOSED             // Đã đóng
  CANCELLED          // Đã hủy
}

enum SalesOrderType {
  STANDARD           // Đường thủy (SEA)
  CONSIGNMENT        // Đường bộ (LAND)
  INTERNAL
}
```

### Shipment Enums (Đang sử dụng)

```prisma
enum ShipmentStatus {
  DRAFT              // API: NEW, Frontend: Tạo mới
  CONFIRMED          // Đã xác nhận — sẵn sàng cân + xếp hàng
  LOADING            // Đang xếp hàng (sau START_LOADING)
  LOADED             // Đã xếp xong (sau COMPLETE_LOADING) — sẵn sàng cân lần 2
  SHIPPED            // Đã xuất (sau cân lần 2 + post inventory)
  CLOSED             // Đã đóng
  CANCELLED          // Đã hủy
}

enum ShipmentLineStatus {
  PENDING            // Chờ xếp hàng
  LOADING            // Đã xếp lên xe (có locationId)
  WEIGHED_PASS       // Hoàn thành xếp (sau COMPLETE_LOADING)
  SHIPPED            // Đã xuất
  CANCELLED          // Đã hủy
}
```

---

## 6. Data Mapping (Frontend ↔ Database ↔ API)

| Frontend | API Response | Database | Notes |
|----------|-------------|----------|-------|
| Tạo mới | `NEW` | `DRAFT` | Service maps DRAFT→NEW trong response |
| Đường thủy (SEA) | `SEA` | `STANDARD` | |
| Đường bộ (LAND) | `LAND` | `CONSIGNMENT` | |
| Số B/L | `blNumber` | `externalSoNumber` | |
| SL đã xuất | `shippedQty` | `shippedQty` / `shippedQtyKg` | |

---

## 7. Inventory Integration (M3)

### 7.1 Post Inventory khi cân lần 2 hoàn tất

Khi weighbridge service hoàn thành cân lần 2 (WEIGH_OUT), tự động gọi `PostingEngineService.postInventory()`:

```javascript
{
  eventCode: 'SHIP_CONFIRMED',        // Event mapping → ISSUE + DEDUCTED
  refType: 'SHIPMENT',
  refId: shipmentId,
  refLineId: lineId,
  itemId: line.itemId,
  qty: netWeight,                      // Khối lượng tịnh (kg)
  uomCode: 'KG',
  dimFrom: {
    warehouseCode: shipment.warehouse.warehouseCode,
    locationCode: line.location.locationCode,  // Vị trí đã chọn khi xếp hàng
    ownerCode: shipment.owner.ownerCode,
    statusCode: 'AVAILABLE',
  },
  sourceApp: 'SYSTEM',
  weighbridgeTicketId: weighLogId,
}
```

### 7.2 Tác động lên on_hand

| Field | Delta | Mô tả |
|-------|-------|-------|
| `physicalQty` | −netWeight | Giảm số lượng vật lý |
| `allocatedQty` | −netWeight | Giảm số lượng đã phân bổ |
| `availableQty` | Tính lại = physical − allocated | |

### 7.3 Hiển thị trên trang Tồn kho hiện tại

Cột **"Đã xuất"** (`outboundDemandQty`) = tổng `shippedQty` từ tất cả shipment lines có `shippedQty > 0`, group theo `itemId + warehouseId`.

---

## 8. Business Rules

### 8.1 Item Filter theo Owner khi tạo SO
- Khi chọn chủ hàng, dropdown **Mã hàng hóa** chỉ hiển thị items mà owner có tồn kho ở trạng thái **AVAILABLE**
- Query: `GET /inventory-core/onhand?ownerId={ownerId}&hasStock=true&pageSize=100`
- Filter: `inventDim.inventoryStatus.statusCode === 'AVAILABLE'`
- Nếu chưa chọn chủ hàng → hiển thị tất cả items

### 8.2 Warehouse Selection khi tạo SHP
- Dropdown kho filter theo owner — chỉ hiển thị kho có `on_hand` record cho owner
- Query: `GET /inventory-core/onhand?ownerId={ownerId}&pageSize=100`

### 8.3 Loading Constraints
- **Cân tare trước xếp hàng:** `startLoading` kiểm tra `M8WeighbridgeLog` có record WEIGH_OUT với `grossWeightKg != null`
- **Xếp hết mới hoàn thành:** `completeLoading` kiểm tra không còn line PENDING
- **Xếp hàng xong mới cân lần 2:** `recordWeight` lần 2 kiểm tra SHP status = LOADED

### 8.4 Location Tracking
- `locationId` trên `ShipmentLine` được set khi `loadItem` (chọn vị trí lấy hàng)
- API `GET /outbound/loading/:id/locations-with-stock?itemId=xxx` trả danh sách vị trí có tồn kho cho dropdown

---

## 9. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial schema |
| 2.0.0 | 2026-03-17 | RESET: Logic xóa để định nghĩa lại |
| 2.7.0 | 2026-03-24 | Warehouse Filter by Owner OnHand |
| 3.0.0 | 2026-03-25 | **Loading + Weighbridge + Inventory Integration:**<br>- Thêm `locationId` vào `ShipmentLine` (FK → MdLocation)<br>- Cân lần 2 → post `SHIP_CONFIRMED` → trừ `on_hand`<br>- Trang on-hand thêm cột "Đã xuất" |
| 3.1.0 | 2026-03-25 | **Item Filter theo Owner OnHand khi tạo SO:**<br>- Dropdown Mã hàng hóa trong form tạo SO filter theo tồn kho AVAILABLE của chủ hàng<br>- Query `on_hand` theo `ownerId` + `hasStock=true`, filter `statusCode=AVAILABLE`<br>- Nếu chưa chọn chủ hàng → hiển thị tất cả items |
