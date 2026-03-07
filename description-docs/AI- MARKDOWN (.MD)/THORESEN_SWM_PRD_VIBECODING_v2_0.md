**THORESEN VINAMA LOGISTICS**

Smart Warehouse Management (SWM)

**Product Requirements Document**

Optimized for AI-Assisted Development (Vibe Coding)

Version 4.0 (PRD v2.0) | March 2026 | Draft for Dev Team + AI Agents

Domain: Supply Chain · Warehouse & Yard · Bulk Cargo · Billing

---

# CHANGE LOG: v3.0 → v4.0 (PRD v2.0)

| # | Section | Thay đổi | Nguồn / TC liên quan |
|---|---------|----------|---------------------|
| 1 | **6. Inbound** | BỎ PENDING_APPROVAL. Vượt tolerance → REJECTED (báo lỗi, không ghi nhận). Thêm REJECTED state. | TC-06 [TVL CONFIRMED] |
| 2 | **6. Inbound** | Thêm RE-WEIGH flow: REJECTED → AWAITING_WEIGHING (cân lại). Giữ receipt number. Max 3 attempts. | TC-18 [TVL CONFIRMED] |
| 3 | **6. Inbound** | Cho phép cancel ở WEIGHED_IN / PROCESSING. Bắt buộc reason_code + audit. | TC-13 [TVL CONFIRMED] |
| 4 | **6. Inbound** | PUTAWAY tách riêng + auto-transition nếu location đã là STORAGE (bulk cargo). | TC-14 [TVL CONFIRMED] |
| 5 | **6. Inbound** | Blocking hàng bao nhập = PO level (chặn tổng PO). | TC-12 [TVL CONFIRMED] |
| 6 | **7. Outbound** | Weighing sequence FLEXIBLE — Keeper chọn tự do thứ tự cân lines. | TC-09 [TVL CONFIRMED] |
| 7 | **7. Outbound** | Line fail tolerance → cả shipment PENDING_APPROVAL (tập trung cuối). | TC-10 [TVL CONFIRMED] |
| 8 | **7. Outbound** | Bulk surplus → BLOCK mặc định. Manager override. | TC-11 [TVL CONFIRMED] |
| 9 | **7. Outbound** | Thêm Sale Order state machine chi tiết. Thêm Retry Loop tại trạm cân. | Outbound Analysis v1.0 |
| 10 | **7. Outbound** | Thêm bảng weighing_attempt tracking mỗi lần cân. | Outbound Analysis v1.0 |
| 11 | **4. Master Data** | Thêm 9 entity tables mới: InventDim, OnHand, InventTrans, WorkHeader, WorkLine, InventoryStatus, NumberSequence, LPN (deferred). | MasterData PRD v2.1 |
| 12 | **5. Data Model** | Thay thế Inventory_Transaction bằng InventTrans schema theo D365 reference. Thêm InventDim, OnHand. | MasterData PRD v2.1, State Machine v3.1 |
| 13 | **5. Data Model** | Thêm InventTrans Stage Lifecycle + Posting Point rules. | State Machine v3.1 |
| 14 | **8. Inventory** | Cập nhật On-Hand formula theo OnHand table mới (available = physical - reserved). No reservation (Available = Physical). | CFM-05 |
| 15 | **15. Business Rules** | Mở rộng từ 15 → 77 rules (tham chiếu BRD v1.0). | BRD v1.0 |
| 16 | **18. Assumptions** | Cập nhật: 12 Confirmed + 14 Assumptions + 18 To-Confirm = 44 items. | Assumptions Register v1.0 |
| 17 | **Toàn bộ** | Áp dụng 18 TVL Confirmed decisions + 12 Gap Analysis QA decisions. | All TC + CFM items |

---

# TABLE OF CONTENTS

1. PROJECT CONTEXT
2. SYSTEM ARCHITECTURE
3. ROLES & PERMISSIONS (RBAC)
4. MASTER DATA MODULE (Updated — 9 new entities)
5. DATA MODEL (Updated — InventTrans/InventDim/OnHand)
6. INBOUND MODULE (Updated — REJECTED + Re-weigh)
7. OUTBOUND MODULE (Updated — Flexible weighing + Retry loop)
8. INVENTORY MODULE (Updated — OnHand formula)
9. VAS & PRODUCTION MODULE (Bagging)
10. BILLING MODULE
11. INTEGRATION & IoT MODULE
12. REPORTS & DASHBOARD
13. API ENDPOINTS (Summary)
14. UI SCREENS LIST
15. BUSINESS RULES REGISTRY (Updated — 77 rules)
16. NON-FUNCTIONAL REQUIREMENTS
17. GLOSSARY
18. ASSUMPTIONS & TO-CONFIRM (Updated — 44 items)

---

# 1. PROJECT CONTEXT

## 1.1 Client Profile

**Company:** Thoresen Vinama Logistics (TVL)

**Scale:** Large-scale logistics, yard & warehouse management

**Core Operation:** Receive bulk cargo from sea ports → Store in Open Yard / Covered Warehouse → Distribute domestically

**Cargo Type:** Primarily Bulk Cargo (hàng rời/hàng xá) + Bagged goods (post-bagging VAS)

**Warehouse:** ~81,500 m² total (11 warehouses: WH5.1 → WH5.6.2)

## 1.2 Key Business Characteristics

- NO barcode/RFID on cargo → Weight determined entirely by weighbridge
- Weight tolerances between inbound/outbound must be managed (shrinkage)
- Dual inbound flows: Vessel (B/L-based) + Standard (pre-registered vehicles)
- All revenue depends on accurate Billing System fed by Atomic Transaction Logs (InventTrans)
- **[NEW v4.0]** Inbound tolerance violation → REJECTED (không dùng approval). Xe cân lại hoặc hủy.
- **[NEW v4.0]** Outbound multi-trip weighing: Keeper chọn tự do thứ tự lines. Blocking = retry loop tại trạm cân.

## 1.3 Revenue Streams (Fee Types)

| **Fee Group** | **Description** | **Trigger** |
|---|---|---|
| Storage Fee | Dynamic daily calculation based on EOD inventory snapshot | Period-based (daily batch) |
| Handling Fee | Per-event based on inbound/outbound operations | Event-based (on receipt/ship) |
| Bagging Fee | VAS packaging services + materials | Event-based (WO completion) |
| Other Fees | Blending, internal transfer, rework, QA, etc. | Manual or event-based |

## 1.4 In-Scope (Go-Live)

- Web Admin Portal (desktop)
- Mobile App (Android/iOS or Web Mobile) for warehouse floor operations
- Weighbridge integration (Local Edge Agent)
- Full billing cycle: setup → auto-capture → debit note → lock
- OCR for port delivery notes
- 2D Layout map for warehouse locations
- Dashboard with capacity & aging charts
- Reports: Inbound, Outbound, Inventory, Shrinkage
- **[NEW v4.0]** Full Work model (WorkHeader/WorkLine) — không dùng simplified pick_task [CFM-06]
- **[NEW v4.0]** Inter-warehouse Transfer module [CFM-03]

## 1.5 Out-of-Scope (Phase 1)

- Full ERP accounting integration (deferred, sync interface only)
- Multi-currency billing
- Cross-dock operations
- RFID/Barcode for cargo
- **[NEW v4.0]** LPN/Pallet tracking → DEFERRED Phase 2 [CFM-04]
- **[NEW v4.0]** Batch/Lot tracking → OFF Phase 1 [CFM-09]
- **[NEW v4.0]** Credit Note workflow → Phase 2 [TC-17]
- **[NEW v4.0]** ALPR camera → Phase 2, Go-Live dùng nhập tay biển số [TC-16]

---

# 2. SYSTEM ARCHITECTURE

## 2.1 Modules Overview

The SWM system is structured into 6 business modules + 1 integration module:

| **Module** | **Key Responsibilities** |
|---|---|
| Master Data | Owner, Product/SKU, Warehouse, Location, Vehicle Type, Reason Code, Rate Card Engine, **[NEW] InventDim, OnHand, InventoryStatus, NumberSequence** |
| Inbound | PO, ASN/Receipt, Weighbridge In, Putaway, OCR scan, Vessel + Standard flows, **[NEW] REJECTED + Re-weigh flow** |
| Outbound | Sale Order, Shipment, Allocation, Picking, Loading, Weighbridge Out, Container Stuffing, Split, **[NEW] Flexible weighing + Retry loop** |
| Inventory | On-hand tracking, Movement ledger, Move/Transfer, Status change, Cycle count, Adjustment, **[NEW] InventTrans ledger** |
| VAS / Bagging | Bagging Work Orders, BOM consumption, Packaging ownership (TVL/Client), Multi-session progress |
| Billing | Fee setup, Contract/Rate card, Day type config, Auto-capture, Debit Note, Lock, Export Excel |
| Integration & IoT | Weighbridge Local Agent (COM port), Mobile App sync, OCR, ERP sync (one-way push), **[NEW] Work Execution (WorkHeader/WorkLine)** |

## 2.2 Tech Stack Recommendation

