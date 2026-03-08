# TVL SWM — Module 11 Tech Stack & Backend Design
# Reporting, Audit & Go-Live Control

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-09  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Billing Team, PM, Cutover Team  
**Mục tiêu:** Chuyển hóa Module 11 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, reporting pipeline, reconciliation engine, audit trace query, export engine và go-live control theo chuẩn có thể build được ngay.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 11 — Reporting, Audit & Go-Live Control** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 11 thực chất phải build những gì ở Phase 1.
- Luồng chuẩn từ **database → read model / materialized view → service → query API / command API / export job / reconciliation job** nên tổ chức ra sao.
- Vì sao Module 11 là **read-heavy control layer**, không phải nơi tạo business truth mới.
- Thiết kế database nào vừa đúng cho go-live Phase 1 vừa đủ sạch để scale cho BI, scheduled report, custom report builder, data warehouse hoặc analytics về sau.
- Từng API dùng để làm gì, input/output gì, validate gì, side effect gì, retry/idempotency ra sao.
- Cách Module 11 ánh xạ với **Module 1 → Module 10** để dev hiểu đúng ownership, tránh build sai boundary.
- Cách build reporting, audit trace, reconciliation và go-live governance mà không phá nguyên tắc cốt lõi của toàn hệ thống: **InventDim → InventTrans → OnHand là transaction truth**.

Tài liệu này bám theo các baseline đã chốt trong bộ spec hiện tại:

- M11 gồm: **Operational Dashboard, Inventory Reports, Billing Reports, Audit Trail Reports, Reconciliation Engine, Go-Live Readiness, Export & Delivery**.
- M11 **không tạo business transaction truth**; M11 chỉ được tạo các control/audit metadata như `reconciliation_result`, `go_live_gate_status`, `export_job`.
- Inventory report phải bám **InventTrans / OnHand / InventDim**; reconciliation chỉ detect và log, **không auto-fix**.
- Audit trail phải immutable; retention audit 7 năm.
- Role-based access là bắt buộc; `CUST_VIEWER` chỉ được xem owner scope của mình.
- Dashboard Phase 1 dùng **polling**, chưa cần WebSocket cho mọi widget.
- Export lớn phải dùng **async job**; các POST command trong M11 phải hỗ trợ idempotency.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 28 kết luận kỹ thuật quan trọng cho Module 11:

1. **Module 11 là control/read layer của toàn hệ thống**, không phải transaction engine.
2. **M11 không được tạo hoặc sửa business truth** như `invent_trans`, `billing_event`, `receipt`, `shipment`, `work_line`.
3. **M11 được phép sở hữu control objects** như `reconciliation_result`, `go_live_gate_status`, `export_job`, `report_run_log`, `dashboard_cache`.
4. **On-hand report phải dựa trên inventory truth**; không để mỗi report tự tính theo logic riêng.
5. **M11 là module read-heavy nhất** trong toàn chương trình, nên kiến trúc phải ưu tiên query path, index, materialized view, export async và cache.
6. **Dashboard không cần real-time tuyệt đối** ở Phase 1; polling <= 60s cho critical widgets là đủ.
7. **Report query và screen query là 2 bài toán khác nhau**; query trên màn hình phải giới hạn range, export có thể async để xử lý volume lớn.
8. **Audit traceability là capability thật**, không chỉ là “xem log”. M11 phải truy được chuỗi `OnHand -> InventTrans -> source document -> user action`.
9. **Reconciliation là safety net**, không phải repair engine; mọi sửa sai phải quay về module sở hữu để sửa đúng boundary.
10. **Go-live control là feature vận hành thật**, không phải note quản trị ngoài lề. Cần DB, API, history, evidence, sign-off trail.
11. **Role-scope filter là bắt buộc ở tầng backend**, nhất là với `CUST_VIEWER`.
12. **Các POST command ở M11 tuy không tạo inventory truth nhưng vẫn là side-effect thật**, nên phải có idempotency.
13. **Export là workload nền riêng**, không được chạy đồng bộ cho report lớn vì sẽ khóa request thread và dễ timeout.
14. **M11 phải có query/read model rõ ràng**, không nên bắt mọi dashboard/report query join trực tiếp raw tables khắp 10 module trong runtime nóng.
15. **M11 phải có strategy “freshness by use case”**: widget critical 60s, billing/report 5 phút hoặc on-demand, export theo snapshot lúc generate.
16. **Module 11 phụ thuộc vào tất cả module**, nên DB design phải chừa đường cho schema versioning và backward compatibility.
17. **Posting trace phải đọc được cả source business object và source technical audit**, vì tranh chấp có thể xuất phát từ cả nghiệp vụ lẫn thao tác người dùng.
18. **Reconciliation result phải bất biến theo từng lần chạy**, không update đè làm mất lịch sử.
19. **Go-live sign-off phải lưu history**, vì một gate có thể sign-off nhiều lần và lần mới nhất là effective status.
20. **Read APIs và command APIs phải tách rõ**; đa số M11 là GET, một số POST là run/export/sign-off/resolve.
21. **Không được để UI gánh logic filter bảo mật**, mọi owner scope / warehouse scope phải enforce ở backend query layer.
22. **Module 11 phải scale theo 3 kiểu tải khác nhau**: dashboard polling, report browsing, export/reconciliation batch.
23. **Exception handling ở M11 là bắt buộc** cho stale widget, oversized queries, failed export, unresolved reconciliation, sign-off sai quyền.
24. **Module 11 phải đọc được cả nguồn transactional và nguồn read model** để đối soát chéo và phục vụ UAT/go-live.
25. **Materialized view / aggregate snapshot là hợp lý**, nhưng không được trở thành source-of-truth mới.
26. **M11 phải tái sử dụng Module 1 cho permission, audit, reason code, idempotency** thay vì tự làm bản sao governance riêng.
27. **M11 phải chuẩn bị đường lên Phase 2** cho BI integration, scheduled report, custom builder, nhưng không làm phình scope go-live.
28. **Code structure phải ngăn module khác viết trực tiếp vào control tables của M11**; mọi resolve, sign-off, rerun phải đi qua service/state machine tập trung.

---

## 3. Phạm vi build thực tế của Module 11 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Dashboard summary APIs
2. Dashboard widget aggregation services
3. Inventory report query services
4. Billing report query services
5. Audit / posting-trace query services
6. Reconciliation engine + result storage
7. Reconciliation run job + rerun flow
8. Reconciliation resolve flow
9. Go-live gate catalog + status engine
10. Auto gate check jobs / on-demand run
11. Manual sign-off / waiver flow
12. Export job create / process / expire
13. CSV export builder
14. PDF export builder cơ bản
15. Dashboard cache / report cache phù hợp từng use case
16. Query filter normalization + scope enforcement
17. Exception handling + alert hooks
18. Audit integration với Module 1
19. Idempotency handling cho mọi POST side-effect
20. Technical recovery cho export fail / reconciliation fail / stale cache / duplicate run
21. Query APIs cho search / detail / summary / history / status
22. Evidence reference handling cho resolve / sign-off
23. Read model strategy / materialized views / refresh jobs
24. Error code implementation + pagination + sorting + limit policy

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build custom report builder dạng drag-drop.
2. Không build semantic BI layer riêng.
3. Không build scheduled email report engine đầy đủ.
4. Không build WebSocket real-time cho mọi dashboard widget.
5. Không build data warehouse độc lập ngay trong go-live.
6. Không build predictive analytics / ML forecasting.
7. Không build rule engine quá động cho reconciliation.
8. Không build generic workflow engine thay cho go-live gate matrix cụ thể.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** dashboard, report, audit trace, reconciliation, export job, go-live gate tracking.
- **Có build** read model và control tables của M11.
- **Có build** POST commands cho run/resolve/sign-off/export.
- **Không build** inventory posting trong Module 11.
- **Không build** billing event generation trong Module 11.
- **Không build** logic sửa sai dữ liệu transactional trực tiếp trong Module 11.
- **Không cho phép** bất kỳ API/UI nào update `invent_trans`, `on_hand`, `billing_event`, `debit_note`, `receipt`, `shipment` từ M11.

