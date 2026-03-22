# Module 2 - Master Data
## Tài liệu các điểm cần cải thiện để bám sát flow hiện tại

**Mục đích**
Tài liệu này tổng hợp các điểm cần cải thiện của Module 2 - Master Data để bám sát hơn với flow hiện tại của hệ thống, giảm rủi ro khi scale up, và làm rõ các hạng mục đội dev cần hoàn thiện.

---

## 1. Tóm tắt đánh giá

Module 2 hiện tại đã khá đầy đủ về mặt cấu trúc và đã bao phủ nhiều thực thể quan trọng như:
- Owner
- Customer
- Vendor
- Vessel
- Carrier
- Item
- Item Group
- Lot
- Warehouse / Zone / Location / Location Type
- UOM / UOM Conversion
- Vehicle Type
- Inventory Status
- Owner SKU Mapping
- Lookup / Dropdown Config

Điểm mạnh là module đã tiến gần tới mức dùng được cho vận hành thật, không còn chỉ là CRUD cơ bản.

Tuy nhiên, khi đối chiếu với flow chuẩn của chương trình, vẫn còn một số điểm chưa khớp hoàn toàn hoặc có rủi ro khi đưa vào production:
- Chưa thấy phần **Owner–Warehouse Access**
- Chưa thấy phần **Item Incompatibility**
- Một số **field business quan trọng** theo flow chưa được xác nhận rõ đã implement đầy đủ
- **Idempotency cho create operations** chưa được triển khai đầy đủ
- Có điểm **không nhất quán trong permission codes**
- Có điểm **không nhất quán giữa tài liệu soft delete và API delete**
- Cần làm rõ hơn các **business rules** để tránh chỉ có CRUD mà thiếu rule vận hành

---

## 2. Danh sách cải thiện theo mức ưu tiên

### Ưu tiên 1 - Cần làm sớm
1. Bổ sung Owner–Warehouse Access
2. Hoàn thiện idempotency cho create operations
3. Rà soát và sửa permission codes
4. Rà soát field business bắt buộc theo flow cho Owner / Item / Vehicle Type / Location

### Ưu tiên 2 - Nên làm tiếp theo
5. Bổ sung Item Incompatibility
6. Chuẩn hóa soft delete / delete semantics
7. Chuẩn hóa naming giữa docs, DTO, entity, API
8. Làm rõ business rules và validation rules

### Ưu tiên 3 - Nâng cao / hardening
9. Bổ sung acceptance criteria theo từng entity
10. Bổ sung integration contract cho các module downstream
11. Tăng cường uniqueness/index/constraint ở database
12. Bổ sung test cases cho retry, concurrency, deactivation safety

---

## 3. Chi tiết từng điểm cần cải thiện

---

## 3.1 Owner–Warehouse Access

### Vấn đề
Flow chuẩn có yêu cầu owner được cấu hình kho nào được phép sử dụng, bao gồm:
- gán warehouse access cho owner
- bỏ warehouse access khỏi owner
- màn hình owner detail có thể quản lý danh sách warehouse được phép dùng

Hiện Module 2 có Owner và Warehouse riêng, nhưng chưa thấy mô tả rõ API hoặc entity quan hệ này.

### Tại sao cần
Không phải owner nào cũng được hoạt động ở mọi warehouse.
Nếu không có lớp kiểm soát này:
- dễ nhập/xuất nhầm kho
- dễ lẫn dữ liệu giữa các owner
- khó scale khi số owner và warehouse tăng

### Rủi ro nếu không làm
- Sai nghiệp vụ nhưng hệ thống vẫn cho thao tác qua
- Dữ liệu đúng kỹ thuật nhưng sai vận hành
- Tăng khối lượng xử lý thủ công hoặc phải kiểm bằng quy trình ngoài hệ thống

### Đề xuất triển khai

#### Data model đề xuất
Tạo bảng trung gian, ví dụ:
- `owner_warehouse_access`
  - `id`
  - `owner_id`
  - `warehouse_id`
  - `is_active`
  - `created_at`
  - `created_by`
  - `updated_at`
  - `updated_by`

#### Ràng buộc đề xuất
- unique `(owner_id, warehouse_id)`
- chỉ cho gán nếu owner active và warehouse active
- không cho deactivate owner/warehouse mà bỏ qua validation access liên quan nếu business cần bảo toàn consistency

#### API đề xuất
- `POST /api/v1/master-data/owners/:id/warehouses`
- `DELETE /api/v1/master-data/owners/:id/warehouses/:warehouseId`
- `GET /api/v1/master-data/owners/:id/warehouses`

#### Validation đề xuất
- owner tồn tại và active
- warehouse tồn tại và active
- không tạo trùng mapping

