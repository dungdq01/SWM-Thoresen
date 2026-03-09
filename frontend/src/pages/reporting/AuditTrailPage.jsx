import { useState } from 'react'
import { useAuditLogs } from '@domains/reporting'
import { Badge, Button, Input, Pagination, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả entity' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'SHIPMENT', label: 'Shipment' },
  { value: 'INVENT_TRANS', label: 'Invent Trans' },
  { value: 'DEBIT_NOTE', label: 'Debit Note' },
  { value: 'VAS_WORK_ORDER', label: 'VAS Work Order' },
  { value: 'MOVE_ORDER', label: 'Move Order' },
  { value: 'CYCLE_COUNT', label: 'Cycle Count' },
  { value: 'RATE_CARD', label: 'Rate Card' },
  { value: 'OWNER', label: 'Owner' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả action' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'STATUS_CHANGE', label: 'STATUS_CHANGE' },
  { value: 'POST', label: 'POST' },
  { value: 'DELETE', label: 'DELETE' },
]

const actionTone = (action) => {
  if (action === 'CREATE') return 'success'
  if (action === 'STATUS_CHANGE') return 'info'
  if (action === 'UPDATE') return 'warning'
  if (action === 'DELETE') return 'danger'
  if (action === 'POST') return 'default'
  return 'default'
}

export function AuditTrailPage() {
  const [filters, setFilters] = useState({
    keyword: '',
    entityType: '',
    action: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 15,
  })

  const { data: response, isLoading } = useAuditLogs(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || {}

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  const setPage = (page) => setFilters((prev) => ({ ...prev, page }))

  const formatTs = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
  }

  const formatChanges = (changes) => {
    if (!changes) return '—'
    return Object.entries(changes)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null && 'from' in v) return `${k}: ${v.from} → ${v.to}`
        return `${k}: ${v}`
      })
      .join(' · ')
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Audit Trail</h2>
        <p className="text-xs text-navy-400">Chỉ đọc · AC-AUD-1..3: searchable, date filter, entity type filter</p>
      </div>

      {/* Filters */}
      <div className="wrs-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tìm entity ID, user..."
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
            className="w-52"
          />
          <select
            className="wrs-input h-9 text-sm"
            value={filters.entityType}
            onChange={(e) => setFilter('entityType', e.target.value)}
          >
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="wrs-input h-9 text-sm"
            value={filters.action}
            onChange={(e) => setFilter('action', e.target.value)}
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter('dateFrom', e.target.value)}
            className="w-36"
          />
          <span className="self-center text-navy-400 text-sm">→</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilter('dateTo', e.target.value)}
            className="w-36"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ keyword: '', entityType: '', action: '', dateFrom: '', dateTo: '', page: 1, limit: 15 })}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="wrs-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading cols={6} />}
            {!isLoading && rows.length === 0 && <TableEmpty cols={6} message="Không có audit log" />}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs text-navy-500 whitespace-nowrap">{formatTs(row.timestamp)}</TableCell>
                <TableCell>
                  <span className="text-xs font-mono bg-moon-100 px-1.5 py-0.5 rounded text-navy-700">{row.entityType}</span>
                </TableCell>
                <TableCell className="font-mono text-xs text-navy-700">{row.entityId}</TableCell>
                <TableCell>
                  <Badge variant={actionTone(row.action)}>{row.action}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-900">{row.userName}</p>
                  <p className="text-xs text-navy-400">{row.userId}</p>
                </TableCell>
                <TableCell className="text-xs text-navy-600 max-w-xs truncate" title={formatChanges(row.changes)}>
                  {formatChanges(row.changes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination.total > 0 && (
          <div className="p-3 border-t border-moon-200">
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
