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


---

# PHỤ LỤC BỔ SUNG BUILD-READY — MODULE 3 INVENTORY CORE ENGINE (v1.1)

> Phần bổ sung này được thêm để nâng tài liệu từ mức **directionally correct** lên mức **build-ready hơn cho BA / Tech Lead / Dev / QA**.  
> Các nội dung dưới đây **không thay thế** các nguyên tắc đã chốt ở phần trên, mà làm rõ thêm contract, matrix nghiệp vụ, exception handling, hold model, reconciliation policy và data dictionary runtime.

## 25A. Event-to-Transaction Mapping Matrix (đề xuất chốt cho Phase 1)

| Event Code | Source Module | Source Object | Trigger State / Action | Posting Allowed When | Trans Type | Qty Sign / Logic | Dim From | Dim To | Affects Physical | Affects Hold | Reason Code Required | Reversible | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EVT-REC-RECEIVED | M4 | Receipt Line | Receipt = `RECEIVED` | receipt line valid, item/owner/location/status hợp lệ | RECEIPT_IN | `+qty` | null | receiving dim | Yes | No | No | Yes | Điểm post inbound chính thức |
| EVT-WORK-PUTAWAY-COMPLETE | M7 | Work Line | WorkLine type = PUTAWAY, state = `COMPLETED` | stock tồn tại tại dim nguồn | MOVE | from `-qty`, to `+qty` | receiving dim | storage dim | No net change | No | No | Yes | Là movement nội bộ sau inbound |
| EVT-SHIP-SHIPPED | M5 | Shipment Line | Shipment = `SHIPPED` | shipment line đã allocate/confirm theo rule M5 | SHIPMENT_OUT | `-qty` | ship-from dim | null | Yes | Release hold | No | Yes | Chỉ lúc ship thực tế mới trừ physical |
| EVT-MOVE-COMPLETE | M6/M7 | Move Order / Work Line | Move complete | dim_from có đủ physical phù hợp | MOVE | from `-qty`, to `+qty` | current dim | target dim | No net change | No | No | Yes | Áp cho move nội bộ |
| EVT-TRANSFER-RECEIVED | M6 | Transfer Line | transfer received | transfer document hợp lệ | MOVE | from `-qty`, to `+qty` | transfer from dim | transfer to dim | No net change | No | No | Yes | Phase 1 xem như movement paired |
| EVT-STATUS-CHANGE-CONFIRMED | M6 | Status Change Line | approved/confirmed | status from/to hợp lệ | STATUS_CHANGE | from `-qty`, to `+qty` | current status dim | target status dim | No net change | No | Yes | Yes | Ví dụ AVAILABLE → DAMAGED |
| EVT-ADJ-APPROVED-PLUS | M6 | Adjustment Line | approved | reason code hợp lệ | ADJUSTMENT_PLUS | `+qty` | null | target dim | Yes | No | Yes | Yes | Dùng cho tăng tồn |
| EVT-ADJ-APPROVED-MINUS | M6 | Adjustment Line | approved | reason code hợp lệ, đủ stock theo policy | ADJUSTMENT_MINUS | `-qty` | source dim | null | Yes | No | Yes | Yes | Dùng cho giảm tồn |
| EVT-COUNT-RECONCILED-GAIN | M6 | Cycle Count Line | reconciliation approved | variance > 0 | COUNT_GAIN | `+delta` | null | counted dim | Yes | No | Yes | Yes | Delta-based, không overwrite absolute |
| EVT-COUNT-RECONCILED-LOSS | M6 | Cycle Count Line | reconciliation approved | variance < 0 | COUNT_LOSS | `-delta` | counted dim | null | Yes | No | Yes | Yes | Delta-based |
| EVT-VAS-CONSUME | M9 | VAS WO Line | VAS consume confirmed | source stock đủ và hợp lệ | VAS_CONSUME | `-qty` | source bulk dim | null | Yes | No | Yes | Yes | Tiêu hao nguyên liệu |
| EVT-VAS-PRODUCE | M9 | VAS WO Line | VAS produce confirmed | output item/dim hợp lệ | VAS_PRODUCE | `+qty` | null | output bagged dim | Yes | No | Yes | Yes | Sinh thành phẩm |
| EVT-HOLD-CREATE | M5 | Shipment Allocation | allocation confirmed | available đủ | HOLD_CREATE | không tạo ledger | n/a | n/a | No | Increase hold | No | N/A | Xử lý ở hold engine, không phải InventTrans |
| EVT-HOLD-RELEASE | M5 | Shipment Allocation | unallocate/cancel/ship | có hold tồn tại | HOLD_RELEASE | không tạo ledger | n/a | n/a | No | Decrease hold | No | N/A | Ship thành công phải release hold liên quan |

