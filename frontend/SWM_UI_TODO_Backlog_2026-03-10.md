# SWM UI / UX / Validation To-Do Backlog

**Project:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Created from:** User-reported issues on 2026-03-10  
**Purpose:** Dùng làm checklist triển khai cho model AI hoặc team dev/QA, có thể tick theo tiến độ.  
**Format:** Mỗi mục là một to-do độc lập, có thể cập nhật trạng thái bằng checkbox.

---

## Hướng dẫn sử dụng

- `[ ]` Chưa làm
- `[~]` Đang làm
- `[x]` Đã hoàn thành
- Khi hoàn thành, nên cập nhật thêm người thực hiện, ngày hoàn thành, PR/commit hoặc ghi chú kiểm thử.

---

## A. Settings / Foundation

### A1. Reason Codes

- [x] **RC-01 — Bổ sung chức năng tạo mới Mã lý do**  
  - **Module/Page:** Settings > Reason Codes  
  - **URL:** `http://localhost:8386/app/settings/reason-codes`  
  - **Hiện trạng:** Chưa có chức năng tạo mới Mã lý do.  
  - **Cần làm:** Thêm UI + flow create Reason Code đầy đủ.  
  - **Gợi ý AC:** Có nút Create/New, mở form nhập dữ liệu, validate bắt buộc, lưu thành công và hiển thị trên list.

- [x] **RC-02 — Loại bỏ duplicate field Danh mục / Domain trong màn hình chỉnh sửa Mã lý do**  
  - **Module/Page:** Settings > Reason Codes  
  - **URL:** `http://localhost:8386/app/settings/reason-codes`  
  - **Hiện trạng:** Có 2 dropdown `Danh mục` và `Domain` cùng 1 tác dụng.  
  - **Cần làm:** Chỉ giữ lại 1 dropdown duy nhất, thống nhất label và mapping dữ liệu.

- [x] **RC-03 — Sửa lỗi không nhập/chỉnh sửa được trường “Mã lý do” khi Edit**  
  - **Module/Page:** Settings > Reason Codes  
  - **URL:** `http://localhost:8386/app/settings/reason-codes`  
  - **Hiện trạng:** Khi dùng chức năng Edit Reason Code, text field `Mã lý do` không thể nhập/chỉnh sửa; hệ thống vẫn warning `Mã lý do là bắt buộc`, dẫn đến không thể cập nhật.  
  - **Cần làm:** Fix binding/state/validation để field hoạt động đúng trong flow edit.

- [x] **RC-04 — Hiển thị và cho phép chỉnh sửa trường CODE trong Operations Detail**  
  - **Module/Page:** Settings > Reason Codes  
  - **URL:** `http://localhost:8386/app/settings/reason-codes`  
  - **Hiện trạng:** Trường `CODE` không hiển thị và cũng không thể chỉnh sửa.  
  - **Cần làm:** Bổ sung field hiển thị đúng trong detail/edit form và đảm bảo editable theo đúng rule nghiệp vụ.

- [x] **RC-05 — Sửa dropdown category không lọc được dữ liệu**  
  - **Module/Page:** Settings > Reason Codes  
  - **URL:** `http://localhost:8386/app/settings/reason-codes`  
  - **Hiện trạng:** Dropdown chọn category không hoạt động lọc.  
  - **Cần làm:** Fix logic filter và đồng bộ query state/UI state.

### A2. Permissions Catalog

- [x] **PERM-01 — Bổ sung chức năng tạo mới quyền (permission)**  
  - **Module/Page:** Settings > Permissions  
  - **URL:** `http://localhost:8386/app/settings/permissions`  
  - **Hiện trạng:** Không có chức năng tạo mới quyền.  
  - **Cần làm:** Thêm UI create permission + validation + persist.

- [x] **PERM-02 — Bổ sung chức năng xóa quyền (permission)**  
  - **Module/Page:** Settings > Permissions  
  - **URL:** `http://localhost:8386/app/settings/permissions`  
  - **Hiện trạng:** Không có chức năng xóa quyền.  
  - **Cần làm:** Thêm action delete kèm confirm dialog và kiểm tra dependency nếu permission đang được role sử dụng.

- [x] **PERM-03 — Cải thiện cách hiển thị permission trong table cho dễ đọc**  
  - **Module/Page:** Settings > Permissions  
  - **URL:** `http://localhost:8386/app/settings/permissions`  
  - **Hiện trạng:** Đang hiển thị dạng đầy đủ như `foundation.role.view`, gây khó đọc.  
  - **Cần làm:** Hiển thị label thân thiện hơn, ví dụ chỉ hiển thị `view` hoặc tách cột module / resource / action.

