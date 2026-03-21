# Phase 4: Operations — 3 Parallel Tracks

**Devs:** 3 (parallel)
**Effort:** ~4-5 sprints per track
**Blocking:** Phase 3 (InventTrans, Weighbridge engines must be operational)
**Complexity:** HIGH — complex state machines + inventory integration

---

## Parallelism Map

```
Phase 3 Done (InventTrans + Weighbridge engines ready)
    │
    ├──► Track 4A: Inbound (PO → Receipt → Putaway)     ← Dev A
    │    6 entities, 9+ status transitions
    │
    ├──► Track 4B: Outbound (SO → Order → Ship)          ← Dev B
    │    5 entities, 12+ status transitions, FIFO alloc
    │
    └──► Track 4C: Transfer + Inventory Adjustment        ← Dev C
         2 entities + shared Work entities
```

**Why parallel:** Inbound and Outbound are mirror operations — they both use InventTrans service but never touch the same entities or status flows. Transfer is independent from both.

---

## Track 4A: Inbound — PO → Receipt → Putaway (Dev A)

**Entities:** PurchaseOrder, PurchaseOrderLine, InboundReceipt, InboundReceiptLine, WorkHeader, WorkLine
**Folder:** `Application/Features/Inbound/`
**Frontend:** `/purchase-orders`, `/receipts`, `/putaway`

### Flow

```
PO (DRAFT) ──► PO (CONFIRMED) ──► Receipt Created ──► Weighbridge
                    │                                      │
                    │                                      ▼
                    │                               Receipt Line RECEIVED
                    │                               (lot assigned, InventTrans PHYSICAL)
                    │                                      │
                    │                                      ▼
                    │                               Work Order (PUTAWAY)
                    │                               RECV → STORAGE location
                    │                                      │
                    ▼                                      ▼
              PO (FULLY_RECEIVED) ◄──────────── PO (CLOSED)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| **PO Management** |
| 4A.1 | PurchaseOrder CRUD | CRUD | po_number (auto), po_type (VESSEL/CUSTOMER), FK → Owner, Vendor, Warehouse | P0 |
| 4A.2 | PurchaseOrderLine CRUD | CRUD | expected_qty_kg, uom, lot_attr_01..12, FK → PO, Item | P0 |
| 4A.3 | PO status machine | Logic | DRAFT → CONFIRMED → PARTIALLY_RECEIVED → FULLY_RECEIVED → CLOSED | P0 |
| 4A.4 | PO confirm → InventTrans EXPECTED | Logic | Post EXPECTED stage (+qty, inbound_ordered_qty ↑) per line | P0 |
| **Receipt Management** |
| 4A.5 | InboundReceipt CRUD | CRUD | receipt_number (auto), vehicle_plate, FK → PO | P0 |
| 4A.6 | InboundReceiptLine CRUD | CRUD | expected/received_qty_kg, net_weight_kg, uom (inherit from PO), FK → Receipt, POLine, Item | P0 |
| 4A.7 | Receipt → Lot assignment | Logic | On RECEIVED: call `ILotService.GetOrCreateLot()` with lot_attr from PO line → set lot_id | P0 |
| 4A.8 | Receipt → InventTrans PHYSICAL | Logic | Post PHYSICAL stage at RECEIVING location + Reverse EXPECTED | P0 |
| 4A.9 | Weighbridge integration | Logic | Consume `IWeighbridgeService` — link weighbridge logs to receipt lines, update net_weight_kg | P0 |
| 4A.10 | Over-receipt tolerance check | Logic | received_qty > expected_qty × (1 + tolerance_pct) → require manager approval | P1 |
| **Putaway** |
| 4A.11 | WorkHeader/WorkLine (PUTAWAY type) | Logic | Auto-create work order: RECEIVE step at RECV location → PUT step at STORAGE location | P1 |
| 4A.12 | Putaway location suggestion | Logic | Based on zone rules, item_group.preferred_zone, capacity, incompatibility | P1 |
| 4A.13 | Putaway → InventTrans pair | Logic | -qty from RECV location, +qty at STORAGE location (same lot preserved) | P1 |
| 4A.14 | Putaway completion → update PO status | Logic | All lines putaway → PO status = FULLY_RECEIVED | P1 |
| **Work Management** |
| 4A.15 | Work order self-claim | Logic | Operator claims open work → status IN_PROGRESS | P2 |
| 4A.16 | Work line completion tracking | Logic | Each work line completion → InventTrans pair | P2 |

### API Endpoints

```
# Purchase Order
GET    /api/purchase-orders                 ← List (DynamicGrid, filter: status, ownerId, warehouseId)
GET    /api/purchase-orders/{id}            ← Detail (include lines)
POST   /api/purchase-orders                 ← Create (with lines)
PUT    /api/purchase-orders/{id}            ← Update (DRAFT only)
POST   /api/purchase-orders/{id}/confirm    ← Confirm → post InventTrans EXPECTED
POST   /api/purchase-orders/{id}/close      ← Manual close

