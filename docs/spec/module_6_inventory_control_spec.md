# Module 6 — Inventory Control: Functional Specification

**Version:** 1.0
**Created:** 2026-03-08
**Status:** DRAFT — Pending Senior Manager Review
**Source:** 5 Check-Report Documents + BRD + Lessons from M1-M5 Review

---

## 1. Document Purpose

Đặc tả chức năng Module 6 — Inventory Control, bao gồm: Move Internal, Inter-Warehouse Transfer, Status Change, Cycle Count, và Adjustment. Module này sử dụng M3 Inventory Core Engine (InventTrans + OnHand) làm backbone cho mọi thay đổi tồn kho ngoài Inbound/Outbound.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Move Internal (cùng warehouse, đổi location)
- Inter-Warehouse Transfer (Transfer Order with IN_TRANSIT state)
- Inventory Status Change (AVAILABLE ↔ BLOCKED / DAMAGED)
- Cycle Count (blind count → variance → adjustment)
- Inventory Adjustment (direct adjustment, reason code mandatory)

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] Batch/Lot tracking (InventDim mở rộng)
- [PHASE 2] Cross-docking (receive → ship without putaway)
- [PHASE 2] Quality Hold status with lab integration
- [OUT OF SCOPE] Physical inventory (full warehouse freeze count)

---

## 3. Business Context

Warehouse operations phát sinh nhiều thay đổi tồn kho ngoài luồng Inbound/Outbound:
- **Move**: Dời hàng giữa các vị trí (consolidation, space optimization)
- **Transfer**: Chuyển hàng giữa 2 kho (cùng site hoặc khác site)
- **Status Change**: Đánh dấu hàng hỏng (DAMAGED), khóa hàng (BLOCKED) để ngăn allocation
- **Cycle Count**: Đếm kiểm tra định kỳ, phát hiện chênh lệch
- **Adjustment**: Điều chỉnh tồn kho khi phát hiện sai lệch

Nếu không có module này, mọi correction phải đi qua Inbound/Outbound → chậm, sai process, không audit được.

---

## 4. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | RBAC, NumberSequence, ReasonCode, AuditLog |
| M2 Master Data | Uses | Warehouse, Location, Owner, Item config |
| M3 Inventory Core | Uses | InventTrans posting, OnHand query, InventDim lookup |
| M7 Work Execution | Triggers | Move/Transfer → WorkHeader + WorkLine |
| M5 Outbound | Blocked by | Allocation-based Hold: cannot move/adjust reserved stock |
| M10 Billing | Triggers | Status change may affect billable qty |

---

## 5. User Personas

| Role | Use Cases in M6 |
|------|----------------|
| WH_KEEPER | Execute move work, execute transfer pick/putaway |
| WH_MANAGER | Initiate move, approve cycle count adjustment, cancel transfer, manual adjustment, status change |
| WH_ADMIN | Configure cycle count plans, set adjustment limits |
| OPS_SUPER | Monitor transfer in-transit, review cycle count variance reports |

---

## 6. Design Principles

1. **Mọi thay đổi tồn kho = InventTrans** [CONFIRMED — BR-INV-001]: Không update OnHand trực tiếp. OnHand = SUM(InventTrans).
2. **Move = 2 InventTrans rows** [CONFIRMED — SystemControlMap PP-5]: 1 row trừ location cũ (dim_from), 1 row cộng location mới (dim_to). Net effect = 0 on warehouse level.
3. **Transfer = multi-step with IN_TRANSIT** [CONFIRMED — StateMachine TR-01..TR-06]: Ship → IN_TRANSIT → Receive. 2 posting points.
4. **Status Change = InventDim change** [CONFIRMED — StateMachine]: Thay đổi status dimension (AVAILABLE → BLOCKED/DAMAGED). Qty giữ nguyên. InventTrans ghi nhận dim change.
5. **Cycle Count = blind count** [CONFIRMED — BR-INV-005]: Counter KHÔNG thấy system qty. Variance = counted - system. Adjustment auto nếu trong threshold hoặc cần approval nếu ngoài.
6. **Adjustment luôn cần reason_code** [CONFIRMED — BR-INV-006]: Không có adjustment nào không có reason code.
7. **Cannot move/adjust reserved stock** [CONFIRMED — BR-INV-007]: Chỉ available_qty (physical - reserved) mới move/adjust được.
8. **Idempotency via external_id** [CONFIRMED — CFM-09]: Mọi API call phải có external_id để dedup.
9. **Correlation tracking** [CONFIRMED]: Mọi transaction có correlation_id để trace end-to-end.
10. **Work generation optional** [CONFIRMED — SystemControlMap]: Move/Transfer có thể generate WorkHeader/WorkLine cho M7, hoặc execute trực tiếp (config per warehouse).

