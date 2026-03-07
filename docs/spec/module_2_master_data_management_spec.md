# TVL SWM — Module Specification
# Module 2: Master Data Management

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Business Analyst 10 năm kinh nghiệm  
**Phiên bản:** 2.0  
**Ngày cập nhật:** 08/03/2026  
**Trạng thái:** Revised for Build Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Billing Lead, Key User, Data Migration Team

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Master Data Management** của hệ thống SWM. Đây là module dữ liệu nền để toàn hệ thống biết đang quản lý **chủ hàng nào, nhà cung cấp nào, mặt hàng nào, kho nào, vị trí nào, trạng thái tồn kho nào, thông số vận hành nào và tham chiếu billing nào**.

Nếu Module 1 giúp hệ thống biết **ai được làm gì và theo luật nào**, thì Module 2 giúp hệ thống biết **đang quản lý cái gì, bằng mã nào, thuộc tính nào, quan hệ nào, và các module downstream được phép dùng dữ liệu đó ra sao**.

Tài liệu được viết theo hướng:
- Người business hiểu vì sao master data là nền của vận hành, inventory và billing.
- Dev/QA có thể bóc tiếp FS, API contract, DB design, import contract, validation, test scenario và migration checklist.
- Team dự án có baseline rõ giữa **master data nghiệp vụ**, **master data inventory**, **master data vận hành kho** và **master data billing/commercial**.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Master Data Management là Module 2**.

Module này không trực tiếp post tồn kho, không trực tiếp tạo debit note, nhưng là nguồn dữ liệu nền cho tất cả module còn lại:
- **M1 — Foundation & Governance**: cung cấp RBAC, audit, reason code, number sequence, idempotency policy cho việc quản trị master data.
- **M3 — Inventory Core Engine**: dùng dimension values, status, warehouse, location, item, owner để tạo `invent_dim`, `invent_trans`, `on_hand`.
- **M4 — Inbound**: dùng owner, vendor, item, warehouse, location, vehicle type, tolerance baseline để nhận hàng.
- **M5 — Outbound**: dùng owner, item, warehouse, location, inventory status để allocate, pick, stage, ship.
- **M6/M7 — Inventory Operations / Warehouse Execution**: dùng location/zone/profile/capacity/rule để thực hiện move, count, transfer, work.
- **M9 — VAS / Bagging**: dùng packaging item, nominal bag weight, cargo form để tạo nghiệp vụ đóng bao.
- **M10 — Billing**: dùng service code, day type, cargo form, billing_uom, billing flag, rate reference để định nghĩa baseline tính phí.

Nói ngắn gọn, Module 2 là **data foundation** của toàn hệ thống và là **single controlled source** cho master data Phase 1.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho bulk cargo và bagged goods trong bối cảnh:
- Không dùng barcode/RFID làm trục chính cho mọi hàng hóa.
- Weighbridge là nguồn xác nhận khối lượng thực tế cho hàng xá.
- Tồn kho phải được tách theo dimension, trong đó **owner** là chiều bắt buộc của bài toán 3PL.
- Billing phụ thuộc mạnh vào master data như `cargo_form`, `billing_uom`, `is_storage_billable`, `service_code`, `day_type`, `rate_reference`, `zone/location billable flag`.
- Kho có nhiều loại location khác nhau, nhưng không phải location nào cũng được dùng cho receiving, storage, staging, shipping hay billing.
- Hệ thống cần import dữ liệu nền đầu kỳ nhanh, kiểm lỗi được theo dòng, có preview trước commit, có khả năng re-import an toàn và có truy vết sau go-live.

Trong môi trường này, nếu master data yếu hoặc sai:
- cùng một SKU nhưng owner khác nhau có thể bị gộp tồn sai,
- location dùng sai mục đích sẽ làm putaway/pick sai,
- tolerance sai sẽ làm inbound/outbound exception sai,
- billing mapping sai sẽ làm tính phí sai,
- dữ liệu import đầu kỳ sai sẽ kéo lỗi hàng loạt sang inventory, vận hành và kế toán đối soát.

---

## 4. Mục tiêu của module

### 4.1 Mục tiêu nghiệp vụ
- Chuẩn hóa danh mục master data dùng chung toàn hệ thống.
- Bảo đảm mọi giao dịch đều tham chiếu đúng owner, item, warehouse, location, status, zone và billing baseline.
- Tách biệt tồn kho theo đúng dimension Phase 1.
- Tạo nền đúng để kiểm tolerance, capacity, putaway, allocation, storage billing và bagging/bulk handling.
- Hỗ trợ import master data nhanh, có validation, preview, rollback-safe và traceability cho SIT/UAT/go-live.

### 4.2 Mục tiêu hệ thống
- Mọi master quan trọng phải có mã duy nhất, trạng thái active/inactive và audit field.
- Mọi quan hệ tham chiếu giữa các master phải được validate trước khi cho phép dùng trong giao dịch.
- Mọi dữ liệu go-live phải import được theo template chuẩn, có duplicate check, cross-reference check và báo lỗi theo dòng.
- Mọi thay đổi master data ảnh hưởng vận hành/billing phải truy vết được theo chuẩn governance của Module 1.
- Downstream modules không được tự định nghĩa lại cùng một thuộc tính master data nếu Module 2 đã sở hữu thuộc tính đó.

---

## 5. Phạm vi module

### 5.1 In-scope Phase 1
1. Owner / Customer master  
2. Vendor / Supplier master  
3. Item / SKU master  
4. Warehouse master  
5. Zone master  
6. Location master  
7. Vehicle Type master  
8. UOM và UOM Conversion baseline  
9. Inventory Status master  
10. Billing-related master baseline  
11. Master Data Import & Validation  
12. Master data activation / deactivation policy  
13. Cross-reference validation giữa các master  
14. Data readiness checklist cho SIT/UAT/go-live  
15. Owner-item operational override policy

