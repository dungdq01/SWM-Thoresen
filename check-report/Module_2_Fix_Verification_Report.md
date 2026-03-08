# Module 2 — Master Data Management: Fix Verification Report

**Previous review:** `check-report/Module_2_Code_Review_Report.md` (2026-03-08, Score 6.5)
**This review:** Verification of fixes
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-09
**Previous Score:** 6.5 / 10
**New Score:** 6.8 / 10
**Verdict:** FAIL — 0/3 CRITICAL fixed, 0/6 HIGH fixed. Chi co 1 improvement nho (seed permissions).

---

## CRITICAL Issues — 0/3 FIXED

### CR-1: Zero RBAC Protection — All Endpoints Public [NOT FIXED]
**Previous:** All 10 controllers have NO `@UseGuards()`, NO `@Permissions()` decorators.
**Current status:** UNCHANGED. All 10 controllers van khong co guards, khong co permissions, khong co `@CurrentUser()`.
- Moi controller van dung hardcoded `const ctx: RequestContext = { userId: undefined }`.
- **Partial progress:** M2 permission codes DA DUOC seed trong `seed.ts` (lines 49-103) — day du 14 resource groups voi actions (VIEW, CREATE, UPDATE, DEACTIVATE, REACTIVATE). Nhung controllers KHONG SU DUNG chung.

**What was seeded (good):**
| Resource | Actions |
|----------|---------|
| MASTER_DATA.LOOKUP | VIEW |
| MASTER_DATA.OWNER | VIEW, CREATE, UPDATE, DEACTIVATE, REACTIVATE |
| MASTER_DATA.VENDOR | VIEW, CREATE, UPDATE, DEACTIVATE, REACTIVATE |
| MASTER_DATA.ITEM | VIEW, CREATE, UPDATE, DEACTIVATE, REACTIVATE |
| MASTER_DATA.WAREHOUSE | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.ZONE | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.LOCATION | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.UOM | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.VEHICLE_TYPE | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.INVENTORY_STATUS | VIEW, UPDATE |
| MASTER_DATA.SERVICE_CODE | VIEW, CREATE, UPDATE |
| MASTER_DATA.DAY_TYPE | VIEW, CREATE, UPDATE |
| MASTER_DATA.RATE_REFERENCE | VIEW, CREATE, UPDATE, DEACTIVATE |
| MASTER_DATA.OWNER_ITEM_POLICY | VIEW, CREATE, UPDATE |
| MASTER_DATA.IMPORT | PREVIEW, COMMIT, VIEW |

**Remaining work:** Add `@UseGuards(AuthGuard, PermissionGuard)` + `@Permissions()` + `@CurrentUser()` to ALL 10 controllers. Permission codes da co san — chi can wire them.

### CR-2: CargoForm Enum Mismatch vs Spec [NOT FIXED]
**Previous:** Missing BAGGED_40KG, JUMBO, PACKAGING. Extra: BAGGED_1000KG, CONTAINER, DRUM, PALLET, OTHER.
**Current status:** UNCHANGED. Enum van la:
```
BULK, BAGGED_25KG, BAGGED_50KG, BAGGED_1000KG, CONTAINER, DRUM, PALLET, OTHER
```
Van thieu: `BAGGED_40KG`, `JUMBO`, `PACKAGING`.

### CR-3: VehicleCategory Enum Mismatch vs Spec [NOT FIXED]
**Previous:** Missing TRAILER, BARGE, VESSEL_SUPPORT.
**Current status:** UNCHANGED. Enum van la:
```
TRUCK, CONTAINER, VESSEL, OTHER
```
Van thieu: `TRAILER`, `BARGE`, `VESSEL_SUPPORT`.

---

## HIGH Issues — 0/6 FIXED

### HI-1: Khong Goi M1 AuditLog Service [NOT FIXED]
**Status:** 0/9 services inject LogService. Zero calls to `createAuditLog()`. Khong co audit trail cho master data changes.

### HI-2: RequestContext Hardcoded — userId Always Undefined [NOT FIXED]
**Status:** Services accept `ctx: RequestContext` parameter va use `ctx.userId` (good pattern). NHUNG controllers van hardcode `{ userId: undefined }` vi khong co `@CurrentUser()`. Runtime userId se luon la undefined.
**Note:** Service-layer code la correct — chi can controller layer pass real user info.

### HI-3: FK Existence Validation Missing [NOT FIXED]
**Status:** All FK references (baseUomId, billingUomId, warehouseId, zoneId, defaultWarehouseId, packagingMaterialItemId) van dung `{ connect: { id } }` without pre-validation. Prisma raw FK error van se throw ra client.

### HI-4: Idempotency Not Integrated [NOT FIXED]
**Status:** Zero services import IdempotencyService. Zero `executeWithIdempotency()` calls. DTOs van co externalId field nhung khong ai su dung.

### HI-5: UOM va VehicleType Thieu Reactivate Endpoint [NOT FIXED]
**Status:**
- `uom.controller.ts` — Van chi co deactivate, KHONG co reactivate endpoint. Service cung KHONG co reactivate method.
- `vehicle-type.controller.ts` — Same. Chi co deactivate.
- 6 other controllers (owner, item, warehouse, location, zone, vendor) co day du reactivate.

