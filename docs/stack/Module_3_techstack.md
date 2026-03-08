# TVL SWM — Module 3 Tech Stack & Backend Design
# Inventory Core Engine

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Billing, Integration Team  
**Mục tiêu:** Chuyển hóa Module 3 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, posting engine, reversal engine, availability service, reconciliation, snapshot và tích hợp chuẩn với Module 1 và Module 2.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 3 — Inventory Core Engine Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 3 thực chất phải build những gì ở Phase 1.
- Tư duy kiến trúc đúng của inventory core: **document không phải nguồn sự thật cuối cùng; `InventDim → InventTrans → OnHand` mới là backbone**.
- Luồng từ **database → repository → service → posting engine → API** nên tổ chức ra sao.
- Thiết kế database như thế nào để vừa đúng go-live Phase 1 vừa không phá khả năng scale cho Module 4, 5, 6, 7, 9, 10, 11.
- Từng API dùng để làm gì, validate gì, update bảng nào, audit/idempotency ra sao.
- Cách Module 3 ánh xạ với **Module 1 — Foundation & Governance** và **Module 2 — Master Data Management**.
- Những quyết định nào nên chốt ngay để dev không code sai từ đầu.

Tài liệu này lấy các nguồn sau làm baseline chính:
- **Module 3 spec enhanced**: phạm vi, nguyên tắc thiết kế, sub-modules, posting points, hold model, reconciliation, snapshot, API baseline.
- **Module 1 spec + techstack**: RBAC, audit, reason code, idempotency, number sequence, shared governance pattern.
- **Module 2 spec + techstack**: owner/item/warehouse/location/status master, validation, controlled change.
- **Overview hệ thống + Transaction Data Dictionary**: object ownership, transaction truth, reconciliation formulas, inventory backbone.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 16 kết luận kỹ thuật quan trọng cho Module 3:

1. **Module 3 là shared inventory backbone**, không phải chỉ là màn hình tồn kho.
2. **Nguồn sự thật của tồn kho là `InventDim → InventTrans → OnHand`**, không phải Receipt/Shipment/UI.
3. **Inbound chỉ post khi Receipt đạt `RECEIVED`; outbound chỉ trừ khi Shipment đạt `SHIPPED`.**
4. **Allocation/hold không làm giảm physical_qty trước khi ship thật.**
5. **Không được update `on_hand` trực tiếp từ UI/API nghiệp vụ**; mọi thay đổi phải đi qua posting engine.
6. **Ledger bất biến**: `invent_trans` đã post không được UPDATE/DELETE; correction phải reverse-only.
7. **Owner là dimension bắt buộc** trong Phase 1 và phải đi vào `invent_dim`, `invent_trans`, `on_hand`.
8. **Dimension Phase 1 chỉ gồm:** `site + warehouse + location + owner + status`.
9. **Module 3 sở hữu runtime inventory records**, còn Module 2 chỉ sở hữu master definitions.
10. **Module 3 không tự sinh business rule của inbound/outbound/inventory control**; nó nhận event hợp lệ từ các module nghiệp vụ và thực hiện posting đúng cách.
11. **Idempotency là bắt buộc** cho mọi command side effect ở inventory layer, đặc biệt weighbridge retry, mobile retry, integration retry.
12. **Posting inventory và update on-hand phải cùng transaction DB** để không tạo trạng thái nửa chừng.
13. **Allocation phải dùng row-level lock / pessimistic locking** để tránh over-commit.
14. **Reconciliation phải là feature thật** chứ không chỉ là ý tưởng; phải có rule, job và output table.
15. **Daily snapshot phải billing-safe**, không suy diễn từ document state.
16. **Thiết kế DB của Module 3 phải chừa đường cho Phase 2** như batch/lot/LPN/serial, nhưng không được làm phình mô hình go-live.

---

## 3. Phạm vi build thực tế của Module 3 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. `invent_dim` runtime engine
2. `invent_trans` immutable ledger
3. `on_hand` current balance engine
4. shared posting engine
5. event-to-transaction mapping layer
6. reversal engine
7. availability / hold / on-hand query service
8. transaction history query service
9. reconciliation service + result store
10. daily snapshot generator + snapshot store
11. idempotency integration cho command APIs
12. audit integration với Module 1
13. technical safeguards: lock, atomicity, retry-safe
14. API command/query cho downstream modules và admin/ops
15. DB constraints / trigger / indexes để bảo vệ ledger

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build costing engine / valuation layer.
2. Không build FEFO/expiry/lot allocation engine.
3. Không build LPN/pallet engine.
4. Không build event streaming analytics realtime phức tạp.
5. Không build reservation framework kiểu ERP full-blown.
6. Không build multi-company ledger.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** core engine để mọi module khác gọi dùng chung.
- **Có build** hold model đủ dùng cho outbound allocation-based hold.
- **Có build** reconciliation và snapshot như capability vận hành thật.
- **Không build** business workflow của receipt/shipment trong Module 3.
- **Không build** CRUD master data trong Module 3.
- **Không build** charge calculation trong Module 3.
- **Không cho phép** module khác tự viết vào `on_hand` hoặc `invent_trans` ngoài service chuẩn của Module 3.

---

## 4. Khuyến nghị tech stack chính thức cho Module 3

Để đồng bộ với Module 1 và Module 2, đồng thời phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / hot query / distributed coordination:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Observability

- Structured logging: Pino hoặc Winston JSON
- Correlation ID xuyên request → posting → audit → snapshot → reconciliation
- Metrics: posting latency, post success rate, reversal rate, lock wait time, reconciliation mismatch count, snapshot runtime
- Tracing: OpenTelemetry-ready

### 4.4 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + test DB
- API test: supertest
- Concurrency test: posting/allocation simultaneous requests
- Golden test: reconciliation/snapshot expected output

### 4.5 Vì sao nên giữ cùng stack với Module 1 và 2

- Module 1 đã là shared foundation cho authorization, audit, idempotency, number sequence.
- Module 2 đã là source master data cho owner/item/warehouse/location/status.
- Module 3 nằm giữa hai lớp đó và cần cùng stack để tái sử dụng shared module, guard, interceptor, request context, audit service, idempotency service, migration style và code structure.

---

## 5. Kiến trúc tổng thể Module 3 trong hệ backend