### 5.2 Out-of-scope / Phase 2
- Batch/Lot master và batch attributes  
- Serial tracking  
- LPN/Pallet master  
- FEFO logic thực thi dựa trên batch  
- Nhiều cấp approval workflow cho master changes  
- Real-time MDM hub / ERP master engine  
- Contract pricing engine chi tiết và charge calculation runtime

### 5.3 Boundary với các module khác
- Module này **sở hữu master data**, nhưng **không sở hữu transaction runtime**.
- Module này **định nghĩa dimension values**, nhưng **M3 mới là nơi tạo `invent_dim`, ghi `invent_trans`, cập nhật `on_hand`**.
- Module này **định nghĩa status master**, nhưng **M3/M4/M5/M6** là nơi dùng status trong flow.
- Module này **định nghĩa billing reference baseline**, nhưng **M10** mới là nơi tính phí, chốt charge và phát hành debit note.
- Module này **cho phép import dữ liệu nền**, nhưng **không thay thế migration strategy tổng thể của dự án**.

---

## 6. Quy ước trạng thái quyết định dùng trong tài liệu

| Tag | Ý nghĩa | Quy tắc sử dụng |
|---|---|---|
| `[CONFIRMED]` | Đã chốt theo baseline hiện tại | Dev/QA được build và test theo nội dung này |
| `[BUILD-BASELINE]` | Chưa có sign-off riêng của TVL nhưng được chốt làm baseline build để tránh blocker | Dev được build; nếu đổi sau này thì quản lý qua change request |
| `[TO-CONFIRM]` | Còn mở, chưa nên đóng cứng nếu chưa có sign-off | Có thể dựng cấu hình mở, tránh hard-code |
| `[PHASE 2]` | Không thuộc go-live Phase 1 | Không đưa vào backlog Phase 1 trừ khi có CR |
| `[PROCESS — NOT CODE]` | Quy trình/quản trị, không mặc định là feature phải build | Chỉ build nếu có scope rõ |

---

## 7. Nguyên tắc nền tảng phải giữ xuyên suốt

1. **Master data là điều kiện tiên quyết để tạo giao dịch.**  
   Thiếu hoặc sai master data thì transaction phải bị chặn từ đầu. `[CONFIRMED]`

2. **Owner là dimension bắt buộc của tồn kho Phase 1.**  
   Cùng item nhưng owner khác nhau phải được xem là tồn kho khác nhau. `[CONFIRMED]`

3. **Inventory dimensions Phase 1 chỉ gồm Site + Warehouse + Location + Owner + Status.**  
   Batch/Lot/Serial không đưa vào go-live. `[CONFIRMED]`

4. **Inventory status go-live chỉ có 4 giá trị:** `AVAILABLE`, `DAMAGED`, `BLOCKED`, `IN_TRANSIT`. `[CONFIRMED]`

5. **Chỉ `AVAILABLE` mới được allocate cho outbound.** `[CONFIRMED]`

6. **Location type, zone và profile phải điều khiển hành vi vận hành.**  
   Không phải location nào cũng được phép receiving, storage, staging, shipping hay billing. `[CONFIRMED]`

7. **Putaway chỉ được vào location hợp lệ theo type/policy/profile/capacity.** `[CONFIRMED]`

8. **Capacity và thuộc tính kho/vị trí là dữ liệu điều khiển vận hành, không phải thông tin trang trí.** `[CONFIRMED]`

9. **Item master phải phản ánh đúng bản chất hàng hóa bulk/bagged của TVL.**  
   `cargo_form`, `catch_weight`, `density`, `tolerance`, `billing_uom`, `is_packaging` là thuộc tính lõi. `[CONFIRMED]`

10. **Inactive master không được dùng cho giao dịch mới nhưng lịch sử phải được giữ nguyên.** `[CONFIRMED]`

11. **Import master data phải có validation theo dòng và preview trước commit.** `[CONFIRMED]`

12. **Master data ảnh hưởng billing phải đồng nghĩa và đồng scope với Billing module.** `[CONFIRMED]`

13. **Mọi thay đổi master data nhạy cảm phải kế thừa governance của Module 1: RBAC + audit + reason code khi cần.** `[CONFIRMED]`

14. **Mọi API có side effect của Module 2 phải idempotent.** `[CONFIRMED]`

15. **Module 2 chỉ sở hữu định nghĩa dữ liệu; downstream modules sở hữu hành vi runtime.** `[CONFIRMED]`

---

## 8. Kết quả đầu ra chính của module

Khi Module 2 được triển khai đầy đủ, hệ thống phải có tối thiểu các output sau:
1. Owner master có đủ thông tin vận hành và billing.
2. Vendor master phân biệt được nhóm nhà cung cấp / đại lý tàu / đối tác inbound.
3. Item master phản ánh đúng cargo form, tolerance, density, catch weight, packaging, billing_uom.
4. Warehouse / Zone / Location master đủ dùng cho receiving / storage / staging / shipping / billing zoning.
5. Vehicle type master phục vụ inbound/outbound planning và weighbridge/billing baseline.
6. Inventory status master cố định cho go-live Phase 1.
7. Billing reference baseline gồm `service_code`, `day_type`, `rate_reference`.
8. UOM baseline và conversion baseline đủ dùng cho KG / MT / BAG / UNIT / M3 / M2.
9. Import template chuẩn cho Owner, Vendor, Item, Warehouse, Zone, Location, Vehicle Type, UOM, UOM Conversion, Rate Reference.
10. Validation engine cho import với error report theo dòng.
11. Activation/deactivation policy rõ cho từng loại master.
12. Data readiness checklist để xác nhận trước SIT/UAT/go-live.

---

## 9. Danh sách object dữ liệu mà module quản lý hoặc chi phối

