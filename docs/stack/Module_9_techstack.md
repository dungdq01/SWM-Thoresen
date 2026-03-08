# TVL SWM — Module 9 Tech Stack & Backend Design
# VAS / Bagging Operations

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-09  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Billing Team  
**Mục tiêu:** Chuyển hóa Module 9 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, state machine, reservation contract, atomic posting, billing handoff và mapping liên module cho nghiệp vụ VAS / bagging.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 9 — VAS / Bagging Operations** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 9 thực chất phải build những gì ở Phase 1.
- Luồng chuẩn từ **database → repository → service → state machine → posting handoff → billing event** nên tổ chức ra sao.
- Vì sao Module 9 là **business orchestration layer cho bagging**, không phải inventory ledger engine.
- Thiết kế database nào vừa đúng go-live Phase 1 vừa đủ sạch để scale cho blending, rework, costing, QC hold và advanced VAS về sau.
- Từng API dùng để làm gì, validate gì, side effect gì, idempotency ra sao và nên code theo pattern nào.
- Cách Module 9 ánh xạ với **Module 1 → Module 8** và với Module 10 Billing.
- Cách build technical recovery để duplicate submit, concurrent confirm, reservation mismatch, posting fail, billing fail không làm lệch tồn kho hay lệch doanh thu.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- M9 sở hữu **VAS Work Order lifecycle**: create, confirm, progress session, complete, cancel.  
- Inventory posting chỉ được phép xảy ra tại **WO = COMPLETED**. Session chỉ là progress log.  
- Packaging material **luôn được consume từ inventory** cho cả `TVL_OWNED` và `CLIENT_OWNED`; khác biệt nằm ở billing material fee.  
- M9 phải reserve bulk quantity để M5 không over-allocate cùng stock pool.  
- M9 không được ghi trực tiếp vào `invent_trans` hay `on_hand`; mọi inventory effect phải đi qua M3.  
- M9 trigger **BAGGING_FEE** cho M10 nhưng không tự tính debit note.  
- Mọi command API có side effect phải idempotent qua `external_id`.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 24 kết luận kỹ thuật quan trọng cho Module 9:

1. **Module 9 là business orchestration layer cho bagging**, không phải inventory truth engine.
2. **VAS Work Order** là object runtime chính; session chỉ là progress child object.
3. **Posting point duy nhất của M9 là `COMPLETED`**. Trước đó không có InventTrans.
4. **Một WO hoàn tất tạo 3 inventory effects logic**: consume bulk, produce bagged goods, consume packaging.
5. **Packaging luôn phải trừ tồn** cho cả `TVL_OWNED` và `CLIENT_OWNED`; khác biệt chỉ nằm ở billing material fee.
6. **Module 9 phải reserve bulk khi confirm** để M5 không allocate trùng stock cho outbound.
7. **Reservation contract với M5 là capability lõi**, không phải note phụ.
8. **Reservation không được bypass M3 data model**; thiết kế read/write phải tôn trọng `on_hand` là runtime stock pool chuẩn.
9. **Session không được post inventory mid-session**; nếu không sẽ phá nguyên tắc immutable/atomic của M3.
10. **Material balance là invariant nghiệp vụ thật**: `actual_consumed_qty = actual_output_qty + process_loss_qty`.
11. **Yield/process loss là operational truth**, phải lưu rõ số lượng và reason code khi lệch.
12. **Cancel Phase 1 chỉ hợp lệ trước khi hoàn tất**; nếu chưa complete thì chỉ release reservation, không reverse vì chưa post.
13. **COMPLETED là terminal state bất biến**; correction đúng chuẩn Phase 1 là reverse qua M3 + tạo WO mới hoặc flow rework của phase sau.
14. **M9 phải đọc master data rất mạnh từ M2**: source item, output item, packaging item, owner, warehouse, UOM, cargo form, optional defaults.
15. **M9 có liên quan đến M7 về execution semantics**, nhưng Phase 1 chưa nên trộn work lifecycle đầy đủ vào M9; session có thể được thao tác từ web/mobile mà không trở thành WorkHeader/WorkLine chính thức.
16. **M9 phải phát billing event/hook sang M10 tại đúng thời điểm complete**, không được tính phí trực tiếp trong M9.
17. **Module 9 phải có exception trail riêng** vì đây là vùng nhạy cảm cho shrinkage, packaging shortage, process loss và billing dispute.
18. **Idempotency là bắt buộc** cho create/confirm/add-session/complete/cancel.
19. **State machine phải enforce ở backend**, không dựa vào UI disable button.
20. **Complete WO phải atomic với inventory + reservation release + billing event outbox** để tránh trạng thái nửa chừng.
21. **M9 phải tách command model và query model**, vì list/history/productivity là read-heavy còn complete là write-heavy.
22. **Thiết kế DB của M9 phải chừa đường cho multi-location consume, blending BOM, rework, QC hold và costing** nhưng không làm phình go-live baseline.
23. **Technical recovery là bắt buộc** cho case post M3 success nhưng callback fail, billing fail, duplicate complete hay retry từ mobile/web.
24. **Code structure phải ngăn module khác đổi state WO trực tiếp**; mọi transition phải đi qua service/state machine tập trung.

---

## 3. Phạm vi build thực tế của Module 9 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. VAS Work Order create / update / detail / search
2. WO state machine runtime
3. Reservation on confirm
4. Session progress logging
5. Session productivity / overtime capture
6. Complete WO orchestration
7. Atomic posting sang M3
8. Packaging ownership logic
9. Billing event capture hook/outbox sang M10
10. Cancel flow + reservation release
11. Exception handling cho shortage / variance / duplicate / invalid state
12. Audit trail + exception trail integration với M1
13. Idempotency handling cho mọi command side effect
14. Query APIs cho WO detail / sessions / history / productivity
15. Technical recovery cho posting fail / billing fail / duplicate retry / stale confirm
16. Admin-safe validations cho schema, formulas, status transition, ownership mapping

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build blending engine.
2. Không build generalized BOM/costing engine nhiều cấp.
3. Không build rework workflow hoàn chỉnh.
4. Không build QC/lab workflow.
5. Không build session-level inventory posting.
6. Không build approval workflow đa cấp cho WO Phase 1.
7. Không build generalized production module như ERP manufacturing.
8. Không build wave/dispatch/execution engine riêng cho VAS nếu chưa chốt với M7.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** WO lifecycle, session logs, reservation, complete orchestration và billing handoff.
- **Có build** read model cho status, sessions, productivity, audit, exception.
- **Không build** inventory ledger trong Module 9.
- **Không build** M10 debit note / rate engine trong Module 9.
- **Không build** WorkHeader/WorkLine chuẩn M7 nếu business chưa chốt VAS dùng work model chính thức ở Phase 1.
- **Không cho phép** bất kỳ API/UI nào update trực tiếp `on_hand` hoặc `invent_trans` từ M9.

---

## 4. Khuyến nghị tech stack chính thức cho Module 9

