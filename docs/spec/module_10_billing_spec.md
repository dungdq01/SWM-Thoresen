# Module 10 — Billing & Commercial Control: Functional Specification

**Version:** 1.2
**Created:** 2026-03-08
**Revised:** 2026-03-09
**Status:** DRAFT — Enriched for Functional / Technical Handover
**Source:** 5 Check-Report Documents + BRD
**Changelog v1.1:** Add free-days per lot lineage, event ownership contract, day type/OT combined multiplier formula, billable inventory statuses, CUST_VIEWER visibility decision. Per Senior Manager review.
**Changelog v1.2:** Preserve original spec and append success criteria, non-goals, cross-module ownership matrix, billing input contracts, rate precedence, detailed storage rules, exception handling, API functional contract, ERP push contract, UI/report scope, UAT catalog, open decision register.

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
## 3A. Module Goal, Success Criteria, Non-Goals (v1.2 — NEW)

### 3A.1 Goal
Module 10 dam bao moi hoat dong billable trong kho SWM duoc thu thap, tinh phi, kiem soat, phat hanh Debit Note va dong bo ERP mot cach truy vet duoc, idempotent va khong that thoat doanh thu.

### 3A.2 Success Criteria
- Khong bo sot billable activity tu cac luong Inbound / Outbound / VAS / Storage.
- Moi debit note co the truy vet nguoc ve contract, fee line, domain event hoac snapshot.
- Debit Note LOCKED la immutable, khong bi sua tay sau khi chot.
- ERP push khong bi duplicate, co retry va co lich su trang thai day du.
- Billing exception duoc hien thi ro rang de BILLING_OFC xu ly truoc khi chot DN.

### 3A.3 Non-Goals / Explicit Exclusions
- Khong quan ly thu tien, cong no, doi soat thanh toan.
- Khong tu dong phat sinh credit note trong Phase 1.
- Khong ho tro multi-currency trong Phase 1.
- Khong cho phep M10 tu suy dien billable event tu raw InventTrans.
- Khong cho phep user sua tay snapshot da chot hoac DN da LOCKED.

---

## 3B. Cross-Module Boundary & Ownership Matrix (v1.2 — NEW)

| Object / Capability | Owner Module | M10 Role | Note |
|---|---|---|---|
| Owner / Item / Warehouse / Location master | M2 | Read-only | M10 khong tao master data |
| Billing contract / fee line / day type calendar | M10 + reference tu M2 governance | Owner | M10 quan ly du lieu tinh phi |
| OnHand / lot lineage / receipt_line lineage | M3 | Read-only | Nguon truth cho snapshot reconciliation |
| Inbound handling completion | M4 | Consume event | M10 khong tu xac dinh RECEIVED |
| Outbound handling completion | M5 | Consume event | M10 khong tu xac dinh SHIPPED |
| Bagging completion / OT flag | M9 | Consume event | M10 tinh phi dua tren event M9 |
| ERP integration | M8 | Publish locked DN payload | M10 tao payload business; M8 thuc hien ket noi |
| Audit log / number sequence | M1 | Use shared service | DN numbering, action trace |

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
---

## 18. Billing Input Contract by Event Type (v1.2 — NEW)

### 18.1 Common Input Contract
Tat ca domain events dua vao M10 deu phai co toi thieu cac field sau:

| Field | Required | Description |
|---|---|---|
| event_type | Y | INBOUND_HANDLING / OUTBOUND_HANDLING / BAGGING_FEE |
| external_id | Y | Idempotency key duy nhat tren toan he thong |
| correlation_id | Y | Correlate giua transaction va billing |
| source_module | Y | M4 / M5 / M9 |
| occurred_at | Y | Thoi diem su kien xay ra tai module goc |
| event_date | Y | Ngay hach toan billing |
| owner_id | Y | Chu hang |
| warehouse_id | Y | Kho phat sinh |
| qty_mt | Y | So luong billing sau quy doi MT |
| cargo_form | N | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO_1000KG |
| day_type | Y | WORKING_DAY / DAY_OFF / HOLIDAY |
| is_overtime | Y | TRUE / FALSE |
| ref_id | Y | Receipt / Shipment / WO ID |
| ref_line_id | N | Dong nguon neu co |