### 9.1 Object sở hữu trực tiếp
- `owner`
- `vendor`
- `item`
- `warehouse`
- `zone`
- `location`
- `vehicle_type`
- `uom`
- `uom_conversion`
- `inventory_status`
- `service_code`
- `day_type`
- `rate_reference`
- `owner_item_policy`
- `master_import_batch`
- `master_import_batch_line`
- `master_import_error`

### 9.2 Object chi phối dữ liệu đầu vào cho module khác
- `invent_dim` thông qua dimension values
- `receipt` / `shipment` / `work` thông qua master references
- `billing_event` / `charge_candidate` / `debit_note` thông qua billing master

---

## 10. Quyết định baseline dùng để đóng các blocker của bản v1.0

Các điểm sau được chốt để bản v2.0 đủ điều kiện build, trừ khi TVL yêu cầu thay đổi qua change request.

### 10.1 Mô hình Item key
- `item_code` / `sku` là **global key trong toàn hệ thống**. `[BUILD-BASELINE]`
- Quan hệ riêng của từng owner với item sẽ được cấu hình ở bảng `owner_item_policy`. `[BUILD-BASELINE]`
- Lý do chọn:
  - tránh trùng SKU logic ở nhiều owner,
  - downstream dễ reuse item master chung,
  - override đặc thù owner vẫn được xử lý riêng mà không phá cấu trúc item.

### 10.2 Tolerance hierarchy
Thứ tự ưu tiên tolerance dùng trong runtime như sau:  
`transaction override (nếu được phép) > owner_item_policy > item master > owner default > system default`. `[BUILD-BASELINE]`

### 10.3 Cargo form go-live list
Danh sách `cargo_form` go-live Phase 1:  
`BULK`, `BAGGED_25KG`, `BAGGED_40KG`, `BAGGED_50KG`, `JUMBO`, `PACKAGING`. `[BUILD-BASELINE]`

### 10.4 Import existing-record policy
- Import hỗ trợ 3 chế độ: `INSERT_ONLY`, `UPSERT`, `VALIDATE_ONLY`. `[BUILD-BASELINE]`
- Go-live migration mặc định dùng `UPSERT`. `[BUILD-BASELINE]`
- Nếu record đang inactive và import lại hợp lệ với mode `UPSERT`, hệ thống cho phép cập nhật nhưng **không tự động active lại** nếu không có cờ `reactivate_flag = true`. `[BUILD-BASELINE]`

### 10.5 Billing rate reference baseline
- `rate_reference` là bảng tham chiếu commercial, không phải engine tính phí. `[CONFIRMED]`
- Một dòng rate reference phải được xác định tối thiểu bởi:  
  `owner_code + service_code + cargo_form + billing_uom + effective_from + warehouse_scope(optional) + day_type(optional)` `[BUILD-BASELINE]`
- Không cho phép 2 dòng active bị overlap cùng tổ hợp khóa lookup. `[BUILD-BASELINE]`

### 10.6 Owner-item policy placement
- Mọi override theo từng owner cho item như tolerance, billing_uom override, storage flag override, preferred warehouse, handling note sẽ đặt ở `owner_item_policy`. `[BUILD-BASELINE]`

---

## 11. Danh sách sub-modules

1. Owner & Customer Master  
2. Vendor & Counterparty Master  
3. Item / SKU & Product Attributes  
4. Warehouse Master  
5. Zone & Location Master  
6. Vehicle Type Master  
7. UOM / Conversion / Inventory Status Baseline  
8. Billing Reference Baseline  
9. Owner-Item Policy & Override Baseline  
10. Master Data Import, Validation & Readiness

---

## 12. Sub-module 1 — Owner & Customer Master

### 12.1 Mục tiêu
Quản lý chủ hàng là entity gốc của bài toán 3PL, phục vụ ownership, billing, reporting, owner scope security và default policies.

### 12.2 Dữ liệu cốt lõi
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `owner_code` | Yes | Mã chủ hàng duy nhất |
| `owner_name` | Yes | Tên chủ hàng |
| `short_name` | Yes | Tên viết tắt hiển thị |
| `owner_group` | Yes | Nhóm khách hàng |
| `owner_type` | Yes | `DIRECT` / `CONSIGNED` / `OTHER` |
| `tax_code` | Yes | MST phục vụ chứng từ/billing |
| `address` | Yes | Địa chỉ chính |
| `billing_email` | No | Email nhận debit note/thông báo billing |
| `billing_contact` | No | Người phụ trách billing |
| `payment_terms` | No | `NET30`, `NET60`, `COD`... |
| `default_tolerance_pct` | No | Dùng làm fallback tolerance |
| `default_warehouse_code` | No | Kho mặc định ưu tiên |
| `is_active` | Yes | Trạng thái hoạt động |

### 12.3 Business rules
1. `owner_code` là unique toàn hệ thống. `[CONFIRMED]`
2. Owner inactive không được dùng cho receipt/shipment/work mới. `[CONFIRMED]`
3. Owner đã từng phát sinh giao dịch không được hard delete. `[CONFIRMED]`
4. Customer Viewer chỉ được xem dữ liệu thuộc owner scope được cấp. `[CONFIRMED]`
5. `default_tolerance_pct` chỉ là fallback, không override item/owner-item policy khi đã có cấu hình cụ thể. `[BUILD-BASELINE]`

### 12.4 Use cases
- Tạo mới owner
- Cập nhật thông tin pháp nhân/billing
- Deactivate owner
- Reactivate owner
- Import danh sách owner đầu kỳ
- Xem owner usage impact trước khi deactivate

### 12.5 Input/Output
**Input:** thông tin pháp nhân, contact, billing, default operational policy  
**Output:** owner master hợp lệ để downstream sử dụng trong inventory, inbound, outbound, billing

---

## 13. Sub-module 2 — Vendor & Counterparty Master

