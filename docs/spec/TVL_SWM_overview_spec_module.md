# TVL SWM — Module Specification Master

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)
**Mục tiêu tài liệu:** Đặc tả module tổng thể để Dev, QA, PM, Tech Lead và nghiệp vụ đọc theo từng module — hiểu mục tiêu, phạm vi, input, output, case điển hình và sub-module.

> **Hướng dẫn sử dụng:**
> Tài liệu này không thay thế BRD / FS / API Spec / UAT chi tiết. Nó là nền để bóc tiếp thành Functional Spec, API Contract, ERD, UAT Scenario và backlog sprint.
> — **[CONFIRMED]** = TVL đã xác nhận, không hỏi lại.
> — **[TO-CONFIRM]** = còn mở, phải chốt trước build.
> — **[PHASE 2]** = nằm ngoài go-live hiện tại, chừa kiến trúc nhưng không implement.

---

## 0. Quy ước thuật ngữ

Toàn tài liệu dùng thống nhất các thuật ngữ sau. Mọi sai lệch trong code / API / test đều phải được chuẩn hóa về bảng này.

| Thuật ngữ | Nghĩa cụ thể |
|-----------|-------------|
| **Post** | Tạo InventTrans — ghi biến động tồn kho vào ledger |
| **Lock** | Đóng băng chứng từ thương mại (immutable) — không cho sửa/xóa |
| **Close** | Kết thúc vòng đời của một document (Receipt, Shipment) sau khi mọi bước hoàn tất |
| **Cancel** | Hủy document chưa hoàn tất. Nếu đã post → phải Reverse trước |
| **Reverse** | Tạo InventTrans mới với qty ngược chiều để đối trừ trans đã post. **Không xóa trans gốc** |
| **Confirm** | Chuyển document từ DRAFT sang trạng thái active/processing |
| **Allocation** | Gán tồn kho cụ thể (location + qty) cho một Shipment line. Đây là "allocation-based hold" — không phải soft/hard reservation truyền thống [CONFIRMED] |
| **State** | Trạng thái của document. Viết HOA toàn bộ trong tài liệu (DRAFT, RECEIVED, SHIPPED…) |
| **Scan location** | Scan QR code của **vị trí kho** để xác nhận vị trí thao tác — **không phải** scan hàng hóa |

---

## 1. Mục đích của tài liệu

Tài liệu này giúp toàn team nhìn thấy hệ thống theo **khối năng lực nghiệp vụ thực sự**, không bị phụ thuộc vào menu hay sprint. Mỗi module mô tả: nhận gì, xử lý gì, sinh ra gì, ảnh hưởng đến module nào tiếp theo.

---

## 2. Nguyên tắc thiết kế phải giữ xuyên suốt

> **Lưu ý:** Các nguyên tắc 1–7 đã được xác nhận qua blueprint và spec gốc. Nguyên tắc 8 và 9 là yêu cầu kiến trúc kỹ thuật bắt buộc.

1. **Chứng từ không phải nguồn sự thật cuối cùng của tồn kho.** [CONFIRMED]
   Nguồn sự thật của tồn kho là bộ ba **InventDim → InventTrans → OnHand**. Chứng từ (PO, Receipt, Shipment) chỉ là context dẫn đến việc post InventTrans.

2. **Inbound chỉ post tồn khi đạt RECEIVED.** [CONFIRMED]
   Các state trước (DRAFT, AWAITING_WEIGHING, WEIGHED_IN, PROCESSING, WEIGHED_OUT) là state vận hành, chưa có tồn vật lý chính thức.

3. **Outbound chỉ trừ tồn khi đạt SHIPPED.** [CONFIRMED]
   Allocation, Picking tạo hold qty (reserved_qty) nhưng chưa giảm physical_qty.

4. **Weighbridge là nguồn xác nhận khối lượng thực tế.** [CONFIRMED]
   Với bulk cargo của TVL, khối lượng phải bám vào trạm cân. Manual entry chỉ được phép bởi WH_MANAGER kèm reason code và audit trail.

5. **Mọi ngoại lệ ảnh hưởng business phải có reason code và audit trail.** [CONFIRMED]

6. **Billing chỉ đáng tin khi transaction truth đã đúng.** [CONFIRMED]
   Không được đi tắt từ chứng từ sang phí nếu chưa đi qua InventTrans và daily snapshot đã chốt.

7. **Module phải được hiểu theo object ownership.**
   Receipt không sở hữu tồn kho. InventTrans mới là nơi ghi nhận biến động. Work là đối tượng thực thi. Debit Note là đối tượng thương mại. Không để một object làm quá nhiều việc.

8. **Không chỉnh sửa trực tiếp dữ liệu ledger đã post.** [CONFIRMED]
   Mọi correction phải đi qua cơ chế Reverse — tạo InventTrans mới ngược chiều với `is_reversed=TRUE`. Không UPDATE/DELETE InventTrans đã có. Đây là tính bất biến của ledger.

9. **Idempotency là yêu cầu bắt buộc cho mọi API có side effect.** [CONFIRMED]
   Mọi command API (post, confirm, ship, lock) phải nhận `external_id` để ngăn duplicate khi client retry. Cùng `external_id` → trả kết quả cũ, không tạo transaction mới.

---

## 3. Bản đồ module tổng thể

Hệ thống SWM của TVL được chia thành **11 module nghiệp vụ-chức năng chính**:

1. Foundation & Governance
2. Master Data Management
3. Inventory Core Engine
4. Inbound Operations
5. Outbound Operations
6. Inventory Control
7. Work Execution & Mobile Operations
8. Weighbridge, OCR & Integration
9. VAS / Bagging Operations
10. Billing & Commercial Control
11. Reporting, Audit & Go-Live Control

Ngoài ra có nhóm **[PHASE 2] Parking Lot** gồm các module dành cho post go-live.

---

## 3.1 Ranh giới giữa các module dễ nhầm

Ba cặp module dưới đây có phần giao nhau — team phải thống nhất ranh giới trước khi thiết kế service/API:

### Inventory Core Engine (M3) vs Inventory Control (M6)

| | Module 3 — Inventory Core Engine | Module 6 — Inventory Control |
|---|---|---|
| **Là gì** | Engine/mechanism ghi và đọc ledger | Các use case vận hành tác động đến tồn |
| **Sở hữu** | InventDim, InventTrans, OnHand, Posting Engine, Reversal Logic, Query Service | Move, Transfer, Status Change, Cycle Count, Adjustment, History |
| **Luồng** | Nhận posting event → ghi ledger → cập nhật OnHand | Người dùng/hệ thống tạo lệnh → Module 3 thực thi posting |
| **Quy tắc** | Không có business rule; chỉ validate tính đúng đắn kỹ thuật | Có business rule (reason code, approval, tolerance) |

### Work Execution (M7) vs Inbound/Outbound (M4/M5)

