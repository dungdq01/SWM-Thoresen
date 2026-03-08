# Module 6 — Inventory Control: Functional Specification

**Version:** 1.1  
**Created:** 2026-03-08  
**Status:** ENHANCED DRAFT — Build-Ready BA Spec  
**Source Base:** Module 6 draft + overview system spec + M2/M3/M5 related rules and ownership boundaries

---

## 1. Document Purpose

Tài liệu này đặc tả chức năng cho **Module 6 — Inventory Control** trong hệ thống SWM Thoresen. Mục tiêu là mô tả đầy đủ nghiệp vụ, phạm vi, dữ liệu, luồng xử lý, quy tắc kiểm soát, API contract ở mức BA-functional, trạng thái đối tượng, ngoại lệ, UAT scenarios và ranh giới ownership với các module liên quan.

Module 6 chịu trách nhiệm cho các nghiệp vụ điều khiển tồn kho sau khi hàng đã tồn tại trong hệ thống, gồm:
- tra cứu tồn và lịch sử dịch chuyển,
- di chuyển nội bộ trong kho,
- chuyển kho,
- đổi trạng thái tồn,
- kiểm kê chu kỳ,
- điều chỉnh tồn,
- theo dõi sai lệch và reconciliation review.

**Nguyên tắc cốt lõi:** Module 6 **không cập nhật OnHand trực tiếp**. Mọi side-effect tồn kho đều phải đi qua **M3 Inventory Core Engine** để post InventTrans và tái tính OnHand.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- On-Hand Inquiry
- Movement History / Inventory History
- Move Internal (cùng warehouse, đổi location)
- Inter-Warehouse Transfer (Transfer Order with IN_TRANSIT state)
- Inventory Status Change (AVAILABLE ↔ BLOCKED / DAMAGED)
- Cycle Count (blind count → variance → decision → adjustment)
- Inventory Adjustment (manual adjustment, reason code mandatory)
- Reconciliation Review / Inventory Exception Review
- Auditability, idempotency, correlation tracking, event publishing

### 2.2 Phase 2 (Planned)
- Batch/Lot tracking trong InventDim mở rộng
- Serial-level control cho selected items
- Quality Hold workflow với external QC/Lab integration
- Directed movement bằng strategy nâng cao theo zone/capacity/profile
- Auto task generation theo SLA và alert center
- Cross-docking orchestration có dependency từ inbound/outbound/work execution

### 2.3 Out of Scope
- Full physical inventory với warehouse freeze toàn phần
- Transport management ngoài transfer nội bộ giữa kho
- Route optimization / vehicle planning
- Financial inventory valuation / costing engine
- 3PL billing logic chi tiết ngoài inventory quantity impact event

---

## 3. Business Context

Warehouse operations luôn phát sinh thay đổi tồn kho ngoài luồng Inbound/Outbound chuẩn. Nếu không có Module 6, các nghiệp vụ correction và control sẽ bị thực hiện thủ công, khó audit, khó trace, và dễ làm lệch số liệu tồn.

Các nhu cầu nghiệp vụ chính:
- **Move Internal:** dời hàng giữa các vị trí để tối ưu sức chứa, gom hàng, tách hàng, hoặc chuẩn bị pick.
- **Inter-Warehouse Transfer:** chuyển hàng giữa 2 kho, có trạng thái trung gian IN_TRANSIT.
- **Status Change:** chặn hàng, chuyển hàng hư hỏng, hoặc giải phóng hàng về trạng thái allocatable.
- **Cycle Count:** kiểm kê chu kỳ để phát hiện chênh lệch giữa thực tế và hệ thống.
- **Adjustment:** điều chỉnh tồn có kiểm soát khi có sai lệch hoặc sự kiện ngoại lệ.
- **On-Hand Inquiry & History:** tra cứu nhanh tồn hiện tại và lịch sử dịch chuyển để vận hành, điều tra, audit, và đối soát.
- **Reconciliation Review:** phát hiện và xử lý sai khác giữa ledger và snapshot tồn.

---

## 4. Module Goals

1. Đảm bảo mọi thay đổi tồn kho được thực hiện theo quy trình kiểm soát chuẩn.
2. Tăng tính minh bạch và khả năng audit cho mọi inventory correction.
3. Hạn chế cập nhật thủ công gây lệch tồn.
4. Tách rõ vai trò giữa operational use case (M6) và inventory posting engine (M3).
5. Cung cấp dữ liệu đầu vào đáng tin cậy cho Outbound, Reporting, Billing và Audit.

---

## 5. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation & Governance | Uses | RBAC, NumberSequence, ReasonCode, AuditLog, ApprovalPolicy, IdempotencyPolicy |
| M2 Master Data | Uses | Warehouse, Location, Zone, Owner, Item, UOM, Inventory Status, Location Profile, Capacity |
| M3 Inventory Core Engine | Uses | InventTrans posting, OnHand query, InventDim lookup, reconciliation engine, reverse posting |
| M5 Outbound Operations | Constraint | Reserved stock / allocated stock không được move/adjust trái rule |
| M7 Work Execution | Triggers / Integrates | Move/Transfer có thể generate WorkHeader + WorkLine để execute |
| M8 Mobile / Device Layer | Optionally Uses | Scan execute move, count, receive transfer |
| M10 Billing | Publishes impact | Status change, transfer, adjustment có thể ảnh hưởng billable quantity |
| Reporting / Audit module | Feeds | History, variance, shrinkage, adjustment, transfer aging |

---

## 6. User Personas

| Role | Main Use Cases in M6 |
|------|-----------------------|
| WH_KEEPER | Execute move work, execute transfer shipping/receiving, perform cycle count |
| WH_MANAGER | Create move/transfer, status change, review variance, approve or reject adjustment, close exceptions |
| WH_ADMIN | Configure count plan, thresholds, warehouse execution mode, control limits |
| OPS_SUPER | Monitor transfer aging, reconciliation exceptions, variance trends, audit trace |
| AUDITOR | Read-only access to movement history, adjustment history, count evidence |

---

## 7. Design Principles

