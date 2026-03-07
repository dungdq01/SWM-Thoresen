# THORESEN VINAMA LOGISTICS — Smart Warehouse Management (SWM)

# WORK EXECUTION SPECIFICATION

**WorkHeader / WorkLine Model, Mobile Task Flows & InventTrans Integration**

| Property | Value |
|----------|-------|
| Document ID | TVL-SWM-SPEC-B3 |
| Version | 1.0 |
| Date | March 2026 |
| Status | Draft for Review |
| Priority | HIGH |
| Author | Smartlog Solution Team |
| Referenced By | Gap Analysis B3, PRD VIBECODING, State Machine v3.1, MasterData PRD v2.1 |

---

## 1. Executive Summary

Tài liệu này define chi tiết Work Execution Layer cho hệ thống SWM TVL, dựa trên D365 WMS Reference Architecture. Đây là file B3 trong Gap Analysis Restructuring Plan, bổ sung phần còn thiếu nghiêm trọng nhất ở Warehouse Execution Layer (hiện chỉ đạt 15% hoàn thiện).

Work Execution Layer là lớp trung gian giữa Document Layer (ASN, Shipment, Transfer...) và Inventory Transaction Layer (InventTrans). Nguyên tắc cốt lõi: MỌI thao tác vật lý trong kho (nhận hàng, cất kho, lấy hàng, di chuyển, kiểm kê) đều phải đi qua Work model. Mỗi WorkLine complete sẽ tạo 1 InventTrans tương ứng.

### 1.1 Scope

| In-Scope (Phase 1) | Out-of-Scope (Phase 2) |
|---------------------|------------------------|
| Work Types: PUTAWAY, PICK, MOVE | REPLENISH, LOAD, CYCLE_COUNT work type |
| WorkHeader / WorkLine data model | Wave processing / Batch picking |
| Self-claim mobile task flow | Directed assignment / Supervisor dispatch |
| InventTrans posting per WorkLine | LPN-based work generation |
| Short Pick / Variance handling | Cross-dock work templates |

### 1.2 Design Principles

- **Work-driven execution:** Mọi thao tác scan tạo/hoàn thành WorkLine, KHÔNG edit qty trực tiếp trên OnHand.
- **1 WorkLine complete = 1 InventTrans.** Đây là quy tắc bắt buộc của D365 work-driven execution.
- **Self-claim model [TVL CONFIRMED]:** Nhân viên TỰ CHỦ ĐỘNG mở mobile app, thấy danh sách work, và bấm Claim. Không có Supervisor phân công.
- **Idempotent:** Mọi API có external_id để chống tạo trùng.
- **Audit trail:** Mọi state transition ghi log (who, when, what changed).

---

## 2. Data Model

### 2.1 WorkHeader (work_header)

Work order header điều phối mọi thao tác trong kho. Trong D365 WMS, MỌI hoạt động (putaway, pick, replenish, cycle count, move) đều tạo Work. Mobile app hiển thị danh sách Work cho nhân viên thực hiện.

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khóa chính tự động |
| **work_id** | VARCHAR(30) | UNIQUE, NOT NULL | Mã công việc. Format: WRK-YYYYMMDD-SEQ. VD: WRK-20260315-000001 |
| **work_type** | ENUM | NOT NULL | PUTAWAY \| PICK \| REPLENISH \| CYCLE_COUNT \| MOVE \| LOAD |
| **status** | ENUM | NOT NULL, DEFAULT OPEN | OPEN \| IN_PROGRESS \| COMPLETED \| CANCELLED |
| **priority** | INTEGER | NOT NULL, DEFAULT 50 | 1=cao nhất, 99=thấp nhất. Urgent pick=10, Normal putaway=50 |
| **warehouse_id** | VARCHAR(10) | FK -> warehouse, NOT NULL | Kho thực hiện |
| **zone_id** | VARCHAR(20) | NULLABLE | Zone chính của work (để assign nhân viên theo zone) |
| **source_type** | ENUM | NOT NULL | ASN \| SHIPMENT \| TRANSFER \| ADJUSTMENT \| COUNT \| MANUAL |
| **source_id** | VARCHAR(30) | NOT NULL | Mã chứng từ gốc. VD: RCV-20260315-001 |
| **source_line_id** | VARCHAR(30) | NULLABLE | Mã dòng chứng từ. NULL cho work level header |
| **owner_id** | VARCHAR(20) | FK -> owner, NOT NULL | Chủ hàng (denormalize cho phân quyền + báo cáo) |
| **assigned_to** | UUID | FK -> users, NULLABLE | [TVL CONFIRMED] Self-claim. Luôn NULL khi tạo mới |
| **assigned_at** | TIMESTAMPTZ | NULLABLE | Thời điểm nhân viên claim |
| **started_at** | TIMESTAMPTZ | NULLABLE | Thời điểm bắt đầu thực hiện (bấm Start trên mobile) |
| **completed_at** | TIMESTAMPTZ | NULLABLE | Thời điểm hoàn thành. Duration = completed_at - started_at |
| **created_by** | UUID | FK -> users, NOT NULL | Người/hệ thống tạo work |
| **created_at** | TIMESTAMPTZ | DEFAULT NOW() | Thời gian tạo |
| **updated_at** | TIMESTAMPTZ | DEFAULT NOW() | Thời gian cập nhật cuối |

