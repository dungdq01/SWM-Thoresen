# TVL SWM — Module 2 Tech Stack & Backend Design
# Master Data Management

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-08  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, Ops, Data Migration Team  
**Mục tiêu:** Chuyển hóa Module 2 spec thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, import engine, validation engine và tích hợp liên module.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module 2 — Master Data Management Spec** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev, đặc biệt là dev intern, có thể hiểu rõ:

- Module 2 thực chất phải build những gì ở Phase 1.
- Phần nào là runtime feature thật sự phải code.
- Luồng từ **database → repository → service → validation → API** nên tổ chức ra sao.
- Thiết kế database như thế nào để vừa đúng Phase 1 vừa không phá khả năng scale cho Module 3, 4, 5, 7, 9, 10.
- Từng API dùng để làm gì, input/output như thế nào, validate gì, audit gì, idempotency ra sao.
- Cách Module 2 ánh xạ với **Module 1** và với các module downstream.
- Cách build import preview / import commit / usage impact check / lookup APIs đúng chuẩn enterprise nhưng vẫn phù hợp đội dev nhỏ.

Tài liệu này lấy các nguồn sau làm baseline chính:
- **Module 2 revised spec**: phạm vi, rule nghiệp vụ, import, governance, downstream mapping. fileciteturn4file0 fileciteturn4file8 fileciteturn4file14
- **Module 1 spec**: RBAC, audit, reason code, idempotency, sequence, shared governance layer. fileciteturn3file1
- **Overview toàn hệ thống**: vị trí Module 2 trong 11 module và quan hệ phụ thuộc. fileciteturn4file10 fileciteturn4file3
- **Module 1 tech stack**: hướng kỹ thuật nền cho control platform gồm NestJS modular monolith + PostgreSQL + Redis, shared services, guard/service/repository pattern. fileciteturn4file1 fileciteturn4file5 fileciteturn4file9

---

## 2. Baseline kỹ thuật rút ra từ spec

Từ bộ tài liệu hiện tại, có thể chốt 12 kết luận kỹ thuật quan trọng cho Module 2:

1. **Module 2 là data foundation của toàn hệ thống**, không phải chỉ là màn CRUD danh mục. Nó cấp dữ liệu gốc cho inventory, inbound, outbound, work execution, VAS và billing. fileciteturn4file10
2. **Module 2 sở hữu master definitions**, không sở hữu runtime transaction records. `invent_dim`, `invent_trans`, `on_hand` là của Module 3; billing event/debit note là của Module 10. fileciteturn4file13
3. **Owner là dimension bắt buộc của tồn kho Phase 1**, nên design master data phải luôn nghĩ đến segregation theo owner. fileciteturn4file0
4. **Inventory status Phase 1 chỉ có 4 giá trị** và semantics của status không được tùy ý thay đổi qua UI. fileciteturn4file10
5. **Mọi side-effect API của Module 2 phải idempotent**, đặc biệt create/update/deactivate/reactivate/import commit. fileciteturn4file0
6. **Module 2 phải kế thừa Module 1** cho authorization, audit, exception logging, idempotency và rule baseline. fileciteturn3file1 fileciteturn4file5
7. **Thiết kế DB phải theo hướng platform data**, không được làm từng bảng kiểu màn hình nào biết màn hình đó.
8. **Soft delete / inactive flag là chuẩn mặc định**, không hard delete các record đã từng được tham chiếu. fileciteturn4file8
9. **Import là capability lõi của Module 2**, không phải tiện ích phụ. Import phải có preview, validate theo dòng, cross-reference check, commit mode, batch log và export lỗi. fileciteturn4file0
10. **Các field nhạy cảm sau khi đã có giao dịch phải bị khóa mềm hoặc đi qua controlled change**, ví dụ `item.cargo_form`, `item.billing_uom`, `location.zone_code`, key fields của `rate_reference`. fileciteturn4file0
11. **Billing reference baseline trong M2 chỉ là commercial reference**, không phải charge engine. Vì vậy schema phải đủ để M10 lookup deterministic nhưng không trộn tính phí runtime vào M2. fileciteturn4file0
12. **Data model của Module 2 phải chuẩn bị sẵn cho scale**, vì tất cả module sau đều phụ thuộc vào semantic và reference của nó. fileciteturn4file14

---

## 3. Phạm vi build thực tế của Module 2 dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1
1. Owner / Customer master
2. Vendor / Counterparty master
3. Item / SKU master
4. Warehouse master
5. Zone master
6. Location master
7. Vehicle type master
8. UOM master
9. UOM conversion master
10. Inventory status baseline
11. Billing reference baseline: service_code, day_type, rate_reference
12. Owner-item policy
13. Master data import engine
14. Validation engine
15. Usage impact check trước khi deactivate
16. Lookup APIs cho dropdown/reference
17. Audit integration với Module 1
18. Idempotency integration với Module 1
19. Owner-scope query enforcement với Customer Viewer

### 3.2 Các phần không nên build quá tay ở Phase 1
1. Không build workflow approval engine tổng quát cho master changes.
2. Không build MDM hub đồng bộ đa hệ thống.
3. Không build pricing engine trong Module 2.
4. Không build rule engine động phức tạp cho import transform.
5. Không build UI graph/warehouse map 2D/3D nếu backlog chưa giao.
6. Không build generalized data catalog portal riêng cho business.

### 3.3 Diễn giải để dev intern không build nhầm
- **Có build** backend chuẩn để downstream module dùng master data ổn định.
- **Có build** import preview, commit, error report, usage check.
- **Có build** active/inactive policy, controlled update policy, optimistic concurrency.
- **Không build** runtime inventory posting ở Module 2.
- **Không build** charge calculation runtime ở Module 2.
- **Không build** process governance chỉ có tính quản trị nếu chưa nằm trong scope kỹ thuật.

---

## 4. Khuyến nghị tech stack chính thức cho Module 2

Để đồng bộ với Module 1 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau:

### 4.1 Backend
- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI/Swagger

### 4.2 Database
- **Primary DB:** PostgreSQL
- **Cache + hot lookups:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 File / import processing
- **Template file format:** Excel `.xlsx` và CSV
- **Parser:** SheetJS / ExcelJS
- **Temporary storage:** local volume ở dev, S3-compatible ở SIT/UAT/Prod

### 4.4 Observability
- Structured logging bằng Pino/Winston JSON
- Correlation ID xuyên request/import batch
- Metrics cho import throughput, validation error rate, API latency

### 4.5 Testing
- Unit test: Jest/Vitest
- Integration test: Nest + test DB
- API test: supertest
- Import golden-file test: dùng file mẫu pass/fail

### 4.6 Vì sao nên giữ cùng stack với Module 1
Module 1 đã khuyến nghị **NestJS modular monolith + PostgreSQL + Redis**, và coi authorization + audit + idempotency là shared foundation. Module 2 nên bám cùng stack để tái sử dụng guard/service/repository/infrastructure, tránh tạo tech split không cần thiết. fileciteturn4file1 fileciteturn4file9

---

## 5. Kiến trúc tổng thể Module 2 trong hệ backend

```text
Client / Web Admin / Import User / Internal Services
                    |
                    v
               NestJS Controllers
                    |
   +----------------+-------------------------------+
   |                |               |               |
   v                v               v               v
Auth Guard     Permission Guard   Idempotency     Request Context
                                  Guard/Service
                    |
                    v
             Application Services
+-------------------+-------------------+---------------------+
|                   |                   |                     |
Owner Service   Item Service       Location Service      Import Service
Vendor Service  Warehouse Service  BillingRef Service    Lookup Service
UOM Service     Zone Service       OwnerItemPolicy       UsageCheck Service
                    |
                    v
             Validation / Policy Layer
+-------------------+-------------------+---------------------+
| Field Validator   | Cross-Ref Validator | Immutable Field Policy |
| Deactivate Policy | Scope Policy        | Import Rule Resolver   |
+-------------------+-------------------+---------------------+
                    |
                    v
                Repository Layer
                    |
                    v
       PostgreSQL + Redis + Queue + File Storage
```

