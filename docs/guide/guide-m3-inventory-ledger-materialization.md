# Guide sửa Module 3 Inventory Core
## Chủ đề: Dừng update trực tiếp `on_hand`, chuyển sang mô hình **ledger-first** + **materialization/read model**

**Mục tiêu của tài liệu này**
- Giúp dev hiểu **logic nghiệp vụ** đằng sau thiết kế tồn kho chuẩn.
- Giúp dev hiểu **vì sao flow hiện tại chưa đúng**.
- Mô tả rõ **cần sửa gì trong code**, **service nào chịu trách nhiệm gì**, **không được làm gì**, và **điều kiện nghiệm thu**.

**Phạm vi tài liệu này**
- Chỉ tập trung vào vấn đề trọng tâm của Module 3:
  - Hiện tại flow đang đi theo kiểu:
    `eventCode -> transType/stage -> getInventoryDelta() -> onHand.updateQty(...)`
  - Nhưng flow chuẩn phải là:
    **mọi thay đổi tồn kho đi vào `invent_trans` trước** → sau đó `on_hand` được cập nhật bởi **MaterializationService** như một **read model**.

---

# 1. Giải thích nghiệp vụ bằng ngôn ngữ dễ hiểu

## 1.1. `invent_trans` là gì?
Hiểu đơn giản, `invent_trans` là **sổ cái giao dịch tồn kho**.

Mỗi khi có một nghiệp vụ làm thay đổi tồn kho, hệ thống phải ghi lại một dòng giao dịch vào sổ cái này, ví dụ:
- nhận hàng
- giữ hàng cho đơn xuất
- bỏ giữ hàng
- pick hàng
- ship hàng
- chuyển kho
- điều chỉnh tăng/giảm
- đổi trạng thái hàng

**Điểm quan trọng:**
- `invent_trans` là nơi lưu **sự thật gốc** về những gì đã xảy ra.
- Một khi đã ghi vào đây thì **không được sửa/xóa**.
- Nếu ghi sai thì phải ghi **bút toán đảo/reversal**, không sửa lịch sử cũ.

---

## 1.2. `on_hand` là gì?
`on_hand` là **bảng số dư hiện tại** để hệ thống tra cứu nhanh.

Ví dụ người dùng mở màn hình tồn kho, hệ thống cần biết ngay:
- hiện đang có bao nhiêu hàng thực (`physical_qty`)
- đã giữ cho đơn bao nhiêu (`allocated_qty`)
- còn có thể dùng bao nhiêu (`available_qty`)
- còn bao nhiêu hàng đang chờ nhập (`inbound_ordered_qty`)
- còn bao nhiêu nhu cầu xuất chưa hoàn tất (`outbound_ordered_qty`)

**Điểm quan trọng:**
- `on_hand` **không phải nguồn sự thật gốc**.
- `on_hand` chỉ là **bảng số dư được tính ra** từ lịch sử trong `invent_trans`.
- Nói cách khác:
  - `invent_trans` = nhật ký giao dịch
  - `on_hand` = số dư tổng hợp

---

## 1.3. Vì sao không được update `on_hand` trực tiếp?
Vì update trực tiếp `on_hand` sẽ biến hệ thống thành kiểu “sửa số dư thẳng tay”, dẫn đến các vấn đề nghiệp vụ rất khó cứu sau này.

### Ví dụ đời thường
Kho đang có 100 bao.

Sau đó xảy ra 3 việc:
1. Có đơn bán 20 bao
2. Hệ thống allocate giữ chỗ 20 bao
3. Sau đó ship thực tế 18 bao

Nếu hệ thống chỉ sửa `on_hand` trực tiếp, sau vài lần cộng trừ, team vận hành sẽ rất khó trả lời các câu hỏi sau:
- 2 bao còn lại bị mất ở bước nào?
- allocate lúc nào?
- ai đã release hay không release allocation?
- ship có đúng số lượng đã pick không?
- tồn lệch bắt đầu từ thời điểm nào?

