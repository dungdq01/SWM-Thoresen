import { useState, useMemo, lazy, Suspense } from 'react'
import { Box, Layers, Download, Maximize2, Minimize2 } from 'lucide-react'
import { buildVisualizationData, formatNumber } from './utils'
import { WarehouseFloorPlan2D } from './WarehouseFloorPlan2D'

const Warehouse3DViewer = lazy(() =>
  import('./Warehouse3DViewer').then((m) => ({ default: m.Warehouse3DViewer }))
)

function ViewToggle({ is3D, onChange }) {
  return (
    <div className="inline-flex items-center bg-navy-100 rounded-lg p-0.5">
      <button
        onClick={() => onChange(false)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          !is3D
            ? 'bg-white text-navy-900 shadow-sm'
            : 'text-navy-500 hover:text-navy-700'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        2D
      </button>
      <button
        onClick={() => onChange(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          is3D
            ? 'bg-white text-navy-900 shadow-sm'
            : 'text-navy-500 hover:text-navy-700'
        }`}
      >
        <Box className="w-3.5 h-3.5" />
        3D
      </button>
    </div>
  )
}

function StatsBar({ geometry, docks, warehouse }) {
  const stats = [
    { label: 'Diện tích', value: `${formatNumber(geometry.totalArea)} m²` },
    { label: 'DT sử dụng', value: `${formatNumber(geometry.usableArea)} m²` },
    { label: 'Chiều cao', value: `${geometry.height}m` },
    { label: 'Kích thước', value: `${geometry.length}m × ${geometry.width}m` },
    { label: 'Cột', value: geometry.columnsCount || '—' },
    { label: 'Dock', value: docks?.count || '—' },
  ]

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {stats.map((s) => (
        <div key={s.label} className="text-xs">
          <span className="text-navy-500">{s.label}: </span>
          <span className="font-medium text-navy-800">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

function Loading3DFallback() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-50 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-navy-500">Đang tải chế độ xem 3D...</span>
      </div>
    </div>
  )
}

export function WarehouseVisualization({ warehouse, className = '' }) {
  const [is3D, setIs3D] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const vizData = useMemo(() => buildVisualizationData(warehouse), [warehouse])
  const { geometry, docks, roof, specs, columnPositions } = vizData

  const handleExportSVG = () => {
    const svgElement = document.querySelector('.warehouse-floor-plan svg')
    if (!svgElement) return
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `floor-plan-${warehouse?.warehouseCode || 'warehouse'}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white p-4 flex flex-col'
    : `bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden ${className}`

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-navy-100">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-navy-900">Sơ đồ mặt bằng</h3>
          <ViewToggle is3D={is3D} onChange={setIs3D} />
        </div>
        <div className="flex items-center gap-2">
          {!is3D && (
            <button
              onClick={handleExportSVG}
              className="p-1.5 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
              title="Xuất SVG"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-2.5 border-b border-navy-50 bg-navy-50/30">
        <StatsBar geometry={geometry} docks={docks} warehouse={warehouse} />
      </div>

      {/* Visualization area */}
      <div className={`flex-1 ${isFullscreen ? '' : 'h-[500px]'}`}>
        {is3D ? (
          <Suspense fallback={<Loading3DFallback />}>
            <Warehouse3DViewer
              geometry={geometry}
              docks={docks}
              roof={roof}
              columnPositions={columnPositions}
              warehouse={warehouse}
            />
          </Suspense>
        ) : (
          <div className="warehouse-floor-plan w-full h-full">
            <WarehouseFloorPlan2D
              geometry={geometry}
              docks={docks}
              specs={specs}
              columnPositions={columnPositions}
              warehouse={warehouse}
            />
          </div>
        )}
      </div>
    </div>
  )
}
