# TVL SWM — System Flow End-to-End

**Mục tiêu:** 1 sơ đồ duy nhất cho toàn hệ thống. Manager đọc 10 phút → hiểu hệ thống vận hành thế nào, thấy ngay logic sai / missing step / sai posting point.

> **Ký hiệu:**
> `★ POSTING` = điểm ghi InventTrans (tồn kho thay đổi tại đây)
> `⚡ BILLING` = điểm capture billing event
> `[CONFIRMED]` = TVL đã chốt
> `[TO-CONFIRM]` = còn mở
> `BR-xxx` = Business Rule tham chiếu
> `M#` = Module số #

---

```
╔══════════════════════════════════════════════════════════════════════╗
║              TVL SWM — END-TO-END SYSTEM FLOW                       ║
╚══════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 0 — FOUNDATION SETUP (một lần)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  MASTER DATA SETUP                                      │
│  M1 Foundation + M2 Master Data | Role: ADMIN, WH_ADMIN │
├─────────────────────────────────────────────────────────┤
│  • Owner / Vendor / Item (cargo_form, tolerance/owner)  │
│  • Warehouse / Location (type: RECEIVING/STORAGE/…)     │
│  • Vehicle Type / Inventory Status (4 go-live statuses) │
│  • Rate Card / Contract / Day Type Calendar             │
│  • RBAC: 8 roles + warehouse scope per user             │
│  • Number Sequence: PER_WAREHOUSE, PREFIX-YYYYMMDD-SEQ  │
│  • Reason Code Catalog                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼ Hệ thống sẵn sàng vận hành


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 1 — INBOUND (hàng vào kho)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  INBOUND PLANNING                                       │
│  M4 Inbound | Role: WH_ADMIN / WH_MANAGER               │
├─────────────────────────────────────────────────────────┤
│  STANDARD flow:                                         │
│    PO tạo → ASN pre-create với vehicle list             │
│    receipt_type = STANDARD [BR-IN-003]                  │
│  VESSEL / B/L flow:                                     │
│    B/L + tổng số chuyến → receipt_type = VESSEL         │
│    [BR-IN-002]                                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  VEHICLE ARRIVAL                                        │
│  M4 + M8 | Role: WB_OPERATOR                            │
├─────────────────────────────────────────────────────────┤
│  STANDARD: tìm Receipt theo biển số xe → select         │
│  VESSEL:   upload ảnh phiếu cảng → OCR extract          │
│            B/L, vehicle, product, vessel name           │
│            confidence > 90% → auto-link                 │
│            fail/low confidence → WB_OPERATOR chọn tay  │
│  → Receipt: DRAFT → AWAITING_WEIGHING                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  WEIGH IN (cân vào — xe chở hàng đầy)                   │
│  M8 Weighbridge | Role: WB_OPERATOR                     │
├─────────────────────────────────────────────────────────┤
│  Scale đọc gross_weight tự động từ COM port             │
│  Latency ≤ 2 giây [CONFIRMED] [BR-WB-003]               │
│  1 lần cân = 1 weighbridge_log (immutable) [BR-WB-004]  │
│  Fail → local queue → retry 3×30s [BR-WB-002]           │
│  Retry fail → WH_MANAGER nhập tay + reason_code         │
│  → Receipt: WEIGHED_IN                                  │
│  → Xe vào kho dỡ hàng                                   │
│  → Receipt: PROCESSING                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  WEIGH OUT (cân ra — xe đã dỡ hàng xong)                │
│  M8 Weighbridge | Role: WB_OPERATOR                     │
├─────────────────────────────────────────────────────────┤
│  Scale đọc tare_weight tự động                          │
│  net_weight_kg = gross − tare (auto-calc)               │
│  → Receipt: WEIGHED_OUT                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  TOLERANCE CHECK                                        │
│  M4 Inbound | Role: System (auto)                       │
├─────────────────────────────────────────────────────────┤
│  variance_pct = |net − expected| / expected [BR-IN-004] │
│  Config: per owner + per item [BR-IN-006]               │
│  Default: 0.5% [TO-CONFIRM]                             │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
           PASS ≤ tol%          FAIL > tol%
                   │                  │
                   │         ┌────────▼────────────────┐
                   │         │  REJECTED               │
                   │         │  → WB_OPERATOR: Re-weigh │
                   │         │  Attempt 1 / 2 / 3      │
                   │         │  max 3 lần [CONFIRMED]  │
                   │         └────────┬────────────────┘
                   │                  │
                   │         ┌────────▼────────────────┐
                   │         │  Lần 3 vẫn fail         │
                   │         │  → Nút re-weigh LOCKED  │
                   │         │  → Chỉ WH_MANAGER cancel│
                   │         │  [CONFIRMED]            │
                   │         │  Receipt: CANCELLED     │
                   │         └─────────────────────────┘
                   │
                   ▼

┌─────────────────────────────────────────────────────────┐
│  ★ POSTING POINT 1 — RECEIVED                          │
│  M3 Inventory Core Engine | Role: System (auto)         │
├─────────────────────────────────────────────────────────┤
│  InventTrans INBOUND: +net_weight_kg                    │
│    dim: RECEIVING location + owner + AVAILABLE          │
│    ref: receipt_id + line_id [BR-INV-003] [CONFIRMED]   │
│  OnHand tăng tại RECEIVING location                     │
│  ⚡ BILLING EVENT: INBOUND_HANDLING captured           │
│    net_weight_mt × rate × day_type_factor [BR-BIL-003]  │
│  → Receipt: RECEIVED                                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  PUTAWAY WORK                                           │
│  M7 Work Execution | Role: WH_KEEPER (mobile)           │
├─────────────────────────────────────────────────────────┤
│  Auto-create Putaway WorkHeader [CONFIRMED] [BR-WRK-002]│
│  WH_KEEPER self-claim (không có directed assign)        │
│  [CONFIRMED] [BR-WRK-001]                               │
│  Start → IN_PROGRESS                                    │
│  Scan QR source location (RECEIVING)                    │
│  Scan QR destination location (STORAGE)                 │
│  Validate: destination MUST be STORAGE type [BR-MD-002] │
│  Offline queue nếu mất mạng [CONFIRMED] [BR-AUD-004]    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  ★ POSTING POINT 2 — PUTAWAY COMPLETE                  │
│  M3 | Role: System (auto, triggered by M7)              │
├─────────────────────────────────────────────────────────┤
│  InventTrans MOVE:                                      │
│    −qty @ RECEIVING location                            │
│    +qty @ STORAGE location                              │
│  Net zero tổng hợp — tồn tổng không đổi                │
│  OnHand di chuyển từ RECEIVING → STORAGE               │
│  → Receipt: PUTAWAY → WH_MANAGER close → CLOSED        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 2 — STORAGE & INVENTORY CONTROL (trong suốt vòng đời)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  HÀNG ĐANG Ở KHO — STORAGE                             │
│  Source of truth: InventDim + InventTrans + OnHand      │
│  OnHand = SUM(InventTrans.qty WHERE stage=PHYSICAL)     │
│  [CONFIRMED] [BR-INV-002]                               │
└────────────┬────────────────────┬───────────────────────┘
             │                    │
             │         ┌──────────▼──────────────────────┐
             │         │  INVENTORY CONTROL (ad-hoc)     │
             │         │  M6 | Role: WH_MANAGER, WH_KEEPER│
             │         ├─────────────────────────────────┤
             │         │  MOVE nội bộ:                   │
             │         │  → ★ MOVE: −src / +dst (M3)     │
             │         │                                 │
             │         │  TRANSFER liên kho:             │
             │         │  → AVAILABLE → IN_TRANSIT → AVAILABLE
             │         │  → ★ 2 InventTrans [BR-INV-010] │
             │         │                                 │
             │         │  STATUS CHANGE:                 │
             │         │  AVAILABLE → BLOCKED/DAMAGED    │
             │         │  Reason code bắt buộc [CONFIRMED]│
             │         │                                 │
             │         │  CYCLE COUNT:                   │
             │         │  Blind count → variance check   │
             │         │  → ★ CYCLE_COUNT_ADJUST (M3)    │
             │         │  [BR-INV-007]                   │
             │         │                                 │
             │         │  ADJUSTMENT (shrinkage/found):  │
             │         │  → ★ ADJUSTMENT (M3)            │
             │         │  Reason code, no approval needed│
             │         │  [CONFIRMED] [BR-INV-008]       │
             │         └─────────────────────────────────┘
             │
             │         ┌─────────────────────────────────┐
             │         │  VAS / BAGGING (khi có yêu cầu) │
             │         │  M9 | Role: WH_MANAGER, WH_KEEPER│
             │         ├─────────────────────────────────┤
             │         │  Tạo Work Order: bulk → bags    │
             │         │  Validate: tồn bulk đủ          │
             │         │  [BR-VAS-002]                   │
             │         │  Execute: multi-session bagging  │
             │         │                                 │
             │         │  ★ POSTING POINT VAS — WO DONE  │
             │         │  VAS_CONSUME: −bulk_qty          │
             │         │  VAS_PRODUCE: +bagged_qty        │
             │         │  VAS_CONSUME: −packaging         │
             │         │  (if TVL_OWNED) [BR-VAS-003]    │
             │         │                                 │
             │         │  ⚡ BILLING: BAGGING_FEE         │
             │         │  Tier pricing [BR-BIL-005]      │
             │         └─────────────────────────────────┘
             │
             │         ┌─────────────────────────────────┐
             │         │  EOD SNAPSHOT (daily, 23:59 VN) │
             │         │  M10 | Role: System (batch job)  │
             │         ├─────────────────────────────────┤
             │         │  Daily = (Opening + Inbound)    │
             │         │         × rate/MT/day            │
             │         │  KHÔNG trừ outbound [CONFIRMED] │
             │         │  Chỉ billing locations [CONFIRMED]
             │         │  [BR-BIL-001] [BR-BIL-008]      │
             │         │  Snapshot immutable sau khi tạo │
             │         └─────────────────────────────────┘
             │
             ▼


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 3 — OUTBOUND (hàng ra khỏi kho)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  OUTBOUND REQUEST                                       │
│  M5 Outbound | Role: WH_MANAGER                         │
├─────────────────────────────────────────────────────────┤
│  Sales Order / Delivery Request tạo                     │
│  Shipment tạo: 1 shipment = 1 trip [BR-OUT-001]         │
│  Split shipment: 1 SO → nhiều trips [BR-OUT-007]        │
│  → Shipment: DRAFT → CONFIRMED                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  ALLOCATION                                             │
│  M5 | Role: System (auto) / WH_MANAGER (manual)         │
├─────────────────────────────────────────────────────────┤
│  Algorithm: FIFO (lot_date ASC) [CONFIRMED] [BR-OUT-002]│
│  Rule: allocated_qty ≤ available_qty [BR-OUT-003]       │
│  available = physical − reserved                        │
│  → reserved_qty tăng (hold, chưa trừ physical)         │
│  Pessimistic locking [TO-CONFIRM: cần ADR]              │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
            Đủ hàng           Không đủ hàng
                   │                  │
                   │         ┌────────▼──────────────┐
                   │         │  ALLOCATION FAIL       │
                   │         │  Không partial [CONFIRMED]
                   │         │  Toàn bộ fail          │
                   │         │  → WH_MANAGER xử lý   │
                   │         └───────────────────────┘
                   │
                   ▼ Shipment: ALLOCATED

┌─────────────────────────────────────────────────────────┐
│  PICK WORK                                              │
│  M7 Work Execution | Role: WH_KEEPER (mobile)           │
├─────────────────────────────────────────────────────────┤
│  Auto-create Pick WorkHeader (1 per shipment line)      │
│  [CONFIRMED] [BR-WRK-002]                               │
│  WH_KEEPER self-claim                                   │
│  Scan source location QR → validate allocation          │
│  Nhập actual_qty picked                                 │
│  Short pick: [TO-CONFIRM] ≤2%/2–5%/>5% rule            │
│  All Work COMPLETED → Shipment: PICKED                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  WEIGH TARE (xe rỗng lên cân trước)                     │
│  M8 | Role: WB_OPERATOR                                 │
├─────────────────────────────────────────────────────────┤
│  Scale đọc tare_weight (xe không hàng)                  │
│  Ghi weighbridge_log tare                               │
│  → Shipment: WEIGHING_TARE                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  WEIGH GROSS — MULTI-LINE LOOP                          │
│  M8 + M5 | Role: WB_OPERATOR + WH_KEEPER               │
├─────────────────────────────────────────────────────────┤
│  Keeper chọn thứ tự line tự do [CONFIRMED] [TC-09]      │
│                                                         │
│  ┌──────── LOOP: mỗi line ────────────────────────┐    │
│  │  Xếp hàng line N lên xe                        │    │
│  │  Xe lên cân → Scale đọc gross_N                │    │
│  │  net_line_N = gross_N − gross_(N−1)            │    │
│  │  (net_line_1 = gross_1 − tare) [BR-WB-005]     │    │
│  │                                                 │    │
│  │  Tolerance check per line:                     │    │
│  │  ├─ PASS  → line: LINE_SHIPPED, tiếp tục loop  │    │
│  │  └─ FAIL  → flag PENDING_APPROVAL              │    │
│  │            KHÔNG chặn loop [CONFIRMED] [TC-10] │    │
│  └──────── Hết tất cả lines → ALL_WEIGHED ────────┘    │
│                                                         │
│  Cross-check: total_net = gross_final − tare            │
│  Lệch → log warning                                     │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
           Tất cả PASS         Có line FAIL
                   │                  │
                   │         ┌────────▼──────────────────┐
                   │         │  PENDING_APPROVAL          │
                   │         │  M5 | Role: WH_MANAGER     │
                   │         │  Xem variance per line     │
                   │         │  Xem lịch sử cân           │
                   │         │  ├─ Approve + reason_code  │
                   │         │  │   → SHIPPED             │
                   │         │  └─ Reject                 │
                   │         │      → CANCELLED           │
                   │         │      → allocation released │
                   │         └───────────┬───────────────┘
                   │                     │ (approve path)
                   ├─────────────────────┘
                   │
                   ▼

┌─────────────────────────────────────────────────────────┐
│  ★ POSTING POINT 3 — SHIPPED                           │
│  M3 | Role: System (auto)                               │
├─────────────────────────────────────────────────────────┤
│  InventTrans OUTBOUND: −shipped_qty per line            │
│    ref: shipment_id + line_id [BR-INV-003] [CONFIRMED]  │
│  reserved_qty released                                  │
│  OnHand giảm tại source location                        │
│                                                         │
│  DPM SPECIAL CASE [CONFIRMED]:                          │
│  InventTrans: −actual_net_weight_kg (từ cân)            │
│  Billing/Report: bag_count × nominal_weight             │
│  Variance ghi log, KHÔNG auto-adjust [BR-OUT-006]       │
│                                                         │
│  → Shipment: SHIPPED → CLOSED                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 4 — BILLING & COMMERCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  BILLING EVENTS ACCUMULATED                             │
│  M10 | Role: System (auto-capture)                      │
├─────────────────────────────────────────────────────────┤
│  ⚡ INBOUND_HANDLING  → từ Receipt RECEIVED             │
│  ⚡ OUTBOUND_HANDLING → từ Shipment SHIPPED             │
│  ⚡ BAGGING_FEE       → từ VAS WO COMPLETED             │
│  ⚡ STORAGE_FEE       → từ EOD snapshot hàng ngày       │
│  Tất cả events idempotent (no duplicate) [BR-AUD-003]   │
│  Event thiếu rate card → flag UNBILLED → alert BILLING  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  CHARGE CALCULATION ENGINE                              │
│  M10 | Role: System                                     │
├─────────────────────────────────────────────────────────┤
│  Storage: (Opening + Inbound) × rate/MT/day [BR-BIL-001]│
│  Handling: qty_mt × rate × day_type_factor [BR-BIL-003] │
│  Day type: WORKING=100% / DAY_OFF=150% / HOLIDAY=200%   │
│  [CONFIRMED] [BR-BIL-004]                               │
│  VAS: qty_mt × tier_rate [BR-BIL-005]                   │
│  0–1.000MT→111K / 1.001–5.000MT→105K / >5.000MT→100K   │
│  Free days: từ ngày putaway đầu tiên [BR-BIL-007]       │
│  Billing UOM: kg ÷ 1000 = MT [BR-BIL-012]              │
│  VAT: 10% đồng nhất [BR-BIL-010]                        │
│  → Charge lines với full calculation trace              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  DEBIT NOTE                                             │
│  M10 | Role: BILLING_OFC                               │
├─────────────────────────────────────────────────────────┤
│  DRAFT → REVIEWED → APPROVED → LOCKED                  │
│  [CONFIRMED] [BR-BIL-009]                               │
│  Chỉ BILLING_OFC lock [CONFIRMED] [BR-RBAC-004]         │
│  LOCKED = immutable — không sửa được                    │
│  [PHASE 2] Credit Note workflow sau lock                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼

┌─────────────────────────────────────────────────────────┐
│  ERP PUSH                                               │
│  M8 Integration | Role: System / BILLING_OFC            │
├─────────────────────────────────────────────────────────┤
│  One-way: SWM → ERP [CONFIRMED]                         │
│  Idempotent: DN number = unique key [BR-BIL-011]        │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
               SUCCESS             FAIL
                   │                  │
                   │         retry → alert BILLING_OFC
                   │
                   ▼


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 5 — REPORTING & AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  REPORTING & AUDIT                                      │
│  M11 | Role: All roles (theo quyền)                     │
├─────────────────────────────────────────────────────────┤
│  Operational Dashboard:                                 │
│    throughput / pending work / exceptions / capacity    │
│                                                         │
│  Inventory Reports:                                     │
│    on-hand / movement history / aging / shrinkage       │
│    Shrinkage = Total IN − Total OUT [BR-INV-009]        │
│                                                         │
│  Billing Reports:                                       │
│    revenue per owner / service / period                 │
│                                                         │
│  Audit & Traceability:                                  │
│    OnHand → InventTrans → Receipt/Shipment (full trace) │
│    Mọi exception có reason code + user + timestamp      │
│    Retention 7 năm [CONFIRMED] [BR-AUD-002]             │
│                                                         │
│  Reconciliation (KHÔNG auto-fix):                       │
│    Ledger vs OnHand vs Billing                          │
│    Chỉ log + alert [CONFIRMED]                          │
└─────────────────────────────────────────────────────────┘
```

