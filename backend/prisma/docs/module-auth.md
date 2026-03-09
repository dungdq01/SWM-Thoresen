# Module Auth - Database Schema Documentation

**Module:** Authentication, Authorization & Session Control  
**Version:** 1.1.0  
**Last Updated:** 2026-03-09

---

## 1. Tổng quan

Module Auth quản lý 7 tables chính cho authentication và security:

| Table | Description | Records |
|-------|-------------|---------|
| `auth_local_credential` | Password hash và policy flags | 1 per user |
| `auth_password_history` | Lịch sử password để chống reuse | Many per user |
| `auth_session` | Session tracking với device info | Many per user |
| `auth_refresh_token` | Refresh token với rotation family | Many per session |
| `auth_login_attempt` | Log login success/fail | Many per user |
| `auth_security_event` | Audit events bảo mật | Many |
| `auth_account_lock` | Account lockout tracking | Many per user |

> **v1.1 Changes:** Schema không thay đổi. Fixes liên quan đến code (guard unification, JWT field mapping).

---

## 2. Enums

### AuthChannel
```prisma
enum AuthChannel {
  WEB
  MOBILE
  API
}
```

### AuthSecurityEventType
```prisma
enum AuthSecurityEventType {
  LOGIN_SUCCESS
  LOGIN_FAIL
  LOGOUT
  LOGOUT_ALL
  TOKEN_REFRESH
  TOKEN_REFRESH_FAIL
  REFRESH_REPLAY_DETECTED
  PASSWORD_CHANGED
  PASSWORD_RESET_ADMIN
  SESSION_REVOKED
  ACCOUNT_LOCKED
  ACCOUNT_UNLOCKED
  ACCESS_DENIED
  WAREHOUSE_CONTEXT_SWITCHED
  USER_DEACTIVATED
}
```

### AuthSecurityEventSeverity
```prisma
enum AuthSecurityEventSeverity {
  INFO
  WARN
  HIGH
  CRITICAL
}
```

---

## 3. Tables

### 3.1. auth_local_credential

Lưu thông tin xác thực (password hash) của user.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| user_id | UUID | ❌ | - | FK → app_user.id (unique) |
| password_hash | TEXT | ❌ | - | Password hash (Argon2id) |
| password_algo | VARCHAR(30) | ❌ | ARGON2ID | Algorithm used |
| password_changed_at | TIMESTAMP | ❌ | now() | Last password change |
| must_change_password | BOOLEAN | ❌ | false | Force change on next login |
| password_expires_at | TIMESTAMP | ✅ | - | Password expiration (optional) |
| created_at | TIMESTAMP | ❌ | now() | |
| updated_at | TIMESTAMP | ❌ | auto | |

**Indexes:**
- `user_id` (unique)

**Relations:**
- `user` → AppUser (1:1)

---

### 3.2. auth_password_history

Lưu lịch sử password để chống reuse.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| user_id | UUID | ❌ | - | FK → app_user.id |
| password_hash | TEXT | ❌ | - | Password hash |
| changed_at | TIMESTAMP | ❌ | now() | When changed |
| changed_by | UUID | ✅ | - | Who changed (user/admin) |
| change_reason | VARCHAR(30) | ❌ | - | USER_CHANGE, ADMIN_RESET |

**Indexes:**
- `(user_id, changed_at DESC)`

**Relations:**
- `user` → AppUser (N:1)

---

### 3.3. auth_session

Quản lý sessions đang active.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| session_code | VARCHAR(40) | ❌ | - | Human-readable code (unique) |
| user_id | UUID | ❌ | - | FK → app_user.id |
| channel | AuthChannel | ❌ | - | WEB, MOBILE, API |
| device_id | VARCHAR(120) | ✅ | - | Device identifier |
| device_name | VARCHAR(255) | ✅ | - | Device name |
| user_agent | TEXT | ✅ | - | Browser user agent |
| ip_address | VARCHAR(64) | ✅ | - | Client IP |
| login_at | TIMESTAMP | ❌ | now() | Login time |
| last_seen_at | TIMESTAMP | ❌ | now() | Last activity |
| expires_at | TIMESTAMP | ❌ | - | Session expiration |
| is_current | BOOLEAN | ❌ | true | Is session active |
| revoked_at | TIMESTAMP | ✅ | - | When revoked |
| revoked_by | UUID | ✅ | - | Who revoked |
| revoke_reason | VARCHAR(50) | ✅ | - | Reason for revocation |
| auth_version_at_issue | BIGINT | ❌ | - | User's auth_version at login |
| selected_warehouse_id | UUID | ✅ | - | Current warehouse context |
| created_at | TIMESTAMP | ❌ | now() | |
| updated_at | TIMESTAMP | ❌ | auto | |

**Indexes:**
- `session_code` (unique)
- `(user_id, is_current)`
- `expires_at`
- `revoked_at`
- `(channel, is_current)`