### 18.2 INBOUND_HANDLING
- **Source module:** M4
- **Trigger:** Receipt state chuyen sang `RECEIVED`
- **Billing quantity basis:** net_weight_mt cua receipt line da nhan
- **Ref object:** `receipt_id`, `receipt_line_id`
- **Mandatory extra fields:** vehicle_type (neu sau nay pricing can), receipt_type, weighbridge_ref neu co
- **Idempotency:** unique theo `external_id`; recommend format `M4-INBOUND-{receipt_line_id}-{event_version}`
- **Validation:** owner/item/warehouse phai ton tai; qty_mt > 0; day_type phai ton tai trong calendar

### 18.3 OUTBOUND_HANDLING
- **Source module:** M5
- **Trigger:** Shipment state chuyen sang `SHIPPED`
- **Billing quantity basis:** mac dinh = `actual_shipped_mt`; rieng luong DPM co the can them `nominal_qty_mt` de report doi chieu
- **Ref object:** `shipment_id`, `shipment_line_id`
- **Mandatory extra fields:** shipment_type, truck_no / barge_no neu co, dpm_mode flag neu applicable
- **Validation:** qty_mt > 0; shipment phai o terminal state billable
- **Rule:** M10 su dung qty billing duoc publish boi M5, khong tu suy dien lai tu transaction lines

### 18.4 BAGGING_FEE
- **Source module:** M9
- **Trigger:** WO state chuyen sang `COMPLETED`
- **Billing quantity basis:** completed output qty_mt cua WO
- **Ref object:** `wo_id`, `wo_line_id`
- **Mandatory extra fields:** bag_type, bag_count, material_owner_type (CUSTOMER_PROVIDED / TVL_OWNED), session_count
- **OT rule:** neu bat ky session trong WO co `is_overtime = TRUE` thi event set `is_overtime = TRUE`
- **Validation:** bag_count phai co khi material fee ap dung

### 18.5 Event Capture Failure Policy
- Payload invalid schema → status `REJECTED`, ghi error_code, khong tinh phi.
- Payload hop le nhung thieu contract/rate → status `CAPTURED` + flag `EXCEPTION_REQUIRED`.
- Duplicate `external_id` → bo qua, khong tao them billing_event.

---

## 19. Storage Billing Logic Detail (v1.2 — NEW)

### 19.1 Snapshot Grain
Snapshot chuan duoc tao theo to hop: `(snapshot_date, warehouse_id, location_id, owner_id, item_id, receipt_line_id, inventory_status)`

### 19.2 Snapshot Rules
1. `opening_qty_mt` = closing_qty_mt cua snapshot ngay T-1 cung grain.
2. `inbound_today_mt` = tong qty duoc putaway vao grain trong ngay T.
3. `outbound_today_mt` = tong qty xuat kho khoi grain trong ngay T.
4. `closing_qty_mt` = opening + inbound - outbound.
5. `billable_qty_mt` = opening + inbound. Khong tru outbound trong ngay.
6. Snapshot chi lay location co `is_billing_location = TRUE`.
7. Snapshot phai dong bo theo gio Vietnam (UTC+7).
8. Neu khong tim thay contract hieu luc tai `snapshot_date` thi snapshot van duoc tao nhung `daily_amount_vnd = NULL`, flag exception.

### 19.3 Free-Day Detailed Rule
- `first_putaway_date` la ngay putaway dau tien cua chinh `receipt_line_id`.
- `days_in_storage = snapshot_date - first_putaway_date + 1` neu business quy uoc tinh ngay dau tien la day 1.
- Truong hop business quy uoc khac, phai chot trong Open Decision Register.
- `is_free_day = TRUE` khi `days_in_storage <= free_days` cua fee line storage phu hop.
- Khong duoc gop nhieu lot de tinh free-day theo owner/item aggregate.

### 19.4 Billable Status Rule
- AVAILABLE: mac dinh billable.
- DAMAGED / BLOCKED: dang cho business chot. Trong khi chua chot, he thong phai luu ro `is_billable_status` va co kha nang re-run calculation.
- IN_TRANSIT: khong bill.

### 19.5 Backdated Correction / Rebuild Rule
- Neu phat hien sai lineage hoac backdated transaction anh huong snapshot da tao, he thong khong sua tay tung dong snapshot.
- Cach xu ly: tao `rebuild job` cho date range bi anh huong, danh dau version moi, giu audit version cu.
- Neu DN da LOCKED va snapshot rebuild lam doi so tien, dua vao exception workflow; Phase 1 khong tao credit note tu dong.

