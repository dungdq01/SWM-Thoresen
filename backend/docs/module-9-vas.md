# Module 9: VAS / Bagging Operations — API Documentation

**Module Name:** VAS / Bagging Operations  
**Code Path:** `src/modules/vas`  
**Status:** ✅ Implemented  
**Version:** 1.1.0  
**Last Updated:** 2026-03-09

### Changelog v1.1.0
- ✅ **M3 Integration:** Real PostingEngine + HoldService integration via `InventoryCoreAdapter`
- ✅ **RBAC:** Added `VasAuthGuard` + `VasPermissionGuard` on all controllers
- ✅ **Packaging Check:** Block session if cumulative bags exceed available packaging

---

## 1. Tổng quan Module

Module 9 quản lý quy trình **đóng bao hàng xá (VAS - Value Added Service)**, chuyển đổi hàng bulk thành hàng đóng bao (bagged).

### Chức năng chính:
- Quản lý vòng đời Work Order (WO) đóng bao
- Ghi nhận tiến độ theo session (ca làm việc)
- Reserve stock khi confirm, post inventory khi complete
- Gửi billing event qua outbox pattern

### Nguyên tắc quan trọng:
1. **Posting point duy nhất** tại trạng thái `COMPLETED`
2. **Module không sở hữu inventory truth** - mọi posting qua M3 (Inventory Core)
3. **Packaging luôn trừ tồn** cho cả TVL_OWNED và CLIENT_OWNED
4. **Idempotent** - mọi command API có external_id

---

## 2. Database Tables

| Table | Description |
|-------|-------------|
| `vas_work_order` | Header work order đóng bao |
| `vas_session` | Session progress theo ca |
| `vas_state_history` | Lịch sử chuyển trạng thái |
| `vas_exception_log` | Log exception nghiệp vụ |
| `vas_outbox` | Billing event outbox |

---

## 3. API Endpoints

### 3.1 POST `/api/v1/vas-wo` — Tạo Work Order

**Mô tả:** Tạo VAS Work Order mới với trạng thái DRAFT.

**Request Body:**
```json
{
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "bulkSourceItemId": "uuid",
  "baggedOutputItemId": "uuid",
  "plannedQtyKg": 50000.000,
  "packagingOwnership": "TVL_OWNED | CLIENT_OWNED",
  "packagingItemId": "uuid",
  "packagingOwnerId": "uuid",
  "packagingQtyPlanned": 1000,
  "startDate": "2026-03-15",
  "estimatedCompletionDate": "2026-03-20",
  "notes": "Ghi chú",
  "externalId": "EXT-VAS-001"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "woNumber": "VAS-20260315-000001",
  "status": "DRAFT"
}
```

**Files liên quan:**
- `controllers/vas-wo-command.controller.ts` → `create()`
- `services/create-vas-wo.service.ts`
- `dto/create-vas-wo.dto.ts`

---

### 3.2 PATCH `/api/v1/vas-wo/:id` — Update Work Order

**Mô tả:** Cập nhật WO (chỉ khi DRAFT).

**Request Body:**
```json
{
  "plannedQtyKg": 60000.000,
  "packagingQtyPlanned": 1200,
  "notes": "Cập nhật ghi chú",
  "rowVersion": 1
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "woNumber": "VAS-20260315-000001",
  "status": "DRAFT"
}
```

**Files liên quan:**
- `controllers/vas-wo-command.controller.ts` → `update()`
- `services/update-vas-wo.service.ts`
- `dto/update-vas-wo.dto.ts`

---

### 3.3 POST `/api/v1/vas-wo/:id/confirm` — Xác nhận WO

**Mô tả:** Xác nhận WO, kiểm tra stock và reserve bulk.

**Business Logic:**
1. Kiểm tra bulk available >= planned_qty
2. Kiểm tra packaging available >= packaging_qty_planned
3. Reserve bulk qua M3 HoldService
4. Chuyển trạng thái DRAFT → CONFIRMED

**Request Body:**
```json
{
  "externalId": "EXT-CONFIRM-001"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "woNumber": "VAS-20260315-000001",
  "status": "CONFIRMED"
}
```

**Error Cases:**
- `422 VAS_INSUFFICIENT_BULK` - Không đủ bulk stock
- `422 VAS_INSUFFICIENT_PACKAGING` - Không đủ packaging stock

**Files liên quan:**
- `controllers/vas-wo-command.controller.ts` → `confirm()`
- `services/confirm-vas-wo.service.ts`
- `facades/vas-inventory.facade.ts`

---

