/**
 * LocationBuilding3D — Full-featured 3D building for each Location.
 * Supports configurable door positions via doorConfig.
 *
 * doorConfig format: { doors: [{ wall: 'front' }, { wall: 'back' }, ...] }
 * wall values: 'front' (-Z), 'back' (+Z), 'left' (-X), 'right' (+X)
 * Default: 1 door on front wall.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

// ==================== Scale-adapted constants ====================

function computeBuildingParams(widthM, depthM) {
  const minDim = Math.min(widthM, depthM)
  const wallH = Math.min(8, Math.max(2, minDim * 0.6))
  const wallThick = Math.max(0.08, wallH * 0.04)
  const roofThick = Math.max(0.08, wallH * 0.06)
  const roofOverhang = Math.max(0.15, minDim * 0.04)
  const roofEdgeH = Math.max(0.06, wallH * 0.04)
  const roofEdgeThick = Math.max(0.04, wallH * 0.03)
  const frameThick = Math.max(0.05, wallThick * 0.6)

  return { wallH, wallThick, roofThick, roofOverhang, roofEdgeH, roofEdgeThick, frameThick }
}

/**
 * Parse doorConfig → Set of walls that have doors.
 * Returns { doorWalls: Set<string>, doorW, doorH } per wall axis.
 */
function parseDoorConfig(doorConfig, widthM, depthM, wallH) {
  const doors = Array.isArray(doorConfig?.doors) ? doorConfig.doors : [{ wall: 'front' }]
  const doorWalls = new Set(doors.map((d) => d.wall))

  // Door size depends on which wall it's on
  // front/back doors: proportional to widthM
  // left/right doors: proportional to depthM
  const doorWFront = Math.max(0.5, widthM * 0.3)
  const doorWside = Math.max(0.5, depthM * 0.3)
  const doorH = wallH * 0.68

  return { doorWalls, doorWFront, doorWside, doorH }
}

// ==================== Single Wall with optional door opening ====================

function WallSegment({ cx, cz, wallLen, wallH, wallThick, hasDoor, doorW, doorH, axis, wallMat }) {
  // axis: 'x' (front/back wall along X) or 'z' (left/right wall along Z)
  const sideW = (wallLen - doorW) / 2

  if (!hasDoor) {
    // Full solid wall
    const size = axis === 'x' ? [wallLen, wallH, wallThick] : [wallThick, wallH, wallLen]
    return (
      <mesh position={[cx, wallH / 2, cz]} castShadow material={wallMat}>
        <boxGeometry args={size} />
      </mesh>
    )
  }

  // Wall with door opening: 2 side pieces + lintel
  const lintelH = wallH - doorH
  const pieces = []

  if (sideW > 0.05) {
    if (axis === 'x') {
      // Left piece
      pieces.push(
        <mesh key="l" position={[cx - wallLen / 2 + sideW / 2, wallH / 2, cz]} castShadow material={wallMat}>
          <boxGeometry args={[sideW, wallH, wallThick]} />
        </mesh>
      )
      // Right piece
      pieces.push(
        <mesh key="r" position={[cx + wallLen / 2 - sideW / 2, wallH / 2, cz]} castShadow material={wallMat}>
          <boxGeometry args={[sideW, wallH, wallThick]} />
        </mesh>
      )
    } else {
      // Left piece (along Z)
      pieces.push(
        <mesh key="l" position={[cx, wallH / 2, cz - wallLen / 2 + sideW / 2]} castShadow material={wallMat}>
          <boxGeometry args={[wallThick, wallH, sideW]} />
        </mesh>
      )
      // Right piece
      pieces.push(
        <mesh key="r" position={[cx, wallH / 2, cz + wallLen / 2 - sideW / 2]} castShadow material={wallMat}>
          <boxGeometry args={[wallThick, wallH, sideW]} />
        </mesh>
      )
    }
  }

  // Lintel above door
  if (lintelH > 0.05) {
    const lintelSize = axis === 'x' ? [doorW, lintelH, wallThick] : [wallThick, lintelH, doorW]
    pieces.push(
      <mesh key="lintel" position={[cx, doorH + lintelH / 2, cz]} material={wallMat}>
        <boxGeometry args={lintelSize} />
      </mesh>
    )
  }

  return <group>{pieces}</group>
}

// ==================== Walls ====================

