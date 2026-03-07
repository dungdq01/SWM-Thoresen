# Module 2 — Master Data Management Implementation Plan

**Dự án:** TVL SWM  
**Module:** 2 - Master Data Management  
**Ngày:** 2026-03-08  
**Trạng thái:** In Progress

---

## 1. Mô tả nghiệp vụ module

Module 2 là **data foundation của toàn hệ thống SWM**, cung cấp master data cho tất cả các module downstream (Module 3-10). Module này bao gồm:

- **Owner/Customer master**: Quản lý chủ hàng
- **Vendor/Counterparty master**: Quản lý nhà cung cấp
- **Item/SKU master**: Quản lý sản phẩm/hàng hóa
- **Warehouse master**: Quản lý kho
- **Zone master**: Quản lý khu vực trong kho
- **Location master**: Quản lý vị trí lưu trữ
- **Vehicle type master**: Quản lý loại phương tiện
- **UOM master**: Quản lý đơn vị đo lường
- **UOM conversion**: Quy đổi đơn vị
- **Inventory status baseline**: Trạng thái tồn kho (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT)
- **Billing reference baseline**: Service code, day type, rate reference
- **Owner-item policy**: Override theo owner + item
- **Master data import engine**: Import preview/commit/error report

---

## 2. Entities/Bảng Data Model

### 2.1 Business Master Tables (14 tables)
| Table | Mô tả | FK chính |
|-------|-------|----------|
| `md_owner` | Chủ hàng | md_warehouse (optional) |
| `md_vendor` | Nhà cung cấp | - |
| `md_item` | Sản phẩm/SKU | md_uom (3 refs), md_zone |
| `md_warehouse` | Kho | md_location (3 refs) |
| `md_zone` | Khu vực kho | md_warehouse |
| `md_location` | Vị trí lưu trữ | md_warehouse, md_zone |
| `md_vehicle_type` | Loại xe | - |
| `md_uom` | Đơn vị đo | - |
| `md_uom_conversion` | Quy đổi đơn vị | md_uom (2 refs), md_item |
| `md_inventory_status` | Trạng thái tồn kho | - |
| `md_service_code` | Mã dịch vụ | md_uom |
| `md_day_type` | Loại ngày | - |
| `md_rate_reference` | Tham chiếu giá | md_owner, md_service_code, md_uom, md_warehouse, md_day_type |
| `md_owner_item_policy` | Override owner-item | md_owner, md_item, md_uom, md_warehouse |

### 2.2 Import Runtime Tables (3 tables)
| Table | Mô tả |
|-------|-------|
| `md_import_batch` | Batch import |
| `md_import_batch_line` | Dòng import |
| `md_import_error` | Lỗi import |

---

## 3. Dependencies

### Module 1 (Foundation) - REQUIRED
- `AuthorizationService` - Kiểm tra permission
- `IdempotencyService` - Chống duplicate
- `LogService` - Audit log
- `ReasonCodeService` - Reason code cho deactivate/reactivate

### Downstream Modules (sẽ consume M2)
- Module 3: Inventory Core
- Module 4: Inbound
- Module 5: Outbound
- Module 7: Work Execution
- Module 9: VAS/Bagging
- Module 10: Billing

---

## 4. Danh sách API Endpoints

### 4.1 Owner APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/owners` | List owners |
| GET | `/api/v1/master-data/owners/:id` | Get owner by ID |
| POST | `/api/v1/master-data/owners` | Create owner |
| PUT | `/api/v1/master-data/owners/:id` | Update owner |
| POST | `/api/v1/master-data/owners/:id/deactivate` | Deactivate owner |
| POST | `/api/v1/master-data/owners/:id/reactivate` | Reactivate owner |
| GET | `/api/v1/master-data/owners/:id/usage-impact` | Check usage |

### 4.2 Vendor APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/vendors` | List vendors |
| GET | `/api/v1/master-data/vendors/:id` | Get vendor by ID |
| POST | `/api/v1/master-data/vendors` | Create vendor |
| PUT | `/api/v1/master-data/vendors/:id` | Update vendor |
| POST | `/api/v1/master-data/vendors/:id/deactivate` | Deactivate |
| POST | `/api/v1/master-data/vendors/:id/reactivate` | Reactivate |

### 4.3 Item APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/items` | List items |
| GET | `/api/v1/master-data/items/:id` | Get item by ID |
| POST | `/api/v1/master-data/items` | Create item |
| PUT | `/api/v1/master-data/items/:id` | Update item |
| POST | `/api/v1/master-data/items/:id/deactivate` | Deactivate |
| POST | `/api/v1/master-data/items/:id/reactivate` | Reactivate |
| GET | `/api/v1/master-data/items/:id/usage-impact` | Check usage |

