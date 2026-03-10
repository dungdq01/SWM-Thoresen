# Quy tắc thiết kế 2D/3D Visualization cho Warehouse & Industrial Assets

> Tài liệu này tổng hợp các nguyên tắc, best practices và technical guidelines để xây dựng hệ thống visualization 2D floor plan và 3D model cho kho bãi, nhà xưởng công nghiệp. Áp dụng được cho nhiều dự án khác nhau.

---

## 1. Nguyên tắc chung

### 1.1 Mục tiêu visualization
- **Accuracy**: Phản ánh đúng kích thước, tỷ lệ, cấu trúc thực tế
- **Clarity**: Dễ hiểu, dễ đọc, thông tin rõ ràng
- **Professional**: Trông chuyên nghiệp, đáng tin cậy
- **Performance**: Load nhanh, tương tác mượt, không lag
- **Responsive**: Hoạt động tốt trên nhiều kích thước màn hình

### 1.2 Khi nào dùng 2D vs 3D
- **2D Floor Plan**: 
  - Xem layout tổng thể, vị trí dock, cột, sprinkler
  - Đo đạc kích thước, tính diện tích
  - In ấn, export technical drawing
  - Thiết bị yếu, băng thông thấp
  
- **3D Model**:
  - Hiểu không gian, chiều cao, cấu trúc mái
  - Presentation, marketing, showcase
  - Đánh giá khả năng chứa hàng, logistics
  - Thiết bị mạnh, trải nghiệm immersive

### 1.3 Toggle 2D/3D
- Luôn cung cấp cả 2 view trong cùng 1 page
- Toggle button rõ ràng, dễ nhấn
- Giữ nguyên props/data khi chuyển đổi
- Không reload page khi toggle

---

## 2. Quy tắc 3D Visualization

### 2.1 Technology Stack
```typescript
// Core libraries
- React Three Fiber (@react-three/fiber)
- Drei (@react-three/drei) - helpers như OrbitControls, Text, ContactShadows
- Three.js (three) - low-level 3D engine

// Cấu trúc component
<Canvas> // R3F canvas wrapper
  <Scene /> // Scene setup: lights, fog, camera
  <WarehouseModel /> // Main 3D model
  <OrbitControls /> // Camera controls
</Canvas>
```

### 2.2 Scene Setup

#### Camera
```typescript
// Orthographic camera cho industrial buildings
<Canvas
  camera={{
    position: [length * 0.8, height * 1.5, width * 1.2],
    fov: 50,
    near: 0.1,
    far: 2000
  }}
  shadows
>
```

**Nguyên tắc camera positioning:**
- X: ~0.8 × chiều dài (nhìn từ góc)
- Y: ~1.5 × chiều cao (nhìn từ trên xuống)
- Z: ~1.2 × chiều rộng (tạo góc 3/4)
- Điều chỉnh dựa trên tỷ lệ L:W:H thực tế

#### Lighting
```typescript
// 3-point lighting setup
<ambientLight intensity={0.4} /> // Ánh sáng môi trường
<directionalLight 
  position={[20, 30, 15]} 
  intensity={0.8} 
  castShadow 
  shadow-mapSize={[2048, 2048]}
/>
<directionalLight position={[-15, 25, -10]} intensity={0.4} /> // Fill light
<hemisphereLight args={['#87CEEB', '#8B7355', 0.3]} /> // Sky + ground
```

**Nguyên tắc lighting:**
- Ambient: 0.3-0.5 (đủ sáng nhưng không flat)
- Key light: 0.6-1.0 với shadow
- Fill light: 0.3-0.5 không shadow
- Hemisphere: 0.2-0.4 cho realism

#### Fog & Background
```typescript
// Dark professional theme
const scene = useThree((state) => state.scene)
scene.background = new THREE.Color(BG_COLOR)
scene.fog = new THREE.Fog(FOG_COLOR, 50, 200)

// Gradient background (optional)
<mesh position={[0, 0, -100]}>
  <planeGeometry args={[500, 500]} />
  <meshBasicMaterial>
    <GradientTexture 
      stops={[0, 1]} 
      colors={[BG_TOP, BG_BOTTOM]} 
    />
  </meshBasicMaterial>
</mesh>
```

