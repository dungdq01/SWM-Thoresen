# Feature Specification: Outbound Flow Redesign

> **Feature**: Outbound Flow Redesign — Weigh-First + Cascading WEIGH-OUT
> **CR Reference**: CR-001
> **Version**: 1.0
> **Date**: 2026-03-17
> **Status**: Draft
> **Author**: BA Team

---

## 1. Overview & Business Context

### 1.1 Problem Statement

The current outbound flow follows an **Allocate-first** model:
```
CREATE ORDER → ALLOCATE → PICK → LOAD → WEIGH-IN → WEIGH-OUT → SHIP
```

This does not reflect the physical reality of bulk cargo logistics at TVL warehouses, where:
- The **empty truck must be weighed first** (WEIGH-IN) before any goods are loaded
- Multiple SKUs on a single truck require **per-SKU weighing** after each load operation
- The current batch-oriented approach (allocate all, pick all, load all) does not support interleaved per-SKU operations

### 1.2 Proposed Solution

Redesign the outbound flow to a **Weigh-first** model with **cascading per-SKU WEIGH-OUT**:
```
CREATE ORDER → WEIGH-IN (empty truck)
  → [Per SKU: ALLOCATE+PICK → LOAD → WEIGH-OUT (cascading)]
  → SHIP (all lines Weighed)
```

### 1.3 Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Interleaved per-SKU** — LOAD SKU-1 → WEIGH-OUT SKU-1 → LOAD SKU-2 → ... | Matches physical warehouse operation: one SKU loaded and weighed at a time |
| 2 | **Keep old endpoints deprecated but functional** | Backward compatibility; gradual migration |
| 3 | **Ship requires ALL lines Weighed** | Ensures complete weight accountability before truck leaves |
| 4 | **WeighbridgeLog table stays unchanged** — no new fields | Existing schema already supports cascading via PreviousLogId |
| 5 | **WeighOut auto-resolve via DocumentNumber + OrderDetailId** | Consistent with existing auto-resolve pattern |

---

## 2. New Flow Diagram

### 2.1 High-Level Flow

```
                    ┌─────────────┐
                    │ CREATE ORDER│
                    │  (Draft)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  WEIGH-IN   │  ← Empty truck on weighbridge
                    │  (Weighing) │     Gross = truck weight, Tare = null
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  Per SKU (interleaved)  │  ← Order status → Processing
              │                         │
              │  ┌───────────────────┐  │
              │  │ ALLOCATE + PICK   │  │  FIFO allocation + STORAGE→STAGING
              │  │ (Line → Picked)   │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │      LOAD         │  │  STAGING→SHIPPING
              │  │ (Line → Loaded)   │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │    WEIGH-OUT      │  │  Cascading: Gross=prev Tare
              │  │ (Line → Weighed)  │  │  Net = |current - prev|
              │  └───────────────────┘  │
              │                         │
              │  ← Repeat for next SKU  │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │    SHIP     │  ← Requires ALL lines Weighed
                    │  (Shipped)  │     DEDUCTED from SHIPPING + Reverse EXPECTED
                    └─────────────┘
```

### 2.2 Cascading WEIGH-OUT Example (3 SKUs)

```
WBLog#0 (WEIGH-IN):  Gross=10,000  Tare=null       ← empty truck
WBLog#1 (WEIGH-OUT): Gross=10,000  Tare=25,000  Net=15,000  ← SKU-1, PrevLogId=#0
WBLog#2 (WEIGH-OUT): Gross=25,000  Tare=38,000  Net=13,000  ← SKU-2, PrevLogId=#1
WBLog#3 (WEIGH-OUT): Gross=38,000  Tare=50,000  Net=12,000  ← SKU-3, PrevLogId=#2
```

**Chain logic**: Each WEIGH-OUT's Gross = previous log's Tare (the last known total weight on the scale).

---

## 3. Business Rules

