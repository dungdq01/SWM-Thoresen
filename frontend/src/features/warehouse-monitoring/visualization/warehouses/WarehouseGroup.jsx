import { memo } from 'react'
import { WH_DATA } from '../../data/warehouseData'
import { WarehouseBuilding } from './WarehouseBuilding'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

export const WarehouseGroup = memo(function WarehouseGroup() {
  const { state, computed } = useWarehouse3D()

  return (
    <group>
      {WH_DATA.map((wh, idx) => (
        <WarehouseBuilding
          key={wh.code}
          wh={wh}
          index={idx}
          isHovered={state.hoveredWhIndex === idx}
          isSelected={state.selectedWhIndex === idx}
          heatmapActive={state.heatmapActive}
          showLabels={state.settings.labels}
        />
      ))}
    </group>
  )
})
