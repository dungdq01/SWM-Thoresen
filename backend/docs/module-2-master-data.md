# Module 2 - Master Data Management

## 1. Module này để làm gì?
`master-data` là module quản lý dữ liệu nền tảng cho toàn bộ hoạt động kho.

Module này cung cấp các năng lực:
- Quản lý Owner (chủ hàng)
- Quản lý Customer (khách hàng)
- Quản lý Vendor (nhà cung cấp)
- Quản lý Vessel (tàu)
- Quản lý Carrier (đơn vị vận chuyển)
- Quản lý Item (mặt hàng)
- Quản lý Item Group (nhóm mặt hàng)
- Quản lý Lot (lô hàng)
- Quản lý Warehouse (kho)
- Quản lý Zone (vùng trong kho)
- Quản lý Location (vị trí trong zone)
- Quản lý Location Type (loại vị trí)
- Quản lý UOM (đơn vị tính) và quy đổi
- Quản lý Vehicle Type (loại phương tiện)
- Quản lý Inventory Status (trạng thái tồn kho)
- Quản lý Owner SKU Mapping (ánh xạ SKU theo owner)
- Cung cấp Lookup endpoints cho dropdown UI
- Cung cấp Dropdown Config cho dynamic options

## 2. Folder code chính của module
```text
backend/src/modules/master-data/
├── controllers/
│   ├── carrier.controller.ts
│   ├── customer.controller.ts
│   ├── dropdown-config.controller.ts
│   ├── inventory-status.controller.ts
│   ├── item-group.controller.ts
│   ├── item.controller.ts
│   ├── location-type.controller.ts
│   ├── location.controller.ts
│   ├── lookup.controller.ts
│   ├── lot.controller.ts
│   ├── owner-sku-mapping.controller.ts
│   ├── owner.controller.ts
│   ├── uom-conversion.controller.ts
│   ├── uom.controller.ts
│   ├── vehicle-type.controller.ts
│   ├── vendor.controller.ts
│   ├── vessel.controller.ts
│   ├── warehouse.controller.ts
│   └── zone.controller.ts
├── dto/
│   ├── carrier.dto.ts
│   ├── common.dto.ts
│   ├── customer.dto.ts
│   ├── dropdown-config.dto.ts
│   ├── inventory-status.dto.ts
│   ├── item-group.dto.ts
│   ├── item.dto.ts
│   ├── location-type.dto.ts
│   ├── location.dto.ts
│   ├── lot.dto.ts
│   ├── owner-sku-mapping.dto.ts
│   ├── owner.dto.ts
│   ├── uom-conversion.dto.ts
│   ├── uom.dto.ts
│   ├── vehicle-type.dto.ts
│   ├── vendor.dto.ts
│   ├── vessel.dto.ts
│   ├── warehouse.dto.ts
│   └── zone.dto.ts
├── repositories/
│   ├── carrier.repository.ts
│   ├── customer.repository.ts
│   ├── dropdown-config.repository.ts
│   ├── inventory-status.repository.ts
│   ├── item-group.repository.ts
│   ├── item.repository.ts
│   ├── location-type.repository.ts
│   ├── location.repository.ts
│   ├── lot.repository.ts
│   ├── owner-sku-mapping.repository.ts
│   ├── owner.repository.ts
│   ├── uom-conversion.repository.ts
│   ├── uom.repository.ts
│   ├── vehicle-type.repository.ts
│   ├── vendor.repository.ts
│   ├── vessel.repository.ts
│   ├── warehouse.repository.ts
│   └── zone.repository.ts
├── services/
│   ├── carrier.service.ts
│   ├── customer.service.ts
│   ├── dropdown-config.service.ts
│   ├── inventory-status.service.ts
│   ├── item-group.service.ts
│   ├── item.service.ts
│   ├── location-type.service.ts
│   ├── location.service.ts
│   ├── lookup.service.ts
│   ├── lot.service.ts
│   ├── owner-sku-mapping.service.ts
│   ├── owner.service.ts
│   ├── uom.service.ts
│   ├── vehicle-type.service.ts
│   ├── vendor.service.ts
│   ├── vessel.service.ts
│   ├── warehouse.service.ts
│   └── zone.service.ts
└── master-data.module.ts
```

## 3. Các thành phần dùng chung mà module dựa vào

### Guards & Decorators
- `backend/src/common/guards/auth.guard.ts` - Xác thực JWT token
- `backend/src/common/guards/permission.guard.ts` - Kiểm tra quyền RBAC
- `backend/src/common/decorators/permission.decorator.ts` - Decorator `@Permission()`
- `backend/src/common/decorators/current-user.decorator.ts` - Decorator `@CurrentUser()`

