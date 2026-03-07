# Module 1 - Foundation Frontend Documentation

## 1. Tổng quan

Module Foundation Frontend cung cấp giao diện quản trị cho các chức năng nền tảng của hệ thống SWM TVL:

- **Quản lý vai trò (Roles)** - Tạo, sửa, phân quyền cho các vai trò
- **Danh mục quyền (Permissions)** - Xem danh sách quyền hệ thống
- **Mã lý do (Reason Codes)** - Quản lý các mã lý do cho điều chỉnh
- **Number Sequence** - Cấu hình sinh số tự động cho chứng từ
- **Governance** - Business rules, Decision logs
- **System Logs** - Audit logs, Exception logs

---

## 2. Cấu trúc thư mục

```
frontend/src/
├── domains/auth/
│   ├── api/auth.api.js          # API calls
│   ├── hooks/                    # React Query hooks
│   │   ├── useRoles.js
│   │   ├── usePermissions.js
│   │   ├── useReasonCodes.js
│   │   ├── useNumberSequences.js
│   │   ├── useGovernance.js
│   │   └── useLogs.js
│   ├── model/constants.js        # Constants & enums
│   └── components/StatusBadge.jsx # Shared badges
├── features/settings/
│   ├── roles/
│   │   ├── RoleFormModal.jsx
│   │   └── AssignPermissionModal.jsx
│   ├── reason-codes/
│   │   └── ReasonCodeFormModal.jsx
│   ├── number-sequences/
│   │   └── NumberSequenceFormModal.jsx
│   └── governance/
│       └── RuleFormModal.jsx
├── pages/settings/
│   ├── RolesPage.jsx
│   ├── PermissionsPage.jsx
│   ├── ReasonCodesPage.jsx
│   ├── NumberSequencesPage.jsx
│   ├── GovernancePage.jsx
│   ├── LogsPage.jsx
│   └── components/SettingsLayout.jsx
└── app/
    ├── layouts/SettingsLayout.jsx  # Sidebar navigation
    └── routes.jsx                   # Route definitions
```

---

## 3. Các trang (Pages)

### 3.1 Trang Quản lý vai trò (`/settings/roles`)

**Mục đích:** Quản lý các vai trò trong hệ thống RBAC.

**Chức năng chính:**
- Xem danh sách vai trò với bộ lọc tìm kiếm
- Tạo vai trò mới
- Chỉnh sửa thông tin vai trò
- Phân quyền cho vai trò

**Các button và thao tác:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Tạo vai trò** | Header page | Mở modal tạo vai trò mới | `POST /api/v1/foundation/roles` |
| **Icon Shield** | Mỗi dòng | Mở modal phân quyền | `POST /api/v1/foundation/roles/:id/permissions` |
| **Icon Edit** | Mỗi dòng | Mở modal chỉnh sửa | `PUT /api/v1/foundation/roles/:id` |

**Hướng dẫn sử dụng:**
1. Truy cập trang `/settings/roles`
2. Sử dụng ô tìm kiếm để lọc theo mã hoặc tên vai trò
3. Click "Tạo vai trò" để thêm mới
4. Click icon Shield để phân quyền cho vai trò
5. Click icon Edit để chỉnh sửa thông tin vai trò

---

### 3.2 Trang Danh mục quyền (`/settings/permissions`)

**Mục đích:** Xem danh sách tất cả quyền có trong hệ thống.

**Chức năng chính:**
- Xem danh sách quyền theo nhóm module
- Tìm kiếm quyền theo mã hoặc mô tả
- Lọc theo module

**Các button và thao tác:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Ô tìm kiếm** | Header | Tìm kiếm quyền | `GET /api/v1/foundation/permissions` |
| **Dropdown Module** | Header | Lọc theo module | `GET /api/v1/foundation/permissions?moduleCode=...` |

**Hướng dẫn sử dụng:**
1. Truy cập trang `/settings/permissions`
2. Các quyền được nhóm theo module
3. Sử dụng tìm kiếm hoặc dropdown để lọc
4. Xem chi tiết: mã quyền, resource, action, mô tả

---

### 3.3 Trang Mã lý do (`/settings/reason-codes`)

**Mục đích:** Quản lý các mã lý do dùng khi điều chỉnh trong hệ thống.

**Chức năng chính:**
- Xem danh sách mã lý do
- Tạo mã lý do mới
- Chỉnh sửa mã lý do
- Vô hiệu hóa mã lý do

**Các button và thao tác:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Tạo mã lý do** | Header page | Mở modal tạo mới | `POST /api/v1/foundation/reason-codes` |
| **Icon Edit** | Mỗi dòng | Mở modal chỉnh sửa | `PUT /api/v1/foundation/reason-codes/:id` |
| **Icon Power** | Mỗi dòng | Vô hiệu hóa mã | `POST /api/v1/foundation/reason-codes/:id/deactivate` |
| **Dropdown Danh mục** | Header | Lọc theo category | Query param `category` |

