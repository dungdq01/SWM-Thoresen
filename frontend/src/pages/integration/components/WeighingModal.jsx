import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scale, X } from 'lucide-react'
import { Badge, Button, Input } from '@shared/ui'

export function WeighingModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  data,
}) {
  const [weightKg, setWeightKg] = useState('')

  // Determine if this is lần 1 (gross) or lần 2+ (intermediate/tare)
  const isSecondWeighing = data?.grossWeightKg != null && Number(data.grossWeightKg) > 0
  // Multi-item: use lastWeightKg (most recent weighing) instead of grossWeightKg
  const previousWeight = data?.lastWeightKg || (data?.grossWeightKg ? Number(data.grossWeightKg) : 0)
  const weighingNumber = (data?.weightRecordCount || 0) + 1

  // Item đã dỡ đang chờ cân (UNLOADED) - cho inbound
  const unloadedLines = (data?.receipt?.lines || []).filter((l) => l.status === 'UNLOADED')
  const currentUnloadedItem = unloadedLines[0] || null

  // Item đã xếp đang chờ cân (LOADING) - cho outbound
  const loadingLines = (data?.shipment?.lines || []).filter((l) => l.lineStatus === 'LOADING')
  const currentLoadingItem = loadingLines[0] || null

  useEffect(() => {
    if (isOpen) {
      setWeightKg('')
    }
  }, [isOpen, isSecondWeighing])

  const handleSubmit = () => {
    onSubmit({
      id: data.id,
      weightKg: Number(weightKg),
    })
  }

  // Công thức tính TL ròng:
  // - Cân ra (WEIGH_OUT): Lần 1 xe trống, Lần 2 xe đầy → TL ròng = TL lần 2 - TL lần 1
  // - Cân vào (WEIGH_IN): Lần 1 xe đầy, Lần 2 xe trống → TL ròng = TL lần 1 - TL lần 2
  const isWeighOut = data?.weighingType === 'WEIGH_OUT'
  const netWeight = isSecondWeighing && weightKg
    ? (isWeighOut
        ? Number(weightKg) - previousWeight  // Cân ra: lần sau - lần trước
        : previousWeight - Number(weightKg)) // Cân vào: lần trước - lần sau (xe nhẹ dần)
    : null

  // Validation
  const weightError = isSecondWeighing && isWeighOut && weightKg && Number(weightKg) < previousWeight
    ? `Trọng lượng (${Number(weightKg).toLocaleString('vi-VN')} kg) không được nhỏ hơn lần trước (${previousWeight.toLocaleString('vi-VN')} kg)`
    : isSecondWeighing && !isWeighOut && weightKg && Number(weightKg) >= previousWeight
    ? `Trọng lượng (${Number(weightKg).toLocaleString('vi-VN')} kg) phải nhỏ hơn lần trước (${previousWeight.toLocaleString('vi-VN')} kg) vì đã dỡ hàng`
    : null

  // Block nếu cân lần 2+ mà chưa dỡ hàng (inbound)
  const needsUnload = isSecondWeighing && !isWeighOut && unloadedLines.length === 0 && (data?.receipt?.lines || []).some((l) => l.status === 'OPEN')
  // Block nếu cân lần 2+ mà chưa xếp hàng (outbound)
  const needsLoad = isSecondWeighing && isWeighOut && loadingLines.length === 0 && (data?.shipment?.lines || []).some((l) => l.lineStatus === 'PENDING')
  const isValid = weightKg !== '' && Number(weightKg) > 0 && !weightError && !needsUnload && !needsLoad

  const weighingTypeLabel = data?.weighingType === 'WEIGH_IN' ? 'Cân vào' : data?.weighingType === 'WEIGH_OUT' ? 'Cân ra' : data?.weighingType

  if (!isOpen || !data) return null

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
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-moon-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Scale className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">
                    {isSecondWeighing ? `Cân lần ${weighingNumber}` : 'Cân lần 1'}
                  </h2>
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
              {/* Info summary */}
              <div className="rounded-lg border border-moon-200 bg-moon-50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-navy-500">Loại</p>
                    <Badge variant={data.weighingType === 'WEIGH_IN' ? 'info' : 'success'}>
                      {weighingTypeLabel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Số xe</p>
                    <p className="font-medium text-navy-800">{data.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Chủ hàng</p>
                    <p className="font-medium text-navy-800">{data.owner?.name || data.owner?.code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">{isWeighOut ? 'Phiếu xuất' : 'Phiếu nhập'}</p>
                    <p className="font-medium text-navy-800">{data.shipment?.shipmentNumber || data.asnId || data.ticketNumber || '-'}</p>
                  </div>
                </div>
                {/* Danh sách items trên xe - inbound */}
                {data.receipt?.lines?.length > 0 && (
                  <div>
                    <p className="text-xs text-navy-500 mb-1">Mặt hàng trên xe ({data.receipt.lines.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.receipt.lines.map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white border border-moon-200 px-2 py-1 text-xs text-navy-700">
                          <span className="font-semibold">{l.item?.itemCode || l.itemCode}</span>
                          <span className="text-navy-400">—</span>
                          <span>{l.item?.itemName || ''}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Danh sách items trên xe - outbound */}
                {data.shipment?.lines?.length > 0 && (
                  <div>
                    <p className="text-xs text-navy-500 mb-1">Mặt hàng ({data.shipment.lines.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.shipment.lines.map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white border border-moon-200 px-2 py-1 text-xs text-navy-700">
                          <span className="font-semibold">{l.item?.itemCode || l.itemCode}</span>
                          <span className="text-navy-400">—</span>
                          <span>{l.item?.itemName || l.itemName || ''}</span>
                          {l.lineStatus && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                              l.lineStatus === 'LINE_SHIPPED' ? 'bg-green-100 text-green-700' :
                              l.lineStatus === 'LOADING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {l.lineStatus === 'LINE_SHIPPED' ? 'Đã cân' : l.lineStatus === 'LOADING' ? 'Đã xếp' : 'Chờ'}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!isSecondWeighing && data.receipt?.lines?.length > 1 && (
                  <p className="text-xs text-amber-600">
                    Cân lần 1 ghi trọng lượng tổng (xe + tất cả hàng). Phân bổ từng item sẽ thực hiện khi dỡ hàng.
                  </p>
                )}
              </div>

              {/* Show existing gross weight if this is second weighing */}
              {isSecondWeighing && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600">Trọng lượng lần {weighingNumber - 1} (đã ghi nhận)</p>
                        <p className="text-lg font-bold text-blue-700">
                          {previousWeight.toLocaleString('vi-VN')} KG
                        </p>
                      </div>
                      {data.grossWeightAt && (
                        <p className="text-xs text-blue-500">
                          {new Date(data.grossWeightAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Item đã dỡ — đang tính cân cho item này (inbound) */}
                  {currentUnloadedItem && (
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600 mb-1">Hàng vừa dỡ — lần cân này tính cho:</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800 text-xs font-bold">📦</div>
                        <div>
                          <p className="font-semibold text-emerald-900">{currentUnloadedItem.item?.itemName || ''}</p>
                          <p className="text-xs text-emerald-700">{currentUnloadedItem.item?.itemCode || ''}</p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">
                        TL ròng = {previousWeight.toLocaleString('vi-VN')} KG (lần {weighingNumber - 1}) − TL lần {weighingNumber}
                      </p>
                    </div>
                  )}
                  {/* Item đã xếp — đang tính cân cho item này (outbound) */}
                  {currentLoadingItem && (
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600 mb-1">Hàng vừa xếp — lần cân này tính cho:</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800 text-xs font-bold">📦</div>
                        <div>
                          <p className="font-semibold text-emerald-900">{currentLoadingItem.item?.itemName || currentLoadingItem.itemName || ''}</p>
                          <p className="text-xs text-emerald-700">{currentLoadingItem.item?.itemCode || currentLoadingItem.itemCode || ''}</p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">
                        TL ròng = TL lần {weighingNumber} − {previousWeight.toLocaleString('vi-VN')} KG (lần {weighingNumber - 1})
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cảnh báo chưa dỡ hàng (inbound) */}
              {needsUnload && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-800">⚠ Chưa dỡ mặt hàng nào</p>
                  <p className="text-sm text-red-700">
                    Vui lòng đến trang <strong>Dỡ hàng</strong> để dỡ ít nhất 1 mặt hàng xuống kho trước khi cân tiếp.
                  </p>
                  <a href="/app/inbound-operations/unloading" className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                    Đến trang Dỡ hàng →
                  </a>
                </div>
              )}

              {/* Cảnh báo chưa xếp hàng (outbound) */}
              {needsLoad && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-800">⚠ Chưa xếp mặt hàng nào</p>
                  <p className="text-sm text-red-700">
                    Vui lòng đến trang <strong>Xếp hàng</strong> để xếp ít nhất 1 mặt hàng lên xe trước khi cân tiếp.
                  </p>
                  <a href="/app/outbound-operations/loading" className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                    Đến trang Xếp hàng →
                  </a>
                </div>
              )}

              {/* Weight input */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">
                    {isSecondWeighing ? '2' : '1'}
                  </span>
                  {isSecondWeighing ? `Nhập trọng lượng lần ${weighingNumber}` : 'Nhập trọng lượng lần 1'}
                </h3>

                <Input
                  label={isSecondWeighing ? `Trọng lượng lần ${weighingNumber} (KG) *` : 'Trọng lượng lần 1 (KG) *'}
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="VD: 45000"
                  min="0"
                  step="0.001"
                  error={weightError}
                />

                {netWeight != null && !weightError && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-600 mb-1">Trọng lượng hàng ròng (dự kiến)</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {Math.abs(netWeight).toLocaleString('vi-VN')} KG
                    </p>
                    <p className="text-xs text-navy-400 mt-1">
                      = {isWeighOut
                        ? `${Number(weightKg).toLocaleString('vi-VN')} - ${previousWeight.toLocaleString('vi-VN')} (lần ${weighingNumber} - lần ${weighingNumber - 1})`
                        : `${previousWeight.toLocaleString('vi-VN')} - ${Number(weightKg).toLocaleString('vi-VN')} (lần ${weighingNumber - 1} - lần ${weighingNumber})`
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-between border-t border-moon-200 bg-moon-50 px-6 py-4">
              <p className="text-xs text-navy-400">
                {isValid ? (
                  <span className="font-medium text-emerald-600">
                    * Sẵn sàng ghi nhận
                  </span>
                ) : (
                  `* Trọng lượng ${isSecondWeighing ? `lần ${weighingNumber}` : 'lần 1'} là bắt buộc`
                )}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Hủy
                </Button>
                <Button
                  variant="accent"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  disabled={!isValid}
                >
                  Ghi nhận
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
