# VAS Module — Process Map

> **Version**: 1.0 | **Date**: 2026-03-18

---

## Process 1: Tạo và Quản lý BOM VAS

**Trigger**: Admin muốn định nghĩa công thức cho dịch vụ VAS mới
**Actor**: Warehouse Administrator
**Preconditions**: Item (target + source) đã tồn tại trong master data

### Happy Path
1. Admin chọn service_type và target_item → System kiểm tra BOM active chưa tồn tại
2. Admin nhập bom_code, bom_name
3. Admin thêm BOM lines: source_item, qty_ratio, is_packaging, packaging_ownership
4. Admin save → System tạo BOM với status is_active=true

### Exception Handling
- **BOM đã tồn tại cho (service_type, target_item)**: Báo lỗi "Đã có BOM active cho target item + service type này. Deactivate BOM cũ trước."
- **qty_ratio ≤ 0**: Validation error

**Postconditions**: BOM active, sẵn sàng dùng cho Work Order

---

## Process 2: Tạo VAS Work Order

**Trigger**: Manager nhận yêu cầu thực hiện dịch vụ VAS từ chủ hàng
**Actor**: Warehouse Manager
**Preconditions**: BOM active tồn tại; source lots có hàng

### Happy Path
1. Manager chọn service_type → System lọc BOM available
2. Manager chọn BOM → System auto-fill target_item
3. Manager nhập: owner, warehouse, planned_qty, notes
4. Manager save → WO tạo với status DRAFT, vwo_number auto-generated

**Postconditions**: WO ở trạng thái DRAFT

---

## Process 3: Confirm Work Order — Chọn Source Lots

**Trigger**: Manager approve WO để bắt đầu thực hiện
**Actor**: Warehouse Manager
**Preconditions**: WO ở DRAFT

### Happy Path
1. Manager mở WO → click Confirm
2. System hiển thị bảng source materials (từ BOM × planned_qty):
   - Per source item: planned_qty = planned_qty_VWO × qty_ratio
3. Manager chọn 1 hoặc nhiều lots per source item (với qty per lot)
4. System validate: SUM(selected lot qty) = planned_qty per source item
5. System validate: available_qty của mỗi lot ≥ qty được chọn
6. System tạo `vas_work_order_source` rows
7. System auto-create target_lot:
   - lot.source_lot_id = lot của vật tư CHÍNH (non-packaging, qty lớn nhất)
8. WO → CONFIRMED

### Exception Handling
- **Available qty không đủ**: Warning per lot, block nếu tổng < planned
- **CLIENT_OWNED packaging**: Skip qty check, không tạo vwo_source cho dòng này

**Postconditions**: WO CONFIRMED; vwo_source rows tạo; target_lot tạo

---

## Process 4: Mở Session Mới

**Trigger**: Operator bắt đầu ca làm việc cho WO
**Actor**: Warehouse Operator
**Preconditions**: WO ở CONFIRMED hoặc IN_PROGRESS; không có session OPEN đang tồn tại

### Happy Path
1. Operator chọn WO → click "Mở ca mới"
2. System tạo `vas_session` với:
   - session_number = max(session_number) + 1
   - status = OPEN
3. WO → IN_PROGRESS (nếu chưa)
4. Operator ghi nhận output_qty trong quá trình làm việc (optional, update bất kỳ lúc nào)

**Postconditions**: Session OPEN; WO IN_PROGRESS

---

## Process 5: Confirm Kết thúc Ca — Core Process

**Trigger**: Operator hoàn thành ca, sẵn sàng ghi nhận kết quả
**Actor**: Warehouse Operator
**Preconditions**: Session OPEN; WO IN_PROGRESS

### Happy Path
1. Operator click "Kết thúc ca"
2. System hiển thị form confirm:
   - Output qty (pre-filled nếu đã nhập)
   - Target location dropdown
   - Table per source item × lot: consumed_qty + source_location
3. Operator điền đầy đủ thông tin (consumed_qty bao gồm cả waste)
4. Operator submit

