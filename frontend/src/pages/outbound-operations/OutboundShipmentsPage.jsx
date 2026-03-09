import { useState } from 'react'
import { useOutboundShipments, useCreateOutboundShipment, useConfirmOutboundShipment, useCancelOutboundShipment, useOutboundDashboardSummary } from '@domains/outbound-operations'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (['SHIPPED', 'CLOSED'].includes(status)) return 'success'
  if (['CANCELLED'].includes(status)) return 'danger'
  if (['PENDING_APPROVAL'].includes(status)) return 'warning'
  if (['PICKING', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED'].includes(status)) return 'info'
  return 'default'
}

const initialDraft = {
  soId: '',
  ownerId: '',
  customerId: '',
  warehouseId: '',
  vehicleNumber: '',
  isDpmShipment: false,
  lines: [{ itemId: '', cargoForm: 'BULK', expectedQty: '', bagCount: '', nominalWeightPerBag: '' }],
}

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, shipmentNumber: '', status: '', ownerId: '', warehouseId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)

  const { data: summaryResponse } = useOutboundDashboardSummary()
  const { data: response, isLoading, refetch } = useOutboundShipments({
    ...filters,
    shipmentNumber: filters.shipmentNumber || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
    warehouseId: filters.warehouseId || undefined,
  })

  const createShipment = useCreateOutboundShipment()
  const confirmShipment = useConfirmOutboundShipment()
  const cancelShipment = useCancelOutboundShipment()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleCreate = async () => {
    await createShipment.mutateAsync({
      ...draft,
      correlationId: `corr-out-create-${Date.now()}`,
      sourceApp: 'WEB',
      createdBy: localStorage.getItem('userCode') || 'admin',
    })
    setDraft(initialDraft)
    setShowCreate(false)
  }

  const updateLine = (index, field, value) => {
    const newLines = [...draft.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setDraft((prev) => ({ ...prev, lines: newLines }))
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Lập kế hoạch & tạo phiếu xuất</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setShowCreate(true) }}>Tạo phiếu xuất</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Số phiếu xuất" value={filters.shipmentNumber} onChange={(e) => setFilters((prev) => ({ ...prev, shipmentNumber: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'CONFIRMED', label: 'CONFIRMED' }, { value: 'ALLOCATED', label: 'ALLOCATED' }, { value: 'PICKING', label: 'PICKING' }, { value: 'PENDING_APPROVAL', label: 'PENDING_APPROVAL' }, { value: 'SHIPPED', label: 'SHIPPED' }, { value: 'CLOSED', label: 'CLOSED' }]} placeholder="Status" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Owner" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Xe / SO</TableHead>
              <TableHead>Chủ hàng / Hàng</TableHead>
              <TableHead align="right">Dự kiến</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không tìm thấy phiếu xuất phù hợp" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                    <p className="text-xs text-navy-400">{row.lines?.length || 0} dòng</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.soId || 'Độc lập'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.owner?.code || row.ownerId}</p>
                    <p className="text-xs text-navy-400">{row.lines?.[0]?.item?.code || row.lines?.[0]?.itemId || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">
                  {row.lines?.reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => confirmShipment.mutate(row.id)}>Xác nhận</Button>
                        <Button variant="ghost" size="sm" onClick={() => cancelShipment.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Hủy</Button>
                      </>
                    ) : (
                      <span className="text-xs text-navy-400">Tiếp: {row.status === 'CONFIRMED' ? 'Phân bổ' : row.status === 'ALLOCATED' ? 'Lấy hàng' : 'Cân'}</span>
                    )}
                  </div>
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
        title="Tạo phiếu xuất"
        description="Tạo phiếu xuất: 1 phiếu = 1 chuyến = 1 xe."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createShipment.isPending}>
              {createShipment.isPending ? 'Đang xử lý...' : 'Tạo phiếu xuất'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Mã SO (không bắt buộc)" value={draft.soId} onChange={(e) => setDraft((prev) => ({ ...prev, soId: e.target.value }))} />
          <Select label="Chủ hàng" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
          <Input label="Mã khách hàng" value={draft.customerId} onChange={(e) => setDraft((prev) => ({ ...prev, customerId: e.target.value }))} />
          <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
          <Input label="Biển số xe" value={draft.vehicleNumber} onChange={(e) => setDraft((prev) => ({ ...prev, vehicleNumber: e.target.value }))} />

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Dòng 1</p>
            <div className="space-y-3">
              <Select label="Mặt hàng" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={[{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} />
              <Select label="Dạng hàng" value={draft.lines[0].cargoForm} onChange={(e) => updateLine(0, 'cargoForm', e.target.value)} options={[{ value: 'BULK', label: 'BULK' }, { value: 'BAGGED_25KG', label: 'BAGGED_25KG' }, { value: 'BAGGED_50KG', label: 'BAGGED_50KG' }, { value: 'JUMBO_1000KG', label: 'JUMBO_1000KG' }]} />
              <Input label="Số lượng dự kiến (kg)" type="number" value={draft.lines[0].expectedQty} onChange={(e) => updateLine(0, 'expectedQty', e.target.value)} />
              <Input label="Số bao (nếu đóng bao)" type="number" value={draft.lines[0].bagCount} onChange={(e) => updateLine(0, 'bagCount', e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
