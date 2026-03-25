import { memo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

function SceneSetup() {
  const { state } = useWarehouse3D()
  const { scene } = useThree()

  const bgColor = state.isDay ? 0x1a2840 : 0x0a1628
  scene.background = new THREE.Color(bgColor)
  if (state.settings.fog) {
    scene.fog = new THREE.FogExp2(bgColor, state.isDay ? 0.0008 : 0.0012)
  } else {
    scene.fog = null
  }

  return null
}

export const SceneEnvironment = memo(function SceneEnvironment() {
  return (
    <>
      <SceneSetup />
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1000]} />
        <meshStandardMaterial color={0x0c1520} roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Sub-ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[3000, 2000]} />
        <meshStandardMaterial color={0x060a12} />
      </mesh>
    </>
  )
})
