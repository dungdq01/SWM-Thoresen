import { useMemo, useState } from 'react'
import { ArrowLeftRight, Boxes, RefreshCcw, Send } from 'lucide-react'
import { useCreatePosting, useReversePosting } from '@domains/inventory-core'
import { useLookupItems, useLookupWarehouses, useLookupLocations, useLookupOwners, useLookupUoms, useLookupInventoryStatuses } from '@domains/master-data'
import { Button, Input, Textarea } from '@shared/ui'

const EVENT_CODE_OPTIONS = [
  { value: 'RECEIPT_RECEIVED', label: 'Nhập kho từ phiếu nhận', refType: 'RECEIPT' },
  { value: 'PUTAWAY_COMPLETED', label: 'Hoàn tất cất hàng', refType: 'WORK' },
  { value: 'SHIPMENT_SHIPPED', label: 'Xuất kho từ phiếu xuất', refType: 'SHIPMENT' },
  { value: 'MOVE_COMPLETED', label: 'Hoàn tất di chuyển', refType: 'MOVE' },
  { value: 'STATUS_CHANGE_CONFIRMED', label: 'Thay đổi trạng thái', refType: 'STATUS_CHANGE' },
  { value: 'ADJUSTMENT_APPROVED', label: 'Điều chỉnh tồn kho', refType: 'ADJUSTMENT' },
  { value: 'COUNT_GAIN_RECONCILED', label: 'Kiểm kê thừa', refType: 'CYCLE_COUNT' },
  { value: 'COUNT_LOSS_RECONCILED', label: 'Kiểm kê thiếu', refType: 'CYCLE_COUNT' },
]

const REF_TYPE_OPTIONS = [
  { value: 'RECEIPT', label: 'Phiếu nhận hàng' },
  { value: 'SHIPMENT', label: 'Phiếu xuất hàng' },
  { value: 'WORK', label: 'Lệnh công việc' },
  { value: 'MOVE', label: 'Lệnh di chuyển' },
  { value: 'TRANSFER', label: 'Lệnh chuyển kho' },
  { value: 'ADJUSTMENT', label: 'Phiếu điều chỉnh' },
  { value: 'CYCLE_COUNT', label: 'Phiếu kiểm kê' },
  { value: 'STATUS_CHANGE', label: 'Thay đổi trạng thái' },
  { value: 'VAS', label: 'Lệnh VAS' },
]

const REASON_CODE_OPTIONS = [
  { value: 'DOCUMENT_ERROR', label: 'Lỗi chứng từ' },
  { value: 'DATA_ENTRY_ERROR', label: 'Nhập sai dữ liệu' },
  { value: 'WRONG_QUANTITY', label: 'Sai số lượng' },
  { value: 'WRONG_LOCATION', label: 'Sai vị trí' },
  { value: 'WRONG_ITEM', label: 'Sai mặt hàng' },
  { value: 'SYSTEM_ERROR', label: 'Lỗi hệ thống' },
  { value: 'OTHER', label: 'Lý do khác' },
]

const initialPosting = {
  eventCode: 'RECEIPT_RECEIVED',
  refType: 'RECEIPT',
  refId: '',
  refLineId: '',
  itemId: '',
  qty: '',
  uomCode: 'KG',
  warehouseCode: '',
  locationCode: '',
  ownerCode: '',
  statusCode: 'AVAILABLE',
}

const initialReverse = {
  originalTransId: '',
  reasonCode: 'DOCUMENT_ERROR',
  note: '',
}

