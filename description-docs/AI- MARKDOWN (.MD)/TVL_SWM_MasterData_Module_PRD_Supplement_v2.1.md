# THORESEN VINAMA LOGISTICS — Smart Warehouse Management (SWM)

## PRD Supplement: Master Data Module — UPDATE v2.1

**9 New Entity Tables per D365 WMS Reference | TVL Answers Incorporated**

| Key | Value |
|-----|-------|
| **Version** | 2.1 (TVL Answers Incorporated) |
| **Date** | March 2026 |
| **Status** | Draft — TVL Confirmed 6/6 Questions |
| **Reference** | d365_wms_inventory_module_state_machine_and_sequences.md |
| **Source GAP** | TVL_SWM_Gap_Analysis_Restructuring_Plan.docx — Task A3 |
| **Scope** | 9 entity tables: InventDim, OnHand, InventTrans, LPNHeader (Phase 2), LPNLine (Phase 2), WorkHeader, WorkLine, InventoryStatus, NumberSequence |
| **TVL Decisions** | Batch OFF Phase 1 ・ LPN DEFERRED Phase 2 ・ Scope PER_WAREHOUSE ・ Post RECEIVED/SHIPPED ・ No QC_HOLD ・ Self-Claim Work |

---

# 0. Change Log — What's New in v2.1 (TVL Confirmed)

This document supplements the existing TVL_SWM_MasterData_Module_PRD_Supplement.docx (v1.0) by adding 9 entity tables identified as MISSING in the Gap Analysis. Version 2.1 incorporates all 6 answers from TVL, marked with `[TVL CONFIRMED]` tags throughout the document. Key decisions: Batch OFF Phase 1, LPN DEFERRED Phase 2, Scope PER_WAREHOUSE, Post RECEIVED/SHIPPED, No QC_HOLD, Self-Claim Work.

## 0.1 Summary of New Tables

| # | Table | Layer | Priority | Purpose |
|---|-------|-------|----------|---------|
| 9 | **invent_dim** | Inventory Transaction | **CRITICAL** | Dimension key table — Phase 1: Site+WH+Location+Owner+Status. Batch OFF |
| 10 | **on_hand** | Inventory Transaction | **CRITICAL** | Real-time stock by Item + Dimension. available = physical - reserved |
| 11 | **invent_trans** | Inventory Transaction | **CRITICAL** | Transaction ledger — post at RECEIVED (in) / SHIPPED (out) |
| 12 | **lpn_header** | Warehouse Execution | DEFERRED | [Phase 2] LPN header — TVL không dùng pallet vật lý Phase 1 |
| 13 | **lpn_line** | Warehouse Execution | DEFERRED | [Phase 2] LPN lines — deferred cùng lpn_header |
| 14 | **work_header** | Warehouse Execution | **HIGH** | Work order header — self-claim bởi nhân viên, không directed |
| 15 | **work_line** | Warehouse Execution | **HIGH** | Work steps — từng bước thực hiện, link InventTrans khi complete |
| 16 | **inventory_status** | Inventory Transaction | **HIGH** | 4 status Go-Live: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT (bỏ QC_HOLD) |
| 17 | **number_sequence** | System Setup | **HIGH** | Sinh số tự động — scope PER_WAREHOUSE (mỗi kho counter riêng) |

## 0.2 Design Rules Applied (from D365 Reference + TVL Decisions)

1. **Rule 1:** Chứng từ KHÔNG cập nhật OnHand trực tiếp → luôn thông qua InventTrans event.
2. **Rule 2:** OnHand(item, dim) = SUM(InventTrans.qty WHERE item AND dim). Đây là quy tắc reconciliation.
3. **Rule 3:** Mọi InventTrans có RefType + RefId + RefLineId → truy vết 100% nguồn gốc biến động.
4. **Rule 4:** `[TVL CONFIRMED]` Inventory dimensions Phase 1: Site + Warehouse + Location + Owner + Status. Batch/Lot = OFF. Serial = OFF.
5. **Rule 5:** `[TVL CONFIRMED]` Work self-claim — nhân viên tự chủ động nhận work trên mobile. Không có directed assignment.
6. **Rule 6:** Idempotent — mọi API có ExternalId để chống tạo trùng. NumberSequence scope = PER_WAREHOUSE.
7. **Rule 7:** `[TVL CONFIRMED]` InventTrans posting: Inbound post tại RECEIVED state. Outbound post tại SHIPPED state.
8. **Rule 8:** `[TVL CONFIRMED]` 4 Inventory Status Go-Live: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. Không có QC_HOLD.

## 0.3 Naming Convention (same as v1.0)

1st: TVL existing field name → 2nd: D365 FO standard → 3rd: New proposed (snake_case). All tables follow same Constraint Notation and Data Types as v1.0 Section 0.

## 0.4 TVL Confirmed Decisions Summary

Tất cả 6 câu hỏi đã được TVL xác nhận. Các quyết định này được đánh dấu `[TVL CONFIRMED]` xuyên suốt document.

| # | Chủ đề | Quyết định TVL | Ảnh hưởng |
|---|--------|---------------|-----------|
| **Q1** | Batch/Lot tracking | **OFF Phase 1** | invent_dim.batch_id luôn NULL. on_hand không group theo batch. Xem xét Phase 2 |
| **Q2** | LPN/Pallet tracking | **KHÔNG dùng Phase 1** | lpn_header + lpn_line DEFERRED. Bỏ lpn_tracking_enabled khỏi Item updates |
| **Q3** | NumberSequence scope | **PER_WAREHOUSE** | Mỗi kho counter riêng. scope_value = warehouse_code. Số chứng từ không trùng giữa kho |
| **Q4** | InventTrans posting | **RECEIVED / SHIPPED** | Inbound post tại RECEIVED state. Outbound post tại SHIPPED state. State trung gian không post |
| **Q5** | Inventory status | **4 status, bỏ QC_HOLD** | AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. qc_hold_qty luôn = 0. available = physical - reserved |
| **Q6** | Work assignment | **Self-Claim** | Nhân viên tự nhận work trên mobile. assigned_to luôn NULL khi tạo. Không có directed assignment |

---

# 9. Inventory Dimension (Bang chieu khong gian ton kho)

**Table:** `invent_dim`

