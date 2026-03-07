# TVL SWM — Reservation & Allocation Specification

**THORESEN VINAMA LOGISTICS — Smart Warehouse Management (SWM)**

| Field | Value |
|-------|-------|
| Document ID | TVL-SWM-SPEC-B4 |
| Version | 1.0 |
| Date | March 2026 |
| Status | Draft for Review |
| Priority | HIGH |
| Author | Smartlog Solution Team |
| Related Docs | TVL_SWM_State_Machine_Inbound_Outbound_v3.1, TVL_SWM_Business_Rules_Document, TVL_SWM_MasterData_Module_PRD_Supplement_v2.1, TVL_SWM_InventoryTransaction_Spec |

---

## 1. MỤC ĐÍCH & PHẠM VI

### 1.1 Mục đích

Tài liệu này định nghĩa chi tiết logic **Reservation** (giữ hàng) và **Allocation** (phân bổ tồn kho) cho hệ thống SWM của Thoresen Vinama Logistics. Đây là module kết nối giữa Document Layer (Sale Order / Shipment) và Inventory Transaction Layer (InventTrans / OnHand), đảm bảo hàng được giữ đúng, phân bổ đúng, và không xảy ra over-commit khi nhiều shipment cùng tranh chấp tồn kho.

### 1.2 Phạm vi

| In-Scope | Out-of-Scope |
|----------|--------------|
| Outbound allocation (SO → Shipment → Pick) | Inbound reservation (PO expected qty → Phase 2) |
| FIFO allocation algorithm | FEFO algorithm (Phase 2 khi bật Batch/Lot) |
| Manual allocation | Cross-dock allocation |
| Unallocation (reverse) | Transfer reservation |
| Concurrent conflict resolution | Inter-warehouse allocation |
| OnHand impact mapping | Billing integration (xem Business Rules doc) |

### 1.3 Quyết định đã chốt với TVL (Confirmed)

| # | Quyết định | Chi tiết |
|---|-----------|----------|
| Q5 | TVL KHÔNG dùng reservation truyền thống | Hàng allocate trực tiếp khi tạo Shipment, không soft/hard reserve tại thời điểm confirm SO. |
| Q2 | OnHand Dimensions Phase 1 | Item + Warehouse + Location + Owner + Status |
| Q4 | InventTrans posting point | Outbound = SHIPPED state |
| Q1 | InventTrans granularity | Per shipment_line |
| Q6 | Work model | Phase 1 cần WorkHeader/WorkLine đầy đủ |

**Ghi chú quan trọng:** Mặc dù TVL xác nhận "không dùng reservation", trên thực tế hệ thống vẫn cần cơ chế **giữ hàng (hold qty)** tại thời điểm allocate để tránh over-commit. Tài liệu này gọi cơ chế đó là **Allocation-based Reservation** — khác với Soft/Hard Reservation truyền thống của D365.

---

## 2. KHÁI NIỆM & THUẬT NGỮ

### 2.1 Phân biệt Reservation vs Allocation trong ngữ cảnh TVL

| Khái niệm | D365 Traditional | TVL SWM Phase 1 |
|-----------|-----------------|-----------------|
| **Soft Reservation** | Giữ qty tại thời điểm confirm SO, chưa chỉ định location cụ thể. Giảm available nhưng không lock location. | KHÔNG DÙNG. TVL không reserve khi confirm SO. |
| **Hard Reservation** | Giữ qty tại location + lot cụ thể. Lock hoàn toàn cho shipment. | KHÔNG DÙNG theo nghĩa truyền thống. |
| **Allocation** | Phân bổ qty từ location cụ thể cho shipment line. Tạo work (pick task). | CÓ DÙNG. Đây là cơ chế chính. Allocate = chỉ định location + qty + lot cho shipment line. |
| **Allocation-based Hold** | N/A | Khi allocate, `reserved_qty` trên OnHand tăng, `available_qty` giảm. Hiệu quả giống Hard Reservation nhưng chỉ xảy ra tại bước Allocate, không phải khi confirm SO. |

### 2.2 Định nghĩa các trường qty trên OnHand

Trích từ MasterData PRD Supplement v2.1 [TVL Confirmed]:

| Field | Công thức | Mô tả |
|-------|----------|-------|
| `physical_qty` | SUM(InventTrans.qty WHERE stage=PHYSICAL) | Số lượng vật lý hiện có tại vị trí (kg) |
| `available_qty` | physical_qty - reserved_qty | Số lượng khả dụng để allocate (kg). QC_HOLD đã bỏ Phase 1. |
| `reserved_qty` | SUM(allocation.qty WHERE status=ACTIVE) | Số lượng đã giữ cho SO/Shipment (kg). Tăng khi allocate, giảm khi pick hoặc un-allocate. |
| `picked_qty` | Qty đã pick chưa ship | Hàng ở staging outbound. Tăng khi pick complete, giảm khi ship confirm. |
| `ordered_qty` | Expected inbound chưa received | Tăng khi confirm PO, giảm khi register receipt. |

**Quy tắc vàng:** `available_qty = physical_qty - reserved_qty` (Phase 1, qc_hold_qty luôn = 0).