### 5.1 Tư tưởng tổ chức
- **Guard layer**: auth, permission, owner scope, idempotency cơ bản.
- **Service layer**: business logic của từng master entity.
- **Validation/policy layer**: tập trung rule field-level, cross-reference, active/inactive, immutable-after-use.
- **Repository layer**: query/CRUD thuần.
- **Import service**: không nên nhét vào từng service entity riêng lẻ; cần một orchestration riêng.
- **Lookup service**: gom các API tham chiếu cho UI/autocomplete/dropdown để tránh lặp logic.
- **Usage check service**: kiểm tra trước deactivate/reactivate/update controlled field.

---

## 6. Phân ranh runtime ownership giữa Module 2 và các module khác

| Concern | Module 2 sở hữu | Module khác sở hữu |
|---|---|---|
| Owner/vendor/item/warehouse/zone/location definitions | Có | Không |
| UOM, UOM conversion, inventory status baseline | Có | Không |
| Billing reference baseline | Có | M10 chỉ consume |
| Owner-item operational override | Có | M4/M5/M10 consume |
| Import preview/commit cho master data | Có | Không |
| Cross-reference validation của master | Có | Không |
| Tạo `invent_dim` runtime | Không | Module 3 |
| Ghi `invent_trans`, cập nhật `on_hand` | Không | Module 3 |
| Receipt/shipment runtime state machine | Không | M4/M5 |
| Putaway/pick work runtime | Không | M7 |
| Charge calculation runtime | Không | M10 |
| Authorization/audit/idempotency framework | Không, chỉ consume | Module 1 |

Điều này bám đúng nguyên tắc “M2 owns master definitions; M3/M10 owns runtime records”. fileciteturn4file13

---

## 7. Đề xuất cấu trúc code backend cho Module 2

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
  modules/
    master-data/
      master-data.module.ts
      controllers/
        owner.controller.ts
        vendor.controller.ts
        item.controller.ts
        warehouse.controller.ts
        zone.controller.ts
        location.controller.ts
        vehicle-type.controller.ts
        uom.controller.ts
        inventory-status.controller.ts
        billing-reference.controller.ts
        owner-item-policy.controller.ts
        import.controller.ts
        lookup.controller.ts
      services/
        owner.service.ts
        vendor.service.ts
        item.service.ts
        warehouse.service.ts
        zone.service.ts
        location.service.ts
        vehicle-type.service.ts
        uom.service.ts
        inventory-status.service.ts
        service-code.service.ts
        day-type.service.ts
        rate-reference.service.ts
        owner-item-policy.service.ts
        master-import.service.ts
        master-import-preview.service.ts
        usage-impact.service.ts
        lookup.service.ts
        validation.service.ts
        deactivate-policy.service.ts
        immutable-field-policy.service.ts
      repositories/
        owner.repository.ts
        vendor.repository.ts
        item.repository.ts
        warehouse.repository.ts
        zone.repository.ts
        location.repository.ts
        vehicle-type.repository.ts
        uom.repository.ts
        uom-conversion.repository.ts
        inventory-status.repository.ts
        service-code.repository.ts
        day-type.repository.ts
        rate-reference.repository.ts
        owner-item-policy.repository.ts
        master-import.repository.ts
      dto/
      entities/
      mappers/
      policies/
      jobs/
        import-cleanup.job.ts
        cache-refresh.job.ts
        import-report.job.ts
