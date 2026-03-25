# SWM TVL — Smart Warehouse Management System
## Thoresen Vinama Logistics

### 🏗️ Project Overview
Full-featured Smart Warehouse Management (SWM) web application for Thoresen Vinama Logistics, featuring an immersive **3D Warehouse Monitoring System v2.0** built with Three.js.

**Total warehouse area:** 81,500 m² | **Warehouses:** 11 (WH5.1 → WH5.9)

---

### ✅ Completed Features

#### 🌐 Core Application
- **Landing page** with animated particle background
- **Login system** (demo auth)
- **Dashboard** with real-time chart widgets (Chart.js)
- **40+ module pages** covering inbound, outbound, inventory, billing, reports, etc.
- **SPA routing** with sidebar navigation & breadcrumbs
- **Dark theme** with glassmorphism design
- **Responsive layout** (desktop, tablet, mobile)

#### 🏭 3D Warehouse Monitoring v2.0 (`/app/warehouse-monitoring`)

##### Scene & Environment
- **1400 × 1000 ground plane** with 56-division grid, dark sub-ground
- **Road network** — 5 horizontal + 7 vertical roads with dashed yellow center lines, solid edge lines
- **2 entrance/exit gates** with barrier arms, signal lights, glowing signs
- **2 weighbridge stations** with platforms, control booths, digital displays, safety stripes, status lights
- **Truck parking area** with parking lines
- **28+ landscape trees** with multi-layer canopy (trunk + 3 cone layers)
- **Exponential fog**, hemisphere + directional + ambient + fill lighting
- **4096×4096 shadow maps**, ACES Filmic tone mapping, PCF soft shadows

##### 11 Warehouses (Real-Scale Geometry)
- **4 separate walls** with 2 door openings per face (front & back), door lintels
- **Translucent windows** on side walls (per-warehouse count)
- **Gable/ridge roof** via ExtrudeGeometry with roof overhang & gutters
- **Upper transparent band** (colored per warehouse)
- **Interior steel I-beam columns** (3-across × depth-based rows) with cross beams & diagonal bracing
- **Industrial hanging lights** — fixture housing, reflector cone, glowing tubes, suspension wires
- **Zone visualization** — colored floor markings with border tape (4-sided), per-zone fill percentage
- **Type-specific inventory stacks** (height ∝ stock %):
  - **Bulk/Clinker:** irregular cone piles with scattered debris
  - **Container:** multi-level stacked containers with corrugation ridges & door handles
  - **Pallet:** wooden pallet bases with slats, stacked boxes, shrink wrap overlay
  - **Jumbo Bag:** cylindrical bags with top ties and 4 lifting loops (torus)
  - **VAS/Bagged:** neat multi-bag-per-layer stacks with alternating colors
- **Shelving racks** (for Container/Pallet/VAS warehouses) — orange uprights with horizontal beams at 3 heights
- **Steel door frames** with side posts, top beams, status lights (green/amber/red by fill%), concrete ramp/apron, safety bollards
- **Interior point lights** (2 per warehouse)
- **Edge wireframe glow** (animated pulse for ≥90% full warehouses)
- **External pole lights** (2 per warehouse, with point lights)

##### 🚛 Vehicle System (Collision-Aware)
- **5 detailed trucks** — cargo body with side panels, cab with windshield, 10 wheels (front 2, rear dual axle), headlights, tail lights, exhaust pipe, side mirrors
- **Road-following waypoint paths** — trucks travel ONLY on the road network, never through warehouses
- **Smooth rotation interpolation** (no instant turns)
- **3 detailed forklifts** — body, cab roof, 4 pillars, fork mast (dual), fork tines, backrest, 4 wheels, warning beacon, counterweight
- **Forklift paths** follow perimeter roads near assigned warehouses

