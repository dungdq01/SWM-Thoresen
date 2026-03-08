# TVL SWM — Module 7 Tech Stack & Backend Design
# Work Execution & Mobile Operations

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Mobile Dev  
**Mục tiêu:** Chuyển hóa Module 7 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, mobile execution flow, offline sync, API, posting orchestration và mapping chuẩn với các module 1–6.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 7 — Work Execution & Mobile Operations** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 7 thực chất phải build những gì ở Phase 1.
- Luồng chuẩn từ **database → repository → service → state machine → posting handoff → callback/handoff liên module** phải tổ chức ra sao.
- Vì sao Module 7 là **execution layer**, không phải nơi sở hữu business lifecycle của Receipt, Shipment hay Inventory ledger.
- Thiết kế database nào vừa đúng go-live Phase 1 vừa sạch để scale cho replenishment, wave, directed assignment, barcode/RFID và advanced mobile sau này.
- Từng API của Module 7 dùng để làm gì, validate gì, side effect gì, idempotency ra sao và nên code theo pattern nào.
- Cách Module 7 ánh xạ với **Module 1, 2, 3, 4, 5, 6** và các lớp hỗ trợ khác như mobile/integration.
- Cách build offline-first mobile execution mà vẫn giữ được tính đúng đắn của ledger, audit và traceability.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- M7 sở hữu **work lifecycle**: tạo work, claim, start, execute, skip, cancel, complete.  
- M7 **không sở hữu inbound receipt posting** của M4 và **không sở hữu outbound ship posting** của M5.  
- M7 chỉ post **movement inventory effects** cho putaway, pick, move và transfer execution thông qua **M3 Inventory Core Engine**.  
- M7 dùng **QR location scan**, không dùng barcode item scan ở Phase 1.  
- M7 phải hỗ trợ **offline queue + sync** cho mobile, và mọi side-effect phải idempotent qua `external_id`.  
- M7 là lớp thực thi được trigger bởi M4, M5, M6; còn M3 mới là inventory truth engine.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 24 kết luận kỹ thuật quan trọng cho Module 7:

1. **Module 7 là execution orchestration layer của kho**, không phải module business ownership của inbound/outbound/control.
2. **Work là object runtime riêng**, không được gộp logic vào Receipt, Shipment hay Move document.
3. **WorkHeader** là container nghiệp vụ của task; **WorkLine** là đơn vị thực thi và cũng là đơn vị posting nhỏ nhất.
4. **Nguyên tắc bất biến quan trọng nhất:** `1 WorkLine COMPLETED = 1 inventory posting request hợp lệ` theo đúng mapping của work type.
5. **M7 không được tự viết trực tiếp vào `invent_trans` hoặc `on_hand`**; mọi thay đổi inventory phải đi qua M3.
6. **Putaway complete** chỉ tạo `MOVE RECEIVING -> STORAGE`; không tạo lại inbound receipt trans.
7. **Pick complete** chỉ tạo `MOVE STORAGE -> STAGING`; không tạo outbound ship trans.
8. **Transfer execution trong M7** là execution layer cho M6 transfer order; source side là `TRANSFER_SHIP`, destination side là `TRANSFER_RECEIVE`.
9. **M7 không quyết định tolerance business của inbound/outbound**, nhưng có thể xử lý exception vận hành như short pick, location mismatch, item not found.
10. **Self-claim là baseline Phase 1**; không có directed assignment hay dispatcher model trong go-live.
11. **Claim không đổi status**, chỉ gắn `assigned_to`; chỉ `start` mới đổi `OPEN -> IN_PROGRESS`.
12. **QR scan dùng để xác nhận location**, không phải scan hàng hóa.
13. **Offline-first là capability bắt buộc**, không phải tiện ích phụ; design backend phải chấp nhận duplicate sync, out-of-order sync và late sync.
14. **Manager override complete không được blind force-complete**; bắt buộc `actual_qty + reason_code + evidence + audit`.
15. **Line terminal state phải bất biến**; line đã `COMPLETED` không reopen trực tiếp. Correction phải đi qua reverse/counter flow ở module sở hữu nghiệp vụ và M3.
16. **M7 phải tách command model và query model** rõ ràng, đặc biệt cho mobile list / dashboard / SLA.
17. **Work generation có nhiều nguồn trigger**: M4, M5, M6. Vì vậy source reference model phải rất chặt để không double-create.
18. **M7 phải có state machine tập trung**, không cho controller tự cập nhật status.
19. **M7 phải có exception trail và event trail** vì đây là lớp tác nghiệp thực địa, rủi ro tranh chấp cao.
20. **M7 phải có concurrency control** cho claim/start/complete để tránh hai người cùng thao tác một work.
21. **M7 phải scale cho mobile query volume cao**, nên cần index và read model phù hợp cho `available works`, `my works`, `dashboard`.
22. **M7 phải hỗ trợ callback/handoff sang M4, M5, M6** sau khi work hoàn tất để các module đó cập nhật state business.
23. **Thiết kế DB của M7 phải chừa đường cho Phase 2** như replenishment, cycle count work, directed assignment, wave, load, barcode item scan.
24. **Recovery path là capability bắt buộc** cho duplicate sync, stale in-progress work, posting success nhưng callback fail, và mobile offline replay.

---

## 3. Phạm vi build thực tế của Module 7 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Work generation runtime từ trigger của M4/M5/M6
2. Work listing cho web/mobile
3. Self-claim / release claim
4. Start work header / start work line
5. Complete work line với scan QR + nhập actual quantity
6. Skip line / cancel work / manager override complete
7. Exception handling cho short pick, location mismatch, item not found
8. Posting orchestration sang M3 cho putaway/pick/move/transfer execution
9. Callback/handoff về module nguồn sau khi complete
10. Supervisor dashboard + SLA + exception list
11. Offline sync batch cho mobile
12. Idempotency handling cho mọi command side-effect
13. Status history + event log + exception log + audit integration
14. Query APIs cho work detail, history, postings, dashboard
15. Recovery flows cho duplicate submit, stale work, callback fail, sync conflict

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build directed assignment / dispatch board.
2. Không build wave optimization / cluster picking.
3. Không build replenishment work type.
4. Không build load planning / truck loading orchestration.
5. Không build barcode item scan / RFID engine.
6. Không build route optimization trong kho.
7. Không build chat/call/task collaboration trong app.
8. Không build generalized workflow engine cho mọi loại task ngoài warehouse execution.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** lifecycle đầy đủ của work và work line.
- **Có build** mobile APIs, offline sync, idempotent commands, dashboard cơ bản.
- **Có build** posting orchestration sang M3 và callback sang M4/M5/M6.
- **Không build** logic business state machine của receipt/shipment/transfer order trong M7.
- **Không build** inventory ledger trong M7.
- **Không build** tính phí trong M7.
- **Không build** item barcode scan nếu spec Phase 1 chưa bật.
- **Không cho phép** module khác tự sửa trực tiếp trạng thái `we_work_header` / `we_work_line` ngoài service chuẩn của M7.

---

## 4. Khuyến nghị tech stack chính thức cho Module 7

Để đồng bộ với Module 1–6 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; outbox/event cho integration nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot mobile list / short-lived dedupe:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Integration layer

