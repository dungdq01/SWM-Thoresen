# TVL SWM — Module Specification
# Module 2: Master Data Management

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Product Owner + Business Analyst  
**Phiên bản:** 1.0  
**Ngày:** 08/03/2026  
**Trạng thái:** Draft for Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Billing Lead, Key User

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Master Data Management** của hệ thống SWM. Đây là module dữ liệu nền để toàn hệ thống biết đang quản lý **chủ hàng nào, nhà cung cấp nào, mặt hàng nào, kho nào, vị trí nào, trạng thái tồn kho nào và tham số billing nào**.

Nếu Module 1 giúp hệ thống biết **ai được làm gì và theo luật nào**, thì Module 2 giúp hệ thống biết **đang quản lý cái gì, với thuộc tính nào, giới hạn nào và cách tham chiếu nào**.

Tài liệu được viết theo hướng:
- Người business hiểu vì sao master data là nền của vận hành và billing.
- Dev/QA có thể bóc tiếp FS, API contract, DB design, import validation, test scenario.
- Team dự án có baseline rõ giữa **master data vận hành**, **master data inventory** và **master data billing/commercial**.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Master Data Management là Module 2**.

Module này không trực tiếp post tồn kho, không trực tiếp tạo billing event, nhưng là nguồn dữ liệu nền cho tất cả module còn lại:
- M3 cần dimensions và status để tạo InventDim / OnHand / InventTrans.
- M4 cần owner, vendor, item, warehouse, location, vehicle type để tạo inbound flow.
- M5 cần owner, item, warehouse, location, inventory status để allocate và ship.
- M7 cần warehouse/location/work-related masters để điều phối thao tác thực địa.
- M9 cần item packaging / bagging setup.
- M10 cần rate reference, day type, contract linkage, billing-related flags.

Nói ngắn gọn, Module 2 là **data foundation** của toàn hệ thống.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho bulk cargo và bagged goods trong bối cảnh:
- Không dùng barcode/RFID làm trục chính cho mọi hàng hóa.
- Weighbridge là nguồn xác nhận khối lượng thực tế cho hàng xá.
- Tồn kho được phân biệt theo dimension, trong đó **owner** là chiều cực kỳ quan trọng.
- Billing phụ thuộc vào thuộc tính master data như cargo_form, billing_uom, storage flag, day type, rate reference.
- Kho có nhiều location type khác nhau, nhưng không phải location nào cũng được dùng cho putaway, staging hay billing.

Trong môi trường như vậy, nếu master data yếu hoặc sai:
- cùng một SKU nhưng owner khác nhau có thể bị gộp tồn sai,
- location dùng sai mục đích sẽ làm putaway/pick sai,
- tolerance sai sẽ làm inbound/outbound exception sai,
- billing mapping sai sẽ làm tính phí sai,
- import dữ liệu đầu kỳ sai sẽ làm toàn bộ module downstream lỗi theo.

---

## 4. Mục tiêu của module

### 4.1 Mục tiêu nghiệp vụ

- Chuẩn hóa danh mục master data dùng chung toàn hệ thống.
- Bảo đảm mọi giao dịch đều tham chiếu đúng owner, item, warehouse, location và status.
- Tách biệt tồn kho theo đúng dimension đã chốt cho Phase 1.
- Tạo nền đúng để kiểm tolerance, capacity, putaway, allocation và billing.
- Hỗ trợ import master data nhanh, có validation và traceability cho go-live.

### 4.2 Mục tiêu hệ thống

- Mọi master quan trọng phải có mã duy nhất, trạng thái active/inactive và audit field.
- Mọi tham chiếu giữa các master phải được validate trước khi cho phép sử dụng trong giao dịch.
- Mọi dữ liệu go-live phải import được theo template chuẩn, preview được và kiểm lỗi theo dòng.
- Mọi thay đổi master data ảnh hưởng vận hành/billing phải truy vết được.
- Master data phải đủ rõ để downstream modules không cần tự định nghĩa lại cùng một thuộc tính.

---

## 5. Phạm vi module

### 5.1 In-scope Phase 1

1. Owner / Customer master  
2. Vendor / Supplier master  
3. Item / SKU master  
4. Warehouse master  
5. Location master  
6. Vehicle Type master  
7. Inventory Status master  
8. Billing-related master data baseline  
9. Master Data Import & Validation  
10. Master data activation / deactivation policy  
11. Cross-reference validation giữa các master  
12. Master data readiness checklist cho go-live

### 5.2 Out-of-scope / Phase 2

- LPN / pallet master  
- Batch/Lot attributes  
- Serial tracking  
- Advanced FEFO logic phụ thuộc batch  
- Master governance workflow nhiều cấp phê duyệt  
- MDM hub / integration với ERP master engine theo thời gian thực

### 5.3 Boundary với các module khác

- Module này **sở hữu master data**, nhưng **không sở hữu giao dịch tồn kho**.
- Module này **định nghĩa dimension values**, nhưng **M3 mới là nơi tạo InventDim / ghi InventTrans / cập nhật OnHand**.
- Module này **định nghĩa status master**, nhưng **M3/M4/M5/M6** là nơi dùng status trong flow.
- Module này có thể lưu **billing reference master**, nhưng **không tính phí và không phát hành debit note**.
- Module này cho phép import dữ liệu nền, nhưng **không thay thế migration strategy toàn dự án**.

---

## 6. Nguyên tắc nền tảng phải giữ xuyên suốt

1. **Master data là điều kiện tiên quyết để tạo giao dịch.**  
   Thiếu hoặc sai master data thì transaction phải bị chặn từ đầu.

2. **Owner là dimension bắt buộc của tồn kho Phase 1.** `[CONFIRMED]`  
   Cùng item nhưng owner khác nhau phải được xem là tồn kho khác nhau.

3. **Inventory dimensions Phase 1 chỉ gồm Site + Warehouse + Location + Owner + Status.** `[CONFIRMED]`  
   Batch/Lot/Serial không đưa vào go-live.

4. **Inventory status go-live chỉ có 4 giá trị:** `AVAILABLE`, `DAMAGED`, `BLOCKED`, `IN_TRANSIT`. `[CONFIRMED]`

5. **Chỉ `AVAILABLE` mới được allocate cho outbound.** `[CONFIRMED]`