| | Module 4/5 — Inbound/Outbound | Module 7 — Work Execution |
|---|---|---|
| **Sở hữu** | Business state machine, tolerance rule, posting decision | Task lifecycle: OPEN → IN_PROGRESS → COMPLETED → CANCELLED |
| **Trigger** | M4/M5 tạo work khi đạt trigger state (RECEIVED, ALLOCATED) | M7 thực thi work; khi work COMPLETED → M3 post InventTrans |
| **Feedback** | Nhận completion event từ M7 để cập nhật state (PUTAWAY, PICKED) | Không có business logic; chỉ biết task nào ở đâu, ai làm, xong chưa |

### Weighbridge/Integration (M8) vs Inbound/Outbound (M4/M5)

| | Module 8 — Weighbridge/Integration | Module 4/5 — Inbound/Outbound |
|---|---|---|
| **Sở hữu** | Đọc tín hiệu cân, chuẩn hóa và ghi weighbridge_log | Nhận weight event → áp dụng tolerance rule → quyết định state |
| **Quy tắc** | Không có tolerance check; chỉ normalize và deliver data | Tolerance check, RECEIVED/REJECTED decision thuộc M4/M5 |
| **Ranh giới** | M8 cung cấp **dữ liệu**; M4/M5 cung cấp **quyết định nghiệp vụ** | |

---

## 4. Object map toàn chương trình

### 4.1 Business/operational objects chính

- Owner, Vendor, Item/SKU, Warehouse, Location, Inventory Status
- PO / Inbound Plan, Receipt, Weighbridge Log
- WorkHeader / WorkLine
- Sales Order / Delivery Request, Shipment, Allocation Record
- Transfer Order
- Count Sheet / Count Session, Adjustment Document
- VAS Work Order
- Billing Event, Storage Snapshot, Debit Note
- ERP Sync Job

### 4.2 Ledger/control objects chính

- InventDim, InventTrans, OnHand
- Number Sequence, Reason Code, Audit Log, Exception Log

### 4.3 Chuỗi object end-to-end điển hình

**Inbound:**
PO/Plan → Receipt → Weighbridge Log → Receipt RECEIVED → InventTrans INBOUND → OnHand @ RECEIVING → Putaway Work → InventTrans MOVE → OnHand @ STORAGE

**Outbound:**
SO/Delivery Request → Shipment → Allocation Record → Pick Work → Weighbridge Log → Shipment SHIPPED → InventTrans OUTBOUND → OnHand giảm

**Billing:**
InventTrans / Billing Event / Storage Snapshot → Fee Calculation → Debit Note → Lock → ERP Push

---

# 5. MODULE 1 — FOUNDATION & GOVERNANCE

## 5.1 Mục tiêu module

Thiết lập nền kiểm soát để toàn hệ thống vận hành có kỷ luật: đúng quyền, đúng số chứng từ, đúng baseline rule, đúng audit, đúng ranh giới trách nhiệm giữa các vai trò.

## 5.2 Vai trò trong toàn chương trình

Module này là "khóa nghĩa triển khai". Nếu không rõ, dev code đúng API nhưng sai nghiệp vụ; QA test đúng màn hình nhưng lệch baseline.

## 5.3 Input / Output

**Input:** danh sách user/role, danh sách chức năng cần phân quyền, quy tắc sinh số, bộ rule đã confirmed, reason code, chính sách audit.
**Output:** permission matrix, rule baseline catalog, number sequence config, reason code catalog, audit/exception trail policy.

## 5.4 Các case điển hình

- User có quyền xem nhưng không có quyền post
- Manager được override outbound exception nhưng không được sửa ledger trực tiếp
- API retry không sinh số chứng từ mới nếu cùng external_id [CONFIRMED]
- Manual entry bắt buộc chọn reason code và lưu audit log [CONFIRMED]

## 5.5 Sub-modules

### 5.5.1 RBAC & Permission Control
**Mô tả:** Quản lý ai được xem, tạo, post, cancel, approve, lock, export.
**Roles Go-Live:** WH_KEEPER, WH_MANAGER, WH_ADMIN, WB_OPERATOR, BILLING_OFC, OPS_SUPER, ADMIN, CUST_VIEWER.
**Case:** xem-only, post-only, manager override, customer view chỉ thấy hàng của owner mình.

### 5.5.2 Number Sequence & Reference Control
**Mô tả:** Sinh số chứng từ nhất quán. [CONFIRMED] Scope = PER_WAREHOUSE, daily reset. Format: PREFIX-YYYYMMDD-SEQ.
**Output:** RCV-*, SHP-*, WRK-*, TRX-*, DN-*
**Case:** sinh số theo kho, retry cùng external_id không sinh số mới, rollback kỹ thuật không mất trace.

### 5.5.3 Business Rules Baseline
**Mô tả:** Nơi chốt các rule đang dùng để build. Phân loại rõ [CONFIRMED] vs [TO-CONFIRM].
**Case:** inbound fail tolerance = REJECTED + re-weigh (max 3 lần) [CONFIRMED]; outbound fail tolerance = PENDING_APPROVAL [CONFIRMED]; inventory status go-live chỉ 4 loại [CONFIRMED].

### 5.5.4 Reason Code & Audit Policy
**Mô tả:** Chuẩn hóa mã lý do và nguyên tắc ghi audit trail.
**Case:** cancel receipt, adjustment, manual weight, status change, force ship. Retention audit log: 7 năm [CONFIRMED].

---

# 6. MODULE 2 — MASTER DATA MANAGEMENT

## 6.1 Mục tiêu module

Chuẩn hóa danh mục nền để hệ thống hiểu đang quản lý cái gì, của ai, ở đâu, theo quy tắc nào và được tính phí ra sao.

## 6.2 Vai trò trong toàn chương trình

Cung cấp dữ liệu gốc cho tất cả transaction modules. Không có master data đúng thì không thể tạo receipt, shipment, InventTrans hay billing event hợp lệ.

## 6.3 Input / Output

**Input:** danh sách owner/vendor/item/warehouse/location/vehicle type; tolerance, UOM, cargo form; billing setup nền; import template hoặc tạo tay.
**Output:** bộ master data chuẩn hóa; mapping dùng chung cho web/mobile/API/DB/integration; dữ liệu nền cho InventDim và validation giao dịch.

## 6.4 Các case điển hình

- Tạo item thiếu tolerance/UOM → chưa cho giao dịch
- Location sai warehouse hoặc sai location_type
- Owner inactive nhưng còn lịch sử tồn kho
- Cùng SKU, owner khác nhau → tồn riêng (InventDim khác nhau)
- Import hàng loạt, phát hiện trùng mã hoặc mapping lỗi

## 6.5 Sub-modules