### 13.1 Mục tiêu
Quản lý nhà cung cấp, đại lý tàu, trader, counterparty giao nhận đầu vào cho inbound.

### 13.2 Dữ liệu cốt lõi
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `vendor_code` | Yes | Mã vendor duy nhất |
| `vendor_name` | Yes | Tên vendor |
| `supplier_group` | Yes | `DOMESTIC`, `OVERSEAS`, `VESSEL_AGENT`, `TRADER` |
| `country_region` | No | Mã quốc gia |
| `vessel_name` | No | Tên tàu nếu là agency liên quan vessel |
| `contact_name` | No | Người liên hệ |
| `phone` | No | Số điện thoại |
| `email` | No | Email |
| `tax_code` | No | MST |
| `is_active` | Yes | Trạng thái |

### 13.3 Business rules
1. Vendor inactive không được chọn cho inbound mới. `[CONFIRMED]`
2. Vendor có thể không gắn owner cố định. `[CONFIRMED]`
3. Một vendor có thể được dùng bởi nhiều owner. `[CONFIRMED]`
4. Nếu `supplier_group = VESSEL_AGENT` thì cho phép lưu `vessel_name`; các nhóm khác để optional. `[BUILD-BASELINE]`

---

## 14. Sub-module 3 — Item / SKU & Product Attributes

### 14.1 Mục tiêu
Quản lý danh mục hàng hóa và vật tư bao bì để downstream modules hiểu bản chất hàng, quy đổi, tolerance, billing, bagging và putaway.

### 14.2 Dữ liệu cốt lõi
| Nhóm field | Field chính |
|---|---|
| Identification | `item_code`, `item_name`, `item_name_en`, `alt_item_code` |
| Classification | `product_group`, `cargo_form`, `category`, `is_packaging` |
| UOM | `base_uom`, `billing_uom`, `catch_weight_uom` |
| Weight/Volume | `std_gross_weight`, `std_net_weight`, `density_mt_per_m3`, `std_cube_m3` |
| Tolerance | `tolerance_pct_inbound`, `tolerance_pct_outbound`, `shrinkage_rate_pct` |
| Rotation | `rotate_by`, `shelf_life_days` |
| Putaway | `default_zone`, `putaway_strategy_key` |
| Bagging/VAS | `default_bag_weight_kg`, `packaging_material_item_code`, `nominal_qty_per_unit` |
| Customs | `hs_code`, `country_of_origin` |
| Flags | `is_catch_weight`, `is_storage_billable`, `is_active` |

### 14.3 Business rules
1. `item_code` là unique toàn hệ thống. `[BUILD-BASELINE]`
2. `cargo_form` là bắt buộc. `[CONFIRMED]`
3. Với `cargo_form = BULK`, `is_catch_weight = true` là mặc định khuyến nghị. `[BUILD-BASELINE]`
4. Với `is_packaging = true`, item không được dùng như hàng tồn thương mại của owner nếu không có use case VAS rõ. `[BUILD-BASELINE]`
5. `billing_uom` phải tồn tại trong `uom`. `[CONFIRMED]`
6. `tolerance_pct_inbound` và `tolerance_pct_outbound` không được âm. `[CONFIRMED]`
7. `default_bag_weight_kg` chỉ bắt buộc khi cargo form là loại bagged hoặc item là packaging. `[BUILD-BASELINE]`
8. Item inactive không được dùng cho giao dịch mới. `[CONFIRMED]`
9. Không cho phép đổi `cargo_form` sau khi item đã phát sinh giao dịch, trừ change request và migration riêng. `[BUILD-BASELINE]`
10. Không cho phép đổi `billing_uom` nếu đã có transaction trừ khi đi qua quy trình controlled change. `[BUILD-BASELINE]`

### 14.4 Quy tắc cho bài toán bulk/bagged
- `density_mt_per_m3` rất quan trọng cho capacity planning bulk. `[CONFIRMED]`
- `nominal_qty_per_unit` phục vụ bagging / packing scenario. `[BUILD-BASELINE]`
- `shrinkage_rate_pct` không tự động tạo transaction; chỉ là baseline tham chiếu cho exception / analytics / billing. `[BUILD-BASELINE]`

---

## 15. Sub-module 4 — Warehouse Master

### 15.1 Mục tiêu
Quản lý kho như đơn vị vận hành logic để phục vụ sequence scope, capacity baseline, weighbridge baseline, reporting và ownership của location/zone.

### 15.2 Dữ liệu cốt lõi
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `warehouse_code` | Yes | Mã kho duy nhất |
| `warehouse_name` | Yes | Tên kho |
| `site_id` | Yes | Mặc định `TVL-SITE` Phase 1 |
| `warehouse_type` | Yes | `COVERED`, `OPEN_YARD`, `MIXED` |
| `total_area_m2` | Yes | Tổng diện tích |
| `usable_area_m2` | No | Diện tích khả dụng |
| `max_height_m` | Yes | Cao tối đa |
| `max_capacity_mt` | Yes | Sức chứa mt |
| `address` | No | Địa chỉ |
| `has_weighbridge` | Yes | Có trạm cân hay không |
| `weighbridge_count` | No | Số trạm cân |
| `is_bonded` | Yes | Cờ kho ngoại quan |
| `capacity_warning_pct` | Yes | Ngưỡng cảnh báo |
| `default_receiving_location` | No | Location mặc định nhận |
| `default_staging_location` | No | Location mặc định staging |
| `default_shipping_location` | No | Location mặc định xuất |
| `is_active` | Yes | Trạng thái |

### 15.3 Business rules
1. `warehouse_code` unique toàn hệ thống. `[CONFIRMED]`
2. Number sequence scope là **PER_WAREHOUSE**. `[CONFIRMED]`
3. Không cho deactivate warehouse nếu còn location active hoặc còn dữ liệu on-hand active reference mà chưa xử lý. `[BUILD-BASELINE]`
4. `default_*_location` nếu khai báo thì phải thuộc chính warehouse đó. `[CONFIRMED]`
5. `capacity_warning_pct` nằm trong khoảng 1–100. `[BUILD-BASELINE]`

