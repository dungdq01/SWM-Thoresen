# Module 7: Work Execution & Mobile Operations

## Mục đích

Module 7 là **execution orchestration layer** của kho, chịu trách nhiệm:

- Quản lý lifecycle của work (tạo, claim, start, execute, skip, cancel, complete)
- Hỗ trợ mobile execution với offline sync capability
- Tạo inventory posting effects qua M3 cho putaway/pick/move/transfer
- Callback/handoff về module nguồn (M4/M5/M6) sau khi work hoàn tất
- Dashboard supervisor và SLA monitoring

**Quan trọng:** M7 **không sở hữu** business state của Receipt/Shipment/Transfer Order. Nó chỉ thực thi task và post inventory effects.

---

## Cấu trúc Module

```
backend/src/modules/work-execution/
├── work-execution.module.js      # Module exports
├── work-execution.routes.js      # API routes
├── work-execution.controller.js  # HTTP controller
├── work-execution.schema.js      # Validation schemas
├── index.js                      # Entry point
├── domain/
│   ├── work.types.js            # Enums và constants
│   ├── work.errors.js           # Error definitions
│   ├── work.state-machine.js    # State transitions
│   └── work.policy.js           # Business policies
├── application/
│   ├── generateWork.usecase.js  # Tạo work từ trigger
│   ├── claimWork.usecase.js     # Claim/Release work
│   ├── startWork.usecase.js     # Start header/line
│   ├── completeLine.usecase.js  # Complete line + posting + exception
│   ├── skipLine.usecase.js      # Skip line
│   ├── cancelWork.usecase.js    # Cancel work + reversal
│   ├── getWorkList.usecase.js   # Query usecases
│   ├── syncBatch.usecase.js     # Mobile sync
│   ├── validateScan.usecase.js  # QR validation
│   └── deliverOutbox.usecase.js # Outbox delivery (HI-2 fix)
└── infra/
    ├── workHeader.repository.js  # + optimistic locking (HI-3 fix)
    ├── workLine.repository.js    # + optimistic locking (HI-3 fix)
    ├── workEvent.repository.js
    ├── workException.repository.js
    ├── workOutbox.repository.js  # + delivery methods (HI-2 fix)
    ├── mobileSync.repository.js
    ├── inventoryAdapter.js       # M3 posting + reversal (HI-4/5 fix)
    ├── auditLogAdapter.js        # M1 audit integration (HI-6 fix)
    └── work.mapper.js            # DTO mappers
```

---

## API Reference

### Query APIs

#### `GET /api/v1/works`
List works cho web dashboard.

**Query Parameters:**
| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| warehouseId | UUID | No | Filter theo warehouse |
| status | String | No | OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| workType | String | No | PUTAWAY, PICK, MOVE, TRANSFER_PICK, TRANSFER_PUT |
| assignedTo | UUID | No | Filter theo người được assign |
| page | Number | No | Default: 1 |
| pageSize | Number | No | Default: 20, Max: 100 |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [{
      "id": "uuid",
      "workId": "WRK-20260308-001",
      "workType": "PUTAWAY",
      "status": "OPEN",
      "priorityNo": 50,
      "warehouseId": "uuid",
      "sourceModule": "M4",
      "sourceRefId": "RCV-001",
      "assignedTo": null,
      "createdAt": "2026-03-08T10:00:00Z",
      "lineSummary": { "total": 3, "completed": 0, "open": 3 }
    }],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

#### `GET /api/v1/works/:id`
Lấy chi tiết work.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workId": "WRK-20260308-001",
    "workType": "PUTAWAY",
    "status": "IN_PROGRESS",
    "lines": [{
      "id": "uuid",
      "lineNum": 1,
      "stepType": "PUT",
      "status": "COMPLETED",
      "itemId": "uuid",
      "expectedQty": 100,
      "actualQty": 98,
      "uom": "KG",
      "postingStatus": "POSTED"
    }],
    "exceptions": []
  }
}
```

---

#### `GET /api/v1/works/:id/history`
Xem timeline status/event.

---

#### `GET /api/v1/works/:id/exceptions`
Xem exceptions của work.

---

#### `GET /api/v1/works/dashboard/summary`
Dashboard summary.

**Query:** `warehouseId` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "byStatus": { "OPEN": 15, "IN_PROGRESS": 8, "COMPLETED": 120 },
    "byType": { "PUTAWAY": 10, "PICK": 13 },
    "openExceptions": 3
  }
}
```

---

### Command APIs - Header Level

#### `POST /api/v1/works/:id/claim`
Claim work để thực thi.

**Request Body:**
```json
{
  "externalId": "optional-idempotency-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "workId": "WRK-001", "status": "OPEN", "assignedTo": "user-uuid" },
  "isIdempotent": false
}
```

