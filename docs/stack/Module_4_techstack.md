# TVL SWM — Module 4 Tech Stack & Backend Design
# Inbound Operations

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Integration Team  
**Mục tiêu:** Chuyển hóa Module 4 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, integration, error recovery và luồng thực thi từ database → backend → integration → inventory posting.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 4 — Inbound Operations Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 4 thực chất phải build những gì ở Phase 1.
- Luồng **database → repository → service → state machine → integration adapter → API** nên tổ chức ra sao.
- Vì sao `Receipt` chỉ là object nghiệp vụ, còn inventory truth phải đi qua Module 3.
- Thiết kế database nào vừa đúng cho go-live Phase 1, vừa đủ sạch để scale cho Module 5, 6, 7, 8, 10 về sau.
- Từng API dùng để làm gì, input/output gì, validate gì, side effect gì, retry/idempotency ra sao.
- Cách Module 4 ánh xạ với Module 1, 2, 3 và các module liên quan như 7, 8, 10.
- Cách build technical recovery để weighbridge retry, OCR fail, posting fail, work creation fail không làm lệch nghiệp vụ.

Tài liệu này bám theo các baseline đã chốt của hệ thống:
- Inbound chỉ post tồn khi receipt đạt `RECEIVED`.
- Receipt không sở hữu inventory ledger; M3 mới là transaction truth engine.
- M4 nhận dữ liệu cân từ M8, nhưng quyết định nghiệp vụ accept/reject/re-weigh thuộc M4.
- Sau `RECEIVED`, M4 handoff putaway sang M7.
- Mọi API có side effect phải idempotent bằng `external_id`.
- Manual weight, cancel, reject, re-weigh, match fallback đều phải có audit trail.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 18 kết luận kỹ thuật quan trọng cho Module 4:

1. **Module 4 là operational gatekeeper của inbound**, không phải module inventory ledger.
2. **Receipt là object runtime nghiệp vụ**, không phải nơi cộng tồn kho trực tiếp.
3. **Posting point inbound duy nhất là `RECEIVED`**; các state trước đó chỉ là state vận hành.
4. **M4 phải nhận gross/tare/net từ M8 hoặc manual fallback**, nhưng quyết định PASS/FAIL tolerance là của M4.
5. **Tolerance fail đi thẳng `REJECTED`**, không đi approval loop inbound ở baseline hiện tại.
6. **Re-weigh giữ nguyên receipt number**, chỉ tăng attempt và tạo log cân mới.
7. **Tối đa 3 lần re-weigh**, sau đó manager chỉ được cancel hoặc xử lý exception policy.
8. **Manual weight entry là exception path**, bắt buộc permission + reason code + audit.
9. **Bagged inbound phải kiểm soát over-receipt ở cấp PO** khi áp rule đó.
10. **M4 phải gọi M3 để post inbound**, không được viết trực tiếp vào `invent_trans` hoặc `on_hand`.
11. **M4 phải gọi M7 để tạo putaway work** sau khi receipt được accepted.
12. **M4 phải phát event/hook sang M10** để capture inbound handling phục vụ billing.
13. **Retry từ weighbridge/OCR/API không được tạo duplicate receipt, duplicate posting, duplicate work**.
14. **State machine phải enforce ở backend**, không được dựa vào UI disable button.
15. **DB của M4 phải tách receipt runtime, weighing trail, status history, exception trail, integration log**.
16. **Module 4 phải scale cho volume weighbridge/integration lớn hơn volume CRUD admin**; vì vậy cần index và partition strategy phù hợp.
17. **Recovery path phải là capability bắt buộc**, không phải ghi chú ngoài lề; đặc biệt cho case post M3 fail hoặc callback M7 fail.
18. **Thiết kế của M4 phải chừa đường cho Phase 2** như partial receipt, QC hold, multi-stop, OCR confidence workflow sâu hơn, nhưng không làm phình lifecycle go-live.

---

## 3. Phạm vi build thực tế của Module 4 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Receipt creation / confirm flow
2. Receipt state machine runtime
3. Vehicle identification & manual matching flow
4. Vessel / B/L matching flow với OCR-assisted fallback
5. Weigh-in / weigh-out command handling
6. Tolerance check engine
7. Reject / re-weigh / cancel flow
8. Inbound posting orchestration sang M3 tại `RECEIVED`
9. Putaway handoff orchestration sang M7
10. Billing capture hook/event sang M10
11. Status history + exception trail + audit integration
12. Idempotency handling cho mọi command side effect
13. Technical recovery cho posting/work creation/callback mismatch
14. Query APIs cho inquiry/search/detail/history
15. Validation matrix và error code implementation

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build partial receipt.
2. Không build QC hold / quality inspection engine.
3. Không build barcode/RFID inbound confirmation.
4. Không build OCR workflow phức tạp theo confidence nhiều tầng.
5. Không build yard/berth scheduling engine.
6. Không build multi-stop trip receipt.
7. Không build approval engine cho tolerance inbound vì baseline hiện tại không dùng.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** state machine hoàn chỉnh cho receipt.
- **Có build** integration adapter với M8, M3, M7, M10.
- **Có build** event log/history để điều tra tranh chấp cân.
- **Không build** ledger inventory trong Module 4.
- **Không build** putaway execution runtime trong Module 4; M4 chỉ tạo handoff, M7 mới thực thi.
- **Không build** charge calculation trong Module 4; M10 chỉ consume event/hook từ M4.
- **Không cho phép** bất kỳ màn hình/API nào update inventory trực tiếp từ M4.

---

## 4. Khuyến nghị tech stack chính thức cho Module 4

Để đồng bộ với Module 1, 2, 3 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; event/outbox cho integration nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot dedupe / integration coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Integration layer

- **Weighbridge adapter:** HTTP/WebSocket receiver hoặc polling adapter từ local agent của M8
- **OCR adapter:** async callback hoặc pull result API
- **Outbox pattern:** dùng cho `PostInboundReceipt`, `CreatePutawayWork`, `InboundHandlingCaptured`
- **Retry policy:** exponential backoff + max retry + dead-letter handling cho integration commands

### 4.4 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên receipt → weighing → posting → putaway → billing
- Metrics: weigh event latency, tolerance fail rate, posting retry rate, re-weigh rate, cancel rate, work creation fail rate
- Tracing: OpenTelemetry-ready

### 4.5 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- State-machine test: matrix transition allowed/forbidden
- Concurrency/idempotency test: duplicate weigh event, duplicate confirm, duplicate post
- Recovery test: M3 fail, M7 callback fail, OCR mismatch, retry same `external_id`

### 4.6 Vì sao nên giữ cùng stack với Module 1, 2, 3

- M1 là nền cho permission, reason code, audit, sequence, idempotency.
- M2 là nguồn master data cho owner/item/warehouse/location/tolerance/vehicle.
- M3 là inventory core engine mà M4 buộc phải gọi tại `RECEIVED`.
- Cùng stack giúp reuse guard, interceptor, request context, audit service, idempotency service, sequence service, migration style và code structure.

---

## 5. Kiến trúc tổng thể Module 4 trong hệ backend

