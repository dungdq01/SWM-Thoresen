# TVL SWM — Module Auth Tech Stack & Backend Design
# Authentication, Authorization & Session Control

**Dự án:** Thoresen Vinama Logistics (TVL) — Smart Warehouse Management (SWM)  
**Góc nhìn:** Tech Lead 15 năm kinh nghiệm  
**Phiên bản:** 1.0  
**Ngày:** 2026-03-09  
**Đối tượng đọc:** Tech Lead, Backend Dev, Dev Intern, QA, BA, Solution Architect, DevOps, Security Reviewer  
**Mục tiêu:** Chuyển hóa tài liệu đặc tả Module Auth thành tài liệu kỹ thuật implementation-ready để team dev có thể thiết kế database, backend, API, session/token flow, authorization guard, revocation logic, security audit và mapping liên module theo chuẩn đủ chi tiết để dev intern vẫn có thể code đúng.

---

## 1. Mục đích tài liệu

Tài liệu này chuyển hóa **Module Auth** từ góc nhìn business/spec sang góc nhìn kỹ thuật để team dev hiểu rõ:

- Module Auth thực chất phải build những gì trong Phase 1.
- Luồng chuẩn từ **database → repository → service → guard → middleware/interceptor → API** nên tổ chức ra sao.
- Vì sao Auth không chỉ là login form mà là **security platform layer** của toàn hệ thống.
- Thiết kế database nào vừa đúng cho go-live Phase 1 vừa đủ sạch để scale cho SSO, Active Directory, MFA, service account và external identity provider về sau.
- Từng API dùng để làm gì, input/output gì, validate gì, side effect gì, audit gì, idempotency ra sao.
- Cách Module Auth ánh xạ với **Module 1 → Module 11** và ranh giới ownership cần giữ thật chặt.
- Cách build session/token/revocation/permission caching sao cho an toàn nhưng vẫn phù hợp đội dev nhỏ.

Tài liệu này bám trên các nguyên tắc đã có trong bộ tài liệu SWM:

- Backend là lớp kiểm quyền cuối cùng.
- JWT + RBAC là baseline phù hợp cho Phase 1.
- `CUST_VIEWER` chỉ được thấy dữ liệu theo owner scope.
- Khi user bị deactivate hoặc đổi quyền, session/token phải bị thu hồi hiệu lực đủ nhanh.
- Warehouse context là một phần quan trọng của security context, không chỉ là filter UI.
- Audit và idempotency là nền tảng dùng chung cho toàn hệ thống.

---

## 2. Kết luận kỹ thuật quan trọng rút ra từ spec và baseline hệ thống

Từ tài liệu Auth spec và bộ tài liệu kỹ thuật các module hiện có, có thể chốt 20 kết luận kỹ thuật quan trọng cho Module Auth:

1. **Module Auth là security entry layer của toàn hệ thống**, không phải chỉ là màn login.
2. **Authentication và Authorization phải tách trách nhiệm rõ**: xác minh user là ai khác với xác định user được làm gì.
3. **Warehouse context là một phần của request context bắt buộc** đối với user có nhiều kho.
4. **Owner scope là dimension bảo mật bắt buộc** cho `CUST_VIEWER` và một số role nội bộ đặc thù.
5. **Permission phải được enforce ở backend guard/policy layer**, không được phụ thuộc vào UI disable button.
6. **Token chỉ là credential mang context**, không phải nguồn sự thật duy nhất; nguồn sự thật vẫn là database + revocation/version state.
7. **Revocation phải là capability thật**, không chỉ là xóa token ở client; backend phải chặn token đã mất hiệu lực.
8. **Refresh token phải được quản lý theo session/device**, không để một token refresh vô hạn và không trace được.
9. **User đổi mật khẩu, bị deactivate, bị đổi role hoặc bị force logout thì session phải invalid đủ nhanh**.
10. **RBAC của Auth phải consume quyền từ Module 1**, không tự phát minh permission catalog riêng.
11. **Auth phải phát security audit có cấu trúc**, không chỉ log text thô.
12. **Password không được lưu hoặc log dưới dạng plain text**, kể cả trong debug logs.
13. **Account lockout, failed login counter và password history là capability cần có cho hệ thống enterprise tối thiểu**.
14. **Mobile/Web/API phải dùng cùng security platform**, nhưng policy có thể khác theo channel.
15. **Service-to-service hoặc integration account nên được chừa đường nhưng không làm phình Phase 1**.
16. **Auth phải hỗ trợ permission resolution + data scope resolution hiệu quả**, vì mọi request đều đi qua nó.
17. **Session/token model phải đủ mở để sau này nâng cấp lên SSO/AD/MFA mà không phá schema lõi**.
18. **Permission cache là hợp lý, nhưng cache không được làm chậm hiệu lực revoke quá mức**.
19. **Mọi module downstream đều phải dùng chung request security context chuẩn hóa**: `user_id`, `role_codes`, `permission_codes`, `warehouse_id`, `owner_scope`, `correlation_id`, `channel`.
20. **Thiết kế Auth phải ưu tiên an toàn hơn tiện lợi**, vì lỗi ở đây sẽ lan sang mọi module khác.

---

## 3. Phạm vi build thực tế của Module Auth dưới góc nhìn tech lead

### 3.1 Các phần phải code ở Phase 1

1. Username/password login
2. Access token issuance
3. Refresh token issuance và rotation
4. Logout current session
5. Logout all sessions
6. Force revoke session từ admin/system action
7. Password change
8. Reset password admin flow cơ bản
9. Failed login counter + lockout policy
10. User active/inactive enforcement
11. Warehouse context select/switch
12. Role/permission/data-scope resolution
13. JWT auth guard
14. Permission guard
15. Scope guard cho warehouse/owner
16. Security audit logging cho auth events
17. Token/session validation với revocation/version check
18. Current profile/session inquiry APIs
19. Channel-aware session tracking (web/mobile)
20. Seed roles/policies consume từ Module 1

### 3.2 Các phần không nên build quá tay ở Phase 1

1. Không build SSO hoàn chỉnh.
2. Không build MFA hoàn chỉnh.
3. Không build OAuth public authorization server như sản phẩm IAM độc lập.
4. Không build self-service forgot-password email flow quá phức tạp nếu hạ tầng mail chưa sẵn sàng.
5. Không build ABAC engine tổng quát thay cho RBAC + scope.
6. Không build identity federation đa tenant.
7. Không build device fingerprinting nâng cao như ngân hàng số.
8. Không build passwordless login.

### 3.3 Diễn giải để dev intern không build nhầm

- **Có build** login, token, session, permission enforcement, warehouse context, revoke và audit.
- **Có build** bảng session thật trong DB.
- **Có build** refresh token rotation.
- **Có build** scope enforcement cho owner và warehouse.
- **Không build** chỉ mỗi middleware kiểm JWT rồi cho qua toàn bộ.
- **Không build** role hard-code trong frontend.
- **Không build** refresh token chỉ lưu ở client mà backend không biết.
- **Không build** logic phân quyền rải rác mỗi module một kiểu.

