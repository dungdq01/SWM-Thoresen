import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'
import { useCreatePosting } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations, useLookupInventoryStatuses, useLookupUoms } from '@domains/master-data'

const EVENT_CODES = [
  { value: 'RECEIPT_RECEIVED', label: 'Nhập kho (Receipt In)', refType: 'RECEIPT', requiresReason: false },
  { value: 'SHIPMENT_SHIPPED', label: 'Xuất kho (Shipment Out)', refType: 'SHIPMENT', requiresReason: false },
  { value: 'ADJUSTMENT_APPROVED', label: 'Điều chỉnh (Adjustment)', refType: 'ADJUSTMENT', requiresReason: true },
  { value: 'COUNT_GAIN_RECONCILED', label: 'Kiểm kê tăng (Count Gain)', refType: 'COUNT', requiresReason: true },
  { value: 'COUNT_LOSS_RECONCILED', label: 'Kiểm kê giảm (Count Loss)', refType: 'COUNT', requiresReason: true },
  { value: 'TRANSFER_RECEIVED', label: 'Chuyển vào (Transfer In)', refType: 'TRANSFER', requiresReason: false },
  { value: 'TRANSFER_SHIPPED', label: 'Chuyển ra (Transfer Out)', refType: 'TRANSFER', requiresReason: false },
]

const REASON_CODES = [
  { value: 'CYCLE_COUNT_ADJUST', label: 'Điều chỉnh do kiểm kê' },
  { value: 'DAMAGE_WRITEOFF', label: 'Ghi giảm do hư hỏng' },
  { value: 'SHRINKAGE', label: 'Hao hụt' },
  { value: 'MANUAL_ADJUST', label: 'Điều chỉnh thủ công' },
  { value: 'OTHER', label: 'Lý do khác' },
]

const initialFormState = {
  eventCode: 'RECEIPT_RECEIVED',
  itemId: '',
  qty: '',
  uomCode: 'KG',
  warehouseId: '',
  warehouseCode: '',
  locationCode: '',
  ownerCode: '',
  statusCode: 'AVAILABLE',
  refId: '',
  reasonCode: '',
}

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-navy-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export function InventoryTransactionDrawer({ isOpen, onClose }) {
  const [form, setForm] = useState(initialFormState)
  const { mutate: createPosting, isPending } = useCreatePosting()

  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: locationOptions = [] } = useLookupLocations(form.warehouseId)
  const { data: statusOptions = [] } = useLookupInventoryStatuses()
  const { data: uomOptions = [] } = useLookupUoms()

  useEffect(() => {
    if (!isOpen) setForm(initialFormState)
  }, [isOpen])

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleWarehouseChange = (warehouseId) => {
    const selected = warehouseOptions.find((w) => w.id === warehouseId)
    setForm((prev) => ({ ...prev, warehouseId, warehouseCode: selected?.code || '', locationCode: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const selectedOwner = ownerOptions.find((o) => o.id === form.ownerCode)
    const selectedEvent = EVENT_CODES.find((e) => e.value === form.eventCode)
    const timestamp = Date.now()
    const externalId = form.refId || `${selectedEvent?.refType || 'MANUAL'}-${timestamp}`

    const payload = {
      externalId,
      correlationId: `COR-${timestamp}`,
      eventCode: form.eventCode,
      refType: selectedEvent?.refType || 'MANUAL',
      refId: externalId,
      itemId: form.itemId,
      qty: String(form.qty),
      uomCode: form.uomCode,
      sourceApp: 'WEB',
      reasonCode: selectedEvent?.requiresReason ? form.reasonCode : undefined,
      dimTo: {
        warehouseCode: form.warehouseCode,
        locationCode: form.locationCode,
        ownerCode: selectedOwner?.code || '',
        statusCode: form.statusCode,
      },
    }
    createPosting(payload, { onSuccess: () => onClose() })
  }

  const selectedEvent = EVENT_CODES.find((e) => e.value === form.eventCode)
  const requiresReason = selectedEvent?.requiresReason || false
  const isValid = form.itemId && form.qty && form.warehouseId && form.locationCode && form.ownerCode && (!requiresReason || form.reasonCode)

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Tạo giao dịch kho</h2>
                <p className="text-xs text-navy-400 mt-0.5">Tạo bút toán giao dịch tồn kho thủ công</p>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Loại giao dịch</Label>
                  <Select value={form.eventCode} onChange={(e) => handleChange('eventCode', e.target.value)} options={EVENT_CODES} />
                </div>
                <div>
                  <Label>Mã tham chiếu</Label>
                  <Input value={form.refId} onChange={(e) => handleChange('refId', e.target.value)} placeholder="VD: RCV-20260308-001..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Mặt hàng</Label>
                  <Select value={form.itemId} onChange={(e) => handleChange('itemId', e.target.value)} placeholder="Chọn mặt hàng"
                    options={itemOptions.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))} />
                </div>
                <div>
                  <Label required>Chủ hàng</Label>
                  <Select value={form.ownerCode} onChange={(e) => handleChange('ownerCode', e.target.value)} placeholder="Chọn chủ hàng"
                    options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Kho</Label>
                  <Select value={form.warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} placeholder="Chọn kho"
                    options={warehouseOptions.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
                </div>
                <div>
                  <Label required>Vị trí</Label>
                  <Select value={form.locationCode} onChange={(e) => handleChange('locationCode', e.target.value)} placeholder="Chọn vị trí"
                    disabled={!form.warehouseId}
                    options={locationOptions.map((l) => ({ value: l.code, label: l.code }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Số lượng</Label>
                  <Input type="number" value={form.qty} onChange={(e) => handleChange('qty', e.target.value)} placeholder="VD: 25000, -5000..." />
                </div>
                <div>
                  <Label required>Đơn vị</Label>
                  <Select value={form.uomCode} onChange={(e) => handleChange('uomCode', e.target.value)}
                    options={uomOptions.map((u) => ({ value: u.code, label: `${u.code} - ${u.name || u.code}` }))} />
                </div>
              </div>

              <div>
                <Label required>Trạng thái tồn kho</Label>
                <Select value={form.statusCode} onChange={(e) => handleChange('statusCode', e.target.value)}
                  options={statusOptions.map((s) => ({ value: s.code, label: `${s.code} - ${s.name || s.code}` }))} />
              </div>

              {requiresReason && (
                <div>
                  <Label required>Lý do</Label>
                  <Select value={form.reasonCode} onChange={(e) => handleChange('reasonCode', e.target.value)} placeholder="Chọn lý do" options={REASON_CODES} />
                </div>
              )}
            </form>

            <div className="border-t border-moon-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-navy-400">
                {isValid ? <span className="text-success font-medium">✓ Sẵn sàng tạo giao dịch</span> : 'Vui lòng điền đầy đủ thông tin *'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Hủy</Button>
                <Button type="submit" size="sm" disabled={!isValid || isPending} loading={isPending} onClick={handleSubmit}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tạo giao dịch
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
