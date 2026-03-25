import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { TREE_POSITIONS } from '../../data/warehouseData'

const CANOPY_COLORS = [0x1a4a1a, 0x1e5c1e, 0x225522]

const Tree = memo(function Tree({ position }) {
  const scale = useMemo(() => 0.8 + Math.random() * 0.5, [])
  const trunkH = 4 * scale

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.5 * scale, 0.7 * scale, trunkH, 6]} />
        <meshStandardMaterial color={0x5c4033} roughness={0.92} />
      </mesh>
      {/* Canopy layers */}
      {[0, 2, 4].map((offset, i) => {
        const canopyR = (4.5 - i * 0.8) * scale
        const canopyH = (5 - i * 0.5) * scale
        return (
          <mesh key={i} position={[0, trunkH + offset * scale + canopyH / 2, 0]} castShadow>
            <coneGeometry args={[canopyR, canopyH, 8]} />
            <meshStandardMaterial color={CANOPY_COLORS[i]} roughness={0.95} />
          </mesh>
        )
      })}
    </group>
  )
})

export const TreesAndLandscape = memo(function TreesAndLandscape() {
  return (
    <group>
      {TREE_POSITIONS.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}
    </group>
  )
})
