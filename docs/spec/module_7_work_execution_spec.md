# Module 7 — Work Execution & Mobile Operations: Functional Specification

**Version:** 1.2  
**Created:** 2026-03-08  
**Revised:** 2026-03-08  
**Status:** DRAFT — Enriched Build-Ready Spec  
**Source:** Module 1–6 specs + Overview/Blueprint + Inventory Transaction Spec + current Module 7 v1.1  
**Changelog v1.2:** Freeze Phase 1 scope, close P1 blockers, enrich module boundary, complete state catalog, expand schema/audit/sync model, add API contracts, decision tables, scenario matrix, traceability, and non-functional rules.

---

## 1. Document Purpose

Dac ta chuc nang Module 7 — Work Execution & Mobile Operations. Module nay quan ly viec tao, phan cong, thuc thi va giam sat cong viec kho (Putaway, Pick, Move, Transfer) thong qua mobile app va web dashboard.

Tai lieu nay duoc nang cap tu ban v1.1 thanh ban spec day du hon de:
- dong bo ranh gioi M7 voi M3/M4/M5/M6/M8,
- khoa logic posting ownership de tranh double-posting,
- chot cac blocker nghiep vu cho Phase 1,
- tao nen tang de team backend/frontend/mobile/QA co the build thong nhat.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Work Generation Engine (auto-create tu M4/M5/M6 trigger)
- Mobile Task Claim & Execution (self-claim model)
- Location QR Scan Validation
- Work Completion & InventTrans Posting (movement posting only — M7 owns MOVE / TRANSFER work execution posting)
- Short Pick / Exception Handling
- Work Monitoring & Supervisor Dashboard
- Offline Queue & Sync
- Transfer Work Execution (source pick + destination putaway)
- Putaway split to multiple storage locations
- Manager override with evidence and full audit trail

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] REPLENISH work type
- [PHASE 2] LOAD work type
- [PHASE 2] Directed assignment (supervisor assign to keeper)
- [PHASE 2] Wave processing / batch optimization
- [PHASE 2] Capacity-based putaway suggestion
- [PHASE 2] Dynamic priority engine per warehouse via UI
- [OUT OF SCOPE] Barcode/RFID item scanning (QR location only)
- [OUT OF SCOPE] Route optimization / labor balancing
- [OUT OF SCOPE] Autonomous device / IoT execution logic

### 2.3 Scope Freeze Notes for Sprint 1
- Work types go-live: `PUTAWAY`, `PICK`, `MOVE`, `TRANSFER_PICK`, `TRANSFER_PUT`
- Mobile go-live supports `claim`, `release`, `start`, `complete`, `skip`, `sync`
- QR validation chi ap dung cho location, khong scan item
- Priority go-live theo default template trung tam; chua co UI config nang cao
- Offline duoc phep cho worker command; manager override bat buoc online

---

## 3. Business Context

TVL van hanh kho bulk cargo va bagged goods. Cong viec kho (putaway, pick, move, transfer) can duoc:
- Tao tu dong khi Receipt RECEIVED hoac Shipment ALLOCATED hoac Move/Transfer duoc release,
- Phan cong qua mobile app theo self-claim,
- Thuc thi voi QR scan de validate vi tri,
- Post InventTrans dung ranh gioi module de dam bao inventory accuracy,
- Ho tro offline cho mobile khi mat mang,
- Audit day du de truy vet thao tac tai hien truong.

---

## 4. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | RBAC, NumberSequence (WRK-), ReasonCode, AuditLog |
| M2 Master Data | Uses | Location (QR code), Warehouse, Zone, Item, UOM |
| M3 Inventory Core | Uses | InventTrans posting, OnHand query, InventDim lookup, idempotency validation |
| M4 Inbound | Triggered by | Receipt RECEIVED → auto-create Putaway work; callback when putaway completed |
| M5 Outbound | Triggered by | Shipment ALLOCATED → auto-create Pick work; callback when all pick works completed |
| M6 Inventory Control | Triggered by | Move request RELEASED → Move work; Transfer RELEASED / IN_TRANSIT arrival → Transfer work |
| M8 Integration | Uses | Mobile sync transport, offline queue transport, retry/resilience |

---

## 5. Cross-Module Ownership Matrix (CRITICAL)

**Nguyen tac cot loi**: Moi business event chi co 1 module so huu posting va 1 module so huu state machine business document. M7 la module thuc thi cong viec, KHONG thay the M4/M5/M6/M3.

### 5.1 Posting Ownership by Event

| Event | Posting Owner | InventTrans Type | M7 Role |
|-------|--------------|------------------|---------|
| Inbound receipt (goods arrive) | **M4** at RECEIVED | RECEIVE (+qty) | M7 KHONG post. M4 da post xong truoc khi handoff sang putaway |
| Putaway (RECEIVING → STORAGE) | **M7** | MOVE | M7 post MOVE: from=RECEIVING, to=STORAGE |
| Pick (STORAGE → STAGING) | **M7** | MOVE | M7 post MOVE: from=STORAGE, to=STAGING. Khong phai final outbound deduction |
| Outbound ship (goods leave) | **M5** at SHIPPED | SHIP (-qty) | M7 KHONG post. M5 post khi confirm ship |
| Internal move | **M7** (triggered by M6 released move) | MOVE | M7 post MOVE |
| Inter-WH transfer ship execution | **M7** | TRANSFER_SHIP | M7 post khi transfer pick complete |
| Inter-WH transfer receive execution | **M7** | TRANSFER_RECEIVE | M7 post khi transfer putaway complete |
| Adjustment / Count variance | **M6** | ADJUSTMENT / COUNT | M7 KHONG lien quan |
| VAS consume / produce | **M9** | VAS_CONSUME / VAS_PRODUCE | M7 KHONG lien quan |

### 5.2 State Ownership by Object

| Object | Owner | M7 Role |
|--------|-------|---------|
| Receipt | M4 | Trigger putaway work; callback when putaway done |
| Shipment | M5 | Trigger pick work; callback when all picks done |
| Move Request | M6 | M6 phai release truoc; M7 chi execute |
| Transfer Order | M6 | M6 quan ly Created/Released/Shipped/In_Transit/Received/Closed; M7 execute work tai source/destination |
| InventTrans / OnHand | M3 | M7 goi posting API, khong tu viet ledger |
| Offline transport / sync channel | M8 | M7 dinh nghia business payload; M8 cung cap transport/retry infra |

