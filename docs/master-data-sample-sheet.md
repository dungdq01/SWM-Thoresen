# Dữ liệu mẫu Master Data — SWM Thoresen

> **Mục đích**: Cung cấp bộ dữ liệu mẫu cho tất cả các bảng Master Data của hệ thống Smart Warehouse Management (SWM).
> Dữ liệu mô phỏng hoạt động thực tế tại cảng/kho Thoresen Việt Linh (TVL), phục vụ dev, test và demo.
>
> **Cập nhật**: 2026-03-11

---

## Mục lục

1. [Đơn vị tính (UOM)](#1-đơn-vị-tính-uom)
2. [Quy đổi UOM](#2-quy-đổi-uom)
3. [Kho (Warehouse)](#3-kho-warehouse)
4. [Khu vực (Zone)](#4-khu-vực-zone)
5. [Vị trí (Location)](#5-vị-trí-location)
6. [Chủ hàng (Owner)](#6-chủ-hàng-owner)
7. [Nhà cung cấp / Tàu (Vendor)](#7-nhà-cung-cấp--tàu-vendor)
8. [Khách hàng (Customer)](#8-khách-hàng-customer)
9. [Mặt hàng (Item)](#9-mặt-hàng-item)
10. [Loại phương tiện (Vehicle Type)](#10-loại-phương-tiện-vehicle-type)
11. [Trạng thái tồn kho (Inventory Status)](#11-trạng-thái-tồn-kho-inventory-status)
12. [Cấu hình Dropdown](#12-cấu-hình-dropdown)

---

## 1. Đơn vị tính (UOM)

> Enum `UomClass`: WEIGHT | VOLUME | QUANTITY | LENGTH | AREA

| uomCode | description       | uomClass | isBaseUom | decimalPrecision |
|---------|-------------------|----------|-----------|------------------|
| KG      | Kilogram          | WEIGHT   | true      | 3                |
| MT      | Metric Ton        | WEIGHT   | false     | 3                |
| BAG25   | Bao 25kg          | QUANTITY | false     | 0                |
| BAG40   | Bao 40kg          | QUANTITY | false     | 0                |
| BAG50   | Bao 50kg          | QUANTITY | false     | 0                |
| JUMBO   | Bao Jumbo (1 tấn) | QUANTITY | false     | 0                |
| PCS     | Cái / Chiếc       | QUANTITY | true      | 0                |
| L       | Lít               | VOLUME   | true      | 2                |
| M3      | Mét khối          | VOLUME   | false     | 3                |
| M2      | Mét vuông         | AREA     | true      | 2                |
| M       | Mét               | LENGTH   | true      | 2                |
| DRUM    | Thùng phuy        | QUANTITY | false     | 0                |
| PLT     | Pallet            | QUANTITY | false     | 0                |
| TEU     | Twenty-foot Equivalent Unit | QUANTITY | false | 0           |

---

## 2. Quy đổi UOM

| fromUom | toUom | conversionFactor | description            |
|---------|-------|------------------|------------------------|
| MT      | KG    | 1000             | 1 MT = 1,000 KG       |
| BAG25   | KG    | 25               | 1 Bao 25kg = 25 KG    |
| BAG40   | KG    | 40               | 1 Bao 40kg = 40 KG    |
| BAG50   | KG    | 50               | 1 Bao 50kg = 50 KG    |
| JUMBO   | KG    | 1000             | 1 Jumbo = 1,000 KG    |
| M3      | L     | 1000             | 1 M3 = 1,000 L        |
| DRUM    | L     | 200              | 1 Drum = 200 L        |

---

## 3. Kho (Warehouse)

> Enum `WarehouseType`: COVERED | OPEN_YARD | MIXED

| warehouseCode | warehouseName           | warehouseType | totalAreaM2 | usableAreaM2 | maxHeightM | maxCapacityMt | address                                  | hasWeighbridge | weighbridgeCount | isBonded | capacityWarningPct |
|---------------|-------------------------|---------------|-------------|--------------|------------|---------------|------------------------------------------|----------------|------------------|----------|--------------------|
| WH-01         | Kho 1 — Hàng rời        | COVERED       | 12000       | 10500        | 15         | 50000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | true           | 2                | false    | 85                 |
| WH-02         | Kho 2 — Hàng bao        | COVERED       | 8000        | 7200         | 12         | 30000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | true           | 1                | false    | 85                 |
| WH-03         | Kho 3 — Phân bón        | COVERED       | 6000        | 5400         | 10         | 25000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | false          |                  | false    | 80                 |
| WH-04         | Kho 4 — Kho ngoại quan  | COVERED       | 5000        | 4500         | 10         | 20000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | true           | 1                | true     | 90                 |
| OY-01         | Bãi hở A — Thép & Sắt  | OPEN_YARD     | 15000       | 13000        | 0          | 40000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | true           | 1                | false    | 80                 |
| OY-02         | Bãi hở B — Container    | OPEN_YARD     | 20000       | 18000        | 0          | 35000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | false          |                  | false    | 80                 |
| MX-01         | Kho tổng hợp            | MIXED         | 10000       | 8500         | 12         | 35000         | Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu    | true           | 1                | false    | 85                 |

---

## 4. Khu vực (Zone)

> Enum `ZoneType`: RECEIVING | STORAGE | STAGING | SHIPPING | QC | DAMAGED | RETURNS

| zoneCode   | zoneName               | warehouseCode | zoneType  | isBillingZone | billingRateZone | maxCapacityMt |
|------------|------------------------|---------------|-----------|---------------|-----------------|---------------|
| WH01-RCV   | Nhận hàng — Kho 1      | WH-01         | RECEIVING | false         |                 | 5000          |
| WH01-STG-A | Lưu kho A — Kho 1      | WH-01         | STORAGE   | true          | BULK-A          | 20000         |
| WH01-STG-B | Lưu kho B — Kho 1      | WH-01         | STORAGE   | true          | BULK-B          | 20000         |
| WH01-STAG  | Tập kết — Kho 1        | WH-01         | STAGING   | false         |                 | 3000          |
| WH01-SHIP  | Xuất hàng — Kho 1      | WH-01         | SHIPPING  | false         |                 | 5000          |
| WH01-QC    | Kiểm tra CL — Kho 1    | WH-01         | QC        | false         |                 | 500           |
| WH01-DMG   | Hàng hư — Kho 1        | WH-01         | DAMAGED   | false         |                 | 1000          |
| WH02-RCV   | Nhận hàng — Kho 2      | WH-02         | RECEIVING | false         |                 | 3000          |
| WH02-STG-A | Lưu kho A — Kho 2      | WH-02         | STORAGE   | true          | BAGGED-A        | 15000         |
| WH02-STG-B | Lưu kho B — Kho 2      | WH-02         | STORAGE   | true          | BAGGED-B        | 10000         |
| WH02-SHIP  | Xuất hàng — Kho 2      | WH-02         | SHIPPING  | false         |                 | 3000          |
| WH03-STG   | Lưu kho — Kho 3        | WH-03         | STORAGE   | true          | FERT-MAIN       | 20000         |
| WH03-RCV   | Nhận hàng — Kho 3      | WH-03         | RECEIVING | false         |                 | 2000          |
| WH04-STG   | Lưu kho — Ngoại quan   | WH-04         | STORAGE   | true          | BONDED-MAIN     | 15000         |
| OY01-STG   | Bãi chứa — Bãi hở A   | OY-01         | STORAGE   | true          | OPEN-STEEL      | 30000         |
| OY02-STG   | Bãi container          | OY-02         | STORAGE   | true          | OPEN-CONT       | 25000         |

---

## 5. Vị trí (Location)

> Enum `LocationType`: RECEIVING | STORAGE | STAGING | SHIPPING | QC | DAMAGED | RETURNS | VIRTUAL
> Enum `LocationStatus`: OK | HOLD | BLOCKED

| locationCode    | warehouseCode | zoneCode   | locationType | locationProfile | status | areaM2 | maxHeightM | stackLimitKg | isMixedOwner | isMixedProduct | isBillingLocation | stackingRule |
|-----------------|---------------|------------|--------------|-----------------|--------|--------|------------|--------------|--------------|----------------|-------------------|--------------|
| WH01-RCV-01     | WH-01         | WH01-RCV   | RECEIVING    | RCV-BULK        | OK     | 200    | 15         | 100000       | true         | true           | false             |              |
| WH01-RCV-02     | WH-01         | WH01-RCV   | RECEIVING    | RCV-BULK        | OK     | 200    | 15         | 100000       | true         | true           | false             |              |
| WH01-A-01       | WH-01         | WH01-STG-A | STORAGE      | STG-BULK        | OK     | 500    | 15         | 200000       | false        | false          | true              | FIFO         |
| WH01-A-02       | WH-01         | WH01-STG-A | STORAGE      | STG-BULK        | OK     | 500    | 15         | 200000       | false        | false          | true              | FIFO         |
| WH01-A-03       | WH-01         | WH01-STG-A | STORAGE      | STG-BULK        | OK     | 400    | 15         | 150000       | false        | false          | true              | FIFO         |
| WH01-B-01       | WH-01         | WH01-STG-B | STORAGE      | STG-BULK        | OK     | 500    | 15         | 200000       | false        | false          | true              | FIFO         |
| WH01-B-02       | WH-01         | WH01-STG-B | STORAGE      | STG-BULK        | HOLD   | 500    | 15         | 200000       | false        | false          | true              | FIFO         |
| WH01-STAG-01    | WH-01         | WH01-STAG  | STAGING      | STG-TEMP        | OK     | 300    | 15         | 80000        | true         | true           | false             |              |
| WH01-SHIP-01    | WH-01         | WH01-SHIP  | SHIPPING     | SHIP-BULK       | OK     | 300    | 15         | 100000       | true         | true           | false             |              |
| WH01-SHIP-02    | WH-01         | WH01-SHIP  | SHIPPING     | SHIP-BULK       | OK     | 300    | 15         | 100000       | true         | true           | false             |              |
| WH01-QC-01      | WH-01         | WH01-QC    | QC           | QC-DEFAULT      | OK     | 100    | 5          | 20000        | true         | true           | false             |              |
| WH01-DMG-01     | WH-01         | WH01-DMG   | DAMAGED      | DMG-DEFAULT     | BLOCKED| 200    | 10         | 50000        | true         | true           | false             |              |
| WH02-RCV-01     | WH-02         | WH02-RCV   | RECEIVING    | RCV-BAGGED      | OK     | 150    | 12         | 60000        | true         | true           | false             |              |
| WH02-A-01       | WH-02         | WH02-STG-A | STORAGE      | STG-BAGGED      | OK     | 400    | 12         | 120000       | false        | false          | true              | FIFO         |
| WH02-A-02       | WH-02         | WH02-STG-A | STORAGE      | STG-BAGGED      | OK     | 400    | 12         | 120000       | false        | false          | true              | FIFO         |
| WH02-A-03       | WH-02         | WH02-STG-A | STORAGE      | STG-BAGGED      | OK     | 350    | 12         | 100000       | false        | true           | true              | FIFO         |
| WH02-B-01       | WH-02         | WH02-STG-B | STORAGE      | STG-BAGGED      | OK     | 400    | 12         | 100000       | false        | false          | true              | LIFO         |
| WH02-SHIP-01    | WH-02         | WH02-SHIP  | SHIPPING     | SHIP-BAGGED     | OK     | 200    | 12         | 60000        | true         | true           | false             |              |
| WH03-RCV-01     | WH-03         | WH03-RCV   | RECEIVING    | RCV-FERT        | OK     | 120    | 10         | 50000        | true         | true           | false             |              |
| WH03-STG-01     | WH-03         | WH03-STG   | STORAGE      | STG-FERT        | OK     | 600    | 10         | 180000       | false        | false          | true              | FIFO         |
| WH03-STG-02     | WH-03         | WH03-STG   | STORAGE      | STG-FERT        | OK     | 500    | 10         | 150000       | false        | false          | true              | FIFO         |
| WH04-STG-01     | WH-04         | WH04-STG   | STORAGE      | STG-BONDED      | OK     | 500    | 10         | 100000       | false        | false          | true              | FIFO         |
| WH04-STG-02     | WH-04         | WH04-STG   | STORAGE      | STG-BONDED      | OK     | 400    | 10         | 80000        | false        | false          | true              | FIFO         |
| OY01-STG-01     | OY-01         | OY01-STG   | STORAGE      | STG-OPEN        | OK     | 2000   |            | 500000       | false        | false          | true              |              |
| OY01-STG-02     | OY-01         | OY01-STG   | STORAGE      | STG-OPEN        | OK     | 2000   |            | 500000       | false        | false          | true              |              |
| OY02-STG-01     | OY-02         | OY02-STG   | STORAGE      | STG-CONT        | OK     | 3000   |            | 400000       | true         | true           | true              | STACK-3      |
| VIRTUAL-ADJ     | WH-01         | WH01-STG-A | VIRTUAL      | VIRTUAL         | OK     |        |            |              | true         | true           | false             |              |

---

## 6. Chủ hàng (Owner)

> Enum `OwnerType`: DIRECT | CONSIGNED | OTHER

| ownerCode | ownerName                          | shortName | ownerGroup | ownerType | taxCode       | address                                         | billingEmail               | billingContact    | paymentTerms | defaultTolerancePct | defaultWarehouseCode |
|-----------|------------------------------------|-----------|------------|-----------|---------------|--------------------------------------------------|----------------------------|-------------------|--------------|---------------------|----------------------|
| OWN-001   | Thoresen Vietnamese Logistics      | TVL       | LOCAL      | DIRECT    | 3602352688    | KCN Phú Mỹ 1, Tân Thành, BRVT                  | billing@tvl.com.vn         | Nguyễn Thanh Hà   | NET30        | 2.0                 | WH-01                |
| OWN-002   | Công ty CP Nông sản Miền Nam       | NSMT      | LOCAL      | DIRECT    | 0301234567    | 45 Nguyễn Huệ, Q1, TP.HCM                       | ketoan@nsmt.com.vn         | Trần Văn Bình     | NET45        | 1.5                 | WH-02                |
| OWN-003   | Toyota Tsusho (Vietnam)            | TTCV      | FOREIGN    | DIRECT    | 0309876543    | Lầu 12, Saigon Centre, Q1, TP.HCM               | finance@ttcv.com.vn        | Yamada Kenji      | NET60        | 1.0                 | WH-04                |
| OWN-004   | PVFCCo — Đạm Phú Mỹ               | PVFCCO    | LOCAL      | DIRECT    | 3500100200    | KCN Phú Mỹ, TX Phú Mỹ, BRVT                    | ap@pvfcco.com.vn           | Lê Minh Tuấn      | NET30        | 2.5                 | WH-03                |
| OWN-005   | COFCO International Vietnam        | COFCO     | FOREIGN    | CONSIGNED | 0312345678    | 15 Lê Duẩn, Q1, TP.HCM                          | billing-vn@cofco.com       | Wang Lei          | NET45        | 1.0                 | WH-01                |
| OWN-006   | Tổng công ty Thép Việt Nam         | VNSteel   | LOCAL      | DIRECT    | 0100101010    | 91 Láng Hạ, Đống Đa, Hà Nội                     | payment@vnsteel.vn         | Phạm Quốc Dũng   | NET30        | 0.5                 | OY-01                |
| OWN-007   | Công ty TNHH Hóa chất Đông Á      | HCDA      | LOCAL      | OTHER     | 3601112233    | 78 Trần Hưng Đạo, Tp Vũng Tàu, BRVT             | hcda.finance@gmail.com     | Võ Thị Lan        | NET30        | 2.0                 | MX-01                |

---

## 7. Nhà cung cấp / Tàu (Vendor)

> Enum `SupplierGroup`: DOMESTIC | OVERSEAS | VESSEL_AGENT | TRADER

| vendorCode | vendorName                         | supplierGroup | countryRegion | vesselName         | contactName      | phone         | email                       | taxCode       |
|------------|------------------------------------|---------------|---------------|--------------------|------------------|---------------|-----------------------------|---------------|
| VND-001    | MV Pacific Fortune                 | VESSEL_AGENT  | Singapore     | Pacific Fortune    | Captain Tan      | +65-91234567  | ops@pacificfortune.sg       |               |
| VND-002    | MV Bulk Asia                       | VESSEL_AGENT  | Vietnam       | Bulk Asia          | Nguyễn Hải Long  | 0254-3850001  | vessel@bulkasia.vn          |               |
| VND-003    | MV Green Star                      | OVERSEAS      | China         | Green Star         | Li Wei           | +86-13800001  | greenstar@shipping.cn       |               |
| VND-004    | Vận tải Phú Mỹ                     | DOMESTIC      | Vietnam       |                    | Trần Văn Huy     | 0901234001    | vantai@phumy.com.vn         | 3601001001    |
| VND-005    | Công ty Sà lan Mekong              | DOMESTIC      | Vietnam       |                    | Lê Thanh Sơn     | 0907654001    | dispatch@mekongbarge.vn     | 3602002002    |
| VND-006    | Saigon Shipping Lines              | DOMESTIC      | Vietnam       |                    | Phạm Minh Đức    | 0281234567    | ops@saigonshipping.com.vn   | 0308765432    |
| VND-007    | Louis Dreyfus Company              | TRADER        | Switzerland   |                    | Pierre Dupont    | +41-223456789 | trade-vn@ldc.com            |               |
| VND-008    | Olam International                 | TRADER        | Singapore     |                    | Ravi Kumar       | +65-64567890  | vietnam@olam.com            |               |

---

## 8. Khách hàng (Customer)

> Enum `CustomerGroup`: CORPORATE | INDIVIDUAL
> Enum `CustomerType`: BUYER | CONSIGNEE | SHIPPER

| customerCode | customerName                        | shortName | customerGroup | customerType | taxCode       | contactName      | phone         | email                       | address                                    |
|--------------|-------------------------------------|-----------|---------------|--------------|---------------|------------------|---------------|-----------------------------|--------------------------------------------|
| CUS-001      | Công ty TNHH Thức ăn chăn nuôi ABC | TACN-ABC  | CORPORATE     | BUYER        | 0301112233    | Nguyễn Văn An    | 0901234567    | mua@tacnabc.com.vn          | 123 Quốc lộ 51, Long Thành, Đồng Nai      |
| CUS-002      | Công ty CP Gạo Việt                 | GaoViet   | CORPORATE     | BUYER        | 0304455667    | Trần Thị Bích    | 0907654321    | order@gaoviet.com.vn        | 456 Lê Lợi, Q1, TP.HCM                    |
| CUS-003      | Tập đoàn Hòa Phát                  | HPG       | CORPORATE     | BUYER        | 0100200300    | Lê Quốc Cường    | 0241234567    | procurement@hoaphat.com.vn  | 39 Nguyễn Đình Chiểu, Hai Bà Trưng, HN    |
| CUS-004      | Công ty XNK Đông Phương             | DP-XNK    | CORPORATE     | CONSIGNEE    | 3601234500    | Phạm Thị Dung    | 0254-3810001  | shipping@dongphuong.vn      | KCN Phú Mỹ 2, TX Phú Mỹ, BRVT             |
| CUS-005      | Nhà máy Đạm Cà Mau                 | PVCFC     | CORPORATE     | SHIPPER      | 2000100200    | Trương Minh Hiếu  | 0780123456    | logistics@pvcfc.com.vn      | KCN Khí - Điện - Đạm, Cà Mau              |
| CUS-006      | Hộ kinh doanh Nguyễn Văn Phát      | NV-Phat   | INDIVIDUAL    | BUYER        |               | Nguyễn Văn Phát  | 0912345678    | phat.nguyen@gmail.com       | 789 CMT8, Q3, TP.HCM                      |
| CUS-007      | Mediterranean Shipping Company      | MSC       | CORPORATE     | CONSIGNEE    |               | Marco Rossi      | +41-227038888 | vietnam@msc.com             | Tầng 10, Bitexco, Q1, TP.HCM              |

---

## 9. Mặt hàng (Item)

> Enum `CargoForm`: BULK | BAGGED_25KG | BAGGED_40KG | BAGGED_50KG | JUMBO | PACKAGING | CONTAINER | DRUM | PALLET | OTHER

| itemCode | itemName                      | itemNameEn                 | productGroup  | cargoForm   | category      | baseUom | billingUom | stdGrossWeight | stdNetWeight | densityMtPerM3 | tolerancePctInbound | tolerancePctOutbound | shrinkageRatePct | rotateBy | shelfLifeDays | isCatchWeight | isStorageBillable | isPackaging | defaultBagWeightKg | hsCode       | countryOfOrigin |
|----------|-------------------------------|----------------------------|---------------|-------------|---------------|---------|------------|----------------|--------------|----------------|---------------------|----------------------|------------------|----------|---------------|---------------|-------------------|-------------|--------------------|--------------|-----------------|
| RICE-5T  | Gạo 5% tấm                   | Rice 5% Broken             | AGRICULTURAL  | BAGGED_50KG | Lương thực    | KG      | MT         | 50.5           | 50.0         | 0.75           | 2.0                 | 1.5                  | 0.5              | FEFO     | 365           | true          | true              | false       | 50                 | 1006.30      | Vietnam         |
| RICE-15T | Gạo 15% tấm                  | Rice 15% Broken            | AGRICULTURAL  | BAGGED_50KG | Lương thực    | KG      | MT         | 50.5           | 50.0         | 0.73           | 2.0                 | 1.5                  | 0.5              | FEFO     | 365           | true          | true              | false       | 50                 | 1006.30      | Vietnam         |
| RICE-JB  | Gạo xuất khẩu (Jumbo)        | Rice Export Jumbo          | AGRICULTURAL  | JUMBO       | Lương thực    | KG      | MT         | 1005           | 1000         | 0.75           | 1.5                 | 1.0                  | 0.3              | FEFO     | 365           | true          | true              | false       |                    | 1006.30      | Vietnam         |
| RICE-BLK | Gạo rời                       | Bulk Rice                  | AGRICULTURAL  | BULK        | Lương thực    | KG      | MT         |                |              | 0.78           | 2.5                 | 2.0                  | 0.8              | FEFO     | 300           | true          | true              | false       |                    | 1006.30      | Vietnam         |
| UREA-BLK | Phân Urea hạt — rời           | Urea Prilled Bulk          | FERTILIZER    | BULK        | Phân bón      | KG      | MT         |                |              | 0.77           | 2.0                 | 1.5                  | 0.2              | FEFO     | 730           | true          | true              | false       |                    | 3102.10      | Vietnam         |
| UREA-50  | Phân Urea hạt — bao 50kg     | Urea Prilled 50kg Bag      | FERTILIZER    | BAGGED_50KG | Phân bón      | KG      | MT         | 50.3           | 50.0         | 0.77           | 1.5                 | 1.0                  | 0.2              | FEFO     | 730           | true          | true              | false       | 50                 | 3102.10      | Vietnam         |
| DAP-50   | Phân DAP — bao 50kg          | DAP Fertilizer 50kg Bag    | FERTILIZER    | BAGGED_50KG | Phân bón      | KG      | MT         | 50.3           | 50.0         | 0.95           | 1.5                 | 1.0                  | 0.1              | FEFO     | 730           | false         | true              | false       | 50                 | 3105.10      | China           |
| STEEL-HR | Thép cuộn cán nóng            | Hot Rolled Steel Coil      | STEEL         | OTHER       | Kim loại      | KG      | MT         |                |              | 7.85           | 0.5                 | 0.5                  | 0.0              |          |               | true          | true              | false       |                    | 7208.10      | Vietnam         |
| STEEL-RB | Thép thanh vằn                | Deformed Steel Bar         | STEEL         | OTHER       | Kim loại      | KG      | MT         |                |              | 7.85           | 0.5                 | 0.5                  | 0.0              |          |               | true          | true              | false       |                    | 7214.20      | Vietnam         |
| CHEM-NaOH| Xút (NaOH) lỏng              | Caustic Soda Liquid        | CHEMICAL      | DRUM        | Hóa chất      | KG      | MT         |                |              | 1.52           | 1.0                 | 1.0                  | 0.0              | FEFO     | 365           | true          | true              | false       |                    | 2815.11      | Vietnam         |
| CLINKER  | Clinker xi măng               | Cement Clinker             | GENERAL       | BULK        | VLXD          | KG      | MT         |                |              | 1.40           | 3.0                 | 2.0                  | 0.5              |          |               | true          | true              | false       |                    | 2523.10      | Vietnam         |
| PKG-PP50 | Bao PP 50kg (vật liệu đóng gói) | PP Bag 50kg             | PACKAGING     | PACKAGING   | Bao bì        | PCS     | PCS        | 0.12           |              |                |                     |                      |                  |          |               | false         | false             | true        |                    | 6305.33      | Vietnam         |
| CONT-20FT| Container 20ft               | Container 20FT             | GENERAL       | CONTAINER   | Container     | TEU     | TEU        |                |              |                |                     |                      |                  |          |               | false         | true              | false       |                    |              |                 |

---

## 10. Loại phương tiện (Vehicle Type)

> Enum `VehicleCategory`: (theo schema — TRUCK, CONTAINER_TRUCK, BARGE, VESSEL, etc.)

| vehicleTypeCode | vehicleTypeName             | category         | defaultTareWeightKg | maxPayloadKg | teuEquivalent | handlingFeeGroup |
|-----------------|-----------------------------|------------------|---------------------|--------------|---------------|------------------|
| TRUCK-5T        | Xe tải 5 tấn                | TRUCK            | 3500                | 5000         |               | FEE-TRUCK-S      |
| TRUCK-10T       | Xe tải 10 tấn               | TRUCK            | 5500                | 10000        |               | FEE-TRUCK-M      |
| TRUCK-15T       | Xe tải 15 tấn               | TRUCK            | 6500                | 15000        |               | FEE-TRUCK-L      |
| TRUCK-20T       | Xe tải 20 tấn               | TRUCK            | 8000                | 20000        |               | FEE-TRUCK-XL     |
| CONT-20         | Xe container 20FT           | CONTAINER_TRUCK  | 9500                | 21500        | 1.0           | FEE-CONT-20      |
| CONT-40         | Xe container 40FT           | CONTAINER_TRUCK  | 12000               | 28000        | 2.0           | FEE-CONT-40      |
| BARGE-500       | Sà lan 500 tấn              | BARGE            | 150000              | 500000       |               | FEE-BARGE-S      |
| BARGE-1000      | Sà lan 1,000 tấn            | BARGE            | 250000              | 1000000      |               | FEE-BARGE-M      |
| BARGE-2000      | Sà lan 2,000 tấn            | BARGE            | 400000              | 2000000      |               | FEE-BARGE-L      |
| VESSEL-HBC      | Tàu hàng rời (Handysize)    | VESSEL           | 4000000             | 30000000     |               | FEE-VESSEL       |
| VESSEL-SX       | Tàu hàng rời (Supramax)     | VESSEL           | 8000000             | 55000000     |               | FEE-VESSEL       |

---

## 11. Trạng thái tồn kho (Inventory Status)

| statusCode   | description                       | displayOrder | isAllocatable | isSystemLocked |
|--------------|-----------------------------------|--------------|---------------|----------------|
| AVAILABLE    | Sẵn sàng — có thể phân bổ xuất   | 1            | true          | true           |
| QC_HOLD      | Chờ kiểm tra chất lượng           | 2            | false         | true           |
| DAMAGED      | Hư hỏng — chờ xử lý              | 3            | false         | true           |
| BLOCKED      | Bị khóa nghiệp vụ                | 4            | false         | true           |
| IN_TRANSIT   | Đang luân chuyển nội bộ           | 5            | false         | true           |
| EXPIRED      | Hết hạn sử dụng                  | 6            | false         | false          |
| RESERVED     | Đã giữ cho đơn xuất              | 7            | false         | true           |
| DISPUTE      | Đang tranh chấp số lượng         | 8            | false         | false          |

---

## 12. Cấu hình Dropdown

> Các giá trị dropdown có thể cấu hình tại runtime, không hard-code trong code.

### 12.1 Owner — Nhóm chủ hàng (`ownerGroup`)

| value    | label         | sortOrder | isDefault |
|----------|---------------|-----------|-----------|
| LOCAL    | Nội địa       | 1         | true      |
| FOREIGN  | Nước ngoài    | 2         | false     |

### 12.2 Owner — Loại chủ hàng (`ownerType`)

| value     | label         | sortOrder | isDefault |
|-----------|---------------|-----------|-----------|
| DOMESTIC  | Trong nước    | 1         | true      |
| EXPORT    | Xuất khẩu     | 2         | false     |
| IMPORT    | Nhập khẩu     | 3         | false     |

### 12.3 Vendor — Nhóm nhà cung cấp (`supplierGroup`)

| value        | label         | sortOrder | isDefault |
|--------------|---------------|-----------|-----------|
| VESSEL_AGENT | Tàu           | 1         | true      |
| DOMESTIC     | Nội địa       | 2         | false     |
| OVERSEAS     | Nước ngoài    | 3         | false     |
| TRADER       | Thương nhân   | 4         | false     |

### 12.4 Customer — Nhóm khách hàng (`customerGroup`)

| value      | label        | sortOrder | isDefault |
|------------|--------------|-----------|-----------|
| CORPORATE  | Doanh nghiệp | 1         | true      |
| INDIVIDUAL | Cá nhân      | 2         | false     |

### 12.5 Customer — Loại khách hàng (`customerType`)

| value     | label              | sortOrder | isDefault |
|-----------|--------------------|-----------|-----------|
| BUYER     | Người mua          | 1         | true      |
| CONSIGNEE | Người nhận hàng    | 2         | false     |
| SHIPPER   | Người gửi hàng     | 3         | false     |

### 12.6 Item — Dạng hàng (`cargoForm`)

| value       | label          | sortOrder | isDefault |
|-------------|----------------|-----------|-----------|
| BULK        | Hàng rời       | 1         | true      |
| BAGGED_25KG | Đóng bao 25kg  | 2         | false     |
| BAGGED_40KG | Đóng bao 40kg  | 3         | false     |
| BAGGED_50KG | Đóng bao 50kg  | 4         | false     |
| JUMBO       | Bao Jumbo      | 5         | false     |
| PACKAGING   | Bao bì         | 6         | false     |
| CONTAINER   | Container      | 7         | false     |
| DRUM        | Thùng phuy     | 8         | false     |
| PALLET      | Pallet         | 9         | false     |
| OTHER       | Khác           | 10        | false     |

### 12.7 Item — Nhóm sản phẩm (`productGroup`)

| value        | label            | sortOrder | isDefault |
|--------------|------------------|-----------|-----------|
| AGRICULTURAL | Nông sản         | 1         | true      |
| FERTILIZER   | Phân bón         | 2         | false     |
| CHEMICAL     | Hóa chất         | 3         | false     |
| STEEL        | Thép             | 4         | false     |
| GENERAL      | Hàng tổng hợp    | 5         | false     |
| PACKAGING    | Bao bì / Đóng gói| 6         | false     |

### 12.8 Warehouse — Loại kho (`warehouseType`)

| value     | label                 | sortOrder | isDefault |
|-----------|-----------------------|-----------|-----------|
| COVERED   | Kho có mái che        | 1         | true      |
| OPEN_YARD | Bãi hở                | 2         | false     |
| MIXED     | Kho hỗn hợp           | 3         | false     |

---

## Ghi chú

- **ID**: Tất cả ID trong hệ thống sử dụng UUID v4, không thể hiện trong bảng này. Khi seed vào DB, hệ thống tự sinh ID.
- **Quan hệ FK**: Các cột như `warehouseCode`, `zoneCode`, `baseUom`, `billingUom` trong bảng trên dùng mã (code) để dễ đọc. Khi seed thực tế, cần map sang UUID tương ứng.
- **rowVersion**: Mặc định = 0, dùng cho optimistic concurrency.
- **isActive**: Mặc định = true cho tất cả bản ghi mới.
- **Timestamps**: `createdAt`, `updatedAt` tự sinh bởi Prisma.
- **Ngữ cảnh**: Dữ liệu mẫu dựa trên hoạt động kho vận cảng Phú Mỹ, Bà Rịa - Vũng Tàu, phù hợp với nghiệp vụ Thoresen Vietnamese Logistics (TVL).
