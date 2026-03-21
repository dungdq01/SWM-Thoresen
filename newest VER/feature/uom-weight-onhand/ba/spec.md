# Feature Spec: UOM Conversion & Weight Tracking in Inventory

> **Slug**: `uom-weight-onhand`
> **Version**: 2.1
> **Date**: 2026-03-18
> **Status**: DRAFT — Awaiting Approval
> **Change v2.1**: Removed `UomConversion` table — extend `UomConversion` instead (approved by stakeholder)
> **Complexity**: Complex
> **Analysis Type**: Gap Analysis + Requirements

---

## 1. Overview

### Problem Statement

Hệ thống hiện tại có **5 gap nghiêm trọng** trong quản lý đơn vị tính và trọng lượng:

| # | Gap | Severity | Impact |
|---|-----|----------|--------|
| G-1 | Item không có **Base Unit** (inventory unit) — `DefaultUom` chỉ là text tham khảo, không enforce | Critical | Qty trong On Hand không rõ đơn vị, cộng trừ sai khi nhập nhiều UOM |
| G-2 | `InventTrans.Qty` luôn nhận `ReceivedQtyKg` — **không convert** khi UOM khác Base Unit | Critical | On Hand bị sai nếu cùng SKU nhập bằng BAG lần 1 và KG lần 2 |
| G-3 | `OnHand` không lưu **net weight / gross weight** — chỉ có `estimatedWeightMt` tính sai (`qty_kg × bag_shell_weight_kg / 1000`) | Critical | Không hiển thị được trọng lượng thực tế trong On Hand view |
| G-4 | Document lines (PO, Receipt, SO, Order) có field `Uom` nhưng **không lưu thông tin quy đổi** (conversion factor, base qty) | High | Không trace được cách tính, phải lookup lại UomConversion mỗi lần |
| G-5 | **Packaging weight** (`BagShellWeightKg`) chỉ lưu trên Item — thực tế packaging weight khác nhau theo từng **(Item + UOM)** | High | Không tính đúng net weight khi cùng item nhập bằng BAG vs BULK |

### Business Context

Trong 3PL warehouse cho bulk cargo:
- Cùng 1 SKU (ví dụ: Gạo Jasmine) có thể nhập bằng **KG** (cân cầu), **BAG** (đếm bao), hoặc **MT** (metric ton)
- Mỗi UOM có **packaging weight** khác nhau: 1 BAG có bao bì 0.2kg, 1 PALLET có pallet gỗ 25kg, bulk (KG/MT) không có bao bì
- Inventory On Hand cần hiển thị theo **Base Unit** (thống nhất) VÀ **trọng lượng thực tế** (net weight từ cân)
- Billing tính theo **MT** — cần quy đổi chính xác từ base unit
- Transfer cần **track weight loss** giữa source → destination warehouse

### Confirmed Decisions (from stakeholder)

| # | Decision |
|---|----------|
| D-1 | BaseUomId cho existing items: **manual review per item** (không bulk default) |
| D-2 | `BagShellWeightKg` = **packaging/tare weight** (trọng lượng bao bì), đi theo **(Item + UOM)** |
| D-3 | On Hand view: hiển thị **Net Weight + Gross Weight** only. Không hiển thị Tare Weight |
| D-4 | Billing: **audit sau** — defer to separate analysis |
| D-5 | Transfer: **cần track weight loss** (net weight giảm giữa source → dest) |

---