---

## TỔNG HỢP POSTING POINTS

| ★ | Tên | Trigger | InventTrans | Module |
|---|-----|---------|-------------|--------|
| ★1 | RECEIVED | Receipt: tolerance PASS | INBOUND +net_weight_kg | M3 ← M4 |
| ★2 | PUTAWAY | WorkLine: Putaway COMPLETED | MOVE: RECEIVING → STORAGE | M3 ← M7 |
| ★3 | SHIPPED | Shipment: SHIPPED | OUTBOUND −shipped_qty | M3 ← M5 |
| ★VAS | VAS COMPLETE | WO: COMPLETED | VAS_CONSUME (bulk) + VAS_PRODUCE (bags) + VAS_CONSUME (packaging) | M3 ← M9 |
| ★MOVE | MOVE / TRANSFER | Move/Transfer COMPLETED | ±qty pair (net zero) | M3 ← M6 |
| ★ADJ | ADJUSTMENT | Adjustment POST | +/−qty | M3 ← M6 |

> **Quy tắc bất biến:** `OnHand = SUM(InventTrans.qty WHERE stage=PHYSICAL)` [CONFIRMED]
> Không có UI hay API nào được phép UPDATE OnHand trực tiếp.

---

## TỔNG HỢP BILLING EVENTS

