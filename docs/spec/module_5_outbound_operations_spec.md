# TVL SWM — Module Specification
# Module 5: Outbound Operations

**Du an:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)
**Goc nhin:** Product Owner + Business Analyst
**Phien ban:** 1.0
**Ngay:** 08/03/2026
**Trang thai:** Draft for Review
**Doi tuong doc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Key User

---

## 1. Muc dich tai lieu

Tai lieu nay dac ta chi tiet module **Outbound Operations** cua he thong SWM. Day la module chiu trach nhiem dua hang tu trang thai **ton kho san sang** sang trang thai **da xuat kho chinh thuc**, co the truy vet theo chuyen xe, theo shipment, theo tung lan can va theo owner.

Neu Module 4 la **operational gatekeeper cua hang nhap**, thi Module 5 la **operational gatekeeper cua hang xuat**. Module nay quyet dinh:
- Hang nao duoc phan bo (allocate) cho chuyen xuat nao.
- Khi nao hang thuc su roi kho (posting point = SHIPPED).
- Xu ly the nao khi tolerance fail giua vong can (PENDING_APPROVAL, khong dung xe).
- DPM dual tracking: kho tru theo can thuc, bao cao theo bag_count x nominal.
- Khi nao shipment duoc close va tro thanh immutable.

Tai lieu duoc viet theo huong:
- Nguoi business hieu ro vi sao outbound phai bam weighbridge, allocation-based hold va multi-trip weighing.
- Dev/QA co the boc tiep FS, API, state machine, exception handling, audit flow va integration points.
- Team du an co baseline thong nhat giua **Shipment layer**, **Allocation layer**, **Weighbridge layer**, **Posting point sang M3** va **handoff sang M7 Work Execution**.

---

## 2. Vi tri cua module trong toan chuong trinh

Trong ban do 11 module cua SWM, **Outbound Operations la Module 5**.

Day la module business bien "yeu cau xuat" thanh "hang da thuc su roi kho". Module nay khong so huu inventory ledger, nhung la noi quyet dinh **su kien nao du dieu kien de goi M3 post ton giam**, va **khi nao phai chan, reject hoac cho approval**.

Module 5 lien ket truc tiep voi:
- **M1 Foundation & Governance** de enforce quyen, reason code, audit va number sequence.
- **M2 Master Data** de lay owner, item, warehouse, location, tolerance baseline va cargo_form.
- **M3 Inventory Core Engine** de post outbound transaction tai `SHIPPED` va doc available_qty cho allocation.
- **M7 Work Execution** de auto-create pick work sau khi shipment duoc allocate.
- **M8 Weighbridge/OCR** de lay gross/tare weight cho multi-trip weighing sequence.
- **M10 Billing** de capture outbound handling event khi shipment duoc shipped.
- **M11 Reporting & Audit** de truy vet shipment history, exception, throughput outbound.

Noi ngan gon, Module 5 la **operational gatekeeper cua hang xuat**.

---

## 3. Boi canh nghiep vu khien module nay bat buoc phai co

TVL van hanh kho hang xa va hang bao voi dac thu:
- Outbound weighing la **multi-trip**: 1 xe co the cho nhieu loai hang (nhieu lines), can tung lan theo line.
- Thu tu can line do Keeper chon tu do (flexible sequence), khong bat buoc theo thu tu. [CONFIRMED — TC-09]
- Tolerance check xay ra **per line** trong vong can, khong phai cuoi cung moi check.
- Neu line fail tolerance, he thong **khong dung xe** — van cho can tiep cac line con lai. [CONFIRMED — TC-10]
- Chi sau khi tat ca lines da can xong, he thong moi tap trung xu ly exception (PENDING_APPROVAL).
- Allocation khong dung traditional reservation (soft/hard reserve) ma dung **allocation-based hold**: reserved_qty tang de hold, available_qty giam tuong ung. [CONFIRMED]
- DPM (Dam Phu My) la case dac biet: kho tru theo actual weight can, bao cao/billing theo bag_count x nominal_weight. [CONFIRMED]
- Inventory chi giam khi shipment thuc su dat `SHIPPED`, khong phai o ALLOCATED hay PICKING.

Trong moi truong nhu vay, neu khong co mot module outbound ro rang:
- Allocation co the over-commit stock cho nhieu shipment cung luc.
- Picking co the lam sai vi tri hoac sai so luong ma khong trace duoc.
- Tolerance fail co the dung ca chuyen xe giua vong can.
- Inventory co the bi tru qua som o ALLOCATED hoac PICKING.
- Billing va inventory khong con bam cung mot su kien nghiep vu.
- DPM co the bi tinh sai giua actual weight va nominal weight.

---

## 4. Muc tieu cua module

### 4.1 Muc tieu nghiep vu

- Chuan hoa outbound flow tu SO/delivery request den shipment closing.
- Bao dam allocation chi dung AVAILABLE stock va theo FIFO. [CONFIRMED]
- Bao dam picking duoc trace qua M7 Work Execution.
- Bao dam multi-trip weighing linh hoat va khong dung xe khi tolerance fail.
- Bao dam chi shipment hop le moi duoc post ton giam tai `SHIPPED`.
- Bao dam DPM dual tracking dung cho ca inventory va billing/report.
- Bao dam co flow ro rang cho cancel, exception approval va reversal.
- Bao dam hang bao va hang xa co blocking rules phu hop.

### 4.2 Muc tieu he thong

- Moi trip/xe tuong ung mot shipment de truy vet ro rang.
- Moi lan can phai co weighbridge log rieng.
- Posting sang M3 chi xay ra duy nhat tai `SHIPPED`.
- Allocation-based hold phai giu reserved_qty de tranh over-commit.
- Shipment close phai co dieu kien ro rang va trang thai da du chin.
- Retry/integration failure khong duoc sinh duplicate shipment hoac duplicate posting.

---

## 5. Pham vi cua module

### 5.1 In Scope — Phase 1

- Sales Order / Delivery Request intake
- Shipment creation: 1 shipment = 1 trip = 1 xe
- Shipment split: 1 SO -> nhieu shipment trips
- Allocation-based hold (FIFO, no traditional reservation) [CONFIRMED]
- Pick work creation (trigger M7)
- Multi-trip weighing sequence (flexible line order) [CONFIRMED]
- Outbound tolerance check per line
- PENDING_APPROVAL exception flow
- DPM dual tracking (actual net vs bag_count x nominal) [CONFIRMED]
- Outbound posting tai SHIPPED [CONFIRMED]
- Shipment cancel va allocation release
- Billing event capture tai SHIPPED
- Audit trail cho cancel, manual entry, exception approve/reject
- Bagged blocking per trip va bulk blocking per SO

### 5.2 Out of Scope / Phase 2

- Partial allocation / partial shipment [CONFIRMED — Phase 2]
- FEFO allocation (can Batch/Lot — Phase 2)
- Cross-docking
- Advanced loading dock scheduling
- Automated carrier assignment
- Returns / RMA processing

---

## 6. Nguyen tac thiet ke bat buoc cua module

1. **1 shipment = 1 trip = 1 xe.** [CONFIRMED — BR-OUT-001]
   Day la truc truy vet nghiep vu chinh cho outbound.

2. **Allocation-based hold, khong dung traditional reservation.** [CONFIRMED]
   reserved_qty tang de hold stock. available_qty = physical_qty - reserved_qty.

3. **Allocation theo FIFO (lot_date ASC).** [CONFIRMED — BR-OUT-002]
   Phase 1 khong co FEFO vi chua bat Batch/Lot.

4. **Allocation khong cho partial.** [CONFIRMED — BR-OUT-003]
   Neu tong available < expected → FAIL toan bo, khong allocate mot phan.

5. **Posting point outbound duy nhat la `SHIPPED`.** [CONFIRMED — BR-INV-003]
   ALLOCATED, PICKING, PICKED, WEIGHING chi hold reserved_qty, khong tru physical.

6. **Multi-trip weighing: tare truoc, gross tung line, thu tu tu do.** [CONFIRMED — TC-09, BR-WB-005]
   net_line_1 = gross_1 - tare. net_line_N = gross_N - gross_(N-1).

7. **Tolerance fail per line KHONG dung xe.** [CONFIRMED — TC-10]
   Line fail → flag PENDING_APPROVAL, van cho can tiep cac line con lai.

8. **PENDING_APPROVAL la trang thai M5 — chi WH_MANAGER resolve.** [CONFIRMED — EX-RULE-03]
   WH_MANAGER co the approve (→ SHIPPED) hoac reject (→ CANCELLED).

9. **DPM dual tracking.** [CONFIRMED — BR-OUT-006]
   InventTrans.qty = -actual_net_weight (tu can). Billing/Report = bag_count x nominal_weight_per_bag.

10. **Module 5 khong tu ghi ton kho truc tiep.** [CONFIRMED — CFM-01]
    M5 chi goi M3 posting engine khi du dieu kien nghiep vu.

---

## 7. Ket qua dau ra chinh cua module

Khi Module 5 duoc trien khai day du, he thong phai tao ra cac output sau:

1. Shipment records theo tung trip outbound.
2. Allocation records voi reserved_qty va location trace.
3. Pick work creation trigger sang M7.
4. Weighbridge-linked shipment history theo tung lan can per line.
5. Tolerance decision per line: pass hoac PENDING_APPROVAL.
6. Outbound posting trigger hop le sang M3 tai `SHIPPED`.
7. Outbound billing trigger/event cho M10.
8. Shipment lifecycle ro rang tu SO intake den close/cancel.
9. Exception trail cho PENDING_APPROVAL approve/reject, cancel, reversal.
10. Operational inquiry data cho dashboard outbound, audit va KPI.

---

## 8. Cac doi tuong du lieu ma module quan ly

Module nay so huu hoac quan ly truc tiep cac object sau:
- `shipment_header`
- `shipment_line`
- `allocation_record`
- `shipment_status_history`
- `shipment_exception_log`

### 8.2 Schema toi thieu cho shipment_header

