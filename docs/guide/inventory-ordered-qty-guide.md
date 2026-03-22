# Inventory Module (M3) – Guide triển khai 2 loại Ordered Quantity trong `on_hand`

## Mục tiêu tài liệu
Tài liệu này giải thích cho dev non-business hiểu vì sao `on_hand` của M3 **không đủ** nếu chỉ có:

- `physicalQty`
- `allocatedQty` hoặc `reservedQty`
- `availableQty`

Để đúng flow chuẩn, M3 phải bổ sung thêm 2 bucket quan trọng:

- `inboundOrderedQty`
- `outboundOrderedQty`

Tài liệu này tập trung vào:
- ordered qty là gì
- vì sao cần
- mỗi module nào làm tăng/giảm
- cách implement trong M3
- các lỗi dev hay mắc

---

# 1. Vấn đề hiện tại

Nếu `on_hand` chỉ có:

- `physicalQty`
- `allocatedQty`
- `availableQty`

thì hệ thống chỉ trả lời tốt câu hỏi:

- hiện tại kho có thật bao nhiêu hàng?
- bao nhiêu hàng đã bị giữ chỗ?

Nhưng chưa trả lời được:

- có bao nhiêu hàng **sắp nhập về**?
- có bao nhiêu hàng **đã có nhu cầu xuất**?
- nhu cầu tương lai của item này là bao nhiêu?
- PO/SO đã confirm nhưng chưa nhận/chưa xuất đang ảnh hưởng gì tới kế hoạch tồn kho?

Điều này làm inventory engine chưa đúng flow chuẩn.

---

# 2. Ordered Quantity là gì

## 2.1 `inboundOrderedQty`
Đây là số lượng **đã được xác nhận sẽ nhập về trong tương lai**, nhưng **chưa thành tồn vật lý**.

Dev nên hiểu nó là:

> “hàng đang trên kế hoạch nhập”

Ví dụ:
- đã confirm PO 100 bao
- nhưng xe chưa tới
- kho chưa nhận thực tế

Thì:
- `physicalQty` chưa tăng
- nhưng `inboundOrderedQty` phải tăng 100

---

## 2.2 `outboundOrderedQty`
Đây là số lượng **đã có nhu cầu phải xuất trong tương lai**, nhưng **chưa trừ tồn vật lý ngay**.

Dev nên hiểu nó là:

> “hàng đã có demand xuất”

Ví dụ:
- đã confirm SO 50 bao
- nhưng chưa allocate
- chưa pick
- chưa ship

Thì:
- `physicalQty` chưa giảm
- nhưng `outboundOrderedQty` phải tăng 50

---

# 3. Vì sao cần 2 bucket này

## 3.1 Để phân biệt “có thật” và “sắp xảy ra”
Inventory chuẩn không chỉ theo dõi hiện tại, mà còn phải nhìn trước nhu cầu gần tương lai.

Nếu thiếu `inboundOrderedQty` và `outboundOrderedQty`, hệ thống sẽ không biết:

- hàng nào đang trên đường về
- hàng nào đã có cam kết sẽ xuất

---

## 3.2 Để hỗ trợ planning và quyết định nghiệp vụ
Các module khác hoặc report có thể cần biết:

- item này đang thiếu thật hay chỉ là hàng chưa về?
- item này còn nhiều physical nhưng đã có nhiều demand outbound chưa?
- có cần mua thêm không?
- có over-commit không?

Nếu chỉ nhìn `physicalQty`, dev sẽ hiểu sai thực trạng.

---

## 3.3 Để đúng ngữ nghĩa lifecycle
Trong flow chuẩn:

- `EXPECTED` không làm tăng/giảm tồn vật lý
- nhưng vẫn phải tạo ảnh hưởng lên inventory state

Cho nên ordered qty chính là nơi chứa ảnh hưởng của stage `EXPECTED`.

---

# 4. 4 bucket chuẩn trong `on_hand`

Sau khi chỉnh, `on_hand` nên có ít nhất 4 bucket chuẩn:

## 4.1 `physicalQty`
Hàng đang có thật tại location/dimension đó.

---

## 4.2 `allocatedQty`
Hàng đã bị giữ chỗ cho outbound hoặc nhu cầu đã commit.

---