### Acceptance criteria
- Có thể gán nhiều warehouse cho một owner
- Không thể gán warehouse inactive
- Không thể gán trùng owner + warehouse
- Các module downstream có thể kiểm tra owner có quyền dùng warehouse đó hay không

---

## 3.2 Idempotency cho create operations

### Vấn đề
Tài liệu hiện ghi rõ idempotency chưa được triển khai đầy đủ; mới chỉ có `externalId` ở CreateWarehouseDto.

### Tại sao cần
Trong môi trường thật, request có thể bị retry do:
- người dùng bấm submit nhiều lần
- frontend timeout rồi gọi lại
- gateway / queue / integration retry

Nếu không có idempotency:
- dễ tạo trùng master data
- khó cleanup dữ liệu
- ảnh hưởng downstream modules vì lookup ra nhiều record tương tự

### Rủi ro nếu không làm
- tạo trùng owner/item/warehouse/zone/location/carrier/vendor...
- sai báo cáo
- sai mapping ở các flow dùng lookup theo entity đang active
- phát sinh effort cleanup thủ công trong production

### Đề xuất triển khai

#### DTO
Thêm `externalId` hoặc `idempotencyKey` cho các create DTO quan trọng:
- CreateOwnerDto
- CreateCustomerDto
- CreateVendorDto
- CreateVesselDto
- CreateCarrierDto
- CreateItemDto
- CreateItemGroupDto
- CreateLotDto (nếu có create thủ công)
- CreateWarehouseDto
- CreateZoneDto
- CreateLocationDto
- CreateLocationTypeDto
- CreateUomDto
- CreateVehicleTypeDto
- CreateOwnerSkuMappingDto

#### Service
Áp dụng `IdempotencyService.executeIfKeyProvided()` thống nhất cho create operations.

#### Database
- unique index cho `external_id` theo phạm vi phù hợp
- làm rõ scope unique: theo tenant, theo entity type, hoặc theo command

### Acceptance criteria
- Cùng một request create với cùng idempotency key không tạo record mới lần thứ 2
- Response trả về đúng record đã tạo trước đó
- Retry không gây duplicate data

---

## 3.3 Rà soát và sửa Permission Codes

### Vấn đề
Trong tài liệu hiện tại có dấu hiệu permission code bị copy-paste sai ở một số entity:
- Vendor đang dùng permission của Owner
- Vessel đang dùng permission của Owner
- Carrier đang dùng permission của Owner
- OwnerSkuMapping đang dùng permission của Owner

### Tại sao cần
Permission sai sẽ gây ra một trong hai lỗi nguy hiểm:
- user có quyền không đúng nhưng vẫn thao tác được
- user đúng vai trò nhưng bị chặn thao tác

### Rủi ro nếu không làm
- sai phân quyền production
- khó audit vì action không phản ánh đúng nghiệp vụ
- tăng rủi ro bảo mật và vận hành

### Đề xuất triển khai
- Rà soát lại toàn bộ `@Permission()` trong controllers
- Chuẩn hóa naming permission theo pattern thống nhất, ví dụ:
  - `master_data.vendor.create`
  - `master_data.vendor.view`
  - `master_data.vendor.update`
  - `master_data.vendor.deactivate`
  - `master_data.vendor.reactivate`
- Đồng bộ giữa:
  - docs
  - code decorator
  - seed quyền / migration / RBAC config

### Acceptance criteria
- Mỗi entity có permission riêng đúng tên entity
- QA có thể test được từng quyền create/view/update/deactivate/reactivate theo role
- Docs và code khớp nhau

---

## 3.4 Rà soát field business bắt buộc theo flow

### Vấn đề
Flow chuẩn đang dùng một số field business quan trọng từ Master Data, nhưng tài liệu Module 2 chưa xác nhận rõ toàn bộ đã có.

### Các field cần rà soát

#### Owner
- `dual_tracking_enabled`
- `default_tolerance_pct`

#### Item
- `item_group_id`
- `cargo_form`
- `is_catch_weight`
- `tolerance_pct`
- `bag_shell_weight`
- `billing_uom`

#### Vehicle Type
- `default_tare_weight_kg`
- `max_payload_kg`

#### Location
- `is_billing_zone`
- `location_type`
- `capacity_mt`
- `is_mixed_owner`
- `is_mixed_item`

### Tại sao cần
Các field trên không chỉ để lưu dữ liệu mà còn được dùng bởi module khác:
- Inbound dùng tolerance
- Billing dùng billing_uom và is_billing_zone
- VAS dùng dual_tracking_enabled và cargo_form
- Weighbridge dùng vehicle tare/payload