Để đồng bộ với Module 1 → Module 7 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; outbox event cho handoff nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot read / short-lived coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Shared platform services

- **RBAC / permission / audit / number sequence / idempotency:** tái sử dụng từ Module 1
- **Master lookup / usage validation:** tái sử dụng pattern của Module 2
- **Posting engine / invent_dim / on_hand / reconciliation:** gọi Module 3 service nội bộ
- **Billing event outbox / publish retry:** dùng cùng pattern outbox của các module transaction khác

### 4.4 Observability

- Structured logging JSON
- Correlation ID xuyên suốt: request → WO → M3 posting → billing outbox → audit
- Metrics chính:
  - confirm success rate
  - reservation latency
  - complete latency
  - complete failure rate
  - duplicate command hit rate
  - process loss variance count
  - billing outbox retry count

### 4.5 Testing

- Unit test: Jest / Vitest
- Integration test: Nest + test PostgreSQL
- API contract test: supertest
- Concurrency test: confirm/complete đồng thời
- Failure injection test: M3 fail, outbox fail, duplicate external_id

### 4.6 Vì sao nên giữ cùng stack với M1–M7

1. Dễ reuse shared foundation: RBAC, idempotency, audit, outbox.
2. NestJS phù hợp cho module nghiệp vụ rõ boundary.
3. PostgreSQL mạnh cho transaction, unique constraint, row lock, outbox pattern.
4. Prisma giúp team intern dễ đọc schema, migration và type-safe hơn.
5. Redis + BullMQ đủ tốt cho retry billing event, stale reservation cleanup, read cache.

---

## 5. Kiến trúc tổng thể Module 9 trong hệ backend

```text
Client (Web Admin / Mobile / API)
          |
          v
     NestJS Controller
          |
  +-------+------------------------------------------------+
  |                Command / Query Split                    |
  |                                                        |
  v                                                        v
VAS Command Service                                  VAS Query Service
  |                                                        |
  |---- validate master / permission / state               |---- read model
  |---- reserve / release                                  |---- list/detail/sessions
  |---- session append                                     |---- dashboard/productivity
  |---- complete orchestration                             |
  |                                                        |
  v                                                        v
VAS Domain Repositories                          Read Repository / View
  |
  +--> Module 1 shared services
  |      - idempotency service
  |      - number sequence service
  |      - audit log service
  |      - reason code catalog
  |
  +--> Module 3 inventory facade
  |      - on-hand query
  |      - reserve/release bulk
  |      - post VAS consume/produce package batch
  |
  +--> Billing outbox writer
  |
  +--> DB transaction boundary
          |
          v
PostgreSQL
  - vas_work_order
  - vas_session
  - vas_exception_log
  - vas_state_history
  - vas_outbox
  - optional read tables/materialized views
```

### 5.1 Nguyên tắc kiến trúc bắt buộc

1. `complete WO` phải chạy trong **1 DB transaction nghiệp vụ** đối với state change nội bộ + inventory command record + outbox insert.
2. M9 **không tự append vào `invent_trans`**; M9 gọi inventory facade của M3.
3. Reservation release khi complete phải nằm cùng transactional boundary với complete logic để tránh stock leak.
4. Billing event không gửi đồng bộ trực tiếp tới M10 trong request path; dùng outbox để retry-safe.
5. Query path tách khỏi command path để dễ scale và không khóa write flow.

---

## 6. Phân ranh runtime ownership giữa Module 9 và các module khác

### 6.1 Module 9 sở hữu gì

Module 9 là source of truth cho:

- `vas_work_order`
- `vas_session`
- `vas_state_history`
- `vas_exception_log`
- `vas_outbox` (loại BAGGING_FEE_CAPTURE / callbacks nội bộ nếu có)
- business rule orchestration của bagging: confirm, session progress, complete, cancel

### 6.2 Module 9 không sở hữu gì

Module 9 **không** sở hữu:

- `invent_dim`, `invent_trans`, `on_hand` → của M3
- `owner`, `item`, `warehouse`, `location`, `uom` → của M2
- `audit_log`, `reason_code`, `number_sequence`, `idempotency_registry` → của M1
- `billing_event`, `debit_note`, `rate card` → của M10
- `work_header`, `work_line` chuẩn execution → của M7
- `weighbridge_log`, OCR, mobile sync infra → của M8

### 6.3 Mapping với từng module đang có

#### Mapping với Module 1 — Foundation & Governance
- Dùng `NumberSequence` để sinh `VAS-YYYYMMDD-SEQ`.
- Dùng RBAC để giới hạn create/confirm/complete/cancel.
- Dùng `ReasonCode` cho cancel, manual correction, variance reason khi policy yêu cầu.
- Dùng `AuditLog` cho mọi state change, exception và complete.
- Dùng `Idempotency` cho command APIs có side effect.

#### Mapping với Module 2 — Master Data Management
- Lookup `bulk_source_item_id`, `bag_type_output_id`, `packaging_item_id`.
- Validate `owner_id`, `packaging_owner_id`, `warehouse_id`.
- Validate semantic của item: bulk source phải là hàng xá, output phải là hàng bao, packaging item phải là vật tư bao bì.
- Có thể bổ sung default bag weight / packaging material mapping từ item master, nhưng M9 không sở hữu master này.

#### Mapping với Module 3 — Inventory Core Engine
- M9 gọi M3 để query on-hand và available pool trước confirm/complete.
- M9 gọi M3 để reserve/release bulk qty cho VAS.
- M9 gọi M3 để post batch inventory effect tại `COMPLETED`.
- M9 tuyệt đối không update `on_hand` hay `invent_trans` trực tiếp.

#### Mapping với Module 4 — Inbound Operations
- M9 không trigger trực tiếp M4.
- Hàng bulk nguồn của M9 thường được sinh ra từ inbound + putaway trước đó.
- Packaging client-owned phải được inbound vào kho trước khi M9 mới consume được.
- Nếu packaging chưa inbound hoàn tất hoặc chưa ở trạng thái allocatable, confirm WO phải fail.

#### Mapping với Module 5 — Outbound Operations
- Đây là mapping quan trọng nhất ngoài M3.
- Khi WO `CONFIRMED`, M9 reserve bulk qty để M5 không allocate phần tồn này cho shipment.
- M5 phải tính `available_qty = physical_qty - reserved_qty_shipment - reserved_qty_vas` hoặc cơ chế tương đương đã chốt với M3.
- Sau khi WO `COMPLETED` hoặc `CANCELLED`, reservation phải được release đúng.
- Bagged output sau complete sẽ trở thành stock pool mới để M5 có thể allocate outbound hàng bao.

#### Mapping với Module 6 — Inventory Control
- Nếu M6 move/status change/adjustment đụng vào stock đang reserved cho VAS thì phải bị chặn hoặc cần release reservation trước.
- M6 adjustment có thể được dùng để sửa thiếu bulk hoặc thiếu packaging trước khi confirm WO.
- M9 phải có query/history đủ tốt để M6/M11 điều tra shrinkage và variance.

