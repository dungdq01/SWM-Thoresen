# TVL SWM — Module 1 Tech Stack & Backend Design
# Foundation & Governance

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops  
**Mục tiêu:** Biến Module 1 spec thành tài liệu kỹ thuật có thể dùng để thiết kế DB, API, backend architecture, security, audit và shared foundation cho các module sau.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 1 — Foundation & Governance Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu:
- Module 1 thực chất phải build những gì.
- Phần nào là runtime feature thật sự phải code.
- Phần nào chỉ là governance/process baseline để không build nhầm.
- Thiết kế database nào là hợp lý nhất cho hiện tại và vẫn scale tốt cho các module sau.
- Backend cần tổ chức ra sao từ DB → repository → service → guard/interceptor → API.
- Từng API dùng để làm gì, trả gì, enforce rule nào, audit ra sao.
- Cách Module 1 ánh xạ sang Inbound, Outbound, Inventory, Billing, Integration.

Tài liệu này lấy **Module 1 spec** làm source chính, đồng thời bám vào các nguyên tắc nền của PRD/Blueprint/Inventory Transaction Spec như: `InventDim → InventTrans → OnHand`, idempotency bắt buộc cho side-effect APIs, audit retention 7 năm, number sequence per warehouse, immutable posted ledger. Module 1 spec là baseline nghiệp vụ trực tiếp cho tài liệu này. 

---

## 2. Baseline kỹ thuật rút ra từ spec

Từ Module 1 spec, có thể rút ra 8 kết luận kỹ thuật quan trọng:

1. **Module 1 là shared control layer**, không phải 1 feature đơn lẻ.
2. **Mọi module downstream đều gọi hoặc phụ thuộc vào Module 1** cho permission, sequence, reason code, audit, idempotency, rule baseline.
3. **Backend là nơi enforce cuối cùng**. UI chỉ là lớp hỗ trợ UX.
4. **DB của Module 1 phải thiết kế theo hướng platform table**, không thiết kế kiểu form-by-form.
5. **Một số sub-module là runtime feature thật**, một số sub-module là process-heavy / not-code.
6. **API của Module 1 chủ yếu là control/config/query APIs**, nhưng ảnh hưởng trực tiếp tới mọi write-flow trọng yếu của toàn hệ thống.
7. **Audit và idempotency không được làm sau**, mà phải nằm trong khung backend từ Sprint 1.
8. **Thiết kế DB của Module 1 phải sẵn sàng tái sử dụng cho Module 2/4/5/6/8**.

---

## 3. Phạm vi build thực tế của Module 1 dưới góc nhìn tech lead

### 3.1 Các phần **phải code** ở Phase 1
1. RBAC & permission runtime enforcement
2. Role / permission / data-scope configuration APIs
3. Number sequence service
4. Reason code catalog service
5. Audit logging infrastructure
6. Exception logging infrastructure
7. Idempotency registry & middleware/service
8. Business rule catalog storage/query
9. Decision log & change control storage/query (có thể không cần UI phức tạp, nhưng nên có API và DB)

### 3.2 Các phần **process-heavy / not-code**
1. Approval governance matrix ở mức chính sách
2. Delivery baseline / source-of-truth / sign-off governance
3. Build-ready / go-live checklist

### 3.3 Diễn giải để dev intern không build nhầm
- **Không build workflow engine approval tổng quát** cho Module 1 ở Phase 1.
- **Không build dashboard compliance riêng** nếu backlog chưa giao.
- **Không build IAM hoàn chỉnh** như Keycloak clone.
- **Không build document management system**.
- **Có build** bảng dữ liệu, API, guard, service và audit trail để các module khác dùng chung.

---

## 4. Khuyến nghị tech stack chính thức cho Module 1

PRD cho phép nhiều lựa chọn, nhưng để tối ưu cho bài toán hiện tại và đội dev nhỏ, tôi khuyến nghị chốt stack như sau:

### 4.1 Backend
- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST trước, event/outbox sau
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma hoặc TypeORM
- **Recommendation cuối:** **Prisma** cho team intern vì schema rõ, migration rõ, type-safe tốt

### 4.2 Database
- **Primary DB:** PostgreSQL
- **Cache / distributed lock / idempotency hot path:** Redis
- **Object storage:** S3-compatible (chưa là trọng tâm của Module 1, nhưng chuẩn bị sẵn cho evidence/document sau này)

### 4.3 Async / background jobs
- **Queue / job runner:** BullMQ trên Redis
- Dùng cho:
  - audit export
  - retention cleanup batch
  - config cache refresh event
  - notify invalidation cho downstream services

### 4.4 Auth / security
- **JWT access token** cho Web/Mobile/API
- **Refresh token** nếu hệ thống auth nội bộ
- **RBAC + data scope** enforce trong backend guard/policy layer
- Nếu sau này có IAM ngoài: Module 1 vẫn giữ **application authorization**, không outsource hết authority cho IAM.

### 4.5 Observability
- **Structured logging:** pino hoặc Winston JSON logger
- **Tracing:** OpenTelemetry (có thể phase sau nhưng nên thiết kế correlation_id ngay từ đầu)
- **Metrics:** Prometheus format nếu có infra hỗ trợ

### 4.6 Testing
- **Unit test:** Vitest hoặc Jest
- **Integration test:** Jest + test database
- **API contract test:** supertest
- **Migration smoke test:** CI step bắt buộc

### 4.7 DevOps
- Dockerized app
- Migration chạy qua CI/CD
- Separate env config: dev / sit / uat / prod
- Secrets tách khỏi source code

### 4.8 Vì sao chọn NestJS + PostgreSQL + Redis
1. Permission, audit, sequence, idempotency đều cần **transaction và locking tốt**.
2. PostgreSQL mạnh ở **transactional consistency, unique constraint, partial index, JSONB, row lock**.
3. Redis phù hợp cho **distributed lock, cache, queue, short-lived idempotency hot lookup**.
4. NestJS hợp với kiến trúc module-based, guard/interceptor/decorator nên rất hợp cho Module 1.
5. Intern dễ đọc cấu trúc thư mục và dependency injection hơn so với framework quá tối giản.

---

## 5. Kiến trúc tổng thể Module 1 trong hệ backend

```text
Client / Web / Mobile / Agent / Integration
            |
            v
        API Gateway / Nest App
            |
  +---------+-------------------------------+
  |         |               |               |
  v         v               v               v
Auth     RBAC Guard   Idempotency Guard  Request Context
  |         |               |               |
  +---------+---------------+---------------+
                            |
                            v
                    Application Services
   +-------------------+--------------------+----------------------+
   |                   |                    |                      |
   v                   v                    v                      v
RBAC Service     Sequence Service     ReasonCode Service   RuleCatalog Service
Audit Service    Exception Service    DecisionLog Service  ChangeControl Service
                            |
                            v
                     Repository Layer
                            |
                            v
              PostgreSQL + Redis + Outbox/Queue
```

