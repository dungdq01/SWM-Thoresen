import { useState } from 'react'
import { useInvoices, useGenerateInvoice, useApproveInvoice, useCancelInvoice } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

const initialDraft = {
  ownerId: '',
  warehouseId: '',
  periodFrom: '',
  periodTo: '',
}

export function InvoicesPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', ownerId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useInvoices(filters)
  const generateInvoice = useGenerateInvoice()
  const approveInvoice = useApproveInvoice()
  const cancelInvoice = useCancelInvoice()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.ownerId) e.ownerId = 'Chủ hàng là bắt buộc'
    if (!draft.warehouseId) e.warehouseId = 'Kho là bắt buộc'
    if (!draft.periodFrom) e.periodFrom = 'Từ ngày là bắt buộc'
    if (!draft.periodTo) e.periodTo = 'Đến ngày là bắt buộc'
    if (draft.periodFrom && draft.periodTo && draft.periodFrom > draft.periodTo) e.periodTo = 'Đến ngày phải sau Từ ngày'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    await generateInvoice.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Hóa đơn</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo hóa đơn</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số HĐ</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Kỳ</TableHead>
              <TableHead align="right">Số tiền</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có hóa đơn" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.invoiceNumber}</p>
                  <p className="text-xs text-navy-400">{row.lineCount} dòng</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.owner?.name}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{row.periodFrom}</p>
                  <p className="text-xs text-navy-400">→ {row.periodTo}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.totalAmount?.toLocaleString()} {row.currency}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && (
                      <>
                        <Button variant="accent" size="sm" onClick={() => approveInvoice.mutate(row.id)}>Duyệt</Button>
                        <Button variant="ghost" size="sm" onClick={() => cancelInvoice.mutate({ id: row.id, data: {} })}>Hủy</Button>
                      </>
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
        title="Tạo hóa đơn"
        description="Tạo hóa đơn cho chủ hàng dựa trên sự kiện tính phí."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleGenerate} disabled={generateInvoice.isPending}>
              {generateInvoice.isPending ? 'Đang xử lý...' : 'Tạo hóa đơn'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Chủ hàng" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Input label="Từ ngày" type="date" value={draft.periodFrom} onChange={(e) => setDraft((prev) => ({ ...prev, periodFrom: e.target.value }))} />
            {errors.periodFrom && <p className="text-xs text-danger mt-1">{errors.periodFrom}</p>}
          </div>
          <div>
            <Input label="Đến ngày" type="date" value={draft.periodTo} onChange={(e) => setDraft((prev) => ({ ...prev, periodTo: e.target.value }))} />
            {errors.periodTo && <p className="text-xs text-danger mt-1">{errors.periodTo}</p>}
          </div>
        </div>
      </Modal>
    </div>
  )
}
