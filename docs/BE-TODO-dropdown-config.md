# Backend TODO: Dropdown Configuration API

## Mô tả
Cho phép admin configure các dropdown list trong Master Data (thêm/bớt/đặt mặc định).

Frontend đã implement xong (mock), cần BE implement API thực.

---

## Trạng thái kiểm tra (2026-03-10)

| Hạng mục | Trạng thái |
|---------|-----------|
| `dropdown_configs` table trong Prisma | ❌ CHƯA CÓ — cần add + migrate |
| DropdownConfigController / Service / Repo | ❌ CHƯA CÓ |
| `GET /lookups/dropdown-options` trong LookupController | ❌ CHƯA CÓ |
| `GET /owners/next-code` (+ vendor, item) | ❌ CHƯA CÓ — xem Section 3 |
| MasterDataModule đã register trong app.module.ts | ✅ ĐÃ CÓ — không bị FA-01 |
| Các CRUD endpoints Owner/Vendor/Item/Warehouse/Zone/Location/UOM/VehicleType | ✅ ĐÃ CÓ |
| InventoryStatus GET list + GET :id + PUT :id | ✅ ĐÃ CÓ (không cần Create/Deactivate) |
| Lookup endpoints (owners/vendors/items/warehouses/zones/locations/uoms/vehicle-types/inventory-statuses) | ✅ ĐÃ CÓ |

**Tóm tắt:** 3 nhóm cần build: (1) dropdown_configs CRUD, (2) lookup/dropdown-options, (3) next-code cho Owner/Vendor/Item.

---

## Section 1: Database Schema

```sql
CREATE TABLE dropdown_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity          VARCHAR(50) NOT NULL,  -- 'owner', 'vendor', 'item', 'warehouse'
    field_name      VARCHAR(50) NOT NULL,  -- 'ownerGroup', 'ownerType', 'supplierGroup', etc.
    value           VARCHAR(50) NOT NULL,  -- 'LOCAL', 'FOREIGN', 'BULK', etc.
    label           VARCHAR(100) NOT NULL, -- 'Nội địa', 'Nước ngoài', etc.
    sort_order      INT DEFAULT 0,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(entity, field_name, value)
);
```

**Prisma model (thêm vào schema.prisma):**
```prisma
model DropdownConfig {
  id        String   @id @default(uuid())
  entity    String   @db.VarChar(50)
  fieldName String   @map("field_name") @db.VarChar(50)
  value     String   @db.VarChar(50)
  label     String   @db.VarChar(100)
  sortOrder Int      @default(0) @map("sort_order")
  isDefault Boolean  @default(false) @map("is_default")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([entity, fieldName, value])
  @@map("dropdown_configs")
}
```

### Seed data

