# Module 5: Outbound Operations — API Documentation

**Module Path:** `src/modules/outbound`
**Status:** ✅ Active (Sales Order + Shipment + Loading + Weighbridge Integration)
**Version:** 4.0.0
**Last Updated:** 2026-03-25

---

## 1. Tổng quan

Module 5 quản lý **luồng xuất hàng (Outbound Operations)**, từ tạo đơn xuất hàng → xếp hàng → cân xe → trừ tồn kho.

### Chức năng chính
- **Sales Order Management**: Tạo, cập nhật, xác nhận, hủy đơn xuất hàng (SO)
- **Shipment Management**: Tạo phiếu xuất kho (SHP) từ SO đã xác nhận
- **Loading (Xếp hàng)**: Xếp hàng lên xe với chọn vị trí lấy hàng (location picking)
- **Weighbridge Integration**: Cân xe 2 lần (tare + gross), tự động trừ tồn kho
- **Inventory Posting**: Post `SHIP_CONFIRMED` → trừ `on_hand` theo vị trí

---

## 2. Cấu trúc Code

```
src/modules/outbound/
├── outbound.module.ts
│
├── controllers/
│   ├── sales-order.controller.ts         # SO REST endpoints
│   ├── simple-shipment.controller.ts     # SHP CRUD
│   ├── loading.controller.ts             # ✅ Xếp hàng + Location picking
│   ├── shipment.controller.ts            # Full Shipment với M3 integration
│   ├── outbound-query.controller.ts      # Query/Dashboard
│   └── outbound-document.controller.ts   # Documents
│
├── services/
│   ├── sales-order.service.ts            # SO business logic
│   ├── simple-shipment.service.ts        # SHP CRUD + status mapping
│   ├── loading.service.ts                # ✅ Xếp hàng: start/load/unload/complete + location stock
│   ├── shipment.service.ts               # Core shipment
│   ├── shipment-command.service.ts       # Shipment commands
│   ├── shipment-state-machine.service.ts # State machine rules
│   ├── so-qty-rollup.service.ts          # SO quantity rollup
│   └── outbound-document.service.ts      # Document service
│
├── repositories/
│   ├── shipment-header.repository.ts
│   ├── shipment-line.repository.ts
│   └── status-history.repository.ts
│
└── dto/
    ├── sales-order.dto.ts
    ├── shipment.dto.ts
    └── shipment-response.dto.ts
```

---

## 3. API Endpoints

### 3.1 Sales Order Management

| Method | Endpoint | Mục đích |
|--------|----------|----------|
| GET | `/outbound/sales-orders/next-number` | Lấy số SO tiếp theo |
| GET | `/outbound/sales-orders` | Danh sách SO (phân trang, filter) |
| GET | `/outbound/sales-orders/:id` | Chi tiết SO |
| POST | `/outbound/sales-orders` | Tạo SO mới |
| PATCH | `/outbound/sales-orders/:id` | Cập nhật SO (chỉ khi DRAFT) |
| POST | `/outbound/sales-orders/:id/confirm` | Xác nhận SO |
| POST | `/outbound/sales-orders/:id/cancel` | Hủy SO |
| POST | `/outbound/sales-orders/:id/unconfirm` | Hủy xác nhận SO |
| POST | `/outbound/sales-orders/:id/close` | Đóng SO |

### 3.2 Shipment Management

| Method | Endpoint | Mục đích |
|--------|----------|----------|
| GET | `/outbound/shipments` | Danh sách SHP (phân trang, filter) |
| GET | `/outbound/shipments/:id` | Chi tiết SHP |
| POST | `/outbound/shipments` | Tạo SHP từ SO |
| PATCH | `/outbound/shipments/:id` | Cập nhật SHP (chỉ khi DRAFT) |
| POST | `/outbound/shipments/:id/confirm` | Xác nhận SHP |
| DELETE | `/outbound/shipments/:id` | Xóa SHP (chỉ khi DRAFT) |
| POST | `/outbound/shipments/:id/report-error` | Báo lỗi SHP |
| POST | `/outbound/shipments/:id/ship` | Xuất hàng + post M3 |

### 3.3 Loading (Xếp hàng) — ✅ Updated v4.0.0

| Method | Endpoint | Mục đích |
|--------|----------|----------|
| GET | `/outbound/loading/shipments` | Danh sách SHP cần xếp (CONFIRMED + LOADING) |
| GET | `/outbound/loading/:id/status` | Trạng thái xếp hàng + thông tin cân |
| GET | `/outbound/loading/:id/locations-with-stock?itemId=` | **NEW:** Danh sách vị trí có tồn kho cho dropdown |
| POST | `/outbound/loading/:id/start` | Bắt đầu xếp (yêu cầu đã cân tare) |
| POST | `/outbound/loading/:id/load-item` | **UPDATED:** Xếp 1 item + ghi locationId |
| POST | `/outbound/loading/:id/unload-item` | Bỏ xếp 1 item |
| POST | `/outbound/loading/:id/complete` | Hoàn thành xếp hàng |

