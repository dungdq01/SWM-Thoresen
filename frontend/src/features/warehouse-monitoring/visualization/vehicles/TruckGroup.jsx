import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TRUCK_COLORS, TRUCK_ROUTE_DEFINITIONS, TRUCK_4D_OPERATIONS, precomputeSegments, getPositionOnRoute } from '../../data/truckRoutes'
import { WH_DATA } from '../../data/warehouseData'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'
import { Truck } from './Truck'

// Shared ref so AnimatedGoods4D can read live truck state
export const truckPositions = { current: [] }
// phase: 'patrol' | 'toDock' | 'docked' | 'departing'
export const truckPhases = { current: [] }

// Cargo boxes visible on truck bed when carrying goods
const TruckCargo = memo(function TruckCargo({ visible, whType }) {
  const color = useMemo(() => {
    if (!whType) return 0xd4c5a0
    if (whType.includes('Container')) return 0x2563eb
    if (whType.includes('Bulk') || whType.includes('Clinker')) return 0x8b6914
    return 0xc9ba90
  }, [whType])

  if (!visible) return null

  return (
    <group>
      {/* Stack of cargo on truck bed */}
      <mesh position={[0, 5.5, 1]} castShadow>
        <boxGeometry args={[4.5, 1.8, 10]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[-1.2, 7, 0]} castShadow>
        <boxGeometry args={[2, 1.2, 8]} />
        <meshStandardMaterial color={new THREE.Color(color).offsetHSL(0, 0, -0.1)} roughness={0.8} />
      </mesh>
      <mesh position={[1.2, 7, 2]} castShadow>
        <boxGeometry args={[2, 1.2, 6]} />
        <meshStandardMaterial color={new THREE.Color(color).offsetHSL(0, 0.05, 0.05)} roughness={0.7} />
      </mesh>
    </group>
  )
})

