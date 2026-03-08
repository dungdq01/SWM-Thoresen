# Module 2 - Master Data Management (Frontend)

## 1. Tổng quan

Module Master Data quản lý các dữ liệu nền tảng cho hệ thống kho, bao gồm:
- **Owner** - Chủ hàng
- **Vendor** - Nhà cung cấp / Tàu
- **Item** - Mặt hàng
- **Warehouse** - Kho
- **Zone** - Vùng trong kho
- **Location** - Vị trí lưu trữ
- **UOM** - Đơn vị tính
- **Vehicle Type** - Loại phương tiện
- **Inventory Status** - Trạng thái tồn kho

---

## 2. Cấu trúc thư mục

```
frontend/src/
├── domains/master-data/
│   ├── api/
│   │   └── masterData.api.js          # API calls cho tất cả entities
│   ├── hooks/
│   │   ├── useOwners.js               # CRUD hooks cho Owner
│   │   ├── useVendors.js              # CRUD hooks cho Vendor
│   │   ├── useItems.js                # CRUD hooks cho Item
│   │   ├── useWarehouses.js           # CRUD hooks cho Warehouse
│   │   ├── useZones.js                # CRUD hooks cho Zone
│   │   ├── useLocations.js            # CRUD hooks cho Location
│   │   ├── useUoms.js                 # CRUD hooks cho UOM
│   │   ├── useVehicleTypes.js         # CRUD hooks cho Vehicle Type
│   │   ├── useInventoryStatuses.js    # Hooks cho Inventory Status
│   │   ├── useLookups.js              # Hooks cho dropdown data
│   │   └── index.js
│   ├── model/
│   │   └── constants.js               # Enums, query keys, options
│   ├── components/
│   │   ├── StatusBadge.jsx            # Các badge hiển thị trạng thái
│   │   ├── MasterDataTable.jsx        # Table wrapper và Action menu
│   │   ├── PageHeader.jsx             # Header chung cho các trang
│   │   ├── FilterBar.jsx              # Thanh lọc và tìm kiếm
│   │   ├── DeactivateModal.jsx        # Modal xác nhận ngừng hoạt động
│   │   └── index.js
│   └── index.js
│
├── features/master-data/
│   ├── owner/
│   │   ├── OwnerFormDrawer.jsx        # Drawer tạo/sửa Owner
│   │   ├── ownerForm.schema.js        # Validation schema
│   │   └── index.js
│   ├── vendor/
│   │   ├── VendorFormDrawer.jsx       # Drawer tạo/sửa Vendor
│   │   ├── vendorForm.schema.js
│   │   └── index.js
│   ├── item/
│   │   ├── ItemFormDrawer.jsx         # Drawer tạo/sửa Item
│   │   ├── itemForm.schema.js
│   │   └── index.js
│   ├── warehouse/
│   │   ├── WarehouseFormDrawer.jsx    # Drawer tạo/sửa Warehouse
│   │   ├── warehouseForm.schema.js
│   │   └── index.js
│   └── index.js
│
└── pages/master-data/
    ├── MasterDataLayout.jsx           # Layout với tab navigation
    ├── OwnersPage.jsx                 # Trang danh sách Owner
    ├── VendorsPage.jsx                # Trang danh sách Vendor
    ├── ItemsPage.jsx                  # Trang danh sách Item
    ├── WarehousesPage.jsx             # Trang danh sách Warehouse
    ├── ZonesPage.jsx                  # Trang danh sách Zone
    ├── LocationsPage.jsx              # Trang danh sách Location
    ├── UomsPage.jsx                   # Trang danh sách UOM
    ├── VehicleTypesPage.jsx           # Trang danh sách Vehicle Type
    ├── InventoryStatusesPage.jsx      # Trang danh sách Inventory Status
    └── index.js
```

---

## 3. Routing

| Route | Page | Mô tả |
|-------|------|-------|
| `/master-data/owners` | OwnersPage | Quản lý chủ hàng |
| `/master-data/vendors` | VendorsPage | Quản lý nhà cung cấp |
| `/master-data/items` | ItemsPage | Quản lý mặt hàng |
| `/master-data/warehouses` | WarehousesPage | Quản lý kho |
| `/master-data/zones` | ZonesPage | Quản lý zone |
| `/master-data/locations` | LocationsPage | Quản lý vị trí |
| `/master-data/uoms` | UomsPage | Quản lý đơn vị tính |
| `/master-data/vehicle-types` | VehicleTypesPage | Quản lý loại phương tiện |
| `/master-data/inventory-statuses` | InventoryStatusesPage | Xem trạng thái tồn kho |

