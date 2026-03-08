# TVL SWM — Module 8 Tech Stack & Backend Design
# Weighbridge, OCR & Integration

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Mobile Dev, Integration Dev, Ops  
**Mục tiêu:** Chuyển hóa Module 8 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, local agent, sync contracts, OCR flow, ERP push, monitoring và mapping chuẩn với Modules 1–7.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 8 — Weighbridge, OCR & Integration** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 8 thực chất phải build những gì ở Phase 1.
- Luồng chuẩn từ **database → repository → service → integration adapter → outbox/queue → callback/consumer** nên tổ chức ra sao.
- Vì sao Module 8 là **data acquisition + integration layer**, không phải nơi giữ business rules của inbound/outbound/billing.
- Thiết kế database nào vừa đúng go-live Phase 1 vừa đủ sạch để scale cho ALPR, ERP 2-way sync, camera automation, IoT và advanced integration sau này.
- Từng API của Module 8 dùng để làm gì, validate gì, side effect gì, idempotency ra sao và nên build theo pattern nào.
- Cách Module 8 ánh xạ với **Module 1, 2, 3, 4, 5, 6, 7** và cả Billing ở biên tích hợp.
- Cách build local weighbridge agent, OCR intake, mobile sync, ERP push và monitoring sao cho không phá transaction integrity của toàn hệ thống.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- Module 8 chỉ là **lớp data/integration**, không quyết định tolerance, blocking, approval hay posting inventory.
- M8 Phase 1 gồm: **Weighbridge Local Agent, Weighbridge Log Management, OCR Intake, Mobile Sync & Offline Resilience, ERP One-Way Push, Integration Monitoring & Retry**.
- **1 weigh event = 1 immutable weighbridge_log**.
- **Latency mục tiêu <= 2 giây** từ scale read đến SWM response.
- **Manual weight là exception path**, phải được M4/M5 authorize theo role + reason code; M8 chỉ capture event đã được authorize.
- Retry policy là **khác nhau theo từng channel**: weighbridge fixed retry, mobile background retry, ERP exponential backoff, OCR sync no-retry.
- ERP hiện tại là **one-way push Locked Debit Note**; chưa phải 2-way sync.
- Mọi API side effect phải **idempotent**, truy vết được bằng `external_id + correlation_id + source_channel`.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 26 kết luận kỹ thuật quan trọng cho Module 8:

1. **Module 8 là integration platform layer của SWM**, không phải business module quyết định accept/reject hay post tồn.
2. **M8 có 4 bounded contexts kỹ thuật khác nhau**: weighbridge ingestion, OCR intake, mobile sync, ERP push.
3. **M8 không được chứa business rules của M4/M5/M10**; nó chỉ nhận, chuẩn hóa, lưu, phát và theo dõi dữ liệu tích hợp.
4. **Weighbridge log là immutable**, không update sau khi persist; correction phải đi theo business flow module tiêu thụ.
5. **Local agent là runtime thật**, không phải utility phụ; đây là adapter bắt buộc giữa COM port/hardware và backend.
6. **OCR là ingestion + assistive extraction**, không phải workflow ownership của receipt; M4 vẫn quyết định link/confirm nghiệp vụ.
7. **Mobile sync là infrastructure capability**, không phải thay thế state machine của M7.
8. **ERP push là asynchronous delivery problem**, không nên xử lý inline trong request lock debit note.
9. **Retry policy phải khác nhau theo channel**, không được code một retry helper dùng chung vô điều kiện.
10. **Idempotency là bắt buộc** cho weigh event, OCR upload, mobile batch sync, ERP push.
11. **`external_id + correlation_id + source_channel` là traceability tuple cốt lõi** của M8.
12. **Module 8 phải có monitoring và alert thật**, không chỉ log text; vì đây là nơi hỏng âm thầm dễ làm vận hành lệch mà business không thấy ngay.
13. **M8 phải lưu payload/raw evidence đủ để audit**, nhưng không được làm DB phình quá lớn; object storage phải dùng cho ảnh/file lớn.
14. **M8 phải tách read model và command processing**, đặc biệt cho dashboard monitoring và history queries.
15. **Mobile sync backend phải chấp nhận duplicate, late sync, out-of-order sync**, vì mobile offline là capability bắt buộc.
16. **ERP push phải dùng outbox/queue**, không buộc transaction nghiệp vụ billing chờ ERP hồi đáp.
17. **M8 phải có dead-letter / failed bucket**, không được retry vô hạn trừ kênh mobile sync phía client.
18. **Weighbridge local agent nên có local buffer**, vì môi trường cân dễ mất mạng cục bộ nhưng không được mất log cân.
19. **Stable weight detection phải là capability của agent hoặc ingest layer**, không để mỗi màn hình tự hiểu một kiểu.
20. **OCR governance phải có confirmed snapshot**, tránh overwrite ngầm raw OCR result khi operator chỉnh tay.
21. **M8 không được gọi trực tiếp M3 để post inventory**; inventory truth vẫn thuộc M3 qua M4/M5/M6/M7.
22. **M8 phải reuse Module 1** cho RBAC, reason code, audit, idempotency và number sequence nếu cần tracking record human-readable.
23. **M8 phải reuse Module 2** cho object mapping, validation owner/item/warehouse/location/vehicle nếu payload yêu cầu tham chiếu master.
24. **M8 phải hỗ trợ scale write-heavy ở weighbridge log và read-heavy ở monitoring dashboard**, nên partition/index strategy là bắt buộc.
25. **Thiết kế DB của M8 phải chừa đường cho ALPR/camera/object metadata**, nhưng không làm phình Phase 1.
26. **Technical recovery là capability bắt buộc** cho duplicate ingest, queue fail, callback fail, ERP timeout, mobile conflict và stale pending items.

---

## 3. Phạm vi build thực tế của Module 8 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Weighbridge local agent runtime
2. Scale read ingestion API
3. Weighbridge log persistence + dedupe
4. Stable-weight / duplicate-signal handling
5. OCR upload API + extraction orchestration + result storage
6. OCR confirmation/relink/correction support
7. Mobile sync batch ingest API
8. Mobile sync event processing / dedupe / conflict detection
9. ERP push outbox + queue worker + retry
10. ERP payload mapping adapter
11. Integration monitoring dashboard/query APIs
12. Alert rule engine cơ bản
13. Status history / exception trail / audit integration
14. Object storage integration cho ảnh OCR / weighbridge evidence
15. Recovery APIs cho requeue / retry / mark resolved / dead-letter review
16. Idempotency handling cho mọi command side effect
17. Health/heartbeat handling cho local agent/device
18. Error code implementation + queue/backoff policies + observability

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build ALPR automation.
2. Không build ERP 2-way sync.
3. Không build generic iPaaS platform đa tenant.
4. Không build OCR workflow phức tạp nhiều tầng approval nếu spec chưa yêu cầu.
5. Không build device management console kiểu SCADA.
6. Không build object detection / camera analytics.
7. Không build message broker enterprise riêng nếu team đang theo modular monolith + Redis queue.
8. Không build generic MDM/object matching engine quá rộng.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** ingestion, persistence, retry, monitoring, recovery.
- **Có build** contracts rõ cho local agent, OCR, mobile sync và ERP push.
- **Có build** raw log + processed state + alert/dashboard queries.
- **Không build** tolerance engine ở Module 8.
- **Không build** receipt/shipment lifecycle ở Module 8.
- **Không build** inventory posting ledger ở Module 8.
- **Không build** charge calculation ở Module 8.
- **Không cho phép** M8 tự đổi trạng thái business của receipt/shipment/work ngoài callback/handoff contract đã chốt.

---

## 4. Khuyến nghị tech stack chính thức cho Module 8

Để đồng bộ với Modules 1–7 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho ingest/query/admin recovery; outbox/event cho xử lý nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot dedupe / queue coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis
- **Object storage:** S3-compatible để lưu OCR image, cargo photo, plate photo, raw attachments

### 4.3 Weighbridge local agent

Khuyến nghị có 2 lựa chọn kỹ thuật, nhưng nên chốt 1 để team thống nhất:

**Option A — Python Agent (khuyến nghị cho go-live):**
- Python 3.x
- pySerial để đọc COM port
- FastAPI nhỏ hoặc daemon service
- local SQLite hoặc file queue nhẹ cho local buffer
- Gửi về backend qua HTTPS REST
- Phù hợp khi cần đọc serial port ổn định, footprint nhỏ, dễ chạy Windows service

**Option B — Electron/Node Agent:**
- Node.js + serialport
- Tốt nếu muốn có UI cục bộ cho WB_OPERATOR
- Nặng hơn, phức tạp hơn cho service mode

**Khuyến nghị cuối cho Phase 1:**
- **Python local agent** ở máy trạm cân
- **NestJS backend** ở server trung tâm

### 4.4 OCR layer

- OCR engine cần là adapter interface, không hard-code vendor.
- Thiết kế 1 abstraction: `OcrProviderAdapter`.
- Giai đoạn đầu hỗ trợ 2 implementation:
  - Cloud OCR provider
  - On-prem / self-hosted OCR provider
- Bản build Phase 1 chỉ bật 1 provider qua config.

### 4.5 ERP integration layer

