import { useMemo, Suspense, useState, memo, useCallback } from 'react'
import { Canvas, useThree, invalidate } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff } from 'lucide-react'

// ==================== COLORS ====================
const COLORS = {
  // Surfaces
  floor: '#94A3B8',
  ground: '#64748B',
  wall: '#D6D3D1',
  baseBand: '#78716C',

  // Roof
  roofA: '#5B7A94',
  roofB: '#52728C',
  ridge: '#3D5A6E',
  gutter: '#4A6274',

  // Dock
  dock: '#F59E0B',
  shutterLine: '#5C6B78',
  bumper: '#1F2937',
  warning: '#FBBF24',
  leveler: '#6B7280',

  // Racking & Cargo
  racking: '#374151',
  rackingFrame: '#1F2937',
  pallet: '#D4A76A',
  palletDark: '#B8956B',
  cargo: '#6366F1',
  cargoAlt: '#8B5CF6',
  cargoGreen: '#10B981',
  cargoBlue: '#3B82F6',
  cargoOrange: '#F97316',
  cargoRed: '#EF4444',
  box: '#E5E7EB',
  boxStroke: '#9CA3AF',
}

const SCENE_CONFIG = {
  bgColor: '#0F172A',
  fogColor: '#1E293B',
  fogNear: 50,
  fogFar: 250,
  ambientIntensity: 0.6,
  keyLightIntensity: 1.0,
  fillLightIntensity: 0.3,
  hemisphereIntensity: 0.3,
  shadowMapSize: 1024, // Reduced for performance
}

const SC = SCENE_CONFIG

// ==================== SCENE SETUP ====================

function SceneSetup({ height }) {
  const { scene, invalidate } = useThree()
  useMemo(() => {
    scene.background = new THREE.Color(SC.bgColor)
    scene.fog = new THREE.Fog(SC.fogColor, SC.fogNear, SC.fogFar)
    invalidate()
  }, [scene, invalidate])

  return (
    <>
      <ambientLight intensity={SC.ambientIntensity} />
      <directionalLight position={[20, 30, 15]} intensity={SC.keyLightIntensity} />
      <directionalLight position={[-15, 25, -10]} intensity={SC.fillLightIntensity} />
      <hemisphereLight args={['#87CEEB', '#8B7355', SC.hemisphereIntensity]} />
    </>
  )
}

// ==================== FLOOR ====================