---

## 4. Chi tiết từng trang

### 4.1 Trang Quản lý Chủ hàng (OwnersPage)

**Mô tả:** Hiển thị danh sách chủ hàng, cho phép thêm mới, chỉnh sửa, ngừng hoạt động và kích hoạt lại.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Thêm chủ hàng" + Nút "Làm mới"
- **FilterBar**: Tìm kiếm theo keyword + Bộ lọc (Trạng thái, Nhóm, Loại)
- **Table**: Hiển thị danh sách với các cột:
  - Mã chủ hàng
  - Tên chủ hàng
  - Nhóm
  - Mã số thuế
  - Trạng thái
  - Actions (menu 3 chấm)
- **Pagination**: Phân trang

**Các Button và chức năng:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| Thêm chủ hàng | PageHeader | Mở drawer tạo mới | POST `/api/v1/master-data/owners` |
| Làm mới | PageHeader | Reload danh sách | GET `/api/v1/master-data/owners` |
| Bộ lọc | FilterBar | Toggle hiển thị bộ lọc | - |
| Xóa lọc | FilterBar | Reset tất cả filter | - |
| Chỉnh sửa | ActionMenu | Mở drawer chỉnh sửa | PUT `/api/v1/master-data/owners/:id` |
| Ngừng hoạt động | ActionMenu | Mở modal xác nhận | POST `/api/v1/master-data/owners/:id/deactivate` |
| Kích hoạt lại | ActionMenu | Mở modal xác nhận | POST `/api/v1/master-data/owners/:id/reactivate` |

**Form tạo/sửa chủ hàng (OwnerFormDrawer):**

| Field | Label | Bắt buộc | Validation |
|-------|-------|----------|------------|
| ownerCode | Mã chủ hàng | ✓ | Max 20 ký tự, chỉ chữ in hoa, số, -, _ |
| ownerName | Tên chủ hàng | ✓ | Max 200 ký tự |
| shortName | Tên viết tắt | | Max 50 ký tự |
| ownerGroup | Nhóm chủ hàng | ✓ | LOCAL / FOREIGN |
| ownerType | Loại chủ hàng | ✓ | DOMESTIC / EXPORT / IMPORT |
| taxCode | Mã số thuế | | Max 20 ký tự |
| address | Địa chỉ | | Max 500 ký tự |
| billingEmail | Email thanh toán | | Email hợp lệ |
| billingContact | Người liên hệ | | Max 100 ký tự |
| paymentTerms | Điều khoản thanh toán | | Max 50 ký tự |

---

### 4.2 Trang Quản lý Nhà cung cấp (VendorsPage)

**Mô tả:** Quản lý nhà cung cấp và tàu vận chuyển.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Thêm nhà cung cấp" + Nút "Làm mới"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Nhóm)
- **Table**: Mã NCC, Tên, Nhóm, Liên hệ, Trạng thái, Actions
- **Pagination**

**Các Button và chức năng:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| Thêm nhà cung cấp | PageHeader | Mở drawer tạo mới | POST `/api/v1/master-data/vendors` |
| Làm mới | PageHeader | Reload danh sách | GET `/api/v1/master-data/vendors` |
| Chỉnh sửa | ActionMenu | Mở drawer chỉnh sửa | PUT `/api/v1/master-data/vendors/:id` |
| Ngừng hoạt động | ActionMenu | Mở modal xác nhận | POST `/api/v1/master-data/vendors/:id/deactivate` |
| Kích hoạt lại | ActionMenu | Mở modal xác nhận | POST `/api/v1/master-data/vendors/:id/reactivate` |

**Form tạo/sửa nhà cung cấp (VendorFormDrawer):**

| Field | Label | Bắt buộc | Validation |
|-------|-------|----------|------------|
| vendorCode | Mã nhà cung cấp | ✓ | Max 20 ký tự |
| vendorName | Tên nhà cung cấp | ✓ | Max 200 ký tự |
| supplierGroup | Nhóm | ✓ | VESSEL / TRUCK / BARGE / OTHER |
| countryRegion | Quốc gia/Vùng | | Max 10 ký tự |
| vesselName | Tên tàu | | Max 100 ký tự (hiện khi nhóm là VESSEL) |
| contactName | Người liên hệ | | Max 100 ký tự |
| phone | Số điện thoại | | Max 20 ký tự |
| email | Email | | Email hợp lệ |

