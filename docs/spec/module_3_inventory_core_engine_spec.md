# TVL SWM — Module Specification
# Module 3: Inventory Core Engine

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Product Owner + Business Analyst  
**Phiên bản:** 1.0  
**Ngày:** 08/03/2026  
**Trạng thái:** Draft for Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Billing Lead, Key User  

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Inventory Core Engine** của hệ thống SWM. Đây là module lõi để toàn hệ thống biết **tồn kho được ghi nhận như thế nào, tách biệt theo chiều nào, cập nhật ra sao, truy vết bằng gì và đối soát theo nguyên tắc nào**.

Nếu Module 1 giúp hệ thống biết **ai được làm gì và theo luật nào**, còn Module 2 giúp hệ thống biết **đang quản lý cái gì**, thì Module 3 giúp hệ thống biết **mọi biến động tồn kho được post vào đâu, đi qua cơ chế nào, và trạng thái tồn hiện tại được tính từ sự thật giao dịch nào**.

Tài liệu được viết theo hướng:
- Người business hiểu vì sao chứng từ không phải nguồn sự thật cuối cùng của tồn kho.
- Dev/QA có thể bóc tiếp FS, API contract, DB design, posting engine, reversal logic, reconciliation logic và test scenario.
- Team dự án có baseline rõ giữa **document layer**, **work execution layer** và **inventory transaction layer**.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Inventory Core Engine là Module 3**.

Đây là module không trực tiếp đại diện cho một menu nghiệp vụ đơn lẻ, nhưng lại là lõi kỹ thuật-nghiệp vụ mà hầu hết module khác đều phải đi qua:
- M4 Inbound phải gọi M3 để post tồn khi Receipt đạt `RECEIVED`.
- M5 Outbound phải gọi M3 để trừ tồn khi Shipment đạt `SHIPPED`.
- M6 Inventory Control phải gọi M3 để move, transfer, status change, adjustment và count reconciliation.
- M7 Work Execution phải gọi M3 khi WorkLine hoàn tất để tạo biến động tồn tương ứng.
- M9 VAS / Bagging phải gọi M3 để consume bulk, produce bagged goods và xử lý packaging impacts.
- M10 Billing phụ thuộc trực tiếp vào transaction truth và daily snapshot phát sinh từ M3.
- M11 Reporting/Audit cần M3 làm nguồn dữ liệu đối soát và truy vết.

Nói ngắn gọn, Module 3 là **transaction truth engine** của toàn hệ thống.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho bulk cargo và bagged goods trong bối cảnh:
- Không dùng barcode/RFID làm trục chính để nhận dạng từng đơn vị hàng hóa.
- Weighbridge là nguồn xác nhận khối lượng thực tế cho luồng nhập và xuất bulk cargo.
- Cùng một mặt hàng nhưng khác owner phải được tách tồn kho độc lập.
- Outbound có allocation/hold nhưng chưa được xem là đã trừ tồn vật lý.
- Billing cần dựa trên biến động tồn đã được chuẩn hóa và snapshot cuối ngày, không thể dựa vào suy luận từ chứng từ.
- Môi trường vận hành có nhiều loại biến động: inbound, outbound, putaway, move, status change, adjustment, cycle count, bagging.

Trong môi trường như vậy, nếu không có một inventory engine thống nhất:
- mỗi module có thể tự cập nhật tồn kho theo cách riêng,
- số lượng tồn và ledger có thể lệch nhau,
- cùng một sự kiện có thể bị post trùng khi retry API/mobile/weighbridge,
- correction có thể bị làm bằng cách sửa tay dữ liệu đã post,
- billing và reporting sẽ không còn điểm tựa sự thật duy nhất.

---

## 4. Mục tiêu của module

### 4.1 Mục tiêu nghiệp vụ

- Biến mọi biến động tồn kho thành transaction có thể truy vết, không phụ thuộc vào màn hình hay chứng từ nào phát sinh trước đó.
- Tách biệt tồn kho theo đúng inventory dimensions đã chốt cho Phase 1.
- Bảo đảm outbound allocation không làm giảm tồn vật lý trước thời điểm ship thực tế.
- Bảo đảm mọi correction sau khi post phải đi qua reverse, không xóa hay sửa ledger cũ.
- Tạo nền đúng để billing, audit, reporting và reconciliation bám vào cùng một transaction truth.

### 4.2 Mục tiêu hệ thống

- Mọi thay đổi tồn kho phải đi qua `InventTrans`, không update trực tiếp `OnHand` từ document/UI.
- `OnHand(item, dim)` phải là kết quả có thể đối soát từ `InventTrans`.
- `InventDim` phải chuẩn hóa dimension key để tránh duplicate logic dimension ở nhiều module.
- Mọi command có side effect phải có `external_id` để chống duplicate posting.
- Mọi reversal phải tạo transaction ngược chiều thay vì update/delete transaction đã có.
- Mọi posting point phải rõ ràng theo state machine đã chốt.

---

## 5. Phạm vi của module

### 5.1 In Scope — Phase 1

- Runtime records cho `invent_dim`, `invent_trans`, `on_hand`
- Posting engine dùng chung cho inbound, outbound, move, transfer, status change, adjustment, cycle count, VAS
- Reversal logic và immutable ledger policy
- Idempotency check cho inventory command APIs
- On-hand query service và availability calculation baseline
- Reconciliation rules giữa `InventTrans` và `OnHand`
- Daily storage snapshot làm đầu vào cho billing/reporting
- Audit fields và traceability fields cho inventory layer
- Event mapping từ business event sang inventory transaction

### 5.2 Out of Scope / Phase 2

- Batch/Lot dimension
- Serial dimension
- LPN/palletized inventory engine
- FEFO/expiry-driven inventory selection
- Advanced cost layer / valuation engine
- Multi-company shared inventory ledger
- Real-time event streaming analytics ngoài phạm vi operational ledger

---

## 6. Nguyên tắc thiết kế bắt buộc của module

1. **Chứng từ không phải nguồn sự thật cuối cùng của tồn kho.**  
   Nguồn sự thật của tồn kho là bộ ba **InventDim → InventTrans → OnHand**.

2. **Inbound chỉ post tồn khi Receipt đạt `RECEIVED`.** `[CONFIRMED]`  
   Các state trước đó chỉ là trạng thái vận hành.

