import { memo } from 'react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'
import { Toolbar } from './Toolbar'
import { LeftStatsPanel } from './LeftStatsPanel'
import { RightSettingsPanel } from './RightSettingsPanel'
import { WarehouseHoverPanel } from './WarehouseHoverPanel'
import { HeatmapLegend } from './HeatmapLegend'
import { ActivityTicker } from './ActivityTicker'
import { FPSCounter } from './FPSCounter'
import { LoadingScreen } from './LoadingScreen'

export const OverlayContainer = memo(function OverlayContainer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <Toolbar />
      <LeftStatsPanel />
      <RightSettingsPanel />
      <WarehouseHoverPanel />
      <HeatmapLegend />
      <ActivityTicker />
      <FPSCounter />
      <LoadingScreen />
    </div>
  )
})