### Infrastructure
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/interceptors/response.interceptor.ts`
- `backend/src/infrastructure/prisma/prisma.module.ts`
- `backend/src/infrastructure/prisma/prisma.service.ts`

### Foundation Services (từ Module 1)
- `LogService` - Ghi audit log cho mọi mutation (create, update, deactivate, reactivate)
- `IdempotencyService` - Xử lý idempotency cho create operations có externalId

## 3.1 RBAC Protection

Tất cả controllers trong module đều được bảo vệ bởi RBAC:

```typescript
@Controller('master-data/owners')
@UseGuards(AuthGuard, PermissionGuard)
export class OwnerController {
  @Post()
  @Permission('MASTER_DATA.OWNER.CREATE')
  async create(@Body() dto: CreateOwnerDto, @CurrentUser() user: RequestUser) {
    return this.ownerService.create(dto, { userId: user.id });
  }
}
```

### Permission Codes
| Entity | CREATE | READ | UPDATE | DEACTIVATE | REACTIVATE |
|--------|--------|------|--------|------------|------------|
| Owner | master_data.owner.create | master_data.owner.view | master_data.owner.update | master_data.owner.deactivate | master_data.owner.reactivate |
| Customer | master_data.customer.create | master_data.customer.view | master_data.customer.update | master_data.customer.deactivate | master_data.customer.reactivate |
| Vendor | master_data.owner.create | master_data.owner.view | master_data.owner.update | master_data.owner.deactivate | master_data.owner.reactivate |
| Vessel | master_data.owner.create | master_data.owner.view | master_data.owner.update | master_data.owner.deactivate | master_data.owner.reactivate |
| Carrier | master_data.owner.create | master_data.owner.view | master_data.owner.update | master_data.owner.deactivate | master_data.owner.reactivate |
| Item | master_data.item.create | master_data.item.view | master_data.item.update | master_data.item.deactivate | master_data.item.reactivate |
| ItemGroup | master_data.item.create | master_data.item.view | master_data.item.update | master_data.item.deactivate | master_data.item.reactivate |
| Lot | master_data.lot.create | master_data.lot.view | master_data.lot.update | master_data.lot.deactivate | master_data.lot.reactivate |
| Warehouse | master_data.warehouse.create | master_data.warehouse.view | master_data.warehouse.update | master_data.warehouse.deactivate | master_data.warehouse.reactivate |
| Zone | master_data.zone.create | master_data.zone.view | master_data.zone.update | master_data.zone.deactivate | master_data.zone.reactivate |
| Location | master_data.location.create | master_data.location.view | master_data.location.update | master_data.location.deactivate | master_data.location.reactivate |
| LocationType | master_data.location.create | master_data.location.view | master_data.location.update | master_data.location.deactivate | - |
| UOM | master_data.uom.create | master_data.uom.view | master_data.uom.update | master_data.uom.deactivate | master_data.uom.reactivate |
| UomConversion | master_data.uom.create | master_data.uom.view | master_data.uom.update | - | - |
| VehicleType | master_data.vehicle_type.create | master_data.vehicle_type.view | master_data.vehicle_type.update | master_data.vehicle_type.deactivate | master_data.vehicle_type.reactivate |
| InventoryStatus | - | master_data.inventory_status.view | master_data.inventory_status.update | - | - |
| OwnerSkuMapping | master_data.owner.create | master_data.owner.view | master_data.owner.update | master_data.owner.deactivate | - |
| Lookup | - | master_data.lookup.view | - | - | - |

## 3.2 Audit Trail Integration

Mọi mutation đều được ghi audit log thông qua `LogService`:

```typescript
await this.logService.createAuditLog({
  entityType: 'WAREHOUSE',
  entityId: result.id,
  action: 'CREATE', // CREATE | UPDATE | DEACTIVATE | REACTIVATE
  userId: ctx.userId,
  oldValue: oldData, // cho UPDATE/DEACTIVATE/REACTIVATE
  newValue: result,
});
```

## 3.3 Idempotency Support

> **Lưu ý:** Idempotency cho create operations hiện chưa được triển khai trong Module 2.
> 
> Chỉ có `CreateWarehouseDto` có field `externalId`. Các DTO khác (`CreateItemDto`, `CreateZoneDto`, v.v.) chưa có.
> 
> Để triển khai idempotency trong tương lai, cần:
> 1. Thêm `externalId` vào các DTO
> 2. Sử dụng `IdempotencyService.executeIfKeyProvided()` từ Module 1

```typescript
// Ví dụ triển khai idempotency (chưa áp dụng)
return this.idempotencyService.executeIfKeyProvided({
  idempotencyKey: dto.externalId,
  commandName: 'CREATE_WAREHOUSE',
  sourceModule: 'MASTER_DATA',
  payload: dto,
  correlationId: ctx.correlationId,
  execute: doCreate,
  mapSuccess: (result) => ({
    resourceType: 'WAREHOUSE',
    resourceId: result.id,
  }),
});
```

## 3.4 FK Pre-validation

Services validate FK existence trước khi create/update để trả lỗi thân thiện:

```typescript
// item.service.ts
const baseUom = await this.prisma.mdUom.findUnique({ where: { id: dto.baseUomId } });
if (!baseUom) throw new BadRequestException('Base UOM not found');
```

## 3.5 Transaction-based Deactivation

Warehouse và Zone deactivation được wrap trong `$transaction` để tránh race condition:

```typescript
async deactivate(id, dto, ctx) {
  return this.prisma.$transaction(async (tx) => {
    const warehouse = await tx.mdWarehouse.findUnique({ where: { id } });
    const activeZoneCount = await tx.mdZone.count({ where: { warehouseId: id, isActive: true } });
    if (activeZoneCount > 0) throw new BadRequestException('Cannot deactivate');
    return tx.mdWarehouse.update({ ... });
  });
}
```

## 4. Nguyên tắc response chung
Tất cả API thành công đều được wrap bởi `ResponseInterceptor` theo dạng:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-03-08T03:00:00.000Z",
    "requestId": "..."
  }
}
```