---

## 4. Khuyến nghị tech stack chính thức cho Module Auth

Để đồng bộ với Module 1 → Module 11 và phù hợp đội dev nhỏ, khuyến nghị chốt stack như sau.

### 4.1 Backend

- **Language:** TypeScript
- **Framework:** NestJS
- **API style:** REST
- **Validation:** class-validator + class-transformer
- **ORM:** Prisma
- **Documentation:** OpenAPI / Swagger

### 4.2 Database

- **Primary DB:** PostgreSQL
- **Cache / permission hot cache / revoke marker:** Redis
- **Queue / background jobs:** BullMQ trên Redis

### 4.3 Security libraries

- **Password hashing:** Argon2id
- **JWT signing:** asymmetric key pair khuyến nghị (`RS256`) hoặc `ES256`; nếu đội nhỏ chưa sẵn sàng HSM/KMS thì có thể dùng `RS256` + secret management nghiêm ngặt
- **Token generation:** crypto-secure random for refresh token raw value
- **Request rate limit:** Nest rate limiter / reverse proxy limit cho login và refresh

### 4.4 Observability

- Structured logging JSON bằng Pino/Winston
- Correlation ID xuyên suốt `login -> refresh -> API -> audit`
- Metrics chính:
  - login success rate
  - login fail rate
  - lockout count
  - refresh success/fail rate
  - revoke propagation latency
  - denied access count by permission
  - active sessions by channel

### 4.5 Testing

- Unit test: Jest/Vitest
- Integration test: Nest + PostgreSQL test DB
- API test: supertest
- Security test: brute force, replay refresh token, stale token after revoke, scope leakage
- Concurrency test: refresh token rotation race, logout-all race, role change while requests in flight

### 4.6 Vì sao nên giữ cùng stack với toàn bộ hệ SWM

1. Dễ reuse guard/interceptor/request-context đã dùng ở các module khác.
2. Dễ đồng bộ với Module 1 cho role, permission, audit, idempotency.
3. PostgreSQL mạnh cho session table, unique constraint, row lock, audit and history.
4. Redis phù hợp cho revoke markers, rate limit, permission cache, hot session checks.
5. NestJS rất hợp để tổ chức `AuthGuard + PermissionGuard + ScopeGuard + decorators`.

---

## 5. Kiến trúc tổng thể Module Auth trong hệ backend

```text
Web App / Mobile App / Internal API Client
                 |
                 v
          NestJS Auth Controllers
                 |
      +----------+-----------+
      |                      |
      v                      v
 Login / Refresh         Protected APIs
      |                      |
      v                      v
 Authentication        JWT Auth Guard
 Service               + Session Validator
      |                      |
      v                      v
 Session Service       Permission Guard
      |                      |
      v                      v
 Token Service         Scope Guard
      |                      |
      +----------+-----------+
                 |
                 v
         Request Security Context
                 |
                 v
         Downstream Modules 1 -> 11
                 |
                 v
 PostgreSQL + Redis + Audit + Background Jobs
```

### 5.1 Tư tưởng tổ chức

- **Controller layer**: nhận request/response, không chứa security rule sâu.
- **Authentication service**: login, verify credential, issue token.
- **Session service**: tạo session, revoke session, rotate refresh token, validate active session.
- **Authorization service**: resolve role, permission, data scope.
- **Guard layer**: chặn request càng sớm càng tốt.
- **Scope layer**: biến security context thành filter query an toàn.
- **Audit service**: ghi event auth/security có cấu trúc.

### 5.2 Tư tưởng thiết kế cốt lõi

- JWT chỉ dùng để giảm round trip, nhưng vẫn phải gắn với **session/state thật**.
- Mỗi refresh token phải gắn với **một session cụ thể**.
- Permission được resolve từ role + scope, không hard-code trong controller.
- Warehouse context phải rõ ràng ngay từ sau login hoặc trước request nghiệp vụ đầu tiên.
- Mọi module downstream chỉ đọc **security context chuẩn hóa**, không tự giải JWT mỗi nơi một kiểu.

---

## 6. Phân ranh ownership của Module Auth với Module 1

Đây là phần dev rất dễ hiểu sai, nên phải chốt rõ.

### 6.1 Module Auth sở hữu gì

Module Auth là source of truth cho:

- `auth_session`
- `auth_refresh_token`
- `auth_login_attempt`
- `auth_password_history`
- `auth_security_event` (nếu tách riêng audit auth)
- runtime credential verification
- token issue/rotate/revoke
- request authentication
- runtime authorization resolution
- current warehouse context/session context

### 6.2 Module 1 sở hữu gì

Module 1 là source of truth cho:

- user master nền tảng
- role catalog
- permission catalog
- role-permission mapping
- user-role assignment
- reason code
- audit framework nền tảng
- policy governance

### 6.3 Nguyên tắc ranh giới bắt buộc

- Auth **consume** role/permission/user assignment từ Module 1.
- Auth **không tự tạo một permission table khác** với semantics khác.
- Module 1 **không tự xử lý login/token/session**.
- Nếu dùng chung bảng user nền với Module 1 thì Auth vẫn là module sở hữu logic xác thực runtime trên bảng đó.

---

## 7. Đề xuất bounded contexts / sub-modules nội bộ

### 7.1 Identity & Account

Chịu trách nhiệm đọc user account, trạng thái user, username, email nội bộ, active flag.

### 7.2 Credential Management

Chịu trách nhiệm password hash, password changed at, reset token nội bộ nếu có, password history.

### 7.3 Session & Token

Chịu trách nhiệm session creation, refresh rotation, revoke current/all sessions, device/channel tracking.

### 7.4 Authorization Resolution

Chịu trách nhiệm load role, permission, warehouse scope, owner scope, channel restriction.

### 7.5 Security Enforcement

Chịu trách nhiệm JWT guard, permission guard, scope guard, decorators, request context.

### 7.6 Security Audit & Monitoring

Chịu trách nhiệm login success/fail, lockout, revoke, denied access, suspicious behavior, admin-force-reset events.

---

## 8. Đề xuất cấu trúc code backend cho Module Auth

```text
src/
  common/
    constants/
    enums/
    decorators/
    guards/
    interceptors/
    context/
    errors/
    utils/
  infrastructure/
    prisma/
    redis/
    queue/
    logger/
    crypto/
    config/
  modules/
    auth/
      auth.module.ts
      controllers/
        auth-login.controller.ts
        auth-session.controller.ts
        auth-password.controller.ts
        auth-profile.controller.ts
      services/
        authentication.service.ts
        authorization.service.ts
        token.service.ts
        session.service.ts
        password-policy.service.ts
        password-reset.service.ts
        lockout.service.ts
        warehouse-context.service.ts
        security-audit.service.ts
        current-user.service.ts
      repositories/
        user-auth.repository.ts
        session.repository.ts
        refresh-token.repository.ts
        login-attempt.repository.ts
        password-history.repository.ts
        security-event.repository.ts
      dto/
      entities/
      mappers/
      policies/
        permission.policy.ts
        scope.policy.ts
        channel.policy.ts
        password.policy.ts
      guards/
        jwt-auth.guard.ts
        permission.guard.ts
        warehouse-scope.guard.ts
        owner-scope.guard.ts
      decorators/
        current-user.decorator.ts
        require-permission.decorator.ts
        require-owner-scope.decorator.ts
        require-warehouse-context.decorator.ts
      jobs/
        expire-session.job.ts
        cleanup-login-attempt.job.ts
        cleanup-revoked-refresh.job.ts
```

