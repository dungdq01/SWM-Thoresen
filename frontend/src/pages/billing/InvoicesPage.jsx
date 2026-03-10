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
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.ownerId) e.ownerId = 'Owner là bắt buộc'
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.periodStart) e.periodStart = 'Period Start là bắt buộc'
    if (!draft.periodEnd) e.periodEnd = 'Period End là bắt buộc'
    if (draft.periodStart && draft.periodEnd && draft.periodStart > draft.periodEnd) e.periodEnd = 'Period End phải sau Period Start'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    await generateDebitNote.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Debit Notes</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Generate Debit Note</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'REVIEWED', label: 'REVIEWED' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'LOCKED', label: 'LOCKED' }]} placeholder="Status" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Debit Note #</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Period</TableHead>
              <TableHead align="right">Amount</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No invoices" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.dnNumber || row.invoiceNumber}</p>
                  <p className="text-xs text-navy-400">{row.lineCount} lines</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.owner?.name}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{row.periodStart || row.periodFrom}</p>
                  <p className="text-xs text-navy-400">→ {row.periodEnd || row.periodTo}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.totalAmount?.toLocaleString()} {row.currency}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => reviewDebitNote.mutate(row.id)}>Review</Button>}
                    {row.status === 'REVIEWED' && <Button variant="accent" size="sm" onClick={() => approveDebitNote.mutate(row.id)}>Approve</Button>}
                    {row.status === 'APPROVED' && <Button variant="gold" size="sm" onClick={() => lockDebitNote.mutate(row.id)}>Lock</Button>}
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
        title="Generate Debit Note"
        description="Generate debit note for owner based on billing events."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleGenerate} disabled={generateDebitNote.isPending}>
              {generateDebitNote.isPending ? 'Đang xử lý...' : 'Generate Debit Note'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Owner" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Input label="Period Start" type="date" value={draft.periodStart} onChange={(e) => setDraft((prev) => ({ ...prev, periodStart: e.target.value }))} />
            {errors.periodStart && <p className="text-xs text-danger mt-1">{errors.periodStart}</p>}
          </div>
          <div>
            <Input label="Period End" type="date" value={draft.periodEnd} onChange={(e) => setDraft((prev) => ({ ...prev, periodEnd: e.target.value }))} />
            {errors.periodEnd && <p className="text-xs text-danger mt-1">{errors.periodEnd}</p>}
          </div>
        </div>
      </Modal>
    </>
  )
}