export function InventoryPostingWorkbenchPage() {
  const [posting, setPosting] = useState(initialPosting)
  const [reverse, setReverse] = useState(initialReverse)
  const createPosting = useCreatePosting()
  const reversePosting = useReversePosting()
  const { data: itemOptions = [] } = useLookupItems()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: uomOptions = [] } = useLookupUoms()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: statusOptions = [] } = useLookupInventoryStatuses()

  const selectedWarehouse = warehouseOptions.find((w) => w.code === posting.warehouseCode)
  const { data: locationOptions = [] } = useLookupLocations(selectedWarehouse?.id)

  const handlePosting = async () => {
    const payload = {
      externalId: `posting-${Date.now()}`,
      correlationId: `corr-post-${Date.now()}`,
      eventCode: posting.eventCode,
      refType: posting.refType,
      refId: posting.refId,
      itemId: posting.itemId,
      qty: posting.qty,
      uomCode: posting.uomCode,
      dimTo: {
        warehouseCode: posting.warehouseCode,
        locationCode: posting.locationCode,
        ownerCode: posting.ownerCode,
        statusCode: posting.statusCode,
      },
      sourceApp: 'WEB',
    }
    payload.refLineId = posting.refLineId
    await createPosting.mutateAsync(payload)
  }

  const handleReverse = async () => {
    await reversePosting.mutateAsync({
      externalId: `reverse-${Date.now()}`,
      correlationId: `corr-reverse-${Date.now()}`,
      originalTransId: reverse.originalTransId,
      reasonCode: reverse.reasonCode,
      note: reverse.note,
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Bàn làm việc ghi sổ và đảo ngược</h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="form-section">
          <h3 className="form-section-title"><Send className="h-5 w-5 text-ice" /> Tạo ghi sổ</h3>
          <div className="form-grid">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mã sự kiện <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.eventCode} onChange={(e) => {
                const selected = EVENT_CODE_OPTIONS.find((o) => o.value === e.target.value)
                setPosting((prev) => ({ ...prev, eventCode: e.target.value, refType: selected?.refType || prev.refType }))
              }}>
                {EVENT_CODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Loại tham chiếu <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.refType} onChange={(e) => setPosting((prev) => ({ ...prev, refType: e.target.value }))}>
                {REF_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mã tham chiếu <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="wrs-input flex-1"
                  value={posting.refId}
                  onChange={(e) => setPosting((prev) => ({ ...prev, refId: e.target.value }))}
                  placeholder="VD: RCP-20260311-001"
                />
                <button
                  type="button"
                  className="px-3 py-2 text-xs font-medium text-ice border border-ice rounded-lg hover:bg-ice/10 transition-colors"
                  onClick={() => {
                    const prefix = REF_TYPE_OPTIONS.find((o) => o.value === posting.refType)?.value?.substring(0, 3).toUpperCase() || 'REF'
                    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
                    setPosting((prev) => ({ ...prev, refId: `${prefix}-${date}-${rand}` }))
                  }}
                >
                  Tự sinh
                </button>
              </div>
              <p className="text-xs text-navy-400 mt-1">Mã chứng từ nguồn (trong thực tế sẽ tự động từ module nghiệp vụ)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mã dòng tham chiếu <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="wrs-input flex-1"
                  value={posting.refLineId}
                  onChange={(e) => setPosting((prev) => ({ ...prev, refLineId: e.target.value }))}
                  placeholder="VD: LINE-01"
                />
                <button
                  type="button"
                  className="px-3 py-2 text-xs font-medium text-ice border border-ice rounded-lg hover:bg-ice/10 transition-colors"
                  onClick={() => setPosting((prev) => ({ ...prev, refLineId: `LINE-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}` }))}
                >
                  Tự sinh
                </button>
              </div>
              <p className="text-xs text-navy-400 mt-1">Mã dòng chi tiết trong chứng từ</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mặt hàng <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.itemId} onChange={(e) => setPosting((prev) => ({ ...prev, itemId: e.target.value }))}>
                <option value="">Chọn mặt hàng</option>
              {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
              </select>
            </div>
            <Input label="Số lượng" required value={posting.qty} onChange={(e) => setPosting((prev) => ({ ...prev, qty: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Đơn vị tính <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.uomCode} onChange={(e) => setPosting((prev) => ({ ...prev, uomCode: e.target.value }))}>
                <option value="">Chọn đơn vị</option>
                {uomOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Kho <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.warehouseCode} onChange={(e) => setPosting((prev) => ({ ...prev, warehouseCode: e.target.value, locationCode: '' }))}>
                <option value="">Chọn kho</option>
              {warehouseOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Vị trí <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.locationCode} onChange={(e) => setPosting((prev) => ({ ...prev, locationCode: e.target.value }))} disabled={!posting.warehouseCode}>
                <option value="">{posting.warehouseCode ? 'Chọn vị trí' : 'Chọn kho trước'}</option>
                {locationOptions.map((option) => <option key={option.id} value={option.code}>{option.code}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Chủ hàng <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.ownerCode} onChange={(e) => setPosting((prev) => ({ ...prev, ownerCode: e.target.value }))}>
                <option value="">Chọn chủ hàng</option>
                {ownerOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Trạng thái <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={posting.statusCode} onChange={(e) => setPosting((prev) => ({ ...prev, statusCode: e.target.value }))}>
                <option value="">Chọn trạng thái</option>
                {statusOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setPosting(initialPosting)}>Đặt lại</Button>
            <Button variant="accent" onClick={handlePosting} disabled={createPosting.isPending}>Ghi sổ giao dịch</Button>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title"><RefreshCcw className="h-5 w-5 text-ice" /> Đảo ngược giao dịch</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mã giao dịch gốc <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="wrs-input"
                value={reverse.originalTransId}
                onChange={(e) => setReverse((prev) => ({ ...prev, originalTransId: e.target.value }))}
                placeholder="VD: TRX-20260311-000007-FN37"
              />
              <p className="text-xs text-navy-400 mt-1">Nhập mã giao dịch (transId), không phải mã tham chiếu (refId)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Mã lý do <span className="text-red-500">*</span></label>
              <select className="wrs-input" value={reverse.reasonCode} onChange={(e) => setReverse((prev) => ({ ...prev, reasonCode: e.target.value }))}>
                {REASON_CODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Ghi chú <span className="text-red-500">*</span></label>
              <textarea
                className="wrs-input"
                rows={3}
                value={reverse.note}
                onChange={(e) => setReverse((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Nhập lý do đảo ngược giao dịch"
              />
            </div>
          </div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setReverse(initialReverse)}>Đặt lại</Button>
            <Button variant="destructive" onClick={handleReverse} disabled={reversePosting.isPending}>Đảo ngược giao dịch</Button>
          </div>
        </div>
      </div>
    </>
  )
}
