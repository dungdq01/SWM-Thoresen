# Module 9 — VAS / Bagging Operations: Functional Specification

**Version:** 1.2
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Enhanced by BA Review v1.2
**Source:** 5 Check-Report Documents + BRD
**Changelog v1.1:** Fix packaging ownership model (Model A — always consume), cancel/reversal logic (no session-level posting), reservation contract with M5, approval workflow decision, yield variance formula. Per Senior Manager review against M3/M5/M10 baseline.
**Changelog v1.2:** Added cross-module ownership matrix (M3/M5/M7/M10), M3 data contract impact, build-ready API contract details, detailed state transition catalog, exception & error matrix, formula & rounding catalog, billing event contract, UAT matrix, and reclassified build blockers. Priority on additive updates; original content retained.

---

## 1. Document Purpose

Dac ta chuc nang Module 9 — VAS (Value Added Services) / Bagging Operations. Module nay quan ly quy trinh dong bao (bagging): tu hang xa (bulk) thanh hang bao (bagged), voi tracking tien do, quan ly bao bi, va tu dong tao billing event.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- VAS Work Order Management (DRAFT → COMPLETED)
- Bulk Consumption & Finished Goods Output (InventTrans atomic)
- Packaging Material Ownership (TVL_OWNED / CLIENT_OWNED — both consume from inventory)
- Multi-session Progress Tracking (progress only — no session-level posting)
- VAS Billing Event Capture (tiered pricing)
- VAS Exception Handling (shortage, yield variance, cancel)
- Inventory Reservation Contract with M5

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] Blending operations
- [PHASE 2] Container stuffing (as VAS — M10 handles billing)
- [PHASE 2] Rework workflow (reverse completed WO)
- [PHASE 2] Session-level inventory posting
- [OUT OF SCOPE] QC lab integration

---

## 3. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | NumberSequence (VAS-), ReasonCode, AuditLog |
| M2 Master Data | Uses | Item (bulk product, bagged product, packaging), Owner |
| M3 Inventory Core | Uses | InventTrans posting (VAS_CONSUME, VAS_PRODUCE), OnHand query |
| M5 Outbound | Contract | M5 allocation MUST exclude VAS-reserved qty. See Section 6. |
| M10 Billing | Triggers | WO COMPLETED → BAGGING_FEE event |

---

## 4. Design Principles

1. **All InventTrans posting ONLY at WO COMPLETED** [CONFIRMED — BR-VAS-003, v1.1 clarified]: Sessions ghi progress only. KHONG post inventory mid-session. Chi khi WO COMPLETED moi post atomic batch.
2. **Always consume packaging from inventory** [v1.1 — Model A adopted]: Ca TVL_OWNED va CLIENT_OWNED deu tao VAS_CONSUME cho packaging. Chi khac: billing material chi tinh cho TVL_OWNED.
3. **Multi-session tracking** [CONFIRMED — BR-VAS-005]: 1 WO co the chay nhieu session (nhieu ngay, nhieu ca). Session = progress log, khong co inventory impact.
4. **Stock validation on confirm** [CONFIRMED — BR-VAS-002]: Confirm WO chi khi bulk on-hand >= planned_qty AND packaging available.
5. **Idempotency via external_id** [CONFIRMED — CFM-09].
6. **VAS reservation visible to M5** [v1.1]: Reserved qty phai duoc M5 nhin thay de tranh over-allocate.
7. **Phase 1: No WO approval step** [v1.1 — DECIDED]: DRAFT → CONFIRMED truc tiep boi WH_MANAGER. Khong co PENDING_APPROVAL state.

---

## 5. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | VAS Work Order Management | Tao, confirm, complete, cancel WO |
| 2 | Bulk Consumption & Output | Atomic InventTrans posting at COMPLETED |
| 3 | Packaging Material Ownership | TVL_OWNED vs CLIENT_OWNED — both consume, billing differs |
| 4 | Progress Tracking | Multi-session, overtime, productivity (no inventory posting) |
| 5 | Inventory Reservation Contract | Reserve qty visible to M5 allocation |
| 6 | Billing Event Capture | Tiered pricing + material cost |
| 7 | Exception Handling | Shortage, yield variance, cancel |
| 8 | Auditability | Idempotency, correlation, audit |

---

## 6. Inventory Reservation Contract with M5 (v1.1 — NEW)

### 6.1 Reserve Dimension

Khi WO CONFIRMED, M9 reserve stock tai exact InventDim:

| Dimension | Value | Note |
|-----------|-------|------|
| item_id | bulk_source_item_id | Exact item |
| owner_id | WO owner_id | Exact owner |
| warehouse_id | WO warehouse_id | Exact warehouse |
| location_id | [TO-CONFIRM] Specific location or any STORAGE | See TO-CONFIRM #6 |
| inventory_status | AVAILABLE | Only available stock |

### 6.2 Reserve Mechanism

```
On WO CONFIRMED:
  reserved_qty += planned_qty_kg
  (at exact dim above)

On WO COMPLETED:
  reserved_qty -= actual_qty_kg
  (consumed via VAS_CONSUME InventTrans)

On WO CANCELLED (from CONFIRMED or IN_PROGRESS):
  reserved_qty -= planned_qty_kg
  (release, no InventTrans — just reservation release)
```

### 6.3 M5 Allocation Contract

M5 tinh available qty cho allocation:
```
available_qty = on_hand_qty - reserved_qty_shipment - reserved_qty_vas
```

**Mechanism: Shared reserved_qty fields tren on_hand table [CONFIRMED — ADR v1.1]**

- on_hand table co 2 reserved fields rieng biet:
  - `reserved_qty_shipment`: M5 tang/giam khi allocate/cancel/ship shipment
  - `reserved_qty_vas`: M9 tang/giam khi confirm/cancel/complete VAS WO
- M5 allocation check: `available = physical_qty - reserved_qty_shipment - reserved_qty_vas`
- Uu diem: 1 query atomic, khong coupling M5↔M9 qua API call
- M3 (OnHand schema) phai reflect 2 fields nay — can sync voi M3 spec truoc Sprint 1

**Ly do chon Option A (shared field) thay Option B (API query):**
- Option B (M5 goi M9 API) tao circular dependency risk va adds latency to allocation hot path
- Option A don gian hon, atomic update trong cung DB transaction khi M9 confirm WO

