import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Package, Truck, User, Warehouse, Calendar, FileText } from 'lucide-react'
import { Badge, Button } from '@shared/ui'

const STATUS_LABELS = {
  DRAFT: 'Tạo mới',
  AWAITING_WEIGHING: 'Chờ cân',
  WEIGHED_IN: 'Đã cân vào',
  PROCESSING: 'Đang xử lý',
  WEIGHED_OUT: 'Đã hoàn thành',
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

export function ViewReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
                  <FileText className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Chi tiết phiếu nhập</h2>
                  <p className="text-sm text-navy-500">{receipt.receiptNumber || 'Chưa có số phiếu'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-navy-400 hover:bg-moon-100 hover:text-navy-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500">Trạng thái:</span>
                <Badge variant={statusTone(receipt.status)}>
                  {STATUS_LABELS[receipt.status] || receipt.status}
                </Badge>
              </div>

              {/* General Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileText className="h-4 w-4" />
                    <span>Số PO</span>
                  </div>
                  <p className="font-medium text-navy-900">{receipt.poId || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileText className="h-4 w-4" />
                    <span>Số B/L</span>
                  </div>
                  <p className="font-medium text-navy-900">{receipt.blNumber || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <User className="h-4 w-4" />
                    <span>Chủ hàng</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {receipt.owner?.ownerCode || receipt.ownerId}
                    {receipt.owner?.ownerName && (
                      <span className="text-navy-500 ml-1">— {receipt.owner.ownerName}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Warehouse className="h-4 w-4" />
                    <span>Kho</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {receipt.warehouse?.code || receipt.warehouseId}
                    {receipt.warehouse?.name && (
                      <span className="text-navy-500 ml-1">— {receipt.warehouse.name}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Truck className="h-4 w-4" />
                    <span>Biển số xe</span>
                  </div>
                  <p className="font-medium text-navy-900">{receipt.vehicleNumber || receipt.vehiclePlate || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Calendar className="h-4 w-4" />
                    <span>Ngày tạo</span>
                  </div>
                  <p className="font-medium text-navy-900">{formatDate(receipt.createdAt)}</p>
                </div>
              </div>

              {/* Weight Info */}
              <div className="rounded-lg border border-moon-200 p-4">
                <h3 className="text-sm font-semibold text-navy-800 mb-3">Thông tin khối lượng</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">SL dự kiến</p>
                    <p className="text-lg font-semibold text-navy-900">
                      {(receipt.expectedQty || receipt.totalExpectedQty || 0).toLocaleString()} kg
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">Khối lượng thực</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {(receipt.netWeightKg || receipt.totalReceivedQty || 0).toLocaleString()} kg
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">Chênh lệch</p>
                    <p className="text-lg font-semibold text-navy-600">
                      {receipt.variancePct ? `${receipt.variancePct}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lines */}
              {receipt.lines && receipt.lines.length > 0 && (
                <div className="rounded-lg border border-moon-200 p-4">
                  <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Chi tiết hàng hóa ({receipt.lines.length} dòng)
                  </h3>
                  <div className="space-y-2">
                    {receipt.lines.map((line, index) => (
                      <div
                        key={line.id || index}
                        className="flex items-center justify-between rounded-md bg-moon-50 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-navy-800">
                            {line.item?.code || line.itemId}
                          </p>
                          <p className="text-xs text-navy-500">{line.item?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-navy-900">
                            {(line.expectedQty || 0).toLocaleString()} kg
                          </p>
                          <p className="text-xs text-navy-500">
                            {line.uom?.code || line.uomId}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