---

## 3. ALLOCATION ALGORITHM

### 3.1 Tổng quan luồng Allocation

```
Shipment (CONFIRMED) 
  → User chọn "Auto-Allocate" hoặc "Manual Allocate"
    → System tìm OnHand records có available_qty > 0
      → Phân bổ theo FIFO (lot_date ASC)
        → Tạo allocation records
          → Cập nhật OnHand (reserved_qty ↑, available_qty ↓)
            → Shipment → ALLOCATED
```

### 3.2 FIFO Allocation Algorithm (Auto-Allocate)

**Rule ID:** BR-OUT-002

**Input:**
- `shipment_line.expected_qty_kg` — Số lượng cần xuất cho dòng hàng
- `shipment_line.product_id` — Mã sản phẩm
- `shipment_order.owner_id` — Chủ hàng
- `shipment_order.warehouse_id` — Kho xuất

**Algorithm (Pseudocode):**

```
FUNCTION auto_allocate(shipment_line):
    remaining_qty = shipment_line.expected_qty_kg
    
    -- Bước 1: Lấy danh sách OnHand khả dụng
    candidates = SELECT on_hand.*
        FROM on_hand
        JOIN invent_dim ON on_hand.invent_dim_id = invent_dim.id
        WHERE invent_dim.item_id = shipment_line.product_id
          AND invent_dim.warehouse_id = shipment_order.warehouse_id
          AND invent_dim.owner_id = shipment_order.owner_id
          AND invent_dim.status = 'AVAILABLE'
          AND on_hand.available_qty > 0
        ORDER BY invent_dim.lot_date ASC,     -- FIFO: ngày nhập sớm nhất trước
                 invent_dim.location_id ASC    -- Tie-break: location order
    
    -- Bước 2: Phân bổ tuần tự
    allocations = []
    FOR EACH candidate IN candidates:
        IF remaining_qty <= 0: BREAK
        
        alloc_qty = MIN(remaining_qty, candidate.available_qty)
        
        allocations.APPEND({
            shipment_line_id: shipment_line.id,
            on_hand_id: candidate.id,
            invent_dim_id: candidate.invent_dim_id,
            location_id: candidate.location_id,  -- từ invent_dim
            qty_kg: alloc_qty,
            status: 'ACTIVE',
            allocated_at: NOW(),
            allocated_by: current_user
        })
        
        remaining_qty -= alloc_qty
    
    -- Bước 3: Kiểm tra đủ hàng
    IF remaining_qty > 0:
        ROLLBACK  -- Không commit allocation nào cả
        RETURN ERROR("Insufficient inventory. Short: {remaining_qty} kg")
    
    -- Bước 4: Commit atomic
    BEGIN TRANSACTION
        INSERT allocations INTO allocation_record
        FOR EACH alloc IN allocations:
            UPDATE on_hand 
                SET reserved_qty = reserved_qty + alloc.qty_kg,
                    available_qty = available_qty - alloc.qty_kg
                WHERE id = alloc.on_hand_id
        UPDATE shipment_line 
            SET allocated_qty_kg = expected_qty_kg,
                line_status = 'ALLOCATED'
    COMMIT
    
    RETURN SUCCESS(allocations)
```

### 3.3 Manual Allocation

**Khi nào dùng:** User muốn chọn cụ thể location + lot + qty thay vì để system tự chọn FIFO.

**Luồng:**

1. User mở Shipment (CONFIRMED) → chọn shipment line → click "Manual Allocate"
2. System hiển thị danh sách OnHand khả dụng (cùng filter như Auto nhưng không tự chọn)
3. User chọn 1 hoặc nhiều dòng OnHand, nhập qty cho từng dòng
4. System validate:
   - `SUM(user_input.qty) = shipment_line.expected_qty_kg` (phải đủ, không thừa)
   - Mỗi dòng: `user_input.qty <= on_hand.available_qty` (không vượt available)
5. Nếu PASS → tạo allocation records + update OnHand (giống auto)
6. Nếu FAIL → hiển thị lỗi cụ thể (dòng nào vượt, thiếu bao nhiêu)

**Lưu ý:** Manual allocate vẫn phải tuân thủ tất cả business rules (blocking, available check). Khác biệt duy nhất là user chọn location thay vì FIFO tự chọn.

### 3.4 Partial Allocation

**TVL Phase 1: KHÔNG hỗ trợ partial allocation.**

Lý do: TVL xác nhận 1 shipment = 1 xe = 1 trip. Nếu không đủ hàng, shipment không thể xuất. Cho phép partial sẽ gây phức tạp trong reconciliation và billing.

**Rule:** Nếu `SUM(available) < expected_qty`, toàn bộ allocation FAIL. Không tạo allocation record nào.

**Phase 2 consideration:** Nếu TVL cần partial (ví dụ: xuất trước phần có, bổ sung sau), sẽ cần bổ sung trạng thái PARTIALLY_ALLOCATED và logic merge allocation.

---

## 4. ALLOCATION RECORD SCHEMA

