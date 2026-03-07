# TVL SWM — BA-PO Master Specification

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)
**Mục tiêu tài liệu:** Đặc tả chi tiết từng module theo góc nhìn BA/PO — phục vụ Senior Manager review sau mỗi module build xong.

> **Cách sử dụng:**
> - Mỗi module có: Scope, Business Context, User Personas, User Stories + Acceptance Criteria, Business Rules, Open Items, Dependencies, và **Senior Manager Review Gate**.
> - Review Gate = checklist 8 câu Yes/No. Chỉ sign-off khi tất cả đều YES.
> - **[CONFIRMED]** = đã TVL chốt | **[TO-CONFIRM]** = phải chốt trước build | **[PHASE 2]** = ngoài scope go-live

---

## DANH SÁCH MODULE

| # | Module | User Stories | Review Gate |
|---|--------|-------------|-------------|
| M1 | Foundation & Governance | US-M1-001 → 004 | [Section 1.8] |
| M2 | Master Data Management | US-M2-001 → 005 | [Section 2.8] |
| M3 | Inventory Core Engine | US-M3-001 → 004 | [Section 3.8] |
| M4 | Inbound Operations | US-M4-001 → 007 | [Section 4.8] |
| M5 | Outbound Operations | US-M5-001 → 008 | [Section 5.8] |
| M6 | Inventory Control | US-M6-001 → 005 | [Section 6.8] |
| M7 | Work Execution & Mobile | US-M7-001 → 005 | [Section 7.8] |
| M8 | Weighbridge, OCR & Integration | US-M8-001 → 004 | [Section 8.8] |
| M9 | VAS / Bagging Operations | US-M9-001 → 004 | [Section 9.8] |
| M10 | Billing & Commercial Control | US-M10-001 → 006 | [Section 10.8] |
| M11 | Reporting, Audit & Go-Live | US-M11-001 → 004 | [Section 11.8] |

---

# MODULE 1 — FOUNDATION & GOVERNANCE

## 1.1 Scope

**Phase 1 (In Scope):**
- RBAC: 8 roles, permission matrix, warehouse scope per user
- Number Sequence: PER_WAREHOUSE, daily reset, format PREFIX-YYYYMMDD-SEQ
- Business Rules Baseline: catalog [CONFIRMED] vs [TO-CONFIRM]
- Reason Code & Audit Policy: mọi ngoại lệ có reason code; retention 7 năm

**[PHASE 2] / Out of Scope:**
- SSO / Active Directory integration
- Multi-tenant architecture
- Advanced audit analytics

## 1.2 Business Context

Không có module này → dev code đúng màn hình nhưng sai nghiệp vụ; QA test đúng case nhưng lệch baseline. Đây là "khóa nghĩa triển khai" — phải build xong trước tất cả module khác.

## 1.3 User Personas

| Role | Use case trong M1 |
|------|------------------|
| ADMIN | Create user, assign role, deactivate user, setup number sequence, reason code |
| WH_MANAGER | Xem quyền của team; sử dụng reason code khi override |
| Tất cả roles | Đăng nhập, được enforce permission theo role |

## 1.4 User Stories

### US-M1-001: RBAC & Permission Control
**As an** ADMIN,
**I want to** create users, assign roles and warehouse scope,
**So that** each user can only access data and actions within their authorization.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: ADMIN có thể tạo user với role từ danh sách 8 roles (WH_KEEPER, WH_MANAGER, WH_ADMIN, WB_OPERATOR, BILLING_OFC, OPS_SUPER, ADMIN, CUST_VIEWER)
- AC2: Mỗi user được gán ít nhất 1 warehouse scope; user chỉ thấy data của warehouse được gán
- AC3: CUST_VIEWER chỉ thấy inventory và billing của owner_id gắn với tài khoản mình — không thấy owner khác [BR-RBAC-006]
- AC4: Action không thuộc quyền → HTTP 403, message rõ ràng, audit log ghi
- AC5: Deactivate user → tất cả session bị revoke ngay lập tức; dữ liệu lịch sử giữ nguyên

---

### US-M1-002: Number Sequence
**As a** System,
**I want to** auto-generate document numbers per warehouse and document type,
**So that** every document has a unique, traceable identifier.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Format: `PREFIX-YYYYMMDD-SEQNUM` (e.g. RCV-20260315-000001) [CONFIRMED] [BR-MD-005]
- AC2: Scope = PER_WAREHOUSE → WH5.1 và WH5.3 có thể cùng SEQ-000001 cùng ngày
- AC3: Daily reset: SEQNUM về 000001 mỗi ngày mới
- AC4: Concurrency safe: SELECT FOR UPDATE hoặc atomic increment — không sinh số trùng khi 2 user tạo đồng thời
- AC5: Cùng `external_id` → trả về document cũ, không sinh số mới (idempotency) [CONFIRMED]

---

### US-M1-003: Reason Code Catalog
**As a** WH_MANAGER,
**I want to** select from a predefined list of reason codes when performing exceptions,
**So that** every deviation is categorized and auditable.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Reason code catalog do ADMIN quản lý; có thể thêm/edit khi cần
- AC2: Các action bắt buộc reason code: manual weight entry, cancel receipt, inventory adjustment, override exception, status change
- AC3: Form không cho Submit nếu chưa chọn reason code (khi bắt buộc)
- AC4: Reason code lưu vào audit_log và weighbridge_log
- AC5: Danh sách go-live tối thiểu: MOISTURE_LOSS, SCALE_CALIBRATION, LOADING_LEFTOVER, DOCUMENTATION_ERROR, SHRINKAGE, FOUND_STOCK, DAMAGE, ADMIN_CORRECTION

---

### US-M1-004: Audit Trail Policy
**As a** ADMIN / OPS_SUPER,
**I want to** see a complete audit trail of all significant actions,
**So that** I can investigate disputes, errors, and compliance issues.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Mọi state change của document ghi audit: entity_type, entity_id, action, old_value, new_value, user_id, timestamp [BR-AUD-001]
- AC2: Manual entries (weight, adjustment) ghi thêm: reason_code, approved_by
- AC3: Audit log KHÔNG cho phép UPDATE/DELETE; append-only
- AC4: Retention tối thiểu 7 năm [CONFIRMED] [BR-AUD-002]
- AC5: ADMIN có thể export audit log theo filter: date range, entity type, user, action

## 1.5 Business Rules Reference
BR-MD-005, BR-RBAC-001 đến BR-RBAC-006, BR-AUD-001, BR-AUD-002, BR-AUD-003

## 1.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] WH_ADMIN và ADMIN: ranh giới quyền setup rate card? (ADMIN thì toàn quyền; WH_ADMIN thì chỉ master data?)
- [TO-CONFIRM] CUST_VIEWER có xem Draft Debit Note không hay chỉ LOCKED?

## 1.7 Dependencies
- Không phụ thuộc module nào khác
- Block tất cả module còn lại nếu chưa hoàn thành

## 1.8 Senior Manager Review Gate — MODULE 1

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | 8 roles đã được tạo đúng, permission matrix test pass? | | |
| 2 | Number sequence sinh đúng format, không trùng khi concurrent? | | |
| 3 | Reason code catalog đủ cho go-live (tối thiểu 8 code)? | | |
| 4 | Audit log ghi đủ fields (user, action, before/after, timestamp)? | | |
| 5 | [TO-CONFIRM] items đã được TVL chốt? | | |
| 6 | Test case: unauthorized access → HTTP 403 đã pass? | | |
| 7 | Idempotency: same external_id → không tạo document mới? | | |
| 8 | Audit log retention policy setup (7 năm)? | | |

---

# MODULE 2 — MASTER DATA MANAGEMENT

## 2.1 Scope

**Phase 1 (In Scope):**
- Owner, Vendor, Item/SKU, Warehouse, Location, Vehicle Type
- Inventory Status (4 statuses: AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT)
- Billing Master (service code, day type, rate reference)
- Master Data Import & Validation (Excel template)

**[PHASE 2] / Out of Scope:**
- LPN/Pallet master
- Batch/Lot attributes

## 2.2 Business Context

Không có master data đúng → không thể tạo bất kỳ giao dịch nào. Đây là "data foundation" của toàn hệ thống. Lỗi master data = lỗi tồn kho + lỗi billing.

## 2.3 User Personas

| Role | Use case trong M2 |
|------|------------------|
| WH_ADMIN | Full CRUD master data; import Excel; config tolerance |
| BILLING_OFC | Setup/edit rate card; day type calendar |
| ADMIN | Full access |

## 2.4 User Stories

