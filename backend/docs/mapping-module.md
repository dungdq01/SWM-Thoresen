# SWMS Backend Module Mapping

> Tài liệu ánh xạ tổng quan giữa các module, code path, database tables và API endpoints.

---

## Tổng quan

| Module | Status | Code Path | DB Tables | API Endpoints |
|--------|--------|-----------|-----------|---------------|
| Module 1 - Foundation | ✅ Completed | `src/modules/foundation` | 14 tables | ~25 endpoints |
| Module 2 - Master Data | ✅ Completed | `src/modules/master-data` | 17 tables | ~55 endpoints |
| Module 3 - Inventory Core | ✅ Completed | `src/modules/inventory-core` | 10 tables | ~13 endpoints |
| Module 4 - Inbound | 🔜 Pending | `src/modules/inbound` | - | - |
| Module 5 - Outbound | 🔜 Pending | `src/modules/outbound` | - | - |

---

# Module 1: Foundation & Governance

**Status:** ✅ Completed  
**Code Path:** `src/modules/foundation`  
**Documentation:** [`docs/module-1-foundation.md`](./module-1-foundation.md)  
**Database Docs:** [`prisma/docs/module-1-foundation.md`](../prisma/docs/module-1-foundation.md)

## Database Tables (14 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `app_user` | User nội bộ | RBAC |
| `role` | Danh mục role | RBAC |
| `permission` | Catalog permission | RBAC |
| `role_permission` | Gán permission cho role | RBAC |
| `user_role` | Gán role cho user | RBAC |
| `reason_code` | Reason code dùng chung | Config |
| `number_sequence` | Cấu hình cấp số | Config |
| `number_sequence_counter` | Counter cấp số | Config |
| `business_rule_catalog` | Catalog rule nền | Governance |
| `decision_log` | Decision log | Governance |
| `change_control_record` | Change control | Governance |
| `audit_log` | Audit trail | Logging |
| `exception_log` | Exception log | Logging |
| `idempotency_record` | Idempotency tracking | Logging |

## API Endpoints

### RBAC
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/foundation/roles` | List roles |
| POST | `/api/v1/foundation/roles` | Create role |
| PUT | `/api/v1/foundation/roles/:id` | Update role |
| POST | `/api/v1/foundation/roles/:id/permissions` | Assign permissions to role |
| GET | `/api/v1/foundation/permissions` | List permissions |
| POST | `/api/v1/foundation/users/:userId/roles` | Assign role to user |
| GET | `/api/v1/foundation/me/permissions` | Get current user permissions |

### Reason Code
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/foundation/reason-codes` | List reason codes |
| POST | `/api/v1/foundation/reason-codes` | Create reason code |
| PUT | `/api/v1/foundation/reason-codes/:id` | Update reason code |
| POST | `/api/v1/foundation/reason-codes/:id/deactivate` | Deactivate reason code |

### Number Sequence
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/foundation/number-sequences` | List sequences |
| POST | `/api/v1/foundation/number-sequences` | Create sequence |
| PUT | `/api/v1/foundation/number-sequences/:id` | Update sequence |
| POST | `/api/v1/foundation/number-sequences/:code/next` | Get next number |

### Governance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/foundation/rules` | List business rules |
| POST | `/api/v1/foundation/rules` | Create business rule |
| PUT | `/api/v1/foundation/rules/:id` | Update business rule |
| GET | `/api/v1/foundation/decision-logs` | List decision logs |
| POST | `/api/v1/foundation/decision-logs` | Create decision log |
| POST | `/api/v1/foundation/change-controls` | Create change control |

### Logging
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/foundation/audit-logs` | Query audit logs |
| GET | `/api/v1/foundation/exception-logs` | Query exception logs |
| POST | `/api/v1/foundation/exception-logs/:id/resolve` | Resolve exception |
| GET | `/api/v1/foundation/idempotency/:key` | Check idempotency key |

---

# Module 2: Master Data Management

**Status:** ✅ Completed  
**Code Path:** `src/modules/master-data`  
**Documentation:** [`docs/module-2-master-data.md`](./module-2-master-data.md)  
**Database Docs:** [`prisma/docs/module-2-database.md`](../prisma/docs/module-2-database.md)

## Database Tables (17 tables)

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

## API Endpoints

### Owner Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/owners` | Create owner |
| GET | `/api/v1/master-data/owners` | List owners (paginated) |
| GET | `/api/v1/master-data/owners/:id` | Get owner by ID |
| PUT | `/api/v1/master-data/owners/:id` | Update owner |
| POST | `/api/v1/master-data/owners/:id/deactivate` | Deactivate owner |
| POST | `/api/v1/master-data/owners/:id/reactivate` | Reactivate owner |

