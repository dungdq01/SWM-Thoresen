# Module 11 — Reporting, Audit & Go-Live Control: Functional Specification

**Version:** 1.1
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Pending Senior Manager Review
**Source:** 5 Check-Report Documents + BRD + End-to-End Blueprint
**Changelog v1.1:** Fix shrinkage definition (split 2 reports), refresh NFR (realistic targets), read-only principle clarification, retention rule, reconciliation actor boundary, posting trace AC. Per Senior Manager review.

---

## 1. Document Purpose

Dac ta chuc nang Module 11 — Reporting, Audit & Go-Live Control. Module nay cung cap dashboard, bao cao nghiep vu (inventory, movement, billing, shrinkage), audit trail truy vet, reconciliation tu dong, va go-live readiness checklist.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Operational Dashboard (near-real-time polling)
- Inventory Reports (on-hand, movement, aging, loss adjustment, commercial shrinkage)
- Billing Reports (event summary, debit note, revenue)
- Audit Trail Reports (user activity, state transitions, posting trace)
- Reconciliation Engine (OnHand vs InventTrans, Billing vs Events)
- Go-Live Readiness Checklist (automated + manual gates)
- Report Export (CSV, PDF)

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] Custom report builder (drag-drop)
- [PHASE 2] Scheduled email reports
- [PHASE 2] BI tool integration (Power BI / Metabase embed)
- [PHASE 2] WebSocket real-time push (Phase 1 = polling)
- [OUT OF SCOPE] Predictive analytics / ML forecasting

---

## 3. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | AuditLog, ReasonCode, NumberSequence |
| M2 Master Data | Uses | Owner, Item, Warehouse, Location |
| M3 Inventory Core | Uses | InventTrans, OnHand for all inventory reports |
| M4 Inbound | Uses | PO/Receipt data for inbound reports |
| M5 Outbound | Uses | SO/Shipment data for outbound reports |
| M6 Inventory Control | Uses | Move, Transfer, Count, Adjustment data |
| M7 Work Execution | Uses | WorkHeader/WorkLine for productivity reports |
| M8 Weighbridge | Uses | weighbridge_log for weigh reports |
| M9 VAS | Uses | vas_work_order for VAS reports |
| M10 Billing | Uses | billing_event, debit_note for billing reports |

---

## 4. Design Principles

1. **M11 does NOT create business transaction truth** [v1.1 — clarified]: M11 KHONG tao InventTrans, billing_event, hay bat ky business entity nao. Nhung M11 DUOC PHEP tao control/audit metadata: reconciliation_result, go_live_gate_status, export_job records.
2. **OnHand = SUM(InventTrans)** [CONFIRMED — CFM-01]: Moi bao cao inventory phai derive tu InventTrans, khong tu cached OnHand rieng.
3. **Reconciliation as safety net** [CONFIRMED — BR-RPT-001]: OnHand table PHAI khop voi SUM(InventTrans) GROUP BY dim. Bat ky sai lech = CRITICAL alert.
4. **Audit immutable** [CONFIRMED — BR-AUD-001]: AuditLog khong the sua/xoa. Chi append-only.
5. **Role-based report access** [CONFIRMED — BR-RPT-002]: CUST_VIEWER chi xem data cua owner minh. WH_MANAGER xem tat ca.
6. **Retention: Audit 7 years, operational reports TO-CONFIRM** [v1.1]: Audit trail retention = 7 nam (BA-PO Master confirmed). Dashboard cache va report export retention = TO-CONFIRM.

---

## 5. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Operational Dashboard | Near-real-time KPIs, alerts, work queue status |
| 2 | Inventory Reports | On-hand, movement, aging, loss adjustment, commercial shrinkage |
| 3 | Billing Reports | Event summary, DN status, revenue |
| 4 | Audit Trail Reports | User activity, state transitions, posting trace |
| 5 | Reconciliation Engine | OnHand vs InventTrans, Billing vs Events |
| 6 | Go-Live Readiness | Automated checks + manual sign-off gates |
| 7 | Export & Delivery | CSV, PDF export |