### 2.3 Geometry Construction

#### Modular Component Structure
```typescript
// Tách thành các sub-component độc lập
<group>
  <Floor length={L} width={W} />
  <Walls length={L} width={W} height={H} />
  <Columns positions={cols} height={H} />
  <DockBays docks={dockData} height={H} />
  <RoofStructure length={L} width={W} height={H} slope={S} />
  <WarehouseInterior length={L} width={W} height={H} />
</group>
```

**Lợi ích:**
- Dễ maintain, debug
- Có thể toggle on/off từng phần
- Reusable cho nhiều loại building

#### Material Best Practices
```typescript
// Sử dụng PBR materials
<meshStandardMaterial
  color={COLOR}
  roughness={0.5-0.9} // Bê tông, kim loại công nghiệp: cao
  metalness={0.0-0.5} // Thép: 0.4-0.6, bê tông: 0.0-0.1
  side={THREE.DoubleSide} // Nếu cần render cả 2 mặt
/>

// Tránh:
- meshBasicMaterial (không có lighting)
- Quá nhiều transparent materials (giảm performance)
- Metalness quá cao cho vật liệu không kim loại
```

### 2.4 Pitched Roof Geometry (Quan trọng!)

**Vấn đề thường gặp:** Mái bị "nổi" hoặc không dốc đúng

**Giải pháp: Pivot-at-eave approach**

```typescript
function RoofStructure({ length, width, height, slopePercent }) {
  // 1. Tính toán cơ bản
  const slope = Math.max((slopePercent || 15) / 100, 0.12)
  const halfWidth = width / 2
  const roofRise = halfWidth * slope // Độ cao từ tường lên ridge
  const ridgeHeight = height + roofRise
  const slopeLength = Math.sqrt(halfWidth * halfWidth + roofRise * roofRise)
  const slopeAngle = Math.atan2(roofRise, halfWidth)

  return (
    <group>
      {/* LEFT slope - pivot tại cạnh tường trái */}
      <group 
        position={[x, height, -halfWidth]} // Đặt tại eave (đỉnh tường)
        rotation={[-slopeAngle, 0, 0]}     // Rotate lên ridge
      >
        <mesh position={[0, roofT/2, slopeLength/2]}>
          <boxGeometry args={[panelWidth, roofThickness, slopeLength]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      </group>

      {/* RIGHT slope - pivot tại cạnh tường phải */}
      <group 
        position={[x, height, halfWidth]}  // Đặt tại eave
        rotation={[slopeAngle, 0, 0]}      // Rotate lên ridge (ngược chiều)
      >
        <mesh position={[0, roofT/2, -slopeLength/2]}>
          <boxGeometry args={[panelWidth, roofThickness, slopeLength]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      </group>
    </group>
  )
}
```

**Nguyên tắc quan trọng:**
1. **Pivot point = eave position** (đỉnh tường, không phải tâm mái)
2. **Rotation trước, position sau** (dùng group để tách riêng)
3. **Mesh offset** bên trong group để căn chỉnh đúng vị trí
4. **Slope angle** tính từ horizontal, không phải từ vertical
5. **Minimum slope** ≥ 12% cho warehouse thực tế

### 2.5 Detailed Elements

#### Corrugated Roof Panels
```typescript
// Tạo hiệu ứng tôn gợn sóng bằng alternating colors
{Array.from({ length: panelCount }, (_, i) => (
  <mesh key={i}>
    <boxGeometry args={[panelWidth, 0.12, slopeLength]} />
    <meshStandardMaterial
      color={i % 2 === 0 ? COLOR_A : COLOR_B}
      roughness={0.5}
      metalness={0.35}
    />
  </mesh>
))}
```

