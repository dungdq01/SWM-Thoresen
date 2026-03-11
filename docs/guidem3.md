# Hướng dẫn Test Module 3: Inventory Core Engine

**Module:** Inventory Core Engine
**Trang test:** Posting Workbench (Bàn làm việc ghi sổ và đảo ngược)
**URL:** `localhost:8386/app/inventory-core/workbench`
**Ngày cập nhật:** 2026-03-11
**Người test:** _____________

---

## 1. Tổng quan

### 1.1 Mục đích của trang
Trang **Posting Workbench** là công cụ thủ công để:
- **Tạo ghi sổ (Create Posting):** Ghi nhận biến động tồn kho từ các business events (Receipt, Shipment, Move, Adjustment, v.v.)
- **Đảo ngược giao dịch (Reverse Transaction):** Hủy/đảo chiều một giao dịch đã post mà không xóa ledger gốc

### 1.2 Nguyên tắc cốt lõi
> ⚠️ **QUAN TRỌNG:** Trang này chỉ nên dùng cho testing/troubleshooting. Trong vận hành thực tế:
> - Inventory transactions PHẢI được tạo tự động từ các module khác (M4 Inbound, M5 Outbound, M6 Inventory Control)
> - Mọi thay đổi tồn kho PHẢI đi qua Posting Engine
> - Ledger (`invent_trans`) là BẤT BIẾN - không UPDATE/DELETE trực tiếp
> - Correction phải dùng reversal transaction

### 1.3 Backend APIs
| Endpoint | Method | Mục đích |
|---------|--------|----------|
| `/api/v1/inventory/postings` | POST | Tạo inventory transaction |
| `/api/v1/inventory/postings/reverse` | POST | Reverse một transaction |
| `/api/v1/inventory/onhand` | GET | Query tồn kho hiện tại |
| `/api/v1/inventory/transactions` | GET | Query transaction history |

---

## 2. Chuẩn bị dữ liệu test

### 2.1 Master Data cần có trước
Trước khi test, đảm bảo hệ thống đã có:

#### Items (Mặt hàng)
- RICE-5% (Gạo 5% tấm)
- CORN-BULK (Ngô bulk)
- WHEAT-FEED (Lúa mì thức ăn chăn nuôi)

#### Warehouses (Kho)
- WH5.1 (Kho chính TVL)
- MAVY-20 (Kho MAVY)

#### Locations (Vị trí)
- RECEIVING-01 (Khu nhận hàng)
- STORAGE-A1 (Khu lưu trữ A1)
- STORAGE-B2 (Khu lưu trữ B2)

#### Owners (Chủ hàng)
- CUST001 (Khách hàng 001)
- CUST002 (Khách hàng 002)

#### Inventory Status (Trạng thái tồn kho)
- AVAILABLE (Khả dụng, `isAllocatable: true`)
- QUARANTINE (Cách ly, `isAllocatable: false`)
- DAMAGED (Hư hỏng, `isAllocatable: false`)

### 2.2 Cách kiểm tra Master Data
1. Vào menu **Master Data** → **Items / Warehouses / Owners / Inventory Status**
2. Nếu chưa có, tạo mới các records theo danh sách trên
3. Đảm bảo tất cả records có status = ACTIVE

---

## 3. Test Scenarios: Create Posting (Tạo ghi sổ)

### 3.1 Scenario 1: RECEIPT_IN - Nhập kho từ Receipt

**Mục tiêu:** Ghi nhận tồn kho khi Receipt đạt trạng thái RECEIVED

**Test Steps:**

1. **Điền form "Tạo ghi sổ":**
   - **Mã sự kiện:** `RECEIPT_RECEIVED`
   - **Loại tham chiếu:** `RECEIPT`
   - **Mã tham chiếu:** `RCPT-20260311-001`
   - **Mã dòng tham chiếu:** `LINE-01`
   - **Chọn mặt hàng:** `RICE-5%`
   - **Số lượng:** `50000`
   - **Đơn vị tính:** `KG`
   - **Chọn kho:** `WH5.1`
   - **Mã vị trí:** `RECEIVING-01`
   - **Mã chủ hàng:** `CUST001`
   - **Mã trạng thái:** `AVAILABLE`

2. **Click "Ghi sổ giao dịch"**

