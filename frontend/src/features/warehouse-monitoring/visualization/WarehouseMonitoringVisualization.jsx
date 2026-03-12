import { useState, useMemo, Suspense, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react'
import { WarehouseMonitoring3DViewer } from './WarehouseMonitoring3DViewer'

// Generate time slots for 24 hours with 15-minute intervals
const generateTimeSlots = () => {
  const slots = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push({
        hour: h,
        minute: m,
        label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        index: slots.length,
      })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots() // 96 slots (24h * 4)

// Default geometry for fallback
const DEFAULT_GEOMETRY = {
  length: 102.5,
  width: 68.3,
  height: 12,
  columnSpacingM: 6,
}

const DEFAULT_DOCKS = {
  positions: [
    { offsetM: 20 },
    { offsetM: 30 },
    { offsetM: 40 },
    { offsetM: 50 },
  ],
}

const DEFAULT_ROOF = {
  type: 'PITCHED',
  slopePercent: 15,
}

function buildVisualizationData(warehouse) {
  if (!warehouse) {
    return {
      geometry: DEFAULT_GEOMETRY,
      docks: DEFAULT_DOCKS,
      roof: DEFAULT_ROOF,
    }
  }

  const totalArea = warehouse.totalAreaM2 || 7000
  const usableArea = warehouse.usableAreaM2 || 4000
  const height = warehouse.maxHeightM || 12

  // Calculate dimensions based on area (assume roughly 3:2 ratio)
  const ratio = 1.5
  const width = Math.sqrt(totalArea / ratio)
  const length = width * ratio

  return {
    geometry: {
      length: Math.round(length * 10) / 10,
      width: Math.round(width * 10) / 10,
      height,
      columnSpacingM: 6,
    },
    docks: DEFAULT_DOCKS,
    roof: DEFAULT_ROOF,
  }
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

function StatsBar({ geometry, docks, warehouse }) {
  const stats = [
    { label: 'Diện tích', value: `${geometry.length * geometry.width} m²` },
    { label: 'DT sử dụng', value: `${warehouse?.usableAreaM2 || '-'} m²` },
    { label: 'Chiều cao', value: `${geometry.height}m` },
    { label: 'Kích thước', value: `${geometry.length}m × ${geometry.width}m` },
    { label: 'Cột', value: '0' },
    { label: 'Dock', value: docks?.positions?.length || 0 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-navy-500">{stat.label}:</span>
          <span className="font-medium text-navy-700">{stat.value}</span>
        </div>
      ))}
    </div>
  )
}

// Timeline Control Component
function TimelineControl({ currentIndex, onIndexChange, isPlaying, onPlayPause, totalSlots }) {
  const currentSlot = TIME_SLOTS[currentIndex]
  
  const handlePrev = () => {
    onIndexChange(Math.max(0, currentIndex - 1))
  }
  
  const handleNext = () => {
    onIndexChange(Math.min(totalSlots - 1, currentIndex + 1))
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-navy-800 rounded-lg">
      {/* Time display */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-white font-mono text-sm font-medium">{currentSlot?.label}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={onPlayPause}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-400 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === totalSlots - 1}
          className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline slider */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={totalSlots - 1}
          value={currentIndex}
          onChange={(e) => onIndexChange(parseInt(e.target.value))}
          className="flex-1 h-1.5 bg-navy-600 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:bg-blue-300"
        />
        <span className="text-xs text-white/50 min-w-[60px] text-right">
          {currentIndex + 1}/{totalSlots}
        </span>
      </div>
    </div>
  )
}

// Speed selector
function SpeedSelector({ speed, onSpeedChange }) {
  const speeds = [
    { value: 2000, label: '0.5x' },
    { value: 1000, label: '1x' },
    { value: 500, label: '2x' },
    { value: 250, label: '4x' },
  ]

  return (
    <div className="flex items-center gap-1 bg-navy-700 rounded px-2 py-1">
      <span className="text-xs text-white/50 mr-1">Tốc độ:</span>
      {speeds.map((s) => (
        <button
          key={s.value}
          onClick={() => onSpeedChange(s.value)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            speed === s.value
              ? 'bg-blue-500 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

export function WarehouseMonitoringVisualization({ warehouse, inventoryData, className = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeIndex, setTimeIndex] = useState(() => {
    // Start at current time
    const now = new Date()
    const currentSlot = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)
    return Math.min(currentSlot, TIME_SLOTS.length - 1)
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000) // ms per step

  // Auto-advance timeline when playing
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setTimeIndex((prev) => {
        if (prev >= TIME_SLOTS.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, playSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, playSpeed])

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const vizData = useMemo(() => {
    try {
      return buildVisualizationData(warehouse)
    } catch (e) {
      console.error('Error building viz data:', e)
      return {
        geometry: DEFAULT_GEOMETRY,
        docks: DEFAULT_DOCKS,
        roof: DEFAULT_ROOF,
      }
    }
  }, [warehouse])
  
  const { geometry, docks, roof } = vizData

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white p-4 flex flex-col'
    : `bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden ${className}`

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-navy-100">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-navy-900">Giám sát kho 4D</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            Real-time
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
            Timeline 15ph
          </span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 3D Visualization */}
      <div className={`flex-1 relative ${isFullscreen ? '' : 'h-[500px]'}`}>
        <Suspense fallback={<Loading3DFallback />}>
          <WarehouseMonitoring3DViewer
            geometry={geometry}
            docks={docks}
            roof={roof}
            warehouse={warehouse}
            timeIndex={timeIndex}
          />
        </Suspense>

        {/* 4D Timeline Control - Overlay at bottom */}
        <div className="absolute bottom-14 left-3 right-3 flex items-center gap-3">
          <TimelineControl
            currentIndex={timeIndex}
            onIndexChange={setTimeIndex}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            totalSlots={TIME_SLOTS.length}
          />
          <SpeedSelector speed={playSpeed} onSpeedChange={setPlaySpeed} />
        </div>
      </div>
    </div>
  )
}