### 6.4 Acceptance Criteria
- **AC-RES-1**: WO CONFIRMED → reserved_qty tang tai exact dim (item + owner + warehouse + status).
- **AC-RES-2**: M5 allocation KHONG allocate stock da reserved boi M9 VAS WO.
- **AC-RES-3**: WO CANCELLED → reserved_qty giam, stock available tro lai cho M5.
- **AC-RES-4**: WO COMPLETED → reserved_qty giam (replaced by actual VAS_CONSUME posting).

---

## 7. Data Objects & Schema

### 7.1 vas_work_order Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| wo_number | VARCHAR(30) | Y | UNIQUE: VAS-YYYYMMDD-SEQ |
| status | ENUM | Y | DRAFT / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED |
| owner_id | FK | Y | Stock owner |
| warehouse_id | FK | Y | |
| bulk_source_item_id | FK | Y | Input product (e.g., Cassava Bulk) |
| bag_type_output_id | FK | Y | Output product (e.g., 50kg Bags) |
| planned_qty_kg | DECIMAL(15,3) | Y | Planned bagging qty |
| actual_output_qty_kg | DECIMAL(15,3) | N | Filled on complete — qty bagged goods produced (VAS_PRODUCE qty) |
| actual_consumed_qty_kg | DECIMAL(15,3) | N | Filled on complete — qty bulk consumed (VAS_CONSUME qty = actual_output + process_loss) |
| actual_bag_count | INT | N | Filled on complete |
| packaging_ownership | ENUM | Y | TVL_OWNED / CLIENT_OWNED |
| packaging_item_id | FK | Y | Packaging SKU (required for both TVL/CLIENT) |
| packaging_owner_id | FK | Y | TVL owner (TVL_OWNED) or Client owner (CLIENT_OWNED) |
| packaging_qty_planned | INT | Y | Num bags planned |
| packaging_qty_actual | INT | N | Actual bags used |
| process_loss_qty | DECIMAL(15,3) | N | Calculated: actual_consumed - actual_output |
| yield_variance_reason | VARCHAR(50) | N | PRODUCTION_LOSS / MOISTURE / OTHER |
| start_date | DATE | Y | |
| estimated_completion | DATE | N | |
| completed_at | TIMESTAMPTZ | N | |
| completed_by | VARCHAR | N | |
| cancel_reason_code | VARCHAR(50) | N | |
| external_id | VARCHAR(100) | Y | Idempotency |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

**v1.1 changes:**
- `packaging_item_id` now REQUIRED (was optional) — both TVL/CLIENT need packaging SKU tracked
- `packaging_owner_id` added — identifies whose inventory to consume packaging from
- `yield_variance_qty` replaced by `process_loss_qty` with clearer formula
- No approval fields — Phase 1 has no approval step

### 7.2 vas_session Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| wo_id | FK | Y | → vas_work_order |
| session_num | INT | Y | Sequence |
| session_date | DATE | Y | |
| session_qty_kg | DECIMAL(15,3) | Y | Qty done in session |
| session_bag_count | INT | Y | Bags produced |
| work_shift | ENUM | Y | MORNING / AFTERNOON / NIGHT |
| is_overtime | BOOLEAN | Y | Default: FALSE |
| productivity_rate | DECIMAL(15,3) | N | qty_kg / work_hours |
| start_time | TIMESTAMPTZ | N | |
| end_time | TIMESTAMPTZ | N | |
| notes | TEXT | N | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |

**v1.1 note:** Sessions are progress logs only. They do NOT trigger any InventTrans posting. Inventory impact happens only at WO COMPLETED.

---

## 8. VAS Work Order State Machine

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|----|------|----|---------|-------|-------|-------------|
| VAS-01 | — | DRAFT | Create WO | WH_MANAGER | — | — |
| VAS-02 | DRAFT | CONFIRMED | Confirm WO | WH_MANAGER | bulk_on_hand >= planned_qty; packaging available (check packaging_owner_id inventory) | reserved_qty updated (Section 6) |
| VAS-03 | CONFIRMED | IN_PROGRESS | Start first session | WH_KEEPER/WH_MANAGER | — | started_at set |
| VAS-04 | IN_PROGRESS | IN_PROGRESS | Add/end session | WH_KEEPER | session_qty > 0 | Progress updated (no InventTrans) |
| VAS-05 | IN_PROGRESS | COMPLETED | Complete WO | WH_MANAGER | actual_output > 0; all sessions totaled | Atomic InventTrans batch + billing event + release reservation |
| VAS-06 | DRAFT | CANCELLED | Cancel | WH_MANAGER | — | No side effects |
| VAS-07 | CONFIRMED | CANCELLED | Cancel | WH_MANAGER | — | Release reserved_qty only. No InventTrans to reverse. |
| VAS-08 | IN_PROGRESS | CANCELLED | Cancel | WH_MANAGER | — | Release reserved_qty only. No InventTrans to reverse (sessions are progress only). Audit log required. |

### Forbidden Transitions

| From | Forbidden To | Reason |
|------|-------------|--------|
| COMPLETED | Any | Immutable after complete |
| CANCELLED | Any | Terminal state |

**v1.1 critical fix:** VAS-07 and VAS-08 no longer say "reverse partial VAS_CONSUME". Since sessions don't post inventory, there is nothing to reverse. Cancel only releases reservation.

---

## 9. Sub-Module 2: Atomic InventTrans Posting (at COMPLETED only)

### 9.1 Posting Logic (WO → COMPLETED)

```
BEGIN TRANSACTION
  1. VAS_CONSUME: -actual_qty_kg (bulk source item)
     dim = bulk_item + WO_owner + WO_warehouse + STORAGE location
     ref_type = VAS_WO, ref_id = wo_number

  2. VAS_PRODUCE: +actual_qty_kg (bagged output item)
     dim = bagged_item + WO_owner + WO_warehouse + STORAGE location
     ref_type = VAS_WO, ref_id = wo_number

  3. VAS_CONSUME: -packaging_qty_actual (packaging item)
     dim = packaging_item + packaging_owner_id + WO_warehouse + STORAGE location
     ref_type = VAS_WO, ref_id = wo_number
     ** ALWAYS posted — both TVL_OWNED and CLIENT_OWNED **

  4. OnHand updates via M3
  5. Release reservation: reserved_qty -= actual_qty_kg
  6. Billing event BAGGING_FEE captured (Section 11)
COMMIT
```

**v1.1 critical fix — Packaging always consumed:**
- TVL_OWNED: packaging_owner_id = TVL. Consumed from TVL inventory. Billing = labor + material.
- CLIENT_OWNED: packaging_owner_id = Client. Consumed from client inventory. Billing = labor only.
- Both cases create VAS_CONSUME for packaging. Difference is ONLY in billing (material cost).
- This ensures on-hand packaging always reflects actual usage, and M11 reconciliation stays balanced.

