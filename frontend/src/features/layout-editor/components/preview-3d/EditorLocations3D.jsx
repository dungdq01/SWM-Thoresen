import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

function LocationMarker({ loc }) {
  const col = useMemo(() => new THREE.Color(loc.color), [loc.color])

  return (
    <group>
      {/* Floor marker - semi-transparent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[loc.cx, 0.05, loc.cz]}>
        <planeGeometry args={[loc.widthM, loc.depthM]} />
        <meshStandardMaterial
          color={col}
          transparent
          opacity={0.3}
          emissive={col}
          emissiveIntensity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Thin glowing border - 4 sides */}
      {[
        { pos: [loc.cx, 0.06, loc.cz - loc.depthM / 2], size: [loc.widthM, 0.02, 0.08] },
        { pos: [loc.cx, 0.06, loc.cz + loc.depthM / 2], size: [loc.widthM, 0.02, 0.08] },
        { pos: [loc.cx - loc.widthM / 2, 0.06, loc.cz], size: [0.08, 0.02, loc.depthM] },
        { pos: [loc.cx + loc.widthM / 2, 0.06, loc.cz], size: [0.08, 0.02, loc.depthM] },
      ].map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={loc.color} emissive={loc.color} emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Small corner dots */}
      {[
        [loc.cx - loc.widthM / 2, loc.cz - loc.depthM / 2],
        [loc.cx + loc.widthM / 2, loc.cz - loc.depthM / 2],
        [loc.cx - loc.widthM / 2, loc.cz + loc.depthM / 2],
        [loc.cx + loc.widthM / 2, loc.cz + loc.depthM / 2],
      ].map(([px, pz], i) => (
        <mesh key={`dot-${i}`} position={[px, 0.08, pz]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={loc.color} emissive={loc.color} emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Location code label */}
      <Text
        position={[loc.cx, 0.15, loc.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(loc.widthM, loc.depthM) * 0.22}
        color={loc.color}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {loc.code}
      </Text>
    </group>
  )
}

export default function EditorLocations3D({ locations }) {
  if (!locations?.length) return null

  return (
    <group>
      {locations.map((loc) => (
        <LocationMarker key={loc.id} loc={loc} />
      ))}
    </group>
  )
}