#### Dock Bays với chi tiết
```typescript
// Roller shutter lines
{Array.from({ length: 8 }, (_, i) => (
  <mesh key={i} position={[0, height * (i/8), dockDepth/2]}>
    <boxGeometry args={[dockWidth, 0.03, 0.02]} />
    <meshStandardMaterial color={SHUTTER_COLOR} />
  </mesh>
))}

// Rubber bumpers
<mesh position={[-dockWidth/2 + 0.3, height/2, dockDepth + 0.1]}>
  <boxGeometry args={[0.2, 0.4, 0.15]} />
  <meshStandardMaterial color={BUMPER_COLOR} />
</mesh>

// Warning stripes
<mesh position={[-dockWidth/2 - 0.05, height/2, dockDepth/2]}>
  <boxGeometry args={[0.08, height, dockDepth]} />
  <meshStandardMaterial color={WARNING_YELLOW} />
</mesh>
```

#### Steel Trusses
```typescript
// Bottom chord (dầm ngang dưới)
<mesh position={[x, height + 0.05, 0]}>
  <boxGeometry args={[0.06, 0.1, width]} />
  <meshStandardMaterial color={STEEL_COLOR} metalness={0.6} />
</mesh>

// Rafters (xà dốc) - dùng pivot-at-eave
<group position={[x, height, -halfWidth]} rotation={[-slopeAngle, 0, 0]}>
  <mesh position={[0, 0, slopeLength/2]}>
    <boxGeometry args={[0.06, 0.05, slopeLength]} />
  </mesh>
</group>

// Web members (thanh chống)
{[0.25, 0.5, 0.75].map(f => (
  <mesh position={[x, height + roofRise * f, -halfWidth * (1-f)]}>
    <boxGeometry args={[0.04, roofRise * 0.18, 0.04]} />
  </mesh>
))}
```

### 2.6 Performance Optimization

```typescript
// 1. Sử dụng instancing cho objects lặp lại
import { Instances, Instance } from '@react-three/drei'

<Instances>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="blue" />
  {positions.map((pos, i) => (
    <Instance key={i} position={pos} />
  ))}
</Instances>

// 2. useMemo cho geometry phức tạp
const complexGeometry = useMemo(() => {
  // Heavy computation
  return computeGeometry(props)
}, [props.length, props.width])

// 3. LOD (Level of Detail) cho scene lớn
<Lod distances={[0, 50, 100]}>
  <HighDetailModel />
  <MediumDetailModel />
  <LowDetailModel />
</Lod>

// 4. Giới hạn shadow casting
- Chỉ bật castShadow cho objects chính (walls, roof)
- Không bật cho objects nhỏ (bolts, small details)
- Shadow map size: 1024-2048 (không quá 4096)
```

### 2.7 Controls & Interaction

```typescript
// OrbitControls configuration
<OrbitControls
  enableDamping
  dampingFactor={0.05}
  minDistance={10}
  maxDistance={200}
  maxPolarAngle={Math.PI / 2.1} // Không cho xoay quá thấp
  target={[0, height/2, 0]} // Focus vào giữa building
/>

// Info panel overlay
<div className="absolute top-4 left-4 bg-white/90 p-4 rounded-lg">
  <h3>Thông số kỹ thuật</h3>
  <p>Diện tích: {area} m²</p>
  <p>Chiều cao: {height} m</p>
  <p>Số dock: {dockCount}</p>
</div>

// Loading state
{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center">
    <Loader2 className="animate-spin" />
  </div>
)}
```

### 2.8 Color Palette cho Industrial Buildings

```typescript
const INDUSTRIAL_COLORS = {
  // Surfaces
  floor: '#94A3B8',           // Concrete floor - slate-400
  ground: '#64748B',          // Ground - slate-500
  wall: '#D6D3D1',            // Wall exterior - stone-300
  wallInner: '#B8C4D0',       // Wall interior - lighter
  baseBand: '#78716C',        // Concrete base - stone-500
  
  // Structure
  column: '#1E3A5F',          // Steel column - navy
  truss: '#1E3A5F',           // Steel truss - navy
  trussRafter: '#334155',     // Rafter - slate-700
  trussWeb: '#475569',        // Web members - slate-600
  
  // Roof
  roofA: '#5B7A94',           // Roof panel A - blue-gray
  roofB: '#52728C',           // Roof panel B - darker
  ridge: '#3D5A6E',           // Ridge cap - darkest
  gutter: '#4A6274',          // Gutter/fascia
  skylight: '#7DD3FC',        // Skylight - sky-300
  
  // Dock
  dock: '#F59E0B',            // Dock door - amber-500
  dockFrame: '#92400E',       // Frame - amber-900
  dockPanel: '#7C8A96',       // Shutter panel
  shutterLine: '#5C6B78',     // Shutter lines
  bumper: '#1F2937',          // Rubber bumper - gray-800
  leveler: '#6B7280',         // Dock leveler - gray-500
  warning: '#FBBF24',         // Warning stripe - amber-400
  
  // Interior
  racking: '#374151',         // Storage rack - gray-700
  pallet: '#D4A76A',          // Wooden pallet - tan
  cargo: '#6366F1',           // Cargo box - indigo-500
}
```

