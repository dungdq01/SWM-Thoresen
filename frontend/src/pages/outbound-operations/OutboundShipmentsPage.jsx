import { useState } from 'react'
import { Plus, FileOutput, Check, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import {
  useSalesOrders,
  useShipments,
  useCreateShipment,
  useUpdateShipment,
  useConfirmShipment,
  useDeleteShipment,
  useReportShipmentError,
} from '@domains/outbound-operations'
import { useLookupOwners, useLookupItems, useLookupUoms, useLookupWarehouses } from '@domains/master-data'
import {
  Badge, Button, Input, Select, Pagination,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow,
} from '@shared/ui'
import { CreateShipmentModal } from '@features/outbound-operations'

/**
 * Phiếu xuất kho (Outbound Shipments)
 * 
 * Quản lý các phiếu xuất được tạo từ Sales Order (SO)
 */

const SHIPMENT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
  { value: 'LOADING', label: 'Đang xếp hàng' },
  { value: 'SHIPPED', label: 'Đã xuất' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'NEW') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (['PICKING', 'LOADING'].includes(status)) return 'warning'
  if (status === 'SHIPPED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

const STATUS_LABELS = {
  NEW: 'Tạo mới',
  CONFIRMED: 'Đã xác nhận',
  PICKING: 'Đang lấy hàng',
  LOADING: 'Đang xếp hàng',
  SHIPPED: 'Đã xuất',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
}

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [shipmentModalState, setShipmentModalState] = useState({ isOpen: false, so: null })

  // Fetch confirmed SOs for shipment creation
  const { data: sosResponse } = useSalesOrders({ status: 'CONFIRMED', pageSize: 100 })
  const confirmedSos = sosResponse?.data || []

  // Lookup data
  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: warehouses = [] } = useLookupWarehouses()

  // Fetch shipments
  const { data: shipmentsResponse, isLoading, refetch } = useShipments({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })
  const shipments = shipmentsResponse?.data || []
  const pagination = shipmentsResponse?.pagination || { page: 1, totalPages: 1 }

  // Mutations
  const createShipment = useCreateShipment()
  const updateShipment = useUpdateShipment()
  const confirmShipment = useConfirmShipment()
  const deleteShipment = useDeleteShipment()
  const reportError = useReportShipmentError()

  // Edit modal state
  const [editModalState, setEditModalState] = useState({ isOpen: false, shipment: null })

  const handleOpenShipmentModal = () => setShipmentModalState({ isOpen: true, so: null })
  const handleCloseShipmentModal = () => setShipmentModalState({ isOpen: false, so: null })

  const handleOpenEditModal = (shp) => setEditModalState({ isOpen: true, shipment: shp })
  const handleCloseEditModal = () => setEditModalState({ isOpen: false, shipment: null })

  const handleCreateShipment = async (payload) => {
    try {
      await createShipment.mutateAsync(payload)
      handleCloseShipmentModal()
    } catch {
      // Error handled by mutation
    }
  }

  const handleUpdateShipment = async (payload) => {
    if (!editModalState.shipment) return
    try {
      await updateShipment.mutateAsync({ id: editModalState.shipment.id, data: payload })
      handleCloseEditModal()
    } catch {
      // Error handled by mutation
    }
  }

  const handleConfirm = (id) => confirmShipment.mutate(id)
  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất này?')) {
      deleteShipment.mutate(id)
    }
  }
  const handleReportError = (id) => {
    const reason = window.prompt('Nhập lý do báo lỗi:', 'Lỗi dữ liệu')
    if (reason) {
      reportError.mutate({ id, reasonCode: reason })
    }
  }

  const ownerOptions = [
    { value: '', label: 'Tất cả chủ hàng' },
    ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` })),
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu xuất kho</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleOpenShipmentModal}>
            <Plus className="h-4 w-4 mr-1" /> Tạo phiếu xuất
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {SHIPMENT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Tìm theo số phiếu, số SO, biển số xe..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={ownerOptions}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số B/L</TableHead>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Số SO</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã xuất</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={9} />}
            {!isLoading && shipments.length === 0 && (
              <TableEmpty colSpan={9}>
                <div className="flex flex-col items-center justify-center py-8">
                  <FileOutput className="h-12 w-12 text-navy-300 mb-3" />
                  <p className="text-navy-600 font-medium">Chưa có phiếu xuất kho nào</p>
                  <p className="text-sm text-navy-400 mt-1">
                    Nhấn "Tạo phiếu xuất" để tạo phiếu xuất mới từ SO đã xác nhận.
                  </p>
                </div>
              </TableEmpty>
            )}
            {!isLoading && shipments.map((shp) => (
              <TableRow key={shp.id}>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">{shp.blNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-navy-900">{shp.shipmentNumber || '—'}</p>
                  <p className="text-xs text-navy-400">{shp.lines?.length || 0} dòng</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{shp.soNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{shp.owner?.ownerCode || '—'}</p>
                  <p className="text-xs text-navy-400">{shp.owner?.ownerName || ''}</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">{shp.vehicleNumber || '—'}</span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-medium text-navy-900">{(shp.expectedQty || 0).toLocaleString()}</span>
                  <span className="text-xs text-navy-400 ml-1">kg</span>
                </TableCell>
                <TableCell align="right">
                  <span className={shp.shippedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                    {(shp.shippedQty || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-navy-400 ml-1">kg</span>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={statusTone(shp.status)}>{STATUS_LABELS[shp.status] || shp.status}</Badge>
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center gap-1">
                    {shp.status === 'NEW' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                          title="Xác nhận"
                          onClick={() => handleConfirm(shp.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-navy-600 hover:bg-navy-50"
                          title="Chỉnh sửa"
                          onClick={() => handleOpenEditModal(shp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          title="Xóa"
                          onClick={() => handleDelete(shp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {shp.status === 'CONFIRMED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                        title="Báo lỗi"
                        onClick={() => handleReportError(shp.id)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    )}
                    {!['NEW', 'CONFIRMED'].includes(shp.status) && (
                      <span className="text-xs text-navy-400">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Modal — Create Shipment */}
      <CreateShipmentModal
        isOpen={shipmentModalState.isOpen}
        onClose={handleCloseShipmentModal}
        onSubmit={handleCreateShipment}
        salesOrder={shipmentModalState.so}
        confirmedSos={confirmedSos}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
        isLoading={createShipment.isPending}
      />

      {/* Modal — Edit Shipment */}
      <CreateShipmentModal
        isOpen={editModalState.isOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateShipment}
        shipmentToEdit={editModalState.shipment}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
        isLoading={updateShipment.isPending}
      />
    </>
  )
}