### 5.3 Core Boundary Rules
1. M7 khong duoc tao RECEIVE/SHIP/ADJUSTMENT ledger.
2. M7 khong duoc sua truc tiep on_hand; moi thay doi ton phai qua M3 posting API.
3. M7 khong duoc tu quyet dinh document business state ngoai callback contract da duoc M4/M5/M6 cong bo.
4. M7 duoc phep tu quan ly `work_header`, `work_line`, `work_event_log`, `work_exception`, sync payload.
5. Moi correction sau khi da post ledger phai di qua reversal / counter-trans theo rule cua M3; khong delete ledger.

---

## 6. User Personas

| Role | Use Cases in M7 |
|------|----------------|
| WH_KEEPER | Claim work, execute putaway/pick/move/transfer, scan QR, report exception |
| WH_MANAGER | Cancel work, skip line, manager override complete, approve sensitive action da duoc release, view exception dashboard |
| WH_ADMIN | Xem config default, quan tri reason code, xem audit |
| OPS_SUPER | Monitor work queue, SLA tracking, exception dashboard, operational review |

---

## 7. Design Principles

1. **WorkLine COMPLETED = 1 posting business effect**: Moi WorkLine hoan thanh chi duoc sinh 1 posting event. Duplicate request cung `external_id` phai tra lai ket qua cu.
2. **Self-claim model**: WH_KEEPER tu chon work. Khong co directed assignment Phase 1.
3. **QR scan = validate location**: Scan QR de xac nhan vi tri, khong phai scan item.
4. **Idempotency via external_id**: Retry khong tao duplicate work, duplicate completion, duplicate InventTrans.
5. **Offline-first mobile**: Queue worker actions locally khi offline, sync khi online.
6. **Work type Phase 1**: `PUTAWAY`, `PICK`, `MOVE`, `TRANSFER_PICK`, `TRANSFER_PUT`.
7. **Claim khong doi state**: Claim chi set assigned_to. Start moi doi `OPEN -> IN_PROGRESS`.
8. **No blind force-complete**: Manager override complete bat buoc `actual_qty + reason_code + evidence`.
9. **Module boundary first**: M7 execute, M3 post, M4/M5/M6 own source business document.
10. **Auditability by default**: Moi lenh side-effect phai co actor, timestamp, source_app, external_id, correlation_id.

---

## 8. Resolved Decisions (Closed from v1.1 TO-CONFIRM)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Short pick threshold | **Closed**: `<=2%` auto-accept, `>2% đến <=5%` complete duoc nhung flag manager review, `>5%` block completion |
| 2 | Move work approval before execute | **Closed**: M7 chi execute move da `RELEASED`. Approval neu co phai duoc xu ly trong M6 truoc khi work duoc tao. Move lien quan `BLOCKED/DAMAGED/IN_TRANSIT/restricted zone` bat buoc manager release o M6 |
| 3 | Putaway split 1 receipt to multiple locations | **Closed**: 1 `WorkHeader` co the co nhieu `PUT` lines. He thong ho tro `Split Putaway` truoc khi complete line dau tien; moi line sau split co 1 destination location rieng va 1 posting event rieng |
| 4 | Mobile offline max duration | **Closed**: toi da 24 gio. Qua 24 gio thi app khong cho complete moi neu chua sync xong batch cu |
| 5 | Work priority fixed or configurable | **Closed for Phase 1**: dung template global by work type, co bang config backend de override theo warehouse nhung chua co UI Phase 1 |
| 6 | Wave processing Phase 1 | **Closed**: Out of scope |

---

## 9. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Work Generation Engine | Auto-create WorkHeader + WorkLines tu source trigger |
| 2 | Mobile Task Claim & Execution | Self-claim, start, execute, scan QR, complete |
| 3 | Work Completion & InventTrans Posting | WorkLine complete → post movement via M3 |
| 4 | Exception Handling | Short pick, location mismatch, item not found, sync conflict |
| 5 | Work Monitoring & Supervisor View | Dashboard, SLA, exception alerts |
| 6 | Offline Queue & Sync | Mobile offline queue, idempotent sync |
| 7 | Transfer Work Execution | Inter-warehouse transfer pick + destination putaway |
| 8 | Auditability & Traceability | Event log, correlation, idempotency, evidence |

---

## 10. Data Objects & Schema

