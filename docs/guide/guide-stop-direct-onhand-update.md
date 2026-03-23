# Guide chi tiết: Ngừng update trực tiếp `on_hand`
> Dành cho team dev chưa biết nghiệp vụ. Mục tiêu là giúp dev hiểu **bức tranh business**, **vấn đề hiện tại**, **lý do phải đổi**, **flow đúng cần làm**, và **những gì phải sửa trong code/database/API**.

---

# 1. Mục tiêu của guide này

Guide này giải thích đầy đủ hạng mục ưu tiên số 2:

- **Ngừng update trực tiếp `on_hand`**
- **Posting Engine chỉ ghi ledger (`invent_trans`)**
- **Hold/Allocation không sửa `on_hand` trực tiếp**
- **Tách `on_hand` thành read model đúng nghĩa**

Đây là thay đổi rất quan trọng để:
- dữ liệu tồn kho bền hơn
- giảm lệch giữa lịch sử và số tổng
- dễ audit, reconciliation, recovery
- scale tốt hơn khi nhiều module cùng ghi tồn kho

---

# 2. Giải thích rất đời thường cho dev chưa biết nghiệp vụ

Hãy tưởng tượng hệ thống tồn kho giống một cửa hàng hoặc một kho gạo:

## 2.1 Có 2 kiểu dữ liệu khác nhau

### A. Sổ gốc
Đây là nơi ghi lại **từng sự kiện thật**:
- nhập bao nhiêu
- xuất bao nhiêu
- giữ chỗ bao nhiêu
- huỷ giữ chỗ bao nhiêu
- điều chỉnh bao nhiêu

Trong hệ thống của bạn, cái này là:

- `invent_trans`

### B. Bảng tổng treo tường
Đây là bảng cho mọi người nhìn nhanh:
- hiện còn bao nhiêu
- đã giữ bao nhiêu
- hàng chờ inbound bao nhiêu
- hàng chờ outbound bao nhiêu

Trong hệ thống của bạn, cái này là:

- `on_hand`

## 2.2 Vấn đề hiện tại là gì?

Hiện tại hệ thống của bạn đang có tư duy:

- vừa ghi vào **sổ gốc**
- vừa sửa luôn **bảng tổng treo tường**

Nghe thì tiện, nhưng về lâu dài rất nguy hiểm.

Vì:
- nếu có lỗi giữa chừng, sổ gốc và bảng tổng có thể lệch nhau
- nếu nhiều module cùng sửa `on_hand`, dữ liệu dễ bị chồng chéo
- nếu cần rebuild hoặc audit, rất khó biết số nào mới là “sự thật cuối cùng”

## 2.3 Tư duy đúng là gì?

Tư duy đúng phải là:

1. Mọi nghiệp vụ chỉ ghi vào **sổ gốc** trước
2. Sau đó hệ thống nền sẽ đọc từ sổ gốc để cập nhật **bảng tổng**
3. Bảng tổng chỉ là thứ để xem nhanh, không phải nơi quyết định sự thật cuối cùng

Nói ngắn gọn:

- `invent_trans` = nguồn đúng duy nhất
- `on_hand` = bản tổng hợp để đọc nhanh

---

# 3. Business problem: vì sao phải đổi?

## 3.1 Nếu tiếp tục update trực tiếp `on_hand`, rủi ro gì xảy ra?

### Rủi ro 1: lệch giữa lịch sử và số tổng
Ví dụ:
- transaction đã được ghi vào `invent_trans`
- nhưng update `on_hand` bị fail
- hoặc ngược lại, `on_hand` update xong nhưng transaction bị rollback

Kết quả:
- một nơi nói còn hàng
- một nơi nói không còn
- team vận hành không biết tin bên nào

### Rủi ro 2: nhiều module cùng chạm `on_hand`
Các module như:
- Inbound
- Outbound
- Transfer
- VAS
- Inventory Control

đều có thể tạo biến động tồn.