### 9.2 Material Balance Formula (v1.1 — NEW)

```
actual_consumed_qty (bulk) = actual_output_qty (bagged) + process_loss_qty
process_loss_qty = actual_consumed_qty - actual_output_qty
```

Where:
- actual_consumed_qty = VAS_CONSUME bulk qty (InventTrans)
- actual_output_qty = VAS_PRODUCE bagged qty (InventTrans)
- process_loss_qty = difference (stored in WO, must have yield_variance_reason if > 0)

M11 reconciliation (RECON-005) uses this formula to verify VAS input = output + loss.

### 9.3 Acceptance Criteria
- **AC-2.1**: WO COMPLETED tao 3 InventTrans (bulk consume + bagged produce + packaging consume) trong 1 transaction. BOTH TVL_OWNED and CLIENT_OWNED.
- **AC-2.2**: Neu bat ky InventTrans fail → rollback tat ca (atomic).
- **AC-2.3**: OnHand: bulk giam, bagged tang, packaging giam (for BOTH ownership types).
- **AC-2.4**: Billing event BAGGING_FEE auto-capture.
- **AC-2.5**: Material balance: consumed = produced + process_loss. M11 recon verifiable.
- **AC-2.6**: No InventTrans during sessions (IN_PROGRESS). Only at COMPLETED.

---

## 10. Sub-Module 3: Packaging Material Ownership (v1.1 — Model A)

### 10.1 TVL_OWNED
- TVL mua va so huu bao bi
- WO consume tu TVL inventory (packaging_owner_id = TVL owner)
- Billing: labor + material (bag_count x cost_per_bag)
- InventTrans: VAS_CONSUME packaging tu TVL owner dim

### 10.2 CLIENT_OWNED
- Client gui bao bi cho TVL (inbound ASN rieng)
- Bao bi tracked nhu separate SKU duoi client owner trong inventory
- WO consume tu client inventory (packaging_owner_id = client owner)
- Billing: labor only (KHONG tinh material cost)
- InventTrans: VAS_CONSUME packaging tu client owner dim

### 10.3 Key Difference Summary

| Aspect | TVL_OWNED | CLIENT_OWNED |
|--------|-----------|-------------|
| Packaging in inventory? | Yes — TVL owner | Yes — Client owner |
| VAS_CONSUME packaging trans? | Yes | Yes |
| On-hand packaging decreases? | Yes (TVL) | Yes (Client) |
| Billing material cost? | Yes | No |
| Billing labor? | Yes | Yes |

### 10.4 Acceptance Criteria
- **AC-3.1**: TVL_OWNED WO tao 3 InventTrans (bulk consume + bagged produce + packaging consume from TVL).
- **AC-3.2**: CLIENT_OWNED WO tao 3 InventTrans (bulk consume + bagged produce + packaging consume from Client).
- **AC-3.3**: Billing cho TVL_OWNED = labor + material. CLIENT_OWNED = labor only.
- **AC-3.4**: On-hand packaging giam cho ca TVL_OWNED va CLIENT_OWNED (khac owner dim).

---

## 11. Sub-Module 6: Billing Event Capture

### 11.1 Tiered Pricing [CONFIRMED — BR-BIL-005]

| Tier | Range | Rate (VND/MT) |
|------|-------|--------------|
| 1 | 0 — 1,000 MT | 111,000 |
| 2 | 1,001 — 5,000 MT | 105,000 |
| 3 | > 5,000 MT | 100,000 |

- [TO-CONFIRM — P1 BLOCKER] Reset rule: monthly calendar or rolling cumulative?

### 11.2 Billing Event Payload

| Field | Value |
|-------|-------|
| event_type | BAGGING_FEE |
| owner_id | WO owner |
| wo_number | Reference |
| bulk_item_id | Input product |
| bag_item_id | Output product |
| actual_qty_mt | actual_qty_kg / 1000 |
| actual_bag_count | Bags produced |
| packaging_ownership | TVL_OWNED / CLIENT_OWNED |
| labor_amount | qty_mt x tier_rate |
| material_amount | bag_count x cost_per_bag (TVL_OWNED only; CLIENT_OWNED = 0) |
| total_sessions | Session count |
| has_overtime | Any session is_overtime = TRUE |
| event_timestamp | WO completed_at |
| correlation_id | WO correlation_id |

### 11.3 Overtime
- is_overtime flag per session → apply OT rate multiplier
- OT multiplier follows M10 day type matrix (see M10 spec Section 7.3):
  - Working day + OT = 1.3x
  - Day off + OT = 2.0x
  - Holiday + OT = 3.0x

### 11.4 Acceptance Criteria
- **AC-5.1**: WO COMPLETED auto-capture billing event BAGGING_FEE.
- **AC-5.2**: Tier pricing applied correctly (mixed tiers for qty crossing boundary).
- **AC-5.3**: OT sessions flagged and multiplier applied per M10 day type matrix.
- **AC-5.4**: Material cost included only for TVL_OWNED. CLIENT_OWNED material_amount = 0.
- **AC-5.5**: OT multiplier chain verifiable end-to-end: vas_session.is_overtime = TRUE → billing_event.has_overtime = TRUE → M10 applies combined_multiplier tu lookup table (khong nhan rieng day_type_mult x ot_mult). [AI-5 v1.1 — tham chieu M10 Section 8.3]

---

## 12. Sub-Module 7: Exception Handling

### 12.1 Exceptions

| Exception | Handling |
|-----------|----------|
| Insufficient bulk (after confirm) | WO cannot start. Need inventory adjustment first |
| Insufficient packaging (any ownership) | Block session start, notify WH_MANAGER |
| Process loss (output < consumed) | Require yield_variance_reason. Log process_loss_qty |
| Cancel WO CONFIRMED | Release reserved_qty only. No InventTrans reversal needed |
| Cancel WO IN_PROGRESS | Release reserved_qty only. Sessions are progress logs, no InventTrans to reverse |
| Rework | [PHASE 2] Create new rework WO |