### 8.1 Quy tắc code structure bắt buộc

- Controller không tự ký JWT.
- Chỉ `authentication.service.ts` được verify credential.
- Chỉ `token.service.ts` được issue/verify token payload theo chuẩn hệ thống.
- Chỉ `session.service.ts` được revoke/rotate session.
- Guard không gọi DB loạn xạ; nên đi qua service/repository chuẩn.
- Không để module nghiệp vụ tự parse JWT rồi tự kiểm quyền riêng.
- `authorization.service.ts` là lớp dùng chung cho toàn bộ modules downstream.

---

## 9. Thiết kế database tổng thể cho Module Auth

## 9.1 Nguyên tắc DB design

1. Tách **identity/account**, **credential**, **session**, **security log**.
2. Refresh token không lưu raw token; chỉ lưu hash/token fingerprint.
3. Mọi bảng runtime security phải có `created_at`, `updated_at`, `revoked_at`, `expires_at` khi phù hợp.
4. Session và token phải trace được `channel`, `device_id`, `ip`, `user_agent`.
5. Dùng `user.auth_version` hoặc `security_version` để hỗ trợ revoke toàn cục nhanh.
6. Không hard delete dữ liệu security quan trọng quá sớm.
7. Chia bảng transactional nóng và bảng log/history.
8. Chừa đường cho SSO identities ở phase sau.

---

## 9.2 Danh sách bảng đề xuất

### 9.2.1 Identity / credential
- `app_user` *(có thể dùng chung ownership với Module 1)*
- `auth_local_credential`
- `auth_password_history`

### 9.2.2 Session / token runtime
- `auth_session`
- `auth_refresh_token`
- `auth_revocation_marker` *(optional; có thể thay bằng version strategy + Redis marker)*

### 9.2.3 Security monitoring / control
- `auth_login_attempt`
- `auth_account_lock`
- `auth_security_event`
- `auth_password_reset_request` *(optional, Phase 1 admin reset có thể chưa cần tự phục vụ)*

### 9.2.4 Phase 2-friendly tables
- `auth_external_identity`
- `auth_mfa_factor`
- `auth_trusted_device`

---

## 9.3 Thiết kế chi tiết từng bảng cốt lõi

### 9.3.1 `app_user`

Nếu hệ thống đã có user master trong Module 1, khuyến nghị dùng chung bảng và bổ sung các field Auth cần thiết.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | khóa kỹ thuật |
| username | VARCHAR(100) | UNIQUE NOT NULL | login name |
| full_name | VARCHAR(255) | NOT NULL | hiển thị |
| email | VARCHAR(255) | NULL | nội bộ |
| phone | VARCHAR(50) | NULL | optional |
| user_type | VARCHAR(30) | NOT NULL | INTERNAL / CUSTOMER / SYSTEM |
| default_warehouse_id | UUID | NULL | optional |
| status | VARCHAR(20) | NOT NULL | ACTIVE / INACTIVE / LOCKED |
| is_active | BOOLEAN | NOT NULL DEFAULT true | quick filter |
| auth_version | BIGINT | NOT NULL DEFAULT 1 | tăng khi revoke-all / role change / password reset quan trọng |
| last_login_at | TIMESTAMP | NULL | audit helper |
| last_password_changed_at | TIMESTAMP | NULL | password policy |
| failed_login_count | INT | NOT NULL DEFAULT 0 | cacheable but DB truth |
| locked_until | TIMESTAMP | NULL | lockout |
| created_at | TIMESTAMP | NOT NULL | |
| created_by | UUID | NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by | UUID | NULL | |

**Index đề xuất:**
- unique(`username`)
- index(`status`,`is_active`)

**Giải thích:**
- `auth_version` là chìa khóa để revoke toàn bộ token/session theo user nhanh hơn.
- Khi password đổi hoặc role thay đổi nghiêm trọng, tăng `auth_version`.
- Token payload nên mang `auth_version`; nếu lệch DB hoặc Redis marker thì token mất hiệu lực.

---

### 9.3.2 `auth_local_credential`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | UNIQUE FK NOT NULL | → app_user |
| password_hash | TEXT | NOT NULL | Argon2id hash |
| password_algo | VARCHAR(30) | NOT NULL | ARGON2ID |
| password_changed_at | TIMESTAMP | NOT NULL | |
| must_change_password | BOOLEAN | NOT NULL DEFAULT false | admin reset |
| password_expires_at | TIMESTAMP | NULL | policy optional |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Lưu ý:**
- Không lưu salt riêng nếu thuật toán hash đã nhúng salt trong encoded string.
- Không log field này trong bất kỳ trace/debug nào.

---

### 9.3.3 `auth_password_history`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK NOT NULL |
| password_hash | TEXT | NOT NULL |
| changed_at | TIMESTAMP | NOT NULL |
| changed_by | UUID | NULL |
| change_reason | VARCHAR(30) | NOT NULL |

**Index:**
- index(`user_id`,`changed_at DESC`)

**Mục đích:**
- chặn dùng lại N mật khẩu gần nhất.
- trace admin reset vs user self-change.

---

### 9.3.4 `auth_session`

Đây là bảng runtime cốt lõi nhất của Auth.

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | session id |
| session_code | VARCHAR(40) | UNIQUE NOT NULL | human-readable/internal trace |
| user_id | UUID | FK NOT NULL | → app_user |
| channel | VARCHAR(20) | NOT NULL | WEB / MOBILE / API |
| device_id | VARCHAR(120) | NULL | mobile/web client generated id |
| device_name | VARCHAR(255) | NULL | optional |
| user_agent | TEXT | NULL | |
| ip_address | VARCHAR(64) | NULL | ipv4/ipv6 |
| login_at | TIMESTAMP | NOT NULL | |
| last_seen_at | TIMESTAMP | NOT NULL | |
| expires_at | TIMESTAMP | NOT NULL | absolute session expiry |
| is_current | BOOLEAN | NOT NULL DEFAULT true | active flag |
| revoked_at | TIMESTAMP | NULL | |
| revoked_by | UUID | NULL | self/admin/system |
| revoke_reason | VARCHAR(50) | NULL | LOGOUT / LOGOUT_ALL / USER_DEACTIVATED / ROLE_CHANGED |
| auth_version_at_issue | BIGINT | NOT NULL | compare with current user auth_version |
| selected_warehouse_id | UUID | NULL | current warehouse context |
| owner_scope_snapshot | JSONB | NULL | optional denormalized quick check |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Index đề xuất:**
- unique(`session_code`)
- index(`user_id`,`is_current`)
- index(`expires_at`)
- index(`revoked_at`)
- index(`channel`,`is_current`)

