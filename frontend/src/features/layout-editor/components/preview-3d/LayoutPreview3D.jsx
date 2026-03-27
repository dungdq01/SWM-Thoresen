import { useMemo, useState, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff } from 'lucide-react'

// Monitoring-style sub-components (all pure, no store dependency)
import { WarehouseRoof } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseRoof'
import { WarehouseInterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseInterior'
import { WarehouseDoorFrames } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseDoorFrames'
import { WarehouseExterior } from '@features/warehouse-monitoring/visualization/warehouses/WarehouseExterior'
import { WALL_HEIGHT, WALL_THICK, DOOR_WIDTH, DOOR_HEIGHT } from '@features/warehouse-monitoring/data/warehouseData'

import { useLayoutEditor } from '../../hooks/useLayoutEditorStore'
import { editorStateTo3DProps } from '../../utils/editorTo3D'
import EditorZones3D from './EditorZones3D'
import EditorRacks3D from './EditorRacks3D'
import EditorLocations3D from './EditorLocations3D'

// ==================== Exact Monitoring Lighting & Environment ====================

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
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
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

function PreviewScene({ props3D, monWh, showRoof }) {
  const { zones3D, racks3D, locations3D } = props3D

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

  const groundSize = Math.max(monWh.width, monWh.depth) * 2.5

  return (
    <>
      <MonitoringLighting />
      <MonitoringEnvironment groundSize={groundSize} />

      <group>
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
            <mesh position={[-monWh.width / 2 - 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, Math.PI / 2, 0]} material={windowMat}>
              <planeGeometry args={[8, 5]} />
            </mesh>
            <mesh position={[monWh.width / 2 + 0.1, WALL_HEIGHT - 6, wz]} rotation={[0, -Math.PI / 2, 0]} material={windowMat}>
              <planeGeometry args={[8, 5]} />
            </mesh>
          </group>
        ))}

        {/* Upper transparent band (front/back) */}
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

        {/* Monitoring sub-components */}
        {showRoof && <WarehouseRoof wh={monWh} />}
        <WarehouseInterior wh={monWh} />
        <WarehouseDoorFrames wh={monWh} />
        <WarehouseExterior wh={monWh} />

        {/* Editor-positioned elements (zones/racks/locations from 2D editor) */}
        <EditorZones3D zones={zones3D} />
        <EditorRacks3D racks={racks3D} />
        <EditorLocations3D locations={locations3D} />

        {/* Edge wireframe */}
        <lineSegments position={[0, WALL_HEIGHT / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(monWh.width + 1.5, WALL_HEIGHT + 1.5, monWh.depth + 1.5)]} />
          <lineBasicMaterial color={monWh.color} transparent opacity={0.18} />
        </lineSegments>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={30}
        maxDistance={500}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, WALL_HEIGHT / 2, 0]}
      />
    </>
  )
}

export default function LayoutPreview3D() {
  const { state } = useLayoutEditor()
  const [showRoof, setShowRoof] = useState(true)

  const props3D = useMemo(() => editorStateTo3DProps(state), [
    state.warehouse,
    state.zones,
    state.racks,
    state.locations,
  ])

  // Convert editor warehouse to monitoring WH shape
  const monWh = useMemo(() => {
    const wh = state.warehouse
    if (!wh) return null
    return {
      code: wh.code || 'WH',
      name: wh.name || 'Warehouse',
      width: wh.lengthM || 60,
      depth: wh.widthM || 40,
      fill: 50,
      stock: 0,
      zones: state.zones.length || 4,
      type: wh.type || 'Hàng hỗn hợp',
      pos: [0, 0, 0],
      color: 0x2563eb,
      items: [],
      temp: 28,
      humid: 65,
    }
  }, [state.warehouse, state.zones.length])

  if (!props3D || !monWh) {
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
            position: [monWh.width * 0.8, 120, monWh.depth * 0.8],
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <PreviewScene props3D={props3D} monWh={monWh} showRoof={showRoof} />
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
          {state.zones.length} zones · {state.racks.length} racks · {state.locations.length} locations
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