- Internal outbox + BullMQ worker
- HTTP client: Axios hoặc Nest HttpModule
- Retry/backoff ở worker
- Payload mapper tách riêng
- Signed config / secrets đọc từ env + secret manager

### 4.6 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên `agent -> M8 -> M4/M5/M7/M10`
- Metrics:
  - weigh ingest latency
  - duplicate weigh rate
  - OCR success/fail rate
  - OCR confidence distribution
  - mobile sync duplicate/conflict rate
  - ERP push success/fail/retry rate
  - alert open duration
  - offline device count
- Tracing: OpenTelemetry-ready

### 4.7 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- Queue worker test: retry / dead-letter / recovery paths
- Contract test: agent payload, mobile sync payload, ERP payload mapper
- Concurrency/idempotency test: duplicate weigh event, duplicate sync batch, duplicate ERP push
- Recovery test: post-success-response-fail, queue crash, callback timeout, out-of-order mobile events

### 4.8 Vì sao nên giữ cùng stack với Module 1–7

- M1 là nền cho permission, reason code, audit, idempotency.
- M2 là nguồn master data để map object và validate refs.
- M3 là inventory core truth mà M8 phải tôn trọng biên ownership.
- M4/M5/M7 đều sẽ consume data hoặc sync infra từ M8.
- Cùng stack giúp reuse guard, interceptor, request context, audit service, idempotency service, outbox pattern, migration style và code structure.

---

## 5. Kiến trúc tổng thể Module 8 trong hệ backend

