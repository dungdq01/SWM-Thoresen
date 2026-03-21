# Feature Specification — Warehouse Layout Visualization (2D/3D)

**Feature Slug**: `warehouse-layout-visualization`
**Domain**: Master Data / Inventory / Operations
**Priority**: High
**Complexity**: Complex
**Date**: 2026-03-18
**Author**: BA Agent
**Status**: Draft — Pending Stakeholder Review

---

## 1. Overview

### Problem Statement

Hệ thống Smartlog WMS hiện quản lý kho thuần text (code + name) mà không có bất kỳ spatial context
nào. Với 11 kho tổng diện tích ~81,500 m², operator mất thời gian định vị vị trí, manager không thể
đánh giá nhanh tình trạng kho, và không thể tối ưu đường đi forklift.

### Business Context

- **Loại kho**: Bulk cargo, 3PL logistics (TVL — Thoresen Vinama Logistics)
- **Đặc thù**: Weighbridge-centric, không dùng barcode/RFID, cargo lớn (container, bulk bags)
- **User chính**: Warehouse Manager (planning), Warehouse Operator (daily ops), Admin (setup)

### Scope

| In Scope | Out of Scope |
|----------|-------------|
| Layout builder drag-and-drop cho zone + location | Barcode/RFID integration |
| 2D top-down floor plan với inventory heat map | AR/VR overlay |
| 3D rack visualization với inventory overlay | Real-time forklift GPS tracking |
| Tọa độ tự động khi kéo thả + manual input | Route optimization algorithm (Phase 3) |
| Filter inventory theo vị trí trên map | Multi-floor / mezzanine support (Phase 3) |

---

## 2. User Stories

### US-001 — Layout Builder: Thiết lập tọa độ Warehouse

```
As a Warehouse Administrator,
I want to define the physical dimensions and floor plan of a warehouse,
So that zones and locations can be placed accurately on a visual canvas.
```

**Acceptance Criteria:**
- Given I am on the Warehouse edit page
- When I click "Configure Layout"
- Then I can input warehouse dimensions (width × height in meters)
- And I can upload a floor plan image (JPG/PNG, max 10MB) as background
- And the system saves layout_width_m, layout_height_m, floor_plan_url
- And the canvas displays with correct aspect ratio

---

### US-002 — Layout Builder: Drag & Drop Zone vào Floor Plan

```
As a Warehouse Administrator,
I want to drag zones (already created in master data) onto the warehouse floor plan canvas,
So that each zone's physical position is recorded without manual coordinate input.
```

**Acceptance Criteria:**
- Given zones exist for this warehouse
- When I open the Layout Builder
- Then a sidebar lists all zones for this warehouse (unplaced zones highlighted)
- When I drag a zone onto the canvas
- Then the zone appears as a colored rectangle at the drop position
- And coord_x, coord_y, layout_width, layout_height are auto-populated from drop position
- And I can resize/rotate the zone rectangle on canvas
- And on Save, coordinates are persisted to cat.zone

---

### US-003 — Layout Builder: Drag & Drop Location vào Zone

```
As a Warehouse Administrator,
I want to drag locations (already created in master data) into their zone on the canvas,
So that each location's physical coordinates are recorded with visual context.
```

**Acceptance Criteria:**
- Given a zone is placed on the canvas
- When I click on a zone
- Then a panel shows unplaced locations for that zone
- When I drag a location into the zone on canvas
- Then location appears as a cell/slot at drop position
- And coord_x, coord_y, width_m, depth_m are auto-populated
- And I can optionally input aisle / rack_no / shelf_level / bin_col manually
- And on Save, coordinates persisted to cat.location

---

### US-004 — Layout Builder: Manual Coordinate Input

```
As a Warehouse Administrator,
I want to input exact coordinates for a zone or location manually,
So that I can precisely match the physical warehouse layout (e.g., from AutoCAD drawings).
```

