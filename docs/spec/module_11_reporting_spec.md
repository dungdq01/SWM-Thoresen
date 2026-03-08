# Module 11 — Reporting, Audit & Go-Live Control: Functional Specification

**Version:** 1.2
**Created:** 2026-03-08
**Revised:** 2026-03-09
**Status:** DRAFT — Enhanced Build-Ready Version
**Source:** 5 Check-Report Documents + BRD + End-to-End Blueprint
**Changelog v1.1:** Fix shrinkage definition (split 2 reports), refresh NFR (realistic targets), read-only principle clarification, retention rule, reconciliation actor boundary, posting trace AC. Per Senior Manager review.
**Changelog v1.2:** Bo sung business context, ownership boundary, input/output, report output contract, dashboard KPI contract, reconciliation matrix chi tiet, go-live governance pack, export job lifecycle, API functional contract, exception handling, UAT scenario matrix, decision log va senior manager review gate. Uu tien bo sung, han che xoa noi dung goc.

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

## 20. Business Context, Ownership Boundary & Input/Output (v1.2)

### 20.1 Business Context

Module 11 dong vai tro "control tower" cho toan bo chuong trinh SWM. Muc tieu cua module khong phai tao giao dich nghiep vu moi, ma la tong hop du lieu tu M1-M10 thanh thong tin dieu hanh, doi soat, audit va san sang go-live. M11 chi co gia tri khi ton kho goc, billing events va state transition o cac module ben duoi da dung va truy vet duoc.

### 20.2 Ownership Statement

**M11 SO HUU:**
- dashboard KPI definitions
- report query definitions
- reconciliation_result
- go_live_gate_status
- export_job / export_file metadata
- report/audit access control at presentation layer

**M11 KHONG SO HUU:**
- InventTrans / OnHand posting
- Receipt / Shipment / Work state transition
- billing_event generation
- debit_note calculation / locking
- direct UPDATE/DELETE tren immutable audit or ledger

### 20.3 Input / Output

**Input:**
- master data tu M1-M2 (owner, item, warehouse, location, reason_code, role)
- inventory ledger tu M3 (invent_dim, invent_trans, on_hand)
- operational documents tu M4-M9 (receipt, shipment, work_header/work_line, weighbridge_log, vas_work_order)
- billing data tu M10 (billing_event, daily_storage_snapshot, debit_note)
- system audit / exception logs tu M1 va cross-module control tables

**Output:**
- dashboard KPI va alert tiles
- report datasets va export files (CSV/PDF)
- reconciliation results, mismatch details, resolution history
- go-live readiness status, evidence, waiver log
- audit trace views phuc vu operations, billing, audit va senior manager

### 20.4 Typical Business Cases

- WH_MANAGER xem ton hien tai theo owner, item, warehouse, tinh trang, va can drill-down tu summary xuong InventDim detail.
- BILLING_OFC doi soat billing events, debit note va storage snapshots truoc khi khoa ky.
- OPS_SUPER chay reconciliation hang ngay de phat hien lech OnHand vs InventTrans truoc khi gay tranh chap khach hang.
- ADMIN su dung go-live checklist de kiem tra readiness truoc khi production launch hoac cutover go-live gate.
- CUST_VIEWER chi duoc xem data cua owner minh, khong thay owner khac.

---

## 21. Dashboard KPI Contract & Drill-Down Rules (v1.2)

### 21.1 KPI Contract

