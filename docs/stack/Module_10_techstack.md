# TVL SWM — Module 10 Tech Stack & Backend Design
# Billing & Commercial Control

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-09  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Billing Team, Integration Team, Ops  
**Mục tiêu:** Chuyển hóa Module 10 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, batch jobs, charge engine, reconciliation, ERP push handoff và mapping chuẩn với Modules 1–9.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 10 — Billing & Commercial Control** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 10 thực chất phải build những gì ở Phase 1.
- Luồng chuẩn từ **database → repository → service → charge engine → debit note workflow → ERP push handoff** nên tổ chức ra sao.
- Vì sao Module 10 là **commercial orchestration layer**, không phải inventory ledger engine và cũng không phải integration engine.
- Thiết kế database nào vừa đúng go-live Phase 1 vừa sạch để scale cho credit note, multi-currency, advanced contract pricing, reporting và AR integration ở phase sau.
- Từng API của Module 10 dùng để làm gì, validate gì, side effect gì, idempotency ra sao và nên build theo pattern nào.
- Cách Module 10 ánh xạ với **Module 1 → Module 9** và ranh giới ownership cần giữ thật chặt.
- Cách build technical recovery để duplicate event, snapshot fail, rate missing, DN lock fail, ERP push fail, re-generate DN và late event không làm lệch doanh thu hoặc phá audit trail.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- Module 10 gồm: **Rate Card & Contract Setup, Billing Event Capture, Daily Storage Snapshot, Charge Calculation Engine, Debit Note Management, Billing Exception & Reconciliation, ERP One-Way Push via M8**.
- Billing chỉ đáng tin khi dựa trên **transaction truth và snapshot đúng**; Billing không được suy diễn bằng cách đọc chứng từ theo kiểu “gần đúng”.
- Billing event handling phải đến từ **M4 / M5 / M9 domain events**; storage là ngoại lệ do M10 tự sinh từ snapshot EOD.  
- **Storage fee = opening + inbound; không trừ outbound trong ngày**.  
- **Debit Note LOCKED là immutable** và ERP push là **one-way, idempotent**.  
- **Credit Note** và **multi-currency** là out-of-scope của Phase 1.  
- Mọi API side effect phải **idempotent qua `external_id`** và mọi bước quan trọng phải có **audit + calculation trace**.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 28 kết luận kỹ thuật quan trọng cho Module 10:

1. **Module 10 là commercial orchestration layer của SWM**, không phải inventory truth engine.
2. **Debit Note** là object thương mại chính của M10; nó không sở hữu inventory, receipt, shipment hay work.
3. **Billing event** là object runtime rất quan trọng; đây là cầu nối giữa warehouse operations và revenue.
4. **Billing không được suy diễn từ raw documents**; handling/bagging phải đi từ domain events của M4/M5/M9, còn storage đi từ snapshot EOD của chính M10.
5. **Storage snapshot phải bám transaction truth từ M3**, không được dựng từ số màn hình hoặc document state chưa chốt.
6. **Storage fee dùng công thức đặc thù của TVL:** `opening + inbound`, không trừ outbound cùng ngày.
7. **Free days phải tracking theo lot lineage (`receipt_line_id`)**, không theo aggregate owner/item chung.
8. **Rate card/contract là capability lõi**, không phải màn cấu hình phụ; nếu sai sẽ kéo sai toàn bộ doanh thu.
9. **Contract overlap control là hard rule**, không được để 2 active contracts chồng ngày cho cùng owner.
10. **Charge calculation phải lưu calculation trace đầy đủ**, vì billing là vùng tranh chấp cao.
11. **Debit Note lifecycle phải enforce bằng state machine backend**, không dựa vào việc disable button ở UI.
12. **LOCKED = immutable tuyệt đối**; Phase 1 không reopen DN, không sửa tay charge line đã lock.
13. **ERP push là asynchronous integration problem**, không nên đẩy inline trong transaction lock DN.
14. **ERP push phải idempotent theo DN number hoặc push key**, tránh duplicate voucher bên ERP.
15. **Billing exception là capability thật**, không phải note phụ; cần queue, reason, resolution path và audit.
16. **Rate missing / event missing / orphan snapshot / duplicate event** đều phải có đường rơi về exception queue.
17. **CUST_VIEWER chỉ nên thấy LOCKED DN** trong Phase 1; draft/review là workflow nội bộ.
18. **Module 10 phải tách command model và query/read model**, vì generate/lock là write-heavy còn inquiry/export là read-heavy.
19. **Idempotency là bắt buộc** cho create/update contract, generate DN, review/approve/lock DN, push ERP, rerun snapshot.
20. **DN regenerate phải là operation có kiểm soát**, chỉ được trước LOCKED và phải lưu trace lần tính cũ / mới.
21. **M10 phải scale cho write-heavy ở batch/snapshot/event capture và read-heavy ở inquiry/export**, nên index + background jobs là bắt buộc.
22. **M10 phải reuse Module 1** cho permission, audit, reason code, number sequence và idempotency baseline.
23. **M10 phải reuse Module 2** cho owner/item/warehouse/cargo_form/service/day_type/master semantics.
24. **M10 phụ thuộc trực tiếp vào M3** cho snapshot-safe truth và reconciliation nguồn dữ liệu.
25. **M10 phụ thuộc trực tiếp vào M8** cho ERP push, nhưng M8 không được giữ business ownership của DN.
26. **M10 phải chừa đường cho Phase 2** như credit note, multi-currency, area-based storage, container stuffing fee và ERP 2-way sync, nhưng không được làm phình baseline go-live.
27. **Technical recovery là capability bắt buộc** cho snapshot fail, partial calculate fail, lock success nhưng push fail, duplicate event, out-of-order event, stale exception.
28. **Code structure phải ngăn module khác sửa trực tiếp trạng thái DN hoặc billing event**, mọi transition phải đi qua service/state machine tập trung.

---

## 3. Phạm vi build thực tế của Module 10 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Billing contract create / update / detail / search
2. Contract fee line management
3. Day type calendar management
4. Billing event ingest / capture / dedupe
5. Daily storage snapshot batch job
6. Free-day per lot tracking
7. Charge calculation engine
8. Debit note generate / re-generate / review / approve / lock
9. Debit note line generation + calculation trace
10. Billing exception queue + resolve workflow cơ bản
11. Reconciliation query giữa billing event / snapshot / DN
12. ERP push outbox + handoff sang M8
13. Export DN PDF/Excel và internal export data
14. CUST_VIEWER inquiry cho LOCKED DN theo owner scope
15. Audit trail + exception trail integration với M1
16. Idempotency handling cho mọi command side effect
17. Technical recovery cho event fail / snapshot fail / calculation fail / ERP push fail / duplicate retry
18. Query APIs cho contract, event, snapshot, DN, exception, push status, calculation trace
19. Validation matrix và error code implementation
20. Background jobs: snapshot, exception retry, ERP push retry trigger, stale event detection

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build credit note workflow hoàn chỉnh.
2. Không build AR / payment collection / invoice aging.
3. Không build multi-currency engine.
4. Không build generalized pricing DSL / formula designer.
5. Không build full revenue recognition engine kiểu ERP tài chính.
6. Không build customer self-service portal sâu ngoài inquiry LOCKED DN cơ bản.
7. Không build two-way ERP sync.
8. Không build billing from arbitrary historical recomputation engine ngoài regenerate draft trong kỳ.
9. Không build billing forecast / accrual analytics nâng cao.
10. Không build generic document approval engine đa cấp ngoài DN workflow cụ thể.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** billing event pipeline, snapshot, charge engine, DN lifecycle, exception queue và ERP push handoff.
- **Có build** traceability rất sâu cho rate, multiplier, free-day, source event và source snapshot.
- **Có build** read model cho inquiry, export, exception, push history.
- **Không build** inventory ledger trong Module 10.
- **Không build** raw weighbridge ingestion trong Module 10.
- **Không build** receipt/shipment state machine trong Module 10.
- **Không build** AR/payment module trong Module 10.
- **Không cho phép** bất kỳ API/UI nào update trực tiếp `invent_trans`, `on_hand`, `weighbridge_log` hoặc `debit_note.status` mà không qua service chuẩn.