### 5.1 Tư tưởng tổ chức
- **Guard layer**: chặn sớm auth/rbac/idempotency cơ bản
- **Service layer**: xử lý business logic của control layer
- **Repository layer**: chỉ truy cập DB, không chứa business rule
- **Audit**: không nằm rải rác trong controller; nên dùng service/interceptor/helper thống nhất
- **Idempotency**: không nhét thủ công từng nơi, phải có shared contract

---

## 6. Phân ranh runtime ownership giữa Module 1 và các module khác

| Concern | Module 1 sở hữu | Module khác sở hữu |
|---|---|---|
| Role / permission definition | Có | Không |
| Kiểm tra user có quyền action không | Có | Gọi Module 1 policy / shared lib |
| Number sequence rules | Có | Chỉ consume |
| Sinh mã chứng từ | Shared service của Module 1 | Module nghiệp vụ gọi |
| Reason code catalog | Có | Chỉ consume |
| Audit framework | Có | Module nghiệp vụ cung cấp event payload |
| Exception log format | Có | Module nghiệp vụ trigger |
| Idempotency policy framework | Có | Module nghiệp vụ đăng ký key-strategy |
| Inventory posting rules | Không | Inventory / Inbound / Outbound |
| Billing formula | Không | Billing |
| Master data entity ownership | Không | Module 2 |
| Source-of-truth conflict resolution | Có | Các module phải bám theo |

---

## 7. Đề xuất cấu trúc backend code cho Module 1

```text
src/
  app.module.ts
  common/
    constants/
    enums/
    errors/
    decorators/
    interceptors/
    guards/
    pipes/
    utils/
    context/
  infrastructure/
    prisma/
    redis/
    queue/
    logger/
    config/
  modules/
    foundation/
      foundation.module.ts
      controllers/
        role.controller.ts
        permission.controller.ts
        reason-code.controller.ts
        sequence.controller.ts
        audit.controller.ts
        rule-catalog.controller.ts
        decision-log.controller.ts
        idempotency.controller.ts
      services/
        role.service.ts
        permission.service.ts
        authorization.service.ts
        reason-code.service.ts
        sequence.service.ts
        audit.service.ts
        exception-log.service.ts
        rule-catalog.service.ts
        decision-log.service.ts
        change-control.service.ts
        idempotency.service.ts
        policy-evaluator.service.ts
      repositories/
        role.repository.ts
        permission.repository.ts
        sequence.repository.ts
        reason-code.repository.ts
        audit.repository.ts
        rule.repository.ts
        decision-log.repository.ts
        idempotency.repository.ts
      dto/
      entities/
      mappers/
      policies/
      listeners/
      jobs/
```

### 7.1 Quy tắc bắt buộc cho code structure
- Controller chỉ nhận request/response, không chứa business logic nặng.
- Service chứa rule xử lý.
- Repository chỉ CRUD/query.
- DTO tách riêng cho create/update/query/response.
- Shared enums đưa vào `common/enums` nếu dùng xuyên module.
- `authorization.service.ts` là lớp dùng chung cho Module 4/5/6/8.

---

## 8. Thiết kế database tổng thể cho Module 1

## 8.1 Nguyên tắc DB design
1. Thiết kế **normalized ở lớp cấu hình**, không hard-code list trong app.
2. Dùng **surrogate key + business code** song song.
3. Tách **master config** và **event log**.
4. Mọi bảng config cần `is_active`, `created_at`, `updated_at`, `created_by`, `updated_by`.
5. Mọi bảng log cần `occurred_at`, `correlation_id`, `actor_*`, `source_*`.
6. Chuẩn bị sẵn cho multi-warehouse và scale dữ liệu lớn.
7. Dùng **partial unique index** và **row locking** thay vì cố giải bằng code thuần.

---

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Authorization / RBAC
- `app_user`
- `role`
- `permission`
- `role_permission`
- `user_role`
- `role_scope_rule`
- `permission_action`

### 8.2.2 Governance master/config
- `reason_code`
- `number_sequence`
- `number_sequence_counter`
- `business_rule_catalog`
- `decision_log`
- `change_control_record`
- `approval_policy` *(nếu muốn lưu policy có cấu hình, không bắt buộc full workflow)*

### 8.2.3 Runtime safety / logs
- `audit_log`
- `exception_log`
- `idempotency_record`
- `api_request_log` *(optional, chỉ nếu muốn điều tra sâu hơn audit)*
- `outbox_event` *(khuyến nghị sẵn cho scale sau)*

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `role`
Mục đích: lưu danh mục vai trò chuẩn go-live và phase sau.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | surrogate key |
| role_code | VARCHAR(50) | UNIQUE NOT NULL | ADMIN, WH_MANAGER... |
| role_name | VARCHAR(150) | NOT NULL | tên hiển thị |
| description | TEXT | NULL | mô tả |
| is_system_role | BOOLEAN | NOT NULL DEFAULT false | role nền |
| is_active | BOOLEAN | NOT NULL DEFAULT true | còn dùng hay không |
| effective_from | TIMESTAMP | NULL | optional |
| effective_to | TIMESTAMP | NULL | optional |
| created_at | TIMESTAMP | NOT NULL | audit meta |
| created_by | UUID | NULL | app_user |
| updated_at | TIMESTAMP | NOT NULL | audit meta |
| updated_by | UUID | NULL | app_user |

**Index:** unique(`role_code`)

---

### 8.3.2 `permission`
Mục đích: chuẩn hóa resource + action thay vì tạo 1 chuỗi quyền rời rạc khó quản lý.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| permission_code | VARCHAR(120) | UNIQUE NOT NULL | ví dụ `receipt.post`, `shipment.force_approve` |
| module_code | VARCHAR(50) | NOT NULL | FOUNDATION, INBOUND... |
| resource_code | VARCHAR(50) | NOT NULL | RECEIPT, SHIPMENT, ROLE... |
| action_code | VARCHAR(50) | NOT NULL | VIEW, CREATE, UPDATE, POST... |
| description | TEXT | NULL | |
| is_sensitive | BOOLEAN | NOT NULL DEFAULT false | action nhạy cảm |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index:** unique(`module_code`,`resource_code`,`action_code`)

---

### 8.3.3 `role_permission`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| role_id | UUID | FK NOT NULL | → role |
| permission_id | UUID | FK NOT NULL | → permission |
| effect | VARCHAR(10) | NOT NULL DEFAULT 'ALLOW' | future-proof deny override |
| scope_type | VARCHAR(30) | NULL | ALL / OWNER / WAREHOUSE |
| scope_value | VARCHAR(100) | NULL | optional |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

**Unique:** (`role_id`,`permission_id`)

---

