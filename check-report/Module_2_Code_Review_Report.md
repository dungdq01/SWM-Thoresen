# Module 2 — Master Data Management: Code Review Report

**Code path:** `backend/src/modules/master-data/` + `backend/prisma/schema.prisma` (M2 models)
**Spec file:** `docs/spec/module_2_master_data_management_spec.md`
**Reviewer:** Senior Manager (AI-assisted)
**Review date:** 2026-03-08
**Score:** 6.5 / 10
**Verdict:** CONDITIONAL PASS — 3 critical + 6 high issues. Functional nhung thieu security layer va vài gap quan trong.

---

## Tech Stack

| Layer | Choice | Note |
|-------|--------|------|
| Framework | NestJS 10.x | Consistent voi M1 |
| ORM | Prisma 5.x | 14 M2 models |
| Pattern | Controller → Service → Repository | Consistent voi M1 |
| Validation | class-validator + class-transformer | OK |
| Soft-delete | isActive + deactivatedAt/deactivatedBy | OK |
| Optimistic locking | rowVersion | OK |

---

## Code Scope

| Component | Count | Files |
|-----------|-------|-------|
| Controllers | 10 | owner, item, warehouse, location, zone, uom, vehicle-type, vendor, inventory-status, lookup |
| Services | 10 | Same + lookup |
| Repositories | 9 | All except lookup (uses other repos) |
| DTOs | 10 | common + per-entity |
| Prisma M2 models | 14 | MdOwner, MdItem, MdWarehouse, MdZone, MdLocation, MdUom, MdVehicleType, MdVendor, MdInventoryStatus, MdServiceCode, MdDayType, MdRateReference, MdOwnerItemPolicy, MdUomConversion |

---

## Review Gate Checklist (8 items)

| # | Gate Question | Result | Note |
|---|-------------|--------|------|
| 1 | Entity CRUD day du? | PASS | 10 entities voi create/list/get/update/deactivate |
| 2 | Schema dung spec? | PARTIAL | 14 models day du, nhung 2 enum mismatch (CargoForm, VehicleCategory) |
| 3 | Soft-delete dung? | PASS | isActive + deactivatedAt/By. Cascade checks (warehouse→zone, zone→location) |
| 4 | RBAC enforce? | FAIL | Zero RBAC decorators. All endpoints public. |
| 5 | Audit trail? | FAIL | Khong goi M1 AuditLog. Chi co createdBy/updatedBy trong entity. |
| 6 | Validation day du? | PARTIAL | DTO validation tot. Missing FK existence checks, enum mismatches. |
| 7 | Idempotency? | FAIL | externalId trong DTO nhung khong dung M1 IdempotencyService |
| 8 | Pagination? | PASS | All list endpoints co page/pageSize. Lookup hardcode 1000. |

**Result: 4/8 PASS, 2/8 PARTIAL, 2/8 FAIL**

---

## CRITICAL Issues (Fix truoc merge)

### CR-1: Zero RBAC Protection — All Endpoints Public [CRITICAL]
**Spec ref:** M2 Spec Section "RBAC" — WH_ADMIN manages master data, WH_MANAGER can view, CUST_VIEWER restricted
**Code:** All 10 controllers have NO `@UseGuards()`, NO `@Permissions()` decorators. Every endpoint accessible without authentication.
**Impact:** Any anonymous user can create/modify/delete master data. Vi pham security requirement cua M1 Foundation.
**Fix:**
```typescript
@Controller('master-data/owners')
@UseGuards(AuthGuard, PermissionGuard)
export class OwnerController {
  @Post()
  @Permissions('MASTER_DATA.OWNER.CREATE')
  create(@Body() dto: CreateOwnerDto, @CurrentUser() user: RequestUser) { ... }

  @Get()
  @Permissions('MASTER_DATA.OWNER.READ')
  findMany(@Query() dto: ListOwnerDto) { ... }
}
```
Apply to ALL 10 controllers. Define M2 permissions in seed.ts.

