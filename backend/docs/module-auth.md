# Module Auth - Backend API Documentation

**Module:** Authentication, Authorization & Session Control  
**Version:** 1.0.0  
**Last Updated:** 2026-03-09

---

## 1. Tổng quan

Module Auth là **security platform layer** của hệ thống SWM, cung cấp:

- **Authentication**: Xác thực user qua username/password với JWT
- **Session Management**: Quản lý session, refresh token rotation
- **Authorization**: Phân quyền RBAC với warehouse/owner scope
- **Security Control**: Lockout policy, password policy, audit logging

### Công nghệ sử dụng

| Component | Technology |
|-----------|------------|
| Password hashing | Argon2id |
| Token | JWT (HS256) |
| Session storage | PostgreSQL |
| Framework | NestJS |

---

## 2. Cấu trúc thư mục

```
src/modules/auth/
├── auth.module.ts              # Module definition
├── controllers/
│   ├── auth.controller.ts      # Login, logout, refresh
│   ├── profile.controller.ts   # User profile, warehouse selection
│   ├── session.controller.ts   # Session management
│   ├── password.controller.ts  # Password change
│   └── admin-auth.controller.ts # Admin security actions
├── services/
│   ├── authentication.service.ts # Core login/refresh logic
│   ├── session.service.ts        # Session create/revoke
│   ├── token.service.ts          # JWT sign/verify
│   ├── password-policy.service.ts # Password validation
│   ├── lockout.service.ts        # Account lockout
│   └── security-audit.service.ts # Security event logging
├── repositories/
│   ├── credential.repository.ts
│   ├── session.repository.ts
│   ├── refresh-token.repository.ts
│   ├── login-attempt.repository.ts
│   ├── password-history.repository.ts
│   ├── security-event.repository.ts
│   └── user-auth.repository.ts
├── dto/
│   ├── login.dto.ts
│   ├── refresh.dto.ts
│   ├── change-password.dto.ts
│   ├── select-warehouse.dto.ts
│   └── admin-auth.dto.ts
└── interfaces/
    └── security-context.interface.ts
```

---

## 3. API Endpoints

### 3.1. Authentication APIs

#### POST /api/v1/auth/login

**Mục đích:** Đăng nhập với username/password

**Request Body:**
```json
{
  "username": "admin",
  "password": "Admin@123",
  "channel": "WEB",
  "deviceId": "browser-uuid-123",
  "deviceName": "Chrome Windows"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ✅ | Username đăng nhập |
| password | string | ✅ | Mật khẩu |
| channel | enum | ✅ | WEB, MOBILE, API |
| deviceId | string | ❌ | ID thiết bị |
| deviceName | string | ❌ | Tên thiết bị |

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "sessionId": "uuid-session-id",
  "user": {
    "id": "uuid-user-id",
    "userCode": "admin",
    "username": "admin",
    "fullName": "System Admin",
    "roleCodes": ["ADMIN"],
    "mustChangePassword": false
  },
  "warehouseOptions": [
    { "id": "uuid", "code": "WH5.1", "name": "Kho 5.1 - Phú Mỹ" }
  ],
  "selectedWarehouseId": null
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| AUTH_INVALID_CREDENTIALS | Thông tin đăng nhập không chính xác |
| AUTH_ACCOUNT_INACTIVE | Tài khoản đã bị vô hiệu hóa |
| AUTH_ACCOUNT_LOCKED | Tài khoản đang bị khóa |

**Files:** `auth.controller.ts`, `authentication.service.ts`

---

#### POST /api/v1/auth/refresh

**Mục đích:** Làm mới access token bằng refresh token

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-refresh-token...",
  "expiresIn": 900,
  "sessionId": "uuid-session-id"
}
```

**Lưu ý:**
- Refresh token được rotate mỗi lần sử dụng
- Nếu phát hiện token replay → revoke toàn bộ session

**Error Responses:**
| Code | Message |
|------|---------|
| AUTH_REFRESH_INVALID | Refresh token không hợp lệ |
| AUTH_REFRESH_EXPIRED | Refresh token đã hết hạn |
| AUTH_REFRESH_REPLAY_DETECTED | Phát hiện sử dụng lại token |
| AUTH_SESSION_REVOKED | Session đã hết hiệu lực |

**Files:** `auth.controller.ts`, `authentication.service.ts`

---

#### POST /api/v1/auth/logout

**Mục đích:** Đăng xuất session hiện tại

**Headers:** `Authorization: Bearer <access_token>`

**Response:** 204 No Content

**Side Effects:**
- Session bị revoke
- Tất cả refresh tokens của session bị revoke
- Log security event LOGOUT

**Files:** `auth.controller.ts`, `session.service.ts`

---

#### POST /api/v1/auth/logout-all

**Mục đích:** Đăng xuất tất cả sessions của user

