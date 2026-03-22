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

## 2. Danh sách bảng thực tế (23 tables)

### Nhóm Core Master
- `md_owner` - Chủ hàng
- `md_customer` - Khách hàng
- `md_vendor` - Nhà cung cấp
- `md_vessel` - Tàu
- `md_carrier` - Đơn vị vận chuyển
- `md_item` - Mặt hàng
- `md_item_group` - Nhóm mặt hàng
- `md_lot` - Lô hàng

### Nhóm Warehouse Structure
- `md_warehouse` - Kho
- `md_zone` - Zone trong kho
- `md_location` - Vị trí trong zone
- `md_location_type` - Loại vị trí

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
- `md_rate_reference` - Tham chiếu giá

### Nhóm Relationship
- `md_owner_item_policy` - Chính sách owner-item (tolerance, putaway strategy)
- `md_owner_sku_mapping` - Ánh xạ SKU theo owner

### Nhóm Import Staging
- `md_import_batch` - Header batch import
- `md_import_batch_line` - Line items của batch import
- `md_import_error` - Lỗi import

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

### `md_lot`
- **Để làm gì**
  - Lưu thông tin lô hàng để theo dõi truy vết nguồn gốc và hỗ trợ FIFO.
- **Field chính**
  - `id` - UUID primary key
  - `lot_code` - Mã lô (unique, auto-generated: LOT-YYYYMMDD-XXXX)
  - `item_id` - FK đến item
  - `owner_id` - FK đến owner
  - `warehouse_id` - FK đến warehouse
  - `first_received_date` - Ngày nhập đầu tiên (dùng cho FIFO)
  - `source_lot_id` - FK đến lot gốc (cho VAS truy vết)
  - `lot_hash` - Hash định danh (SHA256 của item_id + owner_id + warehouse_id + attributes)
  - `status` - Trạng thái (ACTIVE / INACTIVE)
  - `attributes` - JSON chứa thuộc tính mở rộng (quality, batch, expiry, etc.)
  - `notes` - Ghi chú
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `lot_code`
  - unique `lot_hash`
  - index `(item_id, owner_id, warehouse_id, status)`
  - index `(first_received_date)` - cho FIFO sorting
  - index `(source_lot_id)` - cho truy vết VAS
- **Lưu ý**
  - Lot là immutable (không sửa core info: item, owner, warehouse)
  - `source_lot_id` dùng để truy vết nguồn gốc khi VAS tạo lot mới từ lot cũ
  - `lot_hash` đảm bảo cùng điều kiện → cùng lot (dùng cho get_or_create)

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

### `md_customer`
- **Để làm gì**
  - Lưu thông tin khách hàng (người nhận hàng outbound).
- **Field chính**
  - `id` - UUID primary key
  - `customer_code` - Mã khách hàng (unique)
  - `customer_name` - Tên khách hàng
  - `short_name` - Tên viết tắt
  - `customer_group` - Nhóm khách hàng
  - `customer_type` - Loại (DOMESTIC / FOREIGN)
  - `tax_code` - Mã số thuế
  - `address` - Địa chỉ
  - `contact_name`, `phone`, `email` - Thông tin liên hệ
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `customer_code`

---

### `md_vessel`
- **Để làm gì**
  - Lưu thông tin tàu vận chuyển.
- **Field chính**
  - `id` - UUID primary key
  - `vessel_code` - Mã tàu (unique)
  - `vessel_name` - Tên tàu
  - `imo_number` - Số IMO
  - `vessel_type` - Loại tàu (BULK_CARRIER, TANKER, CONTAINER, etc.)
  - `nationality` - Quốc tịch
  - `call_sign` - Tín hiệu gọi
  - `dwt_ton` - Trọng tải (DWT)
  - `loa_m`, `beam_m`, `draft_m` - Kích thước (LOA, chiều rộng, mớn nước)
  - `year_built` - Năm đóng
  - `owner`, `operator` - Chủ tàu, đơn vị vận hành
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `vessel_code`
  - index `(vessel_type, is_active)`