---

## 6. Sub-Module 1: Operational Dashboard

### 6.1 Dashboard Widgets

| Widget | Data Source | Refresh | Role Access |
|--------|-----------|---------|-------------|
| Total On-Hand (by owner) | OnHand / InventTrans | 60s polling | WH_MANAGER, OPS_SUPER, CUST_VIEWER (own) |
| Inbound Today | receipt (status=RECEIVED today) | 60s polling | WH_MANAGER, OPS_SUPER |
| Outbound Today | shipment (status=SHIPPED today) | 60s polling | WH_MANAGER, OPS_SUPER |
| Open Work Queue | WorkHeader (OPEN/ASSIGNED) | 60s polling | WH_MANAGER, OPS_SUPER |
| Exception Count | ExceptionLog (unresolved) | 60s polling | WH_MANAGER, OPS_SUPER |
| VAS WO In Progress | vas_work_order (IN_PROGRESS) | 5 min polling | WH_MANAGER |
| Pending Debit Notes | debit_note (DRAFT/REVIEWED) | 5 min polling | BILLING_OFC |
| Weighbridge Queue | weighbridge_log (pending) | 60s polling | WB_OPERATOR |
| Storage Utilization | location (occupied/total) | 15 min polling | WH_MANAGER, OPS_SUPER |

### 6.2 Dashboard NFR (v1.1 — Realistic targets)

| Metric | Target | Note |
|--------|--------|------|
| Dashboard initial page load | <= 5s | First meaningful paint |
| Critical widget refresh | <= 60s polling | On-hand, work queue, exceptions, weighbridge |
| Non-critical widget refresh | <= 5 min polling | VAS, DN, utilization |
| Concurrent dashboard users | >= 10 | Phase 1 target |

**v1.1 note:** Phase 1 dung polling. WebSocket real-time la Phase 2. Target <= 60s cho critical widgets la du cho operations, khong can force real-time cho moi widget.

### 6.3 Alert Rules

| Alert | Condition | Severity | Notify |
|-------|-----------|----------|--------|
| Reconciliation Mismatch | OnHand != SUM(InventTrans) | CRITICAL | WH_MANAGER, ADMIN |
| Low Stock | on_hand < reorder_point | WARNING | WH_MANAGER |
| Stuck Work | WorkHeader ASSIGNED > 4 hours | WARNING | OPS_SUPER |
| Tolerance Fail Spike | > 3 tolerance fails in 1 hour | WARNING | WH_MANAGER |
| Billing Event Orphan | billing_event without DN > 7 days | WARNING | BILLING_OFC |
| Weighbridge Offline | No heartbeat > 5 min | CRITICAL | WB_OPERATOR, WH_MANAGER |

### 6.4 Acceptance Criteria
- **AC-1.1**: Dashboard initial load trong 5s voi 10 concurrent users.
- **AC-1.2**: Critical widgets refresh <= 60s via polling.
- **AC-1.3**: CUST_VIEWER chi thay widget On-Hand cua owner minh.
- **AC-1.4**: Alert trigger dung condition va gui notification.

---

## 7. Sub-Module 2: Inventory Reports

### 7.1 Report Catalog