**Nguyên tắc chọn màu:**
- Sử dụng màu thực tế của vật liệu (bê tông, thép, tôn)
- Tránh màu quá sáng, quá bóng (không realistic)
- Alternating colors cho corrugated panels
- Contrast đủ để phân biệt các phần
- Consistent với brand color nếu có

---

## 3. Quy tắc 2D Floor Plan

### 3.1 Technology Stack
```typescript
// Pure SVG - không cần thư viện 3D
- React + TypeScript
- SVG elements (rect, circle, line, path, text)
- CSS cho styling và hover effects
```

### 3.2 Coordinate System & Scaling

```typescript
// Tính toán scale và viewport
const PADDING = 60 // Padding xung quanh
const lengthM = geometry.length // Chiều dài thực (m)
const widthM = geometry.width   // Chiều rộng thực (m)

// Tính scale để fit vào container
const availableW = containerWidth - 2 * PADDING
const availableH = containerHeight - 2 * PADDING
const scale = Math.min(availableW / lengthM, availableH / widthM)

// SVG viewBox
const svgW = lengthM * scale + 2 * PADDING
const svgH = widthM * scale + 2 * PADDING

<svg 
  viewBox={`0 0 ${svgW} ${svgH}`}
  className="w-full h-full"
>
  {/* Origin tại center */}
  <g transform={`translate(${svgW/2}, ${svgH/2})`}>
    {/* Vẽ từ center ra */}
  </g>
</svg>
```

**Nguyên tắc coordinate:**
- Origin ở center của building (dễ tính toán đối xứng)
- X: trái → phải (length)
- Y: trên → dưới (width)
- Scale đồng nhất cho cả X và Y (giữ tỷ lệ)

### 3.3 Drawing Order (Z-index)

```typescript
// Vẽ theo thứ tự từ dưới lên trên
<g>
  {/* 1. Background grid (optional) */}
  <GridPattern />
  
  {/* 2. Floor area */}
  <rect fill={FLOOR_COLOR} />
  
  {/* 3. Usable area (nếu có) */}
  <rect fill={USABLE_AREA_COLOR} opacity={0.1} />
  
  {/* 4. Sprinkler grid (nếu có) */}
  <SprinklerIndicators />
  
  {/* 5. Walls */}
  <WallRectangles />
  
  {/* 6. Columns */}
  <ColumnCircles />
  
  {/* 7. Dock bays */}
  <DockRectangles />
  
  {/* 8. Dimensions & labels */}
  <DimensionLines />
  <Labels />
  
  {/* 9. Legend & compass */}
  <Legend />
  <Compass />
</g>
```

### 3.4 Wall Representation

```typescript
// Tường có độ dày, vẽ bằng 4 rect
const wallThickness = 0.3 // meters
const wt = wallThickness * scale

// Top wall
<rect 
  x={-lengthM * scale / 2} 
  y={-widthM * scale / 2 - wt} 
  width={lengthM * scale} 
  height={wt}
  fill={WALL_COLOR}
  stroke={WALL_STROKE}
/>

// Concrete base band (optional)
<rect 
  x={-lengthM * scale / 2} 
  y={-widthM * scale / 2 - wt} 
  width={lengthM * scale} 
  height={wt * 0.4}
  fill={BASE_BAND_COLOR}
/>
```

### 3.5 Dock Bay Details

