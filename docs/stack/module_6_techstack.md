# TVL SWM — Module 6 Tech Stack & Backend Design
# Inventory Control

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Audit Team  
**Mục tiêu:** Chuyển hóa Module 6 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, orchestration, integration và data model cho Inventory Control.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 6 — Inventory Control Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 6 thực chất phải build những gì ở Phase 1.
- Luồng **database → repository → service → command orchestration → posting handoff → query/read model** nên tổ chức ra sao.
- Vì sao Module 6 chỉ sở hữu **operational document/use case** còn inventory truth vẫn thuộc **Module 3 — Inventory Core Engine**.
- Thiết kế database nào vừa đúng cho go-live Phase 1 vừa đủ sạch để scale cho transfer nâng cao, cycle count nâng cao, QC hold, batch/lot và work-driven execution ở phase sau.
- Từng API dùng để làm gì, input/output gì, validate gì, side effect gì, retry/idempotency ra sao.
- Cách Module 6 ánh xạ với **Module 1, 2, 3, 4, 5** và các module liên quan như M7, M10, Reporting/Audit.
- Cách build technical recovery để duplicate request, concurrent move/adjust, posting fail, work callback fail, recount mismatch, transfer aging không làm lệch tồn kho.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- Module 6 gồm On-Hand Inquiry, Movement History, Move Internal, Inter-Warehouse Transfer, Inventory Status Change, Cycle Count, Inventory Adjustment, Reconciliation Review.  
- Module 6 **không cập nhật OnHand trực tiếp**; mọi side-effect inventory phải đi qua **M3** để post `InventTrans` và tái tính `OnHand`.  
- M3 là shared inventory backbone: `InventDim → InventTrans → OnHand`; ledger append-only; reverse-only correction.  
- M5 sở hữu allocation-based hold và reserved stock; Module 6 không được bypass reserved/allocation rule.  
- Module 6 phụ thuộc M1 cho permission, reason code, audit, idempotency, number sequence; phụ thuộc M2 cho item/owner/warehouse/location/status/UOM; phụ thuộc M3 cho posting/query/reconciliation engine; và có thể tích hợp M7 khi move/transfer chạy theo work mode.  

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 24 kết luận kỹ thuật quan trọng cho Module 6:

1. **Module 6 là operational orchestration layer cho inventory control**, không phải inventory ledger engine.
2. **Module 6 sở hữu document/use case nghiệp vụ** như move, transfer, count, adjustment, status change, reconciliation review.
3. **Module 6 không được ghi trực tiếp vào `invent_trans` hoặc `on_hand`**; mọi thay đổi tồn phải gọi posting engine của M3.
4. **On-hand inquiry và movement history là read capability thật**, không phải tiện ích phụ.
5. **Internal move** là movement trong cùng warehouse, thay location, không đổi owner, thường không đổi status.
6. **Inter-warehouse transfer** phải đi qua trạng thái `IN_TRANSIT`, có 2 posting points logic: ship và receive.
7. **Status change** là inventory event thật, có impact tới allocatable/available semantics, reason code bắt buộc.
8. **Cycle count** phải hỗ trợ blind count, variance review, recount và tạo adjustment có kiểm soát.
9. **Adjustment** là capability thật, nhưng phải bị kiểm soát mạnh nhất về RBAC, reason code, limit và audit.
10. **Reconciliation review** không chỉ là báo cáo; nó là lớp điều tra sai lệch giữa ledger và read model/snapshot.
11. **Reserved stock/allocated stock của outbound là vùng cấm**, Module 6 không được move/adjust trái rule nếu chưa release hold hợp lệ từ M3/M5.
12. **Owner là dimension bắt buộc**, nên mọi command/query của M6 đều phải tôn trọng owner segregation.
13. **AVAILABLE là trạng thái duy nhất allocatable** cho outbound; status change phải tôn trọng rule này.
14. **Move/transfer/status change/count/adjustment đều phải idempotent** ở level command API.
15. **Ledger đã post là immutable**; correction sau post phải reverse hoặc compensating transaction.
16. **Module 6 phải tách command model và query/read model**, tránh trộn logic update với inquiry.
17. **Transfer, move có thể chạy DIRECT hoặc WORK_BASED**, nhưng inventory effect cuối phải như nhau; chỉ orchestration khác nhau.
18. **Cycle count và adjustment là vùng rủi ro gian lận/claim cao**, vì vậy audit trail phải sâu hơn CRUD bình thường.
19. **Reconciliation, transfer aging, count variance trend** là capability vận hành thật, không nên coi là phase sau nếu muốn go-live ổn định.
20. **Query history phải drill down được tới `InventTrans`, reason code, source_ref, correlation_id**, phục vụ điều tra.
21. **M6 phải scale cho volume query cao hơn volume command**, nên cần chú ý index và read model strategy.
22. **Thiết kế DB của M6 phải chừa đường cho Batch/Lot/LPN/Serial**, nhưng không làm phình baseline go-live.
23. **Technical recovery là bắt buộc** cho posting fail, work callback fail, duplicate submit và stale in-progress documents.
24. **Code structure phải ngăn module khác truy cập trực tiếp bảng command của M6 để đổi state**, mọi chuyển trạng thái phải đi qua service/state machine tập trung.

---

## 3. Phạm vi build thực tế của Module 6 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. On-hand inquiry
2. Movement history / inventory history
3. Move internal document + execute flow
4. Inter-warehouse transfer document + ship/receive flow
5. Inventory status change request + posting flow
6. Cycle count plan/header/line + blind count + recount + variance review
7. Inventory adjustment header/line + posting flow
8. Reconciliation review + issue tracking + manual rerun trigger
9. Command state machine cho move / transfer / count / adjustment / status change
10. Validation matrix theo item/location/owner/status/reserved rules
11. Posting handoff sang M3 cho mọi side-effect inventory
12. Optional work handoff sang M7 cho execution mode = WORK_BASED
13. Read APIs cho on-hand, history, transfer aging, count variance, adjustment history
14. Audit trail + exception trail integration với M1
15. Idempotency handling cho mọi command side-effect
16. Technical recovery cho posting fail / callback fail / retry / stale documents
17. Reporting hooks / event publishing cho M10 và Reporting
18. Error code implementation + optimistic locking + concurrency control

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build full physical inventory freeze cho toàn kho.
2. Không build directed movement engine quá nâng cao theo AI/slotting.
3. Không build QC/Lab workflow đầy đủ.
4. Không build transport planning ngoài transfer nội bộ giữa kho.
5. Không build financial inventory valuation/costing.
6. Không build workflow engine approval tổng quát đa cấp.
7. Không build event streaming analytics phức tạp trước khi xong operational core.
8. Không build batch/lot/serial runtime nếu Phase 1 chưa bật.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** document/use case của inventory control.
- **Có build** query model cho on-hand/history/reconciliation review.
- **Có build** posting orchestration sang Module 3.
- **Có build** work integration khi execution mode dùng work.
- **Không build** inventory ledger trong Module 6.
- **Không build** direct update `on_hand` hoặc `invent_trans` trong Module 6.
- **Không build** billing calculation trong Module 6; chỉ publish inventory-impact event cho M10.
- **Không build** generalized task engine; chỉ handoff work cụ thể sang M7 khi flow yêu cầu.

---

## 4. Khuyến nghị tech stack chính thức cho Module 6

Để đồng bộ với Module 1, 2, 3, 4, 5 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho command/query chính; outbox/event cho integration nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot query / distributed coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Integration layer

- **Inventory adapter:** gọi Module 3 cho posting/query/reversal/reconciliation trigger
- **Work adapter:** gọi Module 7 để create/complete/cancel work khi flow dùng WORK_BASED
- **Billing/report hook:** phát event inventory-impact cho Module 10 / Reporting
- **Outbox pattern:** dùng cho `PostMove`, `PostTransferShip`, `PostTransferReceive`, `PostStatusChange`, `PostAdjustment`, `PublishCountVariance`, `PublishReconciliationIssue`

### 4.4 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên `M6 document → M3 posting → audit → reporting`
- Metrics:
  - move success/fail rate
  - transfer aging count
  - status change volume by reason
  - count variance rate
  - adjustment rate by reason
  - reconciliation mismatch count
  - posting retry count
  - stale in-progress document count
- Tracing: OpenTelemetry-ready

### 4.5 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- State-machine test: move/transfer/count/adjustment/status-change transition matrix
- Concurrency test: 2 commands chạm cùng stock pool hoặc cùng count line
- Idempotency test: retry cùng `external_id` không sinh duplicate document/posting
- Recovery test: M3 fail, M7 callback fail, transfer receive duplicate, recount duplicate submit