## 4.3 `inboundOrderedQty`
Hàng dự kiến sẽ nhập.

---

## 4.4 `outboundOrderedQty`
Hàng đã có nhu cầu sẽ xuất.

---

## 4.5 `availableQty` chỉ là giá trị tính ra
`availableQty` không phải bucket gốc.

Thông thường:

```text
availableQty = physicalQty - allocatedQty
```

Sau này có thể thêm rule khác như:
- blocked
- quality hold
- non-allocatable status

Cho nên:
- 4 bucket trên là source state
- `availableQty` là output tính toán

---

# 5. Module nào làm tăng/giảm ordered qty

---

## 5.1 Inbound làm việc với `inboundOrderedQty`

### Bước 1: PO confirmed
Ý nghĩa:
- công ty đã xác nhận sẽ nhập hàng

Tác động:
- tăng `inboundOrderedQty`

Ví dụ:
- confirm PO 100 bao
- `inboundOrderedQty += 100`

Đây là bước stage `EXPECTED`.

---

### Bước 2: Receipt created
Ý nghĩa:
- đã tạo chứng từ nhận hàng
- nhưng chưa nhận thực tế

Tác động:
- thường **không đổi** `inboundOrderedQty`
- chỉ ghi transaction stage `REGISTERED`

Lý do:
- hàng vẫn đang trong trạng thái “sắp về”, chưa thành tồn thật

---

### Bước 3: Goods received
Ý nghĩa:
- hàng đã được nhận vật lý

Tác động:
- `physicalQty += qty`
- `inboundOrderedQty -= qty`

Lý do:
- phần “sắp về” đã chuyển thành “đã có thật”

Ví dụ:
- trước đó inboundOrdered = 100
- nhận thực tế 60
- sau bước này:
  - `physicalQty += 60`
  - `inboundOrderedQty -= 60`

---

### Bước 4: Receipt cancel / PO reduce / short receive
Nếu PO bị giảm hoặc receive ít hơn expected, cần giảm phần ordered còn dư.

Ví dụ:
- PO xác nhận 100
- thực tế chỉ nhận 90, 10 bị cancel
- `inboundOrderedQty` phải giảm nốt 10 còn lại bằng flow điều chỉnh phù hợp

### Kết luận cho inbound
`inboundOrderedQty` đại diện cho phần:
- đã hứa nhập
- chưa thành hàng thật

---

## 5.2 Outbound làm việc với `outboundOrderedQty`

### Bước 1: SO confirmed
Ý nghĩa:
- đã có nhu cầu xuất hàng

Tác động:
- tăng `outboundOrderedQty`

Ví dụ:
- confirm SO 50 bao
- `outboundOrderedQty += 50`

Đây là bước stage `EXPECTED`.

---

### Bước 2: Allocation created
Ý nghĩa:
- giữ chỗ hàng cho nhu cầu xuất

Tác động:
- tăng `allocatedQty`
- thường **không giảm** `outboundOrderedQty` ở bước này

Lý do:
- demand outbound vẫn còn tồn tại
- allocation chỉ là giữ chỗ cho demand đó

---

### Bước 3: Ship confirmed
Ý nghĩa:
- nhu cầu xuất đã hoàn tất

Tác động:
- `outboundOrderedQty -= qty`
- phần tồn vật lý sẽ được xử lý theo logic physical/deducted

Lý do:
- demand này không còn là “nhu cầu tương lai” nữa
- nó đã hoàn tất xuất

---

### Bước 4: SO cancel / line reduce
Nếu đơn bị hủy hoặc giảm số lượng trước khi ship xong, cần giảm:
- `outboundOrderedQty`

Ví dụ:
- SO từ 50 giảm còn 30
- phải giảm ordered 20

### Kết luận cho outbound
`outboundOrderedQty` đại diện cho phần:
- đã có nhu cầu xuất
- nhưng chưa hoàn tất việc xuất đó

---

# 6. Ordered qty khác allocated như thế nào

Dev hay nhầm 2 khái niệm này.

## 6.1 `outboundOrderedQty`
Là **nhu cầu xuất**.

Ví dụ:
- đơn cần 100 bao

---

## 6.2 `allocatedQty`
Là **phần hàng thật đã bị giữ chỗ** để phục vụ nhu cầu đó.