### 10.1 work_header Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| work_id | VARCHAR(30) | Y | Auto-generated: WRK-YYYYMMDD-SEQ |
| work_type | ENUM | Y | PUTAWAY / PICK / MOVE / TRANSFER_PICK / TRANSFER_PUT |
| status | ENUM | Y | OPEN / IN_PROGRESS / COMPLETED / CANCELLED |
| priority | INT | Y | 1=highest, 99=lowest |
| priority_code | VARCHAR(30) | N | URGENT / NORMAL / LOW |
| warehouse_id | FK | Y | Execution warehouse |
| zone_id | VARCHAR(20) | N | Optional work zone |
| source_type | ENUM | Y | RECEIPT / SHIPMENT / MOVE_REQUEST / TRANSFER_ORDER / MANUAL |
| source_id | VARCHAR(30) | Y | Reference: RCV-xxx, SHP-xxx, MOV-xxx, TRF-xxx |
| source_line_id | VARCHAR(30) | N | |
| owner_id | FK | Y | Denormalized for access control |
| assigned_to | UUID FK | N | NULL at creation, set on claim |
| assigned_at | TIMESTAMPTZ | N | |
| claimed_device_id | VARCHAR(100) | N | Device claim source |
| started_at | TIMESTAMPTZ | N | |
| completed_at | TIMESTAMPTZ | N | |
| cancelled_at | TIMESTAMPTZ | N | |
| cancel_reason_code | VARCHAR(50) | N | Required if CANCELLED |
| release_reason_code | VARCHAR(50) | N | Optional for claim release |
| sla_due_at | TIMESTAMPTZ | N | SLA threshold |
| external_id | VARCHAR(100) | Y | Idempotency key for create |
| correlation_id | UUID | Y | Trace toàn flow |
| version_no | INT | Y | Optimistic locking, default 1 |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 10.2 work_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| work_header_id | FK | Y | → work_header |
| line_num | INT | Y | Step sequence trong 1 work |
| parent_line_id | UUID FK | N | Dung cho split putaway / split execution |
| step_type | ENUM | Y | PUT / PICK / MOVE_FROM / MOVE_TO / MOVE |
| status | ENUM | Y | OPEN / IN_PROGRESS / COMPLETED / SKIPPED / CANCELLED |
| execution_seq | INT | Y | Thu tu thuc thi |
| from_warehouse_id | FK | N | |
| from_location_id | FK | N | Source location |
| to_warehouse_id | FK | N | |
| to_location_id | FK | N | Destination expected / chosen |
| scanned_location_id | FK | N | QR da xac nhan |
| item_id | FK | Y | |
| invent_dim_id | UUID FK | N | Dimension tracking |
| inventory_status_from | VARCHAR(30) | N | AVAILABLE / BLOCKED / DAMAGED / IN_TRANSIT |
| inventory_status_to | VARCHAR(30) | N | |
| expected_qty | DECIMAL(15,3) | Y | kg |
| actual_qty | DECIMAL(15,3) | N | Filled on complete |
| uom | VARCHAR(10) | Y | Default: KG |
| variance_qty | DECIMAL(15,3) | N | actual - expected |
| variance_reason_code | VARCHAR(50) | N | SHORT_PICK / OVERAGE / DAMAGE / NOT_FOUND / OTHER |
| exception_flag | BOOLEAN | Y | default false |
| skip_reason_code | VARCHAR(50) | N | Required if SKIPPED |
| override_reason_code | VARCHAR(50) | N | Required if manager override |
| override_evidence | TEXT | N | |
| posting_status | ENUM | Y | NOT_POSTED / POSTED / DUPLICATE / FAILED |
| invent_trans_id | VARCHAR(30) | N | → invent_trans after post |
| completion_external_id | VARCHAR(100) | N | Idempotency key cho complete |
| device_id | VARCHAR(100) | N | Mobile source |
| device_event_time | TIMESTAMPTZ | N | Timestamp tai mobile |
| started_at | TIMESTAMPTZ | N | |
| completed_at | TIMESTAMPTZ | N | |
| completed_by | VARCHAR | N | |

### 10.3 Supporting Tables

#### a. work_event_log
Luu toan bo event side-effect de audit va replay-safe.

| Field | Type | Required | Note |
|------|------|----------|------|
| id | UUID | Y | PK |
| work_id | VARCHAR(30) | Y | |
| work_line_id | UUID | N | Nullable neu header-level |
| event_type | VARCHAR(50) | Y | CREATED / CLAIMED / RELEASED / STARTED / LINE_STARTED / LINE_COMPLETED / SKIPPED / CANCELLED / OVERRIDE_COMPLETED / SYNC_CONFLICT |
| actor_id | UUID | Y | |
| actor_role | VARCHAR(30) | Y | |
| source_app | VARCHAR(30) | Y | WEB / MOBILE |
| device_id | VARCHAR(100) | N | |
| external_id | VARCHAR(100) | N | |
| correlation_id | UUID | Y | |
| payload_json | JSONB | N | Snapshot request/response cần audit |
| created_at | TIMESTAMPTZ | Y | |

#### b. work_exception
| Field | Type | Required | Note |
|------|------|----------|------|
| id | UUID | Y | PK |
| work_line_id | UUID | Y | |
| exception_type | VARCHAR(50) | Y | SHORT_PICK / LOCATION_MISMATCH / NOT_FOUND / SYNC_CONFLICT / SOURCE_EMPTY |
| severity | VARCHAR(20) | Y | LOW / MEDIUM / HIGH |
| reason_code | VARCHAR(50) | N | |
| status | VARCHAR(20) | Y | OPEN / REVIEWING / RESOLVED / CANCELLED |
| raised_by | UUID | Y | |
| resolved_by | UUID | N | |
| resolution_note | TEXT | N | |
| created_at | TIMESTAMPTZ | Y | |
| resolved_at | TIMESTAMPTZ | N | |

#### c. mobile_sync_batch
| Field | Type | Required | Note |
|------|------|----------|------|
| id | UUID | Y | PK |
| batch_id | VARCHAR(100) | Y | From mobile |
| device_id | VARCHAR(100) | Y | |
| user_id | UUID | Y | |
| sent_at | TIMESTAMPTZ | Y | Device send time |
| received_at | TIMESTAMPTZ | Y | Server time |
| status | VARCHAR(20) | Y | RECEIVED / PARTIAL / APPLIED / FAILED |
| total_events | INT | Y | |
| success_events | INT | Y | |
| duplicate_events | INT | Y | |
| conflict_events | INT | Y | |

#### d. mobile_sync_event
| Field | Type | Required | Note |
|------|------|----------|------|
| id | UUID | Y | PK |
| batch_id | UUID | Y | FK -> mobile_sync_batch |
| external_id | VARCHAR(100) | Y | |
| sequence_no | INT | Y | Client order |
| command_type | VARCHAR(30) | Y | START / COMPLETE / SKIP |
| work_id | VARCHAR(30) | Y | |
| work_line_id | UUID | N | |
| apply_status | VARCHAR(20) | Y | SUCCESS / DUPLICATE / CONFLICT / REJECTED |
| response_code | VARCHAR(50) | N | |
| response_message | TEXT | N | |

### 10.4 Key Constraints
- Unique `(work_id)`
- Unique `(source_type, source_id, source_line_id, work_type)` cho auto-create idempotent work
- Unique `(completion_external_id)` where not null
- Unique `(batch_id, external_id)` trong sync event
- Check `actual_qty >= 0`
- Check `completed_at is not null` neu `status = COMPLETED`
- Check `override_reason_code` va `override_evidence` required neu manager override
- `version_no` tang moi lan update de chong ghi de

---

## 11. Work Generation Engine