**Expected Results:**
- ✅ Hiển thị toast/notification "Tạo giao dịch thành công"
- ✅ Trả về `transId` (ví dụ: `TRX-20260311-000001`)
- ✅ Form được reset về trạng thái ban đầu

**Kiểm tra dữ liệu:**
1. Vào trang **On-Hand** (Tồn kho hiện tại)
2. Filter: Item = RICE-5%, Owner = CUST001, Warehouse = WH5.1
3. Verify:
   - `physicalQty` = `50000.000`
   - `availableQty` = `50000.000`
   - `reservedQty` = `0.000`

4. Vào trang **Transactions** (Lịch sử giao dịch)
5. Tìm transaction vừa tạo bằng `transId`
6. Verify:
   - `transType` = `RECEIPT_IN`
   - `qty` = `+50000.000` (dương vì là nhập kho)
   - `refType` = `RECEIPT`
   - `refId` = `RCPT-20260311-001`

---

### 3.2 Scenario 2: SHIPMENT_OUT - Xuất kho từ Shipment

**Điều kiện tiên quyết:** Phải có tồn kho từ Scenario 1

**Test Steps:**

1. **Điền form "Tạo ghi sổ":**
   - **Mã sự kiện:** `SHIPMENT_SHIPPED`
   - **Loại tham chiếu:** `SHIPMENT`
   - **Mã tham chiếu:** `SHP-20260311-001`
   - **Mã dòng tham chiếu:** `LINE-01`
   - **Chọn mặt hàng:** `RICE-5%`
   - **Số lượng:** `25000`
   - **Đơn vị tính:** `KG`
   - **Chọn kho:** `WH5.1`
   - **Mã vị trí:** `RECEIVING-01`
   - **Mã chủ hàng:** `CUST001`
   - **Mã trạng thái:** `AVAILABLE`

2. **Click "Ghi sổ giao dịch"**

**Expected Results:**
- ✅ Transaction thành công
- ✅ `transId` mới được tạo (ví dụ: `TRX-20260311-000002`)

**Kiểm tra dữ liệu:**
1. Vào **On-Hand**, filter như trước
2. Verify:
   - `physicalQty` = `25000.000` (50000 - 25000)
   - `availableQty` = `25000.000`

3. Vào **Transactions**
4. Verify transaction mới:
   - `transType` = `SHIPMENT_OUT`
   - `qty` = `-25000.000` (âm vì là xuất kho)

---

### 3.3 Scenario 3: MOVE - Di chuyển nội bộ

**Mục tiêu:** Di chuyển hàng từ RECEIVING-01 sang STORAGE-A1

**Test Steps:**

1. **Điền form:**
   - **Mã sự kiện:** `MOVE_COMPLETED`
   - **Loại tham chiếu:** `MOVE`
   - **Mã tham chiếu:** `MOVE-20260311-001`
   - **Mã dòng tham chiếu:** `LINE-01`
   - **Chọn mặt hàng:** `RICE-5%`
   - **Số lượng:** `10000`
   - **Đơn vị tính:** `KG`

   **📍 Dimension FROM (nguồn):**
   - **Chọn kho:** `WH5.1`
   - **Mã vị trí:** `RECEIVING-01`
   - **Mã chủ hàng:** `CUST001`
   - **Mã trạng thái:** `AVAILABLE`

   **📍 Dimension TO (đích):**
   - **Chọn kho:** `WH5.1` (cùng kho)
   - **Mã vị trí:** `STORAGE-A1` (vị trí mới)
   - **Mã chủ hàng:** `CUST001` (cùng chủ hàng)
   - **Mã trạng thái:** `AVAILABLE` (cùng trạng thái)

> ⚠️ **Lưu ý UI:** Form hiện tại chỉ hỗ trợ `dimTo` (destination). Để test MOVE với `dimFrom` + `dimTo`, có thể cần:
> - Sửa lại UI thêm section "Dimension FROM"
> - Hoặc test trực tiếp qua API tool (Postman/Thunder Client)

**Expected Results:**
- ✅ Transaction thành công
- ✅ `transType` = `MOVE`
- ✅ Tồn kho tại RECEIVING-01 giảm 10000
- ✅ Tồn kho tại STORAGE-A1 tăng 10000

---

### 3.4 Scenario 4: STATUS_CHANGE - Thay đổi trạng thái

**Mục tiêu:** Chuyển hàng từ AVAILABLE sang QUARANTINE

**Test Steps:**