Dimension key table theo D365 architecture. Moi to hop duy nhat cua (Site + Warehouse + Location + Batch + Serial + Status + Owner) = 1 record InventDim. Tat ca bang OnHand va InventTrans tham chieu den InventDim.id de biet hang nam O DAU, cua AI, trang thai gi. [TVL CONFIRMED] Phase 1: bat buoc Site + Warehouse + Location + Owner + Status. Batch/Lot = OFF Phase 1.

> **CRITICAL:** DAY LA ENTITY QUAN TRONG NHAT trong bo sung lan nay. Khong co InventDim, he thong KHONG THE track ton kho theo da chieu (ai, o dau, trang thai gi).

> **CRITICAL:** UNIQUE constraint tren (site_id, warehouse_id, location_id, batch_id, serial_id, inventory_status, owner_id) — hoac dung dim_hash equivalent.

> *Note:* dim_hash dung SHA-256 de check nhanh truoc khi insert, tranh duplicate dimension records.

> *Note:* Phase 1 TVL: Site luon = 'TVL-SITE' (1 site duy nhat). Warehouse + Location + Owner + Status la bat buoc. [TVL CONFIRMED] Batch/Lot = OFF Phase 1 (batch_id luon NULL).

> *Note:* Phase 2: Xem xet bat Batch tracking cho bulk cargo khi TVL co quy trinh truy vet lo tau / PO goc. serial_id van NULL cho bulk.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong. Moi to hop dimension duy nhat = 1 InventDimId |
| **dim_hash** | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 hash cua tat ca dimension values. Dung de check duplicate nhanh truoc khi insert. Guarantee uniqueness |

**--- STORAGE DIMENSIONS (Where) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **site_id** | VARCHAR(10) | NOT NULL, DEFAULT 'TVL-SITE' | Ma site. TVL chi co 1 site. D365 bat buoc hierarchy: Site > Warehouse > Location |
| **warehouse_id** | VARCHAR(10) | FK -> warehouse(code), NOT NULL | Ma kho. VD: 'WH5.1', 'WH5.3', 'YARD01' |
| **location_id** | VARCHAR(30) | FK -> location(loc), NULLABLE | Ma vi tri cu the. NULL khi chua xac dinh vi tri (VD: hang dang transit). Phase 1: BAT BUOC cho on-hand tracking |

**--- TRACKING DIMENSIONS (What) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **batch_id** | VARCHAR(50) | NULLABLE | Ma lo hang (Lot/Batch). [TVL CONFIRMED] Phase 1: OFF — khong bat Batch/Lot tracking cho bulk cargo. Field ton tai nhung luon NULL. Phase 2: xem xet bat khi co quy trinh truy vet lo tau. VD tuong lai: 'LOT-BTP-20260301' |
| **serial_id** | VARCHAR(50) | NULLABLE | Ma serial. KHONG dung cho bulk cargo. Chi dung neu TVL quan ly hang bao theo tung bao (unlikely Phase 1) |

**--- STATUS & OWNERSHIP ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **inventory_status** | ENUM | NOT NULL, DEFAULT 'AVAILABLE' | [TVL CONFIRMED] Trang thai ton kho: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. QC_HOLD da bo. Quyet dinh hang co the allocate cho SO hay khong |
| **owner_id** | VARCHAR(20) | FK -> owner(storerkey), NOT NULL | Chu hang. BAT BUOC vi TVL la 3PL - moi dong inventory phai biet thuoc chu hang nao. Anh huong billing, bao cao |

**--- CONFIG (Phase 2+) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **config_id** | VARCHAR(20) | NULLABLE | Product configuration (mau sac, kich thuoc). Phase 2+ neu TVL quan ly nhieu variant cua 1 SKU |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao dimension record |

### Design Notes

- *Index strategy: PRIMARY on id. UNIQUE on dim_hash. Composite index on (item referencing tables) + warehouse_id + owner_id cho fast lookup.*
- *Dimension group concept: TVL co the config bang rieng InventDimGroup de quyet dinh kho nao bat batch, kho nao bat serial. Phase 1: hardcode config.*

---

# 10. On-Hand Inventory (Ton kho hien tai)

**Table:** `on_hand`

Ton kho hien tai theo Item + Dimension. Day la 'single source of truth' cho so luong ton kho thuc te trong he thong. Moi dong = 1 SKU tai 1 vi tri cu the voi 1 to hop dimension cu the. He thong KHONG truy van chung tu (ASN/SO) de tinh ton — chi dung on_hand table nay.

> **CRITICAL:** QUY TAC VANG: OnHand.physical_qty(item, dim) = SUM(InventTrans.qty WHERE item AND dim AND stage IN (PHYSICAL)). Bat ky luc nao vi pham -> can reconciliation.

> **CRITICAL:** KHONG BAO GIO cap nhat on_hand truc tiep tu UI hoac API. Luon thong qua InventTrans -> trigger update on_hand.

> *Note:* [TVL CONFIRMED] available_qty = physical_qty - reserved_qty (QC_HOLD bo, qc_hold_qty luon = 0 Phase 1). He thong tu tinh, KHONG cho sua tay.

> *Note:* Moi khi InventTrans duoc post, he thong PHAI cap nhat dong on_hand tuong ung. Neu dong chua ton tai, INSERT moi.

> *Note:* last_movement_at dung cho bao cao 'hang ton lau' (slow-moving inventory) va tinh storage fee khi hang khong co bien dong.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **item_id** | VARCHAR(50) | FK -> item(sku), NOT NULL | Ma hang hoa (SKU). Ket hop voi invent_dim_id tao thanh composite key duy nhat cho tung dong ton kho |
| **invent_dim_id** | UUID | FK -> invent_dim(id), NOT NULL | Tham chieu den to hop dimension. UNIQUE constraint: (item_id, invent_dim_id) khong duoc trung |

**--- QUANTITY FIELDS (KG) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **physical_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | So luong vat ly hien co tai vi tri (kg). = tong InventTrans da post (Received - Issued). Day la con so 'thuc te dang nam trong kho' |
| **available_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | [TVL CONFIRMED] So luong kha dung de allocate (kg). = physical_qty - reserved_qty. (QC_HOLD da bo khoi Go-Live nen khong tru qc_hold_qty). He thong dung con so nay khi chay FIFO allocation |
| **reserved_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | So luong da giu cho SO/Shipment (kg). Tang khi allocate, giam khi pick hoac un-allocate. Hard reservation tru Available |
| **ordered_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | So luong dang cho nhan tu PO/ASN (kg). = expected inbound chua received. Tang khi confirm PO, giam khi register receipt |
| **registered_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | So luong da register nhung chua putaway (kg). Hang dang o STAGING. Tang khi receiving, giam khi putaway complete |
| **picked_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | So luong da pick chua ship (kg). Hang o staging outbound. Tang khi pick complete, giam khi ship confirm |
| **qc_hold_qty** | DECIMAL(15,3) | NOT NULL, DEFAULT 0 | [TVL CONFIRMED] Phase 1: LUON = 0 vi QC_HOLD da bo. Field giu lai cho Phase 2 neu TVL bat QC process. Khi bat: tru khoi available. Tang khi chuyen status -> QC_HOLD, giam khi release |

