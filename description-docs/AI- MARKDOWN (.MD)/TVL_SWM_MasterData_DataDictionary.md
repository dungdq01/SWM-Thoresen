# TVL_SWM_MasterData_DataDictionary.xlsx


## Sheet: TOC

| TVL SWM - MASTER DATA MODULE - DATA DICTIONARY |
| --- |
| Thoresen Vinama Logistics \| v1.0 \| March 2026 \| D365 FO Advanced Warehouse |
| # |
| 1 |
| 2 |
| 3 |
| 4 |
| 5 |
| 6 |
| 7 |
| 8 |
| 9 |
| 10 |
| 11 |


## Sheet: owner

| 1. Owner / Customer (Chu hang) |
| --- |
| Table: owner  \|  Chu hang gui kho. Primary entity lien ket inventory, billing, contract. |
| Field |
| --- EXISTING TVL FIELDS --- |
| storerkey |
| company |
| groupcode |
| address1 |
| contact1 |
| phone1 |
| taxcode |
| destcode |
| destname |
| wardname |
| districtname |
| cityname |
| countryname |
| --- NEW FIELDS (Operations & Billing) --- |
| short_name |
| email |
| billing_currency |
| payment_terms |
| default_tolerance_pct |
| default_warehouse_id |
| billing_contact |
| owner_type |
| is_active |
| created_by |
| created_at |
| updated_at |


## Sheet: vendor

| 2. Vendor / Supplier (Nha cung cap) |
| --- |
| Table: vendor  \|  NCC giao hang den kho TVL. Luong vessel: NCC = dai ly tau/trader. |
| Field |
| --- EXISTING TVL FIELDS --- |
| storerkey |
| company |
| address1 |
| contact1 |
| phone1 |
| taxcode |
| --- NEW FIELDS --- |
| email |
| supplier_group |
| country_region |
| vessel_name |
| is_active |
| created_at |
| updated_at |


## Sheet: item

| 3. Item / Product / SKU (Ma hang hoa) |
| --- |
| Table: item  \|  TABLE QUAN TRONG NHAT cho hang xa. Phu thuoc hoan toan vao can, khong barcode. |
| Field |
| --- IDENTIFICATION --- |
| storerkey |
| sku |
| descr |
| descr_en |
| altsku |
| upccode |
| --- CLASSIFICATION (Critical Bulk) --- |
| product_group |
| cargo_form |
| category |
| skugroup |
| --- WEIGHT & DIMENSIONS (Critical Bulk) --- |
| density_mt_per_m3 |
| stdgrosswgt |
| stdnetwgt |
| stdcube |
| length_cm |
| width_cm |
| height_cm |
| --- CATCH WEIGHT (Mandatory Bulk) --- |
| is_catch_weight |
| catch_weight_uom |
| nominal_qty_per_unit |
| --- TOLERANCE (Critical Bulk) --- |
| tolerance_pct_inbound |
| tolerance_pct_outbound |
| shrinkage_rate_pct |
| --- UOM & PACKAGING --- |
| packkey |
| packuom3 |
| packuom2 |
| innerpack |
| packuom4 |
| pallet_qty |
| packuom8 |
| otherunit1 |
| packuom9 |
| otherunit2 |
| billing_uom |
| --- STORAGE & PUTAWAY --- |
| putawayzone |
| putawaystrategykey |
| stdputawayzone |
| --- ROTATION & EXPIRY --- |
| strategykey |
| rotateby |
| rotatefield |
| shelflife |
| --- BAGGING / VAS --- |
| is_packaging |
| default_bag_weight_kg |
| packaging_material_sku |
| --- CUSTOMS --- |
| hs_code |
| country_of_origin |
| --- USER-DEFINED (TVL) --- |
| susr1 |
| susr2 |
| susr3 |
| susr4 |
| susr5 |
| --- AUDIT --- |
| is_active |
| created_by |
| created_at |
| updated_at |


## Sheet: warehouse

