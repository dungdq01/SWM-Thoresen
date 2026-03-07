# TVL SWM — Module Specification
# Module 1: Foundation & Governance

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Business Analyst 10 năm kinh nghiệm  
**Phiên bản:** 1.1  
**Ngày cập nhật:** 08/03/2026  
**Trạng thái:** Revised for Build Review  
**Đối tượng đọc:** Sponsor, PM, BA, Tech Lead, Dev, QA, Solution Architect, Ops Lead, Key User  

---

## 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết module **Foundation & Governance** của hệ thống SWM. Đây là module nền tảng để toàn bộ chương trình vận hành **đúng quyền, đúng luật, đúng mã số, đúng audit, đúng baseline**.

Nếu Master Data giúp hệ thống biết **đang quản lý cái gì**, còn Inventory Core Engine giúp hệ thống biết **ghi nhận tồn kho như thế nào**, thì Foundation & Governance giúp hệ thống biết **ai được làm gì, làm theo luật nào, dùng mã gì, lưu vết ra sao, và build theo baseline nào**.

Tài liệu được viết theo hướng:
- Người business hiểu vai trò module trong bức tranh tổng thể.
- Người non-business vẫn hiểu module đang kiểm soát điều gì.
- Dev/QA dùng làm baseline để bóc FS, API spec, DB design, permission matrix, audit design và test scenario.

---

## 2. Vị trí của module trong toàn chương trình

Trong bản đồ 11 module của SWM, **Foundation & Governance là Module 1** và đóng vai trò làm **lớp kiểm soát nền** cho tất cả module còn lại.

Module này không trực tiếp tạo Receipt, Shipment hay Billing. Tuy nhiên, mọi module sau đều phụ thuộc vào nó:
- Không có RBAC đúng → user thao tác sai quyền.
- Không có number sequence đúng → chứng từ và transaction không truy vết được.
- Không có reason code/audit policy → không kiểm soát được ngoại lệ.
- Không có rule baseline catalog → Dev build theo tài liệu cũ, QA test theo tài liệu mới.
- Không có idempotency policy → retry từ mobile/weighbridge/API có thể sinh duplicate posting.

Nói ngắn gọn, module này là **lớp kỷ luật hệ thống**.

---

## 3. Bối cảnh nghiệp vụ khiến module này bắt buộc phải có

TVL vận hành kho bulk cargo và bagged goods trong bối cảnh:
- Không dùng barcode/RFID làm trục chính.
- Weighbridge là nguồn xác nhận khối lượng thực tế.
- Dữ liệu tồn kho phải đi qua bộ ba **InventDim → InventTrans → OnHand**.
- Billing phụ thuộc trực tiếp vào transaction truth và snapshot cuối ngày.
- Hệ thống có nhiều vai trò thao tác: Warehouse Manager, Warehouse Keeper, Weighbridge Operator, Billing Officer, Admin, Customer Viewer.
- Có ngoại lệ nghiệp vụ nhạy cảm như manual weight, cancel sau post, force approve outbound, inventory adjustment, re-weigh.

Nếu không có lớp governance thống nhất, hệ thống rất dễ rơi vào các rủi ro:
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
- Thiết kế SOC/SIEM/infra security chi tiết.

### 5.3 Boundary với các module khác
- Module này **không sở hữu transaction business flow**, mà sở hữu **luật nền** để flow được kiểm soát.
- Module này **không quyết định inventory posting business event**, nhưng quyết định **quy tắc nền bắt buộc cho posting** như audit, idempotency, role authority, numbering, immutable ledger policy.
- Module này **không thay thế security engineering**, nhưng là nơi định nghĩa baseline permission và audit scope ở mức nghiệp vụ-hệ thống.

---

## 6. Nguyên tắc nền tảng phải giữ xuyên suốt

1. **Chứng từ không phải nguồn sự thật cuối cùng của tồn kho.**  
   Nguồn sự thật của tồn kho là bộ ba **InventDim → InventTrans → OnHand**. `[CONFIRMED]`

2. **Inbound chỉ post tồn khi đạt RECEIVED.**  
   Các state trước đó chỉ là state vận hành. `[CONFIRMED]`

3. **Outbound chỉ trừ tồn khi đạt SHIPPED.**  
   Allocation/Picking chưa được hiểu là giảm physical_qty. `[CONFIRMED]`

4. **Weighbridge là nguồn xác nhận khối lượng thực tế.**  
   Manual weight chỉ được phép theo chính sách kiểm soát đặc biệt. `[CONFIRMED]`

5. **Mọi ngoại lệ ảnh hưởng business phải có reason code và audit trail.** `[CONFIRMED]`

6. **Billing chỉ đáng tin khi transaction truth đã đúng.** `[CONFIRMED]`

7. **Ledger đã post là bất biến.**  
   Không update/delete trực tiếp InventTrans đã post. Sửa sai bằng reverse. `[CONFIRMED]`

8. **Idempotency là bắt buộc cho mọi API có side effect.** `[CONFIRMED]`

9. **Module phải tách ownership rõ ràng.** `[CONFIRMED]`

10. **Mọi baseline rule phải có tình trạng rõ ràng.**  
    Chỉ có 3 trạng thái được phép dùng trong tài liệu: `[CONFIRMED]`, `[TO-CONFIRM]`, `[PHASE 2]`. `[CONFIRMED]`

---

## 7. Quy ước trạng thái quyết định dùng trong tài liệu

| Tag | Ý nghĩa | Quy tắc sử dụng |
|---|---|---|
| `[CONFIRMED]` | Đã được chốt theo baseline hiện tại | Dev/QA được phép build và test theo nội dung này |
| `[TO-CONFIRM]` | Chưa được TVL sign-off cuối cùng | Không nên đóng cứng logic/code nếu chưa được chốt |
| `[PHASE 2]` | Không thuộc go-live Phase 1 | Không đưa vào backlog build Phase 1 trừ khi có change request |
| `[PROCESS — NOT CODE]` | Quy trình/quản trị, không mặc định là tính năng phải build | Dev chỉ build nếu có explicit scope giao thành system feature |

---

## 8. Kết quả đầu ra chính của module

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

## 9. Input và Output tổng thể của module

### 9.1 Input tổng thể

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

### 9.2 Output tổng thể

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