**--- UOM ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **uom** | VARCHAR(10) | FK -> uom(code), NOT NULL, DEFAULT 'KG' | Don vi tinh cua cac truong qty. Mac dinh KG cho bulk cargo TVL. Tat ca qty fields phai cung UOM |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **last_movement_at** | TIMESTAMPTZ | NULLABLE | Thoi diem bien dong cuoi cung. Dung cho bao cao 'hang ton lau' va tinh storage fee |
| **last_count_at** | TIMESTAMPTZ | NULLABLE | Thoi diem kiem ke cuoi cung. Dung de xac dinh vi tri can cycle count tiep theo |
| **updated_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian cap nhat cuoi (auto-update moi khi qty thay doi) |

### Design Notes

- *Reconciliation job: chay dinh ky (daily hoac on-demand) de so sanh on_hand vs SUM(invent_trans). Log chenh lech vao bang rieng.*
- *Performance: Index (item_id, invent_dim_id) UNIQUE. Index (owner_id, warehouse_id) cho bao cao theo chu hang/kho.*
- *Snapshot: He thong chup snapshot on_hand cuoi moi ngay (23:59 local timezone warehouse) de tinh storage billing.*

---

# 11. Inventory Transaction (InventTrans) (Giao dich ton kho)

**Table:** `invent_trans`

Inventory transaction ledger — ghi nhan MOI bien dong ton kho trong he thong. Day la 'xuong song' cua kien truc D365. Moi su kien nghiep vu (nhan hang, xuat kho, chuyen kho, dieu chinh, kiem ke, doi trang thai) deu tao 1 hoac nhieu records trong bang nay. Tu invent_trans, he thong tinh nguoc ra on_hand va tao bao cao bien dong.

> **CRITICAL:** DAY LA GAP LON NHAT trong he thong hien tai (0% hoan thien theo Gap Analysis). Can xay dung DAU TIEN truoc khi update State Machine.

> **CRITICAL:** MOI WorkLine.complete PHAI tao 1 InventTrans. Khong co ngoai le.

> **CRITICAL:** external_id BAT BUOC check truoc khi insert — idempotency rule. Neu trung -> reject va return trans_id cu.

> **CRITICAL:** [TVL CONFIRMED] Posting points: Inbound = RECEIVED state (khi hoan thanh nhan hang). Outbound = SHIPPED state (khi hoan thanh xuat kho). Cac state trung gian (PICKING, STAGING) KHONG tao InventTrans stage=PHYSICAL.

> *Note:* qty DUONG = nhan vao (receipt, increase, transfer-in). qty AM = xuat ra (issue, decrease, transfer-out).

> *Note:* dim_from_id va dim_to_id cho phep track chuyen dong tu dau den dau. VD: putaway: from=STAGING, to=STORAGE.

> *Note:* weighbridge_ticket_id la truong dac thu TVL bulk cargo — link giao dich voi phieu can de audit.

> *Note:* is_reversed + reversed_by_trans_id: KHONG bao gio xoa trans cu. Reverse = tao trans moi voi qty nguoc lai.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong. Moi bien dong ton kho = 1 record InventTrans |
| **trans_id** | VARCHAR(30) | UNIQUE, NOT NULL | Ma giao dich readable. Format: TRX-YYYYMMDD-SEQ. VD: 'TRX-20260315-000001' |
| **posted_at** | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Thoi diem post giao dich. CRITICAL cho stock ledger reconciliation va bao cao. Immutable sau khi post |

**--- REFERENCE (Link to source document) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **ref_type** | ENUM | NOT NULL | Loai chung tu goc: PO, ASN, SO, SHIPMENT, TRANSFER, ADJUSTMENT, CYCLE_COUNT, STATUS_CHANGE, MOVE. Quyet dinh logic xu ly |
| **ref_id** | VARCHAR(30) | NOT NULL | Ma chung tu goc (Header ID). VD: 'RCV-20260315-001' (ASN), 'SHP-20260315-001' (Shipment) |
| **ref_line_id** | VARCHAR(30) | NULLABLE | Ma dong chung tu (Line ID). NULL cho header-level events (VD: cancel toan bo). NOT NULL cho line-level (receipt per line) |
| **external_id** | VARCHAR(50) | NULLABLE | ID tu he thong ngoai (EDI/API). Dung cho idempotency check: neu external_id da ton tai -> reject duplicate |

**--- ITEM & QUANTITY ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **item_id** | VARCHAR(50) | FK -> item(sku), NOT NULL | Ma hang hoa. Moi InventTrans chi cho 1 SKU (khong mix) |
| **qty** | DECIMAL(15,3) | NOT NULL | So luong bien dong (kg). DUONG = nhan vao (receipt/increase). AM = xuat ra (issue/decrease). VD: +15200.500 (nhan), -8500.000 (xuat) |
| **uom** | VARCHAR(10) | FK -> uom(code), NOT NULL, DEFAULT 'KG' | Don vi tinh cua qty. Mac dinh KG cho bulk cargo TVL |

**--- DIMENSIONS (From / To) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **dim_from_id** | UUID | FK -> invent_dim(id), NULLABLE | Dimension xuat. NULLABLE cho receipt (khong co nguon noi bo). NOT NULL cho issue, move, transfer ship |
| **dim_to_id** | UUID | FK -> invent_dim(id), NULLABLE | Dimension nhap. NULLABLE cho issue (hang ra khoi kho). NOT NULL cho receipt, putaway, transfer receive |