### Vendor Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/vendors` | Create vendor |
| GET | `/api/v1/master-data/vendors` | List vendors (paginated) |
| GET | `/api/v1/master-data/vendors/:id` | Get vendor by ID |
| PUT | `/api/v1/master-data/vendors/:id` | Update vendor |
| POST | `/api/v1/master-data/vendors/:id/deactivate` | Deactivate vendor |
| POST | `/api/v1/master-data/vendors/:id/reactivate` | Reactivate vendor |

### Item Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/items` | Create item |
| GET | `/api/v1/master-data/items` | List items (paginated) |
| GET | `/api/v1/master-data/items/:id` | Get item by ID |
| PUT | `/api/v1/master-data/items/:id` | Update item |
| POST | `/api/v1/master-data/items/:id/deactivate` | Deactivate item |
| POST | `/api/v1/master-data/items/:id/reactivate` | Reactivate item |

### Warehouse Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/warehouses` | Create warehouse |
| GET | `/api/v1/master-data/warehouses` | List warehouses (paginated) |
| GET | `/api/v1/master-data/warehouses/:id` | Get warehouse by ID |
| PUT | `/api/v1/master-data/warehouses/:id` | Update warehouse |
| POST | `/api/v1/master-data/warehouses/:id/deactivate` | Deactivate warehouse |
| POST | `/api/v1/master-data/warehouses/:id/reactivate` | Reactivate warehouse |

### Zone Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/zones` | Create zone |
| GET | `/api/v1/master-data/zones` | List zones (paginated) |
| GET | `/api/v1/master-data/zones/:id` | Get zone by ID |
| PUT | `/api/v1/master-data/zones/:id` | Update zone |
| POST | `/api/v1/master-data/zones/:id/deactivate` | Deactivate zone |
| POST | `/api/v1/master-data/zones/:id/reactivate` | Reactivate zone |

### Location Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/locations` | Create location |
| GET | `/api/v1/master-data/locations` | List locations (paginated) |
| GET | `/api/v1/master-data/locations/:id` | Get location by ID |
| PUT | `/api/v1/master-data/locations/:id` | Update location |
| POST | `/api/v1/master-data/locations/:id/deactivate` | Deactivate location |
| POST | `/api/v1/master-data/locations/:id/reactivate` | Reactivate location |

### UOM Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/uoms` | Create UOM |
| GET | `/api/v1/master-data/uoms` | List UOMs (paginated) |
| GET | `/api/v1/master-data/uoms/:id` | Get UOM by ID |
| PUT | `/api/v1/master-data/uoms/:id` | Update UOM |
| POST | `/api/v1/master-data/uoms/:id/deactivate` | Deactivate UOM |
| POST | `/api/v1/master-data/uoms/:id/reactivate` | Reactivate UOM |

### Vehicle Type Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/vehicle-types` | Create vehicle type |
| GET | `/api/v1/master-data/vehicle-types` | List vehicle types (paginated) |
| GET | `/api/v1/master-data/vehicle-types/:id` | Get vehicle type by ID |
| PUT | `/api/v1/master-data/vehicle-types/:id` | Update vehicle type |
| POST | `/api/v1/master-data/vehicle-types/:id/deactivate` | Deactivate vehicle type |
| POST | `/api/v1/master-data/vehicle-types/:id/reactivate` | Reactivate vehicle type |

### Inventory Status Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/master-data/inventory-statuses` | List inventory statuses |
| GET | `/api/v1/master-data/inventory-statuses/:id` | Get inventory status by ID |
| PUT | `/api/v1/master-data/inventory-statuses/:id` | Update inventory status |