| Widget | KPI Definition | Grain | Default Filter | Drill-Down | Notes |
|--------|----------------|-------|----------------|-----------|-------|
| Total On-Hand | SUM(invent_trans.qty) by current dim snapshot | owner/item/warehouse/status | active warehouse(s), current day snapshot | RPT-INV-001 / RPT-INV-002 | CUST_VIEWER owner-scope only |
| Inbound Today | count(receipt where RECEIVED today), sum(received_qty_mt) | owner/receipt | warehouse, local date | receipt detail list | must show both document count + tonnage |
| Outbound Today | count(shipment where SHIPPED today), sum(shipped_qty_mt) | owner/shipment | warehouse, local date | shipment detail list | must show both document count + tonnage |
| Open Work Queue | count(work_header by status OPEN/ASSIGNED/IN_PROGRESS/OVERDUE) | work type/status | warehouse | work queue screen | OVERDUE derived by SLA rule |
| Exception Count | unresolved exceptions by severity | exception severity/type | warehouse, unresolved only | exception list | show CRITICAL separately |
| Storage Utilization | occupied_capacity / total_capacity | warehouse/zone | warehouse | RPT-INV-009 | warn >=85%, critical >=100% |
| Pending Debit Notes | count(DN DRAFT/REVIEWED), amount | billing period/owner | current open period | billing DN list | billing role only |
| Weighbridge Queue | count pending weigh sessions / no heartbeat | weighbridge/device | active device | WB queue detail | WB_OPERATOR only |

### 21.2 Dashboard Display Rules

- Tat ca widget phai hien thi `last_refreshed_at`.
- KPI co gia tri tonnage phai chuan hoa don vi metric ton (MT) tren UI; export co the su dung kg neu report contract yeu cau.
- Widget summary phai co empty-state ro rang: `No data for selected filters`.
- Khi user thay doi filter owner/warehouse/date, tat ca widget lien quan phai refresh theo cung filter context.
- Dashboard khong duoc hien thi du lieu cross-owner cho CUST_VIEWER.

---

## 22. Report Output Contract Catalog (v1.2)

### 22.1 Inventory Reports — Output Contract

| Report ID | Primary Grain | Mandatory Output Columns | Default Sort | Drill-Down | Export Notes |
|-----------|---------------|--------------------------|--------------|-----------|-------------|
| RPT-INV-001 | owner + item + warehouse + status | owner_code, owner_name, item_code, item_name, warehouse_code, inventory_status, on_hand_qty_mt, reserved_qty_mt, available_qty_mt | owner_code, item_code | to RPT-INV-002 | CSV/PDF both support subtotal by owner |
| RPT-INV-002 | InventDim | owner_code, item_code, warehouse_code, location_code, lot_no, batch_no, pallet_no, inventory_status, qty_mt, last_trans_at | warehouse_code, location_code | to posting trace | screen pagination required |
| RPT-INV-003 | InventTrans row | trans_date, trans_id, trans_type, ref_type, ref_id, owner_code, item_code, invent_dim_id, qty_mt, uom, created_by | trans_date desc, trans_id desc | to posting trace | CSV default format |
| RPT-INV-004 | receipt | receipt_no, receipt_date, owner_code, source_doc_no, total_expected_mt, total_received_mt, variance_mt, status | receipt_date desc | to receipt detail | include RECEIVED only by default |
| RPT-INV-005 | shipment | shipment_no, shipment_date, owner_code, source_doc_no, total_expected_mt, total_shipped_mt, variance_mt, status | shipment_date desc | to shipment detail | include SHIPPED only by default |
| RPT-INV-006 | stock bucket | owner_code, item_code, warehouse_code, age_bucket, qty_mt, receipt_reference_oldest, receipt_reference_newest | owner_code, item_code, age_bucket | to receipt trace | bucket source = receipt_date |
| RPT-INV-007 | adjustment line | trans_date, adjustment_no, owner_code, item_code, reason_code, qty_loss_mt, approved_by, note | trans_date desc | to adjustment document | reason_code mandatory |
| RPT-INV-008 | owner + item + lifecycle period | owner_code, item_code, inbound_mt, outbound_mt, current_on_hand_mt, shrinkage_mt, shrinkage_rate_pct, lifecycle_flag | shrinkage_rate_pct desc | to movement report | fully shipped only |
| RPT-INV-009 | warehouse + zone | warehouse_code, zone_code, capacity_mt, occupied_mt, utilization_pct, warning_level | utilization_pct desc | to location list | threshold color only on UI |
| RPT-INV-010 | transfer order | transfer_no, request_date, ship_warehouse, receive_warehouse, owner_code, item_code, qty_mt, status | request_date desc | to transfer detail | |
| RPT-INV-011 | count line | count_no, count_date, owner_code, item_code, location_code, system_qty_mt, counted_qty_mt, variance_mt, reason_code, approved_by | abs(variance_mt) desc | to count document | |