| Report ID | Report Name | Description | Filters |
|-----------|------------|-------------|---------|
| RPT-INV-001 | On-Hand Summary | Current stock by item/owner/location | owner, warehouse, item, status |
| RPT-INV-002 | On-Hand Detail | On-hand with InventDim breakdown | owner, warehouse, item, location, status |
| RPT-INV-003 | Movement Report | InventTrans by date range | date_from, date_to, owner, item, trans_type |
| RPT-INV-004 | Inbound Summary | Receipts by date/owner | date_from, date_to, owner, status |
| RPT-INV-005 | Outbound Summary | Shipments by date/owner | date_from, date_to, owner, status |
| RPT-INV-006 | Aging Report | Stock age by receipt date | owner, item, age_bucket (30/60/90/180) |
| RPT-INV-007 | Inventory Loss Adjustment Report | Adjustments with reason codes (DAMAGE/LOSS/MOISTURE) | date_from, date_to, owner, reason_code |
| RPT-INV-008 | Commercial Shrinkage Report | Inbound vs Outbound delta per SKU/owner (fully shipped) | owner, item, date_from, date_to |
| RPT-INV-009 | Location Utilization | Occupied vs available locations | warehouse, zone |
| RPT-INV-010 | Transfer History | Transfer orders by date/status | date_from, date_to, status |
| RPT-INV-011 | Cycle Count Variance | Count results with variance | date_from, date_to, owner, threshold |

### 7.2 On-Hand Summary Logic

```sql
-- [AI-1 v1.1 fix]: M3 InventTrans.qty la SIGNED (positive = IN, negative = OUT).
-- Khong dung direction field. SUM(qty) truc tiep.
SELECT
  i.item_code, i.item_name,
  o.owner_code, o.owner_name,
  w.warehouse_code,
  id.inventory_status,
  SUM(t.qty) AS on_hand_qty
FROM invent_trans t
JOIN invent_dim id ON t.invent_dim_id = id.id
JOIN item i ON id.item_id = i.id
JOIN owner o ON id.owner_id = o.id
JOIN warehouse w ON id.warehouse_id = w.id
WHERE t.status = 'POSTED'
GROUP BY i.item_code, i.item_name, o.owner_code, o.owner_name,
         w.warehouse_code, id.inventory_status
HAVING SUM(t.qty) != 0
```

**[AI-1 v1.1 note]:** Phien ban truoc dung `CASE WHEN direction='IN'` — sai vi M3 schema khong co `direction` field. M3 InventTrans dung `qty` duong/am theo trans_type (VAS_CONSUME am, VAS_PRODUCE duong, RECEIVE duong, SHIP am...). Tham chieu M3 spec Section 7.1.

### 7.3 Shrinkage — Two Separate Reports (v1.1 — SPLIT)

**RPT-INV-007: Inventory Loss Adjustment Report** (adjustment-based)
```
Loss_Adjustment = SUM(ABS(adjustment_qty))
  WHERE reason_code IN ('DAMAGE', 'LOSS', 'MOISTURE')
  GROUP BY owner, item, period

Loss_Rate = Loss_Adjustment / Total_OnHand * 100
Threshold alert: loss_rate > 2% → WARNING
```

**RPT-INV-008: Commercial Shrinkage Report** (lifecycle-based)
```
Shrinkage = Total_Inbound - Total_Outbound - Current_OnHand
  per SKU per owner
  (only for lots/items that have been fully shipped)

Shrinkage_Rate = Shrinkage / Total_Inbound * 100
```

**v1.1 note:** v1.0 gom chung adjustment loss va commercial shrinkage thanh 1 report "shrinkage". Day la lech baseline. Tach thanh 2 report rieng voi logic khac nhau.

### 7.4 Acceptance Criteria
- **AC-2.1**: On-Hand Summary khop voi SUM(InventTrans) — zero tolerance.
- **AC-2.2**: Movement report hien thi day du trans_type, qty, dim, ref.
- **AC-2.3**: Aging report bucket chinh xac theo receipt date.
- **AC-2.4**: Loss Adjustment report chi tinh adjustments voi reason_code DAMAGE/LOSS/MOISTURE.
- **AC-2.5**: Commercial Shrinkage report = Inbound - Outbound - OnHand per SKU/owner (fully shipped only).
- **AC-2.6**: CUST_VIEWER chi xem report cua owner minh.

---

## 8. Sub-Module 3: Billing Reports

