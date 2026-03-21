# TVL SWM Spec v5.0 — Part 2: Phase 3–5

---

## Phase 3 — Weighbridge Integration

**Sprints:** 9–10 (4 tuần)

### Bảng trong scope

| Table | tenant_id | Độ phức tạp |
|-------|-----------|-------------|
| weighbridge | ✅ UUID | Simple |
| weighbridge_log | ✅ UUID | Complex |

### weighbridge Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| weighbridge_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| code | VARCHAR(20) | Y | VD: WB-WH51-01 |
| warehouse_id | UUID FK | Y | |
| max_capacity_kg | DECIMAL(10,2) | Y | |
| min_weight_kg | DECIMAL(10,2) | Y | |
| scale_division_kg | DECIMAL(6,2) | Y | |
| integration_mode | ENUM | Y | API / SERIAL / MANUAL / MIXED |
| last_calibration_date | DATE | N | |
| calibration_expiry_date | DATE | N | |
| is_active | BOOLEAN | Y | |
| UNIQUE | (tenant_id, code) | | |

### weighbridge_log Table [v5.1 REDESIGN — per-line model]

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| log_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| log_number | VARCHAR(50) | Y | Auto-generated |
| weighbridge_id | UUID FK | Y | |
| type | ENUM | N | INBOUND / OUTBOUND — auto-detect if not provided |
| document_number | VARCHAR(50) | Y | receipt_number or order_number |
| sku | VARCHAR(50) | Y | Item SKU (business key) |
| warehouse_code | VARCHAR(20) | Y | Warehouse code (business key) |
| owner_code | VARCHAR(50) | Y | Owner storerkey (business key) |
| vehicle_plate | VARCHAR(20) | Y | |
| gross_weight_kg | DECIMAL(10,2) | Y | |
| tare_weight_kg | DECIMAL(10,2) | Y | |
| net_weight_kg | DECIMAL(10,2) | Y | = |gross - tare| |
| notes | TEXT | N | |
| previous_log_id | UUID FK → weighbridge_log | N | Cascading chain — previous log in same document |
| sequence_no | INT | Y | Default 1. Position in cascading chain |
| resolved_warehouse_id | UUID FK | N | Auto-resolved from warehouse_code |
| resolved_owner_id | UUID FK | N | Auto-resolved from owner_code |
| resolved_item_id | UUID FK | N | Auto-resolved from sku + owner |
| resolved_receipt_line_id | UUID FK | N | For INBOUND: resolved receipt line |
| resolved_order_detail_id | UUID FK | N | For OUTBOUND: resolved order detail |
| status | ENUM | Y | PENDING / COMPLETED / ERROR |
| error_message | TEXT | N | |
| operator_id | UUID FK → users | Y | |
| created_at | TIMESTAMPTZ | Y | |
| UNIQUE | (tenant_id, log_number) | | |

N logs per receipt/order (1 per line/SKU). API receives business keys, backend auto-resolves to internal IDs.

### Per-Line Weighing Model [v5.1 REDESIGN]

```
INBOUND (N logs per receipt, 1 per line/SKU):
  API call per SKU: { document_number, sku, warehouse_code, owner_code,
                      vehicle_plate, gross_weight_kg, tare_weight_kg }
  System auto-resolves business keys → internal IDs
  System auto-detects type from weight comparison

OUTBOUND (N logs per order, 1 per line/SKU):
  Same API structure, same auto-resolve

Cascading Weighing (multi-SKU per vehicle):
  Each log's gross_weight_kg = previous log's tare_weight_kg (±50kg tolerance)
  previous_log_id + sequence_no track the chain
  Chain linked by: same document_number + vehicle_plate
```

**Auto-Detect Type** (if `type` not provided):
- `gross > tare` → INBOUND (xe vào nặng hơn ra — dỡ hàng)
- `gross < tare` → OUTBOUND (xe ra nặng hơn vào — chất hàng)
- `gross = tare` → ERROR (net = 0)

