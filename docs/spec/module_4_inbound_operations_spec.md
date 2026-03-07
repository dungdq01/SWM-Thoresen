# TVL SWM — Module Specification
# Module 4: Inbound Operations

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Product Owner + Business Analyst  
**Phiên bản:** 1.0  
**Ngày:** 08/03/2026  
**Trạng thái:** Draft for Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Key User  

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Inbound Operations** của hệ thống SWM. Đây là module chịu trách nhiệm đưa hàng từ trạng thái **kế hoạch/chờ nhận** sang trạng thái **đã được chấp nhận chính thức vào kho**, có thể truy vết theo chuyến xe, theo receipt, theo lần cân và theo owner.

Nếu Module 2 giúp hệ thống biết **đang quản lý những thực thể nào**, còn Module 3 giúp hệ thống biết **tồn kho được ghi nhận như thế nào**, thì Module 4 giúp hệ thống biết **một chuyến hàng nhập đi qua các bước nghiệp vụ nào, khi nào được xem là đã nhận, khi nào bị từ chối, khi nào được cân lại, và khi nào được bàn giao sang putaway**.

Tài liệu được viết theo hướng:
- Người business hiểu rõ vì sao inbound phải bám weighbridge và tolerance, không thể nhập kho “theo cảm tính”.
- Dev/QA có thể bóc tiếp FS, API, state machine, exception handling, audit flow và integration points.
- Team dự án có baseline thống nhất giữa **Receipt layer**, **Weighbridge layer**, **Posting point sang M3** và **handoff sang M7 Work Execution**.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Inbound Operations là Module 4**.

Đây là module business đầu tiên biến “dự kiến nhập” thành “hàng đã được chấp nhận vào kho”. Module này không sở hữu inventory ledger, nhưng là nơi quyết định **sự kiện nào đủ điều kiện để gọi M3 post tồn**, và **khi nào phải chặn, reject hoặc re-weigh**.

Module 4 liên kết trực tiếp với:
- **M1 Foundation & Governance** để enforce quyền, reason code, audit và number sequence.
- **M2 Master Data** để lấy owner, item, warehouse, location, vehicle, tolerance baseline và receipt types.
- **M3 Inventory Core Engine** để post inbound transaction tại `RECEIVED`.
- **M7 Work Execution** để auto-create putaway work sau khi receipt được nhận.
- **M8 Weighbridge/OCR** để lấy gross/tare/net weight và scan B/L cho vessel flow.
- **M10 Billing** để capture inbound handling / weighing event khi receipt được nhận.
- **M11 Reporting & Audit** để truy vết receipt history, reject reasons, re-weigh attempts và throughput inbound.

Nói ngắn gọn, Module 4 là **operational gatekeeper của hàng nhập**.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho hàng xá và hàng bao với đặc thù:
- Không dùng barcode/RFID để xác nhận inbound quantity.
- Weighbridge là nguồn xác nhận trọng lượng thực tế cho bulk cargo.
- Một chuyến xe tương ứng một receipt nghiệp vụ để dễ truy vết.
- Có cả luồng **Standard Inbound** và **Vessel/B/L-based Inbound**.
- Tolerance không phải global mà phụ thuộc owner + item.
- Nếu vượt tolerance thì không đi approval kiểu thủ công; receipt phải vào `REJECTED` và chỉ được cân lại tối đa 3 lần.
- Inventory chỉ được tăng khi receipt thực sự đạt `RECEIVED`.
- Sau khi nhận xong phải bàn giao putaway để hàng rời khu receiving và đi vào storage.

Trong môi trường như vậy, nếu không có một module inbound rõ ràng:
- WB_OPERATOR có thể chọn sai xe, sai ASN, sai owner.
- Một receipt có thể bị cân nhiều lần nhưng không kiểm soát attempt.
- Inventory có thể bị cộng quá sớm ngay ở `WEIGHED_IN` hoặc `PROCESSING`.
- Tolerance fail có thể bị “du di” bằng cách cho qua không audit.
- Putaway có thể không được tạo hoặc tạo sai nguồn hàng sau khi receipt pass.
- Billing và inventory không còn bám cùng một sự kiện nghiệp vụ.

---

## 4. Mục tiêu của module

### 4.1 Mục tiêu nghiệp vụ

- Chuẩn hóa inbound flow từ planning đến receipt closing.
- Bảo đảm mọi inbound đều bám weighbridge weight và tolerance rule đã cấu hình.
- Bảo đảm chỉ receipt hợp lệ mới được accepted vào kho.
- Bảo đảm có flow rõ ràng cho reject, re-weigh, cancel và putaway handoff.
- Bảo đảm hàng bao được kiểm soát over-receipt ở cấp PO khi applicable.

### 4.2 Mục tiêu hệ thống

- Mỗi trip/xe tương ứng một receipt để truy vết rõ ràng.
- Mỗi lần cân phải có weighbridge log riêng.
- Posting sang M3 chỉ xảy ra duy nhất tại `RECEIVED`.
- Re-weigh phải giữ nguyên receipt number nhưng tăng attempt_number.
- Receipt close phải có điều kiện rõ ràng và trạng thái đã đủ chín.
- Retry/integration failure không được sinh duplicate receipt hoặc duplicate posting.

---

## 5. Phạm vi của module

### 5.1 In Scope — Phase 1

- Standard inbound với PO/ASN pre-created
- Vessel/B/L-based inbound có OCR-assisted matching
- Receipt state machine: `DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED → PUTAWAY → CLOSED`
- Exception states: `REJECTED`, `CANCELLED`
- Tolerance check theo owner + item
- Re-weigh flow tối đa 3 attempts
- Manual weight fallback theo quyền hạn
- Posting sang M3 tại `RECEIVED`
- Auto-create putaway work sang M7
- Receipt close rules
- PO-level blocking cho bagged inbound theo baseline hiện tại
- Audit trail cho cancel, manual entry, reject, re-weigh

### 5.2 Out of Scope / Phase 2

- Partial receipt
- Quality inspection hold / QC hold
- Barcode/RFID inbound confirmation
- Serial/Lot receiving engine phức tạp
- Multi-stop receipt trên cùng một trip
- Advanced berth scheduling / yard planning
- OCR confidence workflow quá chi tiết ngoài baseline match/fallback

---

## 6. Nguyên tắc thiết kế bắt buộc của module

1. **1 receipt = 1 trip = 1 xe.** [CONFIRMED — BR-IN-001]
   Đây là trục truy vết nghiệp vụ chính cho inbound.

2. **Weighbridge là nguồn xác nhận trọng lượng thực tế.** [CONFIRMED — CFM-06]
   Hệ thống không được coi expected_qty là received_qty.

3. **Posting point inbound duy nhất là `RECEIVED`.** [CONFIRMED — BR-INV-003]
   Các state trung gian không được cộng tồn kho.

4. **Tolerance fail đi vào `REJECTED`, không đi approval loop.** [CONFIRMED — PRD baseline]
   Flow approved-by-manager kiểu `PENDING_APPROVAL` đã bị loại bỏ khỏi baseline.