```text
Web Admin / WB Console / Mobile / OCR / Weighbridge Agent (M8)
                           |
                           v
                 NestJS Inbound Controllers
                           |
      +--------------------+---------------------+
      |                    |                     |
      v                    v                     v
 Auth Guard         Permission Guard      Idempotency Guard
      |                    |                     |
      +--------------------+---------------------+
                           |
                           v
                 Inbound Application Layer
 +------------------+--------------------+-------------------+
 |                  |                    |                   |
 v                  v                    v                   v
Receipt Service  Weighing Service   Tolerance Service  Handoff Service
Matching Service Exception Service  Query Service      Recovery Service
                           |
                           v
                    Domain / Policy Layer
 +------------------+--------------------+-------------------+
 | State Machine    | Validation Policy  | Integration Rule  |
 | Tolerance Rule   | Cancel Policy      | Error Mapping     |
 | Reweigh Policy   | Bagged Rule        | Recovery Policy   |
 +------------------+--------------------+-------------------+
                           |
                           v
                      Repository Layer
                           |
                           v
   PostgreSQL + Redis + Outbox + Queue + Audit/Idempotency shared services
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa business logic.
- **Guard layer**: auth, permission, idempotency, request context.
- **Application services**: orchestration use case.
- **Domain/policy layer**: state machine, tolerance, cancel matrix, validation matrix, recovery rule.
- **Repository layer**: query/CRUD thuần.
- **Outbox/integration adapters**: tách riêng để không block transaction nghiệp vụ quá lâu.

### 5.2 Tư tưởng thiết kế cốt lõi

- Receipt lifecycle phải được quản bởi **state machine tập trung**, không rải rác ở controller.
- Weigh event cần **dedupe + correlate + audit** vì đây là vùng rủi ro cao nhất.
- Posting sang M3 và handoff sang M7 phải **transaction-safe ở mức M4**, nhưng vẫn chấp nhận eventual delivery bằng outbox.
- `receipt_status_history` và `receipt_exception_log` là capability bắt buộc để điều tra vận hành.
- Query nhanh cho trạm cân quan trọng ngang với CRUD admin; cần index tốt theo `vehicle_number`, `receipt_number`, `bl_number`, `status`, `created_at`.

---

## 6. Phân ranh runtime ownership giữa Module 4 và các module khác

| Concern | Module 4 sở hữu | Module khác sở hữu |
|---|---|---|
| Receipt lifecycle | Có | Không |
| Receipt status machine | Có | Không |
| Tolerance decision | Có | Không |
| Reject / re-weigh / cancel inbound | Có | Không |
| Weigh raw data capture | Không | M8 |
| OCR raw result | Không | M8 |
| Inventory posting ledger | Không | M3 |
| Putaway work execution | Không | M7 |
| Billing calculation | Không | M10 |
| Permission / reason code / audit / idempotency framework | Không, chỉ consume | M1 |
| Owner/item/warehouse/location/tolerance master | Không, chỉ consume | M2 |

### 6.1 Ánh xạ Module 4 với Module 1

Module 4 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được confirm receipt
   - ai được weigh-in / weigh-out
   - ai được manual weight
   - ai được cancel tại từng state
   - ai được close receipt
   - ai được override OCR/manual match

2. **Reason code**
   - manual weight
   - cancel receipt
   - manual match fallback
   - technical override / recovery decision

3. **Audit trail**
   - confirm receipt
   - thay đổi trạng thái
   - weigh event received
   - manual weight entry
   - reject / re-weigh / cancel
   - integration failure / retry

4. **Idempotency**
   - confirm receipt
   - weigh-in / weigh-out commands
   - reject/reweigh/cancel commands
   - handoff sang M3/M7/M10

5. **Number sequence**
   - sinh `receipt_number` theo sequence `RCV`

### 6.2 Ánh xạ Module 4 với Module 2

Module 4 consume master data từ Module 2 như sau:

1. `owner` → owner hợp lệ và owner default tolerance fallback
2. `vendor` → đối tác inbound hợp lệ
3. `item` → cargo form, tolerance inbound, billing_uom, bag weight baseline
4. `warehouse` → scope nhận hàng, default receiving location
5. `location` → receiving location hợp lệ và type phù hợp
6. `vehicle_type` → thông tin tham chiếu vận hành/billing nếu dùng
7. `owner_item_policy` → tolerance lookup ưu tiên cao
8. `uom/uom_conversion` → quy đổi nếu line dùng BAG/MT/KG

### 6.3 Ánh xạ Module 4 với Module 3

Module 4 gọi Module 3 ở đúng một posting point inventory:

1. **Receipt `WEIGHED_OUT` + tolerance PASS → `RECEIVED`**
2. M4 gửi command `PostInboundReceipt`
3. M3 tạo `InventDim`, `InventTrans`, cập nhật `OnHand` tại receiving location
4. M4 lưu `posted_trans_id` hoặc `posted_ref`
5. Nếu M3 fail, M4 **không** được tự sửa tồn; chỉ giữ receipt ở trạng thái recovery cần xử lý theo policy

### 6.4 Ánh xạ Module 4 với Module 7, 8, 10

- **M7**: sau khi `RECEIVED`, M4 tạo `CreatePutawayWork`; M7 thực thi work; khi work `COMPLETED`, callback `PutawayCompleted` để M4 chuyển receipt sang `PUTAWAY` rồi `CLOSED` theo rule.
- **M8**: M8 cung cấp `WeightCaptured`, `OCRMatched` và data cân/OCR; M4 map data đó vào receipt context và quyết định state nghiệp vụ.
- **M10**: M4 phát `InboundHandlingCaptured` hoặc tương đương khi receipt `RECEIVED`, để M10 capture handling/weighing event cho billing.

---

## 7. Đề xuất cấu trúc code backend cho Module 4

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
    inbound/
      inbound.module.ts
      controllers/
        receipt.controller.ts
        weighbridge.controller.ts
        inbound-query.controller.ts
        vessel-ocr.controller.ts
        inbound-admin.controller.ts
      services/
        receipt.service.ts
        receipt-command.service.ts
        receipt-query.service.ts
        receipt-state-machine.service.ts
        receipt-validation.service.ts
        matching.service.ts
        weighing.service.ts
        tolerance.service.ts
        reweigh.service.ts
        cancel.service.ts
        handoff.service.ts
        recovery.service.ts
        inbound-audit.service.ts
      repositories/
        receipt-header.repository.ts
        receipt-line.repository.ts
        receipt-weighing.repository.ts
        receipt-status-history.repository.ts
        receipt-exception.repository.ts
        receipt-integration.repository.ts
        receipt-outbox.repository.ts
      dto/
      entities/
      mappers/
      policies/
        receipt-state.policy.ts
        tolerance.policy.ts
        cancel.policy.ts
        bagged-overreceipt.policy.ts
        integration-recovery.policy.ts
      jobs/
        posting-retry.job.ts
        work-handoff-retry.job.ts
        stale-processing-recovery.job.ts
        daily-receipt-healthcheck.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không được tự gọi trực tiếp M3/M7/M10.
- Chỉ `receipt-command.service.ts` hoặc `handoff.service.ts` được phát side effect liên module.
- `receipt-state-machine.service.ts` là nơi duy nhất quyết định transition allowed/forbidden.
- `tolerance.service.ts` không được tự query UI payload thô; luôn nhận context đã validate.
- Repository không chứa nghiệp vụ tolerance/cancel/reweigh.
- Mọi command service phải nhận `requestContext` chứa `user_id`, `role`, `source_app`, `correlation_id`.
- Không service ngoài Module 4 được truy cập trực tiếp bảng receipt runtime nếu muốn đổi trạng thái nghiệp vụ.

---

## 8. Thiết kế database tổng thể cho Module 4

## 8.1 Nguyên tắc DB design

1. Tách `receipt_header` và `receipt_line` rõ ràng.
2. Tách weigh trail khỏi header để giữ lịch sử nhiều attempt sạch và audit được.
3. Tách status history và exception log khỏi header để trace tốt.
4. Dùng soft cancel/state terminal, không hard delete.
5. Mọi command side effect có `external_id`, `correlation_id`, `source_app`.
6. Thiết kế index ưu tiên cho `receipt_number`, `vehicle_number`, `bl_number`, `status`, `created_at`.
7. Dùng unique/index để bảo vệ duplicate create và duplicate weigh event.
8. Chừa đường mở rộng partial receipt/QC hold Phase 2 nhưng không thêm complexity runtime go-live.
9. Tách outbox/integration delivery state khỏi business state để tránh lẫn lộn.
10. Partition các bảng log/history lớn theo thời gian khi volume tăng.

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Runtime core
- `receipt_header`
- `receipt_line`
- `receipt_weighing_log`
- `receipt_bl_link`
- `receipt_vehicle_link`
- `receipt_putaway_link`

### 8.2.2 Control / traceability
- `receipt_status_history`
- `receipt_exception_log`
- `receipt_integration_state`
- `receipt_decision_snapshot`
- `receipt_outbox_event`

### 8.2.3 Optional support nên có ngay
- `receipt_attachment` *(ảnh phiếu cân, chứng từ scan; storage ở S3 nhưng metadata trong DB)*
- `receipt_search_cache` *(không bắt buộc; chỉ khi query console rất nặng)*

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `receipt_header`

Mục đích: object header nghiệp vụ cho 1 trip inbound.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| receipt_number | VARCHAR(40) | UNIQUE NOT NULL | `RCV-YYYYMMDD-SEQ` |
| receipt_type | VARCHAR(20) | NOT NULL | STANDARD / VESSEL |
| po_id | VARCHAR(50) | NOT NULL | ref source |
| asn_id | VARCHAR(50) | NULL | |
| owner_id | UUID | FK NOT NULL | → md_owner |
| vendor_id | UUID | FK NOT NULL | → md_vendor |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| receiving_location_id | UUID | FK NOT NULL | → md_location |
| vehicle_number | VARCHAR(30) | NOT NULL | normalized/searchable |
| bl_number | VARCHAR(50) | NULL | vessel only |
| expected_qty | NUMERIC(18,3) | NOT NULL | expected gross business qty |
| gross_weight_kg | NUMERIC(18,3) | NULL | denorm latest |
| tare_weight_kg | NUMERIC(18,3) | NULL | denorm latest |
| net_weight_kg | NUMERIC(18,3) | NULL | denorm latest |
| status | VARCHAR(30) | NOT NULL | DRAFT...CLOSED |
| attempt_number | INT | NOT NULL DEFAULT 1 | current attempt |
| tolerance_pct_applied | NUMERIC(8,4) | NULL | snapshot |
| variance_pct | NUMERIC(8,4) | NULL | snapshot |
| is_manual_entry | BOOLEAN | NOT NULL DEFAULT false | |
| manual_entry_reason_code | VARCHAR(50) | NULL | |
| posted_trans_id | VARCHAR(40) | NULL | ref M3 trans |
| putaway_work_id | VARCHAR(50) | NULL | ref M7 work |
| cancel_reason_code | VARCHAR(50) | NULL | |
| cancelled_by | UUID | NULL | |
| cancelled_at | TIMESTAMP | NULL | |
| external_id | VARCHAR(120) | NOT NULL | create/confirm idempotency |
| correlation_id | VARCHAR(120) | NOT NULL | trace |
| source_app | VARCHAR(30) | NOT NULL | WEB/WB/API/OCR |
| row_version | BIGINT | NOT NULL DEFAULT 0 | optimistic trace |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index khuyến nghị:**
- unique(`receipt_number`)
- unique(`external_id`) với create command context
- index(`vehicle_number`,`status`,`created_at` DESC)
- index(`bl_number`,`status`,`created_at` DESC)
- index(`owner_id`,`warehouse_id`,`status`,`created_at` DESC)
- index(`po_id`,`asn_id`)
- index(`status`,`created_at` DESC)
- index(`correlation_id`)

**Ghi chú thiết kế:**
- `gross_weight_kg`, `tare_weight_kg`, `net_weight_kg` là denorm latest view; lịch sử thật nằm ở `receipt_weighing_log`.
- `posted_trans_id` và `putaway_work_id` chỉ được set bởi service integration success.
- `vehicle_number` nên lưu normalized uppercase, trim, bỏ khoảng trắng thừa.

---

### 8.3.2 `receipt_line`

Mục đích: dòng hàng thuộc receipt.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| receipt_header_id | UUID | FK NOT NULL | → receipt_header |
| line_number | INT | NOT NULL | |
| item_id | UUID | FK NOT NULL | → md_item |
| uom_id | UUID | FK NOT NULL | → md_uom |
| expected_qty | NUMERIC(18,3) | NOT NULL | |
| received_qty | NUMERIC(18,3) | NULL | set khi RECEIVED |
| bag_count | INT | NULL | bagged only |
| nominal_weight_per_bag | NUMERIC(18,3) | NULL | bagged only |
| cargo_form | VARCHAR(30) | NOT NULL | BULK/BAGGED... |
| status | VARCHAR(30) | NOT NULL DEFAULT 'OPEN' | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Unique:**
- unique(`receipt_header_id`,`line_number`)

**Index:**
- index(`item_id`,`cargo_form`)
- index(`receipt_header_id`,`status`)

**Ghi chú:**
- Phase 1 khuyến nghị 1 receipt = 1 line hàng chính; nhưng schema vẫn cho multi-line để không phá tương lai.
- Nếu go-live khóa single-line, validation phải chặn ở service, không cần bỏ schema multi-line.

---

### 8.3.3 `receipt_weighing_log`

Mục đích: lưu mọi log weigh-in / weigh-out / manual override / re-weigh attempt.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| receipt_header_id | UUID | FK NOT NULL | |
| attempt_number | INT | NOT NULL | |
| weigh_phase | VARCHAR(20) | NOT NULL | IN / OUT |
| ticket_id | VARCHAR(80) | NULL | weighbridge ticket |
| event_id | VARCHAR(120) | NULL | source event dedupe key |
| gross_weight_kg | NUMERIC(18,3) | NULL | use for IN |
| tare_weight_kg | NUMERIC(18,3) | NULL | use for OUT |
| net_weight_kg | NUMERIC(18,3) | NULL | optional snapshot |
| is_manual | BOOLEAN | NOT NULL DEFAULT false | |
| manual_reason_code | VARCHAR(50) | NULL | |
| source_app | VARCHAR(30) | NOT NULL | WEIGHBRIDGE_AGENT / WEB |
| event_timestamp | TIMESTAMP | NOT NULL | source timestamp |
| received_at | TIMESTAMP | NOT NULL | system receive time |
| raw_payload | JSONB | NULL | for forensic/debug |
| created_by | UUID | NULL | system/user |
| created_at | TIMESTAMP | NOT NULL | |

**Index khuyến nghị:**
- unique(`event_id`) where event_id is not null
- unique(`ticket_id`,`weigh_phase`) where ticket_id is not null
- index(`receipt_header_id`,`attempt_number`,`weigh_phase`)
- index(`event_timestamp` DESC)

**Ghi chú:**
- Đây là bảng cực kỳ quan trọng cho dispute và duplicate prevention.
- `raw_payload` nên được giữ có kiểm soát, tránh PII không cần thiết.

---

### 8.3.4 `receipt_status_history`

Mục đích: append-only history cho mọi transition state.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| receipt_header_id | UUID | FK NOT NULL |
| from_status | VARCHAR(30) | NULL |
| to_status | VARCHAR(30) | NOT NULL |
| transition_code | VARCHAR(30) | NOT NULL |
| triggered_by | UUID | NULL |
| trigger_role | VARCHAR(50) | NULL |
| reason_code | VARCHAR(50) | NULL |
| note | TEXT | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |
| occurred_at | TIMESTAMP | NOT NULL |
| metadata | JSONB | NULL |

**Index:**
- index(`receipt_header_id`,`occurred_at` DESC)
- index(`to_status`,`occurred_at` DESC)

---

### 8.3.5 `receipt_exception_log`

Mục đích: ghi lỗi/ngoại lệ nghiệp vụ và kỹ thuật gắn với receipt.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| receipt_header_id | UUID | FK NULL |
| exception_type | VARCHAR(50) | NOT NULL |
| severity | VARCHAR(20) | NOT NULL |
| stage | VARCHAR(30) | NOT NULL |
| reason_code | VARCHAR(50) | NULL |
| message | TEXT | NOT NULL |
| details | JSONB | NULL |
| integration_target | VARCHAR(30) | NULL |
| external_id | VARCHAR(120) | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |
| occurred_by | UUID | NULL |
| occurred_at | TIMESTAMP | NOT NULL |
| is_resolved | BOOLEAN | NOT NULL DEFAULT false |
| resolved_at | TIMESTAMP | NULL |
| resolved_by | UUID | NULL |

**Index:**
- index(`receipt_header_id`,`occurred_at` DESC)
- index(`exception_type`,`severity`,`occurred_at` DESC)
- index(`integration_target`,`is_resolved`)

---

### 8.3.6 `receipt_integration_state`

Mục đích: tách trạng thái delivery integration khỏi trạng thái business của receipt.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| receipt_header_id | UUID | FK NOT NULL |
| target_module | VARCHAR(20) | NOT NULL |
| action_code | VARCHAR(40) | NOT NULL |
| delivery_status | VARCHAR(20) | NOT NULL |
| attempt_count | INT | NOT NULL DEFAULT 0 |
| last_request_payload | JSONB | NULL |
| last_response_payload | JSONB | NULL |
| last_error_code | VARCHAR(50) | NULL |
| last_error_message | TEXT | NULL |
| next_retry_at | TIMESTAMP | NULL |
| last_attempt_at | TIMESTAMP | NULL |
| completed_at | TIMESTAMP | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |
| external_id | VARCHAR(120) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Unique:**
- unique(`receipt_header_id`,`target_module`,`action_code`)

**Ghi chú:**
- Các giá trị ví dụ `delivery_status`: PENDING / PROCESSING / SUCCEEDED / FAILED / DEAD_LETTER.
- Không dùng trường này để suy ra business state.

---

### 8.3.7 `receipt_outbox_event`

Mục đích: outbox pattern cho delivery an toàn sang M3, M7, M10.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| event_type | VARCHAR(50) | NOT NULL |
| aggregate_type | VARCHAR(30) | NOT NULL |
| aggregate_id | UUID | NOT NULL |
| event_key | VARCHAR(120) | UNIQUE NOT NULL |
| payload | JSONB | NOT NULL |
| status | VARCHAR(20) | NOT NULL |
| retry_count | INT | NOT NULL DEFAULT 0 |
| next_retry_at | TIMESTAMP | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| published_at | TIMESTAMP | NULL |

**Index:**
- index(`status`,`next_retry_at`)
- index(`aggregate_type`,`aggregate_id`)

---

## 8.4 Quan hệ dữ liệu chính

```text
receipt_header 1---N receipt_line
receipt_header 1---N receipt_weighing_log
receipt_header 1---N receipt_status_history
receipt_header 1---N receipt_exception_log
receipt_header 1---N receipt_integration_state
receipt_header 1---N receipt_outbox_event
receipt_header 1---1 receipt_putaway_link (logical)
receipt_header N---1 md_owner / md_vendor / md_warehouse / md_location
receipt_line   N---1 md_item / md_uom
```

---

## 9. State machine kỹ thuật và nguyên tắc implement

## 9.1 State chính

- `DRAFT`
- `AWAITING_WEIGHING`
- `WEIGHED_IN`
- `PROCESSING`
- `WEIGHED_OUT`
- `RECEIVED`
- `PUTAWAY`
- `CLOSED`
- `REJECTED`
- `CANCELLED`

## 9.2 Nguyên tắc implement

1. Mọi transition phải đi qua `receipt-state-machine.service.ts`.
2. Mọi transition phải được validate bằng `from_status + action + role + guard`.
3. Backend phải chặn forbidden transition, không phụ thuộc UI.
4. Sau mỗi transition, bắt buộc ghi `receipt_status_history`.
5. State terminal `CLOSED`, `CANCELLED` không được mở lại bằng update tay.
6. `RECEIVED` là state có side effect inventory và billing/handoff.
7. `PUTAWAY` chỉ là business state phản ánh handoff/work completion; movement inventory của putaway vẫn do M7 + M3 xử lý.

## 9.3 Transition map rút gọn

| Action | From | To | Side Effect |
|---|---|---|---|
| confirmReceipt | DRAFT | AWAITING_WEIGHING | sinh `receipt_number` nếu chưa có |
| weighIn | AWAITING_WEIGHING | WEIGHED_IN | lưu gross weigh log |
| startProcessing | WEIGHED_IN | PROCESSING | mark processing_started_at logical |
| weighOut | PROCESSING | WEIGHED_OUT | lưu tare weigh log + tính net |
| autoAccept | WEIGHED_OUT | RECEIVED | tạo outbox `PostInboundReceipt`, `CreatePutawayWork`, `InboundHandlingCaptured` |
| autoReject | WEIGHED_OUT | REJECTED | lưu snapshot variance/tolerance |
| reweigh | REJECTED | AWAITING_WEIGHING | tăng attempt, reset latest weights logic |
| cancelDraft | DRAFT | CANCELLED | audit |
| cancelWaiting | AWAITING_WEIGHING | CANCELLED | audit + reason |
| cancelWeighedIn | WEIGHED_IN | CANCELLED | audit + reason |
| cancelProcessing | PROCESSING | CANCELLED | audit + reason |
| putawayCompleted | RECEIVED | PUTAWAY | set work complete |
| closeReceipt | PUTAWAY | CLOSED | immutable business close |

---

## 10. Luồng thực hiện từ database → backend → integration

## 10.1 Happy path chuẩn — Standard Inbound

### Bước 1: Tạo receipt
- User/API tạo receipt header + line.
- DB ghi `receipt_header(status=DRAFT)` và `receipt_line`.
- Chưa có tồn kho, chưa có weigh log.

### Bước 2: Confirm receipt
- Service validate owner/vendor/item/warehouse/location active từ M2.
- Service check permission từ M1.
- Sequence `RCV` từ M1 sinh `receipt_number`.
- State chuyển `DRAFT → AWAITING_WEIGHING`.
- Ghi `receipt_status_history`.

### Bước 3: Nhận weigh-in từ M8
- M8 gửi event `WeightCaptured` cho gross.
- Service dedupe theo `event_id` hoặc `ticket_id`.
- Ghi `receipt_weighing_log(phase=IN)`.
- Cập nhật denorm `gross_weight_kg` trên header.
- State chuyển `AWAITING_WEIGHING → WEIGHED_IN`.

### Bước 4: Processing
- Operator xác nhận xe vào yard / dỡ hàng.
- State chuyển `WEIGHED_IN → PROCESSING`.

### Bước 5: Nhận weigh-out từ M8
- M8 gửi tare.
- Dedupe tương tự weigh-in.
- Ghi `receipt_weighing_log(phase=OUT)`.
- Tính `net_weight_kg = gross - tare`.
- Cập nhật denorm trên header.
- State chuyển `PROCESSING → WEIGHED_OUT`.

### Bước 6: Tolerance check
- Service lookup tolerance theo hierarchy từ M2.
- Tính variance.
- Nếu fail → `REJECTED`.
- Nếu pass → tiếp tục `RECEIVED`.

### Bước 7: Receipt accepted
- State chuyển `WEIGHED_OUT → RECEIVED`.
- Ghi `receipt_status_history`.
- Tạo outbox:
  - `PostInboundReceipt` → M3
  - `CreatePutawayWork` → M7
  - `InboundHandlingCaptured` → M10

### Bước 8: M3 post inventory
- M3 nhận command, validate, tạo `InventTrans` inbound và update `OnHand`.
- M4 nhận success callback/response, lưu `posted_trans_id`.
- Nếu fail, M4 giữ business state theo recovery policy, không tự sửa tồn.

### Bước 9: M7 tạo và hoàn tất putaway
- M7 tạo work thành công, callback `work_id` cho M4.
- Khi work hoàn tất, M7 callback `PutawayCompleted`.
- M4 chuyển `RECEIVED → PUTAWAY`.

### Bước 10: Close
- Khi không còn work pending, manager/service cho close.
- State `PUTAWAY → CLOSED`.
- Receipt business immutable.

---

## 10.2 Happy path — Vessel / B/L-based Inbound

So với standard flow, khác biệt ở đầu vào:
- OCR scan B/L từ M8.
- `matching.service.ts` cố match `bl_number → owner/PO/receipt candidate`.
- Nếu confidence đủ và đúng business scope → auto-suggest.
- Nếu không → WB_OPERATOR chọn tay, nhưng phải audit.
- Các bước sau weigh-in / weigh-out / tolerance / received giống standard flow.

---

## 10.3 Exception path — Tolerance fail và re-weigh

### Lần fail đầu
- Sau `WEIGHED_OUT`, tolerance fail.
- State `REJECTED`.
- Ghi `receipt_exception_log`.
- Không tạo `PostInboundReceipt`.
- Không tạo tồn kho.

### Re-weigh
- Operator khởi tạo re-weigh.
- Tăng `attempt_number`.
- State `REJECTED → AWAITING_WEIGHING`.
- Giữ nguyên `receipt_number`.
- Attempt mới sẽ tạo weigh logs mới.

### Sau 3 lần fail
- Chặn action re-weigh.
- Chỉ manager được cancel theo policy.
- Không cho auto-approve inbound tolerance.

---

## 10.4 Technical recovery path — M3 post fail

### Trường hợp điển hình
- Receipt đã pass tolerance.
- M4 đã tạo outbox `PostInboundReceipt`.
- M3 reject do master mismatch hoặc technical error.

### Nguyên tắc xử lý
1. Không tạo duplicate outbox event mới bằng key khác.
2. Không update tay inventory.
3. Ghi `receipt_integration_state(target=M3)` thành FAILED/RETRY.
4. Cho retry theo scheduler/job với cùng `external_id`.
5. Nếu đã post thành công ở M3 nhưng callback về M4 fail, retry phải là idempotent và chỉ đồng bộ lại `posted_trans_id`.

### Khuyến nghị state business
- Giữ `RECEIVED` là business accepted state.
- Tách delivery status kỹ thuật ở `receipt_integration_state`.
- UI phải hiển thị rõ: `RECEIVED / inventory sync pending` hoặc `RECEIVED / inventory sync failed`.

---

## 10.5 Technical recovery path — M7 work creation fail

- Receipt đã `RECEIVED`.
- Command `CreatePutawayWork` fail hoặc timeout.
- Không rollback inventory inbound của M3.
- Tạo retry bằng outbox/job.
- UI hiển thị `receipt needs putaway handoff recovery`.
- Khi M7 tạo work thành công, cập nhật `putaway_work_id` và tiếp tục flow.

---

## 10.6 Technical recovery path — Duplicate weigh event

- Event đến từ M8 có cùng `event_id` hoặc `ticket_id`.
- Backend lookup `receipt_weighing_log`.
- Nếu đã tồn tại, trả acknowledged/idempotent result.
- Không thêm log mới, không đổi state lần nữa.

---

## 11. Thiết kế service layer chi tiết

## 11.1 `receipt-command.service.ts`

Chịu trách nhiệm cho:
- create receipt
- confirm receipt
- close receipt
- orchestration command side effect

Không xử lý trực tiếp tolerance formula hay weigh event parsing sâu.

## 11.2 `receipt-state-machine.service.ts`

Chịu trách nhiệm cho:
- validate allowed transition
- enforce forbidden transitions
- mapping action → from/to status
- append status history

Đây là service lõi nhất của M4.

## 11.3 `weighing.service.ts`

Chịu trách nhiệm cho:
- nhận weigh event từ M8 hoặc manual command
- dedupe event
- validate gross/tare hợp lệ
- ghi `receipt_weighing_log`
- cập nhật latest weight snapshot trên header
- trigger transition tương ứng

## 11.4 `tolerance.service.ts`

Chịu trách nhiệm cho:
- lookup tolerance từ M2
- tính variance
- áp rule bagged/bulk
- quyết định PASS/FAIL
- ghi snapshot decision

## 11.5 `matching.service.ts`

Chịu trách nhiệm cho:
- tìm receipt candidate theo vehicle/PO/ASN/BL
- OCR-assisted matching
- manual fallback
- audit manual override

## 11.6 `handoff.service.ts`

Chịu trách nhiệm cho:
- build payload chuẩn sang M3/M7/M10
- push outbox event
- sync `receipt_integration_state`
- nhận callback thành công/thất bại

## 11.7 `recovery.service.ts`

Chịu trách nhiệm cho:
- retry job
- reconcile state delivery
- detect stale PROCESSING / stale RECEIVED without work link
- cung cấp admin action retry-safe

---

## 12. API design chi tiết cho Module 4

> Nguyên tắc chung:
- Mọi API side effect phải nhận `external_id` nếu có nguy cơ retry từ client/integration.
- Mọi API phải nhận/được gắn `correlation_id`.
- Permission kiểm ở backend.
- Response nên trả `receipt_id`, `receipt_number`, `status`, `correlation_id`.

## 12.1 Receipt commands

### 12.1.1 `POST /inbound/receipts`
**Mục đích:** tạo receipt mới từ PO/ASN hoặc context nhập hàng.  
**Ai gọi:** Web admin / integration / upstream planning.  
**Idempotency:** `external_id` bắt buộc.  
**Build hướng:** create header + line trong 1 transaction DB, status `DRAFT`.

**Request tối thiểu**
```json
{
  "external_id": "ext-rcv-create-001",
  "receipt_type": "STANDARD",
  "po_id": "PO-0001",
  "asn_id": "ASN-0001",
  "owner_id": "uuid-owner",
  "vendor_id": "uuid-vendor",
  "warehouse_id": "uuid-wh",
  "receiving_location_id": "uuid-loc",
  "vehicle_number": "51D12345",
  "expected_qty": 30300,
  "lines": [
    {
      "item_id": "uuid-item",
      "uom_id": "uuid-uom-kg",
      "expected_qty": 30300,
      "cargo_form": "BULK"
    }
  ]
}
```

**Response tối thiểu**
```json
{
  "receipt_id": "uuid",
  "receipt_number": null,
  "status": "DRAFT",
  "correlation_id": "corr-..."
}
```

**Validate chính**
- owner/vendor/warehouse/location/item active
- receiving location type hợp lệ
- line không rỗng
- bagged line phải có field bag_count/nominal weight khi bắt buộc

---

### 12.1.2 `POST /inbound/receipts/{id}/confirm`
**Mục đích:** confirm receipt để vào `AWAITING_WEIGHING`.  
**Ai gọi:** WH_MANAGER / role được phép.  
**Idempotency:** `external_id` bắt buộc.  
**Build hướng:** dùng state machine, sequence M1, status history.

**Side effects**
- sinh `receipt_number` nếu chưa có
- `DRAFT → AWAITING_WEIGHING`

**Không làm**
- không tạo weigh log
- không post inventory

---

### 12.1.3 `POST /inbound/receipts/{id}/cancel`
**Mục đích:** hủy receipt ở state được phép.  
**Ai gọi:** WH_MANAGER / WH_ADMIN theo policy.  
**Idempotency:** `external_id` bắt buộc.  
**Build hướng:** validate state + reason code + permission.

**Request**
```json
{
  "external_id": "ext-rcv-cancel-001",
  "reason_code": "RCV_CANCEL_BY_MANAGER",
  "note": "Vehicle no-show / operation stop"
}
```

**Validate chính**
- chỉ cho các state `DRAFT`, `AWAITING_WEIGHING`, `WEIGHED_IN`, `PROCESSING`
- nếu đã `RECEIVED` trở đi thì reject và hướng sang module adjustment/reverse policy

---

### 12.1.4 `POST /inbound/receipts/{id}/reweigh`
**Mục đích:** đưa receipt `REJECTED` về `AWAITING_WEIGHING`.  
**Ai gọi:** WB_OPERATOR / role phù hợp.  
**Build hướng:** tăng `attempt_number`, không đổi `receipt_number`, append history.

**Validate chính**
- current state = `REJECTED`
- `attempt_number < 3`

---

### 12.1.5 `POST /inbound/receipts/{id}/close`
**Mục đích:** close receipt sau putaway hoàn tất.  
**Ai gọi:** WH_MANAGER / system.  
**Build hướng:** `PUTAWAY → CLOSED` nếu không còn work pending.

---

## 12.2 Weighbridge / OCR commands

### 12.2.1 `POST /inbound/weigh-events/in`
**Mục đích:** nhận gross weight cho receipt.  
**Ai gọi:** M8 / local agent / console.  
**Idempotency:** `event_id` hoặc `ticket_id`.

**Request**
```json
{
  "event_id": "wb-in-001",
  "receipt_id": "uuid",
  "ticket_id": "TICKET-001",
  "gross_weight_kg": 45200,
  "timestamp": "2026-03-08T09:00:00+07:00",
  "source_app": "WEIGHBRIDGE_AGENT"
}
```

**Build hướng**
- dedupe by `event_id`/`ticket_id`
- validate state = `AWAITING_WEIGHING`
- log weigh event
- update latest gross
- move `WEIGHED_IN`

---

### 12.2.2 `POST /inbound/weigh-events/out`
**Mục đích:** nhận tare weight cho receipt.  
**Ai gọi:** M8 / local agent / console.  
**Idempotency:** `event_id` hoặc `ticket_id`.

**Build hướng**
- validate state = `PROCESSING`
- tare > 0 và tare < gross
- calculate net
- log weigh-out
- move `WEIGHED_OUT`
- gọi tolerance service

---

### 12.2.3 `POST /inbound/receipts/{id}/manual-weight`
**Mục đích:** nhập tay gross/tare khi weighbridge fail.  
**Ai gọi:** WH_MANAGER.  
**Idempotency:** `external_id` bắt buộc.  
**Build hướng:** cùng logic với weigh event nhưng `is_manual = true`, bắt buộc reason code.

**Request**
```json
{
  "external_id": "ext-manual-weight-001",
  "phase": "OUT",
  "weight_kg": 14900,
  "reason_code": "MANUAL_WEIGHT_SCALE_FAIL",
  "note": "Scale offline, paper ticket verified"
}
```

---

### 12.2.4 `POST /inbound/ocr-results`
**Mục đích:** nhận kết quả OCR scan B/L.  
**Ai gọi:** M8 OCR adapter.  
**Idempotency:** `ocr_job_id`.  
**Build hướng:** lưu raw OCR result, match candidate, trả suggestion cho operator hoặc auto-link nếu chính sách cho phép.

---

### 12.2.5 `POST /inbound/receipts/{id}/manual-match`
**Mục đích:** operator xác nhận hoặc chỉnh candidate match cho vehicle/B/L.  
**Ai gọi:** WB_OPERATOR.  
**Build hướng:** update context trước `WEIGHED_IN`, bắt buộc audit.

---

## 12.3 Query APIs

### 12.3.1 `GET /inbound/receipts`
**Mục đích:** search receipt theo vehicle, BL, PO, ASN, status, date range.  
**Ai gọi:** WB console, admin, ops.  
**Build hướng:** tối ưu cho search nhanh tại trạm cân.

**Filter gợi ý**
- `receipt_number`
- `vehicle_number`
- `bl_number`
- `po_id`
- `asn_id`
- `status`
- `warehouse_id`
- `date_from`, `date_to`

---

### 12.3.2 `GET /inbound/receipts/{id}`
**Mục đích:** lấy detail full của 1 receipt.  
**Bao gồm:** header, lines, latest weight, status history summary, integration state, exception flags.

---

### 12.3.3 `GET /inbound/receipts/{id}/history`
**Mục đích:** truy vết đầy đủ lifecycle của receipt.  
**Bao gồm:** status history + weighing logs + exception logs.

---

### 12.3.4 `GET /inbound/receipts/{id}/integration-status`
**Mục đích:** xem trạng thái sync/handoff với M3, M7, M10.  
**Dùng cho:** support, ops, admin recovery.

---

### 12.3.5 `GET /inbound/dashboard/summary`
**Mục đích:** thống kê vận hành inbound cơ bản.  
**Chỉ số gợi ý:** receipts by status, reject rate, reweigh count, avg weigh latency, pending putaway count.

---

## 12.4 Admin / recovery APIs

### 12.4.1 `POST /inbound/receipts/{id}/retry-posting`
**Mục đích:** retry handoff sang M3 an toàn.  
**Ai gọi:** Admin / Ops support.  
**Build hướng:** không tạo key mới; reuse event/outbox cũ nếu có.

### 12.4.2 `POST /inbound/receipts/{id}/retry-putaway-handoff`
**Mục đích:** retry gửi `CreatePutawayWork` sang M7.  
**Build hướng:** idempotent theo `receipt_id + work_type`.

### 12.4.3 `POST /inbound/receipts/{id}/resolve-exception`
**Mục đích:** mark exception resolved kèm note.  
**Không phải:** sửa business state trái rule.

---

## 13. Validation matrix kỹ thuật cần code

## 13.1 Create receipt

- owner active
- vendor active
- warehouse active
- receiving location active và type = RECEIVING
- item active
- cargo_form hợp lệ
- bagged line có `bag_count` nếu bắt buộc
- duplicate `external_id` → trả kết quả cũ

## 13.2 Confirm receipt

- current state = `DRAFT`
- line tồn tại
- receiving location hợp lệ
- permission hợp lệ

## 13.3 Weigh-in

- current state = `AWAITING_WEIGHING`
- gross > 0
- duplicate event blocked

## 13.4 Weigh-out

- current state = `PROCESSING`
- gross đã có
- tare > 0
- tare < gross

## 13.5 Tolerance check

- expected_qty > 0
- net_weight > 0
- tolerance lookup ra giá trị cuối cùng
- với bagged inbound, over-receipt rule phải pass trước khi cho `RECEIVED`

## 13.6 Cancel

- state nằm trong tập được phép
- reason_code bắt buộc
- nếu đã post inventory thì reject API

## 13.7 Close

- state = `PUTAWAY`
- không còn work pending

---

## 14. Error code baseline đề xuất

| Code | Khi nào dùng | HTTP |
|---|---|---|
| `INB-400-INVALID_STATE` | Action không hợp lệ với state hiện tại | 400 |
| `INB-400-INVALID_WEIGHT` | Gross/tare/net không hợp lệ | 400 |
| `INB-400-TOLERANCE_LOOKUP_FAIL` | Không resolve được tolerance | 400/422 |
| `INB-400-BAGGED_OVER_RECEIPT` | Vượt bag count/PO rule | 422 |
| `INB-403-FORBIDDEN_ACTION` | Không đủ quyền | 403 |
| `INB-404-RECEIPT_NOT_FOUND` | Không tìm thấy receipt | 404 |
| `INB-409-DUPLICATE_EXTERNAL_ID` | Lặp command key khác payload | 409 |
| `INB-409-DUPLICATE_WEIGHT_EVENT` | Event cân trùng | 409/idempotent |
| `INB-409-REWEIGH_LIMIT_REACHED` | Đã vượt 3 attempts | 409 |
| `INB-409-ALREADY_POSTED` | Đã post tồn, không thể cancel thường | 409 |
| `INB-422-MASTER_REFERENCE_INVALID` | Owner/item/location không hợp lệ | 422 |
| `INB-503-M3_POSTING_UNAVAILABLE` | M3 tạm unavailable | 503 |
| `INB-503-M7_HANDOFF_UNAVAILABLE` | M7 tạm unavailable | 503 |

---

## 15. Integration contract gợi ý để build

## 15.1 M8 → M4: WeightCaptured

```json
{
  "event_id": "wb-evt-001",
  "receipt_id": "uuid",
  "ticket_id": "WB-240308-001",
  "phase": "IN",
  "weight_kg": 45200,
  "timestamp": "2026-03-08T09:00:00+07:00",
  "source_app": "WEIGHBRIDGE_AGENT",
  "correlation_id": "corr-123"
}
```

**Dedupe key:** `event_id` hoặc `ticket_id`  
**Consumer behavior:** idempotent accept, no duplicate state transition.

## 15.2 M8 → M4: OCRMatched

```json
{
  "ocr_job_id": "ocr-001",
  "bl_number": "BL-7788",
  "confidence": 0.91,
  "candidates": [
    {"po_id": "PO-1", "owner_id": "uuid-owner", "score": 0.91}
  ],
  "scan_time": "2026-03-08T09:01:00+07:00",
  "correlation_id": "corr-123"
}
```

**Dedupe key:** `ocr_job_id`

## 15.3 M4 → M3: PostInboundReceipt

```json
{
  "external_id": "ext-post-rcv-001",
  "correlation_id": "corr-123",
  "receipt_id": "uuid-receipt",
  "receipt_number": "RCV-20260308-000001",
  "owner_id": "uuid-owner",
  "warehouse_id": "uuid-wh",
  "receiving_location_id": "uuid-recv-loc",
  "lines": [
    {
      "receipt_line_id": "uuid-line",
      "item_id": "uuid-item",
      "qty": 30300,
      "uom_code": "KG"
    }
  ],
  "source_app": "INBOUND"
}
```

**Idempotency key:** `external_id`  
**Expected response:** `trans_id`, success/fail, error detail.

## 15.4 M4 → M7: CreatePutawayWork

```json
{
  "external_id": "ext-putaway-001",
  "correlation_id": "corr-123",
  "receipt_id": "uuid-receipt",
  "receipt_number": "RCV-20260308-000001",
  "source_location_id": "uuid-recv-loc",
  "warehouse_id": "uuid-wh",
  "owner_id": "uuid-owner",
  "lines": [
    {
      "receipt_line_id": "uuid-line",
      "item_id": "uuid-item",
      "qty": 30300,
      "uom_code": "KG"
    }
  ]
}
```

**Idempotency key:** `receipt_id + work_type` hoặc `external_id`

## 15.5 M7 → M4: PutawayCompleted

```json
{
  "event_id": "work-complete-001",
  "work_id": "WRK-20260308-000010",
  "receipt_id": "uuid-receipt",
  "status": "COMPLETED",
  "completed_at": "2026-03-08T11:00:00+07:00",
  "correlation_id": "corr-123"
}
```

## 15.6 M4 → M10: InboundHandlingCaptured

```json
{
  "external_id": "ext-billing-capture-001",
  "correlation_id": "corr-123",
  "receipt_id": "uuid-receipt",
  "owner_id": "uuid-owner",
  "item_id": "uuid-item",
  "cargo_form": "BULK",
  "warehouse_id": "uuid-wh",
  "net_weight_mt": 30.3,
  "event_timestamp": "2026-03-08T10:00:00+07:00"
}
```

---

## 16. Tolerance engine và business formula cần build

## 16.1 Công thức variance

```text
variance_pct = ABS(net_weight - expected_qty) / expected_qty * 100
```

## 16.2 Tolerance lookup hierarchy

Khuyến nghị bám theo M2:
1. `owner_item_policy.tolerance_pct_inbound`
2. `item.tolerance_pct_inbound`
3. `owner.default_tolerance_pct`
4. `system default` *(nếu dự án quyết định có)*

## 16.3 Pseudocode

```text
function evaluateInboundTolerance(receipt):
  tolerance = getTolerance(owner_id, item_id)
  if tolerance is null:
    throw TOLERANCE_LOOKUP_FAIL

  variance = abs(net_weight - expected_qty) / expected_qty * 100

  if cargo_form is bagged:
    validateBaggedPOOverReceipt()

  if variance <= tolerance:
    return PASS
  else:
    return FAIL