### 22.2 Billing & Audit Reports — Output Contract

| Report ID | Primary Grain | Mandatory Output Columns | Default Sort | Drill-Down |
|-----------|---------------|--------------------------|--------------|-----------|
| RPT-BIL-001 | billing_event | billing_event_id, event_date, owner_code, charge_code, service_type, source_module, source_ref_type, source_ref_id, qty_basis, rate, amount_vnd, status | event_date desc | to source document |
| RPT-BIL-002 | debit_note | debit_note_no, billing_period, owner_code, amount_before_tax, tax_amount, total_amount, status, locked_at | debit_note_no desc | to DN line detail |
| RPT-BIL-003 | revenue aggregate | billing_period, owner_code, charge_group, amount_vnd, billed_event_count | billing_period desc | to RPT-BIL-001 |
| RPT-BIL-004 | storage snapshot | snapshot_date, owner_code, item_code, warehouse_code, opening_qty_mt, closing_qty_mt, billable_days, storage_amount_vnd | snapshot_date desc | to snapshot detail |
| RPT-AUD-001 | audit row | audit_id, action_at, user_id, role_code, entity_type, entity_id, action_type, old_value, new_value, reason_code | action_at desc | none |
| RPT-AUD-002 | state transition | entity_type, entity_id, from_state, to_state, changed_at, changed_by, reason_code | changed_at desc | to source document |
| RPT-AUD-003 | posting trace | trans_id, trans_type, ref_type, ref_id, source_doc_no, work_id, user_id, posting_at | posting_at desc | full trace |
| RPT-AUD-004 | exception | exception_id, exception_type, severity, entity_type, entity_id, opened_at, opened_by, status, resolved_at, resolved_by | opened_at desc | to resolution history |
| RPT-AUD-005 | permission change | changed_at, changed_by, target_user, role_before, role_after, scope_before, scope_after | changed_at desc | none |
| RPT-AUD-006 | override | override_at, override_by, override_type, entity_type, entity_id, reason_code, note | override_at desc | to source document |

### 22.3 General Report Rules

- Moi report phai tra ve `report_name`, `applied_filters`, `generated_at`, `generated_by`, `timezone` trong export metadata.
- Date filters dung timezone khoi tao he thong; Phase 1 mac dinh Asia/Bangkok neu khong truyen timezone.
- Screen default limit = 100 dong/trang; max 1,000 dong/trang.
- PDF chi dung cho report co tinh tong hop/summary; report qua chi tiet se ep user dung CSV.

---

## 23. Reconciliation Matrix & Resolution Workflow (v1.2)

### 23.1 Detailed Reconciliation Matrix

| Check ID | Source A | Source B | Join Key / Grain | Mismatch Rule | Frequency | Auto/Manual | Resolution Owner |
|----------|----------|----------|------------------|---------------|-----------|-------------|------------------|
| RECON-001 | on_hand | invent_trans | invent_dim_id | on_hand.qty != SUM(invent_trans.qty) | hourly | auto detect / manual resolve | ADMIN |
| RECON-002 | billing_event | domain event source (receipt/shipment/vas completion/storage snapshot) | source_ref_type + source_ref_id + charge_code | expected chargeable events missing or duplicated in billing_event | daily | auto detect / manual resolve | BILLING_OFC + ADMIN |
| RECON-003 | debit_note_line | billing_event (billable status) | billing_period + owner + billing_event_id | billed events not included / duplicated in DN lines | daily | auto detect / manual resolve | BILLING_OFC |
| RECON-004 | receipt_line.received_qty | invent_trans RECEIVE | receipt_line_id | SUM(received_qty) != SUM(posted RECEIVE qty) | daily | auto detect / manual resolve | WH_MANAGER |
| RECON-005 | shipment_line.shipped_qty | invent_trans SHIP | shipment_line_id | SUM(shipped_qty) != SUM(posted SHIP qty) | daily | auto detect / manual resolve | WH_MANAGER |
| RECON-006 | vas_work_order actuals | invent_trans VAS_CONSUME/VAS_PRODUCE | vas_work_order_id | consumed != produced + loss, or missing trans | daily | auto detect / manual resolve | OPS_SUPER |
| RECON-007 | work_line COMPLETED | downstream posting/audit events | work_line_id | completed work without expected posting/audit | daily | auto detect / manual resolve | OPS_SUPER |
| RECON-008 | daily_storage_snapshot | previous day closing / current billable stock | owner + item + warehouse + date | opening != previous closing, or snapshot missing | daily | auto detect / manual resolve | BILLING_OFC |
| RECON-009 | override actions | reason code / audit completeness | audit_id | override exists without reason_code/evidence | daily | auto detect / manual resolve | ADMIN |

