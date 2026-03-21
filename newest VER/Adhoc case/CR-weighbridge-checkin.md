# CR: Weighbridge Check-In Mode (Hướng 2)

> **Module**: Weighbridge (Phase 3)
> **CR Type**: Enhancement — Backward Compatible
> **Priority**: P0
> **Requested by**: BA Team (Smartlog)
> **Date**: 2026-03-20
> **Affects**: `03-weighbridge-flow.md` v5, `04-inbound-flow.md` v2, `05-outbound-flow.md`
> **Ref**: API Trạm cân - v2.xlsx

---

## 1. Bối cảnh & Vấn đề

### Quy trình thực tế tại trạm cân (chưa được spec hiện tại cover)

```
Xe đến trạm cân
    │
    ▼
[LẦN 1] Cân tổng xe đầy ← CHỈ CÓ GROSS, CHƯA CÓ SKU, CHƯA CÓ TARE
    │    Trạm cân cần WMS validate ngay: xe có đúng đơn không?
    │    Nếu sai → chặn xe ngay, không cho vào kho
    │
    ▼
Xe vào kho → dỡ SKU-A
    │
    ▼
[LẦN 2] Xe quay lại trạm → cân → BÂY GIỜ MỚI CÓ: sku + gross + tare
    │    Trạm cân POST đầy đủ thông tin cho SKU-A
    │
    ▼
... lặp lại cho SKU-B, SKU-C ...
```

### Gap trong spec hiện tại

API `POST /api/weighbridge-logs` yêu cầu `sku` (required) và `tare_weight_kg` (required). Lần cân đầu tiên tại trạm cân **không có 2 field này** vì xe chưa dỡ hàng → không thể gọi API → không được WMS validate thông tin xe ngay lập tức.

Hệ quả: Nếu xe vào sai đơn, phải đợi đến lần cân thứ 2 (sau khi đã dỡ hàng) mới phát hiện lỗi. Lúc này xử lý rất phức tạp và tốn thời gian.

---

## 2. Giải pháp: Check-In Mode trên cùng endpoint

Mở rộng `POST /api/weighbridge-logs` để chấp nhận 2 loại request trên **cùng 1 endpoint**:

| Mode | Khi nào | sku | tare_weight_kg | WMS trả |
|------|---------|-----|----------------|---------|
| **CHECK_IN** | Lần cân đầu tiên — xe dừng tại trạm | null / không truyền | null / không truyền | Status = PENDING, danh sách SKU trong đơn |
| **WEIGHING** | Sau mỗi lần dỡ/xếp hàng — cân per-SKU | required | required | Status = COMPLETED, net_weight_kg, tolerance |

**Backward compatible**: Nếu trạm cân gửi đầy đủ fields (sku + tare) → xử lý như WEIGHING bình thường, không cần check-in trước.

---

## 3. Schema Changes

### 3.1 Table `weighbridge_log` — Sửa cột

| Column | Hiện tại | Thay đổi | Lý do |
|--------|----------|----------|-------|
| `sku` | VARCHAR, NOT NULL | → **NULLABLE** | Check-in không có SKU |
| `tare_weight_kg` | DECIMAL, NOT NULL | → **NULLABLE** | Check-in không có tare |
| `net_weight_kg` | DECIMAL, computed | → **NULLABLE** | Check-in không tính được (chỉ có gross) |
| `resolved_item_id` | UUID, nullable | Giữ nguyên | Check-in: null (không resolve item) |
| `resolved_receipt_line_id` | UUID, nullable | Giữ nguyên | Check-in: null |
| `resolved_order_detail_id` | UUID, nullable | Giữ nguyên | Check-in: null |

### 3.2 Table `weighbridge_log` — Thêm cột mới

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `log_mode` | ENUM('CHECK_IN', 'WEIGHING') | NOT NULL | 'WEIGHING' | Phân biệt check-in vs cân per-SKU. Default = WEIGHING để backward compatible |
| `scale_ticket_id` | VARCHAR(50) | YES | null | Mã phiếu cân do trạm cân quản lý. WMS lưu để đối soát, không dùng làm key nội bộ |