5. System validate (BR-VAS-004, BR-VAS-010)

6. System tạo InventTrans — **trong 1 DB transaction**:
   ```
   Per session_line:
     INSERT invent_trans (ISSUE/DEDUCTED, source_item, -consumed_qty,
                          source_location, source_lot, ref_type=VAS, ref_id=session_id)
     → update session_line.invent_trans_issue_id

   Cho target item:
     INSERT invent_trans (RECEIPT/PHYSICAL, target_item, +output_qty,
                          target_location, target_lot, ref_type=VAS, ref_id=session_id)
     → update session.invent_trans_receipt_id
   ```

7. System update:
   - `vas_session.status = CONFIRMED`
   - `vas_work_order.actual_qty += output_qty`
   - `vas_work_order_source.actual_qty += consumed_qty` per source

8. System hiển thị waste info (chỉ báo cáo):
   - Waste per material = consumed_qty − (output_qty × qty_ratio)

### Alternative Path — CLIENT_OWNED Packaging
- Tại bước 6: Skip ISSUE InventTrans cho packaging lines có packaging_ownership = CLIENT_OWNED

### Alternative Path — DE_BAGGING service type
- Tại bước 6: Không tạo RECEIPT InventTrans cho bao bì rỗng

### Alternative Path — Multi-Lot per Source Item
- Operator nhấn "+ Thêm lot" để split 1 source item ra nhiều lots
- System tạo 1 session_line per (source_item × lot)
- System tạo 1 InventTrans ISSUE per session_line

### Exception Handling
- **Available qty không đủ** (BR-VAS-010): Block confirm, hiển thị lỗi per lot
- **output_qty ≤ 0**: Block confirm
- **target_location trống**: Block confirm
- **DB transaction fail**: Rollback toàn bộ, không có trans nào được tạo

**Postconditions**:
- Session CONFIRMED
- InventTrans ISSUE per source material tồn tại
- InventTrans RECEIPT cho target item tồn tại
- on_hand updated (async, qua materialization worker)

---

## Process 6: Complete Work Order

**Trigger**: Manager kết thúc WO sau khi đủ sản lượng
**Actor**: Warehouse Manager
**Preconditions**: WO IN_PROGRESS; KHÔNG có session OPEN

### Happy Path
1. Manager mở WO → click "Hoàn thành"
2. System kiểm tra: all sessions CONFIRMED (BR-VAS-007)
3. System update WO → COMPLETED
4. System tạo `billing_transaction`:
   - fee_type = VAS
   - quantity = actual_qty
   - rate từ billing_contract của owner

**Exception Handling**
- **Còn session OPEN**: Block, hiển thị "Còn [N] ca chưa xác nhận"
- **billing_contract không tồn tại**: WO vẫn COMPLETED, billing_transaction skip + cảnh báo

**Postconditions**: WO COMPLETED; billing_transaction tạo

---

## Business Rules Summary

| BR | Trigger | Rule |
|----|---------|------|
| BR-VAS-001 | Tạo BOM | 1 BOM active per (tenant, service_type, target_item) |
| BR-VAS-002 | Deactivate BOM | Block nếu có WO CONFIRMED/IN_PROGRESS đang dùng |
| BR-VAS-003 | Confirm WO | available_qty ≥ planned_qty per source lot |
| BR-VAS-004 | Confirm Session | output_qty > 0, target_location set, all lines có qty + location |
| BR-VAS-005 | Confirm Session | CLIENT_OWNED: skip ISSUE InventTrans |
| BR-VAS-006 | Confirm Session | DE_BAGGING: không Receipt bao rỗng |
| BR-VAS-007 | Complete WO | All sessions CONFIRMED |
| BR-VAS-008 | Complete WO | Tạo billing_transaction |
| BR-VAS-009 | Update Session | CONFIRMED session immutable |
| BR-VAS-010 | Confirm Session | available_qty ≥ consumed_qty per lot per session |
