# Module 2 - Master Data Database

## 1. Mục tiêu database của module
Database của `master-data` là lớp dữ liệu nền tảng cho toàn bộ hoạt động kho:
- Quản lý chủ hàng (Owner)
- Quản lý nhà cung cấp / tàu (Vendor)
- Quản lý mặt hàng (Item)
- Quản lý cấu trúc kho (Warehouse → Zone → Location)
- Quản lý đơn vị tính và quy đổi (UOM)
- Quản lý loại phương tiện (Vehicle Type)
- Quản lý trạng thái tồn kho (Inventory Status)
- Quản lý mã dịch vụ và loại ngày cho billing

Thiết kế hiện tại dùng `PostgreSQL` qua Prisma và được khai báo tại:
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`

## 2. Danh sách bảng thực tế (17 tables)

### Nhóm Core Master
- `md_owner` - Chủ hàng
- `md_vendor` - Nhà cung cấp / Tàu
- `md_item` - Mặt hàng

### Nhóm Warehouse Structure
- `md_warehouse` - Kho
- `md_zone` - Zone trong kho
- `md_location` - Vị trí trong zone

### Nhóm UOM
- `md_uom` - Đơn vị tính
- `md_uom_conversion` - Quy đổi đơn vị

### Nhóm Vehicle
- `md_vehicle_type` - Loại phương tiện

### Nhóm Status
- `md_inventory_status` - Trạng thái tồn kho

### Nhóm Billing Config
- `md_service_code` - Mã dịch vụ
- `md_day_type` - Loại ngày (workday/weekend/holiday)

### Nhóm Relationship
- `md_owner_item` - Liên kết owner với item
- `md_item_vendor` - Liên kết item với vendor

### Nhóm Import Staging
- `md_import_owner` - Import owner từ file
- `md_import_item` - Import item từ file
- `md_import_vendor` - Import vendor từ file

---

## 3. Mô tả từng bảng

### `md_owner`
- **Để làm gì**
  - Lưu thông tin chủ hàng (customer) gửi hàng vào kho.
- **Field chính**
  - `id` - UUID primary key
  - `owner_code` - Mã chủ hàng (unique)
  - `owner_name` - Tên chủ hàng
  - `short_name` - Tên viết tắt
  - `owner_group` - Nhóm chủ hàng
  - `owner_type` - Loại (DOMESTIC / FOREIGN)
  - `tax_code` - Mã số thuế
  - `address` - Địa chỉ
  - `billing_email` - Email billing
  - `billing_contact` - Người liên hệ billing
  - `payment_terms` - Điều khoản thanh toán
  - `default_tolerance_pct` - % dung sai mặc định
  - `default_warehouse_id` - Kho mặc định (FK)
  - `external_id` - ID hệ thống ngoài
  - `is_active` - Trạng thái active
  - `row_version` - Optimistic locking
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by` - Soft delete
- **Index/constraint đáng chú ý**
  - unique `owner_code`
  - index `(owner_group, is_active)`
  - index `(owner_type, is_active)`

---

### `md_vendor`
- **Để làm gì**
  - Lưu thông tin nhà cung cấp hoặc tàu vận chuyển hàng.
- **Field chính**
  - `id` - UUID primary key
  - `vendor_code` - Mã vendor (unique)
  - `vendor_name` - Tên vendor
  - `supplier_group` - Nhóm (VESSEL / DOMESTIC_SUPPLIER / FOREIGN_SUPPLIER)
  - `country_region` - Quốc gia/vùng
  - `vessel_name` - Tên tàu (nếu là VESSEL)
  - `contact_name` - Người liên hệ
  - `phone` - Số điện thoại
  - `email` - Email
  - `tax_code` - Mã số thuế
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `vendor_code`
  - index `(supplier_group, is_active)`

---

### `md_item`
- **Để làm gì**
  - Lưu thông tin mặt hàng được lưu trữ trong kho.
