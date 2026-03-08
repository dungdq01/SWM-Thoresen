# Module 2 - Master Data FE Report

## 1. Mục tiêu frontend

Frontend Module 2 cung cấp giao diện quản trị dữ liệu nền cho các dimension vận hành kho và inventory:
- owner
- vendor
- item
- warehouse
- zone
- location
- uom
- vehicle type
- inventory status

Module này là nền tảng để Module 3 và các module downstream dùng lookup, dimension validation và semantic inventory master.

---

## 2. Những gì đã làm

### 2.1 Routing và layout
- Đã gắn `MasterDataLayout` đúng vào route `/app/master-data/*`
- Đã có tab navigation nội bộ cho toàn bộ nhóm master data

### 2.2 Pages hiện có
- `OwnersPage`
- `VendorsPage`
- `ItemsPage`
- `WarehousesPage`
- `ZonesPage`
- `LocationsPage`
- `UomsPage`
- `VehicleTypesPage`
- `InventoryStatusesPage`

### 2.3 Data layer
- Đã có `domains/master-data/api/masterData.api.js`
- Đã có hooks React Query cho CRUD và lookup
- Đã nối mock mode bằng `masterDataMockApi`

### 2.4 Feature forms
#### Hoàn chỉnh hoặc đã có drawer/form
- Owner
- Vendor
- Item
- Warehouse
- UOM
- Vehicle Type

#### Mới chỉ ở mức list/filter hoặc chưa hoàn chỉnh full form flow
- Zone
- Location
- Inventory Status edit flow

---

## 3. Mock-data đã tạo

### 3.1 Datasets mock
- owners
- vendors
- uoms
- items
- warehouses
- zones
- locations
- vehicle types
- inventory statuses
- lookup datasets cho dropdown

### 3.2 API mock đã hỗ trợ
- list / detail / create / update / deactivate / reactivate cho hầu hết entity chính
- lookup APIs cho owner, vendor, item, warehouse, zone, location, uom, vehicle type, inventory status
- inventory status update mock

### 3.3 Nguồn tham chiếu
Mock được suy ra từ:
- `backend/docs/module-2-master-data.md`
- `docs/spec/module_2_master_data_management_spec.md`
- `docs/report/module-2-master-data-report.md`
- `docs/stack/Module_2_techstack.md`

---

## 4. Mapping theo entity

| Entity | List | Create/Edit | Deactivate/Reactivate | Mock data |
|---|---|---|---|---|
| Owner | Có | Có | Có | Có |
| Vendor | Có | Có | Có | Có |
| Item | Có | Có | Có | Có |
| Warehouse | Có | Có | Có | Có |
| Zone | Có | Chưa hoàn chỉnh | Có hook | Có |
| Location | Có | Chưa hoàn chỉnh | Có hook | Có |
| UOM | Có | Có | Có | Có |
| Vehicle Type | Có | Có | Có | Có |
| Inventory Status | Có | Chưa hoàn chỉnh | Không áp dụng theo phase 1 | Có |

---

## 5. File frontend liên quan

### 5.1 Mock layer
- `src/mocks/masterData.mock.js`
- `src/mocks/utils.js`

### 5.2 API client đã nối mock
- `src/domains/master-data/api/masterData.api.js`

### 5.3 Form features mới bổ sung
- `src/features/master-data/uom/UomFormDrawer.jsx`
- `src/features/master-data/uom/uomForm.schema.js`
- `src/features/master-data/vehicle-type/VehicleTypeFormDrawer.jsx`
- `src/features/master-data/vehicle-type/vehicleTypeForm.schema.js`

### 5.4 Pages đã được nâng cấp thêm
- `src/pages/master-data/UomsPage.jsx`
- `src/pages/master-data/VehicleTypesPage.jsx`

---

## 6. Lưu ý vận hành mock

Bật mock mode bằng biến môi trường:

```env
VITE_USE_MOCK_API=true
```

Khi bật mock:
- các page Module 2 sẽ dùng mock API thay cho backend thật
- lookup dropdown vẫn hoạt động theo dữ liệu mock
- create/update/deactivate sẽ mutate trên mock store in-memory

---

## 7. Điểm còn mở

- `ZonesPage` và `LocationsPage` chưa được nâng lên full CRUD form flow
- `InventoryStatusesPage` chưa có edit drawer để cập nhật description/display order
- Chưa verify toàn bộ UI với response backend thật sau khi integration
- Một số page cũ vẫn cần rà thêm contract prop/variant để tránh lỗi runtime nhỏ

---

## 8. Kết luận

Frontend Module 2 hiện đã có mock-data bao phủ gần đầy đủ các entity nền tảng và đã đủ để demo các luồng quản trị chính. Phần Owner, Vendor, Item, Warehouse, UOM và Vehicle Type đã có mức hoàn thiện cao hơn; Zone, Location và Inventory Status vẫn còn một phần cần hoàn thiện tiếp để đạt full-flow theo spec.
