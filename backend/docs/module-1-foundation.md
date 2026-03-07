# Module 1 - foundation

## 1. Module này để làm gì?
`foundation` là module nền của backend SWMS TVL.

Module này không xử lý nghiệp vụ nhập, xuất, tồn kho trực tiếp. Thay vào đó nó cung cấp các năng lực dùng chung để các module khác gọi vào:
- quản lý role và permission
- gán role cho user theo scope warehouse
- tra cứu effective permission của user hiện tại
- quản lý reason code dùng chung
- quản lý number sequence và cấp số chứng từ
- quản lý business rule catalog
- quản lý decision log và change control
- truy vấn audit log, exception log, idempotency record

## 2. Folder code chính của module
```text
backend/src/modules/foundation/
├── controllers/
│   ├── role.controller.ts
│   ├── permission.controller.ts
│   ├── reason-code.controller.ts
│   ├── number-sequence.controller.ts
│   ├── governance.controller.ts
│   └── log.controller.ts
├── dto/
│   ├── role.dto.ts
│   ├── permission.dto.ts
│   ├── reason-code.dto.ts
│   ├── number-sequence.dto.ts
│   ├── governance.dto.ts
│   ├── log.dto.ts
│   └── index.ts
├── repositories/
│   ├── user.repository.ts
│   ├── permission.repository.ts
│   ├── role.repository.ts
│   ├── reason-code.repository.ts
│   ├── number-sequence.repository.ts
│   ├── governance.repository.ts
│   └── log.repository.ts
├── services/
│   ├── authorization.service.ts
│   ├── idempotency.service.ts
│   ├── log.service.ts
│   ├── permission.service.ts
│   ├── role.service.ts
│   ├── reason-code.service.ts
│   ├── number-sequence.service.ts
│   └── governance.service.ts
└── foundation.module.ts
```

## 3. Các thành phần dùng chung mà module dựa vào
- `backend/src/common/guards/auth.guard.ts`
- `backend/src/common/guards/permission.guard.ts`
- `backend/src/common/decorators/permission.decorator.ts`
- `backend/src/common/decorators/current-user.decorator.ts`
- `backend/src/common/decorators/public.decorator.ts`
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/interceptors/response.interceptor.ts`
- `backend/src/infrastructure/prisma/prisma.module.ts`
- `backend/src/infrastructure/prisma/prisma.service.ts`

## 4. Nguyên tắc response chung
Tất cả API thành công đều được wrap bởi `ResponseInterceptor` theo dạng:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-03-08T03:00:00.000Z",
    "requestId": "..."
  }
}
```

