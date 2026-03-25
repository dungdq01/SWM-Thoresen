import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const Truck = memo(function Truck({ color = 0x1e3a5f }) {
  const cargoMat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.55 }), [color])
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, -0.08), metalness: 0.6 }), [color])
  const cabMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0.05, 0.08), roughness: 0.55, metalness: 0.6 }), [color])
  const windshieldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1e3a5f, emissive: 0x1a3050, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 }), [])
  const wheelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.75, metalness: 0.3 }), [])
  const hubMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9 }), [])
  const hlMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfff8c0, emissive: 0xfff8c0, emissiveIntensity: 2.5 }), [])
  const tlMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 }), [])
  const exhaustMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 }), [])
  const mirrorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 }), [])

  return (
    <group>
      {/* Cargo body */}
      <mesh position={[0, 2.8, 2]} castShadow receiveShadow material={cargoMat}>
        <boxGeometry args={[6, 4.5, 14]} />
      </mesh>
      {/* Side panel detail lines */}
      {[-3.1, 3.1].map(sx =>
        [-4, 0, 4, 8].map(pz => (
          <mesh key={`${sx}-${pz}`} position={[sx, 2.8, pz]} rotation={[0, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={panelMat}>
            <planeGeometry args={[3.5, 0.15]} />
          </mesh>
        ))
      )}
      {/* Cab */}
      <mesh position={[0, 4.3, -5.2]} castShadow material={cabMat}>
        <boxGeometry args={[6, 4.5, 5.5]} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 5, -8]} material={windshieldMat}>
        <planeGeometry args={[5, 3]} />
      </mesh>
      {/* Front wheels */}
      {[[-3.5, 0.9, -6], [3.5, 0.9, -6]].map(([wx, wy, wz]) => (
        <group key={`fw-${wx}`}>
          <mesh position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
            <cylinderGeometry args={[0.9, 0.9, 0.7, 14]} />
          </mesh>
          <mesh position={[wx > 0 ? wx + 0.36 : wx - 0.36, wy, wz]} rotation={[0, wx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={hubMat}>
            <circleGeometry args={[0.5, 8]} />
          </mesh>
        </group>
      ))}
      {/* Rear dual wheels */}
      {[3, 7].map(z1 =>
        [[-3.5, 0.9, z1], [3.5, 0.9, z1]].map(([wx, wy, wz]) => (
          <group key={`rw-${wx}-${wz}`}>
            <mesh position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
              <cylinderGeometry args={[0.9, 0.9, 0.7, 14]} />
            </mesh>
            <mesh position={[wx > 0 ? wx + 0.75 : wx - 0.75, wy, wz]} rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
              <cylinderGeometry args={[0.9, 0.9, 0.7, 14]} />
            </mesh>
          </group>
        ))
      )}
      {/* Headlights */}
      {[[-2.2, 4, -8], [2.2, 4, -8]].map(([lx, ly, lz]) => (
        <mesh key={`hl-${lx}`} position={[lx, ly, lz]} material={hlMat}>
          <sphereGeometry args={[0.45, 8, 8]} />
        </mesh>
      ))}
      {/* Tail lights */}
      {[[-2.5, 2, 9.2], [2.5, 2, 9.2]].map(([lx, ly, lz]) => (
        <mesh key={`tl-${lx}`} position={[lx, ly, lz]} material={tlMat}>
          <boxGeometry args={[0.8, 0.6, 0.2]} />
        </mesh>
      ))}
      {/* Exhaust */}
      <mesh position={[3.3, 3.5, -2]} material={exhaustMat}>
        <cylinderGeometry args={[0.25, 0.3, 3, 8]} />
      </mesh>
      {/* Side mirrors */}
      {[-3.3, 3.3].map(mx => (
        <mesh key={`m-${mx}`} position={[mx, 5.5, -7]} material={mirrorMat}>
          <boxGeometry args={[0.6, 0.8, 0.15]} />
        </mesh>
      ))}
    </group>
  )
})
