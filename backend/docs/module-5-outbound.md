# Module 5: Outbound Operations — API Documentation

**Module Path:** `src/modules/outbound`  
**Status:** ✅ Implemented (Feedback Fixed v1)  
**Version:** 1.1.0  
**Last Updated:** 2026-03-08  

---

## 1. Mục đích Module

Module 5 quản lý toàn bộ **luồng xuất hàng (Outbound Operations)** từ khi tạo shipment đến khi hàng được xuất khỏi kho và ghi nhận vào inventory ledger.

### Các chức năng chính:
- **Shipment Management**: Tạo, cập nhật, confirm, cancel shipment
- **Allocation Engine**: Phân bổ tồn kho theo FIFO cho shipment lines
- **Weighing Orchestration**: Ghi nhận tare/gross, tính net theo line
- **Tolerance Check**: Kiểm tra chênh lệch và quản lý approval flow
- **Shipping & Posting**: Post inventory khi SHIPPED
- **Audit & History**: Lưu lịch sử trạng thái và exceptions

---

## 1.1 Feedback Fixes Applied

| Issue | Description | Status |
|-------|-------------|--------|
| HI-2 | Tolerance 4-level cascade lookup | ✅ Fixed |
| HI-3 | Allocation wrapped in $transaction | ✅ Fixed |
| HI-4 | decidedBy extracted from x-user-id header | ✅ Fixed |
| HI-6 | lockForUpdate called before allocation | ✅ Fixed |
| CR-1 | Real M3 OnHand/Hold integration | 🔜 Pending M3 interface |
| CR-2 | M3 Posting at SHIPPED | 🔜 Pending M3 interface |
| CR-3 | RBAC guards on controllers | 🔜 Pending M1 AuthGuard |

---

## 2. Cấu trúc Code

