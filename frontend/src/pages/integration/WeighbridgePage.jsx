import { useState } from 'react'
import { useWeighbridgeLogs, useWeighbridgeDevices } from '@domains/integration'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const healthTone = (status) => {
  if (status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warning'
  return 'danger'
}

export function WeighbridgePage() {
  const [logFilters, setLogFilters] = useState({ page: 1, limit: 20, referenceType: '', weighingType: '' })

  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useWeighbridgeLogs(logFilters)
  const { data: devicesResponse, refetch: refetchDevices } = useWeighbridgeDevices({})

  const logs = logsResponse?.data || []
  const logsPagination = logsResponse?.pagination || { page: 1, totalPages: 1 }
  const devices = devicesResponse?.data || []

  const handleRefresh = () => {
    refetchLogs()
    refetchDevices()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Tích hợp trạm cân</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-900">Nhật ký sự kiện cân</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={logFilters.referenceType} onChange={(e) => setLogFilters((prev) => ({ ...prev, referenceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'RECEIPT', label: 'RECEIPT' }, { value: 'SHIPMENT', label: 'SHIPMENT' }]} placeholder="Reference Type" />
            <Select value={logFilters.weighingType} onChange={(e) => setLogFilters((prev) => ({ ...prev, weighingType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'TARE', label: 'TARE' }, { value: 'GROSS', label: 'GROSS' }]} placeholder="Weighing Type" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Xe</TableHead>
                <TableHead>Tham chiếu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead align="right">Trọng lượng</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? <TableLoading colSpan={6} /> : null}
              {!logsLoading && logs.length === 0 ? <TableEmpty colSpan={6} message="Chưa có sự kiện cân" /> : null}
              {!logsLoading ? logs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{row.vehicleNumber}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.referenceType}</p>
                    <p className="text-xs text-navy-400">{row.referenceId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.weighingType === 'TARE' ? 'info' : 'success'}>{row.weighingType}</Badge>
                  </TableCell>
                  <TableCell align="right">
                    <p className="font-semibold text-navy-900">{row.weightKg?.toLocaleString()} kg</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isManualEntry ? 'warning' : 'default'}>{row.sourceChannel}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-navy-400">{new Date(row.capturedAt).toLocaleString('vi-VN')}</p>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={logsPagination.page} totalPages={logsPagination.totalPages} onPageChange={(page) => setLogFilters((prev) => ({ ...prev, page }))} />
        </div>

        <div className="wrs-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-900">Thiết bị trạm cân</h3>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-xl border border-moon-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-900">{device.name}</p>
                  <Badge variant={healthTone(device.healthStatus)}>{device.healthStatus}</Badge>
                </div>
                <p className="text-sm text-navy-600">{device.deviceCode}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-navy-500">
                  <p>Agent: v{device.agentVersion}</p>
                  <p>Hoạt động: {device.isActive ? 'Có' : 'Không'}</p>
                </div>
                <p className="text-xs text-navy-400">Heartbeat cuối: {new Date(device.lastHeartbeatAt).toLocaleString('vi-VN')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