### 25A.1 Quy tắc bắt buộc cho mapping matrix

- Chỉ các event có trong bảng mapping này mới được đi qua inventory posting engine.
- Event nghiệp vụ được gửi sang M3 phải kèm `event_code`, `source_module`, `ref_type`, `ref_id`, `ref_line_id`, `external_id`, `correlation_id`.
- `HOLD_CREATE` và `HOLD_RELEASE` là inventory-side operational actions nhưng **không phải ledger posting**.
- Với movement / status change, hệ thống phải bảo đảm luôn có **đủ cả `dim_from` và `dim_to`**.
- Với adjustment / count / reversal, `reason_code` là bắt buộc.

## 25B. Transaction Type Rule Matrix (đề xuất chốt cho Phase 1)

| Trans Type | Mô tả | Ledger Rows | Dim From | Dim To | Qty Rule | Physical Impact | Reserved/Hold Impact | Partial Reverse | Reason Code | Ghi chú triển khai |
|---|---|---:|---|---|---|---|---|---|---|---|
| RECEIPT_IN | Nhập kho chính thức | 1 | No | Yes | `+qty` | Increase | No | Yes | Optional | post khi Receipt = RECEIVED |
| SHIPMENT_OUT | Xuất kho chính thức | 1 | Yes | No | `-qty` | Decrease | Release hold | Yes | Optional | post khi Shipment = SHIPPED |
| MOVE | Di chuyển nội bộ | 2 logic impacts / 1 business action | Yes | Yes | from `-qty`, to `+qty` | Net 0 | No | Yes | Optional | có thể persist 2 ledger rows linked cùng action |
| STATUS_CHANGE | Đổi trạng thái tồn | 2 logic impacts / 1 business action | Yes | Yes | from `-qty`, to `+qty` | Net 0 | No | Yes | Mandatory | from_status != to_status |
| ADJUSTMENT_PLUS | Điều chỉnh tăng | 1 | No | Yes | `+qty` | Increase | No | Yes | Mandatory | sai lệch/nhập bổ sung |
| ADJUSTMENT_MINUS | Điều chỉnh giảm | 1 | Yes | No | `-qty` | Decrease | No | Yes | Mandatory | hao hụt/mất mát |
| COUNT_GAIN | Chênh lệch kiểm kê tăng | 1 | No | Yes | `+delta` | Increase | No | Yes | Mandatory | delta-based |
| COUNT_LOSS | Chênh lệch kiểm kê giảm | 1 | Yes | No | `-delta` | Decrease | No | Yes | Mandatory | delta-based |
| VAS_CONSUME | Tiêu hao đầu vào VAS | 1 | Yes | No | `-qty` | Decrease | No | Yes | Mandatory | có thể nhiều lines |
| VAS_PRODUCE | Sinh đầu ra VAS | 1 | No | Yes | `+qty` | Increase | No | Yes | Mandatory | output item có thể khác item input |
| REVERSAL | Giao dịch đảo chiều | 1 hoặc cặp tương ứng trans gốc | Theo trans gốc | Theo trans gốc | đảo dấu / đảo dim | Mirror original | Mirror original if needed | No reverse-of-reversal by default | Mandatory | reverse-only correction |

### 25B.1 Chuẩn lưu ledger cho MOVE và STATUS_CHANGE

Để dễ scale, reconcile và drill-down, khuyến nghị Phase 1 lưu theo cách:

- **1 business action** có thể sinh **2 ledger rows liên kết cùng `action_group_id`**:
  - Row 1: `qty âm` tại `dim_from`
  - Row 2: `qty dương` tại `dim_to`
