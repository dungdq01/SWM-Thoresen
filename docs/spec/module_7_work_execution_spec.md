# Module 7 — Work Execution & Mobile Operations: Functional Specification

**Version:** 1.1
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Pending Senior Manager Review
**Source:** 5 Check-Report Documents + BRD + TVL_SWM_Work_Execution_Spec.md
**Changelog v1.1:** Fix InventTrans ownership mapping, putaway destination model, shipment state handoff, transfer coverage, force-complete governance. Per Senior Manager review against M4/M5/M6 baseline.

---

## 1. Document Purpose

Dac ta chuc nang Module 7 — Work Execution & Mobile Operations. Module nay quan ly viec tao, phan cong, thuc thi va giam sat cong viec kho (Putaway, Pick, Move, Transfer) thong qua mobile app va web dashboard.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Work Generation Engine (auto-create tu M4/M5/M6 trigger)
- Mobile Task Claim & Execution (self-claim model)
- Location QR Scan Validation
- Work Completion & InventTrans Posting (movement posting only — M7 owns MOVE transactions)
- Short Pick / Exception Handling
- Work Monitoring & Supervisor Dashboard
- Offline Queue & Sync
- Transfer Work Execution (source pick + destination putaway)

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] REPLENISH work type
- [PHASE 2] LOAD work type
- [PHASE 2] Directed assignment (supervisor assign to keeper)
- [PHASE 2] Wave processing
- [PHASE 2] Capacity-based putaway suggestion
- [OUT OF SCOPE] Barcode/RFID scanning (QR location only)

---

## 3. Business Context

TVL van hanh kho bulk cargo va bagged goods. Cong viec kho (putaway, pick, move) can duoc:
- Tao tu dong khi Receipt RECEIVED hoac Shipment ALLOCATED
- Phan cong qua mobile app (self-claim, khong phai supervisor giao)
- Thuc thi voi QR scan de validate vi tri
- Post InventTrans (MOVE type) khi hoan thanh de dam bao inventory accuracy
- Ho tro offline cho mobile khi mat mang

---

## 4. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | RBAC, NumberSequence (WRK-), ReasonCode, AuditLog |
| M2 Master Data | Uses | Location (QR code), Warehouse, Item |
| M3 Inventory Core | Uses | InventTrans posting, OnHand query, InventDim lookup |
| M4 Inbound | Triggered by | Receipt RECEIVED → auto-create Putaway work |
| M5 Outbound | Triggered by | Shipment ALLOCATED → auto-create Pick work |
| M6 Inventory Control | Triggered by | Move request → Move work; Transfer CONFIRMED → Transfer work |
| M8 Integration | Uses | Mobile sync, offline queue |

---

## 5. Posting Ownership by Event (CRITICAL — Cross-Module Contract)

**Nguyen tac cot loi**: Moi event chi co 1 module so huu posting. M7 KHONG duoc tao posting trung voi M4/M5.

| Event | Posting Owner | InventTrans Type | M7 Role |
|-------|--------------|------------------|---------|
| Inbound receipt (goods arrive) | **M4** at RECEIVED | RECEIVE (+qty) | M7 KHONG post. M4 da post xong truoc khi handoff sang putaway. |
| Putaway (RECEIVING → STORAGE) | **M7** | MOVE (location change) | M7 post MOVE: from=RECEIVING, to=STORAGE |
| Pick (STORAGE → STAGING) | **M7** | MOVE (location change) | M7 post MOVE: from=STORAGE, to=STAGING. Day la movement, KHONG phai final outbound deduction. |
| Outbound ship (goods leave) | **M5** at SHIPPED | SHIP (-qty) | M7 KHONG post. M5 post khi confirm ship. |
| Internal move | **M7** (trigger M6) | MOVE (location change) | M7 post MOVE |
| Inter-WH transfer pick | **M7** (trigger M6) | TRANSFER_SHIP (-qty source) | M7 post khi transfer pick complete |
| Inter-WH transfer putaway | **M7** (trigger M6) | TRANSFER_RECEIVE (+qty dest) | M7 post khi transfer putaway complete |
| VAS consume/produce | **M9** | VAS_CONSUME / VAS_PRODUCE | M7 KHONG lien quan |
| Adjustment/Count | **M6** | ADJUSTMENT / COUNT | M7 KHONG lien quan |