**Giải thích:**
- Session là nguồn sự thật cho refresh token và current-login management.
- Access token ngắn hạn có thể không cần persist từng token, nhưng session thì phải persist.

---

### 9.3.5 `auth_refresh_token`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| session_id | UUID | FK NOT NULL | → auth_session |
| token_hash | VARCHAR(255) | UNIQUE NOT NULL | hash của refresh token raw |
| token_family | VARCHAR(80) | NOT NULL | hỗ trợ rotation family |
| issued_at | TIMESTAMP | NOT NULL | |
| expires_at | TIMESTAMP | NOT NULL | |
| rotated_from_id | UUID | NULL FK | self-reference |
| is_revoked | BOOLEAN | NOT NULL DEFAULT false | |
| revoked_at | TIMESTAMP | NULL | |
| revoke_reason | VARCHAR(50) | NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Index đề xuất:**
- unique(`token_hash`)
- index(`session_id`,`is_revoked`)
- index(`expires_at`)
- index(`token_family`)

**Rotation rule đề xuất:**
- Mỗi lần refresh thành công:
  1. token refresh cũ bị revoke
  2. token refresh mới được issue
  3. nếu token cũ bị replay sau khi đã rotate thì revoke toàn bộ token family hoặc session

---

### 9.3.6 `auth_login_attempt`

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| username | VARCHAR(100) | NOT NULL |
| user_id | UUID | NULL |
| attempt_at | TIMESTAMP | NOT NULL |
| ip_address | VARCHAR(64) | NULL |
| user_agent | TEXT | NULL |
| channel | VARCHAR(20) | NOT NULL |
| success | BOOLEAN | NOT NULL |
| failure_reason | VARCHAR(50) | NULL |
| correlation_id | VARCHAR(80) | NULL |

**Mục đích:**
- forensics, lockout analysis, suspicious monitoring.

---

### 9.3.7 `auth_security_event`

| Field | Type | Constraint | Ghi chú |
|---|---|---|---|
| id | UUID | PK | |
| event_type | VARCHAR(50) | NOT NULL | LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT, TOKEN_REFRESH, ACCESS_DENIED... |
| severity | VARCHAR(20) | NOT NULL | INFO / WARN / HIGH |
| user_id | UUID | NULL | |
| session_id | UUID | NULL | |
| channel | VARCHAR(20) | NULL | |
| ip_address | VARCHAR(64) | NULL | |
| correlation_id | VARCHAR(80) | NULL | |
| event_payload | JSONB | NULL | redacted payload only |
| occurred_at | TIMESTAMP | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Lưu ý:**
- Không lưu password, token raw, secret.
- Có thể map sang audit framework chung của Module 1 nếu team muốn dùng một khung log thống nhất.

---

## 10. Security model và nguyên tắc enforce

## 10.1 Security context chuẩn hóa cho mọi request

Sau khi request đi qua Auth, hệ thống downstream phải nhận được một `SecurityContext` chuẩn hóa như sau:

```ts
interface SecurityContext {
  userId: string;
  username: string;
  sessionId: string;
  channel: 'WEB' | 'MOBILE' | 'API';
  authVersion: number;
  roleCodes: string[];
  permissionCodes: string[];
  warehouseIds: string[];
  selectedWarehouseId?: string | null;
  ownerScope?: string[];
  isCustomerViewer: boolean;
  correlationId: string;
}
```

### 10.2 Nguyên tắc guard

1. **JWT Auth Guard**: token hợp lệ, signature hợp lệ, chưa hết hạn.
2. **Session Validation**: session còn active, chưa revoke, auth_version còn đúng.
3. **Permission Guard**: request có đủ permission cần thiết.
4. **Scope Guard**: request có đúng warehouse/owner scope.
5. **Optional Channel Policy**: một số API chỉ cho WEB hoặc MOBILE.

### 10.3 Nguyên tắc scope

- `WH_MANAGER`, `WH_KEEPER`, `WB_OPERATOR`, `OPS_SUPER` thường bị giới hạn theo warehouse assignment.
- `CUST_VIEWER` bị giới hạn theo owner scope, và thường không được thấy cross-owner/cross-warehouse data nếu không được map.
- `ADMIN` có thể toàn quyền nhưng vẫn nên đi qua guard để audit rõ ràng.

---

## 11. Thiết kế token và session strategy

## 11.1 Access token

### Mục tiêu
- sống ngắn
- dùng để gọi API nhanh
- chứa context đủ dùng để giảm query lặp lại

### TTL khuyến nghị
- Web: 15 phút
- Mobile: 15 phút
- Internal API user-like session: 15 phút

### Payload tối thiểu

```json
{
  "sub": "user_id",
  "sid": "session_id",
  "usr": "username",
  "ch": "WEB",
  "av": 5,
  "wh": "selected_warehouse_id_or_null",
  "scp": "scope_version_or_short_marker",
  "iat": 1710000000,
  "exp": 1710000900
}
```

**Không nên nhét toàn bộ permission list quá dài vào token** nếu permission matrix lớn. Có 2 hướng:

- Hướng A: nhét role codes + scope marker, permission resolve từ cache/server-side.
- Hướng B: nhét permission list gọn nếu số lượng ít và revoke strategy đủ tốt.

**Khuyến nghị cho SWM:**
- access token mang role codes ngắn gọn + selected warehouse + auth_version + session_id.
- permission list resolve từ Redis cache hoặc DB cache service để khi đổi quyền có hiệu lực nhanh hơn.

## 11.2 Refresh token

### Mục tiêu
- sống dài hơn access token
- chỉ dùng để xin access token mới
- luôn gắn với một session cụ thể

### TTL khuyến nghị
- Web: 7 ngày
- Mobile: 14 ngày nếu business cần đăng nhập ít hơn

### Rule bắt buộc
- rotate mỗi lần refresh thành công
- lưu hash chứ không lưu raw value
- refresh token replay sau rotation phải bị xem là suspicious
- có thể revoke toàn session khi phát hiện replay

## 11.3 Session absolute expiry

Ngoài access token expiry và refresh token expiry, nên có **absolute session expiry**:
- Web: 7 ngày
- Mobile: 14 ngày
- Có thể thấp hơn nếu security yêu cầu cao hơn

---

## 12. Luồng xử lý kỹ thuật chính

## 12.1 Luồng login chuẩn

```text
1. Client gửi username + password + channel + device info
2. Auth service tìm user theo username
3. Kiểm tra user active/locked/inactive
4. Verify password hash
5. Nếu sai:
   - ghi auth_login_attempt fail
   - tăng failed counter / lockout nếu vượt ngưỡng
   - audit LOGIN_FAIL
   - trả lỗi generic
6. Nếu đúng:
   - reset failed counter
   - resolve warehouse assignments + owner scope + role codes
   - tạo auth_session
   - issue access token
   - issue refresh token
   - audit LOGIN_SUCCESS
   - trả profile cơ bản + tokens + warehouse options
```