### 8.1 Report Catalog

| Report ID | Report Name | Description | Filters |
|-----------|------------|-------------|---------|
| RPT-BIL-001 | Billing Event Summary | Events by type/owner/period | date_from, date_to, owner, event_type |
| RPT-BIL-002 | Debit Note Status | DN list with state tracking. **CUST_VIEWER: chi xem LOCKED DN cua owner minh (status filter forced = LOCKED, owner filter forced = own owner). [AI-4 v1.1]** | owner, status, date_from, date_to |
| RPT-BIL-003 | Revenue by Owner | Total billed by owner/period | owner, date_from, date_to |
| RPT-BIL-004 | Storage Fee Detail | Daily snapshot breakdown | owner, date_from, date_to |
| RPT-BIL-005 | Handling Fee Detail | In/Out handling by trip | owner, date_from, date_to |
| RPT-BIL-006 | VAS Fee Detail | Bagging fees by WO | owner, date_from, date_to |
| RPT-BIL-007 | Billing Exception | Unmatched/disputed events | owner, status |
| RPT-BIL-008 | Day Type Impact | Combined multiplier analysis | date_from, date_to |

### 8.2 Revenue Summary Logic

```
SELECT
  o.owner_code, o.owner_name,
  be.event_type,
  COUNT(*) as event_count,
  SUM(be.amount_vnd) as total_amount,
  SUM(be.amount_vnd * 0.10) as total_vat,
  SUM(be.amount_vnd * 1.10) as grand_total
FROM billing_event be
JOIN owner o ON be.owner_id = o.id
WHERE be.event_date BETWEEN :date_from AND :date_to
  AND be.status = 'BILLED'
GROUP BY o.owner_code, o.owner_name, be.event_type
ORDER BY o.owner_code, be.event_type
```

### 8.3 Acceptance Criteria
- **AC-3.1**: Billing Event Summary khop voi COUNT(*) billing_event table.
- **AC-3.2**: DN Status report phan anh dung state hien tai (DRAFT/REVIEWED/APPROVED/LOCKED).
- **AC-3.3**: Revenue report = SUM(amount_vnd) tu billing_event WHERE status = BILLED.
- **AC-3.4**: Storage Fee Detail khop voi daily_storage_snapshot data.

---

## 9. Sub-Module 4: Audit Trail Reports

### 9.1 Report Catalog

| Report ID | Report Name | Description | Filters |
|-----------|------------|-------------|---------|
| RPT-AUD-001 | User Activity Log | All actions by user | user, date_from, date_to, action_type |
| RPT-AUD-002 | State Transition Log | Entity state changes | entity_type, date_from, date_to |
| RPT-AUD-003 | Posting Trace | InventTrans trace by ref | ref_type, ref_id, date_from, date_to |
| RPT-AUD-004 | Exception Log | All exceptions with resolution | severity, status, date_from, date_to |
| RPT-AUD-005 | Permission Change Log | RBAC changes | user, date_from, date_to |
| RPT-AUD-006 | Override Log | Manual overrides by manager | user, override_type, date_from, date_to |

### 9.2 Posting Trace (End-to-End)

Cho phep trace nguoc tu bat ky InventTrans ve source:

```
InventTrans (trans_id)
  → ref_type + ref_id (e.g., RECEIPT / RCV-20260308-001)
    → WorkLine (work_line_id)
      → WorkHeader (work_id)
        → Source entity (PO / SO / Transfer / VAS WO / Adjustment)
          → User (created_by / completed_by)
            → Timestamp chain (created_at → confirmed_at → completed_at)
```

### 9.3 Retention Policy (v1.1 — Clarified)

| Data Type | Retention | Note |
|-----------|-----------|------|
| Audit trail (AuditLog) | 7 years accessible | BA-PO Master confirmed |
| InventTrans | 7 years | Immutable ledger |
| Reconciliation results | 3 years | Control metadata |
| Report exports (CSV/PDF files) | [TO-CONFIRM] | Operational, likely 1 year |
| Dashboard cache | No retention (ephemeral) | Recalculated on refresh |