---

### 4.3 Trang Quản lý Mặt hàng (ItemsPage)

**Mô tả:** Quản lý danh mục mặt hàng trong kho.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Thêm mặt hàng"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Dạng hàng, Nhóm SP)
- **Table**: Mã, Tên, Dạng hàng, Trọng lượng chuẩn, Trạng thái, Actions
- **Pagination**

**Các Button và chức năng:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| Thêm mặt hàng | PageHeader | Mở drawer tạo mới | POST `/api/v1/master-data/items` |
| Chỉnh sửa | ActionMenu | Mở drawer chỉnh sửa | PUT `/api/v1/master-data/items/:id` |
| Ngừng hoạt động | ActionMenu | Soft delete | POST `/api/v1/master-data/items/:id/deactivate` |
| Kích hoạt lại | ActionMenu | Reactivate | POST `/api/v1/master-data/items/:id/reactivate` |

**Form tạo/sửa mặt hàng (ItemFormDrawer):**

| Field | Label | Bắt buộc | Validation |
|-------|-------|----------|------------|
| itemCode | Mã mặt hàng | ✓ | Max 30 ký tự |
| itemName | Tên mặt hàng | ✓ | Max 200 ký tự |
| itemNameEn | Tên tiếng Anh | | Max 200 ký tự |
| cargoForm | Dạng hàng | ✓ | BULK / BAGGED / CONTAINERIZED / LIQUID |
| productGroup | Nhóm sản phẩm | ✓ | AGRICULTURAL / FERTILIZER / CHEMICAL / STEEL / GENERAL |
| baseUomId | Đơn vị tính cơ bản | ✓ | UUID từ lookup UOM |
| stdNetWeight | Trọng lượng tịnh chuẩn | | Số dương |
| stdGrossWeight | Trọng lượng tổng chuẩn | | Số dương |
| tolerancePctInbound | Dung sai nhập | | 0-100% |
| tolerancePctOutbound | Dung sai xuất | | 0-100% |

---

### 4.4 Trang Quản lý Kho (WarehousesPage)

**Mô tả:** Quản lý thông tin các kho.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Thêm kho"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Loại kho)
- **Table**: Mã kho, Tên kho, Loại, Sức chứa, Trạng thái, Actions
- **Pagination**

**Các Button và chức năng:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| Thêm kho | PageHeader | Mở drawer tạo mới | POST `/api/v1/master-data/warehouses` |
| Chỉnh sửa | ActionMenu | Mở drawer chỉnh sửa | PUT `/api/v1/master-data/warehouses/:id` |
| Ngừng hoạt động | ActionMenu | Soft delete | POST `/api/v1/master-data/warehouses/:id/deactivate` |
| Kích hoạt lại | ActionMenu | Reactivate | POST `/api/v1/master-data/warehouses/:id/reactivate` |

**Form tạo/sửa kho (WarehouseFormDrawer):**

| Field | Label | Bắt buộc | Validation |
|-------|-------|----------|------------|
| warehouseCode | Mã kho | ✓ | Max 20 ký tự |
| warehouseName | Tên kho | ✓ | Max 200 ký tự |
| warehouseType | Loại kho | ✓ | COVERED / OPEN / COLD / HAZMAT |
| address | Địa chỉ | | Max 500 ký tự |
| totalAreaM2 | Diện tích tổng (m²) | | Số dương |
| usableAreaM2 | Diện tích sử dụng (m²) | | Số dương |
| maxHeightM | Chiều cao tối đa (m) | | Số dương |
| maxCapacityMt | Sức chứa tối đa (MT) | | Số dương |
| hasWeighbridge | Có trạm cân | | Boolean |
| weighbridgeCount | Số lượng cân | | Số nguyên >= 0 |
| capacityWarningPct | Ngưỡng cảnh báo (%) | | 0-100% |

---

### 4.5 Trang Quản lý Zone (ZonesPage)

**Mô tả:** Quản lý các zone trong kho. Chỉ xem và lọc, không có form tạo mới trên UI (tạo qua seed/admin).

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Làm mới"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Kho, Loại zone)
- **Table**: Mã Zone, Tên Zone, Kho, Loại, Sức chứa, Trạng thái
- **Pagination**

