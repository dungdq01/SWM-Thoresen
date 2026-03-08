---
trigger: manual
---

---
trigger: manual
---

---
name: WMS Product UX Architecture Rules
description: Kiến trúc UX/UI cấp sản phẩm cho toàn bộ WMS. File này đứng trên design system và quyết định cách tổ chức màn hình, information hierarchy, page template, entity flow, task flow và trải nghiệm thao tác trong toàn bộ platform.
---

# WMS Product UX Architecture Rules

> **Mục tiêu:** Tạo ra một WMS platform có bố cục rõ ràng, thao tác nhanh, đáng tin cậy, role-based, đúng chất B2B logistics / warehouse marketplace.  
> Design system quyết định style. File này quyết định **logic màn hình, luồng thao tác, cấu trúc thông tin và hành vi sản phẩm**.

---

## 1. Product Mindset

- WMS là **B2B operational platform**, không phải landing page hay dashboard trang trí.
- Ưu tiên:
  - clarity
  - speed
  - operational trust
  - information hierarchy
  - decision support
  - task completion
- Mỗi màn hình phải trả lời rõ:
  - user là ai
  - họ đang làm việc gì
  - thông tin nào quan trọng nhất lúc này
  - hành động chính là gì
  - bước tiếp theo là gì
- Không ép toàn bộ hệ thống theo một layout cố định nếu primary task khác nhau.
- Không hiển thị nhiều dữ liệu hơn mức cần thiết chỉ để “trông mạnh”.
- Trong môi trường WMS, UI tốt không phải là UI nhiều số liệu; UI tốt là UI giúp user **ra quyết định nhanh và ít lỗi hơn**.

---

## 2. Product Model

WMS được hiểu là một platform đa lớp gồm:

1. **Asset Foundation**
   - Site
   - Building
   - Unit
   - Specs
   - Documents
   - Docks / facilities

2. **Commercial Layer**
   - Listing
   - Marketplace
   - Availability
   - Price / quote mode
   - Lead
   - Matching
   - Deal

3. **Transaction Layer**
   - Proposal / quote
   - Contract
   - Billing
   - Invoice
   - Payment status

4. **Operations Layer**
   - Onboarding
   - Cases
   - Maintenance
   - Monitoring
   - SLA / issue handling

5. **Management Layer**
   - Dashboard
   - Analytics
   - IAM / permissions
   - AI support / assistant nếu có

### Kiến trúc bắt buộc
- Không được trộn **asset layer**, **commercial layer**, **transaction layer** và **operations layer** thành một mental model mơ hồ.
- Asset là nền tảng dữ liệu.
- Listing là lớp thương mại hóa asset.
- Matching/Deal/Contract là lớp giao dịch.
- Billing/Maintenance/Monitoring là lớp hậu giao dịch và vận hành.
- Mỗi module phải cho user biết mình đang ở layer nào.

---

## 3. Primary User Roles

Hệ thống phải hỗ trợ tối thiểu các role sau:

- Admin / System operator
- Asset owner / warehouse operator
- Leasing / sales / commercial team
- Matching / marketplace operator
- Contract / billing / finance operations
- Maintenance / customer support / case handling
- Viewer / approver nếu có

### Role rules
- Mỗi role chỉ nên thấy:
  - module cần dùng
  - dữ liệu liên quan
  - filter liên quan
  - CTA liên quan
  - status liên quan
- Không để mọi role nhìn cùng một màn hình rồi tự suy luận xem đâu là phần của mình.
- Sidebar visibility phải theo role hoặc permission khi phù hợp.
- Header search nên hoạt động như global search / command search nếu hệ thống đủ lớn.

---

## 4. Core UX Principles

- **Task-first, not dashboard-first**
- **Overview only where overview is useful**
- **Search/filter are first-class UX**
- **One page = one primary job**
- **Hierarchy before decoration**
- **Trust before cleverness**
- **Predictable patterns are operational safety rails**
- **Progressive disclosure over information dumping**
- **Keep context while drilling down**
- **Fast feedback reduces hesitation**