5. **Re-weigh giữ nguyên receipt number.** [CONFIRMED]
   Hệ thống phải tạo weighbridge_log mới cho từng attempt, không tạo receipt mới.

6. **Tối đa 3 lần re-weigh.** [CONFIRMED]
   Sau đó chỉ manager mới được quyết định cancel hoặc xử lý theo exception policy.

7. **Manual weight entry là exception, không phải normal path.** [CONFIRMED — BR-WB-002]
   Chỉ role có quyền mới được làm và phải có reason code.

8. **Receipt chỉ được close sau khi putaway đã hoàn tất theo baseline Phase 1.** [CONFIRMED]

9. **Bagged inbound phải kiểm soát over-receipt ở cấp PO khi rule đó áp dụng.** [CONFIRMED — BR-IN-011]
   Formula blocking: `SUM(bag_count FROM receipts WHERE po_id = X AND status IN (RECEIVED, PUTAWAY, CLOSED)) + current_receipt.bag_count <= po.expected_bag_count`. Nếu vượt → BLOCK, không cho receipt vào RECEIVED. Hàng xá (BULK) KHÔNG áp dụng formula này.

10. **Module 4 không tự ghi tồn kho trực tiếp.** [CONFIRMED — CFM-01]
    M4 chỉ gọi M3 posting engine khi đủ điều kiện nghiệp vụ.

---

## 7. Kết quả đầu ra chính của module

Khi Module 4 được triển khai đầy đủ, hệ thống phải tạo ra các output sau:

1. Receipt records theo từng trip inbound.
2. Weighbridge-linked receipt history theo từng lần cân.
3. Tolerance decision rõ ràng: pass hoặc reject.
4. Re-weigh attempt trail có audit.
5. Inbound posting trigger hợp lệ sang M3 tại `RECEIVED`.
6. Putaway work creation trigger sang M7.
7. Inbound billing trigger/event cho M10.
8. Receipt lifecycle rõ ràng từ planning đến close/cancel.
9. Exception trail cho manual weight, cancel, reject, override contexts.
10. Operational inquiry data cho dashboard inbound, audit và KPI.

---

## 8. Các đối tượng dữ liệu mà module quản lý

Module này sở hữu hoặc quản lý trực tiếp các object sau:
- `receipt_header`
- `receipt_line`
- `receipt_attempt` hoặc logic attempt_number tương đương trên receipt
- `receipt_status_history`
- `receipt_exception_log`
- `receipt_vehicle_link`
- `receipt_bl_link` cho vessel flow
- `receipt_putaway_link`

### 8.2 Schema tối thiểu cho receipt_header

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID / PK | — |
| receipt_number | string | Auto-generated theo M1 NumberSequence, unique per warehouse |
| receipt_type | enum | STANDARD / VESSEL |
| po_id | FK → purchase_order | PO liên quan |
| asn_id | FK → asn (nullable) | ASN nếu có |
| owner_id | FK → owner | Chủ hàng |
| vendor_id | FK → vendor | Nguồn giao hàng |
| warehouse_id | FK → warehouse | Kho nhận |
| receiving_location_id | FK → location | Location nhận hàng (type = RECEIVING) |
| vehicle_number | string | Biển số xe |
| bl_number | string (nullable) | B/L number — vessel flow only |
| expected_qty | decimal | Số lượng kỳ vọng (kg) |
| gross_weight_kg | decimal (nullable) | Cân vào |
| tare_weight_kg | decimal (nullable) | Cân ra |
| net_weight_kg | decimal (nullable) | = gross - tare |
| status | enum | DRAFT / AWAITING_WEIGHING / WEIGHED_IN / PROCESSING / WEIGHED_OUT / RECEIVED / PUTAWAY / CLOSED / REJECTED / CANCELLED |
| attempt_number | int | Số lần cân hiện tại (default 1) |
| tolerance_pct_applied | decimal (nullable) | Tolerance đã dùng cho check |
| variance_pct | decimal (nullable) | Độ lệch tính được |
| is_manual_entry | boolean | TRUE nếu weight nhập tay |
| manual_entry_reason_code | string (nullable) | Reason code khi manual |
| posted_trans_id | FK → invent_trans (nullable) | Link sang M3 posting |
| putaway_work_id | FK → work_header (nullable) | Link sang M7 putaway |
| cancel_reason_code | string (nullable) | — |
| cancelled_by | FK → user (nullable) | — |
| cancelled_at | timestamp (nullable) | — |
| external_id | string (unique) | Idempotency key |
| correlation_id | string | Cross-service trace |
| source_app | string | web / weighbridge / OCR / integration |
| created_by | FK → user | — |
| created_at | timestamp | Immutable |
| updated_by | FK → user | — |
| updated_at | timestamp | — |

### 8.3 Schema tối thiểu cho receipt_line

| Field | Type | Ghi chú |
|---|---|---|
| id | UUID / PK | — |
| receipt_header_id | FK → receipt_header | — |
| line_number | int | Thứ tự dòng |
| item_id | FK → item | Mặt hàng |
| uom | string | Đơn vị (KG, MT, BAG) |
| expected_qty | decimal | Số lượng kỳ vọng |
| received_qty | decimal (nullable) | = net_weight khi RECEIVED |
| bag_count | int (nullable) | Số bao — bắt buộc khi cargo_form = BAGGED_* |
| nominal_weight_per_bag | decimal (nullable) | Trọng lượng danh nghĩa/bao — bagged only |
| cargo_form | enum | BULK / BAGGED_25KG / BAGGED_50KG / JUMBO_1000KG |
| status | enum | Trạng thái dòng |
| created_at | timestamp | — |
| updated_at | timestamp | — |

Module này không sở hữu nhưng tham chiếu trực tiếp tới:
- `purchase_order`, `asn`, `owner`, `item`, `warehouse`, `location`, `vehicle_master` từ M2 và module planning liên quan
- `weighbridge_log`, OCR result, scale integration result từ M8
- `invent_trans`, `invent_dim`, `on_hand` từ M3
- `work_header`, `work_line` từ M7
- `billing_event` từ M10

---

## 9. Danh sách sub-modules

Module Inbound Operations được chia thành 8 sub-modules:

1. Inbound Planning & Receipt Creation
2. Vehicle Identification, Matching & Vessel/OCR Flow
3. Weigh-In / Processing / Weigh-Out Execution
4. Tolerance Check, Acceptance, Reject & Re-weigh
5. Inbound Posting Control (handoff sang M3)
6. Putaway Handoff & Receipt Closing
7. Exception Handling, Cancel & Manual Weight Governance
8. Inbound Auditability, Idempotency & Operational Reporting Hooks

---

## 10. Sub-module 1 — Inbound Planning & Receipt Creation

### 10.1 Mục đích

Tạo nền inbound đúng ngay từ đầu để khi xe tới cân, WB_OPERATOR có thể tìm và xử lý nhanh mà không phải đoán owner, item hay receipt context.

