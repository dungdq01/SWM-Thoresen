# Business Rules — Warehouse Layout Visualization (2D/3D)

**Feature**: `warehouse-layout-visualization`
**Date**: 2026-03-18

| ID | Rule Name | Category | Description | Trigger | Exception |
|----|-----------|----------|-------------|---------|-----------|
| BR-001 | Coordinate Bounds | Validation | coord_x ∈ [0, layout_width_m]; coord_y ∈ [0, layout_height_m] | On save/drop | None |
| BR-002 | Zone Within Canvas | Constraint | Zone rect must fit within warehouse canvas | On save/resize | None — hard block |
| BR-003 | Location Within Zone | Constraint | Location coord should fall within parent zone rect | On save/drop | Soft warning only (allow cross-zone edge cases) |
| BR-004 | Occupancy Calculation | Calculation | occupancy_pct = SUM(invent_on_hand.qty_mt) / capacity_mt × 100 | On 2D view load | If capacity_mt IS NULL → show "N/A" |
| BR-005 | Unplaced = NULL coords | Derivation | If coord_x IS NULL OR coord_y IS NULL → location is "unplaced" | Always | — |
| BR-006 | Layout Optional | Constraint | Existing records without layout data remain fully functional | — | All existing ops unaffected |
| BR-007 | Shelf Level 1-based | Constraint | shelf_level starts at 1 (ground floor) | On input | — |
| BR-008 | Rotation Enum | Constraint | rotation_deg ∈ {0, 90, 180, 270} | On input | — |
| BR-009 | Layout Prerequisite | Sequencing | layout_width_m AND layout_height_m must both be set before zone/location placement | On first drag attempt | Show setup prompt |
| BR-010 | Coordinate Precision | Constraint | Stored to 4 decimal places (≈0.1mm precision) | On save | — |
| BR-011 | Zone Color Default | Derivation | Default zone color = #4A90D9 (blue) if not specified | On zone creation | User can override |
| BR-012 | Floor Plan Max Size | Validation | Floor plan image max 10MB, formats: JPG, PNG, SVG | On upload | — |
