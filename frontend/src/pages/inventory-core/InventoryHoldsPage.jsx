import { useCallback, useMemo, useState } from 'react'
import { useCancelHold, useCreateHold, useHoldList, useOnHandList, useReleaseHold } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Modal, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'

const holdTone = (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PARTIALLY_RELEASED' || status === 'RELEASED') return 'warning'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

const HOLD_STATUS_LABELS = {
  ACTIVE: 'Đang giữ',
  PARTIALLY_RELEASED: 'Giải phóng một phần',
  RELEASED: 'Đã giải phóng',
  CONSUMED: 'Đã tiêu thụ',
  CANCELLED: 'Đã hủy',
}

const INITIAL_DRAFT = { itemId: '', qty: '', warehouseCode: '', locationCode: '', ownerCode: '', statusCode: '' }

function formatQty(val) {
  const n = Number(val)
  if (isNaN(n)) return val
  return n.toLocaleString('vi-VN')
}

export function InventoryHoldsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, itemId: '', ownerId: '', shipmentId: '', status: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(INITIAL_DRAFT)

  const { data: response, isLoading, refetch } = useHoldList({
    ...filters,
    itemId: filters.itemId || undefined,
    ownerId: filters.ownerId || undefined,
    shipmentId: filters.shipmentId || undefined,
    status: filters.status || undefined,
  })

  const createHold = useCreateHold()
  const releaseHold = useReleaseHold()
  const cancelHold = useCancelHold()
  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()

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
      const dim = r.inventDim || {}
      const wh = dim.warehouse || {}
      const code = wh.warehouseCode
      if (code && !map.has(code)) {
        map.set(code, { code, name: wh.warehouseName || code })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId])

  const locationOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if ((dim.warehouse?.warehouseCode) !== draft.warehouseCode) continue
      const code = dim.location?.locationCode
      if (code && !map.has(code)) {
        map.set(code, { code })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode])

  const ownerOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if ((dim.warehouse?.warehouseCode) !== draft.warehouseCode) continue
      if ((dim.location?.locationCode) !== draft.locationCode) continue
      const code = dim.owner?.ownerCode
      const ownerName = dim.owner?.ownerName || ''
      if (code && !map.has(code)) {
        map.set(code, { code, name: ownerName })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode, draft.locationCode])

  const statusOpts = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode || !draft.ownerCode) return []
    const map = new Map()
    for (const r of stockRows) {
      if (r.itemId !== draft.itemId) continue
      const dim = r.inventDim || {}
      if ((dim.warehouse?.warehouseCode) !== draft.warehouseCode) continue
      if ((dim.location?.locationCode) !== draft.locationCode) continue
      if ((dim.owner?.ownerCode) !== draft.ownerCode) continue
      const status = dim.inventoryStatus || dim.status || {}
      const code = status.statusCode
      if (code && !map.has(code)) {
        map.set(code, { code, available: Number(r.availableQty || 0) })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [stockRows, draft.itemId, draft.warehouseCode, draft.locationCode, draft.ownerCode])

  const matchedOnHand = useMemo(() => {
    if (!draft.itemId || !draft.warehouseCode || !draft.locationCode || !draft.ownerCode || !draft.statusCode) return null
    return stockRows.find((r) => {
      const dim = r.inventDim || {}
      return r.itemId === draft.itemId
        && (dim.warehouse?.warehouseCode) === draft.warehouseCode
        && (dim.location?.locationCode) === draft.locationCode
        && (dim.owner?.ownerCode) === draft.ownerCode
        && ((dim.inventoryStatus?.statusCode) || (dim.status?.statusCode)) === draft.statusCode
    }) || null
  }, [stockRows, draft])

  const availableQty = matchedOnHand ? Number(matchedOnHand.availableQty || 0) : 0
  const qtyExceeded = draft.qty && availableQty > 0 && Number(draft.qty) > availableQty

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

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

  const handleOpenModal = useCallback(() => {
    setDraft(INITIAL_DRAFT)
    setShowCreate(true)
  }, [])

  const handleCreateHold = async () => {
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
    await createHold.mutateAsync(payload)
    setShowCreate(false)
    refetch()
  }

  const canSubmit = draft.itemId && draft.qty && Number(draft.qty) > 0 && draft.warehouseCode && draft.locationCode && draft.ownerCode && draft.statusCode && !qtyExceeded

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý giữ hàng</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
          <Button variant="accent" size="sm" onClick={handleOpenModal}>+ Tạo giữ hàng</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className="wrs-input" value={filters.itemId} onChange={(e) => handleFilterChange('itemId', e.target.value)}>
            <option value="">Tất cả mặt hàng</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <select className="wrs-input" value={filters.ownerId} onChange={(e) => handleFilterChange('ownerId', e.target.value)}>
            <option value="">Tất cả chủ hàng</option>
            {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <Input placeholder="Mã phiếu xuất" value={filters.shipmentId} onChange={(e) => handleFilterChange('shipmentId', e.target.value)} />
          <select className="wrs-input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giữ</option>
            <option value="PARTIALLY_RELEASED">Giải phóng một phần</option>
            <option value="RELEASED">Đã giải phóng</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="CONSUMED">Đã tiêu thụ</option>
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã giữ hàng</TableHead>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Mặt hàng / Chủ hàng</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có dữ liệu giữ hàng" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.holdNo || row.id}</p>
                    <p className="text-xs text-navy-400">{row.correlationId || 'Không có mã liên kết'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.shipmentId || 'Thủ công'}</p>
                  <p className="text-xs text-navy-400">{row.shipmentLineId || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-900">{row.item?.itemCode || row.itemId}</p>
                  <p className="text-xs text-navy-400">{row.inventDim?.owner?.ownerCode || '—'}</p>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">{row.holdQty || row.qty}</TableCell>
                <TableCell align="center"><Badge variant={holdTone(row.status)}>{HOLD_STATUS_LABELS[row.status] || row.status || 'Đang giữ'}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => releaseHold.mutate({ holdId: row.id, data: { releaseQty: row.holdQty || row.qty, correlationId: `corr-release-${Date.now()}` } })}>Giải phóng</Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelHold.mutate({ holdId: row.id, data: { correlationId: `corr-cancel-${Date.now()}` } })}>Hủy</Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleFilterChange('page', page)} />
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo giữ hàng"
        description="Chọn mặt hàng có tồn kho để đặt trước cho phiếu xuất."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreateHold} disabled={createHold.isPending || !canSubmit}>
              {createHold.isPending ? 'Đang tạo...' : 'Tạo giữ hàng'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-navy-600 mb-3">Chọn vị trí tồn kho</p>

            <div className="space-y-3">
              {/* Bước 1: Mặt hàng */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Mặt hàng *</label>
                <select className="wrs-input" value={draft.itemId} onChange={(e) => handleItemChange(e.target.value)}>
                  <option value="">Chọn mặt hàng có tồn kho</option>
                  {itemsWithStock.map((it) => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                </select>
                {draft.itemId && warehouseOpts.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Mặt hàng này chưa có tồn kho tại bất kỳ kho nào.</p>
                )}
              </div>

              {/* Bước 2: Kho */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Kho *</label>
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

              {/* Bước 3: Vị trí + Chủ hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Vị trí *</label>
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
                  <label className="block text-sm font-medium text-navy-700 mb-1">Chủ hàng *</label>
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

              {/* Bước 4: Trạng thái tồn kho */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Trạng thái tồn kho *</label>
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

              {/* Hiển thị tồn kho khả dụng */}
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

              {/* Bước 5: Số lượng */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Số lượng giữ *
                  {availableQty > 0 && <span className="text-navy-400 font-normal"> (tối đa {formatQty(availableQty)})</span>}
                </label>
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
            </div>
          </div>

          {/* Hướng dẫn nếu chưa có tồn kho */}
          {stockRows.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800 font-medium">Chưa có tồn kho trong hệ thống</p>
              <p className="text-xs text-amber-600 mt-1">Vui lòng tạo phiếu nhập kho (Posting Workbench → RECEIPT_IN) trước khi tạo giữ hàng.</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