### 10.2 Mô tả nghiệp vụ

Trước khi xe vào quy trình cân, hệ thống phải có PO/ASN hoặc dữ liệu inbound baseline đủ để tạo receipt. Receipt là document runtime cho từng chuyến xe. Với luồng standard, ASN được pre-create và gắn vehicle list. Với luồng vessel, hệ thống có thể match theo B/L từ OCR rồi tạo hoặc chọn receipt context tương ứng.

### 10.3 Input

| Input | Mô tả |
|---|---|
| po_id | PO liên quan |
| asn_id | ASN liên quan nếu có |
| owner_id | chủ hàng |
| vendor_id / source_party | nguồn giao hàng |
| item_id | mặt hàng |
| expected_qty | số lượng dự kiến |
| vehicle_number | biển số xe |
| receipt_type | STANDARD / VESSEL |
| warehouse_id | kho nhận |
| to_location_id | receiving location mặc định |

### 10.4 Output

| Output | Mô tả |
|---|---|
| receipt_header | chứng từ receipt cho 1 trip |
| receipt_number | số receipt auto-generate |
| receipt_line | dòng hàng tương ứng |
| initial status | `DRAFT` hoặc context sẵn sàng cân |

### 10.5 Cases điển hình

#### Case 1 — Standard inbound có ASN sẵn
- **Input:** PO + ASN đã tạo, vehicle nằm trong vehicle_list
- **Output:** tạo/select receipt phù hợp cho chuyến xe đó

#### Case 2 — Vessel inbound qua B/L
- **Input:** OCR đọc được B/L, vessel reference, item
- **Output:** match đúng PO/owner hoặc fallback cho WB_OPERATOR chọn thủ công

#### Case 3 — Duplicate create request
- **Input:** integration/UI gửi lại cùng `external_id`
- **Output:** không tạo receipt trùng

### 10.6 Quy tắc bắt buộc

- 1 receipt đại diện cho đúng 1 trip/1 xe.
- Receipt number phải auto-sinh theo convention dự án và unique theo context kho.
- Không cho tạo receipt nếu owner/item/warehouse không hợp lệ.
- Hàng bao và hàng xá có thể khác baseline validation nhưng cùng dùng một receipt lifecycle lõi.
- Receipt type phải phân biệt tối thiểu `STANDARD` và `VESSEL`.

---

## 11. Sub-module 2 — Vehicle Identification, Matching & Vessel/OCR Flow

### 11.1 Mục đích

Giúp hệ thống xác định đúng chuyến inbound đang tới kho, giảm sai sót khi match giữa xe thực tế với planning data.

### 11.2 Mô tả nghiệp vụ

Ở luồng chuẩn, WB_OPERATOR tìm receipt theo biển số xe, ASN hoặc PO. Ở luồng vessel, OCR scan phiếu giao hàng/B/L để đề xuất mapping. Mục tiêu không phải làm OCR phức tạp mà là hỗ trợ match nhanh hơn, sau đó vẫn phải có fallback an toàn cho operator xác nhận thủ công.

### 11.3 Input

| Input | Mô tả |
|---|---|
| vehicle_number | biển số xe thực tế |
| bl_number | B/L number từ OCR/manual |
| ocr_result | kết quả scan nếu có |
| receipt candidates | danh sách receipt/ASN khả dụng |
| operator selection | lựa chọn cuối cùng của WB_OPERATOR |

### 11.4 Output

| Output | Mô tả |
|---|---|
| matched receipt context | receipt hoặc ASN đúng |
| confidence/fallback result | matched / manual select |
| audit trace | lưu cách match được xác nhận |

### 11.5 Quy tắc bắt buộc

- Luồng vessel phải hỗ trợ OCR-assisted matching nhưng không phụ thuộc tuyệt đối vào OCR.
- Nếu OCR không match chắc chắn, operator phải được chọn thủ công owner/B/L/PO trong phạm vi được phép.
- Mọi thay đổi match thủ công phải lưu audit.
- Không cho phép operator gắn xe vào receipt đã closed/cancelled.

---

## 12. Sub-module 3 — Weigh-In / Processing / Weigh-Out Execution

### 12.1 Mục đích

Thực thi luồng cân vào, xử lý dỡ hàng và cân bì ra để xác định net weight thực tế của chuyến hàng nhập.

### 12.2 Mô tả nghiệp vụ

Đây là xương sống vận hành của inbound. Xe lên cân vào để ghi gross, xuống hàng tại khu receiving/process area, sau đó quay lại cân bì để ghi tare. Hệ thống tính net weight và dùng net này cho tolerance check. Mỗi lần cân phải có weighbridge log rõ ràng để audit được.

### 12.3 State baseline

| State | Ý nghĩa nghiệp vụ | Có post tồn? |
|---|---|---|
| DRAFT | receipt vừa tạo/chưa sẵn sàng cân | Không |
| AWAITING_WEIGHING | chờ xe lên cân / chờ re-weigh | Không |
| WEIGHED_IN | đã có gross weight | Không |
| PROCESSING | xe đang xử lý dỡ hàng / xác nhận line | Không |
| WEIGHED_OUT | đã có tare weight và net weight | Không |
| RECEIVED | receipt pass tolerance, được chấp nhận vào kho | Có, gọi M3 |
| PUTAWAY | đã bàn giao hoặc đang putaway | Không post inbound mới |
| CLOSED | hoàn tất nghiệp vụ receipt | Không |
| REJECTED | fail tolerance, chờ re-weigh/cancel | Không |
| CANCELLED | chứng từ bị hủy hợp lệ | Không |

### 12.4 Input

| Input | Mô tả |
|---|---|
| receipt_id | receipt đang xử lý |
| gross_weight | cân vào |
| tare_weight | cân ra |
| weighbridge_ticket_id | ticket cân nếu có |
| timestamp | thời điểm cân |
| source_app | weighbridge/local agent |
| processing confirmation | xác nhận dỡ hàng / line readiness |

### 12.5 Output

| Output | Mô tả |
|---|---|
| weighbridge_log | log từng lần cân |
| gross/tare/net | bộ giá trị weight đã xác nhận |
| state transition | cập nhật trạng thái receipt |
| attempt tracking | attempt hiện tại |

### 12.6 State transition table chi tiết

> Bảng dưới đây mô tả đầy đủ các state transition hợp lệ, actor, guard condition và side effect. Dev PHẢI implement guards đúng — không dựa vào UI disable button.

