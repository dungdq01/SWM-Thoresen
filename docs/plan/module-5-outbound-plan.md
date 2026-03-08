# Module 5: Outbound Operations — Implementation Plan

**Status:** 🚧 In Progress  
**Created:** 2026-03-08  
**Owner:** Backend Team  

---

## 1. Mô tả nghiệp vụ Module

Module 5 quản lý toàn bộ **luồng xuất hàng (Outbound Operations)** từ khi tạo shipment đến khi hàng được xuất khỏi kho và ghi nhận vào inventory ledger.

### Các chức năng chính:
1. **Shipment Management**: Tạo, cập nhật, confirm, cancel shipment
2. **Allocation Engine**: Phân bổ tồn kho theo FIFO cho shipment lines
3. **Work Handoff**: Tạo pick work và nhận callback từ Module 7
4. **Weighing Orchestration**: Ghi nhận tare/gross, tính net theo line linh hoạt
5. **Tolerance Check**: Kiểm tra chênh lệch và quản lý approval flow
6. **Shipping & Posting**: Post inventory khi SHIPPED, phát billing event
7. **Reversal Support**: Hỗ trợ reverse sau khi đã ship

---

## 2. Database Tables (10 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `shipment_header` | Header nghiệp vụ cho trip outbound | Runtime |
| `shipment_line` | Dòng hàng trong shipment | Runtime |
| `shipment_allocation_record` | Trace allocation từ stock source | Runtime |
| `shipment_weighing_attempt` | Log tare/gross/manual override | Audit |
| `shipment_status_history` | Lịch sử chuyển trạng thái | Audit |
| `shipment_exception_log` | Log exception nghiệp vụ | Audit |
| `shipment_approval_decision` | Quyết định approve/reject | Audit |
| `shipment_pick_work_link` | Mapping với work từ M7 | Control |
| `shipment_posting_link` | Mapping với posting sang M3 | Control |
| `shipment_so_link` | Link shipment với SO | Control |

---

## 3. Dependencies

### Module 5 phụ thuộc:

| Module | Dependency | Usage |
|--------|------------|-------|
| M1 | NumberSequence | Sinh shipment_number (SHP-*) |
| M1 | ReasonCode | Validate reason codes |
| M1 | AuditLog | Audit trail |
| M1 | Idempotency | External ID check |
| M2 | MdOwner | Owner validation |
| M2 | MdItem | Item validation + tolerance |
| M2 | MdWarehouse | Warehouse validation |
| M2 | MdLocation | Location validation |
| M2 | MdInventoryStatus | Status check (AVAILABLE) |
| M2 | MdVehicleType | Vehicle type lookup |
| M3 | OnHandService | Query available stock |
| M3 | HoldService | Create/release allocation holds |
| M3 | PostingEngine | Post outbound transaction |

---

## 4. API Endpoints (26 endpoints)

### 4.1 Shipment Management (6 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments` | Tạo shipment mới |
| GET | `/api/v1/outbound/shipments` | List shipments (paginated) |
| GET | `/api/v1/outbound/shipments/:id` | Get shipment detail |
| PATCH | `/api/v1/outbound/shipments/:id` | Update shipment (DRAFT only) |
| POST | `/api/v1/outbound/shipments/:id/confirm` | Confirm shipment |
| POST | `/api/v1/outbound/shipments/:id/cancel` | Cancel shipment |

### 4.2 Allocation (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/allocate` | Allocate shipment |
| POST | `/api/v1/outbound/shipments/:id/unallocate` | Release allocation |
| GET | `/api/v1/outbound/shipments/:id/allocations` | View allocations |

### 4.3 Work Handoff (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/pick-work` | Create pick work |
| POST | `/api/v1/outbound/work-callbacks/pick-completed` | Callback pick done |
| POST | `/api/v1/outbound/work-callbacks/short-pick` | Callback short pick |

### 4.4 Weighing (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/weigh/tare` | Record tare |
| POST | `/api/v1/outbound/shipments/:id/weigh/gross` | Record gross |
| GET | `/api/v1/outbound/shipments/:id/weighing-history` | View weigh history |

### 4.5 Approval (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/approvals/pending` | List pending approvals |
| POST | `/api/v1/outbound/shipments/:id/approve` | Approve shipment/line |
| POST | `/api/v1/outbound/shipments/:id/reject` | Reject shipment/line |

### 4.6 Shipping & Close (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/outbound/shipments/:id/ship` | Ship shipment |
| POST | `/api/v1/outbound/shipments/:id/close` | Close shipment |
| POST | `/api/v1/outbound/shipments/:id/reverse` | Reverse after ship |
| GET | `/api/v1/outbound/shipments/:id/postings` | View posting links |

### 4.7 Inquiry (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound/shipments/:id/history` | Status history |
| GET | `/api/v1/outbound/shipments/:id/exceptions` | Exceptions |
| GET | `/api/v1/outbound/dashboard/summary` | Dashboard summary |
| GET | `/api/v1/outbound/dashboard/kpis` | KPI metrics |

---

## 5. Business Rules & State Machine

### 5.1 Shipment States
```
DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → WEIGHING_TARE → LOADING → ALL_WEIGHED → SHIPPED → CLOSED
                                                                    ↓
                                                              PENDING_APPROVAL
```

### 5.2 Line States
```
PENDING → ALLOCATED → PICKING → PICKED → LOADING → WEIGHED_PASS/WEIGHED_FAIL → LINE_SHIPPED
```

### 5.3 Key Business Rules
1. **Allocation FIFO**: Sort by `lot_date ASC`, `location_code ASC`
2. **No Partial Allocation**: Line fail = whole shipment allocation fail
3. **Tare before Gross**: Must have tare before any gross
4. **Tolerance Check**: Per-line immediately after gross
5. **Pending Approval**: Fail tolerance → PENDING_APPROVAL, không block truck
6. **Ship Point**: Post inventory only at SHIPPED
7. **Reverse-only**: Sau SHIPPED không cancel, chỉ reverse

---

## 6. Acceptance Criteria

### AC-1: Create Shipment
- [ ] Tạo shipment với lines, validate master data
- [ ] Generate shipment_number từ M1 sequence
- [ ] Idempotent với external_id

### AC-2: Allocation
- [ ] Query available stock từ M3
- [ ] FIFO allocation với pessimistic lock
- [ ] Create hold trong M3 inventory

### AC-3: Weighing
- [ ] Record tare/gross với dedupe
- [ ] Calculate net per line
- [ ] Tolerance check và exception logging

### AC-4: Shipping
- [ ] Post outbound transaction sang M3
- [ ] Update allocation status
- [ ] Create status history

---

## 7. Implementation Checklist

### Step 1: Database
- [ ] Add enums to schema.prisma
- [ ] Add 10 tables to schema.prisma
- [ ] Generate migration
- [ ] Add seed data

### Step 2: Mapping
- [ ] Verify FK relationships
- [ ] Create DTO layer
- [ ] Setup cross-module imports

### Step 3: Backend
- [ ] Create outbound module structure
- [ ] Implement repositories
- [ ] Implement services (state machine, allocation, weighing, approval)
- [ ] Implement controllers
- [ ] Setup routes

---

## 8. Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase A | DB + Core CRUD | 🚧 In Progress |
| Phase B | Allocation + Work | ⏳ Pending |
| Phase C | Weighing + Approval | ⏳ Pending |
| Phase D | Ship + Reverse | ⏳ Pending |
