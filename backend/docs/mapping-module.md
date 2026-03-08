# SWMS Backend Module Mapping

> Tài liệu ánh xạ tổng quan giữa các module, code path, database tables và API endpoints.

---

## Tổng quan

| Module | Status | Code Path | DB Tables | API Endpoints |
|--------|--------|-----------|-----------|---------------|
| Module 1 - Foundation | ✅ Completed | `src/modules/foundation` | 14 tables | ~25 endpoints |
| Module 2 - Master Data | ✅ Completed | `src/modules/master-data` | 17 tables | ~55 endpoints |
| Module 3 - Inventory Core | ✅ Completed | `src/modules/inventory-core` | 10 tables | ~13 endpoints |
| Module 4 - Inbound | ✅ Completed | `src/modules/inbound` | 6 tables | ~14 endpoints |
| Module 5 - Outbound | ✅ Completed | `src/modules/outbound` | 10 tables | ~18 endpoints |
| Module 6 - Inventory Control | ✅ Completed | `src/modules/inventory-control` | 13 tables | ~39 endpoints |
| Module 7 - Work Execution | ✅ Completed | `src/modules/work-execution` | 10 tables | ~20 endpoints |
| Module 8 - Integration Platform | ✅ Completed | `src/modules/integration` | 12 tables | ~20 endpoints |
| Module 9 - VAS / Bagging | ✅ Completed | `src/modules/vas` | 5 tables | ~11 endpoints |
| Module 10 - Billing | ✅ Completed | `src/modules/billing` | 12 tables | ~22 endpoints |

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
| Module 1 | `LogService` | AuditLog integration qua AuditLogAdapter |
| Module 2 | `MdWarehouse` | Dimension validation |
| Module 2 | `MdLocation` | Dimension validation |
| Module 2 | `MdOwner` | Dimension + transaction owner |
| Module 2 | `MdInventoryStatus` | Dimension + allocatable check |
| Module 2 | `MdItem` | Item validation |
| Module 2 | `MdUom` | UOM validation |

### Modules that depend on Module 3:
| Target Module | Dependency                                       | Usage                            |
| ---------------| --------------------------------------------------| ----------------------------------|
| Module 4      | `PostingEngineService`                           | Post receipt inbound             |
| Module 5      | `PostingEngineService`, `HoldService`            | Allocate + ship outbound         |
| Module 6      | `PostingEngineService`                           | Adjustment, status change, count |
| Module 7      | `PostingEngineService`                           | Putaway, pick movement           |
| Module 9      | `PostingEngineService`                           | VAS consume/produce              |
| Module 10     | `SnapshotService`, `DailyStorageSnapshot`        | Billing input                    |
| Module 11     | `ReconciliationService`, `InventTrans`, `OnHand` | Reporting queries                |

## Backend Services (8 services)

| Service | Description |
|---------|-------------|
| `PostingEngineService` | Core posting logic with idempotency |
| `ReversalEngineService` | Reversal with externalId idempotency check |
| `HoldService` | Hold/allocation management |
| `OnHandService` | OnHand query with Decimal.js + DB GROUP BY |
| `TransactionQueryService` | Transaction history queries |
| `InventDimService` | Dimension management with hash |
| `ReconciliationService` | Ledger vs OnHand comparison |
| `SnapshotService` | Daily storage snapshot for M10 Billing |

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

**Status:** ✅ Completed (Feedback Fixed v3 - CR-1 DONE)  
**Code Path:** `src/modules/inbound`  
**Documentation:** [`docs/module-4-inbound.md`](./module-4-inbound.md)  
**Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
**Last Updated:** 2026-03-08 (FB-v3)

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

## Database Tables (6 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `receipt_header` | Header phiếu nhận hàng | Runtime |
| `receipt_line` | Dòng hàng trong receipt | Runtime |
| `receipt_weighing_log` | Log cân weigh-in/weigh-out | Audit |
| `receipt_status_history` | Lịch sử chuyển trạng thái | Audit |
| `receipt_exception_log` | Log exception nghiệp vụ | Audit |
| `receipt_integration_state` | Trạng thái sync với M3/M7/M10 | Control |

## API Endpoints

### Receipt Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới |
| GET | `/api/v1/inbound/receipts` | List receipts (paginated) |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt by ID |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh receipt |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing |

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
| **Module 3** | **`PostingEngineService`** | **Post inventory khi RECEIVED (✅ v3)** |

