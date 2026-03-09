import { useState } from 'react'
import { useWorks, useClaimWork, useCancelWork, useWorkDashboardSummary } from '@domains/work-execution'
import { useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const workTypeTone = (workType) => {
  if (workType === 'PICK') return 'danger'
  if (workType === 'PUTAWAY') return 'success'
  if (['TRANSFER_PICK', 'TRANSFER_PUT'].includes(workType)) return 'warning'
  return 'info'
}

export function WorkQueuePage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', workType: '', warehouseId: '' })

  const { data: summaryResponse } = useWorkDashboardSummary(filters.warehouseId)
  const summary = summaryResponse?.data || {}

  const { data: response, isLoading, refetch } = useWorks({
    ...filters,
    status: filters.status || undefined,
    workType: filters.workType || undefined,
    warehouseId: filters.warehouseId || undefined,
  })

  const claimWork = useClaimWork()
  const cancelWork = useCancelWork()

  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Work Queue (All Tasks)</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-5">
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{summary.totalOpen || 0}</p>
          <p className="text-xs text-navy-500">Open</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{summary.totalInProgress || 0}</p>
          <p className="text-xs text-navy-500">In Progress</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{summary.totalCompleted || 0}</p>
          <p className="text-xs text-navy-500">Completed</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-rose-600">{summary.pickOpen || 0}</p>
          <p className="text-xs text-navy-500">Pick Open</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{summary.putawayOpen || 0}</p>
          <p className="text-xs text-navy-500">Putaway Open</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{summary.exceptionsOpen || 0}</p>
          <p className="text-xs text-navy-500">Exceptions</p>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'OPEN', label: 'OPEN' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
          <Select value={filters.workType} onChange={(e) => setFilters((prev) => ({ ...prev, workType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'PUTAWAY', label: 'PUTAWAY' }, { value: 'PICK', label: 'PICK' }, { value: 'MOVE', label: 'MOVE' }, { value: 'TRANSFER_PICK', label: 'TRANSFER_PICK' }, { value: 'TRANSFER_PUT', label: 'TRANSFER_PUT' }]} placeholder="Work Type" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Work ID</TableHead>
              <TableHead>Type / Priority</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead align="right">Lines / Qty</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={7} message="No work in queue" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.workId}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={workTypeTone(row.workType)}>{row.workType}</Badge>
                  <p className="text-xs text-navy-400 mt-1">Priority: {row.priority}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.sourceType}</p>
                  <p className="text-xs text-navy-400">{row.sourceId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.assignedTo || '—'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} line(s)</p>
                  <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'OPEN' && !row.assignedTo && (
                      <Button variant="accent" size="sm" onClick={() => claimWork.mutate({ id: row.id, data: {} })}>Claim</Button>
                    )}
                    {['OPEN', 'IN_PROGRESS'].includes(row.status) && (
                      <Button variant="ghost" size="sm" onClick={() => cancelWork.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Cancel</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </div>
  )
}