```text
Weighbridge Agent / OCR Upload / Mobile App / Billing Lock Event / Admin Console
                               |
                               v
                    NestJS Integration Controllers
                               |
        +----------------------+-------------------------+
        |                      |                         |
        v                      v                         v
    Auth Guard           Permission Guard         Idempotency Guard
        |                      |                         |
        +----------------------+-------------------------+
                               |
                               v
                    Integration Application Layer
+-------------------+-------------------+-------------------+-------------------+
|                   |                   |                   |                   |
v                   v                   v                   v                   v
Weigh Service    OCR Service       Sync Service       ERP Push Service   Monitoring Service
Recovery Service Query Service     Alert Service      Health Service     Dashboard Service
                               |
                               v
                           Domain / Policy Layer
+-------------------+-------------------+-------------------+-------------------+
| Ingest Policy     | Retry Policy      | Conflict Policy   | Alert Policy      |
| Mapping Policy    | State Machine     | Dedup Policy      | Evidence Policy   |
+-------------------+-------------------+-------------------+-------------------+
                               |
                               v
                           Repository Layer
                               |
                               v
  PostgreSQL + Redis + BullMQ + Object Storage + Shared Audit/Idempotency Services
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa business logic.
- **Guard layer**: auth, permission, idempotency, request context.
- **Application services**: orchestration theo bounded context của M8.
- **Domain/policy layer**: state machine, retry policy, conflict policy, alert policy, dedupe policy.
- **Repository layer**: query/CRUD thuần.
- **Outbox/queue workers**: xử lý async ERP push, monitoring jobs, recovery jobs.
- **Object storage adapter**: tách khỏi DB repository.

### 5.2 Tư tưởng thiết kế cốt lõi

- M8 phải được coi là **integration boundary** rõ ràng, không để business module gọi lẫn logic ingest với logic nghiệp vụ.
- `weighbridge_log`, `ocr_result`, `mobile_sync_batch`, `erp_push_log` là **source-of-truth kỹ thuật** cho từng sub-capability của M8.
- Complete ingest path nên xử lý theo thứ tự: **validate -> dedupe -> persist raw/normalized -> emit callback/outbox -> update monitor state**.
- ERP push không nằm trong cùng DB transaction với hành động lock debit note của billing; dùng outbox để ổn định.
- Mobile sync nên dùng **event replay / batch ingest**, không dùng overwrite snapshot từ thiết bị.
- Monitoring phải đọc từ bảng trạng thái riêng hoặc query được tối ưu; không join thô toàn bộ log table cho dashboard.

---

## 6. Phân ranh runtime ownership giữa Module 8 và các module khác

| Concern | Module 8 sở hữu | Module khác sở hữu |
|---|---|---|
| Weigh raw data ingest | Có | Không |
| Weigh log persistence | Có | Không |
| OCR raw result + confirmed snapshot | Có | Không |
| Mobile sync infra | Có | M7 sở hữu work lifecycle nghiệp vụ |
| ERP push transport | Có | M10/Billing sở hữu business source object |
| Retry/backoff/alert theo channel | Có | Không |
| Tolerance decision | Không | M4/M5 |
| Receipt lifecycle | Không | M4 |
| Shipment lifecycle | Không | M5 |
| Inventory posting ledger | Không | M3 |
| Work lifecycle | Không | M7 |
| Permission / reason code / audit / idempotency framework | Không, chỉ consume | M1 |
| Item / owner / warehouse / location / vehicle master | Không, chỉ consume | M2 |

### 6.1 Ánh xạ Module 8 với Module 1

Module 8 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được xem dashboard integration
   - ai được upload OCR
   - ai được confirm OCR corrections
   - ai được manual requeue ERP push
   - ai được mark alert resolved
   - ai được approve manual weight fallback path
   - ai được xem raw log cross-warehouse

2. **Reason code**
   - manual weight fallback
   - false duplicate override
   - ERP manual retry / force-close failure
   - OCR manual relink/reject
   - mobile conflict resolution / technical recovery

3. **Audit trail**
   - weigh event accepted / duplicate / rejected
   - OCR uploaded / corrected / linked / rejected
   - mobile sync accepted / conflict / duplicate
   - ERP push queued / retried / failed / resolved
   - alert opened / acknowledged / resolved

4. **Idempotency**
   - `POST /m8/weighbridge/events`
   - `POST /m8/ocr/uploads`
   - `POST /m8/mobile-sync/batches`
   - `POST /m8/erp-push/jobs/:id/retry`
   - `POST /m8/alerts/:id/resolve`

5. **Number sequence**
   - không bắt buộc cho raw records
   - có thể dùng cho human-readable tracking nếu team muốn: `INT-ALERT-*`, `OCR-*`
   - không nên bắt buộc ở log volume cao nếu UUID + timestamp đã đủ

### 6.2 Ánh xạ Module 8 với Module 2

Module 8 consume master data từ Module 2 như sau:

1. `warehouse` → map weighbridge device scope / dashboard filter
2. `location` → mobile sync validation khi event có liên quan location scan
3. `vehicle_type` / vehicle metadata → optional mapping support
4. `owner/item` → OCR assisted matching / validation nếu payload có trường tương ứng
5. `inventory_status` → mobile sync event validation khi event mang status info
6. `uom/uom_conversion` → normalize extracted quantity nếu OCR trả đơn vị khác base unit
7. `item policy` / owner-item policy → không quyết định ở M8, nhưng có thể dùng để enrich callback payload cho consumer

### 6.3 Ánh xạ Module 8 với Module 3

Module 8 **không post inventory vào M3**. Quan hệ đúng là:

- M8 cung cấp weigh event cho M4/M5.
- M4/M5 quyết định business validity.
- M4/M5 mới gọi M3 tại đúng posting point (`RECEIVED` hoặc `SHIPPED`).
- Mobile sync event từ M7/M6 có thể dẫn tới M3 posting, nhưng do M7/M6 quyết định, không phải M8.

Điểm team dev phải nhớ: **M8 không bao giờ được cắm thẳng vào `invent_trans` / `on_hand`**.

### 6.4 Ánh xạ Module 8 với Module 4 — Inbound Operations

M4 consume M8 như sau:

1. nhận weigh-in / weigh-out event cho receipt inbound
2. nhận OCR extracted data cho vessel / B/L intake
3. dùng `correlation_id` và object mapping để attach log cân vào receipt
4. dùng manual weight fallback event nếu hardware fail và manager đã authorize
5. nhận monitoring feedback khi weigh device mất kết nối ảnh hưởng luồng inbound

Biên ownership cần nhớ:
- M8 sở hữu **raw/normalized weigh data**.
- M4 sở hữu **tolerance, reject, re-weigh, received, cancel**.

### 6.5 Ánh xạ Module 8 với Module 5 — Outbound Operations

M5 consume M8 như sau:

1. nhận tare và gross line events cho multi-trip outbound weighing
2. map `weighing_sequence` vào shipment / shipment_line
3. dùng raw log để tính net line theo quy tắc outbound của M5
4. dùng manual weight fallback nếu cần exception path
5. dùng monitor data để biết weigh station bị lỗi và dừng nhận thêm line gross

Biên ownership cần nhớ:
- M8 sở hữu **weigh capture + retry + log**.
- M5 sở hữu **tolerance per line, pending approval, shipped**.

### 6.6 Ánh xạ Module 8 với Module 6 — Inventory Control

Phase 1 liên hệ với M6 chủ yếu ở mức gián tiếp:

1. M6 có thể dùng dashboard integration để điều tra source device/mobile issue khi count/move/adjust sync bị lỗi.
2. Nếu M6 có mobile execution path, M8 là infra sync channel cho batch submit và retry.
3. M8 không quyết định move/status/adjust/count logic của M6.

### 6.7 Ánh xạ Module 8 với Module 7 — Work Execution & Mobile

Đây là mapping quan trọng nhất ngoài weighbridge:

1. M7 sở hữu `work_header` / `work_line` lifecycle.
2. M8 sở hữu **mobile sync transport + batch ingest + conflict detection + retry visibility**.
3. Mobile app gửi events như claim/start/complete/skip qua batch sync API của M8.
4. M8 validate envelope, dedupe, persist sync logs, rồi handoff event nội bộ sang M7 application service.
5. M7 xử lý business validity và nếu hợp lệ mới gọi M3 post inventory movement.

Biên ownership cần nhớ:
- **M8 = transport + sync infra**
- **M7 = business execution + callback + posting orchestration**

---

## 7. Đề xuất cấu trúc code backend cho Module 8

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
    storage/
    http/
  modules/
    integration-platform/
      integration-platform.module.ts
      controllers/
        weighbridge.controller.ts
        ocr.controller.ts
        mobile-sync.controller.ts
        erp-push.controller.ts
        monitoring.controller.ts
        recovery.controller.ts
        health.controller.ts
      services/
        weighbridge-ingest.service.ts
        weighbridge-log.service.ts
        local-agent-heartbeat.service.ts
        stable-weight.service.ts
        ocr-upload.service.ts
        ocr-extract.service.ts
        ocr-confirmation.service.ts
        mobile-sync-batch.service.ts
        mobile-sync-dispatch.service.ts
        erp-push.service.ts
        erp-payload-mapper.service.ts
        monitoring.service.ts
        alert.service.ts
        recovery.service.ts
        traceability.service.ts
      repositories/
        weighbridge-log.repository.ts
        weighbridge-device.repository.ts
        ocr-result.repository.ts
        mobile-sync-batch.repository.ts
        mobile-sync-event.repository.ts
        erp-push-log.repository.ts
        integration-alert.repository.ts
        integration-outbox.repository.ts
      workers/
        erp-push.worker.ts
        alert-escalation.worker.ts
        stale-device-check.worker.ts
        sync-replay.worker.ts
      adapters/
        serial-agent.adapter.ts
        ocr-provider.adapter.ts
        erp-http.adapter.ts
        work-sync.adapter.ts
        inbound-callback.adapter.ts
        outbound-callback.adapter.ts
      dto/
      entities/
      mappers/
      policies/
      jobs/
        purge-old-log.job.ts
        recompute-monitoring.job.ts
        requeue-failed-push.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không chứa business logic nặng.
- Ingest service phải tách với query/dashboard service.
- Retry/backoff policy không hard-code rải rác; đưa vào policy service hoặc config map.
- Adapter ra ngoài hệ thống phải tách riêng khỏi service orchestration.
- Repository chỉ query/CRUD.
- DTO tách create/query/recovery/acknowledge/retry.
- Shared Module 1 services được inject qua interface hoặc shared module: `AuthorizationService`, `AuditService`, `IdempotencyService`, `ReasonCodeService`.

---

## 8. Thiết kế database tổng thể cho Module 8

## 8.1 Nguyên tắc DB design

1. Mỗi object có `id` UUID làm PK kỹ thuật.
2. Mỗi log/event quan trọng có business key/idempotency key riêng.
3. Tách bảng **raw log** và bảng **state/alert/read model** khi cần.
4. Bảng log volume cao phải chuẩn bị partition theo ngày/tháng.
5. Bảng có payload lớn nên dùng `JSONB`, nhưng file/ảnh lớn phải để object storage.
6. Mọi bảng command/state có `status`, `created_at`, `updated_at`, `correlation_id`, `external_id`, `source_channel`.
7. Mọi bảng log cần query được theo `reference_id`, `device_id`, `warehouse_id`, `created_at`, `status`.
8. Không hard delete log quan trọng trong retention period.
9. Thiết kế index cho dashboard và recovery trước từ đầu.
10. Tách bảng `integration_alert` để monitor nhanh, không quét full log table.

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Core integration tables
- `m8_weighbridge_device`
- `m8_weighbridge_log`
- `m8_weighbridge_event_state`
- `m8_ocr_result`
- `m8_ocr_confirmed_snapshot`
- `m8_mobile_sync_batch`
- `m8_mobile_sync_event`
- `m8_erp_push_log`
- `m8_integration_alert`
- `m8_channel_health_snapshot`
- `m8_integration_outbox`

### 8.2.2 Optional support tables
- `m8_device_heartbeat`
- `m8_dead_letter`
- `m8_alert_comment`
- `m8_payload_archive` (nếu muốn tách payload rất lớn khỏi log chính)

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `m8_weighbridge_device`

Mục đích: lưu cấu hình thiết bị/trạm cân và trạng thái vận hành gần nhất.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| device_code | VARCHAR(50) | UNIQUE NOT NULL | Mã thiết bị/trạm cân |
| device_name | VARCHAR(150) | NOT NULL | |
| warehouse_id | UUID | NULL | scope kho nếu có |
| port_name | VARCHAR(50) | NULL | COM3, COM4... |
| baud_rate | INT | NULL | nếu dùng serial |
| data_bits | INT | NULL | |
| stop_bits | INT | NULL | |
| parity | VARCHAR(20) | NULL | |
| frame_format | VARCHAR(100) | NULL | protocol version |
| heartbeat_interval_sec | INT | NOT NULL DEFAULT 300 | baseline 5 phút |
| stable_window_ms | INT | NOT NULL DEFAULT 1000 | cửa sổ xác định stable weight |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| last_seen_at | TIMESTAMPTZ | NULL | heartbeat gần nhất |
| last_status | VARCHAR(30) | NULL | ONLINE/OFFLINE/DEGRADED |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- unique(`device_code`)
- index(`warehouse_id`, `is_active`)
- index(`last_seen_at`)

---

### 8.3.2 `m8_weighbridge_log`

Mục đích: immutable log cho từng weigh event.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| weighbridge_event_id | VARCHAR(100) | UNIQUE NOT NULL | business id / idempotency |
| receipt_id | UUID | NULL | link M4 nếu inbound |
| shipment_id | UUID | NULL | link M5 nếu outbound |
| vehicle_number | VARCHAR(50) | NOT NULL | |
| weighing_type | VARCHAR(30) | NOT NULL | WEIGH_IN / WEIGH_OUT / TARE / GROSS_LINE_N |
| weighing_sequence | INT | NOT NULL | thứ tự trong vòng cân |
| gross_weight_kg | NUMERIC(18,3) | NULL | |
| tare_weight_kg | NUMERIC(18,3) | NULL | |
| net_weight_kg | NUMERIC(18,3) | NULL | normalized net |
| raw_weight_value | VARCHAR(100) | NULL | raw frame extracted |
| raw_payload | JSONB | NULL | full serial/device payload |
| is_stable_weight | BOOLEAN | NOT NULL DEFAULT false | |
| is_duplicate_signal | BOOLEAN | NOT NULL DEFAULT false | |
| duplicate_of_event_id | VARCHAR(100) | NULL | |
| is_manual_entry | BOOLEAN | NOT NULL DEFAULT false | |
| manual_reason_code | VARCHAR(50) | NULL | |
| approved_by | UUID | NULL | manager approver |
| scale_device_id | VARCHAR(50) | NOT NULL | source device code |
| photo_alpr_path | VARCHAR(500) | NULL | object storage path |
| photo_cargo_path | VARCHAR(500) | NULL | object storage path |
| latency_ms | INT | NULL | ingest latency |
| external_id | VARCHAR(100) | NOT NULL | thường = weighbridge_event_id |
| correlation_id | UUID | NOT NULL | trace chain |
| source_channel | VARCHAR(30) | NOT NULL | SCALE_AGENT / MANUAL / OCR |
| weighing_timestamp | TIMESTAMPTZ | NOT NULL | business event time |
| created_by | VARCHAR(100) | NOT NULL | agent/web/system |
| created_at | TIMESTAMPTZ | NOT NULL | persist time |

**Index khuyến nghị:**
- unique(`weighbridge_event_id`)
- index(`receipt_id`)
- index(`shipment_id`)
- index(`scale_device_id`, `created_at` desc)
- index(`vehicle_number`, `created_at` desc)
- index(`correlation_id`)
- index(`weighing_timestamp`)
- partition by range(`created_at`) theo tháng nếu volume cao

**Lưu ý:** bảng này immutable. Không update business fields sau insert. Nếu cần gắn cờ duplicate bằng logic hậu kỳ, cân nhắc bảng state riêng.

---

### 8.3.3 `m8_weighbridge_event_state`

Mục đích: giữ trạng thái xử lý kỹ thuật của weigh event để không phải update log immutable.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| weighbridge_log_id | UUID | UNIQUE NOT NULL | FK -> log |
| processing_status | VARCHAR(30) | NOT NULL | RECEIVED / VALIDATED / LINKED / DUPLICATE / FAILED |
| linked_module | VARCHAR(20) | NULL | M4 / M5 |
| linked_object_id | UUID | NULL | receipt/shipment |
| callback_status | VARCHAR(30) | NULL | PENDING / SENT / ACKED / FAILED |
| callback_error | TEXT | NULL | |
| retry_count | INT | NOT NULL DEFAULT 0 | |
| last_retry_at | TIMESTAMPTZ | NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

---

### 8.3.4 `m8_ocr_result`

Mục đích: lưu raw OCR extraction result.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| ocr_request_id | VARCHAR(100) | UNIQUE NOT NULL | idempotency/business key |
| image_path | VARCHAR(500) | NOT NULL | object storage path |
| provider_name | VARCHAR(50) | NOT NULL | OCR vendor/provider |
| provider_request_id | VARCHAR(100) | NULL | |
| bl_number | VARCHAR(50) | NULL | extracted |
| bl_confidence | NUMERIC(5,2) | NULL | |
| vehicle_number | VARCHAR(50) | NULL | |
| vehicle_confidence | NUMERIC(5,2) | NULL | |
| product_name | VARCHAR(200) | NULL | |
| product_confidence | NUMERIC(5,2) | NULL | |
| vessel_name | VARCHAR(200) | NULL | |
| vessel_confidence | NUMERIC(5,2) | NULL | |
| qty_extracted | NUMERIC(18,3) | NULL | |
| qty_uom | VARCHAR(20) | NULL | |
| qty_confidence | NUMERIC(5,2) | NULL | |
| overall_confidence | NUMERIC(5,2) | NULL | |
| raw_response | JSONB | NULL | provider raw response |
| linked_receipt_id | UUID | NULL | optional link |
| link_method | VARCHAR(30) | NULL | AUTO_MATCHED / OPERATOR_SELECTED / OPERATOR_CREATED |
| operator_confirmed | BOOLEAN | NOT NULL DEFAULT false | |
| status | VARCHAR(30) | NOT NULL | UPLOADED / EXTRACTED / REVIEW_REQUIRED / CONFIRMED / LINKED / REJECTED |
| external_id | VARCHAR(100) | NOT NULL | |
| correlation_id | UUID | NOT NULL | |
| source_channel | VARCHAR(20) | NOT NULL DEFAULT 'OCR' | |
| created_by | VARCHAR(100) | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- unique(`ocr_request_id`)
- index(`status`, `created_at` desc)
- index(`bl_number`)
- index(`linked_receipt_id`)
- index(`correlation_id`)

---

### 8.3.5 `m8_ocr_confirmed_snapshot`

Mục đích: lưu snapshot đã confirm/chỉnh tay để tách raw result khỏi confirmed result.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| ocr_result_id | UUID | UNIQUE NOT NULL | FK -> m8_ocr_result |
| confirmed_bl_number | VARCHAR(50) | NULL | |
| confirmed_vehicle_number | VARCHAR(50) | NULL | |
| confirmed_product_name | VARCHAR(200) | NULL | |
| confirmed_vessel_name | VARCHAR(200) | NULL | |
| confirmed_qty | NUMERIC(18,3) | NULL | |
| confirmed_qty_uom | VARCHAR(20) | NULL | |
| corrections_json | JSONB | NULL | field-level corrections |
| confirmed_by | UUID | NOT NULL | |
| confirmed_at | TIMESTAMPTZ | NOT NULL | |
| remarks | TEXT | NULL | |

---

### 8.3.6 `m8_mobile_sync_batch`

Mục đích: lưu batch sync envelope từ mobile.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| batch_id | VARCHAR(100) | UNIQUE NOT NULL | batch id từ mobile |
| device_id | VARCHAR(50) | NOT NULL | |
| keeper_user_id | UUID | NOT NULL | |
| app_version | VARCHAR(30) | NULL | |
| event_count | INT | NOT NULL | |
| payload | JSONB | NOT NULL | raw batch payload |
| status | VARCHAR(30) | NOT NULL | QUEUED / PROCESSING / PARTIAL_SUCCESS / SUCCESS / FAILED / CONFLICTED |
| duplicate_count | INT | NOT NULL DEFAULT 0 | |
| conflict_count | INT | NOT NULL DEFAULT 0 | |
| accepted_count | INT | NOT NULL DEFAULT 0 | |
| rejected_count | INT | NOT NULL DEFAULT 0 | |
| first_sequence_no | BIGINT | NULL | |
| last_sequence_no | BIGINT | NULL | |
| received_at | TIMESTAMPTZ | NOT NULL | |
| processed_at | TIMESTAMPTZ | NULL | |
| external_id | VARCHAR(100) | NOT NULL | thường = batch_id |
| correlation_id | UUID | NOT NULL | batch trace |
| source_channel | VARCHAR(20) | NOT NULL DEFAULT 'MOBILE_SYNC' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- unique(`batch_id`)
- index(`device_id`, `received_at` desc)
- index(`keeper_user_id`, `received_at` desc)
- index(`status`, `received_at` desc)

---

### 8.3.7 `m8_mobile_sync_event`

Mục đích: tách từng event bên trong batch để dispatch sang M7/M6.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| batch_id | UUID | NOT NULL | FK -> m8_mobile_sync_batch |
| event_external_id | VARCHAR(100) | UNIQUE NOT NULL | idempotency per event |
| event_type | VARCHAR(50) | NOT NULL | CLAIM_WORK / START_WORK / COMPLETE_LINE / ... |
| work_id | UUID | NULL | |
| work_line_id | UUID | NULL | |
| source_module | VARCHAR(20) | NOT NULL | M7 / M6 |
| device_id | VARCHAR(50) | NOT NULL | |
| device_event_time | TIMESTAMPTZ | NOT NULL | |
| sequence_no | BIGINT | NOT NULL | thứ tự trên device |
| payload | JSONB | NOT NULL | normalized event payload |
| process_status | VARCHAR(30) | NOT NULL | RECEIVED / DUPLICATE / DISPATCHED / APPLIED / CONFLICTED / FAILED |
| process_error | TEXT | NULL | |
| dispatched_at | TIMESTAMPTZ | NULL | |
| applied_at | TIMESTAMPTZ | NULL | |
| correlation_id | UUID | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- unique(`event_external_id`)
- index(`device_id`, `sequence_no`)
- index(`work_id`)
- index(`work_line_id`)
- index(`process_status`, `created_at` desc)

---

### 8.3.8 `m8_erp_push_log`

Mục đích: lưu job push ERP và response history chính.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| push_job_id | VARCHAR(100) | UNIQUE NOT NULL | internal job id |
| push_type | VARCHAR(30) | NOT NULL | DEBIT_NOTE |
| reference_id | VARCHAR(50) | NOT NULL | debit_note_number |
| payload | JSONB | NOT NULL | full payload sent |
| payload_hash | VARCHAR(128) | NULL | detect changed payload |
| status | VARCHAR(30) | NOT NULL | PENDING / SENT / ACK_SUCCESS / ACK_FAILED / RETRY_SCHEDULED / DEAD_LETTER |
| attempt_count | INT | NOT NULL DEFAULT 0 | |
| max_attempts | INT | NOT NULL DEFAULT 10 | |
| last_attempt_at | TIMESTAMPTZ | NULL | |
| next_retry_at | TIMESTAMPTZ | NULL | |
| response_code | INT | NULL | |
| response_body | JSONB | NULL | |
| error_message | TEXT | NULL | |
| endpoint_name | VARCHAR(100) | NULL | logical endpoint key |
| external_id | VARCHAR(100) | NOT NULL | usually reference_id |
| correlation_id | UUID | NOT NULL | |
| source_channel | VARCHAR(20) | NOT NULL DEFAULT 'ERP_PUSH' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- unique(`push_job_id`)
- unique(`push_type`, `reference_id`) nếu business chỉ cho 1 active push per reference
- index(`status`, `next_retry_at`)
- index(`reference_id`)
- index(`correlation_id`)

---

### 8.3.9 `m8_integration_alert`

Mục đích: read model cho monitoring/ops.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| alert_code | VARCHAR(50) | NOT NULL | DEVICE_OFFLINE / ERP_PUSH_FAILED / OCR_LOW_CONFIDENCE ... |
| alert_source | VARCHAR(30) | NOT NULL | WEIGHBRIDGE / OCR / MOBILE_SYNC / ERP_PUSH |
| severity | VARCHAR(20) | NOT NULL | INFO / WARN / ERROR / CRITICAL |
| source_ref_type | VARCHAR(30) | NULL | DEVICE / OCR_RESULT / BATCH / PUSH_JOB |
| source_ref_id | VARCHAR(100) | NULL | |
| title | VARCHAR(200) | NOT NULL | |
| description | TEXT | NULL | |
| status | VARCHAR(20) | NOT NULL | OPEN / ACKNOWLEDGED / RESOLVED / SUPPRESSED |
| owner_role | VARCHAR(30) | NULL | WB_OPERATOR / BILLING_OFC / WH_MANAGER |
| warehouse_id | UUID | NULL | |
| correlation_id | UUID | NULL | |
| first_raised_at | TIMESTAMPTZ | NOT NULL | |
| last_seen_at | TIMESTAMPTZ | NOT NULL | |
| acknowledged_by | UUID | NULL | |
| acknowledged_at | TIMESTAMPTZ | NULL | |
| resolved_by | UUID | NULL | |
| resolved_at | TIMESTAMPTZ | NULL | |
| resolution_note | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Index khuyến nghị:**
- index(`status`, `severity`, `last_seen_at` desc)
- index(`alert_source`, `status`)
- index(`warehouse_id`, `status`)
- index(`source_ref_type`, `source_ref_id`)

---

### 8.3.10 `m8_channel_health_snapshot`

Mục đích: phục vụ dashboard summary nhanh.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| channel_name | VARCHAR(30) | UNIQUE NOT NULL | WEIGHBRIDGE / OCR / MOBILE_SYNC / ERP_PUSH |
| status | VARCHAR(20) | NOT NULL | HEALTHY / DEGRADED / DOWN |
| open_alert_count | INT | NOT NULL DEFAULT 0 | |
| backlog_count | INT | NOT NULL DEFAULT 0 | |
| success_rate_1h | NUMERIC(5,2) | NULL | |
| avg_latency_ms_1h | INT | NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

---

## 8.4 Partitioning / retention khuyến nghị

### Bảng nên partition theo tháng
- `m8_weighbridge_log`
- `m8_mobile_sync_batch`
- `m8_mobile_sync_event`
- `m8_erp_push_log` (nếu volume lớn)

### Retention khuyến nghị Phase 1
- `m8_weighbridge_log`: tối thiểu 2 năm online, archive sau đó
- `m8_ocr_result`: 1–2 năm online, raw file archive theo chính sách
- `m8_mobile_sync_*`: 6–12 tháng online, aggregate/report giữ lâu hơn
- `m8_erp_push_log`: 2–7 năm tùy yêu cầu đối soát billing/audit
- `m8_integration_alert`: 1 năm online, archive theo compliance

---

## 9. State machine kỹ thuật đề xuất cho M8

### 9.1 Weighbridge event

```text
RECEIVED -> VALIDATED -> LINKED -> CONSUMED
                  \-> DUPLICATE
                  \-> FAILED
