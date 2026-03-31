import { useMemo, useState, Suspense, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Tag, Grid3X3, CloudFog, Sun, Home } from 'lucide-react'

import { apiDataTo3DProps } from './apiDataTo3D'
import EditorZones3D from '@features/layout-editor/components/preview-3d/EditorZones3D'
import EditorRacks3D from '@features/layout-editor/components/preview-3d/EditorRacks3D'
import LocationBuildings3D from '@features/layout-editor/components/preview-3d/LocationBuilding3D'

// ==================== Lighting ====================

function SceneLighting() {
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
      <pointLight color={0x4488cc} intensity={0.3} position={[0, 2, 0]} distance={200} />
    </>
  )
}

// ==================== Environment (open yard) ====================

function YardEnvironment({ whWidth, whDepth, showGrid, showFog }) {
  const { scene } = useThree()
  const groundSize = Math.max(whWidth, whDepth) * 2.5

  useMemo(() => {
    scene.background = new THREE.Color(0x1a2840)
    scene.fog = showFog ? new THREE.FogExp2(0x1a2840, 0.0008) : null
  }, [scene, showFog])

  const halfW = whWidth / 2
  const halfD = whDepth / 2
  const borderH = 0.3
  const borderThick = 0.2

  return (
    <>
      {/* World ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={0x0c1520} roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Warehouse yard floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <planeGeometry args={[whWidth, whDepth]} />
        <meshStandardMaterial color={0x1c2a3a} roughness={0.85} />
      </mesh>

      {/* Grid helper */}
      {showGrid && (
        <gridHelper
          args={[groundSize, Math.floor(groundSize / 25), '#1a2a40', '#0d1825']}
          position={[0, 0.05, 0]}
        />
      )}

      {/* Yard boundary outline */}
      {[
        { pos: [0, borderH / 2, -halfD], size: [whWidth + borderThick, borderH, borderThick] },
        { pos: [0, borderH / 2, halfD], size: [whWidth + borderThick, borderH, borderThick] },
        { pos: [-halfW, borderH / 2, 0], size: [borderThick, borderH, whDepth] },
        { pos: [halfW, borderH / 2, 0], size: [borderThick, borderH, whDepth] },
      ].map((b, i) => (
        <mesh key={`border-${i}`} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={0x3b82f6} emissive={0x3b82f6} emissiveIntensity={0.3} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Corner markers */}
      {[
        [-halfW, -halfD], [halfW, -halfD],
        [-halfW, halfD], [halfW, halfD],
      ].map(([px, pz], i) => (
        <mesh key={`corner-${i}`} position={[px, 0.4, pz]}>
          <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
          <meshStandardMaterial color={0x3b82f6} emissive={0x3b82f6} emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </>
  )
}

// ==================== Settings Toggle ====================

function SettingsToggle({ icon: Icon, label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-white/50" />
        <span className="text-[11px] text-white/70">{label}</span>
      </div>
      <button
        onClick={onChange}
        className={`w-8 h-4 rounded-full transition-colors relative ${value ? 'bg-blue-500' : 'bg-white/20'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

// ==================== Warehouse Scene ====================

function WarehouseScene({ whWidth, whDepth, whCode, whName, zones3D, racks3D, locations3D, settings }) {
  return (
    <>
      <SceneLighting />
      <YardEnvironment whWidth={whWidth} whDepth={whDepth} showGrid={settings.grid} showFog={settings.fog} />

      {/* Warehouse name label */}
      {settings.labels && (
        <Text
          position={[0, 10, 0]}
          fontSize={2.5}
          color="#60a5fa"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          fillOpacity={0.8}
        >
          {whCode} - {whName}
        </Text>
      )}

      {/* Layout data */}
      <EditorZones3D zones={zones3D} />
      <LocationBuildings3D locations={locations3D} showRoof={settings.roof} showLabels={settings.labels} />
      <EditorRacks3D racks={racks3D} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, 3, 0]}
      />
    </>
  )
}

// ==================== Loading ====================

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Dang tai mo hinh 3D...</span>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function Warehouse3DViewer({
  geometry,
  warehouse,
  zones,
  racks,
  locations,
  className = '',
}) {
  const [settings, setSettings] = useState({
    labels: true,
    grid: true,
    fog: true,
    shadows: true,
    roof: false,
  })

  const toggle = useCallback((key) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }))
  }, [])

  const whWidth = geometry?.length || geometry?.lengthM || 60
  const whDepth = geometry?.width || geometry?.widthM || 40
  const whCode = warehouse?.warehouseCode || 'WH'
  const whName = warehouse?.warehouseName || 'Warehouse'

  const { zones3D, racks3D, locations3D } = useMemo(
    () => (geometry ? apiDataTo3DProps(geometry, zones, racks, locations) : { zones3D: [], racks3D: [], locations3D: [] }),
    [geometry, zones, racks, locations],
  )

  if (!geometry) return null

  return (
    <div className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows={settings.shadows}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          camera={{
            fov: 55,
            near: 1,
            far: 6000,
            position: [whWidth * 0.7, Math.max(whWidth, whDepth) * 0.6, whDepth * 0.7],
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <WarehouseScene
            whWidth={whWidth}
            whDepth={whDepth}
            whCode={whCode}
            whName={whName}
            zones3D={zones3D}
            racks3D={racks3D}
            locations3D={locations3D}
            settings={settings}
          />
        </Canvas>
      </Suspense>

      {/* Settings panel — top right */}
      <div className="absolute top-3 right-3 pointer-events-auto w-44">
        <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3">
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Cai dat hien thi</p>
          <div className="space-y-1">
            <SettingsToggle icon={Tag} label="Nhan kho" value={settings.labels} onChange={() => toggle('labels')} />
            <SettingsToggle icon={Grid3X3} label="Luoi nen" value={settings.grid} onChange={() => toggle('grid')} />
            <SettingsToggle icon={CloudFog} label="Suong mu" value={settings.fog} onChange={() => toggle('fog')} />
            <SettingsToggle icon={Sun} label="Bong do" value={settings.shadows} onChange={() => toggle('shadows')} />
            <SettingsToggle icon={Home} label="Mai kho" value={settings.roof} onChange={() => toggle('roof')} />
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/10">
        <p className="text-xs text-white/90 font-semibold">{whCode} - {whName}</p>
        <p className="text-[11px] text-white/60 mt-0.5">
          {whWidth} x {whDepth}m
        </p>
        <div className="flex gap-3 mt-1.5 text-[10px] text-white/60">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {zones3D.length} zone
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            {racks3D.length} rack
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            {locations3D.length} location
          </span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
        <p className="text-[10px] text-white/60">
          Chuot trai: Xoay · Chuot phai: Di chuyen · Cuon: Phong to/thu nho
        </p>
      </div>
    </div>
  )
}
