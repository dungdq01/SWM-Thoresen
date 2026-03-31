import { useRef } from 'react'
import { Rect, Group, Text, Line } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid, snapToEdges } from '../utils/coordTransform'

const ZONE_TYPE_LABELS = {
  RECEIVING: 'Receiving Zone',
  STORAGE: 'Storage Zone',
  STAGING: 'Staging Zone',
  SHIPPING: 'Shipping Zone',
  QC: 'QC Zone',
  DAMAGED: 'Damaged Zone',
  RETURNS: 'Returns Zone',
}

const ZONE_TYPE_SHORT = {
  RECEIVING: 'Nhận hàng',
  STORAGE: 'Lưu trữ',
  STAGING: 'Tập kết',
  SHIPPING: 'Xuất hàng',
  QC: 'Kiểm định',
  DAMAGED: 'Hàng hỏng',
  RETURNS: 'Hàng trả',
}

export default function ZoneShape({ zone, isSelected }) {
  const shapeRef = useRef()
  const { state, actions } = useLayoutEditor()
  const ppm = state.pixelsPerMeter

  const xPx = zone.xM * ppm
  const yPx = zone.yM * ppm
  const wPx = zone.widthM * ppm
  const hPx = zone.depthM * ppm

  const handleDragEnd = (e) => {
    let newX = e.target.x() / ppm
    let newY = e.target.y() / ppm
    if (state.snapEnabled) {
      const edgeSnap = snapToEdges(newX, newY, zone.widthM, zone.depthM, state, zone.id)
      newX = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(newX, state.gridSize)
      newY = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(newY, state.gridSize)
    }
    actions.moveZone(zone.id, newX, newY)
    e.target.x(newX * ppm)
    e.target.y(newY * ppm)
  }

  const handleTransformEnd = () => {
    const node = shapeRef.current
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    let newW = (zone.widthM * scaleX)
    let newH = (zone.depthM * scaleY)
    let newX = node.x() / ppm
    let newY = node.y() / ppm

    if (state.snapEnabled) {
      const edgeSnap = snapToEdges(newX, newY, newW, newH, state, zone.id)
      newX = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(newX, state.gridSize)
      newY = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(newY, state.gridSize)
      newW = edgeSnap.snappedX ? (newW + (newX === edgeSnap.x ? 0 : 0)) : snapToGrid(newW, state.gridSize)
      newH = edgeSnap.snappedY ? (newH + (newY === edgeSnap.y ? 0 : 0)) : snapToGrid(newH, state.gridSize)
      if (!edgeSnap.snappedX) newW = snapToGrid(newW, state.gridSize)
      if (!edgeSnap.snappedY) newH = snapToGrid(newH, state.gridSize)
    }

    newW = Math.max(newW, 2)
    newH = Math.max(newH, 2)

    node.scaleX(1)
    node.scaleY(1)
    node.width(newW * ppm)
    node.height(newH * ppm)
    node.x(newX * ppm)
    node.y(newY * ppm)

    actions.resizeZone(zone.id, newX, newY, newW, newH)
  }

  const handleClick = (e) => {
    e.cancelBubble = true
    actions.selectElement(zone.id, 'zone')
  }

  const zoneColor = zone.displayColor || '#3b82f6'
  const labelText = zone.zoneCode || ''
  const typeLabel = ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType || ''
  const typeShort = ZONE_TYPE_SHORT[zone.zoneType] || zone.zoneType || ''

  // Adaptive font sizes based on zone pixel size
  const badgeFontSize = Math.max(9, Math.min(13, wPx / 10))
  const centerFontSize = Math.max(12, Math.min(22, Math.min(wPx, hPx) / 5))
  const dimFontSize = Math.max(8, Math.min(11, wPx / 12))

  // Corner marker length scales with zone size
  const cornerLen = Math.max(6, Math.min(16, Math.min(wPx, hPx) / 8))

  // Dashed border
  const dashPattern = isSelected ? [] : [10, 5]
  const borderWidth = isSelected ? 3.5 : 2.5

  // Badge dimensions
  const badgeW = Math.min(wPx - 6, Math.max(55, labelText.length * badgeFontSize * 0.65 + 16))
  const badgeH = badgeFontSize * 2 + 10

  // Dimension text
  const dimText = `${zone.widthM.toFixed(1)} × ${zone.depthM.toFixed(1)} m`

  return (
    <Group
      ref={shapeRef}
      x={xPx}
      y={yPx}
      width={wPx}
      height={hPx}
      draggable={state.activeTool === 'select'}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      name="zone-shape"
      id={zone.id}
    >
      {/* Zone fill - semi-transparent with zone color */}
      <Rect
        width={wPx}
        height={hPx}
        fill={zoneColor}
        opacity={isSelected ? 0.32 : 0.22}
      />

      {/* Internal subtle grid pattern matching zone color */}
      {wPx > 40 && hPx > 40 && (
        <>
          {Array.from({ length: Math.floor(zone.widthM / 5) }, (_, i) => (
            <Line
              key={`zg-v-${i}`}
              points={[(i + 1) * 5 * ppm, 0, (i + 1) * 5 * ppm, hPx]}
              stroke={zoneColor}
              strokeWidth={0.3}
              opacity={0.08}
            />
          ))}
          {Array.from({ length: Math.floor(zone.depthM / 5) }, (_, i) => (
            <Line
              key={`zg-h-${i}`}
              points={[0, (i + 1) * 5 * ppm, wPx, (i + 1) * 5 * ppm]}
              stroke={zoneColor}
              strokeWidth={0.3}
              opacity={0.08}
            />
          ))}
        </>
      )}

      {/* Dashed border - thick and clear */}
      <Rect
        width={wPx}
        height={hPx}
        fill="transparent"
        stroke={zoneColor}
        strokeWidth={borderWidth}
        dash={dashPattern}
      />

      {/* Selection highlight glow */}
      {isSelected && (
        <Rect
          x={-3}
          y={-3}
          width={wPx + 6}
          height={hPx + 6}
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={2}
          dash={[6, 4]}
          opacity={0.6}
        />
      )}

      {/* Corner markers - L-shaped, thick, prominent */}
      {[
        // Top-left
        [0, cornerLen, 0, 0, cornerLen, 0],
        // Top-right
        [wPx - cornerLen, 0, wPx, 0, wPx, cornerLen],
        // Bottom-left
        [0, hPx - cornerLen, 0, hPx, cornerLen, hPx],
        // Bottom-right
        [wPx - cornerLen, hPx, wPx, hPx, wPx, hPx - cornerLen],
      ].map((pts, i) => (
        <Line
          key={`corner-${i}`}
          points={pts}
          stroke={zoneColor}
          strokeWidth={borderWidth + 1.5}
          opacity={0.85}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {/* Label badge - top-left corner, yellow background */}
      <Rect
        x={5}
        y={5}
        width={badgeW}
        height={badgeH}
        fill="#fefce8"
        stroke="#eab308"
        strokeWidth={1.2}
        cornerRadius={4}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={3}
        shadowOffsetY={1}
      />
      {/* Zone code (bold) */}
      <Text
        text={labelText}
        x={5 + 6}
        y={5 + 4}
        fontSize={badgeFontSize}
        fontStyle="bold"
        fill="#1e293b"
        fontFamily="monospace"
      />
      {/* Zone type short label */}
      <Text
        text={typeShort}
        x={5 + 6}
        y={5 + 4 + badgeFontSize + 2}
        fontSize={badgeFontSize - 2}
        fill="#92400e"
        fontStyle="italic"
      />

      {/* Center label - zone name, large and prominent */}
      {wPx > 70 && hPx > 50 && (
        <>
          {/* Zone type label (English) - above center */}
          <Text
            text={typeLabel}
            x={0}
            y={hPx / 2 - centerFontSize - 2}
            width={wPx}
            align="center"
            fontSize={centerFontSize * 0.7}
            fill={zoneColor}
            opacity={0.4}
            fontStyle="600"
          />
          {/* Zone name - center */}
          {zone.zoneName && (
            <Text
              text={zone.zoneName}
              x={0}
              y={hPx / 2 + 2}
              width={wPx}
              align="center"
              fontSize={centerFontSize}
              fill={zoneColor}
              opacity={0.6}
              fontStyle="bold"
            />
          )}
        </>
      )}

      {/* Dimension text at bottom-right with background */}
      {wPx > 50 && hPx > 40 && (
        <Group>
          <Rect
            x={wPx - dimText.length * dimFontSize * 0.55 - 12}
            y={hPx - dimFontSize - 10}
            width={dimText.length * dimFontSize * 0.55 + 8}
            height={dimFontSize + 6}
            fill="rgba(255,255,255,0.8)"
            cornerRadius={3}
          />
          <Text
            text={dimText}
            x={wPx - dimText.length * dimFontSize * 0.55 - 8}
            y={hPx - dimFontSize - 7}
            fontSize={dimFontSize}
            fill="#475569"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  )
}