- Ưu điểm:
  - công thức tổng hợp `on_hand` đơn giản hơn
  - drill-down ledger rõ chiều biến động
  - reversal dễ mirror từng row
  - reconciliation không cần logic đặc biệt cho “from/to nằm cùng 1 row”

> Nếu Tech Lead chọn persist 1 row có cả `dim_from_id` + `dim_to_id`, phải có ADR riêng và phải bảo đảm aggregator/reversal/query vẫn thống nhất một cách duy nhất.

## 25C. Availability & Hold Model (đề xuất chốt cho Phase 1)

### 25C.1 Quyết định thiết kế đề xuất

- `on_hand` giữ số tổng hợp vận hành:
  - `physical_qty`
  - `reserved_qty`
  - `available_qty`
  - `last_posted_at`
- Tạo **bảng riêng `allocation_hold`** để lưu chi tiết từng hold theo shipment/work context.
- Công thức baseline:
  - `available_qty = physical_qty - reserved_qty`
- Chỉ stock có `inventory_status = AVAILABLE` mới được allocate.
- `DAMAGED`, `BLOCKED`, `IN_TRANSIT` luôn có `eligible_for_allocation = false`.

### 25C.2 Bảng `allocation_hold` đề xuất

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| hold_id | varchar / uuid | Yes | mã hold |
| shipment_id | varchar | Conditional | shipment header |
| shipment_line_id | varchar | Conditional | shipment line |
| item_id | varchar | Yes | mã hàng |
| dim_id | bigint / uuid | Yes | dim đang giữ |
| hold_qty | decimal(18,3) | Yes | số lượng hold |
| hold_status | varchar | Yes | ACTIVE / RELEASED / CONSUMED / CANCELLED |
| reason_code | varchar | Conditional | nếu forced release / manual override |
| external_id | varchar | Yes | idempotency của action hold |
| correlation_id | varchar | Yes | trace |
| created_at | datetime | Yes | thời điểm tạo |
| created_by | varchar | Yes | actor |
| released_at | datetime | Conditional | thời điểm release |
| released_by | varchar | Conditional | actor release |

### 25C.3 Hold lifecycle

| Action | Điều kiện | Hệ quả |
|---|---|---|
| CREATE_HOLD | available đủ, status = AVAILABLE | tăng `reserved_qty`, tạo `allocation_hold.ACTIVE` |
| INCREASE_HOLD | hold đang ACTIVE và stock đủ | tăng `hold_qty`, tăng `reserved_qty` |
| DECREASE_HOLD | hold đang ACTIVE | giảm `hold_qty`, giảm `reserved_qty` |
| RELEASE_HOLD | shipment cancel / unallocate / replace | giảm `reserved_qty`, hold -> `RELEASED` |
| CONSUME_HOLD | shipment shipped | release/consume hold liên quan trước hoặc cùng transaction ship |
| FORCE_RELEASE_HOLD | role được phép + reason code | giảm reserved, log audit bắt buộc |

### 25C.4 Concurrent allocation rule

- Allocation confirm phải dùng **pessimistic locking** tại row `on_hand` liên quan.
- Chỉ sau khi lock thành công mới tính `available_qty`.
- Không cho phép 2 request cùng commit làm `reserved_qty` vượt `physical_qty`.
- Nếu không đủ available:
  - trả lỗi nghiệp vụ rõ ràng
  - không retry mù
  - không tạo partial hold ngầm nếu user không yêu cầu

## 25D. Reversal Policy (đề xuất chốt cho Phase 1)

### 25D.1 Nguyên tắc

- Không update/delete trans đã post.
- Correction sau post = `reverse trans gốc` + `post lại trans đúng` nếu cần.
- Reverse phải giữ:
  - `reversal_of_trans_id`
  - `reversal_reason_code`
  - `reversal_action_group_id`
  - `reversed_by`
  - `reversed_at`

### 25D.2 Rule chi tiết

