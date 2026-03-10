import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FLOOR_PLAN_COLORS, FLOOR_PLAN_CONFIG } from './constants'

const C = FLOOR_PLAN_COLORS
const CFG = FLOOR_PLAN_CONFIG

// ==================== SUB-COMPONENTS ====================

function FloorArea({ lengthPx, widthPx }) {
  return (
    <rect
      x={-lengthPx / 2}
      y={-widthPx / 2}
      width={lengthPx}
      height={widthPx}
      fill={C.floor}
      stroke={C.floorStroke}
      strokeWidth={1}
    />
  )
}

function UsableArea({ lengthPx, widthPx, usableRatio }) {
  if (!usableRatio || usableRatio >= 1) return null
  const inset = (1 - Math.sqrt(usableRatio)) * 0.5
  const uL = lengthPx * (1 - 2 * inset)
  const uW = widthPx * (1 - 2 * inset)
  return (
    <rect
      x={-uL / 2}
      y={-uW / 2}
      width={uL}
      height={uW}
      fill={C.usableArea}
      stroke={C.usableStroke}
      strokeWidth={1}
      strokeDasharray="6,3"
      rx={2}
    />
  )
}

function Walls({ lengthPx, widthPx, scale }) {
  const wt = CFG.wallThickness * scale
  const halfL = lengthPx / 2
  const halfW = widthPx / 2

  const walls = [
    { x: -halfL, y: -halfW - wt, w: lengthPx, h: wt },
    { x: -halfL, y: halfW, w: lengthPx, h: wt },
    { x: -halfL - wt, y: -halfW - wt, w: wt, h: widthPx + 2 * wt },
    { x: halfL, y: -halfW - wt, w: wt, h: widthPx + 2 * wt },
  ]

  return (
    <g>
      {walls.map((wall, i) => (
        <rect
          key={`wall-${i}`}
          x={wall.x}
          y={wall.y}
          width={wall.w}
          height={wall.h}
          fill={C.wallFill}
          stroke={C.wallStroke}
          strokeWidth={0.5}
        />
      ))}
    </g>
  )
}

function Columns({ positions, scale }) {
  if (!positions || positions.length === 0) return null
  const r = CFG.columnRadius * scale

  return (
    <g>
      {positions.map((col, i) => (
        <circle
          key={`col-${i}`}
          cx={col.x * scale}
          cy={col.z * scale}
          r={r}
          fill={C.column}
          stroke={C.columnStroke}
          strokeWidth={0.5}
        />
      ))}
    </g>
  )
}

function DockBay({ x, y, width, height, index, onHover, onLeave }) {
  return (
    <g
      onMouseEnter={(e) => onHover?.(e, { index, width, height })}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      {/* Dock leveler plate */}
      <rect
        x={x - 2}
        y={y + height}
        width={width + 4}
        height={height * 0.4}
        fill={C.dockLeveler}
        rx={1}
      />
      {/* Warning stripes */}
      <line
        x1={x - 1} y1={y}
        x2={x - 1} y2={y + height * 1.4}
        stroke={C.dockWarning}
        strokeWidth={2}
      />
      <line
        x1={x + width + 1} y1={y}
        x2={x + width + 1} y2={y + height * 1.4}
        stroke={C.dockWarning}
        strokeWidth={2}
      />
      {/* Main dock door */}
      <rect
        x={x} y={y}
        width={width} height={height}
        fill={C.dock}
        stroke={C.dockStroke}
        strokeWidth={1}
        rx={1}
        className="hover:opacity-80 transition-opacity"
      />
      {/* Roller shutter lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`shutter-${i}`}
          x1={x + 1} y1={y + (i / 8) * height}
          x2={x + width - 1} y2={y + (i / 8) * height}
          stroke={C.dockShutter}
          strokeWidth={0.5}
          opacity={0.6}
        />
      ))}
      {/* Rubber bumpers */}
      <rect x={x + width * 0.15} y={y + height * 0.3} width={2.5} height={3.5} fill={C.dockBumper} rx={0.5} />
      <rect x={x + width * 0.85 - 2.5} y={y + height * 0.3} width={2.5} height={3.5} fill={C.dockBumper} rx={0.5} />
      {/* Dock number label */}
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={C.dockLabel}
        fontSize={Math.max(CFG.minFontSize, height * 0.3)}
        fontWeight="bold"
      >
        D{index + 1}
      </text>
    </g>
  )
}

