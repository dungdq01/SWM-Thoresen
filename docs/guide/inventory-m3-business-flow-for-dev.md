# Inventory Module (M3) – Giải thích logic luồng nghiệp vụ cho Dev non-business

## Mục tiêu tài liệu
Tài liệu này giải thích **vì sao** Inventory Engine phải chạy theo stage, và **mỗi module nghiệp vụ đang muốn nói gì với M3**.

Đây **không phải tài liệu business cho user cuối**.  
Đây là tài liệu để dev hiểu:

- Mỗi event trong system có ý nghĩa tồn kho gì
- Vì sao không được update tồn trực tiếp
- Vì sao cần stage
- M3 phải nhận dữ liệu từ các module khác như thế nào

---

# 1. Tư duy đúng về Inventory Engine

## 1.1 M3 không phải màn hình tồn kho
M3 không chỉ là chỗ trả về số lượng hàng đang còn.

M3 là **bộ máy ghi nhận mọi thay đổi tồn kho**.

Nghĩ đúng:
- M4/M5/M6/M7/M9 tạo ra nghiệp vụ
- M3 ghi nhận ảnh hưởng tồn kho của nghiệp vụ đó
- M10/M11 đọc dữ liệu từ M3 để báo cáo / billing / snapshot

---

## 1.2 M3 hoạt động như “sổ cái”
Dev nên hiểu M3 giống như **ledger** trong kế toán.

### Sai cách nghĩ:
- “Nhập hàng xong thì update `on_hand += 100`”
- “Xuất hàng xong thì update `on_hand -= 20`”

### Đúng cách nghĩ:
- Không update số tồn trực tiếp
- Phải tạo **inventory transaction** (`invent_trans`)
- Sau đó hệ thống mới materialize / tổng hợp sang `on_hand`

Tức là:

**nghiệp vụ phát sinh**  
→ **ghi transaction**  
→ **worker/materializer tổng hợp**  
→ **ra số tồn hiện tại**

---

## 1.3 Vì sao phải làm như vậy
Nếu chỉ giữ 1 số tồn hiện tại thì sẽ không trả lời được:

- Tại sao tồn tăng?
- Tại sao tồn giảm?
- Hàng đã giữ chỗ chưa?
- Hàng sắp nhập có bao nhiêu?
- Đơn nào gây ra biến động?

Cho nên M3 phải giữ:
- lịch sử biến động (`invent_trans`)
- bảng đọc nhanh (`on_hand`)

---

# 2. 2 loại dữ liệu trong M3 mà dev phải phân biệt

## 2.1 `invent_trans` = lịch sử gốc
Đây là dữ liệu gốc, immutable hoặc gần immutable.

Mỗi dòng đại diện cho:
- một thay đổi tồn kho
- một bước trong vòng đời nghiệp vụ
- một ảnh hưởng cụ thể lên item + dimension

Ví dụ:
- hàng sắp về
- hàng đã nhận thực tế
- hàng đã allocate
- hàng đã ship

---

## 2.2 `on_hand` = bảng tổng hợp để đọc nhanh
Đây không phải nguồn sự thật gốc.

`on_hand` chỉ là kết quả đã được tính sẵn để:
- màn hình đọc nhanh
- API đọc nhanh
- báo cáo tổng quan đọc nhanh

Nếu có tranh chấp logic, dev phải tin:
- `invent_trans` trước
- `on_hand` sau

---

# 3. Vì sao cần stage

## 3.1 Cùng là “1 đơn hàng”, nhưng tồn kho bị ảnh hưởng ở nhiều thời điểm khác nhau
Ví dụ outbound:

- Sales Order vừa tạo xong
- Hàng đã được giữ chỗ
- Hàng đã pick
- Hàng đã load lên xe
- Hàng đã ship hoàn tất

Các bước này không giống nhau về mặt tồn kho.

Nếu dev chỉ dùng 1 event kiểu “SHIPMENT_DONE” thì sẽ mất hết ngữ cảnh trung gian.

Cho nên cần **stage** để M3 hiểu:
- đây là nhu cầu tương lai?
- đây là giữ chỗ?
- đây là thay đổi vật lý?
- đây là hoàn tất trừ tồn?

---

## 3.2 6 stage chuẩn và cách hiểu cực ngắn

### `EXPECTED`
Có kế hoạch / có demand / có dự kiến, nhưng chưa tác động vật lý.

Ví dụ:
- PO confirm: hàng sẽ về trong tương lai
- SO confirm: hàng sẽ cần xuất trong tương lai

---

### `REGISTERED`
Đã tạo chứng từ / tạo record trung gian, nhưng chưa làm thay đổi tồn thực.

