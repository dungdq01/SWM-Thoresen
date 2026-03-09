import { useState } from 'react'
import { useInvoices, useGenerateInvoice, useApproveInvoice, useCancelInvoice } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
    if (!draft.ownerId) e.ownerId = 'Owner là bắt buộc'
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.periodFrom) e.periodFrom = 'Period From là bắt buộc'
    if (!draft.periodTo) e.periodTo = 'Period To là bắt buộc'
    if (draft.periodFrom && draft.periodTo && draft.periodFrom > draft.periodTo) e.periodTo = 'Period To phải sau Period From'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    await generateInvoice.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Invoices</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
            <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Invoice #</TableHead>
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
                    <p className="font-semibold text-navy-900">{row.invoiceNumber}</p>
                    <p className="text-xs text-navy-400">{row.lineCount} lines</p>
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
                          <Button variant="accent" size="sm" onClick={() => approveInvoice.mutate(row.id)}>Approve</Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelInvoice.mutate({ id: row.id, data: {} })}>Cancel</Button>
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

        <div className="wrs-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Generate Invoice</h3>
            <p className="text-sm text-navy-400">Generate invoice for owner based on billable events.</p>
          </div>
          <div>
            <Select label="Owner" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Input label="Period From" type="date" value={draft.periodFrom} onChange={(e) => setDraft((prev) => ({ ...prev, periodFrom: e.target.value }))} />
            {errors.periodFrom && <p className="text-xs text-danger mt-1">{errors.periodFrom}</p>}
          </div>
          <div>
            <Input label="Period To" type="date" value={draft.periodTo} onChange={(e) => setDraft((prev) => ({ ...prev, periodTo: e.target.value }))} />
            {errors.periodTo && <p className="text-xs text-danger mt-1">{errors.periodTo}</p>}
          </div>

          <Button variant="accent" onClick={handleGenerate} disabled={generateInvoice.isPending}>Generate Invoice</Button>
        </div>
      </div>
    </div>
  )
}