### 6.5.1 Owner Management
**Mô tả:** Chủ hàng, tolerance riêng, billing terms, customer view restriction.
**Case:** owner có tolerance override per item [CONFIRMED]; owner inactive; CUST_VIEWER chỉ xem hàng của owner mình.

### 6.5.2 Vendor Management
**Mô tả:** Nhà cung cấp/nguồn hàng inbound. Phân biệt vessel vendor vs standard vendor.

### 6.5.3 Item / SKU Management
**Mô tả:** Mã hàng, cargo_form (BULK/BAGGED), tolerance inbound/outbound, is_catch_weight, density, UOM.
**Case:** bulk vs bagged có đơn giá handling khác nhau [CONFIRMED]; item inactive còn lịch sử.

### 6.5.4 Warehouse & Location Management
**Mô tả:** Cấu trúc kho (11 kho, ~81.500 m²) và vị trí kho.
**Location types:** RECEIVING, STORAGE, STAGING, SHIPPING. Putaway chỉ được vào STORAGE [CONFIRMED].
**Case:** location sai type, location inactive, capacity warning 85%/100%.

### 6.5.5 Vehicle Type Management
**Mô tả:** Loại xe, default tare, capacity. Ảnh hưởng đến billing handling fee [CONFIRMED].

### 6.5.6 Inventory Status Master
**Mô tả:** [CONFIRMED] Go-live 4 status: AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT. Chỉ AVAILABLE được allocate.

### 6.5.7 Billing Master & Reference Setup
**Mô tả:** Service code, day type (WORKING_DAY/DAY_OFF/HOLIDAY), rate reference, billing location flag.
**Case:** storage service, handling, bagging, container stuffing.

### 6.5.8 Master Data Import & Validation
**Mô tả:** Nhập hàng loạt và kiểm tra chất lượng dữ liệu.
**Case:** trùng mã, thiếu trường bắt buộc, sai format, sai tham chiếu chéo.

---

# 7. MODULE 3 — INVENTORY CORE ENGINE

## 7.1 Mục tiêu module

Cung cấp **cơ chế** ghi, đọc và đối soát tồn kho. Đây là engine dùng chung — không tự khởi động, không có business rule riêng. Tất cả module khác gọi vào đây để post/query tồn.

> **Ranh giới với Module 6:** Module 3 là ENGINE (how). Module 6 là OPERATIONS (what/why). Module 3 không biết hàng bị move vì lý do gì; nó chỉ biết cách ghi đúng.

## 7.2 Vai trò trong toàn chương trình

Module sống còn. Nếu module này sai, tất cả inbound/outbound/billing nhìn có vẻ chạy nhưng số liệu không đáng tin.

## 7.3 Input / Output

**Input:** master data chuẩn hóa; posting event từ Receipt/Shipment/Move/Transfer/Adjustment/VAS; posting rules và dimension rules; allocation data.
**Output:** InventDim keys; InventTrans ledger lines; OnHand balance; available/reserved/physical quantities.

## 7.4 Các case điển hình

- Sinh mới InventDim khi tổ hợp chưa có; reuse nếu đã có (dim_hash check) [CONFIRMED]
- Inbound RECEIVED → post +qty
- Outbound SHIPPED → post −qty
- Move/Transfer → đổi dimension, net zero, không mất trace
- Reverse transaction khi cancel sau post

## 7.5 Sub-modules

### 7.5.1 InventDim Management
**Mô tả:** Quản lý tổ hợp dimension. [CONFIRMED] Phase 1: Site + Warehouse + Location + Owner + Status. Batch/Lot = NULL.
**Case:** sinh dim mới, reuse dim, dim_hash dedup bằng SHA-256.

### 7.5.2 InventTrans Ledger
**Mô tả:** Ghi mọi biến động tồn theo ref_type / ref_id / ref_line_id. Immutable — không UPDATE/DELETE [CONFIRMED].
**Case:** inbound positive, outbound negative, move 2 chiều, reversal, duplicate prevention qua external_id.

### 7.5.3 OnHand Balance Engine
**Mô tả:** Tổng hợp tồn theo item + dim. Quy tắc vàng: `OnHand.physical_qty = SUM(InventTrans.qty WHERE stage=PHYSICAL)` [CONFIRMED].
**Output:** physical_qty, available_qty, reserved_qty, ordered_qty.

### 7.5.4 Inventory Status Control
**Mô tả:** Validate hành vi theo status. AVAILABLE → có thể allocate; BLOCKED/DAMAGED/IN_TRANSIT → không thể allocate [CONFIRMED].

### 7.5.5 Posting Engine & Reversal Logic
**Mô tả:** Logic post InventTrans và logic đảo giao dịch. Reverse = tạo trans mới qty ngược, set is_reversed=TRUE [CONFIRMED].
**Case:** cancel sau post, correction bằng reverse.

### 7.5.6 Inventory Query & Availability Service
**Mô tả:** Dịch vụ dùng chung để module khác hỏi tồn và khả dụng trước khi allocate/post.
**Input:** item, owner, warehouse, location, status.  **Output:** on-hand summary, available stock by dimension.

---

# 8. MODULE 4 — INBOUND OPERATIONS

## 8.1 Mục tiêu module

Số hóa toàn bộ luồng nhập hàng từ kế hoạch đến receipt, cân xe, tolerance check, ghi nhận tồn tại RECEIVED, putaway và close receipt.

## 8.2 Vai trò trong toàn chương trình

Đây là module đưa hàng từ "kế hoạch" vào "tồn kho thật" — điểm mà weighbridge xác nhận khối lượng và hệ thống bắt đầu tin tưởng con số.

> **Ranh giới với Module 7:** M4 sở hữu state machine của Receipt và quyết định RECEIVED/REJECTED. M7 sở hữu việc thực thi Putaway work sau khi Receipt đạt RECEIVED.
> **Ranh giới với Module 8:** M8 cung cấp weighbridge data chuẩn hóa. M4 áp dụng tolerance rule và quyết định state.

## 8.3 Input / Output

**Input:** PO/inbound plan; owner, vendor, item, warehouse, vehicle info; expected qty; weigh-in/weigh-out data; tolerance rule; putaway rule.
**Output:** Receipt lifecycle; weighbridge logs gắn với receipt; net received qty; InventTrans INBOUND tại RECEIVED; Putaway work; Receipt CLOSED hoặc REJECTED/CANCELLED.

## 8.4 Các case điển hình

- Standard vehicle inbound happy path
- Vessel/B/L-based inbound
- Tolerance pass → RECEIVED → auto-post InventTrans
- Tolerance fail → REJECTED + re-weigh (max 3 lần, sau đó WH_MANAGER cancel) [CONFIRMED]
- Cancel trước post (không cần reverse) hoặc cancel sau post (phải reverse)
- Putaway xong → Receipt CLOSED

## 8.5 Sub-modules