```text
Inbound / Outbound / Inventory Control / Work / VAS / Integration
                              |
                              v
                    NestJS Inventory Controllers
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
   Auth Guard          Permission Guard        Idempotency Guard
        |                     |                      |
        +---------------------+----------------------+
                              |
                              v
                     Inventory Application Layer
  +--------------------+-------------------+--------------------+
  |                    |                   |                    |
  v                    v                   v                    v
Posting Service   Reversal Service   OnHand Query Service  Snapshot Service
Dim Service       Hold Service       Transaction Query     Reconciliation
  |                    |                   |                    |
  +--------------------+---------+---------+--------------------+
                              |
                              v
                     Domain / Policy Layer
  +--------------------+-------------------+--------------------+
  | Event Mapping      | Posting Rule      | Availability Rule  |
  | Reversal Policy    | Reconcile Rule    | Snapshot Policy    |
  +--------------------+-------------------+--------------------+
                              |
                              v
                        Repository Layer
                              |
                              v
                PostgreSQL + Redis + Queue + Outbox
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa business logic.
- **Guard layer**: auth, permission, idempotency, request context.
- **Application services**: orchestration use case.
- **Domain/policy layer**: mapping, formula, invariant, rule matrix.
- **Repository layer**: truy cập DB, không chứa business rule.
- **Background jobs**: reconciliation, snapshot, cleanup stale idempotency, optional replay.

### 5.2 Tư tưởng thiết kế cốt lõi

- Inventory transaction logic phải **gom vào một posting engine duy nhất**.
- Allocation / hold phải dùng service riêng, không trộn vào outbound controller.
- `on_hand` là **read model vận hành**, còn `invent_trans` là **ledger nguồn sự thật**.
- Reconciliation là lớp kiểm soát chất lượng dữ liệu giữa ledger và read model.
- Snapshot là sản phẩm downstream-safe cho billing và reporting.

---

## 6. Phân ranh runtime ownership giữa Module 3 và các module khác

| Concern | Module 3 sở hữu | Module khác sở hữu |
|---|---|---|
| Tạo `invent_dim` | Có | Không |
| Ghi `invent_trans` | Có | Không |
| Cập nhật `on_hand` | Có | Không |
| Reversal inventory ledger | Có | Không |
| Availability / hold / query | Có | M5 consume |
| Reconciliation / snapshot | Có | M10/M11 consume |
| Receipt / Shipment state machine | Không | M4/M5 |
| Work execution runtime | Không | M7 |
| Master values owner/item/location/status | Không | M2 |
| Permission / audit / reason code / idempotency framework | Không, chỉ consume | M1 |
| Billing formula / debit note | Không | M10 |

### 6.1 Ánh xạ Module 3 với Module 1

Module 3 phụ thuộc trực tiếp vào Module 1 ở các điểm sau:

1. **RBAC**
   - ai được post inventory
   - ai được reverse
   - ai được run reconciliation
   - ai được rerun snapshot
   - ai được query cross-owner

2. **Reason code**
   - adjustment bắt buộc reason
   - reversal bắt buộc reason
   - manual override / force release hold nếu có phải có reason

3. **Audit trail**
   - tạo `invent_trans`
   - reverse
   - update `on_hand`
   - create/release hold
   - reconciliation mismatch
   - snapshot run / rerun

4. **Idempotency**
   - `POST /inventory/postings`
   - `POST /inventory/postings/reverse`
   - `POST /inventory/holds`
   - `POST /inventory/reconciliation/run`
   - `POST /inventory/snapshots/daily`

5. **Number sequence**
   - sinh `trans_id` theo sequence `TRX`
   - có thể sinh `reconciliation_run_no`, `snapshot_batch_no` nếu team muốn tracking đẹp hơn

### 6.2 Ánh xạ Module 3 với Module 2

Module 3 consume master data từ Module 2 như sau:

1. `item` → validate item active, base UOM, cargo form
2. `owner` → dimension bắt buộc, owner segregation
3. `warehouse` → scope, default locations, site mapping
4. `location` → dimension, move target/source validation
5. `inventory_status` → dimension + allocatable rule
6. `uom` / `uom_conversion` → validate payload UOM, convert khi cần
7. `owner_item_policy` → future support cho tolerance/handling-specific logic ở module nghiệp vụ, không post trực tiếp ở M3

### 6.3 Ánh xạ Module 3 với các module nghiệp vụ sau

- **M4 Inbound** → gọi M3 để post inbound tại `RECEIVED`
- **M5 Outbound** → gọi M3 để create/release hold, post outbound tại `SHIPPED`
- **M6 Inventory Control** → gọi M3 cho move/status change/adjustment/count delta/transfer receive-ship
- **M7 Work Execution** → khi work line `COMPLETED`, gọi M3 để post movement tương ứng
- **M9 VAS / Bagging** → gọi M3 để consume bulk, produce bagged goods
- **M10 Billing** → đọc snapshot và transaction truth từ M3
- **M11 Reporting / Audit** → đọc transaction history, reconciliation result, snapshot data

---

## 7. Đề xuất cấu trúc code backend cho Module 3

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
  modules/
    inventory-core/
      inventory-core.module.ts
      controllers/
        inventory-posting.controller.ts
        inventory-reversal.controller.ts
        onhand-query.controller.ts
        inventory-transaction.controller.ts
        inventory-hold.controller.ts
        inventory-reconciliation.controller.ts
        inventory-snapshot.controller.ts
      services/
        inventory-posting.service.ts
        invent-dim.service.ts
        invent-trans.service.ts
        onhand.service.ts
        hold.service.ts
        availability.service.ts
        reversal.service.ts
        transaction-query.service.ts
        reconciliation.service.ts
        snapshot.service.ts
        inventory-policy.service.ts
        inventory-validation.service.ts
        event-mapping.service.ts
      repositories/
        invent-dim.repository.ts
        invent-trans.repository.ts
        onhand.repository.ts
        hold.repository.ts
        reversal-link.repository.ts
        reconciliation.repository.ts
        snapshot.repository.ts
      dto/
      entities/
      mappers/
      policies/
        event-mapping.policy.ts
        posting-rule.policy.ts
        reversal.policy.ts
        hold.policy.ts
        reconciliation.policy.ts
        snapshot.policy.ts
      jobs/
        reconciliation.job.ts
        daily-snapshot.job.ts
        stale-processing-recovery.job.ts
```

### 7.1 Quy tắc code structure bắt buộc

- Controller không xử lý posting logic.
- Chỉ `inventory-posting.service.ts` được phép tạo `invent_trans` và update `on_hand` theo flow chuẩn.
- Repository không được chứa if/else nghiệp vụ.
- Policy tách riêng để dễ test matrix nghiệp vụ.
- DTO tách rõ command và query.
- Mọi command service phải nhận `requestContext` chứa `user_id`, `role`, `source_app`, `correlation_id`.
- Không service nào ngoài Module 3 được truy cập trực tiếp repository của `invent_trans` / `on_hand`.

---

## 8. Thiết kế database tổng thể cho Module 3

## 8.1 Nguyên tắc DB design

1. `invent_trans` là **ledger append-only**.
2. `on_hand` là **current balance read model**, luôn suy ra được từ ledger.
3. `invent_dim` là **normalized dimension key registry**.
4. Tách bảng ledger, balance, hold, snapshot, reconciliation, reversal link.
5. Dùng UUID/ULID cho PK kỹ thuật; dùng sequence business key cho `trans_id`.
6. Bảo vệ bất biến bằng **DB constraints + trigger**, không chỉ bằng code.
7. Thiết kế index theo item/date, owner/date, ref lookup, external_id, dim lookup.
8. Chừa vị trí mở rộng Phase 2 nhưng không cài batch/lot/serial vào go-live schema chính.
9. `on_hand` và hold update phải đi cùng transaction với posting/allocate tương ứng.
10. Partition `invent_trans` theo thời gian khi volume tăng.

---

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Runtime core
- `invent_dim`
- `invent_trans`
- `on_hand`
- `inventory_hold`
- `inventory_reversal_link`

### 8.2.2 Control / quality
- `inventory_reconciliation_run`
- `inventory_reconciliation_result`
- `daily_storage_snapshot`
- `inventory_snapshot_run`
- `inventory_event_mapping` *(seed/config, có thể table hoặc seed code; khuyến nghị table read-only admin)*