### 2.2 WorkLine (work_line)

Từng bước thực hiện trong 1 work order. VD: Putaway work có 2 lines: line 1 = RECEIVE (nhận tại staging), line 2 = PUT (đặt vào location lưu trữ). Pick work có 2 lines: line 1 = PICK (lấy từ storage), line 2 = STAGE (đặt tại staging outbound). Mỗi step complete tạo 1 InventTrans.

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khóa chính tự động |
| **work_id** | VARCHAR(30) | FK -> work_header, NOT NULL | Mã work header. 1 work có nhiều lines |
| **line_num** | INTEGER | NOT NULL | Số thứ tự bước. Putaway: 1=Receive, 2=Put. Pick: 1=Pick, 2=Stage |
| **step_type** | ENUM | NOT NULL | RECEIVE \| PUT \| PICK \| PACK \| STAGE \| LOAD \| COUNT \| MOVE_FROM \| MOVE_TO |
| **status** | ENUM | DEFAULT OPEN | OPEN \| IN_PROGRESS \| COMPLETED \| SKIPPED \| CANCELLED |
| **from_location_id** | VARCHAR(30) | FK -> location, NULLABLE | Vị trí nguồn (pick from). NULL cho receive step |
| **to_location_id** | VARCHAR(30) | FK -> location, NULLABLE | Vị trí đích (put to, stage to) |
| **item_id** | VARCHAR(50) | FK -> item, NOT NULL | Mã hàng hóa |
| **invent_dim_id** | UUID | FK -> invent_dim | Dimension (owner, location, status) |
| **expected_qty** | DECIMAL(15,3) | NOT NULL | Số lượng dự kiến (kg) |
| **actual_qty** | DECIMAL(15,3) | NULLABLE | Số lượng thực tế (kg). Populate khi complete |
| **uom** | VARCHAR(10) | DEFAULT KG | Đơn vị tính |
| **invent_trans_id** | VARCHAR(30) | NULLABLE | Link InventTrans. Populate SAU KHI step complete |
| **scanned_location** | VARCHAR(30) | NULLABLE | Location QR code đã scan (xác nhận) |
| **variance_qty** | DECIMAL(15,3) | NULLABLE | = actual_qty - expected_qty. Auto-calculate |
| **variance_reason** | VARCHAR(20) | NULLABLE | SHORT_PICK \| OVERAGE \| DAMAGE \| OTHER |
| **completed_at** | TIMESTAMPTZ | NULLABLE | Thời điểm hoàn thành step |
| **completed_by** | UUID | FK -> users, NULLABLE | Người thực hiện step |

---

## 3. Work Types & Step Definitions

Mỗi Work Type có bộ step_type cố định. Hệ thống tự sinh WorkLines theo template khi tạo WorkHeader.

### 3.1 Phase 1 Work Types