**--- STATUS & STAGE ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **status_from** | ENUM | NULLABLE | [TVL CONFIRMED] Trang thai truoc: ORDERED, REGISTERED, AVAILABLE, RESERVED, PICKED, DAMAGED, BLOCKED, IN_TRANSIT. (QC_HOLD da bo khoi Go-Live) |
| **status_to** | ENUM | NOT NULL | Trang thai sau. VD: ORDERED->REGISTERED (receipt register), AVAILABLE->RESERVED (allocate), RESERVED->PICKED (pick) |
| **stage** | ENUM | NOT NULL | [TVL CONFIRMED] Giai doan giao dich: EXPECTED, REGISTERED, PHYSICAL, DEDUCTED, CANCELLED. Posting points: Inbound post tai RECEIVED state, Outbound post tai SHIPPED state. Quyet dinh anh huong len OnHand nao |

**--- BUSINESS CONTEXT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **reason_code** | VARCHAR(20) | FK -> reason_code(code), NULLABLE | Ma ly do. BAT BUOC cho: ADJUSTMENT, STATUS_CHANGE, discrepancy. NULLABLE cho receipt/issue binh thuong |
| **owner_id** | VARCHAR(20) | FK -> owner(storerkey), NOT NULL | Chu hang. Denormalize tu dim de query nhanh. Moi trans phai biet thuoc chu hang nao (3PL requirement) |
| **weighbridge_ticket_id** | VARCHAR(30) | NULLABLE | Ma phieu can. Link den weighbridge system cho bulk cargo. VD: 'WB-20260315-042'. Dung cho audit trail can-nhap/can-xuat |
| **notes** | VARCHAR(500) | NULLABLE | Ghi chu bo sung. VD: 'Hang bi uot do mua', 'Chenh lech 0.5% do do am' |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_by** | UUID | FK -> users, NOT NULL | Nguoi thuc hien giao dich |
| **is_reversed** | BOOLEAN | DEFAULT FALSE, NOT NULL | Giao dich da bi reverse chua? Reverse = tao trans moi voi qty nguoc lai, khong xoa trans cu |
| **reversed_by_trans_id** | VARCHAR(30) | NULLABLE | Ma giao dich reverse (neu is_reversed = TRUE). Tao cap link 2 chieu |

### Design Notes

- *Immutable: sau khi post, InventTrans KHONG duoc sua. Chi co the reverse (tao trans moi nguoc lai).*
- *Index: trans_id UNIQUE. (ref_type, ref_id, ref_line_id) cho lookup theo chung tu. (item_id, posted_at) cho stock ledger report.*
- *Partitioning: neu du lieu lon (>10M records/year), partition theo posted_at (monthly) de dam bao performance.*
- *TVL specific: weighbridge_ticket_id cho phep trace tu InventTrans -> phieu can -> trong luong thuc can. Critical cho audit bulk cargo.*

---

# 12. License Plate Number — Header [DEFERRED — Phase 2] (Nhan License Plate / Pallet)

**Table:** `lpn_header`

[TVL CONFIRMED] Phase 1: KHONG dung LPN/pallet tracking. TVL khong su dung pallet vat ly cho ca bulk cargo lan bagged goods. Table nay duoc giu trong schema de Phase 2 bat len khi can ma khong thay doi kien truc. Phase 1: KHONG implement, KHONG tao LPN records.

> **CRITICAL:** [TVL CONFIRMED] Phase 1: DEFERRED. TVL khong dung pallet vat ly. Table giu trong schema cho Phase 2.

> **CRITICAL:** Phase 2: Neu TVL bat dau dung pallet cho bagged goods hoac can track container, bat LPN len tai thoi diem do.

> *Note:* lpn_type=BULK_LOT la dac thu TVL: 1 dong hang xa o 1 vi tri = 1 LPN logic. Khong co pallet vat ly.

> *Note:* total_net_weight_kg = SUM(lpn_line.qty) cho cross-check. Chenh lech -> canh bao.

> *Note:* LPN status CLOSED: khong them duoc hang. Phai tao LPN moi hoac REOPEN (can quyen).


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **lpn_id** | VARCHAR(30) | UNIQUE, NOT NULL | Ma License Plate. Format: LPN-YYYYMMDD-SEQ. VD: 'LPN-20260315-0001'. In barcode/QR len pallet tag |

**--- LOCATION & STATUS ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **warehouse_id** | VARCHAR(10) | FK -> warehouse(code), NOT NULL | Kho hien tai cua LPN |
| **location_id** | VARCHAR(30) | FK -> location(loc), NULLABLE | Vi tri hien tai. NULL khi LPN dang transit hoac chua putaway |
| **status** | ENUM | NOT NULL, DEFAULT 'OPEN' | Trang thai LPN: OPEN (dang nhan hang), CLOSED (da dong - khong them duoc), IN_TRANSIT, SHIPPED, CONSUMED |
| **lpn_type** | ENUM | NOT NULL, DEFAULT 'PALLET' | Loai LPN: PALLET (pallet go/nhua), BULK_LOT (lo hang xa - 1 dong trong 1 vi tri), BAG_STACK (chong bao), CONTAINER |

**--- OWNERSHIP ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **owner_id** | VARCHAR(20) | FK -> owner(storerkey), NOT NULL | Chu hang. 1 LPN chi chua hang cua 1 owner (khong mix owner tren cung pallet) |

**--- WEIGHT (for bulk cargo) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **total_gross_weight_kg** | DECIMAL(15,3) | NULLABLE | Tong trong luong gross cua LPN (kg). Cap nhat khi dong LPN. Dung cho loading/weighbridge cross-check |
| **total_net_weight_kg** | DECIMAL(15,3) | NULLABLE | Tong trong luong net = gross - tare (pallet weight). Dung cho inventory qty verification |
| **tare_weight_kg** | DECIMAL(8,3) | NULLABLE | Trong luong pallet/container rong (kg). VD: pallet go = 25kg, pallet nhua = 15kg |

**--- REFERENCE ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **source_ref_type** | ENUM | NULLABLE | Nguon tao LPN: ASN_RECEIPT, PICK, REPACK, TRANSFER. Truy vet LPN duoc tao tu process nao |
| **source_ref_id** | VARCHAR(30) | NULLABLE | Ma chung tu goc tao LPN. VD: 'RCV-20260315-001' |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_by** | UUID | FK -> users, NOT NULL | Nguoi tao LPN |
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao |
| **closed_at** | TIMESTAMPTZ | NULLABLE | Thoi gian dong LPN. NULL neu status != CLOSED |
| **updated_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian cap nhat cuoi |

### Design Notes

