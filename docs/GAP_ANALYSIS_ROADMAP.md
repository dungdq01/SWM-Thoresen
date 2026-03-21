# GAP ANALYSIS & ROADMAP — Codebase hiện tại vs Newest VER Spec v5.1

> **Ngày phân tích**: 2026-03-22
> **Phạm vi**: So sánh logic nghiệp vụ giữa codebase NestJS/Prisma/React hiện tại và bộ tài liệu spec mới nhất (newest VER)
> **Mục tiêu**: Xác định GAP, đánh giá mức ảnh hưởng, lập kế hoạch phát triển theo hướng mới nhất

---

## PHẦN A: TỔNG QUAN HIỆN TRẠNG

### A1. Codebase hiện tại — Đã triển khai

| # | Module | Schema (models) | Backend Service | Frontend Page | Đánh giá |
|---|--------|-----------------|-----------------|---------------|----------|
| 0 | **Auth & Tenant** | AppUser, Role, Permission, UserRole, AuthCredential, AuthSession, SecurityEvent... | ✅ auth/ | ✅ auth/ | **Đầy đủ** |
| 1 | **Foundation** | NumberSequence, BusinessRuleCatalog, DecisionLog, ChangeControl, AuditLog, ExceptionLog, IdempotencyRecord, ReasonCode | ✅ foundation/ | ✅ settings/ | **Đầy đủ** |
| 2 | **Master Data** | MdUom, MdWarehouse, MdZone, MdLocation, MdOwner, MdVendor, MdCustomer, MdItem, MdVehicleType, MdServiceCode, MdDayType, MdRateReference, MdOwnerItemPolicy, MdImportBatch, MdOwnerSkuMapping | ✅ master-data/ | ✅ master-data/ | **Đầy đủ** |
| 3 | **Inventory Core** | InventDim, InventTrans, OnHand, InventoryHold, ReversalLink, ReconciliationRun, SnapshotRun, DailyStorageSnapshot, EventMapping | ✅ inventory-core/ | ✅ inventory-core/ | **Đầy đủ** |
| 4 | **Inbound** | PurchaseOrder, PurchaseOrderLine, ReceiptHeader, ReceiptLine, ReceiptWeighingLog, StatusHistory, ExceptionLog, IntegrationState, InboundDocument | ✅ inbound/ | ✅ inbound-operations/ | **Đầy đủ** |
| 5 | **Outbound** | SalesOrder, SalesOrderLine, ShipmentHeader, ShipmentLine, AllocationRecord, WeighingAttempt, StatusHistory, ExceptionLog, ApprovalDecision, PickWorkLink, PostingLink, SoLink, OutboundDocument | ✅ outbound/ + sales-orders/ | ✅ outbound-operations/ | **Cấu trúc đầy đủ, cần alignment** |
| 6 | **Inventory Control** | IcMoveOrder, IcTransferOrder, IcStatusChange, IcCycleCountPlan/Header/Line, IcAdjustmentHeader/Line, IcReconciliationReview | ✅ inventory-control/ | ✅ inventory-control/ | **Đầy đủ** |
| 7 | **Work Execution** | WeWorkHeader, WeWorkLine, AssignmentHistory, StatusHistory, PostingLink, EventLog, Exception, MobileSyncBatch, Outbox | ✅ work-execution/ | ✅ work-execution/ | **Đầy đủ** |
| 8 | **Integration Platform** | M8WeighbridgeDevice/Log/EventState, M8OcrResult/ConfirmedSnapshot, M8MobileSyncBatch/Event, M8ErpPushLog, M8IntegrationAlert, M8ChannelHealth, M8DeviceHeartbeat | ✅ integration-platform/ | ✅ integration/ | **Đầy đủ** |
| 9 | **VAS / Bagging** | VasWorkOrder, VasSession, VasStateHistory, VasExceptionLog, VasOutbox | ✅ vas/ | ✅ vas/ | **Đầy đủ** |
| 10 | **Billing** | BilContract, ContractFeeLine, DayTypeCalendar, BilEvent, SnapshotRun, StorageSnapshot, DebitNote, DebitNoteLine, DebitNoteHistory, Exception, ErpPushOutbox/Log | ✅ billing/ | ✅ billing/ | **Đầy đủ** |
| 11 | **Reporting** | RptReportCatalog, ExportJob, ReconciliationRun/Result/Resolution, GoLiveGate, DashboardCache, ReportRunLog | ✅ reporting/ | ✅ reporting/ | **Đầy đủ** |

