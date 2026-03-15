import { useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { usePurchaseOrders, useCreateInboundReceipt, useInboundReceipts, useUpdateInboundReceipt, useDeleteInboundReceipt } from '@domains/inbound-operations'
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
  { value: 'DRAFT', label: 'Tạo mới' },
  { value: 'AWAITING_WEIGHING', label: 'Chờ cân' },
  { value: 'WEIGHED_IN', label: 'Đã cân vào' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'WEIGHED_OUT', label: 'Đã cân ra' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const STATUS_LABELS = {
  DRAFT: 'Tạo mới',
  AWAITING_WEIGHING: 'Chờ cân',
  WEIGHED_IN: 'Đã cân vào',
  PROCESSING: 'Đang xử lý',
  WEIGHED_OUT: 'Đã cân ra',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

const statusTone = (status) => {
  if (status === 'DRAFT') return 'default'
  if (status === 'AWAITING_WEIGHING') return 'info'
  if (status === 'WEIGHED_IN') return 'info'
  if (status === 'PROCESSING') return 'warning'
  if (status === 'WEIGHED_OUT') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

export function InboundReceiptsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [showCreateReceipt, setShowCreateReceipt] = useState(false)
  const [viewModalState, setViewModalState] = useState({ isOpen: false, receipt: null })
  const [editModalState, setEditModalState] = useState({ isOpen: false, receipt: null })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, receipt: null })

  // Fetch receipts
  const { data: response, isLoading, refetch } = useInboundReceipts({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  // Fetch confirmed POs for dropdown
  const { data: poResponse } = usePurchaseOrders({ status: 'CONFIRMED', pageSize: 100 })
  const confirmedPos = poResponse?.data || []

  const createReceipt = useCreateInboundReceipt()
  const updateReceipt = useUpdateInboundReceipt()
  const deleteReceipt = useDeleteInboundReceipt()
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
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Tìm số B/L, số phiếu, biển số xe..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={RECEIPT_STATUSES}
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
              <TableHead>Số B/L</TableHead>
              <TableHead>Phiếu nhập kho</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã nhận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={8} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={8} message="Chưa có phiếu nhập nào" />}
            {!isLoading && rows.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{receipt.blNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-navy-900">{receipt.receiptNumber}</p>
                  <p className="text-xs text-navy-400">{receipt.lines?.length || 0} dòng</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{receipt.owner?.ownerCode || receipt.ownerId}</p>
                  <p className="text-xs text-navy-400">{receipt.owner?.ownerName}</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">{receipt.vehiclePlate || receipt.vehicleNumber || '—'}</span>
                </TableCell>
                <TableCell align="right" className="font-medium text-navy-900">
                  {(receipt.totalExpectedQty || 0).toLocaleString()} kg
                </TableCell>
                <TableCell align="right">
                  <span className={receipt.totalReceivedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                    {(receipt.totalReceivedQty || 0).toLocaleString()} kg
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
                    {receipt.status === 'DRAFT' && (
                      <>
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
            ))}
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