### 8.3.4 `user_role`
Mục đích: gán role cho user. Không gắn role trực tiếp vào user table để hỗ trợ 1 user nhiều role.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK NOT NULL |
| role_id | UUID | FK NOT NULL |
| warehouse_code | VARCHAR(50) | NULL |
| owner_id | VARCHAR(50) | NULL |
| is_primary | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |
| assigned_at | TIMESTAMP | NOT NULL |
| assigned_by | UUID | NULL |
| revoked_at | TIMESTAMP | NULL |
| revoked_by | UUID | NULL |

**Unique partial:** (`user_id`,`role_id`,`warehouse_code`,`owner_id`) WHERE is_active = true

---

### 8.3.5 `reason_code`
Mục đích: dùng chung cho mọi action nhạy cảm toàn hệ thống.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| code | VARCHAR(50) | UNIQUE NOT NULL | DAMAGED... |
| description | VARCHAR(255) | NOT NULL | |
| category | VARCHAR(50) | NOT NULL | MANUAL_WEIGHT, CANCEL... |
| domain_code | VARCHAR(50) | NOT NULL | FOUNDATION / INBOUND / OUTBOUND / INVENTORY |
| requires_approval | BOOLEAN | NOT NULL DEFAULT false | |
| affects_billing | BOOLEAN | NOT NULL DEFAULT false | |
| requires_note | BOOLEAN | NOT NULL DEFAULT false | |
| sort_order | INT | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| effective_from | TIMESTAMP | NULL | |
| effective_to | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index:** (`domain_code`,`category`,`is_active`)

---

### 8.3.6 `number_sequence`
Mục đích: định nghĩa rule sinh mã, không lưu counter trực tiếp trong cùng bảng để tránh lock contention quá lớn.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| sequence_code | VARCHAR(30) | UNIQUE NOT NULL | RCV, SHP, WRK, TRX, DN |
| description | VARCHAR(255) | NULL | |
| scope_type | VARCHAR(30) | NOT NULL | PER_WAREHOUSE |
| reset_policy | VARCHAR(30) | NOT NULL | DAILY |
| prefix_template | VARCHAR(100) | NOT NULL | ví dụ `{SEQ}` code dùng `sequence_code` |
| format_template | VARCHAR(150) | NOT NULL | `{prefix}-{yyyymmdd}-{running_no}` |
| running_no_length | SMALLINT | NOT NULL DEFAULT 6 | |
| allow_gap | BOOLEAN | NOT NULL DEFAULT true | pending final policy |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

---

### 8.3.7 `number_sequence_counter`
Đây là bảng nóng dùng để cấp số an toàn.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| sequence_id | UUID | FK NOT NULL | → number_sequence |
| scope_key | VARCHAR(100) | NOT NULL | ví dụ `WH5.1` |
| counter_date | DATE | NOT NULL | reset theo ngày |
| last_number | BIGINT | NOT NULL DEFAULT 0 | |
| version_no | BIGINT | NOT NULL DEFAULT 0 | optional optimistic lock |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique:** (`sequence_id`,`scope_key`,`counter_date`)

**Lý do tách bảng:** giảm lock contention và dễ partition / archive hơn.

---

### 8.3.8 `business_rule_catalog`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| rule_code | VARCHAR(50) | UNIQUE NOT NULL | FG-BR-001... |
| domain | VARCHAR(50) | NOT NULL | FOUNDATION/INBOUND... |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | NOT NULL | |
| current_status | VARCHAR(20) | NOT NULL | CONFIRMED / TO-CONFIRM / PHASE_2 |
| source_of_truth | VARCHAR(255) | NOT NULL | document/source |
| brd_reference | VARCHAR(255) | NULL | |
| supersedes | VARCHAR(255) | NULL | |
| effective_phase | VARCHAR(30) | NOT NULL | GO_LIVE / PHASE_2 |
| owner_role | VARCHAR(50) | NULL | BA / PO / LEAD |
| last_reviewed_at | TIMESTAMP | NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Index:** (`domain`,`current_status`)

---

### 8.3.9 `decision_log`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| decision_no | VARCHAR(50) | UNIQUE NOT NULL | DEC-20260308-001 |
| title | VARCHAR(255) | NOT NULL | |
| decision_type | VARCHAR(50) | NOT NULL | RULE_CONFLICT / SCOPE / DATA / API |
| context_domain | VARCHAR(50) | NOT NULL | FOUNDATION / INBOUND... |
| summary | TEXT | NOT NULL | |
| decided_value | TEXT | NOT NULL | kết luận cuối |
| rationale | TEXT | NULL | lý do |
| status | VARCHAR(20) | NOT NULL | DRAFT / CONFIRMED / SUPERSEDED |
| source_refs | JSONB | NULL | danh sách doc refs |
| impacted_modules | JSONB | NULL | ["M1","M4"] |
| effective_from | TIMESTAMP | NULL | |
| decided_by | UUID | NULL | |
| decided_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

### 8.3.10 `change_control_record`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| change_no | VARCHAR(50) | UNIQUE NOT NULL |
| change_type | VARCHAR(30) | NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NOT NULL |
| requested_by | UUID | NULL |
| priority | VARCHAR(10) | NOT NULL |
| impact_summary | TEXT | NULL |
| impacted_modules | JSONB | NULL |
| status | VARCHAR(20) | NOT NULL |
| target_release | VARCHAR(30) | NULL |
| approved_by | UUID | NULL |
| approved_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

### 8.3.11 `audit_log`
Thiết kế bám theo spec hiện tại với 15 fields tối thiểu, nhưng mở rộng thêm để production-ready hơn.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| entity_type | VARCHAR(50) | NOT NULL | RECEIPT, SHIPMENT... |
| entity_id | VARCHAR(100) | NOT NULL | id business |
| action | VARCHAR(50) | NOT NULL | CREATE/UPDATE/POST... |
| field_name | VARCHAR(100) | NULL | field-level nếu có |
| old_value | TEXT | NULL | |
| new_value | TEXT | NULL | |
| user_id | UUID | NULL | null nếu SYSTEM |
| user_role | VARCHAR(50) | NULL | role tại thời điểm action |
| ip_address | VARCHAR(64) | NULL | |
| device_type | VARCHAR(20) | NULL | WEB/MOBILE/API/SYSTEM |
| occurred_at | TIMESTAMP | NOT NULL | |
| reason_code | VARCHAR(50) | NULL | |
| notes | TEXT | NULL | |
| correlation_id | VARCHAR(100) | NULL | trace xuyên flow |
| request_id | VARCHAR(100) | NULL | bổ sung hữu ích |
| source_module | VARCHAR(50) | NULL | FOUNDATION/INBOUND... |
| warehouse_code | VARCHAR(50) | NULL | filter nhanh |
| owner_id | VARCHAR(50) | NULL | filter nhanh |
| metadata | JSONB | NULL | optional detail |

**Index khuyến nghị:**
- (`entity_type`,`entity_id`,`occurred_at` DESC)
- (`user_id`,`occurred_at` DESC)
- (`correlation_id`)
- (`source_module`,`occurred_at` DESC)
- BRIN/partition theo `occurred_at` nếu volume lớn