- *Barcode: lpn_id duoc in thanh barcode/QR tren pallet tag. Mobile app scan LPN de xac dinh hang tren pallet.*
- *1 LPN = 1 Owner (khong mix). 1 LPN tai 1 thoi diem chi o 1 Location.*

---

# 13. License Plate Number — Line [DEFERRED — Phase 2] (Chi tiet License Plate)

**Table:** `lpn_line`

[TVL CONFIRMED] Phase 1: DEFERRED cung voi lpn_header. Chi tiet hang tren moi LPN/pallet. Table giu trong schema cho Phase 2. 1 LPN co the chua nhieu SKU hoac nhieu lot cua cung SKU. Moi dong = 1 SKU + 1 Dimension combination.

> *Note:* bag_count va bag_weight_kg chi dung cho hang bao. Null cho bulk cargo.

> *Note:* invent_dim_id link den InventDim -> biet chinh xac owner, location, batch, status cua dong hang nay.

> *Note:* qty phai khop voi on_hand tai dim tuong ung. Chenh lech = can cycle count.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **lpn_id** | VARCHAR(30) | FK -> lpn_header(lpn_id), NOT NULL | Ma LPN header. 1 LPN co nhieu lines (nhieu SKU hoac nhieu lot tren cung pallet) |
| **line_num** | INTEGER | NOT NULL | So thu tu dong trong LPN. Unique constraint: (lpn_id, line_num) |

**--- ITEM & QUANTITY ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **item_id** | VARCHAR(50) | FK -> item(sku), NOT NULL | Ma hang hoa tren dong nay |
| **qty** | DECIMAL(15,3) | NOT NULL | So luong tren dong (kg). Cho bulk cargo: trong luong thuc te. Cho bagged: so bao x trong luong/bao |
| **uom** | VARCHAR(10) | FK -> uom(code), NOT NULL, DEFAULT 'KG' | Don vi tinh |

**--- DIMENSIONS ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **invent_dim_id** | UUID | FK -> invent_dim(id), NOT NULL | Dimension cua dong hang nay (owner, location, batch, status). Link den invent_dim table |
| **batch_id** | VARCHAR(50) | NULLABLE | Ma lo (denormalize tu dim). Tien cho scan/query nhanh tren mobile |

**--- BAG SPECIFIC (for bagged goods on pallet) ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **bag_count** | INTEGER | NULLABLE | So bao tren dong nay. Chi dung cho hang bao (bagged goods). NULL cho bulk. VD: 40 bao x 50kg = 2000kg qty |
| **bag_weight_kg** | DECIMAL(10,3) | NULLABLE | Trong luong moi bao (kg). Chi dung cho hang bao. VD: 50.000 kg/bao |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao dong |

### Design Notes

- *UNIQUE constraint: (lpn_id, line_num). Hoac (lpn_id, item_id, invent_dim_id) neu muon merge dong cung SKU+dim.*
- *TVL bagged goods: VD pallet co 40 bao DAP 50kg -> qty=2000, bag_count=40, bag_weight_kg=50.000*

---

# 14. Work Order — Header (Lenh cong viec)

**Table:** `work_header`

Work order header — dieu phoi moi thao tac trong kho. Trong D365 WMS, MOI hoat dong (putaway, pick, replenish, cycle count, move) deu tao Work. Mobile app hien thi danh sach Work cho nhan vien thuc hien. He thong hien tai cua TVL co pick_task — work_header la ban generalize day du hon.

> **CRITICAL:** Phase 1 TVL co the dung simplified model (chi PUTAWAY + PICK + MOVE). Full model (REPLENISH, CYCLE_COUNT, LOAD) cho Phase 2.

> **CRITICAL:** Moi WorkLine complete -> post 1 InventTrans. WorkHeader complete khi TAT CA WorkLines complete.

> *Note:* work_type quyet dinh luong xu ly: PUTAWAY tao tu ASN receipt, PICK tao tu Shipment allocation, CYCLE_COUNT tao tu count schedule.

> *Note:* priority anh huong thu tu hien thi tren mobile. VD: hang gap (urgent pick) co priority=10, putaway binh thuong=50.

> *Note:* [TVL CONFIRMED] Self-claim model: assigned_to luon NULL khi tao. Nhan vien TU CHU DONG mo mobile app, thay danh sach work, va bam 'Claim' de tu assign cho minh. Khong co Supervisor phan cong.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **work_id** | VARCHAR(30) | UNIQUE, NOT NULL | Ma cong viec. Format: WRK-YYYYMMDD-SEQ. VD: 'WRK-20260315-000001' |

**--- WORK TYPE & STATUS ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **work_type** | ENUM | NOT NULL | Loai cong viec: PUTAWAY (nhan->cat kho), PICK (lay hang), REPLENISH (bo sung), CYCLE_COUNT (kiem ke), MOVE (di chuyen noi bo), LOAD (chat xe) |
| **status** | ENUM | NOT NULL, DEFAULT 'OPEN' | Trang thai: OPEN (moi tao), IN_PROGRESS (dang thuc hien), COMPLETED (hoan thanh), CANCELLED (huy). Chi cho phep CANCEL khi OPEN |
| **priority** | INTEGER | NOT NULL, DEFAULT 50 | Do uu tien (1=cao nhat, 99=thap nhat). VD: Urgent pick = 10, Normal putaway = 50. Mobile app sort theo priority |

**--- WAREHOUSE CONTEXT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **warehouse_id** | VARCHAR(10) | FK -> warehouse(code), NOT NULL | Kho thuc hien cong viec |
| **zone_id** | VARCHAR(20) | NULLABLE | Zone chinh cua work (de assign nhan vien theo zone) |

**--- SOURCE DOCUMENT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **source_type** | ENUM | NOT NULL | Loai chung tu goc: ASN (inbound), SHIPMENT (outbound), TRANSFER, ADJUSTMENT, COUNT, MANUAL |
| **source_id** | VARCHAR(30) | NOT NULL | Ma chung tu goc. VD: 'RCV-20260315-001' (ASN), 'SHP-20260315-001' (Shipment) |
| **source_line_id** | VARCHAR(30) | NULLABLE | Ma dong chung tu. NULL cho work level header |

**--- OWNERSHIP ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **owner_id** | VARCHAR(20) | FK -> owner(storerkey), NOT NULL | Chu hang (denormalize). De phan quyen va bao cao theo owner |

