# TVL SWM — System Control Map

**Mục tiêu:** Tài liệu kiểm soát kiến trúc hệ thống. Manager và Tech Lead dùng để đảm bảo mọi điểm posting, mọi trigger liên module, mọi ranh giới ngoại lệ đều được build đúng và không bị bỏ sót.

> Tài liệu này **không thay thế** API Spec hay ERD.
> Nó là **bản đồ kiểm soát** — ai sở hữu gì, cái gì kích hoạt cái gì, cái gì không được vi phạm.

---

## MỤC LỤC

1. [Posting Point Map](#1-posting-point-map)
2. [Ledger Integrity Rules](#2-ledger-integrity-rules)
3. [Cross-Module Trigger Map](#3-cross-module-trigger-map)
4. [Exception Boundary Map](#4-exception-boundary-map)
5. [State Machine Summary](#5-state-machine-summary)
6. [Data Ownership Map](#6-data-ownership-map)

---

## 1. POSTING POINT MAP

> **Quy tắc nền:** Chỉ có 6 loại sự kiện được phép tạo InventTrans. Mọi thay đổi tồn kho PHẢI đi qua một trong 6 điểm này. Không có ngoại lệ.

```
★ PP-1   INBOUND          ★ PP-2   PUTAWAY-MOVE
★ PP-3   OUTBOUND         ★ PP-4   VAS
★ PP-5   MOVE/TRANSFER    ★ PP-6   ADJUSTMENT/COUNT
```

### Chi tiết từng Posting Point

| PP | Tên | Trigger (State) | Module trigger | InventTrans type | qty | dim thay đổi | OnHand impact | Billing Event |
|----|-----|----------------|---------------|-----------------|-----|--------------|---------------|---------------|
| ★PP-1 | INBOUND | Receipt → **RECEIVED** | M4 → M3 | INBOUND | +net_weight_kg | RECEIVING loc + owner + AVAILABLE | +qty RECEIVING | ⚡ INBOUND_HANDLING |
| ★PP-2 | PUTAWAY | WorkLine Putaway → **COMPLETED** | M7 → M3 | MOVE | −/+ net_weight_kg | RECEIVING→STORAGE (dim change) | −RECEIVING +STORAGE | — |
| ★PP-3 | OUTBOUND | Shipment → **SHIPPED** | M5 → M3 | OUTBOUND | −shipped_qty | STORAGE loc + owner + AVAILABLE | −qty STORAGE | ⚡ OUTBOUND_HANDLING |
| ★PP-4 | VAS | VAS WO → **COMPLETED** | M9 → M3 | VAS_CONSUME / VAS_PRODUCE | −bulk / +bags / −pkg | owner + STORAGE | −bulk +bags | ⚡ BAGGING_FEE |
| ★PP-5 | MOVE / TRANSFER | WorkLine Move → **COMPLETED** / Transfer → **RECEIVED** | M6/M7 → M3 | MOVE | ± pair (net zero) | location change / warehouse change | net zero total | — |
| ★PP-6 | ADJUSTMENT / COUNT | Adjustment POST / Count APPROVED | M6 → M3 | ADJUSTMENT / CYCLE_COUNT_ADJUST | ± delta | same dim | ±delta | — |

### Posting Point Integrity Check

| Kiểm tra | Rule |
|----------|------|
| Không posting ở state trung gian | Inbound: chỉ RECEIVED. Outbound: chỉ SHIPPED. WEIGHED_IN/PROCESSING/ALLOCATED/PICKING → KHÔNG post |
| Atomic | Mọi posting trong BEGIN…COMMIT. Fail → rollback toàn bộ |
| Immutable | InventTrans đã tạo → KHÔNG UPDATE/DELETE |
| Traceable | Mỗi InventTrans có: ref_type + ref_id + ref_line_id |
| Idempotent | external_id → cùng external_id → trả kết quả cũ, không post mới |
| Reversal | Correction = InventTrans mới ngược chiều (is_reversed=TRUE). Không xóa bản gốc |

---

## 2. LEDGER INTEGRITY RULES

> Đây là các bất biến (invariants) của hệ thống. **Nếu bất kỳ rule nào bị vi phạm, toàn bộ số liệu tồn kho và billing đều không đáng tin.**

### LIR-01 — OnHand Invariant

```
OnHand.physical_qty = SUM(InventTrans.qty WHERE item=X AND dim=Y AND stage=PHYSICAL)
```

- Tính đúng **mọi lúc**, không chỉ sau EOD
- Không có UI/API nào được phép `UPDATE on_hand` trực tiếp
- Mọi thay đổi OnHand phải đi qua Posting Engine (M3)
- **Kiểm tra:** Reconciliation job hàng ngày so sánh on_hand vs SUM(invent_trans) → alert nếu lệch

### LIR-02 — Immutability

```
InventTrans → APPEND ONLY
weighbridge_log → APPEND ONLY
audit_log → APPEND ONLY
daily_storage_snapshot → IMMUTABLE sau khi tạo
debit_note (LOCKED) → IMMUTABLE
```

- Không có `DELETE` trên các bảng trên
- `UPDATE` chỉ được phép cho status fields (e.g. `is_reversed`) — không được phép cho qty/dim
- **Kiểm tra:** DB constraints + audit log ghi mọi UPDATE cố gắng

### LIR-03 — Posting Gate

```
Posting chỉ xảy ra khi document đạt CONFIRMED STATE:
  Inbound → RECEIVED
  Outbound → SHIPPED
  VAS WO → COMPLETED
  Adjustment → POST action
  Move/Transfer → COMPLETED/RECEIVED
```

- Intermediate states KHÔNG post
- State machine phải validate đúng transition trước khi gọi Posting Engine
- **Kiểm tra:** Unit test mỗi state transition → verify InventTrans count

### LIR-04 — Reversal Rule

```
Khi cần correction:
  1. Tạo InventTrans mới: qty = −original_qty, is_reversed = TRUE, original_trans_id = REF
  2. Tạo InventTrans mới: qty = +correct_qty (nếu cần replace)
  3. KHÔNG xóa / UPDATE InventTrans gốc
```

- Double reversal không được phép (kiểm tra: is_reversed = TRUE → không cho reverse tiếp)
- **Kiểm tra:** Test cancel sau post → verify 2 trans (original + reversal) trong ledger

### LIR-05 — Dimension Consistency

```
InventDim Phase 1: Site + Warehouse + Location + Owner + Status
  Batch = NULL  (Phase 2)
  Serial = NULL (Phase 2)
dim_hash = SHA-256(site|warehouse|location|batch|serial|status|owner)
```

- Trước mỗi posting: lookup dim_hash → reuse nếu có, tạo mới nếu chưa
- **Kiểm tra:** UNIQUE constraint trên dim combination table

### LIR-06 — Billing Truth Chain

```
Billing Event → nguồn từ InventTrans đã post
Storage Fee → nguồn từ daily_storage_snapshot đã chốt
Debit Note → nguồn từ Billing Event + Charge Calculation Engine
```

- KHÔNG tính phí từ chứng từ (Receipt/Shipment) trực tiếp
- KHÔNG tính phí nếu InventTrans chưa tồn tại
- **Kiểm tra:** Mỗi billing event có ref_type + ref_id trỏ về InventTrans hoặc snapshot

---

## 3. CROSS-MODULE TRIGGER MAP

> Khi module A đạt trạng thái X → module B tự động làm Y. Đây là xương sống của luồng end-to-end. Nếu một trigger bị missing → flow bị đứt.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CROSS-MODULE TRIGGER CHAIN                              │
└─────────────────────────────────────────────────────────────────────────────┘

M2 Master Data
  └── Activated → unblock M3 InventDim creation (cần owner/item/location valid)

M4 Inbound
  ├── Receipt RECEIVED
  │     ├── [→ M3] POST InventTrans INBOUND
  │     └── [→ M7] CREATE Putaway WorkHeader
  ├── Receipt RECEIVED (via M3 post)
  │     └── [→ M10] CAPTURE billing event INBOUND_HANDLING
  └── Putaway WorkLine COMPLETED (M7 callback)
        ├── [→ M3] POST InventTrans MOVE (RECEIVING→STORAGE)
        └── Receipt state → PUTAWAY

M5 Outbound
  ├── Shipment ALLOCATED
  │     └── [→ M7] CREATE Pick WorkHeader (1 per line)
  ├── All Pick Work COMPLETED (M7 callback)
  │     └── Shipment state → PICKED
  ├── Shipment SHIPPED
  │     ├── [→ M3] POST InventTrans OUTBOUND
  │     └── [→ M10] CAPTURE billing event OUTBOUND_HANDLING
  └── Allocation UNALLOCATE (cancel)
        └── [→ M3] reserved_qty released

M6 Inventory Control
  ├── Move/Transfer COMPLETED
  │     └── [→ M3] POST InventTrans MOVE / TRANSFER
  ├── Adjustment POST
  │     └── [→ M3] POST InventTrans ADJUSTMENT
  └── Cycle Count APPROVED
        └── [→ M3] POST InventTrans CYCLE_COUNT_ADJUST

M7 Work Execution
  ├── WorkLine Putaway COMPLETED
  │     └── [→ M3] POST InventTrans MOVE (callback to M4)
  ├── WorkLine Pick COMPLETED
  │     └── [→ M3] POST InventTrans PICK (callback to M5)
  └── WorkLine Move COMPLETED
        └── [→ M3] POST InventTrans MOVE (callback to M6)

M8 Weighbridge/Integration
  ├── Scale event received
  │     └── [→ M4/M5] DELIVER weighbridge_log to Receipt/Shipment
  ├── OCR extracted
  │     └── [→ M4] PROPOSE Receipt match for WB_OPERATOR confirm
  ├── Mobile sync received
  │     └── [→ M7] APPLY WorkLine completion events (idempotent)
  └── Debit Note LOCKED (M10 callback)
        └── [→ ERP] PUSH one-way payload

M9 VAS
  ├── WO CONFIRMED
  │     └── [→ M3] RESERVE bulk qty (check availability)
  └── WO COMPLETED
        ├── [→ M3] POST VAS_CONSUME (bulk) + VAS_PRODUCE (bags) + VAS_CONSUME (pkg)
        └── [→ M10] CAPTURE billing event BAGGING_FEE

M10 Billing
  ├── EOD 23:59 VN (batch)
  │     └── [→ M10] CREATE daily_storage_snapshot (from M3 OnHand)
  ├── Charge Calculation run
  │     └── [→ M10] CREATE Debit Note DRAFT
  └── Debit Note LOCKED
        └── [→ M8] TRIGGER ERP push

M11 Reporting
  └── (READ ONLY — không trigger gì, chỉ đọc từ M3/M4/M5/M7/M10)
```

### Trigger Dependency Matrix

| Khi module... | Trigger sang... | Loại trigger | Fail nếu thiếu |
|---------------|----------------|-------------|----------------|
| M4: Receipt RECEIVED | M3: POST INBOUND | Sync (trong transaction) | Tồn không tăng |
| M4: Receipt RECEIVED | M7: CREATE Putaway Work | Async (event) | Hàng không có task putaway |
| M4: Receipt RECEIVED | M10: Billing event | Async (event) | Mất phí inbound |
| M5: Shipment ALLOCATED | M7: CREATE Pick Work | Async (event) | Không có task pick |
| M5: Shipment SHIPPED | M3: POST OUTBOUND | Sync | Tồn không giảm |
| M5: Shipment SHIPPED | M10: Billing event | Async | Mất phí outbound |
| M7: WorkLine COMPLETED | M3: POST MOVE/PICK | Sync | Tồn sai vị trí |
| M9: WO COMPLETED | M3: POST VAS | Sync (3 trans) | Bulk không giảm, bags không tăng |
| M9: WO COMPLETED | M10: Billing event | Async | Mất phí VAS |
| M10: DN LOCKED | M8: ERP PUSH | Async | DN không vào ERP |
| M10: EOD 23:59 | M10: Snapshot | Scheduled | Không có storage fee |

---

## 4. EXCEPTION BOUNDARY MAP

> Mỗi exception phải có 1 module DUY NHẤT sở hữu nó. Nếu 2 module cùng xử lý 1 exception → conflict + audit gap.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  EXCEPTION            │ Module sở hữu │ Role xử lý   │ Resolution path  │
├──────────────────────────────────────────────────────────────────────────┤
│  Scale fail/timeout   │ M8            │ WB_OPERATOR  │ Retry 3×30s      │
│                       │               │ WH_MANAGER   │ → Manual entry   │
├──────────────────────────────────────────────────────────────────────────┤
│  OCR low confidence   │ M8            │ WB_OPERATOR  │ Manual confirm   │
├──────────────────────────────────────────────────────────────────────────┤
│  Inbound tol fail     │ M4            │ WB_OPERATOR  │ Re-weigh (max 3) │
│  (REJECTED)           │               │ WH_MANAGER   │ → Cancel nếu 3x  │
├──────────────────────────────────────────────────────────────────────────┤
│  Inbound cancel       │ M4            │ WH_MANAGER   │ CANCELLED        │
│  (sau RECEIVED)       │               │               │ → Reverse M3     │
├──────────────────────────────────────────────────────────────────────────┤
│  Allocation fail      │ M5            │ WH_MANAGER   │ Nguồn: thiếu hàng│
│  (insufficient stock) │               │               │ → Chờ inbound mới│
├──────────────────────────────────────────────────────────────────────────┤
│  Outbound tol fail    │ M5            │ WH_MANAGER   │ PENDING_APPROVAL  │
│  (PENDING_APPROVAL)   │               │               │ → Approve/Reject  │
├──────────────────────────────────────────────────────────────────────────┤
│  Bulk surplus (vượt   │ M5            │ WH_MANAGER   │ BLOCK mặc định    │
│  SO expected qty)     │               │               │ → Override + reason│
├──────────────────────────────────────────────────────────────────────────┤
│  Location mismatch    │ M7            │ WH_KEEPER    │ Re-scan đúng loc  │
│  (scan sai)           │               │ WH_MANAGER   │ → Override + reason│
├──────────────────────────────────────────────────────────────────────────┤
│  Short pick           │ M7            │ WH_KEEPER    │ [TO-CONFIRM]      │
│                       │               │ WH_MANAGER   │ ≤2%/2–5%/>5% rule│
├──────────────────────────────────────────────────────────────────────────┤
│  Source empty         │ M7            │ WH_MANAGER   │ Exception log     │
│  (hàng không có)      │               │               │ → Cycle count     │
├──────────────────────────────────────────────────────────────────────────┤
│  VAS: thiếu bulk      │ M9            │ WH_MANAGER   │ Không cho confirm │
│  khi confirm WO       │               │               │ WO                │
├──────────────────────────────────────────────────────────────────────────┤
│  VAS: cancel mid-run  │ M9            │ WH_MANAGER   │ Reverse partial   │
│                       │               │               │ consume qua M3    │
├──────────────────────────────────────────────────────────────────────────┤
│  Billing: no rate     │ M10           │ BILLING_OFC  │ Flag UNBILLED     │
│  card                 │               │ WH_ADMIN     │ → Setup rate card │
├──────────────────────────────────────────────────────────────────────────┤
│  ERP push fail        │ M8            │ System retry │ Retry auto        │
│                       │               │ BILLING_OFC  │ → Alert sau N fail│
├──────────────────────────────────────────────────────────────────────────┤
│  OnHand ≠ SUM ledger  │ M11           │ OPS_SUPER    │ Flag + alert      │
│  (reconciliation)     │               │ WH_MANAGER   │ KHÔNG auto-fix    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Exception Ownership Rules

| Rule | Mô tả |
|------|-------|
| EX-RULE-01 | M8 sở hữu mọi lỗi kỹ thuật (scale, OCR, mobile sync, ERP). Không escalate business decision. |
| EX-RULE-02 | M4 sở hữu inbound tolerance exception. M8 chỉ cung cấp dữ liệu cân, không quyết định REJECTED/RECEIVED. |
| EX-RULE-03 | M5 sở hữu outbound exception. PENDING_APPROVAL là trạng thái M5 — WH_MANAGER mới resolve được. |
| EX-RULE-04 | M7 sở hữu task-level exception. Location mismatch, short pick thuộc về Work Execution — không escalate lên M4/M5 trực tiếp. |
| EX-RULE-05 | M11 KHÔNG sở hữu exception nào. Chỉ detect và report. Không auto-fix bất cứ discrepancy nào. |
| EX-RULE-06 | Mọi exception ảnh hưởng business PHẢI có: reason_code + user_id + timestamp trong audit_log. |

---

## 5. STATE MACHINE SUMMARY

> Tất cả state machine của hệ thống trong 1 bảng. Dùng để review: state có đủ không, transition có hợp lệ không, posting point có gắn đúng state không.

### Receipt (M4 Inbound)

```
DRAFT
  └─[Confirm]──→ AWAITING_WEIGHING
                    └─[Weigh-In]──→ WEIGHED_IN
                                      └─[Vehicle in yard]──→ PROCESSING
                                                               └─[Weigh-Out]──→ WEIGHED_OUT
                                                                                 └─[Tol PASS]──→ RECEIVED ★PP-1
                                                                                 │                └─[Work done]──→ PUTAWAY ★PP-2
                                                                                 │                                  └─[Close]──→ CLOSED
                                                                                 └─[Tol FAIL]──→ REJECTED
                                                                                                   └─[Re-weigh≤3]──→ AWAITING_WEIGHING (loop)
                                                                                                   └─[3x fail + Manager]──→ CANCELLED

Cancel allowed: DRAFT / AWAITING_WEIGHING / WEIGHED_IN / PROCESSING
Cancel NOT allowed: RECEIVED / PUTAWAY / CLOSED
```

### Shipment (M5 Outbound)

```
DRAFT
  └─[Confirm]──→ CONFIRMED
                   └─[Allocate]──→ ALLOCATED
                                     └─[Pick trigger]──→ PICKING
                                                          └─[All pick done]──→ PICKED
                                                                                └─[Weigh tare]──→ WEIGHING_TARE
                                                                                                  └─[Gross loop]──→ ALL_WEIGHED
                                                                                                                    └─[All pass]──→ SHIPPED ★PP-3
                                                                                                                    │               └─[Close]──→ CLOSED
                                                                                                                    └─[Any fail]──→ PENDING_APPROVAL
                                                                                                                                    └─[Approve]──→ SHIPPED ★PP-3
                                                                                                                                    └─[Reject]──→ CANCELLED

Cancel allowed: DRAFT / CONFIRMED / ALLOCATED / PICKING / PENDING_APPROVAL
Cancel NOT allowed: SHIPPED / CLOSED
```

### WorkHeader (M7 Work Execution)

```
OPEN (assigned_to = NULL)
  └─[Claim]──→ OPEN (assigned_to = keeper_id)  ← Claim KHÔNG đổi state
                └─[Start]──→ IN_PROGRESS
                               └─[All lines done]──→ COMPLETED
                               └─[Cancel]──→ CANCELLED

Note: "CLAIMED" KHÔNG phải là một state. Claim chỉ set assigned_to.
```

### VAS Work Order (M9)

```
DRAFT
  └─[Confirm + stock check]──→ CONFIRMED
                                  └─[Start]──→ IN_PROGRESS (multi-session)
                                                └─[All complete]──→ COMPLETED ★PP-4
                                                └─[Cancel]──→ CANCELLED + Reverse partial consume

Cancel: DRAFT / CONFIRMED / IN_PROGRESS (với reverse)
```

### Debit Note (M10 Billing)

```
DRAFT
  └─[Review]──→ REVIEWED
                  └─[Approve]──→ APPROVED
                                  └─[Lock — BILLING_OFC only]──→ LOCKED (immutable)
                                                                    └─[ERP Push trigger]──→ M8

Note: Không có transition ngược từ LOCKED. [PHASE 2] Credit Note là document riêng.
```

### Inter-Warehouse Transfer (M6)

```
CREATED
  └─[Release]──→ RELEASED
                   └─[Ship]──→ SHIPPED → InventTrans: AVAILABLE→IN_TRANSIT (source)
                                └─[In transit]──→ IN_TRANSIT
                                                    └─[Receive]──→ RECEIVED → InventTrans: IN_TRANSIT→AVAILABLE (dest)
                                                                                └─[Close]──→ CLOSED
```

---

## 6. DATA OWNERSHIP MAP

> Mỗi data entity chỉ được sở hữu và modify bởi 1 module duy nhất. Các module khác chỉ được READ hoặc gọi API của module sở hữu.

| Data Entity | Module sở hữu | Modules có thể READ | Modules KHÔNG được write trực tiếp |
|-------------|--------------|--------------------|------------------------------------|
| **InventDim** | M3 | Tất cả | Tất cả — chỉ M3 tạo mới |
| **InventTrans** | M3 | Tất cả | Tất cả — chỉ M3 append |
| **OnHand** | M3 (derived) | Tất cả | Tất cả — chỉ M3 update (qua posting) |
| **Receipt** | M4 | M7, M8, M11 | M7 (chỉ callback state), M8 (chỉ deliver data) |
| **Shipment** | M5 | M7, M8, M11 | M7 (chỉ callback), M8 (chỉ deliver) |
| **Allocation Record** | M5 | M3, M7 | M3 chỉ đọc reserved_qty |
| **WorkHeader/WorkLine** | M7 | M4, M5, M6, M11 | M4/M5/M6 chỉ trigger tạo, không modify |
| **weighbridge_log** | M8 | M4, M5, M11 | M4/M5 chỉ đọc weight data |
| **VAS Work Order** | M9 | M3, M7, M10, M11 | M3 nhận event, M10 nhận billing event |
| **Billing Event** | M10 | M11 | M4/M5/M9 chỉ trigger capture, không ghi trực tiếp |
| **Storage Snapshot** | M10 | M11 | Chỉ M10 batch job tạo |
| **Debit Note** | M10 | M11, CUST_VIEWER | Không module nào write sau LOCKED |
| **Audit Log** | M1 | ADMIN, M11 | Append-only — không module nào delete |
| **Master Data** | M2 | Tất cả | Chỉ WH_ADMIN/ADMIN qua M2 |

### Ownership Violation Red Flags

```
🚩 M4/M5 UPDATE on_hand trực tiếp
   → Vi phạm LIR-01. Phải gọi M3 Posting Engine.

🚩 M7 tự tạo InventTrans
   → Vi phạm ownership. M7 chỉ gọi M3 POST API.

🚩 M10 đọc Receipt/Shipment để tính phí (bỏ qua InventTrans)
   → Vi phạm LIR-06. Billing phải từ InventTrans + Snapshot.

🚩 M11 INSERT/UPDATE bất kỳ bảng nào
   → M11 là READ ONLY module.

🚩 2 modules cùng handle 1 exception
   → Audit gap. Phải có 1 module duy nhất sở hữu.

🚩 WorkHeader có state "CLAIMED"
   → Claim = set assigned_to. State KHÔNG đổi. OPEN → IN_PROGRESS khi Start.
```

---

## QUICK REFERENCE — MANAGER REVIEW

### Khi review 1 module, hỏi 5 câu này:

```
1. MODULE SỞ HỮU GÌ?
   → Nó là source of truth cho data entity nào?
   → Ai được write, ai chỉ được read?

2. POSTING POINT Ở ĐÂU?
   → State nào trigger InventTrans?
   → Có phải đúng PP-1/PP-2/PP-3/PP-4/PP-5/PP-6 không?

3. TRIGGER SANG MODULE NÀO?
   → Khi module này xong → cái gì tự động xảy ra ở module khác?
   → Trigger sync hay async? Có idempotency không?

4. EXCEPTION THUỘC VỀ AI?
   → Module này sở hữu exception gì?
   → Exception nào nó phải escalate?
   → Có reason code + audit trail không?

5. LEDGER INTEGRITY VI PHẠM KHÔNG?
   → Có bypass posting engine không?
   → Có UPDATE InventTrans/OnHand trực tiếp không?
   → Có posting ở state sai không?
```

---

*TVL SWM System Control Map — Senior Architect Edition*
*Nguồn: Business Rules v1.0 + PRD v4.0 + TVL_SWM_overview_spec_module.md*
*Cập nhật: March 2026*