**Acceptance Criteria:**
- Given I select a zone or location on the canvas
- When I open the properties panel
- Then I can input coord_x, coord_y (for location also coord_z), width, depth, height in meters
- And the canvas updates the element position/size in real-time on input change
- And validation: coord_x, coord_y must be within warehouse bounds
- And for location: coordinates must be within the parent zone bounds (warning, not block)

---

### US-005 — 2D Visualization: Floor Plan View

```
As a Warehouse Manager,
I want to see a 2D top-down view of the warehouse showing all zones and locations,
So that I can quickly understand the warehouse layout and inventory distribution.
```

**Acceptance Criteria:**
- Given layout is configured for a warehouse
- When I navigate to Warehouse → 2D View
- Then the floor plan renders with background image (if set)
- And zones render as colored polygons/rectangles with labels
- And locations render as cells within zones
- And the view supports zoom (scroll wheel) and pan (drag)
- And warehouse dimensions are shown in meter scale indicator

---

### US-006 — 2D Visualization: Inventory Heat Map

```
As a Warehouse Manager,
I want to see location occupancy visualized as a color heat map,
So that I can identify full, partially full, and empty locations at a glance.
```

**Acceptance Criteria:**
- Given 2D view is open
- When inventory data is loaded
- Then each location cell is colored:
  - Empty (0%): White / light gray
  - Low (1–40%): Light green
  - Medium (41–70%): Yellow/amber
  - High (71–99%): Orange
  - Full (100%+): Red
- Occupancy% = (current inventory qty_mt / capacity_mt) × 100
- When I hover over a location
- Then a tooltip shows: location code, current_qty_mt, capacity_mt, occupancy%, top owner/item
- When I click on a location
- Then a detail panel opens showing full inventory breakdown (by owner, item, lot)

---

### US-007 — 2D Visualization: Inventory Filters

```
As a Warehouse Operator,
I want to filter the 2D view by owner, item, or lot,
So that I can quickly find where specific cargo is stored.
```

**Acceptance Criteria:**
- Given 2D view is open
- When I select an owner / item / lot from filter dropdowns
- Then only locations containing that inventory are highlighted
- And locations without matching inventory are dimmed
- And a count badge shows "X locations found"
- And I can click a highlighted location to view details
- Filter combinations: owner only, item only, lot only, owner + item, owner + item + lot

---

### US-008 — 3D Visualization: Rack View

```
As a Warehouse Manager,
I want to see a 3D visualization of storage racks showing shelf levels,
So that I can understand vertical space utilization and plan putaway efficiently.
```

**Acceptance Criteria:**
- Given locations have shelf_level, rack_no, and aisle defined
- When I navigate to Warehouse → 3D View
- Then racks render as 3D boxes grouped by aisle → rack → shelf_level
- And camera supports orbit (mouse drag), zoom (scroll), pan (right-click drag)
- And each shelf slot is colored by occupancy (same heat map scale as 2D)
- And clicking a shelf slot shows inventory detail tooltip
- And I can toggle between "All Aisles" and select a specific aisle to focus

---

### US-009 — 3D Visualization: Inbound/Outbound Path Highlight

```
As a Warehouse Operator,
I want to see the suggested path for a putaway or pick task highlighted on the 2D/3D view,
So that I can navigate to the target location efficiently.
```

**Acceptance Criteria:**
- Given an active putaway work order or pick task
- When I open 2D/3D view and select that work order
- Then the target location is highlighted (pulsing animation)
- And a path line is drawn from current dock/staging area to target location
  (straight-line path, Phase 1 — no pathfinding algorithm)
- And distance in meters is shown on the path

---

## 3. Business Rules