Lỗi được wrap bởi `HttpExceptionFilter` theo dạng:

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Không tìm thấy role với id ..."
  },
  "meta": {
    "timestamp": "2026-03-08T03:00:00.000Z",
    "path": "/api/v1/foundation/roles/...",
    "requestId": "..."
  }
}
```

## 5. Auth, permission và idempotency đang hoạt động ra sao?
### Auth
- Mặc định hệ thống dùng `AuthGuard`.
- Nếu `DEV_AUTH_BYPASS=true` **và `NODE_ENV !== 'production'`**, backend đọc user từ header `x-user-code`, nếu không có sẽ mặc định là `admin`.
- **Lưu ý bảo mật (HI-2):** DEV_AUTH_BYPASS sẽ bị bỏ qua trong production để tránh rủi ro bảo mật.
- Nếu tắt bypass, backend yêu cầu `Authorization: Bearer <token>` và token phải có `userCode`.

### Permission
- Mỗi endpoint gắn `@Permission(...)`.
- `PermissionGuard` đọc permission effective từ user hiện tại.
- **DENY effect (CR-1):** Nếu role có DENY permission, permission đó sẽ bị loại khỏi effective permissions.
- Nếu request có header `x-warehouse-code`, guard sẽ check warehouse scope của user.
- **Owner scope (CR-2):** Nếu request có header `x-owner-id` và user có `ownerScopes`, guard sẽ check owner scope.

### Idempotency
- Các command API chính hỗ trợ header `Idempotency-Key`.
- Nếu cùng key nhưng khác payload, backend trả `409 Conflict`.
- Nếu cùng key và đã thành công trước đó, backend trả lại response đã cache trong `idempotency_record`.

## 6. Danh sách API thực tế

---

## 6.1 RBAC APIs

### `GET /api/v1/foundation/roles`
- **Để làm gì**
  - Lấy danh sách role hiện có.
- **Query params**
  - `isActive`
  - `roleCode`
- **Permission cần có**
  - `foundation.roles.view`
- **File code tham gia**
  - `controllers/role.controller.ts`
  - `services/role.service.ts`
  - `repositories/role.repository.ts`
- **Response data chính**
```json
[
  {
    "id": "uuid",
    "roleCode": "ADMIN",
    "roleName": "Administrator",
    "description": "Quản trị toàn bộ module foundation",
    "isActive": true,
    "permissions": [
      {
        "permission": {
          "permissionCode": "foundation.roles.view"
        }
      }
    ]
  }
]
```

### `POST /api/v1/foundation/roles`
- **Để làm gì**
  - Tạo role mới.
- **Permission cần có**
  - `foundation.roles.create`
- **Header nên có**
  - `Idempotency-Key`
- **Body**
```json
{
  "roleCode": "YARD_SUPERVISOR",
  "roleName": "Yard Supervisor",
  "description": "Giám sát bãi"
}
```
- **File code tham gia**
  - `controllers/role.controller.ts`
  - `services/role.service.ts`
  - `services/idempotency.service.ts`
  - `services/log.service.ts`
  - `repositories/role.repository.ts`
  - `repositories/log.repository.ts`
- **Response data chính**
```json
{
  "id": "uuid",
  "roleCode": "YARD_SUPERVISOR",
  "roleName": "Yard Supervisor",
  "description": "Giám sát bãi",
  "isActive": true
}
```

### `PUT /api/v1/foundation/roles/:id`
- **Để làm gì**
  - Cập nhật metadata role.
- **Permission cần có**
  - `foundation.roles.update`
- **Header nên có**
  - `Idempotency-Key`
- **Body**
```json
{
  "roleName": "Yard Supervisor Updated",
  "description": "Giám sát bãi cập nhật",
  "isActive": true
}
```
- **Response data chính**
  - object role sau cập nhật.

### `POST /api/v1/foundation/roles/:id/permissions`
- **Để làm gì**
  - Gán hoặc cập nhật permission cho role.
- **Permission cần có**
  - `foundation.roles.assign_permission`
- **Header nên có**
  - `Idempotency-Key`
- **Body**
```json
{
  "changes": [
    {
      "permissionCode": "foundation.rules.view",
      "effect": "ALLOW"
    }
  ]
}
```
- **Response data chính**
  - role kèm danh sách permission sau khi gán.

### `GET /api/v1/foundation/permissions`
- **Để làm gì**
  - Lấy catalog permission active.
- **Permission cần có**
  - `foundation.permissions.view`
- **Query params**
  - `moduleCode`
  - `resourceCode`
- **File code tham gia**
  - `controllers/permission.controller.ts`
  - `services/permission.service.ts`
  - `repositories/permission.repository.ts`

### `POST /api/v1/foundation/users/:userId/roles`
- **Để làm gì**
  - Gán role cho user.
- **Permission cần có**
  - `foundation.users.assign_role`
- **Header nên có**
  - `Idempotency-Key`
- **Body**
```json
{
  "roleCode": "GOVERNANCE_MANAGER",
  "warehouseCode": "WH5.1",
  "ownerId": null,
  "isPrimary": true
}
```
- **Response data chính**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "roleId": "uuid",
  "warehouseCode": "WH5.1",
  "isPrimary": true,
  "role": {
    "roleCode": "GOVERNANCE_MANAGER"
  }
}
```

### `GET /api/v1/foundation/me/permissions`
- **Để làm gì**
  - Trả về effective permissions, role codes, warehouse scopes, owner scopes của user hiện tại.
- **Permission cần có**
  - `foundation.permissions.me.view`
- **Response data chính**
```json
{
  "roleCodes": ["ADMIN"],
  "warehouseScopes": ["WH5.1"],
  "ownerScopes": [],
  "permissionCodes": ["foundation.roles.view", "foundation.rules.view"]
}
```

---

## 6.2 Reason code APIs

### `GET /api/v1/foundation/reason-codes`
- **Để làm gì**
  - Lấy danh sách reason code theo domain/category/trạng thái active.
- **Permission cần có**
  - `foundation.reason_codes.view`
- **Query params**
  - `domainCode`
  - `category`
  - `isActive`

