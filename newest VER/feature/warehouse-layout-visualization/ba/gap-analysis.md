# Gap Analysis — Warehouse Layout Visualization (2D/3D)

**Feature Slug**: `warehouse-layout-visualization`
**Date**: 2026-03-18
**Author**: BA Agent
**Analysis Type**: Gap Analysis

---

## Executive Summary

Hệ thống hiện tại quản lý kho theo mô hình **flat, weight-only**: warehouse → zone → location,
không có tọa độ vật lý, không có layout canvas, không có hierarchy rack/shelf/bin. Tính năng
Warehouse Layout Visualization 2D/3D yêu cầu bổ sung toàn bộ lớp spatial data và rendering engine
mới — đây là **greenfield feature** với zero overlap với data model hiện tại.

---

## AS-IS (Trạng thái hiện tại)

### Data Model

```
cat.warehouse  →  cat.zone  →  cat.location
  (code, name)    (code, name)   (code, name, type, capacity_mt, is_mixed)
```

| Thực thể | Có | Thiếu |
|----------|-----|-------|
| warehouse | id, code, name, type, max_capacity_mt, address | **tọa độ góc (x,y), kích thước (width, height, rotation), hình dạng nền kho** |
| zone | id, code, name, zone_type, warehouse_id | **tọa độ vùng trong kho (polygon hoặc rect), màu sắc hiển thị** |
| location | id, code, name, location_type, capacity_mt, zone_id | **tọa độ (x,y,z), kích thước (w,h,d), aisle/rack/shelf/bin, góc quay** |

### Operations Affected

- **Inventory Lookup**: Người dùng phải tra cứu bằng text search (location code). Không có visual context.
- **Putaway**: Work order gán `to_location_id` nhưng operator không thể thấy vị trí này ở đâu trong kho.
- **Picking**: Tương tự — operator biết location code nhưng không biết đường đi tối ưu.
- **Capacity Planning**: Chỉ xem được tổng capacity theo MT trên danh sách, không thấy visual heat map.

### Pain Points (Business Feedback)

| # | Pain Point | Severity | Frequency |
|---|-----------|----------|-----------|
| P1 | Operator mất thời gian tìm vị trí trong kho lớn (11 kho, ~81,500 m²) | High | Daily |
| P2 | Manager không thể đánh giá nhanh tình trạng tồn kho toàn kho bằng visual | High | Daily |
| P3 | Không thể tối ưu đường đi forklift khi xử lý nhiều putaway/pick cùng lúc | Medium | Daily |
| P4 | Thiết lập master data zone/location thiếu spatial context → dễ sai | Medium | Setup |
| P5 | Không thể simulate capacity planning theo visual trước khi nhận hàng lớn | Medium | Weekly |

---

## GAPS

| Gap ID | Mô tả Gap | Severity | Business Impact |
|--------|-----------|----------|----------------|
| G-001 | Không có tọa độ vật lý cho warehouse/zone/location | Critical | Không render được bất kỳ layout nào |
| G-002 | Không có layout canvas/floor-plan entity | Critical | Không lưu được layout do user thiết kế |
| G-003 | Không có hierarchy rack/shelf/bin cho 3D stacking | High | Không thể render 3D theo chiều cao |
| G-004 | Không có inventory snapshot theo vị trí cho heat map | High | Không thể hiển thị occupancy real-time |
| G-005 | Không có path/route entity cho visualize đường đi | Medium | Không render được forklift path optimization |
| G-006 | Không có snapshot/template layout cho reuse giữa các kho tương tự | Low | Nice-to-have |

---

## TO-BE (Trạng thái mục tiêu)

### Capability Target