1. **Điền form:**
   - **Mã sự kiện:** `STATUS_CHANGE_CONFIRMED`
   - **Loại tham chiếu:** `STATUS_CHANGE`
   - **Mã tham chiếu:** `STC-20260311-001`
   - **Chọn mặt hàng:** `RICE-5%`
   - **Số lượng:** `5000`

   **FROM:**
   - Kho: WH5.1, Location: STORAGE-A1, Owner: CUST001, Status: `AVAILABLE`

   **TO:**
   - Kho: WH5.1, Location: STORAGE-A1, Owner: CUST001, Status: `QUARANTINE`

**Expected Results:**
- ✅ Tồn AVAILABLE giảm 5000
- ✅ Tồn QUARANTINE tăng 5000
- ✅ `transType` = `STATUS_CHANGE`

---

### 3.5 Scenario 5: ADJUSTMENT - Điều chỉnh thủ công

**Mục tiêu:** Điều chỉnh tăng tồn khi phát hiện thừa

**Test Steps:**

1. **Điền form:**
   - **Mã sự kiện:** `ADJUSTMENT_APPROVED`
   - **Loại tham chiếu:** `ADJUSTMENT`
   - **Mã tham chiếu:** `ADJ-20260311-001`
   - **Mã lý do:** `CYCLE_COUNT_GAIN` (có thể cần thêm Reason Code vào Master Data)
   - **Số lượng:** `2000` (số dương = tăng tồn)
   - **Kho/Location/Owner/Status:** như cũ

**Expected Results:**
- ✅ Tồn tăng 2000
- ✅ `transType` = `ADJUSTMENT`
- ✅ `reasonCode` được ghi nhận

---

## 4. Test Scenarios: Reverse Transaction (Đảo ngược giao dịch)

### 4.1 Scenario 6: Reverse SHIPMENT_OUT (Hủy xuất kho)

**Bối cảnh:** Phát hiện xuất kho sai, cần hủy transaction `TRX-20260311-000002`

**Test Steps:**

1. **Vào section "Đảo ngược giao dịch"**
2. **Điền form:**
   - **Mã giao dịch gốc:** `TRX-20260311-000002` (từ Scenario 2)
   - **Mã lý do:** `DOCUMENT_ERROR`
   - **Ghi chú:** `Posted wrong location - need to revert`

3. **Click "Đảo ngược giao dịch"**

**Expected Results:**
- ✅ Reversal thành công
- ✅ Trả về `reversalTransId` (ví dụ: `REV-20260311-ABCD`)
- ✅ Tồn kho tăng lại 25000 (vì đã hủy transaction xuất 25000)

**Kiểm tra dữ liệu:**
1. Vào **Transactions**
2. Tìm transaction gốc `TRX-20260311-000002`
3. Verify:
   - `hasBeenReversed` = `true`
   - Có link đến reversal transaction

4. Tìm reversal transaction `REV-20260311-ABCD`
5. Verify:
   - `qty` = `+25000.000` (ngược chiều với transaction gốc)
   - `isReversal` = `true`
   - `reasonCode` = `DOCUMENT_ERROR`

---

### 4.2 Scenario 7: Prevent Duplicate Reversal

**Mục tiêu:** Đảm bảo không reverse được transaction đã bị reverse

**Test Steps:**

1. Thử reverse lại `TRX-20260311-000002` (đã reverse ở Scenario 6)
2. Click "Đảo ngược giao dịch"

**Expected Results:**
- ❌ Hiển thị error: `INV_ALREADY_REVERSED`
- ❌ Message: "Transaction already reversed"
- ❌ HTTP Status: 409 Conflict

---

## 5. Edge Cases & Error Handling

### 5.1 Test Case: Negative Stock (Tồn âm)

**Setup:** Tồn hiện tại = 1000 KG

**Test Steps:**
1. Tạo SHIPMENT_OUT với qty = 2000 (lớn hơn tồn)
2. Click "Ghi sổ giao dịch"

**Expected Results:**
- ❌ Error: `INV_NEGATIVE_STOCK_BLOCKED`
- ❌ Message: "Would result in negative stock"
- ❌ HTTP Status: 422

---

### 5.2 Test Case: Duplicate External ID

**Test Steps:**
1. Tạo transaction với `externalId` = `TEST-DUP-001`
2. Tạo lại transaction với cùng `externalId` nhưng khác payload

