# Module 1 - Foundation FE Report

## 1. Mục tiêu frontend

Frontend Module 1 cung cấp lớp quản trị nền cho:
- role / permission
- reason code
- number sequence
- governance rules
- audit logs / exception logs

Mục tiêu của phần FE là cung cấp giao diện quản trị, tra cứu và vận hành an toàn cho các cấu phần nền tảng mà Module 2, 3 và các module downstream sẽ sử dụng.

---

## 2. Những gì đã làm

### 2.1 Routing và layout
- Đã dựng nhóm route dưới `/app/settings/*`
- Đã có `SettingsLayout` cho điều hướng nội bộ module
- Đã tích hợp module vào app shell/sidebar

### 2.2 Pages đã có
- `RolesPage`
- `PermissionsPage`
- `ReasonCodesPage`
- `NumberSequencesPage`
- `GovernancePage`
- `LogsPage`

### 2.3 Features / modal đã có
- `RoleFormModal`
- `AssignPermissionModal`
- `ReasonCodeFormModal`
- `NumberSequenceFormModal`
- `RuleFormModal`

### 2.4 Data layer
- Đã có `domains/auth/api/auth.api.js`
- Đã có React Query hooks cho roles, permissions, reason codes, number sequences, governance, logs
- Đã bổ sung mock mode qua `foundationMockApi`
- Có thể bật mock bằng biến môi trường:

```env
VITE_USE_MOCK_API=true
```

---

## 3. Mock-data đã tạo

### 3.1 Nhóm dữ liệu mock
- permissions
- roles
- reason codes
- number sequences
- governance rules
- decision logs
- audit logs
- exception logs

### 3.2 Hành vi mock hỗ trợ
- list data cho tất cả page chính
- create / update cho role, reason code, number sequence, rule
- assign permission cho role
- resolve exception log
- pagination cho audit logs và exception logs

### 3.3 Nguồn tham chiếu
Mock được suy ra từ:
- `backend/docs/module-1-foundation.md`
- `docs/report/module-1-report.md`
- contract đang được FE hooks consume

---

## 4. Mapping với UI hiện tại

| Trang | Data mock đã hỗ trợ | Ghi chú |
|---|---|---|
| Roles | Có | Hỗ trợ list, create, update, assign permission |
| Permissions | Có | Hỗ trợ list/search/module grouping |
| Reason Codes | Có | Hỗ trợ list, create, update, deactivate |
| Number Sequences | Có | Hỗ trợ list, create, update, next number |
| Governance | Có | Hỗ trợ rules + decision logs |
| Logs | Có | Hỗ trợ audit logs, exception logs, resolve |

---

## 5. File frontend liên quan

### 5.1 Mock layer mới
- `src/mocks/foundation.mock.js`
- `src/mocks/utils.js`

### 5.2 API client đã nối mock
- `src/domains/auth/api/auth.api.js`

### 5.3 Hạ tầng build
- `vite.config.js` đã thêm alias `@mocks`

---

## 6. Điểm còn mở

- Chưa có mock riêng cho user-role assignment flow hoàn chỉnh ngoài API placeholder
- Chưa có report riêng mô tả chi tiết từng modal field như tài liệu FE spec
- Chưa chạy verify build/runtime sau khi nối mock mode

---

## 7. Kết luận

Frontend Module 1 hiện đã có mock-data đủ để demo và kiểm thử các page nền tảng chính mà không phụ thuộc backend runtime. Đây là lớp nền để các module nghiệp vụ phía sau có thể sử dụng governance, reason code, sequence và log flows trong quá trình review giao diện.
