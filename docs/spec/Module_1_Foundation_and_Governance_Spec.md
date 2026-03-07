# TVL SWM — Module Specification
# Module 1: Foundation & Governance

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Business Analyst 10 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 07/03/2026  
**Trạng thái:** Draft for Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Key User  

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Foundation & Governance** của hệ thống SWM. Đây là module nền tảng nhưng không phải module “phụ trợ”. Nó quyết định hệ thống có được vận hành đúng quyền, đúng quy tắc, đúng số chứng từ, đúng audit và đúng baseline triển khai hay không.

Nếu Master Data giúp hệ thống biết **đang quản lý cái gì**, còn Inventory Core Engine giúp hệ thống biết **ghi nhận tồn kho như thế nào**, thì Foundation & Governance giúp toàn bộ chương trình biết **ai được làm gì, làm theo luật nào, dùng mã gì, lưu vết ra sao, và đâu là baseline được phép build**.

Tài liệu được viết theo hướng:
- Người business có thể hiểu vai trò của module trong bức tranh tổng thể.
- Người non-business vẫn hiểu module này đang kiểm soát điều gì.
- Dev/QA có thể dùng như nền để bóc tiếp API spec, DB design, permission matrix, audit design, test scenario.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Foundation & Governance là Module 1** và đóng vai trò làm “lớp kiểm soát nền” cho tất cả module còn lại.

Module này không trực tiếp tạo receipt, shipment hay billing. Tuy nhiên, mọi module sau đều phụ thuộc vào nó:
- Không có RBAC đúng → user thao tác sai quyền.
- Không có number sequence đúng → chứng từ và transaction không truy vết được.
- Không có reason code/audit policy → không kiểm soát được ngoại lệ.
- Không có baseline rules catalog → dev build theo tài liệu cũ, QA test theo tài liệu mới, dẫn đến lệch hệ thống.
- Không có idempotency policy → retry từ mobile/weighbridge/API có thể sinh duplicate posting.

Nói ngắn gọn, module này là **lớp “kỷ luật hệ thống”**.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho bulk cargo và bagged goods trong bối cảnh:
- Không dùng barcode/RFID làm trục chính.
- Weighbridge là nguồn xác nhận khối lượng thực tế.
- Dữ liệu tồn kho phải đi qua bộ ba **InventDim → InventTrans → OnHand**.
- Billing phụ thuộc trực tiếp vào transaction truth và snapshot cuối ngày.
- Hệ thống có nhiều vai trò thao tác: Warehouse Manager, Warehouse Keeper, Weighbridge Operator, Billing Officer, Admin, Customer Viewer.
- Có ngoại lệ nghiệp vụ nhạy cảm như manual weight, cancel sau post, force approve outbound, inventory adjustment, re-weigh.

Trong môi trường như vậy, nếu không có lớp governance thống nhất, hệ thống rất dễ rơi vào các rủi ro:
- Sai người thực hiện sai thao tác.
- Cùng một nghiệp vụ nhưng mỗi module hiểu một kiểu.
- Dữ liệu bị sửa tay mà không trace được.
- Retry gây trùng transaction.
- Tài liệu cũ và mới chồng chéo khiến build sai baseline.

---

## 4. Mục tiêu của module

### 4.1 Mục tiêu nghiệp vụ

- Chuẩn hóa quyền hạn của từng vai trò trong hệ thống.
- Chuẩn hóa quy tắc nền dùng chung cho tất cả module.
- Chuẩn hóa cách sinh mã chứng từ và mã giao dịch.
- Chuẩn hóa danh mục reason code để mọi ngoại lệ đều được phân loại đúng.
- Chuẩn hóa audit trail và exception trail để phục vụ kiểm soát nội bộ, truy vết và xử lý tranh chấp.
- Thiết lập baseline governance cho quá trình build, test, deploy và vận hành.

### 4.2 Mục tiêu hệ thống

- Mọi command có side effect phải có cơ chế chống duplicate.
- Mọi thao tác ngoại lệ phải có reason code và audit.
- Mọi chứng từ và transaction phải có reference format nhất quán.
- Mọi module downstream phải bám cùng một rule catalog và glossary thống nhất.
- Mọi thay đổi quan trọng phải có before/after, user, timestamp và correlation trail.

---

## 5. Phạm vi module

### 5.1 In-scope

1. RBAC & Permission Control  
2. Role Catalog & Responsibility Baseline  
3. Number Sequence & Reference Control  
4. Business Rules Baseline Catalog  
5. Reason Code Catalog  
6. Audit Trail Policy  
7. Exception Governance  
8. Idempotency & Command Safety Policy  
9. Document Control & Decision Baseline  
10. Governance support cho AI-first delivery (prompt log, verify checklist, traceability)  

### 5.2 Out-of-scope

- Thiết kế chi tiết workflow của Inbound, Outbound, Inventory, Billing, VAS.
- Thiết kế DB logic của InventTrans/OnHand/InventDim.
- Tính phí chi tiết theo rate card.
- Dashboard/report UI chi tiết.
- Quản lý user provisioning từ hệ thống IAM bên ngoài.

### 5.3 Boundary với các module khác

- Module này **không sở hữu transaction business flow**, mà sở hữu **luật nền** để flow được kiểm soát.
- Module này **không quyết định inventory posting business event**, nhưng quyết định **quy tắc nền bắt buộc cho posting** như audit, idempotency, role authority, numbering, immutable ledger policy.
- Module này **không thay thế security engineering**, nhưng là nơi định nghĩa baseline permission và audit scope ở mức nghiệp vụ-hệ thống.

---

## 6. Nguyên tắc nền tảng phải giữ xuyên suốt

Các nguyên tắc dưới đây là baseline mà toàn hệ thống phải tuân thủ:

1. **Chứng từ không phải nguồn sự thật cuối cùng của tồn kho.**  
   Nguồn sự thật của tồn kho là bộ ba **InventDim → InventTrans → OnHand**.

2. **Inbound chỉ post tồn khi đạt RECEIVED.**  
   Các state trước đó chỉ là state vận hành.

