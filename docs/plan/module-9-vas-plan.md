# Module 9: VAS / Bagging Operations - Implementation Plan

**Status:** 🚧 In Progress  
**Code Path:** `src/modules/vas`  
**Last Updated:** 2026-03-09

---

## 1. Mô tả nghiệp vụ Module

Module 9 là **business orchestration layer cho VAS/Bagging**, quản lý toàn bộ quy trình đóng bao hàng xá (bulk → bagged).

### Chức năng chính:
- **VAS Work Order lifecycle**: Tạo, xác nhận, theo dõi tiến độ, hoàn thành, hủy
- **Session progress logging**: Ghi nhận tiến độ đóng bao theo ca/ngày
- **Reservation management**: Reserve bulk stock để M5 không allocate trùng
- **Inventory posting**: Post batch inventory effect (consume bulk, produce bagged, consume packaging) qua M3
- **Billing handoff**: Phát billing event sang M10 khi hoàn thành

### Nguyên tắc quan trọng:
1. Posting point duy nhất là `COMPLETED` - không post inventory giữa session
2. M9 không sở hữu inventory truth - mọi posting phải qua M3
3. Packaging luôn trừ tồn cho cả TVL_OWNED và CLIENT_OWNED
4. Mọi command API phải idempotent qua `external_id`

---

## 2. Entities / Database Tables

| Table | Description | Group |
|-------|-------------|-------|
| `vas_work_order` | Header work order đóng bao | Runtime Core |
| `vas_session` | Session progress theo ca | Runtime Core |
| `vas_state_history` | Lịch sử chuyển trạng thái | Audit |
| `vas_exception_log` | Log exception nghiệp vụ | Audit |
| `vas_outbox` | Billing event outbox | Integration |

---

## 3. Dependencies

### Module 9 depends on:

| Source Module | Entity/Service | Usage |
|---------------|----------------|-------|
| Module 1 | `NumberSequence` | Sinh wo_number (VAS-*) |
| Module 1 | `ReasonCode` | Validate cancel/variance reason |
| Module 1 | `AuditLog` | Audit trail |
| Module 1 | `Idempotency` | External ID check |
| Module 2 | `MdOwner` | Owner validation |
| Module 2 | `MdItem` | Item validation (bulk/bagged/packaging) |
| Module 2 | `MdWarehouse` | Warehouse validation |
| Module 3 | `PostingEngine` | Post VAS inventory transactions |
| Module 3 | `OnHandService` | Query available stock |
| Module 3 | `HoldService` | Reserve/release bulk qty |

### Modules that depend on Module 9:

| Target Module | Dependency | Usage |
|---------------|------------|-------|
| Module 5 | `VasReservation` | Check reserved_qty_vas khi allocate |
| Module 10 | `BAGGING_FEE_CAPTURE` | Billing event từ outbox |

---

## 4. API Endpoints

### Work Order Command APIs

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/v1/vas-wo` | Tạo work order mới | `VAS.WO.CREATE` |
| PATCH | `/api/v1/vas-wo/:id` | Update WO (DRAFT only) | `VAS.WO.UPDATE` |
| POST | `/api/v1/vas-wo/:id/confirm` | Confirm WO + reserve stock | `VAS.WO.CONFIRM` |
| POST | `/api/v1/vas-wo/:id/session` | Add session progress | `VAS.SESSION.CREATE` |
| POST | `/api/v1/vas-wo/:id/complete` | Complete WO + post inventory | `VAS.WO.COMPLETE` |
| POST | `/api/v1/vas-wo/:id/cancel` | Cancel WO | `VAS.WO.CANCEL` |

### Work Order Query APIs

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/vas-wo` | List work orders | `VAS.WO.READ` |
| GET | `/api/v1/vas-wo/:id` | Get WO detail | `VAS.WO.READ` |
| GET | `/api/v1/vas-wo/:id/sessions` | Get sessions | `VAS.SESSION.READ` |
| GET | `/api/v1/vas-wo/:id/history` | Get state history | `VAS.WO.READ` |
| GET | `/api/v1/vas/dashboard/summary` | Dashboard summary | `VAS.DASHBOARD.READ` |

---

## 5. Business Rules & State Machine

### WO Status Flow:
```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
  ↓         ↓            ↓
CANCELLED CANCELLED  CANCELLED
```

### Transition Rules:

| From | To | Trigger | Guard | Side Effect |
|------|-----|---------|-------|-------------|
| — | DRAFT | Create | master valid | sinh wo_number, state history |
| DRAFT | CONFIRMED | Confirm | bulk & packaging đủ | reserve bulk |
| CONFIRMED | IN_PROGRESS | First session | session valid | set started_at |
| IN_PROGRESS | IN_PROGRESS | Add session | session valid | progress log |
| IN_PROGRESS | COMPLETED | Complete | actuals valid | inventory post + release + billing outbox |
| DRAFT | CANCELLED | Cancel | - | no reservation |
| CONFIRMED | CANCELLED | Cancel | reason required | release reservation |
| IN_PROGRESS | CANCELLED | Cancel | reason required | release reservation |

### Material Balance Invariant:
```
actual_consumed_qty_kg = actual_output_qty_kg + process_loss_qty_kg
process_loss_qty_kg >= 0
```

---

## 6. Acceptance Criteria

### AC-1: Create WO
- [x] Validate owner, warehouse, items từ M2
- [x] Bulk source phải có cargoForm = BULK
- [x] Bagged output phải có cargoForm = BAGGED_*
- [x] Packaging item phải có isPackaging = true
- [x] Sinh wo_number từ NumberSequence

### AC-2: Confirm WO
- [x] Check bulk available >= planned_qty
- [x] Check packaging available >= packaging_qty_planned
- [x] Reserve bulk qua M3 HoldService
- [x] Idempotent qua external_id

### AC-3: Add Session
- [x] Session chỉ khi CONFIRMED hoặc IN_PROGRESS
- [x] First session chuyển state sang IN_PROGRESS
- [x] Ghi productivity nếu có work_hours

### AC-4: Complete WO
- [x] Validate material balance
- [x] Post 3 inventory transactions qua M3
- [x] Release reservation
- [x] Insert billing outbox event
- [x] Atomic trong 1 transaction

### AC-5: Cancel WO
- [x] Không cancel khi đã COMPLETED
- [x] Release reservation nếu CONFIRMED/IN_PROGRESS
- [x] Require reason code

---

## 7. Implementation Checklist

### Step 1 — Database & Schema
- [ ] Add VAS enums to schema.prisma
- [ ] Add VAS models to schema.prisma
- [ ] Run migration
- [ ] Add seed data

### Step 2 — Mapping Data
- [ ] Create DTOs
- [ ] Validate FK relationships
- [ ] Create mappers

### Step 3 — Backend API
- [ ] Repositories
- [ ] Domain policies
- [ ] Services/Use cases
- [ ] Controllers
- [ ] Routes with RBAC

### Step 4 — Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Concurrency tests

---

## 8. Risk & Open Items

| Item | Status | Decision |
|------|--------|----------|
| Reservation scope (warehouse vs location) | Open | Phase 1: warehouse-level |
| Tier pricing reset rule | Open | Handled by M10 |
| Process loss threshold | Open | Default 2% warning |

