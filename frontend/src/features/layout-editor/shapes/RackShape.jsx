import { useRef } from 'react'
import { Rect, Group, Text, Line } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid } from '../utils/coordTransform'

export default function RackShape({ rack, isSelected }) {
  const shapeRef = useRef()
  const { state, actions } = useLayoutEditor()
  const ppm = state.pixelsPerMeter

  const xPx = rack.xM * ppm
  const yPx = rack.yM * ppm
  const wPx = rack.widthM * ppm
  const hPx = rack.depthM * ppm

  const handleDragEnd = (e) => {
    let newX = e.target.x() / ppm
    let newY = e.target.y() / ppm
    if (state.snapEnabled) {
      newX = snapToGrid(newX, state.gridSize)
      newY = snapToGrid(newY, state.gridSize)
    }
    actions.moveRack(rack.id, newX, newY)
    e.target.x(newX * ppm)
    e.target.y(newY * ppm)
  }

  const handleTransformEnd = () => {
    const node = shapeRef.current
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    let newW = rack.widthM * scaleX
    let newH = rack.depthM * scaleY
    let newX = node.x() / ppm
    let newY = node.y() / ppm

    if (state.snapEnabled) {
      newW = snapToGrid(newW, state.gridSize)
      newH = snapToGrid(newH, state.gridSize)
      newX = snapToGrid(newX, state.gridSize)
      newY = snapToGrid(newY, state.gridSize)
    }

    newW = Math.max(newW, 1)
    newH = Math.max(newH, 1)

    node.scaleX(1)
    node.scaleY(1)
    node.width(newW * ppm)
    node.height(newH * ppm)
    node.x(newX * ppm)
    node.y(newY * ppm)

    actions.resizeRack(rack.id, newX, newY, newW, newH)
  }

  const handleClick = (e) => {
    e.cancelBubble = true
    actions.selectElement(rack.id, 'rack')
  }

  // Draw bay dividers
  const bayLines = []
  const bays = rack.baysPerLevel || 1
  if (bays > 1) {
    const bayWidth = hPx / bays
    for (let i = 1; i < bays; i++) {
      bayLines.push(
        <Line
          key={`bay-${i}`}
          points={[0, bayWidth * i, wPx, bayWidth * i]}
          stroke="#c2410c"
          strokeWidth={0.5}
          dash={[3, 3]}
        />,
      )
    }
  }

  const fontSize = Math.max(8, Math.min(11, wPx / 4))

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
      name="rack-shape"
      id={rack.id}
    >
      <Rect
        width={wPx}
        height={hPx}
        fill={rack.displayColor || '#f97316'}
        opacity={isSelected ? 0.6 : 0.4}
        stroke={rack.displayColor || '#f97316'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={1}
      />
      {bayLines}
      <Text
        text={rack.rackCode}
        x={2}
        y={2}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#1e293b"
      />
      {wPx > 40 && (
        <Text
          text={`L${rack.levels || 1}`}
          x={2}
          y={2 + fontSize + 1}
          fontSize={fontSize - 1}
          fill="#78350f"
        />
      )}
    </Group>
  )
}