| **Layer** | **Technology** |
|---|---|
| Frontend Web | React / Next.js + TailwindCSS |
| Mobile App | React Native / Flutter OR Progressive Web App |
| Backend API | Node.js (NestJS) or Python (FastAPI) |
| Database | PostgreSQL (primary) + Redis (cache/queue) |
| Weighbridge Agent | Local service (Electron/Python) reading COM port → WebSocket/REST |
| OCR | Cloud OCR service or Tesseract |
| File Storage | S3-compatible for documents, photos |
| Auth | JWT + RBAC middleware |
| Batch Jobs | Cron-based or message queue (EOD snapshot, billing calc) |

---

# 3. ROLES & PERMISSIONS (RBAC)

| **Role** | **Code** | **Web** | **App** | **Key Permissions** |
|---|---|---|---|---|
| System Admin | ADMIN | ✓ | ✓ | Full system config, user management |
| Warehouse Manager | WH_MANAGER | ✓ | ✓ | **[UPDATED]** Approve outbound exceptions, manual weight, cancel inbound at WEIGHED_IN/PROCESSING, force approve outbound. **BỎ** approve inbound tolerance. |
| Warehouse Keeper | WH_KEEPER | ✓ | ✓ | Receive, putaway, pick, pack, ship, cycle count, move. **[NEW]** Self-claim work trên mobile [CFM-12]. |
| Weighbridge Operator | WB_OPERATOR | ✓ | ✓ | Weigh in/out, OCR scan, view ASN, **[NEW]** initiate re-weigh |
| Billing Officer | BILLING_OFC | ✓ | --- | Setup rate card, generate debit note, lock billing |
| Customer Viewer | CUST_VIEWER | ✓ | --- | View inventory, reports for own cargo only |
| Ops Supervisor | OPS_SUPER | ✓ | ✓ | View dashboard, approve work orders, all reports |

### Permission Matrix (Key Actions)

| **Action** | **ADMIN** | **WH_MGR** | **WH_KEEPER** | **WB_OP** | **BILLING** |
|---|---|---|---|---|---|
| Manual weight entry | --- | ✓ | --- | --- | --- |
| **[REMOVED]** ~~Approve inbound tolerance~~ | --- | ~~✓~~ | --- | --- | --- |
| **[NEW]** Cancel at WEIGHED_IN/PROCESSING | --- | ✓ | --- | --- | --- |
| **[NEW]** Force approve outbound shipment | --- | ✓ | --- | --- | --- |
| **[NEW]** Initiate Re-weigh (inbound) | --- | --- | --- | ✓ | --- |
| Create/Edit Rate Card | ✓ | --- | --- | --- | ✓ |
| Lock Debit Note | --- | --- | --- | --- | ✓ |
| Inventory Adjustment | --- | ✓ | --- | --- | --- |
| Create PO/ASN | ✓ | ✓ | ✓ | --- | --- |
| Putaway / Pick | --- | ✓ | ✓ | --- | --- |

---

# 4. MASTER DATA MODULE

## 4.1 Owner (Chủ hàng)

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | string | UNIQUE, NOT NULL | e.g. "TVL", "CUST001" |
| name | string | NOT NULL | Full name |
| short_name | string | | Short display name |
| tax_code | string | | Tax ID |
| contact_person | string | | Contact name |
| phone | string | | Phone number |
| email | string | | Email address |
| is_active | boolean | DEFAULT true | Active flag |

## 4.2 Product / SKU (Hàng hóa)

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | string | UNIQUE, NOT NULL | e.g. "CASSAVA_BULK" |
| name | string | NOT NULL | Product name |
| product_group | string | | BULK, BAGGED, PACKAGING |
| uom | enum | | KG, MT, BAG, PIECE |
| density | decimal | | tấn/m³ for capacity calc |
| cargo_form | enum | | BULK, BAGGED_25/40/50KG, JUMBO, PACKAGING |
| is_packaging | boolean | DEFAULT false | True = bao bì for VAS |
| owner_id | UUID FK | NULLABLE | NULL = shared product |
| **[NEW]** bag_shell_weight_kg | decimal | NULLABLE | **[TC-08 CONFIRMED]** Trọng lượng vỏ bao. Fixed per product. Dùng cho tolerance tính dung sai bao xuất. |
| **[NEW]** reservation_policy | enum | DEFAULT 'FIFO' | FIFO, FEFO, MANUAL. Cho allocation engine. |
| **[NEW]** default_inventory_status | enum | DEFAULT 'AVAILABLE' | Trạng thái mặc định khi receipt. 4 options: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT |

## 4.3 Warehouse

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | string | UNIQUE, NOT NULL | e.g. "WH5.1" |
| name | string | NOT NULL | Warehouse name |
| type | enum | | COVERED, OPEN_YARD |
| total_area_m2 | decimal | | Total area in m² |
| max_capacity_mt | decimal | | Max capacity in MT |

## 4.4 Location (Vị trí)

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | string | UNIQUE, NOT NULL | e.g. "WH5.1-A" |
| warehouse_id | UUID FK | NOT NULL | → Warehouse |
| zone | string | | e.g. "ZONE_A" |
| type | enum | | STORAGE, STAGING, RECEIVING, SHIPPING |
| area_m2 | decimal | | Area in m² |
| max_height_m | decimal | | Max stack height |
| capacity_mt | decimal | | = area × height × density × 1.10 |
| current_occupancy_mt | decimal | DEFAULT 0 | Current usage |
| x_coord, y_coord | decimal | | For 2D layout rendering |

**Capacity Formula:** capacity_mt = area_m2 × max_height_m × density × 1.10 (10% tolerance buffer)

## 4.5 Vehicle Type

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | enum | | TRUCK_BULK, CONTAINER_20FT/40FT/40HC |
| name | string | | Display name |
| default_tare_weight | decimal | | Default tare in kg |

## 4.6 Reason Code

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Primary key |
| code | string | UNIQUE | Code identifier |
| category | enum | | MANUAL_WEIGHT, TOLERANCE_OVERRIDE, ADJUSTMENT, SHRINKAGE, DAMAGE, CANCEL, OTHER |
| description | string | | Reason description |

## 4.7 [NEW v4.0] Inventory Dimension (invent_dim)

> **CRITICAL:** Đây là entity quan trọng nhất bổ sung v4.0. Không có InventDim, hệ thống KHÔNG THỂ track tồn kho theo đa chiều.
> **[TVL CONFIRMED]** Phase 1: Site + Warehouse + Location + Owner + Status. Batch/Lot = OFF.

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Mỗi tổ hợp dimension duy nhất = 1 InventDimId |
| dim_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 hash — check duplicate nhanh |
| site_id | VARCHAR(10) | NOT NULL, DEFAULT 'TVL-SITE' | TVL chỉ có 1 site |
| warehouse_id | VARCHAR(10) | FK → warehouse, NOT NULL | Mã kho |
| location_id | VARCHAR(30) | FK → location, NULLABLE | NULL khi chưa xác định vị trí |
| batch_id | VARCHAR(50) | NULLABLE | **[TVL CONFIRMED]** Phase 1: OFF — luôn NULL |
| serial_id | VARCHAR(50) | NULLABLE | Không dùng cho bulk cargo |
| inventory_status | ENUM | NOT NULL, DEFAULT 'AVAILABLE' | **[TVL CONFIRMED]** 4 status: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT |
| owner_id | VARCHAR(20) | FK → owner, NOT NULL | Chủ hàng (bắt buộc — 3PL) |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**UNIQUE constraint:** (site_id, warehouse_id, location_id, batch_id, serial_id, inventory_status, owner_id) — hoặc dim_hash equivalent.

## 4.8 [NEW v4.0] On-Hand (on_hand)

> Real-time stock tracking theo Item + Dimension. **available = physical - reserved.**
> **[TVL CONFIRMED — CFM-05]** Không reservation → available = physical.

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | |
| item_id | VARCHAR(50) | FK → item, NOT NULL | SKU |
| invent_dim_id | UUID | FK → invent_dim, NOT NULL | Dimension |
| physical_qty | DECIMAL(15,3) | DEFAULT 0, NOT NULL | Tồn thực tế (đã post PHYSICAL) |
| reserved_qty | DECIMAL(15,3) | DEFAULT 0, NOT NULL | **[TVL: luôn 0 — không reservation]** |
| available_qty | DECIMAL(15,3) | DEFAULT 0, NOT NULL | = physical - reserved. **TVL: = physical** |
| ordered_qty | DECIMAL(15,3) | DEFAULT 0, NOT NULL | Dự kiến (EXPECTED stage) |
| blocked_qty | DECIMAL(15,3) | DEFAULT 0, NOT NULL | Hàng bị block |
| owner_id | VARCHAR(20) | FK → owner, NOT NULL | Chủ hàng |
| last_movement_at | TIMESTAMPTZ | | Lần biến động cuối |

**UNIQUE:** (item_id, invent_dim_id) — 1 record per SKU per dimension.

**Reconciliation Rule:** physical_qty = SUM(invent_trans.qty WHERE stage=PHYSICAL AND item AND dim)

## 4.9 [NEW v4.0] Inventory Status (inventory_status)

**[TVL CONFIRMED]** 4 status Go-Live. QC_HOLD đã BỎ.