### 8.5.1 Standard Inbound Planning
**Mô tả:** Luồng xe đăng ký trước. PO + ASN pre-create với vehicle list; match theo vehicle_number khi xe đến.
**Input:** owner, vendor, item, expected qty, vehicle list.
**Output:** PO confirmed, Receipt DRAFT.

### 8.5.2 Vessel / B/L-Based Inbound Planning
**Mô tả:** Luồng hàng tàu. Một B/L gồm nhiều chuyến xe; mỗi xe = một Receipt; tổng hợp theo B/L.
**Input:** B/L number, vessel name, port delivery note (OCR).
**Output:** Receipts per trip linked to B/L; tổng khối lượng thực nhận theo B/L.
**Case:** OCR match B/L tự động; OCR sai → WB_OPERATOR chọn tay.

### 8.5.3 Receipt Management
**Mô tả:** Quản lý đối tượng Receipt và state machine inbound.
**States:** DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED → PUTAWAY → CLOSED | REJECTED | CANCELLED.
**Case:** confirm receipt, cancel ở state cho phép (DRAFT/AWAITING_WEIGHING/WEIGHED_IN/PROCESSING).

### 8.5.4 Inbound Weighing
**Mô tả:** Ghi nhận gross/tare và liên kết với Receipt. M8 cung cấp weight data; M4 nhận và gắn vào Receipt.
**Input:** weight event từ M8 hoặc manual entry có kiểm soát.
**Output:** WEIGHED_IN (gross), WEIGHED_OUT (tare), net_weight_kg tính tự động.
**Case:** cân thành công, local agent delay (M8 queue/retry), manual weight với reason code.

### 8.5.5 Tolerance Check & Re-weigh Control
**Mô tả:** So expected vs actual net để quyết định RECEIVED hay REJECTED.
**Rule:** `|variance_pct| = |net − expected| / expected`. Nếu ≤ tolerance_pct → RECEIVED. Nếu > tolerance_pct → REJECTED [CONFIRMED].
**Tolerance config:** per owner + per item. Default = 0.5% [TO-CONFIRM: TVL cần xác nhận giá trị chính xác].
**Re-weigh:** REJECTED → AWAITING_WEIGHING; max 3 attempts; sau lần 3 chỉ WH_MANAGER được cancel [CONFIRMED].

### 8.5.6 Receiving & Posting
**Mô tả:** Điểm chính thức nhận hàng vào tồn tại RECEIVING area.
**Posting point:** Receipt RECEIVED → Module 3 post InventTrans INBOUND +net_weight_kg [CONFIRMED].
**Case:** auto-post khi tolerance pass, no-post khi REJECTED, reverse nếu cancel sau post.

### 8.5.7 Putaway Execution
**Mô tả:** Đưa hàng từ RECEIVING vào vị trí STORAGE thực tế. Module 4 tạo Putaway Work → Module 7 thực thi → Module 3 post InventTrans MOVE (RECEIVING → STORAGE).
**Input:** received stock, putaway rule, destination location (scan location QR).
**Output:** Putaway work (qua M7), MOVE transaction, Receipt PUTAWAY.
**Case:** [TO-CONFIRM] putaway vào nhiều location (split 1 receipt → nhiều vị trí); location đích full; location type sai → block.

### 8.5.8 Inbound Closing
**Mô tả:** Khóa Receipt sau khi putaway hoàn tất.
**Output:** Receipt CLOSED, immutable, billing inbound event sẵn sàng.
**Case:** còn putaway work chưa xong → chưa cho close; reverse chỉ qua Adjustment module.

---

# 9. MODULE 5 — OUTBOUND OPERATIONS

## 9.1 Mục tiêu module

Số hóa quy trình xuất kho từ nhu cầu giao hàng đến Shipment, allocation-based hold, pick/load, cân xe xuất, SHIPPED và trừ tồn.

## 9.2 Vai trò trong toàn chương trình

Đưa hàng từ tồn khả dụng ra khỏi kho. Đây là điểm phát sinh ngoại lệ dễ ảnh hưởng đến shrinkage, billing và customer dispute.

> **Ranh giới với Module 7:** M5 sở hữu state machine Shipment và allocation decision. M7 sở hữu Pick/Load work execution.
> **Ranh giới với Module 8:** M8 cung cấp weight data per trip. M5 áp dụng multi-trip weighing logic và tolerance check outbound.

## 9.3 Input / Output

**Input:** SO/delivery request; OnHand available; allocation rule; shipment lines; pick/load result; weighbridge outbound logs; outbound tolerance rule.
**Output:** Shipment lifecycle; allocation records; pick/load work; net outbound qty by line/trip; InventTrans OUTBOUND tại SHIPPED; Shipment CLOSED.

## 9.4 Các case điển hình

- Shipment đầy đủ FIFO đơn giản
- Flexible weighing sequence: Keeper chọn tự do thứ tự cân lines [CONFIRMED]
- Multi-trip multi-line: net_line = gross_N − gross_(N-1); cross-check cuối = gross_final − tare [CONFIRMED]
- Outbound exception cần WH_MANAGER override
- DPM (Đạm Phú Mỹ): kho trừ theo actual net weight, báo cáo theo bag_count × nominal weight (dual tracking)
- **[PHASE 2]** Partial allocation/partial shipment

## 9.5 Sub-modules

### 9.5.1 Sales Order / Delivery Request Intake
**Mô tả:** Nhận nhu cầu xuất và chuẩn hóa thành dữ liệu Shipment.
**Input:** owner, item, qty, requested date, destination, vehicle/container context.
**Case:** tạo tay, import Excel, nhiều lines cùng owner.

### 9.5.2 Shipment Management
**Mô tả:** Tạo và quản lý Shipment object, state machine outbound.
**States:** DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → WEIGHING_TARE → [LOADING/GROSS loop] → ALL_WEIGHED → SHIPPED → CLOSED | PENDING_APPROVAL | CANCELLED.
**Case:** split shipment, cancel trước SHIPPED, PENDING_APPROVAL khi ≥1 line fail tolerance.

### 9.5.3 Allocation & Picking Preparation
**Mô tả:** Xác định hàng nào dùng để giao. [CONFIRMED] Không dùng reservation; dùng allocation-based hold. Available = physical − reserved.
**Algorithm:** FIFO (lot_date ASC) [CONFIRMED]. Pessimistic locking để tránh over-commit [TO-CONFIRM: cần ADR chính thức].
**Blocking rule (bulk):** SUM(allocated_qty under SO) + current ≤ SO.expected_qty_kg [CONFIRMED].
**Case:** đủ hàng, thiếu hàng → FAIL toàn bộ (không partial) [CONFIRMED]; blocked stock không allocate.

### 9.5.4 Pick / Load Execution
**Mô tả:** M5 tạo Pick Work → M7 thực thi. Khi tất cả Pick Work COMPLETED → Shipment PICKED.
**Input:** allocation records; source/destination location.
**Case:** self-claim work (M7); [TO-CONFIRM] short pick: auto-adjust hay cần manager approval.