6. **Location type phải điều khiển hành vi vận hành.**  
   Không phải location nào cũng được phép receiving, storage, staging hay shipping.

7. **Putaway chỉ được vào location hợp lệ theo type/policy.** `[CONFIRMED]`

8. **Capacity và thuộc tính kho/vị trí phải là dữ liệu điều khiển vận hành, không phải thông tin trang trí.**

9. **Item master phải phản ánh đúng bản chất hàng hóa bulk/bagged của TVL.**  
   cargo_form, catch weight, density, tolerance, billing_uom là thuộc tính lõi.

10. **Inactive master không được dùng cho giao dịch mới nhưng lịch sử phải được giữ nguyên.**

11. **Import master data phải có validation theo dòng và preview trước commit.**

12. **Master data ảnh hưởng billing phải được đồng bộ nghĩa với module Billing.**

---

## 7. Kết quả đầu ra chính của module

Khi Module 2 được triển khai đầy đủ, hệ thống phải có tối thiểu các output sau:

1. Owner master có đủ thông tin vận hành và billing.
2. Vendor master phân biệt được nhóm nhà cung cấp / đại lý tàu.
3. Item master phản ánh đúng cargo form, tolerance, catch weight, density, packaging.
4. Warehouse master và Location master đủ dùng cho receiving / storage / staging / shipping.
5. Vehicle type master phục vụ inbound/outbound planning.
6. Inventory status master cố định cho go-live Phase 1.
7. Billing-related master baseline như service code / day type / rate reference.
8. Import template chuẩn cho Owner, Vendor, Item, Warehouse, Location, Vehicle Type, Rate Card.
9. Validation engine cho import với error report theo dòng.
10. Activation/deactivation policy rõ cho từng loại master.
11. Data readiness checklist để xác nhận trước SIT/UAT/go-live.

---

## 8. Input và Output tổng thể của module

### 8.1 Input tổng thể

| Nhóm input | Nội dung |
|---|---|
| Business entities | Owner, Vendor, Item, Warehouse, Location, Vehicle Type |
| Inventory baseline | Inventory dimensions, status go-live, allocation rule |
| Billing baseline | Rate reference, service code, day type, billing_uom |
| Operational policy | Putaway rule, capacity, tolerance, location usage |
| Data migration requirement | File import, field mapping, unique key, validation |
| Governance requirement | Active/inactive, audit field, source of truth |

### 8.2 Output tổng thể

| Nhóm output | Nội dung |
|---|---|
| Owner/Vendor baseline | Danh mục đối tác chuẩn cho vận hành |
| Item baseline | Danh mục SKU với thuộc tính hàng xá/hàng bao |
| Warehouse/Location baseline | Cấu trúc kho và vị trí chuẩn |
| Status baseline | 4 inventory statuses go-live |
| Billing reference baseline | service/day type/rate reference |
| Import baseline | Template + rule validate + preview + error report |
| Data quality baseline | duplicate check, cross-reference check, inactive policy |

---

## 9. Các đối tượng dữ liệu mà module quản lý

Module này sở hữu hoặc quản lý trực tiếp các object sau:

- `owner`
- `vendor`
- `item`
- `warehouse`
- `location`
- `vehicle_type`
- `inventory_status`
- `service_code`
- `day_type_calendar`
- `rate_reference` / `rate_card`
- `master_import_batch`
- `master_import_error`
- `owner_item_policy` hoặc cấu hình override tolerance theo owner + item

Ngoài ra module này chi phối dữ liệu đầu vào cho:
- `invent_dim` thông qua dimension values
- `receipt/shipment/work` thông qua master references
- `billing_event/debit_note` thông qua thuộc tính billing master

---

## 10. Danh sách sub-modules

Module Master Data Management được chia thành 8 sub-modules:

1. Owner & Customer Master  
2. Vendor & Counterparty Master  
3. Item / SKU & Product Attribute Master  
4. Warehouse & Location Structure Master  
5. Vehicle Type & Operational Support Master  
6. Inventory Status & Inventory Dimension Baseline  
7. Billing Reference Master  
8. Master Data Import, Validation & Readiness Control

---

## 11. Sub-module 1 — Owner & Customer Master

### 11.1 Mục đích

Quản lý chủ hàng để mọi tồn kho, giao dịch và dữ liệu billing được gắn đúng owner.

### 11.2 Mô tả nghiệp vụ

Trong TVL, owner không chỉ là khách hàng thương mại mà còn là chiều tách tồn kho bắt buộc. Cùng một SKU nhưng khác owner phải được quản lý độc lập.

### 11.3 Input

| Input | Mô tả |
|---|---|
| owner_code | Mã owner duy nhất |
| company / short_name | Tên đầy đủ / tên ngắn |
| tax_code | Mã số thuế |
| billing_contact | Liên hệ nhận debit note |
| payment_terms | Điều khoản thanh toán |
| default_tolerance_pct | Dung sai mặc định |
| owner_type | DIRECT / CONSIGNED / loại khác nếu có |
| default_warehouse_id | Kho mặc định |
| active flag | Đang hoạt động hay không |

### 11.4 Output

| Output | Mô tả |
|---|---|
| owner master record | hồ sơ owner chuẩn |
| owner active status | dùng để cho/không cho giao dịch mới |
| owner billing linkage | dữ liệu nền cho billing |
| owner inventory segregation | dùng như dimension source |

### 11.5 Cases điển hình

#### Case 1 — Tạo owner mới
- **Input:** owner_code, company, tax_code, billing_contact
- **Output:** owner được tạo, sẵn sàng dùng cho item/inventory/reporting

#### Case 2 — Deactivate owner
- **Input:** owner đang có lịch sử tồn kho nhưng ngừng giao dịch mới
- **Output:** không cho tạo receipt/shipment mới cho owner này; lịch sử vẫn giữ nguyên

#### Case 3 — Cùng item, owner khác nhau
- **Input:** SKU giống nhau nhưng owner A và owner B
- **Output:** downstream inventory phải tách dimension độc lập

### 11.6 Quy tắc bắt buộc

- owner_code phải unique.
- Owner inactive không được dùng cho transaction mới.
- Owner là dimension bắt buộc của inventory Phase 1.
- CUST_VIEWER nếu có phải gắn owner scope tương ứng ở M1.

---

## 12. Sub-module 2 — Vendor & Counterparty Master

### 12.1 Mục đích