| ID | Rule | Category | Description |
|----|------|----------|-------------|
| BR-001 | Coordinate bounds | Validation | coord_x must be in [0, layout_width_m]; coord_y in [0, layout_height_m] |
| BR-002 | Zone within warehouse | Constraint | Zone rectangle must fit within warehouse canvas bounds |
| BR-003 | Location within zone | Constraint | Location coordinates should fall within parent zone (soft warning if outside) |
| BR-004 | Capacity-based occupancy | Calculation | occupancy_pct = SUM(invent_on_hand.qty_mt WHERE location_id) / capacity_mt × 100 |
| BR-005 | No coordinates = unplaced | Derivation | If coord_x IS NULL → location is "unplaced", shown in unplaced list, not on canvas |
| BR-006 | Layout optional per warehouse | Constraint | Layout visualization is optional; existing warehouse/zone/location records without coords continue to work normally in all other operations |
| BR-007 | Shelf level numbering | Constraint | shelf_level: 1 = ground floor, 2 = second level, etc. Max configurable per warehouse |
| BR-008 | Rotation | Constraint | rotation_deg: 0, 90, 180, 270 only (no arbitrary angles) |
| BR-009 | Layout dimensions | Validation | layout_width_m and layout_height_m must both be set before any zone/location can be placed |
| BR-010 | Coord precision | Constraint | Coordinates stored to 4 decimal places (sub-centimeter precision) |

---

## 4. Data Model

### 4.1 Schema Changes (ALTER TABLE — no new tables)

```sql
-- cat.warehouse: Layout canvas config
ALTER TABLE cat.warehouse
  ADD COLUMN layout_width_m   numeric(10,2)  NULL,
  ADD COLUMN layout_height_m  numeric(10,2)  NULL,
  ADD COLUMN floor_plan_url   text           NULL;
-- layout_width_m, layout_height_m: real-world dimensions in meters
-- floor_plan_url: CDN/S3 URL for background floor plan image

-- cat.zone: 2D placement on warehouse canvas
ALTER TABLE cat.zone
  ADD COLUMN layout_x         numeric(10,4)  NULL,  -- meters from warehouse origin
  ADD COLUMN layout_y         numeric(10,4)  NULL,
  ADD COLUMN layout_width     numeric(10,4)  NULL,  -- zone width in meters
  ADD COLUMN layout_height    numeric(10,4)  NULL,  -- zone height in meters
  ADD COLUMN layout_color     varchar(20)    NULL DEFAULT '#4A90D9';  -- hex color
-- All NULL = unplaced (still functional in all other operations)

-- cat.location: 3D position + rack hierarchy
ALTER TABLE cat.location
  ADD COLUMN coord_x          numeric(10,4)  NULL,  -- X from warehouse origin (meters)
  ADD COLUMN coord_y          numeric(10,4)  NULL,  -- Y from warehouse origin (meters)
  ADD COLUMN coord_z          numeric(10,4)  NULL DEFAULT 0,  -- Z / floor height (meters)
  ADD COLUMN width_m          numeric(6,2)   NULL,
  ADD COLUMN depth_m          numeric(6,2)   NULL,
  ADD COLUMN height_m         numeric(6,2)   NULL,
  ADD COLUMN rotation_deg     smallint       NULL DEFAULT 0,
  ADD COLUMN aisle            varchar(20)    NULL,
  ADD COLUMN rack_no          varchar(20)    NULL,
  ADD COLUMN shelf_level      smallint       NULL,  -- 1=ground, 2,3,...
  ADD COLUMN bin_col          smallint       NULL;
-- All NULL = unplaced (still functional in all other operations)
```

### 4.2 Entity Relationship (Visual Feature Context)

```
cat.warehouse (1)
  ├── floor_plan_url → [CDN storage]
  ├── layout_width_m, layout_height_m
  └── cat.zone (N)
        ├── layout_x, layout_y, layout_width, layout_height, layout_color
        └── cat.location (N)
              ├── coord_x, coord_y, coord_z
              ├── width_m, depth_m, height_m, rotation_deg
              └── aisle / rack_no / shelf_level / bin_col
                    └── [links to invent_on_hand via location_id]
```

