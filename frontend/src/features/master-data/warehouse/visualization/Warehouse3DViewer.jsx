import { useMemo, Suspense, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { INDUSTRIAL_COLORS, SCENE_CONFIG } from './constants'
import { Eye, EyeOff } from 'lucide-react'

const IC = INDUSTRIAL_COLORS
const SC = SCENE_CONFIG

// ==================== SCENE SETUP ====================

function SceneSetup({ height }) {
  const { scene } = useThree()
  useMemo(() => {
    scene.background = new THREE.Color(SC.bgColor)
    scene.fog = new THREE.Fog(SC.fogColor, SC.fogNear, SC.fogFar)
  }, [scene])

  return (
    <>
      <ambientLight intensity={SC.ambientIntensity} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={SC.keyLightIntensity}
        castShadow
        shadow-mapSize={[SC.shadowMapSize, SC.shadowMapSize]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <directionalLight position={[-15, 25, -10]} intensity={SC.fillLightIntensity} />
      <hemisphereLight args={['#87CEEB', '#8B7355', SC.hemisphereIntensity]} />
    </>
  )
}

// ==================== FLOOR ====================

function Floor({ length, width }) {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color={IC.floor} roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[length * 2, width * 2]} />
        <meshStandardMaterial color={IC.ground} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ==================== WALLS ====================

function Walls({ length, width, height }) {
  const wallT = 0.3
  const baseH = 0.8
  const halfL = length / 2
  const halfW = width / 2

  const wallDefs = [
    { pos: [0, height / 2, -halfW - wallT / 2], size: [length + 2 * wallT, height, wallT] },
    { pos: [0, height / 2, halfW + wallT / 2], size: [length + 2 * wallT, height, wallT] },
    { pos: [-halfL - wallT / 2, height / 2, 0], size: [wallT, height, width] },
    { pos: [halfL + wallT / 2, height / 2, 0], size: [wallT, height, width] },
  ]

  return (
    <group>
      {wallDefs.map((w, i) => (
        <group key={`wall-${i}`}>
          <mesh position={w.pos} castShadow receiveShadow>
            <boxGeometry args={w.size} />
            <meshStandardMaterial color={IC.wall} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>
          {/* Concrete base band */}
          <mesh position={[w.pos[0], baseH / 2, w.pos[2]]}>
            <boxGeometry args={[w.size[0] + 0.02, baseH, w.size[2] + 0.02]} />
            <meshStandardMaterial color={IC.baseBand} roughness={0.9} metalness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ==================== COLUMNS ====================

function Columns({ positions, height }) {
  if (!positions?.length) return null
  const colW = 0.4

  return (
    <group>
      {positions.map((col, i) => (
        <mesh key={`col-${i}`} position={[col.x, height / 2, col.z]} castShadow>
          <boxGeometry args={[colW, height, colW]} />
          <meshStandardMaterial color={IC.column} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ==================== ROOF ====================

function RoofStructure({ length, width, height, roof }) {
  const slopePercent = roof?.slopePercent || 15
  const slope = Math.max(slopePercent / 100, 0.12)
  const halfWidth = width / 2
  const roofRise = halfWidth * slope
  const slopeLength = Math.sqrt(halfWidth * halfWidth + roofRise * roofRise)
  const slopeAngle = Math.atan2(roofRise, halfWidth)
  const roofT = 0.12
  const panelCount = Math.max(Math.floor(length / 1.2), 8)
  const panelWidth = length / panelCount

  return (
    <group>
      {/* Corrugated panels - LEFT slope */}
      {Array.from({ length: panelCount }, (_, i) => {
        const px = -length / 2 + panelWidth / 2 + i * panelWidth
        return (
          <group
            key={`roof-l-${i}`}
            position={[px, height, -halfWidth]}
            rotation={[-slopeAngle, 0, 0]}
          >
            <mesh position={[0, roofT / 2, slopeLength / 2]} castShadow>
              <boxGeometry args={[panelWidth - 0.02, roofT, slopeLength]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? IC.roofA : IC.roofB}
                roughness={0.5}
                metalness={0.35}
              />
            </mesh>
          </group>
        )
      })}

      {/* Corrugated panels - RIGHT slope */}
      {Array.from({ length: panelCount }, (_, i) => {
        const px = -length / 2 + panelWidth / 2 + i * panelWidth
        return (
          <group
            key={`roof-r-${i}`}
            position={[px, height, halfWidth]}
            rotation={[slopeAngle, 0, 0]}
          >
            <mesh position={[0, roofT / 2, -slopeLength / 2]} castShadow>
              <boxGeometry args={[panelWidth - 0.02, roofT, slopeLength]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? IC.roofA : IC.roofB}
                roughness={0.5}
                metalness={0.35}
              />
            </mesh>
          </group>
        )
      })}

      {/* Ridge cap */}
      <mesh position={[0, height + roofRise + roofT, 0]}>
        <boxGeometry args={[length + 0.2, 0.15, 0.5]} />
        <meshStandardMaterial color={IC.ridge} roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Gutter/fascia - left */}
      <mesh position={[0, height - 0.1, -halfWidth - 0.15]}>
        <boxGeometry args={[length + 0.4, 0.25, 0.2]} />
        <meshStandardMaterial color={IC.gutter} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Gutter/fascia - right */}
      <mesh position={[0, height - 0.1, halfWidth + 0.15]}>
        <boxGeometry args={[length + 0.4, 0.25, 0.2]} />
        <meshStandardMaterial color={IC.gutter} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
}

// ==================== TRUSSES ====================

function Trusses({ length, width, height, roof, columnSpacingM }) {
  const spacing = columnSpacingM || 6
  const trussCount = Math.max(Math.floor(length / spacing) + 1, 2)
  const halfWidth = width / 2
  const slopePercent = roof?.slopePercent || 15
  const slope = Math.max(slopePercent / 100, 0.12)
  const roofRise = halfWidth * slope
  const slopeLength = Math.sqrt(halfWidth * halfWidth + roofRise * roofRise)
  const slopeAngle = Math.atan2(roofRise, halfWidth)

  return (
    <group>
      {Array.from({ length: trussCount }, (_, i) => {
        const x = -length / 2 + i * (length / (trussCount - 1 || 1))
        return (
          <group key={`truss-${i}`}>
            {/* Bottom chord */}
            <mesh position={[x, height + 0.05, 0]}>
              <boxGeometry args={[0.06, 0.1, width]} />
              <meshStandardMaterial color={IC.truss} metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Left rafter */}
            <group position={[x, height, -halfWidth]} rotation={[-slopeAngle, 0, 0]}>
              <mesh position={[0, 0, slopeLength / 2]}>
                <boxGeometry args={[0.06, 0.05, slopeLength]} />
                <meshStandardMaterial color={IC.trussRafter} metalness={0.5} roughness={0.4} />
              </mesh>
            </group>

            {/* Right rafter */}
            <group position={[x, height, halfWidth]} rotation={[slopeAngle, 0, 0]}>
              <mesh position={[0, 0, -slopeLength / 2]}>
                <boxGeometry args={[0.06, 0.05, slopeLength]} />
                <meshStandardMaterial color={IC.trussRafter} metalness={0.5} roughness={0.4} />
              </mesh>
            </group>

            {/* Web members (vertical struts) */}
            {[0.25, 0.5, 0.75].map((f) => (
              <group key={`web-l-${f}`}>
                <mesh position={[x, height + roofRise * f * 0.5, -halfWidth * (1 - f)]}>
                  <boxGeometry args={[0.04, roofRise * f + 0.1, 0.04]} />
                  <meshStandardMaterial color={IC.trussWeb} metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[x, height + roofRise * f * 0.5, halfWidth * (1 - f)]}>
                  <boxGeometry args={[0.04, roofRise * f + 0.1, 0.04]} />
                  <meshStandardMaterial color={IC.trussWeb} metalness={0.5} roughness={0.4} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// ==================== DOCK BAYS ====================

function DockBays3D({ docks, geometry }) {
  if (!docks?.positions?.length) return null
  const halfL = geometry.length / 2
  const halfW = geometry.width / 2
  const dockW = 3.5
  const dockH = 4

  return (
    <group>
      {docks.positions.map((dock, i) => {
        const px = -halfL + dock.offsetM + dockW / 2
        const dockDepth = 0.3

        return (
          <group key={`dock3d-${i}`} position={[px, dockH / 2, halfW]}>
            {/* Main dock door */}
            <mesh>
              <boxGeometry args={[dockW, dockH, dockDepth]} />
              <meshStandardMaterial color={IC.dock} roughness={0.6} metalness={0.2} />
            </mesh>

            {/* Roller shutter lines */}
            {Array.from({ length: 8 }, (_, j) => (
              <mesh key={`shutter-${j}`} position={[0, -dockH / 2 + (j / 8) * dockH, dockDepth / 2 + 0.01]}>
                <boxGeometry args={[dockW - 0.1, 0.03, 0.02]} />
                <meshStandardMaterial color={IC.shutterLine} />
              </mesh>
            ))}

            {/* Rubber bumpers */}
            <mesh position={[-dockW / 2 + 0.3, -dockH / 4, dockDepth / 2 + 0.08]}>
              <boxGeometry args={[0.2, 0.4, 0.15]} />
              <meshStandardMaterial color={IC.bumper} roughness={0.9} />
            </mesh>
            <mesh position={[dockW / 2 - 0.3, -dockH / 4, dockDepth / 2 + 0.08]}>
              <boxGeometry args={[0.2, 0.4, 0.15]} />
              <meshStandardMaterial color={IC.bumper} roughness={0.9} />
            </mesh>

            {/* Warning stripes */}
            <mesh position={[-dockW / 2 - 0.05, 0, dockDepth / 2 + 0.01]}>
              <boxGeometry args={[0.08, dockH, 0.02]} />
              <meshStandardMaterial color={IC.warning} />
            </mesh>
            <mesh position={[dockW / 2 + 0.05, 0, dockDepth / 2 + 0.01]}>
              <boxGeometry args={[0.08, dockH, 0.02]} />
              <meshStandardMaterial color={IC.warning} />
            </mesh>

            {/* Dock leveler (ramp) */}
            <mesh position={[0, -dockH / 2 + 0.05, dockDepth / 2 + 1]}>
              <boxGeometry args={[dockW + 0.4, 0.1, 2]} />
              <meshStandardMaterial color={IC.leveler} roughness={0.8} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ==================== INFO LABEL (3D) ====================

function InfoLabel3D({ warehouse, geometry }) {
  return (
    <group position={[0, 0.02, -(geometry.width / 2 + 4)]}>
      <Text
        fontSize={1.2}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {warehouse?.warehouseName || 'Warehouse'}
      </Text>
      <Text
        fontSize={0.7}
        color="#64748B"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {`${geometry.length}m × ${geometry.width}m × ${geometry.height}m`}
      </Text>
    </group>
  )
}

// ==================== MAIN 3D COMPONENT ====================

function WarehouseScene({ geometry, docks, roof, columnPositions, warehouse, showRoof }) {
  const { length, width, height } = geometry

  return (
    <>
      <SceneSetup height={height} />

      <group>
        <Floor length={length} width={width} />
        <Walls length={length} width={width} height={height} />
        <Columns positions={columnPositions} height={height} />
        <DockBays3D docks={docks} geometry={geometry} />
        {showRoof && (
          <>
            <RoofStructure length={length} width={width} height={height} roof={roof} />
            <Trusses
              length={length}
              width={width}
              height={height}
              roof={roof}
              columnSpacingM={geometry.columnSpacingM}
            />
          </>
        )}
        <InfoLabel3D warehouse={warehouse} geometry={geometry} />
      </group>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={Math.max(length, width) * 1.5}
        blur={2}
        far={20}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, height / 2, 0]}
      />
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Đang tải mô hình 3D...</span>
      </div>
    </div>
  )
}

export function Warehouse3DViewer({
  geometry,
  docks,
  roof,
  columnPositions,
  warehouse,
  className = '',
}) {
  const { length, width, height } = geometry
  const [showRoof, setShowRoof] = useState(true)

  return (
    <div className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{
            position: [length * 0.8, height * 1.5, width * 1.2],
            fov: 50,
            near: 0.1,
            far: 2000,
          }}
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <WarehouseScene
            geometry={geometry}
            docks={docks}
            roof={roof}
            columnPositions={columnPositions}
            warehouse={warehouse}
            showRoof={showRoof}
          />
        </Canvas>
      </Suspense>

      {/* Roof toggle button */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setShowRoof(!showRoof)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors ${
            showRoof
              ? 'bg-white/90 text-navy-700 hover:bg-white'
              : 'bg-navy-600/90 text-white hover:bg-navy-600'
          }`}
          title={showRoof ? 'Ẩn mái' : 'Hiện mái'}
        >
          {showRoof ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-xs font-medium">{showRoof ? 'Ẩn mái' : 'Hiện mái'}</span>
        </button>
      </div>

      {/* Controls hint overlay */}
      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
        <p className="text-[10px] text-white/70">
          Chuột trái: Xoay · Chuột phải: Di chuyển · Cuộn: Phóng to/thu nhỏ
        </p>
      </div>
    </div>
  )
}