### 3.3 Status ENUM — Thêm giá trị

Hiện tại: `PENDING`, `COMPLETED`, `ERROR`

Thêm: **`EXPIRED`** (cho check-in log không có per-SKU follow-up sau 24h)

State machine mới:

```
                                    ┌── (per-SKU log đầu tiên được tạo) ──→ RESOLVED
POST (check-in) ──→ PENDING ────────┤
                                    ├── (24h không có follow-up) ──→ EXPIRED
                                    └── (cancel thủ công) ──→ CANCELLED

POST (per-SKU)  ──→ COMPLETED / ERROR    (giữ nguyên, không đổi)
```

> **RESOLVED** vs **COMPLETED**: Check-in log chuyển sang RESOLVED khi chain có ít nhất 1 per-SKU log COMPLETED. Check-in log bản thân KHÔNG update receipt/order (chỉ per-SKU log mới update).

### 3.4 Migration Script

```sql
-- 1. Alter columns to nullable
ALTER TABLE ops.weighbridge_log
  ALTER COLUMN sku DROP NOT NULL,
  ALTER COLUMN tare_weight_kg DROP NOT NULL,
  ALTER COLUMN net_weight_kg DROP NOT NULL;

-- 2. Add new columns
ALTER TABLE ops.weighbridge_log
  ADD COLUMN log_mode VARCHAR(10) NOT NULL DEFAULT 'WEIGHING'
    CHECK (log_mode IN ('CHECK_IN', 'WEIGHING')),
  ADD COLUMN scale_ticket_id VARCHAR(50) NULL;

-- 3. Add EXPIRED and CANCELLED to status enum
-- (exact syntax depends on enum implementation — EF enum or varchar check)
-- If using varchar check constraint:
ALTER TABLE ops.weighbridge_log
  DROP CONSTRAINT IF EXISTS chk_weighbridge_log_status,
  ADD CONSTRAINT chk_weighbridge_log_status
    CHECK (status IN ('PENDING', 'COMPLETED', 'ERROR', 'EXPIRED', 'CANCELLED', 'RESOLVED'));

-- 4. Index for check-in duplicate detection
CREATE UNIQUE INDEX uix_checkin_active
  ON ops.weighbridge_log (document_number, vehicle_plate)
  WHERE log_mode = 'CHECK_IN' AND status = 'PENDING';

-- 5. Index for chain lookup
CREATE INDEX ix_chain_lookup
  ON ops.weighbridge_log (document_number, vehicle_plate, sequence_no DESC)
  WHERE status IN ('PENDING', 'COMPLETED', 'RESOLVED');
```

---

## 4. API Changes

### 4.1 `CreateWeighbridgeLogCommand` — Input DTO

```
Input (UPDATED):
  document_number   (required)  — receipt_number hoặc order_number
  gross_weight_kg   (required)  — decimal > 0
  vehicle_plate     (required)  — biển số xe
  warehouse_code    (required)  — mã kho
  owner_code        (required)  — mã chủ hàng
  sku               (conditional) — NULL cho CHECK_IN, required cho WEIGHING
  tare_weight_kg    (conditional) — NULL cho CHECK_IN, required cho WEIGHING
  type              (optional)  — INBOUND / OUTBOUND (auto-detect nếu có cả gross + tare)
  notes             (optional)  — free text
  scale_ticket_id   (optional)  — mã phiếu cân từ trạm cân
```

**Detect `log_mode` tự động:**

```
IF sku IS NULL OR tare_weight_kg IS NULL:
    log_mode = CHECK_IN
ELSE:
    log_mode = WEIGHING
```

### 4.2 Response DTO — Thêm fields