Quản lý nhà cung cấp/đối tác giao hàng để inbound được trace đúng nguồn hàng và ngữ cảnh giao nhận.

### 12.2 Mô tả nghiệp vụ

TVL có cả vendor chuẩn và vendor kiểu vessel agent / trader trong một số flow. Master này cần đủ để phục vụ vận hành, đối chiếu và báo cáo.

### 12.3 Input

| Input | Mô tả |
|---|---|
| vendor_code | Mã NCC duy nhất |
| company | Tên NCC |
| supplier_group | DOMESTIC / OVERSEAS / VESSEL_AGENT |
| country_region | Quốc gia |
| vessel_name | Tên tàu nếu áp dụng |
| contact / phone / email | thông tin liên hệ |
| active flag | trạng thái hoạt động |

### 12.4 Output

| Output | Mô tả |
|---|---|
| vendor master | hồ sơ NCC chuẩn |
| vendor classification | phân loại đúng phục vụ inbound |
| source traceability | truy ngược nguồn giao hàng |

### 12.5 Cases điển hình

#### Case 1 — Tạo vendor thường
- **Input:** NCC nội địa, contact chuẩn
- **Output:** vendor active dùng cho inbound planning

#### Case 2 — Tạo vessel agent
- **Input:** supplier_group = VESSEL_AGENT, vessel_name có giá trị
- **Output:** hệ thống cho phép dùng trong luồng liên quan hàng tàu

### 12.6 Quy tắc bắt buộc

- vendor_code phải unique.
- Vendor inactive không dùng cho chứng từ mới.
- Phân loại vendor phải đủ rõ để không nhầm vendor chuẩn với vessel-related counterparty.

---

## 13. Sub-module 3 — Item / SKU & Product Attribute Master

### 13.1 Mục đích

Quản lý SKU với đầy đủ thuộc tính vận hành, inventory và billing để hệ thống xử lý đúng cho bulk cargo và bagged goods.

### 13.2 Mô tả nghiệp vụ

Đây là bảng quan trọng nhất của master data cho TVL vì hàng xá phụ thuộc vào cân, không phụ thuộc barcode. Item master phải phản ánh được cargo form, catch weight, density, tolerance, packaging và thuộc tính billing.

### 13.3 Input

| Input | Mô tả |
|---|---|
| sku / item_code | mã hàng duy nhất |
| owner_code | chủ hàng sở hữu item |
| descr / descr_en | tên hàng VN/EN |
| product_group | BULK / BAGGED / PACKAGING / JUMBO |
| cargo_form | BULK / BAGGED_25KG / BAGGED_40KG / BAGGED_50KG / JUMBO / PACKAGING |
| density_mt_per_m3 | mật độ khối lượng |
| is_catch_weight | có dùng actual weight hay không |
| catch_weight_uom | đơn vị cân |
| tolerance_pct_inbound | dung sai nhập mặc định ở mức item |
| tolerance_pct_outbound | dung sai xuất mặc định ở mức item |
| shrinkage_rate_pct | hao hụt chuẩn nếu có |
| billing_uom | đơn vị tính phí |
| billing_rate_group | nhóm rate billing tham chiếu |
| is_packaging | có phải vật tư bao bì hay không |
| default_bag_weight_kg | trọng lượng bao chuẩn |
| dpm_dual_tracking_default | mặc định có áp dụng dual-tracking hay không |
| hs_code / origin | thuộc tính hải quan nếu cần |
| active flag | trạng thái sử dụng |

### 13.4 Output

| Output | Mô tả |
|---|---|
| item master | hồ sơ SKU chuẩn |
| operational attributes | cargo form, density, tolerance, catch weight |
| billing attributes | billing_uom, packaging flags |
| inventory behavior hints | dimension usage, putaway/bagging relevance |

### 13.5 Cases điển hình

#### Case 1 — Tạo item bulk cargo
- **Input:** cargo_form = BULK, is_catch_weight = TRUE, density có giá trị
- **Output:** item phù hợp flow dùng actual weight từ cân

#### Case 2 — Tạo item bagged goods
- **Input:** cargo_form = BAGGED_50KG, stdgrosswgt/stdnetwgt/default_bag_weight_kg có giá trị
- **Output:** item dùng được cho bagging/billing logic tương ứng

#### Case 3 — Owner + item override tolerance
- **Input:** owner A muốn tolerance khác default của item
- **Output:** hệ thống cho phép dùng policy override owner + item nếu thiết kế mở

### 13.6 Quy tắc bắt buộc

- item_code hoặc bộ khóa owner+sku phải unique theo policy cuối cùng. `[TO-CONFIRM]`
- Với hàng xá, `is_catch_weight = TRUE` là baseline mặc định nếu TVL đã chốt.
- cargo_form là field điều khiển nghiệp vụ và billing, không chỉ để hiển thị.
- Item inactive không được dùng cho transaction mới.
- Tolerance hierarchy chính thức: `owner_item_policy override > item default > owner default`. `[CONFIRMED]`
- DPM dual-tracking phải được support bằng field/policy rõ ràng; vị trí triển khai ưu tiên ở `owner_item_policy` nếu đây là rule theo từng owner. `[TO-CONFIRM]`

### 13.7 Bảng baseline cargo_form -> billing rate group

Bảng này là baseline nghiệp vụ để Module 10 Billing không phải hard-code mapping ngoài master data. Nếu đơn giá cụ thể chưa chốt, ít nhất phải chốt được **rate group** và quan hệ với cargo_form.

| cargo_form | Billing rate group | Tình trạng |
|---|---|---|
| BULK | BULK_RATE | `[TO-CONFIRM]` |
| BAGGED_25KG | BAG_25_RATE | `[TO-CONFIRM]` |
| BAGGED_40KG | BAG_40_RATE | `[TO-CONFIRM]` |
| BAGGED_50KG | BAG_50_RATE | `[TO-CONFIRM]` |
| JUMBO | JUMBO_RATE | `[TO-CONFIRM]` |
| PACKAGING | PACKAGING_RATE | `[TO-CONFIRM]` |

> Ghi chú: nếu TVL đã có baseline đơn giá như 21K / 28K / 32K trong tài liệu thương mại, BA phải map ngược chúng vào `rate_reference` hoặc `rate_card` để Dev/QA dùng cùng một source of truth.

---