```

### 9.2 OCR result

```text
UPLOADED -> EXTRACTED -> REVIEW_REQUIRED -> CONFIRMED -> LINKED
                                      \-> REJECTED
```

### 9.3 Mobile sync batch

```text
QUEUED -> PROCESSING -> SUCCESS
                    \-> PARTIAL_SUCCESS
                    \-> CONFLICTED
                    \-> FAILED
```

### 9.4 ERP push job

```text
PENDING -> SENT -> ACK_SUCCESS
              \-> ACK_FAILED -> RETRY_SCHEDULED -> SENT
                                  \-> DEAD_LETTER
```

### 9.5 Integration alert

```text
OPEN -> ACKNOWLEDGED -> RESOLVED
   \-> SUPPRESSED
```

**Nguyên tắc:** state machine phải nằm ở backend service tập trung, không để controller/repository tự cập nhật status tùy tiện.

---

## 10. Luồng tổng thể từ database -> backend -> integration

## 10.1 Weighbridge flow

```text
Scale Device
  -> Local Agent đọc COM port
  -> Agent normalize frame + stable weight detect
  -> Agent tạo weighbridge_event_id + correlation_id
  -> POST /m8/weighbridge/events
  -> Backend validate device + dedupe + persist m8_weighbridge_log
  -> Backend tạo/ cập nhật m8_weighbridge_event_state
  -> Backend callback/handoff sang M4 hoặc M5 theo mapping context
  -> M4/M5 xử lý business rule của mình
  -> Monitoring cập nhật latency/device health/alert nếu cần
