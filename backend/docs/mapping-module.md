# SWMS Backend Module Mapping

> Tài liệu ánh xạ tổng quan giữa các module, code path, database tables và API endpoints.

---

## Tổng quan

| Module                          | Status      | Code Path                       | DB Tables | API Endpoints | Sidebar |
| ---------------------------------| -------------| ---------------------------------| -----------| ---------------| --------|
| Module Auth                     | ✅ Completed | `src/modules/auth`              | 7 tables  | 13 endpoints  | - |
| Module 1 - Foundation           | ✅ Completed | `src/modules/foundation`        | 14 tables | ~25 endpoints | Nền tảng & Quản trị |
| Module 2 - Master Data          | ✅ Completed | `src/modules/master-data`       | 23 tables | ~95 endpoints | Dữ liệu nền |
| Module 3 - Inventory Core       | ✅ Completed | `src/modules/inventory-core`    | 10 tables | ~23 endpoints | Tồn kho lõi |
| Module 4 - Inbound              | ✅ Completed | `src/modules/inbound`           | 10 tables | ~27 endpoints | Vận hành nhập |
| Module 5 - Outbound             | ✅ Completed | `src/modules/outbound`          | 14 tables | ~30 endpoints | Vận hành xuất |
| Module 6 - Inventory Control    | ✅ Completed | `src/modules/inventory-control` | 13 tables | ~39 endpoints | Kiểm soát kho |
| Module 7 - Work Execution       | ✅ Completed | `src/modules/work-execution`    | 10 tables | ~20 endpoints | Thực thi công việc |
| **Module 8A - Trạm cân**        | ✅ Completed | `src/modules/integration-platform` | 4 tables  | ~10 endpoints | **Trạm cân** ⭐ |
| Module 8B - Integration Platform | ✅ Completed | `src/modules/integration-platform` | 8 tables  | ~15 endpoints | Trung tâm tích hợp |
| Module 9 - VAS / Bagging        | ✅ Completed | `src/modules/vas`               | 5 tables  | ~11 endpoints | Vận hành VAS |
| Module 10 - Billing             | ✅ Completed | `src/modules/billing`           | 12 tables | ~22 endpoints | Thanh toán & Hóa đơn |
| Module 11 - Reporting           | ✅ Completed | `src/modules/reporting`         | 12 tables | ~26 endpoints | Báo cáo & Kiểm toán |

---

# Module Auth: Authentication & Authorization

**Status:** ✅ Completed (v1.1)  
**Code Path:** `src/modules/auth`  
**Documentation:** [`docs/module-auth.md`](./module-auth.md)  
**Database Docs:** [`prisma/docs/module-auth.md`](../prisma/docs/module-auth.md)

### Guard System (v1.1 - Unified)

> **Important:** Từ v1.1, guard system đã được thống nhất:
> - **Single source of truth:** `common/guards/` chứa guards thật
> - **Foundation re-export:** `modules/foundation/auth/` re-export từ common
> - **JWT payload:** Sử dụng abbreviated keys (`ucd`, `sid`, `av`)
> - **Permission decorator:** Sử dụng `@Permission()` từ `common/decorators/`

## Database Tables (7 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `auth_local_credential` | Password hash và flags | Credential |
| `auth_password_history` | Lịch sử password | Credential |
| `auth_session` | Session tracking | Session |
| `auth_refresh_token` | Refresh token với rotation | Session |
| `auth_login_attempt` | Log login attempts | Security |
| `auth_security_event` | Audit security events | Security |
| `auth_account_lock` | Account lockout tracking | Security |

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login với username/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout current session |
| POST | `/api/v1/auth/logout-all` | Logout all sessions |

### Profile & Context
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/me` | Get current user profile |
| GET | `/api/v1/auth/me/permissions` | Get permission snapshot |
| POST | `/api/v1/auth/select-warehouse` | Select/switch warehouse context |

### Session Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/sessions` | List active sessions |
| POST | `/api/v1/auth/sessions/:id/revoke` | Revoke specific session |

### Password Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/change-password` | Change own password |

### Admin APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/admin/auth/users/:id/force-reset-password` | Admin reset password |
| POST | `/api/v1/admin/auth/users/:id/unlock` | Admin unlock account |
| POST | `/api/v1/admin/auth/users/:id/revoke-all-sessions` | Admin revoke all sessions |

## Cross-Module Dependencies

| Depends On | Table/Service | Usage |
|------------|---------------|-------|
| Module 1 | `app_user`, `role`, `permission`, `user_role` | User & RBAC data |
| Module 2 | `md_warehouse` | Warehouse context validation |

| Used By | Usage |
|---------|-------|
| All Modules | JWT validation via AuthGuard |
| All Modules | Permission check via PermissionGuard |
| All Modules | Warehouse scope filtering |

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
**Database Docs:** [`prisma/docs/module-2-master-data.md`](../prisma/docs/module-2-master-data.md)

## Database Tables (23 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `md_owner` | Chủ hàng | Core Master |
| `md_customer` | Khách hàng | Core Master |
| `md_vendor` | Nhà cung cấp | Core Master |
| `md_vessel` | Tàu | Core Master |
| `md_carrier` | Đơn vị vận chuyển | Core Master |
| `md_item` | Mặt hàng | Core Master |
| `md_item_group` | Nhóm mặt hàng | Core Master |
| `md_lot` | Lô hàng (FIFO, truy vết) | Core Master |
| `md_warehouse` | Kho | Warehouse |
| `md_zone` | Zone trong kho | Warehouse |
| `md_location` | Vị trí trong zone | Warehouse |
| `md_location_type` | Loại vị trí | Warehouse |
| `md_uom` | Đơn vị tính | UOM |
| `md_uom_conversion` | Quy đổi đơn vị | UOM |
| `md_vehicle_type` | Loại phương tiện | Vehicle |
| `md_inventory_status` | Trạng thái tồn kho | Status |
| `md_service_code` | Mã dịch vụ | Billing |
| `md_day_type` | Loại ngày | Billing |
| `md_rate_reference` | Tham chiếu giá | Billing |
| `md_owner_item_policy` | Chính sách owner-item | Relationship |
| `md_owner_sku_mapping` | Ánh xạ SKU theo owner | Relationship |
| `md_import_batch` | Import batch header | Import |
| `md_import_batch_line` | Import batch line | Import |

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

### Lot Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/lots` | Tạo lô hàng mới |
| POST | `/api/v1/master-data/lots/get-or-create` | Lấy hoặc tạo lô (cho Inbound) |
| GET | `/api/v1/master-data/lots` | List lots (paginated) |
| GET | `/api/v1/master-data/lots/fifo` | List lots theo FIFO |
| GET | `/api/v1/master-data/lots/next-code` | Get next lot code |
| GET | `/api/v1/master-data/lots/:id` | Get lot by ID |
| GET | `/api/v1/master-data/lots/:id/traceability` | Truy vết nguồn gốc |
| GET | `/api/v1/master-data/lots/:id/derived-lots` | Lấy lot phái sinh |
| GET | `/api/v1/master-data/lots/by-code/:lotCode` | Get lot by code |
| GET | `/api/v1/master-data/lots/by-hash/:lotHash` | Get lot by hash |
| PUT | `/api/v1/master-data/lots/:id` | Update lot |
| POST | `/api/v1/master-data/lots/:id/deactivate` | Deactivate lot |
| POST | `/api/v1/master-data/lots/:id/reactivate` | Reactivate lot |

### Carrier Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/carriers` | Create carrier |
| GET | `/api/v1/master-data/carriers` | List carriers (paginated) |
| GET | `/api/v1/master-data/carriers/next-code` | Get next carrier code |
| GET | `/api/v1/master-data/carriers/:id` | Get carrier by ID |
| PUT | `/api/v1/master-data/carriers/:id` | Update carrier |
| POST | `/api/v1/master-data/carriers/:id/deactivate` | Deactivate carrier |
| POST | `/api/v1/master-data/carriers/:id/reactivate` | Reactivate carrier |

### Vessel Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/vessels` | Create vessel |
| GET | `/api/v1/master-data/vessels` | List vessels (paginated) |
| GET | `/api/v1/master-data/vessels/next-code` | Get next vessel code |
| GET | `/api/v1/master-data/vessels/:id` | Get vessel by ID |
| PUT | `/api/v1/master-data/vessels/:id` | Update vessel |
| POST | `/api/v1/master-data/vessels/:id/deactivate` | Deactivate vessel |
| POST | `/api/v1/master-data/vessels/:id/reactivate` | Reactivate vessel |

### Item Group Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/item-groups` | Create item group |
| GET | `/api/v1/master-data/item-groups` | List item groups (paginated) |
| GET | `/api/v1/master-data/item-groups/next-code` | Get next item group code |
| GET | `/api/v1/master-data/item-groups/:id` | Get item group by ID |
| PUT | `/api/v1/master-data/item-groups/:id` | Update item group |
| POST | `/api/v1/master-data/item-groups/:id/deactivate` | Deactivate item group |
| POST | `/api/v1/master-data/item-groups/:id/reactivate` | Reactivate item group |

### Location Type Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/location-types` | Create location type |
| GET | `/api/v1/master-data/location-types` | List location types (paginated) |
| GET | `/api/v1/master-data/location-types/next-code` | Get next location type code |
| GET | `/api/v1/master-data/location-types/:id` | Get location type by ID |
| PUT | `/api/v1/master-data/location-types/:id` | Update location type |
| DELETE | `/api/v1/master-data/location-types/:id` | Delete location type |

### Owner SKU Mapping Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/master-data/owner-sku-mappings` | Create owner SKU mapping |
| GET | `/api/v1/master-data/owner-sku-mappings` | List mappings (paginated) |
| GET | `/api/v1/master-data/owner-sku-mappings/next-code` | Get next mapping code |
| GET | `/api/v1/master-data/owner-sku-mappings/:id` | Get mapping by ID |
| PUT | `/api/v1/master-data/owner-sku-mappings/:id` | Update mapping |
| DELETE | `/api/v1/master-data/owner-sku-mappings/:id` | Delete mapping |

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
| GET | `/api/v1/master-data/lookups/customers` | Get active customers |
| GET | `/api/v1/master-data/lookups/dropdown-options` | Get dynamic dropdown options |

## Cross-Module Dependencies (Module 2)

### Module 2 depends on:
| Source Module | Dependency | Usage |
|---------------|------------|-------|
| Module 3 | `OnHand`, `InventDim` | **Inventory Guard** — check `physicalQty > 0` trước khi deactivate Owner, Item, Location, Zone, Warehouse. Query trực tiếp qua Prisma transaction trong service layer. |

### Module 2 is used by:
| Target Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 3 | `MdWarehouse`, `MdLocation`, `MdOwner`, `MdInventoryStatus`, `MdItem`, `MdUom` | Dimension validation |
| Module 4 | `MdOwner`, `MdVendor`, `MdItem`, `MdWarehouse`, `MdLocation`, **`MdLot`** | Inbound validation + **Lot get-or-create** |
| Module 5 | `MdOwner`, `MdItem`, `MdWarehouse`, `MdLocation`, `MdInventoryStatus`, `MdVehicleType`, **`MdLot`** | Outbound validation + **FIFO lot lookup** |
| Module 6 | `MdItem`, `MdLocation`, `MdInventoryStatus` | Inventory control operations |
| Module 7 | `MdWarehouse`, `MdLocation` | Work execution |
| Module 9 | `MdOwner`, `MdItem`, **`MdLot`** | VAS operations + **Lot traceability (source_lot_id)** |
| Module 10 | `MdOwner`, `MdItem`, `MdWarehouse`, `MdServiceCode`, `MdDayType` | Billing calculations |
| Module 11 | All master data entities | Reporting queries |

