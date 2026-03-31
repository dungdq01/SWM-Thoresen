import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

const PADDING = 60
const WALL_THICKNESS_RATIO = 0.004
const FONT = 'Inter, system-ui, sans-serif'

const COLORS_LIGHT = {
  floor: '#F8F6F1',
  floorStroke: '#94A3B8',
  wall: '#78716C',
  wallStroke: '#57534E',
  dimension: '#94A3B8',
  dimensionText: '#64748B',
  compassBg: 'rgba(15, 23, 42, 0.06)',
  compassText: '#94A3B8',
  zoneText: '#1e293b',
  zoneSubText: '#475569',
  rackText: '#9a3412',
  legendBg: 'white',
  legendBorder: '#E2E8F0',
  legendTitle: '#334155',
  legendLabel: '#64748B',
  emptyText: '#94A3B8',
  titleText: '#94A3B8',
}

const COLORS_DARK = {
  floor: '#1e293b',
  floorStroke: '#475569',
  wall: '#94a3b8',
  wallStroke: '#cbd5e1',
  dimension: '#64748b',
  dimensionText: '#94a3b8',
  compassBg: 'rgba(148, 163, 184, 0.1)',
  compassText: '#64748b',
  zoneText: '#e2e8f0',
  zoneSubText: '#94a3b8',
  rackText: '#fdba74',
  legendBg: '#1e293b',
  legendBorder: '#334155',
  legendTitle: '#e2e8f0',
  legendLabel: '#94a3b8',
  emptyText: '#64748b',
  titleText: '#64748b',
}

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

const ZONE_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

// ==================== SUB-COMPONENTS ====================

function FloorArea({ lengthPx, widthPx, colors }) {
  return (
    <rect
      x={-lengthPx / 2}
      y={-widthPx / 2}
      width={lengthPx}
      height={widthPx}
      fill={colors.floor}
      stroke={colors.floorStroke}
      strokeWidth={1}
    />
  )
}

function Walls({ lengthPx, widthPx, colors }) {
  const wt = Math.max(1.5, Math.min(lengthPx, widthPx) * WALL_THICKNESS_RATIO)
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
          fill={colors.wall}
          stroke={colors.wallStroke}
          strokeWidth={0.5}
        />
      ))}
    </g>
  )
}

function isPlacedOnCanvas(item) {
  return item.xCoord != null && item.yCoord != null
}

