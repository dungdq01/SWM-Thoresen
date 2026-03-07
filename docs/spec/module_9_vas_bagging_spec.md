# Module 9 — VAS / Bagging Operations: Functional Specification

**Version:** 1.1
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Pending Senior Manager Review
**Source:** 5 Check-Report Documents + BRD
**Changelog v1.1:** Fix packaging ownership model (Model A — always consume), cancel/reversal logic (no session-level posting), reservation contract with M5, approval workflow decision, yield variance formula. Per Senior Manager review against M3/M5/M10 baseline.

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

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_BA_PO_Master.md | US-M9-001..004 |
| 2 | TVL_SWM_StateMachine.md | VAS WO state machine |
| 3 | TVL_SWM_Business_Rules_Document.md | BR-VAS-001..005, BR-BIL-005 |
| 4 | TVL_SWM_SystemFlow_EndToEnd.md | VAS posting flow |
| 5 | TVL_SWM_SystemControlMap.md | PP-4 VAS posting point |
| 6 | Module 3 Inventory Core Spec | InventTrans as truth engine, OnHand derivation |
| 7 | Module 5 Outbound Spec | Allocation contract, reserved_qty handling |
| 8 | Module 10 Billing Spec | Day type multiplier matrix, OT formula |
