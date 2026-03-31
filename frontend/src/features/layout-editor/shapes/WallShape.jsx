import { Rect, Line, Text, Arrow, Group, Circle } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'

const WALL_THICKNESS = 4
const DOCK_WIDTH_M = 5 // each dock door is ~5m wide
const DOCK_SPACING_M = 20 // one dock every ~20m

export default function WallShape() {
  const { state } = useLayoutEditor()
  const wh = state.warehouse
  if (!wh) return null

  const ppm = state.pixelsPerMeter
  const wPx = wh.lengthM * ppm
  const hPx = wh.widthM * ppm

  // Column grid
  const columnSpacing = Math.max(8, Math.min(15, wh.lengthM / 5))
  const columns = []
  for (let cx = columnSpacing; cx < wh.lengthM; cx += columnSpacing) {
    for (let cy = columnSpacing; cy < wh.widthM; cy += columnSpacing) {
      columns.push(
        <Group key={`col-${cx}-${cy}`}>
          <Rect
            x={cx * ppm - 3}
            y={cy * ppm - 3}
            width={6}
            height={6}
            fill="#64748b"
            cornerRadius={1}
          />
        </Group>,
      )
    }
  }

  // Calculate dock door positions along the bottom (front) wall
  const numDocks = Math.max(2, Math.round(wh.lengthM / DOCK_SPACING_M))
  const dockWidthPx = DOCK_WIDTH_M * ppm
  const docks = []
  for (let i = 0; i < numDocks; i++) {
    const centerX = (wh.lengthM / (numDocks + 1)) * (i + 1)
    docks.push({
      x: centerX * ppm - dockWidthPx / 2,
      centerX: centerX * ppm,
      label: `Dock ${i + 1}`,
    })
  }

  // Arrow size
  const arrowLen = Math.min(20, hPx * 0.06)

  // Build bottom wall segments (with dock gaps)
  const bottomWallSegments = []
  let lastEnd = -WALL_THICKNESS / 2
  for (const dock of docks) {
    // Segment before this dock
    if (dock.x > lastEnd) {
      bottomWallSegments.push(
        <Rect
          key={`bw-${dock.label}-before`}
          x={lastEnd}
          y={hPx - WALL_THICKNESS / 2}
          width={dock.x - lastEnd}
          height={WALL_THICKNESS}
          fill="#334155"
        />,
      )
    }
    lastEnd = dock.x + dockWidthPx
  }
  // Final segment after last dock
  if (lastEnd < wPx + WALL_THICKNESS / 2) {
    bottomWallSegments.push(
      <Rect
        key="bw-end"
        x={lastEnd}
        y={hPx - WALL_THICKNESS / 2}
        width={wPx + WALL_THICKNESS / 2 - lastEnd}
        height={WALL_THICKNESS}
        fill="#334155"
      />,
    )
  }

  // Scale bar
  const scaleBarM = wh.lengthM >= 100 ? 20 : wh.lengthM >= 50 ? 10 : 5
  const scaleBarPx = scaleBarM * ppm
  const scaleBarX = wPx / 2 - scaleBarPx / 2
  const scaleBarY = hPx + 55

  // Warehouse full label
  const whLabel = wh.name ? `${wh.code} — ${wh.name}` : (wh.code || 'Warehouse')
  const labelWidth = Math.min(wPx, Math.max(180, whLabel.length * 8 + 30))

  return (
    <>
      {/* Floor background - white */}
      <Rect x={0} y={0} width={wPx} height={hPx} fill="#ffffff" />

      {/* Floor subtle pattern - light grid lines inside */}
      {Array.from({ length: Math.floor(wh.lengthM / 5) }, (_, i) => (
        <Line
          key={`fg-v-${i}`}
          points={[(i + 1) * 5 * ppm, 0, (i + 1) * 5 * ppm, hPx]}
          stroke="#f1f5f9"
          strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: Math.floor(wh.widthM / 5) }, (_, i) => (
        <Line
          key={`fg-h-${i}`}
          points={[0, (i + 1) * 5 * ppm, wPx, (i + 1) * 5 * ppm]}
          stroke="#f1f5f9"
          strokeWidth={0.5}
        />
      ))}

      {/* Thick walls - Top, Left, Right (solid) */}
      {/* Top wall */}
      <Rect x={-WALL_THICKNESS / 2} y={-WALL_THICKNESS / 2} width={wPx + WALL_THICKNESS} height={WALL_THICKNESS} fill="#334155" />
      {/* Left wall */}
      <Rect x={-WALL_THICKNESS / 2} y={-WALL_THICKNESS / 2} width={WALL_THICKNESS} height={hPx + WALL_THICKNESS} fill="#334155" />
      {/* Right wall */}
      <Rect x={wPx - WALL_THICKNESS / 2} y={-WALL_THICKNESS / 2} width={WALL_THICKNESS} height={hPx + WALL_THICKNESS} fill="#334155" />

      {/* Bottom wall with dock door gaps */}
      {bottomWallSegments}

      {/* Dock door markers */}
      {docks.map((dock) => (
        <Group key={dock.label}>
          {/* Dock opening highlight - green bar */}
          <Rect
            x={dock.x}
            y={hPx - 1.5}
            width={dockWidthPx}
            height={3}
            fill="#22c55e"
          />
          {/* Inward arrow */}
          <Arrow
            points={[
              dock.centerX, hPx + arrowLen + 6,
              dock.centerX, hPx + 2,
            ]}
            fill="#22c55e"
            stroke="#22c55e"
            strokeWidth={1.5}
            pointerLength={5}
            pointerWidth={5}
          />
          {/* Dock label badge */}
          <Rect
            x={dock.centerX - 22}
            y={hPx + arrowLen + 8}
            width={44}
            height={14}
            fill="#dcfce7"
            stroke="#22c55e"
            strokeWidth={0.5}
            cornerRadius={2}
          />
          <Text
            text={dock.label}
            x={dock.centerX - 22}
            y={hPx + arrowLen + 10}
            width={44}
            align="center"
            fontSize={8}
            fill="#166534"
            fontStyle="bold"
          />
        </Group>
      ))}

      {/* Dimension lines & labels - top */}
      <Line points={[0, -14, wPx, -14]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[0, -20, 0, -8]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[wPx, -20, wPx, -8]} stroke="#94a3b8" strokeWidth={1} />
      <Rect
        x={wPx / 2 - 35}
        y={-26}
        width={70}
        height={14}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth={0.5}
        cornerRadius={2}
      />
      <Text
        text={`${wh.lengthM.toFixed(1)} m`}
        x={wPx / 2 - 35}
        y={-24}
        width={70}
        align="center"
        fontSize={10}
        fill="#334155"
        fontStyle="bold"
      />

      {/* Dimension lines & labels - left */}
      <Line points={[-14, 0, -14, hPx]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[-20, 0, -8, 0]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[-20, hPx, -8, hPx]} stroke="#94a3b8" strokeWidth={1} />
      <Text
        text={`${wh.widthM.toFixed(1)} m`}
        x={-50}
        y={hPx / 2 - 5}
        fontSize={10}
        fill="#334155"
        fontStyle="bold"
        rotation={-90}
      />

      {/* Compass indicator - top right */}
      <Group x={wPx + 25} y={30}>
        <Circle radius={16} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
        <Arrow
          points={[0, 8, 0, -10]}
          fill="#ef4444"
          stroke="#ef4444"
          strokeWidth={1.5}
          pointerLength={4}
          pointerWidth={4}
        />
        <Text text="N" x={-4} y={-26} fontSize={10} fill="#ef4444" fontStyle="bold" />
        <Text text="S" x={-3} y={12} fontSize={8} fill="#94a3b8" />
        <Text text="E" x={12} y={-5} fontSize={8} fill="#94a3b8" />
        <Text text="W" x={-22} y={-5} fontSize={8} fill="#94a3b8" />
      </Group>

      {/* Warehouse name label - top center (full name) */}
      <Group x={wPx / 2} y={-50}>
        <Rect
          x={-labelWidth / 2}
          y={-9}
          width={labelWidth}
          height={20}
          fill="#1e40af"
          cornerRadius={4}
        />
        <Text
          text={whLabel}
          x={-labelWidth / 2}
          y={-6}
          width={labelWidth}
          align="center"
          fontSize={11}
          fill="#ffffff"
          fontStyle="bold"
          ellipsis
        />
      </Group>

      {/* Scale Bar - bottom center outside wall */}
      <Group x={scaleBarX} y={scaleBarY}>
        {/* Main bar */}
        <Line points={[0, 0, scaleBarPx, 0]} stroke="#475569" strokeWidth={2} />
        {/* End ticks */}
        <Line points={[0, -4, 0, 4]} stroke="#475569" strokeWidth={1.5} />
        <Line points={[scaleBarPx, -4, scaleBarPx, 4]} stroke="#475569" strokeWidth={1.5} />
        {/* Middle tick */}
        <Line points={[scaleBarPx / 2, -3, scaleBarPx / 2, 3]} stroke="#475569" strokeWidth={1} />
        {/* Labels */}
        <Text text="0" x={-4} y={6} fontSize={8} fill="#64748b" />
        <Text text={`${scaleBarM / 2}`} x={scaleBarPx / 2 - 4} y={6} fontSize={8} fill="#64748b" />
        <Text text={`${scaleBarM} m`} x={scaleBarPx - 8} y={6} fontSize={8} fill="#64748b" />
      </Group>

      {/* Columns */}
      {columns}
    </>
  )
}