### 9.4 Acceptance Criteria
- **AC-4.1**: User Activity Log hien thi moi action voi user, timestamp, entity, old/new value.
- **AC-4.2**: Posting Trace returns full chain tu InventTrans → source entity trong 1 API response (co the multi-query internally).
- **AC-4.3**: Exception Log filter duoc theo severity va resolution status.
- **AC-4.4**: Audit data la immutable — khong co UPDATE/DELETE endpoint.
- **AC-4.5**: Audit trail accessible for 7 years from creation date.

---

## 10. Sub-Module 5: Reconciliation Engine

### 10.1 Reconciliation Checks

| Check ID | Check Name | Formula | Frequency | Severity |
|----------|-----------|---------|-----------|----------|
| RECON-001 | OnHand vs InventTrans | on_hand_table.qty == SUM(invent_trans.qty) per dim | Hourly | CRITICAL |
| *(RECON-001 NFR)* | *Performance: RECON-001 phai hoan thanh trong <= 5 phut tren invent_trans table. Index (status, invent_dim_id) la bat buoc. [AI-3 v1.1]* | | | |
| RECON-002 | Billing Events vs DN Lines | COUNT(billing_event WHERE status=BILLED) == COUNT(debit_note_line) | Daily | HIGH |
| RECON-003 | Inbound Qty vs Receipt Qty | SUM(receipt_line.received_qty) == SUM(invent_trans WHERE type=RECEIVE) | Daily | HIGH |
| RECON-004 | Outbound Qty vs Ship Qty | SUM(shipment_line.shipped_qty) == SUM(invent_trans WHERE type=SHIP) | Daily | HIGH |
| RECON-005 | VAS Input vs Output | vas_wo.actual_consumed == actual_produced + process_loss | Daily | MEDIUM |
| RECON-006 | Work Completion vs Posting | COUNT(work_line WHERE status=COMPLETED) == COUNT(invent_trans WHERE ref=WORK) | Daily | HIGH |
| RECON-007 | Storage Snapshot vs OnHand | daily_storage_snapshot.opening_qty == previous_day closing | Daily | HIGH |

### 10.2 Reconciliation Result Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| check_id | VARCHAR(20) | Y | RECON-001..007 |
| check_name | VARCHAR(100) | Y | |
| run_at | TIMESTAMPTZ | Y | |
| status | ENUM | Y | PASS / FAIL / WARNING |
| expected_value | DECIMAL(15,3) | N | |
| actual_value | DECIMAL(15,3) | N | |
| variance | DECIMAL(15,3) | N | |
| dimension_key | JSONB | N | InventDim breakdown for failed check |
| details | JSONB | N | Additional context |
| resolved_at | TIMESTAMPTZ | N | |
| resolved_by | VARCHAR | N | |
| resolution_note | TEXT | N | |

### 10.3 Acceptance Criteria
- **AC-5.1**: RECON-001 chay hourly va phat hien sai lech OnHand vs InventTrans.
- **AC-5.2**: RECON-001 FAIL → CRITICAL alert gui WH_MANAGER + ADMIN.
- **AC-5.3**: Reconciliation result luu lich su de audit.
- **AC-5.4**: Failed reconciliation yeu cau manual resolution voi note.
- **AC-5.5**: RECON-002..007 chay daily voi correct formula.

---

## 11. Sub-Module 6: Go-Live Readiness

### 11.1 Automated Checks