1. **Mọi thay đổi tồn kho phải đi qua InventTrans.** OnHand là hệ quả tính từ ledger; Module 6 không update trực tiếp snapshot tồn.
2. **Idempotency bắt buộc cho mọi API side-effect.** Mỗi lệnh nghiệp vụ phải có `external_id` duy nhất theo scope transaction.
3. **Correlation tracking end-to-end.** Mọi document, work, event, transaction phải truy ra cùng `correlation_id`.
4. **Reverse-only correction.** Không sửa ledger cũ; mọi correction phải tạo transaction đảo hoặc transaction bù.
5. **Reason-code driven control.** Điều chỉnh và status change bắt buộc có reason code; một số trường hợp cần reason text bổ sung.
6. **Availability-aware processing.** Chỉ quantity hợp lệ theo rule mới được move/adjust/status change.
7. **Separation of concern.** M6 quản lý operational document/use case; M3 quản lý posting/inventory state persistence; M7 quản lý work execution.
8. **Permission + limit + traceability.** Bất kỳ inventory correction nào cũng phải gắn với vai trò, hạn mức, thời gian, người thao tác và nguồn phát sinh.
9. **Direct execute hoặc work-driven execute đều phải ra cùng inventory effect.** Khác biệt chỉ ở orchestration, không khác bản chất posting.
10. **Query và command tách biệt.** On-hand/history/reconciliation review là read models; move/transfer/count/adjust/status change là command models.

---

## 8. Module Structure (Enhanced Sub-Modules)

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | On-Hand Inquiry | Tra cứu tồn theo item/owner/warehouse/location/status với drill-down |
| 2 | Movement History / Inventory History | Tra cứu lịch sử InventTrans ở góc nhìn nghiệp vụ |
| 3 | Move Internal | Di chuyển hàng giữa locations cùng warehouse |
| 4 | Inter-Warehouse Transfer | Chuyển kho với vòng đời ship → IN_TRANSIT → receive |
| 5 | Inventory Status Change | Đổi trạng thái inventory dimension theo rule |
| 6 | Cycle Count | Blind count, variance review, recount, posting adjustment |
| 7 | Inventory Adjustment | Manual adjustment và adjustment phát sinh từ variance/reconciliation |
| 8 | Reconciliation Review | Theo dõi sai lệch và xử lý exception giữa ledger/on-hand |
| 9 | Auditability & Integration | Idempotency, correlation, event publishing, KPI hooks |

---

## 9. Ownership Boundaries

### 9.1 Ownership Matrix

| Capability | Owned By | Module 6 Responsibility | Not Owned By M6 |
|-----------|----------|-------------------------|-----------------|
| Inventory posting | M3 | Build command request và gọi posting engine | Không tự insert/update inventory ledger |
| On-hand calculation | M3 | Gọi query/read model, hiển thị nghiệp vụ | Không tự tính tồn từ dữ liệu riêng của M6 |
| Location / warehouse master | M2 | Validate theo master data khi tạo và execute transaction | Không sở hữu định nghĩa location, zone, capacity |
| Reservation / allocation | M5 / M3 | Tôn trọng reserved stock rules | Không tự giải phóng reservation trái rule |
| Work execution | M7 | Có thể phát sinh work document | Không quản lý life-cycle chi tiết của work ngoài status liên quan |
| Billing impact | M10 | Publish event inventory impact | Không tính phí trực tiếp |
| Audit log infra | M1 | Gọi log, lưu metadata nghiệp vụ | Không thay thế audit framework |

### 9.2 Golden Rules
- Module 6 **không** cập nhật `on_hand` trực tiếp.
- Module 6 **không** được bypass reserved/allocation rule.
- Module 6 **không** sửa transaction đã post; chỉ reverse hoặc create compensating transaction.
- Module 6 **được phép** sở hữu document nghiệp vụ của move, transfer, count, adjustment, reconciliation review.
- Module 6 **được phép** hiển thị history/read model ở góc nhìn nghiệp vụ, nhưng source-of-truth ledger vẫn là M3.

---

## 10. Data Objects & Schema

### 10.1 Core Data Objects
- `move_order`
- `move_order_line`
- `transfer_order`
- `transfer_order_line`
- `inventory_status_change`
- `cycle_count_plan`
- `cycle_count_header`
- `cycle_count_line`
- `adjustment_header`
- `adjustment_line`
- `reconciliation_review`
- `inventory_query_snapshot` (read-model/cache optional)

### 10.2 Common Control Fields (for all command documents)

| Field | Type | Required | Note |
|------|------|----------|------|
| id | UUID | Y | PK |
| external_id | VARCHAR | Y | Idempotency key theo business action |
| correlation_id | UUID | Y | End-to-end trace |
| source_app | VARCHAR | Y | WEB / MOBILE / API / BATCH |
| source_ref_type | VARCHAR | N | Ví dụ: COUNT_PLAN, TRANSFER, MANUAL |
| source_ref_id | VARCHAR | N | Document nguồn |
| created_by | VARCHAR | Y | User/account tạo |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |
| version_no | INT | Y | Optimistic locking |
| warehouse_id / scope_warehouse_id | FK | Y/N | Tùy object |
| owner_id / scope_owner_id | FK | Y/N | Tùy object |