```
Output (UPDATED):
  log_id              — UUID
  log_number          — WB-YYYYMMDD-SEQ
  log_mode            — CHECK_IN / WEIGHING                         ← MỚI
  status              — PENDING (check-in) / COMPLETED / ERROR
  type                — INBOUND / OUTBOUND / null (check-in chưa detect)
  gross_weight_kg     — echo input
  tare_weight_kg      — echo input (null nếu check-in)
  net_weight_kg       — computed (null nếu check-in)
  running_total_kg    — tổng tích lũy (null nếu check-in)
  tolerance_status    — OK / WARNING (null nếu check-in)
  sequence_no         — vị trí trong chain
  previous_log_id     — FK log trước
  scale_ticket_id     — echo input                                  ← MỚI
  document_skus       — string[] danh sách SKU trong đơn             ← MỚI
  vehicle_validated   — boolean                                     ← MỚI
  error_message       — mô tả lỗi (nếu ERROR)
  warnings[]          — CHAIN_WEIGHT_MISMATCH, TOLERANCE_EXCEEDED
```

> `document_skus`: Trả cho CẢ check-in lẫn weighing. Giúp trạm cân biết danh sách SKU cần cân mà không phải gọi API riêng.

### 4.3 Thêm API: Cancel Check-In

```
PUT /api/weighbridge-logs/{id}/cancel

Input:   { reason: "Xe vào sai đơn" }
Guard:   log.log_mode = CHECK_IN AND log.status = PENDING
Output:  { status: "CANCELLED" }
```

---

## 5. Backend Processing Pipeline (UPDATED)

### 5.1 Pipeline chung — Thêm bước detect mode

```
CreateWeighbridgeLogHandler.Handle(command):
│
├─ 0. DETECT LOG_MODE (MỚI)
│   ├─ IF sku IS NULL OR tare_weight_kg IS NULL:
│   │   └─ log_mode = CHECK_IN → goto CHECK_IN pipeline (5.2)
│   └─ ELSE:
│       └─ log_mode = WEIGHING → goto WEIGHING pipeline (5.3) — giữ nguyên hiện tại
│
```

### 5.2 CHECK_IN Pipeline (MỚI)

```
CHECK_IN Pipeline:
│
├─ 1. Validate gross_weight_kg > 0
│   └─ Nếu lỗi → ERROR: INVALID_WEIGHT
│
├─ 2. Resolve warehouse_code → warehouse_id (V3)
│   └─ Nếu lỗi → ERROR: WAREHOUSE_NOT_FOUND
│
├─ 3. Resolve owner_code → owner_id (V4)
│   └─ Nếu lỗi → ERROR: OWNER_NOT_FOUND
│
├─ 4. Resolve document_number → receipt/order cho warehouse (V6)
│   └─ Nếu lỗi → ERROR: DOCUMENT_NOT_FOUND
│   └─ Lưu document_type = INBOUND nếu match receipt, OUTBOUND nếu match order
│
├─ 5. Validate vehicle_plate khớp document (V8)
│   └─ Nếu lỗi → ERROR: VEHICLE_MISMATCH
│
├─ 6. Duplicate check-in guard (MỚI)
│   ├─ Query: SELECT * FROM weighbridge_log
│   │   WHERE document_number = :doc AND vehicle_plate = :plate
│   │     AND log_mode = 'CHECK_IN' AND status = 'PENDING'
│   └─ Nếu tồn tại → ERROR: CHECK_IN_EXISTS
│       message: "Xe đã check-in cho đơn này. Hủy check-in cũ trước khi tạo mới."
│
├─ 7. Query danh sách SKU trong đơn
│   ├─ INBOUND: SELECT sku FROM receipt_line WHERE receipt_id = :id
│   └─ OUTBOUND: SELECT sku FROM order_detail WHERE order_id = :id
│   └─ → document_skus[]
│
├─ 8. INSERT weighbridge_log
│   ├─ log_mode = CHECK_IN
│   ├─ status = PENDING
│   ├─ type = null (chưa detect)
│   ├─ sku = null
│   ├─ tare_weight_kg = null
│   ├─ net_weight_kg = null
│   ├─ sequence_no = 1
│   ├─ previous_log_id = null
│   ├─ resolved_item_id = null
│   ├─ resolved_receipt_line_id = null
│   ├─ resolved_order_detail_id = null
│   └─ generate log_number = WB-YYYYMMDD-SEQ
│
├─ 9. (Optional) Auto-transition document status
│   ├─ INBOUND: Nếu inbound_receipt.status = DRAFT → set WEIGHING
│   └─ OUTBOUND: Nếu order_header.status = LOADED → set WEIGHING
│   └─ Ghi audit_log cho transition
│
└─ 10. Return response
    ├─ log_mode = CHECK_IN
    ├─ status = PENDING
    ├─ vehicle_validated = true
    ├─ document_skus = [...]
    └─ Các field net/tolerance/running_total = null
```

