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

## 2. Danh sách bảng (17 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `md_owner` | Chủ hàng | Core Master |
| `md_vendor` | Nhà cung cấp / Tàu | Core Master |
| `md_item` | Mặt hàng | Core Master |
| `md_warehouse` | Kho | Warehouse |
| `md_zone` | Zone trong kho | Warehouse |
| `md_location` | Vị trí trong zone | Warehouse |
| `md_uom` | Đơn vị tính | UOM |
| `md_uom_conversion` | Quy đổi đơn vị | UOM |
| `md_vehicle_type` | Loại phương tiện | Vehicle |
| `md_inventory_status` | Trạng thái tồn kho | Status |
| `md_service_code` | Mã dịch vụ | Billing |
| `md_day_type` | Loại ngày | Billing |
| `md_owner_item` | Liên kết owner-item | Relationship |
| `md_item_vendor` | Liên kết item-vendor | Relationship |
| `md_import_owner` | Import owner staging | Import |
| `md_import_item` | Import item staging | Import |
| `md_import_vendor` | Import vendor staging | Import |

## 3. Enums

### CargoForm
```prisma
enum CargoForm {
  BULK
  BAGGED_25KG
  BAGGED_40KG
  BAGGED_50KG
  JUMBO
  PACKAGING
  CONTAINER
  DRUM
  PALLET
  OTHER
}
```

### VehicleCategory
```prisma
enum VehicleCategory {
  TRUCK
  TRAILER
  CONTAINER
  BARGE
  VESSEL
  VESSEL_SUPPORT
  OTHER
}
```

### Other Enums
- `OwnerType`: DOMESTIC, FOREIGN, TRADER
- `SupplierGroup`: DOMESTIC, OVERSEAS, VESSEL_AGENT, TRADER
- `WarehouseType`: COVERED, OPEN_YARD, MIXED
- `ZoneType`: RECEIVING, STORAGE, STAGING, SHIPPING, QC, DAMAGED, RETURNS
- `LocationType`: RECEIVING, STORAGE, STAGING, SHIPPING, QC, DAMAGED, RETURNS, VIRTUAL
- `LocationStatus`: OK, HOLD, BLOCKED
- `UomClass`: WEIGHT, VOLUME, QUANTITY, LENGTH, AREA
- `ServiceGroup`: STORAGE, HANDLING, VAS, TRANSPORT, OTHER

## 4. Seed Data

### Inventory Statuses (4 records)
| Code | Description | Allocatable |
|------|-------------|-------------|
| AVAILABLE | Sẵn sàng để phân bổ | Yes |
| DAMAGED | Hư hỏng | No |
| BLOCKED | Đã khóa | No |
| IN_TRANSIT | Đang vận chuyển | No |

### UOMs (8 records)
| Code | Description | Class |
|------|-------------|-------|
| MT | Metric Ton | WEIGHT |
| KG | Kilogram | WEIGHT |
| M3 | Cubic Meter | VOLUME |
| UNIT | Unit/Piece | QUANTITY |
| BAG | Bag | QUANTITY |
| PALLET | Pallet | QUANTITY |
| CONTAINER | Container | QUANTITY |
| DAY | Day | QUANTITY |

### Service Codes (5 records)
| Code | Name | Group |
|------|------|-------|
| HDL-IN | Handling Inbound | HANDLING |
| HDL-OUT | Handling Outbound | HANDLING |
| STG | Storage | STORAGE |
| WGH | Weighing | HANDLING |
| DOC | Documentation | VAS |

### Day Types (3 records)
| Code | Description | Multiplier |
|------|-------------|------------|
| WORKDAY | Ngày làm việc | 1.0 |
| WEEKEND | Cuối tuần | 1.5 |
| HOLIDAY | Ngày lễ | 2.0 |

## 5. Common Patterns

### Soft Delete
Tất cả bảng dùng pattern:
- `isActive` (Boolean, default true)
- `deactivatedAt` (DateTime, nullable)
- `deactivatedBy` (UUID, nullable)

### Optimistic Locking
- `rowVersion` (BigInt, default 0)
- Increment on every update

### Audit Fields
- `createdAt`, `createdBy`
- `updatedAt`, `updatedBy`

## 6. Quan hệ dữ liệu

```
md_owner ─────────< md_owner_item >───────── md_item
                                               │
md_vendor ────────< md_item_vendor >───────────┘
                                               │
                    ├──> md_uom (base_uom, billing_uom)
                    └──> md_zone (default_zone)

md_warehouse ─────< md_zone ─────< md_location

md_uom ───────────< md_uom_conversion >───── md_uom
```