### 12.2 Acceptance Criteria
- **AC-6.1**: Confirm fails neu bulk on-hand < planned_qty OR packaging on-hand < packaging_qty_planned.
- **AC-6.2**: Cancel CONFIRMED/IN_PROGRESS releases reserved_qty. No InventTrans reversal (nothing posted yet).
- **AC-6.3**: Process loss requires yield_variance_reason. process_loss_qty = consumed - produced.
- **AC-6.4**: Khi bat dau session moi (WO IN_PROGRESS), he thong kiem tra packaging remaining >= packaging_qty_planned - packaging_qty_used_so_far. Neu khong du → block session start + notify WH_MANAGER. [AI-3 v1.1]

---

## 13. RBAC & Permissions

| Action | WH_MANAGER | WH_KEEPER | OPS_SUPER | BILLING_OFC |
|--------|------------|-----------|-----------|-------------|
| Create WO | Y | — | Y | — |
| Confirm WO | Y | — | Y | — |
| Start session | Y | Y | Y | — |
| Complete WO | Y | — | Y | — |
| Cancel WO | Y | — | Y | — |
| View WO reports | — | Y | Y | Y |

---

## 14. Business Rules

| Rule ID | Rule | BRD Reference |
|---------|------|--------------|
| VAS-BR-001 | WO state: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED | BR-VAS-001 |
| VAS-BR-002 | Confirm validates bulk >= planned_qty AND packaging available | BR-VAS-002 |
| VAS-BR-003 | Complete = atomic InventTrans batch (always 3 trans) + billing | BR-VAS-003, v1.1 |
| VAS-BR-004 | Both TVL_OWNED and CLIENT_OWNED consume packaging from inventory. Billing material only for TVL. | BR-VAS-004, v1.1 Model A |
| VAS-BR-005 | Multi-session with overtime tracking. Sessions = progress only, no inventory posting. | BR-VAS-005, v1.1 |
| VAS-BR-006 | Tier pricing: 111K/105K/100K per MT | BR-BIL-005 |
| VAS-BR-007 | Idempotency via external_id | CFM-09 |
| VAS-BR-008 | Material balance: consumed = produced + process_loss | BR-INV-001 (M3 ledger invariant), v1.1 applied to VAS |
| VAS-BR-009 | VAS reservation visible to M5 allocation. M5 excludes VAS-reserved qty. | CFM-01 (OnHand = SUM(InventTrans)), v1.1 ADR Option A |
| VAS-BR-010 | Cancel releases reservation only. No InventTrans reversal in Phase 1. | BR-VAS-003 (posting only at COMPLETED), v1.1 clarified |
| VAS-BR-011 | Phase 1: No approval step. DRAFT → CONFIRMED directly by WH_MANAGER. | v1.1 decision — Phase 2 deferred |

---

## 15. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | POST | /api/v1/vas-wo | WH_MANAGER | Create VAS Work Order |
| 2 | GET | /api/v1/vas-wo | WH_MANAGER, OPS_SUPER | List WOs |
| 3 | GET | /api/v1/vas-wo/{id} | WH_MANAGER | Get WO detail |
| 4 | POST | /api/v1/vas-wo/{id}/confirm | WH_MANAGER | Confirm WO (validate stock + reserve) |
| 5 | POST | /api/v1/vas-wo/{id}/session | WH_KEEPER | Add session progress |
| 6 | POST | /api/v1/vas-wo/{id}/complete | WH_MANAGER | Complete WO (atomic InventTrans + billing) |
| 7 | POST | /api/v1/vas-wo/{id}/cancel | WH_MANAGER | Cancel WO (release reservation) |
| 8 | GET | /api/v1/vas-wo/{id}/sessions | WH_MANAGER | List sessions for WO |

---

## 16. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline |
|---|------|----------|--------|----------|
| 1 | Tier pricing reset: monthly or rolling cumulative? | **P1 — BLOCKER** | Billing accuracy | Truoc FS M9/M10 |
| 2 | Storage fee for client-owned packaging while in TVL warehouse? | P2 | Billing scope | Truoc Sprint 2 |
| 3 | Can 1 WO consume from multiple storage locations? | P2 | Posting dim complexity | Truoc Sprint 2 |
| 4 | Packaging shortage during session: block all sessions or allow partial? | P2 | UX + exception flow | Truoc Sprint 2 |
| 5 | Maximum sessions per WO? Or unlimited? | P3 | Schema constraint | Truoc Sprint 2 |
| 6 | VAS reservation at location-level or warehouse-level? | **P1 — BLOCKER** | Reserve dim, M5 allocation contract | Truoc FS M9 |

---

## 17. Acceptance Criteria Summary

| Sub-Module | AC Count |
|-----------|----------|
| Reservation Contract | 4 (AC-RES-1..4) |
| Atomic InventTrans | 6 (AC-2.1..2.6) |
| Packaging Ownership | 4 (AC-3.1..3.4) |
| Billing Event | 5 (AC-5.1..5.5) |
| Exception Handling | 4 (AC-6.1..6.4) |
| **Total** | **23** |

---

## 18. User Stories

### US-M9-001: VAS Work Order Management
**As a** WH_MANAGER, **I want to** create and manage VAS Work Orders with stock validation and reservation, **so that** bagging operations are tracked from start to finish and don't conflict with outbound allocation.
- **Priority:** MUST HAVE

### US-M9-002: Bulk Consumption & Output
**As a** System, **I want to** post atomic InventTrans (consume bulk + produce bagged + consume packaging) when WO COMPLETED, **so that** inventory is accurately adjusted with full material balance.
- **Priority:** MUST HAVE

### US-M9-003: VAS Exception Handling
**As a** WH_MANAGER, **I want to** handle shortage and process loss with reason codes, **so that** exceptions are properly documented and reconcilable.
- **Priority:** MUST HAVE

### US-M9-004: VAS Billing Event
**As a** BILLING_OFC, **I want** billing events auto-captured on WO completion with tiered pricing, **so that** bagging fees are correctly billed with material cost only for TVL-owned packaging.
- **Priority:** MUST HAVE

---

## 19. Baseline Source Documents

| #   | Document                           | Key Content Used                               |
| -----| ------------------------------------| ------------------------------------------------|
| 1   | TVL_SWM_BA_PO_Master.md            | US-M9-001..004                                 |
| 2   | TVL_SWM_StateMachine.md            | VAS WO state machine                           |
| 3   | TVL_SWM_Business_Rules_Document.md | BR-VAS-001..005, BR-BIL-005                    |
| 4   | TVL_SWM_SystemFlow_EndToEnd.md     | VAS posting flow                               |
| 5   | TVL_SWM_SystemControlMap.md        | PP-4 VAS posting point                         |
| 6   | Module 3 Inventory Core Spec       | InventTrans as truth engine, OnHand derivation |
| 7   | Module 5 Outbound Spec             | Allocation contract, reserved_qty handling     |
| 8   | Module 10 Billing Spec             | Day type multiplier matrix, OT formula         |