## 14. Sub-module 4 — Warehouse & Location Structure Master

### 14.1 Mục đích

Quản lý cấu trúc kho và vị trí để hệ thống biết hàng được nhận ở đâu, cất ở đâu, staging ở đâu và xuất ở đâu.

### 14.2 Mô tả nghiệp vụ

TVL có nhiều kho và nhiều loại vị trí. Nếu không chuẩn hóa warehouse/location master, hệ thống sẽ putaway sai, pick sai và tính phí sai vị trí.

### 14.3 Input

| Input | Mô tả |
|---|---|
| warehouse_code | mã kho |
| warehouse_name | tên kho |
| site_id | site nếu có |
| total_area_m2 / usable_area_m2 | diện tích |
| max_height_m | chiều cao tối đa |
| designed_capacity_mt | sức chứa thiết kế |
| operational_capacity_mt | sức chứa vận hành đang áp dụng |
| capacity_calc_method | MANUAL / FORMULA / HYBRID |
| location_code | mã vị trí |
| location_type | RECEIVING / STORAGE / STAGING / SHIPPING |
| zone / aisle / block | phân khu nếu có |
| is_billing_location | vị trí có tính phí lưu kho hay không |
| qr_code | mã QR của location |
| active flag | trạng thái sử dụng |

### 14.4 Output

| Output | Mô tả |
|---|---|
| warehouse master | hồ sơ kho |
| location hierarchy | danh mục vị trí |
| location usage policy | dùng cho receiving/storage/staging/shipping |
| capacity baseline | giới hạn phục vụ vận hành |
| billing-location flag | nền cho storage billing |

### 14.5 Cases điển hình

#### Case 1 — Tạo location STORAGE
- **Input:** location_type = STORAGE
- **Output:** location hợp lệ cho putaway và có thể dùng để tính phí nếu bật billing flag

#### Case 2 — Cố putaway vào STAGING
- **Input:** location_type = STAGING
- **Output:** hệ thống phải chặn putaway nếu policy go-live chỉ cho STORAGE

#### Case 3 — Capacity warning
- **Input:** tồn dự kiến vượt 85% hoặc 100% capacity location
- **Output:** cảnh báo vàng/đỏ theo baseline đã chốt

### 14.6 Quy tắc bắt buộc

- warehouse_code và location_code phải unique theo policy.
- Putaway chỉ được vào location type hợp lệ.
- Chỉ location có `is_billing_location = TRUE` mới là nguồn tính storage billing nếu policy này được dùng.
- QR code location phải generate/print được để phục vụ scan location ở thực địa.
- Capacity phải tách được tối thiểu giữa `designed_capacity_mt` và `operational_capacity_mt`. `[CONFIRMED]`
- Nếu công thức capacity chưa chốt đầy đủ cho Phase 1, baseline triển khai mặc định là `capacity_calc_method = MANUAL`; công thức tính tự động sẽ được ghi nhận như enhancement hoặc Phase 2. `[TO-CONFIRM]`

### 14.7 Gợi ý baseline cho capacity policy

| Thuộc tính | Ý nghĩa | Ghi chú |
|---|---|---|
| designed_capacity_mt | sức chứa theo thiết kế | dùng cho tham chiếu dài hạn |
| operational_capacity_mt | sức chứa vận hành thực tế | dùng cho cảnh báo và quyết định vận hành |
| capacity_calc_method | MANUAL / FORMULA / HYBRID | chốt trước build |
| warning_threshold_pct | ngưỡng cảnh báo vàng | ví dụ 85% nếu TVL chốt |
| blocking_threshold_pct | ngưỡng chặn/cảnh báo đỏ | ví dụ 100% nếu TVL chốt |

Nếu TVL chốt công thức ở Phase 1, công thức phải nêu rõ đầu vào dùng theo `density`, `usable_area`, `max_height`, `stacking_factor`, hay chỉ dùng giá trị nhập tay từ vận hành.

---

## 15. Sub-module 5 — Vehicle Type & Operational Support Master

### 15.1 Mục đích

Quản lý các master hỗ trợ vận hành như loại xe để dùng cho planning, gate flow và đối chiếu chứng từ.

### 15.2 Mô tả nghiệp vụ

Vehicle type không phải master lớn nhưng cần để chuẩn hóa inbound/outbound planning, đặc biệt khi đối chiếu theo loại phương tiện, tải trọng hoặc luồng trạm cân.

### 15.3 Input

| Input | Mô tả |
|---|---|
| vehicle_type_code | mã loại xe |
| description | mô tả |
| max_load_mt | tải trọng tham chiếu |
| active flag | trạng thái |

### 15.4 Output

| Output | Mô tả |
|---|---|
| vehicle type master | danh mục loại phương tiện |
| planning reference | dữ liệu nền cho planning/report |

### 15.5 Quy tắc bắt buộc

- vehicle_type_code phải unique.
- Inactive vehicle type không dùng cho giao dịch mới.

---

## 16. Sub-module 6 — Inventory Status & Inventory Dimension Baseline

### 16.1 Mục đích

Chuẩn hóa inventory statuses và dimension baseline để toàn hệ thống ghi nhận tồn kho theo cùng một logic.

### 16.2 Mô tả nghiệp vụ

Đây là phần giao thoa mạnh giữa M2 và M3. M2 sở hữu **status master** và **dimension values**, còn M3 sở hữu cơ chế tạo InventDim / InventTrans / OnHand.

### 16.3 Input

| Input | Mô tả |
|---|---|
| inventory statuses | danh sách trạng thái tồn kho |
| dimension baseline | Site, Warehouse, Location, Owner, Status |
| allocation policy | chỉ status nào được allocate |
| phase boundary | statuses nào Phase 2 |

### 16.4 Output

| Output | Mô tả |
|---|---|
| inventory status master | 4 status go-live |
| dimension value baseline | danh sách values đầu vào cho inventory |
| allocation eligibility | rule AVAILABLE-only |

### 16.5 Cases điển hình

#### Case 1 — Allocate outbound từ AVAILABLE
- **Input:** stock status = AVAILABLE
- **Output:** hợp lệ để allocate

#### Case 2 — Allocate outbound từ DAMAGED
- **Input:** stock status = DAMAGED
- **Output:** bị chặn