3. **Outbound chỉ trừ tồn khi đạt SHIPPED.**  
   Allocation/Picking chưa được hiểu là giảm physical_qty.

4. **Weighbridge là nguồn xác nhận khối lượng thực tế.**  
   Manual weight chỉ được phép theo chính sách kiểm soát đặc biệt.

5. **Mọi ngoại lệ ảnh hưởng business phải có reason code và audit trail.**

6. **Billing chỉ đáng tin khi transaction truth đã đúng.**  
   Không đi tắt từ chứng từ sang phí nếu chưa đi qua transaction baseline.

7. **Ledger đã post là bất biến.**  
   Không update/delete trực tiếp InventTrans đã post. Sửa sai bằng reverse.

8. **Idempotency là bắt buộc cho mọi API có side effect.**

9. **Module phải tách ownership rõ ràng.**  
   Receipt không sở hữu tồn kho; Work không sở hữu billing; Debit Note không sở hữu operational truth.

10. **Mọi baseline rule phải có tình trạng rõ ràng.**  
   Chỉ có 3 trạng thái được phép dùng trong tài liệu: `[CONFIRMED]`, `[TO-CONFIRM]`, `[PHASE 2]`.

---

## 7. Kết quả đầu ra chính của module

Khi module Foundation & Governance được triển khai đầy đủ, hệ thống phải có tối thiểu các output sau:

1. Permission matrix chuẩn cho Web/Mobile/API.
2. Role catalog và rule áp dụng cho từng hành động trọng yếu.
3. Number sequence config cho tất cả chứng từ trọng yếu.
4. Rule baseline catalog dùng chung giữa BA/Dev/QA.
5. Reason code catalog có phân nhóm rõ ràng.
6. Audit log policy và audit schema thống nhất.
7. Exception governance policy cho manual/override/reverse/cancel.
8. Idempotency policy cho command APIs và integrations.
9. Decision log để xử lý chồng chéo giữa tài liệu cũ và baseline mới.
10. Checklist kiểm soát cho build/test/go-live.

---

## 8. Input và Output tổng thể của module

### 8.1 Input tổng thể

| Nhóm input | Nội dung |
|---|---|
| User & Role | Danh sách user, role, chức năng, màn hình, command, approval authority |
| Business baseline | Rule đã confirmed, rule còn mở, boundary Phase 1/Phase 2 |
| Document baseline | PRD, Blueprint, BRD, Project Charter, Module Master, Overview Spec |
| Operation policy | Quy tắc manual weight, cancel, reverse, override, lock, export |
| Numbering requirement | Prefix, scope, reset policy, uniqueness policy |
| Audit requirement | Audit scope, retention, before/after, correlation, device source |
| Integration safety | Retry, duplicate prevention, external_id, command idempotency |
| Governance requirement | Cadence review, decision ownership, sign-off, change control |

### 8.2 Output tổng thể

| Nhóm output | Nội dung |
|---|---|
| RBAC baseline | Permission matrix, action authority, approval boundary |
| Numbering baseline | Sequence definition cho receipt/shipment/work/transaction/debit note |
| Rule catalog | Danh mục rule confirmed/to-confirm/phase 2 |
| Reason code baseline | Danh sách mã lý do, category, bắt buộc/không bắt buộc, approval flag |
| Audit baseline | Audit schema, audit scope, retention, mandatory fields |
| Exception baseline | Chính sách override, reverse, cancel, manual entry |
| Integration safety baseline | Idempotency rule, retry-safe command contract |
| Governance artifact | Decision log, issue log, baseline glossary, change traceability |

---

## 9. Các đối tượng dữ liệu mà module quản lý hoặc chi phối

Module này không sở hữu các object giao dịch vận hành như Receipt hay Shipment, nhưng nó sở hữu hoặc chi phối các object kiểm soát sau:

- `role`
- `permission`
- `role_permission`
- `reason_code`
- `number_sequence`
- `audit_log`
- `exception_log`
- `business_rule_catalog`
- `decision_log`
- `change_control_record`
- `idempotency_key` hoặc logic external_id policy

Ngoài ra module này còn chi phối cách các object khác phải vận hành, ví dụ:
- `invent_trans` phải immutable
- `receipt/shipment` phải dùng sequence chuẩn
- `command APIs` phải dùng external_id
- `manual weight` phải có reason_code + audit

---

## 10. Danh sách sub-modules

Module Foundation & Governance được chia thành 8 sub-modules để dễ phân tích, thiết kế và triển khai:

1. RBAC & Permission Control  
2. Role Responsibility & Approval Governance  
3. Number Sequence & Reference Control  
4. Business Rules Baseline Management  
5. Reason Code Management  
6. Audit Trail & Exception Governance  
7. Idempotency & Command Safety Control  
8. Document Governance, Change Control & Delivery Baseline  

---

# 11. Sub-module 1 — RBAC & Permission Control

## 11.1 Mục đích

Quản lý ai được quyền xem, tạo, sửa, xác nhận, post, cancel, approve, reverse, lock, export và quản trị trên từng nhóm chức năng.

Đây là lớp phân quyền vận hành chính thức của hệ thống. Mục tiêu không chỉ là “ẩn/hiện nút”, mà là **kiểm soát authority ở cả UI, API và workflow**.

## 11.2 Mô tả nghiệp vụ

TVL có nhiều vai trò với nhiệm vụ khác nhau. Một số thao tác là tác vụ thường ngày, nhưng một số thao tác có rủi ro cao và phải được giới hạn rất chặt, ví dụ:
- manual weight
- inventory adjustment
- force approve outbound
- cancel sau post
- reverse transaction
- lock debit note

Vì vậy RBAC phải hỗ trợ ít nhất 3 lớp:
- **View authority**: được xem dữ liệu nào
- **Action authority**: được thao tác gì
- **Approval authority**: được duyệt hay override gì

## 11.3 Input

| Input | Mô tả |
|---|---|
| Role catalog | Danh sách vai trò go-live |
| Function catalog | Danh sách module, menu, action, command |
| Business authority rules | Hành động nào cần manager/admin/billing authority |
| Owner scope rules | Customer Viewer chỉ xem dữ liệu theo owner |
| App channel | Web, Mobile, API, System |

