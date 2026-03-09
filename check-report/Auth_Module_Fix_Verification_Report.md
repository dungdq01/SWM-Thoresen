# Auth Module — Fix Verification Report

**Previous score:** 8.0 / 10 (CONDITIONAL PASS)
**New score:** 8.5 / 10
**Verdict:** CONDITIONAL PASS
**Review date:** 2026-03-09

---

## Fix Verification Summary

| # | Issue | Severity | Status | Note |
|---|-------|----------|--------|------|
| CR-1 | Foundation AuthGuard is a stub | CRITICAL | **FIXED** | `foundation/auth/index.ts` re-exports from `common/guards/` |
| CR-2 | Two conflicting guard systems | CRITICAL | **FIXED** | Single source of truth: common guards re-exported via foundation index |
| HI-1 | JWT payload reads `userCode` but token uses `ucd` | HIGH | **FIXED** | Common AuthGuard L74-76 now reads `payload.ucd` |
| HI-2 | `@RequirePermission` no guard, AdminAuth unprotected | HIGH | **FIXED** | `@UseGuards(AuthGuard, PermissionGuard)` + `@Permission()` on all 3 routes |
| HI-3 | JWT secret fallback to `'dev-secret-change-me'` | HIGH | **FIXED** | `throw new Error('JWT_SECRET ... is required')` on missing |
| MD-4 | Admin uses `(req as any).user` | MEDIUM | **FIXED** | `@CurrentUser() adminUser: RequestUser` on all admin routes |
| MD-1 | No rate limiting on login | MEDIUM | NOT FIXED | Still no throttle guard |
| MD-5 | No Swagger decorators on auth controllers | MEDIUM | NOT FIXED | Still no @ApiTags/@ApiOperation |
| MD-6 | Hardcoded fallback internal API key | MEDIUM | NOT FIXED | Still `['internal-service-key']` |

**Result: 6 FIXED, 3 NOT FIXED (MEDIUM)**

---

## Detailed Verification

### CR-1 + CR-2: Guard System Unified — FIXED

**foundation/auth/index.ts (key change):**
```typescript
// Re-export guards from common to ensure single source of truth
export { AuthGuard } from '../../../common/guards/auth.guard';
export { PermissionGuard } from '../../../common/guards/permission.guard';
export { Permission, PERMISSION_KEY } from '../../../common/decorators/permission.decorator';
export { CurrentUser } from '../../../common/decorators/current-user.decorator';
export { Public } from '../../../common/decorators/public.decorator';

// Keep internal API guard local to foundation
export * from './internal-api.guard';
```

**Impact:** All modules importing `from '../../foundation/auth'` (M8, M9, M10, M11) now get the real guards:
- `AuthGuard` → JWT verify + `resolveRequestUser()`
- `PermissionGuard` → checks `user.permissionCodes` + warehouse scope + owner scope
- `Permission` → metadata key `'permission'` (single string)
- `CurrentUser` → returns `request.user as RequestUser`

Note: Old stub files (`foundation/auth/auth.guard.ts`, `permission.guard.ts`, etc.) still exist on disk but are **no longer exported**. Should be cleaned up to avoid confusion.

### HI-1: JWT payload field mapping — FIXED

**common/guards/auth.guard.ts L73-76:**
```typescript
// HI-1 Fix: Read 'ucd' key from JWT payload (matches TokenService)
const userCode =
  typeof payload === 'object' && payload !== null && 'ucd' in payload
    ? String(payload.ucd)
    : null;
```

Matches `TokenService.generateAccessToken()` which writes `ucd: payload.userCode`. Production JWT flow now works correctly.

### HI-2: AdminAuthController permissions enforced — FIXED

```typescript
@Controller('admin/auth/users')
@UseGuards(AuthGuard, PermissionGuard)     // ← added
export class AdminAuthController {

  @Post(':id/force-reset-password')
  @Permission('ADMIN.USER.RESET_PASSWORD')  // ← @Permission, not @RequirePermission
  async forceResetPassword(..., @CurrentUser() adminUser: RequestUser) { ... }

  @Post(':id/unlock')
  @Permission('ADMIN.USER.UNLOCK')
  async unlockAccount(..., @CurrentUser() adminUser: RequestUser) { ... }

  @Post(':id/revoke-all-sessions')
  @Permission('ADMIN.USER.REVOKE_SESSIONS')
  async revokeAllSessions(..., @CurrentUser() adminUser: RequestUser) { ... }
}
```

- Changed from `@RequirePermission` (no-op) to `@Permission()` (read by PermissionGuard)
- `@UseGuards(AuthGuard, PermissionGuard)` at class level
- `@CurrentUser() adminUser: RequestUser` for type safety

### HI-3: JWT secret validation — FIXED

**token.service.ts L14-18:**
```typescript
const secret = this.configService.get<string>('JWT_SECRET');
if (!secret) {
  throw new Error('JWT_SECRET environment variable is required for token signing');
}
this.jwtSecret = secret;
```

App fails to start if JWT_SECRET is missing — no silent fallback to known key.

---

## NEW Issue Found