**Luu y quan trong:**
- Putaway completion = MOVE tu RECEIVING sang STORAGE. Khong phai them 1 inbound receipt trans.
- Pick completion = MOVE tu STORAGE sang STAGING. On-hand van con trong warehouse (tai STAGING location). Chi khi M5 post SHIPPED moi giam on-hand chinh thuc.
- Dieu nay dam bao KHONG co double-posting giua M4↔M7 hoac M5↔M7.

---

## 6. User Personas

| Role | Use Cases in M7 |
|------|----------------|
| WH_KEEPER | Claim work, execute putaway/pick/move, scan QR, report exception |
| WH_MANAGER | Cancel work, manager override complete (with evidence), override location mismatch, skip WorkLine, view reports |
| WH_ADMIN | Configure work priority templates |
| OPS_SUPER | Monitor work queue, SLA tracking, exception dashboard |

---

## 7. Design Principles

1. **WorkLine COMPLETED = 1 InventTrans (MOVE type for putaway/pick)** [CONFIRMED — BR-WRK-002]: Moi WorkLine hoan thanh phai sinh dung 1 InventTrans posting. M7 chi post MOVE transactions (location change). Receipt posting (M4) va Ship posting (M5) KHONG thuoc M7.
2. **Self-claim model** [CONFIRMED — BR-WRK-001]: WH_KEEPER tu chon work. Khong co directed assignment tu supervisor (Phase 1).
3. **QR scan = validate location** [CONFIRMED]: Scan QR de xac nhan vi tri, KHONG phai scan hang hoa.
4. **Idempotency via external_id** [CONFIRMED — CFM-09]: Retry khong tao duplicate work hoac duplicate InventTrans.
5. **Offline-first mobile** [CONFIRMED]: Queue operations locally khi offline, sync khi online.
6. **Work type Phase 1: PUTAWAY, PICK, MOVE, TRANSFER** [CONFIRMED]: 4 loai work go-live.
7. **Claim khong doi state** [CONFIRMED]: Claim chi set assigned_to. Chi Start moi chuyen OPEN → IN_PROGRESS.
8. **No force-complete without evidence** [NEW — v1.1]: Manager override complete bat buoc phai co actual_qty + reason_code + audit trail. Khong cho phep skip quantity verification.

---

## 8. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Work Generation Engine | Auto-create WorkHeader + WorkLines tu source trigger |
| 2 | Mobile Task Claim & Execution | Self-claim, start, execute, scan QR, complete |
| 3 | Work Completion & InventTrans Posting | WorkLine complete → post MOVE InventTrans via M3 |
| 4 | Exception Handling | Short pick, location mismatch, item not found |
| 5 | Work Monitoring & Supervisor View | Dashboard, SLA, exception alerts |
| 6 | Offline Queue & Sync | Mobile offline queue, idempotent sync |
| 7 | Transfer Work Execution | Inter-warehouse transfer pick + putaway |
| 8 | Auditability | Idempotency, correlation, audit trail |

---

## 9. Data Objects & Schema

### 9.1 work_header Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| work_id | VARCHAR(30) | Y | Auto-generated: WRK-YYYYMMDD-SEQ |
| work_type | ENUM | Y | PUTAWAY / PICK / MOVE / TRANSFER_PICK / TRANSFER_PUT |
| status | ENUM | Y | OPEN / IN_PROGRESS / COMPLETED / CANCELLED |
| priority | INT | Y | 1=highest, 99=lowest. Pick=10, Putaway=50, Move=60, Transfer=40 |
| warehouse_id | FK | Y | |
| zone_id | VARCHAR(20) | N | |
| source_type | ENUM | Y | RECEIPT / SHIPMENT / MOVE_REQUEST / TRANSFER_ORDER / MANUAL |
| source_id | VARCHAR(30) | Y | Reference: RCV-xxx, SHP-xxx, TRF-xxx |
| source_line_id | VARCHAR(30) | N | |
| owner_id | FK | Y | Denormalized for access control |
| assigned_to | UUID FK | N | NULL at creation, set on claim |
| assigned_at | TIMESTAMPTZ | N | |
| started_at | TIMESTAMPTZ | N | |
| completed_at | TIMESTAMPTZ | N | |
| cancel_reason_code | VARCHAR(50) | N | Required if CANCELLED |
| external_id | VARCHAR(100) | Y | Idempotency key |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 9.2 work_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| work_header_id | FK | Y | → work_header |
| line_num | INT | Y | Step sequence |
| step_type | ENUM | Y | PUT / PICK / STAGE / MOVE_FROM / MOVE_TO |
| status | ENUM | Y | OPEN / IN_PROGRESS / COMPLETED / SKIPPED / CANCELLED |
| from_location_id | FK | N | Source location |
| to_location_id | FK | N | Destination — co the NULL luc tao (TBD by worker) |
| item_id | FK | Y | |
| invent_dim_id | UUID FK | N | Dimension tracking |
| expected_qty | DECIMAL(15,3) | Y | kg |
| actual_qty | DECIMAL(15,3) | N | Filled on complete |
| uom | VARCHAR(10) | Y | Default: KG |
| invent_trans_id | VARCHAR(30) | N | → invent_trans AFTER step complete |
| scanned_location | VARCHAR(30) | N | QR code confirmed |
| variance_qty | DECIMAL(15,3) | N | actual - expected |
| variance_reason | ENUM | N | SHORT_PICK / OVERAGE / DAMAGE / OTHER |
| completed_at | TIMESTAMPTZ | N | |
| completed_by | VARCHAR | N | |