| ID | From | To | Trigger | Actor | Guard | Side Effect |
|---|---|---|---|---|---|---|
| R-01 | DRAFT | AWAITING_WEIGHING | Confirm Receipt | WH_MANAGER / WH_ADMIN | PO/ASN valid; vehicle_number match | Number sequence assigned |
| R-02 | AWAITING_WEIGHING | WEIGHED_IN | Weigh-In event (scale) | WB_OPERATOR / System | weighbridge_log created; gross > 0 | weighbridge_log gắn receipt |
| R-03 | WEIGHED_IN | PROCESSING | Vehicle enters yard | WB_OPERATOR | — | timestamp: processing_started_at |
| R-04 | PROCESSING | WEIGHED_OUT | Weigh-Out event (scale) | WB_OPERATOR / System | weighbridge_log tare created; tare > 0; tare < gross | net_weight_kg = gross − tare |
| R-05 | WEIGHED_OUT | RECEIVED | Auto tolerance check PASS | System | variance_pct ≤ tolerance_pct | ★ InventTrans INBOUND +net_weight_kg; ⚡ Billing event INBOUND_HANDLING; auto-create Putaway WorkHeader |
| R-06 | WEIGHED_OUT | REJECTED | Auto tolerance check FAIL | System | variance_pct > tolerance_pct | attempt_count++ |
| R-07 | REJECTED | AWAITING_WEIGHING | Re-weigh initiated | WB_OPERATOR | attempt_count < 3 | Giữ receipt number; tạo mới weighbridge_log |
| R-08 | REJECTED | CANCELLED | Manager cancel after 3 fails | WH_MANAGER | attempt_count = 3; re-weigh button locked | Reason code bắt buộc; audit log |
| R-09 | RECEIVED | PUTAWAY | All Putaway WorkLines COMPLETED | System (M7 callback) | WorkHeader status = COMPLETED | InventTrans MOVE posted (RECEIVING→STORAGE) |
| R-10 | PUTAWAY | CLOSED | WH_MANAGER close | WH_MANAGER | No pending WorkLines | Receipt immutable |
| R-11 | DRAFT | CANCELLED | Cancel | WH_MANAGER / WH_ADMIN | No InventTrans exists | — |
| R-12 | AWAITING_WEIGHING | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |
| R-13 | WEIGHED_IN | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |
| R-14 | PROCESSING | CANCELLED | Cancel | WH_MANAGER | — | Reason code bắt buộc |

**Forbidden transitions (Dev phải reject):**

| From | To | Lý do |
|---|---|---|
| RECEIVED | CANCELLED | Đã post InventTrans — phải dùng Inventory Adjustment (M6) |
| PUTAWAY | CANCELLED | Đã MOVE — phải dùng Adjustment |
| CLOSED | any | Immutable |
| REJECTED (attempt=3) | AWAITING_WEIGHING | Re-weigh button locked — chỉ WH_MANAGER cancel |
| PROCESSING | RECEIVED | Phải qua WEIGHED_OUT trước |
| DRAFT | RECEIVED | Không được bỏ qua weighing |

### 12.7 Công thức và quy tắc bắt buộc

- `net_weight_kg = gross_weight - tare_weight`
- Mỗi weigh-in hoặc weigh-out phải tạo/cập nhật weighbridge log có trace với `receipt_id`.
- Weight nên ưu tiên đọc tự động từ M8/local agent.
- Latency từ scale read đến phản hồi hệ thống phải nằm trong ngưỡng baseline đã chốt.
- Manual weight entry chỉ là fallback exception path.
- Không cho vào `WEIGHED_OUT` nếu chưa có gross hợp lệ trước đó.

---

## 13. Sub-module 4 — Tolerance Check, Acceptance, Reject & Re-weigh

### 13.1 Mục đích

Quyết định một receipt có được hệ thống chấp nhận vào kho hay không sau khi đã có net weight thực tế.

### 13.2 Mô tả nghiệp vụ

Khi đã có `expected_qty` và `net_weight`, hệ thống phải chạy tolerance check. Nếu nằm trong ngưỡng, receipt được auto-accept sang `RECEIVED`. Nếu vượt ngưỡng, receipt bị `REJECTED` và phải đi qua re-weigh flow, thay vì treo chờ approval thủ công như các baseline cũ.

### 13.3 Input

| Input | Mô tả |
|---|---|
| expected_qty | số lượng kỳ vọng |
| net_weight | số lượng thực tế sau cân |
| tolerance_pct | tolerance theo owner + item [CONFIRMED — BR-IN-006] |
| attempt_number | số lần cân hiện tại |
| max_reweigh_attempts | mặc định baseline = 3 [CONFIRMED] |

### 13.4 Output

| Output | Mô tả |
|---|---|
| variance_pct | độ lệch |
| acceptance result | PASS / FAIL |
| next state | RECEIVED hoặc REJECTED |
| re-weigh eligibility | còn được cân lại hay không |

### 13.5 Công thức baseline

`variance_pct = |net_weight - expected_qty| / expected_qty × 100`

### 13.5B Tolerance lookup algorithm (reference M2)

Khi cần lấy tolerance_pct cho một receipt, hệ thống phải dùng M2 tolerance lookup theo thứ tự ưu tiên:

```
function getInboundTolerance(owner_id, item_id):
  // Step 1: owner_item_policy (highest priority)
  policy = lookup owner_item_policy WHERE owner_id AND item_id AND is_active
  IF policy.tolerance_pct_inbound IS NOT NULL → RETURN policy.tolerance_pct_inbound

  // Step 2: item default
  item = lookup item WHERE item_id
  IF item.tolerance_pct_inbound IS NOT NULL → RETURN item.tolerance_pct_inbound

  // Step 3: owner default
  owner = lookup owner WHERE owner_id
  IF owner.default_tolerance_pct IS NOT NULL → RETURN owner.default_tolerance_pct

  // Step 4: system default [TO-CONFIRM: 0.5% — TVL cần confirm]
  RETURN system_config.default_tolerance_pct  // 0.5%
```

> **Lưu ý:** M4 KHÔNG tự query database trực tiếp cho tolerance. M4 gọi M2 tolerance service/function.

### 13.6 Cases điển hình

#### Case 1 — Pass tolerance
- **Input:** expected 30,000 kg, net 30,300 kg, tolerance 2%
- **Output:** variance = 1%; receipt → `RECEIVED`

#### Case 2 — Fail tolerance, cho cân lại
- **Input:** expected 30,000 kg, net 31,800 kg, tolerance 2%, attempt = 1
- **Output:** variance = 6%; receipt → `REJECTED`, có thể bấm re-weigh

#### Case 3 — Quá số lần re-weigh
- **Input:** attempt = 4th request
- **Output:** khóa thao tác re-weigh; escalate theo quyền manager

### 13.7 Quy tắc bắt buộc

- Tolerance phải lấy theo owner + item, không hard-code global khi chưa có cấu hình.
- Nếu `variance_pct <= tolerance_pct` thì auto `RECEIVED`.
- Nếu `variance_pct > tolerance_pct` thì `REJECTED`.
- Không dùng `PENDING_APPROVAL` trong baseline go-live hiện tại.
- Re-weigh giữ nguyên receipt number, chỉ tăng attempt và tạo weighbridge log mới.
- Max re-weigh attempts = 3 theo baseline hiện tại.
- Sau 3 lần fail liên tiếp, thao tác tiếp theo phải do role đủ quyền quyết định.

---

## 14. Sub-module 5 — Inbound Posting Control (handoff sang M3)

### 14.1 Mục đích

