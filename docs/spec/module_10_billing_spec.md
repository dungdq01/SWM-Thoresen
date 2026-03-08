# Module 10 — Billing & Commercial Control: Functional Specification

**Version:** 1.1
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Pending Senior Manager Review
**Source:** 5 Check-Report Documents + BRD
**Changelog v1.1:** Add free-days per lot lineage, event ownership contract, day type/OT combined multiplier formula, billable inventory statuses, CUST_VIEWER visibility decision. Per Senior Manager review.

---

## 1. Document Purpose

Dac ta chuc nang Module 10 — Billing & Commercial Control. Module nay tinh phi luu kho, phi xep do, phi dong bao, tao Debit Note va push sang ERP. Day la module anh huong truc tiep den doanh thu TVL.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Rate Card & Contract Setup
- Billing Event Capture (auto tu M4/M5/M9 domain events)
- Daily Storage Snapshot (23:59 EOD batch) with free-day per lot tracking
- Charge Calculation Engine (combined day type + OT formula)
- Debit Note Management (DRAFT → LOCKED)
- Billing Exception & Reconciliation
- VAT 10% calculation

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] Credit Note workflow (sau khi DN LOCKED)
- [PHASE 2] Multi-currency billing
- [PHASE 2] Area-based storage fee (m2-based)
- [PHASE 2] Container stuffing fee (as separate service)
- [OUT OF SCOPE] Payment collection / AR management

---

## 3. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | NumberSequence (DN-), AuditLog, ReasonCode |
| M3 Inventory Core | Uses | daily_storage_snapshot data, OnHand |
| M4 Inbound | Consumes event | M4 publishes INBOUND_HANDLING domain event |
| M5 Outbound | Consumes event | M5 publishes OUTBOUND_HANDLING domain event |
| M9 VAS | Consumes event | M9 publishes BAGGING_FEE domain event |
| M8 Integration | Triggers | DN LOCKED → ERP push |

---

## 4. Design Principles

1. **Storage fee = (Opening + Inbound) x rate. KHONG tru outbound** [CONFIRMED — BR-BIL-001]: Day la core formula.
2. **Max 1 active contract per owner per date range** [CONFIRMED — BR-BIL-006].
3. **Debit Note LOCKED = immutable** [CONFIRMED — BR-BIL-009]: Khong edit sau LOCKED.
4. **VAT 10%** [CONFIRMED — BR-BIL-010]: Applied uniformly.
5. **Billing UOM = MT** [CONFIRMED — BR-BIL-012]: Convert KG → MT (/1000).
6. **Combined day type + OT multiplier** [v1.1 — explicit formula]: See Section 7.3.
7. **EOD snapshot 23:59 Vietnam** [CONFIRMED — BR-BIL-008].
8. **Idempotent event capture** [CONFIRMED]: Same ref_id no duplicate billing events.
9. **Free-days per lot lineage** [v1.1]: Free days calculated from first putaway date per receipt_line, not per aggregate owner/item.
10. **M10 consumes domain events, does NOT derive from raw transactions** [v1.1]: M4/M5/M9 are event publishers. M10 calculates charges from events only.

---

## 5. Billing Event Ownership Contract (v1.1 — NEW)

### 5.1 Event Publisher → Consumer Model

| Domain Event | Publisher | Trigger Point | Consumer |
|-------------|-----------|--------------|----------|
| INBOUND_HANDLING | **M4 Inbound** | Receipt state → RECEIVED | M10 captures, calculates handling fee |
| OUTBOUND_HANDLING | **M5 Outbound** | Shipment state → SHIPPED | M10 captures, calculates handling fee |
| BAGGING_FEE | **M9 VAS** | WO state → COMPLETED | M10 captures, calculates bagging fee |
| STORAGE | **M10 itself** | Daily snapshot batch 23:59 | M10 generates from snapshot data |

### 5.2 Rules
- M10 KHONG tu suy dien billing events tu raw InventTrans.
- M10 chi tinh tien tu domain events published boi M4/M5/M9.
- Storage la ngoai le: M10 tu generate tu snapshot data (vi khong co external trigger).
- Moi event phai co: event_type, ref_id, owner_id, qty, day_type, timestamp, correlation_id.
- M4/M5/M9 chiu trach nhiem dam bao event duoc publish khi state transition xay ra.

