import { useEffect, useRef } from 'react'
import { useWarehouse3D } from '../hooks/useWarehouse3DStore'
import { useSiteOverview, mapApiToSceneData } from '../hooks/useMonitoringData'

/**
 * Invisible component that bridges monitoring API polling → 3D store.
 * Must be rendered inside Warehouse3DStoreProvider.
 */
export function MonitoringDataBridge() {
  const { actions } = useWarehouse3D()
  const { data, isError } = useSiteOverview({ intervalMs: 30000 })
  const hasSetData = useRef(false)

  useEffect(() => {
    if (data?.data?.warehouses?.length) {
      const sceneData = mapApiToSceneData(data.data.warehouses)
      actions.setWarehouseData(sceneData)
      hasSetData.current = true
    }
    // If API fails after we had data, keep showing last API data (don't fallback)
    // If API never loaded, store stays null → WarehouseGroup falls back to WH_DATA
  }, [data, actions])

  // If first load fails, ensure we stay on mock (warehouseData is already null by default)
  useEffect(() => {
    if (isError && !hasSetData.current) {
      // No-op: store already has warehouseData: null → WH_DATA fallback
    }
  }, [isError])

  return null
}
