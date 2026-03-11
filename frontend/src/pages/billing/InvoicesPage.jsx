import { useState } from 'react'
import { useDebitNotes, useGenerateDebitNote, useReviewDebitNote, useApproveDebitNote, useLockDebitNote } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'APPROVED' || status === 'LOCKED') return 'success'
  if (status === 'REVIEWED') return 'info'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

const initialDraft = {
  ownerId: '',
  warehouseId: '',
  periodStart: '',
  periodEnd: '',
}

export function InvoicesPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', ownerId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useDebitNotes(filters)
  const generateDebitNote = useGenerateDebitNote()
  const reviewDebitNote = useReviewDebitNote()
  const approveDebitNote = useApproveDebitNote()
  const lockDebitNote = useLockDebitNote()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.ownerId) e.ownerId = 'Chủ sở hữu là bắt buộc'
    if (!draft.warehouseId) e.warehouseId = 'Kho là bắt buộc'
    if (!draft.periodStart) e.periodStart = 'Ngày bắt đầu là bắt buộc'
    if (!draft.periodEnd) e.periodEnd = 'Ngày kết thúc là bắt buộc'
    if (draft.periodStart && draft.periodEnd && draft.periodStart > draft.periodEnd) e.periodEnd = 'Ngày kết thúc phải sau ngày bắt đầu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    const payload = {
      ...draft,
      externalId: `DN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    }
    await generateDebitNote.mutateAsync(payload)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu Nợ</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo Phiếu Nợ</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'REVIEWED', label: 'Đã xem xét' }, { value: 'APPROVED', label: 'Đã phê duyệt' }, { value: 'LOCKED', label: 'Đã khóa' }]} placeholder="Trạng thái" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Chủ sở hữu" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số Phiếu Nợ</TableHead>
              <TableHead>Chủ sở hữu</TableHead>
              <TableHead>Kỳ hạn</TableHead>
              <TableHead align="right">Số tiền</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có phiếu nợ" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.dnNumber || row.invoiceNumber}</p>
                  <p className="text-xs text-navy-400">{row.lineCount} dòng</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.name || ownerMap[row.ownerId]?.name || '-'}</p>
                  <p className="text-xs text-navy-400">{row.owner?.code || ownerMap[row.ownerId]?.code}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{row.billingPeriodStart?.split('T')[0] || row.periodStart || '-'}</p>
                  <p className="text-xs text-navy-400">→ {row.billingPeriodEnd?.split('T')[0] || row.periodEnd || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{(row.grandTotal || row.totalAmount)?.toLocaleString()} {row.currencyCode || 'VND'}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => reviewDebitNote.mutate(row.id)}>Xem xét</Button>}
                    {row.status === 'REVIEWED' && <Button variant="accent" size="sm" onClick={() => approveDebitNote.mutate(row.id)}>Phê duyệt</Button>}
                    {row.status === 'APPROVED' && <Button variant="gold" size="sm" onClick={() => lockDebitNote.mutate(row.id)}>Khóa</Button>}
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
        title="Tạo Phiếu Nợ"
        description="Tạo phiếu nợ cho chủ sở hữu dựa trên các sự kiện thanh toán."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleGenerate} disabled={generateDebitNote.isPending}>
              {generateDebitNote.isPending ? 'Đang xử lý...' : 'Tạo Phiếu Nợ'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Chủ sở hữu" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Chủ sở hữu --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Input label="Ngày bắt đầu" type="date" value={draft.periodStart} onChange={(e) => setDraft((prev) => ({ ...prev, periodStart: e.target.value }))} />
            {errors.periodStart && <p className="text-xs text-danger mt-1">{errors.periodStart}</p>}
          </div>
          <div>
            <Input label="Ngày kết thúc" type="date" value={draft.periodEnd} onChange={(e) => setDraft((prev) => ({ ...prev, periodEnd: e.target.value }))} />
            {errors.periodEnd && <p className="text-xs text-danger mt-1">{errors.periodEnd}</p>}
          </div>
        </div>
      </Modal>
    </>
  )
}