| Work Type | Source Document | Steps (WorkLines) | Trigger tạo Work | InventTrans per Step |
|-----------|----------------|-------------------|------------------|---------------------|
| PUTAWAY | ASN/Receipt | Line 1: RECEIVE (nhận tại RECEIVING), Line 2: PUT (cất vào STORAGE) | Receipt state = RECEIVED | Line 1: +qty tại RECEIVING dim. Line 2: MOVE (RECEIVING -> STORAGE) |
| PICK | Shipment | Line 1: PICK (lấy từ STORAGE), Line 2: STAGE (đặt tại STAGING_OUT) | Shipment: ALLOCATED -> PICKING | Line 1: MOVE (STORAGE -> STAGING_OUT). Line 2: Status update |
| MOVE | Manual / Transfer | Line 1: MOVE_FROM (lấy từ source), Line 2: MOVE_TO (đặt tại dest) | User tạo manual trên Web/Mobile | Line 1: -qty tại source dim. Line 2: +qty tại dest dim |

### 3.2 Phase 2 Work Types (Deferred)

| Work Type | Source | Steps | Notes |
|-----------|--------|-------|-------|
| REPLENISH | Replenishment rule | PICK + PUT | Bổ sung hàng từ reserve zone sang pick zone |
| CYCLE_COUNT | Count schedule | COUNT | Kiểm kê theo location. 1 line per location+item |
| LOAD | Shipment | LOAD + VERIFY | Chất xe. TVL context: tích hợp weighbridge per trip |

---

## 4. State Machine

### 4.1 WorkHeader State Machine

| From | To | Trigger | Business Logic | Validation |
|------|----|---------|---------------|------------|
| (new) | OPEN | System auto-create | Tạo khi source document đạt trigger state. assigned_to = NULL | Source document phải ở đúng state |
| OPEN | IN_PROGRESS | Mobile: Claim + Start | Nhân viên bấm Claim -> assigned_to = user_id. Bấm Start -> started_at = NOW() | 1 work chỉ được 1 người claim. Nhân viên phải thuộc warehouse |
| IN_PROGRESS | COMPLETED | All WorkLines done | completed_at = NOW(). Update source document state | ALL WorkLines phải status = COMPLETED hoặc SKIPPED |
| OPEN | CANCELLED | Manual cancel | Chỉ cancel khi chưa ai claim | assigned_to phải = NULL. Reason_code bắt buộc |
| IN_PROGRESS | CANCELLED | Manager override | Giải phóng allocation nếu có. Reverse InventTrans đã post | Chỉ WH_MANAGER role. Reason_code bắt buộc |

**SLA Tracking:** completed_at - created_at = total work duration. completed_at - started_at = execution time. assigned_at - created_at = wait time (cho biết work chờ bao lâu trước khi được claim).

### 4.2 WorkLine State Machine

| From | To | Trigger | Logic | InventTrans |
|------|----|---------|-------|-------------|
| (new) | OPEN | WorkHeader created | Tất cả lines tạo cùng lúc với header | Chưa tạo |
| OPEN | IN_PROGRESS | Worker scan start | Nhân viên đến location, bắt đầu thao tác | Chưa tạo |
| IN_PROGRESS | COMPLETED | Worker confirm | Scan location + nhập actual_qty + confirm | **TẠO 1 InventTrans (CRITICAL)** |
| OPEN | SKIPPED | System/Manager | Skip nếu không cần thực hiện (edge case) | Không tạo |
| OPEN | CANCELLED | Parent cancelled | Cascade từ WorkHeader cancel | Không tạo (hoặc reverse nếu đã post) |

> **CRITICAL RULE:** 1 WorkLine COMPLETED = 1 InventTrans. Đây là quy tắc bất di bất dịch. invent_trans_id trên WorkLine được populate SAU KHI step complete. Trước đó = NULL.

---

## 5. Work Generation Rules

### 5.1 Putaway Work Generation (từ Inbound Receipt)

**Trigger:** Receipt state chuyển sang RECEIVED (variance <= tolerance).

| Step | Action | Detail |
|------|--------|--------|
| 1 | Receipt -> RECEIVED | InventTrans INBOUND RECEIPT đã post (Physical). Hàng ở RECEIVING location |
| 2 | System tạo WorkHeader | `work_type=PUTAWAY, source_type=ASN, source_id=receipt_id, status=OPEN, priority=50` |
| 3 | System tạo WorkLine 1 | `step_type=RECEIVE, from_location=NULL, to_location=RECEIVING_LOC, expected_qty=net_weight_kg` |
| 4 | System tạo WorkLine 2 | `step_type=PUT, from_location=RECEIVING_LOC, to_location=NULL (TBD by worker), expected_qty=net_weight_kg` |
| 5 | Mobile hiển thị | Work xuất hiện trong danh sách OPEN cho nhân viên claim |