Nếu mọi thứ đi qua `invent_trans`, ta có thể truy ra toàn bộ lịch sử.

---

# 2. Vấn đề hiện tại của code

## 2.1. Flow hiện tại đang làm gì?
Hiện tại mô tả module cho thấy luồng đang là:

```text
business event
-> map eventCode sang transType/stage
-> tính delta tồn kho
-> update trực tiếp on_hand
```

Nghĩa là service xử lý nghiệp vụ đang vừa:
- hiểu nghiệp vụ
- tính tồn kho
- và sửa số dư `on_hand`

Thiết kế này tạo ra việc **write model** và **read model** bị trộn vào nhau.

---

## 2.2. Sai ở góc nhìn nghiệp vụ là gì?
Sai ở chỗ hệ thống đã coi `on_hand` là nơi ghi nhận giao dịch gốc, trong khi đúng ra `on_hand` chỉ là bảng để đọc nhanh.

Hậu quả nghiệp vụ:
- khó audit
- khó truy nguyên sai lệch
- khó rebuild dữ liệu
- khó chạy reconcile
- khó scale khi có nhiều module cùng ghi tồn kho
- dễ sinh race condition khi nhiều event cùng update một dòng `on_hand`

---

# 3. Flow chuẩn phải là gì?

## 3.1. Golden rule
> **ALL inventory changes must go through `invent_trans` first.**
> Không business service nào được sửa `on_hand` trực tiếp.

---

## 3.2. Flow chuẩn từng bước

### Bước 1 — Module nghiệp vụ phát sinh sự kiện
Ví dụ:
- Inbound xác nhận nhận hàng
- Outbound allocate
- Outbound pick
- Outbound ship confirm
- Transfer ship/receive
- Adjustment tăng/giảm

Module nghiệp vụ chỉ cần biết:
- đang phát sinh loại giao dịch gì
- số lượng bao nhiêu
- item nào
- từ dim nào / sang dim nào
- stage nào
- ref document nào
- external id nào để chống duplicate

### Bước 2 — Posting engine ghi vào `invent_trans`
Posting engine phải tạo **record ledger** trong `invent_trans`.

Record này là dấu vết gốc của nghiệp vụ.

### Bước 3 — Cùng transaction, ghi outbox event
Cùng transaction database với bước insert `invent_trans`, hệ thống cần ghi một event/outbox record để báo rằng có transaction mới cần materialize.

Mục đích:
- không bỏ sót event
- worker có thể chạy lại nếu fail
- đảm bảo eventually `on_hand` sẽ được cập nhật đúng

### Bước 4 — Materialization worker đọc ledger
`MaterializationService` hoặc worker sẽ đọc các `invent_trans` mới chưa xử lý, group theo:
- item
- invent_dim

Sau đó tính delta cho từng bucket của `on_hand`.

### Bước 5 — Worker update `on_hand`
Chỉ worker/materializer mới được quyền update `on_hand`.

### Bước 6 — API đọc từ `on_hand`
Các API hiển thị tồn kho cho màn hình, dashboard, allocation check... sẽ đọc từ `on_hand`.

### Bước 7 — API lịch sử đọc từ `invent_trans`
Các màn hình lịch sử, audit, trace nguồn gốc phải đọc từ `invent_trans`.

---

# 4. Tư duy thiết kế mà dev cần nắm

## 4.1. Ghi lịch sử trước, số dư sau
Nguyên tắc cốt lõi:
- giao dịch là gốc
- số dư là kết quả tính toán

Sai:
- sửa số dư xong coi như đã xong nghiệp vụ

Đúng:
- ghi nhận nghiệp vụ vào ledger
- sau đó hệ thống tự materialize số dư

---

## 4.2. `on_hand` là read model, không phải business truth
Dev phải coi `on_hand` như cache có kiểm soát / read model.

