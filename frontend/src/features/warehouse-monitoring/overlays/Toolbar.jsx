import { memo, useCallback } from 'react'
import { Eye, Map, Plane, Gamepad2, RotateCcw, Maximize, Sun, Moon, Thermometer, Sparkles } from 'lucide-react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'

const cameraModes = [
  { mode: 'overview', icon: Eye, label: 'Tổng quan' },
  { mode: 'topdown', icon: Map, label: 'Từ trên' },
  { mode: 'flythrough', icon: Plane, label: 'Bay qua' },
  { mode: 'free', icon: Gamepad2, label: 'Tự do' },
]

export const Toolbar = memo(function Toolbar() {
  const { state, actions } = useWarehouse3D()

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const handleReset = useCallback(() => {
    actions.setCameraMode('overview')
  }, [actions])

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2">
      {/* Camera modes */}
      <div className="flex items-center bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-1 gap-1">
        {cameraModes.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => actions.setCameraMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              state.cameraMode === mode
                ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="flex items-center bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-1 gap-1">
        <button
          onClick={actions.toggleHeatmap}
          className={`p-2 rounded-lg transition-all ${state.heatmapActive ? 'bg-red-500/30 text-red-300' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Heatmap"
        >
          <Thermometer className="w-4 h-4" />
        </button>
        <button
          onClick={actions.toggleDayNight}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          title={state.isDay ? 'Chuyển ban đêm' : 'Chuyển ban ngày'}
        >
          {state.isDay ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <button
          onClick={actions.toggleEffects}
          className={`p-2 rounded-lg transition-all ${state.effectsOn ? 'bg-purple-500/30 text-purple-300' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Hiệu ứng"
        >
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all" title="Reset">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={handleFullscreen} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all" title="Toàn màn hình">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})