### 19.6 Storage Calculation Trace
Moi debit_note_line loai STORAGE phai luu:
- snapshot_date
- receipt_line_id
- opening_qty_mt
- inbound_today_mt
- outbound_today_mt
- billable_qty_mt
- free_days
- days_in_storage
- is_free_day
- applied_rate
- computed_amount

---

## 20. Rate Resolution & Contract Versioning (v1.2 — NEW)

### 20.1 Contract Selection Precedence
Khi tinh phi cho 1 event / snapshot, he thong chon contract theo thu tu uu tien sau:
1. Contract cua owner co hieu luc tai `event_date` / `snapshot_date`, match warehouse neu contract co scope warehouse.
2. Contract owner-level default co hieu luc tai ngay tinh phi.
3. Neu khong tim thay → tao exception `MISSING_CONTRACT`, khong auto-fallback ve gia hardcode.

### 20.2 Fee Line Selection Precedence
Trong 1 contract, fee line duoc chon theo thu tu:
1. Match exact `fee_type + cargo_form + warehouse_scope + day_type_scope`
2. Match `fee_type + cargo_form + warehouse_scope`
3. Match `fee_type + cargo_form`
4. Match `fee_type` general default
5. Khong tim thay → `MISSING_RATE`

### 20.3 Overlap & Effective Date Rule
- Khong cho phep 2 contract active overlap cung owner trong cung date range scope.
- Update contract phai qua validation overlap truoc khi save.
- Contract het hieu luc khong duoc ap cho event/snapshot co ngay nam ngoai range.

### 20.4 Versioning Rule
- Contract / fee line sau khi da duoc dung de tinh DN LOCKED thi khong duoc sua silent overwrite.
- Neu can thay doi gia, tao version moi voi effective_from moi.
- Mọi debit_note_line phai luu reference contract_id + fee_line_id da ap dung tai thoi diem tinh phi.

---

## 21. Exception & Reconciliation Scenarios (v1.2 — NEW)

| Code | Scenario | Detection | System Action | User Action |
|---|---|---|---|---|
| EX-BIL-001 | Missing contract | Event/snapshot khong tim thay contract hieu luc | Tao exception, khong tinh amount | BILLING_OFC bo sung contract / rate, re-calc |
| EX-BIL-002 | Missing rate | Co contract nhung khong co fee line phu hop | Tao exception | Cap nhat fee line, re-calc |
| EX-BIL-003 | Duplicate event | Trung `external_id` | Skip event moi, ghi audit | Khong can action |
| EX-BIL-004 | Invalid payload | Schema/event data sai | Reject + log | Publisher module fix, replay |
| EX-BIL-005 | Late event after DN LOCKED | Event_date thuoc ky da lock | Tao exception `LATE_EVENT_LOCKED_PERIOD` | Xu ly thuong mai / ky sau theo quyet dinh business |
| EX-BIL-006 | Snapshot rebuild impact | Rebuild thay doi amount da tinh | Tao exception severity HIGH | Review thu cong, quyet dinh adjustment |
| EX-BIL-007 | ERP push failed | Push response failed / timeout | Retry theo policy | Theo doi push history |
| EX-BIL-008 | Event vs transaction truth mismatch | Qty event lech so voi reconciliation query | Tao exception | Kiem tra M4/M5/M9 va M3 |

### 21.1 Reconciliation Controls
- Reconcile so luong event INBOUND_HANDLING voi so receipt lines RECEIVED trong M4.
- Reconcile so luong event OUTBOUND_HANDLING voi shipment lines SHIPPED trong M5.
- Reconcile BAGGING_FEE voi WO COMPLETED trong M9.
- Reconcile snapshot closing qty voi M3 onhand/cuoi ngay theo grain tuong ung.

### 21.2 Late Event Policy (Phase 1 Proposed Default)
- Event den muon sau khi DN LOCKED **khong** tu dong mo khoa DN.
- Event duoc dua vao exception queue.
- BILLING_OFC quyet dinh dua vao DN ky sau hoac xu ly ngoai he thong.
- Credit note / debit adjustment chinh thuc thuoc Phase 2.

---