---

## 4. Khuyến nghị tech stack chính thức cho Module 11

Để đồng bộ với Modules 1–10 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST cho query/command chính; outbox/event cho refresh/invalidation nội bộ
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot dashboard / export coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis
- **Object storage:** S3-compatible để lưu file export CSV/PDF và evidence references nếu cần

### 4.3 Reporting / export stack

- **CSV export:** fast-csv hoặc equivalent stream-based writer
- **PDF export:** HTML template + headless Chromium / Playwright PDF hoặc wkhtmltopdf tùy hạ tầng
- **Materialized views:** PostgreSQL materialized views hoặc aggregate tables refresh by job
- **JSON aggregation:** PostgreSQL JSONB tốt cho filter snapshot và saved payload

### 4.4 Observability

- Structured logging: Pino/Winston JSON
- Correlation ID xuyên suốt: request -> query -> export/reconciliation/go-live job -> audit
- Metrics chính:
  - dashboard latency
  - report latency by report_id
  - export queue depth
  - export success/fail rate
  - reconciliation mismatch count by check_id
  - go-live gate pass/fail count
  - stale cache hit ratio
- Tracing: OpenTelemetry-ready

### 4.5 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- Golden-data test: expected report output / totals / filter behavior
- Job test: export/reconciliation/go-live run lifecycle
- Security test: owner scope / forbidden scope / data leakage
- Performance smoke test: dashboard 10 concurrent users, export 100k rows, reconciliation batch

### 4.6 Vì sao nên giữ cùng stack với Modules 1–10

1. Dễ reuse shared foundation: RBAC, audit, idempotency, request context.
2. PostgreSQL mạnh cho join/reporting, materialized view, JSONB, partial index, transaction, partition.
3. Redis + BullMQ đủ tốt cho export job, reconciliation run, cache invalidation.
4. NestJS module-based dễ tổ chức query service / job worker / policy layer riêng.
5. Prisma giúp intern đọc schema và query object dễ hơn, nhất quán với các module trước.

---

## 5. Kiến trúc tổng thể Module 11 trong hệ backend

```text
Web Dashboard / Ops Console / Billing Console / Customer Viewer Portal
                                |
                                v
                    NestJS Reporting Controllers
                                |
          +---------------------+------------------------+
          |                     |                        |
          v                     v                        v
      Auth Guard         Permission Guard         Scope Guard
          |                     |                        |
          +---------------------+------------------------+
                                |
                                v
                    Reporting Application Layer
+------------------+-------------------+-------------------+------------------+
|                  |                   |                   |                  |
v                  v                   v                   v                  v
DashboardSvc   ReportQuerySvc     AuditTraceSvc    ReconcileSvc        GoLiveSvc
ExportSvc      WidgetCacheSvc     ReadModelSvc     ExportJobSvc        GateSvc
                                |
                                v
                         Domain / Policy Layer
+------------------+-------------------+-------------------+------------------+
| Scope Policy     | Filter Policy     | Export Policy     | Resolve Policy   |
| Freshness Rule   | Pagination Rule   | Gate Policy       | Query Rule       |
+------------------+-------------------+-------------------+------------------+
                                |
                                v
                           Repository Layer
                                |
                                v
     PostgreSQL + Materialized Views + Redis + BullMQ + Object Storage
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa business logic.
- **Guard layer**: auth, permission, owner scope, warehouse scope.
- **Application services**: orchestration query/command/export/job.
- **Policy layer**: filter validation, scope enforcement, export threshold, go-live gate rule, reconcile resolve rule.
- **Repository layer**: raw SQL hoặc Prisma query tối ưu cho reporting.
- **Background jobs**: export generation, cache refresh, reconciliation run, gate checks, cleanup expired exports.

### 5.2 Tư tưởng thiết kế cốt lõi

- M11 phải là **query-first architecture**.
- Read models được phép tồn tại để tối ưu hiệu năng, nhưng **không thay thế transaction truth**.
- Những gì có thể tính theo batch nên đẩy sang job, không nhét vào request sync quá nặng.
- Reconciliation và go-live là **control workflows**, không phải transaction repairs.
- Export là **asynchronous file delivery problem**, không phải GET query đơn giản.

---

## 6. Ownership boundary của Module 11

| Concern | Module 11 sở hữu | Module khác sở hữu |
|---|---|---|
| Dashboard widgets | Có | Các module nguồn chỉ cung cấp data gốc |
| Inventory reports | Có (query/read layer) | M3 sở hữu inventory truth |
| Billing reports | Có (query/read layer) | M10 sở hữu billing objects |
| Audit trace report | Có (query/read layer) | M1 sở hữu audit framework |
| Reconciliation result | Có | Module nguồn sửa sai dữ liệu thật |
| Go-live gate catalog/status | Có | Module nguồn cung cấp evidence/check data |
| Export job/file lifecycle | Có | Không |
| InventTrans / OnHand | Không | M3 |
| Receipt / Shipment / Work / VAS / DN lifecycle | Không | M4/M5/M7/M9/M10 |
| Permission/audit/idempotency shared framework | Không, chỉ consume | M1 |

### 6.1 Golden rules

- M11 **không** insert/update `invent_trans`, `on_hand`, `billing_event`, `debit_note`, `receipt`, `shipment`, `work_header`, `vas_work_order`.
- M11 **được phép** insert/update `reconciliation_result`, `reconciliation_run`, `go_live_gate_status`, `go_live_signoff_history`, `export_job`, `report_cache`.
- M11 **được phép** đọc dữ liệu từ mọi module nhưng không được lách ownership để “sửa hộ”.
- M11 **không auto-fix discrepancy**; nếu sai, phải trả về module sở hữu sửa đúng boundary rồi rerun.

---

## 7. Mapping Module 11 với Module 1 → Module 10

### 7.1 Module 1 — Foundation & Governance
- Reuse RBAC, owner scope, warehouse scope, audit framework, idempotency baseline.
- M11 dùng reason code/evidence policy cho resolve mismatch, sign-off waiver.
- M11 dùng audit policy để ghi log cho export, reconciliation run, go-live sign-off.

### 7.2 Module 2 — Master Data
- Dùng Owner, Item, Warehouse, Location, Zone, Inventory Status cho filter/report dimension.
- Dùng capacity / location profile để tính utilization dashboard.
- Dùng owner scope mapping cho `CUST_VIEWER`.

### 7.3 Module 3 — Inventory Core Engine
- Đây là dependency quan trọng nhất của M11.
- On-hand, movement, aging, posting trace, reconciliation đều phải đọc từ `invent_dim`, `invent_trans`, `on_hand`, snapshot/reconciliation outputs của M3.
- M11 không được tự nghĩ ra công thức inventory khác với M3.

### 7.4 Module 4 — Inbound Operations
- Nguồn cho inbound summary, rejected receipts, received throughput, receipt history.
- Audit/posting trace phải nối được `receipt -> invent_trans RECEIVE -> putaway work`.

### 7.5 Module 5 — Outbound Operations
- Nguồn cho outbound summary, pending approval shipments, shipped throughput, shrinkage/commercial delta.
- Audit/posting trace phải nối được `shipment -> allocation -> weighing -> invent_trans SHIP`.

### 7.6 Module 6 — Inventory Control
- Nguồn cho movement history, status change report, adjustment report, count variance report, transfer history.
- Reconciliation có thể detect mismatch giữa document effect và posted trans từ M6.

### 7.7 Module 7 — Work Execution & Mobile
- Nguồn cho work queue dashboard, productivity report, stuck work report.
- Audit trace phải nối được `work_line COMPLETED -> inventory posting event`.

### 7.8 Module 8 — Weighbridge, OCR & Integration
- Nguồn cho weighbridge queue, offline/heartbeat alerts, scale errors, evidence path.
- M11 có thể report integration health nhưng không sở hữu retry chính của M8.

### 7.9 Module 9 — VAS / Bagging
- Nguồn cho VAS progress widget, VAS production report, reconciliation consume/produce/loss.
- M11 phải trace được `vas_work_order -> VAS_CONSUME / VAS_PRODUCE -> billing event`.

### 7.10 Module 10 — Billing & Commercial Control
- Nguồn cho billing events report, DN report, revenue view, storage report, unbilled/orphan exception.
- Go-live gate và reconciliation phải nhìn được readiness của billing layer.

---

## 8. Đề xuất cấu trúc code backend cho Module 11

```text
src/
  modules/
    reporting/
      reporting.module.ts
      controllers/
        dashboard.controller.ts
        inventory-report.controller.ts
        billing-report.controller.ts
        audit-report.controller.ts
        reconciliation.controller.ts
        go-live.controller.ts
        export.controller.ts
      services/
        dashboard.service.ts
        widget-cache.service.ts
        inventory-report.service.ts
        billing-report.service.ts
        audit-trace.service.ts
        reconciliation.service.ts
        reconciliation-runner.service.ts
        go-live.service.ts
        go-live-gate.service.ts
        export.service.ts
        export-file.service.ts
        report-read-model.service.ts
        scope-filter.service.ts
      repositories/
        dashboard.repository.ts
        inventory-report.repository.ts
        billing-report.repository.ts
        audit-trace.repository.ts
        reconciliation.repository.ts
        go-live.repository.ts
        export-job.repository.ts
      dto/
      jobs/
        refresh-dashboard.job.ts
        run-reconciliation.job.ts
        run-go-live-check.job.ts
        generate-export.job.ts
        cleanup-expired-export.job.ts
      policies/
        report-scope.policy.ts
        export-threshold.policy.ts
        go-live-signoff.policy.ts
        reconciliation-resolve.policy.ts
      mappers/
      sql/
        inventory/
        billing/
        audit/
        dashboard/
