import { useMemo, useState } from 'react'
import { ClipboardCheck, FilePlus2, Scale, Truck } from 'lucide-react'
import { useCreateInboundReceipt, useInboundDashboardSummary, useInboundReceipts, useConfirmInboundReceipt } from '@domains/inbound-operations'
import { useLookupItems, useLookupLocations, useLookupOwners, useLookupVendors, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (['RECEIVED', 'CLOSED'].includes(status)) return 'success'
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'danger'
  if (['PUTAWAY', 'PROCESSING', 'WEIGHED_IN', 'WEIGHED_OUT'].includes(status)) return 'warning'
  return 'default'
}

const initialDraft = {
  receiptType: 'STANDARD',
  poNumber: '',
  asnNumber: '',
  ownerId: '',
  vendorId: '',
  itemId: '',
  warehouseId: '',
  receivingLocationId: '',
  vehicleNumber: '',
  blNumber: '',
  expectedQty: '',
  cargoForm: 'BULK',
  bagCount: '',
}

export function InboundReceiptsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', receiptType: '', ownerId: '', warehouseId: '', itemId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)

  const { data: summaryResponse } = useInboundDashboardSummary()
  const { data: response, isLoading, refetch } = useInboundReceipts({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    receiptType: filters.receiptType || undefined,
    ownerId: filters.ownerId || undefined,
    warehouseId: filters.warehouseId || undefined,
    itemId: filters.itemId || undefined,
  })

  const createReceipt = useCreateInboundReceipt()
  const confirmReceipt = useConfirmInboundReceipt()

  const { data: owners = [] } = useLookupOwners()
  const { data: vendors = [] } = useLookupVendors()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations(draft.warehouseId || undefined)

  const summary = summaryResponse?.data || {}
  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleCreate = async () => {
    await createReceipt.mutateAsync({
      ...draft,
      expectedQty: Number(draft.expectedQty || 0),
      bagCount: draft.bagCount ? Number(draft.bagCount) : null,
      correlationId: `corr-inb-create-${Date.now()}`,
      sourceApp: 'WEB',
      createdBy: localStorage.getItem('userCode') || 'admin',
    })
    setDraft(initialDraft)
    setShowCreate(false)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Lập kế hoạch & tạo phiếu nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setShowCreate(true) }}>Tạo phiếu nhập</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Số phiếu/PO/ASN/B-L/Biển số xe" value={filters.keyword} onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'AWAITING_WEIGHING', label: 'AWAITING_WEIGHING' }, { value: 'REJECTED', label: 'REJECTED' }, { value: 'RECEIVED', label: 'RECEIVED' }, { value: 'PUTAWAY', label: 'PUTAWAY' }, { value: 'CLOSED', label: 'CLOSED' }]} placeholder="Status" />
          <Select value={filters.receiptType} onChange={(e) => setFilters((prev) => ({ ...prev, receiptType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'STANDARD', label: 'STANDARD' }, { value: 'VESSEL', label: 'VESSEL' }]} placeholder="Receipt Type" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Owner" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Warehouse" />
          <Select value={filters.itemId} onChange={(e) => setFilters((prev) => ({ ...prev, itemId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...items.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Item" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu nhập</TableHead>
              <TableHead>PO / Xe</TableHead>
              <TableHead>Chủ hàng / Hàng</TableHead>
              <TableHead align="right">Dự kiến</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không tìm thấy phiếu nhập phù hợp" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.receiptNumber}</p>
                    <p className="text-xs text-navy-400">{row.receiptType} · attempt {row.attemptNumber}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.poNumber || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.vehicleNumber || row.blNumber || 'Không có xe'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.owner?.ownerCode || row.ownerId}</p>
                    <p className="text-xs text-navy-400">{row.item?.itemCode || row.itemId}</p>
                  </div>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">{row.expectedQty}</TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  {row.status === 'DRAFT' ? (
                    <Button variant="outline" size="sm" onClick={() => confirmReceipt.mutate(row.id)}>Xác nhận</Button>
                  ) : (
                    <span className="text-xs text-navy-400">Đang theo dõi thực thi</span>
                  )}
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo phiếu nhập"
        description="Tạo phiếu nhập: 1 phiếu = 1 chuyến = 1 xe."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createReceipt.isPending}>
              {createReceipt.isPending ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Loại phiếu nhập" value={draft.receiptType} onChange={(e) => setDraft((prev) => ({ ...prev, receiptType: e.target.value }))} options={[{ value: 'STANDARD', label: 'STANDARD' }, { value: 'VESSEL', label: 'VESSEL' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Số PO" value={draft.poNumber} onChange={(e) => setDraft((prev) => ({ ...prev, poNumber: e.target.value }))} />
            <Input label="Số ASN" value={draft.asnNumber} onChange={(e) => setDraft((prev) => ({ ...prev, asnNumber: e.target.value }))} />
          </div>
          <Select label="Chủ hàng" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
          <Select label="Nhà cung cấp" value={draft.vendorId} onChange={(e) => setDraft((prev) => ({ ...prev, vendorId: e.target.value }))} options={[{ value: '', label: '-- Chọn NCC --' }, ...vendors.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
          <Select label="Mặt hàng" value={draft.itemId} onChange={(e) => setDraft((prev) => ({ ...prev, itemId: e.target.value }))} options={[{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
            <Select label="Vị trí nhận hàng" value={draft.receivingLocationId} onChange={(e) => setDraft((prev) => ({ ...prev, receivingLocationId: e.target.value }))} options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((item) => ({ value: item.id, label: `${item.code}` }))]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Biển số xe" value={draft.vehicleNumber} onChange={(e) => setDraft((prev) => ({ ...prev, vehicleNumber: e.target.value }))} />
            <Input label="Số B/L" value={draft.blNumber} onChange={(e) => setDraft((prev) => ({ ...prev, blNumber: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Số lượng dự kiến (kg)" type="number" value={draft.expectedQty} onChange={(e) => setDraft((prev) => ({ ...prev, expectedQty: e.target.value }))} />
            <Input label="Số bao" type="number" value={draft.bagCount} onChange={(e) => setDraft((prev) => ({ ...prev, bagCount: e.target.value }))} />
          </div>
          <Select label="Dạng hàng" value={draft.cargoForm} onChange={(e) => setDraft((prev) => ({ ...prev, cargoForm: e.target.value }))} options={[{ value: 'BULK', label: 'BULK' }, { value: 'BAGGED_25KG', label: 'BAGGED_25KG' }, { value: 'BAGGED_50KG', label: 'BAGGED_50KG' }, { value: 'JUMBO_1000KG', label: 'JUMBO_1000KG' }]} />
        </div>
      </Modal>
    </div>
  )
}