### 3.4 Documents

| Method | Endpoint | Mục đích |
|--------|----------|----------|
| GET | `/outbound/documents` | Danh sách chứng từ xuất |

---

## 4. Loading API Detail

### GET /outbound/loading/:id/locations-with-stock

**Mục đích:** Lấy danh sách vị trí có tồn kho cho 1 mặt hàng trong kho của SHP. Dùng cho dropdown chọn vị trí khi xếp hàng.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| itemId | UUID | ✅ | Mặt hàng cần tìm vị trí |

**Response:** `200 OK`
```json
[
  {
    "locationId": "uuid",
    "locationCode": "WH01-B-01",
    "locationType": "STORAGE",
    "ownerId": "uuid",
    "ownerCode": "OWN-001",
    "inventoryStatusId": "uuid",
    "statusCode": "AVAILABLE",
    "availableQty": 120000,
    "physicalQty": 120000,
    "uomCode": "KG"
  }
]
```

**Logic:** Query `on_hand` WHERE `itemId` AND `inventDim.warehouseId = SHP.warehouseId` AND `availableQty > 0`, sorted by `availableQty DESC`.

---

### POST /outbound/loading/:id/load-item

**Mục đích:** Đánh dấu 1 item đã xếp lên xe + ghi nhận vị trí lấy hàng.

**Request Body:**
```json
{
  "shipmentLineId": "uuid",
  "locationId": "uuid"          // ← NEW: vị trí lấy hàng (từ dropdown)
}
```

**Response:** Loading status (same as GET status)

**Logic:**
1. Kiểm tra SHP status = LOADING
2. Kiểm tra đã cân tare
3. Kiểm tra line status = PENDING
4. Update line: `lineStatus=LOADING`, `loadedQty=expectedQtyKg`, `locationId=locationId`, `weighSequenceNo=N`

---

### GET /outbound/loading/:id/status

**Response:** `200 OK`
```json
{
  "shipmentId": "uuid",
  "shipmentNumber": "SHP-202603-00001",
  "vehicleNumber": "1232131",
  "status": "LOADING",
  "owner": { "id": "uuid", "ownerCode": "OWN-001", "ownerName": "Thoresen" },
  "warehouse": { "id": "uuid", "warehouseCode": "WH-01", "warehouseName": "Kho 1" },
  "hasTare": true,
  "hasGross": false,
  "lines": [
    {
      "id": "uuid",
      "lineNumber": 1,
      "itemId": "uuid",
      "itemCode": "CLINKER",
      "itemName": "Clinker xi măng",
      "uomCode": "BAG25",
      "expectedQtyKg": 2775,
      "loadSequence": 1,
      "lineStatus": "LOADING",
      "locationId": "uuid",
      "locationCode": "WH01-B-01",
      "isLoaded": true
    }
  ]
}
```

> **Lưu ý bảo mật:** `hasTare` và `hasGross` chỉ trả trạng thái (true/false), **KHÔNG trả số kg** — tránh gian lận ăn bớt hàng.

---

## 5. State Machine

### Sales Order Status Flow
```
DRAFT (Tạo mới) ──→ CONFIRMED (Đã xác nhận) ──→ PARTIALLY_RELEASED ──→ FULLY_RELEASED ──→ CLOSED
      ↓                      ↕ (unconfirm)
   CANCELLED              DRAFT
```

### Shipment Status Flow
```
DRAFT ──→ CONFIRMED ──→ LOADING ──→ LOADED ──→ SHIPPED ──→ CLOSED
  ↓           ↓
CANCELLED  CANCELLED (report-error)
```

| Transition | Action | Trigger | Validation |
|------------|--------|---------|------------|
| DRAFT → CONFIRMED | `confirm` | User click | — |
| CONFIRMED → LOADING | `START_LOADING` | User "Bắt đầu xếp" | Đã cân tare |
| LOADING → LOADED | `COMPLETE_LOADING` | User "Hoàn thành xếp" | Tất cả lines đã xếp |
| LOADED → SHIPPED | Cân lần 2 | Weighbridge auto | SHP status = LOADED |

### Shipment Line Status Flow
```
PENDING ──→ LOADING ──→ WEIGHED_PASS
   ↓           ↓
CANCELLED  PENDING (unload)
```

---

## 6. Weighbridge Integration (M8 → M5 → M3)

### Luồng cân outbound (WEIGH_OUT)

```
Cân lần 1 (xe rỗng)                     Cân lần 2 (xe có hàng)
─────────────────────                    ──────────────────────────
M8: grossWeightKg = tare weight          M8: tareWeightKg = gross weight
M8: status → WEIGHING                    M8: netWeightKg = |gross - tare|
                                         M8: status → COMPLETED
                                         ↓
                                         M5: shipmentLine.shippedQty = netWeight
                                         M5: shipmentLine.netWeightKg = netWeight
                                         ↓
                                         M3: PostingEngine.postInventory({
                                           eventCode: 'SHIP_CONFIRMED',
                                           dimFrom: { warehouse, location, owner },
                                           qty: netWeight
                                         })
                                         ↓
                                         on_hand: physicalQty -= netWeight
                                         on_hand: allocatedQty -= netWeight
                                         invent_trans: new ISSUE/DEDUCTED record
```

