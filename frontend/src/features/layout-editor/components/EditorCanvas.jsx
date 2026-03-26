import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { calculateScale, snapToGrid } from '../utils/coordTransform'
import { ZONE_TYPE_COLORS } from '../utils/layoutSerializer'
import { checkZoneCollision, isWithinWarehouseBounds } from '../utils/collisionDetect'
import GridLayer from './GridLayer'
import SelectionTransformer from './SelectionTransformer'
import WallShape from '../shapes/WallShape'
import ZoneShape from '../shapes/ZoneShape'
import RackShape from '../shapes/RackShape'
import LocationShape from '../shapes/LocationShape'

let tempIdCounter = 0

export default function EditorCanvas() {
  const containerRef = useRef()
  const stageRef = useRef()
  const { state, actions } = useLayoutEditor()
  const wh = state.warehouse
  const [warning, setWarning] = useState(null)

  // Auto-fit on mount
  useEffect(() => {
    if (!wh || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ppm = calculateScale(wh.lengthM, wh.widthM, rect.width, rect.height, 80)
    actions.setPixelsPerMeter(ppm)
    actions.setOffset(80, 40)
  }, [wh?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      const direction = e.evt.deltaY > 0 ? -1 : 1
      const factor = 1.08
      const newScale = direction > 0 ? oldScale * factor : oldScale / factor
      const clampedScale = Math.max(0.1, Math.min(5, newScale))

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      stage.scale({ x: clampedScale, y: clampedScale })
      stage.position({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      })
    },
    [],
  )

  // Click on empty canvas -> deselect
  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) {
      actions.deselect()
    }
  }

  // Drawing mode - mousedown to start, mouseup to finish
  const handleMouseDown = (e) => {
    if (!['draw-zone', 'draw-rack', 'draw-location'].includes(state.activeTool)) return
    if (e.target !== e.target.getStage()) return

    const stage = stageRef.current
    const pos = stage.getPointerPosition()
    const scale = stage.scaleX()
    const stagePos = stage.position()

    const canvasX = (pos.x - stagePos.x) / scale
    const canvasY = (pos.y - stagePos.y) / scale
    const xM = canvasX / state.pixelsPerMeter
    const yM = canvasY / state.pixelsPerMeter

    const snappedX = state.snapEnabled ? snapToGrid(xM, state.gridSize) : xM
    const snappedY = state.snapEnabled ? snapToGrid(yM, state.gridSize) : yM

    actions.setDrawing(true, { xM: snappedX, yM: snappedY })
  }

  const handleMouseUp = () => {
    if (!state.isDrawing || !state.drawStart) {
      actions.setDrawing(false, null)
      return
    }

    const stage = stageRef.current
    const pos = stage.getPointerPosition()
    const scale = stage.scaleX()
    const stagePos = stage.position()

    const canvasX = (pos.x - stagePos.x) / scale
    const canvasY = (pos.y - stagePos.y) / scale
    let endXM = canvasX / state.pixelsPerMeter
    let endYM = canvasY / state.pixelsPerMeter

    if (state.snapEnabled) {
      endXM = snapToGrid(endXM, state.gridSize)
      endYM = snapToGrid(endYM, state.gridSize)
    }

    const x = Math.min(state.drawStart.xM, endXM)
    const y = Math.min(state.drawStart.yM, endYM)
    const w = Math.abs(endXM - state.drawStart.xM)
    const h = Math.abs(endYM - state.drawStart.yM)

    if (w >= 1 && h >= 1) {
      const tempId = `temp-${Date.now()}-${++tempIdCounter}`

      if (state.activeTool === 'draw-zone') {
        const newZone = {
          id: tempId,
          type: 'zone',
          zoneCode: `Z-${String(state.zones.length + 1).padStart(2, '0')}`,
          zoneName: `Zone ${state.zones.length + 1}`,
          zoneType: 'STORAGE',
          xM: x,
          yM: y,
          widthM: w,
          depthM: h,
          rotationDeg: 0,
          displayColor: ZONE_TYPE_COLORS.STORAGE,
          sortOrder: state.zones.length + 1,
        }

        // Collision detection
        const collision = checkZoneCollision(newZone, state.zones)
        if (collision.collides) {
          setWarning(`Zone chồng lấn với ${collision.collidingWith}!`)
          setTimeout(() => setWarning(null), 3000)
        }
        // Bounds check
        if (wh && !isWithinWarehouseBounds(newZone, wh.lengthM, wh.widthM)) {
          setWarning('Zone vượt ngoài biên kho!')
          setTimeout(() => setWarning(null), 3000)
        }

        actions.addZone(newZone)
      } else if (state.activeTool === 'draw-rack') {
        const idx = state.racks.length + 1
        actions.addRack({
          id: tempId,
          _isNew: true,
          type: 'rack',
          rackCode: `R-${String(idx).padStart(2, '0')}`,
          rackName: `Rack ${idx}`,
          rackType: 'SELECTIVE',
          xM: x,
          yM: y,
          widthM: w,
          depthM: h,
          heightM: 6,
          rotationDeg: 0,
          levels: 3,
          baysPerLevel: Math.max(1, Math.round(h / 1.2)),
          displayColor: '#f97316',
        })
      } else if (state.activeTool === 'draw-location') {
        const idx = state.locations.length + 1
        actions.addLocation({
          id: tempId,
          type: 'location',
          locationCode: `LOC-${String(idx).padStart(3, '0')}`,
          locationType: 'STORAGE',
          locationProfile: 'STANDARD',
          xM: x,
          yM: y,
          widthM: w,
          depthM: h,
          rotationDeg: 0,
          displayColor: '#8b5cf6',
        })
      }
    }

    actions.setDrawing(false, null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't capture if input is focused
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          if (state.selectedType === 'zone') actions.deleteZone(state.selectedId)
          else if (state.selectedType === 'rack') actions.deleteRack(state.selectedId)
          else if (state.selectedType === 'location') actions.deleteLocation(state.selectedId)
        }
      }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); actions.undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); actions.redo() }
      if (e.key === 'Escape') { actions.deselect(); actions.setActiveTool('select') }
      if (e.key === 'v' || e.key === 'V') actions.setActiveTool('select')
      if (e.key === 'h' || e.key === 'H') actions.setActiveTool('pan')
      if (e.key === 'z' && !e.ctrlKey) actions.setActiveTool('draw-zone')
      if (e.key === 'r' || e.key === 'R') actions.setActiveTool('draw-rack')
      if (e.key === 'l' || e.key === 'L') actions.setActiveTool('draw-location')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.selectedId, state.selectedType, actions])

  if (!wh) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center text-slate-400">
        Đang tải dữ liệu kho...
      </div>
    )
  }

  const containerStyle = {
    cursor: state.activeTool === 'pan'
      ? 'grab'
      : ['draw-zone', 'draw-rack', 'draw-location'].includes(state.activeTool)
        ? 'crosshair'
        : 'default',
  }

  return (
    <div ref={containerRef} className="flex-1 bg-slate-50 overflow-hidden relative" style={containerStyle}>
      {warning && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {warning}
        </div>
      )}
      <Stage
        ref={stageRef}
        width={containerRef.current?.clientWidth || 800}
        height={containerRef.current?.clientHeight || 600}
        x={state.offsetX}
        y={state.offsetY}
        draggable={state.activeTool === 'pan'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <GridLayer />
          <WallShape />

          {state.zones.map((zone) => (
            <ZoneShape key={zone.id} zone={zone} isSelected={state.selectedId === zone.id} />
          ))}
          {state.racks.map((rack) => (
            <RackShape key={rack.id} rack={rack} isSelected={state.selectedId === rack.id} />
          ))}
          {state.locations.map((loc) => (
            <LocationShape key={loc.id} location={loc} isSelected={state.selectedId === loc.id} />
          ))}

          <SelectionTransformer stageRef={stageRef} />
        </Layer>
      </Stage>
    </div>
  )
}