```typescript
// Dock bay với đầy đủ chi tiết
function DockBay({ x, y, width, height, index, type }) {
  return (
    <g>
      {/* Dock leveler plate (concrete ramp) */}
      <rect 
        x={x - 2} 
        y={y + height} 
        width={width + 4} 
        height={height * 0.4}
        fill={LEVELER_COLOR}
      />
      
      {/* Warning stripes */}
      <line 
        x1={x - 1} y1={y} 
        x2={x - 1} y2={y + height * 1.4}
        stroke={WARNING_COLOR}
        strokeWidth={2}
      />
      
      {/* Main dock door */}
      <rect 
        x={x} y={y} 
        width={width} height={height}
        fill={DOCK_COLOR}
        stroke={DOCK_STROKE}
        className="hover:fill-amber-600 cursor-pointer"
      />
      
      {/* Roller shutter lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1={x} y1={y + (i/8) * height}
          x2={x + width} y2={y + (i/8) * height}
          stroke={SHUTTER_LINE_COLOR}
          strokeWidth={0.5}
        />
      ))}
      
      {/* Rubber bumpers */}
      <rect x={x + width * 0.15} y={y + height * 0.3} width={3} height={4} fill={BUMPER_COLOR} />
      <rect x={x + width * 0.85 - 3} y={y + height * 0.3} width={3} height={4} fill={BUMPER_COLOR} />
      
      {/* Dock number label */}
      <text 
        x={x + width/2} 
        y={y + height/2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={LABEL_COLOR}
        fontSize={Math.max(8, height * 0.3)}
        fontWeight="bold"
      >
        D{index + 1}
      </text>
      
      {/* Direction arrow */}
      <path
        d={`M ${x + width/2} ${y + height * 0.7} l -2 3 l 2 -2 l 2 2 z`}
        fill={LABEL_COLOR}
      />
    </g>
  )
}
```

### 3.6 Sprinkler Grid

```typescript
// Sprinkler system indicators
{specs?.sprinkler === 'YES' && (() => {
  const spacing = 8 // meters
  const elements = []
  for (let sx = spacing; sx < lengthM; sx += spacing) {
    for (let sy = spacing; sy < widthM; sy += spacing) {
      const px = (sx - lengthM/2) * scale
      const py = (sy - widthM/2) * scale
      elements.push(
        <g key={`spk-${sx}-${sy}`} opacity={0.5}>
          <circle cx={px} cy={py} r={2.5} fill="none" stroke={SPRINKLER_COLOR} strokeWidth={0.8} />
          <line x1={px-2} y1={py} x2={px+2} y2={py} stroke={SPRINKLER_COLOR} strokeWidth={0.5} />
          <line x1={px} y1={py-2} x2={px} y2={py+2} stroke={SPRINKLER_COLOR} strokeWidth={0.5} />
        </g>
      )
    }
  }
  return <>{elements}</>
})()}
```

### 3.7 Interactive Tooltips

```typescript
// Tooltip state
const [tooltip, setTooltip] = useState<TooltipData | null>(null)

// Hover handlers
const handleDockHover = useCallback((e: React.MouseEvent, dock: Dock) => {
  const rect = e.currentTarget.getBoundingClientRect()
  setTooltip({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    lines: [
      `Dock ${dock.index + 1}`,
      `Loại: ${formatDockType(dock.type)}`,
      `Kích thước: ${dock.width}m × ${dock.height}m`
    ]
  })
}, [])

// Tooltip render
{tooltip && (
  <foreignObject x={tooltip.x + 10} y={tooltip.y + 10} width={200} height={100}>
    <div className="bg-white/95 p-2 rounded shadow-lg text-xs">
      {tooltip.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  </foreignObject>
)}
```

### 3.8 Dimension Lines