| Tình huống | Cho reverse? | Ghi chú |
|---|---|---|
| Receipt post sai qty | Yes | reverse receipt_in cũ, post receipt_in mới |
| Shipment post sai qty | Yes | reverse shipment_out cũ, post shipment_out mới |
| Move nhầm location | Yes | reverse cặp move cũ, post move mới |
| Status change sai | Yes | reverse cặp status change cũ |
| Adjustment sai reason/qty | Yes | reverse adjustment cũ rồi post mới |
| Reverse-of-reversal | Chỉ cho phép theo role đặc biệt / không khuyến nghị | cần approval + reason + audit tăng cường |
| Partial reverse | Yes nếu domain cho phép | phải truyền `reverse_qty <= original_open_qty` |
| Reverse khi trans đã vào snapshot billing | Yes | snapshot policy phải hỗ trợ rerun/version |

### 25D.3 Chống reverse trùng

- Không cho reverse toàn phần cùng một trans nhiều lần nếu `remaining_reversible_qty = 0`.
- Với partial reverse, hệ thống phải theo dõi:
  - `original_qty`
  - `reversed_qty_accumulated`
  - `remaining_reversible_qty`

## 25E. Reconciliation Policy (đề xuất chốt cho Phase 1)

### 25E.1 Mục tiêu

Đảm bảo `on_hand` chỉ là read model đúng với transaction truth.

### 25E.2 Loại reconciliation

| Loại | Tần suất | Mục đích |
|---|---|---|
| Realtime lightweight check | synchronous trên một số posting path trọng yếu | phát hiện sai lệch ngay tại transaction boundary |
| Scheduled reconciliation | định kỳ (ví dụ mỗi 15/30/60 phút hoặc cuối ngày) | phát hiện lệch rộng trên phạm vi warehouse/item |
| Manual reconciliation | theo yêu cầu support/admin | điều tra sự cố hoặc rerun sau correction |

### 25E.3 Công thức baseline

- Với mỗi `item_id + dim_id`:
  - `ledger_balance = SUM(invent_trans.qty_effective)`
  - `onhand_balance = on_hand.physical_qty`
- Expected:
  - `ledger_balance = onhand_balance`
- `reserved_qty` được đối chiếu với `allocation_hold` active/consumable.

### 25E.4 Output severity

| Severity | Điều kiện | Hành động |
|---|---|---|
| INFO | không lệch | log pass |
| WARNING | lệch nhỏ nhưng trong phạm vi dữ liệu đang xử lý lại có kiểm soát | theo dõi + rerun |
| CRITICAL | lệch thực sự giữa ledger và on_hand | mở exception record, chặn manual close nếu chưa review |

### 25E.5 Bảng `inventory_reconciliation_result` đề xuất

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| recon_id | varchar / uuid | Yes | mã đợt đối soát |
| run_type | varchar | Yes | REALTIME / SCHEDULED / MANUAL |
| run_scope | varchar | Yes | toàn kho / item / owner / location |
| item_id | varchar | Conditional | nếu theo item |
| dim_id | bigint / uuid | Conditional | nếu theo dim |
| ledger_qty | decimal(18,3) | Yes | tổng ledger |
| onhand_qty | decimal(18,3) | Yes | tổng onhand |
| diff_qty | decimal(18,3) | Yes | chênh lệch |
| severity | varchar | Yes | INFO / WARNING / CRITICAL |
| status | varchar | Yes | OPEN / REVIEWED / RESOLVED |
| created_at | datetime | Yes | thời điểm ghi nhận |
| created_by | varchar | Yes | system/job/user |

## 25F. Daily Snapshot Policy (đề xuất chốt cho Phase 1)

### 25F.1 Quy tắc chốt

- Snapshot mặc định chốt theo **local time của warehouse**.
- Cut-off mặc định: `23:59:59` local warehouse time.
- Snapshot phải sinh từ **transaction truth đã post** đến cut-off.
- Snapshot không được sửa tay.
- Nếu có correction sau cut-off ảnh hưởng ngày cũ:
  - sinh `snapshot_version` mới hoặc rerun có version
  - giữ lịch sử version để billing/audit trace được

### 25F.2 Bổ sung field cho `daily_storage_snapshot`

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| snapshot_version | int | Yes | version rerun của snapshot ngày đó |
| snapshot_status | varchar | Yes | OPEN / FINAL / SUPERSEDED |
| warehouse_timezone | varchar | Yes | múi giờ kho |
| rerun_reason | varchar | Conditional | lý do rerun |
| superseded_by_version | int | Conditional | version thay thế |