3. **Outbound chỉ trừ tồn khi Shipment đạt `SHIPPED`.** `[CONFIRMED]`  
   Allocation/picking chỉ ảnh hưởng reserved/hold logic, chưa giảm physical.

4. **Không cập nhật OnHand trực tiếp từ chứng từ, màn hình hay mobile.**  
   Mọi thay đổi phải đi qua posting engine của M3.

5. **Không chỉnh sửa trực tiếp ledger đã post.** `[CONFIRMED]`  
   Correction = reverse bằng trans mới ngược chiều.

6. **Idempotency là yêu cầu bắt buộc.** `[CONFIRMED]`  
   Cùng `external_id` + cùng action context thì trả kết quả cũ, không tạo trans mới.

7. **Owner là dimension bắt buộc trong Phase 1.** `[CONFIRMED]`  
   Cùng item nhưng khác owner phải là tồn kho khác nhau.

8. **Inventory dimensions Phase 1 chỉ gồm:** `Site + Warehouse + Location + Owner + Status`. `[CONFIRMED]`

9. **Chỉ `AVAILABLE` mới được allocate cho outbound.** `[CONFIRMED]`

10. **Mọi trans phải truy vết được về object nguồn.**  
    Mỗi `InventTrans` phải có `ref_type + ref_id + ref_line_id`.

---

## 7. Kết quả đầu ra chính của module

Khi Module 3 được triển khai đầy đủ, hệ thống phải có tối thiểu các output sau:

1. `invent_dim` runtime table để chuẩn hóa dimension combination.
2. `invent_trans` ledger ghi nhận mọi biến động tồn kho.
3. `on_hand` current stock table dùng cho query vận hành.
4. Posting engine dùng chung cho tất cả posting points hợp lệ.
5. Reverse engine cho correction sau post.
6. Idempotency registry/check cho inventory-side command APIs.
7. Availability/hold calculation baseline cho outbound allocation.
8. Reconciliation service/report giữa ledger và on-hand.
9. Daily storage snapshot cho billing và báo cáo tồn.
10. Query API/service để downstream modules lấy tồn theo item/owner/location/status.
11. Audit-ready transaction trail để điều tra tranh chấp hoặc sai lệch.

---

## 8. Input và Output tổng thể của module

### 8.1 Input tổng thể

| Nhóm input | Nội dung |
|---|---|
| Master baseline | item, warehouse, location, owner, inventory_status, number sequence |
| Business events | receipt received, shipment shipped, work completed, adjustment approved, count posted, status change, VAS completed |
| Governance baseline | permission, reason code, audit policy, idempotency policy |
| Document references | PO/Receipt/Shipment/Transfer/VAS/Adjustment/Cycle Count |
| Runtime context | external_id, correlation_id, posted_by, source_app, warehouse scope |
| Inventory rule baseline | posting point, dimension rule, reversal rule, availability rule |

### 8.2 Output tổng thể

| Nhóm output | Nội dung |
|---|---|
| Dimension runtime | invent_dim record đã chuẩn hóa theo Phase 1 dimensions |
| Transaction ledger | invent_trans record cho từng biến động |
| Current stock | on_hand balance theo item + dim |
| Availability view | physical, reserved/hold, available |
| Reverse trail | trans đối ứng cho correction/reversal |
| Snapshot output | daily storage snapshot cho billing/report |
| Reconciliation output | chênh lệch giữa on_hand và ledger nếu có |
| Traceability output | link từ transaction về object nguồn và audit context |

---

## 9. Các đối tượng dữ liệu mà module quản lý

Module này sở hữu hoặc quản lý trực tiếp các object sau:

- `invent_dim`
- `invent_trans`
- `on_hand`
- `inventory_posting_request` hoặc command model tương đương
- `inventory_reversal_link`
- `daily_storage_snapshot`
- `inventory_reconciliation_result`
- `inventory_event_mapping`
- `idempotency_key` ở phạm vi inventory commands hoặc shared service mapping

Ngoài ra module này nhận tham chiếu từ:
- `item`, `owner`, `warehouse`, `location`, `inventory_status` của M2
- `receipt`, `shipment`, `transfer`, `adjustment`, `cycle_count`, `work_header`, `work_line`, `vas_work_order` từ các module nghiệp vụ khác

---

## 10. Danh sách sub-modules

Module Inventory Core Engine được chia thành 8 sub-modules:

1. Inventory Dimension Engine (`InventDim`)
2. Inventory Transaction Ledger (`InventTrans`)
3. On-Hand Balance Engine (`OnHand`)
4. Posting Engine & Event Mapping
5. Reversal & Correction Control
6. Availability, Hold & Query Service
7. Reconciliation & Daily Snapshot
8. Inventory Auditability, Idempotency & Technical Safeguards

---

## 11. Sub-module 1 — Inventory Dimension Engine (`InventDim`)

### 11.1 Mục đích

Chuẩn hóa dimension combination để toàn hệ thống tham chiếu cùng một dimension key khi ghi nhận tồn kho.

### 11.2 Mô tả nghiệp vụ

Nếu M2 quản lý master values như owner, warehouse, location, status, thì M3 phải biến các giá trị đó thành một dimension key dùng lại được. Điều này giúp mọi transaction cùng logic dimension không bị tách thành nhiều bản ghi rời rạc chỉ vì mỗi module tự ghép khóa theo cách riêng.

### 11.3 Input

| Input | Mô tả |
|---|---|
| site_id | site theo baseline Phase 1 |
| warehouse_id | kho thao tác |
| location_id | vị trí cụ thể |
| owner_id | chủ hàng |
| inventory_status | AVAILABLE / DAMAGED / BLOCKED / IN_TRANSIT |

### 11.4 Output

| Output | Mô tả |
|---|---|
| dim_id | khóa dimension duy nhất |
| normalized dimension record | bản ghi dimension chuẩn hóa |
| reusable reference | khóa tham chiếu dùng cho OnHand và InventTrans |

### 11.5 Cases điển hình

#### Case 1 — Tạo dimension mới cho inbound receipt
- **Input:** item A, WH5.1, location RECEIVING-01, owner CUST001, status AVAILABLE
- **Output:** tạo `dim_id` mới nếu combination chưa tồn tại

