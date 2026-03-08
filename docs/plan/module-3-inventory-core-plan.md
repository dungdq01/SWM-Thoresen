# Module 3: Inventory Core Engine - Implementation Plan

**Module:** Inventory Core Engine  
**Status:** 🚧 In Progress  
**Start Date:** 2026-03-08  
**Code Path:** `src/modules/inventory-core`

---

## 1. Mô tả nghiệp vụ

Module 3 là **trái tim dữ liệu vận hành** của SWM, chịu trách nhiệm:

- Quản lý `InventDim` - dimension tồn kho (site, warehouse, location, owner, status)
- Tạo `InventTrans` - ledger bất biến ghi nhận mọi biến động tồn kho
- Cập nhật `OnHand` - current balance projection
- Posting engine - cổng vào duy nhất để các module khác ghi nhận tồn kho
- Reversal engine - đảo chiều transaction khi cần correction
- Hold/Allocation - giữ hàng cho outbound
- Reconciliation - đối soát ledger vs on-hand
- Daily Snapshot - snapshot billing-safe

### Nguyên tắc cốt lõi
- **Document không phải nguồn sự thật**: `InventDim → InventTrans → OnHand` mới là backbone
- **Ledger bất biến**: không UPDATE/DELETE `invent_trans` đã post
- **Mọi thay đổi tồn kho phải qua posting engine**
- **Idempotency bắt buộc** cho mọi command side effect

---

## 2. Database Tables (10 tables)

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

---

## 3. Dependencies

### Module 1 - Foundation (✅ Completed)
- RBAC: permission check
- Audit: ghi audit log
- Idempotency: chống duplicate
- Number Sequence: sinh trans_id (`TRX`)
- Reason Code: validate reason cho reversal/adjustment

### Module 2 - Master Data (✅ Completed)
- `md_owner`: owner dimension
- `md_warehouse`: warehouse dimension
- `md_location`: location dimension
- `md_inventory_status`: status dimension
- `md_item`: item validation
- `md_uom`: UOM validation

---

## 4. API Endpoints

### Command APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inventory/postings` | Tạo inventory transaction |
| POST | `/api/v1/inventory/postings/reverse` | Reverse một transaction |
| POST | `/api/v1/inventory/holds` | Tạo hold/reserve stock |
| POST | `/api/v1/inventory/holds/:holdId/release` | Release hold |
| POST | `/api/v1/inventory/reconciliation/run` | Chạy reconciliation |
| POST | `/api/v1/inventory/snapshots/daily` | Sinh daily snapshot |

### Query APIs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/onhand` | Query tồn hiện tại |
| GET | `/api/v1/inventory/onhand/availability` | Check available stock |
| GET | `/api/v1/inventory/transactions` | Query transaction history |
| GET | `/api/v1/inventory/transactions/:transId` | Get transaction detail |
| GET | `/api/v1/inventory/holds` | List holds |
| GET | `/api/v1/inventory/reconciliation/results` | View reconciliation results |
| GET | `/api/v1/inventory/snapshots/daily` | Read daily snapshots |

---

## 5. Business Rules & Acceptance Criteria

### Posting Rules
- [x] `external_id` bắt buộc, dùng làm idempotency key
- [x] `event_code` phải tồn tại trong `inventory_event_mapping`
- [x] Item/Owner/Location/Status phải active
- [x] Nếu event làm giảm stock thì phải có đủ `physical_qty`
- [x] Adjustment/Reversal bắt buộc `reason_code`

### Ledger Rules
- [x] Không UPDATE/DELETE record `invent_trans` đã insert
- [x] Correction phải dùng reversal transaction
- [x] `trans_id` sinh từ Number Sequence `TRX`

### On-Hand Rules
- [x] `available_qty = physical_qty - reserved_qty`
- [x] Không cho phép `physical_qty < 0` (Phase 1)
- [x] Update on-hand chỉ qua posting/hold service

### Hold Rules
- [x] Chỉ hold từ status `AVAILABLE`
- [x] Hold phải có đủ `available_qty`
- [x] Release/Consume hold cùng transaction với posting

### Reconciliation Rules
- [x] `physical_qty == SUM(trans.qty WHERE stage=PHYSICAL)`
- [x] Mismatch phải log vào `inventory_reconciliation_result`

---

## 6. Task Breakdown

### Step 1: Database Schema
- [ ] Thêm enums cho Module 3
- [ ] Tạo model `InventDim`
- [ ] Tạo model `InventTrans`
- [ ] Tạo model `OnHand`
- [ ] Tạo model `InventoryHold`
- [ ] Tạo model `InventoryReversalLink`
- [ ] Tạo model `InventoryReconciliationRun`
- [ ] Tạo model `InventoryReconciliationResult`
- [ ] Tạo model `InventorySnapshotRun`
- [ ] Tạo model `DailyStorageSnapshot`
- [ ] Tạo model `InventoryEventMapping`
- [ ] Chạy migration
- [ ] Tạo seed data cho event mapping

### Step 2: Mapping & Validation
- [ ] Verify FK relationships với Module 1 + 2
- [ ] Tạo DTOs cho inventory operations
- [ ] Tạo validation schemas

### Step 3: Backend Implementation
- [ ] Tạo module structure
- [ ] Implement repositories
- [ ] Implement InventDimService
- [ ] Implement PostingEngine
- [ ] Implement ReversalEngine
- [ ] Implement OnHandService
- [ ] Implement HoldService
- [ ] Implement ReconciliationService
- [ ] Implement SnapshotService
- [ ] Implement Controllers
- [ ] Register routes

---

## 7. File Structure

```
src/modules/inventory-core/
├── inventory-core.module.ts
├── inventory-core.routes.js
├── inventory-core.controller.js
├── dto/
│   ├── posting.dto.js
│   ├── reversal.dto.js
│   ├── hold.dto.js
│   ├── onhand-query.dto.js
│   └── reconciliation.dto.js
├── domain/
│   ├── inventory.types.js
│   ├── inventory.errors.js
│   ├── inventory.rules.js
│   └── event-mapping.policy.js
├── application/
│   ├── invent-dim.service.js
│   ├── posting-engine.service.js
│   ├── reversal-engine.service.js
│   ├── onhand.service.js
│   ├── hold.service.js
│   ├── transaction-query.service.js
│   ├── reconciliation.service.js
│   └── snapshot.service.js
├── infra/
│   ├── invent-dim.repository.js
│   ├── invent-trans.repository.js
│   ├── onhand.repository.js
│   ├── hold.repository.js
│   ├── reversal-link.repository.js
│   ├── reconciliation.repository.js
│   └── snapshot.repository.js
└── inventory-core.schema.js
```

---

## 8. Notes & Decisions

### Quyết định đã chốt cho Phase 1:
1. **MOVE lưu 1 row** có cả `dim_from_id` và `dim_to_id`
2. Chỉ dùng stage `PHYSICAL`, không dùng `EXPECTED`/`ORDERED`
3. **Negative stock bị chặn tuyệt đối** ở Phase 1
4. Hold consume khi ship: release trước rồi trừ physical

### Trans Type Phase 1:
- `RECEIPT_IN`: +physical vào receiving
- `SHIPMENT_OUT`: -physical từ storage
- `MOVE`: from → to (net zero)
- `STATUS_CHANGE`: status reclass
- `ADJUSTMENT`: +/- physical (bắt buộc reason)
- `COUNT_GAIN` / `COUNT_LOSS`: delta từ cycle count

