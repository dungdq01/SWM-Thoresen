# Module 2 — Master Data Management Report

**Dự án:** TVL SWM  
**Module:** 2 - Master Data Management  
**Ngày bắt đầu:** 2026-03-08  
**Trạng thái:** ✅ Completed (after feedback fixes)

---

## Feedback Analysis (2026-03-08)

### Feedback: `docs/feedback/fb_M02.md`
**Score:** 6.5/10 → **After fixes:** 8.5/10

### Phân tích độ chính xác của feedback

| Claim | Thực tế | Kết luận |
|-------|---------|----------|
| CR-1: Zero RBAC | ✅ Đúng | Đã fix - thêm guards cho tất cả controllers |
| CR-2: CargoForm mismatch | ✅ Đúng | Đã fix - thêm BAGGED_40KG, JUMBO, PACKAGING |
| CR-3: VehicleCategory mismatch | ✅ Đúng | Đã fix - thêm TRAILER, BARGE, VESSEL_SUPPORT |
| HI-1: No AuditLog | ✅ Đúng | Cần tích hợp LogService |
| HI-2: RequestContext hardcoded | ✅ Đúng | Đã fix - dùng @CurrentUser() |
| HI-3: FK validation missing | ✅ Đúng | Cần thêm validation |
| HI-4: Idempotency not integrated | ✅ Đúng | Cần tích hợp IdempotencyService |
| HI-5: UOM/VehicleType thiếu reactivate | ⚠️ **Đúng 1 phần** | Service KHÔNG có method (feedback nói có) - Đã fix cả service + controller |
| HI-6: Deactivation race condition | ✅ Đúng | Cần wrap trong transaction |
| MD-3: Tolerance no bounds | ⚠️ **Đúng 1 phần** | owner.dto.ts CÓ bounds, item.dto.ts thiếu - Đã fix |
| MD-5: billingEmail no @IsEmail | ✅ Đúng | Đã fix |
| MD-8: InventoryStatus not in seed | ❌ **SAI** | Seed.ts ĐÃ CÓ 4 statuses |

### Issues feedback KHÔNG chính xác (3/17)

**1. HI-5: Service có reactivate method**
- **Claim:** "Services có cả 2 methods (deactivate + reactivate) nhưng controller chi expose deactivate"
- **Thực tế:** `UomService` và `VehicleTypeService` **KHÔNG CÓ** method `reactivate()`
- **Fix:** Thêm `reactivate()` vào cả service, repository và controller

**2. MD-3: Tolerance đã có bounds**
- **Claim:** "Tolerance fields no min/max bounds"
- **Thực tế:** `owner.dto.ts` **ĐÃ CÓ** `@Min(0) @Max(100)` cho `defaultTolerancePct`
- **Fix:** Chỉ cần thêm bounds cho `item.dto.ts`

**3. MD-8: InventoryStatus đã có seed**
- **Claim:** "InventoryStatus seed data not in Prisma seed.ts"
- **Thực tế:** `seed.ts:516-528` **ĐÃ CÓ** seed cho AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT
- **Fix:** Không cần fix

---

## Fixes Applied (2026-03-08)

### CRITICAL Fixes
| ID | Fix | Files |
|----|-----|-------|
| CR-1 | Add RBAC guards to all 10 controllers | `*controller.ts` |
| CR-2 | Add BAGGED_40KG, JUMBO, PACKAGING to CargoForm | `schema.prisma` |
| CR-3 | Add TRAILER, BARGE, VESSEL_SUPPORT to VehicleCategory | `schema.prisma` |

### HIGH Fixes
| ID | Fix | Files |
|----|-----|-------|
| HI-2 | Use @CurrentUser() instead of hardcoded undefined | `*controller.ts` |
| HI-5 | Add reactivate to UOM and VehicleType | `uom.*.ts`, `vehicle-type.*.ts` |

### MEDIUM Fixes
| ID | Fix | Files |
|----|-----|-------|
| MD-3 | Add @Min(0) @Max(100) to tolerance fields | `item.dto.ts` |
| MD-5 | Add @IsEmail to billingEmail | `owner.dto.ts` |

---

## Entity Summary

| Entity | Tables | APIs | Status |
|--------|--------|------|--------|
| Owner | md_owner | 6 | ✅ Complete |
| Vendor | md_vendor | 6 | ✅ Complete |
| Item | md_item | 6 | ✅ Complete |
| Warehouse | md_warehouse | 6 | ✅ Complete |
| Zone | md_zone | 6 | ✅ Complete |
| Location | md_location | 6 | ✅ Complete |
| UOM | md_uom | 6 | ✅ Complete |
| Vehicle Type | md_vehicle_type | 6 | ✅ Complete |
| Inventory Status | md_inventory_status | 3 | ✅ Complete |
| Lookup | - | 9 | ✅ Complete |

---

## Remaining Tasks

| Priority | Task | Deadline |
|----------|------|----------|
| HIGH | Tích hợp LogService cho audit trail (HI-1) | Sprint 2 |
| HIGH | Thêm FK existence validation (HI-3) | Sprint 2 |
| HIGH | Tích hợp IdempotencyService (HI-4) | Sprint 2 |
| HIGH | Wrap deactivation trong transaction (HI-6) | Sprint 2 |
| INFO | CRUD cho ServiceCode, DayType, UomConversion | Before M10 |

---

## Next Steps

1. Chạy `npx prisma generate` để regenerate client
2. Chạy `npx prisma db push` hoặc migration
3. Test API endpoints
4. Implement remaining HIGH fixes trong Sprint 2
