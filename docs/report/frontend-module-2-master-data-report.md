# Frontend Module 2 — Master Data Management

**Ngày:** 2026-03-10 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Quản lý toàn bộ master data: Owner, Vendor, Customer, Item, Warehouse, Zone, Location, UOM, VehicleType, InventoryStatus. Kèm Lookup API cho các module khác và DropdownConfig API cho Settings.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/master-data/owners` | `OwnersPage` | CRUD chủ hàng, deactivate/reactivate |
| `/app/master-data/vendors` | `VendorsPage` | CRUD nhà cung cấp |
| `/app/master-data/customers` | `CustomersPage` | CRUD khách hàng (người mua/nhận/gửi) — **MỚI** |
| `/app/master-data/items` | `ItemsPage` | CRUD hàng hóa (cargo) |
| `/app/master-data/warehouses` | `WarehousesPage` | CRUD kho |
| `/app/master-data/zones` | `ZonesPage` | CRUD zone trong kho |
| `/app/master-data/locations` | `LocationsPage` | CRUD vị trí lưu kho (có x_coord, y_coord) |
| `/app/master-data/uoms` | `UomsPage` | Đơn vị đo lường |
| `/app/master-data/vehicle-types` | `VehicleTypesPage` | Loại phương tiện cân |
| `/app/master-data/inventory-statuses` | `InventoryStatusesPage` | Trạng thái hàng tồn kho |

**Default redirect:** `/app/master-data` → `/app/master-data/owners`

**Tổng:** 10 entity pages + 1 layout = 11 files trong `src/pages/master-data/`

## 3. Domain Layer

**Thư mục:** `src/domains/master-data/`

| Hook | Mutations |
|------|-----------|
| `useOwners.js` | useOwnerList, useOwnerDetail, useCreateOwner, useUpdateOwner, useDeactivateOwner, useReactivateOwner, useOwnerNextCode |
| `useVendors.js` | useVendorList, useVendorDetail, useCreateVendor, useUpdateVendor, useDeactivateVendor, useReactivateVendor, useVendorNextCode |
| `useCustomers.js` | useCustomerList, useCustomerDetail, useCreateCustomer, useUpdateCustomer, useDeactivateCustomer, useReactivateCustomer, useCustomerNextCode — **MỚI** |
| `useItems.js` | useItemList, useItemDetail, useCreateItem, useUpdateItem, useDeactivateItem, useReactivateItem, useItemNextCode |
| `useWarehouses.js` | useWarehouseList, useWarehouseDetail, useCreateWarehouse, useUpdateWarehouse, useDeactivateWarehouse |
| `useZones.js` | useZoneList, useCreateZone, useUpdateZone, useDeactivateZone |
| `useLocations.js` | useLocationList, useCreateLocation, useUpdateLocation, useDeactivateLocation |
| `useUoms.js` | useUomList, useCreateUom, useUpdateUom, useDeactivateUom, useReactivateUom |
| `useVehicleTypes.js` | useVehicleTypeList, useCreateVehicleType, useUpdateVehicleType, useDeactivateVehicleType, useReactivateVehicleType |
| `useInventoryStatuses.js` | useInventoryStatusList, useUpdateInventoryStatus |
| `useLookups.js` | useOwnerLookup, useItemLookup, useWarehouseLookup, useZoneLookup, useLocationLookup, useUomLookup |
| `useDropdownConfigs.js` | useDropdownConfigList, useDropdownConfigEntities, useDropdownConfigFields, useDropdownOptions, useCreateDropdownConfig, useUpdateDropdownConfig, useDeleteDropdownConfig, useSetDefaultDropdownConfig |

**Shared components trong domain:**
- `MasterDataTable.jsx` / `MasterDataTableWrapper` — Reusable table với sort/filter/pagination
- `FilterBar.jsx` — Filter row (status, search, warehouse...)
- `PageHeader.jsx` — Title + Create button
- `StatusBadge.jsx` — Active/Inactive badge
- `DeactivateModal.jsx` — Confirm modal với reason code input
- `ActionMenu.jsx` — Dropdown action menu
- `ReactivateModal.jsx` — Confirm reactivate modal

## 4. Features (Form Drawers)

**Thư mục:** `src/features/master-data/`

| Feature | Nội dung |
|---------|---------|
| `customer/` | `CustomerFormDrawer.jsx` + `customerForm.schema.js` — CORPORATE/INDIVIDUAL, BUYER/CONSIGNEE/SHIPPER — **MỚI** |
| `item/` | `ItemFormDrawer.jsx` + `itemForm.schema.js` |
| `location/` | `LocationFormDrawer.jsx` + `locationForm.schema.js` — x_coord, y_coord, area_m2 |
| `owner/` | `OwnerFormDrawer.jsx` + `ownerForm.schema.js` |
| `uom/` | `UomFormDrawer.jsx` + `uomForm.schema.js` |
| `vehicle-type/` | `VehicleTypeFormDrawer.jsx` + `vehicleTypeForm.schema.js` |
| `vendor/` | `VendorFormDrawer.jsx` + `vendorForm.schema.js` |
| `warehouse/` | `WarehouseFormDrawer.jsx` + `warehouseForm.schema.js` |
| `zone/` | `ZoneFormDrawer.jsx` + `zoneForm.schema.js` |

Form schemas dùng **Zod** — validate trước khi submit. Tổng 9 form drawers.

## 5. Customer Entity — Chi tiết

**Customer** phân biệt với Vendor:
- Vendor = nhà cung cấp đầu vào (nhập hàng)
- Customer = khách hàng đầu ra (xuất hàng) — dùng trong `SalesOrdersPage` (M5) qua `customerId`

| Field | Giá trị |
|-------|---------|
| `customerGroup` | `CORPORATE` (Doanh nghiệp) / `INDIVIDUAL` (Cá nhân) |
| `customerType` | `BUYER` (Người mua) / `CONSIGNEE` (Người nhận) / `SHIPPER` (Người gửi) |

**⚠️ BE chưa có** `CustomerController` / `CustomerService` — cần implement tương tự Owner/Vendor.

## 6. Mock Data

**File:** `src/mocks/masterData.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_owners` | 5 chủ hàng (DPM, Holcim, ...) |
| `swm_mock_vendors` | 3 nhà cung cấp |
| `swm_mock_customers` | Khách hàng (BUYER/CONSIGNEE) |
| `swm_mock_items` | 10+ mặt hàng (phân bón, xi măng, ...) |
| `swm_mock_warehouses` | 2 kho (TVL-WH1, TVL-WH2) |
| `swm_mock_zones` | 5 zones (RECEIVING, STORAGE, STAGING, SHIPPING, VAS) |
| `swm_mock_locations` | 20+ locations với x_coord, y_coord |
| `swm_mock_uoms` | BAG, TON, MT, KG |
| `swm_mock_vehicle_types` | TRUCK_5T, TRUCK_10T, CONTAINER_20F |
| `swm_mock_inventory_statuses` | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT |
| `swm_mock_dropdown_configs` | 22 values mặc định cho owner/vendor/item/warehouse fields |

## 7. Backend API Endpoints Wired

```
GET/POST     /api/v1/master-data/owners
GET          /api/v1/master-data/owners/next-code    ← BE chưa có
GET/PUT      /api/v1/master-data/owners/:id
POST         /api/v1/master-data/owners/:id/deactivate
POST         /api/v1/master-data/owners/:id/reactivate
(tương tự vendors, items, warehouses, zones, locations, uoms, vehicle-types)