### `POST /api/v1/foundation/reason-codes`
- **Để làm gì**
  - Tạo reason code mới.
- **Permission cần có**
  - `foundation.reason_codes.create`
- **Header nên có**
  - `Idempotency-Key`
- **Body**
```json
{
  "code": "MANUAL_ADJUST",
  "description": "Điều chỉnh thủ công",
  "category": "ADJUSTMENT",
  "domainCode": "FOUNDATION",
  "requiresApproval": true,
  "affectsBilling": false,
  "requiresNote": true,
  "sortOrder": 1
}
```

### `PUT /api/v1/foundation/reason-codes/:id`
- **Để làm gì**
  - Sửa metadata reason code.
- **Permission cần có**
  - `foundation.reason_codes.update`

### `POST /api/v1/foundation/reason-codes/:id/deactivate`
- **Để làm gì**
  - Soft deactivate reason code.
- **Permission cần có**
  - `foundation.reason_codes.deactivate`

- **File code tham gia cho nhóm reason code**
  - `controllers/reason-code.controller.ts`
  - `services/reason-code.service.ts`
  - `services/idempotency.service.ts`
  - `services/log.service.ts`
  - `repositories/reason-code.repository.ts`
  - `repositories/log.repository.ts`

---

## 6.3 Number sequence APIs

### `GET /api/v1/foundation/number-sequences`
- **Để làm gì**
  - Xem cấu hình sequence hiện có.
- **Permission cần có**
  - `foundation.number_sequences.view`

### `POST /api/v1/foundation/number-sequences`
- **Để làm gì**
  - Tạo cấu hình sequence mới.
- **Permission cần có**
  - `foundation.number_sequences.create`
- **Body**
```json
{
  "sequenceCode": "ADJ",
  "description": "Adjustment sequence",
  "scopeType": "PER_WAREHOUSE",
  "resetPolicy": "DAILY",
  "prefixTemplate": "ADJ",
  "formatTemplate": "{prefix}-{yyyymmdd}-{running_no}",
  "runningNoLength": 6,
  "allowGap": true
}
```

### `PUT /api/v1/foundation/number-sequences/:id`
- **Để làm gì**
  - Cập nhật cấu hình sequence.
- **Permission cần có**
  - `foundation.number_sequences.update`

### `POST /api/v1/foundation/number-sequences/:code/next`
- **Để làm gì**
  - Cấp số tiếp theo cho sequence.
- **Permission cần có**
  - `foundation.number_sequences.next`
- **Body**
```json
{
  "scopeKey": "WH5.1"
}
```
- **Response data chính**
```json
{
  "sequenceCode": "RCV",
  "scopeKey": "WH5.1",
  "value": "RCV-20260308-000001",
  "runningNumber": 1,
  "counterDate": "2026-03-08"
}
```
- **File code tham gia**
  - `controllers/number-sequence.controller.ts`
  - `services/number-sequence.service.ts`
  - `services/idempotency.service.ts`
  - `services/log.service.ts`
  - `repositories/number-sequence.repository.ts`
  - `repositories/log.repository.ts`

---

## 6.4 Governance APIs

### `GET /api/v1/foundation/rules`
- **Để làm gì**
  - Lấy business rule catalog.
- **Permission cần có**
  - `foundation.rules.view`
- **Query params**
  - `domain`
  - `status`

### `POST /api/v1/foundation/rules`
- **Để làm gì**
  - Tạo business rule mới.
- **Permission cần có**
  - `foundation.rules.create`

### `PUT /api/v1/foundation/rules/:id`
- **Để làm gì**
  - Cập nhật business rule.
- **Permission cần có**
  - `foundation.rules.update`

### `GET /api/v1/foundation/decision-logs`
- **Để làm gì**
  - Lấy danh sách decision logs.
- **Permission cần có**
  - `foundation.decision_logs.view`

### `POST /api/v1/foundation/decision-logs`
- **Để làm gì**
  - Tạo decision log mới.
- **Permission cần có**
  - `foundation.decision_logs.create`

### `POST /api/v1/foundation/change-controls`
- **Để làm gì**
  - Tạo change control record mới.
- **Permission cần có**
  - `foundation.change_controls.create`

- **File code tham gia cho nhóm governance**
  - `controllers/governance.controller.ts`
  - `services/governance.service.ts`
  - `services/idempotency.service.ts`
  - `services/log.service.ts`
  - `repositories/governance.repository.ts`
  - `repositories/log.repository.ts`