## 11.4 Output

| Output | Mô tả |
|---|---|
| Permission matrix | Ma trận quyền chi tiết theo role × action |
| Action policy | Chính sách create/edit/confirm/post/cancel/approve/export |
| UI/API enforcement rule | Quy định kiểm tra quyền ở cả frontend và backend |
| Restricted action registry | Danh sách hành động nhạy cảm cần audit mạnh |

## 11.5 Roles Go-Live baseline

| Role Code | Vai trò | Mục đích chính |
|---|---|---|
| ADMIN | System Admin | Toàn quyền cấu hình hệ thống |
| WH_MANAGER | Warehouse Manager | Quản lý vận hành kho và ngoại lệ |
| WH_KEEPER | Warehouse Keeper | Tác nghiệp kho thực địa |
| WB_OPERATOR | Weighbridge Operator | Vận hành cân và OCR |
| BILLING_OFC | Billing Officer | Vận hành billing và debit note |
| OPS_SUPER | Operations Supervisor | Giám sát vận hành và dashboard |
| WH_ADMIN | Warehouse Admin | Tạo/chỉnh chứng từ vận hành nền |
| CUST_VIEWER | Customer Viewer | Chỉ xem dữ liệu trong phạm vi owner |

## 11.6 Output quyền ở mức business

| Nhóm hành động | Quyền mặc định |
|---|---|
| Xem dashboard/reports | Theo role và owner scope |
| Tạo PO/Receipt/SO/Shipment | WH_ADMIN / WH_MANAGER / role được ủy quyền |
| Execute work | WH_KEEPER / WH_MANAGER |
| Weigh in/out | WB_OPERATOR |
| Manual weight | WH_MANAGER |
| Inventory adjustment | WH_MANAGER |
| Force approve outbound exception | WH_MANAGER |
| Lock debit note | BILLING_OFC |
| System setup | ADMIN |

## 11.7 Business cases điển hình

### Case 1 — Customer Viewer chỉ được xem dữ liệu owner của mình
- **Input:** user role = CUST_VIEWER, owner_id = CUST001
- **Output:** chỉ xem được inventory/report/shipment/receipt liên quan owner CUST001
- **Kỳ vọng:** không được xem dữ liệu owner khác, kể cả qua export hoặc deep link API

### Case 2 — Warehouse Keeper không được manual weight
- **Input:** user role = WH_KEEPER, thao tác nhập tay trọng lượng
- **Output:** hệ thống từ chối hành động
- **Kỳ vọng:** chỉ WH_MANAGER được phép manual weight

### Case 3 — Billing Officer được lock debit note nhưng không được post inventory
- **Input:** user role = BILLING_OFC
- **Output:** được tạo/generate/lock debit note; không được gọi action post/reverse inventory

### Case 4 — API phải chặn dù UI bị bypass
- **Input:** user không có quyền nhưng gửi API trực tiếp
- **Output:** backend trả forbidden
- **Kỳ vọng:** RBAC không chỉ nằm ở frontend

## 11.8 Quy tắc bắt buộc

- Permission phải kiểm ở backend là lớp cuối cùng.
- Export cũng phải chịu kiểm soát giống view data.
- Quyền approval phải tách khỏi quyền execute nếu nghiệp vụ yêu cầu.
- Các action nhạy cảm phải log role ณ thời điểm action.

---

# 12. Sub-module 2 — Role Responsibility & Approval Governance

## 12.1 Mục đích

Xác định ranh giới trách nhiệm giữa các vai trò, đặc biệt cho các thao tác cần phê duyệt, override hoặc sign-off.

## 12.2 Mô tả nghiệp vụ

RBAC trả lời câu hỏi **“ai được bấm nút”**, còn sub-module này trả lời câu hỏi **“ai chịu trách nhiệm nghiệp vụ khi nút đó được bấm”**.

Trong hệ thống TVL, đây là phần rất quan trọng vì có nhiều ngoại lệ có thể dẫn đến tranh chấp số liệu hoặc doanh thu:
- outbound fail tolerance cần manager override
- manual weight có thể ảnh hưởng trực tiếp inventory/billing
- reverse/cancel sau post ảnh hưởng ledger integrity
- lock debit note ảnh hưởng thương mại và công nợ

## 12.3 Input

| Input | Mô tả |
|---|---|
| Role catalog | Vai trò vận hành |
| Action catalog | Danh sách action nhạy cảm |
| RACI baseline | Trách nhiệm theo dự án và vận hành |
| Approval policy | Hành động nào cần approve/override |

## 12.4 Output

| Output | Mô tả |
|---|---|
| Approval matrix | Ai approve hành động nào |
| Segregation of duties | Phân tách nhiệm vụ để giảm rủi ro |
| Escalation policy | Chính sách escalations khi phát sinh ngoại lệ |
| Sign-off checkpoints | Điểm chốt trách nhiệm trong build/test/UAT/go-live |

## 12.5 Cases điển hình

### Case 1 — Outbound exception approval
- **Input:** shipment có line fail tolerance
- **Output:** trạng thái chờ xử lý tập trung; WH_MANAGER là role được force approve
- **Giá trị kiểm soát:** tránh để keeper hoặc operator tự quyết ngoại lệ

### Case 2 — Inventory adjustment
- **Input:** điều chỉnh tồn kho do shrinkage/damage/manual correction
- **Output:** chỉ role có authority được tạo adjustment với reason_code bắt buộc
- **Giá trị kiểm soát:** tránh sửa tồn tùy tiện

### Case 3 — UAT checkpoint sign-off
- **Input:** kết quả test, defect summary, go/no-go decision
- **Output:** sign-off record theo vai trò Sponsor/PO/PM/QA/IMP
- **Giá trị kiểm soát:** bảo đảm go-live có điểm chốt trách nhiệm rõ

## 12.6 Nguyên tắc

- Người thực hiện và người duyệt không nên luôn là cùng một người cho các tác vụ nhạy cảm.
- Các action có tác động thương mại hoặc ledger phải có authority cao hơn action tác nghiệp thông thường.
- Approval phải lưu được: ai duyệt, lúc nào, duyệt cái gì, lý do gì, trước/sau ra sao.

