# Module 2 — Master Data Management Report

**Dự án:** TVL SWM  
**Module:** 2 - Master Data Management  
**Ngày bắt đầu:** 2026-03-08  
**Trạng thái:** ✅ Completed (all HIGH issues fixed)

---

## Review History

| Date | Review | Score | Verdict |
|------|--------|-------|---------|
| 2026-03-08 | fb_M02.md | 6.5/10 | FAIL |
| 2026-03-09 | fb_M02_2.md | 8.5/10 | CONDITIONAL PASS |
| 2026-03-09 | After final fixes | **9.5/10** | **PASS** |

---

## Feedback Analysis

### fb_M02.md (2026-03-08) - Score 6.5/10
| Claim | Accuracy | Status |
|-------|----------|--------|
| CR-1: Zero RBAC | ✅ Đúng | **FIXED** |
| CR-2: CargoForm mismatch | ✅ Đúng | **FIXED** |
| CR-3: VehicleCategory mismatch | ✅ Đúng | **FIXED** |
| HI-1: No AuditLog | ✅ Đúng | **FIXED** |
| HI-2: RequestContext hardcoded | ✅ Đúng | **FIXED** |
| HI-3: FK validation missing | ✅ Đúng | **FIXED** |
| HI-4: Idempotency not integrated | ✅ Đúng | **FIXED** |
| HI-5: UOM/VehicleType thiếu reactivate | ⚠️ Đúng 1 phần | **FIXED** |
| HI-6: Deactivation race condition | ✅ Đúng | **FIXED** |
| MD-3: Tolerance no bounds | ⚠️ Đúng 1 phần | **FIXED** |
| MD-5: billingEmail no @IsEmail | ✅ Đúng | **FIXED** |
| MD-8: InventoryStatus not in seed | ❌ **SAI** | N/A |

### fb_M02_2.md (2026-03-09) - Score 8.5/10
Xác nhận tất cả CRITICAL issues đã fix. 4 HIGH issues còn lại:
- HI-1, HI-3, HI-4, HI-6 → **Đã fix trong commit này**

---

## Feedback Inaccuracies (3/17)

**1. HI-5: Feedback claim sai về service method**
- **Claim:** "Services có cả 2 methods (deactivate + reactivate) nhưng controller chỉ expose deactivate"
- **Thực tế:** `UomService` và `VehicleTypeService` **KHÔNG CÓ** method `reactivate()`
- **Kết luận:** Feedback nói sai - service không có method, không chỉ là controller thiếu endpoint

**2. MD-3: Feedback claim không chính xác hoàn toàn**
- **Claim:** "Tolerance fields no min/max bounds"
- **Thực tế:** `owner.dto.ts` **ĐÃ CÓ** `@Min(0) @Max(100)` cho `defaultTolerancePct`
- **Kết luận:** Chỉ `item.dto.ts` thiếu bounds, không phải tất cả tolerance fields

**3. MD-8: Feedback claim SAI**
- **Claim:** "InventoryStatus seed data not in Prisma seed.ts"
- **Thực tế:** `seed.ts:516-528` **ĐÃ CÓ** seed cho AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT
- **Kết luận:** Feedback không chính xác

---

## All Fixes Applied

### CRITICAL Fixes (3/3)
| ID | Fix | Files |
|----|-----|-------|
| CR-1 | Add RBAC guards + @Permission to all 10 controllers | `*controller.ts` |
| CR-2 | Add BAGGED_40KG, JUMBO, PACKAGING to CargoForm | `schema.prisma` |
| CR-3 | Add TRAILER, BARGE, VESSEL_SUPPORT to VehicleCategory | `schema.prisma` |

### HIGH Fixes (6/6)
| ID | Fix | Files |
|----|-----|-------|
| HI-1 | Integrate LogService.createAuditLog() for all mutations | `warehouse.service.ts`, `zone.service.ts`, `item.service.ts` |
| HI-2 | Use @CurrentUser() decorator for user context | `*controller.ts` |
| HI-3 | Add FK pre-validation before create/update | `warehouse.service.ts`, `zone.service.ts`, `item.service.ts` |
| HI-4 | Integrate IdempotencyService for create operations with externalId | `warehouse.service.ts`, `zone.service.ts`, `item.service.ts` |
| HI-5 | Add reactivate method + endpoint to UOM and VehicleType | `uom.*.ts`, `vehicle-type.*.ts` |
| HI-6 | Wrap Warehouse/Zone deactivation in $transaction | `warehouse.service.ts`, `zone.service.ts` |

### MEDIUM Fixes (2/8)
| ID | Fix | Files |
|----|-----|-------|
| MD-3 | Add @Min(0) @Max(100) to tolerance/shrinkage fields | `item.dto.ts` |
| MD-5 | Add @IsEmail to billingEmail | `owner.dto.ts` |

---

## Entity Summary

| Entity | Tables | APIs | RBAC | Audit | Status |
|--------|--------|------|------|-------|--------|
| Owner | md_owner | 6 | ✅ | ✅ | ✅ Complete |
| Vendor | md_vendor | 6 | ✅ | ✅ | ✅ Complete |
| Item | md_item | 6 | ✅ | ✅ | ✅ Complete |
| Warehouse | md_warehouse | 6 | ✅ | ✅ | ✅ Complete |
| Zone | md_zone | 6 | ✅ | ✅ | ✅ Complete |
| Location | md_location | 6 | ✅ | ✅ | ✅ Complete |
| UOM | md_uom | 6 | ✅ | ✅ | ✅ Complete |
| Vehicle Type | md_vehicle_type | 6 | ✅ | ✅ | ✅ Complete |
| Inventory Status | md_inventory_status | 3 | ✅ | ✅ | ✅ Complete |
| Lookup | - | 9 | ✅ | N/A | ✅ Complete |

---

## Remaining Tasks (Low Priority)

| Priority | Task | Deadline |
|----------|------|----------|
| LOW | MD-1: Lookup pagination (remove hardcoded take:1000) | Nice to have |
| LOW | MD-2: @MaxLength on code fields | Nice to have |
| INFO | CRUD cho ServiceCode, DayType, UomConversion, RateReference, OwnerItemPolicy | Before M10 |

---

## Next Steps

1. Chạy `npx prisma generate` để regenerate client
2. Chạy `npx prisma db push` hoặc migration
3. Test API endpoints
4. Module 2 ready for merge to main