## 10. Các đối tượng dữ liệu mà module quản lý hoặc chi phối

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
- `idempotency_key` hoặc logic `external_id` policy

Ngoài ra module này còn chi phối cách các object khác phải vận hành, ví dụ:
- `invent_trans` phải immutable
- `receipt/shipment` phải dùng sequence chuẩn
- `command APIs` phải dùng `external_id`
- `manual weight` phải có `reason_code + audit`

---

## 11. Danh sách sub-modules

1. RBAC & Permission Control  
2. Role Responsibility & Approval Governance `[PROCESS-HEAVY]`  
3. Number Sequence & Reference Control  
4. Business Rules Baseline Management  
5. Reason Code Management  
6. Audit Trail & Exception Governance  
7. Idempotency & Command Safety Control  
8. Document Governance, Change Control & Delivery Baseline `[PROCESS — NOT CODE]`

> Lưu ý: Sub-module 2 là phần governance thiên về phân tách trách nhiệm, approval authority và sign-off boundary. Có thể có một số cấu hình hỗ trợ trong hệ thống, nhưng bản thân nó không mặc định đồng nghĩa với việc phải build UI/workflow riêng ngay từ Phase 1.

---

# 12. Sub-module 1 — RBAC & Permission Control

## 12.1 Mục đích
Quản lý ai được quyền xem, tạo, sửa, xác nhận, post, cancel, approve, reverse, lock, export và quản trị trên từng nhóm chức năng.

## 12.2 Mô tả nghiệp vụ
Đây là lớp phân quyền vận hành chính thức của hệ thống. Mục tiêu không chỉ là **ẩn/hiện nút**, mà là **kiểm soát authority ở cả UI, API và workflow**. `[CONFIRMED]`

RBAC phải hỗ trợ tối thiểu 3 lớp:
- **View authority**
- **Action authority**
- **Approval authority**

## 12.3 Input

| Input | Mô tả |
|---|---|
| Role catalog | Danh sách vai trò go-live |
| Function catalog | Danh sách module, menu, action, command |
| Business authority rules | Hành động nào cần manager/admin/billing authority |
| Owner scope rules | Customer Viewer chỉ xem dữ liệu theo owner |
| App channel | Web, Mobile, API, System |

## 12.4 Output

| Output | Mô tả |
|---|---|
| Permission matrix | Ma trận quyền chi tiết theo role × action |
| Action policy | Chính sách create/edit/confirm/post/cancel/approve/export |
| UI/API enforcement rule | Quy định kiểm tra quyền ở cả frontend và backend |
| Restricted action registry | Danh sách hành động nhạy cảm cần audit mạnh |

## 12.5 Roles Go-Live baseline

| Role Code | Vai trò | Trạng thái | Ghi chú |
|---|---|---|---|
| ADMIN | System Admin | `[CONFIRMED]` | Toàn quyền cấu hình hệ thống |
| WH_MANAGER | Warehouse Manager | `[CONFIRMED]` | Quản lý vận hành kho và ngoại lệ |
| WH_KEEPER | Warehouse Keeper | `[CONFIRMED]` | Tác nghiệp kho thực địa |
| WB_OPERATOR | Weighbridge Operator | `[CONFIRMED]` | Vận hành cân và OCR |
| BILLING_OFC | Billing Officer | `[CONFIRMED]` | Vận hành billing và debit note |
| OPS_SUPER | Operations Supervisor | `[CONFIRMED]` | Giám sát vận hành và dashboard |
| WH_ADMIN | Warehouse Admin | `[TO-CONFIRM]` | Chưa chốt tách role riêng hay gộp |
| CUST_VIEWER | Customer Viewer | `[CONFIRMED]` | Chỉ xem dữ liệu trong phạm vi owner |

## 12.6 Output quyền ở mức business

| Nhóm hành động | Quyền mặc định | Trạng thái |
|---|---|---|
| Xem dashboard/reports | Theo role và owner scope | `[CONFIRMED]` |
| Tạo PO/Receipt/SO/Shipment | WH_ADMIN / WH_MANAGER / role được ủy quyền | `[TO-CONFIRM]` |
| Execute work | WH_KEEPER / WH_MANAGER | `[CONFIRMED]` |
| Weigh in/out | WB_OPERATOR | `[CONFIRMED]` |
| Manual weight | WH_MANAGER | `[CONFIRMED]` |
| Inventory adjustment | WH_MANAGER | `[CONFIRMED]` |
| Force approve outbound exception | WH_MANAGER | `[CONFIRMED]` |
| Lock debit note | BILLING_OFC | `[CONFIRMED]` |
| System setup | ADMIN | `[CONFIRMED]` |

## 12.7 Business cases điển hình

### Case 1 — Customer Viewer chỉ được xem dữ liệu owner của mình
- **Input:** user role = `CUST_VIEWER`, owner_id = `CUST001`
- **Output:** chỉ xem được inventory/report/shipment/receipt liên quan owner `CUST001`
- **Kỳ vọng:** không được xem dữ liệu owner khác, kể cả qua export hoặc deep link API

### Case 2 — Warehouse Keeper không được manual weight
- **Input:** user role = `WH_KEEPER`, thao tác nhập tay trọng lượng
- **Output:** hệ thống từ chối hành động
- **Kỳ vọng:** chỉ `WH_MANAGER` được phép manual weight

### Case 3 — Billing Officer được lock debit note nhưng không được post inventory
- **Input:** user role = `BILLING_OFC`
- **Output:** được tạo/generate/lock debit note; không được gọi action post/reverse inventory

### Case 4 — API phải chặn dù UI bị bypass
- **Input:** user không có quyền nhưng gửi API trực tiếp
- **Output:** backend trả `403 Forbidden`

## 12.8 Acceptance Criteria
- **AC-RBAC-01:** User không có quyền thực hiện action thì backend phải trả `403`, đồng thời ghi audit `ACCESS_DENIED` cho action nhạy cảm.
- **AC-RBAC-02:** Customer Viewer không được xem dữ liệu ngoài owner scope qua UI, export và API.
- **AC-RBAC-03:** `WH_KEEPER` không thể manual weight trong mọi kênh thao tác.
- **AC-RBAC-04:** Thay đổi role/permission phải có hiệu lực theo cơ chế session/token policy đã thiết kế; tối thiểu backend phải áp dụng quyền mới ngay khi request kế tiếp được authorize lại.
- **AC-RBAC-05:** Các action nhạy cảm phải log `user_id`, `user_role`, `timestamp`, `device_type`.