**Headers:** `Authorization: Bearer <access_token>`

**Response:** 204 No Content

**Side Effects:**
- Tất cả sessions bị revoke
- Log security event LOGOUT_ALL

**Files:** `auth.controller.ts`, `session.service.ts`

---

### 3.2. Profile & Context APIs

#### GET /api/v1/auth/me

**Mục đích:** Lấy thông tin profile user hiện tại

**Headers:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
{
  "id": "uuid-user-id",
  "userCode": "admin",
  "username": "admin",
  "fullName": "System Admin",
  "email": "admin@swms.local",
  "roleCodes": ["ADMIN"],
  "selectedWarehouseId": "uuid-warehouse",
  "warehouseOptions": [
    { "id": "uuid", "code": "WH5.1", "name": "Kho 5.1 - Phú Mỹ" }
  ],
  "ownerScope": [],
  "channel": "WEB",
  "mustChangePassword": false
}
```

**Files:** `profile.controller.ts`

---

#### GET /api/v1/auth/me/permissions

**Mục đích:** Lấy snapshot quyền của user

**Headers:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
{
  "roleCodes": ["ADMIN"],
  "permissions": [
    "foundation.roles.view",
    "foundation.roles.create",
    "master_data.owner.view"
  ],
  "warehouseScope": ["WH5.1"],
  "ownerScope": []
}
```

**Files:** `profile.controller.ts`

---

#### POST /api/v1/auth/select-warehouse

**Mục đích:** Chọn/chuyển warehouse context

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "warehouseId": "uuid-warehouse-id"
}
```

**Response 200:**
```json
{
  "selectedWarehouseId": "uuid-warehouse-id",
  "accessToken": "new-access-token-with-warehouse..."
}
```

**Validation:**
- User phải có quyền truy cập warehouse
- Warehouse phải đang active

**Error Responses:**
| Code | Message |
|------|---------|
| AUTH_WAREHOUSE_CONTEXT_INVALID | Kho không tồn tại hoặc không có quyền |

**Files:** `profile.controller.ts`, `session.service.ts`

---

### 3.3. Session Management APIs

#### GET /api/v1/auth/sessions

**Mục đích:** Liệt kê các session đang active

**Headers:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
[
  {
    "id": "uuid-session-id",
    "sessionCode": "SES-ABC123",
    "channel": "WEB",
    "deviceName": "Chrome Windows",
    "ipAddress": "192.168.1.1",
    "loginAt": "2026-03-09T06:00:00Z",
    "lastSeenAt": "2026-03-09T06:30:00Z",
    "isCurrent": true
  }
]
```

**Files:** `session.controller.ts`, `session.service.ts`

---

#### POST /api/v1/auth/sessions/:id/revoke

**Mục đích:** Thu hồi một session cụ thể

**Headers:** `Authorization: Bearer <access_token>`

**Response:** 204 No Content

**Error Responses:**
| Code | Message |
|------|---------|
| AUTH_SESSION_NOT_FOUND | Session không tồn tại |

**Files:** `session.controller.ts`, `session.service.ts`

---

### 3.4. Password Management APIs

#### POST /api/v1/auth/change-password