### Quy tắc cứng
- Không bắt user phải nhớ dữ liệu từ block trên để thao tác ở block dưới nếu có thể hiển thị lại.
- Không để CTA chính bị chìm giữa nhiều CTA ngang cấp.
- Không để search/filter tách xa khỏi result list.
- Không để 2–3 entity level cạnh tranh cùng cấp độ thị giác nếu không có grouping rõ ràng.
- Không tạo card grid chỉ vì đẹp nếu list/table hiệu quả hơn cho task.

---

## 5. Page Template System

Mọi trang trong WMS phải thuộc **một** trong các template dưới đây.

### 5.1 Overview Page
Dùng cho:
- Dashboard
- Analytics
- Monitoring overview
- Marketplace overview
- Management summary

Cấu trúc:
1. Page header
2. KPI / alerts / top summaries
3. Key widgets / prioritized insights
4. Actionable lists / drill-down sections

Quy tắc:
- KPI chỉ xuất hiện khi nó giúp ra quyết định hoặc ưu tiên công việc.
- Tối đa 4 KPI cấp 1 trong một hàng.
- Top section chỉ chứa dữ liệu headline.
- Detail không được chen ngang với KPI cùng cấp thị giác.

### 5.2 Worklist Page
Dùng cho:
- Leads list
- Matching queue
- Contract list
- Billing list
- Cases
- Maintenance work queue
- Asset unit list nếu primary task là xử lý danh sách

Cấu trúc:
1. Page header + primary action
2. Sticky search / filters / quick actions
3. Result summary + applied filters + saved views
4. Table/list chính
5. Pagination / bulk actions / quick preview

Quy tắc:
- Không bắt buộc có KPI ở đầu trang.
- Search/filter phải nằm sát result area.
- Bulk actions chỉ hiện khi có selection.
- Row detail nên mở bằng SlidePanel hoặc inline expand khi phù hợp.
- User không được mất context khi xem nhanh chi tiết.

### 5.3 Explorer Page
Dùng cho:
- Asset explorer
- Site → Building → Unit explorer
- Marketplace browse
- Inventory exploration

Cấu trúc:
1. Page header
2. Scope selector / hierarchy selector / filters
3. Explorer body:
   - tree/list/grouped explorer
   - result area
   - detail preview nếu cần
4. Related entities / supporting context

Quy tắc:
- Explorer page phải phân tách rõ level entity.
- Nếu primary task là tìm unit, unit list là primary zone.
- Nếu site cards xuất hiện, chúng chỉ là supporting context trừ khi user đang ở site mode.
- Không được để site-level cards và unit-level results cạnh tranh ngang nhau mà không có nhãn.

### 5.4 Entity Detail Page
Dùng cho:
- Site detail
- Building detail
- Unit detail
- Lead detail
- Deal detail
- Contract detail
- Invoice detail
- Case detail

Cấu trúc:
1. Breadcrumb
2. Summary header
3. Tabs hoặc sub-navigation
4. Detail content
5. Timeline / logs / documents / related actions

Quy tắc:
- Detail page phải ưu tiên summary + next actions.
- Tabs chỉ dùng khi thật sự có nhiều vùng nội dung đủ lớn.
- Action quan trọng phải nằm ở header hoặc sticky action bar.
- Không bắt user quay lại list để xem trạng thái hoặc dữ liệu cơ bản.

---

## 6. WMS Information Hierarchy Rules

- Mỗi page chỉ có **1 primary zone**.
- Chỉ một vùng được phép chiếm ưu tiên thị giác lớn nhất.
- Search, filters, results, related entities, KPI, banners và tabs không được cùng “la hét”.
- Vùng quan trọng nhất phải dễ nhận ra trong 3 giây đầu.
- Vùng ít quan trọng hơn phải giảm visual weight bằng:
  - màu nhẹ hơn
  - spacing nhỏ hơn
  - typography nhẹ hơn
  - border/divider thay vì card nổi
- Trong màn hình dày dữ liệu:
  - ưu tiên border-separation
  - ưu tiên grouping
  - ưu tiên sticky controls
  - ưu tiên disclosure / collapse
  - hạn chế shadow-decoration

### Cấm
- Nhiều block cùng có card to, title đậm, padding lớn, action lớn nhưng phục vụ mục tiêu khác nhau.
- KPI, filter, list và related cards cùng đứng trên màn mà không có hierarchy.

---