- **Field chính**
  - `id` - UUID primary key
  - `item_code` - Mã hàng (unique)
  - `item_name` - Tên hàng
  - `item_name_en` - Tên tiếng Anh
  - `alt_item_code` - Mã thay thế
  - `product_group` - Nhóm sản phẩm
  - `cargo_form` - Dạng hàng (BULK / BAGGED / CONTAINERIZED / LIQUID / BREAK_BULK)
  - `category` - Danh mục
  - `is_packaging` - Là vật liệu đóng gói?
  - `base_uom_id` - UOM cơ sở (FK)
  - `billing_uom_id` - UOM tính phí (FK)
  - `catch_weight_uom_id` - UOM catch weight (FK, optional)
  - `std_gross_weight` - Khối lượng gross chuẩn
  - `std_net_weight` - Khối lượng net chuẩn
  - `density_mt_per_m3` - Tỷ trọng
  - `std_cube_m3` - Thể tích chuẩn
  - `tolerance_pct_inbound` - % dung sai nhập
  - `tolerance_pct_outbound` - % dung sai xuất
  - `shrinkage_rate_pct` - % hao hụt
  - `rotate_by` - Rotation rule (FIFO, FEFO, etc.)
  - `shelf_life_days` - Hạn sử dụng (ngày)
  - `default_zone_id` - Zone mặc định (FK)
  - `putaway_strategy_key` - Chiến lược put-away
  - `default_bag_weight_kg` - Trọng lượng bao mặc định
  - `packaging_material_item_id` - Item bao bì (FK, self-ref)
  - `nominal_qty_per_unit` - Số lượng định mức/đơn vị
  - `hs_code` - Mã HS
  - `country_of_origin` - Xuất xứ
  - `is_catch_weight` - Có dùng catch weight?
  - `is_storage_billable` - Có tính phí lưu kho?
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `item_code`
  - index `(cargo_form, is_active)`
  - index `(product_group, is_active)`

---

### `md_warehouse`
- **Để làm gì**
  - Lưu thông tin kho vật lý.
- **Field chính**
  - `id` - UUID primary key
  - `warehouse_code` - Mã kho (unique)
  - `warehouse_name` - Tên kho
  - `site_id` - Mã site (nếu có)
  - `warehouse_type` - Loại kho (COVERED / OPEN_YARD / BONDED)
  - `total_area_m2` - Tổng diện tích (m²)
  - `usable_area_m2` - Diện tích sử dụng được
  - `max_height_m` - Chiều cao tối đa
  - `max_capacity_mt` - Sức chứa tối đa (MT)
  - `address` - Địa chỉ
  - `has_weighbridge` - Có trạm cân?
  - `weighbridge_count` - Số trạm cân
  - `is_bonded` - Là kho ngoại quan?
  - `capacity_warning_pct` - % cảnh báo sức chứa
  - `default_receiving_location_id` - Location nhận mặc định (FK)
  - `default_staging_location_id` - Location staging mặc định (FK)
  - `default_shipping_location_id` - Location xuất mặc định (FK)
  - `external_id` - ID hệ thống ngoài
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Quan hệ**
  - 1 warehouse có nhiều zone
  - 1 warehouse có nhiều location

---

### `md_zone`
- **Để làm gì**
  - Lưu thông tin zone (vùng) trong kho.
- **Field chính**
  - `id` - UUID primary key
  - `warehouse_id` - FK đến warehouse
  - `zone_code` - Mã zone (unique trong warehouse)
  - `zone_name` - Tên zone
  - `zone_type` - Loại (BULK_STORAGE / BAGGED_STORAGE / CONTAINER_YARD / STAGING / RECEIVING / SHIPPING)
  - `is_billing_zone` - Có tính phí?
  - `billing_rate_zone` - Mã rate zone cho billing
  - `max_capacity_mt` - Sức chứa tối đa
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `(warehouse_id, zone_code)`
  - index `(warehouse_id, zone_type, is_active)`