### 4.1 Table: allocation_record

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK | Khóa chính |
| allocation_id | VARCHAR(30) | UNIQUE, NOT NULL | ALC-{YYYYMMDD}-{SEQ} |
| shipment_order_id | VARCHAR(30) | FK → shipment_order, NOT NULL | Mã shipment |
| shipment_line_id | VARCHAR(30) | FK → shipment_line, NOT NULL | Mã dòng shipment |
| on_hand_id | UUID | FK → on_hand, NOT NULL | Dòng OnHand được allocate |
| invent_dim_id | UUID | FK → invent_dim, NOT NULL | Dimension (item+wh+loc+owner+status) |
| item_id | VARCHAR(50) | FK → item, NOT NULL | Mã SKU (denormalize cho query) |
| warehouse_id | VARCHAR(20) | FK → warehouse, NOT NULL | Kho (denormalize) |
| location_id | VARCHAR(20) | FK → location, NOT NULL | Vị trí (denormalize) |
| owner_id | VARCHAR(20) | FK → owner, NOT NULL | Chủ hàng (denormalize) |
| qty_kg | DECIMAL(15,3) | NOT NULL, > 0 | Số lượng allocate (kg) |
| status | ENUM | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, PICKED, SHIPPED, CANCELLED |
| allocated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Thời điểm allocate |
| allocated_by | VARCHAR(50) | NOT NULL | User thực hiện |
| allocation_method | ENUM | NOT NULL | AUTO_FIFO, MANUAL |
| picked_at | TIMESTAMPTZ | NULLABLE | Thời điểm pick complete |
| picked_by | VARCHAR(50) | NULLABLE | User pick |
| shipped_at | TIMESTAMPTZ | NULLABLE | Thời điểm ship confirm |
| cancelled_at | TIMESTAMPTZ | NULLABLE | Thời điểm cancel/unallocate |
| cancelled_by | VARCHAR(50) | NULLABLE | User cancel |
| cancel_reason | VARCHAR(200) | NULLABLE | Lý do cancel |

### 4.2 Allocation Status Lifecycle

```
ACTIVE → PICKED → SHIPPED
   ↓
CANCELLED
```

| Status | Ý nghĩa | Trigger |
|--------|---------|---------|
| ACTIVE | Đã allocate, chờ pick | Allocate thành công |
| PICKED | Hàng đã pick xong, chờ ship | Pick task completed |
| SHIPPED | Đã xuất kho, InventTrans posted | Ship confirm (SHIPPED state) |
| CANCELLED | Đã hủy/unallocate | Unallocate hoặc cancel shipment |

### 4.3 Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| idx_alloc_shipment | (shipment_order_id, shipment_line_id) | Lookup allocation by shipment |
| idx_alloc_onhand | (on_hand_id, status) | Check allocation cho 1 OnHand record |
| idx_alloc_location | (warehouse_id, location_id, status) | Query allocation theo location |
| idx_alloc_item_owner | (item_id, owner_id, status) | Query allocation theo SKU+owner |

---

## 5. UNALLOCATION (REVERSE ALLOCATION)

### 5.1 Khi nào Unallocate

| Trigger | Từ trạng thái | Kết quả |
|---------|--------------|---------|
| User click "Unallocate" trên Shipment | ALLOCATED | Shipment → CONFIRMED |
| User cancel Shipment (có allocation) | ALLOCATED, PICKING | Allocation → CANCELLED, Shipment → CANCELLED |
| System auto-unallocate khi split shipment | ALLOCATED | Unallocate portion → re-allocate cho shipment mới |

### 5.2 Unallocation Logic

```
FUNCTION unallocate(shipment_order_id):
    
    -- Validate: chỉ unallocate khi chưa bắt đầu pick
    IF shipment.status IN ('PICKING', 'PICKED', 'SHIPPED', 'CLOSED'):
        RETURN ERROR("Cannot unallocate: shipment already in picking/shipping")
    
    -- Ngoại lệ: nếu PICKING nhưng chưa có pick task nào COMPLETED
    IF shipment.status = 'PICKING':
        IF EXISTS(pick_task WHERE shipment_id AND status = 'COMPLETED'):
            RETURN ERROR("Cannot unallocate: some items already picked")
    
    BEGIN TRANSACTION
        -- Lấy tất cả allocation ACTIVE
        active_allocs = SELECT * FROM allocation_record
            WHERE shipment_order_id = shipment_order_id
              AND status = 'ACTIVE'
        
        FOR EACH alloc IN active_allocs:
            -- Hoàn trả OnHand
            UPDATE on_hand
                SET reserved_qty = reserved_qty - alloc.qty_kg,
                    available_qty = available_qty + alloc.qty_kg
                WHERE id = alloc.on_hand_id
            
            -- Mark allocation cancelled
            UPDATE allocation_record
                SET status = 'CANCELLED',
                    cancelled_at = NOW(),
                    cancelled_by = current_user,
                    cancel_reason = 'UNALLOCATE'
                WHERE id = alloc.id
        
        -- Reset shipment
        UPDATE shipment_line 
            SET allocated_qty_kg = 0, line_status = 'PENDING'
            WHERE shipment_order_id = shipment_order_id
        UPDATE shipment_order 
            SET status = 'CONFIRMED'
            WHERE id = shipment_order_id
        
        -- Cancel pick tasks nếu có
        UPDATE work_header
            SET status = 'CANCELLED'
            WHERE ref_id = shipment_order_id AND status IN ('OPEN', 'IN_PROGRESS')
    COMMIT
    
    -- Audit log
    INSERT audit_log(entity='SHIPMENT', entity_id=shipment_order_id, 
                     action='UNALLOCATE', user=current_user, 
                     detail='Released {SUM(qty)} kg back to available')
```