Ý nghĩa:
- mất `on_hand` vẫn rebuild lại được từ `invent_trans`
- lệch `on_hand` có thể reconcile/rebuild
- `invent_trans` mới là dữ liệu không được mất

---

## 4.3. Một giao dịch inventory phải có ý nghĩa nghiệp vụ rõ ràng
Mỗi record `invent_trans` phải trả lời được:
- sự kiện nào xảy ra?
- xảy ra ở bước nào của vòng đời hàng?
- ảnh hưởng bucket nào?
- ảnh hưởng ở dim nào?
- đến từ chứng từ nào?
- có thể reverse được không?

---

# 5. Mapping nghiệp vụ chuẩn từ stage sang bucket `on_hand`

Đây là phần dev cần hiểu rất chắc vì nó ảnh hưởng trực tiếp tới code materialization.

## 5.1. `EXPECTED`
Ý nghĩa nghiệp vụ:
- đã có **nhu cầu tương lai** nhưng hàng chưa nhập/xuất thực tế

Tác động:
- inbound order: tăng `inbound_ordered_qty`
- outbound order: tăng `outbound_ordered_qty`

Ví dụ:
- PO được confirm nhưng hàng chưa về → tăng `inbound_ordered_qty`
- SO được approve nhưng chưa pick/ship → tăng `outbound_ordered_qty`

**Không làm thay đổi `physical_qty`.**

---

## 5.2. `REGISTERED`
Ý nghĩa nghiệp vụ:
- chỉ ghi nhận document trung gian, ví dụ receipt document đã tạo

Tác động:
- **không đổi `on_hand`**

Dev lưu ý:
- stage này vẫn có giá trị audit/process tracking
- nhưng materialization bỏ qua khi tính bucket

---

## 5.3. `ALLOCATED`
Ý nghĩa nghiệp vụ:
- hàng đã được giữ chỗ cho một nhu cầu xuất cụ thể

Tác động:
- tăng `allocated_qty`

Lưu ý nghiệp vụ:
- hàng vẫn còn trong kho vật lý
- chưa ship
- chưa trừ `physical_qty`
- chỉ giảm khả năng dùng cho nhu cầu khác

---

## 5.4. `DE_ALLOCATED`
Ý nghĩa nghiệp vụ:
- bỏ giữ chỗ / giải phóng hàng đã allocate

Tác động:
- giảm `allocated_qty`

Thường xảy ra khi:
- pick started
- đơn bị hủy
- allocation hết hiệu lực
- thay đổi lô/location nên phải release rồi allocate lại

---

## 5.5. `PHYSICAL`
Ý nghĩa nghiệp vụ:
- có thay đổi hàng thực tế tại một dim/location nào đó

Tác động:
- tăng hoặc giảm `physical_qty`

Ví dụ:
- nhận hàng vào location RECV → `physical_qty` tăng ở dim đích
- putaway từ RECV sang STORAGE → dim nguồn giảm, dim đích tăng
- pick từ STORAGE sang STAGING → dim STORAGE giảm, dim STAGING tăng
- load từ STAGING sang SHIPPING → dim STAGING giảm, dim SHIPPING tăng
- adjustment tăng/giảm → `physical_qty` +/-

---

## 5.6. `DEDUCTED`
Ý nghĩa nghiệp vụ:
- trừ hàng cuối cùng ra khỏi chuỗi inventory của kho đó

Tác động:
- giảm `physical_qty`

Ví dụ:
- ship confirm từ SHIPPING → hàng rời khỏi kho
- transfer issue từ warehouse nguồn → hàng rời kho nguồn

**Lưu ý rất quan trọng:**
- `DEDUCTED` không phải nơi để giảm `allocated_qty` nếu allocation đã được release từ trước.
- Nghĩa là release allocation phải xảy ra ở `DE_ALLOCATED`, không dồn sang `DEDUCTED`.

---

