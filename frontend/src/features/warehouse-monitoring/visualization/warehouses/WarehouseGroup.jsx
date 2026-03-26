import { memo } from 'react'
import { WH_DATA } from '../../data/warehouseData'
import { WarehouseBuilding } from './WarehouseBuilding'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

export const WarehouseGroup = memo(function WarehouseGroup() {
  const { state, computed } = useWarehouse3D()

  // Use API data if available, fallback to mock WH_DATA
  const data = state.warehouseData || WH_DATA

  return (
    <group>
      {data.map((wh, idx) => (
        <WarehouseBuilding
          key={wh.code}
          wh={wh}
          index={idx}
          isHovered={state.hoveredWhIndex === idx}
          isSelected={state.selectedWhIndex === idx}
          heatmapActive={state.heatmapActive}
          showLabels={state.settings.labels}
          showRoof={state.settings.roof}
        />
      ))}
    </group>
  )
})
