# Module 6: Inventory Control — Backend Documentation

**Version:** 1.1  
**Ngày tạo:** 2025-01-08  
**Cập nhật:** 2025-03-09  
**Code Path:** `backend/src/modules/inventory-control/`

---

## 1. Mục đích Module

Module 6 - Inventory Control là **lớp orchestration nghiệp vụ** cho các hoạt động kiểm soát tồn kho, bao gồm:

- **Di chuyển nội bộ (Move)**: Chuyển hàng giữa các location trong cùng kho
- **Chuyển kho (Transfer)**: Chuyển hàng giữa các warehouse khác nhau
- **Đổi trạng thái (Status Change)**: Thay đổi inventory status (AVAILABLE → BLOCKED, v.v.)
- **Kiểm kê chu kỳ (Cycle Count)**: Đếm và đối chiếu tồn kho định kỳ
- **Điều chỉnh (Adjustment)**: Tăng/giảm tồn kho khi có variance
- **Đánh giá đối chiếu (Reconciliation)**: Review và xử lý sai lệch từ M3

**Nguyên tắc quan trọng:**
- Module 6 **KHÔNG** cập nhật `on_hand` hay `invent_trans` trực tiếp
- Mọi thay đổi tồn kho phải đi qua Module 3 (Inventory Core) posting engine
- Module 6 sở hữu document nghiệp vụ, state machine, validation rules

---

## 2. Cấu trúc Code

```
src/modules/inventory-control/
├── index.js                           # Module entry point
├── inventory-control.routes.js        # Route definitions (with RBAC)
├── middleware/
│   └── auth.middleware.js             # Auth & Permission preHandlers
├── controllers/
│   ├── onhand-inquiry.controller.js   # On-hand & movement history
│   ├── move-order.controller.js       # Move order operations
│   ├── transfer-order.controller.js   # Transfer order operations
│   ├── status-change.controller.js    # Status change operations
│   ├── cycle-count.controller.js      # Cycle count operations
│   ├── adjustment.controller.js       # Adjustment operations
│   └── reconciliation.controller.js   # Reconciliation operations
├── services/
│   ├── onhand-inquiry.service.js      # Query on-hand & history
│   ├── move-order.service.js          # Move order business logic
│   ├── transfer-order.service.js      # Transfer order business logic
│   ├── status-change.service.js       # Status change business logic
│   ├── cycle-count.service.js         # Cycle count business logic
│   ├── adjustment.service.js          # Adjustment business logic
│   ├── reconciliation.service.js      # Reconciliation business logic
│   ├── ic-validation.service.js       # Centralized validation
│   ├── ic-state-machine.service.js    # State transitions
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
    ├── ic.enums.js                    # Enum definitions
    ├── ic.errors.js                   # Error classes
    └── ic.policy.js                   # Business rules
```

---

## 3. Database Tables

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
| `ic_document_status_history` | Lịch sử chuyển trạng thái |
| `ic_exception_log` | Log exception nghiệp vụ |

---

## 4. API Endpoints

### 4.1 On-Hand Inquiry APIs

#### GET `/api/v1/inventory-control/on-hand`
**Mục đích:** Tra cứu tồn kho tổng hợp