### US-M2-001: Owner & Vendor Management
**As a** WH_ADMIN,
**I want to** create and manage owners and vendors,
**So that** every cargo movement is traceable to the right owner and inventory is segregated.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Owner record gồm: code (UNIQUE), name, short_name, tax_code, contact, is_active
- AC2: Deactivate owner: không cho tạo receipt/shipment mới; lịch sử tồn kho giữ nguyên
- AC3: Cùng SKU, owner khác nhau → InventDim khác nhau → tồn kho riêng biệt [BR-INV-005]
- AC4: CUST_VIEWER account gắn với owner_id → tự động filter tất cả views
- AC5: Vendor: phân biệt vessel_vendor vs standard_vendor flag

---

### US-M2-002: Item/SKU Management
**As a** WH_ADMIN,
**I want to** create and manage items with correct cargo_form and tolerance settings,
**So that** billing rates and tolerance checks apply correctly per item.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Item gồm: code, name, cargo_form (BULK/BAGGED_25KG/BAGGED_50KG/JUMBO_1000KG), tolerance_inbound_pct, tolerance_outbound_pct, is_catch_weight, density
- AC2: cargo_form map sang billing rate đúng: BULK=21K/MT, BAGGED_50KG=28K/MT, JUMBO=32K/MT [BR-MD-004]
- AC3: is_catch_weight=TRUE → mọi movement dùng actual weight từ cân, không dùng stdnetwgt [BR-MD-003]
- AC4: Tolerance per owner+item override được default tolerance [BR-IN-006]
- AC5: Item inactive: không tạo transaction mới; lịch sử giữ nguyên

---

### US-M2-003: Warehouse & Location Management
**As a** WH_ADMIN,
**I want to** configure warehouses and locations with correct types and capacity,
**So that** putaway and pick operations only go to valid locations.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Location types go-live: RECEIVING, STORAGE, STAGING, SHIPPING. Putaway chỉ vào STORAGE [CONFIRMED] [BR-MD-002]
- AC2: Capacity auto-tính: `capacity_mt = area_m2 × max_height_m × density × 1.10` [BR-MD-001]
- AC3: Dashboard warning 85% (yellow) và 100% (red) per location [BR-MD-007]
- AC4: is_billing_location flag: chỉ STORAGE location có flag này mới tính phí lưu kho [CONFIRMED]
- AC5: QR code per location: có thể generate và print để WH_KEEPER scan

---

### US-M2-004: Inventory Status Master
**As a** System,
**I want to** enforce 4 inventory statuses at go-live,
**So that** allocation only picks from AVAILABLE stock.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Go-live: chỉ 4 status: AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT [CONFIRMED] [BR-INV-006]
- AC2: Chỉ AVAILABLE được allocate cho outbound
- AC3: Status change cần reason code bắt buộc [CONFIRMED]
- AC4: [PHASE 2] Phase 2 mới xem xét thêm WET, CONTAMINATED

---

### US-M2-005: Master Data Import & Validation
**As a** WH_ADMIN,
**I want to** import master data in bulk from Excel templates,
**So that** go-live data loading is fast and validated.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Import template cho: Owner, Item, Location, Vehicle Type, Rate Card
- AC2: Validation per row: check trùng mã, thiếu trường bắt buộc, sai format, sai cross-reference
- AC3: Error report: download Excel với cột lỗi per row; chỉ import rows hợp lệ
- AC4: Preview trước khi commit import
- AC5: Idempotent: import lại file cũ không tạo trùng (match theo code UNIQUE)

## 2.5 Business Rules Reference
BR-MD-001 đến BR-MD-008, BR-INV-005, BR-INV-006, BR-BIL-006

## 2.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Tolerance default 0.5% — TVL cần confirm giá trị chính xác
- [TO-CONFIRM] Bag shell weight: fixed value hay tính từ thực tế cân?

## 2.7 Dependencies
- Phụ thuộc: M1 (RBAC, Number Sequence)
- Block: M3 (cần InventDim), M4, M5, M9, M10

## 2.8 Senior Manager Review Gate — MODULE 2

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | 4 inventory statuses đúng, AVAILABLE-only allocation enforced? | | |
| 2 | cargo_form → billing rate mapping đúng? | | |
| 3 | Tolerance per owner+item hoạt động đúng? | | |
| 4 | Location type restriction: putaway chỉ vào STORAGE? | | |
| 5 | Capacity calculation đúng công thức? | | |
| 6 | [TO-CONFIRM] tolerance default đã TVL chốt? | | |
| 7 | Import Excel: validation đúng, error report rõ ràng? | | |
| 8 | Owner segregation: CUST_VIEWER chỉ thấy hàng của mình? | | |

---

# MODULE 3 — INVENTORY CORE ENGINE

## 3.1 Scope

**Phase 1 (In Scope):**
- InventDim Management (5 dimensions + SHA-256 hash)
- InventTrans Ledger (immutable, append-only)
- OnHand Balance Engine
- Posting Engine & Reversal Logic
- Inventory Query & Availability Service

**[PHASE 2] / Out of Scope:**
- Batch/Lot dimension
- LPN dimension

## 3.2 Business Context

Module sống còn. Nếu module này sai → tất cả inbound/outbound/billing nhìn có vẻ chạy nhưng số liệu không đáng tin. Module 3 là engine — không có business rule riêng, chỉ validate tính đúng đắn kỹ thuật.

## 3.3 User Personas

| Role | Use case trong M3 |
|------|------------------|
| System (M4/M5/M6/M7/M9) | Gọi posting engine để ghi InventTrans |
| WH_MANAGER, OPS_SUPER | Query OnHand để xem tồn kho |
| BILLING_OFC | Query InventTrans để tính phí |

## 3.4 User Stories

### US-M3-001: InventTrans Posting
**As a** System (called by M4/M5/M6/M7/M9),
**I want to** post InventTrans atomically with full dimension tracking,
**So that** every inventory change is permanently recorded and traceable.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Mọi InventTrans có: ref_type (RECEIPT/SHIPMENT/MOVE/TRANSFER/ADJUSTMENT/VAS), ref_id, ref_line_id, item_id, dim_id, qty, stage, transaction_type [BR-INV-004]
- AC2: InventTrans là IMMUTABLE — không UPDATE/DELETE [CONFIRMED]
- AC3: Posting trong DB transaction ATOMIC (BEGIN…COMMIT); fail → rollback toàn bộ [BR-INV-001]
- AC4: Posting point: Inbound tại RECEIVED; Outbound tại SHIPPED [CONFIRMED] [BR-INV-003]
- AC5: Idempotency: cùng external_id → trả kết quả cũ, không tạo trans mới [CONFIRMED]

---

### US-M3-002: OnHand Balance
**As a** System,
**I want to** maintain accurate OnHand balances derived from InventTrans,
**So that** allocation and availability checks are always correct.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Invariant: `OnHand.physical_qty = SUM(InventTrans.qty WHERE stage=PHYSICAL)` [CONFIRMED] [BR-INV-002]
- AC2: OnHand không bao giờ được UPDATE trực tiếp từ UI/API — chỉ qua posting engine
- AC3: available_qty = physical_qty − reserved_qty
- AC4: Query OnHand by: item + warehouse + location + owner + status
- AC5: OnHand phản ánh real-time sau mỗi posting

---

### US-M3-003: Reversal Logic
**As a** System (called on cancel/correction),
**I want to** reverse a posted InventTrans by creating a counter-transaction,
**So that** inventory corrections maintain full audit trail without modifying original records.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Reverse = tạo InventTrans mới với qty ngược chiều, cùng dim, `is_reversed=TRUE`, link `original_trans_id`
- AC2: Original InventTrans KHÔNG bị xóa hay UPDATE
- AC3: OnHand tự động cập nhật sau reversal (do là SUM-based)
- AC4: Reversal được audit log đầy đủ: user, reason, timestamp, original_trans_id
- AC5: Không thể reverse 1 trans đã bị reverse (prevent double reversal)

---

### US-M3-004: InventDim Deduplication
**As a** System,
**I want to** reuse existing InventDim combinations instead of creating duplicates,
**So that** OnHand aggregation is consistent and correct.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Phase 1 dimensions: Site + Warehouse + Location + Owner + Status. Batch=NULL, Serial=NULL [CONFIRMED] [BR-INV-005]
- AC2: dim_hash = SHA-256(site|warehouse|location|batch|serial|status|owner) — dedup key [BR-MD-008]
- AC3: Trước khi tạo InventTrans: lookup dim_hash → reuse nếu có, tạo mới nếu chưa có
- AC4: UNIQUE constraint trên (site_id, warehouse_id, location_id, batch_id, serial_id, inventory_status, owner_id)
- AC5: dim_hash index cho lookup performance

## 3.5 Business Rules Reference
BR-INV-001, BR-INV-002, BR-INV-003, BR-INV-004, BR-INV-005, BR-MD-008, BR-AUD-003

## 3.6 Open Items [TO-CONFIRM]
- Không có open items chính — module này fully confirmed