#### Mapping với Module 7 — Work Execution & Mobile Operations
- Phase 1: M9 dùng `vas_session` làm progress object riêng, chưa bắt buộc map thành `work_header/work_line`.
- Nếu business muốn dùng mobile UI thao tác bagging session, mobile có thể gọi API M9 trực tiếp hoặc qua thin adapter, nhưng vẫn không biến session thành posting owner.
- Trong Phase 2 có thể bổ sung `VAS_WORK` trên M7, nhưng không nên nhập nhằng ownership ở go-live.

#### Mapping với Module 8 — Weighbridge, OCR & Integration
- M9 không dùng weighbridge làm posting trigger chính như M4/M5.
- M8 có thể hỗ trợ mobile sync/offline cho việc ghi session nếu app mobile bagging cần offline-first.
- Nếu sau này bagging line có tích hợp cân nội bộ hoặc IoT counter, M8 sẽ là data acquisition layer, còn M9 vẫn là business owner.

#### Mapping với Module 10 — Billing & Commercial Control
- M9 phát `BAGGING_FEE` event tại `COMPLETED`.
- Payload phải đủ cho labor fee, material fee, OT multiplier, ownership type và trace về WO.
- M10 là nơi áp tier pricing/rate card cuối cùng hoặc consume pre-computed tier snapshot từ M9 tùy design chốt.
- M9 không được ghi trực tiếp billing transaction runtime table của M10.

---

## 7. Đề xuất cấu trúc code backend cho Module 9

```text
src/modules/vas/
  controllers/
    vas-work-order.command.controller.ts
    vas-work-order.query.controller.ts
    vas-session.controller.ts
  dto/
    create-vas-wo.dto.ts
    update-vas-wo.dto.ts
    confirm-vas-wo.dto.ts
    add-vas-session.dto.ts
    complete-vas-wo.dto.ts
    cancel-vas-wo.dto.ts
    query-vas-wo.dto.ts
  application/
    services/
      create-vas-wo.service.ts
      update-vas-wo.service.ts
      confirm-vas-wo.service.ts
      add-vas-session.service.ts
      complete-vas-wo.service.ts
      cancel-vas-wo.service.ts
      get-vas-wo-detail.service.ts
      list-vas-wo.service.ts
    facades/
      vas-inventory.facade.ts
      vas-billing.facade.ts
  domain/
    entities/
      vas-work-order.entity.ts
      vas-session.entity.ts
    enums/
      vas-wo-status.enum.ts
      packaging-ownership.enum.ts
      vas-shift.enum.ts
      vas-outbox-type.enum.ts
    policies/
      vas-confirm.policy.ts
      vas-complete.policy.ts
      vas-cancel.policy.ts
      packaging-ownership.policy.ts
      process-loss.policy.ts
    value-objects/
      process-loss.vo.ts
      bagging-quantity.vo.ts
  infrastructure/
    repositories/
      vas-work-order.repository.ts
      vas-session.repository.ts
      vas-state-history.repository.ts
      vas-exception-log.repository.ts
      vas-outbox.repository.ts
    prisma/
      vas-work-order.prisma-repo.ts
      ...
    mappers/
      vas-work-order.mapper.ts
      billing-event.mapper.ts
  jobs/
    vas-outbox-dispatch.job.ts
    stale-confirmed-wo-monitor.job.ts
  vas.module.ts
```

### 7.1 Pattern khuyến nghị

- Controller mỏng, không chứa business logic.
- Service application orchestration gọi policy + repository + facade.
- Domain policy giữ rule xác nhận/hoàn tất/hủy.
- Facade tách rõ call sang M3, M10 và shared services M1.
- Không để repository tự viết logic state machine.

---

## 8. Thiết kế database tổng thể cho Module 9

## 8.1 Nguyên tắc DB design

1. Header và session phải tách bảng rõ ràng.
2. State history và exception log phải append-only.
3. Idempotency dựa vào `external_id` phải có unique scope rõ ràng.
4. Cần support search theo warehouse, owner, status, date range, item.
5. Chừa cột cho Phase 2 nhưng không over-model như manufacturing ERP.
6. Không lặp lại dữ liệu master quá nhiều; chỉ denormalize các field hiển thị/hot lookup thật cần thiết.

## 8.2 Danh sách bảng đề xuất

1. `vas_work_order`
2. `vas_session`
3. `vas_state_history`
4. `vas_exception_log`
5. `vas_outbox`
6. `vas_productivity_daily` *(optional read model / materialized batch)*
7. `vas_wo_attachment` *(optional nếu cần evidence upload ngay Phase 1)*

> Ghi chú: reservation runtime nên được quản lý trong M3/on_hand hoặc inventory-facing facade, **không tạo bảng reservation riêng trong M9** nếu team đã chốt shared reserved field trên stock pool. Nếu chưa chốt shared field, có thể dùng bảng `inventory_reservation` thuộc M3 thay vì để M9 tự sở hữu.

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `vas_work_order`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | nội bộ |
| wo_number | VARCHAR(30) | UNIQUE, NOT NULL | `VAS-YYYYMMDD-SEQ` |
| status | VARCHAR(20) | INDEX, NOT NULL | `DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED` |
| owner_id | UUID/VARCHAR | INDEX, NOT NULL | chủ hàng bulk/bagged output |
| warehouse_id | UUID/VARCHAR | INDEX, NOT NULL | kho thao tác |
| bulk_source_item_id | UUID/VARCHAR | NOT NULL | hàng xá nguồn |
| bagged_output_item_id | UUID/VARCHAR | NOT NULL | hàng bao đầu ra |
| planned_qty_kg | NUMERIC(18,3) | NOT NULL | khối lượng kế hoạch |
| actual_consumed_qty_kg | NUMERIC(18,3) | NULL | khối lượng bulk tiêu hao thực tế |
| actual_output_qty_kg | NUMERIC(18,3) | NULL | khối lượng bagged đầu ra |
| process_loss_qty_kg | NUMERIC(18,3) | NULL | = consumed - output |
| actual_bag_count | INTEGER | NULL | tổng số bao |
| packaging_ownership | VARCHAR(20) | NOT NULL | `TVL_OWNED/CLIENT_OWNED` |
| packaging_item_id | UUID/VARCHAR | NOT NULL | SKU bao bì |
| packaging_owner_id | UUID/VARCHAR | NOT NULL | owner stock của bao bì |
| packaging_qty_planned | INTEGER | NOT NULL | kế hoạch số bao |
| packaging_qty_actual | INTEGER | NULL | số bao dùng thực tế |
| start_date | DATE | NOT NULL | kế hoạch bắt đầu |
| estimated_completion_date | DATE | NULL | dự kiến xong |
| confirmed_at | TIMESTAMPTZ | NULL | |
| confirmed_by | UUID/VARCHAR | NULL | |
| started_at | TIMESTAMPTZ | NULL | session đầu tiên |
| completed_at | TIMESTAMPTZ | NULL | |
| completed_by | UUID/VARCHAR | NULL | |
| cancelled_at | TIMESTAMPTZ | NULL | |
| cancelled_by | UUID/VARCHAR | NULL | |
| cancel_reason_code | VARCHAR(50) | NULL | bắt buộc nếu cancel |
| yield_variance_reason_code | VARCHAR(50) | NULL | bắt buộc khi policy yêu cầu |
| notes | TEXT | NULL | mô tả chung |
| external_id | VARCHAR(100) | UNIQUE, NOT NULL | idempotency create scope |
| correlation_id | UUID | INDEX, NOT NULL | trace xuyên module |
| created_by | UUID/VARCHAR | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 1 | optimistic lock |

