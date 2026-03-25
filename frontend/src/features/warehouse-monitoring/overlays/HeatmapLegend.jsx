import { memo } from 'react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

const levels = [
  { label: '≥ 90%', color: 'bg-red-500', text: 'Quá tải' },
  { label: '75-89%', color: 'bg-amber-500', text: 'Cao' },
  { label: '50-74%', color: 'bg-blue-500', text: 'Trung bình' },
  { label: '< 50%', color: 'bg-emerald-500', text: 'Thấp' },
]

export const HeatmapLegend = memo(function HeatmapLegend() {
  const { state } = useWarehouse3D()

  if (!state.heatmapActive) return null

  return (
    <div className="absolute bottom-24 right-4 pointer-events-auto">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Heatmap — Mức sử dụng</div>
        <div className="space-y-1.5">
          {levels.map(({ label, color, text }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-[10px] text-white/60 w-14">{label}</span>
              <span className="text-[10px] text-white/40">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