### 8.2.3 Optional support nên có ngay
- `inventory_processing_state` *(điều tra partial failure/stale processing nếu cần)*
- `inventory_outbox_event`

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `invent_dim`

Mục đích: chuẩn hóa dimension combination Phase 1.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | khóa kỹ thuật |
| dim_id | VARCHAR(40) | UNIQUE NOT NULL | public/business-safe dim key |
| dim_hash | VARCHAR(64) | UNIQUE NOT NULL | SHA-256 normalized fields |
| site_id | VARCHAR(50) | NOT NULL | từ warehouse/site baseline |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| location_id | UUID | FK NOT NULL | → md_location |
| owner_id | UUID | FK NOT NULL | → md_owner |
| inventory_status_id | UUID | FK NOT NULL | → md_inventory_status |
| is_active | BOOLEAN | NOT NULL DEFAULT true | future-proof |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |

**Unique logic đề xuất:**
- unique(`dim_hash`)
- index(`warehouse_id`,`location_id`,`owner_id`,`inventory_status_id`)

**Công thức hash chuẩn hóa:**
`SHA-256(site_id|warehouse_code|location_code|owner_code|status_code)`

**Lưu ý triển khai:**
- normalize input trước khi hash: trim, uppercase code nếu applicable.
- validate `location` thuộc đúng `warehouse` trước khi get-or-create.
- `dim_id` có thể là ULID hoặc business-safe internal id; downstream chủ yếu dùng UUID/ID kỹ thuật.

---

### 8.3.2 `invent_trans`

Mục đích: ledger bất biến của mọi biến động tồn kho.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| trans_id | VARCHAR(40) | UNIQUE NOT NULL | `TRX-YYYYMMDD-SEQ` |
| ref_type | VARCHAR(40) | NOT NULL | RECEIPT/SHIPMENT/TRANSFER/... |
| ref_id | VARCHAR(50) | NOT NULL | source header |
| ref_line_id | VARCHAR(50) | NULL | source line |
| trans_type | VARCHAR(40) | NOT NULL | RECEIPT_IN/SHIPMENT_OUT/MOVE/... |
| item_id | UUID | FK NOT NULL | → md_item |
| qty | NUMERIC(18,3) | NOT NULL | signed qty |
| uom_id | UUID | FK NOT NULL | → md_uom |
| dim_from_id | UUID | FK NULL | → invent_dim |
| dim_to_id | UUID | FK NULL | → invent_dim |
| status_from_code | VARCHAR(30) | NULL | denorm optional |
| status_to_code | VARCHAR(30) | NULL | denorm optional |
| stage | VARCHAR(20) | NOT NULL | PHYSICAL / EXPECTED ... |
| external_id | VARCHAR(120) | NOT NULL | idempotency key |
| correlation_id | VARCHAR(120) | NOT NULL | trace |
| reason_code | VARCHAR(50) | NULL | → Module 1 reason_code.code |
| source_app | VARCHAR(30) | NOT NULL | WEB/MOBILE/API/INTEGRATION |
| posted_by | UUID | NULL | actor |
| posted_at | TIMESTAMP | NOT NULL | immutable |
| owner_id | UUID | FK NOT NULL | denorm for fast filtering |
| weighbridge_ticket_id | VARCHAR(50) | NULL | optional link |
| is_reversal | BOOLEAN | NOT NULL DEFAULT false | |
| reversal_of_trans_id | VARCHAR(40) | NULL | link business trans id |
| created_at | TIMESTAMP | NOT NULL | |

**Index khuyến nghị:**
- unique(`trans_id`)
- unique(`external_id`,`trans_type`) hoặc unique(`external_id`,`ref_type`,`ref_id`,`ref_line_id`,`trans_type`)
- index(`ref_type`,`ref_id`,`ref_line_id`)
- index(`item_id`,`posted_at` DESC)
- index(`owner_id`,`posted_at` DESC)
- index(`dim_to_id`,`posted_at` DESC)
- index(`dim_from_id`,`posted_at` DESC)
- index(`correlation_id`)

**Bảo vệ bắt buộc:**
- DB trigger chặn UPDATE/DELETE trên row đã insert, trừ cột kỹ thuật rất hạn chế nếu thật sự cần.
- `trans_type` bắt buộc để tránh suy luận bằng dấu qty.
- `owner_id` denorm để query lịch sử nhanh hơn.

**Partition khuyến nghị:**
- theo tháng bằng `posted_at` khi volume tăng mạnh.

---

### 8.3.3 `on_hand`

Mục đích: current balance dùng cho query vận hành.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| item_id | UUID | FK NOT NULL | → md_item |
| invent_dim_id | UUID | FK NOT NULL | → invent_dim |
| physical_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | tồn vật lý |
| reserved_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | đã giữ |
| available_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | physical - reserved |
| ordered_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | optional phase-1-light |
| uom_id | UUID | FK NOT NULL | → md_uom |
| last_movement_at | TIMESTAMP | NULL | |
| last_count_at | TIMESTAMP | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | optimistic/version trace |

**Unique:**
- unique(`item_id`,`invent_dim_id`)

**Công thức invariant:**
- `available_qty = physical_qty - reserved_qty`
- `physical_qty = SUM(physical-stage trans effect)`

**Lưu ý triển khai:**
- không cho API CRUD trực tiếp `on_hand`.
- update `on_hand` chỉ qua posting/hold service.

---

### 8.3.4 `inventory_hold`

Mục đích: lưu chi tiết allocation-based hold, không trộn hết trace vào `on_hand`.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| hold_no | VARCHAR(40) | UNIQUE NOT NULL | optional readable key |
| shipment_id | VARCHAR(50) | NULL | source outbound |
| shipment_line_id | VARCHAR(50) | NULL | |
| work_header_id | VARCHAR(50) | NULL | optional |
| item_id | UUID | FK NOT NULL | |
| invent_dim_id | UUID | FK NOT NULL | dim bị giữ |
| hold_qty | NUMERIC(18,3) | NOT NULL | |
| released_qty | NUMERIC(18,3) | NOT NULL DEFAULT 0 | |
| status | VARCHAR(20) | NOT NULL | ACTIVE / PARTIALLY_RELEASED / RELEASED / CONSUMED / CANCELLED |
| reason_code | VARCHAR(50) | NULL | khi force release/manual override |
| external_id | VARCHAR(120) | NULL | idempotency cho command hold |
| correlation_id | VARCHAR(120) | NOT NULL | |
| created_by | UUID | NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| released_at | TIMESTAMP | NULL | |
| released_by | UUID | NULL | |

**Index:**
- index(`shipment_id`,`shipment_line_id`)
- index(`item_id`,`invent_dim_id`,`status`)
- index(`external_id`)

**Tại sao cần bảng riêng:**
- truy được hold theo shipment/work
- hỗ trợ release từng phần
- tránh mất lịch sử reserved khi ship/cancel
- hỗ trợ đối soát reserved_qty trên `on_hand`

---

### 8.3.5 `inventory_reversal_link`

Mục đích: link trans gốc và trans reverse một cách rõ ràng.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| original_trans_id | UUID | FK NOT NULL |
| reversal_trans_id | UUID | FK NOT NULL |
| reverse_reason_code | VARCHAR(50) | NOT NULL |
| reverse_note | TEXT | NULL |
| reversed_by | UUID | NULL |
| reversed_at | TIMESTAMP | NOT NULL |
| correction_ref_type | VARCHAR(40) | NULL |
| correction_ref_id | VARCHAR(50) | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |

**Unique:**
- unique(`original_trans_id`,`reversal_trans_id`)

---

### 8.3.6 `inventory_reconciliation_run`

Mục đích: header của mỗi lần chạy reconciliation.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| run_no | VARCHAR(40) | UNIQUE NOT NULL |
| run_type | VARCHAR(20) | NOT NULL |
| scope_type | VARCHAR(20) | NOT NULL |
| warehouse_id | UUID | FK NULL |
| owner_id | UUID | FK NULL |
| item_id | UUID | FK NULL |
| started_at | TIMESTAMP | NOT NULL |
| completed_at | TIMESTAMP | NULL |
| status | VARCHAR(20) | NOT NULL |
| mismatch_count | INT | NOT NULL DEFAULT 0 |
| requested_by | UUID | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |

---

### 8.3.7 `inventory_reconciliation_result`

Mục đích: lưu chi tiết lệch giữa ledger và on-hand.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| run_id | UUID | FK NOT NULL |
| item_id | UUID | FK NOT NULL |
| invent_dim_id | UUID | FK NOT NULL |
| ledger_qty | NUMERIC(18,3) | NOT NULL |
| onhand_physical_qty | NUMERIC(18,3) | NOT NULL |
| reserved_qty | NUMERIC(18,3) | NOT NULL |
| available_qty | NUMERIC(18,3) | NOT NULL |
| diff_qty | NUMERIC(18,3) | NOT NULL |
| severity | VARCHAR(20) | NOT NULL |
| rule_code | VARCHAR(40) | NOT NULL |
| result_status | VARCHAR(20) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

**Index:**
- index(`run_id`)
- index(`item_id`,`invent_dim_id`)
- index(`severity`,`result_status`)

---

### 8.3.8 `inventory_snapshot_run`

Mục đích: quản lý mỗi lần chạy snapshot hàng ngày.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| run_no | VARCHAR(40) | UNIQUE NOT NULL |
| snapshot_date | DATE | NOT NULL |
| warehouse_id | UUID | FK NULL |
| cut_off_time | TIMESTAMP | NOT NULL |
| run_mode | VARCHAR(20) | NOT NULL |
| version_no | INT | NOT NULL DEFAULT 1 |
| status | VARCHAR(20) | NOT NULL |
| started_at | TIMESTAMP | NOT NULL |
| completed_at | TIMESTAMP | NULL |
| requested_by | UUID | NULL |
| correlation_id | VARCHAR(120) | NOT NULL |

**Unique khuyến nghị:**
- unique(`snapshot_date`,`warehouse_id`,`version_no`)

---

### 8.3.9 `daily_storage_snapshot`

Mục đích: snapshot billing-safe theo ngày và theo dimension thương mại cần thiết.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| snapshot_run_id | UUID | FK NOT NULL | |
| snapshot_date | DATE | NOT NULL | |
| warehouse_id | UUID | FK NOT NULL | |
| location_id | UUID | FK NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| item_id | UUID | FK NOT NULL | |
| opening_qty | NUMERIC(18,3) | NOT NULL | |
| inbound_today_qty | NUMERIC(18,3) | NOT NULL | |
| outbound_today_qty | NUMERIC(18,3) | NOT NULL | |
| closing_qty | NUMERIC(18,3) | NOT NULL | |
| cut_off_time | TIMESTAMP | NOT NULL | |
| snapshot_source | VARCHAR(50) | NOT NULL | service / batch |
| correlation_id | VARCHAR(120) | NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Index:**
- index(`snapshot_date`,`warehouse_id`,`owner_id`)
- index(`owner_id`,`item_id`,`snapshot_date`)

**Lưu ý:**
- snapshot không sửa tay
- rerun tạo version mới qua `inventory_snapshot_run`
- billing nên đọc version active/chính thức

---

### 8.3.10 `inventory_event_mapping`

Mục đích: chuẩn hóa event-to-transaction mapping, giảm hard-code rải rác.

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| event_code | VARCHAR(50) | UNIQUE NOT NULL |
| source_module | VARCHAR(20) | NOT NULL |
| source_object | VARCHAR(40) | NOT NULL |
| trigger_state | VARCHAR(40) | NOT NULL |
| trans_type | VARCHAR(40) | NOT NULL |
| affect_physical | BOOLEAN | NOT NULL |
| affect_hold | BOOLEAN | NOT NULL |
| reversible | BOOLEAN | NOT NULL |
| active_flag | BOOLEAN | NOT NULL DEFAULT true |
| notes | TEXT | NULL |

**Khuyến nghị:**
- seed table read-only cho Phase 1
- cho phép admin xem, không khuyến nghị edit tùy tiện trong production go-live sớm

---

## 8.4 Quan hệ dữ liệu tổng quát

```text
md_warehouse --< md_location
md_owner -----< invent_dim >----- md_inventory_status
md_location --< invent_dim
md_item ------< invent_trans >----- invent_dim (from/to)
md_item ------< on_hand >----------- invent_dim
on_hand ------< inventory_hold
invent_trans -< inventory_reversal_link >- invent_trans
inventory_reconciliation_run --< inventory_reconciliation_result
inventory_snapshot_run ------< daily_storage_snapshot
```

---

## 8.5 Thiết kế DB để scale cho các module sau

### 8.5.1 Cho Module 4 Inbound
- `RECEIPT_RECEIVED` phải map 1 chiều rõ vào posting inbound.
- Putaway nên là movement từ receiving dim sang storage dim.

### 8.5.2 Cho Module 5 Outbound
- Hold phải truy được theo shipment line.
- Ship chỉ giảm physical khi `SHIPPED`.
- `available_qty` phải đủ nhanh cho allocation.

### 8.5.3 Cho Module 6 Inventory Control
- Move/status change/adjustment/cycle count đều phải reuse posting engine.
- Không để M6 tự sửa ledger.

### 8.5.4 Cho Module 7 Work Execution
- WorkLine complete phải map sang event posting, không viết trực tiếp `invent_trans`.

### 8.5.5 Cho Module 9 VAS / Bagging
- Consume/produce nên là trans riêng, giữ trace giữa bulk item và bagged item.

### 8.5.6 Cho Module 10 Billing
- Snapshot phải versioned và rerunnable.
- Billing đọc snapshot thay vì suy từ document.

### 8.5.7 Không nên làm gì
- Không nhét hold history vào cột JSON trong `on_hand`.
- Không dùng 1 bảng chung cho trans + snapshot + reconcile.
- Không bỏ trigger bảo vệ immutability chỉ vì “backend đã check rồi”.
- Không cho module khác insert thẳng `invent_trans` bằng raw SQL.

---

## 9. Luồng xử lý từ Database → Backend cho từng nhóm năng lực

## 9.1 Get-or-create InventDim flow

```text
posting request
 -> validate master refs (warehouse/location/owner/status)
 -> normalize dimension values
 -> compute dim_hash
 -> query invent_dim by dim_hash
 -> if found: reuse dim_id
 -> else: insert invent_dim in transaction
 -> return dim_id
```

### Điểm kỹ thuật quan trọng