```

### 8.1 Quy tắc code structure

- Controller không viết SQL nặng.
- Query logic phức tạp nên tách repository/raw SQL file thay vì nhồi vào service.
- Report query và export query có thể dùng cùng builder nhưng khác execution strategy.
- Các POST command như run/resolve/sign-off/export phải qua service + idempotency guard.
- Caching không đặt rải rác trong controller; gom vào widget-cache/report-cache service.

---

## 9. Thiết kế database tối ưu cho Module 11

### 9.1 Nguyên tắc thiết kế DB

1. **Tách rõ control tables của M11** khỏi source tables của modules khác.
2. **Không copy raw transaction vô tội vạ** vào M11; chỉ tạo aggregate/read model có mục đích rõ.
3. **Job run history phải immutable** theo từng lần chạy.
4. **Filter payload nên lưu JSONB normalized** để trace và debug.
5. **Phải có index mạnh ở các cột query nhiều**: report_id, job_status, check_id, severity, resolved, gate_id, effective_date.
6. **Có thể dùng materialized views / aggregate tables** cho report/dashboard nặng.
7. **Dọn dẹp retention rõ** cho export file và cache, nhưng **không xóa audit/reconciliation history bừa bãi**.

### 9.2 Core tables do Module 11 sở hữu

- `rpt_export_job`
- `rpt_export_job_event`
- `rpt_reconciliation_run`
- `rpt_reconciliation_result`
- `rpt_reconciliation_resolution`
- `rpt_go_live_gate`
- `rpt_go_live_gate_status`
- `rpt_go_live_signoff_history`
- `rpt_report_run_log`
- `rpt_dashboard_cache`
- `rpt_saved_filter` *(optional but useful if UI có nhu cầu)*
- `rpt_alert_event` *(optional phase 1-lite, recommended if alert visible in dashboard)*

### 9.3 Read models / aggregate tables khuyến nghị

- `mv_rpt_on_hand_summary`
- `mv_rpt_on_hand_detail`
- `mv_rpt_movement_daily`
- `mv_rpt_inbound_daily`
- `mv_rpt_outbound_daily`
- `mv_rpt_work_queue_snapshot`
- `mv_rpt_billing_event_daily`
- `mv_rpt_storage_utilization`
- `mv_rpt_exception_summary`

> Lưu ý: dùng prefix `mv_` nếu là materialized view thật; nếu là aggregate table refresh by job, có thể dùng `agg_`.

---

## 10. Schema đề xuất chi tiết

### 10.1 `rpt_export_job`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| export_job_id | VARCHAR(36) | Y | public id / unique |
| report_id | VARCHAR(50) | Y | e.g. RPT-INV-001 |
| export_format | VARCHAR(10) | Y | CSV / PDF |
| requested_by | UUID | Y | user id |
| requested_role | VARCHAR(30) | Y | denormalized |
| owner_scope_id | UUID | N | for CUST_VIEWER trace |
| warehouse_scope_json | JSONB | N | authorized warehouses |
| filter_payload | JSONB | Y | normalized filters |
| job_status | VARCHAR(20) | Y | QUEUED/RUNNING/COMPLETED/FAILED/EXPIRED |
| row_count | INTEGER | N | |
| file_uri | TEXT | N | object storage path |
| file_size_bytes | BIGINT | N | |
| checksum_sha256 | VARCHAR(64) | N | |
| expires_at | TIMESTAMPTZ | N | |
| failure_reason | TEXT | N | |
| idempotency_key | VARCHAR(100) | N | for POST dedupe |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

**Indexes khuyến nghị**
- unique(`export_job_id`)
- index(`requested_by`, `created_at desc`)
- index(`job_status`, `created_at desc`)
- index(`report_id`, `created_at desc`)
- index(`expires_at`) for cleanup
- index(`idempotency_key`) partial where not null

### 10.2 `rpt_export_job_event`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| export_job_id | UUID FK | Y | -> rpt_export_job.id |
| event_type | VARCHAR(30) | Y | QUEUED/RUNNING/COMPLETED/FAILED/EXPIRED/DOWNLOAD |
| event_payload | JSONB | N | |
| created_by | UUID | N | user/system |
| created_at | TIMESTAMPTZ | Y | |

### 10.3 `rpt_reconciliation_run`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| run_id | VARCHAR(36) | Y | public id |
| trigger_type | VARCHAR(20) | Y | MANUAL/SCHEDULED |
| requested_by | UUID | N | null if scheduled |
| check_ids | JSONB | Y | requested checks |
| run_scope | JSONB | Y | warehouse/date/owner scope |
| run_status | VARCHAR(20) | Y | QUEUED/RUNNING/COMPLETED/FAILED |
| accepted_checks_count | INT | Y | |
| completed_checks_count | INT | Y | |
| failure_reason | TEXT | N | |
| idempotency_key | VARCHAR(100) | N | manual run dedupe |
| correlation_id | UUID | Y | |
| started_at | TIMESTAMPTZ | N | |
| completed_at | TIMESTAMPTZ | N | |
| created_at | TIMESTAMPTZ | Y | |

### 10.4 `rpt_reconciliation_result`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| result_id | VARCHAR(36) | Y | public id |
| run_id | UUID FK | Y | -> rpt_reconciliation_run.id |
| check_id | VARCHAR(30) | Y | RECON-001... |
| check_name | VARCHAR(100) | Y | denormalized |
| result_status | VARCHAR(20) | Y | PASS/WARNING/FAIL |
| severity | VARCHAR(20) | Y | LOW/MEDIUM/HIGH/CRITICAL |
| dimension_key | JSONB | N | owner/item/location/ref_id |
| source_module | VARCHAR(20) | Y | M3/M4/M5/M6/M7/M9/M10/M11 |
| source_ref_type | VARCHAR(30) | N | |
| source_ref_id | VARCHAR(50) | N | |
| expected_value | NUMERIC(20,3) | N | |
| actual_value | NUMERIC(20,3) | N | |
| variance_value | NUMERIC(20,3) | N | |
| mismatch_detail | JSONB | N | |
| is_resolved | BOOLEAN | Y | default false |
| resolved_at | TIMESTAMPTZ | N | |
| resolved_by | UUID | N | |
| resolution_note | TEXT | N | |
| evidence_ref | TEXT | N | |
| supersedes_result_id | UUID | N | rerun linkage |
| created_at | TIMESTAMPTZ | Y | |

**Indexes khuyến nghị**
- unique(`result_id`)
- index(`check_id`, `created_at desc`)
- index(`result_status`, `severity`, `created_at desc`)
- index(`is_resolved`, `severity`, `created_at desc`)
- GIN index on `dimension_key`
- index(`source_module`, `source_ref_id`)

### 10.5 `rpt_reconciliation_resolution`

Tách bảng này nếu muốn giữ history resolve nhiều lần thay vì update trực tiếp result.

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| reconciliation_result_id | UUID FK | Y | |
| action_type | VARCHAR(20) | Y | RESOLVED/REOPENED/COMMENT |
| resolution_note | TEXT | Y | |
| evidence_ref | TEXT | N | |
| source_module | VARCHAR(20) | N | nơi đã sửa dữ liệu thật |
| source_ref_id | VARCHAR(50) | N | |
| created_by | UUID | Y | |
| created_at | TIMESTAMPTZ | Y | |

### 10.6 `rpt_go_live_gate`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| gate_id | VARCHAR(20) | Y | GL-001... |
| gate_name | VARCHAR(100) | Y | |
| gate_type | VARCHAR(20) | Y | AUTO / MANUAL |
| owner_role | VARCHAR(30) | Y | |
| reviewer_role | VARCHAR(30) | Y | |
| milestone | VARCHAR(30) | Y | BEFORE_SIT / BEFORE_UAT / BEFORE_GO_LIVE |
| waiver_allowed | BOOLEAN | Y | |
| is_active | BOOLEAN | Y | |
| check_config | JSONB | N | auto rule config |
| display_order | INT | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 10.7 `rpt_go_live_gate_status`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| gate_id | UUID FK | Y | -> rpt_go_live_gate.id |
| snapshot_no | VARCHAR(30) | Y | logical cutover snapshot |
| status | VARCHAR(20) | Y | PASS/FAIL/WAIVED/PENDING |
| last_check_type | VARCHAR(20) | Y | AUTO/MANUAL |
| last_run_ref | VARCHAR(36) | N | reconciliation/check run ref |
| effective_at | TIMESTAMPTZ | Y | latest effective status time |
| effective_by | UUID | N | null for auto |
| evidence_ref | TEXT | N | |
| note | TEXT | N | |
| waiver_reason | TEXT | N | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 10.8 `rpt_go_live_signoff_history`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| gate_status_id | UUID FK | Y | |
| gate_id | VARCHAR(20) | Y | denormalized |
| action_status | VARCHAR(20) | Y | PASS/FAIL/WAIVED |
| note | TEXT | Y | |
| evidence_ref | TEXT | N | |
| waiver_reason | TEXT | N | |
| signed_by | UUID | Y | |
| signed_at | TIMESTAMPTZ | Y | |

### 10.9 `rpt_report_run_log`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| report_id | VARCHAR(50) | Y | |
| run_mode | VARCHAR(20) | Y | SCREEN/EXPORT/API |
| requested_by | UUID | Y | |
| filter_payload | JSONB | Y | |
| duration_ms | INT | N | |
| row_count | INT | N | |
| cache_hit | BOOLEAN | Y | |
| status | VARCHAR(20) | Y | SUCCESS/FAILED |
| error_code | VARCHAR(50) | N | |
| created_at | TIMESTAMPTZ | Y | |

### 10.10 `rpt_dashboard_cache`

| Field | Type | Required | Note |
|---|---|---:|---|
| id | UUID | Y | PK |
| widget_code | VARCHAR(50) | Y | |
| cache_key | VARCHAR(100) | Y | derived from scope/date |
| cache_payload | JSONB | Y | |
| source_fresh_at | TIMESTAMPTZ | Y | |
| expires_at | TIMESTAMPTZ | Y | |
| created_at | TIMESTAMPTZ | Y | |

**Indexes**
- unique(`widget_code`, `cache_key`)
- index(`expires_at`)

---

## 11. Read model và materialized view strategy

### 11.1 Vì sao cần read model

Nếu dashboard/report nào cũng join trực tiếp `invent_trans`, `receipt`, `shipment`, `work_header`, `billing_event`, `audit_log` ở runtime nóng thì:
- query sẽ nặng,
- khó scale,
- export lớn dễ timeout,
- polling 60s sẽ tạo áp lực lớn lên DB.

Vì vậy nên dùng read model cho 3 nhóm:

1. **Dashboard widgets**: aggregate theo ngày / warehouse / owner.
2. **Operational reports**: on-hand summary, work queue, exceptions, utilization.
3. **Billing/audit inquiry**: index + specialized SQL + optional aggregate.

### 11.2 Những gì nên query trực tiếp từ source tables

- Posting trace detail theo `trans_id`
- Audit log detail theo `entity_id`/`action`
- Reconciliation root-cause detail
- Report detail mức sâu khi user drill-down

### 11.3 Những gì nên pre-aggregate

- Inbound today count/tonnage per warehouse
- Outbound today count/tonnage per warehouse
- Work queue counts by type/status
- Exception count summary
- Storage utilization per warehouse/zone
- Billing event daily totals
- Inventory aging bucket counts

---

## 12. Phân lớp dữ liệu trong Module 11

```text
Layer 1: Source-of-truth tables (owned by M1-M10)
  - invent_trans, on_hand, receipt_header, shipment_header,
    work_header, weighbridge_log, vas_work_order, billing_event,
    debit_note, audit_log...