### 11.1 Triggers

| Source | Trigger State | Work Type | WorkLines Created |
|--------|--------------|-----------|-------------------|
| Receipt | M4 = RECEIVED | PUTAWAY | 1 WorkHeader, mac dinh 1 PUT line tu RECEIVING. Co the split thanh nhieu PUT lines truoc completion |
| Shipment | M5 = ALLOCATED | PICK | 1 WorkHeader per shipment line/allocated line. 1 PICK line tu STORAGE -> STAGING_OUT |
| Move Request | M6 = RELEASED | MOVE | 1 WorkHeader, 1 MOVE line neu destination da biet; hoac 2-step logic noi bo do backend wrap thanh 1 business line |
| Transfer Order | M6 = RELEASED | TRANSFER_PICK | 1 WorkHeader tai source warehouse, PICK tu STORAGE -> STAGING_OUT |
| Transfer Arrival | M6 = IN_TRANSIT and arrival confirmed | TRANSFER_PUT | 1 WorkHeader tai destination warehouse, PUT tu RECEIVING -> STORAGE |

### 11.2 Putaway Split Rule (Closed)
- Mac dinh khi tao work, he thong tao 1 PUT line cho moi receipt line.
- Truoc khi complete line PUT dau tien, worker/coordinator co the su dung action `Split Putaway`.
- He thong tao them cac child line:
  - Line goc cap nhat `expected_qty` cho phan se vao destination 1
  - Cac child line moi mang `parent_line_id = original_line_id`
  - Tong `expected_qty` cua cac line sau split phai bang qty goc
- Moi line sau split bat buoc co 1 destination location va 1 completion posting rieng.

### 11.3 Business Rules
- Auto-create WorkHeader + WorkLines khi source document dat trigger state
- Idempotent create: retry cung `external_id` khong tao duplicate work
- WorkHeader tao voi `status = OPEN`, `assigned_to = NULL`
- Priority template default:
  - Pick urgent = 10
  - Pick normal = 30
  - Transfer = 40
  - Putaway = 50
  - Move = 60
- M6 phai release move/transfer truoc khi M7 tao work
- Khong tao work cho stock `IN_TRANSIT` tru cac transfer receive line duoc M6 khai bao hop le

### 11.4 Acceptance Criteria
- **AC-1.1**: Receipt RECEIVED auto-tao 1 Putaway WorkHeader.
- **AC-1.2**: Shipment ALLOCATED auto-tao Pick WorkHeader(s). Shipment state -> PICKING.
- **AC-1.3**: Retry cung source ref va work_type khong tao duplicate work.
- **AC-1.4**: WorkHeader tao voi status = OPEN, assigned_to = NULL.
- **AC-1.5**: Transfer Order RELEASED auto-tao TRANSFER_PICK work tai source warehouse.
- **AC-1.6**: Putaway split tao nhieu PUT lines nhung giu nguyen tong qty goc.

---

## 12. Mobile Task Claim & Execution

### 12.1 Standard Flow
1. WH_KEEPER mo app -> xem Work List (`OPEN`, `assigned_to = NULL`) hoac My Work (`assigned_to = me`)
2. Claim work -> set `assigned_to`, `assigned_at`
3. Start work -> `OPEN -> IN_PROGRESS`
4. Start line -> `OPEN -> IN_PROGRESS`
5. Scan location QR -> validate dung location/business context
6. Nhap `actual_qty`
7. Confirm line -> line `COMPLETED` -> posting event sent
8. Khi tat ca line `COMPLETED/SKIPPED` -> header `COMPLETED`

### 12.2 Validation by Work Type
- **Putaway**
  - scan destination location
  - destination phai thuoc cung warehouse
  - location_type phai = `STORAGE`
- **Pick**
  - scan source location
  - phai khop location duoc allocate/assigned boi M5
- **Move**
  - scan source va destination theo move request da release
  - destination khong duoc la location blocked neu move request khong cho phep
- **Transfer Pick**
  - scan source location tai source warehouse
  - destination staging la virtual / fixed staging
- **Transfer Put**
  - scan destination storage tai kho dich
  - source logic la receiving/inbound area cua kho dich

### 12.3 Release Claim
- Cho phep worker release claim neu chua complete line nao
- Header van giu `OPEN`
- Ghi event `RELEASED`
- Neu da co line `IN_PROGRESS`, chi WH_MANAGER moi duoc forced release/cancel

### 12.4 Acceptance Criteria
- **AC-2.1**: Claim chi set assigned_to, KHONG doi status.
- **AC-2.2**: Start chuyen OPEN -> IN_PROGRESS, ghi started_at.
- **AC-2.3**: Scan QR sai location -> block execution va show error.
- **AC-2.4**: WH_MANAGER override location mismatch -> log reason_code + evidence + audit.
- **AC-2.5**: Release claim -> assigned_to = NULL, status van OPEN neu chua line nao bat dau.
- **AC-2.6**: Putaway complete bat buoc scan destination STORAGE.
- **AC-2.7**: Worker khong duoc complete line neu work assigned cho nguoi khac.
- **AC-2.8**: Manager override bat buoc online; mobile offline khong cho override.

---

## 13. Work Completion & InventTrans Posting

### 13.1 WorkLine -> InventTrans Mapping

| Work Type | Step | InventTrans Type | Description | DimFrom | DimTo |
|-----------|------|-----------------|-------------|---------|-------|
| PUTAWAY | PUT | MOVE | Move from RECEIVING to STORAGE | {loc=RECEIVING,status=AVAILABLE} | {loc=scanned STORAGE,status=AVAILABLE} |
| PICK | PICK | MOVE | Move from STORAGE to STAGING | {loc=allocated STORAGE,status=AVAILABLE} | {loc=STAGING_OUT,status=AVAILABLE} |
| MOVE | MOVE | MOVE | Internal location move | {loc=source,status=current} | {loc=dest,status=current} |
| TRANSFER_PICK | PICK | TRANSFER_SHIP | Ship for inter-WH transfer | {wh=source,loc=STAGING_OUT,status=AVAILABLE} | {wh=source,status=IN_TRANSIT} |
| TRANSFER_PUT | PUT | TRANSFER_RECEIVE | Receive at destination WH | {wh=dest,status=IN_TRANSIT} | {wh=dest,loc=scanned STORAGE,status=AVAILABLE} |