| Field | Type | Ghi chu |
|---|---|---|
| id | UUID / PK | — |
| shipment_number | string | Auto-generated theo M1 NumberSequence: SHP-YYYYMMDD-SEQNUM |
| so_id | FK → sales_order (nullable) | SO lien quan. Nullable cho standalone shipment |
| owner_id | FK → owner | Chu hang |
| customer_id | FK → customer | Nguoi nhan hang |
| warehouse_id | FK → warehouse | Kho xuat |
| vehicle_number | string | Bien so xe |
| status | enum | DRAFT / CONFIRMED / ALLOCATED / PICKING / PICKED / WEIGHING_TARE / LOADING / ALL_WEIGHED / PENDING_APPROVAL / SHIPPED / CLOSED / CANCELLED |
| tare_weight_kg | decimal (nullable) | Tare (xe rong) |
| total_gross_kg | decimal (nullable) | Gross cuoi cung |
| total_net_kg | decimal (nullable) | = total_gross - tare |
| is_dpm_shipment | boolean | TRUE neu co item DPM |
| cancel_reason_code | string (nullable) | — |
| cancelled_by | FK → user (nullable) | — |
| cancelled_at | timestamp (nullable) | — |
| external_id | string (unique) | Idempotency key |
| correlation_id | string | Cross-service trace |
| source_app | string | web / integration |
| created_by | FK → user | — |
| created_at | timestamp | Immutable |
| updated_by | FK → user | — |
| updated_at | timestamp | — |

### 8.3 Schema toi thieu cho shipment_line

| Field | Type | Ghi chu |
|---|---|---|
| id | UUID / PK | — |
| shipment_header_id | FK → shipment_header | — |
| line_number | int | Thu tu dong |
| item_id | FK → item | Mat hang |
| cargo_form | enum | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO_1000KG |
| uom | string | KG, MT, BAG |
| expected_qty | decimal | So luong ky vong |
| allocated_qty | decimal (nullable) | Qty da allocate |
| picked_qty | decimal (nullable) | Qty da pick |
| shipped_qty | decimal (nullable) | Qty thuc xuat (= net_weight per line) |
| bag_count | int (nullable) | So bao — bagged goods only |
| nominal_weight_per_bag | decimal (nullable) | Trong luong danh nghia/bao |
| gross_weight_kg | decimal (nullable) | Gross cua lan can line nay |
| net_weight_kg | decimal (nullable) | Net cua line nay |
| tolerance_pct_applied | decimal (nullable) | — |
| variance_pct | decimal (nullable) | — |
| line_status | enum | PENDING / ALLOCATED / PICKING / PICKED / LOADING / LINE_SHIPPED / PENDING_APPROVAL |
| posted_trans_id | FK → invent_trans (nullable) | Link sang M3 |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### 8.4 Schema toi thieu cho allocation_record

| Field | Type | Ghi chu |
|---|---|---|
| id | UUID / PK | — |
| shipment_line_id | FK → shipment_line | — |
| location_id | FK → location | Source location |
| dim_id | FK → invent_dim | InventDim da allocate |
| allocated_qty | decimal | Qty allocated tu location nay |
| lot_date | date | Ngay nhap (cho FIFO sort) |
| status | enum | ALLOCATED / PICKED / RELEASED |
| created_at | timestamp | — |

Module nay khong so huu nhung tham chieu truc tiep toi:
- `sales_order`, `owner`, `item`, `warehouse`, `location`, `vehicle_master` tu M2
- `weighbridge_log`, scale integration result tu M8
- `invent_trans`, `invent_dim`, `on_hand` tu M3
- `work_header`, `work_line` tu M7
- `billing_event` tu M10

---

## 9. Danh sach sub-modules

Module Outbound Operations duoc chia thanh 9 sub-modules:

1. Sales Order Intake & Shipment Creation
2. Allocation-Based Hold (FIFO)
3. Pick Work Creation & Handoff to M7
4. Multi-Trip Weighing Execution
5. Outbound Tolerance Check & PENDING_APPROVAL
6. Outbound Posting Control (handoff sang M3)
7. DPM Dual Tracking
8. Shipment Cancel, Exception Handling & Close
9. Outbound Auditability, Idempotency & Reporting Hooks

---

## 10. Sub-module 1 — Sales Order Intake & Shipment Creation

### 10.1 Muc dich

Tao nen outbound dung ngay tu dau: SO/delivery request duoc tiep nhan, shipment duoc tao cho tung trip/xe.

### 10.2 Mo ta nghiep vu

Truoc khi hang xuat kho, he thong phai co SO hoac delivery request lam co so. Tu SO, WH_MANAGER tao shipment cho tung chuyen xe. Mot SO co the co nhieu shipment (multi-trip). Shipment cung co the standalone (khong can SO).

### 10.3 Input

| Input | Mo ta |
|---|---|
| so_id | Sales Order lien quan (nullable) |
| owner_id | chu hang |
| customer_id | nguoi nhan |
| item_id + expected_qty | mat hang va so luong |
| vehicle_number | bien so xe |
| warehouse_id | kho xuat |

### 10.4 Output

| Output | Mo ta |
|---|---|
| shipment_header | chung tu shipment cho 1 trip |
| shipment_number | so shipment auto-generate: SHP-YYYYMMDD-SEQNUM |
| shipment_lines | dong hang tuong ung |
| initial status | `DRAFT` |

### 10.5 Cases dien hinh

#### Case 1 — Standard outbound tu SO
- **Input:** SO da tao, WH_MANAGER tao shipment, chon xe
- **Output:** shipment DRAFT voi lines tu SO

#### Case 2 — Split shipment
- **Input:** Shipment 50MT, WH_MANAGER split 20MT
- **Output:** shipment goc con 30MT, shipment moi 20MT [BR-OUT-007]

#### Case 3 — Standalone shipment (khong can SO)
- **Input:** WH_MANAGER tao shipment truc tiep
- **Output:** shipment DRAFT khong link SO

#### Case 4 — Duplicate create request
- **Input:** integration gui lai cung `external_id`
- **Output:** khong tao shipment trung

### 10.6 Quy tac bat buoc

- 1 shipment dai dien cho dung 1 trip/1 xe. [BR-OUT-001]
- Shipment number phai auto-sinh: SHP-YYYYMMDD-SEQNUM, unique per warehouse.
- Khong cho tao shipment neu owner/item/warehouse khong hop le.
- SO co the link nhieu shipment trips. [BR-OUT-007]
- Standalone shipment (khong co SO) duoc support.

---

## 11. Sub-module 2 — Allocation-Based Hold (FIFO)

### 11.1 Muc dich

Phan bo stock cho shipment de dam bao hang da duoc "giu" (hold) truoc khi pick, tranh over-commit.

### 11.2 Mo ta nghiep vu

Khi shipment duoc confirm, he thong chay allocation. Allocation KHONG dung traditional reservation (soft/hard). Thay vao do, he thong tang reserved_qty tren on_hand records tuong ung. available_qty = physical_qty - reserved_qty. Allocation theo FIFO (lot_date ASC).

### 11.3 Input

| Input | Mo ta |
|---|---|
| shipment_lines | dong hang can allocate |
| on_hand records | stock kha dung per location/dim |
| allocation algorithm | FIFO (lot_date ASC) [CONFIRMED] |

### 11.4 Output

| Output | Mo ta |
|---|---|
| allocation_records | link shipment_line → location → qty |
| reserved_qty update | on_hand.reserved_qty tang |
| shipment status | CONFIRMED → ALLOCATED |

### 11.5 Cong thuc va quy tac bat buoc

- `available_qty = physical_qty - reserved_qty` [BR-OUT-003]
- Allocation theo FIFO: sort by lot_date ASC, chon locations co available_qty du. [BR-OUT-002]
- Neu tong available < tong expected → allocation FAIL toan bo. **Khong partial allocation.** [CONFIRMED]
- Allocation thanh cong → reserved_qty tang tuong ung per location/dim.
- Unallocate (khi cancel) → reserved_qty giam, available_qty phuc hoi.

### 11.6 Concurrent allocation — Pessimistic Locking

> **Khuyen nghi:** Su dung Pessimistic Locking (SELECT FOR UPDATE tren on_hand row) de tranh 2 shipment cung luc allocate cung stock. [Reference: M3 Section 16.5]
> Can ADR chinh thuc truoc build M5.

---

## 12. Sub-module 3 — Pick Work Creation & Handoff to M7

### 12.1 Muc dich

Tao pick work de WH_KEEPER thuc hien lay hang tu storage locations da allocate.

### 12.2 Mo ta nghiep vu

Sau khi shipment duoc allocate, he thong auto-create Pick WorkHeader cho M7. Moi shipment line tao 1 Pick WorkHeader. WH_KEEPER claim task tren mobile, di den source location (scan QR), lay hang va confirm qty.

### 12.3 Input

| Input | Mo ta |
|---|---|
| shipment_id | shipment da allocate |
| allocation_records | location + qty per line |
| work template | context de tao work |

### 12.4 Output

| Output | Mo ta |
|---|---|
| Pick WorkHeaders | 1 per shipment line, OPEN |
| work lines | source = allocated location, qty = allocated_qty |
| shipment status | ALLOCATED → PICKING |

### 12.5 Quy tac bat buoc

- Shipment ALLOCATED → auto-create Pick Work (1 per shipment line). [CONFIRMED — BR-WRK-002]
- Pick WorkHeader ban dau o trang thai `OPEN`, chua assigned.
- Source location = allocated location. WH_KEEPER scan location QR de validate.
- Tat ca Pick Work COMPLETED → Shipment chuyen PICKED.
- Short pick: [TO-CONFIRM] <=2% auto-accept / 2-5% flag manager / >5% block.
- Unassigned pick work visible cho tat ca WH_KEEPER trong warehouse do.

---

## 13. Sub-module 4 — Multi-Trip Weighing Execution

### 13.1 Muc dich

Thuc thi luong can xuat voi quy trinh multi-trip: tare truoc (xe rong), sau do gross tung line theo thu tu tu do.

### 13.2 Mo ta nghiep vu

Day la dac thu cua TVL outbound. Xe len can rong (tare), sau do Keeper load tung loai hang len xe, moi lan load xong lai len can (gross). He thong tinh net per line bang cach tru gross lan truoc. Thu tu load/can do Keeper chon tu do (flexible sequence).

### 13.3 State baseline cho weighing

