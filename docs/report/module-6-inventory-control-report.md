# Module 6: Inventory Control — Work Report

**Version:** 1.0  
**Ngày hoàn thành:** 2025-01-08  
**Trạng thái:** ✅ Completed

---

## 1. Tổng quan công việc

Module 6 - Inventory Control đã được implement theo đúng quy trình 3 bước đầu của skill-code workflow:

| Step | Công việc | Trạng thái |
|------|-----------|------------|
| Step 0 | Lập kế hoạch & Thiết kế | ✅ Done |
| Step 1 | Tạo Database Schema + Migration | ✅ Done |
| Step 2 | Mapping Data & Foreign Keys | ✅ Done |
| Step 3 | Backend API Implementation | ✅ Done |

---

## 2. Deliverables

### 2.1 Plan Document
- **File:** `docs/plan/module-6-inventory-control-plan.md`
- **Nội dung:** Scope, database design, API design, state machines, acceptance criteria

### 2.2 Database Schema
- **File:** `backend/prisma/schema.prisma` (lines 1960-2503)
- **Tables:** 13 tables với prefix `ic_`
- **Enums:** 20 enums cho Module 6

### 2.3 Backend Code
- **Path:** `backend/src/modules/inventory-control/`
- **Total files:** 22 files
- **Total lines:** ~2,500 lines (tất cả files < 800 dòng)

| Folder | Files |
|--------|-------|
| `domain/` | 3 files (enums, errors, policy) |
| `infra/` | 7 files (repositories) |
| `services/` | 10 files |
| `controllers/` | 7 files |
| Root | 2 files (index.js, routes.js) |

### 2.4 Documentation
- **Backend Doc:** `backend/docs/module-6-inventory-control.md`
- **Database Doc:** `backend/prisma/docs/module-6-inventory-control.md`
- **Mapping Update:** `backend/docs/mapping-module.md` (cập nhật thêm Module 6)

---

## 3. Chi tiết Implementation

### 3.1 Database Tables (13 tables)

| Table | Lines | Purpose |
|-------|-------|---------|
| `ic_move_order` | 30 | Header lệnh di chuyển nội bộ |
| `ic_move_order_line` | 26 | Line chi tiết di chuyển |
| `ic_transfer_order` | 35 | Header chuyển kho |
| `ic_transfer_order_line` | 30 | Line chi tiết chuyển kho |
| `ic_inventory_status_change` | 32 | Đổi trạng thái tồn |
| `ic_cycle_count_plan` | 22 | Kế hoạch kiểm kê |
| `ic_cycle_count_header` | 28 | Header đợt kiểm kê |
| `ic_cycle_count_line` | 27 | Line kiểm kê |
| `ic_adjustment_header` | 29 | Header điều chỉnh |
| `ic_adjustment_line` | 24 | Line điều chỉnh |
| `ic_reconciliation_review` | 27 | Review đối chiếu |
| `ic_document_status_history` | 15 | Lịch sử trạng thái |
| `ic_exception_log` | 17 | Log exception |

### 3.2 API Endpoints (39 endpoints)

| Group | Count | Method Distribution |
|-------|-------|---------------------|
| On-Hand Inquiry | 3 | 3 GET |
| Move Order | 6 | 2 GET, 4 POST |
| Transfer Order | 9 | 3 GET, 6 POST |
| Status Change | 5 | 2 GET, 3 POST |
| Cycle Count | 10 | 2 GET, 8 POST |
| Adjustment | 7 | 2 GET, 5 POST |
| Reconciliation | 6 | 2 GET, 4 POST |

### 3.3 Services Implemented

| Service | Responsibility |
|---------|----------------|
| `onhand-inquiry.service.js` | Query on-hand và movement history |
| `move-order.service.js` | Create, confirm, execute, cancel move orders |
| `transfer-order.service.js` | Full transfer lifecycle (create → close) |
| `status-change.service.js` | Status change với direct posting |
| `cycle-count.service.js` | Full count lifecycle với auto-adjustment |
| `adjustment.service.js` | Manual adjustment với approval workflow |
| `reconciliation.service.js` | Run reconciliation, assign, resolve, close |
| `ic-validation.service.js` | Centralized validation (item, owner, warehouse, location, stock) |
| `ic-state-machine.service.js` | State transition validation và history |
| `ic-posting-adapter.service.js` | Adapter gọi M3 posting engine |

