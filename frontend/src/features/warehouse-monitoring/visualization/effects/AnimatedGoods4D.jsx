import { memo, useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WH_DATA } from '../../data/warehouseData'
import { TRUCK_4D_OPERATIONS } from '../../data/truckRoutes'
import { truckPositions, truckPhases } from '../vehicles/TruckGroup'
import { useWarehouse3D } from '../../hooks/useWarehouse3DStore'

// Uses API data if available, fallback to mock WH_DATA

// Single animated cargo item
const CargoItem = memo(function CargoItem({ startPos, midPos, endPos, speed, whType }) {
  const ref = useRef()
  const progressRef = useRef(0)
  const matRef = useRef()

  const geometry = useMemo(() => {
    if (whType.includes('Bulk') || whType.includes('Clinker') || whType.includes('hỗn hợp')) {
      return new THREE.CylinderGeometry(0.8, 1.5, 2.5, 8)
    } else if (whType.includes('Container')) {
      return new THREE.BoxGeometry(3, 2, 5)
    }
    return new THREE.BoxGeometry(2, 1.5, 2)
  }, [whType])

  const color = useMemo(() => {
    if (whType.includes('Container')) {
      return [0x2563eb, 0xdc2626, 0x059669, 0xd97706][Math.floor(Math.random() * 4)]
    }
    return [0xd4c5a0, 0xc9ba90, 0x8b6914, 0xb8a87a][Math.floor(Math.random() * 4)]
  }, [whType])

  const metalness = whType.includes('Container') ? 0.7 : 0.05
  const roughness = whType.includes('Container') ? 0.4 : 0.85

  useFrame((_, delta) => {
    if (!ref.current) return
    progressRef.current += speed * delta
    const t = Math.min(progressRef.current, 1)

    const t1 = 1 - t
    ref.current.position.x = t1 * t1 * startPos[0] + 2 * t1 * t * midPos[0] + t * t * endPos[0]
    ref.current.position.y = t1 * t1 * startPos[1] + 2 * t1 * t * midPos[1] + t * t * endPos[1]
    ref.current.position.z = t1 * t1 * startPos[2] + 2 * t1 * t * midPos[2] + t * t * endPos[2]
    ref.current.rotation.y += delta * 0.5

    if (matRef.current && t > 0.8) {
      matRef.current.opacity = Math.max(0, 1 - (t - 0.8) / 0.2)
    }
  })

  return (
    <mesh ref={ref} geometry={geometry} castShadow position={startPos}>
      <meshStandardMaterial ref={matRef} color={color} roughness={roughness} metalness={metalness} transparent />
    </mesh>
  )
})

export const AnimatedGoods4D = memo(function AnimatedGoods4D() {
  const { state } = useWarehouse3D()
  const [goods, setGoods] = useState([])
  const idCounter = useRef(0)

  // Use API data if available, fallback to mock WH_DATA
  const whData = state.warehouseData || WH_DATA

  useEffect(() => {
    if (!state.mode4D) {
      setGoods([])
      return
    }

    const spawn = () => {
      const newGoods = []
      TRUCK_4D_OPERATIONS.forEach((op) => {
        const wh = whData[op.whIdx]
        if (!wh) return

        // Only spawn goods when truck is docked at warehouse
        const phase = truckPhases.current[op.truckIdx]
        if (phase !== 'docked') return

        const truckPos = truckPositions.current[op.truckIdx]
        if (!truckPos) return

        const isInbound = op.type === 'inbound'

        // Truck position with slight scatter
        const truckX = truckPos.x + (Math.random() - 0.5) * 8
        const truckZ = truckPos.z + (Math.random() - 0.5) * 8

        // Inside warehouse position
        const insideX = wh.pos[0] + (Math.random() - 0.5) * wh.width * 0.5
        const insideZ = wh.pos[2] + (Math.random() - 0.5) * wh.depth * 0.4

        const startPos = isInbound
          ? [truckX, 3 + Math.random() * 3, truckZ]
          : [insideX, 1 + Math.random() * 2, insideZ]
        const endPos = isInbound
          ? [insideX, 1, insideZ]
          : [truckX, 3 + Math.random() * 3, truckZ]

        const midY = Math.max(startPos[1], endPos[1]) + 8 + Math.random() * 5
        const midPos = [
          (startPos[0] + endPos[0]) / 2 + (Math.random() - 0.5) * 6,
          midY,
          (startPos[2] + endPos[2]) / 2,
        ]

        idCounter.current += 1
        newGoods.push({
          id: idCounter.current,
          startPos,
          midPos,
          endPos,
          speed: 0.15 + Math.random() * 0.1,
          type: op.type,
          whType: wh.type,
          createdAt: Date.now(),
        })
      })

      setGoods(prev => {
        const now = Date.now()
        const filtered = prev.filter(g => now - g.createdAt < 8000)
        return [...filtered, ...newGoods]
      })
    }

    // Spawn every 1.5s (faster cycle since goods only appear when docked)
    const interval = setInterval(spawn, 1500)
    return () => clearInterval(interval)
  }, [state.mode4D, whData])

  if (!state.mode4D || goods.length === 0) return null

  return (
    <group>
      {goods.map(g => (
        <CargoItem
          key={g.id}
          startPos={g.startPos}
          midPos={g.midPos}
          endPos={g.endPos}
          speed={g.speed}
          whType={g.whType}
        />
      ))}
    </group>
  )
})