### Lot Integration Points
| Integration | Module | Usage |
|-------------|--------|-------|
| **Inbound** | Module 4 | Gọi `lots/get-or-create` khi nhận hàng để tự động tạo/tìm lot |
| **Outbound** | Module 5 | Gọi `lots/fifo` để lấy danh sách lot theo FIFO cho allocation |
| **VAS** | Module 9 | Tạo lot mới với `source_lot_id` để truy vết nguồn gốc |
| **Reporting** | Module 11 | Query lot data cho báo cáo truy vết nguồn gốc |

---

# Module 3: Inventory Core Engine

**Status:** ✅ Completed (v2.1 — Stage-based delta logic)
**Code Path:** `src/modules/inventory-core`
**Documentation:** [`docs/module-3-inventory-core.md`](./module-3-inventory-core.md)
**Database Docs:** [`prisma/docs/module-3-inventory-core.md`](../prisma/docs/module-3-inventory-core.md)
**Last Updated:** 2026-03-23

## Database Tables (10 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `invent_dim` | Dimension combination registry | Core |
| `invent_trans` | Immutable ledger transactions (với `stage` field) | Core |
| `on_hand` | Current balance — 4 bucket: `physical_qty`, `allocated_qty`, `inbound_ordered_qty`, `outbound_ordered_qty` + computed `available_qty` | Core |
| `inventory_hold` | Allocation-based holds (internal capability cho M5) | Core |
| `inventory_reversal_link` | Link original ↔ reversal trans | Core |
| `inventory_reconciliation_run` | Reconciliation run header | Control |
| `inventory_reconciliation_result` | Reconciliation mismatch details | Control |
| `inventory_snapshot_run` | Snapshot run header | Control |
| `daily_storage_snapshot` | Daily snapshot data | Control |
| `inventory_event_mapping` | Event → transType + stage mapping (29 event codes) | Config |

## Inventory Stages & Transaction Types

### 6 Stages
| Stage | Ý nghĩa |
|-------|---------|
| `EXPECTED` | Kế hoạch/demand — ảnh hưởng `inboundOrderedQty` hoặc `outboundOrderedQty` |
| `REGISTERED` | Tạo chứng từ — chưa thay đổi bucket |
| `ALLOCATED` | Giữ chỗ — +`allocatedQty` |
| `DE_ALLOCATED` | Bỏ giữ chỗ — -`allocatedQty` |
| `PHYSICAL` | Thay đổi vật lý — ±`physicalQty` |
| `DEDUCTED` | Hoàn tất xuất — -`physicalQty`, -`allocatedQty`, -`outboundOrderedQty` |

### 7 Transaction Types
`RECEIPT`, `ISSUE`, `MOVE`, `STATUS_CHANGE`, `ADJUSTMENT`, `TRANSFER_ISSUE`, `TRANSFER_RECEIPT`

## API Endpoints

### Posting APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/postings` | Create inventory transaction (stage-based delta) |
| POST | `/api/v1/inventory/postings/reverse` | Reverse a transaction (negate all 4 bucket deltas) |

### On-Hand Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/onhand` | Query current stock (4 bucket + availableQty computed) |
| GET | `/api/v1/inventory/onhand/availability` | Check stock availability (ledger + pessimistic lock) |

### Transaction Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/transactions` | Query transaction history |
| GET | `/api/v1/inventory/transactions/:transId` | Get transaction detail (incl. stage) |

### Hold APIs (internal capability cho M5 Outbound)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/holds` | Create allocation hold |
| GET | `/api/v1/inventory/holds` | List holds |
| GET | `/api/v1/inventory/holds/:holdId` | Get hold detail |
| POST | `/api/v1/inventory/holds/:holdId/release` | Release hold |
| POST | `/api/v1/inventory/holds/:holdId/cancel` | Cancel hold |

### Reconciliation APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/reconciliation/runs` | Create reconciliation run |
| GET | `/api/v1/inventory/reconciliation/runs` | List reconciliation runs |
| GET | `/api/v1/inventory/reconciliation/runs/:runId` | Get reconciliation run detail |
| POST | `/api/v1/inventory/reconciliation/results/:resultId/review` | Review result |
| POST | `/api/v1/inventory/reconciliation/results/:resultId/resolve` | Resolve result |

### Snapshot APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/snapshots/runs` | Create snapshot run |
| GET | `/api/v1/inventory/snapshots/runs` | List snapshot runs |
| GET | `/api/v1/inventory/snapshots/runs/:runId` | Get snapshot run detail |
| GET | `/api/v1/inventory/snapshots/billing` | Query snapshots for billing |
| GET | `/api/v1/inventory/snapshots/billing/aggregate` | Aggregate billing data |

## Cross-Module Dependencies

### Module 3 depends on:
| Source Module | Dependency | Usage |
|---------------|------------|-------|
| Module 1 | `NumberSequence` | Sinh transId (TRX-*), holdNo (HLD-*) |
| Module 1 | `ReasonCode` | Validate reason codes cho reversal/adjustment |
| Module 1 | `LogService` | AuditLog integration qua AuditLogAdapter |
| Module 2 | `MdWarehouse` | Dimension validation |
| Module 2 | `MdLocation` | Dimension validation |
| Module 2 | `MdOwner` | Dimension + transaction owner |
| Module 2 | `MdInventoryStatus` | Dimension + allocatable check |
| Module 2 | `MdItem` | Item validation |
| Module 2 | `MdUom` | UOM validation |
| Module 2 | `LotService` | Lot lifecycle (M3 chỉ nhận `lotId` reference) |

### Modules that call M3 Posting Engine — Event Codes thực tế:
| Module | Service gọi M3 | Event Codes gửi | File |
|--------|----------------|-----------------|------|
| **M4 Inbound** | `receipt.service.js` | `PO_CONFIRMED` | `src/modules/inbound/application/receipt.service.js` — createReceipt() (v3.1: post at Receipt, not PO confirm) |
| **M4 Inbound** | `receipt.service.js` | Reversal `PO_CONFIRMED` | `src/modules/inbound/application/receipt.service.js` — cancelReceipt() |
| **M4 Inbound** | `receipt.service.js` | `GOODS_RECEIVED` | `src/modules/inbound/application/receipt.service.js` |
| **M5 Outbound** | `simple-shipment.service.ts` | `SO_CONFIRMED` | `src/modules/outbound/services/simple-shipment.service.ts` — create() (v3.1: post at SHP create, not SO confirm) |
| **M5 Outbound** | `simple-shipment.service.ts` | Reversal `SO_CONFIRMED` | `src/modules/outbound/services/simple-shipment.service.ts` — reportError() / cancel SHP |
| **M5 Outbound** | `shipShipment.usecase.ts` | `SHIP_CONFIRMED` | `src/modules/outbound/application/shipShipment.usecase.ts` |
| **M5 Outbound** | `m3-adapter.service.ts` | `SHIP_CONFIRMED` | `src/modules/outbound/infra/m3-adapter.service.ts` |
| **M5 Outbound** | `HoldService` (direct) | allocation via hold API | `src/modules/inventory-core/application/hold.service.js` |
| **M7 Work Exec** | via posting API | `PUTAWAY_COMPLETED`, `PICK_CONFIRMED` | posting API call |
| **M8 Integration** | `inbound-bridge.adapter_draft.ts` | `GOODS_RECEIVED` | `src/modules/integration-platform/adapters/` |
| **M8 Integration** | `outbound-bridge.adapter_draft.ts` | `SHIP_CONFIRMED` | `src/modules/integration-platform/adapters/` |
| **M9 VAS** | `vas-inventory.facade.ts` | reads `allocatedQty` | `src/modules/vas/facades/vas-inventory.facade.ts` |
| **M11 Reporting** | `dashboard.service.ts` | queries `RECEIPT`/`ISSUE` transType | `src/modules/reporting/services/dashboard.service.ts` |

### Modules that read M3 data:
| Module | What they read | Usage |
|--------|---------------|-------|
| Module 2 | `OnHand`, `InventDim` | **Inventory Guard** — check stock trước khi deactivate master data |
| Module 5 | `OnHand.allocatedQty` | Availability check trước khi allocate |
| Module 9 | `OnHand.physicalQty`, `OnHand.allocatedQty` | VAS availability check |
| Module 10 | `DailyStorageSnapshot` | Billing input — tính phí lưu kho |
| Module 11 | `InventTrans`, `OnHand`, `ReconciliationResult` | Dashboard, audit trail, reconciliation report |

## Event Mapping — Full Stage-based (29 event codes in DB)

### Inbound (M4 → M3)
| Event Code | Stage | Trans Type | Bucket Effect |
|------------|-------|------------|---------------|
| `PO_CONFIRMED` | EXPECTED | RECEIPT | +inboundOrderedQty |
| `RECEIPT_CREATED` | REGISTERED | RECEIPT | (audit only) |
| `GOODS_RECEIVED` | PHYSICAL | RECEIPT | +physicalQty, -inboundOrderedQty |
| `PUTAWAY_COMPLETED` | PHYSICAL | MOVE | move location |

### Outbound (M5 → M3)
| Event Code | Stage | Trans Type | Bucket Effect |
|------------|-------|------------|---------------|
| `SO_CONFIRMED` | EXPECTED | ISSUE | +outboundOrderedQty |
| `ALLOCATION_CREATED` | ALLOCATED | ISSUE | +allocatedQty |
| `ALLOCATION_RELEASED` | DE_ALLOCATED | ISSUE | -allocatedQty |
| `PICK_CONFIRMED` | PHYSICAL | ISSUE | internal move |
| `LOAD_CONFIRMED` | PHYSICAL | ISSUE | internal move |
| `SHIP_CONFIRMED` | DEDUCTED | ISSUE | -physicalQty, -allocatedQty, -outboundOrderedQty |

### Transfer (M6 → M3)
| Event Code | Stage | Trans Type | Bucket Effect |
|------------|-------|------------|---------------|
| `TRANSFER_ORDER_CONFIRMED` | EXPECTED | TRANSFER_ISSUE | +outboundOrderedQty (source) |
| `TRANSFER_ISSUED` | DEDUCTED | TRANSFER_ISSUE | -physicalQty, -outboundOrderedQty (source) |
| `TRANSFER_RECEIVED` | PHYSICAL | TRANSFER_RECEIPT | +physicalQty (destination) |

### VAS (M9 → M3)
| Event Code | Stage | Trans Type | Bucket Effect |
|------------|-------|------------|---------------|
| `VAS_ORDER_CONFIRMED` | EXPECTED | ISSUE | +outboundOrderedQty (raw material) |
| `VAS_CONSUMED` | DEDUCTED | ISSUE | -physicalQty, -outboundOrderedQty |
| `VAS_PRODUCED` | PHYSICAL | RECEIPT | +physicalQty (finished goods) |
| `VAS_WASTE` | PHYSICAL | ADJUSTMENT | -physicalQty (loss) |

### Inventory Control (M6 → M3)
| Event Code | Stage | Trans Type | Bucket Effect |
|------------|-------|------------|---------------|
| `MOVE_COMPLETED` | PHYSICAL | MOVE | move location |
| `STATUS_CHANGE_CONFIRMED` | PHYSICAL | STATUS_CHANGE | change dim |
| `ADJUSTMENT_APPROVED` | PHYSICAL | ADJUSTMENT | ±physicalQty |
| `COUNT_GAIN_RECONCILED` | PHYSICAL | ADJUSTMENT | +physicalQty |
| `COUNT_LOSS_RECONCILED` | PHYSICAL | ADJUSTMENT | -physicalQty |