### 9.5.5 Outbound Weighing & Multi-Trip Control
**Mô tả:** Luồng cân xuất đặc thù TVL. Tare trước (xe rỗng) → Gross từng line (Keeper chọn thứ tự tự do).
**Formula:** net_line_N = gross_N − gross_(N−1). Cross-check: total_net = gross_final − tare.
**DPM special case:** actual_net → trừ tồn kho; bag_count × nominal_weight → báo cáo và billing.
**Tolerance outbound:** fail → PENDING_APPROVAL (xử lý tập trung cuối, không chặn giữa chừng) [CONFIRMED].

### 9.5.6 Shipment Confirmation & Posting
**Mô tả:** Điểm chính thức trừ tồn.
**Posting point:** Shipment SHIPPED → Module 3 post InventTrans OUTBOUND −qty per line [CONFIRMED].
**Case:** ship đủ → CLOSED; PENDING_APPROVAL → WH_MANAGER approve → SHIPPED; reverse do lỗi hậu kiểm.

### 9.5.7 Outbound Exception Handling
**Mô tả:** Xử lý ngoại lệ: tolerance fail, shortage, overweight, bulk surplus block.
**Bulk surplus:** nếu vượt SO.expected_qty_kg → BLOCK mặc định; WH_MANAGER có thể override [CONFIRMED].
**Case:** manager override, reject shipment line, re-pick, cancel line.

---

# 10. MODULE 6 — INVENTORY CONTROL

## 10.1 Mục tiêu module

Cho phép thực hiện các thao tác vận hành trên tồn kho sau nhập/xuất: move nội bộ, chuyển kho, đổi status, cycle count, adjustment — đảm bảo mọi thay đổi đi qua Module 3 đúng cách.

## 10.2 Vai trò trong toàn chương trình

Duy trì chất lượng tồn kho trong quá trình vận hành. Quan trọng với 3PL nơi tồn phải đúng theo owner, location và status.

> **Ranh giới với Module 3:** Module 6 tạo request (move/adjust/count); Module 3 thực thi việc post InventTrans. Module 6 không ghi InventTrans trực tiếp.

## 10.3 Input / Output

**Input:** OnHand hiện tại; lệnh move/transfer/status change; count results; adjustment reason; work execution data.
**Output:** move/transfer transactions; status transition; count variance; adjustment documents + InventTrans.

## 10.4 Các case điển hình

- Move trong cùng kho
- Chuyển kho → trạng thái IN_TRANSIT → nhận tại kho đích
- Block hàng hư hỏng → DAMAGED
- Cycle count phát hiện lệch → adjustment qua M3
- Shrinkage adjust (không cần approval) [CONFIRMED]

## 10.5 Sub-modules

### 10.5.1 On-Hand Inquiry
**Mô tả:** Tra cứu tồn theo item/owner/warehouse/location/status. Đọc từ Module 3.
**Case:** tra cứu real-time, filter theo owner, aging.

### 10.5.2 Move Internal
**Mô tả:** Di chuyển hàng trong cùng kho. Tạo request → M3 post InventTrans MOVE (±qty pair).
**Case:** move toàn phần, move một phần, source không đủ, destination invalid.

### 10.5.3 Inter-Warehouse Transfer
**Mô tả:** Chuyển hàng giữa các kho TVL [CONFIRMED]. State: Created → Released → Shipped → IN_TRANSIT → Received → Closed.
**InventTrans:** Ship từ source → status AVAILABLE→IN_TRANSIT, physical giảm. Receive tại dest → IN_TRANSIT→AVAILABLE, physical tăng.
**Case:** [TO-CONFIRM] transfer có cần weighbridge ở cả 2 đầu không; tolerance check ship qty vs receive qty.

### 10.5.4 Inventory Status Change
**Mô tả:** Đổi status tồn mà không thay đổi owner/location. Reason code bắt buộc [CONFIRMED].
**Case:** AVAILABLE → BLOCKED, AVAILABLE → DAMAGED, un-block sau xử lý.

### 10.5.5 Cycle Count
**Mô tả:** Kiểm kê → variance → adjustment qua Module 3. Không sửa OnHand trực tiếp.
**Case:** đúng hoàn toàn; thiếu; thừa. Variance ≠ 0 → reason code bắt buộc [CONFIRMED].

### 10.5.6 Inventory Adjustment
**Mô tả:** Tăng/giảm tồn có kiểm soát. Chỉ cần reason code + audit log, không cần approval [CONFIRMED].
**Case:** shrinkage, damage, found stock, correction sau cycle count.

### 10.5.7 Inventory History & Traceability
**Mô tả:** Truy lịch sử từ OnHand ngược về InventTrans và chứng từ nguồn.
**Case:** audit tranh chấp với khách; truy receipt gây tồn sai; truy shipment gây thiếu tồn.

---

# 11. MODULE 7 — WORK EXECUTION & MOBILE OPERATIONS

## 11.1 Mục tiêu module

Biến các nghiệp vụ cấp chứng từ thành task thực thi ngoài kho theo WorkHeader/WorkLine và self-claim trên mobile.

## 11.2 Vai trò trong toàn chương trình

Cầu nối giữa "business object trên web" và "thao tác thực địa". Receipt/Shipment chỉ là chứng từ nếu không gắn được với work execution thật.

> **Ranh giới với M4/M5:** M4/M5 trigger work creation; M7 thực thi và trả kết quả về M4/M5 để update state.
> **Ranh giới với M3:** WorkLine COMPLETED → M7 gọi M3 post InventTrans. M7 không ghi ledger trực tiếp.

## 11.3 Input / Output

**Input:** trigger events từ Receipt/Shipment/Move/Transfer; quy tắc sinh work; user mobile, role, device status; source/destination location.
**Output:** WorkHeader/WorkLine; execution timestamps, operator logs; trigger cho inventory posting.

## 11.4 Work states

**WorkHeader:** OPEN → IN_PROGRESS → COMPLETED | CANCELLED
**WorkLine:** OPEN → IN_PROGRESS → COMPLETED | SKIPPED | CANCELLED

> **Lưu ý:** "Claim" không phải là một WorkHeader state — khi nhân viên bấm Claim, hệ thống set `assigned_to = user_id` nhưng WorkHeader vẫn ở OPEN. Chỉ khi bấm Start → chuyển IN_PROGRESS [CONFIRMED].

## 11.5 Các case điển hình

- Auto-create Putaway work sau Receipt RECEIVED [CONFIRMED]
- Auto-create Pick work sau Shipment ALLOCATED → PICKING [CONFIRMED]
- Self-claim bởi Keeper — không có supervisor assign [CONFIRMED]
- WorkLine COMPLETED → 1 inventory posting event (via M3)
- Task fail: scan location không khớp (location mismatch), hàng không có tại vị trí