**Index khuyến nghị:**
- `(warehouse_id, status, created_at desc)`
- `(owner_id, status, created_at desc)`
- `(bulk_source_item_id, status)`
- `(bagged_output_item_id, status)`
- `(correlation_id)`

### 8.3.2 `vas_session`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| wo_id | UUID | FK, INDEX, NOT NULL | → `vas_work_order.id` |
| session_num | INTEGER | NOT NULL | tăng tuần tự theo WO |
| session_date | DATE | NOT NULL | |
| shift_code | VARCHAR(20) | NOT NULL | `MORNING/AFTERNOON/NIGHT` |
| session_qty_kg | NUMERIC(18,3) | NOT NULL | progress qty |
| session_bag_count | INTEGER | NOT NULL | progress bag count |
| work_hours | NUMERIC(8,2) | NULL | nếu cần productivity |
| productivity_rate | NUMERIC(18,3) | NULL | qty / work_hours |
| is_overtime | BOOLEAN | NOT NULL DEFAULT FALSE | |
| start_time | TIMESTAMPTZ | NULL | |
| end_time | TIMESTAMPTZ | NULL | |
| notes | TEXT | NULL | |
| external_id | VARCHAR(100) | UNIQUE, NOT NULL | idempotency add session |
| created_by | UUID/VARCHAR | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(wo_id, session_num)`

### 8.3.3 `vas_state_history`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| wo_id | UUID | FK, INDEX, NOT NULL | |
| from_status | VARCHAR(20) | NULL | |
| to_status | VARCHAR(20) | NOT NULL | |
| action | VARCHAR(30) | NOT NULL | `CREATE/CONFIRM/START/ADD_SESSION/COMPLETE/CANCEL` |
| reason_code | VARCHAR(50) | NULL | |
| remarks | TEXT | NULL | |
| actor_id | UUID/VARCHAR | NOT NULL | |
| actor_role | VARCHAR(30) | NOT NULL | |
| correlation_id | UUID | INDEX, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 8.3.4 `vas_exception_log`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| wo_id | UUID | FK, INDEX, NOT NULL | |
| exception_code | VARCHAR(50) | NOT NULL | `INSUFFICIENT_BULK`, `INSUFFICIENT_PACKAGING`, `INVALID_STATE`, `PROCESS_LOSS_OVER_LIMIT`, ... |
| severity | VARCHAR(20) | NOT NULL | `INFO/WARN/ERROR` |
| payload_json | JSONB | NULL | snapshot đầu vào phục vụ điều tra |
| reason_code | VARCHAR(50) | NULL | |
| resolved_at | TIMESTAMPTZ | NULL | |
| resolved_by | UUID/VARCHAR | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 8.3.5 `vas_outbox`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| event_type | VARCHAR(50) | INDEX, NOT NULL | `BAGGING_FEE_CAPTURE` |
| aggregate_type | VARCHAR(50) | NOT NULL | `VAS_WORK_ORDER` |
| aggregate_id | UUID | INDEX, NOT NULL | WO id |
| aggregate_number | VARCHAR(30) | INDEX, NOT NULL | WO number |
| event_key | VARCHAR(120) | UNIQUE, NOT NULL | chống duplicate dispatch |
| payload_json | JSONB | NOT NULL | dữ liệu gửi M10 |
| status | VARCHAR(20) | INDEX, NOT NULL | `PENDING/SENT/FAILED/DEAD` |
| retry_count | INTEGER | NOT NULL DEFAULT 0 | |
| next_retry_at | TIMESTAMPTZ | NULL | |
| last_error | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| sent_at | TIMESTAMPTZ | NULL | |

## 8.4 ERD logic rút gọn

```text
vas_work_order (1) ----- (N) vas_session
vas_work_order (1) ----- (N) vas_state_history
vas_work_order (1) ----- (N) vas_exception_log
vas_work_order (1) ----- (N) vas_outbox

