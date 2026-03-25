import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const WeighbridgeStation = memo(function WeighbridgeStation({ position = [0, 0, 0] }) {
  const platformMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 }), [])
  const stripeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.2 }), [])
  const boothMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.5, roughness: 0.3 }), [])
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.4, transparent: true, opacity: 0.6 }), [])
  const statusMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 3 }), [])
  const displayMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0f0f0f, emissive: 0x10b981, emissiveIntensity: 0.5 }), [])

  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.5, 0]} castShadow material={platformMat}>
        <boxGeometry args={[22, 1.0, 10]} />
      </mesh>
      {/* Safety stripes */}
      {[-11, 11].map(sx => (
        <mesh key={sx} position={[sx, 0.6, 0]} material={stripeMat}>
          <boxGeometry args={[0.5, 1.2, 10]} />
        </mesh>
      ))}
      {/* Control booth */}
      <mesh position={[16, 5, 0]} castShadow material={boothMat}>
        <boxGeometry args={[7, 10, 7]} />
      </mesh>
      {/* Window */}
      <mesh position={[16, 7, 3.6]} material={windowMat}>
        <planeGeometry args={[4, 3]} />
      </mesh>
      {/* Status light (emissive only) */}
      <mesh position={[16, 11, 0]} material={statusMat}>
        <sphereGeometry args={[1.0, 6, 6]} />
      </mesh>
      {/* Digital display */}
      <mesh position={[16, 8.5, -3.6]} rotation={[0, Math.PI, 0]} material={displayMat}>
        <planeGeometry args={[5, 2]} />
      </mesh>
    </group>
  )
})