**Query Parameters:**
| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| warehouseId | UUID | No | Filter theo warehouse |
| locationId | UUID | No | Filter theo location |
| ownerId | UUID | No | Filter theo owner |
| itemId | UUID | No | Filter theo item |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "item": { "id": "uuid", "itemCode": "RICE-001", "itemName": "Gạo ST25" },
      "warehouse": { "id": "uuid", "warehouseCode": "WH01" },
      "location": { "id": "uuid", "locationCode": "A-01-01" },
      "owner": { "id": "uuid", "ownerCode": "OWN01" },
      "inventoryStatus": { "statusCode": "AVAILABLE" },
      "uom": { "uomCode": "KG" },
      "physicalQty": 1000.000,
      "reservedQty": 100.000,
      "availableQty": 900.000,
      "lastMovementAt": "2025-01-08T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 100 }
}
```

#### GET `/api/v1/inventory-control/on-hand/:itemId`
**Mục đích:** Chi tiết tồn kho theo item với summary

#### GET `/api/v1/inventory-control/movement-history`
**Mục đích:** Lịch sử biến động tồn kho

---

### 4.2 Move Order APIs

#### POST `/api/v1/inventory-control/moves`
**Mục đích:** Tạo lệnh di chuyển nội bộ

**Request Body:**
```json
{
  "external_id": "MOV-2025-001",
  "correlation_id": "uuid",
  "source_app": "WEB",
  "warehouseId": "uuid",
  "executionMode": "DIRECT",
  "reasonCode": "REPLENISH",
  "remarks": "Bổ sung hàng cho khu picking",
  "lines": [
    {
      "itemId": "uuid",
      "ownerId": "uuid",
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "inventoryStatus": "AVAILABLE",
      "requestedQty": 100.000,
      "uom": "KG"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "moveNumber": "MOV-20250108-0001",
    "status": "DRAFT",
    "postingStatus": "PENDING",
    "lines": [...]
  },
  "message": "Move order created successfully"
}
```

**Files liên quan:**
- `controllers/move-order.controller.js` → `createMoveOrder()`
- `services/move-order.service.js` → `createMoveOrder()`
- `infra/move-order.repository.js` → `createMoveOrder()`

#### POST `/api/v1/inventory-control/moves/:id/confirm`
**Mục đích:** Xác nhận move order, validate stock availability

#### POST `/api/v1/inventory-control/moves/:id/execute`
**Mục đích:** Thực thi move, gọi M3 posting

#### POST `/api/v1/inventory-control/moves/:id/cancel`
**Mục đích:** Hủy move order

---

### 4.3 Transfer Order APIs

#### POST `/api/v1/inventory-control/transfers`
**Mục đích:** Tạo lệnh chuyển kho

**Request Body:**
```json
{
  "external_id": "TRF-2025-001",
  "correlation_id": "uuid",
  "source_app": "WEB",
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "executionMode": "DIRECT",
  "requestedShipDate": "2025-01-10",
  "inTransitSlaHours": 48,
  "vehicleNumber": "51A-12345",
  "lines": [
    {
      "itemId": "uuid",
      "ownerId": "uuid",
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "inventoryStatus": "AVAILABLE",
      "requestedQty": 500.000,
      "uom": "KG"
    }
  ]
}
```

#### POST `/api/v1/inventory-control/transfers/:id/release`
**Mục đích:** Phát hành transfer order

#### POST `/api/v1/inventory-control/transfers/:id/ship`
**Mục đích:** Ship hàng, chuyển sang IN_TRANSIT

#### POST `/api/v1/inventory-control/transfers/:id/receive`
**Mục đích:** Nhận hàng tại kho đích, hỗ trợ partial receive

#### GET `/api/v1/inventory-control/transfers/aging`
**Mục đích:** Lấy danh sách transfer quá SLA

---

### 4.4 Status Change APIs

#### POST `/api/v1/inventory-control/status-changes`
**Mục đích:** Tạo và post status change (direct mode)

**Request Body:**
```json
{
  "external_id": "STC-2025-001",
  "correlation_id": "uuid",
  "source_app": "WEB",
  "warehouseId": "uuid",
  "locationId": "uuid",
  "itemId": "uuid",
  "ownerId": "uuid",
  "fromStatus": "AVAILABLE",
  "toStatus": "BLOCKED",
  "qty": 50.000,
  "uom": "KG",
  "reasonCode": "QUALITY_ISSUE",
  "reasonText": "Phát hiện ẩm mốc"
}
```

**Validation:**
- `fromStatus → toStatus` phải thuộc allowed matrix
- `reasonCode` mandatory
- Không đổi status stock đang reserved

#### POST `/api/v1/inventory-control/status-changes/:id/execute`
**Mục đích:** Thực hiện status change (chuyển từ CREATED → POSTED)

**Permission:** `inventory.control.status.execute`

**Response:**
```json
{
  "id": "uuid",
  "statusChangeNumber": "STC-20260311-0001",
  "status": "POSTED",
  "postedAt": "2026-03-11T10:00:00Z",
  "approvedBy": "uuid"
}
```

**Validation:**
- Status hiện tại phải là `CREATED`

#### POST `/api/v1/inventory-control/status-changes/:id/cancel`
**Mục đích:** Hủy status change (chuyển từ CREATED → CANCELLED)

**Permission:** `inventory.control.status.cancel`

**Response:**
```json
{
  "id": "uuid",
  "statusChangeNumber": "STC-20260311-0001",
  "status": "CANCELLED"
}
```

**Validation:**
- Status hiện tại phải là `CREATED`

#### POST `/api/v1/inventory-control/status-changes/:id/reverse`
**Mục đích:** Reverse status change đã post

---

### 4.5 Cycle Count APIs

#### POST `/api/v1/inventory-control/cycle-count-plans`
**Mục đích:** Tạo kế hoạch kiểm kê

#### POST `/api/v1/inventory-control/cycle-counts`
**Mục đích:** Tạo đợt kiểm kê từ plan hoặc adhoc

#### POST `/api/v1/inventory-control/cycle-counts/:id/release`
**Mục đích:** Phát hành, snapshot on-hand, tạo lines

#### POST `/api/v1/inventory-control/cycle-counts/:id/submit`
**Mục đích:** Nộp kết quả count

**Request Body:**
```json
{
  "lines": [
    {
      "lineNo": 1,
      "countedQty": 98.500,
      "evidenceRef": "photo-001.jpg"
    }
  ]
}
```

#### POST `/api/v1/inventory-control/cycle-counts/:id/recount`
**Mục đích:** Yêu cầu đếm lại các line có variance cao

#### POST `/api/v1/inventory-control/cycle-counts/:id/approve`
**Mục đích:** Duyệt variance

#### POST `/api/v1/inventory-control/cycle-counts/:id/post`
**Mục đích:** Post adjustment từ variance

---

### 4.6 Adjustment APIs

#### POST `/api/v1/inventory-control/adjustments`
**Mục đích:** Tạo manual adjustment

**Request Body:**
```json
{
  "external_id": "ADJ-2025-001",
  "correlation_id": "uuid",
  "source_app": "WEB",
  "warehouseId": "uuid",
  "reasonCode": "DAMAGE",
  "remarks": "Điều chỉnh do hư hại",
  "lines": [
    {
      "itemId": "uuid",
      "ownerId": "uuid",
      "locationId": "uuid",
      "inventoryStatus": "AVAILABLE",
      "qtyDelta": -10.000,
      "uom": "KG",
      "reasonCode": "DAMAGE"
    }
  ]
}
```

#### POST `/api/v1/inventory-control/adjustments/:id/submit`
**Mục đích:** Gửi duyệt

#### POST `/api/v1/inventory-control/adjustments/:id/approve`
**Mục đích:** Duyệt adjustment

#### POST `/api/v1/inventory-control/adjustments/:id/post`
**Mục đích:** Post adjustment đã duyệt

---

### 4.7 Reconciliation APIs

#### POST `/api/v1/inventory-control/reconciliation-reviews/run`
**Mục đích:** Chạy reconciliation, tạo review nếu có mismatch

#### POST `/api/v1/inventory-control/reconciliation-reviews/:id/assign`
**Mục đích:** Assign người xử lý

#### POST `/api/v1/inventory-control/reconciliation-reviews/:id/resolve`
**Mục đích:** Đánh dấu resolution

#### POST `/api/v1/inventory-control/reconciliation-reviews/:id/close`
**Mục đích:** Đóng review

---

## 5. State Machines

### 5.1 Move Order
```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
  └──────────────→ CANCELLED
  └──────────────→ FAILED
```

### 5.2 Transfer Order
```
CREATED → RELEASED → SHIPPED → IN_TRANSIT → PARTIALLY_RECEIVED → RECEIVED → CLOSED
    └────────────────────────────────────────────────────────────→ CANCELLED
```

### 5.3 Status Change
```
CREATED → POSTED → REVERSED
   └────→ FAILED
   └────→ CANCELLED
```

### 5.4 Cycle Count
```
CREATED → RELEASED → COUNTING → SUBMITTED → APPROVED → POSTED
   └──────────────────────────────────────────────→ CANCELLED
```

### 5.5 Adjustment
```
DRAFT → SUBMITTED → APPROVED → POSTED
   └──────────────────────────→ CANCELLED
   └──────────────────────────→ FAILED
```

### 5.6 Reconciliation
```
OPEN → INVESTIGATING → RESOLVED → CLOSED
```

---

## 6. Error Codes

| Code | Meaning |
|------|---------|
| IC-400-001 | Invalid payload |
| IC-400-002 | Invalid state transition |
| IC-400-003 | Invalid quantity |
| IC-400-004 | Invalid status matrix |
| IC-400-005 | Invalid source/destination location |
| IC-403-001 | Permission denied |
| IC-403-002 | Owner scope denied |
| IC-404-001 | Entity not found |
| IC-409-001 | Idempotency conflict |
| IC-409-002 | Document version conflict |
| IC-409-003 | Stock reserved conflict |
| IC-409-004 | Posting already completed |
| IC-422-001 | Insufficient available qty |
| IC-422-002 | Target location capacity blocked |
| IC-422-003 | Count recount policy exceeded |
| IC-422-004 | Adjustment limit exceeded |
| IC-500-001 | Inventory posting adapter failure |
| IC-500-002 | Work handoff failure |
| IC-500-003 | Recovery required |

---

## 7. Dependencies

| Module | Dependency | Usage |
|--------|------------|-------|
| M1 Foundation | NumberSequence | Sinh document number |
| M1 Foundation | ReasonCode | Validate reason codes |
| M1 Foundation | AuthorizationService | RBAC, permission check |
| M1 Foundation | LogService | Audit logging |
| M2 Master Data | MdItem, MdOwner, MdWarehouse, MdLocation | Entity validation |
| M2 Master Data | MdInventoryStatus | Status matrix |
| M3 Inventory Core | PostingEngine | Post inventory transactions |
| M3 Inventory Core | OnHand Query | Check available stock |
| M3 Inventory Core | InventTrans Query | Movement history |

---

## 7.1 RBAC (Role-Based Access Control)

Mọi route đều được bảo vệ bởi RBAC middleware. Cấu trúc permission codes:

| Permission Code | Mô tả |
|----------------|-------|
| `IC.ONHAND.READ` | Tra cứu tồn kho |
| `IC.MOVEMENT.READ` | Xem lịch sử biến động |
| `IC.MOVE.CREATE` | Tạo move order |
| `IC.MOVE.CONFIRM` | Xác nhận move order |
| `IC.MOVE.EXECUTE` | Thực thi move order |
| `IC.TRANSFER.CREATE` | Tạo transfer order |
| `IC.TRANSFER.SHIP` | Ship transfer |
| `IC.TRANSFER.RECEIVE` | Nhận transfer |
| `IC.STATUS.CREATE` | Tạo status change |
| `IC.STATUS.REVERSE` | Reverse status change |
| `IC.CYCLECOUNT.CREATE` | Tạo cycle count |
| `IC.CYCLECOUNT.APPROVE` | Duyệt cycle count |
| `IC.CYCLECOUNT.POST` | Post cycle count |
| `IC.ADJUSTMENT.CREATE` | Tạo adjustment |
| `IC.ADJUSTMENT.APPROVE` | Duyệt adjustment |
| `IC.ADJUSTMENT.POST` | Post adjustment |
| `IC.RECONCILIATION.RUN` | Chạy reconciliation |
| `IC.RECONCILIATION.RESOLVE` | Giải quyết reconciliation |

**Files liên quan:**
- `middleware/auth.middleware.js` → `authPreHandler()`, `permissionPreHandler()`

---

## 8. Idempotency Pattern

Mọi command API đều yêu cầu `external_id` unique:

```json
{
  "external_id": "client-generated-idempotency-key",
  "correlation_id": "uuid-for-tracing"
}
```

**Behavior khi duplicate:**
- Retry cùng `external_id` trả về kết quả cũ với flag `idempotentReplay: true`
- HTTP Status: `200 OK` (không phải 409 Conflict)
- Client có thể dùng flag này để biết đây là replay

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "moveNumber": "MOV-20250108-0001",
    "status": "DRAFT",
    "idempotentReplay": true
  }
}
```

- Scope: `(module_code, action_code, external_id)` unique

---

## 9. Reserved Stock Policy

Module 6 tuân thủ các rule bảo vệ stock đã reserved:

1. **Không move** stock đang có `reserved_qty > 0`
2. **Không status-change** từ AVAILABLE sang BLOCKED/DAMAGED nếu có reserved
3. **Không adjustment giảm** vào stock đang reserved
4. Query M3 availability trước mỗi execute/post

---

## 10. Testing Checklist

### Move Order
- [ ] Create move order với nhiều lines
- [ ] Confirm validate stock availability
- [ ] Execute post thành công qua M3
- [ ] Cancel trước khi execute
- [ ] Duplicate external_id trả conflict

### Transfer Order
- [ ] Ship và receive riêng biệt
- [ ] Partial receive nhiều lần
- [ ] Variance được log
- [ ] Aging query hoạt động

### Status Change
- [ ] AVAILABLE → BLOCKED thành công
- [ ] Blocked by reserved stock
- [ ] Reason code validation

### Cycle Count
- [ ] Blind count hide system qty
- [ ] Variance calculation
- [ ] Recount policy enforcement
- [ ] Auto-create adjustment

### Adjustment
- [ ] Increase/Decrease post correctly
- [ ] Approval workflow
- [ ] Role limit check