### 3.4 POST `/api/v1/vas-wo/:id/session` — Thêm Session

**Mô tả:** Ghi nhận tiến độ đóng bao theo ca.

**Business Logic:**
1. Session đầu tiên chuyển trạng thái CONFIRMED → IN_PROGRESS
2. Tính productivity_rate = session_qty_kg / work_hours

**Request Body:**
```json
{
  "sessionDate": "2026-03-15",
  "shiftCode": "MORNING | AFTERNOON | NIGHT",
  "sessionQtyKg": 5000.000,
  "sessionBagCount": 100,
  "workHours": 8.0,
  "isOvertime": false,
  "startTime": "2026-03-15T06:00:00Z",
  "endTime": "2026-03-15T14:00:00Z",
  "notes": "Ca sáng",
  "externalId": "EXT-SESSION-001"
}
```

**Response 201:**
```json
{
  "sessionId": "uuid",
  "sessionNum": 1,
  "woStatus": "IN_PROGRESS"
}
```

**Files liên quan:**
- `controllers/vas-session.controller.ts`
- `services/add-vas-session.service.ts`
- `dto/add-vas-session.dto.ts`

---

### 3.5 POST `/api/v1/vas-wo/:id/complete` — Hoàn thành WO

**Mô tả:** Hoàn thành WO, post inventory và trigger billing.

**Business Logic:**
1. Validate material balance: `consumed >= output`
2. Post 3 inventory transactions qua M3:
   - ISSUE: bulk consumed
   - RECEIPT: bagged output
   - ISSUE: packaging consumed
3. Release reservation
4. Insert billing outbox event

**Request Body:**
```json
{
  "actualConsumedQtyKg": 50000.000,
  "actualOutputQtyKg": 49500.000,
  "actualBagCount": 990,
  "packagingQtyActual": 990,
  "yieldVarianceReasonCode": "PROCESS_LOSS_NORMAL",
  "notes": "Hoàn thành",
  "externalId": "EXT-COMPLETE-001"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "woNumber": "VAS-20260315-000001",
  "status": "COMPLETED",
  "transIds": ["TRX-VAS-C-xxx", "TRX-VAS-P-xxx", "TRX-VAS-K-xxx"]
}
```

**Error Cases:**
- `422 VAS_INVALID_MATERIAL_BALANCE` - consumed < output
- `422 VAS_REASON_REQUIRED` - process loss > 2% nhưng không có reason

**Files liên quan:**
- `controllers/vas-wo-command.controller.ts` → `complete()`
- `services/complete-vas-wo.service.ts`
- `facades/vas-inventory.facade.ts`
- `facades/vas-billing.facade.ts`

---

### 3.6 POST `/api/v1/vas-wo/:id/cancel` — Hủy WO

**Mô tả:** Hủy WO và release reservation nếu có.

**Request Body:**
```json
{
  "reasonCode": "CUSTOMER_REQUEST",
  "remarks": "Khách hàng yêu cầu hủy",
  "externalId": "EXT-CANCEL-001"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "woNumber": "VAS-20260315-000001",
  "status": "CANCELLED"
}
```

**Files liên quan:**
- `controllers/vas-wo-command.controller.ts` → `cancel()`
- `services/cancel-vas-wo.service.ts`

---

### 3.7 GET `/api/v1/vas-wo` — Danh sách WO

**Mô tả:** Lấy danh sách Work Orders với filter và pagination.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| warehouseId | uuid | Filter theo warehouse |
| ownerId | uuid | Filter theo owner |
| status | enum | DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| bulkSourceItemId | uuid | Filter theo bulk item |
| createdFrom | date | Từ ngày tạo |
| createdTo | date | Đến ngày tạo |
| keyword | string | Tìm theo wo_number |
| page | int | Trang (default: 1) |
| limit | int | Số record (default: 20, max: 100) |

**Response 200:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Files liên quan:**
- `controllers/vas-wo-query.controller.ts` → `list()`
- `services/vas-query.service.ts`

---

### 3.8 GET `/api/v1/vas-wo/:id` — Chi tiết WO

**Response 200:**
```json
{
  "wo": { ... },
  "sessions": [...],
  "sessionSummary": {
    "totalQtyKg": "50000.000",
    "totalBagCount": 1000,
    "totalWorkHours": "80.00",
    "sessionCount": 10,
    "overtimeSessionCount": 2
  },
  "stateHistory": [...],
  "exceptions": [...],
  "outboxEvents": [...]
}
```

---

### 3.9 GET `/api/v1/vas-wo/:id/sessions` — Sessions của WO

