import { memo, useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'
import { CAM_PRESETS } from '../../data/warehouseData'

export const CameraController = memo(function CameraController() {
  const { state, actions } = useWarehouse3D()
  const controlsRef = useRef()
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 60))
  const flyToRef = useRef(null)

  useEffect(() => {
    const preset = CAM_PRESETS[state.cameraMode]
    if (preset) {
      flyToRef.current = {
        fromPos: camera.position.clone(),
        toPos: new THREE.Vector3(...preset.pos),
        fromTarget: targetRef.current.clone(),
        toTarget: new THREE.Vector3(...preset.target),
        progress: 0,
      }
    }
  }, [state.cameraMode])

  useFrame((_, delta) => {
    if (flyToRef.current) {
      const fly = flyToRef.current
      fly.progress = Math.min(1, fly.progress + delta * 1.5)
      const t = 1 - Math.pow(1 - fly.progress, 3) // ease out cubic

      camera.position.lerpVectors(fly.fromPos, fly.toPos, t)
      targetRef.current.lerpVectors(fly.fromTarget, fly.toTarget, t)

      if (controlsRef.current) {
        controlsRef.current.target.copy(targetRef.current)
      }
      camera.lookAt(targetRef.current)

      if (fly.progress >= 1) flyToRef.current = null
    }

    if (state.cameraMode === 'flythrough') {
      const time = Date.now() * 0.0001
      const radius = 500
      camera.position.x = Math.sin(time) * radius
      camera.position.y = 200
      camera.position.z = Math.cos(time) * radius
      camera.lookAt(0, 0, 60)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 60)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={30}
      maxDistance={900}
      maxPolarAngle={Math.PI * 0.48}
      target={[0, 0, 60]}
      enabled={state.cameraMode !== 'flythrough'}
    />
  )
})