### 10.3 move_order Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| move_number | VARCHAR | Y | NumberSequence |
| warehouse_id | FK | Y | Source = destination warehouse |
| execution_mode | ENUM | Y | DIRECT / WORK_BASED |
| status | ENUM | Y | DRAFT / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED / FAILED |
| requested_by | VARCHAR | Y | |
| confirmed_by | VARCHAR | N | |
| completed_by | VARCHAR | N | |
| reason_code | VARCHAR | N | Optional for standard move, mandatory for exceptional move if configured |
| cancel_reason_code | VARCHAR | N | |
| work_header_id | FK | N | If generate work |
| posting_batch_id | VARCHAR | N | Reference to posting group |
| posted_at | TIMESTAMP | N | |
| remarks | TEXT | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| source_app | VARCHAR | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.4 move_order_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| move_order_id | FK | Y | |
| line_no | INT | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | |
| from_location_id | FK | Y | |
| to_location_id | FK | Y | |
| inventory_status | VARCHAR | Y | Status hiện tại của stock |
| requested_qty | DECIMAL | Y | |
| executed_qty | DECIMAL | N | |
| uom | VARCHAR | Y | Base or transaction UOM chuẩn hóa |
| status | ENUM | Y | OPEN / EXECUTING / COMPLETED / CANCELLED / FAILED |
| shortage_reason_code | VARCHAR | N | Nếu execute thiếu |
| posted_trans_group_id | VARCHAR | N | Link tới cặp trans move |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.5 transfer_order Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| transfer_number | VARCHAR | Y | NumberSequence |
| from_warehouse_id | FK | Y | Source warehouse |
| to_warehouse_id | FK | Y | Destination warehouse |
| execution_mode | ENUM | Y | DIRECT / WORK_BASED |
| status | ENUM | Y | CREATED / RELEASED / SHIPPED / IN_TRANSIT / PARTIALLY_RECEIVED / RECEIVED / CLOSED / CANCELLED / FAILED |
| requested_ship_date | DATE | N | |
| actual_ship_at | TIMESTAMP | N | |
| actual_receive_at | TIMESTAMP | N | |
| in_transit_sla_hours | INT | N | For aging monitoring |
| vehicle_number | VARCHAR | N | Optional |
| shipped_by | VARCHAR | N | |
| received_by | VARCHAR | N | |
| cancel_reason_code | VARCHAR | N | |
| close_reason_code | VARCHAR | N | |
| remarks | TEXT | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| source_app | VARCHAR | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.6 transfer_order_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| transfer_order_id | FK | Y | |
| line_no | INT | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | Ownership giữ nguyên trong P1 |
| uom | VARCHAR | Y | |
| requested_qty | DECIMAL | Y | |
| shipped_qty | DECIMAL | N | |
| received_qty | DECIMAL | N | |
| variance_qty | DECIMAL | N | shipped_qty - received_qty |
| from_location_id | FK | Y | |
| to_location_id | FK | N | Gán lúc receive nếu needed |
| inventory_status | VARCHAR | Y | Usually AVAILABLE/BLOCKED per allowed matrix |
| line_status | ENUM | Y | OPEN / SHIPPED / PARTIALLY_RECEIVED / RECEIVED / CLOSED / CANCELLED |
| variance_reason_code | VARCHAR | N | |
| issue_flag | BOOLEAN | Y | default false |
| posted_ship_trans_id | FK | N | |
| posted_receive_trans_id | FK | N | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.7 inventory_status_change Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| status_change_number | VARCHAR | Y | NumberSequence |
| warehouse_id | FK | Y | |
| location_id | FK | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | |
| from_status | VARCHAR | Y | |
| to_status | VARCHAR | Y | |
| qty | DECIMAL | Y | |
| uom | VARCHAR | Y | |
| reason_code | VARCHAR | Y | Mandatory |
| reason_text | TEXT | N | Required for some reason codes |
| attachment_ref | VARCHAR | N | Optional evidence link |
| status | ENUM | Y | CREATED / POSTED / REVERSED / FAILED / CANCELLED |
| posted_trans_group_id | VARCHAR | N | |
| requested_by | VARCHAR | Y | |
| approved_by | VARCHAR | N | If policy requires |
| posted_by | VARCHAR | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.8 cycle_count_plan Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| plan_code | VARCHAR | Y | Unique |
| warehouse_id | FK | Y | |
| scope_type | ENUM | Y | LOCATION / ITEM / OWNER / MIXED |
| selection_rule | JSONB | Y | Rule chọn scope |
| frequency | ENUM | Y | DAILY / WEEKLY / MONTHLY / AD_HOC |
| blind_count | BOOLEAN | Y | Default true |
| auto_release | BOOLEAN | Y | |
| active_flag | BOOLEAN | Y | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.9 cycle_count_header Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| count_number | VARCHAR | Y | NumberSequence |
| warehouse_id | FK | Y | |
| plan_id | FK | N | Nếu từ plan |
| count_type | ENUM | Y | FULL_AREA / PARTIAL / SPOT |
| scope_snapshot_ref | VARCHAR | Y | Snapshot reference ở thời điểm release |
| blind_count | BOOLEAN | Y | |
| status | ENUM | Y | CREATED / RELEASED / COUNTING / SUBMITTED / UNDER_REVIEW / APPROVED / POSTED / CANCELLED / FAILED |
| released_at | TIMESTAMP | N | |
| count_started_at | TIMESTAMP | N | |
| count_completed_at | TIMESTAMP | N | |
| review_completed_at | TIMESTAMP | N | |
| posted_at | TIMESTAMP | N | |
| created_by | VARCHAR | Y | |
| reviewed_by | VARCHAR | N | |
| approved_by | VARCHAR | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.10 cycle_count_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| cycle_count_header_id | FK | Y | |
| line_no | INT | Y | |
| location_id | FK | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | |
| inventory_status | VARCHAR | Y | |
| snapshot_qty | DECIMAL | Y | System qty tại thời điểm release |
| counted_qty | DECIMAL | N | Entered by counter |
| variance_qty | DECIMAL | N | counted_qty - snapshot_qty |
| variance_pct | DECIMAL | N | Quy đổi % |
| recount_required | BOOLEAN | Y | default false |
| recount_qty | DECIMAL | N | |
| final_counted_qty | DECIMAL | N | Sau recount nếu có |
| adjustment_decision | ENUM | N | AUTO_POST / PENDING_APPROVAL / REJECTED / NO_VARIANCE |
| adjustment_header_id | FK | N | |
| issue_code | VARCHAR | N | NOT_FOUND / OVERAGE / SHORTAGE / DAMAGE_FOUND |
| counted_by | VARCHAR | N | |
| recounted_by | VARCHAR | N | |
| counted_at | TIMESTAMP | N | |
| recounted_at | TIMESTAMP | N | |
| note | TEXT | N | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.11 adjustment_header Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| adjustment_number | VARCHAR | Y | NumberSequence |
| warehouse_id | FK | Y | |
| adjustment_type | ENUM | Y | MANUAL / COUNT_VARIANCE / RECONCILIATION / TRANSFER_VARIANCE / SYSTEM_CORRECTION |
| status | ENUM | Y | DRAFT / SUBMITTED / APPROVED / POSTED / REVERSED / REJECTED / CANCELLED |
| total_lines | INT | Y | |
| total_abs_qty | DECIMAL | Y | Tổng trị tuyệt đối |
| requested_by | VARCHAR | Y | |
| approved_by | VARCHAR | N | |
| posted_by | VARCHAR | N | |
| approval_required | BOOLEAN | Y | |
| reason_code | VARCHAR | Y | Header reason chung; line có thể override nếu policy cho phép |
| reason_text | TEXT | N | |
| source_ref_type | VARCHAR | N | COUNT / RECON / TRANSFER |
| source_ref_id | VARCHAR | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.12 adjustment_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| adjustment_header_id | FK | Y | |
| line_no | INT | Y | |
| location_id | FK | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | |
| inventory_status | VARCHAR | Y | |
| qty | DECIMAL | Y | + increase / - decrease |
| uom | VARCHAR | Y | |
| reason_code | VARCHAR | Y | Mandatory |
| reason_text | TEXT | N | |
| posted_trans_id | FK | N | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 10.13 reconciliation_review Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| review_number | VARCHAR | Y | NumberSequence |
| warehouse_id | FK | Y | |
| item_id | FK | N | Optional scope |
| owner_id | FK | N | Optional scope |
| run_mode | ENUM | Y | AUTO / MANUAL |
| discrepancy_type | ENUM | Y | ONHAND_MISMATCH / ORPHAN_TRANS / NEGATIVE_AVAILABLE / DIMENSION_INCONSISTENCY |
| severity | ENUM | Y | LOW / MEDIUM / HIGH / CRITICAL |
| status | ENUM | Y | OPEN / UNDER_INVESTIGATION / RESOLVED / CLOSED / CANCELLED |
| suggested_action | ENUM | Y | NONE / COUNT / ADJUST / REVERSE / ESCALATE |
| action_ref_type | VARCHAR | N | COUNT / ADJUSTMENT |
| action_ref_id | VARCHAR | N | |
| detected_at | TIMESTAMP | Y | |
| closed_at | TIMESTAMP | N | |
| detected_by | VARCHAR | Y | user or batch job |
| resolution_note | TEXT | N | |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

