import { useState, useCallback, useEffect } from 'react'
import { useOutboundShipments, useCreateOutboundShipment, useConfirmOutboundShipment, useCancelOutboundShipment, useOutboundDashboardSummary } from '@domains/outbound-operations'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupUoms } from '@domains/master-data'
import { useCustomerList } from '@domains/master-data'
import { useSalesOrders, useSalesOrderDetail } from '@domains/sales-orders'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const SHIPMENT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'ALLOCATED', label: 'Đã phân bổ' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
  { value: 'WEIGHING_TARE', label: 'Cân bì' },
  { value: 'LOADING', label: 'Đang xếp hàng' },
  { value: 'ALL_WEIGHED', label: 'Đã cân xong' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'SHIPPED', label: 'Đã xuất' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const CARGO_FORMS = [
  { value: 'BULK', label: 'Hàng rời' },
  { value: 'BAGGED_25KG', label: 'Bao 25kg' },
  { value: 'BAGGED_40KG', label: 'Bao 40kg' },
  { value: 'BAGGED_50KG', label: 'Bao 50kg' },
  { value: 'JUMBO', label: 'Jumbo' },
]

const SOURCE_TYPES = [
  { value: 'STANDALONE', label: 'Độc lập (Standalone)' },
  { value: 'SO', label: 'Từ Đơn bán hàng (SO)' },
]

const statusTone = (status) => {
  if (['SHIPPED', 'CLOSED'].includes(status)) return 'success'
  if (['CANCELLED'].includes(status)) return 'danger'
  if (['PENDING_APPROVAL'].includes(status)) return 'warning'
  if (['PICKING', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED'].includes(status)) return 'info'
  return 'default'
}

const statusLabel = (status) => {
  const found = SHIPMENT_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

const emptyLine = { itemId: '', cargoForm: 'BULK', uomId: '', expectedQty: '', expectedQtyKg: '', bagCount: '', nominalWeightPerBag: '' }

const initialDraft = {
  sourceType: 'STANDALONE',
  soId: '',
  ownerId: '',
  customerId: '',
  warehouseId: '',
  vehicleNumber: '',
  lines: [{ ...emptyLine }],
}

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, shipmentNumber: '', status: '', ownerId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [selectedSoId, setSelectedSoId] = useState(null)

  const { data: response, isLoading, refetch } = useOutboundShipments({
    ...filters,
    shipmentNumber: filters.shipmentNumber || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const createShipment = useCreateOutboundShipment()
  const confirmShipment = useConfirmOutboundShipment()
  const cancelShipment = useCancelOutboundShipment()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: uoms = [] } = useLookupUoms()
  const { data: customerResponse } = useCustomerList({ page: 1, pageSize: 200 })
  const customers = customerResponse?.items || customerResponse?.data || []
  const { data: soResponse } = useSalesOrders({ page: 1, pageSize: 100, status: 'CONFIRMED' })
  const soApiData = soResponse?.data || soResponse || {}
  const salesOrders = soApiData.items || soApiData.data?.items || []
  const { data: soDetailResponse } = useSalesOrderDetail(selectedSoId)
  const soDetail = soDetailResponse?.data || soDetailResponse || null

  const rows = response?.items || response?.data || []
  const pagination = { page: response?.page || 1, totalPages: response?.totalPages || 1 }

  const ownerOptions = [{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]
  const warehouseOptions = [{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]
  const customerOptions = [{ value: '', label: '-- Chọn khách hàng --' }, ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.customerName}` }))]
  const soOptions = [{ value: '', label: '-- Không chọn (Standalone) --' }, ...salesOrders.map((so) => ({ value: so.id, label: `${so.soNumber} — ${so.customer?.customerName || 'N/A'}` }))]
  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '-- Đơn vị --' }, ...uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))]

  // Auto-fill from SO detail when selected
  useEffect(() => {
    if (!soDetail || !selectedSoId) return
    const so = soDetail.salesOrder || soDetail
    const soLines = so.lines || []
    setDraft((prev) => ({
      ...prev,
      soId: so.soNumber || selectedSoId,
      ownerId: so.ownerId || prev.ownerId,
      customerId: so.customerId || prev.customerId,
      warehouseId: so.warehouseId || prev.warehouseId,
      lines: soLines.length > 0
        ? soLines.map((l) => ({
            itemId: l.itemId || '',
            cargoForm: l.cargoForm || l.item?.cargoForm || 'BULK',
            uomId: l.uomId || '',
            expectedQty: String(Number(l.expectedQtyKg || l.expectedQty || 0)),
            expectedQtyKg: '',
            bagCount: l.bagCount ? String(l.bagCount) : '',
            nominalWeightPerBag: l.nominalWeightPerBag ? String(l.nominalWeightPerBag) : '',
          }))
        : [{ ...emptyLine }],
    }))
  }, [soDetail, selectedSoId])

  const handleSoSelect = (soId) => {
    if (soId) {
      setSelectedSoId(soId)
      setDraft((p) => ({ ...p, sourceType: 'SO', soId }))
    } else {
      // Reset when SO deselected
      setSelectedSoId(null)
      setDraft((p) => ({
        ...p,
        sourceType: 'STANDALONE',
        soId: '',
        ownerId: '',
        customerId: '',
        warehouseId: '',
        lines: [{ ...emptyLine }],
      }))
    }
  }

  const handleCreate = async () => {
    const externalId = `SHP-WEB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const payload = {
      externalId,
      sourceType: draft.sourceType || 'STANDALONE',
      soId: draft.soId || undefined,
      ownerId: draft.ownerId,
      customerId: draft.customerId || undefined,
      warehouseId: draft.warehouseId,
      vehicleNumber: draft.vehicleNumber,
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        cargoForm: l.cargoForm,
        uomId: l.uomId || undefined,
        expectedQty: Number(l.expectedQty || 0),
        expectedQtyKg: Number(l.expectedQtyKg || l.expectedQty || 0),
        bagCount: l.bagCount ? Number(l.bagCount) : undefined,
        nominalWeightPerBag: l.nominalWeightPerBag ? Number(l.nominalWeightPerBag) : undefined,
      })),
    }
    await createShipment.mutateAsync(payload)
    setDraft(initialDraft)
    setShowCreate(false)
  }

  const updateLine = useCallback((index, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addLine = useCallback(() => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  }, [])

  const removeLine = useCallback((index) => {
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý chuyến hàng xuất</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setSelectedSoId(null); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tạo Shipment
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Tìm mã shipment..." value={filters.shipmentNumber} onChange={(e) => setFilters((prev) => ({ ...prev, shipmentNumber: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={SHIPMENT_STATUSES} placeholder="Trạng thái" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Chủ hàng" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Shipment</TableHead>
              <TableHead>Xe / SO</TableHead>
              <TableHead>Owner / Mặt hàng</TableHead>
              <TableHead align="right">Dự kiến</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có chuyến hàng nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber || row.id?.slice(0, 8)}</p>
                    <p className="text-xs text-navy-400">{row.lines?.length || row._count?.lines || 0} dòng</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.soId || 'Standalone'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.owner?.ownerCode || row.owner?.code || row.ownerId}</p>
                    <p className="text-xs text-navy-400">{row.lines?.[0]?.item?.itemCode || row.lines?.[0]?.item?.code || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">
                  {(row.lines || []).reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{statusLabel(row.status)}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => confirmShipment.mutate(row.id)}>Xác nhận</Button>
                        <Button variant="ghost" size="sm" onClick={() => cancelShipment.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Hủy</Button>
                      </>
                    ) : (
                      <span className="text-xs text-navy-400">
                        {row.status === 'CONFIRMED' ? 'Chờ phân bổ' : row.status === 'ALLOCATED' ? 'Chờ lấy hàng' : row.status === 'SHIPPED' ? 'Đã xuất' : 'Đang xử lý'}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      {/* ── Create Shipment Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo chuyến hàng xuất" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Mã Shipment <span className="text-xs text-navy-400 font-normal">(Tự động)</span></label>
              <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-ice shrink-0" />
                <span className="font-mono text-sm text-navy-600">Hệ thống tự sinh khi tạo</span>
              </div>
            </div>
            <Select label="Loại nguồn *" value={draft.sourceType} onChange={(e) => { const v = e.target.value; if (v !== 'SO') handleSoSelect(''); setDraft((p) => ({ ...p, sourceType: v })) }} options={SOURCE_TYPES} />
          </div>

          {draft.sourceType === 'SO' && (
            <Select label="Đơn bán hàng (SO)" value={selectedSoId || ''} onChange={(e) => handleSoSelect(e.target.value)} options={soOptions} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select label="Owner *" value={draft.ownerId} onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))} options={ownerOptions} />
            <Select label="Khách hàng" value={draft.customerId} onChange={(e) => setDraft((p) => ({ ...p, customerId: e.target.value }))} options={customerOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Kho *" value={draft.warehouseId} onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))} options={warehouseOptions} />
            <Input label="Biển số xe *" value={draft.vehicleNumber} onChange={(e) => setDraft((p) => ({ ...p, vehicleNumber: e.target.value }))} placeholder="VD: 51C-123.45" />
          </div>

          <div className="border-t border-moon-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-navy-900">Danh sách mặt hàng</h4>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
              </Button>
            </div>
            {draft.lines.map((line, idx) => (
              <div key={idx} className="rounded-xl border border-moon-200 p-3 space-y-2 bg-moon-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy-400">Dòng {idx + 1}</span>
                  {draft.lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Select label="Mặt hàng *" value={line.itemId} onChange={(e) => updateLine(idx, 'itemId', e.target.value)} options={itemOptions} />
                  <Select label="Đơn vị tính" value={line.uomId} onChange={(e) => updateLine(idx, 'uomId', e.target.value)} options={uomOptions} />
                  <Select label="Hình thức hàng" value={line.cargoForm} onChange={(e) => updateLine(idx, 'cargoForm', e.target.value)} options={CARGO_FORMS} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Số lượng (kg) *" type="number" value={line.expectedQty} onChange={(e) => updateLine(idx, 'expectedQty', e.target.value)} />
                  <Input label="Số bao" type="number" value={line.bagCount} onChange={(e) => updateLine(idx, 'bagCount', e.target.value)} />
                  <Input label="Trọng lượng/bao (kg)" type="number" value={line.nominalWeightPerBag} onChange={(e) => updateLine(idx, 'nominalWeightPerBag', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createShipment.isPending || !draft.ownerId || !draft.warehouseId || !draft.vehicleNumber}>
              {createShipment.isPending ? 'Đang tạo...' : 'Tạo Shipment'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