**API sử dụng:**
- GET `/api/v1/master-data/zones` - Lấy danh sách
- GET `/api/v1/master-data/lookups/warehouses` - Dropdown kho

---

### 4.6 Trang Quản lý Vị trí (LocationsPage)

**Mô tả:** Quản lý các vị trí lưu trữ trong zone. Cascade filter theo Kho → Zone.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Làm mới"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Kho, Zone, Loại vị trí)
- **Table**: Mã vị trí, Kho/Zone, Loại, Diện tích, Sức chứa, Trạng thái vị trí, Hoạt động
- **Pagination**

**API sử dụng:**
- GET `/api/v1/master-data/locations` - Lấy danh sách
- GET `/api/v1/master-data/lookups/warehouses` - Dropdown kho
- GET `/api/v1/master-data/lookups/zones?warehouseId=` - Dropdown zone

---

### 4.7 Trang Quản lý Đơn vị tính (UomsPage)

**Mô tả:** Xem danh sách đơn vị tính.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Làm mới"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Loại đơn vị)
- **Table**: Mã, Mô tả, Loại, Đơn vị cơ sở, Trạng thái
- **Pagination**

**API sử dụng:**
- GET `/api/v1/master-data/uoms` - Lấy danh sách

---

### 4.8 Trang Quản lý Loại phương tiện (VehicleTypesPage)

**Mô tả:** Xem danh sách loại phương tiện vận chuyển.

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Làm mới"
- **FilterBar**: Tìm kiếm + Bộ lọc (Trạng thái, Loại)
- **Table**: Mã, Tên, Phân loại, Tải trọng tối đa, Tare Weight, Trạng thái
- **Pagination**

**API sử dụng:**
- GET `/api/v1/master-data/vehicle-types` - Lấy danh sách

---

### 4.9 Trang Trạng thái tồn kho (InventoryStatusesPage)

**Mô tả:** Xem danh sách trạng thái tồn kho (dữ liệu hệ thống, không thể tạo mới).

**Các thành phần UI:**
- **PageHeader**: Tiêu đề + Nút "Làm mới"
- **FilterBar**: Chỉ tìm kiếm
- **Info Banner**: Thông báo không thể tạo mới
- **Table**: Mã, Mô tả, Có thể phân bổ, Khóa hệ thống, Badge
- **Pagination**

**API sử dụng:**
- GET `/api/v1/master-data/inventory-statuses` - Lấy danh sách

---

## 5. Hướng dẫn sử dụng

### 5.1 Thêm mới dữ liệu

1. Truy cập trang danh sách tương ứng (VD: `/master-data/owners`)
2. Click nút **"Thêm [tên entity]"** ở góc phải
3. Drawer form sẽ mở ra từ bên phải màn hình
4. Nhập thông tin theo các field bắt buộc (có dấu *)
5. Click **"Tạo mới"** để lưu

### 5.2 Chỉnh sửa dữ liệu

1. Tìm record cần sửa trong bảng
2. Click icon **⋮** (3 chấm) ở cột cuối
3. Chọn **"Chỉnh sửa"**
4. Sửa thông tin cần thiết
5. Click **"Cập nhật"**

**Lưu ý:** Hệ thống sử dụng **optimistic locking** với `rowVersion`. Nếu có người khác đang sửa cùng record, bạn sẽ nhận thông báo lỗi và cần tải lại trang.

### 5.3 Ngừng hoạt động (Soft Delete)

1. Click icon **⋮** → **"Ngừng hoạt động"**
2. Modal xác nhận hiện ra
3. Nhập lý do (không bắt buộc)
4. Click **"Xác nhận ngừng"**

**Lưu ý:** Dữ liệu ngừng hoạt động vẫn tồn tại trong hệ thống và có thể kích hoạt lại.

### 5.4 Kích hoạt lại

1. Lọc theo trạng thái **"Ngừng hoạt động"** để tìm record
2. Click icon **⋮** → **"Kích hoạt lại"**
3. Xác nhận trong modal

### 5.5 Tìm kiếm và lọc

- **Tìm kiếm**: Nhập từ khóa vào ô tìm kiếm, hệ thống sẽ tìm theo mã và tên
- **Bộ lọc**: Click **"Bộ lọc"** để hiện các dropdown filter
- **Xóa lọc**: Click **"Xóa lọc"** để reset tất cả filter về mặc định