## 12.9 Quy tắc bắt buộc
- Permission phải kiểm ở backend là lớp cuối cùng. `[CONFIRMED]`
- Export cũng phải chịu kiểm soát giống view data. `[CONFIRMED]`
- Quyền approval phải tách khỏi quyền execute nếu nghiệp vụ yêu cầu. `[CONFIRMED]`
- Các action nhạy cảm phải log role tại thời điểm action. `[CONFIRMED]`

---

# 13. Sub-module 2 — Role Responsibility & Approval Governance `[PROCESS-HEAVY]`

## 13.1 Mục đích
Xác định ranh giới trách nhiệm giữa các vai trò, đặc biệt cho các thao tác cần phê duyệt, override hoặc sign-off.

## 13.2 Mô tả nghiệp vụ
RBAC trả lời câu hỏi **“ai được bấm nút”**, còn sub-module này trả lời câu hỏi **“ai chịu trách nhiệm nghiệp vụ khi nút đó được bấm”**.

Đây là phần governance thiên về **approval matrix, segregation of duties, escalation, sign-off checkpoint** hơn là một feature runtime độc lập. `[PROCESS — NOT CODE]`

## 13.3 Input

| Input | Mô tả |
|---|---|
| Role catalog | Vai trò vận hành |
| Action catalog | Danh sách action nhạy cảm |
| RACI baseline | Trách nhiệm theo dự án và vận hành |
| Approval policy | Hành động nào cần approve/override |

## 13.4 Output

| Output | Mô tả |
|---|---|
| Approval matrix | Ai approve hành động nào |
| Segregation of duties | Phân tách nhiệm vụ để giảm rủi ro |
| Escalation policy | Chính sách escalations khi phát sinh ngoại lệ |
| Sign-off checkpoints | Điểm chốt trách nhiệm trong build/test/UAT/go-live |

## 13.5 Cases điển hình
- **Outbound exception approval:** shipment có line fail tolerance → `WH_MANAGER` là role được force approve. `[CONFIRMED]`
- **Inventory adjustment:** chỉ role có authority được tạo adjustment với `reason_code` bắt buộc. `[CONFIRMED]`
- **UAT checkpoint sign-off:** kết quả test, defect summary, go/no-go decision phải có sign-off record theo vai trò. `[CONFIRMED]`

## 13.6 Acceptance Criteria
- **AC-APP-01:** Các action được xác định là nhạy cảm phải có owner authority rõ ràng trong approval matrix.
- **AC-APP-02:** Không được để cùng một role thực hiện và duyệt mọi action nhạy cảm nếu business đã yêu cầu segregation.
- **AC-APP-03:** Record approval/override phải lưu được ai duyệt, lúc nào, duyệt cái gì và reason gì.
- **AC-APP-04:** Các checkpoint build/UAT/go-live phải có danh sách vai trò sign-off tối thiểu.

## 13.7 Nguyên tắc
- Người thực hiện và người duyệt không nên luôn là cùng một người cho tác vụ nhạy cảm. `[CONFIRMED]`
- Action có tác động thương mại hoặc ledger phải có authority cao hơn action tác nghiệp thông thường. `[CONFIRMED]`
- Approval phải lưu được: ai duyệt, lúc nào, duyệt cái gì, lý do gì, trước/sau ra sao. `[CONFIRMED]`

---

# 14. Sub-module 3 — Number Sequence & Reference Control

## 14.1 Mục đích
Quản lý việc sinh mã chứng từ và mã giao dịch thống nhất, không trùng, có khả năng truy vết, dễ đọc và phù hợp vận hành phân tán theo kho.

## 14.2 Mô tả nghiệp vụ
Sequence không chỉ để “đẹp mã”. Nó là chìa khóa để truy vết giao dịch, đối chiếu chứng từ, vận hành ngoài hiện trường và hỗ trợ audit/billing/dispute resolution.

Baseline hiện tại:
- Scope = **PER_WAREHOUSE** `[CONFIRMED]`
- Format chuẩn: `PREFIX-YYYYMMDD-SEQ` `[CONFIRMED]`
- Daily reset `[CONFIRMED]`
- Dùng cho tối thiểu: Receipt, Shipment, Work, Transaction, Debit Note `[CONFIRMED]`
- Chính sách **gap khi rollback kỹ thuật** chưa chốt cuối cùng `[TO-CONFIRM]`

## 14.3 Input

| Input | Mô tả |
|---|---|
| Sequence code | `RCV`, `SHP`, `WRK`, `TRX`, `DN`, `TRF`, `ADJ`... |
| Scope | `warehouse_code` |
| Date reset policy | daily reset |
| Format rule | prefix + date + zero-padded sequence |
| Command context | document type, warehouse, posting time |

## 14.4 Output

| Output | Mô tả |
|---|---|
| Generated reference | Mã chứng từ/giao dịch hợp lệ |
| Sequence config | Cấu hình sequence đang active |
| Collision prevention | Chính sách chống trùng mã |
| Reusable service | Service dùng chung cho các module khác |

## 14.5 Baseline mã số đề xuất

| Object | Prefix | Ví dụ | Trạng thái |
|---|---|---|---|
| Inbound Receipt | `RCV` | `RCV-20260315-000001` | `[CONFIRMED]` |
| Shipment | `SHP` | `SHP-20260315-000001` | `[CONFIRMED]` |
| Work | `WRK` | `WRK-20260315-000001` | `[CONFIRMED]` |
| Inventory Transaction | `TRX` | `TRX-20260315-000001` | `[CONFIRMED]` |
| Transfer | `TRF` | `TRF-20260315-000001` | `[TO-CONFIRM]` |
| Adjustment | `ADJ` | `ADJ-20260315-000001` | `[TO-CONFIRM]` |
| Debit Note | `DN` | `DN-20260331-000001` | `[CONFIRMED]` |

## 14.6 Cases điển hình
- **Sinh số Receipt theo kho:** `WH5.1 + RCV + 2026-03-15` → `RCV-20260315-000001`
- **Hai kho cùng tạo Receipt cùng ngày:** mỗi kho có counter riêng, không xung đột
- **Retry cùng external_id:** không sinh mã mới, trả về reference cũ
- **Transaction fail giữa chừng:** phải có chính sách trace rõ về sequence gap `[TO-CONFIRM]`