### 5.3 Acceptance Criteria
- **AC-EVT-1**: M10 chi capture billing events tu M4/M5/M9 domain events. Khong tu query InventTrans de suy dien.
- **AC-EVT-2**: Missing domain event = billing exception (unbilled activity). M10 flag cho BILLING_OFC.
- **AC-EVT-3**: Duplicate event (same ref_id) → skip (idempotent).

---

## 6. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Rate Card & Contract Setup | Config billing rates per owner |
| 2 | Billing Event Capture | Consume domain events tu M4/M5/M9 |
| 3 | Daily Storage Snapshot | EOD batch job 23:59 with free-day per lot |
| 4 | Charge Calculation Engine | Apply rate card to events/snapshots |
| 5 | Debit Note Management | DRAFT → REVIEWED → APPROVED → LOCKED |
| 6 | Billing Exception & Reconciliation | Unbilled events, orphan detection |
| 7 | Auditability | Full calculation trace, idempotency |

---

## 7. Data Objects & Schema

### 7.1 billing_contract Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| contract_number | VARCHAR(30) | Y | UNIQUE |
| owner_id | FK | Y | |
| effective_from | DATE | Y | |
| effective_to | DATE | Y | |
| is_default | BOOLEAN | Y | Default contract if no specific |
| is_active | BOOLEAN | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 7.2 contract_fee_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| contract_id | FK | Y | → billing_contract |
| fee_type | ENUM | Y | STORAGE / HANDLING_INBOUND / HANDLING_OUTBOUND / BAGGING / STUFFING |
| cargo_form | ENUM | N | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO_1000KG |
| unit_rate | DECIMAL(15,2) | Y | VND per MT (or per unit) |
| minimum_charge | DECIMAL(15,2) | N | |
| free_days | INT | N | Free storage days from first putaway per lot |
| is_active | BOOLEAN | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

**v1.1 change:** Removed day_type_multiplier and ot_multiplier from fee_line. These are now derived from combined formula (Section 8.3) and day_type_calendar, not configured per fee line.

### 7.3 billing_event Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| event_type | ENUM | Y | INBOUND_HANDLING / OUTBOUND_HANDLING / STORAGE / BAGGING_FEE |
| ref_type | ENUM | Y | RECEIPT / SHIPMENT / VAS_WO / SNAPSHOT |
| ref_id | VARCHAR(50) | Y | Source document ID |
| ref_line_id | VARCHAR(50) | N | |
| owner_id | FK | Y | |
| item_id | FK | N | |
| warehouse_id | FK | Y | |
| qty_mt | DECIMAL(15,3) | Y | Billing quantity in MT |
| cargo_form | ENUM | N | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO |
| event_date | DATE | Y | |
| day_type | ENUM | Y | WORKING_DAY / DAY_OFF / HOLIDAY |
| is_overtime | BOOLEAN | Y | Default: FALSE |
| combined_multiplier | DECIMAL(5,2) | Y | See Section 8.3 formula |
| unit_rate | DECIMAL(15,2) | N | Applied rate |
| amount_vnd | DECIMAL(15,2) | N | Calculated amount |
| status | ENUM | Y | CAPTURED / BILLED / UNBILLED |
| debit_note_id | FK | N | Linked DN |
| raw_event_payload | JSON | N | Full event payload tu M4/M5/M9 (for audit + dispute resolution). Stored as-received, immutable. [AI-4 v1.1] |
| external_id | VARCHAR(100) | Y | Idempotency key |
| correlation_id | UUID | Y | |
| created_at | TIMESTAMPTZ | Y | |