---

## 11. Sub-Module 1: On-Hand Inquiry

### 11.1 Business Purpose
Cho phép người dùng tra cứu tồn hiện tại theo chiều nghiệp vụ để ra quyết định vận hành và điều tra sai lệch.

### 11.2 Main Filters
- warehouse
- location
- zone
- owner
- item / item group
- inventory status
- available only / include zero / include blocked
- last movement date range
- negative available flag

### 11.3 Output Columns
- item_code
- item_name
- owner
- warehouse
- location
- inventory_status
- physical_qty
- reserved_qty
- available_qty
- blocked_qty
- last_movement_at
- last_source_ref

### 11.4 Drill-Down
- On-hand row → movement history of same dimension
- On-hand row → current reservations summary
- On-hand row → last count result
- On-hand row → related open transfer/move/status-change documents

### 11.5 Business Rules
1. Source-of-truth là M3 query/read model.
2. Permission phải giới hạn theo warehouse scope và owner scope.
3. Không hiển thị field tài chính trong Module 6.
4. Có thể export kết quả ra file phục vụ vận hành/audit.
5. Query phải support pagination, sorting, filtering và exact dimension match.

### 11.6 Acceptance Criteria
- Người dùng tra cứu đúng tồn theo từng item-location-owner-status.
- Drill-down tới history đúng correlation/source reference.
- Kết quả không hiển thị stock ngoài quyền truy cập của user.

---

## 12. Sub-Module 2: Movement History / Inventory History

### 12.1 Business Purpose
Cho phép tra cứu lịch sử chuyển động tồn kho theo góc nhìn nghiệp vụ, sử dụng dữ liệu ledger của M3 nhưng hiển thị dưới dạng business events dễ hiểu.

### 12.2 Supported Event Types
- INBOUND_RECEIPT
- OUTBOUND_SHIP
- MOVE
- TRANSFER_SHIP
- TRANSFER_RECEIVE
- STATUS_CHANGE
- ADJUSTMENT
- COUNT_VARIANCE_POST
- REVERSAL

### 12.3 Filters
- date range
- item
- owner
- warehouse / location
- event type
- reason code
- source_ref_type / source_ref_id
- external_id
- correlation_id
- user who posted

### 12.4 Display Columns
- posting_time
- business_event_type
- item
- qty
- uom
- dim_from
- dim_to
- reason_code
- source document
- posted_by
- correlation_id

### 12.5 Business Rules
1. Ledger history là immutable.
2. Correction phải hiển thị như transaction đảo, không overwrite record cũ.
3. Mỗi event nghiệp vụ phải map được về source document nếu có.
4. History phải hỗ trợ audit/export.

### 12.6 Acceptance Criteria
- User truy được lịch sử của một stock movement từ document tới transaction.
- Reverse transaction được hiển thị rõ là correction, không gây hiểu nhầm với giao dịch gốc.

---

## 13. Sub-Module 3: Move Internal

### 13.1 Description
Di chuyển hàng từ location A sang location B trong cùng warehouse. Không đổi owner, item hoặc warehouse; bản chất là đổi dimension location, có thể giữ nguyên status hoặc theo rule warehouse.

### 13.2 Flow
1. WH_MANAGER tạo move order.
2. System validate source, destination, item, owner, UOM, availability, permission.
3. System xác định execution mode: direct hoặc work-based.
4. Nếu work-based, generate work ở M7.
5. WH_KEEPER execute move.
6. M6 gọi M3 post move transaction group.
7. M3 ghi 2 inventory effects: trừ source location, cộng destination location.
8. M6 cập nhật document status completed và publish event.

### 13.3 Business Rules
1. Source và destination phải thuộc cùng warehouse.
2. `from_location_id != to_location_id`.
3. Chỉ move được `available_qty` hợp lệ theo rule reservation.
4. Không move stock đang ở trạng thái IN_TRANSIT.
5. Không move stock đã reserve nếu reservation policy không cho phép release.
6. Destination location phải active và thuộc loại location cho phép chứa stock.
7. P1: không cho đổi owner trong move.
8. P1: move không đổi inventory status; status change là use case riêng.
9. P1: partial execute được phép nếu policy warehouse cho phép; nếu partial thì line còn lại vẫn OPEN hoặc SHORT theo config.
10. Nếu execution mode là WORK_BASED thì completion của move order phụ thuộc completion của work.
11. Duplicate request cùng `external_id` không được tạo transaction mới.

### 13.4 Validation Matrix

| Validation | Rule |
|-----------|------|
| Warehouse consistency | from_location và to_location cùng warehouse với move header |
| Capacity | Nếu capacity check bật, destination phải còn sức chứa |
| Location type | Không cho move vào location không chứa stock theo cấu hình |
| Mixed owner policy | Nếu location không cho mixed owner thì phải reject |
| Mixed item policy | Nếu location không cho mixed item thì phải reject |
| Inventory status | Chỉ cho move status hợp lệ theo warehouse policy |
| Qty | requested_qty > 0 |
| UOM | Phải convert về base UOM trước posting nếu cần |

### 13.5 Acceptance Criteria
- Move thành công tạo đúng 1 document và 1 posting group.
- Tồn tại source giảm, destination tăng, net warehouse qty không đổi.
- Retry cùng external_id không tạo duplicate ledger.
- Audit truy được người tạo, người execute, thời gian, source app.

---

## 14. Sub-Module 4: Inter-Warehouse Transfer

### 14.1 Description
Transfer hàng giữa hai warehouse. Transfer có vòng đời chuẩn để biểu diễn hàng rời kho nguồn, đi qua trạng thái IN_TRANSIT, rồi nhập kho đích.

### 14.2 Transfer Order State Machine
`CREATED → RELEASED → SHIPPED → IN_TRANSIT → PARTIALLY_RECEIVED / RECEIVED → CLOSED`

Alternate terminal state:
- `CANCELLED` (chỉ trước khi SHIPPED hoặc theo policy)
- `FAILED` (lỗi posting cần xử lý)