### 5.3 Unallocate khi Cancel Shipment giữa vòng lặp cân

Đây là case phức tạp nhất: Shipment đã ship 1-2 lines (SHIPPED) nhưng muốn cancel các lines còn lại.

**Rule:** KHÔNG thể unallocate dòng đã SHIPPED. Chỉ cancel dòng chưa ship:

1. Lines với `line_status = SHIPPED` → giữ nguyên, InventTrans đã post
2. Lines với `line_status IN (ALLOCATED, PICKING, PICKED, LOADING)` → unallocate, hoàn trả reserved_qty
3. Shipment status → không thể CANCELLED (vì có lines đã ship) → chuyển sang CLOSED với ghi chú partial

---

## 6. CONCURRENT ALLOCATION CONFLICT RESOLUTION

### 6.1 Vấn đề

Khi 2 user cùng lúc allocate cho 2 shipment khác nhau nhưng cùng tranh 1 OnHand record:

- User A: Shipment SHP-001, cần 300MT từ Location A-01 (available = 500MT)
- User B: Shipment SHP-002, cần 400MT từ Location A-01 (available = 500MT)
- Nếu cả 2 đọc available = 500MT cùng lúc → cả 2 nghĩ đủ hàng → over-commit 700MT

### 6.2 Giải pháp: Pessimistic Locking (Khuyến nghị cho TVL)

**Lý do chọn:** TVL là kho bulk cargo, số lượng transaction/phút không cao (ước tính < 10 concurrent allocations). Pessimistic lock đơn giản, dễ implement, dễ debug.

```
FUNCTION allocate_with_lock(shipment_line):
    BEGIN TRANSACTION
        -- Lock OnHand rows liên quan (SELECT FOR UPDATE)
        candidates = SELECT on_hand.*
            FROM on_hand
            JOIN invent_dim ON ...
            WHERE ... (cùng filter FIFO)
            ORDER BY lot_date ASC
            FOR UPDATE NOWAIT  -- Fail ngay nếu đang bị lock bởi user khác
        
        -- Nếu bị lock
        IF LOCK_FAILED:
            RETURN ERROR("Another allocation is in progress for these locations. Please retry.")
        
        -- Chạy FIFO allocation logic (Section 3.2)
        result = fifo_allocate(candidates, shipment_line.expected_qty_kg)
        
        IF result.success:
            COMMIT
        ELSE:
            ROLLBACK
    
    RETURN result
```

### 6.3 Option B: Optimistic Locking (Phase 2)

Nếu sau này TVL tăng volume và pessimistic lock gây bottleneck:

- Thêm `version` column vào on_hand
- Khi update: `WHERE id = ? AND version = ?`
- Nếu version mismatch → retry allocation (tối đa 3 lần)

### 6.4 So sánh

| Tiêu chí | Pessimistic (Khuyến nghị) | Optimistic (Phase 2) |
|----------|--------------------------|---------------------|
| Complexity | Thấp | Trung bình |
| Performance dưới low contention | Tốt | Tốt |
| Performance dưới high contention | Giảm (blocking) | Tốt (retry) |
| Data consistency | Guaranteed | Guaranteed (with retry) |
| Phù hợp TVL Phase 1 | ✅ Có | Chưa cần |

---

## 7. BLOCKING RULES INTEGRATION

Allocation phải kiểm tra blocking rules TRƯỚC KHI tạo allocation records.

### 7.1 Blocking Check tại Allocate (Hàng xá / Bulk)

**Rule ID:** BR-OUT-004

```
FUNCTION check_blocking_bulk(shipment_order):
    IF cargo_form = 'BULK':
        so = sale_order WHERE id = shipment_order.sale_order_id
        total_allocated = SUM(shipment.allocated_qty_kg 
                              WHERE sale_order_id = so.id 
                              AND status NOT IN ('CANCELLED'))
        
        IF total_allocated + current_shipment.expected_qty_kg > so.expected_qty_kg:
            BLOCK("Tổng allocate ({total_allocated} + {current}) vượt SO ({so.expected_qty_kg})")
```

### 7.2 Blocking Check tại Allocate (Hàng bao / Bagged)

Hàng bao KHÔNG check blocking tại allocate — chỉ check tại thời điểm cân (weighbridge). Lý do: tolerance dựa trên net_weight thực tế, chưa biết tại thời điểm allocate.

### 7.3 Kiểm tra trước Allocation — Checklist