---

## 7. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Move Internal | Di chuyển hàng giữa locations cùng warehouse |
| 2 | Inter-Warehouse Transfer | Transfer Order: ship → in_transit → receive |
| 3 | Inventory Status Change | Thay đổi status: AVAILABLE ↔ BLOCKED / DAMAGED |
| 4 | Cycle Count | Blind count → variance calc → adjustment |
| 5 | Inventory Adjustment | Direct qty adjustment với reason code |
| 6 | Auditability & Integration | Idempotency, correlation, event publishing |

---

## 8. Data Objects & Schema

### 8.1 Core Data Objects
- move_order (header for internal move)
- transfer_order (header for inter-warehouse transfer)
- transfer_order_line (line items for transfer)
- cycle_count_plan (scheduled count configuration)
- cycle_count_header (count session)
- cycle_count_line (per location/item count)
- adjustment_record (direct adjustment)

### 8.2 move_order Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| move_number | VARCHAR | Y | Auto-generated (NumberSequence) |
| warehouse_id | FK | Y | |
| from_location_id | FK | Y | Source location |
| to_location_id | FK | Y | Destination location |
| owner_id | FK | Y | Stock owner |
| item_id | FK | Y | |
| qty | DECIMAL | Y | Quantity to move |
| uom | VARCHAR | Y | |
| status | ENUM | Y | DRAFT / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED |
| work_header_id | FK | N | If M7 work generated |
| posted_trans_id | FK | N | → invent_trans after posting |
| reason_code | VARCHAR | N | Optional for moves |
| external_id | VARCHAR | Y | Idempotency key |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

### 8.3 transfer_order Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| transfer_number | VARCHAR | Y | Auto-generated |
| from_warehouse_id | FK | Y | Source warehouse |
| to_warehouse_id | FK | Y | Destination warehouse |
| owner_id | FK | Y | |
| status | ENUM | Y | CREATED / RELEASED / SHIPPED / IN_TRANSIT / RECEIVED / CLOSED / CANCELLED |
| ship_date | DATE | N | Actual ship date |
| receive_date | DATE | N | Actual receive date |
| vehicle_number | VARCHAR | N | [TO-CONFIRM: weighbridge at both ends?] |
| shipped_by | VARCHAR | N | |
| received_by | VARCHAR | N | |
| external_id | VARCHAR | Y | Idempotency |
| correlation_id | UUID | Y | |
| cancel_reason_code | VARCHAR | N | |
| cancel_by | VARCHAR | N | |
| cancel_at | TIMESTAMP | N | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

### 8.4 transfer_order_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| transfer_order_id | FK | Y | → transfer_order |
| line_number | INT | Y | |
| item_id | FK | Y | |
| uom | VARCHAR | Y | |
| requested_qty | DECIMAL | Y | |
| shipped_qty | DECIMAL | N | Filled at ship |
| received_qty | DECIMAL | N | Filled at receive |
| variance_qty | DECIMAL | N | shipped - received |
| from_location_id | FK | Y | Source location |
| to_location_id | FK | N | Dest location (set at receive) |
| status | ENUM | Y | PENDING / SHIPPED / RECEIVED |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 8.5 cycle_count_header Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| count_number | VARCHAR | Y | Auto-generated |
| warehouse_id | FK | Y | |
| count_type | ENUM | Y | FULL / PARTIAL / SPOT |
| status | ENUM | Y | PLANNED / IN_PROGRESS / COUNTED / REVIEWED / CLOSED / CANCELLED |
| planned_date | DATE | Y | |
| count_started_at | TIMESTAMP | N | |
| count_completed_at | TIMESTAMP | N | |
| reviewed_by | VARCHAR | N | |
| reviewed_at | TIMESTAMP | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

### 8.6 cycle_count_line Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| cycle_count_header_id | FK | Y | |
| location_id | FK | Y | |
| item_id | FK | Y | |
| owner_id | FK | Y | |
| system_qty | DECIMAL | Y | Snapshot at count start (hidden from counter) |
| counted_qty | DECIMAL | N | Entered by counter |
| variance_qty | DECIMAL | N | = counted_qty - system_qty |
| variance_pct | DECIMAL | N | = ABS(variance_qty) / system_qty × 100 |
| recount_qty | DECIMAL | N | 2nd count if variance > threshold |
| adjustment_status | ENUM | N | AUTO_ADJUSTED / PENDING_APPROVAL / APPROVED / REJECTED |
| adjustment_trans_id | FK | N | → invent_trans |
| counted_by | VARCHAR | N | |
| counted_at | TIMESTAMP | N | |
| created_at | TIMESTAMP | Y | |
| updated_at | TIMESTAMP | Y | |