### 7.4 daily_storage_snapshot Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| snapshot_date | DATE | Y | |
| warehouse_id | FK | Y | |
| location_id | FK | Y | Only is_billing_location = TRUE |
| owner_id | FK | Y | |
| item_id | FK | Y | |
| receipt_line_id | FK | N | v1.1: For free-day per lot tracking |
| first_putaway_date | DATE | N | v1.1: Date of first putaway for this lot |
| days_in_storage | INT | N | v1.1: snapshot_date - first_putaway_date |
| opening_qty_mt | DECIMAL(15,3) | Y | Previous day closing |
| inbound_today_mt | DECIMAL(15,3) | Y | Received today |
| outbound_today_mt | DECIMAL(15,3) | Y | Shipped today (NOT used in calc) |
| closing_qty_mt | DECIMAL(15,3) | Y | opening + inbound - outbound |
| billable_qty_mt | DECIMAL(15,3) | Y | = opening + inbound (NO outbound deduction) |
| rate_per_mt_day | DECIMAL(15,2) | N | Applied rate |
| daily_amount_vnd | DECIMAL(15,2) | N | billable_qty x rate (0 if free day) |
| is_free_day | BOOLEAN | Y | days_in_storage <= free_days (per contract) |
| inventory_status | ENUM | Y | v1.1: AVAILABLE / DAMAGED / BLOCKED / HOLD |
| is_billable_status | BOOLEAN | Y | v1.1: See Section 9.4 billable statuses |
| cut_off_time | TIMESTAMPTZ | Y | 23:59 Vietnam |
| created_at | TIMESTAMPTZ | Y | Immutable after creation |

**v1.1 changes:**
- Added receipt_line_id, first_putaway_date, days_in_storage for per-lot free-day tracking
- Added inventory_status, is_billable_status for billable status filtering

### 7.5 debit_note Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| dn_number | VARCHAR(30) | Y | UNIQUE: DN-YYYYMMDD-SEQ |
| owner_id | FK | Y | |
| billing_period_start | DATE | Y | |
| billing_period_end | DATE | Y | |
| status | ENUM | Y | DRAFT / REVIEWED / APPROVED / LOCKED |
| total_before_vat | DECIMAL(15,2) | Y | |
| vat_amount | DECIMAL(15,2) | Y | = total x 10% |
| grand_total | DECIMAL(15,2) | Y | = total x 1.10 |
| reviewed_by | VARCHAR | N | |
| reviewed_at | TIMESTAMPTZ | N | |
| approved_by | VARCHAR | N | |
| approved_at | TIMESTAMPTZ | N | |
| locked_by | VARCHAR | N | BILLING_OFC only |
| locked_at | TIMESTAMPTZ | N | |
| erp_push_status | ENUM | N | PENDING / SUCCESS / FAILED |
| external_id | VARCHAR(100) | Y | |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 7.6 debit_note_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| debit_note_id | FK | Y | |
| line_seq | INT | Y | |
| charge_code | VARCHAR(50) | Y | STORAGE / HANDLING_IN / HANDLING_OUT / BAGGING |
| description | VARCHAR(500) | Y | Human-readable |
| qty_mt | DECIMAL(15,3) | Y | |
| unit_rate | DECIMAL(15,2) | Y | |
| combined_multiplier | DECIMAL(5,2) | N | Day type + OT combined |
| amount_vnd | DECIMAL(15,2) | Y | |
| calculation_trace | JSON | Y | Full formula + values for audit |
| billing_event_id | FK | N | Source event |

---

## 8. Billing Formulas

### 8.1 Storage Fee [BR-BIL-001]
```
Daily_Fee = billable_qty_mt x rate_per_mt_per_day
billable_qty_mt = opening_qty_mt + inbound_today_mt
(KHONG tru outbound_today_mt)

Monthly_Fee = SUM(Daily_Fee) for billing period
(Tru free_days: is_free_day = TRUE → daily_fee = 0)
```

### 8.2 Handling Fee [BR-BIL-003]
```
Handling_Fee = net_weight_mt x unit_rate x combined_multiplier

Cargo form rates (VND/MT):
- BULK: 21,000
- BAGGED_25KG: 28,000
- BAGGED_50KG: 28,000
- JUMBO_1000KG: 32,000
```

### 8.3 Combined Day Type + OT Multiplier (v1.1 — Explicit Formula)

**Single multiplier, NOT two separate fields:**

| Day Type | No OT | With OT |
|----------|-------|---------|
| WORKING_DAY | 1.0 | 1.3 |
| DAY_OFF | 1.5 | 2.0 |
| HOLIDAY | 2.0 | 3.0 |