**[TVL CONFIRMED] Auto-transition:** Nếu WH Keeper scan location có type=STORAGE, hệ thống auto-transition Receipt từ RECEIVED -> PUTAWAY. Keeper không cần thao tác thêm cho bulk cargo.

### 5.2 Pick Work Generation (từ Outbound Shipment)

**Trigger:** Shipment state chuyển từ ALLOCATED -> PICKING.

| Step | Action | Detail |
|------|--------|--------|
| 1 | Shipment -> ALLOCATED | FIFO allocation hoàn tất. Allocation records đã tạo per location+lot+qty |
| 2 | User trigger Pick | WH Admin bấm Start Pick trên Web. Shipment -> PICKING |
| 3 | System tạo WorkHeader per shipment_line | `work_type=PICK, source_type=SHIPMENT, source_id=shipment_id, source_line_id=line_id` |
| 4 | Per allocation record | `WorkLine 1: step_type=PICK, from_location=alloc.location_id, expected_qty=alloc.qty_kg` |
| 5 | Per allocation record | `WorkLine 2: step_type=STAGE, to_location=STAGING_OUTBOUND, expected_qty=alloc.qty_kg` |
| 6 | Mobile hiển thị | Work sorted by priority. Nhân viên self-claim và thực hiện |

### 5.3 Move Work Generation (Manual)

**Trigger:** User tạo manual move request trên Web hoặc Mobile.

- User chọn: source_location + item + qty + destination_location.
- System validate: OnHand available tại source >= qty.
- System tạo WorkHeader (work_type=MOVE, source_type=MANUAL) + 2 WorkLines (MOVE_FROM + MOVE_TO).

---

## 6. Mobile App Task Flow

### 6.1 Work List Screen

Nhân viên mở mobile app, thấy danh sách Work có thể claim.

| Feature | Detail |
|---------|--------|
| Filter mặc định | warehouse = user.default_warehouse, status = OPEN, assigned_to = NULL |
| Tab filtering | Tất cả \| PICK \| PUTAWAY \| MOVE (grouped by work_type) |
| Sort order | priority ASC (cao nhất trước), created_at ASC (cũ nhất trước) |
| Hiển thị per card | work_id, work_type, source_id, item_id, zone, priority, created_at |
| Action | Bấm Claim -> assigned_to = user_id. Bấm Start -> status = IN_PROGRESS |
| My Work tab | Filter: assigned_to = current_user. Hiển thị work đang làm dở |

### 6.2 Putaway Execution Flow

**Actor:** WH Keeper (nhân viên kho) trên Mobile App

1. WH Keeper mở app -> tab PUTAWAY -> thấy Work OPEN -> bấm Claim + Start.
2. App hiển thị: Item name, Expected Qty, RECEIVING location (from_location).
3. WH Keeper đến RECEIVING area, xác nhận hàng (scan/visual).
4. App yêu cầu: Scan QR code destination location (STORAGE location).
5. WH Keeper scan QR -> app validate: location exists, location type = STORAGE, capacity OK.
6. WH Keeper nhập actual_qty (có thể khác expected_qty cho bulk cargo).
7. Bấm Confirm -> WorkLine 1 (RECEIVE) = COMPLETED -> WorkLine 2 (PUT) = COMPLETED.
8. System auto: tạo InventTrans MOVE (RECEIVING -> STORAGE). OnHand update.
9. [TVL CONFIRMED] Auto-transition: Receipt -> PUTAWAY nếu location type = STORAGE.

### 6.3 Pick Execution Flow

**Actor:** WH Keeper trên Mobile App