Ví dụ:
- receipt đã tạo, nhưng hàng chưa nhận

---

### `ALLOCATED`
Hàng đã bị giữ chỗ cho một nhu cầu cụ thể.

Ví dụ:
- outbound đã reserve 20 bao gạo cho 1 shipment

---

### `DE_ALLOCATED`
Giải phóng phần đã allocate trước đó.

Ví dụ:
- đơn bị sửa / hủy / pick lại nên bỏ giữ chỗ

---

### `PHYSICAL`
Có thay đổi vật lý thật trên hàng.

Ví dụ:
- nhận hàng
- putaway
- move location
- count gain/loss
- pick confirmed
- load lên xe
- nhập thành phẩm từ VAS

---

### `DEDUCTED`
Đã hoàn tất bước trừ tồn logic cuối cùng.

Ví dụ:
- shipment confirm
- transfer issue từ kho nguồn
- VAS consume nguyên liệu

---

# 4. Các bucket tồn kho chuẩn dev phải hiểu

Flow chuẩn không chỉ có “còn bao nhiêu hàng”.

M3 phải quản lý ít nhất 4 bucket chuẩn:

## 4.1 `physicalQty`
Số lượng vật lý thực sự đang có ở kho / location đó.

Đây là “hàng đang tồn thật”.

---

## 4.2 `allocatedQty`
Số lượng đã bị giữ chỗ cho outbound hoặc một nhu cầu đã commit.

Đây là “hàng có thật nhưng không còn tự do”.

---

## 4.3 `inboundOrderedQty`
Số lượng dự kiến sẽ nhập về.

Đây là “hàng chưa có thật, nhưng đang trên kế hoạch nhập”.

---

## 4.4 `outboundOrderedQty`
Số lượng đã có nhu cầu xuất.

Đây là “hàng chưa bị trừ vật lý ngay, nhưng đã có demand”.

---

## 4.5 `availableQty` chỉ là giá trị tính ra
Không nên coi `availableQty` là bucket gốc.

Thường tính như:

`available = physical - allocated`

Trong tương lai có thể thêm rule:
- trừ hàng blocked
- trừ hàng hold theo status
- trừ hàng quality hold

Cho nên:
- `availableQty` là output để đọc
- không phải source of truth như `physicalQty` hoặc `allocatedQty`

---

# 5. Mỗi module khác đang “nói gì” với M3

---

## 5.1 Module 4 – Inbound

### Dev nên hiểu nghiệp vụ thế này:
Inbound không phải cứ “có receipt là tăng tồn”.

Inbound có nhiều bước:

#### Bước 1: PO confirmed
Ý nghĩa:
- công ty đã xác nhận sẽ nhập hàng

Ảnh hưởng tồn kho:
- chưa có hàng thật
- chỉ tăng phần “sắp về”

M3 phải ghi:
- `transType = RECEIPT`
- `stage = EXPECTED`

---

#### Bước 2: Receipt created
Ý nghĩa:
- đã tạo chứng từ nhận hàng
- nhưng xe/hàng chưa thực sự hoàn tất nhập

Ảnh hưởng tồn kho:
- chưa tăng tồn thật

M3 phải ghi:
- `transType = RECEIPT`
- `stage = REGISTERED`

---

#### Bước 3: Goods received
Ý nghĩa:
- hàng đã được nhận vật lý vào khu vực nhận hàng / staging

Ảnh hưởng tồn kho:
- tăng `physicalQty`
- đồng thời giảm phần “đang chờ nhập” nếu hệ thống đang quản lý ordered bucket

M3 phải ghi:
- `transType = RECEIPT`
- `stage = PHYSICAL`

---

#### Bước 4: Putaway completed
Ý nghĩa:
- hàng được chuyển từ khu nhận vào location lưu kho

Ảnh hưởng tồn kho:
- không làm tăng tổng số lượng toàn kho
- chỉ move từ location A sang location B

M3 phải ghi:
- movement nội bộ
- vẫn là logic `PHYSICAL`

### Điểm dev hay hiểu sai:
Putaway **không phải nhận thêm hàng mới**.  
Nó chỉ là di chuyển hàng đã nhận.

---

## 5.2 Module 5 – Outbound

### Dev nên hiểu nghiệp vụ thế này:
Outbound không phải cứ tạo SO là trừ tồn ngay.

Nó có nhiều bước:

#### Bước 1: SO confirmed
Ý nghĩa:
- đã có nhu cầu phải xuất hàng

Ảnh hưởng tồn kho:
- tăng `outboundOrderedQty`
- chưa trừ tồn vật lý

M3 phải ghi:
- `transType = ISSUE`
- `stage = EXPECTED`