### 5.3 WEIGHING Pipeline — Sửa V10 (Cascading)

Pipeline giữ nguyên 16 bước hiện tại, **chỉ sửa bước 10** (cascading chain check):

```
Bước 10 (UPDATED):
│
├─ Find previous log:
│   SELECT * FROM weighbridge_log
│   WHERE document_number = :doc AND vehicle_plate = :plate
│     AND status IN ('PENDING', 'COMPLETED', 'RESOLVED')
│   ORDER BY sequence_no DESC LIMIT 1
│
├─ IF previous log found:
│   ├─ IF prev.log_mode = 'CHECK_IN':                          ← MỚI
│   │   ├─ V10 check: current.gross ≈ prev.GROSS (±50 kg)
│   │   │   (so sánh gross-gross vì check-in không có tare)
│   │   ├─ Set prev.status → RESOLVED (check-in đã có follow-up)
│   │   └─ Set sequence_no = prev.sequence_no + 1 (= 2)
│   │
│   └─ IF prev.log_mode = 'WEIGHING':                          ← GIỮ NGUYÊN
│       ├─ V10 check: current.gross ≈ prev.TARE (±50 kg)
│       └─ Set sequence_no = prev.sequence_no + 1
│
├─ IF previous log NOT found:
│   └─ sequence_no = 1, previous_log_id = null
│       (Backward compatible: per-SKU không cần check-in trước)
│
└─ Continue to step 11...
```

---

## 6. Edge Cases & Business Rules

### EC-1: Check-in PENDING auto-expire

```
Rule:   Check-in log ở PENDING > 24h → status = EXPIRED
Impl:   Background job (cron) hoặc lazy check khi query
Cron:   Chạy mỗi giờ:
        UPDATE weighbridge_log
        SET status = 'EXPIRED'
        WHERE log_mode = 'CHECK_IN'
          AND status = 'PENDING'
          AND created_at < NOW() - INTERVAL '24 hours';
```

### EC-2: Duplicate check-in

```
Rule:   Cùng document_number + vehicle_plate chỉ được có 1 check-in PENDING
Guard:  Unique index uix_checkin_active (xem migration ở trên)
Error:  CHECK_IN_EXISTS — "Xe đã check-in cho đơn này"
Action: Trạm cân hủy check-in cũ (PUT /cancel) rồi tạo mới
```

### EC-3: Per-SKU gửi mà không có check-in trước

```
Rule:   Backward compatible — CHẤP NHẬN
Logic:  Nếu không tìm thấy previous log → sequence_no = 1, previous_log_id = null
        Xử lý như WEIGHING bình thường (giống flow hiện tại)
Impact: Không cần sửa gì thêm — đây là default behavior hiện tại
```

### EC-4: Xe 1 SKU duy nhất

```
Option A: Check-in + 1 per-SKU (2 POST)  → Hợp lệ
Option B: 1 POST đầy đủ fields (skip check-in) → Hợp lệ (EC-3)
Recommendation: Để trạm cân tự chọn. Không ép buộc check-in.
```

### EC-5: Document chưa ở status cho phép cân

```
INBOUND:
  Check-in → receipt status = DRAFT → Auto-transition → WEIGHING (bước 9 pipeline)
  Per-SKU  → receipt status phải ≥ WEIGHING (V6 existing logic)

OUTBOUND:
  Check-in → order status = LOADED → Auto-transition → WEIGHING
  Per-SKU  → order status phải ∈ {LOADED, WEIGHING} (OB-5006)
```