**Scale note:** `audit_log` nên partition theo tháng khi volume tăng.

---

### 8.3.12 `exception_log`
Khác với audit log: exception log tập trung vào case lỗi/ngăn chặn/ngoại lệ nghiệp vụ.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| exception_no | VARCHAR(50) | UNIQUE NOT NULL |
| exception_type | VARCHAR(50) | NOT NULL |
| severity | VARCHAR(20) | NOT NULL |
| source_module | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(50) | NULL |
| entity_id | VARCHAR(100) | NULL |
| action | VARCHAR(50) | NULL |
| reason_code | VARCHAR(50) | NULL |
| message | TEXT | NOT NULL |
| details | JSONB | NULL |
| correlation_id | VARCHAR(100) | NULL |
| external_id | VARCHAR(100) | NULL |
| user_id | UUID | NULL |
| user_role | VARCHAR(50) | NULL |
| occurred_at | TIMESTAMP | NOT NULL |
| is_resolved | BOOLEAN | NOT NULL DEFAULT false |
| resolved_at | TIMESTAMP | NULL |
| resolved_by | UUID | NULL |

---

### 8.3.13 `idempotency_record`
Bảng này rất quan trọng, dùng cho mọi command có side effect.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| idempotency_key | VARCHAR(120) | UNIQUE NOT NULL | thường lấy từ external_id |
| command_name | VARCHAR(100) | NOT NULL | post_receipt, reverse_trans... |
| source_module | VARCHAR(50) | NOT NULL | INBOUND, OUTBOUND... |
| request_hash | VARCHAR(128) | NULL | hash payload để detect same key-different payload |
| request_payload | JSONB | NULL | optional, cẩn thận PII |
| response_code | INT | NULL | |
| response_body | JSONB | NULL | có thể lưu summary |
| resource_type | VARCHAR(50) | NULL | RECEIPT/TRANS... |
| resource_id | VARCHAR(100) | NULL | id tạo ra |
| status | VARCHAR(20) | NOT NULL | PROCESSING / SUCCEEDED / FAILED |
| locked_until | TIMESTAMP | NULL | tránh race |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| expired_at | TIMESTAMP | NULL | retention policy |
| correlation_id | VARCHAR(100) | NULL | |

**Index:** (`command_name`,`source_module`), (`expired_at`)

**Lưu ý quan trọng:** `idempotency_key` nên unique toàn cục nếu client đảm bảo uniqueness. Nếu không, unique theo (`source_module`,`command_name`,`idempotency_key`).

---

### 8.3.14 `outbox_event` (khuyến nghị sẵn)
Giúp scale sau này khi Module 4/5/6/8 cần consume config changes hoặc audit streams.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| event_type | VARCHAR(100) | NOT NULL |
| aggregate_type | VARCHAR(50) | NOT NULL |
| aggregate_id | VARCHAR(100) | NOT NULL |
| payload | JSONB | NOT NULL |
| status | VARCHAR(20) | NOT NULL DEFAULT 'PENDING' |
| retry_count | INT | NOT NULL DEFAULT 0 |
| next_retry_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| processed_at | TIMESTAMP | NULL |

---

## 8.4 Quan hệ dữ liệu tổng quát

```text
app_user ---< user_role >--- role ---< role_permission >--- permission

reason_code ---- used by ---- audit_log / exception_log / downstream transactions

number_sequence ---< number_sequence_counter

business_rule_catalog ---< decision_log
business_rule_catalog ---< change_control_record (logical)

audit_log  -- polymorphic --> entity_type + entity_id
exception_log -- polymorphic --> entity_type + entity_id
idempotency_record --> resource_type + resource_id
```

---

## 8.5 Thiết kế DB để scale về sau

### 8.5.1 Phần config/master
Các bảng `role`, `permission`, `reason_code`, `number_sequence`, `business_rule_catalog` sẽ không quá lớn. Tập trung vào:
- unique index đúng
- cache đúng
- invalidation đúng

### 8.5.2 Phần log/event
Các bảng có nguy cơ lớn nhanh:
- `audit_log`
- `exception_log`
- `idempotency_record`
- `outbox_event`

Khuyến nghị:
- partition `audit_log` theo tháng hoặc quý
- retention cleanup cho `idempotency_record`
- archive `exception_log` cũ
- `response_body` trong `idempotency_record` chỉ lưu summary, không lưu blob lớn

### 8.5.3 Không nên làm gì
- Không lưu audit kiểu 1 cột JSON duy nhất cho mọi thứ
- Không nhét counter vào `number_sequence` rồi update trực tiếp toàn bộ row config
- Không dùng random application-level check thay cho unique index
- Không hard-code reason codes trong enum frontend rồi bỏ DB

---

## 9. Database flow từ DB → backend cho từng nhóm năng lực

## 9.1 RBAC flow
```text
user request
 -> JWT decoded
 -> load user roles
 -> resolve permissions
 -> evaluate data scope
 -> allow/deny
 -> nếu deny action nhạy cảm thì ghi audit/exception
```

### Thành phần backend
- `AuthGuard`
- `PermissionGuard`
- `DataScopeGuard` hoặc `PolicyEvaluatorService`
- `AuthorizationService`
- Redis cache cho permission snapshot nếu cần

### DB tables tham gia
- `app_user`
- `user_role`
- `role`
- `role_permission`
- `permission`

---

## 9.2 Number sequence flow
```text
business module requests next reference
 -> SequenceService.validate(sequence_code, warehouse_code)
 -> begin transaction
 -> SELECT counter row FOR UPDATE
 -> increment last_number
 -> format reference
 -> persist updated counter
 -> return reference
 -> business module continue create/post
```

### Điểm kỹ thuật quan trọng
- `SELECT ... FOR UPDATE` hoặc upsert lock row
- sequence generation chỉ commit cùng transaction cấp số hoặc dùng transaction riêng với rule rõ ràng
- phải quyết định chính sách gap khi downstream fail

---

## 9.3 Reason code flow
```text
client opens action form
 -> query active reason codes by domain/category
 -> user submits action with reason_code
 -> backend validate reason exists + active + compatible with action
 -> continue action
 -> write audit_log / exception_log with reason_code
```

---

## 9.4 Audit flow
```text
request enters controller
 -> business action executed
 -> AuditService.collect context + delta + reason + actor
 -> insert audit_log
 -> optional emit outbox event / queue reporting
```

### Kinh nghiệm thực chiến
- Không phụ thuộc frontend gửi đầy đủ audit fields.
- `user_id`, `role`, `ip`, `device_type`, `correlation_id` phải lấy từ request context/backend.
- `old_value/new_value` nên log có chọn lọc cho action config hoặc exception, không phải mọi field mọi lúc nếu quá tốn.

---