## 2. Proposed Solution

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    MASTER DATA                        │
│                                                      │
│  Item                                                │
│  ├─ base_uom_id (FK → Uom) ← NEW                    │
│  ├─ weight_uom_id (FK → Uom) ← NEW                  │
│  └─ (BagShellWeightKg DEPRECATED)                    │
│                                                      │
│  UomConversion (EXTENDED — existing table)            │
│  ├─ item_id, from_uom_id, to_uom_id (existing)      │
│  ├─ conversion_factor (existing)                     │
│  ├─ packaging_weight_kg ← NEW                        │
│  ├─ net_weight_per_unit_kg ← NEW                     │
│  └─ gross_weight_per_unit_kg ← NEW                   │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│                 DOCUMENT LINES                        │
│                                                      │
│  PO Line / Receipt Line / SO Detail / Order Detail   │
│  / Transfer Line                                     │
│  ├─ transaction_qty ← NEW                            │
│  ├─ transaction_uom_id ← NEW                         │
│  ├─ base_qty ← NEW (auto-calc)                       │
│  ├─ base_uom_id ← NEW (snapshot from Item)           │
│  ├─ conversion_factor ← NEW (snapshot from UomConversion)  │
│  ├─ packaging_weight_kg ← NEW (snapshot from UomConversion)│
│  ├─ net_weight_kg ← existing (from weighbridge)      │
│  └─ gross_weight_kg ← NEW (from weighbridge)         │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│                 INVENTORY CORE                        │
│                                                      │
│  InventTrans                                         │
│  ├─ qty (ALWAYS in Base Unit) ← SEMANTIC CHANGE      │
│  ├─ uom_id ← NEW (= base_uom_id snapshot)            │
│  ├─ net_weight_kg ← RENAME from qty_mt               │
│  └─ gross_weight_kg ← NEW                            │
│                                                      │
│  OnHand                                              │
│  ├─ physical_qty (Base Unit)                         │
│  ├─ net_weight_kg ← NEW (accumulated)                │
│  └─ gross_weight_kg ← NEW (accumulated)              │
└──────────────────────────────────────────────────────┘
```

---

## 3. Data Model Changes

### 3.1 Item — Add Base Unit & Weight UOM

**Entity**: `Item` (`cat.item`)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `BaseUomId` | `Guid` | NOT NULL | **NEW** — Base/Inventory Unit (FK → `Uom`). Tất cả qty trong `InventTrans` và `OnHand` đều theo đơn vị này |
| `WeightUomId` | `Guid?` | NULL | **NEW** — Đơn vị trọng lượng (thường KG). NULL = item không track weight |

**Deprecated fields** (giữ lại cho backward compat, sẽ remove sau):
- `DefaultUom` (string) → replaced by `BaseUomId`
- `BagShellWeightKg` (decimal?) → replaced by `UomConversion.PackagingWeightKg`

**Migration**: Admin **review từng item** để set `BaseUomId` chính xác. Hệ thống cung cấp UI review screen.

### 3.2 UomConversion — Extend with Weight Fields (No New Table)

**Entity**: `UomConversion` (`cat.uom_conversion`) — **EXTEND EXISTING**

Thêm 3 fields vào table hiện tại:

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `PackagingWeightKg` | `decimal` | NOT NULL | 0 | **NEW** — Trọng lượng bao bì per 1 unit của `FromUom` (KG). Ví dụ: 1 BAG có bao bì 0.2 kg |
| `NetWeightPerUnitKg` | `decimal?` | NULL | — | **NEW** — Trọng lượng tịnh hàng per 1 unit của `FromUom` (KG). Ví dụ: 1 BAG net = 49.8 kg |
| `GrossWeightPerUnitKg` | `decimal?` | NULL | — | **NEW** — Trọng lượng tổng per 1 unit = Net + Packaging (KG) |

**Existing fields giữ nguyên**: `ItemId`, `FromUomId`, `ToUomId`, `ConversionFactor`
**Existing unique index giữ nguyên**: `(TenantId, ItemId, FromUomId, ToUomId)`

**Ví dụ data** (Gạo Jasmine, BaseUom = KG):

| FromUom | ToUom (=Base) | ConversionFactor | PackagingWeightKg | NetWeightPerUnitKg | GrossWeightPerUnitKg |
|---------|--------------|-----------------|-------------------|-------------------|---------------------|
| BAG | KG | 50.0 | 0.2 | 49.8 | 50.0 |
| MT | KG | 1000.0 | 0 | 1000.0 | 1000.0 |
| PALLET | KG | 1200.0 | 25.0 | 1175.0 | 1200.0 |

**Lưu ý**: Không cần record KG → KG (base → base). Khi `TransactionUomId = BaseUomId` → `ConversionFactor = 1.0`, `PackagingWeightKg = 0` (implicit, không cần lookup).

**CRUD đã có sẵn** — chỉ cần extend commands/DTOs thêm 3 fields mới.

### 3.3 Document Lines — Add Conversion Snapshot

**Áp dụng cho 5 entities**: `PurchaseOrderLine`, `InboundReceiptLine`, `SaleOrderDetail`, `OrderDetail`, `TransferLine`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `TransactionQty` | `decimal` | NOT NULL | **NEW** — Số lượng theo đơn vị nhập (user input). Ví dụ: 500 BAG |
| `TransactionUomId` | `Guid` | NOT NULL | **NEW** — Đơn vị nhập (FK → `Uom`). Ví dụ: BAG |
| `BaseQty` | `decimal` | NOT NULL | **NEW** — Quy đổi về Base Unit = `TransactionQty × ConversionFactor`. Ví dụ: 25,000 KG |
| `BaseUomId` | `Guid` | NOT NULL | **NEW** — Base Unit snapshot từ Item (FK → `Uom`) |
| `ConversionFactor` | `decimal` | NOT NULL | **NEW** — Hệ số quy đổi snapshot: `1 TransactionUom = ? BaseUom`. Default = 1.0 khi cùng UOM |
| `PackagingWeightKg` | `decimal` | NOT NULL | **NEW** — Packaging weight per unit snapshot từ `UomConversion`. Default = 0 |
| `GrossWeightKg` | `decimal?` | NULL | **NEW** — Trọng lượng tổng từ cân (weighbridge) |

**Existing fields giữ nguyên** (backward compat, sẽ deprecated sau):
- `ExpectedQtyKg`, `ReceivedQtyKg` (Inbound) → map từ `BaseQty` khi BaseUom = KG
- `OriginalQty`, `AllocatedQty`, `ShippedQty` (Outbound) → map từ `BaseQty`
- `PlannedQtyKg`, `ShippedQtyKg`, `ReceivedQtyKg` (Transfer) → map từ `BaseQty`
- `NetWeightKg` → giữ nguyên, nguồn từ weighbridge
- `Uom` (string) → replaced by `TransactionUomId`

**Auto-calculation khi tạo/update line**:
```
BaseQty = TransactionQty × ConversionFactor
TotalPackagingWeightKg = TransactionQty × PackagingWeightKg
EstimatedNetWeightKg = TransactionQty × NetWeightPerUnitKg  (from UomConversion, if available)
EstimatedGrossWeightKg = TransactionQty × GrossWeightPerUnitKg  (from UomConversion, if available)
```

### 3.4 TransferLine — Add Weight Loss Tracking

**Entity**: `TransferLine` (`ops.transfer_line`) — thêm fields cho weight loss

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| *(all Section 3.3 fields)* | — | — | Conversion snapshot fields |
| `ShippedNetWeightKg` | `decimal?` | NULL | **NEW** — Net weight cân tại source khi ship |
| `ShippedGrossWeightKg` | `decimal?` | NULL | **NEW** — Gross weight cân tại source khi ship |
| `ReceivedNetWeightKg` | `decimal?` | NULL | **NEW** — Net weight cân tại dest khi receive |
| `ReceivedGrossWeightKg` | `decimal?` | NULL | **NEW** — Gross weight cân tại dest khi receive |
| `WeightLossKg` | `decimal?` | NULL | **NEW** — Auto-calc = `ShippedNetWeightKg - ReceivedNetWeightKg`. Positive = loss |
| `WeightLossPct` | `decimal?` | NULL | **NEW** — Auto-calc = `WeightLossKg / ShippedNetWeightKg × 100` |

### 3.5 InventTrans — Always Base Unit + Weight

**Entity**: `InventTrans` (`inv.invent_trans`)

| Field | Change | Type | Description |
|-------|--------|------|-------------|
| `Qty` | **SEMANTIC CHANGE** | `decimal` | Luôn là Base Unit qty (không còn hardcode KG) |
| `UomId` | **NEW** | `Guid` | FK → `Uom` — Base UOM snapshot tại thời điểm post |
| `NetWeightKg` | **RENAME** from `QtyMt` | `decimal?` | Trọng lượng tịnh (KG) từ cân. NULL nếu không qua cân |
| `GrossWeightKg` | **NEW** | `decimal?` | Trọng lượng tổng (KG) từ cân. NULL nếu không qua cân |

### 3.6 OnHand — Add Weight Accumulators

**Entity**: `OnHand` (`inv.on_hand`)

| Field | Change | Type | Description |
|-------|--------|------|-------------|
| `PhysicalQty` | **SEMANTIC CHANGE** | `decimal` | Luôn là Base Unit qty |
| `NetWeightKg` | **NEW** | `decimal` | Tổng trọng lượng tịnh tích lũy (KG). Default = 0 |
| `GrossWeightKg` | **NEW** | `decimal` | Tổng trọng lượng tổng tích lũy (KG). Default = 0 |

**Materialization Rule** (thêm vào `MaterializationWorker`):
```
Khi PhysicalQty += trans.Qty:
    onHand.NetWeightKg   += trans.NetWeightKg   ?? 0
    onHand.GrossWeightKg += trans.GrossWeightKg ?? 0