### 4.3 Read Model for 2D/3D Rendering (Query)

```sql
-- 2D Heat Map Query
SELECT
  l.id, l.code, l.name, l.location_type,
  l.coord_x, l.coord_y, l.width_m, l.depth_m, l.rotation_deg,
  l.capacity_mt,
  COALESCE(SUM(oh.qty_mt), 0)                          AS current_qty_mt,
  COALESCE(SUM(oh.qty_mt) / NULLIF(l.capacity_mt, 0) * 100, 0) AS occupancy_pct,
  z.layout_x AS zone_x, z.layout_y AS zone_y,
  z.layout_color AS zone_color
FROM cat.location l
LEFT JOIN invent.invent_on_hand oh ON oh.location_id = l.id
JOIN cat.zone z ON z.id = l.zone_id
WHERE l.warehouse_id = :warehouse_id
  AND l.coord_x IS NOT NULL
  AND l.tenant_id = :tenant_id
GROUP BY l.id, z.layout_x, z.layout_y, z.layout_color;
```

---

## 5. UI Notes

### 5.1 Layout Builder (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  [Warehouse: HCM-01]  [Width: ___ m] [Height: ___ m]        │
│  [Upload Floor Plan]  [Save Layout]  [Preview 2D] [Preview 3D]│
├────────────────┬────────────────────────────────────────────┤
│ ZONES PANEL    │  CANVAS (Konva.js stage)                    │
│ ┌──────────┐   │  ┌──────────────────────────────────────┐  │
│ │ Zone A   │   │  │  [Floor plan image background]        │  │
│ │ (placed) │   │  │                                        │  │
│ ├──────────┤   │  │  ┌────────────┐  ┌──────────┐         │  │
│ │ Zone B   │◄──┼──┼─►│  Zone A   │  │  Zone B  │         │  │
│ │(unplaced)│   │  │  │ [Loc1][L2]│  │          │         │  │
│ ├──────────┤   │  │  └────────────┘  └──────────┘         │  │
│ │ Zone C   │   │  │                                        │  │
│ └──────────┘   │  └──────────────────────────────────────┘  │
├────────────────┤  ┌──────────────────────────────────────┐  │
│ PROPERTIES     │  │ Selected: Zone A                       │  │
│ X: ___ Y: ___  │  │ X: 10.0  Y: 5.0  W: 30.0  H: 20.0   │  │
│ W: ___ H: ___  │  │ Color: [■]                             │  │
│ Color: [■]     │  └──────────────────────────────────────┘  │
└────────────────┴────────────────────────────────────────────┘
```

**Interaction rules:**
- Drag zone from sidebar → drops at mouse position on canvas → auto-calc coords
- Resize handles on corners/edges → updates width/height in real-time
- Click zone → expand to show locations panel in sidebar
- Drag location into zone → snaps to grid (configurable grid size, default 1m)
- Double-click any element → open properties panel for manual coordinate input
- Undo/Redo (Ctrl+Z / Ctrl+Y) within session

### 5.2 2D View (Operations)

```
┌─────────────────────────────────────────────────────────────┐
│  Warehouse: [HCM-01 ▼]   Filter: [Owner ▼] [Item ▼] [Lot ▼] │
│  View: [2D] [3D]   Scale: 1:200   Legend: ██ Full ██ High ░░ │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Floor plan with colored zone overlays]                   │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │          RECEIVING ZONE (blue)                        │  │
│   │  [R01]  [R02]  [R03]  [R04]                          │  │
│   ├──────────────────────────────────────────────────────┤  │
│   │          STORAGE ZONE A (green gradient)              │  │
│   │  [S01]▓▓ [S02]░░ [S03]▓▓▓ [S04]░░                   │  │
│   │  [S05]░░ [S06]▓▓▓▓ [S07]░░ [S08]▓▓▓▓▓               │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   [Scale bar: 0────50m]   [N↑]   Last updated: 14:23:05     │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Location Detail Popup (on click in 2D view)