- unique index trên `dim_hash`
- concurrent create vẫn an toàn nhờ unique constraint + retry read-after-conflict
- service này phải được reuse trong mọi posting path

---

## 9.2 Inventory posting flow

```text
API request / domain command
 -> Auth + Permission Guard
 -> Idempotency check
 -> DTO validation
 -> Event mapping validation
 -> Master validation
 -> Dim resolution (from/to)
 -> Begin DB transaction
 -> pre-check on_hand / negative stock / hold rules
 -> generate trans_id
 -> insert invent_trans
 -> update on_hand rows impacted
 -> write audit entries
 -> commit
 -> save idempotency result
 -> return response
```

### Bảng tham gia

- `invent_dim`
- `invent_trans`
- `on_hand`
- `idempotency_record` (Module 1)
- `audit_log` (Module 1)

### Invariants bắt buộc

- Không duplicate theo `external_id`
- Không âm tồn nếu policy không cho phép
- Không update `on_hand` mà thiếu `invent_trans`
- Không tạo trans khi event chưa ở posting point hợp lệ

---

## 9.3 Hold / allocation flow

```text
allocate request
 -> Auth + Permission
 -> validate item/dim/status = AVAILABLE
 -> begin transaction
 -> SELECT on_hand row FOR UPDATE
 -> compute available_qty from locked row
 -> if enough stock: insert inventory_hold
 -> update on_hand.reserved_qty / available_qty
 -> audit
 -> commit
```

### Điểm kỹ thuật quan trọng

- dùng pessimistic lock tại thời điểm confirm allocation
- chỉ lock row stock pool liên quan
- tránh tính available trên dữ liệu stale
- release / consume hold cũng phải transaction-safe

---

## 9.4 Reversal flow

```text
reverse request
 -> Auth + Permission + reason_code validation
 -> Idempotency check
 -> load original trans
 -> validate reversible + not already reversed by policy
 -> begin transaction
 -> create reversal trans with opposite qty/direction
 -> insert reversal link
 -> update on_hand by reverse impact
 -> audit original + reversal
 -> commit
 -> return reversal result
```

### Quy tắc bắt buộc

- không sửa trans gốc
- reverse phải cùng item và dimension logic phù hợp
- bắt buộc `reason_code`
- tạo trace link rõ ràng

---

## 9.5 Reconciliation flow

```text
run reconciliation
 -> Auth + Permission
 -> create reconciliation_run
 -> aggregate ledger by item + dim
 -> compare with on_hand
 -> insert reconciliation_result rows
 -> update run summary
 -> if mismatch: log exception/audit
 -> return run summary
```

### Tần suất khuyến nghị

- scheduled daily
- on-demand manual theo warehouse/item/owner

### Quy tắc nền

- `physical_qty == SUM(trans.qty WHERE stage=PHYSICAL)`
- `available_qty == physical_qty - reserved_qty`
- không có negative physical

---

## 9.6 Daily snapshot flow

```text
run snapshot
 -> Auth/Job trigger
 -> create snapshot_run
 -> determine cut-off time
 -> compute opening, inbound, outbound, closing by day
 -> insert snapshot rows
 -> mark run completed
 -> audit / outbox for billing
```

### Lưu ý thiết kế

- snapshot nên chạy batch, không chạy sync trong request người dùng thông thường
- nếu correction sau cut-off, rerun tạo version mới
- billing cần biết version nào là version chính thức dùng tính phí

---

## 10. Posting engine chi tiết cho dev intern

## 10.1 Trách nhiệm của posting engine

Posting engine là service trung tâm, chịu trách nhiệm:

1. nhận command chuẩn hóa
2. kiểm event thuộc posting point hợp lệ hay không
3. resolve dimension nguồn/đích
4. generate `trans_id`
5. insert `invent_trans`
6. cập nhật `on_hand`
7. ghi audit / idempotency result
8. trả `posting_result`

## 10.2 Những gì posting engine không làm

- không quyết định receipt có được `RECEIVED` không
- không quyết định shipment có được `SHIPPED` không
- không tính tolerance inbound/outbound
- không quyết định item/location master có được tạo không
- không tính billing fee

## 10.3 Command model chuẩn cho posting engine

```ts
interface InventoryPostingCommand {
  externalId: string;
  correlationId: string;
  eventCode: string;
  refType: string;
  refId: string;
  refLineId?: string;
  itemId: string;
  qty: string;
  uomCode: string;
  dimFrom?: InventoryDimInput;
  dimTo?: InventoryDimInput;
  reasonCode?: string;
  sourceApp: 'WEB' | 'MOBILE' | 'API' | 'INTEGRATION';
  postedBy?: string;
}
```

## 10.4 Posting result model

```ts
interface InventoryPostingResult {
  transId: string;
  transDbId: string;
  transType: string;
  itemId: string;
  qty: string;
  onHandAfter?: {
    physicalQty: string;
    reservedQty: string;
    availableQty: string;
  };
  idempotentReplay: boolean;
}
```

---

## 11. Event-to-Transaction mapping khuyến nghị chốt cho Phase 1

| Event code | Source module | Trigger | Trans type | On-hand impact | Ghi chú |
|---|---|---|---|---|---|
| `RECEIPT_RECEIVED` | M4 | Receipt = RECEIVED | `RECEIPT_IN` | +physical vào dim receiving | 1 chiều nhập |
| `PUTAWAY_COMPLETED` | M7 | WorkLine putaway complete | `MOVE` | -receiving / +storage | 2 chiều logic |
| `SHIPMENT_SHIPPED` | M5 | Shipment = SHIPPED | `SHIPMENT_OUT` | -physical storage | release hold tương ứng |
| `MOVE_COMPLETED` | M6/M7 | move complete | `MOVE` | from → to | net zero toàn hệ |
| `STATUS_CHANGE_CONFIRMED` | M6 | status change confirm | `STATUS_CHANGE` | from status → to status | qty không đổi tổng |
| `ADJUSTMENT_APPROVED` | M6 | adjustment confirmed | `ADJUSTMENT` | +/- physical | reason bắt buộc |
| `COUNT_RECONCILED` | M6 | count final | `COUNT_GAIN/COUNT_LOSS` | delta +/- | không overwrite absolute |
| `TRANSFER_SHIPPED` | M6 | transfer ship | `TRANSFER_OUT` | -source / maybe IN_TRANSIT | cần chốt sâu hơn |
| `TRANSFER_RECEIVED` | M6 | transfer receive | `TRANSFER_IN` | +dest | cần chốt sâu hơn |
| `VAS_CONSUME_COMPLETED` | M9 | VAS complete | `VAS_CONSUME` | -bulk | |
| `VAS_PRODUCE_COMPLETED` | M9 | VAS complete | `VAS_PRODUCE` | +bagged | |

---

## 12. Transaction type rule matrix