| Rule ID | Category | Description |
|---------|----------|-------------|
| BR-OUT-001 | Sequencing | WEIGH-IN must occur before any ALLOCATE operation. Order must be in Draft or Confirmed status. |
| BR-OUT-002 | Sequencing | ALLOCATE+PICK are combined into a single operation, processed per OrderLine (not batch). |
| BR-OUT-003 | Sequencing | WEIGH-OUT must occur after LOAD for each line. OrderDetail.LineStatus must be Loaded. |
| BR-OUT-004 | Calculation | Cascading gross: WBLog[N].GrossWeightKg = WBLog[N-1].TareWeightKg |
| BR-OUT-005 | Calculation | Net weight: NetWeightKg = \|TareWeightKg - GrossWeightKg\| for each cascading log |
| BR-OUT-006 | Validation | Single SKU order produces 1 WEIGH-OUT log; multi-SKU order produces N WEIGH-OUT logs (one per line) |
| BR-OUT-007 | Constraint | WEIGH-OUT must specify which OrderDetail (SKU) is being weighed via OrderDetailId parameter |
| BR-OUT-008 | Derivation | OrderDetail.WeighedQtyKg = WBLog.NetWeightKg for the matching OrderDetail |
| BR-OUT-009 | Sequencing | Interleaved per-SKU cycle: ALLOCATE+PICK(line) → LOAD(line) → WEIGH-OUT(line), repeated for each line |
| BR-OUT-010 | Sequencing | LOAD per-line: only lines with LineStatus = Picked can be loaded |
| BR-OUT-011 | Constraint | SHIP requires ALL OrderDetails to have LineStatus = Weighed. If any line is not Weighed, Ship is blocked. |
| BR-OUT-012 | Constraint | WEIGH-OUT requires OrderDetail.LineStatus = Loaded |

### Unchanged Rules (carried forward)

| Rule ID | Description |
|---------|-------------|
| BR-4B-003 | FIFO allocation by lot (unchanged) |
| BR-4B-004 | Allocation expires after 24h (unchanged) |
| BR-4B-005 | Cannot ship more than allocated quantity (unchanged) |

---

## 4. Status Transitions

### 4.1 OrderStatus (Header Level)

```
Draft → Confirmed → Weighing → Processing → Shipped
                                                ↑
  Cancelled ← (any state except Shipped) ───────┘
```

| Status | Trigger | Description |
|--------|---------|-------------|
| Draft | Order created | Initial state |
| Confirmed | SO approved, order ready | Order confirmed and ready for weighbridge |
| Weighing | WEIGH-IN completed | Empty truck has been weighed |
| Processing | First line ALLOCATE+PICK | Interleaved per-SKU operations in progress |
| Shipped | SHIP command (all lines Weighed) | All goods shipped, InventTrans DEDUCTED |
| Cancelled | Manual cancellation | Order cancelled (from any state except Shipped) |

**Removed statuses** (vs. previous 13-value enum): Allocated, PartialAllocated, Picking, PartialPicked, Picked, Loading, PartialLoaded, Loaded, AllWeighed, PendingApproval, Closed.

**Rationale**: The header no longer tracks granular per-line states. Each line independently tracks its own lifecycle. The header uses a simplified state machine.

### 4.2 OrderDetailStatus (Line Level)

```
Pending → Picked → Loaded → Weighed → Shipped
                                         ↑
  Cancelled ← (any state except Shipped) ┘
```

| Status | Trigger | Description |
|--------|---------|-------------|
| Pending | Order created | Line not yet processed |
| Picked | ALLOCATE+PICK completed | FIFO allocated + picked (STORAGE → STAGING) |
| Loaded | LOAD completed | Goods moved to truck (STAGING → SHIPPING) |
| Weighed | WEIGH-OUT completed | Net weight recorded via cascading weighbridge |
| Shipped | SHIP completed | InventTrans DEDUCTED from SHIPPING |
| Cancelled | Manual cancellation | Line cancelled |

**Removed statuses** (vs. previous 12-value enum): Open, Allocated, PartialAllocated, PartialPicked, Staged, Loading, PartialLoaded, Weighing, Blocked.

**Rationale**: Per-line processing eliminates all "partial" states. Each line is either fully at a step or not.

---

## 5. Cascading Weighbridge Logic

### 5.1 WEIGH-IN (Step 1)

| Field | Value | Source |
|-------|-------|--------|
| Type | WEIGH_IN | Fixed |
| GrossWeightKg | Measured (empty truck) | Weighbridge scale |
| TareWeightKg | null | Not yet known |
| NetWeightKg | null | Calculated at WEIGH-OUT |
| PreviousLogId | null | First log in chain |
| DocumentNumber | Order.OrderNumber | Auto-resolve |

**Precondition**: Order.Status in {Draft, Confirmed}
**Post-condition**: Order.Status = Weighing

### 5.2 WEIGH-OUT (Step 2..N — per SKU)

For the Kth SKU (K = 1, 2, ..., N):