## 11.6 Sub-modules

### 11.6.1 Work Template & Work Type Setup
**Mô tả:** Định nghĩa loại work và cách sinh task.
**Phase 1 Work Types:** PUTAWAY, PICK, MOVE [CONFIRMED].
**[PHASE 2] Work Types:** REPLENISH, CYCLE_COUNT, LOAD.

### 11.6.2 Work Generation Engine
**Mô tả:** Tạo WorkHeader + WorkLines từ business events.
**Trigger:** Receipt RECEIVED → PUTAWAY work; Shipment PICKING → PICK works (1 per shipment line); Manual request → MOVE work.
**Case:** sinh tự động, không sinh trùng khi retry (external_id idempotency).

### 11.6.3 Mobile Task Claim & Execution
**Mô tả:** Keeper tự claim và thực hiện task trên mobile. Scan location QR để xác nhận vị trí thao tác (validate location — không phải scan hàng hóa).
**Offline support:** Queue putaway/pick operations locally; sync khi có mạng [CONFIRMED].
**Case:** self-claim, release claim, offline queue, sync conflict.

### 11.6.4 Work Completion & Exception Handling
**Mô tả:** Xác nhận hoàn tất hoặc ghi ngoại lệ.
**Short pick tolerance:** [TO-CONFIRM] đề xuất: ≤2% auto-accept, 2-5% flag manager, >5% block.
**Case:** hoàn tất đủ, short pick, location mismatch (WH_MANAGER override), source empty.

### 11.6.5 Work Monitoring & Supervisor View
**Mô tả:** Giám sát tiến độ task theo người, kho, trạng thái, SLA.
**Case:** task treo, task bị claim lâu, task fail nhiều lần.

---

# 12. MODULE 8 — WEIGHBRIDGE, OCR & INTEGRATION

## 12.1 Mục tiêu module

Kết nối SWM với thế giới vật lý và các hệ thống ngoài: trạm cân, OCR chứng từ, mobile sync, ERP push, queue/retry/resilience.

## 12.2 Vai trò trong toàn chương trình

Module "data acquisition & external connectivity". Không sở hữu business flow hay tolerance rule. Cung cấp **tín hiệu và dữ liệu chuẩn hóa** cho M4/M5 tiêu thụ.

> **Ranh giới với M4/M5:** M8 cung cấp weighbridge_log đã chuẩn hóa. M4/M5 nhận weight event và áp dụng business logic (tolerance check, state transition). M8 không quyết định RECEIVED hay REJECTED.

## 12.3 Input / Output

**Input:** COM port/device data từ weighbridge; ảnh/chứng từ OCR; payload sync từ mobile; payload export sang ERP; retry policy.
**Output:** weighbridge logs chuẩn hóa; OCR extracted data; sync job status; ERP outbound payloads; technical audit logs.

## 12.4 Các case điển hình

- Đọc cân thành công trong ≤2 giây [CONFIRMED]
- Mất kết nối cân → local queue + retry 3 lần [CONFIRMED]
- OCR đọc sai → user confirm/sửa tay
- ERP reject do mapping lỗi → retry idempotent (debit_note_number là unique key) [CONFIRMED]

## 12.5 Sub-modules

### 12.5.1 Weighbridge Local Agent
**Mô tả:** Edge service đọc COM port, normalize weight event, gửi lên SWM backend qua WebSocket/REST.
**Case:** live read, delay/reconnect, local queue khi offline.

### 12.5.2 Weighbridge Log Management
**Mô tả:** Lưu log cân và liên kết với Receipt/Shipment. Mỗi lần cân = 1 weighbridge_log record.
**Case:** weigh-in, weigh-out, multi-trip sequence, manual attach với reason code.

### 12.5.3 OCR Intake
**Mô tả:** Đọc phiếu giao hàng cảng để hỗ trợ nhập liệu luồng Vessel.
**Output:** extracted fields + confidence score.
**Case:** đọc đúng auto-link, đọc sai user confirm/sửa, thiếu trường quan trọng.

### 12.5.4 Mobile Sync & Offline Resilience
**Mô tả:** Sync dữ liệu mobile với backend. Idempotent via external_id.
**Case:** online trực tiếp, offline rồi sync sau, conflict khi sync lại.

### 12.5.5 ERP One-Way Push
**Mô tả:** Đẩy Locked Debit Note sang ERP (one-way) [CONFIRMED]. Idempotent: debit_note_number là unique key.
**Case:** push thành công, reject vì mapping, duplicate prevention, lock rồi nhưng sync fail → retry.

### 12.5.6 Integration Monitoring & Retry
**Mô tả:** Theo dõi sức khỏe và xử lý lỗi kỹ thuật các kênh tích hợp.
**Case:** timeout, invalid payload, partial success, repeated failure escalation.

---

# 13. MODULE 9 — VAS / BAGGING OPERATIONS

## 13.1 Mục tiêu module

Hỗ trợ dịch vụ gia tăng (VAS), trọng tâm là đóng bao: tiêu hao bulk, tiêu hao vật tư đóng gói, sinh ra hàng bao, theo dõi tiến độ và tạo dữ liệu phí.

## 13.2 Vai trò trong toàn chương trình

Module chuyển đổi hàng hóa theo nghiệp vụ dịch vụ, không chỉ là move thông thường. Ảnh hưởng trực tiếp đến tồn kho (2 InventTrans consume + produce), owner tracking và billing.

## 13.3 Input / Output

**Input:** VAS request/work order; bulk stock nguồn; packaging material; yield/BOM; work execution data.
**Output:** VAS work order; InventTrans VAS_CONSUME/VAS_PRODUCE; bulk giảm/bagged tăng; billing event.

## 13.4 Các case điển hình

- Đóng bao nhiều session (multi-session) [CONFIRMED]
- Thiếu packaging material → không confirm WO
- Packaging thuộc TVL (bill cả labor + material) vs thuộc khách (bill labor only) [CONFIRMED]
- VAS hoàn tất → sinh hàng bao mới vào tồn
- **DPM special case:** hàng bao xuất → kho trừ theo actual weight; báo cáo theo bag_count × nominal_weight

## 13.5 Sub-modules

### 13.5.1 VAS / Bagging Work Order Management
**Mô tả:** Tạo và quản lý lệnh gia công. States: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED | CANCELLED.
**Validate confirm:** tồn bulk đủ cho WO; thiếu → FAIL [CONFIRMED].

### 13.5.2 Bulk Consumption & Finished Goods Output
**Mô tả:** Ghi nhận tiêu hao và sinh hàng đích qua Module 3.
**3 InventTrans khi WO COMPLETED [CONFIRMED]:**
— VAS_CONSUME: −bulk_qty_kg
— VAS_PRODUCE: +bagged_qty_kg
— VAS_CONSUME: −packaging_qty nếu TVL_OWNED
**Case:** hao hụt trong giới hạn, output thấp hơn kế hoạch, reverse correction.