---

### `md_location`
- **Để làm gì**
  - Lưu thông tin vị trí cụ thể trong zone.
- **Field chính**
  - `id` - UUID primary key
  - `warehouse_id` - FK đến warehouse
  - `zone_id` - FK đến zone
  - `location_code` - Mã location (unique trong warehouse)
  - `location_type` - Loại (FLOOR / RACK / BIN / STAGING / DOCK)
  - `location_profile` - Profile (STANDARD / HEAVY / COLD / etc.)
  - `status` - Trạng thái (AVAILABLE / OCCUPIED / BLOCKED / MAINTENANCE)
  - `area_m2` - Diện tích
  - `max_height_m` - Chiều cao tối đa
  - `stack_limit_kg` - Giới hạn chồng (kg)
  - `is_mixed_owner` - Cho phép nhiều owner?
  - `is_mixed_product` - Cho phép nhiều product?
  - `is_billing_location` - Có tính phí?
  - `stacking_rule` - Rule chồng hàng
  - `x_coord`, `y_coord` - Tọa độ (cho warehouse map)
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `(warehouse_id, location_code)`
  - index `(zone_id, status, is_active)`
  - index `(warehouse_id, location_type, is_active)`

---

### `md_uom`
- **Để làm gì**
  - Lưu danh mục đơn vị tính.
- **Field chính**
  - `id` - UUID primary key
  - `uom_code` - Mã UOM (unique)
  - `description` - Mô tả
  - `uom_class` - Nhóm (WEIGHT / VOLUME / QUANTITY / TIME)
  - `is_base_uom` - Là UOM cơ sở của class?
  - `decimal_precision` - Số thập phân
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `uom_code`
  - index `(uom_class, is_active)`

---

### `md_uom_conversion`
- **Để làm gì**
  - Lưu tỷ lệ quy đổi giữa các UOM.
- **Field chính**
  - `id` - UUID primary key
  - `from_uom_id` - FK UOM nguồn
  - `to_uom_id` - FK UOM đích
  - `conversion_factor` - Hệ số quy đổi (Decimal 24,12)
  - `item_id` - FK item (optional, cho item-specific conversion)
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `(from_uom_id, to_uom_id, item_id)`
- **Lưu ý**
  - `item_id = null` nghĩa là conversion áp dụng global
  - `item_id != null` nghĩa là conversion chỉ cho item cụ thể

---

### `md_vehicle_type`
- **Để làm gì**
  - Lưu danh mục loại phương tiện vận chuyển.
- **Field chính**
  - `id` - UUID primary key
  - `vehicle_type_code` - Mã loại xe (unique)
  - `vehicle_type_name` - Tên loại xe
  - `category` - Danh mục (TRUCK / TRAILER / VESSEL / BARGE / RAIL)
  - `default_tare_weight_kg` - Trọng lượng bì mặc định
  - `max_payload_kg` - Tải trọng tối đa
  - `length_m`, `width_m`, `height_m` - Kích thước
  - `teu_equivalent` - Tương đương TEU
  - `handling_fee_group` - Nhóm phí xử lý
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `vehicle_type_code`
  - index `(category, is_active)`

---

### `md_inventory_status`
- **Để làm gì**
  - Lưu danh mục trạng thái tồn kho.
- **Field chính**
  - `id` - UUID primary key
  - `status_code` - Mã trạng thái (unique)
  - `description` - Mô tả
  - `is_allocatable` - Có thể phân bổ cho đơn xuất?
  - `is_system_locked` - Không cho sửa/xóa?
  - `display_order` - Thứ tự hiển thị
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Seed data chuẩn**
  - `AVAILABLE` - Sẵn sàng (allocatable)
  - `DAMAGED` - Hư hỏng
  - `BLOCKED` - Đã khóa
  - `IN_TRANSIT` - Đang vận chuyển

---

### `md_service_code`
- **Để làm gì**
  - Lưu danh mục mã dịch vụ cho billing.