### 4.6 Vì sao nên giữ cùng stack với Module 1–5

- M1 là nền cho permission, reason code, audit, sequence, idempotency.
- M2 là nguồn master data cho owner/item/warehouse/location/status/UOM/capacity.
- M3 là inventory core engine mà M6 bắt buộc phải gọi cho move/transfer/status change/adjustment/count delta/reconciliation.
- M4/M5 đã dùng pattern state machine + outbox + posting handoff; M6 nên reuse cùng pattern để team dev nhỏ dễ maintain.
- Cùng stack giúp reuse guard, interceptor, request context, audit service, idempotency service, sequence service, migration style và code structure.

---

## 5. Kiến trúc tổng thể Module 6 trong hệ backend

```text
Web Admin / Ops Console / Mobile / Internal Services
                         |
                         v
             NestJS Inventory-Control Controllers
                         |
    +--------------------+---------------------+
    |                    |                     |
    v                    v                     v
 Auth Guard       Permission Guard       Idempotency Guard
    |                    |                     |
    +--------------------+---------------------+
                         |
                         v
              Inventory-Control Application Layer
+-------------------+--------------------+--------------------+------------------+
|                   |                    |                    |                  |
v                   v                    v                    v                  v
Inquiry Service  Move Service      Transfer Service   Count Service     Adjust Service
History Service  Status Service    Reconcile Service  Query Service     Recovery Service
                         |
                         v
                    Domain / Policy Layer
+-------------------+--------------------+--------------------+------------------+
| State Machine     | Validation Policy  | Posting Rule       | Recovery Policy  |
| Limit Policy      | Reserved Rule      | Read Model Policy  | Error Mapping    |
| Work Mode Policy  | Count Policy       | Aging Policy       | Approval Policy  |
+-------------------+--------------------+--------------------+------------------+
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
- **Application services**: orchestration use case theo document/use case của M6.
- **Domain/policy layer**: state machine, validation matrix, reserved rules, count/adjust rules, transfer aging rules.
- **Repository layer**: query/CRUD thuần.
- **Outbox/integration adapters**: tách riêng để không block transaction nghiệp vụ quá lâu.

### 5.2 Tư tưởng thiết kế cốt lõi

- M6 phải dùng **command/query separation** rất rõ.
- Posting sang M3 phải qua **một adapter/service duy nhất**, không gọi rải rác từ controller.
- Query on-hand/history nên ưu tiên dùng read model/index phù hợp, không join nặng tùy tiện vào ledger cho mọi màn hình.
- Move/transfer/status change/count/adjustment đều phải đi qua **state machine tập trung**, không cho controller tự cập nhật status.
- Reconciliation review là lớp control chất lượng dữ liệu, không phải chỉ là báo cáo cuối kỳ.
- `inventory_control_exception_log` và `document_status_history` là capability bắt buộc để điều tra vận hành.

---

## 6. Phân ranh runtime ownership giữa Module 6 và các module khác

| Concern | Module 6 sở hữu | Module khác sở hữu |
|---|---|---|
| On-hand inquiry nghiệp vụ | Có | M3 cung cấp truth/query foundation |
| Movement history nghiệp vụ | Có | M3 sở hữu ledger nguồn |
| Move / Transfer / Count / Adjustment / Status Change document | Có | Không |
| Inventory posting ledger | Không | M3 |
| OnHand calculation | Không | M3 |
| Reversal inventory ledger | Không | M3 |
| Work execution runtime | Không | M7 |
| Reserved stock / allocation release logic | Không | M5 + M3 |
| Permission / reason code / audit / idempotency framework | Không, chỉ consume | M1 |
| Master values owner/item/location/status/UOM/capacity | Không, chỉ consume | M2 |
| Receipt / inbound runtime | Không | M4 |
| Shipment / outbound runtime | Không | M5 |
| Billing calculation | Không | M10 |

### 6.1 Ánh xạ Module 6 với Module 1

Module 6 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được tạo move / transfer / count / adjustment / status change
   - ai được approve variance hoặc execute direct adjustment
   - ai được run reconciliation review / rerun check
   - ai được query cross-owner / cross-warehouse
   - ai được reverse hoặc close exception

2. **Reason code**
   - adjustment bắt buộc reason
   - status change bắt buộc reason
   - count variance adjustment bắt buộc reason
   - cancel/reject/exception close có thể bắt buộc reason
   - reversal/correction bắt buộc reason

3. **Audit trail**
   - create/update/confirm/execute/cancel document M6
   - post inventory command sang M3
   - review variance / approve / reject
   - reconciliation issue open/close
   - limit breach / access denied / technical retry

4. **Idempotency**
   - create move/transfer/count/adjustment/status-change
   - execute move/ship transfer/receive transfer
   - submit count / approve variance / post adjustment
   - rerun reconciliation / close reconciliation issue

5. **Number sequence**
   - `MOV-*`, `TRF-*`, `STC-*`, `CNT-*`, `ADJ-*`, `REC-*` theo convention hệ thống

### 6.2 Ánh xạ Module 6 với Module 2

Module 6 consume master data từ Module 2 như sau:

1. `item` → validate active, base UOM, cargo form
2. `owner` → owner segregation bắt buộc
3. `warehouse` → scope thao tác, transfer boundary
4. `location` → validate source/destination, type/profile/capacity/zone
5. `inventory_status` → allowed matrix cho allocate/block/damage/in-transit
6. `uom` / `uom_conversion` → chuẩn hóa qty input
7. `owner_item_policy` → future support cho handling-specific override nếu có
8. `location profile/capacity` → kiểm tra move/transfer target hợp lệ

### 6.3 Ánh xạ Module 6 với Module 3

Module 6 gọi Module 3 ở các nhóm capability chính:

1. **On-hand query / availability query**
   - lấy `physical_qty`, `reserved_qty`, `available_qty`
   - filter theo item + owner + warehouse + location + status

2. **Movement history / transaction inquiry**
   - lấy ledger history từ `invent_trans`
   - drill down theo `ref_type`, `ref_id`, `reason_code`, `correlation_id`

3. **Posting inventory events**
   - `PostInternalMove`
   - `PostTransferShip`
   - `PostTransferReceive`
   - `PostStatusChange`
   - `PostAdjustment`
   - `PostCountVarianceAdjustment`

4. **Reversal / compensating transaction**
   - correction sau post
   - reject technical duplicate / stale retry

5. **Reconciliation trigger / result query**
   - run reconciliation
   - fetch mismatch results

### 6.4 Ánh xạ Module 6 với Module 4

Module 4 tạo stock pool inbound và handoff putaway; Module 6 consume stock pool đã tồn tại:

1. Sau khi Receipt `RECEIVED`, stock xuất hiện ở M3.
2. Module 6 có thể move từ receiving sang storage nếu flow manual move được dùng thay vì putaway work.
3. Status change / adjustment của stock nhận từ inbound phải vẫn trace ngược được về receipt/inbound source.
4. Reconciliation review phải hỗ trợ điều tra lệch bắt nguồn từ inbound post / putaway issue.

### 6.5 Ánh xạ Module 6 với Module 5

Đây là mapping nhạy cảm nhất vì M5 sở hữu allocation/hold:

1. Module 5 tạo `reserved_qty`/hold khi allocate shipment.
2. Module 6 **không được move/adjust stock đang reserved** trừ khi policy cho phép và M3/M5 release hold hợp lệ.
3. Status change từ `AVAILABLE` sang `BLOCKED/DAMAGED` phải chặn nếu qty đang reserved cho outbound.
4. Transfer ship không được lấy từ stock đang reserved cho shipment khác.
5. Reconciliation review phải hỗ trợ phân biệt mismatch do hold/release/post outbound issue.

### 6.6 Ánh xạ Module 6 với M7, M10 và Reporting

- **M7**: move/transfer có thể phát sinh work nếu `execution_mode = WORK_BASED`; M7 thực thi task, callback completion để M6 mới post hoặc hoàn tất state tùy design.
- **M10**: adjustment/status change/transfer có thể phát event inventory-impact cho billing nếu có ảnh hưởng billable quantity hoặc storage snapshot semantics.
- **Reporting/Audit**: consume movement history, variance, shrinkage, transfer aging, reconciliation result, adjustment reason trend.

---

## 7. Đề xuất cấu trúc code backend cho Module 6

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
    inventory-control/
      inventory-control.module.ts
      controllers/
        onhand-inquiry.controller.ts
        movement-history.controller.ts
        move-order.controller.ts
        transfer-order.controller.ts
        inventory-status-change.controller.ts
        cycle-count.controller.ts
        inventory-adjustment.controller.ts
        reconciliation-review.controller.ts
        inventory-control-admin.controller.ts
      services/
        onhand-inquiry.service.ts
        movement-history.service.ts
        move-order.service.ts
        move-execution.service.ts
        transfer-order.service.ts
        transfer-shipping.service.ts
        transfer-receiving.service.ts
        inventory-status-change.service.ts
        cycle-count.service.ts
        cycle-count-review.service.ts
        inventory-adjustment.service.ts
        reconciliation-review.service.ts
        inventory-control-state-machine.service.ts
        inventory-control-validation.service.ts
        inventory-control-policy.service.ts
        inventory-control-recovery.service.ts
        inventory-control-audit.service.ts
        inventory-control-query.service.ts
        inventory-posting-adapter.service.ts
        work-handoff.service.ts
      repositories/
        move-order.repository.ts
        move-order-line.repository.ts
        transfer-order.repository.ts
        transfer-order-line.repository.ts
        inventory-status-change.repository.ts
        cycle-count-plan.repository.ts
        cycle-count-header.repository.ts
        cycle-count-line.repository.ts
        adjustment-header.repository.ts
        adjustment-line.repository.ts
        reconciliation-review.repository.ts
        document-status-history.repository.ts
        inventory-control-exception.repository.ts
        inventory-control-outbox.repository.ts
      dto/
      entities/
      mappers/
      policies/
        move.policy.ts
        transfer.policy.ts
        status-change.policy.ts
        count.policy.ts
        adjustment.policy.ts
        reconciliation.policy.ts
        reserved-stock.policy.ts
        work-mode.policy.ts
        recovery.policy.ts
      jobs/
        transfer-aging.job.ts
        reconciliation-sync.job.ts
        stale-document-recovery.job.ts
        count-overdue-monitor.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không được gọi trực tiếp M3/M7.
- Chỉ `inventory-posting-adapter.service.ts` được phát command inventory sang M3.
- `inventory-control-state-machine.service.ts` là nơi duy nhất quyết định transition allowed/forbidden.
- `inventory-control-validation.service.ts` phải gom validation chung: owner/location/status/UOM/reserved/capacity/permission.
- Repository không chứa nghiệp vụ move/transfer/count/adjustment.
- Mọi command service phải nhận `requestContext` chứa `user_id`, `role`, `source_app`, `correlation_id`.
- Không service ngoài Module 6 được truy cập trực tiếp bảng document M6 để đổi trạng thái nghiệp vụ.

---

## 8. Thiết kế database tổng thể cho Module 6

## 8.1 Nguyên tắc DB design

1. Tách **command documents** của M6 khỏi **inventory truth** của M3.
2. Mọi bảng command phải có `external_id`, `correlation_id`, `source_app`, `row_version`.
3. Tách `header` và `line` cho move/transfer/count/adjustment để scale tốt và dễ audit.
4. Tách `status_history` và `exception_log` khỏi header để trace tốt.
5. Không lưu snapshot tồn riêng để làm source-of-truth; read model cache chỉ là optional và phải invalidate có kiểm soát.
6. Dùng soft cancel/state terminal, không hard delete document đã có history.
7. Thiết kế index ưu tiên cho query theo `document_number`, `warehouse`, `owner`, `status`, `created_at`, `item`, `location`.
8. Mọi posting side-effect sang M3 phải lưu `posted_ref`, `posted_trans_id`, `posting_status` để recovery.
9. Chừa field mở rộng cho Batch/Lot/Serial/LPN ở phase sau nhưng không activate trong Phase 1.
10. Tối ưu theo hướng **query nhiều, write vừa phải, audit sâu**, đặc thù của Inventory Control.

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Command / operational tables
- `ic_move_order`
- `ic_move_order_line`
- `ic_transfer_order`
- `ic_transfer_order_line`
- `ic_inventory_status_change`
- `ic_cycle_count_plan`
- `ic_cycle_count_header`
- `ic_cycle_count_line`
- `ic_adjustment_header`
- `ic_adjustment_line`
- `ic_reconciliation_review`
- `ic_reconciliation_review_line`

### 8.2.2 Trace / support tables
- `ic_document_status_history`
- `ic_exception_log`
- `ic_outbox_event`
- `ic_work_link`
- `ic_query_cache_version` *(optional)*
- `ic_count_evidence` *(optional: ảnh/file/ref chứng cứ)*

### 8.2.3 Không thuộc Module 6 nhưng phải tham chiếu
- `invent_dim`, `invent_trans`, `on_hand`, `inventory_hold`, `inventory_reconciliation_result` từ M3
- `md_item`, `md_owner`, `md_warehouse`, `md_location`, `md_inventory_status`, `md_uom` từ M2
- `audit_log`, `reason_code`, `number_sequence`, `idempotency_record` từ M1

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `ic_move_order`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| move_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `MOV` |
| warehouse_id | UUID | FK NOT NULL | cùng source/destination warehouse |
| execution_mode | VARCHAR(20) | NOT NULL | DIRECT / WORK_BASED |
| status | VARCHAR(30) | NOT NULL | DRAFT / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED / FAILED |
| reason_code | VARCHAR(50) | NULL | move chuẩn có thể không bắt buộc |
| remarks | TEXT | NULL | |
| requested_by | UUID | NOT NULL | user tạo |
| confirmed_by | UUID | NULL | |
| completed_by | UUID | NULL | |
| work_header_id | VARCHAR(50) | NULL | link M7 |
| posting_status | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' | PENDING / POSTED / FAILED |
| posted_ref | VARCHAR(100) | NULL | ref group bên M3 |
| external_id | VARCHAR(100) | NOT NULL | idempotency |
| correlation_id | VARCHAR(50) | NOT NULL | trace |
| source_app | VARCHAR(30) | NOT NULL | WEB / MOBILE / API / SYSTEM |
| row_version | BIGINT | NOT NULL DEFAULT 0 | optimistic lock |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

**Index đề xuất**
- unique(`move_number`)
- unique(`external_id`)
- index(`warehouse_id`,`status`,`created_at`)
- index(`correlation_id`)

### 8.3.2 `ic_move_order_line`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| move_order_id | UUID | FK NOT NULL | |
| line_no | INT | NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| from_location_id | UUID | FK NOT NULL | |
| to_location_id | UUID | FK NOT NULL | |
| inventory_status | VARCHAR(30) | NOT NULL | status hiện tại |
| requested_qty | NUMERIC(18,3) | NOT NULL | |
| executed_qty | NUMERIC(18,3) | NULL | |
| uom | VARCHAR(20) | NOT NULL | |
| line_status | VARCHAR(30) | NOT NULL | OPEN / EXECUTING / COMPLETED / CANCELLED / FAILED |
| shortage_reason_code | VARCHAR(50) | NULL | |
| posted_trans_group_id | VARCHAR(100) | NULL | link cặp move trans |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Index đề xuất**
- unique(`move_order_id`,`line_no`)
- index(`item_id`,`owner_id`,`from_location_id`)
- index(`to_location_id`)
- index(`line_status`)

### 8.3.3 `ic_transfer_order`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| transfer_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `TRF` |
| from_warehouse_id | UUID | FK NOT NULL | |
| to_warehouse_id | UUID | FK NOT NULL | |
| execution_mode | VARCHAR(20) | NOT NULL | DIRECT / WORK_BASED |
| status | VARCHAR(30) | NOT NULL | CREATED / RELEASED / SHIPPED / IN_TRANSIT / PARTIALLY_RECEIVED / RECEIVED / CLOSED / CANCELLED / FAILED |
| requested_ship_date | DATE | NULL | |
| actual_ship_at | TIMESTAMP | NULL | |
| actual_receive_at | TIMESTAMP | NULL | |
| in_transit_sla_hours | INT | NULL | |
| vehicle_number | VARCHAR(50) | NULL | |
| shipped_by | UUID | NULL | |
| received_by | UUID | NULL | |
| cancel_reason_code | VARCHAR(50) | NULL | |
| close_reason_code | VARCHAR(50) | NULL | |
| posting_ship_status | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' | |
| posting_receive_status | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' | |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |
| source_app | VARCHAR(30) | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

**Index đề xuất**
- unique(`transfer_number`)
- unique(`external_id`)
- index(`from_warehouse_id`,`status`,`created_at`)
- index(`to_warehouse_id`,`status`,`requested_ship_date`)
- index(`actual_ship_at`)
- index(`actual_receive_at`)

### 8.3.4 `ic_transfer_order_line`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| transfer_order_id | UUID | FK NOT NULL | |
| line_no | INT | NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | ownership giữ nguyên P1 |
| uom | VARCHAR(20) | NOT NULL | |
| requested_qty | NUMERIC(18,3) | NOT NULL | |
| shipped_qty | NUMERIC(18,3) | NULL | |
| received_qty | NUMERIC(18,3) | NULL | |
| variance_qty | NUMERIC(18,3) | NULL | shipped - received |
| from_location_id | UUID | FK NOT NULL | |
| to_location_id | UUID | FK NULL | set lúc receive nếu cần |
| inventory_status | VARCHAR(30) | NOT NULL | |
| line_status | VARCHAR(30) | NOT NULL | OPEN / SHIPPED / PARTIALLY_RECEIVED / RECEIVED / CLOSED / CANCELLED |
| variance_reason_code | VARCHAR(50) | NULL | |
| issue_flag | BOOLEAN | NOT NULL DEFAULT false | |
| posted_ship_trans_id | VARCHAR(100) | NULL | |
| posted_receive_trans_id | VARCHAR(100) | NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Index đề xuất**
- unique(`transfer_order_id`,`line_no`)
- index(`item_id`,`owner_id`,`line_status`)
- index(`issue_flag`)

### 8.3.5 `ic_inventory_status_change`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| status_change_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `STC` |
| warehouse_id | UUID | FK NOT NULL | |
| location_id | UUID | FK NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| from_status | VARCHAR(30) | NOT NULL | |
| to_status | VARCHAR(30) | NOT NULL | |
| qty | NUMERIC(18,3) | NOT NULL | |
| uom | VARCHAR(20) | NOT NULL | |
| reason_code | VARCHAR(50) | NOT NULL | mandatory |
| reason_text | TEXT | NULL | |
| attachment_ref | VARCHAR(255) | NULL | evidence link |
| status | VARCHAR(30) | NOT NULL | CREATED / POSTED / REVERSED / FAILED / CANCELLED |
| posted_trans_group_id | VARCHAR(100) | NULL | |
| requested_by | UUID | NOT NULL | |
| approved_by | UUID | NULL | nếu policy cần |
| posted_at | TIMESTAMP | NULL | |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |
| source_app | VARCHAR(30) | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

### 8.3.6 `ic_cycle_count_plan`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| plan_code | VARCHAR(50) | UNIQUE NOT NULL | sequence hoặc business code |
| warehouse_id | UUID | FK NOT NULL | |
| scope_type | VARCHAR(30) | NOT NULL | LOCATION / ITEM / LOCATION_ITEM / OWNER |
| frequency | VARCHAR(20) | NOT NULL | DAILY / WEEKLY / MONTHLY / ADHOC |
| selection_rule | JSONB | NULL | config lọc scope |
| blind_count | BOOLEAN | NOT NULL DEFAULT true | |
| recount_threshold_pct | NUMERIC(8,4) | NULL | |
| auto_post_threshold_pct | NUMERIC(8,4) | NULL | |
| max_recount | INT | NOT NULL DEFAULT 1 | |
| status | VARCHAR(20) | NOT NULL | ACTIVE / INACTIVE |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

### 8.3.7 `ic_cycle_count_header`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| count_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `CNT` |
| cycle_count_plan_id | UUID | FK NULL | adhoc có thể null |
| warehouse_id | UUID | FK NOT NULL | |
| count_scope_snapshot | JSONB | NOT NULL | snapshot lúc release |
| status | VARCHAR(30) | NOT NULL | CREATED / RELEASED / COUNTING / SUBMITTED / APPROVED / POSTED / CANCELLED |
| blind_count | BOOLEAN | NOT NULL | |
| released_at | TIMESTAMP | NULL | |
| submitted_at | TIMESTAMP | NULL | |
| approved_at | TIMESTAMP | NULL | |
| posted_at | TIMESTAMP | NULL | |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |
| source_app | VARCHAR(30) | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

### 8.3.8 `ic_cycle_count_line`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| cycle_count_header_id | UUID | FK NOT NULL | |
| line_no | INT | NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| warehouse_id | UUID | FK NOT NULL | |
| location_id | UUID | FK NOT NULL | |
| inventory_status | VARCHAR(30) | NOT NULL | |
| system_qty | NUMERIC(18,3) | NULL | có thể ẩn với blind count |
| counted_qty | NUMERIC(18,3) | NULL | |
| variance_qty | NUMERIC(18,3) | NULL | |
| variance_pct | NUMERIC(8,4) | NULL | |
| recount_no | INT | NOT NULL DEFAULT 0 | |
| line_status | VARCHAR(30) | NOT NULL | OPEN / COUNTED / VARIANCE / APPROVED / POSTED / CANCELLED |
| adjustment_header_id | UUID | FK NULL | link adjustment sinh ra |
| evidence_ref | VARCHAR(255) | NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 8.3.9 `ic_adjustment_header`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| adjustment_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `ADJ` |
| warehouse_id | UUID | FK NOT NULL | |
| adjustment_type | VARCHAR(20) | NOT NULL | INCREASE / DECREASE / MIXED |
| source_type | VARCHAR(30) | NOT NULL | MANUAL / COUNT / RECONCILIATION / TRANSFER_VARIANCE |
| status | VARCHAR(30) | NOT NULL | DRAFT / SUBMITTED / APPROVED / POSTED / CANCELLED / FAILED |
| total_line_count | INT | NOT NULL DEFAULT 0 | |
| total_abs_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| requested_by | UUID | NOT NULL | |
| approved_by | UUID | NULL | |
| posted_at | TIMESTAMP | NULL | |
| reason_code | VARCHAR(50) | NOT NULL | header-level default reason |
| remarks | TEXT | NULL | |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |
| source_app | VARCHAR(30) | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

### 8.3.10 `ic_adjustment_line`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| adjustment_header_id | UUID | FK NOT NULL | |
| line_no | INT | NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| warehouse_id | UUID | FK NOT NULL | |
| location_id | UUID | FK NOT NULL | |
| inventory_status | VARCHAR(30) | NOT NULL | |
| qty_delta | NUMERIC(18,3) | NOT NULL | có dấu +/- |
| uom | VARCHAR(20) | NOT NULL | |
| reason_code | VARCHAR(50) | NOT NULL | line override nếu cần |
| posted_trans_id | VARCHAR(100) | NULL | |
| line_status | VARCHAR(30) | NOT NULL | OPEN / APPROVED / POSTED / FAILED / CANCELLED |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 8.3.11 `ic_reconciliation_review`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| reconciliation_review_number | VARCHAR(50) | UNIQUE NOT NULL | sequence `REC` |
| warehouse_id | UUID | FK NULL | lọc theo scope |
| scope_type | VARCHAR(30) | NOT NULL | WAREHOUSE / ITEM / OWNER / GLOBAL |
| source_run_id | VARCHAR(100) | NULL | link run bên M3 |
| status | VARCHAR(30) | NOT NULL | OPEN / INVESTIGATING / RESOLVED / CLOSED |
| mismatch_count | INT | NOT NULL DEFAULT 0 | |
| severity | VARCHAR(20) | NOT NULL | LOW / MEDIUM / HIGH / CRITICAL |
| assigned_to | UUID | NULL | |
| summary | TEXT | NULL | |
| resolution_type | VARCHAR(30) | NULL | NO_ACTION / ADJUSTMENT / REVERSE / INVESTIGATION |
| resolution_ref | VARCHAR(100) | NULL | link ADJ / reversal / ticket |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |
| source_app | VARCHAR(30) | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NOT NULL | |

### 8.3.12 `ic_document_status_history`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| entity_type | VARCHAR(30) | NOT NULL | MOVE / TRANSFER / STATUS_CHANGE / COUNT / ADJUSTMENT / RECONCILIATION |
| entity_id | UUID | NOT NULL | |
| old_status | VARCHAR(30) | NULL | |
| new_status | VARCHAR(30) | NOT NULL | |
| changed_by | UUID | NOT NULL | |
| changed_at | TIMESTAMP | NOT NULL | |
| reason_code | VARCHAR(50) | NULL | |
| notes | TEXT | NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |

### 8.3.13 `ic_exception_log`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| entity_type | VARCHAR(30) | NOT NULL | |
| entity_id | UUID | NOT NULL | |
| exception_type | VARCHAR(50) | NOT NULL | RESERVED_STOCK / POST_FAIL / LIMIT_BREACH / VARIANCE / DUPLICATE / WORK_CALLBACK_MISS |
| severity | VARCHAR(20) | NOT NULL | LOW / MEDIUM / HIGH / CRITICAL |
| message | TEXT | NOT NULL | |
| payload_json | JSONB | NULL | snapshot input |
| status | VARCHAR(20) | NOT NULL DEFAULT 'OPEN' | OPEN / ACK / RESOLVED / IGNORED |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | system/user |
| resolved_at | TIMESTAMP | NULL | |
| resolved_by | UUID | NULL | |
| correlation_id | VARCHAR(50) | NOT NULL | |

---

## 8.4 Partitioning, indexing và scale strategy

### 8.4.1 Partitioning

Phase 1 chưa cần partition ngay cho hầu hết bảng M6, nhưng nên chừa design để bật nhanh sau này:

- `ic_document_status_history`: partition theo tháng nếu volume cao.
- `ic_exception_log`: partition theo tháng/quý.
- `ic_cycle_count_line`: cân nhắc partition theo `warehouse_id` hoặc tháng với volume count lớn.

### 8.4.2 Index trọng yếu

- `on-hand inquiry` cần index ở M3 trên `(item_id, owner_id, warehouse_id, location_id, inventory_status)`; M6 không nên duplicate không cần thiết.
- `movement history` cần index query theo `(item_id, owner_id, posted_at desc)` và `(correlation_id)` ở M3.
- `ic_transfer_order` cần index `status + actual_ship_at` để job transfer aging chạy nhanh.
- `ic_cycle_count_line` cần index theo `warehouse_id + location_id + line_status`.
- `ic_adjustment_line` cần index theo `item_id + owner_id + location_id + created_at`.

### 8.4.3 Cache strategy

- Cache nhẹ cho dropdown/reference/status matrix.
- Không cache cứng on-hand lâu; nếu cache thì TTL ngắn và invalidate theo posting event từ M3.
- Reconciliation dashboard có thể dùng cache 30–60 giây.

---

## 9. State machine catalog cho Module 6

## 9.1 Move Order

```text
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
   └──────────────→ CANCELLED
   └──────────────→ FAILED
