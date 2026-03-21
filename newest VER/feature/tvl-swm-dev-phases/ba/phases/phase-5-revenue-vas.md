# Phase 5: Revenue & VAS — 2 Parallel Tracks

**Devs:** 2 (parallel)
**Effort:** ~3-4 sprints per track
**Blocking:** Phase 4 (operational events trigger billing & VAS)
**Complexity:** HIGH for billing calculation, MEDIUM for VAS

---

## Parallelism Map

```
Phase 4 Done (Inbound + Outbound + Transfer operational)
    │
    ├──► Track 5A: Billing Calculation      ← Dev A
    │    (BillingTransaction, DailyStorageSnapshot,
    │     DebitNote, CreditNote)
    │
    └──► Track 5B: VAS / Bagging            ← Dev B
         (BaggingWorkOrder, BaggingProgress,
          InventTrans for SKU conversion)
```

**Why parallel:** Billing and VAS are completely independent domains. Billing reacts to operational events (receipt, ship). VAS creates its own inventory movements (bulk → bagged SKU conversion).

---

## Track 5A: Billing Calculation Engine (Dev A)

**Entities:** BillingTransaction, DailyStorageSnapshot, DebitNote, DebitNoteLine, CreditNote
**Folder:** `Application/Features/Billing/Calculation/`, `DebitNotes/`, `CreditNotes/`, `Snapshots/`
**Frontend:** `/billing/transactions`, `/billing/snapshots`, `/billing/debit-notes`
**Prerequisites:** Phase 2D (Billing Setup CRUD — FeeType, Contract, etc.)

### Architecture

```
Operational Events                    Billing Engine
────────────────                    ──────────────
Receipt confirmed ──────────────►  BillingTransaction (HANDLING_IN fee)
Ship confirmed    ──────────────►  BillingTransaction (HANDLING_OUT fee)
Bagging completed ──────────────►  BillingTransaction (BAGGING fee)
                                       │
EOD 23:59 UTC+7   ──────────────►  DailyStorageSnapshot
                                       │
                                       ▼
Month-end / On-demand             DebitNote generation
                                   ├── Sum BillingTransactions by fee_type
                                   ├── Calculate storage fees from snapshots
                                   ├── Apply day_type_multiplier
                                   ├── Apply free_days deduction
                                   └── Generate DebitNote + Lines
                                       │
                                       ▼ (if correction needed)
                                   CreditNote (for LOCKED DebitNotes only)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| **Auto-Capture** |
| 5A.1 | BillingTransaction on receipt | Logic | When receipt confirmed → create transaction: HANDLING_IN fee, qty = received_qty, rate from contract | P0 |
| 5A.2 | BillingTransaction on ship | Logic | When order shipped → create transaction: HANDLING_OUT fee, qty = shipped_qty, rate from contract | P0 |
| 5A.3 | BillingTransaction on bagging | Logic | When BWO completed → create transaction: BAGGING fee, qty = actual_qty, rate from contract | P1 |
| 5A.4 | Rate lookup service | Logic | Given owner + fee_type → find active contract → contract_fee_line → unit_price. Apply billing_method logic | P0 |
| **Storage Snapshots** |
| 5A.5 | DailyStorageSnapshot background job | Logic | Run at 23:59 UTC+7 (from system_config.snapshot_time). For each (owner, item, warehouse, status, lot) → snapshot closing qty from on_hand | P0 |
| 5A.6 | Snapshot opening/closing calculation | Logic | opening = previous day closing. inbound/outbound/adjustment = sum of day's invent_trans. closing = opening + inbound - outbound ± adjustment | P0 |
| 5A.7 | Snapshot query | Query | Filter by owner, item, warehouse, date range | P1 |
| **Fee Calculation** |
| 5A.8 | Storage fee calculation | Logic | For date range: sum(closing_qty_mt × daily_rate × day_type_multiplier). Day type from CalendarDetail | P0 |
| 5A.9 | Free days deduction | Logic | 3 modes: PER_CONTRACT (fixed N days), PER_BL (from lot.lot_attr_09 = BL number), PER_RECEIPT (from lot.first_received_date) | P1 |
| 5A.10 | Billing method logic | Logic | FLAT: fixed amount. PER_UNIT: rate × qty. HIGHER_OF_TWO: max(flat, per_unit). TIERED: lookup billing_condition tiers | P0 |
| 5A.11 | Day type multiplier | Logic | WORKING=1.0, DAY_OFF=1.5, HOLIDAY=2.0. Lookup CalendarDetail for each date | P0 |
| **Debit Note** |
| 5A.12 | DebitNote generation | Logic | For owner + period → aggregate billing_transactions + storage fees → create debit_note + debit_note_lines | P0 |
| 5A.13 | DebitNote status machine | Logic | DRAFT → REVIEWED → APPROVED → LOCKED | P0 |
| 5A.14 | DebitNote line breakdown | Logic | Group by fee_type → qty, unit_price, amount per line | P0 |
| 5A.15 | VAT calculation | Logic | vat_amount = total_amount × system_config.vat_rate | P1 |
| 5A.16 | DebitNote CRUD | CRUD | List, detail, update (DRAFT only), approve, lock | P0 |
| **Credit Note** |
| 5A.17 | CreditNote CRUD | CRUD | Create correction for LOCKED debit note. Amount, reason | P2 |
| 5A.18 | CreditNote validation | Logic | Only applicable to LOCKED debit notes. Net amount tracking | P2 |
| **Reporting** |
| 5A.19 | Billing summary report | Query | Owner × period → total by fee group | P1 |
| 5A.20 | Storage occupancy report | Query | Warehouse × date range → daily occupancy from snapshots | P2 |

### API Endpoints

```
# Billing Transaction (read-only — auto-captured)
GET    /api/billing-transactions            ← List (filter: ownerId, feeType, dateRange)