### 4.4 Warehouse APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/warehouses` | List warehouses |
| GET | `/api/v1/master-data/warehouses/:id` | Get warehouse |
| POST | `/api/v1/master-data/warehouses` | Create warehouse |
| PUT | `/api/v1/master-data/warehouses/:id` | Update warehouse |
| POST | `/api/v1/master-data/warehouses/:id/deactivate` | Deactivate |
| POST | `/api/v1/master-data/warehouses/:id/reactivate` | Reactivate |

### 4.5 Zone APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/zones` | List zones |
| GET | `/api/v1/master-data/zones/:id` | Get zone |
| POST | `/api/v1/master-data/zones` | Create zone |
| PUT | `/api/v1/master-data/zones/:id` | Update zone |
| POST | `/api/v1/master-data/zones/:id/deactivate` | Deactivate |
| POST | `/api/v1/master-data/zones/:id/reactivate` | Reactivate |

### 4.6 Location APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/locations` | List locations |
| GET | `/api/v1/master-data/locations/:id` | Get location |
| POST | `/api/v1/master-data/locations` | Create location |
| PUT | `/api/v1/master-data/locations/:id` | Update location |
| POST | `/api/v1/master-data/locations/:id/deactivate` | Deactivate |
| POST | `/api/v1/master-data/locations/:id/reactivate` | Reactivate |

### 4.7 UOM APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/uoms` | List UOMs |
| GET | `/api/v1/master-data/uoms/:id` | Get UOM |
| POST | `/api/v1/master-data/uoms` | Create UOM |
| PUT | `/api/v1/master-data/uoms/:id` | Update UOM |
| POST | `/api/v1/master-data/uoms/:id/deactivate` | Deactivate |

### 4.8 UOM Conversion APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/uom-conversions` | List conversions |
| POST | `/api/v1/master-data/uom-conversions` | Create conversion |
| PUT | `/api/v1/master-data/uom-conversions/:id` | Update conversion |
| DELETE | `/api/v1/master-data/uom-conversions/:id` | Deactivate |

### 4.9 Vehicle Type APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/vehicle-types` | List vehicle types |
| GET | `/api/v1/master-data/vehicle-types/:id` | Get vehicle type |
| POST | `/api/v1/master-data/vehicle-types` | Create vehicle type |
| PUT | `/api/v1/master-data/vehicle-types/:id` | Update vehicle type |
| POST | `/api/v1/master-data/vehicle-types/:id/deactivate` | Deactivate |

### 4.10 Inventory Status APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/inventory-statuses` | List statuses |
| GET | `/api/v1/master-data/inventory-statuses/:id` | Get status |
| PUT | `/api/v1/master-data/inventory-statuses/:id` | Update (description only) |

### 4.11 Service Code APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/service-codes` | List service codes |
| POST | `/api/v1/master-data/service-codes` | Create service code |
| PUT | `/api/v1/master-data/service-codes/:id` | Update service code |
| POST | `/api/v1/master-data/service-codes/:id/deactivate` | Deactivate |

### 4.12 Day Type APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/day-types` | List day types |
| POST | `/api/v1/master-data/day-types` | Create day type |
| PUT | `/api/v1/master-data/day-types/:id` | Update day type |
| POST | `/api/v1/master-data/day-types/:id/deactivate` | Deactivate |

### 4.13 Rate Reference APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/rate-references` | List rate refs |
| GET | `/api/v1/master-data/rate-references/:id` | Get rate ref |
| POST | `/api/v1/master-data/rate-references` | Create rate ref |
| PUT | `/api/v1/master-data/rate-references/:id` | Update rate ref |
| POST | `/api/v1/master-data/rate-references/:id/deactivate` | Deactivate |

### 4.14 Owner-Item Policy APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/owner-item-policies` | List policies |
| GET | `/api/v1/master-data/owner-item-policies/:id` | Get policy |
| POST | `/api/v1/master-data/owner-item-policies` | Create policy |
| PUT | `/api/v1/master-data/owner-item-policies/:id` | Update policy |
| POST | `/api/v1/master-data/owner-item-policies/:id/deactivate` | Deactivate |