Khi PhysicalQty -= trans.Qty:
    onHand.NetWeightKg   -= trans.NetWeightKg   ?? 0
    onHand.GrossWeightKg -= trans.GrossWeightKg ?? 0
```

### 3.7 OnHand Query — New Weight Columns

**File**: `QueryConfigs/OnHand.json`

**Remove**: `estimatedWeightMt` (công thức sai), `bagShellWeightKg` (deprecated)

**Add**:

| Column Alias | SQL | Description |
|-------------|-----|-------------|
| `netWeightKg` | `oh.net_weight_kg` | Net weight thực tế (KG) — từ cân |
| `grossWeightKg` | `oh.gross_weight_kg` | Gross weight thực tế (KG) — từ cân |
| `netWeightMt` | `ROUND((oh.net_weight_kg / 1000.0)::numeric, 4)` | Net weight (MT) — derived |
| `baseUomCode` | `bu.code` | Base Unit code (join item → uom) |

---

## 4. Business Rules

### BR-UOM: UOM Conversion Rules

```
BR-UOM-001: Base Unit Mandatory
Category: Constraint
Description: Mỗi Item PHẢI có BaseUomId. Không thể save item mà không chọn Base Unit.
Trigger: Item creation/update
Exception: None

BR-UOM-002: UomConversion or Conversion Required
Category: Validation
Description: Khi TransactionUomId ≠ BaseUomId trên document line:
  1. Lookup UomConversion(ItemId, TransactionUomId) — lấy ConversionFactor + PackagingWeightKg
  2. Nếu không có UomConversion → fallback UomConversion(ItemId, TransactionUomId → BaseUomId)
     → chỉ lấy factor, PackagingWeightKg = 0
  3. Nếu cả hai đều không có → BLOCK, show error
