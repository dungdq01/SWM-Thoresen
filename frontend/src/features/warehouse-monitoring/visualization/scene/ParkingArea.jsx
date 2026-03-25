import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const ParkingArea = memo(function ParkingArea() {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0f1a28, roughness: 0.88 }), [])
  const lineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x4a5568 }), [])

  return (
    <group position={[-380, 0, -50]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} material={floorMat}>
        <planeGeometry args={[100, 120]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.12, -50 + i * 15]}
          material={lineMat}
        >
          <planeGeometry args={[70, 0.6]} />
        </mesh>
      ))}
    </group>
  )
})
