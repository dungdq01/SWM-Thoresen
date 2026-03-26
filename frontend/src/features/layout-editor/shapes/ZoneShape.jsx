import { useRef } from 'react'
import { Rect, Group, Text } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { snapToGrid } from '../utils/coordTransform'

const ZONE_TYPE_LABELS = {
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
      newX = snapToGrid(newX, state.gridSize)
      newY = snapToGrid(newY, state.gridSize)
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
      newW = snapToGrid(newW, state.gridSize)
      newH = snapToGrid(newH, state.gridSize)
      newX = snapToGrid(newX, state.gridSize)
      newY = snapToGrid(newY, state.gridSize)
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

  const fontSize = Math.max(10, Math.min(14, wPx / 8))

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
      <Rect
        width={wPx}
        height={hPx}
        fill={zone.displayColor || '#3b82f6'}
        opacity={isSelected ? 0.4 : 0.25}
        stroke={zone.displayColor || '#3b82f6'}
        strokeWidth={isSelected ? 2.5 : 1.5}
        dash={isSelected ? [] : [8, 4]}
        cornerRadius={2}
      />
      <Text
        text={zone.zoneCode}
        x={4}
        y={4}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#1e293b"
      />
      <Text
        text={ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
        x={4}
        y={4 + fontSize + 2}
        fontSize={fontSize - 2}
        fill="#475569"
      />
      {wPx > 60 && hPx > 50 && (
        <Text
          text={`${zone.widthM.toFixed(1)} x ${zone.depthM.toFixed(1)} m`}
          x={4}
          y={hPx - fontSize - 2}
          fontSize={fontSize - 2}
          fill="#64748b"
        />
      )}
    </Group>
  )
}