Trigger: Document line creation/update
Exception: TransactionUomId = BaseUomId → ConversionFactor = 1.0, lookup UomConversion for packaging only

BR-UOM-003: Snapshot Immutability
Category: Derivation
Description: ConversionFactor, PackagingWeightKg, BaseUomId được snapshot vào document line
  tại thời điểm tạo. Thay đổi UomConversion/UomConversion SAU ĐÓ không ảnh hưởng.
Trigger: Document line creation
Exception: None — immutable after creation

BR-UOM-004: BaseQty Auto-Calculation
Category: Calculation
Description: BaseQty = TransactionQty × ConversionFactor
  Luôn tính tự động. User KHÔNG thể edit BaseQty trực tiếp.
Trigger: TransactionQty or TransactionUomId changes
Exception: None

BR-UOM-005: InventTrans Always Base Unit
Category: Constraint
Description: InventTrans.Qty PHẢI là Base Unit qty (= document line BaseQty).
  Service layer chịu trách nhiệm đảm bảo đã convert trước khi post.
Trigger: InventTrans posting
Exception: None — ZERO EXCEPTIONS

BR-UOM-006: Base Unit UomConversion Auto-Created
Category: Derivation
Description: Khi set Item.BaseUomId, hệ thống tự tạo UomConversion record cho base unit
  với ConversionFactor = 1.0, PackagingWeightKg = 0 (user có thể edit packaging sau).
Trigger: Item.BaseUomId set/changed
Exception: None
```

### BR-WT: Weight Tracking Rules

```
BR-WT-001: Net Weight Source
Category: Derivation
Description: NetWeightKg lấy từ WeighbridgeLog (gross - tare).
  Nếu item không qua cân → NetWeightKg = NULL.
Trigger: WeighOut event
Exception: Manual adjustment → NetWeightKg từ user input

BR-WT-002: Packaging Weight per UOM
Category: Derivation
Description: PackagingWeightKg per unit được config trong UomConversion, khác nhau theo UOM.
  Ví dụ: cùng SKU Gạo — BAG packaging = 0.2kg, PALLET packaging = 25kg, KG packaging = 0.
  Total packaging = TransactionQty × PackagingWeightKg.
Trigger: Document line creation (snapshot)
Exception: UOM không có UomConversion config → packaging = 0

