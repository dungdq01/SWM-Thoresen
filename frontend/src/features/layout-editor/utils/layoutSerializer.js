/**
 * Converts layout editor state to API payload and vice versa.
 */

/**
 * Convert editor state to SaveWarehouseLayoutDto payload
 */
export function toSavePayload(state) {
  return {
    lengthM: state.warehouse?.lengthM,
    widthM: state.warehouse?.widthM,
    zones: state.zones.map((z) => ({
      id: z.id,
      xCoord: z.xM,
      yCoord: z.yM,
      zoneWidthM: z.widthM,
      zoneDepthM: z.depthM,
      rotationDeg: z.rotationDeg || 0,
      displayColor: z.displayColor,
      sortOrder: z.sortOrder,
    })),
    racks: state.racks.map((r) => ({
      ...(r.id && !r._isNew ? { id: r.id } : {}),
      rackCode: r.rackCode,
      rackName: r.rackName,
      rackType: r.rackType || 'SELECTIVE',
      zoneId: r.zoneId || null,
      xCoord: r.xM,
      yCoord: r.yM,
      rackWidthM: r.widthM,
      rackDepthM: r.depthM,
      rackHeightM: r.heightM,
      rotationDeg: r.rotationDeg || 0,
      levels: r.levels || 1,
      baysPerLevel: r.baysPerLevel || 1,
      displayColor: r.displayColor,
    })),
    locations: state.locations.map((l) => ({
      id: l.id,
      xCoord: l.xM,
      yCoord: l.yM,
      locationWidthM: l.widthM,
      locationDepthM: l.depthM,
      rotationDeg: l.rotationDeg || 0,
      displayColor: l.displayColor,
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
    zones: zones.map((z, i) => ({
      id: z.id,
      type: 'zone',
      zoneCode: z.zoneCode,
      zoneName: z.zoneName,
      zoneType: z.zoneType,
      maxCapacityMt: Number(z.maxCapacityMt) || 0,
      xM: Number(z.xCoord) || 0,
      yM: Number(z.yCoord) || 0,
      widthM: Number(z.zoneWidthM) || 15,
      depthM: Number(z.zoneDepthM) || 10,
      rotationDeg: Number(z.rotationDeg) || 0,
      displayColor: z.displayColor || ZONE_TYPE_COLORS[z.zoneType] || '#3b82f6',
      sortOrder: z.sortOrder ?? i,
    })),
    racks: racks.map((r) => ({
      id: r.id,
      type: 'rack',
      rackCode: r.rackCode,
      rackName: r.rackName,
      rackType: r.rackType,
      zoneId: r.zoneId,
      xM: Number(r.xCoord) || 0,
      yM: Number(r.yCoord) || 0,
      widthM: Number(r.rackWidthM) || 2,
      depthM: Number(r.rackDepthM) || 10,
      heightM: Number(r.rackHeightM) || 6,
      rotationDeg: Number(r.rotationDeg) || 0,
      levels: r.levels || 1,
      baysPerLevel: r.baysPerLevel || 1,
      displayColor: r.displayColor || '#f97316',
    })),
    locations: locations.map((l) => ({
      id: l.id,
      type: 'location',
      locationCode: l.locationCode,
      locationType: l.locationType,
      locationProfile: l.locationProfile,
      zoneId: l.zoneId,
      xM: Number(l.xCoord) || 0,
      yM: Number(l.yCoord) || 0,
      widthM: Number(l.locationWidthM) || 3,
      depthM: Number(l.locationDepthM) || 3,
      rotationDeg: Number(l.rotationDeg) || 0,
      displayColor: l.displayColor || '#8b5cf6',
    })),
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
