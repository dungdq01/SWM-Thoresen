import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { Button, Input } from '@shared/ui'
import { useCreateHold, useOnHandList } from '@domains/inventory-core'

const INITIAL_DRAFT = { itemId: '', qty: '', warehouseCode: '', locationCode: '', ownerCode: '', statusCode: '' }

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-navy-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function formatQty(val) {
  const n = Number(val)
  if (isNaN(n)) return val
  return n.toLocaleString('vi-VN')
}

export function InventoryHoldFormDrawer({ isOpen, onClose }) {
  const [draft, setDraft] = useState(INITIAL_DRAFT)
  const { mutate: createHold, isPending } = useCreateHold()

  const { data: onHandResponse } = useOnHandList({ hasStock: true, pageSize: 100 })
  const stockRows = useMemo(() => onHandResponse?.data || [], [onHandResponse])

  const itemsWithStock = useMemo(() => {
    const map = new Map()
    for (const r of stockRows) {
      const dim = r.inventDim || {}
      const status = dim.inventoryStatus || dim.status || {}
      if (!(status.isAllocatable ?? true)) continue
      const id = r.itemId
      if (!map.has(id)) {
        map.set(id, { id, code: r.item?.itemCode || id, name: r.item?.itemName || '' })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows])

  const warehouseOpts = useMemo(() => {
    if (!draft.itemId) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const wh = (r.inventDim || {}).warehouse || {}
      const code = wh.warehouseCode
      if (code && !map.has(code)) map.set(code, { code, name: wh.warehouseName || code })
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId])

  const locationOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if (dim.warehouse?.warehouseCode !== draft.warehouseCode) continue
      const code = dim.location?.locationCode
      if (code && !map.has(code)) map.set(code, { code })
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode])

  const ownerOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if (dim.warehouse?.warehouseCode !== draft.warehouseCode) continue
      if (dim.location?.locationCode !== draft.locationCode) continue
      const code = dim.owner?.ownerCode
      if (code && !map.has(code)) map.set(code, { code, name: dim.owner?.ownerName || '' })
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode, draft.locationCode])

  const statusOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode || !draft.ownerCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if (dim.warehouse?.warehouseCode !== draft.warehouseCode) continue
      if (dim.location?.locationCode !== draft.locationCode) continue
      if (dim.owner?.ownerCode !== draft.ownerCode) continue
      const status = dim.inventoryStatus || dim.status || {}
      const code = status.statusCode
      if (code && !map.has(code)) map.set(code, { code, available: Number(r.availableQty || 0) })
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode, draft.locationCode, draft.ownerCode])

  const matchedOnHand = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode || !draft.ownerCode || !draft.statusCode) return null
    return stockRows.find((r) => {
      const dim = r.inventDim || {}
      return r.itemId === draft.itemId
        && dim.warehouse?.warehouseCode === draft.warehouseCode
        && dim.location?.locationCode === draft.locationCode
        && dim.owner?.ownerCode === draft.ownerCode
        && (dim.inventoryStatus?.statusCode || dim.status?.statusCode) === draft.statusCode
    }) || null
  }, [stockRows, draft])

  const availableQty = matchedOnHand ? Number(matchedOnHand.availableQty || 0) : 0
  const qtyExceeded = draft.qty && availableQty > 0 && Number(draft.qty) > availableQty
  const canSubmit = draft.itemId && draft.qty && Number(draft.qty) > 0 && draft.warehouseCode && draft.locationCode && draft.ownerCode && draft.statusCode && !qtyExceeded

  const handleItemChange = useCallback((itemId) => {
    setDraft({ ...INITIAL_DRAFT, itemId })
  }, [])

  const handleWarehouseChange = useCallback((warehouseCode) => {
    setDraft((prev) => ({ ...prev, warehouseCode, locationCode: '', ownerCode: '', statusCode: '', qty: '' }))
  }, [])

  const handleLocationChange = useCallback((locationCode) => {
    setDraft((prev) => ({ ...prev, locationCode, ownerCode: '', statusCode: '', qty: '' }))
  }, [])

  const handleOwnerChange = useCallback((ownerCode) => {
    setDraft((prev) => ({ ...prev, ownerCode, statusCode: '', qty: '' }))
  }, [])

  const handleStatusChange = useCallback((statusCode) => {
    setDraft((prev) => ({ ...prev, statusCode, qty: '' }))
  }, [])

  const handleClose = () => {
    setDraft(INITIAL_DRAFT)
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      externalId: `hold-manual-${Date.now()}`,
      correlationId: `corr-hold-${Date.now()}`,
      itemId: draft.itemId,
      qty: draft.qty,
      dim: {
        warehouseCode: draft.warehouseCode,
        locationCode: draft.locationCode,
        ownerCode: draft.ownerCode,
        statusCode: draft.statusCode,
      },
    }
    createHold(payload, { onSuccess: handleClose })
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Tạo giữ hàng</h2>
                <p className="text-xs text-navy-400 mt-0.5">Chọn mặt hàng có tồn kho để đặt trước cho phiếu xuất</p>
              </div>
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-sm font-medium text-navy-600">Chọn vị trí tồn kho</p>

              {/* Item */}
              <div>
                <Label required>Mặt hàng</Label>
                <select className="wrs-input" value={draft.itemId} onChange={(e) => handleItemChange(e.target.value)}>
                  <option value="">Chọn mặt hàng có tồn kho</option>
                  {itemsWithStock.map((it) => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                </select>
                {draft.itemId && warehouseOpts.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Mặt hàng này chưa có tồn kho tại bất kỳ kho nào.</p>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <Label required>Kho</Label>
                <select
                  className="wrs-input"
                  value={draft.warehouseCode}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  disabled={!draft.itemId || warehouseOpts.length === 0}
                >
                  <option value="">{!draft.itemId ? 'Chọn mặt hàng trước' : 'Chọn kho'}</option>
                  {warehouseOpts.map((wh) => <option key={wh.code} value={wh.code}>{wh.code} — {wh.name}</option>)}
                </select>
              </div>

              {/* Location + Owner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Vị trí</Label>
                  <select
                    className="wrs-input"
                    value={draft.locationCode}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    disabled={!draft.warehouseCode || locationOpts.length === 0}
                  >
                    <option value="">{!draft.warehouseCode ? 'Chọn kho trước' : 'Chọn vị trí'}</option>
                    {locationOpts.map((loc) => <option key={loc.code} value={loc.code}>{loc.code}</option>)}
                  </select>
                </div>
                <div>
                  <Label required>Chủ hàng</Label>
                  <select
                    className="wrs-input"
                    value={draft.ownerCode}
                    onChange={(e) => handleOwnerChange(e.target.value)}
                    disabled={!draft.locationCode || ownerOpts.length === 0}
                  >
                    <option value="">{!draft.locationCode ? 'Chọn vị trí trước' : 'Chọn chủ hàng'}</option>
                    {ownerOpts.map((o) => <option key={o.code} value={o.code}>{o.code}{o.name ? ` — ${o.name}` : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Inventory Status */}
              <div>
                <Label required>Trạng thái tồn kho</Label>
                <select
                  className="wrs-input"
                  value={draft.statusCode}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={!draft.ownerCode || statusOpts.length === 0}
                >
                  <option value="">{!draft.ownerCode ? 'Chọn chủ hàng trước' : 'Chọn trạng thái'}</option>
                  {statusOpts.map((s) => <option key={s.code} value={s.code}>{s.code} — Khả dụng: {formatQty(s.available)} KG</option>)}
                </select>
              </div>

              {/* On-hand summary */}
              {matchedOnHand && (
                <div className="rounded-lg border border-navy-200 bg-navy-50/50 p-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-navy-500">Tồn vật lý</p>
                      <p className="text-sm font-semibold text-navy-800">{formatQty(matchedOnHand.physicalQty)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-navy-500">Đang giữ</p>
                      <p className="text-sm font-semibold text-amber-600">{formatQty(matchedOnHand.reservedQty)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-navy-500">Khả dụng</p>
                      <p className="text-sm font-bold text-emerald-600">{formatQty(matchedOnHand.availableQty)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label required>
                  Số lượng giữ
                  {availableQty > 0 && <span className="text-navy-400 font-normal"> (tối đa {formatQty(availableQty)})</span>}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={availableQty || undefined}
                  value={draft.qty}
                  onChange={(e) => setDraft((prev) => ({ ...prev, qty: e.target.value }))}
                  placeholder={availableQty > 0 ? `Nhập số lượng ≤ ${formatQty(availableQty)}` : 'Chọn vị trí tồn kho trước'}
                  disabled={!matchedOnHand}
                />
                {qtyExceeded && (
                  <p className="text-xs text-red-500 mt-1">Số lượng vượt quá tồn khả dụng ({formatQty(availableQty)}). Vui lòng giảm số lượng.</p>
                )}
              </div>

              {/* No stock warning */}
              {stockRows.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800 font-medium">Chưa có tồn kho trong hệ thống</p>
                  <p className="text-xs text-amber-600 mt-1">Vui lòng tạo phiếu nhập kho trước khi tạo giữ hàng.</p>
                </div>
              )}
            </form>

            <div className="border-t border-moon-200 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-navy-400">
                {canSubmit ? <span className="text-success font-medium">✓ Sẵn sàng tạo giữ hàng</span> : 'Vui lòng điền đầy đủ thông tin *'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>Hủy</Button>
                <Button type="submit" size="sm" disabled={!canSubmit || isPending} loading={isPending} onClick={handleSubmit}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tạo giữ hàng
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