vas_work_order.owner_id ------------> owner (M2)
vas_work_order.bulk_source_item_id --> item (M2)
vas_work_order.bagged_output_item_id -> item (M2)
vas_work_order.packaging_item_id ----> item (M2)
vas_work_order.packaging_owner_id ---> owner (M2)
vas_work_order.warehouse_id ---------> warehouse (M2)
```

---

## 9. Luồng xử lý chuẩn từ database → backend → integration

## 9.1 Luồng 1 — Tạo WO

### Mục tiêu
Tạo một VAS Work Order ở trạng thái `DRAFT`.

### Flow
1. Client gọi `POST /api/v1/vas-wo`.
2. Controller validate DTO cơ bản.
3. Service kiểm tra permission `VAS_WO_CREATE`.
4. Service validate master references từ M2.
5. Service validate semantic:
   - bulk source item hợp lệ
   - bagged output item hợp lệ
   - packaging item hợp lệ
   - packaging_owner_id hợp lệ theo ownership model
6. Gọi NumberSequence của M1 để sinh `wo_number`.
7. Insert `vas_work_order` trạng thái `DRAFT`.
8. Ghi `vas_state_history` action `CREATE`.
9. Ghi audit log M1.
10. Trả WO detail.

### Bảng bị tác động
- `vas_work_order`
- `vas_state_history`
- `audit_log` (M1)

## 9.2 Luồng 2 — Confirm WO

### Mục tiêu
Kiểm tra đủ hàng và reserve bulk cho VAS.

### Flow
1. Client gọi `POST /api/v1/vas-wo/{id}/confirm`.
2. Lock row WO bằng `SELECT ... FOR UPDATE` hoặc optimistic lock.
3. Validate state phải là `DRAFT`.
4. Gọi M3 query on-hand/available cho bulk source dim phù hợp.
5. Gọi M3 query packaging stock theo `packaging_item_id + packaging_owner_id`.
6. Nếu thiếu bulk hoặc thiếu packaging → fail, ghi `vas_exception_log`.
7. Nếu đủ → gọi inventory facade để reserve bulk qty cho VAS.
8. Update WO `DRAFT -> CONFIRMED`, set `confirmed_at/by`.
9. Ghi state history + audit.
10. Trả detail mới.

### Điểm kỹ thuật quan trọng
- Confirm phải idempotent theo external_id của action confirm.
- Reservation write nên đi qua M3/inventory facade, không sửa `on_hand` trực tiếp trong repo M9.
- Nếu reservation fail sau khi validate pass, rollback toàn bộ.

## 9.3 Luồng 3 — Ghi session đầu tiên / Start WO

### Mục tiêu
Đưa WO từ `CONFIRMED` sang `IN_PROGRESS` khi session đầu tiên được ghi.

### Flow
1. Client gọi `POST /api/v1/vas-wo/{id}/session`.
2. Lock WO row.
3. Validate state phải là `CONFIRMED` hoặc `IN_PROGRESS`.
4. Validate session payload > 0.
5. Nếu WO đang `CONFIRMED`:
   - set `started_at`
   - chuyển state sang `IN_PROGRESS`
   - ghi state history action `START`
6. Tính `session_num = max + 1`.
7. Insert `vas_session`.
8. Nếu có work_hours thì tính productivity.
9. Ghi audit.
10. Trả session + snapshot progress.

### Bảng bị tác động
- `vas_work_order`
- `vas_session`
- `vas_state_history` (nếu là session đầu)
- `audit_log`

## 9.4 Luồng 4 — Ghi thêm session progress

### Mục tiêu
Tiếp tục tích lũy progress nhưng không post inventory.

### Flow
1. Client gọi cùng endpoint add session.
2. State phải là `IN_PROGRESS`.
3. Insert `vas_session`.
4. Optionally update cached progress fields hoặc tính on-demand ở query.
5. Ghi audit.

### Lưu ý
- Session không đổi tồn kho.
- Session không release reservation.
- Session không sinh billing.

## 9.5 Luồng 5 — Complete WO tại `COMPLETED`

### Mục tiêu
Chốt sản lượng, post inventory atomic, release reservation và tạo billing outbox.

### Flow chuẩn
1. Client gọi `POST /api/v1/vas-wo/{id}/complete`.
2. Lock WO row.
3. Validate state phải là `IN_PROGRESS`.
4. Validate tổng session đã có, actual output > 0, actual consumed >= actual output.
5. Tính `process_loss_qty = actual_consumed - actual_output`.
6. Nếu process loss > ngưỡng hoặc variance rule yêu cầu reason → validate reason_code.
7. Gọi inventory facade của M3 trong transaction orchestration để post batch:
   - consume bulk `-actual_consumed_qty_kg`
   - produce bagged `+actual_output_qty_kg`
   - consume packaging `-packaging_qty_actual`
8. Release reservation bulk tương ứng.
9. Update WO `IN_PROGRESS -> COMPLETED`, lưu actuals.
10. Insert state history `COMPLETE`.
11. Insert `vas_outbox` event `BAGGING_FEE_CAPTURE`.
12. Ghi audit.
13. Commit.
14. Job nền dispatch outbox sang M10.

### Bảng bị tác động
- `vas_work_order`
- `vas_state_history`
- `vas_outbox`
- `audit_log`
- M3 tables: `invent_trans`, `on_hand`, maybe reservation related store

## 9.6 Luồng 6 — Cancel trước complete

### Mục tiêu
Hủy WO khi chưa complete.

### Flow
1. Client gọi `POST /api/v1/vas-wo/{id}/cancel`.
2. Lock WO row.
3. Validate state thuộc `DRAFT`, `CONFIRMED`, hoặc `IN_PROGRESS`.
4. Nếu `DRAFT`: chỉ đổi state `CANCELLED`.
5. Nếu `CONFIRMED` hoặc `IN_PROGRESS`: gọi inventory facade release reservation.
6. Update state `CANCELLED`, lưu reason.
7. Ghi state history + audit.
8. Commit.

### Lưu ý
- Phase 1 không có partial session posting, nên cancel không reverse inventory.
- Nếu sau này bật session-level posting, flow cancel phải đổi.

## 9.7 Luồng 7 — Query detail/list/history

### Mục tiêu
Cho manager/ops xem WO, sessions, progress, exception và trace.

### Flow
- Query service join read-only tới sessions/state history/outbox status.
- Support filter theo warehouse, owner, status, bulk item, output item, date range.
- Detail nên include summary:
  - planned vs actual
  - total sessions
  - productivity
  - reservation status
  - billing dispatch status

---

## 10. Thiết kế state machine chuẩn

## 10.1 WO state machine

```text
DRAFT
  └─[Confirm]──→ CONFIRMED
                    └─[First session]──→ IN_PROGRESS
                                           └─[Complete]──→ COMPLETED
                                           └─[Cancel]────→ CANCELLED

DRAFT ─[Cancel]────→ CANCELLED
CONFIRMED ─[Cancel]→ CANCELLED