## 9.5 Idempotency flow
```text
request with external_id/idempotency_key
 -> hash request payload
 -> IdempotencyService.acquire(key, command)
   -> if existing SUCCEEDED and same hash => return cached result
   -> if PROCESSING => reject/409 or wait according to policy
   -> if existing different hash => reject conflict
   -> else create PROCESSING record
 -> execute business action
 -> store result resource_id/response summary
 -> mark SUCCEEDED
 -> return response
```

### Quy tắc quan trọng
- `same key + different payload` phải là conflict, không silently reuse.
- `PROCESSING` stale lock phải có timeout/cleanup.
- Redis có thể dùng để giảm contention, nhưng **PostgreSQL vẫn là source of truth**.

---

## 10. Thiết kế API chi tiết cho Module 1

Nguyên tắc API:
- Chia thành **query APIs** và **command APIs**.
- Các API thay đổi cấu hình phải audit mạnh.
- API nào có side effect phải hỗ trợ idempotency nếu có nguy cơ retry từ client/integration.
- REST path phải rõ domain, không generic quá mức.

---

## 10.1 Nhóm API RBAC

### 10.1.1 `GET /api/v1/foundation/roles`
**Mục đích:** Lấy danh sách role.

**Dùng khi nào:** màn hình admin, preload permission matrix, dropdown assign role.

**Query params:**
- `is_active`
- `role_code`
- `page`
- `page_size`

**Response:** danh sách role + metadata.

**Build note:**
- query API, không cần idempotency
- cache được
- chỉ `ADMIN` hoặc role được phân quyền quản trị mới xem full

---

### 10.1.2 `POST /api/v1/foundation/roles`
**Mục đích:** Tạo role mới.

**Body ví dụ:**
```json
{
  "role_code": "YARD_SUPERVISOR",
  "role_name": "Yard Supervisor",
  "description": "Giám sát bãi"
}
```

**API này để làm gì:** mở rộng role khi go-live hoặc phase sau.

**Hướng build:**
- validate `role_code` unique
- insert `role`
- ghi `audit_log` action=`CREATE_ROLE`
- tạo `decision_log` là optional, không bắt buộc cho config nhỏ

**Lưu ý:** Nếu Phase 1 chưa cho phép tạo role động thì API này có thể internal-only/admin-only.

---

### 10.1.3 `PUT /api/v1/foundation/roles/:id`
**Mục đích:** Cập nhật role metadata, không phải để sửa permission trực tiếp.

**Build note:**
- không cho sửa `role_code` tùy tiện nếu đã dùng production
- audit before/after

---

### 10.1.4 `POST /api/v1/foundation/roles/:id/permissions`
**Mục đích:** Gán/thu hồi permission cho role.

**Body ví dụ:**
```json
{
  "changes": [
    {"permission_code": "shipment.force_approve", "effect": "ALLOW"},
    {"permission_code": "inventory.adjust", "effect": "ALLOW"}
  ]
}
```

**API này để làm gì:** update permission matrix.

**Hướng build:**
- load role
- resolve permission ids
- upsert `role_permission`
- clear permission cache của role
- audit before/after theo diff
- ghi exception nếu có attempt assign permission inactive

**Rule enforce:** action nhạy cảm, admin-only.

---

### 10.1.5 `GET /api/v1/foundation/permissions`
**Mục đích:** Lấy catalog permissions.

**Build note:**
- dùng để render permission matrix
- nên trả theo module/resource/action group

---

### 10.1.6 `POST /api/v1/foundation/users/:userId/roles`
**Mục đích:** Gán role cho user.

**Body ví dụ:**
```json
{
  "role_code": "WH_MANAGER",
  "warehouse_code": "WH5.1",
  "owner_id": null,
  "is_primary": true
}
```

**API này để làm gì:** provisioning quyền vận hành thực tế.

**Hướng build:**
- validate user tồn tại
- validate role active
- insert `user_role`
- optional revoke previous primary role cùng scope
- audit action=`ASSIGN_ROLE`

---

### 10.1.7 `GET /api/v1/foundation/me/permissions`
**Mục đích:** Trả effective permissions của user hiện tại.

**API này để làm gì:** frontend bootstrap nhanh, ẩn/hiện action đúng.

**Build note:**
- backend vẫn phải enforce riêng, API này chỉ phục vụ UI/UX
- có thể cache ngắn 1–5 phút hoặc theo token claims version

---

## 10.2 Nhóm API Reason Code

### 10.2.1 `GET /api/v1/foundation/reason-codes`
**Mục đích:** Lấy reason codes active theo domain/category.

**Query params:** `domain_code`, `category`, `is_active`

**API này để làm gì:** populate dropdown cho manual weight, cancel, reverse, adjustment...

**Hướng build:**
- query nhanh theo index
- cache được
- không trả reason inactive nếu không có quyền admin

---

### 10.2.2 `POST /api/v1/foundation/reason-codes`
**Mục đích:** Tạo reason code mới.

**Build note:**
- validate `code` unique
- validate `category/domain_code`
- audit before/after
- update cache invalidation

---

### 10.2.3 `PUT /api/v1/foundation/reason-codes/:id`
**Mục đích:** Sửa metadata reason code.

**Rule:** không cho sửa `code` tùy tiện sau go-live; prefer deactivate + create new.

---

### 10.2.4 `POST /api/v1/foundation/reason-codes/:id/deactivate`
**Mục đích:** Soft deactivate reason code.

**API này để làm gì:** tránh xóa dữ liệu được tham chiếu lịch sử.

**Hướng build:**
- set `is_active=false`
- nếu đang được dùng ở config/downstream, vẫn cho deactivate nhưng không cho transaction mới chọn
- audit bắt buộc

---

## 10.3 Nhóm API Number Sequence

### 10.3.1 `GET /api/v1/foundation/number-sequences`
**Mục đích:** Xem cấu hình sequence.

---

### 10.3.2 `POST /api/v1/foundation/number-sequences`
**Mục đích:** Tạo định nghĩa sequence mới.

**API này để làm gì:** thêm `TRF`, `ADJ` hoặc object mới phase sau.

**Build note:**
- validate `sequence_code` unique
- không tạo counter row ở đây; counter row sinh lazy khi generate lần đầu

---

### 10.3.3 `PUT /api/v1/foundation/number-sequences/:id`
**Mục đích:** Cập nhật format/reset policy/activation.

**Rủi ro:** đổi format ảnh hưởng document references downstream. Chỉ admin và phải audit cực mạnh.

---

### 10.3.4 `POST /api/v1/foundation/number-sequences/:code/next`
**Mục đích:** Cấp số tiếp theo.

**Body ví dụ:**
```json
{
  "warehouse_code": "WH5.1",
  "business_date": "2026-03-08"
}
```

**API này để làm gì:** module nghiệp vụ gọi để lấy mã `RCV/SHP/WRK/TRX/DN...`