# PO Line
POST   /api/purchase-orders/{poId}/lines    ← Add line
PUT    /api/purchase-order-lines/{id}       ← Update (DRAFT PO only)
DELETE /api/purchase-order-lines/{id}       ← Remove (DRAFT PO only)

# Inbound Receipt
GET    /api/inbound-receipts                ← List (filter: poId, status, date)
GET    /api/inbound-receipts/{id}           ← Detail (include lines + weighbridge logs)
POST   /api/inbound-receipts                ← Create (from PO)
POST   /api/inbound-receipts/{id}/receive   ← Receive → assign lot, post InventTrans

# Receipt Line
PUT    /api/inbound-receipt-lines/{id}      ← Update received qty
POST   /api/inbound-receipt-lines/{id}/receive ← Receive individual line

# Work Order (Putaway)
GET    /api/work-orders                     ← List (filter: workType=PUTAWAY, status)
POST   /api/work-orders/{id}/claim          ← Self-claim
POST   /api/work-orders/{id}/complete       ← Complete → InventTrans pair
GET    /api/work-orders/{id}                ← Detail (include lines)
```

### Business Rules

- BR-4A-001: PO can only be edited in DRAFT status
- BR-4A-002: PO confirm posts EXPECTED InventTrans for all lines
- BR-4A-003: Receipt line receives lot_id via GetOrCreateLot at RECEIVED stage
- BR-4A-004: Receipt posts PHYSICAL InventTrans at RECEIVING location + reverses EXPECTED
- BR-4A-005: Putaway creates InventTrans pair: -RECV, +STORAGE (lot preserved)
- BR-4A-006: Over-receipt > tolerance_pct requires manager approval
- BR-4A-007: Weighbridge net_weight updates receipt line's net_weight_kg

---

## Track 4B: Outbound — SO → Order → Allocation → Ship (Dev B)

**Entities:** SaleOrder, SaleOrderDetail, OrderHeader, OrderDetail, AllocationRecord
**Folder:** `Application/Features/Outbound/`
**Frontend:** `/sale-orders`, `/orders`

### Flow (4-Level Hierarchy)

```
SO (DRAFT) ──► SO (APPROVED)
                    │
                    ├──► InventTrans EXPECTED (-qty)
                    │
                    ▼
              Order Created (1 per vehicle)
                    │
                    ▼
              ALLOCATION (FIFO per location)
              AllocationRecord created
              InventTrans ALLOCATED
                    │
                    ▼
              PICK (STORAGE → STAGING)
              InventTrans pair + DE_ALLOCATED
                    │
                    ▼
              LOAD (STAGING → SHIPPING)
              InventTrans pair
                    │
                    ▼
              WEIGHING (weighbridge verification)
              No InventTrans — only weight capture
                    │
                    ▼
              SHIP (InventTrans DEDUCTED from SHIPPING)
              Reverse EXPECTED
                    │
                    ▼
              Post-ship residual cleanup
              (SHIPPING → STAGING → putaway if remaining)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| **SO Management** |
| 4B.1 | SaleOrder CRUD | CRUD | so_number (auto), order_type (STANDARD/CONTAINER_STUFFING/BULK_LOADING), FK → Owner | P0 |
| 4B.2 | SaleOrderDetail CRUD | CRUD | original_qty (immutable after APPROVED), allocated/picked/shipped_qty, lot_id (optional filter), FK → SO, Item | P0 |
| 4B.3 | SO status machine | Logic | DRAFT → APPROVED → ALLOCATING → IN_PROGRESS → SHIPPED → CLOSED → CANCELLED | P0 |
| 4B.4 | SO approve → InventTrans EXPECTED | Logic | Post EXPECTED stage (-qty, outbound_ordered_qty ↑) per detail | P0 |
| **Order Management** |
| 4B.5 | OrderHeader CRUD | CRUD | order_number (auto), vehicle_plate, container/seal_number, FK → SO, Carrier | P0 |
| 4B.6 | OrderDetail CRUD | CRUD | expected/allocated/picked/loaded/weighed/shipped_qty_kg, FK → Order, SODetail, Item | P0 |
| 4B.7 | Order status machine | Logic | DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → LOADING → LOADED → WEIGHING → WEIGHED → SHIPPING → SHIPPED → CLOSED (12 statuses) | P0 |
| **Allocation** |
| 4B.8 | FIFO allocation engine | Logic | Call `IAllocationService.AllocateFifoAsync()` → create AllocationRecord per location → InventTrans ALLOCATED | P0 |
| 4B.9 | AllocationRecord management | CRUD | Track allocated_qty per location, status (ACTIVE/PICKED/SHIPPED/CANCELLED/EXPIRED) | P0 |
| 4B.10 | Allocation expiry | Logic | Background job: cancel allocations older than `system_config.allocation_expiry_hours` (default 24h) | P1 |
| 4B.11 | Manual allocation override | Logic | Allow operator to manually select locations (bypass FIFO) | P2 |
| **Pick → Load → Ship** |
| 4B.12 | Pick → InventTrans pair | Logic | STORAGE → STAGING + DE_ALLOCATED. Create WorkHeader (type=PICK) + WorkLines | P0 |
| 4B.13 | Load → InventTrans pair | Logic | STAGING → SHIPPING. Update order detail loaded_qty | P1 |
| 4B.14 | Weighbridge verification | Logic | Consume `IWeighbridgeService` — update order detail weighed_qty + net_weight_kg | P0 |
| 4B.15 | Ship → InventTrans DEDUCTED | Logic | DEDUCTED from SHIPPING location + Reverse EXPECTED | P0 |
| 4B.16 | Pick/weigh variance tracking | Logic | pick_variance_kg = picked - allocated. weigh_variance_kg = weighed - picked | P1 |
| 4B.17 | Post-ship residual cleanup | Logic | Remaining at SHIPPING → auto-create putaway work (SHIPPING → STAGING → STORAGE) | P2 |