| State | Y nghia | Co post ton? |
|---|---|---|
| PICKED | da pick xong, cho can | Khong |
| WEIGHING_TARE | xe dang can tare (xe rong) | Khong |
| LOADING | xe dang load hang line N | Khong |
| GROSS_N | vua can gross line N | Khong |
| ALL_WEIGHED | tat ca lines da can xong | Khong |

### 13.4 Cong thuc net weight per line [CONFIRMED — BR-WB-005]

```
net_line_1 = gross_1 - tare
net_line_N = gross_N - gross_(N-1)    // N >= 2

Cross-check cuoi cung:
total_net = gross_final - tare
SUM(net_line_i) phai bang total_net
Neu lech → log warning (khong block)
```

### 13.5 Input

| Input | Mo ta |
|---|---|
| shipment_id | shipment da PICKED |
| tare_weight | xe rong |
| gross_N per line | gross sau moi lan load |
| line_sequence | thu tu Keeper chon (flexible) |

### 13.6 Output

| Output | Mo ta |
|---|---|
| weighbridge_logs | 1 log per can (tare + N gross) |
| net per line | tinh theo cong thuc |
| tolerance result per line | PASS / FAIL |
| shipment status | WEIGHING_TARE → LOADING → ... → ALL_WEIGHED |

### 13.7 Quy tac bat buoc

- Tare truoc (xe rong), sau do gross tung line. [CONFIRMED — TC-09]
- Thu tu line do Keeper chon tu do. [CONFIRMED]
- Moi lan can tao 1 weighbridge_log (immutable). [BR-WB-004]
- Tolerance check chay ngay sau moi gross per line.
- Line fail tolerance → flag PENDING_APPROVAL, **khong dung xe**, van cho can tiep. [CONFIRMED — TC-10]
- Cross-check total_net = gross_final - tare. Neu lech → log warning.

---

## 14. Sub-module 5 — Outbound Tolerance Check & PENDING_APPROVAL

### 14.1 Muc dich

Quyet dinh tung line outbound co duoc chap nhan hay can WH_MANAGER review.

### 14.2 Mo ta nghiep vu

Sau moi lan can gross per line, he thong tinh variance va so voi tolerance. Neu pass → line_status = LINE_SHIPPED. Neu fail → line_status = PENDING_APPROVAL. Quan trong: **tolerance fail KHONG dung vong can**. He thong van cho can tiep cac line con lai.

Sau khi tat ca lines da can xong (ALL_WEIGHED):
- Neu tat ca pass → auto SHIPPED.
- Neu co bat ky line nao PENDING_APPROVAL → shipment chuyen PENDING_APPROVAL, cho WH_MANAGER review.

### 14.3 Cong thuc

`variance_pct = |net_weight_line - expected_qty_line| / expected_qty_line x 100`

### 14.3B Tolerance lookup algorithm (reference M2)

Khi can lay tolerance_pct cho outbound, he thong phai dung M2 tolerance lookup theo thu tu uu tien:

```
function getOutboundTolerance(owner_id, item_id):
  // Step 1: owner_item_policy (highest priority)
  policy = lookup owner_item_policy WHERE owner_id AND item_id AND is_active
  IF policy.tolerance_pct_outbound IS NOT NULL → RETURN policy.tolerance_pct_outbound

  // Step 2: item default
  item = lookup item WHERE item_id
  IF item.tolerance_pct_outbound IS NOT NULL → RETURN item.tolerance_pct_outbound

  // Step 3: owner default
  owner = lookup owner WHERE owner_id
  IF owner.default_tolerance_pct IS NOT NULL → RETURN owner.default_tolerance_pct

  // Step 4: system default [TO-CONFIRM: 0.5% — TVL can confirm]
  RETURN system_config.default_tolerance_pct  // 0.5%
```

> M5 KHONG tu query database truc tiep cho tolerance. M5 goi M2 tolerance service/function.

### 14.4 Blocking rules cho hang bao va hang xa

#### Hang xa (BULK) — Blocking per SO [BR-OUT-004]

```
total_shipped = SUM(shipped_qty FROM shipments WHERE so_id = X AND status IN (SHIPPED, CLOSED))
CHECK: total_shipped + current_net <= so.expected_qty_kg
Neu vuot → BLOCK tai luc can gross
```

#### Hang bao (BAGGED) — Blocking per trip [BR-OUT-005]

```
tolerance_kg = 2 x bag_shell_weight_kg x bag_count
CHECK: |actual_net - (bag_count x bag_weight_kg)| <= tolerance_kg
Neu vuot → PENDING_APPROVAL → WH_MANAGER xet duyet
```

### 14.5 WH_MANAGER resolution cho PENDING_APPROVAL

| Action | Ket qua | Side Effect |
|---|---|---|
| Approve | Shipment → SHIPPED | InventTrans OUTBOUND posted; billing event; reason code + audit |
| Reject | Shipment → CANCELLED | Allocation released; reserved_qty = 0; reason code + audit |
| Re-pick (optional) | Shipment → PICKING | Tao new Pick Work; re-process |

### 14.6 Quy tac bat buoc

- Tolerance check per line, ngay sau moi gross.
- Fail khong dung xe — van cho can tiep. [CONFIRMED — TC-10]
- Approve chi WH_MANAGER voi reason code. [EX-RULE-03]
- Reject → allocation released, reserved_qty phuc hoi.

---

## 15. Sub-module 6 — Outbound Posting Control (handoff sang M3)

### 15.1 Muc dich

Dam bao inventory chi giam khi shipment da duoc chap nhan chinh thuc va posting sang M3 dien ra dung mot lan, dung thoi diem.

### 15.2 Mo ta nghiep vu

Module 5 khong so huu ledger ton kho. Khi shipment chuyen sang `SHIPPED` (tu auto all-pass hoac WH_MANAGER approve), he thong goi posting engine cua M3 de tao `InventTrans` outbound per line.

### 15.3 Input

| Input | Mo ta |
|---|---|
| shipment_id | shipment da SHIPPED |
| shipment_lines | dong hang can post |
| shipped_qty per line | net weight thuc te per line |
| source location/dim | dim tu allocation record |
| external_id | idempotency key |

### 15.4 Output

| Output | Mo ta |
|---|---|
| posting request | command sang M3 per line |
| posting result | success/fail + trans_id per line |
| reserved_qty release | reserved_qty giam ve 0 |
| billing trigger | event cho M10 |

### 15.5 Quy tac bat buoc

- Posting point outbound duy nhat la `SHIPPED`. [CONFIRMED — BR-INV-003]
- DRAFT, CONFIRMED, ALLOCATED, PICKING, PICKED, WEIGHING chi hold reserved_qty, KHONG tru physical.
- InventTrans: type=OUTBOUND, qty=-shipped_qty per line, dim=source location + owner + AVAILABLE.
- Posting phai dung shipped_qty (= net_weight) thuc te, khong dung expected_qty.
- Cung event retry voi cung `external_id` khong duoc tao trans trung.
- Cancel truoc SHIPPED → unallocate, release reserved_qty, khong can reverse.
- Reversal sau SHIPPED (hau kiem loi): tao counter-trans qua M3. [BR-OUT-008]

### 15.6 Billing event payload khi SHIPPED

Khi shipment chuyen sang `SHIPPED`, he thong phai capture billing event cho M10:

| Field | Gia tri | Ghi chu |
|---|---|---|
| event_type | OUTBOUND_HANDLING | — |
| shipment_id | shipment dang xu ly | — |
| owner_id | chu hang | — |
| item_id | mat hang | Per line |
| cargo_form | BULK / BAGGED_* / JUMBO_* | Map billing rate |
| warehouse_id | kho xuat | — |
| shipped_qty_mt | net_weight_kg / 1000 per line | Don vi MT cho billing |
| event_timestamp | thoi diem SHIPPED | — |
| correlation_id | trace ID | — |

> M5 chi capture event. M10 so huu rate lookup va charge calculation.

### 15.7 Mapping baseline sang M3

| Shipment event | Dieu kien | Goi M3 | Ket qua mong doi |
|---|---|---|---|
| Shipment → SHIPPED | all pass hoac manager approve | POST outbound per line | InventTrans qty am tai source dim |
| Shipment cancel truoc SHIPPED | chua tung post | Khong | unallocate, release reserved_qty |
| Shipment cancel sau SHIPPED (edge case) | da tung post | Reverse qua M3 | ton duoc dao chieu co audit |

---

## 16. Sub-module 7 — DPM Dual Tracking

### 16.1 Muc dich

Xu ly case dac biet DPM (Dam Phu My): kho tru theo can thuc, bao cao/billing theo bag_count x nominal.

### 16.2 Mo ta nghiep vu

DPM la chu hang co san pham bao (50kg/bao). Khi xuat kho:
- InventTrans ghi qty = -actual_net_weight (tu can thuc te).
- Billing va report ghi qty = bag_count x nominal_weight_per_bag.
- Variance giua actual va nominal duoc ghi log, KHONG auto-adjust. [BR-OUT-006]

### 16.3 Quy tac bat buoc

- DPM flag: `is_dpm_dual_tracking = TRUE` tren owner_item_policy (M2). [Reference: M2 AI-4]
- Khi flag = TRUE:
  - InventTrans.qty = -actual_net_weight_kg (tu weighbridge)
  - Billing event: qty = bag_count x nominal_weight_per_bag
  - Report (shrinkage, stock): dung bag_count x nominal cho display, actual cho ton kho that
- Variance = |actual_net - (bag_count x nominal)| → ghi log, khong adjust.
- Khong phai tat ca hang bao deu la DPM. Chi items co flag = TRUE.

---

## 17. Sub-module 8 — Shipment Cancel, Exception Handling & Close

### 17.1 Muc dich

Kiem soat nhung tinh huong ngoai le cua outbound de he thong van an toan, co audit va khong lam hong inventory truth.

### 17.2 Mo ta nghiep vu

Outbound thuc te co nhieu exception: allocation fail (thieu hang), tolerance fail giua vong can, WH_MANAGER reject, shipment can cancel. Module 5 phai cho xu ly ngoai le nhung trong vung kiem soat chat.

### 17.3 State transition table chi tiet