#### Case 3 — Đề xuất status mới WET
- **Input:** yêu cầu mở rộng ngoài go-live
- **Output:** đánh dấu `[PHASE 2]`, không cho build vào Phase 1 nếu chưa chốt

### 16.6 Quy tắc bắt buộc

- Go-live chỉ có 4 statuses: AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT.
- Chỉ AVAILABLE được allocate outbound.
- Status change trong giao dịch phải có reason code theo governance của M1.
- Batch/Lot/Serial không phải dimension go-live Phase 1.

---

## 17. Sub-module 7 — Billing Reference Master

### 17.1 Mục đích

Quản lý dữ liệu nền phục vụ Billing để M10 có thể tính phí đúng theo loại dịch vụ, ngày tính phí, rate reference và đặc tính item/location.

### 17.2 Mô tả nghiệp vụ

Module này không phát hành debit note, nhưng phải sở hữu hoặc chuẩn hóa các master tham chiếu để Billing không tự hard-code logic riêng.

### 17.3 Input

| Input | Mô tả |
|---|---|
| service_code | mã dịch vụ |
| rate_reference | tham chiếu rate / contract |
| day_type | weekday / weekend / holiday |
| billing_uom | đơn vị tính phí |
| storage flag | vị trí/kho có tính phí hay không |
| cargo_form mapping | form hàng ảnh hưởng rate |
| rate_group | nhóm rate để map từ cargo_form |
| effective_from / effective_to | ngày hiệu lực của cấu hình rate |

### 17.4 Output

| Output | Mô tả |
|---|---|
| service master | danh mục dịch vụ |
| day type calendar | lịch tính phí |
| rate reference | liên kết chuẩn tới logic pricing |
| billing attribute baseline | thuộc tính item/location phục vụ billing |

### 17.5 Cases điển hình

#### Case 1 — cargo_form map rate
- **Input:** item cargo_form = BULK hoặc BAGGED_50KG
- **Output:** billing đọc đúng rate reference tương ứng theo baseline

#### Case 2 — storage billing location
- **Input:** hàng nằm ở location có billing flag
- **Output:** M10 có đủ điều kiện master để capture storage charge

### 17.6 Quy tắc bắt buộc

- Billing không được hard-code cargo_form mapping ngoài master baseline nếu đã có cấu hình.
- Day type calendar phải là nguồn tham chiếu chuẩn cho logic ngày tính phí nếu go-live dùng.
- Mọi thay đổi rate reference master phải trace được và có hiệu lực rõ ràng.
- cargo_form phải map được sang `rate_group` hoặc `rate_reference` theo bảng baseline của M2 trước khi M10 thiết kế pricing contract chi tiết. `[CONFIRMED]`

### 17.7 Bảng baseline cargo_form -> rate group/reference

| cargo_form | rate_group tối thiểu phải có | Tác động |
|---|---|---|
| BULK | BULK_RATE | dùng cho dịch vụ hàng xá |
| BAGGED_25KG | BAG_25_RATE | dùng cho hàng bao 25kg |
| BAGGED_40KG | BAG_40_RATE | dùng cho hàng bao 40kg |
| BAGGED_50KG | BAG_50_RATE | dùng cho hàng bao 50kg |
| JUMBO | JUMBO_RATE | dùng cho jumbo bag |
| PACKAGING | PACKAGING_RATE | dùng cho vật tư/bao bì |

Nếu thương mại yêu cầu nhiều mức giá theo owner hoặc contract, `rate_group` vẫn là baseline master để tránh hard-code logic trong Billing.

---

## 18. Sub-module 8 — Master Data Import, Validation & Readiness Control

### 18.1 Mục đích

Cho phép nạp dữ liệu master hàng loạt nhanh, có kiểm lỗi, có preview và có báo cáo lỗi rõ ràng để phục vụ go-live.

### 18.2 Mô tả nghiệp vụ

Đây là năng lực rất quan trọng vì TVL có khối lượng master data đầu kỳ lớn. Nếu không có import + validation tốt, đội dự án sẽ nhập tay chậm, sai và khó đối soát.

### 18.3 Input

| Input | Mô tả |
|---|---|
| import file | file Excel theo template chuẩn |
| target entity | Owner / Vendor / Item / Warehouse / Location / Vehicle Type / Rate Card |
| validation rules | required field, duplicate, format, cross-reference |
| preview mode | kiểm tra trước commit |
| idempotency policy | không tạo trùng khi import lại file cũ |

### 18.4 Output

| Output | Mô tả |
|---|---|
| preview result | số dòng hợp lệ / lỗi |
| import batch log | log mỗi batch import |
| row-level errors | lỗi chi tiết từng dòng |
| success result | số record được tạo/cập nhật |
| readiness report | báo cáo dữ liệu đã sẵn sàng go-live |

### 18.5 Cases điển hình

#### Case 1 — Import owner file hợp lệ
- **Input:** file đúng template, không trùng mã
- **Output:** preview pass, commit thành công

#### Case 2 — Import item file có owner không tồn tại
- **Input:** item tham chiếu owner_code sai
- **Output:** dòng lỗi, không được import

#### Case 3 — Import lại cùng file
- **Input:** cùng file hoặc cùng records đã tồn tại
- **Output:** không tạo duplicate; xử lý theo policy idempotent/upsert đã chốt

### 18.6 Quy tắc bắt buộc

- Chỉ chấp nhận import theo template chuẩn.
- Phải có preview trước commit.
- Phải có error report theo dòng và theo cột lỗi.
- Phải kiểm tra cross-reference trước khi commit.
- Import lại file cũ không được làm phát sinh duplicate record mới nếu khóa unique không đổi.

---

## 19. Danh sách case tổng hợp theo module

| Case ID | Tên case | Input | Output |
|---|---|---|---|
| MD-01 | Tạo owner mới | owner data | owner active |
| MD-02 | Deactivate owner | owner active có lịch sử | chặn giao dịch mới, giữ lịch sử |
| MD-03 | Cùng SKU khác owner | item + owner A/B | inventory segregation đúng |
| MD-04 | Tạo item bulk catch-weight | cargo_form BULK | dùng actual weight |
| MD-05 | Putaway vào location sai type | location type STAGING | bị chặn |
| MD-06 | Allocate từ DAMAGED | status DAMAGED | bị chặn |
| MD-07 | cargo_form map rate | item cargo_form | billing reference đúng |
| MD-08 | Import item file lỗi owner | import file | row error report |
| MD-09 | Import lại file cũ | same codes | không duplicate |
| MD-10 | Inactive item dùng cho receipt mới | item inactive | bị chặn |