**Usage:**
```
combined_multiplier = lookup(day_type, is_overtime) from table above
fee = qty x unit_rate x combined_multiplier
```

**v1.1 note:** Day type va OT KHONG nhan rieng. Dung 1 lookup table duy nhat. Dev KHONG duoc tu dien day_type_multiplier x ot_multiplier.

Source xac dinh OT:
- Handling (M4/M5): is_overtime flag tu domain event (M4 receipt / M5 shipment — based on operation time)
- Bagging (M9): is_overtime flag tu vas_session. Neu bat ky session is_overtime = TRUE, OT applies.

### 8.4 Bagging Fee [BR-BIL-005]
```
Labor = qty_mt x tier_rate
Tiers:
  0 - 1,000 MT: 111,000 VND/MT
  1,001 - 5,000 MT: 105,000 VND/MT
  > 5,000 MT: 100,000 VND/MT

Material (TVL_OWNED only) = bag_count x cost_per_bag
Total = Labor + Material
```

### 8.5 Free-Days Per Lot (v1.1 — NEW)

```
free_day_check:
  fee_line = contract_fee_line WHERE contract_id = contract.id
              AND fee_type = STORAGE AND cargo_form = snapshot.cargo_form
  IF days_in_storage <= fee_line.free_days THEN is_free_day = TRUE
  days_in_storage = snapshot_date - first_putaway_date (per receipt_line_id)
```

**[AI-3 v1.1 correction]:** free_days la field tren `contract_fee_line` (per fee_type + cargo_form), KHONG phai tren `billing_contract` truc tiep. Moi cargo_form co the co so free_days khac nhau trong cung contract.

**Key rules:**
- free_days tính từ ngày putaway đầu tiên per lot (receipt_line_id)
- Cung item/owner co nhieu lot nhap khac ngay → moi lot co free-day rieng
- Lot A nhap 01/03, lot B nhap 10/03, free_days = 5:
  - Lot A free 01-05/03, billable from 06/03
  - Lot B free 10-14/03, billable from 15/03
- Snapshot grain: per (owner, item, warehouse, location, receipt_line_id)

### 8.6 VAT [BR-BIL-010]
```
VAT = 10%
grand_total = total_before_vat x 1.10
```

### 8.7 UOM Conversion [BR-BIL-012]
```
billing_qty_mt = weight_kg / 1000
```

### 8.8 Rate Card & Contract Acceptance Criteria [AI-1 v1.1 — NEW]
- **AC-RC-1**: Max 1 active contract per owner per date range. Overlap check khi create/update contract (BIL-BR-005).
- **AC-RC-2**: fee_line.free_days configurable per fee_type + cargo_form. Moi cargo_form trong cung contract co the co free_days khac nhau.
- **AC-RC-3**: Contract effective dates enforced — snapshot PHAI dung contract valid tai snapshot_date (KHONG apply expired contract).

### 8.9 Charge Calculation Acceptance Criteria [AI-1 v1.1 — NEW]
- **AC-CALC-1**: combined_multiplier = lookup(day_type, is_overtime) tu table Section 8.3. KHONG nhan rieng day_type_mult x ot_mult.
- **AC-CALC-2**: Storage fee formula: billable_qty = opening + inbound_today. KHONG tru outbound (BIL-BR-001).
- **AC-CALC-3**: calculation_trace JSON luu trong debit_note_line gom: formula name, input values, applied rate, multiplier, result. Full audit trail.
- **AC-CALC-4**: Bagging tier pricing tach dung tier boundary: qty vuot qua tier → tinh split. Vi du: 1,200 MT = 1,000 x 111,000 + 200 x 105,000.

---

## 9. Daily Storage Snapshot

### 9.1 Batch Job
- Run: 23:59 Vietnam timezone (UTC+7) daily [BR-BIL-008]
- Captures per (owner, item, warehouse, location, receipt_line_id):
  - opening_qty_mt (previous day closing for this lot)
  - inbound_today_mt (received today for this lot)
  - outbound_today_mt (shipped today — captured but NOT used in billing)
  - closing_qty_mt = opening + inbound - outbound
  - billable_qty_mt = opening + inbound (NO outbound deduction)
  - first_putaway_date, days_in_storage, is_free_day