```

## 16.4 Bagged over-receipt rule

```text
sum(received bag_count of same PO in RECEIVED/PUTAWAY/CLOSED) + current bag_count <= po.expected_bag_count
```

Nếu vượt → block `RECEIVED`.

---

## 17. Concurrency, locking và idempotency strategy

## 17.1 Vì sao M4 cần idempotency mạnh

Các nguồn retry thực tế:
- weighbridge agent gửi lại do mạng chập chờn
- OCR callback gửi lại
- user double-click confirm/cancel
- admin retry posting/work handoff

## 17.2 Chiến lược đề xuất

1. **Command idempotency** qua Module 1 `idempotency_record`
2. **Event dedupe** tại `receipt_weighing_log` bằng `event_id`/`ticket_id`
3. **Optimistic row version** trên `receipt_header` để detect concurrent update bất thường
4. **Transaction DB** cho cập nhật state + history + integration state/outbox cùng lúc

## 17.3 Trường hợp cần row lock

- confirm receipt nếu nhiều actor cùng thao tác
- weigh-out ngay sau weigh-in khi có race condition callback
- reweigh/cancel cạnh tranh nhau

Khuyến nghị:
- dùng `SELECT ... FOR UPDATE` trên `receipt_header` ở các command đổi state.

---

## 18. Non-functional requirements kỹ thuật cho Module 4

1. Search receipt theo biển số/BL/ASN đủ nhanh cho console trạm cân.
2. Từ khi nhận event cân đến phản hồi nghiệp vụ phải nằm trong ngưỡng thấp, hướng mục tiêu dưới 2 giây ở integration path ổn định.
3. Không tạo duplicate receipt/post/work trong mọi case retry phổ biến.
4. Mọi lần cân, reject, reweigh, cancel, manual override đều truy vết được.
5. Tối thiểu 7 năm retention cho log/audit theo baseline hệ thống.
6. Có khả năng retry an toàn cho integration fail.
7. Có dashboard/support query để phát hiện receipt kẹt ở `RECEIVED` nhưng chưa có work hoặc chưa sync inventory.

---

## 19. Chiến lược index, archive, scale

## 19.1 Index quan trọng nhất

- `receipt_header(receipt_number)` unique
- `receipt_header(vehicle_number, status, created_at desc)`
- `receipt_header(bl_number, status, created_at desc)`
- `receipt_status_history(receipt_header_id, occurred_at desc)`
- `receipt_weighing_log(receipt_header_id, attempt_number, weigh_phase)`
- `receipt_integration_state(target_module, delivery_status, next_retry_at)`

## 19.2 Partition nên chuẩn bị

Khi volume tăng, nên partition theo tháng cho:
- `receipt_status_history`
- `receipt_exception_log`
- `receipt_weighing_log`
- `receipt_outbox_event`

## 19.3 Vì sao schema này scale tốt cho module sau

- Module 5 có thể reuse pattern shipment status history / weighing log.
- Module 7 có thể consume handoff contract ổn định.
- Module 8 dễ map event vì M4 có bảng integration/dedupe rõ ràng.
- Module 10 nhận event sạch, không phải suy luận từ document thô.
- Module 11 reporting có thể drill-down đầy đủ theo receipt lifecycle.

---

## 20. Mapping với các module sau này

## 20.1 Với Module 5 — Outbound

Pattern tái sử dụng:
- state machine service
- weighing log design
- integration state/outbox design
- exception log design

Khác biệt:
- outbound có allocation/hold và flexible weighing sequence phức tạp hơn.

## 20.2 Với Module 6 — Inventory Control

M4 tạo inbound stock đầu vào; M6 sẽ xử lý adjustment/move/status/count sau đó.  
M4 tuyệt đối không làm thay M6.

## 20.3 Với Module 7 — Work Execution

M4 là nơi **tạo nhu cầu putaway**.  
M7 là nơi **thực thi task putaway**.  
Contract giữa 2 module cần được coi là stable public interface nội bộ.

## 20.4 Với Module 8 — Weighbridge/OCR/Integration

M8 nên được coi như **data provider + integration adapter**, không phải nơi quyết định nghiệp vụ inbound.  
M4 là consumer business-aware của data đó.

## 20.5 Với Module 10 — Billing

M10 không nên suy luận handling từ raw weigh log.  
M10 chỉ nên consume event business sạch từ M4 và transaction/snapshot truth từ M3.

---

## 21. Trình tự implement khuyến nghị cho dev team

### Giai đoạn 1 — Core model
1. DB schema core
2. CRUD + query receipt cơ bản
3. state machine service
4. confirm/cancel/close APIs

### Giai đoạn 2 — Weigh flow
5. weigh-in / weigh-out APIs
6. weighing log + dedupe
7. tolerance service
8. reject/reweigh flow

### Giai đoạn 3 — Integrations
9. M4 → M3 posting outbox
10. M4 → M7 work handoff outbox
11. M4 → M10 billing event outbox
12. M8 weight/OCR ingest APIs

### Giai đoạn 4 — Recovery & supportability
13. integration state tracking
14. retry jobs
15. admin recovery APIs
16. dashboard/support queries

### Giai đoạn 5 — Hardening
17. concurrency tests
18. state transition forbidden tests
19. high-volume weigh event tests
20. UAT defect hardening

---

## 22. Checklist hoàn thiện cho dev intern

Một dev intern được xem là hiểu đúng Module 4 khi trả lời được các câu sau:

1. Receipt có phải nguồn sự thật tồn kho không? → Không.
2. Khi nào M4 được cộng tồn? → Không bao giờ trực tiếp; chỉ gọi M3 tại `RECEIVED`.
3. Vì sao cần `receipt_weighing_log` riêng? → để audit, dedupe, nhiều attempt, dispute.
4. Vì sao cần `receipt_integration_state` riêng? → để tách business state và delivery state kỹ thuật.
5. Vì sao không cancel `RECEIVED` như `DRAFT`? → vì đã có/chuẩn bị có inventory truth; correction phải đi flow chuẩn.
6. Re-weigh có tạo receipt mới không? → Không.
7. `external_id` dùng để làm gì? → chống duplicate command/retry.
8. M7 có làm thay M4 không? → Không, M7 chỉ thực thi work.
9. M8 có quyết định reject không? → Không, M8 chỉ cung cấp data.
10. M10 có đọc raw weigh log để tính phí không? → Không nên; nên đọc business event + inventory truth.

---

## 23. Kết luận kiến trúc

Module 4 không khó ở CRUD receipt, mà khó ở 5 điểm:

1. **State machine phải chặt**
2. **Weigh event phải idempotent và audit-ready**
3. **Posting point sang M3 phải đúng duy nhất tại `RECEIVED`**
4. **Handoff sang M7 phải retry-safe**
5. **Business state và technical delivery state phải tách bạch**

Nếu team build đúng các nguyên tắc trên, Module 4 sẽ:
- đúng nghiệp vụ inbound bulk/bagged của TVL,
- không phá inventory truth của M3,
- không chồng trách nhiệm với M7/M8/M10,
- và đủ sạch để mở rộng cho Module 5, 6, 7, 10 ở các phase sau.