### Rủi ro nếu không làm
- Có entity nhưng downstream không có đủ dữ liệu để chạy đúng rule
- Flow nhìn như đã khớp nhưng thực tế vẫn phải hardcode ở module khác
- Tăng technical debt giữa các module

### Đề xuất triển khai
- Lập checklist field-level cho từng entity
- So sánh giữa flow docs, Prisma schema, DTO, response model, UI form
- Chốt rõ field nào:
  - bắt buộc
  - optional
  - default value
  - conditional required

### Acceptance criteria
- Mỗi field business quan trọng có mặt đầy đủ từ DB -> DTO -> API -> service validation
- Downstream modules không cần hardcode fallback ngoài spec

---

## 3.5 Item Incompatibility

### Vấn đề
Flow chuẩn có nhắc đến item incompatibility, nhưng Module 2 hiện chưa thấy mô tả rõ entity/API này.

### Tại sao cần
Khi kho mở rộng và có nhiều loại hàng, sẽ có các quy tắc như:
- hàng này không được để cùng khu với hàng kia
- nhóm hàng này không được trộn với nhóm hàng khác

### Rủi ro nếu không làm
- hệ thống không chặn được xếp sai hàng
- phải kiểm soát bằng con người
- tăng nguy cơ sai vận hành, nhất là với hàng nhạy cảm

### Đề xuất triển khai

#### Data model đề xuất
- `item_incompatibility`
  - `id`
  - `item_id` hoặc `item_group_id`
  - `incompatible_with_item_id` hoặc `incompatible_with_group_id`
  - `rule_type`
  - `reason`
  - `is_active`

#### API đề xuất
- `POST /api/v1/master-data/item-incompatibilities`
- `GET /api/v1/master-data/item-incompatibilities`
- `PUT /api/v1/master-data/item-incompatibilities/:id`
- `DELETE /api/v1/master-data/item-incompatibilities/:id`

### Acceptance criteria
- Có thể định nghĩa cặp incompatibility
- Không cho tạo rule trùng/ngược chiều dư thừa nếu business muốn canonical form
- Downstream có thể query rule này để validate putaway / storage planning

---

## 3.6 Chuẩn hóa soft delete / delete semantics

### Vấn đề
Tài liệu hiện nói tất cả entity dùng soft delete, không có hard delete. Tuy nhiên trong API docs lại có một số endpoint dạng `DELETE`, ví dụ UOM Conversion, Location Type, Owner SKU Mapping.

### Tại sao cần
Nếu docs nói một kiểu, API làm kiểu khác, dev/QA/BA sẽ hiểu lệch nhau.

### Rủi ro nếu không làm
- user tưởng dữ liệu bị xóa hẳn nhưng thực tế chỉ inactive
- hoặc ngược lại, tưởng có thể restore nhưng dữ liệu đã hard delete
- dễ gây inconsistency ở audit log và lookup

### Đề xuất triển khai
- Chốt rõ 1 rule chung:
  - master data chính dùng soft delete
  - entity cấu hình phụ nào được hard delete thì phải ghi rõ ngoại lệ
- Đổi wording trong docs/API:
  - nếu soft delete: dùng từ `deactivate`
  - nếu hard delete: phải ghi rõ `permanent delete`
- Đồng bộ controller, service, audit log, response message

### Acceptance criteria
- Docs phản ánh đúng hành vi thật của API
- Mỗi entity biết rõ là soft delete hay hard delete
- QA có test case cho restore/reactivate nếu là soft delete

---

## 3.7 Chuẩn hóa naming giữa docs, DTO, entity, API

### Vấn đề
Hiện có vài dấu hiệu naming chưa đồng nhất, ví dụ:
- item group vs product group
- locationType field vs Location Type entity
- permission name theo owner cho entity khác

### Tại sao cần
Naming không đồng nhất là nguồn gốc của nhiều bug tích lũy:
- FE gọi sai field
- BE map sai dữ liệu
- QA test sai kỳ vọng
- BA và dev hiểu khác nhau

### Đề xuất triển khai
- Chốt glossary chính thức cho Master Data
- Chốt naming convention cho:
  - table/entity
  - DTO field
  - API path
  - permission code
  - audit entityType
- Tạo 1 mapping sheet để rà lại toàn module

### Acceptance criteria
- Không còn 2 tên khác nhau cho cùng một khái niệm nếu không có lý do rõ ràng
- Docs, code, API examples dùng cùng ngôn ngữ

---

## 3.8 Làm rõ business rules và validation rules

### Vấn đề
Tài liệu hiện mô tả API khá rõ, nhưng nhiều rule nghiệp vụ vẫn còn mỏng so với flow vận hành.

