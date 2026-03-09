# Module 2 - Master Data: Language Standardization Report

## Overview
This report documents the language standardization changes made to the Master Data module, converting all Vietnamese UI text to English following the UX Language Guideline.

## Files Modified

### 1. MasterDataLayout.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Nav Label | Chủ hàng | Owners |
| Nav Label | Nhà cung cấp | Vendors |
| Nav Label | Mặt hàng | Items |
| Nav Label | Kho | Warehouses |
| Nav Label | Zone | Zones |
| Nav Label | Vị trí | Locations |
| Nav Label | Đơn vị tính | UoMs |
| Nav Label | Loại phương tiện | Vehicle Types |
| Nav Label | Trạng thái tồn kho | Inventory Statuses |
| Module Title | Điều hướng Master Data | Master Data Navigation |
| Module Description | Chọn một danh mục dữ liệu để quản lý trong module này. | Select a data category to manage within this module. |

### 2. OwnersPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Nhóm | Group |
| Filter Placeholder | Loại | Type |
| Page Title | Quản lý chủ hàng | Owner Management |
| Page Description | Danh sách các chủ hàng trong hệ thống | List of all owners in the system |
| Button Label | Thêm chủ hàng | Add Owner |
| Search Placeholder | Tìm theo mã hoặc tên chủ hàng... | Search by code or name... |
| Empty Message | Chưa có chủ hàng nào | No owners available |
| Table Header | Mã chủ hàng | Owner Code |
| Table Header | Tên chủ hàng | Owner Name |
| Table Header | Nhóm | Group |
| Table Header | Mã số thuế | Tax Code |
| Table Header | Trạng thái | Status |

### 3. ItemsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Dạng hàng | Cargo Form |
| Filter Placeholder | Nhóm SP | Product Group |
| Page Title | Quản lý mặt hàng | Item Management |
| Page Description | Danh sách các mặt hàng trong hệ thống | List of all items in the system |
| Button Label | Thêm mặt hàng | Add Item |
| Search Placeholder | Tìm theo mã hoặc tên mặt hàng... | Search by code or name... |
| Empty Message | Chưa có mặt hàng nào | No items available |
| Table Header | Mã mặt hàng | Item Code |
| Table Header | Tên mặt hàng | Item Name |
| Table Header | Dạng hàng | Cargo Form |
| Table Header | Trọng lượng chuẩn | Standard Weight |
| Table Header | Trạng thái | Status |

### 4. VendorsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Nhóm | Group |
| Page Title | Quản lý nhà cung cấp | Vendor Management |
| Page Description | Danh sách nhà cung cấp và tàu trong hệ thống | List of vendors and vessels in the system |
| Button Label | Thêm nhà cung cấp | Add Vendor |
| Search Placeholder | Tìm theo mã, tên nhà cung cấp hoặc tên tàu... | Search by code, vendor name or vessel name... |
| Empty Message | Chưa có nhà cung cấp nào | No vendors available |
| Table Header | Mã NCC | Vendor Code |
| Table Header | Tên nhà cung cấp | Vendor Name |
| Table Header | Nhóm | Group |
| Table Header | Liên hệ | Contact |
| Table Header | Trạng thái | Status |
| Label | Tàu: | Vessel: |

### 5. WarehousesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Loại kho | Warehouse Type |
| Page Title | Quản lý kho | Warehouse Management |
| Page Description | Danh sách các kho trong hệ thống | List of all warehouses in the system |
| Button Label | Thêm kho | Add Warehouse |
| Search Placeholder | Tìm theo mã hoặc tên kho... | Search by code or name... |
| Empty Message | Chưa có kho nào | No warehouses available |
| Table Header | Mã kho | Warehouse Code |
| Table Header | Tên kho | Warehouse Name |
| Table Header | Loại | Type |
| Table Header | Sức chứa | Capacity |
| Table Header | Trạng thái | Status |

### 6. ZonesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Kho | Warehouse |
| Filter Placeholder | Loại zone | Zone Type |
| Page Title | Quản lý Zone | Zone Management |
| Page Description | Danh sách các zone trong kho | List of all zones in the warehouses |
| Search Placeholder | Tìm theo mã hoặc tên zone... | Search by code or name... |
| Empty Message | Chưa có zone nào | No zones available |
| Table Header | Mã Zone | Zone Code |
| Table Header | Tên Zone | Zone Name |
| Table Header | Kho | Warehouse |
| Table Header | Loại | Type |
| Table Header | Sức chứa | Capacity |
| Table Header | Trạng thái | Status |
| Badge Label | Zone tính phí | Billing Zone |

