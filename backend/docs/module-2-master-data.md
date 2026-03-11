# Module 2 - Master Data Management

## 1. Module này để làm gì?
`master-data` là module quản lý dữ liệu nền tảng cho toàn bộ hoạt động kho.

Module này cung cấp các năng lực:
- Quản lý Owner (chủ hàng)
- Quản lý Vendor (nhà cung cấp / tàu)
- Quản lý Item (mặt hàng)
- Quản lý Warehouse (kho)
- Quản lý Zone (vùng trong kho)
- Quản lý Location (vị trí trong zone)
- Quản lý UOM (đơn vị tính) và quy đổi
- Quản lý Vehicle Type (loại phương tiện)
- Quản lý Inventory Status (trạng thái tồn kho)
- Cung cấp Lookup endpoints cho dropdown UI

## 2. Folder code chính của module
```text
backend/src/modules/master-data/
├── controllers/
│   ├── owner.controller.ts
│   ├── vendor.controller.ts
│   ├── item.controller.ts
│   ├── warehouse.controller.ts
│   ├── zone.controller.ts
│   ├── location.controller.ts
│   ├── uom.controller.ts
│   ├── uom-conversion.controller.ts
│   ├── vehicle-type.controller.ts
│   ├── inventory-status.controller.ts
│   ├── customer.controller.ts
│   ├── dropdown-config.controller.ts
│   └── lookup.controller.ts
├── dto/
│   ├── common.dto.ts
│   ├── owner.dto.ts
│   ├── vendor.dto.ts
│   ├── item.dto.ts
│   ├── warehouse.dto.ts
│   ├── zone.dto.ts
│   ├── location.dto.ts
│   ├── uom.dto.ts
│   ├── vehicle-type.dto.ts
│   └── inventory-status.dto.ts
├── repositories/
│   ├── owner.repository.ts
│   ├── vendor.repository.ts
│   ├── item.repository.ts
│   ├── warehouse.repository.ts
│   ├── zone.repository.ts
│   ├── location.repository.ts
│   ├── uom.repository.ts
│   ├── vehicle-type.repository.ts
│   └── inventory-status.repository.ts
├── services/
│   ├── owner.service.ts
│   ├── vendor.service.ts
│   ├── item.service.ts
│   ├── warehouse.service.ts
│   ├── zone.service.ts
│   ├── location.service.ts
│   ├── uom.service.ts
│   ├── vehicle-type.service.ts
│   ├── inventory-status.service.ts
│   └── lookup.service.ts
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
| Owner | MASTER_DATA.OWNER.CREATE | MASTER_DATA.OWNER.READ | MASTER_DATA.OWNER.UPDATE | MASTER_DATA.OWNER.DEACTIVATE | MASTER_DATA.OWNER.REACTIVATE |
| Item | MASTER_DATA.ITEM.CREATE | MASTER_DATA.ITEM.READ | MASTER_DATA.ITEM.UPDATE | MASTER_DATA.ITEM.DEACTIVATE | MASTER_DATA.ITEM.REACTIVATE |
| Warehouse | MASTER_DATA.WAREHOUSE.CREATE | MASTER_DATA.WAREHOUSE.READ | MASTER_DATA.WAREHOUSE.UPDATE | MASTER_DATA.WAREHOUSE.DEACTIVATE | MASTER_DATA.WAREHOUSE.REACTIVATE |
| Zone | MASTER_DATA.ZONE.CREATE | MASTER_DATA.ZONE.READ | MASTER_DATA.ZONE.UPDATE | MASTER_DATA.ZONE.DEACTIVATE | MASTER_DATA.ZONE.REACTIVATE |
| Location | MASTER_DATA.LOCATION.CREATE | MASTER_DATA.LOCATION.READ | MASTER_DATA.LOCATION.UPDATE | MASTER_DATA.LOCATION.DEACTIVATE | MASTER_DATA.LOCATION.REACTIVATE |
| UOM | MASTER_DATA.UOM.CREATE | MASTER_DATA.UOM.READ | MASTER_DATA.UOM.UPDATE | MASTER_DATA.UOM.DEACTIVATE | MASTER_DATA.UOM.REACTIVATE |
| VehicleType | MASTER_DATA.VEHICLE_TYPE.CREATE | MASTER_DATA.VEHICLE_TYPE.READ | MASTER_DATA.VEHICLE_TYPE.UPDATE | MASTER_DATA.VEHICLE_TYPE.DEACTIVATE | MASTER_DATA.VEHICLE_TYPE.REACTIVATE |
| Vendor | MASTER_DATA.VENDOR.CREATE | MASTER_DATA.VENDOR.READ | MASTER_DATA.VENDOR.UPDATE | MASTER_DATA.VENDOR.DEACTIVATE | MASTER_DATA.VENDOR.REACTIVATE |
| Customer | master_data.customer.create | master_data.customer.view | master_data.customer.update | master_data.customer.deactivate | master_data.customer.reactivate |
| UomConversion | master_data.uom.create | master_data.uom.view | master_data.uom.update | - | - |
| InventoryStatus | - | MASTER_DATA.INVENTORY_STATUS.READ | MASTER_DATA.INVENTORY_STATUS.UPDATE | - | - |
| Lookup | - | MASTER_DATA.LOOKUP.READ | - | - | - |

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

## 11. Changelog — FE-BE Alignment Fixes (2026-03-11)

| Fix | Mô tả |
|-----|-------|
| Docs 6.7 UOM | Thêm endpoint `POST /api/v1/master-data/uoms/:id/reactivate` vào docs (code đã có, docs stale) |
| Docs 6.8 VehicleType | Thêm endpoint `POST /api/v1/master-data/vehicle-types/:id/reactivate` vào docs (code đã có, docs stale) |
| Docs 6.11 Customer | Thêm toàn bộ Customer APIs vào docs: next-code, CRUD, deactivate, reactivate |
| Docs 6.12 UomConversion | Thêm toàn bộ UOM Conversion APIs vào docs: CRUD + DELETE |
| Folder structure | Cập nhật folder structure thêm `customer.controller.ts`, `uom-conversion.controller.ts`, `dropdown-config.controller.ts` |
| Permission Codes | Thêm Customer và UomConversion vào bảng Permission Codes |
