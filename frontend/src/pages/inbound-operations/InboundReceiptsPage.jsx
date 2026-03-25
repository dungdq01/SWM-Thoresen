import React, { useState, useCallback } from 'react'
import { Eye, Pencil, Trash2, ChevronDown, ChevronUp, Package, CheckCircle, AlertTriangle } from 'lucide-react'
import { usePurchaseOrders, useCreateInboundReceipt, useInboundReceipts, useUpdateInboundReceipt, useDeleteInboundReceipt, useConfirmInboundReceipt, useReportErrorInboundReceipt } from '@domains/inbound-operations'
import { useLookupWarehouses, useLookupItems, useLookupUoms, useLookupOwners } from '@domains/master-data'
import {
  Badge,
  Button,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from '@shared/ui'
import { CreateInboundReceiptModal, ViewReceiptModal, EditReceiptModal } from '@features/inbound-operations'

const RECEIPT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Xác nhận' },
  { value: 'ERROR', label: 'Lỗi' },
  { value: 'AWAITING_WEIGHING', label: 'Chờ cân' },
  { value: 'WEIGHING_1', label: 'Đang cân lần 1' },
  { value: 'UNLOADING', label: 'Đang dỡ hàng' },
  { value: 'UNLOADED', label: 'Chờ cân lần 2' },
  { value: 'WEIGHING_2', label: 'Đang cân lần 2' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const STATUS_LABELS = {
  NEW: 'Tạo mới',
  CONFIRMED: 'Xác nhận',
  ERROR: 'Lỗi',
  AWAITING_WEIGHING: 'Chờ cân',
  WEIGHING_1: 'Đang cân lần 1',
  UNLOADING: 'Đang dỡ hàng',
  UNLOADED: 'Chờ cân lần 2',
  WEIGHING_2: 'Đang cân lần 2',
  COMPLETED: 'Hoàn thành',
  CLOSED: 'Đã đóng',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
}

const statusTone = (status) => {
  if (status === 'NEW') return 'default'
  if (status === 'CONFIRMED') return 'success'
  if (status === 'ERROR') return 'danger'
  if (status === 'AWAITING_WEIGHING') return 'info'
  if (status === 'WEIGHING_1') return 'info'
  if (status === 'UNLOADING') return 'warning'
  if (status === 'UNLOADED') return 'info'
  if (status === 'WEIGHING_2') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'REJECTED') return 'danger'
  return 'default'
}

export function InboundReceiptsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [showCreateReceipt, setShowCreateReceipt] = useState(false)
  const [viewModalState, setViewModalState] = useState({ isOpen: false, receipt: null })
  const [editModalState, setEditModalState] = useState({ isOpen: false, receipt: null })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, receipt: null })
  const [expandedId, setExpandedId] = useState(null)
  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])

  // Fetch receipts
  const { data: response, isLoading, refetch } = useInboundReceipts({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const { data: poResponse } = usePurchaseOrders({ status: 'CONFIRMED', pageSize: 100 })
  const confirmedPos = poResponse?.data || []

  const createReceipt = useCreateInboundReceipt()
  const updateReceipt = useUpdateInboundReceipt()
  const deleteReceipt = useDeleteInboundReceipt()
  const confirmReceipt = useConfirmInboundReceipt()
  const reportErrorReceipt = useReportErrorInboundReceipt()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: owners = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  // ── Handlers ──
  const handleOpenCreateReceipt = () => setShowCreateReceipt(true)
  const handleCloseCreateReceipt = () => setShowCreateReceipt(false)

  const handleCreateReceipt = async (payload) => {
    try {
      await createReceipt.mutateAsync(payload)
      handleCloseCreateReceipt()
    } catch {
      // Error handled by mutation
    }
  }

  // View modal handlers
  const handleOpenViewModal = (receipt) => setViewModalState({ isOpen: true, receipt })
  const handleCloseViewModal = () => setViewModalState({ isOpen: false, receipt: null })

  // Edit modal handlers
  const handleOpenEditModal = (receipt) => setEditModalState({ isOpen: true, receipt })
  const handleCloseEditModal = () => setEditModalState({ isOpen: false, receipt: null })

  const handleUpdateReceipt = async (payload) => {
    try {
      await updateReceipt.mutateAsync({ id: editModalState.receipt.id, data: payload })
      handleCloseEditModal()
    } catch {
      // Error handled by mutation
    }
  }

  // Delete handlers
  const handleOpenDeleteConfirm = (receipt) => setDeleteConfirm({ isOpen: true, receipt })
  const handleCloseDeleteConfirm = () => setDeleteConfirm({ isOpen: false, receipt: null })

  const handleDeleteReceipt = async () => {
    try {
      await deleteReceipt.mutateAsync(deleteConfirm.receipt.id)
      handleCloseDeleteConfirm()
    } catch {
      // Error handled by mutation
    }
  }

  // Confirm receipt handler
  const handleConfirmReceipt = async (receipt) => {
    try {
      await confirmReceipt.mutateAsync(receipt.id)
    } catch {
      // Error handled by mutation
    }
  }

  // Report error receipt handler
  const handleReportErrorReceipt = async (receipt) => {
    try {
      await reportErrorReceipt.mutateAsync({ id: receipt.id, data: {} })
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleOpenCreateReceipt}>Tạo phiếu nhập</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {RECEIPT_STATUSES.map((s) => (
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

        {/* Other filters */}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Tìm số B/L, số phiếu, biển số xe..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Mã ASN</TableHead>
              <TableHead>Số PO</TableHead>
              <TableHead>Số B/L</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Tên tàu</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã nhận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={11} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={11} message="Chưa có phiếu nhập nào" />}
            {!isLoading && rows.map((receipt) => {
              const isExpanded = expandedId === receipt.id
              const totalExpectedFromLines = (receipt.lines || []).reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)
              const totalReceivedFromLines = (receipt.lines || []).reduce((sum, l) => sum + Number(l.receivedQty || 0), 0)
              return (
                <React.Fragment key={receipt.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(receipt.id)}
                        className="p-1 text-navy-400 hover:text-ice transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-navy-900">{receipt.asnId || receipt.id?.slice(0, 8) || '—'}</p>
                      <p className="text-xs text-navy-400">{receipt.lines?.length || 0} dòng</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-navy-600">{receipt.poId || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-navy-600">{receipt.blNumber || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-800">{receipt.owner?.ownerCode || receipt.ownerId}</p>
                      <p className="text-xs text-navy-400">{receipt.owner?.ownerName}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-navy-700">{receipt.vesselName || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-navy-700">{receipt.vehiclePlate || receipt.vehicleNumber || '—'}</span>
                    </TableCell>
                    <TableCell align="right" className="font-medium text-navy-900">
                      {totalExpectedFromLines.toLocaleString()} kg
                    </TableCell>
                    <TableCell align="right">
                      <span className={totalReceivedFromLines > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                        {totalReceivedFromLines.toLocaleString()} kg
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(receipt.status)}>{STATUS_LABELS[receipt.status] || receipt.status}</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Xem phiếu"
                          onClick={() => handleOpenViewModal(receipt)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {receipt.status === 'NEW' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xác nhận"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleConfirmReceipt(receipt)}
                              disabled={confirmReceipt.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Báo lỗi"
                              className="text-amber-500 hover:text-amber-600"
                              onClick={() => handleReportErrorReceipt(receipt)}
                              disabled={reportErrorReceipt.isPending}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenEditModal(receipt)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xóa"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleOpenDeleteConfirm(receipt)}
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
                    <tr key={`${receipt.id}-lines`}>
                      <td colSpan={11} className="p-0">
                        <div className="border-t border-b border-moon-200 bg-moon-50/70 px-6 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4 text-ice" />
                            <h4 className="text-sm font-semibold text-navy-900">Chi tiết dòng hàng — {receipt.asnId || receipt.id?.slice(0, 8)}</h4>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                                <th className="pb-2 pr-3">#</th>
                                <th className="pb-2 pr-3">Mặt hàng</th>
                                <th className="pb-2 pr-3">ĐVT</th>
                                <th className="pb-2 pr-3 text-right">SL dự kiến</th>
                                <th className="pb-2 pr-3 text-right">SL đã nhận</th>
                                <th className="pb-2 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(receipt.lines || []).map((line, idx) => (
                                <tr key={line.id || idx} className="border-b border-moon-100 last:border-b-0">
                                  <td className="py-2 pr-3 text-navy-400">{idx + 1}</td>
                                  <td className="py-2 pr-3">
                                    <p className="font-medium text-navy-800">{line.item?.itemName || line.item?.itemCode || '(Mặt hàng không tồn tại)'}</p>
                                    <p className="text-xs text-navy-400">{line.item?.itemCode || line.itemId?.slice(0, 8)}</p>
                                  </td>
                                  <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || 'kg'}</td>
                                  <td className="py-2 pr-3 text-right font-medium text-navy-900">{Number(line.expectedQtyKg || line.expectedQty || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-right">
                                    <span className={Number(line.receivedQty || 0) > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                      {Number(line.receivedQty || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <Badge
                                      variant={line.status === 'RECEIVED' ? 'success' : line.status === 'PARTIAL' ? 'warning' : 'default'}
                                      className="text-xs"
                                    >
                                      {line.status === 'OPEN' ? 'Mới' : line.status === 'RECEIVED' ? 'Đã nhận' : line.status === 'PARTIAL' ? 'Nhận 1 phần' : line.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-moon-300 font-semibold text-navy-900">
                                <td colSpan={3} className="pt-2 pr-3">Tổng</td>
                                <td className="pt-2 pr-3 text-right">{totalExpectedFromLines.toLocaleString()}</td>
                                <td className="pt-2 pr-3 text-right text-emerald-600">{totalReceivedFromLines.toLocaleString()}</td>
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

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* ── Create Receipt Modal with PO Selector ── */}
      <CreateInboundReceiptModal
        isOpen={showCreateReceipt}
        onClose={handleCloseCreateReceipt}
        onSubmit={handleCreateReceipt}
        confirmedPos={confirmedPos}
        isLoading={createReceipt.isPending}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
      />

      {/* ── View Receipt Modal ── */}
      <ViewReceiptModal
        isOpen={viewModalState.isOpen}
        onClose={handleCloseViewModal}
        receipt={viewModalState.receipt}
      />

      {/* ── Edit Receipt Modal ── */}
      <EditReceiptModal
        isOpen={editModalState.isOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateReceipt}
        receipt={editModalState.receipt}
        isLoading={updateReceipt.isPending}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
      />

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-2">Xác nhận xóa</h3>
            <p className="text-navy-600 mb-4">
              Bạn có chắc chắn muốn xóa phiếu nhập <strong>{deleteConfirm.receipt?.receiptNumber}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDeleteConfirm}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteReceipt}
                disabled={deleteReceipt.isPending}
              >
                {deleteReceipt.isPending ? 'Đang xóa...' : 'Xóa phiếu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
