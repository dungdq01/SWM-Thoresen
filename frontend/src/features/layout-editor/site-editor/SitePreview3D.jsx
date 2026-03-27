import { Suspense, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff } from 'lucide-react'

// Import monitoring-style sub-components (all are pure, no store dependency)
import { WarehouseRoof } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseRoof'
import { WarehouseInterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseInterior'
import { WarehouseZones } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseZones'
import { WarehouseInventory } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseInventory'
import { WarehouseDoorFrames } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseDoorFrames'
import { WarehouseExterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseExterior'
import { WarehouseLabel } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseLabel'
import { WarehouseShelvingRacks } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseShelvingRacks'
import { WALL_HEIGHT, WALL_THICK, DOOR_WIDTH, DOOR_HEIGHT } from '@features/warehouse-monitoring/data/warehouseData'

// ==================== Exact Monitoring Lighting & Environment ====================

function MonitoringLighting() {
  return (
    <>
      {/* Ambient - same as monitoring SceneLighting.jsx (day mode) */}
      <ambientLight color={0x6a7a9a} intensity={1.0} />

      {/* Primary sun light - same position & intensity as monitoring */}
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

      {/* Hemisphere light - sky/ground color balance */}
      <hemisphereLight args={[0x99bbee, 0x223322, 0.8]} />

      {/* Fill backlight */}
      <directionalLight color={0x6688aa} intensity={0.5} position={[-200, 200, -150]} />
    </>
  )
}

function MonitoringEnvironment({ centerX, centerZ, groundSize }) {
  const { scene } = useThree()

  useMemo(() => {
    // Same as monitoring SceneEnvironment.jsx (day mode)
    scene.background = new THREE.Color(0x1a2840)
    scene.fog = new THREE.FogExp2(0x1a2840, 0.0008)
  }, [scene])

  return (
    <>
      {/* Main ground plane - same color as monitoring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={0x0c1520} roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Sub-ground extending beyond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.5, centerZ]}>
        <planeGeometry args={[groundSize * 2, groundSize * 2]} />
        <meshStandardMaterial color={0x060a12} />
      </mesh>

      {/* Grid helper - same as monitoring */}
      <gridHelper
        args={[groundSize, Math.floor(groundSize / 25), '#1a2a40', '#0d1825']}
        position={[centerX, 0.05, centerZ]}
      />
    </>
  )
}

/**
 * Convert site-editor warehouse data → monitoring WH_DATA shape.
 */
function toMonitoringWh(wh) {
  return {
    code: wh.code || 'WH',
    name: wh.name || 'Warehouse',
    width: wh.lengthM || 60,
    depth: wh.widthM || 40,
    fill: 50,
    stock: 0,
    zones: 4,
    type: wh.type || 'Hàng hỗn hợp',
    pos: [wh.xM + (wh.lengthM || 60) / 2, 0, wh.yM + (wh.widthM || 40) / 2],
    color: parseInt((wh.displayColor || '#3b82f6').replace('#', ''), 16),
    items: [],
    temp: 28,
    humid: 65,
  }
}

function SiteWarehouse({ wh, showRoof }) {
  const monWh = useMemo(() => toMonitoringWh(wh), [wh])

  const wallColor = useMemo(() => {
    const base = new THREE.Color(monWh.color)
    return base.clone().offsetHSL(0, -0.05, -0.15)
  }, [monWh.color])

  const wallTopColor = useMemo(() => new THREE.Color(monWh.color), [monWh.color])

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

  const doorCenterL = -monWh.width * 0.26
  const doorCenterR = monWh.width * 0.26
  const bandH = 5

  const wallSegments = useMemo(() => [
    { from: -monWh.width / 2, to: doorCenterL - DOOR_WIDTH / 2 },
    { from: doorCenterL + DOOR_WIDTH / 2, to: doorCenterR - DOOR_WIDTH / 2 },
    { from: doorCenterR + DOOR_WIDTH / 2, to: monWh.width / 2 },
  ], [monWh.width, doorCenterL, doorCenterR])

  const windowPositions = useMemo(() => {
    const count = Math.min(3, Math.floor(monWh.depth / 25))
    const positions = []
    for (let i = 0; i < count; i++) {
      const wz = -monWh.depth / 2 + 15 + i * (monWh.depth - 20) / Math.max(1, count - 1)
      positions.push(wz)
    }
    return positions
  }, [monWh.depth])

  return (
    <group position={monWh.pos}>
      {/* Side walls */}
      <mesh position={[-monWh.width / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
        <boxGeometry args={[WALL_THICK, WALL_HEIGHT, monWh.depth]} />
      </mesh>
      <mesh position={[monWh.width / 2, WALL_HEIGHT / 2, 0]} castShadow material={wallMat}>
        <boxGeometry args={[WALL_THICK, WALL_HEIGHT, monWh.depth]} />
      </mesh>

      {/* Front & Back walls with door openings */}
      {[monWh.depth / 2, -monWh.depth / 2].map((faceZ, faceIdx) => (
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
          <mesh position={[-monWh.width / 2 - 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, Math.PI / 2, 0]} material={windowMat}>
            <planeGeometry args={[8, 5]} />
          </mesh>
          <mesh position={[monWh.width / 2 + 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, -Math.PI / 2, 0]} material={windowMat}>
            <planeGeometry args={[8, 5]} />
          </mesh>
        </group>
      ))}

      {/* Upper transparent band (front/back) - same as monitoring */}
      {[
        { w: monWh.width + 0.5, d: 0.4, px: 0, pz: -monWh.depth / 2 },
        { w: monWh.width + 0.5, d: 0.4, px: 0, pz: monWh.depth / 2 },
      ].map((b, i) => (
        <mesh key={`band-${i}`} position={[b.px, WALL_HEIGHT + 0.5, b.pz]} material={wallTopMat}>
          <boxGeometry args={[b.w, bandH, b.d]} />
        </mesh>
      ))}

      {/* Concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <planeGeometry args={[monWh.width - 2, monWh.depth - 2]} />
        <meshStandardMaterial color={0x1c2a3a} roughness={0.88} />
      </mesh>

      {/* Sub-components from monitoring */}
      {showRoof && <WarehouseRoof wh={monWh} />}
      <WarehouseInterior wh={monWh} />
      <WarehouseZones wh={monWh} />
      <WarehouseInventory wh={monWh} />
      <WarehouseDoorFrames wh={monWh} />
      <WarehouseExterior wh={monWh} />
      <WarehouseLabel wh={monWh} />
      <WarehouseShelvingRacks wh={monWh} />

      {/* Edge wireframe glow */}
      <lineSegments position={[0, WALL_HEIGHT / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(monWh.width + 1.5, WALL_HEIGHT + 1.5, monWh.depth + 1.5)]} />
        <lineBasicMaterial color={monWh.color} transparent opacity={0.18} />
      </lineSegments>
    </group>
  )
}

function SiteScene({ warehouses, showRoof }) {
  const bounds = useMemo(() => {
    if (!warehouses.length) return { cx: 0, cz: 0, maxDim: 400 }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    warehouses.forEach((wh) => {
      const whWidth = wh.lengthM || 60
      const whDepth = wh.widthM || 40
      minX = Math.min(minX, wh.xM)
      maxX = Math.max(maxX, wh.xM + whWidth)
      minZ = Math.min(minZ, wh.yM)
      maxZ = Math.max(maxZ, wh.yM + whDepth)
    })
    return {
      cx: (minX + maxX) / 2,
      cz: (minZ + maxZ) / 2,
      maxDim: Math.max(maxX - minX, maxZ - minZ, 400),
    }
  }, [warehouses])

  return (
    <>
      <MonitoringLighting />
      <MonitoringEnvironment
        centerX={bounds.cx}
        centerZ={bounds.cz}
        groundSize={bounds.maxDim * 2}
      />

      {/* Warehouses */}
      {warehouses.map((wh) => (
        <SiteWarehouse key={wh.id} wh={wh} showRoof={showRoof} />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={30}
        maxDistance={900}
        maxPolarAngle={Math.PI * 0.48}
        target={[bounds.cx, 0, bounds.cz]}
      />
    </>
  )
}

export default function SitePreview3D({ warehouses }) {
  const [showRoof, setShowRoof] = useState(true)

  if (!warehouses?.length) {
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
            position: [0, 320, 380],
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <SiteScene warehouses={warehouses} showRoof={showRoof} />
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
          {warehouses.length} kho
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