COMPLETED, CANCELLED = terminal
```

## 10.2 Transition table

| From | To | Trigger | Guard | Side Effect |
|---|---|---|---|---|
| — | DRAFT | Create | master valid | number sequence, state history |
| DRAFT | CONFIRMED | Confirm | bulk & packaging đủ | reserve bulk |
| CONFIRMED | IN_PROGRESS | Add first session | session payload valid | started_at set |
| IN_PROGRESS | IN_PROGRESS | Add next session | session payload valid | progress log only |
| IN_PROGRESS | COMPLETED | Complete | actual values valid | inventory batch + release reservation + billing outbox |
| DRAFT | CANCELLED | Cancel | reason if required | no reservation release |
| CONFIRMED | CANCELLED | Cancel | reason required | release reservation |
| IN_PROGRESS | CANCELLED | Cancel | reason required | release reservation |

## 10.3 Forbidden transitions

- `COMPLETED -> *`
- `CANCELLED -> *`
- `DRAFT -> IN_PROGRESS`
- `CONFIRMED -> COMPLETED` *(trừ khi business sau này chốt complete trực tiếp không qua session; Phase 1 không khuyến nghị)*

---

## 11. Reservation engine — thiết kế chi tiết

## 11.1 Mục tiêu

Giữ bulk source stock cho VAS sau khi confirm để M5 outbound không allocate trùng.

## 11.2 Reservation scope khuyến nghị

Phase 1 khuyến nghị reserve ở **warehouse + owner + item + status AVAILABLE**, chưa khóa location cụ thể trừ khi business chốt exact source location.

Lý do:
- Bagging thường consume từ cùng pool storage của kho.
- Nếu khóa location quá sớm trong khi vận hành thay đổi source pile/location linh hoạt, UX sẽ cứng.
- Nhưng phần này vẫn là open item cần chốt trước FS cuối.

## 11.3 Contract dữ liệu với M3/M5

### Option khuyến nghị cho go-live

Trên `on_hand` hoặc stock pool runtime nên có:
- `physical_qty`
- `reserved_qty_shipment`
- `reserved_qty_vas`
- `available_qty_derived = physical_qty - reserved_qty_shipment - reserved_qty_vas`

### Vì sao không để M5 gọi API M9 mỗi lần allocate

- Tạo coupling nóng giữa 2 module.
- Allocation là hot path, không nên thêm hop API.
- Dễ lỗi consistency khi timeout giữa M5 và M9.

## 11.4 Rule release

- `CONFIRMED -> CANCELLED`: release full planned reserved qty
- `IN_PROGRESS -> CANCELLED`: release full reserved qty vì chưa post
- `IN_PROGRESS -> COMPLETED`: release reserved qty tương ứng actual consumed; phần chênh lệch planned - actual nếu có phải release sạch trong cùng transaction

## 11.5 Concurrency strategy

- Confirm WO cần lock stock pool liên quan.
- Không cho 2 request confirm đồng thời trên cùng WO.
- Complete WO cần lock WO row và stock pool để tránh race với adjustment/move/allocation.
- Nếu M3 dùng row-level lock trên `on_hand`, M9 phải gọi qua facade hỗ trợ lock order chuẩn để tránh deadlock.

---

## 12. Inventory posting engine — mapping chi tiết với M3

## 12.1 Posting set chuẩn tại complete

### Trans 1 — Bulk consume
- movement_type: `VAS_CONSUME`
- qty: `-actual_consumed_qty_kg`
- ref_type: `VAS_WO`
- ref_id: `wo_number`
- owner: `owner_id`
- item: `bulk_source_item_id`
- dim: kho/vị trí/status nguồn bulk

### Trans 2 — Bagged output produce
- movement_type: `VAS_PRODUCE`
- qty: `+actual_output_qty_kg`
- ref_type: `VAS_WO`
- ref_id: `wo_number`
- owner: `owner_id`
- item: `bagged_output_item_id`
- dim: kho/vị trí/status đầu ra

### Trans 3 — Packaging consume
- movement_type: `VAS_CONSUME`
- qty: `-packaging_qty_actual`
- ref_type: `VAS_WO`
- ref_id: `wo_number`
- owner: `packaging_owner_id`
- item: `packaging_item_id`
- dim: kho/vị trí/status của vật tư bao bì

## 12.2 Vấn đề location dim cho posting

Phase 1 có 2 cách:

1. **Single storage location per WO**  
   Đơn giản nhất, dễ code, dễ reconcile.
2. **Multi-location consume mapping**  
   Linh hoạt hơn nhưng cần bảng allocation/source breakdown riêng.

Khuyến nghị go-live: dùng **single logical source location** cho WO hoặc derive từ selected bagging area/source stock record, không mở multi-location consume khi chưa chốt.

## 12.3 Formula bất biến

```text
actual_consumed_qty_kg = actual_output_qty_kg + process_loss_qty_kg
process_loss_qty_kg >= 0
packaging_qty_actual >= actual_bag_count (nếu 1 bag = 1 pack unit)
```

## 12.4 Reverse strategy

- Phase 1: không cho reverse trực tiếp từ M9 UI.
- Nếu complete sai:
  - dùng controlled reverse flow của M3/M6 + audit mạnh
  - tạo WO mới hoặc phase sau dùng rework flow riêng

---

## 13. Billing handoff — thiết kế chi tiết với M10

## 13.1 Mục tiêu

Tạo event chuẩn để M10 tính hoặc capture bagging fee từ WO completed.

## 13.2 Payload tối thiểu khuyến nghị

```json
{
  "event_type": "BAGGING_FEE_CAPTURE",
  "wo_id": "uuid",
  "wo_number": "VAS-20260309-000001",
  "owner_id": "OWNER01",
  "warehouse_id": "WH5.1",
  "bulk_source_item_id": "BULK01",
  "bagged_output_item_id": "BAG50",
  "actual_output_qty_kg": 10000,
  "actual_output_qty_mt": 10,
  "actual_bag_count": 200,
  "packaging_ownership": "TVL_OWNED",
  "packaging_item_id": "PKG50",
  "packaging_qty_actual": 200,
  "is_overtime": false,
  "overtime_sessions": 1,
  "completed_at": "2026-03-09T10:00:00Z",
  "correlation_id": "uuid"
}
```

## 13.3 Rule billing theo ownership

- `TVL_OWNED`: labor fee + material fee
- `CLIENT_OWNED`: labor fee only
- storage fee cho client-owned packaging là open item nghiệp vụ, **không hard-code** trong M9

## 13.4 Tier pricing

Tier pricing hiện là nghiệp vụ của M10/contract layer, nhưng M9 nên gửi đủ actual output qty MT và metadata session/overtime để M10 tính đúng.

## 13.5 Retry strategy

- Gửi qua outbox async
- Exponential backoff hoặc same baseline của hệ thống
- Idempotency key nên là `BAGGING_FEE:{wo_number}`
- Nếu M10 tạm fail, WO vẫn completed; event tiếp tục retry nền

---

## 14. Recovery & consistency strategy

## 14.1 Case A — Create WO thành công nhưng response fail

- Dựa vào `external_id` create để retry trả lại WO cũ.

## 14.2 Case B — Confirm validate pass nhưng reserve fail

- Rollback toàn bộ transaction confirm.
- WO vẫn ở `DRAFT`.
- Ghi exception log.

## 14.3 Case C — Add session duplicate do mobile/web retry

- `external_id` unique trên `vas_session`.
- Retry phải trả session cũ, không tăng `session_num` thêm.

## 14.4 Case D — Complete gọi 2 lần gần đồng thời

- Lock WO row.
- Request 1 thắng, request 2 thấy state đã `COMPLETED` hoặc idempotency hit → trả result cũ.

## 14.5 Case E — M3 posting success nhưng update WO fail

- Không để xảy ra bằng cách orchestrate trong cùng transaction boundary hoặc same transactional outbox/facade pattern.
- Nếu M3 nằm cùng DB/module boundary nội bộ thì dùng single DB transaction.
- Nếu không thể single transaction, phải dùng saga/compensation rõ ràng. Go-live khuyến nghị **modular monolith + cùng DB transaction**.

## 14.6 Case F — Complete success nhưng billing outbox dispatch fail

- WO vẫn `COMPLETED`.
- Outbox status `FAILED/PENDING RETRY`.
- Job nền retry; không rollback inventory vì billing là downstream consumer.

## 14.7 Case G — Cancel khi đã `COMPLETED`

- Reject thẳng `409 INVALID_STATE`.
- Hướng đúng là controlled reverse/correction flow ngoài M9 Phase 1.

---

## 15. Thiết kế API implementation-ready

> Tất cả command API bên dưới đều nên yêu cầu `external_id` trong body hoặc header theo shared standard của hệ thống.

## 15.1 WO command APIs

### 1. Create WO
`POST /api/v1/vas-wo`

**Dùng để làm gì:** tạo work order bagging ở trạng thái `DRAFT`.

**Input chính:**
- owner_id
- warehouse_id
- bulk_source_item_id
- bagged_output_item_id
- planned_qty_kg
- packaging_ownership
- packaging_item_id
- packaging_owner_id
- packaging_qty_planned
- start_date
- estimated_completion_date
- notes
- external_id

**Validate chính:**
- owner/item/warehouse tồn tại
- bulk item, output item, packaging item không trùng sai logic
- packaging owner hợp lệ

**Side effect:**
- sinh number sequence
- insert WO + state history + audit

### 2. Update draft WO
`PATCH /api/v1/vas-wo/{id}`

**Dùng để làm gì:** sửa WO khi còn `DRAFT`.

**Validate:**
- chỉ `DRAFT`
- optimistic lock bằng `row_version`

### 3. Confirm WO
`POST /api/v1/vas-wo/{id}/confirm`

**Dùng để làm gì:** khóa kế hoạch và reserve stock.

**Validate:**
- state = `DRAFT`
- stock bulk đủ
- packaging stock đủ

**Side effect:**
- reserve bulk
- update state `CONFIRMED`
- audit/state history

### 4. Add session
`POST /api/v1/vas-wo/{id}/session`

**Dùng để làm gì:** ghi progress bagging.

**Validate:**
- state = `CONFIRMED` hoặc `IN_PROGRESS`
- session qty/bag_count hợp lệ

**Side effect:**
- insert session
- nếu là first session thì move sang `IN_PROGRESS`

### 5. Complete WO
`POST /api/v1/vas-wo/{id}/complete`

**Dùng để làm gì:** chốt actuals, post inventory, release reservation, gửi billing outbox.

**Input chính:**
- actual_consumed_qty_kg
- actual_output_qty_kg
- actual_bag_count
- packaging_qty_actual
- yield_variance_reason_code (conditional)
- notes
- external_id

**Validate:**
- state = `IN_PROGRESS`
- actuals hợp lệ
- material balance hợp lệ

**Side effect:**
- M3 inventory batch
- state complete
- billing outbox
- audit/state history

### 6. Cancel WO
`POST /api/v1/vas-wo/{id}/cancel`

**Dùng để làm gì:** hủy WO trước complete.

**Validate:**
- state thuộc `DRAFT/CONFIRMED/IN_PROGRESS`
- reason_code bắt buộc với non-draft

**Side effect:**
- release reservation nếu cần
- state cancelled
- audit/state history

## 15.2 Inquiry / audit APIs

### 7. List WOs
`GET /api/v1/vas-wo`

Filter:
- warehouse_id
- owner_id
- status
- bulk_source_item_id
- bagged_output_item_id
- created_from / created_to
- completed_from / completed_to
- keyword

### 8. Get WO detail
`GET /api/v1/vas-wo/{id}`

Trả:
- header
- sessions summary
- state history
- exception list
- outbox/billing status

### 9. Get sessions
`GET /api/v1/vas-wo/{id}/sessions`

### 10. Get WO history / audit view
`GET /api/v1/vas-wo/{id}/history`

### 11. Get productivity summary
`GET /api/v1/vas-analytics/productivity`

> Analytics API có thể phase sau nếu backlog chưa ưu tiên; nhưng query aggregate theo ngày/ca/warehouse rất hữu ích cho ops.

---

## 16. Error code gợi ý

| Code | Ý nghĩa |
|---|---|
| `VAS_WO_NOT_FOUND` | Không tìm thấy WO |
| `VAS_INVALID_STATE` | State hiện tại không cho phép action |
| `VAS_DUPLICATE_EXTERNAL_ID` | Request đã được xử lý trước đó |
| `VAS_INSUFFICIENT_BULK` | Không đủ bulk để confirm |
| `VAS_INSUFFICIENT_PACKAGING` | Không đủ packaging để confirm |
| `VAS_INVALID_MATERIAL_BALANCE` | `actual_consumed < actual_output` hoặc công thức sai |
| `VAS_REASON_REQUIRED` | Thiếu reason code bắt buộc |
| `VAS_RESERVATION_CONFLICT` | Xung đột reservation / stock lock |
| `VAS_ALREADY_COMPLETED` | WO đã hoàn tất |
| `VAS_ALREADY_CANCELLED` | WO đã hủy |
| `VAS_SESSION_INVALID` | Session qty/bag_count/work hours không hợp lệ |
| `VAS_PACKAGING_OWNER_INVALID` | packaging owner không đúng với ownership model |

---

## 17. Pseudo-flow cho dev intern dễ code

## 17.1 Confirm WO

```ts
async function confirmVasWo(woId: string, externalId: string, actor: Actor) {
  return db.$transaction(async (tx) => {
    await idempotency.assertNotProcessed(tx, externalId, 'VAS_CONFIRM');

    const wo = await vasRepo.getForUpdate(tx, woId);
    assertState(wo.status, ['DRAFT']);

    const bulkAvailable = await inventoryFacade.getBulkAvailable(tx, {
      ownerId: wo.ownerId,
      warehouseId: wo.warehouseId,
      itemId: wo.bulkSourceItemId,
    });
    if (bulkAvailable < wo.plannedQtyKg) throw new DomainError('VAS_INSUFFICIENT_BULK');

    const packagingAvailable = await inventoryFacade.getPackagingAvailable(tx, {
      ownerId: wo.packagingOwnerId,
      warehouseId: wo.warehouseId,
      itemId: wo.packagingItemId,
    });
    if (packagingAvailable < wo.packagingQtyPlanned) throw new DomainError('VAS_INSUFFICIENT_PACKAGING');

    await inventoryFacade.reserveVasBulk(tx, wo, wo.plannedQtyKg);
    await vasRepo.markConfirmed(tx, woId, actor.userId);
    await stateHistoryRepo.append(tx, woId, 'DRAFT', 'CONFIRMED', 'CONFIRM', actor);
    await audit.log(tx, ...);
    await idempotency.markProcessed(tx, externalId, 'VAS_CONFIRM', woId);

    return vasRepo.getDetail(tx, woId);
  });
}
```

## 17.2 Add session

```ts
async function addSession(woId: string, dto: AddSessionDto, actor: Actor) {
  return db.$transaction(async (tx) => {
    await idempotency.assertNotProcessed(tx, dto.externalId, 'VAS_ADD_SESSION');

    const wo = await vasRepo.getForUpdate(tx, woId);
    assertState(wo.status, ['CONFIRMED', 'IN_PROGRESS']);

    const nextNum = await sessionRepo.nextSessionNum(tx, woId);
    await sessionRepo.insert(tx, { ...dto, woId, sessionNum: nextNum, createdBy: actor.userId });

    if (wo.status === 'CONFIRMED') {
      await vasRepo.markInProgress(tx, woId);
      await stateHistoryRepo.append(tx, woId, 'CONFIRMED', 'IN_PROGRESS', 'START', actor);
    }

    await audit.log(tx, ...);
    await idempotency.markProcessed(tx, dto.externalId, 'VAS_ADD_SESSION', woId);
  });
}
```

## 17.3 Complete WO

```ts
async function completeVasWo(woId: string, dto: CompleteVasWoDto, actor: Actor) {
  return db.$transaction(async (tx) => {
    await idempotency.assertNotProcessed(tx, dto.externalId, 'VAS_COMPLETE');

    const wo = await vasRepo.getForUpdate(tx, woId);
    assertState(wo.status, ['IN_PROGRESS']);
    validateMaterialBalance(dto.actualConsumedQtyKg, dto.actualOutputQtyKg);

    const processLoss = dto.actualConsumedQtyKg - dto.actualOutputQtyKg;
    validateVarianceReason(processLoss, dto.yieldVarianceReasonCode);

    await inventoryFacade.postVasCompletion(tx, {
      wo,
      actualConsumedQtyKg: dto.actualConsumedQtyKg,
      actualOutputQtyKg: dto.actualOutputQtyKg,
      packagingQtyActual: dto.packagingQtyActual,
      actor,
    });

    await inventoryFacade.releaseVasReservation(tx, wo, wo.plannedQtyKg);

    await vasRepo.markCompleted(tx, woId, {
      actualConsumedQtyKg: dto.actualConsumedQtyKg,
      actualOutputQtyKg: dto.actualOutputQtyKg,
      actualBagCount: dto.actualBagCount,
      packagingQtyActual: dto.packagingQtyActual,
      processLossQtyKg: processLoss,
      completedBy: actor.userId,
    });

    await outboxRepo.insert(tx, buildBaggingFeeEvent(wo, dto));
    await stateHistoryRepo.append(tx, woId, 'IN_PROGRESS', 'COMPLETED', 'COMPLETE', actor);
    await audit.log(tx, ...);
    await idempotency.markProcessed(tx, dto.externalId, 'VAS_COMPLETE', woId);

    return vasRepo.getDetail(tx, woId);
  });
}
```

---

## 18. NFR áp cho Module 9

1. `complete WO` phải atomic và trung bình < 2 giây trong điều kiện bình thường.
2. Query list/detail phải phân trang, không trả full history vô hạn.
3. Duplicate command phải trả kết quả ổn định, không tạo state kép.
4. Audit bắt buộc cho create, confirm, add-session, complete, cancel.
5. Mọi state terminal phải bất biến qua API thông thường.
6. Read APIs phải hỗ trợ warehouse-scope và owner-scope.
7. Reservation leak phải có monitoring/check job.

---

## 19. Khuyến nghị triển khai DB migration

### Sprint đầu tiên
- tạo enum state / ownership / shift / outbox status
- tạo 5 bảng lõi: `vas_work_order`, `vas_session`, `vas_state_history`, `vas_exception_log`, `vas_outbox`
- thêm index cơ bản
- thêm unique constraint cho `external_id`

### Sprint tiếp theo
- thêm view/read model cho aggregate progress
- thêm optional attachment table nếu cần evidence
- thêm check constraint cho material balance cơ bản nếu muốn bảo vệ ở DB

### DB constraints gợi ý
- `process_loss_qty_kg >= 0`
- `planned_qty_kg > 0`
- `packaging_qty_planned > 0`
- `actual_output_qty_kg <= actual_consumed_qty_kg` *(enforce ở app trước, DB check sau nếu muốn)*

---

## 20. Test strategy khuyến nghị

## 20.1 Unit tests
- policy confirm stock validation
- material balance calculation
- packaging ownership billing behavior
- forbidden state transitions

## 20.2 Integration tests
- create → confirm → session → complete happy path
- client-owned packaging flow
- confirm fail do thiếu bulk
- confirm fail do thiếu packaging
- cancel confirmed releases reservation
- complete creates outbox once only

## 20.3 Concurrency tests
- 2 confirm đồng thời cùng WO
- 2 complete đồng thời cùng WO
- outbound allocation cạnh tranh với confirm VAS trên cùng stock pool

## 20.4 Audit tests
- create/confirm/session/complete/cancel đều có audit + state history

## 20.5 Recovery tests
- billing outbox fail retry
- duplicate external_id trả result cũ
- complete fail giữa chừng rollback sạch

---

## 21. Mapping tóm tắt với các module 1 → 8

| Module | M9 dùng gì | M9 trả gì / ảnh hưởng gì |
|---|---|---|
| M1 | RBAC, reason code, number sequence, audit, idempotency | ghi audit/state/action theo chuẩn hệ thống |
| M2 | owner, item, warehouse, packaging master | dùng master đúng semantics bulk/bagged/packaging |
| M3 | on-hand query, reserve/release, post VAS completion | tạo inventory truth cho bulk/bagged/packaging |
| M4 | inbound tạo bulk/packaging stock trước cho M9 dùng | không trigger trực tiếp, chỉ phụ thuộc stock đã inbound |
| M5 | đọc available đã trừ VAS reservation | sau complete có thêm stock bagged để outbound allocate |
| M6 | adjustment/move/status change ảnh hưởng stock pool của M9 | cần tôn trọng reservation và traceability |
| M7 | có thể hỗ trợ mobile execution về sau | Phase 1 không giao ownership work lifecycle cho M7 |
| M8 | mobile sync/offline hoặc IoT bagging future | không sở hữu business rule bagging |

---

## 22. Backlog kỹ thuật nên tách theo sprint

### Sprint A — Foundation của M9
- DB schema lõi
- create/list/detail WO
- state history + audit
- basic master validations

### Sprint B — Confirm + reservation contract
- confirm API
- inventory facade query + reserve/release
- integration test với M3/M5 contract

### Sprint C — Session progress
- add session API
- productivity summary
- mobile/web flow cơ bản

### Sprint D — Complete + billing outbox
- complete API
- M3 posting facade
- billing outbox
- retry job

### Sprint E — Hardening
- concurrency tests
- failure injection
- monitoring
- cleanup / stale detection

---

## 23. Kết luận tech lead

Module 9 nhìn bề ngoài có vẻ nhỏ hơn Inbound/Outbound, nhưng về kỹ thuật lại là module **rất nhạy cảm** vì nó chạm đồng thời 3 vùng:

1. **Inventory truth** — bulk giảm, bagged tăng, packaging giảm.  
2. **Operational integrity** — session progress, process loss, cancel/retry.  
3. **Revenue integrity** — phát sinh bagging fee và material fee.

Nếu build sai M9, hệ thống có thể gặp 3 loại lỗi rất khó sửa:
- tồn bulk và bagged không khớp,
- packaging usage không reconcile được,
- billing bagging sai hoặc trùng.

Vì vậy định hướng kỹ thuật đúng cho M9 trong Phase 1 là:
- giữ WO lifecycle thật rõ,
- **không post giữa session**,
- confirm phải reserve stock,
- complete phải **atomic**,
- billing phải đi qua outbox,
- và mọi inventory change phải đi qua M3.

Nếu team giữ đúng nguyên tắc này, Module 9 sẽ đủ sạch để mở rộng sang blending, rework, QC hold, costing và VAS nâng cao ở phase sau mà không phải đập lại core.

---

## 24. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn dựa trên các baseline đã có trong dự án:
- Module 9 functional spec
- Module 1 → Module 8 specs và tech stack docs
- Overview / Spec Overview / Blueprint / System Control Map / State Machine
- Inventory Transaction Spec / Transaction Data Dictionary
- PRD / BRD / BA-PO Master

Khi team bóc tiếp sang FS chi tiết, API contract cuối và ERD cuối, cần chốt dứt điểm 2 open items blocker cho M9:
1. reservation ở warehouse-level hay location-level,
2. tier pricing reset rule của bagging.