```

### 7.1 Quy tắc code structure bắt buộc
- Controller không chứa business rule nặng.
- Service xử lý orchestration.
- Validation và policy không copy-paste giữa các service.
- Repository chỉ query/CRUD.
- DTO tách create/update/list/filter/import-preview/import-commit.
- Shared Module 1 services được inject qua interface hoặc shared module: `AuthorizationService`, `AuditService`, `IdempotencyService`, `RuleCatalogService`.

---

## 8. Thiết kế database tổng thể cho Module 2

## 8.1 Nguyên tắc DB design
1. Mỗi entity có `id` UUID làm PK kỹ thuật. fileciteturn4file14
2. Mỗi mã nghiệp vụ là unique business key. fileciteturn4file8
3. Dùng soft delete / inactive flag mặc định. fileciteturn4file14
4. Mọi bảng master có audit fields chuẩn: `created_at`, `created_by`, `updated_at`, `updated_by`, `is_active`, `deactivated_at`, `deactivated_by`, `row_version`. fileciteturn4file8
5. Tách bảng config/master và bảng import runtime.
6. Tách semantics ổn định và quan hệ override để tránh phá global model.
7. Composite unique key phải đi theo nghĩa nghiệp vụ, không chỉ theo UI form.
8. Không hard delete record đã từng được tham chiếu. fileciteturn4file0
9. Thiết kế index phục vụ list/search/filter phổ biến ngay từ đầu.
10. Phải nghĩ đến downstream joins với M3/M4/M5/M10.

---

## 8.2 Danh sách bảng đề xuất

### 8.2.1 Business master
- `md_owner`
- `md_vendor`
- `md_item`
- `md_warehouse`
- `md_zone`
- `md_location`
- `md_vehicle_type`
- `md_uom`
- `md_uom_conversion`
- `md_inventory_status`
- `md_service_code`
- `md_day_type`
- `md_rate_reference`
- `md_owner_item_policy`

### 8.2.2 Runtime support cho import
- `md_import_batch`
- `md_import_batch_line`
- `md_import_error`
- `md_import_file`

### 8.2.3 Optional support tables nên có ngay
- `md_lookup_cache_version`
- `md_data_readiness_snapshot`
- `md_entity_usage_summary` *(nếu muốn cache usage impact nặng về sau)*

---

## 8.3 Thiết kế chi tiết từng bảng cốt lõi

### 8.3.1 `md_owner`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| owner_code | VARCHAR(50) | UNIQUE NOT NULL | business key |
| owner_name | VARCHAR(255) | NOT NULL | |
| short_name | VARCHAR(100) | NOT NULL | |
| owner_group | VARCHAR(100) | NOT NULL | |
| owner_type | VARCHAR(30) | NOT NULL | DIRECT / CONSIGNED / OTHER |
| tax_code | VARCHAR(50) | NOT NULL | |
| address | TEXT | NOT NULL | |
| billing_email | VARCHAR(255) | NULL | |
| billing_contact | VARCHAR(255) | NULL | |
| payment_terms | VARCHAR(30) | NULL | |
| default_tolerance_pct | NUMERIC(8,4) | NULL | fallback tolerance |
| default_warehouse_id | UUID | FK NULL | → md_warehouse |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | optimistic lock |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | from M1 |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Index:** unique(`owner_code`), index(`owner_group`,`is_active`)

---

### 8.3.2 `md_vendor`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| vendor_code | VARCHAR(50) | UNIQUE NOT NULL | |
| vendor_name | VARCHAR(255) | NOT NULL | |
| supplier_group | VARCHAR(30) | NOT NULL | DOMESTIC / OVERSEAS / VESSEL_AGENT / TRADER |
| country_region | VARCHAR(50) | NULL | |
| vessel_name | VARCHAR(255) | NULL | only meaningful for VESSEL_AGENT |
| contact_name | VARCHAR(255) | NULL | |
| phone | VARCHAR(50) | NULL | |
| email | VARCHAR(255) | NULL | |
| tax_code | VARCHAR(50) | NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

---

### 8.3.3 `md_item`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| item_code | VARCHAR(50) | UNIQUE NOT NULL | global key theo baseline build |
| item_name | VARCHAR(255) | NOT NULL | |
| item_name_en | VARCHAR(255) | NULL | |
| alt_item_code | VARCHAR(100) | NULL | |
| product_group | VARCHAR(100) | NULL | |
| cargo_form | VARCHAR(30) | NOT NULL | BULK/BAGGED_25KG/... |
| category | VARCHAR(100) | NULL | |
| is_packaging | BOOLEAN | NOT NULL DEFAULT false | |
| base_uom_id | UUID | FK NOT NULL | → md_uom |
| billing_uom_id | UUID | FK NOT NULL | → md_uom |
| catch_weight_uom_id | UUID | FK NULL | → md_uom |
| std_gross_weight | NUMERIC(18,6) | NULL | |
| std_net_weight | NUMERIC(18,6) | NULL | |
| density_mt_per_m3 | NUMERIC(18,6) | NULL | |
| std_cube_m3 | NUMERIC(18,6) | NULL | |
| tolerance_pct_inbound | NUMERIC(8,4) | NULL | |
| tolerance_pct_outbound | NUMERIC(8,4) | NULL | |
| shrinkage_rate_pct | NUMERIC(8,4) | NULL | |
| rotate_by | VARCHAR(30) | NULL | |
| shelf_life_days | INT | NULL | phase 2-friendly |
| default_zone_id | UUID | FK NULL | → md_zone |
| putaway_strategy_key | VARCHAR(100) | NULL | |
| default_bag_weight_kg | NUMERIC(18,6) | NULL | |
| packaging_material_item_id | UUID | FK NULL | self-reference |
| nominal_qty_per_unit | NUMERIC(18,6) | NULL | |
| hs_code | VARCHAR(50) | NULL | |
| country_of_origin | VARCHAR(50) | NULL | |
| is_catch_weight | BOOLEAN | NOT NULL DEFAULT false | |
| is_storage_billable | BOOLEAN | NOT NULL DEFAULT true | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Index khuyến nghị:**
- unique(`item_code`)
- index(`cargo_form`,`is_active`)
- index(`product_group`,`is_active`)
- index(`is_packaging`,`is_active`)

**Lý do chọn global item key:** spec đã chốt `item_code` là global key và dùng `owner_item_policy` cho override theo owner. fileciteturn3file0

---

### 8.3.4 `md_warehouse`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| warehouse_code | VARCHAR(50) | UNIQUE NOT NULL | |
| warehouse_name | VARCHAR(255) | NOT NULL | |
| site_id | VARCHAR(50) | NOT NULL | Phase 1 default TVL-SITE |
| warehouse_type | VARCHAR(30) | NOT NULL | COVERED / OPEN_YARD / MIXED |
| total_area_m2 | NUMERIC(18,2) | NOT NULL | |
| usable_area_m2 | NUMERIC(18,2) | NULL | |
| max_height_m | NUMERIC(18,2) | NOT NULL | |
| max_capacity_mt | NUMERIC(18,3) | NOT NULL | |
| address | TEXT | NULL | |
| has_weighbridge | BOOLEAN | NOT NULL DEFAULT false | |
| weighbridge_count | INT | NULL | |
| is_bonded | BOOLEAN | NOT NULL DEFAULT false | |
| capacity_warning_pct | NUMERIC(5,2) | NOT NULL | |
| default_receiving_location_id | UUID | FK NULL | → md_location |
| default_staging_location_id | UUID | FK NULL | → md_location |
| default_shipping_location_id | UUID | FK NULL | → md_location |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

---

### 8.3.5 `md_zone`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| zone_code | VARCHAR(50) | NOT NULL | unique in warehouse |
| zone_name | VARCHAR(255) | NOT NULL | |
| zone_type | VARCHAR(30) | NOT NULL | RECEIVING/STORAGE/... |
| is_billing_zone | BOOLEAN | NOT NULL DEFAULT false | |
| billing_rate_zone | VARCHAR(100) | NULL | |
| max_capacity_mt | NUMERIC(18,3) | NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Unique:** (`warehouse_id`,`zone_code`)

---

### 8.3.6 `md_location`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| warehouse_id | UUID | FK NOT NULL | → md_warehouse |
| zone_id | UUID | FK NOT NULL | → md_zone |
| location_code | VARCHAR(50) | NOT NULL | unique in warehouse |
| location_type | VARCHAR(30) | NOT NULL | RECEIVING/STORAGE/STAGING/... |
| location_profile | VARCHAR(50) | NOT NULL | operational profile |
| status | VARCHAR(20) | NOT NULL | OK/HOLD/BLOCKED |
| area_m2 | NUMERIC(18,2) | NULL | |
| max_height_m | NUMERIC(18,2) | NULL | |
| stack_limit_kg | NUMERIC(18,3) | NULL | |
| is_mixed_owner | BOOLEAN | NOT NULL DEFAULT false | |
| is_mixed_product | BOOLEAN | NOT NULL DEFAULT false | |
| is_billing_location | BOOLEAN | NOT NULL DEFAULT false | |
| stacking_rule | VARCHAR(30) | NULL | FLOOR/RACK/PALLET |
| x_coord | NUMERIC(18,6) | NULL | |
| y_coord | NUMERIC(18,6) | NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Unique:** (`warehouse_id`,`location_code`)

**Quan trọng:** luôn validate `zone_id` phải thuộc đúng `warehouse_id`, không tin hoàn toàn vào payload client.

---

### 8.3.7 `md_vehicle_type`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| vehicle_type_code | VARCHAR(50) | UNIQUE NOT NULL |
| vehicle_type_name | VARCHAR(255) | NOT NULL |
| category | VARCHAR(30) | NOT NULL |
| default_tare_weight_kg | NUMERIC(18,3) | NOT NULL |
| max_payload_kg | NUMERIC(18,3) | NOT NULL |
| teu_equivalent | NUMERIC(18,3) | NULL |
| handling_fee_group | VARCHAR(50) | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |
| deactivated_at | TIMESTAMP | NULL |
| deactivated_by | UUID | NULL |

---

### 8.3.8 `md_uom`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| uom_code | VARCHAR(20) | UNIQUE NOT NULL |
| description | VARCHAR(255) | NOT NULL |
| uom_class | VARCHAR(30) | NOT NULL |
| is_base_uom | BOOLEAN | NOT NULL DEFAULT false |
| decimal_precision | SMALLINT | NOT NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |
| deactivated_at | TIMESTAMP | NULL |
| deactivated_by | UUID | NULL |

---

### 8.3.9 `md_uom_conversion`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| from_uom_id | UUID | FK NOT NULL | → md_uom |
| to_uom_id | UUID | FK NOT NULL | → md_uom |
| conversion_factor | NUMERIC(24,12) | NOT NULL | to = from × factor |
| item_id | UUID | FK NULL | null = global |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Unique:** (`from_uom_id`,`to_uom_id`,`item_id`)

---

### 8.3.10 `md_inventory_status`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| status_code | VARCHAR(30) | UNIQUE NOT NULL |
| description | VARCHAR(255) | NOT NULL |
| display_order | SMALLINT | NOT NULL DEFAULT 0 |
| is_allocatable | BOOLEAN | NOT NULL DEFAULT false |
| is_system_locked | BOOLEAN | NOT NULL DEFAULT true |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |

**Seed go-live:** `AVAILABLE`, `DAMAGED`, `BLOCKED`, `IN_TRANSIT`, trong đó chỉ `AVAILABLE` là allocatable. fileciteturn4file10

---

### 8.3.11 `md_service_code`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| service_code | VARCHAR(50) | UNIQUE NOT NULL |
| service_name | VARCHAR(255) | NOT NULL |
| service_group | VARCHAR(30) | NOT NULL |
| default_uom_id | UUID | FK NOT NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |

---

### 8.3.12 `md_day_type`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| day_type_code | VARCHAR(50) | UNIQUE NOT NULL |
| description | VARCHAR(255) | NOT NULL |
| calendar_date | DATE | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |

---

### 8.3.13 `md_rate_reference`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| rate_reference_code | VARCHAR(50) | UNIQUE NOT NULL | |
| owner_id | UUID | FK NOT NULL | |
| service_code_id | UUID | FK NOT NULL | |
| cargo_form | VARCHAR(30) | NOT NULL | |
| billing_uom_id | UUID | FK NOT NULL | |
| warehouse_id | UUID | FK NULL | optional scope |
| day_type_id | UUID | FK NULL | optional scope |
| effective_from | DATE | NOT NULL | |
| effective_to | DATE | NULL | |
| is_taxable | BOOLEAN | NOT NULL DEFAULT true | |
| is_active | BOOLEAN | NOT NULL DEFAULT true | |
| row_version | BIGINT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |
| deactivated_at | TIMESTAMP | NULL | |
| deactivated_by | UUID | NULL | |

**Key design note:** lookup identity tối thiểu theo `owner + service_code + cargo_form + billing_uom + effective_from + warehouse_scope(optional) + day_type(optional)` theo baseline spec. fileciteturn3file0

**Ràng buộc quan trọng:** không cho overlap active date range trên cùng tổ hợp lookup. fileciteturn4file8

PostgreSQL có thể dùng exclusion constraint hoặc trigger validation để enforce.

---

### 8.3.14 `md_owner_item_policy`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| owner_id | UUID | FK NOT NULL |
| item_id | UUID | FK NOT NULL |
| tolerance_pct_inbound_override | NUMERIC(8,4) | NULL |
| tolerance_pct_outbound_override | NUMERIC(8,4) | NULL |
| billing_uom_override_id | UUID | FK NULL |
| is_storage_billable_override | BOOLEAN | NULL |
| preferred_warehouse_id | UUID | FK NULL |
| handling_note | TEXT | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| row_version | BIGINT | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |
| created_by | UUID | NULL |
| updated_at | TIMESTAMP | NOT NULL |
| updated_by | UUID | NULL |
| deactivated_at | TIMESTAMP | NULL |
| deactivated_by | UUID | NULL |

**Unique:** (`owner_id`,`item_id`)

**Mục đích:** chứa override theo owner + item, đúng với baseline spec. fileciteturn3file0

---

### 8.3.15 `md_import_batch`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| batch_no | VARCHAR(50) | UNIQUE NOT NULL |
| entity_name | VARCHAR(50) | NOT NULL |
| template_version | VARCHAR(20) | NOT NULL |
| file_name | VARCHAR(255) | NOT NULL |
| file_storage_key | VARCHAR(255) | NULL |
| import_mode | VARCHAR(20) | NOT NULL |
| all_or_nothing | BOOLEAN | NOT NULL DEFAULT false |
| status | VARCHAR(30) | NOT NULL |
| total_rows | INT | NOT NULL DEFAULT 0 |
| success_rows | INT | NOT NULL DEFAULT 0 |
| failed_rows | INT | NOT NULL DEFAULT 0 |
| skipped_rows | INT | NOT NULL DEFAULT 0 |
| started_at | TIMESTAMP | NULL |
| completed_at | TIMESTAMP | NULL |
| requested_by | UUID | NULL |
| correlation_id | VARCHAR(100) | NULL |
| external_id | VARCHAR(120) | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Batch statuses theo baseline: `UPLOADED`, `VALIDATING`, `VALIDATED`, `PARTIALLY_COMMITTED`, `COMMITTED`, `FAILED`, `CANCELLED`. fileciteturn4file0

---

### 8.3.16 `md_import_batch_line`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| batch_id | UUID | FK NOT NULL |
| row_no | INT | NOT NULL |
| row_payload | JSONB | NOT NULL |
| action_type | VARCHAR(20) | NULL |
| processing_status | VARCHAR(20) | NOT NULL |
| target_entity_id | UUID | NULL |
| target_business_key | VARCHAR(100) | NULL |
| validation_summary | JSONB | NULL |
| committed_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Unique:** (`batch_id`,`row_no`)

---

### 8.3.17 `md_import_error`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| batch_id | UUID | FK NOT NULL |
| batch_line_id | UUID | FK NULL |
| row_no | INT | NULL |
| field_name | VARCHAR(100) | NULL |
| error_code | VARCHAR(50) | NOT NULL |
| error_message | TEXT | NOT NULL |
| error_level | VARCHAR(20) | NOT NULL |
| details | JSONB | NULL |
| created_at | TIMESTAMP | NOT NULL |

Import audit objects này bám đúng spec v2.0. fileciteturn4file0

---

## 8.4 Quan hệ dữ liệu tổng quát

```text
md_owner --------< md_owner_item_policy >-------- md_item
md_owner --------< md_rate_reference >----------- md_service_code
md_uom ----------< md_uom_conversion >----------- md_uom
md_warehouse ----< md_zone ----< md_location
md_uom ----------< md_item
md_uom ----------< md_rate_reference
md_day_type -----< md_rate_reference
md_import_batch --< md_import_batch_line --< md_import_error
```

---

## 8.5 Thiết kế DB để scale cho các module sau

### 8.5.1 Cho Module 3
- `md_inventory_status` phải ổn định vì đi vào dimension values.
- `md_owner`, `md_item`, `md_warehouse`, `md_location` phải có business key sạch để M3 map sang `invent_dim` không ambiguity.
- Không nên để đổi tự do `warehouse_code`, `location_code`, `status_code` sau khi đã có transactions.

### 8.5.2 Cho Module 4/5/7
- `md_location.location_type`, `location_profile`, `status`, `is_mixed_owner`, `is_mixed_product` phải đủ semantic cho receiving/putaway/pick/staging/shipping.
- `md_vehicle_type` phải đủ cho weighbridge/outbound planning.

### 8.5.3 Cho Module 9
- `md_item.is_packaging`, `default_bag_weight_kg`, `nominal_qty_per_unit`, `packaging_material_item_id` phải đủ cho bagging.

### 8.5.4 Cho Module 10
- `md_rate_reference` phải deterministic, không overlap.
- `md_service_code`, `md_day_type`, `billing_uom` phải align semantic với charge lookup.

### 8.5.5 Không nên làm gì
- Không để mỗi module lưu bản sao master fields riêng.
- Không embed hàng loạt JSON không schema vào master tables.
- Không dùng hard delete cho entity đã dùng.
- Không cho import bypass toàn bộ validation để “cho nhanh go-live”.

---

## 9. Luồng xử lý từ Database → Backend cho từng nhóm năng lực

## 9.1 CRUD master entity flow

```text
API request
 -> Auth + Permission Guard
 -> Idempotency check (nếu side effect)
 -> DTO validation
 -> Business validation
 -> Cross-reference validation
 -> Immutable-after-use policy check
 -> Repository transaction
 -> Persist entity
 -> AuditService.write(...)
 -> Return response