---

# 13. Sub-module 3 — Number Sequence & Reference Control

## 13.1 Mục đích

Quản lý việc sinh mã chứng từ và mã giao dịch thống nhất, không trùng, có khả năng truy vết, dễ đọc và phù hợp vận hành phân tán theo kho.

## 13.2 Mô tả nghiệp vụ

Trong SWM, sequence không chỉ để “đẹp mã”. Nó là chìa khóa để:
- truy vết giao dịch
- đối chiếu chứng từ với log hệ thống
- vận hành ngoài hiện trường
- hỗ trợ audit/billing/dispute resolution

Baseline hiện tại yêu cầu:
- Scope = **PER_WAREHOUSE**
- Mỗi kho có counter riêng
- Format chuẩn: `PREFIX-YYYYMMDD-SEQ`
- Sequence dùng cho ít nhất: Receipt, Shipment, Work, Transaction, Debit Note

## 13.3 Input

| Input | Mô tả |
|---|---|
| Sequence code | RCV, SHP, WRK, TRX, DN, TRF, ADJ... |
| Scope | warehouse_code |
| Date reset policy | daily reset |
| Format rule | prefix + date + zero-padded sequence |
| Command context | document type, warehouse, posting time |

## 13.4 Output

| Output | Mô tả |
|---|---|
| Generated reference | Mã chứng từ/giao dịch hợp lệ |
| Sequence config | Cấu hình sequence đang active |
| Collision prevention | Chính sách chống trùng mã |
| Reusable service | Service dùng chung cho các module khác |

## 13.5 Baseline mã số đề xuất

| Object | Prefix | Ví dụ |
|---|---|---|
| Inbound Receipt | RCV | RCV-20260315-000001 |
| Shipment | SHP | SHP-20260315-000001 |
| Work | WRK | WRK-20260315-000001 |
| Inventory Transaction | TRX | TRX-20260315-000001 |
| Transfer | TRF | TRF-20260315-000001 |
| Adjustment | ADJ | ADJ-20260315-000001 |
| Debit Note | DN | DN-20260331-000001 |

## 13.6 Cases điển hình

### Case 1 — Sinh số Receipt theo kho
- **Input:** warehouse = WH5.1, sequence_code = RCV, ngày = 2026-03-15
- **Output:** RCV-20260315-000001
- **Ý nghĩa:** độc lập với kho khác

### Case 2 — Hai kho cùng tạo Receipt cùng ngày
- **Input:** WH5.1 và WH5.3 cùng phát sinh receipt
- **Output:** mỗi kho có counter riêng, không xung đột

### Case 3 — Retry cùng external_id không sinh mã mới
- **Input:** client retry do timeout nhưng cùng external_id
- **Output:** trả về reference đã sinh trước đó
- **Ý nghĩa:** chống duplicate và giữ trace sạch

### Case 4 — Giao dịch fail giữa chừng
- **Input:** transaction tạo số nhưng DB rollback kỹ thuật
- **Output:** phải có chính sách rõ về trace sequence; không gây mất khả năng audit

## 13.7 Quy tắc bắt buộc

- Sequence generation phải thread-safe / transaction-safe.
- Mã không được tái sử dụng.
- Không được sinh reference khác nhau cho cùng một command đã xử lý thành công.
- Sequence service phải được dùng qua shared service, không để từng module tự viết format riêng.

---

# 14. Sub-module 4 — Business Rules Baseline Management

## 14.1 Mục đích

Quản lý baseline rule chính thức để team BA, Dev, QA, PM cùng dùng một nguồn sự thật cho việc build và test.

## 14.2 Mô tả nghiệp vụ

SWM hiện có nhiều tài liệu: Project Charter, PRD, Blueprint, BRD, Module Master, Inventory Spec, Master Data Spec. Nếu không có baseline catalog, cùng một nghiệp vụ có thể bị hiểu khác nhau.

Ví dụ tiêu biểu:
- Một số tài liệu cũ còn ghi inbound fail tolerance → `PENDING_APPROVAL`.
- Baseline mới hơn đã chốt inbound fail tolerance → `REJECTED` + re-weigh, không dùng inbound approval ở go-live.

Do đó, module này phải đóng vai trò **trọng tài baseline**.

## 14.3 Input

| Input | Mô tả |
|---|---|
| Tài liệu nguồn | PRD, Blueprint, BRD, Module Master, Overview, Charter |
| Confirmed decisions | Các quyết định TVL đã chốt |
| To-confirm list | Điểm còn mở |
| Phase boundary | Phase 1 vs Phase 2 |

## 14.4 Output

| Output | Mô tả |
|---|---|
| Rule catalog | Danh mục rule chính thức |
| Rule status | CONFIRMED / TO-CONFIRM / PHASE 2 |
| Superseded note | Ghi chú rule cũ đã bị thay thế |
| Rule owner | BA/PO/Lead chịu trách nhiệm xác nhận |

## 14.5 Cấu trúc rule catalog đề xuất

| Trường | Ý nghĩa |
|---|---|
| rule_code | Mã rule nội bộ |
| domain | INBOUND / OUTBOUND / INVENTORY / BILLING / FOUNDATION |
| title | Tên rule |
| description | Mô tả rule |
| current_status | CONFIRMED / TO-CONFIRM / PHASE 2 |
| source_of_truth | Tài liệu đang được lấy làm baseline |
| supersedes | Rule/tài liệu cũ bị thay thế |
| effective_phase | Go-Live / Phase 2 |
| owner | Người chịu trách nhiệm nội dung |
| last_reviewed_at | Ngày rà soát cuối |

## 14.6 Cases điển hình

### Case 1 — Inbound fail tolerance
- **Input:** cùng một rule xuất hiện khác nhau ở BRD và PRD mới
- **Output:** catalog phải chốt baseline go-live là `REJECTED + re-weigh`, đồng thời đánh dấu rule cũ là superseded

### Case 2 — Inventory status go-live
- **Input:** tài liệu inventory status
- **Output:** baseline chính thức chỉ có 4 status go-live: AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT

### Case 3 — Batch/Lot tracking
- **Input:** yêu cầu mở rộng tương lai
- **Output:** đánh dấu `PHASE 2`, không đưa vào build Phase 1

## 14.7 Quy tắc bắt buộc

- Mọi backlog build phải trace ngược được về rule catalog.
- QA test case phải map được về rule_code.
- Rule catalog phải có cột “source of truth” và “superseded” để tránh nhầm lẫn tài liệu cũ mới.

---

# 15. Sub-module 5 — Reason Code Management

## 15.1 Mục đích

Chuẩn hóa mã lý do cho các hành động ngoại lệ hoặc hành động nhạy cảm, để dữ liệu audit có ý nghĩa nghiệp vụ và có thể thống kê được.

## 15.2 Mô tả nghiệp vụ

Nếu chỉ cho user nhập free text lý do, hệ thống sẽ không thể:
- phân tích xu hướng ngoại lệ
- đối soát nguyên nhân sai lệch
- quản trị kiểm soát nội bộ
- làm báo cáo quản trị rủi ro

Do đó, cần reason code catalog với category, approval flag, ảnh hưởng billing/audit và mô tả business rõ ràng.

## 15.3 Input

| Input | Mô tả |
|---|---|
| Exception scenarios | Manual weight, cancel, reverse, adjustment, status change, override |
| Business categories | MANUAL_WEIGHT, CANCEL, ADJUSTMENT, DAMAGE, SHRINKAGE, OTHER |
| Approval policy | Loại nào cần approve |
| Billing impact | Loại nào ảnh hưởng billing |

## 15.4 Output

| Output | Mô tả |
|---|---|
| Reason code catalog | Danh sách mã dùng chung toàn hệ thống |
| Category map | Nhóm lý do theo domain |
| Validation policy | Hành động nào bắt buộc reason code |
| Reporting base | Nền để báo cáo ngoại lệ |

## 15.5 Cấu trúc dữ liệu đề xuất

| Field | Ý nghĩa |
|---|---|
| code | Mã lý do |
| description | Mô tả |
| category | Nhóm lý do |
| requires_approval | Có cần duyệt hay không |
| affects_billing | Có ảnh hưởng thương mại hay không |
| is_active | Có còn dùng hay không |

## 15.6 Danh mục category đề xuất

- MANUAL_WEIGHT
- CANCEL
- REVERSE
- ADJUSTMENT
- DAMAGE
- SHRINKAGE
- STATUS_CHANGE
- EXCEPTION_OVERRIDE
- DOCUMENT_ERROR
- SCALE_ISSUE
- OTHER

## 15.7 Cases điển hình

### Case 1 — Manual weight entry
- **Input:** WH_MANAGER nhập tay cân do thiết bị lỗi
- **Output:** bắt buộc chọn reason code thuộc nhóm MANUAL_WEIGHT
- **Kỳ vọng:** ghi audit đầy đủ approved_by/user/time

### Case 2 — Inventory adjustment
- **Input:** cần điều chỉnh tồn do shrinkage hoặc damage
- **Output:** bắt buộc chọn reason code ADJUSTMENT/SHRINKAGE/DAMAGE phù hợp

### Case 3 — Cancel document
- **Input:** cancel receipt hoặc shipment ở state cho phép
- **Output:** bắt buộc chọn reason code CANCEL

### Case 4 — Force approve outbound
- **Input:** manager duyệt ngoại lệ outbound
- **Output:** reason code EXCEPTION_OVERRIDE + audit trail

## 15.8 Quy tắc bắt buộc

- Không cho nhập free text thay cho reason code ở các action nhạy cảm, nhưng có thể cho thêm notes bổ sung.
- Reason code phải dùng chung giữa UI, API, audit, reporting.
- Không được hard-code reason list riêng lẻ theo màn hình.

---

# 16. Sub-module 6 — Audit Trail & Exception Governance

## 16.1 Mục đích

Thiết lập cơ chế ghi vết và kiểm soát ngoại lệ cho toàn hệ thống, để bất kỳ thay đổi quan trọng nào cũng truy ngược được ai làm, lúc nào, thay đổi gì và vì sao.

## 16.2 Mô tả nghiệp vụ

Trong bài toán TVL, audit không phải phần “nice to have”. Đây là nền bắt buộc vì:
- manual weight là điểm cực kỳ nhạy cảm
- reverse/cancel có thể làm thay đổi số liệu inventory/billing
- dữ liệu cân và posting ảnh hưởng trực tiếp tranh chấp khách hàng
- hệ thống cần retention dài để phục vụ đối soát và kiểm tra nội bộ

## 16.3 Input

| Input | Mô tả |
|---|---|
| Entity list | INVENT_TRANS, ON_HAND, RECEIPT, SHIPMENT, TRANSFER, WORK_ORDER, ADJUSTMENT... |
| Action list | CREATE, UPDATE, POST, CANCEL, APPROVE, REJECT, REVERSE |
| Mandatory audit fields | user, role, timestamp, old/new, reason_code... |
| Exception scenarios | manual, override, duplicate reject, reverse, lock |

## 16.4 Output

| Output | Mô tả |
|---|---|
| audit_log schema | Schema lưu vết chuẩn |
| exception_log policy | Chính sách log ngoại lệ |
| retention policy | Chính sách lưu giữ |
| traceability rule | Quy tắc truy vết xuyên module |

## 16.5 Audit schema tối thiểu

| Field | Mục đích |
|---|---|
| id | khóa chính |
| entity_type | loại entity bị tác động |
| entity_id | id entity |
| action | hành động |
| field_name | field thay đổi nếu có |
| old_value | giá trị cũ |
| new_value | giá trị mới |
| user_id | ai làm |
| user_role | role tại thời điểm thao tác |
| ip_address | nguồn truy cập |
| device_type | WEB/MOBILE/API/SYSTEM |
| timestamp | thời gian |
| reason_code | lý do nếu là action nhạy cảm |
| notes | mô tả bổ sung |
| correlation_id | gom nhóm event liên quan |

## 16.6 Khi nào bắt buộc audit mạnh