| Field | Value | Source |
|-------|-------|--------|
| Type | WEIGH_OUT | Fixed |
| GrossWeightKg | WBLog[K-1].TareWeightKg | Previous log's tare (chain) |
| TareWeightKg | Measured (truck + all loaded SKUs so far) | Weighbridge scale |
| NetWeightKg | \|TareWeightKg - GrossWeightKg\| | Calculated |
| PreviousLogId | WBLog[K-1].Id | Chain reference |
| DocumentNumber | Order.OrderNumber | Auto-resolve |
| OrderDetailId | Parameter from API call | Identifies which SKU |

**Special case (K=1)**: GrossWeightKg = WEIGH-IN log's GrossWeightKg (empty truck weight).

**Precondition**: OrderDetail.LineStatus = Loaded
**Post-condition**: OrderDetail.LineStatus = Weighed, OrderDetail.WeighedQtyKg = NetWeightKg

### 5.3 Auto-Resolve Logic

The WEIGH-OUT endpoint resolves business keys to internal IDs:
- `DocumentNumber` → resolves to OrderHeader via order_number lookup
- `OrderDetailId` parameter → directly identifies which line/SKU is being weighed
- System chains via `PreviousLogId` automatically (finds the latest WEIGH-OUT or WEIGH-IN for this order)

---

## 6. InventTrans Flow (Per Line)

| Step | Trans Type | Stage | From Location | To Location | Effect on on_hand |
|------|-----------|-------|---------------|-------------|-------------------|
| SO Approved | ISSUE | EXPECTED | - | - | outbound_ordered ↑ |
| Allocate | ISSUE | ALLOCATED | - | - | allocated_qty ↑ |
| Pick | ISSUE | PHYSICAL | STORAGE | STAGING | physical_qty change (STORAGE ↓, STAGING ↑) + DE_ALLOCATED |
| Load | ISSUE | PHYSICAL | STAGING | SHIPPING | physical_qty change (STAGING ↓, SHIPPING ↑) |
| Weigh-Out | - | - | - | - | No InventTrans (weighbridge data only) |
| Ship | ISSUE | DEDUCTED | SHIPPING | - | physical_qty ↓ at SHIPPING + Reverse EXPECTED |
| Post-ship residual | RECEIPT | PHYSICAL | SHIPPING | STAGING | Auto return + putaway |

---

## 7. API Changes Summary

### 7.1 New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/order-details/{id}/allocate-and-pick` | POST | Combined allocate + pick for a single order line |
| `/order-details/{id}/load` | POST | Load a single order line (Picked → Loaded) |

### 7.2 Modified Endpoints

| Endpoint | Change | Details |
|----------|--------|---------|
| `POST /orders/{id}/weigh-in` | Precondition change | Now requires Draft/Confirmed (was Loaded/PartialLoaded) |
| `POST /orders/{id}/weigh-out` | Rewrite | Cascading per-SKU; requires params: OrderDetailId, WeightKg |
| `POST /orders/{id}/ship` | Validation change | Requires ALL lines LineStatus = Weighed |

### 7.3 Deprecated Endpoints (functional but discouraged)

| Endpoint | Replacement |
|----------|-------------|
| `POST /orders/{id}/allocate` | Use `/order-details/{id}/allocate-and-pick` per line |
| `POST /orders/{id}/pick` | Use `/order-details/{id}/allocate-and-pick` per line |
| `POST /orders/{id}/load` | Use `/order-details/{id}/load` per line |

Deprecated endpoints internally call the per-line logic in batch for all eligible lines.

---

## 8. Acceptance Criteria

### AC-1: WEIGH-IN Before Allocation
- **Given** an Order in Draft or Confirmed status
- **When** operator performs WEIGH-IN with empty truck
- **Then** a WeighbridgeLog is created (Type=WEIGH_IN, Gross=measured, Tare=null) and Order.Status transitions to Weighing

### AC-2: Combined Allocate+Pick Per Line
- **Given** an Order in Weighing status and an OrderDetail in Pending status
- **When** operator triggers allocate-and-pick for a specific line
- **Then** FIFO allocation is performed, pick work is created (STORAGE → STAGING), OrderDetail.LineStatus = Picked, and Order.Status = Processing

### AC-3: Load Per Line
- **Given** an OrderDetail in Picked status
- **When** operator triggers load for that line
- **Then** InventTrans pair (STAGING → SHIPPING) is posted, OrderDetail.LineStatus = Loaded

### AC-4: Cascading WEIGH-OUT (Single SKU)
- **Given** an Order with 1 line, that line in Loaded status
- **When** operator performs WEIGH-OUT
- **Then** a WeighbridgeLog is created with Gross = WEIGH-IN's Gross, Tare = measured weight, Net = |Tare - Gross|, and OrderDetail.WeighedQtyKg = Net