### 25F.3 Quy tắc billing-safe

- Billing phải đọc **snapshot FINAL mới nhất** của ngày tính phí.
- Nếu snapshot version mới sinh ra sau correction:
  - snapshot cũ -> `SUPERSEDED`
  - snapshot mới -> `FINAL`
- Ngày không phát sinh giao dịch vẫn phải có snapshot carry-forward nếu billing cần tính storage theo ngày.

## 25G. API Contract Summary (build-ready baseline)

### 25G.1 `POST /inventory/postings`

**Mục đích:** tạo inventory posting chuẩn hóa từ business event hợp lệ.

**Request tối thiểu:**
```json
{
  "external_id": "string",
  "correlation_id": "string",
  "event_code": "EVT-REC-RECEIVED",
  "ref_type": "RECEIPT",
  "ref_id": "RCV-0001",
  "ref_line_id": "1",
  "item_id": "ITEM001",
  "qty": 30300,
  "uom": "KG",
  "dim_from": null,
  "dim_to": {
    "site_id": "SITE01",
    "warehouse_id": "WH01",
    "location_id": "RECEIVING-01",
    "owner_id": "OWNER01",
    "inventory_status": "AVAILABLE"
  },
  "reason_code": null,
  "posted_by": "u123",
  "source_app": "weighbridge"
}
```

**Success response baseline:**
```json
{
  "status": "SUCCESS",
  "posting_action_id": "IPA-000001",
  "trans_ids": ["ITR-000001"],
  "idempotent_replay": false
}
```

**Idempotency behavior:**
- cùng `external_id` + cùng `action_type/context` + cùng payload canonicalized:
  - trả kết quả cũ
  - `idempotent_replay = true`
- cùng `external_id` nhưng payload khác:
  - trả `409 CONFLICT_IDEMPOTENCY_PAYLOAD_MISMATCH`

### 25G.2 `POST /inventory/postings/reverse`

**Mục đích:** reverse transaction đã post.

**Request tối thiểu:**
```json
{
  "external_id": "string",
  "correlation_id": "string",
  "original_trans_id": "ITR-000001",
  "reverse_qty": 10000,
  "reason_code": "WRONG_QTY",
  "reversed_by": "u999",
  "source_app": "web"
}
```

**Validation bắt buộc:**
- `original_trans_id` tồn tại
- trans cho phép reverse
- `reverse_qty > 0`
- `reverse_qty <= remaining_reversible_qty`
- `reason_code` bắt buộc

### 25G.3 `GET /inventory/onhand`

**Mục đích:** query tồn vận hành.

**Filter baseline:**
- `item_id`
- `owner_id`
- `warehouse_id`
- `location_id`
- `inventory_status`
- `include_zero`
- `page`, `page_size`, `sort`

**Response baseline:**
- `physical_qty`
- `reserved_qty`
- `available_qty`
- `eligible_for_allocation`
- `last_posted_at`

### 25G.4 `GET /inventory/onhand/history`

**Mục đích:** drill-down lịch sử biến động.

**Bắt buộc hỗ trợ:**
- filter theo `item_id`, `owner_id`, `warehouse_id`, `date_from`, `date_to`, `ref_type`, `ref_id`
- paging
- sort theo `posted_at desc`

### 25G.5 `POST /inventory/reconciliation/run`

**Mục đích:** chạy đối soát.

**Request baseline:**
```json
{
  "external_id": "string",
  "run_type": "MANUAL",
  "scope": {
    "warehouse_id": "WH01",
    "item_id": null,
    "owner_id": null
  },
  "requested_by": "admin01"
}
```

### 25G.6 `POST /inventory/snapshots/daily`

**Mục đích:** tạo hoặc rerun snapshot cuối ngày.

**Request baseline:**
```json
{
  "external_id": "string",
  "snapshot_date": "2026-03-08",
  "warehouse_id": "WH01",
  "mode": "FINALIZE",
  "requested_by": "batch_job"
}
```

## 25H. Error Code & Exception Matrix

