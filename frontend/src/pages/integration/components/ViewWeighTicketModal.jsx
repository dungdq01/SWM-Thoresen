import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scale, X } from 'lucide-react'
import { Badge, Button } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'LINKED') return 'success'
  if (status === 'PENDING' || status === 'PROCESSING') return 'warning'
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

export function ViewWeighTicketModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null

  const weighingTypeLabel = data.weighingType === 'WEIGH_IN' ? 'Cân vào' : data.weighingType === 'WEIGH_OUT' ? 'Cân ra' : data.weighingType
  const isWeighOut = data.weighingType === 'WEIGH_OUT'
  const receiptLines = data.receipt?.lines || []
  const shipmentLines = data.shipment?.lines || []
  const ticketLines = isWeighOut ? shipmentLines : receiptLines

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatWeight = (weight) => {
    if (!weight && weight !== 0) return '-'
    return `${Number(weight).toLocaleString('vi-VN')} Kg`
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-moon-200 bg-gradient-to-r from-navy-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
                  <Scale className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Chi tiết phiếu cân</h2>
                  <p className="text-xs text-navy-500">{data.weighbridgeEventId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Section 1: Thông tin chung */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">1</span>
                  Thông tin chung
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Loại</p>
                    <Badge variant={data.weighingType === 'WEIGH_IN' ? 'info' : 'success'}>
                      {weighingTypeLabel}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Trạng thái</p>
                    <Badge variant={statusTone(data.processingStatus)}>
                      {statusLabel(data.processingStatus)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Mã phiếu cân</p>
                    <p className="font-semibold text-navy-900">{data.weighbridgeEventId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">{data.weighingType === 'WEIGH_IN' ? 'Số phiếu nhập' : 'Số phiếu xuất'}</p>
                    <p className="font-medium text-navy-800">{data.ticketNumber || data.asnId || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Số xe</p>
                    <p className="font-medium text-navy-800">{data.vehicleNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Chủ hàng</p>
                    <p className="font-medium text-navy-800">{data.owner?.name || data.owner?.code || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Kho</p>
                    <p className="font-medium text-navy-800">{data.warehouse?.name || data.warehouse?.code || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-navy-500">Ngày tạo</p>
                    <p className="font-medium text-navy-800">{formatDateTime(data.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Thông tin cân */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">2</span>
                  Thông tin cân {ticketLines.length > 1 ? `(${ticketLines.length} items${!isWeighOut ? ' — N+1 lần cân' : ''})` : ''}
                </h3>

                <div className="overflow-hidden rounded-lg border border-moon-200">
                  <table className="w-full text-sm">
                    <thead className="bg-moon-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold text-navy-700">STT</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-navy-700">Mặt hàng</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-navy-700">TL cân trước</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-navy-700">TL cân sau</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-navy-700">TL ròng</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-navy-700">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketLines.length > 0 ? (() => {
                        // Cân vào (WEIGH_IN): xe nặng → nhẹ dần (dỡ hàng ra), TL cân trước > TL cân sau
                        // Cân ra (WEIGH_OUT): xe nhẹ → nặng dần (xếp hàng lên), TL cân trước < TL cân sau
                        const tare = data.grossWeightKg ? Number(data.grossWeightKg) : null // Lần 1 outbound = tare (xe rỗng)
                        let runningWeight = tare

                        return ticketLines.map((line, idx) => {
                          if (isWeighOut) {
                            // Cân ra: logic N+1 lần cân (ngược với cân vào)
                            const netWeight = line.netWeightKg ? Number(line.netWeightKg) : null
                            const isShipped = line.lineStatus === 'LINE_SHIPPED' && netWeight > 0
                            const prevWeight = isShipped ? runningWeight : null
                            const afterWeight = isShipped && runningWeight != null ? runningWeight + netWeight : null

                            if (isShipped && runningWeight != null) {
                              runningWeight = runningWeight + netWeight
                            }

                            const lineStatusLabel = {
                              'PENDING': 'Chờ xếp',
                              'LOADING': 'Đã xếp',
                              'LINE_SHIPPED': 'Đã cân',
                              'WEIGHED_PASS': 'Đã cân',
                            }

                            return (
                              <tr key={idx} className="border-t border-moon-100">
                                <td className="px-3 py-2.5 text-navy-400">{idx + 1}</td>
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-navy-800">{line.item?.itemName || line.itemName || '-'}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemCode || line.itemCode}</p>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-navy-700">{prevWeight != null ? formatWeight(prevWeight) : '-'}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-navy-700">{afterWeight != null ? formatWeight(afterWeight) : '-'}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold text-navy-900">{netWeight != null && netWeight > 0 ? formatWeight(netWeight) : '-'}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge variant={line.lineStatus === 'LINE_SHIPPED' ? 'success' : line.lineStatus === 'LOADING' ? 'warning' : 'default'}>
                                    {lineStatusLabel[line.lineStatus] || line.lineStatus || 'Chờ'}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          }

                          // Cân vào: logic N+1 lần cân
                          const netWeight = line.receivedQty ? Number(line.receivedQty) : null
                          const isReceived = line.status === 'RECEIVED' && netWeight > 0
                          const prevWeight = isReceived ? runningWeight : null
                          const afterWeight = isReceived && runningWeight != null ? runningWeight - netWeight : null

                          if (isReceived && runningWeight != null) {
                            runningWeight = runningWeight - netWeight
                          }

                          return (
                            <tr key={idx} className="border-t border-moon-100">
                              <td className="px-3 py-2.5 text-navy-400">{idx + 1}</td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-navy-800">{line.item?.itemName || line.itemName || '-'}</p>
                                <p className="text-xs text-navy-400">{line.item?.itemCode || line.itemCode}</p>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-navy-700">{prevWeight != null ? formatWeight(prevWeight) : '-'}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-navy-700">{afterWeight != null ? formatWeight(afterWeight) : '-'}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-navy-900">{netWeight != null && netWeight > 0 ? formatWeight(netWeight) : '-'}</td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge variant={line.status === 'RECEIVED' ? 'success' : line.status === 'UNLOADED' ? 'warning' : 'default'}>
                                  {line.status === 'RECEIVED' ? 'Đã nhận' : line.status === 'UNLOADED' ? 'Đã dỡ' : line.status === 'OPEN' ? 'Chờ dỡ' : line.status}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })
                      })() : (
                        <tr className="border-t border-moon-100">
                          <td className="px-3 py-2.5 text-navy-400">1</td>
                          <td className="px-3 py-2.5 font-medium text-navy-800">{data.itemCode || '-'}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-navy-700">{formatWeight(data.grossWeightKg)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-navy-700">{formatWeight(data.tareWeightKg)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-navy-900">{formatWeight(data.netWeightKg)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant={data.netWeightKg ? 'success' : 'default'}>
                              {data.netWeightKg ? 'Đã nhận' : 'Chờ'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      {/* Dòng tổng */}
                      {ticketLines.length > 0 && (
                        <tr className="border-t-2 border-navy-200 bg-moon-50">
                          <td className="px-3 py-2.5" colSpan={2}>
                            <p className="font-semibold text-navy-800">Tổng</p>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-navy-700">{formatWeight(data.grossWeightKg)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-navy-700">{formatWeight(data.tareWeightKg)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{formatWeight(data.netWeightKg)}</td>
                          <td className="px-3 py-2.5" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Ghi chú */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">3</span>
                  Ghi chú
                </h3>
                <div className="rounded-lg border border-moon-200 bg-moon-50 p-4">
                  <p className="text-sm text-navy-700 whitespace-pre-wrap">{data.notes || 'Không có ghi chú'}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
