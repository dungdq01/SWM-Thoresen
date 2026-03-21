# Hướng dẫn bổ sung Module 4 — Inbound Flow

> **Mục đích:** So sánh flow thiết kế (`data-flow-diagrams/04-inbound-flow.md`) với chương trình hiện tại (`backend/docs/module-4-inbound.md`) để xác định các phần còn thiếu và hướng dẫn bổ sung.
>
> **Ngày:** 2026-03-21

---

## 1. Tổng quan so sánh

### Flow thiết kế (04-inbound-flow.md) gồm 10 bước:

| Step | Mô tả | Trạng thái trong code |
|------|--------|-----------------------|
| 1 | Create PO (DRAFT) | ✅ Đã có |
| 2 | Confirm PO → post EXPECTED InventTrans | ⚠️ Có một phần (chưa post InventTrans khi confirm PO) |
| 3 | Create Receipt (DRAFT) | ✅ Đã có |
| 4 | Start Weighing (DRAFT → WEIGHING) | ⚠️ Khác flow (code dùng DRAFT → AWAITING_WEIGHING → WEIGHED_IN) |
| 5 | Record Weighbridge Log (per-SKU, 1:N) | ❌ Thiếu — code dùng weigh-in/weigh-out đơn giản cho cả receipt |
| 6 | Auto-Resolve & UOM-Based Update | ❌ Thiếu — code không có logic resolve per-SKU từ weighbridge |
| 7 | Running Tolerance Check (sau mỗi lần cân) | ⚠️ Có tolerance check nhưng chỉ 1 lần khi weigh-out, không running |
| 8 | Receive (lot assignment + InventTrans PHYSICAL + reverse EXPECTED) | ⚠️ Có post InventTrans khi RECEIVED nhưng thiếu reverse EXPECTED |
| 9 | Auto-Create Putaway Work | ❌ Thiếu — chỉ có interface sẵn, chưa implement |
| 10 | PO Status Rollup | ❌ Thiếu — PO không tự rollup PARTIALLY_RECEIVED / FULLY_RECEIVED |

---

## 2. Chi tiết các phần thiếu và hướng dẫn bổ sung

### 2.1 ❌ Weighbridge Model mới: Per-SKU Logs (1:N)

**Hiện tại:** Code dùng model cân đơn giản — 1 receipt có 1 lần weigh-in (gross) và 1 lần weigh-out (tare). API:
- `POST /weigh-events/in` → nhận `grossWeightKg` cho cả receipt
- `POST /weigh-events/out` → nhận `tareWeightKg` cho cả receipt

**Flow yêu cầu:** Mỗi receipt có N weighbridge logs (1 log per SKU/receipt line). Sử dụng API chung:
- `POST /api/weighbridge-logs` với `document_number = receipt_number`

**Cần bổ sung:**

1. **Thay thế weigh-in/weigh-out API bằng Weighbridge Log API:**
   - Bỏ endpoint `POST /weigh-events/in` và `POST /weigh-events/out`
   - Sử dụng `POST /api/weighbridge-logs` (từ Module Weighbridge)
   - Mỗi log chứa: `document_number`, `sku`, `warehouse_code`, `owner_code`, `gross_weight_kg`, `tare_weight_kg`

2. **Auto-resolve receipt line từ weighbridge log:**
   - Khi weighbridge log được tạo, hệ thống tự động match với receipt line bằng:
     `document_number + sku + warehouse_code + owner_code → receipt_line`
   - Nếu không match → throw error

3. **UOM-Based update logic:**
   ```
   IF receipt_line.uom == item_group.weighbridge_qty_uom (thường là KG):
     receipt_line.received_qty += net_weight_kg
     receipt_line.net_weight_kg += net_weight_kg
   ELSE:
     receipt_line.net_weight_kg += net_weight_kg (chỉ cập nhật trọng lượng, không update received_qty)
   ```

4. **Cascading weighing:**
   - Khi cân nhiều SKU liên tiếp trên 1 xe: `log[n].gross_weight = log[n-1].tare_weight`
   - Frontend nên pre-fill gross từ tare của lần cân trước

**Files cần sửa:**
- `inbound.routes.js` — bỏ route weigh-events, thêm listener cho weighbridge-log events
- `receipt.service.js` — thêm method `handleWeighbridgeLogCreated()` với auto-resolve + UOM update
- `inbound.controller.js` — bỏ handler weigh-in/weigh-out
- `receipt-weighing.repository.js` — refactor để query weighbridge_log thay vì receipt_weighing

---

### 2.2 ❌ Running Tolerance Check (sau mỗi lần cân)

**Hiện tại:** Tolerance check chỉ chạy 1 lần khi weigh-out, so sánh `netWeightKg` vs `expectedQty` cho toàn bộ receipt.