1. WH Keeper mở app -> tab PICK -> thấy Work OPEN -> bấm Claim + Start.
2. App hiển thị: Location (from) -> Product -> Qty cần pick. Grouped by location để tối ưu đường đi.
3. WH Keeper đến location -> scan QR code location -> app validate location match.
4. Xác nhận product + qty (nhập actual_qty). Cho phép nhập ít hơn (short pick), KHÔNG cho nhập nhiều hơn.
5. Click Confirm -> WorkLine(PICK).status = COMPLETED -> tạo InventTrans.
6. Đưa hàng đến staging -> scan staging QR -> WorkLine(STAGE).status = COMPLETED.
7. WorkHeader.status = COMPLETED -> allocation_record.status = PICKED.
8. shipment_line.line_status = PICKED. Khi tất cả lines PICKED -> Shipment -> PICKED.

### 6.4 Move Execution Flow

**Actor:** WH Keeper trên Mobile App

1. WH Keeper chọn Move Inventory từ menu.
2. Scan source location QR -> app hiển thị hàng tồn tại location đó.
3. Chọn item + nhập qty cần move.
4. Scan destination location QR -> app validate location OK.
5. Confirm -> System tạo WorkHeader + 2 WorkLines (MOVE_FROM + MOVE_TO) -> auto-complete.
6. InventTrans MOVE: -qty tại source dim, +qty tại dest dim.

---

## 7. InventTrans Integration

Đây là phần quan trọng nhất. Mỗi WorkLine complete PHẢI tạo 1 InventTrans. Bảng dưới map chi tiết từng step_type sang InventTrans event.

### 7.1 WorkLine -> InventTrans Mapping

| Work Type | Step Type | InventTrans RefType | Qty Sign | DimFrom | DimTo | OnHand Impact |
|-----------|-----------|---------------------|----------|---------|-------|---------------|
| PUTAWAY | RECEIVE | ASN | +actual_qty | NULL (bên ngoài) | InventDim{loc=RECEIVING} | +physical, +available tại RECEIVING |
| PUTAWAY | PUT | MOVE | actual_qty | InventDim{loc=RECEIVING} | InventDim{loc=STORAGE} | -physical@RECEIVING, +physical@STORAGE |
| PICK | PICK | SHIPMENT | -actual_qty | InventDim{loc=STORAGE} | InventDim{loc=STAGING_OUT} | -physical@STORAGE, +physical@STAGING |
| PICK | STAGE | SHIPMENT | (status update) | N/A | N/A | Status: RESERVED -> PICKED |
| MOVE | MOVE_FROM | MOVE | -actual_qty | InventDim{loc=source} | NULL | -physical, -available tại source |
| MOVE | MOVE_TO | MOVE | +actual_qty | NULL | InventDim{loc=dest} | +physical, +available tại dest |

### 7.2 Posting Rules [TVL CONFIRMED]

- **Inbound posting point** = RECEIVED state. WorkLine RECEIVE complete -> post InventTrans tại RECEIVED.
- **Outbound posting point** = SHIPPED state. WorkLine PICK/STAGE giảm tồn tại STORAGE nhưng InventTrans ISSUE chính thức post tại SHIPPED (sau weighbridge).
- **PUTAWAY** tạo InventTrans MOVE (RECEIVING -> STORAGE). Đây là bước tách riêng [TC-14 CONFIRMED].
- **Reversal:** KHÔNG BAO GIỜ xóa InventTrans. Cancel = tạo trans mới qty ngược, set is_reversed=true.

### 7.3 Idempotency

Mỗi API call tạo InventTrans PHẢI kèm external_id. Nếu external_id trùng, hệ thống return trans_id cũ thay vì tạo mới. Pattern cho WorkLine:

`external_id = {work_id}_{line_num}_{step_type}`. VD: `WRK-20260315-001_1_RECEIVE`

---

## 8. Variance & Exception Handling

### 8.1 Short Pick

Khi thực tế pick được ít hơn allocated. Đây là scenario phổ biến nhất với bulk cargo.

**Ví dụ:** Allocated 300kg tại A-01, nhưng WH Keeper chỉ pick được 295kg.

