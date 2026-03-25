import { memo, useMemo } from 'react'
import * as THREE from 'three'

export const WarehouseShelvingRacks = memo(function WarehouseShelvingRacks({ wh }) {
  const hasRacks = wh.type.includes('Pallet') || wh.type.includes('Container') || wh.type.includes('VAS')

  const rackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7, roughness: 0.4 }), [])

  const racks = useMemo(() => {
    if (!hasRacks) return []
    const items = []
    const rackCount = Math.min(2, Math.floor(wh.width / 30))
    for (let ri = 0; ri < rackCount; ri++) {
      const rx = -wh.width / 2 + 15 + ri * (wh.width - 20) / Math.max(1, rackCount - 1)
      for (let rz = -wh.depth / 2 + 8; rz < wh.depth / 2 - 8; rz += wh.depth / 3) {
        items.push({ rx, rz })
      }
    }
    return items
  }, [wh.width, wh.depth, hasRacks])

  if (!hasRacks) return null

  return (
    <group>
      {racks.map(({ rx, rz }, i) => (
        <group key={i}>
          <mesh position={[rx, 7, rz]} material={rackMat}>
            <boxGeometry args={[0.6, 14, 0.6]} />
          </mesh>
          {[4, 10].map(bh => (
            <mesh key={bh} position={[rx, bh, rz]} material={rackMat}>
              <boxGeometry args={[0.4, 0.3, wh.depth / 5]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
})