### Backward Compat (deprecated)
| Event Code | Maps to | Note |
|------------|---------|------|
| `RECEIPT_RECEIVED` | RECEIPT + PHYSICAL | use `GOODS_RECEIVED` |
| `SHIPMENT_SHIPPED` | ISSUE + DEDUCTED | use `SHIP_CONFIRMED` |
| `DIRECT_ADJUSTMENT` | ADJUSTMENT + PHYSICAL | testing only |

## Backend Services (8 services)

| Service | Description |
|---------|-------------|
| `PostingEngineService` | Core posting — uses `getInventoryDelta(transType, stage, qty)` for all 4 bucket deltas |
| `ReversalEngineService` | Reversal — negates original delta across all 4 buckets |
| `HoldService` | Allocation hold — internal capability for M5 outbound |
| `OnHandService` | OnHand query with Decimal.js + aggregation |
| `TransactionQueryService` | Transaction history queries |
| `InventDimService` | Dimension management with SHA-256 hash |
| `ReconciliationService` | Ledger vs OnHand comparison |
| `SnapshotService` | Daily storage snapshot for M10 Billing |

> **LotService** không thuộc M3 — đã chuyển sang Module 2 (Master Data). M3 chỉ nhận `lotId` như dimension/reference.

## Idempotency & Re-confirm Pattern

M3 Posting Engine sử dụng `externalId` để deduplicate. Callers phải tuân thủ:

| Scenario | externalId pattern | Lý do |
|----------|-------------------|-------|
| Confirm lần đầu | `PO-CONFIRM-{poId}-{lineId}-{timestamp}` | Unique per confirm attempt |
| Confirm lại sau unconfirm | Phải có timestamp khác | Nếu trùng externalId → idempotent replay, không tạo trans mới |
| Cancel/Unconfirm | Reverse externalId: `PO-CANCEL-REV-{poId}-{transId}` | Dùng transId gốc để đảm bảo không reverse 2 lần |

> Tương tự cho SO: `SO-CONFIRM-{soId}-{lineId}-{timestamp}` và `SO-CANCEL-REV-{soId}-{transId}`

## Integration Flow Detail — Ordered Qty Lifecycle

### Inbound: PO → Receipt → physicalQty (M4 → M3) — v3.1

```
┌─ PO Confirm (purchase-order.service.ts)
│   → chỉ đổi status PO → CONFIRMED
│   → KHÔNG post M3 (PO có "kho phân phối" = planning, Receipt mới biết kho thật)
│
├─ Receipt Create (receipt.service.js) — tạo phiếu nhập, chọn kho cụ thể
│   eventCode: PO_CONFIRMED → RECEIPT + EXPECTED
│   qty: receipt line expectedQtyKg (KG quy đổi)
│   dimTo: { warehouseCode từ receipt, locationCode, ownerCode, statusCode: AVAILABLE }
│   → inboundOrderedQty += qty tại warehouse receipt
│
├─ Receipt Complete (receipt.service.js) — nhận hàng thực tế
│   eventCode: GOODS_RECEIVED → RECEIPT + PHYSICAL
│   qty: net weight (KG) từ cân
│   → physicalQty += qty
│   → inboundOrderedQty -= qty (floor 0)
│
└─ Receipt Cancel (receipt.service.js)
    → Reverse tất cả invent_trans có refId=receiptId, stage=EXPECTED
    → inboundOrderedQty -= reversed qty (floor 0)
```

> **v3.1:** PO confirm/cancel/unconfirm KHÔNG post M3. `inboundOrderedQty` post ở level Receipt vì Receipt mới biết warehouse cụ thể nhận hàng.

### Outbound: SO → SHP → Allocate → Ship (M5 → M3)

```
┌─ SO Confirm (sales-order.service.ts)
│   → KHÔNG post M3 — chỉ đổi status SO → CONFIRMED
│   → SO không biết kho cụ thể, outboundOrderedQty chưa thay đổi
│
├─ SHP Create (simple-shipment.service.ts)
│   eventCode: SO_CONFIRMED → ISSUE + EXPECTED
│   refType: SHIPMENT, refId: shipmentId
│   dimFrom: { warehouse từ SHP, location, owner, status }
│   → outboundOrderedQty += qty (tại warehouse SHP chọn)
│
├─ Allocate (hold.service.js)
│   eventCode: ALLOCATION_CREATED → ISSUE + ALLOCATED
│   → allocatedQty += qty
│   → availableQty giảm
│
├─ Ship Confirm (shipShipment.usecase.ts / m3-adapter.service.ts)
│   eventCode: SHIP_CONFIRMED → ISSUE + DEDUCTED
│   → physicalQty -= qty
│   → allocatedQty -= qty
│   → outboundOrderedQty -= qty (floor 0)
│
└─ SHP Cancel (simple-shipment.service.ts)
    → Reverse tất cả invent_trans có refId=shipmentId, stage=EXPECTED
    → outboundOrderedQty -= reversed qty (floor 0)
```

> **Thay đổi v3.1:** outboundOrderedQty được post ở level SHP (không phải SO) vì SHP mới biết kho cụ thể. SO confirm chỉ đổi status, không post M3.

### Architecture: Write Path → Read Model

```
Business Module (M4/M5/M6/M7/M9)
        │
        ▼
 PostingEngineService         ← WRITE: ghi invent_trans (ledger) ONLY
        │
        ▼
 MaterializationService       ← READ MODEL: update on_hand (projection)
        │
        ▼
 on_hand table                ← Queryable by all modules
```

> **Quan trọng:** Posting engine KHÔNG update on_hand trực tiếp. MaterializationService là thành phần DUY NHẤT update on_hand.
> **Rebuild:** on_hand có thể rebuild từ invent_trans bất kỳ lúc nào via `POST /api/v1/inventory/materialization/rebuild`

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INVENTORY.POSTING.CREATE` | Tạo inventory transaction |
| `INVENTORY.POSTING.READ` | Xem inventory transaction |
| `INVENTORY.REVERSAL.CREATE` | Reverse transaction |
| `INVENTORY.ONHAND.READ` | Query on-hand |
| `INVENTORY.HOLD.CREATE` | Tạo hold (internal, called by M5) |
| `INVENTORY.HOLD.READ` | Xem hold |
| `INVENTORY.HOLD.RELEASE` | Release hold |
| `INVENTORY.HOLD.CANCEL` | Cancel hold |
| `INVENTORY.TRANSACTION.READ` | Xem transaction history |

---

# Module 4: Inbound Operations

**Status:** ✅ Completed (Feedback Fixed v3 - CR-1 DONE)  
**Code Path:** `src/modules/inbound`  
**Documentation:** [`docs/module-4-inbound.md`](./module-4-inbound.md)  
**Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
**Last Updated:** 2026-03-16 (Added report-error API + ERROR status + M8↔M4 cascade)

### Feedback Fixes Applied

| Issue ID | Description | Status |
|----------|-------------|--------|
| **CR-1** | **M3 PostingEngine integration** | **✅ Fixed (v3)** |
| CR-2 | createReceipt wrapped in $transaction | ✅ Fixed |
| HI-1 | BaggedPolicy expectedBagCount from lineData | ✅ Fixed (v3) |
| HI-3 | Atomic receipt number generation | ✅ Fixed |
| HI-4 | lockForUpdate called in all commands | ✅ Fixed |
| HI-6 | Single-line guard added | ✅ Fixed |
| MD-3 | Controller ternary bug | ✅ Fixed |
| MD-4 | Use validated value instead of req.body | ✅ Fixed |
| HI-2 | Putaway workflow | 🔜 Pending M7 ready |

## Database Tables (10 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `purchase_orders` | Header đơn mua hàng | Runtime |
| `purchase_order_lines` | Dòng hàng trong PO | Runtime |
| `purchase_order_warehouses` | Junction PO ↔ Warehouse (multi-warehouse) | Runtime |
| `receipt_header` | Header phiếu nhận hàng | Runtime |
| `receipt_line` | Dòng hàng trong receipt | Runtime |
| `inbound_document` | Chứng từ nhập kho (B/L, packing list, ...) | Runtime |
| `receipt_weighing_log` | Log cân weigh-in/weigh-out | Audit |
| `receipt_status_history` | Lịch sử chuyển trạng thái | Audit |
| `receipt_exception_log` | Log exception nghiệp vụ | Audit |
| `receipt_integration_state` | Trạng thái sync với M3/M7/M10 | Control |

## API Endpoints

### Purchase Order Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/purchase-orders` | Tạo PO mới |
| GET | `/api/v1/inbound/purchase-orders` | List POs (paginated) |
| GET | `/api/v1/inbound/purchase-orders/:id` | Get PO by ID |
| GET | `/api/v1/inbound/purchase-orders/next-number` | Get next PO number |
| PUT | `/api/v1/inbound/purchase-orders/:id` | Update PO |
| POST | `/api/v1/inbound/purchase-orders/:id/confirm` | Confirm PO (chỉ đổi status, **không post M3** — inboundOrdered post ở Receipt) |
| POST | `/api/v1/inbound/purchase-orders/:id/unconfirm` | Hủy xác nhận PO (chỉ đổi status) |
| POST | `/api/v1/inbound/purchase-orders/:id/close` | Close PO |
| POST | `/api/v1/inbound/purchase-orders/:id/cancel` | Cancel PO → **reverse M3 PO_CONFIRMED** → -inboundOrderedQty |

**PO Status Flow:**
- `NEW` → `CONFIRMED` → `RECEIVING` → `CLOSED`
- `NEW` / `CONFIRMED` → `CANCELLED`
- `CONFIRMED` → `NEW` (unconfirm, chỉ khi chưa có receipt)
- `RECEIVING`: Tự động chuyển khi có receipt đang cân (AWAITING_WEIGHING, WEIGHED_IN, PROCESSING)

### Receipt Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới |
| GET | `/api/v1/inbound/receipts` | List receipts (paginated) |
| GET | `/api/v1/inbound/receipts/next-number` | Get next ASN number |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt by ID |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history |
| PUT | `/api/v1/inbound/receipts/:id` | Cập nhật receipt (chỉ DRAFT) |
| DELETE | `/api/v1/inbound/receipts/:id` | Xóa receipt (chỉ DRAFT) |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh receipt |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt |
| POST | `/api/v1/inbound/receipts/:id/report-error` | Báo lỗi receipt (DRAFT → ERROR) |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing |
| POST | `/api/v1/inbound/receipts/:id/putaway-complete` | Hoàn thành putaway |
| POST | `/api/v1/inbound/receipts/:id/manual-weight` | Nhập cân thủ công |

### Inbound Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/documents/upload` | Upload chứng từ nhập |
| GET | `/api/v1/inbound/documents` | List documents (paginated) |
| GET | `/api/v1/inbound/documents/:id` | Get document by ID |
| PUT | `/api/v1/inbound/documents/:id` | Update document |
| DELETE | `/api/v1/inbound/documents/:id` | Delete document |

**Receipt Status Flow:**
```
DRAFT ──confirm──> AWAITING_WEIGHING ──weighIn──> WEIGHED_IN
  │                                                    │
  │                                         startProcessing
  │                                                    ↓
  └──report-error──> ERROR                        PROCESSING
                                                       │
                                                   weighOut
                                                       ↓
                                                 WEIGHED_OUT ──> RECEIVED ──> PUTAWAY ──> CLOSED
```

### Weighing Events
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/weigh-events/in` | Nhận weigh-in (gross) |
| POST | `/api/v1/inbound/weigh-events/out` | Nhận weigh-out (tare) |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inbound/dashboard/summary` | Dashboard summary |

