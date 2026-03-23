# Guide kiểm tra lỗi: **Deactivate master data khi còn tồn kho**

## 1. Mục tiêu tài liệu
Tài liệu này dùng để gửi cho team dev kiểm tra lại code của Module Master Data, để đảm bảo hệ thống **không cho phép deactivate (tắt/soft delete)** các master data quan trọng khi vẫn còn tồn kho liên quan.

Đây là lỗi nghiệp vụ quan trọng vì nếu thiếu rule chặn này, hệ thống có thể vẫn chạy nhưng sẽ phát sinh sai lệch dữ liệu âm thầm, rất khó sửa về sau.

---

## 2. Mô tả lỗi một cách dễ hiểu

### 2.1 Lỗi là gì?
Hệ thống cho phép người dùng deactivate một đối tượng master data như:
- Owner
- Item
- Location
- Zone
- Warehouse

trong khi hàng hóa thực tế vẫn còn tồn kho gắn với đối tượng đó.

### 2.2 Ví dụ dễ hiểu
- Owner A vẫn còn hàng trong kho
- nhưng người dùng vẫn bấm deactivate Owner A thành công

Kết quả:
- hàng vẫn còn
- nhưng “chủ hàng” đã bị tắt
- các module sau không biết phải xử lý dữ liệu đó thế nào

Tương tự:
- Item vẫn còn on-hand nhưng vẫn deactivate được
- Location vẫn còn chứa stock nhưng vẫn deactivate được
- Zone/Warehouse còn location đang có stock nhưng vẫn deactivate được

---

## 3. Vì sao đây là lỗi nghiêm trọng?

### 3.1 Ảnh hưởng dữ liệu
Nếu master data bị deactivate khi còn tồn kho, có thể gây ra:
- lệch tồn kho
- mất khả năng truy vết hàng
- báo cáo sai
- billing sai phí
- outbound / transfer lỗi logic
- khó audit và rất khó debug

### 3.2 Tính chất nguy hiểm
Đây là loại lỗi:
- không phải lúc nào cũng nổ ngay
- nhưng khi phát hiện thì thường đã ảnh hưởng sang nhiều module
- sửa muộn rất tốn công vì phải xử lý dữ liệu đã sai từ trước

---

## 4. Hành vi đúng mong muốn (expected behavior)

### 4.1 Rule tối thiểu bắt buộc
Hệ thống phải **chặn deactivate** nếu đối tượng vẫn còn tồn kho liên quan.

#### Owner
Không được deactivate Owner nếu vẫn còn bất kỳ stock on-hand nào thuộc owner đó.

#### Item
Không được deactivate Item nếu vẫn còn bất kỳ stock on-hand nào của item đó.

### 4.2 Rule mở rộng nên có
Ngoài Owner và Item, nên kiểm tra thêm:

#### Location
Không được deactivate Location nếu location đó vẫn còn stock.

#### Zone
Không được deactivate Zone nếu:
- vẫn còn location active bên trong, hoặc
- vẫn còn stock tại các location thuộc zone đó

#### Warehouse
Không được deactivate Warehouse nếu:
- vẫn còn zone active bên trong, hoặc
- vẫn còn location active bên trong, hoặc
- vẫn còn stock trong warehouse đó

---

## 5. Flow chuẩn cần tuân theo
Theo flow master data chuẩn:
- soft delete only, không hard delete
- khi deactivate phải check active inventory trước
- không được deactivate owner khi `on_hand > 0`
- không được deactivate item khi `on_hand > 0`

Ý nghĩa là:
- endpoint deactivate không được chỉ update `isActive = false`
- phải có bước kiểm tra stock liên quan trước khi update

---

## 6. Biểu hiện cho thấy code có thể đang thiếu rule này
Team dev nên kiểm tra lại nếu hiện tại code có dấu hiệu như sau:

### 6.1 Ở service deactivate chỉ update cờ active
Ví dụ kiểu logic:

```ts
return this.prisma.mdOwner.update({
  where: { id },
  data: { isActive: false },
});
```

Nếu chỉ có update như trên mà không có check tồn kho trước đó thì khả năng cao là đang thiếu rule.

