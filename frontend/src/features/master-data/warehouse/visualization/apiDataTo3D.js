/**
 * Convert master-data API records (zones, racks, locations) → 3D visualization props.
 * API data uses xCoord/yCoord (top-left origin) + zoneWidthM/zoneDepthM etc.
 * 3D uses center-origin (cx/cz) with X=left/right, Y=up, Z=forward/back.
 */

function isPlaced(item) {
  return item.xCoord != null && item.yCoord != null
}

function toCenter(xCoord, yCoord, widthM, depthM, whLengthM, whWidthM) {
  return {
    cx: xCoord + widthM / 2 - whLengthM / 2,
    cz: yCoord + depthM / 2 - whWidthM / 2,
  }
}

/**
 * @param {{ lengthM, widthM, maxHeightM }} geometry
 * @param {Array} zones - API zone records
 * @param {Array} racks - API rack records
 * @param {Array} locations - API location records
 */
export function apiDataTo3DProps(geometry, zones, racks, locations) {
  const length = geometry.length || geometry.lengthM || 60
  const width = geometry.width || geometry.widthM || 40

  const zones3D = (zones || []).filter(isPlaced).map((z) => {
    const w = Number(z.zoneWidthM) || 10
    const d = Number(z.zoneDepthM) || 8
    const { cx, cz } = toCenter(Number(z.xCoord), Number(z.yCoord), w, d, length, width)
    return {
      id: z.id,
      code: z.zoneCode,
      name: z.zoneName,
      type: z.zoneType,
      cx, cz,
      widthM: w,
      depthM: d,
      color: z.displayColor || '#3b82f6',
    }
  })

  // Build zone color lookup so locations can inherit parent zone color
  const zoneColorMap = {}
  ;(zones || []).forEach((z) => {
    if (z.id && z.displayColor) zoneColorMap[z.id] = z.displayColor
  })

  const racks3D = (racks || []).filter(isPlaced).map((r) => {
    const w = Number(r.rackWidthM) || 2
    const d = Number(r.rackDepthM) || 8
    const { cx, cz } = toCenter(Number(r.xCoord), Number(r.yCoord), w, d, length, width)
    return {
      id: r.id,
      code: r.rackCode,
      name: r.rackName,
      cx, cz,
      widthM: w,
      depthM: d,
      heightM: Number(r.rackHeightM) || 6,
      levels: Number(r.levels) || 3,
      baysPerLevel: Number(r.baysPerLevel) || 4,
      color: r.displayColor || '#f97316',
    }
  })

  const locations3D = (locations || []).filter(isPlaced).map((l) => {
    const w = Number(l.locationWidthM) || 2
    const d = Number(l.locationDepthM) || 2
    const { cx, cz } = toCenter(Number(l.xCoord), Number(l.yCoord), w, d, length, width)
    return {
      id: l.id,
      code: l.locationCode,
      type: l.locationType,
      cx, cz,
      widthM: w,
      depthM: d,
      color: l.displayColor || zoneColorMap[l.zoneId] || '#8b5cf6',
      doorConfig: l.doorConfig || null,
    }
  })

  return { zones3D, racks3D, locations3D }
}