Ví dụ:
- đơn cần 100
- mới allocate được 60

Thì:
- `outboundOrderedQty = 100`
- `allocatedQty = 60`

Tức là:
- ordered nói về demand
- allocated nói về reservation thật trên stock

---

# 7. Ordered qty khác physical như thế nào

## 7.1 `physicalQty`
Là hàng đang có thật trong kho.

## 7.2 `inboundOrderedQty`
Là hàng chưa có thật nhưng đã confirm sẽ nhập.

## 7.3 `outboundOrderedQty`
Là hàng chưa rời kho nhưng đã có nhu cầu xuất.

Điều này giúp hệ thống nhìn được:
- thực tại
- tương lai gần inbound
- tương lai gần outbound

---

# 8. Mapping stage với ordered qty

## 8.1 Stage `EXPECTED`
Đây là stage gắn trực tiếp với ordered qty.

### Inbound
- `RECEIPT + EXPECTED`
- làm tăng `inboundOrderedQty`

### Outbound
- `ISSUE + EXPECTED`
- làm tăng `outboundOrderedQty`

---

## 8.2 Stage `REGISTERED`
Không nhất thiết làm đổi ordered qty.

Nó chỉ là bước tạo chứng từ trung gian.

---

## 8.3 Stage `PHYSICAL`
Có thể làm chuyển dịch giữa ordered và physical.

### Ví dụ inbound
- hàng nhận thực tế
- giảm `inboundOrderedQty`
- tăng `physicalQty`

---

## 8.4 Stage `DEDUCTED`
Có thể làm giảm `outboundOrderedQty` khi nghiệp vụ xuất hoàn tất.

---

# 9. Đề xuất model dữ liệu `on_hand`

## 9.1 Field tối thiểu nên có
Ví dụ:

```js
{
  itemId,
  inventDimId,
  physicalQty,
  allocatedQty,
  inboundOrderedQty,
  outboundOrderedQty,
  updatedAt
}
```

### Không nên giữ `reservedQty`
Nếu mục tiêu là khớp flow chuẩn 100%:
- đổi `reservedQty` thành `allocatedQty`

### `availableQty` nên là computed field
Ví dụ response API có thể trả:

```js
{
  itemId,
  inventDimId,
  physicalQty,
  allocatedQty,
  inboundOrderedQty,
  outboundOrderedQty,
  availableQty: physicalQty - allocatedQty
}
```

---

# 10. Đề xuất rule materialization từ `invent_trans`

M3 không nên update tay từng bucket ở nhiều nơi rời rạc.

Nên có quy tắc thống nhất:
- mỗi `invent_trans` sinh ra delta
- materializer cộng dồn delta vào `on_hand`

---

## 10.1 Delta rule gợi ý

### Với inbound expected
- `RECEIPT + EXPECTED` → `deltaInboundOrdered = +qty`

### Với inbound physical receive
- `RECEIPT + PHYSICAL` →  
  - `deltaPhysical = +qty`
  - `deltaInboundOrdered = -qty`

### Với outbound expected
- `ISSUE + EXPECTED` → `deltaOutboundOrdered = +qty`

### Với outbound allocated
- `ISSUE + ALLOCATED` → `deltaAllocated = +qty`

### Với outbound de-allocated
- `ISSUE + DE_ALLOCATED` → `deltaAllocated = -qty`

### Với outbound deducted / ship confirmed
- `ISSUE + DEDUCTED` →  
  - `deltaPhysical = -qty`
  - `deltaOutboundOrdered = -qty`

> Lưu ý: chi tiết `PHYSICAL` ở outbound có thể còn phụ thuộc cách bạn biểu diễn pick/load theo location.
> Nhưng ở mức bucket tổng, `DEDUCTED` là điểm tối thiểu phải giảm outbound ordered.

---

# 11. Pseudo logic cho dev

## 11.1 Mapping inventory effect