### A3. Role Management

- [x] **ROLE-01 — Bổ sung chức năng xóa Role ở cột Actions**  
  - **Module/Page:** Settings > Roles  
  - **URL:** `http://localhost:8386/app/settings/roles`  
  - **Hiện trạng:** Không có chức năng xóa Role.  
  - **Cần làm:** Thêm action delete role với confirm dialog và guard nếu role đang được user sử dụng.

- [x] **ROLE-02 — Cho phép chỉnh sửa trường ROLE CODE trong Edit Role**  
  - **Module/Page:** Settings > Roles  
  - **URL:** `http://localhost:8386/app/settings/roles`  
  - **Hiện trạng:** Edit Role chưa cho phép thay đổi giá trị trường `ROLE CODE`.  
  - **Cần làm:** Mở editable field hoặc làm rõ rule nếu cần khóa; nếu cho phép sửa thì phải validate unique + impact downstream.

---

## B. Billing

### B1. Invoices

- [x] **INV-01 — Bổ sung guard/warning cho các trường bắt buộc khi tạo/chỉnh sửa Invoice**  
  - **Module/Page:** Billing > Invoices  
  - **URL:** `http://localhost:8386/app/billing/invoices`  
  - **Hiện trạng:** FE chưa có guard hoặc warning để chặn việc để trống các trường cần thiết.  
  - **Cần làm:** Thêm validation bắt buộc, hiển thị lỗi rõ ràng, chặn submit khi dữ liệu chưa hợp lệ.

---

## C. VAS / Bagging

### C1. VAS Work Orders

- [x] **VASWO-01 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** VAS > Work Orders  
  - **URL:** `http://localhost:8386/app/vas/work-orders`  
  - **Hiện trạng:** Dropdown lọc status không có option `All`.  
  - **Cần làm:** Thêm `All` và đảm bảo query/filter trả về toàn bộ dữ liệu.

- [x] **VASWO-02 — Thêm option “All” cho dropdown lọc VAS Type**  
  - **Module/Page:** VAS > Work Orders  
  - **URL:** `http://localhost:8386/app/vas/work-orders`  
  - **Hiện trạng:** Dropdown lọc VAS type không có option `All`.  
  - **Cần làm:** Thêm `All` và xử lý filter đúng.

- [x] **VASWO-03 — Bổ sung guard/warning cho các trường bắt buộc khi Create VAS Work Order**  
  - **Module/Page:** VAS > Work Orders  
  - **URL:** `http://localhost:8386/app/vas/work-orders`  
  - **Hiện trạng:** Có thể tạo VAS work order với thông tin bị rỗng ở các trường cần thiết.  
  - **Cần làm:** Thêm validation FE, warning rõ ràng, chặn submit nếu dữ liệu chưa đủ.

### C2. VAS Execution

- [x] **VASEX-01 — Bổ sung field “Số lượng (bao)” trong Session Control để record bag nhiều túi trong một lần**  
  - **Module/Page:** VAS > Execution  
  - **URL:** `http://localhost:8386/app/vas/execution`  
  - **Hiện trạng:** Hiện chỉ cho phép record bag từng túi một; nếu cần record 10 túi phải bấm 10 lần.  
  - **Cần làm:** Thêm text field `Số lượng (bao)` đặt cạnh `Bag Weight` để cộng số túi chỉ trong 1 lần bấm.  
  - **Gợi ý AC:** Người dùng nhập Bag Weight + Số lượng (bao), hệ thống record đúng tổng số túi và tổng khối lượng tương ứng.

---

## D. Integration

### D1. Weighbridge Alerts

- [x] **WBA-01 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Integration > Alerts  
  - **URL:** `http://localhost:8386/app/integration/alerts`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

- [x] **WBA-02 — Thêm option “All” cho dropdown lọc Severity**  
  - **Module/Page:** Integration > Alerts  
  - **URL:** `http://localhost:8386/app/integration/alerts`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ severity.

- [x] **WBA-03 — Thêm option “All” cho dropdown lọc Source**  
  - **Module/Page:** Integration > Alerts  
  - **URL:** `http://localhost:8386/app/integration/alerts`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ source.

### D2. Weighbridge

- [x] **WB-01 — Thêm option “All” cho dropdown lọc Reference Type**  
  - **Module/Page:** Integration > Weighbridge  
  - **URL:** `http://localhost:8386/app/integration/weighbridge`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc tất cả reference type.

