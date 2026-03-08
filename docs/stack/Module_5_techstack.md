# TVL SWM — Module 5 Tech Stack & Backend Design
# Outbound Operations

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Integration Team  
**Mục tiêu:** Chuyển hóa Module 5 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, integration, state machine, allocation engine, weighing orchestration, posting handoff và error recovery cho Outbound Operations.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 5 — Outbound Operations Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 5 thực chất phải build những gì ở Phase 1.
- Luồng **database → repository → service → state machine → allocation engine → weighing orchestration → posting handoff** nên tổ chức ra sao.
- Vì sao `Shipment` là object nghiệp vụ outbound, còn inventory truth phải đi qua Module 3.
- Thiết kế database nào vừa đúng cho go-live Phase 1, vừa đủ sạch để scale cho Module 6, 7, 8, 9, 10, 11 về sau.
- Từng API dùng để làm gì, input/output gì, validate gì, side effect gì, retry/idempotency ra sao.
- Cách Module 5 ánh xạ với Module 1, 2, 3, 4 và các module liên quan như 7, 8, 10.
- Cách build technical recovery để duplicate request, concurrent allocation, weighbridge retry, posting fail, work callback fail không làm lệch nghiệp vụ.

Tài liệu này bám theo các baseline đã chốt của hệ thống:

- Outbound chỉ trừ tồn khi shipment đạt `SHIPPED`.
- Allocation dùng cơ chế **allocation-based hold** bằng `reserved_qty`, không làm giảm `physical_qty` trước lúc ship.
- Module 5 sở hữu **shipment lifecycle, allocation record và business flow outbound**.
- Module 3 sở hữu **InventDim / InventTrans / OnHand** và inventory posting truth.
- Module 7 sở hữu **pick/load work execution**, không phải shipment state machine.
- Module 8 cung cấp **weight data / weighbridge integration**, nhưng không được quyết định `SHIPPED` hay `CANCELLED`.
- Mọi API có side effect phải idempotent bằng `external_id`.
- Tolerance fail không được dừng xe; shipment có thể đi `PENDING_APPROVAL` sau khi cân xong.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 22 kết luận kỹ thuật quan trọng cho Module 5:

1. **Module 5 là shipment orchestration layer của outbound**, không phải inventory ledger engine.
2. **Shipment là object runtime nghiệp vụ** cho một chuyến xuất, không phải nơi tự giảm tồn kho.
3. **1 shipment = 1 trip = 1 xe** là trục traceability chính của outbound Phase 1.
4. **Outbound posting point duy nhất là `SHIPPED`**; allocation, picking, tare, gross đều chưa được trừ tồn thật.
5. **Allocation là allocation-based hold**, nghĩa là update `reserved_qty` trên stock pool hợp lệ, không dùng reservation framework riêng kiểu ERP full-blown.
6. **Allocation Phase 1 dùng FIFO theo `lot_date ASC`**, không partial allocation; thiếu hàng là fail toàn bộ line.
7. **Concurrent allocation là điểm rủi ro cao nhất về integrity**, bắt buộc row lock / pessimistic locking hoặc cơ chế tương đương ở inventory-facing path.
8. **Module 5 không được ghi trực tiếp vào `InventTrans` hay `OnHand`**, mà chỉ phát command hợp lệ sang Module 3.
9. **Module 5 phải tạo handoff pick work sang Module 7** sau khi allocation thành công; Module 7 mới thực thi pick/load.
10. **Flexible multi-trip weighing là lõi đặc thù của outbound TVL**: tare trước, gross từng line sau, line order linh hoạt.
11. **Tolerance check là per-line ngay sau gross**, nhưng fail không được dừng truck flow; manager xử lý sau qua `PENDING_APPROVAL`.
12. **Manual weight là exception path**, bắt buộc permission + reason code + audit.
13. **DPM dual tracking là capability thật**, không phải note phụ: inventory theo actual, billing/report theo nominal bag rule.
14. **Cancel chỉ hợp lệ trước `SHIPPED`; sau `SHIPPED` chỉ được reverse**, không update/delete shipment history để “sửa tay”.
15. **Line-level state quan trọng ngang shipment-level state**, vì weigh pass/fail, short pick, reverse sau ship xảy ra ở line nhiều hơn ở header.
16. **M5 phải có exception trail và status history riêng**, vì outbound là điểm nhạy cảm về shrinkage, billing dispute và customer claim.
17. **SO reconciliation phải là capability thật**, không để downstream tự đoán shipped quantity từ màn hình shipment.
18. **M5 phải phát event/hook sang M10 tại `SHIPPED`**, nhưng không tự tính phí.
19. **Retry từ UI, mobile, weighbridge, integration không được tạo duplicate shipment / duplicate work / duplicate outbound posting**.
20. **State machine phải enforce ở backend**, không dựa vào việc disable nút trên UI.
21. **Thiết kế của M5 phải chừa đường cho Phase 2** như partial allocation, partial shipment, FEFO, advanced dock/container logic nhưng không làm phình baseline go-live.
22. **Module 5 phải giữ trace link end-to-end**: `shipment → allocation → work → weighing → outbound trans → billing event`.

---

## 3. Phạm vi build thực tế của Module 5 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Shipment creation / update / confirm flow
2. Shipment state machine runtime
3. Shipment line state machine runtime
4. SO / delivery request intake mapping vào shipment
5. Allocation engine + allocation-based hold
6. Allocation release / reallocation / short pick adjustment path
7. Pick work handoff sang Module 7
8. Weighing orchestration: tare + gross loop
9. Tolerance check engine per line
10. `PENDING_APPROVAL` approve/reject flow
11. Outbound posting orchestration sang Module 3 tại `SHIPPED`
12. Billing capture hook/event sang Module 10 tại `SHIPPED`
13. DPM dual tracking snapshot fields
14. Cancel / close / reversal request flow
15. Status history + exception trail + approval decision trail
16. Idempotency handling cho mọi command side effect
17. Technical recovery cho work creation fail, weigh duplicate, post fail, callback mismatch
18. Query APIs cho search / detail / history / exception / inquiry
19. Validation matrix và error code implementation
20. SO reconciliation update orchestration

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build partial allocation chính thức.
2. Không build partial shipment chuẩn hóa full runtime.
3. Không build FEFO / batch-expiry allocation engine.
4. Không build dock appointment scheduler nâng cao.
5. Không build carrier optimization / routing engine.
6. Không build container stuffing charging engine đầy đủ nếu business chưa chốt Phase 1.
7. Không build approval workflow engine tổng quát đa cấp; chỉ build outbound approval path cụ thể cho `PENDING_APPROVAL`.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** shipment state machine, allocation engine, weighing loop, approval flow và posting handoff.
- **Có build** traceability, idempotency, exception trail và recovery path.
- **Không build** inventory ledger trong Module 5.
- **Không build** pick/load execution runtime trong Module 5; Module 5 chỉ handoff sang M7.
- **Không build** weighbridge raw capture engine trong Module 5; Module 8 mới sở hữu phần đó.
- **Không build** charge calculation trong Module 5; Module 10 chỉ consume event/hook.
- **Không cho phép** bất kỳ API/UI nào update trực tiếp `on_hand` hoặc `invent_trans` từ Module 5.

---

## 4. Khuyến nghị tech stack chính thức cho Module 5

Để đồng bộ với Module 1, 2, 3, 4 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; outbox/event cho integration nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot dedupe / distributed coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Integration layer

- **Inventory adapter:** gọi Module 3 qua internal REST/event command cho hold/post/reverse
- **Work adapter:** gọi Module 7 để create pick work và nhận callback completion/short-pick
- **Weighbridge adapter:** nhận tare/gross event từ Module 8 hoặc local agent qua HTTP/WebSocket/event bus
- **Billing event adapter:** phát `OutboundShipped` / `OutboundHandlingCaptured` sang Module 10
- **Outbox pattern:** dùng cho `CreatePickWork`, `PostOutboundShipment`, `CaptureOutboundBilling`, `RequestShipmentReverse`

### 4.4 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên shipment → allocation → work → weighing → posting → billing
- Metrics:
  - shipment creation rate
  - allocation success/fail rate
  - allocation lock wait time
  - short pick rate
  - pending approval rate
  - outbound posting retry rate
  - weigh duplicate rate
  - DPM variance rate
- Tracing: OpenTelemetry-ready

### 4.5 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- State-machine test: shipment + line transition matrix
- Concurrency test: 2 shipments allocate cùng stock pool
- Idempotency test: create / allocate / weigh / ship retry cùng `external_id`
- Recovery test: M7 fail, M3 fail, duplicate weight, out-of-order gross, approval reject/approve

### 4.6 Vì sao nên giữ cùng stack với Module 1, 2, 3, 4

- M1 là nền cho permission, reason code, audit, sequence, idempotency.
- M2 là nguồn master data cho owner/item/warehouse/location/status/tolerance.
- M3 là inventory core engine mà M5 buộc phải gọi tại `allocate/release hold` và `SHIPPED`.
- M4 và M5 có nhiều pattern tương đồng: state machine, weighbridge integration, posting handoff, technical recovery.
- Cùng stack giúp reuse guard, interceptor, request context, audit service, idempotency service, sequence service, migration style và code structure.

---

## 5. Kiến trúc tổng thể Module 5 trong hệ backend