Các hành động sau phải luôn có audit record đầy đủ:
- manual weight
- cancel document
- reverse transaction
- adjustment inventory
- status change
- force approve outbound
- lock debit note
- thay đổi role/permission
- thay đổi sequence config
- thay đổi reason code master

## 16.7 Cases điển hình

### Case 1 — Reverse transaction
- **Input:** user thực hiện reverse InventTrans
- **Output:** audit log action = REVERSE, reason_code bắt buộc, correlation_id nối trans gốc và trans đảo

### Case 2 — Manual weight
- **Input:** cân nhập tay do scale lỗi
- **Output:** audit đầy đủ user, role, reason, old/new, device_type

### Case 3 — Update permission matrix
- **Input:** ADMIN thay đổi quyền một role
- **Output:** phải audit trước/sau để trace ai mở quyền gì

### Case 4 — Exception reporting
- **Input:** tập hợp audit/exception log theo tháng
- **Output:** thống kê được loại ngoại lệ nào xảy ra nhiều nhất và bởi vai trò nào

## 16.8 Quy tắc bắt buộc

- Audit log không được phụ thuộc vào frontend.
- Audit phải ghi ở backend hoặc event layer đáng tin cậy.
- Retention tối thiểu 7 năm cho transaction-related logs.
- Cần hỗ trợ correlation giữa nhiều log thuộc cùng một flow.

---

# 17. Sub-module 7 — Idempotency & Command Safety Control

## 17.1 Mục đích

Ngăn duplicate command khi client retry do timeout, mạng chập chờn, queue local, weighbridge resend hoặc integration replay.

## 17.2 Mô tả nghiệp vụ

TVL có các nguồn phát lệnh nhạy cảm với duplicate:
- Mobile App trong điều kiện mạng không ổn định
- Weighbridge Local Agent đọc từ COM port và gửi lên hệ thống
- API integrations hoặc worker jobs

Nếu không có idempotency, hệ thống có thể:
- post receipt/shipment trùng
- tạo 2 InventTrans cho 1 event
- sinh nhiều mã chứng từ cho 1 request
- lệch on-hand và billing

## 17.3 Input

| Input | Mô tả |
|---|---|
| external_id | khóa idempotency từ client/integration |
| ref_type/ref_id/ref_line_id | tham chiếu business |
| command name | post receipt, post shipment, reverse, confirm, lock... |
| payload fingerprint | dùng khi cần so sánh nội dung |

## 17.4 Output

| Output | Mô tả |
|---|---|
| Duplicate-safe response | trả kết quả cũ nếu cùng request |
| Reject policy | từ chối nếu duplicate không hợp lệ |
| Idempotency registry | nơi lưu dấu command đã xử lý |
| Technical guardrails | unique constraints / row locks / dedup checks |

## 17.5 Rule baseline đề xuất

1. `external_id` phải được gửi cho mọi command API có side effect.  
2. Cùng `external_id` + cùng command context → trả kết quả cũ, không tạo record mới.  
3. Receipt posting phải check `(ref_type, ref_id, ref_line_id, stage=PHYSICAL)`.  
4. Shipment posting phải check tương tự.  
5. Reverse không được chạy 2 lần trên cùng 1 trans gốc.  
6. InventDim dùng `dim_hash` để dedup.  
7. Allocation/number sequence phải có lock strategy phù hợp.  

## 17.6 Cases điển hình

### Case 1 — Mobile retry sau timeout
- **Input:** người dùng bấm Complete Work, app timeout và retry lại cùng external_id
- **Output:** hệ thống trả kết quả đã xử lý, không tạo thêm InventTrans

### Case 2 — Weighbridge gửi lại weight event
- **Input:** local agent resend cùng event
- **Output:** hệ thống nhận diện duplicate và không post lặp

### Case 3 — Reverse double click
- **Input:** user bấm reverse hai lần
- **Output:** lần thứ hai bị reject vì trans đã reversed

### Case 4 — Sequence collision khi concurrent create
- **Input:** nhiều request đồng thời cùng loại chứng từ trong một kho
- **Output:** sequence vẫn unique và không sinh trùng mã

## 17.7 Quy tắc bắt buộc

- Idempotency phải được xem là rule business-critical, không phải enhancement kỹ thuật.
- Mọi API side effect phải được liệt kê và dán chính sách idempotency rõ ràng.
- Duplicate rejection cũng phải có audit/exception log phù hợp.

---

# 18. Sub-module 8 — Document Governance, Change Control & Delivery Baseline

## 18.1 Mục đích

Quản lý baseline tài liệu, quyết định thay đổi và kỷ luật triển khai để toàn team cùng bám một chuẩn duy nhất từ BA đến Dev, QA và go-live.

## 18.2 Mô tả nghiệp vụ

Dự án SWM là dự án AI-first delivery nhưng vẫn yêu cầu kiểm soát rất chặt về traceability, prompt log, review checklist, test evidence, decision log và sign-off. Vì vậy governance không dừng ở runtime system, mà còn kéo sang lifecycle delivery.

Sub-module này giúp trả lời:
- Tài liệu nào là nguồn chuẩn hiện tại?
- Khi tài liệu mâu thuẫn nhau thì lấy cái nào?
- Quyết định thay đổi được log ra sao?
- Yêu cầu nào phải sign-off trước khi build?
- Release/go-live cần những checkpoint nào?

## 18.3 Input

| Input | Mô tả |
|---|---|
| Project Charter | governance, cadence, RACI, AI governance |
| PRD/Blueprint/Spec | baseline nghiệp vụ |
| Change requests | đề xuất thay đổi scope/rule |
| Delivery evidence | prompt log, checklist, test evidence, UAT sign-off |

## 18.4 Output

| Output | Mô tả |
|---|---|
| Decision log | Nhật ký quyết định |
| Change control register | Sổ thay đổi |
| Source-of-truth matrix | Ma trận tài liệu chuẩn |
| Delivery checklist | Checklist build/test/release/go-live |
| Sign-off pack | Bộ tài liệu chốt từng mốc |

## 18.5 Cases điển hình