```
┌─────────────────────────────────────────────────────────────┐
│  Warehouse Layout Builder (Admin / Setup)                   │
│  • Upload floor plan image làm background                   │
│  • Drag & drop Zone từ master data vào canvas               │
│  • Drag & drop Location từ master data vào zone             │
│  • Manual input hoặc auto-assign tọa độ khi drop            │
│  • Save layout → persist tọa độ vào DB                      │
├─────────────────────────────────────────────────────────────┤
│  2D Visualization (Operations View)                         │
│  • Top-down floor plan hiển thị zone + location             │
│  • Color heat map theo occupancy % (capacity_mt)            │
│  • Click location → popup xem inventory detail              │
│  • Filter theo owner, item, lot                             │
│  • Real-time overlay khi có inbound/outbound transaction    │
├─────────────────────────────────────────────────────────────┤
│  3D Visualization (Advanced View)                           │
│  • 3D rack rendering với chiều cao (shelf/bin levels)       │
│  • Orbit/pan/zoom camera                                    │
│  • Color code theo inventory status                         │
│  • Highlight path forklift (putaway/pick route)             │
└─────────────────────────────────────────────────────────────┘
```

### Data Model Extensions Needed

```sql
-- Spatial config cho warehouse
ALTER TABLE cat.warehouse ADD COLUMN layout_width_m  numeric(10,2);
ALTER TABLE cat.warehouse ADD COLUMN layout_height_m numeric(10,2);
ALTER TABLE cat.warehouse ADD COLUMN floor_plan_url  text;  -- S3/CDN URL

-- Tọa độ zone trong floor plan (rectangle hoặc polygon)
ALTER TABLE cat.zone ADD COLUMN layout_x      numeric(10,4);
ALTER TABLE cat.zone ADD COLUMN layout_y      numeric(10,4);
ALTER TABLE cat.zone ADD COLUMN layout_width  numeric(10,4);
ALTER TABLE cat.zone ADD COLUMN layout_height numeric(10,4);
ALTER TABLE cat.zone ADD COLUMN layout_color  character varying(20);  -- hex color

-- Tọa độ vật lý của location
ALTER TABLE cat.location ADD COLUMN coord_x      numeric(10,4);  -- meter from origin
ALTER TABLE cat.location ADD COLUMN coord_y      numeric(10,4);
ALTER TABLE cat.location ADD COLUMN coord_z      numeric(10,4) DEFAULT 0;  -- floor level
ALTER TABLE cat.location ADD COLUMN width_m      numeric(6,2);
ALTER TABLE cat.location ADD COLUMN depth_m      numeric(6,2);
ALTER TABLE cat.location ADD COLUMN height_m     numeric(6,2);
ALTER TABLE cat.location ADD COLUMN rotation_deg smallint DEFAULT 0;
ALTER TABLE cat.location ADD COLUMN aisle        character varying(20);
ALTER TABLE cat.location ADD COLUMN rack_no      character varying(20);
ALTER TABLE cat.location ADD COLUMN shelf_level  smallint;  -- 1=floor, 2,3,...
ALTER TABLE cat.location ADD COLUMN bin_col      smallint;
```

---

## Recommendation

### Approach: Phased Delivery

**Phase 1 — Layout Builder + 2D (MVP)**
- Thêm coord fields vào warehouse/zone/location (ALTER TABLE)
- Drag-and-drop layout builder (React canvas)
- 2D top-down view với heat map
- Delivery: ~4–6 weeks

**Phase 2 — 3D Visualization**
- Three.js / React Three Fiber renderer
- Rack hierarchy (aisle/rack/shelf/bin)
- Path visualization
- Delivery: ~4–6 weeks sau Phase 1

**Phase 3 — Path Optimization (Future)**
- Graph-based routing
- Batch pick route optimization
- Delivery: TBD

### Technology Recommendation

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| 2D Canvas | **Konva.js** (React Konva) | Mature, performant, drag-and-drop native, MIT |
| 3D Renderer | **React Three Fiber** (Three.js wrapper) | React-native 3D, large ecosystem, good for warehouse viz |
| State Management | Zustand store cho layout state | Lightweight, React 19 compatible |
| Coordinate System | Meter-based from warehouse origin (0,0) | Intuitive cho warehouse ops, easy scale/convert |
| Storage | Columns thêm vào existing tables (không tạo bảng mới) | Minimal migration risk |