Nếu từng module hoặc từng service có quyền sửa `on_hand` trực tiếp, hệ thống sẽ rất khó kiểm soát.

### Rủi ro 3: khó điều tra lỗi
Khi số tồn sai, câu hỏi business sẽ là:

- Sai từ lúc nào?
- Sai vì nghiệp vụ nào?
- Ai đã ghi?
- Có thể build lại số tồn từ lịch sử không?

Nếu `on_hand` bị sửa trực tiếp từ nhiều nơi, rất khó trả lời chính xác.

### Rủi ro 4: scale lên sẽ dễ vỡ hơn
Lúc dữ liệu còn ít, user còn ít, có thể vẫn “chạy được”.
Nhưng khi:
- nhiều user đồng thời
- nhiều request đồng thời
- nhiều module tích hợp
- nhiều event tồn kho hơn

thì mô hình update trực tiếp `on_hand` sẽ ngày càng khó giữ đúng.

---

# 4. Mục tiêu kiến trúc sau khi sửa

Sau khi sửa, kiến trúc cần rõ ràng như sau:

## 4.1 `invent_trans`
Là **ledger/source of truth**:
- append-only
- immutable
- không update/delete
- tất cả biến động inventory đều phải đi qua đây

## 4.2 `on_hand`
Là **read model / projection / materialized view**
- chỉ dùng để query nhanh
- có thể trễ rất nhỏ so với ledger
- có thể rebuild lại từ ledger nếu cần
- không phải nơi để business logic ghi trực tiếp

## 4.3 Posting Engine
Chỉ làm nhiệm vụ:
- validate event
- resolve dimension
- tạo transaction trong `invent_trans`
- tạo event cho pipeline materialization

**Không được sửa `on_hand` trực tiếp nữa**

## 4.4 Hold Service / Allocation
Chỉ làm nhiệm vụ:
- giữ hàng
- ghi ledger
- phát sinh event materialization

**Không được sửa `on_hand` trực tiếp nữa**

## 4.5 Materialization Worker
Là thành phần nền để:
- đọc event từ outbox
- lấy transaction từ ledger
- aggregate ra `on_hand`
- update `on_hand`
- update checkpoint

---

# 5. Dev cần hiểu rõ 3 khái niệm sau

## 5.1 Ledger là gì?
Ledger là sổ cái giao dịch.
Mỗi dòng trong `invent_trans` là một sự kiện thật của tồn kho.

Ví dụ:
- nhận hàng vào kho
- xuất hàng ra khỏi kho
- allocate cho đơn
- deallocate khi huỷ đơn
- adjustment tăng/giảm
- transfer issue / transfer receipt

Tính chất:
- không sửa dòng cũ
- không xoá dòng cũ
- nếu sai thì tạo reversal transaction

## 5.2 Read model là gì?
Read model là dữ liệu được tổng hợp ra để đọc nhanh.

Trong hệ thống của bạn:
- `on_hand` là read model

Nó không phải sự thật gốc.
Nó là “ảnh chụp tổng hợp” của ledger tại một thời điểm nào đó.

## 5.3 Materialization là gì?
Materialization là quá trình:
- đọc ledger
- tính delta / aggregate
- cập nhật read model

Nói đời thường:
- ledger là sổ từng dòng
- materialization là người cộng sổ
- `on_hand` là kết quả đã cộng sẵn để xem nhanh

---

# 6. Vấn đề cụ thể trong module hiện tại

Theo logic hiện tại, docs đang mô tả:
- `on_hand` được update qua posting engine
- hold service cũng có thể làm biến động liên quan tới `on_hand`
- response posting còn trả luôn `onHandAfter`

Điều này cho thấy `on_hand` vẫn đang bị coi như một phần của write path.

Đây là điều cần thay đổi.

## 6.1 Vì sao đây là vấn đề?
Vì khi `on_hand` nằm trong write path:
- transaction nghiệp vụ bị phụ thuộc vào read model
- write path nặng hơn
- dễ lock nhiều hơn
- dễ phát sinh inconsistency nếu có lỗi giữa chừng
- khó tách riêng “sự thật gốc” và “bản xem nhanh”

