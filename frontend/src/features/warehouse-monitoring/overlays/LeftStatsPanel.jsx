import { memo, useState, useEffect } from 'react'
import { Warehouse, Box, Truck, BarChart3, Ruler, Clock } from 'lucide-react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

function StatItem({ icon: Icon, label, value, color = 'text-blue-400' }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={`text-[11px] font-semibold ml-auto ${color}`}>{value}</span>
    </div>
  )
}

export const LeftStatsPanel = memo(function LeftStatsPanel() {
  const { computed } = useWarehouse3D()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute top-20 left-4 pointer-events-auto w-52">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Tổng quan hệ thống</div>
        <div className="divide-y divide-white/5">
          <StatItem icon={Ruler} label="Diện tích" value={`${(computed.totalArea / 1000).toFixed(1)}k m²`} />
          <StatItem icon={Warehouse} label="Kho hoạt động" value={computed.activeWarehouses} color="text-emerald-400" />
          <StatItem icon={Box} label="Tồn kho" value={`${(computed.totalStock / 1000).toFixed(1)}k tấn`} color="text-amber-400" />
          <StatItem icon={Truck} label="Xe đang chạy" value="8" color="text-cyan-400" />
          <StatItem icon={BarChart3} label="Sử dụng TB" value={`${computed.averageUsage}%`} color="text-purple-400" />
          <StatItem icon={Clock} label="Giờ" value={time.toLocaleTimeString('vi-VN')} color="text-white/70" />
        </div>
      </div>
    </div>
  )
})
