/**
 * Converts layout editor state to API payload and vice versa.
 */

/**
 * Convert editor state to SaveWarehouseLayoutDto payload
 */
export function toSavePayload(state) {
  // Save placed items with their coords, AND unplaced items (gỡ khỏi sơ đồ) with coords reset to 0
  return {
    lengthM: state.warehouse?.lengthM,
    widthM: state.warehouse?.widthM,
    zones: state.zones.filter((z) => z.isPlaced || z._wasUnplaced).map((z) => ({
      id: z.id,
      xCoord: z.isPlaced ? z.xM : null,
      yCoord: z.isPlaced ? z.yM : null,
      zoneWidthM: z.widthM,
      zoneDepthM: z.depthM,
      rotationDeg: z.rotationDeg || 0,
      displayColor: z.displayColor,
      sortOrder: z.sortOrder,
      rowVersion: z.rowVersion ?? 0,
    })),
    racks: state.racks.filter((r) => r.isPlaced || r._wasUnplaced).map((r) => ({
      ...(r.id && !r._isNew ? { id: r.id } : {}),
      rackCode: r.rackCode,
      rackName: r.rackName,
      rackType: r.rackType || 'SELECTIVE',
      zoneId: r.zoneId || null,
      xCoord: r.isPlaced ? r.xM : null,
      yCoord: r.isPlaced ? r.yM : null,
      rackWidthM: r.widthM,
      rackDepthM: r.depthM,
      rackHeightM: r.heightM,
      rotationDeg: r.rotationDeg || 0,
      levels: r.levels || 1,
      baysPerLevel: r.baysPerLevel || 1,
      displayColor: r.displayColor,
      rowVersion: r.rowVersion ?? 0,
    })),
    locations: state.locations.filter((l) => l.isPlaced || l._wasUnplaced).map((l) => ({
      id: l.id,
      xCoord: l.isPlaced ? l.xM : null,
      yCoord: l.isPlaced ? l.yM : null,
      locationWidthM: l.widthM,
      locationDepthM: l.depthM,
      rotationDeg: l.rotationDeg || 0,
      displayColor: l.displayColor,
      rowVersion: l.rowVersion ?? 0,
    })),
    rowVersion: state.warehouse?.rowVersion ?? 0,
  }
}

/**
 * Convert API layout response to editor state
 */
export function fromApiLayout(apiData, pixelsPerMeter) {
  const { warehouse, zones, racks, locations } = apiData

  const lengthM = Number(warehouse.lengthM) || 60
  const widthM = Number(warehouse.widthM) || 40

  return {
    warehouse: {
      id: warehouse.id,
      code: warehouse.warehouseCode,
      name: warehouse.warehouseName,
      type: warehouse.warehouseType,
      lengthM,
      widthM,
      totalAreaM2: Number(warehouse.totalAreaM2),
      maxHeightM: Number(warehouse.maxHeightM),
      displayColor: warehouse.displayColor,
      rowVersion: Number(warehouse.rowVersion),
    },
    zones: zones.map((z, i) => {
      const hasCoords = z.xCoord != null && z.yCoord != null
      const xM = Number(z.xCoord) || 0
      const yM = Number(z.yCoord) || 0
      return {
        id: z.id,
        type: 'zone',
        zoneCode: z.zoneCode,
        zoneName: z.zoneName,
        zoneType: z.zoneType,
        maxCapacityMt: Number(z.maxCapacityMt) || 0,
        xM,
        yM,
        isPlaced: hasCoords,
        widthM: Number(z.zoneWidthM) || 15,
        depthM: Number(z.zoneDepthM) || 10,
        rotationDeg: Number(z.rotationDeg) || 0,
        displayColor: z.displayColor || ZONE_TYPE_COLORS[z.zoneType] || '#3b82f6',
        sortOrder: z.sortOrder ?? i,
        rowVersion: Number(z.rowVersion) || 0,
      }
    }),
    racks: racks.map((r) => {
      const hasCoords = r.xCoord != null && r.yCoord != null
      const xM = Number(r.xCoord) || 0
      const yM = Number(r.yCoord) || 0
      return {
        id: r.id,
        type: 'rack',
        rackCode: r.rackCode,
        rackName: r.rackName,
        rackType: r.rackType,
        zoneId: r.zoneId,
        xM,
        yM,
        isPlaced: hasCoords,
        widthM: Number(r.rackWidthM) || 2,
        depthM: Number(r.rackDepthM) || 10,
        heightM: Number(r.rackHeightM) || 6,
        rotationDeg: Number(r.rotationDeg) || 0,
        levels: r.levels || 1,
        baysPerLevel: r.baysPerLevel || 1,
        displayColor: r.displayColor || '#f97316',
        rowVersion: Number(r.rowVersion) || 0,
      }
    }),
    locations: locations.map((l) => {
      const hasCoords = l.xCoord != null && l.yCoord != null
      const xM = Number(l.xCoord) || 0
      const yM = Number(l.yCoord) || 0
      return {
        id: l.id,
        type: 'location',
        locationCode: l.locationCode,
        locationType: l.locationType,
        locationProfile: l.locationProfile,
        zoneId: l.zoneId,
        xM,
        yM,
        isPlaced: hasCoords,
        widthM: Number(l.locationWidthM) || 3,
        depthM: Number(l.locationDepthM) || 3,
        rotationDeg: Number(l.rotationDeg) || 0,
        displayColor: l.displayColor || '#8b5cf6',
        rowVersion: Number(l.rowVersion) || 0,
      }
    }),
  }
}

const ZONE_TYPE_COLORS = {
  RECEIVING: '#22c55e',
  STORAGE: '#3b82f6',
  STAGING: '#f59e0b',
  SHIPPING: '#ef4444',
  QC: '#8b5cf6',
  DAMAGED: '#6b7280',
  RETURNS: '#ec4899',
}

export { ZONE_TYPE_COLORS }
