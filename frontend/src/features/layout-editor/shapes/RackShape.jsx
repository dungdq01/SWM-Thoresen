import { useRef } from 'react'
import { Rect, Group, Text, Line } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid, snapToEdges } from '../utils/coordTransform'

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
      const edgeSnap = snapToEdges(newX, newY, rack.widthM, rack.depthM, state, rack.id)
      newX = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(newX, state.gridSize)
      newY = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(newY, state.gridSize)
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
      const edgeSnap = snapToEdges(newX, newY, newW, newH, state, rack.id)
      newX = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(newX, state.gridSize)
      newY = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(newY, state.gridSize)
      if (!edgeSnap.snappedX) newW = snapToGrid(newW, state.gridSize)
      if (!edgeSnap.snappedY) newH = snapToGrid(newH, state.gridSize)
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

  const rackColor = rack.displayColor || '#f97316'

  // Draw bay dividers
  const bayLines = []
  const bays = rack.baysPerLevel || 1
  if (bays > 1) {
    const bayWidth = hPx / bays
    for (let i = 1; i < bays; i++) {
      bayLines.push(
        <Line
          key={`bay-${i}`}
          points={[1, bayWidth * i, wPx - 1, bayWidth * i]}
          stroke={rackColor}
          strokeWidth={0.8}
          dash={[4, 3]}
          opacity={0.75}
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
      {/* Background fill with hatching pattern */}
      <Rect
        width={wPx}
        height={hPx}
        fill={rackColor}
        opacity={isSelected ? 0.5 : 0.3}
      />

      {/* Border */}
      <Rect
        width={wPx}
        height={hPx}
        fill="transparent"
        stroke={rackColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={wPx + 4}
          height={hPx + 4}
          fill="transparent"
          stroke="#ea580c"
          strokeWidth={1}
          dash={[4, 3]}
          opacity={0.7}
        />
      )}

      {/* Diagonal hatching lines for rack pattern */}
      {wPx > 15 && hPx > 15 && Array.from({ length: Math.ceil((wPx + hPx) / 7) }, (_, i) => {
        const offset = i * 7
        const x1 = Math.max(0, offset - hPx)
        const y1 = Math.min(hPx, offset)
        const x2 = Math.min(wPx, offset)
        const y2 = Math.max(0, offset - wPx)
        return (
          <Line
            key={`hatch-${i}`}
            points={[x1, y1, x2, y2]}
            stroke={rackColor}
            strokeWidth={0.4}
            opacity={0.35}
          />
        )
      })}

      {/* Bay dividers */}
      {bayLines}

      {/* Label badge */}
      <Rect
        x={2}
        y={2}
        width={Math.min(wPx - 4, fontSize * rack.rackCode.length * 0.65 + 8)}
        height={fontSize + (wPx > 40 ? fontSize + 2 : 4)}
        fill="rgba(255,255,255,0.92)"
        cornerRadius={2}
      />
      <Text
        text={rack.rackCode}
        x={4}
        y={3}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#9a3412"
      />
      {wPx > 40 && (
        <Text
          text={`L${rack.levels || 1} / B${rack.baysPerLevel || 1}`}
          x={4}
          y={3 + fontSize + 1}
          fontSize={fontSize - 1}
          fill="#78350f"
        />
      )}
    </Group>
  )
}