| ⚡ | Trigger | Công thức | Module |
|---|---------|-----------|--------|
| INBOUND_HANDLING | Receipt RECEIVED | net_weight_mt × rate × day_type% | M10 ← M4 |
| OUTBOUND_HANDLING | Shipment SHIPPED | shipped_qty_mt × rate × day_type% | M10 ← M5 |
| STORAGE_FEE | EOD 23:59 daily | (Opening + Inbound_today) × rate/MT/day | M10 batch |
| BAGGING_FEE | VAS WO COMPLETED | actual_qty_mt × tier_rate | M10 ← M9 |

> **Quy tắc bất biến:** Billing chỉ đúng khi InventTrans đúng. Không đi tắt từ chứng từ sang phí.

---

## DECISION POINTS — MANAGER REVIEW CHECKLIST

| # | Decision Point | Rule | Kết quả A | Kết quả B |
|---|---------------|------|-----------|-----------|
| D1 | Inbound tolerance | variance ≤ tol% [TO-CONFIRM default 0.5%] | RECEIVED → ★POST | REJECTED |
| D2 | Re-weigh max | attempt ≤ 3 [CONFIRMED] | Re-weigh | WH_MANAGER cancel |
| D3 | Allocation | available ≥ requested [CONFIRMED no partial] | ALLOCATED | FAIL toàn bộ |
| D4 | Outbound tolerance | variance per line ≤ tol% | LINE_SHIPPED | PENDING_APPROVAL |
| D5 | PENDING_APPROVAL | WH_MANAGER review | SHIPPED → ★POST | CANCELLED |
| D6 | VAS WO confirm | tồn bulk đủ [BR-VAS-002] | CONFIRMED | FAIL |
| D7 | DN Lock | BILLING_OFC review pass | LOCKED | Re-generate draft |
| D8 | ERP Push | push result | SUCCESS | FAIL → retry |