```
src/modules/outbound/
├── outbound.module.ts              # Module definition
├── controllers/
│   ├── shipment.controller.ts      # CRUD shipment endpoints
│   ├── allocation.controller.ts    # Allocation endpoints
│   ├── weighing.controller.ts      # Weighing endpoints
│   ├── approval.controller.ts      # Approval endpoints
│   └── outbound-query.controller.ts # Query/Dashboard endpoints
├── services/
│   ├── shipment.service.ts         # Core shipment logic
│   ├── shipment-command.service.ts # Command orchestration
│   ├── shipment-query.service.ts   # Query operations
│   ├── shipment-state-machine.service.ts # State transitions
│   ├── shipment-line-state.service.ts    # Line state management
│   ├── allocation.service.ts       # Allocation logic
│   ├── weighing.service.ts         # Weighing orchestration
│   ├── tolerance.service.ts        # Tolerance checking
│   └── approval.service.ts         # Approval workflow
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

---

## 3. API Endpoints

### 3.1 Shipment Management

#### POST /api/v1/outbound/shipments
**Mục đích:** Tạo shipment mới

**Request Body:**
```json
{
  "externalId": "EXT-SHP-001",
  "sourceType": "SO",
  "soId": "SO-2024-001",
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "vehicleNumber": "51C-12345",
  "vehicleTypeId": "uuid",
  "lines": [
    {
      "itemId": "uuid",
      "cargoForm": "BAGGED_50KG",
      "uomId": "uuid",
      "expectedQty": 100,
      "expectedQtyKg": 5000,
      "bagCount": 100,
      "nominalWeightPerBag": 50
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "shipmentNumber": "SHP-2024-00001",
  "status": "DRAFT",
  "lines": [...],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Files liên quan:**
- `controllers/shipment.controller.ts` → `create()`
- `services/shipment-command.service.ts` → `createShipment()`
- `services/shipment.service.ts` → `create()`
- `repositories/shipment-header.repository.ts` → `create()`

---

#### GET /api/v1/outbound/shipments
**Mục đích:** Danh sách shipments với phân trang và filter

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Trang (default: 1) |
| pageSize | number | Số items/trang (default: 20) |
| shipmentNumber | string | Filter theo số shipment |
| soId | string | Filter theo SO ID |
| vehicleNumber | string | Filter theo biển số xe |
| ownerId | uuid | Filter theo owner |
| warehouseId | uuid | Filter theo warehouse |
| status | enum | Filter theo trạng thái |

**Response:** `200 OK`
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

**Files liên quan:**
- `controllers/shipment.controller.ts` → `list()`
- `services/shipment-query.service.ts` → `list()`
- `repositories/shipment-header.repository.ts` → `findMany()`

---

#### GET /api/v1/outbound/shipments/:id
**Mục đích:** Chi tiết shipment theo ID

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "shipmentNumber": "SHP-2024-00001",
  "status": "CONFIRMED",
  "owner": { "ownerCode": "TVL", "ownerName": "Thoresen" },
  "warehouse": { "warehouseCode": "WH01" },
  "lines": [
    {
      "lineNumber": 1,
      "item": { "itemCode": "RICE-01" },
      "expectedQtyKg": 5000,
      "allocatedQty": 5000,
      "lineStatus": "ALLOCATED"
    }
  ]
}
```

**Files liên quan:**
- `controllers/shipment.controller.ts` → `findById()`
- `services/shipment-query.service.ts` → `findById()`
- `repositories/shipment-header.repository.ts` → `findById()`

---

#### POST /api/v1/outbound/shipments/:id/confirm
**Mục đích:** Xác nhận shipment (DRAFT → CONFIRMED)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "CONFIRMED",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Business Rules:**
- Shipment phải có ít nhất 1 line
- Chỉ có thể confirm từ trạng thái DRAFT

**Files liên quan:**
- `controllers/shipment.controller.ts` → `confirm()`
- `services/shipment-command.service.ts` → `confirmShipment()`
- `services/shipment-state-machine.service.ts` → `assertCanTransition()`

---

#### POST /api/v1/outbound/shipments/:id/cancel
**Mục đích:** Hủy shipment

**Request Body:**
```json
{
  "reasonCode": "CUSTOMER_REQUEST"
}
```

**Response:** `200 OK`

**Business Rules:**
- Chỉ cancel được ở DRAFT, CONFIRMED, ALLOCATED
- Nếu đã ALLOCATED, sẽ tự động release allocation

**Files liên quan:**
- `controllers/shipment.controller.ts` → `cancel()`
- `services/shipment-command.service.ts` → `cancelShipment()`

---

### 3.2 Allocation

#### POST /api/v1/outbound/shipments/:id/allocate
**Mục đích:** Phân bổ tồn kho cho shipment

**Response:** `200 OK`
```json
{
  "success": true,
  "shipmentId": "uuid",
  "allocatedLines": 3,
  "failedLines": 0
}
```

**Business Rules:**
- Shipment phải ở trạng thái CONFIRMED
- Allocation theo FIFO (lot_date ASC)
- Nếu 1 line fail → toàn bộ shipment fail (no partial allocation)
- Tạo hold trong Module 3 inventory
- **HI-3 Fixed:** Allocation wrapped trong `$transaction` để atomic
- **HI-6 Fixed:** Gọi `lockForUpdate()` trước khi allocate

**Files liên quan:**
- `controllers/allocation.controller.ts` → `allocate()`
- `services/allocation.service.ts` → `allocateShipment()`

---

#### POST /api/v1/outbound/shipments/:id/unallocate
**Mục đích:** Giải phóng allocation

**Response:** `200 OK`

**Files liên quan:**
- `controllers/allocation.controller.ts` → `unallocate()`
- `services/allocation.service.ts` → `releaseAll()`

---

#### GET /api/v1/outbound/shipments/:id/allocations
**Mục đích:** Xem chi tiết allocation records

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "lineNumber": 1,
    "location": { "locationCode": "A-01-01" },
    "allocatedQty": 2500,
    "lotDate": "2024-01-10",
    "fifoRank": 1,
    "status": "ALLOCATED"
  }
]
```

**Files liên quan:**
- `controllers/allocation.controller.ts` → `getAllocations()`
- `services/shipment-query.service.ts` → `getAllocations()`

---

### 3.3 Weighing

#### POST /api/v1/outbound/shipments/:id/weigh/tare
**Mục đích:** Ghi nhận cân tare (xe không)

**Request Body:**
```json
{
  "rawWeightKg": 8500,
  "sourceMode": "SCALE_AGENT",
  "scaleTicketNo": "TKT-001",
  "externalEventId": "EVT-001"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "weighType": "TARE",
  "sequenceNo": 1,
  "rawWeightKg": 8500,
  "capturedAt": "2024-01-15T11:00:00Z"
}
```

**Business Rules:**
- Idempotent theo externalEventId
- Cập nhật shipment status → WEIGHING_TARE

**Files liên quan:**
- `controllers/weighing.controller.ts` → `recordTare()`
- `services/weighing.service.ts` → `recordTare()`

---

#### POST /api/v1/outbound/shipments/:id/weigh/gross
**Mục đích:** Ghi nhận cân gross (xe có hàng)

**Request Body:**
```json
{
  "lineId": "uuid",
  "rawWeightKg": 13500,
  "sourceMode": "SCALE_AGENT",
  "scaleTicketNo": "TKT-002"
}
```

**Response:** `200 OK`
```json
{
  "attempt": {
    "id": "uuid",
    "weighType": "GROSS",
    "sequenceNo": 2,
    "rawWeightKg": 13500,
    "calculatedNetKg": 5000
  },
  "toleranceResult": {
    "passed": true,
    "variancePct": 0,
    "tolerancePct": 2
  }
}
```

**Business Rules:**
- Phải có tare trước gross
- Net = Gross hiện tại - Gross trước (hoặc Tare nếu là line đầu)
- Tự động check tolerance và tạo exception nếu fail

**Files liên quan:**
- `controllers/weighing.controller.ts` → `recordGross()`
- `services/weighing.service.ts` → `recordGross()`
- `services/tolerance.service.ts` → `checkTolerance()`

---

#### GET /api/v1/outbound/shipments/:id/weighing-history
**Mục đích:** Xem lịch sử cân

**Response:** `200 OK`
```json
[
  { "weighType": "TARE", "sequenceNo": 1, "rawWeightKg": 8500 },
  { "weighType": "GROSS", "sequenceNo": 2, "rawWeightKg": 13500, "calculatedNetKg": 5000 }
]
```

**Files liên quan:**
- `controllers/weighing.controller.ts` → `getWeighingHistory()`
- `services/shipment-query.service.ts` → `getWeighingHistory()`

---

### 3.4 Approval

#### GET /api/v1/outbound/approvals/pending
**Mục đích:** Danh sách shipments chờ duyệt

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | uuid | Filter theo warehouse |

**Response:** `200 OK`

**Files liên quan:**
- `controllers/approval.controller.ts` → `getPendingApprovals()`
- `services/approval.service.ts` → `getPendingApprovals()`

---

#### POST /api/v1/outbound/shipments/:id/approve
**Mục đích:** Duyệt shipment/line có tolerance fail

**Request Body:**
```json
{
  "lineId": "uuid",
  "reasonCode": "ACCEPTABLE_VARIANCE",
  "note": "Chấp nhận chênh lệch 1.5%"
}
```

**Response:** `200 OK`

**Business Rules:**
- Nếu có lineId → approve line đó
- Nếu không có lineId → approve toàn bộ shipment
- Resolve các exception liên quan
- **HI-4 Fixed:** `decidedBy` extracted từ `x-user-id` header

**Files liên quan:**
- `controllers/approval.controller.ts` → `approve()`
- `services/approval.service.ts` → `processApproval()`

---

#### POST /api/v1/outbound/shipments/:id/reject
**Mục đích:** Từ chối shipment/line

**Request Body:**
```json
{
  "lineId": "uuid",
  "reasonCode": "VARIANCE_TOO_HIGH",
  "note": "Chênh lệch quá lớn"
}
```

**Response:** `200 OK`

**Files liên quan:**
- `controllers/approval.controller.ts` → `reject()`
- `services/approval.service.ts` → `processApproval()`

---

### 3.5 Query & Dashboard

#### GET /api/v1/outbound/shipments/:id/history
**Mục đích:** Lịch sử trạng thái shipment

**Response:** `200 OK`
```json
[
  {
    "fromStatus": "DRAFT",
    "toStatus": "CONFIRMED",
    "triggerAction": "CONFIRM",
    "changedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Files liên quan:**
- `controllers/outbound-query.controller.ts` → `getHistory()`
- `services/shipment-query.service.ts` → `getStatusHistory()`

---

#### GET /api/v1/outbound/shipments/:id/exceptions
**Mục đích:** Danh sách exceptions của shipment

**Response:** `200 OK`
```json
[
  {
    "exceptionType": "TOLERANCE_FAIL",
    "exceptionCode": "TOLERANCE_OVER",
    "severity": "HIGH",
    "status": "OPEN",
    "detailJson": { "variancePct": 3.5 }
  }
]
```

**Files liên quan:**
- `controllers/outbound-query.controller.ts` → `getExceptions()`
- `services/shipment-query.service.ts` → `getExceptions()`

---

#### GET /api/v1/outbound/dashboard/summary
**Mục đích:** Tổng quan dashboard

**Response:** `200 OK`
```json
{
  "totalDraft": 5,
  "totalConfirmed": 10,
  "totalAllocated": 8,
  "totalPicking": 3,
  "totalPendingApproval": 2,
  "totalShippedToday": 15
}
```

**Files liên quan:**
- `controllers/outbound-query.controller.ts` → `getDashboardSummary()`
- `repositories/shipment-header.repository.ts` → `getDashboardSummary()`

---

## 4. State Machine

### 4.1 Shipment States
```
DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → WEIGHING_TARE → LOADING → ALL_WEIGHED → SHIPPED → CLOSED
                                                                    ↓
                                                              PENDING_APPROVAL
```

### 4.2 Line States
```
PENDING → ALLOCATED → PICKING → PICKED → LOADING → WEIGHED_PASS/WEIGHED_FAIL → LINE_SHIPPED
```

### 4.3 Allowed Transitions

| From | To | Action |
|------|-----|--------|
| DRAFT | CONFIRMED | CONFIRM |
| DRAFT | CANCELLED | CANCEL |
| CONFIRMED | ALLOCATED | ALLOCATE |
| CONFIRMED | CANCELLED | CANCEL |
| ALLOCATED | PICKING | START_PICK |
| ALLOCATED | CONFIRMED | UNALLOCATE |
| ALL_WEIGHED | SHIPPED | SHIP |
| PENDING_APPROVAL | ALL_WEIGHED | APPROVE |
| PENDING_APPROVAL | LOADING | REWEIGH |
| SHIPPED | CLOSED | CLOSE |

---

## 5. Error Codes

| Code | Description |
|------|-------------|
| OUTBOUND_001 | Shipment not found |
| OUTBOUND_002 | Invalid state transition |
| OUTBOUND_003 | No lines to process |
| OUTBOUND_004 | Duplicate external ID |
| ALLOC_001 | Insufficient stock |
| ALLOC_002 | Cannot allocate - invalid status |
| WEIGH_001 | Must record tare first |
| WEIGH_002 | Duplicate weight event |
| TOL_001 | Tolerance exceeded |
| APPR_001 | Not pending approval |

---

## 6. Dependencies

| Module | Usage |
|--------|-------|
| M1 Foundation | NumberSequence, ReasonCode, AuditLog |
| M2 Master Data | Owner, Item, Warehouse, Location, VehicleType |
| M3 Inventory Core | OnHand query, Hold creation, Posting |

---

## 7. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03 | Initial implementation |
| 1.1.0 | 2026-03-08 | Feedback fixes: HI-2 tolerance cascade, HI-3 $transaction, HI-4 decidedBy, HI-6 lockForUpdate |