## 14.7 Acceptance Criteria
- **AC-SEQ-01:** Sequence phát sinh phải unique theo policy đã cấu hình.
- **AC-SEQ-02:** Concurrent create trong cùng warehouse không được sinh trùng mã.
- **AC-SEQ-03:** Cùng một command đã xử lý thành công thì retry không được sinh reference mới.
- **AC-SEQ-04:** Mọi module phải dùng shared sequence service; không tự format riêng.
- **AC-SEQ-05:** Chính sách gap khi rollback phải được quyết định trước khi chốt FS/API chi tiết cho service sequence. `[TO-CONFIRM]`

## 14.8 Quy tắc bắt buộc
- Sequence generation phải thread-safe / transaction-safe. `[CONFIRMED]`
- Mã không được tái sử dụng. `[CONFIRMED]`
- Không được sinh reference khác nhau cho cùng một command đã xử lý thành công. `[CONFIRMED]`
- Sequence service phải dùng qua shared service. `[CONFIRMED]`

---

# 15. Sub-module 4 — Business Rules Baseline Management

## 15.1 Mục đích
Quản lý baseline rule chính thức để BA, Dev, QA, PM cùng dùng một nguồn sự thật cho build và test.

## 15.2 Mô tả nghiệp vụ
SWM hiện có nhiều tài liệu: Project Charter, PRD, Blueprint, BRD, Module Master, Inventory Spec, Master Data Spec. Nếu không có baseline catalog, cùng một nghiệp vụ có thể bị hiểu khác nhau.

Ví dụ tiêu biểu:
- Tài liệu cũ còn ghi inbound fail tolerance → `PENDING_APPROVAL`.
- Baseline mới hơn đã chốt inbound fail tolerance → `REJECTED + re-weigh`, không dùng inbound approval ở go-live.

Do đó, sub-module này đóng vai trò **trọng tài baseline**. `[CONFIRMED]`

## 15.3 Input

| Input | Mô tả |
|---|---|
| Tài liệu nguồn | PRD, Blueprint, BRD, Module Master, Overview, Charter |
| Confirmed decisions | Các quyết định TVL đã chốt |
| To-confirm list | Điểm còn mở |
| Phase boundary | Phase 1 vs Phase 2 |

## 15.4 Output

| Output | Mô tả |
|---|---|
| Rule catalog | Danh mục rule chính thức |
| Rule status | `CONFIRMED / TO-CONFIRM / PHASE 2` |
| Superseded note | Ghi chú rule cũ đã bị thay thế |
| Rule owner | BA/PO/Lead chịu trách nhiệm xác nhận |

## 15.5 Cấu trúc rule catalog đề xuất

| Trường | Ý nghĩa |
|---|---|
| rule_code | Mã rule nội bộ |
| domain | `INBOUND / OUTBOUND / INVENTORY / BILLING / FOUNDATION` |
| title | Tên rule |
| description | Mô tả rule |
| current_status | `CONFIRMED / TO-CONFIRM / PHASE 2` |
| source_of_truth | Tài liệu đang được lấy làm baseline |
| brd_reference | Mã rule ở BRD nếu có |
| supersedes | Rule/tài liệu cũ bị thay thế |
| effective_phase | Go-Live / Phase 2 |
| owner | Người chịu trách nhiệm nội dung |
| last_reviewed_at | Ngày rà soát cuối |

## 15.6 Cases điển hình
- **Inbound fail tolerance:** catalog phải chốt baseline go-live là `REJECTED + re-weigh`, đồng thời đánh dấu rule cũ là superseded. `[CONFIRMED]`
- **Inventory status go-live:** chỉ có 4 status go-live: `AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT`. `[CONFIRMED]`
- **Batch/Lot tracking:** đánh dấu `PHASE 2`, không đưa vào build Phase 1. `[PHASE 2]`

## 15.7 Acceptance Criteria
- **AC-RULE-01:** Mọi rule trọng yếu dùng để build phải có `current_status` rõ ràng.
- **AC-RULE-02:** Rule conflict giữa tài liệu cũ/mới phải có decision log hoặc superseded note.
- **AC-RULE-03:** QA test case phải map ngược được về rule catalog.
- **AC-RULE-04:** Rule catalog phải có `source_of_truth` và khi có thể nên có `brd_reference`.

## 15.8 Quy tắc bắt buộc
- Mọi backlog build phải trace ngược được về rule catalog. `[CONFIRMED]`
- QA test case phải map được về `rule_code`. `[CONFIRMED]`
- Rule catalog phải có cột `source_of_truth` và `supersedes`. `[CONFIRMED]`

---

# 16. Sub-module 5 — Reason Code Management

## 16.1 Mục đích
Chuẩn hóa mã lý do cho các hành động ngoại lệ hoặc hành động nhạy cảm, để dữ liệu audit có ý nghĩa nghiệp vụ và có thể thống kê được.

## 16.2 Mô tả nghiệp vụ
Nếu chỉ cho user nhập free text lý do, hệ thống sẽ không thể phân tích xu hướng ngoại lệ, đối soát nguyên nhân sai lệch, quản trị kiểm soát nội bộ hay làm báo cáo rủi ro.

Do đó cần reason code catalog với `category`, `approval_flag`, `billing_impact` và mô tả business rõ ràng. `[CONFIRMED]`

## 16.3 Input

| Input | Mô tả |
|---|---|
| Exception scenarios | Manual weight, cancel, reverse, adjustment, status change, override |
| Business categories | `MANUAL_WEIGHT`, `CANCEL`, `ADJUSTMENT`, `DAMAGE`, `SHRINKAGE`, `OTHER` |
| Approval policy | Loại nào cần approve |
| Billing impact | Loại nào ảnh hưởng billing |

## 16.4 Output

| Output | Mô tả |
|---|---|
| Reason code catalog | Danh sách mã dùng chung toàn hệ thống |
| Category map | Nhóm lý do theo domain |
| Validation policy | Hành động nào bắt buộc reason code |
| Reporting base | Nền để báo cáo ngoại lệ |

## 16.5 Cấu trúc dữ liệu đề xuất