## 3.7 Dependencies
- Phụ thuộc: M1 (audit policy), M2 (master data)
- Block: M4, M5, M6, M9 (tất cả module cần posting)

## 3.8 Senior Manager Review Gate — MODULE 3

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Invariant OnHand = SUM(InventTrans) test pass với nhiều scenarios? | | |
| 2 | Posting atomic: fail mid-transaction → không có partial write? | | |
| 3 | InventTrans immutable: không có UPDATE/DELETE endpoint? | | |
| 4 | Reversal tạo counter-trans đúng, không xóa original? | | |
| 5 | dim_hash dedup hoạt động đúng: reuse dim khi cùng tổ hợp? | | |
| 6 | Idempotency: same external_id → same response, no new trans? | | |
| 7 | Concurrent posting test: race condition không xảy ra? | | |
| 8 | Availability query: physical − reserved = available, real-time? | | |

---

# MODULE 4 — INBOUND OPERATIONS

## 4.1 Scope

**Phase 1 (In Scope):**
- Standard Inbound (xe đăng ký trước, ASN pre-create)
- Vessel/B/L-Based Inbound (multi-trip, OCR-assisted)
- Receipt state machine: DRAFT → … → RECEIVED → PUTAWAY → CLOSED | REJECTED | CANCELLED
- Tolerance check: RECEIVED (pass) hoặc REJECTED (fail) + re-weigh (max 3 lần)
- Putaway work creation (trigger M7)
- Inbound posting tại RECEIVED

**[PHASE 2] / Out of Scope:**
- Partial receipt
- Quality inspection hold

## 4.2 Business Context

Đây là module đưa hàng từ "kế hoạch" vào "tồn kho thật". Weighbridge là nguồn xác nhận duy nhất — không có số kg nào được tin nếu không qua cân. Inbound sai → tồn sai → billing sai.

## 4.3 User Personas

| Role | Use case trong M4 |
|------|------------------|
| WB_OPERATOR | Weigh-in, weigh-out, initiate re-weigh, OCR confirm |
| WH_KEEPER | Putaway execution (M7) |
| WH_MANAGER | Cancel after 3 failed re-weighs; manual weight; close receipt |
| WH_ADMIN | Tạo PO/ASN |

## 4.4 User Stories

### US-M4-001: Standard Inbound Planning
**As a** WH_ADMIN/WH_MANAGER,
**I want to** pre-create PO and ASN with vehicle list,
**So that** WB_OPERATOR can quickly match incoming vehicles to receipts.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: PO gồm: owner, vendor, item, expected_qty, expected_date; nhiều receipt types
- AC2: ASN tạo với vehicle_list; WB_OPERATOR search theo biển số xe [BR-IN-003]
- AC3: 1 receipt = 1 trip = 1 xe [BR-IN-001]
- AC4: Receipt number auto-sinh đúng format PER_WAREHOUSE
- AC5: ASN với B/L: support Vessel flow, receipt_type=VESSEL

---

### US-M4-002: Inbound Weighing (Weigh-in & Weigh-out)
**As a** WB_OPERATOR,
**I want to** capture gross and tare weights from the scale automatically,
**So that** net weight is calculated without manual input errors.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Weight đọc tự động từ COM port qua M8 Local Agent, latency ≤ 2s [BR-WB-003]
- AC2: Mỗi lần cân tạo 1 weighbridge_log: gross/tare, vehicle, timestamp, receipt_id [BR-WB-004]
- AC3: net_weight_kg = gross_weight − tare_weight, auto-tính
- AC4: Manual weight entry: chỉ WH_MANAGER, bắt buộc reason_code, `is_manual_entry=TRUE` [BR-RBAC-001]
- AC5: Retry: scale fail → queue local → retry 3 lần × 30s → fallback manual [BR-WB-002]

---

### US-M4-003: Tolerance Check — RECEIVED path
**As a** System,
**I want to** auto-approve receipts within tolerance,
**So that** inbound posting happens immediately without manual intervention.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Formula: `variance_pct = |net − expected| / expected` [BR-IN-004]
- AC2: variance_pct ≤ tolerance_pct → auto RECEIVED; InventTrans INBOUND posted ngay [CONFIRMED]
- AC3: Tolerance per owner+item (không phải global) [BR-IN-006]
- AC4: Default tolerance = 0.5% [TO-CONFIRM: TVL confirm]
- AC5: RECEIVED → billing inbound_handling event captured tự động

---

### US-M4-004: Tolerance Check — REJECTED + Re-weigh
**As a** WB_OPERATOR,
**I want to** initiate re-weighing when a receipt is rejected,
**So that** scale errors don't permanently fail a valid delivery.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: variance_pct > tolerance_pct → Receipt: REJECTED (không phải PENDING_APPROVAL) [CONFIRMED]
- AC2: WB_OPERATOR có thể bấm "Initiate Re-weigh" → Receipt: AWAITING_WEIGHING [CONFIRMED]
- AC3: Max 3 lần re-weigh; lần thứ 4 → nút bị lock; chỉ WH_MANAGER cancel [CONFIRMED]
- AC4: Re-weigh giữ nguyên receipt number; tạo weighbridge_log mới per attempt
- AC5: Nếu lần cân lại pass → RECEIVED bình thường

---

### US-M4-005: Posting at RECEIVED
**As a** System,
**I want to** post InventTrans exactly at RECEIVED state,
**So that** inventory is only added when the cargo has been officially accepted.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Posting point duy nhất: Receipt state = RECEIVED [CONFIRMED] [BR-INV-003]
- AC2: Intermediate states (DRAFT/AWAITING_WEIGHING/WEIGHED_IN/PROCESSING/WEIGHED_OUT) KHÔNG post
- AC3: InventTrans: type=INBOUND, qty=+net_weight_kg, dim=RECEIVING location, owner, AVAILABLE
- AC4: Cancel trước RECEIVED → không cần reverse (chưa có InventTrans)
- AC5: Cancel sau RECEIVED (edge case) → phải reverse InventTrans trước

---

### US-M4-006: Putaway Work Creation
**As a** System,
**I want to** auto-create a Putaway WorkHeader when a receipt reaches RECEIVED,
**So that** WH_KEEPER can immediately start moving goods to storage.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Receipt RECEIVED → auto-create Putaway WorkHeader (1 per receipt) [CONFIRMED]
- AC2: WorkHeader OPEN, unassigned; visible trên mobile app của WH_KEEPER
- AC3: WorkLine: source = RECEIVING location, destination = STORAGE (per putaway rule)
- AC4: [TO-CONFIRM] Putaway vào nhiều locations (split 1 receipt → nhiều vị trí) có support không?
- AC5: Putaway WorkHeader COMPLETED → Receipt: PUTAWAY → trigger WH_MANAGER close

---

### US-M4-007: Receipt Closing & Blocking (Bagged)
**As a** WH_MANAGER,
**I want to** close a receipt after putaway is complete and enforce PO-level blocking for bagged goods,
**So that** the receipt becomes immutable and bagged POs are never over-received.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Receipt CLOSED: immutable, chỉ view/export/print [BR-IN-010]
- AC2: Chỉ cho close khi Putaway Work đã COMPLETED
- AC3: Hàng bao (BAGGED): SUM(bag_count across all receipts for PO) + current ≤ PO.expected_bag_count; nếu vượt → BLOCK [BR-IN-011]
- AC4: Hàng xá (BULK): không áp dụng blocking per PO [BR-IN-011]
- AC5: Cancel: chỉ từ DRAFT/AWAITING_WEIGHING/PROCESSING; KHÔNG cancel RECEIVED/PUTAWAY/CLOSED [BR-IN-009]

## 4.5 Business Rules Reference
BR-WB-001 đến BR-WB-004, BR-IN-001 đến BR-IN-012, BR-RBAC-001, BR-RBAC-002, BR-INV-003

## 4.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Tolerance default 0.5% — cần TVL confirm
- [TO-CONFIRM] Putaway split (1 receipt → nhiều locations) — support Phase 1 không?

## 4.7 Dependencies
- Phụ thuộc: M1, M2, M3 (posting), M7 (work), M8 (weighbridge)

## 4.8 Senior Manager Review Gate — MODULE 4

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | State machine đầy đủ: DRAFT→...→RECEIVED→PUTAWAY→CLOSED và REJECTED/CANCELLED? | | |
| 2 | Posting chỉ tại RECEIVED, không ở intermediate states? | | |
| 3 | Re-weigh max 3 lần, lần 4 chỉ WH_MANAGER cancel? | | |
| 4 | Manual weight: chỉ WH_MANAGER, bắt buộc reason_code? | | |
| 5 | Bagged PO blocking test: sum > expected → BLOCK? | | |
| 6 | [TO-CONFIRM] items (tolerance %, split putaway) đã chốt? | | |
| 7 | OCR Vessel flow: auto-match B/L + fallback manual? | | |
| 8 | Idempotent: retry create receipt với same external_id → no duplicate? | | |

