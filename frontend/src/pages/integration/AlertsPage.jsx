import { useState } from 'react'
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '@domains/integration'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const severityTone = (severity) => {
  if (severity === 'HIGH') return 'danger'
  if (severity === 'MEDIUM') return 'warning'
  return 'info'
}

const statusTone = (status) => {
  if (status === 'RESOLVED') return 'success'
  if (status === 'ACKNOWLEDGED') return 'warning'
  return 'danger'
}

export function AlertsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', severity: '', alertSource: '' })
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolvingId, setResolvingId] = useState('')

  const { data: response, isLoading, refetch } = useAlerts(filters)
  const acknowledgeAlert = useAcknowledgeAlert()
  const resolveAlert = useResolveAlert()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleResolve = async (id) => {
    await resolveAlert.mutateAsync({ id, data: { resolutionNote } })
    setResolvingId('')
    setResolutionNote('')
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Integration Alerts</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'OPEN', label: 'OPEN' }, { value: 'ACKNOWLEDGED', label: 'ACKNOWLEDGED' }, { value: 'RESOLVED', label: 'RESOLVED' }]} placeholder="Status" />
          <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'HIGH', label: 'HIGH' }, { value: 'MEDIUM', label: 'MEDIUM' }, { value: 'LOW', label: 'LOW' }]} placeholder="Severity" />
          <Select value={filters.alertSource} onChange={(e) => setFilters((prev) => ({ ...prev, alertSource: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'WEIGHBRIDGE', label: 'WEIGHBRIDGE' }, { value: 'ERP_SYNC', label: 'ERP_SYNC' }, { value: 'MOBILE_SYNC', label: 'MOBILE_SYNC' }, { value: 'OCR', label: 'OCR' }]} placeholder="Source" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Alert</TableHead>
              <TableHead>Source / Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No alerts" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.title}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.alertSource}</p>
                  <Badge variant={severityTone(row.severity)} className="mt-1">{row.severity}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700 max-w-xs truncate">{row.message}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-400">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'OPEN' && (
                      <Button variant="outline" size="sm" onClick={() => acknowledgeAlert.mutate({ id: row.id, data: {} })}>Acknowledge</Button>
                    )}
                    {['OPEN', 'ACKNOWLEDGED'].includes(row.status) && (
                      <Button variant="accent" size="sm" onClick={() => setResolvingId(row.id)}>Resolve</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      {resolvingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="wrs-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-navy-900">Resolve Alert</h3>
            <Textarea label="Resolution Note" rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Enter resolution details..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResolvingId('')}>Cancel</Button>
              <Button variant="accent" onClick={() => handleResolve(resolvingId)} disabled={resolveAlert.isPending}>Resolve</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