**Auto-Resolve & Side Effects** (on COMPLETED):
1. Resolve: warehouse_code → warehouse_id, owner_code → owner_id, sku + owner → item_id
2. Resolve UOM config: item → item_group → `weighbridge_qty_uom` (default 'KG')
3. **UOM-based update logic**:
   - INBOUND: document_number → inbound_receipt → receipt_line (by item_id)
     - IF receipt_line.uom = item_group.weighbridge_qty_uom: `receipt_line.received_qty += net_weight` AND `receipt_line.net_weight_kg += net_weight`
     - ELSE: `receipt_line.net_weight_kg += net_weight` only (received_qty unchanged by weighbridge)
   - OUTBOUND: document_number → order_header → order_detail (by item_id)
     - IF order_detail.uom = item_group.weighbridge_qty_uom: `order_detail.shipped_qty += net_weight` AND `order_detail.net_weight_kg += net_weight`
     - ELSE: `order_detail.net_weight_kg += net_weight` only (shipped_qty unchanged by weighbridge)
4. Running tolerance check: SUM(line.net_weight_kg) vs expected net_weight → ALERT if exceeds tolerance %

**API**: Single endpoint `POST /api/weighbridge-logs` — shared for UI and weighbridge hardware integration.

### Business Rules — Weighbridge [v5.1 UPDATE]

- **Per-line model**: N logs per document (1 per line/SKU), no max attempts limit [v5.1]
- **Auto-detect type**: INBOUND if gross > tare, OUTBOUND if gross < tare [v5.1]
- **Auto-resolve**: business keys (warehouse_code, owner_code, sku) → internal IDs [v5.1]
- **UOM-based update**: weighbridge updates qty only when line.uom = item_group.weighbridge_qty_uom [v5.1]
- **Cascading weighing**: previous_log_id + sequence_no track multi-SKU chain [v5.1]
- net_weight = |gross - tare|
- Tolerance check always uses net_weight_kg (regardless of UOM on line)
- Validation: gross > 0, tare > 0, gross ≠ tare, document must exist, SKU must exist in document
- Cascading chain weight consistency (warning, not block)
- Running total vs tolerance % (warning, not block)
- After COMPLETED: immutable
- Calibration expiry → WARNING (not block)
- 1 weighbridge = 1 vehicle at a time
- Session timeout: 4h → alert supervisor
- ALPR = Phase 2, Go-Live = manual plate input

---

## Phase 4 — Inbound Flow [v5.0: explicit putaway InventTrans]

**Sprints:** 11–13 (6 tuần)

### Bảng trong scope

| Table | tenant_id | Dependency | Độ phức tạp |
|-------|-----------|------------|-------------|
| purchase_order | ✅ UUID | Phase 1 | Medium |
| purchase_order_line | ✅ UUID | purchase_order | Medium |
| inbound_receipt | ✅ UUID | PO, Weighbridge | Complex |
| inbound_receipt_line | ✅ UUID | inbound_receipt | Medium |
| work_header (PUTAWAY) | ✅ UUID | inbound_receipt | Medium |
| work_line (RECEIVE+PUT) | ✅ UUID | work_header | Medium |

### purchase_order Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| po_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| po_number | VARCHAR(50) | Y | |
| po_type | ENUM | Y | VESSEL / CUSTOMER |
| owner_id | UUID FK | Y | |
| vendor_id | UUID FK | N | |
| warehouse_id | UUID FK | Y | |
| vessel_name | VARCHAR(200) | Conditional | Required if VESSEL |
| bl_number | VARCHAR(100) | Conditional | Required if VESSEL |
| supplier_do_number | VARCHAR(100) | N | |
| expected_delivery_date | DATE | N | |
| status | ENUM | Y | DRAFT / CONFIRMED / PARTIALLY_RECEIVED / FULLY_RECEIVED / CLOSED / CANCELLED |
| approved_by | UUID FK | N | |
| approved_at | TIMESTAMP | N | |
| remark | TEXT | N | |
| UNIQUE | (tenant_id, po_number) | | |

### purchase_order_line Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| po_line_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| po_id | UUID FK | Y | |
| line_number | INT | Y | |
| item_id | UUID FK | Y | |
| expected_qty_kg | DECIMAL(14,2) | Y | |
| received_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| **net_weight_kg** | **DECIMAL(14,2)** | **Y** | **Default 0. Rollup from receipt lines' weighbridge data (always KG)** |
| uom | VARCHAR(10) | Y | |
| lot_attr_01..12 | VARCHAR(200) | N | 12 lot attributes |
| line_status | ENUM | Y | OPEN / PARTIALLY_RECEIVED / FULLY_RECEIVED / CLOSED / CANCELLED |
| remark | TEXT | N | |