## 7. Search, Filter, Sorting & Result UX

Search/filter là trọng tâm UX của WMS.

### Search Rules
- Global search ở header nên hỗ trợ:
  - kho
  - site
  - unit
  - lead
  - deal
  - hợp đồng
  - invoice
  - case
- Search trong module phải phù hợp entity của module đó.
- Search box phải cho biết scope hiện tại.

### Filter Rules
- Filter được chia thành:
  1. Scope filters
  2. Core filters
  3. Advanced filters
  4. Saved views nếu có
- Core filters phải hiện trực tiếp.
- Advanced filters nên đưa vào drawer hoặc expandable section.
- Filter categories phải dùng từ ngữ quen thuộc, ưu tiên các khía cạnh user thật sự dùng để ra quyết định. [web:219][web:217]
- Applied filters phải luôn hiển thị rõ.
- Luôn có:
  - Clear all
  - Remove từng filter chip
  - Result count
  - Sort control nếu áp dụng
- Cho phép combine nhiều filter phù hợp với cùng type khi logic nghiệp vụ cho phép, để user thu hẹp kết quả tốt hơn. [web:217]

### Sorting Rules
- Chỉ cung cấp sort có ý nghĩa cho task.
- Không đưa quá nhiều sort option vô ích.
- Sort phải phản ánh mental model user:
  - mới nhất
  - phù hợp nhất
  - diện tích
  - giá
  - sẵn sàng / availability
  - cập nhật gần nhất

---

## 8. Asset Module Architecture

Asset module là nền của WMS.

### Entity hierarchy
- Site
- Building
- Unit

### Quy tắc bắt buộc
- Phải tách rõ 3 level này trong data model và UI.
- User phải luôn biết mình đang:
  - xem site
  - xem building
  - xem unit
- Không trộn “site summary” và “unit worklist” trên cùng một level hierarchy nếu không có grouping rõ.

### Khi nào dùng site-first
- Quản lý cấu trúc tài sản
- Kiểm tra coverage theo vùng
- Tạo mới / onboarding / mapping site-building-unit
- Review document / facilities / utilities / compliance

### Khi nào dùng unit-first
- Tìm hàng sẵn sàng cho listing
- Matching
- Availability search
- Commercial operations
- Quick actions cho unit

### Unit item phải ưu tiên
- unit code
- unit type
- site/building
- area
- clear height
- temperature/special type nếu có
- availability
- listing status
- quick action

### Site card chỉ nên hiển thị
- tên site
- địa chỉ
- warehouse type
- số building
- số unit
- operational status
- quick navigation vào detail/explorer

---

## 9. Marketplace Architecture

Marketplace là search-and-compare environment.

### Core rules
- Marketplace page phải tối ưu cho:
  - khám phá
  - lọc
  - so sánh
  - gửi inquiry / lead / yêu cầu báo giá
- Listing card/list item phải ưu tiên:
  - location
  - type
  - area / capacity
  - availability
  - price hoặc quote mode
  - special capabilities
  - trust signals / docs / certifications nếu có
  - next action

### UX rules
- Listing browse nên dùng:
  - card grid nếu thiên market discovery
  - list/hybrid rows nếu thiên so sánh nhanh
- Kết quả nên gắn với filter context rõ ràng.
- Empty result phải gợi ý:
  - nới filter
  - mở rộng khu vực
  - xem loại kho tương tự
- Nếu sản phẩm đủ lớn, nên hỗ trợ:
  - saved search
  - compare
  - recent views
  - inquiry history

---

## 10. Matching & Deal Workbench Rules

Matching pages không phải dashboard; chúng là workbench.

### Mục tiêu
- Giúp commercial team đi từ requirement → candidate → shortlist → proposal → negotiation.

### Matching page phải có
- lead summary
- requirements summary
- matched candidates
- fit rationale / notes nếu có
- action next step

### Deal states
- new
- qualified
- contacted
- shortlisted
- proposal-sent
- negotiating
- won
- lost
- archived

### UX rules
- Candidate comparison nên dễ scan.
- Requirement summary phải luôn hiện khi đánh giá candidate.
- Không bắt user mở 5 panel mới nhớ lead đang cần gì.
- Quick actions phải rõ:
  - gửi báo giá
  - lưu shortlist
  - gán owner
  - tạo deal
  - từ chối