**Kết luận**: Schema đã triển khai **rất đầy đủ** (~90+ models). Tuy nhiên có những GAP quan trọng về **logic nghiệp vụ** khi so với spec mới nhất.

---

## PHẦN B: CHI TIẾT GAP ANALYSIS

### 🔴 GAP-01: Outbound — Thiếu 4-Level Document Hierarchy (CRITICAL)

**Spec mới nhất** yêu cầu 4 tầng:
```
Level 1: sale_order          (SO — đơn bán hàng tổng)
Level 2: sale_order_detail   (SO Detail — chi tiết SKU + qty)
Level 3: order_header        (Order — 1 chuyến xe/shipment cụ thể)
Level 4: order_detail        (Order Detail — chi tiết SKU trên chuyến xe)
```

**Codebase hiện tại** chỉ có 3 tầng tương đương:
```
SalesOrder       ≈ sale_order
SalesOrderLine   ≈ sale_order_detail
ShipmentHeader   ≈ order_header
ShipmentLine     ≈ order_detail
```

**GAP cụ thể:**
| Aspect | Spec (newest VER) | Codebase hiện tại | Action |
|--------|-------------------|-------------------|--------|
| Order Types | `STANDARD`, `CONTAINER_STUFFING`, `BULK_LOADING` | `ShipmentSourceType: SO, DELIVERY_REQUEST, STANDALONE` | ⚠️ Cần thêm order types |
| Container fields | `container_number`, `seal_number` trên order_header | Không có | ❌ Thiếu |
| Qty fields trên order_detail | `expected/allocated/picked/loaded/weighed/shipped_qty_kg` + `net_weight_kg` | Có phần lớn, thiếu `loadedQty` rõ ràng + `weighedQty` riêng | ⚠️ Cần review |
| Post-ship residual handling | Auto return SHIPPING → STAGING → STORAGE khi variance | Không rõ đã implement | ❌ Cần thêm logic |
| SO Detail rollup | Shipped qty rollup từ order_detail → sale_order_detail | Không rõ đã implement | ⚠️ Cần verify |

**Mức ảnh hưởng**: 🔴 HIGH — Ảnh hưởng toàn bộ luồng xuất kho
**Effort**: L (2-3 sprints)

---

### 🔴 GAP-02: Weighbridge — UOM-Based Qty Update Logic (CRITICAL)

**Spec mới nhất** yêu cầu logic UOM-based:
```
Nếu line.uom = item_group.weighbridge_qty_uom:
  → Cập nhật CẢ received_qty (hoặc shipped_qty) VÀ net_weight_kg
Nếu line.uom ≠ item_group.weighbridge_qty_uom:
  → Chỉ cập nhật net_weight_kg (KHÔNG cập nhật qty)
```

**Codebase hiện tại**:
- Không có entity `MdItemGroup` hoặc config `weighbridge_qty_uom`
- Weighbridge log update logic không phân biệt UOM

**Cần thêm:**
- [ ] Entity / config `item_group` với field `weighbridge_qty_uom`
- [ ] Logic phân nhánh UOM khi cập nhật document line
- [ ] Cả inbound (receipt_line) và outbound (shipment_line/order_detail) đều cần logic này

**Mức ảnh hưởng**: 🔴 HIGH — Ảnh hưởng tính chính xác số liệu nhập/xuất
**Effort**: M (1 sprint)

---

### 🔴 GAP-03: Weighbridge — Cascading Chain + Auto-Detect Direction (CRITICAL)

**Spec mới nhất** yêu cầu:
1. **Cascading chain**: Mỗi log có `previous_log_id` → `log[n].gross ≈ log[n-1].tare` (±50kg)
2. **Auto-detect direction**: `gross > tare` → INBOUND, `gross < tare` → OUTBOUND
3. **Per-SKU model**: 1 weighbridge_log per receipt_line hoặc order_detail
4. **Chain validation**: Non-blocking warning `CHAIN_WEIGHT_MISMATCH` nếu chain bị gãy

**Codebase hiện tại**:
- M8WeighbridgeLog có per-event recording nhưng:
  - ❌ Không có `previous_log_id` cho chaining
  - ❌ Không có auto-detect direction (gross vs tare comparison)
  - ❌ Không có chain validation logic
  - Weighing types khác với spec (WEIGH_IN/WEIGH_OUT vs concept per-SKU cascading)