### 13.2 Posting Rules
- WorkLine COMPLETED -> call M3 posting API
- `completion_external_id = {work_id}_{line_num}_{attempt_no or fixed_event}`
- Duplicate completion cung `completion_external_id` -> tra ket qua cu, khong post moi
- Header COMPLETED chi khi tat ca line terminal (`COMPLETED` or `SKIPPED` or `CANCELLED`)
- Pick completion KHONG release reservation
- Reservation chi release khi Shipment SHIPPED hoac Shipment CANCELLED theo M5
- Transfer ship tao hieu ung source out + in_transit, transfer receive tao hieu ung in_transit out + destination in theo rule M3/M6

### 13.3 Callback Contracts
- **Putaway complete** -> callback M4 cap nhat Receipt sub-status `PUTAWAY_DONE`/`PUTAWAY`
- **All shipment pick works complete** -> callback M5 cap nhat Shipment `PICKED`
- **Transfer pick complete** -> callback M6 cap nhat transfer state `SHIPPED/IN_TRANSIT` theo contract M6
- **Transfer receive complete** -> callback M6 cap nhat transfer `RECEIVED`

### 13.4 Acceptance Criteria
- **AC-3.1**: Putaway line COMPLETED tao 1 InventTrans type=MOVE, KHONG tao RECEIVE.
- **AC-3.2**: Pick line COMPLETED tao 1 InventTrans type=MOVE, KHONG tao SHIP.
- **AC-3.3**: Tat ca line terminal -> Header auto COMPLETED.
- **AC-3.4**: Putaway complete -> callback M4.
- **AC-3.5**: All pick works done -> callback M5 state PICKED.
- **AC-3.6**: Transfer pick -> TRANSFER_SHIP; transfer put -> TRANSFER_RECEIVE.
- **AC-3.7**: Retry complete line cung external_id khong tao them ledger.
- **AC-3.8**: Line da POSTED khong cho complete lan 2.

---

## 14. Exception Handling Decision Tables

### 14.1 Short Pick

| Condition | System Action | Completion Allowed | Follow-up |
|-----------|---------------|-------------------|-----------|
| actual_qty = expected_qty | Complete binh thuong | Yes | No exception |
| actual_qty < expected_qty and variance <= 2% | Log SHORT_PICK | Yes | Exception severity LOW |
| variance > 2% and <= 5% | Log SHORT_PICK + flag manager review | Yes | Exception severity MEDIUM, dashboard alert |
| variance > 5% | Block line complete | No | Manager intervention required |
| actual_qty > expected_qty | Block | No | Review allocation/source doc |

### 14.2 Location Mismatch

| Condition | System Action | Completion Allowed | Follow-up |
|-----------|---------------|-------------------|-----------|
| Scan dung expected location | Continue | Yes | None |
| Scan sai location, worker chua override | Block | No | Worker scan lai |
| Scan sai location, manager override online | Log override reason + evidence | Yes | Exception severity MEDIUM |
| Destination sai warehouse / sai type | Block hard | No | Khong duoc override trong Phase 1 |

### 14.3 Item Not Found / Source Empty

| Condition | System Action | Line Status | Follow-up |
|-----------|---------------|-------------|-----------|
| Worker khong tim thay hang tai source | Raise NOT_FOUND | SKIPPED | Flag cycle count / review allocation |
| Source con hang nhung khong du qty | Short pick logic | COMPLETED or BLOCKED | Theo threshold |
| Sync conflict do line da duoc device khac complete | Raise SYNC_CONFLICT | Giu line trang thai server | Manager review |

### 14.4 Acceptance Criteria
- **AC-4.1**: Short pick variance duoc log voi reason code.
- **AC-4.2**: Short pick >5% block line complete.
- **AC-4.3**: Location mismatch block cho den khi dung scan hoac manager override hop le.
- **AC-4.4**: Item not found -> WorkLine SKIPPED, exception logged, cycle count flagged.
- **AC-4.5**: Overage khong duoc auto-accept.
- **AC-4.6**: Destination sai warehouse/sai type la hard block.

---

## 15. Work Monitoring & Supervisor View

### 15.1 Dashboard Metrics
- Work queue: OPEN / IN_PROGRESS / COMPLETED / CANCELLED count per warehouse per type
- Filter by: shift, operator, warehouse, work type, date, source_type
- SLA tracking:
  - total lead time = completed_at - created_at
  - execution time = completed_at - started_at
- Alert:
  - IN_PROGRESS > 4 gio -> warning
  - OPEN > 8 gio -> backlog alert
  - sync conflict ton tai > 30 phut -> manager alert
- Exception list: location mismatch, source empty, sync fail, short pick >2%

### 15.2 Manager Override Complete
WH_MANAGER co the override-complete work tu web dashboard, nhung bat buoc:
1. actual_qty phai duoc nhap
2. reason_code required
3. evidence required
4. line phai chua o terminal state
5. he thong ghi audit trail day du

**Khong cho phep:** complete without quantity, override offline, override destination sai warehouse/sai location_type.

### 15.3 Acceptance Criteria
- **AC-5.1**: Dashboard hien thi dung count per status/type/warehouse.
- **AC-5.2**: Manager override complete bat buoc actual_qty + reason_code + evidence.
- **AC-5.3**: Alert hien khi work IN_PROGRESS vuot SLA threshold.
- **AC-5.4**: Tat ca override va cancel duoc ghi audit trail.
- **AC-5.5**: Dashboard xem duoc exception pending review.

---

## 16. Offline Queue & Sync

### 16.1 Supported Offline Commands
- `LINE_START`
- `LINE_COMPLETE`
- `LINE_SKIP` (chi neu duoc policy cho phep tu manager online? -> **Phase 1: worker khong duoc skip offline; manager skip online only**)
- `WORK_START`

### 16.2 Not Supported Offline
- manager override complete
- manager override location mismatch
- work cancel
- split putaway action sau khi da offline complete mot line