| Error Code | Error Name | Khi xảy ra | Blocking | Hướng xử lý |
|---|---|---|---|---|
| INV-400-001 | INVALID_DIMENSION | thiếu hoặc sai dim values | Yes | reject request |
| INV-400-002 | INVALID_STATUS_FOR_ALLOCATION | status khác AVAILABLE nhưng đòi allocate | Yes | reject |
| INV-400-003 | REASON_CODE_REQUIRED | flow cần lý do nhưng không truyền | Yes | reject |
| INV-400-004 | INVALID_POSTING_POINT | event/state không nằm trong posting point hợp lệ | Yes | reject |
| INV-400-005 | INVALID_REVERSE_QTY | reverse_qty <= 0 hoặc vượt phần còn lại | Yes | reject |
| INV-404-001 | TRANS_NOT_FOUND | không tìm thấy trans gốc | Yes | reject |
| INV-409-001 | DUPLICATE_EXTERNAL_ID_REPLAY | retry đúng payload | No | trả kết quả cũ |
| INV-409-002 | CONFLICT_IDEMPOTENCY_PAYLOAD_MISMATCH | cùng external_id nhưng payload khác | Yes | reject + log |
| INV-409-003 | INSUFFICIENT_AVAILABLE_QTY | không đủ stock allocate/ship/adjust minus | Yes | reject |
| INV-409-004 | ALREADY_FULLY_REVERSED | trans đã reverse hết | Yes | reject |
| INV-409-005 | HOLD_NOT_FOUND_OR_NOT_ACTIVE | release/consume hold không hợp lệ | Yes | reject |
| INV-423-001 | STOCK_ROW_LOCK_TIMEOUT | lock quá thời gian | Yes | fail gracefully, cho retry có kiểm soát |
| INV-500-001 | ATOMIC_UPDATE_FAILED | fail giữa trans và on_hand | Yes | rollback / recovery path |
| INV-500-002 | RECONCILIATION_MISMATCH_FOUND | reconciliation phát hiện lệch | No | mở exception record |

## 25I. Permission Matrix at Inventory Action Level

| Action | Vai trò tối thiểu đề xuất | Approval / Control | Reason Code | Audit bắt buộc |
|---|---|---|---|---|
| Post inbound transaction | SYSTEM / WH_CLERK qua module hợp lệ | theo state machine nguồn | No | Yes |
| Post outbound transaction | SYSTEM / WH_SUPERVISOR qua module hợp lệ | theo shipment flow | No | Yes |
| Post adjustment | INV_CONTROLLER / WH_MANAGER | có thể yêu cầu dual control theo ngưỡng | Yes | Yes |
| Reverse transaction | INV_CONTROLLER / WH_MANAGER | role riêng, log tăng cường | Yes | Yes |
| Run reconciliation | ADMIN / SUPPORT / INV_CONTROLLER | manual run phải log lý do | Optional | Yes |
| Rerun daily snapshot | BILLING_ADMIN / ADMIN | phải có rerun_reason | Yes | Yes |
| Force release hold | WH_MANAGER / OPS_MANAGER | high-risk action | Yes | Yes |
| View cross-owner stock | ADMIN / INTERNAL AUTHORIZED ROLE | không áp cho customer role | No | Yes |

> Enforcement role chi tiết do M1 sở hữu, nhưng M3 phải expose action names rõ ràng để M1 map permission được chính xác.

## 25J. Runtime Data Dictionary bổ sung

### 25J.1 `on_hand`

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| onhand_id | bigint / uuid | Yes | khóa kỹ thuật |
| item_id | varchar | Yes | mã hàng |
| dim_id | bigint / uuid | Yes | dimension key |
| physical_qty | decimal(18,3) | Yes | tồn vật lý |
| reserved_qty | decimal(18,3) | Yes | lượng đang giữ |
| available_qty | decimal(18,3) | Yes | physical - reserved |
| last_posted_at | datetime | Yes | lần update gần nhất |
| updated_at | datetime | Yes | thời điểm cập nhật |
| updated_by | varchar | Yes | actor/service |
| version_no | bigint | Yes | dùng cho optimistic trace nếu cần |

**Unique key đề xuất:** `(item_id, dim_id)`

### 25J.2 `inventory_reversal_link`

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| reversal_link_id | varchar / uuid | Yes | mã link |
| original_trans_id | varchar | Yes | trans gốc |
| reversal_trans_id | varchar | Yes | trans reverse |
| reverse_qty | decimal(18,3) | Yes | lượng đã reverse |
| reason_code | varchar | Yes | lý do |
| created_at | datetime | Yes | thời điểm tạo |
| created_by | varchar | Yes | actor |