---

## 16. Sub-module 5 — Zone & Location Master

### 16.1 Mục tiêu
Định nghĩa cấu trúc không gian kho ở mức zone/location để phục vụ receiving, storage, staging, shipping, billing zoning, capacity và rules vận hành.

### 16.2 Zone master
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `zone_code` | Yes | Mã zone duy nhất trong warehouse |
| `warehouse_code` | Yes | Thuộc kho nào |
| `zone_name` | Yes | Tên/mô tả |
| `zone_type` | Yes | `RECEIVING`, `STORAGE`, `STAGING`, `SHIPPING`, `YARD`, `QC` |
| `is_billing_zone` | Yes | Có tính billing storage/handling theo zone hay không |
| `billing_rate_zone` | No | Nhóm zone dùng billing |
| `max_capacity_mt` | No | Sức chứa zone |
| `is_active` | Yes | Trạng thái |

### 16.3 Location master
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `location_code` | Yes | Mã location |
| `warehouse_code` | Yes | Thuộc kho nào |
| `zone_code` | Yes | Thuộc zone nào |
| `location_type` | Yes | `RECEIVING`, `STORAGE`, `STAGING`, `SHIPPING`, `BULK_FLOOR`, `QC`, `TRANSIT` |
| `location_profile` | Yes | Profile vận hành |
| `status` | Yes | `OK`, `HOLD`, `BLOCKED` |
| `area_m2` | No | Diện tích |
| `max_height_m` | No | Cao tối đa |
| `stack_limit_kg` | No | Giới hạn chất tải |
| `is_mixed_owner` | Yes | Có cho mix owner không |
| `is_mixed_product` | Yes | Có cho mix product không |
| `is_billing_location` | Yes | Có dùng làm location tính billing không |
| `stacking_rule` | No | `FLOOR`, `RACK`, `PALLET` |
| `x_coord`,`y_coord` | No | Dùng cho sơ đồ/điều hướng |
| `is_active` | Yes | Trạng thái |

### 16.4 Business rules
1. Zone unique theo `warehouse_code + zone_code`. `[BUILD-BASELINE]`
2. Location unique theo `warehouse_code + location_code`. `[CONFIRMED]`
3. Putaway chỉ vào location có `is_active = true`, `status = OK` và type/profile hợp lệ. `[CONFIRMED]`
4. Location `RECEIVING` hoặc `STAGING` mặc định không dùng làm long-term storage billing nếu không bật `is_billing_location`. `[BUILD-BASELINE]`
5. Nếu `is_mixed_owner = false` thì downstream không được trộn owner trong cùng location/on-hand logic. `[BUILD-BASELINE]`
6. Không cho deactivate zone nếu còn location active trong zone đó. `[BUILD-BASELINE]`
7. Không cho đổi `warehouse_code` của zone/location sau khi đã phát sinh giao dịch. `[BUILD-BASELINE]`
8. `location_type = SHIPPING` không được làm putaway target. `[BUILD-BASELINE]`

---

## 17. Sub-module 6 — Vehicle Type Master

### 17.1 Mục tiêu
Định nghĩa loại phương tiện phục vụ inbound/outbound planning, weighbridge validation và billing linkage.

### 17.2 Dữ liệu cốt lõi
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `vehicle_type_code` | Yes | Mã loại xe |
| `vehicle_type_name` | Yes | Tên loại xe |
| `category` | Yes | `TRUCK`, `CONTAINER`, `TRAILER`, `BARGE`, `VESSEL_SUPPORT` |
| `default_tare_weight_kg` | Yes | Khối lượng bì mặc định |
| `max_payload_kg` | Yes | Tải trọng tối đa |
| `teu_equivalent` | No | Dùng cho container |
| `handling_fee_group` | No | Link billing baseline |
| `is_active` | Yes | Trạng thái |

### 17.3 Business rules
1. `default_tare_weight_kg` phải lớn hơn 0. `[CONFIRMED]`
2. `max_payload_kg` phải lớn hơn 0 và lớn hơn tare logic hợp lý. `[BUILD-BASELINE]`
3. Vehicle type inactive không được chọn cho transaction mới. `[CONFIRMED]`

---

## 18. Sub-module 7 — UOM / Conversion / Inventory Status Baseline

### 18.1 UOM master
Mục tiêu là chuẩn hóa đơn vị dùng trong item, transaction, billing và report.

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `uom_code` | Yes | Mã đơn vị |
| `description` | Yes | Mô tả |
| `uom_class` | Yes | `WEIGHT`, `VOLUME`, `QUANTITY`, `AREA`, `LENGTH` |
| `is_base_uom` | Yes | Có phải đơn vị cơ sở không |
| `decimal_precision` | Yes | Số chữ số thập phân |
| `is_active` | Yes | Trạng thái |

### 18.2 UOM conversion
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `from_uom` | Yes | UOM nguồn |
| `to_uom` | Yes | UOM đích |
| `conversion_factor` | Yes | to = from x factor |
| `item_code` | No | Null = dùng chung; có giá trị = áp dụng riêng item |
| `is_active` | Yes | Trạng thái |

### 18.3 Inventory status
Go-live Phase 1 cố định 4 giá trị:
- `AVAILABLE`
- `DAMAGED`
- `BLOCKED`
- `IN_TRANSIT`

### 18.4 Business rules
1. `AVAILABLE` là status duy nhất được allocate. `[CONFIRMED]`
2. Status master Phase 1 không cho user thêm mới tùy ý qua UI. `[BUILD-BASELINE]`
3. Có thể cho phép update description/display order nhưng không cho sửa semantics của status code. `[BUILD-BASELINE]`
4. UOM conversion không được tạo vòng lặp xung đột cho cùng cặp `from/to/item`. `[BUILD-BASELINE]`