Lỗi được wrap bởi `HttpExceptionFilter` theo dạng:

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Owner not found"
  },
  "meta": {
    "timestamp": "2026-03-08T03:00:00.000Z",
    "path": "/api/v1/master-data/owners/...",
    "requestId": "..."
  }
}
```

## 5. Soft delete và optimistic locking
### Soft Delete
- Tất cả entity master data dùng soft delete với field `isActive` và `deactivatedAt`.
- Deactivate: set `isActive = false`, `deactivatedAt = now()`, `deactivatedBy = userId`.
- Reactivate: set `isActive = true`, `deactivatedAt = null`, `deactivatedBy = null`.

### Optimistic Locking
- Tất cả entity có field `rowVersion` (BigInt).
- Mỗi lần update thành công, `rowVersion` được tăng lên 1.
- Client phải gửi `rowVersion` hiện tại khi update, nếu không khớp sẽ trả `409 Conflict`.

## 6. Danh sách API thực tế

---

## 6.1 Owner APIs

### `POST /api/v1/master-data/owners`
- **Để làm gì**
  - Tạo owner mới.
- **Body**
```json
{
  "ownerCode": "OWN001",
  "ownerName": "Công ty ABC",
  "shortName": "ABC",
  "ownerGroup": "LOCAL",
  "ownerType": "DOMESTIC",
  "taxCode": "0123456789",
  "address": "123 Nguyễn Văn A, Q.1, TP.HCM",
  "billingEmail": "billing@abc.com",
  "billingContact": "Nguyễn Văn B",
  "paymentTerms": "NET30"
}
```
- **File code tham gia**
  - `controllers/owner.controller.ts`
  - `services/owner.service.ts`
  - `repositories/owner.repository.ts`
- **Response data chính**
```json
{
  "id": "uuid",
  "ownerCode": "OWN001",
  "ownerName": "Công ty ABC",
  "isActive": true,
  "rowVersion": 0
}
```

### `GET /api/v1/master-data/owners`
- **Để làm gì**
  - Lấy danh sách owner có phân trang.
- **Query params**
  - `page` (default: 1)
  - `pageSize` (default: 20)
  - `keyword` (search ownerCode, ownerName)
  - `isActive`
  - `ownerGroup`
  - `ownerType`
- **Response data chính**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### `GET /api/v1/master-data/owners/:id`
- **Để làm gì**
  - Lấy chi tiết owner theo ID.

### `PUT /api/v1/master-data/owners/:id`
- **Để làm gì**
  - Cập nhật owner.
- **Body**
```json
{
  "ownerName": "Công ty ABC Updated",
  "rowVersion": 0
}
```

### `POST /api/v1/master-data/owners/:id/deactivate`
- **Để làm gì**
  - Soft delete owner.
- **Body**
```json
{
  "reason": "Không còn hợp tác"
}
```

### `POST /api/v1/master-data/owners/:id/reactivate`
- **Để làm gì**
  - Kích hoạt lại owner đã bị deactivate.

---

## 6.2 Vendor APIs

### `POST /api/v1/master-data/vendors`
- **Để làm gì**
  - Tạo vendor mới.
- **Body**
```json
{
  "vendorCode": "VND001",
  "vendorName": "Tàu ABC",
  "supplierGroup": "VESSEL",
  "countryRegion": "VN",
  "vesselName": "MV ABC",
  "contactName": "Nguyễn Văn C",
  "phone": "0901234567",
  "email": "contact@abc.com"
}
```

### `GET /api/v1/master-data/vendors`
- **Để làm gì**
  - Lấy danh sách vendor có phân trang.
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `supplierGroup`

### `GET /api/v1/master-data/vendors/:id`
### `PUT /api/v1/master-data/vendors/:id`
### `POST /api/v1/master-data/vendors/:id/deactivate`
### `POST /api/v1/master-data/vendors/:id/reactivate`

---

## 6.3 Item APIs

### `POST /api/v1/master-data/items`
- **Để làm gì**
  - Tạo item mới.
- **Body**
```json
{
  "itemCode": "RICE001",
  "itemName": "Gạo ST25",
  "itemNameEn": "ST25 Rice",
  "cargoForm": "BULK",
  "productGroup": "AGRICULTURAL",
  "baseUomId": "uuid-of-kg",
  "billingUomId": "uuid-of-mt",
  "stdGrossWeight": 50,
  "stdNetWeight": 49.5,
  "tolerancePctInbound": 2,
  "tolerancePctOutbound": 1.5
}
```

### `GET /api/v1/master-data/items`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `cargoForm`, `productGroup`

### `GET /api/v1/master-data/items/:id`
### `PUT /api/v1/master-data/items/:id`
### `POST /api/v1/master-data/items/:id/deactivate`
### `POST /api/v1/master-data/items/:id/reactivate`

---

## 6.4 Warehouse APIs

### `POST /api/v1/master-data/warehouses`
- **Để làm gì**
  - Tạo warehouse mới.
- **Body**
```json
{
  "warehouseCode": "WH5.1",
  "warehouseName": "Kho 5.1 - Phú Mỹ",
  "warehouseType": "COVERED",
  "totalAreaM2": 50000,
  "usableAreaM2": 45000,
  "maxHeightM": 12,
  "maxCapacityMt": 100000,
  "address": "KCN Phú Mỹ, Bà Rịa - Vũng Tàu",
  "hasWeighbridge": true,
  "weighbridgeCount": 2,
  "capacityWarningPct": 85
}
```

### `GET /api/v1/master-data/warehouses`
### `GET /api/v1/master-data/warehouses/:id`
### `PUT /api/v1/master-data/warehouses/:id`
### `POST /api/v1/master-data/warehouses/:id/deactivate`
### `POST /api/v1/master-data/warehouses/:id/reactivate`

---

## 6.5 Zone APIs

### `POST /api/v1/master-data/zones`
- **Body**
```json
{
  "warehouseId": "uuid",
  "zoneCode": "ZONE-A",
  "zoneName": "Zone A - Bulk Storage",
  "zoneType": "BULK_STORAGE",
  "isBillingZone": true,
  "maxCapacityMt": 20000
}
```

### `GET /api/v1/master-data/zones`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `warehouseId`, `zoneType`

### `GET /api/v1/master-data/zones/:id`
### `PUT /api/v1/master-data/zones/:id`
### `POST /api/v1/master-data/zones/:id/deactivate`
### `POST /api/v1/master-data/zones/:id/reactivate`

---

## 6.6 Location APIs

### `POST /api/v1/master-data/locations`
- **Body**
```json
{
  "warehouseId": "uuid",
  "zoneId": "uuid",
  "locationCode": "A-01-01",
  "locationType": "FLOOR",
  "locationProfile": "STANDARD",
  "status": "AVAILABLE",
  "areaM2": 100,
  "maxHeightM": 5,
  "stackLimitKg": 50000,
  "isMixedOwner": false,
  "isMixedProduct": false
}
```

### `GET /api/v1/master-data/locations`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `warehouseId`, `zoneId`, `locationType`

### `GET /api/v1/master-data/locations/:id`
### `PUT /api/v1/master-data/locations/:id`
### `POST /api/v1/master-data/locations/:id/deactivate`
### `POST /api/v1/master-data/locations/:id/reactivate`

---

## 6.7 UOM APIs

### `POST /api/v1/master-data/uoms`
- **Body**
```json
{
  "uomCode": "MT",
  "description": "Metric Ton",
  "uomClass": "WEIGHT",
  "isBaseUom": false,
  "decimalPrecision": 3
}
```

### `GET /api/v1/master-data/uoms`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `uomClass`

### `GET /api/v1/master-data/uoms/:id`
### `PUT /api/v1/master-data/uoms/:id`
### `POST /api/v1/master-data/uoms/:id/deactivate`
### `POST /api/v1/master-data/uoms/:id/reactivate`
- **Để làm gì**
  - Kích hoạt lại UOM đã bị deactivate.

---

## 6.8 Vehicle Type APIs

### `POST /api/v1/master-data/vehicle-types`
- **Body**
```json
{
  "vehicleTypeCode": "TRUCK-20T",
  "vehicleTypeName": "Xe tải 20 tấn",
  "category": "TRUCK",
  "defaultTareWeightKg": 8000,
  "maxPayloadKg": 20000,
  "teuEquivalent": 1
}
```

### `GET /api/v1/master-data/vehicle-types`
### `GET /api/v1/master-data/vehicle-types/:id`
### `PUT /api/v1/master-data/vehicle-types/:id`
### `POST /api/v1/master-data/vehicle-types/:id/deactivate`
### `POST /api/v1/master-data/vehicle-types/:id/reactivate`
- **Để làm gì**
  - Kích hoạt lại Vehicle Type đã bị deactivate.

---

## 6.9 Inventory Status APIs

### `GET /api/v1/master-data/inventory-statuses`
- **Để làm gì**
  - Lấy danh sách inventory status (không tạo mới, chỉ seed sẵn).

### `GET /api/v1/master-data/inventory-statuses/:id`
### `PUT /api/v1/master-data/inventory-statuses/:id`
- **Lưu ý**
  - Không thể sửa status có `isSystemLocked = true`.

---

## 6.10 Lookup APIs

Các endpoint này trả về dữ liệu đơn giản cho dropdown/autocomplete.

### `GET /api/v1/master-data/lookups/owners`
### `GET /api/v1/master-data/lookups/vendors`
### `GET /api/v1/master-data/lookups/items`
### `GET /api/v1/master-data/lookups/warehouses`
### `GET /api/v1/master-data/lookups/zones`
- **Query params**: `warehouseId` (optional)

### `GET /api/v1/master-data/lookups/locations`
- **Query params**: `warehouseId`, `zoneId` (optional)

### `GET /api/v1/master-data/lookups/uoms`
### `GET /api/v1/master-data/lookups/vehicle-types`
### `GET /api/v1/master-data/lookups/inventory-statuses`
### `GET /api/v1/master-data/lookups/customers`

### `GET /api/v1/master-data/lookups/dropdown-options`
- **Để làm gì**
  - Lấy danh sách options động cho dropdown theo entity và field.
- **Query params** (required)
  - `entity` - Tên entity (e.g., "item", "owner")
  - `fieldName` - Tên field (e.g., "cargoForm", "ownerType")

**Response format chung:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "WH5.1",
      "name": "Kho 5.1 - Phú Mỹ",
      "extra": { "warehouseType": "COVERED" }
    }
  ]
}
```

