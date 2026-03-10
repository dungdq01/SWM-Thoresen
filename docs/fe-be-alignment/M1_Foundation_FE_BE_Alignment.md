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

### 2.7 Dropdown Config (thuộc Master Data BE, nhưng FE nằm trong Settings)

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/dropdown-configs` | `masterDataApi.getDropdownConfigList()` | DropdownConfigPage list | ✅ KHỚP |
| `POST /master-data/dropdown-configs` | `masterDataApi.createDropdownConfig()` | DropdownConfigPage Create | ✅ KHỚP |
| `GET /master-data/dropdown-configs/:id` | — | — | ⚠️ BE có, FE không dùng |
| `PUT /master-data/dropdown-configs/:id` | `masterDataApi.updateDropdownConfig()` | DropdownConfigPage Edit | ✅ KHỚP |
| `DELETE /master-data/dropdown-configs/:id` | `masterDataApi.deleteDropdownConfig()` | DropdownConfigPage Delete | ✅ KHỚP |
| `POST /master-data/dropdown-configs/:id/set-default` | `masterDataApi.setDefaultDropdownConfig()` | DropdownConfigPage Set Default | ✅ KHỚP |
| `GET /master-data/dropdown-configs/entities` | `masterDataApi.getDropdownConfigEntities()` | DropdownConfigPage entity filter | ✅ KHỚP |
| `GET /master-data/dropdown-configs/fields` | `masterDataApi.getDropdownConfigFields()` | DropdownConfigPage field filter | ✅ KHỚP |

> ✅ DropdownConfig **hoàn toàn khớp**. BE controller `dropdown-config.controller.ts` đã implement đầy đủ.

---

### 2.8 System Parameters

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| — | `authApi.getSystemParameters()` | SystemParametersPage list | ❌ **BE KHÔNG CÓ ENDPOINT** — FE dùng mock |
| — | `authApi.updateSystemParameter()` | SystemParametersPage Edit/Toggle | ❌ **BE KHÔNG CÓ ENDPOINT** — FE dùng mock |

> ❌ SystemParameters **chưa có BE**. FE page hoàn chỉnh nhưng hoàn toàn dựa trên mock data.

---

### 2.9 FE Pages thiếu Route

| FE Page | Exported | Route | Ghi chú |
|---------|----------|-------|---------|
| `DropdownConfigPage` | ✅ | ❌ Chưa có route | Cần thêm `/app/settings/dropdown-config` |
| `SystemParametersPage` | ✅ | ❌ Chưa có route | Cần thêm `/app/settings/system-parameters` |

---

## 3. Tổng hợp issues (CẬP NHẬT 2026-03-11)

### 🔴 CRITICAL — Sẽ break khi switch sang real BE

| # | Vấn đề | FE | BE | Impact |
|---|--------|----|----|--------|
| C1 | `DELETE /foundation/roles/:id` không tồn tại ở BE | `authApi.deleteRole()` | role.controller.ts chỉ có GET/POST/PUT | RolesPage: nút Delete sẽ 404 |
| ~~C2~~ | ~~`POST /foundation/permissions`~~ | — | — | **ĐÃ FIX**: FE PermissionsPage hiện là **Read-only** (không có Create/Edit/Delete buttons) |
| ~~C3~~ | ~~`PUT /foundation/permissions/:id`~~ | — | — | **ĐÃ FIX**: Xem C2 |
| ~~C4~~ | ~~`DELETE /foundation/permissions/:id`~~ | — | — | **ĐÃ FIX**: Xem C2 |
| C5 | SystemParameters chưa có BE endpoints | `authApi.getSystemParameters()`, `updateSystemParameter()` | Không có controller | SystemParametersPage sẽ fail khi switch real BE |

### ⚠️ WARNING — UI Gap / Missing Routes

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | Không có UI quản lý User-Role assignment | `POST /users/:userId/roles` có API nhưng không có trang UI |
| W2 | Không có UI tạo Decision Log thủ công | Auto-create, không blocker |
| W3 | Không có UI tạo Change Control | Tương tự W2 |
| W4 | DropdownConfigPage chưa có route | Exported nhưng chưa trong routes.jsx |
| W5 | SystemParametersPage chưa có route | Exported nhưng chưa trong routes.jsx |

### ✅ MATCH — Hoàn toàn khớp

- Reason Codes: CRUD + Deactivate ✅
- Number Sequences: CRUD + Next ✅
- Business Rules: CRUD ✅
- Audit Logs: List + date filter ✅
- Exception Logs: List + Resolve ✅
- Me/Permissions: ✅ (FE read-only, BE read-only → khớp)
- **DropdownConfig: Full CRUD + Set Default ✅** *(mới)*

---

## 4. Khuyến nghị (CẬP NHẬT 2026-03-11)

### 4.1 Cần BE thêm
```
1. role.controller.ts: DELETE /foundation/roles/:id (deleteRole)
2. Tạo system-parameter.controller.ts:
   GET  /foundation/system-parameters
   PUT  /foundation/system-parameters/:id
```

### 4.2 Cần FE thêm routes
```
routes.jsx cần thêm:
  /app/settings/dropdown-config   → DropdownConfigPage
  /app/settings/system-parameters → SystemParametersPage
```

### 4.3 Ưu tiên fix
1. **Priority 1:** C1 — Thêm DELETE /roles/:id vào BE (~15 phút)
2. **Priority 2:** C5 — Tạo SystemParameter CRUD trong BE (~2h)
3. **Priority 3:** W4/W5 — Thêm routes cho 2 trang mới (~5 phút)
4. **Priority 4:** W1 — User-role assignment UI (larger scope)

---

## 5. Trạng thái tổng thể Module 1 (CẬP NHẬT 2026-03-11)

| Mục | Điểm |
|-----|------|
| FE Pages | 9 pages + 1 layout (tăng từ 7 → 9: +DropdownConfig, +SystemParams) |
| API coverage | 85% — DropdownConfig ✅ khớp BE, SystemParams ❌ chưa có BE |
| Data format alignment | 100% |
| Auth/header alignment | 100% |
| CRUD completeness | 80% — Permissions OK (read-only khớp), chỉ còn Roles DELETE + SystemParams |
| Missing routes | 2 (DropdownConfig, SystemParameters) |
| **Tổng** | **⚠️ CONDITIONAL PASS — 2 CRITICAL issues (C1, C5) + 2 missing routes** |
