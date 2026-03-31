/**
 * Convert layout editor state → 3D visualization props.
 * Transforms 2D editor coordinates (top-left origin, Y-down)
 * to Three.js center-origin coordinates (X=left/right, Y=up, Z=forward/back).
 */
import { deriveDocks, deriveRoof, computeColumnPositions } from '@features/master-data/warehouse/visualization/utils'

/**
 * Transform editor 2D position (top-left origin) to 3D center-origin.
 */
function toCenter(xM, yM, widthM, depthM, whLengthM, whWidthM) {
  return {
    cx: xM + widthM / 2 - whLengthM / 2,
    cz: yM + depthM / 2 - whWidthM / 2,
  }
}

/**
 * Build 3D props from layout editor state.
 * @param {object} state - layout editor state { warehouse, zones, racks, locations }
 * @returns {{ geometry, docks, roof, columnPositions, zones3D, racks3D, locations3D }}
 */
export function editorStateTo3DProps(state) {
  const wh = state.warehouse
  if (!wh) return null

  const length = wh.lengthM || 60
  const width = wh.widthM || 40
  const height = wh.heightM || wh.maxHeightM || 8

  const geometry = {
    length,
    width,
    height,
    columnSpacingM: 6,
    totalArea: length * width,
    usableArea: length * width * 0.9,
  }

  // Reuse existing utils for docks, roof, columns
  const warehouseForUtils = {
    warehouseType: wh.type || 'COVERED',
    totalAreaM2: geometry.totalArea,
    maxHeightM: height,
  }
  const docks = deriveDocks(warehouseForUtils, geometry)
  const roof = deriveRoof(warehouseForUtils)
  const columnPositions = computeColumnPositions(geometry)

  // Transform zones — only include placed items
  const zones3D = (state.zones || []).filter((z) => z.isPlaced).map((zone) => {
    const { cx, cz } = toCenter(zone.xM, zone.yM, zone.widthM, zone.depthM, length, width)
    return {
      id: zone.id,
      code: zone.zoneCode,
      name: zone.zoneName,
      type: zone.zoneType,
      cx,
      cz,
      widthM: zone.widthM,
      depthM: zone.depthM,
      color: zone.displayColor || '#3b82f6',
    }
  })

  // Build zone color lookup so locations can inherit parent zone color
  const zoneColorMap = {}
  ;(state.zones || []).forEach((z) => {
    if (z.id && z.displayColor) zoneColorMap[z.id] = z.displayColor
  })

  // Transform racks — only include placed items
  const racks3D = (state.racks || []).filter((r) => r.isPlaced).map((rack) => {
    const { cx, cz } = toCenter(rack.xM, rack.yM, rack.widthM, rack.depthM, length, width)
    return {
      id: rack.id,
      code: rack.rackCode,
      name: rack.rackName,
      cx,
      cz,
      widthM: rack.widthM,
      depthM: rack.depthM,
      heightM: rack.heightM || 6,
      levels: rack.levels || 3,
      baysPerLevel: rack.baysPerLevel || 4,
      color: rack.displayColor || '#f97316',
    }
  })

  // Transform locations — only placed, inherit zone color via zoneId
  const locations3D = (state.locations || []).filter((l) => l.isPlaced).map((loc) => {
    const { cx, cz } = toCenter(loc.xM, loc.yM, loc.widthM, loc.depthM, length, width)
    return {
      id: loc.id,
      code: loc.locationCode,
      type: loc.locationType,
      cx,
      cz,
      widthM: loc.widthM,
      depthM: loc.depthM,
      color: loc.displayColor || zoneColorMap[loc.zoneId] || '#8b5cf6',
      doorConfig: loc.doorConfig || null,
    }
  })

  return { geometry, docks, roof, columnPositions, zones3D, racks3D, locations3D }
}