**Flow yêu cầu:** Tolerance check chạy **sau mỗi weighbridge log**, check per-line:

```
CheckToleranceRunning(receiptLine):
  expected = receiptLine.expected_qty
  received = SUM(weighbridge_log.net_weight_kg) WHERE document_number + sku match
  NOTE: Luôn dùng net_weight_kg cho tolerance, BẤT KỂ UOM
  variance_pct = |received - expected| / expected × 100

  Threshold cascade:
    1. item.tolerance_pct_inbound (nếu có)
    2. owner.default_tolerance_pct (nếu có)
    3. system_config.default_inbound_tolerance_pct

  IF variance_pct > threshold → FAIL → receipt REJECTED
  IF pass → continue weighing hoặc proceed to RECEIVE
```

**Cần bổ sung:**
- Thêm method `checkToleranceRunning(receiptLineId)` trong `inbound.policy.js`
- Gọi method này sau mỗi lần `handleWeighbridgeLogCreated()`
- Nếu FAIL → chuyển receipt sang REJECTED ngay lập tức (không chờ hết cân)
- Supervisor có thể override tolerance → proceed to RECEIVE

**Files cần sửa:**
- `inbound.policy.js` — thêm `checkToleranceRunning()`
- `receipt.service.js` — gọi tolerance check sau mỗi weighbridge log event

---

### 2.3 ⚠️ State Machine khác biệt

**Hiện tại (code):**
```
DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED/REJECTED
```

**Flow yêu cầu:**
```
DRAFT → WEIGHING → RECEIVED/REJECTED
```

**Phân tích:**
- Code hiện tại có nhiều trạng thái trung gian (`AWAITING_WEIGHING`, `WEIGHED_IN`, `PROCESSING`, `WEIGHED_OUT`) vì model cân cũ yêu cầu từng bước.
- Flow mới đơn giản hơn vì weighbridge logs được ghi liên tục trong trạng thái `WEIGHING` cho đến khi đủ điều kiện chuyển RECEIVED.

**Cần bổ sung:**
- Quyết định: **giữ state machine cũ** (tương thích ngược) hay **chuyển sang state machine mới** (theo flow).
- **Khuyến nghị:** Chuyển sang state machine mới nếu chưa go-live. Mapping:
  - `DRAFT` → giữ nguyên
  - `AWAITING_WEIGHING` + `WEIGHED_IN` + `PROCESSING` + `WEIGHED_OUT` → gộp thành `WEIGHING`
  - `RECEIVED`, `REJECTED`, `CANCELLED` → giữ nguyên
  - Bỏ `ERROR` (không có trong flow), hoặc giữ nếu business cần

**Files cần sửa:**
- `inbound.state-machine.js` — refactor transitions
- Database migration — update enum `ReceiptStatus`
- Frontend — update tất cả UI hiển thị trạng thái

---

### 2.4 ⚠️ Confirm PO → Post EXPECTED InventTrans

**Hiện tại:** Confirm PO chỉ thay đổi status `NEW → CONFIRMED`. Không post InventTrans EXPECTED.

**Flow yêu cầu:** Khi confirm PO, phải post InventTrans:
```
Per PO line:
  INSERT invent_trans:
    txn_type: PURCHASE
    stage: EXPECTED
    qty: +expected_qty
    status: ORDERED

  UPDATE on_hand:
    inbound_ordered_qty += expected_qty
```

**Mục đích:** Cho phép hệ thống biết trước hàng sắp nhập, hiển thị `inbound_ordered_qty` trên dashboard/báo cáo.

**Cần bổ sung:**
- Trong `purchase-order.service.ts` → method `confirmPO()`:
  - Gọi `PostingEngineService.postInventory()` với `stage: EXPECTED` per line
  - Lưu `postedTransId` vào `purchase_order_line`
- Khi cancel PO: phải **reverse** EXPECTED InventTrans (`qty: -expected_qty`)

**Files cần sửa:**
- `purchase-order.service.ts` — thêm inventory posting khi confirm
- `purchase-order.dto.ts` — thêm field `postedTransId` nếu cần

---

### 2.5 ⚠️ Receive: Reverse EXPECTED InventTrans

**Hiện tại:** Khi receipt RECEIVED, code chỉ post `PHYSICAL +received_qty`. Không reverse EXPECTED.

**Flow yêu cầu:** Khi receipt RECEIVED, phải post 2 transactions per line:
```
Transaction #1 — PHYSICAL Receipt:
  txn_type: PURCHASE
  stage: PHYSICAL
  qty: +received_qty
  location: RECV dock
  status: AVAILABLE
  lot_id: assigned

Transaction #2 — Reverse EXPECTED:
  txn_type: PURCHASE
  stage: EXPECTED
  qty: -expected_qty (reversal)
```

