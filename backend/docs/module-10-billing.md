# Module 10: Billing & Commercial Control

**Status:** ✅ Implemented  
**Version:** 1.0.0  
**Code Path:** `src/modules/billing`  
**Database Docs:** [`prisma/docs/module-10-billing.md`](../prisma/docs/module-10-billing.md)

---

## Mục đích

Module 10 là **commercial orchestration layer** của SWM, chịu trách nhiệm:
- Quản lý hợp đồng tính phí (Contract) theo owner
- Capture billing events từ M4 (Inbound), M5 (Outbound), M9 (VAS)
- Daily storage snapshot từ M3 (Inventory Core)
- Charge calculation engine với rate resolution
- Debit Note lifecycle: DRAFT → REVIEWED → APPROVED → LOCKED
- Exception queue management
- ERP push handoff

### Công thức Storage đặc thù TVL
```
Billable Qty = Opening + Inbound Today (không trừ outbound trong ngày)
```

---

## Cấu trúc Code

```
src/modules/billing/
├── billing.module.ts              # Module definition
├── controllers/
│   ├── billing-contract.controller.ts
│   ├── billing-day-type.controller.ts
│   ├── billing-event.controller.ts
│   ├── billing-exception.controller.ts
│   ├── debit-note.controller.ts
│   └── index.ts
├── services/
│   ├── billing-contract.service.ts
│   ├── billing-day-type.service.ts
│   ├── billing-event.service.ts
│   ├── billing-exception.service.ts
│   ├── charge-calculation.service.ts
│   ├── debit-note.service.ts
│   ├── rate-resolution.service.ts
│   └── index.ts
├── repositories/
│   ├── billing-contract.repository.ts
│   ├── billing-day-type.repository.ts
│   ├── billing-event.repository.ts
│   ├── billing-exception.repository.ts
│   ├── debit-note.repository.ts
│   └── index.ts
├── dto/
│   ├── billing-event.dto.ts
│   ├── create-contract.dto.ts
│   ├── day-type.dto.ts
│   ├── debit-note.dto.ts
│   ├── exception.dto.ts
│   └── index.ts
└── domain/
    ├── billing.enums.ts
    ├── billing.errors.ts
    ├── debit-note-state-machine.ts
    └── index.ts
```

---

## API Endpoints

### 1. Contract APIs

#### POST `/api/v1/billing/contracts`
Tạo contract mới.

**Request Body:**
```json
{
  "ownerId": "uuid",
  "effectiveFrom": "2025-01-01",
  "effectiveTo": "2025-12-31",
  "currencyCode": "VND",
  "isDefault": false,
  "notes": "Contract note",
  "externalId": "CONTRACT-2025-001",
  "feeLines": [
    {
      "feeType": "STORAGE",
      "cargoForm": "BULK",
      "unitRate": 50000,
      "freeDays": 5,
      "billingUom": "MT"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contractNumber": "CONTRACT-00001",
    "ownerId": "uuid",
    "status": "DRAFT",
    "effectiveFrom": "2025-01-01",
    "effectiveTo": "2025-12-31",
    "feeLines": [...]
  },
  "meta": { "isReplay": false }
}
```

#### GET `/api/v1/billing/contracts`
Danh sách contracts với filter.

**Query Parameters:**
- `ownerId` (optional): Filter theo owner
- `status` (optional): DRAFT | ACTIVE | INACTIVE | EXPIRED
- `effectiveDate` (optional): Filter contract có hiệu lực tại ngày
- `page`, `limit`: Pagination

#### GET `/api/v1/billing/contracts/:id`
Chi tiết contract.

#### PUT `/api/v1/billing/contracts/:id`
Cập nhật contract (chỉ cho phép khi status = DRAFT).

#### POST `/api/v1/billing/contracts/:id/activate`
Kích hoạt contract.

#### POST `/api/v1/billing/contracts/:id/deactivate`
Vô hiệu hóa contract.

#### GET `/api/v1/billing/contracts/:id/fee-lines`
Danh sách fee lines của contract.

---

### 2. Day Type APIs

