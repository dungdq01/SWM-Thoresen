import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, ROOF_PEAK, ROOF_OVERHANG } from '../../data/warehouseData'

export const WarehouseRoof = memo(function WarehouseRoof({ wh, heatmapColor }) {
  const rW = wh.width / 2 + ROOF_OVERHANG
  const rD = wh.depth / 2 + ROOF_OVERHANG

  const roofGeo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-rW, 0)
    shape.lineTo(0, ROOF_PEAK)
    shape.lineTo(rW, 0)
    shape.lineTo(-rW, 0)
    return new THREE.ExtrudeGeometry(shape, { depth: rD * 2, bevelEnabled: false })
  }, [rW, rD])

  const roofColor = useMemo(() => {
    return new THREE.Color(heatmapColor || wh.color).offsetHSL(0, -0.1, -0.22)
  }, [wh.color, heatmapColor])

  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: roofColor, roughness: 0.65, metalness: 0.2, side: THREE.DoubleSide
  }), [roofColor])

  const gutterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.3 }), [])

  return (
    <group>
      <mesh geometry={roofGeo} material={roofMat} rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, rD]} castShadow />
      {/* Gutters */}
      {[-rD, rD].map(gz => (
        <mesh key={gz} position={[0, WALL_HEIGHT + 0.3, gz]} material={gutterMat}>
          <boxGeometry args={[rW * 2, 0.6, 1]} />
        </mesh>
      ))}
    </group>
  )
})
