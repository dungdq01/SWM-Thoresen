import { Line } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'

export default function GridLayer() {
  const { state } = useLayoutEditor()
  const wh = state.warehouse
  if (!wh || !state.showGrid) return null

  const ppm = state.pixelsPerMeter
  const gridPx = state.gridSize * ppm
  const wPx = wh.lengthM * ppm
  const hPx = wh.widthM * ppm

  const lines = []
  const stroke = '#e2e8f0'
  const strokeWidth = 0.5

  // Vertical lines
  for (let x = 0; x <= wPx; x += gridPx) {
    lines.push(
      <Line key={`v-${x}`} points={[x, 0, x, hPx]} stroke={stroke} strokeWidth={strokeWidth} />,
    )
  }

  // Horizontal lines
  for (let y = 0; y <= hPx; y += gridPx) {
    lines.push(
      <Line key={`h-${y}`} points={[0, y, wPx, y]} stroke={stroke} strokeWidth={strokeWidth} />,
    )
  }

  return <>{lines}</>
}