---

## 20. Ma trận input / output / case theo sub-module

| Sub-module | Input chính | Output chính | Case tiêu biểu |
|---|---|---|---|
| Owner | owner code, tax, contact | owner master | segregated owner stock |
| Vendor | vendor group, vessel | vendor master | vessel agent |
| Item | cargo_form, tolerance, density | item master | bulk catch-weight |
| Warehouse/Location | type, area, capacity | structure master | STORAGE-only putaway |
| Vehicle Type | code, load | vehicle type master | planning reference |
| Inventory Status | 4 statuses, dimension baseline | status master | AVAILABLE-only allocation |
| Billing Reference | service/day type/rate | billing references | cargo_form mapping |
| Import & Validation | excel template, rules | preview/error report | idempotent re-import |

---

## 21. Business rules của riêng module Master Data

| Rule ID | Rule | Mô tả | BRD Reference |
|---|---|---|---|
| MD-BR-001 | Unique master code | Các mã master trọng yếu phải unique theo policy | BR-MD-001 |
| MD-BR-002 | Owner-based segregation | Cùng item nhưng owner khác nhau phải tách tồn kho | BR-INV-005 |
| MD-BR-003 | Phase-1 dimensions only | Phase 1 dimensions = Site + Warehouse + Location + Owner + Status | BR-INV-001 |
| MD-BR-004 | Fixed go-live inventory statuses | Go-live chỉ có AVAILABLE, BLOCKED, DAMAGED, IN_TRANSIT | BR-INV-006 |
| MD-BR-005 | AVAILABLE-only allocation | Chỉ stock AVAILABLE được allocate outbound | BR-INV-006, BR-OUT-003 |
| MD-BR-006 | Valid location-type usage | Putaway/pick phải tôn trọng type của location | BR-MD-002 |
| MD-BR-007 | Inactive master no new transaction | Master inactive không dùng cho giao dịch mới | BR-MD-003 |
| MD-BR-008 | Catch-weight priority | Item catch-weight phải dùng actual weight nếu flow yêu cầu | BR-MD-004 |
| MD-BR-009 | Tolerance hierarchy | owner+item override > item default > owner default | BR-IN-006, BR-OUT-005 |
| MD-BR-010 | Billing master traceability | Thuộc tính billing phải truy ngược được về master | BR-BIL-006 |
| MD-BR-011 | cargo_form billing mapping | Mỗi cargo_form go-live phải map được sang rate_group/rate_reference | BR-BIL-006, BR-MD-004 |
| MD-BR-012 | Capacity policy clarity | Capacity phải có policy rõ: manual, formula hay hybrid | BR-MD-007 |
| MD-BR-013 | Import row validation | Import phải validate theo dòng trước commit | — (M2 internal) |
| MD-BR-014 | Cross-reference integrity | Không cho import/commit nếu reference master sai | — (M2 internal) |
| MD-BR-015 | Re-import duplicate safe | Import lại không tạo trùng theo khóa unique | — (M2 internal) |
| MD-BR-016 | Historical continuity | Deactivate không được phá lịch sử | BR-MD-003 |
| MD-BR-017 | Owner-item override support | Nếu owner có policy riêng cho item thì phải lưu được bằng schema rõ ràng | BR-IN-006 |
| MD-BR-018 | DPM dual-tracking support | Hệ thống phải support cờ/policy dual-tracking nếu TVL chốt dùng | — (CFM-12) |

---

## 22. Yêu cầu phi chức năng áp cho module

| Nhóm | Yêu cầu |
|---|---|
| Data Quality | required field, unique, format, reference integrity |
| Security | CRUD master phải theo RBAC của M1 |
| Traceability | create/update/deactivate/import phải audit được |
| Performance | import preview và validation phải đủ nhanh cho go-live load |
| Reliability | import lỗi không được tạo dữ liệu nửa vời |
| Extensibility | mở rộng được batch/lot/LPN cho Phase 2 |
| Operability | dễ export danh sách master để kiểm tra và đối soát |

---

## 23. Data model khái niệm đề xuất

### 23.1 Các bảng lõi

- `owner`
- `vendor`
- `item`
- `warehouse`
- `location`
- `vehicle_type`
- `inventory_status`
- `service_code`
- `day_type_calendar`
- `rate_reference`
- `owner_item_policy`
- `master_import_batch`
- `master_import_error`

### 23.1A Schema khái niệm đề xuất cho owner_item_policy

| Field | Mô tả |
|---|---|
| id | khóa chính |
| owner_id | tham chiếu owner |
| item_id | tham chiếu item |
| tolerance_pct_inbound_override | override dung sai nhập |
| tolerance_pct_outbound_override | override dung sai xuất |
| dpm_dual_tracking_flag | cờ dual-tracking nếu áp dụng riêng cho owner-item |
| billing_rate_override_ref | override rate nếu chính sách thương mại cho phép |
| effective_from | ngày bắt đầu hiệu lực |
| effective_to | ngày hết hiệu lực |
| active_flag | còn hiệu lực hay không |
| created_at / created_by | audit tạo |
| updated_at / updated_by | audit sửa |

> Ghi chú: nếu team chốt item là global SKU, `owner_item_policy` càng quan trọng để chứa các khác biệt theo owner thay vì bẻ item master thành nhiều record.

### 23.1B Tolerance Lookup Algorithm (cho Dev implement)

Khi M4/M5 cần kiểm tra tolerance cho một cặp (owner, item), logic lookup như sau:

```
function getTolerance(owner_id, item_id, direction):
    // direction = 'INBOUND' hoặc 'OUTBOUND'
    field = direction == 'INBOUND' ? 'tolerance_pct_inbound_override' : 'tolerance_pct_outbound_override'

    // Step 1: Tìm owner_item_policy active, trong effective date
    policy = SELECT * FROM owner_item_policy
             WHERE owner_id = :owner_id
               AND item_id = :item_id
               AND active_flag = TRUE
               AND effective_from <= NOW()
               AND (effective_to IS NULL OR effective_to >= NOW())
             ORDER BY effective_from DESC
             LIMIT 1

    IF policy EXISTS AND policy[field] IS NOT NULL:
        RETURN policy[field]          // → Ưu tiên 1: owner+item override

    // Step 2: Lấy từ item master
    item = SELECT * FROM item WHERE id = :item_id
    item_field = direction == 'INBOUND' ? 'tolerance_pct_inbound' : 'tolerance_pct_outbound'

    IF item[item_field] IS NOT NULL:
        RETURN item[item_field]       // → Ưu tiên 2: item default

    // Step 3: Lấy từ owner master
    owner = SELECT * FROM owner WHERE id = :owner_id

    IF owner.default_tolerance_pct IS NOT NULL:
        RETURN owner.default_tolerance_pct  // → Ưu tiên 3: owner default

    // Step 4: System default
    RETURN SYSTEM_DEFAULT_TOLERANCE   // → 0.5% [TO-CONFIRM giá trị chính thức]
```

**Thứ tự ưu tiên (MD-BR-009):**
1. `owner_item_policy` (owner + item) → cao nhất
2. `item.tolerance_pct_*` → mức item
3. `owner.default_tolerance_pct` → mức owner
4. System default (0.5%) → thấp nhất

### 23.2 Quan hệ khái niệm

- `item.owner_id` hoặc quan hệ `owner_item_policy` để cho phép owner-specific setup
- `warehouse` 1-n `location`
- `inventory_status` được dùng làm dimension value đầu vào cho `invent_dim`
- `location.warehouse_id` phải bắt buộc
- `rate_reference` có thể liên kết theo owner / cargo_form / service_code tùy baseline cuối cùng

### 23.3 Ghi chú ownership

- M2 sở hữu **master definitions**.
- M3 sở hữu **InventDim / InventTrans / OnHand runtime records**.
- M10 sở hữu **billing event / debit note runtime records**.

---

## 24. Dependencies liên module

### 24.1 Module phụ thuộc vào M2

- M3 Inventory Core Engine
- M4 Inbound Operations
- M5 Outbound Operations
- M6 Inventory Control
- M7 Work Execution & Mobile
- M9 VAS / Bagging
- M10 Billing & Commercial Control
- M11 Reporting

### 24.2 Module M2 phụ thuộc vào

- M1 để enforce RBAC, audit, reason code nếu thay đổi nhạy cảm
- Baseline business rules đã chốt trong PRD/Blueprint/BRD

---

## 25. Acceptance criteria ở mức module

Module Master Data Management được xem là đạt khi tối thiểu thỏa các điều kiện sau:

1. Có đầy đủ master records cho Owner, Vendor, Item, Warehouse, Location, Vehicle Type, Inventory Status.
2. Inventory status go-live chỉ có 4 status và chỉ AVAILABLE được allocate.
3. Putaway bị chặn nếu location type không hợp lệ.
4. Item master hỗ trợ đủ cargo_form, catch weight, tolerance và billing attributes cho Phase 1.
5. Owner khác nhau phải dẫn đến inventory segregation đúng ở downstream logic.
6. Master inactive không được dùng cho giao dịch mới nhưng lịch sử không mất.
7. Có import template chuẩn và preview trước commit.
8. Import có row-level validation, error report và không tạo duplicate khi re-import.
9. Billing reference master đủ để M10 không phải hard-code baseline pricing inputs.
10. Có checklist xác nhận data readiness trước SIT/UAT/go-live.

### 25.1 Acceptance Criteria chi tiết theo sub-module (testable)

**Sub-module 1 — Owner & Customer Master**
- AC-1.1: Tạo owner với owner_code trùng → API reject 409 Conflict
- AC-1.2: Deactivate owner có lịch sử tồn kho → receipt/shipment mới cho owner này bị reject; lịch sử vẫn query được
- AC-1.3: CUST_VIEWER login gắn owner_id = CUST001 → chỉ thấy inventory/report/billing của CUST001, kể cả qua API direct call
- AC-1.4: Tạo owner thiếu required field (owner_code, company) → reject 400 với field-level error

**Sub-module 2 — Vendor & Counterparty Master**
- AC-2.1: Tạo vendor với supplier_group = VESSEL_AGENT, vessel_name = NULL → reject (vessel_name bắt buộc khi VESSEL_AGENT)
- AC-2.2: Vendor inactive → tạo receipt mới gắn vendor này bị reject

**Sub-module 3 — Item / SKU & Product Attribute Master**
- AC-3.1: Tạo item cargo_form = BULK, is_catch_weight = TRUE → downstream M4/M5 dùng actual weight từ cân
- AC-3.2: Có owner_item_policy (owner A, item X, tolerance_inbound = 1.0%) → M4 kiểm tolerance dùng 1.0%, KHÔNG dùng item default
- AC-3.3: Không có owner_item_policy → M4 fallback sang item.tolerance_pct_inbound → owner.default_tolerance_pct → system default 0.5%
- AC-3.4: Item inactive → tạo receipt/shipment mới cho item này bị reject 400
- AC-3.5: DPM flag = TRUE trên owner_item_policy → M5 outbound ghi InventTrans.qty = actual_net; M10 billing dùng bag_count × nominal

**Sub-module 4 — Warehouse & Location Structure Master**
- AC-4.1: Putaway vào location_type = STAGING → reject (chỉ cho STORAGE) `[CONFIRMED]`
- AC-4.2: Location utilization >= 85% → dashboard hiện yellow warning
- AC-4.3: Location utilization >= 100% → dashboard hiện red alert
- AC-4.4: QR code generate cho mỗi location → WH_KEEPER scan được bằng mobile app
- AC-4.5: Tạo location thiếu warehouse_id → reject 400

**Sub-module 6 — Inventory Status & Dimension Baseline**
- AC-6.1: Allocate outbound từ stock DAMAGED → reject
- AC-6.2: Allocate outbound từ stock AVAILABLE → success
- AC-6.3: Status change từ AVAILABLE → BLOCKED → bắt buộc reason_code; audit log ghi đầy đủ (user, role, old/new, reason, timestamp)
- AC-6.4: Tạo status mới ngoài 4 go-live → reject ở Phase 1

**Sub-module 7 — Billing Reference Master**
- AC-7.1: Item cargo_form = BULK → billing lookup trả rate_group = BULK_RATE
- AC-7.2: Thay đổi rate_reference effective_date → rate mới chỉ áp dụng từ ngày hiệu lực, không hồi tố
- AC-7.3: Day type calendar: ngày 01/05 = HOLIDAY → storage fee tính theo holiday rate nếu có