**Relations:**
- `user` → AppUser (N:1)
- `refreshTokens` → AuthRefreshToken (1:N)

---

### 3.4. auth_refresh_token

Quản lý refresh tokens với rotation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| session_id | UUID | ❌ | - | FK → auth_session.id |
| token_hash | VARCHAR(255) | ❌ | - | SHA256 hash of token (unique) |
| token_family | VARCHAR(80) | ❌ | - | Token family for rotation tracking |
| issued_at | TIMESTAMP | ❌ | now() | When issued |
| expires_at | TIMESTAMP | ❌ | - | Token expiration |
| rotated_from_id | UUID | ✅ | - | FK → auth_refresh_token.id (unique) |
| is_revoked | BOOLEAN | ❌ | false | Is token revoked |
| revoked_at | TIMESTAMP | ✅ | - | When revoked |
| revoke_reason | VARCHAR(50) | ✅ | - | Reason for revocation |
| created_at | TIMESTAMP | ❌ | now() | |

**Indexes:**
- `token_hash` (unique)
- `rotated_from_id` (unique)
- `(session_id, is_revoked)`
- `expires_at`
- `token_family`

**Relations:**
- `session` → AuthSession (N:1)
- `rotatedFrom` → AuthRefreshToken (1:1 self-ref)
- `rotatedTo` → AuthRefreshToken (1:1 self-ref)

---

### 3.5. auth_login_attempt

Log tất cả login attempts cho forensics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| username | VARCHAR(100) | ❌ | - | Username attempted |
| user_id | UUID | ✅ | - | FK → app_user.id (if found) |
| attempt_at | TIMESTAMP | ❌ | now() | Attempt time |
| ip_address | VARCHAR(64) | ✅ | - | Client IP |
| user_agent | TEXT | ✅ | - | Browser user agent |
| channel | AuthChannel | ❌ | - | WEB, MOBILE, API |
| success | BOOLEAN | ❌ | - | Was login successful |
| failure_reason | VARCHAR(50) | ✅ | - | Reason for failure |
| correlation_id | VARCHAR(80) | ✅ | - | Request correlation ID |

**Indexes:**
- `(username, attempt_at DESC)`
- `(user_id, attempt_at DESC)`
- `(ip_address, attempt_at DESC)`

**Relations:**
- `user` → AppUser (N:1, optional)

---

### 3.6. auth_security_event

Audit log cho các security events.

| Column         | Type                      | Nullable | Default | Description                       |
| ----------------| ---------------------------| ----------| ---------| -----------------------------------|
| id             | UUID                      | ❌        | uuid()  | Primary key                       |
| event_type     | AuthSecurityEventType     | ❌        | -       | Type of event                     |
| severity       | AuthSecurityEventSeverity | ❌        | -       | Event severity                    |
| user_id        | UUID                      | ✅        | -       | FK → app_user.id                  |
| session_id     | UUID                      | ✅        | -       | Related session                   |
| channel        | AuthChannel               | ✅        | -       | Channel if applicable             |
| ip_address     | VARCHAR(64)               | ✅        | -       | Client IP                         |
| user_agent     | TEXT                      | ✅        | -       | Browser user agent                |
| correlation_id | VARCHAR(80)               | ✅        | -       | Request correlation ID            |
| resource_type  | VARCHAR(50)               | ✅        | -       | Resource type (for ACCESS_DENIED) |
| resource_id    | VARCHAR(100)              | ✅        | -       | Resource ID                       |
| action         | VARCHAR(50)               | ✅        | -       | Action attempted                  |
| error_code     | VARCHAR(50)               | ✅        | -       | Error code if applicable          |
| event_payload  | JSONB                     | ✅        | -       | Additional event data             |
| occurred_at    | TIMESTAMP                 | ❌        | now()   | When event occurred               |
| created_at     | TIMESTAMP                 | ❌        | now()   |                                   |

**Indexes:**
- `(event_type, occurred_at DESC)`
- `(user_id, occurred_at DESC)`
- `(severity, occurred_at DESC)`
- `correlation_id`

**Relations:**
- `user` → AppUser (N:1, optional)

---

### 3.7. auth_account_lock

Tracking account lockouts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ❌ | uuid() | Primary key |
| user_id | UUID | ❌ | - | FK → app_user.id |
| locked_at | TIMESTAMP | ❌ | now() | When locked |
| locked_until | TIMESTAMP | ❌ | - | Lock expiration |
| lock_reason | VARCHAR(50) | ❌ | - | Reason for lock |
| failed_count | INT | ❌ | - | Failed attempts count |
| unlocked_at | TIMESTAMP | ✅ | - | When unlocked (if manual) |
| unlocked_by | UUID | ✅ | - | Who unlocked |
| unlock_reason | VARCHAR(50) | ✅ | - | Reason for unlock |
| correlation_id | VARCHAR(80) | ✅ | - | Request correlation ID |
| created_at | TIMESTAMP | ❌ | now() | |
| updated_at | TIMESTAMP | ❌ | auto | |

