# Module 4: Inbound Operations — Implementation Plan

> **Module:** M4 - Inbound Operations  
> **Status:** 🚧 In Progress  
> **Created:** 2026-03-08  
> **Author:** AI Assistant

---

## 1. Mô tả nghiệp vụ

Module 4 quản lý toàn bộ lifecycle của **Receipt** (phiếu nhận hàng) từ khi tạo DRAFT đến khi CLOSED. Module này là **operational gatekeeper** cho luồng nhập hàng, không phải inventory ledger.

### 1.1 Chức năng chính

- **Receipt Management**: Tạo, confirm, cancel receipt
- **Weighing Flow**: Nhận dữ liệu cân gross/tare từ weighbridge (M8)
- **Tolerance Check**: Kiểm tra variance so với expected quantity
- **State Machine**: Quản lý trạng thái receipt theo business rules
- **Integration**: Gọi M3 để post inventory, gọi M7 để tạo putaway work

### 1.2 Posting Point

- **Chỉ post inventory tại state `RECEIVED`**
- Các state khác là state vận hành, không tạo inventory transaction

---

## 2. Data Model

### 2.1 Bảng chính (Runtime Core)

| Table | Mục đích |
|-------|----------|
| `receipt_header` | Header phiếu nhận hàng |
| `receipt_line` | Dòng hàng trong receipt |
| `receipt_weighing_log` | Log cân weigh-in/weigh-out |
| `receipt_status_history` | Lịch sử chuyển trạng thái |
| `receipt_exception_log` | Log exception/lỗi nghiệp vụ |
| `receipt_integration_state` | Trạng thái sync với M3/M7/M10 |

### 2.2 State Machine

```
DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT
                                                          ↓
                                        (tolerance pass) → RECEIVED → PUTAWAY → CLOSED
                                        (tolerance fail) → REJECTED → (reweigh) → AWAITING_WEIGHING
                                        
Any cancellable state → CANCELLED
```

---

## 3. Dependencies

### 3.1 Module 4 phụ thuộc

| Source | Usage |
|--------|-------|
| M1 - Foundation | RBAC, Reason Code, Audit, Number Sequence (RCV) |
| M2 - Master Data | Owner, Vendor, Item, Warehouse, Location, Tolerance |
| M3 - Inventory Core | PostingEngine để post inventory tại RECEIVED |

### 3.2 Modules phụ thuộc M4

| Target | Usage |
|--------|-------|
| M7 - Work | Nhận CreatePutawayWork từ M4 |
| M8 - Integration | Gửi weigh event đến M4 |
| M10 - Billing | Nhận InboundHandlingCaptured từ M4 |

---

## 4. API Endpoints

### 4.1 Receipt Commands

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/receipts` | Tạo receipt mới |
| GET | `/api/v1/inbound/receipts` | List receipts (filter/paginate) |
| GET | `/api/v1/inbound/receipts/:id` | Get receipt detail |
| POST | `/api/v1/inbound/receipts/:id/confirm` | Confirm receipt (DRAFT → AWAITING_WEIGHING) |
| POST | `/api/v1/inbound/receipts/:id/cancel` | Cancel receipt |
| POST | `/api/v1/inbound/receipts/:id/reweigh` | Reweigh (REJECTED → AWAITING_WEIGHING) |
| POST | `/api/v1/inbound/receipts/:id/close` | Close receipt (PUTAWAY → CLOSED) |
| GET | `/api/v1/inbound/receipts/:id/history` | Get status history |

### 4.2 Weighing Commands

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/inbound/weigh-events/in` | Nhận weigh-in (gross) |
| POST | `/api/v1/inbound/weigh-events/out` | Nhận weigh-out (tare) |
| POST | `/api/v1/inbound/receipts/:id/manual-weight` | Nhập tay weight |
| POST | `/api/v1/inbound/receipts/:id/start-processing` | Start processing (WEIGHED_IN → PROCESSING) |

### 4.3 Query APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inbound/receipts/:id/integration-status` | Xem trạng thái sync |
| GET | `/api/v1/inbound/dashboard/summary` | Dashboard summary |