### API Endpoints

```
# Sale Order
GET    /api/sale-orders                     ← List (DynamicGrid)
GET    /api/sale-orders/{id}                ← Detail (include details + orders)
POST   /api/sale-orders                     ← Create (with details)
PUT    /api/sale-orders/{id}                ← Update (DRAFT only)
POST   /api/sale-orders/{id}/approve        ← Approve → post InventTrans EXPECTED

# SO Detail
POST   /api/sale-orders/{soId}/details      ← Add detail
PUT    /api/sale-order-details/{id}         ← Update (DRAFT SO only)

# Order
GET    /api/orders                          ← List (filter: soId, status)
GET    /api/orders/{id}                     ← Detail (include details + weighbridge logs)
POST   /api/orders                          ← Create (from SO)
PUT    /api/orders/{id}                     ← Update

# Order Detail
PUT    /api/order-details/{id}              ← Update

# Allocation
POST   /api/orders/{id}/allocate            ← FIFO allocate all details
POST   /api/order-details/{id}/allocate     ← Allocate single detail
DELETE /api/allocations/{id}                ← Cancel allocation

# Operations
POST   /api/orders/{id}/pick                ← Pick all allocated details
POST   /api/orders/{id}/load                ← Load picked details
POST   /api/orders/{id}/ship                ← Ship → DEDUCTED + close

# Work
GET    /api/work-orders?workType=PICK       ← List pick work orders
```

### Business Rules

- BR-4B-001: SO original_qty is immutable after APPROVED
- BR-4B-002: SO → 1+ Orders (1 per vehicle)
- BR-4B-003: FIFO allocation: oldest inventory first (by invent_trans posted_at)
- BR-4B-004: Allocation expires after `allocation_expiry_hours` (default 24h)
- BR-4B-005: Cannot ship more than allocated qty
- BR-4B-006: Weighbridge verification captures actual weight but does NOT change inventory
- BR-4B-007: Post-ship residual at SHIPPING location auto-generates putaway work

---

## Track 4C: Transfer + Inventory Adjustment (Dev C)

**Entities:** TransferHeader, TransferLine (+ reuse WorkHeader/WorkLine)
**Folder:** `Application/Features/Transfers/`, `InventoryAdjustments/`
**Frontend:** `/transfers`, `/adjustments`

### Transfer Flow

```
Transfer (CREATED) ──► (APPROVED) ──► SHIP from Source
                                        │
                                        ├── InventTrans DEDUCTED at source STORAGE
                                        ├── InventTrans PHYSICAL at source TRANSIT (IN_TRANSIT status)
                                        │
                                        ▼
                                     RECEIVE at Destination
                                        │
                                        ├── InventTrans DEDUCTED at source TRANSIT
                                        ├── InventTrans PHYSICAL at dest RECEIVING (AVAILABLE)
                                        │
                                        ▼
                                     CLOSED (variance calculated)
```

### Tasks

