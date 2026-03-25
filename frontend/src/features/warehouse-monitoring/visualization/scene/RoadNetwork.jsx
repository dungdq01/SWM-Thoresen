import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { buildRoadNetwork } from '../../data/roadNetwork'

export const RoadNetwork = memo(function RoadNetwork() {
  const network = useMemo(() => buildRoadNetwork(), [])
  const roadWidth = 18

  const roadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x151f2e, roughness: 0.85 }), [])
  const markMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.25 }), [])
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x4a5568, emissive: 0x4a5568, emissiveIntensity: 0.1 }), [])

  const minZ = Math.min(...network.hRoads)
  const maxZ = Math.max(...network.hRoads)
  const vLen = maxZ - minZ

  return (
    <group>
      {/* Horizontal roads */}
      {network.hRoads.map((z, i) => (
        <group key={`h-${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, z]} receiveShadow material={roadMat}>
            <planeGeometry args={[700, roadWidth]} />
          </mesh>
          {/* Single center line instead of dashes — far fewer meshes */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, z]} material={markMat}>
            <planeGeometry args={[680, 1]} />
          </mesh>
          {/* Edge lines */}
          {[-roadWidth / 2, roadWidth / 2].map((dz, j) => (
            <mesh key={`he-${i}-${j}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, z + dz]} material={edgeMat}>
              <planeGeometry args={[700, 0.8]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Vertical roads */}
      {network.vRoads.map((x, i) => (
        <group key={`v-${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.1, (maxZ + minZ) / 2]} receiveShadow material={roadMat}>
            <planeGeometry args={[roadWidth, vLen]} />
          </mesh>
          {/* Single center line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.15, (maxZ + minZ) / 2]} material={markMat}>
            <planeGeometry args={[1, vLen - 10]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})