BR-WT-002a: WeighOut Field Assignment per ItemGroup Config
Category: Derivation
Description: ItemGroup.WeighbridgeQtyUom quyết định weighbridge result ghi vào field nào:
  (A) line.TransactionUomId MATCHES WeighbridgeQtyUom (bulk):
      → Cập nhật CẢ qty (TransactionQty, recalc BaseQty) VÀ weight (NetWeightKg, GrossWeightKg)
  (B) line.TransactionUomId KHÔNG MATCH (non-bulk, e.g. BAG):
      → Chỉ cập nhật weight fields (NetWeightKg per BagNetWeightMode, GrossWeightKg)
      → Qty giữ nguyên (user nhập khi StartUnloading)
Trigger: WeighOut event
Source: ItemGroup.WeighbridgeQtyUom (default "KG"), ItemGroup.BagNetWeightMode (default "GROSS")

BR-WT-003: Weight Accumulation in OnHand
Category: Calculation
Description: OnHand.NetWeightKg và GrossWeightKg tích lũy từ InventTrans
  theo cùng logic +/- như PhysicalQty.
Trigger: Materialization
Exception: NULL weight trong InventTrans → treat as 0

BR-WT-004: Weight Unit Always KG
Category: Constraint
Description: Tất cả weight fields luôn lưu KG.
  Hiển thị MT = KG ÷ 1000 (computed at display time).
Trigger: All weight operations
Exception: None

BR-WT-005: Transfer Weight Loss
Category: Calculation
Description: WeightLossKg = ShippedNetWeightKg - ReceivedNetWeightKg.
  WeightLossPct = WeightLossKg / ShippedNetWeightKg × 100.
  Auto-calc khi Transfer Received.
Trigger: Transfer receive confirmation
Exception: ShippedNetWeightKg = NULL → cannot calc (skip)
```

---

## 5. Process Flow Changes

### 5.1 Inbound Receipt — Updated Flow

```
BEFORE (current):                         AFTER (proposed):
─────────────────                         ──────────────────

PO Line created:                          PO Line created:
  ExpectedQtyKg = user input              ① User nhập: TransactionQty = 500,
  Uom = "BAG" (text, ignored)                TransactionUomId = BAG
                                          ② System lookup: UomConversion(Item, BAG)
                                              → factor = 50, packaging = 0.2 kg
                                          ③ Auto-calc:
                                              BaseQty = 500 × 50 = 25,000 KG
                                              ConversionFactor = 50 (snapshot)
                                              PackagingWeightKg = 0.2 (snapshot)
                                              BaseUomId = KG (from Item)

WeighOut:                                 WeighOut (per ItemGroup.WeighbridgeQtyUom):
  NetWeightKg = gross - tare              ─ IF line.TransactionUomId MATCHES config (bulk):
  ReceivedQtyKg = proportional                TransactionQty = proportional cargo weight
                                              BaseQty = TransactionQty × ConversionFactor
                                              NetWeightKg = cargo, GrossWeightKg = gross
                                          ─ IF NOT MATCH (non-bulk, e.g. BAG):
                                              Qty UNCHANGED (bag count from unloading)
                                              NetWeightKg = per BagNetWeightMode
                                              GrossWeightKg = proportional gross

Receive:                                  Receive:
  InventTrans.Qty = ReceivedQtyKg         ① InventTrans.Qty = line.BaseQty (base unit)
  InventTrans.QtyMt = NetWeightKg         ② InventTrans.UomId = item.BaseUomId
                                          ③ InventTrans.NetWeightKg = line.NetWeightKg
                                          ④ InventTrans.GrossWeightKg = line.GrossWeightKg

Materialize:                              Materialize:
  OnHand.PhysicalQty += Qty               OnHand.PhysicalQty += Qty (base unit)
  (QtyMt ignored)                         OnHand.NetWeightKg += NetWeightKg
                                          OnHand.GrossWeightKg += GrossWeightKg
```

### 5.2 Outbound Ship — Updated Flow

```
SO Detail created:
  ① User nhập: TransactionQty = 200, TransactionUomId = BAG
  ② Lookup UomConversion(Item, BAG) → factor = 50, packaging = 0.2
  ③ BaseQty = 200 × 50 = 10,000 KG

Allocate (FIFO):
  ④ Allocate using BaseQty (KG) — same unit as OnHand ✓

WeighOut:
  ⑤ NetWeightKg = gross - tare
  ⑥ GrossWeightKg = gross
  ⑦ Update OrderDetail.NetWeightKg, GrossWeightKg