---

### `md_carrier`
- **Để làm gì**
  - Lưu thông tin đơn vị vận chuyển (trucking, logistics).
- **Field chính**
  - `id` - UUID primary key
  - `carrier_code` - Mã đơn vị (unique)
  - `carrier_name` - Tên đơn vị
  - `contact_name`, `phone` - Thông tin liên hệ
  - `carrier_group` - Nhóm (TRUCKING, SHIPPING, LOGISTICS)
  - `transport_mode` - Phương thức (ROAD, SEA, RAIL, AIR)
  - `default_vehicle_type_code` - Mã loại xe mặc định
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `carrier_code`
  - index `(carrier_group, transport_mode, is_active)`

---

### `md_item_group`
- **Để làm gì**
  - Lưu thông tin nhóm mặt hàng để phân loại.
- **Field chính**
  - `id` - UUID primary key
  - `item_group_code` - Mã nhóm (unique)
  - `item_group_name` - Tên nhóm
  - `description` - Mô tả
  - `cargo_form` - Dạng hàng mặc định
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
  - `deactivated_at`, `deactivated_by`
- **Index/constraint đáng chú ý**
  - unique `item_group_code`

---

### `md_location_type`
- **Để làm gì**
  - Lưu danh mục loại vị trí (FLOOR, RACK, BIN, etc.).
- **Field chính**
  - `id` - UUID primary key
  - `location_type_code` - Mã loại (unique)
  - `location_type_name` - Tên loại
  - `description` - Mô tả
  - `is_default` - Là loại mặc định?
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `location_type_code`

---

### `md_owner_item_policy`
- **Để làm gì**
  - Lưu chính sách riêng cho từng cặp owner-item.
- **Field chính**
  - `id` - UUID primary key
  - `owner_id` - FK đến owner
  - `item_id` - FK đến item
  - `tolerance_pct_inbound` - % dung sai nhập riêng
  - `tolerance_pct_outbound` - % dung sai xuất riêng
  - `putaway_strategy` - Chiến lược putaway
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `(owner_id, item_id)`

---

### `md_owner_sku_mapping`
- **Để làm gì**
  - Ánh xạ SKU của owner với item trong hệ thống.
- **Field chính**
  - `id` - UUID primary key
  - `mapping_code` - Mã ánh xạ (unique)
  - `owner_id` - FK đến owner
  - `item_id` - FK đến item
  - `owner_sku_code` - Mã SKU của owner
  - `owner_sku_name` - Tên SKU của owner
  - `billing_class` - Phân loại billing
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `mapping_code`
  - unique `(owner_id, owner_sku_code)`

---

### `md_rate_reference`
- **Để làm gì**
  - Lưu tham chiếu giá cho billing theo owner.
- **Field chính**
  - `id` - UUID primary key
  - `rate_reference_code` - Mã tham chiếu (unique)
  - `owner_id` - FK đến owner
  - `effective_date` - Ngày hiệu lực
  - `expiry_date` - Ngày hết hạn
  - `is_active`, `row_version`
  - `created_at`, `created_by`, `updated_at`, `updated_by`
- **Index/constraint đáng chú ý**
  - unique `rate_reference_code`
  - index `(owner_id, effective_date)`

---

### `md_import_batch` / `md_import_batch_line` / `md_import_error`
- **Để làm gì**
  - Staging tables cho import bulk data từ Excel/CSV.
- **md_import_batch**
  - `id` - UUID primary key
  - `batch_no` - Số batch (unique)
  - `entity_name` - Tên entity (owner, item, vendor, etc.)
  - `status` - Trạng thái (PENDING / PROCESSING / COMPLETED / FAILED)
  - `total_rows`, `success_rows`, `error_rows` - Thống kê
  - `created_at`, `created_by`
- **md_import_batch_line**
  - `id` - UUID primary key
  - `batch_id` - FK đến batch
  - `row_no` - Số dòng trong file
  - `status` - Trạng thái dòng
  - `raw_data` - JSON data thô
  - `created_entity_id` - ID entity sau khi import
