import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const WarehouseExterior = memo(function WarehouseExterior({ wh }) {
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7 }), [])
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfff5b0, emissive: 0xfff5b0, emissiveIntensity: 1.5 }), [])

  return (
    <group>
      {[-wh.width / 2 - 4, wh.width / 2 + 4].map(lx => (
        <group key={lx}>
          <mesh position={[lx, 6, wh.depth / 2 + 3]} material={poleMat}>
            <cylinderGeometry args={[0.3, 0.4, 12, 6]} />
          </mesh>
          <mesh position={[lx, 12, wh.depth / 2 + 3]} material={lampMat}>
            <sphereGeometry args={[1, 6, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})