---

## 19. Sub-module 8 — Billing Reference Baseline

### 19.1 Mục tiêu
Quản lý baseline tham chiếu commercial để M10 sử dụng khi lookup charge rule, nhưng Module 2 không thực hiện charge calculation runtime.

### 19.2 Entity trong scope
- `service_code`
- `day_type`
- `rate_reference`

### 19.3 Service code
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `service_code` | Yes | Mã dịch vụ |
| `service_name` | Yes | Tên dịch vụ |
| `service_group` | Yes | `STORAGE`, `HANDLING`, `WEIGHBRIDGE`, `BAGGING`, `INBOUND`, `OUTBOUND`, `OTHER` |
| `default_uom` | Yes | UOM mặc định |
| `is_active` | Yes | Trạng thái |

### 19.4 Day type
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `day_type_code` | Yes | `NORMAL`, `WEEKEND`, `HOLIDAY`... |
| `description` | Yes | Mô tả |
| `calendar_date` | No | Nếu là calendar cụ thể |
| `is_active` | Yes | Trạng thái |

### 19.5 Rate reference
| Field | Bắt buộc | Mô tả |
|---|---|---|
| `rate_reference_code` | Yes | Mã dòng tham chiếu |
| `owner_code` | Yes | Chủ hàng |
| `service_code` | Yes | Dịch vụ |
| `cargo_form` | Yes | Dạng hàng |
| `billing_uom` | Yes | UOM tính phí |
| `warehouse_code` | No | Scope theo kho nếu có |
| `day_type_code` | No | Scope theo ngày nếu có |
| `effective_from` | Yes | Hiệu lực từ |
| `effective_to` | No | Hiệu lực đến |
| `is_taxable` | No | Có VAT hay không |
| `is_active` | Yes | Trạng thái |

### 19.6 Business rules
1. `service_code` unique toàn hệ thống. `[CONFIRMED]`
2. Không cho overlap `rate_reference` active trên cùng tổ hợp lookup khóa. `[BUILD-BASELINE]`
3. `effective_to` nếu có phải lớn hơn hoặc bằng `effective_from`. `[CONFIRMED]`
4. Billing module được quyền tham chiếu, không được tự tạo nghĩa mới cho service/day type ngoài baseline đã quản lý. `[BUILD-BASELINE]`

---

## 20. Sub-module 9 — Owner-Item Policy & Override Baseline

### 20.1 Mục tiêu
Cho phép cấu hình riêng theo cặp owner + item mà không phá vỡ global item master.

### 20.2 Thuộc tính gợi ý trong scope Phase 1
| Field | Mô tả |
|---|---|
| `owner_code` | Chủ hàng |
| `item_code` | Mặt hàng |
| `tolerance_pct_inbound_override` | Override tolerance nhập |
| `tolerance_pct_outbound_override` | Override tolerance xuất |
| `billing_uom_override` | Override đơn vị billing |
| `is_storage_billable_override` | Override cờ billing lưu kho |
| `preferred_warehouse_code` | Kho ưu tiên |
| `handling_note` | Ghi chú vận hành |
| `is_active` | Trạng thái |

### 20.3 Business rules
1. Unique theo `owner_code + item_code`. `[BUILD-BASELINE]`
2. Không tạo record nếu owner hoặc item không tồn tại/không active. `[CONFIRMED]`
3. Owner-item policy inactive thì runtime fallback về item/owner default. `[BUILD-BASELINE]`

---

## 21. Sub-module 10 — Master Data Import, Validation & Readiness

### 21.1 Mục tiêu
Cho phép nhập dữ liệu nền hàng loạt có kiểm soát, an toàn, truy vết được và đủ dùng cho cutover/go-live.

### 21.2 Import entities trong Phase 1
- Owner
- Vendor
- Item
- Warehouse
- Zone
- Location
- Vehicle Type
- UOM
- UOM Conversion
- Rate Reference
- Owner-Item Policy

### 21.3 Import lifecycle
1. Upload file
2. Parse template và kiểm version/template type
3. Validate header
4. Validate từng dòng
5. Validate cross-reference
6. Preview kết quả `insert / update / reject`
7. Commit theo mode đã chọn
8. Ghi batch log + line log + error log
9. Cho phép export error report

### 21.4 Chế độ xử lý
- `VALIDATE_ONLY`: chỉ kiểm lỗi, không commit. `[BUILD-BASELINE]`
- `INSERT_ONLY`: record đã tồn tại sẽ reject. `[BUILD-BASELINE]`
- `UPSERT`: record tồn tại sẽ update các field cho phép update. `[BUILD-BASELINE]`

### 21.5 Transaction behavior
- Mặc định commit theo **partial success by row**. `[BUILD-BASELINE]`
- Mỗi dòng hợp lệ được commit độc lập trong cùng batch. `[BUILD-BASELINE]`
- Batch phải lưu summary: tổng dòng, thành công, thất bại, skipped. `[CONFIRMED]`
- Có thể bật option `all_or_nothing = true` cho migration controlled batch nếu cần. `[TO-CONFIRM]`

### 21.6 Validation categories
- Format validation
- Required field validation
- Enum/domain validation
- Duplicate-in-file validation
- Existing master validation
- Cross-reference validation
- Immutable-field-after-use validation
- Active/inactive usage validation

### 21.7 Cross-reference bắt buộc
- Item phải tham chiếu UOM hợp lệ
- Warehouse default locations phải tồn tại trong chính warehouse đó
- Location phải tham chiếu warehouse và zone hợp lệ
- Zone phải tham chiếu warehouse hợp lệ
- Rate reference phải tham chiếu owner/service_code/billing_uom/day_type hợp lệ
- Owner-item policy phải tham chiếu owner/item hợp lệ