- **Inventory adapter:** gọi M3 để post movement inventory effects
- **Source-module callback adapter:** callback/handoff tới M4, M5, M6 sau khi work hoàn tất
- **Mobile sync adapter:** nhận batch sync events từ app và chuẩn hóa về command nội bộ
- **Outbox pattern:** dùng cho `WorkCompleted`, `WorkExceptionRaised`, `PutawayCompleted`, `PickCompleted`, `TransferStepCompleted`, `WorkSyncConflictRaised`

### 4.4 Mobile / offline support

- Mobile app chỉ cần local queue và local cache đơn giản, không cần local relational database quá phức tạp ở Phase 1 nếu volume vừa phải.
- Đồng bộ theo **event queue model**, không theo “gửi snapshot toàn bộ form”.
- Mỗi event offline phải có:
  - `external_id`
  - `device_id`
  - `device_event_time`
  - `sequence_no`
  - `work_id`
  - `work_line_id`
  - `event_type`
- Backend là nơi quyết định event hợp lệ hay conflict.

### 4.5 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên `source document -> work -> posting -> callback`
- Metrics:
  - work creation rate by type
  - claim latency
  - execution duration
  - completion rate
  - short pick rate
  - sync duplicate rate
  - sync conflict rate
  - callback fail rate
  - stale in-progress work count
- Tracing: OpenTelemetry-ready

### 4.6 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- State-machine test: work/work-line transition matrix
- Mobile sync test: duplicate sync, out-of-order sync, late sync, conflict sync
- Concurrency test: two claimers, two completers, same line double-complete
- Recovery test: posting success but callback fail, callback success but response fail

### 4.7 Vì sao nên giữ cùng stack với Module 1–6

- M1 là nền cho permission, reason code, audit, number sequence, idempotency.
- M2 là master source cho warehouse, location, item, owner, inventory status.
- M3 là inventory core engine mà M7 bắt buộc phải gọi.
- M4, M5, M6 đều đã dùng pattern state machine + outbox + posting handoff; M7 nên reuse cùng cách làm để team dev nhỏ maintain dễ hơn.
- Cùng stack giúp reuse guard, interceptor, request context, audit service, idempotency service, sequence service và migration style.

---

## 5. Kiến trúc tổng thể Module 7 trong hệ backend

```text
Web Dashboard / Mobile App / Internal Source Modules
                    |
                    v
             NestJS Work Controllers
                    |
   +----------------+-------------------+
   |                |                   |
   v                v                   v
Auth Guard    Permission Guard    Idempotency Guard
   |                |                   |
   +----------------+-------------------+
                    |
                    v
             Work Application Layer
+-------------------+-------------------+-------------------+------------------+
|                   |                   |                   |                  |
v                   v                   v                   v                  v
Generation Service  Claim Service       Execution Service   Sync Service       Dashboard Service
Exception Service   Callback Service    Query Service       Recovery Service   SLA Service
                    |
                    v
                Domain / Policy Layer
+-------------------+-------------------+-------------------+------------------+
| State Machine     | Validation Policy | Posting Rule      | Sync Policy      |
| Exception Policy  | Concurrency Rule  | Callback Rule     | SLA Policy       |
+-------------------+-------------------+-------------------+------------------+
                    |
                    v
                Repository Layer
                    |
                    v
 PostgreSQL + Redis + Outbox + Queue + Shared Audit/Idempotency Services
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa business logic.
- **Guard layer**: auth, permission, idempotency, request context.
- **Application services**: orchestration use case của work.
- **Domain/policy layer**: state machine, validation matrix, sync policy, exception policy, callback rule.
- **Repository layer**: query/CRUD thuần.
- **Outbox/integration adapters**: tách riêng để callback/handoff không làm hỏng transaction nghiệp vụ chính.

### 5.2 Tư tưởng thiết kế cốt lõi

- `we_work_line` là atomic execution unit; inventory effect bám vào line, không bám vào header.
- `we_work_header` là orchestration container; line xong hết thì header mới xong.
- Complete line phải xử lý theo thứ tự: **lock -> validate -> persist actual -> post inventory -> mark completed -> enqueue callback/outbox**.
- Posting sang M3 nên là **internal service boundary** trong cùng hệ backend nếu dùng modular monolith, nhưng vẫn giữ contract rõ để sau này tách service được.
- Callback sang M4/M5/M6 không nên nằm trong cùng DB transaction với complete line; dùng outbox để tăng ổn định.
- Mobile sync nên dùng **event replay** chứ không dùng “replace current work state from device”.

---

## 6. Phân ranh runtime ownership giữa Module 7 và các module khác

| Concern | Module 7 sở hữu | Module khác sở hữu |
|---|---|---|
| Work header / work line lifecycle | Có | Không |
| Claim / start / execute / skip / cancel / manager override | Có | Không |
| Mobile work list / sync / dashboard | Có | Không |
| Location scan validation workflow | Có | M2 cung cấp master location |
| Inventory posting ledger | Không | M3 |
| Receipt lifecycle | Không | M4 |
| Shipment lifecycle | Không | M5 |
| Transfer order / move request business document | Không | M6 |
| Permission / reason code / audit / idempotency framework | Không, chỉ consume | M1 |
| Item / owner / warehouse / location / status master | Không, chỉ consume | M2 |

### 6.1 Ánh xạ Module 7 với Module 1

Module 7 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được claim work
   - ai được start/complete line
   - ai được cancel work
   - ai được skip line
   - ai được override location mismatch
   - ai được manager override complete
   - ai được xem dashboard all-warehouse

2. **Reason code**
   - cancel work
   - skip line
   - short pick variance
   - location mismatch override
   - manager override complete
   - sync conflict resolve / technical recovery

3. **Audit trail**
   - work created from source trigger
   - claim/release/start/complete
   - skip/cancel/override
   - sync accepted/duplicate/conflict
   - callback fail / retry

4. **Idempotency**
   - create work from source event
   - claim/start/complete/skip/cancel
   - manager override complete
   - mobile sync events

5. **Number sequence**
   - sinh `work_id` theo sequence `WRK-*`
   - có thể sinh `work_batch_no` hoặc `sync_batch_no` nếu team muốn tracking đẹp hơn

### 6.2 Ánh xạ Module 7 với Module 2

Module 7 consume master data từ Module 2 như sau:

1. `warehouse` -> scope work, filter list, callback scope
2. `location` -> validate scan, type, zone, warehouse ownership, active/inactive
3. `item` -> validate active, UOM, cargo form khi hiển thị và execute
4. `owner` -> access control, dimension integrity, source document consistency
5. `inventory_status` -> validate movement target/source semantics nếu có status-sensitive execution
6. `uom/uom_conversion` -> chuẩn hóa quantity input nếu mobile nhập theo UOM khác base

### 6.3 Ánh xạ Module 7 với Module 3

Đây là mapping kỹ thuật quan trọng nhất.

M7 gọi M3 ở các capability sau:

1. **Complete putaway line**
   - tạo posting `MOVE RECEIVING -> STORAGE`
2. **Complete pick line**
   - tạo posting `MOVE STORAGE -> STAGING`
3. **Complete internal move line**
   - tạo posting `MOVE source -> destination`
4. **Complete transfer pick line**
   - tạo posting `TRANSFER_SHIP`
5. **Complete transfer put line**
   - tạo posting `TRANSFER_RECEIVE`
6. **Query posting result / posting reference**
   - lưu liên kết để inquiry và audit
7. **Reverse-only correction**
   - nếu cần correction sau complete, M7 không sửa line đã complete mà phải đi qua reverse/counter flow với M3 và module sở hữu nghiệp vụ

### 6.4 Ánh xạ Module 7 với Module 4

- M4 tạo **putaway work** khi receipt đạt `RECEIVED`.
- M7 thực thi putaway, scan destination storage location và complete line.
- Khi putaway line complete thành công, M7 phát callback `PutawayCompleted` để M4 chuyển receipt sang `PUTAWAY` rồi `CLOSED` theo rule của M4.
- Nếu work complete nhưng callback sang M4 fail, inventory move vẫn đã đúng; M7 phải retry callback bằng outbox/retry job.

### 6.5 Ánh xạ Module 7 với Module 5

- M5 tạo **pick work** khi shipment đạt `ALLOCATED`.
- M7 thực thi pick từ location đã allocate và đưa hàng về staging.
- M7 không được release `reserved_qty` của M5 khi pick complete.
- Khi tất cả pick work liên quan shipment hoàn tất, M7 phát callback `AllPickCompleted` hoặc `PickCompleted` để M5 cập nhật shipment `PICKING -> PICKED`.
- Ship posting cuối cùng vẫn thuộc M5 tại `SHIPPED`.

### 6.6 Ánh xạ Module 7 với Module 6

- M6 tạo work khi `execution_mode = WORK_BASED` cho move hoặc transfer.
- M7 thực thi actual movement của move/transfer.
- Sau khi complete, M7 callback để M6 cập nhật move order / transfer order state.
- M6 vẫn sở hữu business document, M7 chỉ sở hữu execution task.

### 6.7 Ánh xạ tóm tắt Module 7 với Modules 1–6

| Module | M7 dùng gì từ module đó | M7 trả gì / ảnh hưởng gì |
|---|---|---|
| M1 | RBAC, reason code, audit, idempotency, number sequence | audit trail, permission-enforced actions |
| M2 | warehouse, location, item, owner, status | dùng master chuẩn cho execution và scan validation |
| M3 | posting engine, query posting result | movement inventory effect chuẩn và traceable |
| M4 | nguồn trigger putaway work | callback putaway completed để receipt tiến state |
| M5 | nguồn trigger pick work | callback pick completed để shipment tiến state |
| M6 | nguồn trigger move/transfer work | callback execution completed để move/transfer tiến state |

---

## 7. Đề xuất cấu trúc code backend cho Module 7

```text
src/
  common/
    constants/
    enums/
    decorators/
    guards/
    interceptors/
    context/
    validators/
    policies/
  infrastructure/
    prisma/
    redis/
    queue/
    logger/
    outbox/
    integration/
  modules/
    work-execution/
      work-execution.module.ts
      controllers/
        work.controller.ts
        work-mobile.controller.ts
        work-dashboard.controller.ts
        work-admin.controller.ts
      services/
        work-generation.service.ts
        work-command.service.ts
        work-query.service.ts
        work-state-machine.service.ts
        work-claim.service.ts
        work-execution.service.ts
        work-posting.service.ts
        work-exception.service.ts
        work-sync.service.ts
        work-callback.service.ts
        work-recovery.service.ts
        work-sla.service.ts
      repositories/
        work-header.repository.ts
        work-line.repository.ts
        work-event-log.repository.ts
        work-exception.repository.ts
        mobile-sync-batch.repository.ts
        mobile-sync-event.repository.ts
        work-outbox.repository.ts
      dto/
      entities/
      mappers/
      policies/
        work-state.policy.ts
        work-validation.policy.ts
        work-exception.policy.ts
        work-sync.policy.ts
        work-callback.policy.ts
      jobs/
        stale-work-recovery.job.ts
        callback-retry.job.ts
        sync-reconcile.job.ts
        sla-monitor.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không được tự update trạng thái work.