### 14.3 Flow
1. WH_MANAGER tạo transfer order và lines.
2. System validate source/destination warehouses, item, owner, qty.
3. RELEASE transfer để lock intent.
4. Execute ship tại kho nguồn.
5. M6 gọi M3 post ship effect: source warehouse/location giảm, stock vào trạng thái IN_TRANSIT.
6. Transfer status chuyển `SHIPPED/IN_TRANSIT`.
7. Khi hàng tới kho đích, execute receive.
8. M6 gọi M3 post receive effect: giảm IN_TRANSIT, tăng stock tại destination warehouse/location.
9. Nếu receive thiếu/thừa, tạo variance record và xử lý theo rule.
10. Order đóng khi tất cả lines đã fully resolved.

### 14.4 Posting Points
- **PP-T1 Ship:** giảm source stock, tăng IN_TRANSIT stock.
- **PP-T2 Receive:** giảm IN_TRANSIT stock, tăng destination stock.
- **PP-T3 Variance Resolution:** nếu có sai lệch thì tạo adjustment/review tùy policy.

### 14.5 Business Rules
1. Không cho transfer giữa cùng một warehouse trong P1.
2. Ownership giữ nguyên trong transfer P1.
3. Partial ship được phép nếu cấu hình warehouse cho phép.
4. Partial receive được phép nhiều lần; line trạng thái `PARTIALLY_RECEIVED` cho tới khi đủ hoặc được close.
5. IN_TRANSIT stock không được allocate cho outbound bình thường.
6. IN_TRANSIT stock không được move nội bộ.
7. IN_TRANSIT stock không được direct adjust trừ workflow exception có quyền cao.
8. Transfer line chỉ close khi `received_qty + approved_variance_resolution = shipped_qty`.
9. Cancel chỉ cho phép trước khi posting ship; sau ship phải reverse theo process riêng.
10. Nếu quá SLA transit, system tạo alert/reconciliation review.
11. Destination location có thể xác định trước hoặc gán khi receive tùy warehouse policy.

### 14.6 Variance Handling

| Scenario | Standard Action |
|---------|------------------|
| received_qty = shipped_qty | Close normally |
| received_qty < shipped_qty | Create transfer variance review; có thể sinh adjustment giảm hoặc investigation |
| received_qty > shipped_qty | Reject receive hoặc require manager exception theo policy |
| wrong destination location | Allow correction bằng move hoặc reverse-receive + re-receive |

### 14.7 Acceptance Criteria
- Transfer ship và receive tạo đúng 2 posting points.
- Hàng ở trạng thái IN_TRANSIT nhìn thấy được trong monitoring.
- Partial receive không làm mất trace shipped_qty vs received_qty.
- Transfer variance luôn có review trail hoặc adjustment trail.

---

## 15. Sub-Module 5: Inventory Status Change

### 15.1 Description
Thay đổi trạng thái inventory mà không đổi item/owner/location/warehouse, ví dụ AVAILABLE → BLOCKED, BLOCKED → AVAILABLE, AVAILABLE → DAMAGED.

### 15.2 Allowed Status Transitions (P1)

| From | To | Allowed | Note |
|------|----|---------|------|
| AVAILABLE | BLOCKED | Y | Need reason |
| BLOCKED | AVAILABLE | Y | Need reason |
| AVAILABLE | DAMAGED | Y | Need reason |
| DAMAGED | BLOCKED | Y | If policy allows |
| BLOCKED | DAMAGED | Y | Need reason |
| IN_TRANSIT | ANY | N | Not through direct status change |
| DAMAGED | AVAILABLE | N by default | Require separate approved recovery process in future phase |

### 15.3 Business Rules
1. Status change bắt buộc có `reason_code`.
2. Một số reason code bắt buộc `reason_text` và/hoặc attachment evidence.
3. Status change chỉ xử lý trên quantity đang tồn tại hợp lệ tại đúng dimension.
4. Không được status change quantity đã reserve nếu policy không cho phép.
5. P1 không cho đổi nhiều dimensions trong cùng một request ngoài status dimension.
6. Posting phải tạo business trace rõ giữa `from_status` và `to_status`.
7. Nếu status ảnh hưởng billing eligibility thì phải publish impact event.

### 15.4 Acceptance Criteria
- Status change thành công làm qty chuyển đúng từ status cũ sang status mới.
- History hiển thị rõ from_status và to_status.
- Thiếu reason code bị reject.

---

## 16. Sub-Module 6: Cycle Count

### 16.1 Description
Kiểm kê chu kỳ để xác thực số lượng thực tế so với hệ thống mà không cần đóng băng toàn kho.

### 16.2 Operating Model
- Count theo scope snapshot tại thời điểm release.
- Counter thực hiện **blind count**, không thấy snapshot_qty.
- Variance được đánh giá theo threshold và policy approval.
- Chênh lệch có thể dẫn tới recount, adjustment, hoặc investigation.

### 16.3 Flow
1. Tạo count từ plan hoặc ad-hoc.
2. System sinh scope snapshot theo location/item/owner/status.
3. Release count document.
4. Counter đếm thực tế và submit counted qty.
5. System tính variance.
6. Nếu variance nhỏ trong threshold → auto-post hoặc auto-approve theo policy.
7. Nếu variance lớn → require recount hoặc manager review.
8. Sau quyết định cuối cùng, M6 tạo adjustment request và gọi M3 post transaction.
9. Count document chuyển `POSTED/CLOSED`.

### 16.4 Count Threshold Policy

| Control | Suggested P1 Rule |
|--------|-------------------|
| Blind count | Mandatory |
| Recount threshold qty | Config per warehouse/item class |
| Recount threshold pct | Config per warehouse/item class |
| Max recount attempts | 1 trong P1 |
| Auto-post threshold | Chỉ cho variance nhỏ và role hợp lệ |
| Large variance | Must require manager review |

### 16.5 Business Rules
1. Snapshot được cố định tại thời điểm release.
2. Count lines phát sinh movement sau snapshot phải được đánh dấu “movement during count” để review.
3. Counter không nhìn thấy snapshot_qty trong UI/mobile.
4. Một count line chỉ có một final decision.
5. Không cho direct edit snapshot_qty.
6. Nếu recount xảy ra, `final_counted_qty` là giá trị dùng để quyết định adjustment.
7. Count có thể theo location hoặc item-location-owner-status.
8. Count result phải trace được người đếm, người review, người approve, thời gian.

### 16.6 Acceptance Criteria
- Counter không nhìn thấy system qty.
- Variance được tính đúng theo snapshot và final_counted_qty.
- Count variance ngoài threshold không auto-post trái policy.
- Adjustment sinh từ count truy ngược được về count line.

---

## 17. Sub-Module 7: Inventory Adjustment

### 17.1 Description
Điều chỉnh tồn kho có kiểm soát, dùng cho sai lệch xác nhận, transfer variance, reconciliation resolution hoặc correction thủ công có thẩm quyền.