- [x] **WB-02 — Thêm option “All” cho dropdown lọc Weighing Type**  
  - **Module/Page:** Integration > Weighbridge  
  - **URL:** `http://localhost:8386/app/integration/weighbridge`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc tất cả weighing type.

---

## E. Work Execution

### E1. Work Queue

- [x] **WQ-01 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Work Execution > Queue  
  - **URL:** `http://localhost:8386/app/work-execution/queue`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

- [x] **WQ-02 — Thêm option “All” cho dropdown lọc Work Type**  
  - **Module/Page:** Work Execution > Queue  
  - **URL:** `http://localhost:8386/app/work-execution/queue`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ work type.

- [x] **WQ-03 — Thêm option “All” cho dropdown lọc Warehouse**  
  - **Module/Page:** Work Execution > Queue  
  - **URL:** `http://localhost:8386/app/work-execution/queue`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ warehouse.

---

## F. Inventory Control

### F1. Move Orders

- [x] **MOVE-01 — Bổ sung guard/warning cho các trường bắt buộc khi Create Move Order**  
  - **Module/Page:** Inventory Control > Move Orders  
  - **URL:** `http://localhost:8386/app/inventory-control/move-orders`  
  - **Hiện trạng:** Có thể tạo move order bị rỗng một số trường thông tin cần thiết.  
  - **Cần làm:** Thêm validation FE và chặn submit nếu thiếu dữ liệu bắt buộc.

- [x] **MOVE-02 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Inventory Control > Move Orders  
  - **URL:** `http://localhost:8386/app/inventory-control/move-orders`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

- [x] **MOVE-03 — Thêm option “All” cho dropdown lọc Warehouse**  
  - **Module/Page:** Inventory Control > Move Orders  
  - **URL:** `http://localhost:8386/app/inventory-control/move-orders`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ warehouse.

### F2. Transfer Orders

- [x] **TRF-01 — Bổ sung guard/warning cho các trường bắt buộc khi Create Transfer Order**  
  - **Module/Page:** Inventory Control > Transfers  
  - **URL:** `http://localhost:8386/app/inventory-control/transfers`  
  - **Hiện trạng:** Có thể tạo transfer order bị rỗng một số trường thông tin cần thiết.  
  - **Cần làm:** Thêm validation FE và chặn submit nếu thiếu dữ liệu bắt buộc.

- [x] **TRF-02 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Inventory Control > Transfers  
  - **URL:** `http://localhost:8386/app/inventory-control/transfers`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

### F3. Inventory Status Change

- [x] **STC-01 — Bổ sung guard/warning cho các trường bắt buộc khi Create Status Change**  
  - **Module/Page:** Inventory Control > Status Change  
  - **URL:** `http://localhost:8386/app/inventory-control/status-change`  
  - **Hiện trạng:** Có thể tạo status change bị rỗng trường bắt buộc.  
  - **Cần làm:** Thêm validation FE và chặn submit nếu thiếu dữ liệu.

- [x] **STC-02 — Bổ sung logic chặn case From Status = To Status**  
  - **Module/Page:** Inventory Control > Status Change  
  - **URL:** `http://localhost:8386/app/inventory-control/status-change`  
  - **Hiện trạng:** Ví dụ `From Status = AVAILABLE` và `To Status = AVAILABLE` vẫn được tạo.  
  - **Cần làm:** Chặn logic vô nghĩa này và hiển thị warning rõ ràng.

- [x] **STC-03 — Bổ sung xử lý an toàn để tránh exception khi tạo Status Change**  
  - **Module/Page:** Inventory Control > Status Change  
  - **URL:** `http://localhost:8386/app/inventory-control/status-change`  
  - **Hiện trạng:** Có nguy cơ lỗi logic/exception khi submit dữ liệu không hợp lệ hoặc thiếu dữ liệu.  
  - **Cần làm:** Bổ sung defensive validation và error handling.

- [x] **STC-04 — Thêm option “All” cho dropdown lọc Warehouse**  
  - **Module/Page:** Inventory Control > Status Change  
  - **URL:** `http://localhost:8386/app/inventory-control/status-change`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ warehouse.

### F4. Adjustments

- [x] **ADJ-01 — Bổ sung guard/warning cho các trường bắt buộc khi Create Adjustment**  
  - **Module/Page:** Inventory Control > Adjustments  
  - **URL:** `http://localhost:8386/app/inventory-control/adjustments`  
  - **Hiện trạng:** Có thể tạo adjustment bị rỗng một số trường thông tin cần thiết.  
  - **Cần làm:** Thêm validation FE và chặn submit nếu thiếu dữ liệu.