### Validation Constraints

| Constraint | Check Location | Error Message |
|------------|---------------|---------------|
| Chưa cân tare → không xếp hàng | `loading.service.ts` `startLoading()` | Xe chưa cân tare. Vui lòng đưa xe đến Trạm cân trước. |
| Chưa xếp xong → không cân lần 2 | `weighbridge-log.service.ts` `recordWeight()` | Xe chưa xếp hàng xong. Vui lòng hoàn thành xếp hàng trước khi cân lần 2. |
| Cân lần 2 nhỏ hơn lần 1 (WEIGH_OUT) | `weighbridge-log.service.ts` `recordWeight()` | Trọng lượng lần 2 không được nhỏ hơn trọng lượng lần 1 |

---

## 7. On-Hand Page Enhancement

### Cột "Đã xuất" trên trang Tồn kho hiện tại

**Controller:** `inventory-core.controller.js` `queryOnHand()`

**Logic:** Sau khi query on-hand, enrich mỗi row với `outboundDemandQty`:

```javascript
// Query tổng shippedQty từ shipment lines đã xuất
const shipmentLines = await prisma.shipmentLine.findMany({
  where: { shippedQty: { gt: 0 }, lineStatus: { notIn: ['CANCELLED'] } },
  select: { itemId: true, shippedQty: true, header: { select: { warehouseId: true } } },
});
// Group by itemId + warehouseId
demandMap[`${itemId}|${warehouseId}`] = sum(shippedQty)
// Enrich each on-hand row
row.outboundDemandQty = demandMap[`${row.itemId}|${row.inventDim.warehouseId}`] || 0
```

---

## 8. Dependencies

| Module | Service/Data | Usage |
|--------|--------------|-------|
| M1 Foundation | NumberSequence | Sinh SO/SHP number |
| M2 Master Data | MdOwner, MdItem, MdWarehouse, MdLocation | Validation + lookup |
| **M3 Inventory** | **PostingEngineService** | **Post SHIP_CONFIRMED → trừ on_hand** |
| **M3 Inventory** | **OnHand query** | **Dropdown vị trí có tồn kho, cột "Đã xuất"** |
| **M8 Integration** | **WeighbridgeLogService** | **Cân xe, trigger inventory posting** |

---

## 9. Frontend Components

| Component | File | Mục đích |
|-----------|------|----------|
| SalesOrdersPage | `pages/outbound-operations/SalesOrdersPage.jsx` | Danh sách + CRUD SO |
| OutboundShipmentsPage | `pages/outbound-operations/OutboundShipmentsPage.jsx` | Danh sách + CRUD SHP |
| OutboundLoadingPage | `pages/outbound-operations/OutboundLoadingPage.jsx` | Xếp hàng + chọn vị trí |
| LocationPicker | (inline in OutboundLoadingPage) | Dropdown vị trí có tồn kho |
| WeighbridgePage | `pages/integration/WeighbridgePage.jsx` | Trạm cân |

### Frontend Hooks (Loading)

| Hook | API | Mục đích |
|------|-----|----------|
| `useShipmentsForLoading()` | GET /loading/shipments | Danh sách SHP cần xếp |
| `useLoadingStatus(id)` | GET /loading/:id/status | Trạng thái xếp hàng |
| `useLocationsWithStock(shipmentId, itemId)` | GET /loading/:id/locations-with-stock | Dropdown vị trí |
| `useStartLoading()` | POST /loading/:id/start | Bắt đầu xếp |
| `useLoadItem()` | POST /loading/:id/load-item | Xếp item + locationId |
| `useUnloadItem()` | POST /loading/:id/unload-item | Bỏ xếp |
| `useCompleteLoading()` | POST /loading/:id/complete | Hoàn thành xếp |

---

## 10. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial implementation |
| 3.0.0 | 2026-03-17 | RESET: SO + Shipment CRUD |
| 3.7.0 | 2026-03-24 | Warehouse Filter by Owner OnHand |
| 4.0.0 | 2026-03-25 | **Loading + Weighbridge + Inventory Integration:**<br>- Loading với location picking, cân lần 2 auto-post SHIP_CONFIRMED, on-hand cột "Đã xuất" |
| 4.1.0 | 2026-03-25 | **Item Filter theo Owner OnHand khi tạo SO:**<br>- `SOFormDrawer`: query `on_hand` theo `ownerId` + `hasStock=true` khi chọn chủ hàng<br>- Filter items: chỉ hiển thị items có `inventoryStatus.statusCode === 'AVAILABLE'`<br>- Dùng `useOnHandList` hook từ `@domains/inventory-core`<br>- Nếu chưa chọn chủ hàng → hiển thị tất cả items (không filter) |
