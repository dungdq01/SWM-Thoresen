# Auth Module — Code Review Report

**Score:** 8.0 / 10
**Verdict:** CONDITIONAL PASS
**Review date:** 2026-03-09
**Scope:** ~3,021 lines across 3 locations (modules/auth, modules/foundation/auth, common/guards+decorators)

---

## Architecture Overview

The Auth module implements a complete authentication & authorization system:

```
Login → JWT (access 15m) + Refresh Token (7d/14d) → Session → Logout
          ↓                     ↓
     AuthGuard            Token Rotation
     (verify JWT)         (family-based replay detection)
          ↓
     PermissionGuard
     (check permissionCodes, warehouse scope, owner scope)
```

**Components:**
- **5 Controllers** — auth (login/refresh/logout), profile (me/permissions/warehouse), password (change), session (list/revoke), admin-auth (force-reset/unlock/revoke)
- **6 Services** — authentication, token, session, lockout, password-policy, security-audit
- **7 Repositories** — user-auth, credential, session, refresh-token, login-attempt, password-history, security-event
- **Interfaces** — SecurityContext, TokenPayload, RefreshTokenPayload, LoginResult, RefreshResult, SessionInfo, UserProfile, PermissionSnapshot

---

## What Works Excellently

### 1. Token Family Rotation + Replay Detection (authentication.service.ts L185-307)
```typescript
if (refreshToken.isRevoked) {
  // Replay detected → revoke ENTIRE token family + session
  await this.refreshTokenRepository.revokeByTokenFamily(refreshToken.tokenFamily, 'REPLAY_DETECTED');
  await this.sessionService.revokeSession(sessionId, null, 'REFRESH_REPLAY_DETECTED');
  // Log HIGH severity security event
}
```
- If attacker steals and uses old refresh token → entire family revoked, session killed
- Legitimate user forced to re-login (detects compromise)
- Security event logged with HIGH severity

### 2. Argon2id Password Hashing (password-policy.service.ts L57-63)
```typescript
return argon2.hash(password, {
  type: argon2.argon2id,  // memory-hard + GPU-resistant
  memoryCost: 65536,       // 64 MB
  timeCost: 3,
  parallelism: 4,
});
```
- Industry best practice (OWASP recommended)
- Parameters appropriate for server-side hashing

### 3. Account Lockout (lockout.service.ts)
- Configurable: `LOGIN_MAX_FAILED_ATTEMPTS` (default 5), `LOGIN_LOCK_MINUTES` (default 15)
- All inside `$transaction`: attempt record + increment counter + lock + security event
- Admin unlock with audit trail (`authAccountLock` table)
- Successful login resets counter

### 4. Password Policy + History (password-policy.service.ts)
- Min length, upper/lower/digit/special required
- No username in password
- History check: last N passwords cannot be reused (argon2.verify each)

### 5. AuthVersion Invalidation (session.service.ts L184-192)
- Password change → `incrementAuthVersion` → all existing sessions invalidated
- Refresh validates `session.authVersionAtIssue !== user.authVersion`
- Clean security boundary

### 6. Session Management
- Per-device tracking (deviceId, deviceName, ipAddress, userAgent)
- `getActiveSessions()` shows all with `isCurrent` flag
- User can revoke individual sessions (only own sessions)
- Warehouse context switching with scope validation

### 7. $transaction Consistency
Every multi-step write uses `$transaction`:
- Login: attempt record + counter reset + lastLogin update
- Refresh: revoke old token + create new + security event
- Change password: update hash + history + authVersion + security event
- Session create/revoke
- Account lock/unlock

### 8. Security Audit Trail (security-audit.service.ts)
Typed events: LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT, ACCESS_DENIED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED, PASSWORD_CHANGED, PASSWORD_RESET_ADMIN, TOKEN_REFRESH, REFRESH_REPLAY_DETECTED, SESSION_REVOKED, LOGOUT_ALL, WAREHOUSE_CONTEXT_SWITCHED

---