---

## 6.5 Audit / exception / idempotency APIs

### `GET /api/v1/foundation/audit-logs`
- **Để làm gì**
  - Truy vấn audit log theo entity, entityId, correlationId, userId.
- **Permission cần có**
  - `foundation.audit_logs.view`

### `GET /api/v1/foundation/exception-logs`
- **Để làm gì**
  - Truy vấn exception logs theo source module hoặc trạng thái resolved.
- **Permission cần có**
  - `foundation.exception_logs.view`

### `POST /api/v1/foundation/exception-logs/:id/resolve`
- **Để làm gì**
  - Đánh dấu exception log đã được xử lý.
- **Permission cần có**
  - `foundation.exception_logs.resolve`

### `GET /api/v1/foundation/idempotency/:key`
- **Để làm gì**
  - Tra cứu trạng thái idempotency key cho support/debug.
- **Permission cần có**
  - `foundation.idempotency.view`

- **File code tham gia cho nhóm log**
  - `controllers/log.controller.ts`
  - `services/log.service.ts`
  - `services/idempotency.service.ts`
  - `repositories/log.repository.ts`

## 7. Seed data hiện có
Seed đang tạo sẵn:
- **Users:** `admin`, `gov_manager`
- **Roles go-live:** `ADMIN`, `GOVERNANCE_MANAGER`, `WH_MANAGER`, `WH_KEEPER`, `WB_OPERATOR`, `BILLING_OFC`, `OPS_SUPER`, `CUST_VIEWER`
- **Permission catalog:** cho toàn bộ API đã code
- **User-role assignment:** mẫu cho admin và gov_manager
- **Reason codes go-live:**
  - Inbound: `DAMAGED`, `SHORT_DELIVERY`, `OVER_DELIVERY`, `WRONG_ITEM`, `SCALE_CALIBRATION`, `DOCUMENTATION_ERROR`
  - Outbound: `CUSTOMER_REJECT`, `WEIGHT_MISMATCH`, `QUALITY_ISSUE`
  - Inventory: `CYCLE_COUNT_ADJUST`, `DAMAGE_WRITEOFF`, `STATUS_CHANGE`, `SHRINKAGE`
  - General: `OTHER`, `MANUAL_WEIGHT`, `MANUAL_ADJUST`, `DUPLICATE_RETRY`
- **Number sequences:** `RCV`, `SHP`, `WRK`, `TRX`, `DN`, `TRF`, `ADJ`
- **Business rule, decision log, change control record:** mẫu

## 8. Internal shared services cho module khác

Các module nghiệp vụ (Inbound, Outbound, Inventory, Billing) có thể inject và sử dụng các service sau từ `FoundationModule`:

### `AuthorizationService`
```typescript
// Resolve user info và effective permissions
const user = await authorizationService.resolveRequestUser(userCode);
// Assert user exists
await authorizationService.assertUserExists(userId);
```

### `ReasonCodeService`
```typescript
// Validate reason code trước khi dùng cho action nhạy cảm
const rc = await reasonCodeService.assertValid('DAMAGED', {
  domainCode: 'INBOUND',
  note: 'Hàng bị ướt',
});
// rc.requiresApproval, rc.affectsBilling, rc.requiresNote
```

### `NumberSequenceService`
```typescript
// Cấp số chứng từ
const ref = await numberSequenceService.getNextNumber('RCV', 'WH5.1', actorUserId);
// ref.value = 'RCV-20260308-000001'
```

### `GovernanceService`
```typescript
// Check rule baseline
const isConfirmed = await governanceService.isRuleConfirmedForGoLive('FG-BR-001');
const rule = await governanceService.getRuleByCode('FG-BR-001');
```

### `LogService`
```typescript
// Ghi audit log
await logService.createAuditLog({
  entityType: 'RECEIPT',
  entityId: receiptId,
  action: 'POST_RECEIPT',
  userId: actorUserId,
  sourceModule: 'INBOUND',
});
// Ghi exception log
await logService.createExceptionLog({
  exceptionType: 'TOLERANCE_FAIL',
  severity: 'HIGH',
  sourceModule: 'INBOUND',
  message: 'Weight tolerance exceeded',
});
```