### 25J.3 `inventory_event_mapping`

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| event_code | varchar | Yes | mã event |
| source_module | varchar | Yes | module nguồn |
| source_object | varchar | Yes | object nguồn |
| trigger_state | varchar | Yes | state trigger |
| trans_type | varchar | Yes | loại trans |
| posting_enabled | boolean | Yes | có bật hay không |
| requires_reason_code | boolean | Yes | cờ bắt buộc lý do |
| created_at | datetime | Yes | audit |
| updated_at | datetime | Yes | audit |

### 25J.4 `idempotency_key` (inventory scope)

| Field | Type gợi ý | Required | Mô tả |
|---|---|---|---|
| idempotency_id | varchar / uuid | Yes | khóa |
| action_type | varchar | Yes | POSTING / REVERSE / HOLD / SNAPSHOT / RECON |
| external_id | varchar | Yes | khóa client gửi lên |
| payload_hash | varchar | Yes | hash payload canonical |
| result_ref | varchar | Conditional | trans_id / action_id / snapshot_id |
| status | varchar | Yes | PROCESSING / SUCCESS / FAILED |
| created_at | datetime | Yes | thời điểm tạo |
| expired_at | datetime | Conditional | nếu có retention policy |

## 25K. UAT / SIT Scenario Pack bổ sung

1. Receive thành công → tạo `RECEIPT_IN`, physical tăng đúng.
2. Retry cùng `external_id` sau receive → không tạo trans mới.
3. Putaway complete → stock chuyển receiving sang storage, net physical toàn kho không đổi.
4. Allocate 2 shipment cùng lúc trên cùng stock pool → chỉ request đủ điều kiện thành công theo available.
5. Ship thành công → physical giảm, hold được release/consume đúng.
6. Reverse shipment đã ship → physical hồi lại đúng, trace link đầy đủ.
7. Owner A và Owner B cùng item cùng location → không gộp on-hand.
8. Status `DAMAGED` không allocate được.
9. Adjustment minus không đủ stock theo policy → reject.
10. Cycle count gain/loss post theo delta, không overwrite absolute.
11. Move nhầm location → reverse move cũ rồi post move mới.
12. VAS consume và produce cùng action group → inventory net thay đổi đúng theo input/output.
13. Reconciliation phát hiện lệch giả lập → tạo `inventory_reconciliation_result` severity phù hợp.
14. Rerun snapshot sau reversal của ngày cũ → sinh version mới, snapshot cũ bị supersede.
15. Cùng `external_id` nhưng payload khác → trả conflict, không tạo thêm trans.
16. Force release hold không có reason code → reject.
17. Reverse trans đã reverse hết → reject.
18. Query on-hand history lọc theo owner/date/ref_type trả đúng drill-down.
19. Partial reverse shipment → remaining reversible qty được cập nhật đúng.
20. Fail kỹ thuật giữa insert ledger và update on_hand → transaction rollback hoặc recovery path không để data nửa vời.

## 25L. Đề xuất chốt các quyết định quan trọng để giảm ambiguity trước build

Các điểm sau nên xem là **baseline đề xuất đã đủ tốt để team bắt đầu FS/Tech Design**, trừ khi Steering Group có quyết định khác:

1. `allocation_hold` là bảng riêng, không chỉ lưu hold trong `on_hand`.
2. `on_hand` là read model vận hành; `invent_trans` mới là transaction truth.
3. MOVE / STATUS_CHANGE nên lưu theo 2 ledger rows logic liên kết cùng `action_group_id`.
4. Snapshot dùng timezone của kho và có `snapshot_version`.
5. Idempotency phải so cả `external_id` và `payload_hash`.
6. Reverse-only correction là bắt buộc cho mọi trans đã post.
7. Concurrent allocation dùng pessimistic locking tại confirm allocation.
8. Count reconciliation là delta-based, không set lại tồn tuyệt đối bằng update tay.
9. Duplicate `external_id` nhưng payload khác là lỗi conflict, không trả kết quả cũ.
10. Permission ở mức action inventory phải được map rõ giữa M1 và M3.