#### Case 2 — Dùng lại dimension đã có cho outbound
- **Input:** cùng combination đã tồn tại
- **Output:** không tạo dimension trùng, dùng lại `dim_id` cũ

#### Case 3 — Thay đổi status từ AVAILABLE sang DAMAGED
- **Input:** cùng item/kho/vị trí/owner nhưng status mới = DAMAGED
- **Output:** tạo hoặc dùng lại `dim_id` khác tương ứng status mới

### 11.6 Quy tắc bắt buộc

- Dimension Phase 1 chỉ dùng `Site + Warehouse + Location + Owner + Status`.
- Batch/Lot/Serial không được chen vào go-live Phase 1.
- Một combination dimension chỉ có **một** `dim_id` duy nhất.
- `location_id` phải thuộc đúng `warehouse_id`.
- `inventory_status` phải thuộc tập 4 status go-live đã chốt.

### 11.7 Cơ chế `dim_hash` và dimension deduplication

Để tránh duplicate dimension records và tăng tốc lookup khi posting, Module 3 sử dụng cơ chế `dim_hash` cho `InventDim`.

**Nguyên tắc chuẩn hóa đề xuất cho Phase 1:**
- `dim_hash = SHA-256(site_id|warehouse_id|location_id|owner_id|inventory_status)`
- Giá trị đầu vào phải được normalize trước khi hash: trim, uppercase khi applicable, null handling thống nhất.
- Trước mỗi posting, engine phải lookup theo `dim_hash`.
- Nếu đã tồn tại record cùng `dim_hash` thì reuse `dim_id` hiện hữu.
- Nếu chưa tồn tại thì tạo mới `InventDim` record và persist cả `dim_hash` lẫn dimension fields.

**Yêu cầu kỹ thuật:**
- Tạo unique index trên `dim_hash`.
- Vẫn nên giữ validation logic ở field level để chống trường hợp hash đúng nhưng dimension values không hợp lệ theo master data.
- Khi mở rộng Phase 2 với Batch/Lot/Serial, công thức hash phải được version-control qua ADR/schema migration, không sửa ngầm.

**Acceptance Criteria bổ sung:**
- AC-1.4: Cùng input dimension normalized gọi nhiều lần → trả cùng `dim_id` do reuse theo `dim_hash`.
- AC-1.5: Có unique index trên `dim_hash` để ngăn duplicate record trong condition concurrent create.

---

## 12. Sub-module 2 — Inventory Transaction Ledger (`InventTrans`)

### 12.1 Mục đích

Ghi nhận mọi biến động tồn kho dưới dạng ledger bất biến, truy vết được và có thể đối soát.

### 12.2 Mô tả nghiệp vụ

`InventTrans` là nơi ghi lại “sự thật đã xảy ra” của tồn kho. Receipt, Shipment, Work hay Adjustment chỉ là ngữ cảnh nghiệp vụ; khi ảnh hưởng tồn thật, hệ thống phải chuyển thành transaction ledger. Đây là lớp không được thiết kế kiểu màn hình nào ghi kiểu đó.

### 12.3 Input

| Input | Mô tả |
|---|---|
| ref_type | loại object nguồn: PO/ASN/SO/SHIPMENT/TRANSFER/ADJUSTMENT/CYCLE_COUNT/STATUS_CHANGE/MOVE/VAS |
| ref_id | mã header nguồn |
| ref_line_id | mã line nguồn |
| item_id | mã hàng |
| qty | số lượng, dấu +/− theo chiều biến động |
| uom | đơn vị, mặc định KG cho bulk |
| dim_from_id | dimension nguồn |
| dim_to_id | dimension đích |
| status_from/status_to | trạng thái trước/sau nếu có |
| stage | EXPECTED/REGISTERED/PHYSICAL/DEDUCTED/CANCELLED theo baseline kỹ thuật |
| reason_code | bắt buộc với các flow cần reason |
| external_id | khóa idempotency |
| posted_by/posted_at | ngữ cảnh post |

### 12.4 Output

| Output | Mô tả |
|---|---|
| trans_id | mã transaction duy nhất |
| immutable ledger row | bản ghi ledger đã post |
| trace link | link tới object nguồn và audit context |

### 12.4A `InventTrans` — full schema baseline đề xuất

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| id | bigint / uuid | Yes | khóa kỹ thuật nội bộ |
| trans_id | varchar | Yes | mã transaction business-readable / unique |
| ref_type | varchar | Yes | loại object nguồn |
| ref_id | varchar | Yes | mã header nguồn |
| ref_line_id | varchar | Conditional | mã dòng nguồn nếu posting theo line |
| item_id | varchar | Yes | mã hàng |
| qty | decimal(18,3) | Yes | số lượng biến động, có dấu +/- |
| uom | varchar | Yes | đơn vị tính |
| dim_from_id | bigint / uuid | Conditional | dimension nguồn |
| dim_to_id | bigint / uuid | Conditional | dimension đích |
| status_from | varchar | Conditional | trạng thái trước |
| status_to | varchar | Conditional | trạng thái sau |
| stage | varchar | Yes | lifecycle stage của inventory transaction |
| trans_type | varchar | Yes | INBOUND / OUTBOUND / MOVE / ADJUSTMENT / VAS_CONSUME / VAS_PRODUCE / CYCLE_COUNT_ADJUST |
| reason_code | varchar | Conditional | bắt buộc với flow cần lý do |
| external_id | varchar | Yes | khóa idempotency |
| correlation_id | varchar | Yes | trace xuyên service/log |
| posted_by | varchar | Yes | user/service đã post |
| posted_at | datetime | Yes | thời điểm post bất biến |
| source_app | varchar | Yes | web / mobile / weighbridge / integration |
| is_reversed | boolean | Yes | cờ đã bị reverse hay chưa |
| reversed_by_trans_id | varchar | Conditional | trans đảo chiều tham chiếu về trans hiện tại |
| created_at | datetime | Yes | thời điểm tạo record |
| created_by | varchar | Yes | actor tạo record |

**Ghi chú thiết kế:**
- `posted_at` và `created_at` là immutable.
- `trans_id` phải unique.
- `external_id` cần unique theo action context phù hợp để bảo đảm idempotency.
- `trans_type` là field bắt buộc để Dev/QA phân loại transaction rõ ràng, không suy luận từ dấu qty.

### 12.5 Cases điển hình