---

# 7. Trạng thái đúng sau khi refactor

## 7.1 Write path đúng
Write path chuẩn chỉ nên là:

1. Nhận business event
2. Validate
3. Resolve `invent_dim`
4. Insert `invent_trans`
5. Insert `inventory_event_outbox`
6. Commit

Kết thúc tại đây.

**Không update `on_hand` trong transaction nghiệp vụ**

## 7.2 Async path đúng
Một worker riêng sẽ làm:

1. Poll `inventory_event_outbox`
2. Xác định transaction chưa materialize
3. Đọc ledger
4. Aggregate delta theo `(item_id, invent_dim_id)`
5. Update `on_hand`
6. Update `materialization_checkpoint`
7. Mark outbox event completed

## 7.3 Query path đúng
Mọi màn hình/query/report đọc nhanh sẽ dùng:
- `on_hand`

Nhưng khi cần quyết định nghiệp vụ cực quan trọng như allocation under concurrency, nguồn quyết định cuối cùng vẫn nên là ledger.

---

# 8. Vì sao `on_hand` phải chỉ là read model?

## 8.1 Vì `on_hand` là dữ liệu tổng hợp
Bản chất `on_hand` không phải dữ liệu gốc.
Nó được sinh ra từ:
- physical
- allocated
- inbound ordered
- outbound ordered

Các con số này đều bắt nguồn từ event/transaction.

## 8.2 Vì read model có thể rebuild lại
Nếu `on_hand` lệch hoặc hỏng:
- chỉ cần đọc lại `invent_trans`
- build lại `on_hand`

Nếu để nhiều nơi sửa `on_hand` trực tiếp, khả năng rebuild sẽ mất ý nghĩa.

## 8.3 Vì tách read và write giúp scale
Khi write path chỉ ghi ledger:
- transaction gọn hơn
- ít phụ thuộc hơn
- dễ retry hơn
- dễ scale hơn

Còn read model có thể xử lý bất đồng bộ ở luồng riêng.

---

# 9. So sánh BEFORE vs AFTER

## 9.1 BEFORE (hiện tại)

### Write path
- Business module gọi posting engine
- Posting engine insert `invent_trans`
- Posting engine update `on_hand`
- Có thể hold service cũng update `on_hand`
- API trả `onHandAfter`

### Điểm yếu
- write path nặng
- `on_hand` bị dùng như dữ liệu nghiệp vụ
- dễ lệch nếu có lỗi
- nhiều service có thể chạm vào `on_hand`

## 9.2 AFTER (mục tiêu)

### Write path
- Business module gọi posting engine
- Posting engine insert `invent_trans`
- Posting engine insert outbox
- commit

### Async materialization path
- Worker đọc outbox
- aggregate từ ledger
- update `on_hand`
- update checkpoint

### Điểm mạnh
- `invent_trans` rõ ràng là source of truth
- `on_hand` chỉ là read model
- dễ recovery
- dễ reconciliation
- dễ scale

---

# 10. Mô tả nghiệp vụ để dev hiểu “bức tranh vấn đề”

## 10.1 Inbound case
Ví dụ xe hàng vào kho.

Nghiệp vụ thật là:
- hàng đã được nhận
- hệ thống cần ghi nhận tồn kho tăng

Logic đúng:
- posting engine ghi `invent_trans`
- worker sau đó cập nhật `on_hand`

Điều này có nghĩa:
- nghiệp vụ nhận hàng là “đã xong” khi ledger được ghi đúng
- `on_hand` là phần hiển thị được làm giàu sau đó

## 10.2 Outbound case
Ví dụ hàng được xuất ra khỏi kho.

Nghiệp vụ thật là:
- có movement giảm tồn
- cần lưu lịch sử xuất thật rõ ràng

Logic đúng:
- ghi ledger trước
- `on_hand` giảm sau qua materialization