### 8.7 adjustment_record Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| adjustment_number | VARCHAR | Y | Auto-generated |
| warehouse_id | FK | Y | |
| location_id | FK | Y | |
| owner_id | FK | Y | |
| item_id | FK | Y | |
| qty | DECIMAL | Y | + for increase, - for decrease |
| uom | VARCHAR | Y | |
| reason_code | VARCHAR | Y | Mandatory [BR-INV-006] |
| reason_text | TEXT | N | Free text explanation |
| source_type | ENUM | Y | MANUAL / CYCLE_COUNT / RECONCILIATION |
| source_ref_id | FK | N | → cycle_count_line or other |
| posted_trans_id | FK | N | → invent_trans |
| status | ENUM | Y | DRAFT / POSTED / REVERSED |
| approved_by | VARCHAR | N | If requires approval |
| approved_at | TIMESTAMP | N | |
| external_id | VARCHAR | Y | |
| correlation_id | UUID | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMP | Y | |
| updated_by | VARCHAR | Y | |
| updated_at | TIMESTAMP | Y | |

---

## 9. Sub-Module 1: Move Internal

### 9.1 Description
Di chuyển hàng từ location A sang location B trong cùng warehouse. Không thay đổi owner, item, qty — chỉ thay đổi location dimension.

### 9.2 Flow
1. WH_MANAGER tạo move order (from_location, to_location, item, qty)
2. System validate: available_qty tại from_location >= qty (trừ reserved)
3. System optionally generate WorkHeader/WorkLine (M7) nếu warehouse config yêu cầu
4. WH_KEEPER execute move (hoặc direct execute nếu không qua M7)
5. System post 2 InventTrans: dim_from (trừ) + dim_to (cộng) — PP-5
6. OnHand update: from_location giảm, to_location tăng

### 9.3 Business Rules
- BR-INV-007: Cannot move reserved stock. `moveable_qty = physical_qty - reserved_qty`
- BR-INV-008: From and to location must be in same warehouse
- Location must be active (status = ACTIVE) — cả source và destination

### 9.4 Acceptance Criteria
- **AC-1.1**: Move giảm OnHand tại from_location và tăng tại to_location cùng qty. Net warehouse qty = 0 change.
- **AC-1.2**: Move fails nếu qty > available_qty (physical - reserved) tại from_location.
- **AC-1.3**: 2 InventTrans rows created: 1 trừ (dim_from), 1 cộng (dim_to). Both reference cùng move_order_id.
- **AC-1.4**: Move order status → COMPLETED sau posting. Không thể modify sau COMPLETED.

---

## 10. Sub-Module 2: Inter-Warehouse Transfer

### 10.1 Description
Chuyển hàng giữa 2 warehouse. Sử dụng Transfer Order với trạng thái IN_TRANSIT. Posting xảy ra 2 lần: ship (trừ kho gửi) và receive (cộng kho nhận).

### 10.2 Transfer Order State Machine

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|----|------|----|---------|-------|-------|-------------|
| TR-01 | CREATED | RELEASED | Release TO | WH_MANAGER | Lines > 0; all items valid | — |
| TR-02 | RELEASED | SHIPPED | Ship confirm | WH_MANAGER | Physical qty available at source | InventTrans: source location → IN_TRANSIT (PP-5) |
| TR-03 | SHIPPED | IN_TRANSIT | System auto | System | Ship posting complete | transfer_order.ship_date set |
| TR-04 | IN_TRANSIT | RECEIVED | Receive confirm | WH_MANAGER (dest) | Vehicle arrived; qty verified | InventTrans: IN_TRANSIT → dest location (PP-5) |
| TR-05 | RECEIVED | CLOSED | Close TO | WH_MANAGER | All lines received; variance resolved | TO immutable |
| TR-06 | CREATED/RELEASED | CANCELLED | Cancel | WH_MANAGER | Not yet shipped | Reason code required |

### 10.3 Forbidden Transitions

| From | Forbidden To | Reason |
|------|-------------|--------|
| SHIPPED / IN_TRANSIT | CANCELLED | Stock already in transit — must receive first |
| CLOSED | Any | Immutable after close |
| CANCELLED | Any | Terminal state |

### 10.4 Posting Points
- **Ship**: InventTrans type = TRANSFER_OUT, dim_from = source_location, dim_to = IN_TRANSIT (virtual location)
- **Receive**: InventTrans type = TRANSFER_IN, dim_from = IN_TRANSIT, dim_to = dest_location
- Variance handling: nếu received_qty ≠ shipped_qty → adjustment record tự tạo với reason_code = TRANSFER_VARIANCE