---

## 4. Khuyến nghị tech stack chính thức cho Module 10

Để đồng bộ với Modules 1–9 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; outbox event cho handoff nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot inquiry / short-lived coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Shared platform services

- **RBAC / permission / audit / number sequence / idempotency:** tái sử dụng từ Module 1
- **Master lookup / semantics validation:** tái sử dụng pattern của Module 2
- **Snapshot truth / OnHand reconciliation / transaction trace:** đọc từ Module 3
- **ERP push adapter:** dùng outbox + M8 integration adapter
- **Reporting hook:** phát read-model friendly data / export tables cho M11 sau này

### 4.4 File / export / document generation

- PDF generation cho Debit Note: khuyến nghị HTML template → PDF renderer
- Excel export: ExcelJS hoặc thư viện tương đương
- Object storage: S3-compatible nếu cần lưu bản PDF snapshot đã generate

### 4.5 Observability

- Structured logging JSON
- Correlation ID xuyên suốt: request → event capture → snapshot → calculation → DN → ERP push
- Metrics chính:
  - billing event capture rate
  - duplicate event hit rate
  - snapshot runtime / fail rate
  - unbilled event count
  - DN generation latency
  - DN lock latency
  - ERP push success / fail / retry rate
  - exception aging
  - regenerate frequency

### 4.6 Testing

- Unit test: Jest / Vitest
- Integration test: Nest + PostgreSQL test DB
- API contract test: supertest
- Batch job test: snapshot / calculation / exception jobs
- Concurrency test: generate same DN twice, concurrent lock, concurrent contract overlap
- Failure injection test: snapshot fail, rate missing, ERP fail, duplicate event, late event

### 4.7 Vì sao nên giữ cùng stack với M1–M9

1. Dễ reuse shared foundation: RBAC, audit, idempotency, sequence, outbox.
2. NestJS phù hợp cho module nghiệp vụ có state machine và job orchestration.
3. PostgreSQL mạnh cho transaction, unique constraint, row lock, JSONB calculation trace, partition strategy.
4. Prisma giúp team intern dễ đọc schema, migration và type-safe hơn.
5. Redis + BullMQ đủ tốt cho batch jobs, retry ERP push, stale exception detection và hot list cache.

---

## 5. Kiến trúc tổng thể Module 10 trong hệ backend

```text
M4/M5/M9 Events   M3 Snapshot Truth   Web Admin / Billing UI / Customer Viewer
       |                  |                         |
       +------------------+-------------------------+
                          |
                          v
                 NestJS Billing Controllers / Consumers
                          |
        +-----------------+-------------------+
        |                 |                   |
        v                 v                   v
    Auth Guard      Permission Guard    Idempotency Guard
        |                 |                   |
        +-----------------+-------------------+
                          |
                          v
                 Billing Application Layer
+--------------------+--------------------+---------------------+------------------+
|                    |                    |                     |                  |
v                    v                    v                     v                  v
Contract Service  Event Capture       Snapshot Service     Charge Service     DebitNote Service
Calendar Service  Exception Service   Query Service        Export Service     Recovery Service
                          |
                          v
                    Domain / Policy Layer
+--------------------+--------------------+---------------------+------------------+
| Rate Resolution    | Snapshot Policy    | DN State Machine    | ERP Push Policy  |
| Free-Day Policy    | Exception Policy   | VAT / Rounding      | Error Mapping    |
| Event Dedupe       | Re-gen Policy      | Owner Scope Policy  | Recovery Policy  |
+--------------------+--------------------+---------------------+------------------+
                          |
                          v
                       Repository Layer
                          |
                          v
  PostgreSQL + Redis + BullMQ + Outbox + Shared Audit/Idempotency Services
```

### 5.1 Tư tưởng tổ chức

- **Controller / consumer layer**: nhận request và ingest event, không chứa business logic nặng.
- **Guard layer**: auth, permission, idempotency, request context.
- **Application services**: orchestration use case theo object billing.
- **Domain/policy layer**: rate precedence, free-day logic, DN workflow, exception rules, ERP push contract.
- **Repository layer**: query/CRUD thuần.
- **Outbox / queue workers**: snapshot batch, ERP push, stale exception detection, optional regenerate tasks.

### 5.2 Tư tưởng thiết kế cốt lõi

- Billing phải đọc từ **truth đã chốt**, không đọc từ object business đang chạy dở.
- **Billing event** và **daily storage snapshot** là 2 nguồn đầu vào chuẩn của charge engine.
- **Charge calculation** phải thuần deterministic: cùng input + cùng contract version = cùng kết quả.
- **Debit Note** là document thương mại; once LOCKED, nó phải bất biến.
- **ERP push** không nằm trong cùng DB transaction với hành động lock DN; dùng outbox để ổn định.
- **Exception queue** phải là first-class feature, vì môi trường go-live thực tế luôn có missing rate, late event, duplicate event hoặc mapping fail.

---

## 6. Phân ranh runtime ownership giữa Module 10 và các module khác

| Concern | Module 10 sở hữu | Module khác sở hữu |
|---|---|---|
| Billing contract / fee line / day type calendar | Có | Không |
| Billing event persistence / status / link DN | Có | M4/M5/M9 chỉ publish event nguồn |
| Daily storage snapshot (billing-facing) | Có | M3 cung cấp inventory truth input |
| Charge calculation | Có | Không |
| Debit note lifecycle | Có | Không |
| ERP push business payload | Có | M8 thực hiện integration delivery |
| Audit / reason code / number sequence / idempotency framework | Không, chỉ consume | M1 |
| Owner/item/warehouse/location/service/day-type semantic source | Không, chỉ consume | M2 |
| Inventory transaction truth / on-hand / dimension | Không | M3 |
| Inbound handling trigger | Không | M4 |
| Outbound handling trigger | Không | M5 |
| Bagging event trigger | Không | M9 |
| Work execution / weighbridge ingestion | Không | M7 / M8 |

### 6.1 Ánh xạ Module 10 với Module 1 — Foundation & Governance

Module 10 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được tạo/sửa contract
   - ai được generate/review/approve/lock DN
   - ai được push ERP / retry push
   - ai được xem exception queue
   - ai được xem DN của owner nào

2. **Number sequence**
   - `DN-YYYYMMDD-SEQ` hoặc policy tương đương cho debit note number
   - optionally sequence cho contract number nếu business muốn human-readable

3. **Reason code**
   - resolve exception
   - manual override / mark ignore / requeue
   - future-proof cho correction flow phase sau

4. **Audit trail**
   - contract create/update/deactivate
   - DN generate/regenerate/review/approve/lock
   - push ERP / retry / fail / manual requeue
   - exception resolution actions

5. **Idempotency**
   - generate DN
   - review / approve / lock
   - event ingest
   - ERP push request / requeue request

### 6.2 Ánh xạ Module 10 với Module 2 — Master Data Management

Module 10 phải consume và validate các dữ liệu sau từ Module 2:

- owner / customer
- item / cargo_form / billing_uom
- warehouse / location / billing location flag
- service code / day type calendar reference
- optional owner-item billing overrides nếu M2 đang giữ baseline commercial reference

Nguyên tắc:
- M10 **không tự định nghĩa lại semantics master** nếu M2 đã sở hữu.
- M10 có thể giữ **billing contract runtime** riêng, nhưng field tham chiếu phải map chuẩn với M2.
- Khi master bị deactivate hoặc đổi controlled field, M10 phải có impact check rõ ràng.

### 6.3 Ánh xạ Module 10 với Module 3 — Inventory Core Engine

Đây là dependency quan trọng nhất của M10.

M10 dùng M3 để:
- đọc truth cho snapshot EOD
- đối soát nguồn tồn / dim / owner / status
- truy trace từ snapshot/billing event về inventory truth khi điều tra dispute
- kiểm soát nguyên tắc: billing không được tính từ raw chứng từ khi chưa đối chiếu transaction truth