## 10.3 Transfer case
Ví dụ chuyển từ location A sang B.

Nghiệp vụ thật là:
- tại A có issue
- tại B có receipt

Cả hai đều phải tồn tại trong ledger.
`on_hand` chỉ phản ánh lại kết quả cuối cùng ở từng dimension.

## 10.4 VAS case
Ví dụ đóng gói lại hoặc xử lý giá trị gia tăng.

Nghiệp vụ thật là:
- có thể issue từ trạng thái này/location này
- receipt lại vào trạng thái khác/location khác
- có thể có adjustment

Tất cả phải đi qua ledger.
Không được “sửa số tồn tổng trực tiếp” như cách vá kết quả cuối cùng.

---

# 11. Những gì phải sửa trong code

## 11.1 Posting Engine
### Hiện tại
Có tư duy:
- ghi transaction
- cập nhật luôn `on_hand`

### Phải sửa thành
Posting Engine chỉ được:
- validate business event
- resolve `invent_dim`
- insert `invent_trans`
- insert `inventory_event_outbox`
- trả thông tin transaction đã post

### Không được làm nữa
- không gọi `onhand.repository.update(...)`
- không tính `onHandAfter` như một phần bắt buộc của write path
- không lock `on_hand` để ghi trong transaction nghiệp vụ

## 11.2 Hold Service
### Hiện tại
Có nguy cơ:
- tạo hold
- sửa `on_hand` hoặc tác động trực tiếp vào read model

### Phải sửa thành
Hold service chỉ được:
- validate đủ hàng theo chiến lược đúng
- insert `inventory_hold`
- insert `invent_trans`
- insert outbox
- commit

### Không được làm nữa
- không update `on_hand` trực tiếp
- không coi `on_hand` là nguồn chuẩn để ghi trạng thái cuối

## 11.3 OnHand Service
### Vai trò đúng
`onhand.service.js` chỉ là:
- query read model
- format response
- tính các trường derive như `availableQty`

### Không phải vai trò đúng
- không tham gia write path
- không bị business service gọi để “chốt tồn”

## 11.4 Reconciliation Service
Sau khi tách read model đúng nghĩa, reconciliation sẽ càng có ý nghĩa hơn:
- so sánh ledger và `on_hand`
- phát hiện lệch
- trigger rebuild nếu cần

---

# 12. Những gì phải thêm trong hệ thống

## 12.1 `inventory_event_outbox`
Bảng này dùng để lưu event chờ materialize.

Gợi ý field:
- `id`
- `event_id`
- `trans_id` hoặc `trans_seq_no`
- `item_id`
- `invent_dim_id`
- `status` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
- `retry_count`
- `created_at`
- `processed_at`
- `error_message`

## 12.2 `materialization_checkpoint`
Bảng này dùng để biết worker đã xử lý tới đâu.

Gợi ý field:
- `id`
- `scope_key` hoặc `(item_id, invent_dim_id)`
- `last_trans_seq_no`
- `updated_at`

## 12.3 Materialization Worker
Một service/background worker riêng.

Nhiệm vụ:
- poll outbox
- group event
- đọc transaction mới từ ledger
- aggregate bucket
- update `on_hand`
- update checkpoint
- mark outbox done

## 12.4 Rebuild utility
Cần thêm tool/job:
- rebuild toàn bộ `on_hand` từ `invent_trans`
- rebuild theo item
- rebuild theo item + invent_dim

---

# 13. Những gì phải bỏ

## 13.1 Bỏ direct update `on_hand` trong posting engine
Đây là thứ cần bỏ rõ ràng nhất.

## 13.2 Bỏ direct update `on_hand` trong hold service
Hold chỉ ghi business intent và ledger, không sửa read model.

## 13.3 Bỏ tư duy “on_hand là nơi quyết định sự thật”
`on_hand` chỉ là projection, không phải source of truth.

## 13.4 Bỏ coupling response với `onHandAfter`
Nếu API write hiện đang trả `onHandAfter`, dev nên hiểu:
- đây không còn là thứ bắt buộc phải tính trong write transaction
- có thể trả transaction result + trạng thái materialization thay vì snapshot số tồn ngay lập tức

