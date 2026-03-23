import React, { useState, useCallback } from 'react'
import { Plus, FileOutput, Check, Trash2, Pencil, AlertTriangle, ChevronDown, ChevronUp, Package, Eye } from 'lucide-react'
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
import { CreateShipmentModal, ViewShipmentModal } from '@features/outbound-operations'

/**
 * Phiếu xuất kho (Outbound Shipments)
 * 
 * Quản lý các phiếu xuất được tạo từ Sales Order (SO)
 */

const SHIPMENT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'WEIGHING_1', label: 'Đang cân lần 1' },
  { value: 'WEIGHING_2', label: 'Đang cân lần 2' },
  { value: 'WEIGHED', label: 'Hoàn thành cân' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
  { value: 'LOADING', label: 'Đang xếp hàng' },
  { value: 'SHIPPED', label: 'Đã xuất' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'NEW') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (['WEIGHING_1', 'WEIGHING_2'].includes(status)) return 'warning'
  if (status === 'WEIGHED') return 'success'
  if (['PICKING', 'LOADING'].includes(status)) return 'warning'
  if (status === 'SHIPPED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

const STATUS_LABELS = {
  NEW: 'Tạo mới',
  CONFIRMED: 'Đã xác nhận',
  WEIGHING_1: 'Đang cân lần 1',
  WEIGHING_2: 'Đang cân lần 2',
  WEIGHED: 'Hoàn thành cân',
  PICKING: 'Đang lấy hàng',
  LOADING: 'Đang xếp hàng',
  SHIPPED: 'Đã xuất',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
}

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [shipmentModalState, setShipmentModalState] = useState({ isOpen: false, so: null })
  const [viewModalState, setViewModalState] = useState({ isOpen: false, shipment: null })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, shipment: null })
  const [expandedId, setExpandedId] = useState(null)
  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])

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

  const handleOpenViewModal = (shp) => setViewModalState({ isOpen: true, shipment: shp })
  const handleCloseViewModal = () => setViewModalState({ isOpen: false, shipment: null })

  const handleOpenDeleteConfirm = (shp) => setDeleteConfirm({ isOpen: true, shipment: shp })
  const handleCloseDeleteConfirm = () => setDeleteConfirm({ isOpen: false, shipment: null })

  const [shipmentError, setShipmentError] = useState('')
  const handleCreateShipment = async (payload) => {
    setShipmentError('')
    try {
      await createShipment.mutateAsync(payload)
      handleCloseShipmentModal()
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.error?.message || err?.response?.data?.message || err?.message || 'Lỗi tạo phiếu xuất'
      setShipmentError(msg)
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
  const handleDeleteShipment = async () => {
    try {
      await deleteShipment.mutateAsync(deleteConfirm.shipment.id)
      handleCloseDeleteConfirm()
    } catch {
      // Error handled by mutation
    }
  }
  const handleReportError = (shp) => {
    reportError.mutate({ id: shp.id, reasonCode: 'Lỗi dữ liệu' })
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
              <TableHead className="w-8"></TableHead>
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
            {isLoading && <TableLoading colSpan={10} />}
            {!isLoading && shipments.length === 0 && (
              <TableEmpty colSpan={10}>
                <div className="flex flex-col items-center justify-center py-8">
                  <FileOutput className="h-12 w-12 text-navy-300 mb-3" />
                  <p className="text-navy-600 font-medium">Chưa có phiếu xuất kho nào</p>
                  <p className="text-sm text-navy-400 mt-1">
                    Nhấn "Tạo phiếu xuất" để tạo phiếu xuất mới từ SO đã xác nhận.
                  </p>
                </div>
              </TableEmpty>
            )}
            {!isLoading && shipments.map((shp) => {
              const isExpanded = expandedId === shp.id
              const totalExpectedFromLines = (shp.lines || []).reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)
              const totalShippedFromLines = (shp.lines || []).reduce((sum, l) => sum + Number(l.shippedQty || 0), 0)
              return (
                <React.Fragment key={shp.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(shp.id)}
                        className="p-1 text-navy-400 hover:text-ice transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </TableCell>
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
                    <TableCell align="right" className="font-medium text-navy-900">
                      {totalExpectedFromLines.toLocaleString()} kg
                    </TableCell>
                    <TableCell align="right">
                      <span className={totalShippedFromLines > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                        {totalShippedFromLines.toLocaleString()} kg
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant={statusTone(shp.status)}>{STATUS_LABELS[shp.status] || shp.status}</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Xem phiếu"
                          onClick={() => handleOpenViewModal(shp)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {shp.status === 'NEW' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Xác nhận"
                              onClick={() => handleConfirm(shp.id)}
                              disabled={confirmShipment.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-500 hover:text-amber-600"
                              title="Báo lỗi"
                              onClick={() => handleReportError(shp)}
                              disabled={reportError.isPending}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenEditModal(shp)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              title="Xóa"
                              onClick={() => handleOpenDeleteConfirm(shp)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expand: line details */}
                  {isExpanded && (
                    <tr key={`${shp.id}-lines`}>
                      <td colSpan={10} className="p-0">
                        <div className="border-t border-b border-moon-200 bg-moon-50/70 px-6 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4 text-ice" />
                            <h4 className="text-sm font-semibold text-navy-900">Chi tiết dòng hàng — {shp.shipmentNumber}</h4>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                                <th className="pb-2 pr-3">#</th>
                                <th className="pb-2 pr-3">Mặt hàng</th>
                                <th className="pb-2 pr-3">ĐVT</th>
                                <th className="pb-2 pr-3 text-right">SL dự kiến</th>
                                <th className="pb-2 pr-3 text-right">SL đã xuất</th>
                                <th className="pb-2 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(shp.lines || []).map((line, idx) => (
                                <tr key={line.id || idx} className="border-b border-moon-100 last:border-b-0">
                                  <td className="py-2 pr-3 text-navy-400">{idx + 1}</td>
                                  <td className="py-2 pr-3">
                                    <p className="font-medium text-navy-800">{line.item?.itemName || line.item?.itemCode || '(Mặt hàng không tồn tại)'}</p>
                                    <p className="text-xs text-navy-400">{line.item?.itemCode || line.itemId?.slice(0, 8)}</p>
                                  </td>
                                  <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || 'kg'}</td>
                                  <td className="py-2 pr-3 text-right font-medium text-navy-900">{Number(line.expectedQty || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-right">
                                    <span className={Number(line.shippedQty || 0) > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                      {Number(line.shippedQty || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <Badge
                                      variant={line.status === 'SHIPPED' ? 'success' : line.status === 'PARTIAL' ? 'warning' : 'default'}
                                      className="text-xs"
                                    >
                                      {line.status === 'OPEN' ? 'Mới' : line.status === 'SHIPPED' ? 'Đã xuất' : line.status === 'PARTIAL' ? 'Xuất 1 phần' : line.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-moon-300 font-semibold text-navy-900">
                                <td colSpan={3} className="pt-2 pr-3">Tổng</td>
                                <td className="pt-2 pr-3 text-right">{totalExpectedFromLines.toLocaleString()}</td>
                                <td className="pt-2 pr-3 text-right text-emerald-600">{totalShippedFromLines.toLocaleString()}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
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
        errorMessage={shipmentError}
      />

      {/* Modal — View Shipment */}
      <ViewShipmentModal
        isOpen={viewModalState.isOpen}
        onClose={handleCloseViewModal}
        shipment={viewModalState.shipment}
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

      {/* Modal — Delete Confirmation */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-2">Xác nhận xóa</h3>
            <p className="text-navy-600 mb-4">
              Bạn có chắc chắn muốn xóa phiếu xuất <strong>{deleteConfirm.shipment?.shipmentNumber}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDeleteConfirm}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteShipment}
                disabled={deleteShipment.isPending}
              >
                {deleteShipment.isPending ? 'Đang xóa...' : 'Xóa phiếu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