| Field | Ý nghĩa |
|---|---|
| code | Mã lý do |
| description | Mô tả |
| category | Nhóm lý do |
| requires_approval | Có cần duyệt hay không |
| affects_billing | Có ảnh hưởng thương mại hay không |
| is_active | Có còn dùng hay không |
| requires_note | Có bắt buộc nhập ghi chú bổ sung hay không |

## 16.6 Danh mục category đề xuất
- `MANUAL_WEIGHT`
- `CANCEL`
- `REVERSE`
- `ADJUSTMENT`
- `DAMAGE`
- `SHRINKAGE`
- `STATUS_CHANGE`
- `EXCEPTION_OVERRIDE`
- `DOCUMENT_ERROR`
- `SCALE_ISSUE`
- `OTHER`

## 16.7 Minimum reason code set cho go-live

### 16.7.1 Inbound
| Code | Mô tả | Trạng thái |
|---|---|---|
| `DAMAGED` | Hàng hư hỏng khi nhận | `[CONFIRMED]` |
| `SHORT_DELIVERY` | Giao thiếu so với chứng từ | `[CONFIRMED]` |
| `OVER_DELIVERY` | Giao dư so với chứng từ | `[CONFIRMED]` |
| `WRONG_ITEM` | Sai mặt hàng/sku/owner | `[CONFIRMED]` |
| `SCALE_CALIBRATION` | Cân lỗi/cần nhập tay do hiệu chuẩn | `[CONFIRMED]` |
| `DOCUMENTATION_ERROR` | Sai chứng từ nguồn | `[CONFIRMED]` |

### 16.7.2 Outbound
| Code | Mô tả | Trạng thái |
|---|---|---|
| `CUSTOMER_REJECT` | Khách từ chối nhận | `[CONFIRMED]` |
| `WEIGHT_MISMATCH` | Sai lệch trọng lượng | `[CONFIRMED]` |
| `QUALITY_ISSUE` | Vấn đề chất lượng | `[CONFIRMED]` |
| `LOADING_LEFTOVER` | Còn hàng sau load | `[TO-CONFIRM]` |

### 16.7.3 Inventory
| Code | Mô tả | Trạng thái |
|---|---|---|
| `CYCLE_COUNT_ADJUST` | Điều chỉnh do kiểm kê | `[CONFIRMED]` |
| `DAMAGE_WRITEOFF` | Ghi giảm do hư hỏng | `[CONFIRMED]` |
| `STATUS_CHANGE` | Thay đổi inventory status | `[CONFIRMED]` |
| `SHRINKAGE` | Hao hụt | `[CONFIRMED]` |

### 16.7.4 General
| Code | Mô tả | Trạng thái |
|---|---|---|
| `OTHER` | Lý do khác | `[CONFIRMED]` |

**Quy tắc riêng cho `OTHER`:** bắt buộc nhập note bổ sung tối thiểu theo policy UI/API. `[CONFIRMED]`

## 16.8 Cases điển hình
- **Manual weight entry:** bắt buộc chọn reason code thuộc nhóm `MANUAL_WEIGHT`
- **Inventory adjustment:** bắt buộc chọn reason code `ADJUSTMENT / SHRINKAGE / DAMAGE` phù hợp
- **Cancel document:** bắt buộc chọn reason code nhóm `CANCEL`
- **Force approve outbound:** dùng reason code nhóm `EXCEPTION_OVERRIDE`

## 16.9 Acceptance Criteria
- **AC-RSN-01:** Các action nhạy cảm không được submit thành công nếu thiếu `reason_code`.
- **AC-RSN-02:** `OTHER` phải yêu cầu nhập note bổ sung.
- **AC-RSN-03:** Reason code catalog phải được dùng chung giữa UI, API, audit và reporting.
- **AC-RSN-04:** Reason code inactive không được dùng cho transaction mới.
- **AC-RSN-05:** Hệ thống phải có minimum go-live reason code set trước SIT/UAT end-to-end.

## 16.10 Quy tắc bắt buộc
- Không cho nhập free text thay cho reason code ở action nhạy cảm, nhưng có thể cho thêm notes bổ sung. `[CONFIRMED]`
- Reason code phải dùng chung giữa UI, API, audit, reporting. `[CONFIRMED]`
- Không hard-code reason list riêng lẻ theo màn hình. `[CONFIRMED]`

---

# 17. Sub-module 6 — Audit Trail & Exception Governance

## 17.1 Mục đích
Thiết lập cơ chế ghi vết và kiểm soát ngoại lệ cho toàn hệ thống, để bất kỳ thay đổi quan trọng nào cũng truy ngược được ai làm, lúc nào, thay đổi gì và vì sao.

## 17.2 Mô tả nghiệp vụ
Trong bài toán TVL, audit không phải phần “nice to have”. Đây là nền bắt buộc vì manual weight, reverse/cancel, dữ liệu cân và posting đều ảnh hưởng trực tiếp đến tranh chấp và billing. `[CONFIRMED]`

## 17.3 Input

| Input | Mô tả |
|---|---|
| Entity list | `INVENT_TRANS`, `ON_HAND`, `RECEIPT`, `SHIPMENT`, `TRANSFER`, `WORK_ORDER`, `ADJUSTMENT`... |
| Action list | `CREATE`, `UPDATE`, `POST`, `CANCEL`, `APPROVE`, `REJECT`, `REVERSE` |
| Mandatory audit fields | user, role, timestamp, old/new, reason_code... |
| Exception scenarios | manual, override, duplicate reject, reverse, lock |

## 17.4 Output

| Output | Mô tả |
|---|---|
| audit_log schema | Schema lưu vết chuẩn |
| exception_log policy | Chính sách log ngoại lệ |
| retention policy | Chính sách lưu giữ |
| traceability rule | Quy tắc truy vết xuyên module |

## 17.5 Audit schema tối thiểu

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
| device_type | `WEB/MOBILE/API/SYSTEM` |
| timestamp | thời gian |
| reason_code | lý do nếu là action nhạy cảm |
| notes | mô tả bổ sung |
| correlation_id | gom nhóm event liên quan |

> Audit schema tối thiểu hiện tại gồm **15 fields**. Đây là baseline hiện hành của spec này.

## 17.6 Khi nào bắt buộc audit mạnh
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