### 23.2 Resolution Workflow

1. System tao `reconciliation_result` khi check PASS/FAIL/WARNING.
2. Neu FAIL/WARNING, system gan severity, dimension_key, mismatch details va notification recipients.
3. User co quyen xem mismatch detail va tao phan tich nguyen nhan goc.
4. Chi actor duoc phan quyen moi duoc `resolve`; resolution bat buoc note va evidence.
5. Resolve trong M11 **khong** tu dong sua ledger. Neu can sua du lieu, phai quay ve module so huu (M3/M4/M5/M9/M10), sau do rerun reconciliation.
6. Sau khi source duoc sua dung theo module so huu, user rerun check; ket qua moi duoc luu thanh 1 record lich su khac.

### 23.3 Reconciliation Result Detail Rules

- `dimension_key` phai du de truy nguoc mismatch (owner/item/location/ref_id).
- `expected_value`, `actual_value`, `variance` la mandatory voi cac check so hoc.
- Mot lan `resolve` khong xoa record fail cu; chi them `resolved_at`, `resolved_by`, `resolution_note`, `evidence_ref`.
- Rerun check tao record moi, lien ket record fail truoc bang `supersedes_result_id` neu can.

---

## 24. Go-Live Governance Pack (v1.2)

### 24.1 Go-Live Gate Matrix

| Gate ID | Gate Name | Type | Owner | Reviewer | Evidence Required | Waiver Allowed | Milestone |
|---------|-----------|------|-------|----------|-------------------|----------------|----------|
| GL-001 | Master Data completeness | AUTO | WH_ADMIN | ADMIN | auto result + missing list = 0 | N | Before SIT |
| GL-002 | RBAC configured | AUTO | ADMIN | Senior Manager | role permission matrix snapshot | N | Before UAT |
| GL-003 | Number Sequences active | AUTO | WH_ADMIN | ADMIN | sequence health check | N | Before UAT |
| GL-004 | Weighbridge connectivity | AUTO | WB_OPERATOR | WH_MANAGER | heartbeat log within 5 min | Y | Before go-live |
| GL-005 | Reconciliation clean | AUTO | OPS_SUPER | ADMIN | last 3 consecutive PASS runs | N | Before go-live |
| GL-006 | No open CRITICAL exceptions | AUTO | OPS_SUPER | ADMIN | exception report = 0 | N | Before go-live |
| GL-007 | Test data cleanup | MANUAL | WH_ADMIN | ADMIN | checklist + screenshot / SQL evidence | Y | Before go-live |
| GL-008 | UAT sign-off | MANUAL | Business Lead | Senior Manager | signed UAT summary | N | Before go-live |
| GL-009 | Backup verified | MANUAL | IT/DBA | ADMIN | backup + restore evidence | N | Before go-live |
| GL-010 | ERP sync tested | MANUAL | BILLING_OFC | Finance / Admin | at least 1 successful DN push | Y | Before go-live |
| GL-011 | Training completed | MANUAL | OPS_SUPER | Senior Manager | training attendance | Y | Before go-live |
| GL-012 | Rollback plan documented | MANUAL | ADMIN | Senior Manager | rollback document version | N | Before go-live |
| GL-013 | Runbook / monitoring ready | MANUAL | ADMIN | Senior Manager | runbook + alert routing | N | Before go-live |
| GL-014 | Cutover contact list approved | MANUAL | PM / Admin | Senior Manager | contact matrix | Y | Before go-live |