```text
Web Admin / Ops Console / Mobile / Weighbridge Agent (M8) / Internal Services
                                 |
                                 v
                     NestJS Outbound Controllers
                                 |
         +-----------------------+------------------------+
         |                       |                        |
         v                       v                        v
     Auth Guard            Permission Guard         Idempotency Guard
         |                       |                        |
         +-----------------------+------------------------+
                                 |
                                 v
                     Outbound Application Layer
 +--------------------+--------------------+--------------------+-------------------+
 |                    |                    |                    |                   |
 v                    v                    v                    v                   v
Shipment Service  Allocation Service  Weighing Service  Approval Service    Handoff Service
Query Service     Exception Service   Reversal Service  Reconcile Service   Recovery Service
                                 |
                                 v
                         Domain / Policy Layer
 +------------------+--------------------+-------------------+----------------------+
 | Shipment State   | Allocation Policy  | Tolerance Policy  | Posting/Handoff Rule |
 | Line State       | SO Blocking Policy | DPM Policy        | Error Mapping        |
 | Cancel Policy    | Locking Policy     | Reweigh Policy    | Recovery Policy      |
 +------------------+--------------------+-------------------+----------------------+
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
- **Application services**: orchestration use case theo shipment lifecycle.
- **Domain/policy layer**: state machine, FIFO, blocking rule, weigh formula, approval/cancel/reversal matrix.
- **Repository layer**: query/CRUD thuần.
- **Outbox/integration adapters**: tách riêng để không block transaction nghiệp vụ quá lâu.

### 5.2 Tư tưởng thiết kế cốt lõi

- Shipment lifecycle phải được quản bởi **state machine tập trung**, không rải rác ở controller.
- Allocation phải tách thành engine riêng, không nhét vào shipment service monolith.
- Weighing logic phải có **header + line + attempt log** để xử lý flexible sequence và trace đầy đủ.
- Posting sang M3 và handoff sang M7 phải **delivery-safe** bằng outbox và idempotent contract.
- `shipment_status_history`, `shipment_exception_log`, `approval_decision_log` là capability bắt buộc để điều tra vận hành.
- Query nhanh cho điều phối xe và điều tra outbound quan trọng ngang với CRUD admin; cần index tốt theo `shipment_number`, `vehicle_number`, `so_id`, `status`, `created_at`.

---

## 6. Phân ranh runtime ownership giữa Module 5 và các module khác

| Concern | Module 5 sở hữu | Module khác sở hữu |
|---|---|---|
| Shipment lifecycle | Có | Không |
| Shipment / line state machine | Có | Không |
| Allocation decision | Có | Không |
| Allocation record | Có | Không |
| Tolerance decision outbound | Có | Không |
| PENDING_APPROVAL flow | Có | Không |
| Weigh raw data capture | Không | M8 |
| Inventory posting ledger | Không | M3 |
| Pick/load work execution | Không | M7 |
| Billing calculation | Không | M10 |
| Permission / reason code / audit / idempotency framework | Không, chỉ consume | M1 |
| Owner/item/warehouse/location/tolerance master | Không, chỉ consume | M2 |
| Receipt / inbound runtime | Không | M4 |

### 6.1 Ánh xạ Module 5 với Module 1

Module 5 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được tạo shipment
   - ai được confirm / allocate / cancel
   - ai được nhập manual weight
   - ai được resolve `PENDING_APPROVAL`
   - ai được close shipment
   - ai được tạo reversal request sau shipped

2. **Reason code**
   - cancel shipment
   - manual weight
   - approve/reject tolerance fail
   - force release allocation
   - reversal request / correction reason

3. **Audit trail**
   - create/update/confirm shipment
   - allocation / release allocation
   - create work handoff
   - tare/gross received
   - approve/reject line fail
   - ship / close / reverse request
   - integration failure / retry

4. **Idempotency**
   - create shipment
   - confirm shipment
   - allocate shipment
   - split shipment
   - weigh tare / weigh gross
   - approve / reject pending approval
   - ship shipment
   - close shipment
   - reversal request

5. **Number sequence**
   - sinh `shipment_number` theo sequence `SHP`
   - có thể sinh `approval_no`, `exception_no`, `reverse_request_no` nếu team muốn tracking readable hơn

### 6.2 Ánh xạ Module 5 với Module 2

Module 5 consume master data từ Module 2 như sau:

1. `owner` → owner hợp lệ và owner policy fallback
2. `customer` → consignee / commercial destination context
3. `item` → cargo form, tolerance outbound, default bag weight, DPM-related fields
4. `warehouse` → scope xuất hàng, default shipping/staging locations
5. `location` → source location hợp lệ, type phù hợp, allocatable hay không
6. `inventory_status` → chỉ `AVAILABLE` mới được allocate
7. `uom/uom_conversion` → convert expected quantity nếu input khác KG
8. `owner_item_policy` → tolerance hierarchy, handling override, DPM flag, nominal weight behavior
9. `vehicle_type` → optional cho planning/billing baseline

### 6.3 Ánh xạ Module 5 với Module 3

Module 5 gọi Module 3 ở 3 nhóm capability chính:

1. **Availability query / stock pool query**
   - lấy `physical_qty`, `reserved_qty`, `available_qty`
   - filter theo item + owner + warehouse + location + status

2. **Hold / release hold**
   - khi allocate shipment line → create/reuse hold hợp lệ
   - khi cancel / reject / reverse → release hold còn lại

3. **Outbound posting tại `SHIPPED`**
   - M5 gửi command `PostOutboundShipment`
   - M3 tạo `InventTrans OUTBOUND`, update `OnHand`, release hold tương ứng
   - M5 lưu `posted_trans_id` ở level line hoặc mapping table
   - nếu M3 fail, M5 không được tự sửa tồn; chỉ giữ shipment ở trạng thái recovery/ship-pending theo policy

### 6.4 Ánh xạ Module 5 với Module 4

M4 và M5 có liên hệ kỹ thuật-nghiệp vụ gián tiếp nhưng rất quan trọng:

1. **Cùng bám weighbridge-first architecture**
   - M4 dùng gross/tare để quyết định `RECEIVED`
   - M5 dùng tare + gross loop để quyết định `SHIPPED`

2. **Cùng dùng pattern state machine + outbox + posting handoff**
   - M4 post tại `RECEIVED`
   - M5 post tại `SHIPPED`

3. **Cùng dùng permission/audit/idempotency của M1 và master data của M2**

4. **Cùng cần trace end-to-end trong inventory**
   - inbound tạo stock pool
   - outbound consume stock pool đó

5. **Cùng phải tuân thủ immutability**
   - M4 không sửa ledger inbound đã post
   - M5 không sửa ledger outbound đã post; chỉ reverse

### 6.5 Ánh xạ Module 5 với Module 7, 8, 10

- **M7**: sau `ALLOCATED`, M5 tạo `CreatePickWork`; M7 thực thi pick/load; callback `PickCompleted`, `ShortPickReported`, `LoadCompleted` để M5 cập nhật line/shipment state.
- **M8**: M8 cung cấp `WeightCaptured` cho tare/gross; M5 map event vào shipment context, tính net line, quyết định pass/fail.
- **M10**: M5 phát `OutboundShipped` hoặc `OutboundHandlingCaptured` tại `SHIPPED`; M10 dùng event + M3 truth để tính phí.

---

## 7. Đề xuất cấu trúc code backend cho Module 5

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
    outbound/
      outbound.module.ts
      controllers/
        shipment.controller.ts
        allocation.controller.ts
        weighing.controller.ts
        approval.controller.ts
        outbound-query.controller.ts
        outbound-admin.controller.ts
      services/
        shipment.service.ts
        shipment-command.service.ts
        shipment-query.service.ts
        shipment-state-machine.service.ts
        shipment-line-state.service.ts
        allocation.service.ts
        allocation-lock.service.ts
        weighing.service.ts
        tolerance.service.ts
        approval.service.ts
        so-reconciliation.service.ts
        handoff.service.ts
        reversal.service.ts
        recovery.service.ts
        outbound-audit.service.ts
      repositories/
        shipment-header.repository.ts
        shipment-line.repository.ts
        allocation-record.repository.ts
        weighing-attempt.repository.ts
        shipment-status-history.repository.ts
        shipment-exception.repository.ts
        approval-decision.repository.ts
        shipment-integration.repository.ts
        shipment-outbox.repository.ts
      dto/
      entities/
      mappers/
      policies/
        shipment-state.policy.ts
        line-state.policy.ts
        allocation.policy.ts
        so-blocking.policy.ts
        tolerance.policy.ts
        cancel.policy.ts
        dpm.policy.ts
        integration-recovery.policy.ts
      jobs/
        allocation-retry.job.ts
        posting-retry.job.ts
        work-handoff-retry.job.ts
        shipment-healthcheck.job.ts
        stale-weighing-recovery.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không được tự gọi trực tiếp M3/M7/M8/M10.
- Chỉ `shipment-command.service.ts`, `allocation.service.ts`, `handoff.service.ts`, `reversal.service.ts` được phát side effect liên module.
- `shipment-state-machine.service.ts` là nơi duy nhất quyết định shipment transition allowed/forbidden.
- `shipment-line-state.service.ts` là nơi duy nhất quyết định line transition allowed/forbidden.
- `allocation.service.ts` không tự sửa `on_hand`; mọi hold/release phải đi qua inventory-facing adapter.
- `weighing.service.ts` chỉ nhận tare/gross context đã validate, không để controller tự tính net.
- Repository không chứa nghiệp vụ FIFO/tolerance/cancel/reversal.
- Mọi command service phải nhận `requestContext` chứa `user_id`, `role`, `source_app`, `correlation_id`.
- Không service ngoài Module 5 được truy cập trực tiếp bảng shipment runtime nếu muốn đổi state nghiệp vụ.

---

## 8. Thiết kế database tổng thể cho Module 5

## 8.1 Nguyên tắc DB design

1. Tách `shipment_header` và `shipment_line` rõ ràng.
2. Tách allocation record khỏi line để trace FIFO source location/dim sạch.
3. Tách weighing trail khỏi header và line để lưu đủ tare/gross sequence, duplicate detection, manual fallback.
4. Tách status history, exception log, approval decision khỏi header để điều tra tốt.
5. Dùng soft cancel/state terminal, không hard delete.
6. Mọi command side effect có `external_id`, `correlation_id`, `source_app`.
7. Thiết kế index ưu tiên cho `shipment_number`, `vehicle_number`, `so_id`, `status`, `created_at`.
8. Dùng unique/index để bảo vệ duplicate create, duplicate allocation, duplicate weight event.
9. Tách outbox/integration delivery state khỏi business state để tránh lẫn lộn.
10. Chừa đường mở rộng partial shipment / FEFO / container stuffing Phase 2 nhưng không thêm complexity runtime go-live.
11. Partition các bảng log/history lớn theo thời gian khi volume tăng.

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Runtime core
- `shipment_header`
- `shipment_line`
- `shipment_allocation_record`
- `shipment_weighing_attempt`
- `shipment_so_link`
- `shipment_pick_work_link`
- `shipment_posting_link`

### 8.2.2 Control / traceability
- `shipment_status_history`
- `shipment_exception_log`
- `shipment_approval_decision`
- `shipment_decision_snapshot`
- `shipment_integration_state`
- `shipment_outbox_event`

### 8.2.3 Optional support nên có ngay
- `shipment_attachment` *(ảnh phiếu cân, chứng từ khách hàng; file thật nằm S3)*
- `shipment_search_cache` *(không bắt buộc; chỉ khi inquiry console rất nặng)*
- `shipment_dpm_snapshot` *(nếu team muốn tách dual tracking sang bảng riêng thay vì denorm trên line)*

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `shipment_header`

Mục đích: object header nghiệp vụ cho 1 trip outbound.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_number | VARCHAR(40) | UNIQUE NOT NULL | `SHP-YYYYMMDD-SEQ` |
| so_id | VARCHAR(50) | NULL | ref source nếu từ SO |
| source_type | VARCHAR(30) | NOT NULL | SO / DELIVERY_REQUEST / STANDALONE |
| owner_id | UUID | FK NOT NULL | → md_owner |
| customer_id | UUID | FK NOT NULL | → customer/owner scope ref |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| vehicle_number | VARCHAR(30) | NOT NULL | normalized/searchable |
| vehicle_type_id | UUID | FK NULL | → md_vehicle_type |
| status | VARCHAR(30) | NOT NULL | DRAFT...CLOSED |
| tare_weight_kg | NUMERIC(18,3) | NULL | header tare |
| total_gross_kg | NUMERIC(18,3) | NULL | latest/final gross |
| total_net_kg | NUMERIC(18,3) | NULL | final total net |
| all_lines_passed | BOOLEAN | NOT NULL DEFAULT false | |
| pending_approval_count | INT | NOT NULL DEFAULT 0 | |
| is_dpm_shipment | BOOLEAN | NOT NULL DEFAULT false | |
| cancel_reason_code | VARCHAR(50) | NULL | |
| close_reason_code | VARCHAR(50) | NULL | |
| shipped_at | TIMESTAMP | NULL | business ship completion time |
| closed_at | TIMESTAMP | NULL | |
| external_id | VARCHAR(120) | NOT NULL | create/confirm idempotency |
| correlation_id | VARCHAR(120) | NOT NULL | trace |
| source_app | VARCHAR(30) | NOT NULL | WEB/MOBILE/API/WB |
| row_version | BIGINT | NOT NULL DEFAULT 0 | optimistic trace |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index khuyến nghị:**
- unique(`shipment_number`)
- unique(`external_id`) với create command context
- index(`vehicle_number`,`status`,`created_at` DESC)
- index(`so_id`,`status`,`created_at` DESC)
- index(`owner_id`,`warehouse_id`,`status`,`created_at` DESC)
- index(`status`,`created_at` DESC)
- index(`correlation_id`)

**Ghi chú thiết kế:**
- `tare_weight_kg`, `total_gross_kg`, `total_net_kg` là denorm latest/final; lịch sử thật nằm ở `shipment_weighing_attempt`.
- `is_dpm_shipment` nên tính từ line khi confirm hoặc khi save line.
- `vehicle_number` phải normalize uppercase + trim.

---

### 8.3.2 `shipment_line`

Mục đích: dòng hàng thuộc shipment.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | → shipment_header |
| line_number | INT | NOT NULL | |
| so_line_id | VARCHAR(50) | NULL | ref SO line |
| item_id | UUID | FK NOT NULL | → md_item |
| cargo_form | VARCHAR(30) | NOT NULL | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO... |
| uom_id | UUID | FK NOT NULL | → md_uom |
| expected_qty | NUMERIC(18,3) | NOT NULL | input qty |
| expected_qty_kg | NUMERIC(18,3) | NOT NULL | normalized KG |
| allocated_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| picked_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| loaded_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | optional phase-1-light |
| shipped_qty | NUMERIC(18,3) | NULL | actual net ship |
| bag_count | INT | NULL | bagged only |
| nominal_weight_per_bag | NUMERIC(18,3) | NULL | bagged/DPM |
| tolerance_pct_applied | NUMERIC(8,4) | NULL | snapshot |
| variance_pct | NUMERIC(8,4) | NULL | snapshot |
| gross_weight_kg | NUMERIC(18,3) | NULL | final gross snapshot for this line |
| net_weight_kg | NUMERIC(18,3) | NULL | actual net line |
| weigh_sequence_no | INT | NULL | order in loop |
| line_status | VARCHAR(30) | NOT NULL | PENDING...LINE_SHIPPED |
| posted_trans_id | VARCHAR(40) | NULL | ref M3 trans |
| is_dpm_line | BOOLEAN | NOT NULL DEFAULT false | |
| dpm_nominal_qty_kg | NUMERIC(18,3) | NULL | nominal bag rule total |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Unique:**
- unique(`shipment_header_id`,`line_number`)

**Index:**
- index(`item_id`,`cargo_form`)
- index(`shipment_header_id`,`line_status`)
- index(`so_line_id`)

**Ghi chú:**
- `loaded_qty` có thể chưa dùng mạnh ở Phase 1 nhưng nên chừa field cho mapping M7 load callback.
- `dpm_nominal_qty_kg` giúp M10/report không phải suy diễn lại từ bag_count mọi nơi.

---

### 8.3.3 `shipment_allocation_record`

Mục đích: trace nguồn stock cụ thể được allocate cho từng shipment line.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | denorm query nhanh |
| shipment_line_id | UUID | FK NOT NULL | → shipment_line |
| location_id | UUID | FK NOT NULL | source location |
| invent_dim_id | UUID | NOT NULL | dim stock source từ M3 |
| item_id | UUID | FK NOT NULL | denorm |
| owner_id | UUID | FK NOT NULL | denorm |
| allocated_qty | NUMERIC(18,3) | NOT NULL | |
| picked_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| released_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| posted_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| lot_date | DATE | NOT NULL | dùng cho FIFO |
| fifo_rank | INT | NULL | snapshot debug |
| status | VARCHAR(30) | NOT NULL | ALLOCATED / PICKED / RELEASED / POSTED |
| hold_ref | VARCHAR(50) | NULL | ref inventory_hold / hold_no ở M3 |
| external_id | VARCHAR(120) | NULL | command dedupe nếu cần |
| correlation_id | VARCHAR(120) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index:**
- index(`shipment_line_id`,`status`)
- index(`shipment_header_id`,`status`)
- index(`invent_dim_id`,`status`)
- index(`item_id`,`owner_id`,`lot_date`,`status`)
- index(`hold_ref`)

**Ghi chú:**
- bảng này không thay thế `inventory_hold`; nó là trace phía outbound.
- `posted_qty` giúp reverse/cancel sau partial posted line dễ tính hơn.

---

### 8.3.4 `shipment_weighing_attempt`

Mục đích: lưu mọi log tare/gross/duplicate/manual override của outbound loop.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NULL | NULL nếu tare |
| weigh_type | VARCHAR(20) | NOT NULL | TARE / GROSS |
| sequence_no | INT | NOT NULL | 0 = tare, 1..N = gross |
| source_mode | VARCHAR(20) | NOT NULL | SCALE_AGENT / MANUAL |
| raw_weight_kg | NUMERIC(18,3) | NOT NULL | giá trị gốc |
| calculated_net_kg | NUMERIC(18,3) | NULL | net line nếu gross |
| scale_ticket_no | VARCHAR(80) | NULL | |
| external_event_id | VARCHAR(120) | NULL | dedupe event từ M8 |
| captured_at | TIMESTAMP | NOT NULL | thời điểm cân |
| captured_by | UUID | NULL | user/system |
| duplicate_of_attempt_id | UUID | NULL | link duplicate |
| is_valid | BOOLEAN | NOT NULL DEFAULT true | |
| remark | TEXT | NULL | |
| correlation_id | VARCHAR(120) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Unique / index:**
- unique(`external_event_id`) WHERE `external_event_id` IS NOT NULL
- unique(`shipment_header_id`,`sequence_no`,`weigh_type`) WHERE `is_valid` = true
- index(`shipment_header_id`,`captured_at`)
- index(`shipment_line_id`,`captured_at`)
- index(`scale_ticket_no`)

**Ghi chú:**
- dùng để reconstruct full weighing trail.
- event trùng vẫn nên lưu log nhưng mark `is_valid = false`, `duplicate_of_attempt_id`.

---

### 8.3.5 `shipment_status_history`

Mục đích: lưu lịch sử chuyển trạng thái shipment và line phục vụ audit/troubleshooting.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NULL | null nếu state header |
| entity_level | VARCHAR(10) | NOT NULL | HEADER / LINE |
| from_status | VARCHAR(30) | NULL | |
| to_status | VARCHAR(30) | NOT NULL | |
| trigger_action | VARCHAR(50) | NOT NULL | CREATE / CONFIRM / ALLOCATE / WEIGH_GROSS ... |
| changed_by | UUID | NULL | |
| changed_at | TIMESTAMP | NOT NULL | |
| reason_code | VARCHAR(50) | NULL | |
| note | TEXT | NULL | |
| correlation_id | VARCHAR(120) | NOT NULL | |

**Index:**
- index(`shipment_header_id`,`changed_at` DESC)
- index(`shipment_line_id`,`changed_at` DESC)
- index(`to_status`,`changed_at` DESC)

---

### 8.3.6 `shipment_exception_log`

Mục đích: lưu ngoại lệ nghiệp vụ và kỹ thuật liên quan outbound.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NULL | |
| exception_type | VARCHAR(30) | NOT NULL | ALLOCATION_FAIL / TOLERANCE_FAIL / SO_BLOCK / DUPLICATE_WEIGHT / POSTING_FAIL / SHORT_PICK ... |
| exception_code | VARCHAR(50) | NOT NULL | mã chuẩn |
| severity | VARCHAR(20) | NOT NULL | INFO / WARNING / BLOCKING |
| status | VARCHAR(20) | NOT NULL | OPEN / RESOLVED / REJECTED |
| reason_code | VARCHAR(50) | NULL | |
| detail_json | JSONB | NULL | payload chi tiết |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| resolved_at | TIMESTAMP | NULL | |
| resolved_by | UUID | NULL | |
| correlation_id | VARCHAR(120) | NOT NULL | |

**Index:**
- index(`shipment_header_id`,`status`,`created_at` DESC)
- index(`exception_type`,`status`,`created_at` DESC)
- gin(`detail_json`)

---

### 8.3.7 `shipment_approval_decision`

Mục đích: lưu quyết định approve/reject cho line fail tolerance hoặc outbound exception.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NULL | nullable nếu approve ở level shipment |
| decision_type | VARCHAR(30) | NOT NULL | APPROVE / REJECT / REWEIGH_REQUEST |
| approval_scope | VARCHAR(20) | NOT NULL | LINE / SHIPMENT |
| reason_code | VARCHAR(50) | NOT NULL | |
| note | TEXT | NULL | |
| decided_by | UUID | NOT NULL | |
| decided_at | TIMESTAMP | NOT NULL | |
| before_snapshot | JSONB | NULL | optional audit snapshot |
| after_snapshot | JSONB | NULL | optional audit snapshot |
| correlation_id | VARCHAR(120) | NOT NULL | |

**Index:**
- index(`shipment_header_id`,`decided_at` DESC)
- index(`shipment_line_id`,`decided_at` DESC)

---

### 8.3.8 `shipment_pick_work_link`

Mục đích: map shipment với work do Module 7 tạo để tránh duplicate handoff và theo dõi callback.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NULL | |
| work_type | VARCHAR(20) | NOT NULL | PICK / LOAD |
| work_header_id | VARCHAR(50) | NOT NULL | ref M7 |
| work_line_id | VARCHAR(50) | NULL | ref M7 |
| status | VARCHAR(30) | NOT NULL | REQUESTED / CREATED / IN_PROGRESS / COMPLETED / CANCELLED / FAILED |
| external_id | VARCHAR(120) | NOT NULL | idempotency M5→M7 |
| correlation_id | VARCHAR(120) | NOT NULL | |
| requested_at | TIMESTAMP | NOT NULL | |
| completed_at | TIMESTAMP | NULL | |
| payload_json | JSONB | NULL | |

**Unique:**
- unique(`external_id`)
- unique(`shipment_line_id`,`work_type`) WHERE `status` IN ('REQUESTED','CREATED','IN_PROGRESS','COMPLETED')

---

### 8.3.9 `shipment_posting_link`

Mục đích: map shipment line với outbound posting sang M3 để retry-safe và trace rõ.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| shipment_header_id | UUID | FK NOT NULL | |
| shipment_line_id | UUID | FK NOT NULL | |
| posting_action | VARCHAR(20) | NOT NULL | POST / REVERSE |
| m3_external_id | VARCHAR(120) | NOT NULL | idempotency key gửi M3 |
| m3_trans_id | VARCHAR(40) | NULL | result |
| status | VARCHAR(20) | NOT NULL | PENDING / SUCCESS / FAILED |
| request_payload | JSONB | NULL | |
| response_payload | JSONB | NULL | |
| requested_at | TIMESTAMP | NOT NULL | |
| finished_at | TIMESTAMP | NULL | |
| correlation_id | VARCHAR(120) | NOT NULL | |

**Unique:**
- unique(`m3_external_id`)
- unique(`shipment_line_id`,`posting_action`) WHERE `status` = 'SUCCESS'

---

## 8.4 ERD logic rút gọn

```text
shipment_header (1) ---- (N) shipment_line
shipment_header (1) ---- (N) shipment_status_history
shipment_header (1) ---- (N) shipment_exception_log
shipment_header (1) ---- (N) shipment_weighing_attempt
shipment_header (1) ---- (N) shipment_pick_work_link
shipment_header (1) ---- (N) shipment_posting_link