---

#### Bước 2: Allocation created
Ý nghĩa:
- hệ thống giữ chỗ một phần hàng để không đơn khác lấy mất

Ảnh hưởng tồn kho:
- tăng `allocatedQty`

M3 phải ghi:
- `transType = ISSUE`
- `stage = ALLOCATED`

---

#### Bước 3: Allocation released
Ý nghĩa:
- bỏ giữ chỗ đã tạo trước đó

Ảnh hưởng tồn kho:
- giảm `allocatedQty`

M3 phải ghi:
- `transType = ISSUE`
- `stage = DE_ALLOCATED`

---

#### Bước 4: Pick confirmed
Ý nghĩa:
- hàng đã được lấy ra khỏi vị trí lưu trữ

Ảnh hưởng tồn kho:
- thay đổi vật lý trong kho
- có thể là move nội bộ từ storage sang staging/picking zone

M3 phải ghi:
- `transType = ISSUE`
- `stage = PHYSICAL`

---

#### Bước 5: Load confirmed
Ý nghĩa:
- hàng đã lên xe / ra khu xuất

Ảnh hưởng tồn kho:
- tiếp tục là thay đổi vật lý

M3 phải ghi:
- `transType = ISSUE`
- `stage = PHYSICAL`

---

#### Bước 6: Ship confirmed
Ý nghĩa:
- nghiệp vụ xuất hoàn tất
- hàng chính thức rời trách nhiệm tồn kho của kho

Ảnh hưởng tồn kho:
- hoàn tất logic trừ tồn

M3 phải ghi:
- `transType = ISSUE`
- `stage = DEDUCTED`

### Điểm dev hay hiểu sai:
- Allocate không phải xuất hàng
- Pick không phải ship hoàn tất
- Ship confirm mới là điểm kết thúc logic xuất

---

## 5.3 Module 6 – Transfer

Transfer là chuyển hàng giữa kho/khu vực.

### Phía kho nguồn
Ý nghĩa:
- hàng rời kho nguồn

M3 phải ghi:
- `transType = TRANSFER_ISSUE`
- `stage = DEDUCTED`

### Phía kho đích
Ý nghĩa:
- hàng đến kho đích

M3 phải ghi:
- `transType = TRANSFER_RECEIPT`
- `stage = PHYSICAL`

### Điểm dev hay hiểu sai:
Transfer không phải 1 event đơn giản.  
Nó luôn có:
- issue ở đầu nguồn
- receipt ở đầu đích

---

## 5.4 Module 9 – VAS / Bagging / Processing

VAS là trường hợp:
- lấy nguyên liệu đầu vào
- xử lý / đóng gói / gia công
- tạo ra thành phẩm hoặc bán thành phẩm mới

### Bước consume nguyên liệu
Ý nghĩa:
- nguyên liệu bị dùng đi

M3 phải ghi:
- `transType = ISSUE`
- `stage = DEDUCTED`

### Bước produce thành phẩm
Ý nghĩa:
- hàng mới được tạo ra sau processing

M3 phải ghi:
- `transType = RECEIPT`
- `stage = PHYSICAL`

### Bước waste / hao hụt
Ý nghĩa:
- có mất mát ngoài expected

M3 phải ghi:
- `transType = ADJUSTMENT`
- `stage = PHYSICAL`

### Điểm dev hay hiểu sai:
VAS không phải 1 movement bình thường.  
Nó là:
- trừ đầu vào
- cộng đầu ra
- có thể thêm hao hụt

---

## 5.5 Module 7 – Adjustment / Stock Count

Đây là trường hợp chỉnh tồn do:
- kiểm kê
- lệch tồn
- hỏng hàng
- mất mát
- tìm thấy hàng dư

Ý nghĩa:
- thay đổi vật lý thật so với sổ

M3 phải ghi:
- `transType = ADJUSTMENT`
- `stage = PHYSICAL`

---

# 6. Những thứ M3 nên làm và không nên làm

## 6.1 M3 nên làm
- nhận posting chuẩn từ các module
- validate event mapping
- tạo `invent_trans`
- materialize sang `on_hand`
- hỗ trợ query availability
- hỗ trợ allocation/hold như capability lõi
- hỗ trợ reversal
- hỗ trợ reconciliation và snapshot

---

## 6.2 M3 không nên làm
- không tự ôm nghiệp vụ PO/SO/Receipt/Shipment
- không quyết định business workflow của module khác
- không sở hữu business logic lot lifecycle
- không tạo bucket riêng theo từng module kiểu `reserved_qty_vas`
- không cho module khác update `on_hand` trực tiếp

---

# 7. Dev nên implement posting như thế nào