---

## 20. Cross-Module Ownership Matrix (v1.2 — NEW)

### 20.1 Ownership Principles

1. **M9 owns business object `vas_work_order` and `vas_session`.**
2. **M3 owns inventory truth** (`invent_trans`, `on_hand`, inventory ledger invariant).
3. **M5 owns outbound allocation**, but MUST consume `available_qty` that excludes `reserved_qty_vas`.
4. **M7 owns generic work execution framework/mobile execution pattern**, but for Phase 1, M9 MAY run with its own `vas_session` object if M7 integration is not yet physically implemented.
5. **M10 owns billing calculation and invoice generation**; M9 only emits billing event payload at WO completion.
6. **One business event has one posting owner only**. M9 triggers business completion of VAS WO; M3 posts inventory transactions; M10 posts billing transactions.

### 20.2 Cross-Module Responsibility Table

| Process Step | Primary Owner | Supporting Module | Output |
|---|---|---|---|
| Create VAS WO | M9 | M1, M2 | `vas_work_order:DRAFT` |
| Validate stock and packaging | M9 | M3 | Validation result |
| Reserve VAS quantity | M9 | M3 | `reserved_qty_vas` updated |
| Start / end execution session | M9 | M7 (pattern/reference) | `vas_session` records |
| Complete WO business action | M9 | — | WO status = COMPLETED |
| Post bulk consume / bagged produce / packaging consume | M3 | M9 trigger | 3 `invent_trans` |
| Recalculate on-hand | M3 | — | updated `on_hand` |
| Emit billing event | M9 | M10 | `BAGGING_FEE` event |
| Price, rate, overtime, invoice | M10 | M9 data | billing transaction |
| Exclude VAS-reserved stock from shipment allocation | M5 | M3 on-hand | allocation-safe available qty |

### 20.3 M7 Integration Pattern

Phase 1 cho phep 2 cach implement, nhung phai chon 1 cach duy nhat trong solution design:

#### Option A — M9 native execution object (recommended for Phase 1)
- `vas_session` la object van hanh goc
- Mobile/Web thao tac truc tiep tren M9 API
- M7 chi duoc tham chieu ve UX pattern, permission pattern, audit pattern
- Uu diem: build nhanh, less coupling
- Nhac diem: sau nay can mapping sang M7 neu muon unify work execution

#### Option B — M9 mapped to M7 work objects
- `vas_work_order` = business wrapper
- Khi WO CONFIRMED, he thong tao `work_header/work_line` o M7
- `vas_session` co the map 1-1 hoac n-1 voi work execution logs
- Uu diem: dong nhat execution model toan he thong
- Nhac diem: tang phuc tap Phase 1

**Phase 1 recommendation:** chon **Option A**, nhung phai giu cac field de sau nay map duoc sang M7:
- `execution_ref_type`
- `execution_ref_id`
- `mobile_execution_mode`
- `session_source`

### 20.4 Mandatory Alignment with M7 Before Go-Live
- Phai chot ro mobile app/operator se thao tac qua M9 API hay M7 API facade.
- Phai chot `WH_KEEPER` co duoc complete WO hay chi duoc create/end session.
- Phai chot event audit names de khong trung voi M7 event taxonomy.

---

## 21. M3 Data Contract Impact (v1.2 — NEW)

### 21.1 Canonical Inventory Principle

- `invent_trans` la **source of truth** cho inventory movement.
- `on_hand` la **projection/cache** duoc cap nhat transactionally tu `invent_trans`.
- `reserved_qty_vas` va `reserved_qty_shipment` la operational reservation fields, **khong thay the inventory ledger**.
- Moi thay doi reservation phai co audit trail va correlation ve originating document.

### 21.2 Proposed `on_hand` Extension for Phase 1

| Field | Type | Required | Owner Module | Note |
|---|---|---|---|---|
| physical_qty | DECIMAL(15,3) | Y | M3 | Sum posted inventory |
| reserved_qty_shipment | DECIMAL(15,3) | Y | M5 | Shipment allocation hold |
| reserved_qty_vas | DECIMAL(15,3) | Y | M9 | VAS WO hold |
| available_qty | DECIMAL(15,3) | N | Derived | physical - reserved_shipment - reserved_vas |
| last_recalc_at | TIMESTAMPTZ | Y | M3 | Projection timestamp |

### 21.3 Canonical Formula
```text
available_qty = physical_qty - reserved_qty_shipment - reserved_qty_vas
```

### 21.4 Reservation Lifecycle by State

| WO State Change | Reservation Action | Note |
|---|---|---|
| DRAFT -> CONFIRMED | `reserved_qty_vas += planned_qty_kg` | reserve at chosen dimension |
| CONFIRMED -> IN_PROGRESS | no change | session is progress only |
| IN_PROGRESS -> COMPLETED | `reserved_qty_vas -= planned_qty_kg` OR consume exact reserved amount then zero residual | see 21.5 |
| CONFIRMED/IN_PROGRESS -> CANCELLED | `reserved_qty_vas -= remaining_reserved_qty` | release only |

### 21.5 Completion Reconciliation Rule

De tranh sai lech reservation khi `actual_consumed_qty_kg != planned_qty_kg`, he thong MUST:
1. release full reserved balance for WO (`reserved_qty_vas -= current_reserved_for_wo`)
2. then post actual `VAS_CONSUME` quantity in `invent_trans`
3. ghi audit event `VAS_RESERVATION_RELEASED_ON_COMPLETE`

**Khuyen nghi:** khong tru reservation theo `actual_qty` tung phan; thay vao do release full reservation cua WO roi post actual inventory. Cach nay ro rang va de doi soat hon.

### 21.6 Reservation Granularity Decision

Phase 1 phai chot 1 trong 2 mo hinh:

- **Warehouse-level reservation**: de build, de align M5, nhung yeu hon ve floor control
- **Location-level reservation**: chat hon, nhung phuc tap hon cho re-slotting

**Recommendation BA cho Phase 1:** warehouse-level reservation + optional preferred location field.  
Ly do: M9 can chot nhanh contract voi M5, trong khi thuc te bagging co the doi location truoc luc thuc hien.

### 21.7 Audit & Reconciliation Requirements

