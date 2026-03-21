# Phase 1: Foundation — Auth & Platform Services

**Devs:** 1
**Effort:** ~2 sprints
**Blocking:** YES — must complete before Phase 2
**Dependencies:** None (first phase)

---

## Scope

Build the foundational services that ALL other modules depend on:
- Tenant context middleware (auto-inject tenant_id)
- Auth & user warehouse access
- Number sequence generator
- UoM management
- Reason codes
- Audit logging
- System configuration

---

## Task Breakdown

### 1.1 Tenant Context & Auth Middleware (P0)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.1.1 | Tenant context middleware | Logic | Extract `tenant_id` from JWT → `ICurrentUser.TenantId`. Set `app.current_tenant` for RLS |
| 1.1.2 | Global query filter | Logic | Verify `TenantEntity` global filter `WHERE tenant_id = @current` works correctly |
| 1.1.3 | TenantSaveChangesInterceptor | Logic | Verify auto-set `tenant_id` on INSERT for all `TenantEntity` |
| 1.1.4 | RLS policies (SQL script) | Logic | `CREATE POLICY` cho shared DB mode (optional for DB-per-tenant) |
| 1.1.5 | UserWarehouseAccess CRUD | CRUD | Command: Assign/Remove warehouse access. Query: List user's warehouses |

**Acceptance Criteria:**
- Every API request without valid tenant context returns 401/403
- Queries auto-filter by tenant_id (test: create data for tenant A, query as tenant B → empty)
- SaveChanges auto-sets tenant_id (test: create entity without setting tenant_id → it's set from JWT)

### 1.2 Number Sequence Service (P0)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.2.1 | NumberSequence CRUD | CRUD | Create/Update format patterns per entity type |
| 1.2.2 | `INumberSequenceService.Next()` | Logic | Thread-safe next number generation with format: `{prefix}-{date}-{seq}` |
| 1.2.3 | Daily reset logic | Logic | Reset sequence counter at midnight if `daily_reset = true` |
| 1.2.4 | Concurrency safety | Logic | `SELECT FOR UPDATE` or advisory lock to prevent duplicates |

**Format Examples:**
- PO: `PO-20260313-0001`
- Receipt: `REC-20260313-0001`
- SO: `SO-20260313-0001`

### 1.3 UoM Service (P1)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.3.1 | Uom CRUD | CRUD | Standard CRUD with tenant scope |
| 1.3.2 | UomConversion CRUD | CRUD | From/To UoM + conversion factor |
| 1.3.3 | `IUomService.Convert()` | Logic | Convert qty between UoMs using conversion table |
| 1.3.4 | Seed default UoMs | Seed | KG, MT (1000 KG), BAG, PIECE per tenant |

### 1.4 Reason Code Service (P1)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.4.1 | ReasonCode CRUD | CRUD | Code, category (9 types), requires_approval |
| 1.4.2 | Seed defaults | Seed | 9 categories: EXPIRY, DAMAGE, DISCREPANCY, PROMOTION, REBAG, SCRAP, ADJUSTMENT, QUALITY, OTHER |

### 1.5 System Config (P1)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.5.1 | SystemConfig CRUD | CRUD | Key-value store (JSONB) for WMS-specific config |
| 1.5.2 | `ISystemConfigService.Get<T>()` | Logic | Typed access: `lot_hash_attrs`, `default_tolerance_pct`, `allocation_expiry_hours`, `snapshot_time`, `vat_rate`, `max_reweigh_attempts` |
| 1.5.3 | Caching | Logic | In-memory cache per tenant, invalidate on update |

### 1.6 Audit Log (P1)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.6.1 | AuditLog auto-capture | Logic | EF interceptor: on INSERT/UPDATE/DELETE → append to `audit_log` with old/new values |
| 1.6.2 | AuditLog query | Query | Filter by table_name, record_id, date range, user |
| 1.6.3 | Exclude sensitive fields | Logic | Config to exclude certain columns from audit (e.g., passwords) |

### 1.7 Document Template & Notification (P2)

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.7.1 | DocumentTemplate CRUD | CRUD | 8 document types with template content |
| 1.7.2 | NotificationConfig CRUD | CRUD | 11 alert types, trigger conditions, recipients |
| 1.7.3 | NotificationLog append | Logic | Immutable log of sent notifications |
| 1.7.4 | `INotificationService.Send()` | Logic | Queue notification based on config |

---

## API Endpoints

```
# Auth & Access
POST   /api/user-warehouse-access          ← Assign access
DELETE /api/user-warehouse-access/{id}      ← Remove access
GET    /api/user-warehouse-access           ← List (filter by userId)

# Number Sequence
GET    /api/number-sequences                ← List
POST   /api/number-sequences                ← Create format
PUT    /api/number-sequences/{id}           ← Update format
POST   /api/number-sequences/next           ← Generate next number

# UoM
GET    /api/uoms                            ← List
POST   /api/uoms                            ← Create
PUT    /api/uoms/{id}                       ← Update
GET    /api/uom-conversions                 ← List
POST   /api/uom-conversions                 ← Create

# Reason Code
GET    /api/reason-codes                    ← List (filter by category)
POST   /api/reason-codes                    ← Create
PUT    /api/reason-codes/{id}               ← Update

# System Config
GET    /api/system-config                   ← Get all config
PUT    /api/system-config/{key}             ← Update config value

# Audit Log
GET    /api/audit-logs                      ← Query (filter by table, record, date)

# Document Template
GET    /api/document-templates              ← List
POST   /api/document-templates              ← Create
PUT    /api/document-templates/{id}         ← Update

# Notification
GET    /api/notification-configs            ← List
POST   /api/notification-configs            ← Create/Update
GET    /api/notification-logs               ← Query history
```

---

## Definition of Done

- [ ] Tenant context injection works for all API requests
- [ ] Global query filter verified with multi-tenant test
- [ ] Number sequence generates unique numbers under concurrent load
- [ ] UoM conversion service works correctly
- [ ] Audit log captures all entity changes automatically
- [ ] System config caching works with invalidation
- [ ] All endpoints have integration tests
- [ ] API documentation (Swagger) updated

---

## Handoff to Phase 2

Phase 2 devs can start when:
1. Tenant middleware is functional (API returns 401 without JWT)
2. `INumberSequenceService` interface is available (even if not complete — devs can mock)
3. Build passes with no errors

**Parallel start possible**: Phase 2 devs can start CRUD skeleton while Phase 1 completes notification/audit tasks.