### 6.2 Chỉ check quan hệ con, chưa check stock
Ví dụ:
- Warehouse deactivate chỉ check còn zone active không
- Zone deactivate chỉ check còn location active không

Nhưng chưa check tồn kho thực tế thì vẫn chưa đủ.

### 6.3 Chỉ chặn ở UI, không chặn ở backend
Nếu frontend disable nút deactivate nhưng backend API vẫn cho gọi thành công thì vẫn là lỗi.

Rule này phải nằm ở backend/service, không được chỉ dựa vào frontend.

---

## 7. Các nơi dev cần kiểm tra trong code
Dựa trên cấu trúc module hiện tại, nên kiểm tra tối thiểu các file sau:

### 7.1 Services
- `services/owner.service.ts`
- `services/item.service.ts`
- `services/location.service.ts`
- `services/zone.service.ts`
- `services/warehouse.service.ts`

### 7.2 Repositories / truy vấn DB
- `repositories/owner.repository.ts`
- `repositories/item.repository.ts`
- `repositories/location.repository.ts`
- hoặc các truy vấn trực tiếp bằng Prisma trong service

### 7.3 Controller
- endpoint deactivate / reactivate của các entity trên

### 7.4 Inventory module / bảng tồn kho
Dev cần xác định rõ dữ liệu “tồn kho hiện tại” đang lấy từ đâu, ví dụ:
- bảng inventory snapshot
- bảng inventory balance
- bảng stock ledger đã aggregate
- materialized view tồn kho hiện tại

Điểm quan trọng là phải có một nguồn dữ liệu đáng tin cậy để check `on_hand > 0`.

---

## 8. Dev cần kiểm tra đúng câu hỏi nào?

### Với Owner
- Khi gọi deactivate owner, code có query check tổng on-hand của owner đó không?
- Có lọc đúng theo tenant không?
- Có chỉ tính stock active / available hiện tại không?
- Có block transaction nếu on-hand > 0 không?

### Với Item
- Khi gọi deactivate item, code có check on-hand của item đó không?
- Có tính cả stock ở nhiều warehouse/location khác nhau không?
- Có bỏ sót stock đang hold/damage/in-transit không? (tùy rule business của hệ thống)

### Với Location
- Có check location còn stock không?
- Có check cả allocated / reserved nếu business coi đó là tồn liên quan không?

### Với Zone/Warehouse
- Ngoài check zone/location active, có check stock thực tế không?
- Nếu stock nằm sâu ở location con thì deactivate cha có bị chặn không?

---

## 9. Logic mong muốn ở backend

### 9.1 Nguyên tắc
Flow đúng phải là:
1. tìm entity cần deactivate
2. validate entity tồn tại và đang active
3. kiểm tra tồn kho liên quan
4. nếu còn stock thì throw business error
5. nếu không còn stock thì mới update `isActive = false`
6. ghi audit log

### 9.2 Pseudocode cho Owner

```ts
async deactivateOwner(id: string, ctx: RequestContext) {
  return this.prisma.$transaction(async (tx) => {
    const owner = await tx.mdOwner.findUnique({ where: { id } });
    if (!owner) throw new NotFoundException('Owner not found');
    if (!owner.isActive) return owner;

    const onHandQty = await inventoryQuery.sumOnHandByOwner(tx, owner.id, ctx.tenantId);

    if (onHandQty > 0) {
      throw new BadRequestException(
        'Cannot deactivate owner because inventory still exists'
      );
    }

    const updated = await tx.mdOwner.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: ctx.userId,
      },
    });

    return updated;
  });
}
```

### 9.3 Pseudocode cho Item

```ts
async deactivateItem(id: string, ctx: RequestContext) {
  return this.prisma.$transaction(async (tx) => {
    const item = await tx.mdItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (!item.isActive) return item;

    const onHandQty = await inventoryQuery.sumOnHandByItem(tx, item.id, ctx.tenantId);

    if (onHandQty > 0) {
      throw new BadRequestException(
        'Cannot deactivate item because inventory still exists'
      );
    }

    return tx.mdItem.update({
      where: { id },
      data: { isActive: false },
    });
  });
}
```

---

## 10. Nên check tồn kho theo cách nào?

