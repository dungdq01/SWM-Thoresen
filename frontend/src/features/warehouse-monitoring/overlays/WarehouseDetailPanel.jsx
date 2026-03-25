import { memo, useMemo } from 'react'
import { X, Building, Box, Thermometer, Droplets, Wind, Layers, ArrowDownCircle, ArrowUpCircle, ClipboardCheck, Maximize2, Package, Receipt } from 'lucide-react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

export const WarehouseDetailPanel = memo(function WarehouseDetailPanel() {
  const { state, computed, actions } = useWarehouse3D()
  const wh = computed.selectedWarehouse
  const whIdx = state.selectedWhIndex

  const fillColor = useMemo(() => {
    if (!wh) return {}
    const pct = wh.fill
    if (pct >= 90) return { text: 'text-red-400', bg: 'bg-red-500', ring: '#ef4444', badge: 'bg-red-500/15 text-red-400 border-red-500/30' }
    if (pct >= 75) return { text: 'text-amber-400', bg: 'bg-amber-500', ring: '#f59e0b', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
    if (pct >= 50) return { text: 'text-blue-400', bg: 'bg-blue-500', ring: '#3b82f6', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', ring: '#10b981', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
  }, [wh])

  const ownerColor = useMemo(() => {
    if (!wh) return ''
    if (wh.owner === 'TVL') return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    if (wh.owner === 'Partner A') return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  }, [wh])

  const recentActivity = useMemo(() => {
    if (whIdx === null) return []
    return [
      { type: 'Nhập', icon: ArrowDownCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', code: `RC-2026-${String(300 + whIdx * 13).padStart(4, '0')}`, qty: `${(10 + Math.random() * 25).toFixed(1)} tấn`, time: `14:${String(30 - whIdx * 2).padStart(2, '0')}` },
      { type: 'Xuất', icon: ArrowUpCircle, color: 'text-amber-400', bgColor: 'bg-amber-500/15', code: `SH-2026-${String(200 + whIdx * 7).padStart(4, '0')}`, qty: `${(5 + Math.random() * 20).toFixed(1)} tấn`, time: `13:${String(45 - whIdx * 3).padStart(2, '0')}` },
      { type: 'Kiểm kê', icon: ClipboardCheck, color: 'text-purple-400', bgColor: 'bg-purple-500/15', code: `IC-2026-${String(100 + whIdx * 11).padStart(4, '0')}`, qty: '', time: '11:00' },
    ]
  }, [whIdx])

  const zoneData = useMemo(() => {
    if (!wh) return []
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    return Array.from({ length: wh.zones }, (_, i) => {
      const fill = Math.round(Math.max(15, Math.min(100, wh.fill * (0.65 + (((i * 7 + whIdx * 13) % 100) / 100) * 0.65))))
      return { name: `Zone ${names[i] || i + 1}`, fill }
    })
  }, [wh, whIdx])

  if (!wh) return null

  // SVG ring calculations
  const circumference = 2 * Math.PI * 42
  const dashLen = (wh.fill / 100) * circumference

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] pointer-events-auto animate-in slide-in-from-right duration-300 z-[150]">
      <div className="h-full bg-black/90 backdrop-blur-xl border-l border-white/8 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-br from-blue-500/8 to-purple-500/5 border-b border-white/6">
          <div className="flex justify-between items-start">
            <div className="text-2xl font-extrabold text-blue-400 font-mono tracking-tight">{wh.code}</div>
            <button
              onClick={() => actions.setSelectedWh(null)}
              className="w-7 h-7 rounded-lg bg-white/6 border border-white/8 text-white/45 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-all text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-white/55 mt-1">{wh.name}</div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 uppercase tracking-wide ${ownerColor}`}>
              <Building className="w-3 h-3" /> {wh.owner}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${fillColor.badge}`}>
              <Box className="w-3 h-3" /> {wh.type}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Capacity Ring + Stats */}
          <div className="flex items-center gap-4 p-3.5 bg-white/3 rounded-xl border border-white/5">
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 100 100" width="85" height="85">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={fillColor.ring} strokeWidth="8"
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={circumference / 4} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.8s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-xl font-extrabold font-mono ${fillColor.text}`}>{wh.fill}%</div>
                <div className="text-[8px] text-white/35 uppercase tracking-widest">Công suất</div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[
                ['Tồn kho', `${wh.stock.toLocaleString()} tấn`],
                ['Diện tích', `${wh.area.toLocaleString()} m²`],
                ['Zones', `${wh.zones} zones`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">{label}</span>
                  <span className="text-[11px] font-bold text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Thermometer, color: 'text-red-400', value: `${wh.temp}°C`, label: 'Nhiệt độ' },
              { icon: Droplets, color: 'text-blue-400', value: `${wh.humid}%`, label: 'Độ ẩm' },
              { icon: Wind, color: 'text-emerald-400', value: 'Tốt', label: 'Thông gió' },
            ].map(({ icon: Icon, color, value, label }) => (
              <div key={label} className="bg-white/3 border border-white/5 rounded-xl p-2.5 text-center">
                <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
                <div className="text-sm font-bold text-white font-mono">{value}</div>
                <div className="text-[8px] text-white/30 uppercase mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Items List */}
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Package className="w-3 h-3 text-blue-400" /> Hàng hóa tồn kho
            </div>
            {wh.items.map(([name, qty, unit], i) => {
              const pct = Math.round(qty / wh.stock * 100)
              return (
                <div key={i} className="p-2.5 bg-white/3 rounded-lg mb-1.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-white/60">{name}</span>
                    <span className="text-[10px] font-bold text-blue-400 font-mono">{qty.toLocaleString()} {unit}</span>
                  </div>
                  <div className="h-[3px] bg-white/6 rounded-full overflow-hidden">
                    <div className={`h-full ${fillColor.bg} rounded-full`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Zone Usage */}
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-blue-400" /> Phân bổ theo Zone
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {zoneData.map(({ name, fill }) => {
                const zColor = fill >= 90 ? 'text-red-400' : fill >= 70 ? 'text-amber-400' : fill >= 40 ? 'text-blue-400' : 'text-emerald-400'
                const zBg = fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : fill >= 40 ? 'bg-blue-500' : 'bg-emerald-500'
                return (
                  <div key={name} className="bg-white/3 border border-white/5 rounded-lg p-2 text-center">
                    <div className="text-[8px] text-white/40 font-bold uppercase">{name}</div>
                    <div className={`text-sm font-extrabold font-mono my-0.5 ${zColor}`}>{fill}%</div>
                    <div className="h-[3px] bg-white/6 rounded-full overflow-hidden">
                      <div className={`h-full ${zBg} rounded-full`} style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ClipboardCheck className="w-3 h-3 text-blue-400" /> Hoạt động gần đây
            </div>
            {recentActivity.map((act, i) => {
              const Icon = act.icon
              return (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-white/3 rounded-lg mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${act.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-white/75">{act.type}{act.qty ? ` — ${act.qty}` : ''}</div>
                    <div className="text-[9px] text-white/30 font-mono">{act.code}</div>
                  </div>
                  <div className="text-[9px] text-white/25 font-mono flex-shrink-0">{act.time}</div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => actions.openModal(whIdx)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Chi tiết đầy đủ
            </button>
            <div className="flex gap-1.5">
              <button className="flex-1 py-2 rounded-xl bg-white/6 border border-white/8 text-white/65 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white transition-all">
                <Package className="w-3 h-3" /> Tồn kho
              </button>
              <button className="flex-1 py-2 rounded-xl bg-white/6 border border-white/8 text-white/65 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white transition-all">
                <Receipt className="w-3 h-3" /> Phiếu nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