---

# 14. API contract nên thay đổi như thế nào?

## 14.1 POST /inventory/postings
### Trước đây có thể trả
- transaction info
- `onHandAfter`

### Sau khi sửa nên ưu tiên trả
- transaction info
- transId
- stage
- transType
- idempotentReplay
- materialization status (nếu muốn)
- không phụ thuộc vào việc `on_hand` đã cập nhật xong hay chưa

## 14.2 GET /inventory/onhand
API này vẫn giữ vai trò:
- query nhanh
- hiển thị bucket tổng hợp

Dev cần hiểu:
- đây là read API
- không có trách nhiệm quyết định business write

## 14.3 GET availability / allocation-related decision
Nếu use case cần tính toán mạnh về tính sẵn sàng dưới concurrency cao, nên làm rõ:
- nguồn quyết định là ledger under lock
- không dùng read model eventual consistency để chốt write

---

# 15. Tác động tới database transaction

## 15.1 Trước khi sửa
Một transaction nghiệp vụ có thể phải làm:
- insert ledger
- update `on_hand`
- có thể thêm hold/reversal/... cùng lúc

Điều này làm write transaction nặng hơn.

## 15.2 Sau khi sửa
Một transaction nghiệp vụ chỉ cần:
- insert ledger
- insert outbox
- commit

Lợi ích:
- nhẹ hơn
- rõ ràng hơn
- ít phụ thuộc hơn
- dễ retry/idempotency hơn

---

# 16. Tác động tới scale

## 16.1 Khi user ít
Flow cũ có thể vẫn “thấy ổn”.

## 16.2 Khi scale lên
Flow mới có lợi thế rõ hơn:
- write nhanh hơn
- read tối ưu riêng
- worker có thể scale độc lập
- dễ theo dõi lag của materialization
- dễ rebuild khi có vấn đề

## 16.3 Ý nghĩa thực tế cho SWM
Với hệ thống kho có:
- inbound
- outbound
- transfer
- VAS
- billing snapshot
- reconciliation

thì inventory core phải đủ bền.
Nếu không tách ledger và read model rõ ràng, về lâu dài rất khó giữ dữ liệu sạch.

---

# 17. Ưu điểm và nhược điểm để dev hiểu trade-off

## 17.1 Ưu điểm
- dữ liệu bền hơn
- ledger là source of truth rõ ràng
- `on_hand` dễ rebuild
- write path gọn hơn
- dễ audit
- dễ reconciliation
- scale tốt hơn

## 17.2 Nhược điểm
- kiến trúc phức tạp hơn
- có eventual consistency ngắn hạn giữa ledger và `on_hand`
- cần worker/outbox/checkpoint
- team dev phải quen với read model pattern

---

# 18. Eventual consistency: dev cần hiểu đúng

## 18.1 Đây không phải lỗi
Sau khi tách read model, có thể xảy ra:
- ledger đã có transaction
- nhưng `on_hand` chưa materialize ngay trong tích tắc

Điều này là bình thường.

## 18.2 Khi nào chấp nhận được?
Chấp nhận được cho:
- màn hình tra cứu
- dashboard
- báo cáo gần realtime

## 18.3 Khi nào không nên chỉ dựa vào read model?
Không nên chỉ dựa vào read model cho:
- allocation under high concurrency
- quyết định write mang tính cam kết tồn kho

---

# 19. Gợi ý implementation cho dev

## 19.1 Tách rõ layer
- `posting-engine.service.js` = write ledger
- `hold.service.js` = write hold + ledger
- `onhand.service.js` = read model query
- `materialization-worker.service.js` = sync read model từ ledger

## 19.2 Repository nên rõ trách nhiệm
- `invent-trans.repository.js` = insert/query ledger
- `onhand.repository.js` = update/query projection, chỉ worker dùng để update
- `outbox.repository.js` = manage event queue
- `checkpoint.repository.js` = manage progress