**Cần bổ sung:**
- Trong `receipt.service.js` → method `receiveWeighOut()` (hoặc method mới `receiveReceipt()`):
  - Sau khi post PHYSICAL, thêm post EXPECTED reversal
  - `on_hand.inbound_ordered_qty -= expected_qty`

**Files cần sửa:**
- `receipt.service.js` — thêm reverse EXPECTED posting trong receive flow

---

### 2.6 ❌ Lot Assignment khi Receive

**Hiện tại:** Code không có logic lot assignment khi receipt RECEIVED.

**Flow yêu cầu:**
```
Per receipt line:
  1. Đọc lot_attrs từ PO line (lot_attr_01..12)
  2. Compute lot_hash = SHA-256(tenant_id | item_id | owner_id | selected_attrs)
  3. SELECT lot WHERE lot_hash = computed_hash
  4. IF found → reuse lot_id (merge vào lot cũ)
  5. ELSE → INSERT new lot (first_received_date = NOW())
  6. Set receipt_line.lot_id = lot_id
  7. Dùng lot_id trong InventTrans posting
```

**Cần bổ sung:**
- Tích hợp với Lot Management module (Master Data)
- Gọi `get_or_create_lot()` trong receive handler
- Lot hash cho phép auto-merge khi cùng item/owner/attributes

**Files cần sửa:**
- `receipt.service.js` — thêm lot assignment step trước khi post InventTrans
- Cần service/repository mới hoặc gọi Lot module

---

### 2.7 ❌ Auto-Create Putaway Work (Step 9)

**Hiện tại:** Code có interface `CreatePutawayWork` nhưng chưa implement (status: 🔜 Pending).

**Flow yêu cầu:**
```
Sau khi receipt RECEIVED:
  1. Determine target STORAGE location:
     - Check zone rules cho item
     - Check location capacity
     - Check item_incompatibility constraints
  2. INSERT work_header:
     type = PUTAWAY
     status = OPEN
     reference_id = receipt_id
  3. INSERT work_line #1:
     step = RECEIVE
     location = RECV dock
  4. INSERT work_line #2:
     step = PUT
     location = target STORAGE
```

**Putaway Execution (Worker completes):**
```
Khi worker hoàn thành putaway:
  InventTrans #3 — Move out:
    stage: PHYSICAL, qty: -received_qty, location: RECV dock
  InventTrans #4 — Move in:
    stage: PHYSICAL, qty: +received_qty, location: STORAGE

  on_hand: physical_qty giảm ở RECV, tăng ở STORAGE
```

**Cần bổ sung:**
- Implement `createPutawayWork()` trong receipt.service hoặc work module
- Location assignment strategy (zone rules, capacity check)
- Worker self-claim mechanism
- InventTrans posting khi complete putaway step

**Files cần tạo/sửa:**
- Module Work Management (nếu chưa có)
- `receipt.service.js` — gọi `createPutawayWork()` sau receive

---

### 2.8 ❌ PO Status Rollup (Step 10)

**Hiện tại:** PO có state `RECEIVING` nhưng không tự rollup dựa trên received qty.

**Flow yêu cầu:**
```
Sau mỗi receipt RECEIVED:
  total_received = SUM(all receipt_lines.received_qty) for this PO line
  UPDATE po_line.received_qty = total_received

  IF 0 < total_received < expected:
    po_line.status = PARTIALLY_RECEIVED
  IF total_received >= expected:
    po_line.status = FULLY_RECEIVED

  Rollup PO header:
    ANY line PARTIALLY_RECEIVED → PO = PARTIALLY_RECEIVED
    ALL lines FULLY_RECEIVED → PO = FULLY_RECEIVED
```

**Cần bổ sung:**
- Thêm method `rollupPOStatus(poId)` trong `purchase-order.service.ts`
- Gọi sau mỗi receipt RECEIVED
- Thêm field `received_qty` vào `purchase_order_line`
- Thêm PO status: `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`

**Files cần sửa:**
- `purchase-order.service.ts` — thêm rollup logic
- `purchase-order.dto.ts` — thêm status mới
- Database migration — thêm field + enum values

---

### 2.9 ❌ Billing Fee Events (Integration với P7)

**Hiện tại:** Không có integration với Billing module (status: 🔜 Pending).

**Flow yêu cầu:** Khi receipt RECEIVED, auto-capture billing events:
- `HANDLING_IN` fee — phí xử lý nhập hàng
- Weighing fee (nếu applicable)

**Cần bổ sung:**
- Publish event `InboundHandlingCaptured` khi receipt RECEIVED
- Billing module subscribe event này và tạo `billing_transaction`