Nguyên tắc bắt buộc:
- M10 **không cập nhật** `invent_trans` hay `on_hand`
- M10 **không suy diễn** event handling từ `invent_trans`
- M10 **có thể đối chiếu** billing input với snapshot / transaction truth để phát hiện exception

### 6.4 Ánh xạ Module 10 với Module 4 — Inbound Operations

M4 là publisher cho `INBOUND_HANDLING` event tại thời điểm Receipt đạt `RECEIVED`.

M10 nhận từ M4 tối thiểu:
- receipt_id / receipt_line_id
- owner_id
- warehouse_id
- item_id / cargo_form
- net_weight_kg hoặc qty_kg
- event_time
- day_type / overtime flag nếu event hợp đồng yêu cầu
- correlation_id / external_id

Nguyên tắc:
- M10 không tự xác định receipt nào đã RECEIVED.
- M10 không đọc weighbridge trực tiếp để tính inbound handling.
- Duplicate event cùng `external_id` hoặc same business key phải được skip idempotent.

### 6.5 Ánh xạ Module 10 với Module 5 — Outbound Operations

M5 là publisher cho `OUTBOUND_HANDLING` event tại thời điểm Shipment đạt `SHIPPED`.

M10 nhận từ M5 tối thiểu:
- shipment_id / shipment_line_id
- owner_id
- warehouse_id
- item_id / cargo_form
- actual shipped qty / net weight
- day_type / OT flag
- DPM-related commercial basis nếu có
- correlation_id / external_id

Nguyên tắc:
- M10 không tự xác định shipment nào đã SHIPPED.
- M10 không dùng allocation/picking làm charge point cho outbound handling.
- Với DPM, inventory có thể theo actual nhưng report/billing có thể có nominal basis riêng; contract event payload phải nói rõ field nào là billing basis.

### 6.6 Ánh xạ Module 10 với Module 6 — Inventory Control

Phase 1 Module 10 không lấy charge trực tiếp từ M6 như một fee type chính, nhưng vẫn liên quan ở các điểm:

- adjustment / status change / transfer có thể ảnh hưởng snapshot truth
- reconciliation giữa M10 và M3/M6 giúp phát hiện dữ liệu đầu vào billing bất thường
- future extension có thể phát sinh service charge cho inventory services, nhưng Phase 1 chưa build

Nguyên tắc:
- M6 không trực tiếp publish fee event cho M10 ở baseline hiện tại
- M10 chỉ dùng dữ liệu M6 gián tiếp qua snapshot truth / reconciliation nếu cần điều tra

### 6.7 Ánh xạ Module 10 với Module 7 — Work Execution & Mobile

M7 không publish fee event chính cho M10 trong Phase 1, nhưng ảnh hưởng gián tiếp qua:
- putaway completion → tác động lot/location lineage mà snapshot dùng để tính free-day
- pick completion / transfer execution → ảnh hưởng inventory location truth

Nguyên tắc:
- M10 không lấy work completion làm event charge point trực tiếp ở baseline hiện tại
- M10 phải tôn trọng ownership: work là execution object, không phải commercial object

### 6.8 Ánh xạ Module 10 với Module 8 — Weighbridge, OCR & Integration

M8 là integration layer cho ERP push và có thể cung cấp monitoring / retry infrastructure.

M10 chịu trách nhiệm:
- xác định thời điểm push (sau LOCKED)
- tạo business payload từ DN và lines
- lưu business push state

M8 chịu trách nhiệm:
- queue / retry / delivery / response mapping / monitoring integration
- log kỹ thuật push status

Nguyên tắc:
- ERP push không nằm trong transaction lock DN
- re-push cùng DN number phải idempotent
- failure phải giữ DN ở LOCKED và cho phép retry có kiểm soát

### 6.9 Ánh xạ Module 10 với Module 9 — VAS / Bagging

M9 là publisher cho `BAGGING_FEE` event tại thời điểm WO đạt `COMPLETED`.

M10 nhận từ M9 tối thiểu:
- vas_wo_id
- owner_id
- warehouse_id
- source item / output item / cargo_form
- actual_output_qty_kg / qty_mt
- bag_count
- packaging_ownership
- is_overtime
- session/productivity summary nếu contract cần
- correlation_id / external_id

Nguyên tắc:
- M10 không tự tính bagging event từ VAS sessions.
- M10 dùng payload M9 để áp tier pricing, labor fee và material fee.
- CLIENT_OWNED vs TVL_OWNED chỉ ảnh hưởng phần material fee; M9 vẫn consume packaging inventory riêng theo ownership contract.

---

## 7. Đề xuất cấu trúc code backend cho Module 10

```text
src/
  common/
    constants/
    enums/
    decorators/
    guards/
    interceptors/
    context/
    errors/
    policies/
  infrastructure/
    prisma/
    redis/
    queue/
    logger/
    storage/
  modules/
    billing/
      billing.module.ts
      controllers/
        billing-contract.controller.ts
        billing-event.controller.ts
        billing-snapshot.controller.ts
        debit-note.controller.ts
        billing-exception.controller.ts
        billing-export.controller.ts
        billing-day-type.controller.ts
      consumers/
        inbound-handling.consumer.ts
        outbound-handling.consumer.ts
        bagging-fee.consumer.ts
      services/
        billing-contract.service.ts
        contract-versioning.service.ts
        billing-event.service.ts
        billing-snapshot.service.ts
        free-day.service.ts
        rate-resolution.service.ts
        charge-calculation.service.ts
        debit-note.service.ts
        debit-note-state.service.ts
        billing-exception.service.ts
        billing-export.service.ts
        erp-push-orchestrator.service.ts
        recovery.service.ts
        query.service.ts
      repositories/
        billing-contract.repository.ts
        contract-fee-line.repository.ts
        billing-event.repository.ts
        daily-storage-snapshot.repository.ts
        debit-note.repository.ts
        debit-note-line.repository.ts
        billing-exception.repository.ts
        erp-push-outbox.repository.ts
      dto/
      policies/
      jobs/
        daily-snapshot.job.ts
        stale-unbilled-check.job.ts
        erp-push-dispatch.job.ts
        erp-push-retry.job.ts
        billing-reconciliation.job.ts
      mappers/
        billing-event.mapper.ts
        debit-note.mapper.ts
        erp-payload.mapper.ts
      templates/
        debit-note-pdf.template.ts
```

### 7.1 Quy tắc bắt buộc cho code structure

- Controller / consumer chỉ nhận request hoặc event, không chứa business logic nặng.
- State transition của DN phải qua `debit-note-state.service.ts`.
- Rate precedence phải gom vào `rate-resolution.service.ts`, không rải rác nhiều service.
- Charge formulas phải gom vào `charge-calculation.service.ts`.
- Snapshot logic phải tập trung ở `billing-snapshot.service.ts` + job worker.
- ERP push payload mapping phải tách riêng khỏi integration adapter của M8.
- Query service và export service nên tách khỏi command service để code dễ bảo trì.

---

## 8. Thiết kế database tổng thể cho Module 10

## 8.1 Nguyên tắc DB design

1. Tách rõ **configuration tables**, **runtime billing objects**, **workflow objects**, **integration objects**.
2. Dùng **surrogate key + business code** song song.
3. Mọi record quan trọng phải có `created_at`, `created_by`, `updated_at`, `updated_by` nếu là mutable object.
4. Với immutable/audit-sensitive tables, ưu tiên append-only hoặc cấm update sau trạng thái terminal.
5. Dùng `external_id` / unique business key để chống duplicate cho mọi command/event ingest.
6. Ưu tiên lưu **calculation trace** bằng JSONB để đủ audit nhưng vẫn query được.
7. Chuẩn bị partition / archive strategy cho `billing_event`, `daily_storage_snapshot`, `erp_push_log` vì đây là bảng tăng nhanh.
8. Khóa overlap contract bằng constraint + transaction-safe validation, không chỉ check ở UI.

## 8.2 Các nhóm bảng chính