| Gate ID | Check | Auto/Manual | Pass Criteria |
|---------|-------|-------------|---------------|
| GL-001 | Master Data completeness | Auto | All required owners, items, locations, rate cards exist |
| GL-002 | RBAC configured | Auto | All 8 roles have permissions assigned |
| GL-003 | Number Sequences active | Auto | All sequences initialized: RCV (Receipt), SHP (Shipment), WRK (Work), TRF (Transfer Order), DN (Debit Note), VAS (VAS Work Order), ADJ (Adjustment/Cycle Count). [AI-2 v1.1 — added TRF, ADJ] |
| GL-004 | Weighbridge connectivity | Auto | Heartbeat received within 5 min |
| GL-005 | Reconciliation clean | Auto | All RECON checks PASS for last 3 consecutive runs |
| GL-006 | No open CRITICAL exceptions | Auto | ExceptionLog CRITICAL count = 0 |
| GL-007 | Test data cleanup | Manual | Confirm test data removed / isolated |
| GL-008 | UAT sign-off | Manual | All UAT scenarios passed |
| GL-009 | Backup verified | Manual | DB backup + restore test completed |
| GL-010 | ERP sync tested | Manual | At least 1 successful DN push to ERP |
| GL-011 | Training completed | Manual | All roles trained |
| GL-012 | Rollback plan documented | Manual | Documented and reviewed |

### 11.2 Go-Live Readiness Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| gate_id | VARCHAR(10) | Y | GL-001..012 |
| gate_name | VARCHAR(100) | Y | |
| check_type | ENUM | Y | AUTO / MANUAL |
| status | ENUM | Y | PENDING / PASS / FAIL / WAIVED |
| checked_at | TIMESTAMPTZ | N | |
| checked_by | VARCHAR | N | |
| evidence | TEXT | N | Link or description |
| waiver_reason | TEXT | N | If WAIVED |
| notes | TEXT | N | |

### 11.3 Acceptance Criteria
- **AC-6.1**: Automated gates chay on-demand va return PASS/FAIL.
- **AC-6.2**: Manual gates require sign-off boi ADMIN hoac WH_MANAGER.
- **AC-6.3**: Go-Live chi proceed khi ALL gates PASS hoac WAIVED (voi reason).
- **AC-6.4**: Go-Live readiness snapshot luu lai de audit.

---

## 12. Sub-Module 7: Export & Delivery

### 12.1 Export Formats

| Format | Max Rows | Timeout | Note |
|--------|----------|---------|------|
| CSV | 500,000 | 60s | Default for data exports |
| PDF | 10,000 | 30s | Formatted with header/footer |
| Screen | 1,000 | 5s | Paginated display |

### 12.2 Export Logic
- All exports go through same report query engine
- Large exports (> 10K rows): async job with download link
- Export includes: report name, filters applied, generated_at, generated_by
- CSV: UTF-8 BOM for Excel compatibility
- PDF: Company header, page numbers, filter summary

### 12.3 Acceptance Criteria
- **AC-7.1**: CSV export chinh xac va mo duoc trong Excel.
- **AC-7.2**: PDF export co header, filter summary, page numbers.
- **AC-7.3**: Large export (> 10K rows) chay async va tra download link.

---

## 13. RBAC & Permissions (v1.1 — Actor boundary clarified)

| Action | WH_MANAGER | WH_KEEPER | WH_ADMIN | WB_OPERATOR | BILLING_OFC | OPS_SUPER | ADMIN | CUST_VIEWER |
|--------|------------|-----------|----------|-------------|-------------|-----------|-------|-------------|
| View Dashboard | Y | Y (limited) | Y | Y (WB only) | Y (billing) | Y | Y | Y (own) |
| Inventory Reports | Y | — | Y | — | — | Y | Y | Y (own) |
| Billing Reports | — | — | — | — | Y | — | Y | Y (own DN) |
| Audit Reports | Y | — | — | — | — | Y | Y | — |
| Run Reconciliation | — | — | — | — | — | Y | Y | — |
| View Reconciliation Results | Y | — | — | — | — | Y | Y | — |
| Resolve Failed Reconciliation | — | — | — | — | — | — | Y | — |
| Go-Live Checklist (run auto) | — | — | — | — | — | — | Y | — |
| Go-Live Manual Sign-off | — | — | — | — | — | — | Y | — |
| Export CSV/PDF | Y | — | Y | — | Y | Y | Y | Y (own) |

