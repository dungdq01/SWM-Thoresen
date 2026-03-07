# TVL SWM — System State Machine

**Mục tiêu:** Đặc tả đầy đủ state machine của mọi document trong hệ thống.
Dev dùng để implement đúng transition logic. QA dùng để viết test case đầy đủ.

> **Quy ước:**
> - `[GUARD]` = điều kiện phải đúng trước khi transition được phép
> - `[SIDE EFFECT]` = cái gì tự động xảy ra khi transition thành công
> - `[ROLE]` = ai được phép trigger transition này
> - `★` = posting point (InventTrans được tạo)
> - `⚡` = billing event được capture
> - `🚫` = transition bị block — phải test case negative

---

## MỤC LỤC

1. [Receipt State Machine](#1-receipt-state-machine) — M4 Inbound
2. [Shipment State Machine](#2-shipment-state-machine) — M5 Outbound
3. [WorkHeader State Machine](#3-workheader-state-machine) — M7
4. [WorkLine State Machine](#4-workline-state-machine) — M7
5. [VAS Work Order State Machine](#5-vas-work-order-state-machine) — M9
6. [Debit Note State Machine](#6-debit-note-state-machine) — M10
7. [Inter-Warehouse Transfer State Machine](#7-inter-warehouse-transfer-state-machine) — M6
8. [Inventory Status Transition](#8-inventory-status-transition) — M6
9. [QA Master Test Checklist](#9-qa-master-test-checklist)

---

## 1. RECEIPT STATE MACHINE

**Module:** M4 Inbound Operations
**Object:** Receipt (1 receipt = 1 chuyến xe)

### Sơ đồ

```
                        ┌─────────┐
                        │  DRAFT  │
                        └────┬────┘
                             │ [Confirm]
                             ▼
                   ┌──────────────────┐
                   │ AWAITING_WEIGHING│◄──────────────────────────┐
                   └────────┬─────────┘                           │
                            │ [Weigh-In: scale gross]             │
                            ▼                                     │
                      ┌───────────┐                               │
                      │ WEIGHED_IN│                               │
                      └─────┬─────┘                               │
                            │ [Vehicle enters yard, unloading]    │
                            ▼                                     │
                      ┌────────────┐                              │
                      │ PROCESSING │                              │
                      └─────┬──────┘                              │
                            │ [Weigh-Out: scale tare]             │
                            ▼                                     │
                     ┌─────────────┐                              │
                     │ WEIGHED_OUT │                              │
                     └──────┬──────┘                              │
                            │ [Auto tolerance check]              │
              ┌─────────────┴──────────────┐                      │
         PASS ▼                        FAIL▼                      │
        ┌──────────┐              ┌──────────┐                    │
        │ RECEIVED │★⚡           │ REJECTED │──[Re-weigh]────────┘
        └────┬─────┘              └────┬─────┘   (max 3 attempts)
             │ [Auto: Work created]    │
             │                        │ [3rd fail + Manager]
             ▼                        ▼
        ┌─────────┐             ┌───────────┐
        │ PUTAWAY │             │ CANCELLED │
        └────┬────┘             └───────────┘
             │ [Manager close]
             ▼
        ┌────────┐
        │ CLOSED │
        └────────┘

CANCEL path (direct):
  DRAFT ──────────────────────────────────► CANCELLED
  AWAITING_WEIGHING ──────────────────────► CANCELLED
  WEIGHED_IN ─────────────────────────────► CANCELLED  (WH_MANAGER only)
  PROCESSING ─────────────────────────────► CANCELLED  (WH_MANAGER only)
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| R-01 | DRAFT | AWAITING_WEIGHING | Confirm Receipt | WH_MANAGER / WH_ADMIN | PO/ASN valid; vehicle_number match | Number sequence assigned |
| R-02 | AWAITING_WEIGHING | WEIGHED_IN | Weigh-In event (scale) | WB_OPERATOR / System | weighbridge_log created; gross > 0 | weighbridge_log gắn receipt |
| R-03 | WEIGHED_IN | PROCESSING | Vehicle enters yard | WB_OPERATOR | — | timestamp: processing_started_at |
| R-04 | PROCESSING | WEIGHED_OUT | Weigh-Out event (scale) | WB_OPERATOR / System | weighbridge_log tare created; tare > 0; tare < gross | net_weight_kg = gross − tare |
| R-05 | WEIGHED_OUT | RECEIVED | Auto tolerance check PASS | System | variance_pct ≤ tolerance_pct [TO-CONFIRM 0.5%] | ★ InventTrans INBOUND +net_weight_kg; ⚡ Billing event INBOUND_HANDLING; auto-create Putaway WorkHeader |
| R-06 | WEIGHED_OUT | REJECTED | Auto tolerance check FAIL | System | variance_pct > tolerance_pct | attempt_count++ |
| R-07 | REJECTED | AWAITING_WEIGHING | Re-weigh initiated | WB_OPERATOR | attempt_count < 3 | Giữ receipt number; tạo mới weighbridge_log |
| R-08 | REJECTED | CANCELLED | Manager cancel after 3 fails | WH_MANAGER | attempt_count = 3; re-weigh button locked | Reason code bắt buộc; audit log |
| R-09 | RECEIVED | PUTAWAY | All Putaway WorkLines COMPLETED | System (M7 callback) | WorkHeader status = COMPLETED | InventTrans MOVE posted (RECEIVING→STORAGE) |
| R-10 | PUTAWAY | CLOSED | WH_MANAGER close | WH_MANAGER | No pending WorkLines | Receipt immutable; billing inbound event ready |
| R-11 | DRAFT | CANCELLED | Cancel | WH_MANAGER / WH_ADMIN | No InventTrans exists | — |
| R-12 | AWAITING_WEIGHING | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |
| R-13 | WEIGHED_IN | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |
| R-14 | PROCESSING | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |

### 🚫 Invalid Transitions (phải test BLOCK)

| From | To | Lý do block |
|------|----|-------------|
| RECEIVED | CANCELLED | Đã post InventTrans — phải dùng Inventory Adjustment |
| PUTAWAY | CANCELLED | Đã MOVE — phải dùng Adjustment |
| CLOSED | any | Immutable |
| REJECTED (attempt=3) | AWAITING_WEIGHING | Button locked — chỉ WH_MANAGER cancel |
| PROCESSING | RECEIVED | Phải qua WEIGHED_OUT trước |
| DRAFT | RECEIVED | Không được bỏ qua weighing |

### QA Test Cases — Receipt

| Test ID | Scenario | Expected |
|---------|----------|----------|
| RCV-TC-01 | Happy path: DRAFT → CLOSED | Tất cả states đúng thứ tự; InventTrans INBOUND + MOVE posted |
| RCV-TC-02 | Tolerance fail lần 1 → Re-weigh → Pass | REJECTED → AWAITING_WEIGHING → RECEIVED |
| RCV-TC-03 | Tolerance fail 3 lần | Lần 3: REJECTED; Re-weigh button disabled |
| RCV-TC-04 | Manager cancel sau 3 fail | CANCELLED; reason code required; no InventTrans |
| RCV-TC-05 | Cancel ở DRAFT | CANCELLED; no side effects |
| RCV-TC-06 | Cancel ở PROCESSING | CANCELLED; WH_MANAGER only; reason code |
| RCV-TC-07 | Attempt cancel ở RECEIVED | 🚫 BLOCKED; error message |
| RCV-TC-08 | Attempt cancel ở CLOSED | 🚫 BLOCKED |
| RCV-TC-09 | Scale fail → manual weight | WH_MANAGER only; is_manual_entry=TRUE; reason code |
| RCV-TC-10 | Vessel: OCR match → auto receipt | receipt_type=VESSEL; B/L linked |
| RCV-TC-11 | Vessel: OCR fail → manual | WB_OPERATOR manual select; audit log |
| RCV-TC-12 | Bagged PO: SUM bag_count > PO limit | 🚫 BLOCKED at RECEIVED |
| RCV-TC-13 | Retry create receipt (same external_id) | Idempotent: return existing receipt |
| RCV-TC-14 | Posting only at RECEIVED | InventTrans count = 0 before RECEIVED; = 1 at RECEIVED |

---

## 2. SHIPMENT STATE MACHINE

**Module:** M5 Outbound Operations
**Object:** Shipment (1 shipment = 1 chuyến xe)

### Sơ đồ

```
                      ┌───────┐
                      │ DRAFT │
                      └───┬───┘
                          │ [Confirm]
                          ▼
                    ┌───────────┐
                    │ CONFIRMED │
                    └─────┬─────┘
                          │ [Allocate]
                          ▼
                    ┌───────────┐
                    │ ALLOCATED │
                    └─────┬─────┘
                          │ [Auto: Pick Work created]
                          ▼
                     ┌─────────┐
                     │ PICKING │
                     └────┬────┘
                          │ [All Pick Work COMPLETED]
                          ▼
                     ┌────────┐
                     │ PICKED │
                     └───┬────┘
                         │ [Weigh tare]
                         ▼
                  ┌───────────────┐
                  │ WEIGHING_TARE │
                  └───────┬───────┘
                          │ [Tare confirmed]
                          ▼
              ┌──────────────────────┐
              │  LOADING / GROSS     │ ◄─────┐
              │  LOOP per line       │       │ (repeat per line)
              └──────────┬───────────┘       │
                         │ [Weigh gross line N] ──────────────────┐
                         │                                         │
                    Line PASS                                 Line FAIL
                         │                                         │
                         │                              ┌──────────▼──────────┐
                         │                              │ line: PENDING_APPRVL│
                         │                              │ (loop continues)    │
                         │                              └─────────────────────┘
                         │ [All lines weighed]
                         ▼
                  ┌─────────────┐
                  │ ALL_WEIGHED │
                  └──────┬──────┘
                         │
          ┌──────────────┴───────────────┐
     All pass                      Any PENDING
          │                              │
          ▼                              ▼
     ┌─────────┐               ┌──────────────────┐
     │ SHIPPED │★⚡             │ PENDING_APPROVAL │
     └────┬────┘               └────────┬─────────┘
          │                             │
          │                    ┌────────┴────────┐
          │                 Approve            Reject
          │                    │                 │
          │             ┌──────▼──┐        ┌─────▼─────┐
          │             │ SHIPPED │★⚡      │ CANCELLED │
          │             └─────────┘        └───────────┘
          │
          │ [Close]
          ▼
     ┌────────┐
     │ CLOSED │
     └────────┘

CANCEL path:
  DRAFT / CONFIRMED / ALLOCATED / PICKING / PENDING_APPROVAL → CANCELLED
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| S-01 | DRAFT | CONFIRMED | Confirm Shipment | WH_MANAGER | SO/delivery request exists; lines valid | — |
| S-02 | CONFIRMED | ALLOCATED | Allocate | System / WH_MANAGER | available_qty ≥ requested per line; NO partial [CONFIRMED] | reserved_qty increased per allocation record |
| S-03 | ALLOCATED | PICKING | Auto trigger | System | ALLOCATED complete | Auto-create Pick WorkHeader per line |
| S-04 | PICKING | PICKED | All Pick Work COMPLETED | System (M7 callback) | All WorkHeaders for shipment = COMPLETED | — |
| S-05 | PICKED | WEIGHING_TARE | Weigh tare | WB_OPERATOR | Vehicle on scale | weighbridge_log tare created |
| S-06 | WEIGHING_TARE | LOADING (line loop) | Tare confirmed | WB_OPERATOR | tare > 0 | Line sequence start |
| S-07 | LOADING | GROSS_N (per line) | Weigh gross line N | WB_OPERATOR | gross_N > gross_(N-1) | net_line_N = gross_N − gross_(N-1); weighbridge_log created |
| S-08 | GROSS_N | LOADING (next line) | Line tolerance PASS | System | variance_pct ≤ tol | line_status = LINE_SHIPPED; continue loop |
| S-09 | GROSS_N | PENDING_APPROVAL (line) | Line tolerance FAIL | System | variance_pct > tol | Flag line; continue loop — DO NOT STOP [CONFIRMED] |
| S-10 | ALL_WEIGHED | SHIPPED | All lines pass | System | No PENDING_APPROVAL lines | ★ InventTrans OUTBOUND −qty per line; ⚡ OUTBOUND_HANDLING billing; reserved_qty released |
| S-11 | ALL_WEIGHED | PENDING_APPROVAL | Any line fail | System | ≥1 line PENDING_APPROVAL | Notify WH_MANAGER |
| S-12 | PENDING_APPROVAL | SHIPPED | WH_MANAGER approve | WH_MANAGER | Reason code required | ★ InventTrans OUTBOUND −qty; ⚡ billing; audit log |
| S-13 | PENDING_APPROVAL | CANCELLED | WH_MANAGER reject | WH_MANAGER | Reason code required | Allocation released; reserved_qty = 0 |
| S-14 | SHIPPED | CLOSED | Close | WH_MANAGER | — | Immutable |
| S-15 | DRAFT | CANCELLED | Cancel | WH_MANAGER | — | — |
| S-16 | CONFIRMED | CANCELLED | Cancel | WH_MANAGER | — | — |
| S-17 | ALLOCATED | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released |
| S-18 | PICKING | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released; Cancel Pick WorkHeaders |
| S-19 | PENDING_APPROVAL | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released |

### 🚫 Invalid Transitions

| From | To | Lý do block |
|------|----|-------------|
| CONFIRMED | PICKING | Phải qua ALLOCATED trước |
| ALLOCATED | SHIPPED | Phải qua PICKING → PICKED → WEIGHING |
| SHIPPED | CANCELLED | Đã post InventTrans — phải dùng reversal |
| CLOSED | any | Immutable |
| any | ALLOCATED | Nếu available < requested → FAIL toàn bộ (no partial) |

### QA Test Cases — Shipment

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SHP-TC-01 | Happy path: DRAFT → CLOSED | Tất cả states đúng; InventTrans OUTBOUND posted tại SHIPPED |
| SHP-TC-02 | All lines pass | SHIPPED auto (không qua PENDING_APPROVAL) |
| SHP-TC-03 | 1 line fail tolerance | ALL_WEIGHED → PENDING_APPROVAL (không dừng loop) |
| SHP-TC-04 | Approve PENDING_APPROVAL | SHIPPED; InventTrans posted; audit log |
| SHP-TC-05 | Reject PENDING_APPROVAL | CANCELLED; reserved_qty released |
| SHP-TC-06 | Allocation fail: insufficient | 🚫 FAIL toàn bộ; không partial allocation |
| SHP-TC-07 | Cancel ở ALLOCATED | CANCELLED; reserved_qty = 0; available phục hồi |
| SHP-TC-08 | Cancel ở SHIPPED | 🚫 BLOCKED |
| SHP-TC-09 | Bulk surplus: SUM shipped > SO.expected | 🚫 BLOCKED at gross weighing |
| SHP-TC-10 | DPM: InventTrans dùng actual_net | InventTrans qty = actual_net; billing = bag_count × nominal |
| SHP-TC-11 | Multi-trip flexible sequence | Keeper cân line 3 trước line 1 → accepted; net calc đúng |
| SHP-TC-12 | Posting only at SHIPPED | InventTrans count = 0 trước SHIPPED; = N tại SHIPPED |
| SHP-TC-13 | Split shipment | 1 shipment → 2 shipments; original qty adjusted |

---

## 3. WORKHEADER STATE MACHINE

**Module:** M7 Work Execution
**Object:** WorkHeader (1 header = 1 công việc tổng)

### Sơ đồ

```
         ┌──────────────────────────────────────────────┐
         │                                              │
         │  "CLAIM" = set assigned_to ONLY              │
         │  KHÔNG thay đổi state                        │
         │  WorkHeader vẫn là OPEN sau khi CLAIMED      │
         └──────────────────────────────────────────────┘

    ┌──────┐
    │ OPEN │ ◄── auto-created bởi M4/M5/M6
    └──┬───┘
       │
       │ [Claim] → assigned_to = keeper_id  (state KHÔNG đổi)
       │ [Release Claim] → assigned_to = NULL (state vẫn OPEN)
       │
       │ [Start — chỉ khi đã Claim]
       ▼
  ┌─────────────┐
  │ IN_PROGRESS │
  └──────┬──────┘
         │
         ├─ [All WorkLines COMPLETED/SKIPPED] ──► COMPLETED
         │
         └─ [Cancel] ──────────────────────────► CANCELLED
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| WH-01 | — | OPEN | Auto-create (trigger từ M4/M5/M6) | System | Parent event (Receipt RECEIVED / Shipment ALLOCATED / Move request) | WorkLines created; visible on mobile app |
| WH-02 | OPEN | OPEN (assigned) | Claim | WH_KEEPER | WorkHeader unassigned hoặc user re-claim | `assigned_to = keeper_id`; state KHÔNG đổi |
| WH-03 | OPEN (assigned) | OPEN (unassigned) | Release Claim | WH_KEEPER | Same keeper who claimed | `assigned_to = NULL` |
| WH-04 | OPEN | IN_PROGRESS | Start | WH_KEEPER | `assigned_to = current_user` | `started_at = now()` |
| WH-05 | IN_PROGRESS | COMPLETED | All WorkLines done | System | All WorkLines = COMPLETED or SKIPPED | Callback to M4/M5/M6 với completion event |
| WH-06 | IN_PROGRESS | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc; notify assigned_to |
| WH-07 | OPEN | CANCELLED | Cancel (unstarted) | WH_MANAGER | — | Reason code; notify if assigned |

### 🚫 Invalid Transitions

| From | To | Lý do block |
|------|----|-------------|
| OPEN | IN_PROGRESS | Nếu `assigned_to = NULL` → phải Claim trước |
| COMPLETED | any | Terminal state |
| CANCELLED | any | Terminal state |

### QA Test Cases — WorkHeader

| Test ID | Scenario | Expected |
|---------|----------|----------|
| WRK-TC-01 | Auto-create sau Receipt RECEIVED | WorkHeader OPEN; unassigned; visible on mobile |
| WRK-TC-02 | Claim → state vẫn OPEN | State = OPEN; assigned_to = keeper |
| WRK-TC-03 | Start mà chưa Claim | 🚫 BLOCKED |
| WRK-TC-04 | Claim → Release → Claim by other keeper | OK; assigned_to = new keeper |
| WRK-TC-05 | All WorkLines COMPLETED → WorkHeader COMPLETED | Auto transition; callback fired |
| WRK-TC-06 | Manager cancel IN_PROGRESS work | CANCELLED; reason required; keeper notified |
| WRK-TC-07 | Retry create WorkHeader (same external_id) | Idempotent: no duplicate |

---

## 4. WORKLINE STATE MACHINE

**Module:** M7 Work Execution
**Object:** WorkLine (1 line = 1 bước thao tác cụ thể)

### Sơ đồ

```
    ┌──────┐
    │ OPEN │
    └──┬───┘
       │ [Keeper starts executing this line]
       ▼
  ┌─────────────┐
  │ IN_PROGRESS │
  └──────┬──────┘
         │
         ├─ [Confirm complete: scan location + qty] ──► COMPLETED ★ (InventTrans triggered)
         │
         ├─ [Skip — if SKIPPED logic confirmed] ──────► SKIPPED
         │   [TO-CONFIRM: skip allowed khi nào?]
         │
         └─ [Cancel] ──────────────────────────────── ► CANCELLED
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| WL-01 | — | OPEN | Auto-create khi WorkHeader tạo | System | WorkHeader created | source/destination location set |
| WL-02 | OPEN | IN_PROGRESS | Keeper bắt đầu line này | WH_KEEPER | WorkHeader = IN_PROGRESS | `started_at = now()` |
| WL-03 | IN_PROGRESS | COMPLETED | Complete: scan destination + confirm qty | WH_KEEPER | Location QR scan valid; location_type đúng; qty > 0 | ★ InventTrans triggered (qua M3); `completed_at = now()` |
| WL-04 | IN_PROGRESS | SKIPPED | Skip line | WH_KEEPER / WH_MANAGER | [TO-CONFIRM] skip policy | Log reason; WorkHeader kiểm tra all-done condition |
| WL-05 | IN_PROGRESS | CANCELLED | Cancel line | WH_MANAGER | Reason code | Log; WorkHeader check all-done |

### 🚫 Invalid Transitions

| From | To | Lý do block |
|------|----|-------------|
| OPEN | COMPLETED | Phải qua IN_PROGRESS; phải scan location |
| COMPLETED | any | Terminal; InventTrans đã posted |
| CANCELLED | any | Terminal |

### Location Scan Validation (gắn với WL-03)

| Validate | Rule | Fail action |
|----------|------|-------------|
| Location tồn tại | location_id in DB | Error: location not found |
| Đúng warehouse | location.warehouse_id = WorkLine.warehouse_id | Error: wrong warehouse |
| Đúng location_type | Putaway dest = STORAGE; Pick source = STORAGE/STAGING | Error: wrong type |
| Capacity | dest.current_qty + line.qty ≤ dest.capacity | Warning: near full |

### QA Test Cases — WorkLine

| Test ID | Scenario | Expected |
|---------|----------|----------|
| WRL-TC-01 | Hoàn thành đúng: scan đúng location, qty khớp | COMPLETED; InventTrans posted |
| WRL-TC-02 | Scan sai location (wrong warehouse) | 🚫 BLOCKED; error message |
| WRL-TC-03 | Scan STAGING location cho Putaway dest | 🚫 BLOCKED; must be STORAGE |
| WRL-TC-04 | Complete mà không scan location | 🚫 BLOCKED |
| WRL-TC-05 | Short pick: qty < expected | [TO-CONFIRM] threshold rule apply |
| WRL-TC-06 | Offline complete → sync | Queue locally; sync; idempotent |
| WRL-TC-07 | InventTrans triggered khi COMPLETED | Verify: 1 InventTrans per WorkLine COMPLETED |

---

## 5. VAS WORK ORDER STATE MACHINE

**Module:** M9 VAS / Bagging Operations
**Object:** VAS Work Order

### Sơ đồ

```
    ┌───────┐
    │ DRAFT │
    └───┬───┘
        │ [Confirm + stock validation]
        │ [GUARD: bulk stock ≥ planned_qty]
        ▼
   ┌───────────┐
   │ CONFIRMED │
   └─────┬─────┘
         │ [Start — first session begins]
         ▼
    ┌────────────┐
    │ IN_PROGRESS│ ◄─────────────────────┐
    └─────┬──────┘                       │
          │                              │ [Add session]
          │ [End session, more to go] ───┘
          │
          │ [Complete WO — all sessions done]
          │ [GUARD: actual_output > 0]
          ▼
    ┌───────────┐
    │ COMPLETED │ ★⚡
    └───────────┘

CANCEL paths:
  DRAFT      → CANCELLED (no side effects)
  CONFIRMED  → CANCELLED (no side effects)
  IN_PROGRESS → CANCELLED (MUST reverse any partial VAS_CONSUME)
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| V-01 | DRAFT | CONFIRMED | Confirm WO | WH_MANAGER / OPS_SUPER | bulk_stock ≥ planned_qty; packaging available (if required) | reserved_qty for bulk set |
| V-02 | CONFIRMED | IN_PROGRESS | Start first session | WH_KEEPER | WO = CONFIRMED | Session record created; `started_at = now()` |
| V-03 | IN_PROGRESS | IN_PROGRESS | Add/end session | WH_KEEPER | WO = IN_PROGRESS | Session log: qty, bag_count, is_overtime |
| V-04 | IN_PROGRESS | COMPLETED | Complete WO | WH_MANAGER | actual_output > 0; all sessions accounted | ★ VAS_CONSUME (−bulk), VAS_PRODUCE (+bags), VAS_CONSUME (−pkg if TVL_OWNED) — atomic 3 trans; ⚡ BAGGING_FEE billing event |
| V-05 | DRAFT | CANCELLED | Cancel | WH_MANAGER | — | — |
| V-06 | CONFIRMED | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released |
| V-07 | IN_PROGRESS | CANCELLED | Cancel | WH_MANAGER | Reason code required | ★ Reverse any partial VAS_CONSUME sessions; audit log |

### 🚫 Invalid Transitions

| From | To | Lý do block |
|------|----|-------------|
| DRAFT | CONFIRMED | Nếu bulk stock < planned → FAIL |
| COMPLETED | any | Terminal; 3 InventTrans đã posted |
| CANCELLED | any | Terminal |

### QA Test Cases — VAS Work Order

| Test ID | Scenario | Expected |
|---------|----------|----------|
| VAS-TC-01 | Confirm WO: đủ stock | CONFIRMED; reserved_qty set |
| VAS-TC-02 | Confirm WO: thiếu stock | 🚫 FAIL; error: insufficient bulk |
| VAS-TC-03 | Multi-session complete | IN_PROGRESS → multiple sessions → COMPLETED |
| VAS-TC-04 | Complete: 3 InventTrans atomic | Verify: VAS_CONSUME + VAS_PRODUCE + VAS_CONSUME in same transaction |
| VAS-TC-05 | CLIENT_OWNED packaging | VAS_CONSUME pkg trừ từ client inventory; billing = labor only |
| VAS-TC-06 | TVL_OWNED packaging | VAS_CONSUME pkg trừ từ TVL inventory; billing = labor + material |
| VAS-TC-07 | Cancel IN_PROGRESS | CANCELLED; partial consume sessions reversed |
| VAS-TC-08 | Yield variance | output < planned → reason code required |
| VAS-TC-09 | Billing tier pricing | 800MT → Tier1 (111K/MT); 1200MT → mixed Tier1+Tier2 |

---

## 6. DEBIT NOTE STATE MACHINE

**Module:** M10 Billing & Commercial
**Object:** Debit Note

### Sơ đồ

```
    ┌───────┐
    │ DRAFT │ ◄── Generate từ Charge Calculation Engine
    └───┬───┘
        │ [Re-generate allowed nếu cần điều chỉnh]
        │ [Review by BILLING_OFC]
        ▼
   ┌──────────┐
   │ REVIEWED │
   └────┬─────┘
        │ [Approve]
        ▼
   ┌──────────┐
   │ APPROVED │
   └────┬─────┘
        │ [Lock — BILLING_OFC ONLY]
        ▼
   ┌────────┐
   │ LOCKED │ ──────► [Trigger ERP Push]
   └────────┘

   LOCKED = IMMUTABLE. Không có transition ra khỏi LOCKED.
   [PHASE 2] Credit Note = document riêng, không reverse DN LOCKED.
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| DN-01 | — | DRAFT | Generate Debit Note | System / BILLING_OFC | Billing events exist for period; charge calculation done | Charge lines created với calculation trace |
| DN-02 | DRAFT | DRAFT | Re-generate | BILLING_OFC | DN chưa LOCKED | Charge lines recalculated; previous draft overwritten |
| DN-03 | DRAFT | REVIEWED | Review | BILLING_OFC | All charge lines validated | — |
| DN-04 | REVIEWED | APPROVED | Approve | BILLING_OFC / WH_MANAGER [TO-CONFIRM] | — | — |
| DN-05 | APPROVED | LOCKED | Lock | BILLING_OFC ONLY | — | Immutable; `locked_by`, `locked_at`; trigger ERP push via M8 |

### 🚫 Invalid Transitions

| From | To | Lý do block |
|------|----|-------------|
| LOCKED | any | Immutable — không có transition ra |
| DRAFT | LOCKED | Phải qua REVIEWED và APPROVED |
| APPROVED | DRAFT | Không được đi ngược |

### QA Test Cases — Debit Note

| Test ID | Scenario | Expected |
|---------|----------|----------|
| DN-TC-01 | Generate DN: events và snapshot đúng | DRAFT với charge lines đầy đủ |
| DN-TC-02 | Re-generate DRAFT | Lines cập nhật; previous overwritten |
| DN-TC-03 | Lock DN | LOCKED; immutable |
| DN-TC-04 | Attempt sửa sau LOCK | 🚫 BLOCKED; HTTP 403 |
| DN-TC-05 | Non-BILLING_OFC attempt lock | 🚫 BLOCKED; permission denied |
| DN-TC-06 | ERP push sau LOCK | Push triggered; idempotent (re-push = skip) |
| DN-TC-07 | Storage formula: (Opening+Inbound)×rate | Verify: KHÔNG trừ outbound trong ngày |
| DN-TC-08 | Day type: HOLIDAY event | Rate × 200% |
| DN-TC-09 | Free days: putaway Day 1, free 7 days | Fee chỉ tính từ Day 8 |
| DN-TC-10 | VAT 10% | grand_total = total × 1.10 |

---

## 7. INTER-WAREHOUSE TRANSFER STATE MACHINE

**Module:** M6 Inventory Control
**Object:** Transfer Order

### Sơ đồ

```
   ┌─────────┐
   │ CREATED │
   └────┬────┘
        │ [Release]
        ▼
   ┌──────────┐
   │ RELEASED │
   └────┬─────┘
        │ [Ship from source warehouse]
        ▼
   ┌─────────┐  ★ InventTrans: AVAILABLE → IN_TRANSIT (source)
   │ SHIPPED │     OnHand decreases at source
   └────┬────┘
        │ [In transit — cargo moving]
        ▼
   ┌────────────┐
   │ IN_TRANSIT │
   └─────┬──────┘
         │ [Receive at destination warehouse]
         ▼
   ┌──────────┐  ★ InventTrans: IN_TRANSIT → AVAILABLE (destination)
   │ RECEIVED │     OnHand increases at destination
   └────┬─────┘
        │ [Close]
        ▼
   ┌────────┐
   │ CLOSED │
   └────────┘
```

### Transition Table

| # | From | To | Trigger | Role | Guard Condition | Side Effect |
|---|------|----|---------|------|----------------|-------------|
| TR-01 | — | CREATED | Create Transfer Order | WH_MANAGER | Source stock available | Transfer number assigned |
| TR-02 | CREATED | RELEASED | Release | WH_MANAGER | — | Pick/Move work created |
| TR-03 | RELEASED | SHIPPED | Ship from source | WH_MANAGER | Work COMPLETED | ★ InventTrans: −qty source AVAILABLE; +qty source IN_TRANSIT |
| TR-04 | SHIPPED | IN_TRANSIT | Cargo in transit | System | — | Status tracking; source OnHand decreased |
| TR-05 | IN_TRANSIT | RECEIVED | Receive at dest | WH_MANAGER | [TO-CONFIRM] weighbridge cả 2 đầu? | ★ InventTrans: −qty IN_TRANSIT; +qty dest AVAILABLE; tolerance check ship vs receive |
| TR-06 | RECEIVED | CLOSED | Close | WH_MANAGER | — | Immutable |

### QA Test Cases — Transfer

| Test ID | Scenario | Expected |
|---------|----------|----------|
| TR-TC-01 | Happy path | InventTrans SHIPPED + RECEIVED; net effect: source −qty, dest +qty |
| TR-TC-02 | Source qty = 0 khi ship | 🚫 BLOCKED |
| TR-TC-03 | IN_TRANSIT: không thể allocate | IN_TRANSIT status = not allocatable |
| TR-TC-04 | Qty ship ≠ qty receive | Variance log; [TO-CONFIRM] approval needed? |

---

## 8. INVENTORY STATUS TRANSITION

**Module:** M6 Inventory Control
**Object:** Inventory Status (của từng OnHand record)

### Sơ đồ

```
                    ┌───────────┐
              ┌────►│ AVAILABLE │◄────┐
              │     └─────┬─────┘     │
              │           │           │
         [Un-block]  [Block/Damage] [Un-damage]
              │           │           │
              │     ┌─────▼─────┐     │
              └─────│  BLOCKED  │     │
                    └───────────┘     │
                                      │
                    ┌─────────────┐   │
                    │   DAMAGED   │───┘
                    └─────────────┘

                    ┌────────────┐
                    │ IN_TRANSIT │  (chỉ qua Transfer Order)
                    └────────────┘
                    (AVAILABLE → IN_TRANSIT → AVAILABLE)
```

### Transition Table

| From | To | Trigger | Role | Guard | Side Effect |
|------|----|---------|------|-------|-------------|
| AVAILABLE | BLOCKED | Status Change | WH_MANAGER | Reason code required | InventTrans STATUS_CHANGE; cannot allocate |
| AVAILABLE | DAMAGED | Status Change | WH_MANAGER | Reason code required | InventTrans STATUS_CHANGE; cannot allocate |
| AVAILABLE | IN_TRANSIT | Transfer Ship | System | Transfer Order = SHIPPED | InventTrans −AVAILABLE +IN_TRANSIT |
| BLOCKED | AVAILABLE | Un-block | WH_MANAGER | Reason code required | InventTrans STATUS_CHANGE; can allocate again |
| DAMAGED | AVAILABLE | Un-damage | WH_MANAGER | Reason code required | InventTrans STATUS_CHANGE |
| IN_TRANSIT | AVAILABLE | Transfer Receive | System | Transfer Order = RECEIVED | InventTrans −IN_TRANSIT +AVAILABLE |

### 🚫 Allocation Rules by Status

| Status | Allocatable? |
|--------|-------------|
| AVAILABLE | ✅ YES |
| BLOCKED | 🚫 NO |
| DAMAGED | 🚫 NO |
| IN_TRANSIT | 🚫 NO |

### QA Test Cases — Inventory Status

| Test ID | Scenario | Expected |
|---------|----------|----------|
| INV-TC-01 | Block AVAILABLE stock | BLOCKED; reason required; allocation fail after |
| INV-TC-02 | Allocate BLOCKED stock | 🚫 BLOCKED by allocation engine |
| INV-TC-03 | Un-block → allocate | AVAILABLE again; allocation success |
| INV-TC-04 | Status change without reason code | 🚫 BLOCKED |

---

## 9. QA MASTER TEST CHECKLIST

> Dùng khi review 1 module build xong. Tick qua từng mục trước khi sign-off.

### A. State Machine Coverage

```
[ ] Mọi state đã có trong DB enum/const khớp với spec?
[ ] Mọi VALID transition được phép đúng không?
[ ] Mọi INVALID transition bị block với đúng error code?
[ ] Terminal states (CLOSED, COMPLETED, CANCELLED, LOCKED) không có transition ra?
[ ] Concurrent transition: 2 users cùng trigger cùng lúc → chỉ 1 thành công?
```

### B. Posting Point Coverage

```
[ ] InventTrans chỉ được tạo tại đúng posting point?
[ ] Trước posting point: InventTrans count = 0?
[ ] Tại posting point: InventTrans count tăng đúng?
[ ] Sau cancel trước posting: không có InventTrans?
[ ] Sau cancel sau posting: có reversal InventTrans?
[ ] OnHand = SUM(InventTrans) sau mỗi test case?
```

### C. Role & Permission Coverage

```
[ ] Transition chỉ role được phép mới trigger được?
[ ] Role không có quyền → HTTP 403?
[ ] Reason code bắt buộc khi required (không cho submit nếu thiếu)?
[ ] Audit log ghi đủ: user_id, action, old_state, new_state, timestamp, reason?
```

### D. Idempotency Coverage

```
[ ] Retry với cùng external_id → không tạo duplicate document?
[ ] Retry với cùng external_id → không trigger duplicate posting?
[ ] Mobile offline sync → idempotent khi re-sync?
```

### E. Exception Path Coverage

```
[ ] Happy path test: pass
[ ] Tolerance fail path: pass
[ ] Insufficient stock path: pass
[ ] Scale fail → manual entry path: pass
[ ] Cancel at each allowed state: pass
[ ] Cancel at each blocked state: 🚫 BLOCKED
[ ] 3x re-weigh fail → lock + manager cancel: pass
```

---

*TVL SWM State Machine Specification — Dev & QA Edition*
*Nguồn: PRD v4.0 + Business Rules v1.0 + Work Execution Spec + Reservation Allocation Spec*
*Cập nhật: March 2026*