### A. Billing configuration
- `bil_contract`
- `bil_contract_fee_line`
- `bil_day_type_calendar`
- `bil_rate_resolution_cache` (optional materialized/read model)

### B. Billing runtime input
- `bil_event`
- `bil_event_dedupe`
- `bil_storage_snapshot`
- `bil_snapshot_run`

### C. Debit note workflow
- `bil_debit_note`
- `bil_debit_note_line`
- `bil_debit_note_history`
- `bil_debit_note_export`

### D. Exception / reconciliation
- `bil_exception`
- `bil_exception_action`
- `bil_reconciliation_result`

### E. Integration / async
- `bil_erp_push_outbox`
- `bil_erp_push_log`
- `bil_job_run`

---

## 9. Thiết kế bảng chi tiết đề xuất

## 9.1 `bil_contract`

Mục đích: lưu header contract tính phí theo owner.

```text
id                      UUID PK
contract_number         VARCHAR(30) UNIQUE NOT NULL
owner_id                UUID NOT NULL
contract_scope          VARCHAR(20) NOT NULL DEFAULT 'OWNER'
effective_from          DATE NOT NULL
effective_to            DATE NOT NULL
currency_code           VARCHAR(10) NOT NULL DEFAULT 'VND'
is_default              BOOLEAN NOT NULL DEFAULT FALSE
status                  VARCHAR(20) NOT NULL  -- DRAFT / ACTIVE / INACTIVE / EXPIRED
notes                   TEXT NULL
version_no              INT NOT NULL DEFAULT 1
superseded_contract_id  UUID NULL
created_by              UUID/VARCHAR NOT NULL
created_at              TIMESTAMPTZ NOT NULL
updated_by              UUID/VARCHAR NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

**Indexes / constraints**
- unique(contract_number)
- index(owner_id, effective_from, effective_to, status)
- check(effective_from <= effective_to)
- partial unique for `is_default = TRUE` per owner if business chốt 1 default/owner
- overlap validation bằng transaction + exclusion strategy nếu áp dụng PostgreSQL range type

## 9.2 `bil_contract_fee_line`

Mục đích: lưu fee lines theo contract.

```text
id                      UUID PK
contract_id             UUID NOT NULL FK -> bil_contract(id)
fee_type                VARCHAR(30) NOT NULL   -- STORAGE / HANDLING_INBOUND / HANDLING_OUTBOUND / BAGGING / STUFFING
cargo_form              VARCHAR(30) NULL
warehouse_id            UUID NULL              -- allow warehouse-specific override
day_type_scope          VARCHAR(20) NULL       -- if future extension needed
billing_uom             VARCHAR(10) NOT NULL DEFAULT 'MT'
unit_rate               NUMERIC(18,2) NOT NULL
minimum_charge          NUMERIC(18,2) NULL
free_days               INT NULL
material_rate_per_bag   NUMERIC(18,2) NULL
tier_rule_code          VARCHAR(30) NULL
priority_rank           INT NOT NULL DEFAULT 100
is_active               BOOLEAN NOT NULL DEFAULT TRUE
created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

**Indexes / constraints**
- index(contract_id, fee_type, cargo_form, is_active)
- unique contract-line semantic key ở mức phù hợp: `(contract_id, fee_type, cargo_form, warehouse_id, priority_rank)`
- check(unit_rate >= 0)
- check(free_days is null or free_days >= 0)

## 9.3 `bil_day_type_calendar`

Mục đích: xác định day type và multiplier table.

```text
id                      UUID PK
calendar_date           DATE NOT NULL UNIQUE
day_type                VARCHAR(20) NOT NULL   -- WORKING_DAY / DAY_OFF / HOLIDAY
default_ot_multiplier   NUMERIC(6,3) NOT NULL
no_ot_multiplier        NUMERIC(6,3) NOT NULL
with_ot_multiplier      NUMERIC(6,3) NOT NULL
notes                   TEXT NULL
created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

**Note**
- Có thể chỉ lưu `day_type` và multiplier matrix hard-coded theo config table riêng; nhưng để business admin dễ chỉnh, nên giữ cấu hình rõ ràng.

## 9.4 `bil_event`

Mục đích: lưu billing events đã normalize.

```text
id                      UUID PK
event_type              VARCHAR(30) NOT NULL    -- INBOUND_HANDLING / OUTBOUND_HANDLING / BAGGING_FEE / STORAGE
ref_type                VARCHAR(30) NOT NULL    -- RECEIPT / SHIPMENT / VAS_WO / SNAPSHOT
ref_id                  VARCHAR(50) NOT NULL
ref_line_id             VARCHAR(50) NULL
owner_id                UUID NOT NULL
warehouse_id            UUID NOT NULL
item_id                 UUID NULL
cargo_form              VARCHAR(30) NULL
billing_qty_mt          NUMERIC(18,3) NOT NULL
event_date              DATE NOT NULL
operation_timestamp     TIMESTAMPTZ NOT NULL
day_type                VARCHAR(20) NOT NULL
is_overtime             BOOLEAN NOT NULL DEFAULT FALSE
combined_multiplier     NUMERIC(6,3) NOT NULL
rate_status             VARCHAR(20) NOT NULL DEFAULT 'UNRESOLVED'  -- RESOLVED / MISSING / BLOCKED
billing_status          VARCHAR(20) NOT NULL DEFAULT 'CAPTURED'    -- CAPTURED / BILLED / UNBILLED / IGNORED
source_module           VARCHAR(10) NOT NULL    -- M4 / M5 / M9 / M10
source_payload_json     JSONB NULL
external_id             VARCHAR(100) NOT NULL
correlation_id          UUID NOT NULL
device_or_source_app    VARCHAR(30) NULL
captured_at             TIMESTAMPTZ NOT NULL
```

**Indexes / constraints**
- unique(external_id)
- unique(event_type, ref_id, coalesce(ref_line_id,'')) nếu business key ổn định
- index(owner_id, event_date, billing_status)
- index(source_module, ref_id)
- Gợi ý partition theo `event_date` theo tháng

## 9.5 `bil_storage_snapshot`

Mục đích: lưu snapshot billing-safe EOD.

```text
id                      UUID PK
snapshot_run_id         UUID NOT NULL FK -> bil_snapshot_run(id)
snapshot_date           DATE NOT NULL
cut_off_time            TIMESTAMPTZ NOT NULL
warehouse_id            UUID NOT NULL
location_id             UUID NOT NULL
owner_id                UUID NOT NULL
item_id                 UUID NOT NULL
receipt_line_id         UUID NULL
inventory_status        VARCHAR(20) NOT NULL
is_billable_status      BOOLEAN NOT NULL
first_putaway_date      DATE NULL
days_in_storage         INT NULL
opening_qty_mt          NUMERIC(18,3) NOT NULL
inbound_today_mt        NUMERIC(18,3) NOT NULL
outbound_today_mt       NUMERIC(18,3) NOT NULL
closing_qty_mt          NUMERIC(18,3) NOT NULL
billable_qty_mt         NUMERIC(18,3) NOT NULL
free_days_allowed       INT NULL
is_free_day             BOOLEAN NOT NULL
applied_rate_per_mt_day NUMERIC(18,2) NULL
daily_amount_vnd        NUMERIC(18,2) NULL
trace_json              JSONB NULL
created_at              TIMESTAMPTZ NOT NULL
```

**Indexes / constraints**
- unique(snapshot_date, warehouse_id, location_id, owner_id, item_id, coalesce(receipt_line_id, '00000000-0000-0000-0000-000000000000'), inventory_status)
- index(owner_id, snapshot_date)
- index(snapshot_run_id)
- partition theo `snapshot_date` theo tháng/quý nếu volume lớn

## 9.6 `bil_snapshot_run`

Mục đích: quản trị từng lần chạy batch snapshot.

```text
id                      UUID PK
snapshot_date           DATE NOT NULL
warehouse_scope         VARCHAR(50) NULL        -- global/per-warehouse future-proof
status                  VARCHAR(20) NOT NULL    -- PENDING / RUNNING / SUCCESS / FAILED / PARTIAL
started_at              TIMESTAMPTZ NOT NULL
finished_at             TIMESTAMPTZ NULL
record_count            INT NOT NULL DEFAULT 0
error_count             INT NOT NULL DEFAULT 0
error_summary           TEXT NULL
triggered_by            VARCHAR(30) NOT NULL    -- SYSTEM / MANUAL
external_id             VARCHAR(100) NOT NULL
created_at              TIMESTAMPTZ NOT NULL
```

## 9.7 `bil_debit_note`

Mục đích: lưu header DN.

```text
id                      UUID PK
dn_number               VARCHAR(30) UNIQUE NOT NULL
owner_id                UUID NOT NULL
billing_period_start    DATE NOT NULL
billing_period_end      DATE NOT NULL
generation_basis        VARCHAR(20) NOT NULL   -- PERIOD / MANUAL_SCOPE
status                  VARCHAR(20) NOT NULL   -- DRAFT / REVIEWED / APPROVED / LOCKED
total_before_vat        NUMERIC(18,2) NOT NULL
vat_rate                NUMERIC(6,3) NOT NULL DEFAULT 0.10
vat_amount              NUMERIC(18,2) NOT NULL
grand_total             NUMERIC(18,2) NOT NULL
currency_code           VARCHAR(10) NOT NULL DEFAULT 'VND'
contract_version_json   JSONB NULL
reviewed_by             UUID/VARCHAR NULL
reviewed_at             TIMESTAMPTZ NULL
approved_by             UUID/VARCHAR NULL
approved_at             TIMESTAMPTZ NULL
locked_by               UUID/VARCHAR NULL
locked_at               TIMESTAMPTZ NULL
erp_push_status         VARCHAR(20) NOT NULL DEFAULT 'NOT_SENT'
external_id             VARCHAR(100) NOT NULL
correlation_id          UUID NOT NULL
created_by              UUID/VARCHAR NOT NULL
created_at              TIMESTAMPTZ NOT NULL
updated_by              UUID/VARCHAR NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