Ship:
  ⑧ InventTrans.Qty = BaseQty (base unit)
  ⑨ InventTrans.NetWeightKg = OrderDetail.NetWeightKg
  ⑩ InventTrans.GrossWeightKg = OrderDetail.GrossWeightKg

Materialize:
  ⑪ OnHand.PhysicalQty -= Qty
  ⑫ OnHand.NetWeightKg -= NetWeightKg
  ⑬ OnHand.GrossWeightKg -= GrossWeightKg
```

### 5.3 Transfer — Weight Loss Tracking (NEW)

```
Transfer Created:
  ① User nhập: TransactionQty, TransactionUomId
  ② Auto-calc: BaseQty, ConversionFactor, PackagingWeightKg (snapshot)

Ship from Source:
  ③ Cân tại source weighbridge:
      ShippedNetWeightKg = gross - tare
      ShippedGrossWeightKg = gross
  ④ InventTrans DEDUCTED (source):
      Qty = -BaseQty, NetWeightKg = -ShippedNetWeightKg
  ⑤ InventTrans PHYSICAL (transit):
      Qty = +BaseQty, NetWeightKg = +ShippedNetWeightKg

Receive at Destination:
  ⑥ Cân tại dest weighbridge:
      ReceivedNetWeightKg = gross - tare
      ReceivedGrossWeightKg = gross
  ⑦ Auto-calc weight loss:
      WeightLossKg = ShippedNetWeightKg - ReceivedNetWeightKg
      WeightLossPct = WeightLossKg / ShippedNetWeightKg × 100
  ⑧ InventTrans DEDUCTED (transit):
      Qty = -BaseQty, NetWeightKg = -ShippedNetWeightKg
  ⑨ InventTrans PHYSICAL (dest):
      Qty = +BaseQty, NetWeightKg = +ReceivedNetWeightKg
  ⑩ Nếu WeightLossKg > 0:
      InventTrans ADJUSTMENT from IN_TRANSIT:
      Qty = 0, NetWeightKg = -WeightLossKg (weight loss record)
```

---

## 6. Impact Analysis

### 6.1 Data Layer

| Table | Change Type | Migration |
|-------|-------------|-----------|
| `cat.item` | ADD 2 fields, DEPRECATE 2 | Medium — admin review per item |
| `cat.uom_conversion` | ADD 3 fields | Low — default values, no data loss |
| `inv.invent_trans` | ADD 2 fields, RENAME 1 | Medium — `qty_mt` → `net_weight_kg` |
| `inv.on_hand` | ADD 2 fields | Low — default 0, rebuild from trans |
| `ops.purchase_order_line` | ADD 7 fields | Medium |
| `ops.inbound_receipt_line` | ADD 7 fields | Medium |
| `ops.sale_order_detail` | ADD 7 fields | Medium |
| `ops.order_detail` | ADD 7 fields | Medium |
| `ops.transfer_line` | ADD 13 fields | High — includes weight loss tracking |

### 6.2 Application Layer

| Component | Changes |
|-----------|---------|
| **Item CRUD** | Add `BaseUomId`, `WeightUomId`. Auto-create base `UomConversion` record |
| **UomConversion CRUD** | **NEW** — full CRUD for managing UOM configs per item |
| **UomService** | Add `GetUomConversionAsync(itemId, uomId)` → returns factor + packaging |
| **InventTransCommand** | Add `UomId`, rename `QtyMt`→`NetWeightKg`, add `GrossWeightKg` |
| **InventTransService** | Validate `UomId` not null |
| **MaterializationWorker** | Accumulate weight fields |
| **All Inbound Handlers** | Lookup UomConversion → set conversion snapshot → post BaseQty |
| **All Outbound Handlers** | Lookup UomConversion → set conversion snapshot → post BaseQty |
| **Transfer Handlers** | Add weight loss calculation on receive |
| **AllocationService** | No change — works on PhysicalQty (base unit) |

### 6.3 Query Config & Frontend

| Component | Changes |
|-----------|---------|
| `QueryConfigs/OnHand.json` | Remove `estimatedWeightMt`, `bagShellWeightKg`. Add `netWeightKg`, `grossWeightKg`, `netWeightMt`, `baseUomCode` |
| `FormConfigs/INVOHG01` | Add new columns |
| Frontend Zod schema | Add new fields, deprecate old |
| Frontend i18n | Add labels: "Net Weight (KG)", "Gross Weight (KG)", "Net Weight (MT)", "Base UOM" |
| Frontend On Hand view | Display new weight + UOM columns |
| Frontend UomConversion form | Update existing CRUD to include weight fields |

### 6.4 Billing Impact

**DEFERRED** — separate audit (D-4). No changes to billing in this feature.

---

## 7. Migration Strategy

### Phase 1: Schema + New Table (Non-breaking)

1. Create `cat.item_uom` table
2. Add `BaseUomId`, `WeightUomId` to `Item` (nullable initially)
3. Add conversion snapshot fields to all 5 document line tables (nullable initially)
4. Add weight fields to `InventTrans` and `OnHand`
5. Rename `InventTrans.QtyMt` → `NetWeightKg`

### Phase 2: Data Migration

1. Seed base Uom records (KG, MT, BAG) per tenant if missing
2. **Admin review screen**: list all items, let admin set `BaseUomId` per item
3. Migrate `BagShellWeightKg` → create `UomConversion` records:
   - For each Item with `BagShellWeightKg` set:
     - Create UomConversion(Item, BAG) with `PackagingWeightKg = BagShellWeightKg`
4. Backfill document lines: `BaseQty = existing qty`, `BaseUomId = item.BaseUomId`, `ConversionFactor = 1.0`, `PackagingWeightKg = 0`
5. Make `BaseUomId` NOT NULL after all items reviewed

### Phase 3: Application Logic

1. Update InventTransCommand + MaterializationWorker
2. Update all Inbound/Outbound/Transfer handlers
3. Build UomConversion CRUD (backend + frontend)
4. Update QueryConfigs + FormConfigs + Frontend
5. **Rebuild OnHand** from InventTrans

### Phase 4: Cleanup

1. Deprecate `DefaultUom`, `BagShellWeightKg` on Item
2. Deprecate `Uom` (string) on document lines
3. Deprecate `estimatedWeightMt`, `bagShellWeightKg` in OnHand query

---

## 8. Acceptance Criteria

### AC-1: UomConversion Configuration

```
Given Item "Gạo Jasmine" with BaseUomId = KG
And UomConversion records:
  | UOM | ConversionFactor | PackagingWeightKg | NetWeightPerUnitKg |
  | KG  | 1.0              | 0                 | 1.0                |
  | BAG | 50.0             | 0.2               | 49.8               |