#### POST `/api/v1/billing/day-types`
Upsert day type calendar.

**Request Body:**
```json
{
  "calendarDate": "2025-01-01",
  "dayType": "HOLIDAY",
  "defaultOtMultiplier": 2.0,
  "noOtMultiplier": 1.5,
  "withOtMultiplier": 2.5,
  "notes": "Tết Dương lịch"
}
```

#### POST `/api/v1/billing/day-types/bulk`
Bulk upsert nhiều ngày.

#### GET `/api/v1/billing/day-types`
Danh sách day types với filter.

---

### 3. Billing Event APIs

#### GET `/api/v1/billing/events`
Danh sách billing events.

**Query Parameters:**
- `ownerId`, `eventType`, `fromDate`, `toDate`, `billingStatus`, `sourceModule`

#### GET `/api/v1/billing/events/:id`
Chi tiết billing event.

#### POST `/internal/billing/events/capture` (Internal API)
Capture billing event từ các module khác.

**Request Body:**
```json
{
  "eventType": "INBOUND_HANDLING",
  "refType": "RECEIPT",
  "refId": "RCP-00001",
  "ownerId": "uuid",
  "warehouseId": "uuid",
  "itemId": "uuid",
  "cargoForm": "BULK",
  "billingQtyMt": 100.5,
  "eventDate": "2025-01-15",
  "operationTimestamp": "2025-01-15T10:30:00Z",
  "isOvertime": false,
  "sourceModule": "M4",
  "externalId": "M4-RCP-00001-HDL",
  "correlationId": "uuid"
}
```

---

### 4. Debit Note APIs

#### POST `/api/v1/billing/debit-notes`
Generate debit note cho một period.

**Request Body:**
```json
{
  "ownerId": "uuid",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "externalId": "DN-GEN-2025-01-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dnNumber": "DN-00001",
    "ownerId": "uuid",
    "status": "DRAFT",
    "billingPeriodStart": "2025-01-01",
    "billingPeriodEnd": "2025-01-31",
    "totalBeforeVat": 5000000,
    "vatRate": 0.1,
    "vatAmount": 500000,
    "grandTotal": 5500000,
    "lines": [
      {
        "lineSeq": 1,
        "chargeCode": "INBOUND_HANDLING-MT",
        "description": "Phí bốc xếp nhập",
        "feeType": "HANDLING_INBOUND",
        "billingQtyMt": 100.5,
        "unitRate": 30000,
        "amountVnd": 3015000,
        "calculationTraceJson": {...}
      }
    ]
  }
}
```

#### GET `/api/v1/billing/debit-notes`
Danh sách debit notes.

#### GET `/api/v1/billing/debit-notes/:id`
Chi tiết debit note với lines.

#### PUT `/api/v1/billing/debit-notes/:id/review`
Review debit note (DRAFT → REVIEWED).

#### PUT `/api/v1/billing/debit-notes/:id/approve`
Approve debit note (REVIEWED → APPROVED).

#### PUT `/api/v1/billing/debit-notes/:id/lock`
Lock debit note (APPROVED → LOCKED).
- **LOCKED = immutable tuyệt đối**
- Tự động tạo ERP push outbox

#### GET `/api/v1/billing/debit-notes/:id/history`
Lịch sử trạng thái của debit note.

---

### 5. Exception APIs

#### GET `/api/v1/billing/exceptions`
Danh sách exceptions.

**Query Parameters:**
- `exceptionType`: MISSING_RATE | DUP_EVENT | ORPHAN_EVENT | ...
- `severity`: INFO | WARN | ERROR | BLOCKER
- `status`: OPEN | IN_REVIEW | RESOLVED | IGNORED
- `ownerId`, `debitNoteId`

#### GET `/api/v1/billing/exceptions/:id`
Chi tiết exception.

#### PUT `/api/v1/billing/exceptions/:id/resolve`
Resolve exception.

**Request Body:**
```json
{
  "resolutionCode": "RATE_ADDED",
  "remarks": "Đã thêm rate cho cargo form này",
  "action": "RESOLVE"
}
```

