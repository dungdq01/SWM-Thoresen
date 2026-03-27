import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'
import { useCreatePosting } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations, useLookupInventoryStatuses, useLookupUoms } from '@domains/master-data'

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-navy-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

const initialFormState = {
  type: 'INBOUND', // 'INBOUND' or 'OUTBOUND'
  itemId: '',
  qty: '',
  uomCode: 'KG',
  warehouseId: '',
  warehouseCode: '',
  locationCode: '',
  ownerCode: '',
  statusCode: 'AVAILABLE',
  note: '',
}

export function InventoryPostingDrawer({ isOpen, onClose }) {
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const externalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const isOutbound = form.type === 'OUTBOUND'
    
    // For manual entries, siteCode is usually fixed or from context
    const siteCode = 'TVL-SITE'
    
    const payload = {
      externalId,
      correlationId: externalId,
      eventCode: isOutbound ? 'SHIPMENT_SHIPPED' : 'RECEIPT_RECEIVED',
      refType: 'MANUAL_ENTRY',
      refId: `MANUAL-${Date.now()}`,
      refLineId: 'LINE-01',
      itemId: form.itemId,
      qty: isOutbound ? `-${form.qty}` : form.qty,
      uomCode: form.uomCode,
      sourceApp: 'WEB',
    }

    if (isOutbound) {
      payload.dimFrom = {
        siteCode,
        warehouseCode: form.warehouseCode,
        locationCode: form.locationCode || undefined,
        ownerCode: form.ownerCode,
        statusCode: form.statusCode,
      }
    } else {
      payload.dimTo = {
        siteCode,
        warehouseCode: form.warehouseCode,
        locationCode: form.locationCode || undefined,
        ownerCode: form.ownerCode,
        statusCode: form.statusCode,
      }
    }

    createPosting(payload, { onSuccess: () => onClose() })
  }

  const isValid = form.itemId && form.qty && form.warehouseId && form.locationCode && form.ownerCode

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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Nhập tồn kho</h2>
                <p className="text-xs text-navy-400 mt-0.5">Tạo bút toán nhập kho thủ công</p>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Type Toggle */}
              <div className="flex p-1 bg-moon-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleChange('type', 'INBOUND')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    form.type === 'INBOUND' ? 'bg-white text-primary shadow-sm' : 'text-navy-400 hover:text-navy-600'
                  }`}
                >
                  Nhập tồn kho ( + )
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('type', 'OUTBOUND')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    form.type === 'OUTBOUND' ? 'bg-white text-red-600 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                  }`}
                >
                  Xuất tồn kho ( - )
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label required>Mặt hàng</Label>
                  <Select value={form.itemId} onChange={(e) => handleChange('itemId', e.target.value)} placeholder="Chọn mặt hàng"
                    options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
                </div>
                <div>
                  <Label required>Chủ hàng</Label>
                  <Select value={form.ownerCode} onChange={(e) => handleChange('ownerCode', e.target.value)} placeholder="Chọn chủ hàng"
                    options={ownerOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))} />
                </div>
                <div>
                  <Label required>Kho</Label>
                  <Select value={form.warehouseId} onChange={(e) => {
                    const selected = warehouseOptions.find((o) => o.id === e.target.value)
                    handleChange('warehouseId', e.target.value)
                    handleChange('warehouseCode', selected?.code || '')
                    handleChange('locationCode', '')
                  }} placeholder="Chọn kho"
                    options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
                </div>
                <div>
                  <Label required>Vị trí</Label>
                  <Select value={form.locationCode} onChange={(e) => handleChange('locationCode', e.target.value)} placeholder="Chọn vị trí"
                    options={locationOptions.map((o) => ({ value: o.code, label: o.code }))} />
                </div>
                <div>
                  <Label required>Số lượng</Label>
                  <Input type="number" step="0.001" min="0" value={form.qty} onChange={(e) => handleChange('qty', e.target.value)} placeholder="Nhập số lượng" />
                </div>
                <div>
                  <Label required>Đơn vị</Label>
                  <Select value={form.uomCode} onChange={(e) => handleChange('uomCode', e.target.value)}
                    options={uomOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Trạng thái tồn kho</Label>
                  <Select value={form.statusCode} onChange={(e) => handleChange('statusCode', e.target.value)}
                    options={statusOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Ghi chú</Label>
                  <textarea
                    className="wrs-input w-full"
                    rows={2}
                    value={form.note}
                    onChange={(e) => handleChange('note', e.target.value)}
                    placeholder="Ghi chú cho bút toán nhập kho (tùy chọn)"
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="border-t border-moon-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-navy-400">
                {isValid ? <span className="text-success font-medium">✓ Sẵn sàng nhập kho</span> : 'Vui lòng điền đầy đủ thông tin *'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Hủy</Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  variant={form.type === 'OUTBOUND' ? 'danger' : 'primary'}
                  disabled={!isValid || isPending} 
                  loading={isPending} 
                  onClick={handleSubmit}
                >
                  {form.type === 'OUTBOUND' ? (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Xuất tồn kho
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Nhập tồn kho
                    </>
                  )}
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
