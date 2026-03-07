# TVL_SWM_MasterData_Import_Template.xlsx


## Sheet: HUONG_DAN

| HUONG DAN DIEN MASTER DATA - THORESEN VINAMA SWM |
| --- |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |
|  |


## Sheet: Owner

| storerkey* | company* | short_name* | groupcode* | address1* | contact1 | phone1 | email | taxcode* | billing_contact | payment_terms | default_tolerance_pct | owner_type | cityname | countryname | destcode | destname | wardname | districtname | default_warehouse_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma chu hang (Bat buoc, duy nhat) | Ten chu hang | Ten viet tat (Hien thi bao cao, app) | Ma nhom KH | Dia chi | Nguoi lien he | Dien thoai | Email (Nhan debit note) | Ma so thue (Bat buoc hoa don) | Nguoi nhan DN | Dieu khoan TT (NET30/NET60/COD) | % Dung sai (Mac dinh 0.5%) | Loai (DIRECT/CONSIGNED) | TP | Quoc gia | Ma diem den | Ten diem den | Phuong | Quan | Kho mac dinh |
| CUST001 | Cty TNHH XNK Binh Thuan | BTP | CUS_GRP01 | 123 Nguyen Hue, Q1, HCM | Mr. Tan | 0234934948 | billing@company.com | 0313202685 | Ms. Nga | NET30 | 0.50 | DIRECT | Ho Chi Minh | Vietnam | BIGC | Big C | Phuong 13 | Tan Binh | WH5.1 |


## Sheet: Vendor

| storerkey* | company* | address1* | contact1 | phone1 | taxcode | email | supplier_group | country_region | vessel_name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma NCC (Bat buoc, duy nhat) | Ten NCC | Dia chi | Lien he | SDT | MST | Email | Nhom (DOMESTIC/OVERSEAS/VESSEL_AGENT) | Quoc gia (ISO: VN,TH,CN...) | Tau (Chi hang tau) |
| BTP | Thuc pham Binh Thuan | 456 Le Loi, Q1 | Ms. Nga | 0123456789 | 0313202685 | ncc@company.com | DOMESTIC | VN |  |


## Sheet: Item

| storerkey* | sku* | descr* | descr_en | product_group* | cargo_form* | category | density_mt_per_m3 | packuom3* | billing_uom | is_catch_weight | tolerance_pct_inbound | tolerance_pct_outbound | shrinkage_rate_pct | rotateby | shelflife | putawayzone | stdgrosswgt | stdnetwgt | is_packaging | default_bag_weight_kg | hs_code | country_of_origin | altsku |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chu hang (Ma owner) | Ma hang (Duy nhat) | Ten (VN) | Ten (EN) (B/L matching) | Nhom SP (BULK/BAGGED/PACKAGING/JUMBO) | Dang hang (BULK/BAGGED_25KG/BAGGED_40KG/BAGGED_50KG/JUMBO/PACKAGING) | Nhom CT (NONG_SAN/KHOANG_SAN/PHAN_BON) | Mat do T/m3 ([XA] San=0.55,Clinker=1.5) | DV nho nhat (Hang xa: KG) | DV tinh phi (Mac dinh: MT) | Catch wgt? (Xa: TRUE) | % DS nhap (0.5%) | % DS xuat (0.5%) | % Hao hut (San=2%) | Xuat theo (FIFO/FEFO/LIFO) | Vong doi(ngay) (Null=ko het han) | Zone | TL gop kg/dv (Chi hang bao) | TL tinh kg/dv (Chi hang bao) | La bao bi? (TRUE=vat tu bao) | TL bao(kg) (25/40/50) | Ma HS (Kho ngoai quan) | Xuat xu (ISO: VN,TH) | Ma thay the |
| CUST001 | BLK-CASSAVA-001 | San lat kho | Cassava Chip | BULK | BULK | NONG_SAN | 0.5500 | KG | MT | TRUE | 0.50 | 0.50 | 2.00 | FIFO | 365 | ZONE_WH51 |  |  | FALSE | 50 |  |  |  |


## Sheet: Warehouse

| code* | name* | site_id* | type* | total_area_m2* | usable_area_m2 | max_height_m* | max_capacity_mt* | address | has_weighbridge | weighbridge_count | is_bonded | capacity_warning_pct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma kho (Duy nhat) | Ten kho | Site (Mac dinh TVL-SITE) | Loai (COVERED/OPEN_YARD) | Tong DT m2 | DT dung m2 (~80-85%) | Cao max(m) ([XA] Chat dong) | Suc chua MT | Dia chi | Tram can? (TRUE/FALSE) | So tram can | Ngoai quan? (TRUE/FALSE) | Canh bao % (Mac dinh 85) |
| WH5.1 | Kho 5.1 - Mai che A | TVL-SITE | COVERED | 8500 | 7200 | 6.00 | 4356 | KCN Phu My | TRUE | 2 | FALSE | 85 |