#### Case 1 — Inbound post tại RECEIVED
- **Input:** Receipt đạt `RECEIVED`, net_weight = 30,300 kg
- **Output:** tạo 1 `InventTrans` inbound qty `+30,300`

#### Case 2 — Outbound post tại SHIPPED
- **Input:** Shipment line ship 25,000 kg từ location STORAGE-A1
- **Output:** tạo 1 `InventTrans` outbound qty `-25,000`

#### Case 3 — Putaway move
- **Input:** WorkLine PUTAWAY complete từ RECEIVING-01 sang STORAGE-A1
- **Output:** tạo cặp movement logic theo dim_from → dim_to

### 12.6 Quy tắc bắt buộc

- Không được xóa `InventTrans` đã post.
- Mỗi trans phải có `ref_type + ref_id` và ưu tiên có `ref_line_id` khi posting theo line.
- `posted_at` là immutable sau post.
- `external_id` phải được check trước khi insert để chống duplicate.
- Adjustment bắt buộc có `reason_code`.
- Posting granularity Phase 1 phải bám per-line ở các document có line-level posting.

---

## 13. Sub-module 3 — On-Hand Balance Engine (`OnHand`)

### 13.1 Mục đích

Cung cấp số dư tồn hiện tại theo item + dimension để downstream modules có thể query nhanh và nhất quán.

### 13.2 Mô tả nghiệp vụ

`OnHand` không phải là nguồn sự thật độc lập, mà là current balance được xây trên nền ledger. Mục tiêu của `OnHand` là phục vụ truy vấn vận hành nhanh, trong khi vẫn phải đối soát được ngược về `InventTrans`.

### 13.3 Input

| Input | Mô tả |
|---|---|
| item_id | mã hàng |
| dim_id | dimension key |
| posted trans | các trans đã hợp lệ |
| hold/reserved context | allocation-based hold cho outbound |

### 13.4 Output

| Output | Mô tả |
|---|---|
| physical_qty | tồn vật lý hiện tại |
| reserved_qty / hold_qty | lượng đã giữ cho outbound allocation |
| available_qty | lượng còn có thể allocate |
| last_posted_at | lần cập nhật gần nhất |

### 13.5 Cases điển hình

#### Case 1 — Inbound làm tăng physical
- **Input:** inbound post +30,300 kg vào dim RECEIVING
- **Output:** `physical_qty` tăng thêm 30,300

#### Case 2 — Allocation làm tăng hold nhưng không giảm physical
- **Input:** shipment allocate 10,000 kg
- **Output:** `reserved_qty` tăng 10,000; `physical_qty` giữ nguyên

#### Case 3 — Shipment SHIPPED làm giảm physical
- **Input:** outbound post -10,000 kg
- **Output:** `physical_qty` giảm 10,000; reserved/hold được release theo flow phù hợp

### 13.6 Quy tắc bắt buộc

- `available_qty = physical_qty - reserved_qty` theo baseline Phase 1.
- Không có API nào được update `OnHand` trực tiếp mà không qua posting engine/hold engine.
- `OnHand(item, dim)` phải reconcile được với `InventTrans`.
- Owner khác nhau không được cộng gộp thành cùng một on-hand record.
- Chỉ tồn ở `AVAILABLE` mới được xem là eligible cho allocation.

---

## 14. Sub-module 4 — Posting Engine & Event Mapping

### 14.1 Mục đích

Chuẩn hóa cách mọi business event được chuyển thành inventory posting đúng loại, đúng chiều, đúng dimension và đúng posting point.

### 14.2 Mô tả nghiệp vụ

Inventory engine không tự phát sinh business event. Nó nhận event hợp lệ từ các module nghiệp vụ và quyết định cách biến event đó thành trans. Ranh giới rất quan trọng: rule nghiệp vụ nằm ở module gọi, còn M3 chịu trách nhiệm tính đúng đắn của posting ở mức inventory.

### 14.3 Input

| Input | Mô tả |
|---|---|
| business_event_type | inbound_received / shipment_shipped / work_completed / adjustment_posted... |
| source_object | receipt, shipment, work_line, transfer, adjustment, cycle_count, VAS WO |
| posting_context | item, qty, dim_from, dim_to, reason, status change, warehouse scope |
| external_id | khóa idempotency |

### 14.4 Output

| Output | Mô tả |
|---|---|
| posting result | success/fail + trans_id |
| on-hand update result | cập nhật current balance |
| trace result | correlation đến object nguồn |

### 14.5 Posting points baseline

| Posting Point | Trigger | Module gọi | InventTrans loại | OnHand impact |
|---|---|---|---|---|
| PP-1 Inbound | Receipt → `RECEIVED` | M4 | INBOUND | +qty vào dim receiving |
| PP-2 Putaway Move | WorkLine PUTAWAY → `COMPLETED` | M7 | MOVE | -receiving / +storage |
| PP-3 Outbound | Shipment → `SHIPPED` | M5 | OUTBOUND | -qty storage |
| PP-4 VAS | VAS WO → `COMPLETED` | M9 | VAS_CONSUME / VAS_PRODUCE | -bulk / +bagged |
| PP-5 Move / Transfer | Move complete / Transfer received | M6/M7 | MOVE | dim_from / dim_to pair |
| PP-6 Adjustment / Count | Adjustment post / Count reconciliation | M6 | ADJUSTMENT | +/- theo chênh lệch |

### 14.6 Quy tắc bắt buộc

- Chỉ event nằm trong posting point map mới được phép tạo `InventTrans`.
- UI không được gọi trực tiếp DB để tạo trans ngoài posting engine.
- Event thiếu dimension hoặc master reference bắt buộc → reject.
- Mọi posting phải trả được `trans_id` hoặc lý do reject rõ ràng.
- Một event retry với cùng `external_id` không được tạo trans mới.

---

## 15. Sub-module 5 — Reversal & Correction Control

### 15.1 Mục đích

Cho phép sửa sai sau khi post nhưng vẫn giữ tính bất biến và khả năng truy vết của ledger.

### 15.2 Mô tả nghiệp vụ

Trong vận hành thực tế sẽ có sai sót: cân nhầm, post nhầm line, chọn sai location, adjustment nhập sai số lượng. Tuy nhiên, hệ thống không được sửa trực tiếp transaction gốc. Cách duy nhất là tạo giao dịch đối ứng để đảo chiều, sau đó nếu cần thì post lại giao dịch đúng.