# Daily Storage Snapshot
GET    /api/daily-storage-snapshots         ← List (filter: ownerId, itemId, dateRange)
POST   /api/daily-storage-snapshots/rebuild ← Rebuild snapshots for date range (admin)

# Debit Note
GET    /api/debit-notes                     ← List (filter: ownerId, period, status)
GET    /api/debit-notes/{id}                ← Detail (include lines)
POST   /api/debit-notes/generate            ← Generate for owner + period
PUT    /api/debit-notes/{id}                ← Update (DRAFT only)
POST   /api/debit-notes/{id}/review         ← Move to REVIEWED
POST   /api/debit-notes/{id}/approve        ← Approve
POST   /api/debit-notes/{id}/lock           ← Lock (final)

# Credit Note
GET    /api/credit-notes                    ← List (filter: debitNoteId)
POST   /api/credit-notes                    ← Create (for LOCKED DN only)

# Reports
GET    /api/billing/summary                 ← Billing summary (owner, period)
GET    /api/billing/storage-occupancy       ← Storage occupancy report
```

### Business Rules

- BR-5A-001: BillingTransaction is append-only — corrections via CreditNote only
- BR-5A-002: DailyStorageSnapshot runs at system_config.snapshot_time (default 23:59 UTC+7)
- BR-5A-003: Storage fee = sum(closing_qty_mt × rate × day_type_multiplier) for each day
- BR-5A-004: Free days: days where storage fee = 0. Mode determines how to count
- BR-5A-005: HIGHER_OF_TWO billing: max(flat_amount, per_unit_rate × qty)
- BR-5A-006: DebitNote can only be edited in DRAFT status
- BR-5A-007: CreditNote can only be created for LOCKED DebitNotes
- BR-5A-008: VAT rate from system_config.vat_rate (default 10%)

---

## Track 5B: VAS / Bagging (Dev B)

**Entities:** BaggingWorkOrder, BaggingProgress
**Folder:** `Application/Features/Vas/`
**Frontend:** `/bagging`

### Bagging Flow

```
BWO (DRAFT) ──► (CONFIRMED) ──► (IN_PROGRESS)
                                     │
                                     ├── BaggingProgress sessions
                                     │   (multi-session tracking)
                                     │
                                     ▼
                                (COMPLETED)
                                     │
                                     ├── InventTrans ISSUE: -actual_qty from BULK SKU (source_lot)
                                     ├── InventTrans ISSUE: -bag_count from PACKAGING SKU (if TVL_OWNED)
                                     ├── InventTrans RECEIPT: +actual_qty as BAGGED SKU (new lot)
                                     └── InventTrans ADJUSTMENT: -waste_qty (if > 0)
                                     │
                                     ▼ (if owner.dual_tracking_enabled)
                                     ├── Nominal InventTrans: stage=REGISTERED, is_nominal=TRUE
                                     │   (report only, not materialized)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| **BWO Management** |