- Chỉ `work-command.service.ts` hoặc các service orchestration tương ứng mới được thay đổi `we_work_header` / `we_work_line`.
- Chỉ `work-posting.service.ts` mới được phép gọi adapter sang M3 cho line completion.
- Repository không chứa if/else nghiệp vụ.
- Policy tách riêng để test matrix dễ hơn.
- DTO tách rõ command và query; mobile sync DTO tách khỏi web DTO.
- Không module nào khác được truy cập trực tiếp repository của work để đổi state.

---

## 8. Thiết kế database tổng thể cho Module 7

## 8.1 Nguyên tắc DB design

1. Tách rõ **header**, **line**, **event log**, **exception**, **sync runtime**, **outbox**.
2. `we_work_line` là unit thực thi và unit posting nhỏ nhất.
3. Mọi bảng command/runtime phải có `external_id`, `correlation_id`, `created_by`, `created_at`, `updated_at`, `version_no`.
4. Không hard delete work đã phát sinh; dùng terminal state + audit.
5. Tách read concern và write concern; dashboard có thể dùng read query tối ưu, không bắt join nặng mọi lúc.
6. Tạo unique key chống duplicate create work từ cùng source event.
7. `work_id` là business key, `id` là technical PK.
8. Chuẩn bị chỗ mở rộng cho Phase 2 như `assignment_mode`, `wave_id`, `route_no`, `scan_item_required`.
9. `line_num` phải bất biến sau khi work được tạo.
10. Inventory posting reference phải lưu tường minh để audit và reverse dễ.

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Runtime core

- `we_work_header`
- `we_work_line`
- `we_work_assignment_history`
- `we_work_status_history`
- `we_work_posting_link`

### 8.2.2 Trace / support tables

- `we_work_event_log`
- `we_work_exception`
- `we_mobile_sync_batch`
- `we_mobile_sync_event`
- `we_work_outbox_event`
- `we_work_sla_snapshot` *(optional read-support)*

### 8.2.3 Không thuộc Module 7 nhưng phải tham chiếu

- `invent_trans`, `invent_dim`, `on_hand` của M3
- `receipt_header` của M4
- `shipment_header` / `shipment_line` / allocation của M5
- `ic_move_order`, `ic_transfer_order` của M6
- `location`, `warehouse`, `item`, `owner` của M2

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `we_work_header`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | technical key |
| work_id | VARCHAR(40) | UNIQUE NOT NULL | business key `WRK-*` |
| work_type | VARCHAR(30) | NOT NULL | PUTAWAY / PICK / MOVE / TRANSFER_PICK / TRANSFER_PUT |
| status | VARCHAR(20) | NOT NULL | OPEN / IN_PROGRESS / COMPLETED / CANCELLED |
| priority_no | INT | NOT NULL | số nhỏ hơn = ưu tiên cao hơn |
| warehouse_id | UUID | NOT NULL | scope thao tác |
| zone_id | UUID | NULL | optional for filtering |
| source_module | VARCHAR(20) | NOT NULL | M4 / M5 / M6 / MANUAL |
| source_type | VARCHAR(40) | NOT NULL | RECEIPT / SHIPMENT / MOVE_ORDER / TRANSFER_ORDER |
| source_ref_id | VARCHAR(50) | NOT NULL | mã header nguồn |
| source_ref_line_id | VARCHAR(50) | NULL | mã line nguồn |
| source_owner_id | UUID | NULL | denormalized cho filter/scope |
| assigned_to | UUID | NULL | user đã claim |
| assigned_at | TIMESTAMP | NULL | |
| started_at | TIMESTAMP | NULL | |
| completed_at | TIMESTAMP | NULL | |
| cancelled_at | TIMESTAMP | NULL | |
| cancel_reason_code | VARCHAR(50) | NULL | bắt buộc nếu cancel |
| assignment_mode | VARCHAR(20) | NOT NULL DEFAULT 'SELF_CLAIM' | future-proof |
| source_doc_version | BIGINT | NULL | optional chống callback stale |
| external_id | VARCHAR(120) | NOT NULL | idempotency key tạo work |
| correlation_id | UUID | NOT NULL | trace xuyên module |
| source_app | VARCHAR(20) | NOT NULL | WEB / MOBILE / SYSTEM / API |
| version_no | BIGINT | NOT NULL DEFAULT 0 | optimistic lock |
| created_by | UUID | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique khuyến nghị:**
- unique(`work_id`)
- unique(`source_module`,`source_type`,`source_ref_id`,`source_ref_line_id`,`work_type`) cho create trigger idempotent

