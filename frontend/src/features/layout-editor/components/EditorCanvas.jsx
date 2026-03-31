import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { calculateScale, snapToGrid, snapToEdges } from '../utils/coordTransform'
import { ZONE_TYPE_COLORS } from '../utils/layoutSerializer'
import { checkZoneCollision, isWithinWarehouseBounds } from '../utils/collisionDetect'
import GridLayer from './GridLayer'
import SelectionTransformer from './SelectionTransformer'
import WallShape from '../shapes/WallShape'
import ZoneShape from '../shapes/ZoneShape'
import RackShape from '../shapes/RackShape'
import LocationShape from '../shapes/LocationShape'

let tempIdCounter = 0

const ZONE_TYPE_LABELS = {
  RECEIVING: 'Nhận hàng',
  STORAGE: 'Lưu trữ',
  STAGING: 'Tập kết',
  SHIPPING: 'Xuất hàng',
  QC: 'Kiểm định',
  DAMAGED: 'Hàng hỏng',
  RETURNS: 'Hàng trả',
}

/**
 * Find the parent zone color for a location based on position overlap
 */
function getParentZoneColor(location, zones) {
  const lx = location.xM
  const ly = location.yM
  const lw = location.widthM || 3
  const lh = location.depthM || 3
  const lcx = lx + lw / 2
  const lcy = ly + lh / 2

  for (const zone of zones) {
    if (
      lcx >= zone.xM &&
      lcx <= zone.xM + zone.widthM &&
      lcy >= zone.yM &&
      lcy <= zone.yM + zone.depthM
    ) {
      return zone.displayColor || null
    }
  }
  return null
}