### Case 1 — Tài liệu cũ và mới mâu thuẫn
- **Input:** BRD cũ và PRD mới mô tả inbound tolerance khác nhau
- **Output:** decision log xác định baseline mới là source of truth; rule cũ bị superseded

### Case 2 — Build-ready gate
- **Input:** story đã viết xong nhưng chưa có rule traceability và acceptance criteria rõ
- **Output:** chưa đạt điều kiện build-ready

### Case 3 — Go-live gate
- **Input:** release candidate chuẩn bị go-live
- **Output:** cần đủ runbook, test evidence, critical defect = 0, sign-off đúng vai trò

### Case 4 — AI-generated delivery evidence
- **Input:** PR do AI-assisted development sinh ra
- **Output:** phải có prompt log, verification steps, test evidence theo governance charter

## 18.6 Quy tắc bắt buộc

- Mỗi rule trọng yếu phải có source of truth rõ ràng.
- Không merge/publish artifact nếu chưa có verify evidence phù hợp.
- Change control phải phân biệt được: change về nghiệp vụ, change về kỹ thuật, change về scope.
- Decision log phải đọc được cả bởi business lẫn dev.

---

## 19. Danh sách case tổng hợp theo module

| Case ID | Tên case | Input | Output |
|---|---|---|---|
| FG-01 | CUST_VIEWER xem dữ liệu theo owner | role, owner scope | chỉ dữ liệu owner được phép |
| FG-02 | WH_KEEPER cố manual weight | role, action | bị chặn |
| FG-03 | WH_MANAGER manual weight | user, reason_code | cho phép + audit |
| FG-04 | Sinh số receipt theo kho | warehouse, seq code | reference hợp lệ |
| FG-05 | Retry cùng external_id | command, external_id | trả kết quả cũ |
| FG-06 | Reverse transaction | trans_id, reason_code | trans đảo + audit |
| FG-07 | Force approve outbound | shipment exception, manager | approval record + audit |
| FG-08 | Update permission matrix | admin action | audit before/after |
| FG-09 | Rule conflict resolution | 2 tài liệu mâu thuẫn | source-of-truth decision |
| FG-10 | Lock debit note | billing role, document | lock + audit |

---

## 20. Ma trận input / output / case theo sub-module

| Sub-module | Input chính | Output chính | Case tiêu biểu |
|---|---|---|---|
| RBAC & Permission | role, action catalog | permission matrix | view-only, forbidden action |
| Responsibility & Approval | RACI, approval rule | escalation/approval matrix | outbound override |
| Number Sequence | prefix, warehouse, date | reference code | RCV/SHP/WRK/TRX |
| Rules Baseline | source docs, confirmed decisions | rule catalog | superseded old rule |
| Reason Code | exception scenarios | reason catalog | manual weight/cancel |
| Audit & Exception | action/event data | audit trail | reverse, manual, lock |
| Idempotency | external_id, command | dedup safe result | retry from mobile/agent |
| Document Governance | charter, PRD, change req | decision log/checklist | build-ready / go-live gate |

---

## 21. Business rules của riêng module Foundation & Governance

Dưới đây là bộ rule nền đề xuất cho module này.

| Rule ID | Rule | Mô tả |
|---|---|---|
| FG-BR-001 | Backend-enforced permission | Quyền phải được kiểm ở backend, không chỉ UI |
| FG-BR-002 | Restricted action audit | Manual/override/reverse/lock phải audit đầy đủ |
| FG-BR-003 | Sequence uniqueness | Mã chứng từ phải unique theo chính sách sequence |
| FG-BR-004 | Per-warehouse sequence | Sequence scope = PER_WAREHOUSE |
| FG-BR-005 | No free-text-only reason | Action nhạy cảm phải dùng reason code chuẩn |
| FG-BR-006 | Immutable posted ledger | Ledger đã post không được update/delete trực tiếp |
| FG-BR-007 | Mandatory idempotency | Command API có side effect phải có external_id |
| FG-BR-008 | Duplicate-safe retry | Retry cùng external_id không tạo mới |
| FG-BR-009 | Rule status clarity | Mọi rule phải có trạng thái CONFIRMED/TO-CONFIRM/PHASE 2 |
| FG-BR-010 | Superseded tracking | Rule cũ bị thay thế phải được đánh dấu rõ |
| FG-BR-011 | Audit retention | Transaction-related logs lưu tối thiểu 7 năm |
| FG-BR-012 | Customer data scope | Customer Viewer chỉ được xem dữ liệu trong owner scope |
| FG-BR-013 | Authority segregation | Action nhạy cảm phải đúng role authority |
| FG-BR-014 | Change traceability | Mọi thay đổi baseline phải có decision log |

---

## 22. Luồng nghiệp vụ tổng quát của module

Mặc dù module này không có state machine business như Receipt hay Shipment, nó vẫn có luồng vận hành logic như sau:

### 22.1 Luồng governance baseline

1. Thu thập tài liệu nguồn và confirmed decisions  
2. Chuẩn hóa glossary và rule catalog  
3. Xác định role catalog và permission matrix  
4. Thiết lập sequence, reason code, audit policy  
5. Thiết lập idempotency policy cho command APIs  
6. Publish baseline cho Dev/QA/PM dùng chung  
7. Ghi decision log cho các điểm thay đổi  
8. Dùng checklist để kiểm soát build/test/go-live  

### 22.2 Luồng runtime control điển hình

1. User gửi request thao tác  
2. Hệ thống kiểm tra permission  
3. Hệ thống kiểm tra command idempotency  
4. Nếu là action nhạy cảm → yêu cầu reason code  
5. Thực thi hành động ở module nghiệp vụ tương ứng  
6. Ghi audit/exception log  
7. Trả kết quả và correlation id để truy vết  

---

## 23. Yêu cầu dữ liệu và thiết kế mức khái niệm

### 23.1 Bảng/đối tượng tối thiểu nên có

| Object | Vai trò |
|---|---|
| role | danh mục vai trò |
| permission | danh mục chức năng/hành động |
| role_permission | map quyền |
| reason_code | danh mục mã lý do |
| number_sequence | cấu hình sinh số |
| audit_log | nhật ký thao tác |
| exception_log | nhật ký ngoại lệ |
| business_rule_catalog | danh mục baseline rule |
| decision_log | log quyết định thay đổi baseline |
| change_control | quản lý thay đổi |