Moi reservation event phai luu:
- document type/id
- owner/item/warehouse/location/status dim
- qty before
- qty delta
- qty after
- reason code
- actor
- correlation_id
- event_timestamp

Bao cao doi soat toi thieu:
- reserved_qty_vas by WO
- on_hand projection by dim
- mismatch between open WO reserved and on_hand.reserved_qty_vas

---

## 22. API Contract Details (v1.2 — NEW)

> Phan nay mo rong Section 15 de dat muc build-ready hon. Response schema co the duoc tach thanh API spec rieng o phase next, nhung toi thieu phai giu contract sau.

### 22.1 Common API Rules
- Base path: `/api/v1/vas-wo`
- `external_id` bat buoc cho moi command co side effect:
  - create WO
  - confirm WO
  - add session
  - complete WO
  - cancel WO
- `correlation_id` duoc tao luc create WO va truyen xuyen suot cac event.
- Tat ca command API phai ghi audit log.
- Tat ca mutation API phai enforce RBAC check truoc business validation.
- List API phai ho tro pagination, sorting, va filter co ban.

### 22.2 Create Work Order
**POST** `/api/v1/vas-wo`

**Purpose:** Tao moi VAS WO o trang thai DRAFT.

**Request payload**
```json
{
  "external_id": "ext-vas-create-001",
  "owner_id": "uuid",
  "warehouse_id": "uuid",
  "bulk_source_item_id": "uuid",
  "bag_type_output_id": "uuid",
  "planned_qty_kg": 50000,
  "packaging_ownership": "TVL_OWNED",
  "packaging_item_id": "uuid",
  "packaging_owner_id": "uuid",
  "packaging_qty_planned": 1000,
  "start_date": "2026-03-09",
  "estimated_completion": "2026-03-10",
  "notes": "optional"
}
```

**Validation**
- `planned_qty_kg > 0`
- `packaging_qty_planned > 0`
- owner, item, warehouse phai active trong M2/M1
- `packaging_owner_id` phai phu hop voi `packaging_ownership`

**Response**
- `201 Created` + WO detail
- neu duplicate `external_id` cung payload => tra ket qua cu
- neu duplicate `external_id` khac payload => `409 EXTERNAL_ID_CONFLICT`

**Business Errors**
- `VAS_WO_INVALID_OWNER`
- `VAS_WO_INVALID_ITEM`
- `VAS_WO_INVALID_PACKAGING_OWNER`
- `VAS_WO_INVALID_STATE`

### 22.3 List Work Orders
**GET** `/api/v1/vas-wo`

**Supported filters**
- `status`
- `owner_id`
- `warehouse_id`
- `bulk_source_item_id`
- `start_date_from`, `start_date_to`
- `completed_date_from`, `completed_date_to`
- `keyword` (wo_number)

**Sorting**
- `created_at desc` (default)
- `start_date asc|desc`
- `wo_number asc|desc`

**Response fields**
- summary only: `id`, `wo_number`, `status`, `owner_id`, `planned_qty_kg`, `actual_output_qty_kg`, `start_date`, `completed_at`

### 22.4 Get WO Detail
**GET** `/api/v1/vas-wo/{id}`

**Response should include**
- WO header
- reservation snapshot
- session summary
- actual completion summary
- billing event reference (if completed)
- audit summary (latest actions)

### 22.5 Confirm WO
**POST** `/api/v1/vas-wo/{id}/confirm`

**Request payload**
```json
{
  "external_id": "ext-vas-confirm-001",
  "reason_code": "USER_CONFIRM"
}
```

**Validation**
- current state = DRAFT
- bulk available >= planned qty
- packaging available >= packaging_qty_planned
- no open lock/conflict on same WO

**Side effects**
- state -> `CONFIRMED`
- create reservation record
- update `on_hand.reserved_qty_vas`
- audit event `VAS_WO_CONFIRMED`

**Errors**
- `VAS_CONFIRM_STATE_INVALID`
- `VAS_CONFIRM_BULK_SHORTAGE`
- `VAS_CONFIRM_PACKAGING_SHORTAGE`
- `VAS_CONFIRM_RESERVATION_CONFLICT`

### 22.6 Add Session
**POST** `/api/v1/vas-wo/{id}/session`

**Request payload**
```json
{
  "external_id": "ext-vas-session-001",
  "session_date": "2026-03-09",
  "work_shift": "MORNING",
  "start_time": "2026-03-09T08:00:00+07:00",
  "end_time": "2026-03-09T12:00:00+07:00",
  "session_qty_kg": 10000,
  "session_bag_count": 200,
  "is_overtime": false,
  "notes": "optional"
}
```

**Validation**
- state = `CONFIRMED` or `IN_PROGRESS`
- `session_qty_kg > 0`
- `session_bag_count > 0`
- `end_time >= start_time`
- packaging remaining check theo Section 12.2 AC-6.4

**Side effects**
- neu la session dau tien: state `CONFIRMED -> IN_PROGRESS`
- tao `vas_session`
- update progress summary tren WO
- khong post inventory

**Errors**
- `VAS_SESSION_STATE_INVALID`
- `VAS_SESSION_PACKAGING_SHORTAGE`
- `VAS_SESSION_TIME_INVALID`
- `VAS_SESSION_DUPLICATE_EXTERNAL_ID`

### 22.7 Complete WO
**POST** `/api/v1/vas-wo/{id}/complete`

**Request payload**
```json
{
  "external_id": "ext-vas-complete-001",
  "actual_output_qty_kg": 49800,
  "actual_consumed_qty_kg": 50000,
  "packaging_qty_actual": 1000,
  "actual_bag_count": 996,
  "yield_variance_reason": "PRODUCTION_LOSS",
  "notes": "optional"
}
```

**Validation**
- state = `IN_PROGRESS`
- phai co it nhat 1 session
- `actual_output_qty_kg > 0`
- `actual_consumed_qty_kg >= actual_output_qty_kg`
- `packaging_qty_actual > 0`
- neu `process_loss_qty > 0` => `yield_variance_reason` required
- sum session qty/bag_count khong vuot nguong sai lech cho phep so voi actual complete values

**Atomic side effects**
1. lock WO
2. release reservation
3. post 3 invent trans
4. recalc on-hand
5. update WO actual/completed fields
6. emit billing event
7. audit event `VAS_WO_COMPLETED`

**Errors**
- `VAS_COMPLETE_STATE_INVALID`
- `VAS_COMPLETE_NO_SESSION`
- `VAS_COMPLETE_MATERIAL_BALANCE_INVALID`
- `VAS_COMPLETE_DUPLICATE_EXTERNAL_ID`
- `VAS_COMPLETE_POSTING_FAILED`