### 10.5 Business Rules
- BR-INV-009: Transfer between warehouses cần both warehouse active
- BR-INV-010: IN_TRANSIT stock không thể allocate, move, hoặc adjust
- [TO-CONFIRM]: Weighbridge tại cả 2 đầu kho? Nếu có → integrate M8. Nếu không → manual qty entry.

### 10.6 Acceptance Criteria
- **AC-2.1**: Ship posting giảm OnHand tại source warehouse/location, tăng IN_TRANSIT qty.
- **AC-2.2**: Receive posting giảm IN_TRANSIT, tăng OnHand tại dest warehouse/location.
- **AC-2.3**: Transfer SHIPPED/IN_TRANSIT cannot be cancelled — must receive first then adjust if needed.
- **AC-2.4**: Variance (shipped ≠ received) auto-creates adjustment_record with reason_code = TRANSFER_VARIANCE.
- **AC-2.5**: IN_TRANSIT stock excluded from available_qty calculations (cannot allocate/move/adjust).

---

## 11. Sub-Module 3: Inventory Status Change

### 11.1 Description
Thay đổi inventory status dimension: AVAILABLE ↔ BLOCKED, AVAILABLE ↔ DAMAGED. Qty giữ nguyên. InventTrans ghi nhận dimension change.

### 11.2 Allowed Status Transitions

| From | To | Actor | Use Case |
|------|----|-------|----------|
| AVAILABLE | BLOCKED | WH_MANAGER | Hold stock (quality issue, dispute) |
| AVAILABLE | DAMAGED | WH_MANAGER | Damage discovered |
| BLOCKED | AVAILABLE | WH_MANAGER | Release hold |
| DAMAGED | AVAILABLE | WH_MANAGER | Reclassify after inspection |
| BLOCKED | DAMAGED | WH_MANAGER | Blocked item confirmed damaged |
| DAMAGED | BLOCKED | WH_MANAGER | Damaged item under investigation |

### 11.3 Business Rules
- Status change = InventDim change (status field in dimension). New InventTrans row with dim_from (old status) → dim_to (new status).
- Cannot status-change reserved stock (reserved_qty must be 0 for that dim).
- Reason code mandatory for all status changes.
- BLOCKED/DAMAGED stock excluded from allocation (available_qty only counts AVAILABLE status).

### 11.4 Acceptance Criteria
- **AC-3.1**: Status change creates InventTrans with dim_from.status ≠ dim_to.status. Qty unchanged.
- **AC-3.2**: OnHand reflects new status: AVAILABLE qty decreases, BLOCKED/DAMAGED qty increases (or vice versa).
- **AC-3.3**: Cannot change status of stock with reserved_qty > 0.
- **AC-3.4**: Reason code required — API rejects status change without reason_code.

---

## 12. Sub-Module 4: Cycle Count

### 12.1 Description
Đếm kiểm tra tồn kho theo kế hoạch. Counter không thấy system qty (blind count). Variance tính tự động. Auto-adjust nếu trong threshold, cần approval nếu ngoài.

### 12.2 Flow
1. WH_ADMIN tạo cycle_count_plan (warehouse, locations, frequency)
2. System tạo cycle_count_header + lines (snapshot system_qty tại thời điểm count start)
3. WH_KEEPER thực hiện blind count — nhập counted_qty per location/item
4. System tính variance: `variance_qty = counted_qty - system_qty`
5. Nếu `ABS(variance_pct) <= auto_adjust_threshold` → auto adjustment
6. Nếu `ABS(variance_pct) > auto_adjust_threshold` → PENDING_APPROVAL
7. Nếu `ABS(variance_pct) > recount_threshold` → trigger recount [TO-CONFIRM]
8. WH_MANAGER review + approve/reject adjustment
9. Approved → adjustment_record created → InventTrans posted (PP-6)

### 12.3 Thresholds [TO-CONFIRM]

| Threshold | Default | Configurable | Note |
|-----------|---------|-------------|------|
| auto_adjust_threshold | 2% | Per warehouse | Variance ≤ threshold → auto-adjust |
| recount_threshold | 5% | Per warehouse | Variance > threshold → recount before adjust |
| max_recount | 1 | System | Max 1 recount per line per count session |

### 12.4 Business Rules
- BR-INV-005: Blind count — system_qty KHÔNG hiển thị cho counter
- Counter phải scan location QR (M8 mobile) để validate đúng vị trí
- System_qty snapshot tại count start — không thay đổi nếu có transaction xảy ra giữa chừng (snapshot isolation)
- Cycle count KHÔNG block warehouse operations (no freeze)