---

## 5. Business Rules

### 5.1 State Transition Rules

| Action | From | To | Permission |
|--------|------|-----|------------|
| confirm | DRAFT | AWAITING_WEIGHING | INBOUND.RECEIPT.CONFIRM |
| weighIn | AWAITING_WEIGHING | WEIGHED_IN | INBOUND.WEIGH.RECEIVE |
| startProcessing | WEIGHED_IN | PROCESSING | INBOUND.RECEIPT.PROCESS |
| weighOut | PROCESSING | WEIGHED_OUT | INBOUND.WEIGH.RECEIVE |
| autoAccept | WEIGHED_OUT | RECEIVED | system (tolerance pass) |
| autoReject | WEIGHED_OUT | REJECTED | system (tolerance fail) |
| reweigh | REJECTED | AWAITING_WEIGHING | INBOUND.RECEIPT.REWEIGH |
| cancel | DRAFT/AWAITING/WEIGHED_IN/PROCESSING | CANCELLED | INBOUND.RECEIPT.CANCEL |
| putawayComplete | RECEIVED | PUTAWAY | callback từ M7 |
| close | PUTAWAY | CLOSED | INBOUND.RECEIPT.CLOSE |

### 5.2 Tolerance Rules

```
variance_pct = ABS(net_weight - expected_qty) / expected_qty * 100
tolerance = lookup(owner_item_policy → item → owner.default)
if variance_pct <= tolerance: PASS → RECEIVED
else: FAIL → REJECTED
```

### 5.3 Reweigh Rules

- Max 3 attempts
- Giữ nguyên receipt_number
- Tăng attempt_number
- Reset latest weight snapshot

---

## 6. Acceptance Criteria

### 6.1 Happy Path

- [ ] Tạo receipt từ PO/ASN thành công
- [ ] Confirm receipt sinh receipt_number
- [ ] Nhận weigh-in cập nhật gross_weight
- [ ] Nhận weigh-out tính net_weight
- [ ] Tolerance pass → RECEIVED
- [ ] Post inventory sang M3 thành công
- [ ] Tạo putaway work sang M7 thành công
- [ ] Putaway complete → PUTAWAY
- [ ] Close receipt thành công

### 6.2 Exception Path

- [ ] Tolerance fail → REJECTED
- [ ] Reweigh từ REJECTED thành công (max 3)
- [ ] Cancel từ các state được phép
- [ ] Manual weight với reason code
- [ ] Duplicate weigh event được dedupe

### 6.3 Validation

- [ ] Owner/vendor/item/warehouse/location active
- [ ] Location type = RECEIVING
- [ ] State transition validation
- [ ] Permission check
- [ ] Idempotency check

---

## 7. Implementation Checklist

### Step 1: Database Schema ✅
- [ ] Thêm enums cho Module 4
- [ ] Tạo receipt_header
- [ ] Tạo receipt_line
- [ ] Tạo receipt_weighing_log
- [ ] Tạo receipt_status_history
- [ ] Tạo receipt_exception_log
- [ ] Tạo receipt_integration_state
- [ ] Run migration

### Step 2: Backend Implementation
- [ ] DTOs (create, update, response)
- [ ] Repositories
- [ ] State Machine Service
- [ ] Receipt Service
- [ ] Weighing Service
- [ ] Tolerance Service
- [ ] Handoff Service (M3, M7)
- [ ] Controllers
- [ ] Module registration

### Step 3: Testing
- [ ] Unit tests for state machine
- [ ] Integration tests for APIs
- [ ] Idempotency tests

---

## 8. Estimated Timeline

| Phase | Duration |
|-------|----------|
| Database Schema | 1 session |
| Core Services | 2 sessions |
| Controllers & Integration | 1 session |
| Testing & Documentation | 1 session |

---

## 9. Notes

- Module 4 **KHÔNG** update inventory trực tiếp
- Mọi inventory posting phải đi qua M3
- Weigh event phải idempotent (dedupe by event_id/ticket_id)
- State machine enforce ở backend, không dựa vào UI