**Cột hiển thị:**
- **Mã**: Mã định danh (VD: DAMAGED, SHORT_DELIVERY)
- **Mô tả**: Diễn giải ngắn gọn
- **Danh mục**: Inbound/Outbound/Adjustment/Inventory/General
- **Domain**: Module áp dụng
- **Yêu cầu**: Icons hiển thị nếu cần phê duyệt, ghi chú, hoặc ảnh hưởng billing
- **Trạng thái**: Đang hoạt động / Ngưng hoạt động

**Hướng dẫn sử dụng:**
1. Truy cập `/settings/reason-codes`
2. Click "Tạo mã lý do" để thêm mới
3. Điền thông tin: mã, mô tả, danh mục, domain
4. Cấu hình các tùy chọn: yêu cầu phê duyệt, ghi chú, ảnh hưởng billing
5. Click icon Power để vô hiệu hóa mã không còn sử dụng

---

### 3.4 Trang Number Sequence (`/settings/number-sequences`)

**Mục đích:** Cấu hình quy tắc sinh số tự động cho chứng từ.

**Chức năng chính:**
- Xem danh sách cấu hình sequence
- Tạo sequence mới
- Chỉnh sửa cấu hình sequence

**Các button và thao tác:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Tạo sequence** | Header page | Mở modal tạo mới | `POST /api/v1/foundation/number-sequences` |
| **Icon Edit** | Mỗi dòng | Mở modal chỉnh sửa | `PUT /api/v1/foundation/number-sequences/:id` |

**Cột hiển thị:**
- **Mã**: VD: RCV, SHP, ADJ
- **Mô tả**: Mục đích sử dụng
- **Prefix**: Tiền tố cho số sinh ra
- **Format**: Template format (VD: `{prefix}-{yyyymmdd}-{running_no}`)
- **Scope**: Toàn hệ thống / Theo kho / Theo chủ hàng
- **Reset**: Không reset / Hàng ngày / Hàng tháng / Hàng năm
- **Độ dài số**: Số chữ số của running number

**Hướng dẫn sử dụng:**
1. Truy cập `/settings/number-sequences`
2. Click "Tạo sequence" để thêm mới
3. Cấu hình:
   - **Mã sequence**: Định danh duy nhất
   - **Prefix**: Tiền tố cho số
   - **Format template**: Sử dụng biến `{prefix}`, `{yyyymmdd}`, `{running_no}`
   - **Scope type**: Xác định phạm vi reset
   - **Reset policy**: Khi nào reset về 1

---

### 3.5 Trang Governance (`/settings/governance`)

**Mục đích:** Quản lý business rules và decision logs.

**Tabs:**
1. **Business Rules** - Định nghĩa quy tắc nghiệp vụ
2. **Decision Logs** - Ghi nhận các quyết định quan trọng

**Các button và thao tác (tab Business Rules):**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Tạo rule mới** | Header page | Mở modal tạo rule | `POST /api/v1/foundation/rules` |
| **Icon Edit** | Mỗi dòng | Mở modal chỉnh sửa | `PUT /api/v1/foundation/rules/:id` |
| **Dropdown Domain** | Header | Lọc theo domain | Query param `domain` |

**Các trạng thái rule:**
- **Nháp (DRAFT)**: Đang soạn thảo
- **Đang áp dụng (ACTIVE)**: Rule đang có hiệu lực
- **Ngưng sử dụng (DEPRECATED)**: Rule không còn áp dụng

**Hướng dẫn sử dụng:**
1. Truy cập `/settings/governance`
2. Tab "Business Rules": Xem và quản lý các quy tắc
3. Tab "Decision Logs": Xem lịch sử các quyết định
4. Click "Tạo rule mới" để thêm quy tắc
5. Điền: mã rule, tên, mô tả, domain, trạng thái, rationale

---

### 3.6 Trang System Logs (`/settings/logs`)

**Mục đích:** Tra cứu audit logs và exception logs.

**Tabs:**
1. **Audit Logs** - Lịch sử thao tác trong hệ thống
2. **Exception Logs** - Các lỗi/ngoại lệ đã xảy ra

**Các button và thao tác:**

| Button | Vị trí | Mô tả | API gọi |
|--------|--------|-------|---------|
| **Ô tìm kiếm** | Tab Audit | Lọc theo entity | `GET /api/v1/foundation/audit-logs?entity=...` |
| **Dropdown trạng thái** | Tab Exception | Lọc đã xử lý/chưa | `GET /api/v1/foundation/exception-logs?resolved=...` |
| **Icon CheckCircle** | Tab Exception | Đánh dấu đã xử lý | `POST /api/v1/foundation/exception-logs/:id/resolve` |
| **Pagination** | Cuối bảng | Chuyển trang | Query params `page`, `limit` |

**Cột Audit Logs:**
- Thời gian, Entity, Action, User, Module, Chi tiết

**Cột Exception Logs:**
- Thời gian, Loại Exception, Mức độ (LOW/MEDIUM/HIGH/CRITICAL), Module, Message, Trạng thái

**Hướng dẫn sử dụng:**
1. Truy cập `/settings/logs`
2. Tab "Audit Logs": Xem lịch sử các thao tác CRUD
3. Tab "Exception Logs": Xem các lỗi đã xảy ra
4. Lọc exception theo trạng thái: Tất cả / Chưa xử lý / Đã xử lý
5. Click icon CheckCircle để đánh dấu exception đã được xử lý