### CR-2: CargoForm Enum Mismatch vs Spec [CRITICAL]
**Spec ref:** M2 Spec — Go-live cargo forms: BULK, BAGGED_25KG, BAGGED_40KG, BAGGED_50KG, JUMBO, PACKAGING
**Schema:** BULK, BAGGED_25KG, BAGGED_50KG, BAGGED_1000KG, CONTAINER, DRUM, PALLET, OTHER
**Missing from schema:** BAGGED_40KG, JUMBO, PACKAGING
**Extra in schema:** BAGGED_1000KG, CONTAINER, DRUM, PALLET, OTHER
**Impact:** M4 Inbound va M10 Billing phu thuoc vao CargoForm de tinh phi xep do. Neu enum sai, handling fee calculation se sai. BAGGED_1000KG co phai la JUMBO khong? PACKAGING item type can co enum rieng.
**Fix:** Confirm voi business team va align enum. Tai thieu phai co: BULK, BAGGED_25KG, BAGGED_50KG, JUMBO (hoac BAGGED_1000KG voi alias), PACKAGING.

### CR-3: VehicleCategory Enum Mismatch vs Spec [CRITICAL]
**Spec ref:** M2 Spec — Vehicle categories: TRUCK, CONTAINER, TRAILER, BARGE, VESSEL_SUPPORT
**Schema:** TRUCK, CONTAINER, VESSEL, OTHER
**Missing:** TRAILER, BARGE, VESSEL_SUPPORT
**Impact:** M4 Inbound vessel flow va M8 OCR depend on vehicle category. Thieu TRAILER/BARGE se block vessel receipt processing.
**Fix:** Add missing enum values. VESSEL co the la parent group cho BARGE + VESSEL_SUPPORT, nhung phai confirm voi ops team.

---

## HIGH Issues (Fix truoc Sprint 2)

### HI-1: Khong Goi M1 AuditLog Service [HIGH]
**Spec ref:** M1 Spec AC-AUD-01 — "Action bat buoc audit phai luon tao audit record"
**Code:** M2 services chi set `createdBy`/`updatedBy` trong entity row. KHONG goi `LogService.createAuditLog()` de ghi vao AuditLog table.
**Impact:** Khong co audit trail cho master data changes. M11 Reporting se khong co data cho audit reports. Khong truy vet duoc ai doi gi khi nao.
**Fix:** Inject `LogService` from FoundationModule vao M2 services. Goi `createAuditLog()` sau moi create/update/deactivate/reactivate.

### HI-2: RequestContext Hardcoded — userId Always Undefined [HIGH]
**Code:** All controllers pass `{ userId: undefined, userRole: undefined, warehouseCode: undefined }` as RequestContext.
**Impact:** createdBy/updatedBy/deactivatedBy fields se luon la null/undefined. Khong biet ai thao tac.
**Fix:** Inject `@CurrentUser()` decorator (da co tu M1) va pass user info vao context:
```typescript
@Post()
create(@Body() dto: CreateOwnerDto, @CurrentUser() user: RequestUser) {
  const ctx = { userId: user.userId, userRole: user.primaryRole, ... };
  return this.service.create(dto, ctx);
}
```

### HI-3: FK Existence Validation Missing [HIGH]
**Code:** Services accept UUID references (baseUomId, billingUomId, warehouseId, zoneId, defaultWarehouseId, packagingMaterialItemId) but KHONG validate they exist before insert.
**Impact:** Prisma FK constraint se throw raw error. User nhan Prisma error thay vi friendly message.
**Fix:** Add validation in service layer:
```typescript
if (dto.baseUomId) {
  const uom = await this.uomRepo.findById(dto.baseUomId);
  if (!uom) throw new BadRequestException('Base UOM not found');
  if (!uom.isActive) throw new BadRequestException('Base UOM is inactive');
}
```
Apply to: Item (5 FK refs), Location (2 FK refs), Warehouse (3 FK refs), Zone (1 FK ref), Owner (1 FK ref).