```

### Rule
- `DRAFT`: cho sửa line.
- `CONFIRMED`: khóa line chính; chuẩn bị execute hoặc create work.
- `IN_PROGRESS`: đang execute hoặc đang chờ callback work/posting.
- `COMPLETED`: đã post xong M3.
- `FAILED`: posting/work lỗi kỹ thuật hoặc business fail sau confirm.
- `CANCELLED`: chỉ trước khi post hoàn tất.

## 9.2 Transfer Order

```text
CREATED → RELEASED → SHIPPED → IN_TRANSIT → PARTIALLY_RECEIVED → RECEIVED → CLOSED
    └────────────────────────────────────────────────────────────→ CANCELLED
    └────────────────────────────────────────────────────────────→ FAILED
```

### Rule
- `CREATED`: tạo document.
- `RELEASED`: chốt line, sẵn sàng ship.
- `SHIPPED`: command ship đã được chấp nhận và post ship thành công hoặc đang processing.
- `IN_TRANSIT`: stock đã rời kho nguồn, đang ở dim/status transit.
- `PARTIALLY_RECEIVED`: cho phép receive nhiều lần nếu bật trong baseline build.
- `RECEIVED`: đủ toàn bộ line.
- `CLOSED`: kết thúc document.

## 9.3 Inventory Status Change

```text
CREATED → POSTED → REVERSED
   └────────→ FAILED
   └────────→ CANCELLED
