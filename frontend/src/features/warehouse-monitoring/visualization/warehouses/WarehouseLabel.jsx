import { memo } from 'react'
import { Html } from '@react-three/drei'
import { WALL_HEIGHT, ROOF_PEAK } from '../../data/warehouseData'

export const WarehouseLabel = memo(function WarehouseLabel({ wh }) {
  return (
    <Html
      position={[0, WALL_HEIGHT + ROOF_PEAK + 8, 0]}
      center
      distanceFactor={200}
      style={{ pointerEvents: 'none' }}
    >
      <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 whitespace-nowrap">
        <div className="text-[10px] font-bold text-white">{wh.code}</div>
        <div className="text-[8px] text-white/60">{wh.fill}%</div>
      </div>
    </Html>
  )
})
