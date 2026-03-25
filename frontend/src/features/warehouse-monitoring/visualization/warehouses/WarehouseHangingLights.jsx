import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT } from '../../data/warehouseData'

export const WarehouseHangingLights = memo(function WarehouseHangingLights({ wh }) {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9, roughness: 0.2 }), [])
  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfff8d0, emissive: 0xfff8d0, emissiveIntensity: 1.8 }), [])
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.85, roughness: 0.25 }), [])

  const lights = useMemo(() => {
    const items = []
    for (let lz = -wh.depth / 2 + 12; lz < wh.depth / 2 - 8; lz += 18) {
      [-wh.width * 0.2, wh.width * 0.2].forEach(lx => {
        items.push({ lx, lz })
      })
    }
    return items
  }, [wh.width, wh.depth])

  return (
    <group>
      {lights.map(({ lx, lz }, i) => (
        <group key={i}>
          {/* Housing */}
          <mesh position={[lx, WALL_HEIGHT - 2.5, lz]} material={bodyMat}>
            <boxGeometry args={[4, 0.5, 1.5]} />
          </mesh>
          {/* Reflector */}
          <mesh position={[lx, WALL_HEIGHT - 3.5, lz]} rotation={[Math.PI, 0, 0]} material={bodyMat}>
            <coneGeometry args={[2, 1.5, 8]} />
          </mesh>
          {/* Glow tube */}
          <mesh position={[lx, WALL_HEIGHT - 3, lz]} material={glowMat}>
            <boxGeometry args={[3, 0.15, 0.4]} />
          </mesh>
          {/* Wire */}
          <mesh position={[lx, WALL_HEIGHT - 1.2, lz]} material={wireMat}>
            <cylinderGeometry args={[0.04, 0.04, 2.5, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})