### 12.1.1 Response login khuyến nghị

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "session_id": "...",
  "user": {
    "id": "...",
    "username": "...",
    "full_name": "...",
    "role_codes": ["WH_MANAGER"],
    "must_change_password": false
  },
  "warehouse_options": [
    { "id": "wh1", "code": "WH-A", "name": "Warehouse A" }
  ],
  "selected_warehouse_id": "wh1"
}
```

## 12.2 Luồng refresh token

```text
1. Client gửi refresh token
2. Backend hash token raw và tìm auth_refresh_token
3. Kiểm tra token tồn tại/chưa revoke/chưa expire
4. Nạp session tương ứng
5. Kiểm tra session còn active/chưa revoke/chưa expire
6. Kiểm tra user còn active và auth_version còn đúng
7. Revoke refresh token cũ
8. Issue access token mới + refresh token mới
9. Cập nhật last_seen_at của session
10. Audit TOKEN_REFRESH_SUCCESS
```

### Rule replay detection

Nếu refresh token đã bị rotate mà client gửi lại:
- audit `REFRESH_REPLAY_DETECTED`
- revoke toàn bộ session hiện tại
- buộc login lại

## 12.3 Luồng logout current session

```text
1. Client gọi logout với access token hiện tại
2. Backend tìm session hiện tại
3. Mark session revoked
4. Revoke mọi refresh token active của session đó
5. Audit LOGOUT
6. Trả 204/no-content
```

## 12.4 Luồng logout all sessions

```text
1. User hoặc admin gọi logout-all
2. Tăng app_user.auth_version hoặc revoke toàn bộ session active
3. Mark các session active là revoked
4. Revoke refresh tokens liên quan
5. Audit LOGOUT_ALL
```

## 12.5 Luồng change password

```text
1. User gửi old_password + new_password
2. Verify old_password
3. Kiểm tra password policy
4. Kiểm tra không trùng password history gần nhất
5. Update password hash
6. Ghi password history
7. Tăng auth_version
8. Revoke các session khác hoặc toàn bộ session theo policy
9. Audit PASSWORD_CHANGED
```

**Khuyến nghị:** revoke tất cả session khác, giữ hoặc không giữ session hiện tại tùy policy. Với go-live an toàn, nên revoke tất cả và buộc login lại.

## 12.6 Luồng warehouse selection / switch

### Khi nào cần
- User có nhiều warehouse assignments
- Cần đổi kho thao tác trong cùng phiên

### Rule
- Chỉ được chọn warehouse nằm trong assignment của user
- Cập nhật `auth_session.selected_warehouse_id`
- Access token mới nên được issue lại để token và session đồng bộ context
- Audit `WAREHOUSE_CONTEXT_SWITCHED`

---

## 13. Password policy khuyến nghị

## 13.1 Policy baseline

- Tối thiểu 8 ký tự
- Khuyến nghị 10–12 ký tự nếu nội bộ chấp nhận
- Có ít nhất 1 chữ hoa
- Có ít nhất 1 chữ thường
- Có ít nhất 1 số
- Có ít nhất 1 ký tự đặc biệt
- Không được chứa username đầy đủ
- Không được trùng N mật khẩu gần nhất, khuyến nghị N = 5

## 13.2 Lockout policy baseline

- 5 lần sai liên tiếp → khóa tạm 15 phút
- Admin có thể unlock thủ công
- Sau login thành công → reset failed count

## 13.3 Password expiry

Phase 1 có thể để optional. Nếu business yêu cầu:
- 90 ngày hết hạn
- nhắc trước 7 ngày

---

## 14. Authorization design chi tiết

## 14.1 Permission resolution strategy

Permission hiệu lực = hợp của:
- role permissions từ Module 1
- user active roles
- warehouse-specific grants nếu có
- owner/customer scope
- channel rule

### Khuyến nghị kỹ thuật

Dùng `authorization.service.ts` với flow:

```text
1. lấy active roles của user
2. lấy permission codes theo roles
3. lấy data scopes theo user_role / role_scope_rule
4. build AuthorizationSnapshot
5. cache AuthorizationSnapshot trong Redis ngắn hạn
6. invalidate cache khi role/user assignment thay đổi
```

## 14.2 Permission decorator pattern

Ví dụ:

```ts
@RequirePermission('receipt.create')
@Post('/receipts')
createReceipt() {}
```

## 14.3 Scope enforcement pattern

Ví dụ:

- Query data nội bộ:
  - inject selected warehouse từ session nếu role bị scope theo warehouse
- Query cho `CUST_VIEWER`:
  - bắt buộc apply `owner_id IN securityContext.ownerScope`

**Golden rule:** scope filter phải được áp ở backend repository/query builder, không chỉ ở frontend query param.

---

## 15. API design chi tiết cho Module Auth

Dưới đây là bộ API khuyến nghị đủ dùng cho Phase 1.

## 15.1 `POST /auth/login`

### Mục đích
Xác thực user và tạo session mới.

### Request

```json
{
  "username": "ops.manager",
  "password": "<secret>",
  "channel": "WEB",
  "device_id": "web-browser-uuid",
  "device_name": "Chrome on Windows",
  "timezone": "Asia/Bangkok"
}
```

### Backend làm gì
- validate payload
- rate limit
- tìm user
- kiểm tra active/locked
- verify password
- resolve roles/scopes/warehouse options
- tạo session + refresh token
- issue access token
- ghi login attempt + audit

### Response
- tokens
- session_id
- user profile tóm tắt
- warehouse options
- selected warehouse hiện tại

### Idempotency
- không cần idempotency key
- login là action không idempotent tuyệt đối; mỗi lần có thể tạo session mới

### Lỗi thường gặp
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_LOCKED`
- `AUTH_ACCOUNT_INACTIVE`
- `AUTH_CHANNEL_NOT_ALLOWED`

---

## 15.2 `POST /auth/refresh`

### Mục đích
Đổi refresh token lấy access token mới và refresh token mới.

### Request

```json
{
  "refresh_token": "..."
}
```

### Backend làm gì
- hash token
- tìm refresh token row
- validate session/user
- rotate token
- issue token mới
- audit refresh

