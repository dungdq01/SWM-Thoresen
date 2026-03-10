# Frontend Module 1 — Foundation & Governance

**Ngày:** 2026-03-10 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện quản lý nền tảng hệ thống: RBAC (Roles/Permissions), Reason Codes, Number Sequences, Governance records, Audit/Exception Logs, Dropdown Config.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/settings/roles` | `RolesPage` | Danh sách roles, CRUD, gán permissions |
| `/app/settings/permissions` | `PermissionsPage` | Danh sách permissions hệ thống |
| `/app/settings/reason-codes` | `ReasonCodesPage` | Quản lý reason codes cho các operation |
| `/app/settings/number-sequences` | `NumberSequencesPage` | Config format số tự động (PO, SO, WO...) |
| `/app/settings/governance` | `GovernancePage` | Business rules, decision logs, change control |
| `/app/settings/logs` | `LogsPage` | Audit logs + Exception logs |
| `/app/settings/dropdown-config` | `DropdownConfigPage` | Cấu hình các dropdown list cho Master Data (ownerGroup, cargoForm, warehouseType...) |

**Default redirect:** `/app/settings` → `/app/settings/roles`

## 3. Domain Layer

**Thư mục:** `src/domains/auth/`

| File | Nội dung |
|------|---------|
| `api/auth.api.js` | API calls: roles, permissions, reason codes, number sequences, governance, logs |
| `hooks/useRoles.js` | `useRoleList`, `useCreateRole`, `useUpdateRole`, `useDeleteRole` |
| `hooks/usePermissions.js` | `usePermissionList`, `useAssignPermission` |
| `hooks/useReasonCodes.js` | `useReasonCodeList`, `useCreateReasonCode`, `useUpdateReasonCode` |
| `hooks/useNumberSequences.js` | `useNumberSequenceList`, `useUpdateNumberSequence` |
| `hooks/useGovernance.js` | `useBusinessRules`, `useDecisionLogs`, `useChangeControl` |
| `hooks/useLogs.js` | `useAuditLogs`, `useExceptionLogs` (với pagination + date filter) |
| `model/constants.js` | Query keys cho TanStack Query |
| `components/StatusBadge.jsx` | Badge hiển thị active/inactive status |

**DropdownConfig domain:** `src/domains/master-data/hooks/useDropdownConfigs.js` — được dùng bởi `DropdownConfigPage`

## 4. Features

**Thư mục:** `src/features/settings/`

| Feature | File | Nội dung |
|---------|------|---------|
| Roles | `roles/RoleFormModal.jsx` | Create/Edit role với code + name |
| Roles | `roles/AssignPermissionModal.jsx` | Modal gán permission cho role |
| Reason Codes | `reason-codes/ReasonCodeFormModal.jsx` | Create/Edit reason code |
| Number Sequences | `number-sequences/NumberSequenceFormModal.jsx` | Edit number sequence config |
| Governance | `governance/RuleFormModal.jsx` | Create/Edit business rule |

## 5. Mock Data

**File:** `src/mocks/foundation.mock.js`

| Collection (localStorage) | Nội dung |
|--------------------------|---------|
| `swm_mock_roles` | 8 roles: WH_KEEPER, WH_MANAGER, WH_ADMIN, BILLING_OFC, CUST_VIEWER, ADMIN, WB_OPERATOR, OPS_SUPER |
| `swm_mock_permissions` | Danh sách permissions theo module |
| `swm_mock_reason_codes` | Reason codes cho ADJUSTMENT, REJECTION, APPROVAL |
| `swm_mock_number_sequences` | Config PO-XXXX, SO-XXXX, WO-XXXX, TR-XXXX |
| `swm_mock_governance` | Sample business rules + decision logs |
| `swm_mock_audit_logs` | 20+ sample audit entries |

**DropdownConfig mock** nằm trong `src/mocks/masterData.mock.js` (cùng file với master data).

## 6. Backend API Endpoints Wired

```
GET  /api/v1/foundation/roles
POST /api/v1/foundation/roles
PUT  /api/v1/foundation/roles/:id
DELETE /api/v1/foundation/roles/:id
GET  /api/v1/foundation/permissions
GET  /api/v1/foundation/me/permissions
GET  /api/v1/foundation/reason-codes
POST /api/v1/foundation/reason-codes
PUT  /api/v1/foundation/reason-codes/:id
GET  /api/v1/foundation/number-sequences
PUT  /api/v1/foundation/number-sequences/:id
GET  /api/v1/foundation/governance/rules
GET  /api/v1/foundation/logs/audit
GET  /api/v1/foundation/logs/exceptions

(DropdownConfig — xem BE-TODO-dropdown-config.md — BE chưa có, hiện dùng mock)
GET  /api/v1/master-data/dropdown-configs
POST /api/v1/master-data/dropdown-configs
PUT  /api/v1/master-data/dropdown-configs/:id
DELETE /api/v1/master-data/dropdown-configs/:id
POST /api/v1/master-data/dropdown-configs/:id/set-default
GET  /api/v1/master-data/dropdown-configs/entities
GET  /api/v1/master-data/dropdown-configs/fields
```

## 7. Ghi chú

- Settings pages sử dụng `SettingsLayout` riêng (không phải `MainLayout`)
- Auth bypass: `x-user-code: admin` hardcoded — cần thay bằng JWT trước go-live
- LogsPage hỗ trợ pagination + date range filter (query params)
- `DropdownConfigPage` — FE mock hoàn chỉnh; **BE chưa implement** (xem `docs/BE-TODO-dropdown-config.md`)
- DropdownConfig quản lý: `owner.ownerGroup`, `owner.ownerType`, `vendor.supplierGroup`, `item.cargoForm`, `item.productGroup`, `warehouse.warehouseType` — 22 values mặc định