```js
function getInventoryDelta(transType, stage, qty) {
  if (transType === 'RECEIPT' && stage === 'EXPECTED') {
    return {
      deltaPhysical: 0,
      deltaAllocated: 0,
      deltaInboundOrdered: qty,
      deltaOutboundOrdered: 0,
    };
  }

  if (transType === 'RECEIPT' && stage === 'PHYSICAL') {
    return {
      deltaPhysical: qty,
      deltaAllocated: 0,
      deltaInboundOrdered: -qty,
      deltaOutboundOrdered: 0,
    };
  }

  if (transType === 'ISSUE' && stage === 'EXPECTED') {
    return {
      deltaPhysical: 0,
      deltaAllocated: 0,
      deltaInboundOrdered: 0,
      deltaOutboundOrdered: qty,
    };
  }

  if (transType === 'ISSUE' && stage === 'ALLOCATED') {
    return {
      deltaPhysical: 0,
      deltaAllocated: qty,
      deltaInboundOrdered: 0,
      deltaOutboundOrdered: 0,
    };
  }

  if (transType === 'ISSUE' && stage === 'DE_ALLOCATED') {
    return {
      deltaPhysical: 0,
      deltaAllocated: -qty,
      deltaInboundOrdered: 0,
      deltaOutboundOrdered: 0,
    };
  }

  if (transType === 'ISSUE' && stage === 'DEDUCTED') {
    return {
      deltaPhysical: -qty,
      deltaAllocated: 0,
      deltaInboundOrdered: 0,
      deltaOutboundOrdered: -qty,
    };
  }

  return {
    deltaPhysical: 0,
    deltaAllocated: 0,
    deltaInboundOrdered: 0,
    deltaOutboundOrdered: 0,
  };
}
```

---

# 12. Các lỗi implement phổ biến cần tránh

## Lỗi 1: Chỉ quản lý physical và allocated
Đây là lỗi thiếu logic planning.

Khi đó hệ thống không thấy:
- hàng sắp nhập
- hàng đã có demand xuất

---

## Lỗi 2: Nhầm ordered với allocated
Ordered không phải giữ chỗ.
Allocated không phải demand.

- ordered = nhu cầu / kế hoạch
- allocated = reservation trên stock thật

---

## Lỗi 3: Goods received chỉ tăng physical mà không giảm inbound ordered
Nếu quên bước này:
- hệ thống sẽ vừa nghĩ hàng đã có thật
- vừa nghĩ hàng vẫn đang sắp về

Làm double count logic.

---

## Lỗi 4: Ship confirmed chỉ giảm physical mà không giảm outbound ordered
Nếu quên:
- demand outbound sẽ bị treo mãi
- số planned outbound bị sai

---

## Lỗi 5: Coi `availableQty` là bucket chính
Không nên lưu business logic vào `availableQty` như một state độc lập.
Nó phải là số tính ra từ bucket gốc.

---

## Lỗi 6: Không xử lý cancel / reduce / short receive
Ordered qty không chỉ tăng.
Nó cũng phải giảm khi:
- PO bị hủy / giảm
- SO bị hủy / giảm
- receive thiếu và phần còn lại bị close
- shipment bị close nhỏ hơn expected

---

# 13. Checklist dev cần implement

## Bắt buộc
- [ ] Thêm field `inboundOrderedQty` vào `on_hand`
- [ ] Thêm field `outboundOrderedQty` vào `on_hand`
- [ ] Đổi `reservedQty` thành `allocatedQty`
- [ ] Giữ `availableQty` là computed field
- [ ] Map stage `EXPECTED` vào ordered qty
- [ ] Khi inbound physical xảy ra, giảm `inboundOrderedQty`
- [ ] Khi outbound deducted xảy ra, giảm `outboundOrderedQty`
- [ ] Xử lý cancel / reduce / close để ordered qty không bị treo

---

## Nên có
- [ ] Có inventory delta function thống nhất
- [ ] Có reversal logic cho ordered qty
- [ ] Có reconciliation check giữa ordered state và transaction history

---

# 14. Kết luận để dev nhớ 1 câu

## Câu cần nhớ:
**`physicalQty` cho biết hàng đang có thật, còn `inboundOrderedQty` và `outboundOrderedQty` cho biết tương lai gần đang hứa sẽ nhập gì và sẽ xuất gì.**

Hay nói cách khác:

- `physicalQty` = hiện tại
- `inboundOrderedQty` = sắp vào
- `outboundOrderedQty` = sắp ra
- `allocatedQty` = phần đã giữ chỗ

Chỉ khi có đủ 4 bucket này, `on_hand` mới phản ánh đúng flow inventory chuẩn.