---

## 6.11 Customer APIs

### `GET /api/v1/master-data/customers/next-code`
- **Để làm gì**
  - Lấy mã khách hàng tiếp theo (auto-generate).
- **Response data chính**
```json
{
  "data": { "code": "CUST-001" }
}
```

### `POST /api/v1/master-data/customers`
- **Để làm gì**
  - Tạo khách hàng mới.

### `GET /api/v1/master-data/customers`
- **Để làm gì**
  - Lấy danh sách khách hàng có phân trang.
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`

### `GET /api/v1/master-data/customers/:id`
### `PUT /api/v1/master-data/customers/:id`
### `POST /api/v1/master-data/customers/:id/deactivate`
### `POST /api/v1/master-data/customers/:id/reactivate`

- **File code tham gia**
  - `controllers/customer.controller.ts`
  - `services/customer.service.ts`
  - `repositories/customer.repository.ts`

---

## 6.12 UOM Conversion APIs

### `POST /api/v1/master-data/uom-conversions`
- **Để làm gì**
  - Tạo quy đổi UOM mới.
- **Body**
```json
{
  "fromUomId": "uuid",
  "toUomId": "uuid",
  "conversionFactor": 1000,
  "itemId": "uuid (optional - null = global conversion)"
}
```

### `GET /api/v1/master-data/uom-conversions`
- **Để làm gì**
  - Lấy danh sách quy đổi UOM có phân trang.
- **Query params**
  - `page`, `pageSize`, `keyword`, `fromUomId`, `toUomId`

### `GET /api/v1/master-data/uom-conversions/:id`
### `PUT /api/v1/master-data/uom-conversions/:id`
- **Body**
```json
{
  "conversionFactor": 1000,
  "rowVersion": 0
}
```

### `DELETE /api/v1/master-data/uom-conversions/:id`
- **Để làm gì**
  - Xóa quy đổi UOM (hard delete).

- **File code tham gia**
  - `controllers/uom-conversion.controller.ts`
  - `repositories/uom-conversion.repository.ts`

---

## 6.14 Carrier APIs

### `GET /api/v1/master-data/carriers/next-code`
- **Để làm gì**
  - Lấy mã đơn vị vận chuyển tiếp theo (auto-generate).

### `POST /api/v1/master-data/carriers`
- **Để làm gì**
  - Tạo đơn vị vận chuyển mới.
- **Body**
```json
{
  "carrierCode": "CARRIER-001",
  "carrierName": "Công ty vận tải ABC",
  "contactName": "Nguyễn Văn A",
  "phone": "0901234567",
  "carrierGroup": "TRUCKING",
  "transportMode": "ROAD",
  "defaultVehicleTypeCode": "TRUCK-20T"
}
```

### `GET /api/v1/master-data/carriers`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `carrierGroup`, `transportMode`

### `GET /api/v1/master-data/carriers/:id`
### `PUT /api/v1/master-data/carriers/:id`
### `POST /api/v1/master-data/carriers/:id/deactivate`
### `POST /api/v1/master-data/carriers/:id/reactivate`

- **File code tham gia**
  - `controllers/carrier.controller.ts`
  - `services/carrier.service.ts`
  - `repositories/carrier.repository.ts`

---

## 6.15 Vessel APIs

### `GET /api/v1/master-data/vessels/next-code`
- **Để làm gì**
  - Lấy mã tàu tiếp theo (auto-generate).

### `POST /api/v1/master-data/vessels`
- **Để làm gì**
  - Tạo tàu mới.
- **Body**
```json
{
  "vesselCode": "VSL-001",
  "vesselName": "MV Thoresen Star",
  "imoNumber": "IMO1234567",
  "vesselType": "BULK_CARRIER",
  "nationality": "VN",
  "callSign": "3WXY",
  "dwtTon": 50000,
  "loaM": 190,
  "beamM": 32,
  "draftM": 12.5,
  "yearBuilt": 2015,
  "owner": "Thoresen Shipping",
  "operator": "TVL"
}
```

### `GET /api/v1/master-data/vessels`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `vesselType`

### `GET /api/v1/master-data/vessels/:id`
### `PUT /api/v1/master-data/vessels/:id`
### `POST /api/v1/master-data/vessels/:id/deactivate`
### `POST /api/v1/master-data/vessels/:id/reactivate`

- **File code tham gia**
  - `controllers/vessel.controller.ts`
  - `services/vessel.service.ts`
  - `repositories/vessel.repository.ts`

---

## 6.16 Item Group APIs

### `GET /api/v1/master-data/item-groups/next-code`
- **Để làm gì**
  - Lấy mã nhóm mặt hàng tiếp theo (auto-generate).

### `POST /api/v1/master-data/item-groups`
- **Để làm gì**
  - Tạo nhóm mặt hàng mới.
- **Body**
```json
{
  "itemGroupCode": "GRAINS",
  "itemGroupName": "Ngũ cốc",
  "description": "Nhóm hàng ngũ cốc",
  "cargoForm": "BULK"
}
```

### `GET /api/v1/master-data/item-groups`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `cargoForm`

### `GET /api/v1/master-data/item-groups/:id`
### `PUT /api/v1/master-data/item-groups/:id`
### `POST /api/v1/master-data/item-groups/:id/deactivate`
### `POST /api/v1/master-data/item-groups/:id/reactivate`

- **File code tham gia**
  - `controllers/item-group.controller.ts`
  - `services/item-group.service.ts`
  - `repositories/item-group.repository.ts`

---

## 6.17 Location Type APIs

### `GET /api/v1/master-data/location-types/next-code`
- **Để làm gì**
  - Lấy mã loại vị trí tiếp theo (auto-generate).

### `POST /api/v1/master-data/location-types`
- **Để làm gì**
  - Tạo loại vị trí mới.
- **Body**
```json
{
  "locationTypeCode": "FLOOR",
  "locationTypeName": "Sàn kho",
  "description": "Vị trí trên sàn",
  "isDefault": false
}
```

### `GET /api/v1/master-data/location-types`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`