### 15.3 Input

| Input | Mô tả |
|---|---|
| original_trans_id | trans cần đảo |
| reverse_reason_code | lý do reverse |
| reversed_by | người thực hiện |
| reverse_context | tham chiếu đến object correction nếu có |

### 15.4 Output

| Output | Mô tả |
|---|---|
| reversal_trans_id | trans đảo chiều |
| reversal_link | liên kết trans gốc ↔ trans reverse |
| corrected balance | on-hand sau reverse |

### 15.5 Cases điển hình

#### Case 1 — Reverse outbound post sai số lượng
- **Input:** trans outbound -12,000 kg nhưng thực tế chỉ ship 10,000 kg
- **Output:** reverse +12,000 kg, sau đó post mới -10,000 kg

#### Case 2 — Reverse move vào nhầm location
- **Input:** move từ RECEIVING-01 sang STORAGE-A2 nhưng lẽ ra là STORAGE-A1
- **Output:** reverse move cũ rồi post move mới đúng dim_to

### 15.6 Quy tắc bắt buộc

- Không update/delete trans gốc.
- Reverse phải tạo qty ngược chiều đúng item và đúng dimension logic.
- Reverse bắt buộc có `reason_code` và audit trail.
- Nếu trans gốc đã được downstream dùng cho billing snapshot/report, reversal vẫn phải giữ trace link đầy đủ.
- Không cho reverse lặp vô hạn mà không có kiểm soát quyền và audit.

---

## 16. Sub-module 6 — Availability, Hold & Query Service

### 16.1 Mục đích

Cung cấp khả năng đọc tồn kho đúng nghĩa vận hành: cái gì đang có thật, cái gì đang bị giữ, cái gì còn allocate được.

### 16.2 Mô tả nghiệp vụ

TVL không dùng reservation truyền thống kiểu D365 đầy đủ ở Phase 1, nhưng vẫn cần allocation-based hold để tránh over-commit. Vì vậy M3 phải phân biệt rõ physical với available và expose query service đủ tin cậy cho M5/M6/M11.

### 16.3 Input

| Input | Mô tả |
|---|---|
| on_hand balance | tồn vật lý hiện tại |
| allocation/hold data | lượng đã giữ cho shipment |
| filters | item, owner, warehouse, location, status |

### 16.4 Output

| Output | Mô tả |
|---|---|
| stock by dimension | tồn theo item + owner + warehouse + location + status |
| available qty | lượng còn allocate được |
| hold view | lượng đã giữ bởi shipment/work context |
| inventory history query | lịch sử biến động theo filter |

### 16.5 Quy tắc bắt buộc

- Query service phải luôn tách owner riêng.
- `DAMAGED`, `BLOCKED`, `IN_TRANSIT` không được trả là eligible stock cho outbound allocation.
- Kết quả query phải truy ngược được đến dimension và trans sources khi cần drill-down.
- CUST_VIEWER chỉ được query tồn của owner gắn với tài khoản, enforcement do M1 nhưng M3 API phải hỗ trợ data scoping đúng.

### 16.6 Concurrent allocation locking strategy

Vì allocation-based hold có rủi ro over-commit khi nhiều shipment cùng cố allocate một stock pool, Module 3 cần chốt rõ locking strategy ở inventory query/update path.

**Khuyến nghị baseline cho Phase 1:**
- Dùng **pessimistic locking** tại thời điểm confirm allocation.
- Thực hiện `SELECT ... FOR UPDATE` trên row `on_hand` hoặc stock balance rowset liên quan trước khi tính và ghi `reserved_qty` / hold record.
- Tính available trên dữ liệu đã khóa, không tính trên snapshot đọc thường.
- Sau khi allocation commit thành công, release lock ngay.
- Allocation request thất bại do không đủ available phải fail gracefully với message nghiệp vụ rõ ràng, không retry mù.

**Mục tiêu kiểm soát:**
- Không cho 2 shipment cùng allocate vượt quá available_qty.
- Không tạo reserved/hold âm hoặc inconsistent state khi concurrent requests xảy ra.
- Phần này cần được chốt thêm bằng ADR chính thức trước build M5 nếu team muốn thay bằng optimistic locking.

**Test scenario bắt buộc:**
- 2 shipment cùng allocate trên cùng 1 item-owner-location-stock pool tại cùng thời điểm → chỉ 1 giao dịch thành công nếu stock không đủ cho cả hai; giao dịch còn lại fail gracefully và không làm sai available.

---

## 17. Sub-module 7 — Reconciliation & Daily Snapshot

### 17.1 Mục đích

Đảm bảo hệ thống có cơ chế tự kiểm tra tính nhất quán giữa ledger và on-hand, đồng thời sinh snapshot phục vụ billing/reporting.

### 17.2 Mô tả nghiệp vụ

Vì billing của TVL phụ thuộc vào transaction truth và snapshot cuối ngày, M3 không chỉ post giao dịch mà còn phải tạo được đầu ra ổn định để đối soát. Đây là lớp kiểm soát giúp phát hiện lệch tồn, duplicate posting hoặc lỗi sync giữa ledger với current balance.

### 17.3 Input

| Input | Mô tả |
|---|---|
| invent_trans | ledger đã post |
| on_hand | current balance |
| cut-off datetime | thời điểm chốt ngày |
| warehouse/owner filters | phạm vi snapshot/report |

### 17.4 Output

| Output | Mô tả |
|---|---|
| reconciliation result | khớp/lệch theo item + dim |
| daily storage snapshot | tồn cuối ngày cho billing |
| exception report | danh sách chênh lệch cần xử lý |

### 17.4A `daily_storage_snapshot` — schema baseline đề xuất

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| snapshot_date | date | Yes | ngày chốt snapshot |
| warehouse_id | varchar | Yes | kho |
| location_id | varchar | Yes | vị trí |
| owner_id | varchar | Yes | chủ hàng |
| item_id | varchar | Yes | mã hàng |
| opening_qty | decimal(18,3) | Yes | tồn đầu ngày |
| inbound_today_qty | decimal(18,3) | Yes | tổng inbound trong ngày |
| outbound_today_qty | decimal(18,3) | Yes | tổng outbound trong ngày |
| closing_qty | decimal(18,3) | Yes | tồn cuối ngày |
| cut_off_time | datetime | Yes | thời điểm chốt snapshot, mặc định 23:59 local warehouse time |
| snapshot_source | varchar | Yes | nguồn sinh snapshot / batch job / service name |
| correlation_id | varchar | Conditional | mã trace khi cần điều tra |
| created_at | datetime | Yes | thời điểm tạo snapshot |

