import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

const UPRIGHT_W = 0.1
const BEAM_H = 0.08
const SHELF_THICKNESS = 0.04

function SingleRack({ rack }) {
  const { cx, cz, widthM, depthM, heightM, levels, color } = rack
  const halfW = widthM / 2
  const halfD = depthM / 2
  const levelHeight = heightM / levels
  const col = useMemo(() => new THREE.Color(color), [color])

  const uprightMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.3 }),
    [col],
  )
  const beamMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: col, metalness: 0.5, roughness: 0.4 }),
    [col],
  )
  const shelfMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9CA3AF', metalness: 0.15, roughness: 0.75 }),
    [],
  )

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
        <mesh key={`up-${i}`} position={[ux, heightM / 2, uz]} castShadow material={uprightMat}>
          <boxGeometry args={[UPRIGHT_W, heightM, UPRIGHT_W]} />
        </mesh>
      ))}

      {/* Shelf beams + surfaces at each level */}
      {Array.from({ length: levels + 1 }, (_, lvl) => {
        const y = lvl * levelHeight
        return (
          <group key={`lvl-${lvl}`}>
            {/* Front beam */}
            <mesh position={[cx, y, cz - halfD]} material={beamMat}>
              <boxGeometry args={[widthM, BEAM_H, UPRIGHT_W]} />
            </mesh>
            {/* Back beam */}
            <mesh position={[cx, y, cz + halfD]} material={beamMat}>
              <boxGeometry args={[widthM, BEAM_H, UPRIGHT_W]} />
            </mesh>
            {/* Left side beam */}
            <mesh position={[cx - halfW, y, cz]} material={beamMat}>
              <boxGeometry args={[UPRIGHT_W, BEAM_H, depthM]} />
            </mesh>
            {/* Right side beam */}
            <mesh position={[cx + halfW, y, cz]} material={beamMat}>
              <boxGeometry args={[UPRIGHT_W, BEAM_H, depthM]} />
            </mesh>
            {/* Shelf surface (except bottom) */}
            {lvl > 0 && (
              <mesh position={[cx, y + BEAM_H / 2, cz]} material={shelfMat}>
                <boxGeometry args={[widthM - UPRIGHT_W, SHELF_THICKNESS, depthM]} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Cross bracing (X pattern on front/back sides) */}
      {[cz - halfD, cz + halfD].map((z, si) => {
        const diagLen = Math.sqrt(widthM ** 2 + heightM ** 2)
        const angle = Math.atan2(heightM, widthM)
        return (
          <group key={`brace-${si}`}>
            <mesh position={[cx, heightM / 2, z]} rotation={[0, 0, angle]}>
              <boxGeometry args={[diagLen, 0.04, 0.04]} />
              <meshStandardMaterial color={col} metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[cx, heightM / 2, z]} rotation={[0, 0, -angle]}>
              <boxGeometry args={[diagLen, 0.04, 0.04]} />
              <meshStandardMaterial color={col} metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* Base plate */}
      <mesh position={[cx, 0.02, cz]}>
        <boxGeometry args={[widthM + 0.2, 0.04, depthM + 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Label floating above rack */}
      <Text
        position={[cx, heightM + 0.8, cz]}
        fontSize={0.5}
        color="#f97316"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {rack.code || rack.name}
      </Text>

      {/* Level count label */}
      <Text
        position={[cx, heightM + 0.3, cz]}
        fontSize={0.3}
        color="#fb923c"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.6}
      >
        {`L${levels} / B${rack.baysPerLevel || 1}`}
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