| Trans type | Qty sign | Dim from | Dim to | Update physical | Update reserved | Reason required | Reversible |
|---|---|---|---|---|---|---|---|
| `RECEIPT_IN` | + | No | Yes | Yes | No | No | Yes |
| `SHIPMENT_OUT` | - | Yes | No | Yes | Consume/release | No | Yes |
| `MOVE` | signed internal pair logic | Yes | Yes | Yes | No | No | Yes |
| `STATUS_CHANGE` | same qty reclass | Yes | Yes | Yes | No | Yes nếu manual | Yes |
| `ADJUSTMENT` | +/- | No/Yes | Yes/No | Yes | No | Yes | Yes |
| `COUNT_GAIN` | + | No | Yes | Yes | No | Yes | Yes |
| `COUNT_LOSS` | - | Yes | No | Yes | No | Yes | Yes |
| `VAS_CONSUME` | - | Yes | No | Yes | No | No | Yes |
| `VAS_PRODUCE` | + | No | Yes | Yes | No | No | Yes |

### Khuyến nghị kỹ thuật

- `MOVE` và `STATUS_CHANGE` có thể lưu **1 row có cả from/to** thay vì 2 row paired-entry để Phase 1 đơn giản hơn, nhưng phải chuẩn hóa duy nhất một cách.
- Nếu team muốn paired-entry cho dễ aggregate từng phía, phải áp dụng nhất quán cho toàn bộ transaction type từ Sprint 1. Không được nửa này 1 row, nửa kia 2 row.

**Khuyến nghị cuối cho đội nhỏ:**
- Phase 1 nên dùng **1 row / 1 business movement**, có `dim_from_id`, `dim_to_id`, `qty signed`, `trans_type` rõ ràng.
- Aggregate `on_hand` dựa trên rule `trans_type` + from/to impact, không chỉ dựa vào sign mù quáng.

---

## 13. Thiết kế API chi tiết cho Module 3

Nguyên tắc API:

- Tách **command API** và **query API**.
- Mọi API side effect phải dùng idempotency.
- Mọi command phải audit.
- Không expose API nào cho phép sửa trực tiếp ledger hoặc on-hand.

## 13.1 `POST /api/v1/inventory/postings`

### Mục đích
Tạo inventory transaction từ business event hợp lệ.

### API này để làm gì
Đây là cổng vào duy nhất để M4/M5/M6/M7/M9 hoặc integration layer yêu cầu Module 3 ghi nhận biến động tồn kho.

### Ai gọi
- M4 Inbound
- M5 Outbound
- M6 Inventory Control
- M7 Work Execution
- M9 VAS
- internal trusted services / integration adapters

### Request body gợi ý

```json
{
  "external_id": "evt-ship-001-line-01",
  "correlation_id": "corr-20260308-001",
  "event_code": "SHIPMENT_SHIPPED",
  "ref_type": "SHIPMENT",
  "ref_id": "SHP-20260308-000001",
  "ref_line_id": "LINE-01",
  "item_id": "uuid-item-1",
  "qty": "25000.000",
  "uom_code": "KG",
  "dim_from": {
    "site_code": "TVL-SITE",
    "warehouse_code": "WH5.1",
    "location_code": "STORAGE-A1",
    "owner_code": "CUST001",
    "status_code": "AVAILABLE"
  },
  "source_app": "API",
  "posted_by": "user-uuid"
}
```

### Hướng build

1. validate DTO
2. check permission `inventory.post`
3. idempotency acquire bằng `external_id`
4. validate `event_code`
5. validate source object fields
6. resolve item/uom/dimension
7. pre-check on-hand nếu event làm giảm physical
8. generate `trans_id`
9. insert `invent_trans`
10. update `on_hand`
11. audit
12. store idempotency result

### Response gợi ý

```json
{
  "trans_id": "TRX-20260308-000123",
  "trans_type": "SHIPMENT_OUT",
  "idempotent_replay": false,
  "on_hand_after": {
    "physical_qty": "5000.000",
    "reserved_qty": "0.000",
    "available_qty": "5000.000"
  }
}
```

### Error cases

- `400` invalid payload
- `403` không có quyền
- `409` same external_id different payload
- `409` stale processing / duplicate in-flight
- `422` invalid dimension/master/state
- `422` insufficient available/physical

---

## 13.2 `POST /api/v1/inventory/postings/reverse`

### Mục đích
Reverse một transaction đã post mà không sửa ledger gốc.

### API này để làm gì
Dùng cho correction sau post: cân sai, post sai location, ship sai qty, adjustment sai.

### Request body gợi ý

```json
{
  "external_id": "reverse-trx-000123",
  "correlation_id": "corr-rev-001",
  "original_trans_id": "TRX-20260308-000123",
  "reason_code": "DOCUMENT_ERROR",
  "note": "Posted wrong location"
}
```

### Hướng build

1. permission `inventory.reverse`
2. reason_code required
3. load original trans
4. validate not already reversed in forbidden way
5. run reversal transaction
6. write reversal link
7. update on_hand
8. audit cả original + reversal

### Response gợi ý

```json
{
  "original_trans_id": "TRX-20260308-000123",
  "reversal_trans_id": "TRX-20260308-000124"
}
```

---

## 13.3 `GET /api/v1/inventory/onhand`

### Mục đích
Query tồn hiện tại theo item/owner/warehouse/location/status.

### API này để làm gì
Cho outbound allocation, inventory inquiry, ops dashboard, reporting lightweight.

### Query params gợi ý
- `item_code`
- `owner_code`
- `warehouse_code`
- `location_code`
- `status_code`
- `page`
- `page_size`

### Hướng build

- read-only query
- join `on_hand` + `invent_dim` + master minimal fields
- owner-scope enforcement nếu role là `CUST_VIEWER`
- trả `physical_qty`, `reserved_qty`, `available_qty`

### Response gợi ý

```json
{
  "items": [
    {
      "item_code": "ITEM001",
      "owner_code": "CUST001",
      "warehouse_code": "WH5.1",
      "location_code": "STORAGE-A1",
      "status_code": "AVAILABLE",
      "physical_qty": "30000.000",
      "reserved_qty": "10000.000",
      "available_qty": "20000.000"
    }
  ]
}
```

---

## 13.4 `GET /api/v1/inventory/onhand/history`

### Mục đích
Tra lịch sử biến động theo filter vận hành.

### API này để làm gì
Cho inventory investigation, audit support, dispute analysis.

### Hướng build

- query `invent_trans` theo item/owner/ref/date/trans_type
- pagination bắt buộc
- sort mặc định `posted_at desc`
- không trả payload quá nặng

---

## 13.5 `GET /api/v1/inventory/transactions/:transId`

### Mục đích
Xem chi tiết một transaction.

### Dùng khi nào
Drill-down từ on-hand history, audit, reconciliation mismatch.

### Hướng build

- join `invent_trans` + dims from/to + reversal link
- trả source references, reason, actor, correlation

---

## 13.6 `POST /api/v1/inventory/holds`

### Mục đích
Tạo hold / reserve stock cho outbound allocation.

### API này để làm gì
M5 gọi khi confirm allocation line.

### Request body gợi ý

```json
{
  "external_id": "hold-ship-001-line-01",
  "correlation_id": "corr-hold-001",
  "shipment_id": "SHP-20260308-000001",
  "shipment_line_id": "LINE-01",
  "item_id": "uuid-item-1",
  "qty": "10000.000",
  "dim": {
    "site_code": "TVL-SITE",
    "warehouse_code": "WH5.1",
    "location_code": "STORAGE-A1",
    "owner_code": "CUST001",
    "status_code": "AVAILABLE"
  }
}
```

### Hướng build

- lock `on_hand` row
- validate available đủ
- insert hold row
- increase reserved_qty
- decrease available_qty
- audit