# 6. Vì sao phải tách `DE_ALLOCATED` và `DEDUCTED`?

Đây là chỗ rất nhiều dev dễ code sai.

## Logic nghiệp vụ đúng
Trong outbound chuẩn:
1. SO approved → tăng `outbound_ordered_qty`
2. Allocate → tăng `allocated_qty`
3. Pick started / release allocation → giảm `allocated_qty`
4. Pick confirmed → di chuyển `physical_qty` từ STORAGE sang STAGING
5. Load → di chuyển `physical_qty` từ STAGING sang SHIPPING
6. Ship confirm → giảm `physical_qty` ở SHIPPING

## Nếu dev trừ `allocated_qty` ở bước ship confirm thì sao?
Khi đó hệ thống đang nói rằng:
- cho tới tận lúc ship xong hàng vẫn đang ở trạng thái “giữ chỗ”

Điều này sai về nghĩa nghiệp vụ, vì sau khi pick bắt đầu / hàng đã được cầm lên để xử lý, allocation logic cũ không còn đúng nữa.

**Kết quả của việc code sai:**
- báo cáo allocated bị treo
- available_qty sai
- tồn nhìn như bị khóa lâu hơn thực tế
- khó tìm nguyên nhân mismatch giữa pick và ship

---

# 7. Trách nhiệm đúng của từng thành phần trong code

## 7.1. PostingEngineService — được làm gì?
Được làm:
- nhận command/sự kiện từ module nghiệp vụ
- validate dữ liệu cơ bản
- resolve dimension (`invent_dim`)
- map `eventCode` sang `trans_type`, `stage`, chiều từ/đến
- tạo record `invent_trans`
- tạo outbox event cùng transaction
- trả về kết quả đã post ledger thành công

Không được làm:
- không gọi `onHand.updateQty(...)`
- không tự cộng/trừ `physical_qty`
- không tự cập nhật `allocated_qty`
- không tự ghi `available_qty`

**Nguyên tắc:** posting engine ghi ledger, không ghi số dư.

---

## 7.2. MaterializationService — được làm gì?
Đây là component duy nhất được phép update `on_hand`.

Được làm:
- đọc các ledger event chưa materialize
- tính delta theo stage
- group theo item + invent_dim
- update `on_hand`
- update checkpoint / outbox status
- hỗ trợ rebuild full `on_hand` từ `invent_trans`

Không được làm:
- không tự tạo business transaction mới
- không tự quyết định logic nghiệp vụ ngoài mapping đã định nghĩa

---

## 7.3. HoldService — vai trò đúng là gì?
`HoldService` là capability phục vụ outbound allocation.

Được làm:
- kiểm tra available
- tạo bản ghi hold chi tiết để biết shipment nào đang giữ hàng nào
- gọi posting để sinh `ISSUE + ALLOCATED`
- khi release thì gọi posting để sinh `ISSUE + DE_ALLOCATED`

Không được làm:
- không update thẳng `allocated_qty` trong `on_hand`

---

## 7.4. OnHandService — vai trò đúng là gì?
Được làm:
- query `on_hand`
- trả dữ liệu cho API đọc
- tính `available_qty` nếu cần ở tầng query
- hỗ trợ filter/search/summarize

Không được làm:
- không phải service ghi tồn kho business
- không có method kiểu `increasePhysical`, `decreaseAllocated`, `updateQty` cho business flow gọi trực tiếp

---

# 8. Refactor target cho code hiện tại

## 8.1. Cần bỏ pattern nào?
Bỏ toàn bộ pattern kiểu:

```text
map event -> getInventoryDelta() -> onHand.updateQty(...)
```

Bởi vì pattern này làm business service chạm trực tiếp vào read model.

---

## 8.2. Thay bằng pattern nào?
Thay bằng:

```text
map event -> create invent_trans -> create outbox event -> commit
(materializer async) -> aggregate delta -> update on_hand
```

---