---

# MODULE 5 — OUTBOUND OPERATIONS

## 5.1 Scope

**Phase 1 (In Scope):**
- Sales Order / Delivery Request intake
- Shipment state machine
- Allocation-based hold (FIFO, no traditional reservation) [CONFIRMED]
- Pick work creation (trigger M7)
- Multi-trip weighing sequence (flexible order)
- Outbound posting tại SHIPPED
- DPM dual tracking (actual net vs bag_count × nominal)
- Exception handling: PENDING_APPROVAL

**[PHASE 2] / Out of Scope:**
- Partial allocation / partial shipment [CONFIRMED]
- FEFO allocation

## 5.2 Business Context

Đây là module phát sinh ngoại lệ dễ nhất: hàng thiếu, xe vượt giới hạn, tolerance fail giữa vòng cân. TVL có quy trình cân đặc thù (flexible sequence, multi-trip) — cần implement đúng hoặc sẽ gây tranh chấp với khách.

## 5.3 User Personas

| Role | Use case trong M5 |
|------|------------------|
| WH_ADMIN/WH_MANAGER | Tạo SO, tạo shipment, allocate |
| WB_OPERATOR | Tare + multi-line gross weighing |
| WH_KEEPER | Pick execution (M7) |
| WH_MANAGER | Override PENDING_APPROVAL; force approve/reject shipment |

## 5.4 User Stories

### US-M5-001: Sales Order & Shipment Creation
**As a** WH_MANAGER,
**I want to** create shipments linked to sales orders,
**So that** every outbound movement is tracked against a delivery commitment.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: 1 shipment = 1 trip = 1 xe [BR-OUT-001]
- AC2: Shipment number auto-sinh PER_WAREHOUSE: SHP-YYYYMMDD-SEQNUM
- AC3: SO có thể link nhiều shipment trips
- AC4: Split shipment: chọn shipment → nhập split qty → hệ thống tạo shipment mới [BR-OUT-007]
- AC5: Standalone shipment (không cần SO) được support

---

### US-M5-002: Allocation-Based Hold
**As a** System,
**I want to** allocate specific inventory to a shipment using FIFO and set reserved_qty,
**So that** committed stock cannot be used by other shipments.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Allocation: không dùng traditional reservation; dùng allocation-based hold [CONFIRMED]
- AC2: Algorithm: FIFO theo lot_date ASC [CONFIRMED] [BR-OUT-002]
- AC3: available_qty = physical_qty − reserved_qty; allocated_qty ≤ available_qty [BR-OUT-003]
- AC4: Nếu tổng available < expected → allocation FAIL toàn bộ (không partial) [CONFIRMED]
- AC5: Pessimistic locking khi allocate concurrent [TO-CONFIRM: cần ADR chính thức]
- AC6: Unallocate (cancel): reserved_qty released ngay

---

### US-M5-003: Pick Work Creation
**As a** System,
**I want to** auto-create Pick WorkHeaders when a shipment is allocated,
**So that** WH_KEEPER can immediately execute picking on mobile.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Shipment ALLOCATED → PICKING → auto-create Pick Work (1 per shipment line) [CONFIRMED]
- AC2: Pick WorkHeader: source = allocated location, qty = allocated_qty
- AC3: Tất cả Pick Work COMPLETED → Shipment: PICKED
- AC4: [TO-CONFIRM] Short pick ≤2% auto-accept / 2–5% flag / >5% block
- AC5: Unassigned pick work visible cho tất cả WH_KEEPER trong warehouse đó

---

### US-M5-004: Multi-Trip Outbound Weighing
**As a** WB_OPERATOR,
**I want to** weigh outbound shipments with flexible line sequence,
**So that** Keepers can load cargo in any order without system constraint.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Tare trước (xe rỗng), sau đó gross từng line theo thứ tự Keeper chọn tự do [CONFIRMED] [TC-09]
- AC2: net_line_N = gross_N − gross_(N−1); net_line_1 = gross_1 − tare [BR-WB-005]
- AC3: Cross-check: total_net = gross_final − tare; nếu lệch → log warning
- AC4: Line fail tolerance → ghi PENDING_APPROVAL nhưng không chặn các line tiếp theo [CONFIRMED] [TC-10]
- AC5: Tất cả lines weighed → Shipment: ALL_WEIGHED

---

### US-M5-005: DPM Dual Tracking
**As a** System,
**I want to** track DPM (Đạm Phú Mỹ) outbound with dual qty recording,
**So that** inventory is decremented by actual weight but reports use nominal bag count × weight.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: InventTrans OUTBOUND: −actual_net_weight_kg (từ cân) [CONFIRMED] [BR-OUT-006]
- AC2: Billing + reporting: bag_count × nominal_weight_per_bag
- AC3: Variance giữa actual và nominal → ghi log, KHÔNG auto-adjust
- AC4: DPM flag per owner+item hoặc per shipment
- AC5: Báo cáo hiển thị cả 2: actual net weight + nominal (bag count based)

---

### US-M5-006: Outbound Exception Handling (PENDING_APPROVAL)
**As a** WH_MANAGER,
**I want to** review and approve/reject shipment exceptions centrally after weighing completes,
**So that** truck flow is not interrupted mid-operation.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Line fail tolerance → flag PENDING_APPROVAL; không chặn xe [TC-10]
- AC2: Bulk surplus: SUM(shipped) + current > SO.expected → BLOCK mặc định [BR-OUT-004]
- AC3: WH_MANAGER xem: variance per line, lịch sử cân, expected vs actual
- AC4: Approve → InventTrans OUTBOUND posted; Reject → Shipment CANCELLED
- AC5: Approval bắt buộc reason_code + audit log

---

### US-M5-007: Outbound Posting at SHIPPED
**As a** System,
**I want to** post InventTrans only when shipment reaches SHIPPED state,
**So that** inventory is not decremented until the cargo has officially left.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Posting point duy nhất: Shipment state = SHIPPED [CONFIRMED] [BR-INV-003]
- AC2: Intermediate states (ALLOCATED/PICKING/PICKED/WEIGHING) chỉ hold reserved_qty, không trừ physical
- AC3: InventTrans: type=OUTBOUND, qty=−shipped_qty per line, dim=source location, owner
- AC4: Cancel trước SHIPPED → unallocate, released reserved_qty, không cần reverse
- AC5: Reversal sau SHIPPED (hậu kiểm lỗi): tạo counter-trans qua M3

---

### US-M5-008: Shipment Cancellation
**As a** WH_MANAGER,
**I want to** cancel shipments at allowed states,
**So that** allocated inventory is returned to available pool.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Cancel được từ: DRAFT, CONFIRMED, ALLOCATED, PICKING, PENDING_APPROVAL [BR-OUT-008]
- AC2: KHÔNG cancel đã SHIPPED/CLOSED
- AC3: Cancel → allocation released → reserved_qty giảm → available_qty phục hồi
- AC4: Pick Task đang IN_PROGRESS → cancel → WH_KEEPER nhận thông báo
- AC5: Nếu đã ship 1-2 lines trong vòng cân → reversal bắt buộc cho lines đã ship [BR-OUT-008]

## 5.5 Business Rules Reference
BR-WB-005, BR-OUT-001 đến BR-OUT-010, BR-INV-003, BR-RBAC-002

## 5.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Pessimistic locking khi allocate concurrent — cần ADR chính thức
- [TO-CONFIRM] Short pick threshold: ≤2% / 2–5% / >5% — TVL cần confirm
- [TO-CONFIRM] Thứ tự cân lines outbound: đã confirm flexible hay bắt buộc sequence? [Q9 BRD]

## 5.7 Dependencies
- Phụ thuộc: M1, M2, M3 (posting + availability), M7 (pick work), M8 (weighbridge)

## 5.8 Senior Manager Review Gate — MODULE 5

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Allocation FIFO đúng, partial allocation bị chặn? | | |
| 2 | Multi-trip net formula đúng (gross_N − gross_N-1)? | | |
| 3 | Flexible sequence test: Keeper cân line bất kỳ thứ tự? | | |
| 4 | DPM dual tracking: InventTrans trừ actual, report theo nominal? | | |
| 5 | PENDING_APPROVAL: không chặn xe giữa vòng cân? | | |
| 6 | Posting chỉ tại SHIPPED, không ở ALLOCATED/PICKING? | | |
| 7 | [TO-CONFIRM] items (locking, short pick) đã chốt? | | |
| 8 | Bulk surplus BLOCK hoạt động đúng? | | |

---

# MODULE 6 — INVENTORY CONTROL

## 6.1 Scope