##### 📷 Camera System
- **Overview** (45° angle, 480 radius)
- **Top-Down** (bird's eye)
- **Flythrough** (360° auto-orbit with altitude oscillation)
- **Free** (orbit + WASD movement + mouse pan + wheel zoom)
- **Focus** (click to fly-to warehouse)
- **Smooth camera transitions** (cubic ease-in-out, 1.8s)
- **Touch controls** (pinch zoom, single-finger orbit)
- **Keyboard shortcuts**: 1-4 camera, H heatmap, N night, F fullscreen, WASD movement, Escape close

##### 🔍 Search & Filter
- **Search bar** — type warehouse code/name to fly to it, non-matching warehouses dimmed
- **Filter by owner** (TVL, Partner A, Partner B)
- **Filter by item type** (Bulk, Bagged, Clinker, Container, Pallet, VAS, Jumbo)
- **Filter by usage level** (Low <50%, Medium 50-80%, High >80%)
- **Clear search** button & Escape key reset

##### 📊 HUD Panels
- **Left panel**: total area, warehouse count, total stock, truck/forklift count, road network info, usage bar, system status, live clock
- **Right panel**: camera mode radio buttons, display toggles (labels, vehicles, grid, fog, shadows)
- **Hover panel**: warehouse code, area, stock, type, fill %, usage bar, items list, temp/humidity, action buttons (Detail / Zoom)
- **Activity ticker**: scrolling live feed (7 entries: inbound, receiving, outbound, movement, alerts, weighing, billing)
- **Mini-map**: 200×140 canvas with road lines, warehouse blocks, truck dots, camera marker
- **FPS counter**: color-coded (green ≥50, amber ≥30, red <30)
- **Keyboard shortcuts hint bar**

##### 🗺️ Heatmap Mode
- Toggle via toolbar or [H] key
- 5-level color scale: 0-30% green → 31-60% blue → 61-80% amber → 81-95% orange → 96-100% red
- Updates edge wireframe + transparent bands

##### 🌙 Day/Night Cycle
- Toggle via toolbar or [N] key
- Night mode: dark background, moonlight (blue), minimal ambient, warehouse interior lights intensified

##### ✨ Visual Effects
- **800 ambient dust particles** (rising, horizontal drift)
- **Real-time soft shadows** (PCF, 4K shadow maps)
- **Pulse glow** on critical warehouses (≥90% fill)
- **Hover highlight** (edge glow, interior light boost)
- **Double-click** to open warehouse detail modal
- Effects toggle button

##### 📋 Warehouse Detail Modal
- Header with code, name, type, area
- **6-card stats grid**: area, stock + fill%, zones, type, owner, temp/humidity
- **Items inventory list** with quantities
- **Zone usage grid** (color-coded progress bars)
- **Recent transactions** (4 entries with type icon, code, quantity, time)
- Action buttons: View receipts, View inventory, Close

---

### 📁 File Structure
```
index.html          — Main HTML (SPA shell, landing, login)
css/style.css       — All styles (53K+, includes 3D HUD styles)
js/app.js           — SPA router, auth, navigation, dashboard setup
js/dashboard.js     — Dashboard charts (Chart.js)
js/modules.js       — 40+ module pages + getWarehouse3DHTML()
js/warehouse3d.js   — 3D scene logic (86K, Three.js r128)
README.md           — This file
```

### 🔗 Entry URIs
| Path | Description |
|------|-------------|
| `/` or `#landing` | Landing page |
| `#login` | Login screen |
| `#app/dashboard` | Dashboard overview |
| `#app/warehouse-monitoring` | **3D Warehouse Monitoring v2.0** |
| `#app/{module}` | Various module pages |

### 🛠 Technical Stack
- **Three.js r128** (CDN: `cdnjs.cloudflare.com`)
- **Chart.js** (CDN: jsDelivr)
- **Font Awesome 6.4** (icons)
- **Google Fonts** (Inter, JetBrains Mono)
- **Pure CSS** (no Tailwind) — glassmorphism design system
- **Vanilla JavaScript** — no framework dependencies

### ⚡ Performance
- Manual orbit controls (no OrbitControls import needed)
- Invisible hit-box meshes for raycasting (no full-building raycasting)
- Minimap rendered every 5 frames
- Particle animation only when effects enabled
- `requestAnimationFrame` with dt-clamping (50ms max)
- `devicePixelRatio` capped at 2
- Resize handler with debounced initialization

### 🔮 Future Enhancements (Not Yet Implemented)
- Post-processing bloom/glow (performance conditional)
- Stats.js FPS graph overlay
- LOD (Level of Detail) for distant warehouses
- Instanced geometry for stacks and trees
- Frustum culling optimization
- GSAP/Tween.js smooth animations
- Animated rolling doors
- Ship model at dock
- Time-series inventory chart in modal
- 2D floor plan layout in modal
- WebSocket live data integration
- Sound effects (truck engine, forklift beeps)