### HI-4: Idempotency Not Integrated [HIGH]
**Code:** DTOs co `externalId` field nhung NO code calls `IdempotencyService.executeWithIdempotency()`.
**Impact:** Retry create operations se tao duplicate records. Vi pham CFM-09 idempotency requirement.
**Fix:** Wrap create operations voi IdempotencyService:
```typescript
async create(dto: CreateOwnerDto, ctx: RequestContext) {
  if (dto.externalId) {
    return this.idempotencyService.executeWithIdempotency({
      key: dto.externalId,
      commandName: 'CREATE_OWNER',
      sourceModule: 'MASTER_DATA',
      payload: dto,
    }, async () => { /* actual create logic */ });
  }
  // fallback: create without idempotency
}
```

### HI-5: UOM va VehicleType Thieu Reactivate Endpoint [HIGH]
**Code:** `uom.controller.ts` va `vehicle-type.controller.ts` co deactivate nhung KHONG co reactivate endpoint. Services co ca 2 methods (deactivate + reactivate) nhung controller chi expose deactivate.
**Impact:** Khi deactivate nham UOM/VehicleType, khong co cach reactivate qua API. Phai sua DB truc tiep.
**Fix:** Add reactivate route:
```typescript
@Post(':id/reactivate')
reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) { ... }
```

### HI-6: Deactivation Race Condition — No Transaction [HIGH]
**Code:** Warehouse deactivation: `findById()` → `hasActiveZones()` → `deactivate()` — 3 separate queries, no transaction. Zone deactivation similar pattern.
**Impact:** Between check (hasActiveZones) and deactivate, another user could create a new zone. Warehouse gets deactivated while having active zones.
**Fix:** Wrap in Prisma interactive transaction:
```typescript
await this.prisma.$transaction(async (tx) => {
  const wh = await tx.mdWarehouse.findUnique({ where: { id } });
  const activeZones = await tx.mdZone.count({ where: { warehouseId: id, isActive: true } });
  if (activeZones > 0) throw new BadRequestException('Cannot deactivate: has active zones');
  await tx.mdWarehouse.update({ where: { id }, data: { isActive: false, ... } });
});
```

---

## MEDIUM Issues

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| MD-1 | Lookup service hardcodes `take: 1000` — no pagination for large datasets | lookup.service.ts | Add configurable maxLookupSize, default 500 |
| MD-2 | No `@MaxLength()` on code fields — can insert very long codes | owner.dto.ts, item.dto.ts, etc. | Add `@MaxLength(50)` per spec field lengths |
| MD-3 | Tolerance fields (tolerancePctInbound/Outbound) no min/max bounds | item.dto.ts | Add `@Min(0) @Max(100)` |
| MD-4 | `siteId` hardcoded as 'TVL-SITE' in warehouse service | warehouse.service.ts | Move to config or M2 Site entity |
| MD-5 | Vendor email validated (`@IsEmail`) but owner billingEmail is not | owner.dto.ts | Add `@IsEmail()` to billingEmail |
| MD-6 | No usage-check before UOM/VehicleType deactivation | uom.service.ts, vehicle-type.service.ts | Check if referenced by active Items |
| MD-7 | `handlingFeeGroup` va `billingRateZone` are free-text strings | vehicle-type.dto.ts, zone.dto.ts | Validate against MdServiceCode/MdRateReference |
| MD-8 | InventoryStatus seed data not in Prisma seed.ts | seed.ts | Add AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT, HOLD |

---

## Diem Manh Cua Code

1. **Architecture consistent voi M1** — Controller → Service → Repository pattern. Module isolation tot. Services exported cho downstream modules.

2. **Optimistic locking implemented** — All update/deactivate/reactivate check `rowVersion` va increment. Prevents lost updates.

3. **Soft-delete universal** — All entities use `isActive` + `deactivatedAt`/`deactivatedBy`. No hard deletes.

