import { useState } from 'react'
import { Eye, Plus, Check, X, Trash2, Pencil, Weight } from 'lucide-react'
import { useWeighbridgeLogs, useWeighbridgeDevices, useCreateWeighEvent, useUpdateWeighLog, useConfirmWeighLog, useRejectWeighLog, useRecordWeight } from '@domains/integration'
import { useLookupOwners, useLookupItems, useLookupWarehouses } from '@domains/master-data'
import { useInboundReceipts } from '@domains/inbound-operations'
import { useShipments } from '@domains/outbound-operations'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { CreateWeighTicketModal } from './components/CreateWeighTicketModal'
import { ViewWeighTicketModal } from './components/ViewWeighTicketModal'
import { EditWeighTicketModal } from './components/EditWeighTicketModal'
import { WeighingModal } from './components/WeighingModal'

const healthTone = (status) => {
  if (status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warning'
  return 'danger'
}

const WEIGHING_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'WEIGH_IN', label: 'Cân vào' },
  { value: 'WEIGH_OUT', label: 'Cân ra' },
]

const REFERENCE_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'RECEIPT', label: 'Nhập kho' },
  { value: 'SHIPMENT', label: 'Xuất kho' },
]

const statusTone = (status) => {
  if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'LINKED') return 'success'
  if (status === 'PENDING' || status === 'PROCESSING' || status === 'WEIGHING') return 'warning'
  if (status === 'FAILED' || status === 'REJECTED') return 'danger'
  if (status === 'RECEIVED') return 'info'
  return 'default'
}

const statusLabel = (status) => {
  const labels = {
    RECEIVED: 'Tạo mới',
    VALIDATED: 'Đã xác nhận',
    WEIGHING: 'Đang cân lần 2',
    COMPLETED: 'Hoàn thành',
    LINKED: 'Đã liên kết',
    DUPLICATE: 'Trùng lặp',
    FAILED: 'Thất bại',
    REJECTED: 'Từ chối',
  }
  return labels[status] || status || 'N/A'
}