## 8.3. `getInventoryDelta()` có bỏ hoàn toàn không?
Không nhất thiết bỏ logic mapping delta, nhưng phải **chuyển đúng chỗ dùng**.

Cách đúng:
- vẫn có thể dùng một hàm map từ `trans_type + stage` sang “bucket nào bị ảnh hưởng”
- nhưng hàm này phải được dùng trong **MaterializationService** hoặc shared mapping layer cho materializer
- không dùng ở posting path để update `on_hand` trực tiếp

---

# 9. Đề xuất cấu trúc code để dev dễ làm

## 9.1. Write path
Có thể tách theo ý tưởng sau:

- `InventoryPostingApplicationService`
  - nhận command
  - validate input
  - gọi domain mapper
  - insert `invent_trans`
  - insert outbox

- `InventoryEventMapper`
  - map eventCode / business action sang:
    - `trans_type`
    - `stage`
    - source/destination dim
    - signed qty / quantity direction

- `InventTransRepository`
  - append-only insert

- `InventoryOutboxRepository`
  - insert event chờ materialize

---

## 9.2. Materialization path
- `MaterializationWorker`
  - poll outbox/checkpoint
  - load unprocessed transactions
  - group by item + dim

- `OnHandDeltaCalculator`
  - chuyển các ledger transaction thành delta cho:
    - `physical_qty`
    - `allocated_qty`
    - `inbound_ordered_qty`
    - `outbound_ordered_qty`

- `OnHandProjectionRepository`
  - update `on_hand` bằng optimistic lock / row_version

- `MaterializationCheckpointRepository`
  - lưu `last_trans_seq`

---

# 10. Pseudo logic nghiệp vụ dev cần code

## 10.1. Posting
```text
begin transaction
  resolve invent_dim
  validate reference + item + uom + qty
  validate idempotency by external_id + trans_type
  insert invent_trans
  insert inventory_event_outbox
commit
```

## 10.2. Materialization
```text
worker polls pending outbox
read checkpoint
load invent_trans where seq > checkpoint
group by item_id + invent_dim_id
for each group:
  calculate delta buckets by stage mapping
  update on_hand with optimistic lock
update checkpoint
mark outbox completed
```

---

# 11. Business rules bắt buộc phải giữ

## 11.1. `invent_trans` là append-only
- không update transaction cũ
- không delete transaction cũ
- sửa sai bằng reversal

## 11.2. `on_hand.available_qty = physical_qty - allocated_qty`
- không coi `available_qty` là bucket gốc độc lập
- không update available riêng lẻ rồi quên đồng bộ với physical/allocated

## 11.3. Không cho âm tồn vật lý ở Phase 1
- `physical_qty >= 0`
- nếu business muốn cho âm tồn phải là scope riêng, không tự mở ngầm

## 11.4. Idempotency bắt buộc
Một business event không được post trùng nhiều lần chỉ vì retry API.

Cần ít nhất:
- `external_id`
- unique rule phù hợp (`external_id`, `trans_type`) hoặc rule equivalent do kiến trúc quyết định

## 11.5. Rebuild phải làm được
Nếu xóa sạch `on_hand`, hệ thống vẫn phải có thể build lại đúng từ `invent_trans`.

Đây là thước đo quan trọng để biết kiến trúc đã đúng chưa.

---

# 12. Ví dụ nghiệp vụ để dev hình dung

## 12.1. Inbound nhận hàng PO
### Tình huống
PO 100 bao được confirm, sau đó nhận thực tế 100 bao vào location RECV.

### Ledger đúng
1. `RECEIPT + EXPECTED` qty 100
   - tăng `inbound_ordered_qty`
2. `RECEIPT + REGISTERED` qty 100
   - không ảnh hưởng `on_hand`
3. `RECEIPT + PHYSICAL` qty 100 vào dim RECV
   - tăng `physical_qty`
   - đồng thời logic materialization làm giảm `inbound_ordered_qty` tương ứng cho lifecycle nhận hàng hoàn tất