When admin views Item UOM configuration
Then all records are displayed with correct values
```

### AC-2: PO Line Auto-Conversion

```
Given Item "Gạo Jasmine" BaseUomId = KG
And UomConversion(BAG): factor = 50, packaging = 0.2
When user creates PO Line: TransactionQty = 500, TransactionUomId = BAG
Then system auto-calculates:
  BaseQty = 25,000 KG
  ConversionFactor = 50 (snapshot)
  PackagingWeightKg = 0.2 (snapshot)
  BaseUomId = KG
```

### AC-3: Block Without Conversion

```
Given Item "Gạo Jasmine" BaseUomId = KG
And NO UomConversion or UomConversion for (Item, PALLET → KG)
When user creates PO Line with TransactionUomId = PALLET
Then system shows error: "No UOM conversion defined for PALLET → KG for this item"
And line is NOT saved
```

### AC-4: InventTrans in Base Unit

```
Given InboundReceiptLine: BaseQty = 25,000 KG, NetWeightKg = 24,900
When line is received
Then InventTrans posted with:
  Qty = 25,000 (base unit)
  UomId = KG
  NetWeightKg = 24,900
```

### AC-5: On Hand Net Weight Display

```
Given OnHand for Item X:
  PhysicalQty = 50,000 (KG)
  NetWeightKg = 49,800
  GrossWeightKg = 51,200
When user views On Hand screen
Then grid shows:
  Physical Qty: 50,000 | Base UOM: KG
  Net Weight (KG): 49,800 | Gross Weight (KG): 51,200
  Net Weight (MT): 49.8000
```

### AC-6: Snapshot Immutability

```
Given PO Line created with ConversionFactor = 50, PackagingWeightKg = 0.2
When admin updates UomConversion(BAG) to factor = 48, packaging = 0.25
Then existing PO Line STILL shows ConversionFactor = 50, PackagingWeightKg = 0.2
```

### AC-7: Transfer Weight Loss

```
Given TransferLine shipped with ShippedNetWeightKg = 25,000
When received at destination with ReceivedNetWeightKg = 24,850
Then system calculates:
  WeightLossKg = 150
  WeightLossPct = 0.60%