### 21.8 Import audit objects
| Object | Mục đích |
|---|---|
| `master_import_batch` | Header của batch import |
| `master_import_batch_line` | Dòng parse + trạng thái xử lý |
| `master_import_error` | Danh sách lỗi chi tiết |

### 21.9 Batch statuses
`UPLOADED`, `VALIDATING`, `VALIDATED`, `PARTIALLY_COMMITTED`, `COMMITTED`, `FAILED`, `CANCELLED`. `[BUILD-BASELINE]`

---

## 22. Field-level governance policy

### 22.1 Nhóm field được phép update sau khi đã phát sinh giao dịch
- display name / description
- contact info
- non-critical note fields
- billing email
- status active/inactive (nếu thỏa policy)

### 22.2 Nhóm field hạn chế update sau khi đã phát sinh giao dịch
Các field sau phải khóa mềm hoặc đi qua controlled change:
- `item.cargo_form`
- `item.billing_uom`
- `warehouse_code`
- `zone.warehouse_code`
- `location.warehouse_code`
- `location.zone_code`
- `inventory_status.code`
- `rate_reference` key fields đang active

### 22.3 Hard delete policy
- Không hard delete nếu record đã từng được tham chiếu bởi transaction/log/import history. `[CONFIRMED]`
- Chỉ cho hard delete nếu record chưa từng được dùng và user có quyền system admin. `[BUILD-BASELINE]`

---

## 23. API capability baseline cho Module 2

### 23.1 Nguyên tắc API
- Mọi command API có side effect phải nhận `external_id` hoặc idempotency key. `[CONFIRMED]`
- Mọi response lỗi validation phải trả được lỗi theo field hoặc theo dòng import. `[BUILD-BASELINE]`
- Mọi list API phải hỗ trợ filter theo `is_active`, search keyword và pagination. `[BUILD-BASELINE]`

### 23.2 Nhóm API tối thiểu
- Create / Update / Get / List / Deactivate / Reactivate cho từng master chính
- Import preview
- Import commit
- Export error report
- Usage impact check trước khi deactivate
- Lookup APIs cho dropdown/reference

### 23.3 Ví dụ capability matrix
| Entity | Create | Update | Deactivate | Reactivate | Import | Usage Check |
|---|---:|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes |
| Vendor | Yes | Yes | Yes | Yes | Yes | Optional |
| Item | Yes | Yes | Yes | Yes | Yes | Yes |
| Warehouse | Yes | Yes | Yes | Yes | Yes | Yes |
| Zone | Yes | Yes | Yes | Yes | Yes | Yes |
| Location | Yes | Yes | Yes | Yes | Yes | Yes |
| Vehicle Type | Yes | Yes | Yes | Yes | Yes | Optional |
| UOM | Yes | Yes | Yes | Yes | Yes | Yes |
| Rate Reference | Yes | Yes | Yes | Yes | Yes | Yes |
| Owner-Item Policy | Yes | Yes | Yes | Yes | Yes | Optional |

---

## 24. RBAC, Audit và Governance mapping với Module 1

### 24.1 Vai trò tối thiểu
| Vai trò | Quyền chính |
|---|---|
| `System Admin` | Toàn quyền cấu hình master |
| `Master Data Admin` | Tạo/sửa/import/deactivate master data |
| `Warehouse Manager` | Xem master và đề xuất/sửa một số operational master trong scope kho |
| `Billing Lead/Officer` | Xem owner/item/service/rate reference; sửa billing reference nếu được cấp |
| `Customer Viewer` | Chỉ xem dữ liệu thuộc owner scope |
| `Auditor` | Chỉ xem và export audit/import logs |

### 24.2 Action nhạy cảm bắt buộc audit mạnh
- deactivate/reactivate master
- update key operational fields
- import commit
- sửa billing reference active
- thay đổi owner-item override

### 24.3 Action bắt buộc reason code
- deactivate/reactivate record đã từng được dùng
- sửa controlled fields sau go-live
- import reactivate record inactive
- cập nhật rate reference đang active có ảnh hưởng billing

### 24.4 Audit bắt buộc lưu
- object_type
- object_id / code
- action
- before_value
- after_value
- user_id
- role
- timestamp
- external_id / correlation_id
- source_channel
- reason_code (nếu có)

---

## 25. Validation rules tổng hợp theo entity

| Entity | Rule chính |
|---|---|
| Owner | unique owner_code, tax code format, owner inactive không dùng cho transaction mới |
| Vendor | unique vendor_code, group enum hợp lệ |
| Item | unique item_code, cargo_form bắt buộc, billing_uom và base_uom hợp lệ |
| Warehouse | unique warehouse_code, capacity > 0, default location phải thuộc kho |
| Zone | unique trong kho, warehouse phải tồn tại |
| Location | unique trong kho, zone + warehouse phải khớp, type/profile hợp lệ |
| Vehicle Type | tare/payload > 0 |
| UOM | unique code, precision hợp lệ |
| UOM Conversion | factor > 0, không trùng from/to/item |
| Rate Reference | key lookup không overlap active date range |
| Owner-Item Policy | unique owner+item, owner/item active |

---

## 26. Downstream dependency mapping

### 26.1 M2 owns
- nghĩa của owner/vendor/item/warehouse/zone/location/uom/status/service/day-type/rate-reference
- active/inactive policy cho master
- field semantics và validation
- import baseline

### 26.2 M2 enables downstream behavior
- M3 dùng dimension/status/warehouse/location để tạo ledger & on-hand
- M4 dùng owner/vendor/item/tolerance/vehicle type cho receiving
- M5 dùng owner/item/location/status cho allocation & shipping
- M7 dùng warehouse/zone/location/profile cho execution
- M9 dùng item packaging / nominal bag weight / cargo form cho bagging
- M10 dùng service/day type/rate reference / billing_uom / billing flags cho charge lookup

