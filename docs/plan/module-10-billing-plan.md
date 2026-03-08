# Module 10: Billing & Commercial Control - Implementation Plan

**Version:** 1.0.0  
**Created:** 2026-03-09  
**Status:** In Progress

---

## 1. Mô tả nghiệp vụ

Module 10 là **commercial orchestration layer** của SWM, chịu trách nhiệm:
- Quản lý contract tính phí theo owner
- Capture billing events từ M4/M5/M9
- Daily storage snapshot từ M3
- Charge calculation engine
- Debit Note lifecycle (DRAFT → REVIEWED → APPROVED → LOCKED)
- Exception queue management
- ERP push handoff qua M8

### Công thức storage đặc thù TVL
```
Billable Qty = Opening + Inbound Today (không trừ outbound trong ngày)
```

---

## 2. Database Tables (12 tables)

| # | Table | Group | Description |
|---|-------|-------|-------------|
| 1 | `bil_contract` | Config | Header contract tính phí |
| 2 | `bil_contract_fee_line` | Config | Fee lines theo contract |
| 3 | `bil_day_type_calendar` | Config | Day type + multiplier calendar |
| 4 | `bil_event` | Runtime | Billing events đã normalize |
| 5 | `bil_snapshot_run` | Runtime | Snapshot run metadata |
| 6 | `bil_storage_snapshot` | Runtime | Daily storage snapshot |
| 7 | `bil_debit_note` | Workflow | DN header |
| 8 | `bil_debit_note_line` | Workflow | DN charge lines |
| 9 | `bil_debit_note_history` | Workflow | DN state history |
| 10 | `bil_exception` | Exception | Exception queue |
| 11 | `bil_erp_push_outbox` | Integration | ERP push outbox |
| 12 | `bil_erp_push_log` | Integration | ERP push log |

---

## 3. Dependencies

### Module 10 depends on:
| Source | Entity/Service | Usage |
|--------|----------------|-------|
| M1 | `NumberSequence` | DN-*, CONTRACT-* |
| M1 | `ReasonCode` | Exception resolution |
| M1 | `AuditLog` | Audit trail |
| M1 | `Idempotency` | Command idempotency |
| M2 | `MdOwner` | Owner reference |
| M2 | `MdItem` | Item/cargo_form |
| M2 | `MdWarehouse` | Warehouse scope |
| M3 | `DailyStorageSnapshot` | Storage billing input |
| M3 | `OnHand` | Snapshot truth |

### Event Sources:
| Module | Event | Usage |
|--------|-------|-------|
| M4 | `INBOUND_HANDLING` | Handling fee capture |
| M5 | `OUTBOUND_HANDLING` | Handling fee capture |
| M9 | `BAGGING_FEE` | Bagging fee capture |

---

## 4. API Endpoints (~27 endpoints)

### Contract APIs (5)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/contracts` | Create contract |
| GET | `/api/v1/billing/contracts` | List contracts |
| GET | `/api/v1/billing/contracts/:id` | Get contract detail |
| PUT | `/api/v1/billing/contracts/:id` | Update contract |
| GET | `/api/v1/billing/contracts/:id/fee-lines` | Get fee lines |

### Day Type APIs (2)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/day-types` | Upsert day type |
| GET | `/api/v1/billing/day-types` | List day types |

### Billing Event APIs (2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/events` | Query events |
| POST | `/internal/billing/events/capture` | Internal event capture |

### Snapshot APIs (2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/snapshots` | Query snapshots |
| POST | `/api/v1/billing/snapshots/rerun` | Rerun snapshot |

### Debit Note APIs (9)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/debit-notes` | Generate DN |
| GET | `/api/v1/billing/debit-notes` | List DNs |
| GET | `/api/v1/billing/debit-notes/:id` | Get DN detail |
| PUT | `/api/v1/billing/debit-notes/:id/review` | Review DN |
| PUT | `/api/v1/billing/debit-notes/:id/approve` | Approve DN |
| PUT | `/api/v1/billing/debit-notes/:id/lock` | Lock DN |
| POST | `/api/v1/billing/debit-notes/:id/regenerate` | Regenerate DN |
| GET | `/api/v1/billing/debit-notes/:id/export` | Export DN |
| GET | `/api/v1/billing/debit-notes/:id/history` | DN history |

### Exception APIs (3)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/exceptions` | List exceptions |
| GET | `/api/v1/billing/exceptions/:id` | Get exception detail |
| PUT | `/api/v1/billing/exceptions/:id/resolve` | Resolve exception |

### ERP Push APIs (3)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/billing/debit-notes/:id/erp-push/retry` | Retry push |
| GET | `/api/v1/billing/debit-notes/:id/erp-push/logs` | Push logs |
| GET | `/api/v1/billing/reconciliation` | Reconciliation query |