```typescript
// Dimension line với arrows và text
function DimensionLine({ x1, y1, x2, y2, label, offset = 20 }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx*dx + dy*dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  
  return (
    <g>
      {/* Main line */}
      <line 
        x1={x1} y1={y1} 
        x2={x2} y2={y2}
        stroke={DIM_COLOR}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      
      {/* Arrows */}
      <path d={`M ${x1} ${y1} l 5 -2 l 0 4 z`} fill={DIM_COLOR} />
      <path d={`M ${x2} ${y2} l -5 -2 l 0 4 z`} fill={DIM_COLOR} />
      
      {/* Label */}
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - offset}
        textAnchor="middle"
        fill={DIM_TEXT_COLOR}
        fontSize={10}
      >
        {label}
      </text>
    </g>
  )
}

// Usage
<DimensionLine 
  x1={-lengthM * scale / 2} 
  y1={-widthM * scale / 2 - 30}
  x2={lengthM * scale / 2}
  y2={-widthM * scale / 2 - 30}
  label={`${lengthM}m`}
/>
```

### 3.9 Legend & Compass

```typescript
// Legend
<g transform={`translate(${svgW - PADDING - 150}, ${PADDING})`}>
  <rect width={140} height={legendHeight} fill="white" opacity={0.9} rx={4} />
  <text x={10} y={20} fontSize={12} fontWeight="bold">Chú giải</text>
  
  {legendItems.map((item, i) => (
    <g key={i} transform={`translate(10, ${30 + i * 20})`}>
      <rect width={15} height={15} fill={item.color} stroke={item.stroke} />
      <text x={20} y={12} fontSize={10}>{item.label}</text>
    </g>
  ))}
</g>

// Compass (North indicator)
<g transform={`translate(${PADDING + 30}, ${PADDING + 30})`}>
  <circle r={25} fill={COMPASS_BG} opacity={0.8} />
  <path d="M 0 -20 L 5 0 L 0 -5 L -5 0 Z" fill={COMPASS_COLOR} />
  <text y={-25} textAnchor="middle" fontSize={10} fontWeight="bold">N</text>
</g>
```

### 3.10 Color Palette cho 2D Floor Plan

```typescript
const FLOOR_PLAN_COLORS = {
  // Backgrounds
  floor: '#F8F6F1',           // Floor - warm white
  floorStroke: '#94A3B8',     // Floor border - slate-400
  usableArea: 'rgba(59, 130, 246, 0.08)', // Usable area tint
  usableStroke: 'rgba(59, 130, 246, 0.3)',
  
  // Walls
  wallFill: '#D6D3D1',        // Wall fill - stone-300
  wallStroke: '#A8A29E',      // Wall stroke - stone-400
  baseBand: '#78716C',        // Base band - stone-500
  
  // Elements
  column: '#1E3A5F',          // Column - navy
  columnStroke: '#0F172A',    // Column stroke - slate-900
  
  // Dock
  dock: '#F59E0B',            // Dock - amber-500
  dockStroke: '#D97706',      // Dock stroke - amber-600
  dockPanel: '#94A3B8',       // Shutter panel - slate-400
  dockShutter: '#64748B',     // Shutter lines - slate-500
  dockBumper: '#1F2937',      // Bumper - gray-800
  dockLeveler: '#9CA3AF',     // Leveler - gray-400
  dockWarning: '#FBBF24',     // Warning - amber-400
  dockLabel: '#92400E',       // Label - amber-900
  
  // Utilities
  sprinkler: '#3B82F6',       // Sprinkler - blue-500
  
  // Annotations
  dimension: '#94A3B8',       // Dimension lines - slate-400
  dimensionText: '#64748B',   // Dimension text - slate-500
  grid: 'rgba(148, 163, 184, 0.12)', // Grid lines
  
  // UI
  compassBg: 'rgba(15, 23, 42, 0.06)',
  compassText: '#94A3B8',
}
```

---

## 4. Data Structure & Props

### 4.1 Type Definitions