```

## 9.4 Cycle Count

```text
CREATED → RELEASED → COUNTING → SUBMITTED → APPROVED → POSTED
   └──────────────────────────────────────────────→ CANCELLED
```

## 9.5 Adjustment

```text
DRAFT → SUBMITTED → APPROVED → POSTED
   └──────────────────────────→ CANCELLED
   └──────────────────────────→ FAILED
```

## 9.6 Reconciliation Review

```text
OPEN → INVESTIGATING → RESOLVED → CLOSED
  └──────────────→ IGNORED (optional if policy cho phép)
```

---

## 10. Luồng xử lý chuẩn: database → backend → posting

Phần này mô tả đúng thứ tự mà dev phải nghĩ khi build.

## 10.1 Luồng chuẩn cho command side-effect

```text
API Request
  → Auth Guard
  → Permission Guard
  → Idempotency Check
  → DTO Validation
  → Business Validation (owner/item/location/status/reserved)
  → Begin DB Transaction (M6 command tables)
  → Create/Update document + status history
  → Commit M6 DB Transaction
  → Publish outbox event / call posting adapter
  → M3 post inventory event atomically vào invent_trans + on_hand
  → callback/result update M6 posting_status + posted_ref
  → Audit log / metrics / event downstream
```

### Tại sao phải tách như vậy
- DB transaction của M6 không nên giữ lock quá lâu khi gọi network sang M3/M7.
- Dùng outbox giúp retry-safe và recovery tốt hơn.
- Mọi side-effect liên module phải idempotent theo `external_id` + action context.

## 10.2 Luồng query chuẩn

```text
API Query
  → Auth Guard
  → Permission + Data Scope Check
  → Query Service
  → Join local document tables + fetch read data từ M3/M2 nếu cần
  → Response DTO