## Issues Found

### CRITICAL

| # | File | Line | Issue |
|---|------|------|-------|
| CR-1 | foundation/auth/auth.guard.ts | L13-14 | **AuthGuard is a stub**: `// TODO: Implement JWT validation logic` → `return !!request.user`. No JWT verification, no user resolution. ALL modules importing from foundation/auth (M8-M11) use this stub. |
| CR-2 | Multiple locations | — | **Two conflicting guard systems with incompatible APIs** — see table below |

**Guard System Conflict:**

| Aspect | Foundation (`modules/foundation/auth/`) | Common (`common/guards/`) |
|--------|----------------------------------------|---------------------------|
| Used by | M8, M9, M10, M11 controllers | Auth module controllers |
| AuthGuard | `return !!request.user` (STUB) | JWT verify + `resolveRequestUser()` (REAL) |
| Permission metadata key | `'permissions'` (plural) | `'permission'` (singular) |
| Permission decorator | `Permission(...perms: string[])` (variadic) | `Permission(perm: string)` (single) |
| PermissionGuard checks | `user.permissions` (undefined on RequestUser!) | `user.permissionCodes` (correct) |
| CurrentUser return | `request.user \|\| { id: 'system' }` | `request.user as RequestUser` |

**Impact:** All modules (M8-M11) importing from `foundation/auth` have:
1. No real JWT validation (stub AuthGuard just checks `!!request.user`)
2. Permission checks that read `user.permissions` which doesn't exist on `RequestUser` — check either always passes (no permission set on route) or always fails (field undefined)

### HIGH

| # | File | Line | Issue |
|---|------|------|-------|
| HI-1 | common/guards/auth.guard.ts | L73-76 | **JWT payload field mismatch**: Guard reads `payload.userCode` but TokenService generates JWT with `ucd` key (abbreviated). In production (no bypass), `'userCode' in payload` → false → `userCode = null` → throws `UnauthorizedException`. |
| HI-2 | admin-auth.controller.ts | L44,110,143 | **`@RequirePermission` decorator has NO guard**: Uses metadata key `'requirePermission'` but NO guard reads this key. The permission decorations are **no-ops**. Any authenticated user can force-reset passwords, unlock accounts, revoke sessions. |
| HI-3 | token.service.ts | L14 | **JWT secret fallback**: `this.configService.get('JWT_SECRET') \|\| 'dev-secret-change-me'`. If env var missing in production, tokens are signed with a known predictable secret. Should throw on missing secret. |
| HI-4 | reporting.module.ts | L29 | **ReportingModule doesn't import FoundationModule**: Guards (`AuthGuard`, `PermissionGuard`) are `@Injectable()` and need to be in the dependency injection scope. Without importing FoundationModule (or providing them), guards may fail to instantiate at runtime. |

### MEDIUM

| # | File | Line | Issue |
|---|------|------|-------|
| MD-1 | auth.controller.ts | L29-34 | **No rate limiting on login endpoint**: `@Public()` + no throttle guard. Brute force protection relies solely on account lockout (per-user), but attacker can enumerate usernames or DoS the lockout. |
| MD-2 | profile.controller.ts | L32-75 | **Profile controller queries DB for every /me call**: No caching. High-traffic endpoint. Consider embedding basic profile data in JWT claims. |
| MD-3 | authentication.service.ts | L321-323 | **Redundant DB call in changePassword**: `findById()` then `findByUsernameWithCredential(username)` — two queries when one would suffice. |
| MD-4 | admin-auth.controller.ts | L51-52 | **Admin uses `(req as any).user`**: Should use `@CurrentUser()` decorator for type safety, consistent with other modules. |
| MD-5 | auth.controller.ts | — | **No Swagger decorators**: No `@ApiTags`, `@ApiOperation`, `@ApiResponse` on auth endpoints. |
| MD-6 | internal-api.guard.ts | L14 | **Hardcoded fallback API key**: `this.validApiKeys = apiKey ? [apiKey] : ['internal-service-key']`. Known default key in production is a security risk. |