### HI-6: Deactivation Race Condition — No Transaction [NOT FIXED]
**Status:**
- `warehouse.service.ts` — `findById()` → `hasActiveZones()` → `deactivate()` van la 3 separate queries, KHONG co `$transaction`.
- `zone.service.ts` — `hasActiveLocations()` → `deactivate()` van la 2 separate queries, KHONG co `$transaction`.

---

## MEDIUM Issues — 0/8 FIXED

| # | Issue | Status | Note |
|---|-------|--------|------|
| MD-1 | Lookup hardcodes `take: 1000` | NOT FIXED | Van hardcode |
| MD-2 | No `@MaxLength()` on code fields | NOT FIXED | `itemCode` van chi co `@IsString()` |
| MD-3 | Tolerance fields no min/max bounds | NOT FIXED | `tolerancePctInbound/Outbound` van chi co `@IsNumber()` |
| MD-4 | `siteId` hardcoded as 'TVL-SITE' | NOT CHECKED | |
| MD-5 | `billingEmail` no `@IsEmail()` | NOT FIXED | Van chi co `@IsOptional() @IsString()` |
| MD-6 | No usage-check before UOM/VehicleType deactivation | NOT FIXED | |
| MD-7 | `handlingFeeGroup`/`billingRateZone` free-text | NOT FIXED | |
| MD-8 | InventoryStatus seed data | FIXED | Seed.ts co AVAILABLE, DAMAGED, BLOCKED, etc. |

---

## 5 Missing CRUD Entities — NOT IMPLEMENTED

| Entity | Prisma Model | Seed Data | Controller | Service | Repository | Status |
|--------|-------------|-----------|------------|---------|------------|--------|
| UomConversion | MdUomConversion | YES (seed.ts) | NONE | NONE | NONE | NOT BUILT |
| ServiceCode | MdServiceCode | YES (seed.ts) | NONE | NONE | NONE | NOT BUILT |
| DayType | MdDayType | YES (seed.ts) | NONE | NONE | NONE | NOT BUILT |
| RateReference | MdRateReference | NO | NONE | NONE | NONE | NOT BUILT |
| OwnerItemPolicy | MdOwnerItemPolicy | NO | NONE | NONE | NONE | NOT BUILT |

**Note:** Seed data cho UomConversion, ServiceCode, DayType la progress tot. Nhung van can CRUD endpoints de manage at runtime.

---

## What DID Change (Improvements)

| # | Change | Impact |
|---|--------|--------|
| 1 | M2 permission codes seeded in seed.ts (14 resource groups, 50+ permissions) | Prerequisite cho CR-1 fix. Good. |
| 2 | UOM seed data added (KG, MT, BAG, etc.) | Good for M4/M10 |
| 3 | UOM Conversion seed data (KG↔MT, KG↔BAG) | Good for billing conversion |
| 4 | InventoryStatus seed data (AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT, HOLD) | Fixes MD-8 |
| 5 | ServiceCode seed data | Good for M10 Billing |
| 6 | DayType seed data | Good for M10 Billing |
| 7 | Sample warehouse + zones + locations seeded | Good for testing |

---

## Score Change Justification

| Category | Previous | Current | Note |
|----------|----------|---------|------|
| RBAC | 0% | 10% | Permission codes seeded but not wired |
| Audit trail | 0% | 0% | No change |
| Data integrity | 40% | 45% | Seed data improved |
| Validation | 60% | 60% | No DTO changes |
| Completeness | 55% | 55% | 5 entities still missing CRUD |
| **Overall** | **6.5** | **6.8** | Seed improvements only |

---

## Action Required — Priority Order

| # | Priority | Issue | Effort | Blocked By |
|---|----------|-------|--------|------------|
| 1 | **CRITICAL** | Wire RBAC guards + permissions to 10 controllers | 2h | Nothing — permission codes da co |
| 2 | **CRITICAL** | Fix CargoForm enum (add BAGGED_40KG, JUMBO, PACKAGING) | 15m | BA confirm |
| 3 | **CRITICAL** | Fix VehicleCategory enum (add TRAILER, BARGE, VESSEL_SUPPORT) | 15m | BA confirm |
| 4 | **HIGH** | Add `@CurrentUser()` to all controllers (fixes HI-2) | 1h | CR-1 (needs guards first) |
| 5 | **HIGH** | Inject LogService + call createAuditLog (fixes HI-1) | 2h | Nothing |
| 6 | **HIGH** | Add FK pre-validation in services (fixes HI-3) | 2h | Nothing |
| 7 | **HIGH** | Wire IdempotencyService in create operations (fixes HI-4) | 1h | Nothing |
| 8 | **HIGH** | Add reactivate to UOM + VehicleType (fixes HI-5) | 30m | Nothing |
| 9 | **HIGH** | Wrap deactivation in $transaction (fixes HI-6) | 30m | Nothing |
| 10 | **MEDIUM** | DTO validation: @MaxLength, @Min/@Max, @IsEmail | 1h | Nothing |

**Estimated total effort: ~10h dev work.**

**Dev team phai fix 3 CRITICAL truoc khi merge. KHONG co exception.**