```

### Nguyên tắc
- Query on-hand/history ưu tiên lấy truth từ M3.
- Query document detail ưu tiên đọc bảng M6 rồi enrich từ M2/M3.
- Không tính toán tồn kho thủ công trong M6.

---

## 11. Thiết kế API tổng thể cho Module 6

## 11.1 Nhóm API Query

1. `GET /api/v1/inventory-control/on-hand`
2. `GET /api/v1/inventory-control/on-hand/:itemId`
3. `GET /api/v1/inventory-control/movement-history`
4. `GET /api/v1/inventory-control/transfers/aging`
5. `GET /api/v1/inventory-control/reconciliation-reviews`
6. `GET /api/v1/inventory-control/reconciliation-reviews/:id`
7. `GET /api/v1/inventory-control/cycle-counts/:id`
8. `GET /api/v1/inventory-control/adjustments/:id`
9. `GET /api/v1/inventory-control/status-changes/:id`
10. `GET /api/v1/inventory-control/moves/:id`
11. `GET /api/v1/inventory-control/transfers/:id`

## 11.2 Nhóm API Move

1. `POST /api/v1/inventory-control/moves`
2. `POST /api/v1/inventory-control/moves/:id/confirm`
3. `POST /api/v1/inventory-control/moves/:id/execute`
4. `POST /api/v1/inventory-control/moves/:id/cancel`

## 11.3 Nhóm API Transfer

1. `POST /api/v1/inventory-control/transfers`
2. `POST /api/v1/inventory-control/transfers/:id/release`
3. `POST /api/v1/inventory-control/transfers/:id/ship`
4. `POST /api/v1/inventory-control/transfers/:id/receive`
5. `POST /api/v1/inventory-control/transfers/:id/close`
6. `POST /api/v1/inventory-control/transfers/:id/cancel`

## 11.4 Nhóm API Status Change

1. `POST /api/v1/inventory-control/status-changes`
2. `POST /api/v1/inventory-control/status-changes/:id/cancel`
3. `POST /api/v1/inventory-control/status-changes/:id/reverse`

## 11.5 Nhóm API Cycle Count

1. `POST /api/v1/inventory-control/cycle-count-plans`
2. `POST /api/v1/inventory-control/cycle-counts`
3. `POST /api/v1/inventory-control/cycle-counts/:id/release`
4. `POST /api/v1/inventory-control/cycle-counts/:id/submit`
5. `POST /api/v1/inventory-control/cycle-counts/:id/recount`
6. `POST /api/v1/inventory-control/cycle-counts/:id/approve`
7. `POST /api/v1/inventory-control/cycle-counts/:id/post`
8. `POST /api/v1/inventory-control/cycle-counts/:id/cancel`

## 11.6 Nhóm API Adjustment

1. `POST /api/v1/inventory-control/adjustments`
2. `POST /api/v1/inventory-control/adjustments/:id/submit`
3. `POST /api/v1/inventory-control/adjustments/:id/approve`
4. `POST /api/v1/inventory-control/adjustments/:id/post`
5. `POST /api/v1/inventory-control/adjustments/:id/cancel`
6. `POST /api/v1/inventory-control/adjustments/:id/reverse`

## 11.7 Nhóm API Reconciliation Review

1. `POST /api/v1/inventory-control/reconciliation-reviews/run`
2. `POST /api/v1/inventory-control/reconciliation-reviews/:id/assign`
3. `POST /api/v1/inventory-control/reconciliation-reviews/:id/resolve`
4. `POST /api/v1/inventory-control/reconciliation-reviews/:id/close`

---

## 12. Phân tích kỹ từng API: mục đích, input, validate, hướng build

## 12.1 `GET /api/v1/inventory-control/on-hand`

### Mục đích
Tra cứu tồn hiện tại theo item/owner/warehouse/location/status cho vận hành.

### Input chính
- `item_id`
- `owner_id`
- `warehouse_id`
- `location_id`
- `inventory_status`
- `include_zero`
- `page`, `page_size`

### Output chính
- item, owner, warehouse, location, status
- `physical_qty`, `reserved_qty`, `available_qty`
- `last_movement_at`

### Validate
- User có quyền xem scope warehouse/owner tương ứng.
- Không cho customer viewer xem cross-owner.

### Hướng build
- Query via M3 on-hand service/read model.
- M6 chỉ enrich business-friendly labels.
- Dùng cursor/page pagination, tránh query full table.

## 12.2 `GET /api/v1/inventory-control/movement-history`

### Mục đích
Tra cứu lịch sử biến động tồn ở góc nhìn nghiệp vụ.

### Filter
- date range
- item / owner / warehouse / location
- trans_type / reason_code
- source_ref_type / source_ref_id
- `correlation_id`

### Hướng build
- Consume transaction query service của M3.
- Map thêm info từ M6 docs để hiện document number/type.
- Index ở M3 quan trọng hơn index tại M6.

## 12.3 `POST /api/v1/inventory-control/moves`

### Mục đích
Tạo move order.

### Input chính
- header: `warehouse_id`, `execution_mode`, `reason_code?`, `external_id`, `correlation_id`
- lines: `item_id`, `owner_id`, `from_location_id`, `to_location_id`, `inventory_status`, `qty`, `uom`

### Validate
- cùng warehouse
- source != destination
- item/owner/location active
- qty > 0
- không dùng status `IN_TRANSIT`
- source available đủ nếu execute direct ngay
- reserved qty không được dùng

### Hướng build
- Tạo header + line ở `DRAFT`.
- Chưa post inventory tại bước create.
- Audit `MOVE_CREATED`.

## 12.4 `POST /api/v1/inventory-control/moves/:id/confirm`

### Mục đích
Chốt move order để execute.

### Validate
- state phải là `DRAFT`
- line hợp lệ
- optional recheck on-hand nếu policy yêu cầu

### Hướng build
- đổi state `DRAFT → CONFIRMED`
- nếu `WORK_BASED` thì có thể phát outbox create work

## 12.5 `POST /api/v1/inventory-control/moves/:id/execute`

### Mục đích
Thực hiện move inventory.

### Input chính
- `executed_lines[]` với qty thực hiện
- `external_id`

### Validate
- state = `CONFIRMED` hoặc `IN_PROGRESS`
- executed_qty <= requested_qty
- source available đủ tại thời điểm execute
- stock không bị reserved / blocked by other doc

### Side effect
- gọi M3 `PostInternalMove`
- update `posting_status`
- completed nếu tất cả lines post xong

### Hướng build
- DIRECT mode: service gọi posting adapter ngay.
- WORK_BASED mode: chỉ cho execute khi M7 callback complete hoặc mobile execute theo task.
- M3 tạo 2 trans move (from → to), M6 lưu `posted_trans_group_id`.

## 12.6 `POST /api/v1/inventory-control/moves/:id/cancel`

### Mục đích
Hủy move order trước khi post xong.

### Validate
- chưa `COMPLETED`
- nếu có work đang open phải cancel work trước hoặc đồng bộ policy
- reason code nếu policy yêu cầu

### Hướng build
- update state `CANCELLED`
- log exception nếu partial posting đã xảy ra; lúc đó không cho cancel thường mà phải reverse.

## 12.7 `POST /api/v1/inventory-control/transfers`

### Mục đích
Tạo transfer order liên kho.

### Input chính
- `from_warehouse_id`, `to_warehouse_id`, `execution_mode`, `requested_ship_date`, `vehicle_number?`, `lines[]`, `external_id`

### Validate
- source warehouse != destination warehouse
- owner giữ nguyên
- qty > 0
- line source/dest location hợp lệ

### Hướng build
- Tạo document state `CREATED`
- Chưa post gì vào inventory

## 12.8 `POST /api/v1/inventory-control/transfers/:id/release`

### Mục đích
Chốt transfer để sẵn sàng ship.

### Validate
- state = `CREATED`
- line hợp lệ

### Hướng build
- `CREATED → RELEASED`
- nếu `WORK_BASED` thì create shipping work / picking move work tùy design

## 12.9 `POST /api/v1/inventory-control/transfers/:id/ship`

### Mục đích
Ship hàng khỏi kho nguồn, chuyển sang trạng thái `IN_TRANSIT`.

### Input chính
- `ship_lines[]` qty ship thực tế
- `external_id`

### Validate
- state = `RELEASED`
- source available đủ
- không dùng reserved stock
- status source phù hợp allowed matrix

### Side effect
- gọi M3 `PostTransferShip`
- M3 chuyển qty từ dim source sang dim transit
- update line `shipped_qty`
- state `SHIPPED/IN_TRANSIT`

### Hướng build
- dùng posting adapter + outbox
- nếu post fail, giữ state kỹ thuật `FAILED` hoặc ship-pending theo policy; không sửa tồn tay

## 12.10 `POST /api/v1/inventory-control/transfers/:id/receive`

### Mục đích
Nhận hàng tại kho đích.

### Input chính
- `receive_lines[]` gồm line, qty, to_location_id
- `external_id`

### Validate
- state phải cho phép receive (`IN_TRANSIT` hoặc `PARTIALLY_RECEIVED`)
- qty receive không vượt qty còn lại theo policy
- location đích hợp lệ

### Side effect
- gọi M3 `PostTransferReceive`
- M3 chuyển qty từ dim transit sang dim đích
- tạo variance nếu receive khác shipped

### Hướng build
- hỗ trợ partial receive nếu baseline build cho phép, nhưng phải chốt rõ.
- variance sinh issue/adjustment request, không auto-fix ledger âm thầm.

## 12.11 `POST /api/v1/inventory-control/transfers/:id/close`

### Mục đích
Đóng transfer order sau khi nhận đủ và xử lý xong variance.

### Validate
- tất cả line ở `RECEIVED` hoặc `CLOSED`
- không còn issue open nghiêm trọng

### Hướng build
- update state `CLOSED`
- publish transfer completed event nếu cần

## 12.12 `POST /api/v1/inventory-control/transfers/:id/cancel`

### Mục đích
Hủy transfer trước khi ship.

### Validate
- chỉ cho cancel trước ship thành công
- nếu đã post ship thì phải reverse theo flow khác

### Hướng build
- cancel document, cancel work liên quan nếu có

## 12.13 `POST /api/v1/inventory-control/status-changes`

### Mục đích
Đổi trạng thái inventory của stock tại 1 location.

### Input chính
- `warehouse_id`, `location_id`, `item_id`, `owner_id`, `from_status`, `to_status`, `qty`, `uom`, `reason_code`, `external_id`

### Validate
- allowed matrix: ví dụ `AVAILABLE ↔ BLOCKED`, `AVAILABLE ↔ DAMAGED`
- không cho đổi trực tiếp từ/đến status không hợp lệ như `IN_TRANSIT` nếu policy cấm
- qty khả dụng đủ
- reserved qty không được đổi nếu chưa release

### Side effect
- gọi M3 `PostStatusChange`
- update state `POSTED`

### Hướng build
- status change có thể là logical event với qty sign = 0 ở business view, nhưng backend vẫn nên bám contract posting chuẩn do M3 định nghĩa.
- bắt buộc reason code và audit.

## 12.14 `POST /api/v1/inventory-control/status-changes/:id/reverse`

### Mục đích
Reverse status change đã post sai.

### Validate
- chỉ role đủ quyền
- lý do bắt buộc
- chưa bị reverse trước đó

### Hướng build
- gọi reversal service ở M3
- update state `REVERSED`

## 12.15 `POST /api/v1/inventory-control/cycle-count-plans`

### Mục đích
Tạo/cập nhật kế hoạch kiểm kê chu kỳ.

### Hướng build
- config-only API
- idempotent create/update
- audit thay đổi threshold/scope rất quan trọng

## 12.16 `POST /api/v1/inventory-control/cycle-counts`

### Mục đích
Khởi tạo đợt count từ plan hoặc adhoc.

### Input chính
- `warehouse_id`, `scope`, `plan_id?`, `blind_count`, `external_id`

### Side effect
- snapshot scope item/location/status tại thời điểm tạo
- state `CREATED`

### Hướng build
- snapshot line set từ M3 on-hand query tại thời điểm create/release
- không giữ lock kho toàn phần ở Phase 1

## 12.17 `POST /api/v1/inventory-control/cycle-counts/:id/release`

### Mục đích
Phát hành đợt count cho người kiểm kê.

### Hướng build
- `CREATED → RELEASED`
- generate count lines
- ẩn system qty nếu blind count

## 12.18 `POST /api/v1/inventory-control/cycle-counts/:id/submit`

### Mục đích
Nộp kết quả count.

### Input chính
- `count_lines[]` gồm line id + counted_qty + evidence_ref?

### Validate
- chỉ line thuộc document đó
- counted_qty >= 0
- không submit duplicate line ngoài policy recount

### Hướng build
- lưu counted qty
- tính variance
- state `SUBMITTED`
- line variance vượt threshold được flag

## 12.19 `POST /api/v1/inventory-control/cycle-counts/:id/recount`

### Mục đích
Mở recount cho line/document variance cao.

### Validate
- chưa vượt `max_recount`
- line/document đang ở trạng thái cho recount

### Hướng build
- tăng `recount_no`
- reset line status phù hợp
- audit lý do recount

## 12.20 `POST /api/v1/inventory-control/cycle-counts/:id/approve`

### Mục đích
Approve variance result trước khi post adjustment.

### Validate
- role đủ quyền
- variance nằm trong policy approval

### Hướng build
- tạo hoặc chuẩn bị `adjustment_header/line` từ delta count
- state `APPROVED`

## 12.21 `POST /api/v1/inventory-control/cycle-counts/:id/post`

### Mục đích
Post adjustment từ count variance.

### Side effect
- gọi M3 `PostCountVarianceAdjustment`
- update count `POSTED`
- link adjustment document / trans ids

### Hướng build
- không post trực tiếp trong line update; phải qua adjustment/posting adapter.

## 12.22 `POST /api/v1/inventory-control/adjustments`

### Mục đích
Tạo manual adjustment.

### Input chính
- header + lines với qty_delta, item/location/owner/status, reason_code, source_type

### Validate
- qty_delta != 0
- reserved/in-transit policy
- role limit theo warehouse/item class/value if configured

### Hướng build
- create `DRAFT`
- line-level validation kỹ hơn move vì đây là flow rủi ro nhất

## 12.23 `POST /api/v1/inventory-control/adjustments/:id/submit`

### Mục đích
Gửi adjustment vào luồng review/approval.

### Hướng build
- `DRAFT → SUBMITTED`
- freeze line core fields

## 12.24 `POST /api/v1/inventory-control/adjustments/:id/approve`

### Mục đích
Approve adjustment trước khi post.

### Validate
- role đủ quyền
- nằm trong hạn mức/phạm vi được approve

### Hướng build
- `SUBMITTED → APPROVED`

## 12.25 `POST /api/v1/inventory-control/adjustments/:id/post`

### Mục đích
Post adjustment đã được approve.

### Side effect
- gọi M3 `PostAdjustment`
- update line `posted_trans_id`
- state `POSTED`

### Hướng build
- all-or-nothing theo header là dễ quản trị nhất cho Phase 1
- nếu partial fail, chuyển `FAILED` và log exception để recovery

## 12.26 `POST /api/v1/inventory-control/adjustments/:id/reverse`

### Mục đích
Reverse adjustment đã post sai.

### Hướng build
- gọi M3 reversal
- yêu cầu reason code + audit + permission cao

## 12.27 `POST /api/v1/inventory-control/reconciliation-reviews/run`

### Mục đích
Chạy reconciliation theo scope để phát hiện mismatch.

### Input chính
- `scope_type`, `warehouse_id?`, `owner_id?`, `item_id?`, `external_id`

### Side effect
- gọi M3 reconciliation service/run
- tạo review document nếu có mismatch hoặc create run log

### Hướng build
- nên chạy async qua queue nếu scope lớn
- trả về `accepted/run_id` rồi query result sau

## 12.28 `POST /api/v1/inventory-control/reconciliation-reviews/:id/resolve`

### Mục đích
Đánh dấu cách xử lý mismatch: no action / adjustment / reverse / investigation.

### Hướng build
- link sang adjustment/reversal/ticket
- không tự auto-fix ngầm trừ khi flow explicit

## 12.29 `POST /api/v1/inventory-control/reconciliation-reviews/:id/close`

### Mục đích
Đóng issue reconciliation khi đã xử lý xong.

### Validate
- phải có resolution_type rõ ràng
- không còn task phụ thuộc mở nếu policy yêu cầu

---

## 13. Contract pattern chuẩn cho mọi command API

Mọi command side-effect API của Module 6 nên dùng payload/meta chuẩn sau:

```json
{
  "external_id": "client-generated-idempotency-key",
  "correlation_id": "uuid-or-trace-id",
  "source_app": "WEB",
  "requested_by": "user-id",
  "payload": { }
}
```

### Quy tắc bắt buộc
- `external_id` unique theo action context.
- `correlation_id` đi xuyên M6 → M3 → audit/outbox.
- Response phải trả `document_id`, `document_number`, `status`, `posting_status`.
- Retry cùng `external_id` phải trả kết quả cũ, không tạo document/posting mới.

---

## 14. Validation matrix bắt buộc

## 14.1 Validation chung cho mọi command

1. item active
2. owner active và thuộc scope user
3. warehouse/location active và thuộc quan hệ đúng
4. UOM hợp lệ / convert được
5. qty > 0 với move/transfer/status change/count submit; `qty_delta != 0` với adjustment
6. status hợp lệ theo master
7. role có quyền hành động
8. document ở đúng state cho transition
9. `external_id` chưa bị dùng cho cùng action
10. `row_version` khớp để tránh lost update

## 14.2 Validation riêng cho move/transfer/status change/adjustment

### Move
- source & destination cùng warehouse
- source != destination
- không dùng `IN_TRANSIT`
- không move stock đang reserved
- capacity/location profile/zone restriction nếu bật

### Transfer
- source warehouse != destination warehouse
- source available đủ
- receive location hợp lệ tại warehouse đích
- ownership không đổi P1
- variance phải được log nếu ship ≠ receive

### Status Change
- `from_status → to_status` phải thuộc allowed matrix
- reason code mandatory
- reserved qty không được đổi status trái rule

### Cycle Count
- line thuộc scope snapshot
- count không âm
- recount không vượt max
- approve/post theo threshold policy

### Adjustment
- reserved/in-transit rule
- role limit rule
- reason code mandatory
- source_type rõ ràng

---

## 15. Reserved stock / allocation safety

Đây là rule cực quan trọng khi M6 tương tác với stock đã bị outbound giữ:

1. Không move stock đang có `reserved_qty` nếu không có release hợp lệ.
2. Không status-change stock reserved từ `AVAILABLE` sang `BLOCKED/DAMAGED` nếu sẽ làm phá shipment allocation.
3. Không transfer ship stock reserved cho outbound khác.
4. Không adjustment giảm vào stock đang reserved nếu làm `available_qty` âm logic.
5. Nếu business bắt buộc override, phải có policy riêng, reason code, audit và ideally manager-only.

### Hướng build
- M6 query M3 availability + hold state trước khi execute/post.
- Tách `reserved-stock.policy.ts` để reuse xuyên move/transfer/status/adjustment.
- Không tự tính reserved từ local cache.

---

## 16. Work-based execution strategy với M7

### Khi nào dùng
- move cần task vật lý ngoài sàn kho
- transfer ship/receive cần người thao tác mobile
- cycle count cần assignment theo khu vực/location

### Pattern đề xuất

```text
M6 Confirm/Release
  → create work request outbox
  → M7 tạo work_header/work_line
  → worker execute
  → M7 callback completion
  → M6 validate callback state
  → M6 call M3 posting (hoặc nếu policy chọn post khi work complete)
  → M6 complete document
