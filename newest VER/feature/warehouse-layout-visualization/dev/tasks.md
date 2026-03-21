# Tasks: Warehouse Layout Visualization — Phase 1

> Plan: `docs/feature/warehouse-layout-visualization/dev/plan.md`
> Context: `docs/feature/warehouse-layout-visualization/dev/context.json`
> BA Spec: `docs/feature/warehouse-layout-visualization/ba/spec.md`

---

## Phase 1 Task Checklist

| # | Task | Agent | Dependencies | Status |
|---|------|-------|-------------|--------|
| **BACKEND** |
| B-01 | Đọc existing Warehouse, Zone, Location entities + configurations để hiểu current structure | /backend | None | Pending |
| B-02 | Thêm layout properties vào Warehouse, Zone, Location domain entities | /backend | B-01 | Pending |
| B-03 | Cập nhật EF Configurations (WarehouseConfiguration, ZoneConfiguration, LocationConfiguration) | /backend | B-02 | Pending |
| B-04 | Tạo EF migration `AddWarehouseLayoutCoordinates` | /backend | B-03 | Pending |
| B-05 | Tạo DTOs: WarehouseLayoutDto, ZoneLayoutDto, LocationLayoutDto, InventoryMapDto | /backend | B-02 | Pending |
| B-06 | Tạo Query: GetWarehouseLayout (trả về zones + locations + coords) | /backend | B-05 | Pending |
| B-07 | Tạo Query: GetWarehouseInventoryMap (occupancy per location, join invent_on_hand) | /backend | B-05 | Pending |
| B-08 | Tạo Command: SaveWarehouseLayout (batch upsert zone/location coords) | /backend | B-05 | Pending |
| B-09 | Tạo IFileStorageService interface + LocalDiskFileStorageService implementation | /backend | None | Pending |
| B-10 | Tạo Command: UploadFloorPlan (nhận IFormFile, lưu, trả URL) | /backend | B-09 | Pending |
| B-11 | Tạo WarehouseLayoutController (GET layout, PUT layout, POST floor-plan, GET inventory-map) | /backend | B-06, B-07, B-08, B-10 | Pending |
| B-12 | Register IFileStorageService trong DI container | /backend | B-09 | Pending |
| **FRONTEND** |
| F-01 | Cài package: `pnpm add konva react-konva` (và types nếu cần) | /frontend | B-11 | Pending |
| F-02 | Tạo `warehouse-layout-api.ts` — API client cho 4 endpoints | /frontend | B-11 | Pending |
| F-03 | Tạo `warehouse-layout-schema.ts` — Zod schemas cho layout data | /frontend | F-02 | Pending |
| F-04 | Tạo `useLayoutBuilder.ts` hook — quản lý canvas state, drag/drop, undo/redo | /frontend | F-03 | Pending |
| F-05 | Tạo `useInventoryMap.ts` hook — fetch + cache inventory occupancy | /frontend | F-02 | Pending |
| F-06 | Tạo `LayoutCanvas.tsx` — Konva Stage với background image, zone rects, location cells | /frontend | F-04 | Pending |
| F-07 | Tạo `ZonePanel.tsx` + `LocationPanel.tsx` — sidebar danh sách unplaced items | /frontend | F-04 | Pending |
| F-08 | Tạo `PropertiesPanel.tsx` — manual coordinate input form cho selected element | /frontend | F-04 | Pending |
| F-09 | Tạo `LayoutBuilder.tsx` — page wrapper ghép canvas + panels + save/upload buttons | /frontend | F-06, F-07, F-08 | Pending |
| F-10 | Tạo `InventoryHeatMap.tsx` — Konva Layer với colored location cells theo occupancy% | /frontend | F-05 | Pending |
| F-11 | Tạo `LocationDetailPopup.tsx` — popup khi click location (inventory breakdown) | /frontend | F-05 | Pending |
| F-12 | Tạo `View2D.tsx` — page wrapper: floor plan + heat map + owner/item/lot filters | /frontend | F-10, F-11 | Pending |
| F-13 | Tạo route `/warehouses/$warehouseId/layout` → LayoutBuilder page | /frontend | F-09 | Pending |
| F-14 | Tạo route `/warehouses/$warehouseId/2d-view` → View2D page | /frontend | F-12 | Pending |
| F-15 | Cập nhật sidebar-data.ts — thêm "Layout Builder" + "2D View" nav items | /frontend | F-13, F-14 | Pending |
| F-16 | Tạo i18n files: en/warehouseLayout.json + vi/warehouseLayout.json | /frontend | F-09, F-12 | Pending |
| F-17 | Cập nhật en/navigation.json + vi/navigation.json — thêm layout keys | /frontend | F-15 | Pending |
| **REVIEW + TEST** |
| R-01 | Code review toàn bộ backend changes | /reviewer | B-01 → B-12 | Pending |
| R-02 | Code review toàn bộ frontend changes | /reviewer | F-01 → F-17 | Pending |
| T-01 | Unit tests: SaveWarehouseLayout command (validation, batch update logic) | /tester | B-08 | Pending |
| T-02 | Unit tests: GetWarehouseInventoryMap (occupancy calculation, edge cases) | /tester | B-07 | Pending |
| T-03 | Unit tests: UploadFloorPlan command (file validation, storage) | /tester | B-10 | Pending |

---

## Dependency Order

```
B-01 → B-02 → B-03 → B-04 (migration)
B-02 → B-05 → B-06, B-07, B-08
B-09 → B-10
B-06 + B-07 + B-08 + B-10 → B-11 → B-12

F-01 (install) → [parallel with B-11 in progress]
B-11 → F-02 → F-03 → F-04, F-05
F-04 → F-06, F-07, F-08 → F-09 → F-13
F-05 → F-10, F-11 → F-12 → F-14
F-13 + F-14 → F-15 → F-17
F-09 + F-12 → F-16

(B-01 → B-12 done) → R-01
(F-01 → F-17 done) → R-02
R-01 + R-02 → T-01, T-02, T-03
```

---

## Parallel Execution Groups

| Group | Can Run In Parallel |
|-------|-------------------|
| Group A | B-09 (file storage) ∥ B-01 (read existing entities) |
| Group B | B-06 (GetLayout) ∥ B-07 (GetInventoryMap) ∥ B-08 (SaveLayout) — after B-05 done |
| Group C | F-04 (hook builder) ∥ F-05 (hook inventory) — after F-03 done |
| Group D | R-01 (BE review) ∥ R-02 (FE review) — fully independent |
| Group E | T-01 ∥ T-02 ∥ T-03 — all independent |