### inbound_receipt_line Table (includes lot_id)

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| receipt_line_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| receipt_id | UUID FK | Y | |
| po_line_id | UUID FK | N | |
| line_number | INT | Y | |
| item_id | UUID FK | Y | |
| expected_qty_kg | DECIMAL(14,2) | Y | |
| received_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| variance_kg | DECIMAL(14,2) | N | |
| variance_pct | DECIMAL(5,2) | N | |
| **net_weight_kg** | **DECIMAL(14,2)** | **Y** | **Default 0. Accumulated from weighbridge logs (always KG)** |
| **uom** | **VARCHAR(10)** | **Y** | **Inherited from PO line. Determines weighbridge update logic** |
| lot_attr_01..12 | VARCHAR(200) | N | From PO line or manual |
| **lot_id** | **UUID FK → lot** | **N** | **Set at RECEIVED (get_or_create_lot)** |
| line_status | ENUM | Y | OPEN / WEIGHED / RECEIVED / REJECTED / PUTAWAY |
| damage_flag | BOOLEAN | Y | Default FALSE |
| remark | TEXT | N | |

### Inbound Lifecycle [v5.0: lot + explicit putaway InventTrans]

```
PO (DRAFT → CONFIRMED)
  → InventTrans EXPECTED per line [F-08]
    stage=EXPECTED, trans_type=RECEIPT, +qty
    invent_dim = (warehouse.default_receipt_loc_id, AVAILABLE, lot_id=NULL) [ISS-08 FIX]
    → on_hand.inbound_ordered_qty increases
    
InboundReceipt per xe (DRAFT → AWAITING_WEIGHING)
  → InventTrans REGISTERED (informational, no on_hand impact)

WeighbridgeLog WEIGH_IN → gross
[Unload, operator nhập qty per line]
WeighbridgeLog WEIGH_OUT → tare → net

Per line tolerance check:
  threshold = MAX(tolerance_pct × expected, tolerance_abs)
  ├── PASS → RECEIVED
  └── FAIL → REJECTED (re-weigh max 3 or cancel)

RECEIVED:
  1. get_or_create_lot(tenant_id, item_id, owner_id, lot_attrs[12])
     → lot_id assigned to receipt_line
  
  2. InventTrans PHYSICAL per line: [ISS-11 FIX: EXPLICIT]
     trans_type = RECEIPT
     stage = PHYSICAL
     qty = +received_qty_kg
     invent_dim = (RECV location, AVAILABLE, lot_id)  ← WITH LOT
     → on_hand.physical_qty increases at RECV location
  
  3. Reverse EXPECTED: [ISS-09 FIX]
     stage = EXPECTED
     qty = -expected_qty_kg (reverse the original EXPECTED)
     → on_hand.inbound_ordered_qty decreases
  
  4. Auto-create WorkHeader PUTAWAY (self-claim)

PUTAWAY: [ISS-11 FIX: EXPLICIT InventTrans]
  WorkLine RECEIVE step → confirm goods at RECV location
  WorkLine PUT step → move to STORAGE location
  
  On PUT completed:
    InventTrans #1: [EXPLICIT — not implied]
      trans_type = RECEIPT
      stage = PHYSICAL
      qty = -received_qty_kg
      invent_dim = (RECV location, AVAILABLE, lot_id)
    
    InventTrans #2:
      trans_type = RECEIPT
      stage = PHYSICAL
      qty = +received_qty_kg
      invent_dim = (STORAGE location, AVAILABLE, lot_id)  ← lot preserved
    
    → on_hand: RECV decreases, STORAGE increases
    → Location accuracy: ✅ correct at all times
    
  TC-14: If receipt location = STORAGE type → auto-complete putaway
  Split putaway: if qty > location capacity → multiple PUT work_lines
```

### Damage Handling [D-03: Manual adjustment, ISS-13 FIX: combined pair]

```
After receipt RECEIVED (all qty → AVAILABLE initially):

Operator discovers damage:
  1. Create inventory_adjustment for damaged portion
  2. System creates COMBINED status+location change [ISS-13 FIX]:
  
     InventTrans #1:
       trans_type = STATUS_CHANGE, stage = PHYSICAL
       qty = -damage_qty
       invent_dim = (STOR-A, AVAILABLE, lot_id)
     
     InventTrans #2:
       trans_type = STATUS_CHANGE, stage = PHYSICAL
       qty = +damage_qty
       invent_dim = (DMG-01, DAMAGED, lot_id)  ← combined loc + status
     
     → 1 pair trans handles both location AND status change
     → lot_id preserved on damaged stock
```