```

### Nguyên tắc
- M7 không sở hữu logic inventory control nghiệp vụ của M6.
- M7 chỉ sở hữu task lifecycle.
- M6 vẫn quyết định business state của move/transfer/count execution.

---

## 17. Recovery, idempotency và concurrency control

## 17.1 Idempotency

- Mọi `POST` side-effect phải check `external_id`.
- Dùng shared service của M1 hoặc bảng `idempotency_record` dùng chung.
- Scope khuyến nghị: `(module_code, action_code, external_id)` unique.

## 17.2 Optimistic locking

- Mọi update document header/line dùng `row_version`.
- Nếu version mismatch → trả `409 CONFLICT`.

## 17.3 Row locking / concurrency

Dùng row lock ở những đoạn nhạy cảm:
- execute move trên cùng stock pool
- ship transfer / receive transfer trên cùng line
- post adjustment cho cùng item-location-owner-status
- approve/post count variance cho cùng count line

### Khuyến nghị
- Lock ở M3 stock pool/update truth là chính.
- M6 dùng optimistic lock cho document; M3 dùng transactional lock cho inventory truth.

## 17.4 Recovery cases bắt buộc

1. **M6 document created nhưng post M3 fail**
   - giữ `posting_status = FAILED`
   - log exception
   - cho retry controlled endpoint/job

2. **Work created nhưng callback M7 không về**
   - job stale-document-recovery quét `IN_PROGRESS` quá SLA
   - không tự complete nếu thiếu callback/posting proof

3. **Duplicate submit từ UI/mobile**
   - trả result cũ theo idempotency

4. **Partial line success trong adjustment header**
   - tránh bằng all-or-nothing transaction per header hoặc mark failed + recovery explicit

5. **Transfer ship success nhưng receive retry duplicate**
   - idempotency per receive action + line-level receive guard

---

## 18. Database → backend flow chi tiết theo từng nghiệp vụ

## 18.1 Internal Move

```text
ic_move_order / ic_move_order_line
  → move-order.repository
  → move-order.service confirm/execute
  → inventory-control-validation.service
  → inventory-posting-adapter(PostInternalMove)
  → M3: invent_dim lookup/create → invent_trans pair → on_hand update
  → callback/result persisted vào ic_move_order_line.posted_trans_group_id
  → status history + audit log