| # | Check | Rule | Fail Action |
|---|-------|------|-------------|
| 1 | Shipment status = CONFIRMED | Chỉ allocate từ CONFIRMED | Reject |
| 2 | available_qty >= expected_qty (tổng) | BR-OUT-003 | FAIL, không partial |
| 3 | Blocking rule Bulk (nếu applicable) | BR-OUT-004 | BLOCK |
| 4 | Owner match | Hàng phải cùng owner_id | Reject |
| 5 | Warehouse match | Hàng phải cùng warehouse | Reject |
| 6 | Status = AVAILABLE | Không allocate hàng DAMAGED/BLOCKED/IN_TRANSIT | Skip record |

---

## 8. ONHAND IMPACT MAPPING

### 8.1 Bảng tác động OnHand theo State Transition (Outbound)

| State Transition | physical_qty | available_qty | reserved_qty | picked_qty | InventTrans |
|-----------------|-------------|---------------|-------------|-----------|-------------|
| CONFIRMED → ALLOCATED | Không đổi | -allocated_qty | +allocated_qty | Không đổi | Không post |
| ALLOCATED → PICKING | Không đổi | Không đổi | Không đổi | Không đổi | Không post |
| PICKING → PICKED | Không đổi | Không đổi | -picked_qty | +picked_qty | Không post |
| PICKED → SHIPPED | -shipped_qty | Không đổi (đã giảm khi allocate) | Không đổi (đã giảm khi pick) | -shipped_qty | ★ POST: ISSUE, stage=PHYSICAL |
| ALLOCATED → CONFIRMED (Unallocate) | Không đổi | +allocated_qty | -allocated_qty | Không đổi | Không post |

### 8.2 Ví dụ End-to-End

**Scenario:** Owner CUST001 có 500MT CaCO3 tại Location WH5.1-A-01 (AVAILABLE). Shipment SHP-001 cần xuất 300MT.

**Trạng thái ban đầu OnHand:**

| physical_qty | available_qty | reserved_qty | picked_qty |
|-------------|---------------|-------------|-----------|
| 500 | 500 | 0 | 0 |

**Sau Allocate (CONFIRMED → ALLOCATED):**

| physical_qty | available_qty | reserved_qty | picked_qty |
|-------------|---------------|-------------|-----------|
| 500 | 200 | 300 | 0 |

→ 1 allocation_record: ALC-001, qty=300, status=ACTIVE

**Sau Pick (PICKING → PICKED):**

| physical_qty | available_qty | reserved_qty | picked_qty |
|-------------|---------------|-------------|-----------|
| 500 | 200 | 0 | 300 |

→ allocation_record ALC-001: status=PICKED. reserved_qty chuyển sang picked_qty.

**Sau Ship (→ SHIPPED):**

| physical_qty | available_qty | reserved_qty | picked_qty |
|-------------|---------------|-------------|-----------|
| 200 | 200 | 0 | 0 |

→ InventTrans posted: TRX-001, ref_type=SHIPMENT, qty=-300, stage=PHYSICAL
→ allocation_record ALC-001: status=SHIPPED

**Kiểm chứng:** physical_qty (200) = available_qty (200) + reserved_qty (0) ✅

---

## 9. FIFO ALLOCATION — MULTI-LOCATION EXAMPLE

**Scenario:** Shipment SHP-002 cần 800MT CaCO3 cho Owner CUST001. Tồn kho phân bổ trên 3 location:

| Location | Lot Date (Ngày nhập) | physical_qty | reserved_qty | available_qty |
|----------|---------------------|-------------|-------------|---------------|
| WH5.1-A-01 | 2026-03-01 | 200 | 0 | 200 |
| WH5.1-A-02 | 2026-03-05 | 500 | 100 | 400 |
| WH5.1-B-01 | 2026-03-10 | 600 | 200 | 400 |

**FIFO Sort:** A-01 (03/01) → A-02 (03/05) → B-01 (03/10)

**Allocation Step-by-step:**

1. A-01: allocate MIN(800, 200) = 200 → remaining = 600
2. A-02: allocate MIN(600, 400) = 400 → remaining = 200
3. B-01: allocate MIN(200, 400) = 200 → remaining = 0 ✅

**Allocation Records:**

| allocation_id | location_id | qty_kg | on_hand available sau |
|--------------|------------|--------|----------------------|
| ALC-002-001 | WH5.1-A-01 | 200 | 0 |
| ALC-002-002 | WH5.1-A-02 | 400 | 0 |
| ALC-002-003 | WH5.1-B-01 | 200 | 200 |

**Kết quả OnHand:**

| Location | physical_qty | reserved_qty | available_qty |
|----------|-------------|-------------|---------------|
| WH5.1-A-01 | 200 | 200 | 0 |
| WH5.1-A-02 | 500 | 500 | 0 |
| WH5.1-B-01 | 600 | 400 | 200 |

---

## 10. WORK GENERATION TỪ ALLOCATION

### 10.1 Allocation → Work Header + Work Lines

Khi Shipment chuyển từ ALLOCATED → PICKING, hệ thống tạo Work:

```
FOR EACH shipment_line IN shipment_order.lines:
    work_header = CREATE WorkHeader(
        work_id: WRK-{YYYYMMDD}-{SEQ},
        work_type: 'PICK',
        ref_type: 'SHIPMENT',
        ref_id: shipment_order.id,
        ref_line_id: shipment_line.id,
        status: 'OPEN',
        priority: shipment_line.priority OR 'NORMAL',
        warehouse_id: shipment_order.warehouse_id
    )
    
    FOR EACH alloc IN allocation_records WHERE shipment_line_id = shipment_line.id:
        -- Work Line 1: PICK (lấy hàng từ location)
        CREATE WorkLine(
            work_header_id: work_header.id,
            line_seq: 1,
            work_type: 'PICK',
            location_id: alloc.location_id,  -- From location
            item_id: alloc.item_id,
            qty_kg: alloc.qty_kg,
            status: 'OPEN'
        )
        
        -- Work Line 2: PUT (đặt tại staging outbound)
        CREATE WorkLine(
            work_header_id: work_header.id,
            line_seq: 2,
            work_type: 'PUT',
            location_id: STAGING_OUTBOUND,  -- Fixed staging location
            item_id: alloc.item_id,
            qty_kg: alloc.qty_kg,
            status: 'OPEN'
        )
```

### 10.2 Mobile App: Pick Execution

1. WH Keeper mở app → thấy danh sách Work (OPEN) → chọn / self-claim
2. App hiển thị: Location → Product → Qty cần pick
3. WH Keeper đến location → scan QR code location → xác nhận product + qty
4. Click "Xác nhận lấy hàng" → WorkLine(PICK).status = COMPLETED
5. Đưa hàng đến staging → scan staging QR → WorkLine(PUT).status = COMPLETED
6. WorkHeader.status = COMPLETED → allocation_record.status = PICKED
7. shipment_line.line_status = PICKED

### 10.3 Short Pick Handling

**Khi thực tế pick được ít hơn allocated:**

Ví dụ: Allocated 300kg tại A-01, nhưng WH Keeper chỉ pick được 295kg.

**Phase 1 (Đề xuất đơn giản):**
1. WH Keeper nhập actual_qty = 295 (cho phép nhập ít hơn, KHÔNG cho phép nhập nhiều hơn)
2. Variance = 300 - 295 = 5kg
3. System tự động: 
   - Complete work line với 295kg
   - Tạo adjustment variance record (5kg, reason = SHORT_PICK)
   - OnHand: reserved_qty giảm 5, physical_qty giảm 5 (nếu auto-adjust) HOẶC flag cho manager review
4. Shipment line: picked_qty = 295 thay vì 300

**To Confirm:** TVL cần xác nhận short pick có auto-adjust hay cần manager approval.

---

## 11. API ENDPOINTS

### 11.1 Allocation APIs

| Method | Endpoint | Description | Actor |
|--------|---------|-------------|-------|
| POST | /api/shipments/{id}/allocate | Auto-allocate toàn bộ shipment (FIFO) | WH_PLANNER, WH_MANAGER |
| POST | /api/shipments/{id}/allocate/manual | Manual allocate với user-selected locations | WH_PLANNER, WH_MANAGER |
| POST | /api/shipments/{id}/unallocate | Unallocate toàn bộ shipment | WH_PLANNER, WH_MANAGER |
| GET | /api/shipments/{id}/allocations | Xem danh sách allocation records | ALL |
| GET | /api/inventory/available | Query available inventory cho allocation screen | WH_PLANNER, WH_MANAGER |

### 11.2 Request/Response Examples

**POST /api/shipments/SHP-20260315-001/allocate**

Request:
```json
{
    "method": "AUTO_FIFO"
}
```

Response (Success):
```json
{
    "status": "SUCCESS",
    "shipment_id": "SHP-20260315-001",
    "new_status": "ALLOCATED",
    "allocations": [
        {
            "allocation_id": "ALC-20260315-001",
            "shipment_line_id": "LINE-001",
            "location_id": "WH5.1-A-01",
            "item_id": "CACO3-BULK",
            "qty_kg": 200.000,
            "lot_date": "2026-03-01"
        },
        {
            "allocation_id": "ALC-20260315-002",
            "shipment_line_id": "LINE-001",
            "location_id": "WH5.1-A-02",
            "qty_kg": 100.000,
            "lot_date": "2026-03-05"
        }
    ],
    "total_allocated_kg": 300.000
}
```

Response (Fail):
```json
{
    "status": "FAIL",
    "error": "INSUFFICIENT_INVENTORY",
    "detail": "Required: 800.000 kg, Available: 600.000 kg, Short: 200.000 kg",
    "available_breakdown": [
        {"location_id": "WH5.1-A-01", "available_qty": 200.000},
        {"location_id": "WH5.1-A-02", "available_qty": 400.000}
    ]
}
```

**POST /api/shipments/SHP-20260315-001/allocate/manual**

Request:
```json
{
    "method": "MANUAL",
    "allocations": [
        {
            "shipment_line_id": "LINE-001",
            "on_hand_id": "uuid-xxxx-a01",
            "location_id": "WH5.1-A-01",
            "qty_kg": 300.000
        }
    ]
}
```

---

## 12. FEFO ALLOCATION (PHASE 2)

### 12.1 Khi nào bật FEFO