### Business Rules — Inbound

- 1 xe = 1 receipt; 1 PO → many receipts
- Multi-SKU mandatory, manual input per line [D-04]
- Tolerance: MAX(pct, abs) — item → owner → system fallback
- **InventTrans EXPECTED at PO CONFIRMED, reversed at RECEIVED** [ISS-09]
- **InventTrans PHYSICAL at RECEIVED per line — explicit** [ISS-11]
- **Putaway creates InventTrans location change pair — explicit** [ISS-11]
- **lot_id assigned at RECEIVED via get_or_create_lot** [v5.0]
- **Combined status+location change = 1 pair trans** [ISS-13]
- Damage: manual adjustment after receipt [D-03]
- REJECTED > 24h: alert only
- PO amendment: add lines OK, modify confirmed qty NOT OK
- OCR mandatory Go-Live (vessel flow) [D-06]

---

## Phase 5 — Outbound Flow [v5.0 MAJOR REWRITE]

**Sprints:** 14–17 (8 tuần)
**4-cấp hierarchy:** SO → SO Detail → Order Header → Order Detail [B-01]

### Bảng trong scope

| Table | tenant_id | Dependency | Độ phức tạp |
|-------|-----------|------------|-------------|
| sale_order | ✅ UUID | Phase 1 | Medium |
| sale_order_detail | ✅ UUID | sale_order | Complex |
| order_header | ✅ UUID | sale_order | Complex |
| order_detail | ✅ UUID | order_header, so_detail | Complex |
| allocation_record | ✅ UUID | on_hand | Complex |
| work_header (PICK) | ✅ UUID | order_header | Medium |
| work_line (PICK+STAGE+LOAD) | ✅ UUID | work_header | Medium |

### sale_order Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| so_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| so_number | VARCHAR(50) | Y | |
| order_type | ENUM | Y | STANDARD / CONTAINER_STUFFING / BULK_LOADING |
| owner_id | UUID FK | Y | |
| warehouse_id | UUID FK | Y | |
| customer_ref | VARCHAR(100) | N | |
| expected_ship_date | DATE | N | |
| status | ENUM | Y | DRAFT / APPROVED / PARTIALLY_RELEASED / FULLY_RELEASED / SHIPPED / CLOSED / CANCELLED |
| approved_by | UUID FK | N | |
| approved_at | TIMESTAMP | N | |
| remark | TEXT | N | |
| UNIQUE | (tenant_id, so_number) | | |

### sale_order_detail Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| so_detail_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| so_id | UUID FK | Y | |
| line_number | INT | Y | |
| item_id | UUID FK | Y | |
| inventory_status | ENUM | Y | AVAILABLE / DAMAGED |
| **lot_id** | **UUID FK → lot** | **N** | **Optional: filter allocation to specific lot** |
| uom | VARCHAR(10) | Y | |
| pack_key | VARCHAR(50) | N | |
| original_qty | DECIMAL(14,2) | Y | Immutable after APPROVED |
| allocated_qty | DECIMAL(14,2) | Y | Default 0 (denormalized rollup) |
| picked_qty | DECIMAL(14,2) | Y | Default 0 |
| shipped_qty | DECIMAL(14,2) | Y | Default 0 |
| **net_weight_kg** | **DECIMAL(14,2)** | **Y** | **Default 0. Rollup from order details' weighbridge data (always KG)** |
| lot_attr_01..12 | VARCHAR(200) | N | Reference only |
| detail_status | ENUM | Y | OPEN / RELEASING / PARTIALLY_ALLOCATED / FULLY_ALLOCATED / PARTIALLY_SHIPPED / SHIPPED |
| remark | TEXT | N | |

### order_header Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| order_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| order_number | VARCHAR(50) | Y | |
| so_id | UUID FK | Y | |
| carrier_id | UUID FK | N | |
| vehicle_type_id | UUID FK | N | |
| vehicle_plate | VARCHAR(20) | N | |
| driver_name | VARCHAR(200) | N | |
| driver_phone | VARCHAR(20) | N | |
| driver_id_number | VARCHAR(50) | N | |
| container_number | VARCHAR(50) | Conditional | If CONTAINER_STUFFING |
| seal_number | VARCHAR(50) | Conditional | If CONTAINER_STUFFING |
| dock_door | VARCHAR(50) | N | |
| status | ENUM | Y | DRAFT / CONFIRMED / ALLOCATED / PICK_IN_PROGRESS / PICKED / LOADING / LOADED / WEIGHING / ALL_WEIGHED / PENDING_APPROVAL / SHIPPED / CLOSED / CANCELLED |
| cancelled_reason | TEXT | N | |
| cancelled_by | UUID FK | N | |
| UNIQUE | (tenant_id, order_number) | | |