export default function EditorCanvas() {
  const containerRef = useRef()
  const stageRef = useRef()
  const { state, actions } = useLayoutEditor()
  const wh = state.warehouse
  const [warning, setWarning] = useState(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [isPanningOverride, setIsPanningOverride] = useState(false) // Ctrl or Space held

  // Track container size with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Auto-fit warehouse into canvas whenever container or warehouse changes
  useEffect(() => {
    if (!wh || containerSize.width < 100 || containerSize.height < 100) return
    const padding = 60
    const ppm = calculateScale(wh.lengthM, wh.widthM, containerSize.width, containerSize.height, padding)
    actions.setPixelsPerMeter(ppm)
    // Center warehouse in canvas
    const whPxW = wh.lengthM * ppm
    const whPxH = wh.widthM * ppm
    const offX = (containerSize.width - whPxW) / 2
    const offY = (containerSize.height - whPxH) / 2
    actions.setOffset(offX, offY)
  }, [wh?.id, containerSize.width, containerSize.height]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Middle mouse button panning
  const handleMouseDown = (e) => {
    // Middle mouse button (button 1) → start pan via stage drag
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      setIsPanningOverride(true)
      const stage = stageRef.current
      if (stage) stage.draggable(true)
      return
    }

    // Skip draw if panning override is active
    if (isPanningOverride) return

    // Drawing mode - mousedown to start, mouseup to finish
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

  const handleMouseUp = (e) => {
    // Release middle mouse button pan
    if (e && e.evt && e.evt.button === 1) {
      setIsPanningOverride(false)
      return
    }

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
          isPlaced: true,
          widthM: w,
          depthM: h,
          rotationDeg: 0,
          displayColor: ZONE_TYPE_COLORS.STORAGE,
          sortOrder: state.zones.length + 1,
        }

        const collision = checkZoneCollision(newZone, state.zones)
        if (collision.collides) {
          setWarning(`Zone chồng lấn với ${collision.collidingWith}!`)
          setTimeout(() => setWarning(null), 3000)
        }
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
          isPlaced: true,
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
          isPlaced: true,
          widthM: w,
          depthM: h,
          rotationDeg: 0,
          displayColor: '#8b5cf6',
        })
      }
    }

    actions.setDrawing(false, null)
  }

  // Keyboard shortcuts + Ctrl/Space pan override
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return

      // Ctrl or Space → enable pan override
      if (e.key === 'Control' || e.key === ' ') {
        e.preventDefault()
        setIsPanningOverride(true)
        return
      }

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
    const handleKeyUp = (e) => {
      if (e.key === 'Control' || e.key === ' ') {
        setIsPanningOverride(false)
      }
    }
    // If window loses focus while key is held, reset
    const handleBlur = () => setIsPanningOverride(false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [state.selectedId, state.selectedType, actions])

  // Handle drop from ElementPalette (must be before early return to satisfy Rules of Hooks)
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/layout-element')
      if (!raw || !wh) return

      try {
        const { id, type } = JSON.parse(raw)
        const stage = stageRef.current
        if (!stage) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const stageX = stage.x()
        const stageY = stage.y()
        const scale = stage.scaleX()

        const canvasX = (e.clientX - containerRect.left - stageX) / scale
        const canvasY = (e.clientY - containerRect.top - stageY) / scale
        let xM = canvasX / state.pixelsPerMeter
        let yM = canvasY / state.pixelsPerMeter

        // Find element size for edge snapping
        let elW = 3, elH = 3
        if (type === 'zone') {
          const z = state.zones.find((z) => z.id === id)
          if (z) { elW = z.widthM; elH = z.depthM }
        } else if (type === 'rack') {
          const r = state.racks.find((r) => r.id === id)
          if (r) { elW = r.widthM; elH = r.depthM }
        } else if (type === 'location') {
          const l = state.locations.find((l) => l.id === id)
          if (l) { elW = l.widthM || 3; elH = l.depthM || 3 }
        }

        if (state.snapEnabled) {
          const edgeSnap = snapToEdges(xM, yM, elW, elH, state, id)
          xM = edgeSnap.snappedX ? edgeSnap.x : snapToGrid(xM, state.gridSize)
          yM = edgeSnap.snappedY ? edgeSnap.y : snapToGrid(yM, state.gridSize)
        }

        // Clamp within warehouse bounds
        xM = Math.max(0, Math.min(xM, wh.lengthM - elW))
        yM = Math.max(0, Math.min(yM, wh.widthM - elH))

        if (type === 'zone') actions.moveZone(id, xM, yM)
        else if (type === 'rack') actions.moveRack(id, xM, yM)
        else if (type === 'location') actions.moveLocation(id, xM, yM)

        actions.selectElement(id, type)
      } catch { /* ignore invalid data */ }
    },
    [state, wh, actions],
  )

  if (!wh) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
        Đang tải dữ liệu kho...
      </div>
    )
  }

  const canPan = isPanningOverride || state.activeTool === 'pan'

  const containerStyle = {
    cursor: canPan
      ? 'grab'
      : ['draw-zone', 'draw-rack', 'draw-location'].includes(state.activeTool)
        ? 'crosshair'
        : 'default',
  }

  const placedZones = state.zones.filter((z) => z.isPlaced)
  const placedRacks = state.racks.filter((r) => r.isPlaced)
  const placedLocations = state.locations.filter((l) => l.isPlaced)
  const totalZoneArea = placedZones.reduce((acc, z) => acc + z.widthM * z.depthM, 0)
  const whArea = wh.lengthM * wh.widthM
  const usagePercent = whArea > 0 ? ((totalZoneArea / whArea) * 100).toFixed(1) : '0'

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative"
      style={containerStyle}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Warning toast */}
      {warning && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {warning}
        </div>
      )}

      {/* Pan mode hint */}
      {isPanningOverride && (
        <div className="absolute top-3 right-3 z-40 bg-slate-700 text-white px-3 py-1.5 rounded-lg shadow text-xs font-medium flex items-center gap-1.5">
          <span>✋</span> Di chuyển canvas — thả phím để quay lại
        </div>
      )}

      {/* Active tool hint - HTML overlay */}
      {!isPanningOverride && ['draw-zone', 'draw-rack', 'draw-location'].includes(state.activeTool) && (
        <div className="absolute top-3 right-3 z-40 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow text-xs font-medium">
          {state.activeTool === 'draw-zone' && 'Kéo để vẽ Zone (Z) · Ctrl+kéo để di chuyển'}
          {state.activeTool === 'draw-rack' && 'Kéo để vẽ Rack (R) · Ctrl+kéo để di chuyển'}
          {state.activeTool === 'draw-location' && 'Kéo để vẽ Location (L) · Ctrl+kéo để di chuyển'}
        </div>
      )}

      {/* Legend - HTML overlay bottom-left */}
      <div className="absolute bottom-3 left-3 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-[10px]">
        <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Chú thích Zone</div>
        {Object.entries(ZONE_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 py-0.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color, opacity: 0.6, border: `1px dashed ${color}` }} />
            <span className="text-slate-500 dark:text-slate-400">{ZONE_TYPE_LABELS[type] || type}</span>
          </div>
        ))}
        <div className="border-t border-slate-200 dark:border-slate-600 mt-1.5 pt-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#f97316', opacity: 0.5, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255,255,255,0.5) 1px, rgba(255,255,255,0.5) 2px)' }} />
            <span className="text-slate-500 dark:text-slate-400">Rack / Kệ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#8b5cf6', opacity: 0.4, border: '1px solid #8b5cf6' }} />
            <span className="text-slate-500 dark:text-slate-400">Location / Vị trí</span>
          </div>
        </div>
      </div>

      {/* Stats - HTML overlay bottom-right */}
      <div className="absolute bottom-3 right-3 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-[10px]">
        <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Đã đặt</div>
        <div className="text-slate-500 dark:text-slate-400">Zone: <span className="font-medium text-slate-700 dark:text-slate-200">{placedZones.length}</span><span className="text-slate-400 dark:text-slate-500">/{state.zones.length}</span></div>
        <div className="text-slate-500 dark:text-slate-400">Rack: <span className="font-medium text-slate-700 dark:text-slate-200">{placedRacks.length}</span><span className="text-slate-400 dark:text-slate-500">/{state.racks.length}</span></div>
        <div className="text-slate-500 dark:text-slate-400">Vị trí: <span className="font-medium text-slate-700 dark:text-slate-200">{placedLocations.length}</span><span className="text-slate-400 dark:text-slate-500">/{state.locations.length}</span></div>
        <div className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Sử dụng: {usagePercent}%</div>
      </div>

      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={state.offsetX}
        y={state.offsetY}
        draggable={canPan}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <GridLayer />
          <WallShape />

          {/* Zones (bottom layer) — only render placed items */}
          {placedZones.map((zone) => (
            <ZoneShape key={zone.id} zone={zone} isSelected={state.selectedId === zone.id} />
          ))}

          {/* Locations (middle layer) — only render placed items */}
          {placedLocations.map((loc) => (
            <LocationShape
              key={loc.id}
              location={loc}
              isSelected={state.selectedId === loc.id}
              parentZoneColor={getParentZoneColor(loc, state.zones)}
            />
          ))}

          {/* Racks (top layer) — only render placed items */}
          {placedRacks.map((rack) => (
            <RackShape key={rack.id} rack={rack} isSelected={state.selectedId === rack.id} />
          ))}

          <SelectionTransformer stageRef={stageRef} />
        </Layer>
      </Stage>
    </div>
  )
}
