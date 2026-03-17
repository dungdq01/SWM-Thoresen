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

  // Determine if this is lần 1 (gross) or lần 2 (tare)
  const isSecondWeighing = data?.grossWeightKg != null && Number(data.grossWeightKg) > 0

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
        ? Number(weightKg) - Number(data.grossWeightKg)  // Cân ra: lần 2 - lần 1 (xe đầy - xe trống)
        : Number(data.grossWeightKg) - Number(weightKg)) // Cân vào: lần 1 - lần 2 (xe đầy - xe trống)
    : null

  // Validation: Cân ra - TL lần 2 không được nhỏ hơn TL lần 1 (vì xe đã pack đồ)
  const weightError = isSecondWeighing && isWeighOut && weightKg && Number(weightKg) < Number(data.grossWeightKg)
    ? `Trọng lượng lần 2 (${Number(weightKg).toLocaleString('vi-VN')} kg) không được nhỏ hơn trọng lượng lần 1 (${Number(data.grossWeightKg).toLocaleString('vi-VN')} kg)`
    : null

  const isValid = weightKg !== '' && Number(weightKg) > 0 && !weightError

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
                    {isSecondWeighing ? 'Cân lần 2' : 'Cân lần 1'}
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
              <div className="rounded-lg border border-moon-200 bg-moon-50 p-4 space-y-2">
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
                    <p className="text-xs text-navy-500">Mã hàng</p>
                    <p className="font-medium text-navy-800">{data.itemCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Chủ hàng</p>
                    <p className="font-medium text-navy-800">{data.owner?.name || data.owner?.code || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Show existing gross weight if this is second weighing */}
              {isSecondWeighing && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600">Trọng lượng lần 1 (đã ghi nhận)</p>
                      <p className="text-lg font-bold text-blue-700">
                        {Number(data.grossWeightKg).toLocaleString('vi-VN')} KG
                      </p>
                    </div>
                    {data.grossWeightAt && (
                      <p className="text-xs text-blue-500">
                        {new Date(data.grossWeightAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Weight input */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">
                    {isSecondWeighing ? '2' : '1'}
                  </span>
                  {isSecondWeighing ? 'Nhập trọng lượng lần 2' : 'Nhập trọng lượng lần 1'}
                </h3>

                <Input
                  label={isSecondWeighing ? 'Trọng lượng lần 2 (KG) *' : 'Trọng lượng lần 1 (KG) *'}
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
                    {isWeighOut && (
                      <p className="text-xs text-navy-400 mt-1">
                        = {Number(weightKg).toLocaleString('vi-VN')} - {Number(data.grossWeightKg).toLocaleString('vi-VN')} (lần 2 - lần 1)
                      </p>
                    )}
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
                  `* Trọng lượng ${isSecondWeighing ? 'lần 2' : 'lần 1'} là bắt buộc`
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