function Floor({ length, width }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[length * 2, width * 2]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.9} />
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
            <meshStandardMaterial color={COLORS.wall} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[w.pos[0], baseH / 2, w.pos[2]]}>
            <boxGeometry args={[w.size[0] + 0.02, baseH, w.size[2] + 0.02]} />
            <meshStandardMaterial color={COLORS.baseBand} roughness={0.9} metalness={0.05} />
          </mesh>
        </group>
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
      {Array.from({ length: panelCount }, (_, i) => {
        const px = -length / 2 + panelWidth / 2 + i * panelWidth
        return (
          <group key={`roof-l-${i}`} position={[px, height, -halfWidth]} rotation={[-slopeAngle, 0, 0]}>
            <mesh position={[0, roofT / 2, slopeLength / 2]} castShadow>
              <boxGeometry args={[panelWidth - 0.02, roofT, slopeLength]} />
              <meshStandardMaterial color={i % 2 === 0 ? COLORS.roofA : COLORS.roofB} roughness={0.5} metalness={0.35} />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: panelCount }, (_, i) => {
        const px = -length / 2 + panelWidth / 2 + i * panelWidth
        return (
          <group key={`roof-r-${i}`} position={[px, height, halfWidth]} rotation={[slopeAngle, 0, 0]}>
            <mesh position={[0, roofT / 2, -slopeLength / 2]} castShadow>
              <boxGeometry args={[panelWidth - 0.02, roofT, slopeLength]} />
              <meshStandardMaterial color={i % 2 === 0 ? COLORS.roofA : COLORS.roofB} roughness={0.5} metalness={0.35} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, height + roofRise + roofT, 0]}>
        <boxGeometry args={[length + 0.2, 0.15, 0.5]} />
        <meshStandardMaterial color={COLORS.ridge} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, height - 0.1, -halfWidth - 0.15]}>
        <boxGeometry args={[length + 0.4, 0.25, 0.2]} />
        <meshStandardMaterial color={COLORS.gutter} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, height - 0.1, halfWidth + 0.15]}>
        <boxGeometry args={[length + 0.4, 0.25, 0.2]} />
        <meshStandardMaterial color={COLORS.gutter} roughness={0.5} metalness={0.4} />
      </mesh>
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
            <mesh>
              <boxGeometry args={[dockW, dockH, dockDepth]} />
              <meshStandardMaterial color={COLORS.dock} roughness={0.6} metalness={0.2} />
            </mesh>
            {Array.from({ length: 8 }, (_, j) => (
              <mesh key={`shutter-${j}`} position={[0, -dockH / 2 + (j / 8) * dockH, dockDepth / 2 + 0.01]}>
                <boxGeometry args={[dockW - 0.1, 0.03, 0.02]} />
                <meshStandardMaterial color={COLORS.shutterLine} />
              </mesh>
            ))}
            <mesh position={[-dockW / 2 + 0.3, -dockH / 4, dockDepth / 2 + 0.08]}>
              <boxGeometry args={[0.2, 0.4, 0.15]} />
              <meshStandardMaterial color={COLORS.bumper} roughness={0.9} />
            </mesh>
            <mesh position={[dockW / 2 - 0.3, -dockH / 4, dockDepth / 2 + 0.08]}>
              <boxGeometry args={[0.2, 0.4, 0.15]} />
              <meshStandardMaterial color={COLORS.bumper} roughness={0.9} />
            </mesh>
            <mesh position={[0, -dockH / 2 + 0.05, dockDepth / 2 + 1]}>
              <boxGeometry args={[dockW + 0.4, 0.1, 2]} />
              <meshStandardMaterial color={COLORS.leveler} roughness={0.8} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ==================== SIMPLIFIED RACKING (Performance optimized) ====================

const RackingUnit = memo(function RackingUnit({ position, rackWidth = 2.4, rackDepth = 1.2, rackHeight = 6 }) {
  return (
    <group position={position}>
      {/* Simplified: Just 2 vertical frames + 1 horizontal */}
      <mesh position={[-rackWidth / 2, rackHeight / 2, 0]}>
        <boxGeometry args={[0.08, rackHeight, 0.08]} />
        <meshStandardMaterial color={COLORS.rackingFrame} />
      </mesh>
      <mesh position={[rackWidth / 2, rackHeight / 2, 0]}>
        <boxGeometry args={[0.08, rackHeight, 0.08]} />
        <meshStandardMaterial color={COLORS.rackingFrame} />
      </mesh>
      {/* Single horizontal beam at top */}
      <mesh position={[0, rackHeight, 0]}>
        <boxGeometry args={[rackWidth, 0.1, rackDepth]} />
        <meshStandardMaterial color={COLORS.racking} />
      </mesh>
    </group>
  )
})

// ==================== SIMPLIFIED PALLET (Performance optimized) ====================

const PalletWithCargo = memo(function PalletWithCargo({ position, cargoColor, fillLevel = 1 }) {
  const color = cargoColor || COLORS.cargo
  const cargoHeight = 0.5 + fillLevel * 0.5

  return (
    <group position={position}>
      {/* Single box for pallet + cargo combined */}
      <mesh position={[0, cargoHeight / 2, 0]}>
        <boxGeometry args={[1.1, cargoHeight, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
})

// ==================== SIMPLIFIED FORKLIFT ====================

const Forklift = memo(function Forklift({ position, rotation = 0, carryingPallet = false, palletColor }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Simplified body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1, 2]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 1.2, 0.8]}>
        <boxGeometry args={[0.8, 1.5, 0.1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Carrying pallet */}
      {carryingPallet && (
        <mesh position={[0, 0.5, 1.5]}>
          <boxGeometry args={[1, 0.6, 0.8]} />
          <meshStandardMaterial color={palletColor || COLORS.cargo} />
        </mesh>
      )}
    </group>
  )
})