**Ghi chú nghiệp vụ cho billing:**
- Snapshot này là đầu vào trực tiếp cho M10 Billing.
- Baseline formula reference cho storage fee Phase 1: `billable_qty = opening_qty + inbound_today_qty`.
- `outbound_today_qty` vẫn phải lưu để reporting/audit nhưng không dùng để giảm `billable_qty` trong công thức storage fee baseline khi chưa có rule mới thay thế.
- Cut-off mặc định nên là 23:59 theo local time của warehouse; nếu khác phải được chốt ở M10/M11 governance.

**Yêu cầu đối soát:**
- `closing_qty` phải reconcile được từ transaction truth đến cut-off time.
- Snapshot đã chốt không được sửa tay; correction phải sinh snapshot điều chỉnh hoặc rerun theo policy đã phê duyệt.

### 17.5 Quy tắc bắt buộc

- Snapshot phải dựa trên transaction truth đã post, không suy diễn từ trạng thái chứng từ.
- Reconciliation phải kiểm được công thức `OnHand(item, dim) = SUM(InventTrans.qty by item, dim)` theo baseline.
- Nếu lệch, hệ thống phải log exception đủ để điều tra.
- Snapshot đã chốt dùng cho billing phải có cut-off rõ ràng và truy vết được nguồn.

---

## 18. Sub-module 8 — Inventory Auditability, Idempotency & Technical Safeguards

### 18.1 Mục đích

Bảo vệ inventory layer khỏi duplicate posting, sai do retry kỹ thuật, và thiếu traceability khi điều tra sự cố.

### 18.2 Mô tả nghiệp vụ

Do M3 là module lõi, sai một lần là kéo sai tất cả downstream. Vì vậy ngoài logic nghiệp vụ, module này cần cơ chế kỹ thuật chặt để chịu được retry, concurrent requests, partial failure và điều tra hậu kiểm.

### 18.3 Input

| Input | Mô tả |
|---|---|
| external_id | khóa chống duplicate |
| correlation_id | khóa trace xuyên UI/API/DB |
| source_app | web/mobile/weighbridge/integration |
| command payload | request tạo posting/reverse/query snapshot |

### 18.4 Output

| Output | Mô tả |
|---|---|
| idempotent response | trả kết quả cũ nếu retry đúng cùng request |
| technical audit | log request/posting outcome |
| exception trace | log lỗi, conflict, duplicate, rollback |

### 18.5 Quy tắc bắt buộc

- Mọi command API có side effect phải nhận `external_id`.
- Duplicate retry không được tạo `InventTrans` mới.
- Concurrency phải được xử lý transaction-safe ở sequence/trans/on-hand update path.
- Cần có correlation_id để trace từ nghiệp vụ tới ledger.
- Failure giữa bước ghi trans và cập nhật on-hand phải được xử lý atomic hoặc có cơ chế recovery rõ ràng.

---

## 19. Quan hệ dữ liệu và ownership cần giữ rõ

### 19.1 Ownership ranh giới

- M1 sở hữu quyền, audit policy, reason code, idempotency baseline.
- M2 sở hữu master definitions và dimension values.
- **M3 sở hữu runtime inventory records và posting logic.**
- M4/M5/M6/M7/M9 sở hữu business use case, state machine, trigger timing.
- M10 sở hữu billing event và debit note, nhưng phụ thuộc transaction truth từ M3.

### 19.2 Ranh giới dễ nhầm phải khóa ngay

- Receipt/Shipment **không sở hữu tồn kho**.
- Work không được tự sửa on-hand mà không qua M3.
- Inventory Control không được làm chức năng “chỉnh tay ledger”.
- Billing không được tính phí bằng cách đọc số lượng từ chứng từ nếu chưa đối chiếu với transaction truth/snapshot.

---

## 20. Business rules cốt lõi của module

| Rule ID | Business Rule | BRD / Source Reference |
|---|---|---|
| IC-BR-001 | Chỉ posting point hợp lệ mới được tạo `InventTrans`. | Inventory Transaction baseline / SystemControlMap |
| IC-BR-002 | Inbound chỉ post tại `RECEIVED`; outbound chỉ post tại `SHIPPED`. | State machine baseline / Inventory Transaction Spec |
| IC-BR-003 | WorkLine `COMPLETED` tạo transaction tương ứng khi flow yêu cầu. | Work Execution Spec / System flow |
| IC-BR-004 | Owner là dimension bắt buộc của inventory Phase 1. | Master Data baseline / BA-PO Master |
| IC-BR-005 | `AVAILABLE` là status duy nhất được allocate outbound. | Business Rules baseline |
| IC-BR-006 | Allocation/hold không làm giảm `physical_qty` trước khi ship thực tế. | Reservation/Allocation Spec |
| IC-BR-007 | Reverse là cách duy nhất để correction transaction đã post. | Inventory Transaction Spec |
| IC-BR-008 | Không có delete/update trực tiếp đối với ledger đã post. | Inventory ledger immutability baseline |
| IC-BR-009 | `OnHand` phải đối soát được từ `InventTrans`. | SystemControlMap / reconciliation baseline |
| IC-BR-010 | Mọi trans phải có trace link về object nguồn. | Auditability baseline |
| IC-BR-011 | Duplicate retry không được sinh trans mới. | Idempotency baseline / BA-PO Master |
| IC-BR-012 | Daily snapshot phải bám transaction truth đã chốt. | Billing / snapshot baseline |

**Lưu ý quản trị tài liệu:**
- Khi BRD chính thức được chuẩn hóa rule-code chi tiết hơn ở cấp enterprise, bảng này phải được map bổ sung tới BRD rule IDs tương ứng.
- Trong giai đoạn hiện tại, `IC-BR-*` là mã rule chuẩn ở cấp module để Dev/QA/BA trace thống nhất trong FS, test case và defect log.

---

## 21. Dependencies liên module