### 3.10 GET `/api/v1/vas-wo/:id/history` — Lịch sử trạng thái

---

## 4. State Machine

```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
  ↓         ↓            ↓
CANCELLED CANCELLED  CANCELLED
```

| Transition | Trigger | Side Effect |
|------------|---------|-------------|
| DRAFT → CONFIRMED | Confirm | Reserve bulk |
| CONFIRMED → IN_PROGRESS | First session | Set started_at |
| IN_PROGRESS → COMPLETED | Complete | Post inventory, billing outbox |
| * → CANCELLED | Cancel | Release reservation |

---

## 5. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VAS_WO_NOT_FOUND | 404 | WO không tồn tại |
| VAS_INVALID_STATE | 409 | Trạng thái không hợp lệ |
| VAS_DUPLICATE_EXTERNAL_ID | 409 | Duplicate external_id |
| VAS_INSUFFICIENT_BULK | 422 | Không đủ bulk stock |
| VAS_INSUFFICIENT_PACKAGING | 422 | Không đủ packaging stock |
| VAS_INVALID_MATERIAL_BALANCE | 422 | consumed < output |
| VAS_REASON_REQUIRED | 422 | Cần reason code |
| VAS_OPTIMISTIC_LOCK_FAILED | 409 | Row version conflict |

---

## 6. Code Structure

```
src/modules/vas/
├── vas.module.ts
├── adapters/
│   ├── index.ts
│   └── inventory-core.adapter.ts    # Bridge to M3 PostingEngine + HoldService
├── guards/
│   └── vas-auth.guard.ts            # VasAuthGuard + VasPermissionGuard
├── controllers/
│   ├── vas-wo-command.controller.ts  # @UseGuards(VasAuthGuard, VasPermissionGuard)
│   ├── vas-wo-query.controller.ts    # @UseGuards(VasAuthGuard, VasPermissionGuard)
│   └── vas-session.controller.ts     # @UseGuards(VasAuthGuard, VasPermissionGuard)
├── dto/
│   ├── create-vas-wo.dto.ts
│   ├── update-vas-wo.dto.ts
│   ├── confirm-vas-wo.dto.ts
│   ├── add-vas-session.dto.ts
│   ├── complete-vas-wo.dto.ts
│   ├── cancel-vas-wo.dto.ts
│   └── query-vas-wo.dto.ts
├── services/
│   ├── create-vas-wo.service.ts
│   ├── update-vas-wo.service.ts
│   ├── confirm-vas-wo.service.ts     # Uses InventoryCoreAdapter for reserveVasBulk
│   ├── add-vas-session.service.ts    # Checks packaging availability
│   ├── complete-vas-wo.service.ts    # Uses InventoryCoreAdapter for postVasCompletion
│   ├── cancel-vas-wo.service.ts      # Uses InventoryCoreAdapter for releaseVasReservation
│   ├── vas-query.service.ts
│   ├── vas-state-machine.service.ts
│   └── vas-validation.service.ts
├── repositories/
│   ├── vas-work-order.repository.ts
│   ├── vas-session.repository.ts     # getCumulativeBagCount for packaging check
│   ├── vas-state-history.repository.ts
│   ├── vas-exception-log.repository.ts
│   └── vas-outbox.repository.ts
├── facades/
│   ├── vas-inventory.facade.ts       # Uses InventoryCoreAdapter
│   └── vas-billing.facade.ts
└── domain/
    ├── vas.enums.ts
    └── vas.errors.ts
```

---

## 7. Dependencies

### Inbound (Module 9 phụ thuộc):
- **M1 (Foundation):** NumberSequence, ReasonCode, AuditLog
- **M2 (Master Data):** MdOwner, MdItem, MdWarehouse
- **M3 (Inventory Core):** OnHand, InventoryHold, InventTrans

### Outbound (Module phụ thuộc M9):
- **M5 (Outbound):** Check reserved_qty_vas khi allocate
- **M10 (Billing):** Receive BAGGING_FEE_CAPTURE event

---

## 8. RBAC Permissions

| Permission | Description |
|------------|-------------|
| VAS.WO.CREATE | Tạo work order |
| VAS.WO.UPDATE | Cập nhật work order |
| VAS.WO.CONFIRM | Xác nhận work order |
| VAS.WO.COMPLETE | Hoàn thành work order |
| VAS.WO.CANCEL | Hủy work order |
| VAS.WO.READ | Xem work order |
| VAS.SESSION.CREATE | Thêm session |
| VAS.SESSION.READ | Xem sessions |