- Only locations with is_billing_location = TRUE
- Only billable inventory statuses (see Section 9.4)
- Snapshot immutable after creation

### 9.2 Free Days in Snapshot
- is_free_day = TRUE when days_in_storage <= contract.free_days
- daily_amount_vnd = 0 when is_free_day = TRUE
- Free-day per lot: each receipt_line_id has its own first_putaway_date

### 9.3 Acceptance Criteria
- **AC-3.1**: Snapshot runs 23:59 Vietnam time daily.
- **AC-3.2**: billable_qty = opening + inbound. KHONG tru outbound.
- **AC-3.3**: Only is_billing_location = TRUE locations.
- **AC-3.4**: Free days calculated per lot (receipt_line_id), not per aggregate owner/item.
- **AC-3.5**: Snapshot immutable — cannot edit after creation.
- **AC-3.6**: Only billable inventory statuses included (see Section 9.4).

### 9.4 Billable Inventory Statuses (v1.1 — NEW)

| Status | Billable? | Note |
|--------|-----------|------|
| AVAILABLE | Yes | Normal stock |
| DAMAGED | [TO-CONFIRM — P1 BLOCKER] | See TO-CONFIRM #5 |
| BLOCKED | [TO-CONFIRM — P1 BLOCKER] | See TO-CONFIRM #5 |
| IN_TRANSIT | No | Stock in transit between warehouses |

**[AI-2 v1.1 correction]:** HOLD status da REMOVED — Phase 1 InventStatus chi co: AVAILABLE / DAMAGED / BLOCKED / IN_TRANSIT (theo M3 spec). HOLD khong ton tai trong Phase 1 schema. Snapshot KHONG duoc include HOLD status.

---

## 10. Debit Note State Machine

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|----|------|----|---------|-------|-------|-------------|
| DN-01 | — | DRAFT | Generate DN | BILLING_OFC | Events exist for period | Charge lines created |
| DN-02 | DRAFT | DRAFT | Re-generate | BILLING_OFC | Not yet LOCKED | Lines recalculated |
| DN-03 | DRAFT | REVIEWED | Review | BILLING_OFC | All lines validated | reviewed_by, reviewed_at |
| DN-04 | REVIEWED | APPROVED | Approve | BILLING_OFC / WH_MANAGER [TO-CONFIRM] | — | approved_by, approved_at |
| DN-05 | APPROVED | LOCKED | Lock | BILLING_OFC ONLY | — | locked_by, locked_at; trigger ERP push |

### Forbidden Transitions

| From | Forbidden To | Reason |
|------|-------------|--------|
| LOCKED | Any | Immutable — no transition out |
| DRAFT | LOCKED | Must go through REVIEWED → APPROVED |
| APPROVED | DRAFT | Cannot go backwards |

### 10.1 Debit Note Acceptance Criteria [AI-1 v1.1 — NEW]
- **AC-DN-1**: DN PHAI di qua du cac buoc DRAFT → REVIEWED → APPROVED → LOCKED. Khong skip buoc.
- **AC-DN-2**: DN LOCKED la immutable — khong co edit, delete, hay transition out.
- **AC-DN-3**: DN chuyen sang LOCKED → auto-trigger ERP push (erp_push_status = PENDING → SUCCESS/FAILED).
- **AC-DN-4**: Chi BILLING_OFC moi lock DN. Bat ky role khac → 403 Forbidden.
- **AC-DN-5**: grand_total = total_before_vat x 1.10 (VAT 10%). Round 2 decimal places.

---

## 11. RBAC & Permissions

| Action | WH_ADMIN | BILLING_OFC | WH_MANAGER | CUST_VIEWER |
|--------|----------|-------------|------------|-------------|
| Create/edit rate card | Y | Y | — | — |
| Setup contract | Y | Y | — | — |
| Generate Debit Note | — | Y | — | — |
| Review DN | — | Y | [TO-CONFIRM] | — |
| Approve DN | — | Y | [TO-CONFIRM] | — |
| Lock DN | — | Y (ONLY) | — | — |
| View draft DN | — | Y | [TO-CONFIRM] | — |
| View LOCKED DN | Y | Y | Y | Y (own owner) |
| Export DN | — | Y | Y | Y (own owner, LOCKED only) |
| View billing exceptions | — | Y | — | — |