**--- ASSIGNMENT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **assigned_to** | UUID | FK -> users, NULLABLE | [TVL CONFIRMED] Nhan vien tu nhan work (self-claim). Luon NULL khi tao moi. Nhan vien mo mobile app -> thay danh sach open work -> bam 'Claim' -> he thong set assigned_to = user_id. Khong co directed assignment tu Supervisor |
| **assigned_at** | TIMESTAMPTZ | NULLABLE | Thoi diem assign |
| **started_at** | TIMESTAMPTZ | NULLABLE | Thoi diem bat dau thuc hien (nhan vien bam 'Start' tren mobile) |
| **completed_at** | TIMESTAMPTZ | NULLABLE | Thoi diem hoan thanh. Dung tinh work duration = completed_at - started_at |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **created_by** | UUID | FK -> users, NOT NULL | Nguoi tao work (thuong la he thong tu sinh) |
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao |
| **updated_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian cap nhat cuoi |

### Design Notes

- *State transitions: OPEN -> IN_PROGRESS (khi nhan vien Claim + Start) -> COMPLETED (khi all lines done). OPEN -> CANCELLED (chi khi chua ai claim).*
- *[TVL CONFIRMED] Mobile UX Self-Claim: hien thi grouped by work_type va sorted by priority. Nhan vien thay PICK truoc PUTAWAY (configurable). Nhan vien bam 'Claim' -> work chuyen tu OPEN sang IN_PROGRESS. 1 work chi duoc 1 nguoi claim.*
- *SLA tracking: completed_at - created_at = total work duration. completed_at - started_at = execution time. Claim time = assigned_at - created_at (cho biet work cho bao lau).*

---

# 15. Work Order — Line (Chi tiet buoc cong viec)

**Table:** `work_line`

Tung buoc thuc hien trong 1 work order. VD: Putaway work co 2 lines: line 1 = RECEIVE (nhan tai staging), line 2 = PUT (dat vao location luu tru). Pick work co 2 lines: line 1 = PICK (lay tu storage), line 2 = STAGE (dat tai staging outbound). Moi step complete -> tao 1 InventTrans.

> **CRITICAL:** 1 WorkLine complete = 1 InventTrans. Day la quy tac bat buoc cua D365 work-driven execution.

> *Note:* step_type ket hop voi work_header.work_type quyet dinh logic: PUTAWAY work chi co RECEIVE + PUT steps. PICK work chi co PICK + STAGE/PACK steps.

> *Note:* actual_qty co the khac expected_qty (variance). He thong tu tinh variance va apply blocking rule neu vuot tolerance.

> *Note:* invent_trans_id duoc populate SAU KHI step complete. Truoc do = NULL. Day la link truc tiep tu execution -> inventory.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **work_id** | VARCHAR(30) | FK -> work_header(work_id), NOT NULL | Ma work header. 1 work co nhieu lines (steps) |
| **line_num** | INTEGER | NOT NULL | So thu tu buoc. VD: Putaway work: line 1 = Receive, line 2 = Put. Pick work: line 1 = Pick, line 2 = Pack/Stage |

**--- STEP DEFINITION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **step_type** | ENUM | NOT NULL | Loai buoc: RECEIVE (nhan), PUT (cat), PICK (lay), PACK (dong goi), STAGE (tap ket), LOAD (chat xe), COUNT (dem), MOVE_FROM, MOVE_TO |
| **status** | ENUM | NOT NULL, DEFAULT 'OPEN' | Trang thai buoc: OPEN, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED |

**--- LOCATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **from_location_id** | VARCHAR(30) | FK -> location(loc), NULLABLE | Vi tri nguon (pick from, move from). NULL cho receive step (hang tu ben ngoai vao) |
| **to_location_id** | VARCHAR(30) | FK -> location(loc), NULLABLE | Vi tri dich (put to, stage to). NULL cho ship/issue step (hang ra khoi kho) |

**--- ITEM & QUANTITY ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **item_id** | VARCHAR(50) | FK -> item(sku), NOT NULL | Ma hang hoa |
| **expected_qty** | DECIMAL(15,3) | NOT NULL | So luong du kien (kg). Tu allocation/plan |
| **actual_qty** | DECIMAL(15,3) | NULLABLE | So luong thuc te (kg). Cap nhat khi complete step. Cho bulk: tu weighbridge. Cho bagged: tu dem bao |
| **uom** | VARCHAR(10) | FK -> uom(code), NOT NULL, DEFAULT 'KG' | Don vi tinh |

**--- DIMENSIONS ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **invent_dim_id** | UUID | FK -> invent_dim(id), NULLABLE | Dimension cua dong. Xac dinh batch, status, owner tai thoi diem thuc hien |
| **lpn_id** | VARCHAR(30) | FK -> lpn_header(lpn_id), NULLABLE | LPN lien quan (neu pick/put theo pallet). NULL cho bulk floor operations |

**--- INVENTTRANS INTEGRATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **invent_trans_id** | UUID | FK -> invent_trans(id), NULLABLE | Link den InventTrans duoc tao khi step complete. NULL truoc khi post. 1 WorkLine complete = 1 InventTrans |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **completed_by** | UUID | FK -> users, NULLABLE | Nguoi hoan thanh buoc (scan/confirm tren mobile) |
| **completed_at** | TIMESTAMPTZ | NULLABLE | Thoi diem hoan thanh |
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao |

### Design Notes

- *Step sequence: line_num quyet dinh thu tu. He thong BAT BUOC hoan thanh line N truoc khi cho phep line N+1.*
- *Variance handling: IF actual_qty != expected_qty THEN check tolerance. IF > tolerance -> block work, require approval.*
- *Mobile flow: line 1 PICK -> scan from_location -> scan item -> enter qty -> confirm. Line 2 STAGE -> scan to_location -> confirm.*

---

# 16. Inventory Status (Lookup Table) (Trang thai ton kho)

**Table:** `inventory_status`

Lookup table cho trang thai ton kho. Trong PRD v1.0, inventory_status nam trong item schema nhu ENUM. Theo D365 reference, can tach thanh bang rieng de: (1) dinh nghia transition rules (status nao duoc chuyen sang status nao), (2) dinh nghia behavior flags (anh huong den allocation, billing, outbound), (3) de mo rong khi can them status moi ma khong sua schema.

> **CRITICAL:** [TVL CONFIRMED] blocks_outbound = TRUE cho DAMAGED, BLOCKED. He thong PHAI check truoc khi allocate cho SO. QC_HOLD da bo khoi Go-Live scope.