Khi TVL bật Batch/Lot tracking (Phase 2), mỗi item có `reservation_policy` field:
- `FIFO` — Sort by lot_date ASC (ngày nhập)
- `FEFO` — Sort by expiry_date ASC (ngày hết hạn)
- `MANUAL` — Chỉ manual allocate

### 12.2 FEFO Algorithm (Khác biệt với FIFO)

```
-- Thay đổi duy nhất: ORDER BY clause
candidates = SELECT on_hand.*
    FROM on_hand JOIN invent_dim ON ...
    WHERE ...
    ORDER BY invent_dim.expiry_date ASC,   -- FEFO: hết hạn sớm nhất trước
             invent_dim.lot_date ASC,       -- Tie-break: FIFO
             invent_dim.location_id ASC
```

### 12.3 Expiry Validation

```
-- Thêm check: không allocate hàng đã hết hạn hoặc sắp hết hạn
AND (invent_dim.expiry_date IS NULL 
     OR invent_dim.expiry_date > NOW() + INTERVAL '{item.min_remaining_shelf_days} days')
```

---

## 13. BUSINESS RULES SUMMARY

| Rule ID | Context | Condition (IF) | Action (THEN) | Exception | Example |
|---------|---------|---------------|---------------|-----------|---------|
| BR-ALLOC-001 | Auto-Allocate | User click Auto-Allocate trên Shipment (CONFIRMED) | System chạy FIFO: sort by lot_date ASC, allocate tuần tự đến đủ expected_qty | Nếu không đủ → FAIL, không partial | Cần 800MT, FIFO lấy: A-01(200) + A-02(400) + B-01(200) |
| BR-ALLOC-002 | Manual Allocate | User chọn cụ thể location + qty | Validate SUM(qty) = expected AND mỗi qty <= available | Nếu không khớp → reject | User chọn A-01: 300MT nhưng available chỉ 200 → FAIL |
| BR-ALLOC-003 | Available Check | Trước khi allocate | allocated_qty KHÔNG vượt available_qty tại mỗi (location + product + lot) | N/A | Available=400, allocate 500 → FAIL |
| BR-ALLOC-004 | Unallocate | User click Unallocate | Hoàn trả reserved_qty → available_qty. Shipment → CONFIRMED | Không thể unallocate nếu đã có pick task COMPLETED | Unallocate 300MT → available tăng 300MT |
| BR-ALLOC-005 | Concurrent Lock | 2 user allocate cùng lúc | SELECT FOR UPDATE NOWAIT → user thứ 2 nhận lỗi "retry" | Lock timeout configurable (default 5s) | User A lock A-01, User B cũng cần A-01 → B retry |
| BR-ALLOC-006 | Partial Allocation | Available < Expected | FAIL toàn bộ, không partial | Phase 2: xem xét partial | Cần 800, available 600 → FAIL (không allocate 600) |
| BR-ALLOC-007 | Status Filter | Khi tìm OnHand candidates | Chỉ allocate hàng status = AVAILABLE | DAMAGED, BLOCKED, IN_TRANSIT bị loại | Hàng BLOCKED 100MT không xuất hiện trong candidates |
| BR-ALLOC-008 | Owner Filter | Khi tìm OnHand candidates | Hàng phải cùng owner_id với Shipment | Không cross-owner allocation | Owner CUST001 không thể allocate hàng của CUST002 |

---

## 14. USER STORIES

### US-ALLOC-001: Auto-Allocate Shipment

**As a** WH Planner
**I want** to auto-allocate inventory for a confirmed shipment using FIFO
**So that** the oldest stock is picked first and I don't need to manually select locations

**Acceptance Criteria:**
- **Given** Shipment SHP-001 ở trạng thái CONFIRMED với 1 line: 300MT CaCO3
- **When** tôi click "Auto-Allocate"
- **Then** system tìm OnHand available (FIFO), tạo allocation records, shipment → ALLOCATED
- **And** OnHand reserved_qty tăng 300, available_qty giảm 300

**Edge Cases:**
- Nếu available < 300 → hiển thị lỗi "Insufficient inventory: available X, required 300, short Y"
- Nếu user khác đang allocate cùng location → hiển thị "Another allocation in progress. Please retry."
- Nếu shipment không ở CONFIRMED → button "Auto-Allocate" bị disable

### US-ALLOC-002: Manual Allocate Shipment

**As a** WH Planner
**I want** to manually select which locations to pick from
**So that** I can prioritize specific locations (e.g., cần dọn location, hàng gần cửa kho)

**Acceptance Criteria:**
- **Given** Shipment SHP-001 ở CONFIRMED, tôi click "Manual Allocate"
- **When** system hiển thị danh sách OnHand available (FIFO sort mặc định)
- **Then** tôi chọn location + nhập qty cho mỗi dòng
- **And** system validate tổng qty = expected_qty, mỗi dòng <= available
- **And** nếu OK → tạo allocation records, shipment → ALLOCATED

### US-ALLOC-003: Unallocate Shipment

**As a** WH Planner
**I want** to unallocate a shipment that hasn't started picking
**So that** I can re-plan or cancel the shipment

