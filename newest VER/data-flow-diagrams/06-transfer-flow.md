# 06 - Inter-Warehouse Transfer: Data Flow Diagram

> Module scope: Inter-warehouse transfer of inventory with full traceability, transit tracking, and loss/damage handling.
> Tables: `transfer_header`, `transfer_line`, `work_header`, `work_line` (reused MOVE type), `invent_trans`, `on_hand`, `weighbridge_log`.
> Integration: Inventory Core (InventTrans), Weighbridge (N logs per transfer, 1 per SKU), Work Management (MOVE), Billing (TRANSIT excluded).

---

## Table of Contents

1. [Context Diagram](#1-context-diagram)
2. [Process Flow Diagram](#2-process-flow-diagram)
3. [State Machine Diagrams](#3-state-machine-diagrams)
4. [InventTrans Posting Diagram](#4-inventtrans-posting-diagram)
5. [Inventory Balance Verification](#5-inventory-balance-verification)
6. [Data Flow Table](#6-data-flow-table)
7. [Frontend Guide](#7-frontend-guide)
8. [Backend Guide](#8-backend-guide)

---

## 1. Context Diagram

High-level view showing the Transfer module and its external interactions.

```mermaid
graph TB
    subgraph External Actors
        KEEPER(["KEEPER\nWarehouse Operator"])
        WH_MGR(["WH_MANAGER\nWarehouse Manager"])
        WB_OP(["WB_OPERATOR\nWeighbridge Operator"])
    end

    subgraph "Consumed Modules"
        MASTER["Master Data Module\n(warehouse, owner, item, lot, location)"]
        INVENTORY["Inventory Core\n(invent_trans, on_hand)"]
        WORK["Work Management\n(work_header, work_line)"]
        WEIGHBRIDGE["Weighbridge Module\n(weighbridge_log)"]
        BILLING["Billing Module\n(daily_storage_snapshot)"]
    end

    subgraph "Inter-Warehouse Transfer Module"
        TH["Transfer Order\nManagement"]
        TL["Transfer Line\nManagement"]
        SHIP["Ship at Source"]
        RECV["Receive at Destination"]
    end

    %% Actor flows
    KEEPER -- "Create transfer order\nPick & stage goods\nConfirm shipment\nConfirm receipt\n(qty, loss, damage)" --> TH
    WH_MGR -- "Approve transfer order\nReview loss/damage alerts" --> TH
    WB_OP -- "Cascading weighing\n1 log per SKU/transfer_line\nat source or destination" --> WEIGHBRIDGE

    TH -- "Transfer status updates\nWork assignments" --> KEEPER
    TH -- "Pending approvals\nLoss/damage alerts" --> WH_MGR

    %% Module integrations
    MASTER -- "warehouse, owner, item,\nlot, location" --> TH
    MASTER -- "lot_hash (excl warehouse_id)\nfor cross-WH lot preservation" --> RECV

    TH -- "TRANSFER_ISSUE\n(DEDUCTED + PHYSICAL)" --> INVENTORY
    RECV -- "TRANSFER_RECEIPT\n(DEDUCTED + PHYSICAL)\nADJUSTMENT (loss)" --> INVENTORY
    INVENTORY -- "on_hand validation\n(source STORAGE)" --> TH

    TH -- "Create MOVE work\n(PICK → STAGE → SHIP)" --> WORK
    RECV -- "Create PUTAWAY work\nat destination" --> WORK

    SHIP -- "N weighbridge_logs (OUTBOUND)\n1 per SKU at source\nauto-updates shipped_qty" --> WEIGHBRIDGE
    RECV -- "N weighbridge_logs (INBOUND)\n1 per SKU at destination\nauto-updates received_qty" --> WEIGHBRIDGE

    BILLING -- "Reads on_hand for\ndaily_storage_snapshot" --> INVENTORY
    TH -. "IN_TRANSIT inventory\nexcluded from billing" .-> BILLING

    %% Styling
    classDef actor fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    classDef module fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    classDef transfer fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#0D47A1,font-weight:bold

    class KEEPER,WH_MGR,WB_OP actor
    class MASTER,INVENTORY,WORK,WEIGHBRIDGE,BILLING module
    class TH,TL,SHIP,RECV transfer
```

---

## 2. Process Flow Diagram

End-to-end process: Create, Approve, Release, Ship, In-Transit, Receive, Close.

```mermaid
flowchart TD
    subgraph "P1: Create Transfer Order"
        P1_1["P1.1 Input: source_wh, dest_wh,\nowner, items, qty, reason"]
        P1_2{"P1.2 Validate:\nsource != dest?\nowner access both WH?\nqty > 0?"}
        P1_3["P1.3 Create transfer_header\nstatus = CREATED"]
        P1_4["P1.4 Create transfer_lines\nline_status = OPEN\nOptional: source_lot_id or FIFO"]
    end

    subgraph "P2: Approve"
        P2_1{"P2.1 WH_MANAGER\n(source WH)\n4-eyes: approver != creator"}
        P2_2["P2.2 Re-check on_hand\navailability"]
        P2_3["P2.3 Header status\nCREATED → APPROVED"]
    end

    subgraph "P3: Release for Execution"
        P3_1["P3.1 Create WorkHeader\nwork_type = MOVE"]
        P3_2["P3.2 Create WorkLines:\nPICK → STAGE → SHIP"]
        P3_3["P3.3 Header status\nAPPROVED → RELEASED"]
        P3_4["P3.4 KEEPER picks goods\nfrom source STORAGE"]
    end

    subgraph "P4: Ship at Source"
        P4_0["P4.0 Cascading weighbridge (OUTBOUND)\n1 weighbridge_log per SKU/transfer_line\nPOST /api/weighbridge-logs\ntype=OUTBOUND (gross < tare)\ndocument_number=transfer_number\nauto-resolves → transfer_line\nCOMPLETED → shipped_qty += net_weight_kg"]
        P4_1["P4.1 All lines weighed?\nVerify shipped_qty per line"]
        P4_2["P4.2 InventTrans #1\nTRANSFER_ISSUE (DEDUCTED)\n-shipped_qty from source STORAGE"]
        P4_3["P4.3 InventTrans #2\nTRANSFER_ISSUE (PHYSICAL)\n+shipped_qty to source TRANSIT"]
        P4_4["P4.4 Header status\nRELEASED → SHIPPED → IN_TRANSIT\nLine status → IN_TRANSIT"]
    end

    subgraph "P5: Receive at Destination"
        P5_0["P5.0 Cascading weighbridge (INBOUND)\n1 weighbridge_log per SKU/transfer_line\nPOST /api/weighbridge-logs\ntype=INBOUND (gross > tare)\ndocument_number=transfer_number\nauto-resolves → transfer_line\nCOMPLETED → received_qty += net_weight_kg"]
        P5_1["P5.1 All lines weighed?\nInput loss_qty, damage_qty"]
        P5_2{"P5.2 received_qty\n== shipped_qty?"}
        P5_3["P5.3 Full Receive\n(see InventTrans #3, #4)"]
        P5_4{"P5.4 damage_qty > 0?"}
        P5_5["P5.5 Partial Receive + Loss\n(see InventTrans #3, #4, #5)"]
        P5_6["P5.6 Split: good_qty → AVAILABLE\ndamage_qty → DAMAGED"]
        P5_7["P5.7 Auto-create PUTAWAY\nwork at destination"]
        P5_8["P5.8 Line status →\nRECEIVED / WITH_LOSS / WITH_DAMAGE"]
    end

    subgraph "P6: Close"
        P6_1{"P6.1 All lines\nclosed?"}
        P6_2["P6.2 Header status → CLOSED"]
    end

    subgraph "Data Stores"
        DS1[("transfer_header\ntransfer_line")]
        DS2[("invent_trans\non_hand")]
        DS3[("work_header\nwork_line")]
        DS4[("lot")]
        DS5[("weighbridge_log\n(N per transfer,\n1 per SKU/line)")]
    end

    %% Flow connections
    P1_1 --> P1_2
    P1_2 -- "Valid" --> P1_3
    P1_2 -- "Invalid" --> REJECT1(["Reject with\nvalidation error"])
    P1_3 --> P1_4
    P1_4 --> DS1

    P1_4 --> P2_1
    P2_1 -- "Approved" --> P2_2
    P2_1 -- "Rejected" --> REJECT2(["Return to CREATED\nor CANCELLED"])
    P2_2 -- "Sufficient on_hand" --> P2_3
    P2_2 -- "Insufficient" --> REJECT3(["Reject: insufficient\non_hand"])
    P2_3 --> DS1

    P2_3 --> P3_1
    P3_1 --> P3_2
    P3_2 --> DS3
    P3_2 --> P3_3
    P3_3 --> DS1
    P3_3 --> P3_4

    P3_4 --> P4_0
    P4_0 --> DS5
    P4_0 --> P4_1
    P4_1 --> P4_2
    P4_2 --> DS2
    P4_2 --> P4_3
    P4_3 --> DS2
    P4_3 --> P4_4
    P4_4 --> DS1

    P4_4 --> P5_0
    P5_0 --> DS5
    P5_0 --> P5_1
    P5_1 --> P5_2
    P5_2 -- "Yes: full receive" --> P5_3
    P5_2 -- "No: partial receive" --> P5_5
    P5_3 --> P5_4
    P5_5 --> P5_4
    P5_4 -- "Yes: has damage" --> P5_6
    P5_4 -- "No damage" --> P5_7
    P5_6 --> P5_7
    P5_3 --> DS2
    P5_5 --> DS2
    P5_7 --> DS3
    P5_7 --> P5_8
    P5_8 --> DS1

    P5_8 --> P6_1
    P6_1 -- "Yes" --> P6_2
    P6_1 -- "No" --> P5_1
    P6_2 --> DS1
```

---

## 3. State Machine Diagrams

### 3.1 Transfer Header Status

```mermaid
stateDiagram-v2
    [*] --> CREATED : POST /api/transfers\n(source, dest, owner, lines)

    CREATED --> APPROVED : PUT .../approve\nWH_MANAGER (source WH)\n4-eyes: approver != creator

    CREATED --> CANCELLED : PUT .../cancel\n(pre-SHIPPED only)

    APPROVED --> RELEASED : PUT .../release\nCreates MOVE work\n(PICK → STAGE → SHIP)

    APPROVED --> CANCELLED : PUT .../cancel\n(pre-SHIPPED only)

    RELEASED --> SHIPPED : Ship confirmed\nInventTrans TRANSFER_ISSUE\nposted

    SHIPPED --> IN_TRANSIT : Atomic with SHIPPED\nGoods on the road

    IN_TRANSIT --> RECEIVED : PUT .../receive\nAll lines received\n(full qty, with loss, or damage)

    RECEIVED --> CLOSED : All lines finalized\nPUTAWAY complete

    note right of CREATED
        Creator inputs:
        source_wh, dest_wh,
        owner, items, qty,
        reason
    end note

    note right of IN_TRANSIT
        IN_TRANSIT inventory:
        - Sits in source TRANSIT location
        - Excluded from billing snapshot
        - Lot preserved (lot_hash excl WH)
    end note

    note right of CANCELLED
        Cancel allowed only
        before SHIPPED.
        No inventory movement
        has occurred yet.
    end note
```

### 3.2 Transfer Line Status

```mermaid
stateDiagram-v2
    [*] --> OPEN : Line created with\nplanned_qty_kg

    OPEN --> PICKED : KEEPER picks from\nsource STORAGE location

    PICKED --> SHIPPED : Ship confirmed\nInventTrans TRANSFER_ISSUE\nshipped_qty_kg recorded

    SHIPPED --> IN_TRANSIT : Atomic with header\nGoods in transit

    IN_TRANSIT --> RECEIVED : received_qty == shipped_qty\nNo variance

    IN_TRANSIT --> WITH_LOSS : received_qty < shipped_qty\nvariance_kg = shipped - received\nADJUSTMENT InventTrans posted

    IN_TRANSIT --> WITH_DAMAGE : damage_qty > 0\nGood qty → AVAILABLE\nDamage qty → DAMAGED status

    RECEIVED --> CLOSED : PUTAWAY completed\nat destination

    WITH_LOSS --> CLOSED : Loss acknowledged\nPUTAWAY of received qty done

    WITH_DAMAGE --> CLOSED : PUTAWAY of good + damage\nqty completed

    note right of WITH_LOSS
        Loss handling:
        - InventTrans #5 ADJUSTMENT
        - reason_code = TRANSIT_LOSS
        - Alert both WH_MANAGERs
        - TRANSIT on_hand → 0
    end note

    note right of WITH_DAMAGE
        Damage handling:
        - Good qty → AVAILABLE
        - Damage qty → DAMAGED
        - Billable but not allocatable
        - Lot preserved for both
    end note
```

---

## 4. InventTrans Posting Diagram

### 4.1 Full Receive (received_qty == shipped_qty)

```mermaid
sequenceDiagram
    autonumber
    participant SRC_STORAGE as Source WH<br/>STORAGE Location
    participant SRC_TRANSIT as Source WH<br/>TRANSIT Location
    participant DEST_RECV as Dest WH<br/>RECV Location
    participant IT as InventTrans
    participant OH as on_hand

    Note over SRC_STORAGE, DEST_RECV: === STEP 4: Ship at Source ===

    rect rgb(255, 243, 224)
        SRC_STORAGE ->> IT: #1 TRANSFER_ISSUE (DEDUCTED)<br/>-shipped_qty from STORAGE
        IT ->> OH: source STORAGE on_hand -= shipped_qty

        SRC_STORAGE ->> IT: #2 TRANSFER_ISSUE (PHYSICAL)<br/>+shipped_qty to TRANSIT
        IT ->> OH: source TRANSIT on_hand += shipped_qty
    end

    Note over SRC_STORAGE, DEST_RECV: Goods in transit (source STORAGE down, source TRANSIT up)

    Note over SRC_STORAGE, DEST_RECV: === STEP 5: Receive at Destination (Full Qty) ===

    rect rgb(232, 245, 233)
        SRC_TRANSIT ->> IT: #3 TRANSFER_RECEIPT (DEDUCTED)<br/>-shipped_qty from TRANSIT
        IT ->> OH: source TRANSIT on_hand -= shipped_qty

        DEST_RECV ->> IT: #4 TRANSFER_RECEIPT (PHYSICAL)<br/>+received_qty to RECV (AVAILABLE)
        IT ->> OH: dest RECV on_hand += received_qty
    end

    Note over SRC_STORAGE, DEST_RECV: Final: source TRANSIT = 0, dest RECV = +received_qty
    Note over SRC_STORAGE, DEST_RECV: Lot preserved cross-warehouse (lot_hash excludes warehouse_id)
```

### 4.2 Partial Receive with Transit Loss (received_qty < shipped_qty)

```mermaid
sequenceDiagram
    autonumber
    participant SRC_STORAGE as Source WH<br/>STORAGE Location
    participant SRC_TRANSIT as Source WH<br/>TRANSIT Location
    participant DEST_RECV as Dest WH<br/>RECV Location
    participant IT as InventTrans
    participant OH as on_hand

    Note over SRC_STORAGE, DEST_RECV: === STEP 4: Ship at Source ===

    rect rgb(255, 243, 224)
        SRC_STORAGE ->> IT: #1 TRANSFER_ISSUE (DEDUCTED)<br/>-shipped_qty from STORAGE
        IT ->> OH: source STORAGE on_hand -= shipped_qty

        SRC_STORAGE ->> IT: #2 TRANSFER_ISSUE (PHYSICAL)<br/>+shipped_qty to TRANSIT
        IT ->> OH: source TRANSIT on_hand += shipped_qty
    end

    Note over SRC_STORAGE, DEST_RECV: Goods in transit

    Note over SRC_STORAGE, DEST_RECV: === STEP 5: Receive at Destination (Partial - Loss) ===

    rect rgb(232, 245, 233)
        SRC_TRANSIT ->> IT: #3 TRANSFER_RECEIPT (DEDUCTED)<br/>-received_qty from TRANSIT<br/>(NOT -shipped_qty)
        IT ->> OH: source TRANSIT on_hand -= received_qty

        DEST_RECV ->> IT: #4 TRANSFER_RECEIPT (PHYSICAL)<br/>+received_qty to RECV (AVAILABLE)
        IT ->> OH: dest RECV on_hand += received_qty
    end

    rect rgb(255, 235, 238)
        Note over SRC_TRANSIT, IT: === Loss Adjustment ===
        SRC_TRANSIT ->> IT: #5 ADJUSTMENT (PHYSICAL)<br/>-loss_qty from TRANSIT<br/>reason_code = TRANSIT_LOSS
        IT ->> OH: source TRANSIT on_hand -= loss_qty<br/>(TRANSIT on_hand now = 0)
    end

    Note over SRC_STORAGE, DEST_RECV: Verification: shipped - received - loss = 0 (TRANSIT cleared)
    Note over SRC_STORAGE, DEST_RECV: Alert: WH_MANAGER of both source and dest warehouses
```

### 4.3 Receive with Damage (damage_qty > 0)

```mermaid
sequenceDiagram
    autonumber
    participant SRC_TRANSIT as Source WH<br/>TRANSIT Location
    participant DEST_RECV as Dest WH<br/>RECV Location
    participant IT as InventTrans
    participant OH as on_hand

    Note over SRC_TRANSIT, OH: Ship transactions (#1, #2) already posted (same as above)

    Note over SRC_TRANSIT, OH: === Receive with Damage ===

    rect rgb(232, 245, 233)
        SRC_TRANSIT ->> IT: #3 TRANSFER_RECEIPT (DEDUCTED)<br/>-shipped_qty from TRANSIT
        IT ->> OH: source TRANSIT on_hand -= shipped_qty<br/>(TRANSIT = 0)

        DEST_RECV ->> IT: #4a TRANSFER_RECEIPT (PHYSICAL)<br/>+good_qty to RECV (AVAILABLE)
        IT ->> OH: dest RECV on_hand += good_qty<br/>status = AVAILABLE

        DEST_RECV ->> IT: #4b TRANSFER_RECEIPT (PHYSICAL)<br/>+damage_qty to RECV (DAMAGED)
        IT ->> OH: dest RECV on_hand += damage_qty<br/>status = DAMAGED
    end

    Note over SRC_TRANSIT, OH: DAMAGED inventory: billable but NOT allocatable
    Note over SRC_TRANSIT, OH: Lot preserved for both good and damaged portions
```

---

## 5. Inventory Balance Verification

### 5.1 Balance at Each Step (Example: shipped = 1000 kg, received = 950 kg, loss = 50 kg)

| Step | Event | Source STORAGE | Source TRANSIT | Dest RECV | System Total | Notes |
|------|-------|---------------|----------------|-----------|-------------|-------|
| 0 | Before transfer | 1000 | 0 | 0 | **1000** | Initial state |
| 1 | Create / Approve / Release | 1000 | 0 | 0 | **1000** | No inventory movement yet |
| 2 | Ship (#1 + #2) | **0** | **1000** | 0 | **1000** | STORAGE -1000, TRANSIT +1000 |
| 3a | Receive - receipt (#3 + #4) | 0 | **50** | **950** | **1000** | TRANSIT -950, RECV +950 |
| 3b | Receive - loss adj (#5) | 0 | **0** | 950 | **950** | TRANSIT -50 (TRANSIT_LOSS) |
| 4 | Final state | **0** | **0** | **950** | **950** | Loss = 50 kg (physical reality) |

### 5.2 Balance Invariants

| Invariant | Formula | Expected |
|-----------|---------|----------|
| TRANSIT clears to zero | `shipped_qty - received_qty - loss_qty` | `= 0` |
| Source STORAGE reduction | `original_on_hand - shipped_qty` | Matches post-ship on_hand |
| Dest RECV addition | `received_qty` | Matches post-receive on_hand |
| System total change | `post_total - pre_total` | `= -loss_qty` (physical loss) |
| Billing exclusion | IN_TRANSIT inventory | Not in `daily_storage_snapshot` |

### 5.3 Full Receive (No Loss) Example: shipped = received = 1000 kg

| Step | Event | Source STORAGE | Source TRANSIT | Dest RECV | System Total |
|------|-------|---------------|----------------|-----------|-------------|
| 0 | Before transfer | 1000 | 0 | 0 | **1000** |
| 1 | Ship (#1 + #2) | **0** | **1000** | 0 | **1000** |
| 2 | Receive (#3 + #4) | 0 | **0** | **1000** | **1000** |

System total preserved: no loss.

---

## 6. Data Flow Table

### 6.1 Transfer Order Lifecycle

| Step | Process | Input | Output | API Endpoint | Validation / Business Rule |
|------|---------|-------|--------|--------------|---------------------------|
| 1 | Create Transfer Order | `{ source_warehouse_id, dest_warehouse_id, owner_id, transfer_reason, lines: [{ item_id, lot_id?, planned_qty_kg }] }` | `transfer_header` (CREATED) + `transfer_line[]` (OPEN) | `POST /api/transfers` | BR-T01: `source_wh != dest_wh`. BR-T02: owner has `owner_warehouse_access` to both warehouses. BR-T03: `planned_qty_kg > 0`. Optional: `lot_id` specified or FIFO selection |
| 2 | Approve Transfer | `{ transfer_id }` | Header status CREATED -> APPROVED | `PUT /api/transfers/{id}/approve` | BR-T04: Caller has WH_MANAGER role for source warehouse. BR-T05: `approver != creator` (4-eyes principle). BR-T06: Re-check `on_hand >= planned_qty` for each line at source STORAGE |
| 3 | Release for Execution | `{ transfer_id }` | Header APPROVED -> RELEASED. Creates `work_header` (MOVE) + `work_line[]` (PICK, STAGE, SHIP) | `PUT /api/transfers/{id}/release` | Work steps created: PICK from source STORAGE, STAGE to staging area, SHIP to shipping dock |
| 4a | Weighbridge at Source (cascading) | `{ document_number: transfer_number, sku, warehouse_code, owner_code, type: OUTBOUND, gross_weight_kg, tare_weight_kg }` per SKU | `weighbridge_log` (COMPLETED). Auto-resolves document_number + sku + warehouse_code + owner_code -> transfer_line. Each COMPLETED log -> `transfer_line.shipped_qty += net_weight_kg` | `POST /api/weighbridge-logs` | N logs per transfer (1 per transfer_line/SKU). OUTBOUND type: gross < tare (loading goods onto truck). Cascading: weigh each SKU separately. Links via `document_number = transfer_number` |
| 4b | Ship at Source | `{ transfer_id }` | Header RELEASED -> SHIPPED -> IN_TRANSIT. Lines -> IN_TRANSIT. InventTrans #1 + #2 posted | `PUT /api/transfers/{id}/ship` | BR-T07: `shipped_qty > 0` (accumulated from weighbridge logs). BR-T08: Two atomic InventTrans posted (TRANSFER_ISSUE DEDUCTED + PHYSICAL) per line |
| 5a | Weighbridge at Destination (cascading) | `{ document_number: transfer_number, sku, warehouse_code, owner_code, type: INBOUND, gross_weight_kg, tare_weight_kg }` per SKU | `weighbridge_log` (COMPLETED). Auto-resolves document_number + sku + warehouse_code + owner_code -> transfer_line. Each COMPLETED log -> `transfer_line.received_qty += net_weight_kg` | `POST /api/weighbridge-logs` | N logs per transfer (1 per transfer_line/SKU). INBOUND type: gross > tare (unloading goods from truck). Cascading: weigh each SKU separately. Links via `document_number = transfer_number` |
| 5b | Receive (Full) | `{ transfer_id, lines: [{ line_id }] }` where `received == shipped` | Lines -> RECEIVED. InventTrans #3 + #4 posted. PUTAWAY work created at dest | `PUT /api/transfers/{id}/receive` | BR-T09: `received_qty == shipped_qty` (received_qty accumulated from weighbridge logs). InventTrans TRANSFER_RECEIPT (DEDUCTED from TRANSIT + PHYSICAL to RECV). Lot preserved cross-WH (`lot_hash` excludes `warehouse_id`) |
| 5c | Receive (with Loss) | `{ transfer_id, lines: [{ line_id }] }` where `received < shipped` | Lines -> WITH_LOSS. InventTrans #3 + #4 + #5 posted. `variance_kg` recorded | `PUT /api/transfers/{id}/receive` | BR-T10: `received_qty < shipped_qty`. #5 ADJUSTMENT (PHYSICAL) for `-loss_qty` from source TRANSIT with `reason_code = TRANSIT_LOSS`. BR-T11: Alert WH_MANAGER of both warehouses |
| 5d | Receive (with Damage) | `{ transfer_id, lines: [{ line_id, damage_qty }] }` where `damage_qty > 0` | Lines -> WITH_DAMAGE. Good qty -> AVAILABLE, Damage qty -> DAMAGED | `PUT /api/transfers/{id}/receive` | BR-T12: `good_qty + damage_qty == received_qty`. Damage qty: billable but not allocatable. Lot preserved for both portions |
| 6 | Cancel | `{ transfer_id, reason }` | Header -> CANCELLED | `PUT /api/transfers/{id}/cancel` | BR-T13: Cancel allowed only before SHIPPED (CREATED, APPROVED, RELEASED). No inventory movement to reverse |

### 6.2 InventTrans Detail

| Txn # | Step | trans_type | physical_status | qty_kg | Location Type | Warehouse | Effect on on_hand |
|-------|------|-----------|----------------|--------|--------------|-----------|------------------|
| #1 | Ship | TRANSFER_ISSUE | DEDUCTED | -shipped_qty | STORAGE | Source | STORAGE -= shipped_qty |
| #2 | Ship | TRANSFER_ISSUE | PHYSICAL | +shipped_qty | TRANSIT | Source | TRANSIT += shipped_qty |
| #3 | Receive | TRANSFER_RECEIPT | DEDUCTED | -received_qty | TRANSIT | Source | TRANSIT -= received_qty |
| #4 | Receive | TRANSFER_RECEIPT | PHYSICAL | +received_qty | RECV | Dest | RECV += received_qty |
| #5 | Receive (loss only) | ADJUSTMENT | PHYSICAL | -loss_qty | TRANSIT | Source | TRANSIT -= loss_qty (to zero) |

---

## 7. Frontend Guide

### 7.1 UI Screens

| Screen | Route | Purpose | Key Components |
|--------|-------|---------|---------------|
| **Transfer Order List** | `/transfers` | View all transfer orders with filters | DataTable with status badge, source/dest WH, owner, created date. Filter by status, warehouse, owner, date range |
| **Create Transfer Order** | `/transfers/create` | Create new transfer with line items | Form: source WH picker, dest WH picker, owner dropdown, reason input. Lines: item selector (with lot picker or FIFO), qty input. Real-time on_hand check |
| **Transfer Detail** | `/transfers/:id` | View transfer with full line detail and history | Header info card, line items table (planned/shipped/received/variance), status timeline, InventTrans audit trail, linked weighbridge logs (N per transfer, 1 per SKU) |
| **Transfer Approval** | `/transfers/:id/approve` | WH_MANAGER approves pending transfers | Approval form with on_hand availability display. Approve/Reject buttons. 4-eyes check (approver != creator shown) |
| **Ship Confirmation** | `/transfers/:id/ship` | Confirm shipment at source warehouse | Cascading weighbridge UI: weigh each SKU separately via `POST /api/weighbridge-logs` (type=OUTBOUND). Each COMPLETED log auto-updates transfer_line.shipped_qty += net_weight_kg. Progress tracker shows weighed/total lines. Confirm button posts TRANSFER_ISSUE |
| **Receive Confirmation** | `/transfers/:id/receive` | Confirm receipt at destination with variance recording | Cascading weighbridge UI: weigh each SKU separately via `POST /api/weighbridge-logs` (type=INBOUND). Each COMPLETED log auto-updates transfer_line.received_qty += net_weight_kg. Progress tracker shows weighed/total lines. Variance auto-calculated (received vs shipped). Loss/damage reason capture. Summary panel showing balance impact |
| **Transfer History** | `/transfers/history` | Historical view of completed/cancelled transfers | Read-only list with full audit. Filter by date range, status (CLOSED, CANCELLED), warehouse, owner |

### 7.2 API Calls per Screen

| Screen | Load (on mount) | User Actions |
|--------|-----------------|-------------|
| Transfer Order List | `GET /api/transfers?page=1&pageSize=20&status=&warehouse_id=&owner_id=` | Navigate to detail: `GET /api/transfers/{id}` |
| Create Transfer Order | `GET /api/warehouses`, `GET /api/owners`, `GET /api/items?owner_id=`, `GET /api/on-hand?warehouse_id=&item_id=` (real-time check) | Submit: `POST /api/transfers` |
| Transfer Detail | `GET /api/transfers/{id}?include=lines,inventTrans,weighbridgeLogs` | Status-dependent action buttons |
| Transfer Approval | `GET /api/transfers/{id}`, `GET /api/on-hand?warehouse_id={source}&item_id=` (per line) | Approve: `PUT /api/transfers/{id}/approve`. Reject: `PUT /api/transfers/{id}/cancel` |
| Ship Confirmation | `GET /api/transfers/{id}` (show lines to weigh) | Weigh each SKU: `POST /api/weighbridge-logs` (type=OUTBOUND, document_number=transfer_number, per SKU). Each COMPLETED log auto-updates shipped_qty. Confirm: `PUT /api/transfers/{id}/ship` |
| Receive Confirmation | `GET /api/transfers/{id}` (show shipped_qty per line) | Weigh each SKU: `POST /api/weighbridge-logs` (type=INBOUND, document_number=transfer_number, per SKU). Each COMPLETED log auto-updates received_qty. Confirm: `PUT /api/transfers/{id}/receive` with `{ lines: [{ line_id, damage_qty? }] }` |

### 7.3 UI Validation (client-side)

| Field | Rule |
|-------|------|
| `source_warehouse_id` | Required. Cannot equal `dest_warehouse_id` |
| `dest_warehouse_id` | Required. Cannot equal `source_warehouse_id` |
| `owner_id` | Required. Must have access to both selected warehouses |
| `planned_qty_kg` | Required. Positive number > 0 |
| `shipped_qty_kg` | Required. Positive number > 0. Default = `planned_qty_kg` |
| `received_qty_kg` | Required. Positive number >= 0. Must be <= `shipped_qty_kg` |
| `damage_qty` | Optional. >= 0. Must be <= `received_qty_kg` |
| `transfer_reason` | Required. Free text, max 500 chars |
| `item_id` per line | Required. Must exist and be active for the selected owner |
| `lot_id` per line | Optional. If specified, must belong to selected item at source WH |

### 7.4 Status-Dependent UI Actions

| Current Status | Available Actions | Button | Visible To |
|---------------|-------------------|--------|-----------|
| CREATED | Approve, Cancel | `Approve` / `Cancel` | WH_MANAGER (source) |
| APPROVED | Release, Cancel | `Release` / `Cancel` | KEEPER / WH_MANAGER |
| RELEASED | Ship | `Confirm Shipment` | KEEPER (source) |
| IN_TRANSIT | Receive | `Confirm Receipt` | KEEPER (dest) |
| RECEIVED | (auto-close) | - | - |
| CLOSED | (read-only) | - | All |
| CANCELLED | (read-only) | - | All |

---

## 8. Backend Guide

### 8.1 Commands (Write Operations)

| Command | Handler | Validation | Side Effects |
|---------|---------|------------|-------------|
| `CreateTransferCommand` | `CreateTransferHandler` | BR-T01: `source_wh != dest_wh`. BR-T02: Owner access to both WH. BR-T03: `qty > 0` per line. Items active and owned by `owner_id`. Optional lot validation | Creates `transfer_header` (CREATED, generates transfer_number) + `transfer_line[]` (OPEN). Audit log |
| `ApproveTransferCommand` | `ApproveTransferHandler` | BR-T04: Caller is WH_MANAGER of source WH. BR-T05: `approver_id != created_by`. BR-T06: `on_hand >= planned_qty` per line at source STORAGE | Updates header CREATED -> APPROVED. Audit log |
| `ReleaseTransferCommand` | `ReleaseTransferHandler` | Header must be APPROVED | Creates `work_header` (type=MOVE) + `work_line[]` (PICK, STAGE, SHIP). Header APPROVED -> RELEASED. Audit log |
| `ShipTransferCommand` | `ShipTransferHandler` | Header must be RELEASED. BR-T07: `shipped_qty > 0` per line (accumulated from weighbridge logs). On_hand sufficient at source STORAGE | Posts InventTrans #1 (TRANSFER_ISSUE DEDUCTED) + #2 (TRANSFER_ISSUE PHYSICAL). Updates header -> IN_TRANSIT, lines -> IN_TRANSIT. Weighbridge logs already linked via document_number = transfer_number. Audit log |
| `ReceiveTransferCommand` | `ReceiveTransferHandler` | Header must be IN_TRANSIT. `received_qty >= 0` (accumulated from weighbridge logs). `damage_qty >= 0`. `damage_qty <= received_qty` | Posts InventTrans #3 + #4. If loss: #5 ADJUSTMENT. Creates PUTAWAY work at dest. Updates line status (RECEIVED / WITH_LOSS / WITH_DAMAGE). If all lines done: header -> RECEIVED -> CLOSED. Weighbridge logs already linked via document_number = transfer_number. Audit log. Loss alert to WH_MANAGERs |
| `CancelTransferCommand` | `CancelTransferHandler` | BR-T13: Status must be CREATED, APPROVED, or RELEASED. No inventory posted yet | Header -> CANCELLED. Cancel any open work. Audit log |

### 8.2 Queries (Read Operations)

| Query | Handler | Returns | Filters |
|-------|---------|---------|---------|
| `ListTransfersQuery` | `ListTransfersHandler` | Paginated `TransferHeaderDto[]` | `status`, `source_warehouse_id`, `dest_warehouse_id`, `owner_id`, `date_range`, `search` (transfer_number) |
| `GetTransferByIdQuery` | `GetTransferByIdHandler` | `TransferDetailDto` (header + lines + inventTrans + work + weighbridge_logs[]) | - |
| `GetTransferHistoryQuery` | `GetTransferHistoryHandler` | Paginated `TransferHeaderDto[]` (CLOSED/CANCELLED) | `date_range`, `warehouse_id`, `owner_id` |

### 8.3 Validation Rules Summary

| Rule ID | Rule | Applies To | Error Code |
|---------|------|-----------|------------|
| BR-T01 | Source warehouse must not equal destination warehouse | `CreateTransferCommand` | `SAME_SOURCE_DEST_WAREHOUSE` |
| BR-T02 | Owner must have `owner_warehouse_access` to both source and destination warehouses | `CreateTransferCommand` | `OWNER_NO_WAREHOUSE_ACCESS` |
| BR-T03 | `planned_qty_kg` must be > 0 for each line | `CreateTransferCommand` | `INVALID_QUANTITY` |
| BR-T04 | Approver must hold WH_MANAGER role for the source warehouse | `ApproveTransferCommand` | `INSUFFICIENT_ROLE` |
| BR-T05 | Approver must not be the same user as the creator (4-eyes principle) | `ApproveTransferCommand` | `FOUR_EYES_VIOLATION` |
| BR-T06 | Source warehouse must have sufficient `on_hand` (>= planned_qty) in STORAGE locations per line | `ApproveTransferCommand` | `INSUFFICIENT_ON_HAND` |
| BR-T07 | `shipped_qty_kg` must be > 0 for each line (accumulated from OUTBOUND weighbridge logs) | `ShipTransferCommand` | `INVALID_SHIPPED_QUANTITY` |
| BR-T08 | Ship must atomically post both TRANSFER_ISSUE transactions (#1 DEDUCTED + #2 PHYSICAL) | `ShipTransferCommand` | N/A (enforced by transaction scope) |
| BR-T09 | Full receive: `received_qty == shipped_qty` implies line status = RECEIVED | `ReceiveTransferCommand` | N/A (auto-determined) |
| BR-T10 | Transit loss: `received_qty < shipped_qty` triggers ADJUSTMENT InventTrans (#5) with `reason_code = TRANSIT_LOSS` | `ReceiveTransferCommand` | N/A (auto-determined) |
| BR-T11 | Transit loss must trigger alert to WH_MANAGER of both source and destination warehouses | `ReceiveTransferCommand` | N/A (side effect) |
| BR-T12 | `good_qty + damage_qty` must equal `received_qty`; damage inventory gets DAMAGED status (billable, not allocatable) | `ReceiveTransferCommand` | `DAMAGE_QTY_MISMATCH` |
| BR-T13 | Cancel allowed only in pre-SHIPPED states (CREATED, APPROVED, RELEASED) | `CancelTransferCommand` | `CANNOT_CANCEL_AFTER_SHIP` |

### 8.4 Cross-Module Integration

| Integration Point | Module | Direction | Details |
|-------------------|--------|-----------|---------|
| On-hand validation | Inventory Core | Transfer reads | Check `on_hand >= planned_qty` at source STORAGE during approve |
| InventTrans posting | Inventory Core | Transfer writes | 4-5 InventTrans records per complete transfer (TRANSFER_ISSUE x2, TRANSFER_RECEIPT x2, optional ADJUSTMENT) |
| Lot preservation | Master Data (Lot) | Transfer reads | `lot_hash` excludes `warehouse_id`, enabling same lot to exist at both source and dest warehouse |
| MOVE work creation | Work Management | Transfer writes | Creates `work_header` (type=MOVE) with PICK -> STAGE -> SHIP steps at source; PUTAWAY work at dest after receive |
| Weighbridge | Weighbridge Module | Weighbridge writes -> Transfer | N `weighbridge_log` records per transfer (1 per transfer_line/SKU). Linked via `document_number = transfer_number`. Each log auto-resolves: document_number + sku + warehouse_code + owner_code -> transfer_line. OUTBOUND at source (shipped_qty += net_weight_kg), INBOUND at destination (received_qty += net_weight_kg). API: `POST /api/weighbridge-logs` (shared endpoint) |
| Billing exclusion | Billing Module | Billing reads | Inventory with IN_TRANSIT status at TRANSIT location is excluded from `daily_storage_snapshot` (not billable during transit) |
| Loss alerting | Notification | Transfer writes | Transit loss triggers alert to WH_MANAGER of both warehouses with loss details and reason code |

### 8.5 Database Transaction Boundaries

| Operation | Transaction Scope | Reason |
|-----------|------------------|--------|
| Weighbridge (per SKU) | Single DB transaction per weighbridge_log: resolve transfer_line + update shipped_qty or received_qty += net_weight_kg | Each log independently resolves and updates its transfer_line; cascading approach (1 log per SKU) |
| Ship | Single DB transaction wrapping: InventTrans #1 + #2 + header/line status update | Atomic: either both STORAGE deducted and TRANSIT credited, or neither. shipped_qty already accumulated from OUTBOUND weighbridge logs |
| Receive (full) | Single DB transaction wrapping: InventTrans #3 + #4 + header/line status + PUTAWAY work creation | Atomic: TRANSIT cleared and RECV credited together. received_qty already accumulated from INBOUND weighbridge logs |
| Receive (with loss) | Single DB transaction wrapping: InventTrans #3 + #4 + #5 + header/line status + PUTAWAY work | Atomic: ensures TRANSIT location always clears to zero |
| Cancel | Single DB transaction: header status + cancel open work lines | No inventory to reverse; only status changes |