### order_detail Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| order_detail_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| order_id | UUID FK | Y | |
| so_detail_id | UUID FK | Y | |
| line_number | INT | Y | |
| item_id | UUID FK | Y | |
| expected_qty_kg | DECIMAL(14,2) | Y | |
| allocated_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| picked_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| loaded_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| weighed_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| shipped_qty_kg | DECIMAL(14,2) | Y | Default 0 |
| **net_weight_kg** | **DECIMAL(14,2)** | **Y** | **Default 0. Accumulated from weighbridge logs (always KG)** |
| **uom** | **VARCHAR(10)** | **Y** | **Inherited from SO detail. Determines weighbridge update logic** |
| pick_variance_kg | DECIMAL(14,2) | N | |
| weigh_variance_kg | DECIMAL(14,2) | N | |
| retry_count | INT | Y | Default 0 |
| max_retry | INT | Y | Default 3 |
| lot_attr_01..12 | VARCHAR(200) | N | Inherited from SO Detail |
| line_status | ENUM | Y | OPEN / ALLOCATED / PICK_IN_PROGRESS / PICKED / STAGED / LOADING / LOADED / WEIGHING / WEIGHED / SHIPPED / CANCELLED / BLOCKED |
| blocked_reason | TEXT | N | |
| blocked_by | UUID FK | N | |

### allocation_record Table

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| allocation_id | UUID PK | Y | |
| tenant_id | UUID FK NOT NULL | Y | |
| order_detail_id | UUID FK | Y | |
| item_id | UUID FK | Y | |
| invent_dim_id | UUID FK | Y | Source dimension (location, status, lot) |
| allocated_qty_kg | DECIMAL(14,2) | Y | |
| allocation_method | ENUM | Y | AUTO_FIFO / MANUAL |
| **alloc_trans_id** | **UUID FK → invent_trans** | **Y** | **InventTrans ALLOCATED that created this** |
| allocated_at | TIMESTAMP | Y | |
| allocated_by | UUID FK | Y | |
| status | ENUM | Y | ACTIVE / PICKED / SHIPPED / CANCELLED / EXPIRED |
| expires_at | TIMESTAMP | N | |
| cancelled_at | TIMESTAMP | N | |
| cancellation_reason | TEXT | N | |

### Outbound InventTrans Map [v5.0 COMPLETE — every step explicit]

```
Step              | InventTrans                  | Stage         | on_hand Impact
──────────────────|──────────────────────────────|───────────────|──────────────────
SO Approved       | +qty (informational)         | EXPECTED      | outbound_ordered ↑
                  | invent_dim = (default RECV   |               |
                  | loc, AVAILABLE, lot=NULL)    |               |
──────────────────|──────────────────────────────|───────────────|──────────────────
Allocation        | +qty at STORAGE loc          | ALLOCATED     | allocated_qty ↑
                  | (per allocation_record)      |               | [ISS-02 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
De-allocate       | -qty at STORAGE loc          | DE_ALLOCATED  | allocated_qty ↓
(cancel/expire)   |                              |               | [ISS-02 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
Pick (source out) | -actual_qty from STORAGE     | PHYSICAL      | physical ↓ STORAGE
Pick (staging in) | +actual_qty to STAGING       | PHYSICAL      | physical ↑ STAGING
Pick (release)    | -alloc_qty from STORAGE      | DE_ALLOCATED  | allocated ↓ STORAGE
                  |                              |               | [ISS-01 + ISS-02 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
Load (staging out)| -loaded_qty from STAGING     | PHYSICAL      | physical ↓ STAGING
Load (ship in)    | +loaded_qty to SHIPPING      | PHYSICAL      | physical ↑ SHIPPING
                  |                              |               | [ISS-05 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
Weighing          | NO InventTrans               | —             | No change (correct)
──────────────────|──────────────────────────────|───────────────|──────────────────
Ship              | -weighed_qty from SHIPPING   | DEDUCTED      | physical ↓ SHIPPING
                  |                              |               | [ISS-03 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
Reverse EXPECTED  | +qty (reverse original)      | EXPECTED      | outbound_ordered ↓
                  |                              |               | [ISS-09 FIX]
──────────────────|──────────────────────────────|───────────────|──────────────────
Ship variance     | -residual from SHIPPING      | PHYSICAL      | clean SHIPPING loc
(post-ship)       | +residual to STAGING         | PHYSICAL      | return to STAGING
                  |                              |               | [ISS-04 FIX]
```

