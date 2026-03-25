import { memo, useMemo } from 'react'
import * as THREE from 'three'

// Simple seeded random for consistent rendering
function seededRandom(seed) {
  let s = seed
  return function() {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PILE_COLORS = [0x8b6914, 0x6b5a2e, 0x7a6633, 0x5c4b28, 0x9e8542, 0x736028]
const CONTAINER_COLORS = [0x2563eb, 0xdc2626, 0xd97706, 0x059669, 0x7c3aed, 0x0369a1]

export const WarehouseInventory = memo(function WarehouseInventory({ wh }) {
  const isBulk = wh.type.includes('Bulk') || wh.type.includes('rời') || wh.type.includes('Clinker') || wh.type.includes('hỗn hợp')
  const isContainer = wh.type.includes('Container')
  const isPallet = wh.type.includes('Pallet')
  const isJumbo = wh.type.includes('Jumbo')
  const isVAS = wh.type.includes('VAS') || wh.type.includes('đóng bao')

  const zonesPerRow = Math.ceil(Math.sqrt(wh.zones))
  const zonesRows = Math.ceil(wh.zones / zonesPerRow)
  const usableW = wh.width - 10
  const usableD = wh.depth - 10
  const zoneW = usableW / zonesPerRow
  const zoneD = usableD / zonesRows

  // Generate stacks — cap at 2 per zone for performance
  const stacks = useMemo(() => {
    const items = []
    const rand = seededRandom(wh.code.charCodeAt(2) * 1000 + wh.fill)

    for (let z = 0; z < wh.zones; z++) {
      const col = z % zonesPerRow
      const row = Math.floor(z / zonesPerRow)
      const zoneCX = -usableW / 2 + zoneW * col + zoneW / 2
      const zoneCZ = -usableD / 2 + zoneD * row + zoneD / 2
      const fillPct = Math.max(0.15, Math.min(1, (wh.fill / 100) * (0.65 + rand() * 0.55)))
      const stackMaxH = fillPct * 16
      const stackCount = Math.min(2, Math.max(1, Math.floor(fillPct * 3)))
      const innerMargin = 3

      for (let s = 0; s < stackCount; s++) {
        const sW = 4 + rand() * 4
        const sD = 4 + rand() * 4
        const sx = zoneCX - zoneW / 2 + innerMargin + rand() * (zoneW - sW - innerMargin * 2)
        const sz = zoneCZ - zoneD / 2 + innerMargin + rand() * (zoneD - sD - innerMargin * 2)
        const sH = stackMaxH * (0.5 + rand() * 0.5)

        items.push({ fillPct, sW, sD, sx, sz, sH, rand: rand() })
      }
    }
    return items
  }, [wh])

  // Shared materials per type — reuse across all stacks
  const bulkMat = useMemo(() => {
    const color = PILE_COLORS[wh.code.charCodeAt(3) % PILE_COLORS.length]
    return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 })
  }, [wh.code])
  const jumboMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xe8dfc5, roughness: 0.8, metalness: 0.05 }), [])
  const palletBaseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.92 }), [])
  const palletBoxMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xc4b896, roughness: 0.82 }), [])
  const vasMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xd4c5a0, roughness: 0.85 }), [])

  if (isBulk) {
    return (
      <group>
        {stacks.map(({ sx, sz, sH, sW, rand: r }, i) => (
          <mesh key={i} position={[sx, sH / 2, sz]} castShadow material={bulkMat}>
            <cylinderGeometry args={[sW * 0.2, sW * (0.6 + r * 0.15), sH, 8]} />
          </mesh>
        ))}
      </group>
    )
  }

  if (isContainer) {
    return (
      <group>
        {stacks.map(({ sx, sz, sW, sD, rand: r }, i) => {
          const levels = 1 + Math.floor(r * 2)
          const contW = sW * 1.6
          const contD = sD * 2
          const contH = 3.2
          const color = CONTAINER_COLORS[Math.floor(r * CONTAINER_COLORS.length)]
          return (
            <group key={i}>
              {Array.from({ length: levels }, (_, lv) => (
                <mesh key={lv} position={[sx, contH / 2 + lv * (contH + 0.2), sz]} castShadow>
                  <boxGeometry args={[contW, contH, contD]} />
                  <meshStandardMaterial color={lv === 0 ? color : CONTAINER_COLORS[(Math.floor(r * 6) + lv) % CONTAINER_COLORS.length]} roughness={0.45} metalness={0.75} />
                </mesh>
              ))}
            </group>
          )
        })}
      </group>
    )
  }

  if (isPallet) {
    return (
      <group>
        {stacks.map(({ sx, sz, sW, sD, fillPct }, i) => {
          const layers = 1 + Math.floor(fillPct * 2)
          return (
            <group key={i}>
              <mesh position={[sx, 0.2, sz]} material={palletBaseMat}>
                <boxGeometry args={[sW + 1, 0.4, sD + 1]} />
              </mesh>
              <mesh position={[sx, 0.4 + (layers * 2.5) / 2, sz]} castShadow material={palletBoxMat}>
                <boxGeometry args={[sW * 0.95, layers * 2.5, sD * 0.95]} />
              </mesh>
            </group>
          )
        })}
      </group>
    )
  }

  if (isJumbo) {
    return (
      <group>
        {stacks.map(({ sx, sz, sH, sW }, i) => {
          const bagR = sW * 0.4
          const bagH = sH * 0.85
          return (
            <mesh key={i} position={[sx, bagH / 2, sz]} castShadow material={jumboMat}>
              <cylinderGeometry args={[bagR * 0.85, bagR, bagH, 8]} />
            </mesh>
          )
        })}
      </group>
    )
  }

  if (isVAS) {
    return (
      <group>
        {stacks.map(({ sx, sz, sW, sD, rand: r }, i) => {
          const layers = 2 + Math.floor(r * 3)
          return (
            <mesh key={i} position={[sx, 0.6 + (layers * 1.3) / 2, sz]} castShadow material={vasMat}>
              <boxGeometry args={[sW * 0.85, layers * 1.3, sD * 0.85]} />
            </mesh>
          )
        })}
      </group>
    )
  }

  // Default: single box per stack
  return (
    <group>
      {stacks.map(({ sx, sz, sW, sD, sH }, i) => (
        <mesh key={i} position={[sx, sH / 2, sz]} castShadow material={vasMat}>
          <boxGeometry args={[sW, sH, sD]} />
        </mesh>
      ))}
    </group>
  )
})