**Phase 1 (In Scope):**
- Move Internal (trong kho), Inter-Warehouse Transfer
- Inventory Status Change (AVAILABLE ↔ BLOCKED/DAMAGED)
- Cycle Count (blind count + variance + adjustment)
- Inventory Adjustment (shrinkage, found stock, correction)
- Inventory History & Traceability

## 6.2 Business Context

Duy trì chất lượng tồn kho trong vận hành hàng ngày. TVL là 3PL — tồn phải đúng theo owner, location, status từng phút. Sai tồn = tranh chấp khách hàng.

## 6.3 User Personas

| Role | Use case trong M6 |
|------|------------------|
| WH_MANAGER | Tạo move/transfer; status change; approve cycle count variance; adjustment |
| WH_KEEPER | Thực hiện move/transfer work (M7) |
| OPS_SUPER | Xem inventory history; run reconciliation |

## 6.4 User Stories

### US-M6-001: Move Internal
**As a** WH_MANAGER,
**I want to** move inventory between locations within the same warehouse,
**So that** physical cargo position matches the system record.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Move: source location + item + qty → destination location (cùng warehouse)
- AC2: M6 tạo request → M3 post 2 InventTrans: −qty source / +qty destination (net zero)
- AC3: Validate source: đủ available_qty, đúng warehouse
- AC4: Validate destination: STORAGE type, không vượt capacity
- AC5: Move Work tạo cho WH_KEEPER thực hiện qua M7

---

### US-M6-002: Inter-Warehouse Transfer
**As a** WH_MANAGER,
**I want to** transfer inventory between TVL's warehouses with IN_TRANSIT status tracking,
**So that** cargo in transit is visible but not double-counted.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: State machine: Created → Released → Shipped → IN_TRANSIT → Received → Closed [CONFIRMED] [BR-INV-010]
- AC2: Ship từ source: status AVAILABLE→IN_TRANSIT, physical_qty giảm tại source
- AC3: Receive tại dest: IN_TRANSIT→AVAILABLE, physical_qty tăng tại dest
- AC4: [TO-CONFIRM] Transfer có cần weighbridge ở cả 2 đầu không?
- AC5: Tolerance check ship qty vs receive qty

---

### US-M6-003: Inventory Status Change
**As a** WH_MANAGER,
**I want to** change inventory status with mandatory reason code,
**So that** blocked/damaged goods are properly flagged and allocation is prevented.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Chỉ AVAILABLE được allocate; BLOCKED/DAMAGED/IN_TRANSIT không allocate [CONFIRMED] [BR-INV-006]
- AC2: Status change bắt buộc reason_code [CONFIRMED]
- AC3: Audit log: old_status, new_status, user, reason, timestamp
- AC4: Status change tạo InventTrans STATUS_CHANGE qua M3
- AC5: Un-block: BLOCKED → AVAILABLE (sau khi xử lý xong)

---

### US-M6-004: Cycle Count
**As a** WH_MANAGER,
**I want to** run blind cycle counts and post variance adjustments,
**So that** system inventory matches physical reality.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Tạo Count Session: chọn locations → sinh Count Lines với system_qty (WH_KEEPER không thấy) [BR-INV-007]
- AC2: WH_KEEPER nhập counted_qty thực tế (blind count)
- AC3: WH_MANAGER xem variance = counted − system per line
- AC4: Variance = 0 → auto-close line; Variance ≠ 0 → reason code bắt buộc → approve → post CYCLE_COUNT_ADJUST qua M3
- AC5: Recount khi variance lớn: [TO-CONFIRM] threshold bao nhiêu thì recount?

---

### US-M6-005: Inventory Adjustment
**As a** WH_MANAGER,
**I want to** adjust inventory quantities with reason code,
**So that** shrinkage, damage, and found stock are properly recorded.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Adjustment: item, location, qty (+ hoặc −), reason_code bắt buộc [CONFIRMED] [BR-INV-008]
- AC2: Không cần approval workflow [CONFIRMED]
- AC3: Post InventTrans ADJUSTMENT qua M3 ngay khi submit
- AC4: Audit log tự động
- AC5: Không cho điều chỉnh vượt available (đối với trừ)

## 6.5 Business Rules Reference
BR-INV-007, BR-INV-008, BR-INV-009, BR-INV-010, BR-RBAC-005

## 6.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Inter-warehouse transfer có cần weighbridge ở cả 2 đầu?
- [TO-CONFIRM] Cycle count recount threshold bao nhiêu?

## 6.7 Dependencies
- Phụ thuộc: M1, M2, M3 (posting), M7 (work execution)

## 6.8 Senior Manager Review Gate — MODULE 6

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Move net zero: source giảm = destination tăng? | | |
| 2 | Transfer IN_TRANSIT tracking đúng (không double-count)? | | |
| 3 | Status change: BLOCKED/DAMAGED không allocate được? | | |
| 4 | Cycle count: blind count đúng, WH_KEEPER không thấy system_qty? | | |
| 5 | Adjustment: không cần approval, nhưng reason code bắt buộc? | | |
| 6 | [TO-CONFIRM] items đã chốt? | | |
| 7 | Tất cả operations ghi InventTrans qua M3, không bypass? | | |
| 8 | Shrinkage report tính đúng (Total IN − Total OUT)? | | |

---

# MODULE 7 — WORK EXECUTION & MOBILE OPERATIONS

## 7.1 Scope

**Phase 1 (In Scope):**
- WorkHeader/WorkLine model [CONFIRMED]
- Work types Phase 1: PUTAWAY, PICK, MOVE [CONFIRMED]
- Self-claim (không có directed assignment) [CONFIRMED]
- Mobile app: scan location QR, offline queue, sync
- Work Monitoring & Supervisor View

**[PHASE 2] / Out of Scope:**
- REPLENISH, LOAD work types
- Directed assignment by supervisor

## 7.2 Business Context

Cầu nối giữa "chứng từ trên web" và "thao tác thực địa". Receipt/Shipment chỉ là chứng từ nếu không có work execution thật. Module này là bằng chứng thực hiện của Keeper.

## 7.3 User Personas

| Role | Use case trong M7 |
|------|------------------|
| WH_KEEPER | Claim, start, execute, complete work trên mobile |
| WH_MANAGER | Monitor work queue; override exception; assign nếu cần |
| OPS_SUPER | Giám sát tiến độ; xem exception dashboard |

## 7.4 User Stories

### US-M7-001: Work Generation
**As a** System (triggered by M4/M5/M6),
**I want to** auto-generate WorkHeaders when business events occur,
**So that** every physical operation is tracked and triggered correctly.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Receipt RECEIVED → 1 Putaway WorkHeader [CONFIRMED] [BR-WRK-002]
- AC2: Shipment PICKING → N Pick WorkHeaders (1 per shipment line) [CONFIRMED]
- AC3: Move Request → 1 Move WorkHeader
- AC4: Idempotent: retry không tạo trùng WorkHeader (external_id check)
- AC5: WorkHeader OPEN, unassigned khi tạo; visible cho tất cả Keeper trong warehouse đó

---

### US-M7-002: Self-Claim & Task Start
**As a** WH_KEEPER,
**I want to** self-claim available work on mobile and start it,
**So that** I can work without waiting for supervisor assignment.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Self-claim: Keeper bấm "Claim" → `assigned_to = keeper_id`; WorkHeader vẫn OPEN [CONFIRMED] [BR-WRK-001]
- AC2: Bấm "Start" → WorkHeader: IN_PROGRESS; ghi `started_at`
- AC3: Claim ≠ IN_PROGRESS; chỉ Start mới đổi state
- AC4: Release claim: Keeper trả lại task → `assigned_to = NULL`; task OPEN trở lại
- AC5: Không có directed assignment từ supervisor (Phase 1) [CONFIRMED]

---

### US-M7-003: Task Execution & Location Scan
**As a** WH_KEEPER,
**I want to** scan location QR codes to validate my position before completing work,
**So that** inventory is posted to the correct physical location.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Scan location QR = xác nhận vị trí thao tác — KHÔNG phải scan hàng hóa [CONFIRMED]
- AC2: Validate scan: location tồn tại, đúng warehouse, đúng location_type
- AC3: Location mismatch → block, thông báo lỗi; WH_KEEPER phải đến đúng vị trí
- AC4: WorkLine COMPLETED → trigger M3 post InventTrans
- AC5: Offline: queue completion locally; sync khi online [CONFIRMED] [BR-AUD-004]

---

### US-M7-004: Work Completion & Exception
**As a** WH_KEEPER,
**I want to** complete tasks or report exceptions when I cannot fulfil a work line,
**So that** supervisors can take action on blocked operations.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: WorkLine COMPLETED → InventTrans posted (1 event per WorkLine)
- AC2: WorkHeader: tất cả WorkLine COMPLETED/SKIPPED → WorkHeader COMPLETED
- AC3: Exception: source empty (hàng không có tại vị trí), location mismatch → log exception, WH_MANAGER notified
- AC4: Short pick: [TO-CONFIRM] ≤2% auto-accept / 2–5% flag / >5% block
- AC5: WH_MANAGER có thể override location mismatch với reason code