### FIFO Allocation Engine [v5.0: via InventTrans ALLOCATED]

```
Input: order_detail (item_id, expected_qty_kg, inventory_status, optional lot_id)

Algorithm:
  1. Acquire advisory lock per (tenant, item, dim): [v5.1]
     SELECT pg_advisory_xact_lock(
       hashtext(:tenant::text),
       hashtext(:item_id::text || :invent_dim_id::text)
     );

  2. Compute available from invent_trans (NOT from on_hand): [v5.1]
     SELECT
       SUM(CASE WHEN stage IN ('PHYSICAL','DEDUCTED') THEN qty ELSE 0 END)
       - SUM(CASE WHEN stage IN ('ALLOCATED','DE_ALLOCATED') THEN ABS(qty) ELSE 0 END)
       AS available_qty
     FROM invent_trans
     WHERE tenant_id = :tenant AND item_id = :item_id AND invent_dim_id = :dim_id;

  3. FIFO ordering (from on_hand for display, lot for FIFO):
     ORDER BY l.first_received_date ASC NULLS LAST,
              oh.oldest_posted_at ASC

  4. Allocate FIFO, default max 1 location [ISS-14 FIX]:
     → System auto-allocates from single richest FIFO location.
     → If insufficient: partial allocation + WARNING.
     → Coordinator CAN manually add from additional locations.
     → OR: coordinator splits order_detail into multiple lines.

  5. Per allocation:
     InventTrans: [ISS-02 FIX — via InventTrans, NOT direct UPDATE]
       trans_type = ISSUE
       stage = ALLOCATED
       qty = +alloc_qty (positive = lock)
       invent_dim = source dim (STORAGE, AVAILABLE, lot_id)
       external_id = 'ALLOC-{order_detail_id}-{invent_dim_id}'

     → on_hand.allocated_qty increases (via InventTrans listener)
     → allocation_record created, alloc_trans_id = trans_id

  6. Expiry: 24h (configurable per tenant)
     → Not picked within 24h → auto-deallocate + notify
     → InventTrans DE_ALLOCATED posted
```

### Pick Process [v5.0: ISS-01 FIX — InventTrans location change]

```
WorkHeader PICK auto-created when Order → ALLOCATED.
Self-claim [CFM-12].

Per work_line PICK completed:

  ── PRE-CHECK ──
  actual_qty = worker entered qty (bulk cargo, approximate)
  physical_at_source = on_hand.physical_qty at source location
  
  IF actual_qty > physical_at_source:
    → BLOCK: "Cannot pick {actual_qty}. Available: {physical_at_source}"
    → Worker adjusts qty ≤ physical
    → OR: WH_SUPERVISOR creates adjustment first

  ── PICK MOVE (InventTrans pair) ── [ISS-01 FIX]
  
  InventTrans PICK-OUT:
    trans_type = ISSUE, stage = PHYSICAL
    qty = -actual_qty
    invent_dim = (STORAGE loc, AVAILABLE, lot_id)

  InventTrans PICK-IN:
    trans_type = RECEIPT, stage = PHYSICAL
    qty = +actual_qty
    invent_dim = (STAGING loc, AVAILABLE, lot_id)  ← lot preserved

  ── ALLOCATION RELEASE (InventTrans) ── [ISS-02 FIX]
  
  InventTrans PICK-DEALLOC:
    trans_type = ISSUE, stage = DE_ALLOCATED
    qty = -alloc_qty (release lock)
    invent_dim = (STORAGE loc) ← same as allocation source
    is_reversal = TRUE, reversed_trans_id = allocation's trans_id

  allocation_record.status = PICKED

  ── OVER-PICK HANDLING ── [ISS-07 FIX]
  
  IF actual_qty > alloc_qty:
    surplus = actual_qty - alloc_qty
    order_detail.pick_variance_kg = +surplus
    → Surplus moves to staging, reconciles at weighing
    → No additional allocation created

  ── SHORT PICK HANDLING ── [E-04]
  
  IF actual_qty < alloc_qty:
    shortage = alloc_qty - actual_qty
    → Auto-search next FIFO location for shortage qty
    → If found: create new allocation + pick work
    → If not found: log pick_variance_kg = -shortage, notify coordinator
    → Coordinator: accept short OR cancel remaining

  ── RESULT ──
  on_hand STORAGE: physical ↓, allocated ↓
  on_hand STAGING: physical ↑
  Location accuracy: ✅ STORAGE and STAGING correct at all times
```