**Indexes / constraints**
- unique(dn_number)
- unique(owner_id, billing_period_start, billing_period_end, status) WHERE status IN ('DRAFT','REVIEWED','APPROVED','LOCKED') chỉ nếu business muốn 1 DN active/owner/period
- index(owner_id, billing_period_start, billing_period_end)
- index(status, locked_at)

## 9.8 `bil_debit_note_line`

Mục đích: lưu charge lines.

```text
id                      UUID PK
debit_note_id           UUID NOT NULL FK -> bil_debit_note(id)
line_seq                INT NOT NULL
charge_code             VARCHAR(30) NOT NULL
description             VARCHAR(500) NOT NULL
fee_type                VARCHAR(30) NOT NULL
source_type             VARCHAR(30) NOT NULL   -- EVENT / SNAPSHOT / MANUAL_GROUP
source_ref_id           VARCHAR(50) NULL
owner_id                UUID NOT NULL
item_id                 UUID NULL
cargo_form              VARCHAR(30) NULL
billing_qty_mt          NUMERIC(18,3) NOT NULL
unit_rate               NUMERIC(18,2) NOT NULL
combined_multiplier     NUMERIC(6,3) NULL
amount_vnd              NUMERIC(18,2) NOT NULL
vat_included_flag       BOOLEAN NOT NULL DEFAULT FALSE
calculation_trace_json  JSONB NOT NULL
created_at              TIMESTAMPTZ NOT NULL
```

## 9.9 `bil_debit_note_history`

Mục đích: lưu mọi transition hoặc action trên DN.

```text
id                      UUID PK
debit_note_id           UUID NOT NULL
action_code             VARCHAR(30) NOT NULL   -- GENERATED / REGENERATED / REVIEWED / APPROVED / LOCKED / EXPORT / ERP_RETRY
from_status             VARCHAR(20) NULL
to_status               VARCHAR(20) NULL
action_by               UUID/VARCHAR NOT NULL
action_at               TIMESTAMPTZ NOT NULL
reason_code             VARCHAR(50) NULL
remarks                 TEXT NULL
before_json             JSONB NULL
after_json              JSONB NULL
```

## 9.10 `bil_exception`

Mục đích: hàng đợi exception.

```text
id                      UUID PK
exception_type          VARCHAR(40) NOT NULL   -- MISSING_RATE / DUP_EVENT / ORPHAN_EVENT / LATE_EVENT / SNAPSHOT_FAIL / ERP_FAIL / DATA_MISMATCH
severity                VARCHAR(20) NOT NULL   -- INFO / WARN / ERROR / BLOCKER
status                  VARCHAR(20) NOT NULL   -- OPEN / IN_REVIEW / RESOLVED / IGNORED
owner_id                UUID NULL
source_module           VARCHAR(10) NULL
source_ref_type         VARCHAR(30) NULL
source_ref_id           VARCHAR(50) NULL
billing_event_id        UUID NULL
snapshot_run_id         UUID NULL
debit_note_id           UUID NULL
message                 TEXT NOT NULL
detail_json             JSONB NULL
assigned_to             UUID/VARCHAR NULL
resolved_by             UUID/VARCHAR NULL
resolved_at             TIMESTAMPTZ NULL
resolution_code         VARCHAR(50) NULL
created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

## 9.11 `bil_erp_push_outbox`

Mục đích: outbox cho push ERP.

```text
id                      UUID PK
debit_note_id           UUID NOT NULL
outbox_type             VARCHAR(30) NOT NULL DEFAULT 'ERP_PUSH'
payload_json            JSONB NOT NULL
status                  VARCHAR(20) NOT NULL   -- PENDING / SENT / FAILED / DEAD
attempt_count           INT NOT NULL DEFAULT 0
next_retry_at           TIMESTAMPTZ NULL
last_error_code         VARCHAR(50) NULL
last_error_message      TEXT NULL
external_id             VARCHAR(100) NOT NULL
created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

## 9.12 `bil_erp_push_log`

Mục đích: log từng lần push.

```text
id                      UUID PK
debit_note_id           UUID NOT NULL
outbox_id               UUID NOT NULL
request_payload_json    JSONB NOT NULL
response_payload_json   JSONB NULL
http_status             INT NULL
result_status           VARCHAR(20) NOT NULL   -- SUCCESS / FAILED / TIMEOUT / REJECTED
attempt_no              INT NOT NULL
pushed_at               TIMESTAMPTZ NOT NULL
correlation_id          UUID NULL
```

---

## 10. Quan hệ dữ liệu và ownership cần giữ rõ

### 10.1 Ownership ranh giới

- M1 sở hữu quyền, audit policy, reason code, idempotency baseline.
- M2 sở hữu master definitions và semantic values.
- **M3 sở hữu runtime inventory records và truth để snapshot bám vào.**
- M4/M5/M9 sở hữu business use case, state machine, trigger timing cho fee events.
- **M10 sở hữu billing event normalized, storage snapshot billing-facing, charge calculation, debit note và exception workflow.**
- M8 sở hữu delivery kỹ thuật của ERP push, không sở hữu DN business workflow.

### 10.2 Ranh giới dễ nhầm phải khóa ngay

- Billing **không được** tính phí trực tiếp từ raw receipt/shipment nếu chưa qua domain event hoặc snapshot chuẩn.
- Billing **không được** sửa on-hand / invent-trans để “fix fee”.
- ERP push fail **không được** revert DN từ LOCKED về APPROVED.
- CUST_VIEWER **không được** xem draft/reviewed DN nếu business chưa chốt.
- Snapshot fail **không được** tạo snapshot tạm kiểu xấp xỉ để tính phí.

---

## 11. Luồng thực hiện từ database → backend

## 11.1 Luồng A — Billing event capture từ M4/M5/M9

**Nguồn vào:** domain event từ M4/M5/M9