| Step | Action | System Response |
|------|--------|-----------------|
| 1 | WH Keeper nhập actual_qty = 295 | Validate: actual_qty <= expected_qty (KHÔNG cho nhập nhiều hơn) |
| 2 | System tính variance | variance = 300 - 295 = 5kg |
| 3 | Complete work line | WorkLine status = COMPLETED, actual_qty = 295 |
| 4 | Tạo InventTrans | InventTrans qty = -295 (thay vì -300) |
| 5 | Tạo variance record | reason = SHORT_PICK, qty = 5kg |
| 6 | OnHand update | reserved_qty giảm 5, physical_qty giảm 5 (auto-adjust) HOẶC flag cho manager review |
| 7 | Shipment update | shipment_line.actual_qty -= 5. Total shipped sẽ thiếu 5kg |

### 8.2 Location Mismatch

WH Keeper scan location QR nhưng không match với expected location trên WorkLine.

- App hiển thị warning: "Location không khớp. Bạn đang ở {scanned}, hệ thống yêu cầu {expected}."
- **Option A:** Quay về đúng location (recommended).
- **Option B:** WH Manager override (cần quyền WH_MANAGER). Ghi log override reason.

### 8.3 Item Not Found at Location

WH Keeper đến location nhưng không tìm thấy hàng (hoặc item khác).

- Cho phép report: NOT_FOUND reason.
- WorkLine status = SKIPPED (không phải COMPLETED).
- System flag cho cycle count tại location đó.
- Allocation record status = FAILED. System có thể auto-reallocate từ location khác.

### 8.4 Offline Handling

**[TVL CONFIRMED]** Mobile app hỗ trợ offline queue cho putaway/pick. Thao tác được queue locally. Khi online -> sync lên server. Server validate idempotency via external_id. Cần internet cho các thao tác khác (allocation, weighbridge).

---

## 9. Business Rules

| Rule ID | Context | Condition (IF) | Action (THEN) | Example |
|---------|---------|----------------|---------------|---------|
| BR-WE-001 | Work Creation | Source document đạt trigger state | System auto-create WorkHeader + WorkLines theo template | Receipt -> RECEIVED -> tạo PUTAWAY work |
| BR-WE-002 | Self-Claim | Nhân viên bấm Claim trên mobile | assigned_to = user_id, assigned_at = NOW(). 1 work chỉ 1 người claim | WRK-001 chưa có assigned_to -> Keeper bấm Claim -> assigned |
| BR-WE-003 | Work Completion | ALL WorkLines = COMPLETED hoặc SKIPPED | WorkHeader.status = COMPLETED. Update source document state | 2/2 lines done -> Work COMPLETED -> Receipt -> PUTAWAY |
| BR-WE-004 | WorkLine -> InventTrans | WorkLine status -> COMPLETED | Tạo 1 InventTrans. invent_trans_id populate trên WorkLine | PICK line done -> InventTrans ISSUE -295kg |
| BR-WE-005 | Short Pick | actual_qty < expected_qty | Tạo variance record (SHORT_PICK). OnHand adjust. Flag manager nếu > threshold | Expected 300, actual 295 -> variance 5kg |
| BR-WE-006 | Cancel Rule | Cancel Work | OPEN: cancel trực tiếp. IN_PROGRESS: chỉ WH_MANAGER. Reverse InventTrans đã post | IN_PROGRESS work cancel -> reverse 2 InventTrans |
| BR-WE-007 | Priority | Work tạo mới | Priority theo template: Urgent pick=10, Normal pick=30, Putaway=50, Move=60 | Urgent shipment -> pick work priority=10 |
| BR-WE-008 | Scan Validation | Worker scan QR code | Validate: location exists, type phù hợp, thuộc đúng warehouse, capacity check | Scan A-01 -> OK. Scan invalid -> reject |
| BR-WE-009 | Variance Tolerance | actual_qty != expected_qty | Nếu \|variance\| <= 2% -> auto-accept. > 2% -> flag manager. > 5% -> block | 295/300 = 1.7% -> auto-accept |
| BR-WE-010 | Reversal | Cancel work đã có InventTrans | Tạo InventTrans mới với qty ngược. is_reversed=true. KHÔNG xóa trans cũ | Reverse: +295kg tại location (ngược lại -295kg) |

---

## 10. API Endpoints (Proposed)

### 10.1 Work Management APIs