```

### Điểm kỹ thuật cần nhớ
- M6 chỉ lưu document và posting reference.
- Truth nằm ở M3.
- Nếu work mode: thêm `ic_work_link` và callback path.

## 18.2 Transfer

```text
ic_transfer_order / ic_transfer_order_line
  → transfer-order.service release/ship/receive
  → validate source/destination/reserved/state
  → PostTransferShip / PostTransferReceive sang M3
  → M3 chuyển dim source ↔ transit ↔ destination
  → update shipped_qty/received_qty/variance_qty
  → transfer-aging.job theo actual_ship_at và actual_receive_at
```

### Điểm kỹ thuật cần nhớ
- Ship và receive là 2 event độc lập.
- Mọi variance phải trace được.
- Không cho sửa tay line đã ship/receive để “khớp số”.

## 18.3 Status Change

```text
ic_inventory_status_change
  → status-change.service
  → validate allowed matrix + reserved rule
  → PostStatusChange sang M3
  → M3 tạo trans/ref tương ứng
  → update POSTED / REVERSED
```

### Điểm kỹ thuật cần nhớ
- reason code luôn mandatory
- attachment evidence optional nhưng nên chừa field

## 18.4 Cycle Count

```text
ic_cycle_count_plan / header / line
  → cycle-count.service create/release
  → snapshot scope từ M3 query
  → user count submit
  → variance compute
  → approve/recount policy
  → if post: create adjustment command
  → PostCountVarianceAdjustment sang M3
  → update count header/line posted