### 21.1 Module phụ thuộc vào M3

- M4 Inbound Operations
- M5 Outbound Operations
- M6 Inventory Control
- M7 Work Execution & Mobile
- M9 VAS / Bagging
- M10 Billing & Commercial Control
- M11 Reporting, Audit & Go-Live Control

### 21.2 Module M3 phụ thuộc vào

- M1 để enforce permission, reason code, audit policy, idempotency baseline
- M2 để có item/owner/warehouse/location/status hợp lệ làm dimension input
- PRD/Blueprint/State Machine/BRD để chốt posting points và exception boundaries

---

## 22. Yêu cầu phi chức năng áp cho module

| Nhóm | Yêu cầu |
|---|---|
| Integrity | Ledger bất biến, reverse-only correction, reconciliation được |
| Reliability | Retry không gây duplicate trans |
| Concurrency | Posting và on-hand update phải transaction-safe |
| Traceability | Mọi trans truy ngược được về source object, user, time, external_id |
| Performance | Query on-hand đủ nhanh cho outbound allocation và vận hành kho |
| Recoverability | Có cách phát hiện và xử lý lệch giữa trans và on-hand |
| Auditability | Giữ đủ log để điều tra tranh chấp và kiểm toán |
| Extensibility | Cho phép mở rộng Batch/Lot/LPN ở Phase 2 mà không phá baseline Phase 1 |

---

## 23. Acceptance criteria ở mức module

Module Inventory Core Engine được xem là đạt khi tối thiểu thỏa các điều kiện sau:

1. Mọi biến động tồn kho go-live đều đi qua `InventTrans` thay vì update trực tiếp `OnHand`.
2. `InventDim` dùng đúng baseline 5 chiều của Phase 1 và không tạo duplicate combination.
3. `OnHand` truy vấn được physical / reserved / available theo item + owner + warehouse + location + status.
4. Inbound chỉ làm tăng tồn tại `RECEIVED`; outbound chỉ làm giảm tồn tại `SHIPPED`.
5. Allocation-based hold không làm giảm physical trước shipping.
6. Reverse hoạt động bằng trans ngược chiều, không sửa trans gốc.
7. Retry cùng `external_id` không sinh trans mới.
8. Reconciliation giữa `InventTrans` và `OnHand` chạy được và phát hiện lệch.
9. Daily snapshot sinh được đầu vào tin cậy cho billing.
10. Mọi transaction truy vết được về source object và audit context.

### 23.1 Acceptance Criteria chi tiết theo sub-module (testable)

**Sub-module 1 — InventDim**
- AC-1.1: Cùng combination `site+warehouse+location+owner+status` gọi 10 lần → chỉ có 1 `dim_id`
- AC-1.2: `location_id` không thuộc `warehouse_id` → reject 400/422
- AC-1.3: status ngoài 4 giá trị go-live → reject

**Sub-module 2 — InventTrans**
- AC-2.1: Inbound `RECEIVED` tạo trans qty dương, outbound `SHIPPED` tạo trans qty âm
- AC-2.2: Thiếu `ref_id` hoặc `item_id` → reject
- AC-2.3: Adjustment không có `reason_code` → reject
- AC-2.4: Transaction đã post không thể update/delete qua API thường

**Sub-module 3 — OnHand**
- AC-3.1: Post inbound +30,000 kg → `physical_qty` tăng đúng 30,000
- AC-3.2: Allocate 5,000 kg → `reserved_qty` tăng 5,000, `physical_qty` không đổi
- AC-3.3: Ship 5,000 kg → `physical_qty` giảm 5,000 và available được tính lại đúng

**Sub-module 4 — Posting Engine**
- AC-4.1: Event ngoài posting point map → reject, không tạo trans
- AC-4.2: WorkLine putaway complete → tạo movement đúng dim_from/dim_to
- AC-4.3: Cùng `external_id` retry 3 lần → chỉ 1 trans được tạo

**Sub-module 5 — Reversal**
- AC-5.1: Reverse trans outbound -10,000 kg → tạo trans +10,000 kg link về trans gốc
- AC-5.2: Reverse không có reason_code → reject
- AC-5.3: Sau reverse, on-hand được cập nhật đúng theo qty đối ứng

**Sub-module 6 — Availability Query**
- AC-6.1: Stock status = `AVAILABLE` → query trả eligible_qty cho allocation
- AC-6.2: Stock status = `DAMAGED` → eligible_qty = 0 cho outbound allocation
- AC-6.3: Cùng item khác owner → trả 2 balance tách biệt, không gộp

**Sub-module 7 — Reconciliation & Snapshot**
- AC-7.1: `OnHand` và SUM ledger khớp → reconciliation = PASS
- AC-7.2: Mô phỏng lệch dữ liệu → reconciliation report chỉ ra item/dim bị lệch
- AC-7.3: Snapshot cuối ngày có thể truy về cut-off time và nguồn ledger

**Sub-module 8 — Technical Safeguards**
- AC-8.1: 2 request đồng thời cùng một event nhưng khác `external_id` hợp lệ → không khóa sai, không trùng `trans_id`
- AC-8.2: Retry cùng `external_id` → response trả trans cũ
- AC-8.3: Có `correlation_id` để trace từ API request sang trans record và technical log

---

## 24. User stories cốt lõi theo góc nhìn BA/PO

### US-M3-001: Post inventory movement from valid business event
**As a** System,  
**I want to** convert valid business events into standardized inventory transactions,  
**So that** all stock changes are recorded consistently and traceably.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Inbound chỉ post khi Receipt đạt `RECEIVED`
- AC2: Outbound chỉ post khi Shipment đạt `SHIPPED`
- AC3: Mọi trans có `ref_type`, `ref_id`, `item_id`, `qty`, `dim`
- AC4: Posting lỗi → không cập nhật dở dang giữa trans và on-hand

### US-M3-002: Maintain current on-hand by inventory dimension
**As a** Warehouse/Operations system,  
**I want to** read current stock by item and dimension quickly,  
**So that** allocation, movement and reporting can rely on one consistent stock view.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Query được theo item, owner, warehouse, location, status
- AC2: Hiển thị tách biệt physical, reserved, available
- AC3: Owner khác nhau không bị gộp tồn