export const TruckGroup = memo(function TruckGroup() {
  const trucksRef = useRef([])
  const { state } = useWarehouse3D()

  const routes = useMemo(() => {
    return TRUCK_ROUTE_DEFINITIONS.map((waypoints, i) => {
      const { segDists, totalDist } = precomputeSegments(waypoints)
      return { waypoints, segDists, totalDist, speed: 0.25 + (i * 0.03), color: TRUCK_COLORS[i % TRUCK_COLORS.length] }
    })
  }, [])

  // Compute docking positions from warehouse data
  const dockingTargets = useMemo(() => {
    return TRUCK_4D_OPERATIONS.map((op) => {
      const wh = WH_DATA[op.whIdx]
      if (!wh) return null
      return {
        x: wh.pos[0] + wh.width * 0.26,
        z: wh.pos[2] + wh.depth / 2 + 15,
        angle: Math.PI,
        whType: wh.type,
      }
    })
  }, [])

  const progressRef = useRef(routes.map(() => 0))
  const prev4DRef = useRef(false)

  // Per-truck 4D state
  // phase: 'patrol' → 'toDock' → 'docked' → 'departing' → 'patrol' (loop)
  const stateRef = useRef(routes.map(() => ({
    phase: 'patrol',
    lerpT: 0,           // lerp progress for toDock / departing transitions
    fromPos: { x: 0, z: 0, angle: 0 },
    dockTimer: 0,        // time spent docked (for loading)
    hasCargo: false,     // show cargo on truck
    cycleCount: 0,       // how many dock cycles completed
  })))

  // Cargo visibility state (triggers re-render)
  const cargoVisRef = useRef(routes.map(() => false))

  useFrame((_, delta) => {
    const is4D = state.mode4D
    const DOCK_DURATION = 5 // seconds at dock loading/unloading
    const LERP_SPEED = 0.6  // speed of travel to/from dock

    // Detect 4D toggle-on: snapshot positions, start toDock
    if (is4D && !prev4DRef.current) {
      routes.forEach((_, i) => {
        const ref = trucksRef.current[i]
        const s = stateRef.current[i]
        if (ref) {
          s.fromPos = { x: ref.position.x, z: ref.position.z, angle: ref.rotation.y }
        }
        s.phase = 'toDock'
        s.lerpT = 0
        s.dockTimer = 0
        s.hasCargo = false
      })
    }
    // Detect 4D toggle-off: go back to patrol immediately
    if (!is4D && prev4DRef.current) {
      routes.forEach((_, i) => {
        stateRef.current[i].phase = 'patrol'
        stateRef.current[i].hasCargo = false
        stateRef.current[i].lerpT = 0
      })
    }
    prev4DRef.current = is4D

    routes.forEach((route, i) => {
      const ref = trucksRef.current[i]
      if (!ref) return

      const s = stateRef.current[i]
      const dock = dockingTargets[i]

      if (is4D && dock) {
        switch (s.phase) {
          case 'toDock': {
            // Smoothly drive from current pos to docking position
            s.lerpT = Math.min(1, s.lerpT + LERP_SPEED * delta)
            const ease = s.lerpT * s.lerpT * (3 - 2 * s.lerpT)
            ref.position.x = s.fromPos.x + (dock.x - s.fromPos.x) * ease
            ref.position.z = s.fromPos.z + (dock.z - s.fromPos.z) * ease
            // Smooth rotation toward dock
            let angleDiff = dock.angle - ref.rotation.y
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
            ref.rotation.y += angleDiff * 0.08

            if (s.lerpT >= 1) {
              s.phase = 'docked'
              s.dockTimer = 0
            }
            break
          }

          case 'docked': {
            // Stay at dock, loading/unloading in progress
            ref.position.x = dock.x
            ref.position.z = dock.z
            s.dockTimer += delta

            // After loading duration, prepare to depart with cargo
            if (s.dockTimer >= DOCK_DURATION) {
              s.phase = 'departing'
              s.lerpT = 0
              s.hasCargo = true
              s.fromPos = { x: dock.x, z: dock.z, angle: ref.rotation.y }
              // Pick a random waypoint on the route to drive to
              const wpIdx = Math.floor(Math.random() * route.waypoints.length)
              s.departTarget = { x: route.waypoints[wpIdx][0], z: route.waypoints[wpIdx][1] }
            }
            break
          }

          case 'departing': {
            // Drive away from dock back to a road waypoint
            s.lerpT = Math.min(1, s.lerpT + LERP_SPEED * 0.5 * delta)
            const ease = s.lerpT * s.lerpT * (3 - 2 * s.lerpT)
            const target = s.departTarget
            ref.position.x = s.fromPos.x + (target.x - s.fromPos.x) * ease
            ref.position.z = s.fromPos.z + (target.z - s.fromPos.z) * ease

            // Face direction of travel
            const dx = target.x - s.fromPos.x
            const dz = target.z - s.fromPos.z
            if (Math.abs(dx) > 1 || Math.abs(dz) > 1) {
              const targetAngle = Math.atan2(dx, dz)
              let diff = targetAngle - ref.rotation.y
              while (diff > Math.PI) diff -= 2 * Math.PI
              while (diff < -Math.PI) diff += 2 * Math.PI
              ref.rotation.y += diff * 0.08
            }

            if (s.lerpT >= 1) {
              // Find closest segment on the route to resume patrol from
              let closestDist = Infinity
              let closestProgress = 0
              let accum = 0
              for (let j = 0; j < route.segDists.length; j++) {
                const wp = route.waypoints[j]
                const d = Math.sqrt((wp[0] - ref.position.x) ** 2 + (wp[1] - ref.position.z) ** 2)
                if (d < closestDist) {
                  closestDist = d
                  closestProgress = accum
                }
                accum += route.segDists[j]
              }
              progressRef.current[i] = closestProgress

              // Drive on route for a while with cargo, then come back to dock
              s.phase = 'patrolWithCargo'
              s.patrolTimer = 0
              s.patrolDuration = 6 + Math.random() * 4 // 6-10 sec patrol with cargo
            }
            break
          }

          case 'patrolWithCargo': {
            // Drive normal patrol route but with visible cargo
            progressRef.current[i] += route.speed * delta * 30
            if (progressRef.current[i] > route.totalDist) progressRef.current[i] = 0
            const progress = progressRef.current[i] / route.totalDist
            const pos = getPositionOnRoute(route.waypoints, route.segDists, route.totalDist, progress)
            ref.position.x = pos.x
            ref.position.z = pos.z
            ref.rotation.y = pos.angle

            s.patrolTimer += delta
            if (s.patrolTimer >= s.patrolDuration) {
              // Time to go back to dock again
              s.phase = 'toDock'
              s.lerpT = 0
              s.hasCargo = false
              s.fromPos = { x: ref.position.x, z: ref.position.z, angle: ref.rotation.y }
              s.cycleCount += 1
            }
            break
          }

          default: {
            // 'patrol' — should not happen in 4D, but fallback
            s.phase = 'toDock'
            s.lerpT = 0
            s.fromPos = { x: ref.position.x, z: ref.position.z, angle: ref.rotation.y }
            break
          }
        }
      } else {
        // Normal patrol mode (no 4D)
        progressRef.current[i] += route.speed * delta * 30
        if (progressRef.current[i] > route.totalDist) progressRef.current[i] = 0
        const progress = progressRef.current[i] / route.totalDist
        const pos = getPositionOnRoute(route.waypoints, route.segDists, route.totalDist, progress)
        ref.position.x = pos.x
        ref.position.z = pos.z
        ref.rotation.y = pos.angle
      }

      // Update shared state for AnimatedGoods4D
      if (!truckPositions.current[i]) truckPositions.current[i] = { x: 0, z: 0 }
      truckPositions.current[i].x = ref.position.x
      truckPositions.current[i].z = ref.position.z
      if (!truckPhases.current[i]) truckPhases.current[i] = 'patrol'
      truckPhases.current[i] = s.phase

      // Update cargo visibility (imperatively set on the cargo mesh)
      const cargoGroup = ref.children && ref.children[1] // TruckCargo group
      if (cargoGroup) {
        cargoGroup.visible = is4D && (s.hasCargo || s.phase === 'departing' || s.phase === 'patrolWithCargo')
      }
    })
  })

  return (
    <group>
      {routes.map((route, i) => {
        const op = TRUCK_4D_OPERATIONS[i]
        const wh = op ? WH_DATA[op.whIdx] : null
        return (
          <group key={i} ref={el => { trucksRef.current[i] = el }}>
            <Truck color={route.color} />
            <TruckCargo visible={false} whType={wh ? wh.type : null} />
          </group>
        )
      })}
    </group>
  )
})