### 16.3 Offline Rules
- Moi event phai co `external_id`, `device_id`, `device_event_time`, `sequence_no`
- Server time la nguon chuan cho audit chinh thuc
- Batch sync phai duoc ap dung theo thu tu `sequence_no`
- Qua 24 gio chua sync xong -> app canh bao, khoa tao event moi cho den khi user sync thanh cong hoac manager reset
- Conflict khong auto-overwrite

### 16.4 Sync Response Model
Moi event trong batch tra 1 ket qua:
- `SUCCESS`
- `DUPLICATE`
- `CONFLICT`
- `REJECTED`

### 16.5 Acceptance Criteria
- **AC-6.1**: Offline complete duoc queue local.
- **AC-6.2**: Sync gui event voi external_id; duplicate khong tao moi.
- **AC-6.3**: Conflict flag hien cho manager review.
- **AC-6.4**: Pending sync count visible tren mobile UI.
- **AC-6.5**: Event qua 24 gio chua sync duoc bi khoa phat sinh event moi.

---

## 17. Transfer Work Execution

### 17.1 Scope
Inter-warehouse Transfer Order (M6) tao 2 bo work:
1. **TRANSFER_PICK** tai source warehouse
2. **TRANSFER_PUT** tai destination warehouse

### 17.2 Flow
```text
Transfer Order RELEASED (M6)
  -> Auto-create TRANSFER_PICK work
  -> Keeper claim + execute pick
  -> Pick complete -> TRANSFER_SHIP posted
  -> Transfer state -> SHIPPED / IN_TRANSIT (M6)
  -> Arrival confirmed
  -> Auto-create TRANSFER_PUT work
  -> Keeper claim + execute putaway
  -> Putaway complete -> TRANSFER_RECEIVE posted
  -> Transfer state -> RECEIVED (M6)
```

### 17.3 Rules
- TRANSFER_PICK va TRANSFER_PUT la 2 WorkHeader rieng
- M7 khong duoc cho phep move stock dang `IN_TRANSIT` sang process khac
- Transfer receive chi duoc execute khi M6 cho phep arrival
- Net system qty sau ca 2 trans = 0
- Phan variance transfer neu co khong xu ly tai M7; chuyen ve workflow exception cua M6

### 17.4 Acceptance Criteria
- **AC-7.1**: Transfer RELEASED -> auto-create TRANSFER_PICK.
- **AC-7.2**: Transfer pick complete -> TRANSFER_SHIP posted.
- **AC-7.3**: Arrival confirmed -> auto-create TRANSFER_PUT.
- **AC-7.4**: Transfer put complete -> TRANSFER_RECEIVE posted.
- **AC-7.5**: IN_TRANSIT stock khong allocate cho outbound thuong.
- **AC-7.6**: Tong he thong net = 0 sau transfer ship + receive.

---

## 18. State Machines

### 18.1 WorkHeader State Catalog

| From | To | Trigger | Actor | Preconditions | Postconditions |
|------|----|---------|-------|---------------|----------------|
| NEW | OPEN | auto-create | System | Trigger source valid | work created |
| OPEN | OPEN | claim | Keeper/Manager | assigned_to is null | assigned_to set |
| OPEN | IN_PROGRESS | start | Assigned keeper/manager | assigned_to not null | started_at set |
| OPEN | CANCELLED | cancel | WH_MANAGER | no line completed | cancelled_at + reason |
| IN_PROGRESS | COMPLETED | all lines terminal | System | all lines completed/skipped/cancelled | completed_at set |
| IN_PROGRESS | CANCELLED | cancel | WH_MANAGER | reason_code required | header cancelled; open lines cancelled |

### 18.2 WorkLine State Catalog

| From | To | Trigger | Actor | Preconditions | Postconditions |
|------|----|---------|-------|---------------|----------------|
| NEW | OPEN | create | System | work created | line available |
| OPEN | IN_PROGRESS | start line | Assigned keeper | header in progress | started_at set |
| IN_PROGRESS | COMPLETED | complete | Assigned keeper / manager override | validation pass, qty entered | posting requested |
| OPEN/IN_PROGRESS | SKIPPED | skip | WH_MANAGER | reason required | exception logged |
| OPEN/IN_PROGRESS | CANCELLED | parent cancel | System/Manager | header cancelled | terminal |
| OPEN | OPEN | split putaway | System | putaway line not completed | child lines created |

### 18.3 Forbidden Transitions
- `COMPLETED -> any`
- `CANCELLED -> any`
- `SKIPPED -> COMPLETED`
- `OPEN -> COMPLETED` without `IN_PROGRESS`
- `OPEN(unassigned) -> IN_PROGRESS`
- `COMPLETED -> REOPEN` trong Phase 1. Neu can correction phai qua reverse/counter-flow o module owner

### 18.4 Shipment State Handoff
`ALLOCATED -> PICKING -> PICKED -> SHIPPED`  
M7 chi tham gia o doan `PICKING -> PICKED`.

---

## 19. RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | OPS_SUPER |
|--------|-----------|------------|----------|-----------|
| View work list | Y (own WH) | Y | Y | Y |
| Claim work | Y | Y | — | — |
| Release claim | Y (own claim) | Y | — | — |
| Start work / line | Y (assigned) | Y | — | — |
| Complete line | Y (assigned) | Y | — | — |
| Split putaway | Y (assigned) | Y | — | — |
| Cancel work | — | Y | Y | — |
| Override location mismatch | — | Y | — | — |
| Manager override complete | — | Y | — | — |
| Skip line | — | Y | — | — |
| View reports / SLA | — | Y | Y | Y |

---

## 20. Business Rules