### 22.8 Cancel WO
**POST** `/api/v1/vas-wo/{id}/cancel`

**Request payload**
```json
{
  "external_id": "ext-vas-cancel-001",
  "cancel_reason_code": "CLIENT_REQUEST"
}
```

**Validation**
- state = `DRAFT` or `CONFIRMED` or `IN_PROGRESS`
- `cancel_reason_code` required
- `COMPLETED` khong duoc cancel o Phase 1

**Side effects**
- neu co reservation: release reservation
- state -> `CANCELLED`
- khong reverse invent trans vi completion moi post inventory
- audit event `VAS_WO_CANCELLED`

### 22.9 Sessions List
**GET** `/api/v1/vas-wo/{id}/sessions`

**Response**
- ordered by `session_num asc`
- includes work shift, qty, bag count, overtime, duration, created_by

### 22.10 Concurrency & Locking Rules
- Confirm/complete/cancel phai dung optimistic version check (`row_version`) hoac `updated_at` compare.
- Complete WO phai lay application lock/pessimistic lock tren WO record.
- Cung 1 WO, he thong khong cho phep 2 request complete chay song song.
- Idempotent retry voi cung `external_id` phai tra lai ket qua da thanh cong truoc do.

---

## 23. State Transition Catalog (v1.2 — NEW)

| Current State | Action | Actor | Preconditions | Next State | Error Code | Audit Event |
|---|---|---|---|---|---|---|
| — | Create WO | WH_MANAGER / OPS_SUPER | Master data valid | DRAFT | `VAS_WO_INVALID_*` | `VAS_WO_CREATED` |
| DRAFT | Confirm WO | WH_MANAGER / OPS_SUPER | bulk and packaging sufficient | CONFIRMED | `VAS_CONFIRM_*` | `VAS_WO_CONFIRMED` |
| CONFIRMED | Add first session | WH_KEEPER / WH_MANAGER / OPS_SUPER | session valid | IN_PROGRESS | `VAS_SESSION_*` | `VAS_SESSION_CREATED` |
| IN_PROGRESS | Add next session | WH_KEEPER / WH_MANAGER / OPS_SUPER | session valid | IN_PROGRESS | `VAS_SESSION_*` | `VAS_SESSION_CREATED` |
| IN_PROGRESS | Complete WO | WH_MANAGER / OPS_SUPER | at least 1 session, actual valid | COMPLETED | `VAS_COMPLETE_*` | `VAS_WO_COMPLETED` |
| DRAFT | Cancel WO | WH_MANAGER / OPS_SUPER | reason provided | CANCELLED | `VAS_CANCEL_*` | `VAS_WO_CANCELLED` |
| CONFIRMED | Cancel WO | WH_MANAGER / OPS_SUPER | reason provided | CANCELLED | `VAS_CANCEL_*` | `VAS_WO_CANCELLED` |
| IN_PROGRESS | Cancel WO | WH_MANAGER / OPS_SUPER | reason provided | CANCELLED | `VAS_CANCEL_*` | `VAS_WO_CANCELLED` |

### 23.1 Transition Rules
- `COMPLETED` va `CANCELLED` la terminal states.
- Khong cho phep `DRAFT -> IN_PROGRESS` bo qua confirm.
- Khong cho phep `CONFIRMED -> COMPLETED` neu chua co session.
- Khong cho phep cancel/re-open WO da `COMPLETED` o Phase 1.
- Mọi transition terminal phải ghi `updated_by`, `updated_at`, `reason_code` (neu applicable).

---

## 24. Exception & Error Matrix (v1.2 — NEW)

| Scenario | Detect At | Block / Allow | User Message Intent | Override | Inventory Impact | Billing Impact |
|---|---|---|---|---|---|---|
| Bulk shortage at confirm | Confirm WO | Block | Khong du bulk de confirm WO | No | None | None |
| Packaging shortage at confirm | Confirm WO | Block | Khong du bao bi de confirm WO | No | None | None |
| Packaging shortage before new session | Add session | Block | Khong du bao bi con lai cho session moi | Manager only via stock correction, not direct override | None | None |
| `actual_consumed < actual_output` | Complete WO | Block | Sai material balance | No | None | None |
| `process_loss > 0` but no reason | Complete WO | Block | Bat buoc nhap ly do hao hut | No | None | None |
| Duplicate complete API retry same external_id | Complete WO | Allow idempotent return | Tra ket qua completion cu | N/A | No extra posting | No duplicate billing |
| Duplicate complete API different payload same external_id | Complete WO | Block | External ID conflict | No | None | None |
| Cancel WO in COMPLETED | Cancel WO | Block | WO da hoan tat, khong the huy o Phase 1 | No | None | None |
| No session but complete requested | Complete WO | Block | Chua co session nao | No | None | None |
| Outbound allocation touches VAS-reserved stock | M5 allocation | Block | Stock da duoc reserve cho VAS | No | None | None |
| Client-owned packaging not inbound yet | Confirm WO | Block | Bao bi cua client chua co ton kho kha dung | No | None | None |
| InventTrans posting partial failure | Complete WO | Block + rollback | Loi posting inventory, WO chua hoan tat | No | No committed posting | No billing event |

### 24.1 Standard Error Response Shape
```json
{
  "code": "VAS_CONFIRM_PACKAGING_SHORTAGE",
  "message": "Packaging on-hand is insufficient for planned quantity.",
  "details": {
    "required_qty": 1000,
    "available_qty": 800
  },
  "correlation_id": "uuid"
}
```

---

## 25. Formula & Rounding Catalog (v1.2 — NEW)

### 25.1 Canonical Formulas

```text
process_loss_qty = actual_consumed_qty_kg - actual_output_qty_kg
yield_pct = (actual_output_qty_kg / actual_consumed_qty_kg) * 100
planned_bag_count = packaging_qty_planned
actual_bag_count = packaging_qty_actual OR actual completed count by operator
productivity_rate = session_qty_kg / actual_work_hours
actual_qty_mt = actual_output_qty_kg / 1000
labor_amount = tiered_rate(actual_qty_mt) * actual_qty_mt
material_amount = packaging_qty_actual * cost_per_bag   [TVL_OWNED only]
total_amount = labor_amount + material_amount + overtime_adjustment
```