function BuildingWalls({ cx, cz, widthM, depthM, wallH, wallThick, doorWalls, doorWFront, doorWside, doorH, wallMat }) {
  const halfW = widthM / 2
  const halfD = depthM / 2

  return (
    <group>
      {/* Front wall (-Z) */}
      <WallSegment
        cx={cx} cz={cz - halfD} wallLen={widthM} wallH={wallH} wallThick={wallThick}
        hasDoor={doorWalls.has('front')} doorW={doorWFront} doorH={doorH}
        axis="x" wallMat={wallMat}
      />

      {/* Back wall (+Z) */}
      <WallSegment
        cx={cx} cz={cz + halfD} wallLen={widthM} wallH={wallH} wallThick={wallThick}
        hasDoor={doorWalls.has('back')} doorW={doorWFront} doorH={doorH}
        axis="x" wallMat={wallMat}
      />

      {/* Left wall (-X) */}
      <WallSegment
        cx={cx - halfW} cz={cz} wallLen={depthM} wallH={wallH} wallThick={wallThick}
        hasDoor={doorWalls.has('left')} doorW={doorWside} doorH={doorH}
        axis="z" wallMat={wallMat}
      />

      {/* Right wall (+X) */}
      <WallSegment
        cx={cx + halfW} cz={cz} wallLen={depthM} wallH={wallH} wallThick={wallThick}
        hasDoor={doorWalls.has('right')} doorW={doorWside} doorH={doorH}
        axis="z" wallMat={wallMat}
      />

      {/* Windows on walls without doors (for buildings > 5m) */}
      {widthM > 5 && !doorWalls.has('left') && !doorWalls.has('right') && (() => {
        const winCount = Math.min(3, Math.max(1, Math.floor(depthM / 5)))
        const winW = Math.max(0.4, depthM * 0.08)
        const winH = Math.max(0.3, wallH * 0.2)
        const winY = wallH * 0.72
        const windows = []
        for (let i = 0; i < winCount; i++) {
          const wz = cz - depthM / 2 + depthM * (i + 1) / (winCount + 1)
          windows.push(
            <group key={`win-${i}`}>
              <mesh position={[cx - halfW - 0.01, winY, wz]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[winW, winH]} />
                <meshStandardMaterial color={0x60a5fa} emissive={0x38bdf8} emissiveIntensity={0.15} transparent opacity={0.35} />
              </mesh>
              <mesh position={[cx + halfW + 0.01, winY, wz]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[winW, winH]} />
                <meshStandardMaterial color={0x60a5fa} emissive={0x38bdf8} emissiveIntensity={0.15} transparent opacity={0.35} />
              </mesh>
            </group>
          )
        }
        return windows
      })()}

      {/* Upper transparent band (front/back) */}
      {wallH > 3 && [
        { pz: cz - halfD, d: wallThick * 0.5 },
        { pz: cz + halfD, d: wallThick * 0.5 },
      ].map((b, i) => (
        <mesh key={`band-${i}`} position={[cx, wallH + wallH * 0.05, b.pz]}>
          <boxGeometry args={[widthM + wallThick, wallH * 0.15, b.d]} />
          <meshStandardMaterial color={wallMat.color} roughness={0.5} metalness={0.3} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ==================== Roof ====================

function BuildingRoof({ cx, cz, widthM, depthM, wallH, roofThick, roofOverhang, roofEdgeH, roofEdgeThick, roofMat }) {
  const roofW = widthM + roofOverhang * 2
  const roofD = depthM + roofOverhang * 2
  const roofY = wallH + roofThick / 2

  return (
    <group>
      <mesh position={[cx, roofY, cz]} castShadow receiveShadow material={roofMat}>
        <boxGeometry args={[roofW, roofThick, roofD]} />
      </mesh>
      {[
        { pos: [cx, roofY + roofThick / 2 + roofEdgeH / 2, cz - roofD / 2 + roofEdgeThick / 2], size: [roofW, roofEdgeH, roofEdgeThick] },
        { pos: [cx, roofY + roofThick / 2 + roofEdgeH / 2, cz + roofD / 2 - roofEdgeThick / 2], size: [roofW, roofEdgeH, roofEdgeThick] },
        { pos: [cx - roofW / 2 + roofEdgeThick / 2, roofY + roofThick / 2 + roofEdgeH / 2, cz], size: [roofEdgeThick, roofEdgeH, roofD] },
        { pos: [cx + roofW / 2 - roofEdgeThick / 2, roofY + roofThick / 2 + roofEdgeH / 2, cz], size: [roofEdgeThick, roofEdgeH, roofD] },
      ].map((e, i) => (
        <mesh key={`edge-${i}`} position={e.pos}>
          <boxGeometry args={e.size} />
          <meshStandardMaterial color={0x64748b} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ==================== Interior ====================

function BuildingInterior({ cx, cz, widthM, depthM, wallH }) {
  if (Math.min(widthM, depthM) <= 6) return null

  const colH = wallH * 0.95
  const colW = Math.max(0.1, wallH * 0.04)
  const colRows = Math.max(1, Math.floor(depthM / 8))
  const colSpacingZ = (depthM - 2) / (colRows + 1)
  const xPositions = widthM > 10
    ? [cx - widthM * 0.33, cx, cx + widthM * 0.33]
    : [cx]

  return (
    <group>
      {Array.from({ length: colRows }, (_, r) => {
        const pz = cz - depthM / 2 + (r + 1) * colSpacingZ
        return xPositions.map((px, ci) => (
          <group key={`col-${r}-${ci}`}>
            <mesh position={[px, colH / 2, pz]} castShadow>
              <boxGeometry args={[colW, colH, colW]} />
              <meshStandardMaterial color={0x6b7280} metalness={0.85} roughness={0.25} />
            </mesh>
            {ci < xPositions.length - 1 && (
              <mesh position={[(px + xPositions[ci + 1]) / 2, wallH - colW, pz]}>
                <boxGeometry args={[xPositions[ci + 1] - px, colW * 0.6, colW * 0.6]} />
                <meshStandardMaterial color={0x6b7280} metalness={0.85} roughness={0.25} />
              </mesh>
            )}
          </group>
        ))
      })}
    </group>
  )
}

// ==================== Single Door Frame ====================

function DoorFrame({ px, pz, doorW, doorH, frameThick, normalX, normalZ }) {
  // normalX/normalZ: outward-facing normal of the wall
  const offset = frameThick * 2
  const postW = Math.max(0.06, frameThick)
  const postH = doorH + postW
  const outX = normalX * offset
  const outZ = normalZ * offset

  // Door frame posts are perpendicular to the wall
  // For front/back walls (normalZ != 0): posts spread along X
  // For left/right walls (normalX != 0): posts spread along Z
  const isXWall = normalZ !== 0
  const spreadDir = isXWall ? [doorW / 2, 0] : [0, doorW / 2]

  return (
    <group>
      {/* Left post */}
      <mesh position={[px - spreadDir[0] - (isXWall ? postW / 2 : 0) + outX, postH / 2, pz - spreadDir[1] - (isXWall ? 0 : postW / 2) + outZ]}>
        <boxGeometry args={[postW, postH, postW * 1.5]} />
        <meshStandardMaterial color={0x4b5563} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Right post */}
      <mesh position={[px + spreadDir[0] + (isXWall ? postW / 2 : 0) + outX, postH / 2, pz + spreadDir[1] + (isXWall ? 0 : postW / 2) + outZ]}>
        <boxGeometry args={[postW, postH, postW * 1.5]} />
        <meshStandardMaterial color={0x4b5563} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Top beam */}
      <mesh position={[px + outX, doorH + postW * 0.5, pz + outZ]}>
        <boxGeometry args={[
          isXWall ? doorW + postW * 2.5 : postW * 1.5,
          postW * 1.2,
          isXWall ? postW * 1.5 : doorW + postW * 2.5,
        ]} />
        <meshStandardMaterial color={0x4b5563} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Status light */}
      <mesh position={[px + outX, doorH + postW * 2.5, pz + outZ]}>
        <sphereGeometry args={[Math.max(0.06, postW * 0.5), 8, 8]} />
        <meshStandardMaterial color={0x10b981} emissive={0x10b981} emissiveIntensity={2.5} />
      </mesh>

      {/* Loading ramp */}
      <mesh position={[px + normalX * offset * 3, postW * 0.3, pz + normalZ * offset * 3]}>
        <boxGeometry args={[
          isXWall ? doorW + postW * 3 : postW * 5,
          postW * 0.5,
          isXWall ? postW * 5 : doorW + postW * 3,
        ]} />
        <meshStandardMaterial color={0x374151} roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  )
}

// ==================== All Door Frames ====================

function BuildingDoorFrames({ cx, cz, widthM, depthM, doorWalls, doorWFront, doorWside, doorH, frameThick }) {
  const halfW = widthM / 2
  const halfD = depthM / 2
  const frames = []

  if (doorWalls.has('front')) {
    frames.push(<DoorFrame key="front" px={cx} pz={cz - halfD} doorW={doorWFront} doorH={doorH} frameThick={frameThick} normalX={0} normalZ={-1} />)
  }
  if (doorWalls.has('back')) {
    frames.push(<DoorFrame key="back" px={cx} pz={cz + halfD} doorW={doorWFront} doorH={doorH} frameThick={frameThick} normalX={0} normalZ={1} />)
  }
  if (doorWalls.has('left')) {
    frames.push(<DoorFrame key="left" px={cx - halfW} pz={cz} doorW={doorWside} doorH={doorH} frameThick={frameThick} normalX={-1} normalZ={0} />)
  }
  if (doorWalls.has('right')) {
    frames.push(<DoorFrame key="right" px={cx + halfW} pz={cz} doorW={doorWside} doorH={doorH} frameThick={frameThick} normalX={1} normalZ={0} />)
  }

  return <group>{frames}</group>
}

// ==================== Exterior (light poles) ====================

function BuildingExterior({ cx, cz, widthM, depthM, wallH }) {
  if (Math.min(widthM, depthM) <= 4) return null

  const poleH = wallH * 0.7
  const poleR = Math.max(0.03, wallH * 0.012)
  const lampR = Math.max(0.06, wallH * 0.04)

  const poles = [
    [cx - widthM / 2 - poleR * 8, cz + depthM / 2 + poleR * 6],
    [cx + widthM / 2 + poleR * 8, cz + depthM / 2 + poleR * 6],
  ]

  return (
    <group>
      {poles.map(([px, pz], i) => (
        <group key={`pole-${i}`}>
          <mesh position={[px, poleH / 2, pz]}>
            <cylinderGeometry args={[poleR, poleR * 1.3, poleH, 6]} />
            <meshStandardMaterial color={0x4a5568} metalness={0.7} />
          </mesh>
          <mesh position={[px, poleH, pz]}>
            <sphereGeometry args={[lampR, 6, 6]} />
            <meshStandardMaterial color={0xfff5b0} emissive={0xfff5b0} emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ==================== Label ====================

function BuildingLabel({ cx, cz, wallH, roofThick, code, color }) {
  const labelY = wallH + roofThick + Math.max(0.8, wallH * 0.2)
  const fontSize = Math.max(0.4, wallH * 0.15)

  return (
    <Text
      position={[cx, labelY, cz]}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      fontWeight="bold"
    >
      {code}
    </Text>
  )
}

// ==================== Main LocationBuilding3D ====================

function LocationBuilding3D({ loc, showRoof = true, showLabels = true }) {
  const { cx, cz, widthM, depthM, color, code, doorConfig } = loc

  const params = useMemo(() => computeBuildingParams(widthM, depthM), [widthM, depthM])
  const { wallH, wallThick, roofThick, roofOverhang, roofEdgeH, roofEdgeThick, frameThick } = params

  const doorInfo = useMemo(
    () => parseDoorConfig(doorConfig, widthM, depthM, wallH),
    [doorConfig, widthM, depthM, wallH],
  )
  const { doorWalls, doorWFront, doorWside, doorH } = doorInfo

  // Colors
  const baseCol = useMemo(() => new THREE.Color(color), [color])
  const wallCol = useMemo(() => baseCol.clone().offsetHSL(0, -0.05, -0.15), [baseCol])
  const roofCol = useMemo(() => baseCol.clone().offsetHSL(0, -0.08, -0.18), [baseCol])

  // Materials
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.7, metalness: 0.2 }),
    [wallCol],
  )
  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
    [roofCol],
  )

  return (
    <group>
      <BuildingWalls
        cx={cx} cz={cz} widthM={widthM} depthM={depthM}
        wallH={wallH} wallThick={wallThick}
        doorWalls={doorWalls} doorWFront={doorWFront} doorWside={doorWside} doorH={doorH}
        wallMat={wallMat}
      />

      {showRoof && (
        <BuildingRoof
          cx={cx} cz={cz} widthM={widthM} depthM={depthM}
          wallH={wallH} roofThick={roofThick} roofOverhang={roofOverhang}
          roofEdgeH={roofEdgeH} roofEdgeThick={roofEdgeThick}
          roofMat={roofMat}
        />
      )}

      <BuildingInterior cx={cx} cz={cz} widthM={widthM} depthM={depthM} wallH={wallH} />

      <BuildingDoorFrames
        cx={cx} cz={cz} widthM={widthM} depthM={depthM}
        doorWalls={doorWalls} doorWFront={doorWFront} doorWside={doorWside}
        doorH={doorH} frameThick={frameThick}
      />

      <BuildingExterior cx={cx} cz={cz} widthM={widthM} depthM={depthM} wallH={wallH} />

      {/* Concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.06, cz]} receiveShadow>
        <planeGeometry args={[widthM - wallThick * 2, depthM - wallThick * 2]} />
        <meshStandardMaterial color={0x1c2a3a} roughness={0.88} />
      </mesh>

      {/* Edge wireframe glow */}
      <lineSegments position={[cx, wallH / 2, cz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(widthM + 0.1, wallH + 0.1, depthM + 0.1)]} />
        <lineBasicMaterial color={color} transparent opacity={0.18} />
      </lineSegments>

      {showLabels && <BuildingLabel cx={cx} cz={cz} wallH={wallH} roofThick={roofThick} code={code} color={color} />}
    </group>
  )
}

export default function LocationBuildings3D({ locations, showRoof = true, showLabels = true }) {
  if (!locations?.length) return null
  return (
    <group>
      {locations.map((loc) => (
        <LocationBuilding3D key={loc.id} loc={loc} showRoof={showRoof} showLabels={showLabels} />
      ))}
    </group>
  )
}