Đảm bảo inventory chỉ được cộng khi receipt đã được chấp nhận chính thức và posting sang M3 diễn ra đúng một lần, đúng thời điểm.

### 14.2 Mô tả nghiệp vụ

Module 4 không sở hữu ledger tồn kho, nhưng chịu trách nhiệm phát ra đúng business event cho M3. Khi receipt chuyển sang `RECEIVED`, hệ thống gọi posting engine của M3 để tạo `InventTrans` inbound. Các state trước đó không được post. Nếu receipt bị cancel trước `RECEIVED` thì không có reverse vì chưa từng cộng tồn.

### 14.3 Input

| Input | Mô tả |
|---|---|
| receipt_id | receipt đã pass tolerance |
| receipt_line | dòng hàng cần post |
| net_weight | qty thực nhận |
| receiving_location | location nhận ban đầu |
| owner/item/status | dimensions đầu vào cho M3 |
| external_id | idempotency key |

### 14.4 Output

| Output | Mô tả |
|---|---|
| posting request | command sang M3 |
| posting result | success/fail + trans_id |
| receipt update | trace posting trên receipt |
| billing trigger | event cho M10 nếu applicable |

### 14.5 Quy tắc bắt buộc

- Posting point inbound duy nhất là `RECEIVED`.
- `DRAFT`, `AWAITING_WEIGHING`, `WEIGHED_IN`, `PROCESSING`, `WEIGHED_OUT`, `REJECTED`, `CANCELLED` không được post inbound inventory.
- Posting phải dùng net_weight thực tế, không dùng expected_qty.
- Dimension đích ban đầu là receiving location + owner + AVAILABLE theo baseline.
- Cùng event retry với cùng `external_id` không được tạo trans trùng.
- Nếu posting fail, receipt không được giả vờ thành công mà thiếu trace trạng thái kỹ thuật.

### 14.6 Billing event payload khi RECEIVED

Khi receipt chuyển sang `RECEIVED`, ngoài posting M3, hệ thống phải capture billing event cho M10:

| Field | Giá trị | Ghi chú |
|---|---|---|
| event_type | INBOUND_HANDLING | — |
| receipt_id | receipt đang xử lý | — |
| owner_id | chủ hàng | — |
| item_id | mặt hàng | — |
| cargo_form | BULK / BAGGED_* / JUMBO_* | Dùng để map billing rate |
| warehouse_id | kho nhận | — |
| net_weight_mt | net_weight_kg / 1000 | Đơn vị MT cho billing |
| receipt_type | STANDARD / VESSEL | — |
| event_timestamp | thời điểm RECEIVED | — |
| correlation_id | trace ID | — |

> M4 chỉ capture event. M10 sở hữu rate lookup và charge calculation.

### 14.7 Mapping baseline sang M3

| Receipt event | Điều kiện | Gọi M3 | Kết quả mong đợi |
|---|---|---|---|
| Receipt → RECEIVED | tolerance pass | POST inbound | `InventTrans` qty dương tại receiving dim |
| Receipt cancel trước RECEIVED | chưa từng post | Không | không có reverse |
| Receipt cancel sau RECEIVED (edge case theo policy) | đã từng post | Reverse qua M3 | tồn được đảo chiều có audit |

---

## 15. Sub-module 6 — Putaway Handoff & Receipt Closing

### 15.1 Mục đích

Bàn giao hàng đã nhận sang thực thi putaway và đóng receipt khi phần công việc inbound đã hoàn tất.

### 15.2 Mô tả nghiệp vụ

Sau khi receipt đạt `RECEIVED`, hàng đang ở receiving location về mặt inventory. Tiếp theo hệ thống phải tạo putaway work cho M7 để thủ kho di chuyển hàng vào storage. Khi work hoàn tất theo baseline Phase 1, receipt đi vào `PUTAWAY` rồi có thể `CLOSED`.

### 15.3 Input

| Input | Mô tả |
|---|---|
| receipt_id | receipt đã received |
| source_location | RECEIVING |
| destination rule | STORAGE location rule |
| work template/context | data để tạo work |
| work completion status | trạng thái hoàn tất từ M7 |

### 15.4 Output

| Output | Mô tả |
|---|---|
| putaway work header | work tạo sang M7 |
| work lines | dòng putaway |
| receipt state update | RECEIVED → PUTAWAY → CLOSED |
| close eligibility | được close hay chưa |

### 15.5 Quy tắc bắt buộc

- Receipt `RECEIVED` phải auto-create Putaway WorkHeader theo baseline.
- WorkHeader ban đầu ở trạng thái `OPEN`, chưa assigned.
- Putaway destination phải là location type `STORAGE`.
- Receipt không được close khi putaway chưa hoàn tất theo rule đã chốt.
- Trạng thái `PUTAWAY` phải được giữ riêng, không nuốt mất vào `CLOSED` ngay từ đầu.
- Nếu receipt là bulk và baseline auto-transition áp dụng do đã ở location storage, logic đó vẫn phải để lại trace rõ ràng.

---

## 16. Sub-module 7 — Exception Handling, Cancel & Manual Weight Governance

### 16.1 Mục đích

Kiểm soát những tình huống ngoại lệ của inbound để hệ thống vẫn an toàn, có audit và không làm hỏng inventory truth.

### 16.2 Mô tả nghiệp vụ

Inbound thực tế luôn có lỗi vận hành: scale không đọc được, OCR không match, operator chọn nhầm receipt, xe cân sai, receipt cần cancel. Module 4 phải cho xử lý ngoại lệ nhưng trong vùng kiểm soát chặt: đúng quyền, đúng state, có reason code và có audit trail.

### 16.3 Input

| Input | Mô tả |
|---|---|
| cancel request | yêu cầu hủy receipt |
| manual weight request | nhập tay gross/tare |
| reason_code | lý do ngoại lệ |
| user role | người thao tác |
| current receipt status | trạng thái hiện tại |

### 16.4 Output

| Output | Mô tả |
|---|---|
| exception decision | allow/reject |
| audit log | before/after + user + time + reason |
| state update | nếu hợp lệ |
| escalation trail | khi cần manager xử lý |

### 16.5 Quy tắc bắt buộc

- Manual weight entry chỉ cho role đủ quyền, bắt buộc `reason_code` và cờ `is_manual_entry = TRUE`.
- Cancel chỉ được phép ở các trạng thái được chốt trong baseline hiện tại trước khi inventory đã đi quá xa.
- Cancel trước `RECEIVED` không đòi reverse tồn vì chưa post.
- Với edge case cancel sau `RECEIVED`, phải phối hợp reverse với M3 theo policy được phép.
- Exception actions phải lưu audit trail và technical trace.
- Không cho operator thường bypass tolerance bằng thao tác UI riêng.

### 16.6 Baseline cancel matrix