| **Status** | **Mô tả** | **Allocatable?** | **Billable Storage?** |
|---|---|---|---|
| AVAILABLE | Hàng sẵn sàng | ✓ | ✓ |
| DAMAGED | Hàng hư hỏng | ✗ | Configurable per owner |
| BLOCKED | Hàng bị khóa (dispute, kiểm tra) | ✗ | Configurable per owner |
| IN_TRANSIT | Hàng đang di chuyển (inter-warehouse transfer) | ✗ | ✗ |

## 4.10 [NEW v4.0] Number Sequence (number_sequence)

**[TVL CONFIRMED]** Scope = PER_WAREHOUSE. Mỗi kho counter riêng.

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | |
| sequence_code | VARCHAR(20) | UNIQUE, NOT NULL | 'RCV', 'SHP', 'WRK', 'TRF', 'ADJ', 'TRX', 'INV' |
| prefix | VARCHAR(10) | NOT NULL | Tiền tố |
| separator | VARCHAR(1) | DEFAULT '-' | Ký tự ngăn cách |
| date_format | VARCHAR(20) | DEFAULT 'YYYYMMDD' | |
| sequence_length | INTEGER | DEFAULT 6 | Zero-padded |
| current_date | DATE | NOT NULL | Reset value khi ngày đổi |
| current_value | INTEGER | DEFAULT 0 | Tăng 1 mỗi lần generate |
| scope_type | ENUM | DEFAULT 'PER_WAREHOUSE' | PER_WAREHOUSE / GLOBAL / PER_OWNER |
| scope_value | VARCHAR(20) | NOT NULL | = warehouse_code |
| is_active | BOOLEAN | DEFAULT TRUE | |

**Output format:** PREFIX-DATE-SEQNUM → VD: RCV-20260315-000001

---

# 5. DATA MODEL (Logical Schema)

## 5.1 [UPDATED v4.0] InventTrans (Inventory Transaction Ledger — Single Source of Truth)

> **[THAY THẾ]** Section cũ "Inventory_Transaction" được thay thế bằng InventTrans schema theo D365 reference.
> Mọi physical stock change PHẢI tạo 1 InventTrans record. Đây là foundation cho billing + audit.

### Design Rules (bắt buộc)

1. **Rule 1:** KHÔNG cập nhật OnHand trực tiếp. Luôn thông qua InventTrans event.
2. **Rule 2:** Mỗi WorkLine.complete PHẢI tạo 1 InventTrans.
3. **Rule 3:** external_id BẮT BUỘC check trước khi insert (idempotency).
4. **[TVL CONFIRMED] Rule 4:** Posting points: Inbound = RECEIVED state. Outbound = SHIPPED state. Các state trung gian KHÔNG tạo InventTrans stage=PHYSICAL.
5. **Rule 5:** KHÔNG BAO GIỜ xóa InventTrans. Reverse = tạo trans mới với qty ngược lại.

### Schema

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | Khóa chính tự động |
| trans_id | VARCHAR(30) | UNIQUE | TRX-YYYYMMDD-SEQ |
| posted_at | TIMESTAMPTZ | NOT NULL | Thời điểm post. Immutable |
| ref_type | ENUM | NOT NULL | PO, ASN, SO, SHIPMENT, TRANSFER, ADJUSTMENT, CYCLE_COUNT, STATUS_CHANGE, MOVE |
| ref_id | VARCHAR(30) | NOT NULL | Mã chứng từ gốc (Header ID) |
| ref_line_id | VARCHAR(30) | NULLABLE | **[TVL CONFIRMED: per line]** Mã dòng chứng từ |
| external_id | VARCHAR(50) | NULLABLE | Idempotency check |
| item_id | VARCHAR(50) | FK → item | 1 InventTrans = 1 SKU |
| qty | DECIMAL(15,3) | NOT NULL | DƯƠNG = nhận vào. ÂM = xuất ra |
| uom | VARCHAR(10) | DEFAULT 'KG' | |
| dim_from_id | UUID | FK → invent_dim | Dimension xuất. NULL cho receipt |
| dim_to_id | UUID | FK → invent_dim | Dimension nhập. NULL cho issue |
| status_from | ENUM | NULLABLE | ORDERED/REGISTERED/AVAILABLE/RESERVED/PICKED/DAMAGED/BLOCKED/IN_TRANSIT |
| status_to | ENUM | NOT NULL | Trạng thái sau |
| stage | ENUM | NOT NULL | EXPECTED / REGISTERED / PHYSICAL / DEDUCTED / CANCELLED |
| reason_code | VARCHAR(20) | NULLABLE | BẮT BUỘC cho ADJUSTMENT, STATUS_CHANGE |
| owner_id | VARCHAR(20) | FK → owner | Chủ hàng |
| weighbridge_ticket_id | VARCHAR(30) | NULLABLE | Link phiếu cân (TVL bulk cargo) |
| is_reversed | BOOLEAN | DEFAULT FALSE | |
| reversed_by_trans_id | VARCHAR(30) | NULLABLE | Link 2 chiều với trans reverse |

### InventTrans Stage Lifecycle

| **Stage** | **Ý nghĩa** | **Ảnh hưởng OnHand** | **Inbound** | **Outbound** |
|---|---|---|---|---|
| EXPECTED | Dự kiến (demand/supply) | ordered_qty only | PO Confirm (optional P1) | SO/Shipment Confirm |
| REGISTERED | Đã đăng ký (reservation) | reserved_qty | ASN Register (optional) | Allocate (FIFO) |
| **PHYSICAL** | **Đã thực hiện vật lý** | **physical_qty + available_qty** | **RECEIVED state ★** | **SHIPPED state ★** |
| DEDUCTED | Đã trừ cuối cùng | N/A | N/A | Final stage sau SHIPPED |
| CANCELLED | Đã hủy / reversal | Reverse tương ứng | Cancel + reversal | Cancel + release alloc |

**TVL Go-Live:** Skip EXPECTED/REGISTERED cho Inbound. Post thẳng PHYSICAL tại RECEIVED.

## 5.2 Daily_Storage_Snapshot (EOD Batch Job)

Batch job runs at 23:59 daily. Captures inventory state for billing.

| **Field** | **Type** | **Description** |
|---|---|---|
| snapshot_date | DATE | Date of snapshot |
| owner_id | UUID FK | Cargo owner |
| product_id | UUID FK | Product |
| location_id | UUID FK | Location |
| zone | VARCHAR(50) | Zone grouping |
| lot_number | VARCHAR(100) | Lot |
| opening_qty_kg | DECIMAL(15,3) | Tồn đầu ngày |
| inbound_qty_kg | DECIMAL(15,3) | Nhập trong ngày |
| outbound_qty_kg | DECIMAL(15,3) | Xuất trong ngày |
| closing_qty_kg | DECIMAL(15,3) | Tồn cuối ngày |
| storage_days | INTEGER DEFAULT 1 | Always 1 per row |

**Billing Formula:** billable_qty = opening_qty + inbound_qty

## 5.3 Weighbridge_Log

| **Field** | **Type** | **Description** |
|---|---|---|
| id | UUID PK | Auto-generated |
| receipt_id / shipment_id | UUID FK | Linked document |
| direction | ENUM | INBOUND or OUTBOUND |
| vehicle_number | VARCHAR(20) | License plate |
| gross_weight_kg | DECIMAL(12,3) | Loaded weight |
| tare_weight_kg | DECIMAL(12,3) | Empty weight |
| net_weight_kg | DECIMAL(12,3) | = gross − tare |
| is_manual_entry | BOOLEAN | Manual override flag |
| manual_reason_code | VARCHAR(50) FK | Reason for manual |
| approved_by | UUID FK | Manager who approved |
| status | ENUM | WEIGH_IN, WEIGH_OUT, COMPLETED, CANCELLED |
| **[NEW]** attempt_number | INTEGER | DEFAULT 1. Tăng mỗi lần re-weigh [TC-18] |
| photos | JSONB | ALPR + cargo photos |

## 5.4 Key Inbound Tables

purchase_order (PO/BL) → inbound_receipt (ASN) → inbound_receipt_line (items)