### 13.5.3 Packaging Material Ownership
**Mô tả:** TVL_OWNED → BOM trừ từ TVL inventory, bill labor + material. CLIENT_OWNED → trừ từ client inventory, bill labor only [CONFIRMED].

### 13.5.4 VAS Progress Tracking
**Mô tả:** Theo dõi tiến độ, năng suất và kết quả theo ca/session.
**Case:** multi-session, tạm dừng, overtime session.

### 13.5.5 VAS Billing Event Capture
**Mô tả:** Sinh billing event sau WO COMPLETED: labor fee (tiered pricing), material fee nếu applicable.
**Tier pricing:** 0–1.000MT → 111K/MT; 1.001–5.000MT → 105K/MT; >5.000MT → 100K/MT [TO-CONFIRM: reset theo tháng hay cumulative].

### 13.5.6 VAS Exception Handling
**Mô tả:** Xử lý các tình huống phát sinh trong quá trình thực hiện VAS — không để exception làm treo WO hoặc tạo inconsistency với tồn kho.
**Input:** shortage, damage, yield variance, cancel request.
**Output:** exception result, follow-up action, audit trail.
**Case:** thiếu bulk nguồn (chặn confirm WO); thiếu bao bì trước khi start; output thực tế không đạt yield chuẩn (cần reason code); hủy WO khi đang chạy (partial consume đã ghi → phải reverse); rework theo rule.

---

# 14. MODULE 10 — BILLING & COMMERCIAL CONTROL

## 14.1 Mục tiêu module

Biến dữ liệu vận hành thành doanh thu có thể kiểm soát: rate card, capture billing events, storage snapshot, Debit Note, lock và ERP push.

## 14.2 Vai trò trong toàn chương trình

Chuyển hóa "warehouse operations" thành "commercial outcome". Chỉ đúng khi dữ liệu InventTrans và snapshot bên dưới đúng.

## 14.3 Input / Output

**Input:** owner contract/rate card; billing events từ M4/M5/M9; daily storage snapshot; lock/approval rules.
**Output:** billing events đã capture; storage snapshot; Debit Note DRAFT → LOCKED; ERP-ready payload.

## 14.4 Các case điển hình

- Handling fee từ inbound/outbound event
- Storage fee từ snapshot cuối ngày (23:59 [TO-CONFIRM])
- Bagging fee từ VAS completed
- Debit Note LOCKED theo kỳ → ERP push
- Event không bill được do thiếu rate card

## 14.5 Sub-modules

### 14.5.1 Rate Card & Contract Setup
**Mô tả:** Quy tắc tính phí theo owner/service/điều kiện thương mại. Max 1 active contract per owner per date range [CONFIRMED].
**Free days:** tính từ ngày putaway đầu tiên per lot [CONFIRMED].
**Case:** rate theo tấn/ngày/lượt/vật tư; contract overlap warning; DEFAULT contract cho owner chưa có.

### 14.5.2 Billing Event Capture
**Mô tả:** Bắt các events đủ điều kiện tính phí từ M4/M5/M9.
**Handling fee:** inbound = net_weight × rate × day_type_factor. Outbound = shipped_qty × rate × day_type_factor [CONFIRMED].
**Day type rates [CONFIRMED]:** WORKING_DAY 100%, DAY_OFF 150%, HOLIDAY 200% (OT: 130%/200%/300%).
**Case:** event hợp lệ, thiếu mapping, duplicate event prevention.

### 14.5.3 Daily Storage Snapshot
**Mô tả:** Chụp OnHand cuối ngày để tính phí lưu kho. Immutable sau khi tạo [CONFIRMED].
**Formula:** Daily = (Opening + Inbound Today) × rate/MT/day. **Không trừ outbound trong ngày** [CONFIRMED].
**Cut-off time:** 23:59 Vietnam timezone (UTC+7) [TO-CONFIRM: có configurable per warehouse không].
**Chỉ tính location có is_billing_location = TRUE** [CONFIRMED].

### 14.5.4 Charge Calculation Engine
**Mô tả:** Tính phí từ billing events và storage snapshot theo rate card đang hiệu lực tại thời điểm event.
**Input:** billing event đã capture, storage snapshot, rate card, charge basis (per ton / per day / per service).
**Output:** charge lines với calculation trace đầy đủ.
**Case:** fee theo tấn (handling inbound/outbound); fee theo ngày (storage); fee theo dịch vụ (bagging/stuffing); effective date change trong kỳ; overtime/holiday multiplier (150%/200%) [CONFIRMED].

### 14.5.5 Debit Note Generation
**Mô tả:** Tổng hợp charge lines thành chứng từ thương mại. States: DRAFT → REVIEWED → APPROVED → LOCKED [CONFIRMED].
**[PHASE 2]** Credit Note workflow.

### 14.5.6 Debit Note Lock & Commercial Freeze
**Mô tả:** Lock Debit Note = immutable. Sau lock → push ERP.
**[TO-CONFIRM] Workaround** nếu phát hiện sai billing sau lock trước khi có Credit Note.

### 14.5.7 Billing Exception & Reconciliation
**Mô tả:** Xử lý event không bill được hoặc lệch ops vs commercial.
**Case:** thiếu rate card, event orphan, quantity mismatch, duplicate event.

---

# 15. MODULE 11 — REPORTING, AUDIT & GO-LIVE CONTROL

## 15.1 Mục tiêu module

Cung cấp khả năng nhìn hệ thống theo góc vận hành, kiểm soát và quản trị: dashboard, báo cáo, audit, reconciliation và readiness control.

## 15.2 Vai trò trong toàn chương trình

Giúp TVL không chỉ "chạy được" mà còn "tin được". Trả lời câu hỏi hệ thống có đáng tin để go-live, đối soát khách hàng và mở rộng tiếp hay không.

## 15.3 Input / Output

**Input:** InventTrans; OnHand; Receipt/Shipment histories; Work logs; Billing events/Debit Notes/Snapshots; Audit logs.
**Output:** Operational dashboards; inventory and movement reports; billing reports; audit/traceability; reconciliation packs.

## 15.4 Các case điển hình

- Theo dõi inbound/outbound throughput
- Tồn kho theo owner/location/status/aging
- Shrinkage report per owner (khi SKU fully shipped)
- Audit manual weight/adjustment/override
- Reconciliation: ledger vs OnHand vs billing

## 15.5 Sub-modules

### 15.5.1 Operational Dashboard
**Output:** throughput, pending work, queue status, exceptions, capacity utilization (warning 85%, full 100%) [CONFIRMED].

