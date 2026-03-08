# Module 6: Inventory Control — Implementation Plan

**Version:** 1.0  
**Ngày tạo:** 2026-03-08  
**Trạng thái:** In Progress

---

## 1. Mô tả nghiệp vụ

Module 6 - Inventory Control là **lớp orchestration nghiệp vụ** cho các hoạt động kiểm soát tồn kho bao gồm:

1. **On-Hand Inquiry**: Tra cứu tồn kho hiện tại
2. **Movement History**: Lịch sử biến động tồn kho
3. **Move Internal**: Di chuyển hàng trong cùng kho
4. **Inter-Warehouse Transfer**: Chuyển hàng giữa các kho
5. **Inventory Status Change**: Đổi trạng thái tồn kho
6. **Cycle Count**: Kiểm kê chu kỳ
7. **Inventory Adjustment**: Điều chỉnh tồn kho
8. **Reconciliation Review**: Đánh giá đối chiếu sai lệch

**Nguyên tắc quan trọng:**
- Module 6 **KHÔNG** cập nhật `on_hand` hay `invent_trans` trực tiếp
- Mọi thay đổi tồn kho phải đi qua Module 3 (Inventory Core) posting engine
- Module 6 sở hữu document nghiệp vụ, state machine, validation rules

---

## 2. Database Tables (12 tables)

### Command / Operational Tables
| Table | Mô tả |
|-------|-------|
| `ic_move_order` | Header lệnh di chuyển nội bộ |
| `ic_move_order_line` | Line chi tiết lệnh di chuyển |
| `ic_transfer_order` | Header lệnh chuyển kho |
| `ic_transfer_order_line` | Line chi tiết chuyển kho |
| `ic_inventory_status_change` | Yêu cầu đổi trạng thái tồn |
| `ic_cycle_count_plan` | Kế hoạch kiểm kê chu kỳ |
| `ic_cycle_count_header` | Header đợt kiểm kê |
| `ic_cycle_count_line` | Line chi tiết kiểm kê |
| `ic_adjustment_header` | Header điều chỉnh tồn |
| `ic_adjustment_line` | Line chi tiết điều chỉnh |
| `ic_reconciliation_review` | Review sai lệch đối chiếu |

### Trace / Support Tables
| Table | Mô tả |
|-------|-------|
| `ic_document_status_history` | Lịch sử chuyển trạng thái document |
| `ic_exception_log` | Log exception nghiệp vụ M6 |

---

## 3. Dependencies

### Module 6 phụ thuộc vào:
| Module | Dependency | Usage |
|--------|------------|-------|
| Module 1 | `NumberSequence` | Sinh document number (MOV-*, TRF-*, STC-*, CNT-*, ADJ-*, REC-*) |
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

---

## 4. API Endpoints (39 endpoints)

### Query APIs (11 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/inventory-control/on-hand` | Tra cứu tồn kho |
| GET | `/api/v1/inventory-control/on-hand/:itemId` | Chi tiết tồn theo item |
| GET | `/api/v1/inventory-control/movement-history` | Lịch sử biến động |
| GET | `/api/v1/inventory-control/moves` | List move orders |
| GET | `/api/v1/inventory-control/moves/:id` | Chi tiết move order |
| GET | `/api/v1/inventory-control/transfers` | List transfer orders |
| GET | `/api/v1/inventory-control/transfers/:id` | Chi tiết transfer order |
| GET | `/api/v1/inventory-control/transfers/aging` | Transfer aging report |
| GET | `/api/v1/inventory-control/status-changes/:id` | Chi tiết status change |
| GET | `/api/v1/inventory-control/cycle-counts/:id` | Chi tiết cycle count |
| GET | `/api/v1/inventory-control/adjustments/:id` | Chi tiết adjustment |
| GET | `/api/v1/inventory-control/reconciliation-reviews` | List reconciliation reviews |
| GET | `/api/v1/inventory-control/reconciliation-reviews/:id` | Chi tiết review |

### Move APIs (4 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/moves` | Tạo move order |
| POST | `/api/v1/inventory-control/moves/:id/confirm` | Confirm move |
| POST | `/api/v1/inventory-control/moves/:id/execute` | Execute move |
| POST | `/api/v1/inventory-control/moves/:id/cancel` | Cancel move |

### Transfer APIs (6 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/transfers` | Tạo transfer order |
| POST | `/api/v1/inventory-control/transfers/:id/release` | Release transfer |
| POST | `/api/v1/inventory-control/transfers/:id/ship` | Ship transfer |
| POST | `/api/v1/inventory-control/transfers/:id/receive` | Receive transfer |
| POST | `/api/v1/inventory-control/transfers/:id/close` | Close transfer |
| POST | `/api/v1/inventory-control/transfers/:id/cancel` | Cancel transfer |

### Status Change APIs (3 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/status-changes` | Tạo status change |
| POST | `/api/v1/inventory-control/status-changes/:id/cancel` | Cancel status change |
| POST | `/api/v1/inventory-control/status-changes/:id/reverse` | Reverse status change |

