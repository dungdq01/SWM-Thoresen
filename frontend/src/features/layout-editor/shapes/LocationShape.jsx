import { useRef } from 'react'
import { Rect, Group, Text } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid } from '../utils/coordTransform'

export default function LocationShape({ location, isSelected }) {
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
      newX = snapToGrid(newX, state.gridSize)
      newY = snapToGrid(newY, state.gridSize)
    }
    actions.moveLocation(location.id, newX, newY)
    e.target.x(newX * ppm)
    e.target.y(newY * ppm)
  }

  const handleClick = (e) => {
    e.cancelBubble = true
    actions.selectElement(location.id, 'location')
  }

  const fontSize = Math.max(7, Math.min(10, wPx / 4))

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
      <Rect
        width={wPx}
        height={hPx}
        fill={location.displayColor || '#8b5cf6'}
        opacity={isSelected ? 0.5 : 0.3}
        stroke={location.displayColor || '#8b5cf6'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={1}
      />
      <Text
        text={location.locationCode}
        x={2}
        y={2}
        fontSize={fontSize}
        fill="#1e293b"
        width={wPx - 4}
        ellipsis
      />
    </Group>
  )
}