### 8.3.2 `we_work_line`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| work_header_id | UUID | FK NOT NULL | -> `we_work_header` |
| line_num | INT | NOT NULL | sequence trong header |
| step_type | VARCHAR(30) | NOT NULL | PUT / PICK / MOVE / TRANSFER_PICK / TRANSFER_PUT |
| status | VARCHAR(20) | NOT NULL | OPEN / IN_PROGRESS / COMPLETED / SKIPPED / CANCELLED |
| item_id | UUID | NOT NULL | |
| owner_id | UUID | NOT NULL | |
| from_warehouse_id | UUID | NULL | |
| from_location_id | UUID | NULL | |
| to_warehouse_id | UUID | NULL | |
| to_location_id | UUID | NULL | có thể NULL lúc tạo cho putaway |
| expected_qty | NUMERIC(18,3) | NOT NULL | |
| actual_qty | NUMERIC(18,3) | NULL | set lúc complete |
| variance_qty | NUMERIC(18,3) | NULL | actual - expected |
| uom | VARCHAR(10) | NOT NULL | |
| inventory_status_from | VARCHAR(20) | NULL | optional |
| inventory_status_to | VARCHAR(20) | NULL | optional |
| scanned_location_code | VARCHAR(50) | NULL | raw QR value |
| scanned_location_id | UUID | NULL | normalized location |
| reason_code | VARCHAR(50) | NULL | skip/variance/override reason |
| evidence_text | TEXT | NULL | manager override evidence |
| started_at | TIMESTAMP | NULL | |
| completed_at | TIMESTAMP | NULL | |
| completed_by | UUID | NULL | |
| posting_status | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' | PENDING / POSTED / FAILED |
| posting_ref_type | VARCHAR(30) | NULL | MOVE / TRANSFER_SHIP / TRANSFER_RECEIVE |
| posting_ref_id | VARCHAR(50) | NULL | invent trans / group id |
| posting_error_code | VARCHAR(50) | NULL | |
| posting_error_message | TEXT | NULL | |
| external_id | VARCHAR(120) | NULL | command idempotency for completion |
| version_no | BIGINT | NOT NULL DEFAULT 0 | optimistic lock |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique khuyến nghị:**
- unique(`work_header_id`,`line_num`)
- unique(`external_id`) WHERE external_id IS NOT NULL

### 8.3.3 `we_work_assignment_history`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| work_header_id | UUID | FK NOT NULL | |
| action_type | VARCHAR(20) | NOT NULL | CLAIM / RELEASE / REASSIGN |
| from_user_id | UUID | NULL | |
| to_user_id | UUID | NULL | |
| reason_code | VARCHAR(50) | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

### 8.3.4 `we_work_status_history`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| object_type | VARCHAR(20) | NOT NULL | HEADER / LINE |
| object_id | UUID | NOT NULL | |
| from_status | VARCHAR(20) | NULL | |
| to_status | VARCHAR(20) | NOT NULL | |
| trigger_action | VARCHAR(30) | NOT NULL | CREATE / CLAIM / START / COMPLETE / SKIP / CANCEL / OVERRIDE |
| reason_code | VARCHAR(50) | NULL | |
| remark | TEXT | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

### 8.3.5 `we_work_posting_link`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| work_line_id | UUID | UNIQUE NOT NULL | 1 line -> 1 posting link chính |
| posting_module | VARCHAR(20) | NOT NULL DEFAULT 'M3' | |
| posting_request_type | VARCHAR(30) | NOT NULL | MOVE / TRANSFER_SHIP / TRANSFER_RECEIVE |
| posting_ref_id | VARCHAR(50) | NULL | trans/group id từ M3 |
| posting_status | VARCHAR(20) | NOT NULL | PENDING / SUCCESS / FAILED |
| posted_at | TIMESTAMP | NULL | |
| error_code | VARCHAR(50) | NULL | |
| error_message | TEXT | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 8.3.6 `we_work_event_log`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| work_header_id | UUID | FK NULL | |
| work_line_id | UUID | FK NULL | |
| event_type | VARCHAR(40) | NOT NULL | WORK_CREATED / CLAIMED / LINE_COMPLETED / SYNC_DUPLICATE ... |
| event_payload | JSONB | NOT NULL | raw/audit-friendly payload |
| correlation_id | UUID | NOT NULL | |
| source_app | VARCHAR(20) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

### 8.3.7 `we_work_exception`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| work_header_id | UUID | FK NULL | |
| work_line_id | UUID | FK NULL | |
| exception_type | VARCHAR(30) | NOT NULL | SHORT_PICK / LOCATION_MISMATCH / ITEM_NOT_FOUND / SYNC_CONFLICT |
| severity | VARCHAR(20) | NOT NULL | INFO / WARN / BLOCKER |
| status | VARCHAR(20) | NOT NULL | OPEN / RESOLVED / CLOSED |
| reason_code | VARCHAR(50) | NULL | |
| detail_text | TEXT | NULL | |
| resolution_text | TEXT | NULL | |
| resolved_by | UUID | NULL | |
| resolved_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

### 8.3.8 `we_mobile_sync_batch`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| batch_no | VARCHAR(40) | UNIQUE NOT NULL | business-readable nếu cần |
| device_id | VARCHAR(80) | NOT NULL | |
| user_id | UUID | NOT NULL | |
| sync_status | VARCHAR(20) | NOT NULL | RECEIVED / PROCESSING / PARTIAL / SUCCESS / FAILED |
| event_count | INT | NOT NULL | |
| success_count | INT | NOT NULL DEFAULT 0 | |
| duplicate_count | INT | NOT NULL DEFAULT 0 | |
| conflict_count | INT | NOT NULL DEFAULT 0 | |
| correlation_id | UUID | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| processed_at | TIMESTAMP | NULL | |

### 8.3.9 `we_mobile_sync_event`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| sync_batch_id | UUID | FK NOT NULL | |
| external_id | VARCHAR(120) | NOT NULL | idempotency key từ mobile |
| device_sequence_no | BIGINT | NOT NULL | |
| event_type | VARCHAR(30) | NOT NULL | START_LINE / COMPLETE_LINE / SKIP_LINE |
| work_id | VARCHAR(40) | NOT NULL | |
| work_line_id | UUID | NULL | |
| event_payload | JSONB | NOT NULL | |
| processing_result | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' | SUCCESS / DUPLICATE / CONFLICT / REJECTED |
| result_message | TEXT | NULL | |
| processed_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Unique khuyến nghị:**
- unique(`external_id`)
- index(`device_id`,`device_sequence_no`) nếu bổ sung `device_id` vào bảng event