**Hướng build:**
- service nội bộ nên gọi function này, không khuyến khích frontend gọi trực tiếp
- dùng transaction + row lock trên `number_sequence_counter`
- response gồm `reference_no`, `sequence_code`, `scope_key`, `counter_date`, `running_no`

**Lưu ý thiết kế:**
- Nếu dùng architecture monolith modular, business module có thể inject `SequenceService` trực tiếp, không cần public API nội bộ.
- External API chỉ cần nếu tách service hoặc integration.

---

## 10.4 Nhóm API Business Rule Catalog

### 10.4.1 `GET /api/v1/foundation/rules`
**Mục đích:** Lấy rule catalog theo domain/status.

**API này để làm gì:** BA/QA/Dev cross-check baseline, UI admin/governance.

---

### 10.4.2 `POST /api/v1/foundation/rules`
**Mục đích:** Tạo rule catalog record.

**Build note:**
- thực tế có thể chỉ admin/BA role dùng
- nên hỗ trợ `brd_reference`, `source_of_truth`, `supersedes`

---

### 10.4.3 `PUT /api/v1/foundation/rules/:id`
**Mục đích:** Cập nhật status / source of truth / superseded.

**API này để làm gì:** xử lý conflict tài liệu cũ-mới.

**Hướng build:**
- audit before/after
- nếu đổi `current_status`, nên ghi `decision_log` linked

---

## 10.5 Nhóm API Decision Log / Change Control

### 10.5.1 `GET /api/v1/foundation/decision-logs`
**Mục đích:** Truy vấn lịch sử quyết định baseline.

---

### 10.5.2 `POST /api/v1/foundation/decision-logs`
**Mục đích:** Ghi quyết định mới cho conflict/scope/rule.

**Body ví dụ:**
```json
{
  "title": "Inbound tolerance fail handling",
  "decision_type": "RULE_CONFLICT",
  "context_domain": "INBOUND",
  "summary": "Rule cũ dùng pending approval, rule mới dùng rejected + re-weigh",
  "decided_value": "Go-live dùng REJECTED + RE-WEIGH, không dùng inbound approval",
  "status": "CONFIRMED",
  "source_refs": ["PRD v4.0", "Blueprint v1"],
  "impacted_modules": ["M1", "M4", "M8"]
}
```

**API này để làm gì:** tạo source-of-truth rõ ràng giữa BA/Dev/QA.

---

### 10.5.3 `POST /api/v1/foundation/change-controls`
**Mục đích:** Tạo change request/control record.

**API này để làm gì:** quản trị thay đổi logic hoặc scope có tác động nhiều module.

---

## 10.6 Nhóm API Audit / Exception

### 10.6.1 `GET /api/v1/foundation/audit-logs`
**Mục đích:** Truy vấn audit theo entity/user/correlation/time.

**Query params:**
- `entity_type`
- `entity_id`
- `user_id`
- `correlation_id`
- `from`
- `to`
- `source_module`

**Build note:**
- chỉ role có quyền điều tra/audit mới xem full
- bắt buộc pagination
- không cho export toàn bộ không giới hạn

---

### 10.6.2 `GET /api/v1/foundation/exception-logs`
**Mục đích:** Truy vấn danh sách ngoại lệ/ngăn chặn/duplicate/reverse fail...

---

### 10.6.3 `POST /api/v1/foundation/exception-logs/:id/resolve`
**Mục đích:** Đánh dấu ngoại lệ đã được xử lý.

**API này để làm gì:** vận hành support/compliance.

---

## 10.7 Nhóm API Idempotency

### 10.7.1 `POST /api/v1/foundation/idempotency/validate`
**Mục đích:** kiểm tra key trước khi downstream action chạy.

**Khuyến nghị:** API public này không thật sự cần trong monolith; nên dùng **internal service** hơn.

---

### 10.7.2 `GET /api/v1/foundation/idempotency/:key`
**Mục đích:** tra cứu trạng thái key để support/debug.

---

## 10.8 Internal shared service APIs quan trọng hơn public REST

Trong monolith modular, nhiều năng lực của Module 1 nên được expose dưới dạng service nội bộ:
- `AuthorizationService.assertCan(user, action, context)`
- `SequenceService.next(sequenceCode, warehouseCode, businessDate)`
- `ReasonCodeService.assertValid(code, action, domain)`
- `AuditService.write(entry)`
- `ExceptionLogService.write(entry)`
- `IdempotencyService.run(commandName, key, payload, handler)`
- `RuleCatalogService.get(ruleCode)`

Đây mới là cách tối ưu để Module 4/5/6/8 dùng lại.

---

## 11. Hướng build chi tiết từng năng lực backend

## 11.1 Authorization / RBAC

### Build step
1. Seed role baseline
2. Seed permission catalog
3. Seed role_permission baseline
4. Tạo JWT auth integration
5. Tạo `@RequirePermission()` decorator
6. Tạo `PermissionGuard`
7. Tạo `PolicyEvaluatorService` cho owner scope / warehouse scope
8. Tạo API admin quản trị role/permission/user-role
9. Tạo `GET /me/permissions`

### Gợi ý implement
```ts
@RequirePermission('shipment.force_approve')
@Post(':id/force-approve')
forceApprove(...) {}
```

`PermissionGuard`:
- đọc permission code từ decorator
- resolve user roles từ token/db/cache
- đánh giá permission + scope
- deny thì ném `ForbiddenException`
- nếu sensitive action deny thì ghi `exception_log`

---

## 11.2 Sequence service

### Build step
1. Seed `number_sequence`
2. Tạo repository cho counter row
3. Tạo DB transaction dùng `SELECT FOR UPDATE`
4. Format reference theo template
5. Viết test concurrent 20–100 requests

### Pseudo flow
```ts
await prisma.$transaction(async (tx) => {
  const seq = await tx.numberSequence.findUnique(...)
  const counter = await tx.$queryRaw`SELECT ... FOR UPDATE`
  const next = counter.last_number + 1
  await tx.numberSequenceCounter.update(...)
  return formatReference(seq, next, date)
})
```

### Pitfall
- Không generate số ở app memory.
- Không đọc rồi update không lock.
- Không tái sử dụng reference nếu command cũ đã commit.

---

## 11.3 Reason code service

### Build step
1. Seed minimum go-live reason code set
2. Tạo query API active by domain/category
3. Tạo validator `assertReasonRequired`
4. Tạo validator `assertReasonCompatible`

### Rule kỹ thuật nên có
- map action → allowed categories
- `OTHER` phải có `note`
- inactive reason code reject cho transaction mới

---

## 11.4 Audit framework

### Build step
1. Tạo request context chứa `user_id`, `role`, `ip`, `device_type`, `correlation_id`
2. Tạo `AuditService`
3. Tạo helper ghi audit theo standardized DTO
4. Chèn hook tại config update / sensitive command / reverse / lock / manual actions
5. Tạo query API có pagination + filters

