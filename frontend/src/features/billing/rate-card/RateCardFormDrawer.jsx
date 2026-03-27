import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const FEE_TYPE_OPTIONS = [
  { value: 'STORAGE', label: 'Lưu trữ' },
  { value: 'HANDLING_INBOUND', label: 'Nhập hàng' },
  { value: 'HANDLING_OUTBOUND', label: 'Xuất hàng' },
  { value: 'BAGGING', label: 'Đóng gói' },
  { value: 'STUFFING', label: 'Đóng cont' },
]

const emptyDraft = {
  ownerId: '',
  feeType: '',
  notes: '',
  unitRate: '',
  billingUom: 'KG',
  effectiveFrom: '',
  effectiveTo: '',
}

export function RateCardFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  owners = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const isValid = !!(draft.ownerId && draft.feeType && draft.unitRate && draft.effectiveFrom && draft.effectiveTo)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      ownerId: draft.ownerId,
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo,
      notes: draft.notes || undefined,
      externalId: `CTR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      feeLines: [{
        feeType: draft.feeType,
        unitRate: parseFloat(draft.unitRate),
        billingUom: draft.billingUom,
      }],
    })
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo hợp đồng</h2>
                  <p className="text-xs text-navy-400">Thiết lập giá dịch vụ cho chủ sở hữu</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Chủ sở hữu *"
                  value={draft.ownerId}
                  onChange={(e) => set('ownerId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn chủ sở hữu --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                />
                <Select
                  label="Loại phí *"
                  value={draft.feeType}
                  onChange={(e) => set('feeType', e.target.value)}
                  options={[{ value: '', label: '-- Chọn loại phí --' }, ...FEE_TYPE_OPTIONS]}
                />
              </div>
              <Input
                label="Ghi chú"
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Thông tin thêm về hợp đồng..."
              />
              <div className="rounded-xl border border-moon-200 bg-moon-50/60 p-4 space-y-4">
                <p className="text-sm font-semibold text-navy-800">Thông tin giá</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Đơn giá (VND) *"
                    type="number"
                    value={draft.unitRate}
                    onChange={(e) => set('unitRate', e.target.value)}
                    placeholder="0"
                  />
                  <Select
                    label="Đơn vị tính"
                    value={draft.billingUom}
                    onChange={(e) => set('billingUom', e.target.value)}
                    options={[{ value: 'KG', label: 'KG' }, { value: 'BAG', label: 'Bao' }, { value: 'PALLET', label: 'Pallet' }]}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-moon-200 bg-moon-50/60 p-4 space-y-4">
                <p className="text-sm font-semibold text-navy-800">Thời hạn hiệu lực</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ngày bắt đầu *"
                    type="date"
                    value={draft.effectiveFrom}
                    onChange={(e) => set('effectiveFrom', e.target.value)}
                  />
                  <Input
                    label="Ngày kết thúc *"
                    type="date"
                    value={draft.effectiveTo}
                    onChange={(e) => set('effectiveTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ Thông tin hợp lệ</span>
                    : 'Điền đầy đủ chủ sở hữu, loại phí, đơn giá và thời hạn'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang tạo...' : 'Tạo hợp đồng'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