---

## 11. Contract, Billing & Case Rules

Đây là vùng task-critical, phải ưu tiên clarity hơn visual richness.

### Contract / Billing page ưu tiên
- status
- bên liên quan
- linked deal / linked asset
- amount
- due date
- timeline
- document status
- next action

### Case / CS Rules
- Case page phải là resolution-first.
- Cần thấy nhanh:
  - loại case
  - mức độ ưu tiên
  - SLA
  - owner
  - tình trạng hiện tại
  - lịch sử xử lý
- Alert hoặc overdue phải nổi bật hơn metadata thường.

### Cấm
- CTA rủi ro cao nằm ngang hàng không phân cấp.
- Status mơ hồ kiểu “Đang xử lý” cho mọi loại case/billing/contract.

---

## 12. Monitoring & Maintenance Rules

Monitoring là exception-first interface.

### Quy tắc
- Không để trạng thái bình thường và cảnh báo cùng độ ưu tiên.
- Alert, downtime, overdue maintenance, anomaly phải có visual priority cao hơn.
- Timeline/event list phải dễ scan.
- Nhóm sự kiện theo:
  - severity
  - time
  - site / asset
  - unresolved status
- Monitoring page cần giúp user trả lời:
  - có vấn đề gì
  - ảnh hưởng ở đâu
  - nghiêm trọng đến mức nào
  - cần làm gì ngay

---

## 13. KPI Rules

### KPI chỉ dùng khi
- trang là overview
- có giá trị quyết định / ưu tiên công việc
- hỗ trợ drill-down hoặc follow-up action

### KPI không bắt buộc cho
- worklist page
- explorer page
- detail page
- heavy form page

### KPI Rules
- Tối đa 4 KPI cấp 1 trên một hàng
- Không để KPI đẩy task chính xuống dưới fold khi page không cần overview
- KPI phải là headline insight, không phải bản sao của dữ liệu bên dưới
- KPI nên đi kèm:
  - trend
  - status
  - alert
  - action hoặc drill-down nếu phù hợp

---

## 14. Density & Layout Rules

WMS là hệ thống dữ liệu dày, nên cần **compact clarity**.

### Rules
- Không ép mọi data list thành card nếu table/hybrid list hiệu quả hơn.
- Table dùng cho:
  - worklist
  - comparison
  - transaction data
  - queues
- Card grid dùng cho:
  - overview
  - marketplace browse
  - site summary
  - dashboard modules
- Border-separation ưu tiên hơn shadow-separation cho màn hình dense.
- Khoảng trắng phải có mục đích; không được loãng đến mức user phải cuộn nhiều để làm thao tác đơn giản.
- Information density phải phù hợp với task và trình độ người dùng.

---

## 15. SlidePanel, Modal, Drawer Strategy

### SlidePanel
Dùng cho:
- quick detail
- quick edit nhẹ
- preview row
- approval flows ngắn
- document preview

Quy tắc:
- Giữ context của list bên dưới
- Có summary header rõ
- Footer tối đa 2 CTA chính
- Không dùng cho form nhiều bước hoặc quá dài

### Modal
Dùng cho:
- confirm
- destructive actions
- short focused input
- small atomic tasks

### Drawer
Dùng cho:
- advanced filters
- mobile filter
- secondary tools không nên chen vào main page

### Navigate to full page
Dùng cho:
- create/edit phức tạp
- onboarding dài
- hợp đồng nhiều section
- flows cần autosave / validation / sectioning rõ

---

## 16. Form Architecture Rules

### Form structure
- Chia theo mental model nghiệp vụ:
  - thông tin cơ bản
  - thông tin vận hành
  - pricing / availability
  - documents
  - contacts
  - compliance / notes nếu có
- Không dồn toàn bộ vào một card dài đơn điệu.
- Mỗi section phải có title rõ.
- Form dài nên có:
  - breadcrumb
  - progress / section navigator nếu cần
  - save draft
  - sticky footer actions nếu dài

### Validation rules
- Báo lỗi gần field
- Ưu tiên validation sớm
- Lỗi phải cho biết:
  - vấn đề là gì
  - sửa thế nào