## Cross-Module Dependencies

### Module 4 depends on:
| Source Module | Dependency | Usage |
|---------------|------------|-------|
| Module 1 | `NumberSequence` | Sinh receipt_number (RCV-*) |
| Module 1 | `ReasonCode` | Validate reason codes |
| Module 2 | `MdOwner` | Owner validation |
| Module 2 | `MdVendor` | Vendor validation |
| Module 2 | `MdItem` | Item validation + tolerance lookup |
| Module 2 | `MdWarehouse` | Warehouse validation |
| Module 2 | `MdLocation` | Location validation (type=RECEIVING) |
| Module 2 | `MdOwnerItemPolicy` | Tolerance lookup priority |
| **Module 3** | **`PostingEngineService`** | **Receipt create → PO_CONFIRMED (+inboundOrderedQty) — posted at Receipt level with warehouse** |
| **Module 3** | **`ReversalEngineService`** | **Receipt cancel → Reverse PO_CONFIRMED (-inboundOrderedQty)** |
| **Module 3** | **`PostingEngineService`** | **Receipt complete → GOODS_RECEIVED (+physicalQty, -inboundOrderedQty)** |

### Modules that depend on Module 4:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 7 | `CreatePutawayWork` | Tạo putaway work khi RECEIVED |
| Module 10 | `InboundHandlingCaptured` | Capture billing event |

## RBAC Permissions

### PO Permissions
| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.PO.CREATE` | Tạo Purchase Order |
| `INBOUND.PO.READ` | Xem Purchase Order |
| `INBOUND.PO.UPDATE` | Cập nhật Purchase Order |
| `INBOUND.PO.CONFIRM` | Xác nhận PO |
| `INBOUND.PO.CLOSE` | Đóng Purchase Order |
| `INBOUND.PO.CANCEL` | Hủy Purchase Order |

### Receipt Permissions
| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.RECEIPT.CREATE` | Tạo receipt |
| `INBOUND.RECEIPT.READ` | Xem receipt |
| `INBOUND.RECEIPT.CONFIRM` | Confirm receipt |
| `INBOUND.RECEIPT.CANCEL` | Cancel receipt |
| `INBOUND.RECEIPT.REWEIGH` | Reweigh receipt |
| `INBOUND.RECEIPT.CLOSE` | Close receipt |
| `INBOUND.WEIGH.RECEIVE` | Nhận weigh events / Manual weight |
| `INBOUND.DASHBOARD.READ` | Xem dashboard |

### Document Permissions
| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.DOCUMENT.CREATE` | Upload chứng từ |
| `INBOUND.DOCUMENT.READ` | Xem chứng từ |
| `INBOUND.DOCUMENT.UPDATE` | Cập nhật chứng từ |
| `INBOUND.DOCUMENT.DELETE` | Xóa chứng từ |

---

# Module 5: Outbound Operations

**Status:** ✅ Implemented (Clean Architecture + RBAC + M3 Integration v3)  
**Code Path:** `src/modules/outbound`  
**Documentation:** [`docs/module-5-outbound.md`](./module-5-outbound.md)  
**Database Docs:** [`prisma/docs/module-5-outbound.md`](../prisma/docs/module-5-outbound.md)  
**Last Updated:** 2026-03-09 (CR-1/CR-2 M3 Integration Fixed)

### Architecture

Module 5 đã được cấu trúc lại theo Clean Architecture với M3 integration:
- **domain/**: State machine, policy, errors
- **application/**: Use cases với real M3 integration (createShipment, allocateShipment, shipShipment, receiveOutboundWeight)
- **infra/**: M3AdapterService (OnHand/Hold/PostingEngine wrapper)
- **controllers/**: All protected with AuthGuard + PermissionGuard, wired to use cases

**M3 Integration:**
- `AllocateShipmentUseCase` → M3 OnHandService (FIFO query) + HoldService (create holds)
- `ShipShipmentUseCase` → M3 PostingEngineService (SHIPMENT_SHIPPED) + HoldService (release holds)

### Feedback Fixes Applied

| Issue ID | Description | Status |
|----------|-------------|--------|
| HI-1 | Auto-transition to ALL_WEIGHED | ✅ Fixed |
| HI-2 | Tolerance 4-level cascade lookup | ✅ Fixed |
| HI-3 | Allocation wrapped in $transaction | ✅ Fixed |
| HI-4 | decidedBy from authenticated user | ✅ Fixed |
| HI-5 | Line-level status history | ✅ Fixed |
| HI-6 | lockForUpdate called before allocation | ✅ Fixed |
| CR-3 | RBAC guards on all controllers | ✅ Fixed |
| CR-1 | Real M3 OnHand/Hold integration | ✅ Fixed |
| CR-2 | M3 Posting at SHIPPED | ✅ Fixed |

## Database Tables (14 tables)

### Sales Order Tables (3)
| Table Name                   | Description                        |
| ------------------------------| ------------------------------------|
| `sales_orders`               | Header đơn xuất hàng               |
| `sales_order_lines`          | Dòng hàng trong SO                 |
| `sales_order_status_history` | Lịch sử chuyển trạng thái SO       |

### Shipment Tables (10)
| Table Name                   | Description                        |
| ------------------------------| ------------------------------------|
| `shipment_header`            | Header nghiệp vụ cho trip outbound |
| `shipment_line`              | Dòng hàng trong shipment           |
| `shipment_allocation_record` | Trace allocation từ stock source   |
| `shipment_weighing_attempt`  | Log tare/gross/manual override     |
| `shipment_status_history`    | Lịch sử chuyển trạng thái          |
| `shipment_exception_log`     | Log exception nghiệp vụ            |
| `shipment_approval_decision` | Quyết định approve/reject          |
| `shipment_pick_work_link`    | Mapping với work từ M7             |
| `shipment_posting_link`      | Mapping với posting sang M3        |
| `shipment_so_link`           | Link shipment với SO               |

### Document Tables (1)
| Table Name                   | Description                        |
| ------------------------------| ------------------------------------|
| `outbound_document`          | Chứng từ xuất kho (B/L, packing list, ...) |

## API Endpoints

### Sales Order Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/sales-orders/next-number` | Get next SO number |
| GET | `/api/v1/outbound/sales-orders` | List SOs (paginated) |
| GET | `/api/v1/outbound/sales-orders/:id` | Get SO detail |
| POST | `/api/v1/outbound/sales-orders` | Create SO |
| PATCH | `/api/v1/outbound/sales-orders/:id` | Update SO (NEW only) |
| POST | `/api/v1/outbound/sales-orders/:id/confirm` | Confirm SO (chỉ đổi status, **không post M3** — outboundOrdered post ở SHP) |
| POST | `/api/v1/outbound/sales-orders/:id/cancel` | Cancel SO |
| POST | `/api/v1/outbound/sales-orders/:id/unconfirm` | Unconfirm SO |
| POST | `/api/v1/outbound/sales-orders/:id/close` | Close SO |

### Shipment Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments` | Tạo shipment mới → **gọi M3 SO_CONFIRMED** → +outboundOrderedQty + availability check |
| GET | `/api/v1/outbound/shipments` | List shipments (paginated) |
| GET | `/api/v1/outbound/shipments/:id` | Get shipment detail |
| PATCH | `/api/v1/outbound/shipments/:id` | Update shipment (DRAFT only) |
| DELETE | `/api/v1/outbound/shipments/:id` | Delete shipment (DRAFT only) |
| POST | `/api/v1/outbound/shipments/:id/confirm` | Confirm shipment |
| POST | `/api/v1/outbound/shipments/:id/cancel` | Cancel shipment |
| POST | `/api/v1/outbound/shipments/:id/report-error` | Cancel SHP → **reverse M3 SO_CONFIRMED** → -outboundOrderedQty |
| POST | `/api/v1/outbound/shipments/:id/ship` | Ship (post M3) |

### Allocation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/allocate` | Allocate shipment |
| POST | `/api/v1/outbound/shipments/:id/unallocate` | Release allocation |
| GET | `/api/v1/outbound/shipments/:id/allocations` | View allocations |

### Weighing
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/weigh/tare` | Record tare |
| POST | `/api/v1/outbound/shipments/:id/weigh/gross` | Record gross |
| GET | `/api/v1/outbound/shipments/:id/weighing-history` | View weigh history |

### Approval
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/approvals/pending` | List pending approvals |
| POST | `/api/v1/outbound/shipments/:id/approve` | Approve shipment/line |
| POST | `/api/v1/outbound/shipments/:id/reject` | Reject shipment/line |

### Query & Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/shipments/:id/history` | Status history |
| GET | `/api/v1/outbound/shipments/:id/exceptions` | Exceptions |
| GET | `/api/v1/outbound/dashboard/summary` | Dashboard summary |
| GET | `/api/v1/outbound/dashboard/kpis` | KPI metrics |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/documents` | List outbound documents |

## Code Structure

```
src/modules/outbound/
├── outbound.module.ts
├── controllers/
│   ├── shipment.controller.ts
│   ├── allocation.controller.ts
│   ├── weighing.controller.ts
│   ├── approval.controller.ts
│   └── outbound-query.controller.ts
├── services/
│   ├── shipment.service.ts
│   ├── shipment-command.service.ts
│   ├── shipment-query.service.ts
│   ├── shipment-state-machine.service.ts
│   ├── shipment-line-state.service.ts
│   ├── allocation.service.ts
│   ├── weighing.service.ts
│   ├── tolerance.service.ts
│   └── approval.service.ts
├── repositories/
│   ├── shipment-header.repository.ts
│   ├── shipment-line.repository.ts
│   ├── allocation-record.repository.ts
│   ├── weighing-attempt.repository.ts
│   ├── status-history.repository.ts
│   ├── exception-log.repository.ts
│   ├── approval-decision.repository.ts
│   ├── pick-work-link.repository.ts
│   └── posting-link.repository.ts
└── dto/
    ├── create-shipment.dto.ts
    └── shipment-response.dto.ts