### 26.3 M2 does not own
- posting logic
- allocation logic runtime
- shipment/receipt lifecycle
- charge calculation runtime
- reconciliation engine

---

## 27. Data readiness checklist cho SIT/UAT/Go-live

### 27.1 Checklist tối thiểu trước SIT
- Có ít nhất 100% owner trong scope SIT
- Có ít nhất 100% warehouse/zone/location trong scope SIT
- Có đầy đủ 4 inventory statuses go-live
- Có item master cho toàn bộ luồng test chính
- Có vehicle type cho luồng weighbridge test
- Có service code / rate reference baseline đủ cho billing SIT

### 27.2 Checklist tối thiểu trước UAT
- Dữ liệu owner, item, warehouse, location đạt sign-off từ business owner
- Không còn duplicate key trong master chính
- Tỷ lệ lỗi import unresolved = 0 cho dữ liệu UAT baseline
- Tất cả cross-reference critical pass validate

### 27.3 Checklist tối thiểu trước Go-live
- Master data cutover file được freeze theo version
- Import batch cuối pass 100% hoặc có exception sign-off chính thức
- Tất cả owner active có item/warehouse/location hợp lệ trong scope thực tế
- Billing reference active không overlap
- Audit trail và import logs kiểm tra đọc được

---

## 28. Acceptance Criteria tổng hợp

1. User có quyền phù hợp có thể tạo/sửa/xem/deactivate/reactivate từng master entity theo scope.  
2. Hệ thống chặn transaction mới nếu master reference không tồn tại hoặc inactive.  
3. Cùng item nhưng owner khác nhau được downstream tách tồn đúng qua dimension owner.  
4. Chỉ status `AVAILABLE` được allocate.  
5. Putaway chỉ vào location active, status OK, type/profile hợp lệ.  
6. Import hỗ trợ preview và trả lỗi chi tiết theo dòng.  
7. Import mode `UPSERT` cập nhật record hiện có nhưng không phá immutable controlled fields.  
8. Deactivate record đã từng được dùng không làm mất lịch sử cũ.  
9. Billing reference không cho phép overlap active date range trên cùng tổ hợp lookup.  
10. Owner-item policy override có hiệu lực đúng thứ tự fallback đã định.  
11. Mọi thay đổi nhạy cảm đều có audit log.  
12. Mọi API side effect đều retry-safe theo idempotency policy.  
13. Customer Viewer chỉ xem được dữ liệu thuộc owner scope.  
14. Data readiness report có thể xác nhận số lượng record hợp lệ theo từng entity trước go-live.

---

## 29. Rủi ro và lưu ý triển khai

1. Nếu chưa thống nhất naming convention giữa legacy TVL và SWM canonical codes, import sẽ sinh nhiều duplicate logic.  
2. Nếu item master không chuẩn hóa `cargo_form`, billing và bagging sẽ lệch semantics.  
3. Nếu location/zone không thiết kế đúng từ đầu, downstream putaway/pick/work sẽ phát sinh nhiều ngoại lệ khó sửa.  
4. Nếu rate reference cho phép overlap, M10 sẽ lookup không deterministic.  
5. Nếu governance của Module 1 không áp vào import/update master, go-live sẽ rất khó truy vết lỗi dữ liệu.

---

## 30. Đề xuất thiết kế dữ liệu mức implementation-ready

### 30.1 Quy tắc khóa chính/khóa duy nhất khuyến nghị
- Mỗi entity có `id` UUID làm PK kỹ thuật. `[BUILD-BASELINE]`
- Mỗi mã nghiệp vụ (`owner_code`, `item_code`, `warehouse_code`...) là unique business key. `[CONFIRMED]`
- Quan hệ owner-item, zone, location, uom conversion, rate reference dùng composite unique key đúng ngữ nghĩa. `[BUILD-BASELINE]`

### 30.2 Audit fields chuẩn cho mọi master
- `created_at`, `created_by`
- `updated_at`, `updated_by`
- `is_active`
- `deactivated_at`, `deactivated_by` (nếu inactive)
- `row_version` để chống lost update `[BUILD-BASELINE]`

### 30.3 Khuyến nghị soft delete
Tất cả master trong Module 2 nên dùng **soft delete / inactive flag**, không hard delete theo mặc định. `[BUILD-BASELINE]`

---

## 31. Phần cần theo dõi sau build review

Các mục sau không chặn build v2.0 nhưng cần theo dõi trong design workshop:
- Có cần `all_or_nothing` import batch làm option chính thức hay chỉ dùng cho migration script. `[TO-CONFIRM]`
- Có cần tách `carrier` thành entity độc lập của M4 thay vì M2 hay không. `[TO-CONFIRM]`
- Có cần mở rộng `day_type` thành calendar engine riêng ở M10 hay không. `[TO-CONFIRM]`
- Có cần governance approval flow nhiều cấp cho thay đổi billing master sau go-live hay không. `[PHASE 2]`

---

## 32. Kết luận

Module 2 không chỉ là nơi “khai báo danh mục”, mà là **nền dữ liệu điều khiển toàn bộ hoạt động inventory, inbound, outbound, warehouse execution, bagging và billing**. Vì vậy, tiêu chuẩn của module này phải đủ chặt để:
- business hiểu và sign-off được,
- dev có thể thiết kế DB/API/import logic mà không mơ hồ,
- QA có thể viết test case rõ ràng,
- team cutover có thể import và kiểm dữ liệu an toàn,
- downstream modules dùng cùng một nghĩa dữ liệu, không tự phát sinh định nghĩa riêng.

Bản v2.0 này được chỉnh để từ mức “module spec tốt” tiến gần hơn tới mức **build-ready BA specification** cho Module 2 của SWM.