### Mẫu DTO
```ts
{
  entityType: 'ROLE',
  entityId: 'uuid',
  action: 'UPDATE',
  fieldName: 'is_active',
  oldValue: 'true',
  newValue: 'false',
  reasonCode: 'OTHER',
  notes: 'requested by admin',
  sourceModule: 'FOUNDATION'
}
```

---

## 11.5 Idempotency framework

### Build step
1. Chốt header hoặc field nhận key: `X-Idempotency-Key` hoặc body `external_id`
2. Tạo `IdempotencyService`
3. Tạo helper wrapper `runIdempotent()`
4. Lưu `PROCESSING` trước khi execute
5. Execute handler
6. Lưu result summary + `resource_id`
7. Retry return result cũ nếu cùng key/hàng đợi an toàn

### Khi nào áp dụng
- post receipt
- post shipment
- reverse inventory trans
- lock debit note
- các create command có nguy cơ retry từ mobile/agent/integration

### Không cần cho
- query GET
- search/filter/list
- config read APIs

---

## 12. Mapping Module 1 sang các module sau

## 12.1 Module 2 — Master Data
Module 2 dùng Module 1 để:
- phân quyền ai tạo/sửa master data
- reason code cho deactivate / status change nếu policy yêu cầu
- audit cho cập nhật owner/product/location/status
- sequence nếu có mã master sinh hệ thống
- rule catalog để biết field nào go-live / phase 2

**Điểm tích hợp kỹ thuật:**
- `AuthorizationService`
- `AuditService`
- `RuleCatalogService`

---

## 12.2 Module 4 — Inbound
Module 4 dùng Module 1 để:
- phân quyền tạo receipt, weigh-in/out, cancel, manual weight
- validate reason code cho cancel/manual exception
- sinh `RCV` number
- audit các action nhạy cảm
- idempotency cho post receipt / weighbridge resend
- decision/rule catalog để bám baseline `REJECTED + RE-WEIGH`

**Điểm tích hợp kỹ thuật:**
- `SequenceService.next('RCV', warehouse)`
- `ReasonCodeService.assertValid(...)
- `IdempotencyService.run('post_receipt', externalId, ... )`
- `AuditService.write()`

---

## 12.3 Module 5 — Outbound
Module 5 dùng Module 1 để:
- phân quyền force approve outbound exception
- reason code cho override / customer reject / quality issue
- sinh `SHP`, `WRK`, `TRX`
- audit loading / override / reverse
- idempotency cho shipment posting

---

## 12.4 Module 6 — Inventory
Module 6 dùng Module 1 để:
- adjustment reason codes
- immutable ledger policy
- reverse policy + audit + correlation
- `TRX` sequence
- idempotency cho reverse/adjustment commands

Module 6 là nơi chịu trách nhiệm `InventTrans → OnHand`, nhưng Module 1 quyết định luật nền để flow đó an toàn.

---

## 12.5 Module 8 — Billing
Module 8 dùng Module 1 để:
- lock debit note authority
- `DN` number sequence
- audit billing lock/unlock/config changes
- idempotency cho lock/generate quan trọng
- reason code nếu có manual adjustments thương mại

---

## 12.6 Module 11 — Integration & IoT
Module 11 dùng Module 1 để:
- external_id / idempotency policy
- API auth / machine permission
- exception logging cho replay/duplicate/timeout
- correlation_id trace agent → API → DB

---

## 13. Mẫu API-to-DB mapping để dev intern hình dung

## 13.1 Ví dụ: `POST /roles/:id/permissions`

```text
Controller
 -> validate DTO
 -> AuthorizationService.assertCan(currentUser, 'foundation.role_permission.update')
 -> PermissionService.updateRolePermissions(roleId, changes)
    -> load current permissions
    -> compute diff
    -> upsert/delete role_permission rows
    -> AuditService.write(before/after)
 -> return updated matrix
```

**DB touched:**
- `role`
- `permission`
- `role_permission`
- `audit_log`

---

## 13.2 Ví dụ: `POST /number-sequences/:code/next`

```text
Controller/Internal Service Call
 -> auth + internal allowlist
 -> SequenceService.next(code, warehouseCode, businessDate)
    -> load number_sequence
    -> lock number_sequence_counter row
    -> increment
    -> format reference
    -> optional audit if admin preview/reset action
 -> return reference
```

**DB touched:**
- `number_sequence`
- `number_sequence_counter`

---

## 13.3 Ví dụ: Inbound post dùng idempotency của Module 1

```text
InboundController.postReceipt
 -> RequirePermission('receipt.post')
 -> IdempotencyService.run('post_receipt', external_id, payloadHash, async () => {
      ReasonCodeService.assertValidIfRequired(...)
      const receiptNo = await SequenceService.next('RCV', warehouseCode, businessDate)
      const result = await InboundService.postReceipt(...)
      await AuditService.write(...)
      return result
    })
 -> return receipt posted result