| 4. Warehouse (Kho) |
| --- |
| Table: warehouse  \|  HOAN TOAN THIEU trong phieu thu thap. TVL: 11 kho, ~81,500 m2. |
| Field |
| id |
| code |
| name |
| site_id |
| type |
| total_area_m2 |
| usable_area_m2 |
| max_height_m |
| max_capacity_mt |
| address |
| is_advanced_wh |
| default_receipt_loc |
| default_staging_loc |
| default_shipping_loc |
| has_weighbridge |
| weighbridge_count |
| is_bonded |
| capacity_warning_pct |
| timezone |
| is_active |
| created_at |
| updated_at |


## Sheet: carrier

| 5. Carrier (Nha van chuyen) |
| --- |
| Table: carrier  \|  NVC. Lien ket shipment + vehicle type cho weighbridge va billing. |
| Field |
| --- EXISTING TVL FIELDS --- |
| storerkey |
| company |
| address1 |
| contact1 |
| phone1 |
| taxcode |
| --- NEW FIELDS --- |
| email |
| carrier_group |
| mode_of_delivery |
| default_vehicle_type |
| scac_code |
| is_active |
| created_at |
| updated_at |


## Sheet: vehicle_type

| 5.1 Vehicle Type (Loai xe) |
| --- |
| Table: vehicle_type  \|  HOAN TOAN THIEU. CRITICAL cho weighbridge + billing. |
| Field |
| code |
| name |
| category |
| default_tare_weight_kg |
| max_payload_kg |
| teu_equivalent |
| handling_fee_group |
| is_active |


## Sheet: location

| 6. Location (Vi tri) |
| --- |
| Table: location  \|  Vi tri kho. Hang xa: khu vuc san/bai chat dong. Phieu co 4 fields, bo sung 18. |
| Field |
| --- IDENTIFICATION --- |
| loc |
| warehouse_id |
| putawayzone |
| --- TYPE & PROFILE --- |
| location_type |
| location_profile |
| status |
| --- CAPACITY (Critical Bulk) --- |
| area_m2 |
| max_height_m |
| capacity_mt |
| stacklimit |
| current_occupancy_mt |
| --- MIXING RULES (Critical Bulk) --- |
| is_mixed_owner |
| is_mixed_product |
| is_mixed_lot |
| --- BILLING & LAYOUT --- |
| is_billing_location |
| stacking_rule |
| x_coord |
| y_coord |
| check_digit |
| --- AUDIT --- |
| is_active |
| created_at |
| updated_at |


## Sheet: zone

| 6.1 Zone (Khu vuc) |
| --- |
| Table: zone  \|  Khu vuc trong kho, nhom nhieu location. |
| Field |
| --- EXISTING TVL FIELDS --- |
| putawayzone |
| descr |
| --- NEW FIELDS --- |
| warehouse_id |
| zone_group_id |
| zone_type |
| is_billing_zone |
| billing_rate_zone |
| max_capacity_mt |
| is_active |


## Sheet: uom

| 7. UOM (Don vi tinh) |
| --- |
| Table: uom  \|  Don vi do luong. Hang xa: KG(inventory) -> MT(billing). |
| Field |
| code |
| description |
| uom_class |
| is_base_uom |
| decimal_precision |
| is_active |


## Sheet: uom_conversion

| 7.1 UOM Conversion (Chuyen doi DV) |
| --- |
| Table: uom_conversion  \|  He so chuyen doi. Global (KG->MT) + theo SKU (1 BAG=50KG). |
| Field |
| id |
| from_uom |
| to_uom |
| conversion_factor |
| sku |
| is_active |


## Sheet: reason_code

| 8. Reason Code (Ma ly do) |
| --- |
| Table: reason_code  \|  HOAN TOAN THIEU. Bat buoc cho manual weight, tolerance, shrinkage, damage. |
| Field |
| code |
| description |
| category |
| requires_approval |
| affects_billing |
| is_active |
