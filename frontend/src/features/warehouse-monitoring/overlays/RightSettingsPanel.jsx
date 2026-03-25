import { memo } from 'react'
import { Tag, Truck, Grid3X3, CloudFog, Sun, Home } from 'lucide-react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

const settingItems = [
  { key: 'labels', icon: Tag, label: 'Nhãn kho' },
  { key: 'vehicles', icon: Truck, label: 'Phương tiện' },
  { key: 'grid', icon: Grid3X3, label: 'Lưới nền' },
  { key: 'fog', icon: CloudFog, label: 'Sương mù' },
  { key: 'shadows', icon: Sun, label: 'Bóng đổ' },
  { key: 'roof', icon: Home, label: 'Mái kho' },
]

export const RightSettingsPanel = memo(function RightSettingsPanel() {
  const { state, actions } = useWarehouse3D()

  return (
    <div className="absolute top-20 right-4 pointer-events-auto w-48">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Cài đặt hiển thị</div>
        <div className="space-y-2">
          {settingItems.map(({ key, icon: Icon, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <Icon className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60" />
              <span className="text-[11px] text-white/60 flex-1">{label}</span>
              <button
                onClick={() => actions.toggleSetting(key)}
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  state.settings[key] ? 'bg-blue-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    state.settings[key] ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
})