### US-M3-003: Reverse posted transaction without editing ledger history
**As a** WH_MANAGER / authorized process,  
**I want to** reverse incorrect posted transactions,  
**So that** corrections can be made without violating ledger immutability.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Reverse tạo trans ngược chiều, không sửa trans gốc
- AC2: Reverse bắt buộc reason_code + audit
- AC3: Có trace link giữa trans gốc và trans reverse

### US-M3-004: Prevent duplicate posting during retry or integration instability
**As a** System,  
**I want to** enforce idempotency on inventory posting commands,  
**So that** retry from mobile, weighbridge or integration does not create duplicate stock movement.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Cùng `external_id` không tạo trans mới
- AC2: Response retry trả kết quả cũ hoặc trạng thái đã biết
- AC3: Log technical trace đủ để điều tra duplicate/retry

---

## 25. Gợi ý API/domain contract mức khái niệm

> Phần này là baseline để bóc tiếp FS/API chi tiết, chưa phải contract cuối cùng.

- `POST /inventory/postings`
- `POST /inventory/postings/reverse`
- `GET /inventory/onhand`
- `GET /inventory/onhand/history`
- `GET /inventory/transactions/{trans_id}`
- `POST /inventory/reconciliation/run`
- `GET /inventory/reconciliation/results`
- `POST /inventory/snapshots/daily`

**Command payload tối thiểu nên có:**
- `external_id`
- `correlation_id`
- `ref_type`
- `ref_id`
- `ref_line_id`
- `item_id`
- `qty`
- `uom`
- `dim_from`
- `dim_to`
- `reason_code` (khi bắt buộc)
- `posted_by`
- `source_app`

---

## 26. Điểm cần chốt thêm trước khi bóc FS/API chi tiết

| # | To-Confirm Item | Priority | Impact | Deadline đề xuất |
|---|---|---|---|---|
| 1 | Reserved/Hold sẽ lưu trực tiếp trên `on_hand` hay bảng riêng `allocation_hold` | P1 | Ảnh hưởng schema + query + outbound integration | Trước FS M3/M5 |
| 2 | Stage lifecycle cuối cùng của `InventTrans` dùng đầy đủ hay tối giản cho Phase 1 | P2 | Ảnh hưởng DB enum + API response + QA case | Trước Sprint 2 |
| 3 | Chính sách reverse quyền hạn: role nào được reverse từng loại trans | P1 | Ảnh hưởng RBAC, audit, operational control | Trước SIT |
| 4 | Daily snapshot cut-off time theo warehouse local time hay toàn hệ thống | P1 | Ảnh hưởng billing và reports | Trước FS M10 |
| 5 | Reconciliation chạy realtime, scheduled hay both | P2 | Ảnh hưởng vận hành support và alerting | Trước Go-Live design |
| 6 | Number sequence cho `trans_id` dùng shared service hay UUID + business code hybrid | P2 | Ảnh hưởng DB/API/log readability | Trước Tech Design |
| 7 | Chính sách giữ lịch sử hold/allocation sau ship/unallocate ở mức nào | P2 | Ảnh hưởng traceability và debugging outbound | Trước FS M5 |
| 8 | Locking strategy chính thức cho concurrent allocation: pessimistic locking hay cơ chế khác theo ADR | P1 | Ảnh hưởng over-allocation control, DB locking, throughput và test strategy | Trước FS M5 |
| 9 | Công thức `dim_hash` có cần versioning ngay từ Phase 1 để chuẩn bị cho Batch/Lot/Serial Phase 2 hay không | P2 | Ảnh hưởng migration path của `InventDim` | Trước Tech Design |

---

## 27. Khuyến nghị cho Dev Team

1. Không code transaction logic rải rác trong Receipt, Shipment, Work hay Adjustment services. Gom về một posting engine dùng chung.  
2. Thiết kế theo nguyên tắc ledger-first, on-hand-second.  
3. Dùng unique constraint/index hợp lý cho dimension uniqueness và idempotency key.  
4. Reverse là domain action riêng, không làm bằng update SQL.  
5. Query stock nên có chiến lược index theo `item_id + warehouse_id + owner_id + status + location_id`.  
6. Bắt buộc có integration test cho concurrent posting và retry behavior.

---

## 28. Khuyến nghị cho QA Team

1. Test posting point đúng/sai theo state machine.  
2. Test duplicate retry ở cả UI, API và integration boundary.  
3. Test reverse cho các loại trans chính: inbound, outbound, move, adjustment.  
4. Test owner segregation và status segregation trong on-hand query.  
5. Test reconciliation sau các chuỗi nghiệp vụ dài: receive → putaway → allocate → ship → reverse.  
6. Test không cho module khác update on-hand trực tiếp ngoài M3 path.

---

## 29. Kết luận

Module 3 không phải chỉ là “bảng tồn kho” hay “màn hình xem số lượng”. Đây là **engine lõi** quyết định hệ thống SWM của TVL có thật sự đáng tin về tồn kho hay không.

Nếu Module 1 là lớp kỷ luật hệ thống và Module 2 là lớp dữ liệu nền, thì Module 3 là lớp **transaction truth** biến mọi biến động kho thành sự thật có thể truy vết, đối soát và dùng tiếp cho vận hành lẫn billing.

Build đúng module này sẽ giúp:
- M4/M5/M6/M7/M9 không phải tự xử lý tồn kho theo cách riêng.
- M10 Billing có transaction truth và snapshot đáng tin để tính phí.
- QA có thể test tồn kho theo posting point và reconciliation thay vì đoán theo màn hình.
- Business giảm tranh chấp vì mọi correction đều có reverse trail và audit.

Nếu build sai hoặc làm nửa vời module này, toàn bộ hệ thống sẽ có nguy cơ lệch tồn, trùng giao dịch, sai reporting và sai billing.

---

## 30. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp các tài liệu cũ và mới mâu thuẫn nhau, ưu tiên đề xuất như sau:

1. PRD / Blueprint / Module Master / Overview bản mới hơn  
2. Inventory Transaction Spec và Master Data Supplement cho các quy tắc nền của inventory layer  
3. State Machine Spec để xác định posting point và transition timing  
4. BRD dùng để tham khảo chi tiết rule, nhưng rule nào mâu thuẫn với baseline mới hơn phải được đánh dấu là superseded  
5. Project Charter dùng cho governance dự án, cadence, RACI và change control