| 5B.1 | BaggingWorkOrder CRUD | CRUD | bwo_number (auto), source_item_id (bulk), target_item_id (bagged), packaging_item_id, source_lot_id, source/target_location, FK → Owner | P0 |
| 5B.2 | BWO status machine | Logic | DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED → CANCELLED | P0 |
| 5B.3 | BWO validation | Logic | Source and target must be different items (same owner). Source must be BULK cargo_form. Target must be BAGGED | P0 |
| 5B.4 | Planned vs actual tracking | Logic | planned_qty_kg, planned_bag_count vs actual_qty_kg, actual_bag_count, waste_qty_kg | P0 |
| **Progress Tracking** |
| 5B.5 | BaggingProgress CRUD | CRUD | session_number, bags_this_session, weight_this_session, is_overtime, FK → BWO | P1 |
| 5B.6 | Progress aggregation | Logic | Sum all sessions → update BWO actual_qty, actual_bag_count | P1 |
| 5B.7 | Overtime tracking | Logic | Sessions with is_overtime=true → used for billing (day_type multiplier) | P2 |
| **Completion → Inventory** |
| 5B.8 | BWO complete → InventTrans ISSUE (bulk) | Logic | ISSUE/DEDUCTED: -actual_qty from bulk SKU at source_location (source_lot_id) | P0 |
| 5B.9 | BWO complete → InventTrans ISSUE (packaging) | Logic | If packaging_ownership=TVL_OWNED: ISSUE/DEDUCTED: -bag_count from packaging SKU | P1 |
| 5B.10 | BWO complete → InventTrans RECEIPT (bagged) | Logic | RECEIPT/PHYSICAL: +actual_qty as bagged SKU at target_location. New lot created with source_lot_id for traceability | P0 |
| 5B.11 | BWO complete → waste adjustment | Logic | If waste_qty_kg > 0: ADJUSTMENT/PHYSICAL: -waste_qty from source SKU | P1 |
| 5B.12 | DPM dual tracking | Logic | If owner.dual_tracking_enabled=true: post nominal InventTrans (stage=REGISTERED, is_nominal=true) alongside primary | P2 |
| **Billing Integration** |
| 5B.13 | BWO complete → BillingTransaction | Logic | Auto-create BAGGING fee transaction (consumed by Track 5A debit note generation) | P1 |

### API Endpoints

```
# Bagging Work Order
GET    /api/bagging-work-orders             ← List (DynamicGrid, filter: status, ownerId)
GET    /api/bagging-work-orders/{id}        ← Detail (include progress sessions)
POST   /api/bagging-work-orders             ← Create
PUT    /api/bagging-work-orders/{id}        ← Update (DRAFT only)
POST   /api/bagging-work-orders/{id}/confirm   ← Confirm
POST   /api/bagging-work-orders/{id}/start     ← Start → IN_PROGRESS
POST   /api/bagging-work-orders/{id}/complete  ← Complete → post all InventTrans

# Bagging Progress
POST   /api/bagging-work-orders/{bwoId}/progress   ← Add session
PUT    /api/bagging-progress/{id}                   ← Update session
DELETE /api/bagging-progress/{id}                   ← Remove session (if BWO not completed)

# Reports
GET    /api/bagging/summary                 ← Summary (owner, dateRange, waste %)
```

### Business Rules

- BR-5B-001: Source item must be BULK cargo_form, target must be BAGGED
- BR-5B-002: Source and target must belong to same owner
- BR-5B-003: On completion: 3-4 InventTrans posted atomically (1 transaction)
- BR-5B-004: New bagged lot has source_lot_id = original bulk lot (traceability)
- BR-5B-005: Waste = source_qty - target_qty - remaining_qty
- BR-5B-006: DPM nominal trans: is_nominal=true, stage=REGISTERED (not materialized in on_hand)
- BR-5B-007: Packaging ownership: TVL_OWNED → deduct from TVL stock; CLIENT_OWNED → no deduction

---

## Cross-Track Dependencies

| Track 5A (Billing) | Track 5B (VAS) |
|---------------------|----------------|
| Consumes BillingTransaction from 5B.13 | Creates BillingTransaction on BWO complete |
| Uses contract/rate setup from Phase 2D | Uses IInventTransService from Phase 3B |
| Reads DailyStorageSnapshot (self-generated) | Uses ILotService from Phase 3A |
| Independent otherwise | Independent otherwise |

### Integration Point

Track 5B creates BillingTransaction on BWO completion (5B.13). Track 5A's DebitNote generation (5A.12) aggregates ALL billing transactions including these. No coordination needed beyond the shared BillingTransaction entity.

---

## Definition of Done

### Track 5A (Billing)
- [ ] Handling IN/OUT fees auto-captured on receipt/ship events
- [ ] Daily storage snapshot runs correctly at configured time
- [ ] Storage fee calculation matches: qty × rate × day_type_multiplier
- [ ] Free days correctly deducted (all 3 modes)
- [ ] DebitNote generation aggregates all fees correctly
- [ ] DebitNote status machine: DRAFT → REVIEWED → APPROVED → LOCKED
- [ ] CreditNote only creatable for LOCKED debit notes
- [ ] VAT calculation correct

### Track 5B (VAS)
- [ ] BWO create → confirm → start → complete full flow
- [ ] On completion: bulk deducted, bagged received, waste adjusted (atomic)
- [ ] New bagged lot traces back to source bulk lot
- [ ] Packaging deduction only for TVL_OWNED
- [ ] Multi-session progress tracking works
- [ ] DPM nominal transactions created when enabled
- [ ] Billing transaction auto-created on completion