> *Note:* [TVL CONFIRMED] allowed_transitions_to khong co QC_HOLD. VD: AVAILABLE -> ['DAMAGED','BLOCKED']. He thong validate TRUOC khi cho doi status.

> *Note:* is_billable_storage quyet dinh hang o status nay co tinh phi luu kho khong. IN_TRANSIT = FALSE vi hang khong nam trong kho.

> *Note:* color_code dung cho dashboard/UI — giup operator nhanh chong nhan biet trang thai khi xem bao cao.


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **code** | VARCHAR(20) | PK, NOT NULL, UNIQUE | [TVL CONFIRMED] Ma trang thai. Go-Live: 'AVAILABLE', 'DAMAGED', 'BLOCKED', 'IN_TRANSIT'. TVL xac nhan KHONG can QC_HOLD (bo) |
| **name** | VARCHAR(100) | NOT NULL | Ten hien thi. VD: 'Kha dung', 'Hu hong', 'Bi khoa', 'Dang van chuyen' |
| **description** | VARCHAR(500) | NULLABLE | Mo ta chi tiet: khi nao dung, ai co quyen set, anh huong gi |

**--- BEHAVIOR FLAGS ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **is_available_for_allocation** | BOOLEAN | NOT NULL, DEFAULT FALSE | Trang thai nay cho phep allocate cho SO? Chi AVAILABLE = TRUE. DAMAGED, BLOCKED, IN_TRANSIT = FALSE |
| **is_countable** | BOOLEAN | NOT NULL, DEFAULT TRUE | Tinh vao so luong kiem ke? Thuong = TRUE tru IN_TRANSIT |
| **is_billable_storage** | BOOLEAN | NOT NULL, DEFAULT TRUE | Tinh phi luu kho? AVAILABLE, DAMAGED = TRUE. IN_TRANSIT = FALSE. CRITICAL cho billing accuracy |
| **requires_approval_to_release** | BOOLEAN | NOT NULL, DEFAULT FALSE | Can duyet de chuyen ve AVAILABLE? DAMAGED = TRUE (can Manager approve). BLOCKED = TRUE (admin only) |
| **blocks_outbound** | BOOLEAN | NOT NULL, DEFAULT FALSE | Chan xuat kho? DAMAGED, BLOCKED = TRUE. AVAILABLE, IN_TRANSIT = FALSE |

**--- TRANSITION RULES ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **allowed_transitions_to** | JSONB | NOT NULL | [TVL CONFIRMED] Danh sach status duoc phep chuyen sang (khong co QC_HOLD). VD: AVAILABLE -> ['DAMAGED','BLOCKED']. DAMAGED -> ['AVAILABLE','BLOCKED']. BLOCKED -> ['AVAILABLE']. IN_TRANSIT -> ['AVAILABLE']. Dung JSONB array |

**--- DISPLAY ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **color_code** | VARCHAR(7) | NULLABLE | Ma mau hien thi (hex). VD: AVAILABLE='#28A745', DAMAGED='#DC3545'. Dung cho UI/dashboard |
| **sort_order** | INTEGER | NOT NULL, DEFAULT 99 | Thu tu hien thi trong dropdown/report. AVAILABLE=1, DAMAGED=2, BLOCKED=3, IN_TRANSIT=4 |
| **is_active** | BOOLEAN | DEFAULT TRUE, NOT NULL | Trang thai hoat dong. FALSE = an khoi dropdown nhung van giu du lieu cu |

### Design Notes

- *Pre-loaded data (Go-Live): AVAILABLE (green, allocable, billable), DAMAGED (red, blocked outbound, need approval), BLOCKED (gray, blocked, admin only), IN_TRANSIT (blue, not countable, not billable). [TVL CONFIRMED] QC_HOLD da bo — khong can cho Go-Live.*
- *TVL bulk cargo specific: co the them status 'WET' (hang bi uot) va 'CONTAMINATED' (hang bi lan) cho Phase 2. Hoac them lai QC_HOLD neu quy trinh QC duoc formalize sau.*

---

# 17. Number Sequence Configuration (Cau hinh sinh so tu dong)

**Table:** `number_sequence`

Cau hinh sinh so tu dong cho moi loai chung tu/entity. He thong hien tai da dinh nghia pattern RCV-YYYYMMDD-SEQ va SHP-YYYYMMDD-SEQ. Bang nay formalize thanh configurable setup — cho phep TVL tu thay doi format, reset policy, va scope ma khong can sua code.

> **CRITICAL:** Concurrency: dung SELECT FOR UPDATE hoac atomic increment de tranh 2 request cung lay trung so. Day la critical cho high-volume warehouse.

> *Note:* [TVL CONFIRMED] scope = PER_WAREHOUSE -> moi kho co counter rieng. VD: WH5.1 va WH5.3 co sequence rieng biet.

> *Note:* current_date + current_value: khi ngay thay doi, current_value tu reset ve 0. Dam bao SEQ khong bi trung giua cac ngay.

> *Note:* Format output: PREFIX + SEPARATOR + DATE + SEPARATOR + zero-padded(current_value + 1, sequence_length). VD: WRK-20260315-000001


**--- IDENTIFICATION ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **id** | UUID | PK, NOT NULL | Khoa chinh tu dong |
| **sequence_code** | VARCHAR(20) | UNIQUE, NOT NULL | Ma loai so. VD: 'RCV' (Receipt/ASN), 'SHP' (Shipment), 'WRK' (Work), 'TRF' (Transfer), 'ADJ' (Adjustment), 'TRX' (InventTrans), 'LPN', 'INV' (Invoice) |
| **description** | VARCHAR(200) | NOT NULL | Mo ta. VD: 'Receipt/ASN number sequence', 'Shipment number sequence' |

**--- FORMAT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **prefix** | VARCHAR(10) | NOT NULL | Tien to. VD: 'RCV', 'SHP', 'WRK', 'TRF', 'ADJ', 'TRX', 'LPN', 'INV' |
| **separator** | VARCHAR(1) | NOT NULL, DEFAULT '-' | Ky tu ngan cach. VD: '-' -> 'RCV-20260315-000001' |
| **date_format** | VARCHAR(20) | NOT NULL, DEFAULT 'YYYYMMDD' | Dinh dang ngay trong so. VD: 'YYYYMMDD' -> '20260315', 'YYYYMM' -> '202603' |
| **sequence_length** | INTEGER | NOT NULL, DEFAULT 6 | So ky tu phan so thu tu (zero-padded). VD: 6 -> '000001'. Format hoan chinh: PREFIX-DATE-SEQNUM |