**Luu y v1.1**: Removed step_type RECEIVE. Putaway work chi co PUT step (RECEIVING → STORAGE). Receipt posting da duoc M4 xu ly truoc khi tao putaway work.

---

## 10. Sub-Module 1: Work Generation Engine

### 10.1 Triggers

| Source | Trigger State | Work Type | WorkLines Created |
|--------|--------------|-----------|-------------------|
| Receipt RECEIVED | M4 → RECEIVED | PUTAWAY | Line 1: PUT (from=RECEIVING, to=NULL — TBD by worker, must be STORAGE type) |
| Shipment ALLOCATED | M5 → ALLOCATED | PICK | Line 1: PICK (from=STORAGE allocated loc, to=STAGING_OUT) |
| Move Request CONFIRMED | M6 → CONFIRMED | MOVE | Line 1: MOVE_FROM (from=source), Line 2: MOVE_TO (to=dest) |
| Transfer Order RELEASED | M6 → **RELEASED** (TR-02) [CONFIRMED — M6 state machine] | TRANSFER_PICK | Line 1: PICK (from=source WH STORAGE, to=source WH STAGING_OUT) |
| Transfer Putaway (after transit) | M6 → **IN_TRANSIT** (TR-04, goods arrive at dest) | TRANSFER_PUT | Line 1: PUT (from=dest WH RECEIVING, to=NULL — TBD by worker) |