```

## Module Dependencies

### Module 5 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh shipment_number (SHP-*) |
| Module 1 | `ReasonCode` | Validate reason codes |
| Module 1 | `AuditLog` | Audit trail |
| Module 1 | `Idempotency` | External ID check |
| Module 2 | `MdOwner` | Owner validation |
| Module 2 | `MdItem` | Item validation + tolerance |
| Module 2 | `MdWarehouse` | Warehouse validation |
| Module 2 | `MdLocation` | Location validation |
| Module 2 | `MdInventoryStatus` | Status check (AVAILABLE) |
| Module 2 | `MdVehicleType` | Vehicle type lookup |
| Module 3 | `OnHandService` | Query available stock |
| Module 3 | `HoldService` | Create/release allocation holds |
| **Module 3** | **`PostingEngineService`** | **SHP create → SO_CONFIRMED (+outboundOrderedQty) — posted at SHP level with warehouse** |
| **Module 3** | **`ReversalEngineService`** | **SHP cancel → Reverse SO_CONFIRMED (-outboundOrderedQty)** |
| **Module 3** | **`PostingEngineService`** | **Ship confirm → SHIP_CONFIRMED (-physicalQty, -allocatedQty, -outboundOrderedQty)** |

### Modules that depend on Module 5:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 7 | `CreatePickWork` | Tạo pick work khi ALLOCATED |
| Module 10 | `OutboundHandlingCaptured` | Capture billing event |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `OUTBOUND.SHIPMENT.CREATE` | Tạo shipment |
| `OUTBOUND.SHIPMENT.READ` | Xem shipment |
| `OUTBOUND.SHIPMENT.CONFIRM` | Confirm shipment |
| `OUTBOUND.SHIPMENT.CANCEL` | Cancel shipment |
| `OUTBOUND.SHIPMENT.ALLOCATE` | Allocate shipment |
| `OUTBOUND.SHIPMENT.SHIP` | Ship shipment |
| `OUTBOUND.WEIGH.RECORD` | Ghi nhận cân |
| `OUTBOUND.APPROVAL.DECIDE` | Approve/Reject |
| `OUTBOUND.DASHBOARD.READ` | Xem dashboard |

---

# Module 6: Inventory Control

**Status:** ✅ Completed  
**Code Path:** `src/modules/inventory-control`  
**Documentation:** [`docs/module-6-inventory-control.md`](./module-6-inventory-control.md)  
**Database Docs:** [`prisma/docs/module-6-inventory-control.md`](../prisma/docs/module-6-inventory-control.md)

## Database Tables (13 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `ic_move_order` | Header lệnh di chuyển nội bộ | Move |
| `ic_move_order_line` | Line chi tiết lệnh di chuyển | Move |
| `ic_transfer_order` | Header lệnh chuyển kho | Transfer |
| `ic_transfer_order_line` | Line chi tiết chuyển kho | Transfer |
| `ic_inventory_status_change` | Yêu cầu đổi trạng thái tồn | Status |
| `ic_cycle_count_plan` | Kế hoạch kiểm kê chu kỳ | Count |
| `ic_cycle_count_header` | Header đợt kiểm kê | Count |
| `ic_cycle_count_line` | Line chi tiết kiểm kê | Count |
| `ic_adjustment_header` | Header điều chỉnh tồn | Adjustment |
| `ic_adjustment_line` | Line chi tiết điều chỉnh | Adjustment |
| `ic_reconciliation_review` | Review sai lệch đối chiếu | Reconciliation |
| `ic_document_status_history` | Lịch sử chuyển trạng thái | Trace |
| `ic_exception_log` | Log exception nghiệp vụ | Trace |

## API Endpoints

### On-Hand Inquiry
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory-control/on-hand` | Tra cứu tồn kho |
| GET | `/api/v1/inventory-control/on-hand/:itemId` | Chi tiết tồn theo item |
| GET | `/api/v1/inventory-control/movement-history` | Lịch sử biến động |

### Move Order
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/moves` | Tạo move order |
| GET | `/api/v1/inventory-control/moves` | List move orders |
| GET | `/api/v1/inventory-control/moves/:id` | Chi tiết move order |
| POST | `/api/v1/inventory-control/moves/:id/confirm` | Confirm move |
| POST | `/api/v1/inventory-control/moves/:id/execute` | Execute move |
| POST | `/api/v1/inventory-control/moves/:id/cancel` | Cancel move |

### Transfer Order
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/transfers` | Tạo transfer order |
| GET | `/api/v1/inventory-control/transfers` | List transfer orders |
| GET | `/api/v1/inventory-control/transfers/aging` | Transfer aging report |
| GET | `/api/v1/inventory-control/transfers/:id` | Chi tiết transfer |
| POST | `/api/v1/inventory-control/transfers/:id/release` | Release transfer |
| POST | `/api/v1/inventory-control/transfers/:id/ship` | Ship transfer |
| POST | `/api/v1/inventory-control/transfers/:id/receive` | Receive transfer |
| POST | `/api/v1/inventory-control/transfers/:id/close` | Close transfer |
| POST | `/api/v1/inventory-control/transfers/:id/cancel` | Cancel transfer |

### Status Change
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/status-changes` | Tạo status change |
| GET | `/api/v1/inventory-control/status-changes` | List status changes |
| GET | `/api/v1/inventory-control/status-changes/:id` | Chi tiết |
| POST | `/api/v1/inventory-control/status-changes/:id/cancel` | Cancel |
| POST | `/api/v1/inventory-control/status-changes/:id/reverse` | Reverse |

### Cycle Count
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/cycle-count-plans` | Tạo count plan |
| POST | `/api/v1/inventory-control/cycle-counts` | Tạo cycle count |
| GET | `/api/v1/inventory-control/cycle-counts` | List cycle counts |
| GET | `/api/v1/inventory-control/cycle-counts/:id` | Chi tiết |
| POST | `/api/v1/inventory-control/cycle-counts/:id/release` | Release count |
| POST | `/api/v1/inventory-control/cycle-counts/:id/submit` | Submit count |
| POST | `/api/v1/inventory-control/cycle-counts/:id/recount` | Request recount |
| POST | `/api/v1/inventory-control/cycle-counts/:id/approve` | Approve variance |
| POST | `/api/v1/inventory-control/cycle-counts/:id/post` | Post adjustment |
| POST | `/api/v1/inventory-control/cycle-counts/:id/cancel` | Cancel count |

### Adjustment
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/adjustments` | Tạo adjustment |
| GET | `/api/v1/inventory-control/adjustments` | List adjustments |
| GET | `/api/v1/inventory-control/adjustments/:id` | Chi tiết |
| POST | `/api/v1/inventory-control/adjustments/:id/submit` | Submit adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/approve` | Approve adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/post` | Post adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/cancel` | Cancel adjustment |

### Reconciliation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory-control/reconciliation-reviews/run` | Run reconciliation |
| GET | `/api/v1/inventory-control/reconciliation-reviews` | List reviews |
| GET | `/api/v1/inventory-control/reconciliation-reviews/:id` | Chi tiết |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/assign` | Assign reviewer |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/resolve` | Resolve issue |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/close` | Close review |

## Code Structure

```
src/modules/inventory-control/
├── index.js
├── inventory-control.routes.js        # Routes with RBAC middleware
├── middleware/
│   └── auth.middleware.js             # Auth & Permission preHandlers
├── controllers/
│   ├── onhand-inquiry.controller.js
│   ├── move-order.controller.js
│   ├── transfer-order.controller.js
│   ├── status-change.controller.js
│   ├── cycle-count.controller.js
│   ├── adjustment.controller.js
│   └── reconciliation.controller.js
├── services/
│   ├── onhand-inquiry.service.js
│   ├── move-order.service.js
│   ├── transfer-order.service.js
│   ├── status-change.service.js
│   ├── cycle-count.service.js
│   ├── adjustment.service.js
│   ├── reconciliation.service.js
│   ├── ic-validation.service.js
│   ├── ic-state-machine.service.js
│   ├── ic-posting-adapter.service.js  # M3 posting adapter
│   └── ic-audit-log.adapter.js        # M1 audit log adapter
├── infra/
│   ├── move-order.repository.js
│   ├── transfer-order.repository.js
│   ├── status-change.repository.js
│   ├── cycle-count.repository.js
│   ├── adjustment.repository.js
│   ├── reconciliation.repository.js
│   └── ic-status-history.repository.js
└── domain/
    ├── ic.enums.js
    ├── ic.errors.js
    └── ic.policy.js
```

## Module Dependencies

### Module 6 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh document numbers (MOV-*, TRF-*, STC-*, CNT-*, ADJ-*, REC-*) |
| Module 1 | `ReasonCode` | Validate reason codes |
| Module 1 | `AuditLog` | Audit trail |
| Module 1 | `Idempotency` | External ID check |
| Module 2 | `MdOwner` | Owner validation |
| Module 2 | `MdItem` | Item validation |
| Module 2 | `MdWarehouse` | Warehouse validation |
| Module 2 | `MdLocation` | Location validation |
| Module 2 | `MdInventoryStatus` | Status allowed matrix |
| Module 2 | `MdUom` | UOM validation |
| Module 3 | `PostingEngine` | Post inventory transactions |
| Module 3 | `OnHandService` | Query available stock |
| Module 3 | `TransactionQueryService` | Movement history |
| Module 3 | `ReconciliationService` | Run reconciliation |

### Modules that depend on Module 6:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 7 | `CreateMoveWork` | Tạo work cho move (WORK_BASED mode) |
| Module 10 | `InventoryControlEvent` | Capture billing events |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `IC.ONHAND.READ` | Tra cứu tồn kho |
| `IC.MOVEMENT.READ` | Xem lịch sử biến động |
| `IC.MOVE.CREATE` | Tạo move order |
| `IC.MOVE.CONFIRM` | Confirm move order |
| `IC.MOVE.EXECUTE` | Execute move order |
| `IC.MOVE.CANCEL` | Cancel move order |
| `IC.TRANSFER.CREATE` | Tạo transfer order |
| `IC.TRANSFER.RELEASE` | Release transfer |
| `IC.TRANSFER.SHIP` | Ship transfer |
| `IC.TRANSFER.RECEIVE` | Receive transfer |
| `IC.TRANSFER.CANCEL` | Cancel transfer |
| `IC.STATUS.CREATE` | Tạo status change |
| `IC.STATUS.REVERSE` | Reverse status change |
| `IC.COUNT.CREATE` | Tạo cycle count |
| `IC.COUNT.RELEASE` | Release count |
| `IC.COUNT.SUBMIT` | Submit count |
| `IC.COUNT.APPROVE` | Approve variance |
| `IC.COUNT.POST` | Post count adjustment |
| `IC.ADJ.CREATE` | Tạo adjustment |
| `IC.ADJ.SUBMIT` | Submit adjustment |
| `IC.ADJ.APPROVE` | Approve adjustment |
| `IC.ADJ.POST` | Post adjustment |
| `IC.RECON.RUN` | Run reconciliation |
| `IC.RECON.ASSIGN` | Assign reviewer |
| `IC.RECON.RESOLVE` | Resolve issue |

---

# Module 7: Work Execution & Mobile Operations

**Status:** ✅ Completed  
**Code Path:** `src/modules/work-execution`  
**Documentation:** [`docs/module-7-work-execution.md`](./module-7-work-execution.md)  
**Database Docs:** [`prisma/docs/module-7-work-execution.md`](../prisma/docs/module-7-work-execution.md)

## Database Tables (10 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `we_work_header` | Container work chính | Runtime Core |
| `we_work_line` | Từng dòng thực thi | Runtime Core |
| `we_work_assignment_history` | Lịch sử claim/release | Runtime Core |
| `we_work_status_history` | Lịch sử status changes | Runtime Core |
| `we_work_posting_link` | Liên kết M3 posting | Runtime Core |
| `we_work_event_log` | Event audit log | Trace |
| `we_work_exception` | Exception tracking | Trace |
| `we_mobile_sync_batch` | Mobile sync batches | Mobile |
| `we_mobile_sync_event` | Từng event trong batch | Mobile |
| `we_work_outbox_event` | Outbox cho callbacks | Integration |

## API Endpoints

### Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/works` | List works (dashboard) |
| GET | `/api/v1/works/:id` | Get work detail |
| GET | `/api/v1/works/:id/history` | Get work history |
| GET | `/api/v1/works/:id/exceptions` | Get work exceptions |
| GET | `/api/v1/works/dashboard/summary` | Dashboard summary |

### Command APIs - Header Level
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/works/:id/claim` | Claim work |
| POST | `/api/v1/works/:id/release` | Release work |
| POST | `/api/v1/works/:id/start` | Start work |
| POST | `/api/v1/works/:id/cancel` | Cancel work |

### Command APIs - Line Level
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/works/:id/lines/:lineNum/start` | Start line |
| POST | `/api/v1/works/:id/lines/:lineNum/complete` | Complete line |
| POST | `/api/v1/works/:id/lines/:lineNum/skip` | Skip line |
| POST | `/api/v1/works/:id/manager-override-complete` | Manager override |