| Rule ID | Rule | Note |
|---------|------|------|
| WE-BR-001 | Auto-create work tu source trigger | Receipt RECEIVED, Shipment ALLOCATED, Move RELEASED, Transfer RELEASED/arrival |
| WE-BR-002 | Self-claim, 1 work = 1 person active claim | No directed assignment Phase 1 |
| WE-BR-003 | Tat ca line terminal -> header COMPLETED | Auto-transition |
| WE-BR-004 | Line COMPLETED -> 1 posting effect | M7 chi post MOVE/TRANSFER, khong RECEIVE/SHIP |
| WE-BR-005 | Short pick threshold | <=2% auto-accept, >2% đến <=5% flag, >5% block |
| WE-BR-006 | Cancel OPEN = direct; cancel IN_PROGRESS = manager + reason | |
| WE-BR-007 | Priority default | Pick urgent=10, normal=30, Transfer=40, Putaway=50, Move=60 |
| WE-BR-008 | QR scan validation required | Location exists, dung warehouse, dung type |
| WE-BR-009 | Offline queue + sync via external_id | Idempotent |
| WE-BR-010 | Reversal = counter-trans, never delete ledger | Theo M3 |
| WE-BR-011 | Putaway destination MUST be STORAGE | Hard validation |
| WE-BR-012 | Manager override complete MUST have actual_qty + reason_code + evidence | No blind force-complete |
| WE-BR-013 | Shipment state handoff | ALLOCATED->PICKING khi work tao; PICKING->PICKED khi tat ca pick work xong |
| WE-BR-014 | Move approval nam o M6, khong o M7 | M7 chi execute released work |
| WE-BR-015 | Putaway split support | Child lines tong qty = parent qty goc |
| WE-BR-016 | Offline event max age = 24h | Het 24h phai sync truoc khi tao event moi |

---

## 21. API Endpoints

### 21.1 Endpoint Inventory

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | GET | /api/v1/works | WH_KEEPER, WH_MANAGER | List works |
| 2 | GET | /api/v1/works/{work_id} | WH_KEEPER, WH_MANAGER | Work detail + lines |
| 3 | POST | /api/v1/works/{work_id}/claim | WH_KEEPER | Self-claim work |
| 4 | POST | /api/v1/works/{work_id}/release | WH_KEEPER | Release claimed work |
| 5 | POST | /api/v1/works/{work_id}/start | WH_KEEPER | Start work |
| 6 | POST | /api/v1/works/{work_id}/cancel | WH_MANAGER | Cancel work |
| 7 | POST | /api/v1/works/{work_id}/lines/{line_num}/start | WH_KEEPER | Start line |
| 8 | POST | /api/v1/works/{work_id}/lines/{line_num}/complete | WH_KEEPER | Complete line |
| 9 | POST | /api/v1/works/{work_id}/lines/{line_num}/skip | WH_MANAGER | Skip line |
| 10 | POST | /api/v1/works/{work_id}/lines/{line_num}/split | WH_KEEPER, WH_MANAGER | Split putaway line |
| 11 | POST | /api/v1/works/{work_id}/manager-override-complete | WH_MANAGER | Override complete |
| 12 | GET | /api/v1/mobile/works/available | WH_KEEPER | List claimable works |
| 13 | GET | /api/v1/mobile/works/my | WH_KEEPER | List assigned works |
| 14 | POST | /api/v1/mobile/scan/validate | WH_KEEPER | Validate scanned QR |
| 15 | POST | /api/v1/mobile/works/sync | WH_KEEPER | Batch sync offline events |

### 21.2 Contract Details for Critical APIs

#### 21.2.1 POST `/api/v1/works/{work_id}/claim`
**Purpose:** Claim work for current user.  
**Request Body**
```json
{
  "external_id": "mob-claim-001",
  "device_id": "device-01"
}
```
**Validation**
- work ton tai
- status = OPEN
- assigned_to is null
- user co quyen tai warehouse cua work

**Response**
```json
{
  "work_id": "WRK-20260308-0001",
  "status": "OPEN",
  "assigned_to": "current_user_id",
  "assigned_at": "server_time",
  "result": "SUCCESS"
}
```

#### 21.2.2 POST `/api/v1/works/{work_id}/start`
**Request Body**
```json
{
  "external_id": "mob-work-start-001",
  "device_id": "device-01"
}
```
**Validation**
- work da duoc claim boi current user
- header status = OPEN
- khong o terminal state

**Response Codes**
- `200 SUCCESS`
- `409 DUPLICATE`
- `422 INVALID_STATE`

#### 21.2.3 POST `/api/v1/works/{work_id}/lines/{line_num}/complete`
**Request Body**
```json
{
  "external_id": "mob-line-complete-001",
  "device_id": "device-01",
  "device_event_time": "2026-03-08T10:30:00+07:00",
  "actual_qty": 1000.0,
  "uom": "KG",
  "scanned_location": "LOC-A-01-01",
  "reason_code": null
}
```
**Validation**
- line status = IN_PROGRESS
- current user la assignee hoac manager
- location hop le theo work type
- actual_qty > 0
- short pick threshold duoc apply
- duplicate `external_id` -> tra response cu
- line da POSTED -> reject

**Response**
```json
{
  "work_id": "WRK-20260308-0001",
  "line_num": 1,
  "line_status": "COMPLETED",
  "posting_status": "POSTED",
  "invent_trans_id": "ITR-000123",
  "result": "SUCCESS"
}
```

#### 21.2.4 POST `/api/v1/works/{work_id}/lines/{line_num}/split`
**Purpose:** Split putaway line into multiple child lines.  
**Request**
```json
{
  "external_id": "mob-split-001",
  "splits": [
    {"expected_qty": 500.0, "to_location_id": "LOC-A-01-01"},
    {"expected_qty": 500.0, "to_location_id": "LOC-A-01-02"}
  ]
}
```
**Validation**
- chi ap dung cho `PUTAWAY`
- line chua COMPLETED
- tong split qty = expected_qty line goc
- tat ca destination location type = STORAGE

#### 21.2.5 POST `/api/v1/works/{work_id}/manager-override-complete`
**Request**
```json
{
  "external_id": "web-override-001",
  "line_num": 1,
  "actual_qty": 980.0,
  "reason_code": "PHYSICAL_VERIFIED",
  "evidence": "Da kiem tra thuc te tai A-01-01"
}
```
**Validation**
- actor = WH_MANAGER
- line chua terminal
- actual_qty required
- evidence required
- khong override hard-block rule

