import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Package, Truck, User, Warehouse, Calendar, FileOutput, Ship } from 'lucide-react'
import { Badge, Button } from '@shared/ui'

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

export function ViewShipmentModal({ isOpen, onClose, shipment }) {
  if (!isOpen || !shipment) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  const totalExpected = (shipment.lines || []).reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)
  const totalShipped = (shipment.lines || []).reduce((sum, l) => sum + Number(l.shippedQty || 0), 0)

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
                  <FileOutput className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Chi tiết phiếu xuất</h2>
                  <p className="text-sm text-navy-500">{shipment.shipmentNumber || 'Chưa có mã phiếu'}</p>
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
                <Badge variant={statusTone(shipment.status)}>
                  {STATUS_LABELS[shipment.status] || shipment.status}
                </Badge>
              </div>

              {/* General Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileOutput className="h-4 w-4" />
                    <span>Số SO</span>
                  </div>
                  <p className="font-medium text-navy-900">{shipment.soNumber || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileOutput className="h-4 w-4" />
                    <span>Số B/L</span>
                  </div>
                  <p className="font-medium text-navy-900">{shipment.blNumber || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <User className="h-4 w-4" />
                    <span>Chủ hàng</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {shipment.owner?.ownerCode || shipment.ownerId || '—'}
                    {shipment.owner?.ownerName && (
                      <span className="text-navy-500 ml-1">— {shipment.owner.ownerName}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Warehouse className="h-4 w-4" />
                    <span>Kho</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {shipment.warehouse?.warehouseCode || shipment.warehouse?.code || shipment.warehouseId || '—'}
                    {(shipment.warehouse?.warehouseName || shipment.warehouse?.name) && (
                      <span className="text-navy-500 ml-1">— {shipment.warehouse.warehouseName || shipment.warehouse.name}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Truck className="h-4 w-4" />
                    <span>Biển số xe</span>
                  </div>
                  <p className="font-medium text-navy-900">{shipment.vehicleNumber || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Ship className="h-4 w-4" />
                    <span>Tên tàu</span>
                  </div>
                  <p className="font-medium text-navy-900">{shipment.vesselName || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Calendar className="h-4 w-4" />
                    <span>Ngày tạo</span>
                  </div>
                  <p className="font-medium text-navy-900">{formatDate(shipment.createdAt)}</p>
                </div>
              </div>

              {/* Weight Info */}
              <div className="rounded-lg border border-moon-200 p-4">
                <h3 className="text-sm font-semibold text-navy-800 mb-3">Thông tin khối lượng</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">{shipment.soType === 'SEA' ? 'Trọng lượng hàng tịnh' : 'SL dự kiến'}</p>
                    <p className="text-lg font-semibold text-navy-900">
                      {totalExpected.toLocaleString()} kg
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">SL đã xuất</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {totalShipped.toLocaleString()} kg
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy-500 mb-1">Chênh lệch</p>
                    {(() => {
                      if (!totalShipped) return <p className="text-lg font-semibold text-navy-600">—</p>
                      const diff = totalExpected - totalShipped
                      const color = diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-red-600' : 'text-emerald-600'
                      return (
                        <p className={`text-lg font-semibold ${color}`}>
                          {diff > 0 ? '+' : ''}{diff.toLocaleString()} kg
                        </p>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Lines */}
              {shipment.lines && shipment.lines.length > 0 && (
                <div className="rounded-lg border border-moon-200 p-4">
                  <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Chi tiết hàng hóa ({shipment.lines.length} dòng)
                  </h3>
                  <div className="space-y-2">
                    {shipment.lines.map((line, index) => (
                      <div
                        key={line.id || index}
                        className="flex items-center justify-between rounded-md bg-moon-50 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-navy-800">
                            {line.item?.itemCode || line.item?.code || line.itemId}
                          </p>
                          <p className="text-xs text-navy-500">{line.item?.itemName || line.item?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-navy-900">
                            {Number(line.expectedQty || 0).toLocaleString()} kg
                          </p>
                          <p className="text-xs text-emerald-600">
                            Đã xuất: {Number(line.shippedQty || 0).toLocaleString()} kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {shipment.notes && (
                <div className="rounded-lg border border-moon-200 p-4">
                  <h3 className="text-sm font-semibold text-navy-800 mb-2">Ghi chú</h3>
                  <p className="text-sm text-navy-600">{shipment.notes}</p>
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
