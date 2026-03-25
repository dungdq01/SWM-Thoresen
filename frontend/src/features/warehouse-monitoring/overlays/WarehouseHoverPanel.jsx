import { memo } from 'react'
import { Warehouse, Thermometer, Droplets, Box } from 'lucide-react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

export const WarehouseHoverPanel = memo(function WarehouseHoverPanel() {
  const { computed } = useWarehouse3D()
  const wh = computed.hoveredWarehouse

  if (!wh) return null

  const fillColor = wh.fill >= 90 ? 'text-red-400' : wh.fill >= 75 ? 'text-amber-400' : wh.fill >= 50 ? 'text-blue-400' : 'text-emerald-400'
  const fillBg = wh.fill >= 90 ? 'bg-red-500' : wh.fill >= 75 ? 'bg-amber-500' : wh.fill >= 50 ? 'bg-blue-500' : 'bg-emerald-500'

  return (
    <div className="absolute bottom-24 left-4 pointer-events-auto w-64 animate-in slide-in-from-left-4 duration-200">
      <div className="bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Warehouse className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-sm font-bold text-white">{wh.code}</div>
            <div className="text-[10px] text-white/50">{wh.name}</div>
          </div>
        </div>

        {/* Fill bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-white/50">Sử dụng</span>
            <span className={fillColor}>{wh.fill}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${fillBg} rounded-full transition-all`} style={{ width: `${wh.fill}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1 text-white/50">
            <Box className="w-3 h-3" />
            <span>{wh.stock.toLocaleString()} tấn</span>
          </div>
          <div className="flex items-center gap-1 text-white/50">
            <Thermometer className="w-3 h-3" />
            <span>{wh.temp}°C</span>
          </div>
          <div className="flex items-center gap-1 text-white/50">
            <span>📐</span>
            <span>{wh.area.toLocaleString()} m²</span>
          </div>
          <div className="flex items-center gap-1 text-white/50">
            <Droplets className="w-3 h-3" />
            <span>{wh.humid}%</span>
          </div>
        </div>

        {/* Items */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-[9px] text-white/40 mb-1">Hàng hóa</div>
          {wh.items.map(([name, qty, unit], i) => (
            <div key={i} className="flex justify-between text-[10px] py-0.5">
              <span className="text-white/60">{name}</span>
              <span className="text-white/80">{qty.toLocaleString()} {unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