#### 21.2.6 POST `/api/v1/mobile/works/sync`
**Request**
```json
{
  "batch_id": "batch-001",
  "device_id": "device-01",
  "events": [
    {
      "external_id": "mob-evt-001",
      "sequence_no": 1,
      "command_type": "LINE_START",
      "work_id": "WRK-20260308-0001",
      "line_num": 1,
      "device_event_time": "2026-03-08T10:20:00+07:00"
    },
    {
      "external_id": "mob-evt-002",
      "sequence_no": 2,
      "command_type": "LINE_COMPLETE",
      "work_id": "WRK-20260308-0001",
      "line_num": 1,
      "actual_qty": 1000.0,
      "scanned_location": "LOC-A-01-01",
      "device_event_time": "2026-03-08T10:30:00+07:00"
    }
  ]
}
```
**Response**
```json
{
  "batch_id": "batch-001",
  "status": "PARTIAL",
  "results": [
    {"external_id": "mob-evt-001", "apply_status": "SUCCESS"},
    {"external_id": "mob-evt-002", "apply_status": "DUPLICATE"}
  ]
}
```

### 21.3 Standard Error Codes
- `INVALID_STATE`
- `LOCATION_MISMATCH`
- `LOCATION_TYPE_INVALID`
- `SHORT_PICK_BLOCKED`
- `DUPLICATE_EXTERNAL_ID`
- `SYNC_CONFLICT`
- `FORBIDDEN`
- `WORK_NOT_ASSIGNED`
- `LINE_ALREADY_POSTED`

---

## 22. Scenario Matrix / UAT Catalog

| Scenario ID | Scenario | Expected Result |
|-------------|----------|-----------------|
| UAT-M7-001 | Receipt RECEIVED -> create putaway work | 1 work OPEN tao thanh cong |
| UAT-M7-002 | Keeper claim + start putaway | assigned_to set, header IN_PROGRESS |
| UAT-M7-003 | Putaway complete dung location STORAGE | line COMPLETED, MOVE posted |
| UAT-M7-004 | Putaway split 1 receipt vao 2 locations | 2 child lines, 2 postings, tong qty bao toan |
| UAT-M7-005 | Pick complete dung source location | MOVE STORAGE->STAGING posted |
| UAT-M7-006 | Pick short pick 1% | complete, low exception |
| UAT-M7-007 | Pick short pick 4% | complete, manager review flag |
| UAT-M7-008 | Pick short pick 6% | block completion |
| UAT-M7-009 | Location mismatch khong override | block |
| UAT-M7-010 | Location mismatch co manager override hop le | complete + audit |
| UAT-M7-011 | Item not found | line SKIPPED, cycle count flag |
| UAT-M7-012 | Offline complete -> sync success | event SUCCESS, line posted |
| UAT-M7-013 | Offline duplicate retry | DUPLICATE, khong them ledger |
| UAT-M7-014 | Sync conflict do device khac complete truoc | CONFLICT, manager review |
| UAT-M7-015 | Transfer pick complete | TRANSFER_SHIP posted |
| UAT-M7-016 | Transfer put complete | TRANSFER_RECEIVE posted |
| UAT-M7-017 | Manager override khong nhap evidence | reject |
| UAT-M7-018 | Cancel work IN_PROGRESS | manager + reason required |

---

## 23. Traceability Matrix

| Story / Need | Business Rule | API / Process | Data Objects | UAT |
|--------------|---------------|---------------|--------------|-----|
| Tu dong tao work tu Receipt/Shipment/Move/Transfer | WE-BR-001 | auto-create job | work_header, work_line | UAT-M7-001 |
| Keeper tu claim va start work | WE-BR-002 | claim/start APIs | work_header, work_event_log | UAT-M7-002 |
| Putaway/Pick/Move/Transfer post dung ledger | WE-BR-004 | complete line | work_line, invent_trans_id | UAT-M7-003/005/015/016 |
| Short pick xu ly theo threshold | WE-BR-005 | complete line + exception flow | work_exception | UAT-M7-006/007/008 |
| QR validation bat buoc | WE-BR-008 | scan validate / complete line | work_line.scanned_location_id | UAT-M7-009/010 |
| Manager override co bang chung | WE-BR-012 | manager-override-complete | override fields, event log | UAT-M7-017 |
| Sync offline khong duplicate | WE-BR-009, WE-BR-016 | mobile sync | sync batch/event | UAT-M7-012/013/014 |
| Putaway split nhieu location | WE-BR-015 | split line | parent_line_id | UAT-M7-004 |

---

## 24. Non-Functional Requirements

### 24.1 Performance
- Work list query p95 < 2s voi 5,000 work active / warehouse
- Complete line API p95 < 3s khong tinh latency mobile network
- Sync batch 100 events p95 < 5s server-side

### 24.2 Reliability
- Command side-effect bat buoc idempotent
- Ledger duplicate = zero tolerance
- Audit log khong duoc mat

### 24.3 Security
- RBAC theo warehouse scope
- Manager override bat buoc role check + audit
- Device token phai hop le de sync mobile

### 24.4 Observability
- Log key fields: `work_id`, `line_num`, `external_id`, `correlation_id`, `source_type`, `source_id`
- Metrics: completion success rate, sync conflict count, duplicate event count, SLA breaches

---

## 25. Open Items (Non-Blocker)

| # | Item | Priority | Note |
|---|------|----------|------|
| 1 | Priority config UI theo warehouse | P2 | Backend support, UI defer |
| 2 | Wave processing | P2 | Out of scope Phase 1 |
| 3 | Capacity-based putaway suggestion | P2 | Can piggyback M2/M6 later |
| 4 | Directed assignment | P2 | Xem sau khi team van hanh on dinh |
| 5 | Advanced labor planning | P3 | Khong anh huong Phase 1 |

---

## 26. Final Build Readiness Summary

Module 7 sau khi bo sung v1.2 duoc xem la **spec hoan chinh hon cho Phase 1**, voi cac diem da duoc khoa:
- ranh gioi module va posting ownership,
- short pick threshold,
- move approval ownership,
- putaway split model,
- offline duration,
- state catalog,
- schema ho tro audit/sync,
- API contract critical path,
- scenario/UAT matrix.

Cac muc con lai chi la enhancement P2/P3, khong chan build Phase 1.

---