---

### US-M7-005: Work Monitoring (Supervisor View)
**As a** OPS_SUPER / WH_MANAGER,
**I want to** monitor all work in real-time by status, operator, and warehouse,
**So that** I can identify bottlenecks and unblocked stalled operations.

**Priority:** SHOULD HAVE

**Acceptance Criteria:**
- AC1: Dashboard: OPEN/IN_PROGRESS/COMPLETED/CANCELLED count per warehouse
- AC2: Filter: by shift, operator, work type, date
- AC3: Alert: task IN_PROGRESS quá X giờ không complete → flag
- AC4: Exception list: location mismatch, source empty, sync fail
- AC5: Force-complete hoặc cancel work (WH_MANAGER) khi cần

## 7.5 Business Rules Reference
BR-WRK-001, BR-WRK-002, BR-IN-008, BR-MD-002, BR-AUD-004

## 7.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Short pick threshold: ≤2%/2–5%/>5%
- [TO-CONFIRM] SLA cảnh báo task treo: bao nhiêu giờ?

## 7.7 Dependencies
- Phụ thuộc: M1, M2, M3 (posting), M4/M5/M6 (trigger work)
- Block: M4 (putaway), M5 (pick) nếu M7 chưa xong

## 7.8 Senior Manager Review Gate — MODULE 7

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Self-claim đúng: Claim không đổi state, Start mới đổi? | | |
| 2 | Location QR scan validate đúng type và warehouse? | | |
| 3 | WorkLine COMPLETED → InventTrans posted qua M3? | | |
| 4 | Offline queue + sync hoạt động, idempotent? | | |
| 5 | Idempotent: retry create work → không duplicate WorkHeader? | | |
| 6 | [TO-CONFIRM] items (short pick, SLA) đã chốt? | | |
| 7 | Phase 1 work types: chỉ PUTAWAY, PICK, MOVE? VAS không có? | | |
| 8 | Exception flow: location mismatch → blocked, WH_MANAGER notified? | | |

---

# MODULE 8 — WEIGHBRIDGE, OCR & INTEGRATION

## 8.1 Scope

**Phase 1 (In Scope):**
- Weighbridge Local Agent (COM port → WebSocket/REST)
- Weighbridge Log Management
- OCR Intake (port delivery notes)
- Mobile Sync & Offline Resilience
- ERP One-Way Push (Locked Debit Note → ERP)
- Integration Monitoring & Retry

**[PHASE 2] / Out of Scope:**
- ALPR/Camera automation [CONFIRMED]
- Full ERP two-way integration [CONFIRMED]

## 8.2 Business Context

Module "data acquisition & external connectivity". Không sở hữu business rule hay tolerance check — chỉ cung cấp tín hiệu và dữ liệu chuẩn hóa cho M4/M5 tiêu thụ.

## 8.3 User Personas

| Role | Use case trong M8 |
|------|------------------|
| WB_OPERATOR | Xem weight data, confirm OCR |
| System (M4/M5) | Nhận weight event, apply business logic |
| BILLING_OFC | Push ERP, monitor sync status |

## 8.4 User Stories

### US-M8-001: Weighbridge Local Agent
**As a** System,
**I want to** read scale weight automatically via local agent and deliver to SWM backend,
**So that** no manual weight entry is needed for normal operations.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Local Agent đọc COM port, normalize payload, gửi qua WebSocket/REST [BR-WB-001]
- AC2: Latency: scale read → SWM response ≤ 2s [CONFIRMED] [BR-WB-003]
- AC3: Offline/disconnect: queue local → retry 3 lần × 30s [BR-WB-002]
- AC4: Sau 3 retry fail → alert WB_OPERATOR, fallback manual (WH_MANAGER approve)
- AC5: 1 weighbridge event = 1 weighbridge_log record immutable [BR-WB-004]

---

### US-M8-002: OCR Intake
**As a** WB_OPERATOR,
**I want to** upload port delivery notes for OCR extraction,
**So that** Vessel inbound data entry is automated and errors are minimized.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Upload ảnh/PDF → OCR extract: B/L number, vehicle_number, product, vessel, qty [BR-IN-002]
- AC2: Confidence score per field; confidence > 90% → gợi ý auto-link
- AC3: WB_OPERATOR xem kết quả, confirm hoặc sửa tay trước submit
- AC4: OCR fail/low confidence → WB_OPERATOR chọn tay owner + B/L
- AC5: Extracted data + original image lưu lại để audit

---

### US-M8-003: Mobile Sync & Offline Resilience
**As a** WH_KEEPER,
**I want to** work offline and sync automatically when connectivity is restored,
**So that** warehouse floor operations are not dependent on network quality.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Queue putaway/pick completions locally khi offline [CONFIRMED] [BR-AUD-004]
- AC2: Sync khi online: gửi queued events với external_id (idempotent) [BR-AUD-003]
- AC3: Conflict detection: nếu sync conflict → flag, không auto-overwrite
- AC4: Sync status visible cho WH_KEEPER (pending sync count)
- AC5: Retry sync tự động, không cần Keeper can thiệp

---

### US-M8-004: ERP One-Way Push
**As a** System,
**I want to** push locked Debit Notes to ERP in a one-way, idempotent manner,
**So that** financial records are synchronized without risking duplicates.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Chỉ push Locked Debit Notes [CONFIRMED] [BR-BIL-011]
- AC2: One-way (SWM → ERP); ERP không push ngược lại (Phase 1) [CONFIRMED]
- AC3: Idempotent: debit_note_number là unique key; re-push → skip [BR-BIL-011]
- AC4: ERP reject → retry tự động với exponential backoff; alert BILLING_OFC sau X lần fail
- AC5: Push status: SUCCESS/FAILED/PENDING visible trong Integration Monitor

## 8.5 Business Rules Reference
BR-WB-001 đến BR-WB-005, BR-IN-002, BR-AUD-003, BR-AUD-004, BR-BIL-011

## 8.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] ERP API spec: endpoint, auth, payload format — chưa có tài liệu
- [TO-CONFIRM] Retry policy ERP push: bao nhiêu lần, interval bao lâu?

## 8.7 Dependencies
- Phụ thuộc: M1, M2 (traceability, mapping)
- M4/M5 nhận weight event từ M8

## 8.8 Senior Manager Review Gate — MODULE 8

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Weighbridge latency ≤ 2s test pass? | | |
| 2 | Offline queue + retry 3 lần hoạt động đúng? | | |
| 3 | OCR: high confidence → auto-link; low → manual confirm? | | |
| 4 | ERP push idempotent: re-push same DN → no duplicate? | | |
| 5 | Mobile sync: conflict detection không auto-overwrite? | | |
| 6 | [TO-CONFIRM] ERP API spec đã có chưa? | | |
| 7 | Integration monitor: push status visible, alert on failure? | | |
| 8 | weighbridge_log immutable sau khi tạo? | | |

---

# MODULE 9 — VAS / BAGGING OPERATIONS

## 9.1 Scope

**Phase 1 (In Scope):**
- VAS Work Order management (DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED)
- Bulk consumption & finished goods output (3 InventTrans)
- Packaging material ownership (TVL_OWNED / CLIENT_OWNED)
- Multi-session progress tracking
- VAS billing event capture
- VAS exception handling

**[PHASE 2] / Out of Scope:**
- Other VAS types (blending, QA hold)
- Container stuffing advanced

## 9.2 Business Context

Module chuyển đổi hàng hóa — không chỉ là "move". Ảnh hưởng trực tiếp đến tồn kho (2–3 InventTrans per WO) và billing. DPM dual tracking cũng liên quan đến VAS khi xuất hàng bao.

## 9.3 User Personas

| Role | Use case trong M9 |
|------|------------------|
| WH_MANAGER / OPS_SUPER | Tạo, confirm, approve VAS WO |
| WH_KEEPER | Thực hiện bagging sessions |
| BILLING_OFC | Nhận billing event từ VAS completed |

## 9.4 User Stories

### US-M9-001: VAS Work Order Management
**As a** WH_MANAGER,
**I want to** create and confirm VAS Work Orders with stock validation,
**So that** bagging only starts when source inventory is sufficient.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: WO: owner, bulk_source_item, bag_type_output, planned_qty, packaging_ownership [BR-VAS-001]
- AC2: Confirm WO: validate tồn bulk đủ; thiếu → FAIL không cho confirm [BR-VAS-002]
- AC3: WO state: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED | CANCELLED
- AC4: Cancel: chỉ từ DRAFT/CONFIRMED; IN_PROGRESS → cần reverse consumed trans
- AC5: 1 WO có thể gồm nhiều sessions (multi-session) [CONFIRMED]