### 12.5 Acceptance Criteria
- **AC-4.1**: Counter cannot see system_qty during counting (blind count enforced).
- **AC-4.2**: variance_qty = counted_qty - system_qty calculated automatically.
- **AC-4.3**: Variance within auto_adjust_threshold → adjustment posted without approval.
- **AC-4.4**: Variance exceeds auto_adjust_threshold → status = PENDING_APPROVAL, requires WH_MANAGER approval.
- **AC-4.5**: Approved adjustment creates InventTrans (type = CYCLE_COUNT_ADJUST) via PP-6.
- **AC-4.6**: Rejected adjustment → no InventTrans. Cycle count line marked REJECTED.

---

## 13. Sub-Module 5: Inventory Adjustment

### 13.1 Description
Điều chỉnh trực tiếp qty tồn kho. Reason code bắt buộc. Có thể là tăng (+) hoặc giảm (-). Source: manual, cycle count, reconciliation.

### 13.2 Flow
1. WH_MANAGER tạo adjustment_record (location, item, owner, qty, reason_code)
2. System validate:
   - Nếu qty < 0 (giảm): available_qty >= ABS(qty)
   - Reason code valid và active
3. System post InventTrans (type = ADJUSTMENT, PP-6)
4. OnHand updated
5. adjustment_record.status → POSTED

### 13.3 Business Rules
- BR-INV-006: Reason code mandatory cho mọi adjustment
- Negative adjustment: cannot reduce below available_qty (physical - reserved)
- No approval flow for direct adjustment [CONFIRMED — UserFlow 3.5]: WH_MANAGER có quyền adjust trực tiếp. Audit trail đủ để kiểm soát.
- Adjustment from cycle count: source_type = CYCLE_COUNT, source_ref_id = cycle_count_line.id

### 13.4 Acceptance Criteria
- **AC-5.1**: Adjustment creates exactly 1 InventTrans row (type = ADJUSTMENT) via PP-6.
- **AC-5.2**: Positive adjustment increases OnHand. Negative adjustment decreases OnHand.
- **AC-5.3**: Negative adjustment fails if ABS(qty) > available_qty.
- **AC-5.4**: Adjustment without reason_code → API returns 400.
- **AC-5.5**: Adjustment record tracks source_type (MANUAL / CYCLE_COUNT / RECONCILIATION).

---

## 14. Sub-Module 6: Auditability & Integration

### 14.1 Idempotency
- Mọi API endpoint nhận external_id
- Duplicate external_id → return existing result, không tạo mới
- TTL cho idempotency key: 72h [CONFIRMED — CFM-09]

### 14.2 Correlation Tracking
- Mọi transaction có correlation_id
- Transfer order: cùng correlation_id cho ship + receive transactions
- Cycle count: cùng correlation_id cho count + adjustment transactions

### 14.3 Event Publishing
- Events published cho downstream modules:

| Event | Trigger | Consumer | Payload |
|-------|---------|----------|---------|
| INVENTORY_MOVED | Move completed | M10 Billing (nếu cần) | move_order_id, warehouse_id, owner_id, item_id, qty, from_location, to_location |
| TRANSFER_SHIPPED | TO shipped | M10, OPS dashboard | transfer_order_id, from_warehouse, owner_id, items[], shipped_qty |
| TRANSFER_RECEIVED | TO received | M10, OPS dashboard | transfer_order_id, to_warehouse, owner_id, items[], received_qty |
| STATUS_CHANGED | Status change | M10 Billing | owner_id, item_id, warehouse_id, from_status, to_status, qty |
| COUNT_ADJUSTED | Cycle count adj | Audit | cycle_count_id, item_id, variance_qty, adjustment_trans_id |
| INVENTORY_ADJUSTED | Direct adjustment | Audit, M10 | adjustment_id, owner_id, item_id, qty, reason_code |

### 14.4 KPI Hooks
- Move completion time (created → completed)
- Transfer cycle time (shipped → received)
- Cycle count accuracy rate (lines with zero variance / total lines)
- Adjustment frequency per warehouse per month

---

## 15. Posting Control

### 15.1 Posting Points Used by M6

| PP | Name | Trigger | InventTrans Type |
|----|------|---------|-----------------|
| PP-5 | MOVE/TRANSFER | Move complete, Transfer ship, Transfer receive | MOVE, TRANSFER_OUT, TRANSFER_IN |
| PP-6 | ADJUSTMENT/COUNT | Adjustment posted, Cycle count adjustment | ADJUSTMENT, CYCLE_COUNT_ADJUST |

### 15.2 InventTrans Type Mapping

