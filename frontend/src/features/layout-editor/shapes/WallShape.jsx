import { Rect, Line, Text } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'

export default function WallShape() {
  const { state } = useLayoutEditor()
  const wh = state.warehouse
  if (!wh) return null

  const ppm = state.pixelsPerMeter
  const wPx = wh.lengthM * ppm
  const hPx = wh.widthM * ppm

  // Column grid (every 12m default for large warehouses)
  const columnSpacing = Math.max(8, Math.min(15, wh.lengthM / 5))
  const columns = []
  for (let cx = columnSpacing; cx < wh.lengthM; cx += columnSpacing) {
    for (let cy = columnSpacing; cy < wh.widthM; cy += columnSpacing) {
      columns.push(
        <Rect
          key={`col-${cx}-${cy}`}
          x={cx * ppm - 2}
          y={cy * ppm - 2}
          width={4}
          height={4}
          fill="#94a3b8"
          cornerRadius={1}
        />,
      )
    }
  }

  return (
    <>
      {/* Floor */}
      <Rect x={0} y={0} width={wPx} height={hPx} fill="#f1f5f9" cornerRadius={2} />

      {/* Walls (border) */}
      <Rect
        x={0}
        y={0}
        width={wPx}
        height={hPx}
        fill="transparent"
        stroke="#334155"
        strokeWidth={3}
        cornerRadius={2}
      />

      {/* Dimension labels */}
      <Text
        text={`${wh.lengthM.toFixed(1)} m`}
        x={wPx / 2 - 25}
        y={-18}
        fontSize={11}
        fill="#475569"
        fontStyle="bold"
      />
      <Text
        text={`${wh.widthM.toFixed(1)} m`}
        x={-40}
        y={hPx / 2 - 6}
        fontSize={11}
        fill="#475569"
        fontStyle="bold"
        rotation={-90}
      />

      {/* Dimension lines */}
      <Line points={[0, -8, wPx, -8]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[0, -12, 0, -4]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[wPx, -12, wPx, -4]} stroke="#94a3b8" strokeWidth={1} />

      <Line points={[-8, 0, -8, hPx]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[-12, 0, -4, 0]} stroke="#94a3b8" strokeWidth={1} />
      <Line points={[-12, hPx, -4, hPx]} stroke="#94a3b8" strokeWidth={1} />

      {/* Columns */}
      {columns}
    </>
  )
}
