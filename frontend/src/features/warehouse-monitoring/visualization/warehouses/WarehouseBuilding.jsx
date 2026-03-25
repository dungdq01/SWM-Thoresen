import { memo, useMemo, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'
import { WALL_HEIGHT, WALL_THICK, DOOR_WIDTH, DOOR_HEIGHT, ROOF_PEAK, ROOF_OVERHANG } from '../../data/warehouseData'
import { WarehouseRoof } from './WarehouseRoof'
import { WarehouseInterior } from './WarehouseInterior'
import { WarehouseZones } from './WarehouseZones'
import { WarehouseInventory } from './WarehouseInventory'
import { WarehouseDoorFrames } from './WarehouseDoorFrames'
import { WarehouseExterior } from './WarehouseExterior'
import { WarehouseLabel } from './WarehouseLabel'
import { WarehouseShelvingRacks } from './WarehouseShelvingRacks'

export const WarehouseBuilding = memo(function WarehouseBuilding({ wh, index, isHovered, isSelected, heatmapActive, showLabels, showRoof }) {
  const { actions } = useWarehouse3D()
  const groupRef = useRef()

  const heatmapColor = useMemo(() => {
    if (!heatmapActive) return null
    if (wh.fill >= 90) return 0xef4444
    if (wh.fill >= 75) return 0xf59e0b
    if (wh.fill >= 50) return 0x3b82f6
    return 0x10b981
  }, [heatmapActive, wh.fill])

  const wallColor = useMemo(() => {
    const base = new THREE.Color(heatmapColor || wh.color)
    return base.clone().offsetHSL(0, -0.05, -0.15)
  }, [wh.color, heatmapColor])

  const wallTopColor = useMemo(() => {
    return new THREE.Color(heatmapColor || wh.color)
  }, [wh.color, heatmapColor])

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7, metalness: 0.2 }), [wallColor])
  const wallTopMat = useMemo(() => new THREE.MeshStandardMaterial({ color: wallTopColor, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.55 }), [wallTopColor])
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x38bdf8, emissiveIntensity: 0.15, transparent: true, opacity: 0.35 }), [])

  const edgeOpacity = isHovered || isSelected ? 0.9 : 0.18
  const edgeColor = isHovered || isSelected ? 0xffffff : (heatmapColor || wh.color)

  const doorCenterL = -wh.width * 0.26
  const doorCenterR = wh.width * 0.26

  // Window positions along side walls — limit to 3 max
  const windowPositions = useMemo(() => {
    const count = Math.min(3, Math.floor(wh.depth / 25))
    const positions = []
    for (let i = 0; i < count; i++) {
      const wz = -wh.depth / 2 + 15 + i * (wh.depth - 20) / Math.max(1, count - 1)
      positions.push(wz)
    }
    return positions
  }, [wh.depth])

  // Front/back wall segments (with door openings)
  const wallSegments = useMemo(() => {
    return [
      { from: -wh.width / 2, to: doorCenterL - DOOR_WIDTH / 2 },
      { from: doorCenterL + DOOR_WIDTH / 2, to: doorCenterR - DOOR_WIDTH / 2 },
      { from: doorCenterR + DOOR_WIDTH / 2, to: wh.width / 2 },
    ]
  }, [wh.width, doorCenterL, doorCenterR])

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    actions.setHoveredWh(index)
  }, [actions, index])

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation()
    actions.setHoveredWh(null)
  }, [actions])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    actions.setSelectedWh(index)
  }, [actions, index])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    actions.openModal(index)
  }, [actions, index])

  const bandH = 5

  return (
    <group ref={groupRef} position={wh.pos}>
      {/* Invisible hit-box for raycasting */}
      <mesh
        position={[0, WALL_HEIGHT / 2, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        visible={false}
      >
        <boxGeometry args={[wh.width, WALL_HEIGHT, wh.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Side walls — only castShadow, no receiveShadow on small walls */}
      <mesh position={[-wh.width / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
        <boxGeometry args={[WALL_THICK, WALL_HEIGHT, wh.depth]} />
      </mesh>
      <mesh position={[wh.width / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
        <boxGeometry args={[WALL_THICK, WALL_HEIGHT, wh.depth]} />
      </mesh>

      {/* Front & Back walls with door openings */}
      {[wh.depth / 2, -wh.depth / 2].map((faceZ, faceIdx) => (
        <group key={faceIdx}>
          {wallSegments.map((seg, segIdx) => {
            const segW = seg.to - seg.from
            if (segW <= 1) return null
            return (
              <mesh key={segIdx} position={[(seg.from + seg.to) / 2, WALL_HEIGHT / 2, faceZ]} castShadow material={wallMat}>
                <boxGeometry args={[segW, WALL_HEIGHT, WALL_THICK]} />
              </mesh>
            )
          })}
          {/* Door lintels */}
          {[doorCenterL, doorCenterR].map((cx, di) => {
            const lintelH = WALL_HEIGHT - DOOR_HEIGHT
            if (lintelH <= 0) return null
            return (
              <mesh key={`lintel-${faceIdx}-${di}`} position={[cx, DOOR_HEIGHT + lintelH / 2, faceZ]} material={wallMat}>
                <boxGeometry args={[DOOR_WIDTH, lintelH, WALL_THICK]} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* Windows on side walls */}
      {windowPositions.map((wz, wi) => (
        <group key={wi}>
          <mesh position={[-wh.width / 2 - 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, Math.PI / 2, 0]} material={windowMat}>
            <planeGeometry args={[8, 5]} />
          </mesh>
          <mesh position={[wh.width / 2 + 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, -Math.PI / 2, 0]} material={windowMat}>
            <planeGeometry args={[8, 5]} />
          </mesh>
        </group>
      ))}

      {/* Upper transparent band — 2 sides only (front/back) */}
      {[
        { w: wh.width + 0.5, d: 0.4, px: 0, pz: -wh.depth / 2 },
        { w: wh.width + 0.5, d: 0.4, px: 0, pz: wh.depth / 2 },
      ].map((b, i) => (
        <mesh key={`band-${i}`} position={[b.px, WALL_HEIGHT + 0.5, b.pz]} material={wallTopMat}>
          <boxGeometry args={[b.w, bandH, b.d]} />
        </mesh>
      ))}

      {/* Concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <planeGeometry args={[wh.width - 2, wh.depth - 2]} />
        <meshStandardMaterial color={0x1c2a3a} roughness={0.88} />
      </mesh>

      {/* Sub-components */}
      {showRoof && <WarehouseRoof wh={wh} heatmapColor={heatmapColor} />}
      <WarehouseInterior wh={wh} />
      <WarehouseZones wh={wh} />
      <WarehouseInventory wh={wh} />
      <WarehouseDoorFrames wh={wh} />
      <WarehouseExterior wh={wh} />
      {showLabels && <WarehouseLabel wh={wh} />}
      <WarehouseShelvingRacks wh={wh} />

      {/* Edge wireframe glow */}
      <lineSegments position={[0, WALL_HEIGHT / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(wh.width + 1.5, WALL_HEIGHT + 1.5, wh.depth + 1.5)]} />
        <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
      </lineSegments>
    </group>
  )
})