| Operation | trans_type | dim_from change | dim_to change | qty sign |
|-----------|-----------|----------------|---------------|----------|
| Move Internal (trừ) | MOVE | source_location, AVAILABLE | — | -qty |
| Move Internal (cộng) | MOVE | — | dest_location, AVAILABLE | +qty |
| Transfer Ship | TRANSFER_OUT | source_location | IN_TRANSIT (virtual) | -qty (source), +qty (transit) |
| Transfer Receive | TRANSFER_IN | IN_TRANSIT (virtual) | dest_location | -qty (transit), +qty (dest) |
| Status Change | STATUS_CHANGE | location, old_status | location, new_status | 0 (dim change only) |
| Cycle Count Adj (+) | CYCLE_COUNT_ADJUST | — | location, AVAILABLE | +variance |
| Cycle Count Adj (-) | CYCLE_COUNT_ADJUST | location, AVAILABLE | — | -variance |
| Direct Adj (+) | ADJUSTMENT | — | location, AVAILABLE | +qty |
| Direct Adj (-) | ADJUSTMENT | location, AVAILABLE | — | -qty |

### 15.3 Reversal Rules
- Move: reverse = tạo move ngược (to → from)
- Transfer: KHÔNG reverse tự động — phải tạo transfer order ngược
- Status Change: reverse = tạo status change ngược
- Adjustment: reverse = tạo adjustment ngược (qty đổi dấu)
- Mọi reversal tạo InventTrans mới với `is_reversed = false`, `reversed_by_trans_id` reference original

---

## 16. RBAC & Permissions

| Action | WH_KEEPER | WH_MANAGER | WH_ADMIN | OPS_SUPER |
|--------|-----------|------------|----------|-----------|
| Execute move (via work) | ✓ | ✓ | — | — |
| Create move order | — | ✓ | — | — |
| Create transfer order | — | ✓ | ✓ | — |
| Ship / Receive transfer | — | ✓ | — | — |
| Cancel transfer | — | ✓ | — | — |
| Status change | — | ✓ | — | — |
| Perform cycle count | ✓ | ✓ | — | — |
| Approve count adjustment | — | ✓ | — | — |
| Direct adjustment | — | ✓ | — | — |
| Configure count plans | — | — | ✓ | — |
| View all operations | — | ✓ | ✓ | ✓ |

---

## 17. State Machines Summary

### 17.1 Move Order States
```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
                                  → CANCELLED (from DRAFT/CONFIRMED only)
```

### 17.2 Transfer Order States (TR-01..TR-06)
```
CREATED → RELEASED → SHIPPED → IN_TRANSIT → RECEIVED → CLOSED
                                                       → CANCELLED (from CREATED/RELEASED only)
```

### 17.3 Cycle Count States
```
PLANNED → IN_PROGRESS → COUNTED → REVIEWED → CLOSED
                                             → CANCELLED (from PLANNED/IN_PROGRESS only)
```

### 17.4 Adjustment States
```
DRAFT → POSTED → REVERSED
```

---

## 18. Ownership Boundaries

| Concern | Owner Module | M6 Responsibility |
|---------|-------------|-------------------|
| InventTrans posting | M3 | M6 calls M3 posting API — does NOT write InventTrans directly |
| OnHand calculation | M3 | M6 reads OnHand via M3 query — does NOT update OnHand directly |
| Work generation | M7 | M6 triggers work creation via M7 API |
| Location validation | M2 | M6 queries M2 for location status/type |
| Billing events | M10 | M6 publishes events — M10 consumes |
| RBAC enforcement | M1 | M6 checks permissions via M1 middleware |

---

## 19. Integration Points

### 19.1 M3 Inventory Core Engine
- POST /api/v1/inventory/post — for all InventTrans postings
- GET /api/v1/inventory/on-hand — for available qty check before move/adjust

### 19.2 M7 Work Execution
- POST /api/v1/work/generate — trigger work for move/transfer
- Callback: WorkHeader COMPLETED → M6 move/transfer complete

### 19.3 M8 Weighbridge/Mobile
- Mobile app: cycle count data entry (blind count screen)
- QR scan: location validation during count/move

### 19.4 M10 Billing
- Event publishing: STATUS_CHANGED, INVENTORY_ADJUSTED, TRANSFER_RECEIVED
- Storage billing impact: status change AVAILABLE → BLOCKED may affect billable qty

---

## 20. Business Rules

| Rule ID | Rule | BRD Reference | Note |
|---------|------|--------------|------|
| IC-BR-001 | Mọi thay đổi tồn kho qua InventTrans | BR-INV-001 | Core principle |
| IC-BR-002 | Move = 2 InventTrans (trừ + cộng) | BR-INV-002 | Net = 0 |
| IC-BR-003 | Transfer qua IN_TRANSIT state | BR-INV-009 | 2 posting points |
| IC-BR-004 | IN_TRANSIT stock không allocate/move/adjust | BR-INV-010 | Protected |
| IC-BR-005 | Blind count — system qty hidden | BR-INV-005 | |
| IC-BR-006 | Adjustment cần reason code | BR-INV-006 | Mandatory |
| IC-BR-007 | Cannot move/adjust reserved stock | BR-INV-007 | available_qty only |
| IC-BR-008 | Status change = InventDim change | BR-INV-003 | Qty unchanged |
| IC-BR-009 | Idempotency via external_id | CFM-09 | 72h TTL |
| IC-BR-010 | Cancel transfer chỉ khi chưa ship | BR-INV-010 | SHIPPED → cannot cancel |
| IC-BR-011 | Location must be ACTIVE for move dest | — | Validation |
| IC-BR-012 | Cycle count không freeze warehouse | — | Phase 1 design |