```

### Thứ tự xử lý backend khuyến nghị
1. parse payload
2. validate schema
3. validate device active
4. idempotency check theo `weighbridge_event_id`
5. persist immutable log
6. persist/update state row
7. enqueue callback/handoff nội bộ
8. ghi audit / metrics
9. trả ACK nhanh cho agent

**Mục tiêu:** ACK nhanh, business callback có thể async nhưng phải trace được.

---

## 10.2 OCR flow

```text
WB_OPERATOR upload image
  -> POST /m8/ocr/uploads
  -> Backend lưu file object storage
  -> Tạo m8_ocr_result status=UPLOADED
  -> Gọi OCR provider adapter
  -> Lưu extraction raw_response + normalized fields, status=EXTRACTED/REVIEW_REQUIRED
  -> Operator review/confirm corrections
  -> Tạo m8_ocr_confirmed_snapshot
  -> Handoff sang M4 để link/create receipt flow
  -> Monitoring cập nhật OCR success/failure/confidence
```

### Thứ tự xử lý backend khuyến nghị
1. validate file type/size
2. lưu object storage
3. tạo record `UPLOADED`
4. gọi provider
5. map response -> normalized fields
6. tính `overall_confidence`
7. quyết định `EXTRACTED` hay `REVIEW_REQUIRED`
8. chờ operator confirm nếu cần
9. sau confirm mới handoff sang M4

---

## 10.3 Mobile sync flow

```text
Mobile App offline queue events
  -> POST /m8/mobile-sync/batches
  -> Backend validate batch envelope
  -> Dedupe theo batch_id
  -> Persist m8_mobile_sync_batch + m8_mobile_sync_event
  -> Dispatch từng event sang M7/M6 handler nội bộ
  -> Consumer module xử lý business validity
  -> M8 cập nhật event status APPLIED / CONFLICTED / FAILED
  -> Batch aggregate status SUCCESS / PARTIAL_SUCCESS / CONFLICTED
  -> Dashboard/ops đọc monitoring
```

### Nguyên tắc quan trọng
- M8 không quyết định work business validity; chỉ dispatch và track result.
- Batch có thể partial success.
- Event duplicate không làm fail cả batch.
- Conflict phải trả đủ detail để app hoặc supervisor xử lý.

---

## 10.4 ERP push flow

```text
M10/Billing lock debit note
  -> create outbox event / call internal enqueue API
  -> M8 tạo m8_erp_push_log status=PENDING
  -> Queue worker pick job
  -> Map payload -> call ERP API
  -> Success => ACK_SUCCESS
  -> Failure retryable => RETRY_SCHEDULED + next_retry_at
  -> Failure non-retryable / max attempts => DEAD_LETTER + alert
  -> Recovery API cho manual requeue/retry