- Không đợi submit xong mới hiện toàn bộ lỗi nếu có thể phát hiện sớm hơn

---

## 17. Status Architecture Rules

WMS phải chuẩn hóa status theo domain.

### Status groups
- data status
- availability status
- listing status
- lead status
- deal status
- contract status
- billing status
- maintenance status
- case status

### Rules
- Mỗi badge chỉ mang một nghĩa chính.
- Cùng một trạng thái phải dùng cùng:
  - label
  - màu semantic
  - vị trí hiển thị
  - icon nếu có
- Không dùng “Đang xử lý” như trạng thái mặc định cho mọi thứ.
- Nếu status phức tạp, phải có tooltip / legend / filter mapping rõ.

---

## 18. Role-Based Navigation Rules

- Sidebar chỉ hiển thị modules; điều này giữ nguyên.
- Nhưng module visibility nên theo role/permission khi phù hợp.
- Không phải mọi user đều cần thấy đủ 14 module.
- Header phải giữ:
  - global search
  - notifications
  - user menu
- User menu không được chen vào sidebar.
- Nếu hỗ trợ multi-org, org switch phải rõ ràng, không ẩn sâu.

---

## 19. Responsiveness Rules

- Mobile không phải bản co nhỏ của desktop.
- Với WMS, mobile ưu tiên:
  - search
  - notifications
  - quick approvals
  - status checking
  - detail review nhẹ
- Tablet/Desktop ưu tiên:
  - dense worklists
  - explorer
  - comparison
  - data-heavy operations
- Không giữ grid 3–4 cột trên mobile nếu làm giảm khả năng quét.
- Filter trên mobile nên sticky hoặc drawer-based.

---

## 20. Perceived Performance Rules

- Search, filter, sort, tab switch, panel open, save draft, row status update phải có phản hồi ngay.
- Với thao tác xác suất thành công cao, cân nhắc optimistic UI.
- Skeleton phải giống layout thật.
- Không để user click mà không biết hệ thống đã nhận thao tác hay chưa.
- Kết quả lọc và danh sách phải thay đổi có chủ đích, không gây mất phương hướng.

---

## 21. Empty, No-result, Error, Permission States

Phải phân biệt rõ:

### Empty state
- chưa có dữ liệu

### No-result state
- có dữ liệu nhưng không khớp filter/search

### Permission state
- user không có quyền

### Error state
- lỗi tải / lỗi xử lý

### Rules
- Mỗi state phải có message khác nhau
- Mỗi state phải gợi ý next step phù hợp
- Không dùng một empty state generic cho tất cả tình huống
- Error state phải có retry khi phù hợp

---

## 22. WMS-Specific Page Review Rules

Trước khi chốt bất kỳ màn hình nào, luôn tự hỏi:

1. Đây là page loại gì: overview, worklist, explorer hay detail?
2. Primary task là gì?
3. Có đang ép KPI vào chỗ không cần KPI không?
4. Search/filter đã ở gần result chưa?
5. Có bao nhiêu entity level đang hiển thị?
6. User có phải tự suy luận mental model quá nhiều không?
7. CTA chính là gì?
8. Có block nào đang tranh attention vô ích không?
9. Nếu mở chi tiết nhanh, user có giữ được context không?
10. Empty/loading/error/no-result đã tách rõ chưa?
11. Role này có cần thấy tất cả thành phần hiện tại không?
12. Layout hiện tại đang hỗ trợ hành động hay chỉ đang “trưng bày dữ liệu”?

---

## 23. How This File Works With Design System

- File này quyết định:
  - layout logic
  - page template
  - hierarchy
  - density
  - flow
  - entity architecture
  - role-based behavior
- Design system quyết định:
  - màu sắc
  - typography
  - components
  - modal/panel styling
  - spacing tokens
  - visual consistency

### Priority
Khi có xung đột:
1. Product UX Architecture Rules
2. WMS Frontend Design System
3. Module-specific rules

Ví dụ:
- Nếu design system nói “mọi page có KPI”, nhưng page là worklist → **bỏ KPI**, vì task-first quan trọng hơn.
- Nếu design system có card style đẹp, nhưng dense worklist phù hợp table hơn → **dùng table**, không ép card grid.