---

## 21. Exception Handling

### 21.1 Move Exceptions
| Exception | Handling |
|-----------|----------|
| Qty > available at source | Reject move. Error: INSUFFICIENT_AVAILABLE_QTY |
| Destination location inactive | Reject move. Error: LOCATION_INACTIVE |
| Destination location full (capacity) | [PHASE 2] — no capacity check Phase 1 |
| Reserved stock at source | Only moveable qty = physical - reserved |

### 21.2 Transfer Exceptions
| Exception | Handling |
|-----------|----------|
| Receive qty ≠ shipped qty | Auto-create adjustment_record with reason TRANSFER_VARIANCE |
| Transfer stuck in IN_TRANSIT > X days | [TO-CONFIRM] Alert to OPS_SUPER |
| Both warehouses same site | Allowed — transfer still valid |

### 21.3 Cycle Count Exceptions
| Exception | Handling |
|-----------|----------|
| Transaction during count | Snapshot isolation — system_qty frozen at count start |
| Variance > recount threshold | Trigger recount [TO-CONFIRM threshold] |
| Counter counts item not in plan | Reject — only planned items/locations |

### 21.4 Adjustment Exceptions
| Exception | Handling |
|-----------|----------|
| Negative adj > available qty | Reject. Error: INSUFFICIENT_AVAILABLE_QTY |
| Missing reason code | Reject 400. Error: REASON_CODE_REQUIRED |
| Duplicate external_id | Return existing result (idempotent) |

---

## 22. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline | Note |
|---|------|----------|--------|----------|------|
| 1 | Weighbridge at both ends for transfer? | P1 | Affects M8 integration | Trước FS M6 | Nếu có → integrate weighbridge flow cho transfer |
| 2 | Cycle count recount threshold default | P1 | Affects count workflow | Trước FS M6 | Proposed: 5% |
| 3 | Auto-adjust threshold default | P2 | Affects approval flow | Trước Sprint 1 | Proposed: 2% |
| 4 | IN_TRANSIT stuck alert threshold (days) | P2 | OPS monitoring | Trước Sprint 2 | Proposed: 3 days |
| 5 | Location capacity check Phase 1? | P2 | Move validation | Trước Sprint 1 | Recommend: Phase 2 |
| 6 | Transfer variance tolerance | P2 | Auto-adj vs manual | Trước FS M6 | Should align with M4 tolerance? |

---

## 23. Acceptance Criteria Summary

### 23.1 AC per Sub-Module

| Sub-Module | AC Count | AC IDs |
|-----------|----------|--------|
| 1. Move Internal | 4 | AC-1.1..1.4 |
| 2. Inter-Warehouse Transfer | 5 | AC-2.1..2.5 |
| 3. Status Change | 4 | AC-3.1..3.4 |
| 4. Cycle Count | 6 | AC-4.1..4.6 |
| 5. Adjustment | 5 | AC-5.1..5.5 |
| **Total** | **24** | |

---

## 24. User Stories

### US-M6-001: Move Internal
**As a** WH_MANAGER, **I want to** move stock from one location to another within the same warehouse, **so that** I can optimize space and consolidate inventory.
- **Priority:** MUST HAVE
- **AC:** AC-1.1, AC-1.2, AC-1.3, AC-1.4

### US-M6-002: Inter-Warehouse Transfer
**As a** WH_MANAGER, **I want to** create a transfer order to move stock between warehouses with IN_TRANSIT tracking, **so that** inventory is accounted for during transit.
- **Priority:** MUST HAVE
- **AC:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5

### US-M6-003: Inventory Status Change
**As a** WH_MANAGER, **I want to** change inventory status (AVAILABLE ↔ BLOCKED / DAMAGED), **so that** problematic stock is excluded from allocation and operations.
- **Priority:** MUST HAVE
- **AC:** AC-3.1, AC-3.2, AC-3.3, AC-3.4

### US-M6-004: Cycle Count
**As a** WH_KEEPER, **I want to** perform blind counts on assigned locations, **so that** inventory accuracy is maintained without warehouse freeze.
- **Priority:** MUST HAVE
- **AC:** AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-4.6