### Cycle Count APIs (8 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/cycle-count-plans` | Tạo count plan |
| POST | `/api/v1/inventory-control/cycle-counts` | Tạo cycle count |
| POST | `/api/v1/inventory-control/cycle-counts/:id/release` | Release count |
| POST | `/api/v1/inventory-control/cycle-counts/:id/submit` | Submit count result |
| POST | `/api/v1/inventory-control/cycle-counts/:id/recount` | Request recount |
| POST | `/api/v1/inventory-control/cycle-counts/:id/approve` | Approve variance |
| POST | `/api/v1/inventory-control/cycle-counts/:id/post` | Post count adjustment |
| POST | `/api/v1/inventory-control/cycle-counts/:id/cancel` | Cancel count |

### Adjustment APIs (6 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/adjustments` | Tạo adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/submit` | Submit adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/approve` | Approve adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/post` | Post adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/cancel` | Cancel adjustment |
| POST | `/api/v1/inventory-control/adjustments/:id/reverse` | Reverse adjustment |

### Reconciliation APIs (4 endpoints)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/inventory-control/reconciliation-reviews/run` | Run reconciliation |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/assign` | Assign reviewer |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/resolve` | Resolve issue |
| POST | `/api/v1/inventory-control/reconciliation-reviews/:id/close` | Close review |

---

## 5. Business Rules & State Machines

### 5.1 Move Order States
```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
  └──────────────→ CANCELLED
  └──────────────→ FAILED
```

### 5.2 Transfer Order States
```
CREATED → RELEASED → SHIPPED → IN_TRANSIT → PARTIALLY_RECEIVED → RECEIVED → CLOSED
    └────────────────────────────────────────────────────────────→ CANCELLED
    └────────────────────────────────────────────────────────────→ FAILED
```

### 5.3 Status Change States
```
CREATED → POSTED → REVERSED
   └────→ FAILED
   └────→ CANCELLED
```

### 5.4 Cycle Count States
```
CREATED → RELEASED → COUNTING → SUBMITTED → APPROVED → POSTED
   └──────────────────────────────────────────────→ CANCELLED
```

### 5.5 Adjustment States
```
DRAFT → SUBMITTED → APPROVED → POSTED
   └──────────────────────────→ CANCELLED
   └──────────────────────────→ FAILED
```

### 5.6 Reconciliation Review States
```
OPEN → INVESTIGATING → RESOLVED → CLOSED
```

---

## 6. Acceptance Criteria

### Move Order
- [x] Có thể tạo move order với nhiều lines
- [x] Validate source/destination cùng warehouse
- [x] Không move stock đang reserved
- [x] Idempotent theo external_id
- [x] Post thành công qua M3

### Transfer Order
- [x] Ship/receive riêng biệt
- [x] Hỗ trợ partial receive
- [x] Variance được log
- [x] Transfer aging tracking

### Status Change
- [x] Allowed matrix enforcement
- [x] Reason code mandatory
- [x] Reserved stock rule

### Cycle Count
- [x] Blind count support
- [x] Variance threshold
- [x] Recount policy
- [x] Auto-create adjustment

### Adjustment
- [x] RBAC limit
- [x] Reason code mandatory
- [x] Audit trail deep

### Reconciliation
- [x] Link M3 reconciliation
- [x] Resolution tracking
- [x] Issue assignment

---

## 7. Code Structure

```
src/modules/inventory-control/
├── index.js
├── inventory-control.routes.js
├── inventory-control.schema.js
├── controllers/
│   ├── onhand-inquiry.controller.js
│   ├── movement-history.controller.js
│   ├── move-order.controller.js
│   ├── transfer-order.controller.js
│   ├── status-change.controller.js
│   ├── cycle-count.controller.js
│   ├── adjustment.controller.js
│   └── reconciliation.controller.js
├── services/
│   ├── onhand-inquiry.service.js
│   ├── movement-history.service.js
│   ├── move-order.service.js
│   ├── transfer-order.service.js
│   ├── status-change.service.js
│   ├── cycle-count.service.js
│   ├── adjustment.service.js
│   ├── reconciliation.service.js
│   ├── ic-state-machine.service.js
│   ├── ic-validation.service.js
│   └── ic-posting-adapter.service.js
├── repositories/
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

---

## 8. Implementation Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| Step 0 | Plan document | ✅ Done |
| Step 1 | Database schema + migration | 🔄 In Progress |
| Step 2 | Mapping & FK validation | ⏳ Pending |
| Step 3 | Backend API implementation | ⏳ Pending |
| Docs | Documentation & report | ⏳ Pending |
| Test | Backend testing | ⏳ Pending |

---

## 9. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Reserved stock conflict | Query M3 availability before execute |
| Posting failure | Retry với idempotency, log exception |
| Concurrent update | Optimistic locking với row_version |
| State transition invalid | Centralized state machine service |