### 10.1 Cách đúng về mặt nghiệp vụ
Dùng nguồn dữ liệu thể hiện **on-hand hiện tại**.

Ví dụ có thể là:
- bảng balance hiện tại
- bảng inventory summary
- view tổng hợp stock hiện tại

### 10.2 Không nên làm
Không nên chỉ check:
- phiếu inbound đã tạo
- receipt đã tạo
- transaction history thô

vì các nguồn này không phản ánh trực tiếp tồn kho hiện tại.

### 10.3 Điều kiện check gợi ý
Dev cần thống nhất rõ với business thế nào là “còn tồn kho”. Thông thường nên check:
- `on_hand_qty > 0`

Tùy thiết kế hệ thống, có thể cần cân nhắc thêm:
- available
- allocated
- hold
- damaged
- in transit nội bộ

Khuyến nghị thực tế:
- ít nhất phải chặn theo **tổng on-hand thực tế > 0**
- sau đó mới mở rộng thêm theo rule chi tiết nếu cần

---

## 11. Các lỗi triển khai thường gặp

### 11.1 Chỉ check ở FE
Sai vì có thể bypass bằng API/Postman.

### 11.2 Check thiếu tenant
Nếu query không lọc `tenantId`, rất dễ block nhầm hoặc lọt nhầm dữ liệu giữa tenant.

### 11.3 Check sai nguồn tồn kho
Ví dụ check bảng movement nhưng không check bảng balance.

### 11.4 Không dùng transaction
Nếu check stock và update active tách rời, có thể gặp race condition:
- lúc check thì stock = 0
- ngay sau đó có transaction nhập hàng
- rồi vẫn deactivate thành công

### 11.5 Chỉ check owner/item, bỏ sót location/zone/warehouse
Dễ tạo ra dữ liệu cha bị deactivate nhưng dữ liệu con vẫn còn stock.

### 11.6 Cho reactivate/deactivate không đồng nhất
Có nơi dùng rule chặt, có nơi không dùng, khiến hành vi hệ thống không nhất quán.

---

## 12. Hướng sửa khuyến nghị cho dev

## 12.1 Mức tối thiểu bắt buộc
Cần sửa ngay nếu chưa có:
- `owner.service.ts` deactivate phải check tồn kho theo owner
- `item.service.ts` deactivate phải check tồn kho theo item

## 12.2 Mức nên bổ sung tiếp
- `location.service.ts` deactivate check stock theo location
- `zone.service.ts` deactivate check stock thuộc zone
- `warehouse.service.ts` deactivate check stock thuộc warehouse

## 12.3 Tách hàm dùng chung
Nên tạo service/hàm dùng chung kiểu:

```ts
inventoryGuard.ensureNoOnHandByOwner(ownerId, tenantId)
inventoryGuard.ensureNoOnHandByItem(itemId, tenantId)
inventoryGuard.ensureNoOnHandByLocation(locationId, tenantId)
```

Ưu điểm:
- logic tập trung
- dễ test
- dễ tái sử dụng
- tránh mỗi service tự viết một kiểu

---

## 13. Error message nên trả về
Nên dùng message rõ ràng để người dùng hiểu vì sao bị chặn.

Ví dụ:
- `Cannot deactivate owner because inventory still exists.`
- `Cannot deactivate item because on-hand quantity is greater than zero.`
- `Cannot deactivate location because stock still exists in this location.`
- `Cannot deactivate warehouse because inventory still exists in child locations.`

Nếu muốn thân thiện hơn, có thể trả thêm metadata:
- tổng qty còn lại
- số location còn hàng
- mã item / owner liên quan

---

## 14. Test case dev/QA nên chạy

### 14.1 Owner

#### Case 1 - còn hàng
- Tạo owner A
- Tạo item thuộc owner A
- Sinh tồn kho on-hand > 0
- Gọi deactivate owner A
- Kỳ vọng: bị chặn, trả lỗi 400

#### Case 2 - hết hàng
- Owner A đã từng có hàng nhưng hiện on-hand = 0
- Gọi deactivate owner A
- Kỳ vọng: thành công

### 14.2 Item

#### Case 3 - item còn hàng ở 1 location
- Item X có on-hand > 0 tại location L1
- Deactivate item X
- Kỳ vọng: bị chặn