### 24.2 Go/No-Go Decision Rules

- Default rule: tat ca gate phai PASS.
- Waiver chi duoc dung cho gate co `Waiver Allowed = Y` va phai co `waiver_reason`, `waiver_approver`, `waiver_expiry`.
- Bat ky gate FAIL khong cho phep waiver se block go-live.
- M11 phai luu `readiness_snapshot_no`, `generated_at`, `generated_by`, `overall_status` de audit.

### 24.3 Manual Sign-Off Rules

- Manual sign-off phai co: actor, timestamp, note, evidence_ref.
- 1 gate co the duoc sign-off nhieu lan; lan moi nhat la effective status, nhung lich su khong duoc mat.
- Khong cho phep sign-off manual neu gate type = AUTO va lan check cuoi dang FAIL, tru khi gate do cho phep waiver.

---

## 25. Export Job Lifecycle & Delivery Rules (v1.2)

### 25.1 Export Job Status Flow

`QUEUED -> RUNNING -> COMPLETED | FAILED | EXPIRED`

### 25.2 Export Job Schema (logical)

| Field | Type | Required | Note |
|-------|------|----------|------|
| export_job_id | UUID | Y | PK |
| report_id | VARCHAR(30) | Y | source report |
| export_format | ENUM | Y | CSV / PDF |
| requested_by | VARCHAR | Y | user id |
| requested_at | TIMESTAMPTZ | Y | |
| job_status | ENUM | Y | QUEUED / RUNNING / COMPLETED / FAILED / EXPIRED |
| filter_payload | JSONB | Y | normalized filters |
| row_count | INTEGER | N | set when completed |
| file_uri | TEXT | N | signed download path or internal path |
| expires_at | TIMESTAMPTZ | N | retention-controlled |
| failure_reason | TEXT | N | |

### 25.3 Delivery Rules

- Export > 10,000 dong phai tao async job.
- Download link chi hop le den `expires_at`.
- User chi tai duoc file do chinh minh tao, tru ADMIN.
- CUST_VIEWER export phai tiep tuc ap dung owner-scope o file output.
- PDF phai co header cong ty, report title, period, filters, page number, generated_by.

---

## 26. API Functional Contract (v1.2)

### 26.1 Common API Rules

- GET endpoints la read-only, khong tao side effect.
- POST command endpoints phai ho tro idempotency key qua header `Idempotency-Key`.
- Tat ca list endpoints ho tro `page`, `page_size`, `sort_by`, `sort_dir`; default `page=1`, `page_size=100`.
- Response errors toi thieu: `403 forbidden_scope`, `422 invalid_filter`, `429 export_limit_exceeded`, `500 internal_error`.
- CUST_VIEWER khong duoc truyen owner khac owner_scope cua minh; neu co, backend bo qua hoac tra 403 theo security policy.

### 26.2 Selected Endpoint Contract

#### GET /api/v1/dashboard/summary
- Purpose: tra ve bo KPI tong hop cho dashboard.
- Request params: `owner_id?`, `warehouse_id?`, `date?`, `timezone?`.
- Response minimum fields: `widgets[]`, `last_refreshed_at`, `applied_filters`.
- Validation: date mac dinh ngay hien tai theo timezone.

#### GET /api/v1/reports/inventory/on-hand
- Purpose: on-hand summary or detail.
- Request params: `view=summary|detail`, `owner_id?`, `warehouse_id?`, `item_id?`, `location_id?`, `status?`, `page`, `page_size`, `export?`.
- Sort default: `owner_code asc, item_code asc`.
- Response: `rows[]`, `totals`, `pagination`, `generated_at`.
- Validation: `location_id` chi hop le khi `view=detail`.

#### GET /api/v1/reports/inventory/movement
- Purpose: liet ke InventTrans trong khoang thoi gian.
- Request params: `date_from`, `date_to`, `owner_id?`, `item_id?`, `trans_type?`, `ref_type?`, `page`, `page_size`.
- Validation: `date_to >= date_from`, range toi da 92 ngay cho screen query.