### Mobile APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/mobile/works/available` | Available works to claim |
| GET | `/api/v1/mobile/works/my` | My claimed works |
| POST | `/api/v1/mobile/scan/validate` | Validate QR scan |
| POST | `/api/v1/mobile/works/sync` | Batch sync offline events |

### Internal API
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/internal/works/generate` | Generate work from trigger |

## Module Dependencies

### Module 7 depends on:
| Source Module | Entity/Service   | Usage                                  |
| ---------------| ------------------| ----------------------------------------|
| Module 1      | `NumberSequence` | Sinh work_id (WRK-*)                   |
| Module 1      | `ReasonCode`     | Validate reason codes                  |
| Module 1      | `AuditLog`       | Audit trail                            |
| Module 1      | `Idempotency`    | External ID check                      |
| Module 2      | `MdWarehouse`    | Warehouse validation                   |
| Module 2      | `MdLocation`     | Location validation                    |
| Module 2      | `MdItem`         | Item validation                        |
| Module 2      | `MdOwner`        | Owner validation                       |
| Module 3      | `PostingEngine`  | Post movement inventory                |
| Module 3      | `ReversalEngine` | Reverse posted transactions (HI-4 fix) |

### Modules that depend on Module 7:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 4 | `PutawayCompleted` | Callback khi putaway xong |
| Module 5 | `PickCompleted` | Callback khi pick xong |
| Module 6 | `MoveCompleted` | Callback khi move xong |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `WORK.EXECUTION.READ` | Xem work |
| `WORK.EXECUTION.CLAIM` | Claim/Release work |
| `WORK.EXECUTION.START` | Start work/line |
| `WORK.EXECUTION.COMPLETE` | Complete line |
| `WORK.EXECUTION.SKIP` | Skip line |
| `WORK.EXECUTION.CANCEL` | Cancel work |
| `WORK.EXECUTION.OVERRIDE` | Manager override |
| `WORK.EXECUTION.GENERATE` | Generate work từ trigger |
| `WORK.MOBILE.SYNC` | Mobile batch sync |
| `WORK.DASHBOARD.READ` | View dashboard |

---

# Module 8A: Trạm cân (Weighbridge)

**Status:** ✅ Completed  
**Code Path:** `src/modules/integration-platform`  
**Sidebar:** ⭐ **Trạm cân** (Top-level menu item)  
**Frontend Route:** `/app/integration/weighbridge`  
**Last Updated:** 2026-03-16

## Overview

Module Trạm cân quản lý toàn bộ quy trình cân xe tại kho, bao gồm:
- **Phiếu cân**: Tạo, xác nhận, ghi nhận trọng lượng (cân lần 1, lần 2)
- **Thiết bị cân**: Quản lý, giám sát trạng thái các trạm cân
- **Tích hợp ASN**: Liên kết phiếu cân với phiếu nhập (Receipt)

> 📌 **UI Location:** Sidebar → **Trạm cân** (standalone menu, không phải sub-menu của Trung tâm tích hợp)

## Database Tables (4 tables)

| # | Table Name | Description |
|---|------------|-------------|
| 1 | `m8_weighbridge_device` | Cấu hình thiết bị cân (tên, port, warehouse) |
| 2 | `m8_weighbridge_log` | Immutable log weigh events |
| 3 | `m8_weighbridge_event_state` | Processing state của weigh event |
| 4 | `m8_device_heartbeat` | Heartbeat history từ thiết bị |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/weighbridge/events` | Tạo phiếu cân (từ thiết bị hoặc manual) |
| GET | `/api/v1/integration/weighbridge/logs` | Danh sách phiếu cân (filter by status, referenceType) |
| GET | `/api/v1/integration/weighbridge/logs/:id` | Chi tiết phiếu cân |
| PUT | `/api/v1/integration/weighbridge/logs/:id` | Cập nhật ghi chú phiếu cân |
| POST | `/api/v1/integration/weighbridge/logs/:id/confirm` | Xác nhận phiếu cân → VALIDATED |
| POST | `/api/v1/integration/weighbridge/logs/:id/reject` | Từ chối phiếu cân (với lý do) |
| POST | `/api/v1/integration/weighbridge/logs/:id/record-weight` | Ghi nhận cân (lần 1 hoặc lần 2) |
| GET | `/api/v1/integration/weighbridge/devices` | Danh sách thiết bị cân |
| POST | `/api/v1/integration/weighbridge/heartbeat` | Device heartbeat |

## Weigh Log Status Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WEIGHBRIDGE LOG STATUS FLOW                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  RECEIVED ──confirm──> VALIDATED ──recordWeight──> WEIGHING ──recordWeight──> COMPLETED
│      │                     │                          │                          │
│      │                     │                          │                          │
│      └──reject──> FAILED   │                          │                    linkReceipt
│                            │                          │                          │
│                            └──────────────────────────┴─────────────────> LINKED │
│                                                                                  │
│                                                       (nếu trùng) ────> DUPLICATE│
└─────────────────────────────────────────────────────────────────────────────────┘
```

| Status | Tên hiển thị | Mô tả |
|--------|--------------|-------|
| `RECEIVED` | Tạo mới | Phiếu cân vừa tạo, chờ xác nhận |
| `VALIDATED` | Đã xác nhận | Đã xác nhận, sẵn sàng cân lần 1 |
| `WEIGHING` | Đang cân lần 2 | Đã cân lần 1 (gross), chờ cân lần 2 (tare) |
| `COMPLETED` | Hoàn thành | Đã cân xong cả 2 lần, có net weight |
| `LINKED` | Đã liên kết | Đã liên kết với Receipt/Shipment |
| `FAILED` | Thất bại | Bị từ chối |
| `DUPLICATE` | Trùng lặp | Phát hiện trùng với phiếu khác |

## M8A ↔ M4 Cascade Logic (DRAFT)

> ⚠️ **DRAFT**: Logic này có thể thay đổi theo yêu cầu khách hàng.

**Trigger 1 - Xác nhận phiếu cân:**
- M8 `confirmLog()` → VALIDATED
- M4 Receipt: `AWAITING_WEIGHING` → `WEIGHED_IN`
- M4 PO: `CONFIRMED` → `RECEIVING`

**Trigger 2 - Hoàn thành cân:**
- M8 `recordWeight()` lần 2 → COMPLETED
- M4 Receipt: `WEIGHED_IN` → `WEIGHED_OUT`
- M4 `ReceiptLine.receivedQty` = `netWeightKg`
- M4 `PO.totalReceivedQty` = SUM(Receipt.netWeightKg)

**Files liên quan:**
- `adapters/inbound-bridge.adapter_draft.ts`
- `config/feature-flags_draft.ts`

## Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INTEGRATION.WEIGHBRIDGE.INGEST` | Tạo phiếu cân (manual/agent) |
| `INTEGRATION.WEIGHBRIDGE.READ` | Xem danh sách phiếu cân |
| `INTEGRATION.WEIGHBRIDGE.UPDATE` | Cập nhật phiếu cân |
| `INTEGRATION.WEIGHBRIDGE.CONFIRM` | Xác nhận phiếu cân |
| `INTEGRATION.WEIGHBRIDGE.REJECT` | Từ chối phiếu cân |
| `INTEGRATION.WEIGHBRIDGE.RECORD_WEIGHT` | Ghi nhận cân |
| `INTEGRATION.WEIGHBRIDGE_DEVICE.READ` | Xem thiết bị cân |

---

# Module 8B: Integration Platform (Trung tâm tích hợp)

**Status:** ✅ Completed  
**Code Path:** `src/modules/integration-platform`  
**Sidebar:** Trung tâm tích hợp (với sub-menus: Giám sát, Cảnh báo, Kênh kết nối, OCR Scanner)  
**Last Updated:** 2026-03-16

## Overview
Module Integration Platform là **integration backbone** của hệ thống SWM, chịu trách nhiệm thu thập dữ liệu từ các nguồn bên ngoài (OCR, mobile, ERP), chuẩn hóa, lưu trữ và chuyển tiếp đến các module nghiệp vụ.

> 📌 **Note:** Phần Weighbridge đã được tách thành Module 8A riêng biệt với menu độc lập trên sidebar.

## Database Tables (8 tables)

| # | Table Name | Description |
|---|------------|-------------|
| 1 | `m8_ocr_result` | Raw OCR extraction result |
| 2 | `m8_ocr_confirmed_snapshot` | Confirmed/corrected OCR data |
| 3 | `m8_mobile_sync_batch` | Batch envelope từ mobile |
| 4 | `m8_mobile_sync_event` | Từng event trong batch |
| 5 | `m8_erp_push_log` | ERP push job + response history |
| 6 | `m8_integration_alert` | Alert read model |
| 7 | `m8_channel_health_snapshot` | Dashboard summary |
| 8 | `m8_device_heartbeat` | Heartbeat history |

## API Endpoints

### OCR APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/ocr/uploads` | Upload file for OCR |
| GET | `/api/v1/integration/ocr/results` | List OCR results |
| GET | `/api/v1/integration/ocr/results/:id` | Get OCR result detail |
| POST | `/api/v1/integration/ocr/results/:id/confirm` | Confirm/correct OCR |
| POST | `/api/v1/integration/ocr/results/:id/link` | Link to receipt |
| POST | `/api/v1/integration/ocr/results/:id/reject` | Reject OCR result |

### Mobile Sync APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/mobile-sync/batches` | Submit batch events |
| GET | `/api/v1/integration/mobile-sync/batches` | List batches |
| GET | `/api/v1/integration/mobile-sync/batches/:id` | Get batch detail |
| GET | `/api/v1/integration/mobile-sync/events/:id` | Get event detail |
| POST | `/api/v1/integration/mobile-sync/events/:id/replay` | Replay event |

### ERP Push APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/erp-push/jobs` | Enqueue push job |
| GET | `/api/v1/integration/erp-push/jobs` | List push jobs |
| GET | `/api/v1/integration/erp-push/jobs/:id` | Get job detail |
| POST | `/api/v1/integration/erp-push/jobs/:id/retry` | Manual retry |
| POST | `/api/v1/integration/erp-push/jobs/:id/cancel` | Cancel job |

### Monitoring APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/integration/monitoring/overview` | Dashboard summary |
| GET | `/api/v1/integration/monitoring/channel-health` | Channel health |
| GET | `/api/v1/integration/alerts` | List alerts |
| GET | `/api/v1/integration/alerts/:id` | Get alert detail |
| POST | `/api/v1/integration/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/v1/integration/alerts/:id/resolve` | Resolve alert |

## Module Dependencies

### Module 8 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh IDs |
| Module 1 | `ReasonCode` | manual_weight, recovery |
| Module 1 | `AuditLog` | Audit trail |
| Module 2 | `MdWarehouse` | Device scope |
| Module 2 | `MdLocation` | Mobile sync validation |

### Modules that depend on Module 8:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 4 | `WeightCaptured`, `OCRConfirmed`, `confirmReceipt`, `weighOut` | Inbound weighing + OCR + cascade |
| Module 5 | `WeightCaptured` | Outbound weighing |
| Module 7 | `MobileSyncEventReceived` | Work execution |
| Module 10 | `ERPPushCompleted` | Billing sync |

## RBAC Permissions

Tất cả endpoints trong Module 8 được bảo vệ bởi `AuthGuard` và `PermissionGuard`.

