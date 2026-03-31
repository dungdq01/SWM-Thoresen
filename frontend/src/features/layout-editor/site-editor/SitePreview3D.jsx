/**
 * SitePreview3D - Renders 1 large warehouse building containing all zones inside.
 *
 * The "warehouses" from site layout are actually zones within 1 big warehouse.
 * Each zone has position (xM, yM), size (lengthM, widthM), and color.
 * This component renders:
 * - 1 big building envelope (walls, roof, columns, doors, interior)
 * - Zone floor markings at their positioned locations inside
 */
import { Suspense, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff } from 'lucide-react'

import { WarehouseRoof } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseRoof'
import { WarehouseInterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseInterior'
import { WarehouseDoorFrames } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseDoorFrames'
import { WarehouseExterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseExterior'
import { WALL_HEIGHT, WALL_THICK, DOOR_WIDTH, DOOR_HEIGHT } from '@features/warehouse-monitoring/data/warehouseData'

// ==================== Monitoring-style Lighting & Environment ====================

function MonitoringLighting() {
  return (
    <>
      <ambientLight color={0x6a7a9a} intensity={1.0} />
      <directionalLight
        color={0xffeedd}
        intensity={3.0}
        position={[250, 500, 200]}
        castShadow
        shadow-camera-near={1}
        shadow-camera-far={1500}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={[0x99bbee, 0x223322, 0.8]} />
      <directionalLight color={0x6688aa} intensity={0.5} position={[-200, 200, -150]} />
    </>
  )
}

function MonitoringEnvironment({ groundSize }) {
  const { scene } = useThree()
  useMemo(() => {
    scene.background = new THREE.Color(0x1a2840)
    scene.fog = new THREE.FogExp2(0x1a2840, 0.0008)
  }, [scene])

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={0x0c1520} roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[groundSize * 2, groundSize * 2]} />
        <meshStandardMaterial color={0x060a12} />
      </mesh>
      <gridHelper
        args={[groundSize, Math.floor(groundSize / 25), '#1a2a40', '#0d1825']}
        position={[0, 0.05, 0]}
      />
    </>
  )
}

// ==================== Zone Floor Markings (positioned inside the building) ====================

const TAPE_HEIGHT = 0.12
const TAPE_WIDTH = 0.15