### EC-6: Trạm cân gửi sku nhưng không có tare (hoặc ngược lại)

```
Rule:   Nếu có sku nhưng KHÔNG có tare → ERROR: MISSING_TARE_WEIGHT
        "Đã truyền SKU nhưng thiếu tare_weight_kg. Vui lòng truyền cả 2 hoặc bỏ cả 2."
Rule:   Nếu có tare nhưng KHÔNG có sku → ERROR: MISSING_SKU
        "Đã truyền tare_weight_kg nhưng thiếu SKU. Vui lòng truyền cả 2 hoặc bỏ cả 2."
Note:   Chỉ chấp nhận: (cả 2 null → CHECK_IN) hoặc (cả 2 có giá trị → WEIGHING)
```

---

## 7. Validation Rules — Tổng hợp (Updated)

| # | Rule | Error Code | Blocking | Áp dụng |
|---|------|------------|----------|---------|
| V0a | sku và tare phải cùng null hoặc cùng có giá trị | INVALID_MODE_FIELDS | Yes | Cả 2 |
| V0b | Cùng (document, vehicle) chỉ 1 PENDING check-in | CHECK_IN_EXISTS | Yes | CHECK_IN |
| V1 | gross > 0; tare > 0 (nếu có) | INVALID_WEIGHT | Yes | Cả 2 |
| V2 | gross ≠ tare | NET_WEIGHT_ZERO | Yes | WEIGHING |
| V3 | warehouse_code tồn tại | WAREHOUSE_NOT_FOUND | Yes | Cả 2 |
| V4 | owner_code tồn tại | OWNER_NOT_FOUND | Yes | Cả 2 |
| V5 | sku tồn tại cho owner | ITEM_NOT_FOUND | Yes | WEIGHING |
| V6 | document_number tồn tại cho warehouse | DOCUMENT_NOT_FOUND | Yes | Cả 2 |
| V7 | sku có trong document lines | LINE_NOT_FOUND | Yes | WEIGHING |
| V8 | vehicle_plate khớp document | VEHICLE_MISMATCH | Yes | Cả 2 |
| V9 | Auto-detect type (gross vs tare) | (computed) | — | WEIGHING |
| V10 | Cascading: gross ≈ prev.tare/gross (±50 kg) | CHAIN_WEIGHT_MISMATCH | No | WEIGHING |
| V11 | Running tolerance: SUM(net) vs expected | TOLERANCE_EXCEEDED | No | WEIGHING |

---

## 8. Test Scenarios

### 8.1 Happy Path — Inbound 3 SKU

```
Step 1: POST check-in
  Input:  { document_number: "RCV-001", gross_weight_kg: 30000,
            vehicle_plate: "51C-12345", warehouse_code: "WH-01", owner_code: "THORESEN" }
  Assert: status=PENDING, log_mode=CHECK_IN, sequence_no=1,
          document_skus=["SKU-A","SKU-B","SKU-C"], vehicle_validated=true
          inbound_receipt.status → WEIGHING (auto-transition)

Step 2: POST per-SKU (SKU-A)
  Input:  { document_number: "RCV-001", sku: "SKU-A", gross_weight_kg: 30000,
            tare_weight_kg: 22000, vehicle_plate: "51C-12345",
            warehouse_code: "WH-01", owner_code: "THORESEN" }
  Assert: status=COMPLETED, type=INBOUND, net_weight_kg=8000,
          sequence_no=2, previous_log_id=(check-in log_id)
          Check-in log.status → RESOLVED
          V10: gross(30000) ≈ check-in.gross(30000) ✓

Step 3: POST per-SKU (SKU-B)
  Input:  { ..., sku: "SKU-B", gross_weight_kg: 22000, tare_weight_kg: 15000 }
  Assert: net=7000, sequence_no=3, V10: gross(22000) ≈ prev.tare(22000) ✓

Step 4: POST per-SKU (SKU-C)
  Input:  { ..., sku: "SKU-C", gross_weight_kg: 15000, tare_weight_kg: 8000 }
  Assert: net=7000, sequence_no=4, running_total per line verified
```

