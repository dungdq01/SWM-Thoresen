import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, ROOF_OVERHANG } from '../../data/warehouseData'

export const WarehouseRoof = memo(function WarehouseRoof({ wh, heatmapColor }) {
  const overhang = ROOF_OVERHANG
  const roofW = wh.width + overhang * 2
  const roofD = wh.depth + overhang * 2
  const roofThick = 1.5
  const roofY = WALL_HEIGHT + roofThick / 2

  const roofColor = useMemo(() => {
    return new THREE.Color(heatmapColor || wh.color).offsetHSL(0, -0.08, -0.18)
  }, [wh.color, heatmapColor])

  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: roofColor, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide
  }), [roofColor])

  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x64748b, metalness: 0.6, roughness: 0.3
  }), [])

  const edgeH = 1.2
  const edgeThick = 0.8

  return (
    <group>
      {/* Flat roof slab */}
      <mesh position={[0, roofY, 0]} material={roofMat} castShadow receiveShadow>
        <boxGeometry args={[roofW, roofThick, roofD]} />
      </mesh>

      {/* Edge trims — 4 sides */}
      {/* Front */}
      <mesh position={[0, roofY + roofThick / 2 + edgeH / 2, -roofD / 2 + edgeThick / 2]} material={edgeMat}>
        <boxGeometry args={[roofW, edgeH, edgeThick]} />
      </mesh>
      {/* Back */}
      <mesh position={[0, roofY + roofThick / 2 + edgeH / 2, roofD / 2 - edgeThick / 2]} material={edgeMat}>
        <boxGeometry args={[roofW, edgeH, edgeThick]} />
      </mesh>
      {/* Left */}
      <mesh position={[-roofW / 2 + edgeThick / 2, roofY + roofThick / 2 + edgeH / 2, 0]} material={edgeMat}>
        <boxGeometry args={[edgeThick, edgeH, roofD]} />
      </mesh>
      {/* Right */}
      <mesh position={[roofW / 2 - edgeThick / 2, roofY + roofThick / 2 + edgeH / 2, 0]} material={edgeMat}>
        <boxGeometry args={[edgeThick, edgeH, roofD]} />
      </mesh>
    </group>
  )
})