function ZoneFloorMarking({ zone }) {
  const col = new THREE.Color(zone.color)
  const halfW = zone.w3d / 2
  const halfD = zone.d3d / 2

  const tapes = [
    { pos: [zone.cx, TAPE_HEIGHT / 2, zone.cz - halfD], size: [zone.w3d, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [zone.cx, TAPE_HEIGHT / 2, zone.cz + halfD], size: [zone.w3d, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [zone.cx - halfW, TAPE_HEIGHT / 2, zone.cz], size: [TAPE_WIDTH, TAPE_HEIGHT, zone.d3d] },
    { pos: [zone.cx + halfW, TAPE_HEIGHT / 2, zone.cz], size: [TAPE_WIDTH, TAPE_HEIGHT, zone.d3d] },
  ]

  return (
    <group>
      {/* Floor surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.cx, 0.08, zone.cz]}>
        <planeGeometry args={[zone.w3d, zone.d3d]} />
        <meshStandardMaterial
          color={col}
          transparent
          opacity={0.25}
          emissive={col}
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border tapes */}
      {tapes.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={t.size} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Zone label */}
      <Text
        position={[zone.cx, 0.2, zone.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(zone.w3d, zone.d3d) * 0.15}
        color={zone.color}
        anchorX="center"
        anchorY="middle"
        maxWidth={zone.w3d * 0.9}
      >
        {zone.code}
      </Text>
      <Text
        position={[zone.cx, 0.2, zone.cz + Math.min(zone.w3d, zone.d3d) * 0.12]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(zone.w3d, zone.d3d) * 0.08}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
        maxWidth={zone.w3d * 0.9}
      >
        {zone.name}
      </Text>
    </group>
  )
}

// ==================== Main Scene ====================

function SiteScene({ zones, buildingWh, showRoof }) {
  const wallColor = useMemo(() => {
    const base = new THREE.Color(0x2563eb)
    return base.clone().offsetHSL(0, -0.05, -0.15)
  }, [])

  const wallTopColor = useMemo(() => new THREE.Color(0x2563eb), [])

  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7, metalness: 0.2 }),
    [wallColor],
  )
  const wallTopMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: wallTopColor, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.55 }),
    [wallTopColor],
  )
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x38bdf8, emissiveIntensity: 0.15, transparent: true, opacity: 0.35 }),
    [],
  )

  const bw = buildingWh.width
  const bd = buildingWh.depth
  const doorCenterL = -bw * 0.26
  const doorCenterR = bw * 0.26
  const bandH = 5

  const wallSegments = useMemo(() => [
    { from: -bw / 2, to: doorCenterL - DOOR_WIDTH / 2 },
    { from: doorCenterL + DOOR_WIDTH / 2, to: doorCenterR - DOOR_WIDTH / 2 },
    { from: doorCenterR + DOOR_WIDTH / 2, to: bw / 2 },
  ], [bw, doorCenterL, doorCenterR])

  const windowPositions = useMemo(() => {
    const count = Math.min(5, Math.floor(bd / 20))
    const positions = []
    for (let i = 0; i < count; i++) {
      const wz = -bd / 2 + 15 + i * (bd - 20) / Math.max(1, count - 1)
      positions.push(wz)
    }
    return positions
  }, [bd])

  const groundSize = Math.max(bw, bd) * 2.5

  return (
    <>
      <MonitoringLighting />
      <MonitoringEnvironment groundSize={groundSize} />

      <group>
        {/* Side walls */}
        <mesh position={[-bw / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
          <boxGeometry args={[WALL_THICK, WALL_HEIGHT, bd]} />
        </mesh>
        <mesh position={[bw / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
          <boxGeometry args={[WALL_THICK, WALL_HEIGHT, bd]} />
        </mesh>

        {/* Front & Back walls with door openings */}
        {[bd / 2, -bd / 2].map((faceZ, faceIdx) => (
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

        {/* Windows */}
        {windowPositions.map((wz, wi) => (
          <group key={wi}>
            <mesh position={[-bw / 2 - 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, Math.PI / 2, 0]} material={windowMat}>
              <planeGeometry args={[8, 5]} />
            </mesh>
            <mesh position={[bw / 2 + 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, -Math.PI / 2, 0]} material={windowMat}>
              <planeGeometry args={[8, 5]} />
            </mesh>
          </group>
        ))}

        {/* Upper transparent band */}
        {[
          { w: bw + 0.5, d: 0.4, px: 0, pz: -bd / 2 },
          { w: bw + 0.5, d: 0.4, px: 0, pz: bd / 2 },
        ].map((b, i) => (
          <mesh key={`band-${i}`} position={[b.px, WALL_HEIGHT + 0.5, b.pz]} material={wallTopMat}>
            <boxGeometry args={[b.w, bandH, b.d]} />
          </mesh>
        ))}

        {/* Concrete floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
          <planeGeometry args={[bw - 2, bd - 2]} />
          <meshStandardMaterial color={0x1c2a3a} roughness={0.88} />
        </mesh>

        {/* Monitoring sub-components for the building */}
        {showRoof && <WarehouseRoof wh={buildingWh} />}
        <WarehouseInterior wh={buildingWh} />
        <WarehouseDoorFrames wh={buildingWh} />
        <WarehouseExterior wh={buildingWh} />

        {/* Zone floor markings inside the building */}
        {zones.map((zone) => (
          <ZoneFloorMarking key={zone.id} zone={zone} />
        ))}

        {/* Edge wireframe */}
        <lineSegments position={[0, WALL_HEIGHT / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(bw + 1.5, WALL_HEIGHT + 1.5, bd + 1.5)]} />
          <lineBasicMaterial color={0x2563eb} transparent opacity={0.18} />
        </lineSegments>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={30}
        maxDistance={900}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, WALL_HEIGHT / 2, 0]}
      />
    </>
  )
}

export default function SitePreview3D({ warehouses }) {
  const [showRoof, setShowRoof] = useState(false) // default: hide roof to see zones inside

  // Calculate bounding box of all zones → derive 1 big building size
  const { buildingWh, zones3D } = useMemo(() => {
    if (!warehouses?.length) return { buildingWh: null, zones3D: [] }

    let maxX = 0, maxZ = 0
    warehouses.forEach((wh) => {
      maxX = Math.max(maxX, wh.xM + wh.lengthM)
      maxZ = Math.max(maxZ, wh.yM + wh.widthM)
    })

    // Building dimensions: encompass all zones with padding
    const padding = 10
    const buildingWidth = maxX + padding * 2
    const buildingDepth = maxZ + padding * 2

    // Convert warehouse/zones to 3D coordinates (top-left origin → center origin)
    const zones = warehouses.map((wh) => ({
      id: wh.id,
      code: wh.code,
      name: wh.name,
      color: wh.displayColor || '#3b82f6',
      // Transform: editor (xM, yM) top-left → 3D center-origin
      cx: wh.xM + wh.lengthM / 2 - buildingWidth / 2 + padding,
      cz: wh.yM + wh.widthM / 2 - buildingDepth / 2 + padding,
      w3d: wh.lengthM,
      d3d: wh.widthM,
    }))

    // Build monitoring-style wh object for the big building
    const bWh = {
      code: 'TVL',
      name: 'Tổng kho TVL',
      width: buildingWidth,
      depth: buildingDepth,
      fill: 60,
      stock: 0,
      zones: warehouses.length,
      type: 'Hàng hỗn hợp',
      pos: [0, 0, 0],
      color: 0x2563eb,
      items: [],
      temp: 28,
      humid: 65,
    }

    return { buildingWh: bWh, zones3D: zones }
  }, [warehouses])

  if (!buildingWh) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 bg-[#0a0e1a]">
        Không có dữ liệu kho để hiển thị 3D
      </div>
    )
  }

  return (
    <div className="flex-1 relative bg-[#0a0e1a] overflow-hidden">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Đang tải mô hình 3D...</span>
            </div>
          </div>
        }
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
            powerPreference: 'high-performance',
          }}
          camera={{
            fov: 55,
            near: 1,
            far: 6000,
            position: [buildingWh.width * 0.7, 200, buildingWh.depth * 0.7],
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <SiteScene zones={zones3D} buildingWh={buildingWh} showRoof={showRoof} />
        </Canvas>
      </Suspense>

      {/* Roof toggle */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setShowRoof(!showRoof)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors ${
            showRoof
              ? 'bg-white/90 text-slate-700 hover:bg-white'
              : 'bg-slate-600/90 text-white hover:bg-slate-600'
          }`}
        >
          {showRoof ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-xs font-medium">{showRoof ? 'Ẩn mái' : 'Hiện mái'}</span>
        </button>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
        <p className="text-xs text-white/80 font-medium">
          {zones3D.length} zones · {Math.round(buildingWh.width)}m × {Math.round(buildingWh.depth)}m
        </p>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
        <p className="text-[10px] text-white/70">
          Chuột trái: Xoay · Chuột phải: Di chuyển · Cuộn: Phóng to/thu nhỏ
        </p>
      </div>
    </div>
  )
}