### 23.2 Quan hệ khái niệm

- `role` 1-n `role_permission`
- `permission` 1-n `role_permission`
- `reason_code` được tham chiếu bởi `audit_log`, `adjustment`, `manual_weight`, `cancel`, `reverse`
- `number_sequence` được tham chiếu bởi nhiều document services
- `decision_log` tham chiếu `business_rule_catalog`
- `audit_log` tham chiếu entity bất kỳ qua `entity_type + entity_id`

---

## 24. Yêu cầu phi chức năng áp cho module

| Nhóm | Yêu cầu |
|---|---|
| Security | Quyền phải enforce ở backend |
| Traceability | Mọi action nhạy cảm phải truy ngược được đầy đủ |
| Integrity | Sequence và audit phải transaction-safe |
| Reliability | Retry không gây duplicate side effect |
| Performance | Permission/idempotency check phải đủ nhanh cho thao tác vận hành thực địa |
| Retention | Audit/transaction-related logs tối thiểu 7 năm |
| Extensibility | Có thể mở rộng role, permission, reason code, phase boundary |
| Operability | Cho phép truy vấn audit/decision log phục vụ điều tra sự cố |

---

## 25. Acceptance criteria ở mức module

Module Foundation & Governance được xem là đạt khi tối thiểu thỏa các điều kiện sau:

1. Có permission matrix được phê duyệt và được enforce ở backend.
2. Có reason code catalog dùng chung toàn hệ thống.
3. Có sequence config hoạt động ổn định cho các document chính.
4. Có audit log cho các action nhạy cảm.
5. Có idempotency policy cho command APIs trọng yếu.
6. Có rule catalog chỉ rõ CONFIRMED/TO-CONFIRM/PHASE 2.
7. Có decision log cho các điểm mâu thuẫn tài liệu đã được xử lý.
8. Có checklist build/test/go-live bám governance baseline.

---

## 26. Rủi ro nếu module làm không đủ

| Rủi ro | Hậu quả |
|---|---|
| Phân quyền lỏng | user thao tác sai quyền, khó kiểm soát nội bộ |
| Không có rule baseline catalog | dev và QA build/test lệch nhau |
| Sequence lỗi | khó truy vết, trùng chứng từ, mất niềm tin dữ liệu |
| Không có reason code chuẩn | audit mất ý nghĩa, không báo cáo được ngoại lệ |
| Audit yếu | khó điều tra sự cố, khó xử lý tranh chấp khách hàng |
| Không có idempotency | duplicate transaction, lệch tồn kho và billing |
| Không có decision log | tài liệu cũ mới chồng chéo, release sai baseline |

---

## 27. Khuyến nghị cho Dev Team

1. Thiết kế module này như **shared control layer**, không phải feature nhỏ lẻ.
2. Tách riêng **action permission**, **approval authority** và **data scope**.
3. Triển khai `external_id` như contract chuẩn cho command APIs từ đầu.
4. Xây audit/event trail ở backend service layer, không giao toàn bộ cho UI.
5. Tạo `business_rule_catalog` hoặc ít nhất `decision registry` để team không build theo trí nhớ.
6. Sequence service phải là shared service dùng chung, không để mỗi module tự generate.
7. Các action nhạy cảm nên có correlation_id để trace xuyên từ UI → API → DB → audit.

---

## 28. Khuyến nghị cho QA Team

1. Test permission ở cả UI và API.  
2. Test duplicate/retry cho các command quan trọng.  
3. Test audit completeness cho manual/override/cancel/reverse/lock.  
4. Test reason code mandatory validation.  
5. Test sequence uniqueness ở điều kiện concurrent.  
6. Test superseded rule handling để bảo đảm hệ thống bám baseline mới.  

---

## 29. Điểm cần chốt thêm trước khi thiết kế FS/API chi tiết

Các điểm dưới đây nên được xác nhận chính thức trước khi bóc tiếp tài liệu chức năng chi tiết:

1. Danh sách role go-live cuối cùng có bao gồm `WH_ADMIN` như role tách biệt hay gộp vào `WH_MANAGER/Admin`.  
2. Danh sách action nhạy cảm cuối cùng cần approval/dual control.  
3. Danh sách prefix chuẩn đầy đủ cho tất cả document codes go-live.  
4. Chính sách sequence gap khi rollback kỹ thuật.  
5. Danh sách reason code go-live đầy đủ theo từng domain.  
6. Danh sách command APIs bắt buộc phải có `external_id`.  
7. Mức chi tiết audit cho update master data có cần log full field-level hay entity-level.  
8. Chính sách truy cập decision log/rule catalog cho end user nội bộ.  

---

## 30. Kết luận

Foundation & Governance là module nền để biến SWM từ một tập hợp màn hình và API thành một hệ thống có thể kiểm soát, truy vết và vận hành đáng tin cậy trong môi trường logistics bulk cargo của TVL.

Nếu module này được thiết kế tốt:
- Team dev sẽ có baseline rõ để build đúng.
- QA sẽ có nền rõ để viết test đúng.
- Business sẽ giảm tranh chấp do ngoại lệ được kiểm soát.
- Hệ thống sẽ giữ được tính nhất quán giữa quyền hạn, rule, sequence, audit và transaction safety.

Nếu module này bị làm sơ sài, toàn bộ các module khác dù chạy được vẫn có nguy cơ sai nền, khó kiểm soát và khó go-live ổn định.

---

## 31. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được tổng hợp theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp các tài liệu cũ và mới mâu thuẫn nhau, ưu tiên được đề xuất như sau:

1. PRD/Blueprint/Module Master/Overview bản mới hơn  
2. Inventory Transaction Spec và Master Data Supplement cho các quy tắc nền kỹ thuật-nghiệp vụ  
3. BRD dùng để tham khảo chi tiết rule, nhưng rule nào mâu thuẫn với baseline mới hơn phải được đánh dấu là superseded  
4. Project Charter dùng cho governance dự án, AI governance, cadence, RACI và KPI  