---

### 2.10 ❌ Domain Events

**Hiện tại:** Code không publish domain events.

**Flow yêu cầu:**

| Event | Khi nào | Subscribers |
|-------|---------|-------------|
| `PurchaseOrderConfirmedEvent` | PO confirmed | InventTrans posting, audit |
| `InboundReceiptReceivedEvent` | Receipt RECEIVED | PO rollup, audit, notifications |
| `InventTransPostedEvent` | Post InventTrans | On-hand recalculation |
| `PutawayWorkCreatedEvent` | Putaway work tạo | Worker notification |
| `PutawayWorkCompletedEvent` | Putaway done | InventTrans RECV→STORAGE |
| `WeighbridgeLogRecordedEvent` | Log cân mới | Receipt line update, tolerance check |
| `ToleranceExceededEvent` | Tolerance fail | Supervisor notification |

**Cần bổ sung:**
- Implement event bus hoặc sử dụng pattern Observer/Mediator
- Publish events tại các điểm chính trong flow

---

## 3. Thứ tự bổ sung khuyến nghị

Dựa trên dependencies giữa các phần, thứ tự bổ sung nên là:

| Ưu tiên | Phần | Lý do |
|---------|------|-------|
| **1** | 2.4 — Confirm PO post EXPECTED | Foundation cho inventory tracking |
| **2** | 2.1 — Weighbridge Model per-SKU | Thay đổi lớn nhất, ảnh hưởng state machine |
| **3** | 2.3 — State Machine mới | Đơn giản hóa flow, phải làm cùng 2.1 |
| **4** | 2.2 — Running Tolerance | Phụ thuộc weighbridge model mới |
| **5** | 2.6 — Lot Assignment | Cần trước khi post InventTrans chính xác |
| **6** | 2.5 — Reverse EXPECTED khi Receive | Phụ thuộc 2.4 |
| **7** | 2.8 — PO Rollup | Phụ thuộc receive flow hoàn chỉnh |
| **8** | 2.7 — Putaway Work | Có thể phát triển song song |
| **9** | 2.9 — Billing Integration | Phát triển sau khi core flow ổn |
| **10** | 2.10 — Domain Events | Refactor cuối cùng để loosely couple |

---

## 4. Tóm tắt Gap Analysis

| Khía cạnh | Flow thiết kế | Code hiện tại | Gap |
|-----------|--------------|---------------|-----|
| **Weighing model** | Per-SKU (1:N weighbridge logs per receipt) | Per-receipt (1 weigh-in + 1 weigh-out) | **Lớn** — cần refactor toàn bộ weighing flow |
| **State machine** | 3 states chính: DRAFT → WEIGHING → RECEIVED | 11 states chi tiết | **Trung bình** — cần đơn giản hóa hoặc mapping |
| **InventTrans EXPECTED** | Post khi confirm PO | Không post | **Trung bình** — cần bổ sung |
| **InventTrans PHYSICAL** | Post khi RECEIVED | ✅ Đã có | OK |
| **Reverse EXPECTED** | Khi RECEIVED | Không có | **Trung bình** — cần bổ sung |
| **Lot assignment** | Auto get_or_create_lot | Không có | **Lớn** — cần tích hợp Lot module |
| **Putaway work** | Auto-create + execute | Chỉ có interface | **Lớn** — cần implement |
| **PO rollup** | Auto PARTIALLY/FULLY_RECEIVED | Không tự rollup | **Trung bình** — cần bổ sung |
| **Tolerance** | Running (sau mỗi lần cân) | 1 lần khi weigh-out | **Trung bình** — cần refactor |
| **Billing integration** | Auto-capture fee events | Chưa có | **Nhỏ** — event-driven, làm sau |
| **Domain events** | 7 event types | Không có | **Trung bình** — refactor architecture |

---

## 5. Lưu ý quan trọng khi bổ sung

1. **Event-sourced inventory (Golden Rule #1):** Mọi thay đổi inventory PHẢI đi qua `invent_trans` (append-only). KHÔNG được update trực tiếp `on_hand`.

2. **Lot traceability (Golden Rule #3):** `lot_id` phải có trong mọi `invent_trans`. Lot auto-merge (cùng hash) / auto-split (khác hash).

3. **Location accuracy (Golden Rule #4):** Mọi physical move (receive, putaway) phải tạo `invent_trans` với location change. Không được có inventory "floating" không có location.

4. **Concurrency (Golden Rule #5):** `invent_trans` chỉ INSERT, không UPDATE. Dùng advisory locks cho allocation.

5. **Tenant isolation (Golden Rule #2):** Tất cả query phải filter `tenant_id`. Unique constraints phải include `tenant_id`.