### 8.3.10 `we_work_outbox_event`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| aggregate_type | VARCHAR(30) | NOT NULL | WORK |
| aggregate_id | UUID | NOT NULL | header hoặc line id |
| event_type | VARCHAR(40) | NOT NULL | PUTAWAY_COMPLETED / PICK_COMPLETED / CALLBACK_RETRY |
| target_module | VARCHAR(20) | NOT NULL | M4 / M5 / M6 / REPORTING |
| payload | JSONB | NOT NULL | |
| delivery_status | VARCHAR(20) | NOT NULL | PENDING / SENT / FAILED / DEAD |
| retry_count | INT | NOT NULL DEFAULT 0 | |
| next_retry_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| sent_at | TIMESTAMP | NULL | |

## 8.4 Partitioning, indexing và scale strategy

### 8.4.1 Partitioning

- `we_work_header`: chưa cần partition Phase 1 nếu volume vừa phải.
- `we_work_event_log`: nên chuẩn bị partition theo tháng nếu log nhiều.
- `we_mobile_sync_event`: nên chuẩn bị partition theo tháng hoặc theo `created_at` vì tăng rất nhanh.
- `we_work_outbox_event`: có thể giữ 1 bảng, archive theo kỳ.

### 8.4.2 Index trọng yếu

- `we_work_header(status, warehouse_id, work_type, priority_no, created_at)` cho mobile list
- `we_work_header(assigned_to, status, warehouse_id)` cho “my works”
- `we_work_header(source_module, source_ref_id, work_type)` cho idempotent trigger lookup
- `we_work_line(work_header_id, status, line_num)`
- `we_work_line(scanned_location_id)` nếu cần truy điều tra
- `we_work_exception(status, exception_type, created_at)`
- `we_mobile_sync_event(external_id)`
- `we_work_outbox_event(delivery_status, next_retry_at)`

### 8.4.3 Cache strategy

- Cache ngắn hạn cho `GET /mobile/works/available` theo warehouse + role.
- Không cache command result trừ idempotency lookup.
- Dùng Redis cho hot dedupe, nhưng **DB unique constraint vẫn là nguồn chốt cuối**.

---

## 9. State machine catalog cho Module 7

## 9.1 Work Header

`OPEN -> IN_PROGRESS -> COMPLETED`  
`OPEN -> CANCELLED`  
`IN_PROGRESS -> CANCELLED` *(manager only, có reason)*

### Rule

- Claim không đổi trạng thái.
- Release claim không đổi trạng thái.
- Header chỉ `COMPLETED` khi toàn bộ lines ở terminal state hợp lệ (`COMPLETED` hoặc `SKIPPED` theo rule).
- Header `COMPLETED` và `CANCELLED` là terminal.

## 9.2 Work Line

`OPEN -> IN_PROGRESS -> COMPLETED`  
`OPEN -> IN_PROGRESS -> SKIPPED` *(manager or policy-driven)*  
`OPEN/IN_PROGRESS -> CANCELLED` *(chỉ khi header cancel hoặc policy cho phép)*

### Rule

- Không cho `OPEN -> COMPLETED` trực tiếp.
- Không cho `COMPLETED -> bất kỳ trạng thái khác`.
- `SKIPPED` là terminal trong Phase 1.
- Complete line chỉ hợp lệ khi posting thành công hoặc được commit trong cùng transaction nội bộ với posting service.

## 9.3 Work exception lifecycle

`OPEN -> RESOLVED -> CLOSED`

- `SHORT_PICK > threshold` tạo exception blocker.
- `LOCATION_MISMATCH` có thể resolve bằng scan đúng hoặc manager override.
- `SYNC_CONFLICT` phải do manager hoặc recovery flow xử lý.

---

## 10. Luồng xử lý chuẩn: database → backend → posting

## 10.1 Luồng chuẩn cho command side-effect

1. Controller nhận request.
2. Guard kiểm tra auth, permission, idempotency cơ bản.
3. Service mở transaction DB.
4. Lock bản ghi header/line liên quan.
5. Validate state + ownership + location + source rules.
6. Ghi update runtime (`assigned_to`, `status`, `actual_qty`, ...).
7. Ghi status history / event log / exception log nếu có.
8. Nếu là complete line -> gọi posting service nội bộ sang M3.
9. Nếu posting success -> set `posting_status=POSTED`, mark line completed.
10. Nếu mọi line xong -> mark header completed.
11. Ghi outbox callback cho module nguồn.
12. Commit transaction.
13. Job worker gửi outbox callback bất đồng bộ.

### Tại sao phải tách như vậy

- Tránh trạng thái “line completed nhưng chưa có inventory effect”.
- Tránh callback fail làm rollback movement inventory đã đúng.
- Dễ retry callback mà không duplicate posting.

## 10.2 Luồng query chuẩn

- Query list/detail không nên join thẳng vào `invent_trans` mọi lúc.
- Detail work lấy từ `we_work_header`, `we_work_line`, `we_work_exception`, `we_work_posting_link`, `we_work_status_history`.
- Nếu cần posting detail sâu thì gọi query service của M3 bằng `posting_ref_id`.

---

## 11. Database → backend flow chi tiết theo từng nghiệp vụ

## 11.1 Tạo work từ trigger nguồn

### Bước nghiệp vụ

- M4/M5/M6 phát trigger nội bộ `CreateWork`.
- M7 kiểm tra đã tồn tại work cho source_ref + work_type chưa.
- Nếu chưa có thì tạo header + lines + history + event log.

### DB tác động

- insert `we_work_header`
- insert `we_work_line`
- insert `we_work_status_history` (CREATE -> OPEN)
- insert `we_work_event_log`

### Lưu ý build

- Phải idempotent theo source reference.
- Không tạo work nếu source document chưa ở state trigger hợp lệ.

## 11.2 Claim work

### Bước nghiệp vụ

- Keeper gọi claim.
- Hệ thống lock header, kiểm tra `assigned_to is null`, `status=OPEN`.
- Ghi assigned_to, assigned_at và assignment history.

### DB tác động

- update `we_work_header`
- insert `we_work_assignment_history`
- insert `we_work_event_log`

### Lưu ý build

- Nếu hai người claim cùng lúc, chỉ một người thắng nhờ row lock hoặc optimistic+retry.

## 11.3 Release claim

### Bước nghiệp vụ

- Chỉ người đã claim hoặc manager mới được release theo policy.
- Chỉ release khi header chưa `IN_PROGRESS` quá sâu hoặc chưa có line completed theo policy nội bộ.

### DB tác động

- update `we_work_header.assigned_to = null`
- insert history / event log

### Lưu ý build

- Nếu đã có line completed, release không còn là use case bình thường; manager cần xử lý rõ policy.

## 11.4 Start work header

### Bước nghiệp vụ

- Kiểm tra đã claim.
- Chuyển header `OPEN -> IN_PROGRESS`.

### DB tác động

- update `we_work_header.status`, `started_at`
- insert `we_work_status_history`
- insert event log

### Lưu ý build

- Không cho start nếu chưa có assignee.

## 11.5 Start work line

### Bước nghiệp vụ

- Kiểm tra header `IN_PROGRESS`.
- Kiểm tra line `OPEN`.
- Đổi line sang `IN_PROGRESS`.

### DB tác động

- update `we_work_line.status`, `started_at`
- insert status history, event log

### Lưu ý build

- Có thể auto-start line khi complete nếu muốn đơn giản hóa mobile UX, nhưng vẫn nên lưu trạng thái logic rõ ràng.

## 11.6 Complete putaway line

### Bước nghiệp vụ