### AC-5: Cascading WEIGH-OUT (Multi-SKU)
- **Given** an Order with 3 lines, SKU-1 already Weighed, SKU-2 in Loaded status
- **When** operator performs WEIGH-OUT for SKU-2
- **Then** WBLog is created with Gross = SKU-1's WBLog Tare, Tare = new measured weight, Net = |Tare - Gross|, PreviousLogId = SKU-1's WBLog Id

### AC-6: Ship Blocked Until All Lines Weighed
- **Given** an Order where 2 of 3 lines are Weighed and 1 is Loaded
- **When** operator attempts to Ship
- **Then** the system rejects with error "All order lines must be in Weighed status before shipping"

### AC-7: Ship Success
- **Given** an Order where ALL lines have LineStatus = Weighed
- **When** operator triggers Ship
- **Then** InventTrans DEDUCTED is posted for each line from SHIPPING, EXPECTED is reversed, Order.Status = Shipped, all lines LineStatus = Shipped

### AC-8: Interleaved Flow End-to-End
- **Given** an Order with 2 SKUs
- **When** operator follows: WEIGH-IN → AllocPick(SKU-1) → Load(SKU-1) → WeighOut(SKU-1) → AllocPick(SKU-2) → Load(SKU-2) → WeighOut(SKU-2) → Ship
- **Then** 1 WEIGH-IN log + 2 WEIGH-OUT logs are created with correct chaining, both lines reach Shipped status, and all inventory is correctly deducted

### AC-9: Deprecated Endpoints Still Work
- **Given** an Order in Weighing status with multiple lines in Pending
- **When** operator calls the deprecated `POST /orders/{id}/allocate`
- **Then** all eligible lines are allocated+picked in batch (internally calls per-line logic)

### AC-10: Header Status Simplification
- **Given** an Order going through the full flow
- **Then** the header status transitions only through: Draft → Confirmed → Weighing → Processing → Shipped (no intermediate partial states)

---

## 9. Data Model Impact

### 9.1 Enum Changes

| Enum | Old Values (count) | New Values (count) |
|------|-------------------|-------------------|
| OrderStatus | 13 values (Draft, Confirmed, Allocated, PickInProgress, Picked, Loading, Loaded, Weighing, AllWeighed, PendingApproval, Shipped, Closed, Cancelled) | 6 values (Draft, Confirmed, Weighing, Processing, Shipped, Cancelled) |
| OrderDetailStatus | 12 values (Open, Allocated, PickInProgress, Picked, Staged, Loading, Loaded, Weighing, Weighed, Shipped, Cancelled, Blocked) | 6 values (Pending, Picked, Loaded, Weighed, Shipped, Cancelled) |

### 9.2 WeighbridgeLog Table

No schema changes. The existing table already has `PreviousLogId` for chaining. The auto-resolve fields (ResolvedItemId, ResolvedOrderDetailId, etc.) are already defined in the data model sketch and will be implemented as part of the weighbridge v5.1 work.

### 9.3 OrderDetail Table

No new columns. Existing `WeighedQtyKg` and `NetWeightKg` fields are used to store the cascading WEIGH-OUT results.

---

## 10. Migration & Backward Compatibility

### 10.1 Enum Migration

Orders in-progress at migration time need status mapping:
- Allocated, PartialAllocated, Picking, PartialPicked, Picked → **Processing**
- Loading, PartialLoaded, Loaded → **Processing**
- AllWeighed, PendingApproval → **Processing**
- Closed → **Shipped**

### 10.2 API Deprecation Strategy

Old endpoints remain functional but emit deprecation warnings in response headers. Frontend should migrate to per-line endpoints. Old endpoints internally delegate to per-line logic.

---

## Appendix A: Comparison — AS-IS vs TO-BE

| Aspect | AS-IS | TO-BE |
|--------|-------|-------|
| WEIGH-IN timing | After LOAD | Before ALLOCATE (empty truck) |
| Allocation granularity | Batch (all lines) | Per line |
| Pick granularity | Batch (all lines) | Per line (combined with allocate) |
| Load granularity | Batch (all lines) | Per line |
| WEIGH-OUT model | Single weigh | Cascading per SKU |
| Ship precondition | Loaded or Weighing | ALL lines Weighed |
| Header status values | 13 | 6 |
| Line status values | 12 | 6 |
| WBLog chain | Not used for outbound | PreviousLogId chain per SKU |