| Permission Code | Description |
|-----------------|-------------|
| `INTEGRATION.WEIGHBRIDGE.INGEST` | Ingest weigh events (agent/manual) |
| `INTEGRATION.WEIGHBRIDGE.READ` | View weighbridge logs |
| `INTEGRATION.WEIGHBRIDGE.UPDATE` | Update weigh log |
| `INTEGRATION.WEIGHBRIDGE.CONFIRM` | Confirm weigh log |
| `INTEGRATION.WEIGHBRIDGE.REJECT` | Reject weigh log |
| `INTEGRATION.WEIGHBRIDGE.RECORD_WEIGHT` | Record weight (cân lần 2) |
| `INTEGRATION.WEIGHBRIDGE.REPROCESS` | Reprocess callback |
| `INTEGRATION.WEIGHBRIDGE_DEVICE.READ` | List weighbridge devices |
| `INTEGRATION.WEIGHBRIDGE_DEVICE.HEARTBEAT` | Send device heartbeat |
| `INTEGRATION.OCR.UPLOAD` | Upload OCR files |
| `INTEGRATION.OCR.READ` | View OCR results |
| `INTEGRATION.OCR.CONFIRM` | Confirm/correct OCR |
| `INTEGRATION.OCR.LINK` | Link OCR to receipt |
| `INTEGRATION.OCR.REJECT` | Reject OCR result |
| `INTEGRATION.MOBILE_SYNC.SUBMIT` | Submit mobile batch |
| `INTEGRATION.MOBILE_SYNC.READ` | View sync status |
| `INTEGRATION.MOBILE_SYNC.REPLAY` | Replay failed events |
| `INTEGRATION.ERP_PUSH.ENQUEUE` | Enqueue ERP push job |
| `INTEGRATION.ERP_PUSH.READ` | View ERP push jobs |
| `INTEGRATION.ERP_PUSH.RETRY` | Manual retry job |
| `INTEGRATION.ERP_PUSH.CANCEL` | Cancel job |
| `INTEGRATION.MONITORING.VIEW` | View monitoring dashboard |
| `INTEGRATION.ALERT.READ` | View alerts |
| `INTEGRATION.ALERT.ACKNOWLEDGE` | Acknowledge alert |
| `INTEGRATION.ALERT.RESOLVE` | Resolve alert |

## Technical Notes

- **Weight calculations**: Sử dụng `decimal.js` để đảm bảo độ chính xác
- **Transaction atomicity**: Multi-step operations wrap trong `$transaction`:
  - `weighbridge-ingest`: log + event_state
  - `mobile-sync-batch`: batch + events  
  - `ocr-confirmation`: snapshot + result status
- **OCR confidence**: Per-field thresholds (BL/Vehicle: 90%, Others: 85%)
- **Known Limitations (Phase 1)**: OCR/ERP mock, callback dispatch stub

## Cross-Module Integration (DRAFT)

> ⚠️ **DRAFT**: Logic dưới đây chưa được xác nhận với khách hàng, có thể thay đổi.

### M8 → M4: Weighbridge → Inbound Receipt

**Files liên quan (suffix `_draft` để đánh dấu tạm thời):**
| File | Mục đích |
|------|----------|
| `adapters/inbound-bridge.adapter_draft.ts` | Adapter xử lý logic cross-module |
| `config/feature-flags_draft.ts` | Feature flags để bật/tắt logic |

**Flow:**
```
M8 WeighLog (RECEIVED) 
    → confirmLog() 
    → VALIDATED 
    → [DRAFT] InboundBridgeAdapter.onWeighLogConfirmed()
    → M4 Receipt (AWAITING_WEIGHING → WEIGHED_IN)
```

**Trigger Mapping:**
| M8 Action | M8 Status | M4 Action | M4 Status |
|-----------|-----------|-----------|-----------|
| Confirm weigh log | VALIDATED | onWeighLogConfirmed() | Receipt: AWAITING_WEIGHING → WEIGHED_IN |
| (cascade) | - | updatePOStatusIfNeeded() | PO: CONFIRMED → RECEIVING |
| Record weight lần 2 | COMPLETED | onWeighLogCompleted() | Receipt: WEIGHED_IN → WEIGHED_OUT |
| (cascade) | - | aggregatePOReceivedQty() | PO.totalReceivedQty = SUM(Receipt.netWeightKg) |

### M8 COMPLETED → M4 Receipt + PO (DRAFT)

**Logic:** Khi phiếu cân hoàn thành (cân lần 2), tự động:
1. Cập nhật Receipt: `tareWeightKg`, `netWeightKg`, status → `WEIGHED_OUT`
2. Fill `netWeightKg` vào `receivedQty` của ReceiptLine
3. Aggregate `totalReceivedQty` của PO từ các ASN đã done

```
M8 WeighLog (WEIGHING)
    → recordWeight() [lần 2]
    → COMPLETED
    → [DRAFT] InboundBridgeAdapter.onWeighLogCompleted()
    → M4 Receipt (WEIGHED_IN → WEIGHED_OUT)
    → M4 ReceiptLine.receivedQty = netWeightKg
    → M4 PO.totalReceivedQty = SUM(Receipt.netWeightKg)
```

### PO ↔ ASN Status Cascade

**Logic:** 1 PO có nhiều ASN (Receipt). Chỉ cần 1 ASN chuyển sang trạng thái "đang cân" (WEIGHED_IN) thì PO chuyển sang trạng thái "đang nhập" (RECEIVING).

```
PO (CONFIRMED)
├── ASN-1 (DRAFT)
├── ASN-2 (AWAITING_WEIGHING) → WEIGHED_IN  ← Trigger
└── ASN-3 (DRAFT)

→ PO chuyển sang RECEIVING
```

**Điều kiện:**
- PO phải đang ở trạng thái `CONFIRMED`
- ASN phải có `poId` link với PO
- Chỉ cần 1 ASN đang cân là đủ trigger

**Cách tắt logic này:**
1. Set `FEATURES.M8_M4_AUTO_SYNC = false` trong `feature-flags_draft.ts`
2. Hoặc xóa các file có suffix `_draft`

**Cách xóa hoàn toàn:**
1. Xóa `adapters/inbound-bridge.adapter_draft.ts`
2. Xóa `config/feature-flags_draft.ts`
3. Xóa import và gọi adapter trong `weighbridge-log.service.ts` (tìm `[DRAFT]`)

**Design Decisions (TBD):**
- Hiện dùng direct service call trong adapter
- Có thể chuyển sang event-driven nếu cần
- Silent fail: Lỗi chỉ log warning, không block M8 flow

---

# Module 9: VAS / Bagging Operations

**Status:** ✅ Completed  
**Version:** 1.1.0  
**Code Path:** `src/modules/vas`  
**Documentation:** [`docs/module-9-vas.md`](./module-9-vas.md)  
**Database Docs:** [`prisma/docs/module-9-vas.md`](../prisma/docs/module-9-vas.md)

### Key Features (v1.1.0)
- ✅ Real M3 PostingEngine + HoldService integration via `InventoryCoreAdapter`
- ✅ RBAC with `VasAuthGuard` + `VasPermissionGuard` on all endpoints
- ✅ Packaging availability check before each session

## Database Tables (5 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `vas_work_order` | Header work order đóng bao | Core |
| `vas_session` | Session progress theo ca | Core |
| `vas_state_history` | Lịch sử chuyển trạng thái | Audit |
| `vas_exception_log` | Log exception nghiệp vụ | Logging |
| `vas_outbox` | Billing event outbox | Async |

## API Endpoints

### Work Order Command APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/vas-wo` | Create VAS Work Order |
| PATCH | `/api/v1/vas-wo/:id` | Update Work Order (DRAFT only) |
| POST | `/api/v1/vas-wo/:id/confirm` | Confirm WO & reserve stock |
| POST | `/api/v1/vas-wo/:id/complete` | Complete WO & post inventory |
| POST | `/api/v1/vas-wo/:id/cancel` | Cancel WO & release reservation |

### Work Order Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/vas-wo` | List Work Orders |
| GET | `/api/v1/vas-wo/:id` | Get WO detail with sessions |
| GET | `/api/v1/vas-wo/:id/sessions` | Get WO sessions |
| GET | `/api/v1/vas-wo/:id/history` | Get state history |

### Session APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/vas-wo/:id/session` | Add session progress |

## Module Dependencies

### Module 9 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | WO number generation |
| Module 1 | `ReasonCode` | Cancel/variance reasons |
| Module 1 | `AuditLog` | Audit trail |
| Module 2 | `MdOwner` | Owner reference |
| Module 2 | `MdItem` | Bulk/Bagged/Packaging items |
| Module 2 | `MdWarehouse` | Warehouse reference |
| Module 3 | `OnHand` | Stock availability check |
| Module 3 | `InventoryHold` | Reserve bulk stock |
| Module 3 | `InventTrans` | Post inventory transactions |

### Modules that depend on Module 9:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 5 | `reserved_qty_vas` | Check VAS reservation khi allocate |
| Module 10 | `BAGGING_FEE_CAPTURE` | Billing event from outbox |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `VAS.WO.CREATE` | Create work order |
| `VAS.WO.UPDATE` | Update work order |
| `VAS.WO.CONFIRM` | Confirm work order |
| `VAS.WO.COMPLETE` | Complete work order |
| `VAS.WO.CANCEL` | Cancel work order |
| `VAS.WO.READ` | View work orders |
| `VAS.SESSION.CREATE` | Add session |
| `VAS.SESSION.READ` | View sessions |

---

# Module 10: Billing & Commercial Control

**Status:** ✅ Completed  
**Version:** 1.1.0  
**Code Path:** `src/modules/billing`  
**Documentation:** [`docs/module-10-billing.md`](./module-10-billing.md)  
**Database Docs:** [`prisma/docs/module-10-billing.md`](../prisma/docs/module-10-billing.md)  
**Last Updated:** 2026-03-09

### Recent Updates (v1.1.0)
- Added `PermissionGuard` + `@Permission()` decorator to all endpoints
- Added `InternalApiGuard` for `/internal/*` endpoints  
- Fixed race conditions with `lockForUpdate` in state transitions
- Added `StorageSnapshotService` for daily storage fee calculation
- Added ERP push outbox entry on DN lock

## Database Tables (12 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `bil_contract` | Header contract tính phí | Config |
| `bil_contract_fee_line` | Fee lines theo contract | Config |
| `bil_day_type_calendar` | Day type + multiplier | Config |
| `bil_event` | Billing events đã normalize | Runtime |
| `bil_snapshot_run` | Snapshot run metadata | Runtime |
| `bil_storage_snapshot` | Daily storage snapshot | Runtime |
| `bil_debit_note` | DN header | Workflow |
| `bil_debit_note_line` | DN charge lines | Workflow |
| `bil_debit_note_history` | DN state history | Workflow |
| `bil_exception` | Exception queue | Exception |
| `bil_erp_push_outbox` | ERP push outbox | Integration |
| `bil_erp_push_log` | ERP push log | Integration |

## API Endpoints

### Contract APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/contracts` | Create contract |
| GET | `/api/v1/billing/contracts` | List contracts |
| GET | `/api/v1/billing/contracts/:id` | Get contract detail |
| PUT | `/api/v1/billing/contracts/:id` | Update contract |
| POST | `/api/v1/billing/contracts/:id/activate` | Activate contract |
| POST | `/api/v1/billing/contracts/:id/deactivate` | Deactivate contract |
| GET | `/api/v1/billing/contracts/:id/fee-lines` | Get fee lines |

### Day Type APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/day-types` | Upsert day type |
| POST | `/api/v1/billing/day-types/bulk` | Bulk upsert |
| GET | `/api/v1/billing/day-types` | List day types |

### Billing Event APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/events` | Query events |
| GET | `/api/v1/billing/events/:id` | Get event detail |
| POST | `/internal/billing/events/capture` | Internal event capture |