- Keeper scan destination QR.
- Backend validate location thuộc đúng warehouse và `location_type=STORAGE`.
- Nhận `actual_qty`.
- Tạo posting request `MOVE RECEIVING -> STORAGE` sang M3.
- Nếu success -> line completed, posting link success, callback M4.

### DB tác động

- update `we_work_line.actual_qty`, `scanned_location_id`, `variance_qty`
- insert/update `we_work_posting_link`
- update `we_work_line.status = COMPLETED`
- nếu all lines done -> update `we_work_header.status = COMPLETED`
- insert outbox `PUTAWAY_COMPLETED`

### Lưu ý build

- `to_location_id` có thể được set chính thức tại thời điểm complete.
- Không callback M4 inline trong transaction.

## 11.7 Complete pick line

### Bước nghiệp vụ

- Keeper scan source location.
- Validate khớp allocation/source location.
- Nhập `actual_qty`.
- Tạo posting request `MOVE STORAGE -> STAGING` sang M3.
- Nếu success -> line completed, callback M5.

### DB tác động

- tương tự putaway, nhưng posting type là `MOVE` với source = STORAGE, dest = STAGING

### Lưu ý build

- Không release hold/reserved của M5 ở đây.

## 11.8 Complete move line

### Bước nghiệp vụ

- Validate source/destination theo move request của M6.
- Tạo posting request `MOVE source -> destination`.
- Callback M6 cập nhật move order.

### DB tác động

- update line / posting link / outbox

### Lưu ý build

- Nếu M6 document ở `WORK_BASED`, callback bắt buộc để M6 tiến state.

## 11.9 Complete transfer pick line

### Bước nghiệp vụ

- Source warehouse keeper pick hàng ra staging.
- M3 post `TRANSFER_SHIP`.
- M6 transfer order chuyển `RELEASED -> IN_TRANSIT`.

### DB tác động

- update line / posting link / outbox callback `TRANSFER_PICK_COMPLETED`

### Lưu ý build

- Không tạo transfer put work ở đây nếu luồng business chưa đến destination ready event; việc đó theo M6.

## 11.10 Complete transfer put line

### Bước nghiệp vụ

- Destination warehouse keeper put hàng từ receiving vào storage.
- M3 post `TRANSFER_RECEIVE`.
- M6 transfer order tiến `IN_TRANSIT -> RECEIVED/CLOSED` tùy rule.

### DB tác động

- update line / posting link / outbox callback `TRANSFER_PUT_COMPLETED`

### Lưu ý build

- Destination location có thể được chọn tại runtime tương tự putaway.

## 11.11 Manager override complete

### Bước nghiệp vụ

- Manager nhập `actual_qty`, `reason_code`, `evidence`.
- Backend validate quyền và bắt buộc field.
- Tiếp tục flow complete line như bình thường, chỉ khác nguồn xác nhận là manager override.

### DB tác động

- update line fields
- insert exception resolution / event log / audit context mạnh hơn
- posting link + outbox như complete bình thường

### Lưu ý build

- Tuyệt đối không có nhánh “mark completed without posting”.

## 11.12 Mobile sync batch

### Bước nghiệp vụ

- App gửi 1 batch nhiều events.
- Backend tạo batch record.
- Xử lý từng event theo thứ tự sequence.
- Mỗi event ra một kết quả: success / duplicate / conflict / rejected.

### DB tác động

- insert `we_mobile_sync_batch`
- insert `we_mobile_sync_event`
- gọi command services tương ứng
- update result từng event và tổng batch

### Lưu ý build

- Không rollback cả batch chỉ vì một event fail.
- Partial success là bình thường.

---

## 12. Thiết kế service layer chi tiết

## 12.1 `work-generation.service.ts`

- Nhận trigger từ M4/M5/M6.
- Resolve work template theo work type.
- Idempotent create theo source ref.
- Tạo header + lines.

## 12.2 `work-state-machine.service.ts`

- Chứa toàn bộ rule transition header/line.
- Export hàm `assertCanClaim`, `assertCanStart`, `assertCanComplete`, `assertCanCancel`, `assertCanSkip`.
- Không cho controller tự viết status.

## 12.3 `work-execution.service.ts`

- Orchestrate start line, complete line, skip line.
- Gọi validation policy.
- Gọi posting service khi complete.

## 12.4 `work-posting.service.ts`

- Map work line sang posting request M3.
- Gọi inventory adapter.
- Persist posting link.
- Bọc error kỹ để distinguish `VALIDATION_FAIL` và `POSTING_TECH_FAIL`.

## 12.5 `work-sync.service.ts`

- Nhận batch sync.
- Parse event.
- Check duplicate theo `external_id`.
- Dispatch event tới command service tương ứng.
- Tổng hợp response per event.

## 12.6 `work-callback.service.ts`

- Build payload callback cho M4/M5/M6.
- Ghi outbox event.
- Job gửi retry.

## 12.7 `work-recovery.service.ts`

- Retry callback failed.
- Mark stale work.
- Resolve sync conflict hỗ trợ manager.
- Report line posting failed cần can thiệp.

## 12.8 `work-sla.service.ts`

- Tính SLA based on `created_at`, `started_at`, `completed_at`.
- Feed dashboard và alert job.

---

## 13. Thiết kế API tổng thể cho Module 7

## 13.1 Nhóm API Query

- `GET /api/v1/works`
- `GET /api/v1/works/:workId`
- `GET /api/v1/mobile/works/available`
- `GET /api/v1/mobile/works/my`
- `GET /api/v1/works/:workId/history`
- `GET /api/v1/works/:workId/exceptions`
- `GET /api/v1/works/dashboard/summary`

## 13.2 Nhóm API Command cơ bản

- `POST /api/v1/works/:workId/claim`
- `POST /api/v1/works/:workId/release`
- `POST /api/v1/works/:workId/start`
- `POST /api/v1/works/:workId/cancel`

## 13.3 Nhóm API Line execution

- `POST /api/v1/works/:workId/lines/:lineNum/start`
- `POST /api/v1/works/:workId/lines/:lineNum/complete`
- `POST /api/v1/works/:workId/lines/:lineNum/skip`
- `POST /api/v1/works/:workId/manager-override-complete`

## 13.4 Nhóm API Mobile utility

- `POST /api/v1/mobile/scan/validate`
- `POST /api/v1/mobile/works/sync`

---

## 14. Phân tích kỹ từng API: mục đích, input, validate, hướng build

## 14.1 `GET /api/v1/works`

### Mục đích
List work cho web dashboard hoặc supervisor view.

### Filter chính
- warehouse_id
- status
- work_type
- assigned_to
- created_from / created_to
- priority range

### Hướng build
- Query trực tiếp `we_work_header` + summary count line.
- Dùng pagination chuẩn.
- Không join nặng vào event log mặc định.

## 14.2 `GET /api/v1/works/:workId`

### Mục đích
Lấy detail header + lines + posting summary + exception summary.

### Hướng build
- Query `we_work_header`, `we_work_line`, latest exceptions, posting links.
- Có thể lazy-load history riêng.

## 14.3 `POST /api/v1/works/:workId/claim`

### Mục đích
Cho keeper tự claim work.

### Input chính
- `external_id`

### Validate
- work tồn tại
- status = `OPEN`
- `assigned_to` đang null
- user có quyền và đúng warehouse scope

### Side effect
- set `assigned_to`, `assigned_at`
- insert assignment history

### Hướng build
- Row lock trên header.
- Return 409 nếu đã có người claim trước.