**Mức ảnh hưởng**: 🔴 HIGH — Luồng cân cascading là core logic nghiệp vụ trạm cân
**Effort**: L (2 sprints)

---

### 🟡 GAP-04: Weighbridge Check-In Mode (HIGH)

**Theo CR-weighbridge-checkin.md**:
- Cho phép xe vào trạm cân lần đầu chỉ ghi nhận gross weight (chưa biết SKU, chưa có tare)
- Sau khi dỡ/chất hàng per-SKU mới cân chi tiết

**Cần thêm:**
- [ ] Column `log_mode` (CHECK_IN / WEIGHING) trên M8WeighbridgeLog
- [ ] Column `scale_ticket_id` để link check-in → subsequent weighings
- [ ] Nullable SKU, tare, net khi mode = CHECK_IN
- [ ] Statuses mới: EXPIRED, CANCELLED, RESOLVED cho weighbridge logs
- [ ] Pipeline xử lý riêng cho CHECK_IN mode

**Mức ảnh hưởng**: 🟡 MEDIUM — Enhancement quan trọng nhưng backward compatible
**Effort**: M (1 sprint)

---

### 🟡 GAP-05: Lot Management Entity (HIGH)

**Spec mới nhất** yêu cầu:
- Entity `lot` riêng với `lot_hash`, `lot_number`, lot attributes (vessel, BL, origin, production date...)
- Pattern `get_or_create_lot`: kiểm tra lot_hash, nếu tồn tại thì reuse, nếu không thì tạo mới
- Cross-warehouse lot preservation: lot_hash **exclude** warehouse_id để giữ lot khi transfer

**Codebase hiện tại**:
- `lotNumber` chỉ là string field trên `OnHand`
- ❌ Không có Lot entity riêng
- ❌ Không có lot_hash, lot attributes
- ❌ Không có get_or_create_lot pattern

**Mức ảnh hưởng**: 🟡 HIGH — Lot tracking là yêu cầu quan trọng cho traceability
**Effort**: L (2 sprints — schema + migration + business logic + UI)

---

### 🟡 GAP-06: Goods Split (Chia hàng đổi chủ) Module (NEW)

**Hoàn toàn mới** — Chưa có trong codebase.

**Nghiệp vụ**: Sau khi nhận hàng dưới tên chủ hàng ủy quyền, cần chia lại cho các chủ hàng thực tế theo tỉ lệ phân bổ.

**Cần tạo:**
- [ ] Schema: `goods_split_header`, `goods_split_detail`, `goods_split_transaction`
- [ ] 7-step business flow: Chọn PO → Nhập chủ hàng/SL → Tính tỉ lệ → Phân bổ actual → User confirm → Cập nhật inventory → Audit trail
- [ ] 10 business rules (min allocation, rounding, tolerance, cancellation...)
- [ ] Frontend: Form chia hàng, review panel, history

**Mức ảnh hưởng**: 🟡 MEDIUM — Module mới, không ảnh hưởng existing flow
**Effort**: L (2 sprints)

---

### 🟢 GAP-07: MdVessel Entity (MEDIUM)

**Spec** có entity `vessel` riêng (tên, IMO number, type, flag...).
**Codebase** chỉ có `vesselName` string trên PurchaseOrder, ReceiptHeader.

**Cần:**
- [ ] Entity `MdVessel` (vesselCode, vesselName, imoNumber, vesselType, flag...)
- [ ] FK từ PurchaseOrder, ReceiptHeader → MdVessel thay vì plain string
- [ ] UI quản lý danh mục tàu

**Effort**: S (0.5 sprint)

---

### 🟢 GAP-08: Transfer Module — Alignment chi tiết (MEDIUM)

**Spec sử dụng**: `transfer_header` / `transfer_line` với:
- Weighbridge integration (N logs per transfer, 1 per SKU)
- Transit tracking, loss/damage handling
- IN_TRANSIT inventory excluded from billing

**Codebase đã có**: `IcTransferOrder` / `IcTransferOrderLine` — tương đương về concept.

**GAP chi tiết:**
- ❌ Transfer chưa tích hợp weighbridge (cascading per-SKU)
- ❌ Transit exclusion từ billing chưa rõ
- ⚠️ Status flow cần review alignment

**Effort**: M (1 sprint)

---

### 🟢 GAP-09: Billing — Auto-Capture Event Integration (MEDIUM)

