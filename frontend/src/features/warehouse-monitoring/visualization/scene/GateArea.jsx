import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const GateArea = memo(function GateArea({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const gateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.8, roughness: 0.25 }), [])
  const signMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6 }), [])
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 }), [])
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 3 }), [])

  return (
    <group position={position} rotation={rotation}>
      {/* Pillars */}
      {[-20, 20].map(dx => (
        <mesh key={dx} position={[dx, 12, 0]} castShadow material={gateMat}>
          <boxGeometry args={[3, 24, 3]} />
        </mesh>
      ))}
      {/* Top bar */}
      <mesh position={[0, 24, 0]} material={gateMat}>
        <boxGeometry args={[40, 2.5, 2.5]} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 20, 1.5]} material={signMat}>
        <planeGeometry args={[24, 7]} />
      </mesh>
      {/* Barrier arm */}
      <mesh position={[8, 14, 0]} material={armMat}>
        <boxGeometry args={[16, 0.6, 0.6]} />
      </mesh>
      {/* Green light (emissive only) */}
      <mesh position={[-20, 26, 0]} material={lightMat}>
        <sphereGeometry args={[0.8, 6, 6]} />
      </mesh>
    </group>
  )
})
