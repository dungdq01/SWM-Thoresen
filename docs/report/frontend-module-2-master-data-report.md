# Frontend Module 2 — Master Data Management

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Quản lý toàn bộ master data: Owner, Vendor, Item, Warehouse, Zone, Location, UOM, VehicleType, InventoryStatus.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/master-data/owners` | `OwnersPage` | CRUD chủ hàng, deactivate/reactivate |
| `/app/master-data/vendors` | `VendorsPage` | CRUD nhà cung cấp |
| `/app/master-data/items` | `ItemsPage` | CRUD hàng hóa (cargo) |
| `/app/master-data/warehouses` | `WarehousesPage` | CRUD kho |
| `/app/master-data/zones` | `ZonesPage` | CRUD zone trong kho |
| `/app/master-data/locations` | `LocationsPage` | CRUD vị trí lưu kho (có x_coord, y_coord) |
| `/app/master-data/uoms` | `UomsPage` | Đơn vị đo lường |
| `/app/master-data/vehicle-types` | `VehicleTypesPage` | Loại phương tiện cân |
| `/app/master-data/inventory-statuses` | `InventoryStatusesPage` | Trạng thái hàng tồn kho |

**Default redirect:** `/app/master-data` → `/app/master-data/owners`

## 3. Domain Layer

**Thư mục:** `src/domains/master-data/`

| Hook | Mutations |
|------|-----------|
| `useOwners.js` | useOwnerList, useOwnerDetail, useCreateOwner, useUpdateOwner, useDeactivateOwner, useReactivateOwner |
| `useItems.js` | useItemList, useItemDetail, useCreateItem, useUpdateItem, useDeactivateItem, useReactivateItem |
| `useWarehouses.js` | useWarehouseList, useWarehouseDetail, useCreateWarehouse, useUpdateWarehouse, useDeactivateWarehouse |
| `useZones.js` | useZoneList, useCreateZone, useUpdateZone, useDeactivateZone |
| `useLocations.js` | useLocationList, useCreateLocation, useUpdateLocation, useDeactivateLocation |
| `useVendors.js` | useVendorList, useCreateVendor, useUpdateVendor, useDeactivateVendor |
| `useUoms.js` | useUomList, useCreateUom, useUpdateUom, useDeactivateUom |
| `useVehicleTypes.js` | useVehicleTypeList, useCreateVehicleType, useUpdateVehicleType, useDeactivateVehicleType |
| `useInventoryStatuses.js` | useInventoryStatusList, useUpdateInventoryStatus |
| `useLookups.js` | useOwnerLookup, useItemLookup, useWarehouseLookup, useZoneLookup, useLocationLookup, useUomLookup |

**Shared components trong domain:**
- `MasterDataTable.jsx` — Reusable table với sort/filter/pagination
- `FilterBar.jsx` — Filter row (status, search, warehouse...)
- `PageHeader.jsx` — Title + Create button
- `StatusBadge.jsx` — Active/Inactive badge
- `DeactivateModal.jsx` — Confirm modal với reason code input

## 4. Features (Form Drawers)

| Feature | File | Nội dung |
|---------|------|---------|
| Item form | `features/master-data/item/ItemFormDrawer.jsx` | Create/Edit item với schema validation |
| Owner form | `features/master-data/owner/OwnerFormDrawer.jsx` | Create/Edit owner |
| UOM form | `features/master-data/uom/UomFormDrawer.jsx` | Create/Edit unit of measure |
| VehicleType form | `features/master-data/vehicle-type/VehicleTypeFormDrawer.jsx` | Create/Edit vehicle type |
| Vendor form | `features/master-data/vendor/VendorFormDrawer.jsx` | Create/Edit vendor |

Form schemas dùng **Zod** — validate trước khi submit.

## 5. Mock Data

**File:** `src/mocks/masterData.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_owners` | 5 chủ hàng (DPM, Holcim, ...) |
| `swm_mock_vendors` | 3 nhà cung cấp |
| `swm_mock_items` | 10+ mặt hàng (phân bón, xi măng, ...) |
| `swm_mock_warehouses` | 2 kho (TVL-WH1, TVL-WH2) |
| `swm_mock_zones` | 5 zones (RECEIVING, STORAGE, STAGING, SHIPPING, VAS) |
| `swm_mock_locations` | 20+ locations với x_coord, y_coord |
| `swm_mock_uoms` | BAG, TON, MT, KG |
| `swm_mock_vehicle_types` | TRUCK_5T, TRUCK_10T, CONTAINER_20F |
| `swm_mock_inventory_statuses` | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT |

## 6. Backend API Endpoints Wired

```
GET/POST     /api/v1/master-data/owners
PUT          /api/v1/master-data/owners/:id
POST         /api/v1/master-data/owners/:id/deactivate
POST         /api/v1/master-data/owners/:id/reactivate
(tương tự cho vendors, items, warehouses, zones, locations, uoms, vehicle-types)
GET          /api/v1/master-data/inventory-statuses
PUT          /api/v1/master-data/inventory-statuses/:id
GET          /api/v1/master-data/lookups/owners|vendors|items|warehouses|zones|locations|uoms|vehicle-types
```

## 7. Ghi chú

- `LocationsPage` có sẵn x_coord, y_coord trong data model → nền cho Warehouse Visualization (IMP-10)
- `MasterDataTable` là component tái sử dụng cao nhất — dùng chung cho tất cả 9 entity
- `useLookups` hook được các module khác (M4, M5, M6...) dùng để populate dropdown selects