## 17.7 Cases điển hình
- **Reverse transaction:** audit `REVERSE`, `reason_code` bắt buộc, `correlation_id` nối trans gốc và trans đảo
- **Manual weight:** audit đầy đủ `user`, `role`, `reason`, `old/new`, `device_type`
- **Update permission matrix:** phải audit before/after
- **Exception reporting:** thống kê được loại ngoại lệ nào xảy ra nhiều nhất và bởi vai trò nào

## 17.8 Acceptance Criteria
- **AC-AUD-01:** Các action trong danh sách bắt buộc audit mạnh phải luôn tạo được audit record.
- **AC-AUD-02:** Audit record phải lưu ít nhất bộ field tối thiểu đã định nghĩa.
- **AC-AUD-03:** Reverse/cancel/override phải có `reason_code` và `correlation_id` phù hợp.
- **AC-AUD-04:** Audit phải được ghi ở backend hoặc event layer đáng tin cậy.
- **AC-AUD-05:** Retention cho transaction-related logs là tối thiểu 7 năm.

## 17.9 Quy tắc bắt buộc
- Audit log không được phụ thuộc vào frontend. `[CONFIRMED]`
- Audit phải ghi ở backend hoặc event layer đáng tin cậy. `[CONFIRMED]`
- Retention tối thiểu 7 năm cho transaction-related logs. `[CONFIRMED]`
- Cần hỗ trợ correlation giữa nhiều log thuộc cùng một flow. `[CONFIRMED]`
- Mức field-level audit cho một số master data lớn đang là điểm mở chi tiết triển khai. `[TO-CONFIRM]`

---

# 18. Sub-module 7 — Idempotency & Command Safety Control

## 18.1 Mục đích
Ngăn duplicate command khi client retry do timeout, mạng chập chờn, queue local, weighbridge resend hoặc integration replay.

## 18.2 Mô tả nghiệp vụ
TVL có các nguồn phát lệnh nhạy cảm với duplicate: Mobile App, Weighbridge Local Agent, API integrations, worker jobs. Nếu không có idempotency, hệ thống có thể post receipt/shipment trùng, tạo 2 InventTrans cho 1 event, sinh nhiều mã chứng từ cho 1 request và lệch on-hand/billing. `[CONFIRMED]`

## 18.3 Input

| Input | Mô tả |
|---|---|
| external_id | khóa idempotency từ client/integration |
| ref_type/ref_id/ref_line_id | tham chiếu business |
| command name | post receipt, post shipment, reverse, confirm, lock... |
| payload fingerprint | dùng khi cần so sánh nội dung |

## 18.4 Output

| Output | Mô tả |
|---|---|
| Duplicate-safe response | trả kết quả cũ nếu cùng request |
| Reject policy | từ chối nếu duplicate không hợp lệ |
| Idempotency registry | nơi lưu dấu command đã xử lý |
| Technical guardrails | unique constraints / row locks / dedup checks |

## 18.5 Rule baseline đề xuất
1. `external_id` phải được gửi cho mọi command API có side effect. `[CONFIRMED]`
2. Cùng `external_id` + cùng command context → trả kết quả cũ, không tạo record mới. `[CONFIRMED]`
3. Receipt posting phải check `(ref_type, ref_id, ref_line_id, stage=PHYSICAL)`. `[CONFIRMED]`
4. Shipment posting phải check tương tự. `[CONFIRMED]`
5. Reverse không được chạy 2 lần trên cùng 1 trans gốc. `[CONFIRMED]`
6. InventDim dùng `dim_hash` để dedup. `[CONFIRMED]`
7. Allocation/number sequence phải có lock strategy phù hợp. `[CONFIRMED]`

## 18.6 Cases điển hình
- **Mobile retry sau timeout:** trả kết quả cũ, không tạo thêm InventTrans
- **Weighbridge gửi lại weight event:** nhận diện duplicate và không post lặp
- **Reverse double click:** lần thứ hai bị reject vì trans đã reversed
- **Sequence collision khi concurrent create:** sequence vẫn unique và không sinh trùng mã

## 18.7 Acceptance Criteria
- **AC-IDEM-01:** Mọi command API có side effect trong go-live scope phải định nghĩa rõ idempotency key strategy.
- **AC-IDEM-02:** Retry cùng `external_id` không tạo transaction/document mới.
- **AC-IDEM-03:** Duplicate reject phải có audit/exception log phù hợp.
- **AC-IDEM-04:** Reverse cùng trans gốc không thể chạy thành công hai lần.
- **AC-IDEM-05:** Danh sách command APIs bắt buộc có `external_id` phải được chốt trước FS/API chi tiết. `[TO-CONFIRM]`

## 18.8 Quy tắc bắt buộc
- Idempotency là rule business-critical, không phải enhancement kỹ thuật. `[CONFIRMED]`
- Mọi API side effect phải được liệt kê và dán chính sách idempotency rõ ràng. `[CONFIRMED]`
- Duplicate rejection cũng phải có audit/exception log phù hợp. `[CONFIRMED]`

---

# 19. Sub-module 8 — Document Governance, Change Control & Delivery Baseline `[PROCESS — NOT CODE]`

## 19.1 Mục đích
Quản lý baseline tài liệu, quyết định thay đổi và kỷ luật triển khai để toàn team cùng bám một chuẩn duy nhất từ BA đến Dev, QA và go-live.

## 19.2 Mô tả nghiệp vụ
Dự án SWM là AI-first delivery nhưng vẫn yêu cầu kiểm soát chặt về traceability, prompt log, review checklist, test evidence, decision log và sign-off.

Sub-module này **không mặc định là dashboard hay workflow runtime bắt buộc phải build**. Nó là **khung quản trị delivery**; chỉ build thành feature khi có explicit scope riêng. `[PROCESS — NOT CODE]`

## 19.3 Input

| Input | Mô tả |
|---|---|
| Project Charter | governance, cadence, RACI, AI governance |
| PRD/Blueprint/Spec | baseline nghiệp vụ |
| Change requests | đề xuất thay đổi scope/rule |
| Delivery evidence | prompt log, checklist, test evidence, UAT sign-off |

## 19.4 Output

| Output | Mô tả |
|---|---|
| Decision log | Nhật ký quyết định |
| Change control register | Sổ thay đổi |
| Source-of-truth matrix | Ma trận tài liệu chuẩn |
| Delivery checklist | Checklist build/test/release/go-live |
| Sign-off pack | Bộ tài liệu chốt từng mốc |