function DockBays({ docks, geometry, scale, onHover, onLeave }) {
  if (!docks?.positions?.length) return null
  const halfL = (geometry.length * scale) / 2
  const halfW = (geometry.width * scale) / 2
  const dockW = CFG.dockWidth * scale
  const dockD = CFG.dockDepth * scale

  return (
    <g>
      {docks.positions.map((dock, i) => {
        const px = -halfL + dock.offsetM * scale
        const py = halfW - dockD
        return (
          <DockBay
            key={`dock-${i}`}
            x={px}
            y={py}
            width={dockW}
            height={dockD}
            index={dock.index}
            onHover={onHover}
            onLeave={onLeave}
          />
        )
      })}
    </g>
  )
}

function SprinklerGrid({ geometry, specs, scale }) {
  if (specs?.sprinkler !== 'YES') return null
  const spacing = specs.sprinklerSpacingM || 8
  const elements = []

  for (let sx = spacing; sx < geometry.length; sx += spacing) {
    for (let sy = spacing; sy < geometry.width; sy += spacing) {
      const px = (sx - geometry.length / 2) * scale
      const py = (sy - geometry.width / 2) * scale
      elements.push(
        <g key={`spk-${sx}-${sy}`} opacity={0.45}>
          <circle cx={px} cy={py} r={2.5} fill="none" stroke={C.sprinkler} strokeWidth={0.8} />
          <line x1={px - 1.8} y1={py} x2={px + 1.8} y2={py} stroke={C.sprinkler} strokeWidth={0.5} />
          <line x1={px} y1={py - 1.8} x2={px} y2={py + 1.8} stroke={C.sprinkler} strokeWidth={0.5} />
        </g>
      )
    }
  }

  return <>{elements}</>
}

function DimensionLine({ x1, y1, x2, y2, label, offset = 20 }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return (
    <g>
      <line
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke={C.dimension}
        strokeWidth={1}
        strokeDasharray="4,2"
      />
      {/* Start tick */}
      <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={C.dimension} strokeWidth={1} />
      {/* End tick */}
      <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={C.dimension} strokeWidth={1} />
      <text
        x={mx}
        y={my - offset}
        textAnchor="middle"
        fill={C.dimensionText}
        fontSize={10}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  )
}

function DimensionLines({ geometry, scale }) {
  const halfL = (geometry.length * scale) / 2
  const halfW = (geometry.width * scale) / 2
  const offset = 25

  return (
    <g>
      {/* Top dimension (length) */}
      <DimensionLine
        x1={-halfL} y1={-halfW - offset}
        x2={halfL} y2={-halfW - offset}
        label={`${geometry.length}m`}
        offset={6}
      />
      {/* Left dimension (width) */}
      <g transform={`translate(${-halfL - offset}, 0)`}>
        <line
          x1={0} y1={-halfW}
          x2={0} y2={halfW}
          stroke={C.dimension}
          strokeWidth={1}
          strokeDasharray="4,2"
        />
        <line x1={-4} y1={-halfW} x2={4} y2={-halfW} stroke={C.dimension} strokeWidth={1} />
        <line x1={-4} y1={halfW} x2={4} y2={halfW} stroke={C.dimension} strokeWidth={1} />
        <text
          x={-10}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={C.dimensionText}
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
          transform="rotate(-90, -10, 0)"
        >
          {geometry.width}m
        </text>
      </g>
    </g>
  )
}

function Legend({ items, x, y }) {
  const lineHeight = 20
  const boxH = 24 + items.length * lineHeight + 8

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={140}
        height={boxH}
        fill="white"
        opacity={0.92}
        rx={6}
        stroke="#E2E8F0"
        strokeWidth={0.5}
      />
      <text x={10} y={18} fontSize={11} fontWeight="600" fill="#334155" fontFamily="Inter, system-ui, sans-serif">
        Chú giải
      </text>
      {items.map((item, i) => (
        <g key={i} transform={`translate(10, ${28 + i * lineHeight})`}>
          {item.shape === 'circle' ? (
            <circle cx={7} cy={7} r={5} fill={item.color} stroke={item.stroke || 'none'} strokeWidth={0.5} />
          ) : (
            <rect width={14} height={14} fill={item.color} stroke={item.stroke || 'none'} strokeWidth={0.5} rx={2} />
          )}
          <text x={20} y={11} fontSize={10} fill="#64748B" fontFamily="Inter, system-ui, sans-serif">{item.label}</text>
        </g>
      ))}
    </g>
  )
}

function Compass({ x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={20} fill={C.compassBg} />
      <path d="M 0 -15 L 4 0 L 0 -4 L -4 0 Z" fill={C.compassText} />
      <path d="M 0 15 L 4 0 L 0 4 L -4 0 Z" fill="#CBD5E1" />
      <text y={-22} textAnchor="middle" fontSize={9} fontWeight="bold" fill={C.compassText} fontFamily="Inter, system-ui, sans-serif">
        N
      </text>
    </g>
  )
}