**Lỗi có thể xảy ra:**
- `WE-404-001`: Work not found
- `WE-409-001`: Work already claimed

---

#### `POST /api/v1/works/:id/release`
Trả work về pool.

---

#### `POST /api/v1/works/:id/start`
Bắt đầu thực thi work (chuyển OPEN → IN_PROGRESS).

**Lỗi có thể xảy ra:**
- `WE-409-005`: Work not claimed

---

#### `POST /api/v1/works/:id/cancel`
Hủy work.

**Request Body:**
```json
{
  "reasonCode": "CUSTOMER_CANCEL",
  "remark": "Optional note"
}
```

---

### Command APIs - Line Level

#### `POST /api/v1/works/:id/lines/:lineNum/start`
Bắt đầu thực thi line.

---

#### `POST /api/v1/works/:id/lines/:lineNum/complete`
Hoàn tất line và tạo inventory posting.

**Request Body:**
```json
{
  "actualQty": 98.5,
  "scannedLocationCode": "STORAGE-A-01",
  "externalId": "optional-idempotency-key"
}
```

**Side Effects:**
1. Cập nhật line status → COMPLETED
2. Gọi M3 để post movement inventory
3. Nếu tất cả lines xong → header COMPLETED
4. Tạo outbox event callback về M4/M5/M6

**Lỗi có thể xảy ra:**
- `WE-422-001`: Invalid scanned location
- `WE-422-003`: Actual quantity invalid
- `WE-422-004`: Short pick threshold exceeded
- `WE-500-001`: Inventory posting failed

---

#### `POST /api/v1/works/:id/lines/:lineNum/skip`
Bỏ qua line (cần manager).

**Request Body:**
```json
{
  "reasonCode": "ITEM_NOT_FOUND",
  "remark": "Không tìm thấy hàng tại vị trí"
}
```

---

#### `POST /api/v1/works/:id/manager-override-complete`
Manager override complete khi cần.

**Request Body:**
```json
{
  "lineNum": 1,
  "actualQty": 95,
  "reasonCode": "DAMAGED_PACKAGING",
  "evidenceText": "Bao hàng bị rách, đã xác nhận số lượng thực tế là 95kg"
}
```

---

### Mobile APIs

#### `GET /api/v1/mobile/works/available`
Danh sách works có thể claim.

**Query:** `warehouseId` (required), `workTypes` (optional array)

---

#### `GET /api/v1/mobile/works/my`
Works đã claim của user.

---

#### `POST /api/v1/mobile/scan/validate`
Validate QR location trước khi complete.

**Request Body:**
```json
{
  "workId": "WRK-001",
  "lineNum": 1,
  "scannedLocationCode": "STORAGE-A-01"
}
```

---

#### `POST /api/v1/mobile/works/sync`
Batch sync offline events từ mobile.

**Request Body:**
```json
{
  "batchExternalId": "BATCH-001",
  "deviceId": "device-uuid",
  "events": [{
    "externalId": "EVT-001",
    "sequenceNo": 1,
    "eventType": "COMPLETE_LINE",
    "workId": "WRK-001",
    "payload": {
      "lineNum": 1,
      "actualQty": 100,
      "scannedLocationCode": "STORAGE-A-01"
    }
  }]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchNo": "BATCH-001",
    "syncStatus": "PARTIAL",
    "successCount": 2,
    "duplicateCount": 1,
    "conflictCount": 0
  },
  "eventResults": [
    { "externalId": "EVT-001", "result": "SUCCESS" },
    { "externalId": "EVT-002", "result": "DUPLICATE" }
  ]
}
```

---

### Internal API

#### `POST /api/v1/internal/works/generate`
Tạo work từ M4/M5/M6 trigger.

**Request Body:**
```json
{
  "workType": "PUTAWAY",
  "warehouseId": "uuid",
  "sourceModule": "M4",
  "sourceType": "RECEIPT",
  "sourceRefId": "RCV-001",
  "lines": [{
    "itemId": "uuid",
    "ownerId": "uuid",
    "fromLocationId": "uuid",
    "expectedQty": 100,
    "uom": "KG"
  }]
}
```

---

## State Machine

### Work Header States
```
OPEN ──────────────► IN_PROGRESS ──────────────► COMPLETED
  │                       │
  │                       │
  └─────► CANCELLED ◄─────┘
```

### Work Line States
```
OPEN ──────────────► IN_PROGRESS ──────────────► COMPLETED
  │                       │                           
  │                       ├─────────────────────► SKIPPED
  │                       │
  └─────► CANCELLED ◄─────┘
```

---

## Posting Rules

