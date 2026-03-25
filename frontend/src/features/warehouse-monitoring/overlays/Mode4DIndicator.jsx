import { memo } from 'react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

export const Mode4DIndicator = memo(function Mode4DIndicator() {
  const { state } = useWarehouse3D()

  if (!state.mode4D) return null

  return (
    <div className="absolute top-[72px] left-1/2 -translate-x-1/2 pointer-events-none z-[99]">
      <div className="flex items-center gap-2 bg-amber-500/12 border border-amber-500/30 backdrop-blur-md rounded-lg px-3.5 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-extrabold text-amber-400 tracking-widest font-mono">4D MODE</span>
        <span className="text-[10px] text-white/40">Mô phỏng nhập/xuất hàng thời gian thực</span>
      </div>
    </div>
  )
})