| Current State | Có được cancel? | Ghi chú |
|---|---|---|
| DRAFT | Có | chưa phát sinh inventory |
| AWAITING_WEIGHING | Có | hợp lệ |
| WEIGHED_IN | Theo baseline confirm hiện tại | cần reason + audit |
| PROCESSING | Có theo baseline đã xác nhận | cần reason + audit |
| WEIGHED_OUT | Không khuyến khích; cần policy rõ | tránh xung đột tolerance/posting timing |
| RECEIVED | Không theo normal path | chỉ edge case có reverse policy |
| PUTAWAY | Không theo normal path | phải xử lý qua adjustment/reversal control |
| CLOSED | Không | immutable ở mức nghiệp vụ |

---

## 17. Sub-module 8 — Inbound Auditability, Idempotency & Operational Reporting Hooks

### 17.1 Mục đích

Bảo vệ inbound flow khỏi duplicate request, mất trace khi retry, và thiếu dữ liệu để vận hành/audit/reporting.

### 17.2 Mô tả nghiệp vụ

Inbound chạm nhiều boundary dễ lỗi: web UI, local weighbridge agent, OCR, mobile, posting sang M3, work creation sang M7. Vì vậy ngoài logic nghiệp vụ, module này phải có cơ chế chống duplicate, lưu correlation trail và expose data points đủ cho dashboard inbound.

### 17.3 Input

| Input | Mô tả |
|---|---|
| external_id | khóa idempotency |
| correlation_id | trace xuyên các service |
| source_app | web / weighbridge / OCR / integration |
| request payload | command tạo/đổi trạng thái receipt |

### 17.4 Output

| Output | Mô tả |
|---|---|
| idempotent response | tránh tạo receipt/posting trùng |
| audit trail | lịch sử thao tác nghiệp vụ |
| technical log | retry/fail/timeout/integration trace |
| reporting hook | dữ liệu cho KPI inbound |

### 17.5 KPI hooks tối thiểu nên có

- số receipt theo ngày / theo kho / theo owner
- average turnaround time từ weigh-in đến received
- reject rate theo owner + item
- re-weigh count theo xe / theo operator / theo kho
- manual weight entry count
- putaway pending aging sau received

### 17.6 Quy tắc bắt buộc

- Tạo receipt với cùng `external_id` không được sinh duplicate.
- Posting retry tại `RECEIVED` không được tạo duplicate inbound trans.
- Work creation retry sau `RECEIVED` không được tạo nhiều putaway work cho cùng receipt nếu không có policy rõ.
- Mọi exception quan trọng phải truy ngược được bằng `correlation_id`.

---

## 18. Input và Output tổng thể của module

### 18.1 Input tổng thể

| Nhóm input | Nội dung |
|---|---|
| Planning data | PO, ASN, owner, item, vehicle list, expected qty |
| Runtime weigh data | gross, tare, net, weigh ticket, timestamps |
| OCR/Vessel data | B/L, vessel reference, scan result |
| Governance data | permission, reason code, number sequence, idempotency |
| Inventory handoff context | receiving location, owner, status, external_id |
| Work handoff context | source location, destination rule, work template |

### 18.2 Output tổng thể

| Nhóm output | Nội dung |
|---|---|
| Receipt lifecycle | receipt + status history |
| Weight evidence | weighbridge logs theo attempt |
| Acceptance result | pass/reject/re-weigh state |
| Posting trigger | lệnh hợp lệ sang M3 tại RECEIVED |
| Work trigger | putaway work sang M7 |
| Billing trigger | inbound handling / weighing event cho M10 |
| Audit & exception | manual entry, cancel, re-weigh, match fallback logs |
| Reporting hooks | KPI inbound, aging, reject, throughput |

---

## 19. Quan hệ dữ liệu và ownership cần giữ rõ

### 19.1 Ownership ranh giới

- M1 sở hữu quyền, reason code, audit policy, number sequence, idempotency baseline.
- M2 sở hữu item, owner, warehouse, location, vehicle-related master và tolerance master baseline.
- **M4 sở hữu receipt lifecycle và inbound business flow.**
- M8 sở hữu đọc cân, weighbridge integration, OCR pipeline và weighbridge log capture.
- M3 sở hữu inventory posting truth.
- M7 sở hữu work execution sau khi M4 tạo putaway request.
- M10 sở hữu billing calculation nhưng nhận trigger/event từ M4/M3.

### 19.2 Ranh giới dễ nhầm phải khóa ngay

- M4 không được tự update `OnHand` hay `InventTrans` bằng SQL/direct DB path.
- M8 không được tự quyết receipt accepted/rejected nếu không qua business rules của M4.
- M7 không được tự create putaway mà không có handoff hợp lệ từ receipt `RECEIVED`.
- M10 không được xem expected_qty là inbound billable truth nếu receipt chưa reach `RECEIVED`.

---

## 20. Business rules cốt lõi của module

| Rule ID | Business Rule | Source Baseline |
|---|---|---|
| INB-BR-001 | 1 receipt = 1 trip = 1 xe. | BR-IN-001 |
| INB-BR-002 | Standard inbound phải bám PO/ASN pre-create và vehicle matching. | BR-IN-003 |
| INB-BR-003 | Weigh data phải đến từ weighbridge integration; manual entry là exception path. | BR-WB-001 / BR-WB-002 |
| INB-BR-004 | Mỗi lần cân phải có weighbridge log. | BR-WB-004 |
| INB-BR-005 | `net_weight = gross - tare`. | Weighbridge baseline |
| INB-BR-006 | `variance_pct = |net - expected| / expected`. | BR-IN-004 |
| INB-BR-007 | Tolerance lấy theo owner + item. | BR-IN-006 |
| INB-BR-008 | `variance <= tolerance` thì auto `RECEIVED`. | BA-PO Master / state machine baseline |
| INB-BR-009 | `variance > tolerance` thì `REJECTED`, không dùng `PENDING_APPROVAL`. | PRD / state machine baseline |
| INB-BR-010 | Re-weigh giữ nguyên receipt number, tối đa 3 lần. | PRD / BA-PO Master |
| INB-BR-011 | Posting inbound chỉ tại `RECEIVED`. | BR-INV-003 |
| INB-BR-012 | Receipt `RECEIVED` phải auto-create putaway work theo baseline. | BA-PO Master / System flow |
| INB-BR-013 | Putaway destination phải là `STORAGE`. | BR-MD-002 |
| INB-BR-014 | Receipt chỉ close khi putaway đã hoàn tất theo rule hiện tại. | BA-PO Master |
| INB-BR-015 | Hàng bao áp dụng PO-level blocking, bulk không áp dụng rule này. | BA-PO Master / PRD baseline |
| INB-BR-016 | Cancel và manual weight phải có reason code + audit. | RBAC / Governance baseline |

---

## 21. Dependencies liên module

### 21.1 Module phụ thuộc vào M4

- M3 nhận posting trigger từ `RECEIVED`
- M7 nhận putaway work trigger sau `RECEIVED`
- M10 nhận inbound billing event và throughput source
- M11 dùng receipt history, reject, re-weigh, aging cho báo cáo

### 21.2 Module M4 phụ thuộc vào