| Method | Endpoint | Description | Auth Role |
|--------|----------|-------------|-----------|
| GET | /api/v1/works | List works (filter: warehouse, status, type, assigned_to) | WH_KEEPER, WH_MANAGER |
| GET | /api/v1/works/{work_id} | Get work detail + lines | WH_KEEPER, WH_MANAGER |
| POST | /api/v1/works/{work_id}/claim | Self-claim work (set assigned_to = current user) | WH_KEEPER |
| POST | /api/v1/works/{work_id}/start | Start work execution (set started_at) | WH_KEEPER |
| POST | /api/v1/works/{work_id}/cancel | Cancel work (body: reason_code) | WH_MANAGER |

### 10.2 WorkLine Execution APIs

| Method | Endpoint | Description | Auth Role |
|--------|----------|-------------|-----------|
| POST | /api/v1/works/{work_id}/lines/{line_num}/start | Start step execution | WH_KEEPER |
| POST | /api/v1/works/{work_id}/lines/{line_num}/complete | Complete step (body: actual_qty, scanned_location) | WH_KEEPER |
| POST | /api/v1/works/{work_id}/lines/{line_num}/skip | Skip step (body: reason_code) | WH_MANAGER |
| GET | /api/v1/works/{work_id}/lines | List all lines for a work | WH_KEEPER, WH_MANAGER |

### 10.3 Mobile-specific APIs

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | /api/v1/mobile/works/available | List claimable works cho current user | Filter: warehouse=user.wh, status=OPEN, assigned_to=NULL |
| GET | /api/v1/mobile/works/my | List works assigned to current user | Filter: assigned_to=me, status=IN_PROGRESS |
| POST | /api/v1/mobile/scan/validate | Validate scanned QR code | Body: location_code, expected_location (optional) |
| POST | /api/v1/mobile/works/sync | Batch sync offline operations | Body: array of operations. Idempotent via external_id |

---

## 11. End-to-End Examples

### 11.1 Putaway E2E: 30,000 kg CaCO3 Bulk

| Step | Actor | Action | System Response | InventTrans / OnHand |
|------|-------|--------|-----------------|---------------------|
| 1 | Weighbridge | Xe cân xong, receipt RECEIVED | InventTrans INBOUND +30,300kg. OnHand: physical=30,300 @ RECEIVING | TRX-001: +30,300 @ WH01-RECV |
| 2 | System | Auto-create Putaway Work | WRK-001: PUTAWAY, OPEN, priority=50 | N/A |
| 3 | WH Keeper | Mở app, Claim + Start WRK-001 | WRK-001: IN_PROGRESS, assigned=KEEPER01 | N/A |
| 4 | WH Keeper | Xác nhận hàng tại RECEIVING. Scan QR location B-03 (STORAGE) | Validate: B-03 exists, type=STORAGE, capacity OK | N/A |
| 5 | WH Keeper | Nhập actual_qty = 30,300. Confirm | WorkLine1 COMPLETED. WorkLine2 COMPLETED. Work COMPLETED | TRX-002: MOVE -30,300@RECV +30,300@B-03 |
| 6 | System | Auto-transition Receipt | Receipt -> PUTAWAY (vì location type=STORAGE) | OnHand: B-03 physical=30,300, available=30,300 |

### 11.2 Pick E2E: 3 Lines Outbound Shipment

| Step | Actor | Action | System Response | InventTrans / OnHand |
|------|-------|--------|-----------------|---------------------|
| 1 | WH Admin | Shipment SHP-001 allocated (FIFO) | 3 allocation records tạo cho 3 locations | OnHand: available giảm, reserved tăng |
| 2 | WH Admin | Click Start Pick | Shipment -> PICKING. 3 Pick Works tạo (1 per line) | N/A |
| 3 | WH Keeper | Claim WRK-002 (Line 1: CaCO3 @ B-03) | WRK-002: IN_PROGRESS | N/A |
| 4 | WH Keeper | Scan B-03 -> confirm CaCO3 30,000kg | WorkLine PICK COMPLETED. WorkLine STAGE COMPLETED | MOVE: -30,000@B-03, +30,000@STAGING |
| 5 | WH Keeper | Claim + complete WRK-003, WRK-004 | All 3 works COMPLETED | Similar InventTrans for each line |
| 6 | System | All lines PICKED | Shipment -> PICKED. Chờ weighbridge | OnHand: STAGING có tổng hàng. STORAGE đã giảm |