### 17.2 Adjustment Types
- Manual increase
- Manual decrease
- Count variance adjustment
- Reconciliation adjustment
- Transfer variance adjustment
- System correction by approved reverse/repost flow

### 17.3 Flow
1. User tạo adjustment header/lines hoặc system sinh từ variance.
2. System validate scope, permission, qty, status, location, reason.
3. Check approval policy và limit.
4. Nếu approved/auto-approved → gọi M3 post adjustment.
5. Cập nhật adjustment status và publish event.

### 17.4 Business Rules
1. Mọi adjustment line phải có `reason_code`.
2. `qty > 0` nghĩa là tăng, `qty < 0` nghĩa là giảm.
3. Direct adjust không được áp dụng lên IN_TRANSIT stock trong P1.
4. Direct adjust lên reserved stock bị chặn nếu không có exception quyền cao.
5. Approval requirement phụ thuộc warehouse policy, absolute qty, item class, reason code, và role.
6. Khi reverse adjustment, phải tạo transaction đảo, không sửa transaction gốc.
7. Adjustment từ cycle count/reconciliation phải giữ liên kết tới source document.

### 17.5 Approval Control Matrix (P1 baseline)

| Condition | Approval Requirement |
|----------|----------------------|
| Small variance from count within threshold | Auto-approve or auto-post |
| Manual positive/negative adjustment by WH_MANAGER within limit | 1-level approval optional by config |
| Large absolute qty adjustment | Mandatory manager/supervisor approval |
| High-risk reason code | Mandatory approval |
| Reserved or blocked policy exception | Mandatory higher-level approval |

### 17.6 Acceptance Criteria
- Adjustment không có reason code bị reject.
- Adjustment vượt limit không được post trực tiếp.
- Reverse adjustment tạo trail rõ ràng với transaction gốc.

---

## 18. Sub-Module 8: Reconciliation Review

### 18.1 Description
Theo dõi các sai lệch hoặc bất thường giữa inventory ledger, on-hand read model và trạng thái nghiệp vụ để tạo action phù hợp.

### 18.2 Triggers
- Batch EOD reconciliation job
- Manual run bởi OPS_SUPER / WH_ADMIN
- Trigger từ monitoring khi phát hiện negative available, orphan IN_TRANSIT, dimension inconsistency

### 18.3 Review Outputs
- discrepancy_type
- severity
- impacted item/warehouse/location/owner
- suspected cause
- suggested action
- action reference nếu đã tạo count/adjustment

### 18.4 Suggested Actions
- No action
- Request cycle count
- Create adjustment request
- Request reverse/repost investigation
- Escalate to support/audit

### 18.5 Business Rules
1. Reconciliation review không tự sửa ledger.
2. Auto-fix không thuộc P1.
3. Mọi resolution phải có trail document hoặc note giải trình.
4. Reconciliation review có thể đóng bằng cách link tới count/adjustment/resolution evidence.

### 18.6 Acceptance Criteria
- Hệ thống tạo review record cho discrepancy được phát hiện.
- Review có trạng thái xử lý rõ ràng từ OPEN tới CLOSED.
- Có thể truy ngược từ review tới action đã thực hiện.

---

## 19. Sub-Module 9: Auditability & Integration

### 19.1 Idempotency
- Mỗi command API side-effect phải nhận `external_id`.
- Scope uniqueness tối thiểu: `(api_name, external_id, source_app, tenant/site scope nếu có)`.
- Duplicate request phải trả về kết quả idempotent hoặc reference giao dịch đã tồn tại.

### 19.2 Correlation Tracking
Mọi document và inventory events phải lưu:
- `correlation_id`
- `external_id`
- `source_ref_type`
- `source_ref_id`
- `requested_by` / `posted_by`
- timestamps nghiệp vụ chính

### 19.3 Event Publishing
Các event cần publish:
- `inventory.move.completed`
- `inventory.transfer.shipped`
- `inventory.transfer.received`
- `inventory.transfer.variance.detected`
- `inventory.status.changed`
- `inventory.count.posted`
- `inventory.adjustment.posted`
- `inventory.reconciliation.opened`
- `inventory.reconciliation.closed`

### 19.4 KPI Hooks
- move completion time
- transfer transit aging
- count accuracy rate
- count variance rate
- adjustment frequency by reason code
- blocked/damaged stock ratio
- reconciliation exception backlog

---

## 20. Posting Control

### 20.1 Posting Points Used by M6

| Use Case | Posting Point |
|---------|---------------|
| Move | 1 move posting group (source out + destination in) |
| Transfer Ship | Source out + IN_TRANSIT in |
| Transfer Receive | IN_TRANSIT out + destination in |
| Status Change | Status-dimension transfer posting |
| Count Variance | Adjustment posting from final variance |
| Manual Adjustment | Inventory increase/decrease posting |
| Reverse | Reversal posting group |

### 20.2 InventTrans Type Mapping

| Business Event | InventTrans Type | Qty Sign Logic |
|---------------|------------------|----------------|
| Move | MOVE | Source negative, destination positive |
| Transfer Ship | TRANSFER_SHIP | Source negative, in_transit positive |
| Transfer Receive | TRANSFER_RECEIVE | in_transit negative, destination positive |
| Status Change | STATUS_CHANGE | From-status negative, to-status positive |
| Adjustment Increase | ADJUSTMENT | Positive |
| Adjustment Decrease | ADJUSTMENT | Negative |
| Count Variance Post | COUNT_ADJUSTMENT | Sign follows final variance |
| Reverse | REVERSE_* | Inverse of original |

### 20.3 Reversal Rules
1. Không xóa transaction đã post.
2. Reversal phải lưu reference tới original posting group.
3. Chỉ role có quyền mới reverse.
4. Một số transaction có thể require approved correction flow thay vì reverse trực tiếp.

---

## 21. RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | OPS_SUPER | AUDITOR |
|-------|-----------|------------|----------|-----------|---------|
| View on-hand/history | Y (scoped) | Y | Y | Y | Y (read-only) |
| Create move | N | Y | Y | Y | N |
| Execute move | Y | Y | Y | Y | N |
| Create transfer | N | Y | Y | Y | N |
| Ship/Receive transfer | Y (execute) | Y | Y | Y | N |
| Create status change | N | Y | Y | Y | N |
| Perform cycle count | Y | Y | Y | Y | N |
| Review/approve count variance | N | Y | Y | Y | N |
| Create manual adjustment | N | Y (within limit) | Y | Y | N |
| Approve high-risk adjustment | N | Conditional | Y | Y | N |
| View reconciliation review | N | Y | Y | Y | Y |
| Close reconciliation review | N | Y | Y | Y | N |

### 21.1 Permission Notes
- Mọi quyền đều bị scope bởi warehouse và owner visibility.
- Approval limit phải cấu hình được theo role / warehouse / item class / reason code.
- Auditor không được tạo hay sửa document nghiệp vụ.