---

## 6. API Mapping tổng hợp

| Trang | GET List | GET Detail | POST Create | PUT Update | Deactivate | Reactivate |
|-------|----------|------------|-------------|------------|------------|------------|
| Owners | `/owners` | `/owners/:id` | `/owners` | `/owners/:id` | `/owners/:id/deactivate` | `/owners/:id/reactivate` |
| Vendors | `/vendors` | `/vendors/:id` | `/vendors` | `/vendors/:id` | `/vendors/:id/deactivate` | `/vendors/:id/reactivate` |
| Items | `/items` | `/items/:id` | `/items` | `/items/:id` | `/items/:id/deactivate` | `/items/:id/reactivate` |
| Warehouses | `/warehouses` | `/warehouses/:id` | `/warehouses` | `/warehouses/:id` | `/warehouses/:id/deactivate` | `/warehouses/:id/reactivate` |
| Zones | `/zones` | `/zones/:id` | `/zones` | `/zones/:id` | `/zones/:id/deactivate` | `/zones/:id/reactivate` |
| Locations | `/locations` | `/locations/:id` | `/locations` | `/locations/:id` | `/locations/:id/deactivate` | `/locations/:id/reactivate` |
| UOMs | `/uoms` | `/uoms/:id` | `/uoms` | `/uoms/:id` | `/uoms/:id/deactivate` | - |
| Vehicle Types | `/vehicle-types` | `/vehicle-types/:id` | `/vehicle-types` | `/vehicle-types/:id` | `/vehicle-types/:id/deactivate` | - |
| Inv. Statuses | `/inventory-statuses` | `/inventory-statuses/:id` | - | `/inventory-statuses/:id` | - | - |

**Base URL:** `/api/v1/master-data`

---

## 7. Lookup APIs cho Dropdown

| Endpoint | Mô tả | Params |
|----------|-------|--------|
| `/lookups/owners` | Dropdown chủ hàng | - |
| `/lookups/vendors` | Dropdown nhà cung cấp | - |
| `/lookups/items` | Dropdown mặt hàng | - |
| `/lookups/warehouses` | Dropdown kho | - |
| `/lookups/zones` | Dropdown zone | `warehouseId` (optional) |
| `/lookups/locations` | Dropdown vị trí | `warehouseId`, `zoneId` (optional) |
| `/lookups/uoms` | Dropdown đơn vị tính | - |
| `/lookups/vehicle-types` | Dropdown loại phương tiện | - |
| `/lookups/inventory-statuses` | Dropdown trạng thái | - |

---

## 8. Components tái sử dụng

### 8.1 StatusBadge
Hiển thị trạng thái Hoạt động / Ngừng hoạt động với màu tương ứng.

### 8.2 OwnerGroupBadge, CargoFormBadge, WarehouseTypeBadge, ZoneTypeBadge
Badge hiển thị các enum values với màu phù hợp.

### 8.3 ActionMenu
Menu dropdown 3 chấm với các action: Xem, Sửa, Ngừng hoạt động, Kích hoạt lại.

### 8.4 PageHeader
Header chung với title, description, và các action buttons.

### 8.5 FilterBar
Thanh tìm kiếm và bộ lọc có thể collapse/expand.

### 8.6 DeactivateModal, ReactivateModal
Modal xác nhận với input lý do (cho deactivate).

### 8.7 MasterDataTableWrapper
Wrapper cho table với loading state, empty state, và pagination.

---

## 9. Design System

- **Colors**: Sử dụng palette `navy-*` cho neutral, `primary-*` cho accent
- **Icons**: Lucide React icons
- **Animation**: Framer Motion cho drawer và modal transitions
- **Form**: React Hook Form + Zod validation
- **State**: TanStack React Query cho server state
- **Styling**: Tailwind CSS với custom design tokens

---

## 10. Lưu ý quan trọng

1. **Optimistic Locking**: Khi update, phải gửi `rowVersion` hiện tại. Nếu version không khớp sẽ nhận lỗi 409 Conflict.

2. **Soft Delete**: Tất cả entity dùng soft delete với `isActive` flag. Không có hard delete.

3. **Cascade Filter**: Zone và Location có filter cascade theo `warehouseId`.

4. **Inventory Status**: Không thể tạo mới, chỉ seed sẵn 4 status chuẩn (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT).

5. **Lookup APIs**: Chỉ trả về active records, không phân trang.
