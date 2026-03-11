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

export function InventoryTransactionModal({ isOpen, onClose }) {
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

    const selectedWarehouse = warehouseOptions.find((w) => w.id === form.warehouseId)
    const selectedOwner = ownerOptions.find((o) => o.id === form.ownerCode)
    const selectedEvent = EVENT_CODES.find((e) => e.value === form.eventCode)
    
    const timestamp = Date.now()
    const externalId = form.refId || `${selectedEvent?.refType || 'MANUAL'}-${timestamp}`
    const correlationId = `COR-${timestamp}`

    const payload = {
      externalId,
      correlationId,
      eventCode: form.eventCode,
      refType: selectedEvent?.refType || 'MANUAL',
      refId: externalId,
      itemId: form.itemId,
      qty: String(form.qty),
      uomCode: form.uomCode,
      sourceApp: 'WEB',
      reasonCode: selectedEvent?.requiresReason ? form.reasonCode : undefined,
      dimTo: {
        warehouseCode: selectedWarehouse?.code || '',
        locationCode: form.locationCode,
        ownerCode: selectedOwner?.code || '',
        statusCode: form.statusCode,
      },
    }

    createPosting(payload, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  const handleWarehouseChange = (warehouseId) => {
    const selectedWarehouse = warehouseOptions.find((w) => w.id === warehouseId)
    setForm((prev) => ({
      ...prev,
      warehouseId,
      warehouseCode: selectedWarehouse?.code || '',
      locationCode: '',
    }))
  }

  const handleOwnerChange = (ownerId) => {
    setForm((prev) => ({
      ...prev,
      ownerCode: ownerId,
    }))
  }

  const selectedEvent = EVENT_CODES.find((e) => e.value === form.eventCode)
  const requiresReason = selectedEvent?.requiresReason || false
  const isValid = form.itemId && form.qty && form.warehouseId && form.locationCode && form.ownerCode && (!requiresReason || form.reasonCode)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo giao dịch kho" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Loại giao dịch</Label>
            <Select
              value={form.eventCode}
              onChange={(e) => handleChange('eventCode', e.target.value)}
              options={EVENT_CODES}
            />
          </div>
          <div>
            <Label>Mã tham chiếu</Label>
            <Input
              value={form.refId}
              onChange={(e) => handleChange('refId', e.target.value)}
              placeholder="VD: RCV-20260308-001, SHP-20260308-007..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Mặt hàng</Label>
            <Select
              value={form.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              placeholder="Chọn mặt hàng"
              options={itemOptions.map((item) => ({
                value: item.id,
                label: `${item.code} - ${item.name}`,
              }))}
            />
          </div>
          <div>
            <Label required>Chủ hàng</Label>
            <Select
              value={form.ownerCode}
              onChange={(e) => handleOwnerChange(e.target.value)}
              placeholder="Chọn chủ hàng"
              options={ownerOptions.map((owner) => ({
                value: owner.id,
                label: `${owner.code} - ${owner.name}`,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Kho</Label>
            <Select
              value={form.warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              placeholder="Chọn kho"
              options={warehouseOptions.map((wh) => ({
                value: wh.id,
                label: `${wh.code} - ${wh.name}`,
              }))}
            />
          </div>
          <div>
            <Label required>Vị trí</Label>
            <Select
              value={form.locationCode}
              onChange={(e) => handleChange('locationCode', e.target.value)}
              placeholder="Chọn vị trí"
              disabled={!form.warehouseId}
              options={locationOptions.map((loc) => ({
                value: loc.code,
                label: `${loc.code} - ${loc.extra?.locationType || 'Storage'}`,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Số lượng</Label>
            <Input
              type="number"
              value={form.qty}
              onChange={(e) => handleChange('qty', e.target.value)}
              placeholder="VD: 25000, -5000, 1000..."
            />
          </div>
          <div>
            <Label required>Đơn vị</Label>
            <Select
              value={form.uomCode}
              onChange={(e) => handleChange('uomCode', e.target.value)}
              options={uomOptions.map((uom) => ({
                value: uom.code,
                label: `${uom.code} - ${uom.name || uom.code}`,
              }))}
            />
          </div>
        </div>

        <div>
          <Label required>Trạng thái tồn kho</Label>
          <Select
            value={form.statusCode}
            onChange={(e) => handleChange('statusCode', e.target.value)}
            options={statusOptions.map((status) => ({
              value: status.code,
              label: `${status.code} - ${status.name || status.code}`,
            }))}
          />
        </div>

        {requiresReason && (
          <div>
            <Label required>Lý do</Label>
            <Select
              value={form.reasonCode}
              onChange={(e) => handleChange('reasonCode', e.target.value)}
              placeholder="Chọn lý do"
              options={REASON_CODES}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={!isValid || isPending} isLoading={isPending}>
            <Plus className="w-4 h-4 mr-1" />
            Tạo giao dịch
          </Button>
        </div>
      </form>
    </Modal>
  )
}