---

## 12. RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | Notes |
|--------|-----------|------------|----------|-------|
| View Work List | Yes (own warehouse) | Yes (all warehouses) | Yes | |
| Claim Work | Yes | Yes | No | Admin không thao tác kho |
| Start / Complete WorkLine | Yes (assigned work) | Yes | No | |
| Cancel Work (OPEN) | No | Yes | Yes | |
| Cancel Work (IN_PROGRESS) | No | Yes | No | Cần reason_code |
| Override Location Mismatch | No | Yes | No | Log override reason |
| Skip WorkLine | No | Yes | No | |
| Create Manual Move | Yes | Yes | No | |
| View Work Reports | No | Yes | Yes | SLA, productivity |

---

## 13. Assumptions & To-Confirm

### 13.1 Assumptions

| # | Assumption | Impact | Status |
|---|-----------|--------|--------|
| A-WE-01 | Phase 1 chỉ có 3 Work Types: PUTAWAY, PICK, MOVE. REPLENISH, CYCLE_COUNT, LOAD cho Phase 2 | Giới hạn scope, đơn giản hóa mobile app | Assumed |
| A-WE-02 | 1 Putaway Work = 1 Receipt. Không batch nhiều receipts vào 1 work | Đơn giản hóa tracing | Assumed |
| A-WE-03 | 1 Pick Work per shipment_line (không merge nhiều lines) | Tối ưu parallel pick, nhưng nhiều work hơn | Assumed |
| A-WE-04 | Move work auto-complete (không cần 2 phase claim+execute) | UX đơn giản cho move | Assumed |
| A-WE-05 | Short Pick tolerance: 2% auto-accept, 2-5% flag, >5% block | Cần confirm với TVL | Assumed |
| A-WE-06 | Putaway Work tạo SAU khi InventTrans INBOUND post (tại RECEIVED state) | RECEIVED = đã có physical OnHand -> an toàn tạo Work | Assumed |

### 13.2 To-Confirm

| # | Question | Options | Priority | Impact |
|---|---------|---------|----------|--------|
| Q-WE-01 | Short Pick threshold cụ thể? 2%/5% hay khác? | A: 2%/5% B: Configurable per owner C: Fixed system-wide | HIGH | Ảnh hưởng blocking rule |
| Q-WE-02 | Có cần Wave processing cho Phase 1? | A: Không (đề xuất) B: Có (batch pick) | MEDIUM | Nếu có -> thêm Wave entity |
| Q-WE-03 | Move work: cần approval trước khi execute? | A: Không (auto) B: WH_MANAGER approve | MEDIUM | UX complexity |
| Q-WE-04 | Mobile app offline duration tối đa? | A: 30 phút B: 1 giờ C: Không giới hạn | LOW | Queue size, conflict resolution |
| Q-WE-05 | Putaway: cho phép split 1 receipt vào nhiều locations? | A: Không (1 receipt -> 1 location) B: Có (tạo nhiều WorkLines PUT) | HIGH | Data model complexity |
| Q-WE-06 | Work priority: fixed template hay configurable per warehouse? | A: Fixed template B: Configurable per warehouse | LOW | Config complexity |

---

## 14. Document References

| Document | Version | Relevance |
|----------|---------|-----------|
| TVL_SWM_Gap_Analysis_Restructuring_Plan | v3.0 | Xác định Work Execution Layer gap (B3). Source of requirement |
| TVL_SWM_State_Machine_Inbound_Outbound | v3.1 | State machine + InventTrans mapping. Work generation triggers |
| TVL_SWM_MasterData_Module_PRD_Supplement | v2.1 TVL Confirmed | work_header + work_line schema. Design rules confirmed |
| TVL_SWM_Reservation_Allocation_Spec | v1.0 | FIFO allocation -> Work generation. Short pick handling |
| THORESEN_SWM_PRD_VIBECODING | v1.0 | System architecture, mobile screens, movement types |
| TVL_SWM_Business_Rules_Document | v1.0 | BR-WE rules, BR-INV rules referenced in this spec |

---

*END OF DOCUMENT — Version 1.0*