**Expected Results:**
- ✅ Lần 1: Thành công
- ✅ Lần 2 (cùng payload): Trả về kết quả cũ (idempotent replay)
- ❌ Lần 2 (khác payload): Error `INV_IDEMPOTENCY_CONFLICT`

---

### 5.3 Test Case: Invalid Event Code

**Test Steps:**
1. Nhập `eventCode` = `INVALID_EVENT`
2. Submit

**Expected Results:**
- ❌ Error: `INV_INVALID_EVENT_CODE`
- ❌ HTTP Status: 422

---

### 5.4 Test Case: Inactive Master Data

**Setup:** Set Owner CUST001 status = INACTIVE

**Test Steps:**
1. Tạo transaction với Owner = CUST001
2. Submit

**Expected Results:**
- ❌ Error: `INV_MASTER_INACTIVE`
- ❌ Message: "Item/Owner/Location/Status inactive"

---

## 6. Integration Testing với các trang khác

### 6.1 Test với On-Hand Page

1. Sau khi tạo nhiều transactions, vào **On-Hand** page
2. Verify:
   - Số liệu khớp với tổng các transactions
   - Filter theo Item/Owner/Warehouse hoạt động đúng
   - `physicalQty` = tổng tất cả transactions
   - `availableQty` = `physicalQty - reservedQty`

### 6.2 Test với Transactions Page

1. Vào **Transactions** page
2. Test filters:
   - Filter by Item
   - Filter by Owner
   - Filter by refType (RECEIPT, SHIPMENT, MOVE)
   - Filter by date range
3. Verify pagination hoạt động
4. Click vào từng transaction để xem detail

### 6.3 Test với Holds Page

1. Vào **Holds** page
2. Tạo hold mới:
   - Item: RICE-5%
   - Qty: 5000
   - Warehouse/Location/Owner/Status: như tồn kho hiện có
3. Verify:
   - Hold thành công
   - `reservedQty` trong On-Hand tăng 5000
   - `availableQty` giảm 5000

---

## 7. Reconciliation Testing

### 7.1 Verify Ledger vs On-Hand

**Mục tiêu:** Đảm bảo `OnHand` khớp với tổng từ `InventTrans`

**Test Steps:**

1. Lấy tất cả transactions cho 1 dimension cụ thể (ví dụ: RICE-5%, WH5.1, STORAGE-A1, CUST001, AVAILABLE)
2. Tính tổng:
   ```
   Ledger Total = SUM(qty) from all InventTrans
   ```

3. So sánh với On-Hand:
   ```
   OnHand.physicalQty == Ledger Total
   ```

**Expected Results:**
- ✅ Số liệu PHẢI KHỚP TUYỆT ĐỐI
- ❌ Nếu không khớp → **CRITICAL BUG** trong Posting Engine

**Cách test nhanh:**
```sql
-- Lấy total từ ledger
SELECT
  item_id,
  invent_dim_id,
  SUM(qty) as ledger_total
FROM invent_trans
WHERE item_id = '<RICE-5% id>'
  AND invent_dim_id = '<dimension id>'
GROUP BY item_id, invent_dim_id

-- So sánh với on_hand
SELECT
  item_id,
  invent_dim_id,
  physical_qty
FROM on_hand
WHERE item_id = '<RICE-5% id>'
  AND invent_dim_id = '<dimension id>'
```

---

## 8. Performance Testing (Optional)

### 8.1 Bulk Posting Test

**Mục tiêu:** Test hiệu năng khi tạo nhiều transactions

**Test Steps:**
1. Tạo 100 transactions liên tiếp (có thể dùng script)
2. Đo thời gian:
   - Từng transaction < 500ms
   - Không có timeout
   - Không có memory leak

---

## 9. Checklist tổng hợp

### Pre-Test Checklist
- [ ] Master Data đã được tạo đầy đủ (Items, Warehouses, Locations, Owners, Status)
- [ ] Tất cả Master Data có status = ACTIVE
- [ ] Backend đang chạy và kết nối được
- [ ] Đã login với user có permission `INVENTORY.POSTING.CREATE`, `INVENTORY.REVERSAL.CREATE`

