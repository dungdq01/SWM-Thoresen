import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

export const AmbientParticles = memo(function AmbientParticles() {
  const { state } = useWarehouse3D()
  const ref = useRef()
  const frameCount = useRef(0)
  const count = 200

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 900
      arr[i * 3 + 1] = Math.random() * 50 + 0.5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 700
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!ref.current || !state.effectsOn) return
    frameCount.current++
    if (frameCount.current % 3 !== 0) return
    const pos = ref.current.geometry.attributes.position.array
    const dt = delta * 3
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += dt * (0.5 + Math.sin(i) * 0.3)
      if (pos[i * 3 + 1] > 55) pos[i * 3 + 1] = 0.5
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (!state.effectsOn) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0x88aacc}
        size={0.5}
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  )
})