// ==================== WAREHOUSE INVENTORY ====================

function WarehouseInventory({ geometry, timeIndex = 0 }) {
  const { length, width } = geometry
  const halfL = length / 2
  const halfW = width / 2

  // Generate inventory state and activities based on timeIndex
  const { rackingRows, pallets, forklifts, activities } = useMemo(() => {
    const rows = []
    const items = []
    const trucks = []
    const acts = []
    
    const aisleWidth = 4
    const rackWidth = 2.4
    const rackDepth = 1.2
    const rackHeight = 6
    const levels = 4

    const usableWidth = width - 12
    const rowSpacing = rackDepth * 2 + aisleWidth
    const numRows = Math.min(Math.floor(usableWidth / rowSpacing), 5) // Reduced from 8

    const usableLength = length - 15
    const rackSpacing = rackWidth + 1.5 // Increased spacing
    const racksPerRow = Math.min(Math.floor(usableLength / rackSpacing), 15) // Reduced from 30

    const cargoTypes = ['boxes', 'bulk', 'bags']
    const cargoColors = [COLORS.cargo, COLORS.cargoAlt, COLORS.cargoGreen, COLORS.cargoBlue, COLORS.cargoOrange]

    // Seeded random generator
    const createSeededRandom = (baseSeed) => {
      let seed = baseSeed
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }

    // Time analysis
    const hour = Math.floor(timeIndex / 4)
    const quarterInHour = timeIndex % 4
    const isWorkingHours = hour >= 6 && hour <= 22
    const isMorningShift = hour >= 6 && hour < 14
    const isAfternoonShift = hour >= 14 && hour < 22

    // ========== INVENTORY TRANSACTIONS ==========
    // Define specific inventory changes per time slot
    const transactions = []
    
    // Morning: Inbound deliveries (goods coming IN)
    if (hour >= 7 && hour < 12) {
      const numInbound = 2 + Math.floor((hour - 7) * 0.5)
      for (let i = 0; i < numInbound; i++) {
        transactions.push({
          type: 'INBOUND',
          rackRow: i % numRows,
          rackCol: Math.floor(timeIndex / 2) % racksPerRow,
          level: quarterInHour % levels,
          color: COLORS.cargoGreen,
        })
      }
    }

    // Afternoon: Outbound shipments (goods going OUT)
    if (hour >= 13 && hour < 18) {
      const numOutbound = 3 + Math.floor((hour - 13) * 0.5)
      for (let i = 0; i < numOutbound; i++) {
        transactions.push({
          type: 'OUTBOUND',
          rackRow: (numRows - 1 - i) % numRows,
          rackCol: (racksPerRow - 1 - Math.floor(timeIndex / 2)) % racksPerRow,
          level: (levels - 1 - quarterInHour) % levels,
          color: COLORS.cargoOrange,
        })
      }
    }

    // Continuous picking throughout the day
    if (isWorkingHours) {
      for (let i = 0; i < 3; i++) {
        transactions.push({
          type: 'PICKING',
          rackRow: (timeIndex + i * 3) % numRows,
          rackCol: (timeIndex * 2 + i * 7) % racksPerRow,
          level: (timeIndex + i) % levels,
          color: COLORS.cargoRed,
        })
      }
    }

    // ========== BUILD RACK STATE ==========
    // Base inventory - stable positions
    const baseRandom = createSeededRandom(12345)
    const baseInventory = []
    
    for (let row = 0; row < numRows; row++) {
      baseInventory[row] = []
      for (let rack = 0; rack < racksPerRow; rack++) {
        baseInventory[row][rack] = []
        for (let level = 0; level < levels; level++) {
          // Base fill rate ~70%
          const filled = baseRandom() < 0.7
          baseInventory[row][rack][level] = filled ? {
            cargoType: cargoTypes[Math.floor(baseRandom() * 3)],
            fillLevel: 0.5 + baseRandom() * 0.5,
            cargoColor: cargoColors[Math.floor(baseRandom() * cargoColors.length)],
          } : null
        }
      }
    }

    // Apply transactions to modify inventory (with bounds checking)
    transactions.forEach(tx => {
      const { type, rackRow, rackCol, level, color } = tx
      // Ensure bounds are valid and arrays exist
      if (
        rackRow >= 0 && rackRow < numRows &&
        rackCol >= 0 && rackCol < racksPerRow &&
        level >= 0 && level < levels &&
        baseInventory[rackRow] &&
        baseInventory[rackRow][rackCol]
      ) {
        if (type === 'INBOUND') {
          baseInventory[rackRow][rackCol][level] = {
            cargoType: 'boxes',
            fillLevel: 0.9,
            cargoColor: color,
            isNew: true,
          }
        } else if (type === 'OUTBOUND' || type === 'PICKING') {
          baseInventory[rackRow][rackCol][level] = null
        }
      }
    })

    // Build racks and pallets
    for (let row = 0; row < numRows; row++) {
      const z = -halfW + 6 + row * rowSpacing

      for (let rack = 0; rack < racksPerRow; rack++) {
        const x = -halfL + 8 + rack * rackSpacing
        rows.push({ position: [x, 0, z], rackWidth, rackDepth, rackHeight, levels })

        for (let level = 0; level < levels; level++) {
          const inv = baseInventory[row][rack][level]
          if (inv) {
            const y = (level + 0.5) * (rackHeight / levels) + 0.1
            items.push({
              position: [x, y, z],
              cargoType: inv.cargoType,
              fillLevel: inv.fillLevel,
              cargoColor: inv.cargoColor,
              isNew: inv.isNew,
            })
          }
        }
      }
    }

    // ========== STAGING AREAS ==========
    // Inbound staging (near dock, morning)
    if (isMorningShift && hour >= 7) {
      const inboundCount = Math.max(0, 8 - Math.floor((timeIndex - 28) / 4))
      for (let i = 0; i < inboundCount; i++) {
        items.push({
          position: [-halfL + 10 + i * 2.5, 0, halfW - 8],
          cargoType: 'boxes',
          fillLevel: 0.9,
          cargoColor: COLORS.cargoGreen,
          isNew: true,
        })
      }
    }

    // Outbound staging (builds up in afternoon)
    if (isAfternoonShift) {
      const outboundCount = Math.min(10, Math.floor((timeIndex - 56) / 3))
      for (let i = 0; i < outboundCount; i++) {
        items.push({
          position: [halfL - 10 - i * 2.2, 0, halfW - 8],
          cargoType: 'boxes',
          fillLevel: 0.85,
          cargoColor: COLORS.cargoOrange,
        })
      }
    }

    // ========== FORKLIFTS ==========
    if (isWorkingHours) {
      const numForklifts = isMorningShift ? 3 : 4
      
      for (let i = 0; i < numForklifts; i++) {
        // Forklift position changes with time
        const fkRandom = createSeededRandom(77777 + i * 1000 + timeIndex)
        const aisleIndex = Math.floor(fkRandom() * (numRows - 1))
        const progressInAisle = fkRandom()
        
        const fkX = -halfL + 10 + progressInAisle * (length - 25)
        const fkZ = -halfW + 6 + aisleIndex * rowSpacing + rackDepth + aisleWidth / 2
        const rotation = fkRandom() > 0.5 ? 0 : Math.PI
        const carrying = fkRandom() > 0.4
        const palletColor = carrying ? cargoColors[Math.floor(fkRandom() * cargoColors.length)] : null

        trucks.push({
          position: [fkX, 0, fkZ],
          rotation,
          carryingPallet: carrying,
          palletColor,
        })
      }

      // Forklift at dock (loading/unloading)
      if (isMorningShift) {
        trucks.push({
          position: [-halfL + 8, 0, halfW - 12],
          rotation: Math.PI / 2,
          carryingPallet: quarterInHour % 2 === 0,
          palletColor: COLORS.cargoGreen,
        })
      } else {
        trucks.push({
          position: [halfL - 8, 0, halfW - 12],
          rotation: -Math.PI / 2,
          carryingPallet: quarterInHour % 2 === 1,
          palletColor: COLORS.cargoOrange,
        })
      }
    }

    return { rackingRows: rows, pallets: items, forklifts: trucks, activities: acts }
  }, [length, width, halfL, halfW, timeIndex])

  return (
    <group>
      {/* Racking */}
      {rackingRows.map((rack, i) => (
        <RackingUnit key={`rack-${i}`} {...rack} />
      ))}
      
      {/* Pallets with cargo */}
      {pallets.map((pallet, i) => (
        <PalletWithCargo key={`pallet-${i}-${timeIndex}`} {...pallet} />
      ))}
      
      {/* Forklifts */}
      {forklifts.map((fk, i) => (
        <Forklift key={`forklift-${i}-${timeIndex}`} {...fk} />
      ))}
      
      {/* Forklift path markers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, halfW - 5]}>
        <planeGeometry args={[length - 15, 4]} />
        <meshStandardMaterial color="#FDE047" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

// ==================== INFO LABEL ====================

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

// ==================== MAIN SCENE ====================

function WarehouseMonitoringScene({ geometry, docks, roof, warehouse, showRoof, timeIndex }) {
  const { length, width, height } = geometry

  return (
    <>
      <SceneSetup height={height} />

      <group>
        <Floor length={length} width={width} />
        <Walls length={length} width={width} height={height} />
        <DockBays3D docks={docks} geometry={geometry} />
        <WarehouseInventory geometry={geometry} timeIndex={timeIndex} />
        {showRoof && <RoofStructure length={length} width={width} height={height} roof={roof} />}
        <InfoLabel3D warehouse={warehouse} geometry={geometry} />
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, height / 2, 0]}
        onChange={() => invalidate()}
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

export function WarehouseMonitoring3DViewer({
  geometry,
  docks,
  roof,
  warehouse,
  timeIndex = 0,
  className = '',
}) {
  // Ensure valid geometry with defaults
  const safeGeometry = {
    length: geometry?.length || 102.5,
    width: geometry?.width || 68.3,
    height: geometry?.height || 12,
    columnSpacingM: geometry?.columnSpacingM || 6,
  }
  const { length, width, height } = safeGeometry
  const [showRoof, setShowRoof] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-800 rounded-xl">
        <p className="text-white">Không thể tải 3D. Vui lòng refresh trang.</p>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{
            position: [length * 0.8, height * 1.5, width * 1.2],
            fov: 50,
            near: 0.1,
            far: 500,
          }}
          dpr={[1, 1.5]}
          gl={{ 
            antialias: true, 
            powerPreference: 'high-performance',
            alpha: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0F172A')
          }}
          frameloop="demand"
        >
          <WarehouseMonitoringScene
            geometry={safeGeometry}
            docks={docks}
            roof={roof}
            warehouse={warehouse}
            showRoof={showRoof}
            timeIndex={timeIndex}
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

      {/* Inventory summary */}
      <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
        <p className="text-xs text-white/90 font-medium">Giám sát thời gian thực</p>
        <p className="text-[10px] text-white/60 mt-0.5">Hiển thị kiện hàng và kệ chứa</p>
      </div>
    </div>
  )
}
