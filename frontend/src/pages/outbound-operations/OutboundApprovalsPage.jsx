import { useState } from 'react'
import { ShieldCheck, RefreshCw, Check, X, Truck } from 'lucide-react'
import {
  usePendingApprovals,
  useApproveShipment,
  useRejectShipment,
  useShipShipment,
} from '@domains/outbound-operations'
import {
  Badge, Button, Input, Pagination, ConfirmModal,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow,
} from '@shared/ui'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

const statusTone = (status) => {
  if (status === 'PENDING_APPROVAL' || status === 'ALL_WEIGHED') return 'warning'
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'SHIPPED') return 'info'
  return 'default'
}

const STATUS_LABELS = {
  PENDING_APPROVAL: 'Chờ duyệt',
  ALL_WEIGHED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  SHIPPED: 'Đã xuất',
}

export function OutboundApprovalsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '' })
  const [approveModal, setApproveModal] = useState({ isOpen: false, shipment: null })
  const [rejectModal, setRejectModal] = useState({ isOpen: false, shipment: null })

  const { data: response, isLoading, refetch } = usePendingApprovals({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
  })
  const rows = response?.data || response || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const approve = useApproveShipment()
  const reject = useRejectShipment()
  const ship = useShipShipment()

  const handleApprove = async (notes) => {
    if (!approveModal.shipment) return
    await approve.mutateAsync({
      shipmentId: approveModal.shipment.id,
      notes: notes || undefined,
    })
    setApproveModal({ isOpen: false, shipment: null })
  }

  const handleReject = async (notes) => {
    if (!rejectModal.shipment) return
    await reject.mutateAsync({
      shipmentId: rejectModal.shipment.id,
      reason: notes,
    })
    setRejectModal({ isOpen: false, shipment: null })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ice/10">
            <ShieldCheck className="w-5 h-5 text-ice" />
          </div>
          <div>
            <h2 className="section-title">Phê duyệt xuất hàng</h2>
            <p className="text-sm text-navy-400">Duyệt hoặc từ chối phiếu xuất trước khi xuất kho</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
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

        <Input
          placeholder="Tìm theo số phiếu, số SO..."
          value={filters.keyword}
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Số SO</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead align="right">Cân hàng (kg)</TableHead>
              <TableHead>Ngày yêu cầu</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={8} />}
            {!isLoading && rows.length === 0 && (
              <TableEmpty colSpan={8} message="Không có phiếu xuất nào cần phê duyệt." />
            )}
            {!isLoading && rows.map((shp) => {
              const tare = Number(shp.tareWeight || 0)
              const gross = Number(shp.grossWeight || 0)
              const net = gross > 0 && tare > 0 ? gross - tare : 0
              return (
                <TableRow key={shp.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{shp.shipmentNumber || '—'}</p>
                    <p className="text-xs text-navy-400">{shp.blNumber || ''}</p>
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
                    <span className={net > 0 ? 'font-semibold text-emerald-600 tabular-nums' : 'text-navy-400'}>
                      {net > 0 ? net.toLocaleString('vi-VN') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-navy-600">
                      {shp.createdAt ? new Date(shp.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusTone(shp.status)}>
                      {STATUS_LABELS[shp.status] || shp.status}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-1">
                      {['PENDING_APPROVAL', 'ALL_WEIGHED'].includes(shp.status) && (
                        <>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => setApproveModal({ isOpen: true, shipment: shp })}
                            title="Duyệt"
                          >
                            <Check className="w-4 h-4 mr-1" /> Duyệt
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setRejectModal({ isOpen: true, shipment: shp })}
                            title="Từ chối"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {shp.status === 'APPROVED' && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => ship.mutate(shp.id)}
                          disabled={ship.isPending}
                          title="Xuất hàng"
                        >
                          <Truck className="w-4 h-4 mr-1" /> Xuất
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
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

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, shipment: null })}
        onConfirm={handleApprove}
        title="Phê duyệt phiếu xuất"
        message={`Bạn có chắc chắn muốn duyệt phiếu xuất ${approveModal.shipment?.shipmentNumber || ''}?`}
        confirmText="Phê duyệt"
        type="confirm"
        isLoading={approve.isPending}
        showNotes
        notesLabel="Ghi chú phê duyệt"
        notesPlaceholder="Nhập ghi chú (tùy chọn)..."
      />

      {/* Reject Modal */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, shipment: null })}
        onConfirm={handleReject}
        title="Từ chối phiếu xuất"
        message={`Bạn có chắc chắn muốn từ chối phiếu xuất ${rejectModal.shipment?.shipmentNumber || ''}?`}
        confirmText="Từ chối"
        type="danger"
        isLoading={reject.isPending}
        showNotes
        notesLabel="Lý do từ chối"
        notesPlaceholder="Nhập lý do từ chối..."
        notesRequired
      />
    </>
  )
}
