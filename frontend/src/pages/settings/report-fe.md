# Settings Pages: Language Standardization Report

## Overview
This report documents the language standardization changes made to the Settings pages, converting all Vietnamese UI text to English following the UX Language Guideline.

## Files Modified

### 1. SettingsLayout.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Section Title | Chi tiết vận hành | Operations Detail |
| Section Description | Danh sách, bảng biểu và các thao tác chuyên sâu nằm ở bên dưới. | Lists, tables, and advanced operations are displayed below. |

### 2. RolesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Page Title | Quản lý vai trò | Role Management |
| Button | Tạo vai trò | Create Role |
| Placeholder | Tìm theo mã hoặc tên vai trò... | Search by role code or name... |
| Table Headers | Mã vai trò, Tên vai trò, Mô tả, Số quyền, Trạng thái, Thao tác | Role Code, Role Name, Description, Permissions, Status, Actions |
| Empty Message | Không tìm thấy vai trò phù hợp / Chưa có vai trò nào | No matching roles found / No roles available |
| Tooltips | Phân quyền, Chỉnh sửa | Assign Permissions, Edit |

### 3. PermissionsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Page Title | Danh mục quyền | Permissions Catalog |
| Placeholder | Tìm theo mã hoặc mô tả quyền... | Search by permission code or description... |
| Select Option | Tất cả module | All modules |
| Counter | Tổng cộng: X quyền | Total: X permissions |
| Loading | Đang tải... | Loading... |
| Empty Message | Không tìm thấy quyền phù hợp | No matching permissions found |
| Table Headers | Mã quyền, Mô tả | Permission Code, Description |
| Fallback Group | Khác | Other |

### 4. ReasonCodesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Page Title | Quản lý mã lý do | Reason Code Management |
| Button | Tạo mã lý do | Create Reason Code |
| Placeholder | Tìm theo mã hoặc mô tả... | Search by code or description... |
| Select Option | Tất cả danh mục | All categories |
| Table Headers | Mã, Mô tả, Danh mục, Domain, Yêu cầu, Trạng thái, Thao tác | Code, Description, Category, Domain, Requirements, Status, Actions |
| Empty Message | Không tìm thấy mã lý do phù hợp / Chưa có mã lý do nào | No matching reason codes found / No reason codes available |
| Tooltips | Yêu cầu phê duyệt, Yêu cầu ghi chú, Ảnh hưởng thanh toán, Chỉnh sửa, Vô hiệu hóa | Requires Approval, Requires Note, Affects Billing, Edit, Deactivate |
| Confirm Dialog | Bạn có chắc muốn vô hiệu hóa mã lý do này? | Are you sure you want to deactivate this reason code? |

### 5. NumberSequencesPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Page Title | Quản lý Number Sequence | Number Sequence Management |
| Button | Tạo sequence | Create Sequence |
| Placeholder | Tìm theo mã hoặc mô tả... | Search by code or description... |
| Table Headers | Mã, Mô tả, Độ dài số, Thao tác | Code, Description, Number Length, Actions |
| Empty Message | Không tìm thấy sequence phù hợp / Chưa có sequence nào | No matching sequences found / No sequences available |
| Tooltip | Chỉnh sửa | Edit |

### 6. GovernancePage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Button | Tạo rule mới | Create Rule |
| Placeholder | Tìm theo mã hoặc tên rule... | Search by rule code or name... |
| Select Option | Tất cả domain | All domains |
| Table Headers (Rules) | Mã Rule, Tên Rule, Domain, Trạng thái, Mô tả, Thao tác | Rule Code, Rule Name, Domain, Status, Description, Actions |
| Empty Message (Rules) | Chưa có business rule nào | No business rules available |
| Placeholder | Tìm theo mã hoặc tiêu đề decision... | Search by decision code or title... |
| Table Headers (Decisions) | Mã Decision, Tiêu đề, Người quyết định, Ngày quyết định, Mô tả | Decision Code, Title, Decided By, Decision Date, Description |
| Empty Message (Decisions) | Chưa có decision log nào | No decision logs available |

### 7. LogsPage.jsx
| Element | Before (Vietnamese) | After (English) |
|---------|---------------------|-----------------|
| Placeholder | Lọc theo entity type... | Filter by entity type... |
| Table Headers (Audit) | Thời gian, Entity, Action, User, Module, Chi tiết | Timestamp, Entity, Action, User, Module, Details |
| Empty Message (Audit) | Không có audit log nào | No audit logs available |
| Select Options | Tất cả trạng thái, Chưa xử lý, Đã xử lý | All statuses, Unresolved, Resolved |
| Table Headers (Exception) | Thời gian, Loại Exception, Mức độ, Module, Message, Trạng thái, Thao tác | Timestamp, Exception Type, Severity, Module, Message, Status, Actions |
| Empty Message (Exception) | Không có exception log nào | No exception logs available |
| Tooltip | Đánh dấu đã xử lý | Mark as Resolved |
| Confirm Dialog | Đánh dấu exception này đã được xử lý? | Mark this exception as resolved? |

## Implementation Checklist

- [x] Page titles are English only
- [x] All button labels are English
- [x] Table headers are English
- [x] Form labels are English
- [x] Empty state messages are English
- [x] Filter placeholders are English
- [x] Select options are English
- [x] Tooltips are English
- [x] Confirm dialogs are English

## Summary

**Total Files Modified:** 7  
**Total Text Changes:** ~100+ translations  
**Completion Status:** ✅ Complete

All Vietnamese text in the Settings pages has been standardized to English following the UX Language Guideline established in `frontend/docs/UX_LANGUAGE_GUIDELINE.md`.