```sql
INSERT INTO dropdown_configs (entity, field_name, value, label, sort_order, is_default) VALUES
-- Owner
('owner', 'ownerGroup', 'LOCAL', 'Nội địa', 1, true),
('owner', 'ownerGroup', 'FOREIGN', 'Nước ngoài', 2, false),
('owner', 'ownerType', 'DOMESTIC', 'Trong nước', 1, true),
('owner', 'ownerType', 'EXPORT', 'Xuất khẩu', 2, false),
('owner', 'ownerType', 'IMPORT', 'Nhập khẩu', 3, false),
-- Vendor
('vendor', 'supplierGroup', 'VESSEL', 'Tàu', 1, true),
('vendor', 'supplierGroup', 'TRUCK', 'Xe tải', 2, false),
('vendor', 'supplierGroup', 'BARGE', 'Sà lan', 3, false),
('vendor', 'supplierGroup', 'OTHER', 'Khác', 4, false),
-- Item
('item', 'cargoForm', 'BULK', 'Hàng rời', 1, true),
('item', 'cargoForm', 'BAGGED', 'Đóng bao', 2, false),
('item', 'cargoForm', 'CONTAINERIZED', 'Container', 3, false),
('item', 'cargoForm', 'LIQUID', 'Lỏng', 4, false),
('item', 'productGroup', 'AGRICULTURAL', 'Nông sản', 1, true),
('item', 'productGroup', 'FERTILIZER', 'Phân bón', 2, false),
('item', 'productGroup', 'CHEMICAL', 'Hóa chất', 3, false),
('item', 'productGroup', 'STEEL', 'Thép', 4, false),
('item', 'productGroup', 'GENERAL', 'Hàng tổng hợp', 5, false),
-- Warehouse
('warehouse', 'warehouseType', 'COVERED', 'Kho có mái che', 1, true),
('warehouse', 'warehouseType', 'OPEN', 'Bãi hở', 2, false),
('warehouse', 'warehouseType', 'COLD', 'Kho lạnh', 3, false),
('warehouse', 'warehouseType', 'HAZMAT', 'Kho hàng nguy hiểm', 4, false),
-- Customer
('customer', 'customerGroup', 'CORPORATE', 'Doanh nghiệp', 1, true),
('customer', 'customerGroup', 'INDIVIDUAL', 'Cá nhân', 2, false),
('customer', 'customerType', 'BUYER', 'Người mua', 1, true),
('customer', 'customerType', 'CONSIGNEE', 'Người nhận hàng', 2, false),
('customer', 'customerType', 'SHIPPER', 'Người gửi hàng', 3, false);
```

---

## Section 2: API Endpoints — Dropdown Config CRUD

> **Correct path format:** `/api/v1/master-data/dropdown-configs/...`
> Controller prefix: `@Controller('master-data/dropdown-configs')` (NestJS global prefix handles `/api/v1`)

### 2.1 GET /api/v1/master-data/dropdown-configs
List dropdown configs với filter.

**FE gọi:** `dropdownConfigApi.getList(params)` → `GET /master-data/dropdown-configs`

