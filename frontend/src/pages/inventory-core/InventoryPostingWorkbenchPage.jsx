import { useMemo, useState } from 'react'
import { ArrowLeftRight, Boxes, RefreshCcw, Send } from 'lucide-react'
import { useCreatePosting, useReversePosting } from '@domains/inventory-core'
import { useLookupItems, useLookupWarehouses } from '@domains/master-data'
import { Button, Input, Textarea } from '@shared/ui'

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

  const handlePosting = async () => {
    await createPosting.mutateAsync({
      externalId: `posting-${Date.now()}`,
      correlationId: `corr-post-${Date.now()}`,
      eventCode: posting.eventCode,
      refType: posting.refType,
      refId: posting.refId,
      refLineId: posting.refLineId,
      itemId: posting.itemId,
      qty: posting.qty,
      uomCode: posting.uomCode,
      dimTo: {
        warehouseCode: posting.warehouseCode,
        locationCode: posting.locationCode,
        ownerCode: posting.ownerCode,
        statusCode: posting.statusCode,
      },
      sourceApp: 'FRONTEND',
      postedBy: localStorage.getItem('userCode') || 'admin',
    })
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
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Posting & reversal workbench</h2>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="form-section">
          <h3 className="form-section-title"><Send className="h-5 w-5 text-gold" /> Tạo posting</h3>
          <div className="form-grid">
            <Input label="Event code" value={posting.eventCode} onChange={(e) => setPosting((prev) => ({ ...prev, eventCode: e.target.value }))} />
            <Input label="Reference type" value={posting.refType} onChange={(e) => setPosting((prev) => ({ ...prev, refType: e.target.value }))} />
            <Input label="Reference ID" value={posting.refId} onChange={(e) => setPosting((prev) => ({ ...prev, refId: e.target.value }))} />
            <Input label="Reference line ID" value={posting.refLineId} onChange={(e) => setPosting((prev) => ({ ...prev, refLineId: e.target.value }))} />
            <select className="wrs-input" value={posting.itemId} onChange={(e) => setPosting((prev) => ({ ...prev, itemId: e.target.value }))}>
              <option value="">Chọn item</option>
              {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
            </select>
            <Input label="Qty" value={posting.qty} onChange={(e) => setPosting((prev) => ({ ...prev, qty: e.target.value }))} />
            <Input label="UOM code" value={posting.uomCode} onChange={(e) => setPosting((prev) => ({ ...prev, uomCode: e.target.value }))} />
            <select className="wrs-input" value={posting.warehouseCode} onChange={(e) => setPosting((prev) => ({ ...prev, warehouseCode: e.target.value }))}>
              <option value="">Chọn warehouse</option>
              {warehouseOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
            </select>
            <Input label="Location code" value={posting.locationCode} onChange={(e) => setPosting((prev) => ({ ...prev, locationCode: e.target.value }))} />
            <Input label="Owner code" value={posting.ownerCode} onChange={(e) => setPosting((prev) => ({ ...prev, ownerCode: e.target.value }))} />
            <Input label="Status code" value={posting.statusCode} onChange={(e) => setPosting((prev) => ({ ...prev, statusCode: e.target.value }))} />
          </div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setPosting(initialPosting)}>Reset</Button>
            <Button variant="gold" onClick={handlePosting} disabled={createPosting.isPending}>Post transaction</Button>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title"><RefreshCcw className="h-5 w-5 text-gold" /> Reverse transaction</h3>
          <div className="space-y-4">
            <Input label="Original trans ID" value={reverse.originalTransId} onChange={(e) => setReverse((prev) => ({ ...prev, originalTransId: e.target.value }))} />
            <Input label="Reason code" value={reverse.reasonCode} onChange={(e) => setReverse((prev) => ({ ...prev, reasonCode: e.target.value }))} />
            <Textarea label="Note" rows={5} value={reverse.note} onChange={(e) => setReverse((prev) => ({ ...prev, note: e.target.value }))} />
          </div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setReverse(initialReverse)}>Reset</Button>
            <Button variant="destructive" onClick={handleReverse} disabled={reversePosting.isPending}>Reverse transaction</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
