import { useRef } from 'react'
import { Rect, Group, Text, Line } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid, snapToEdges } from '../utils/coordTransform'

export default function LocationShape({ location, isSelected, parentZoneColor }) {
  const shapeRef = useRef()
  const { state, actions } = useLayoutEditor()
  const ppm = state.pixelsPerMeter

  const xPx = location.xM * ppm
  const yPx = location.yM * ppm
  const wPx = (location.widthM || 3) * ppm
  const hPx = (location.depthM || 3) * ppm

  const handleDragEnd = (e) => {
    let newX = e.target.x() / ppm
    let newY = e.target.y() / ppm
    if (state.snapEnabled) {
      const w = location.widthM || 3
      const h = location.depthM || 3
      const edgeSnap = snapToEdges(newX, newY, w, h, state, location.id)
      newX = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(newX, state.gridSize)
      newY = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(newY, state.gridSize)
    }
    actions.moveLocation(location.id, newX, newY)
    e.target.x(newX * ppm)
    e.target.y(newY * ppm)
  }

  const handleClick = (e) => {
    e.cancelBubble = true
    actions.selectElement(location.id, 'location')
  }

  // Use parent zone color if available, otherwise fallback to location's own color
  const locColor = parentZoneColor || location.displayColor || '#8b5cf6'
  const fontSize = Math.max(7, Math.min(11, Math.min(wPx, hPx) / 4))
  const hasParentZone = !!parentZoneColor

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
      name="location-shape"
      id={location.id}
    >
      {/* Background fill */}
      <Rect
        width={wPx}
        height={hPx}
        fill={locColor}
        opacity={isSelected ? 0.38 : 0.22}
      />

      {/* Border - solid when inside zone, dashed when standalone */}
      <Rect
        width={wPx}
        height={hPx}
        fill="transparent"
        stroke={locColor}
        strokeWidth={isSelected ? 2.5 : (hasParentZone ? 1.2 : 1)}
        dash={isSelected ? [] : (hasParentZone ? [] : [4, 2])}
      />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-1.5}
          y={-1.5}
          width={wPx + 3}
          height={hPx + 3}
          fill="transparent"
          stroke="#7c3aed"
          strokeWidth={1}
          dash={[3, 3]}
          opacity={0.7}
        />
      )}

      {/* Location code - centered */}
      <Text
        text={location.locationCode}
        x={0}
        y={hPx / 2 - fontSize / 2}
        width={wPx}
        align="center"
        fontSize={fontSize}
        fontStyle="bold"
        fill="#1e293b"
        wrap="none"
        ellipsis
      />

      {/* Small type indicator at top-left */}
      {wPx > 30 && hPx > 25 && (
        <Group>
          <Rect
            x={1}
            y={1}
            width={Math.min(wPx * 0.35, 18)}
            height={fontSize + 2}
            fill={locColor}
            opacity={0.25}
            cornerRadius={[0, 0, 2, 0]}
          />
          <Text
            text={location.locationType === 'STORAGE' ? 'S' : location.locationType?.charAt(0) || 'S'}
            x={2}
            y={2}
            fontSize={fontSize - 1}
            fill={locColor}
            fontStyle="bold"
          />
        </Group>
      )}

      {/* Subtle corner accent */}
      {!isSelected && wPx > 20 && hPx > 20 && (
        <Line
          points={[wPx - 6, hPx, wPx, hPx - 6]}
          stroke={locColor}
          strokeWidth={0.5}
          opacity={0.3}
        />
      )}
    </Group>
  )
}