---

## State Machine - Debit Note

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌────────┐
│  DRAFT  │ ───> │ REVIEWED │ ───> │ APPROVED │ ───> │ LOCKED │
└─────────┘      └──────────┘      └──────────┘      └────────┘
     │                │                  │
     └────────────────┴──────────────────┘
              Regenerate allowed
              (LOCKED không được regenerate)
```

---

## Business Rules

### Contract Rules
- `effectiveFrom <= effectiveTo`
- Không overlap contracts cho cùng owner trong active period
- Fee line `unitRate >= 0`
- Free days `>= 0`

### Rate Resolution
- Ưu tiên theo: cargoForm match > warehouseId match > dayTypeScope match
- Nếu không tìm được rate → tạo exception MISSING_RATE

### Debit Note Rules
- LOCKED = immutable, không thể sửa/regenerate
- Có BLOCKER exception → không thể lock
- Lock tự động tạo ERP push outbox

### Storage Formula (TVL-specific)
```
Billable Qty = Opening Qty + Inbound Today
             (không trừ outbound trong ngày)
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| BIL-CONTRACT-NOT-FOUND-404 | 404 | Contract không tồn tại |
| BIL-CONTRACT-OVERLAP-409 | 409 | Contract overlap với contract khác |
| BIL-CONTRACT-INVALID-DATE-RANGE-422 | 422 | effectiveFrom > effectiveTo |
| BIL-DN-NOT-FOUND-404 | 404 | Debit note không tồn tại |
| BIL-DN-INVALID-STATE-409 | 409 | State transition không hợp lệ |
| BIL-DN-LOCKED-IMMUTABLE-409 | 409 | DN đã lock, không thể sửa |
| BIL-DN-NO-CHARGES-422 | 422 | Không có charges để generate DN |
| BIL-DN-BLOCKER-EXCEPTION-422 | 422 | Có blocker exception |
| BIL-RATE-NOT-FOUND-422 | 422 | Không tìm được rate |
| BIL-EXCEPTION-NOT-FOUND-404 | 404 | Exception không tồn tại |

---

## RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `BILLING.CONTRACT.CREATE` | Tạo contract |
| `BILLING.CONTRACT.UPDATE` | Cập nhật contract |
| `BILLING.CONTRACT.READ` | Xem contracts |
| `BILLING.DAY_TYPE.MANAGE` | Quản lý day types |
| `BILLING.EVENT.READ` | Xem billing events |
| `BILLING.DN.GENERATE` | Generate DN |
| `BILLING.DN.READ` | Xem DNs |
| `BILLING.DN.REVIEW` | Review DN |
| `BILLING.DN.APPROVE` | Approve DN |
| `BILLING.DN.LOCK` | Lock DN |
| `BILLING.EXCEPTION.READ` | Xem exceptions |
| `BILLING.EXCEPTION.RESOLVE` | Resolve exception |

---

## Dependencies

### Module 10 depends on:
| Module | Entity/Service | Usage |
|--------|----------------|-------|
| M1 | `NumberSequence` | Sinh DN-*, CONTRACT-* |
| M1 | `ReasonCode` | Exception resolution |
| M1 | `AuditLog` | Audit trail |
| M2 | `MdOwner` | Owner reference |
| M2 | `MdItem` | Item/cargo_form |
| M2 | `MdWarehouse` | Warehouse scope |
| M3 | `OnHand` | Storage snapshot |

### Event Sources:
| Module | Event | Billing Event Type |
|--------|-------|-------------------|
| M4 | Receipt completed | INBOUND_HANDLING |
| M5 | Shipment completed | OUTBOUND_HANDLING |
| M9 | VAS WO completed | BAGGING_FEE |

---

## Technical Notes

- **Decimal precision**: Sử dụng `decimal.js` cho tính toán tiền tệ
- **Idempotency**: Tất cả commands có `externalId` unique
- **Transaction**: Multi-step operations wrap trong `$transaction`
- **Calculation trace**: Mọi charge đều có `calculationTraceJson` để audit