## 14.4 `POST /api/v1/works/:workId/release`

### Mục đích
Trả work đã claim về pool claimable.

### Validate
- current user là assignee hoặc manager
- work chưa terminal
- policy cho phép release

### Hướng build
- update `assigned_to = null`
- ghi assignment history

## 14.5 `POST /api/v1/works/:workId/start`

### Mục đích
Bắt đầu thực thi header.

### Input chính
- `external_id`

### Validate
- work đã claim
- status = `OPEN`

### Side effect
- `OPEN -> IN_PROGRESS`

### Hướng build
- Chỉ update header.
- Không auto-start line ở API này.

## 14.6 `POST /api/v1/works/:workId/cancel`

### Mục đích
Hủy work.

### Input chính
- `external_id`
- `reason_code`
- `remark` (optional)

### Validate
- role đủ quyền
- state hợp lệ cho cancel
- nếu `IN_PROGRESS` thì manager-only

### Side effect
- header -> `CANCELLED`
- open lines -> `CANCELLED`
- history + event log + audit

### Hướng build
- Không cho cancel nếu đã có line completed trừ khi policy rất rõ và có reverse flow riêng.

## 14.7 `POST /api/v1/works/:workId/lines/:lineNum/start`

### Mục đích
Bắt đầu 1 line.

### Validate
- header = `IN_PROGRESS`
- line = `OPEN`
- current assignee hợp lệ

### Hướng build
- update line status và `started_at`.

## 14.8 `POST /api/v1/works/:workId/lines/:lineNum/complete`

### Mục đích
Hoàn tất 1 line và tạo inventory effect tương ứng.

### Input chính
- `external_id`
- `actual_qty`
- `scanned_location_code`
- `device_event_time` *(optional nhưng nên có cho mobile)*

### Validate
- line đang `IN_PROGRESS`
- actual_qty > 0
- scan location hợp lệ theo work type
- source/destination rules hợp lệ
- user đúng assignee hoặc manager theo policy
- short pick/location mismatch rule được xử lý đúng

### Side effect
- cập nhật line actual/variance/scan
- gọi posting sang M3
- success -> line `COMPLETED`
- nếu all lines xong -> header `COMPLETED`
- tạo outbox callback

### Hướng build
- Đây là API quan trọng nhất, phải test kỹ nhất.
- Transaction DB phải ôm toàn bộ line update + posting link + header update.
- Callback/handoff dùng outbox sau commit.

## 14.9 `POST /api/v1/works/:workId/lines/:lineNum/skip`

### Mục đích
Bỏ qua line do ngoại lệ.

### Input chính
- `external_id`
- `reason_code`
- `remark`

### Validate
- manager quyền hợp lệ
- line chưa terminal

### Side effect
- line -> `SKIPPED`
- tạo exception nếu cần
- header có thể complete nếu các line còn lại đã terminal

### Hướng build
- Không gọi posting.
- Ghi rõ vì sao line bị skip.

## 14.10 `POST /api/v1/works/:workId/manager-override-complete`

### Mục đích
Manager complete khi keeper không thể hoàn tất normal path nhưng thực tế đã xác minh.

### Input chính
- `line_num`
- `external_id`
- `actual_qty`
- `reason_code`
- `evidence_text`
- `scanned_location_code` *(nếu có)*

### Validate
- manager role
- actual_qty bắt buộc
- reason_code bắt buộc
- evidence_text bắt buộc

### Side effect
- gọi chung flow complete line nhưng source là override

### Hướng build
- Không tách logic posting riêng; reuse `completeLine()` để tránh lệch.

## 14.11 `GET /api/v1/mobile/works/available`

### Mục đích
Danh sách work có thể claim cho mobile.

### Filter chính
- warehouse_id
- work_type
- priority

### Hướng build
- Query index tối ưu theo `status=OPEN and assigned_to is null`.
- Return payload nhẹ, tránh gửi full history.

## 14.12 `GET /api/v1/mobile/works/my`

### Mục đích
Danh sách work đã claim của user.

### Hướng build
- Query theo `assigned_to = current_user`.
- Có thể chia tab `OPEN`, `IN_PROGRESS`, `Recently Completed`.

## 14.13 `POST /api/v1/mobile/scan/validate`

### Mục đích
Validate QR trước khi complete, cho UX mượt hơn.

### Input chính
- `work_id`
- `line_num`
- `scanned_location_code`

### Validate
- location tồn tại
- thuộc đúng warehouse
- hợp với expected source/destination logic

### Hướng build
- API pure validation, không side-effect.
- Có thể dùng cả online pre-check và debug support.

## 14.14 `POST /api/v1/mobile/works/sync`

### Mục đích
Nhận batch offline events từ mobile.

### Input chính
- `batch_external_id`
- `device_id`
- `events[]`

### Validate
- batch không rỗng
- mỗi event có `external_id`, `event_type`, `work_id`
- user/device hợp lệ

### Side effect
- lưu batch
- xử lý từng event
- trả kết quả per event

### Hướng build
- Không rollback all-or-nothing.
- Response nên có dạng:
  - `SUCCESS`
  - `DUPLICATE`
  - `CONFLICT`
  - `REJECTED`

## 14.15 `GET /api/v1/works/:workId/history`

### Mục đích
Xem timeline status/event đầy đủ cho audit và support.

### Hướng build
- Ghép từ status history + event log + exception log.

## 14.16 `GET /api/v1/works/:workId/exceptions`

### Mục đích
Xem tất cả exception gắn với work.

### Hướng build
- Query `we_work_exception` theo header/lines.

## 14.17 `GET /api/v1/works/dashboard/summary`

### Mục đích
Dashboard count, SLA, overdue, exception summary.

### Hướng build
- Có thể dùng materialized query nhẹ hoặc aggregate SQL chuẩn.

---

## 15. Contract pattern chuẩn cho mọi command API

### Quy tắc bắt buộc

- Body command nên chứa tối thiểu:
  - `external_id`
  - `correlation_id` *(nếu client có; nếu không server sinh)*
  - `source_app`
- Response nên trả:
  - `request_status`
  - `business_status`
  - `object_id`
  - `object_status`
  - `idempotency_replay` = true/false
- Error response nên có:
  - `error_code`
  - `error_message`
  - `retryable` = true/false

---

## 16. Validation matrix bắt buộc

## 16.1 Validation chung cho mọi command

- Object tồn tại
- Không terminal nếu action không cho phép
- User đúng warehouse / owner scope
- `external_id` hợp lệ
- Payload numeric hợp lệ
- Request không stale theo `version_no` nếu dùng optimistic

## 16.2 Validation riêng theo use case

### Claim
- Header `OPEN`
- `assigned_to` đang null

### Start header
- Header `OPEN`
- Đã claim

### Start line
- Header `IN_PROGRESS`
- Line `OPEN`

### Complete line
- Line `IN_PROGRESS`
- `actual_qty > 0`
- location scan hợp lệ
- rule short pick/location mismatch được áp đúng

### Skip line
- Role manager
- line chưa terminal
- reason bắt buộc

### Cancel work
- Role phù hợp
- state hợp lệ
- chưa có posting irreversible

### Sync batch
- Device/user hợp lệ
- Event type hỗ trợ offline

---

## 17. Exception engine và business formula cần build

## 17.1 Short pick

### Công thức cơ bản

- `variance_qty = actual_qty - expected_qty`
- `variance_pct = abs(variance_qty) / expected_qty * 100`