**v1.1 changes:**
- OPS_SUPER can run and view reconciliation (operational role). ADMIN resolves failures.
- Go-Live gates: ADMIN only (system-level control).
- WH_MANAGER can view reconciliation results but not resolve.

---

## 14. Business Rules

| Rule ID | Rule | BRD Reference |
|---------|------|---------------|
| RPT-BR-001 | OnHand report MUST derive from SUM(InventTrans), not cached table | BR-INV-001 |
| RPT-BR-002 | CUST_VIEWER sees only own owner data | BR-RPT-002 |
| RPT-BR-003 | Reconciliation RECON-001 fail = CRITICAL alert | BR-RPT-001 |
| RPT-BR-004 | Audit log is immutable (append-only). Retention 7 years. | BR-AUD-001 |
| RPT-BR-005 | Report export includes metadata (who, when, filters) | — |
| RPT-BR-006 | Go-Live requires ALL gates PASS or WAIVED | — |
| RPT-BR-007 | Dashboard: critical widgets <=60s polling, initial load <=5s | NFR, v1.1 |
| RPT-BR-008 | Loss Adjustment report = adjustment-based. Commercial Shrinkage = inbound-outbound delta. | v1.1 |
| RPT-BR-009 | M11 does NOT create business transaction truth. Only control/audit metadata. | v1.1 |

---

## 15. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | GET | /api/v1/dashboard/summary | ALL (role-filtered) | Dashboard KPI summary |
| 2 | GET | /api/v1/dashboard/alerts | WH_MANAGER, OPS_SUPER | Active alerts |
| 3 | GET | /api/v1/reports/inventory/on-hand | WH_MANAGER, CUST_VIEWER | On-hand summary/detail |
| 4 | GET | /api/v1/reports/inventory/movement | WH_MANAGER, OPS_SUPER | Movement report |
| 5 | GET | /api/v1/reports/inventory/aging | WH_MANAGER | Aging report |
| 6 | GET | /api/v1/reports/inventory/loss-adjustment | WH_MANAGER | Loss adjustment report |
| 7 | GET | /api/v1/reports/inventory/shrinkage | WH_MANAGER | Commercial shrinkage report |
| 8 | GET | /api/v1/reports/inventory/location-util | WH_MANAGER | Location utilization |
| 9 | GET | /api/v1/reports/billing/events | BILLING_OFC | Billing event summary |
| 10 | GET | /api/v1/reports/billing/debit-notes | BILLING_OFC, CUST_VIEWER | DN status report |
| 11 | GET | /api/v1/reports/billing/revenue | BILLING_OFC | Revenue by owner |
| 12 | GET | /api/v1/reports/billing/storage-detail | BILLING_OFC | Storage fee detail |
| 13 | GET | /api/v1/reports/audit/activity | ADMIN | User activity log |
| 14 | GET | /api/v1/reports/audit/state-transitions | ADMIN | State transition log |
| 15 | GET | /api/v1/reports/audit/posting-trace | ADMIN, WH_MANAGER | Posting trace |
| 16 | GET | /api/v1/reports/audit/exceptions | WH_MANAGER, OPS_SUPER | Exception log |
| 17 | POST | /api/v1/reconciliation/run | OPS_SUPER, ADMIN | Trigger reconciliation |
| 18 | GET | /api/v1/reconciliation/results | WH_MANAGER, OPS_SUPER, ADMIN | Reconciliation results |
| 19 | POST | /api/v1/reconciliation/{id}/resolve | ADMIN | Resolve failed check |
| 20 | GET | /api/v1/go-live/status | ADMIN | Go-live readiness status |
| 21 | POST | /api/v1/go-live/check | ADMIN | Run automated checks |
| 22 | POST | /api/v1/go-live/{gate_id}/sign-off | ADMIN | Manual gate sign-off |
| 23 | POST | /api/v1/reports/export | ALL (role-filtered) | Export report CSV/PDF |