1. Consumer nhận event payload.
2. Validate schema tối thiểu: `external_id`, `correlation_id`, `owner_id`, `ref_id`, `qty`, `event_date`.
3. Check idempotency / dedupe theo `external_id` hoặc business key.
4. Resolve day type + combined multiplier từ calendar.
5. Persist `bil_event` với `billing_status = CAPTURED` hoặc `UNBILLED` nếu thiếu rate/semantic.
6. Nếu có lỗi semantic → tạo `bil_exception`.
7. Emit audit / log kỹ thuật.

**Bảng chạm tới:**
- `bil_event`
- `bil_exception` (nếu fail)
- shared audit / idempotency tables của M1

## 11.2 Luồng B — EOD daily storage snapshot

**Nguồn vào:** truth từ M3 + config contract/rate của M10

1. Cron/BullMQ tạo `bil_snapshot_run`.
2. Pull dataset từ M3 theo cut-off EOD.
3. Chuẩn hóa grain snapshot theo `(owner, item, warehouse, location, receipt_line_id, status)`.
4. Xác định billable statuses.
5. Tính `opening`, `inbound_today`, `outbound_today`, `closing`, `billable_qty`.
6. Resolve `first_putaway_date`, `days_in_storage`, `free_days_allowed`, `is_free_day`.
7. Resolve `applied_rate_per_mt_day`.
8. Persist `bil_storage_snapshot` theo batch.
9. Nếu fail giữa chừng: mark `bil_snapshot_run = FAILED/PARTIAL`, mở exception.

**Bảng chạm tới:**
- `bil_snapshot_run`
- `bil_storage_snapshot`
- `bil_exception` nếu có lỗi

## 11.3 Luồng C — Generate draft debit note

1. BILLING_OFC gọi API generate DN cho owner + period.
2. Backend lock logical scope theo `(owner_id, period)` để tránh double-generate.
3. Query `bil_event` chưa billed + `bil_storage_snapshot` trong kỳ.
4. Resolve active contract / fee lines.
5. Chạy charge calculation engine.
6. Tạo `bil_debit_note` trạng thái `DRAFT`.
7. Tạo `bil_debit_note_line` kèm `calculation_trace_json`.
8. Update các `bil_event` đã sử dụng sang trạng thái linked-to-draft hoặc giữ CAPTURED tùy thiết kế; khuyến nghị có field/link draft để regenerate an toàn.
9. Tạo `bil_debit_note_history` action = GENERATED.

## 11.4 Luồng D — Review / Approve / Lock debit note

1. Review: validate draft lines, chuyển `DRAFT -> REVIEWED`.
2. Approve: chuyển `REVIEWED -> APPROVED`.
3. Lock: chuyển `APPROVED -> LOCKED`.
4. Sau lock:
   - mark DN immutable
   - mark events / snapshots linked billed-final
   - tạo outbox `bil_erp_push_outbox`
   - ghi history / audit

## 11.5 Luồng E — ERP push qua M8

1. Worker đọc `bil_erp_push_outbox` trạng thái `PENDING`.
2. Map business payload sang ERP format.
3. Gọi integration adapter hoặc handoff service M8.
4. Persist `bil_erp_push_log`.
5. Thành công → update outbox `SENT`, DN `erp_push_status = SUCCESS`.
6. Thất bại → tăng `attempt_count`, set `next_retry_at`, cập nhật DN `FAILED`, mở/refresh exception nếu cần.

## 11.6 Luồng F — Exception handling

1. Query các exception `OPEN`.
2. BILLING_OFC xem detail và trace.
3. Tùy loại exception:
   - bổ sung rate / contract
   - requeue event
   - rerun snapshot
   - retry ERP push
   - mark ignored với reason code
4. Ghi `bil_exception_action` hoặc append lịch sử vào `bil_exception`.
5. Nếu resolved, đóng exception.

---

## 12. Charge calculation engine — thiết kế kỹ thuật

## 12.1 Mục tiêu

Charge engine phải:
- deterministic
- idempotent ở mức generate DN
- traceable cho từng line
- tách biệt giữa input normalization, rate resolution, formula execution, rounding và output composition

## 12.2 Pipeline đề xuất

```text
Collect Inputs
  -> Normalize Inputs
  -> Resolve Contract
  -> Resolve Fee Line
  -> Resolve Day Type / Multiplier
  -> Apply Formula
  -> Apply Rounding / VAT
  -> Build Charge Lines
  -> Persist Trace
```

## 12.3 Các formula service nên tách riêng

- `storage-charge.strategy.ts`
- `handling-inbound.strategy.ts`
- `handling-outbound.strategy.ts`
- `bagging-charge.strategy.ts`
- `vat-calculation.service.ts`
- `rounding.service.ts`

## 12.4 Calculation trace tối thiểu

Mỗi `debit_note_line.calculation_trace_json` nên có:

```json
{
  "formula": "STORAGE_V1",
  "contract_id": "...",
  "contract_fee_line_id": "...",
  "input": {
    "opening_qty_mt": 120.0,
    "inbound_today_mt": 20.0,
    "outbound_today_mt": 10.0,
    "billable_qty_mt": 140.0,
    "days_in_storage": 7,
    "free_days": 5,
    "is_free_day": false
  },
  "rate": {
    "unit_rate": 12000,
    "combined_multiplier": 1.0
  },
  "result": {
    "amount_vnd": 1680000
  },
  "generated_at": "...",
  "engine_version": "1.0"
}
```

## 12.5 Rounding policy đề xuất

- quantity: 3 decimal places (MT)
- rate: 2 decimal places
- amount: 2 decimal places
- VAT amount: 2 decimal places
- grand total: 2 decimal places

Phase 1 cần chốt 1 policy thống nhất toàn module, không để mỗi API làm tròn khác nhau.

---

## 13. Rate resolution & contract versioning

## 13.1 Rate precedence đề xuất

Khi resolve fee line, dùng thứ tự ưu tiên sau:

1. Contract riêng của owner + fee_type + cargo_form + warehouse-specific line
2. Contract riêng của owner + fee_type + cargo_form
3. Contract riêng của owner + fee_type không theo cargo_form
4. Default contract của owner
5. System default contract (nếu business cho phép)
6. Không tìm thấy → `MISSING_RATE` exception

## 13.2 Vì sao cần precedence rõ

Nếu không khóa precedence, dev mỗi chỗ sẽ lookup khác nhau và ra số tiền khác nhau giữa:
- event inquiry
- draft calculation
- export
- regenerate

## 13.3 Contract versioning đề xuất

- Update contract sau khi đã có DN draft/locked **không sửa đè** row cũ; nên tạo `version_no` mới hoặc create contract successor.
- Draft DN lưu `contract_version_json` để truy nguyên đã tính theo version nào.
- Nếu regenerate trước LOCKED, engine dùng version hiện hành hợp lệ theo period hoặc theo rule chốt.
- LOCKED DN phải giữ nguyên dấu vết version đã dùng, kể cả contract sau đó bị sửa.

---

## 14. State machine kỹ thuật của các object chính

## 14.1 Billing event

```text
RECEIVED_PAYLOAD -> CAPTURED -> BILLED
                     |            
                     -> UNBILLED -> RESOLVED/REQUEUED -> CAPTURED
```

## 14.2 Snapshot run

```text
PENDING -> RUNNING -> SUCCESS
                 \-> FAILED
                 \-> PARTIAL
```

## 14.3 Debit note

```text
DRAFT -> REVIEWED -> APPROVED -> LOCKED
  \-------- re-generate allowed before LOCKED --------/
```

## 14.4 ERP push outbox

```text
PENDING -> SENT
   \-> FAILED -> PENDING (retry)
   \-> DEAD
```

---

## 15. Danh sách API chi tiết và hướng build

## 15.1 Nhóm Contract APIs

### 1. `POST /api/v1/billing/contracts`

**Mục đích:** tạo contract billing mới cho owner.  
**Dùng khi:** WH_ADMIN hoặc BILLING_OFC cấu hình hợp đồng/rate mới.  
**Input chính:** owner_id, effective range, is_default, fee lines.  
**Validate:**
- owner tồn tại và active
- date range hợp lệ
- không overlap với active contract khác nếu business key trùng
- fee lines hợp lệ, rate >= 0
- `external_id` bắt buộc

