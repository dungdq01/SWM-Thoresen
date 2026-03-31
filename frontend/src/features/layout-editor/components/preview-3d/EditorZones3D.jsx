import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

const TAPE_HEIGHT = 0.15
const TAPE_WIDTH = 0.2

const ZONE_TYPE_LABELS = {
  RECEIVING: 'Nhận hàng',
  STORAGE: 'Lưu trữ',
  STAGING: 'Tập kết',
  SHIPPING: 'Xuất hàng',
  QC: 'Kiểm định',
  DAMAGED: 'Hàng hỏng',
  RETURNS: 'Hàng trả',
}

function ZoneBorderTape({ cx, cz, widthM, depthM, color }) {
  const halfW = widthM / 2
  const halfD = depthM / 2
  const tapes = [
    { pos: [cx, TAPE_HEIGHT / 2, cz - halfD], size: [widthM + TAPE_WIDTH, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [cx, TAPE_HEIGHT / 2, cz + halfD], size: [widthM + TAPE_WIDTH, TAPE_HEIGHT, TAPE_WIDTH] },
    { pos: [cx - halfW, TAPE_HEIGHT / 2, cz], size: [TAPE_WIDTH, TAPE_HEIGHT, depthM] },
    { pos: [cx + halfW, TAPE_HEIGHT / 2, cz], size: [TAPE_WIDTH, TAPE_HEIGHT, depthM] },
  ]

  return (
    <group>
      {tapes.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={t.size} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function ZoneFloorMarking({ zone }) {
  const col = useMemo(() => new THREE.Color(zone.color), [zone.color])
  const labelSize = Math.min(zone.widthM, zone.depthM) * 0.18
  const typeLabel = ZONE_TYPE_LABELS[zone.type] || zone.type || ''

  return (
    <group>
      {/* Floor marking - semi-transparent colored plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.cx, 0.08, zone.cz]}>
        <planeGeometry args={[zone.widthM, zone.depthM]} />
        <meshStandardMaterial
          color={col}
          transparent
          opacity={0.25}
          emissive={col}
          emissiveIntensity={0.12}
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

      {/* Corner posts */}
      {[
        [zone.cx - zone.widthM / 2, zone.cz - zone.depthM / 2],
        [zone.cx + zone.widthM / 2, zone.cz - zone.depthM / 2],
        [zone.cx - zone.widthM / 2, zone.cz + zone.depthM / 2],
        [zone.cx + zone.widthM / 2, zone.cz + zone.depthM / 2],
      ].map(([px, pz], i) => (
        <mesh key={`post-${i}`} position={[px, 0.4, pz]}>
          <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Zone type label */}
      {typeLabel && (
        <Text
          position={[zone.cx, 1.0, zone.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.max(0.8, labelSize * 0.7)}
          color={zone.color}
          anchorX="center"
          anchorY="middle"
          maxWidth={zone.widthM * 0.8}
          fillOpacity={0.6}
        >
          {typeLabel}
        </Text>
      )}

      {/* Zone name label */}
      {zone.name && (
        <Text
          position={[zone.cx, 0.8, zone.cz + zone.depthM * 0.3]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.max(0.6, labelSize * 0.5)}
          color={zone.color}
          anchorX="center"
          anchorY="middle"
          maxWidth={zone.widthM * 0.9}
          fillOpacity={0.4}
        >
          {zone.name}
        </Text>
      )}
    </group>
  )
}

export default function EditorZones3D({ zones }) {
  if (!zones?.length) return null

  return (
    <group>
      {zones.map((zone) => (
        <ZoneFloorMarking key={zone.id} zone={zone} />
      ))}
    </group>
  )
}
