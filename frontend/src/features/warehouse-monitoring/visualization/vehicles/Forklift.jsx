import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const Forklift = memo(function Forklift() {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, metalness: 0.45 }), [])
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.5 }), [])
  const pillarMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 }), [])
  const mastMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.85, roughness: 0.3 }), [])
  const forkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.25 }), [])
  const wheelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }), [])
  const beaconMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2 }), [])
  const cwMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.6 }), [])

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 1.8, 0]} castShadow material={bodyMat}>
        <boxGeometry args={[3, 2.5, 4]} />
      </mesh>
      {/* Cab roof */}
      <mesh position={[0, 3.4, 0]} material={roofMat}>
        <boxGeometry args={[3.2, 0.3, 4.2]} />
      </mesh>
      {/* Cab pillars */}
      {[[-1.4, -1.8], [1.4, -1.8], [-1.4, 1.8], [1.4, 1.8]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 2.5, pz]} material={pillarMat}>
          <boxGeometry args={[0.2, 1.5, 0.2]} />
        </mesh>
      ))}
      {/* Fork masts */}
      <mesh position={[-0.8, 2, 2.5]} material={mastMat}>
        <boxGeometry args={[0.3, 4, 0.3]} />
      </mesh>
      <mesh position={[0.8, 2, 2.5]} material={mastMat}>
        <boxGeometry args={[0.3, 4, 0.3]} />
      </mesh>
      {/* Tines */}
      {[-0.6, 0.6].map(fx => (
        <mesh key={fx} position={[fx, 0.5, 3.5]} material={forkMat}>
          <boxGeometry args={[0.3, 0.15, 2]} />
        </mesh>
      ))}
      {/* Backrest */}
      <mesh position={[0, 1.8, 2.5]} material={forkMat}>
        <boxGeometry args={[2, 2.5, 0.15]} />
      </mesh>
      {/* Wheels */}
      {[[-1.5, 0.5, -1.5], [1.5, 0.5, -1.5], [-1.5, 0.5, 1.2], [1.5, 0.5, 1.2]].map(([wx, wy, wz], i) => (
        <mesh key={i} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
          <cylinderGeometry args={[0.5, 0.5, 0.5, 10]} />
        </mesh>
      ))}
      {/* Beacon */}
      <mesh position={[0, 3.7, 0]} material={beaconMat}>
        <cylinderGeometry args={[0.2, 0.3, 0.5, 8]} />
      </mesh>
      {/* Counterweight */}
      <mesh position={[0, 1.5, -2.5]} castShadow material={cwMat}>
        <boxGeometry args={[2.8, 1.5, 1.5]} />
      </mesh>
    </group>
  )
})