**v1.1 recommendation:** CUST_VIEWER nen chi xem LOCKED DN (da chot, khong thay doi). Draft/review DN la internal workflow, khong nen expose ra client.

---

## 12. Business Rules

| Rule ID | Rule | BRD Reference |
|---------|------|--------------|
| BIL-BR-001 | Storage = (Opening + Inbound) x rate. No outbound deduction | BR-BIL-001 |
| BIL-BR-002 | Handling = Net Wt x Rate x combined_multiplier (day type + OT) | BR-BIL-003, v1.1 |
| BIL-BR-003 | Combined multiplier: Working 1.0/1.3, DayOff 1.5/2.0, Holiday 2.0/3.0 | BR-BIL-004, v1.1 |
| BIL-BR-004 | Bagging tier: 111K/105K/100K per MT | BR-BIL-005 |
| BIL-BR-005 | Max 1 active contract per owner per date range | BR-BIL-006 |
| BIL-BR-006 | Free days from first putaway per lot (receipt_line_id) | BR-BIL-007, v1.1 |
| BIL-BR-007 | Snapshot 23:59 Vietnam daily | BR-BIL-008 |
| BIL-BR-008 | DN: DRAFT → REVIEWED → APPROVED → LOCKED | BR-BIL-009 |
| BIL-BR-009 | VAT 10% | BR-BIL-010 |
| BIL-BR-010 | ERP push one-way, idempotent | BR-BIL-011 |
| BIL-BR-011 | Billing UOM = MT (KG/1000) | BR-BIL-012 |
| BIL-BR-012 | Billing event capture idempotent via external_id | CFM-09 |
| BIL-BR-013 | M10 consumes domain events from M4/M5/M9. Does NOT derive from raw InventTrans. | v1.1 |
| BIL-BR-014 | CUST_VIEWER sees LOCKED DN only | v1.1 recommendation |

---

## 13. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | POST | /api/v1/billing/contracts | WH_ADMIN, BILLING_OFC | Create contract |
| 2 | GET | /api/v1/billing/contracts | WH_ADMIN, BILLING_OFC | List contracts |
| 3 | GET | /api/v1/billing/contracts/{id} | WH_ADMIN, BILLING_OFC | Get contract detail |
| 4 | PUT | /api/v1/billing/contracts/{id} | WH_ADMIN, BILLING_OFC | Update contract |
| 5 | GET | /api/v1/billing/contracts/{id}/fee-lines | BILLING_OFC | Get fee lines |
| 6 | GET | /api/v1/billing/events | BILLING_OFC | List billing events |
| 7 | POST | /api/v1/billing/charges/calculate | BILLING_OFC | Trigger charge calculation |
| 8 | POST | /api/v1/billing/debit-notes | BILLING_OFC | Generate DN (DRAFT) |
| 9 | GET | /api/v1/billing/debit-notes | BILLING_OFC, CUST_VIEWER | List DNs (CUST_VIEWER: LOCKED only, own owner) |
| 10 | GET | /api/v1/billing/debit-notes/{id} | BILLING_OFC, CUST_VIEWER | Get DN detail |
| 11 | PUT | /api/v1/billing/debit-notes/{id}/review | BILLING_OFC | DRAFT → REVIEWED |
| 12 | PUT | /api/v1/billing/debit-notes/{id}/approve | BILLING_OFC | REVIEWED → APPROVED |
| 13 | PUT | /api/v1/billing/debit-notes/{id}/lock | BILLING_OFC | APPROVED → LOCKED |
| 14 | GET | /api/v1/billing/debit-notes/{id}/export | BILLING_OFC, CUST_VIEWER | Export PDF/Excel (CUST_VIEWER: LOCKED only) |
| 15 | GET | /api/v1/billing/exceptions | BILLING_OFC | Unbilled/orphan events |
| 16 | GET | /api/v1/billing/snapshots | BILLING_OFC | List storage snapshots |
| 17 | POST | /api/v1/billing/day-types | WH_ADMIN | Setup day type calendar |