---

## MODULE RESPONSIBILITY MAP

```
          INPUT / SIGNAL          │   DECISION / RULE       │   POSTING / OUTPUT
──────────────────────────────────┼─────────────────────────┼─────────────────────
M8 Weighbridge/OCR/Integration    │                         │
  Scale COM port → weighbridge_log│                         │
  OCR → extracted fields          │                         │
  Mobile → sync queue             │                         │
  ERP push                        │                         │
──────────────────────────────────┼─────────────────────────┼─────────────────────
M4 Inbound / M5 Outbound         │                         │
  Receipt state machine            │  Tolerance check        │
  Shipment state machine           │  Allocation decision    │  Trigger M3 posting
  Work creation trigger            │  PENDING_APPROVAL flow  │  Billing event capture
──────────────────────────────────┼─────────────────────────┼─────────────────────
M7 Work Execution                 │                         │
  Task lifecycle OPEN→COMPLETED    │  Location validation    │  Trigger M3 posting
  Mobile execution                 │  Short pick rule        │
──────────────────────────────────┼─────────────────────────┼─────────────────────
M3 Inventory Core Engine          │                         │
                                  │  InventDim dedup        │  InventTrans (immutable)
                                  │  Atomic posting         │  OnHand update
                                  │  Reversal logic         │
──────────────────────────────────┼─────────────────────────┼─────────────────────
M10 Billing                       │                         │
  Billing events                  │  Rate card lookup       │  Charge lines
  EOD snapshot                    │  Day type factor        │  Debit Note
  Charge calc engine              │  Free days              │  ERP payload
──────────────────────────────────┼─────────────────────────┼─────────────────────
M11 Reporting/Audit               │                         │
  Aggregate all sources           │  (no new business truth)│  Reports / Dashboards
```

---

*TVL SWM System Flow End-to-End — Senior Manager Review Edition*
*Nguồn: Business Rules Document v1.0 + PRD v4.0 + TVL_SWM_overview_spec_module.md*