4. **Cascade dependency checks** — Warehouse blocks deactivation if has active zones. Zone blocks if has active locations. Good hierarchy protection.

5. **Pagination standardized** — All list endpoints support `page`/`pageSize` via `PaginationDto`. Consistent pattern.

6. **Lookup controller excellent** — 8 dropdown endpoints voi hierarchical filtering (warehouse → zone → location). Clean `LookupItem` interface.

7. **Prisma schema comprehensive** — 14 M2 models cover spec baseline + extras (ServiceCode, DayType, RateReference, OwnerItemPolicy, UomConversion, ImportBatch/Line/Error).

8. **DTO validation good** — class-validator decorators applied consistently. Enum validation for OwnerType, CargoForm, WarehouseType, LocationType, ZoneType, UomClass, SupplierGroup.

---

## Cross-Check: Code vs Spec Entities

| Spec Entity | Prisma Model | CRUD | Deactivate | Reactivate | Status |
|-------------|-------------|------|-----------|-----------|--------|
| Owner | MdOwner | Y | Y | Y | OK |
| Vendor | MdVendor | Y | Y | Y | OK |
| Item | MdItem | Y | Y | Y | OK |
| Warehouse | MdWarehouse | Y | Y (cascade check) | Y | OK |
| Zone | MdZone | Y | Y (cascade check) | Y | OK |
| Location | MdLocation | Y | Y | Y | OK |
| UOM | MdUom | Y | Y | **NO endpoint** | **HI-5** |
| UOM Conversion | MdUomConversion | **NO CRUD** | — | — | **Missing** |
| Vehicle Type | MdVehicleType | Y | Y | **NO endpoint** | **HI-5** |
| Inventory Status | MdInventoryStatus | Get/List/Update | N/A (system) | N/A | OK |
| Service Code | MdServiceCode | **NO CRUD** | — | — | **Missing** |
| Day Type | MdDayType | **NO CRUD** | — | — | **Missing** |
| Rate Reference | MdRateReference | **NO CRUD** | — | — | **Missing** |
| Owner Item Policy | MdOwnerItemPolicy | **NO CRUD** | — | — | **Missing** |
| Import Batch | Schema only | **NO CRUD** | — | — | **Phase 1 or 2?** |

**Missing CRUD for 5 entities:** UomConversion, ServiceCode, DayType, RateReference, OwnerItemPolicy — Prisma models exist but no controllers/services/repos.

**Impact Assessment:**
- ServiceCode + DayType + RateReference = needed by M10 Billing. If M10 builds first, these will be blockers.
- OwnerItemPolicy = needed for per-owner tolerance/billing overrides.
- UomConversion = needed for KG↔MT billing conversion.

---

## Cross-Check: Code vs Spec RBAC

| Action | Spec: WH_ADMIN | Spec: WH_MANAGER | Code | Gap |
|--------|----------------|-------------------|------|-----|
| Create master data | Y | — | No guard | **CR-1** |
| Update master data | Y | — | No guard | **CR-1** |
| Deactivate | Y | — | No guard | **CR-1** |
| View master data | Y | Y (read) | No guard | **CR-1** |
| Import master data | Y | — | Not implemented | Phase 2? |
| Configure rate card | Y | — | Not implemented | M10 |

---

## Summary for Dev Team

| Priority | Issue | ID | Owner | Deadline |
|----------|-------|----|-------|----------|
| CRITICAL | Zero RBAC — all endpoints public | CR-1 | Dev Lead | Truoc merge |
| CRITICAL | CargoForm enum mismatch | CR-2 | BA + Dev | Truoc merge |
| CRITICAL | VehicleCategory enum mismatch | CR-3 | BA + Dev | Truoc merge |
| HIGH | No M1 AuditLog integration | HI-1 | Dev | Sprint 2 |
| HIGH | RequestContext always undefined | HI-2 | Dev | Sprint 2 |
| HIGH | FK existence validation missing | HI-3 | Dev | Sprint 2 |
| HIGH | Idempotency not integrated | HI-4 | Dev | Sprint 2 |
| HIGH | UOM/VehicleType missing reactivate | HI-5 | Dev | Sprint 2 |
| HIGH | Deactivation race condition | HI-6 | Dev | Sprint 2 |
| INFO | 5 entities missing CRUD (ServiceCode, DayType, RateReference, OwnerItemPolicy, UomConversion) | — | Dev | Truoc M10 build |

