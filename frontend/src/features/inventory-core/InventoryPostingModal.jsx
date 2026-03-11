import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, Modal, Input, Select } from '@shared/ui'
import { useCreatePosting } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations, useLookupInventoryStatuses, useLookupUoms } from '@domains/master-data'

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-navy-700">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

const initialFormState = {
  itemId: '',
  qty: '',
  uomCode: 'KG',
  warehouseId: '',
  warehouseCode: '',
  locationCode: '',
  ownerCode: '',
  statusCode: 'AVAILABLE',
}

export function InventoryPostingModal({ isOpen, onClose }) {
  const [form, setForm] = useState(initialFormState)
  const { mutate: createPosting, isPending } = useCreatePosting()

  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: locationOptions = [] } = useLookupLocations(form.warehouseId)
  const { data: statusOptions = [] } = useLookupInventoryStatuses()
  const { data: uomOptions = [] } = useLookupUoms()

  useEffect(() => {
    if (!isOpen) {
      setForm(initialFormState)
    }
  }, [isOpen])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const externalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const payload = {
      externalId,
      correlationId: externalId,
      eventCode: 'RECEIPT_RECEIVED',
      refType: 'MANUAL_ENTRY',
      refId: `MANUAL-${Date.now()}`,
      refLineId: 'LINE-01',
      itemId: form.itemId,
      qty: form.qty,
      uomCode: form.uomCode,
      dimTo: {
        siteCode: 'TVL-SITE',
        warehouseCode: form.warehouseCode,
        locationCode: form.locationCode,
        ownerCode: form.ownerCode,
        statusCode: form.statusCode,
      },
      sourceApp: 'WEB',
    }

    createPosting(payload, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  const isValid = form.itemId && form.qty && form.warehouseId && form.locationCode && form.ownerCode

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhập tồn kho" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label required>Mặt hàng</Label>
            <Select
              value={form.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              placeholder="Chọn mặt hàng"
              options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
          </div>

          <div className="space-y-2">
            <Label required>Chủ hàng</Label>
            <Select
              value={form.ownerCode}
              onChange={(e) => handleChange('ownerCode', e.target.value)}
              placeholder="Chọn chủ hàng"
              options={ownerOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))}
            />
          </div>

          <div className="space-y-2">
            <Label required>Kho</Label>
            <Select
              value={form.warehouseId}
              onChange={(e) => {
                const selected = warehouseOptions.find((o) => o.id === e.target.value)
                handleChange('warehouseId', e.target.value)
                handleChange('warehouseCode', selected?.code || '')
                handleChange('locationCode', '')
              }}
              placeholder="Chọn kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
          </div>

          <div className="space-y-2">
            <Label required>Vị trí</Label>
            <Select
              value={form.locationCode}
              onChange={(e) => handleChange('locationCode', e.target.value)}
              placeholder="Chọn vị trí"
              options={locationOptions.map((o) => ({ value: o.code, label: o.code }))}
            />
          </div>

          <div className="space-y-2">
            <Label required>Số lượng</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.qty}
              onChange={(e) => handleChange('qty', e.target.value)}
              placeholder="Nhập số lượng"
            />
          </div>

          <div className="space-y-2">
            <Label required>Đơn vị</Label>
            <Select
              value={form.uomCode}
              onChange={(e) => handleChange('uomCode', e.target.value)}
              options={uomOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Trạng thái tồn kho</Label>
            <Select
              value={form.statusCode}
              onChange={(e) => handleChange('statusCode', e.target.value)}
              options={statusOptions.map((o) => ({ value: o.code, label: `${o.code} - ${o.name}` }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" disabled={!isValid || isPending} loading={isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Nhập tồn kho
          </Button>
        </div>
      </form>
    </Modal>
  )
}