### Modules that depend on Module 4:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 7 | `CreatePutawayWork` | Tạo putaway work khi RECEIVED |
| Module 10 | `InboundHandlingCaptured` | Capture billing event |

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `INBOUND.RECEIPT.CREATE` | Tạo receipt |
| `INBOUND.RECEIPT.READ` | Xem receipt |
| `INBOUND.RECEIPT.CONFIRM` | Confirm receipt |
| `INBOUND.RECEIPT.CANCEL` | Cancel receipt |
| `INBOUND.RECEIPT.REWEIGH` | Reweigh receipt |
| `INBOUND.RECEIPT.CLOSE` | Close receipt |
| `INBOUND.WEIGH.RECEIVE` | Nhận weigh events |
| `INBOUND.DASHBOARD.READ` | Xem dashboard |

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

## Database Tables

| Table Name | Description |
|------------|-------------|
| `shipment_header` | Header nghiệp vụ cho trip outbound |
| `shipment_line` | Dòng hàng trong shipment |
| `shipment_allocation_record` | Trace allocation từ stock source |
| `shipment_weighing_attempt` | Log tare/gross/manual override |
| `shipment_status_history` | Lịch sử chuyển trạng thái |
| `shipment_exception_log` | Log exception nghiệp vụ |
| `shipment_approval_decision` | Quyết định approve/reject |
| `shipment_pick_work_link` | Mapping với work từ M7 |
| `shipment_posting_link` | Mapping với posting sang M3 |
| `shipment_so_link` | Link shipment với SO |

## API Endpoints

### Shipment Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments` | Tạo shipment mới |
| GET | `/api/v1/outbound/shipments` | List shipments (paginated) |
| GET | `/api/v1/outbound/shipments/:id` | Get shipment detail |
| PATCH | `/api/v1/outbound/shipments/:id` | Update shipment (DRAFT only) |
| POST | `/api/v1/outbound/shipments/:id/confirm` | Confirm shipment |
| POST | `/api/v1/outbound/shipments/:id/cancel` | Cancel shipment |

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
| Module 3 | `PostingEngine` | Post outbound transaction |

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

# Module 8: Integration Platform

## Overview
Module 8 là **integration backbone** của hệ thống SWM, chịu trách nhiệm thu thập dữ liệu từ các nguồn bên ngoài (weighbridge, OCR, mobile), chuẩn hóa, lưu trữ và chuyển tiếp đến các module nghiệp vụ.

**Code Path:** `src/modules/integration-platform`

## Database Tables

| # | Table Name | Description |
|---|------------|-------------|
| 1 | `m8_weighbridge_device` | Cấu hình thiết bị cân |
| 2 | `m8_weighbridge_log` | Immutable log weigh events |
| 3 | `m8_weighbridge_event_state` | Processing state của weigh event |
| 4 | `m8_ocr_result` | Raw OCR extraction result |
| 5 | `m8_ocr_confirmed_snapshot` | Confirmed/corrected OCR data |
| 6 | `m8_mobile_sync_batch` | Batch envelope từ mobile |
| 7 | `m8_mobile_sync_event` | Từng event trong batch |
| 8 | `m8_erp_push_log` | ERP push job + response history |
| 9 | `m8_integration_alert` | Alert read model |
| 10 | `m8_channel_health_snapshot` | Dashboard summary |
| 11 | `m8_device_heartbeat` | Heartbeat history |

## API Endpoints

### Weighbridge APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integration/weighbridge/events` | Ingest weigh event |
| POST | `/api/v1/integration/weighbridge/heartbeat` | Device heartbeat |
| GET | `/api/v1/integration/weighbridge/logs` | Query weigh logs |
| GET | `/api/v1/integration/weighbridge/logs/:id` | Get log detail |
| POST | `/api/v1/integration/weighbridge/events/:id/reprocess` | Reprocess callback |
| GET | `/api/v1/integration/weighbridge/devices` | List devices |

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
| Module 4 | `WeightCaptured`, `OCRConfirmed` | Inbound weighing + OCR |
| Module 5 | `WeightCaptured` | Outbound weighing |
| Module 7 | `MobileSyncEventReceived` | Work execution |
| Module 10 | `ERPPushCompleted` | Billing sync |

## RBAC Permissions

Tất cả endpoints trong Module 8 được bảo vệ bởi `AuthGuard` và `PermissionGuard`.

| Permission Code | Description |
|-----------------|-------------|
| `INTEGRATION.WEIGHBRIDGE.INGEST` | Ingest weigh events (agent) |
| `INTEGRATION.WEIGHBRIDGE.READ` | View weighbridge logs |
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
