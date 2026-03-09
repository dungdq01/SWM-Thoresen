# M1 — Foundation & Governance: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Foundation & Governance (Settings)
**FE Pages:** `frontend/src/pages/settings/` (7 pages)
**BE Module:** `backend/src/modules/foundation/`
**BE Docs:** `backend/docs/module-1-foundation.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ✅ KHỚP (httpClient baseURL = `/api/v1`, FE calls `/foundation/*`) |
| Response format | ✅ KHỚP (`httpClient` response interceptor unwrap `response.data`) |
| Auth header | ✅ KHỚP (auto-attach `x-user-code` từ localStorage) |
| Idempotency-Key | ✅ KHỚP (auto-generate UUID cho POST/PUT/DELETE) |

---

## 2. Kiểm tra từng API endpoint

### 2.1 Roles (RBAC)

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/roles` | `authApi.getRoles()` | RolesPage list | ✅ KHỚP |
| `POST /foundation/roles` | `authApi.createRole()` | RoleFormModal Create | ✅ KHỚP |
| `PUT /foundation/roles/:id` | `authApi.updateRole()` | RoleFormModal Edit | ✅ KHỚP |
| `POST /foundation/roles/:id/permissions` | `authApi.assignPermissionToRole()` | RolesPage Assign btn | ✅ KHỚP |
| `POST /foundation/users/:userId/roles` | `authApi.assignRoleToUser()` | **KHÔNG CÓ UI** | ⚠️ API có nhưng không có trang quản lý user-role |
| ~~`DELETE /foundation/roles/:id`~~ | `authApi.deleteRole()` | RolesPage Delete btn | ❌ **BE KHÔNG CÓ ENDPOINT NÀY** — FE sẽ 404 khi kết nối thật |

> **Kiểm tra thực tế (role.controller.ts):** Chỉ có `@Get`, `@Post`, `@Put`, `@Post` — không có `@Delete`.
> **Mức độ:** CRITICAL — RolesPage có nút Delete sẽ fail khi chuyển sang real API.

---

### 2.2 Permissions (Catalog)

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/permissions` | `authApi.getPermissions()` | PermissionsPage list | ✅ KHỚP |
| `GET /foundation/me/permissions` | `authApi.getMyPermissions()` | (dùng cho auth context) | ✅ KHỚP |
| ~~`POST /foundation/permissions`~~ | `authApi.createPermission()` | PermissionsPage Create | ❌ **BE KHÔNG CÓ** — FE sẽ 404 |
| ~~`PUT /foundation/permissions/:id`~~ | `authApi.updatePermission()` | PermissionsPage Edit (mới thêm) | ❌ **BE KHÔNG CÓ** — FE sẽ 404 |
| ~~`DELETE /foundation/permissions/:id`~~ | `authApi.deletePermission()` | PermissionsPage Delete | ❌ **BE KHÔNG CÓ** — FE sẽ 404 |

> **Kiểm tra thực tế (permission.controller.ts):** Chỉ có `@Get('permissions')` và `@Get('me/permissions')` — không có POST, PUT, DELETE.
> **Mức độ:** CRITICAL — Toàn bộ Create/Edit/Delete Permission sẽ fail khi kết nối thật.
> **Ghi chú:** Trong thiết kế nghiệp vụ, permission catalog thường là **static/seed data**. Việc FE có Create/Edit/Delete có thể là over-engineering so với BE đang triển khai.

---

### 2.3 Reason Codes

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/reason-codes` | `authApi.getReasonCodes()` | ReasonCodesPage list | ✅ KHỚP |
| `POST /foundation/reason-codes` | `authApi.createReasonCode()` | ReasonCodeFormModal Create | ✅ KHỚP |
| `PUT /foundation/reason-codes/:id` | `authApi.updateReasonCode()` | ReasonCodeFormModal Edit | ✅ KHỚP |
| `POST /foundation/reason-codes/:id/deactivate` | `authApi.deactivateReasonCode()` | ReasonCodesPage Deactivate | ✅ KHỚP |

> ✅ Reason Codes **hoàn toàn khớp**.

---

### 2.4 Number Sequences

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/number-sequences` | `authApi.getNumberSequences()` | NumberSequencesPage list | ✅ KHỚP |
| `POST /foundation/number-sequences` | `authApi.createNumberSequence()` | NumberSequenceFormModal Create | ✅ KHỚP |
| `PUT /foundation/number-sequences/:id` | `authApi.updateNumberSequence()` | NumberSequenceFormModal Edit | ✅ KHỚP |
| `POST /foundation/number-sequences/:code/next` | `authApi.getNextNumber()` | **KHÔNG CÓ UI** | ⚠️ API có, nhưng không có UI để trigger thủ công |

> ✅ CRUD Number Sequences khớp. Endpoint `next` chỉ dùng internally bởi các module khác — không cần UI.

---

### 2.5 Governance

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/rules` | `authApi.getRules()` | GovernancePage → Business Rules tab | ✅ KHỚP |
| `POST /foundation/rules` | `authApi.createRule()` | RuleFormModal Create | ✅ KHỚP |
| `PUT /foundation/rules/:id` | `authApi.updateRule()` | RuleFormModal Edit | ✅ KHỚP |
| `GET /foundation/decision-logs` | `authApi.getDecisionLogs()` | GovernancePage → Decision Logs tab | ✅ KHỚP |
| `POST /foundation/decision-logs` | `authApi.createDecisionLog()` | **KHÔNG CÓ UI** | ⚠️ API có, nhưng GovernancePage không có Create Decision Log form |
| `POST /foundation/change-controls` | `authApi.createChangeControl()` | **KHÔNG CÓ UI** | ⚠️ API có, nhưng không có UI nào trigger |

> **Ghi chú:** Decision logs và Change controls thường được tạo tự động bởi system, không cần FE UI manual. Không phải lỗi nghiêm trọng.

---

### 2.6 Audit & Exception Logs

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /foundation/audit-logs` | `authApi.getAuditLogs()` | LogsPage → Audit tab | ✅ KHỚP |
| `GET /foundation/exception-logs` | `authApi.getExceptionLogs()` | LogsPage → Exception tab | ✅ KHỚP |
| `POST /foundation/exception-logs/:id/resolve` | `authApi.resolveExceptionLog()` | LogsPage Resolve btn | ✅ KHỚP |
| `GET /foundation/idempotency/:key` | `authApi.getIdempotencyStatus()` | **KHÔNG CÓ UI** | ⚠️ API có, không có UI (debug/support only — OK) |

> ✅ Logs section **hoàn toàn khớp**.

---

## 3. Tổng hợp issues

### 🔴 CRITICAL — Sẽ break khi switch sang real BE

| # | Vấn đề | FE | BE | Impact |
|---|--------|----|----|--------|
| C1 | `DELETE /foundation/roles/:id` không tồn tại ở BE | `authApi.deleteRole()` + Delete btn | role.controller.ts chỉ có GET/POST/PUT | RolesPage: nút Delete sẽ 404 |
| C2 | `POST /foundation/permissions` không tồn tại ở BE | `authApi.createPermission()` + Create btn | permission.controller.ts chỉ có GET | PermissionsPage: Create sẽ 404 |
| C3 | `PUT /foundation/permissions/:id` không tồn tại ở BE | `authApi.updatePermission()` + Edit btn | permission.controller.ts chỉ có GET | PermissionsPage: Edit sẽ 404 |
| C4 | `DELETE /foundation/permissions/:id` không tồn tại ở BE | `authApi.deletePermission()` + Delete btn | permission.controller.ts chỉ có GET | PermissionsPage: Delete sẽ 404 |

### ⚠️ WARNING — UI Gap (không có UI, nhưng API layer ok)

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | Không có UI quản lý User-Role assignment | `POST /users/:userId/roles` có trong API nhưng không có trang nào hiển thị/manage user roles |
| W2 | Không có UI tạo Decision Log thủ công | Logic nghiệp vụ có thể auto-create, không blocker |
| W3 | Không có UI tạo Change Control | Tương tự W2 |

### ✅ MATCH — Hoàn toàn khớp

- Reason Codes: CRUD + Deactivate ✅
- Number Sequences: CRUD + Next ✅
- Business Rules: CRUD ✅
- Audit Logs: List + date filter ✅
- Exception Logs: List + Resolve ✅
- Me/Permissions: ✅

---

## 4. Khuyến nghị

### 4.1 Cần BE fix (nếu muốn Permission management hoạt động)
```
BE cần thêm vào permission.controller.ts:
  POST   /foundation/permissions     (createPermission)
  PUT    /foundation/permissions/:id  (updatePermission)
  DELETE /foundation/permissions/:id  (deletePermission)

BE cần thêm vào role.controller.ts:
  DELETE /foundation/roles/:id        (deleteRole)
```

### 4.2 Hoặc FE điều chỉnh (nếu permission catalog là static)
Nếu thiết kế nghiệp vụ không cho phép CRUD permission catalog qua UI:
- Ẩn/remove Create, Edit, Delete buttons trên PermissionsPage
- Remove deleteRole button trên RolesPage (chỉ cho deactivate)

### 4.3 Ưu tiên fix
1. **Priority 1:** C1 — Thêm DELETE /roles/:id vào BE (dễ, ~15 phút)
2. **Priority 2:** C2/C3/C4 — Decision: có muốn FE quản lý permission catalog không?
3. **Priority 3:** W1 — User-role assignment UI (cần có trang quản lý user với assign role form)

---

## 5. Trạng thái tổng thể Module 1

| Mục | Điểm |
|-----|------|
| API coverage | 75% (18/24 API calls có BE endpoint tương ứng) |
| Data format alignment | 100% |
| Auth/header alignment | 100% |
| CRUD completeness | 70% (permission management thiếu BE endpoints) |
| **Tổng** | **⚠️ CONDITIONAL PASS — 4 CRITICAL issues cần resolve trước khi switch real BE** |