### 8.2 Backward Compatible — Skip check-in

```
Step 1: POST per-SKU trực tiếp (không check-in)
  Input:  { document_number: "RCV-002", sku: "SKU-X", gross_weight_kg: 25000,
            tare_weight_kg: 17000, vehicle_plate: "51C-99999",
            warehouse_code: "WH-01", owner_code: "THORESEN" }
  Assert: status=COMPLETED, sequence_no=1, previous_log_id=null
          (xử lý giống flow hiện tại, không lỗi)
```

### 8.3 Error — Duplicate check-in

```
Step 1: POST check-in cho RCV-001 + 51C-12345 → PENDING
Step 2: POST check-in cho RCV-001 + 51C-12345 lần 2
  Assert: status=ERROR, error_message=CHECK_IN_EXISTS
```

### 8.4 Error — sku có nhưng thiếu tare

```
Step 1: POST { document_number: "RCV-001", sku: "SKU-A", gross_weight_kg: 30000,
               vehicle_plate: "51C-12345", warehouse_code: "WH-01", owner_code: "THORESEN" }
         (có sku nhưng KHÔNG có tare_weight_kg)
  Assert: status=ERROR, error_message=MISSING_TARE_WEIGHT
```

### 8.5 Check-in auto-expire

```
Step 1: POST check-in → PENDING
Step 2: Không có POST per-SKU nào trong 24h
  Assert: Background job → log.status = EXPIRED
```

### 8.6 Outbound happy path

```
Step 1: POST check-in (xe rỗng)
  Input:  { document_number: "ORD-001", gross_weight_kg: 8000,
            vehicle_plate: "51C-12345", warehouse_code: "WH-01", owner_code: "THORESEN" }
  Assert: PENDING, document_skus from order_detail

Step 2: POST per-SKU (sau xếp SKU-X)
  Input:  { ..., sku: "SKU-X", gross_weight_kg: 8000, tare_weight_kg: 18000 }
  Assert: COMPLETED, type=OUTBOUND (gross 8000 < tare 18000), net=10000
```

---

## 9. Checklist cho Dev

- [ ] Migration: `sku`, `tare_weight_kg`, `net_weight_kg` → nullable
- [ ] Migration: Thêm `log_mode` ENUM (default 'WEIGHING')
- [ ] Migration: Thêm `scale_ticket_id` VARCHAR nullable
- [ ] Migration: Status enum thêm EXPIRED, CANCELLED, RESOLVED
- [ ] Migration: Unique index `uix_checkin_active`
- [ ] `CreateWeighbridgeLogCommand`: Thêm field `scale_ticket_id` vào input DTO
- [ ] `CreateWeighbridgeLogHandler`: Thêm bước 0 detect `log_mode`
- [ ] `CreateWeighbridgeLogHandler`: CHECK_IN pipeline (validation V0a, V0b, V3, V4, V6, V8 + query SKUs)
- [ ] `CreateWeighbridgeLogHandler`: Sửa V10 cascading (prev.CHECK_IN → so sánh gross-gross)
- [ ] `CreateWeighbridgeLogHandler`: Auto-transition document status khi check-in
- [ ] `CreateWeighbridgeLogHandler`: WEIGHING pipeline — khi prev=CHECK_IN, set prev.status → RESOLVED
- [ ] Response DTO: Thêm `log_mode`, `document_skus`, `vehicle_validated`, `scale_ticket_id`
- [ ] New endpoint: `PUT /api/weighbridge-logs/{id}/cancel`
- [ ] Background job: Auto-expire PENDING check-in > 24h
- [ ] V0a validation: sku XOR tare → ERROR (INVALID_MODE_FIELDS / MISSING_TARE / MISSING_SKU)
- [ ] V0b validation: Duplicate check-in → ERROR (CHECK_IN_EXISTS)
- [ ] Unit tests: 8.1–8.6 scenarios
- [ ] Integration test: Full chain (check-in → N per-SKU → receipt RECEIVED)
- [ ] API docs / Swagger update