### Post-Test Checklist
- [ ] Scenario 1: RECEIPT_IN ✅
- [ ] Scenario 2: SHIPMENT_OUT ✅
- [ ] Scenario 3: MOVE ✅
- [ ] Scenario 4: STATUS_CHANGE ✅
- [ ] Scenario 5: ADJUSTMENT ✅
- [ ] Scenario 6: Reverse Transaction ✅
- [ ] Scenario 7: Prevent Duplicate Reversal ✅
- [ ] Edge Case: Negative Stock ✅
- [ ] Edge Case: Duplicate External ID ✅
- [ ] Edge Case: Invalid Event Code ✅
- [ ] Edge Case: Inactive Master Data ✅
- [ ] Integration: On-Hand sync ✅
- [ ] Integration: Transactions page ✅
- [ ] Integration: Holds page ✅
- [ ] Reconciliation: Ledger vs On-Hand ✅

---

## 10. Known Issues & Workarounds

### Issue 1: UI chưa hỗ trợ `dimFrom` + `dimTo`
**Impact:** Không test được MOVE và STATUS_CHANGE từ UI
**Workaround:** Test trực tiếp qua API (Postman/Thunder Client)

### Issue 2: Reason Code dropdown chưa có
**Impact:** Không chọn được reason code từ UI
**Workaround:** Nhập manual text vào field `reasonCode`

### Issue 3: External ID auto-generate
**Impact:** Không kiểm soát được external_id để test idempotency
**Workaround:**
```js
// Trong code, đổi từ:
externalId: `posting-${Date.now()}`
// Thành:
externalId: document.getElementById('externalIdInput').value || `posting-${Date.now()}`
```

---

## 11. API Testing với Postman/Thunder Client

### 11.1 POST Create Posting (MOVE)

**Endpoint:** `POST http://localhost:3000/api/v1/inventory/postings`

**Headers:**
```
Content-Type: application/json
x-user-code: admin
Idempotency-Key: test-move-001
```

**Body:**
```json
{
  "externalId": "move-test-001",
  "correlationId": "corr-test-001",
  "eventCode": "MOVE_COMPLETED",
  "refType": "MOVE",
  "refId": "MOVE-20260311-001",
  "refLineId": "LINE-01",
  "itemId": "<RICE-5% UUID>",
  "qty": "10000.000",
  "uomCode": "KG",
  "dimFrom": {
    "warehouseCode": "WH5.1",
    "locationCode": "RECEIVING-01",
    "ownerCode": "CUST001",
    "statusCode": "AVAILABLE"
  },
  "dimTo": {
    "warehouseCode": "WH5.1",
    "locationCode": "STORAGE-A1",
    "ownerCode": "CUST001",
    "statusCode": "AVAILABLE"
  },
  "sourceApp": "API",
  "postedBy": "admin"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "transId": "TRX-20260311-000003",
    "transDbId": "<UUID>",
    "transType": "MOVE",
    "itemId": "<UUID>",
    "qty": "10000.000",
    "onHandAfter": {
      "physicalQty": "10000.000",
      "reservedQty": "0.000",
      "availableQty": "10000.000"
    },
    "idempotentReplay": false
  }
}
```

---

## 12. Troubleshooting Guide

### Lỗi: "Transaction failed with 404"
**Nguyên nhân:** Backend route chưa được đăng ký
**Giải pháp:** Kiểm tra `app.module.ts` đã import `InventoryCoreModule` chưa

### Lỗi: "Master data not found"
**Nguyên nhân:** Item/Warehouse/Owner/Status không tồn tại hoặc INACTIVE
**Giải pháp:** Vào Master Data pages, verify records tồn tại và ACTIVE

### Lỗi: "Would result in negative stock"
**Nguyên nhân:** Xuất kho nhiều hơn tồn hiện có
**Giải pháp:** Check On-Hand trước khi xuất

### On-Hand không khớp với Ledger
**Nguyên nhân:** Bug trong Posting Engine hoặc Reconciliation
**Giải pháp:**
1. Chạy reconciliation service
2. Kiểm tra logs của Posting Engine
3. Verify tất cả transactions có update On-Hand đúng

---

## 13. Sign-off

| Vai trò | Người test | Ngày | Chữ ký | Kết quả |
|---------|-----------|------|--------|---------|
| QA Engineer | ________ | ___/___/___ | ________ | ☐ Pass ☐ Fail |
| Business User | ________ | ___/___/___ | ________ | ☐ Pass ☐ Fail |
| Tech Lead | ________ | ___/___/___ | ________ | ☐ Pass ☐ Fail |

**Ghi chú:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**End of Document**