```

**DB touched bởi Module 1:**
- `idempotency_record`
- `number_sequence_counter`
- `audit_log`
- `exception_log` nếu duplicate/reject

---

## 14. Security design cho Module 1

### 14.1 Authn vs Authz
- Authentication: xác thực user là ai
- Authorization: user được làm gì

Module 1 chịu trách nhiệm mạnh ở **Authorization**.

### 14.2 Quy tắc bảo mật bắt buộc
1. Backend luôn là enforcement cuối cùng.
2. Query audit/decision logs phải phân quyền riêng.
3. Update config tables phải audit before/after.
4. Machine-to-machine integrations cũng phải có permission riêng, không reuse user role bừa bãi.
5. Token claims có thể cache role list, nhưng permission thực tế nên hỗ trợ invalidation.

### 14.3 Cơ chế cache quyền
Có 2 lựa chọn:
- **Simple mode:** mỗi request query DB/Redis snapshot
- **Optimized mode:** token có `permission_version`, server so với cache/db version

Khuyến nghị Phase 1:
- cache effective permissions trong Redis 1–5 phút
- khi role_permission thay đổi → publish cache invalidation event

---

## 15. Non-functional requirements kỹ thuật hóa

| NFR | Thiết kế kỹ thuật |
|---|---|
| Permission enforcement | guard + policy service ở backend |
| Traceability | audit_log + exception_log + correlation_id |
| Reliability | Postgres transaction + unique index + idempotency record |
| Performance | cache permission/reason code/rule catalog |
| Extensibility | code-first modular architecture + config tables |
| Retention | audit partition + archive strategy |
| Maintainability | shared services + strict folder structure |

### Chỉ tiêu nội bộ khuyến nghị
- permission check: < 50ms ở cache hit
- reason code query: < 100ms
- sequence generation: < 150ms trong điều kiện bình thường
- audit write: không block quá lâu; nếu metadata nặng có thể async phần phụ

---

## 16. Migration & seed strategy

### 16.1 Migration order
1. `role`
2. `permission`
3. `role_permission`
4. `user_role`
5. `reason_code`
6. `number_sequence`
7. `number_sequence_counter`
8. `business_rule_catalog`
9. `decision_log`
10. `change_control_record`
11. `audit_log`
12. `exception_log`
13. `idempotency_record`
14. `outbox_event`

### 16.2 Seed bắt buộc go-live
- Roles baseline
- Permissions baseline
- Role-permission matrix baseline
- Number sequence baseline: `RCV`, `SHP`, `WRK`, `TRX`, `DN`
- Minimum reason codes go-live
- Business rule catalog baseline `FG-BR-*`

### 16.3 Seed không nên hard-code trong app runtime
Dùng seed script hoặc migration seed, không nhét vào controller/service logic.

---

## 17. Testing strategy cho Module 1

## 17.1 Unit test bắt buộc
- permission resolution
- owner scope evaluation
- reason code validation
- sequence formatting
- request hash consistency
- idempotency status transitions

## 17.2 Integration test bắt buộc
- assign role → request protected endpoint → allowed/denied đúng
- same idempotency key retry → không tạo record mới
- same key different payload → reject conflict
- concurrent sequence generation → không trùng mã
- deactivate reason code → transaction mới bị chặn
- config update → audit before/after được ghi

## 17.3 Concurrency test
Rất quan trọng cho:
- `number_sequence_counter`
- `idempotency_record`

## 17.4 Regression test giữa modules
Khi Module 4/5/6 build vào, phải có integration tests chứng minh:
- Inbound gọi được `RCV`
- Outbound force approve dùng đúng permission + reason code
- Inventory reverse dùng đúng audit + idempotency
- Billing lock debit note enforce đúng authority

---

## 18. Những sai lầm phổ biến cần tránh

1. Build RBAC chỉ ở frontend.
2. Hard-code permission và reason code trong enum rồi bỏ DB.
3. Dùng 1 bảng settings chung chung thay vì model rõ `reason_code`, `number_sequence`, `rule_catalog`.
4. Ghi audit thủ công từng nơi, format không thống nhất.
5. Chỉ check duplicate ở application memory, không có unique constraint.
6. Sequence generate bằng `count + 1`.
7. Xóa reason code/role thay vì deactivate.
8. Trộn process governance với runtime feature dẫn tới build quá tay.
9. Không có internal shared service contract cho downstream modules.
10. Không test concurrent và retry.

---

## 19. Đề xuất phạm vi triển khai theo Sprint

### Sprint A — Foundation Core
- roles / permissions / user_role schema
- permission guard
- effective permission query API
- reason code schema + query API
- audit base infrastructure

### Sprint B — Runtime Safety
- number sequence tables + service
- idempotency tables + wrapper
- exception log
- config admin APIs

### Sprint C — Governance Runtime Support
- business rule catalog APIs
- decision log APIs
- change control APIs
- cache invalidation + outbox groundwork

### Sprint D — Cross-module integration
- integrate Module 4/5/6/8 with shared services
- concurrency tests
- SIT fixes

---

## 20. Kết luận kỹ thuật

Module 1 không phải “một màn admin cấu hình”. Dưới góc nhìn hệ thống, đây là **control platform của SWM**.

Nếu build đúng:
- mọi module sau có nền permission, sequence, audit, reason code, idempotency để dùng chung
- backend tránh duplicate posting và giảm tranh chấp vận hành
- QA có baseline rõ để test cross-module
- scale về sau dễ hơn vì config tables, log tables, outbox và internal services đã được chuẩn hóa ngay từ đầu

Nếu build sai:
- mỗi module sẽ tự làm permission/sequence/audit/idempotency theo cách riêng
- technical debt lan rất nhanh
- tới giai đoạn Inbound/Outbound/Billing sẽ phải đập đi làm lại nền

**Khuyến nghị chốt:** Với đội dev nhỏ và cần tài liệu rõ cho intern, hãy build Module 1 theo hướng **NestJS modular monolith + PostgreSQL + Redis**, expose shared services nội bộ trước, public admin APIs sau, và coi `audit + sequence + idempotency + authorization` là 4 trụ cột bắt buộc của nền hệ thống.

---

## 21. Appendix — Danh sách permission code gợi ý cho go-live

### Foundation
- `foundation.role.view`
- `foundation.role.create`
- `foundation.role.update`
- `foundation.permission.view`
- `foundation.permission.assign`
- `foundation.reason_code.view`
- `foundation.reason_code.create`
- `foundation.reason_code.update`
- `foundation.reason_code.deactivate`
- `foundation.sequence.view`
- `foundation.sequence.create`
- `foundation.sequence.update`
- `foundation.audit.view`
- `foundation.exception.view`
- `foundation.rule_catalog.view`
- `foundation.rule_catalog.update`
- `foundation.decision_log.view`
- `foundation.decision_log.create`

### Cross-module sensitive examples
- `receipt.manual_weight`
- `receipt.cancel`
- `receipt.post`
- `shipment.force_approve`
- `inventory.adjust`
- `inventory.reverse`
- `billing.debit_note.lock`

---

## 22. Appendix — Danh sách command nên áp idempotency bắt buộc

1. `post_receipt`
2. `manual_weight_submit`
3. `reverse_invent_trans`
4. `inventory_adjustment_post`
5. `post_shipment`
6. `shipment_force_approve`
7. `lock_debit_note`
8. `create_debit_note` *(nếu auto-capture có retry risk)*

---

## 23. Appendix — Minimum go-live reason code set

### Inbound
- `DAMAGED`
- `SHORT_DELIVERY`
- `OVER_DELIVERY`
- `WRONG_ITEM`
- `SCALE_CALIBRATION`
- `DOCUMENTATION_ERROR`

### Outbound
- `CUSTOMER_REJECT`
- `WEIGHT_MISMATCH`
- `QUALITY_ISSUE`
- `LOADING_LEFTOVER` `[TO-CONFIRM]`

### Inventory
- `CYCLE_COUNT_ADJUST`
- `DAMAGE_WRITEOFF`
- `STATUS_CHANGE`
- `SHRINKAGE`

### General
- `OTHER` *(requires note)*

---

## 24. Appendix — Runtime sub-modules vs process-only sub-modules

| Sub-module | Build runtime? | Ghi chú |
|---|---|---|
| RBAC & Permission Control | Có | Core runtime |
| Role Responsibility & Approval Governance | Một phần | Chủ yếu process; runtime chỉ phần policy/config cần thiết |
| Number Sequence & Reference Control | Có | Core runtime |
| Business Rules Baseline Management | Có | Ít UI, chủ yếu API + DB |
| Reason Code Management | Có | Core runtime |
| Audit Trail & Exception Governance | Có | Core runtime |
| Idempotency & Command Safety Control | Có | Core runtime |
| Document Governance & Change Control | Một phần | DB/API đơn giản; không phải dashboard bắt buộc |

