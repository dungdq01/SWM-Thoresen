# Module 1 — Foundation & Governance: Code Review Report

**Code path:** `backend/src/modules/foundation/` + `backend/prisma/`
**Spec file:** `docs/spec/Module_1_Foundation_and_Governance_Spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 7.0 / 10
**Verdict:** CONDITIONAL PASS — 5 critical issues + 7 high issues can bo sung truoc merge

---

## Tech Stack

| Layer | Choice | Note |
|-------|--------|------|
| Framework | NestJS 10.x | OK |
| ORM | Prisma 5.x | OK — type-safe |
| DB | PostgreSQL | OK — khop spec |
| Auth | JWT + DEV_AUTH_BYPASS | OK cho dev, can bao mat cho prod |
| Validation | class-validator + class-transformer | OK |

---

## Review Gate Checklist (8 items) — Code vs Spec

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | RBAC + Permission dung spec? | PARTIAL | Schema dung. DENY effect chua implement. Owner scope chua enforce |
| 2 | Number Sequence dung spec? | PARTIAL | Format dung. Timezone bug (UTC vs Vietnam). Missing TRF/ADJ sequences |
| 3 | Reason Code day du? | PASS | 17 reason codes seeded. Dung domain + category. Missing LOADING_LEFTOVER [TO-CONFIRM] |
| 4 | Audit Trail dung spec? | PASS | Schema 18 fields (spec yeu cau 15). Co correlation_id, source_module, metadata |
| 5 | Business Rule Catalog dung spec? | PASS | Schema khop spec Section 15.5. Status enum day du |
| 6 | Idempotency dung spec? | PARTIAL | Co service + schema. Race condition giua check va create. Lock yeu |
| 7 | Exception Governance dung? | PASS | ExceptionLog co severity, resolution tracking. Day du |
| 8 | Document Governance (Decision Log, Change Control) | PASS | Schema day du. CRUD hoat dong |

**Result: 5/8 PASS, 3/8 PARTIAL**

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: DENY Permission Effect khong duoc implement [CRITICAL]
**Spec ref:** AC-RBAC-01, Section 12.9
**Code:** `permission.repository.ts` line 67 — chi filter `effect === 'ALLOW'`, bo qua DENY
**Impact:** Neu assign DENY permission cho role, permission van co hieu luc. Khong co cach revoke quyen cu the.
**Fix:** Implement DENY subtraction logic:
```
effectivePermissions = ALLOW_permissions - DENY_permissions
```

### CR-2: Owner Scope khong enforce trong PermissionGuard [CRITICAL]
**Spec ref:** AC-RBAC-02 — "Customer Viewer khong duoc xem du lieu ngoai owner scope"
**Code:** `permission.guard.ts` — chi check `warehouseScopes`, KHONG check `ownerScopes`
**Impact:** CUST_VIEWER co the xem data cua moi owner qua API. Vi pham spec.
**Fix:** Them ownerScope check tuong tu warehouseScope:
```typescript
if (user.ownerScopes.length > 0) {
  const requestOwner = request.headers['x-owner-id'];
  if (requestOwner && !user.ownerScopes.includes(requestOwner)) {
    throw new ForbiddenException('Khong co quyen truy cap owner nay');
  }
}
```

### CR-3: Idempotency Race Condition [CRITICAL]
**Spec ref:** AC-IDEM-02 — "Retry cung external_id khong tao transaction moi"
**Code:** `idempotency.service.ts` — gap giua `findByKey()` (check) va `create()` (insert). Hai concurrent request co the ca hai pass check va ca hai create.
**Impact:** Duplicate transactions co the xay ra duoi concurrent load.
**Fix:** Dung `INSERT ... ON CONFLICT` hoac database-level unique constraint voi proper error handling:
```typescript
try {
  await this.repo.create({ idempotencyKey, status: 'PROCESSING', ... });
} catch (e) {
  if (isPrismaUniqueConstraintError(e)) {
    return this.repo.findByKey(idempotencyKey); // return existing
  }
  throw e;
}
```

### CR-4: PrismaService thieu onModuleDestroy [CRITICAL]
**Code:** `prisma.service.ts` — chi co `onModuleInit()`, KHONG co `onModuleDestroy()`
**Impact:** Database connection leak khi app restart/shutdown.
**Fix:**
```typescript
async onModuleDestroy() {
  await this.$disconnect();
}
```

### CR-5: Number Sequence Timezone Bug [CRITICAL]
**Spec ref:** AC-SEQ-01, Section 14.2 — "daily reset"
**Code:** `number-sequence.service.ts` — su dung `getUTCFullYear/getUTCMonth/getUTCDate` cho counter date
**Impact:** Vietnam = UTC+7. Daily reset xay ra luc 07:00 Vietnam thay vi 00:00 Vietnam. Tu 00:00-07:00, sequence van dung date cua hom truoc.
**Fix:** Dung timezone-aware date calculation:
```typescript
const vnDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
```
Hoac dung config timezone per warehouse.

---

## HIGH Issues (Fix truoc Sprint 2)

### HI-1: Missing Pagination tren moi list endpoint
**Spec impact:** Performance khi data lon. AuditLog va ExceptionLog se co hang trieu rows.
**Code:** Moi list DTO (ListAuditLogsQueryDto, ListRolesQueryDto, etc.) KHONG co `page`, `limit`, `offset`.
**Fix:** Them BaseQueryDto voi pagination:
```typescript
export class BaseQueryDto {
  @IsOptional() @Min(1) page?: number = 1;
  @IsOptional() @Min(1) @Max(100) limit?: number = 20;
}
```

### HI-2: AuthGuard DEV_AUTH_BYPASS can bao ve tot hon
**Code:** `auth.guard.ts` line 37 — `process.env.DEV_AUTH_BYPASS === 'true'`
**Impact:** Neu production deploy co env var nay = true, moi user co the bypass auth bang header `x-user-code`.
**Fix:** Them NODE_ENV check:
```typescript
if (process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
```

### HI-3: Audit log khong trong transaction voi main operation
**Spec ref:** AC-AUD-01 — "action bat buoc audit phai luon tao audit record"
**Code:** `governance.service.ts` — goi `logService.createAuditLog()` SAU khi main operation. Neu audit fail, main op van commit.
**Impact:** Co the co operation khong co audit trail.
**Fix:** Wrap ca 2 trong Prisma interactive transaction.

### HI-4: Missing sequences TRF va ADJ
**Spec ref:** Section 14.5 — TRF (Transfer) va ADJ (Adjustment) can co sequence
**Code:** `seed.ts` line 307 — chi seed RCV, SHP, WRK, TRX, DN
**Impact:** Module 6 (Inventory Control) se khong co sequence cho Transfer va Adjustment.
**Fix:** Them vao seed:
```typescript
for (const sequenceCode of ['RCV', 'SHP', 'WRK', 'TRX', 'DN', 'TRF', 'ADJ']) {
```
Note: TRF va ADJ la [TO-CONFIRM] trong spec. Nhung nen seed san de khong block M6.

### HI-5: Health endpoint khong check DB connection
**Code:** `health.controller.ts` — chi return `{ status: 'ok' }`
**Impact:** Load balancer/monitoring khong biet DB down.
**Fix:**
```typescript
@Get('health')
async check() {
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: 'ok', db: 'connected' };
}
```

### HI-6: NumberSequenceRepository dung raw SQL
**Code:** `number-sequence.repository.ts` — `$queryRawUnsafe()` cho counter increment
**Impact:** Khong portable. Neu doi DB engine thi break.
**Fix:** Dung Prisma atomic operation:
```typescript
const updated = await this.prisma.numberSequenceCounter.update({
  where: { sequenceId_scopeKey_counterDate: { ... } },
  data: { lastNumber: { increment: 1 } },
});
```

### HI-7: Permission assignment cho phep assign inactive permission
**Code:** `role.service.ts` — validate permission exists nhung KHONG check `isActive`
**Impact:** Co the assign permission da deactivate cho role.
**Fix:** Them `isActive: true` vao where clause khi lookup permission.

---

## MEDIUM Issues (Fix khi co thoi gian)

| # | Issue | File | Fix |
|---|-------|------|-----|
| MD-1 | Missing GET-by-ID endpoint cho reason_code, role, permission | Controllers | Them GET /:id route |
| MD-2 | DTO validation gap — changeType, decisionType la string, nen la enum | governance.dto.ts | Them @IsIn() |
| MD-3 | Vietnamese hardcode trong error messages | auth.guard.ts, permission.guard.ts | Dung i18n hoac English |
| MD-4 | ReasonCode domain bypass — FOUNDATION domain dung duoc o moi domain | reason-code.service.ts | Document ro hoac restrict |
| MD-5 | RoleRepository include pollution — moi role query include full permission tree | role.repository.ts | Selective include |
| MD-6 | LogService khong propagate error — audit write fail im lang | log.service.ts | Propagate hoac retry |
| MD-7 | Idempotency payload stored unredacted — co the chua PII | idempotency.service.ts | Mask sensitive fields |
| MD-8 | Missing date range filter cho AuditLog va ExceptionLog queries | log.dto.ts | Them fromDate/toDate |

---

## Diem manh cua code

1. **Schema rat day du** — 13 models cover het data objects trong spec Section 10. Thua ca spec (co `warehouseCode` trong AuditLog — spec khong yeu cau).

2. **Seed data chat luong** — 8 roles dung spec, 17 reason codes theo spec Section 16.7, 5 number sequences, business rule sample, decision log sample.

3. **Architecture sach** — Controller → Service → Repository pattern nhat quan. Module isolation tot.

4. **Global infrastructure tot:**
   - AuthGuard (JWT + dev bypass)
   - PermissionGuard (permission code + warehouse scope)
   - ResponseInterceptor (standardized response format)
   - HttpExceptionFilter (consistent error handling)
   - CurrentUser decorator

5. **Idempotency service co san** — Architecture dung (key → check → execute → cache response). Chi can fix race condition.

6. **Audit schema thua spec** — 18 fields vs spec yeu cau 15. Co them: `requestId`, `sourceModule`, `warehouseCode`, `ownerId`, `metadata` — rat tot cho traceability.

7. **Number sequence design dung** — Scope type (GLOBAL/PER_WAREHOUSE/CUSTOM), reset policy (NONE/DAILY/MONTHLY/YEARLY), format template voi placeholders. Chi can fix timezone.

8. **RBAC 3 lop** — Permission (module.resource.action), RolePermission (ALLOW/DENY), UserRole (warehouse/owner scope). Design dung spec.

---

## Cross-Check: Code vs Spec Acceptance Criteria

| AC | Spec Requirement | Code Status | Gap |
|----|-----------------|-------------|-----|
| AC-RBAC-01 | 403 + audit ACCESS_DENIED | PermissionGuard tra 403. Nhung KHONG log audit ACCESS_DENIED | **Thieu audit log denied** |
| AC-RBAC-02 | CUST_VIEWER khong xem data ngoai owner | ownerScopes khong enforce | **CR-2** |
| AC-RBAC-03 | WH_KEEPER khong manual weight | Permission-based. OK neu permission khong assign | OK (implicit) |
| AC-RBAC-04 | Quyen moi ap dung ngay request ke tiep | resolveRequestUser() query DB moi request | **PASS** |
| AC-RBAC-05 | Action nhay cam log user_id, role, timestamp, device_type | AuditLog schema co. Nhung khong auto-log denied access | **Partial** |
| AC-SEQ-01 | Unique theo policy | Atomic increment via SQL. OK | **PASS** (tru timezone) |
| AC-SEQ-02 | Concurrent khong trung | Raw SQL atomic update | **PASS** |
| AC-SEQ-03 | Retry khong sinh reference moi | IdempotencyService wrap | **PASS** (tru race condition) |
| AC-RSN-01 | Action nhay cam phai co reason_code | assertValid() method co. Module khac goi duoc | **PASS** |
| AC-RSN-02 | OTHER phai yeu cau note | requiresNote flag co | **PASS** |
| AC-RSN-04 | Inactive khong dung duoc | assertValid() check isActive | **PASS** |
| AC-AUD-01 | Action bat buoc audit phai co record | Service goi logService. Nhung khong trong transaction | **HI-3** |
| AC-AUD-03 | Reverse/cancel phai co reason + correlation | Schema support. Logic can module khac implement | **OK** |
| AC-IDEM-02 | Retry khong tao moi | IdempotencyService. Race condition gap | **CR-3** |
| AC-RULE-01 | Rule co current_status ro | Enum CONFIRMED/TO_CONFIRM/PHASE_2 | **PASS** |
| AC-RULE-04 | Rule co source_of_truth + brd_reference | Schema co ca 2 fields | **PASS** |

---

## Summary for Dev Team

| Priority | Issue | ID | Owner | Deadline |
|----------|-------|----|-------|----------|
| CRITICAL | DENY permission effect | CR-1 | Dev Lead | Truoc merge |
| CRITICAL | Owner scope enforcement | CR-2 | Dev Lead | Truoc merge |
| CRITICAL | Idempotency race condition | CR-3 | Dev Lead | Truoc merge |
| CRITICAL | PrismaService disconnect | CR-4 | Dev | Truoc merge |
| CRITICAL | Timezone bug number sequence | CR-5 | Dev | Truoc merge |
| HIGH | Missing pagination | HI-1 | Dev | Sprint 2 |
| HIGH | DEV_AUTH_BYPASS production guard | HI-2 | Dev | Sprint 2 |
| HIGH | Audit log transaction safety | HI-3 | Dev Lead | Sprint 2 |
| HIGH | Missing TRF/ADJ sequences | HI-4 | Dev | Sprint 2 |
| HIGH | Health check DB | HI-5 | Dev | Sprint 2 |
| HIGH | Raw SQL → Prisma atomic | HI-6 | Dev | Sprint 2 |
| HIGH | Inactive permission assignment | HI-7 | Dev | Sprint 2 |

---

## Files Reviewed

### Prisma
- `prisma/schema.prisma` — 13 models, 12 enums
- `prisma/seed.ts` — Seed data cho roles, permissions, reason codes, sequences, rules

### Controllers (6)
- `controllers/governance.controller.ts` — Business rules, decision logs, change control
- `controllers/log.controller.ts` — Audit logs, exception logs, idempotency records
- `controllers/number-sequence.controller.ts` — Sequence CRUD + getNextNumber
- `controllers/permission.controller.ts` — Permission list + my permissions
- `controllers/reason-code.controller.ts` — Reason code CRUD + deactivate
- `controllers/role.controller.ts` — Role CRUD + assign permissions + assign user role

### Services (8)
- `services/authorization.service.ts` — resolveRequestUser
- `services/governance.service.ts` — Business rule + decision + change control
- `services/idempotency.service.ts` — Idempotency check + execute
- `services/log.service.ts` — Audit + exception logging
- `services/number-sequence.service.ts` — Sequence generation + formatting
- `services/permission.service.ts` — Permission queries
- `services/reason-code.service.ts` — Reason code CRUD + validation
- `services/role.service.ts` — Role management + permission assignment

### Repositories (7)
- `repositories/governance.repository.ts`
- `repositories/log.repository.ts`
- `repositories/number-sequence.repository.ts`
- `repositories/permission.repository.ts`
- `repositories/reason-code.repository.ts`
- `repositories/role.repository.ts`
- `repositories/user.repository.ts`

### Common Infrastructure (8)
- `common/guards/auth.guard.ts` — JWT auth + dev bypass
- `common/guards/permission.guard.ts` — RBAC enforcement
- `common/filters/http-exception.filter.ts` — Error formatting
- `common/interceptors/response.interceptor.ts` — Response wrapper
- `common/decorators/current-user.decorator.ts`
- `common/decorators/permission.decorator.ts`
- `common/decorators/public.decorator.ts`
- `common/interfaces/request-user.interface.ts`

### Infrastructure
- `infrastructure/prisma/prisma.service.ts`
- `infrastructure/prisma/prisma.module.ts`

### Root
- `main.ts` — App bootstrap
- `app.module.ts` — Root module
- `health.controller.ts` — Health check
