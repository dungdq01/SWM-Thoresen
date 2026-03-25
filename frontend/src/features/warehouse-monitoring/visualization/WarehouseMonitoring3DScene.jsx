import { memo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'
import { SceneLighting } from './scene/SceneLighting'
import { SceneEnvironment } from './scene/SceneEnvironment'
import { RoadNetwork } from './scene/RoadNetwork'
import { GateArea } from './scene/GateArea'
import { WeighbridgeStation } from './scene/WeighbridgeStation'
import { ParkingArea } from './scene/ParkingArea'
import { TreesAndLandscape } from './scene/TreesAndLandscape'
import { AmbientParticles } from './scene/AmbientParticles'
import { WarehouseGroup } from './warehouses/WarehouseGroup'
import { TruckGroup } from './vehicles/TruckGroup'
import { ForkliftGroup } from './vehicles/ForkliftGroup'
import { HeatmapEffect } from './effects/HeatmapEffect'
import { AnimatedGoods4D } from './effects/AnimatedGoods4D'
import { CameraController } from './camera/CameraController'
import { OverlayContainer } from '../overlays/OverlayContainer'

function SceneContent() {
  const { state } = useWarehouse3D()
  return (
    <>
      <SceneLighting />
      <SceneEnvironment />
      {state.settings.grid && <gridHelper args={[1400, 56, '#1a2a40', '#0d1825']} position={[0, 0.05, 0]} />}
      <RoadNetwork />
      <GateArea position={[-340, 0, -50]} label="CỔNG VÀO" />
      <GateArea position={[340, 0, -50]} label="CỔNG RA" rotation={[0, Math.PI, 0]} />
      <WeighbridgeStation position={[-280, 0, -50]} />
      <WeighbridgeStation position={[-280, 0, -80]} />
      <ParkingArea />
      <TreesAndLandscape />
      {state.settings.vehicles && (
        <>
          <TruckGroup />
          <ForkliftGroup />
        </>
      )}
      <WarehouseGroup />
      <AmbientParticles />
      <HeatmapEffect />
      <AnimatedGoods4D />
      <CameraController />
    </>
  )
}

export const WarehouseMonitoring3DScene = memo(function WarehouseMonitoring3DScene() {
  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.4,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 55, near: 1, far: 6000, position: [0, 320, 380] }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <OverlayContainer />
    </div>
  )
})