## 19.5 Cases điển hình
- **Tài liệu cũ và mới mâu thuẫn:** decision log xác định baseline mới là source of truth; rule cũ bị superseded
- **Build-ready gate:** story chưa có traceability và AC rõ → chưa đạt build-ready
- **Go-live gate:** phải đủ runbook, test evidence, critical defect = 0, sign-off đúng vai trò
- **AI-generated delivery evidence:** phải có prompt log, verification steps, test evidence theo governance charter

## 19.6 Acceptance Criteria
- **AC-DOC-01:** Mỗi rule trọng yếu phải có source of truth rõ ràng.
- **AC-DOC-02:** Issue conflict giữa tài liệu phải có decision log trước khi build.
- **AC-DOC-03:** Build-ready checklist phải bao gồm tối thiểu scope, rule traceability, AC, dependency và open-item status.
- **AC-DOC-04:** Go-live checklist phải có test evidence và sign-off tối thiểu theo governance baseline.

## 19.7 Quy tắc bắt buộc
- Mỗi rule trọng yếu phải có source of truth rõ ràng. `[CONFIRMED]`
- Không merge/publish artifact nếu chưa có verify evidence phù hợp. `[CONFIRMED]`
- Change control phải phân biệt được change về nghiệp vụ, kỹ thuật, scope. `[CONFIRMED]`
- Decision log phải đọc được cả bởi business lẫn dev. `[CONFIRMED]`

---

## 20. Danh sách case tổng hợp theo module

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

## 21. Ma trận input / output / case theo sub-module

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

## 22. Business rules của riêng module Foundation & Governance

| Rule ID | Rule | Mô tả | BRD Reference | Trạng thái |
|---|---|---|---|---|
| FG-BR-001 | Backend-enforced permission | Quyền phải được kiểm ở backend, không chỉ UI | BR-RBAC-001 | `[CONFIRMED]` |
| FG-BR-002 | Restricted action audit | Manual/override/reverse/lock phải audit đầy đủ | BR-WB-001, BR-IN-007 | `[CONFIRMED]` |
| FG-BR-003 | Sequence uniqueness | Mã chứng từ phải unique theo chính sách sequence | BR-MD-005 | `[CONFIRMED]` |
| FG-BR-004 | Per-warehouse sequence | Sequence scope = PER_WAREHOUSE | BR-MD-005 | `[CONFIRMED]` |
| FG-BR-005 | No free-text-only reason | Action nhạy cảm phải dùng reason code chuẩn | BR-WB-001, BR-IN-007 | `[CONFIRMED]` |
| FG-BR-006 | Immutable posted ledger | Ledger đã post không được update/delete trực tiếp | Không map trực tiếp trong BRD hiện có | `[CONFIRMED]` |
| FG-BR-007 | Mandatory idempotency | Command API có side effect phải có external_id | BR-AUD-003 | `[CONFIRMED]` |
| FG-BR-008 | Duplicate-safe retry | Retry cùng external_id không tạo mới | BR-AUD-003 | `[CONFIRMED]` |
| FG-BR-009 | Rule status clarity | Mọi rule phải có trạng thái CONFIRMED/TO-CONFIRM/PHASE 2 | Không map trực tiếp trong BRD hiện có | `[CONFIRMED]` |
| FG-BR-010 | Superseded tracking | Rule cũ bị thay thế phải được đánh dấu rõ | Không map trực tiếp trong BRD hiện có | `[CONFIRMED]` |
| FG-BR-011 | Audit retention | Transaction-related logs lưu tối thiểu 7 năm | Không map trực tiếp trong BRD hiện có | `[CONFIRMED]` |
| FG-BR-012 | Customer data scope | Customer Viewer chỉ được xem dữ liệu trong owner scope | Tham chiếu overview/module spec, chưa có BRD code riêng rõ ràng | `[CONFIRMED]` |
| FG-BR-013 | Authority segregation | Action nhạy cảm phải đúng role authority | BR-RBAC-001 (một phần), BR-IN-007 (một phần) | `[CONFIRMED]` |
| FG-BR-014 | Change traceability | Mọi thay đổi baseline phải có decision log | Không map trực tiếp trong BRD hiện có | `[CONFIRMED]` |

> Ghi chú: Cột **BRD Reference** chỉ map khi thực sự có rule tương ứng trong bộ BRD hiện tại. Không ép map giả chỉ để đủ cột.

---

## 23. Luồng nghiệp vụ tổng quát của module

### 23.1 Luồng governance baseline
1. Thu thập tài liệu nguồn và confirmed decisions  
2. Chuẩn hóa glossary và rule catalog  
3. Xác định role catalog và permission matrix  
4. Thiết lập sequence, reason code, audit policy  
5. Thiết lập idempotency policy cho command APIs  
6. Publish baseline cho Dev/QA/PM dùng chung  
7. Ghi decision log cho các điểm thay đổi  
8. Dùng checklist để kiểm soát build/test/go-live  

### 23.2 Luồng runtime control điển hình
1. User gửi request thao tác  
2. Hệ thống kiểm tra permission  
3. Hệ thống kiểm tra command idempotency  
4. Nếu là action nhạy cảm → yêu cầu reason code  
5. Thực thi hành động ở module nghiệp vụ tương ứng  
6. Ghi audit/exception log  
7. Trả kết quả và correlation id để truy vết  

---

## 24. Yêu cầu dữ liệu và thiết kế mức khái niệm

### 24.1 Bảng/đối tượng tối thiểu nên có
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

### 24.2 Quan hệ khái niệm
- `role` 1-n `role_permission`
- `permission` 1-n `role_permission`
- `reason_code` được tham chiếu bởi `audit_log`, `adjustment`, `manual_weight`, `cancel`, `reverse`
- `number_sequence` được tham chiếu bởi nhiều document services
- `decision_log` tham chiếu `business_rule_catalog`
- `audit_log` tham chiếu entity bất kỳ qua `entity_type + entity_id`

---

## 25. Yêu cầu phi chức năng áp cho module

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

## 26. Acceptance criteria ở mức module