**Spec yêu cầu** Billing auto-capture events từ:
- Inbound: `HANDLING_IN` khi Receipt → RECEIVED
- Outbound: `HANDLING_OUT` khi Order → SHIPPED
- VAS: `BAGGING` khi BWO → COMPLETED
- Storage: EOD snapshot cho billable inventory

**Codebase** đã có BilEvent model nhưng cần verify:
- [ ] Auto-capture triggers đã hook vào đúng status transitions chưa?
- [ ] Day type + OT multiplier logic đã đúng chưa?
- [ ] Storage snapshot job chạy EOD đã implement chưa?

**Effort**: M (1 sprint)

---

### 🟢 GAP-10: Cross-Module Integration Patterns (LOW)

**Spec** mô tả chi tiết:
- InventTrans là central ledger — mọi module write through nó
- Work Management reused cho PUTAWAY, PICK, MOVE, TRANSFER_PICK, TRANSFER_PUT
- Lot lifecycle across modules (inbound → storage → outbound, transfer preserves lot)

**Cần verify:**
- [ ] InventTrans posting đúng trans_type cho mỗi module action
- [ ] Work creation từ inbound (putaway), outbound (pick), transfer (move)
- [ ] Lot preservation khi transfer inter-warehouse

**Effort**: M (review + fix — 1 sprint)

---

## PHẦN C: KẾ HOẠCH PHÁT TRIỂN

### Nguyên tắc ưu tiên
1. **Business-critical first**: Luồng cân → Inbound → Outbound (core operations)
2. **Foundation before features**: Schema alignment trước, rồi mới business logic
3. **Backward compatible**: Không break existing functionality
4. **Incremental delivery**: Mỗi sprint deliver giá trị sử dụng được

---

### PHASE 1: WEIGHBRIDGE ALIGNMENT (Sprint 1-2) — 🔴 Highest Priority

**Mục tiêu**: Đưa luồng trạm cân về đúng spec v5 — per-SKU cascading model

| Sprint | Task | Effort |
|--------|------|--------|
| **S1** | **GAP-02**: Thêm `item_group` config + UOM-based qty update logic | M |
| **S1** | **GAP-03a**: Thêm `previous_log_id` vào M8WeighbridgeLog + chain validation | M |
| **S1** | **GAP-03b**: Auto-detect direction (gross vs tare) | S |
| **S2** | **GAP-03c**: Cascading chain flow — inbound (receipt_line update) | M |
| **S2** | **GAP-03d**: Cascading chain flow — outbound (shipment_line/order_detail update) | M |
| **S2** | **GAP-04**: Check-In mode (log_mode, scale_ticket_id, nullable fields) | M |

**Deliverable S2**: Trạm cân hoạt động đúng per-SKU cascading model, support check-in mode, UOM-aware qty update.

---

### PHASE 2: LOT MANAGEMENT + VESSEL (Sprint 3) — 🟡 High Priority

**Mục tiêu**: Lot tracking đúng spec, vessel master data

| Sprint | Task | Effort |
|--------|------|--------|
| **S3** | **GAP-05**: Tạo Lot entity + lot_hash + get_or_create_lot pattern | L |
| **S3** | **GAP-07**: Tạo MdVessel entity + migrate vesselName → FK | S |
| **S3** | Hook lot assignment vào inbound flow (receipt → lot creation) | M |

**Deliverable S3**: Lot tracking hoạt động, lot attributes (vessel, BL, origin) được lưu, vessel master data quản lý riêng.

---

### PHASE 3: OUTBOUND FLOW ALIGNMENT (Sprint 4-5) — 🔴 High Priority

**Mục tiêu**: Outbound flow đúng 4-level hierarchy, order types, post-ship residual

| Sprint | Task | Effort |
|--------|------|--------|
| **S4** | **GAP-01a**: Thêm `container_number`, `seal_number` vào ShipmentHeader | S |
| **S4** | **GAP-01b**: Thêm order types (STANDARD, CONTAINER_STUFFING, BULK_LOADING) | M |
| **S4** | **GAP-01c**: SO Detail → ShipmentLine qty rollup (shipped_qty aggregation) | M |
| **S5** | **GAP-01d**: Post-ship residual handling (variance → SHIPPING → STAGING → STORAGE) | L |
| **S5** | **GAP-01e**: Negative inventory check trước khi SHIP | M |
| **S5** | Outbound weighbridge cascading integration (from Phase 1) | M |

**Deliverable S5**: Luồng xuất kho hoàn chỉnh: SO → Order (với type) → Allocate → Pick → Load → Weigh (cascading) → Ship → Residual return.

