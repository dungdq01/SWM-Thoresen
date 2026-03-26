import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva'
import { useSiteLayout, useSaveSiteLayout } from '@domains/master-data/hooks/useLayout'
import { useState } from 'react'
import { snapToGrid } from '../utils/coordTransform'

const SITE_ID = 'TVL-SITE'
const PIXELS_PER_METER = 1.5
const GRID_SIZE = 10 // meters

export default function SiteMapEditor() {
  const navigate = useNavigate()
  const containerRef = useRef()
  const stageRef = useRef()
  const { data: siteData, isLoading } = useSiteLayout(SITE_ID)
  const saveSiteLayout = useSaveSiteLayout()

  const [warehouses, setWarehouses] = useState([])
  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (siteData) {
      setWarehouses(
        siteData.warehouses.map((wh) => ({
          id: wh.id,
          code: wh.warehouseCode,
          name: wh.warehouseName,
          type: wh.warehouseType,
          lengthM: Number(wh.lengthM) || 60,
          widthM: Number(wh.widthM) || 40,
          xM: Number(wh.siteXCoord) || 0,
          yM: Number(wh.siteYCoord) || 0,
          rotationDeg: Number(wh.siteRotationDeg) || 0,
          displayColor: wh.displayColor || '#3b82f6',
        })),
      )
      setElements(siteData.elements || [])
    }
  }, [siteData])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(0.1, Math.min(3, direction > 0 ? oldScale * 1.08 : oldScale / 1.08))
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    stage.scale({ x: newScale, y: newScale })
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [])

  const handleDragEnd = (idx, e) => {
    const newX = snapToGrid(e.target.x() / PIXELS_PER_METER, GRID_SIZE)
    const newY = snapToGrid(e.target.y() / PIXELS_PER_METER, GRID_SIZE)
    e.target.x(newX * PIXELS_PER_METER)
    e.target.y(newY * PIXELS_PER_METER)
    setWarehouses((prev) =>
      prev.map((wh, i) => (i === idx ? { ...wh, xM: newX, yM: newY } : wh)),
    )
    setIsDirty(true)
  }

  const handleSave = () => {
    saveSiteLayout.mutate(
      {
        siteId: SITE_ID,
        data: {
          warehouses: warehouses.map((wh) => ({
            id: wh.id,
            siteXCoord: wh.xM,
            siteYCoord: wh.yM,
            siteRotationDeg: wh.rotationDeg,
            displayColor: wh.displayColor,
          })),
          elements: elements.map((el) => ({
            ...(el.id ? { id: el.id } : {}),
            elementType: el.elementType,
            label: el.label,
            xCoord: Number(el.xCoord),
            yCoord: Number(el.yCoord),
            elementWidthM: Number(el.elementWidthM),
            elementDepthM: Number(el.elementDepthM),
            rotationDeg: Number(el.rotationDeg) || 0,
            metadata: el.metadata,
          })),
        },
      },
      { onSuccess: () => setIsDirty(false) },
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">Đang tải site map...</div>
  }

  const containerWidth = containerRef.current?.clientWidth || 1200
  const containerHeight = containerRef.current?.clientHeight || 800

  // Grid lines for site
  const gridLines = []
  const gridPx = GRID_SIZE * PIXELS_PER_METER
  const siteW = 800 * PIXELS_PER_METER
  const siteH = 600 * PIXELS_PER_METER
  for (let x = -siteW; x <= siteW; x += gridPx) {
    gridLines.push(<Line key={`sv-${x}`} points={[x, -siteH, x, siteH]} stroke="#f1f5f9" strokeWidth={0.5} />)
  }
  for (let y = -siteH; y <= siteH; y += gridPx) {
    gridLines.push(<Line key={`sh-${y}`} points={[-siteW, y, siteW, y]} stroke="#f1f5f9" strokeWidth={0.5} />)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700 text-sm">
          ← Quay lại
        </button>
        <div className="w-px h-5 bg-slate-300" />
        <h1 className="text-sm font-semibold text-slate-800">Site Map Editor: {SITE_ID}</h1>
        <div className="flex-1" />
        {isDirty && <span className="text-xs text-amber-600 mr-2">Chưa lưu</span>}
        <button
          onClick={handleSave}
          disabled={!isDirty || saveSiteLayout.isPending}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
        >
          {saveSiteLayout.isPending ? 'Đang lưu...' : 'Lưu Site Map'}
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 bg-slate-100 overflow-hidden">
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          x={containerWidth / 2}
          y={containerHeight / 2}
          draggable
          onWheel={handleWheel}
          onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}
        >
          <Layer>
            {gridLines}

            {/* Origin crosshair */}
            <Line points={[-20, 0, 20, 0]} stroke="#94a3b8" strokeWidth={1} />
            <Line points={[0, -20, 0, 20]} stroke="#94a3b8" strokeWidth={1} />

            {/* Warehouses */}
            {warehouses.map((wh, idx) => {
              const wPx = wh.lengthM * PIXELS_PER_METER
              const hPx = wh.widthM * PIXELS_PER_METER
              const isSelected = selectedId === wh.id
              return (
                <Group
                  key={wh.id}
                  x={wh.xM * PIXELS_PER_METER}
                  y={wh.yM * PIXELS_PER_METER}
                  draggable
                  onClick={(e) => { e.cancelBubble = true; setSelectedId(wh.id) }}
                  onDragEnd={(e) => handleDragEnd(idx, e)}
                >
                  <Rect
                    width={wPx}
                    height={hPx}
                    fill={wh.displayColor || '#3b82f6'}
                    opacity={isSelected ? 0.5 : 0.3}
                    stroke={isSelected ? '#1d4ed8' : wh.displayColor || '#3b82f6'}
                    strokeWidth={isSelected ? 2 : 1}
                    cornerRadius={2}
                  />
                  <Text
                    text={wh.code}
                    x={4}
                    y={4}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#1e293b"
                  />
                  <Text
                    text={wh.name}
                    x={4}
                    y={18}
                    fontSize={9}
                    fill="#475569"
                    width={wPx - 8}
                    ellipsis
                  />
                  <Text
                    text={`${wh.lengthM}x${wh.widthM}m`}
                    x={4}
                    y={hPx - 14}
                    fontSize={8}
                    fill="#64748b"
                  />
                </Group>
              )
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
