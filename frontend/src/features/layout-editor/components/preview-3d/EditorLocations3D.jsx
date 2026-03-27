import * as THREE from 'three'
import { Text } from '@react-three/drei'

export default function EditorLocations3D({ locations }) {
  if (!locations?.length) return null

  return (
    <group>
      {locations.map((loc) => {
        const col = new THREE.Color(loc.color)
        return (
          <group key={loc.id}>
            {/* Floor marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[loc.cx, 0.03, loc.cz]}>
              <planeGeometry args={[loc.widthM, loc.depthM]} />
              <meshStandardMaterial
                color={col}
                transparent
                opacity={0.35}
                emissive={col}
                emissiveIntensity={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Thin border */}
            {[
              { pos: [loc.cx, 0.04, loc.cz - loc.depthM / 2], size: [loc.widthM, 0.01, 0.06] },
              { pos: [loc.cx, 0.04, loc.cz + loc.depthM / 2], size: [loc.widthM, 0.01, 0.06] },
              { pos: [loc.cx - loc.widthM / 2, 0.04, loc.cz], size: [0.06, 0.01, loc.depthM] },
              { pos: [loc.cx + loc.widthM / 2, 0.04, loc.cz], size: [0.06, 0.01, loc.depthM] },
            ].map((b, i) => (
              <mesh key={i} position={b.pos}>
                <boxGeometry args={b.size} />
                <meshStandardMaterial color={loc.color} />
              </mesh>
            ))}

            {/* Label */}
            <Text
              position={[loc.cx, 0.1, loc.cz]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={Math.min(loc.widthM, loc.depthM) * 0.25}
              color={loc.color}
              anchorX="center"
              anchorY="middle"
            >
              {loc.code}
            </Text>
          </group>
        )
      })}
    </group>
  )
}