> Bang duoi day mo ta day du cac state transition hop le, actor, guard condition va side effect.

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|---|---|---|---|---|---|---|
| S-01 | DRAFT | CONFIRMED | Confirm Shipment | WH_MANAGER | SO/delivery request exists; lines valid | — |
| S-02 | CONFIRMED | ALLOCATED | Allocate | System / WH_MANAGER | available_qty >= requested per line; NO partial [CONFIRMED] | reserved_qty increased per allocation record |
| S-03 | ALLOCATED | PICKING | Auto trigger | System | ALLOCATED complete | Auto-create Pick WorkHeader per line |
| S-04 | PICKING | PICKED | All Pick Work COMPLETED | System (M7 callback) | All WorkHeaders = COMPLETED | — |
| S-05 | PICKED | WEIGHING_TARE | Weigh tare | WB_OPERATOR | Vehicle on scale | weighbridge_log tare created |
| S-06 | WEIGHING_TARE | LOADING (line loop) | Tare confirmed | WB_OPERATOR | tare > 0 | Line sequence start |
| S-07 | LOADING | GROSS_N (per line) | Weigh gross line N | WB_OPERATOR | gross_N > gross_(N-1) | net_line_N calculated; weighbridge_log created |
| S-08 | GROSS_N | LOADING (next line) | Line tolerance PASS | System | variance_pct <= tol | line_status = LINE_SHIPPED; continue loop |
| S-09 | GROSS_N | LOADING (next line) | Line tolerance FAIL | System | variance_pct > tol | Flag PENDING_APPROVAL; continue loop — DO NOT STOP [CONFIRMED] |
| S-10 | ALL_WEIGHED | SHIPPED | All lines pass | System | No PENDING_APPROVAL lines | InventTrans OUTBOUND; billing OUTBOUND_HANDLING; reserved_qty released |
| S-11 | ALL_WEIGHED | PENDING_APPROVAL | Any line fail | System | >=1 line PENDING_APPROVAL | Notify WH_MANAGER |
| S-12 | PENDING_APPROVAL | SHIPPED | WH_MANAGER approve | WH_MANAGER | Reason code required | InventTrans OUTBOUND; billing; audit log |
| S-13 | PENDING_APPROVAL | CANCELLED | WH_MANAGER reject | WH_MANAGER | Reason code required | Allocation released; reserved_qty = 0 |
| S-14 | SHIPPED | CLOSED | Close | WH_MANAGER | — | Immutable |
| S-15 | DRAFT | CANCELLED | Cancel | WH_MANAGER | — | — |
| S-16 | CONFIRMED | CANCELLED | Cancel | WH_MANAGER | — | — |
| S-17 | ALLOCATED | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released |
| S-18 | PICKING | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released; Cancel Pick WorkHeaders |
| S-19 | PENDING_APPROVAL | CANCELLED | Cancel | WH_MANAGER | — | reserved_qty released |

**Forbidden transitions (Dev phai reject):**

| From | To | Ly do |
|---|---|---|
| CONFIRMED | PICKING | Phai qua ALLOCATED truoc |
| ALLOCATED | SHIPPED | Phai qua PICKING → PICKED → WEIGHING |
| SHIPPED | CANCELLED | Da post InventTrans — phai dung reversal |
| CLOSED | any | Immutable |
| any | ALLOCATED | Neu available < requested → FAIL toan bo (no partial) |

### 17.4 Cancel matrix

| Current State | Co duoc cancel? | Ghi chu |
|---|---|---|
| DRAFT | Co | chua phat sinh gi |
| CONFIRMED | Co | chua allocate |
| ALLOCATED | Co | release reserved_qty |
| PICKING | Co | release reserved_qty; cancel Pick WorkHeaders |
| PENDING_APPROVAL | Co | release reserved_qty |
| SHIPPED | Khong | da post InventTrans — reversal only |
| CLOSED | Khong | immutable |

### 17.5 Edge case: Cancel khi da ship 1-2 lines trong vong can

Neu shipment da ship mot so lines (LINE_SHIPPED) nhung chua hoan tat vong can va bi cancel:
- Lines da LINE_SHIPPED → reversal bat buoc cho cac lines do. [BR-OUT-008 AC5]
- Lines chua can → don gian release allocation.

### 17.6 Shipment closing

- Shipment SHIPPED → WH_MANAGER co the close.
- Shipment CLOSED la immutable — khong sua duoc.
- Close chi khi da SHIPPED (tat ca lines da post).

---

## 18. Sub-module 9 — Outbound Auditability, Idempotency & Reporting Hooks

### 18.1 Muc dich

Bao ve outbound flow khoi duplicate request, mat trace khi retry, va thieu du lieu de van hanh/audit/reporting.

### 18.2 Mo ta nghiep vu

Outbound cham nhieu boundary de loi: web UI, weighbridge, mobile pick, posting sang M3, work creation sang M7. Module nay phai co co che chong duplicate, luu correlation trail va expose data points du cho dashboard outbound.

### 18.3 KPI hooks toi thieu

- So shipment theo ngay / theo kho / theo owner
- Average turnaround time tu allocation den shipped
- PENDING_APPROVAL rate theo owner + item
- Manual approve/reject count
- Short pick rate
- Allocation fail count (thieu hang)
- DPM variance tracking

### 18.4 Quy tac bat buoc

- Tao shipment voi cung `external_id` khong duoc sinh duplicate.
- Posting retry tai `SHIPPED` khong duoc tao duplicate outbound trans.
- Work creation retry sau `ALLOCATED` khong duoc tao nhieu pick work cho cung shipment line.
- Moi exception quan trong phai truy nguoc duoc bang `correlation_id`.

---

## 19. Quan he du lieu va ownership can giu ro

### 19.1 Ownership ranh gioi

- M1 so huu quyen, reason code, audit policy, number sequence, idempotency baseline.
- M2 so huu item, owner, warehouse, location, tolerance master baseline.
- **M5 so huu shipment lifecycle, allocation records va outbound business flow.**
- M8 so huu doc can, weighbridge integration va weighbridge log capture.
- M3 so huu inventory posting truth.
- M7 so huu work execution sau khi M5 tao pick request.
- M10 so huu billing calculation nhung nhan trigger/event tu M5/M3.

### 19.2 Ranh gioi de nham phai khoa ngay

- M5 khong duoc tu update `OnHand` hay `InventTrans` bang SQL/direct DB path.
- M8 khong duoc tu quyet shipment shipped/cancelled neu khong qua business rules cua M5.
- M7 khong duoc tu create pick work ma khong co handoff hop le tu shipment ALLOCATED.
- M10 khong duoc xem expected_qty la outbound billable truth neu shipment chua reach `SHIPPED`.

---

## 20. Business rules cot loi cua module

| Rule ID | Business Rule | BRD Reference |
|---|---|---|
| OUT-BR-001 | 1 shipment = 1 trip = 1 xe. | BR-OUT-001 |
| OUT-BR-002 | Allocation theo FIFO (lot_date ASC). | BR-OUT-002 |
| OUT-BR-003 | available_qty = physical_qty - reserved_qty. Khong partial allocation. | BR-OUT-003 |
| OUT-BR-004 | Hang xa: blocking per SO — SUM(shipped) + current <= SO.expected. | BR-OUT-004 |
| OUT-BR-005 | Hang bao: blocking per trip — tolerance_kg = 2 x shell x bag_count. | BR-OUT-005 |
| OUT-BR-006 | SHIPPED: atomic post InventTrans + billing + update SO shipped_qty. DPM dual tracking. | BR-OUT-006 |
| OUT-BR-007 | Split shipment: chon shipment → nhap split qty → tao shipment moi. | BR-OUT-007 |
| OUT-BR-008 | Cancel: cho phep tu DRAFT, CONFIRMED, ALLOCATED, PICKING, PENDING_APPROVAL. | BR-OUT-008 |
| OUT-BR-009 | Container stuffing: fee = MAX(flat_rate, qty x per_mt_rate). | BR-OUT-009 |
| OUT-BR-010 | Weighing loop: moi trip line_status → LOADING → GROSS → LINE_SHIPPED. | BR-OUT-010 |
| OUT-BR-011 | Multi-trip net: net_line_1 = gross_1 - tare; net_line_N = gross_N - gross_(N-1). | BR-WB-005 |
| OUT-BR-012 | Posting outbound chi tai SHIPPED. | BR-INV-003 |
| OUT-BR-013 | Tolerance fail per line khong dung xe — flag PENDING_APPROVAL, can tiep. | TC-10 / PRD |
| OUT-BR-014 | PENDING_APPROVAL chi WH_MANAGER resolve (approve/reject). | EX-RULE-03 |

---

## 21. Dependencies lien module

### 21.1 Module phu thuoc vao M5

- M3 nhan posting trigger tu `SHIPPED`
- M7 nhan pick work trigger tu `ALLOCATED`
- M10 nhan outbound billing event tu `SHIPPED`
- M11 dung shipment history, exception, throughput cho bao cao

### 21.2 Module M5 phu thuoc vao

- M1 cho permission, audit, reason code, sequence, idempotency
- M2 cho owner/item/warehouse/location/tolerance/cargo_form data
- M3 cho inventory posting, reversal control va available_qty query
- M7 cho pick execution
- M8 cho gross/tare weight va weighbridge log

---

## 22. Yeu cau phi chuc nang ap cho module

| Nhom | Yeu cau |
|---|---|
| Integrity | Khong tru ton truoc `SHIPPED`; PENDING_APPROVAL khong lam sai inventory |
| Reliability | Retry tu weighbridge/integration khong tao duplicate shipment hoac duplicate post |
| Performance | Allocation FIFO phai nhanh du cho operation; multi-trip weighing khong lag |
| Traceability | Moi lan can, moi allocation, moi exception deu truy vet duoc |
| Auditability | PENDING_APPROVAL approve/reject, cancel, reversal phai co audit |
| Usability | WB_OPERATOR thao tac can nhanh; WH_MANAGER xem exception tap trung |
| Recoverability | Scale fail co fallback; allocation fail co thong bao ro; posting fail co recovery path |
| Extensibility | Co the mo rong partial allocation, FEFO o Phase 2 ma khong pha lifecycle loi |

---

## 23. Acceptance criteria o muc module