## Sheet: Carrier

| storerkey* | company* | address1 | contact1 | phone1 | taxcode | email | mode_of_delivery* | carrier_group | default_vehicle_type |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma NVC (Duy nhat) | Ten NVC | Dia chi | Lien he | SDT | MST | Email | PT van chuyen (TRUCK/VESSEL/CONTAINER/BARGE) | Nhom (TRUCKING/SHIPPING_LINE/FREIGHT_FWD) | Loai xe MĐ (Ma vehicle_type) |
| DHL | DHL Express | 789 HBT, Q3 | Mr. Nhat | 0234556597 | 0234556597 | ops@dhl.com | TRUCK | TRUCKING | TRUCK_BULK |


## Sheet: Vehicle_Type

| code* | name* | category* | default_tare_weight_kg* | max_payload_kg* | teu_equivalent | handling_fee_group |
| --- | --- | --- | --- | --- | --- | --- |
| Ma loai xe (Duy nhat) | Ten | Phan loai (TRUCK/CONTAINER/TRAILER/BARGE) | TL rong(kg) ([CRITICAL] Weighbridge) | Max tai(kg) | TEU (20ft=1.0,40ft=2.0) | Nhom phi (Link billing) |
| TRUCK_BULK | Xe tai hang roi | TRUCK | 8500 | 15000 |  | HFG_TRUCK |


## Sheet: Location

| loc* | warehouse_id* | putawayzone* | location_type* | location_profile* | status | area_m2 | max_height_m | stacklimit | is_mixed_owner | is_mixed_product | is_billing_location | stacking_rule | x_coord | y_coord |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ma vi tri ([WH]-[ZONE]-[SEQ]) | Ma kho | Khu vuc | Loai (STORAGE/RECEIVING/STAGING/SHIPPING/BULK_FLOOR/QC) | Profile (BULK-STORE/RECV-GENERAL/STAGE-OUT) | Trang thai (OK/HOLD/BLOCKED) | DT(m2) ([XA] Bat buoc bulk) | Cao max(m) ([XA] Bat buoc bulk) | Gioi han(kg) (TVL legacy) | Mix owner? (Xa: FALSE) | Mix hang? (Xa: FALSE) | Tinh phi? (RECV=FALSE) | Chat hang (FLOOR/PALLET/RACK) | X (2D map) | Y (2D map) |
| WH51-A-01 | WH5.1 | A1 | STORAGE | BULK-STORE | OK | 500 | 6.00 | 500000 | FALSE | FALSE | TRUE | FLOOR |  |  |


## Sheet: Zone

| putawayzone* | descr* | warehouse_id* | zone_type* | is_billing_zone | billing_rate_zone | max_capacity_mt |
| --- | --- | --- | --- | --- | --- | --- |
| Ma zone (Duy nhat) | Mo ta | Ma kho | Loai (STORAGE/RECEIVING/STAGING/SHIPPING/YARD/QC) | Tinh phi? (TRUE/FALSE) | Zone billing (Gop zone) | Suc chua MT |
| A1 | BD1 - First floor | WH5.1 | STORAGE | TRUE |  |  |


## Sheet: UOM

| code* | description* | uom_class* | is_base_uom | decimal_precision |
| --- | --- | --- | --- | --- |
| Ma DV (Duy nhat) | Mo ta | Phan loai (WEIGHT/VOLUME/QUANTITY/AREA/LENGTH) | DV co so? (TRUE/FALSE) | Thap phan (Mac dinh 3) |
| KG | Kilogram | WEIGHT | TRUE | 3 |


## Sheet: UOM_Conversion

| from_uom* | to_uom* | conversion_factor* | sku |
| --- | --- | --- | --- |
| Tu DV | Sang DV | He so (to=from x factor) | Ma hang (Trong=tat ca SKU) |
| KG | MT | 0.001000 |  |


## Sheet: Reason_Code

| code* | description* | category* | requires_approval | affects_billing |
| --- | --- | --- | --- | --- |
| Ma ly do (Duy nhat) | Mo ta | Phan loai (MANUAL_WEIGHT/TOLERANCE_OVERRIDE/ADJUSTMENT/SHRINKAGE/DAMAGE/TRANSFER/CYCLE_COUNT/OTHER) | Phe duyet? (TRUE/FALSE) | Billing? (TRUE/FALSE) |
| RC-MW-001 | Can hong - nhap thu cong | MANUAL_WEIGHT | TRUE | FALSE |