### Ý nghĩa nghiệp vụ
- trước khi hàng về: biết là hàng đang chờ nhập
- khi hàng về thật: hàng vật lý tăng

---

## 12.2. Outbound chuẩn
### Tình huống
SO 50 bao được approve, allocate 50, pick bắt đầu, pick confirmed, load, ship confirm.

### Ledger đúng
1. `ISSUE + EXPECTED` 50
   - tăng `outbound_ordered_qty`
2. `ISSUE + ALLOCATED` 50
   - tăng `allocated_qty`
3. `ISSUE + DE_ALLOCATED` 50
   - giảm `allocated_qty`
4. `ISSUE + PHYSICAL` 50 từ STORAGE sang STAGING
   - STORAGE giảm physical
   - STAGING tăng physical
5. `ISSUE + PHYSICAL` 50 từ STAGING sang SHIPPING
   - STAGING giảm physical
   - SHIPPING tăng physical
6. `ISSUE + DEDUCTED` 50 ở SHIPPING
   - SHIPPING giảm physical
   - outbound ordered có thể được hoàn tất/khóa vòng đời theo mapping thiết kế

### Điểm dev phải nhớ
- Không giảm `allocated_qty` ở bước 6 nếu đã release ở bước 3.

---

# 13. Migration/refactor checklist cho team dev

## Phase A — Chặn ghi trực tiếp vào `on_hand`
- tìm toàn bộ nơi gọi `onHand.updateQty(...)`, `increase/decrease`, raw SQL update `on_hand`
- phân loại nơi nào là business write path
- xóa hoặc deprecated các method update trực tiếp này khỏi luồng nghiệp vụ
- chỉ giữ quyền write `on_hand` cho materializer/projection layer

## Phase B — Chuẩn hóa posting path
- mọi event inventory phải insert `invent_trans`
- cùng transaction phải insert outbox event
- bổ sung `seq_no`/checkpoint nếu chưa có
- đảm bảo idempotency

## Phase C — Hoàn thiện materialization
- tạo worker poll outbox hoặc processor tương đương
- group transaction theo item + invent_dim
- tính delta đúng theo stage
- update `on_hand` bằng optimistic lock
- cập nhật checkpoint

## Phase D — Rebuild & reconcile
- tạo utility rebuild full `on_hand` từ `invent_trans`
- tạo API/admin job reconcile ledger vs `on_hand`
- sinh report mismatch nếu có

## Phase E — Cleanup interface
- sửa service contract để team khác không gọi update trực tiếp `on_hand`
- đổi tên method cho rõ nghĩa, ví dụ:
  - `postInventoryTransaction(...)`
  - `materializeOnHand(...)`
  - tránh tên kiểu `adjustOnHandFromEvent(...)`

---

# 14. Anti-patterns phải cấm

Dev cần tránh các kiểu sau:

## Anti-pattern 1 — Business service update `on_hand` trực tiếp
Ví dụ sai:
- outbound service ship xong gọi `on_hand.physical_qty -= qty`

## Anti-pattern 2 — Update cả ledger lẫn `on_hand` trong cùng business code path
Nghe có vẻ an toàn nhưng thực ra là duplicate responsibility.

## Anti-pattern 3 — Cho API CRUD sửa `on_hand`
Ví dụ:
- endpoint admin “set physical = 100” trực tiếp

Cách đúng:
- nếu cần chỉnh tồn thì tạo transaction `ADJUSTMENT + PHYSICAL`

## Anti-pattern 4 — Sửa transaction lịch sử
Ví dụ:
- phát hiện qty sai → update record `invent_trans`

Cách đúng:
- post reversal + post transaction đúng mới

## Anti-pattern 5 — Xem `available_qty` là bucket độc lập
Cách đúng:
- available là giá trị suy ra từ physical - allocated

---

# 15. Điều kiện nghiệm thu kỹ thuật và nghiệp vụ