Module Outbound Operations duoc xem la dat khi toi thieu thoa cac dieu kien sau:

1. Shipment lifecycle chay dung baseline tu SO intake den closing.
2. Allocation-based hold dung FIFO va khong over-commit.
3. Pick work duoc tao dung tu allocation va trace duoc qua M7.
4. Multi-trip weighing tinh net dung per line theo cong thuc.
5. Tolerance check per line — fail khong dung xe.
6. PENDING_APPROVAL chi WH_MANAGER resolve.
7. Outbound posting chi xay ra tai `SHIPPED` va dung shipped_qty thuc te.
8. Cancel release allocation dung va reserved_qty phuc hoi.
9. DPM dual tracking: InventTrans dung actual, billing/report dung nominal.
10. Blocking rules dung cho hang bao (per trip) va hang xa (per SO).

### 23.1 Acceptance Criteria chi tiet theo sub-module

**Sub-module 1 — SO Intake & Shipment Creation**
- AC-1.1: Tao shipment tu SO → sinh dung 1 shipment number
- AC-1.2: Cung `external_id` gui lai → khong tao duplicate
- AC-1.3: Split shipment → shipment goc giam qty, shipment moi tao dung
- AC-1.4: Standalone shipment (khong SO) duoc support

**Sub-module 2 — Allocation**
- AC-2.1: Allocation FIFO: location co lot_date som nhat duoc chon truoc
- AC-2.2: available < expected → FAIL toan bo, khong partial
- AC-2.3: Allocation thanh cong → reserved_qty tang dung
- AC-2.4: 2 shipment concurrent allocate cung stock → chi 1 thanh cong (locking)

**Sub-module 3 — Pick Work**
- AC-3.1: Shipment ALLOCATED → auto-create Pick WorkHeader per line
- AC-3.2: All Pick Work COMPLETED → Shipment PICKED
- AC-3.3: Short pick flag dung theo threshold [TO-CONFIRM]

**Sub-module 4 — Multi-Trip Weighing**
- AC-4.1: Tare truoc, gross tung line — net tinh dung
- AC-4.2: Line sequence tu do — Keeper chon thu tu bat ky
- AC-4.3: Cross-check total_net = gross_final - tare

**Sub-module 5 — Tolerance & PENDING_APPROVAL**
- AC-5.1: variance <= tolerance → LINE_SHIPPED
- AC-5.2: variance > tolerance → PENDING_APPROVAL (khong dung xe)
- AC-5.3: All pass → auto SHIPPED
- AC-5.4: WH_MANAGER approve → SHIPPED; reject → CANCELLED

**Sub-module 6 — Posting Control**
- AC-6.1: SHIPPED goi M3 tao outbound trans qty am per line
- AC-6.2: Intermediate states khong tao outbound trans
- AC-6.3: Retry cung event tai SHIPPED khong tao duplicate posting
- AC-6.4: Cancel truoc SHIPPED → unallocate, khong can reverse

**Sub-module 7 — DPM**
- AC-7.1: DPM item: InventTrans.qty = -actual_net (tu can)
- AC-7.2: DPM billing/report = bag_count x nominal_weight
- AC-7.3: Variance giua actual va nominal duoc log, khong adjust

**Sub-module 8 — Cancel & Close**
- AC-8.1: Cancel o DRAFT/CONFIRMED/ALLOCATED/PICKING/PENDING_APPROVAL → thanh cong
- AC-8.2: Cancel SHIPPED → BLOCKED
- AC-8.3: Cancel ALLOCATED → reserved_qty released, available phuc hoi
- AC-8.4: Shipment CLOSED la immutable

**Sub-module 9 — Auditability**
- AC-9.1: Duplicate request khong tao shipment/work/posting trung
- AC-9.2: Co the trace tu shipment sang weighbridge logs, M3 trans va M7 work
- AC-9.3: Dashboard hook doc duoc PENDING_APPROVAL count, allocation fail count

---

## 24. User stories cot loi theo goc nhin BA/PO

### US-M5-001: Sales Order & Shipment Creation
**As a** WH_ADMIN / WH_MANAGER,
**I want to** create shipments linked to sales orders,
**So that** every outbound movement is tracked against a delivery commitment.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: 1 shipment = 1 trip = 1 xe [BR-OUT-001]
- AC2: Shipment number auto-sinh PER_WAREHOUSE: SHP-YYYYMMDD-SEQNUM
- AC3: SO co the link nhieu shipment trips
- AC4: Split shipment: chon shipment → nhap split qty → he thong tao shipment moi [BR-OUT-007]
- AC5: Standalone shipment (khong can SO) duoc support

### US-M5-002: Allocation-Based Hold
**As a** System / WH_MANAGER,
**I want to** allocate specific inventory to a shipment using FIFO and set reserved_qty,
**So that** committed stock cannot be used by other shipments.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Allocation: dung allocation-based hold, khong traditional reservation [CONFIRMED]
- AC2: Algorithm: FIFO theo lot_date ASC [CONFIRMED] [BR-OUT-002]
- AC3: available_qty = physical_qty - reserved_qty; allocated_qty <= available_qty [BR-OUT-003]
- AC4: Neu tong available < expected → allocation FAIL toan bo (khong partial) [CONFIRMED]

### US-M5-003: Pick Work Creation
**As a** System,
**I want to** auto-create Pick WorkHeaders when a shipment is allocated,
**So that** WH_KEEPER can immediately execute picking on mobile.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Shipment ALLOCATED → PICKING → auto-create Pick Work (1 per shipment line) [CONFIRMED]
- AC2: Pick WorkHeader: source = allocated location, qty = allocated_qty
- AC3: Tat ca Pick Work COMPLETED → Shipment: PICKED
- AC4: [TO-CONFIRM] Short pick <=2% auto-accept / 2-5% flag / >5% block
- AC5: Unassigned pick work visible cho tat ca WH_KEEPER trong warehouse do

### US-M5-004: Multi-Trip Outbound Weighing
**As a** WB_OPERATOR,
**I want to** weigh outbound shipments with flexible line sequence,
**So that** Keepers can load cargo in any order without system constraint.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Tare truoc (xe rong), sau do gross tung line theo thu tu Keeper chon tu do [CONFIRMED] [TC-09]
- AC2: net_line_N = gross_N - gross_(N-1); net_line_1 = gross_1 - tare [BR-WB-005]
- AC3: Cross-check: total_net = gross_final - tare; neu lech → log warning
- AC4: Line fail tolerance → ghi PENDING_APPROVAL nhung khong chan cac line tiep theo [CONFIRMED] [TC-10]
- AC5: Tat ca lines weighed → Shipment: ALL_WEIGHED

### US-M5-005: DPM Dual Tracking
**As a** System,
**I want to** track DPM outbound with dual qty recording,
**So that** inventory is decremented by actual weight but reports use nominal bag count x weight.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: InventTrans OUTBOUND: -actual_net_weight_kg (tu can) [CONFIRMED] [BR-OUT-006]
- AC2: Billing/Report: bag_count x nominal_weight_per_bag
- AC3: Variance giua actual va nominal → ghi log, KHONG auto-adjust
- AC4: DPM flag per owner+item (owner_item_policy.is_dpm_dual_tracking)

### US-M5-006: Outbound Exception Handling (PENDING_APPROVAL)
**As a** WH_MANAGER,
**I want to** review and approve/reject shipment exceptions centrally after weighing completes,
**So that** truck flow is not interrupted mid-operation.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Line fail tolerance → flag PENDING_APPROVAL; khong chan xe [TC-10]
- AC2: Bulk surplus: SUM(shipped) + current > SO.expected → BLOCK mac dinh [BR-OUT-004]
- AC3: WH_MANAGER approve → reason code bat buoc + audit
- AC4: Approve → InventTrans OUTBOUND posted; Reject → Shipment CANCELLED

### US-M5-007: Outbound Posting at SHIPPED
**As a** System,
**I want to** post InventTrans only when shipment reaches SHIPPED state,
**So that** inventory is not decremented until the cargo has officially left.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Posting point duy nhat: Shipment state = SHIPPED [CONFIRMED] [BR-INV-003]
- AC2: Intermediate states chi hold reserved_qty, khong tru physical
- AC3: InventTrans: type=OUTBOUND, qty=-shipped_qty per line, dim=source location, owner
- AC4: Cancel truoc SHIPPED → unallocate, release reserved_qty, khong can reverse
- AC5: Reversal sau SHIPPED: tao counter-trans qua M3

### US-M5-008: Shipment Cancellation
**As a** WH_MANAGER,
**I want to** cancel shipments at allowed states,
**So that** allocated inventory is returned to available pool.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Cancel duoc tu: DRAFT, CONFIRMED, ALLOCATED, PICKING, PENDING_APPROVAL [BR-OUT-008]
- AC2: KHONG cancel da SHIPPED/CLOSED
- AC3: Cancel → allocation released → reserved_qty giam → available_qty phuc hoi
- AC4: Pick Task dang IN_PROGRESS → cancel → WH_KEEPER nhan thong bao
- AC5: Neu da ship 1-2 lines trong vong can → reversal bat buoc cho lines da ship [BR-OUT-008]

---

## 25. Goi y API/domain contract muc khai niem

> Phan nay la baseline de boc tiep FS/API chi tiet, chua phai contract cuoi cung.

- `POST /outbound/shipments`
- `GET /outbound/shipments/search`
- `GET /outbound/shipments/{shipment_id}`
- `POST /outbound/shipments/{shipment_id}/confirm`
- `POST /outbound/shipments/{shipment_id}/allocate`
- `POST /outbound/shipments/{shipment_id}/unallocate`
- `POST /outbound/shipments/{shipment_id}/weigh-tare`
- `POST /outbound/shipments/{shipment_id}/weigh-gross`
- `POST /outbound/shipments/{shipment_id}/approve`
- `POST /outbound/shipments/{shipment_id}/reject`
- `POST /outbound/shipments/{shipment_id}/cancel`
- `POST /outbound/shipments/{shipment_id}/close`
- `POST /outbound/shipments/{shipment_id}/split`
- `GET /outbound/shipments/{shipment_id}/history`

