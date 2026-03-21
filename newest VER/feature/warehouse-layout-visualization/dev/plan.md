# Plan: Warehouse Layout Visualization — Phase 1 (Layout Builder + 2D View)

**Feature Slug**: `warehouse-layout-visualization`
**Phase**: 1 of 3
**Scope**: Full Stack (Backend + Frontend)
**Type**: New Feature
**Priority**: High
**Complexity**: Complex
**Date**: 2026-03-19
**BA Spec**: `docs/feature/warehouse-layout-visualization/ba/spec.md`

---

## Summary

Thêm khả năng thiết lập tọa độ vật lý cho warehouse/zone/location thông qua drag-and-drop canvas
(Layout Builder), và hiển thị 2D floor plan với inventory heat map để vận hành kho trực quan.

Phase 1 bao gồm:
1. **DB Migration** — ALTER TABLE thêm layout columns vào `cat.warehouse`, `cat.zone`, `cat.location`
2. **Backend** — Layout API (CRUD tọa độ) + Inventory Map API (occupancy per location) + File upload
3. **Frontend** — Layout Builder (Konva.js) + 2D View với heat map + filters

Phase 2 (3D, React Three Fiber) sẽ được plan riêng sau khi Phase 1 hoàn thành.

---

## Requirements

- [ ] ALTER TABLE cat.warehouse: thêm layout_width_m, layout_height_m, floor_plan_url
- [ ] ALTER TABLE cat.zone: thêm layout_x, layout_y, layout_width, layout_height, layout_color
- [ ] ALTER TABLE cat.location: thêm coord_x, coord_y, coord_z, width_m, depth_m, height_m, rotation_deg, aisle, rack_no, shelf_level, bin_col
- [ ] API: GET /api/warehouses/{id}/layout — trả về toàn bộ layout data (zones + locations + coordinates)
- [ ] API: PUT /api/warehouses/{id}/layout — lưu layout (batch update zone/location coords)
- [ ] API: POST /api/warehouses/{id}/floor-plan — upload floor plan image, trả về URL
- [ ] API: GET /api/warehouses/{id}/inventory-map — occupancy % per location (join với invent_on_hand)
- [ ] Frontend: cài Konva.js (react-konva)
- [ ] Frontend: Layout Builder page — drag zone/location vào canvas, save coords
- [ ] Frontend: 2D View page — render floor plan + heat map + filter + click detail
- [ ] Frontend: sidebar navigation + i18n registration
- [ ] Business rules BR-001 đến BR-010 được enforce (xem spec.md Section 3)

---

## Impact Analysis

### Files to Create

**Backend:**
- `backend/src/Smartlog.Application/Features/WarehouseLayout/Queries/GetWarehouseLayout.cs`
- `backend/src/Smartlog.Application/Features/WarehouseLayout/Queries/GetWarehouseInventoryMap.cs`
- `backend/src/Smartlog.Application/Features/WarehouseLayout/Commands/SaveWarehouseLayout.cs`
- `backend/src/Smartlog.Application/Features/WarehouseLayout/Commands/UploadFloorPlan.cs`
- `backend/src/Smartlog.Application/Features/WarehouseLayout/Dtos/WarehouseLayoutDto.cs`
- `backend/src/Smartlog.Api/Controllers/WarehouseLayoutController.cs`

**Frontend:**
- `frontend/src/features/warehouse-layout/` (full feature module)
  - `api/warehouse-layout-api.ts`
  - `schemas/warehouse-layout-schema.ts`
  - `components/LayoutBuilder.tsx`
  - `components/LayoutCanvas.tsx` (Konva.js Stage)
  - `components/ZonePanel.tsx`
  - `components/LocationPanel.tsx`
  - `components/PropertiesPanel.tsx`
  - `components/View2D.tsx`
  - `components/InventoryHeatMap.tsx`
  - `components/LocationDetailPopup.tsx`
  - `hooks/useLayoutBuilder.ts`
  - `hooks/useInventoryMap.ts`
  - `index.ts`
- `frontend/src/routes/_authenticated/warehouses/$warehouseId/layout.tsx`
- `frontend/src/routes/_authenticated/warehouses/$warehouseId/2d-view.tsx`
- `frontend/src/i18n/locales/en/warehouseLayout.json`
- `frontend/src/i18n/locales/vi/warehouseLayout.json`

### Files to Modify

**Backend:**
- `backend/src/Smartlog.Domain/Entities/MasterData/Warehouse.cs` — thêm layout properties
- `backend/src/Smartlog.Domain/Entities/MasterData/Zone.cs` — thêm layout properties
- `backend/src/Smartlog.Domain/Entities/MasterData/Location.cs` — thêm coord/rack properties
- `backend/src/Smartlog.Infrastructure/EntityFramework/Configurations/MasterData/WarehouseConfiguration.cs`
- `backend/src/Smartlog.Infrastructure/EntityFramework/Configurations/MasterData/ZoneConfiguration.cs`
- `backend/src/Smartlog.Infrastructure/EntityFramework/Configurations/MasterData/LocationConfiguration.cs`
- `backend/src/Smartlog.Domain/IAppDbContext.cs` — không cần thay đổi (entities đã có DbSet)
- `backend/src/Smartlog.Infrastructure/EntityFramework/AppDbContext.cs` — không cần thay đổi

**Frontend:**
- `frontend/src/components/layout/data/sidebar-data.ts` — thêm Layout Builder + 2D View nav items
- `frontend/src/i18n/locales/en/navigation.json` — thêm warehouseLayout, view2d keys
- `frontend/src/i18n/locales/vi/navigation.json` — thêm warehouseLayout, view2d keys

### Database Changes