### US-M6-005: Inventory Adjustment
**As a** WH_MANAGER, **I want to** adjust inventory quantities with mandatory reason codes, **so that** discrepancies are corrected with full audit trail.
- **Priority:** MUST HAVE
- **AC:** AC-5.1, AC-5.2, AC-5.3, AC-5.4, AC-5.5

---

## 25. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | POST | /api/v1/moves | WH_MANAGER | Create move order |
| 2 | POST | /api/v1/moves/{id}/confirm | WH_MANAGER | Confirm move |
| 3 | POST | /api/v1/moves/{id}/execute | WH_KEEPER, WH_MANAGER | Execute move (post InventTrans) |
| 4 | POST | /api/v1/moves/{id}/cancel | WH_MANAGER | Cancel move |
| 5 | POST | /api/v1/transfers | WH_MANAGER | Create transfer order |
| 6 | POST | /api/v1/transfers/{id}/release | WH_MANAGER | Release TO |
| 7 | POST | /api/v1/transfers/{id}/ship | WH_MANAGER | Ship confirm |
| 8 | POST | /api/v1/transfers/{id}/receive | WH_MANAGER | Receive confirm |
| 9 | POST | /api/v1/transfers/{id}/close | WH_MANAGER | Close TO |
| 10 | POST | /api/v1/transfers/{id}/cancel | WH_MANAGER | Cancel TO |
| 11 | POST | /api/v1/status-changes | WH_MANAGER | Change inventory status |
| 12 | POST | /api/v1/cycle-counts | WH_ADMIN | Create cycle count |
| 13 | POST | /api/v1/cycle-counts/{id}/count | WH_KEEPER | Submit count results |
| 14 | POST | /api/v1/cycle-counts/{id}/approve | WH_MANAGER | Approve adjustment |
| 15 | POST | /api/v1/adjustments | WH_MANAGER | Create direct adjustment |
| 16 | GET | /api/v1/moves | WH_MANAGER, OPS_SUPER | List moves |
| 17 | GET | /api/v1/transfers | WH_MANAGER, OPS_SUPER | List transfers |
| 18 | GET | /api/v1/cycle-counts | WH_MANAGER, WH_ADMIN | List cycle counts |
| 19 | GET | /api/v1/adjustments | WH_MANAGER, OPS_SUPER | List adjustments |

---

## 26. Test Case Reference

Từ StateMachine doc, các test cases liên quan M6:

| Test ID | Description | Expected |
|---------|-------------|----------|
| INV-TC-01 | Move stock between locations | OnHand source ↓, dest ↑, net = 0 |
| INV-TC-02 | Move reserved stock | FAIL — cannot move reserved |
| INV-TC-03 | Transfer ship → receive | IN_TRANSIT tracking correct |
| INV-TC-04 | Transfer variance | Auto-adjustment created |
| INV-TC-05 | Status AVAILABLE → BLOCKED | BLOCKED stock excluded from allocation |
| INV-TC-06 | Blind cycle count | Counter cannot see system qty |
| INV-TC-07 | Count variance < threshold | Auto-adjusted |
| INV-TC-08 | Count variance > threshold | Requires approval |
| INV-TC-09 | Adjustment without reason code | Rejected 400 |
| INV-TC-10 | Negative adj > available | Rejected — insufficient qty |
| INV-TC-11 | Cancel transfer after ship | FAIL — cannot cancel shipped TO |
| INV-TC-12 | Idempotent duplicate call | Returns existing, no new record |

---

## 27. Glossary

| Term | Definition |
|------|-----------|
| Move Internal | Stock relocation within same warehouse |
| Transfer Order (TO) | Inter-warehouse stock transfer document |
| IN_TRANSIT | Virtual inventory status during transfer |
| Blind Count | Counter cannot see system qty during cycle count |
| Variance | Difference between counted qty and system qty |
| PP-5 | Posting Point for MOVE/TRANSFER operations |
| PP-6 | Posting Point for ADJUSTMENT/COUNT operations |

---

## 28. Baseline Source Documents

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_SystemControlMap.md | PP-5, PP-6 definitions; Event choreography |
| 2 | TVL_SWM_BA_PO_Master.md | US-M6-001..005; Review gate checklist |
| 3 | TVL_SWM_StateMachine.md | Transfer Order TR-01..TR-06; Inventory Status transitions |
| 4 | TVL_SWM_SystemFlow_EndToEnd.md | Move/Transfer/Count flow patterns |
| 5 | TVL_SWM_UserFlow_A_to_Z.md | WH_KEEPER flow 2.3-2.4; WH_MANAGER flow 3.4-3.5 |
| 6 | TVL_SWM_Business_Rules_Document.md | BR-INV-001..010 |