**Command payload toi thieu nen co:**
- `external_id`
- `correlation_id`
- `shipment_id` hoac SO reference
- `vehicle_number`
- `gross_weight` / `tare_weight`
- `weighbridge_ticket_id`
- `line_number` (cho weigh-gross per line)
- `source_app`
- `reason_code` (khi exception/approve/reject/cancel)
- `performed_by`

---

## 26. Diem can chot them truoc khi boc FS/API chi tiet

| # | To-Confirm Item | Priority | Impact | Deadline de xuat |
|---|---|---|---|---|
| 1 | Tolerance default neu owner+item chua cau hinh | P1 | Anh huong auto accept/reject behavior | Truoc FS M5 |
| 2 | Short pick threshold: <=2% auto / 2-5% flag / >5% block | P1 | Anh huong pick flow va exception handling | Truoc FS M5/M7 |
| 3 | Thu tu can lines outbound: da confirm flexible hay bat buoc sequence? | P1 | Da CONFIRMED flexible [TC-09] — can TVL re-confirm | Truoc SIT |
| 4 | Concurrent allocation locking strategy: pessimistic hay optimistic? | P1 | Anh huong over-commit risk | Truoc FS M5 (can ADR) |
| 5 | Standalone shipment (khong co SO): TVL dung trong truong hop nao? | P2 | Anh huong validation rules | Truoc FS M5 |
| 6 | Container stuffing (BR-OUT-009): Phase 1 hay Phase 2? | P2 | Anh huong scope va billing | Truoc Sprint planning |
| 7 | Billing event capture nam o M5 event hay M3/M10 subscriber | P2 | Anh huong integration contract | Truoc FS M10 |

---

## 27. Khuyen nghi cho Dev Team

1. Tach ro `shipment lifecycle service`, `allocation service`, `weighing service`, `posting handoff service` va `exception service`, tranh nhoi toan bo vao mot controller/service.
2. Dung idempotency key cho cac command nhay cam: create shipment, allocate, weigh-tare, weigh-gross, shipped-posting trigger.
3. State transition phai duoc guard bang domain rules, khong phu thuoc UI disable button.
4. Khong de M8 quyet dinh business acceptance; M8 chi cung cap weigh data.
5. Giu trace link tu shipment → allocation → pick work → weighbridge_log → invent_trans de QA/audit drill-down duoc.
6. Thiet ke event/retry path de posting fail hoac work creation fail khong gay double action.
7. Multi-trip weighing: luu gross_previous de tinh net per line. Handle edge case Keeper can sai thu tu.

---

## 28. Khuyen nghi cho QA Team

1. Test du state machine outbound ca happy path va PENDING_APPROVAL path.
2. Test duplicate retry cho create shipment, allocate, weigh-tare, weigh-gross, shipped posting.
3. Test allocation FIFO voi nhieu locations co lot_date khac nhau.
4. Test multi-trip net formula: tare, gross_1, gross_2, ... va cross-check total_net.
5. Test PENDING_APPROVAL: approve → SHIPPED, reject → CANCELLED.
6. Test cancel o moi state hop le va verify reserved_qty phuc hoi.
7. Test DPM dual tracking: InventTrans dung actual, billing dung nominal.
8. Test blocking rules: hang xa per SO, hang bao per trip.
9. Test concurrent allocation: 2 shipments cung stock → chi 1 thanh cong.
10. Test traceability end-to-end: shipment → allocation → M7 pick → weighbridge → M3 outbound trans → close.

**Reference test cases tu StateMachine doc:**
SHP-TC-01..13 (13 test cases).

---

## 29. Ket luan

Module 5 la noi he thong quyet dinh hang xuat **da thuc su roi kho hay chua**. Day la **business gate** noi giua allocation, pick execution, weighbridge va inventory posting.

Neu Module 5 duoc build dung:
- Allocation khong over-commit stock,
- Picking duoc trace dung tu allocation den thuc hien,
- Multi-trip weighing khong dung xe khi tolerance fail,
- Inventory chi giam dung thoi diem SHIPPED,
- DPM duoc track dung giua kho va billing,
- PENDING_APPROVAL co flow ro rang cho WH_MANAGER.

Neu build sai module nay:
- Stock co the bi over-commit cho nhieu shipment,
- Picking co the lam sai vi tri ma khong trace duoc,
- Tolerance fail co the dung ca chuyen xe giua vong can,
- Inventory bi tru qua som o ALLOCATED hoac PICKING,
- DPM variance khong duoc log → tranh chap voi khach,
- Billing va inventory khong con bam cung mot su kien.

---

## 30. Baseline source note dung de bien soan tai lieu nay

Tai lieu nay duoc bien soan dua tren 5 check-report documents va Business Rules Document:

1. `check-report/TVL_SWM_SystemControlMap.md` — PP-3, Event Choreography, Exception Map
2. `check-report/TVL_SWM_BA_PO_Master.md` — US-M5-001..008, Review Gate
3. `check-report/TVL_SWM_StateMachine.md` — S-01..S-19 transitions, SHP-TC-01..13 test cases
4. `check-report/TVL_SWM_SystemFlow_EndToEnd.md` — Outbound flow, billing events, DPM
5. `check-report/TVL_SWM_UserFlow_A_to_Z.md` — Flow 1.4, 2.2, 3.1
6. `TVL_SWM_Business_Rules_Document.md` — BR-OUT-001..010, BR-WB-005, BR-INV-003


---

## 31. Phu luc bo sung BA — Nguyen tac bo sung tai lieu

Phan nay duoc them vao de **mo rong va lam ro spec hien co**, khong thay the va khong xoa noi dung cu. Muc tieu la nang tai lieu tu muc “dac ta nghiep vu tot” len muc “du chat de BA/Dev/QA/Tech Lead boc FS, API, test case va integration contract it phai hoi lai business”.

Nguyen tac su dung phu luc nay:
- Neu phan cu va phan bo sung khong xung dot, uu tien doc theo huong **ket hop**.
- Neu phan cu moi dung o muc principle, phu luc nay duoc xem la phan **lam ro chi tiet de build**.
- Neu co noi dung dang `TO-CONFIRM`, phu luc nay se danh dau ro la **de xuat BA** hay **can TVL chot**.

---

## 32. Role & Permission Matrix bo sung

### 32.1 Dinh nghia vai tro tham gia vao Module 5

| Role | Mo ta | Pham vi trong M5 |
|---|---|---|
| WH_MANAGER | Quan ly kho / nguoi phe duyet outbound exception | Tao, sua, confirm, allocate, cancel, approve/reject, close |
| WH_KEEPER | Nhan vien kho thuc hien pick/load | Xem shipment duoc giao, thuc hien pick, bao short pick |
| WB_OPERATOR | Nhan vien tram can | Ghi nhan tare/gross, manual fallback khi scale loi |
| OPS_ADMIN | Van hanh he thong | Ho tro thao tac van hanh cap cao, monitor retry/exceptions |
| SYSTEM_INTEGRATION | Tich hop he thong | Tao shipment/nhan event theo idempotency contract |
| VIEW_ONLY_AUDITOR | User xem bao cao/audit | Chi duoc xem |

### 32.2 Action Matrix chi tiet

| Action | WH_MANAGER | WH_KEEPER | WB_OPERATOR | OPS_ADMIN | SYSTEM_INTEGRATION | VIEW_ONLY_AUDITOR |
|---|---:|---:|---:|---:|---:|---:|
| Tao shipment | Y | N | N | Y | Y | N |
| Sua shipment o DRAFT | Y | N | N | Y | Y | N |
| Confirm shipment | Y | N | N | Y | Y | N |
| Split shipment | Y | N | N | Y | N | N |
| Chay allocate | Y | N | N | Y | Y | N |
| Xem allocation detail | Y | Y | N | Y | Y | Y |
| Unallocate shipment | Y | N | N | Y | N | N |
| Nhan/bao short pick | N | Y | N | N | Y | N |
| Nhap tare | N | N | Y | N | Y | N |
| Nhap gross | N | N | Y | N | Y | N |
| Nhap manual weight fallback | N | N | Y | Y | N | N |
| Resolve PENDING_APPROVAL | Y | N | N | Y | N | N |
| Cancel shipment truoc SHIPPED | Y | N | N | Y | N | N |
| Tao reversal request sau SHIPPED | Y | N | N | Y | N | N |
| Close shipment | Y | N | N | Y | N | N |
| Xem audit trail | Y | N | N | Y | Y | Y |

### 32.3 Quy tac permission bat buoc

- Manual weight fallback bat buoc co `reason_code`, `performed_by`, `captured_at`, `source_mode = MANUAL`.
- WB_OPERATOR **khong** duoc approve tolerance fail.
- WH_KEEPER **khong** duoc thay doi owner, item, expected_qty, tolerance va cac field commercial.
- VIEW_ONLY_AUDITOR chi duoc xem, khong duoc invoke command.
- Shipment da `CLOSED` la read-only cho moi role.

---

## 33. Validation Matrix bo sung de build FE/BE/QA dong nhat

### 33.1 Shipment creation validation matrix

| Nhom | Rule | Muc do |
|---|---|---|
| Master data | owner_id phai ton tai, active, duoc phep van hanh tai warehouse_id | Blocking |
| Master data | item_id phai ton tai, active, duoc phep outbound | Blocking |
| Master data | warehouse_id phai ton tai va dang active | Blocking |
| Vehicle | vehicle_number bat buoc o luc create hoac truoc luc tare (de xuat: bat buoc ngay luc create) | Blocking |
| Source | source_type = SO thi so_id bat buoc | Blocking |
| Source | source_type = STANDALONE thi so_id duoc null, nhung phai co ly do tao shipment standalone | Warning/Config |
| Shipment scope | 1 shipment chi duoc phep 1 owner_id | Blocking |
| Shipment scope | 1 shipment chi duoc phep 1 warehouse_id | Blocking |
| Shipment scope | Cho phep nhieu item trong 1 shipment neu cung 1 xe va cung owner | Allowed |
| Idempotency | external_id + source_app khong duoc tao duplicate shipment | Blocking |
| Editability | expected_qty/item/owner/customer/warehouse chi duoc sua khi shipment o DRAFT | Blocking |

### 33.2 Shipment line validation matrix