- **Field chính**
  - `id` - UUID primary key
  - `service_code` - Mã dịch vụ (unique)
  - `service_name` - Tên dịch vụ
  - `service_group` - Nhóm (HANDLING / STORAGE / WEIGHING / DOCUMENTATION / OTHER)
  - `description` - Mô tả
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `service_code`
  - index `(service_group, is_active)`

---

### `md_day_type`
- **Để làm gì**
  - Lưu danh mục loại ngày cho tính phí.
- **Field chính**
  - `id` - UUID primary key
  - `day_type_code` - Mã loại ngày (unique)
  - `description` - Mô tả
  - `multiplier` - Hệ số nhân phí
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Seed data chuẩn**
  - `WORKDAY` - Ngày làm việc (multiplier: 1.0)
  - `WEEKEND` - Cuối tuần (multiplier: 1.5)
  - `HOLIDAY` - Ngày lễ (multiplier: 2.0)

---

### `md_owner_item`
- **Để làm gì**
  - Liên kết owner với item (owner nào có thể gửi item nào).
- **Field chính**
  - `id` - UUID primary key
  - `owner_id` - FK đến owner
  - `item_id` - FK đến item
  - `custom_tolerance_pct` - % dung sai riêng (override)
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `(owner_id, item_id)`

---

### `md_item_vendor`
- **Để làm gì**
  - Liên kết item với vendor (item đến từ vendor nào).
- **Field chính**
  - `id` - UUID primary key
  - `item_id` - FK đến item
  - `vendor_id` - FK đến vendor
  - `is_preferred` - Là vendor ưu tiên?
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `(item_id, vendor_id)`

---

### `md_import_owner` / `md_import_item` / `md_import_vendor`
- **Để làm gì**
  - Staging table cho import bulk data từ Excel/CSV.
- **Field chung**
  - `id` - UUID primary key
  - `batch_id` - Batch import ID
  - `row_number` - Số dòng trong file
  - `status` - Trạng thái (PENDING / VALIDATED / ERROR / IMPORTED)
  - `error_message` - Lỗi nếu có
  - `raw_data` - JSON data thô
  - `created_at`, `created_by`

---

## 4. Quan hệ dữ liệu tổng quát

```text
md_owner ─────────────< md_owner_item >───────────── md_item
                                                        │
md_vendor ────────────< md_item_vendor >────────────────┘
                                                        │
                                                        ├──> md_uom (base_uom, billing_uom, catch_weight_uom)
                                                        └──> md_zone (default_zone)

md_warehouse ─────────< md_zone ─────────< md_location
      │
      └──> md_location (default_receiving, default_staging, default_shipping)

md_uom ───────────────< md_uom_conversion >───────────── md_uom
                              │
                              └──> md_item (optional item-specific conversion)

md_inventory_status   (standalone, reference by inventory transactions)
md_vehicle_type       (standalone, reference by inbound/outbound)
md_service_code       (standalone, reference by billing)
md_day_type           (standalone, reference by billing)
```

---

## 5. Seed data đang có

### UOMs (8 records)
| Code | Description | Class | Is Base | Precision |
|------|-------------|-------|---------|-----------|
| MT | Metric Ton | WEIGHT | No | 3 |
| KG | Kilogram | WEIGHT | Yes | 3 |
| M3 | Cubic Meter | VOLUME | Yes | 3 |
| UNIT | Unit/Piece | QUANTITY | Yes | 0 |
| BAG | Bag | QUANTITY | No | 0 |
| PALLET | Pallet | QUANTITY | No | 0 |
| CONTAINER | Container | QUANTITY | No | 0 |
| DAY | Day | QUANTITY | No | 0 |

### UOM Conversions
| From | To | Factor | Item |
|------|-----|--------|------|
| MT | KG | 1000 | (global) |