**Luu y v1.1 — Putaway model:**
- Putaway WorkLine co from_location = RECEIVING area (fixed by M4 receipt)
- to_location = NULL luc tao work. Worker chon destination luc execute bang cach scan QR.
- Khi complete, bat buoc scan location va validate location_type = STORAGE [BR-IN-006].
- 1 receipt tao 1 putaway WorkHeader voi 1 PUT line. Neu can split nhieu location: [TO-CONFIRM #5 — xem section 20].

**Luu y v1.1 — Shipment state handoff:**
- Khi M5 tao pick work (Shipment ALLOCATED) → Shipment state chuyen sang PICKING.
- Khi tat ca pick work COMPLETED → Shipment state chuyen sang PICKED.
- Sequence: ALLOCATED → PICKING (work created) → PICKED (all work done).

### 10.2 Business Rules
- Auto-create WorkHeader + WorkLines khi source document trigger state
- Idempotent: retry khong tao duplicate (external_id = source_id + source_line_id)
- WorkHeader.status = OPEN, assigned_to = NULL khi moi tao
- Priority template: Pick urgent = 10, Pick normal = 30, Transfer = 40, Putaway = 50, Move = 60

### 10.3 Acceptance Criteria
- **AC-1.1**: Receipt RECEIVED auto-tao 1 Putaway WorkHeader voi 1 PUT WorkLine (from=RECEIVING, to=NULL).
- **AC-1.2**: Shipment ALLOCATED auto-tao Pick WorkHeader(s) — 1 per shipment line. Shipment state → PICKING.
- **AC-1.3**: Retry cung source_id khong tao duplicate work (idempotent via external_id).
- **AC-1.4**: WorkHeader tao voi status = OPEN, assigned_to = NULL.
- **AC-1.5**: Transfer Order CONFIRMED auto-tao TRANSFER_PICK work tai source warehouse.

---

## 11. Sub-Module 2: Mobile Task Claim & Execution

### 11.1 Flow
1. WH_KEEPER mo app → xem Work List (filter: warehouse, status = OPEN, assigned_to = NULL)
2. Claim work → assigned_to = keeper_id, status van la OPEN
3. Start → status = IN_PROGRESS, started_at = now()
4. Execute tung WorkLine:
   - Di den location → scan QR → validate location
   - Nhap actual_qty
   - **Putaway**: scan destination location QR → validate location_type = STORAGE
   - **Pick**: scan source location QR → validate matches allocated location
   - Confirm → WorkLine = COMPLETED → InventTrans (MOVE) posted
5. Tat ca WorkLines COMPLETED/SKIPPED → WorkHeader = COMPLETED

### 11.2 QR Scan Validation
- Scan QR → extract location_code
- Validate: location exists, correct warehouse, correct location_type
  - Putaway destination: MUST be STORAGE type
  - Pick source: MUST match allocated location
  - Move: MUST match expected from/to
- Mismatch → block, show error. Keeper phai di dung vi tri.
- WH_MANAGER co the override location mismatch voi reason_code.

### 11.3 Acceptance Criteria
- **AC-2.1**: Claim chi set assigned_to, KHONG doi status (van OPEN).
- **AC-2.2**: Start chuyen OPEN → IN_PROGRESS, ghi started_at.
- **AC-2.3**: Scan QR sai location → block execution. Show error message.
- **AC-2.4**: WH_MANAGER override location mismatch → log reason_code + audit.
- **AC-2.5**: Release claim → assigned_to = NULL, status van OPEN.
- **AC-2.6**: Putaway complete bat buoc scan destination location_type = STORAGE.

---

## 12. Sub-Module 3: Work Completion & InventTrans Posting

### 12.1 WorkLine → InventTrans Mapping (v1.1 — Corrected)

| Work Type | Step | InventTrans Type | Description | DimFrom | DimTo |
|-----------|------|-----------------|-------------|---------|-------|
| PUTAWAY | PUT | MOVE | Move from RECEIVING to STORAGE | {loc=RECEIVING} | {loc=scanned STORAGE} |
| PICK | PICK | MOVE | Move from STORAGE to STAGING | {loc=allocated STORAGE} | {loc=STAGING_OUT} |
| MOVE | MOVE_FROM + MOVE_TO | MOVE | Internal location move | {loc=source} | {loc=dest} |
| TRANSFER_PICK | PICK | TRANSFER_SHIP | Pick for inter-WH transfer | {loc=source STORAGE} | {wh=source, loc=STAGING} |
| TRANSFER_PUT | PUT | TRANSFER_RECEIVE | Putaway at destination WH | {wh=dest, loc=RECEIVING} | {wh=dest, loc=scanned STORAGE} |

**KHONG co trong bang nay (intentional):**
- RECEIVE / ASN_RECEIVE → owned by M4 at Receipt RECEIVED
- SHIP / SHIPMENT_PICK → owned by M5 at Shipment SHIPPED
- VAS_CONSUME / VAS_PRODUCE → owned by M9

### 12.2 Posting Rules
- WorkLine COMPLETED → M3 posting API call (1 InventTrans per WorkLine)
- external_id = {work_id}_{line_num}_{step_type} (idempotency)
- All WorkLines COMPLETED/SKIPPED → WorkHeader COMPLETED
- **Putaway complete** → Receipt state: RECEIVED → PUTAWAY (auto-transition by M4 callback)
- **All pick work done** → Shipment state: PICKING → PICKED (auto-transition by M5 callback)

**reserved_qty lifecycle khi Pick COMPLETED [CONFIRMED]:**
- Pick WorkLine COMPLETED → InventTrans MOVE (STORAGE→STAGING) posted. reserved_qty KHONG thay doi.
- Hang o STAGING = van trong warehouse, chi la holding area cho len xe.
- reserved_qty chi release khi: (a) Shipment → SHIPPED (M5 post, release = shipped out), hoac (b) Shipment CANCELLED (release = hang tra lai STORAGE).
- Muc dich: dam bao hang da pick khong bi allocate lai cho shipment khac trong khi dang o STAGING.

### 12.3 Acceptance Criteria
- **AC-3.1**: Putaway WorkLine COMPLETED tao 1 InventTrans type=MOVE (RECEIVING→STORAGE). KHONG tao RECEIVE trans.
- **AC-3.2**: Pick WorkLine COMPLETED tao 1 InventTrans type=MOVE (STORAGE→STAGING). KHONG tao SHIP trans.
- **AC-3.3**: All WorkLines COMPLETED/SKIPPED → WorkHeader auto-transition COMPLETED.
- **AC-3.4**: Putaway complete → Receipt state → PUTAWAY.
- **AC-3.5**: All pick work done → Shipment state: PICKING → PICKED.
- **AC-3.6**: Transfer pick complete → InventTrans type=TRANSFER_SHIP. Transfer putaway complete → TRANSFER_RECEIVE.

---

## 13. Sub-Module 4: Exception Handling

### 13.1 Short Pick
- actual_qty < expected_qty
- Threshold [TO-CONFIRM — P1 blocker]: <=2% auto-accept, 2-5% flag WH_MANAGER, >5% block
- Creates variance record (SHORT_PICK reason)

### 13.2 Location Mismatch
- Scan QR khong khop expected location
- Option A: Di dung vi tri (recommended)
- Option B: WH_MANAGER override voi reason_code

### 13.3 Item Not Found
- Report: NOT_FOUND reason
- WorkLine status = SKIPPED (khong COMPLETED)
- Flag for cycle count
- Allocation record → FAILED, co the auto-reallocate

### 13.4 Acceptance Criteria
- **AC-4.1**: Short pick variance logged voi reason code.
- **AC-4.2**: Short pick >5% → block, require WH_MANAGER intervention [TO-CONFIRM threshold].
- **AC-4.3**: Location mismatch → block execution cho den khi scan dung hoac WH_MANAGER override.
- **AC-4.4**: Item not found → WorkLine SKIPPED, exception logged, cycle count flagged.

---

## 14. Sub-Module 5: Work Monitoring & Supervisor View

### 14.1 Dashboard Metrics
- Work queue: OPEN / IN_PROGRESS / COMPLETED / CANCELLED count per warehouse per type
- Filter by: shift, operator, work type, date
- SLA tracking: completed_at - created_at (total), completed_at - started_at (execution)
- Alert: task IN_PROGRESS > X hours → flag [TO-CONFIRM: SLA threshold]
- Exception list: location mismatch, source empty, sync fail

### 14.2 Manager Override Complete (v1.1 — Replaces force-complete)

WH_MANAGER co the override-complete work tu dashboard, nhung bat buoc:
1. actual_qty phai duoc nhap (khong duoc de trong)
2. reason_code required (e.g., SYSTEM_ERROR, MOBILE_FAILURE, PHYSICAL_VERIFIED)
3. source_evidence: mo ta bang chung (e.g., "Da kiem tra thuc te tai location A-01-03")
4. Full audit trail: who, when, reason, qty, evidence

**KHONG cho phep**: Complete without quantity → vi pham "1 WorkLine = 1 InventTrans" invariant.

### 14.3 Acceptance Criteria
- **AC-5.1**: Dashboard hien thi dung count per status per type per warehouse.
- **AC-5.2**: Manager override complete bat buoc actual_qty + reason_code + evidence. Override without qty → REJECTED.
- **AC-5.3**: Alert hien khi work IN_PROGRESS vuot SLA threshold.
- **AC-5.4**: All manager overrides logged in audit trail voi full context.

---

## 15. Sub-Module 6: Offline Queue & Sync

### 15.1 Flow
- Mobile mat mang → queue operations locally
- Sync khi online: gui queued events voi external_id (idempotent)
- Conflict detection: flag conflict, khong auto-overwrite
- Sync status visible (pending sync count)
- Auto-retry, khong can keeper intervention

### 15.2 Acceptance Criteria
- **AC-6.1**: Offline putaway/pick completion queued locally.
- **AC-6.2**: Sync gui events voi external_id → duplicate khong tao moi.
- **AC-6.3**: Conflict flag hien thi cho WH_MANAGER review.
- **AC-6.4**: Pending sync count visible tren mobile UI.

---

## 16. Sub-Module 7: Transfer Work Execution (v1.1 — NEW)

### 16.1 Scope

Inter-warehouse Transfer Order (M6) tao 2 sets of work:
1. **TRANSFER_PICK** tai source warehouse: pick hang tu STORAGE → STAGING_OUT
2. **TRANSFER_PUT** tai destination warehouse: putaway hang tu RECEIVING → STORAGE

### 16.2 Flow

```
Transfer Order RELEASED (M6) [khop voi M6 state machine TR-02]
  → Auto-create TRANSFER_PICK work (source WH)
  → WH_KEEPER claim + execute pick
  → Pick complete → InventTrans TRANSFER_SHIP (-qty source WH)
  → Transfer Order state → IN_TRANSIT (M6 manages)
  → Goods arrive at destination WH
  → Auto-create TRANSFER_PUT work (dest WH)
  → WH_KEEPER claim + execute putaway
  → Putaway complete → InventTrans TRANSFER_RECEIVE (+qty dest WH)
  → Transfer Order state → RECEIVED (M6 manages)
```

### 16.3 Rules
- TRANSFER_PICK va TRANSFER_PUT la 2 WorkHeaders rieng biet (co the khac warehouse, khac keeper)
- Moi WorkHeader link ve cung Transfer Order (source_type = TRANSFER_ORDER, source_id = TRF-xxx)
- M6 quan ly Transfer Order state machine. M7 chi execute work va post InventTrans.

### 16.4 Acceptance Criteria
- **AC-7.1**: Transfer Order RELEASED (M6 TR-02) → auto-create TRANSFER_PICK work tai source warehouse.
- **AC-7.2**: Transfer pick complete → InventTrans TRANSFER_SHIP posted. Transfer Order → IN_TRANSIT.
- **AC-7.3**: Goods arrive at dest (M6 TR-04) → auto-create TRANSFER_PUT work tai destination warehouse.
- **AC-7.4**: Transfer putaway complete → InventTrans TRANSFER_RECEIVE posted. Transfer Order → RECEIVED.
- **AC-7.5**: TRANSFER_SHIP InventTrans: dim = {warehouse=source, location=STAGING_OUT, owner, item, status=AVAILABLE}. qty am (-).
- **AC-7.6**: TRANSFER_RECEIVE InventTrans: dim = {warehouse=dest, location=scanned STORAGE, owner, item, status=AVAILABLE}. qty duong (+).
- **AC-7.7**: Net OnHand change tai source WH = -qty sau TRANSFER_SHIP. Net tai dest WH = +qty sau TRANSFER_RECEIVE. Tong system net = 0 khi ca 2 trans posted.

---

## 17. State Machines

### 17.1 WorkHeader States
```
(new) → OPEN (auto-create from M4/M5/M6)
OPEN → IN_PROGRESS (Start by WH_KEEPER — after claim)
IN_PROGRESS → COMPLETED (All WorkLines COMPLETED/SKIPPED)
OPEN → CANCELLED (WH_MANAGER, assigned_to = NULL required)
IN_PROGRESS → CANCELLED (WH_MANAGER, reason_code required)
```

### 17.2 WorkLine States
```
(new) → OPEN
OPEN → IN_PROGRESS (Worker scans start)
IN_PROGRESS → COMPLETED (Scan location + actual_qty + confirm) → Creates 1 InventTrans (MOVE type)
OPEN → SKIPPED (System/Manager skip — reason_code required)
OPEN/IN_PROGRESS → CANCELLED (Parent WorkHeader cancelled)
```

### 17.3 Shipment State Handoff (v1.1 — Corrected)
```
Shipment ALLOCATED
  → M5 triggers pick work creation
  → Shipment state: ALLOCATED → PICKING
  → WH_KEEPER executes pick work
  → All pick work COMPLETED
  → Shipment state: PICKING → PICKED
  → (M5 continues: weigh → tolerance → ship)
```

### 17.4 Forbidden Transitions — WorkHeader

| From | Forbidden To | Reason |
|------|-------------|--------|
| COMPLETED | Any | Immutable after complete |
| CANCELLED | Any | Terminal state |
| OPEN (unassigned) | IN_PROGRESS | Phai Claim truoc (assigned_to != NULL) moi Start duoc |

### 17.5 Forbidden Transitions — WorkLine

| From | Forbidden To | Reason |
|------|-------------|--------|
| OPEN | COMPLETED | Phai qua IN_PROGRESS; phai scan location QR |
| COMPLETED | Any | Terminal; InventTrans da posted — immutable |
| CANCELLED | Any | Terminal state |
| SKIPPED | Any | Terminal state |

---

## 18. RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | OPS_SUPER |
|--------|-----------|------------|----------|-----------|
| View work list | Y (own WH) | Y (all) | Y | Y |
| Claim work | Y | Y | — | — |
| Start/complete WorkLine | Y (assigned) | Y | — | — |
| Cancel work (OPEN) | — | Y | Y | — |
| Cancel work (IN_PROGRESS) | — | Y | — | — |
| Override location mismatch | — | Y | — | — |
| Manager override complete | — | Y | — | — |
| Skip WorkLine | — | Y | — | — |
| Create manual move | Y | Y | — | — |
| View work reports/SLA | — | Y | Y | Y |

---

## 19. Business Rules

| Rule ID | Rule | BRD Reference | Note |
|---------|------|--------------|------|
| WE-BR-001 | Auto-create work tu source trigger | BR-WRK-002 | Receipt RECEIVED, Shipment ALLOCATED, Move/Transfer CONFIRMED |
| WE-BR-002 | Self-claim, 1 work = 1 person max | BR-WRK-001 | No directed assignment Phase 1 |
| WE-BR-003 | All WorkLines COMPLETED/SKIPPED → WorkHeader COMPLETED | — | Auto-transition |
| WE-BR-004 | WorkLine COMPLETED → 1 InventTrans (MOVE type for putaway/pick) | BR-WRK-002 | M7 chi post MOVE/TRANSFER. KHONG post RECEIVE/SHIP. |
| WE-BR-005 | Short pick >2% flag, >5% block | — | [TO-CONFIRM — P1 BLOCKER: confirm fixed 2%/5% hay configurable per owner voi BA+TVL truoc Sprint 1] |
| WE-BR-006 | Cancel OPEN = direct, IN_PROGRESS = WH_MANAGER + reason | — | |
| WE-BR-007 | Priority: Pick urgent=10, normal=30, Transfer=40, Putaway=50, Move=60 | — | Template |
| WE-BR-008 | QR scan validation required | — | Location exists, correct type |
| WE-BR-009 | Offline queue + sync via external_id | CFM-09 | Idempotent |
| WE-BR-010 | Reversal = counter-trans, never delete | BR-INV-001 | InventTrans immutable |
| WE-BR-011 | Putaway destination MUST be location_type=STORAGE | BR-IN-006 | Scan validated at complete time |
| WE-BR-012 | Manager override complete MUST have actual_qty + reason_code + evidence | — | [NEW v1.1] No blind force-complete |
| WE-BR-013 | Shipment state: ALLOCATED→PICKING (work created), PICKING→PICKED (all work done) | — | [NEW v1.1] Handoff with M5 |

---

## 20. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | GET | /api/v1/works | WH_KEEPER, WH_MANAGER | List works (filter: warehouse, status, type) |
| 2 | GET | /api/v1/works/{work_id} | WH_KEEPER, WH_MANAGER | Get work detail + lines |
| 3 | POST | /api/v1/works/{work_id}/claim | WH_KEEPER | Self-claim work |
| 4 | POST | /api/v1/works/{work_id}/release | WH_KEEPER | Release claimed work |
| 5 | POST | /api/v1/works/{work_id}/start | WH_KEEPER | Start work execution |
| 6 | POST | /api/v1/works/{work_id}/cancel | WH_MANAGER | Cancel work (reason_code) |
| 7 | POST | /api/v1/works/{work_id}/lines/{line_num}/start | WH_KEEPER | Start step |
| 8 | POST | /api/v1/works/{work_id}/lines/{line_num}/complete | WH_KEEPER | Complete step (actual_qty, scanned_location) |
| 9 | POST | /api/v1/works/{work_id}/lines/{line_num}/skip | WH_MANAGER | Skip step (reason_code) |
| 10 | POST | /api/v1/works/{work_id}/manager-override-complete | WH_MANAGER | Override complete (actual_qty + reason + evidence) |
| 11 | GET | /api/v1/mobile/works/available | WH_KEEPER | List claimable works |
| 12 | GET | /api/v1/mobile/works/my | WH_KEEPER | List assigned works |
| 13 | POST | /api/v1/mobile/scan/validate | WH_KEEPER | Validate scanned QR code |
| 14 | POST | /api/v1/mobile/works/sync | WH_KEEPER | Batch sync offline operations |

---

## 21. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline |
|---|------|----------|--------|----------|
| 1 | Short pick threshold: 2%/5% or configurable per owner? | **P1 — BLOCKER** | Work exception flow, API design, UAT | Truoc FS M7 |
| 2 | Wave processing Phase 1? | P2 | Pick optimization | Truoc Sprint planning |
| 3 | Move work approval before execute? | **P1 — BLOCKER** | Move workflow, state machine | Truoc FS M7 |
| 4 | Mobile offline max duration? | P2 | Sync design | Truoc Sprint 2 |
| 5 | Putaway split 1 receipt to multiple locations? 1 WorkHeader nhieu PUT lines hay 1 line partial complete? | **P1 — BLOCKER** | Putaway logic, schema | Truoc FS M7 |
| 6 | Work priority fixed or configurable per warehouse? | P2 | Priority engine | Truoc Sprint 2 |

---

## 22. Acceptance Criteria Summary

| Sub-Module | AC Count | AC IDs |
|-----------|----------|--------|
| 1. Work Generation | 5 | AC-1.1..1.5 |
| 2. Mobile Claim & Execution | 6 | AC-2.1..2.6 |
| 3. Completion & Posting | 6 | AC-3.1..3.6 |
| 4. Exception Handling | 4 | AC-4.1..4.4 |
| 5. Monitoring & Dashboard | 4 | AC-5.1..5.4 |
| 6. Offline Queue & Sync | 4 | AC-6.1..6.4 |
| 7. Transfer Work Execution | 7 | AC-7.1..7.7 |
| **Total** | **36** | |

---

## 23. User Stories

### US-M7-001: Work Generation
**As a** System, **I want to** auto-create work when Receipt RECEIVED / Shipment ALLOCATED / Move or Transfer CONFIRMED, **so that** warehouse keepers have tasks ready to execute.
- **Priority:** MUST HAVE
- **AC:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5

### US-M7-002: Self-Claim & Task Start
**As a** WH_KEEPER, **I want to** claim and start work from mobile app, **so that** I can execute warehouse tasks independently.
- **Priority:** MUST HAVE
- **AC:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6

### US-M7-003: Task Execution & Location Scan
**As a** WH_KEEPER, **I want to** scan QR to validate location and complete work steps, **so that** inventory movements are accurately recorded.
- **Priority:** MUST HAVE
- **AC:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6

### US-M7-004: Work Exception Handling
**As a** WH_MANAGER, **I want to** handle short picks and location mismatches, **so that** exceptions are resolved with proper audit trail.
- **Priority:** MUST HAVE
- **AC:** AC-4.1, AC-4.2, AC-4.3, AC-4.4

### US-M7-005: Work Monitoring
**As a** OPS_SUPER, **I want to** monitor work queue status and SLA, **so that** I can identify bottlenecks and overdue tasks.
- **Priority:** MUST HAVE
- **AC:** AC-5.1, AC-5.2, AC-5.3, AC-5.4

### US-M7-006: Transfer Work Execution
**As a** WH_KEEPER, **I want to** execute transfer pick at source warehouse and transfer putaway at destination warehouse, **so that** inter-warehouse transfers are tracked end-to-end.
- **Priority:** MUST HAVE
- **AC:** AC-7.1, AC-7.2, AC-7.3, AC-7.4

---

## 24. Baseline Source Documents

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_Work_Execution_Spec.md | WorkHeader/WorkLine schema, state machine, InventTrans mapping |
| 2 | TVL_SWM_BA_PO_Master.md | US-M7-001..005, Review gate |
| 3 | TVL_SWM_StateMachine.md | Work states, test cases |
| 4 | TVL_SWM_SystemControlMap.md | Posting points, event choreography |
| 5 | TVL_SWM_UserFlow_A_to_Z.md | WH_KEEPER flows 2.1-2.4 |
| 6 | TVL_SWM_Business_Rules_Document.md | BR-WRK-001, BR-WRK-002, BR-IN-006 |
| 7 | Module 4 Inbound Spec | Posting ownership at RECEIVED, putaway handoff |
| 8 | Module 5 Outbound Spec | Posting ownership at SHIPPED, pick handoff, PICKING state |
| 9 | Module 6 Inventory Control Spec | Transfer Order flow, move request trigger |