---

## 14. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline |
|---|------|----------|--------|----------|
| 1 | EOD cut-off: global 23:59 or configurable per warehouse? | **P1 — BLOCKER** | Snapshot timing | Truoc FS M10 |
| 2 | WH_MANAGER approval needed before BILLING_OFC lock? | P1 | DN workflow | Truoc FS M10 |
| 3 | Tier pricing reset: monthly or rolling cumulative? | **P1 — BLOCKER** | VAS billing | Truoc FS M9/M10 |
| 4 | CUST_VIEWER: xem draft DN hay chi LOCKED? (Recommendation: LOCKED only) | P2 | UI permission | Truoc Sprint 2 |
| 5 | DAMAGED/BLOCKED inventory charged storage? | **P1 — BLOCKER** | Storage formula, invoice disputes, billing_event schema requires is_billable_status value | **Truoc Sprint 1 (13/03/2026)** — neu qua han se default: AVAILABLE billable, DAMAGED/BLOCKED NOT billable |
| 6 | Multi-warehouse combined DN or per warehouse? | P2 | DN scope | Truoc FS M10 |

---

## 15. Acceptance Criteria Summary

| Sub-Module | AC Count | AC IDs |
|-----------|----------|--------|
| Rate Card & Contract | 3 | AC-RC-1..3 |
| Billing Event Capture | 3 | AC-EVT-1..3 |
| Daily Storage Snapshot | 6 | AC-3.1..3.6 |
| Charge Calculation | 4 | AC-CALC-1..4 |
| Debit Note | 5 | AC-DN-1..5 |
| Exception / Reconciliation | 3 | (via billing exception reports) |
| **Total** | **24** | |

---

## 16. User Stories

### US-M10-001: Rate Card & Contract Setup
**As a** WH_ADMIN, **I want to** configure billing rates per owner with effective dates and free-day per lot, **so that** fees are calculated correctly per contract.
- **Priority:** MUST HAVE

### US-M10-002: Billing Event Capture
**As a** System, **I want to** consume domain events from M4/M5/M9 to capture billing events, **so that** no billable activity is missed and event ownership is clear.
- **Priority:** MUST HAVE

### US-M10-003: Daily Storage Snapshot
**As a** System, **I want to** capture daily storage snapshots at 23:59 with per-lot free-day tracking, **so that** storage fees are accurately computed per contract terms.
- **Priority:** MUST HAVE

### US-M10-004: Charge Calculation Engine
**As a** BILLING_OFC, **I want to** calculate charges from events and snapshots using rate card with combined day type + OT multiplier, **so that** fees are traceable and correct.
- **Priority:** MUST HAVE

### US-M10-005: Debit Note Management
**As a** BILLING_OFC, **I want to** generate, review, approve and lock Debit Notes, **so that** billing documents are controlled and immutable.
- **Priority:** MUST HAVE

### US-M10-006: Billing Exception
**As a** BILLING_OFC, **I want to** identify unbilled events and reconcile against domain events, **so that** revenue leakage is prevented.
- **Priority:** MUST HAVE

---

## 17. Baseline Source Documents

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_BA_PO_Master.md | US-M10-001..006 |
| 2 | TVL_SWM_StateMachine.md | Debit Note DN-01..DN-05 |
| 3 | TVL_SWM_Business_Rules_Document.md | BR-BIL-001..012 |
| 4 | TVL_SWM_SystemFlow_EndToEnd.md | Billing flow, snapshot |
| 5 | TVL_SWM_SystemControlMap.md | Event choreography |
| 6 | TVL_SWM_UserFlow_A_to_Z.md | BILLING_OFC flows |
| 7 | Module 4 Inbound Spec | INBOUND_HANDLING event trigger |
| 8 | Module 5 Outbound Spec | OUTBOUND_HANDLING event trigger |
| 9 | Module 9 VAS Spec | BAGGING_FEE event trigger, OT source |