**Sub-module 8 — Master Data Import & Validation**
- AC-8.1: Import file 100 dòng, 5 dòng lỗi → 95 dòng import thành công; error report liệt kê 5 dòng lỗi với chi tiết cột + lý do
- AC-8.2: Import lại cùng file → không tạo duplicate (match theo unique key)
- AC-8.3: Import item có owner_code không tồn tại → dòng lỗi với message "owner_code not found"
- AC-8.4: Preview mode → hiển thị số dòng pass/fail TRƯỚC KHI commit; user chọn commit hoặc cancel

---

## 26. Rủi ro nếu module làm không đủ

| Rủi ro | Hậu quả |
|---|---|
| Owner setup sai | gộp nhầm tồn kho giữa các chủ hàng |
| Item attributes sai | tolerance, billing, bagging xử lý sai |
| Location type sai | putaway/pick sai vị trí |
| Status master sai | allocate nhầm hàng blocked/damaged |
| Billing reference yếu | tính phí sai hoặc hard-code tạm |
| Import validation yếu | dữ liệu đầu kỳ lỗi lan sang toàn hệ thống |
| Inactive policy không rõ | user tiếp tục dùng master hết hiệu lực |

---

## 27. Khuyến nghị cho Dev Team

1. Thiết kế M2 như **source of truth cho master definitions**, không để module downstream tự khai báo lại thuộc tính.
2. Tách rõ **master record**, **reference lookup** và **import batch logs**.
3. Chuẩn hóa khóa unique cho từng entity từ đầu để tránh migration/import conflict.
4. Dùng validation service dùng chung cho create/edit/import.
5. Không để M3/M4/M5 hard-code inventory statuses hay location type rules ngoài M2 baseline.
6. Tách `active/inactive` khỏi soft delete; không xóa master đã phát sinh lịch sử.

---

## 28. Khuyến nghị cho QA Team

1. Test create/edit/deactivate cho từng loại master.
2. Test cross-reference validation: item-owner, location-warehouse, rate reference dependencies.
3. Test downstream enforcement: allocate chỉ AVAILABLE, putaway chỉ STORAGE.
4. Test import preview, partial lỗi, row-level report và re-import duplicate-safe.
5. Test inactive master bị chặn ở transaction create.
6. Test audit trail cho create/update/deactivate/import.

---

## 29. Điểm cần chốt thêm trước khi thiết kế FS/API chi tiết

| # | Nội dung cần chốt | Tình trạng | Priority | Impact nếu chưa chốt |
|---|---|---|---|---|
| 1 | Khóa unique cuối cùng của item là global SKU hay owner + SKU | `[TO-CONFIRM]` | P1 | BLOCK: item schema, import logic, duplicate handling |
| 2 | Hierarchy tolerance chính thức: owner default, item default, owner+item override | `[TO-CONFIRM]` | P1 | BLOCK: owner_item_policy design, validation, downstream exception logic |
| 3 | Danh sách cargo_form go-live cuối cùng và mapping sang billing rate/rate group | `[TO-CONFIRM]` | P1 | BLOCK: Billing reference design, M10 pricing input baseline |
| 4 | Công thức capacity chính thức có dùng density theo item hay theo zone/kho | `[TO-CONFIRM]` | P1 | BLOCK: warehouse/location capacity behavior |
| 5 | Danh sách service_code / rate_reference / day_type cần go-live | `[TO-CONFIRM]` | P1 | BLOCK: billing master setup và SIT cho billing |
| 6 | Vehicle type attributes nào là bắt buộc thật sự trong Phase 1 | `[TO-CONFIRM]` | P3 | IMPACT: import template và màn hình master |
| 7 | Chính sách import khi record đã tồn tại là reject hay update/upsert | `[TO-CONFIRM]` | P1 | BLOCK: import service contract và duplicate-safe behavior |
| 8 | Danh sách field bắt buộc cuối cùng cho từng template import | `[TO-CONFIRM]` | P2 | IMPACT: migration prep, UAT data readiness |
| 9 | Có cần approval cho thay đổi master data ảnh hưởng billing/commercial hay không | `[TO-CONFIRM]` | P2 | IMPACT: RBAC/workflow và audit expectation |
| 10 | owner-item tolerance override sẽ là bảng riêng hay field trực tiếp trên item | `[TO-CONFIRM]` | P1 | BLOCK: DB design, API contract, QA scenarios |
| 11 | DPM dual-tracking sẽ đặt ở item master hay owner_item_policy | `[TO-CONFIRM]` | P1 | BLOCK: schema và special-case support cho owner-specific flow |
| 12 | BRD / source mapping sẽ được lưu ở bảng rule nào trong spec | `[TO-CONFIRM]` | P3 | IMPACT: traceability cho BA/QA/UAT |

---

## 29A. Gợi ý mapping traceability cho rule catalog

Để QA tránh viết test trùng và để BA trace ngược dễ hơn, nên bổ sung cột `BRD Reference` hoặc `Maps To` trong bảng Business Rules.

| Rule ID | Rule | Maps To |
|---|---|---|
| MD-BR-003 | Phase-1 dimensions only | Inventory baseline / PRD / Blueprint |
| MD-BR-004 | Fixed go-live inventory statuses | Business rules inventory status |
| MD-BR-011 | cargo_form billing mapping | Billing baseline / commercial rule |
| MD-BR-012 | Capacity policy clarity | Warehouse capacity baseline |
| MD-BR-017 | Owner-item override support | Master data override policy |
| MD-BR-018 | DPM dual-tracking support | DPM special business rule |

---

## 30. Kết luận

Module 2 không phải phần “khai báo danh mục cho có”, mà là **data foundation** để các module Inventory, Inbound, Outbound, Work, Billing vận hành đúng.

Nếu Module 1 là lớp kỷ luật hệ thống, thì Module 2 là lớp **định nghĩa thực thể và tham số nền**. Build thiếu hoặc build sai module này sẽ làm sai cả tồn kho lẫn billing.

Trạng thái đề xuất hiện tại: **Draft for Review — đủ nền để bóc tiếp FS/API/Import Design/UAT**, nhưng cần chốt thêm các điểm `[TO-CONFIRM]` ở Section 29 trước khi khóa build scope.

