import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { TRUCK_COLORS, TRUCK_ROUTE_DEFINITIONS, precomputeSegments, getPositionOnRoute } from '../../data/truckRoutes'
import { Truck } from './Truck'

export const TruckGroup = memo(function TruckGroup() {
  const trucksRef = useRef([])

  const routes = useMemo(() => {
    return TRUCK_ROUTE_DEFINITIONS.map((waypoints, i) => {
      const { segDists, totalDist } = precomputeSegments(waypoints)
      return {
        waypoints,
        segDists,
        totalDist,
        speed: 0.25 + (i * 0.03),
        progress: 0,
        color: TRUCK_COLORS[i % TRUCK_COLORS.length],
      }
    })
  }, [])

  const progressRef = useRef(routes.map(() => 0))

  useFrame((_, delta) => {
    routes.forEach((route, i) => {
      const ref = trucksRef.current[i]
      if (!ref) return

      progressRef.current[i] += route.speed * delta * 30
      if (progressRef.current[i] > route.totalDist) {
        progressRef.current[i] = 0
      }

      const progress = progressRef.current[i] / route.totalDist
      const { x, z, angle } = getPositionOnRoute(route.waypoints, route.segDists, route.totalDist, progress)

      ref.position.x = x
      ref.position.z = z
      ref.rotation.y = angle
    })
  })

  return (
    <group>
      {routes.map((route, i) => (
        <group key={i} ref={el => { trucksRef.current[i] = el }}>
          <Truck color={route.color} />
        </group>
      ))}
    </group>
  )
})