function ZoneOverlay({ zones, scale, halfL, halfW, onHover, onLeave, colors }) {
  if (!zones?.length) return null
  return (
    <g>
      {zones.filter(isPlacedOnCanvas).map((z, idx) => {
        const x = -halfL + (Number(z.xCoord) || 0) * scale
        const y = -halfW + (Number(z.yCoord) || 0) * scale
        const w = (Number(z.zoneWidthM) || 10) * scale
        const h = (Number(z.zoneDepthM) || 8) * scale
        const color = z.displayColor || ZONE_PALETTE[idx % ZONE_PALETTE.length]
        const fontSize = Math.max(8, Math.min(12, w / 6))
        return (
          <g
            key={z.id}
            className="cursor-pointer"
            onMouseEnter={(e) => onHover?.(e, z)}
            onMouseLeave={onLeave}
          >
            <rect
              x={x} y={y} width={w} height={h}
              fill={color} opacity={0.15}
              stroke={color} strokeWidth={1.5}
              rx={3}
            />
            <text
              x={x + w / 2} y={y + h / 2 - fontSize * 0.3}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize} fontWeight="600" fill={colors.zoneText}
              fontFamily={FONT}
            >
              {z.zoneCode}
            </text>
            {h > fontSize * 3 && (
              <text
                x={x + w / 2} y={y + h / 2 + fontSize * 0.8}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize * 0.75} fill={colors.zoneSubText}
                fontFamily={FONT}
              >
                {z.zoneName}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

function RackOverlay({ racks, scale, halfL, halfW, colors }) {
  if (!racks?.length) return null
  return (
    <g>
      {racks.filter(isPlacedOnCanvas).map((r) => {
        const x = -halfL + (Number(r.xCoord) || 0) * scale
        const y = -halfW + (Number(r.yCoord) || 0) * scale
        const w = (Number(r.rackWidthM) || 2) * scale
        const h = (Number(r.rackDepthM) || 8) * scale
        const color = r.displayColor || '#f97316'
        return (
          <g key={r.id}>
            <rect
              x={x} y={y} width={w} height={h}
              fill={color} opacity={0.4}
              stroke={color} strokeWidth={0.8}
              rx={1}
            />
            {w > 18 && h > 10 && (
              <text
                x={x + w / 2} y={y + h / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fill={colors.rackText}
                fontFamily={FONT}
              >
                {r.rackCode}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

function LocationOverlay({ locations, scale, halfL, halfW }) {
  if (!locations?.length) return null
  return (
    <g>
      {locations.filter(isPlacedOnCanvas).map((loc) => {
        const x = -halfL + (Number(loc.xCoord) || 0) * scale
        const y = -halfW + (Number(loc.yCoord) || 0) * scale
        const w = (Number(loc.locationWidthM) || 2) * scale
        const h = (Number(loc.locationDepthM) || 2) * scale
        if (w < 1 || h < 1) return null
        const color = loc.displayColor || '#6b7280'
        return (
          <rect
            key={loc.id}
            x={x} y={y} width={w} height={h}
            fill={color} opacity={0.25}
            stroke={color} strokeWidth={0.5}
            rx={0.5}
          />
        )
      })}
    </g>
  )
}

function DimensionLines({ geometry, scale, colors }) {
  const halfL = (geometry.length * scale) / 2
  const halfW = (geometry.width * scale) / 2
  const offset = 25

  return (
    <g>
      {/* Top dimension (length) */}
      <line
        x1={-halfL} y1={-halfW - offset}
        x2={halfL} y2={-halfW - offset}
        stroke={colors.dimension} strokeWidth={1} strokeDasharray="4,2"
      />
      <line x1={-halfL} y1={-halfW - offset - 4} x2={-halfL} y2={-halfW - offset + 4} stroke={colors.dimension} strokeWidth={1} />
      <line x1={halfL} y1={-halfW - offset - 4} x2={halfL} y2={-halfW - offset + 4} stroke={colors.dimension} strokeWidth={1} />
      <text
        x={0} y={-halfW - offset - 6}
        textAnchor="middle"
        fill={colors.dimensionText} fontSize={10} fontFamily={FONT}
      >
        {geometry.length}m
      </text>

      {/* Left dimension (width) */}
      <g transform={`translate(${-halfL - offset}, 0)`}>
        <line
          x1={0} y1={-halfW}
          x2={0} y2={halfW}
          stroke={colors.dimension} strokeWidth={1} strokeDasharray="4,2"
        />
        <line x1={-4} y1={-halfW} x2={4} y2={-halfW} stroke={colors.dimension} strokeWidth={1} />
        <line x1={-4} y1={halfW} x2={4} y2={halfW} stroke={colors.dimension} strokeWidth={1} />
        <text
          x={-10} y={0}
          textAnchor="middle" dominantBaseline="middle"
          fill={colors.dimensionText} fontSize={10} fontFamily={FONT}
          transform="rotate(-90, -10, 0)"
        >
          {geometry.width}m
        </text>
      </g>
    </g>
  )
}

function Legend({ items }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Chú giải:</span>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: item.color,
              borderColor: item.stroke || item.color,
              opacity: item.opacity || 1,
            }}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function Compass({ x, y, colors }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={18} fill={colors.compassBg} />
      <path d="M 0 -13 L 3.5 0 L 0 -3.5 L -3.5 0 Z" fill={colors.compassText} />
      <path d="M 0 13 L 3.5 0 L 0 3.5 L -3.5 0 Z" fill="#CBD5E1" />
      <text y={-20} textAnchor="middle" fontSize={8} fontWeight="bold" fill={colors.compassText} fontFamily={FONT}>
        N
      </text>
    </g>
  )
}

function Tooltip({ tooltip }) {
  if (!tooltip) return null
  return (
    <foreignObject x={tooltip.x + 12} y={tooltip.y + 12} width={200} height={100}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg text-xs border border-navy-100 dark:border-slate-600"
      >
        {tooltip.lines.map((line, i) => (
          <div key={i} className={i === 0 ? 'font-semibold text-navy-900 dark:text-slate-100 mb-1' : 'text-navy-600 dark:text-slate-300'}>
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
  warehouse,
  zones,
  racks,
  locations,
  className = '',
}) {
  const isDark = useIsDark()
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT
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
    const availW = containerSize.width - 2 * PADDING
    const availH = containerSize.height - 2 * PADDING
    const s = Math.min(availW / geometry.length, availH / geometry.width)
    return {
      scale: s,
      svgW: geometry.length * s + 2 * PADDING,
      svgH: geometry.width * s + 2 * PADDING,
    }
  }, [containerSize, geometry])

  const lengthPx = geometry.length * scale
  const widthPx = geometry.width * scale

  const handleZoneHover = useCallback((e, zone) => {
    const svgEl = e.currentTarget.closest('svg')
    if (!svgEl) return
    const pt = svgEl.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse())

    const lines = [
      `${zone.zoneCode} — ${zone.zoneName || ''}`,
    ]
    if (zone.zoneType) lines.push(`Loại: ${zone.zoneType}`)
    const w = Number(zone.zoneWidthM)
    const d = Number(zone.zoneDepthM)
    if (w && d) lines.push(`Kích thước: ${w}m × ${d}m`)
    if (zone.maxCapacityMt) lines.push(`Sức chứa: ${new Intl.NumberFormat('vi-VN').format(zone.maxCapacityMt)} MT`)

    setTooltip({ x: svgPt.x, y: svgPt.y, lines })
  }, [])

  const handleZoneLeave = useCallback(() => setTooltip(null), [])

  const legendItems = useMemo(() => {
    const items = [
      { color: colors.floor, stroke: colors.floorStroke, label: 'Sàn kho' },
      { color: colors.wall, stroke: colors.wallStroke, label: 'Tường' },
    ]
    if (zones?.length) {
      items.push({ color: ZONE_PALETTE[0], opacity: 0.4, stroke: ZONE_PALETTE[0], label: 'Khu vực (Zone)' })
    }
    if (racks?.length) {
      items.push({ color: '#f97316', opacity: 0.5, stroke: '#f97316', label: 'Kệ hàng (Rack)' })
    }
    if (locations?.length) {
      items.push({ color: '#6b7280', opacity: 0.4, stroke: '#6b7280', label: 'Vị trí' })
    }
    return items
  }, [zones, racks, locations, colors])

  const hasNoLayout = !zones?.length && !racks?.length && !locations?.length

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[400px] flex flex-col ${className}`}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full flex-1"
        style={{ maxHeight: '100%' }}
      >
        <g transform={`translate(${svgW / 2}, ${svgH / 2})`}>
          {/* 1. Floor */}
          <FloorArea lengthPx={lengthPx} widthPx={widthPx} colors={colors} />

          {/* 2. Zones */}
          <ZoneOverlay
            zones={zones} scale={scale}
            halfL={lengthPx / 2} halfW={widthPx / 2}
            onHover={handleZoneHover} onLeave={handleZoneLeave}
            colors={colors}
          />

          {/* 3. Racks */}
          <RackOverlay racks={racks} scale={scale} halfL={lengthPx / 2} halfW={widthPx / 2} colors={colors} />

          {/* 4. Locations */}
          <LocationOverlay locations={locations} scale={scale} halfL={lengthPx / 2} halfW={widthPx / 2} />

          {/* 5. Walls */}
          <Walls lengthPx={lengthPx} widthPx={widthPx} colors={colors} />

          {/* 6. Dimensions */}
          <DimensionLines geometry={geometry} scale={scale} colors={colors} />

          {/* 7. Tooltip */}
          <Tooltip tooltip={tooltip} />

          {/* Empty state */}
          {hasNoLayout && (
            <text
              x={0} y={0}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={13} fill={colors.emptyText} fontFamily={FONT}
            >
              Chưa có dữ liệu layout — Sử dụng "Thiết kế mặt bằng" để thiết lập
            </text>
          )}
        </g>

        {/* Compass */}
        <Compass x={PADDING + 18} y={PADDING + 18} colors={colors} />

        {/* Title */}
        <text
          x={svgW / 2}
          y={svgH - 10}
          textAnchor="middle"
          fontSize={11}
          fill={colors.titleText}
          fontFamily={FONT}
        >
          {warehouse?.warehouseName || 'Sơ đồ mặt bằng kho'} — {geometry.length}m × {geometry.width}m
        </text>
      </svg>

      {/* Legend — outside SVG as HTML strip */}
      {!hasNoLayout && <Legend items={legendItems} />}
    </div>
  )
}