## 19.3 Permission / RBAC
Không cần expose worker như public business API.
Đây là capability nội bộ.

---

# 20. Logging và monitoring nên có

## 20.1 Cần log
- transId được tạo
- outbox event được tạo
- outbox event xử lý thành công/thất bại
- checkpoint cập nhật tới đâu
- lần rebuild nào đã chạy

## 20.2 Cần monitor
- số event PENDING quá lâu
- số event FAILED
- lag giữa ledger và `on_hand`
- lần reconciliation lệch
- thời gian rebuild

---

# 21. Test cases dev bắt buộc phải có

## 21.1 Unit test
- posting engine không update `on_hand`
- hold service không update `on_hand`
- worker aggregate đúng delta
- checkpoint resume đúng
- rebuild tạo lại `on_hand` đúng

## 21.2 Integration test
- post transaction -> outbox created
- worker chạy -> `on_hand` updated
- worker fail giữa chừng -> retry được
- duplicate event -> idempotent handling đúng
- reconciliation phát hiện lệch

## 21.3 Concurrent test
- nhiều transaction cùng item/dim
- worker xử lý tuần tự/đúng order
- allocation không phụ thuộc `on_hand`

---

# 22. Checklist refactor rất thực dụng

## Database
- [ ] Thêm `inventory_event_outbox` — 🔜 Phase 2 (monolith dùng sync materialization)
- [ ] Thêm `materialization_checkpoint` — 🔜 Phase 2
- [x] Review index cho `invent_trans` theo `(item_id, invent_dim_id)` — ✅ indexes đã có

## Application services
- [x] Bỏ update `on_hand` khỏi posting engine — ✅ `postingEngine` chỉ ghi `invent_trans`, delegate `MaterializationService`
- [x] Bỏ update `on_hand` khỏi hold service — ✅ hold gọi `postingEngine.postInventory()` → materializer update on_hand
- [x] Thêm materialization service — ✅ `materialization.service.js` — ONLY component update on_hand
- [x] Thêm rebuild service — ✅ `MaterializationService.rebuildAll()` + `rebuildOnHand(itemId, dimId)`
- [x] Tách rõ read vs write path — ✅ Write: postingEngine → ledger only. Read: on_hand via materializer

## API / contract
- [x] `onHandAfter` trong write response — ✅ vẫn trả nhưng tính từ materializer (không block write)
- [x] Giữ `GET /onhand` là read model API — ✅
- [x] Rebuild API — ✅ `POST /api/v1/inventory/materialization/rebuild`

## Ops / support
- [ ] Dashboard theo dõi outbox lag — 🔜 Phase 2
- [x] Job rebuild — ✅ `POST /materialization/rebuild`
- [x] Reconciliation định kỳ — ✅ `POST /reconciliation/runs`

---

# 23. TL;DR cho dev

## Câu ngắn nhất để nhớ
**`invent_trans` là sổ gốc. `on_hand` chỉ là bảng tổng hợp. Không ai được sửa bảng tổng trực tiếp trong business transaction nữa.**

## Dev phải nhớ 4 điều
1. Posting engine chỉ ghi ledger + outbox
2. Hold không sửa `on_hand` trực tiếp
3. `on_hand` chỉ do worker materialize
4. Nếu `on_hand` sai, phải rebuild được từ ledger

---

# 24. Kết luận

Hạng mục “ngừng update trực tiếp `on_hand`” không chỉ là sửa kỹ thuật nhỏ.
Đây là thay đổi về **cách hiểu đúng của module tồn kho**:

- **Sự thật nằm ở ledger**
- **`on_hand` chỉ là projection**
- **write và read phải tách ra**
- **mọi thứ phải đủ bền để audit, reconcile, rebuild và scale**

Nếu team dev hiểu đúng điểm này, các phần còn lại như allocation, outbox, checkpoint, reconciliation và snapshot sẽ dễ đi đúng hướng hơn rất nhiều.