```

### Nguyên tắc quan trọng
- Không gọi ERP inline trong transaction lock debit note.
- Payload mapper tách riêng để dễ sửa theo ERP contract.
- Response mapping phải phân biệt retryable vs non-retryable.

---

## 11. Thiết kế Local Agent cho Weighbridge

## 11.1 Thành phần của local agent

```text
Serial Reader -> Frame Parser -> Stable Weight Detector -> Local Buffer -> HTTP Sender -> Heartbeat Sender
```

## 11.2 Trách nhiệm của agent

1. Kết nối COM port.
2. Đọc frame liên tục từ cân.
3. Parse raw frame theo protocol config.
4. Xác định stable weight.
5. Sinh `weighbridge_event_id` và `external_id`.
6. Gửi event về backend.
7. Nếu backend fail hoặc mất mạng, lưu vào local buffer rồi resend.
8. Gửi heartbeat định kỳ.

## 11.3 Quy tắc stable weight đề xuất

Để dev có baseline code được ngay, khuyến nghị rule kỹ thuật tối thiểu:

- đọc sample mỗi 100–200 ms
- trong `stable_window_ms` (ví dụ 1000 ms), nếu chênh lệch max-min <= ngưỡng cấu hình thì coi là stable
- chỉ phát event khi stable và khác stable event gần nhất vượt ngưỡng duplicate
- nếu operator bấm record nhiều lần liên tiếp, agent vẫn phải gắn event riêng nhưng backend có thể đánh dấu duplicate

## 11.4 Local buffer đề xuất

- local SQLite hoặc append-only JSONL file
- mỗi pending event có trạng thái `NEW / SENT / ACKED / FAILED`
- resend theo retry policy 3 lần x 30s cho connection fail
- không xóa khỏi local buffer cho đến khi backend ACK

## 11.5 Heartbeat contract

- gửi mỗi 5 phút theo config
- payload: `device_code`, `agent_version`, `port_name`, `last_weight_read_at`, `buffer_pending_count`, `health_status`
- backend update `m8_weighbridge_device.last_seen_at`
- quá ngưỡng heartbeat -> mở alert `DEVICE_OFFLINE`

---

## 12. API thiết kế chi tiết cho Module 8

Dưới đây là API baseline implementation-ready. Tên endpoint có thể chỉnh nhẹ, nhưng semantics không nên đổi.

## 12.1 Weighbridge APIs

### 12.1.1 `POST /api/v1/m8/weighbridge/events`

**Mục đích:** ingest 1 weigh event từ local agent hoặc manual console.

**Ai gọi:** local agent, console nội bộ có quyền phù hợp.

**Request body đề xuất:**

```json
{
  "weighbridge_event_id": "WB-20260308-000001",
  "scale_device_id": "WB-01",
  "vehicle_number": "51D-12345",
  "weighing_type": "WEIGH_IN",
  "weighing_sequence": 1,
  "gross_weight_kg": 35000.000,
  "tare_weight_kg": null,
  "net_weight_kg": null,
  "raw_payload": {"frame": "ST,GS,35000"},
  "is_manual_entry": false,
  "manual_reason_code": null,
  "approved_by": null,
  "reference_type": "RECEIPT",
  "reference_id": "uuid-of-receipt",
  "correlation_id": "uuid",
  "source_channel": "SCALE_AGENT",
  "event_time": "2026-03-08T10:00:00+07:00"
}
```

**Response:**
- `201 Created` nếu mới ingest
- `200 OK` nếu duplicate/idempotent và trả record cũ

**Validate gì:**
- schema đúng
- `weighbridge_event_id` unique/idempotent
- `scale_device_id` active
- manual entry phải có `manual_reason_code` + `approved_by`
- `weighing_type` hợp lệ

**Side effects:**
- insert `m8_weighbridge_log`
- insert/update `m8_weighbridge_event_state`
- enqueue callback sang M4/M5 nếu có `reference_type`
- update metrics/device last seen

**Build notes:**
- controller ACK nhanh
- callback không nên block response
- raw payload giữ nguyên để audit/debug

---

### 12.1.2 `POST /api/v1/m8/weighbridge/heartbeat`

**Mục đích:** nhận heartbeat từ local agent.

**Ai gọi:** local agent.

**Validate:** `device_code`, auth token/agent secret.

**Side effects:** update `m8_weighbridge_device.last_seen_at`, recalc alert offline.

---

### 12.1.3 `GET /api/v1/m8/weighbridge/logs`

**Mục đích:** query log cân theo filter.

**Filter:**
- device
- vehicle_number
- reference_type/reference_id
- weighing_type
- date range
- is_manual_entry
- source_channel

**Build notes:**
- query API chỉ đọc read model/index, không tính toán nặng trong app layer
- hỗ trợ pagination bắt buộc

---

### 12.1.4 `GET /api/v1/m8/weighbridge/logs/:id`

**Mục đích:** xem chi tiết 1 weigh event + state + callback history.

---

### 12.1.5 `POST /api/v1/m8/weighbridge/events/:id/reprocess`

**Mục đích:** admin/ops reprocess callback khi callback sang M4/M5 fail kỹ thuật.

**Ai gọi:** WH_MANAGER / OPS_SUPER / ADMIN theo RBAC.

**Build notes:**
- không tạo log mới
- chỉ requeue callback/outbox
- audit bắt buộc

---

## 12.2 OCR APIs

### 12.2.1 `POST /api/v1/m8/ocr/uploads`

**Mục đích:** upload file ảnh/chứng từ để OCR extraction.

**Request:** multipart file + metadata.

**Metadata đề xuất:**
- `reference_type` optional
- `reference_id` optional
- `warehouse_id`
- `correlation_id`

**Side effects:**
- lưu object storage
- tạo `m8_ocr_result`
- gọi OCR adapter đồng bộ hoặc enqueue async extraction

**Build notes:**
- nếu OCR provider chậm, nên tách 2 bước upload -> async extract
- response trả ngay `ocr_request_id`

---

### 12.2.2 `GET /api/v1/m8/ocr/results/:id`

**Mục đích:** lấy kết quả OCR đã extract để review.

---

### 12.2.3 `POST /api/v1/m8/ocr/results/:id/confirm`

**Mục đích:** operator confirm/correct OCR result.

**Request body đề xuất:**

```json
{
  "confirmed_bl_number": "BL12345",
  "confirmed_vehicle_number": "51D-12345",
  "confirmed_product_name": "DAP BULK",
  "confirmed_vessel_name": "VESSEL-01",
  "confirmed_qty": 25000,
  "confirmed_qty_uom": "KG",
  "remarks": "manual correction for blurred image"
}
```

**Validate gì:**
- record đang ở `EXTRACTED` hoặc `REVIEW_REQUIRED`
- user có quyền confirm
- field correction hợp lệ

**Side effects:**
- create/update `m8_ocr_confirmed_snapshot`
- update `m8_ocr_result.status = CONFIRMED`
- optional handoff sang M4

**Build notes:**
- raw OCR result không overwrite; correction lưu snapshot riêng

---

### 12.2.4 `POST /api/v1/m8/ocr/results/:id/link`

**Mục đích:** link OCR result với receipt M4 sau confirm.

**Request body:** `receipt_id`, `link_method`, `correlation_id`

**Build notes:**
- M8 ghi link kỹ thuật
- M4 vẫn phải validate receipt side của mình

---

### 12.2.5 `POST /api/v1/m8/ocr/results/:id/reject`

**Mục đích:** đánh dấu OCR result unusable.

**Side effect:** status = `REJECTED`, audit + alert nếu cần.

---

## 12.3 Mobile sync APIs

### 12.3.1 `POST /api/v1/m8/mobile-sync/batches`

**Mục đích:** nhận batch events từ mobile offline queue.

**Request body đề xuất:**

```json
{
  "batch_id": "MB-20260308-0001",
  "device_id": "MOBILE-01",
  "keeper_user_id": "uuid",
  "app_version": "1.0.0",
  "correlation_id": "uuid",
  "events": [
    {
      "event_external_id": "EV-001",
      "event_type": "COMPLETE_LINE",
      "source_module": "M7",
      "work_id": "uuid",
      "work_line_id": "uuid",
      "device_event_time": "2026-03-08T10:00:00+07:00",
      "sequence_no": 1001,
      "payload": {"actual_qty": 1000, "to_location_id": "uuid"}
    }
  ]
}
```

**Response đề xuất:**
- batch accepted
- duplicate count
- immediately rejected events nếu schema fail
- asynchronous processing token

**Validate gì:**
- `batch_id` idempotent
- event envelope đủ fields bắt buộc
- `event_external_id` unique/idempotent
- `sequence_no` numeric

**Side effects:**
- persist `m8_mobile_sync_batch`
- persist từng `m8_mobile_sync_event`
- dispatch sang consumer module

**Build notes:**
- batch accept và dispatch nên tách bước
- không rollback toàn batch chỉ vì 1 event conflict

---

### 12.3.2 `GET /api/v1/m8/mobile-sync/batches/:id`

**Mục đích:** xem trạng thái processing batch.

---

### 12.3.3 `GET /api/v1/m8/mobile-sync/events/:id`

**Mục đích:** xem chi tiết event sync và lỗi/conflict nếu có.

---

### 12.3.4 `POST /api/v1/m8/mobile-sync/events/:id/replay`

**Mục đích:** re-dispatch event failed/conflicted sau khi xử lý recovery.

---

## 12.4 ERP push APIs

### 12.4.1 `POST /api/v1/m8/erp-push/jobs`

**Mục đích:** enqueue 1 job push ERP từ billing/internal service.

**Ai gọi:** M10 internal service hoặc admin recovery.

**Request body đề xuất:**

```json
{
  "push_type": "DEBIT_NOTE",
  "reference_id": "DN-20260308-0001",
  "payload": {"debit_note_number": "DN-20260308-0001"},
  "correlation_id": "uuid"
}
```

**Validate gì:**
- unique business key theo rule idempotency
- payload schema đúng version

**Side effects:**
- insert `m8_erp_push_log` status=PENDING
- enqueue worker

**Build notes:**
- đây có thể là internal-only endpoint
- hoặc bỏ controller, chỉ dùng service nội bộ trong modular monolith

---

### 12.4.2 `GET /api/v1/m8/erp-push/jobs`

**Mục đích:** list job push theo status/date/reference.

---

### 12.4.3 `GET /api/v1/m8/erp-push/jobs/:id`

**Mục đích:** xem chi tiết payload, response, retry history.

---

### 12.4.4 `POST /api/v1/m8/erp-push/jobs/:id/retry`

**Mục đích:** manual retry 1 job failed/dead-letter.

**Validate:** chỉ role phù hợp, job đang `ACK_FAILED` hoặc `DEAD_LETTER`.

**Side effects:** update status `RETRY_SCHEDULED` / enqueue lại.

---

### 12.4.5 `POST /api/v1/m8/erp-push/jobs/:id/cancel`

**Mục đích:** force stop retry job trong trường hợp cần can thiệp.

**Build notes:**
- audit + reason bắt buộc
- không xóa log cũ

---

## 12.5 Monitoring / Recovery APIs

### 12.5.1 `GET /api/v1/m8/monitoring/overview`

**Mục đích:** dashboard summary cho 4 channel.

**Trả về:**
- device online/offline count
- OCR pending/review count
- mobile sync conflict count
- ERP push failed/dead-letter count
- latency summary
- open critical alerts

---

### 12.5.2 `GET /api/v1/m8/alerts`

**Mục đích:** list alerts theo severity/source/status/warehouse.

---

### 12.5.3 `POST /api/v1/m8/alerts/:id/acknowledge`

**Mục đích:** ops acknowledge alert.

---

### 12.5.4 `POST /api/v1/m8/alerts/:id/resolve`

**Mục đích:** mark alert resolved.

**Build notes:** resolution note bắt buộc cho alert severity cao.

---

### 12.5.5 `GET /api/v1/m8/channel-health`

**Mục đích:** health endpoint cho từng channel và dashboard phụ.

---

## 13. Phân tích kỹ từng API: dùng để làm gì và hướng build như thế nào

## 13.1 Nhóm Weighbridge APIs

### `POST /m8/weighbridge/events`

**API này để làm gì?**  
Đây là API quan trọng nhất của M8. Nó là cửa vào chính thức để biến tín hiệu cân từ local agent thành dữ liệu chuẩn hóa trong SWM.

**Khi nào dùng?**  
- inbound weigh-in
- inbound weigh-out
- outbound tare
- outbound gross theo line
- manual fallback event được authorize

**Không dùng để làm gì?**  
- không dùng để quyết định receipt pass/fail
- không dùng để post inventory
- không dùng để update shipment/receipt state trực tiếp

**Hướng build đúng:**
- endpoint phải idempotent theo `weighbridge_event_id`
- validate nhanh, persist nhanh, ACK nhanh
- callback business sang M4/M5 phải async
- raw payload giữ nguyên để debug protocol/hardware issue

**Sai lầm intern hay gặp:**
- gọi thẳng service M4/M5 và chờ xử lý xong mới trả response
- update receipt/shipment state ngay trong M8
- bỏ qua raw payload và chỉ lưu net weight

---

### `POST /m8/weighbridge/heartbeat`

**API này để làm gì?**  
Theo dõi trạm cân còn online không.

**Hướng build đúng:**
- không cần business idempotency phức tạp
- update `last_seen_at`
- worker nền sẽ suy luận offline nếu quá timeout

---

### `GET /m8/weighbridge/logs` và `GET /m8/weighbridge/logs/:id`

**API này để làm gì?**  
Cho ops, QA, BA, manager tra cứu lịch sử cân, đối soát tranh chấp và điều tra duplicate.

**Hướng build đúng:**
- làm read-optimized
- filter/index tốt
- không join business tables nặng mặc định; chỉ enrich khi cần detail

---

### `POST /m8/weighbridge/events/:id/reprocess`

**API này để làm gì?**  
Xử lý technical failure khi callback sang M4/M5 fail nhưng log cân đã lưu thành công.

**Hướng build đúng:**
- không tạo log mới
- chỉ requeue integration state/callback
- audit bắt buộc

---

## 13.2 Nhóm OCR APIs

### `POST /m8/ocr/uploads`

**API này để làm gì?**  
Nhận chứng từ ảnh/PDF từ operator để OCR extract.

**Hướng build đúng:**
- upload file trước
- extraction có thể async
- tách raw result và confirmed snapshot
- không cố link business object quá sớm

---

### `GET /m8/ocr/results/:id`

**API này để làm gì?**  
Cho UI review OCR result.

**Hướng build đúng:**
- trả cả raw extracted fields và confirmed snapshot nếu có
- có confidence breakdown per field

---

### `POST /m8/ocr/results/:id/confirm`

**API này để làm gì?**  
Operator xác nhận và chỉnh dữ liệu OCR để trở thành dữ liệu có thể dùng cho M4.

**Hướng build đúng:**
- giữ raw immutable
- confirmed data lưu snapshot riêng
- sau confirm có thể tạo event `OCRConfirmed`

---

### `POST /m8/ocr/results/:id/link`

**API này để làm gì?**  
Gắn OCR result với receipt hoặc object inbound.

**Hướng build đúng:**
- M8 chỉ ghi kỹ thuật link
- M4 vẫn validate object side

---

## 13.3 Nhóm Mobile Sync APIs

### `POST /m8/mobile-sync/batches`

**API này để làm gì?**  
Đây là transport entrypoint cho mobile offline queue. Nó nhận batch events từ app và đưa vào backend processing.

**Hướng build đúng:**
- coi batch là envelope kỹ thuật, không phải command business cuối cùng
- persist cả batch lẫn event con
- dispatch event sang M7/M6 bằng internal service hoặc outbox
- cho phép partial success

**Sai lầm intern hay gặp:**
- dùng batch payload để overwrite work state trực tiếp
- rollback cả batch vì 1 event conflict
- không lưu sequence_no / device_event_time

---

### `GET /m8/mobile-sync/batches/:id`, `GET /m8/mobile-sync/events/:id`

**API này để làm gì?**  
Cho mobile/web supervisor biết batch đã được xử lý đến đâu, conflict chỗ nào.

---

### `POST /m8/mobile-sync/events/:id/replay`

**API này để làm gì?**  
Cho phép recovery event failed/conflicted sau khi đã xử lý root cause.

---

## 13.4 Nhóm ERP Push APIs

### `POST /m8/erp-push/jobs`

**API này để làm gì?**  
Enqueue 1 push job từ Billing sang ERP.

**Hướng build đúng:**
- idempotent theo `reference_id`
- tách enqueue với send thực tế
- payload map qua service riêng

---

### `GET /m8/erp-push/jobs` và `GET /m8/erp-push/jobs/:id`

**API này để làm gì?**  
Ops/billing tra cứu push history, response, retry.

---

### `POST /m8/erp-push/jobs/:id/retry`

**API này để làm gì?**  
Manual recovery khi queue retry tự động đã fail hết hoặc non-retryable issue đã được sửa.

**Hướng build đúng:**
- chỉ requeue khi role phù hợp
- lưu audit note và reason
- không reset lịch sử attempt cũ

---

### `POST /m8/erp-push/jobs/:id/cancel`

**API này để làm gì?**  
Dừng retry khi cần freeze manual.

---

## 13.5 Nhóm Monitoring APIs

### `GET /m8/monitoring/overview`

**API này để làm gì?**  
Cung cấp dashboard summary nhanh. Đây không phải API log raw.

**Hướng build đúng:**
- dùng table/read model aggregate như `m8_channel_health_snapshot`
- không tính realtime bằng query full log table mỗi lần mở dashboard

---

### `GET /m8/alerts`, `POST /m8/alerts/:id/acknowledge`, `POST /m8/alerts/:id/resolve`

**API này để làm gì?**  
Cho ops xử lý alert lifecycle.

**Hướng build đúng:**
- alert phải có state machine riêng
- acknowledge/resolution đều audit

---

## 14. Internal service contracts / outbox events khuyến nghị

Để sau này dễ tách service hoặc ít nhất giữ boundary rõ, nên chuẩn hóa các contract nội bộ sau:

### 14.1 `WeightCaptured`
- producer: M8 Weigh Service
- consumer: M4 or M5
- key fields: `weighbridge_event_id`, `reference_type`, `reference_id`, `weighing_type`, `net_weight_kg`, `correlation_id`
- idempotency key: `weighbridge_event_id`

### 14.2 `OCRConfirmed`
- producer: M8 OCR Service
- consumer: M4
- key fields: `ocr_result_id`, confirmed snapshot fields, `correlation_id`
- idempotency key: `ocr_result_id`

### 14.3 `MobileSyncEventReceived`
- producer: M8 Sync Service
- consumer: M7/M6
- key fields: `event_external_id`, `event_type`, `payload`, `source_module`, `correlation_id`
- idempotency key: `event_external_id`

### 14.4 `DebitNotePushQueued`
- producer: M10/Billing or M8 enqueue service
- consumer: M8 ERP worker
- key fields: `reference_id`, payload hash, `correlation_id`
- idempotency key: `reference_id`

### 14.5 `IntegrationAlertRaised`
- producer: M8 Monitoring Service
- consumer: dashboard/notification layer
- key fields: `alert_code`, `severity`, `source_ref_id`, `correlation_id`

---

## 15. Query side / dashboard design

## 15.1 Dashboard cards tối thiểu

1. Device online / offline / degraded count
2. Weigh events hôm nay
3. OCR pending review count
4. Mobile sync conflicted batches count
5. ERP push failed / dead-letter count
6. Critical alerts open count
7. Avg weigh ingest latency 1h
8. ERP push success rate 24h

## 15.2 Dashboard drill-down tối thiểu

- Device detail -> heartbeat + recent weigh events + open alerts
- OCR queue -> pending/review/rejected + confidence bands
- Mobile sync -> batch detail + per-event status + conflict reason
- ERP push -> job detail + response + retry timeline

## 15.3 Query performance guidelines

- mọi list lớn đều pagination
- search theo khoảng thời gian bắt buộc cho log volume cao
- dùng partial indexes cho status open/failure
- aggregate snapshot job chạy định kỳ cho dashboard summary

---

## 16. Validation rules quan trọng

## 16.1 Weighbridge
- `weighbridge_event_id` bắt buộc, unique theo scope toàn hệ thống hoặc ít nhất theo device
- `scale_device_id` phải active
- `weighing_type` phải thuộc enum cho phép
- manual event phải có `manual_reason_code` + `approved_by`
- `event_time` không được lệch quá xa so với server time nếu policy yêu cầu

## 16.2 OCR
- file type allowed: jpg/jpeg/png/pdf
- max size theo config
- provider response phải map được về schema normalized
- confirm chỉ cho phép khi status hợp lệ

## 16.3 Mobile sync
- `batch_id` unique
- `event_external_id` unique
- `sequence_no` tăng dần trên device, nhưng backend phải chấp nhận out-of-order và flag conflict nếu cần
- `source_module` phải nằm trong whitelist

## 16.4 ERP push
- payload version đúng contract
- `reference_id` không rỗng
- endpoint config và auth config phải tồn tại
- distinguish retryable vs non-retryable HTTP codes

---

## 17. Idempotency strategy cho Module 8

## 17.1 Nguyên tắc chung

- Idempotency check phải xảy ra **trước side effect tốn kém**.
- Với ingest log, duplicate nên trả record cũ hoặc acknowledge duplicate rõ ràng.
- Với queue job, duplicate không được tạo thêm job active nếu business key giống nhau.

## 17.2 Theo từng channel

### Weighbridge
- key: `weighbridge_event_id`
- duplicate response: `200 OK + existing record id`

### OCR upload
- key: `ocr_request_id` hoặc hash(file + metadata) nếu client không gửi id
- duplicate response: existing OCR result reference

### Mobile sync batch
- key: `batch_id`
- duplicate response: existing batch status

### Mobile sync event
- key: `event_external_id`
- duplicate response: existing event process status

### ERP push
- key: `push_type + reference_id`
- duplicate response: existing job status

---

## 18. Retry / backoff / dead-letter strategy

## 18.1 Weighbridge
- agent retry 3 lần x 30s
- backend không retry business callback vô hạn
- callback fail -> alert + reprocess endpoint

## 18.2 OCR
- extraction sync no-retry theo spec hiện tại
- fail -> operator re-upload hoặc manual correction path

## 18.3 Mobile sync
- mobile client retry khi có mạng
- backend chỉ track, không tự invent lại mobile queue
- failed event có replay API

## 18.4 ERP push
- backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s
- max attempts mặc định 10
- hết retry -> `DEAD_LETTER` + alert

---

## 19. Security, RBAC và audit

## 19.1 Role mapping tối thiểu

| Action | Role tối thiểu |
|---|---|
| ingest weigh event từ agent | system/agent auth |
| view weighbridge dashboard | WB_OPERATOR / WH_MANAGER / OPS_SUPER |
| reprocess weigh callback | WH_MANAGER / OPS_SUPER / ADMIN |
| upload OCR | WB_OPERATOR |
| confirm OCR correction | WB_OPERATOR / WH_MANAGER |
| view mobile sync dashboard | WH_MANAGER / OPS_SUPER |
| replay mobile sync event | WH_MANAGER / OPS_SUPER |
| view ERP push jobs | BILLING_OFC / OPS_SUPER |
| retry ERP push job | BILLING_OFC / ADMIN |
| resolve critical alert | OPS_SUPER / ADMIN |

## 19.2 Audit fields bắt buộc

Mọi hành động admin/human recovery phải lưu:
- actor
- action
- target object
- before status
- after status
- reason code nếu cần
- correlation_id
- timestamp
- source_app

---

## 20. Error handling và recovery

## 20.1 Những lỗi kỹ thuật bắt buộc phải nghĩ trước

1. agent gửi event thành công nhưng timeout response phía client
2. OCR provider thành công nhưng response mapping fail
3. batch sync accepted nhưng dispatch sang M7 fail
4. ERP push thành công phía ERP nhưng response parse fail
5. alert worker chết làm dashboard không cập nhật
6. duplicate event đến trước event gốc do network disorder
7. operator re-upload OCR cùng file nhiều lần

## 20.2 Recovery pattern khuyến nghị

- **persist before callback** cho ingest logs
- **outbox + retry** cho downstream callback/job
- **idempotent replay** cho failed event/job
- **manual admin recovery API** cho các case không tự chữa được
- **dead-letter review queue** cho ERP push fail cứng

---

## 21. Mapping Module 8 với các module hiện có

## 21.1 Với Module 1 — Foundation & Governance

Module 8 dùng trực tiếp:
- RBAC cho dashboard/recovery actions
- Audit log cho reprocess/retry/resolve/correction
- Reason code cho manual weight, recovery, override
- Idempotency service cho ingest APIs
- Decision/rule catalog nếu cần config retry policy bởi environment

## 21.2 Với Module 2 — Master Data Management

Module 8 dùng trực tiếp:
- warehouse/device scope mapping
- location validation cho mobile sync payload
- vehicle/item/owner data để enrich OCR/object matching
- UOM normalization nếu OCR extracted qty có đơn vị khác

## 21.3 Với Module 3 — Inventory Core Engine

Quan hệ đúng:
- M8 không gọi M3 để post tồn.
- M8 cung cấp data nền cho M4/M5/M7/M6.
- M3 chỉ bị tác động gián tiếp qua consumer business modules.

Lợi ích của việc giữ biên này:
- tránh double-posting inventory
- tránh việc raw device data trở thành transaction truth sai ngữ cảnh

## 21.4 Với Module 4 — Inbound Operations

M8 cung cấp:
- WEIGH_IN / WEIGH_OUT raw log
- OCR confirmed data cho vessel/BL flow
- manual weight capture log
- monitoring signal khi thiết bị cân offline ảnh hưởng receipt flow

M4 đổi lại sẽ:
- consume weigh event
- quyết định tolerance pass/fail
- decide `RECEIVED` và gọi M3

## 21.5 Với Module 5 — Outbound Operations

M8 cung cấp:
- TARE / GROSS line weigh events
- weighing sequence log
- manual weight capture log
- monitoring signal cho outbound weigh station

M5 đổi lại sẽ:
- tính net line
- quyết định tolerance / pending approval / shipped
- gọi M3 tại SHIPPED

## 21.6 Với Module 6 — Inventory Control

M8 hỗ trợ gián tiếp:
- mobile sync transport cho các flow control dùng mobile
- dashboard source issue khi execution sync fail
- không sở hữu document move/adjust/count/transfer

## 21.7 Với Module 7 — Work Execution & Mobile

Đây là mapping kỹ thuật rất sát:

- M7 tạo business command
- mobile app queue event
- M8 nhận batch, dedupe, dispatch
- M7 xử lý event, update work state, gọi M3 nếu hợp lệ
- M8 track sync outcome và dashboard

Nói ngắn gọn:
- **M8 là “đường vận chuyển”**
- **M7 là “nơi hiểu task”**

---

## 22. Trình tự implement khuyến nghị cho dev team

### Giai đoạn 1 — Core platform
1. DB schema core M8
2. shared enums / DTO / policy map
3. basic query + health endpoints
4. idempotency integration

### Giai đoạn 2 — Weighbridge
5. local agent contract
6. ingest weigh event API
7. immutable log + state table
8. callback/reprocess path
9. heartbeat + device offline alert

### Giai đoạn 3 — OCR
10. upload + storage
11. provider adapter
12. result + confirmation snapshot
13. handoff contract sang M4

### Giai đoạn 4 — Mobile sync
14. batch ingest API
15. event table + dispatch path
16. sync status query + replay
17. conflict model + dashboard

### Giai đoạn 5 — ERP push
18. enqueue service
19. queue worker + payload mapper
20. retry/dead-letter/recovery APIs
21. billing ops dashboard

### Giai đoạn 6 — Monitoring & hardening
22. alert engine
23. channel health snapshot
24. performance/index tuning
25. concurrency/idempotency/recovery tests
26. UAT hardening

---

## 23. Checklist hoàn thiện cho dev intern

Một dev intern được xem là hiểu đúng Module 8 khi trả lời được các câu sau:

1. Vì sao M8 không được quyết định tolerance hay posting inventory?
2. Tại sao `weighbridge_log` phải immutable?
3. Vì sao cần tách `m8_weighbridge_log` và `m8_weighbridge_event_state`?
4. Vì sao OCR raw result và confirmed snapshot phải tách riêng?
5. Vì sao mobile sync batch không được overwrite work state trực tiếp?
6. Vì sao ERP push phải dùng outbox/queue thay vì gọi inline?
7. Idempotency key của từng sub-capability là gì?
8. Khi callback sang M4/M5 fail thì reprocess thế nào mà không tạo duplicate log?
9. M8 ánh xạ với M7 ra sao trong mobile sync?
10. M8 khác M4/M5 ở đâu về ownership?
11. Dùng bảng nào để build dashboard nhanh mà không quét full log thô?
12. Alert lifecycle gồm những trạng thái nào?
13. Khi agent timeout response nhưng backend đã lưu log thì xử lý duplicate thế nào?
14. Vì sao local agent nên có local buffer?
15. Tại sao `correlation_id` quan trọng với M8 hơn một module CRUD thông thường?

---

## 24. Kết luận kỹ thuật

Module 8 là một module deceptively hard: nhìn qua tưởng chỉ là “tích hợp cân và OCR”, nhưng thực chất nó là **integration backbone** cho các luồng nhạy cảm nhất của SWM: trọng lượng chính thức, mobile offline, và đồng bộ debit note sang ERP.

Nếu build đúng:
- M4/M5 có dữ liệu cân ổn định để quyết định nghiệp vụ,
- M7 có hạ tầng sync đủ tin cậy cho mobile offline,
- M10 có kênh push ERP có retry và recovery,
- toàn hệ thống giữ được traceability và auditability.

Nếu build sai:
- rất dễ phát sinh duplicate weigh,
- mất log cân,
- mobile sync conflict âm thầm,
- ERP push thất bại nhưng không ai biết,
- và cuối cùng business sẽ nghi ngờ toàn bộ hệ thống.

Vì vậy, nguyên tắc bất biến của Module 8 phải luôn được giữ:

> **M8 thu thập, chuẩn hóa, lưu vết, vận chuyển và giám sát dữ liệu tích hợp; còn business truth và inventory truth vẫn thuộc các module nghiệp vụ và Module 3.**