And weight loss is visible on Transfer detail screen
```

---

## 9. Entity Field Summary (Before vs After)

### Item

| Field | Before | After |
|-------|--------|-------|
| `DefaultUom` | string? | **DEPRECATED** → use `BaseUomId` |
| `BagShellWeightKg` | decimal? | **DEPRECATED** → use `UomConversion.PackagingWeightKg` |
| `BaseUomId` | — | **NEW** Guid NOT NULL (FK → Uom) |
| `WeightUomId` | — | **NEW** Guid? (FK → Uom) |

### UomConversion (EXTEND EXISTING)

| Field | Before | After |
|-------|--------|-------|
| `ItemId` | Guid (existing) | unchanged |
| `FromUomId` | Guid (existing) | unchanged |
| `ToUomId` | Guid (existing) | unchanged |
| `ConversionFactor` | decimal (existing) | unchanged |
| `PackagingWeightKg` | — | **NEW** decimal NOT NULL DEFAULT 0 |
| `NetWeightPerUnitKg` | — | **NEW** decimal? |
| `GrossWeightPerUnitKg` | — | **NEW** decimal? |

### Document Lines (PO Line, Receipt Line, SO Detail, Order Detail, Transfer Line)

| Field | Before | After |
|-------|--------|-------|
| `Uom` | string? (text) | **DEPRECATED** → `TransactionUomId` |
| `TransactionQty` | — | **NEW** decimal NOT NULL |
| `TransactionUomId` | — | **NEW** Guid NOT NULL (FK → Uom) |
| `BaseQty` | — | **NEW** decimal NOT NULL (auto-calc) |
| `BaseUomId` | — | **NEW** Guid NOT NULL (FK → Uom) |
| `ConversionFactor` | — | **NEW** decimal NOT NULL (snapshot) |
| `PackagingWeightKg` | — | **NEW** decimal NOT NULL (snapshot) |
| `GrossWeightKg` | — | **NEW** decimal? |

### TransferLine (additional fields)

| Field | Before | After |
|-------|--------|-------|
| `VarianceKg` | decimal? | Kept (backward compat) |
| `ShippedNetWeightKg` | — | **NEW** decimal? |
| `ShippedGrossWeightKg` | — | **NEW** decimal? |
| `ReceivedNetWeightKg` | — | **NEW** decimal? |
| `ReceivedGrossWeightKg` | — | **NEW** decimal? |
| `WeightLossKg` | — | **NEW** decimal? (auto-calc) |
| `WeightLossPct` | — | **NEW** decimal? (auto-calc) |

### InventTrans

| Field | Before | After |
|-------|--------|-------|
| `Qty` | decimal (KG hardcode) | decimal (**Base Unit**) |
| `QtyMt` | decimal? | **RENAMED** → `NetWeightKg` |
| `UomId` | — | **NEW** Guid NOT NULL (FK → Uom) |
| `GrossWeightKg` | — | **NEW** decimal? |

### OnHand

| Field | Before | After |
|-------|--------|-------|
| `PhysicalQty` | decimal | unchanged (now = Base Unit) |
| `NetWeightKg` | — | **NEW** decimal DEFAULT 0 |
| `GrossWeightKg` | — | **NEW** decimal DEFAULT 0 |

---

## 10. Open Questions (RESOLVED)

| # | Question | Resolution |
|---|----------|------------|
| ~~OQ-1~~ | BaseUomId default? | **Manual review per item** — admin review screen |
| ~~OQ-2~~ | BagShellWeightKg meaning? | **Packaging/tare weight** — goes per (Item + UOM) via `UomConversion` |
| ~~OQ-3~~ | Tare Weight in On Hand? | **No** — only Net + Gross |
| ~~OQ-4~~ | Billing impact? | **Audit later** — separate analysis |
| ~~OQ-5~~ | Transfer weight loss? | **Yes** — track with ShippedNet/ReceivedNet/WeightLoss fields |

## 11. Remaining Open Questions

| # | Question | Impact |
|---|----------|--------|
| OQ-6 | UomConversion form: cần thêm weight fields vào form hiện tại hay tạo tab riêng? | Frontend design |
| OQ-7 | Khi transfer có weight loss > threshold (ví dụ >2%), có cần approval/alert không? | Business rule |
| OQ-8 | Adjustment flow: có cần UOM conversion không? (hiện tại adjustment nhập trực tiếp qty) | Process |
