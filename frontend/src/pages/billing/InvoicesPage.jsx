import { useState } from 'react'
import { useDebitNotes, useGenerateDebitNote, useReviewDebitNote, useApproveDebitNote, useLockDebitNote } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { InvoiceFormDrawer } from '@features/billing'

const statusTone = (status) => {
  if (status === 'APPROVED' || status === 'LOCKED') return 'success'
  if (status === 'REVIEWED') return 'info'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

export function InvoicesPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', ownerId: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useDebitNotes(filters)
  const generateDebitNote = useGenerateDebitNote()
  const reviewDebitNote = useReviewDebitNote()
  const approveDebitNote = useApproveDebitNote()
  const lockDebitNote = useLockDebitNote()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleSubmit = async (payload) => {
    await generateDebitNote.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu Nợ</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo Phiếu Nợ</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'REVIEWED', label: 'Đã xem xét' }, { value: 'APPROVED', label: 'Đã phê duyệt' }, { value: 'LOCKED', label: 'Đã khóa' }].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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

      <InvoiceFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={generateDebitNote.isPending}
        owners={owners}
        warehouses={warehouses}
      />
    </>
  )
}