**Query params:**
- `entity` (optional): `'owner' | 'vendor' | 'item' | 'warehouse'`
- `fieldName` (optional): string
- `keyword` (optional): search trong value/label
- `page` (default 1), `pageSize` (default 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "entity": "owner",
      "fieldName": "ownerGroup",
      "value": "LOCAL",
      "label": "Nội địa",
      "sortOrder": 1,
      "isDefault": true,
      "isActive": true
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 22 }
}
```

### 2.2 GET /api/v1/master-data/dropdown-configs/entities
Get list entities có thể configure.

> ⚠️ NestJS route ordering: đặt `@Get('entities')` TRƯỚC `@Get(':id')` trong controller để tránh `entities` bị parse như UUID.

**FE gọi:** `dropdownConfigApi.getEntities()` → `GET /master-data/dropdown-configs/entities`

**Response (static — không cần DB query):**
```json
{
  "data": [
    { "value": "owner", "label": "Chủ hàng (Owner)" },
    { "value": "vendor", "label": "Nhà cung cấp (Vendor)" },
    { "value": "item", "label": "Mặt hàng (Item)" },
    { "value": "warehouse", "label": "Kho (Warehouse)" }
  ]
}
```

### 2.3 GET /api/v1/master-data/dropdown-configs/fields?entity=X
Get list fields cho entity.

> ⚠️ Tương tự — đặt `@Get('fields')` TRƯỚC `@Get(':id')`.

**FE gọi:** `dropdownConfigApi.getFieldsByEntity(entity)` → `GET /master-data/dropdown-configs/fields?entity=owner`

**Response (static lookup theo entity — không cần DB):**
```json
{
  "data": [
    { "value": "ownerGroup", "label": "Nhóm chủ hàng" },
    { "value": "ownerType", "label": "Loại chủ hàng" }
  ]
}
```

**Field map per entity:**
```typescript
const ENTITY_FIELDS = {
  owner:     [{ value: 'ownerGroup', label: 'Nhóm chủ hàng' }, { value: 'ownerType', label: 'Loại chủ hàng' }],
  vendor:    [{ value: 'supplierGroup', label: 'Nhóm nhà cung cấp' }],
  item:      [{ value: 'cargoForm', label: 'Dạng hàng' }, { value: 'productGroup', label: 'Nhóm sản phẩm' }],
  warehouse: [{ value: 'warehouseType', label: 'Loại kho' }],
}
```

### 2.4 GET /api/v1/master-data/dropdown-configs/:id

**FE gọi:** `dropdownConfigApi.getById(id)` → `GET /master-data/dropdown-configs/:id`

### 2.5 POST /api/v1/master-data/dropdown-configs
Create new dropdown option.

**FE gọi:** `dropdownConfigApi.create(data)` → `POST /master-data/dropdown-configs`

**Body:**
```json
{
  "entity": "owner",
  "fieldName": "ownerGroup",
  "value": "PARTNER",
  "label": "Đối tác"
}
```

**Validation:**
- `value` unique trong cùng entity + fieldName (Prisma unique constraint sẽ throw)
- Auto set `sortOrder` = MAX(sortOrder where entity+fieldName) + 1
- `value` auto uppercase (hoặc FE đã uppercase trước khi gửi)

**Permission:** `MASTER_DATA.DROPDOWN.CREATE`

### 2.6 PUT /api/v1/master-data/dropdown-configs/:id
Update dropdown option. Chỉ cho phép sửa `label` và `sortOrder`. `entity`, `fieldName`, `value` là immutable.

**FE gọi:** `dropdownConfigApi.update(id, data)` → `PUT /master-data/dropdown-configs/:id`

**Body:**
```json
{
  "label": "Đối tác chiến lược",
  "sortOrder": 3
}
```

**Permission:** `MASTER_DATA.DROPDOWN.UPDATE`

### 2.7 DELETE /api/v1/master-data/dropdown-configs/:id

**FE gọi:** `dropdownConfigApi.delete(id)` → `DELETE /master-data/dropdown-configs/:id`

**Logic:**
- Check xem `value` có đang được dùng không (query owner/vendor/item/warehouse table theo entity+fieldName+value)
- Nếu đang dùng: throw `400 Bad Request` với message rõ
- Nếu không dùng: xóa record

**Permission:** `MASTER_DATA.DROPDOWN.DELETE`

### 2.8 POST /api/v1/master-data/dropdown-configs/:id/set-default

**FE gọi:** `dropdownConfigApi.setDefault(id)` → `POST /master-data/dropdown-configs/:id/set-default`

**Logic (trong 1 transaction):**
1. Lấy record theo `id` → lấy `entity` + `fieldName`
2. `UPDATE dropdown_configs SET is_default = false WHERE entity = ? AND field_name = ?`
3. `UPDATE dropdown_configs SET is_default = true WHERE id = ?`

**Permission:** `MASTER_DATA.DROPDOWN.UPDATE`

---

## Section 3: API Endpoints bổ sung vào controllers hiện có

### 3.1 GET /api/v1/master-data/lookups/dropdown-options
Thêm vào **LookupController** (file: `controllers/lookup.controller.ts`).

**FE gọi:** `lookupApi.getDropdownOptions(entity, fieldName)` → `GET /master-data/lookups/dropdown-options?entity=X&fieldName=Y`

**Dùng bởi:** Các FormDrawer trong Owner/Vendor/Item/Warehouse pages khi render dropdown options.

**Query params:**
- `entity`: required
- `fieldName`: required

**Response (chỉ isActive=true, sorted by sortOrder):**
```json
{
  "data": [
    { "value": "LOCAL", "label": "Nội địa", "isDefault": true },
    { "value": "FOREIGN", "label": "Nước ngoài", "isDefault": false }
  ]
}
```

**Implementation:** Query `dropdown_configs WHERE entity=? AND field_name=? AND is_active=true ORDER BY sort_order ASC`

### 3.2 GET /api/v1/master-data/owners/next-code
Thêm vào **OwnerController** — tương tự cho `VendorController` và `ItemController`.

**FE gọi:** `ownerApi.getNextCode()` → `GET /master-data/owners/next-code`

> ⚠️ **NestJS route ordering:** đặt `@Get('next-code')` TRƯỚC `@Get(':id')` để tránh `next-code` bị parse như UUID và gây lỗi ParseUUIDPipe.

**Response:**
```json
{ "code": "OWN-0042" }
```

**Implementation:** Dùng `NumberSequenceService` (từ FoundationModule — đã exported):
```typescript
@Get('next-code')
@Permission('MASTER_DATA.OWNER.READ')
async getNextCode() {
  const code = await this.numberSequenceService.getNextCode('OWNER');
  return { code };
}
```

**Applies to:** `OwnerController` (prefix `OWN`), `VendorController` (prefix `VND`), `ItemController` (prefix `ITM`)

---

## Section 4: Module Registration

`MasterDataModule` **đã được register** trong `app.module.ts` → không bị FA-01 SYSTEM BLOCKER.

Chỉ cần thêm `DropdownConfigController`, `DropdownConfigService`, `DropdownConfigRepository` vào `master-data.module.ts`:

```typescript
// master-data.module.ts — additions needed
import { DropdownConfigController } from './controllers/dropdown-config.controller';
import { DropdownConfigRepository } from './repositories/dropdown-config.repository';
import { DropdownConfigService } from './services/dropdown-config.service';