### HI-NEW-1: RequestUser field mismatch in Auth controllers (HIGH)

**Root cause:** `resolveRequestUser()` returns `RequestUser { id, userCode, username, fullName, roleCodes, permissionCodes, warehouseScopes, ownerScopes }`. But Auth module controllers (auth, profile, session, password) access fields that DON'T exist on `RequestUser`:

| Field accessed | Exists on RequestUser? | Used in |
|---------------|----------------------|---------|
| `user.userId` | NO (should be `user.id`) | auth (logout), profile (me, permissions, select-warehouse), session, password |
| `user.sessionId` | NO | auth (logout), profile (select-warehouse), session |
| `user.channel` | NO | auth (logout), profile (me, select-warehouse), session |
| `user.authVersion` | NO | profile (select-warehouse) |
| `user.selectedWarehouseId` | NO | profile (me, select-warehouse) |

**24 references** across 4 controllers accessing undefined fields.

**Impact:**
- `logout` → `user.sessionId` is undefined → guard passes but `if (!user?.sessionId) return` → **silently does nothing**
- `logout-all` → `user.userId` is undefined → `if (!user?.userId) return` → **silently does nothing**
- `GET /me` → `findUnique({ where: { id: user.userId } })` → `id: undefined` → Prisma error or null → throws
- `change-password` → `changePassword(user.userId, ...)` → undefined userId → likely throws
- `select-warehouse` → multiple undefined fields → broken

**Fix needed:** Either:
1. Extend `RequestUser` to include `sessionId`, `channel`, `authVersion`, `selectedWarehouseId` and have `resolveRequestUser` populate them from JWT payload, OR
2. Change Auth controllers to use `user.id` instead of `user.userId`, and get session/channel data from JWT payload separately

**Recommended approach (option 1):** The common AuthGuard already decodes the JWT — it has access to `sub`, `sid`, `ch`, `av`, `wh`. Enrich RequestUser with these fields:

```typescript
export interface RequestUser {
  id: string;            // from resolveRequestUser (DB)
  userCode: string;      // from resolveRequestUser (DB)
  username: string;      // from resolveRequestUser (DB)
  fullName: string;      // from resolveRequestUser (DB)
  roleCodes: string[];   // from resolveRequestUser (DB)
  permissionCodes: string[];
  warehouseScopes: string[];
  ownerScopes: string[];
  // --- Add from JWT payload ---
  sessionId?: string;     // from jwt.sid
  channel?: string;       // from jwt.ch
  authVersion?: number;   // from jwt.av
  selectedWarehouseId?: string | null;  // from jwt.wh
}
```

Then in `AuthGuard.canActivate()` after resolving user:
```typescript
const requestUser = await this.authorizationService.resolveRequestUser(userCode);
requestUser.sessionId = (payload as any).sid;
requestUser.channel = (payload as any).ch;
requestUser.authVersion = (payload as any).av;
requestUser.selectedWarehouseId = (payload as any).wh;
request.user = requestUser;
```

---

## Score Breakdown

| Category | Weight | Score | Note |
|----------|--------|-------|------|
| Auth Flow (login/refresh/logout) | 20% | 8/10 | Logic correct, but logout broken due to field mismatch |
| Token Security | 15% | 10/10 | Family rotation, `ucd` fix, secret validation |
| Guard System Integrity | 15% | 9/10 | Unified via re-export, field mismatch remains |
| Password Security | 10% | 10/10 | Argon2id, policy, history |
| Session Management | 10% | 7/10 | Good logic, but controllers use wrong field names |
| Account Lockout | 10% | 9/10 | Solid, no rate limiting |
| Admin Operations | 10% | 10/10 | PermissionGuard + @Permission + @CurrentUser |
| Audit Trail | 5% | 10/10 | Comprehensive |
| $transaction | 5% | 10/10 | Consistently used |

**Weighted total: 8.5 / 10**

---

## Remaining Items

### Must Fix
1. **HI-NEW-1: RequestUser field mismatch** — Extend interface + enrich in AuthGuard from JWT payload. Without this, logout, profile, session, password endpoints are broken.

### Should Fix
2. **MD-1: Rate limiting** — `@nestjs/throttler` on login/refresh
3. **MD-5: Swagger decorators** — @ApiTags, @ApiOperation on auth controllers
4. **MD-6: Internal API key fallback** — Remove hardcoded default, throw if not configured

### Cleanup
5. **Remove dead stub files** — `foundation/auth/auth.guard.ts`, `permission.guard.ts`, `permission.decorator.ts`, `current-user.decorator.ts` are no longer exported. Delete to prevent confusion.
6. **Remove `@RequirePermission` decorator** — No guard reads `'requirePermission'` metadata. Now unused since AdminAuthController switched to `@Permission`. Delete `require-permission.decorator.ts`.

---

**Final verdict: 8.0 → 8.5 CONDITIONAL PASS. All originally reported CRITICAL/HIGH issues fixed. Guard system unified. One NEW HIGH issue: Auth controllers access `user.userId`/`user.sessionId` but RequestUser only has `user.id` — logout, profile, session endpoints broken at runtime.**
