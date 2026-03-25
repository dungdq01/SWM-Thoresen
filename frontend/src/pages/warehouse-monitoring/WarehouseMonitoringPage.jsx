import { Warehouse3DStoreProvider } from '@features/warehouse-monitoring/hooks/useWarehouse3DStore'
import { WarehouseMonitoring3DScene } from '@features/warehouse-monitoring/visualization/WarehouseMonitoring3DScene'

export function WarehouseMonitoringPage() {
  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] -m-6 overflow-hidden bg-[#0a0e1a]">
      <Warehouse3DStoreProvider>
        <WarehouseMonitoring3DScene />
      </Warehouse3DStoreProvider>
    </div>
  )
}
