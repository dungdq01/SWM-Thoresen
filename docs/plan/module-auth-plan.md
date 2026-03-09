# Module Auth - Implementation Plan

**Module:** Authentication, Authorization & Session Control  
**Status:** 🔄 In Progress  
**Created:** 2026-03-09  
**Last Updated:** 2026-03-09

---

## 1. Mô tả nghiệp vụ

Module Auth là **security platform layer** của toàn hệ thống SWM, chịu trách nhiệm:

- **Authentication**: Xác thực user qua username/password
- **Session Management**: Quản lý session, refresh token rotation
- **Authorization**: Phân quyền RBAC, warehouse scope, owner scope
- **Security Control**: Lockout policy, password policy, audit security events

### Mục tiêu Phase 1

1. Username/password login với JWT
2. Access token + Refresh token rotation
3. Session management (create, revoke, revoke-all)
4. Password change với policy enforcement
5. Warehouse context selection/switch
6. Permission/scope resolution cho downstream modules
7. Security audit logging

---

## 2. Database Tables (7 tables)

| Table | Description | Group |
|-------|-------------|-------|
| `auth_local_credential` | Password hash, algo, must_change_password | Credential |
| `auth_password_history` | Lịch sử password để chống reuse | Credential |
| `auth_session` | Session tracking với device/channel info | Session |
| `auth_refresh_token` | Refresh token với rotation family | Session |
| `auth_login_attempt` | Log login success/fail cho forensics | Security |
| `auth_security_event` | Audit events: login, logout, denied access | Security |
| `auth_account_lock` | Account lockout tracking | Security |

### Extension to existing `app_user` table

Thêm các fields:
- `auth_version` - Tăng khi revoke-all/password change
- `last_login_at` - Last successful login
- `last_password_changed_at` - Password change timestamp
- `failed_login_count` - Failed login counter
- `locked_until` - Lockout expiry
- `default_warehouse_id` - Default warehouse context

---

## 3. Dependencies

### Module Auth depends on:
| Source Module | Dependency | Usage |
|---------------|------------|-------|
| Module 1 | `AppUser` | User master data |
| Module 1 | `Role`, `Permission` | RBAC catalog |
| Module 1 | `UserRole` | User-role assignments |
| Module 1 | `AuditLog` | Audit framework |
| Module 2 | `MdWarehouse` | Warehouse context validation |
| Module 2 | `MdOwner` | Owner scope resolution |

### Modules that depend on Auth:
| Target Module | Dependency | Usage |
|---------------|------------|-------|
| All Modules | `SecurityContext` | Request authentication |
| All Modules | `PermissionGuard` | Permission enforcement |
| All Modules | `WarehouseScopeGuard` | Warehouse scope filter |

---

## 4. API Endpoints (13 endpoints)

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login với username/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout current session |
| POST | `/api/v1/auth/logout-all` | Logout all sessions |

### Profile & Context
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/me` | Get current user profile |
| GET | `/api/v1/auth/me/permissions` | Get permission snapshot |
| POST | `/api/v1/auth/select-warehouse` | Select/switch warehouse |
| GET | `/api/v1/auth/sessions` | List active sessions |
| POST | `/api/v1/auth/sessions/:id/revoke` | Revoke specific session |

### Password Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/change-password` | Change own password |

### Admin APIs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/admin/auth/users/:id/force-reset-password` | Admin reset password |
| POST | `/api/v1/admin/auth/users/:id/unlock` | Admin unlock account |
| POST | `/api/v1/admin/auth/users/:id/revoke-all-sessions` | Admin revoke all sessions |

---

## 5. Business Rules & Acceptance Criteria

### BR-AUTH-001: Login Flow
- Validate username exists
- Check user active status
- Check account not locked
- Verify password hash (Argon2id)
- Reset failed counter on success
- Create session + issue tokens
- Audit LOGIN_SUCCESS/LOGIN_FAIL

### BR-AUTH-002: Password Policy
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 digit, 1 special char
- Cannot contain username
- Cannot reuse last 5 passwords

### BR-AUTH-003: Lockout Policy
- 5 failed attempts → lock 15 minutes
- Admin can manually unlock
- Reset counter after successful login

### BR-AUTH-004: Token Strategy
- Access token: 15 minutes TTL
- Refresh token: 7 days TTL (web), 14 days (mobile)
- Session absolute expiry: 7 days
- Refresh token rotation on each refresh
- Replay detection → revoke entire session

### BR-AUTH-005: Warehouse Context
- User can only select warehouse in their assignment
- Selected warehouse stored in session
- Context required for business API calls

### BR-AUTH-006: Revocation
- `auth_version` increment for global revoke
- Session revoke marks `revoked_at`
- Token validation checks session + auth_version

---

## 6. Code Structure

```
src/modules/auth/
├── auth.module.ts
├── controllers/
│   ├── auth.controller.ts           # login, refresh, logout
│   ├── profile.controller.ts        # me, permissions, warehouse
│   ├── session.controller.ts        # sessions management
│   ├── password.controller.ts       # change password
│   └── admin-auth.controller.ts     # admin actions
├── services/
│   ├── authentication.service.ts    # login, verify credential
│   ├── session.service.ts           # session create/revoke
│   ├── token.service.ts             # JWT sign/verify
│   ├── authorization.service.ts     # permission resolution
│   ├── password-policy.service.ts   # password validation
│   ├── lockout.service.ts           # lockout management
│   ├── warehouse-context.service.ts # warehouse selection
│   └── security-audit.service.ts    # security event logging
├── repositories/
│   ├── credential.repository.ts
│   ├── session.repository.ts
│   ├── refresh-token.repository.ts
│   ├── login-attempt.repository.ts
│   ├── password-history.repository.ts
│   └── security-event.repository.ts
├── dto/
│   ├── login.dto.ts
│   ├── refresh.dto.ts
│   ├── change-password.dto.ts
│   └── select-warehouse.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── session-valid.guard.ts
│   └── require-password-change.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── require-permission.decorator.ts
└── interfaces/
    └── security-context.interface.ts
```

---

## 7. Implementation Phases

### Phase A - Core Authentication (Step 1-3)
- [x] Plan implementation
- [ ] Database schema
- [ ] Migration + Seed
- [ ] Login/Logout/Refresh APIs
- [ ] JWT Guard integration

### Phase B - Security Features
- [ ] Password change/reset
- [ ] Lockout policy
- [ ] Session management APIs
- [ ] Warehouse context

### Phase C - Admin & Audit
- [ ] Admin security APIs
- [ ] Security event logging
- [ ] Permission cache

---

## 8. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Password hashing | Argon2id | Recommended by OWASP |
| JWT algorithm | HS256 | Simpler for Phase 1, RS256 later |
| Token storage | DB session table | Enable revocation |
| Refresh rotation | Yes | Prevent replay attacks |
| Permission cache | In-memory (Map) | Simple for Phase 1 |

---

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token replay | HIGH | Refresh rotation + replay detection |
| Password leak | CRITICAL | Argon2id + no logging passwords |
| Session hijack | HIGH | Device tracking + revocation |
| Brute force | MEDIUM | Lockout policy + rate limit |

---

## 10. Checklist

- [ ] Schema created
- [ ] Migration successful
- [ ] Seed data created
- [ ] All APIs implemented
- [ ] Guards integrated
- [ ] Unit tests written
- [ ] Integration tests passed
- [ ] Documentation complete