shipment_line   (1) ---- (N) shipment_allocation_record
shipment_line   (1) ---- (N) shipment_weighing_attempt [gross only]
shipment_line   (1) ---- (N) shipment_approval_decision
shipment_line   (1) ---- (N) shipment_posting_link
```

---

## 9. Luồng xử lý chuẩn từ database → backend → integration

## 9.1 Luồng 1 — Tạo shipment

### Bước nghiệp vụ
1. User/API gửi create shipment command.
2. Backend validate owner, warehouse, line item, UOM, cargo form, vehicle.
3. Generate `shipment_number` từ M1 Number Sequence.
4. Insert `shipment_header`, `shipment_line`, `shipment_status_history`.
5. Trả về shipment ở `DRAFT`.

### DB tác động
- INSERT `shipment_header`
- INSERT `shipment_line`
- INSERT `shipment_status_history`
- INSERT audit log qua M1

### Lưu ý build
- `external_id` create phải unique theo context.
- Nếu duplicate create cùng `external_id` thì trả record cũ.
- Chưa gọi M3/M7/M8 ở bước này.

---

## 9.2 Luồng 2 — Confirm shipment

### Bước nghiệp vụ
1. Kiểm tra shipment đang `DRAFT`.
2. Validate đủ field bắt buộc: vehicle, line, owner, warehouse.
3. Snapshot line rules cần thiết.
4. Chuyển state `DRAFT → CONFIRMED`.

### DB tác động
- UPDATE `shipment_header.status`
- INSERT `shipment_status_history`
- audit log

### Lưu ý build
- Từ `CONFIRMED`, thay đổi commercial/master-critical field phải bị hạn chế mạnh.
- Chưa allocate tự động nếu business muốn manual step; nếu auto-allocate thì phải explicit config.

---

## 9.3 Luồng 3 — Allocate shipment

### Bước nghiệp vụ
1. Kiểm tra shipment `CONFIRMED`.
2. Với từng line:
   - query available stock từ M3
   - filter `AVAILABLE` only
   - sort FIFO `lot_date ASC`, tie-breaker `location_code ASC` hoặc `invent_dim_id ASC`
   - check SO blocking / bulk rule / bagged rule
3. Thực hiện lock stock pool phù hợp.
4. Tạo allocation records.
5. Gọi M3 create hold / increase reserved_qty.
6. Nếu tất cả line thành công → shipment `ALLOCATED`.
7. Nếu line nào fail → fail toàn command, rollback toàn transaction outbound-side.

### DB tác động
- INSERT `shipment_allocation_record`
- UPDATE `shipment_line.allocated_qty`, `line_status`
- UPDATE `shipment_header.status`
- INSERT `shipment_status_history`
- INSERT/UPDATE `shipment_exception_log` nếu fail
- INSERT audit log

### Lưu ý build
- Đây là chỗ bắt buộc có **transaction DB + lock strategy**.
- Không partial allocation ở Phase 1, nên line fail phải rollback cả shipment allocation command.
- `allocation.service.ts` phải tách khỏi controller/service chung để dễ test concurrent.

---

## 9.4 Luồng 4 — Tạo pick work sang M7

### Bước nghiệp vụ
1. Khi shipment `ALLOCATED`, M5 chuẩn bị payload pick work per line/allocation.
2. Tạo outbox event `CreatePickWork`.
3. Adapter gửi sang M7 với `external_id` riêng.
4. Khi M7 xác nhận created thành công:
   - lưu `shipment_pick_work_link`
   - chuyển line `ALLOCATED → PICKING`
   - header `ALLOCATED → PICKING`

### DB tác động
- INSERT `shipment_pick_work_link`
- UPDATE `shipment_line.line_status`
- UPDATE `shipment_header.status`
- INSERT `shipment_status_history`
- INSERT audit log

### Lưu ý build
- Không gọi sync blocking trong transaction business chính quá lâu.
- Dùng outbox để retry-safe.
- Nếu M7 fail create, shipment có thể ở `ALLOCATED` + integration fail queue, không rollback allocation ngay trừ khi policy yêu cầu.

---

## 9.5 Luồng 5 — Nhận callback pick complete / short pick từ M7

### Bước nghiệp vụ
1. M7 callback pick completed hoặc short pick report.
2. M5 dedupe callback bằng `external_id`.
3. Update `picked_qty` theo line/allocation.
4. Nếu short pick:
   - log exception
   - decide release phần chưa pick hoặc reallocate nếu policy cho phép
5. Nếu tất cả line picked đủ → header `PICKED`.

### DB tác động
- UPDATE `shipment_pick_work_link.status`
- UPDATE `shipment_allocation_record.picked_qty`
- UPDATE `shipment_line.picked_qty`, `line_status`
- UPDATE `shipment_header.status`
- INSERT `shipment_exception_log` nếu short pick
- INSERT `shipment_status_history`

### Lưu ý build
- short pick không được tự ship phần còn lại mà không qua rule.
- callback từ M7 phải idempotent.

---

## 9.6 Luồng 6 — Ghi nhận tare

### Bước nghiệp vụ
1. M8 gửi event tare hoặc WB_OPERATOR nhập manual tare theo quyền.
2. M5 validate shipment ở `PICKED` hoặc trạng thái cho phép cân tare.
3. Dedupe event theo `external_event_id`.
4. Insert weighing attempt `TARE`, sequence `0`.
5. Update header `tare_weight_kg`, state `WEIGHING_TARE`.

### DB tác động
- INSERT `shipment_weighing_attempt`
- UPDATE `shipment_header.tare_weight_kg`, `status`
- INSERT `shipment_status_history`
- INSERT audit log

### Lưu ý build
- manual tare bắt buộc reason code + audit.
- không cho gross trước tare, trừ khi team quyết định explicit exception path.

---

## 9.7 Luồng 7 — Ghi nhận gross theo line linh hoạt

### Bước nghiệp vụ
1. M8 gửi event gross hoặc WB_OPERATOR nhập manual gross.
2. M5 xác định line đang được load/cân.
3. Tính `net_line`:
   - gross đầu tiên: `gross_1 - tare`
   - gross_n: `gross_n - gross_(n-1)`
4. Update line weigh info.
5. Tính variance vs expected/tolerance.
6. Nếu pass:
   - line `WEIGHED_PASS`
7. Nếu fail:
   - line `WEIGHED_FAIL`
   - tạo exception `TOLERANCE_FAIL`
   - chưa dừng flow truck
8. Khi đủ tất cả line đã có gross → header `ALL_WEIGHED` hoặc `PENDING_APPROVAL` tùy còn fail hay không.

### DB tác động
- INSERT `shipment_weighing_attempt`
- UPDATE `shipment_line.gross_weight_kg`, `net_weight_kg`, `variance_pct`, `line_status`, `weigh_sequence_no`
- UPDATE `shipment_header.total_gross_kg`, `total_net_kg`, `pending_approval_count`, `status`
- INSERT `shipment_exception_log` nếu fail
- INSERT `shipment_status_history`

### Lưu ý build
- line order linh hoạt nên UI và backend đều phải truyền rõ `shipment_line_id` đang cân.
- cần cross-check cuối: `gross_final - tare ≈ sum(net_line_i)`; nếu lệch vượt ngưỡng warning thì log warning exception.
- event out-of-order phải reject rõ ràng.

---

## 9.8 Luồng 8 — Resolve `PENDING_APPROVAL`

### Bước nghiệp vụ
1. WH_MANAGER mở queue approval.
2. Xem line fail, variance, weight trail, expected vs actual.
3. Chọn `APPROVE` hoặc `REJECT`.
4. Nếu approve toàn bộ line cần thiết:
   - line chuyển `WEIGHED_FAIL → WEIGHED_PASS` logic business-approved
   - header đủ điều kiện ship
5. Nếu reject shipment:
   - cancel shipment chưa ship
   - release allocation chưa consumed

### DB tác động
- INSERT `shipment_approval_decision`
- UPDATE `shipment_line.line_status`
- UPDATE `shipment_header.pending_approval_count`, `status`
- INSERT `shipment_status_history`
- UPDATE/INSERT `shipment_exception_log`
- audit log

### Lưu ý build
- approval phải lưu snapshot before/after để audit tranh chấp.
- reject không được tự xóa weigh log.

---

## 9.9 Luồng 9 — Ship shipment tại `SHIPPED`

### Bước nghiệp vụ
1. Điều kiện:
   - shipment đã `ALL_WEIGHED` hoặc resolve xong `PENDING_APPROVAL`
   - mọi line hợp lệ để ship
2. M5 tạo payload posting per line.
3. Ghi `shipment_posting_link` trạng thái `PENDING`.
4. Tạo outbox event `PostOutboundShipment` sang M3.
5. Khi M3 trả success:
   - lưu `m3_trans_id`
   - update line `LINE_SHIPPED`
   - update header `SHIPPED`
   - release/consume allocation theo posted qty
6. Đồng thời phát event sang M10 để capture billing.
7. Update SO shipped_qty.

### DB tác động
- INSERT `shipment_posting_link`
- UPDATE `shipment_line.posted_trans_id`, `shipped_qty`, `line_status`
- UPDATE `shipment_header.status`, `shipped_at`, `total_net_kg`
- UPDATE `shipment_allocation_record.status`, `posted_qty`
- INSERT `shipment_status_history`
- INSERT audit log

### Lưu ý build
- `SHIPPED` chỉ thành công khi posting inventory thành công theo policy thiết kế.
- Nếu team muốn state trung gian kỹ thuật `POSTING_IN_PROGRESS`, có thể thêm hidden/internal state.
- billing event nên theo outbox để retry-safe, không block commit shipment success quá lâu.

---

## 9.10 Luồng 10 — Close shipment

### Bước nghiệp vụ
1. WH_MANAGER close shipment sau khi đã `SHIPPED`.
2. Validate không còn pending approval, pending post, pending reverse.
3. Update `CLOSED`.

### DB tác động
- UPDATE `shipment_header.status`, `closed_at`
- INSERT `shipment_status_history`
- audit log

### Lưu ý build
- `CLOSED` là immutable.
- close không sinh inventory posting mới.

---

## 9.11 Luồng 11 — Cancel trước ship

### Bước nghiệp vụ
1. Validate state được cancel: `DRAFT`, `CONFIRMED`, `ALLOCATED`, `PICKING`, `PENDING_APPROVAL`.
2. Nếu đã allocate → release hold và mark allocation released.
3. Nếu đã create work → gửi cancel work request sang M7.
4. Update shipment `CANCELLED`.

### DB tác động
- UPDATE `shipment_header.status`, `cancel_reason_code`
- UPDATE `shipment_line.line_status`
- UPDATE `shipment_allocation_record.status`, `released_qty`
- UPDATE `shipment_pick_work_link.status` nếu có callback
- INSERT `shipment_status_history`
- INSERT audit log

### Lưu ý build
- Sau `SHIPPED` không cho cancel, chỉ reversal.

---

## 9.12 Luồng 12 — Reverse sau ship

### Bước nghiệp vụ
1. WH_MANAGER gửi reversal request.
2. Validate shipment/line đã có `posted_trans_id`.
3. Tạo command reverse sang M3 per posted line.
4. Khi M3 success:
   - lưu `shipment_posting_link` action `REVERSE`
   - mark reversed trace
   - update SO reconciliation nếu cần

### DB tác động
- INSERT `shipment_posting_link` action `REVERSE`
- INSERT `shipment_exception_log` hoặc decision log nếu cần
- INSERT `shipment_status_history`
- audit log

### Lưu ý build
- reversal không được sửa `shipment_weighing_attempt` hay xóa line shipped history.
- Có thể giữ shipment CLOSED nhưng có reverse link; hoặc tạo business state riêng tùy ADR.

---

## 10. Thiết kế state machine chuẩn

## 10.1 Shipment state machine

```text
DRAFT
  -> CONFIRMED
  -> CANCELLED