```
┌────────────────────────────┐
│ Location: S03              │
│ Zone: Storage A            │
│ Type: STORAGE              │
│ ────────────────────────── │
│ Capacity:   500 MT         │
│ Used:       342 MT (68.4%) │
│ ━━━━━━━━━━━━░░░░░░  68.4%  │
│ ────────────────────────── │
│ Inventory Breakdown:       │
│ Owner A – Rice 50kg: 200MT │
│ Owner B – Corn: 142MT      │
│ ────────────────────────── │
│ [View Inventory Details]   │
└────────────────────────────┘
```

### 5.4 3D View Controls

- **Orbit**: Left mouse drag
- **Zoom**: Scroll wheel
- **Pan**: Right mouse drag / Middle mouse drag
- **Select**: Click on rack slot
- **Reset camera**: Double-click empty space
- **Toggle**: Aisle labels, grid floor, occupancy colors

---

## 6. Dependencies

| Dependency | Type | Description |
|-----------|------|-------------|
| cat.warehouse | Existing | Cần thêm layout columns |
| cat.zone | Existing | Cần thêm layout_x/y/width/height/color columns |
| cat.location | Existing | Cần thêm coord_x/y/z, dimensions, hierarchy columns |
| invent.invent_on_hand | Existing | Read-only, dùng cho occupancy calculation |
| File storage (S3/CDN) | New | Upload floor plan image |
| Konva.js | New frontend lib | 2D canvas drag-and-drop |
| React Three Fiber | New frontend lib | 3D rendering |
| Three.js | New frontend lib | Transitive dep của R3F |

---

## 7. Open Questions

| # | Question | Owner | Impact |
|---|---------|-------|--------|
| OQ-001 | Floor plan image upload: dùng storage service nào? (AWS S3, Azure Blob, MinIO, local?) | Tech Lead | Backend implementation |
| OQ-002 | Grid snapping: step mặc định là bao nhiêu? (0.5m, 1m?) và có cho phép tắt snap không? | Warehouse Ops | UX Layout Builder |
| OQ-003 | 3D rack model: có cần model 3D chi tiết (forklift clearance, beam positions) hay chỉ cần box representation? | Warehouse Mgr | 3D complexity |
| OQ-004 | Path visualization: Phase 1 dùng straight line hay cần A* pathfinding ngay từ đầu? | Dev Team | Algorithm complexity |
| OQ-005 | Khi location chưa có tọa độ (unplaced), 2D view có hiển thị list sidebar không hay ẩn hoàn toàn? | Product Owner | UX decision |
| OQ-006 | Multi-floor support: một số kho có mezzanine/2 tầng. coord_z có đủ để model không hay cần thêm floor entity? | Warehouse Mgr | Data model impact |
| OQ-007 | Phạm vi Phase 1: chỉ Layout Builder + 2D, hay bao gồm cả 3D? | PM / Stakeholder | Sprint planning |

---

## 8. Phased Delivery Plan

### Phase 1 — Layout Builder + 2D View (MVP)

**Scope:**
- DB: ALTER TABLE thêm layout columns
- Backend: API endpoints cho layout CRUD
- Frontend: Layout Builder (Konva.js), 2D View với heat map + filters

**Stories**: US-001 đến US-007

**Effort estimate** (rough): 4–6 weeks (BE: 1–2w, FE: 3–4w)

### Phase 2 — 3D Visualization

**Scope:**
- Frontend: React Three Fiber rack rendering
- Location hierarchy (aisle/rack/shelf/bin)
- Path highlight

**Stories**: US-008, US-009

**Effort estimate** (rough): 4–6 weeks

### Phase 3 — Path Optimization (Future)

**Scope:**
- A* / Dijkstra pathfinding trên warehouse graph
- Batch pick route optimization
- Integration với work order system
