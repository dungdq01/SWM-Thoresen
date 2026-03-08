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

**Status:** ✅ Completed (Feedback Fixed v2)  
**Code Path:** `src/modules/inbound`  
**Documentation:** [`docs/module-4-inbound.md`](./module-4-inbound.md)  
**Database Docs:** [`prisma/docs/module-4-inbound.md`](../prisma/docs/module-4-inbound.md)  
**Last Updated:** 2026-03-08 (FB-v2)

### Feedback Fixes Applied

| Issue ID | Description | Status |
|----------|-------------|--------|
| CR-2 | createReceipt wrapped in $transaction | ✅ Fixed |
| HI-1 | BaggedPolicy.checkOverReceipt wired + overReceiptBlocked enabled | ✅ Fixed (v2) |
| HI-3 | Atomic receipt number generation | ✅ Fixed |
| HI-4 | lockForUpdate called in all commands | ✅ Fixed |
| HI-6 | Single-line guard added | ✅ Fixed |
| MD-3 | Controller ternary bug | ✅ Fixed |
| MD-4 | Use validated value instead of req.body | ✅ Fixed |
| CR-1 | M3 PostingEngine integration | 🔜 Pending M3 interface |
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

**Status:** ✅ Implemented (Feedback Fixed v1)  
**Code Path:** `src/modules/outbound`  
**Documentation:** [`docs/module-5-outbound.md`](./module-5-outbound.md)  
**Database Docs:** [`prisma/docs/module-5-outbound.md`](../prisma/docs/module-5-outbound.md)  
**Last Updated:** 2026-03-08 (FB-v1)

### Feedback Fixes Applied

| Issue ID | Description | Status |
|----------|-------------|--------|
| HI-2 | Tolerance 4-level cascade lookup | ✅ Fixed |
| HI-3 | Allocation wrapped in $transaction | ✅ Fixed |
| HI-4 | decidedBy extracted from x-user-id header | ✅ Fixed |
| HI-6 | lockForUpdate called before allocation | ✅ Fixed |
| CR-1 | Real M3 OnHand/Hold integration | 🔜 Pending M3 interface |
| CR-2 | M3 Posting at SHIPPED | 🔜 Pending M3 interface |
| CR-3 | RBAC guards on controllers | 🔜 Pending M1 AuthGuard |

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