Layer 2: Read models / materialized views (M11-owned refresh layer)
  - mv_rpt_on_hand_summary
  - mv_rpt_work_queue_snapshot
  - mv_rpt_billing_event_daily
  - mv_rpt_storage_utilization

Layer 3: Control tables (M11-owned)
  - rpt_export_job
  - rpt_reconciliation_run/result
  - rpt_go_live_gate/status/history
  - rpt_report_run_log
```

Nguyên tắc:
- Layer 1 là truth.
- Layer 2 là acceleration layer.
- Layer 3 là control/audit layer của M11.

---

## 13. Luồng thực hiện từ database → backend

## 13.1 Luồng dashboard

```text
Source tables / MVs
   -> Dashboard repository queries
   -> Widget assembler service
   -> Scope filter / freshness rule
   -> Cache write/read (Redis or rpt_dashboard_cache)
   -> GET /api/v1/dashboard/summary
```

### Chi tiết
1. Repository lấy dữ liệu từ materialized view hoặc aggregate query.
2. Service áp dụng scope filter theo role.
3. Widget assembler chuẩn hóa output shape `widgets[]`.
4. Nếu cache còn hạn, trả cache; nếu stale nhưng source timeout, trả stale state + `last_successful_refresh`.
5. Ghi `rpt_report_run_log` ở mức nhẹ nếu cần performance tracking.

## 13.2 Luồng report screen query

```text
Source tables / MVs
   -> Query builder / filter normalizer
   -> Scope enforcement
   -> Repository execute paginated query
   -> Totals calculator
   -> Response mapper
   -> GET /api/v1/reports/*
```

### Chi tiết
1. Normalize filters, default date/timezone.
2. Kiểm tra hard rules: date range, required key, screen query limit.
3. Repository chạy query tối ưu bằng index hoặc MV.
4. Service trả `rows[]`, `totals`, `pagination`, `generated_at`.
5. Ghi `rpt_report_run_log`.

## 13.3 Luồng export

```text
POST /reports/export
   -> validate + scope + estimated rows
   -> create rpt_export_job(QUEUED)
   -> enqueue BullMQ job
   -> worker loads data in chunks
   -> generate CSV/PDF file
   -> upload object storage
   -> update rpt_export_job(COMPLETED/FAILED)
   -> GET /exports/{id} download
```

### Chi tiết
1. Sync request chỉ tạo job, không kéo toàn bộ data ngay.
2. Worker dùng query builder giống report screen nhưng ở chế độ export, cho phép volume lớn hơn.
3. CSV dùng stream để tránh full memory load.
4. PDF chỉ cho datasets nhỏ hơn ngưỡng cho phép.
5. File sinh xong lưu object storage, gắn `expires_at`.
6. Job events ghi vào `rpt_export_job_event`.

## 13.4 Luồng reconciliation

```text
POST /reconciliation/run
   -> validate check_ids + idempotency
   -> create rpt_reconciliation_run(QUEUED)
   -> enqueue run job
   -> worker execute each check
   -> persist rpt_reconciliation_result
   -> aggregate summary
   -> user views results / resolves mismatch
```

### Chi tiết
1. Mỗi check có query/adapter riêng.
2. Result được lưu độc lập theo từng mismatch hoặc từng dimension.
3. Không update/sửa nguồn thật.
4. Resolve chỉ là đánh dấu đã xử lý ở module sở hữu + evidence.
5. Rerun tạo record lịch sử mới, không ghi đè fail cũ.

## 13.5 Luồng go-live check

```text
POST /go-live/check
   -> validate gate selection + idempotency
   -> run auto checks
   -> compute overall status
   -> upsert effective status in rpt_go_live_gate_status
   -> append rpt_go_live_signoff_history for manual actions only
```

### Chi tiết
1. Auto gate đọc dữ liệu từ modules nguồn hoặc reconciliation results.
2. Manual sign-off dùng API riêng, yêu cầu note/evidence/waiver_reason nếu cần.
3. `overall_status` = FAIL nếu còn gate FAIL ở milestone hiện tại.
4. Có thể snapshot theo `snapshot_no` để phục vụ cutover/UAT/go-live.

---

## 14. API catalog tổng thể cho Module 11

### 14.1 Nhóm Dashboard
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/widgets/{widget_code}` *(optional nếu UI load widget riêng)*

### 14.2 Nhóm Inventory Reports
- `GET /api/v1/reports/inventory/on-hand`
- `GET /api/v1/reports/inventory/movement`
- `GET /api/v1/reports/inventory/inbound-summary`
- `GET /api/v1/reports/inventory/outbound-summary`
- `GET /api/v1/reports/inventory/aging`
- `GET /api/v1/reports/inventory/loss-adjustment`
- `GET /api/v1/reports/inventory/commercial-shrinkage`
- `GET /api/v1/reports/inventory/location-utilization`
- `GET /api/v1/reports/inventory/transfer-history`
- `GET /api/v1/reports/inventory/cycle-count-variance`

### 14.3 Nhóm Billing Reports
- `GET /api/v1/reports/billing/events`
- `GET /api/v1/reports/billing/debit-notes`
- `GET /api/v1/reports/billing/revenue-summary`
- `GET /api/v1/reports/billing/unbilled-exceptions`

### 14.4 Nhóm Audit Reports
- `GET /api/v1/reports/audit/user-activity`
- `GET /api/v1/reports/audit/state-transitions`
- `GET /api/v1/reports/audit/posting-trace`
- `GET /api/v1/reports/audit/manual-exceptions`

### 14.5 Nhóm Reconciliation
- `POST /api/v1/reconciliation/run`
- `GET /api/v1/reconciliation/results`
- `GET /api/v1/reconciliation/results/{id}`
- `POST /api/v1/reconciliation/{id}/resolve`

### 14.6 Nhóm Go-Live Control
- `GET /api/v1/go-live/status`
- `POST /api/v1/go-live/check`
- `POST /api/v1/go-live/{gate_id}/sign-off`
- `GET /api/v1/go-live/history`

### 14.7 Nhóm Export
- `POST /api/v1/reports/export`
- `GET /api/v1/reports/export/{export_job_id}`
- `GET /api/v1/reports/export/{export_job_id}/download`
- `POST /api/v1/reports/export/{export_job_id}/retry` *(ADMIN/OPS only if needed)*

---

## 15. Phân tích chi tiết từng API và hướng build

## 15.1 `GET /api/v1/dashboard/summary`

### API này để làm gì?
Trả toàn bộ widget summary cho màn dashboard chính: throughput, work queue, exception count, VAS in progress, pending DN, weighbridge queue, utilization.

### Vì sao cần API này?
- UI dashboard cần 1 endpoint tổng hợp để giảm roundtrip.
- M11 phải làm lớp tổng hợp xuyên M4/M5/M7/M8/M9/M10.
- Có thể cache theo role + warehouse + owner + date.

### Request gợi ý
```json
{
  "owner_id": "optional",
  "warehouse_id": "optional",
  "date": "2026-03-09",
  "timezone": "Asia/Bangkok"
}
```

### Response gợi ý
```json
{
  "widgets": [
    {
      "code": "INBOUND_TODAY",
      "label": "Inbound Today",
      "value": 42,
      "sub_value": 1260.5,
      "unit": "receipt / MT",
      "stale": false
    }
  ],
  "last_refreshed_at": "2026-03-09T10:00:10+07:00",
  "applied_filters": {
    "warehouse_id": "WH-HCM-01"
  }
}
```

### Build như thế nào?
- Service gọi nhiều repository/widget builders song song.
- Với widget nặng, đọc từ MV hoặc cache.
- Khi 1 widget timeout, trả widget đó ở trạng thái stale thay vì làm fail cả dashboard.
- Tách mỗi widget thành provider riêng để dễ test và scale.

### Lưu ý kỹ thuật
- Không để UI tự gọi 8–10 endpoints nhỏ ở Phase 1 nếu chưa cần.
- Có thể preload widgets theo role để giảm query không cần thiết.

---

## 15.2 `GET /api/v1/reports/inventory/on-hand`

### API này để làm gì?
Trả report tồn hiện tại, ở dạng summary hoặc detail.

### Nguồn dữ liệu chính
- M3 `on_hand` + `invent_dim`
- fallback / reconciliation reference: `invent_trans`

### Use case
- WH_MANAGER xem tồn theo owner/item/status/location.
- CUST_VIEWER xem tồn owner của mình.
- Export inventory snapshot cho khách hoặc vận hành.

### Build như thế nào?
- `view=summary`: query aggregate từ MV `mv_rpt_on_hand_summary`.
- `view=detail`: query detail từ `on_hand + invent_dim + md_*`.
- `location_id` chỉ cho detail view.
- Totals tính cùng query hoặc query riêng tùy performance.

### Validation
- CUST_VIEWER không được truyền owner khác owner_scope.
- `page_size` giới hạn max 500 cho screen.
- `status` chỉ nhận values hợp lệ từ M2.

### Hướng build intern-friendly
- Bắt đầu bằng raw SQL rõ ràng, không cố generic query builder quá sớm.
- Tách `buildWhereClause()` và `mapRow()` để dễ maintain.

---

## 15.3 `GET /api/v1/reports/inventory/movement`

### API này để làm gì?
Liệt kê lịch sử `invent_trans` theo date range và dimension/business reference.

### Nguồn dữ liệu
- `invent_trans`
- join `invent_dim`
- join optional business refs: receipt/shipment/work/adjustment/transfer/vas

### Vì sao quan trọng?
Đây là report cốt lõi để audit tranh chấp, đối chiếu biến động, và drill-down từ on-hand.

### Build như thế nào?
- Dùng query trực tiếp từ `invent_trans` vì đây là transaction truth.
- Giới hạn date range 92 ngày cho screen query.
- Support filter `trans_type`, `ref_type`, `item_id`, `owner_id`, `warehouse_id`.
- Sort default `posted_at desc, trans_id desc`.

### Lưu ý
- Có thể thêm `cursor` ở phase sau nếu volume lớn.
- Với export volume lớn, chạy qua export job.

---

## 15.4 `GET /api/v1/reports/billing/events`

### API này để làm gì?
Tra cứu `billing_event` theo period, owner, charge code, status.

### Nguồn dữ liệu
- M10 `billing_event`
- optional joins: contract, debit_note_line/debit_note

### Build như thế nào?
- Read-only query từ M10 tables.
- Totals gồm `amount_vnd_total`, `qty_total_mt` nếu có.
- CUST_VIEWER chỉ thấy owner của mình và thường chỉ event đã commercialized/allowed.

### Lưu ý boundary
- M11 chỉ report, không sửa event.
- Không duplicate logic rate calculation từ M10 vào M11.

---

## 15.5 `GET /api/v1/reports/audit/posting-trace`

### API này để làm gì?
Trả chuỗi truy vết đầy đủ từ `InventTrans` hoặc `ref_id` về source document và work/audit liên quan.

### Đây là API quan trọng nhất của M11 về audit
Nó giúp trả lời các câu hỏi kiểu:
- Tại sao tồn này đang ở location này?
- Shipment nào đã trừ tồn này?
- Receipt nào tạo tồn đầu vào?
- WorkLine nào đã move hàng?
- User nào đã override/manual action?

### Build như thế nào?
- Cho phép input `trans_id` hoặc `ref_type + ref_id` hoặc `date_range`.
- Service xây graph dữ liệu:
  1. tìm `invent_trans`
  2. nối `invent_dim`
  3. nối source business doc theo `ref_type/ref_id`
  4. nối `audit_log` / `status_history` / `work` liên quan
- Response nên có structure dạng chain, không chỉ list phẳng.

### Response gợi ý
```json
{
  "trace": {
    "inventory": {...},
    "source_document": {...},
    "work_execution": {...},
    "audit_actions": [...]
  }
}
```

### Lưu ý
- Đây là query nghiệp vụ phức tạp, nên tách service riêng.
- Có thể cần limit depth để tránh query quá nặng.

---

## 15.6 `POST /api/v1/reconciliation/run`

### API này để làm gì?
Trigger một hoặc nhiều reconciliation checks.

### Side effects
- Tạo `rpt_reconciliation_run`
- Enqueue job
- Sau đó worker tạo `rpt_reconciliation_result`

### Vì sao cần idempotency?
Ops user có thể bấm nhiều lần, hoặc UI retry. Cùng payload + key trong 10 phút phải trả job cũ.

### Build như thế nào?
- Validate `check_ids[]` tồn tại trong catalog.
- Normalize `run_scope`.
- Tạo record `QUEUED`.
- Push BullMQ.
- Trả `job_id`.

### Anti-pattern cần tránh
- Chạy toàn bộ reconciliation inline trong request.
- Update đè result cũ.
- Auto-fix khi phát hiện mismatch.

---

## 15.7 `GET /api/v1/reconciliation/results`

### API này để làm gì?
Tra kết quả reconciliation theo check, status, severity, date, resolved.

### Build như thế nào?
- Query từ `rpt_reconciliation_result` + optional join `run`.
- Trả `summary_by_status` để UI hiển thị badge nhanh.
- Hỗ trợ pagination, severity sort.

### Use case
- OPS_SUPER xem mismatch đang mở.
- WH_MANAGER lọc theo check liên quan inbound/outbound.
- BILLING_OFC xem mismatch storage/billing.

---

## 15.8 `POST /api/v1/reconciliation/{id}/resolve`

### API này để làm gì?
Đánh dấu mismatch đã được xử lý ở module sở hữu.

### Đây không phải API sửa dữ liệu thật
Nó chỉ ghi nhận:
- ai review,
- đã sửa ở đâu,
- evidence nào,
- note gì.

### Build như thế nào?
- Kiểm tra actor có quyền theo check severity/source_module không.
- `resolution_note` mandatory.
- Với HIGH/CRITICAL, `evidence_ref` gần như bắt buộc.
- Append history vào `rpt_reconciliation_resolution`, đồng thời update effective fields ở result.

### Lưu ý
- Sau resolve, data vẫn có thể fail lại ở lần rerun nếu source chưa thực sự đúng.

---

## 15.9 `GET /api/v1/go-live/status`

### API này để làm gì?
Trả readiness status tổng hợp theo snapshot/milestone.

### Use case
- PM/OPS_SUPER xem còn gate nào fail trước SIT/UAT/go-live.
- Steering xem overall status.

### Build như thế nào?
- Query `rpt_go_live_gate` + effective `rpt_go_live_gate_status`.
- Tính `overall_status` theo milestone hiện tại.
- Option `include_history` để load signoff timeline.

---

## 15.10 `POST /api/v1/go-live/check`

### API này để làm gì?
Chạy các auto gates.

### Build như thế nào?
- Validate selected gates đều là AUTO.
- Dùng idempotency window 5 phút.
- Enqueue job hoặc chạy sync nếu số gate ít và logic nhẹ.
- Update effective gate status records.

### Lưu ý
- Không cho sign-off manual trên gate AUTO đang FAIL nếu gate không cho waiver.

---

## 15.11 `POST /api/v1/go-live/{gate_id}/sign-off`

### API này để làm gì?
Manual sign-off hoặc waiver cho gate manual / gate cho phép waiver.

### Build như thế nào?
- Check role authority.
- `status` chỉ PASS/FAIL/WAIVED.
- `waiver_reason` mandatory khi WAIVED.
- Ghi effective status + append history.
- Audit thật sâu vì đây là quyết định cutover.

### Lưu ý bảo mật
- Chỉ role rất hẹp được sign-off.
- Nên support evidence_ref là URL/object path/reference no.

---

## 15.12 `POST /api/v1/reports/export`

### API này để làm gì?
Tạo export job cho mọi report.

### Build như thế nào?
- Validate `report_id`, `export_format`, filters, scope.
- Ước lượng số dòng.
- Nếu PDF > threshold thì reject.
- Tạo `rpt_export_job` rồi enqueue job.
- Trả status `QUEUED` hoặc `COMPLETED` nếu dataset nhỏ và sync path được phép.

### Lưu ý
- User chỉ được download file mình tạo, trừ ADMIN.
- File output phải tiếp tục áp dụng scope filter.

---

## 16. Query path và command path

### 16.1 Query APIs
- Dashboard summary
- Inventory reports
- Billing reports
- Audit reports
- Reconciliation results
- Go-live status/history
- Export job status

**Đặc tính:**
- read-only
- cacheable một phần
- bắt buộc pagination/sort/filter
- scope filtering bắt buộc

### 16.2 Command APIs
- Run reconciliation
- Resolve reconciliation
- Run go-live check
- Sign-off/waive gate
- Create export job
- Retry export job *(nếu có)*

**Đặc tính:**
- side-effect
- audit mandatory
- idempotency mandatory
- thường async qua queue

---

## 17. Reconciliation engine chi tiết

### 17.1 Check catalog khuyến nghị Phase 1

| Check ID | Mục tiêu | Primary Source | Compare With |
|---|---|---|---|
| RECON-001 | OnHand vs InventTrans SUM | on_hand | invent_trans |
| RECON-002 | Billing event completeness | billing_event | source domain events |
| RECON-003 | DN line completeness | debit_note_line | billing_event |
| RECON-004 | Receipt posted qty | receipt_line.received_qty | invent_trans RECEIVE |
| RECON-005 | Shipment posted qty | shipment_line.shipped_qty | invent_trans SHIP |
| RECON-006 | VAS material balance | vas_work_order actuals | invent_trans VAS_* |
| RECON-007 | Work completion vs posting | work_line COMPLETED | downstream posting/audit |
| RECON-008 | Storage snapshot continuity | daily_storage_snapshot | previous closing/current stock |
| RECON-009 | Override audit completeness | override actions | reason code / evidence |

### 17.2 Thiết kế kỹ thuật cho từng check

- Mỗi check có `ReconciliationCheckHandler` riêng.
- Interface gợi ý:
```ts
interface ReconciliationCheckHandler {
  checkId: string;
  estimate(scope: RunScope): Promise<EstimateResult>;
  run(scope: RunScope, ctx: RunContext): AsyncGenerator<ReconciliationFinding>;
}
```
- Dùng streaming/chunk để tránh full memory load cho checks lớn.
- Kết quả persist từng batch để job lớn không mất hết khi fail giữa chừng.

### 17.3 Khi nào nên dùng SQL thuần?
- RECON-001, 004, 005, 008: rất phù hợp với SQL aggregate.
- RECON-007, 009: có thể cần business adapter + audit join.
- RECON-002, 003: cần đọc M10 contract, nên tách repository rõ.

---

## 18. Go-live governance engine chi tiết

### 18.1 Gate matrix kỹ thuật hóa

| Gate | Kiểu | Nguồn check | Ví dụ logic |
|---|---|---|---|
| GL-001 Master Data completeness | AUTO | M2 | thiếu owner/item/location active = FAIL |
| GL-002 RBAC configured | AUTO | M1 | thiếu matrix/scope cho role bắt buộc = FAIL |
| GL-003 Number Sequences active | AUTO | M1 | missing/disabled sequence = FAIL |
| GL-004 Weighbridge connectivity | AUTO | M8 | heartbeat > 5 phút = FAIL hoặc WAIVER |
| GL-005 Reconciliation clean | AUTO | M11 | 3 run gần nhất PASS = PASS |
| GL-006 No open critical exceptions | AUTO | M4/M5/M6/M8/M10/M11 | count critical > 0 = FAIL |
| GL-007 Test evidence uploaded | MANUAL | PM/QA evidence | sign-off manual |
| GL-008 Runbook ready | MANUAL | cutover docs | sign-off manual |
| GL-009 Training & handover done | MANUAL | docs/attendance | sign-off manual |
| GL-010 Rollback plan ready | MANUAL | release package | sign-off manual |

### 18.2 Overall readiness computation

Pseudo logic:
```text
if any required gate status in current milestone = FAIL -> overall = FAIL
else if any required gate status = PENDING -> overall = PENDING
else if any gate = WAIVED -> overall = CONDITIONAL_PASS
else overall = PASS
```

### 18.3 Vì sao cần snapshot_no?
- Trước UAT có thể check nhiều lần.
- Trước cutover có snapshot khác.
- Sau sign-off, cần trace bộ trạng thái nào đã dùng để quyết định go/no-go.

---

## 19. Export engine chi tiết

### 19.1 Trạng thái export
`QUEUED -> RUNNING -> COMPLETED | FAILED | EXPIRED`

### 19.2 Khi nào sync, khi nào async?

**Khuyến nghị Phase 1:**
- CSV <= 5.000 rows: có thể sync nếu infra ổn.
- CSV > 5.000 rows: async job.
- PDF: luôn async để dễ kiểm soát.
- PDF > 10.000 estimated rows: reject.

### 19.3 Build intern-friendly
- Dùng `ReportDataProvider` chung cho screen và export.
- Export worker chỉ đổi `mode=EXPORT` và stream toàn bộ data.
- CSV dùng chunk stream, không `array.join()` toàn bộ trong RAM.
- PDF dùng HTML template nhất quán với header/filter metadata.

### 19.4 Dọn file hết hạn
- Cron job chạy mỗi 1 giờ.
- Update status `EXPIRED`, xóa file object storage nếu policy cho phép.
- Không xóa log job history.

---

## 20. Dashboard & cache strategy

### 20.1 Cache theo widget, không cache toàn hệ thống mù quáng

Cache key gợi ý:
```text
widget:{widget_code}:role:{role}:owner:{owner_scope}:wh:{warehouse_scope_hash}:date:{yyyy-mm-dd}
```

### 20.2 TTL khuyến nghị

| Widget type | TTL |
|---|---|
| Critical ops widgets | 30–60s |
| Billing summary | 5 phút |
| Utilization | 5–15 phút |
| Customer inventory view | 30–60s |

### 20.3 Anti-pattern cần tránh
- Cache raw SQL result vô hạn.
- Không phân biệt scope trong cache key.
- Cache report export file mà không check quyền người tải.

---

## 21. Security và permission design

### 21.1 Authn vs Authz
- Authentication do auth chung xử lý.
- Authorization ở M11 phải reuse Module 1.

### 21.2 Quy tắc bảo mật bắt buộc
1. Backend luôn là lớp enforce cuối cùng.
2. `CUST_VIEWER` chỉ thấy owner scope của mình ở dashboard/report/export.
3. OPS/Manager chỉ thấy warehouse trong scope nếu hệ thống bật warehouse scope.
4. Audit/export/reconciliation/go-live APIs phân quyền riêng, không gom chung “xem report”.
5. Download export file phải re-check permission mỗi lần tải.
6. Evidence link không được expose path nhạy cảm nếu user không đủ quyền.
7. Query APIs phải whitelist sort/filter fields để tránh SQL injection dạng dynamic order/filter.

### 21.3 Permission matrix khuyến nghị tối thiểu

| Action | OPS_SUPER | WH_MANAGER | BILLING_OFC | ADMIN | CUST_VIEWER |
|---|---|---|---|---|---|
| View dashboard | Y | Y | Y(limited) | Y | Y(owner only) |
| View inventory report | Y | Y | R | Y | Y(owner only) |
| View billing report | Y | R | Y | Y | Y(owner only, locked-safe only) |
| View audit report | R | Y(limited) | N | Y | N |
| Run reconciliation | Y | Y(limited) | Y(billing checks) | Y | N |
| Resolve reconciliation | Y | Y(owned checks) | Y(billing checks) | Y | N |
| Run go-live check | Y | N | N | Y | N |
| Sign-off go-live gate | N | N | N | Y / designated roles | N |
| Create export | Y | Y | Y | Y | Y(scope only) |
| Retry failed export/recon | Y | N | N | Y | N |

---

## 22. Non-functional requirements kỹ thuật hóa

| NFR | Thiết kế kỹ thuật |
|---|---|
| Maintainability | Query service + repository + policy layer tách rõ |
| Data integrity | Không sửa source truth; control tables immutable by run/history |
| Traceability | Audit đầy đủ cho export/run/resolve/sign-off |
| Reliability | Idempotency cho POST; jobs retry có kiểm soát |
| Performance | MVs, cache, pagination, async export |
| Scalability | Read model tách biệt, worker jobs, object storage |
| Security | Scope filtering + backend permission guard |
| Operability | Run log, job history, metrics, stale-state fallback |

### Chỉ tiêu nội bộ khuyến nghị
- Dashboard summary: < 1.5s cache hit, < 4s cache miss
- Standard report page 1: < 2s với dataset go-live
- Posting trace detail: < 3s ở happy path
- Create export job: < 500ms
- Reconciliation run accept: < 500ms
- Generate CSV 100k rows: chạy async, hoàn tất trong vài phút tùy hạ tầng

---

## 23. Chiến lược index và partition

### 23.1 Index cho control tables
- `rpt_export_job(job_status, created_at)`
- `rpt_export_job(requested_by, created_at)`
- `rpt_reconciliation_result(check_id, created_at)`
- `rpt_reconciliation_result(is_resolved, severity, created_at)`
- `rpt_go_live_gate_status(snapshot_no, status)`
- `rpt_report_run_log(report_id, created_at)`

### 23.2 Partition khuyến nghị
- `rpt_report_run_log`: monthly partition nếu volume cao.
- `rpt_export_job_event`: monthly partition nếu log event nhiều.
- `rpt_reconciliation_result`: monthly partition hoặc by check family nếu volume mismatch lớn.

### 23.3 Index phụ thuộc source tables
M11 không sở hữu source tables, nhưng team cần đảm bảo:
- `invent_trans(posted_at, trans_type, ref_type, ref_id)`
- `on_hand(owner_id, warehouse_id, item_id, location_id, inventory_status)`
- `billing_event(owner_id, event_date, charge_code, status)`
- `audit_log(entity_type, entity_id, action, created_at)`

---

## 24. Technical recovery & failure handling

### 24.1 Export fail
- Job status -> FAILED
- Ghi failure_reason
- Cho phép retry nếu root cause transient
- Không tạo export_job mới nếu user retry cùng intent quá sớm; có thể reuse hoặc explicit retry endpoint

### 24.2 Reconciliation fail giữa chừng
- Run status -> FAILED hoặc PARTIAL_FAILED nếu muốn mở rộng
- Các results đã persist vẫn giữ lại
- User rerun sau khi fix source/data issue

### 24.3 Dashboard source timeout
- Trả stale widget + timestamp cuối thành công
- Không crash toàn trang
- Log alert nếu stale kéo dài

### 24.4 Go-live sign-off sai actor
- Trả 403
- Audit attempt bị từ chối

### 24.5 Data source thay đổi schema
- Query adapter phải được test contract theo module nguồn
- Hạn chế `SELECT *`
- Ưu tiên view/repository mapper có version-aware fields

---

## 25. Idempotency strategy cho Module 11

### 25.1 API cần idempotency
- `POST /reconciliation/run`
- `POST /reconciliation/{id}/resolve`
- `POST /go-live/check`
- `POST /go-live/{gate_id}/sign-off`
- `POST /reports/export`
- `POST /reports/export/{id}/retry` *(nếu có)*

### 25.2 Idempotency key scope

| API | Scope gợi ý |
|---|---|
| Run reconciliation | user + payload hash + 10 phút |
| Resolve mismatch | result_id + payload hash |
| Run go-live check | user + selected gates + snapshot_no + 5 phút |
| Sign-off gate | gate_id + snapshot_no + payload hash |
| Create export | user + report_id + normalized filters + format |

### 25.3 Lưu ý
- Resolve và sign-off không nên dedupe quá rộng để tránh chặn các lần thao tác hợp lệ khác nhau.
- Export create có thể dedupe để tránh spam job y hệt.

---

## 26. Data contract với module nguồn

### 26.1 Với Module 3
M11 cần các fields ổn định:
- `invent_trans.id`, `trans_type`, `qty`, `invent_dim_id`, `ref_type`, `ref_id`, `posted_at`, `correlation_id`
- `on_hand.qty`, `reserved_qty_*`, dim fields
- `invent_dim.owner_id`, `warehouse_id`, `location_id`, `item_id`, `inventory_status`

### 26.2 Với Module 4/5
- receipt/shipment status
- received/shipped qty
- exception states
- source doc refs

### 26.3 Với Module 7
- work status, assigned_to, started_at, completed_at, work_type, source_ref

### 26.4 Với Module 10
- billing_event, debit_note, storage_snapshot, exception queue

### 26.5 Vì sao cần explicit contract?
M11 là module tổng hợp. Nếu team không chốt contract rõ, report rất dễ vỡ khi source module đổi schema nhỏ.

---

## 27. Migration và seed strategy

### 27.1 Thứ tự migration khuyến nghị
1. `rpt_go_live_gate`
2. `rpt_export_job`
3. `rpt_export_job_event`
4. `rpt_reconciliation_run`
5. `rpt_reconciliation_result`
6. `rpt_reconciliation_resolution`
7. `rpt_go_live_gate_status`
8. `rpt_go_live_signoff_history`
9. `rpt_report_run_log`
10. `rpt_dashboard_cache`
11. materialized views / aggregate tables

### 27.2 Seed khuyến nghị
- Seed gate catalog GL-001..GL-010
- Seed report catalog IDs nếu dùng table cấu hình
- Seed reconciliation check catalog RECON-001..RECON-009

---

## 28. Hướng build database tối ưu để dễ scale về sau

### 28.1 Giai đoạn go-live
- Dùng PostgreSQL làm nguồn chính
- Materialized views cho aggregate quan trọng
- Redis cache cho dashboard/query nóng
- BullMQ cho export/reconciliation/go-live jobs

### 28.2 Giai đoạn scale vừa
- Tách read replica cho report nặng
- Một số report chuyển sang aggregate tables refresh by worker
- Export worker scale ngang theo queue

### 28.3 Giai đoạn scale lớn
- Có thể đẩy sang warehouse/OLAP cho BI/custom analytics
- Nhưng M11 Phase 1 vẫn là control/reporting operational layer, không cần warehouse ngay

### 28.4 Quyết định kiến trúc khuyến nghị
**Go-live nên giữ modular monolith + shared PostgreSQL**, vì:
- dữ liệu đang nằm rải trong cùng hệ thống,
- team dev nhỏ,
- cần tốc độ delivery,
- consistency và traceability quan trọng hơn microservice purity.

---

## 29. UAT / test matrix kỹ thuật tối thiểu

### 29.1 Dashboard
- load dashboard với role khác nhau
- stale widget khi source timeout
- capacity warning 85% / 100%
- `CUST_VIEWER` chỉ thấy owner của mình

### 29.2 Inventory reports
- on-hand summary khớp M3
- movement report filter đúng trans_type/date
- shrinkage/commercial delta đúng logic theo spec
- export CSV giữ nguyên scope filter

### 29.3 Audit trace
- trace từ `trans_id` về source doc đầy đủ
- manual exception có reason code
- audit retention lookup được record cũ

### 29.4 Reconciliation
- run check thành công
- duplicate run key trả job cũ
- fail result không auto-fix
- resolve cần note/evidence đúng rule
- rerun tạo record mới, không mất fail cũ

### 29.5 Go-live control
- auto gates chạy đúng
- manual sign-off không đúng quyền bị 403
- waiver cần waiver_reason
- overall_status tính đúng theo snapshot/milestone

### 29.6 Export
- CSV nhỏ sync/async theo policy
- PDF reject khi estimated rows quá lớn
- file hết hạn không download được
- user khác không tải được file không phải của mình

---

## 30. Backlog kỹ thuật gợi ý cho team dev

### Sprint foundation
1. schema control tables
2. report catalog / gate catalog / reconcile catalog
3. scope guard + filter normalizer
4. dashboard summary API
5. on-hand + movement report APIs

### Sprint control
6. reconciliation run/result/resolve
7. go-live status/check/sign-off
8. export job lifecycle + CSV export
9. audit posting trace API

### Sprint hardening
10. PDF export
11. widget cache + stale fallback
12. performance tuning / indexes / MV refresh jobs
13. security hardening + owner-scope tests
14. UAT fixes + cutover reports

---

## 31. Kết luận kỹ thuật

Module 11 không phải “phần báo cáo cho đẹp”, mà là nơi giúp hệ thống **tin được**, **đối soát được**, và **ra quyết định go-live được**.

Nếu build đúng, Module 11 sẽ giúp đội vận hành và quản trị trả lời được các câu hỏi quan trọng nhất:
- Tồn kho hiện tại có đúng không?
- Sự thay đổi này đến từ chứng từ nào, người nào, lúc nào?
- Billing có đang bám transaction truth không?
- Hệ thống đã đủ sạch để go-live chưa?
- Khi có tranh chấp, có thể truy ngược đầy đủ không?

Nếu build sai, rủi ro lớn nhất là:
- report chậm và không tin cậy,
- reconciliation hình thức nhưng không dùng được,
- go-live check chỉ là checklist tay rời rạc,
- customer viewer nhìn thấy sai scope,
- export nặng làm sập hệ thống.

Khuyến nghị cuối cùng của tech lead:
- Giữ M11 là **read-heavy control module**,
- bám chặt **ownership boundary**,
- dùng **read model có kiểm soát**,
- đẩy workload nặng sang **job + export async**,
- và luôn nhớ: **M11 tổng hợp từ truth, không tạo truth mới**.