- M1 cho permission, audit, reason code, sequence, idempotency
- M2 cho owner/item/warehouse/location/tolerance/vehicle data
- M3 cho inventory posting và reversal control
- M7 cho putaway execution
- M8 cho gross/tare/net, OCR và local agent

---

## 22. Yêu cầu phi chức năng áp cho module

| Nhóm | Yêu cầu |
|---|---|
| Integrity | Không cộng tồn trước `RECEIVED`; reject/re-weigh không làm sai inventory |
| Reliability | Retry từ weighbridge/integration không tạo duplicate receipt hoặc duplicate post |
| Performance | Search receipt theo xe/BL/ASN đủ nhanh cho WB_OPERATOR; phản hồi cân trong ngưỡng chấp nhận |
| Traceability | Mỗi lần cân, mỗi lần reject, re-weigh, cancel đều truy vết được |
| Auditability | Manual entry, match fallback, cancel, edge-case reversal phải có audit |
| Usability | Operator thao tác ít bước, rõ ràng, tránh chọn nhầm receipt |
| Recoverability | Scale fail có fallback; OCR fail có manual select; posting fail có technical recovery path |
| Extensibility | Có thể mở rộng partial receipt và QC hold ở Phase 2 mà không phá lifecycle lõi |

---

## 23. Acceptance criteria ở mức module

Module Inbound Operations được xem là đạt khi tối thiểu thỏa các điều kiện sau:

1. Receipt lifecycle chạy đúng baseline từ planning đến closing.
2. Standard inbound và vessel flow đều xác định được receipt context hợp lệ.
3. Weigh-in và weigh-out ghi nhận đúng gross/tare/net và log theo từng attempt.
4. Tolerance pass thì `RECEIVED`, fail thì `REJECTED`; không còn `PENDING_APPROVAL`.
5. Re-weigh giữ nguyên receipt number và khóa ở lần vượt quá max attempt.
6. Inbound posting chỉ xảy ra tại `RECEIVED` và dùng net_weight thực tế.
7. Receipt `RECEIVED` tạo putaway work đúng một lần theo policy.
8. Receipt chỉ close khi putaway đã đủ điều kiện hoàn tất.
9. Manual weight/cancel đều enforce đúng quyền + reason code + audit.
10. Hàng bao không bị over-receipt vượt PO nếu rule blocking đang áp dụng.

### 23.1 Acceptance Criteria chi tiết theo sub-module

**Sub-module 1 — Planning & Receipt Creation**
- AC-1.1: Tạo receipt từ ASN hợp lệ → sinh đúng 1 receipt number
- AC-1.2: Cùng `external_id` gửi lại → không tạo duplicate receipt
- AC-1.3: Receipt phải gắn được owner, item, warehouse, vehicle/trip context

**Sub-module 2 — Matching & OCR**
- AC-2.1: Search theo vehicle_number trả đúng receipt candidates
- AC-2.2: OCR match được B/L → operator xác nhận nhanh
- AC-2.3: OCR fail → operator vẫn có thể chọn thủ công trong phạm vi hợp lệ

**Sub-module 3 — Weigh Execution**
- AC-3.1: Weigh-in tạo gross weight log và cập nhật state đúng
- AC-3.2: Weigh-out tạo tare log, hệ thống tính net đúng
- AC-3.3: Không thể vào `WEIGHED_OUT` khi chưa có gross hợp lệ
- AC-3.4: Manual weight chỉ role đủ quyền mới thao tác được

**Sub-module 4 — Tolerance / Reject / Re-weigh**
- AC-4.1: `variance <= tolerance` → auto `RECEIVED`
- AC-4.2: `variance > tolerance` → `REJECTED`
- AC-4.3: Re-weigh attempt 1..3 hợp lệ; lần 4 bị khóa
- AC-4.4: Re-weigh không đổi receipt number nhưng tạo log attempt mới

**Sub-module 5 — Posting Control**
- AC-5.1: `RECEIVED` gọi M3 tạo inbound trans qty dương theo net weight
- AC-5.2: Intermediate states không tạo inbound trans
- AC-5.3: Retry cùng event tại `RECEIVED` không tạo duplicate posting

**Sub-module 6 — Putaway & Closing**
- AC-6.1: Receipt `RECEIVED` → auto-create putaway work
- AC-6.2: Putaway destination bắt buộc là location type `STORAGE`
- AC-6.3: Receipt chưa hoàn tất putaway → không close được

**Sub-module 7 — Exception & Cancel**
- AC-7.1: Cancel ở state hợp lệ → thành công và lưu reason code
- AC-7.2: Cancel receipt trước `RECEIVED` → không phát sinh reverse
- AC-7.3: Manual weight entry phải lưu `is_manual_entry = TRUE` và audit trail

**Sub-module 8 — Auditability & Reporting Hooks**
- AC-8.1: Có thể trace từ receipt sang weighbridge logs, M3 trans và M7 work
- AC-8.2: Duplicate request không tạo receipt/work/posting trùng
- AC-8.3: Dashboard hook đọc được reject count, re-weigh count, pending putaway aging

---

## 24. User stories cốt lõi theo góc nhìn BA/PO

### US-M4-001: Standard Inbound Planning
**As a** WH_ADMIN / WH_MANAGER,  
**I want to** pre-create PO and ASN with vehicle list,  
**So that** WB_OPERATOR can quickly match incoming vehicles to the right receipts.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: PO có owner, vendor, item, expected_qty, expected_date
- AC2: ASN hỗ trợ vehicle_list để search theo biển số xe
- AC3: 1 receipt = 1 trip = 1 xe
- AC4: Receipt number auto-generate đúng convention theo kho
- AC5: Hỗ trợ receipt_type = `VESSEL` cho luồng B/L

### US-M4-002: Inbound Weighing
**As a** WB_OPERATOR,  
**I want to** capture gross and tare from the scale automatically,  
**So that** net weight is calculated reliably without manual errors.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Weight ưu tiên đọc tự động từ scale/local agent
- AC2: Mỗi lần cân tạo weighbridge log có receipt link
- AC3: `net = gross - tare`
- AC4: Manual weight chỉ cho role đủ quyền + reason code
- AC5: Retry/fallback path không làm mất trace nghiệp vụ

### US-M4-003: Tolerance Check — Received Path
**As a** System,  
**I want to** auto-accept receipts within tolerance,  
**So that** inbound posting can happen immediately and consistently.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: `variance_pct = |net - expected| / expected`
- AC2: `variance <= tolerance` → auto `RECEIVED`
- AC3: Tolerance lấy theo owner + item
- AC4: `RECEIVED` là điểm trigger posting sang M3
- AC5: Billing inbound event được capture theo policy

### US-M4-004: Tolerance Check — Rejected + Re-weigh
**As a** WB_OPERATOR,  
**I want to** re-weigh rejected receipts,  
**So that** scale errors or operational anomalies can be corrected without creating a new receipt.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: `variance > tolerance` → `REJECTED`
- AC2: Re-weigh đưa receipt về `AWAITING_WEIGHING`
- AC3: Tối đa 3 attempts
- AC4: Giữ nguyên receipt number, tạo weighbridge log mới
- AC5: Attempt pass sau re-weigh vẫn đi `RECEIVED` bình thường