---

## 22. State Machines Summary

### 22.1 Move Order States
`DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED`

Alternate:
- `CANCELLED`
- `FAILED`

### 22.2 Transfer Order States
`CREATED → RELEASED → SHIPPED → IN_TRANSIT → PARTIALLY_RECEIVED / RECEIVED → CLOSED`

Alternate:
- `CANCELLED`
- `FAILED`

### 22.3 Status Change States
`CREATED → POSTED`

Alternate:
- `CANCELLED`
- `FAILED`
- `REVERSED`

### 22.4 Cycle Count States
`CREATED → RELEASED → COUNTING → SUBMITTED → UNDER_REVIEW → APPROVED → POSTED`

Alternate:
- `CANCELLED`
- `FAILED`

### 22.5 Adjustment States
`DRAFT → SUBMITTED → APPROVED → POSTED`

Alternate:
- `REJECTED`
- `CANCELLED`
- `REVERSED`

### 22.6 Reconciliation Review States
`OPEN → UNDER_INVESTIGATION → RESOLVED → CLOSED`

Alternate:
- `CANCELLED`

---

## 23. Integration Points

### 23.1 M3 Inventory Core Engine
- validate posting payload
- resolve inventory dimension
- post inventory transaction group
- compute on-hand / available
- reverse posting
- provide history and reconciliation inputs

### 23.2 M7 Work Execution
- create work for move / transfer ship / transfer receive
- receive work completion callback
- sync status between work and source document

### 23.3 M8 Mobile / Device
- scan location/item for move
- count entry UI
- transfer receive with scanning

### 23.4 M10 Billing
- consume status change and inventory impact events for billable/non-billable qty policy

---

## 24. Detailed Business Rules

### 24.1 General Rules
1. Mọi side-effect inventory đều phải qua M3.
2. Mọi API side-effect đều bắt buộc `external_id`.
3. `correlation_id` bắt buộc cho toàn bộ command document.
4. Không cho negative requested qty trên command documents.
5. Tất cả qty phải chuẩn hóa về base UOM tại thời điểm posting.

### 24.2 Availability & Reservation Rules
1. `available_qty = physical_qty - reserved_qty - blocked_policy_qty` theo inventory policy.
2. Reserved stock không được move/adjust/status change nếu chưa được release hợp lệ.
3. Blocked stock có thể move hay không phụ thuộc policy warehouse; default P1 là restricted.

### 24.3 Location Rules
1. Location phải active.
2. Loại location phải phù hợp nghiệp vụ: storage, staging, receiving, shipping theo policy.
3. Capacity/mixed policy có thể bật/tắt theo warehouse config nhưng phải có hook validate.

### 24.4 Reason Code Rules
1. Status change và adjustment luôn bắt buộc reason code.
2. Transfer variance closure phải có variance reason nếu qty không khớp.
3. Một số reason code yêu cầu reason text hoặc evidence.

### 24.5 Approval Rules
1. Approval matrix phụ thuộc role và threshold.
2. High-risk item hoặc high-value class có thể yêu cầu approval ngay cả khi qty nhỏ.
3. Reversal thường yêu cầu quyền cao hơn posting gốc.

---

## 25. Exception Handling

### 25.1 Move Exceptions
- insufficient available qty
- source location empty
- destination invalid / inactive
- mixed owner not allowed
- capacity exceeded
- duplicate external_id
- posting failed in M3

### 25.2 Transfer Exceptions
- ship requested qty > available qty
- receive without shipped line
- receive over shipped qty
- stuck in_transit over SLA
- source/destination warehouse invalid
- transfer cancelled after ship attempt
- posting one step succeeded, next callback failed

### 25.3 Status Change Exceptions
- invalid transition matrix
- from_status mismatch current stock
- reserved stock policy block
- missing reason code

### 25.4 Cycle Count Exceptions
- movement during count
- recount required
- missing counted qty
- duplicate count submission
- adjustment posting failed after approval

### 25.5 Adjustment Exceptions
- over limit without approval
- direct adjust on restricted stock
- invalid reason code
- reverse not allowed by role/policy

### 25.6 Reconciliation Exceptions
- repeated unresolved discrepancy
- orphan IN_TRANSIT not resolved in SLA
- negative available persists after recount

---

## 26. [TO-CONFIRM] Items (Reduced and Explicit)

1. Capacity validation trong P1 bật mặc định hay config-based per warehouse.
2. Mixed owner / mixed item policy ở location sẽ cứng hay mềm theo location profile.
3. Có cho BLOCKED stock move giữa locations trong cùng warehouse hay không.
4. Recount threshold mặc định theo qty/pct cho từng warehouse hoặc item class.
5. Manual adjustment có bắt buộc 1-level approval hay configurable.
6. Receive thừa trong transfer sẽ reject cứng hay cho exception approval.
7. DAMAGED → AVAILABLE recovery flow có mở ở late phase hay không.

---

## 27. Acceptance Criteria Summary

### 27.1 Per Sub-Module
- On-Hand Inquiry: tra cứu đúng tồn theo dimension và quyền.
- Movement History: xem đúng lịch sử immutable và trace source.
- Move: chuyển tồn đúng source/destination, net warehouse qty không đổi.
- Transfer: ship/receive đúng vòng đời với IN_TRANSIT theo dõi được.
- Status Change: qty chuyển đúng giữa status dimensions.
- Cycle Count: blind count, variance xử lý đúng threshold/approval.
- Adjustment: mandatory reason, đúng limit/approval, reverse-only correction.
- Reconciliation Review: discrepancy được tạo, theo dõi và đóng có trail.

### 27.2 Non-Functional Expectations
- Idempotent cho mọi command API.
- Audit đầy đủ user/time/source app.
- Pagination và filtering tốt cho inquiry/history.
- Không phát sinh duplicate posting khi retry request.

---

## 28. User Stories

### US-M6-001: On-Hand Inquiry
Là WH_MANAGER, tôi muốn tra cứu tồn theo item/location/status để xác định hàng hiện ở đâu và có dùng được hay không.

### US-M6-002: Movement History
Là OPS_SUPER, tôi muốn xem lịch sử dịch chuyển của một item để điều tra chênh lệch và truy nguyên source document.

### US-M6-003: Move Internal
Là WH_MANAGER, tôi muốn tạo lệnh move nội bộ để dời hàng giữa các vị trí trong cùng kho.

### US-M6-004: Inter-Warehouse Transfer
Là WH_MANAGER, tôi muốn chuyển hàng từ kho A sang kho B và theo dõi trạng thái IN_TRANSIT cho tới khi nhận đủ.