```

### Thành phần backend
- `PermissionGuard`
- `IdempotencyService.run(...)`
- Entity service (`owner.service.ts`, `item.service.ts`, ...)
- `ValidationService`
- `ImmutableFieldPolicyService`
- Repository
- `AuditService` từ Module 1

---

## 9.2 Lookup flow

```text
UI opens dropdown/search
 -> GET lookup API
 -> query active records by keyword/scope
 -> apply owner/warehouse scope if needed
 -> return compact response
```

Lookup phải nhanh, có thể cache Redis ngắn hạn.

---

## 9.3 Usage impact check flow

```text
user click deactivate
 -> call usage-impact API
 -> UsageImpactService query downstream references
 -> return counts + blocking reasons
 -> user confirm deactivate
 -> deactivate API re-check usage + policy
 -> update is_active=false
 -> audit
```

### Tại sao phải re-check
Không được tin hoàn toàn vào lần check trước đó vì có thể giữa 2 request đã phát sinh giao dịch mới.

---

## 9.4 Import preview flow

```text
upload file
 -> create md_import_batch status=UPLOADED
 -> parse template + version
 -> validate header
 -> parse rows
 -> row-level validation
 -> cross-reference validation
 -> infer action insert/update/reject حسب mode
 -> save md_import_batch_line + md_import_error
 -> batch status=VALIDATED
 -> return preview summary
```

### Điểm kỹ thuật quan trọng
- Preview không được ghi dữ liệu vào master tables.
- Kết quả preview phải lưu lại để commit dùng lại, tránh parse lại không cần thiết nếu file không đổi.
- Có thể hash file + template version để detect duplicate upload.

---

## 9.5 Import commit flow

```text
user confirms commit
 -> IdempotencyService.run('master_import_commit', external_id, ...)
 -> load validated batch
 -> re-validate critical constraints if needed
 -> commit rows according to mode
 -> write target entity ids to batch lines
 -> batch status = PARTIALLY_COMMITTED / COMMITTED / FAILED
 -> write audit summary
 -> return summary