### US-M4-005: Posting at Received
**As a** System,  
**I want to** post inventory exactly at `RECEIVED`,  
**So that** stock increases only after official inbound acceptance.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Intermediate states không post inventory
- AC2: M3 nhận qty = net_weight thực tế
- AC3: Receiving dimension đúng owner/location/status
- AC4: Retry không sinh duplicate trans
- AC5: Cancel trước `RECEIVED` không cần reverse

### US-M4-006: Putaway Handoff
**As a** System,  
**I want to** create putaway work after receiving,  
**So that** WH_KEEPER can move goods from receiving to storage immediately.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Receipt `RECEIVED` → auto-create Putaway WorkHeader
- AC2: WorkHeader `OPEN`, chưa assigned
- AC3: Source = receiving, destination = storage
- AC4: Work complete → receipt đủ điều kiện vào `PUTAWAY` / close path

### US-M4-007: Receipt Closing & Bagged Blocking
**As a** WH_MANAGER,  
**I want to** close receipts only after putaway is done and enforce PO-level blocking for bagged goods,  
**So that** receipt becomes immutable and bagged inbound is not over-received.

**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC1: Receipt `CLOSED` là immutable ở mức nghiệp vụ
- AC2: Chỉ close khi putaway hoàn tất
- AC3: Hàng bao vượt expected bag_count của PO → block
- AC4: Hàng xá không áp dụng blocking kiểu bag_count này
- AC5: Cancel bị chặn ở các state không còn hợp lệ

---

## 25. Gợi ý API/domain contract mức khái niệm

> Phần này là baseline để bóc tiếp FS/API chi tiết, chưa phải contract cuối cùng.

- `POST /inbound/receipts`
- `GET /inbound/receipts/search`
- `GET /inbound/receipts/{receipt_id}`
- `POST /inbound/receipts/{receipt_id}/match-vessel`
- `POST /inbound/receipts/{receipt_id}/weigh-in`
- `POST /inbound/receipts/{receipt_id}/weigh-out`
- `POST /inbound/receipts/{receipt_id}/reweigh`
- `POST /inbound/receipts/{receipt_id}/cancel`
- `POST /inbound/receipts/{receipt_id}/close`
- `GET /inbound/receipts/{receipt_id}/history`

**Command payload tối thiểu nên có:**
- `external_id`
- `correlation_id`
- `receipt_id` hoặc planning reference
- `vehicle_number`
- `bl_number` (nếu vessel)
- `gross_weight` / `tare_weight`
- `weighbridge_ticket_id`
- `source_app`
- `reason_code` (khi exception)
- `performed_by`

---

## 26. Điểm cần chốt thêm trước khi bóc FS/API chi tiết

| # | To-Confirm Item | Priority | Impact | Deadline đề xuất |
|---|---|---|---|---|
| 1 | Tolerance default nếu owner+item chưa cấu hình sẽ là bao nhiêu | P1 | Ảnh hưởng auto accept/reject behavior | Trước FS M4 |
| 2 | Putaway split: 1 receipt có hỗ trợ nhiều destination locations trong Phase 1 không | P1 | Ảnh hưởng work generation và UI close path | Trước FS M4/M7 |
| 3 | Cancel ở `WEIGHED_IN` và `WEIGHED_OUT` chốt chính thức thế nào | P1 | Ảnh hưởng state machine và exception policy | Trước SIT |
| 4 | Với vessel flow, OCR mismatch được phép manual override ở mức nào | P2 | Ảnh hưởng UX + audit + permission | Trước UX sign-off |
| 5 | Bulk auto-transition nếu destination đã là storage sẽ áp dụng đúng các case nào | P2 | Ảnh hưởng state trace và M7 integration | Trước FS M7 |
| 6 | Blocking hàng bao dùng `bag_count` đơn thuần hay cần thêm UOM conversion cases | P2 | Ảnh hưởng validation logic | Trước FS bagged flow |
| 7 | Billing event capture nằm ở M4 event hay M3/M10 subscriber là source of truth cuối cùng | P2 | Ảnh hưởng integration contract | Trước FS M10 |

---

## 27. Khuyến nghị cho Dev Team

1. Tách rõ `receipt lifecycle service`, `tolerance decision service`, `posting handoff service` và `putaway handoff service`, tránh nhồi toàn bộ vào một controller/service.  
2. Dùng idempotency key cho các command nhạy cảm: create receipt, weigh-in, weigh-out, re-weigh, received-posting trigger.  
3. State transition phải được guard bằng domain rules, không phụ thuộc UI disable button.  
4. Không để M8 quyết định business acceptance; M8 chỉ cung cấp weigh data và OCR result.  
5. Giữ trace link từ receipt → weighbridge_log → invent_trans → work_header để QA/audit drill-down được.  
6. Thiết kế event/retry path để posting fail hoặc work creation fail không gây double action.

---

## 28. Khuyến nghị cho QA Team

1. Test đủ state machine inbound cả happy path và reject/re-weigh path.  
2. Test duplicate retry cho create receipt, weigh-in, weigh-out, received posting.  
3. Test tolerance theo nhiều owner/item khác nhau.  
4. Test manual weight, cancel và OCR fallback dưới các role khác nhau.  
5. Test bagged blocking ở PO level và bulk không bị apply sai rule.  
6. Test traceability end-to-end: receipt → M3 inbound trans → M7 putaway → close.

---

## 29. Kết luận

Module 4 là nơi hệ thống quyết định hàng nhập **đã thật sự được nhận vào kho hay chưa**. Nó không chỉ là màn hình tạo receipt hay nút bấm cân xe. Đây là **business gate** nối giữa planning, weighbridge, inventory và work execution.

Nếu Module 4 được build đúng:
- đội vận hành cân xe nhanh và ít nhầm hơn,
- inventory chỉ tăng đúng thời điểm,
- reject/re-weigh có logic rõ ràng,
- putaway được bàn giao ngay sau khi nhận,
- billing và reporting bám cùng một sự kiện nghiệp vụ đáng tin.

Nếu build sai module này:
- receipt và weighbridge có thể lệch nhau,
- inventory tăng quá sớm hoặc tăng trùng,
- inbound reject không truy vết được,
- hàng nhận xong nhưng putaway không được kiểm soát,
- downstream billing và reporting sẽ mất nền sự thật vận hành.

---

## 30. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được biên soạn theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp các tài liệu cũ và mới mâu thuẫn nhau, ưu tiên đề xuất như sau:

1. PRD / BA-PO Master / Blueprint / Module Overview bản mới hơn  
2. State Machine Inbound/Outbound Spec để xác định lifecycle và posting timing  
3. Inventory Transaction Spec để xác định handoff sang M3  
4. Business Rules Document để tham chiếu rule code chi tiết  
5. Project Charter dùng cho governance dự án, cadence, RACI và change control