## 22. API Functional Contract Detail (v1.2 — NEW)

### 22.1 POST `/api/v1/billing/contracts`
**Purpose:** Tao contract billing cho owner.

**Minimum request:**
```json
{
  "owner_id": "OWN-001",
  "effective_from": "2026-03-01",
  "effective_to": "2026-12-31",
  "is_default": true,
  "fee_lines": [
    {
      "fee_type": "STORAGE",
      "cargo_form": "BULK",
      "unit_rate": 12000,
      "free_days": 5
    }
  ]
}
```

**Validation:**
- owner_id bat buoc ton tai.
- effective_from <= effective_to.
- Khong overlap contract active.
- fee_lines khong duoc trung `fee_type + cargo_form + scope`.

**Business errors:**
- `BIL-CONTRACT-409-OVERLAP`
- `BIL-CONTRACT-400-INVALID_DATE_RANGE`
- `BIL-CONTRACT-404-OWNER_NOT_FOUND`

### 22.2 POST `/api/v1/billing/debit-notes`
**Purpose:** Generate DRAFT debit note cho owner / period.

**Minimum request:**
```json
{
  "owner_id": "OWN-001",
  "billing_period_start": "2026-03-01",
  "billing_period_end": "2026-03-31",
  "warehouse_scope": ["WH-A"],
  "idempotency_key": "DNGEN-OWN001-202603"
}
```

**Rules:**
- Idempotent theo `idempotency_key`.
- Khong generate trung 2 DN DRAFT cho cung owner + period + scope neu config khong cho phep.
- Neu con exception severity HIGH thi co the chan generate hoac generate voi warning flag, tuy theo config.

### 22.3 PUT `/api/v1/billing/debit-notes/{id}/review`
- Guard: DN dang o DRAFT.
- Side effect: gan `reviewed_by`, `reviewed_at`.
- Error: `409 INVALID_STATE` neu DN khong o DRAFT.

### 22.4 PUT `/api/v1/billing/debit-notes/{id}/approve`
- Guard: DN dang o REVIEWED.
- Actor: BILLING_OFC; WH_MANAGER neu business chot co tham gia.
- Error: `403 FORBIDDEN_ROLE`, `409 INVALID_STATE`.

### 22.5 PUT `/api/v1/billing/debit-notes/{id}/lock`
- Guard: DN dang o APPROVED.
- Actor: BILLING_OFC only.
- Side effect: set `locked_at`, `locked_by`, `erp_push_status=PENDING`, tao outbox message ERP.
- Idempotency: lock API phai idempotent; goi lap lai tren DN da LOCKED tra ve ket qua thanh cong hien tai, khong push them lan nua.

### 22.6 GET Endpoints General Rules
- List API phai support filter, sort, pagination.
- Date filter theo timezone Vietnam.
- CUST_VIEWER chi duoc xem du lieu owner cua minh va DN status LOCKED.
- Export API chi xuat du lieu tu DN da ton tai, khong tu tinh lai real-time.

---

## 23. ERP Push Contract & Retry Policy (v1.2 — NEW)

### 23.1 Trigger
- Trigger khi DN chuyen `APPROVED -> LOCKED`.
- Payload duoc dong goi tu header + lines cua DN LOCKED.

### 23.2 Payload Logical Fields
**Header:** dn_number, owner_code, billing_period_start, billing_period_end, total_before_vat, vat_amount, grand_total, currency=VND

**Line:** charge_code, description, qty_mt, unit_rate, multiplier, amount_vnd, source_ref_id

### 23.3 Push State
- `PENDING`: vua lock, chua gui hoac dang cho worker.
- `SUCCESS`: ERP xac nhan thanh cong.
- `FAILED`: gui that bai, cho retry / manual action.

### 23.4 Retry Policy
- Retry tu dong toi da 3 lan theo exponential backoff.
- Sau 3 lan that bai → giu `FAILED`, tao exception va thong bao BILLING_OFC.
- Push phai idempotent theo `dn_number` hoac integration key.

### 23.5 Audit Fields
Can luu: request payload hash, response code, response body rut gon, pushed_at, retried_count, integration_correlation_id.

---

## 24. UI / Report Scope (v1.2 — NEW)

### 24.1 Screens
1. Contract List / Contract Detail
2. Billing Event Queue
3. Storage Snapshot Inquiry
4. Billing Exception Queue
5. Debit Note List / Detail
6. ERP Push History
7. Export Center (PDF / Excel)