- **md_import_error**
  - `id` - UUID primary key
  - `batch_id` - FK đến batch
  - `batch_line_id` - FK đến line (optional)
  - `error_code`, `error_message` - Chi tiết lỗi

---

## 4. Quan hệ dữ liệu tổng quát

```text
md_owner ─────────────< md_owner_item_policy >───────── md_item
    │                                                       │
    ├──< md_owner_sku_mapping                               ├──> md_uom (base_uom, billing_uom)
    │                                                       ├──> md_zone (default_zone)
    └──< md_rate_reference                                  └──> md_item_group
                                                        
md_vendor    (reference by inbound)
md_vessel    (reference by inbound/outbound)
md_carrier   (reference by inbound/outbound)
md_customer  (reference by outbound)

md_warehouse ─────────< md_zone ─────────< md_location
      │                                        │
      └──> md_location (defaults)              └──> md_location_type

md_uom ───────────────< md_uom_conversion >───────────── md_uom
                              │
                              └──> md_item (optional item-specific conversion)

md_lot ──────────────> md_item, md_owner, md_warehouse
    │
    └──> md_lot (source_lot_id - truy vết VAS)

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

### Customer
- `repositories/customer.repository.ts` → `md_customer`
- `services/customer.service.ts`

### Vendor
- `repositories/vendor.repository.ts` → `md_vendor`
- `services/vendor.service.ts`

### Vessel
- `repositories/vessel.repository.ts` → `md_vessel`
- `services/vessel.service.ts`

### Carrier
- `repositories/carrier.repository.ts` → `md_carrier`
- `services/carrier.service.ts`

### Item
- `repositories/item.repository.ts` → `md_item`
- `services/item.service.ts`

### Item Group
- `repositories/item-group.repository.ts` → `md_item_group`
- `services/item-group.service.ts`

### Lot
- `repositories/lot.repository.ts` → `md_lot`
- `services/lot.service.ts`

### Warehouse
- `repositories/warehouse.repository.ts` → `md_warehouse`
- `services/warehouse.service.ts`

### Zone
- `repositories/zone.repository.ts` → `md_zone`
- `services/zone.service.ts`

### Location
- `repositories/location.repository.ts` → `md_location`
- `services/location.service.ts`

### Location Type
- `repositories/location-type.repository.ts` → `md_location_type`
- `services/location-type.service.ts`

### UOM
- `repositories/uom.repository.ts` → `md_uom`
- `services/uom.service.ts`

### UOM Conversion
- `repositories/uom-conversion.repository.ts` → `md_uom_conversion`

### Vehicle Type
- `repositories/vehicle-type.repository.ts` → `md_vehicle_type`
- `services/vehicle-type.service.ts`

### Inventory Status
- `repositories/inventory-status.repository.ts` → `md_inventory_status`
- `services/inventory-status.service.ts`

### Owner SKU Mapping
- `repositories/owner-sku-mapping.repository.ts` → `md_owner_sku_mapping`
- `services/owner-sku-mapping.service.ts`

### Dropdown Config
- `repositories/dropdown-config.repository.ts` → dynamic dropdown options
- `services/dropdown-config.service.ts`

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

### Cascade Hierarchy & Inventory Guard
- Warehouse → Zone → Location có quan hệ cha con.
- Khi deactivate warehouse, check cả zone active lẫn stock thực tế.
- **Inventory Guard (2026-03-22)**: Tất cả 5 entity chính (Owner, Item, Location, Zone, Warehouse) bắt buộc check tồn kho trong bảng `on_hand` (qua `invent_dim`) trước khi cho phép deactivate. Nếu `physicalQty > 0` → chặn deactivate, trả lỗi 400.

### Cross-module dependency khi deactivate
- `md_owner` → check `on_hand` qua `invent_dim.owner_id`
- `md_item` → check `on_hand` qua `on_hand.item_id`
- `md_location` → check `on_hand` qua `invent_dim.location_id`
- `md_zone` → check `on_hand` qua `invent_dim.location.zone_id` + check `md_location.is_active`
- `md_warehouse` → check `on_hand` qua `invent_dim.warehouse_id` + check `md_zone.is_active`

Các bảng `on_hand` và `invent_dim` thuộc Module 3 (Inventory Core) nhưng được query trực tiếp từ Module 2 service qua Prisma transaction.

### UOM Conversion
- Conversion có thể global (`item_id = null`) hoặc item-specific.
- Item-specific sẽ override global.

### Inventory Status
- Là system-locked data, không được tạo mới qua API.
- Chỉ có 4 status chuẩn được seed sẵn.

### Import Tables
- Dùng cho bulk import từ file.
- Flow: Upload → Parse to staging → Validate → Import to main table.

---

## 8. Database Changes (2026-03-22)

### 8.1 Owner-Warehouse Access

**New Table:** `md_owner_warehouse_access`

| Column         | Type    | Description          |
|----------------|---------|----------------------|
| `id`           | UUID    | Primary key          |
| `owner_id`     | UUID    | FK → md_owner        |
| `warehouse_id` | UUID    | FK → md_warehouse    |
| `is_active`    | BOOLEAN | Trạng thái hoạt động |
| `row_version`  | BIGINT  | Optimistic locking   |
| `created_at`   | TIMESTAMP | Ngày tạo           |
| `created_by`   | UUID    | Người tạo            |
| `updated_at`   | TIMESTAMP | Ngày cập nhật       |
| `updated_by`   | UUID    | Người cập nhật       |

**Unique Constraint:** `(owner_id, warehouse_id)`

**Mục đích:**
- Quản lý quyền truy cập warehouse của owner
- Owner chỉ có thể tạo PO/Receipt tại các warehouse đã được gán quyền
- Dropdown warehouse trong form PO/Receipt chỉ hiển thị warehouse owner có quyền

**File code:**
- `repositories/owner-warehouse-access.repository.ts` → `md_owner_warehouse_access`
- `services/owner-warehouse-access.service.ts`
- `controllers/owner-warehouse-access.controller.ts`

---

### 8.2 Item Incompatibility

**New Table:** `md_item_incompatibility`

| Column                       | Type         | Description                                       |
|------------------------------|--------------|---------------------------------------------------|
| `id`                         | UUID         | Primary key                                       |
| `rule_type`                  | ENUM         | `ITEM_TO_ITEM`, `ITEM_TO_GROUP`, `GROUP_TO_GROUP` |
| `item_id`                    | UUID         | FK → md_item (nullable)                           |
| `item_group_id`              | UUID         | FK → md_item_group (nullable)                     |
| `incompatible_with_item_id`  | UUID         | FK → md_item (nullable)                           |
| `incompatible_with_group_id` | UUID         | FK → md_item_group (nullable)                     |
| `reason`                     | VARCHAR(500) | Lý do không tương thích                           |
| `is_active`                  | BOOLEAN      | Trạng thái hoạt động                              |
| `row_version`                | BIGINT       | Optimistic locking                                |
| `created_at`                 | TIMESTAMP    | Ngày tạo                                          |
| `created_by`                 | UUID         | Người tạo                                         |
| `updated_at`                 | TIMESTAMP    | Ngày cập nhật                                     |
| `updated_by`                 | UUID         | Người cập nhật                                    |
| `deactivated_at`             | TIMESTAMP    | Ngày vô hiệu hóa                                  |
| `deactivated_by`             | UUID         | Người vô hiệu hóa                                 |

**New Enum:** `IncompatibilityRuleType`
```
ITEM_TO_ITEM    - Không tương thích giữa 2 items cụ thể
ITEM_TO_GROUP   - Item không tương thích với nhóm hàng
GROUP_TO_GROUP  - Nhóm hàng không tương thích với nhau
```

**Mục đích:**
- Quản lý quy tắc không tương thích giữa các item/item group
- Ngăn việc xếp hàng không tương thích chung location
- Dùng trong Putaway suggestion (M7)

**File code:**
- `repositories/item-incompatibility.repository.ts` → `md_item_incompatibility`
- `services/item-incompatibility.service.ts`
- `controllers/item-incompatibility.controller.ts`

---

### 8.3 Owner Dual Tracking Mode

**Schema Change:** `md_owner.dual_tracking_enabled`

| Column                 | Type    | Default | Description                          |
|------------------------|---------|---------|--------------------------------------|
| `dual_tracking_enabled`| BOOLEAN | false   | Cho phép tracking cả units và weight |

**Mục đích:**
- Khi `dualTrackingEnabled = true`, tracking cả số lượng bags VÀ trọng lượng
- Inventory posting ghi cả `qtyUnits` và `qtyKg`
- Tolerance check áp dụng cho cả units và weight

**Ảnh hưởng đến Receipt:**
```typescript
// Khi owner.dualTrackingEnabled = true
{
  receivedQty: 5000,       // KG (weight)
  bagCount: 100,           // Units (bags)
  nominalWeightPerBag: 50  // KG/bag
}
```

---

### 8.4 Updated Data Model

```text
md_owner ─────────────< md_owner_warehouse_access >───────── md_warehouse
    │
    ├── dual_tracking_enabled (new field)
    │
    └──< md_owner_item_policy >───────── md_item
                                              │
                                              └──< md_item_incompatibility
                                                        │
                                                        └──> md_item_group