### Loading Process [v5.0: ISS-05 FIX — InventTrans location change]

```
After PICKED → LOADING:

Per order_detail line loaded:

  InventTrans LOAD-OUT:
    trans_type = ISSUE, stage = PHYSICAL
    qty = -loaded_qty
    invent_dim = (STAGING loc, AVAILABLE, lot_id)

  InventTrans LOAD-IN:
    trans_type = RECEIPT, stage = PHYSICAL
    qty = +loaded_qty
    invent_dim = (SHIPPING loc, AVAILABLE, lot_id)  ← lot preserved

  loaded_qty = picked_qty per line (default)
  order_detail.loaded_qty_kg = loaded_qty
  order_detail.line_status = LOADED

  on_hand STAGING: physical ↓
  on_hand SHIPPING: physical ↑

BULK_LOADING variant:
  Pick destination = SHIPPING loc directly (skip STAGING)
  → Pick InventTrans: STORAGE → SHIPPING
  → Loading step: status change only, NO additional InventTrans
  → order_detail: PICKED → LOADED (skip STAGED)
```

### Outbound Weighing [TC-09, TC-11, E-10]

```
After LOADED → WEIGHING:
  WeighbridgeLog created, tare captured.

Per line (flexible sequence — TC-09):
  weighbridge_log captured (1 per line/SKU)

  Tolerance check:
    Bulk: threshold = MAX(tolerance_pct × expected, tolerance_abs)
    Bagged: threshold = 2 × bag_shell_weight × bag_count [E-10]

  [Within tolerance] → WEIGHED ✅
  [Surplus > threshold] → BLOCKED (TC-11), supervisor resolve:
    (A) Accept: verify on_hand at SHIPPING ≥ weighed_qty
    (B) Re-weigh
    (C) Reject line
  [Shortage > threshold] → WARNING, coordinator decides:
    (A) Ship short
    (B) Re-pick
    (C) Cancel remaining

  Multiple weighbridge_logs per line allowed (no max limit)
  Split during weighing allowed [E-08]

  NO InventTrans at weighing. ← Correct.
```

### Tolerance Check Pattern [v5.1]

```
Tolerance LUÔN dùng net_weight_kg (bất kể UOM trên line):
  variance = |SUM(line.net_weight_kg) - expected_net_weight_kg|
  variance_pct = variance / expected_net_weight_kg × 100
  Khi UOM = KG: expected_net_weight_kg = expected_qty_kg (same value)
  Khi UOM ≠ KG: expected_net_weight_kg tính qua UOM conversion từ expected_qty
```

### SHIPPED Process [v5.0: ISS-03 FIX — from SHIPPING location]

```
All lines WEIGHED → ALL_WEIGHED → SHIPPED

Per order_detail line:

  ship_qty = weighed_qty_kg (final truth from scale)

  InventTrans SHIP: [ISS-03 FIX: explicit SHIPPING location]
    trans_type = ISSUE
    stage = DEDUCTED
    qty = -ship_qty
    invent_dim = (SHIPPING loc, AVAILABLE, lot_id)  ← FROM SHIPPING

  Pre-check:
    on_hand.physical_qty at SHIPPING ≥ ship_qty [F-01]
    If insufficient → BLOCK, supervisor investigate

  Reverse EXPECTED: [ISS-09 FIX]
    stage = EXPECTED, qty = +expected_qty (reverse original SO EXPECTED)
    → outbound_ordered_qty decreases

  Update records:
    order_detail.shipped_qty_kg = ship_qty
    order_detail.line_status = SHIPPED
    allocation_record.status = SHIPPED
    so_detail rollup: shipped_qty += ship_qty
    SO status rollup

  Print: DO, Phiếu Cân, Gate Pass, GDN
```