export function WeighbridgePage() {
  const [logFilters, setLogFilters] = useState({ page: 1, limit: 20, referenceType: '', weighingType: '' })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewModalData, setViewModalData] = useState(null)
  const [editModalData, setEditModalData] = useState(null)
  const [weighingModalData, setWeighingModalData] = useState(null)

  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useWeighbridgeLogs(logFilters)
  const { data: devicesResponse, refetch: refetchDevices } = useWeighbridgeDevices({})
  const { data: ownersData } = useLookupOwners()
  const { data: itemsData } = useLookupItems()
  const { data: warehousesData } = useLookupWarehouses()
  const { data: receiptsData } = useInboundReceipts({ pageSize: 100, status: 'AWAITING_WEIGHING' })
  const { data: shipmentsData } = useShipments({ pageSize: 100, status: 'CONFIRMED' })
  const createWeighEventMutation = useCreateWeighEvent()
  const updateWeighLogMutation = useUpdateWeighLog()
  const confirmWeighLogMutation = useConfirmWeighLog()
  const rejectWeighLogMutation = useRejectWeighLog()
  const recordWeightMutation = useRecordWeight()

  const logs = logsResponse?.data || []
  const logsPagination = logsResponse?.pagination || { page: 1, totalPages: 1 }
  const devices = devicesResponse?.data || []
  const owners = ownersData || []
  const items = itemsData || []
  const warehouses = warehousesData || []
  const receipts = receiptsData?.data || []
  const shipments = shipmentsData?.data || []

  const handleRefresh = () => {
    refetchLogs()
    refetchDevices()
  }

  const handleCreateWeighTicket = async (payload) => {
    try {
      await createWeighEventMutation.mutateAsync(payload)
      setIsCreateModalOpen(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Tích hợp cân xe tải</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
          <Button variant="accent" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Tạo phiếu cân
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">Nhật ký sự kiện cân</h3>
          <div className="flex gap-3">
            <Select value={logFilters.referenceType} onChange={(e) => setLogFilters((prev) => ({ ...prev, referenceType: e.target.value, page: 1 }))} options={REFERENCE_TYPES} placeholder="Loại chứng từ" className="w-40" />
            <Select value={logFilters.weighingType} onChange={(e) => setLogFilters((prev) => ({ ...prev, weighingType: e.target.value, page: 1 }))} options={WEIGHING_TYPES} placeholder="Loại cân" className="w-40" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Kho</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Mã phiếu cân</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Số phiếu nhập</TableHead>
              <TableHead>Mã hàng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsLoading ? <TableLoading colSpan={10} /> : null}
            {!logsLoading && logs.length === 0 ? <TableEmpty colSpan={10} message="Không có sự kiện cân" /> : null}
            {!logsLoading ? logs.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.warehouse?.code || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={row.weighingType === 'WEIGH_IN' ? 'info' : 'success'}>
                    {row.weighingType === 'WEIGH_IN' ? 'Cân vào' : row.weighingType === 'WEIGH_OUT' ? 'Cân ra' : row.weighingType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.weighbridgeEventId}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.vehicleNumber}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-700">{row.owner?.name || row.owner?.code || '-'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-700">{row.ticketNumber || row.asnId || '-'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-700">{row.itemCode || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={statusTone(row.processingStatus)}>
                    {statusLabel(row.processingStatus)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-400">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {row.processingStatus === 'RECEIVED' && (
                      <>
                        <Button variant="ghost" size="sm" title="Chấp nhận" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => confirmWeighLogMutation.mutate(row.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Từ chối" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => rejectWeighLogMutation.mutate({ id: row.id, data: {} })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {(row.processingStatus === 'VALIDATED' || row.processingStatus === 'WEIGHING') && !(row.grossWeightKg && row.tareWeightKg) && (
                      <Button variant="ghost" size="sm" title={row.grossWeightKg ? 'Cân lần 2' : 'Cân lần 1'} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => setWeighingModalData(row)}>
                        <Weight className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" title="Xem chi tiết" onClick={() => setViewModalData(row)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {row.processingStatus === 'RECEIVED' && (
                      <Button variant="ghost" size="sm" title="Chỉnh sửa" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => setEditModalData(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {row.processingStatus === 'RECEIVED' && (
                      <Button variant="ghost" size="sm" title="Xóa" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={logsPagination.page} totalPages={logsPagination.totalPages} onPageChange={(page) => setLogFilters((prev) => ({ ...prev, page }))} />
      </div>

      {devices.length > 0 && (
        <div className="wrs-card p-5 space-y-4 mt-4">
          <h3 className="text-sm font-semibold text-navy-900">Thiết bị cân xe tải</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-xl border border-moon-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-900">{device.deviceName || device.name}</p>
                  <Badge variant={healthTone(device.lastStatus || device.healthStatus)}>{device.lastStatus || device.healthStatus || 'N/A'}</Badge>
                </div>
                <p className="text-sm text-navy-600">{device.deviceCode}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-navy-500">
                  <p>Agent: v{device.agentVersion || 'N/A'}</p>
                  <p>Hoạt động: {device.isActive ? 'Có' : 'Không'}</p>
                </div>
                <p className="text-xs text-navy-400">Lần ping cuối: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('vi-VN') : 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal tạo phiếu cân */}
      <CreateWeighTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateWeighTicket}
        isLoading={createWeighEventMutation.isPending}
        warehouses={warehouses}
        owners={owners}
        items={items}
        receipts={receipts}
        shipments={shipments}
      />

      {/* Modal xem chi tiết phiếu cân */}
      <ViewWeighTicketModal
        isOpen={!!viewModalData}
        onClose={() => setViewModalData(null)}
        data={viewModalData}
      />

      {/* Modal chỉnh sửa phiếu cân */}
      <EditWeighTicketModal
        isOpen={!!editModalData}
        onClose={() => setEditModalData(null)}
        isLoading={updateWeighLogMutation.isPending}
        onSubmit={async (payload) => {
          try {
            await updateWeighLogMutation.mutateAsync({ id: payload.id, data: { notes: payload.notes } })
            setEditModalData(null)
          } catch (error) {
            // Error handled by mutation
          }
        }}
        data={editModalData}
      />

      {/* Modal tiến hành cân */}
      <WeighingModal
        isOpen={!!weighingModalData}
        onClose={() => setWeighingModalData(null)}
        isLoading={recordWeightMutation.isPending}
        onSubmit={async (payload) => {
          try {
            await recordWeightMutation.mutateAsync({ id: payload.id, data: { weightKg: payload.weightKg } })
            // Tắt modal sau khi ghi nhận (cả lần 1 và lần 2)
            // User sẽ bấm button cân để mở lại modal khi cần cân lần 2
            setWeighingModalData(null)
            refetchLogs()
          } catch (error) {
            // Error handled by mutation
          }
        }}
        data={weighingModalData}
      />
    </>
  )
}