```
Migration: AddWarehouseLayoutCoordinates
ALTER TABLE cat.warehouse ADD COLUMN layout_width_m  numeric(10,2)  NULL
ALTER TABLE cat.warehouse ADD COLUMN layout_height_m numeric(10,2)  NULL
ALTER TABLE cat.warehouse ADD COLUMN floor_plan_url  text           NULL
ALTER TABLE cat.zone ADD COLUMN layout_x      numeric(10,4)  NULL
ALTER TABLE cat.zone ADD COLUMN layout_y      numeric(10,4)  NULL
ALTER TABLE cat.zone ADD COLUMN layout_width  numeric(10,4)  NULL
ALTER TABLE cat.zone ADD COLUMN layout_height numeric(10,4)  NULL
ALTER TABLE cat.zone ADD COLUMN layout_color  varchar(20)    NULL DEFAULT '#4A90D9'
ALTER TABLE cat.location ADD COLUMN coord_x      numeric(10,4)  NULL
ALTER TABLE cat.location ADD COLUMN coord_y      numeric(10,4)  NULL
ALTER TABLE cat.location ADD COLUMN coord_z      numeric(10,4)  NULL DEFAULT 0
ALTER TABLE cat.location ADD COLUMN width_m      numeric(6,2)   NULL
ALTER TABLE cat.location ADD COLUMN depth_m      numeric(6,2)   NULL
ALTER TABLE cat.location ADD COLUMN height_m     numeric(6,2)   NULL
ALTER TABLE cat.location ADD COLUMN rotation_deg smallint       NULL DEFAULT 0
ALTER TABLE cat.location ADD COLUMN aisle        varchar(20)    NULL
ALTER TABLE cat.location ADD COLUMN rack_no      varchar(20)    NULL
ALTER TABLE cat.location ADD COLUMN shelf_level  smallint       NULL
ALTER TABLE cat.location ADD COLUMN bin_col      smallint       NULL
```

### API Changes
- 4 new endpoints under `/api/warehouse-layout/`
- Không modify endpoints hiện có

### UI Changes
- 2 new pages: Layout Builder, 2D View
- Sidebar: thêm nav items dưới group "Warehouses" hoặc tạo group mới "Visualization"
- Existing warehouse management pages: không thay đổi

### Breaking Changes
- **None** — tất cả columns mới đều NULL-able. Existing records/operations không bị ảnh hưởng.

---

## Architecture Decisions

### ADR-001: ALTER TABLE thay vì New Tables

**Decision**: Thêm columns vào `cat.warehouse`, `cat.zone`, `cat.location` thay vì tạo bảng layout riêng.

**Rationale**:
- Tối giản migration risk — không có FK mới, không join thêm
- Inventory map query (join với invent_on_hand) đơn giản hơn (không cần sub-join)
- Layout data là optional per row (NULL = unplaced) — không cần separate entity lifecycle

**Trade-off**: Nếu tương lai cần version history của layout thì cần refactor. Acceptable cho Phase 1.

---

### ADR-002: Coordinate System — Meter-based từ Warehouse Origin

**Decision**: coord_x/y tính bằng meter từ góc warehouse (0,0).

**Rationale**:
- Trực quan với warehouse ops (thước đo thực tế)
- Canvas rendering: convert meter → pixel bằng scale factor (`pixels_per_meter = canvasWidth / layout_width_m`)
- Không phụ thuộc resolution của floor plan image

---

### ADR-003: Konva.js cho 2D Canvas (Phase 1), React Three Fiber cho 3D (Phase 2)

**Decision**: Phase 1 dùng `react-konva` cho cả Layout Builder và 2D View.

**Rationale**:
- Konva.js mature, MIT, React 19 compatible
- Hỗ trợ drag-and-drop, resize, scale natively
- Nhẹ hơn SVG approach với large number of elements
- Phase 2 R3F sẽ dùng cùng coordinate system, dễ port

---

### ADR-004: Inventory Map là Separate API

**Decision**: `GET /api/warehouse-layout/{id}/inventory-map` là endpoint riêng, không bundle vào layout data.

**Rationale**:
- Layout data thay đổi ít (admin setup) — có thể cache dài
- Inventory data thay đổi nhiều (sau mỗi transaction) — cần fresh data
- Frontend poll inventory-map riêng khi user cần refresh heat map

---

### ADR-005: File Upload — Store URL trong floor_plan_url

**Decision**: Backend nhận file, lưu vào file storage (IFileStorageService), trả về URL. URL lưu vào `cat.warehouse.floor_plan_url`.

**Note**: IFileStorageService cần implement bởi Tech Lead (xem OQ-001 — storage provider chưa xác định). Phase 1 backend agent tạo interface + local disk implementation. Production implementation sẽ swap sau.

---

### ADR-006: SaveWarehouseLayout là Batch Upsert

**Decision**: `PUT /api/warehouse-layout/{warehouseId}` nhận toàn bộ layout state (all zones + all locations) và batch update.

**Rationale**:
- Frontend canvas state = single source of truth trong session
- Tránh individual update per element → N+1 round trips
- Idempotent: save nhiều lần không có side effects

---

## Notes & Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R-001 | OQ-001 chưa resolve (storage provider) | Medium | ADR-005: dùng local disk impl Phase 1, swap production sau |
| R-002 | Konva.js chưa có trong frontend dependencies | Low | `pnpm add konva react-konva` — minor package addition |
| R-003 | Location count lớn (11 kho × nhiều location) → canvas performance | Medium | Virtualize: chỉ render locations trong viewport khi zoom; use Konva Layer caching |
| R-004 | Existing Warehouse/Zone/Location entities chưa xem — có thể có mapping conflicts | Low | Backend agent đọc existing entities trước khi modify |
| R-005 | invent_on_hand join: table đã có trong context của phase3/4 operations | Low | Dùng query pattern từ inventory snapshot |
