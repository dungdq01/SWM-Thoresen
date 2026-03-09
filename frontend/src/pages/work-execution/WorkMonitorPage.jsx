import { useState } from 'react'
import { useWorks, useWorkDashboardSummary } from '@domains/work-execution'
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

export function WorkMonitorPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 30, warehouseId: '' })

  const { data: summaryResponse, refetch: refetchSummary } = useWorkDashboardSummary(filters.warehouseId)
  const summary = summaryResponse?.data || {}

  const { data: response, isLoading, refetch } = useWorks({
    ...filters,
    warehouseId: filters.warehouseId || undefined,
  })

  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleRefresh = () => {
    refetch()
    refetchSummary()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Work Monitor (supervisor view)</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
        <div className="wrs-card p-4">
          <p className="text-3xl font-bold text-navy-900">{summary.totalOpen || 0}</p>
          <p className="text-sm text-navy-500">Open Works</p>
        </div>
        <div className="wrs-card p-4">
          <p className="text-3xl font-bold text-amber-600">{summary.totalInProgress || 0}</p>
          <p className="text-sm text-navy-500">In Progress</p>
        </div>
        <div className="wrs-card p-4">
          <p className="text-3xl font-bold text-emerald-600">{summary.totalCompleted || 0}</p>
          <p className="text-sm text-navy-500">Completed Today</p>
        </div>
        <div className="wrs-card p-4">
          <p className="text-3xl font-bold text-rose-600">{summary.exceptionsOpen || 0}</p>
          <p className="text-sm text-navy-500">Open Exceptions</p>
        </div>
        <div className="wrs-card p-4">
          <div className="flex gap-2">
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-rose-600">{summary.pickOpen || 0}</p>
              <p className="text-xs text-navy-400">Pick</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-emerald-600">{summary.putawayOpen || 0}</p>
              <p className="text-xs text-navy-400">Putaway</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-blue-600">{summary.moveOpen || 0}</p>
              <p className="text-xs text-navy-400">Move</p>
            </div>
          </div>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Filter by warehouse" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Work ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead align="right">Progress</TableHead>
              <TableHead align="center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={7} message="No work available" /> : null}
            {!isLoading ? rows.map((row) => {
              const completedLines = row.lines?.filter((l) => ['COMPLETED', 'SKIPPED'].includes(l.status)).length || 0
              const totalLines = row.lines?.length || 0
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{row.workId}</p>
                    <p className="text-xs text-navy-400">{row.warehouse?.code}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={workTypeTone(row.workType)}>{row.workType}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.sourceId}</p>
                    <p className="text-xs text-navy-400">{row.sourceType}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-navy-800">{row.assignedTo || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-navy-500">{row.startedAt ? new Date(row.startedAt).toLocaleString('vi-VN') : '—'}</p>
                  </TableCell>
                  <TableCell align="right">
                    <p className="font-semibold text-navy-900">{completedLines}/{totalLines}</p>
                    <div className="w-full bg-moon-200 rounded-full h-1.5 mt-1">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${totalLines > 0 ? (completedLines / totalLines) * 100 : 0}%` }} />
                    </div>
                  </TableCell>
                  <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                </TableRow>
              )
            }) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </div>
  )
}