### 25.2 Rounding Rules
- Qty inventory (`kg`, `mt`) = 3 decimal places
- Bag count = integer
- Money amount = 0 decimal places (VND), standard arithmetic rounding
- Productivity rate = 3 decimal places
- Percentage = 2 decimal places

### 25.3 Mandatory Formula Notes
- `actual_consumed_qty_kg` la qty bulk bi tru kho
- `actual_output_qty_kg` la qty bagged thanh pham nhap kho
- `process_loss_qty` khong duoc am
- `packaging_qty_actual` co the khac `actual_bag_count` neu co bag waste/tear; neu co truong hop nay phai mo rong Phase 2 hoac ghi chu ro trong UAT

### 25.4 Tier Crossing Rule
Neu `actual_qty_mt` vuot nhieu tier, he thong phai ap dung **mixed-tier calculation** tren tung phan san luong thuoc tung tier, khong duoc ap 1 rate duy nhat cho toan bo qty.

### 25.5 Pending Business Decision
- Tier reset theo thang lich, theo chu ky hop dong, hay rolling cumulative?
- OT multiplier duoc apply vao labor_amount line-item hay adjustment line-item?  
**Recommendation:** de M10 own pricing engine; M9 chi gui enough facts, khong tinh invoice-final amount neu chua chot pricing policy.

---

## 26. Billing Event Contract with M10 (v1.2 — NEW)

### 26.1 Event Trigger
- Trigger duy nhat: `vas_work_order.status = COMPLETED`
- Event chi duoc phat sau khi 3 invent trans da commit thanh cong
- 1 WO chi duoc emit 1 billing event logic

### 26.2 Event Uniqueness
```text
billing_dedup_key = "BAGGING_FEE:" + wo_number
```
M10 phai reject duplicate event co cung `billing_dedup_key`.

### 26.3 Minimum Event Payload
```json
{
  "event_type": "BAGGING_FEE",
  "dedup_key": "BAGGING_FEE:VAS-20260309-0001",
  "correlation_id": "uuid",
  "owner_id": "uuid",
  "warehouse_id": "uuid",
  "wo_number": "VAS-20260309-0001",
  "bulk_item_id": "uuid",
  "bag_item_id": "uuid",
  "actual_output_qty_kg": 49800,
  "actual_consumed_qty_kg": 50000,
  "actual_qty_mt": 49.800,
  "actual_bag_count": 996,
  "packaging_item_id": "uuid",
  "packaging_qty_actual": 1000,
  "packaging_ownership": "TVL_OWNED",
  "material_charge_applicable": true,
  "has_overtime": true,
  "session_count": 3,
  "completed_at": "2026-03-10T17:30:00+07:00"
}
```

### 26.4 Billing Ownership Rules

| Case | Labor Charge | Material Charge | Storage Charge for Packaging |
|---|---|---|---|
| TVL_OWNED packaging | Yes | Yes | Already handled by inventory/storage policy if applicable |
| CLIENT_OWNED packaging | Yes | No | [TO-CONFIRM] per contract/service policy |

### 26.5 Reversal Strategy
- Phase 1: khong ho tro reverse completed WO
- Neu M10 da nhan event sai do user/business correction, xu ly bang **manual billing adjustment** hoac **Phase 2 reversal document**
- M9 khong duoc emit compensating reverse event trong Phase 1

---

## 27. UAT Scenario Matrix (v1.2 — NEW)

| UAT ID | Scenario | Preconditions | Expected Result |
|---|---|---|---|
| UAT-M9-001 | Create + confirm WO with sufficient bulk and TVL packaging | valid master data, enough on-hand | WO = CONFIRMED, reservation created |
| UAT-M9-002 | Confirm WO fails due to bulk shortage | insufficient bulk | error `VAS_CONFIRM_BULK_SHORTAGE`, no reservation |
| UAT-M9-003 | Confirm WO fails due to packaging shortage | insufficient packaging | error `VAS_CONFIRM_PACKAGING_SHORTAGE`, no reservation |
| UAT-M9-004 | Add first session | WO = CONFIRMED | WO -> IN_PROGRESS, session created, no invent trans |
| UAT-M9-005 | Add multiple sessions over multiple days | WO = IN_PROGRESS | all sessions saved, still no invent trans before complete |
| UAT-M9-006 | Complete WO with TVL-owned packaging | at least 1 session | 3 invent trans committed, billing event with material charge |
| UAT-M9-007 | Complete WO with client-owned packaging | at least 1 session, client packaging stock exists | 3 invent trans committed, billing event labor only |
| UAT-M9-008 | Complete WO with process loss | actual_consumed > actual_output, reason provided | complete success, process_loss captured |
| UAT-M9-009 | Complete WO fails without yield reason | process loss exists, no reason | block completion |
| UAT-M9-010 | Cancel confirmed WO | WO = CONFIRMED | reservation released, state = CANCELLED |
| UAT-M9-011 | Cancel in-progress WO | WO = IN_PROGRESS | reservation released, sessions remain as audit, no invent trans |
| UAT-M9-012 | Duplicate complete request same external_id | previous complete success | no duplicate posting, same response returned |
| UAT-M9-013 | Outbound allocation excludes VAS-reserved qty | open confirmed WO exists | M5 cannot allocate reserved stock |
| UAT-M9-014 | Posting failure during completion | inject posting failure | transaction rollback, WO not completed, no billing event |
| UAT-M9-015 | Mixed tier billing quantity | qty crosses tier boundary | billing facts emitted correctly for M10 pricing engine |

### 27.1 Traceability Recommendation
Moi UAT case nen map toi:
- business rule ID
- API endpoint
- DB object
- audit event
- UI screen / mobile action

---

## 28. Open Items Reclassified by Build Readiness (v1.2 — NEW)

### 28.1 P1 — Build Blockers
1. Tier pricing reset rule: monthly, contract-period, hay rolling cumulative?
2. Reservation granularity: warehouse-level hay exact location-level?
3. M9 session se implement native hay map sang M7 work objects o Phase 1?
4. M10 co tinh final amount hay M9 tinh labor/material amount truoc khi emit?

### 28.2 P2 — Important Before UAT
1. 1 WO co duoc consume tu nhieu storage location khong?
2. Packaging shortage giua chung cho phep partial session hay block session moi?
3. Client-owned packaging co tinh storage fee khong?
4. Maximum session/WO co can hard limit khong?

### 28.3 P3 — Future Enhancement / Phase 2
1. Rework / reversal completed WO
2. Session-level inventory posting
3. Bag waste / torn bag accounting
4. QC integration
5. Unified work execution with M7