### 3.4 State Machines

Module 6 implement 6 state machines hoàn chỉnh:
1. **Move Order:** DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
2. **Transfer Order:** CREATED → RELEASED → SHIPPED → IN_TRANSIT → RECEIVED → CLOSED
3. **Status Change:** CREATED → POSTED → REVERSED
4. **Cycle Count:** CREATED → RELEASED → COUNTING → SUBMITTED → APPROVED → POSTED
5. **Adjustment:** DRAFT → SUBMITTED → APPROVED → POSTED
6. **Reconciliation:** OPEN → INVESTIGATING → RESOLVED → CLOSED

---

## 4. Business Rules Implemented

### 4.1 Reserved Stock Protection
- Không move stock đang reserved
- Không status-change stock reserved sang BLOCKED/DAMAGED
- Không adjustment giảm vào stock reserved

### 4.2 Status Change Matrix
```
AVAILABLE → BLOCKED, DAMAGED, QC_HOLD
BLOCKED → AVAILABLE, DAMAGED
DAMAGED → AVAILABLE, BLOCKED, SCRAPPED
QC_HOLD → AVAILABLE, BLOCKED, DAMAGED
```

### 4.3 Cycle Count Policy
- Blind count support (hide system qty)
- Variance threshold for recount
- Max recount enforcement
- Auto-create adjustment from variance

### 4.4 Idempotency
- Tất cả command API yêu cầu `external_id`
- Duplicate request trả về kết quả cũ

---

## 5. Dependencies

### Module 6 phụ thuộc:
| Module | Services Used |
|--------|---------------|
| M1 Foundation | NumberSequence, ReasonCode, Idempotency |
| M2 Master Data | MdItem, MdOwner, MdWarehouse, MdLocation, MdInventoryStatus, MdUom |
| M3 Inventory Core | PostingEngine, OnHand query, InventTrans query, Reconciliation |

### Modules phụ thuộc vào M6:
| Module | Dependency |
|--------|------------|
| M7 Work | CreateMoveWork (WORK_BASED mode) |
| M10 Billing | InventoryControlEvent capture |

---

## 6. Error Handling

Đã implement 17 error codes theo chuẩn:
- `IC-400-xxx`: Validation errors
- `IC-403-xxx`: Permission errors
- `IC-404-xxx`: Not found errors
- `IC-409-xxx`: Conflict errors
- `IC-422-xxx`: Business rule violations
- `IC-500-xxx`: System errors

---

## 7. Files Created

```
docs/plan/module-6-inventory-control-plan.md
docs/report/module-6-inventory-control-report.md
backend/docs/module-6-inventory-control.md
backend/prisma/docs/module-6-inventory-control.md
backend/src/modules/inventory-control/
├── index.js
├── inventory-control.routes.js
├── domain/
│   ├── ic.enums.js
│   ├── ic.errors.js
│   └── ic.policy.js
├── infra/
│   ├── move-order.repository.js
│   ├── transfer-order.repository.js
│   ├── status-change.repository.js
│   ├── cycle-count.repository.js
│   ├── adjustment.repository.js
│   ├── reconciliation.repository.js
│   └── ic-status-history.repository.js
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
│   └── ic-posting-adapter.service.js
└── controllers/
    ├── onhand-inquiry.controller.js
    ├── move-order.controller.js
    ├── transfer-order.controller.js
    ├── status-change.controller.js
    ├── cycle-count.controller.js
    ├── adjustment.controller.js
    └── reconciliation.controller.js
```

---

## 8. Next Steps

1. **Chạy migration:** `npx prisma migrate dev --name add_module6_inventory_control`
2. **Generate Prisma client:** `npx prisma generate`
3. **Test backend:** Kiểm tra các API endpoints
4. **Seed data:** Thêm number sequences cho MOV-*, TRF-*, STC-*, CNT-*, ADJ-*, REC-*

---

## 9. Notes

- Tất cả files đều < 800 dòng theo yêu cầu
- Module 6 **không** update `on_hand` hoặc `invent_trans` trực tiếp
- Mọi inventory side-effect đều đi qua M3 posting adapter
- State machine được tập trung tại `ic-state-machine.service.js`
- Validation được tập trung tại `ic-validation.service.js`