---

### PHASE 4: TRANSFER + CROSS-MODULE (Sprint 6) — 🟡 Medium Priority

**Mục tiêu**: Transfer tích hợp weighbridge, lot preservation, billing exclusion

| Sprint | Task | Effort |
|--------|------|--------|
| **S6** | **GAP-08**: Transfer + weighbridge integration (cascading per-SKU at source/dest) | M |
| **S6** | **GAP-08**: Transit lot preservation (lot_hash excl warehouse_id) | M |
| **S6** | **GAP-08**: IN_TRANSIT exclusion from billing snapshots | S |
| **S6** | **GAP-10**: Cross-module InventTrans posting verification | M |

**Deliverable S6**: Transfer liên kho hoạt động đầy đủ với cân, lot tracking, billing correct.

---

### PHASE 5: BILLING INTEGRATION + GOODS SPLIT (Sprint 7-8) — 🟡 Medium Priority

**Mục tiêu**: Billing auto-capture đúng, module chia hàng mới

| Sprint | Task | Effort |
|--------|------|--------|
| **S7** | **GAP-09**: Verify + fix billing auto-capture triggers (HANDLING_IN/OUT, BAGGING) | M |
| **S7** | **GAP-09**: Storage EOD snapshot job + billable qty logic | M |
| **S8** | **GAP-06**: Goods Split module — Schema + Backend | L |
| **S8** | **GAP-06**: Goods Split module — Frontend + Testing | L |

**Deliverable S8**: Billing chạy đúng cho mọi event source. Module chia hàng đổi chủ hoạt động.

---

## PHẦN D: MA TRẬN ƯU TIÊN

```
                        Business Impact
                    LOW         MEDIUM        HIGH
              ┌──────────┬──────────────┬──────────────┐
    HIGH      │          │  GAP-05 Lot  │ GAP-01 OB    │
              │          │  GAP-06 Split│ GAP-02 UOM   │
  Effort      │          │              │ GAP-03 Chain  │
              ├──────────┼──────────────┼──────────────┤
    MEDIUM    │ GAP-10   │  GAP-08 Xfer │ GAP-04 ChkIn │
              │ CrossMod │  GAP-09 Bill │              │
              ├──────────┼──────────────┼──────────────┤
    LOW       │          │  GAP-07      │              │
              │          │  Vessel      │              │
              └──────────┴──────────────┴──────────────┘
```

---

## PHẦN E: RISK & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration break existing data | 🔴 HIGH | Dùng additive migration (add columns, không rename/remove). Backfill data. |
| Weighbridge cascading logic phức tạp | 🟡 MEDIUM | Implement từng step: validation → chaining → UOM logic. Unit test mỗi step. |
| Lot entity migration ảnh hưởng OnHand | 🟡 MEDIUM | Tạo Lot entity mới, giữ `lotNumber` string trên OnHand cho backward compat, thêm `lotId` FK. |
| Outbound order types break existing shipments | 🟡 MEDIUM | Thêm type column với default = STANDARD. Existing shipments tự động có type STANDARD. |
| Goods Split module conflict inventory | 🟡 MEDIUM | Split tạo InventTrans (MOVE/STATUS_CHANGE) thay vì modify existing records. |

---

## PHẦN F: TÓM TẮT

| Metric | Value |
|--------|-------|
| **Tổng GAP phát hiện** | 10 |
| **GAP Critical (🔴)** | 3 (Outbound hierarchy, UOM logic, Cascading chain) |
| **GAP High (🟡)** | 4 (Check-In, Lot, Goods Split, Transfer) |
| **GAP Medium (🟢)** | 3 (Vessel, Billing, Cross-module) |
| **Tổng effort ước lượng** | 8 sprints (~16-24 tuần) |
| **Schema changes cần** | ~5 new entities, ~15 column additions |
| **Modules cần tạo mới** | 1 (Goods Split) |
| **Modules cần alignment** | 4 (Weighbridge, Outbound, Transfer, Billing) |

**Thứ tự triển khai khuyến nghị**:
1. 🔴 **Weighbridge** (foundation cho mọi module khác)
2. 🟡 **Lot + Vessel** (master data foundation)
3. 🔴 **Outbound alignment** (business-critical flow)
4. 🟡 **Transfer + Cross-module** (integration quality)
5. 🟡 **Billing + Goods Split** (revenue + new feature)
