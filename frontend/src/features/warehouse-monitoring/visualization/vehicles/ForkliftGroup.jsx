import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { FORKLIFT_PATHS, precomputeSegments, getPositionOnRoute } from '../../data/truckRoutes'
import { Forklift } from './Forklift'

export const ForkliftGroup = memo(function ForkliftGroup() {
  const forkliftsRef = useRef([])

  const paths = useMemo(() => {
    return FORKLIFT_PATHS.map((fp, i) => {
      const { segDists, totalDist } = precomputeSegments(fp.path)
      return { ...fp, waypoints: fp.path, segDists, totalDist }
    })
  }, [])

  const progressRef = useRef(paths.map((_, i) => i * 30))

  useFrame((_, delta) => {
    paths.forEach((path, i) => {
      const ref = forkliftsRef.current[i]
      if (!ref) return

      progressRef.current[i] += path.speed * delta * 30
      if (progressRef.current[i] > path.totalDist) {
        progressRef.current[i] = 0
      }

      const progress = progressRef.current[i] / path.totalDist
      const { x, z, angle } = getPositionOnRoute(path.waypoints, path.segDists, path.totalDist, progress)

      ref.position.x = x
      ref.position.z = z
      ref.rotation.y = angle
    })
  })

  return (
    <group>
      {paths.map((_, i) => (
        <group key={i} ref={el => { forkliftsRef.current[i] = el }}>
          <Forklift />
        </group>
      ))}
    </group>
  )
})