```

---

### 8.5 Migration Notes

**Required before using new features:**
```bash
# Generate Prisma client with new models
npx prisma generate

# Run migration
npx prisma migrate dev --name add_owner_warehouse_access_and_item_incompatibility
```

**Backward Compatibility:**
- `dual_tracking_enabled` defaults to `false` → Existing owners không bị ảnh hưởng
- `md_owner_warehouse_access` mặc định rỗng → Cần seed data hoặc UI để assign
- `md_item_incompatibility` mặc định rỗng → Không có rules = không block

---

### 8.6 Inventory Guard trước khi Deactivate (2026-03-22)

**Thay đổi:** Không thêm bảng mới — thay đổi logic ở tầng service.

**Mô tả:**
Tất cả 5 entity chính (Owner, Item, Location, Zone, Warehouse) bắt buộc kiểm tra bảng `on_hand` (qua relation `invent_dim`) trước khi cho phép deactivate. Nếu còn tồn kho (`physical_qty > 0`), hệ thống chặn deactivate và trả lỗi 400.

**Bảng liên quan (thuộc Module 3 - Inventory Core):**

| Bảng | Vai trò trong check |
|------|---------------------|
| `on_hand` | Chứa `physical_qty` — nguồn dữ liệu tồn kho hiện tại |
| `invent_dim` | Link stock đến `owner_id`, `location_id`, `warehouse_id` |
| `md_location` | Link `zone_id` — dùng cho Zone check qua `invent_dim.location.zone_id` |

**Query pattern cho từng entity:**

| Entity | Prisma where clause |
|--------|---------------------|
| Owner | `onHand.findFirst({ where: { physicalQty: { gt: 0 }, inventDim: { ownerId: id } } })` |
| Item | `onHand.findFirst({ where: { itemId: id, physicalQty: { gt: 0 } } })` |
| Location | `onHand.findFirst({ where: { physicalQty: { gt: 0 }, inventDim: { locationId: id } } })` |
| Zone | `onHand.findFirst({ where: { physicalQty: { gt: 0 }, inventDim: { location: { zoneId: id } } } })` |
| Warehouse | `onHand.findFirst({ where: { physicalQty: { gt: 0 }, inventDim: { warehouseId: id } } })` |

**Lưu ý:**
- Không cần migration database — chỉ thay đổi logic ở service layer
- Tất cả deactivate đều wrap trong `$transaction` để tránh race condition
- Zone/Warehouse giữ cả check entity con active (locations/zones) lẫn check stock thực tế