---

## Files Reviewed

### Prisma Schema (M2 section)
- `prisma/schema.prisma` — 14 M2 models, 10+ M2 enums

### Controllers (10)
- `controllers/owner.controller.ts` — Owner CRUD + deactivate/reactivate
- `controllers/item.controller.ts` — Item CRUD + deactivate/reactivate
- `controllers/warehouse.controller.ts` — Warehouse CRUD + deactivate/reactivate
- `controllers/location.controller.ts` — Location CRUD + deactivate/reactivate
- `controllers/zone.controller.ts` — Zone CRUD + deactivate/reactivate
- `controllers/uom.controller.ts` — UOM CRUD + deactivate (NO reactivate)
- `controllers/vehicle-type.controller.ts` — VehicleType CRUD + deactivate (NO reactivate)
- `controllers/vendor.controller.ts` — Vendor CRUD + deactivate/reactivate
- `controllers/inventory-status.controller.ts` — InventoryStatus get/list/update only
- `controllers/lookup.controller.ts` — 8 dropdown/autocomplete endpoints

### Services (10)
- `services/owner.service.ts` — 92 lines, unique code check, rowVersion
- `services/item.service.ts` — 109 lines, complex entity 20+ fields
- `services/warehouse.service.ts` — 101 lines, cascade zone check
- `services/location.service.ts` — 89 lines, composite key (warehouse+code)
- `services/zone.service.ts` — 74 lines, cascade location check
- `services/uom.service.ts` — 59 lines, no reactivate
- `services/vehicle-type.service.ts` — 65 lines, no reactivate
- `services/vendor.service.ts` — 75 lines, full CRUD
- `services/inventory-status.service.ts` — 42 lines, system-locked check
- `services/lookup.service.ts` — 87 lines, 8 lookup methods

### Repositories (9)
- `repositories/owner.repository.ts` — 103 lines, includes defaultWarehouse relation
- `repositories/item.repository.ts` — 105 lines, includes UOM relations
- `repositories/warehouse.repository.ts` — 103 lines, hasActiveZones check
- `repositories/location.repository.ts` — 83 lines, composite key
- `repositories/zone.repository.ts` — 85 lines, hasActiveLocations check
- `repositories/uom.repository.ts` — 68 lines
- `repositories/vehicle-type.repository.ts` — 68 lines
- `repositories/vendor.repository.ts` — 88 lines
- `repositories/inventory-status.repository.ts` — 52 lines, findAllocatable

### DTOs (10)
- `dto/common.dto.ts` — PaginationDto, DeactivateDto, ReactivateDto, RequestContext
- `dto/owner.dto.ts` — Create/Update/List with OwnerType enum
- `dto/item.dto.ts` — Create/Update/List with CargoForm enum, 20+ fields
- `dto/warehouse.dto.ts` — Create/Update/List with WarehouseType enum
- `dto/location.dto.ts` — Create/Update/List with LocationType, LocationStatus enums
- `dto/zone.dto.ts` — Create/Update/List with ZoneType enum
- `dto/uom.dto.ts` — Create/Update/List with UomClass enum
- `dto/vehicle-type.dto.ts` — Create/Update/List with VehicleCategory enum
- `dto/vendor.dto.ts` — Create/Update/List with SupplierGroup enum, @IsEmail
- `dto/inventory-status.dto.ts` — Update/List only (no create — system entity)

### Module
- `master-data.module.ts` — 85 lines, imports PrismaModule, exports all 10 services