---

## 13.7 `POST /api/v1/inventory/holds/:holdId/release`

### Mục đích
Release hold khi unallocate/cancel/ship consume.

### Hướng build

- load hold active
- lock on_hand row
- giảm reserved / tăng available
- update hold status
- audit

---

## 13.8 `POST /api/v1/inventory/reconciliation/run`

### Mục đích
Chạy reconciliation on-demand.

### Dùng khi nào
Ops/QA/Audit chạy đối soát theo kho hoặc theo item khi nghi ngờ lệch dữ liệu.

### Hướng build

- command có side effect nhẹ nhưng cần audit
- tạo `inventory_reconciliation_run`
- enqueue job hoặc chạy sync nếu scope nhỏ
- trả `run_no`

---

## 13.9 `GET /api/v1/inventory/reconciliation/results`

### Mục đích
Xem kết quả reconciliation.

### Query params
- `run_no`
- `severity`
- `warehouse_code`
- `item_code`
- `owner_code`

---

## 13.10 `POST /api/v1/inventory/snapshots/daily`

### Mục đích
Sinh snapshot cuối ngày cho billing/reporting.

### Dùng khi nào
Job scheduler hoặc authorized user chạy manual/rerun.

### Hướng build

- command API, nên queue batch
- create snapshot run header
- aggregate theo cut-off
- insert rows into `daily_storage_snapshot`
- return `run_no` + `version_no`

---

## 13.11 `GET /api/v1/inventory/snapshots/daily`

### Mục đích
Đọc snapshot theo ngày/kho/owner/item.

### Dùng khi nào
Billing, reporting, ops review.

---

## 14. Validation rule chi tiết theo API

## 14.1 Với `POST /inventory/postings`

- `external_id` bắt buộc
- `correlation_id` bắt buộc
- `ref_type`, `ref_id`, `item_id`, `qty`, `uom` bắt buộc
- `qty > 0` theo payload business; signed direction do engine map hoặc cho phép signed nếu đã chốt rõ contract
- event phải tồn tại trong mapping
- item/owner/location/status phải active và hợp lệ
- nếu event làm giảm stock thì source dim phải có tồn đủ
- nếu event là adjustment/reversal/manual status change thì `reason_code` bắt buộc

## 14.2 Với `POST /inventory/postings/reverse`

- original trans phải tồn tại
- original trans phải reversible
- `reason_code` bắt buộc
- role phải có quyền reverse

## 14.3 Với `POST /inventory/holds`

- status phải là `AVAILABLE`
- available_qty đủ
- shipment line chưa closed/cancelled
- không trùng hold bởi cùng external_id

## 14.4 Với `POST /inventory/reconciliation/run`

- scope hợp lệ
- chỉ role được phép mới chạy full-warehouse/full-owner cross-scope

## 14.5 Với `POST /inventory/snapshots/daily`

- snapshot_date hợp lệ
- không cho rerun đè version cũ
- nếu rerun phải sinh version mới

---

## 15. Error code & exception model khuyến nghị

| Error code | Ý nghĩa | Khi nào xảy ra |
|---|---|---|
| `INV_DUPLICATE_EXTERNAL_ID` | duplicate same key | retry key đã tồn tại |
| `INV_IDEMPOTENCY_CONFLICT` | same key khác payload | cần chặn cứng |
| `INV_INVALID_EVENT_CODE` | event không hợp lệ | mapping không tồn tại |
| `INV_INVALID_DIMENSION` | dim không hợp lệ | owner/location/status sai |
| `INV_MASTER_INACTIVE` | master inactive | item/location/owner/status inactive |
| `INV_INSUFFICIENT_STOCK` | không đủ tồn | posting outbound/move/hold |
| `INV_NEGATIVE_STOCK_BLOCKED` | sẽ âm tồn | policy chặn |
| `INV_REVERSAL_NOT_ALLOWED` | không được reverse | policy / state vi phạm |
| `INV_ALREADY_REVERSED` | đã reverse | tránh reverse lặp sai |
| `INV_HOLD_NOT_FOUND` | hold không tồn tại | release/consume lỗi |
| `INV_LOCK_TIMEOUT` | lock row timeout | concurrent allocation/posting |
| `INV_RECON_SCOPE_INVALID` | scope reconcile không hợp lệ | request sai |
| `INV_SNAPSHOT_VERSION_CONFLICT` | conflict rerun snapshot | version logic |

### Gợi ý phản hồi lỗi

```json
{
  "error_code": "INV_INSUFFICIENT_STOCK",
  "message": "Insufficient available stock for allocation/posting.",
  "details": {
    "item_code": "ITEM001",
    "available_qty": "5000.000",
    "requested_qty": "10000.000"
  },
  "correlation_id": "corr-123"
}
```

---

## 16. Permission matrix mức action inventory

| Action | Permission code gợi ý | Role tối thiểu |
|---|---|---|
| Post inventory transaction | `inventory.post` | system/internal + manager-authorized flow |
| Reverse inventory transaction | `inventory.reverse` | `WH_MANAGER` |
| Create hold | `inventory.hold.create` | outbound service / authorized ops |
| Release hold | `inventory.hold.release` | outbound service / `WH_MANAGER` |
| View on-hand | `inventory.onhand.view` | ops roles + scoped viewer |
| View transaction history | `inventory.transaction.view` | ops roles + audit roles |
| Run reconciliation | `inventory.reconcile.run` | `WH_MANAGER`, `OPS_SUPER`, audit |
| View reconciliation results | `inventory.reconcile.view` | manager/audit |
| Run daily snapshot | `inventory.snapshot.run` | billing batch / ops authorized |
| View daily snapshot | `inventory.snapshot.view` | billing/ops/reporting |

### Lưu ý

- enforcement thực hiện bởi Module 1, nhưng Module 3 phải khai báo rõ action-level permission needs.
- `CUST_VIEWER` chỉ nên có quyền query on-hand đã scope theo owner, không xem toàn bộ transaction cross-owner.

---

## 17. Reconciliation policy khuyến nghị

## 17.1 Rule nền

1. `physical_qty == SUM(trans.qty where stage = PHYSICAL)`
2. `available_qty == physical_qty - reserved_qty`
3. `physical_qty >= 0` nếu Phase 1 không cho âm tồn
4. không có UPDATE/DELETE trên `invent_trans`
5. snapshot phải khớp với transaction truth đến cut-off

## 17.2 Tần suất

- realtime check: available formula, no negative stock
- scheduled: daily reconciliation full warehouse
- on-demand: by warehouse/item/owner

## 17.3 Mức severity

- `CRITICAL`: ledger và on_hand lệch physical
- `HIGH`: available formula sai
- `MEDIUM`: hold inconsistency
- `INFO`: non-blocking anomaly nhỏ

## 17.4 Hành vi khi mismatch

- log `inventory_reconciliation_result`
- tạo exception/audit event
- không auto-heal ở Phase 1 nếu chưa có policy chốt
- cho phép rerun sau khi điều tra/correction

---

## 18. Daily snapshot policy khuyến nghị

## 18.1 Mục tiêu

Tạo đầu vào ổn định cho billing storage/reporting theo ngày.

## 18.2 Công thức baseline