| # | Task | Type | Detail | Priority |
|---|------|------|--------|----------|
| **Transfer** |
| 4C.1 | TransferHeader CRUD | CRUD | transfer_number (auto), source/dest_warehouse_id, transfer_reason, use_weighbridge, FK → Owner | P0 |
| 4C.2 | TransferLine CRUD | CRUD | planned/shipped/received_qty_kg, variance_kg, FK → Transfer, Item, Lot | P0 |
| 4C.3 | Transfer status machine | Logic | CREATED → APPROVED → PICKING → PICKED → SHIPPING → IN_TRANSIT → RECEIVING → RECEIVED → CLOSED | P0 |
| 4C.4 | Transfer ship → InventTrans | Logic | DEDUCTED at source STORAGE + PHYSICAL at source TRANSIT (IN_TRANSIT status) | P0 |
| 4C.5 | Transfer receive → InventTrans | Logic | DEDUCTED at source TRANSIT + PHYSICAL at dest RECEIVING (AVAILABLE status) | P0 |
| 4C.6 | Lot preservation | Logic | Same lot_id transferred across warehouses (hash excludes warehouse_id) | P0 |
| 4C.7 | Transit loss handling | Logic | If received < shipped → InventTrans ADJUSTMENT from IN_TRANSIT bucket | P1 |
| 4C.8 | Weighbridge integration (optional) | Logic | If use_weighbridge = true → weighbridge verification at source + dest | P2 |
| **Inventory Adjustment** |
| 4C.9 | Adjustment approval workflow | Logic | PENDING → APPROVED → POSTED (→ InventTrans ADJUSTMENT) / REJECTED | P1 |
| 4C.10 | Adjustment threshold | Logic | Over-threshold adjustments require manager approval (configurable) | P1 |
| 4C.11 | Cycle count adjustment | Logic | Physical count difference → auto-create adjustment | P2 |

### API Endpoints

```
# Transfer
GET    /api/transfers                       ← List (DynamicGrid, filter: status, warehouseId)
GET    /api/transfers/{id}                  ← Detail (include lines)
POST   /api/transfers                       ← Create (with lines)
PUT    /api/transfers/{id}                  ← Update (CREATED/APPROVED only)
POST   /api/transfers/{id}/approve          ← Approve
POST   /api/transfers/{id}/ship             ← Ship → InventTrans at source
POST   /api/transfers/{id}/receive          ← Receive → InventTrans at dest
POST   /api/transfers/{id}/close            ← Close (calculate variance)

# Transfer Line
POST   /api/transfers/{transferId}/lines    ← Add line
PUT    /api/transfer-lines/{id}             ← Update
DELETE /api/transfer-lines/{id}             ← Remove

# Inventory Adjustment (extends Phase 3B basic CRUD)
POST   /api/inventory-adjustments/{id}/approve  ← Approve → post InventTrans
POST   /api/inventory-adjustments/{id}/reject   ← Reject
```

### Business Rules

- BR-4C-001: Transfer source and dest warehouse must be different
- BR-4C-002: Transfer preserves lot_id across warehouses
- BR-4C-003: IN_TRANSIT status visible in on_hand at source warehouse
- BR-4C-004: Transit loss = shipped_qty - received_qty → auto-adjustment with reason code
- BR-4C-005: Adjustment over threshold requires approval (threshold from system_config)

---

## Cross-Track Dependencies

| Track 4A | Track 4B | Track 4C | Shared |
|----------|----------|----------|--------|
| Creates WorkHeader/WorkLine entities | Uses WorkHeader/WorkLine (type=PICK) | Uses WorkHeader/WorkLine (type=MOVE) | WorkHeader/WorkLine are shared entities |
| Uses IWeighbridgeService | Uses IWeighbridgeService | Optionally uses IWeighbridgeService | IWeighbridgeService from Phase 3C |
| Uses IInventTransService | Uses IInventTransService + IAllocationService | Uses IInventTransService | Services from Phase 3B |
| Uses ILotService | References lot_id | Preserves lot_id | ILotService from Phase 3A |

### Work Entity Coordination

Since WorkHeader/WorkLine are shared across tracks:
- **Track 4A creates** the base CRUD and PUTAWAY work type
- **Track 4B extends** with PICK work type (add to same service, different commands)
- **Track 4C extends** with MOVE work type
- Each track owns its own work_type-specific logic but shares the entity and base service

---

## Definition of Done

### Track 4A (Inbound)
- [ ] PO create → confirm → receipt → putaway full flow works
- [ ] Lot correctly assigned on receipt
- [ ] InventTrans stages: EXPECTED → PHYSICAL at RECV → pair to STORAGE
- [ ] Weighbridge integration updates receipt line weights
- [ ] Over-receipt tolerance check enforced

### Track 4B (Outbound)
- [ ] SO create → approve → allocate → pick → load → weigh → ship full flow
- [ ] FIFO allocation respects inventory ordering
- [ ] Allocation expiry works (24h default)
- [ ] Cannot oversell (negative inventory prevented)
- [ ] Post-ship residual cleanup works

### Track 4C (Transfer)
- [ ] Transfer ship → in_transit → receive → close full flow
- [ ] Lot preserved across warehouses
- [ ] Transit loss correctly adjusted
- [ ] Inventory adjustment approval workflow works