GET/POST     /api/v1/master-data/customers           ← BE chưa có
GET          /api/v1/master-data/customers/next-code ← BE chưa có
GET/PUT      /api/v1/master-data/customers/:id
POST         /api/v1/master-data/customers/:id/deactivate
POST         /api/v1/master-data/customers/:id/reactivate

GET          /api/v1/master-data/inventory-statuses
PUT          /api/v1/master-data/inventory-statuses/:id

GET          /api/v1/master-data/lookups/owners|vendors|items|warehouses|zones|locations|uoms|vehicle-types|inventory-statuses
GET          /api/v1/master-data/lookups/dropdown-options   ← BE chưa có

(DropdownConfig — BE chưa có, hiện dùng mock — xem docs/BE-TODO-dropdown-config.md)
GET/POST     /api/v1/master-data/dropdown-configs
PUT/DELETE   /api/v1/master-data/dropdown-configs/:id
POST         /api/v1/master-data/dropdown-configs/:id/set-default
GET          /api/v1/master-data/dropdown-configs/entities
GET          /api/v1/master-data/dropdown-configs/fields
```

## 8. Ghi chú

- `LocationsPage` có sẵn x_coord, y_coord → nền cho Warehouse Visualization (IMP-10)
- `MasterDataTableWrapper` dùng chung cho tất cả 10 entity
- `useLookups` được các module khác (M4, M5, M6...) dùng để populate dropdowns
- **BE gap tổng hợp:** Customer CRUD + next-code, DropdownConfig CRUD + lookup/dropdown-options, next-code cho owner/vendor/item. Chi tiết: `docs/BE-TODO-dropdown-config.md`
- `SalesOrdersPage` (M5) dùng `customerId` + `customerName` → phụ thuộc Customer entity