| Field/Rule | Mo ta | Muc do |
|---|---|---|
| expected_qty > 0 | Khong chap nhan 0 hoac am | Blocking |
| UOM | expected_qty phai quy doi duoc ve KG | Blocking |
| cargo_form | Phai nam trong danh muc cho phep cua M2 | Blocking |
| bag_count | Bat buoc voi BAGGED_*; khong cho phep voi BULK neu business khong su dung | Blocking |
| nominal_weight_per_bag | Bat buoc neu la bagged goods co billing/report theo bao | Blocking |
| Duplicate line | Khong chan duplicate item, nhung phai phan biet bang line_number | Allowed |
| Split line | Split chi duoc thuc hien khi shipment o DRAFT/CONFIRMED va split theo qty > 0, < expected_qty con lai | Blocking |

### 33.3 Validation khi confirm/allocate

| Rule | Mo ta | Muc do |
|---|---|---|
| Shipment status | Chi shipment `DRAFT` moi duoc confirm | Blocking |
| Line completeness | Tat ca lines phai co item, expected_qty, cargo_form hop le | Blocking |
| Allocation scope | Chi allocate stock o trang thai AVAILABLE, khong lay stock BLOCKED / DAMAGED / QUARANTINE | Blocking |
| Partial allocation | Neu tong available < tong expected cua bat ky line nao -> fail toan bo shipment | Blocking |
| Concurrency | Khi allocate phai lock cac on_hand row lien quan theo chien luoc da chot | Blocking |

### 33.4 Validation khi weighing

| Rule | Mo ta | Muc do |
|---|---|---|
| Tare first | Khong duoc ghi gross neu shipment chua co tare hop le | Blocking |
| Gross monotonic | gross_N phai > gross_(N-1) trong context can outbound loading | Blocking |
| Sequence | line_number can la line chua duoc shipped/rejected | Blocking |
| Duplicate weigh event | Cung `scale_ticket_no` hoac cung fingerprint event tu M8 phai duoc deduplicate | Blocking |
| Manual fallback | Manual weight bat buoc reason_code + audit + permission hop le | Blocking |
| Reweigh | Neu line da `WEIGHED_FAIL` hoac `REWEIGH_REQUIRED`, cho phep can lai theo rule reweigh | Configurable |

### 33.5 Validation khi approve/reject/cancel/close

| Action | Rule | Muc do |
|---|---|---|
| Approve | Shipment phai o `PENDING_APPROVAL`; reason_code bat buoc | Blocking |
| Reject | Shipment phai o `PENDING_APPROVAL`; reason_code bat buoc | Blocking |
| Cancel | Chi cancel o cac state da liet ke trong cancel matrix | Blocking |
| Close | Chi close shipment da `SHIPPED`; tat ca lines da post xong | Blocking |
| Reverse | Shipment da `SHIPPED`/`CLOSED` muon dao chieu phai di qua reversal request, khong duoc cancel truc tiep | Blocking |

---

## 34. Data Dictionary bo sung cho nhung object chua duoc lam ro

### 34.1 Bang `weighing_attempt`

| Field | Type | Required | Mo ta |
|---|---|---:|---|
| id | UUID | Y | PK |
| shipment_header_id | UUID | Y | FK shipment_header |
| shipment_line_id | UUID | N | Null neu la tare |
| weigh_type | enum | Y | TARE / GROSS |
| sequence_no | int | Y | 0 = tare; 1..N = gross |
| source_mode | enum | Y | SCALE_AGENT / MANUAL |
| raw_weight_kg | decimal(18,3) | Y | Gia tri can goc |
| calculated_net_kg | decimal(18,3) | N | Net line duoc tinh tu cong thuc |
| previous_gross_kg | decimal(18,3) | N | Gross truoc do de tinh net |
| scale_ticket_no | string | N | So phieu can / id tu M8 |
| is_valid | boolean | Y | Danh dau event hop le |
| duplicate_of_attempt_id | UUID | N | Event bi duplicate cua event nao |
| captured_at | timestamp | Y | Thoi diem can |
| captured_by | UUID | Y | Actor/agent |
| reason_code | string | N | Bat buoc neu source_mode = MANUAL |
| remark | string | N | Mo ta bo sung |

### 34.2 Bang `approval_decision_log`

| Field | Type | Required | Mo ta |
|---|---|---:|---|
| id | UUID | Y | PK |
| shipment_header_id | UUID | Y | Shipment dang duoc phe duyet |
| shipment_line_id | UUID | N | Null neu quyet dinh o cap shipment |
| decision | enum | Y | APPROVE / REJECT / REPICK |
| reason_code | string | Y | Bat buoc cho moi quyet dinh |
| comment | text | N | Dien giai them |
| decided_by | UUID | Y | User phe duyet |
| decided_at | timestamp | Y | Thoi diem phe duyet |

### 34.3 Bang `shipment_event_log`

| Field | Type | Required | Mo ta |
|---|---|---:|---|
| id | UUID | Y | PK |
| shipment_header_id | UUID | Y | Shipment |
| shipment_line_id | UUID | N | Line neu co |
| event_name | string | Y | CREATED / CONFIRMED / ALLOCATED / PICK_STARTED / TARE_CAPTURED / GROSS_CAPTURED / SHIPPED / CLOSED... |
| event_source | string | Y | UI / MOBILE / WEIGHBRIDGE / INTEGRATION / SYSTEM |
| event_payload_json | jsonb | N | Snapshot payload |
| correlation_id | string | Y | Trace end-to-end |
| external_id | string | N | Idempotency key neu co |
| created_at | timestamp | Y | Thoi diem log |
| created_by | UUID | N | User/agent |

### 34.4 Khuyen nghi mo rong schema shipment_line

Bo sung cac cot sau de dev build de mo rong ve sau:
- `expected_qty_kg`
- `so_line_id`
- `weigh_sequence_no`
- `reweigh_count`
- `exception_flag`
- `billing_qty_kg`
- `nominal_qty_kg`

---

## 35. Line-level State Machine bo sung

### 35.1 Muc dich

Shipment-level state machine la chua du cho outbound thuc te, vi tolerance fail, reweigh, reject va posting thuong xay ra o cap line. Vi vay can bo sung line-level state machine.

### 35.2 Danh sach line states de xuat

| Line State | Y nghia |
|---|---|
| PENDING | Moi tao dong, chua allocate |
| ALLOCATED | Da giu duoc stock |
| PICKING | Dang thuc hien pick |
| PICKED | Da pick xong |
| LOADING | Dang duoc nap len xe |
| WEIGHED_PASS | Da can xong line va nam trong tolerance |
| WEIGHED_FAIL | Da can xong nhung vuot tolerance |
| REWEIGH_REQUIRED | Can can lai theo quyet dinh nghiep vu |
| LINE_SHIPPED | Line da du dieu kien post outbound |
| REJECTED | Line bi tu choi/khong tiep tuc |
| REVERSED | Line da dao chieu sau posting |

### 35.3 Transition de xuat

| From | To | Trigger | Actor/System | Ghi chu |
|---|---|---|---|---|
| PENDING | ALLOCATED | Allocate success | System | Tao allocation_record |
| ALLOCATED | PICKING | Pick work created | System | Handoff M7 |
| PICKING | PICKED | Pick work completed | M7 callback | picked_qty xac nhan |
| PICKED | LOADING | Bat dau can line | WB_OPERATOR/System | Sau tare |
| LOADING | WEIGHED_PASS | Gross + tolerance pass | System | variance <= tolerance |
| LOADING | WEIGHED_FAIL | Gross + tolerance fail | System | variance > tolerance |
| WEIGHED_FAIL | REWEIGH_REQUIRED | Manager/Rule yeu cau can lai | WH_MANAGER/System | Optional path |
| REWEIGH_REQUIRED | LOADING | Bat dau can lai | WB_OPERATOR | Tang reweigh_count |
| WEIGHED_PASS | LINE_SHIPPED | Shipment duoc ship / posting success | System | linked posted_trans_id |
| WEIGHED_FAIL | REJECTED | Manager reject | WH_MANAGER | Neu reject line-level duoc ap dung |
| LINE_SHIPPED | REVERSED | Reversal success | System/M3 | Tao counter-trans |

### 35.4 Dong bo line state va shipment state

- Shipment `ALLOCATED` chi hop le khi tat ca lines >= `ALLOCATED`.
- Shipment `PICKED` chi hop le khi tat ca lines >= `PICKED`.
- Shipment `ALL_WEIGHED` chi hop le khi tat ca lines nam trong `WEIGHED_PASS`, `WEIGHED_FAIL`, `REJECTED` hoac `LINE_SHIPPED`.
- Shipment `SHIPPED` chi hop le khi tat ca line duoc chap nhan va post outbound thanh cong.

---

## 36. Contract tich hop bo sung va anh xa voi cac module hien co

### 36.1 Anh xa voi Module 1 — Foundation & Governance

M5 phai tai su dung va khong tu phat minh logic cua M1 cho cac thanh phan sau:
- Number sequence cho `shipment_number`
- Permission / role / policy
- Reason code dictionary
- Audit baseline
- Idempotency baseline / external_id strategy

**Contract toi thieu:**
- M5 goi M1 de lay rule permission truoc cac action nhay cam: approve/reject/cancel/manual weight/close.
- M5 goi M1 number sequence service khi tao shipment.
- M5 ghi audit event theo format chung cua M1.

### 36.2 Anh xa voi Module 2 — Master Data Management

M5 phu thuoc M2 cho:
- owner, item, warehouse, location, cargo_form
- owner_item_policy
- tolerance lookup
- DPM flag va nominal weight baseline

**Tolerance lookup order de xuat:**
1. `owner_item_policy.tolerance_pct_outbound`
2. `item.tolerance_pct_outbound`
3. `owner.default_tolerance_pct`
4. `system_default_tolerance_pct`

**M5 khong duoc hardcode tolerance trong service code.**

### 36.3 Anh xa voi Module 3 — Inventory Core Engine

M5 khong duoc update `OnHand` hay `InventTrans` bang SQL truc tiep. M5 chi lam 3 viec voi M3:
1. Lay snapshot available/on_hand de allocate
2. Gui posting command khi shipment `SHIPPED`
3. Gui reversal command khi can dao chieu sau ship

