import * as THREE from 'three'
import { Text } from '@react-three/drei'

const TAPE_HEIGHT = 0.08
const TAPE_WIDTH = 0.12

function ZoneBorderTape({ cx, cz, widthM, depthM, color }) {
  const halfW = widthM / 2
  const halfD = depthM / 2
  const tapes = [
    { pos: [cx, TAPE_HEIGHT / 2, cz - halfD], size: [widthM, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [cx, TAPE_HEIGHT / 2, cz + halfD], size: [widthM, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [cx - halfW, TAPE_HEIGHT / 2, cz], size: [TAPE_WIDTH, TAPE_HEIGHT, depthM] },
    { pos: [cx + halfW, TAPE_HEIGHT / 2, cz], size: [TAPE_WIDTH, TAPE_HEIGHT, depthM] },
  ]

  return (
    <group>
      {tapes.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={t.size} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export default function EditorZones3D({ zones }) {
  if (!zones?.length) return null

  return (
    <group>
      {zones.map((zone) => {
        const col = new THREE.Color(zone.color)
        return (
          <group key={zone.id}>
            {/* Floor marking */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.cx, 0.02, zone.cz]}>
              <planeGeometry args={[zone.widthM, zone.depthM]} />
              <meshStandardMaterial
                color={col}
                transparent
                opacity={0.2}
                emissive={col}
                emissiveIntensity={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Border tapes */}
            <ZoneBorderTape
              cx={zone.cx}
              cz={zone.cz}
              widthM={zone.widthM}
              depthM={zone.depthM}
              color={zone.color}
            />

            {/* Label */}
            <Text
              position={[zone.cx, 0.15, zone.cz]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={Math.min(zone.widthM, zone.depthM) * 0.2}
              color={zone.color}
              anchorX="center"
              anchorY="middle"
              maxWidth={zone.widthM * 0.9}
            >
              {zone.code || zone.name}
            </Text>
          </group>
        )
      })}
    </group>
  )
}
