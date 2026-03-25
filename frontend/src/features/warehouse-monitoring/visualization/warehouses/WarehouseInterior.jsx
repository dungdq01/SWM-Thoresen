import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, ROOF_PEAK } from '../../data/warehouseData'

export const WarehouseInterior = memo(function WarehouseInterior({ wh }) {
  const colMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.85, roughness: 0.25 }), [])

  const colRows = Math.max(2, Math.floor(wh.depth / 25))
  const colSpacingZ = (wh.depth - 10) / colRows
  const colPositionsX = [-wh.width * 0.33, 0, wh.width * 0.33]

  const columns = useMemo(() => {
    const items = []
    for (let cr = 0; cr < colRows; cr++) {
      const cz = -wh.depth / 2 + 5 + cr * colSpacingZ + colSpacingZ / 2
      colPositionsX.forEach((cx, ci) => {
        items.push({ cx, cz, ci })
      })
    }
    return items
  }, [colRows, colSpacingZ, wh.depth])

  const colH = WALL_HEIGHT + ROOF_PEAK * 0.5

  return (
    <group>
      {columns.map(({ cx, cz, ci }, i) => (
        <group key={i}>
          {/* Vertical column — no castShadow for perf */}
          <mesh position={[cx, (WALL_HEIGHT + ROOF_PEAK * 0.3) / 2, cz]} material={colMat}>
            <boxGeometry args={[1.0, colH, 1.0]} />
          </mesh>
          {/* Cross beam only */}
          {ci < colPositionsX.length - 1 && (
            <mesh position={[cx + (colPositionsX[ci + 1] - cx) / 2, WALL_HEIGHT - 0.5, cz]} material={colMat}>
              <boxGeometry args={[colPositionsX[ci + 1] - cx, 0.6, 0.6]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
})