**Acceptance Criteria:**
- **Given** Shipment SHP-001 ở ALLOCATED, chưa có pick task nào COMPLETED
- **When** tôi click "Unallocate"
- **Then** allocation records → CANCELLED, OnHand reserved_qty giảm, available_qty tăng
- **And** shipment → CONFIRMED

**Edge Cases:**
- Nếu đã có pick task COMPLETED → hiển thị lỗi "Cannot unallocate: items already picked"
- Nếu shipment ở PICKING nhưng chưa pick xong → cho phép unallocate (cancel tất cả pick tasks chưa done)

### US-ALLOC-004: View Allocation Detail

**As a** WH Manager
**I want** to see which locations were allocated for a shipment
**So that** I can verify the picking plan and review FIFO compliance

**Acceptance Criteria:**
- **Given** Shipment SHP-001 ở ALLOCATED hoặc sau đó
- **When** tôi mở Allocation tab
- **Then** hiển thị danh sách: location, lot_date, qty_kg, status, allocated_by, method (AUTO/MANUAL)

---

## 15. ASSUMPTIONS & TO CONFIRM

### 15.1 Assumptions (Giả định)

| # | Assumption | Impact nếu sai |
|---|-----------|----------------|
| A1 | TVL chỉ allocate tại warehouse level, không cross-warehouse | Nếu cần cross-warehouse → cần Transfer module trước khi allocate |
| A2 | 1 shipment = 1 warehouse (không split cross-WH) | Nếu split cross-WH → cần re-design allocation |
| A3 | Short pick tự động tạo adjustment (không cần approval) | Nếu cần approval → thêm short pick workflow |
| A4 | Lock timeout = 5 seconds cho pessimistic locking | Có thể cần tune dựa trên thực tế |
| A5 | Phase 1 không cần reservation tại SO level | Nếu cần → thêm soft reservation layer |

### 15.2 To Confirm với TVL

| # | Câu hỏi | Đề xuất | Impact |
|---|--------|---------|--------|
| TC-1 | Short pick: auto-adjust hay cần manager approval? | Đề xuất: auto-adjust với reason_code, manager review sau | Ảnh hưởng short pick workflow |
| TC-2 | Có cho phép re-allocate (unallocate rồi allocate lại) khi đang PICKING? | Đề xuất: cho phép nếu chưa có pick task COMPLETED | Ảnh hưởng unallocation logic |
| TC-3 | Allocation priority: ngoài FIFO, có cần ưu tiên location nào không? (VD: gần cửa kho trước) | Đề xuất: Phase 1 chỉ FIFO, Phase 2 thêm location priority | Ảnh hưởng sort order |
| TC-4 | Khi split shipment, allocation cũ xử lý thế nào? | Đề xuất: unallocate → re-allocate cho cả 2 shipment mới | Ảnh hưởng split logic |

---

## 16. APPENDIX

### Appendix A: State Machine Integration Map

```
                    DOCUMENT LAYER                    ALLOCATION LAYER                INVENTORY LAYER
                    
Sale Order ──────► Shipment (CONFIRMED) ──────────► allocation_record ──────────► on_hand
                         │                              (ACTIVE)               (reserved_qty ↑)
                         │                                  │
                         ▼                                  │
                  Shipment (ALLOCATED) ◄────────────────────┘
                         │
                         ▼
                  Shipment (PICKING) ──────────────► WorkHeader/WorkLine
                         │                              (OPEN → COMPLETED)
                         ▼                                  │
                  Shipment (PICKED) ◄───────────────────────┘
                         │                           allocation_record
                         │                              (PICKED)
                         ▼
                  Shipment (SHIPPED) ─────────────► InventTrans (ISSUE)
                                                   on_hand (physical ↓)
                                                   allocation_record (SHIPPED)
```

### Appendix B: Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| ALLOC_001 | Insufficient inventory | 422 |
| ALLOC_002 | Shipment not in CONFIRMED status | 409 |
| ALLOC_003 | Concurrent lock conflict — retry | 423 |
| ALLOC_004 | Owner mismatch | 422 |
| ALLOC_005 | Warehouse mismatch | 422 |
| ALLOC_006 | Cannot unallocate — items already picked | 409 |
| ALLOC_007 | Blocking rule violation (SO over-commit) | 422 |
| ALLOC_008 | Manual allocation qty mismatch | 422 |

### Appendix C: Glossary

| Term | Definition |
|------|-----------|
| Allocation | Phân bổ tồn kho cụ thể (location + qty) cho shipment line |
| Reserved Qty | Số lượng đã giữ cho shipment, trừ khỏi available |
| Available Qty | physical - reserved, số lượng thực sự có thể allocate |
| FIFO | First In First Out — ưu tiên hàng nhập sớm nhất |
| FEFO | First Expired First Out — ưu tiên hàng hết hạn sớm nhất (Phase 2) |
| Unallocate | Hoàn trả reserved qty về available, hủy allocation records |
| Short Pick | Pick thực tế ít hơn allocated qty |
| Pessimistic Lock | Khóa record trước khi đọc, đảm bảo không conflict |

---

*Document End — TVL_SWM_Reservation_Allocation_Spec v1.0*