### `GET /api/v1/master-data/location-types/:id`
### `PUT /api/v1/master-data/location-types/:id`
### `DELETE /api/v1/master-data/location-types/:id`
- **Để làm gì**
  - Xóa loại vị trí (hard delete).

- **File code tham gia**
  - `controllers/location-type.controller.ts`
  - `services/location-type.service.ts`
  - `repositories/location-type.repository.ts`

---

## 6.18 Owner SKU Mapping APIs

### `GET /api/v1/master-data/owner-sku-mappings/next-code`
- **Để làm gì**
  - Lấy mã ánh xạ tiếp theo (auto-generate).

### `POST /api/v1/master-data/owner-sku-mappings`
- **Để làm gì**
  - Tạo ánh xạ SKU của owner.
- **Body**
```json
{
  "ownerId": "uuid",
  "itemId": "uuid",
  "ownerSkuCode": "CARGILL-RICE-001",
  "ownerSkuName": "Gạo ST25 (Cargill)",
  "billingClass": "PREMIUM"
}
```

### `GET /api/v1/master-data/owner-sku-mappings`
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`, `ownerId`, `itemId`

### `GET /api/v1/master-data/owner-sku-mappings/:id`
### `PUT /api/v1/master-data/owner-sku-mappings/:id`
### `DELETE /api/v1/master-data/owner-sku-mappings/:id`
- **Để làm gì**
  - Xóa ánh xạ SKU (hard delete).

- **File code tham gia**
  - `controllers/owner-sku-mapping.controller.ts`
  - `services/owner-sku-mapping.service.ts`
  - `repositories/owner-sku-mapping.repository.ts`

---

## 7. Seed data hiện có
Seed đang tạo sẵn:

### UOMs (8 records)
| Code | Description | Class | Is Base |
|------|-------------|-------|---------|
| MT | Metric Ton | WEIGHT | No |
| KG | Kilogram | WEIGHT | Yes |
| M3 | Cubic Meter | VOLUME | Yes |
| UNIT | Unit/Piece | QUANTITY | Yes |
| BAG | Bag | QUANTITY | No |
| PALLET | Pallet | QUANTITY | No |
| CONTAINER | Container | QUANTITY | No |
| DAY | Day | QUANTITY | No |

### UOM Conversions
- MT → KG = 1000

### Inventory Statuses (4 records)
| Code | Description | Is Allocatable |
|------|-------------|----------------|
| AVAILABLE | Sẵn sàng để phân bổ | Yes |
| DAMAGED | Hư hỏng | No |
| BLOCKED | Đã khóa | No |
| IN_TRANSIT | Đang vận chuyển | No |

### Warehouse
- `WH5.1` - Kho 5.1 - Phú Mỹ

### Zones (5 records)
- `RCV-01` - Khu tiếp nhận 01 (RECEIVING)
- `STG-01` - Khu staging 01 (STAGING)
- `STR-A` - Khu lưu trữ A (STORAGE, billing zone)
- `STR-B` - Khu lưu trữ B (STORAGE, billing zone)
- `SHP-01` - Khu xuất hàng 01 (SHIPPING)

### Locations (6 records)
- `RCV-01-001` (RECEIVING) - zone RCV-01
- `STG-01-001` (STAGING) - zone STG-01
- `STR-A-001` (STORAGE) - zone STR-A
- `STR-A-002` (STORAGE) - zone STR-A
- `STR-B-001` (STORAGE) - zone STR-B
- `SHP-01-001` (SHIPPING) - zone SHP-01

### Service Codes (5 records)
- `STORAGE` - Phí lưu kho (STORAGE)
- `HANDLING_IN` - Phí xếp dỡ nhập (HANDLING)
- `HANDLING_OUT` - Phí xếp dỡ xuất (HANDLING)
- `BAGGING` - Phí đóng bao (VAS)
- `WEIGHING` - Phí cân (HANDLING)

### Day Types (3 records)
- `NORMAL` - Ngày thường
- `WEEKEND` - Cuối tuần
- `HOLIDAY` - Ngày lễ

### Owners (3 records)
- `TVL` - Thoresen Vinalines (DIRECT)
- `CARGILL` - Cargill Vietnam (CONSIGNED)
- `OLAM` - Olam International (CONSIGNED)

### Items (6 records)
- `RICE-JASMINE` - Gạo Jasmine (BULK)
- `CORN-YELLOW` - Bắp vàng (BULK)
- `WHEAT-SOFT` - Lúa mì mềm (BULK)
- `FERT-UREA` - Phân Urê (BAGGED_50KG)
- `FERT-NPK` - Phân NPK (BAGGED_50KG)
- `SUGAR-RAW` - Đường thô (BULK)

---

## 8. Internal shared services cho module khác

Các module nghiệp vụ (Inbound, Outbound, Inventory, Billing) có thể inject và sử dụng các service sau từ `MasterDataModule`:

### `OwnerService`
```typescript
// Validate owner tồn tại và active
const owner = await ownerService.findById(ownerId);
// Lấy danh sách owner cho dropdown
const owners = await ownerService.findAllActive();
```

### `ItemService`
```typescript
// Validate item tồn tại
const item = await itemService.findById(itemId);
// Lấy item với UOM info
const items = await itemService.findAllActive();
```

### `WarehouseService`
```typescript
// Validate warehouse
const warehouse = await warehouseService.findById(warehouseId);
```

### `LocationService`
```typescript
// Validate location
const location = await locationService.findById(locationId);
// Check location availability
const locations = await locationService.findAllActive();
```

### `UomService`
```typescript
// Get UOM for conversion
const uom = await uomService.findById(uomId);
```

### `InventoryStatusService`
```typescript
// Get allocatable statuses
const statuses = await inventoryStatusService.findAllocatable();
```

### `LookupService`
```typescript
// Get lookup data for dropdowns
const owners = await lookupService.getOwners();
const items = await lookupService.getItems();
const warehouses = await lookupService.getWarehouses();
const zones = await lookupService.getZones(warehouseId);
const locations = await lookupService.getLocations(warehouseId, zoneId);
```

---

## 9. Những điểm FE / dev mới cần lưu ý
- Tất cả entity dùng soft delete, không có hard delete.
- Update API yêu cầu `rowVersion` để optimistic locking.
- Lookup endpoints không phân trang, chỉ trả về active records.
- Zone và Location có cascade filter theo `warehouseId`.
- Inventory Status không cho tạo mới, chỉ seed sẵn 4 status chuẩn.
- Item có nhiều field optional liên quan đến catch weight, shelf life, tolerance.

---

## 10. Hướng dẫn test API

### Test với curl/PowerShell

```powershell
# Lấy danh sách warehouses
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/master-data/lookups/warehouses" -Method GET