- `opening_qty`: closing ngày trước hoặc rebuild từ ledger tại đầu ngày
- `inbound_today_qty`: tổng inbound/movement-in có ảnh hưởng inventory theo policy
- `outbound_today_qty`: tổng outbound/movement-out theo policy
- `closing_qty`: tồn tại cut-off

## 18.3 Quy tắc kỹ thuật

- cut-off mặc định `23:59` local warehouse time
- rerun tạo version mới, không đè bản cũ
- snapshot đã dùng cho billing phải truy được version và nguồn run
- ngày không phát sinh vẫn nên có row carry-forward nếu billing cần continuity

## 18.4 Điều cần chốt thêm với BA/Billing

1. storage fee tính theo `opening + inbound_today` hay công thức nào là final
2. transfer nội bộ có vào snapshot billing không
3. rerun snapshot sau correction ảnh hưởng debit note đã lock ra sao

---

## 19. NFR cho Module 3

### 19.1 Integrity
- immutable ledger
- reverse-only correction
- atomic posting + on-hand update

### 19.2 Reliability
- retry-safe bằng idempotency
- stale processing recovery job
- lock timeout handling rõ ràng

### 19.3 Performance
- query on-hand phải nhanh cho allocation
- index đúng cho history lookup
- snapshot/reconcile chạy batch

### 19.4 Concurrency
- allocation dùng row-level lock
- posting cùng stock pool không gây double spend
- sequence trans_id thread-safe

### 19.5 Auditability
- mọi trans/reverse/hold/reconcile/snapshot đều có correlation_id
- actor, source_app, reason_code rõ ràng

### 19.6 Extensibility
- chừa slot cho batch/lot/LPN/serial phase sau
- tách policy/mapping để dễ thêm trans type mới

---

## 20. Cấu trúc migration và seeding nên làm

### 20.1 Migration order khuyến nghị

1. create `invent_dim`
2. create `invent_trans`
3. create `on_hand`
4. create `inventory_hold`
5. create `inventory_reversal_link`
6. create `inventory_reconciliation_run`
7. create `inventory_reconciliation_result`
8. create `inventory_snapshot_run`
9. create `daily_storage_snapshot`
10. create `inventory_event_mapping`
11. add indexes / constraints / triggers

### 20.2 Seed data nên có ngay

- inventory event mapping baseline
- trans type enums / code tables nếu team dùng lookup table
- scheduled job definitions cơ bản

---

## 21. Gợi ý Prisma schema ở mức tư duy

```prisma
model InventDim {
  id                String   @id @default(uuid())
  dimId             String   @unique
  dimHash           String   @unique
  siteId            String
  warehouseId       String
  locationId        String
  ownerId           String
  inventoryStatusId String
  createdAt         DateTime @default(now())
}

model InventTrans {
  id               String   @id @default(uuid())
  transId          String   @unique
  refType          String
  refId            String
  refLineId        String?
  transType        String
  itemId           String
  qty              Decimal
  uomId            String
  dimFromId        String?
  dimToId          String?
  stage            String
  externalId       String
  correlationId    String
  reasonCode       String?
  sourceApp        String
  postedBy         String?
  postedAt         DateTime
  ownerId          String
  isReversal       Boolean  @default(false)
  reversalOfTransId String?
  createdAt        DateTime @default(now())

  @@index([refType, refId, refLineId])
  @@index([itemId, postedAt])
  @@index([ownerId, postedAt])
}

model OnHand {
  id            String   @id @default(uuid())
  itemId        String
  inventDimId   String
  physicalQty   Decimal  @default(0)
  reservedQty   Decimal  @default(0)
  availableQty  Decimal  @default(0)
  orderedQty    Decimal  @default(0)
  uomId         String
  lastMovementAt DateTime?
  lastCountAt   DateTime?
  updatedAt     DateTime @updatedAt
  rowVersion    BigInt   @default(0)

  @@unique([itemId, inventDimId])
}
```

---

## 22. Quy trình build đề xuất cho team dev intern

## 22.1 Thứ tự build

### Bước 1 — Backbone tối thiểu
- invent_dim
- invent_trans
- on_hand
- trans sequence `TRX`
- posting API tối thiểu
- on-hand query tối thiểu

### Bước 2 — Safety
- idempotency integration
- audit integration
- immutability trigger
- negative stock pre-check

### Bước 3 — Inventory operations
- reverse API
- hold create/release
- history query

### Bước 4 — Control layer
- reconciliation run/result
- snapshot run/read

### Bước 5 — Hardening
- concurrency tests
- performance tuning
- partition/index review

## 22.2 Cách chia task code

- Dev A: schema + migrations + repositories
- Dev B: posting engine + dim service + on_hand service
- Dev C: hold + query + history
- Dev D: reconciliation + snapshot + jobs
- Lead: design review + lock policy + trigger + integration contract

---

## 23. Test case bắt buộc cho QA/dev

### 23.1 Happy path
1. receipt received → tăng tồn receiving
2. putaway complete → chuyển receiving sang storage
3. hold create → reserved tăng, physical giữ nguyên
4. shipment shipped → physical giảm, hold consume/release
5. reverse shipment → tồn hồi đúng

### 23.2 Exception path
1. duplicate external_id
2. same external_id khác payload
3. source dim không đủ stock
4. status không allocatable vẫn cố hold
5. reverse thiếu reason code
6. post event sai state

### 23.3 Concurrency
1. 2 allocation cùng stock pool
2. 2 shipment ship cùng row tồn
3. concurrent get-or-create invent_dim

### 23.4 Data control
1. reconcile pass
2. reconcile mismatch
3. rerun snapshot version 2
4. `invent_trans` update/delete bị DB trigger chặn

---

## 24. Những quyết định cần chốt sớm trước khi code sâu

1. `MOVE` lưu 1 row hay 2 row paired-entry.
2. Có dùng `EXPECTED`/`ORDERED` thật ở Phase 1 hay giữ tối giản chỉ `PHYSICAL`.
3. Transfer có xử lý `IN_TRANSIT` bằng 1 hay 2 posting points chi tiết.
4. Snapshot cut-off có configurable theo kho không.
5. Negative stock có chặn tuyệt đối hay chừa override cho role đặc biệt.
6. Hold consume khi ship sẽ release trước rồi trừ physical hay xử lý gộp một transaction service.
7. Packaging material trong VAS có track inventory đầy đủ hay chỉ limited artifact.

---

## 25. Kết luận kiến trúc

Module 3 phải được hiểu là **trái tim dữ liệu vận hành của SWM**.

Nếu build đúng, team sẽ có:
- transaction truth rõ ràng,
- tồn kho query nhanh nhưng vẫn truy ngược được,
- outbound allocation an toàn,
- correction không phá lịch sử,
- billing có snapshot đáng tin,
- reporting/audit có backbone đúng.

Nếu build sai, hệ thống sẽ rất dễ rơi vào tình trạng:
- có đủ receipt/shipment/work nhưng sai tồn,
- duplicate posting khi retry,
- on-hand lệch ledger,
- billing không đáng tin,
- rất khó audit và khó mở rộng.

Vì vậy, mọi thiết kế DB, backend, API của Module 3 phải luôn giữ 1 nguyên lý không được phá vỡ:

> **Document phát sinh nghiệp vụ, nhưng `InventDim → InventTrans → OnHand` mới là nguồn sự thật của hệ thống.**

