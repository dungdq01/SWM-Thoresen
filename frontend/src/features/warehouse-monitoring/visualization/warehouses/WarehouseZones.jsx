import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { ZONE_COLORS } from '../../data/warehouseData'

export const WarehouseZones = memo(function WarehouseZones({ wh }) {
  const zonesPerRow = Math.ceil(Math.sqrt(wh.zones))
  const zonesRows = Math.ceil(wh.zones / zonesPerRow)
  const usableW = wh.width - 10
  const usableD = wh.depth - 10
  const zoneW = usableW / zonesPerRow
  const zoneD = usableD / zonesRows

  const zones = useMemo(() => {
    const items = []
    for (let z = 0; z < wh.zones; z++) {
      const col = z % zonesPerRow
      const row = Math.floor(z / zonesPerRow)
      const cx = -usableW / 2 + zoneW * col + zoneW / 2
      const cz = -usableD / 2 + zoneD * row + zoneD / 2
      const color = ZONE_COLORS[z % ZONE_COLORS.length]
      items.push({ cx, cz, color, index: z })
    }
    return items
  }, [wh.zones, zonesPerRow, zonesRows, usableW, usableD, zoneW, zoneD])

  return (
    <group>
      {zones.map(({ cx, cz, color, index }) => {
        const hw = (zoneW - 3) / 2
        const hd = (zoneD - 3) / 2
        return (
          <group key={index}>
            {/* Zone floor marking */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.1, cz]}>
              <planeGeometry args={[zoneW - 3, zoneD - 3]} />
              <meshStandardMaterial color={color} transparent opacity={0.2} emissive={color} emissiveIntensity={0.06} />
            </mesh>
            {/* Border tape - 4 sides */}
            {[
              [0, -hd, hw * 2, 0.5],
              [0, hd, hw * 2, 0.5],
              [-hw, 0, 0.5, hd * 2],
              [hw, 0, 0.5, hd * 2],
            ].map(([tx, tz, tw, td], ti) => (
              <mesh key={ti} rotation={[-Math.PI / 2, 0, 0]} position={[cx + tx, 0.12, cz + tz]}>
                <planeGeometry args={[tw, td]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
})