### 7. LocationsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Kho | Warehouse |
| Filter Placeholder | Loại vị trí | Location Type |
| Page Title | Quản lý vị trí | Location Management |
| Page Description | Danh sách các vị trí lưu trữ trong kho | List of all storage locations in the warehouses |
| Search Placeholder | Tìm theo mã vị trí... | Search by location code... |
| Empty Message | Chưa có vị trí nào | No locations available |
| Table Header | Mã vị trí | Location Code |
| Table Header | Kho / Zone | Warehouse / Zone |
| Table Header | Loại | Type |
| Table Header | Diện tích | Area |
| Table Header | Sức chứa | Capacity |
| Table Header | Trạng thái vị trí | Location Status |
| Table Header | Hoạt động | Active |

### 8. UomsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Loại đơn vị | UoM Class |
| Page Title | Quản lý đơn vị tính | UoM Management |
| Page Description | Danh sách các đơn vị tính trong hệ thống | List of all units of measurement in the system |
| Button Label | Thêm đơn vị tính | Add UoM |
| Search Placeholder | Tìm theo mã hoặc mô tả... | Search by code or description... |
| Empty Message | Chưa có đơn vị tính nào | No UoMs available |
| Table Header | Mã đơn vị | UoM Code |
| Table Header | Mô tả | Description |
| Table Header | Loại | Class |
| Table Header | Đơn vị cơ sở | Base UoM |
| Table Header | Trạng thái | Status |
| Badge Label | Có | Yes |

### 9. VehicleTypesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Status Option | Hoạt động | Active |
| Status Option | Ngừng hoạt động | Inactive |
| Filter Placeholder | Trạng thái | Status |
| Filter Placeholder | Loại | Category |
| Page Title | Quản lý loại phương tiện | Vehicle Type Management |
| Page Description | Danh sách các loại phương tiện vận chuyển | List of all vehicle types for transportation |
| Button Label | Thêm loại phương tiện | Add Vehicle Type |
| Search Placeholder | Tìm theo mã hoặc tên loại phương tiện... | Search by code or name... |
| Empty Message | Chưa có loại phương tiện nào | No vehicle types available |
| Table Header | Mã loại | Type Code |
| Table Header | Tên loại | Type Name |
| Table Header | Phân loại | Category |
| Table Header | Tải trọng tối đa | Max Payload |
| Table Header | Trạng thái | Status |

### 10. InventoryStatusesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Page Title | Trạng thái tồn kho | Inventory Status |
| Page Description | Danh sách các trạng thái tồn kho trong hệ thống (không thể thêm mới) | List of all inventory statuses in the system (cannot add new) |
| Search Placeholder | Tìm theo mã hoặc mô tả... | Search by code or description... |
| Note Text | Lưu ý: Trạng thái tồn kho là dữ liệu hệ thống và không thể tạo mới. Chỉ có thể cập nhật mô tả cho các trạng thái không bị khóa hệ thống. | Note: Inventory statuses are system data and cannot be created. You can only update descriptions for statuses that are not system locked. |
| Empty Message | Chưa có trạng thái tồn kho nào | No inventory statuses available |
| Table Header | Mã trạng thái | Status Code |
| Table Header | Mô tả | Description |
| Table Header | Có thể phân bổ | Allocatable |
| Table Header | Khóa hệ thống | System Locked |
| Badge Label | Có | Yes |
| Badge Label | Không | No |
| Badge Label | Đã khóa | Locked |

## Implementation Checklist

- [x] Page titles are English only
- [x] All button labels are English
- [x] Table headers are English
- [x] Form labels are English
- [x] Empty state messages are English
- [x] Status badges are English
- [x] Filter placeholders are English
- [x] Search placeholders are English
- [x] Navigation items are English
- [x] Info/Note messages are English

## Summary

**Total Files Modified:** 10  
**Total Text Changes:** ~120 translations  
**Completion Status:** ✅ Complete

All Vietnamese text in the Master Data module has been standardized to English following the UX Language Guideline established in `frontend/docs/UX_LANGUAGE_GUIDELINE.md`.