**--- COUNTER ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **current_date** | DATE | NOT NULL | Ngay hien tai cua counter. Khi ngay thay doi -> reset current_value ve 0. Auto-manage boi system |
| **current_value** | INTEGER | NOT NULL, DEFAULT 0 | Gia tri hien tai. Tang 1 moi khi generate so moi. Reset ve 0 khi current_date thay doi |

**--- SCOPE ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **scope_type** | ENUM | NOT NULL, DEFAULT 'PER_WAREHOUSE' | [TVL CONFIRMED] Pham vi: PER_WAREHOUSE (theo kho — moi kho co counter rieng). Cac option: GLOBAL (toan he thong), PER_WAREHOUSE, PER_OWNER (theo chu hang). TVL chon PER_WAREHOUSE -> so chung tu co prefix kho, khong trung giua cac kho |
| **scope_value** | VARCHAR(20) | NOT NULL | [TVL CONFIRMED] Gia tri pham vi = warehouse_code. VD: 'WH5.1', 'WH5.3', 'YARD01'. Moi kho co counter rieng. Ket qua: 'RCV-WH51-20260315-000001' (optional: them warehouse vao format) |

**--- AUDIT ---**

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **is_active** | BOOLEAN | DEFAULT TRUE, NOT NULL | Trang thai hoat dong |
| **created_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian tao |
| **updated_at** | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Thoi gian cap nhat cuoi |

### Design Notes

- *Pre-loaded sequences: RCV (ASN/Receipt), SHP (Shipment), WRK (Work), TRF (Transfer), ADJ (Adjustment), TRX (InventTrans), LPN (License Plate), INV (Invoice), WBT (Weighbridge Ticket).*
- *TVL co the them PO (Purchase Order), SO (Sale Order) neu muon SWM generate so thay vi ERP.*

---

# Appendix C: New Entity Relationships (v2.1 additions)

Foreign key relationships for the 9 new tables, complementing Appendix A in v1.0.

| From (table.field) | → | To (table.field) | Relationship |
|---------------------|---|-------------------|-------------|
| **invent_dim.warehouse_id** | → | **warehouse.code** | Dimension thuoc kho |
| **invent_dim.location_id** | → | **location.loc** | Dimension tai vi tri |
| **invent_dim.owner_id** | → | **owner.storerkey** | Dimension cua chu hang |
| **on_hand.item_id** | → | **item.sku** | Ton kho cua SKU nao |
| **on_hand.invent_dim_id** | → | **invent_dim.id** | Ton kho theo dimension nao |
| **invent_trans.item_id** | → | **item.sku** | Giao dich cho SKU nao |
| **invent_trans.dim_from_id** | → | **invent_dim.id** | Dim nguon cua giao dich |
| **invent_trans.dim_to_id** | → | **invent_dim.id** | Dim dich cua giao dich |
| **invent_trans.owner_id** | → | **owner.storerkey** | Giao dich cua chu hang |
| **invent_trans.reason_code** | → | **reason_code.code** | Ly do giao dich |
| **lpn_header.warehouse_id** | → | **warehouse.code** | LPN thuoc kho |
| **lpn_header.location_id** | → | **location.loc** | LPN tai vi tri |
| **lpn_header.owner_id** | → | **owner.storerkey** | LPN cua chu hang |
| **lpn_line.lpn_id** | → | **lpn_header.lpn_id** | Line thuoc LPN nao |
| **lpn_line.item_id** | → | **item.sku** | Hang tren LPN |
| **lpn_line.invent_dim_id** | → | **invent_dim.id** | Dim cua dong LPN |
| **work_header.warehouse_id** | → | **warehouse.code** | Work tai kho nao |
| **work_header.owner_id** | → | **owner.storerkey** | Work cho chu hang |
| **work_line.work_id** | → | **work_header.work_id** | Line thuoc work nao |
| **work_line.item_id** | → | **item.sku** | Work cho SKU nao |
| **work_line.from_location_id** | → | **location.loc** | Lay tu vi tri |
| **work_line.to_location_id** | → | **location.loc** | Dat vao vi tri |
| **work_line.invent_trans_id** | → | **invent_trans.id** | Link execution -> inventory ledger |

---

# Appendix D: Item Table Updates (v1.0 → v2.0)

Cac truong can bo sung vao Item table (Section 3 trong v1.0) de integrate voi entities moi:

| Field | Type | Constraint | Description | Why Needed |
|-------|------|-----------|-------------|------------|
| **reservation_policy** | ENUM | DEFAULT 'FIFO' | FIFO, FEFO, MANUAL | Cho allocation engine biet chon hang theo rule nao khi pick cho SO |
| **inventory_dim_group** | VARCHAR(20) | NULLABLE | Ma nhom dimension config | Quyet dinh SKU nay track batch? serial? status? Lien ket den dim group config (Phase 2) |
| **default_inventory_status** | ENUM | DEFAULT 'AVAILABLE' | Trang thai mac dinh khi receipt. [TVL] 4 options: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT (khong co QC_HOLD) | VD: hang xa vao kho luon AVAILABLE. Hang hu hong vao DAMAGED |

---

# TVL Confirmed Decisions (6/6 Questions Resolved)

1. **Q1 [CONFIRMED]:** Phase 1 KHONG bat Batch/Lot tracking cho bulk cargo. batch_id luon NULL. Xem xet Phase 2.
2. **Q2 [CONFIRMED]:** LPN tracking KHONG dung Phase 1. TVL khong su dung pallet vat ly. lpn_header + lpn_line DEFERRED Phase 2.
3. **Q3 [CONFIRMED]:** NumberSequence scope = PER_WAREHOUSE. Moi kho co counter rieng biet, so chung tu khong trung giua cac kho.
4. **Q4 [CONFIRMED]:** InventTrans posting point: Inbound = RECEIVED state. Outbound = SHIPPED state. Cac state trung gian khong post.
5. **Q5 [CONFIRMED]:** 4 Inventory Status Go-Live: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT. QC_HOLD da BO — khong can cho Go-Live.
6. **Q6 [CONFIRMED]:** Work assignment = Self-Claim. Nhan vien tu chu dong nhan work tren mobile app. Khong co Supervisor phan cong.

---

*Confidential — Thoresen Vinama Logistics / Smartlog*