#### Case 4 - item không còn hàng
- on-hand = 0 toàn hệ thống
- Deactivate item X
- Kỳ vọng: thành công

### 14.3 Location

#### Case 5 - location còn hàng
- location L1 còn stock
- Deactivate location L1
- Kỳ vọng: bị chặn

### 14.4 Zone / Warehouse

#### Case 6 - warehouse không còn zone active nhưng vẫn còn stock
- stock vẫn nằm ở location cũ
- Deactivate warehouse
- Kỳ vọng: vẫn phải bị chặn

### 14.5 Security / API bypass

#### Case 7 - bypass frontend
- gọi API trực tiếp bằng Postman
- nếu còn hàng thì backend vẫn phải chặn

### 14.6 Multi-tenant

#### Case 8 - tenant A có hàng, tenant B không có
- Deactivate owner/item của tenant B
- Kỳ vọng: không bị ảnh hưởng bởi dữ liệu tenant A

---

## 15. Checklist ngắn để gửi dev

### Checklist kiểm tra nhanh
- [x] Deactivate owner có check on-hand theo owner chưa? — ✅ check 4 buckets (physical, allocated, inboundOrdered, outboundOrdered)
- [x] Deactivate item có check on-hand theo item chưa? — ✅ check 4 buckets
- [x] Deactivate location có check stock chưa? — ✅ check 4 buckets via inventDim.locationId
- [x] Deactivate zone có check stock chưa? — ✅ check active locations + 4 buckets via inventDim.location.zoneId
- [x] Deactivate warehouse có check stock chưa? — ✅ check active zones + 4 buckets via inventDim.warehouseId
- [x] Check và update có nằm trong transaction chưa? — ✅ `prisma.$transaction()` + optimistic lock
- [x] Backend có trả business error rõ ràng chưa? — ✅ message tiếng Việt chi tiết
- [x] Có audit log khi deactivate chưa? — ✅ `logService.createAuditLog()` cho owner, item, location, zone, warehouse
- [ ] Query check tồn kho có lọc đúng tenant chưa? — N/A (single-tenant hiện tại)
- [ ] Có test case cho trường hợp còn hàng chưa? — 🔜 cần viết
- [ ] Có test API bypass ngoài frontend chưa? — 🔜 cần viết

---

## 16. Mức độ ưu tiên sửa

### Ưu tiên 1 - bắt buộc sửa ngay
- Owner deactivate rule
- Item deactivate rule

### Ưu tiên 2 - nên sửa tiếp ngay sau đó
- Location deactivate rule
- Zone deactivate rule
- Warehouse deactivate rule

Lý do:
- Owner và Item là master data lõi, ảnh hưởng gần như toàn bộ flow
- Location/Zone/Warehouse là lớp vận hành kho, rất quan trọng để tránh dữ liệu cha bị tắt khi hàng vẫn còn nằm bên dưới

---

## 17. Kết luận
Lỗi này không phải lỗi giao diện nhỏ, mà là lỗi **business rule / data integrity** rất quan trọng.

Nếu hệ thống cho deactivate master data khi còn tồn kho thì hậu quả có thể lan sang:
- inventory
- inbound/outbound
- transfer
- billing
- reporting
- audit

Khuyến nghị cho team dev:
1. kiểm tra ngay code deactivate của Owner và Item
2. nếu chưa có rule check on-hand thì bổ sung ngay ở backend
3. dùng transaction để tránh race condition
4. bổ sung test case để tránh tái phát
5. mở rộng kiểm tra sang Location, Zone, Warehouse

---

## 18. Gợi ý phân công cho dev

### Backend
- rà lại service deactivate của owner/item/location/zone/warehouse
- chuẩn hóa inventory check helper
- thêm transaction nếu chưa có
- chuẩn hóa error response

### QA
- viết test case theo danh sách ở mục 14
- test cả UI và gọi API trực tiếp
- test multi-tenant

### Tech lead / reviewer
- xác nhận “nguồn dữ liệu tồn kho hiện tại” là bảng/view nào
- xác nhận definition của `on_hand > 0`
- đảm bảo rule nằm ở backend chứ không chỉ ở frontend