```

### Điểm kỹ thuật cần nhớ
- count snapshot phải rõ thời điểm.
- Không dùng system qty động sau khi release để ghi đè snapshot ban đầu.

## 18.5 Adjustment

```text
ic_adjustment_header / line
  → adjustment.service create/submit/approve/post
  → validate reason/limits/reserved
  → PostAdjustment sang M3
  → M3 ghi invent_trans + update on_hand
  → update posted_trans_id per line
```

### Điểm kỹ thuật cần nhớ
- flow nguy hiểm nhất, audit mạnh nhất.
- nên có approval path ngay cả khi business một số case direct adjust không cần duyệt; ít nhất vẫn phải bám RBAC limit.

## 18.6 Reconciliation Review

```text
ic_reconciliation_review
  → reconciliation-review.service run
  → call M3 reconciliation engine/query
  → persist mismatch summary + lines
  → assign/investigate/resolve
  → link resolution to adjustment/reverse/no-action
```

### Điểm kỹ thuật cần nhớ
- M6 không tự reconcile từ dữ liệu local.
- Kết quả mismatch phải bám output của M3.

---

## 19. Error code baseline đề xuất

| Code | Meaning |
|---|---|
| IC-400-001 | Invalid payload |
| IC-400-002 | Invalid state transition |
| IC-400-003 | Invalid quantity |
| IC-400-004 | Invalid status matrix |
| IC-400-005 | Invalid source/destination location |
| IC-403-001 | Permission denied |
| IC-403-002 | Owner scope denied |
| IC-409-001 | Idempotency conflict |
| IC-409-002 | Document version conflict |
| IC-409-003 | Stock reserved conflict |
| IC-409-004 | Posting already completed |
| IC-422-001 | Insufficient available qty |
| IC-422-002 | Target location capacity/profile blocked |
| IC-422-003 | Count submit exceeds recount policy |
| IC-422-004 | Adjustment limit exceeded |
| IC-500-001 | Inventory posting adapter failure |
| IC-500-002 | Work handoff failure |
| IC-500-003 | Recovery required |

---

## 20. UAT và test cases bắt buộc cho dev/QA

## 20.1 Move
- move full qty thành công
- move partial qty nếu policy cho phép
- source thiếu available
- source stock reserved bị chặn
- destination invalid
- duplicate execute cùng `external_id`

## 20.2 Transfer
- ship thành công, receive đủ
- partial receive nhiều lần
- receive thiếu → variance issue
- cancel trước ship
- ship duplicate retry
- transfer aging quá SLA được flag

## 20.3 Status Change
- AVAILABLE → BLOCKED thành công
- BLOCKED → AVAILABLE thành công
- AVAILABLE → DAMAGED thành công
- fail vì reserved stock
- fail vì thiếu reason code
- reverse status change đã post

## 20.4 Cycle Count
- blind count không lộ system qty
- count đúng không sinh adjustment
- count lệch trong threshold
- count lệch ngoài threshold cần recount/approve
- movement xảy ra sau snapshot nhưng trước submit
- duplicate submit/recount

## 20.5 Adjustment
- increase thành công
- decrease thành công
- role vượt limit bị chặn
- adjust stock reserved bị chặn
- reverse adjustment đã post

## 20.6 Reconciliation Review
- mismatch được tạo review issue
- no mismatch trả result sạch
- resolve bằng adjustment
- resolve bằng no-action
- close issue thiếu resolution bị chặn

---

## 21. Khuyến nghị implementation theo sprint

### Sprint 1
- schema cơ bản M6
- on-hand inquiry
- movement history
- move internal direct mode
- status change
- shared validation/policy/recovery skeleton

### Sprint 2
- transfer ship/receive
- adjustment
- cycle count cơ bản
- audit/idempotency đầy đủ

### Sprint 3
- reconciliation review
- work-based execution integration với M7
- transfer aging job
- reporting hooks

### Sprint 4
- hardening: concurrency, retry, stale recovery, UAT fixes, performance tuning

---

## 22. Kết luận kỹ thuật

Module 6 phải được build như một **inventory operations orchestration layer**: sở hữu document nghiệp vụ, rule vận hành, state machine, query nghiệp vụ và recovery; nhưng **không sở hữu inventory truth**. Inventory truth vẫn là `InventDim → InventTrans → OnHand` của Module 3.

Nếu dev team giữ đúng 5 nguyên tắc sau, Module 6 sẽ vừa đúng nghiệp vụ vừa dễ scale:

1. Không update `on_hand` trực tiếp trong M6.  
2. Mọi side-effect inventory phải đi qua posting adapter chuẩn sang M3.  
3. Tách command model và query model rõ ràng.  
4. Enforce state machine + reserved-stock rule ở backend.  
5. Thiết kế DB theo document + history + exception + outbox, không nhồi tất cả vào một bảng.

Khi build đúng như vậy, Module 6 sẽ đóng vai trò cây cầu chuẩn giữa **vận hành kho thực tế** và **inventory ledger truth**, đồng thời ánh xạ sạch với Module 1, 2, 3, 4, 5 và mở đường tốt cho các module sau.