### Các rule nên làm rõ thêm
- Khi nào item được deactivate / không được deactivate
- Khi nào owner được deactivate / không được deactivate
- Điều kiện update lot nào được phép, field nào immutable
- Ràng buộc uniqueness cho owner SKU mapping
- Ràng buộc location capacity / mixing flags
- Ràng buộc conditional cho item theo cargo form
  - bagged thì bắt buộc có bag_shell_weight
- Ràng buộc active-state khi tạo mapping giữa các entity

### Tại sao cần
Không có rule rõ ràng thì mỗi dev có thể tự hiểu khác nhau, gây ra behavior không đồng nhất.

### Đề xuất triển khai
- Với mỗi entity, thêm section:
  - unique rules
  - FK rules
  - active-state rules
  - immutable fields
  - deactivation rules
  - downstream dependencies

### Acceptance criteria
- QA có thể viết test case từ docs mà không cần hỏi lại BA/dev
- Behavior giữa các service nhất quán

---

## 3.9 Hardening ở database

### Vấn đề
Khi scale up, chỉ dựa vào validate ở service là chưa đủ.

### Đề xuất
- thêm unique indexes cho các key nghiệp vụ
- thêm composite unique cho các mapping tables
- thêm check constraints nếu DB hỗ trợ
- thêm foreign key với on delete/on update policy rõ ràng
- thêm index cho lookup phổ biến: code, storerkey, sku, status, owner_id, warehouse_id

### Acceptance criteria
- Các ràng buộc quan trọng được enforce ở database
- Không thể tạo duplicate key do race condition chỉ vì validate ở app layer

---

## 3.10 Integration contract cho downstream modules

### Vấn đề
Module 2 là data foundation cho nhiều module khác. Nếu contract không rõ, module khác dễ tự hardcode.

### Đề xuất
Tạo section riêng mô tả Module 2 cung cấp gì cho:
- Inbound
- Inventory Engine
- Weighbridge
- Outbound
- Billing
- VAS
- Transfer

Ví dụ cần làm rõ:
- endpoint nào dùng cho lookup
- field nào downstream phải dựa vào
- field nào là source of truth
- cache policy nếu có

### Acceptance criteria
- Module downstream dùng chung contract, không tự diễn giải khác nhau

---

## 4. Khuyến nghị thứ tự triển khai

### Phase 1 - Bịt lỗ hổng vận hành
1. Sửa permission codes
2. Hoàn thiện idempotency
3. Bổ sung Owner–Warehouse Access
4. Rà soát field business bắt buộc

### Phase 2 - Bám flow đầy đủ hơn
5. Bổ sung Item Incompatibility
6. Chuẩn hóa soft delete semantics
7. Chuẩn hóa naming
8. Viết rõ business rules

### Phase 3 - Production hardening
9. DB constraints / unique indexes
10. Integration contract
11. Test cases cho retry / concurrency / restore / deactivate safety

---

## 5. Checklist gửi team dev

### Bắt buộc rà ngay
- [ ] Permission codes của Vendor / Vessel / Carrier / OwnerSkuMapping đã đúng chưa?
- [ ] Tất cả create DTO đã có externalId/idempotency key chưa?
- [ ] IdempotencyService đã được dùng thật trong create services chưa?
- [ ] Đã có Owner–Warehouse Access entity + API + validation chưa?
- [ ] Các field flow-critical của Owner / Item / VehicleType / Location đã có đủ từ DB đến API chưa?

### Nên rà tiếp
- [ ] Đã có Item Incompatibility chưa?
- [ ] Delete semantics của từng entity đã rõ soft vs hard chưa?
- [ ] Naming giữa docs / DTO / entity / API có đồng nhất chưa?
- [ ] Business rules đã đủ để QA test độc lập chưa?

### Hardening
- [ ] Unique indexes cho key nghiệp vụ đã đủ chưa?
- [ ] Mapping tables đã có composite unique chưa?
- [ ] Có test cho duplicate submit / retry / race condition chưa?
- [ ] Có integration contract cho downstream modules chưa?

---

## 6. Kết luận

Module 2 hiện tại đã khá tốt và gần flow hơn nhiều so với giai đoạn trước. Tuy nhiên để nói là bám flow đầy đủ và sẵn sàng production hơn, cần tập trung cải thiện ở 4 nhóm chính:

1. **Hoàn thiện kiểm soát vận hành**: Owner–Warehouse Access
2. **Hoàn thiện an toàn dữ liệu**: idempotency, DB constraints, delete semantics
3. **Hoàn thiện tính đúng flow**: field business, item incompatibility, integration contract
4. **Hoàn thiện tính nhất quán**: permission codes, naming, business rules

Nếu team dev hoàn thiện các điểm trên, Module 2 sẽ chuyển từ mức “khá đầy đủ về CRUD và entity” sang mức “làm nền đáng tin cậy cho toàn bộ flow vận hành kho”.