### Lookup Endpoints (for dropdowns)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/master-data/lookups/owners` | Get active owners |
| GET | `/api/v1/master-data/lookups/vendors` | Get active vendors |
| GET | `/api/v1/master-data/lookups/items` | Get active items |
| GET | `/api/v1/master-data/lookups/warehouses` | Get active warehouses |
| GET | `/api/v1/master-data/lookups/zones` | Get active zones |
| GET | `/api/v1/master-data/lookups/locations` | Get active locations |
| GET | `/api/v1/master-data/lookups/uoms` | Get active UOMs |
| GET | `/api/v1/master-data/lookups/vehicle-types` | Get active vehicle types |
| GET | `/api/v1/master-data/lookups/inventory-statuses` | Get active inventory statuses |

---

# Module 3: Inventory Core Engine

**Status:** ✅ Completed  
**Code Path:** `src/modules/inventory-core`  
**Documentation:** [`docs/module-3-inventory-core.md`](./module-3-inventory-core.md)  
**Database Docs:** [`prisma/docs/module-3-inventory-core.md`](../prisma/docs/module-3-inventory-core.md)

## Database Tables (10 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `invent_dim` | Dimension combination registry | Core |
| `invent_trans` | Immutable ledger transactions | Core |
| `on_hand` | Current balance projection | Core |
| `inventory_hold` | Allocation-based holds | Core |
| `inventory_reversal_link` | Link original ↔ reversal trans | Core |
| `inventory_reconciliation_run` | Reconciliation run header | Control |
| `inventory_reconciliation_result` | Reconciliation mismatch details | Control |
| `inventory_snapshot_run` | Snapshot run header | Control |
| `daily_storage_snapshot` | Daily snapshot data | Control |
| `inventory_event_mapping` | Event-to-transaction mapping | Config |

## API Endpoints

### Posting APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/postings` | Create inventory transaction |
| POST | `/api/v1/inventory/postings/reverse` | Reverse a transaction |

### On-Hand Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/onhand` | Query current stock |
| GET | `/api/v1/inventory/onhand/availability` | Check stock availability |

### Transaction Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/transactions` | Query transaction history |
| GET | `/api/v1/inventory/transactions/:transId` | Get transaction detail |

### Hold APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/holds` | Create hold/allocation |
| GET | `/api/v1/inventory/holds` | List holds |
| GET | `/api/v1/inventory/holds/:holdId` | Get hold detail |
| POST | `/api/v1/inventory/holds/:holdId/release` | Release hold |
| POST | `/api/v1/inventory/holds/:holdId/cancel` | Cancel hold |

## Cross-Module Dependencies

### Module 3 depends on:
| Source Module | Dependency | Usage |
|---------------|------------|-------|
| Module 1 | `NumberSequence` | Sinh transId (TRX-*), holdNo (HLD-*) |
| Module 1 | `ReasonCode` | Validate reason codes cho reversal/adjustment |
| Module 2 | `MdWarehouse` | Dimension validation |
| Module 2 | `MdLocation` | Dimension validation |
| Module 2 | `MdOwner` | Dimension + transaction owner |
| Module 2 | `MdInventoryStatus` | Dimension + allocatable check |
| Module 2 | `MdItem` | Item validation |
| Module 2 | `MdUom` | UOM validation |

### Modules that depend on Module 3:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 4 | `PostingEngineService` | Post receipt inbound |
| Module 5 | `PostingEngineService`, `HoldService` | Allocate + ship outbound |
| Module 6 | `PostingEngineService` | Adjustment, status change, count |
| Module 7 | `PostingEngineService` | Putaway, pick movement |
| Module 9 | `PostingEngineService` | VAS consume/produce |
| Module 10 | `DailyStorageSnapshot` | Billing input |
| Module 11 | `InventTrans`, `OnHand` | Reporting queries |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INVENTORY.POSTING.CREATE` | Tạo inventory transaction |
| `INVENTORY.REVERSAL.CREATE` | Reverse transaction |
| `INVENTORY.ONHAND.READ` | Query on-hand |
| `INVENTORY.HOLD.CREATE` | Tạo hold |
| `INVENTORY.HOLD.READ` | Xem hold |
| `INVENTORY.HOLD.RELEASE` | Release hold |
| `INVENTORY.HOLD.CANCEL` | Cancel hold |
| `INVENTORY.TRANSACTION.READ` | Xem transaction history |

---

# Module 4: Inbound Operations

**Status:** 🔜 Pending  
**Code Path:** `src/modules/inbound` (planned)

---

# Module 5: Outbound Operations

**Status:** 🔜 Pending  
**Code Path:** `src/modules/outbound` (planned)