## 26. Điểm cần chốt thêm trước khi bóc FS/API chi tiết (cập nhật sau bổ sung)

| # | To-Confirm Item | Priority | Tình trạng sau bản bổ sung | Gợi ý tiếp theo |
|---|---|---|---|---|
| 1 | Persist MOVE / STATUS_CHANGE theo 2 rows hay 1 row from/to | P1 | Đã có khuyến nghị mạnh: 2 rows logic | Chốt ở ADR Tech |
| 2 | Reverse-of-reversal có mở cho Phase 1 không | P2 | Khuyến nghị hạn chế tối đa | Chốt với Ops + Internal Control |
| 3 | Ngưỡng nào yêu cầu dual approval cho adjustment/reverse | P2 | Chưa chốt | Chốt ở M1 governance + SOP |
| 4 | Tần suất scheduled reconciliation | P2 | Chưa chốt cố định | Chốt theo load/performance test |
| 5 | Retention policy của `idempotency_key` và `allocation_hold` history | P3 | Chưa chốt | Chốt cùng DevOps/DBA |
| 6 | Rule billing cuối cùng nếu storage formula thay đổi | P2 | Baseline hiện tại đã đủ dùng | Chốt với M10 trước SIT Billing |


## 27. Điểm cần chốt thêm trước khi bóc FS/API chi tiết

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

## 28. Khuyến nghị cho Dev Team

1. Không code transaction logic rải rác trong Receipt, Shipment, Work hay Adjustment services. Gom về một posting engine dùng chung.  
2. Thiết kế theo nguyên tắc ledger-first, on-hand-second.  
3. Dùng unique constraint/index hợp lý cho dimension uniqueness và idempotency key.  
4. Reverse là domain action riêng, không làm bằng update SQL.  
5. Query stock nên có chiến lược index theo `item_id + warehouse_id + owner_id + status + location_id`.  
6. Bắt buộc có integration test cho concurrent posting và retry behavior.

---

## 29. Khuyến nghị cho QA Team

1. Test posting point đúng/sai theo state machine.  
2. Test duplicate retry ở cả UI, API và integration boundary.  
3. Test reverse cho các loại trans chính: inbound, outbound, move, adjustment.  
4. Test owner segregation và status segregation trong on-hand query.  
5. Test reconciliation sau các chuỗi nghiệp vụ dài: receive → putaway → allocate → ship → reverse.  
6. Test không cho module khác update on-hand trực tiếp ngoài M3 path.

---

## 30. Kết luận

Module 3 không phải chỉ là “bảng tồn kho” hay “màn hình xem số lượng”. Đây là **engine lõi** quyết định hệ thống SWM của TVL có thật sự đáng tin về tồn kho hay không.

Nếu Module 1 là lớp kỷ luật hệ thống và Module 2 là lớp dữ liệu nền, thì Module 3 là lớp **transaction truth** biến mọi biến động kho thành sự thật có thể truy vết, đối soát và dùng tiếp cho vận hành lẫn billing.

Build đúng module này sẽ giúp:
- M4/M5/M6/M7/M9 không phải tự xử lý tồn kho theo cách riêng.
- M10 Billing có transaction truth và snapshot đáng tin để tính phí.
- QA có thể test tồn kho theo posting point và reconciliation thay vì đoán theo màn hình.
- Business giảm tranh chấp vì mọi correction đều có reverse trail và audit.

Nếu build sai hoặc làm nửa vời module này, toàn bộ hệ thống sẽ có nguy cơ lệch tồn, trùng giao dịch, sai reporting và sai billing.

---

## 31. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp các tài liệu cũ và mới mâu thuẫn nhau, ưu tiên đề xuất như sau:

1. PRD / Blueprint / Module Master / Overview bản mới hơn  
2. Inventory Transaction Spec và Master Data Supplement cho các quy tắc nền của inventory layer  
3. State Machine Spec để xác định posting point và transition timing  
4. BRD dùng để tham khảo chi tiết rule, nhưng rule nào mâu thuẫn với baseline mới hơn phải được đánh dấu là superseded  
5. Project Charter dùng cho governance dự án, cadence, RACI và change control