---

### US-M9-002: Bulk Consumption & Finished Goods Output
**As a** System,
**I want to** post 3 InventTrans atomically when a WO is completed,
**So that** bulk stock decreases and bagged output increases correctly.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: 3 InventTrans khi WO COMPLETED [CONFIRMED] [BR-VAS-003]: VAS_CONSUME (−bulk_qty), VAS_PRODUCE (+bagged_qty), VAS_CONSUME (−packaging_qty nếu TVL_OWNED)
- AC2: Tất cả 3 trans trong 1 DB transaction atomic
- AC3: Yield variance: output < planned → reason code bắt buộc
- AC4: Packaging TVL_OWNED: trừ từ TVL inventory. CLIENT_OWNED: trừ từ client inventory [BR-VAS-004]
- AC5: Reverse correction: nếu WO completed sai → reverse 3 trans + tạo new WO

---

### US-M9-003: VAS Exception Handling
**As a** WH_MANAGER,
**I want to** handle exceptions during VAS execution,
**So that** partial or failed operations do not create inventory inconsistencies.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Thiếu bulk nguồn (sau khi confirm) → cần inventory adjustment trước khi proceed
- AC2: Thiếu bao bì (CLIENT_OWNED) → block start session, notify manager
- AC3: Hủy WO khi IN_PROGRESS: nếu đã có partial consume session → reverse consumed trans
- AC4: Yield thực tế < planned: require reason code, log variance
- AC5: Rework: COMPLETED WO không thể reverse trực tiếp → tạo WO mới với type=REWORK

---

### US-M9-004: VAS Billing Event Capture
**As a** System,
**I want to** capture billing events automatically when a VAS WO completes,
**So that** labor and material fees are billed correctly to the owner.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: WO COMPLETED → billing event: labor fee = actual_qty_mt × tier_rate [BR-BIL-005]
- AC2: Tier pricing: 0–1.000MT→111K/MT; 1.001–5.000MT→105K/MT; >5.000MT→100K/MT [TO-CONFIRM: reset monthly hay cumulative?]
- AC3: TVL_OWNED packaging: bill material fee = bag_count × price_per_bag [BR-VAS-004]
- AC4: CLIENT_OWNED: bill labor only
- AC5: OT sessions: is_overtime flag → apply OT rate multiplier [BR-VAS-005]

## 9.5 Business Rules Reference
BR-VAS-001 đến BR-VAS-005, BR-BIL-005

## 9.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Tier pricing reset: monthly calendar hay rolling cumulative?

## 9.7 Dependencies
- Phụ thuộc: M1, M2, M3 (posting), M7 (execution), M10 (billing event)

## 9.8 Senior Manager Review Gate — MODULE 9

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Confirm WO validate tồn đủ; thiếu → FAIL? | | |
| 2 | 3 InventTrans atomic khi WO COMPLETED? | | |
| 3 | CLIENT_OWNED vs TVL_OWNED: billing khác nhau đúng? | | |
| 4 | Cancel IN_PROGRESS WO: reverse partial consume? | | |
| 5 | Tier pricing tính đúng 3 tiers? | | |
| 6 | [TO-CONFIRM] tier reset rule đã chốt? | | |
| 7 | Multi-session: nhiều session cộng vào cùng 1 WO đúng? | | |
| 8 | VAS billing event tạo tự động, không cần manual trigger? | | |

---

# MODULE 10 — BILLING & COMMERCIAL CONTROL

## 10.1 Scope

**Phase 1 (In Scope):**
- Rate Card & Contract Setup
- Billing Event Capture (handling, storage snapshot, VAS)
- Charge Calculation Engine
- Debit Note (DRAFT → REVIEWED → APPROVED → LOCKED)
- ERP One-Way Push (via M8)
- Billing Exception & Reconciliation

**[PHASE 2] / Out of Scope:**
- Credit Note workflow [CONFIRMED]
- Multi-currency billing [CONFIRMED]

## 10.2 Business Context

Module chuyển "warehouse operations" thành "commercial revenue". Chỉ đúng khi InventTrans và daily snapshot bên dưới đúng. Billing sai = revenue loss + customer dispute.

## 10.3 User Personas

| Role | Use case trong M10 |
|------|------------------|
| WH_ADMIN | Setup rate card, contract, day type calendar |
| BILLING_OFC | Generate DN, review, lock, push ERP, handle exception |
| WH_MANAGER | Approve DN (nếu required) [TO-CONFIRM] |
| CUST_VIEWER | View locked DN của owner mình |

## 10.4 User Stories

### US-M10-001: Rate Card & Contract Setup
**As a** WH_ADMIN / BILLING_OFC,
**I want to** configure billing rates per owner with effective dates,
**So that** fee calculations use the correct rates for each period.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Max 1 active contract per owner per date range [CONFIRMED] [BR-BIL-006]
- AC2: Fee lines: storage_rate/MT/day, handling_inbound, handling_outbound, bagging, stuffing
- AC3: Free days: per lot, từ ngày putaway đầu tiên [BR-BIL-007]
- AC4: DEFAULT contract: áp dụng cho owner chưa có contract riêng [BR-BIL-006]
- AC5: Cảnh báo overlap date range khi tạo/edit contract

---

### US-M10-002: Billing Event Capture
**As a** System,
**I want to** auto-capture billing events when inbound/outbound/VAS operations complete,
**So that** no billable event is missed.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Inbound handling: Receipt RECEIVED → capture event: net_weight_kg × rate × day_type_factor [BR-BIL-003]
- AC2: Outbound handling: Shipment SHIPPED → capture event [BR-BIL-003]
- AC3: VAS: WO COMPLETED → capture event (via M9) [BR-BIL-005]
- AC4: Day type rates: WORKING_DAY=100%, DAY_OFF=150%, HOLIDAY=200% [CONFIRMED] [BR-BIL-004]
- AC5: Event capture idempotent: same ref_id không tạo duplicate billing event

---

### US-M10-003: Daily Storage Snapshot
**As a** System,
**I want to** capture daily storage snapshots at EOD,
**So that** storage fees are calculated on correct inventory levels.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Batch job chạy 23:59 Vietnam (UTC+7) hàng ngày [CONFIRMED] [BR-BIL-008]
- AC2: Formula: Daily = (Opening + Inbound Today) × rate/MT/day; KHÔNG trừ outbound [CONFIRMED] [BR-BIL-001]
- AC3: Chỉ tính location có is_billing_location=TRUE [CONFIRMED]
- AC4: Free days: không tính phí trong free_days period [BR-BIL-007]
- AC5: Snapshot immutable sau khi tạo; [TO-CONFIRM] configurable cut-off time per warehouse?

---

### US-M10-004: Charge Calculation Engine
**As a** System,
**I want to** calculate fees from billing events and snapshots using the effective rate card,
**So that** Debit Notes contain accurate, traceable charge lines.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Input: billing event / snapshot + rate card effective tại ngày event
- AC2: Output: charge lines với full calculation trace (qty, rate, day_type, amount)
- AC3: Billing UOM: MT. Convert: billing_qty_mt = weight_kg / 1000 [CONFIRMED] [BR-BIL-012]
- AC4: VAT 10% áp dụng đồng nhất [BR-BIL-010]
- AC5: Effective date change trong kỳ: tính đúng rate per ngày, không dùng rate sai period

---

### US-M10-005: Debit Note Management
**As a** BILLING_OFC,
**I want to** generate, review, and lock Debit Notes per owner per billing period,
**So that** billing is finalized and pushed to ERP in a controlled manner.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: DN state: DRAFT → REVIEWED → APPROVED → LOCKED [CONFIRMED] [BR-BIL-009]
- AC2: LOCKED: immutable — không sửa được; chỉ BILLING_OFC lock [CONFIRMED] [BR-RBAC-004]
- AC3: Re-generate draft trước lock: cho phép nếu có sự kiện bổ sung
- AC4: [PHASE 2] Credit Note workflow sau lock
- AC5: [TO-CONFIRM] WH_MANAGER có cần approve DN trước khi BILLING_OFC lock không?

---

### US-M10-006: Billing Exception & Reconciliation
**As a** BILLING_OFC,
**I want to** identify and resolve billing events that cannot be charged,
**So that** all billable events are eventually invoiced or properly written off.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Thiếu rate card → event flag UNBILLED; BILLING_OFC thấy alert
- AC2: Event orphan (không có giao dịch gốc) → flag to investigate
- AC3: Quantity mismatch: billing qty vs ops qty → highlight discrepancy
- AC4: Duplicate event: prevention, detect và flag
- AC5: Reconciliation report: billing events vs InventTrans vs DN amounts