| Work Type | Posting Type | From | To |
|-----------|-------------|------|-----|
| PUTAWAY | MOVE | RECEIVING | STORAGE |
| PICK | MOVE | STORAGE | STAGING |
| MOVE | MOVE | Source | Destination |
| TRANSFER_PICK | TRANSFER_SHIP | STORAGE | STAGING |
| TRANSFER_PUT | TRANSFER_RECEIVE | RECEIVING | STORAGE |

---

## Error Codes

| Code | HTTP | Mô tả |
|------|------|-------|
| WE-404-001 | 404 | Work not found |
| WE-404-002 | 404 | Work line not found |
| WE-409-001 | 409 | Work already claimed |
| WE-409-002 | 409 | Invalid state transition |
| WE-409-003 | 409 | Work already completed |
| WE-409-004 | 409 | Duplicate external_id |
| WE-409-005 | 409 | Work not claimed |
| WE-422-001 | 422 | Invalid scanned location |
| WE-422-002 | 422 | Location type not allowed |
| WE-422-003 | 422 | Actual quantity invalid |
| WE-422-004 | 422 | Short pick threshold exceeded |
| WE-422-005 | 422 | Manager evidence required |
| WE-423-001 | 423 | Work locked by another action |
| WE-500-001 | 500 | Inventory posting failed |
| WE-500-002 | 500 | Callback delivery failed |

---

## Permissions

| Code | Mô tả |
|------|-------|
| WORK.EXECUTION.READ | Xem danh sách và chi tiết work |
| WORK.EXECUTION.CLAIM | Claim/Release work |
| WORK.EXECUTION.START | Start work/line |
| WORK.EXECUTION.COMPLETE | Complete line |
| WORK.EXECUTION.SKIP | Skip line (manager) |
| WORK.EXECUTION.CANCEL | Cancel work |
| WORK.EXECUTION.OVERRIDE | Manager override complete |
| WORK.EXECUTION.GENERATE | Generate work từ trigger |
| WORK.MOBILE.SYNC | Mobile batch sync |
| WORK.DASHBOARD.READ | View dashboard |

---

## Dependencies

| Module | Dependency Type | Mô tả |
|--------|-----------------|-------|
| M1 Foundation | Consume | RBAC, reason codes, **audit log** (HI-6), idempotency |
| M2 Master Data | Consume | Location, warehouse, item validation |
| M3 Inventory Core | Call | Post movement inventory + **reversal** (HI-4) |
| M4 Inbound | Trigger/Callback | Putaway work source |
| M5 Outbound | Trigger/Callback | Pick work source |
| M6 Inventory Control | Trigger/Callback | Move/transfer work source |

---

## Feedback Fixes Applied (v2)

| Issue | Description | Fix |
|-------|-------------|-----|
| HI-1 | Posting failure does not create exception | Tạo `WeWorkException` với type `POSTING_FAILED` khi post thất bại |
| HI-2 | No outbox consumer/publisher | Thêm `deliverOutbox.usecase.js` và các methods trong `workOutbox.repository.js` |
| HI-3 | versionNo never checked | Thêm `updateWithOptimisticLock()` trong repositories |
| HI-4 | Cancel does not reverse posted InventTrans | Thêm `reversePosting()` trong `inventoryAdapter.js`, gọi khi cancel |
| HI-5 | Inventory adapter mock fallback | Xóa mock, trả `success: false` nếu PostingEngine không có |
| HI-6 | No M1 AuditLog integration | Thêm `auditLogAdapter.js` integrate với M1 |

---

## Posting Status Flow

```
PENDING ───► POSTED ───► REVERSED (khi cancel)
    │
    └───► FAILED (tạo exception)
```

---

## Outbox Delivery

Outbox events được deliver qua `DeliverOutboxUseCase`:

```javascript
// Gọi từ scheduled job hoặc manual trigger
const usecase = new DeliverOutboxUseCase(outboxRepo, httpClient);
const result = await usecase.execute(50); // batch size
// { total: 10, sent: 8, failed: 1, dead: 1 }
```

**Retry policy:** Exponential backoff, max 5 retries, sau đó DEAD.

---

## Audit Log Events

M7 log các events sau vào M1 AuditLog:

| Event | Entity | Trigger |
|-------|--------|--------|
| WORK_CREATED | WeWorkHeader | generateWork |
| WORK_CLAIMED | WeWorkHeader | claimWork |
| WORK_RELEASED | WeWorkHeader | releaseWork |
| WORK_STARTED | WeWorkHeader | startWork |
| WORK_COMPLETED | WeWorkHeader | auto-complete |
| WORK_CANCELLED | WeWorkHeader | cancelWork |
| WORK_LINE_COMPLETED | WeWorkLine | completeLine |
| WORK_LINE_SKIPPED | WeWorkLine | skipLine |
| WORK_MANAGER_OVERRIDE | WeWorkLine | override complete |
| WORK_POSTING_REVERSED | WeWorkLine | cancel reversal |