**Side effects:**
- insert `bil_contract`
- insert `bil_contract_fee_line`
- audit log

**Hướng build:**
- dùng transaction DB
- validate overlap trong transaction với lock logic phù hợp
- response trả contract + fee lines vừa tạo

### 2. `GET /api/v1/billing/contracts`

**Mục đích:** list/search contracts.  
**Filter:** owner, status, date overlap, is_default.  
**Hướng build:** query-only, phân trang, sort theo effective_from desc.

### 3. `GET /api/v1/billing/contracts/{id}`

**Mục đích:** xem chi tiết contract.  
**Hướng build:** include fee lines + usage summary cơ bản.

### 4. `PUT /api/v1/billing/contracts/{id}`

**Mục đích:** cập nhật contract chưa locked vào historical calculation.  
**Validate:**
- contract có được sửa trực tiếp hay phải version new
- field controlled change
- overlap check lại
- nếu contract đã được dùng bởi LOCKED DN, khuyến nghị versioning thay vì sửa in-place

**Hướng build:**
- ưu tiên “create new version” hơn update cứng
- ghi lịch sử before/after

### 5. `GET /api/v1/billing/contracts/{id}/fee-lines`

**Mục đích:** lấy fee lines chi tiết.  
**Hướng build:** query-only, có thể group theo fee_type/cargo_form.

## 15.2 Nhóm Day Type / Calendar APIs

### 6. `POST /api/v1/billing/day-types`

**Mục đích:** tạo/cập nhật calendar date cho day type.  
**Validate:** ngày không trùng, multiplier hợp lệ.  
**Hướng build:** upsert theo date; audit before/after.

### 7. `GET /api/v1/billing/day-types`

**Mục đích:** list calendar theo khoảng ngày.  
**Hướng build:** query-only.

## 15.3 Nhóm Billing Event APIs

### 8. `GET /api/v1/billing/events`

**Mục đích:** inquiry event queue.  
**Filter:** owner, event_type, date range, billing_status, source_module.  
**Hướng build:** dùng read model/index tốt vì team billing sẽ query nhiều.

### 9. `POST /internal/billing/events/inbound-handling`

**Mục đích:** internal endpoint/consumer cho M4 publish inbound handling.  
**Validate:** schema payload, external_id unique, positive qty, owner/warehouse valid.  
**Side effects:** insert `bil_event`, exception nếu missing rate semantics.  
**Hướng build:** internal-only, không expose public UI.

### 10. `POST /internal/billing/events/outbound-handling`

Tương tự inbound, nhưng nguồn M5 và semantics outbound.

### 11. `POST /internal/billing/events/bagging-fee`

Tương tự inbound/outbound, nhưng payload M9.  
**Lưu ý:** phải hỗ trợ tier pricing inputs như qty_mt, bag_count, packaging_ownership.

## 15.4 Nhóm Snapshot APIs

### 12. `GET /api/v1/billing/snapshots`

**Mục đích:** inquiry snapshot theo period.  
**Filter:** snapshot_date, owner, warehouse, item, receipt_line_id.  
**Hướng build:** query-only, hỗ trợ export CSV/Excel.

### 13. `POST /api/v1/billing/snapshots/rerun`

**Mục đích:** rerun snapshot cho 1 ngày hoặc scope cụ thể khi batch fail.  
**Actor:** BILLING_OFC hoặc admin có quyền.  
**Validate:** ngày đã khóa kỳ chưa, tránh rerun bừa sau khi DN locked nếu rule chưa cho.  
**Hướng build:** enqueue job, không chạy inline lâu.

## 15.5 Nhóm Charge / Debit Note APIs

### 14. `POST /api/v1/billing/charges/calculate`

**Mục đích:** preview calculation hoặc run calc engine trước generate.  
**Dùng khi:** billing officer muốn xem preliminary result.  
**Hướng build:** có thể trả preview mà không persist DN; hoặc giữ nội bộ cho `generate` dùng.  
**Lưu ý:** không để preview và generate dùng 2 code path khác nhau.

### 15. `POST /api/v1/billing/debit-notes`

**Mục đích:** generate draft DN.  
**Input:** owner_id, period_start, period_end, optional warehouse scope, external_id.  
**Validate:**
- chưa có DN active cùng scope hoặc regenerate path rõ ràng
- snapshot run đầy đủ trong kỳ
- không còn blocker exception loại rate missing / snapshot fail

**Side effects:**
- tạo `bil_debit_note`
- tạo `bil_debit_note_line`
- tạo history `GENERATED`

**Hướng build:** transaction DB + logical lock trên `(owner, period)`.

### 16. `GET /api/v1/billing/debit-notes`

**Mục đích:** list DNs.  
**Actor:** BILLING_OFC, CUST_VIEWER.  
**Owner scope:** CUST_VIEWER chỉ thấy own owner và `LOCKED`.  
**Hướng build:** query path riêng cho customer viewer để tránh rò dữ liệu.

### 17. `GET /api/v1/billing/debit-notes/{id}`

**Mục đích:** xem chi tiết header + lines + trace summary.  
**Hướng build:** include lines + history + push status tóm tắt.

### 18. `PUT /api/v1/billing/debit-notes/{id}/review`

**Mục đích:** DRAFT → REVIEWED.  
**Validate:** status hiện tại phải là DRAFT.  
**Hướng build:** state machine service + optimistic lock.

### 19. `PUT /api/v1/billing/debit-notes/{id}/approve`

**Mục đích:** REVIEWED → APPROVED.  
**Validate:** status = REVIEWED; actor hợp lệ theo RBAC.  
**Hướng build:** state machine service + audit.

### 20. `PUT /api/v1/billing/debit-notes/{id}/lock`

**Mục đích:** APPROVED → LOCKED.  
**Validate:**
- actor là BILLING_OFC
- status = APPROVED
- không còn blocker exception link tới DN
- idempotent theo external_id

**Side effects:**
- update DN LOCKED
- ghi history
- tạo outbox ERP push
- mark final billed status cho event/snapshot references

**Hướng build:**
- transaction DB cho update DN + outbox create
- không gọi ERP inline

### 21. `POST /api/v1/billing/debit-notes/{id}/regenerate`

**Mục đích:** regenerate draft trước lock.  
**Validate:** chỉ cho khi chưa LOCKED.  
**Hướng build:**
- có thể overwrite lines cũ nhưng phải lưu history / archive trace
- tuyệt đối cấm sau LOCKED

### 22. `GET /api/v1/billing/debit-notes/{id}/export`

**Mục đích:** export PDF/Excel.  
**Hướng build:**
- CUST_VIEWER chỉ export LOCKED
- export từ read model hoặc render trực tiếp từ DB
- nếu PDF cần đóng dấu snapshot, nên lưu metadata export

## 15.6 Nhóm Exception / Reconciliation APIs

### 23. `GET /api/v1/billing/exceptions`

**Mục đích:** list exception queue.  
**Filter:** type, severity, status, owner, age.  
**Hướng build:** query-only, có SLA aging.

### 24. `PUT /api/v1/billing/exceptions/{id}/resolve`

**Mục đích:** resolve exception.  
**Input:** resolution_code, remarks, optional requeue action.  
**Hướng build:** update exception + action history + optional enqueue job.

### 25. `GET /api/v1/billing/reconciliation`

**Mục đích:** inquiry chênh lệch giữa billing input và snapshot/event truth.  
**Hướng build:** read-only, feed cho ops/billing review.

## 15.7 Nhóm ERP Push APIs

### 26. `POST /api/v1/billing/debit-notes/{id}/erp-push/retry`

**Mục đích:** retry push ERP cho DN đã LOCKED nhưng fail.  
**Validate:** DN phải LOCKED, push_status = FAILED hoặc NOT_SENT.  
**Hướng build:** enqueue outbox mới hoặc reset outbox cũ tùy design; phải idempotent.