## 10.5 Business Rules Reference
BR-BIL-001 đến BR-BIL-012, BR-RBAC-003, BR-RBAC-004

## 10.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] EOD cut-off configurable per warehouse không?
- [TO-CONFIRM] WH_MANAGER cần approve DN trước khi BILLING_OFC lock?
- [TO-CONFIRM] CUST_VIEWER xem Draft DN hay chỉ LOCKED?

## 10.7 Dependencies
- Phụ thuộc: M1, M2, M3 (InventTrans), M4 (inbound event), M5 (outbound event), M8 (ERP push), M9 (VAS event)

## 10.8 Senior Manager Review Gate — MODULE 10

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Storage formula đúng: (Opening + Inbound) × rate, không trừ outbound? | | |
| 2 | EOD snapshot 23:59 chạy đúng timezone VN (UTC+7)? | | |
| 3 | Locked DN: immutable, không có endpoint sửa? | | |
| 4 | Charge calculation trace đầy đủ (qty, rate, day_type, amount)? | | |
| 5 | Day type rates: 100%/150%/200% áp dụng đúng? | | |
| 6 | [TO-CONFIRM] items (cut-off config, DN approval) đã chốt? | | |
| 7 | ERP push idempotent (via M8)? | | |
| 8 | Billing exception: UNBILLED events visible, có thể resolve? | | |

---

# MODULE 11 — REPORTING, AUDIT & GO-LIVE CONTROL

## 11.1 Scope

**Phase 1 (In Scope):**
- Operational Dashboard
- Inventory Reports (stock, movement, aging)
- Billing & Revenue Reports
- Audit & Traceability Reports
- Reconciliation & Go-Live Control

## 11.2 Business Context

Giúp TVL không chỉ "chạy được" mà còn "tin được". Module này không tạo business truth mới — chỉ tổng hợp và đối soát từ nguồn dữ liệu đúng.

## 11.3 User Personas

| Role | Use case trong M11 |
|------|------------------|
| OPS_SUPER | Dashboard, ops reports, reconciliation |
| WH_MANAGER | Inventory view, exception reports |
| BILLING_OFC | Billing reports, revenue view |
| CUST_VIEWER | Own inventory + billing reports (read-only) |
| ADMIN | Audit log reports |

## 11.4 User Stories

### US-M11-001: Operational Dashboard
**As a** OPS_SUPER / WH_MANAGER,
**I want to** see real-time operational metrics in a single dashboard,
**So that** I can identify bottlenecks and exceptions immediately.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Throughput: inbound/outbound count và tonnage hôm nay per warehouse
- AC2: Work queue: OPEN/IN_PROGRESS/OVERDUE count per type
- AC3: Pending exceptions: PENDING_APPROVAL shipments, REJECTED receipts, scale errors
- AC4: Capacity: % capacity per warehouse/location (warning 85%, red 100%) [BR-MD-007]
- AC5: Refresh: real-time hoặc ≤60s polling

---

### US-M11-002: Inventory Reports
**As a** WH_MANAGER / CUST_VIEWER,
**I want to** view current and historical inventory by various dimensions,
**So that** stock levels are transparent and disputes can be resolved.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: On-hand: item, warehouse, location, owner, status, qty; real-time
- AC2: Movement history: receipt/shipment/move/adjustment per date range
- AC3: Shrinkage report: Total IN − Total OUT per SKU per owner (khi fully shipped) [BR-INV-009]
- AC4: Export Excel; filter: date range, owner, item, warehouse, status
- AC5: CUST_VIEWER: tự động filter theo owner_id, không thấy hàng owner khác [BR-RBAC-006]

---

### US-M11-003: Audit & Traceability
**As a** ADMIN / WH_MANAGER,
**I want to** trace any inventory change back to its source document,
**So that** disputes and errors can be fully investigated.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: End-to-end trace: OnHand → InventTrans → Receipt/Shipment/WorkHeader
- AC2: User action history: mọi action ghi audit_log với user, timestamp, before/after [BR-AUD-001]
- AC3: Manual exception audit: manual weight, adjustment, override — có reason code
- AC4: Export audit log theo filter (date range, entity type, user, action)
- AC5: Retention 7 năm accessible [CONFIRMED] [BR-AUD-002]

---

### US-M11-004: Reconciliation & Go-Live Control
**As a** OPS_SUPER,
**I want to** run reconciliation across ledger, OnHand, and billing layers,
**So that** data integrity is confirmed before go-live and periodically thereafter.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Reconciliation: OnHand vs InventTrans SUM (should = 0 difference) [BR-INV-002]
- AC2: Reconciliation: Billing events vs InventTrans (đối soát phí vs giao dịch)
- AC3: Không auto-fix discrepancy — chỉ log + alert [CONFIRMED]
- AC4: Go-Live readiness checklist: open [TO-CONFIRM] items, pending exceptions, test coverage
- AC5: Issue register: track open items đến khi resolved (trước UAT/cutover/go-live)

## 11.5 Business Rules Reference
BR-INV-002, BR-INV-009, BR-AUD-001, BR-AUD-002, BR-RBAC-006, BR-MD-007

## 11.6 Open Items [TO-CONFIRM]
- [TO-CONFIRM] Aging report threshold: bao nhiêu ngày là "aging"?
- [TO-CONFIRM] Dashboard refresh rate: real-time WebSocket hay polling?

## 11.7 Dependencies
- Phụ thuộc: Tất cả module (tổng hợp dữ liệu từ M1–M10)

## 11.8 Senior Manager Review Gate — MODULE 11

| # | Câu hỏi | Yes / No | Ghi chú |
|---|---------|----------|---------|
| 1 | Dashboard real-time, capacity warning đúng 85%/100%? | | |
| 2 | CUST_VIEWER: filter đúng owner, không thấy owner khác? | | |
| 3 | Trace OnHand → InventTrans → document gốc hoạt động? | | |
| 4 | Shrinkage report tính đúng (IN − OUT)? | | |
| 5 | Reconciliation: detect discrepancy, không auto-fix? | | |
| 6 | Audit log export: date filter, user filter, 7 năm accessible? | | |
| 7 | Go-Live readiness checklist hiển thị open [TO-CONFIRM] items? | | |
| 8 | [TO-CONFIRM] items (aging threshold, dashboard refresh) đã chốt? | | |

---

# PHỤ LỤC — Consolidated [TO-CONFIRM] Register

| ID | Module | Câu hỏi | Ảnh hưởng nếu chưa chốt |
|----|--------|---------|------------------------|
| TC-01 | M1 | Ranh giới quyền WH_ADMIN vs ADMIN trong setup rate card? | RBAC matrix sai |
| TC-02 | M1, M10 | CUST_VIEWER có xem Draft DN không hay chỉ LOCKED? | UI build sai |
| TC-03 | M2, M4 | Tolerance default là 0.5%? TVL cần confirm giá trị chính xác | Auto-RECEIVED/REJECTED sai |
| TC-04 | M2 | Bag shell weight: fixed value hay tính từ thực tế? | Outbound blocking calculation sai |
| TC-05 | M4 | Putaway split (1 receipt → nhiều locations) support Phase 1 không? | Work generation logic khác |
| TC-06 | M5 | Pessimistic locking allocation: cần ADR chính thức | Concurrent allocation risk |
| TC-07 | M5, M7 | Short pick threshold: ≤2% auto / 2–5% flag / >5% block | Pick exception handling sai |
| TC-08 | M6 | Inter-warehouse transfer: cần weighbridge cả 2 đầu? | Transfer qty reconciliation |
| TC-09 | M6 | Cycle count recount threshold bao nhiêu? | Count process thiếu |
| TC-10 | M7 | SLA cảnh báo task treo: bao nhiêu giờ? | Monitoring alert sai |
| TC-11 | M8 | ERP API spec: endpoint, auth, payload format? | Push fail toàn bộ |
| TC-12 | M8 | ERP push retry: bao nhiêu lần, interval bao lâu? | Integration instability |
| TC-13 | M9 | Tier pricing reset: monthly calendar hay rolling cumulative? | VAS billing sai |
| TC-14 | M10 | EOD cut-off: configurable per warehouse không? | Snapshot timing sai |
| TC-15 | M10 | WH_MANAGER cần approve DN trước khi BILLING_OFC lock? | DN workflow thiếu bước |
| TC-16 | M11 | Aging report threshold: bao nhiêu ngày? | Report display sai |
| TC-17 | M11 | Dashboard refresh rate: WebSocket hay polling? | Performance decision |

---

*TVL SWM BA-PO Master Specification — Senior Manager Review Edition*
*Nguồn: Business Rules Document v1.0 + PRD v4.0 + TVL_SWM_overview_spec_module.md*
*Cập nhật: March 2026*