**Posting contract toi thieu de xuat:**
- Command level: per shipment line
- Qty: `-shipped_qty`
- Dim: owner + warehouse + location + inventory status AVAILABLE + cac dim lien quan
- Idempotency key: `shipment_id + line_number + posting_type`

### 36.4 Anh xa voi Module 4 — Inbound Operations

M4 la nguon tao `physical_qty`, `lot_date`, `on_hand availability` de M5 allocate. M5 can ton trong du lieu inbound da sinh ra va khong duoc vo hieu hoa traceability inbound.

M5 can map ro:
- FIFO dua tren `lot_date`/stock layer do M4 + M3 cung cap
- Khong allocate nham stock dang o receiving/putaway dang do
- Khi can truy vet outbound, co the drill-down ve GRN/receipt layer nguon neu can audit

### 36.5 Anh xa bo sung voi Module 7, 8, 10, 11

| Module | M5 gui gi | M5 nhan gi | Ownership |
|---|---|---|---|
| M7 Work Execution | Pick work request | Pick completion / short pick callback | M5 so huu shipment; M7 so huu work |
| M8 Weighbridge/OCR | Shipment/line context de can | tare/gross events, ticket no | M8 so huu weight capture; M5 so huu business acceptance |
| M10 Billing | OUTBOUND_HANDLING event | optional ack/event status | M10 so huu charge calculation |
| M11 Reporting & Audit | outbound facts | dashboard/report consumption | M11 so huu bao cao |

---

## 37. SO Reconciliation Rules bo sung

### 37.1 Muc dich

Vi shipment co the duoc tao tu SO va mot SO co the bi tach thanh nhieu shipment, M5 can co quy tac reconciliation ro rang de tranh xuat vuot commitment hoac update sai shipped_qty.

### 37.2 Quy tac cap SO line

| Rule | Mo ta |
|---|---|
| SO line mapping | Moi shipment_line nen map ve `so_line_id` neu shipment duoc tao tu SO |
| shipped_qty cap nhat | Chi cap nhat vao SO line khi posting outbound thanh cong |
| split shipment | Split khong duoc lam mat lien ket `so_id`/`so_line_id` |
| concurrency | Neu nhieu shipment cung mot SO line, can co co che kiem tra tong allocated/tong shipped |
| close SO line | SO line chi co the close khi `total_shipped >= ordered_qty` hoac business cho phep under-delivery |

### 37.3 Formula de xuat cho bulk blocking per SO

```text
current_total_shipped = SUM(shipped_qty cua cac shipment lines da post cho cung so_line_id)
current_total_allocated_open = SUM(allocated_qty cua cac shipment lines chua ship/cancel cho cung so_line_id)

remaining_so_qty = ordered_qty - current_total_shipped
allocation_eligibility = requested_qty <= remaining_so_qty
```

De xuat BA: khi can **block over-commit som**, business nen xem ca `allocated_open` chu khong chi `shipped`, nhat la khi mot SO dang bi tach nhieu shipment song song.

### 37.4 Standalone shipment reconciliation

Neu shipment khong co SO:
- Phai danh dau `source_type = STANDALONE`
- Phai co `standalone_reason_code`
- Billing/report van duoc tao, nhung commercial reconciliation can di theo external reference khac

---

## 38. Exception & Retry Matrix bo sung

### 38.1 Exception matrix

| Scenario | Trigger | He thong xu ly | Co block xe? | Audit |
|---|---|---|---:|---|
| Allocation fail | Khong du available | Fail allocation toan bo, tao exception ALLOCATION_FAIL | Y | Co |
| Short pick | M7 bao picked < allocated | Flag SHORT_PICK, route theo threshold | Co/Khong tuy rule | Co |
| Duplicate weigh event | M8 gui trung ticket/event | Danh dau duplicate, khong tinh lai net | N | Co |
| Manual weight | Scale loi / fallback | Ghi MANUAL_WEIGHT, bat buoc reason_code | N | Co |
| Tolerance fail | variance > tolerance | Danh dau line fail, shipment co the vao PENDING_APPROVAL sau khi can xong | N | Co |
| SO over-ship block | current + new > SO allowed | Chan posting/chan weighing theo rule da chot | Y | Co |
| Posting fail | M3 timeout/error | Shipment giu o trang thai cho retry/recovery, khong duplicate post | N | Co |
| Billing event fail | M10 khong nhan duoc | Retry event, khong rollback inventory neu M3 da thanh cong | N | Co |

### 38.2 Retry rules de xuat

| Process | Idempotency key | Retry rule |
|---|---|---|
| Create shipment | external_id + source_app | Tra ve ban ghi da ton tai neu duplicate |
| Allocate shipment | shipment_id + version | Khong tao duplicate allocation_records |
| Create pick work | shipment_id + line_number + work_type | Retry an toan, chi 1 bo work hop le |
| Capture tare | shipment_id + scale_ticket_no + TARE | Duplicate -> ignore/log |
| Capture gross | shipment_id + line_number + scale_ticket_no | Duplicate -> ignore/log |
| Post outbound M3 | shipment_id + line_number + POST_OUTBOUND | Retry an toan, khong duplicate InventTrans |
| Send billing event | shipment_id + line_number + BILLING_OUTBOUND | Co the retry bang outbox/event log |

### 38.3 Recovery path de xuat

- Neu **posting M3 fail tam thoi**: luu event vao outbox, mark shipment `POSTING_PENDING` o tang ky thuat (khong nhat thiet la business state), retry co kiem soat.
- Neu **billing fail nhung M3 da success**: khong rollback inventory; retry event billing rieng.
- Neu **M7 callback tre**: idempotent update theo work completion event.
- Neu **M8 gui gross truoc tare**: tu choi event va log exception.

---

## 39. Reporting & Audit Contract bo sung

### 39.1 KPI definition de xuat

| KPI | Dinh nghia | Grain | Nguon du lieu |
|---|---|---|---|
| Shipment count | So shipment tao / shipped / cancelled theo ngay | shipment_header | shipment_header |
| Allocation fail rate | So shipment allocate fail / tong shipment confirm | shipment_header | shipment_exception_log |
| Avg allocation-to-shipped time | TB thoi gian tu ALLOCATED den SHIPPED | shipment_header | shipment_status_history |
| Pending approval rate | So shipment vao PENDING_APPROVAL / tong shipment weighed | shipment_header | shipment_header + exception_log |
| Short pick rate | So line short pick / tong line duoc pick | shipment_line | M7 callback + shipment_line |
| DPM variance | |actual - nominal| theo line/shipment | shipment_line | shipment_line + weighing_attempt |

### 39.2 Drill-down audit toi thieu

Moi shipment phai truy vet duoc chuoi sau:
`shipment_header -> shipment_line -> allocation_record -> pick work ref -> weighing_attempt -> approval_decision_log -> M3 invent_trans ref -> billing_event_ref`

### 39.3 Truong audit bat buoc cho cac hanh dong nhay cam

| Action | Audit fields bat buoc |
|---|---|
| Manual weight | performed_by, reason_code, old/new weight, timestamp |
| Approve/reject | decided_by, decision, reason_code, comment, timestamp |
| Cancel | cancelled_by, cancel_reason_code, current_state, timestamp |
| Close | closed_by, close_reason_code, timestamp |
| Reversal | requested_by, approved_by neu can, reversal_reason_code, trans_ref |

---

## 40. Goi y bo sung API/domain contract o muc BA

Phan 25 cua tai lieu goc da co baseline API. De lam ro hon cho giai doan FS/API, de xuat bo sung them quy uoc sau:

### 40.1 Command APIs nhay cam bat buoc co
- `external_id`
- `correlation_id`
- `source_app`
- `performed_by`
- `reason_code` (neu la command exception)
- `expected_version` (neu ap dung optimistic concurrency o aggregate shipment)

### 40.2 Query APIs toi thieu de van hanh
- `GET /outbound/shipments/{shipment_id}/allocations`
- `GET /outbound/shipments/{shipment_id}/weighing-attempts`
- `GET /outbound/shipments/{shipment_id}/exceptions`
- `GET /outbound/shipments/{shipment_id}/approval-history`
- `GET /outbound/shipments/{shipment_id}/integration-status`

### 40.3 Response quy uoc de xuat

Moi command response nen co:
- `success`
- `business_state`
- `technical_state` (neu can)
- `shipment_id`
- `correlation_id`
- `errors[]` gom `code`, `message`, `field`, `severity`

---

## 41. Open decisions de chot truoc FS/API final

| # | Open item | De xuat BA | Muc uu tien |
|---|---|---|---:|
| 1 | Tolerance default neu owner/item chua cau hinh | De xuat 0.5% neu TVL chua co rule khac | P1 |
| 2 | Short pick threshold | De xuat <=2% auto-accept; >2%-<=5% manager review; >5% block | P1 |
| 3 | Locking strategy allocate | De xuat pessimistic row locking tren on_hand snapshot | P1 |
| 4 | Standalone shipment use cases | Bat buoc TVL liet ke danh sach tinh huong hop le | P1 |
| 5 | Co cho reweigh line fail hay khong | De xuat co, gioi han so lan va phai audit | P1 |
| 6 | Bulk blocking tinh tren shipped hay shipped + allocated_open | De xuat shipped + allocated_open de tranh over-commit | P1 |
| 7 | Billing event owner | De xuat M5 phat event, M10 tinh phi | P2 |
| 8 | Container stuffing BR-OUT-009 | Chot Phase 1 hay 2 | P2 |

---

## 42. Ket luan bo sung cua BA

Sau khi bo sung cac phu luc tren, tai lieu Module 5 co the duoc xem la da day hon o 4 lop:
- **Lop nghiep vu:** shipment, allocation, weighing, tolerance, approval, posting
- **Lop du lieu:** header/line/allocation/weighing/approval/audit
- **Lop tich hop:** M1, M2, M3, M4 va cac module lien quan
- **Lop van hanh & QA:** validation, exception, retry, reporting, audit

Phan noi dung goc van giu nguyen. Phan bo sung nay dong vai tro **appendix dac ta mo rong**, giup team dev intern, QA va Tech Lead giam muc do mo ho khi di vao FS/API/database/backend design.