**Mục đích:** Đổi mật khẩu

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "oldPassword": "current-password",
  "newPassword": "NewPass@123",
  "confirmPassword": "NewPass@123"
}
```

**Validation:**
- Mật khẩu >= 8 ký tự
- Chứa chữ hoa, chữ thường, số, ký tự đặc biệt
- Không chứa username
- Không trùng 5 mật khẩu gần nhất

**Response 200:**
```json
{
  "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
}
```

**Side Effects:**
- Tất cả sessions bị revoke
- authVersion tăng lên
- Log security event PASSWORD_CHANGED

**Error Responses:**
| Code | Message |
|------|---------|
| AUTH_PASSWORD_MISMATCH | Mật khẩu xác nhận không khớp |
| AUTH_OLD_PASSWORD_INVALID | Mật khẩu cũ không chính xác |
| AUTH_PASSWORD_POLICY_VIOLATION | Mật khẩu không đạt yêu cầu |
| AUTH_PASSWORD_REUSE_NOT_ALLOWED | Không được dùng mật khẩu cũ |

**Files:** `password.controller.ts`, `authentication.service.ts`

---

### 3.5. Admin APIs

#### POST /api/v1/admin/auth/users/:id/force-reset-password

**Mục đích:** Admin reset mật khẩu cho user

**Permission:** `ADMIN.USER.RESET_PASSWORD`

**Request Body:**
```json
{
  "temporaryPassword": "TempPass@123",
  "reason": "User quên mật khẩu"
}
```

**Response 200:**
```json
{
  "message": "Đặt lại mật khẩu thành công"
}
```

**Side Effects:**
- User phải đổi mật khẩu lần đăng nhập tiếp theo
- Tất cả sessions bị revoke
- Log security event PASSWORD_RESET_ADMIN

**Files:** `admin-auth.controller.ts`

---

#### POST /api/v1/admin/auth/users/:id/unlock

**Mục đích:** Admin mở khóa tài khoản

**Permission:** `ADMIN.USER.UNLOCK`

**Request Body:**
```json
{
  "reason": "User xác nhận danh tính"
}
```

**Response 200:**
```json
{
  "message": "Mở khóa tài khoản thành công"
}
```

**Files:** `admin-auth.controller.ts`, `lockout.service.ts`

---

#### POST /api/v1/admin/auth/users/:id/revoke-all-sessions

**Mục đích:** Admin thu hồi tất cả sessions của user

**Permission:** `ADMIN.USER.REVOKE_SESSIONS`

**Response 200:**
```json
{
  "message": "Thu hồi tất cả session thành công",
  "revokedCount": 3
}
```

**Files:** `admin-auth.controller.ts`, `session.service.ts`

---

## 4. Business Rules

### BR-AUTH-001: Login Flow
1. Validate username tồn tại
2. Kiểm tra user active
3. Kiểm tra account không bị lock
4. Verify password hash (Argon2id)
5. Reset failed counter nếu thành công
6. Tạo session + phát hành tokens
7. Log LOGIN_SUCCESS/LOGIN_FAIL

### BR-AUTH-002: Password Policy
- Tối thiểu 8 ký tự
- Ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
- Không chứa username
- Không trùng 5 mật khẩu gần nhất

### BR-AUTH-003: Lockout Policy
- 5 lần đăng nhập sai → khóa 15 phút
- Admin có thể mở khóa thủ công
- Reset counter sau đăng nhập thành công

### BR-AUTH-004: Token Strategy
- Access token TTL: 15 phút
- Refresh token TTL: 7 ngày (web), 14 ngày (mobile)
- Session absolute expiry: 7 ngày
- Refresh token rotation mỗi lần refresh
- Replay detection → revoke toàn bộ session

### BR-AUTH-005: Warehouse Context
- User chỉ được chọn warehouse trong phạm vi được gán
- Selected warehouse lưu trong session
- Context bắt buộc cho các business API

### BR-AUTH-006: Revocation
- `authVersion` increment khi revoke-all/password change
- Token validation kiểm tra session + authVersion

---

## 5. Security Events

| Event Type | Severity | Trigger |
|------------|----------|---------|
| LOGIN_SUCCESS | INFO | Đăng nhập thành công |
| LOGIN_FAIL | WARN | Đăng nhập thất bại |
| LOGOUT | INFO | Đăng xuất |
| LOGOUT_ALL | INFO | Đăng xuất tất cả |
| TOKEN_REFRESH | INFO | Refresh token thành công |
| REFRESH_REPLAY_DETECTED | HIGH | Phát hiện token replay |
| PASSWORD_CHANGED | INFO | Đổi mật khẩu |
| PASSWORD_RESET_ADMIN | HIGH | Admin reset mật khẩu |
| SESSION_REVOKED | INFO | Thu hồi session |
| ACCOUNT_LOCKED | HIGH | Khóa tài khoản |
| ACCOUNT_UNLOCKED | INFO | Mở khóa tài khoản |
| ACCESS_DENIED | WARN | Từ chối truy cập |
| WAREHOUSE_CONTEXT_SWITCHED | INFO | Chuyển warehouse |

---

## 6. Test Credentials

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | Admin@123 | ADMIN | System administrator |
| gov_manager | Gov@123456 | GOVERNANCE_MANAGER | Governance manager |

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| JWT_SECRET | - | Secret key cho JWT signing |
| ACCESS_TOKEN_TTL_MINUTES | 15 | TTL access token (phút) |
| REFRESH_TOKEN_TTL_DAYS | 7 | TTL refresh token (ngày) |
| PASSWORD_MIN_LENGTH | 8 | Độ dài tối thiểu mật khẩu |
| PASSWORD_HISTORY_COUNT | 5 | Số mật khẩu cũ không được dùng lại |
| LOGIN_MAX_FAILED_ATTEMPTS | 5 | Số lần sai tối đa trước khi khóa |
| LOGIN_LOCK_MINUTES | 15 | Thời gian khóa (phút) |

---

## 8. Cross-Module Dependencies

### Module Auth depends on:
| Module | Table/Service | Usage |
|--------|---------------|-------|
| Module 1 | AppUser | User master data |
| Module 1 | Role, Permission | RBAC catalog |
| Module 1 | UserRole | User-role assignments |
| Module 2 | MdWarehouse | Warehouse context validation |

### Modules that depend on Auth:
| Module | Usage |
|--------|-------|
| All Modules | JWT validation via AuthGuard |
| All Modules | Permission check via PermissionGuard |
| All Modules | Warehouse scope filtering |