---

## 16. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline |
|---|------|----------|--------|----------|
| 1 | Report export file retention period (1 year suggested)? | P2 | Storage | Truoc Sprint 3 |
| 2 | Reconciliation auto-run schedule (hourly RECON-001, daily others) ok? | P1 | Operations | Truoc Sprint 2 |
| 3 | Go-live gate list final (12 gates) or need more? | P2 | Go-live | Truoc Sprint 3 |
| 4 | PDF report template design (company logo, layout)? | P3 | UX | Truoc UAT |
| 5 | Alert notification channel (in-app only or email/SMS)? | P2 | Operations | Truoc Sprint 3 |

**v1.1 removed:** Dashboard refresh interval TO-CONFIRM — decided as <=60s polling (Phase 1).

---

## 17. Acceptance Criteria Summary

| Sub-Module | AC Count | AC IDs |
|-----------|----------|--------|
| 1. Dashboard | 4 | AC-1.1..1.4 |
| 2. Inventory Reports | 6 | AC-2.1..2.6 |
| 3. Billing Reports | 4 | AC-3.1..3.4 |
| 4. Audit Trail | 5 | AC-4.1..4.5 |
| 5. Reconciliation | 5 | AC-5.1..5.5 |
| 6. Go-Live Readiness | 4 | AC-6.1..6.4 |
| 7. Export & Delivery | 3 | AC-7.1..7.3 |
| **Total** | **31** | |

---

## 18. User Stories

### US-M11-001: Operational Dashboard
**As a** WH_MANAGER, **I want to** see near-real-time KPIs on a dashboard with <=60s refresh, **so that** I can monitor warehouse operations at a glance.
- **Priority:** MUST HAVE

### US-M11-002: Inventory & Movement Reports
**As a** WH_MANAGER, **I want to** generate on-hand, movement, aging, loss adjustment, and commercial shrinkage reports, **so that** I can track inventory accuracy and identify losses.
- **Priority:** MUST HAVE

### US-M11-003: Reconciliation Engine
**As an** OPS_SUPER, **I want** to run reconciliation between OnHand and InventTrans, **so that** any data integrity issues are detected immediately.
- **Priority:** MUST HAVE

### US-M11-004: Go-Live Readiness
**As an** ADMIN, **I want** a go-live checklist with automated and manual gates, **so that** we can ensure system readiness before production launch.
- **Priority:** MUST HAVE

### US-M11-005: Billing Reports
**As a** BILLING_OFC, **I want to** view billing event summaries, DN status, and revenue reports, **so that** I can reconcile billing and track revenue.
- **Priority:** MUST HAVE

### US-M11-006: Customer Self-Service Reports
**As a** CUST_VIEWER, **I want to** view my own inventory and locked debit notes, **so that** I can track my stock and billing without contacting TVL.
- **Priority:** SHOULD HAVE

---

## 19. Baseline Source Documents

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_BA_PO_Master.md | US-M11-001..004, shrinkage definition, retention |
| 2 | TVL_SWM_Business_Rules_Document.md | BR-RPT-001..002, BR-AUD-001, BR-INV-001..010 |
| 3 | TVL_SWM_SystemFlow_EndToEnd.md | Reconciliation checks, posting trace |
| 4 | TVL_SWM_SystemControlMap.md | Audit trail requirements |
| 5 | THORESEN_SWM_PRD_VIBECODING_v2_0.md | CFM-01, CFM-11 (reporting read-only) |
| 6 | Module 9 VAS Spec | Material balance formula for RECON-005 |
| 7 | Module 10 Billing Spec | Event ownership contract for billing reports |