function Tooltip({ tooltip }) {
  if (!tooltip) return null
  return (
    <foreignObject x={tooltip.x + 12} y={tooltip.y + 12} width={180} height={80}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className="bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg text-xs border border-navy-100"
      >
        {tooltip.lines.map((line, i) => (
          <div key={i} className={i === 0 ? 'font-semibold text-navy-900 mb-1' : 'text-navy-600'}>
            {line}
          </div>
        ))}
      </div>
    </foreignObject>
  )
}

// ==================== MAIN COMPONENT ====================

export function WarehouseFloorPlan2D({
  geometry,
  docks,
  specs,
  columnPositions,
  warehouse,
  className = '',
}) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 })
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const { scale, svgW, svgH } = useMemo(() => {
    const availW = containerSize.width - 2 * CFG.padding
    const availH = containerSize.height - 2 * CFG.padding
    const s = Math.min(availW / geometry.length, availH / geometry.width)
    return {
      scale: s,
      svgW: geometry.length * s + 2 * CFG.padding,
      svgH: geometry.width * s + 2 * CFG.padding,
    }
  }, [containerSize, geometry])

  const lengthPx = geometry.length * scale
  const widthPx = geometry.width * scale
  const usableRatio = geometry.usableArea / geometry.totalArea

  const handleDockHover = useCallback((e, dock) => {
    const svgEl = e.currentTarget.closest('svg')
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const pt = svgEl.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse())

    setTooltip({
      x: svgPt.x,
      y: svgPt.y,
      lines: [
        `Dock ${dock.index + 1}`,
        `Loại: Dock leveler`,
        `Kích thước: ${CFG.dockWidth}m × ${CFG.dockDepth}m`,
      ],
    })
  }, [])

  const handleDockLeave = useCallback(() => setTooltip(null), [])

  const legendItems = useMemo(() => {
    const items = [
      { color: C.floor, stroke: C.floorStroke, label: 'Sàn kho' },
      { color: C.wallFill, stroke: C.wallStroke, label: 'Tường' },
      { color: C.column, shape: 'circle', label: 'Cột' },
    ]
    if (docks?.positions?.length) {
      items.push({ color: C.dock, stroke: C.dockStroke, label: 'Dock bay' })
    }
    if (specs?.sprinkler === 'YES') {
      items.push({ color: C.sprinkler, shape: 'circle', label: 'Sprinkler' })
    }
    if (usableRatio < 1) {
      items.push({ color: 'rgba(59, 130, 246, 0.15)', stroke: C.usableStroke, label: 'DT sử dụng' })
    }
    return items
  }, [docks, specs, usableRatio])

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[400px] ${className}`}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-full"
        style={{ maxHeight: '100%' }}
      >
        <g transform={`translate(${svgW / 2}, ${svgH / 2})`}>
          {/* 1. Floor */}
          <FloorArea lengthPx={lengthPx} widthPx={widthPx} />

          {/* 2. Usable area */}
          <UsableArea lengthPx={lengthPx} widthPx={widthPx} usableRatio={usableRatio} />

          {/* 3. Sprinkler grid */}
          <SprinklerGrid geometry={geometry} specs={specs} scale={scale} />

          {/* 4. Walls */}
          <Walls lengthPx={lengthPx} widthPx={widthPx} scale={scale} />

          {/* 5. Columns */}
          <Columns positions={columnPositions} scale={scale} />

          {/* 6. Dock bays */}
          <DockBays
            docks={docks}
            geometry={geometry}
            scale={scale}
            onHover={handleDockHover}
            onLeave={handleDockLeave}
          />

          {/* 7. Dimensions */}
          <DimensionLines geometry={geometry} scale={scale} />

          {/* 8. Tooltip */}
          <Tooltip tooltip={tooltip} />
        </g>

        {/* Legend (absolute position in SVG) */}
        <Legend items={legendItems} x={svgW - CFG.padding - 150} y={CFG.padding - 10} />

        {/* Compass */}
        <Compass x={CFG.padding + 20} y={CFG.padding + 20} />

        {/* Title */}
        <text
          x={svgW / 2}
          y={svgH - 12}
          textAnchor="middle"
          fontSize={11}
          fill="#94A3B8"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {warehouse?.warehouseName || 'Sơ đồ mặt bằng kho'} — {geometry.length}m × {geometry.width}m — DT: {geometry.totalArea}m²
        </text>
      </svg>
    </div>
  )
}