# Lấy danh sách UOMs
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/master-data/lookups/uoms" -Method GET

# Lấy danh sách inventory statuses
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/master-data/lookups/inventory-statuses" -Method GET
```

### Với cURL (Git Bash / Linux)

```bash
# Lấy danh sách warehouses
curl http://localhost:3000/api/v1/master-data/lookups/warehouses

# Lấy zones của warehouse cụ thể
curl "http://localhost:3000/api/v1/master-data/lookups/zones?warehouseId=<uuid>"
```

---

## 6.13 Lot APIs

### `GET /api/v1/master-data/lots/next-code`
- **Để làm gì**
  - Lấy mã lô tiếp theo (auto-generate).
- **Response data chính**
```json
{
  "data": { "code": "LOT-20260322-0001" }
}
```

### `POST /api/v1/master-data/lots`
- **Để làm gì**
  - Tạo lô hàng mới.
- **Body**
```json
{
  "itemId": "uuid",
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "firstReceivedDate": "2026-03-22",
  "sourceLotId": "uuid (optional - cho VAS)",
  "attributes": { "quality": "A", "batch": "B001" },
  "notes": "Ghi chú"
}
```
- **File code tham gia**
  - `controllers/lot.controller.ts`
  - `services/lot.service.ts`
  - `repositories/lot.repository.ts`
- **Response data chính**
```json
{
  "id": "uuid",
  "lotCode": "LOT-20260322-0001",
  "itemId": "uuid",
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "firstReceivedDate": "2026-03-22",
  "lotHash": "sha256-hash",
  "status": "ACTIVE",
  "isActive": true,
  "rowVersion": 0
}
```

### `POST /api/v1/master-data/lots/get-or-create`
- **Để làm gì**
  - Lấy lot hiện có hoặc tạo mới nếu chưa tồn tại (dùng cho Inbound).
- **Body**
```json
{
  "itemId": "uuid",
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "attributes": { "quality": "A" },
  "firstReceivedDate": "2026-03-22"
}
```
- **Response data chính**
```json
{
  "lot": { ... },
  "created": true
}
```

### `GET /api/v1/master-data/lots`
- **Để làm gì**
  - Lấy danh sách lô có phân trang.
- **Query params**
  - `page`, `pageSize`, `keyword`, `isActive`
  - `itemId`, `ownerId`, `warehouseId`, `status`, `sourceLotId`
- **Response data chính**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### `GET /api/v1/master-data/lots/fifo`
- **Để làm gì**
  - Lấy danh sách lot theo FIFO (sắp xếp theo `firstReceivedDate` tăng dần).
- **Query params** (required)
  - `itemId`, `ownerId`, `warehouseId`

### `GET /api/v1/master-data/lots/:id`
- **Để làm gì**
  - Lấy chi tiết lô theo ID.

### `GET /api/v1/master-data/lots/:id/traceability`
- **Để làm gì**
  - Truy vết nguồn gốc lô hàng (source chain + derived lots).
- **Response data chính**
```json
{
  "sourceLots": [...],
  "derivedLots": [...]
}
```

### `GET /api/v1/master-data/lots/:id/derived-lots`
- **Để làm gì**
  - Lấy danh sách lô được tạo từ lô này (VAS output).

### `GET /api/v1/master-data/lots/by-code/:lotCode`
- **Để làm gì**
  - Tìm lô theo mã lô.

### `GET /api/v1/master-data/lots/by-hash/:lotHash`
- **Để làm gì**
  - Tìm lô theo lot hash.
- **Response data chính**
```json
{
  "found": true,
  "lot": { ... }
}
```

### `PUT /api/v1/master-data/lots/:id`
- **Để làm gì**
  - Cập nhật lô (chỉ cho phép cập nhật status, attributes, notes).
- **Body**
```json
{
  "status": "INACTIVE",
  "attributes": { "quality": "B" },
  "notes": "Updated notes",
  "rowVersion": 0
}
```

### `POST /api/v1/master-data/lots/:id/deactivate`
- **Để làm gì**
  - Soft delete lô.
- **Body**
```json
{
  "reasonCode": "EXPIRED",
  "note": "Lô hết hạn"
}
```

### `POST /api/v1/master-data/lots/:id/reactivate`
- **Để làm gì**
  - Kích hoạt lại lô đã bị deactivate.

---

## 11. Changelog — FE-BE Alignment Fixes (2026-03-11)

| Fix | Mô tả |
|-----|-------|
| Docs 6.7 UOM | Thêm endpoint `POST /api/v1/master-data/uoms/:id/reactivate` vào docs (code đã có, docs stale) |
| Docs 6.8 VehicleType | Thêm endpoint `POST /api/v1/master-data/vehicle-types/:id/reactivate` vào docs (code đã có, docs stale) |
| Docs 6.11 Customer | Thêm toàn bộ Customer APIs vào docs: next-code, CRUD, deactivate, reactivate |
| Docs 6.12 UomConversion | Thêm toàn bộ UOM Conversion APIs vào docs: CRUD + DELETE |
| Docs 6.13 Lot | Thêm toàn bộ Lot Management APIs vào docs: CRUD, get-or-create, fifo, traceability |
| Folder structure | Cập nhật folder structure thêm `customer.controller.ts`, `uom-conversion.controller.ts`, `dropdown-config.controller.ts`, `lot.controller.ts` |
| Permission Codes | Thêm Customer, UomConversion và Lot vào bảng Permission Codes |

## 12. Changelog — Module Sync (2026-03-22)

| Fix | Mô tả |
|-----|-------|
| Docs 6.14 Carrier | Thêm toàn bộ Carrier APIs: next-code, CRUD, deactivate, reactivate |
| Docs 6.15 Vessel | Thêm toàn bộ Vessel APIs: next-code, CRUD, deactivate, reactivate |
| Docs 6.16 ItemGroup | Thêm toàn bộ Item Group APIs: next-code, CRUD, deactivate, reactivate |
| Docs 6.17 LocationType | Thêm toàn bộ Location Type APIs: next-code, CRUD, DELETE |
| Docs 6.18 OwnerSkuMapping | Thêm toàn bộ Owner SKU Mapping APIs: next-code, CRUD, DELETE |
| Lookup endpoints | Thêm `customers` và `dropdown-options` endpoints |
| Folder structure | Cập nhật folder structure thêm tất cả controllers, services, repositories, DTOs mới |
| Permission Codes | Cập nhật và chuẩn hóa permission codes cho tất cả entities |
| Module capabilities | Cập nhật danh sách năng lực module bao gồm tất cả entities |
