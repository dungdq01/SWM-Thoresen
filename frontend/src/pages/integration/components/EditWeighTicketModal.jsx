import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scale, X } from 'lucide-react'
import { Badge, Button, Textarea } from '@shared/ui'

export function EditWeighTicketModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  data,
}) {
  const [notes, setNotes] = useState('')

  // Populate notes khi mở modal với data
  useEffect(() => {
    if (isOpen && data) {
      setNotes(data.notes || '')
    }
  }, [isOpen, data])

  const handleSubmit = () => {
    onSubmit({
      id: data.id,
      notes,
    })
  }

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
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-moon-200 bg-gradient-to-r from-navy-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Scale className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Chỉnh sửa phiếu cân</h2>
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
              {/* Section 1: Thông tin chung (Read-only) */}
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
                </div>
              </div>

              {/* Section 2: Ghi chú (Editable) */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">2</span>
                  Ghi chú
                  <span className="text-xs font-normal text-amber-600">(có thể chỉnh sửa)</span>
                </h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nhập ghi chú..."
                  rows={4}
                  className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button variant="accent" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