---

## Score Breakdown

| Category | Weight | Score | Note |
|----------|--------|-------|------|
| Auth Flow (login/refresh/logout) | 20% | 10/10 | Complete, secure, well-structured |
| Token Security | 15% | 8/10 | Family rotation excellent, but JWT field mismatch + secret fallback |
| Password Security | 10% | 10/10 | Argon2id, policy enforcement, history check |
| Session Management | 10% | 10/10 | Multi-device, revocation, authVersion |
| Account Lockout | 10% | 9/10 | Solid, configurable, but no rate limiting |
| Guard System Integrity | 15% | 3/10 | Two conflicting systems, stub foundation, field mismatches |
| Admin Operations | 10% | 5/10 | Good logic, but RequirePermission is no-op |
| Audit Trail | 5% | 10/10 | Comprehensive typed events |
| $transaction | 5% | 10/10 | Consistently used everywhere |

**Weighted total: 8.0 / 10**

---

## Prioritized Fix List

### Must Fix Before Go-Live

1. **CR-1 + CR-2: Unify guard system** — Choose ONE set of guards (recommend `common/guards/`):
   - Update foundation guards to re-export from common, OR
   - Change all module imports from `foundation/auth` to `common/guards`
   - Ensure single `PERMISSION_KEY` constant
   - Ensure PermissionGuard reads `user.permissionCodes` (not `user.permissions`)

2. **HI-1: Fix JWT payload field mapping** — Common AuthGuard should read `payload.ucd` instead of `payload.userCode`:
   ```typescript
   const userCode = typeof payload === 'object' && payload !== null && 'ucd' in payload
     ? String(payload.ucd) : null;
   ```
   Or change TokenService to use full key names.

3. **HI-2: Add PermissionGuard to AdminAuthController** — Either:
   - Add `@UseGuards(AuthGuard, PermissionGuard)` at class level + change `@RequirePermission` to `@Permission`
   - Or create a `RequirePermissionGuard` that reads `'requirePermission'` metadata

4. **HI-3: Remove JWT secret fallback** — Throw error if `JWT_SECRET` not configured:
   ```typescript
   this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
   ```

5. **HI-4: ReportingModule needs FoundationModule import** (or guards need to be global/provided)

### Should Fix

6. **MD-1: Add rate limiting** — `@nestjs/throttler` on login/refresh endpoints
7. **MD-5: Add Swagger decorators** to all auth controllers
8. **MD-6: Remove hardcoded internal API key fallback**

---

## Architecture Recommendation

```
BEFORE (current - broken):
├── common/guards/         ← Real guards (JWT verify, permissionCodes)
│   ├── auth.guard.ts      ← Used by Auth module only
│   └── permission.guard.ts
├── common/decorators/     ← Multiple decorator variants
│   ├── permission.decorator.ts      (key: 'permission', single string)
│   ├── require-permission.decorator.ts (key: 'requirePermission', NO guard!)
│   └── current-user.decorator.ts
└── foundation/auth/       ← Stub guards (!!request.user, wrong field names)
    ├── auth.guard.ts      ← Used by M8-M11 (STUB!)
    ├── permission.guard.ts ← Checks user.permissions (WRONG field)
    └── permission.decorator.ts (key: 'permissions', variadic)

AFTER (recommended):
└── common/guards/         ← Single source of truth
    ├── auth.guard.ts      ← Real JWT verify + resolveRequestUser
    ├── permission.guard.ts ← Checks user.permissionCodes
    └── index.ts           ← Export AuthGuard, PermissionGuard, Permission, CurrentUser

foundation/auth/index.ts → re-exports from common/guards (backward compat)
```

---

**Final verdict: 8.0 / 10 CONDITIONAL PASS. Auth logic is production-quality (token rotation, argon2id, lockout, audit trail). However, the dual guard system means permission enforcement is broken across ALL NestJS modules. This is the single highest-priority fix in the entire codebase.**
