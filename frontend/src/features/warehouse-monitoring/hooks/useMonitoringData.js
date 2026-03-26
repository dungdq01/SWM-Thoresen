import { useQuery } from '@tanstack/react-query'
import { monitoringApi } from '@domains/master-data/api/masterData.api'

const MONITORING_KEYS = {
  siteOverview: ['monitoring', 'site-overview'],
  warehouseDetail: (id) => ['monitoring', 'warehouse', id],
}

/**
 * Poll site overview every 30s for 3D monitoring scene
 */
export function useSiteOverview({ enabled = true, intervalMs = 30000 } = {}) {
  return useQuery({
    queryKey: MONITORING_KEYS.siteOverview,
    queryFn: () => monitoringApi.getSiteOverview(),
    enabled,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    staleTime: intervalMs - 5000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}

/**
 * Poll single warehouse detail every 15s (when warehouse is selected)
 */
export function useWarehouseMonitoringDetail(warehouseId, { enabled = true, intervalMs = 15000 } = {}) {
  return useQuery({
    queryKey: MONITORING_KEYS.warehouseDetail(warehouseId),
    queryFn: () => monitoringApi.getWarehouseDetail(warehouseId),
    enabled: enabled && !!warehouseId,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    staleTime: intervalMs - 3000,
  })
}

/**
 * Map API warehouse data to 3D scene-compatible format (matches WH_DATA shape)
 */
export function mapApiToSceneData(apiWarehouses) {
  return apiWarehouses.map((wh) => ({
    code: wh.warehouseCode,
    name: wh.warehouseName,
    owner: 'TVL',
    area: Number(wh.totalAreaM2) || 0,
    width: Number(wh.lengthM) || 80,
    depth: Number(wh.widthM) || 60,
    fill: wh.fillPercent || 0,
    stock: wh.currentStockMt || 0,
    zones: wh.zones?.length || 0,
    type: wh.warehouseType || 'COVERED',
    pos: [
      Number(wh.siteXCoord) || 0,
      0,
      Number(wh.siteYCoord) || 0,
    ],
    color: wh.displayColor
      ? parseInt(wh.displayColor.replace('#', '0x') || '0x2563eb')
      : 0x2563eb,
    items: (wh.topItems || []).map((i) => [i.itemName, i.quantityMt, 'tấn']),
    temp: null,
    humid: null,
    // Extended geometry for zone/rack rendering
    zoneGeometry: (wh.zones || []).map((z) => ({
      id: z.id,
      code: z.zoneCode,
      name: z.zoneName,
      type: z.zoneType,
      cx: Number(z.xCoord) || 0,
      cz: Number(z.yCoord) || 0,
      width: Number(z.zoneWidthM) || 15,
      depth: Number(z.zoneDepthM) || 10,
      color: z.displayColor ? parseInt(z.displayColor.replace('#', '0x')) : 0x1e40af,
      stock: z.currentStockMt || 0,
    })),
    rackPositions: (wh.racks || []).map((r) => ({
      id: r.id,
      code: r.rackCode,
      x: Number(r.xCoord) || 0,
      z: Number(r.yCoord) || 0,
      width: Number(r.rackWidthM) || 2,
      depth: Number(r.rackDepthM) || 10,
      height: Number(r.rackHeightM) || 6,
      levels: r.levels || 1,
      rotation: Number(r.rotationDeg) || 0,
    })),
  }))
}