| **Table** | **Key Fields** | **Statuses** |
|---|---|---|
| purchase_order | po_number, owner_id, bl_number, vessel_name, po_type (VESSEL/CUSTOMER/CONSIGNED_PACKAGING), expected_qty_kg | DRAFT → CONFIRMED → PARTIALLY_RECEIVED → FULLY_RECEIVED → CLOSED |
| inbound_receipt | receipt_number, po_id, receipt_type, vehicle_number, expected/received_qty, variance_pct, tolerance_pct, to_location_id, lot_number, **[NEW]** attempt_number, max_reweigh_attempts | DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED/**[NEW]** REJECTED → PUTAWAY → CLOSED |
| inbound_receipt_line | receipt_id, product_id, expected/received_qty, location_id, lot_number, bag_count | PENDING → PARTIAL → RECEIVED → PUTAWAY |

## 5.5 Key Outbound Tables

sale_order (SO/RO) → shipment_order (DO) → shipment_line → allocation → pick_task

| **Table** | **Key Fields** | **Statuses** |
|---|---|---|
| sale_order | so_number, owner_id, order_type, expected_qty_kg | **[UPDATED]** DRAFT → CONFIRMED → PARTIALLY_RELEASED → FULLY_RELEASED → SHIPPED → CLOSED / CANCELLED |
| shipment_order | shipment_number, sale_order_id, vehicle_number, driver_name, expected/allocated/picked/shipped qty | **[UPDATED]** DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → WEIGHING_TARE → LOADING → WEIGHING_IN_PROGRESS → ALL_WEIGHED → SHIPPED / PENDING_APPROVAL → CLOSED |
| shipment_line | shipment_id, product_id, from_location_id, lot, cargo_form, bag_count | **[UPDATED]** PENDING → ALLOCATED → PICKING → PICKED → LOADING → WEIGHING_GROSS_N → LINE_SHIPPED / WEIGHING_RETRY |
| allocation | shipment_line_id, location_id, product_id, lot, allocated_qty | ALLOCATED → PICKED → RELEASED |
| pick_task | shipment_line_id, from_location_id, assigned/picked qty, assigned_to | PENDING → IN_PROGRESS → COMPLETED |

## 5.6 [NEW v4.0] Weighing Attempt (weighing_attempt)

> Track mỗi lần cân outbound. Hỗ trợ retry loop + audit.

| **Field** | **Type** | **Description** |
|---|---|---|
| id | UUID PK | |
| shipment_line_id | UUID FK | Line cân |
| attempt_number | INTEGER | Lần cân thứ N |
| gross_weight_kg | DECIMAL(12,3) | |
| gross_previous_kg | DECIMAL(12,3) | Gross trước đó (tare hoặc line trước) |
| net_weight_kg | DECIMAL(12,3) | = gross - gross_previous |
| result | ENUM | PASS / FAIL_BULK_BLOCKING / FAIL_BAG_TOLERANCE / FAIL_OTHER |
| fail_reason | TEXT | Chi tiết lỗi |
| bag_count | INTEGER | Số bao (nếu hàng bao) |
| approved_by | UUID FK | Manager force approve |
| reason_code | VARCHAR(20) FK | Lý do force approve |
| scale_device_id | VARCHAR(50) | ID trạm cân |
| created_at | TIMESTAMPTZ | Thời điểm cân |

## 5.7 [NEW v4.0] Work Tables

**[TVL CONFIRMED — CFM-06]** Phase 1 CẦN Work model đầy đủ.
**[TVL CONFIRMED — CFM-12]** Self-Claim — nhân viên tự nhận work.

### work_header

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| work_id | VARCHAR(30) | PK | WRK-YYYYMMDD-SEQ |
| work_type | ENUM | NOT NULL | PUTAWAY, PICK, MOVE, CYCLE_COUNT, TRANSFER |
| status | ENUM | NOT NULL | OPEN → IN_PROGRESS → COMPLETED / CANCELLED |
| priority | INTEGER | DEFAULT 50 | 1=highest |
| warehouse_id | VARCHAR(10) | FK → warehouse | |
| owner_id | VARCHAR(20) | FK → owner | |
| ref_type | ENUM | | Source: ASN, SHIPMENT, TRANSFER, ADJUSTMENT |
| ref_id | VARCHAR(30) | | Source document ID |
| assigned_to | UUID FK | **NULLABLE** | **[TVL: luôn NULL khi tạo — Self-Claim]** |
| claimed_at | TIMESTAMPTZ | | Thời điểm nhân viên nhận |
| completed_at | TIMESTAMPTZ | | |

### work_line

| **Field** | **Type** | **Constraint** | **Description** |
|---|---|---|---|
| id | UUID | PK | |
| work_id | VARCHAR(30) | FK → work_header | |
| line_number | INTEGER | | Thứ tự |
| action_type | ENUM | | PICK, PUT, COUNT |
| item_id | VARCHAR(50) | FK → item | |
| qty | DECIMAL(15,3) | | |
| from_location_id | VARCHAR(30) | FK → location | |
| to_location_id | VARCHAR(30) | FK → location | |
| status | ENUM | | PENDING → IN_PROGRESS → COMPLETED / SKIPPED |
| invent_trans_id | UUID | FK → invent_trans | Link khi complete |

## 5.8 VAS / Bagging Tables

| **Table** | **Key Fields** | **Statuses** |
|---|---|---|
| bagging_work_order | wo_number, owner_id, input/output/packaging product_id, packaging_ownership (TVL/CLIENT), bag_type, planned/actual qty, wastage_qty | DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED |
| bagging_progress | work_order_id, session_number, qty_kg, bag_count, work_date, is_overtime | Per-session record |

## 5.9 Billing Tables

| **Table** | **Description** | **Key Fields** |
|---|---|---|
| fee_type | Master list of fee codes | code (PHI_LK_001), name, fee_group (STORAGE/BAGGING/HANDLING_IN/OUT/OTHER) |
| day_type_config | Working/DayOff/Holiday rates | day_type, day_of_week, rate_pct, ot_rate_pct |
| calendar_detail | Specific date overrides | calendar_date, day_type, rate_pct, note |
| billing_condition | Tier pricing / MOQ ranges | code (COND_BAGGING_TIER1), unit, min_value, max_value |
| billing_contract | Owner contract with date range | contract_number, owner_id (NULL=DEFAULT), start/end_date, status |
| contract_fee_line | Fee detail per contract | fee_type_id, unit, unit_price, zone, vehicle_type, cargo_form, billing_method, condition_id, free_days |
| billing_transaction | Auto-captured billable events | owner_id, contract_id, fee_type_id, transaction_type, date, qty, unit_price, day_type, rate_adjustment_pct, amount, status |
| debit_note | Invoice / Thư công nợ | debit_note_number, owner_id, billing_period, total_amount, vat, grand_total, status (DRAFT→LOCKED) |
| debit_note_manual_line | Manual fee entries on DN | debit_note_id, fee_type_id, qty, unit_price, amount |

## 5.10 Supporting Tables

| **Table** | **Purpose** |
|---|---|
| audit_log | Every state change: entity_type, entity_id, action, old/new values, reason_code, user_id, timestamp |
| ocr_record | OCR scan data: bl_number, owner_id, vehicle, scanned_data (JSONB), linked receipt_id |
| transfer_order | **[CFM-03]** Internal move: from/to warehouse/location, qty, transfer_type (SAME/DIFFERENT BUILDING/WAREHOUSE), status (CREATED→RELEASED→SHIPPED→IN_TRANSIT→RECEIVED→CLOSED) |
| cycle_count + cycle_count_line | Physical count: system_qty vs counted_qty, variance, reason_code. **[CFM-08]** No approval workflow — chỉ reason_code + audit. |

---

# 6. INBOUND MODULE

## 6.1 [UPDATED v4.0] State Machine: Inbound Receipt

> **THAY ĐỔI CHÍNH v4.0:** BỎ PENDING_APPROVAL. Thêm REJECTED + Re-weigh flow.

```
DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT
  ↓                                                        ↓
CANCELLED       ┌── RECEIVED (auto, variance ≤ tolerance%) ──→ PUTAWAY → CLOSED
                │
                └── REJECTED (variance > tolerance%)
                        │
                        ├── Re-weigh (attempt ≤ 3) → AWAITING_WEIGHING (loop)
                        └── Hủy → CANCELLED
```

Tổng cộng **10 trạng thái** (thêm REJECTED, bỏ PENDING_APPROVAL).

### State Transition Table (v4.0)

| # | From | To | Trigger | Actor | Điều kiện | InventTrans |
|---|---|---|---|---|---|---|
| T1 | DRAFT | AWAITING_WEIGHING | Xe lên bàn cân | WB Operator | Receipt đã có đủ thông tin | Không |
| T2 | AWAITING_WEIGHING | WEIGHED_IN | Scale POST weigh-in API | Scale System | gross_weight > 0 | Không |
| T3 | WEIGHED_IN | PROCESSING | WH Keeper accept + bắt đầu xuống hàng | WH Keeper | Receipt lines tồn tại | Không |
| T4 | PROCESSING | WEIGHED_OUT | Scale POST weigh-out API | Scale System | tare_weight > 0 | Không |
| T5a | WEIGHED_OUT | **RECEIVED** | Auto-receive | System | |variance_pct| ≤ tolerance_pct | 🟢 POST PHYSICAL |
| **T5b** | **WEIGHED_OUT** | **REJECTED** | **Tolerance exceeded → báo lỗi** | **System** | **|variance_pct| > tolerance_pct** | **Không** |
| **T5c** | **REJECTED** | **AWAITING_WEIGHING** | **Re-weigh (cân lại)** | **WB Operator** | **attempt_number ≤ max_reweigh (default=3)** | **Không** |
| **T5d** | **REJECTED** | **CANCELLED** | **User hủy** | **WH Manager / WB Operator** | **Chưa có inventory_txn** | **Không** |
| T6 | RECEIVED | PUTAWAY | Putaway task hoàn tất | WH Keeper | All lines putaway | 🔵 POST MOVE |
| T6' | RECEIVED | PUTAWAY | **Auto-transition** (bulk, location=STORAGE) | System | Location type = STORAGE [TC-14] | 🔵 POST MOVE (same loc) |
| T7 | PUTAWAY | CLOSED | All lines closed | System | Không còn pending | Không |
| T8a | DRAFT / AWAITING | CANCELLED | User hủy | Varies | Chưa có inventory_txn | Không |
| **T8b** | **WEIGHED_IN / PROCESSING** | **CANCELLED** | **User hủy (sự cố)** | **WH Manager** | **reason_code bắt buộc [TC-13]** | **Không** |
| T8c | REJECTED | CANCELLED | User hủy | Varies | Chưa có inventory_txn | Không |
| 🔴T9 | RECEIVED+ (edge case) | CANCELLED | Force cancel | WH Manager | Đã có inventory_txn → REVERSAL bắt buộc | POST REVERSAL (-qty) |

### [NEW] Chi tiết state REJECTED

**[TC-06 TVL CONFIRMED]** Vượt tolerance → REJECTED. Hệ thống báo lỗi, KHÔNG ghi nhận tồn kho. KHÔNG dùng approval process.

| Thuộc tính | Mô tả |
|---|---|
| **Ý nghĩa** | Variance vượt tolerance — hệ thống TỪ CHỐI, KHÔNG ghi nhận tồn kho |
| **Trigger vào** | |variance_pct| > tolerance_pct (config per owner+product [TC-01]) |
| **Hành vi hệ thống** | (1) receipt.status ⇒ REJECTED. (2) Hiển thị lỗi: "Variance X.X% vượt tolerance Y.Y%. Vui lòng cân lại." (3) Inventory KHÔNG cộng. (4) weighbridge_log giữ nguyên cho audit. (5) Barrier mở — xe rời bàn cân |
| **Actions tiếp theo** | (A) **Re-weigh**: WB Operator chọn "Cân lại" → receipt quay AWAITING_WEIGHING, attempt_number++. (B) **Hủy**: User chọn "Hủy receipt" → CANCELLED |
| **Giới hạn** | max_reweigh_attempts = 3 (configurable). Sau 3 lần → chỉ có thể CANCELLED (cần WH Manager) |
| **Audit log** | action=TOLERANCE_REJECTED, variance_pct, tolerance_pct, attempt_number |

### So sánh v3.0 vs v4.0 (Inbound Tolerance)

| | v3.0 (cũ) | v4.0 (mới — TVL confirmed) |
|---|---|---|
| Vượt tolerance | → PENDING_APPROVAL (chờ Manager) | → **REJECTED** (báo lỗi, không chờ) |
| Manager approve | Có — approve + reason_code → RECEIVED | **BỎ** — không có approval process |
| Tồn kho | Treo (chưa cộng) chờ approve | **Không ghi nhận** cho đến khi cân lại PASS |
| Xe | Cho đi, chờ approve offline | Cho đi, quay lại cân lại nếu cần |
| Re-weigh | Không có (chỉ cancel) | **CÓ** — REJECTED → AWAITING_WEIGHING [TC-18] |

### InventTrans Event Mapping — Inbound

| # | State | InventTrans Event | Stage | Qty | OnHand Impact | Notes |
|---|---|---|---|---|---|---|
| 1-5 | DRAFT → WEIGHED_OUT | Không tạo InventTrans | -- | -- | Không | Chưa posting point |
| 🟢6 | **RECEIVED** | **POST INBOUND** | **PHYSICAL** | **+net_weight_kg** | **+Physical, +Available** | ★ POSTING POINT. Atomic transaction. Billing event đồng thời. |
| 🚫5b | **REJECTED** | **Không tạo InventTrans** | -- | -- | **Không** | **[TC-06] REJECT. KHÔNG ghi nhận tồn kho.** |
| 🔵7 | PUTAWAY | POST MOVE (per line) | PHYSICAL | net_weight_kg | -Physical@RECEIVING, +Physical@STORAGE | **[TC-14]** Auto-transition nếu location=STORAGE |
| 🔴9b | CANCELLED (đã inv_txn) | POST REVERSAL | CANCELLED | -net_weight_kg | -Physical, -Available | Edge case. is_reversed=true |

## 6.2 Vessel Inbound Flow (Luồng 1 — Nhập từ tàu)

| **Step** | **Actor** | **Action** | **System Behavior** |
|---|---|---|---|
| 1 | Driver | Arrives at weighbridge with port delivery note | --- |
| 2 | WB Operator | Mobile App → OCR scan document | Extract B/L, vehicle, product, vessel → ocr_record(NEW) |
| 3 | WB Operator | Confirm OCR → select Owner + B/L | Match B/L → find PO → ocr_record(CONFIRMED) |
| 4 | System | Auto-create ASN from OCR | receipt_type=VESSEL, 1 receipt = 1 trip |
| 5-6 | Scale | Vehicle on scale → POST weigh-in to SWM | weighbridge_log(WEIGH_IN, attempt=1), receipt→WEIGHED_IN |
| 7-8 | WH Keeper | Accept task (App/Self-Claim) → direct unloading | Task assigned, location selected |
| 9 | WH Keeper | Scan location QR, confirm product+lot, loc≠STAGE | receipt_line updated |
| 10 | WH Keeper | Click 'Xác nhận xuống hàng' | receipt_line→RECEIVED |
| 11-12 | Scale | Exit scale → POST weigh-out | Net = Gross−Tare, check tolerance |
| **13a** | **System** | **Variance ≤ tolerance% → auto-receive** | **inventory_txn(INBOUND), billing_txn created** |
| **13b** | **System** | **Variance > tolerance% → REJECTED** | **[NEW v4.0] Báo lỗi. KHÔNG ghi nhận tồn kho.** |
| **14** | **WB Operator** | **Re-weigh (nếu REJECTED)** | **[NEW v4.0] Receipt quay AWAITING_WEIGHING, attempt++** |
| 15 | System | Print Weight Certificate | Vehicle exits |

**Exception E1:** Scale POST failure → Queue + retry 3× at 30s → fallback manual

**Exception E2:** Manual weight entry → WH_MANAGER only + reason_code + audit_log

## 6.3 Standard Inbound (Luồng 2 — Nhập từ khách)

Pre-conditions: PO + ASN pre-created with vehicle list. Same flow as Vessel from step 5 onward, except ASN is selected by vehicle number (not OCR-created).

---

# 7. OUTBOUND MODULE

## 7.1 [NEW v4.0] Sale Order State Machine

> **[NEW]** Sale Order có state machine riêng biệt (trước chỉ có Shipment).

| **State** | **Ý nghĩa** | **Trigger vào** | **Trigger ra** |
|---|---|---|---|
| DRAFT | SO vừa tạo | Staff tạo trên Web | Confirm → CONFIRMED. Cancel → CANCELLED |
| CONFIRMED | Xác nhận, sẵn sàng tạo Shipment | User confirm | Tạo Shipment → PARTIALLY_RELEASED hoặc FULLY_RELEASED |
| PARTIALLY_RELEASED | Đã tạo Shipment nhưng chưa đủ qty | Tạo Shipment thành công | Thêm shipment / All shipped → SHIPPED |
| FULLY_RELEASED | Tổng Shipment qty = SO qty | SUM(shipment.expected) ≥ SO expected | All shipped → SHIPPED |
| SHIPPED | Tất cả Shipment đã xuất | Shipment cuối SHIPPED | Review → CLOSED |
| CLOSED | Immutable | User/System close | Final state |
| CANCELLED | SO bị hủy | User hủy từ DRAFT/CONFIRMED | Final state |

**Blocking rule SO:** SUM(shipment.expected_qty) ≤ SO.expected_qty per line. **[TC-11 CONFIRMED]**

## 7.2 [UPDATED v4.0] State Machine: Shipment Order

> **THAY ĐỔI CHÍNH v4.0:** Flexible weighing sequence + Retry loop + Cả shipment PENDING nếu line fail.

```
DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED
                                               ↓
                                       WEIGHING_TARE → LOADING
                                                         ↓
                                          ┌── WEIGHING_GROSS_N
                                          │         ↓
                                          │   LINE_SHIPPED (hoặc WEIGHING_RETRY → cân lại)
                                          │         ↓
                                          └── LOADING (còn lines) ──→ ALL_WEIGHED
                                                                          ↓
                                                     ┌── SHIPPED (all PASS)
                                                     └── PENDING_APPROVAL (≥1 FAIL) [TC-10]
                                                              ↓
                                                     ├── SHIPPED (Manager approve)
                                                     └── CANCELLED (Manager reject)
```

### State Transition Table (v4.0)

| # | From | To | Trigger | Actor | Điều kiện | InventTrans |
|---|---|---|---|---|---|---|
| T1 | DRAFT | CONFIRMED | User confirm | WH Planner | Shipment có lines | EXPECTED (optional) |
| T2 | CONFIRMED | ALLOCATED | System allocate (FIFO) / Manual | System/User | Available ≥ requested | 🟡 REGISTERED |
| T2' | ALLOCATED | CONFIRMED | Unallocate | User | -- | REVERSE allocation |
| T3 | ALLOCATED | PICKING | Pick task tạo | System | -- | Status update |
| T4 | PICKING | PICKED | All pick tasks done | WH Keeper | -- | Không |
| T5 | PICKED | WEIGHING_TARE | Xe lên bàn cân lần 1 | WB Operator | -- | Không |
| T6 | WEIGHING_TARE | LOADING | Tare done | WH Keeper | tare_weight > 0 | Không |
| **T7** | **LOADING** | **WEIGHING_GROSS_N** | **Cân sau khi load line N** | **WB Operator** | **Keeper chọn line bất kỳ [TC-09]** | **Không** |
| T8 | WEIGHING_GROSS_N | LINE_SHIPPED | Net line OK | System | PASS blocking | Không (chưa post) |
| T8' | WEIGHING_GROSS_N | LINE_SHIPPED | FAIL tolerance → flag line | System | |var| > tolerance | Không |
| T8'' | WEIGHING_GROSS_N | **WEIGHING_RETRY** | FAIL blocking → xe điều chỉnh | System | BLOCK | Không |
| T9 | LINE_SHIPPED | LOADING | Còn lines chưa cân | System | uncompleted > 0 | Không |
| T10 | LINE_SHIPPED (last) | ALL_WEIGHED | Tất cả lines đã cân | System | uncompleted = 0 | Không |
| T11a | ALL_WEIGHED | **SHIPPED** | Tất cả lines PASS | System | No flagged lines | 🟢 POST PHYSICAL |
| **T11b** | **ALL_WEIGHED** | **PENDING_APPROVAL** | **≥1 line FAIL** | **System** | **[TC-10] Cả shipment PENDING** | **Không** |
| T12a | PENDING_APPROVAL | SHIPPED | Manager approve | WH Manager | reason_code bắt buộc | 🟢 POST PHYSICAL |
| T12b | PENDING_APPROVAL | CANCELLED | Manager reject | WH Manager | reason_code | REVERSE alloc |
| T13 | SHIPPED | CLOSED | Auto-close | System | -- | Không |
| T14 | DRAFT-PICKED | CANCELLED | User hủy | Varies | Release allocation nếu có | REVERSE nếu có |

### [NEW] Blocking Rules tại Trạm Cân (Retry Loop)

**Luồng thực tế:** Scale POST → WMS validate → FAIL = trả error → xe vào điều chỉnh → cân lại (retry loop).

| **Rule** | **Mô tả** | **TC** |
|---|---|---|
| Bulk SO blocking | SUM(shipped_qty under SO) + current_net ≤ SO.expected_qty. Check mỗi trip. BLOCK nếu vượt. | TC-11 |
| Bagged tolerance | tolerance_kg = 2 × bag_shell_weight_kg × bag_count. Check per line. shell_weight = fixed product master. | TC-08 |
| Line fail | Flag line, tiếp tục cân. **Cả shipment PENDING cuối.** | TC-10 |

### Flexible Weighing — Net Calculation

**[TC-09 CONFIRMED]** Keeper chọn tự do thứ tự lines. Net calculation = incremental weight:

| Trip | Keeper chọn | gross_before | gross_after | net_line |
|---|---|---|---|---|
| 1 | CaO (line 2) | 15,000 (=tare) | 40,000 | 25,000 kg |
| 2 | Dolomite (line 3) | 40,000 | 60,000 | 20,000 kg |
| 3 | CaCO3 (line 1) | 60,000 | 90,000 | 30,000 kg |

Cross-check: 90,000 − 15,000 = 75,000 = 25,000 + 20,000 + 30,000 ✓

### InventTrans Event Mapping — Outbound

| # | State | InventTrans Event | Stage | Qty | OnHand Impact |
|---|---|---|---|---|---|
| 1 | CONFIRMED | EXPECTED (optional) | EXPECTED | -expected_qty | +Ordered |
| 🟡3 | ALLOCATED | UPDATE stage | REGISTERED | -allocated_qty | -Available, +Reserved |
| 4 | PICKING | UPDATE status | REGISTERED | -- | Status tracking only |
| 6-7 | Weighing loop | Không tạo InventTrans | -- | -- | Không |
| 🟢8 | **SHIPPED** | **POST per line** | **PHYSICAL** | **-net_weight_kg (per line)** | **-Physical** |
| CANCEL | CANCELLED | REVERSE | CANCELLED | +qty | Restore |

## 7.3 Allocation Logic

- Default: FIFO by inbound date (earliest lot first)
- Auto-allocate: system picks locations with sufficient qty, sorted by lot date ASC
- Manual: user selects specific location + lot + qty
- Unallocate: releases reserved qty back to available
- Rule: allocated_qty cannot exceed available_qty per location+product+lot
- **[TVL CONFIRMED — CFM-05]** Không reservation. Available = Physical. Allocate trực tiếp.

## 7.4 Split Shipment & Container Stuffing

- Split: select shipment → enter split qty → new shipment created with remainder
- Container Stuffing: create order (container#, type, linked shipments) → staff loads+seals → fee = MAX(flat_rate, qty×per_mt_rate)

---

# 8. INVENTORY MODULE

## 8.1 [UPDATED v4.0] On-Hand Formula

> **[UPDATED]** Dùng OnHand table mới. Available = Physical (no reservation).

**on_hand(item, dim) = SUM(invent_trans.qty WHERE item AND dim AND stage=PHYSICAL)**

**Available = Physical - Reserved.** TVL: Reserved = 0 luôn → **Available = Physical**.

| OnHand Field | IB: RECEIVED | IB: REJECTED | OB: ALLOCATED | OB: SHIPPED |
|---|---|---|---|---|
| physical_qty | +net_weight_kg | **Không đổi** | Không đổi | -shipped_qty_kg |
| available_qty | +net_weight_kg | **Không đổi** | -allocated_qty | Không đổi (đã giảm khi allocate) |
| reserved_qty | 0 | 0 | +allocated_qty | -shipped_qty |
| ordered_qty | 0 | 0 | +expected_qty | 0 |

## 8.2 Movement Types

| **Movement** | **Type** | **Weight** | **Trigger** |
|---|---|---|---|
| Receive goods | INBOUND | +qty | Receipt RECEIVED |
| Ship goods | OUTBOUND | −qty | Shipment SHIPPED |
| Move (source) | MOVE_OUT | −qty | Transfer order |
| Move (dest) | MOVE_IN | +qty | Transfer order |
| Bagging consume | VAS_CONSUME | −qty (bulk) | Work order |
| Bagging produce | VAS_PRODUCE | +qty (bagged) | Work order |
| Shrinkage adjust | SHRINKAGE_ADJUST | −qty | Adjustment approval |
| Cycle count adjust | CYCLE_COUNT_ADJUST | ±qty | Count approval |
| **[NEW]** Status change | STATUS_CHANGE | 0 (dim change) | Manual status change |

## 8.3 Cycle Count Workflow

1. Create count order on Web (select warehouse, locations, count type)
2. System generates count lines with system qty per location+product
3. Counter (App/Web) goes to location, enters counted_qty
4. System calculates variance; if ≠ 0 → **[CFM-08]** chỉ cần reason_code + audit (no approval workflow)
5. Approved adjustments create InventTrans (CYCLE_COUNT_ADJUST)

---

# 9. VAS & PRODUCTION MODULE (Bagging)

## 9.1 State Machine

> DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED → (auto inventory txns)
>
> ↓
>
> CANCELLED

## 9.2 Bagging Workflow

1. Create WO: owner, bulk product, bag type, qty, packaging ownership
2. Confirm → validate sufficient bulk inventory
3. Start → IN_PROGRESS; record progress sessions (qty, bags, date, OT flag)
4. Complete → system auto-creates: VAS_CONSUME (−bulk), VAS_PRODUCE (+bagged), VAS_CONSUME (−packaging material), billing_transaction (BAGGING_FEE)

## 9.3 Packaging Ownership

| **Type** | **Material Source** | **Billing** |
|---|---|---|
| TVL_OWNED | TVL internal asset; BOM deducts from TVL inventory | Bill includes labor + material |
| CLIENT_OWNED | Client's SKU; requires inbound for packaging first; deducts from client inventory | Labor only; storage for packaging configurable |

---

# 10. BILLING MODULE

## 10.1 Pipeline

> STAGE 1: Setup → Fee types, day types, conditions, contracts
>
> STAGE 2: Capture → Billing transactions auto-created by WMS events
>
> STAGE 3: Review → View 'Sản lượng tính phí', filter + search
>
> STAGE 4: Debit Note → Select transactions → generate debit note
>
> STAGE 5: Lock → Review → approve → lock (immutable)

## 10.2 Fee Calculation Formulas

### Storage Fee — Inventory-based

**Formula:** Daily = (Opening Inventory + Inbound Today) × Unit Price (VND/MT/day)

**Monthly:** SUM(Daily) for billing period

**Source:** daily_storage_snapshot table (batch job 23:59)

**Rule:** Only starts when goods in STORAGE location (not receiving/staging)

**Example:** Day 1: Open=0, In=500MT → 500×500=250K | Day 2: Open=500, In=200 → 700×500=350K | Day 3: Open=700, Out=300 → 700×500=350K (uses opening+inbound, NOT closing)

### Storage Fee — Area-based

**Fixed:** Monthly = Fixed Area (m²) × Price (VND/m²/month)

**Variable:** Monthly = Avg Daily Used Area (m²) × Price (VND/m²/month)

### Handling Fees

**Inbound:** Net Weight (MT) × Unit Price (by vehicle type) × Day Type Rate %

**Outbound:** Shipped Qty (MT) × Unit Price (by cargo form) × Day Type Rate %

| **Day Type** | **Rate %** | **OT Rate %** |
|---|---|---|
| WORKING_DAY | 100% | 130% |
| DAY_OFF | 150% | 200% |
| HOLIDAY | 200% | 300% |

### Bagging Fee

**Labor:** Actual Qty (MT) × Unit Price

**Material:** Bag Count × Price/Bag

**Tier Pricing:** 0-1000MT→111K/MT, 1001-5000→105K/MT, >5000→100K/MT

### Container Stuffing Fee

**Method:** HIGHER_OF_TWO → Fee = MAX(Flat Rate per container, Qty MT × Per MT Rate)

## 10.3 Debit Note Lifecycle

> DRAFT → REVIEWED → APPROVED → LOCKED (immutable)

Locked debit notes cannot be edited. Lock records: locked_by, locked_at. Credit Note = Phase 2.

---

# 11. INTEGRATION & IoT MODULE

## 11.1 Weighbridge Agent Architecture

> Scale Hardware → COM Port (RS232/TCP-IP) → Local Agent → WebSocket/REST → Cloud SWM
>
> Agent: Read stable weight, disable manual input, ALPR camera (Phase 2), cargo photo
>
> Offline: queue locally, sync when reconnected
>
> Latency target: < 2 seconds scale-to-response

## 11.2 Weighbridge API

**POST /api/v1/weighbridge/weigh-in →** { scale_id, receipt_id, direction, vehicle_number, gross_weight_kg, weigh_time, photos[], attempt_number }

**Response →** { status, weighbridge_log_id, receipt_info { receipt_number, owner_name, product_name, expected_qty_kg } }

**POST /api/v1/weighbridge/weigh-out →** { weighbridge_log_id, tare_weight_kg, weigh_time, photos[] }

**Response →** { status, net_weight_kg, variance_pct, within_tolerance, **[NEW]** auto_received, rejected, can_reweigh }

**[NEW] POST /api/v1/weighbridge/outbound-weigh →** { shipment_line_id, gross_weight_kg, weigh_time, attempt_number }

**Response →** { status, net_line_kg, blocking_result (PASS/FAIL), fail_reason, can_retry }

## 11.3 Mobile App Functions

| **Screen** | **Functions** |
|---|---|
| Login + Warehouse Select | Auth, select active warehouse |
| **[UPDATED]** Work List (Self-Claim) | View available works, claim task, execute (Putaway/Pick/Move/Count) |
| Inbound Tasks | View/accept tasks, scan location, confirm putaway |
| OCR Scanner | Camera scan delivery note → auto-extract → create ASN |
| Pick Tasks | View assignments, navigate to location, confirm pick |
| Inventory View | Search by location/product |
| Move Inventory | Scan source → qty → scan destination |
| Cycle Count | Scan location → enter counted qty |

## 11.4 ERP Sync

- Direction: SWM → ERP (one-way push)
- Data: Locked Debit Notes
- Idempotency: unique debit_note_number, re-push = no duplicate

---

# 12. REPORTS & DASHBOARD

## 12.1 Reports

| **Report** | **Filters** | **Export** |
|---|---|---|
| Inbound Report | Date range, owner, product, warehouse, status | Excel |
| Outbound Report | Date range, owner, product, warehouse, vehicle type | Excel |
| Inventory Report | Owner, product, location, warehouse | Excel |
| Shrinkage Report | Owner, date range (calculated when SKU fully shipped) | Excel |
| Custom Template | Per uploaded customer template | Excel |

## 12.2 Dashboard Charts

| **Chart** | **Type** | **Key Features** |
|---|---|---|
| Capacity & Utilization | Bar + Line (6-month) | Warning at 85%, Full at 100% |
| Inventory Aging | Stacked Bar | 0-30d (green), 31-60 (yellow), 61-90 (orange), >90 (red) |
| Expiry Tracking | Stacked Bar | By % remaining shelf life, 5 segments |

---

# 13. API ENDPOINTS (Summary)

| **Module** | **Endpoints** |
|---|---|
| Master Data | GET/POST /owners, /products, /warehouses, /locations, /locations/:whId/layout, **[NEW]** /inventory-status, /number-sequences |
| Inbound | GET/POST /purchase-orders (+/upload), /receipts, PUT /:id/receive, /putaway, **[NEW]** POST /:id/reweigh, POST /ocr/scan, PUT /ocr/:id/confirm |
| Outbound | GET/POST /sale-orders (+/upload), /shipments, POST /:id/allocate, /allocate-manual, DELETE /unallocate, POST /pick, /unpick, /ship, /split, /tally, /container-stuffing, **[NEW]** POST /:id/force-approve |
| Inventory | GET /inventory, /on-hand, /movements, /invent-trans, POST /move, /status-change, GET/POST /cycle-counts, PUT /:id/lines/:lid, **[NEW]** GET /transfers, POST /transfers |
| VAS | GET/POST /bagging-orders (+/upload), PUT /:id/start, POST /:id/progress, PUT /:id/complete |
| Billing | CRUD /fee-types, /day-types, /conditions, /contracts, /contracts/:id/fee-lines, GET /transactions, POST /calculate, CRUD /debit-notes, POST /:id/manual-line, /import-excel, PUT /lock, GET /export |
| Weighbridge | POST /weigh-in, /weigh-out, /manual-entry, **[NEW]** /outbound-weigh |
| **[NEW]** Work | GET /works, POST /:id/claim, PUT /:id/lines/:lid/complete |
| Reports | GET /reports/inbound, /outbound, /inventory, /shrinkage, /dashboard/capacity, /aging, /expiry |

Base path: /api/v1/ | Auth: JWT Bearer token | Format: JSON | Pagination: ?page=1&limit=50

---

# 14. UI SCREENS LIST

## 14.1 Web Admin Portal (~52 screens)

| **Module** | **Screen** | **Key Actions** |
|---|---|---|
| Auth | Login, Warehouse Selector | Login, select warehouse context |
| Master Data | Owner CRUD, Product CRUD, Warehouse CRUD, Location CRUD, 2D Layout, **[NEW]** Inventory Status Config, Number Sequence Config | Create/edit/view all master data + visual map |
| Inbound | PO List/Detail, Receipt List/Detail, OCR Mgmt, **[NEW]** Re-weigh History | Create PO, upload Excel, view receipts, manage OCR, **[NEW]** view rejected/re-weigh attempts |
| Outbound | SO List/Detail, Shipment List/Detail, Container Stuffing, **[NEW]** Weighing Attempts | Create SO, allocate, pick, ship, split, tally, stuffing, **[NEW]** view retry history |
| Inventory | On-Hand, Movement History, Move, Status Change, Cycle Count List/Detail, **[NEW]** InventTrans Ledger | View stock, trace movements, initiate moves, count & adjust |
| VAS | Bagging WO List/Detail | Create/manage work orders, record progress |
| Billing | Fee Types, Day Types, Calendar, Conditions, Contract List/Detail, Volume, Billing List, DN List/Detail | Full billing setup → calculate → debit note → lock → export |
| Reports | Inbound/Outbound/Inventory/Shrinkage Reports, Template Download | Filter + export to Excel |
| Dashboard | Capacity, Aging, Expiry charts | Visual KPIs |
| Admin | User Mgmt, Audit Log | CRUD users + roles, search audit trail |

## 14.2 Mobile App (10 screens)

| **Screen** | **Functions** |
|---|---|
| Login + Home Menu | Auth, menu grid: Nhập, Xuất, Tồn, Kiểm kê, OCR, Di chuyển |
| Profile / Settings | Select warehouse, change password |
| **[UPDATED]** Work List (Self-Claim) | View available works → claim → execute. Tabs: Available / My Tasks / Completed |
| Inbound Task List+Detail | Tabs (Tất cả/Của tôi/Hoàn thành), scan location, input lot/qty, confirm |
| OCR Scanner | Camera → auto-extract → confirm → create ASN |
| Pick Task List+Detail | View assignments, scan, confirm pick |
| Inventory View | Search by location/product |
| Move Inventory | Scan source → qty → scan destination |
| Cycle Count | Scan location → enter counted qty |

---

# 15. BUSINESS RULES REGISTRY

> **[UPDATED v4.0]** Mở rộng từ 15 → 77 rules. Chi tiết đầy đủ trong BRD v1.0. Dưới đây là tóm tắt theo category.

| **Category** | **Rules** | **Key Rules** |
|---|---|---|
| 1. Weighbridge & Weight | 5 | BR-WB-001: Weight từ scale, manual chỉ WH_MANAGER. BR-WB-005: Multi-trip net calculation. |
| 2. Inbound / Receipt | 12 | **[UPDATED]** BR-IN-005: Variance > tolerance → **REJECTED** (bỏ PENDING_APPROVAL). BR-IN-011: Blocking bao = PO level [TC-12]. |
| 3. Outbound / Shipment | 10 | **[NEW]** BR-OUT-004: Bulk surplus → BLOCK [TC-11]. BR-OUT-005: Bagged tolerance = 2×shell×count. BR-OUT-010: Flexible sequence [TC-09]. |
| 4. Inventory Management | 10 | BR-INV-001: Mọi thay đổi tồn qua InventTrans. BR-INV-003: Post tại RECEIVED/SHIPPED [CFM-07]. BR-INV-005: Dimensions Phase 1 [CFM-02]. |
| 5. Billing & Fee | 12 | BR-BIL-001: Storage billable = opening + inbound. BR-BIL-004: Day type rates. BR-BIL-008: Contract max 1 active per owner. |
| 6. VAS / Bagging | 5 | BR-VAS-003: Packaging ownership (TVL/Client). |
| 7. Master Data | 8 | BR-MD-001: Location capacity formula. BR-MD-007: Bag shell weight = fixed [TC-08]. |
| 8. Work Execution | 2 | **[NEW]** BR-WRK-001: Self-Claim [CFM-12]. BR-WRK-002: Full WorkHeader/WorkLine Phase 1 [CFM-06]. |
| 9. RBAC & Permissions | 6 | BR-RBAC-001: Manual weight = WH_MANAGER only. |
| 10. Audit & System | 7 | BR-AUD-001: Mọi state change → audit_log. BR-AUD-003: Idempotency via external_id. |
| **TOTAL** | **77** | |

---

# 16. NON-FUNCTIONAL REQUIREMENTS

| **Requirement** | **Target** |
|---|---|
| API response time | < 500ms single operations, < 3s reports |
| Concurrent users | 50+ simultaneous Web + Mobile |
| Uptime | 99.5% during business hours (6:00-22:00) |
| Data retention | All transaction logs: 7 years minimum |
| Weighbridge latency | < 2 seconds from scale read to SWM response |
| Audit trail | Every state change logged with user, timestamp, before/after |
| DB transactions | All inventory-affecting operations atomic (BEGIN...COMMIT) |
| Export | All reports to Excel; Debit notes to customer template |
| Mobile offline | Queue operations locally for putaway/pick, sync when online |
| Backup | Daily automated backup with point-in-time recovery |

---

# 17. GLOSSARY

| **Abbreviation** | **Vietnamese** | **English** |
|---|---|---|
| SWM | Hệ thống quản lý kho | Smart Warehouse Management |
| ASN | Đơn hàng nhập | Advanced Shipping Notice |
| PO | Lệnh mua hàng | Purchase Order |
| B/L | Vận đơn | Bill of Lading |
| SO | Lệnh xuất hàng | Sale Order |
| DO | Đơn hàng xuất | Delivery Order |
| WO | Lệnh gia công | Work Order |
| VAS | Dịch vụ giá trị gia tăng | Value-Added Services |
| EOD | Cuối ngày (23:59) | End of Day snapshot |
| MT | Tấn | Metric Ton (1,000 kg) |
| ALPR | Nhận diện biển số | Automatic License Plate Recognition |
| BOM | Định mức | Bill of Materials |
| MOQ | Sản lượng tối thiểu | Minimum Order Quantity |
| OT | Làm thêm giờ | Overtime |
| LPN | Số hiệu định dạng | License Plate Number |
| **[NEW]** InventTrans | Bút toán tồn kho | Inventory Transaction Ledger |
| **[NEW]** InventDim | Chiều không gian tồn kho | Inventory Dimension |

---

# 18. ASSUMPTIONS & TO-CONFIRM

> **[UPDATED v4.0]** Tổng hợp từ Assumptions Register v1.0. Tổng: 12 Confirmed + 14 Assumptions + 18 To-Confirm = 44 items.

## 18.1 Confirmed Decisions (12 items — BASELINE, không cần hỏi lại)

| **ID** | **Chủ đề** | **Quyết định** | **Nguồn** |
|---|---|---|---|
| CFM-01 | InventTrans Granularity | Per line (per receipt_line / shipment_line) | Gap Analysis Q1 |
| CFM-02 | OnHand Dimensions | Phase 1: Item + WH + Location + Owner + Status. Batch OFF. | Gap Analysis Q2 |
| CFM-03 | Inter-warehouse Transfer | CÓ — cần Transfer module | Gap Analysis Q3 |
| CFM-04 | LPN/Pallet Tracking | KHÔNG — deferred Phase 2 | Gap Analysis Q4 |
| CFM-05 | Reservation | KHÔNG reserve — allocate trực tiếp. Available = Physical. | Gap Analysis Q5 |
| CFM-06 | Work Model | Phase 1 CẦN full WorkHeader/WorkLine | Gap Analysis Q6 |
| CFM-07 | InventTrans Posting | Inbound: RECEIVED. Outbound: SHIPPED. | Gap Analysis Q7 |
| CFM-08 | Adjustment Workflow | Chỉ reason_code + audit. Không cần approval. | Gap Analysis Q8 |
| CFM-09 | Batch/Lot Tracking | OFF Phase 1. batch_id luôn NULL. | MasterData PRD v2.1 |
| CFM-10 | NumberSequence Scope | PER_WAREHOUSE. Mỗi kho counter riêng. | MasterData PRD v2.1 |
| CFM-11 | Inventory Status | 4 status: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. Bỏ QC_HOLD. | MasterData PRD v2.1 |
| CFM-12 | Work Assignment | Self-Claim. Nhân viên tự nhận. Không directed. | MasterData PRD v2.1 |

## 18.2 TVL Confirmed TC Decisions (10 items từ To-Confirm Register — ĐÃ CHỐT)

| **TC** | **Quyết định** | **Status** |
|---|---|---|
| TC-01 | Tolerance per owner+product, default fallback | ✅ CONFIRMED |
| TC-06 | Vượt tolerance → REJECT + báo lỗi. BỎ approval process. | ✅ CONFIRMED |
| TC-08 | Bag shell weight = fixed value product master | ✅ CONFIRMED |
| TC-09 | Outbound weighing sequence = Keeper chọn tự do | ✅ CONFIRMED |
| TC-10 | Line fail → cả shipment PENDING_APPROVAL (tập trung cuối) | ✅ CONFIRMED |
| TC-11 | Bulk surplus → BLOCK mặc định. Manager override. | ✅ CONFIRMED |
| TC-12 | Blocking hàng bao nhập = PO level | ✅ CONFIRMED |
| TC-13 | Cho phép cancel ở WEIGHED_IN / PROCESSING | ✅ CONFIRMED |
| TC-14 | PUTAWAY tách riêng + auto-transition nếu location=STORAGE | ✅ CONFIRMED |
| TC-18 | Manager reject inbound → Re-weigh (REJECTED → AWAITING_WEIGHING) | ✅ CONFIRMED |

## 18.3 Assumptions (14 items — chưa chốt, cần confirm trước dev)

| **#** | **Assumption** | **Impact** | **Risk** |
|---|---|---|---|
| ASM-01 | Tolerance % config per owner+product. Default = 0.50%. | Receipt logic | 🔴 HIGH |
| ASM-02 | EOD snapshot at 23:59 UTC+7 | Storage billing | 🔴 HIGH |
| ASM-03 | 1 vehicle = 1 product per trip (vessel flow) | Receipt line design | 🟡 MEDIUM |
| ASM-04 | All weights KG internally, display MT | All calculations | 🟢 LOW |
| ASM-05 | VAT rate = 10% uniform | Debit note | 🟢 LOW |
| ASM-06 | Free days from first putaway date per lot | Storage billing | 🔴 HIGH |
| ASM-07 | Mobile app requires internet (limited offline putaway/pick) | App architecture | 🟡 MEDIUM |
| ASM-08 | Variance = absolute value (cả thừa lẫn thiếu) | Tolerance check | 🟢 LOW |
| ASM-09 | bag_shell_weight_kg from product master (fixed) | Bagged tolerance | 🟡 MEDIUM |
| ASM-10 | Xe rời kho sau weigh-out, không giữ chờ | Gate control | 🟢 LOW |
| ASM-11 | Inbound EXPECTED stage skip cho Go-Live Phase 1 | InventTrans | 🟢 LOW |
| ASM-12 | PICKING chỉ update status, không tạo trans mới | InventTrans | 🟡 MEDIUM |
| ASM-13 | Multi-trip loop KHÔNG tạo InventTrans — chỉ weighbridge_trip_log | InventTrans | 🟡 MEDIUM |
| ASM-14 | Hàng rời (bulk) thường xuống thẳng bãi → PUTAWAY auto-transition | Inbound flow | 🟢 LOW |

## 18.4 To-Confirm with TVL (8 items còn lại — CẦN TRẢ LỜI)

| **#** | **Question** | **Priority** |
|---|---|---|
| TC-02 | EOD cut-off time — đúng 23:59 hay configurable? | 🔴 HIGH |
| TC-03 | Free-time (free storage days) — per contract hay per B/L? | 🔴 HIGH |
| TC-04 | Tiered pricing: reset theo lịch tháng hay rolling? | 🔴 HIGH |
| TC-05 | Hàng Damaged/Hold — billable storage? Per owner config? | 🟡 MEDIUM |
| TC-07 | Packaging wastage cost — TVL hay Client chịu? | 🟡 MEDIUM |
| TC-15 | Multi-warehouse billing — combined DN hay per warehouse? | 🟡 MEDIUM |
| TC-16 | ALPR camera — mandatory Go-Live hay Phase 2? | 🟢 LOW |
| TC-17 | Credit Note workflow — Go-Live hay Phase 2? | 🟢 LOW |

---

**--- END OF DOCUMENT ---**

*PRD v2.0 (Version 4.0) — Updated from: PRD v3.0 + State Machine v3.1 + MasterData PRD v2.1 + BRD v1.0 + Gap Analysis QA + Assumptions Register v1.0 + Outbound Analysis v1.0*

*Generated by: Smartlog Solution Team — March 2026*