## 7.1 Tất cả module gửi event vào một cổng thống nhất
Ví dụ tư duy:

- Inbound gọi `postInventory(eventCode, payload)`
- Outbound gọi `postInventory(eventCode, payload)`
- Transfer gọi `postInventory(eventCode, payload)`

M3 sẽ:
1. map `eventCode`
2. suy ra `transType + stage`
3. validate payload
4. tạo `invent_trans`
5. tạo outbox/materialization event nếu có

---

## 7.2 Không cho caller truyền stage tùy ý
Caller chỉ nên gửi:
- eventCode
- item / qty / dims / reference

M3 mới là nơi quyết định:
- stage nào hợp lệ
- trans type nào đúng

Lý do:
- tránh mỗi module hiểu stage một kiểu
- tránh sai ngữ nghĩa tồn kho

---

## 7.3 Availability check phải cẩn thận
Với outbound allocation, dev không nên chỉ đọc `on_hand` rồi allocate ngay.

Nên:
- lock theo item + dim phù hợp
- đọc ledger / state đáng tin cậy
- kiểm tra available
- sau đó mới allocate

Nếu không:
- 2 request allocate cùng lúc có thể giữ chỗ vượt tồn

---

# 8. Các lỗi implement phổ biến cần tránh

## Lỗi 1: Update trực tiếp `on_hand`
Đây là lỗi sai kiến trúc.

Sai vì:
- mất audit trail
- khó reverse
- khó debug
- không đồng bộ giữa modules

---

## Lỗi 2: Dùng 1 event cuối thay cho cả lifecycle
Ví dụ chỉ có:
- `RECEIPT_RECEIVED`
- `SHIPMENT_SHIPPED`

Như vậy M3 sẽ không biết:
- lúc nào là expected
- lúc nào là allocated
- lúc nào là physical
- lúc nào là deducted

---

## Lỗi 3: Gộp `reserved` chung chung
Nên chuẩn hóa ngôn ngữ thành `allocatedQty`.

Không nên để:
- reserved cho outbound
- reserved khác cho VAS
- reserved khác cho module riêng

Điều này làm model phình và lệch flow chuẩn.

---

## Lỗi 4: Để LotService sống trong M3 như nghiệp vụ chính
M3 chỉ nên nhận `lotId` như một dimension/reference.

Lot lifecycle thuộc module phù hợp hơn như master data / inbound / VAS.

---

## Lỗi 5: Coi `availableQty` là dữ liệu gốc
`availableQty` chỉ là kết quả tính.  
Không nên thiết kế nó như bucket song song với ledger.

---

# 9. Luồng end-to-end mẫu để dev hình dung

## Ví dụ 1: Inbound đơn giản
1. PO confirmed → tăng `inboundOrderedQty`
2. Receipt created → chưa tăng tồn thật
3. Goods received → tăng `physicalQty`
4. Putaway completed → move nội bộ location

---

## Ví dụ 2: Outbound đơn giản
1. SO confirmed → tăng `outboundOrderedQty`
2. Allocation created → tăng `allocatedQty`
3. Pick confirmed → thay đổi vật lý nội bộ
4. Load confirmed → thay đổi vật lý tiếp
5. Ship confirmed → trừ tồn logic cuối cùng

---

## Ví dụ 3: VAS bagging
1. consume bulk rice → trừ nguyên liệu
2. produce bagged rice → cộng thành phẩm
3. waste nếu có → adjustment riêng

---

# 10. Kết luận để dev nhớ 1 câu

## Câu cần nhớ:
**M3 không quản lý business workflow, M3 chỉ chuẩn hóa ảnh hưởng tồn kho của business workflow.**

Hay nói cách khác:

- module khác quyết định nghiệp vụ đang đi đến bước nào
- M3 quyết định bước đó ảnh hưởng tồn kho theo stage nào
- mọi thay đổi tồn kho phải đi qua transaction, không sửa số tồn trực tiếp

---

# 11. Checklist dev đọc xong phải nắm được

- [ ] Hiểu `invent_trans` là source of truth
- [ ] Hiểu `on_hand` chỉ là projection
- [ ] Hiểu vì sao phải có 6 stage
- [ ] Hiểu inbound không tăng tồn ở mọi bước
- [ ] Hiểu outbound không trừ tồn ở mọi bước
- [ ] Hiểu allocation khác ship confirm
- [ ] Hiểu transfer có 2 đầu: issue + receipt
- [ ] Hiểu VAS là consume + produce + waste
- [ ] Hiểu `availableQty` là số tính ra, không phải bucket gốc
- [ ] Hiểu M3 không được ôm business logic của module khác