### 27. `GET /api/v1/billing/debit-notes/{id}/erp-push/logs`

**Mục đích:** xem lịch sử push ERP.  
**Hướng build:** query-only cho billing/integration team.

---

## 16. Mẫu response / error hướng dẫn cho dev intern

### 16.1 Response chuẩn cho command thành công

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DRAFT",
    "dn_number": "DN-20260309-0001"
  },
  "meta": {
    "correlation_id": "uuid",
    "idempotent_replay": false
  }
}
```

### 16.2 Error codes nên chuẩn hóa

- `BIL-CONTRACT-OVERLAP-409`
- `BIL-RATE-NOT-FOUND-422`
- `BIL-EVENT-DUPLICATE-409`
- `BIL-SNAPSHOT-NOT-READY-422`
- `BIL-DN-INVALID-STATE-409`
- `BIL-DN-LOCK-FORBIDDEN-403`
- `BIL-DN-LOCKED-IMMUTABLE-409`
- `BIL-ERP-PUSH-NOT-ALLOWED-409`
- `BIL-EXTERNAL-ID-REPLAY-200`

---

## 17. Idempotency, locking và concurrency control

## 17.1 Idempotency key scope đề xuất

| Action | Idempotency scope |
|---|---|
| Create contract | external_id |
| Update contract/version | external_id |
| Ingest billing event | external_id từ source module |
| Rerun snapshot | snapshot_date + warehouse_scope + external_id |
| Generate DN | owner_id + period + external_id |
| Review / Approve / Lock DN | debit_note_id + action + external_id |
| Retry ERP push | debit_note_id + retry_request_external_id |

## 17.2 Locking strategy đề xuất

- **Generate DN:** logical lock theo `(owner_id, billing_period_start, billing_period_end)`.
- **Contract overlap validation:** transaction + row lock trên active contracts của owner.
- **DN state transition:** optimistic locking bằng `updated_at/version` hoặc `SELECT ... FOR UPDATE` trên DN row.
- **Snapshot run:** unique `snapshot_date + scope` để tránh chạy trùng.

---

## 18. Batch jobs và worker design

## 18.1 Daily snapshot job

- lịch chạy: EOD 23:59 Asia/Bangkok
- mode: scheduled job
- output: `bil_snapshot_run` + `bil_storage_snapshot`
- failure path: exception + retry thủ công hoặc auto tùy loại lỗi

## 18.2 Stale unbilled detector

- chạy mỗi 15–30 phút
- tìm `bil_event` CAPTURED/UNBILLED quá SLA hoặc rate_status = MISSING
- mở/refresh exception

## 18.3 ERP push dispatcher

- polling `bil_erp_push_outbox` PENDING
- handoff sang M8 adapter
- update outbox + log

## 18.4 Billing reconciliation job

- so khớp số lượng event đã billed, snapshot coverage, DN coverage theo kỳ
- mở exception nếu mismatch lớn

## 18.5 Cleanup / archive job

- archive log già nếu policy cho phép
- không xóa dữ liệu audit-sensitive còn trong retention

---

## 19. Exception & recovery matrix

| Tình huống | Phát hiện ở đâu | Hệ thống làm gì | Người xử lý |
|---|---|---|---|
| Duplicate event từ M4/M5/M9 | Event ingest | Skip, log dedupe | System |
| Missing rate | Charge resolution / event ingest | `UNBILLED` + create exception | BILLING_OFC |
| Snapshot fail giữa chừng | Snapshot worker | mark run FAILED/PARTIAL + exception | BILLING_OFC / Tech |
| Generate DN cùng kỳ 2 lần | DN service | reject hoặc idempotent replay | System |
| Lock DN nhưng outbox create fail | same DB transaction | rollback lock | System |
| Lock DN thành công nhưng ERP push fail | worker | giữ LOCKED, push_status FAILED, retry | BILLING_OFC + M8 |
| Late event đến sau khi DN LOCKED | ingest/reconciliation | create LATE_EVENT exception | BILLING_OFC |
| Contract sửa sau khi DN LOCKED | contract service | allow new version only, không ảnh hưởng DN cũ | System |
| Customer xem DN của owner khác | query guard | 403 | System |

---

## 20. NFRs cho Module 10

## 20.1 Performance

- Query list DN / contract / exception phải phản hồi ổn ở quy mô daily ops.
- Generate DN nên chạy async hoặc semi-sync nếu số dòng rất lớn.
- Snapshot batch phải hoàn thành trong window vận hành chấp nhận được trước giờ billing sáng hôm sau.

## 20.2 Consistency

- DN lock + outbox create phải nằm cùng transaction.
- Event capture phải exactly-once logical effect thông qua idempotency.
- Snapshot run cho cùng scope/date không được sinh 2 bộ dữ liệu active.

## 20.3 Security

- CUST_VIEWER owner-scope phải enforce ở backend.
- PDF/export phải tôn trọng permission, không dựa UI check.
- Internal event endpoints không public internet nếu không cần.

## 20.4 Auditability

- mọi state transition trên DN phải có history record
- mọi calculation phải trace được
- mọi retry ERP push phải có log
- mọi exception resolution phải có reason/user/time

## 20.5 Maintainability

- formula phải tách theo strategy pattern
- rate resolution và DN state machine phải có unit test riêng
- export template tách riêng, không hard-code trong controller

---

## 21. Gợi ý implementation order cho team dev

### Giai đoạn 1 — Nền dữ liệu & query
1. DB schema `bil_contract`, `bil_contract_fee_line`, `bil_day_type_calendar`
2. Contract APIs
3. Query APIs cơ bản

### Giai đoạn 2 — Event & snapshot
4. Event consumers / ingest + dedupe
5. Snapshot run tables + batch job
6. Snapshot inquiry

### Giai đoạn 3 — Charge engine & debit note
7. Rate resolution service
8. Charge calculation engine
9. Generate / review / approve / lock DN
10. DN inquiry / history / export

### Giai đoạn 4 — Exception & ERP push
11. Exception queue
12. ERP outbox + log + retry
13. Customer viewer inquiry

### Giai đoạn 5 — Hardening
14. Concurrency / idempotency tests
15. Recovery paths
16. Performance tuning / indexes / partition review

---

## 22. Checklist build-ready cho dev intern

Trước khi merge bất kỳ feature nào của M10, tự kiểm tra 15 câu sau:

1. API này là command hay query?
2. Nếu là command, `external_id` ở đâu?
3. Có enforce RBAC ở backend chưa?
4. Có audit record chưa?
5. Có thể replay request mà không sinh duplicate không?
6. Nếu fail giữa chừng có rollback hoặc recovery path chưa?
7. Có violate ownership của M3/M4/M5/M8/M9 không?
8. Có lưu đủ calculation trace hoặc event trace chưa?
9. Có dùng đúng contract/rate precedence chung chưa?
10. Có cấm mutation sau LOCKED chưa?
11. Có filter owner scope cho CUST_VIEWER chưa?
12. Có tách business logic khỏi controller chưa?
13. Có test invalid state transition chưa?
14. Có test missing rate / duplicate event / ERP fail chưa?
15. Có index phù hợp cho query chính chưa?

---

## 23. Kết luận

Module 10 là nơi chuyển **transaction integrity** thành **revenue integrity**. Nếu build đúng, hệ thống sẽ:

- không bỏ sót phí,
- không đếm phí trùng,
- truy ngược được từ Debit Note về event/snapshot/contract,
- khóa được DN sau khi chốt,
- và đẩy ERP ổn định mà không phá workflow billing.

Nếu build sai, đây sẽ là module gây tranh chấp nhiều nhất vì chỉ cần lệch một trong các lớp sau là toàn bộ doanh thu có thể sai:

- input event sai,
- snapshot sai,
- rate resolution sai,
- state machine DN sai,
- hoặc ERP push duplicate.

Vì vậy, với Module 10, ưu tiên kỹ thuật không phải là “ra màn nhanh”, mà là **đúng ownership, đúng traceability, đúng idempotency, đúng batch safety và đúng immutability sau LOCKED**.