```typescript
// Geometry data
interface Geometry {
  length: number        // Chiều dài (m)
  width: number         // Chiều rộng (m)
  height: number        // Chiều cao (m)
  usableArea?: number   // Diện tích sử dụng (m²)
  totalArea?: number    // Tổng diện tích (m²)
  columnsCount?: number
  columnSpacingM?: number | null
}

// Dock data
interface Docks {
  count: number
  type?: 'GRADE' | 'LEVELER' | 'HYDRAULIC' | 'CONTAINER' | 'UNKNOWN'
  positions?: Array<{
    side: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
    offsetM: number
    widthM?: number
    heightM?: number
  }>
}

// Roof data
interface Roof {
  type?: 'FLAT' | 'PITCHED' | 'CURVED' | 'SAWTOOTH' | 'UNKNOWN'
  material?: 'METAL_SHEET' | 'CONCRETE' | 'SANDWICH_PANEL' | 'UNKNOWN'
  slopePercent?: number | null
  skylightPercent?: number | null
}

// Specs data
interface Specs {
  fireSystem?: 'YES' | 'NO' | 'PARTIAL' | 'UNKNOWN'
  sprinkler?: 'YES' | 'NO' | 'PARTIAL' | 'UNKNOWN'
  hvac?: 'YES' | 'NO' | 'PARTIAL' | 'UNKNOWN'
  lighting?: 'NATURAL' | 'LED' | 'FLUORESCENT' | 'MIXED' | 'UNKNOWN'
}
```

### 4.2 Default Values & Validation

```typescript
// Default values khi data thiếu
const DEFAULT_GEOMETRY = {
  length: 60,
  width: 40,
  height: 8,
  columnsCount: 12,
  columnSpacingM: 6,
}

const DEFAULT_DOCKS = {
  count: 4,
  type: 'LEVELER' as const,
}

const DEFAULT_ROOF = {
  type: 'PITCHED' as const,
  material: 'METAL_SHEET' as const,
  slopePercent: 15,
  skylightPercent: 5,
}

// Validation
function validateGeometry(geo: Partial<Geometry>): Geometry {
  return {
    length: Math.max(geo.length || 60, 10),
    width: Math.max(geo.width || 40, 10),
    height: Math.max(geo.height || 8, 3),
    columnsCount: Math.max(geo.columnsCount || 0, 0),
    columnSpacingM: geo.columnSpacingM && geo.columnSpacingM > 0 
      ? geo.columnSpacingM 
      : null,
  }
}
```

---

## 5. Best Practices & Common Pitfalls

### 5.1 Performance

✅ **DO:**
- Sử dụng `useMemo` cho geometry calculations
- Batch render nhiều objects giống nhau bằng instancing
- Giới hạn shadow casting objects
- Lazy load 3D model nếu không cần ngay

❌ **DON'T:**
- Render quá nhiều objects nhỏ (>1000 meshes)
- Update geometry mỗi frame
- Sử dụng quá nhiều lights với shadow
- Transparent materials lồng nhau

### 5.2 Accuracy

✅ **DO:**
- Validate input data (min/max values)
- Sử dụng đơn vị nhất quán (meters)
- Tính toán tỷ lệ chính xác
- Test với nhiều kích thước khác nhau

❌ **DON'T:**
- Hardcode dimensions
- Assume fixed aspect ratio
- Ignore edge cases (very small/large buildings)
- Mix units (m, cm, feet)

### 5.3 User Experience

✅ **DO:**
- Loading state rõ ràng
- Error boundaries cho 3D canvas
- Fallback khi WebGL không support
- Responsive design cho mobile
- Controls instructions cho first-time users

❌ **DON'T:**
- Auto-rotate camera (gây choáng)
- Quá nhiều animations
- Zoom quá gần/xa mặc định
- Ẩn controls quan trọng

### 5.4 Code Organization

✅ **DO:**
- Tách component nhỏ, focused
- Shared constants file
- Type-safe props
- Reusable utility functions

❌ **DON'T:**
- Một component >500 lines
- Magic numbers trong code
- Duplicate logic giữa 2D và 3D
- Tight coupling với data source

---

## 6. Testing & Debugging

### 6.1 Visual Testing Checklist