@Module({
  controllers: [
    // ... existing controllers
    DropdownConfigController,
  ],
  providers: [
    // ... existing providers
    DropdownConfigRepository,
    DropdownConfigService,
  ],
  exports: [
    // ... existing exports
    DropdownConfigService,
  ],
})
```

Và cần inject `NumberSequenceService` vào `OwnerService`/`VendorService`/`ItemService` (đã available qua `FoundationModule` import).

---

## Section 5: Permissions cần seed

Thêm vào Foundation permission seed:
```
MASTER_DATA.DROPDOWN.READ
MASTER_DATA.DROPDOWN.CREATE
MASTER_DATA.DROPDOWN.UPDATE
MASTER_DATA.DROPDOWN.DELETE
```

Assign cho roles: `ADMIN`, `WH_ADMIN`

---

## Section 6: Thứ tự implement

1. `prisma/schema.prisma` — thêm `DropdownConfig` model → `prisma migrate dev`
2. `prisma/seed.ts` — thêm seed data cho 22 dropdown values
3. `repositories/dropdown-config.repository.ts` — CRUD + set-default logic
4. `services/dropdown-config.service.ts` — business logic + validation
5. `controllers/dropdown-config.controller.ts` — routes (chú ý thứ tự `entities` + `fields` + `next-code` trước `:id`)
6. Update `master-data.module.ts` — thêm mới vào controllers/providers/exports
7. Update `LookupController` — thêm `getDropdownOptions` endpoint
8. Update `OwnerController` / `VendorController` / `ItemController` — thêm `next-code` endpoint
9. Seed permissions `MASTER_DATA.DROPDOWN.*` trong Foundation

---

## Frontend Path
`/app/settings/dropdown-config`

## Notes
- FE đã implement hoàn chỉnh với mock API — khi BE xong chỉ cần tắt mock (`VITE_USE_MOCK_API=false`)
- FE gọi `DELETE /master-data/dropdown-configs/:id` — BE cần handler DELETE (không phải POST deactivate)
- Response format phải nhất quán với các API khác: `{ data, meta }` cho list, `{ data }` cho single
- FE `value` field: FE auto `.toUpperCase()` trước khi gửi — BE không cần uppercase lại nhưng nên validate là uppercase để tránh duplicate `LOCAL` vs `local`