### US-M6-005: Inventory Status Change
Là WH_MANAGER, tôi muốn chuyển hàng từ AVAILABLE sang BLOCKED hoặc DAMAGED để ngăn sử dụng sai stock.

### US-M6-006: Cycle Count
Là WH_KEEPER, tôi muốn thực hiện blind count để xác nhận số lượng thực tế mà không bị ảnh hưởng bởi số liệu hệ thống.

### US-M6-007: Inventory Adjustment
Là WH_MANAGER, tôi muốn tạo adjustment có reason code và approval phù hợp để sửa sai lệch tồn có kiểm soát.

### US-M6-008: Reconciliation Review
Là OPS_SUPER, tôi muốn theo dõi các discrepancy inventory để quyết định count lại, adjust hoặc điều tra sâu hơn.

---

## 29. API Endpoints (Enhanced Contract-Level List)

### 29.1 On-Hand & History
- `GET /api/v1/inventory/on-hand`
- `GET /api/v1/inventory/on-hand/{dimensionKey}`
- `GET /api/v1/inventory/history`
- `GET /api/v1/inventory/history/{transId}`

### 29.2 Move Internal
- `POST /api/v1/inventory/moves`
- `POST /api/v1/inventory/moves/{id}/confirm`
- `POST /api/v1/inventory/moves/{id}/execute`
- `POST /api/v1/inventory/moves/{id}/cancel`
- `GET /api/v1/inventory/moves/{id}`

**Mandatory command fields baseline:**
- `external_id`
- `correlation_id`
- `source_app`
- `warehouse_id`
- `owner_id`
- line details with item/location/qty/uom

### 29.3 Transfer
- `POST /api/v1/inventory/transfers`
- `POST /api/v1/inventory/transfers/{id}/release`
- `POST /api/v1/inventory/transfers/{id}/ship`
- `POST /api/v1/inventory/transfers/{id}/receive`
- `POST /api/v1/inventory/transfers/{id}/close`
- `POST /api/v1/inventory/transfers/{id}/cancel`
- `GET /api/v1/inventory/transfers/{id}`
- `GET /api/v1/inventory/transfers?status=IN_TRANSIT`

### 29.4 Status Change
- `POST /api/v1/inventory/status-changes`
- `POST /api/v1/inventory/status-changes/{id}/reverse`
- `GET /api/v1/inventory/status-changes/{id}`

### 29.5 Cycle Count
- `POST /api/v1/inventory/count-plans`
- `POST /api/v1/inventory/counts`
- `POST /api/v1/inventory/counts/{id}/release`
- `POST /api/v1/inventory/counts/{id}/submit`
- `POST /api/v1/inventory/counts/{id}/review`
- `POST /api/v1/inventory/counts/{id}/approve`
- `POST /api/v1/inventory/counts/{id}/post`
- `GET /api/v1/inventory/counts/{id}`

### 29.6 Adjustment
- `POST /api/v1/inventory/adjustments`
- `POST /api/v1/inventory/adjustments/{id}/submit`
- `POST /api/v1/inventory/adjustments/{id}/approve`
- `POST /api/v1/inventory/adjustments/{id}/post`
- `POST /api/v1/inventory/adjustments/{id}/reverse`
- `GET /api/v1/inventory/adjustments/{id}`

### 29.7 Reconciliation Review
- `POST /api/v1/inventory/reconciliation/run`
- `GET /api/v1/inventory/reconciliation/reviews`
- `GET /api/v1/inventory/reconciliation/reviews/{id}`
- `POST /api/v1/inventory/reconciliation/reviews/{id}/resolve`
- `POST /api/v1/inventory/reconciliation/reviews/{id}/close`

### 29.8 API Error Catalogue Baseline
- `INV_400_INVALID_INPUT`
- `INV_401_UNAUTHORIZED_SCOPE`
- `INV_409_DUPLICATE_EXTERNAL_ID`
- `INV_409_INVALID_STATE_TRANSITION`
- `INV_409_INSUFFICIENT_AVAILABLE_QTY`
- `INV_409_RESTRICTED_RESERVED_STOCK`
- `INV_409_INVALID_STATUS_CHANGE`
- `INV_422_APPROVAL_REQUIRED`
- `INV_500_POSTING_FAILED`

---

## 30. UAT / Test Case Reference

### 30.1 Move
- create move and complete full qty
- partial execute move
- insufficient available qty
- move to invalid destination
- retry same external_id

### 30.2 Transfer
- ship and receive full qty
- partial receive in two rounds
- receive short qty and create variance review
- over-receive handling
- transfer aging alert

### 30.3 Status Change
- AVAILABLE → BLOCKED
- BLOCKED → AVAILABLE
- AVAILABLE → DAMAGED
- invalid status transition
- missing reason code

### 30.4 Cycle Count
- blind count no variance
- blind count within threshold auto-post
- variance above threshold require review
- movement during count flagged
- recount flow

### 30.5 Adjustment
- manual increase within limit
- manual decrease over limit requiring approval
- direct adjust restricted stock rejected
- reverse adjustment

### 30.6 Reconciliation
- create review from discrepancy
- resolve by cycle count
- resolve by adjustment
- close with explanation and evidence

---

## 31. Reporting Requirements

Module 6 cần cung cấp dataset hoặc report view cho:
- On-hand by warehouse/location/status
- Movement history report
- Transfer aging report
- Cycle count accuracy report
- Adjustment by reason code report
- Blocked/damaged stock report
- Reconciliation backlog report
- Shrinkage / shortage trend report

---

## 32. Glossary

- **InventTrans:** ledger transaction tồn kho do M3 quản lý.
- **OnHand:** tồn snapshot/read model được tính từ ledger.
- **Available Qty:** số lượng có thể sử dụng sau khi trừ reserved và các policy restrictions.
- **IN_TRANSIT:** trạng thái tồn kho trung gian trong transfer.
- **Blind Count:** kiểm kê mà counter không thấy số lượng hệ thống.
- **Reconciliation Review:** hồ sơ theo dõi discrepancy inventory cần điều tra/giải quyết.

---

## 33. Baseline Source Documents

- Module 6 Inventory Control draft spec
- Overview toàn hệ thống SWM
- Module 2 Master Data Management spec
- Module 3 Inventory Core Engine spec
- Module 5 Outbound Operations spec
- Inventory transaction principles and business rules

---

## 34. Recommended Next Steps

1. Chốt các mục `[TO-CONFIRM]` với business owner và warehouse lead.
2. Tách tiếp sang tài liệu API contract chi tiết cho backend team.
3. Tách sang technical design cho database, service flow và event model.
4. Bổ sung sequence diagrams cho move, transfer, cycle count, adjustment.
5. Chuẩn hóa approval matrix theo warehouse/item class/reason code.