- [x] **ADJ-02 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Inventory Control > Adjustments  
  - **URL:** `http://localhost:8386/app/inventory-control/adjustments`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

- [x] **ADJ-03 — Thêm option “All” cho dropdown lọc Source Type**  
  - **Module/Page:** Inventory Control > Adjustments  
  - **URL:** `http://localhost:8386/app/inventory-control/adjustments`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ source type.

### F5. Cycle Count

- [x] **CC-01 — Thêm option “All” cho dropdown lọc Status**  
  - **Module/Page:** Inventory Control > Cycle Count  
  - **URL:** `http://localhost:8386/app/inventory-control/cycle-count`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ status.

- [x] **CC-02 — Thêm option “All” cho dropdown lọc Warehouse**  
  - **Module/Page:** Inventory Control > Cycle Count  
  - **URL:** `http://localhost:8386/app/inventory-control/cycle-count`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ warehouse.

### F6. Movement History

- [x] **HIS-01 — Thêm option “All” cho dropdown lọc Warehouse**  
  - **Module/Page:** Inventory Control > History  
  - **URL:** `http://localhost:8386/app/inventory-control/history`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ warehouse.

- [x] **HIS-02 — Thêm option “All” cho dropdown lọc Item**  
  - **Module/Page:** Inventory Control > History  
  - **URL:** `http://localhost:8386/app/inventory-control/history`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ item.

- [x] **HIS-03 — Thêm option “All” cho dropdown lọc Trans Type**  
  - **Module/Page:** Inventory Control > History  
  - **URL:** `http://localhost:8386/app/inventory-control/history`  
  - **Hiện trạng:** Không có option `All`.  
  - **Cần làm:** Thêm `All` để lọc toàn bộ trans type.

---

## G. Cross-Cutting Improvements

### G1. Dropdown Filter Standardization

- [x] **XUI-01 — Chuẩn hóa toàn bộ dropdown filter trên hệ thống phải có option “All”**  
  - **Phạm vi:** Toàn bộ các trang list/filter trong hệ thống  
  - **Hiện trạng:** Nhiều dropdown chỉ cho chọn một option cụ thể, không có `All`.  
  - **Cần làm:** Rà soát toàn bộ các màn hình, bổ sung option `All`, thống nhất behavior và default filter.

### G2. Create Form Validation Standardization

- [x] **XUI-02 — Chuẩn hóa guard/warning/validation cho toàn bộ form Create**  
  - **Phạm vi:** Toàn bộ các màn hình create form  
  - **Hiện trạng:** Nhiều form create đang cho submit khi thiếu trường bắt buộc, gây dữ liệu rỗng hoặc lỗi logic.  
  - **Cần làm:** Thiết lập chuẩn validation FE cho tất cả form create.  
  - **Gợi ý AC:**  
    - Chặn submit nếu thiếu dữ liệu bắt buộc.  
    - Hiển thị message lỗi ngay dưới field hoặc toast rõ ràng.  
    - Scroll/focus tới field lỗi đầu tiên.  
    - Không gọi API nếu form invalid.

### G3. QA Regression Checklist

- [ ] **XQA-01 — Tạo checklist regression cho toàn bộ lỗi UI/filter/validation nêu trên**  
  - **Phạm vi:** QA/UAT regression  
  - **Cần làm:** Sau mỗi đợt fix, cần retest từng mục trong backlog này và đánh dấu pass/fail rõ ràng.

---

## Mẫu cập nhật tiến độ

Sử dụng mẫu này khi muốn update một mục:

```md
- [x] RC-01 — Bổ sung chức năng tạo mới Mã lý do
  - Owner: AI Dev 01
  - Done date: 2026-03-12
  - PR: #123
  - QA: Passed on staging
  - Notes: Đã thêm create modal + validation code/category bắt buộc.
```

---

## Tóm tắt nhanh theo nhóm

- **Reason Codes:** 5 mục
- **Permissions:** 3 mục
- **Roles:** 2 mục
- **Invoices:** 1 mục
- **VAS Work Orders / Execution:** 4 mục
- **Integration:** 5 mục
- **Work Queue:** 3 mục
- **Inventory Control:** 17 mục
- **Cross-cutting:** 3 mục

**Tổng cộng:** 43 to-do items