### Baseline Phase 1 khuyến nghị

- `<= 2%` -> allow complete + log variance
- `> 2% và <= 5%` -> allow hoặc pending manager theo rule chốt nội bộ, nhưng phải log exception
- `> 5%` -> block complete thường, yêu cầu manager intervention

### Hướng build

- Đừng hard-code sâu trong controller.
- Đưa threshold vào config/policy service để sau này mở cấu hình dễ hơn.

## 17.2 Location mismatch

### Rule

- Scan sai location -> block normal complete
- Manager có thể override với reason + evidence

### Hướng build

- Tách `scan validate` và `complete` để UX mobile rõ hơn.

## 17.3 Item not found

### Rule

- Không có item thực tế tại source -> log exception, line `SKIPPED`, flag cycle count nếu cần

### Hướng build

- Không tự auto-reallocate ở M7 nếu logic đó thuộc M5/M6.
- Chỉ phát callback/exception event cho module nguồn.

---

## 18. Offline sync, idempotency và concurrency control

## 18.1 Idempotency

- Create work: unique theo source ref + work type
- Claim/start/complete/skip/cancel: unique theo `external_id`
- Sync event: unique theo event `external_id`
- Luôn kiểm lại bằng DB unique constraint, không chỉ Redis

## 18.2 Optimistic locking

- Dùng `version_no` cho header/line nếu muốn phản hồi rõ stale update.
- Với claim/complete, nên kết hợp row lock để dễ xử lý hơn.

## 18.3 Row locking / concurrency

### Khuyến nghị

- Claim: `SELECT ... FOR UPDATE` trên `we_work_header`
- Complete line: lock line và header cùng transaction
- Sync event processing: lock target line khi dispatch event

## 18.4 Recovery cases bắt buộc

1. Claim thành công nhưng response fail -> retry trả kết quả cũ theo idempotency.
2. Line update xong nhưng posting fail -> rollback transaction, line không được đánh completed.
3. Posting success nhưng callback M4/M5/M6 fail -> giữ outbox `FAILED`, retry sau.
4. Mobile gửi duplicate event -> trả `DUPLICATE`, không tạo side-effect mới.
5. Mobile gửi event out-of-order -> trả `CONFLICT` hoặc `REJECTED` tùy policy.
6. Work bị treo `IN_PROGRESS` quá lâu -> job đánh dấu alert cho supervisor, không auto-complete.

---

## 19. Error code baseline đề xuất

- `WE-404-001` Work not found
- `WE-404-002` Work line not found
- `WE-409-001` Work already claimed
- `WE-409-002` Invalid state transition
- `WE-409-003` Work already completed
- `WE-409-004` Duplicate external_id
- `WE-422-001` Invalid scanned location
- `WE-422-002` Location type not allowed
- `WE-422-003` Actual quantity invalid
- `WE-422-004` Short pick threshold exceeded
- `WE-422-005` Manager evidence required
- `WE-423-001` Work locked by another action
- `WE-500-001` Inventory posting failed
- `WE-500-002` Callback delivery failed
- `WE-500-003` Sync batch processing failed

---

## 20. UAT và test cases bắt buộc cho dev/QA

## 20.1 Work generation

- Receipt `RECEIVED` tạo đúng 1 putaway work
- Shipment `ALLOCATED` tạo đúng pick work
- Trigger lặp lại không tạo duplicate work

## 20.2 Claim / release / start

- Hai keeper claim đồng thời -> chỉ 1 người thành công
- Claim không đổi status
- Start khi chưa claim -> fail

## 20.3 Complete line

- Putaway complete tạo `MOVE RECEIVING -> STORAGE`
- Pick complete tạo `MOVE STORAGE -> STAGING`
- Manager override complete bắt buộc evidence
- Duplicate complete request không tạo thêm posting

## 20.4 Exception

- Short pick trong threshold cho phép
- Short pick vượt threshold bị block
- Location mismatch yêu cầu scan lại hoặc override
- Item not found -> skip + exception

## 20.5 Offline sync

- Batch có 3 events, 1 duplicate, 1 success, 1 conflict
- Late sync sau khi line đã online-complete -> duplicate/conflict đúng
- Partial success response đúng format

## 20.6 Callback / recovery

- Work complete nhưng callback M5 fail -> retry job gửi lại thành công
- Posting fail -> line không completed
- Stale in-progress work xuất hiện trên dashboard overdue

---

## 21. Khuyến nghị implementation theo sprint

### Sprint 1 — Core data model + query
- Bảng header/line/history/event
- Query list/detail
- Create work từ trigger nội bộ

### Sprint 2 — Claim/start/complete core
- Claim/release/start
- Complete putaway/pick/move
- Posting adapter sang M3

### Sprint 3 — Exception + dashboard
- Skip/cancel/manager override
- Exception log
- Dashboard summary + SLA

### Sprint 4 — Offline sync + recovery
- Mobile sync batch
- Duplicate/conflict handling
- Callback outbox + retry jobs

### Sprint 5 — Hardening
- Concurrency tests
- Performance tuning
- Archive/index/log cleanup
- UAT bug fix

---

## 22. Checklist hoàn thiện cho dev intern

- Đã hiểu rõ M7 không sở hữu receipt/shipment business state chưa?
- Đã tách controller/service/repository/policy chưa?
- Đã bảo đảm `1 completed line = 1 posting request` chưa?
- Đã dùng idempotency cho mọi command chưa?
- Đã dùng outbox cho callback thay vì gọi inline chưa?
- Đã có history/event/exception log chưa?
- Đã có test duplicate claim và duplicate complete chưa?
- Đã có sync batch partial success test chưa?
- Đã có rule chặn complete khi scan sai location chưa?
- Đã có audit bắt buộc cho manager override chưa?

---

## 23. Kết luận kỹ thuật

Module 7 là **lớp tác nghiệp hiện trường** của SWM. Nếu M3 là transaction truth, M4/M5/M6 là owner của business document, thì M7 là nơi biến “việc cần làm” thành “việc đã thực hiện xong có thể truy vết, audit và post inventory đúng cách”.

Thiết kế kỹ thuật tốt cho M7 phải đạt 5 điều:

1. **Atomic ở level work line** để không lệch inventory effect.
2. **Idempotent ở level command và sync event** để mobile/offline không sinh duplicate.
3. **Tách ownership rõ với M4/M5/M6/M3** để không double-post hoặc double-state-change.
4. **Audit và exception-first** vì đây là vùng phát sinh tranh chấp thực địa nhiều nhất.
5. **Scale tốt cho mobile** bằng index đúng, outbox đúng và sync model đơn giản nhưng chắc chắn.

Nếu team dev bám đúng tài liệu này, dev intern vẫn có thể triển khai Module 7 theo hướng sạch, đúng ranh giới và đủ vững để mở rộng lên directed assignment, replenishment, wave và barcode ở phase sau mà không phải đập lại kiến trúc.

---

## 24. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn dựa trên:

- Module 7 spec enriched/additive
- Overview toàn hệ thống SWM
- Module 1 spec + techstack
- Module 2 spec + techstack
- Module 3 spec + techstack
- Module 4 spec + techstack
- Module 5 spec + techstack
- Module 6 spec + techstack

Mục tiêu của bản techstack này là làm tài liệu build-ready cho backend dev, mobile dev và QA, không thay thế hoàn toàn API contract chi tiết, sequence diagram hoặc ADR nếu team muốn đào sâu hơn ở giai đoạn implementation.