---

## 5. Business Rules & Acceptance Criteria

### Contract Rules
- [ ] Unique contract_number
- [ ] effective_from <= effective_to
- [ ] No overlap contracts for same owner in active period
- [ ] Fee line unit_rate >= 0
- [ ] Free days >= 0

### Billing Event Rules
- [ ] external_id unique (idempotent)
- [ ] Resolve day_type + multiplier từ calendar
- [ ] Rate missing → exception queue

### Debit Note Rules
- [ ] State machine: DRAFT → REVIEWED → APPROVED → LOCKED
- [ ] LOCKED = immutable tuyệt đối
- [ ] Regenerate chỉ cho phép trước LOCKED
- [ ] Lock creates ERP push outbox

### Storage Formula
- [ ] Billable = Opening + Inbound (không trừ outbound)
- [ ] Free days tracking theo receipt_line_id
- [ ] Daily amount = billable_qty × rate × multiplier

---

## 6. File Structure

```
src/modules/billing/
├── billing.module.ts
├── controllers/
│   ├── billing-contract.controller.ts
│   ├── billing-day-type.controller.ts
│   ├── billing-event.controller.ts
│   ├── billing-snapshot.controller.ts
│   ├── debit-note.controller.ts
│   ├── billing-exception.controller.ts
│   └── billing-erp-push.controller.ts
├── services/
│   ├── billing-contract.service.ts
│   ├── billing-day-type.service.ts
│   ├── billing-event.service.ts
│   ├── billing-snapshot.service.ts
│   ├── rate-resolution.service.ts
│   ├── charge-calculation.service.ts
│   ├── debit-note.service.ts
│   ├── debit-note-state.service.ts
│   ├── billing-exception.service.ts
│   ├── billing-erp-push.service.ts
│   └── billing-query.service.ts
├── repositories/
│   ├── billing-contract.repository.ts
│   ├── billing-event.repository.ts
│   ├── billing-snapshot.repository.ts
│   ├── debit-note.repository.ts
│   ├── billing-exception.repository.ts
│   └── billing-erp-push.repository.ts
├── dto/
│   ├── create-contract.dto.ts
│   ├── create-day-type.dto.ts
│   ├── capture-event.dto.ts
│   ├── generate-debit-note.dto.ts
│   └── resolve-exception.dto.ts
├── domain/
│   ├── billing.enums.ts
│   ├── billing.errors.ts
│   ├── billing.policy.ts
│   └── debit-note-state-machine.ts
├── adapters/
│   └── m3-snapshot.adapter.ts
└── guards/
    └── billing-permission.guard.ts
```

---

## 7. RBAC Permissions

| Permission Code | Description |
|-----------------|-------------|
| `BILLING.CONTRACT.CREATE` | Create contract |
| `BILLING.CONTRACT.UPDATE` | Update contract |
| `BILLING.CONTRACT.READ` | View contracts |
| `BILLING.DAY_TYPE.MANAGE` | Manage day types |
| `BILLING.EVENT.READ` | View billing events |
| `BILLING.SNAPSHOT.READ` | View snapshots |
| `BILLING.SNAPSHOT.RERUN` | Rerun snapshot |
| `BILLING.DN.GENERATE` | Generate DN |
| `BILLING.DN.READ` | View DNs |
| `BILLING.DN.REVIEW` | Review DN |
| `BILLING.DN.APPROVE` | Approve DN |
| `BILLING.DN.LOCK` | Lock DN |
| `BILLING.DN.EXPORT` | Export DN |
| `BILLING.EXCEPTION.READ` | View exceptions |
| `BILLING.EXCEPTION.RESOLVE` | Resolve exception |
| `BILLING.ERP_PUSH.RETRY` | Retry ERP push |
| `BILLING.RECONCILIATION.READ` | View reconciliation |

---

## 8. Implementation Phases

### Phase 1: Foundation (Current)
- [x] Database schema design
- [ ] Contract CRUD APIs
- [ ] Day Type management
- [ ] Rate resolution service

### Phase 2: Event & Snapshot
- [ ] Event capture internal API
- [ ] Snapshot run batch job
- [ ] Snapshot query APIs

### Phase 3: Charge Engine & DN
- [ ] Charge calculation engine
- [ ] DN generate/regenerate
- [ ] DN state machine (review/approve/lock)
- [ ] DN export

### Phase 4: Exception & Integration
- [ ] Exception queue
- [ ] ERP push outbox
- [ ] Reconciliation query

---

## 9. Testing Checklist

- [ ] Contract overlap validation
- [ ] Rate precedence resolution
- [ ] DN state transitions
- [ ] Idempotency for all commands
- [ ] LOCKED immutability
- [ ] Exception creation on missing rate
- [ ] Storage formula correctness