```markdown
2D Floor Plan:
- [ ] Tỷ lệ đúng (đo bằng dimension lines)
- [ ] Walls có độ dày
- [ ] Columns đúng vị trí
- [ ] Docks có đầy đủ chi tiết
- [ ] Sprinklers spacing đều
- [ ] Legend đầy đủ
- [ ] Compass hướng Bắc
- [ ] Hover tooltips hoạt động
- [ ] Responsive trên mobile

3D Model:
- [ ] Mái dốc đúng góc, không "nổi"
- [ ] Walls chạm sàn và mái
- [ ] Columns đứng thẳng
- [ ] Docks có chi tiết (shutter, bumpers)
- [ ] Trusses khớp với mái
- [ ] Shadows render đúng
- [ ] Camera controls mượt
- [ ] Loading state hiển thị
- [ ] No console errors
```

### 6.2 Debug Tools

```typescript
// 3D Debug helpers
import { Stats, Grid, Axes } from '@react-three/drei'

<Canvas>
  {process.env.NODE_ENV === 'development' && (
    <>
      <Stats /> {/* FPS counter */}
      <Grid args={[100, 100]} /> {/* Ground grid */}
      <axesHelper args={[10]} /> {/* XYZ axes */}
    </>
  )}
</Canvas>

// Log geometry calculations
console.log('Roof calculations:', {
  slope,
  roofRise,
  slopeLength,
  slopeAngle: (slopeAngle * 180 / Math.PI).toFixed(2) + '°'
})

// Visual bounding boxes
<mesh>
  <boxGeometry args={[length, height, width]} />
  <meshBasicMaterial wireframe color="red" />
</mesh>
```

---

## 7. Export & Integration

### 7.1 Screenshot/Export

```typescript
// Canvas screenshot
import { useThree } from '@react-three/fiber'

function ScreenshotButton() {
  const { gl, scene, camera } = useThree()
  
  const takeScreenshot = () => {
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'warehouse-3d.png'
    link.href = dataURL
    link.click()
  }
  
  return <button onClick={takeScreenshot}>Chụp ảnh 3D</button>
}

// SVG export (2D)
function exportSVG() {
  const svgElement = document.querySelector('svg')
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'floor-plan.svg'
  link.href = url
  link.click()
}
```

### 7.2 Embed trong các page khác

```typescript
// Lazy load để tối ưu performance
const Warehouse3DViewer = lazy(() => import('./Warehouse3DViewer'))
const WarehouseFloorPlan2D = lazy(() => import('./WarehouseFloorPlan2D'))

// Usage
<Suspense fallback={<LoadingSpinner />}>
  {view3D ? (
    <Warehouse3DViewer {...props} />
  ) : (
    <WarehouseFloorPlan2D {...props} />
  )}
</Suspense>
```

---

## 8. Tài liệu tham khảo

### 8.1 Libraries
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [Drei](https://github.com/pmndrs/drei) - Useful helpers for R3F
- [Three.js](https://threejs.org/docs/) - Core 3D library
- [SVG MDN](https://developer.mozilla.org/en-US/docs/Web/SVG) - SVG reference

### 8.2 Learning Resources
- [Three.js Journey](https://threejs-journey.com/) - Comprehensive Three.js course
- [Discover Three.js](https://discoverthreejs.com/) - Free book
- [R3F Examples](https://docs.pmnd.rs/react-three-fiber/getting-started/examples) - Code examples

### 8.3 Tools
- [Blender](https://www.blender.org/) - 3D modeling (nếu cần import models)
- [gltf.report](https://gltf.report/) - Analyze GLTF files
- [SVG Path Editor](https://yqnn.github.io/svg-path-editor/) - Debug SVG paths

---

## Tổng kết

Tài liệu này tổng hợp kinh nghiệm thực tế từ việc xây dựng hệ thống visualization 2D/3D cho warehouse. Các nguyên tắc có thể áp dụng cho:

- **Industrial buildings**: Nhà xưởng, kho bãi, logistics centers
- **Commercial buildings**: Showrooms, retail spaces
- **Residential**: Floor plans cho căn hộ, nhà phố
- **Infrastructure**: Parking lots, storage facilities

**Key takeaways:**
1. Pivot-at-eave cho pitched roof geometry
2. Modular component structure
3. Consistent color palette
4. Performance optimization từ đầu
5. Validation và error handling
6. Responsive và accessible

Chúc bạn xây dựng visualization đẹp và chuyên nghiệp! 🏗️✨