#### GET /api/v1/reports/billing/events
- Purpose: bao cao billing_event.
- Request params: `billing_period?`, `owner_id?`, `charge_code?`, `status?`, `page`, `page_size`.
- Response includes `amount_vnd_total`.

#### GET /api/v1/reports/audit/posting-trace
- Purpose: tra full chain tu trans/ref ve source document.
- Request params: `trans_id?`, `ref_type?`, `ref_id?`, `date_from?`, `date_to?`.
- Validation: phai co it nhat 1 trong 3 khoa `trans_id/ref_type+ref_id/date_range`.

#### POST /api/v1/reconciliation/run
- Purpose: trigger 1 hoac nhieu reconciliation checks.
- Request body: `check_ids[]`, `run_scope`, `note?`.
- Idempotency: cung `Idempotency-Key` + cung payload trong 10 phut tra lai ket qua job cu.
- Response: `job_id`, `accepted_checks`, `status=QUEUED|RUNNING`.

#### GET /api/v1/reconciliation/results
- Purpose: tra ket qua reconciliation.
- Request params: `check_id?`, `status?`, `date_from?`, `date_to?`, `resolved?`, `page`, `page_size`.
- Response includes `rows[]`, `summary_by_status`.

#### POST /api/v1/reconciliation/{id}/resolve
- Purpose: danh dau mismatch da duoc xu ly tai module so huu.
- Request body: `resolution_note`, `evidence_ref`, `source_module`, `source_ref_id`.
- Validation: note mandatory, evidence_ref recommended for HIGH/CRITICAL.

#### GET /api/v1/go-live/status
- Purpose: tong hop readiness status.
- Request params: `snapshot_no?`, `include_history?`.
- Response: `overall_status`, `gates[]`, `last_checked_at`.

#### POST /api/v1/go-live/check
- Purpose: run all auto gates or selected auto gates.
- Request body: `gate_ids[]?`, `note?`.
- Idempotency: same key within 5 minutes returns same run result.

#### POST /api/v1/go-live/{gate_id}/sign-off
- Purpose: manual sign-off / waiver cho gate manual.
- Request body: `status=PASS|FAIL|WAIVED`, `note`, `evidence_ref?`, `waiver_reason?`.
- Validation: `waiver_reason` mandatory when status = WAIVED.

#### POST /api/v1/reports/export
- Purpose: tao export job.
- Request body: `report_id`, `export_format`, `filters`, `timezone?`.
- Validation: PDF khong cho phep neu estimated rows > 10,000.
- Response: `export_job_id`, `job_status`, `download_url?`.

---

## 27. Exception Handling & Edge Cases (v1.2)

| Case ID | Scenario | Expected Handling |
|---------|----------|------------------|
| EX-M11-001 | Dashboard widget source tam thoi timeout | widget hien stale state + last successful refresh, khong crash ca page |
| EX-M11-002 | Report query qua lon cho screen | tra 422/limit message, goi y export CSV |
| EX-M11-003 | Export job fail do timeout | job_status = FAILED, luu failure_reason, cho phep re-run |
| EX-M11-004 | Reconciliation fail do source module data chua complete | status = WARNING neu check co defined grace window; neu khong thi FAIL |
| EX-M11-005 | Override action khong co reason_code | tao exception HIGH va RECON-009 FAIL |
| EX-M11-006 | CUST_VIEWER co gang query owner khac | backend reject theo owner-scope policy |
| EX-M11-007 | Manual sign-off gate khong co evidence | block sign-off neu gate yeu cau evidence |
| EX-M11-008 | PDF export cho report detail qua lon | backend tu choi, yeu cau CSV |

---

## 28. UAT Scenario Matrix (v1.2)