```

### Chính sách commit theo spec
- Mặc định **partial success by row**. fileciteturn3file0
- Có thể chừa option `all_or_nothing`, nhưng hiện vẫn là điểm theo dõi design workshop. fileciteturn4file14

---

## 9.6 Reactivate / deactivate flow

```text
user requests deactivate/reactivate
 -> Permission + reason code policy check
 -> UsageImpactService check
 -> entity-specific policy check
 -> update active flags
 -> audit with before/after
 -> invalidate lookup caches
```

---

## 10. Field-level governance policy được kỹ thuật hóa

Spec đã chốt 3 nhóm rule quan trọng: field được update sau khi có giao dịch, field bị controlled change, và hard delete policy. fileciteturn4file0

### 10.1 Nhóm field cho phép update bình thường
- display name / description
- contact info
- billing email
- non-critical notes
- active/inactive nếu policy cho phép

### 10.2 Nhóm field controlled change
- `item.cargo_form`
- `item.billing_uom`
- `warehouse_code`
- `zone.warehouse_code`
- `location.warehouse_code`
- `location.zone_code`
- `inventory_status.code`
- key fields của `rate_reference` active

### 10.3 Cách implement
- Tạo `ImmutableFieldPolicyService` có rule registry theo entity.
- Khi update, service load old record, so diff, map diff qua rule registry.
- Nếu record đã từng được dùng downstream và diff có field controlled → reject 409/422 hoặc route qua controlled change policy.
- Việc “đã từng được dùng” có thể kiểm bằng usage check query hoặc materialized summary.

### 10.4 Không nên làm
- Không kiểm controlled field chỉ ở frontend.
- Không hard-code scattered `if (field === ...)` khắp service.

---

## 11. Validation framework cho Module 2

## 11.1 Các lớp validation
1. **DTO validation**: required/type/length/enum cơ bản.
2. **Domain validation**: rule nghiệp vụ entity-specific.
3. **Cross-reference validation**: FK nghiệp vụ giữa các master.
4. **Usage-state validation**: inactive / already used / immutable-after-use.
5. **Scope validation**: owner scope / warehouse scope / customer viewer scope.
6. **Import validation**: duplicate in file / mode conflict / action inference.

## 11.2 Ví dụ validation quan trọng
- Owner code unique.
- Vendor group hợp lệ.
- Item phải có `cargo_form`, `base_uom`, `billing_uom` hợp lệ.
- Warehouse default location phải thuộc đúng warehouse.
- Zone phải thuộc warehouse tồn tại.
- Location phải có `zone_id` cùng warehouse.
- UOM conversion factor > 0 và không tạo vòng loop xung đột.
- Rate reference không overlap active date range.
- Owner-item policy phải có owner/item active.

## 11.3 Chuẩn lỗi API
Mọi lỗi validation nên trả theo cấu trúc thống nhất:

```json
{
  "error_code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "field_errors": [
    {"field": "billing_uom", "code": "INVALID_REFERENCE", "message": "Billing UOM does not exist"}
  ],
  "correlation_id": "..."
}
```

Import errors phải trả được theo row và field, đúng tinh thần spec. fileciteturn4file0

---

## 12. Thiết kế API chi tiết cho Module 2

Nguyên tắc API bám đúng spec:
- mọi list API có filter `is_active`, keyword search, pagination; fileciteturn4file0
- mọi side-effect API nhận `external_id` hoặc idempotency key; fileciteturn4file0
- nhóm API tối thiểu gồm Create / Update / Get / List / Deactivate / Reactivate / Import preview / Import commit / Export error report / Usage impact / Lookup. fileciteturn4file0

---

## 12.1 Nhóm API Owner

### `GET /api/v1/master-data/owners`
**Mục đích:** list owner có filter/search/pagination.

**Query:** `keyword`, `is_active`, `owner_group`, `page`, `page_size`

**Dùng khi nào:** UI quản trị owner, dropdown owner, search cho import mapping.

**Build note:** query API, có thể cache.

### `GET /api/v1/master-data/owners/:id`
**Mục đích:** xem chi tiết owner.

### `POST /api/v1/master-data/owners`
**Mục đích:** tạo owner mới.

**Body chính:** `owner_code`, `owner_name`, `short_name`, `owner_type`, `tax_code`, `default_tolerance_pct`, ...

**Dùng để làm gì:** thêm chủ hàng mới cho scope vận hành/billing.

**Hướng build:**
- check unique `owner_code`
- validate `default_warehouse_id` nếu có
- write `md_owner`
- audit `CREATE_OWNER`
- invalidate lookup cache owner

### `PUT /api/v1/master-data/owners/:id`
**Mục đích:** cập nhật owner.

**Hướng build:**
- optimistic concurrency qua `row_version`
- controlled change check nếu field nhạy cảm mở rộng trong tương lai
- audit before/after

### `POST /api/v1/master-data/owners/:id/deactivate`
**Mục đích:** soft deactivate owner.

**Body:** `reason_code`, `note`, `external_id`

**Hướng build:**
- usage impact re-check
- nếu policy chặn vì còn transaction mới tiềm năng hoặc scope chưa xử lý → reject
- set inactive, lưu deactivated metadata
- audit bắt buộc

### `POST /api/v1/master-data/owners/:id/reactivate`
**Mục đích:** active lại owner.

**Hướng build:**
- validate record exists and inactive
- audit `REACTIVATE_OWNER`

### `GET /api/v1/master-data/owners/:id/usage-impact`
**Mục đích:** kiểm tra owner đã được dùng ở đâu trước khi deactivate.

**Output gợi ý:** `inventory_refs`, `receipt_refs`, `shipment_refs`, `billing_refs`, `import_refs`, `can_deactivate`, `blocking_reasons`

---

## 12.2 Nhóm API Vendor

Tương tự owner, nhưng usage impact có thể optional theo spec capability matrix. fileciteturn4file0

Các API:
- `GET /vendors`
- `GET /vendors/:id`
- `POST /vendors`
- `PUT /vendors/:id`
- `POST /vendors/:id/deactivate`
- `POST /vendors/:id/reactivate`

Rule đáng chú ý:
- `supplier_group = VESSEL_AGENT` thì `vessel_name` meaningful hơn. fileciteturn3file0

---

## 12.3 Nhóm API Item

### `GET /api/v1/master-data/items`
**Mục đích:** list/search item.

### `GET /api/v1/master-data/items/:id`
**Mục đích:** chi tiết item.

### `POST /api/v1/master-data/items`
**Mục đích:** tạo item master.

**Quan trọng vì:** item là trung tâm semantic cho inbound, outbound, bagging, billing.

**Build note:**
- validate `item_code` unique
- validate UOM refs
- validate `cargo_form`
- validate `default_bag_weight_kg` theo cargo form
- validate packaging self-reference nếu có
- audit

### `PUT /api/v1/master-data/items/:id`
**Mục đích:** cập nhật item.

**Build note:**
- diff controlled fields
- nếu item đã used downstream và đổi `cargo_form` hoặc `billing_uom` → reject controlled change
- optimistic concurrency
- audit before/after

### `POST /api/v1/master-data/items/:id/deactivate`
**Mục đích:** inactive item cho transaction mới nhưng giữ history.

### `POST /api/v1/master-data/items/:id/reactivate`
**Mục đích:** active lại item.

### `GET /api/v1/master-data/items/:id/usage-impact`
**Mục đích:** check usage trong inventory/inbound/outbound/billing/VAS.

**Output gợi ý:** `invent_dim_refs`, `receipt_line_refs`, `shipment_line_refs`, `owner_item_policy_refs`, `billing_refs`, `can_update_controlled_fields`

---

## 12.4 Nhóm API Warehouse / Zone / Location

### Warehouse APIs
- `GET /warehouses`
- `GET /warehouses/:id`
- `POST /warehouses`
- `PUT /warehouses/:id`
- `POST /warehouses/:id/deactivate`
- `POST /warehouses/:id/reactivate`
- `GET /warehouses/:id/usage-impact`

**Warehouse API này để làm gì:** quản trị kho logic cho sequence scope, capacity baseline, weighbridge baseline, ownership của zone/location.

**Build note:**
- validate default locations thuộc cùng warehouse
- không cho deactivate nếu còn location active hoặc active usage refs theo baseline build. fileciteturn3file0

### Zone APIs
- `GET /zones`
- `GET /zones/:id`
- `POST /zones`
- `PUT /zones/:id`
- `POST /zones/:id/deactivate`
- `POST /zones/:id/reactivate`
- `GET /zones/:id/usage-impact`

**Build note:**
- unique trong warehouse
- validate warehouse active
- không cho đổi warehouse sau use
- không cho deactivate nếu còn location active trong zone. fileciteturn3file0

### Location APIs
- `GET /locations`
- `GET /locations/:id`
- `POST /locations`
- `PUT /locations/:id`
- `POST /locations/:id/deactivate`
- `POST /locations/:id/reactivate`
- `GET /locations/:id/usage-impact`

**Location API dùng để làm gì:** định nghĩa không gian vận hành thực tế cho receiving/storage/staging/shipping và billing zoning.

**Build note:**
- validate zone thuộc warehouse
- validate location_type/profile
- reject `location_type = SHIPPING` nếu bị dùng làm putaway target trong future validations theo spec baseline. fileciteturn3file0
- controlled field check với `warehouse_id`, `zone_id`
- usage impact check phải nhìn tới inventory/work/receipt/shipment

---

## 12.5 Nhóm API Vehicle Type

- `GET /vehicle-types`
- `GET /vehicle-types/:id`
- `POST /vehicle-types`
- `PUT /vehicle-types/:id`
- `POST /vehicle-types/:id/deactivate`
- `POST /vehicle-types/:id/reactivate`

**API này để làm gì:** phục vụ inbound/outbound planning, weighbridge validation, billing linkage.

**Build note:** `default_tare_weight_kg` và `max_payload_kg` > 0. fileciteturn3file0

---

## 12.6 Nhóm API UOM / Conversion / Inventory Status

### UOM APIs
- `GET /uoms`
- `GET /uoms/:id`
- `POST /uoms`
- `PUT /uoms/:id`
- `POST /uoms/:id/deactivate`
- `POST /uoms/:id/reactivate`
- `GET /uoms/:id/usage-impact`

### UOM Conversion APIs
- `GET /uom-conversions`
- `POST /uom-conversions`
- `PUT /uom-conversions/:id`
- `POST /uom-conversions/:id/deactivate`
- `POST /uom-conversions/:id/reactivate`

**API này để làm gì:** chuẩn hóa conversion global và per-item cho transaction/billing/report.

### Inventory Status APIs
- `GET /inventory-statuses`
- `GET /inventory-statuses/:id`
- `PUT /inventory-statuses/:id` *(chỉ cho description/display order, không cho đổi semantics tùy ý)*

**Khuyến nghị:** không expose `POST /inventory-statuses` cho user thường ở go-live vì spec nói Phase 1 không cho thêm status tùy ý qua UI. fileciteturn3file0

---

## 12.7 Nhóm API Billing Reference Baseline

### Service Code APIs
- `GET /service-codes`
- `GET /service-codes/:id`
- `POST /service-codes`
- `PUT /service-codes/:id`
- `POST /service-codes/:id/deactivate`
- `POST /service-codes/:id/reactivate`

### Day Type APIs
- `GET /day-types`
- `GET /day-types/:id`
- `POST /day-types`
- `PUT /day-types/:id`
- `POST /day-types/:id/deactivate`
- `POST /day-types/:id/reactivate`

### Rate Reference APIs
- `GET /rate-references`
- `GET /rate-references/:id`
- `POST /rate-references`
- `PUT /rate-references/:id`
- `POST /rate-references/:id/deactivate`
- `POST /rate-references/:id/reactivate`
- `GET /rate-references/:id/usage-impact`

**API này để làm gì:** cấu hình baseline lookup thương mại cho M10.

**Hướng build:**
- validate overlap active date range
- validate owner/service_code/uom/day_type refs
- controlled update policy mạnh hơn item/location thường
- audit bắt buộc, reason code bắt buộc với thay đổi active rate reference theo spec governance mapping. fileciteturn3file0

---

## 12.8 Nhóm API Owner-Item Policy

- `GET /owner-item-policies`
- `GET /owner-item-policies/:id`
- `POST /owner-item-policies`
- `PUT /owner-item-policies/:id`
- `POST /owner-item-policies/:id/deactivate`
- `POST /owner-item-policies/:id/reactivate`

**API này để làm gì:** cấu hình override tolerance / billing_uom / storage flag / preferred warehouse theo owner + item.

**Build note:** unique owner+item, fallback đúng thứ tự spec. fileciteturn4file8

---

## 12.9 Nhóm API Import

### `POST /api/v1/master-data/imports/preview`
**Mục đích:** upload file và preview kết quả validate.

**Body / form-data:** file, `entity_name`, `template_version`, `import_mode`, `external_id`

**API này để làm gì:** parse template, validate, cho user thấy insert/update/reject trước commit.

**Hướng build:**
- create batch
- parse file
- validate header/rows/cross-ref
- store line results/errors
- return preview summary

### `POST /api/v1/master-data/imports/:batchId/commit`
**Mục đích:** commit batch đã preview.

**Body:** `external_id`, `confirm=true`

**Hướng build:**
- idempotent bắt buộc
- chỉ commit batch status VALIDATED
- partial by row default
- update batch summary counters
- audit `IMPORT_COMMIT`

### `GET /api/v1/master-data/imports/:batchId`
**Mục đích:** xem batch detail.

### `GET /api/v1/master-data/imports/:batchId/errors`
**Mục đích:** xem lỗi theo dòng.

### `GET /api/v1/master-data/imports/:batchId/error-report`
**Mục đích:** export error report.

### `POST /api/v1/master-data/imports/:batchId/cancel`
**Mục đích:** hủy batch chưa commit.

**Lưu ý:** nếu batch đã commit một phần thì không cho “undo toàn batch” trừ khi build explicit rollback strategy riêng.

---

## 12.10 Nhóm API Lookup

- `GET /api/v1/master-data/lookups/owners`
- `GET /api/v1/master-data/lookups/items`
- `GET /api/v1/master-data/lookups/warehouses`
- `GET /api/v1/master-data/lookups/zones?warehouse_id=...`
- `GET /api/v1/master-data/lookups/locations?warehouse_id=...&location_type=...`
- `GET /api/v1/master-data/lookups/uoms`
- `GET /api/v1/master-data/lookups/service-codes`

**API này để làm gì:** phục vụ dropdown/autocomplete/reference với payload gọn.

**Build note:** payload nên là `id`, `code`, `name`, `extra` tối thiểu; cache được.

---

## 13. Hướng build chi tiết từng năng lực backend

## 13.1 Entity service pattern

Mỗi entity service nên theo cùng template:
1. `create(dto, ctx)`
2. `update(id, dto, ctx)`
3. `getById(id, ctx)`
4. `list(filter, ctx)`
5. `deactivate(id, dto, ctx)`
6. `reactivate(id, dto, ctx)`
7. `usageImpact(id, ctx)`

Mẫu này giúp intern đọc và maintain dễ hơn.

---

## 13.2 Import engine pattern

### Components nên tách rõ
- `TemplateRegistry`
- `HeaderValidator`
- `RowParser`
- `RowValidationRunner`
- `CrossReferenceResolver`
- `ActionInferenceService`
- `BatchCommitRunner`
- `ErrorReportExporter`

### Tư duy đúng
Import engine là orchestrator, không phải giant service 2000 dòng. Mỗi entity có adapter/strategy riêng cho:
- mapping row → DTO
- entity-specific validation
- upsert logic
- business key resolution

---

## 13.3 Usage impact service

Mục tiêu là trả lời câu hỏi: “Record này đã từng được dùng ở đâu, có được deactivate/sửa controlled field không?”

### Cách build Phase 1
- Query trực tiếp xuống các bảng downstream hiện có.
- Nếu module downstream chưa build xong, dùng adapter trả `unknown/pending` hoặc chỉ check import/log/history nội bộ.
- Thiết kế interface để sau này cắm Module 3/4/5/10 repositories dễ dàng.

### Ví dụ
`LocationUsageAdapter` có thể check:
- `invent_dim` refs
- receipt default refs
- shipment staging/shipping refs
- work refs
- billing location refs

---

## 13.4 Owner scope enforcement

Spec xác nhận `Customer Viewer` chỉ xem dữ liệu trong owner scope. fileciteturn4file8

### Cách build
- Tái sử dụng `PolicyEvaluatorService` hoặc `AuthorizationService` từ Module 1. fileciteturn4file5
- Với entity có owner dimension trực tiếp như owner-item policy, rate reference: filter theo owner scope.
- Với entity global như item, warehouse, uom: không filter owner, nhưng downstream usages thì có thể scope.

### Không nên làm
- Không chỉ ẩn UI; backend query cũng phải enforce scope.

---

## 13.5 Optimistic concurrency

Vì Module 2 là config-heavy, nhiều user admin có thể sửa cùng lúc. Nên dùng `row_version` hoặc `updated_at` precondition.

### Khuyến nghị
- Request update gửi `row_version`.
- SQL update theo điều kiện `where id = ? and row_version = ?`.
- Nếu 0 rows updated → trả 409 `VERSION_CONFLICT`.

Điều này bám đúng khuyến nghị spec về `row_version` chống lost update. fileciteturn4file8

---

## 14. Mapping Module 2 với Module 1

Overview tổng thể nói rõ Module 2 phụ thuộc Module 1 vì cần quyền, sequence, baseline rule. fileciteturn4file3

## 14.1 Module 1 cung cấp gì cho Module 2
- **AuthorizationService**: kiểm tra role/permission/data scope.
- **AuditService**: audit mọi thay đổi nhạy cảm.
- **ExceptionLogService**: log duplicate, policy violation, denied access.
- **IdempotencyService**: retry-safe cho side-effect APIs/import commit.
- **RuleCatalogService**: source-of-truth khi rule baseline có tag confirmed/build-baseline.
- **ReasonCodeService**: validate reason code cho deactivate/reactivate/controlled change nếu policy yêu cầu.

Điều này khớp với ownership của Module 1: role/permission, sequence, reason code, audit, idempotency framework là của M1; Module 2 chỉ consume. fileciteturn4file6

## 14.2 Những điểm tích hợp kỹ thuật bắt buộc

### a. Authorization
Ví dụ permission code gợi ý cho Module 2:
- `master_data.owner.view`
- `master_data.owner.create`
- `master_data.owner.update`
- `master_data.owner.deactivate`
- `master_data.item.view`
- `master_data.item.create`
- `master_data.item.update`
- `master_data.item.deactivate`
- `master_data.import.preview`
- `master_data.import.commit`
- `master_data.rate_reference.update`
- `master_data.audit.view`

### b. Audit
Action nhạy cảm của M2 cần audit mạnh theo spec:
- deactivate/reactivate master
- update key operational fields
- import commit
- sửa billing reference active
- thay đổi owner-item override. fileciteturn4file0

### c. Reason code
Spec yêu cầu một số action cần reason code:
- deactivate/reactivate record đã từng được dùng
- sửa controlled fields sau go-live
- import reactivate inactive record
- cập nhật active rate reference có ảnh hưởng billing. fileciteturn3file0

### d. Idempotency
Nên áp dụng ít nhất cho:
- create master record
- deactivate/reactivate
- import preview
- import commit
- bulk upsert/import

### e. Sequence
Module 2 không phụ thuộc mạnh vào number sequence như Receipt/Shipment, nhưng nên dùng sequence nếu muốn sinh `batch_no` cho import hoặc `change_no` cho controlled change theo shared service của M1.

---

## 15. Mapping Module 2 với các module downstream

## 15.1 Với Module 3 — Inventory Core Engine
Module 3 phụ thuộc M2 để lấy dimension values và semantic inventory master. fileciteturn4file3

**M2 cung cấp:**
- owner
- item
- warehouse
- location
- inventory_status
- UOM baseline

**M3 dùng như thế nào:**
- map sang `invent_dim`
- validate status allocatable/non-allocatable
- validate location/warehouse refs trước posting

**Thiết kế lưu ý:** business key phải ổn định; controlled fields không đổi tùy tiện.

## 15.2 Với Module 4 — Inbound
**M2 cung cấp:** owner, vendor, item, warehouse, receiving/storage locations, vehicle type, tolerance inputs, owner-item overrides. fileciteturn4file10

**M4 dùng như thế nào:**
- validate receipt creation
- chọn vendor/owner/item
- đọc tolerance hierarchy
- validate putaway target/location type

## 15.3 Với Module 5 — Outbound
**M2 cung cấp:** owner, item, warehouse, location, inventory status, vehicle type, owner-item policy.

**M5 dùng như thế nào:**
- allocation chỉ dùng `AVAILABLE`
- staging/shipping logic dựa location type
- outbound tolerance lookup theo owner-item/item/owner default

## 15.4 Với Module 7 — Work Execution & Mobile
**M2 cung cấp:** warehouse/zone/location/profile/status.

**M7 dùng như thế nào:**
- generate work theo target/source location hợp lệ
- scan location QR phải map được về location master
- execution rule phụ thuộc location type/profile

## 15.5 Với Module 9 — VAS / Bagging
**M2 cung cấp:** item packaging flags, nominal bag weight, packaging material item, cargo form, billing flags.

**M9 dùng như thế nào:**
- quyết định input/output items
- validate packaging material
- billing event semantic

## 15.6 Với Module 10 — Billing
**M2 cung cấp:** service code, day type, rate reference, billing_uom, is_storage_billable, cargo_form, billing location/zone flags. fileciteturn4file10

**M10 dùng như thế nào:**
- lookup baseline commercial refs
- xác định billable storage
- charge inputs không hard-code trong billing engine

---

## 16. Security design cho Module 2

### 16.1 Authn vs Authz
- Authentication do hệ thống auth chung xử lý.
- Authorization cho Module 2 phải reuse Module 1.

### 16.2 Quy tắc bảo mật bắt buộc
1. Backend luôn là lớp enforce cuối cùng. fileciteturn4file7
2. API audit/import logs phải phân quyền riêng.
3. Update config/master tables phải audit before/after cho action nhạy cảm.
4. Machine import/integration account cũng phải có permission riêng.
5. Customer Viewer chỉ được xem dữ liệu trong owner scope ở các API phù hợp. fileciteturn4file8
6. Không trả metadata nhạy cảm dư thừa ở lookup APIs.

### 16.3 Cơ chế cache
- Cache lookup data active records trong Redis 1–5 phút.
- Khi entity đổi/is_active đổi/import commit xong → publish invalidation event.
- Không cache quá lâu các dữ liệu billing reference active nếu business thay đổi thường xuyên.

---

## 17. Non-functional requirements kỹ thuật hóa

| NFR | Thiết kế kỹ thuật |
|---|---|
| Maintainability | entity service pattern thống nhất, policy layer dùng chung |
| Data integrity | Postgres constraints + transaction + optimistic lock |
| Traceability | audit via Module 1 + import batch logs |
| Reliability | idempotency cho side-effect APIs |
| Performance | lookup cache, index đúng, pagination bắt buộc |
| Scalability | normalized schema + import tables riêng + policy adapters |
| Security | backend permission guard + owner scope filtering |
| Operability | query API cho audit/import/usage impact |

### Chỉ tiêu nội bộ khuyến nghị
- Lookup API: < 100ms cache hit
- Standard list API: < 300ms page 1 trong dữ liệu go-live
- Create/update master: < 500ms
- Import preview 5.000 rows: xử lý theo batch, có progress/status, không block request quá dài bằng sync giant request
- Import commit 5.000 rows: nên job-based nếu volume lớn

---

## 18. Migration và seed strategy

## 18.1 Migration order khuyến nghị
1. `md_uom`
2. `md_inventory_status`
3. `md_warehouse`
4. `md_zone`
5. `md_location`
6. `md_owner`
7. `md_vendor`
8. `md_item`
9. `md_vehicle_type`
10. `md_uom_conversion`
11. `md_service_code`
12. `md_day_type`
13. `md_rate_reference`
14. `md_owner_item_policy`
15. `md_import_batch`
16. `md_import_batch_line`
17. `md_import_error`

## 18.2 Seed bắt buộc go-live
- UOM baseline
- 4 inventory statuses go-live
- warehouse/zone/location baseline nếu có sẵn từ migration
- service_code/day_type baseline tối thiểu
- permission codes cho Module 2
- import template versions

## 18.3 Seed không nên hard-code trong app runtime
- inventory status list
- service codes
- day types
- cargo form enums business-level nếu có thể đặt config/constant shared có kiểm soát, không rải rác nhiều nơi

---

## 19. Testing strategy cho Module 2

## 19.1 Unit test bắt buộc
- owner/item/location validation
- tolerance fallback resolution
- rate reference overlap validator
- immutable field policy
- import action inference
- import row validation
- usage impact decision logic

## 19.2 Integration test bắt buộc
- create duplicate owner/item/vendor → reject 409
- create location with mismatched warehouse/zone → reject
- update item controlled field after usage → reject
- deactivate warehouse with active location → reject
- rate reference overlap active range → reject
- import preview returns row-level errors
- import commit with same external_id retry → không duplicate commit
- Customer Viewer owner scope enforced

## 19.3 Concurrency test
- concurrent update same record with row_version → only one succeeds
- concurrent import commit same batch with same external_id → single effect
- concurrent create same business key → unique constraint protects DB

## 19.4 Regression tests liên module
Khi M3/M4/M5/M10 build vào, phải có integration tests chứng minh:
- item/location/status từ M2 được consume đúng ở M3
- inbound tolerance lookup đọc đúng fallback hierarchy
- outbound allocation chỉ dùng status `AVAILABLE`
- billing lookup dùng rate reference không ambiguity

---

## 20. Gợi ý roadmap triển khai theo Sprint

### Sprint A — Core Masters
- owner, vendor, uom, inventory_status
- shared list/get/create/update/deactivate/reactivate base
- permission + audit integration from M1

### Sprint B — Warehouse Structure
- warehouse, zone, location
- cross-reference validation
- usage impact foundation

### Sprint C — Product & Commercial Masters
- item
- vehicle type
- service code, day type, rate reference
- owner-item policy
- immutable field policy

### Sprint D — Import Engine
- upload/preview/commit/error report
- row-level validation
- partial success mode
- idempotency integration

### Sprint E — Cross-module hardening
- downstream adapters for usage impact
- lookup optimization
- concurrency tests
- SIT/UAT fixes

---

## 21. Những sai lầm phổ biến cần tránh

1. Build Module 2 như một đống CRUD rời rạc theo màn hình.
2. Không tách global item master và owner override, dẫn tới duplicate SKU logic.
3. Cho update tự do các controlled fields sau khi đã có giao dịch.
4. Không có usage impact check trước deactivate.
5. Import commit trực tiếp vào DB mà không có preview/log/error report.
6. Chỉ validate ở frontend.
7. Không dùng idempotency cho import commit hoặc bulk create/update.
8. Để rate reference overlap vì nghĩ billing sẽ tự xử lý.
9. Không gắn audit của Module 1 vào import/update nhạy cảm.
10. Thiếu optimistic locking khiến admin overwrite lẫn nhau.

---

## 22. Kết luận kỹ thuật

Module 2 không phải “danh mục dùng chung” theo nghĩa đơn giản. Dưới góc nhìn hệ thống, đây là **data platform layer của SWM**.

Nếu build đúng:
- Module 3 có dimension values và semantic ổn định để post ledger đúng.
- Module 4/5/7 có master references đúng để vận hành receipt/shipment/work.
- Module 9 có product semantics đúng cho bagging.
- Module 10 có billing baseline lookup deterministic.
- Team cutover có import engine đủ mạnh để go-live an toàn.
- Audit/idempotency/authorization được kế thừa nhất quán từ Module 1 thay vì mỗi module tự làm một kiểu. fileciteturn4file1 fileciteturn4file5

Nếu build sai:
- downstream modules sẽ tự giữ bản sao logic master data,
- import go-live dễ lỗi và khó truy vết,
- billing và inventory sẽ lệch semantic,
- technical debt lan rất nhanh vì data foundation bị yếu từ đầu.

**Khuyến nghị chốt:** triển khai Module 2 theo hướng **NestJS modular monolith + PostgreSQL + Redis**, reuse shared foundation của Module 1, tách rõ entity services và import orchestration, kiểm soát chặt controlled fields, usage impact, audit và idempotency ngay từ Sprint đầu của Module 2.

---

## 23. Appendix — Danh sách permission code gợi ý cho Module 2

### Master Data General
- `master_data.lookup.view`
- `master_data.import.preview`
- `master_data.import.commit`
- `master_data.import.view`
- `master_data.import.error_report.export`
- `master_data.audit.view`

### Owner
- `master_data.owner.view`
- `master_data.owner.create`
- `master_data.owner.update`
- `master_data.owner.deactivate`
- `master_data.owner.reactivate`

### Vendor
- `master_data.vendor.view`
- `master_data.vendor.create`
- `master_data.vendor.update`
- `master_data.vendor.deactivate`
- `master_data.vendor.reactivate`

### Item
- `master_data.item.view`
- `master_data.item.create`
- `master_data.item.update`
- `master_data.item.deactivate`
- `master_data.item.reactivate`

### Warehouse Structure
- `master_data.warehouse.view`
- `master_data.warehouse.create`
- `master_data.warehouse.update`
- `master_data.warehouse.deactivate`
- `master_data.zone.view`
- `master_data.zone.create`
- `master_data.zone.update`
- `master_data.location.view`
- `master_data.location.create`
- `master_data.location.update`

### Commercial Reference
- `master_data.rate_reference.view`
- `master_data.rate_reference.create`
- `master_data.rate_reference.update`
- `master_data.rate_reference.deactivate`
- `master_data.owner_item_policy.view`
- `master_data.owner_item_policy.create`
- `master_data.owner_item_policy.update`

---

## 24. Appendix — Danh sách command nên áp idempotency bắt buộc ở Module 2

1. `create_owner`
2. `update_owner`
3. `deactivate_owner`
4. `reactivate_owner`
5. `create_item`
6. `update_item`
7. `deactivate_item`
8. `create_rate_reference`
9. `update_rate_reference`
10. `master_import_preview`
11. `master_import_commit`
12. `master_import_cancel`
13. `reactivate_inactive_master_from_import`

---

## 25. Appendix — Danh sách rule/policy nên cài thành code constants hoặc policy registry

### Entity key policy
- `OWNER_CODE_UNIQUE`
- `ITEM_CODE_GLOBAL_UNIQUE`
- `ZONE_UNIQUE_PER_WAREHOUSE`
- `LOCATION_UNIQUE_PER_WAREHOUSE`
- `OWNER_ITEM_POLICY_UNIQUE`
- `RATE_REFERENCE_NO_OVERLAP`

### Controlled field policy
- `ITEM_CARGO_FORM_IMMUTABLE_AFTER_USE`
- `ITEM_BILLING_UOM_CONTROLLED_AFTER_USE`
- `LOCATION_WAREHOUSE_IMMUTABLE_AFTER_USE`
- `LOCATION_ZONE_IMMUTABLE_AFTER_USE`
- `RATE_REFERENCE_KEY_CONTROLLED_WHEN_ACTIVE`

### Import policy
- `IMPORT_MODE_VALIDATE_ONLY`
- `IMPORT_MODE_INSERT_ONLY`
- `IMPORT_MODE_UPSERT`
- `IMPORT_PARTIAL_SUCCESS_BY_ROW`

### Fallback policy
- `TOLERANCE_FALLBACK_TRANSACTION_OWNER_ITEM_ITEM_OWNER_DEFAULT_SYSTEM`

