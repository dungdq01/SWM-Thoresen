import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

const UPRIGHT_W = 0.08
const BEAM_H = 0.06
const SHELF_THICKNESS = 0.03

function SingleRack({ rack }) {
  const { cx, cz, widthM, depthM, heightM, levels, color } = rack
  const halfW = widthM / 2
  const halfD = depthM / 2
  const levelHeight = heightM / levels
  const col = new THREE.Color(color)

  const uprights = useMemo(() => [
    [cx - halfW, cz - halfD],
    [cx + halfW, cz - halfD],
    [cx - halfW, cz + halfD],
    [cx + halfW, cz + halfD],
  ], [cx, halfW, cz, halfD])

  return (
    <group>
      {/* 4 corner uprights */}
      {uprights.map(([ux, uz], i) => (
        <mesh key={`up-${i}`} position={[ux, heightM / 2, uz]} castShadow>
          <boxGeometry args={[UPRIGHT_W, heightM, UPRIGHT_W]} />
          <meshStandardMaterial color={col} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Shelf beams at each level */}
      {Array.from({ length: levels + 1 }, (_, lvl) => {
        const y = lvl * levelHeight
        return (
          <group key={`lvl-${lvl}`}>
            {/* Front beam */}
            <mesh position={[cx, y, cz - halfD]}>
              <boxGeometry args={[widthM, BEAM_H, UPRIGHT_W]} />
              <meshStandardMaterial color={col} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Back beam */}
            <mesh position={[cx, y, cz + halfD]}>
              <boxGeometry args={[widthM, BEAM_H, UPRIGHT_W]} />
              <meshStandardMaterial color={col} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Shelf surface (except bottom) */}
            {lvl > 0 && (
              <mesh position={[cx, y + BEAM_H / 2, cz]}>
                <boxGeometry args={[widthM - UPRIGHT_W, SHELF_THICKNESS, depthM]} />
                <meshStandardMaterial color="#9CA3AF" metalness={0.1} roughness={0.8} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Cross bracing (X pattern on sides) */}
      {[cz - halfD, cz + halfD].map((z, si) => (
        <group key={`brace-${si}`}>
          <mesh
            position={[cx, heightM / 2, z]}
            rotation={[0, 0, Math.atan2(heightM, widthM)]}
          >
            <boxGeometry args={[Math.sqrt(widthM ** 2 + heightM ** 2), 0.03, 0.03]} />
            <meshStandardMaterial color={col} metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Label */}
      <Text
        position={[cx, heightM + 0.5, cz]}
        fontSize={0.4}
        color="#f97316"
        anchorX="center"
        anchorY="middle"
      >
        {rack.code || rack.name}
      </Text>
    </group>
  )
}

export default function EditorRacks3D({ racks }) {
  if (!racks?.length) return null

  return (
    <group>
      {racks.map((rack) => (
        <SingleRack key={rack.id} rack={rack} />
      ))}
    </group>
  )
}