### Response

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 900,
  "session_id": "..."
}
```

### Idempotency
- không dùng idempotency key
- refresh token rotation tự nó là anti-replay flow

### Lỗi thường gặp
- `AUTH_REFRESH_INVALID`
- `AUTH_REFRESH_EXPIRED`
- `AUTH_REFRESH_REPLAY_DETECTED`

---

## 15.3 `POST /auth/logout`

### Mục đích
Logout session hiện tại.

### Request
- dùng access token hiện tại

### Backend làm gì
- revoke session hiện tại
- revoke refresh tokens active của session
- audit logout

### Response
- `204 No Content`

### Idempotency
- gần như idempotent theo session hiện tại
- gọi lại nhiều lần vẫn nên trả thành công hoặc 204

---

## 15.4 `POST /auth/logout-all`

### Mục đích
Thu hồi toàn bộ session của chính user.

### Backend làm gì
- tăng auth_version hoặc revoke tất cả session active
- revoke refresh tokens liên quan
- audit logout-all

### Response
- `204 No Content`

---

## 15.5 `GET /auth/me`

### Mục đích
Lấy hồ sơ người dùng hiện tại và security context cơ bản.

### Response mẫu

```json
{
  "id": "...",
  "username": "ops.manager",
  "full_name": "Ops Manager",
  "role_codes": ["OPS_SUPER"],
  "selected_warehouse_id": "wh1",
  "warehouse_options": [
    { "id": "wh1", "code": "HCM-01", "name": "HCM Main" }
  ],
  "owner_scope": [],
  "channel": "WEB",
  "must_change_password": false
}
```

### Dùng để làm gì
- bootstrap app sau reload
- hiển thị header user info
- kiểm tra current context

---

## 15.6 `GET /auth/me/permissions`

### Mục đích
Lấy permission snapshot cho frontend bootstrap.

### Lưu ý
- frontend chỉ dùng để render UX
- backend vẫn phải kiểm lại ở guard

### Response gợi ý

```json
{
  "role_codes": ["WH_MANAGER"],
  "permissions": [
    "receipt.view",
    "receipt.create",
    "shipment.approve",
    "inventory.adjust.view"
  ],
  "warehouse_scope": ["wh1", "wh2"],
  "owner_scope": []
}
```

---

## 15.7 `POST /auth/change-password`

### Mục đích
Cho user đổi mật khẩu.

### Request

```json
{
  "old_password": "old",
  "new_password": "NewStrong@123",
  "confirm_password": "NewStrong@123"
}
```

### Backend làm gì
- verify old password
- validate password policy
- check history
- update hash
- bump auth_version
- revoke session theo policy
- audit

### Lỗi thường gặp
- `AUTH_OLD_PASSWORD_INVALID`
- `AUTH_PASSWORD_POLICY_VIOLATION`
- `AUTH_PASSWORD_REUSE_NOT_ALLOWED`

---

## 15.8 `POST /auth/select-warehouse`

### Mục đích
Chọn hoặc đổi kho làm việc hiện tại.

### Request

```json
{
  "warehouse_id": "wh2"
}
```

### Backend làm gì
- kiểm tra warehouse thuộc scope user
- update auth_session.selected_warehouse_id
- issue access token mới hoặc trả marker để client refresh token
- audit switch context

### Response

```json
{
  "selected_warehouse_id": "wh2",
  "access_token": "..."
}
```

---

## 15.9 `GET /auth/sessions`

### Mục đích
Xem danh sách session đang active của user hiện tại.

### Response
- session_id
- channel
- device_name
- ip
- login_at
- last_seen_at
- current_session

### Dùng để làm gì
- user tự quản lý thiết bị đang đăng nhập
- hỗ trợ support/security review

---

## 15.10 `POST /auth/sessions/{sessionId}/revoke`

### Mục đích
Thu hồi một session cụ thể của user hiện tại hoặc của admin.

### Backend làm gì
- kiểm tra quyền
- revoke session + refresh tokens liên quan
- audit `SESSION_REVOKED`

---

## 15.11 `POST /admin/auth/users/{userId}/force-reset-password`

### Mục đích
Admin reset mật khẩu cho user.

### Backend làm gì
- kiểm tra quyền admin
- set password hash mới hoặc tạm thời
- `must_change_password = true`
- bump auth_version
- revoke all sessions
- audit `ADMIN_FORCE_PASSWORD_RESET`

### Phase 1 note
- Có thể dùng password tạm và truyền ngoài kênh an toàn nội bộ.
- Chưa cần self-service email link nếu hạ tầng chưa có.

---

## 15.12 `POST /admin/auth/users/{userId}/unlock`

### Mục đích
Admin mở khóa account bị lock.

### Backend làm gì
- reset failed counter
- clear locked_until
- audit `ACCOUNT_UNLOCKED`

---

## 15.13 `POST /admin/auth/users/{userId}/revoke-all-sessions`

### Mục đích
Admin thu hồi toàn bộ session của một user.

### Dùng khi nào
- user nghỉ việc
- nghi ngờ lộ credential
- đổi quyền quan trọng
- deactivate user

---

## 16. Hướng build chi tiết từ Database → Backend

## 16.1 Tầng database

### Cần làm gì
- tạo schema user/session/refresh/security event
- unique index cho username, token_hash
- index cho active session lookup
- migration seed role-user baseline nếu có
- trigger hoặc application rule cho `updated_at`

### Điểm chú ý
- refresh token hash lookup phải nhanh
- cleanup data hết hạn cần background job
- security event/log tables có thể partition theo tháng khi volume tăng

## 16.2 Tầng repository

### Cần có repository chính
- `UserAuthRepository`
- `SessionRepository`
- `RefreshTokenRepository`
- `LoginAttemptRepository`
- `SecurityEventRepository`

### Quy tắc
- repository chỉ query/CRUD
- không chứa logic password policy hoặc guard logic phức tạp

## 16.3 Tầng service

### `authentication.service.ts`
Chịu trách nhiệm:
- login
- verify credential
- init session creation flow

### `session.service.ts`
Chịu trách nhiệm:
- create session
- revoke session
- revoke all sessions
- update last_seen
- selected warehouse context

### `token.service.ts`
Chịu trách nhiệm:
- sign access token
- generate raw refresh token
- hash refresh token
- rotate refresh token
- parse/verify token payload

### `authorization.service.ts`
Chịu trách nhiệm:
- load roles
- resolve permissions
- resolve warehouse scope
- resolve owner scope
- build authorization snapshot

### `password-policy.service.ts`
Chịu trách nhiệm:
- validate complexity
- check reuse history
- enforce expiry / must-change policy

### `lockout.service.ts`
Chịu trách nhiệm:
- tăng failed count
- set locked_until
- clear lock after success

### `security-audit.service.ts`
Chịu trách nhiệm:
- ghi event auth
- ghi denied access
- ghi admin security actions

## 16.4 Tầng guard / interceptor

### `JwtAuthGuard`
- parse bearer token
- verify signature/expiry
- load session/user basics
- attach current user context

### `PermissionGuard`
- đọc metadata `@RequirePermission(...)`
- gọi `authorization.service`
- deny nếu thiếu quyền

### `WarehouseScopeGuard`
- kiểm tra selected warehouse hợp lệ cho request
- có thể inject vào filter downstream

### `OwnerScopeGuard`
- đặc biệt cho `CUST_VIEWER`
- deny hoặc auto-filter theo owner scope

### `ActivityInterceptor` *(optional but recommended)*
- cập nhật `last_seen_at` theo throttled strategy
- tránh update DB mọi request; có thể throttle 1–5 phút/lần/session

---

## 17. Permission caching và revoke strategy

## 17.1 Vì sao cần cache

Mọi request protected đều cần role/permission/scope resolution. Nếu lần nào cũng join DB sâu sẽ tốn tài nguyên.

## 17.2 Cache gợi ý

Redis key ví dụ:
- `authz:user:{userId}:v:{authVersion}`

Value:
- role codes
- permission codes
- warehouse scope
- owner scope
- generated_at

## 17.3 Invalidate cache khi nào

- role user thay đổi
- user deactivate/activate
- permission matrix thay đổi liên quan
- owner scope thay đổi
- warehouse assignment thay đổi
- auth_version tăng

## 17.4 Revoke strategy khuyến nghị

Dùng **2 lớp bảo vệ**:

### Lớp 1 — `auth_version`
- token mang `av`
- DB user có `auth_version`
- lệch version => token invalid

### Lớp 2 — session state
- session row có `revoked_at`
- refresh/session validation check nhanh qua cache hoặc DB

### Redis fast marker optional
- `auth:session:revoked:{sessionId} = 1`
- giúp chặn rất nhanh token cũ mà không cần hit DB nhiều

---

## 18. Idempotency cho Module Auth

Không phải mọi API Auth đều cần idempotency key.

### 18.1 API không cần idempotency key
- login
- refresh
- get me
- get sessions

### 18.2 API nên thiết kế idempotent theo state
- logout
- logout all
- revoke session
- unlock account
- revoke all sessions admin action

### 18.3 API có side effect admin nên cân nhắc idempotency key
- force-reset-password
- deactivate/reactivate user nếu expose qua auth admin API

---

## 19. Audit và security event design

## 19.1 Các event bắt buộc phải audit

1. login success
2. login fail
3. account locked
4. token refresh success/fail
5. logout
6. logout all
7. password changed
8. admin reset password
9. session revoked
10. access denied do thiếu permission
11. access denied do sai scope
12. warehouse context switch
13. user deactivated causing revoke
14. refresh replay detected

## 19.2 Event payload tối thiểu

- event_type
- occurred_at
- user_id (nếu có)
- username (nếu login fail theo username)
- session_id (nếu có)
- channel
- ip_address
- user_agent
- correlation_id
- reason/error_code
- module/resource/action nếu access denied

## 19.3 Redaction rules

Không bao giờ ghi vào log:
- password raw
- access token raw
- refresh token raw
- secret key

---

## 20. Validation matrix kỹ thuật quan trọng

## 20.1 Login
- username không tồn tại → trả lỗi generic
- password sai → lỗi generic, tăng fail count
- account inactive → không cho login
- account locked → không cho login
- channel không hợp lệ cho role → deny

## 20.2 Refresh
- token không tồn tại → deny
- token revoked → deny
- token expired → deny
- session revoked → deny
- user inactive → deny
- auth_version mismatch → deny

## 20.3 Warehouse switch
- warehouse không thuộc scope → deny
- warehouse inactive → deny

## 20.4 Permission check
- thiếu permission → 403
- đủ permission nhưng sai owner scope → 403 hoặc query auto-filter tùy use case
- đủ permission nhưng session chưa có warehouse context trong API bắt buộc kho → 400/403 theo policy

---

## 21. Mapping Module Auth với Module 1 → Module 11

## 21.1 Mapping với Module 1 — Foundation & Governance

Đây là mapping quan trọng nhất.

Auth dùng từ Module 1:
- user master
- role catalog
- permission catalog
- user-role mapping
- role-permission mapping
- reason code nếu có admin security actions cần reason
- audit baseline chung

Auth trả ngược giá trị cho Module 1 và toàn hệ:
- runtime security context
- permission enforcement
- session revoke effect
- denied access audit

## 21.2 Mapping với Module 2 — Master Data

Auth không sở hữu master data nghiệp vụ nhưng cần consume:
- warehouse master để validate warehouse context
- owner mapping cho `CUST_VIEWER` và owner scope
- possibly active warehouse list for user context response

Nguyên tắc:
- Auth chỉ dùng M2 để validate scope/context, không sở hữu warehouse master.

## 21.3 Mapping với Module 3 — Inventory Core Engine

M3 cần Auth cho:
- ai được post inventory
- ai được reverse inventory
- ai được run reconciliation
- ai được query cross-owner/on-hand sensitive data

Auth phải giúp M3 enforce:
- permission `inventory.post`, `inventory.reverse`, `inventory.reconcile.run`
- selected warehouse context
- owner scope if applicable

## 21.4 Mapping với Module 4 — Inbound Operations

M4 dùng Auth để kiểm:
- ai được confirm receipt
- ai được manual weight
- ai được cancel receipt
- ai được override match/OCR
- warehouse context đúng kho nhập hàng

Role hay gặp:
- `WB_OPERATOR`
- `WH_KEEPER`
- `WH_MANAGER`
- `OPS_SUPER`

## 21.5 Mapping với Module 5 — Outbound Operations

M5 dùng Auth để kiểm:
- ai được tạo shipment
- ai được allocate
- ai được nhập manual gross/tare
- ai được approve `PENDING_APPROVAL`
- ai được reverse shipment

Auth đặc biệt quan trọng ở outbound vì:
- liên quan shrinkage, commercial dispute, manual override, shipment release.

## 21.6 Mapping với Module 6 — Inventory Control

M6 là module nhạy cảm nhất sau billing về mặt quyền.

Auth phải hỗ trợ:
- permission chặt cho adjustment, status change, cycle count approve
- warehouse scope đúng nơi thao tác
- owner segregation
- audit rõ người thực hiện

## 21.7 Mapping với Module 7 — Work Execution & Mobile Operations

M7 dùng Auth để:
- login mobile
- claim/start/complete work theo role
- offline sync gắn đúng session/user/channel
- manager override complete

Auth cần hỗ trợ channel-aware policies:
- một số action chỉ web/supervisor
- mobile session theo device rõ ràng

## 21.8 Mapping với Module 8 — Weighbridge, OCR & Integration

M8 có 2 nhóm actor:
- human operator dùng web/mobile
- local agent/integration channel

Phase 1 Auth nên hỗ trợ tốt cho human operator trước. Với integration account:
- chừa đường service account phase sau
- hoặc dùng internal secret channel riêng nhưng vẫn phải traceable

M8 cần Auth cho:
- ai được xem dashboard integration
- ai được requeue retry
- ai được manual confirm OCR corrections

## 21.9 Mapping với Module 9 — VAS / Bagging

M9 dùng Auth để:
- ai được create/confirm/cancel/complete WO
- ai được ghi session bagging nếu dùng mobile/web
- ai được override variance/process loss reason

Auth phải đảm bảo owner + warehouse scope đúng vì VAS có ảnh hưởng inventory và billing.

## 21.10 Mapping với Module 10 — Billing & Commercial Control

M10 là vùng nhạy cảm nhất về doanh thu và chứng từ thương mại.

Auth phải bảo vệ:
- contract create/update
- DN generate/review/approve/lock
- ERP push retry
- exception resolve
- `CUST_VIEWER` chỉ thấy DN LOCKED của owner mình

## 21.11 Mapping với Module 11 — Reporting, Audit & Go-Live Control

M11 là module read-heavy nhưng vẫn rất nhạy cảm.

Auth phải hỗ trợ:
- owner scope cho customer viewer
- warehouse scope cho dashboard nội bộ
- permission cho export, reconciliation run, go-live sign-off
- deny cross-owner leakage ở report queries

---

## 22. API-to-module impact summary

| API | Mục đích | Module downstream bị ảnh hưởng |
|---|---|---|
| `POST /auth/login` | tạo session, cấp token | tất cả modules dùng security context |
| `POST /auth/refresh` | duy trì phiên | tất cả modules |
| `POST /auth/logout` | thu hồi session hiện tại | tất cả modules |
| `POST /auth/logout-all` | revoke toàn bộ session | tất cả modules |
| `POST /auth/change-password` | đổi mật khẩu + revoke | tất cả modules |
| `POST /auth/select-warehouse` | đổi warehouse context | M2–M11 query/command scope |
| `GET /auth/me/permissions` | bootstrap UX permission | frontend của M4–M11 |
| `POST /admin/auth/users/{id}/revoke-all-sessions` | ngắt user khỏi hệ thống | tất cả modules |
| `POST /admin/auth/users/{id}/force-reset-password` | control security | tất cả modules |

---

## 23. Error code đề xuất

| Code | Ý nghĩa |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | sai username hoặc password |
| `AUTH_ACCOUNT_INACTIVE` | tài khoản không hoạt động |
| `AUTH_ACCOUNT_LOCKED` | tài khoản đang bị khóa |
| `AUTH_CHANNEL_NOT_ALLOWED` | role/user không được dùng channel này |
| `AUTH_TOKEN_INVALID` | access token không hợp lệ |
| `AUTH_TOKEN_EXPIRED` | access token hết hạn |
| `AUTH_SESSION_REVOKED` | session đã bị revoke |
| `AUTH_REFRESH_INVALID` | refresh token không hợp lệ |
| `AUTH_REFRESH_EXPIRED` | refresh token hết hạn |
| `AUTH_REFRESH_REPLAY_DETECTED` | phát hiện replay refresh token |
| `AUTH_PERMISSION_DENIED` | thiếu permission |
| `AUTH_SCOPE_DENIED` | vượt owner/warehouse scope |
| `AUTH_WAREHOUSE_CONTEXT_REQUIRED` | cần chọn kho trước |
| `AUTH_WAREHOUSE_CONTEXT_INVALID` | kho chọn không thuộc scope |
| `AUTH_PASSWORD_POLICY_VIOLATION` | mật khẩu mới không đạt policy |
| `AUTH_PASSWORD_REUSE_NOT_ALLOWED` | mật khẩu trùng lịch sử |
| `AUTH_OLD_PASSWORD_INVALID` | mật khẩu cũ không đúng |

---

## 24. Triển khai migration và seed dữ liệu

## 24.1 Seed bắt buộc cho go-live

1. admin account đầu tiên
2. baseline roles từ Module 1
3. baseline permissions từ Module 1
4. user-role assignment mẫu
5. warehouse assignments mẫu
6. lockout/password policy config

## 24.2 Config khuyến nghị qua env

- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `SESSION_ABSOLUTE_TTL_DAYS`
- `PASSWORD_HISTORY_COUNT`
- `LOGIN_MAX_FAILED_ATTEMPTS`
- `LOGIN_LOCK_MINUTES`
- `REDIS_AUTH_CACHE_TTL_SECONDS`

---

## 25. Background jobs nên có

### 25.1 Expire session job
- đánh dấu session hết hạn
- dọn refresh tokens quá hạn

### 25.2 Cleanup login attempts job
- dọn hoặc archive login attempts cũ theo retention

### 25.3 Security anomaly aggregation job *(optional but useful)*
- gom failed login nhiều lần cùng IP/user để cảnh báo

### 25.4 Cache invalidation worker
- khi role/assignment thay đổi từ Module 1, bắn event invalidate authz cache

---

## 26. Testing strategy chi tiết cho dev intern

## 26.1 Unit tests bắt buộc

- verify password hash success/fail
- login success/fail
- lockout after N failed attempts
- refresh token rotation
- refresh replay detection
- permission resolution
- warehouse scope resolution
- owner scope resolution
- change password history check

## 26.2 Integration tests bắt buộc

- login → call protected API → logout → token bị chặn
- login → refresh → token cũ refresh lại bị replay detect
- change password → token cũ không dùng được nữa
- deactivate user → token/session bị chặn
- switch warehouse → query sai kho bị deny
- `CUST_VIEWER` chỉ thấy owner của mình

## 26.3 Security regression tests

- brute force basic rate limit
- JWT tampered signature
- access token expired
- refresh token revoked
- session revoked but access token still within exp
- role change mid-session
- deny access with missing permission

---

## 27. Triển khai thực tế theo phase đề xuất

## Phase A — nền tối thiểu
- bảng user/credential/session/refresh
- login/logout/refresh
- JWT guard
- permission guard cơ bản
- audit login

## Phase B — bảo mật đủ go-live
- password change/reset
- lockout
- logout all / revoke all
- warehouse switch
- owner scope guard
- permission cache + invalidation

## Phase C — ổn định vận hành
- session inquiry
- admin security APIs
- replay detection nâng cao
- security metrics/dashboard feed
- SSO-ready abstraction

---

## 28. Những quyết định kỹ thuật nên chốt ngay để tránh code sai từ đầu

1. **Dùng session table thật**, không làm JWT stateless tuyệt đối.
2. **Dùng refresh token rotation**, không tái sử dụng một refresh token lâu dài.
3. **Dùng `auth_version` để revoke-all nhanh.**
4. **Permission resolution nằm server-side**, không nhét toàn bộ quyền cố định vào frontend.
5. **Warehouse context là phần của session**, không phải chỉ là query param tự do.
6. **Owner scope phải enforce ở repository/query layer.**
7. **Argon2id cho password hashing.**
8. **Không lưu raw refresh token trong DB.**
9. **Phải có audit cho denied access và admin security actions.**
10. **Auth consume Module 1, không tách thành governance model riêng.**

---

## 29. Kết luận

Module Auth của SWM phải được xem là **shared security platform module**, không phải tính năng phụ. Dưới góc nhìn kỹ thuật, nếu làm đúng ngay từ đầu thì Auth sẽ trở thành lớp nền rất mạnh cho toàn bộ Module 1 → 11:

- Module 1 có nơi thực thi runtime cho governance.
- Module 2 → 11 có cùng một security context chuẩn hóa.
- Web/Mobile/API có chung cơ chế kiểm quyền và session control.
- Dev intern có mẫu kiến trúc rõ ràng để code mà không bị rải logic bảo mật lung tung.
- Hệ thống sẵn sàng mở rộng lên SSO/MFA/service account ở phase sau mà không phải phá schema cốt lõi.

Golden rule cuối cùng cho team dev:

> **UI có thể ẩn nút, nhưng chỉ backend guard mới có quyền cho hoặc chặn request.**