---

## 4. API Endpoints sử dụng

### 4.1 RBAC APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/foundation/roles` | Lấy danh sách vai trò |
| POST | `/api/v1/foundation/roles` | Tạo vai trò mới |
| PUT | `/api/v1/foundation/roles/:id` | Cập nhật vai trò |
| POST | `/api/v1/foundation/roles/:id/permissions` | Gán quyền cho vai trò |
| GET | `/api/v1/foundation/permissions` | Lấy danh sách quyền |
| GET | `/api/v1/foundation/me/permissions` | Lấy quyền user hiện tại |

### 4.2 Reason Code APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/foundation/reason-codes` | Lấy danh sách mã lý do |
| POST | `/api/v1/foundation/reason-codes` | Tạo mã lý do mới |
| PUT | `/api/v1/foundation/reason-codes/:id` | Cập nhật mã lý do |
| POST | `/api/v1/foundation/reason-codes/:id/deactivate` | Vô hiệu hóa mã lý do |

### 4.3 Number Sequence APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/foundation/number-sequences` | Lấy cấu hình sequence |
| POST | `/api/v1/foundation/number-sequences` | Tạo sequence mới |
| PUT | `/api/v1/foundation/number-sequences/:id` | Cập nhật sequence |

### 4.4 Governance APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/foundation/rules` | Lấy business rules |
| POST | `/api/v1/foundation/rules` | Tạo rule mới |
| PUT | `/api/v1/foundation/rules/:id` | Cập nhật rule |
| GET | `/api/v1/foundation/decision-logs` | Lấy decision logs |

### 4.5 Log APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/foundation/audit-logs` | Lấy audit logs (hỗ trợ pagination) |
| GET | `/api/v1/foundation/exception-logs` | Lấy exception logs |
| POST | `/api/v1/foundation/exception-logs/:id/resolve` | Đánh dấu đã xử lý |

---

## 5. Shared UI Components

Module sử dụng các shared components:

- `Button` - Nút bấm với variants: primary, secondary, ghost, outline
- `Modal` - Dialog modal với header, body, footer
- `Table` - Bảng dữ liệu với header, body, pagination
- `Input` - Ô nhập liệu với label, error, hint
- `Select` - Dropdown chọn với options
- `Textarea` - Ô nhập nhiều dòng
- `Switch` - Toggle on/off
- `Badge` - Nhãn trạng thái với variants: success, warning, danger, info
- `SearchInput` - Ô tìm kiếm với icon và clear button
- `Tabs` - Tab navigation
- `Spinner`, `PageLoader` - Loading states
- `EmptyState` - Hiển thị khi không có dữ liệu

---

## 6. Design System

### 6.1 Màu sắc

| Tên | Hex | Sử dụng |
|-----|-----|---------|
| Primary | `#3a4de5` | Buttons, links, active states |
| Navy | `#2d3444` | Text, borders |
| Success | `#14b8aa` | Trạng thái thành công |
| Warning | `#f59e0b` | Cảnh báo |
| Danger | `#ef4444` | Lỗi, xóa |

### 6.2 Typography

- Font family: Inter, Be Vietnam Pro
- Headings: font-semibold, text-navy-900
- Body: text-navy-700
- Muted: text-navy-500

### 6.3 Spacing & Border Radius

- Border radius: `rounded-xl` (12px), `rounded-2xl` (16px)
- Card shadow: `shadow-card`
- Padding: `p-4`, `p-5`, `p-6`

---

## 7. Lưu ý khi phát triển

1. **Idempotency**: Các API POST/PUT tự động gửi header `Idempotency-Key`
2. **Auth bypass**: Development mode sử dụng header `x-user-code: admin`
3. **Warehouse scope**: Header `x-warehouse-code` được gửi nếu có
4. **Toast notifications**: Sử dụng `react-hot-toast` cho feedback
5. **Form validation**: Sử dụng `zod` schema với `react-hook-form`
6. **API state**: Quản lý bằng `@tanstack/react-query`

---

## 8. Routes

| Path | Page | Mô tả |
|------|------|-------|
| `/settings` | Redirect | Chuyển về `/settings/roles` |
| `/settings/roles` | RolesPage | Quản lý vai trò |
| `/settings/permissions` | PermissionsPage | Danh mục quyền |
| `/settings/reason-codes` | ReasonCodesPage | Mã lý do |
| `/settings/number-sequences` | NumberSequencesPage | Number Sequence |
| `/settings/governance` | GovernancePage | Business Rules & Decision Logs |
| `/settings/logs` | LogsPage | Audit & Exception Logs |

---

## 9. Changelog

### v1.0.0 (2026-03-08)
- Initial release
- Implemented 6 settings pages for Module 1 Foundation
- Full CRUD support for Roles, Reason Codes, Number Sequences, Business Rules
- Read-only views for Permissions, Decision Logs
- Audit and Exception logs with filtering and pagination
- Permission assignment modal for roles
