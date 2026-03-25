import { memo } from 'react'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

export const SceneLighting = memo(function SceneLighting() {
  const { state } = useWarehouse3D()
  const isDay = state.isDay

  return (
    <>
      <ambientLight
        color={isDay ? 0x6a7a9a : 0x4a5a7a}
        intensity={isDay ? 1.0 : 0.7}
      />
      <directionalLight
        color={isDay ? 0xffeedd : 0xfff8e8}
        intensity={isDay ? 3.0 : 2.5}
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
      <hemisphereLight
        args={[isDay ? 0x99bbee : 0x7799cc, 0x223322, isDay ? 0.8 : 0.6]}
      />
      <directionalLight
        color={0x6688aa}
        intensity={0.5}
        position={[-200, 200, -150]}
      />
    </>
  )
})