### `IdempotencyService`
```typescript
// Wrap command với idempotency
const result = await idempotencyService.execute({
  commandName: 'POST_RECEIPT',
  idempotencyKey: externalId,
  requestPayload: payload,
  handler: async () => { /* execute command */ },
  actorUserId,
});
```

## 9. Những điểm FE / dev mới cần lưu ý
- Command API nên gửi thêm `Idempotency-Key` để an toàn retry.
- Khi chạy local, có thể dùng `DEV_AUTH_BYPASS=true` và gửi `x-user-code: admin`.
- Nếu thao tác có scope warehouse, có thể gửi `x-warehouse-code: WH5.1`.
- Nếu thao tác có scope owner (ví dụ: CUST_VIEWER), gửi `x-owner-id: <owner_id>`.
- Tất cả API thật đang nằm dưới prefix `/api/v1`.
- Dữ liệu role/permission của user hiện tại có thể bootstrap nhanh bằng `GET /api/v1/foundation/me/permissions`.
- **Audit logs và Exception logs API** hỗ trợ pagination (`page`, `limit`) và date range filter (`fromDate`, `toDate`).

## 10. Hướng dẫn chạy backend local

### Yêu cầu
- Node.js >= 18
- PostgreSQL đang chạy tại `localhost:5432`
- Database `swms` đã được tạo

### Các bước

```bash
# 1. Tạo database (nếu chưa có)
psql -U postgres -c "CREATE DATABASE swms;"

# 2. Cài dependencies (đã có postinstall tự chạy prisma generate)
cd backend
npm install

# 3. Chạy migration
npx prisma migrate dev --name init

# 4. Seed data mẫu
npm run prisma:seed

# 5. Khởi động backend
npm run start
# hoặc watch mode
npm run start:dev
```

### Test nhanh

```bash
# Health check (public)
curl http://localhost:3000/health

# Lấy roles (cần bypass auth)
curl -H "x-user-code: admin" http://localhost:3000/api/v1/foundation/roles

# Lấy permissions của user hiện tại
curl -H "x-user-code: admin" http://localhost:3000/api/v1/foundation/me/permissions
```

### Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `P1003: Database does not exist` | Database chưa được tạo | Chạy `CREATE DATABASE swms;` trong psql/pgAdmin |
| `P1001: Can't reach database` | PostgreSQL chưa chạy hoặc sai port | Kiểm tra PostgreSQL service và `DATABASE_URL` trong `.env` |
| `relation does not exist` | Chưa chạy migration | Chạy `npx prisma migrate dev` |

---

## 11. Changelog - Code Review Fixes (2026-03-08)

Các fix theo feedback từ `docs/feedback/fb_M01.md`:

### CRITICAL Fixes
| ID | Issue | File | Fix |
|---|---|---|---|
| CR-1 | DENY permission effect | `permission.repository.ts` | Implement DENY subtraction logic |
| CR-2 | Owner scope enforcement | `permission.guard.ts` | Thêm check `x-owner-id` header |
| CR-3 | Idempotency race condition | `idempotency.service.ts` | Insert-first pattern với P2002 error handling |
| CR-4 | PrismaService disconnect | `prisma.service.ts` | Thêm `onModuleDestroy()` |
| CR-5 | Timezone bug | `number-sequence.service.ts` | Dùng `Asia/Ho_Chi_Minh` timezone |

### HIGH Fixes
| ID | Issue | File | Fix |
|---|---|---|---|
| HI-1 | Missing pagination | `role.dto.ts`, `log.dto.ts`, `log.repository.ts`, `role.repository.ts` | Thêm `page`, `limit` cho tất cả list endpoints + implement skip/take |
| HI-2 | DEV_AUTH_BYPASS guard | `auth.guard.ts` | Thêm `NODE_ENV !== 'production'` check |
| HI-3 | Audit log transaction safety | `governance.service.ts` | Wrap CRUD + audit log trong Prisma `$transaction()` |
| HI-4 | Missing TRF/ADJ sequences | `seed.ts` | Thêm TRF, ADJ vào seed |
| HI-5 | Health check DB | `health.controller.ts` | Thêm `SELECT 1` query |
| HI-7 | Inactive permission | `permission.repository.ts` | Thêm `isActive: true` filter |

### MEDIUM Fixes
| ID | Issue | File | Fix |
|---|---|---|---|
| MD-8 | Date range filter | `log.dto.ts`, `log.repository.ts` | Thêm `fromDate`, `toDate` với filter trong repository |