### 24.2 Key Columns
**Billing Event Queue:** event_date, event_type, ref_id, owner, warehouse, qty_mt, day_type, is_overtime, status, exception_flag

**Exception Queue:** exception_code, severity, ref_id, owner, detected_at, root_cause, resolution_status

**Debit Note List:** dn_number, owner, period, status, total_before_vat, vat_amount, grand_total, erp_push_status

### 24.3 Customer Visibility
- CUST_VIEWER chi xem DN `LOCKED`.
- Khong xem draft lines, exception queue, snapshot raw data, calculation internals.

---

## 25. UAT Scenario Catalog (v1.2 — NEW)

| UAT ID | Scenario | Expected Result |
|---|---|---|
| UAT-M10-001 | Tao contract khong overlap | Save thanh cong |
| UAT-M10-002 | Tao contract overlap date range | Bi chan voi error overlap |
| UAT-M10-003 | INBOUND_HANDLING event hop le | Tao billing_event CAPTURED |
| UAT-M10-004 | Duplicate inbound event | Khong tao duplicate |
| UAT-M10-005 | Snapshot ngay co inbound va outbound | billable_qty = opening + inbound |
| UAT-M10-006 | Free-day theo 2 lot nhap khac ngay | Moi lot free-day doc lap |
| UAT-M10-007 | Handling ngay nghi co OT | Dung combined multiplier 2.0 / 3.0 theo rule |
| UAT-M10-008 | Bagging 1,200 MT | Tinh tach tier 1,000 + 200 |
| UAT-M10-009 | Missing rate | Tao exception, khong tinh amount |
| UAT-M10-010 | Generate DN cho ky hop le | Tao DRAFT DN + lines |
| UAT-M10-011 | Review -> Approve -> Lock | Dung state machine, khong skip buoc |
| UAT-M10-012 | Goi lock API lap lai | Khong push ERP duplicate |
| UAT-M10-013 | ERP push fail 3 lan | DN giu FAILED + co lich su retry |
| UAT-M10-014 | Late event sau ky da lock | Tao exception `LATE_EVENT_LOCKED_PERIOD` |
| UAT-M10-015 | CUST_VIEWER truy cap DN DRAFT | Bi tu choi |

---

## 26. Open Decision Register (v1.2 — NEW)

| Decision ID | Decision | Current Status | Default / Recommendation | Impacted Sections | Owner |
|---|---|---|---|---|---|
| ODR-M10-001 | EOD cut-off global hay per warehouse | OPEN | Phase 1 nen global 23:59 Vietnam de don gian hoa doi soat | 9, 19, batch schedule | Business + Ops |
| ODR-M10-002 | WH_MANAGER co approve DN hay khong | OPEN | Neu governance don gian: BILLING_OFC tu review/approve, manager chi xem bao cao | 10, 11, 22 | Finance / Ops |
| ODR-M10-003 | Tier pricing reset monthly hay rolling | OPEN | Khuyen nghi monthly theo billing period de de giai thich invoice | 8.4, 25 | Business Commercial |
| ODR-M10-004 | DAMAGED/BLOCKED co bill storage hay khong | OPEN | Mac dinh tam thoi: AVAILABLE billable, DAMAGED/BLOCKED not billable neu chua chot | 9.4, 19.4 | Business + Customer Service |
| ODR-M10-005 | Multi-warehouse gop 1 DN hay tach DN | OPEN | Khuyen nghi gop theo owner + period, line co warehouse dimension | 14, 22 | Finance |
| ODR-M10-006 | Day 1 free-day counting inclusive hay exclusive | OPEN | Khuyen nghi inclusive de de thong nhat van hanh | 8.5, 19.3 | Business |

---

## 27. BA Recommendations for Next Handover Step (v1.2 — NEW)

1. Chot toan bo Open Decision Register truoc khi freeze FS / API spec.
2. Viet OpenAPI / request-response JSON chi tiet cho cac API side-effect.
3. Thiet ke outbox + retry worker cho ERP push de dam bao idempotency.
4. Bo sung test data matrix cho owner, cargo_form, day_type, OT, free_days, status.
5. Dong bo Module 10 voi M4/M5/M9 ve external_id format va event payload schema.