CONFIRMED
  -> ALLOCATED
  -> CANCELLED

ALLOCATED
  -> PICKING
  -> CANCELLED

PICKING
  -> PICKED
  -> CANCELLED

PICKED
  -> WEIGHING_TARE
  -> CANCELLED [TO-CONFIRM nếu đã tare hay chưa]

WEIGHING_TARE
  -> LOADING
  -> ALL_WEIGHED (nếu special fast path)

LOADING
  -> ALL_WEIGHED
  -> PENDING_APPROVAL

ALL_WEIGHED
  -> SHIPPED

PENDING_APPROVAL
  -> SHIPPED
  -> CANCELLED

SHIPPED
  -> CLOSED
  -> REVERSE_REQUESTED [technical/business optional]

CLOSED
  -> immutable
```

## 10.2 Line state machine

```text
PENDING
  -> ALLOCATED
  -> PICKING
  -> PICKED
  -> LOADING
  -> WEIGHED_PASS / WEIGHED_FAIL
  -> LINE_SHIPPED
  -> REJECTED / REWEIGH_REQUIRED
```

### 10.3 Quy tắc triển khai state machine

- Backend phải có **allowed transition matrix** dạng code/table-driven.
- Không để controller tự `if status === ...` rải rác.
- Header transition phụ thuộc aggregate state của line.
- Mọi transition phải tạo `shipment_status_history`.
- Forbidden transition phải trả lỗi chuẩn, ví dụ `OUT_STATE_409_INVALID_TRANSITION`.

---

## 11. Allocation engine — thiết kế chi tiết

## 11.1 Input chuẩn cho allocation

- `shipment_id`
- `shipment_line_id`
- `item_id`
- `owner_id`
- `warehouse_id`
- `required_qty_kg`
- `allocation_strategy = FIFO`
- `allow_partial = false`

## 11.2 Thuật toán FIFO Phase 1

1. Query stock pool từ M3 với filter:
   - item đúng
   - owner đúng
   - warehouse đúng
   - status = `AVAILABLE`
   - available_qty > 0
2. Sắp xếp:
   - `lot_date ASC`
   - `location_priority ASC` *(nếu có)*
   - `location_code ASC` hoặc `invent_dim_id ASC`
3. Tích lũy cho đến đủ `required_qty_kg`.
4. Nếu không đủ → fail toàn line.
5. Nếu đủ → lock các row stock pool liên quan và create hold.
6. Persist allocation records theo từng source dim/location.

## 11.3 Locking strategy khuyến nghị

### Phương án Phase 1 khuyến nghị
- Dùng **pessimistic row lock** trên stock rows liên quan trong M3 khi create hold.
- M5 không tự lock DB inventory table của M3 bằng đường tắt; lock phải đi qua contract M3 hoặc shared transaction boundary nếu monolith.
- Với modular monolith dùng chung DB, có thể dùng transaction service chung để:
  - select candidate stock rows `FOR UPDATE`
  - verify available vẫn đủ
  - increase reserved_qty
  - commit atomically

### Vì sao không nên dùng optimistic-only ở Phase 1
- Allocation concurrent là hotspot.
- Inventory query + reserve dễ race condition.
- Team intern khó handle retry loop phức tạp nếu optimistic conflict xảy ra ở nhiều line.

## 11.4 Rule không partial allocation

- Một line chỉ thành công khi **đủ toàn bộ qty**.
- Nếu line thiếu dù chỉ 1 phần nhỏ → fail line.
- Vì Phase 1 không hỗ trợ partial shipment chính thức, không được allocate “tạm” rồi chờ sau.

## 11.5 SO blocking rule

### Bulk
`SUM(allocated_or_shipped_under_same_SO_line) + current_request <= SO.expected_qty_kg`

### Bagged
- áp rule theo trip/bag/tolerance shell theo spec hiện tại.
- cần policy rõ ở code để không trộn với bulk.

---

## 12. Weighing engine — thiết kế chi tiết

## 12.1 Công thức net line

Giả sử:
- tare = `T`
- gross line 1 = `G1`
- gross line 2 = `G2`
- gross line n = `Gn`

Thì:
- `net_line_1 = G1 - T`
- `net_line_2 = G2 - G1`
- `net_line_n = Gn - G(n-1)`
- `total_net = Gfinal - T`

## 12.2 Cross-check cuối

Sau line gross cuối cùng:
- `abs((gross_final - tare) - sum(net_line_i)) <= warning_threshold`
- nếu vượt ngưỡng warning:
  - không nhất thiết block ship ngay
  - nhưng tạo warning exception để manager review

## 12.3 Validate tare/gross

- tare > 0
- gross đầu tiên > tare
- gross_n > gross_(n-1)
- line phải chưa có final gross valid trước đó nếu Phase 1 không cho reweigh line
- manual gross/tare phải có reason code

## 12.4 Duplicate weigh event handling

- Dedupe bằng `external_event_id` hoặc combination `scale_ticket_no + shipment + sequence_no`.
- Event trùng:
  - vẫn có thể lưu vào log với `is_valid = false`
  - không được cập nhật line/header state lần nữa

## 12.5 Out-of-order handling

- Không nhận gross line 2 khi chưa có gross line 1 nếu line order đang theo sequence event.
- Nếu UI cho keeper chọn line linh hoạt, thì **sequence** vẫn phải tăng đúng theo lần cân thật, không theo line number.

---

## 13. Tolerance engine — thiết kế chi tiết

## 13.1 Hierarchy khuyến nghị

`tolerance override at transaction > owner_item_policy > item master > owner default > system default`

## 13.2 Công thức variance cơ bản

`variance_pct = abs(actual_net - expected_baseline) / expected_baseline * 100`

Trong đó `expected_baseline` có thể là:
- `expected_qty_kg` cho bulk
- `bag_count * nominal_weight_per_bag` cho bagged/DPM nominal use case

## 13.3 Kết quả tolerance

- `PASS`: line `WEIGHED_PASS`
- `FAIL`: line `WEIGHED_FAIL`, tạo exception, tăng pending approval count

## 13.4 Vì sao không block truck ngay khi fail

- baseline business của TVL là không dừng truck flow giữa vòng cân.
- manager xử lý sau thông qua approval queue.

---

## 14. DPM dual tracking — thiết kế chi tiết

## 14.1 Mục tiêu

Một số owner/item như DPM cần:
- **inventory truth** theo `actual_net_weight`
- **billing/report nominal** theo `bag_count * nominal_weight_per_bag`

## 14.2 Cách lưu dữ liệu khuyến nghị

Ở `shipment_line` lưu tối thiểu:
- `net_weight_kg` = actual
- `bag_count`
- `nominal_weight_per_bag`
- `dpm_nominal_qty_kg`
- `is_dpm_line`

## 14.3 Quy tắc sử dụng

- M3 posting outbound luôn dùng `actual net_weight_kg`.
- M10/báo cáo có thể dùng `dpm_nominal_qty_kg` theo contract cụ thể.
- Không để M10 suy diễn nominal từ raw event thiếu chuẩn.

---

## 15. SO reconciliation — thiết kế chi tiết

## 15.1 Những gì M5 phải update

Tại `SHIPPED`:
- update `so_line.shipped_qty`
- update `so_line.open_qty`
- evaluate auto-close line nếu đạt expected
- ghi trace `shipment_line_id -> so_line_id`

## 15.2 Concurrent shipment cùng SO

- cần lock logic ở SO line update path hoặc dùng version check.
- không để 2 shipment cùng update shipped_qty gây over-ship do race condition.

## 15.3 Standalone shipment

- vẫn cho phép nếu business bật config.
- nhưng phải đi với `source_type = STANDALONE` và validation riêng về commercial control.

---

## 16. Recovery & consistency strategy

## 16.1 Case A — Create shipment thành công nhưng gửi response fail

Giải pháp:
- client retry cùng `external_id`
- backend trả shipment cũ

## 16.2 Case B — Allocation record đã insert nhưng M3 hold fail

Giải pháp:
- cùng transaction nếu cùng DB/shared boundary
- nếu khác boundary, outbound-side phải mark `ALLOCATING_FAILED`, rollback local records hoặc mark pending recovery để worker reconcile

## 16.3 Case C — Pick work outbox đã ghi nhưng M7 chưa nhận

Giải pháp:
- outbox retry worker
- không tạo shipment duplicate
- `shipment_pick_work_link` dùng `external_id` để dedupe phía M7

## 16.4 Case D — Gross duplicate từ M8

Giải pháp:
- dedupe theo `external_event_id`
- log duplicate, không cập nhật state

## 16.5 Case E — M3 post outbound thành công nhưng callback về M5 timeout

Giải pháp:
- `shipment_posting_link` + `m3_external_id`
- retry query result theo external id
- không post lại blindly

## 16.6 Case F — Billing event fail sau khi inventory post success

Giải pháp:
- shipment vẫn coi là `SHIPPED` nếu policy lấy M3 success làm truth
- M10 event được retry qua outbox riêng
- không reverse inventory chỉ vì billing adapter fail

## 16.7 Case G — Cancel sau khi có một số line đã ship

Giải pháp:
- lines đã ship → reversal bắt buộc
- lines chưa ship → release allocation
- đây không phải cancel thuần, mà là correction flow pha trộn reverse + cancel remainder

---

## 17. Thiết kế API implementation-ready

> Gợi ý prefix: `/api/v1/outbound`

## 17.1 Shipment APIs

### 1. `POST /shipments`
**Mục đích:** tạo shipment mới.

**Request chính:**
- `external_id`
- `source_type`
- `so_id` (nullable)
- `owner_id`
- `customer_id`
- `warehouse_id`
- `vehicle_number`
- `vehicle_type_id` (nullable)
- `lines[]`

**Response:** shipment header + lines + trạng thái `DRAFT`

**Validate:**
- owner/warehouse/item active
- same owner, same warehouse cho toàn shipment
- bagged line phải có `bag_count`
- duplicate external_id trả object cũ

**Side effect:** insert shipment tables, audit log.

**Hướng build:**
- controller nhận DTO
- service validate + gọi M1 sequence
- repository insert trong transaction

---

### 2. `GET /shipments`
**Mục đích:** search danh sách shipment.

**Filter gợi ý:**
- `shipment_number`
- `so_id`
- `vehicle_number`
- `owner_id`
- `warehouse_id`
- `status`
- `date_from/date_to`

**Response:** paginated list.

**Hướng build:** query-only, không side effect, index-friendly.

---

### 3. `GET /shipments/:shipmentId`
**Mục đích:** xem chi tiết shipment.

**Trả về:**
- header
- lines
- allocations
- weighing trail summary
- exception summary
- approval summary
- work links
- posting links

**Hướng build:** read model aggregate, có thể compose nhiều repository.

---

### 4. `PATCH /shipments/:shipmentId`
**Mục đích:** sửa shipment khi còn `DRAFT`.

**Validate:**
- chỉ cho sửa field mutable
- nếu đã `CONFIRMED` thì reject field critical

**Hướng build:** optimistic lock bằng `row_version`.

---

### 5. `POST /shipments/:shipmentId/confirm`
**Mục đích:** confirm shipment.

**Request:** `external_id`, optional note.

**Validate:**
- state = `DRAFT`
- đủ vehicle + line + master ref

**Response:** status mới.

**Hướng build:** state machine service + audit.

---

### 6. `POST /shipments/:shipmentId/split`
**Mục đích:** tách shipment thành shipment mới.

**Request:** line split qty / split lines / new vehicle info.

**Validate:**
- chỉ cho ở `DRAFT` hoặc `CONFIRMED` tùy policy
- split qty < remaining qty

**Response:** shipment mới + shipment gốc cập nhật.

**Hướng build:** transaction tạo shipment mới + update shipment cũ; re-sequence line nếu cần.

---

## 17.2 Allocation APIs

### 7. `POST /shipments/:shipmentId/allocate`
**Mục đích:** chạy allocation cho toàn shipment.

**Request:** `external_id`, optional `strategy`.

**Validate:**
- state = `CONFIRMED`
- stock available đủ toàn bộ line
- SO blocking pass

**Response:** allocation detail per line.

**Side effect:** create allocation records, create holds, update state.

**Hướng build:**
- service orchestration
- M3 stock pool query + lock/hold
- transaction-safe

---

### 8. `POST /shipments/:shipmentId/unallocate`
**Mục đích:** release toàn bộ allocation chưa shipped.

**Validate:**
- state phù hợp
- chưa shipped

**Response:** released summary.

**Hướng build:** release hold sang M3 + mark local allocation released.

---

### 9. `GET /shipments/:shipmentId/allocations`
**Mục đích:** xem chi tiết allocation theo source location/dim.

**Hướng build:** query-only.

---

## 17.3 Work handoff APIs

### 10. `POST /shipments/:shipmentId/pick-work`
**Mục đích:** tạo pick work sang M7 sau allocation.

**Validate:**
- state = `ALLOCATED`
- chưa có active pick work cho line

**Response:** work request accepted / pending.

**Hướng build:** outbox event + idempotency.

---

### 11. `POST /shipments/work-callbacks/pick-completed`
**Mục đích:** endpoint nội bộ để M7 callback pick completed.

**Request:** `external_id`, work refs, picked qty.

**Validate:**
- work exists
- callback chưa xử lý

**Response:** ack.

**Hướng build:** internal auth + idempotent callback handler.

---

### 12. `POST /shipments/work-callbacks/short-pick`
**Mục đích:** callback short pick.

**Request:** short qty, reason, work refs.

**Hướng build:** log exception + update line/allocation picked qty.

---

## 17.4 Weighing APIs

### 13. `POST /shipments/:shipmentId/weigh/tare`
**Mục đích:** ghi nhận tare.

**Request:**
- `external_id`
- `source_mode`
- `raw_weight_kg`
- `scale_ticket_no`
- `captured_at`
- `reason_code` nếu manual

**Validate:**
- state cho phép
- tare chưa tồn tại valid, hoặc policy cho re-tare

**Response:** tare attempt result + new state.

**Hướng build:** dedupe event, insert attempt, update header state.

---

### 14. `POST /shipments/:shipmentId/weigh/gross`
**Mục đích:** ghi nhận gross cho một line.

**Request:**
- `external_id`
- `shipment_line_id`
- `raw_weight_kg`
- `source_mode`
- `scale_ticket_no`
- `captured_at`
- `reason_code` nếu manual

**Validate:**
- tare đã có
- line ở trạng thái cân được
- gross hợp lệ so với gross trước

**Response:** net line, variance, pass/fail, header state snapshot.

**Hướng build:** weighing service + tolerance service + exception service.

---

### 15. `GET /shipments/:shipmentId/weighing-history`
**Mục đích:** xem trail tare/gross đầy đủ.

**Hướng build:** query-only, sort by sequence.

---

## 17.5 Approval APIs

### 16. `GET /approvals/pending-shipments`
**Mục đích:** danh sách shipment/line đang `PENDING_APPROVAL`.

**Filter:** warehouse, owner, item, date.

---

### 17. `POST /shipments/:shipmentId/approve`
**Mục đích:** approve shipment/line fail tolerance.

**Request:**
- `external_id`
- `decision_scope`
- `line_ids[]`
- `reason_code`
- `note`

**Validate:**
- role = manager authorized
- shipment đang pending approval

**Response:** new state.

**Hướng build:** approval service + state machine + audit snapshot.

---

### 18. `POST /shipments/:shipmentId/reject`
**Mục đích:** reject shipment/line fail tolerance.

**Hướng build:** approval service + cancel/release logic cho phần chưa ship.

---

## 17.6 Shipping & close APIs

### 19. `POST /shipments/:shipmentId/ship`
**Mục đích:** trigger ship/posting sang M3 tại `SHIPPED`.

**Request:** `external_id`

**Validate:**
- shipment đủ điều kiện ship
- không còn pending approval
- line pass/reconciled đủ

**Response:** accepted / shipped result.

**Hướng build:**
- create posting links
- outbox command sang M3
- update state khi success

---

### 20. `POST /shipments/:shipmentId/close`
**Mục đích:** close shipment sau ship.

**Validate:** state = `SHIPPED`.

**Hướng build:** state machine + audit.

---

### 21. `POST /shipments/:shipmentId/cancel`
**Mục đích:** cancel shipment trước ship.

**Request:** `external_id`, `reason_code`, `note`

**Validate:** state thuộc cancel matrix.

**Hướng build:** release hold + cancel work request + update state.

---

### 22. `POST /shipments/:shipmentId/reverse`
**Mục đích:** tạo reversal request sau shipped.

**Request:** line scope, reverse qty nếu cần, reason.

**Validate:** posted lines tồn tại.

**Hướng build:** reverse orchestration sang M3, không sửa ledger local cũ.

---

## 17.7 Inquiry / audit APIs

### 23. `GET /shipments/:shipmentId/history`
**Mục đích:** xem status history + exception + approval timeline.

---

### 24. `GET /shipments/:shipmentId/exceptions`
**Mục đích:** xem chi tiết ngoại lệ.

---

### 25. `GET /shipments/:shipmentId/postings`
**Mục đích:** xem mapping sang M3 posting/reverse.

---

### 26. `GET /shipments/kpis/summary`
**Mục đích:** expose KPI hooks cho dashboard outbound.

**KPI gợi ý:**
- shipment count
- allocation fail count
- pending approval rate
- average allocation→shipped turnaround
- short pick rate
- DPM variance

---

## 18. Error code gợi ý

| Code | Ý nghĩa |
|---|---|
| OUT_SHP_400_INVALID_PAYLOAD | Payload không hợp lệ |
| OUT_SHP_404_NOT_FOUND | Không tìm thấy shipment |
| OUT_SHP_409_INVALID_STATE | State hiện tại không cho phép action |
| OUT_ALLOC_409_STOCK_NOT_ENOUGH | Không đủ AVAILABLE stock |
| OUT_ALLOC_409_SO_BLOCK | Vượt blocking rule theo SO |
| OUT_ALLOC_409_CONCURRENT_CONFLICT | Conflict khi concurrent allocation |
| OUT_WGH_409_TARE_REQUIRED | Chưa có tare |
| OUT_WGH_409_DUPLICATE_EVENT | Event cân trùng |
| OUT_WGH_422_INVALID_GROSS_SEQUENCE | Gross không hợp lệ theo sequence |
| OUT_APR_403_NOT_AUTHORIZED | Không có quyền approve/reject |
| OUT_SHIP_409_PENDING_APPROVAL | Còn line chờ duyệt |
| OUT_SHIP_502_POSTING_FAILED | M3 posting fail |
| OUT_WRK_502_CREATE_PICK_FAILED | Tạo work M7 fail |
| OUT_REV_409_NOT_SHIPPED | Chưa ship nên không được reverse |

---

## 19. Pseudo-flow cho dev intern dễ code

## 19.1 Allocate shipment

```ts
async allocateShipment(cmd: AllocateShipmentCommand, ctx: RequestContext) {
  const shipment = await shipmentRepo.getForUpdate(cmd.shipmentId)
  assertState(shipment.status, ['CONFIRMED'])

  const lines = await lineRepo.findByShipment(shipment.id)

  for (const line of lines) {
    const stockPool = await inventoryAdapter.queryAvailableStock({
      itemId: line.itemId,
      ownerId: shipment.ownerId,
      warehouseId: shipment.warehouseId,
      requiredQtyKg: line.expectedQtyKg,
    })

    const plan = allocationPolicy.buildFifoPlan(stockPool, line.expectedQtyKg)
    if (!plan.ok) throw new DomainError('OUT_ALLOC_409_STOCK_NOT_ENOUGH')

    await inventoryAdapter.createHold(plan.toHoldCommand(cmd.externalId, ctx))
    await allocationRepo.insertPlan(shipment, line, plan, ctx)
    await lineRepo.markAllocated(line.id, plan.totalQty, ctx)
  }

  await shipmentRepo.markAllocated(shipment.id, ctx)
  await statusHistoryRepo.append(...)
  await audit.log(...)

  return shipmentRepo.getDetail(shipment.id)
}
```

## 19.2 Receive gross event

```ts
async recordGross(cmd: RecordGrossCommand, ctx: RequestContext) {
  const shipment = await shipmentRepo.getForUpdate(cmd.shipmentId)
  assertTareExists(shipment)

  const line = await lineRepo.get(cmd.shipmentLineId)
  const previousGross = await weighingRepo.findPreviousValidGross(cmd.shipmentId)

  const net = weighingPolicy.calculateNet({
    tare: shipment.tareWeightKg,
    previousGross,
    currentGross: cmd.rawWeightKg,
  })

  const tolerance = await toleranceService.resolveOutboundTolerance(shipment, line)
  const variance = tolerancePolicy.calculateVariance(line.expectedQtyKg, net)
  const passed = tolerancePolicy.isPass(variance, tolerance)

  await weighingRepo.insertGrossAttempt(...)
  await lineRepo.updateWeighResult(line.id, { net, variance, passed }, ctx)

  if (!passed) {
    await exceptionRepo.openToleranceFail(...)
  }

  await shipmentAggregateService.refreshHeaderState(shipment.id, ctx)
  return shipmentRepo.getDetail(shipment.id)
}
```

## 19.3 Ship shipment

```ts
async shipShipment(cmd: ShipShipmentCommand, ctx: RequestContext) {
  const shipment = await shipmentRepo.getForUpdate(cmd.shipmentId)
  assertReadyToShip(shipment)

  const lines = await lineRepo.findReadyForShip(shipment.id)
  const postingLinks = []

  for (const line of lines) {
    const postingExternalId = buildPostingExternalId(shipment, line, cmd.externalId)
    postingLinks.push(await postingLinkRepo.createPending(...))
    await outboxRepo.enqueue('PostOutboundShipment', {
      shipmentId: shipment.id,
      shipmentLineId: line.id,
      postingExternalId,
      qtyKg: line.netWeightKg,
      ...
    })
  }

  await shipmentRepo.markShipPendingOrProcessing(shipment.id, ctx)
  return { accepted: true, shipmentId: shipment.id }
}
```

---

## 20. NFR áp cho Module 5

| Nhóm | Yêu cầu |
|---|---|
| Integrity | Không over-commit stock; ship chỉ trừ tồn 1 lần; reverse-only sau post |
| Reliability | Retry không sinh duplicate shipment / work / posting |
| Concurrency | Allocation phải transaction-safe và lock-safe |
| Traceability | Mọi exception và posting truy ngược được về shipment, line, user, external_id |
| Performance | Search shipment và query detail đủ nhanh cho vận hành điều phối xe |
| Recoverability | Có cách phát hiện và xử lý lệch giữa shipment state, work state và posting state |
| Auditability | Giữ đủ log để xử lý tranh chấp khách hàng và kiểm toán |
| Extensibility | Cho phép mở rộng partial shipment, FEFO, container logic ở Phase 2 mà không đập lại model |

---

## 21. Khuyến nghị triển khai DB migration

### 21.1 Thứ tự tạo bảng
1. `shipment_header`
2. `shipment_line`
3. `shipment_allocation_record`
4. `shipment_weighing_attempt`
5. `shipment_status_history`
6. `shipment_exception_log`
7. `shipment_approval_decision`
8. `shipment_pick_work_link`
9. `shipment_posting_link`
10. `shipment_outbox_event`

### 21.2 Seed cần chuẩn bị
- shipment status enum
- line status enum
- exception code enum
- approval decision type enum
- work type enum

### 21.3 Index rollout
- rollout cùng migration, không để sau vì query console và concurrent allocation sẽ đau rất nhanh.

---

## 22. Test strategy khuyến nghị

## 22.1 Unit tests
- state machine allowed/forbidden transitions
- FIFO allocation policy
- tolerance calculation
- weighing net calculation
- DPM nominal calculation
- SO blocking policy

## 22.2 Integration tests
- create → confirm → allocate → pick callback → tare → gross → ship → close
- duplicate create external_id
- duplicate gross event
- M3 posting fail rồi retry success
- M7 work create fail rồi retry success
- cancel tại từng state hợp lệ
- reverse sau ship

## 22.3 Concurrency tests
- 2 shipment allocate cùng stock pool
- concurrent approve/reject cùng shipment
- ship command bắn 2 lần cùng external_id

## 22.4 Audit tests
- manual weight phải có reason code + audit
- approval decision phải có before/after snapshot
- reverse phải có reason và trace tới trans gốc

---

## 23. Mapping tóm tắt với các module 1 → 4

### Module 1 — Foundation & Governance
Module 5 dùng:
- permission guard
- number sequence `SHP`
- reason code
- audit log
- idempotency policy

### Module 2 — Master Data Management
Module 5 dùng:
- owner
- customer
- item
- warehouse
- location
- inventory status
- UOM / conversion
- owner_item_policy
- vehicle type

### Module 3 — Inventory Core Engine
Module 5 dùng:
- availability query
- hold/release hold
- outbound posting
- reversal posting

### Module 4 — Inbound Operations
Module 5 liên thông logic với:
- cùng pattern weighbridge-first
- cùng immutability / reverse-only
- inbound tạo stock pool để outbound consume
- shared recovery pattern cho integration + posting

---

## 24. Backlog kỹ thuật nên tách theo sprint

### Sprint A — nền tảng outbound
- DB core tables
- create/update/confirm shipment
- query/search/detail
- state machine framework

### Sprint B — allocation + work handoff
- allocation engine
- inventory availability integration
- hold/release flow
- create pick work outbox

### Sprint C — weighing + approval
- tare/gross APIs
- weighing history
- tolerance engine
- approval queue / approve / reject

### Sprint D — ship + reverse + close
- outbound posting integration M3
- billing hook M10
- reverse request
- SO reconciliation
- close flow

### Sprint E — hardening
- concurrency tests
- retry jobs
- healthcheck dashboards
- audit drill-down

---

## 25. Kết luận tech lead

Module 5 không chỉ là “màn hình shipment” hay “API ship hàng”. Đây là **business gate cuối cùng trước khi tồn kho bị trừ khỏi hệ thống**.

Nếu build đúng module này:
- stock sẽ không bị over-commit khi nhiều shipment tranh cùng nguồn hàng,
- pick/load sẽ được trace rõ từ allocation đến thực thi,
- weighing outbound sẽ phản ánh đúng đặc thù TVL thay vì ép vào mô hình 1 line/1 cân đơn giản,
- outbound posting sẽ chỉ diễn ra đúng lúc `SHIPPED`,
- DPM sẽ được theo dõi đúng giữa inventory và billing,
- QA có thể test theo state machine + posting point thay vì đoán theo màn hình.

Nếu build sai hoặc làm nửa vời module này, hệ thống rất dễ gặp:
- trùng allocation,
- shipment ship rồi nhưng không post hoặc post 2 lần,
- truck flow bị kẹt vì weigh duplicate/out-of-order,
- SO shipped quantity sai,
- billing và inventory lệch nhau,
- audit trail không đủ để xử lý tranh chấp.

Vì vậy, khuyến nghị mạnh là team dev phải giữ đúng 4 nguyên lý bất biến khi code Module 5:

1. **Shipment là business context, không phải inventory truth.**
2. **Allocation là hold, không phải deduct.**
3. **`SHIPPED` là posting point duy nhất của outbound.**
4. **Mọi retry phải idempotent và mọi correction sau post phải reverse-only.**

---

## 26. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp tài liệu cũ và mới có khác biệt, ưu tiên sử dụng:

1. PRD / Blueprint / Module Master / Overview bản mới hơn
2. Module 5 spec enhanced
3. Module 3 và Module 4 tech stack đã chốt
4. Module 1 và Module 2 control/data foundation