## 15.1. Điều kiện nghiệm thu nghiệp vụ
Hệ thống được coi là đúng khi:
- mọi thay đổi tồn kho đều truy được lịch sử trong `invent_trans`
- không có business flow nào sửa thẳng `on_hand`
- có thể giải thích vì sao một số dư hiện tại lại ra con số đó
- có thể rebuild `on_hand` từ `invent_trans` và ra cùng kết quả
- allocation, de-allocation, physical move, deducted được tách đúng nghĩa nghiệp vụ

## 15.2. Điều kiện nghiệm thu kỹ thuật
- search codebase không còn business write path update `on_hand`
- `MaterializationService` là thành phần duy nhất update `on_hand`
- có outbox/checkpoint hoặc cơ chế tương đương để retry an toàn
- có optimistic lock / concurrency control khi update `on_hand`
- có test idempotency
- có test rebuild từ ledger

---

# 16. Test cases tối thiểu dev phải viết

## Case 1 — Retry cùng external_id không tạo duplicate
Kết quả mong đợi:
- chỉ có 1 `invent_trans`
- `on_hand` không bị cộng/trừ 2 lần

## Case 2 — Allocate rồi de-allocate
Kết quả mong đợi:
- `allocated_qty` tăng rồi giảm về đúng giá trị cũ
- `physical_qty` không đổi

## Case 3 — Pick + ship outbound chuẩn
Kết quả mong đợi:
- `allocated_qty` không còn treo sau khi release
- `physical_qty` chuyển đúng giữa STORAGE → STAGING → SHIPPING → out

## Case 4 — Rebuild toàn bộ `on_hand`
Kết quả mong đợi:
- xóa/read reset projection
- build lại từ `invent_trans`
- số dư khớp dữ liệu trước rebuild

## Case 5 — Reversal
Kết quả mong đợi:
- transaction gốc không bị sửa
- reversal tạo bút toán ngược
- `on_hand` quay về đúng trạng thái

---

# 17. Tóm tắt quyết định kiến trúc cho team dev

## Câu ngắn gọn nhất
**Posting engine ghi ledger. Materializer ghi on_hand.**

## Nhớ 3 câu này
1. `invent_trans` là lịch sử gốc, không sửa xóa.
2. `on_hand` là số dư đọc nhanh, không được business flow sửa trực tiếp.
3. Nếu mất `on_hand`, phải dựng lại được từ `invent_trans`.

---

# 18. Hành động cụ thể nên làm ngay

## Ưu tiên 1 — làm ngay
- Ngừng toàn bộ update trực tiếp `on_hand` từ business posting path
- Rà soát toàn bộ code đang gọi `onHand.updateQty(...)`
- Chuyển responsibility update `on_hand` về `MaterializationService`

## Ưu tiên 2 — làm ngay sau đó
- Bổ sung outbox/checkpoint nếu chưa đầy đủ
- Chuẩn hóa stage mapping trong materializer
- Viết utility rebuild `on_hand` từ ledger

## Ưu tiên 3 — ổn định vận hành
- Thêm reconcile job
- Thêm monitoring mismatch
- Thêm audit/report cho duplicate/reversal/materialization lag

---

# 19. Kết luận

Flow hiện tại của module tồn kho chưa đúng chuẩn vì đang để business posting path chạm trực tiếp vào `on_hand`.

Muốn hệ thống tồn kho bền, scale được, audit được và ít lệch số liệu, bắt buộc phải chuyển sang mô hình:

**ledger-first (`invent_trans`) → async/safe materialization → `on_hand` read model**

Đây không chỉ là quyết định kỹ thuật, mà là quyết định **đúng về nghiệp vụ** vì nó giúp hệ thống trả lời được:
- hàng đã thay đổi khi nào
- do chứng từ nào
- do bước nghiệp vụ nào
- vì sao số dư hiện tại lại ra con số đó