Module Foundation & Governance được xem là đạt khi tối thiểu thỏa các điều kiện sau:
1. Có permission matrix được phê duyệt và được enforce ở backend.
2. Có reason code catalog dùng chung toàn hệ thống.
3. Có sequence config hoạt động ổn định cho các document chính.
4. Có audit log cho các action nhạy cảm.
5. Có idempotency policy cho command APIs trọng yếu.
6. Có rule catalog chỉ rõ `CONFIRMED/TO-CONFIRM/PHASE 2`.
7. Có decision log cho các điểm mâu thuẫn tài liệu đã được xử lý.
8. Có checklist build/test/go-live bám governance baseline.

---

## 27. Rủi ro nếu module làm không đủ

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

## 28. Khuyến nghị cho Dev Team

1. Thiết kế module này như **shared control layer**, không phải feature nhỏ lẻ.
2. Tách riêng **action permission**, **approval authority** và **data scope**.
3. Triển khai `external_id` như contract chuẩn cho command APIs từ đầu.
4. Xây audit/event trail ở backend service layer, không giao toàn bộ cho UI.
5. Tạo `business_rule_catalog` hoặc ít nhất `decision registry` để team không build theo trí nhớ.
6. Sequence service phải là shared service dùng chung, không để mỗi module tự generate.
7. Các action nhạy cảm nên có `correlation_id` để trace xuyên từ UI → API → DB → audit.
8. Không tự suy diễn Sub-module 2 và 8 thành dashboard/feature nếu backlog không giao explicit scope.

---

## 29. Khuyến nghị cho QA Team

1. Test permission ở cả UI và API.  
2. Test duplicate/retry cho các command quan trọng.  
3. Test audit completeness cho manual/override/cancel/reverse/lock.  
4. Test reason code mandatory validation.  
5. Test sequence uniqueness ở điều kiện concurrent.  
6. Test superseded rule handling để bảo đảm hệ thống bám baseline mới.  
7. Map test case vào `FG-BR-*` và nếu có thì map thêm BRD reference.  

---

## 30. Điểm cần chốt thêm trước khi thiết kế FS/API chi tiết

| # | Open Item | Trạng thái | Priority | Impact nếu chưa chốt | Block module |
|---|---|---|---|---|---|
| 1 | Có giữ `WH_ADMIN` là role riêng hay gộp vào role khác | `[TO-CONFIRM]` | P1 | Lệch permission matrix và API authorization | M1, M2, M4, M5 |
| 2 | Danh sách action nhạy cảm cuối cùng cần approval/dual control | `[TO-CONFIRM]` | P1 | Dev/QA không khóa đúng boundary authority | M1, M4, M5, M8 |
| 3 | Danh sách prefix chuẩn đầy đủ cho tất cả document codes go-live | `[TO-CONFIRM]` | P2 | Sequence service thiếu mã đối tượng | M1, M4, M5, M6, M8 |
| 4 | Chính sách sequence gap khi rollback kỹ thuật | `[TO-CONFIRM]` | P1 | Thiết kế sequence/audit/traceability không thống nhất | M1, M4, M5, M6, M8 |
| 5 | Danh sách reason code go-live đầy đủ theo từng domain | `[TO-CONFIRM]` | P1 | User không thao tác được ngoại lệ; QA không test đủ | M1, M4, M5, M6, M8 |
| 6 | Danh sách command APIs bắt buộc phải có `external_id` | `[TO-CONFIRM]` | P1 | Duplicate protection không đủ | M4, M5, M6, M8 |
| 7 | Mức chi tiết audit cho update master data: field-level hay entity-level | `[TO-CONFIRM]` | P2 | DB/event design và storage sizing không rõ | M1, M2, M6 |
| 8 | Chính sách truy cập decision log/rule catalog cho end user nội bộ | `[TO-CONFIRM]` | P3 | Không block build lõi nhưng ảnh hưởng vận hành/governance | M1 |

> Quy tắc ưu tiên: các item P1 phải chốt trước khi đóng FS/API chi tiết cho các module phụ thuộc trực tiếp.

---

## 31. Kết luận

Foundation & Governance là module nền để biến SWM từ một tập hợp màn hình và API thành một hệ thống có thể kiểm soát, truy vết và vận hành đáng tin cậy trong môi trường logistics bulk cargo của TVL.

Nếu module này được thiết kế tốt:
- Team dev có baseline rõ để build đúng.
- QA có nền rõ để viết test đúng.
- Business giảm tranh chấp do ngoại lệ được kiểm soát.
- Hệ thống giữ được tính nhất quán giữa quyền hạn, rule, sequence, audit và transaction safety.

Nếu module này bị làm sơ sài, toàn bộ các module khác dù chạy được vẫn có nguy cơ sai nền, khó kiểm soát và khó go-live ổn định.

---

## 32. Baseline source note dùng để biên soạn tài liệu này

Tài liệu này được tổng hợp theo baseline mới hơn của bộ tài liệu SWM hiện có. Trong trường hợp tài liệu cũ và mới mâu thuẫn nhau, ưu tiên được đề xuất như sau:

1. PRD / Blueprint / Module Master / Overview bản mới hơn  
2. Inventory Transaction Spec và Master Data Supplement cho các quy tắc nền kỹ thuật-nghiệp vụ  
3. BRD dùng để tham khảo chi tiết rule; rule nào mâu thuẫn với baseline mới hơn phải được đánh dấu là superseded  
4. Project Charter dùng cho governance dự án, AI governance, cadence, RACI và KPI  

---

## 33. Danh sách thay đổi so với bản 1.0

1. Bổ sung quy ước tag `[CONFIRMED]`, `[TO-CONFIRM]`, `[PHASE 2]`, `[PROCESS — NOT CODE]`.
2. Gắn trạng thái quyết định vào các phần trọng yếu thay vì viết như mọi nội dung đều đã chốt.
3. Bổ sung Acceptance Criteria riêng cho từng sub-module.
4. Bổ sung cột `BRD Reference` cho business rules, chỉ map khi thực sự có rule tương ứng.
5. Làm rõ Sub-module 2 là `PROCESS-HEAVY` và Sub-module 8 là `[PROCESS — NOT CODE]` để tránh Dev build nhầm feature.
6. Bổ sung minimum go-live reason code set.
7. Nâng Section open items thành bảng có `Priority` và `Impact`.
8. Giữ lại các feedback đúng; loại bỏ các nhận xét sai reference, sai rule code, sai số lượng open item và sai tên sub-module.