### Inventory Statuses (4 records)
| Code | Description | Allocatable | System Locked |
|------|-------------|-------------|---------------|
| AVAILABLE | Sẵn sàng để phân bổ | Yes | Yes |
| DAMAGED | Hư hỏng | No | Yes |
| BLOCKED | Đã khóa | No | Yes |
| IN_TRANSIT | Đang vận chuyển | No | Yes |

### Warehouse
| Code | Name | Type |
|------|------|------|
| WH5.1 | Kho 5.1 - Phú Mỹ | COVERED |

### Zones (3 records)
| Code | Name | Type |
|------|------|------|
| ZONE-A | Zone A - Bulk Storage | BULK_STORAGE |
| ZONE-B | Zone B - Bagged Storage | BAGGED_STORAGE |
| ZONE-C | Zone C - Container Yard | CONTAINER_YARD |

### Locations (6 records)
| Code | Zone | Type |
|------|------|------|
| A-01-01 | ZONE-A | FLOOR |
| A-01-02 | ZONE-A | FLOOR |
| B-01-01 | ZONE-B | FLOOR |
| B-01-02 | ZONE-B | FLOOR |
| C-01-01 | ZONE-C | FLOOR |
| C-01-02 | ZONE-C | FLOOR |

### Service Codes (5 records)
| Code | Name | Group |
|------|------|-------|
| HDL-IN | Handling Inbound | HANDLING |
| HDL-OUT | Handling Outbound | HANDLING |
| STG | Storage | STORAGE |
| WGH | Weighing | WEIGHING |
| DOC | Documentation | DOCUMENTATION |

### Day Types (3 records)
| Code | Description | Multiplier |
|------|-------------|------------|
| WORKDAY | Ngày làm việc | 1.0 |
| WEEKEND | Cuối tuần | 1.5 |
| HOLIDAY | Ngày lễ | 2.0 |

---

## 6. File code nào đang thao tác bảng nào?

### Owner
- `repositories/owner.repository.ts` → `md_owner`
- `services/owner.service.ts`

### Vendor
- `repositories/vendor.repository.ts` → `md_vendor`
- `services/vendor.service.ts`

### Item
- `repositories/item.repository.ts` → `md_item`
- `services/item.service.ts`

### Warehouse
- `repositories/warehouse.repository.ts` → `md_warehouse`
- `services/warehouse.service.ts`

### Zone
- `repositories/zone.repository.ts` → `md_zone`
- `services/zone.service.ts`

### Location
- `repositories/location.repository.ts` → `md_location`
- `services/location.service.ts`

### UOM
- `repositories/uom.repository.ts` → `md_uom`, `md_uom_conversion`
- `services/uom.service.ts`

### Vehicle Type
- `repositories/vehicle-type.repository.ts` → `md_vehicle_type`
- `services/vehicle-type.service.ts`

### Inventory Status
- `repositories/inventory-status.repository.ts` → `md_inventory_status`
- `services/inventory-status.service.ts`

### Lookup (read-only)
- `services/lookup.service.ts` → đọc từ tất cả bảng trên

---

## 7. Lưu ý cho dev mới

### Soft Delete
- Tất cả bảng dùng `is_active` + `deactivated_at` + `deactivated_by` cho soft delete.
- Không có hard delete API.

### Optimistic Locking
- Tất cả bảng có `row_version` (BigInt).
- Update phải gửi `rowVersion` hiện tại, nếu không khớp sẽ conflict.

### Cascade Hierarchy
- Warehouse → Zone → Location có quan hệ cha con.
- Khi deactivate warehouse, cần check xem có zone/location active không.

### UOM Conversion
- Conversion có thể global (`item_id = null`) hoặc item-specific.
- Item-specific sẽ override global.

### Inventory Status
- Là system-locked data, không được tạo mới qua API.
- Chỉ có 4 status chuẩn được seed sẵn.

### Import Tables
- Dùng cho bulk import từ file.
- Flow: Upload → Parse to staging → Validate → Import to main table.
