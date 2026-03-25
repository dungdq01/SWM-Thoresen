import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, DOOR_WIDTH, DOOR_HEIGHT } from '../../data/warehouseData'

export const WarehouseDoorFrames = memo(function WarehouseDoorFrames({ wh }) {
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.85, roughness: 0.25 }), [])
  const rampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8, metalness: 0.2 }), [])

  const statusColor = wh.fill >= 90 ? 0xef4444 : wh.fill >= 70 ? 0xf59e0b : 0x10b981
  const statusMat = useMemo(() => new THREE.MeshStandardMaterial({ color: statusColor, emissive: statusColor, emissiveIntensity: 2.5 }), [statusColor])

  const doorCenterL = -wh.width * 0.26
  const doorCenterR = wh.width * 0.26

  // Only render front face doors for performance (back face barely visible)
  const faceZ = wh.depth / 2
  const offset = 1.0

  return (
    <group>
      {[doorCenterL, doorCenterR].map((cx, di) => (
        <group key={di}>
          {/* Side posts */}
          {[-DOOR_WIDTH / 2 - 0.5, DOOR_WIDTH / 2 + 0.5].map(dx => (
            <mesh key={dx} position={[cx + dx, (DOOR_HEIGHT + 1) / 2, faceZ + offset]} material={frameMat}>
              <boxGeometry args={[1, DOOR_HEIGHT + 1, 1.8]} />
            </mesh>
          ))}
          {/* Top beam */}
          <mesh position={[cx, DOOR_HEIGHT + 0.6, faceZ + offset]} material={frameMat}>
            <boxGeometry args={[DOOR_WIDTH + 2.5, 1.2, 1.8]} />
          </mesh>
          {/* Status light (emissive only) */}
          <mesh position={[cx, DOOR_HEIGHT + 2.5, faceZ + offset]} material={statusMat}>
            <sphereGeometry args={[0.7, 6, 6]} />
          </mesh>
          {/* Ramp */}
          <mesh position={[cx, 0.2, faceZ + offset * 3]} material={rampMat}>
            <boxGeometry args={[DOOR_WIDTH + 3, 0.4, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})