### 4.15 Lookup APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/master-data/lookups/owners` | Owner lookup |
| GET | `/api/v1/master-data/lookups/vendors` | Vendor lookup |
| GET | `/api/v1/master-data/lookups/items` | Item lookup |
| GET | `/api/v1/master-data/lookups/warehouses` | Warehouse lookup |
| GET | `/api/v1/master-data/lookups/zones` | Zone lookup |
| GET | `/api/v1/master-data/lookups/locations` | Location lookup |
| GET | `/api/v1/master-data/lookups/uoms` | UOM lookup |
| GET | `/api/v1/master-data/lookups/vehicle-types` | Vehicle type lookup |
| GET | `/api/v1/master-data/lookups/service-codes` | Service code lookup |

---

## 5. Business Rules & Acceptance Criteria

### 5.1 Unique Constraints
- `owner_code` globally unique
- `vendor_code` globally unique
- `item_code` globally unique
- `warehouse_code` globally unique
- `zone_code` unique per warehouse
- `location_code` unique per warehouse
- `uom_code` globally unique
- `vehicle_type_code` globally unique
- `status_code` globally unique
- `service_code` globally unique
- `day_type_code` globally unique
- `rate_reference_code` globally unique
- `owner_id + item_id` unique in owner_item_policy

### 5.2 Cross-Reference Validation
- Zone must belong to existing active warehouse
- Location must belong to existing active warehouse + zone
- Item UOM refs must be active UOMs
- Rate reference must have active owner, service_code, uom refs
- Owner-item policy must have active owner + item

### 5.3 Controlled Field Policy
- `item.cargo_form` immutable after downstream usage
- `item.billing_uom` controlled after usage
- `location.warehouse_id` immutable after usage
- `location.zone_id` immutable after usage
- `rate_reference` key fields controlled when active

### 5.4 Deactivation Rules
- Cannot deactivate warehouse with active zones/locations
- Cannot deactivate zone with active locations
- Usage impact check required before deactivation
- Reason code required for deactivate/reactivate

### 5.5 Audit Requirements
- All create/update/deactivate/reactivate must be audited
- Import commit must be audited
- Controlled field changes must be audited with before/after

---

## 6. Implementation Checklist

### Step 0: Plan ✅
- [x] Tạo plan_implement.md

### Step 1: Database
- [ ] Thêm enums vào schema.prisma
- [ ] Thêm 14 master tables
- [ ] Thêm 3 import tables
- [ ] Tạo indexes
- [ ] Chạy migration

### Step 2: Mapping & Seed
- [ ] Seed UOM baseline (KG, MT, BAG, M3, etc.)
- [ ] Seed inventory status (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT)
- [ ] Seed permission codes cho Module 2

### Step 3: Backend API
- [ ] Tạo master-data.module.ts
- [ ] Tạo DTOs
- [ ] Tạo Repositories
- [ ] Tạo Services
- [ ] Tạo Controllers
- [ ] Integrate với Foundation Module

---

## 7. File Structure

```
src/modules/master-data/
├── master-data.module.ts
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
│   ├── service-code.controller.ts
│   ├── day-type.controller.ts
│   ├── rate-reference.controller.ts
│   ├── owner-item-policy.controller.ts
│   └── lookup.controller.ts
├── services/
│   ├── owner.service.ts
│   ├── vendor.service.ts
│   ├── item.service.ts
│   ├── warehouse.service.ts
│   ├── zone.service.ts
│   ├── location.service.ts
│   ├── uom.service.ts
│   ├── uom-conversion.service.ts
│   ├── vehicle-type.service.ts
│   ├── inventory-status.service.ts
│   ├── service-code.service.ts
│   ├── day-type.service.ts
│   ├── rate-reference.service.ts
│   ├── owner-item-policy.service.ts
│   └── lookup.service.ts
├── repositories/
│   ├── owner.repository.ts
│   ├── vendor.repository.ts
│   ├── item.repository.ts
│   ├── warehouse.repository.ts
│   ├── zone.repository.ts
│   ├── location.repository.ts
│   ├── uom.repository.ts
│   ├── uom-conversion.repository.ts
│   ├── vehicle-type.repository.ts
│   ├── inventory-status.repository.ts
│   ├── service-code.repository.ts
│   ├── day-type.repository.ts
│   ├── rate-reference.repository.ts
│   └── owner-item-policy.repository.ts
└── dto/
    ├── owner.dto.ts
    ├── vendor.dto.ts
    ├── item.dto.ts
    ├── warehouse.dto.ts
    ├── zone.dto.ts
    ├── location.dto.ts
    ├── uom.dto.ts
    ├── uom-conversion.dto.ts
    ├── vehicle-type.dto.ts
    ├── inventory-status.dto.ts
    ├── service-code.dto.ts
    ├── day-type.dto.ts
    ├── rate-reference.dto.ts
    ├── owner-item-policy.dto.ts
    └── lookup.dto.ts
```