### 15.5.2 Inventory Reports
**Output:** stock by owner/location/status, movement history, aging.
**Export:** Excel. Filters: date range, owner, product, warehouse, status.

### 15.5.3 Billing & Revenue Reports
**Output:** revenue by owner/service, unbilled events, locked Debit Notes.

### 15.5.4 Audit & Traceability
**Output:** user action history, exception history, end-to-end trace chain.
**Case:** manual weight, adjustment, override outbound, cancel receipt, reverse shipment.

### 15.5.5 Reconciliation & Go-Live Control
**Mô tả:** Đối soát giữa các lớp dữ liệu. Không auto-fix — chỉ log + alert [CONFIRMED].
**Output:** reconciliation report, issue register, readiness checklist.
**Case:** OnHand không khớp ledger; billing không khớp event; ERP push treo; open items trước UAT/go-live.

---

# 16. [PHASE 2] PARKING LOT — FUTURE SCOPE

> Các module dưới đây **nằm ngoài go-live hiện tại**. Phải chừa chỗ trong kiến trúc nhưng không implement. Bất kỳ yêu cầu nào thuộc nhóm này phát sinh trong quá trình build phải đi qua Change Control trước khi xem xét.

## 16.1 LPN / Pallet Tracking
Theo dõi hàng theo pallet/license plate number. Input: LPN, packing structure. Case: putaway/pick theo pallet, scan LPN.

## 16.2 Batch / Lot Tracking
Theo dõi theo lô/hạn dùng. Bật Batch dimension trong InventDim. Case: FEFO, recall, batch-specific traceability.

## 16.3 FEFO Allocation
Phụ thuộc vào Batch/Lot tracking. Thay sort FIFO (lot_date ASC) bằng sort theo expiry_date ASC.

## 16.4 Credit Note Workflow
Điều chỉnh tài chính sau Debit Note LOCKED. Input: reference debit note, reason, adjustment amount.

## 16.5 Full ERP Two-Way Integration
Đồng bộ sâu hai chiều. Hiện tại chỉ one-way push Locked Debit Note [CONFIRMED].

## 16.6 Multi-Currency Billing
Tính phí đa tiền tệ. Hiện tại chỉ VND [CONFIRMED].

## 16.7 ALPR / Camera Automation
Nhận dạng biển số xe tự động tại weighbridge. Go-live: nhập tay biển số [CONFIRMED].

## 16.8 Cross-Dock / Advanced Allocation
Điều phối hàng không qua lưu kho chuẩn hoặc allocation rule engine nâng cao.

---

# 17. Ma trận phụ thuộc giữa các module

| Module | Phụ thuộc chính | Vì sao |
|---|---|---|
| 1. Foundation & Governance | Không | Nền kiểm soát cho toàn hệ thống |
| 2. Master Data | M1 | Cần quyền, sequence, baseline rule |
| 3. Inventory Core Engine | M1 + M2 | Cần dim/status/rule chuẩn để post |
| 4. Inbound Operations | M3 + M7 + M8 | Post tồn qua M3; Putaway work qua M7; weight data qua M8 |
| 5. Outbound Operations | M3 + M7 + M8 | Availability qua M3; Pick work qua M7; weighing qua M8 |
| 6. Inventory Control | M3 + M7 | Mọi thay đổi tồn qua M3; physical tasks qua M7 |
| 7. Work Execution & Mobile | M1 + M2 + M3 | Cần permission, object ref, posting engine |
| 8. Weighbridge/OCR/Integration | M1 + M2 | Cần traceability, object mapping, retry policy |
| 9. VAS / Bagging | M3 + M7 + M10 | Ảnh hưởng tồn (M3), cần work (M7), sinh billing event (M10) |
| 10. Billing & Commercial | M3 + M4 + M5 + M9 | Phải có transaction truth + snapshot đúng |
| 11. Reporting/Audit/Go-Live | Tất cả | Tổng hợp và đối soát xuyên hệ thống |

---

# 18. Checklist sử dụng tài liệu đúng cách

## 18.1 Với BA / PM
- Bóc backlog theo module và sub-module. Mỗi sub-module = 1–N user stories.
- Với mỗi sub-module, viết tiếp FS chi tiết cho phần go-live.
- Gắn rõ [TO-CONFIRM] nào phải chốt trước build, trước UAT, trước go-live.
- Mọi yêu cầu mới từ stakeholder → xác định thuộc module/sub-module nào → Change Control nếu ngoài scope.

## 18.2 Với Tech Lead / Dev
- Không code transaction logic rải rác trong từng màn hình. Gom vào Module 3 (Inventory Core Engine).
- Xác định rõ object ownership trước khi thiết kế API và DB schema.
- Không để UI/API cập nhật OnHand trực tiếp.
- WorkLine COMPLETED phải có inventory posting event tương ứng và truy vết được về InventTrans.

## 18.3 Với QA
- Viết test theo object + state machine + posting point.
- Luôn có test cho: happy path, business exception, operational exception, technical exception.
- Đối soát transaction result với OnHand và billing event.
- Các [TO-CONFIRM] item chưa chốt → không viết test cho đến khi có quyết định.

## 18.4 Với Stakeholder nghiệp vụ
- Mỗi module = một năng lực vận hành, không phải một menu đơn lẻ.
- [PHASE 2] Parking Lot = không làm trong go-live này, không phải "làm sau trong sprint này".
- Mọi open items [TO-CONFIRM] cần được trả lời trước khi team bắt đầu build module liên quan.

## 18.5 Checklist bóc tiếp từng module

Khi chi tiết hóa bất kỳ module nào thành Functional Spec / API Contract / ERD, trả lời đủ 10 câu hỏi sau trước khi viết:

1. Object chính của module là gì?
2. State machine của object là gì?
3. Posting point / control point ở đâu?
4. API nào là command (có side effect), API nào là query (read-only)?
5. Validation rule nào là hard rule (không override được), rule nào có thể override?
6. Ngoại lệ nào cần approval? Ai có quyền approve?
7. Reason code nào bắt buộc? Gắn với action nào?
8. Audit trail cần ghi tới mức nào? (user, timestamp, before/after value?)
9. Test case: happy path / alternate path / exception / edge case gồm những gì?
10. Báo cáo và reconciliation cần lấy dữ liệu từ đâu? Đối soát với layer nào?

---

# 19. Kết luận

Hệ thống SWM của TVL phải được hiểu như một chuỗi module có quan hệ nhân quả rõ ràng:

**Foundation → Master Data → Inventory Core → Inbound / Outbound / Inventory Control / VAS → Billing → Reporting/Audit**

Nếu team đọc và vận hành tài liệu này đúng cách, từng module sẽ không còn là "chức năng lẻ" mà là một mắt xích trong chuỗi:

**receipt → on-hand → shipment → billing → audit**

Mọi thứ truy vết được. Mọi thứ có nguồn gốc. Mọi số liệu đáng tin.
