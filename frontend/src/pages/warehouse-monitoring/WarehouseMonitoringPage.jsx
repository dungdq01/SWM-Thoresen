import { Warehouse3DStoreProvider } from '@features/warehouse-monitoring/hooks/useWarehouse3DStore'
import { WarehouseMonitoring3DScene } from '@features/warehouse-monitoring/visualization/WarehouseMonitoring3DScene'
import { MonitoringDataBridge } from '@features/warehouse-monitoring/components/MonitoringDataBridge'

export function WarehouseMonitoringPage() {
  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] -m-6 overflow-hidden bg-[#0a0e1a]">
      <Warehouse3DStoreProvider>
        <MonitoringDataBridge />
        <WarehouseMonitoring3DScene />
      </Warehouse3DStoreProvider>
    </div>
  )
}