### Debit Note APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/debit-notes` | Generate DN |
| GET | `/api/v1/billing/debit-notes` | List DNs |
| GET | `/api/v1/billing/debit-notes/:id` | Get DN detail |
| PUT | `/api/v1/billing/debit-notes/:id/review` | Review DN |
| PUT | `/api/v1/billing/debit-notes/:id/approve` | Approve DN |
| PUT | `/api/v1/billing/debit-notes/:id/lock` | Lock DN |
| GET | `/api/v1/billing/debit-notes/:id/history` | DN history |

### Exception APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/exceptions` | List exceptions |
| GET | `/api/v1/billing/exceptions/:id` | Get exception detail |
| PUT | `/api/v1/billing/exceptions/:id/resolve` | Resolve exception |

## Module Dependencies

### Module 10 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh DN-*, CONTRACT-* |
| Module 1 | `ReasonCode` | Exception resolution |
| Module 1 | `AuditLog` | Audit trail |
| Module 1 | `Idempotency` | Command idempotency |
| Module 2 | `MdOwner` | Owner reference |
| Module 2 | `MdItem` | Item/cargo_form |
| Module 2 | `MdWarehouse` | Warehouse scope |
| Module 3 | `OnHand` | Storage snapshot |

### Event Sources:
| Module | Event | Usage |
|--------|-------|-------|
| Module 4 | `ReceiptCompleted` | INBOUND_HANDLING event |
| Module 5 | `ShipmentCompleted` | OUTBOUND_HANDLING event |
| Module 9 | `VasWoCompleted` | BAGGING_FEE event |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `BILLING.CONTRACT.CREATE` | Create contract |
| `BILLING.CONTRACT.UPDATE` | Update contract |
| `BILLING.CONTRACT.READ` | View contracts |
| `BILLING.DAY_TYPE.MANAGE` | Manage day types |
| `BILLING.EVENT.READ` | View billing events |
| `BILLING.DN.GENERATE` | Generate DN |
| `BILLING.DN.READ` | View DNs |
| `BILLING.DN.REVIEW` | Review DN |
| `BILLING.DN.APPROVE` | Approve DN |
| `BILLING.DN.LOCK` | Lock DN |
| `BILLING.EXCEPTION.READ` | View exceptions |
| `BILLING.EXCEPTION.RESOLVE` | Resolve exception |

---

# Module 11: Reporting, Audit & Go-Live Control

**Status:** ✅ Completed  
**Code Path:** `src/modules/reporting`  
**Documentation:** [`docs/module-11-reporting.md`](./module-11-reporting.md)  
**Database Docs:** [`prisma/docs/module-11-reporting.md`](../prisma/docs/module-11-reporting.md)

## Database Tables (12 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `rpt_report_catalog` | Catalog các report | Config |
| `rpt_reconciliation_check` | Catalog các check reconciliation | Config |
| `rpt_export_job` | Export job header | Export |
| `rpt_export_job_event` | Export job events | Export |
| `rpt_reconciliation_run` | Reconciliation run header | Reconciliation |
| `rpt_reconciliation_result` | Reconciliation mismatch results | Reconciliation |
| `rpt_reconciliation_resolution` | Resolution history | Reconciliation |
| `rpt_go_live_gate` | Gate catalog | Go-Live |
| `rpt_go_live_gate_status` | Effective gate status | Go-Live |
| `rpt_go_live_signoff_history` | Sign-off history | Go-Live |
| `rpt_report_run_log` | Report execution log | Logging |
| `rpt_dashboard_cache` | Dashboard widget cache | Cache |

## API Endpoints

### Dashboard APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/dashboard/summary` | Dashboard widgets summary |
| GET | `/api/v1/reporting/dashboard/widgets/:code` | Single widget data |

### Inventory Report APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/inventory/on-hand` | On-hand report |
| GET | `/api/v1/reporting/inventory/movement` | Movement history |
| GET | `/api/v1/reporting/inventory/aging` | Aging report |
| GET | `/api/v1/reporting/inventory/inbound-summary` | Inbound summary |
| GET | `/api/v1/reporting/inventory/outbound-summary` | Outbound summary |
| GET | `/api/v1/reporting/inventory/utilization` | Location utilization |

### Reconciliation APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reporting/reconciliation/run` | Trigger reconciliation |
| GET | `/api/v1/reporting/reconciliation/results` | List results |
| GET | `/api/v1/reporting/reconciliation/results/:id` | Get result detail |
| POST | `/api/v1/reporting/reconciliation/results/:id/resolve` | Resolve mismatch |

### Go-Live Control APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reporting/go-live/status` | Overall readiness status |
| POST | `/api/v1/reporting/go-live/check` | Run auto gate checks |
| POST | `/api/v1/reporting/go-live/gates/:id/sign-off` | Manual sign-off |
| GET | `/api/v1/reporting/go-live/history` | Sign-off history |

### Export APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reporting/exports` | Create export job |
| GET | `/api/v1/reporting/exports/:id` | Get export status |
| GET | `/api/v1/reporting/exports/:id/download` | Download file |
| GET | `/api/v1/reporting/exports` | List user exports |

## Module Dependencies

### Module 11 depends on:
| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `AuditLog` | User activity report |
| Module 1 | `Idempotency` | Reconciliation/export idempotency |
| Module 2 | `MdOwner` | Scope filtering |
| Module 2 | `MdWarehouse` | Scope filtering |
| Module 2 | `MdItem` | Report dimensions |
| Module 3 | `InventTrans`, `OnHand` | Inventory reports |
| Module 4 | `Receipt*` | Inbound reports |
| Module 5 | `Shipment*` | Outbound reports |
| Module 7 | `WeWork*` | Work queue dashboard |
| Module 10 | `BilEvent`, `BilDebitNote` | Billing reports |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `REPORTING.DASHBOARD.READ` | View dashboard |
| `REPORTING.INVENTORY.READ` | View inventory reports |
| `REPORTING.BILLING.READ` | View billing reports |
| `REPORTING.AUDIT.READ` | View audit reports |
| `REPORTING.RECONCILIATION.RUN` | Run reconciliation |
| `REPORTING.RECONCILIATION.READ` | View reconciliation results |
| `REPORTING.RECONCILIATION.RESOLVE` | Resolve mismatch |
| `REPORTING.GOLIVE.READ` | View go-live status |
| `REPORTING.GOLIVE.CHECK` | Run go-live checks |
| `REPORTING.GOLIVE.SIGNOFF` | Sign-off gates |
| `REPORTING.EXPORT.CREATE` | Create export jobs |
| `REPORTING.EXPORT.READ` | View/download exports |

---

# Cross-Module Integration: M4 Inbound ↔ M8 Weighbridge

**Status:** ✅ Implemented (Draft - Feature Flag Controlled)  
**Last Updated:** 2026-03-18  
**Feature Flag:** `FEATURES.M8_M4_AUTO_SYNC`

## Tổng quan

Module M8 (Weighbridge) và M4 (Inbound) có quan hệ cascade status khi xử lý flow cân nhập hàng. M8 là nơi ghi nhận dữ liệu cân, M4 quản lý trạng thái Receipt (ASN) và Purchase Order (PO).

## State Mapping

### Weigh Log ↔ Receipt Status

| M8 Weigh Log Status | M4 Receipt (ASN) Status | Label Frontend | Trigger |
|---------------------|-------------------------|----------------|---------|
| `RECEIVED` | - | Tạo mới | Ingest weigh event |
| `VALIDATED` | `WEIGHED_IN` | Đang cân lần 1 | `confirmLog()` |
| `WEIGHING` | `PROCESSING` | Đang cân lần 2 | `recordWeight()` lần 1 |
| `COMPLETED` | `WEIGHED_OUT` | Đã hoàn thành | `recordWeight()` lần 2 |

### Receipt Status ↔ PO Status

| M4 Receipt Status | M4 PO Status | Condition |
|-------------------|--------------|-----------|
| `WEIGHED_IN` | `RECEIVING` | Khi có ≥1 ASN chuyển sang WEIGHED_IN |
| `WEIGHED_OUT` | `RECEIVING` | Aggregate `totalReceivedQty` |

## Bridge Methods

**File:** `src/modules/integration-platform/adapters/inbound-bridge.adapter_draft.ts`

| Method | Trigger | M8 Status | M4 Receipt Action | M4 PO Action |
|--------|---------|-----------|-------------------|--------------|
| `onWeighLogConfirmed()` | `confirmLog()` | VALIDATED | AWAITING_WEIGHING → WEIGHED_IN | CONFIRMED → RECEIVING |
| `onGrossWeightRecorded()` | `recordWeight()` lần 1 | WEIGHING | WEIGHED_IN → PROCESSING | - |
| `onWeighLogCompleted()` | `recordWeight()` lần 2 | COMPLETED | PROCESSING → WEIGHED_OUT | Aggregate `totalReceivedQty` |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ M8 Weighbridge                                                              │
│                                                                             │
│  [1] confirmLog()          [2] recordWeight(gross)    [3] recordWeight(tare)│
│       VALIDATED                  WEIGHING                   COMPLETED       │
│          │                          │                          │            │
└──────────┼──────────────────────────┼──────────────────────────┼────────────┘
           │                          │                          │
           ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ M4 Inbound                                                                  │
│                                                                             │
│  ASN: AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT             │
│       (Chờ cân)           (Đang cân 1)  (Đang cân 2)  (Đã hoàn thành)       │
│                                                             │               │
│  PO:  CONFIRMED → RECEIVING                                 │               │
│       (Xác nhận)   (Đang nhập)                              │               │
│                         │                                   │               │
│                         └──────── totalReceivedQty ◄────────┘               │
│                                   = SUM(netWeightKg)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sync - Cân hoàn thành

Khi `recordWeight()` lần 2 (COMPLETED):

| Field | Source | Target | Description |
|-------|--------|--------|-------------|
| `netWeightKg` | WeighLog | `ReceiptHeader.netWeightKg` | TL hàng ròng |
| `netWeightKg` | WeighLog | `ReceiptLine.receivedQty` | SL đã nhận của ASN |
| SUM(`netWeightKg`) | Aggregate | `PO.totalReceivedQty` | Tổng SL đã nhận của PO |

**Aggregate Logic:**
```typescript
// Chỉ cộng các ASN có status ≥ WEIGHED_OUT
const doneStatuses = ['WEIGHED_OUT', 'RECEIVED', 'PUTAWAY', 'CLOSED'];
const totalReceivedQty = await prisma.receiptHeader.aggregate({
  where: { poId, status: { in: doneStatuses } },
  _sum: { netWeightKg: true },
});
```

## Feature Flag Control

**File:** `src/modules/integration-platform/config/feature-flags_draft.ts`

```typescript
export const FEATURES = {
  // Bật/tắt auto sync M8→M4
  M8_M4_AUTO_SYNC: true,
  
  // Verbose logging cho debug
  M8_M4_VERBOSE_LOGGING: true,
};
```

## Files liên quan

| File | Mô tả |
|------|-------|
| `adapters/inbound-bridge.adapter_draft.ts` | Bridge adapter xử lý cascade |
| `config/feature-flags_draft.ts` | Feature flags |
| `services/weighbridge-log.service.ts` | Gọi bridge methods |

## Notes

- Bridge logic chạy **async** trong cùng transaction với M8 action
- Nếu bridge fail, M8 action vẫn succeed (silent fail, chỉ log warning)
- Có thể tắt hoàn toàn bằng `M8_M4_AUTO_SYNC = false`
- Status history được ghi vào `receipt_status_history` với `transitionCode` tương ứng

---