### Post-Ship Residual Cleanup [v5.0: ISS-04 FIX — NEW]

```
After ALL lines SHIPPED for an order:

  total_loaded = SUM(order_detail.loaded_qty_kg)
  total_shipped = SUM(order_detail.shipped_qty_kg)
  residual = total_loaded - total_shipped

  on_hand at SHIPPING loc for this item should = residual

  IF residual > 0:
    → Goods left at dock after truck departed
    
    InventTrans VARIANCE-OUT:
      trans_type = ADJUSTMENT, stage = PHYSICAL
      qty = -residual
      invent_dim = (SHIPPING loc, AVAILABLE, lot_id)
      reason_code = POST_SHIP_RETURN

    InventTrans VARIANCE-IN:
      trans_type = ADJUSTMENT, stage = PHYSICAL
      qty = +residual
      invent_dim = (STAGING loc, AVAILABLE, lot_id)

    Auto-create PUTAWAY work for residual qty (STAGING → STORAGE)

  IF residual = 0: no action needed ✅
  IF residual < 0: should not happen (negative check blocks SHIP)
```

### Cancel / Rollback Flows

```
[A] Cancel before ALLOCATED:
  order_header → CANCELLED
  SO Detail open_qty restored. No inventory impact.

[B] Cancel after ALLOCATED, before PICKED:
  Per allocation_record:
    InventTrans DE_ALLOCATED: -alloc_qty (release)
    allocation_record.status = CANCELLED
  SO Detail restored.

[C] Cancel after PICKED, before SHIPPED:
  Reverse pick InventTrans:
    +qty back to STORAGE, -qty from STAGING
  InventTrans DE_ALLOCATED (if not already released at pick)
  Auto-create PUTAWAY work for returned goods
  SO Detail restored.

[D] Cancel from LOADING/WEIGHING:
  Reverse load InventTrans: +qty back to STAGING, -qty from SHIPPING
  Then reverse pick (same as C)

[E] Partial cancel (some lines shipped):
  Only cancel unshipped lines. Shipped lines remain.
```

### Order Type Variants

```
STANDARD:
  Pick (STORAGE → STAGING) → Stage → Load (STAGING → SHIPPING)
  → Weigh → Ship (deduct SHIPPING)

BULK_LOADING [B-10]:
  Pick (STORAGE → SHIPPING directly, skip STAGING)
  → Load (status only, no InventTrans) → Weigh → Ship (deduct SHIPPING)

CONTAINER_STUFFING:
  Pick (STORAGE → STAGING) → Stuff container → Load (STAGING → SHIPPING)
  → Weigh → Ship. Requires container_number + seal_number.
```

### Business Rules — Outbound [v5.0 ALL FIXES]

- **4-cấp hierarchy: SO → SO Detail → Order → Order Detail** [B-01]
- **ALL inventory changes via InventTrans — no direct on_hand update** [Golden Rule 1]
- **Pick creates InventTrans STORAGE → STAGING** [ISS-01 FIX]
- **Loading creates InventTrans STAGING → SHIPPING** [ISS-05 FIX]
- **Allocation via InventTrans ALLOCATED stage** [ISS-02 FIX]
- **De-allocation via InventTrans DE_ALLOCATED** [ISS-02 FIX]
- **SHIPPED deducts from SHIPPING location** [ISS-03 FIX]
- **Post-ship residual: auto return to STAGING + putaway** [ISS-04 FIX]
- **Over-pick: tracked via pick_variance_kg, reconciled at weighing** [ISS-07 FIX]
- **Max 1 pick location default; coordinator CAN override** [ISS-14 FIX]
- **Reverse EXPECTED when SHIPPED** [ISS-09 FIX]
- **lot_id preserved through entire flow** [v5.0]
- **SO Detail optional lot_id filter for allocation** [v5.0]
- FIFO per lot (oldest lot.first_received_date first)
- TC-09: flexible weighing sequence
- TC-11: surplus > tolerance → BLOCK
- E-10: bagged tolerance = 2 × shell × bag_count
- Allocation expiry 24h → auto-deallocate [E-02]
- Short pick: auto-adjust + search next location [E-04]
- Split shipment during weighing [E-08]
- InventTrans EXPECTED at SO APPROVED [E-01]
- Negative inventory hard block [F-01]