| UAT ID | Area | Scenario | Expected Result |
|--------|------|----------|----------------|
| UAT-M11-001 | Dashboard | load dashboard voi 10 user dong thoi | page load <=5s, khong loi widget |
| UAT-M11-002 | Dashboard | filter owner + warehouse | chi widget lien quan doi du lieu dung filter |
| UAT-M11-003 | Dashboard | CUST_VIEWER login | chi thay owner cua minh |
| UAT-M11-004 | Inventory Report | RPT-INV-001 doi soat voi SUM(InventTrans) | zero variance |
| UAT-M11-005 | Inventory Report | Aging report bucket 30/60/90/180 | bucket dung theo receipt_date |
| UAT-M11-006 | Inventory Report | Loss Adjustment vs Commercial Shrinkage | hai bao cao khong dung chung formula |
| UAT-M11-007 | Billing Report | billing event summary tong amount | bang tong billing_event filter status hop le |
| UAT-M11-008 | Billing Report | storage detail theo snapshot | khop daily_storage_snapshot |
| UAT-M11-009 | Audit | posting trace tu trans_id ve source | full trace complete |
| UAT-M11-010 | Audit | override khong co reason code | exception duoc ghi nhan |
| UAT-M11-011 | Reconciliation | RECON-001 mismatch | tao FAIL + CRITICAL alert |
| UAT-M11-012 | Reconciliation | resolve mismatch sau khi sua source | record cu giu nguyen, record moi PASS sau rerun |
| UAT-M11-013 | Go-Live | auto gate fail | overall status = BLOCKED/NOT READY |
| UAT-M11-014 | Go-Live | waiver gate duoc phep | bat buoc waiver_reason va approver |
| UAT-M11-015 | Export | CSV export lon hon 10k dong | tao async export job thanh cong |
| UAT-M11-016 | Export | PDF export >10k dong | bi tu choi voi thong bao dung CSV |
| UAT-M11-017 | Security | CUST_VIEWER export DN | file chi chua du lieu owner cua minh |
| UAT-M11-018 | Performance | RECON-001 tren data production-like | hoan thanh <=5 phut |

---

## 29. Decision Log & [TO-CONFIRM] Management (v1.2)

| # | Decision Item | Current Status | Needed By | Blocking Level | Default Assumption |
|---|---------------|----------------|-----------|----------------|-------------------|
| 1 | Report export file retention period | TO-CONFIRM | Before Sprint 3 | Medium | 365 days |
| 2 | Reconciliation auto-run schedule | PROPOSED | Before Sprint 2 | High | RECON-001 hourly, others daily |
| 3 | Final gate list 12 hay 14 gates | PROPOSED | Before Sprint 3 | Medium | use 14 gates in v1.2 |
| 4 | PDF template branding | TO-CONFIRM | Before UAT | Low | standard TVL header |
| 5 | Alert channel | TO-CONFIRM | Before Sprint 3 | Medium | in-app mandatory, email optional |
| 6 | Timezone handling for export/report | PROPOSED | Before backend build | High | Asia/Bangkok default |
| 7 | Grace window cho mot so reconciliation | TO-CONFIRM | Before UAT | Medium | no grace window unless defined |
| 8 | Evidence repository path cho go-live | TO-CONFIRM | Before go-live rehearsal | Medium | internal document link |

---

## 30. Senior Manager Review Gate — MODULE 11 (v1.2)

| # | Review Question | Yes / No | Notes |
|---|-----------------|----------|-------|
| 1 | M11 da duoc gioi han ro la module reporting/control, khong tao business truth? | | |
| 2 | Report inventory da bam dung InventTrans / OnHand boundary cua M3? | | |
| 3 | Loss Adjustment va Commercial Shrinkage da tach dung logic? | | |
| 4 | Dashboard da co count + tonnage + capacity warning 85%/100%? | | |
| 5 | Reconciliation matrix da bao phu inventory, billing, VAS, audit completeness? | | |
| 6 | Resolve reconciliation da ro la khong sua ledger truc tiep trong M11? | | |
| 7 | Go-live gate matrix da du owner, reviewer, evidence, waiver rule? | | |
| 8 | API contract da du de dev/QA implement va test? | | |
| 9 | UAT matrix da cover dashboard/report/reconciliation/export/security? | | |
| 10 | [TO-CONFIRM] items nao con block build/UAT da duoc chi ro? | | |

---