**Indexes:**
- `(user_id, locked_at DESC)`
- `locked_until`

**Relations:**
- `user` → AppUser (N:1)

---

## 4. AppUser Extensions

Module Auth mở rộng bảng `app_user` với các fields:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| phone | VARCHAR(50) | ✅ | - | Phone number |
| user_type | VARCHAR(30) | ❌ | INTERNAL | User type |
| default_warehouse_id | UUID | ✅ | - | Default warehouse |
| auth_version | BIGINT | ❌ | 1 | Incremented on password change/revoke-all |
| last_login_at | TIMESTAMP | ✅ | - | Last successful login |
| last_password_changed_at | TIMESTAMP | ✅ | - | Last password change |
| failed_login_count | INT | ❌ | 0 | Current failed login count |
| locked_until | TIMESTAMP | ✅ | - | Account lock expiration |
| created_by | UUID | ✅ | - | Creator |
| updated_by | UUID | ✅ | - | Last updater |

**New Relations on AppUser:**
- `credential` → AuthLocalCredential (1:1)
- `passwordHistory` → AuthPasswordHistory (1:N)
- `sessions` → AuthSession (1:N)
- `loginAttempts` → AuthLoginAttempt (1:N)
- `securityEvents` → AuthSecurityEvent (1:N)
- `accountLocks` → AuthAccountLock (1:N)

---

## 5. Entity Relationship Diagram

```
┌─────────────────┐
│    app_user     │
├─────────────────┤
│ id              │←──────────────────────────────────────────┐
│ auth_version    │                                           │
│ failed_login_count│                                         │
│ locked_until    │                                           │
└────────┬────────┘                                           │
         │                                                    │
         │ 1:1                                                │
         ▼                                                    │
┌─────────────────────┐                                       │
│ auth_local_credential│                                      │
├─────────────────────┤                                       │
│ user_id (unique)    │                                       │
│ password_hash       │                                       │
│ must_change_password│                                       │
└─────────────────────┘                                       │
                                                              │
┌─────────────────────┐     ┌─────────────────────┐          │
│ auth_password_history│    │   auth_login_attempt│          │
├─────────────────────┤     ├─────────────────────┤          │
│ user_id ────────────┼─────│ user_id ────────────┼──────────┤
│ password_hash       │     │ username            │          │
│ change_reason       │     │ success             │          │
└─────────────────────┘     │ failure_reason      │          │
                            └─────────────────────┘          │
                                                              │
┌─────────────────────┐     ┌─────────────────────┐          │
│    auth_session     │     │ auth_security_event │          │
├─────────────────────┤     ├─────────────────────┤          │
│ user_id ────────────┼─────│ user_id ────────────┼──────────┤
│ session_code        │     │ event_type          │          │
│ channel             │     │ severity            │          │
│ auth_version_at_issue│    │ event_payload       │          │
└────────┬────────────┘     └─────────────────────┘          │
         │                                                    │
         │ 1:N                                                │
         ▼                                                    │
┌─────────────────────┐     ┌─────────────────────┐          │
│ auth_refresh_token  │     │  auth_account_lock  │          │
├─────────────────────┤     ├─────────────────────┤          │
│ session_id          │     │ user_id ────────────┼──────────┘
│ token_hash (unique) │     │ locked_until        │
│ token_family        │     │ unlocked_at         │
│ rotated_from_id     │◄──┐ └─────────────────────┘
│ (self-ref)          │───┘
└─────────────────────┘
```

---

## 6. Data Retention

| Table | Retention Policy | Notes |
|-------|------------------|-------|
| auth_local_credential | Permanent | 1 per user |
| auth_password_history | 5 records per user | Oldest deleted when exceeds |
| auth_session | 90 days after expiry | Background job cleanup |
| auth_refresh_token | 30 days after expiry | Background job cleanup |
| auth_login_attempt | 90 days | Background job cleanup |
| auth_security_event | 1 year | Archive to cold storage |
| auth_account_lock | 1 year | Audit compliance |

---

## 7. Seed Data

```sql
-- Admin user credentials (password: Admin@123)
INSERT INTO auth_local_credential (user_id, password_hash, password_algo, must_change_password)
VALUES (
  (SELECT id FROM app_user WHERE user_code = 'admin'),
  '$argon2id$v=19$m=65536,t=3,p=4$...', 
  'ARGON2ID',
  false
);

-- Governance user credentials (password: Gov@123456)
INSERT INTO auth_local_credential (user_id, password_hash, password_algo, must_change_password)
VALUES (
  (SELECT id FROM app_user WHERE user_code = 'gov_manager'),
  '$argon2id$v=19$m=65536,t=3,p=4$...', 
  'ARGON2ID',
  false
);
```
