import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, PackageCheck } from 'lucide-react'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { ZONE_TYPE_COLORS } from '../utils/layoutSerializer'

const ZONE_TYPE_LABELS = {
  RECEIVING: 'Nhận hàng',
  STORAGE: 'Lưu trữ',
  STAGING: 'Tập kết',
  SHIPPING: 'Xuất hàng',
  QC: 'Kiểm định',
  DAMAGED: 'Hàng hỏng',
  RETURNS: 'Hàng trả',
}

function isPlaced(item) {
  return item.isPlaced === true
}

function PaletteItem({ item, type, label, sublabel, color, size }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData(
      'application/layout-element',
      JSON.stringify({ id: item.id, type }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing select-none transition-colors group bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 shadow-sm"
      title="Kéo vào sơ đồ để đặt"
    >
      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-500 group-hover:text-blue-400 shrink-0" />
      <span
        className="w-3 h-3 rounded-sm shrink-0 border"
        style={{ backgroundColor: color, borderColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{label}</div>
        {sublabel && <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sublabel}</div>}
      </div>
      {size && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
          {size}
        </span>
      )}
    </div>
  )
}

function CollapsibleSection({ title, count, totalCount, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const placedCount = totalCount - count

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{title}</span>
        <span className="text-slate-400 font-normal ml-auto">
          {count > 0 ? count : ''}
        </span>
        {placedCount > 0 && (
          <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium" title={`${placedCount} đã đặt trên sơ đồ`}>
            {placedCount} đã đặt
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-1 mt-1">{children}</div>
      )}
    </div>
  )
}

export default function ElementPalette() {
  const { state, actions } = useLayoutEditor()
  const [filter, setFilter] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const zones = state.zones || []
  const racks = state.racks || []
  const locations = state.locations || []

  // Only show unplaced items
  const unplacedZones = zones.filter((z) => !isPlaced(z))
  const unplacedRacks = racks.filter((r) => !isPlaced(r))
  const unplacedLocations = locations.filter((l) => !isPlaced(l))

  const filterLower = filter.toLowerCase()
  const filteredZones = filterLower
    ? unplacedZones.filter((z) => (z.zoneCode + z.zoneName).toLowerCase().includes(filterLower))
    : unplacedZones
  const filteredRacks = filterLower
    ? unplacedRacks.filter((r) => (r.rackCode + r.rackName).toLowerCase().includes(filterLower))
    : unplacedRacks
  const filteredLocations = filterLower
    ? unplacedLocations.filter((l) => l.locationCode.toLowerCase().includes(filterLower))
    : unplacedLocations

  const totalUnplaced = unplacedZones.length + unplacedRacks.length + unplacedLocations.length

  const unplaceItem = (id, type) => {
    actions.unplaceElement(id, type)
  }

  // Drop target: drag from palette-item that's already placed back to palette = unplace
  const handlePaletteDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handlePaletteDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handlePaletteDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData('application/layout-element')
    if (!raw) return
    try {
      const { id, type } = JSON.parse(raw)
      unplaceItem(id, type)
    } catch { /* ignore */ }
  }

  // All placed — show success state
  if (totalUnplaced === 0 && !isDragOver) {
    return (
      <div
        className={`w-52 bg-white dark:bg-slate-900 border-r flex flex-col shrink-0 overflow-hidden transition-colors ${
          isDragOver ? 'border-red-400 bg-red-50/50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'
        }`}
        onDragOver={handlePaletteDragOver}
        onDragLeave={handlePaletteDragLeave}
        onDrop={handlePaletteDrop}
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
          <PackageCheck className="w-8 h-8 text-green-400 mb-2" />
          <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Tất cả đã đặt!</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            {zones.length} zone · {racks.length} rack · {locations.length} vị trí đều đã nằm trên sơ đồ
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
            Chọn item trên sơ đồ → nhấn "Gỡ khỏi sơ đồ" ở panel phải để đưa lại đây
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-52 bg-white dark:bg-slate-900 border-r flex flex-col shrink-0 overflow-hidden transition-colors ${
        isDragOver
          ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/20'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      onDragOver={handlePaletteDragOver}
      onDragLeave={handlePaletteDragLeave}
      onDrop={handlePaletteDrop}
    >
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Chưa đặt trên sơ đồ</div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">
          Kéo vào sơ đồ để xếp vị trí · {totalUnplaced} còn lại
        </div>
        {(unplacedZones.length + unplacedRacks.length + unplacedLocations.length) > 5 && (
          <input
            type="text"
            placeholder="Tìm..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        )}
      </div>

      {isDragOver && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 text-center">
          <div className="text-xs text-amber-700 font-medium">Thả để gỡ khỏi sơ đồ</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {/* Zones */}
        {filteredZones.length > 0 && (
          <CollapsibleSection
            title="Zone"
            count={filteredZones.length}
            totalCount={zones.length}
            defaultOpen
          >
            {filteredZones.map((z) => (
              <PaletteItem
                key={z.id}
                item={z}
                type="zone"
                label={z.zoneCode}
                sublabel={`${ZONE_TYPE_LABELS[z.zoneType] || z.zoneType} · ${z.zoneName}`}
                color={z.displayColor || ZONE_TYPE_COLORS[z.zoneType] || '#3b82f6'}
                size={`${z.widthM?.toFixed(0)}×${z.depthM?.toFixed(0)}`}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Racks */}
        {filteredRacks.length > 0 && (
          <CollapsibleSection
            title="Rack"
            count={filteredRacks.length}
            totalCount={racks.length}
          >
            {filteredRacks.map((r) => (
              <PaletteItem
                key={r.id}
                item={r}
                type="rack"
                label={r.rackCode}
                sublabel={r.rackName}
                color={r.displayColor || '#f97316'}
                size={`${r.widthM?.toFixed(0)}×${r.depthM?.toFixed(0)}`}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Locations */}
        {filteredLocations.length > 0 && (
          <CollapsibleSection
            title="Vị trí"
            count={filteredLocations.length}
            totalCount={locations.length}
            defaultOpen={filteredLocations.length <= 50}
          >
            {filteredLocations.map((l) => (
              <PaletteItem
                key={l.id}
                item={l}
                type="location"
                label={l.locationCode}
                sublabel={l.locationType}
                color={l.displayColor || '#8b5cf6'}
                size={`${l.widthM?.toFixed(0)}×${l.depthM?.toFixed(0)}`}
              />
            ))}
          </CollapsibleSection>
        )}

        {filteredZones.length === 0 && filteredRacks.length === 0 && filteredLocations.length === 0 && filter && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 px-2 py-4 text-center">Không tìm thấy phần tử nào</div>
        )}
      </div>
    </div>
  )
}
