import { useCallback, useMemo, useState } from 'react'
import { ArrowRightLeft, Plus, ReceiptText, RotateCcw, ScrollText } from 'lucide-react'
import { useTransactionList } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'
import { InventoryTransactionModal } from '@features/inventory-core'

const transTypeTone = (type) => {
  if (['RECEIPT_IN', 'COUNT_GAIN', 'VAS_PRODUCE', 'TRANSFER_IN'].includes(type)) return 'success'
  if (['SHIPMENT_OUT', 'COUNT_LOSS', 'VAS_CONSUME', 'TRANSFER_OUT'].includes(type)) return 'warning'
  if (['MOVE', 'STATUS_CHANGE', 'ADJUSTMENT'].includes(type)) return 'info'
  return 'default'
}

export function InventoryTransactionsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    itemId: '',
    ownerId: '',
    refType: '',
    refId: '',
    transType: '',
    correlationId: '',
  })
  const [showModal, setShowModal] = useState(false)

  const { data: response, isLoading, refetch } = useTransactionList({
    ...filters,
    itemId: filters.itemId || undefined,
    ownerId: filters.ownerId || undefined,
    refType: filters.refType || undefined,
    refId: filters.refId || undefined,
    transType: filters.transType || undefined,
    correlationId: filters.correlationId || undefined,
  })

  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lịch sử giao dịch</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Tạo giao dịch
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <select className="wrs-input" value={filters.itemId} onChange={(e) => handleChange('itemId', e.target.value)}>
            <option value="">All items</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
          </select>
          <select className="wrs-input" value={filters.ownerId} onChange={(e) => handleChange('ownerId', e.target.value)}>
            <option value="">All owners</option>
            {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
          </select>
          <Input placeholder="Ref ID or correlation ID" value={filters.refId} onChange={(e) => handleChange('refId', e.target.value)} />
          <Input placeholder="Ref type (RECEIPT, SHIPMENT...)" value={filters.refType} onChange={(e) => handleChange('refType', e.target.value)} />
          <Input placeholder="Trans type" value={filters.transType} onChange={(e) => handleChange('transType', e.target.value)} />
          <Input placeholder="Correlation ID" value={filters.correlationId} onChange={(e) => handleChange('correlationId', e.target.value)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Trans ID</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Type</TableHead>
              <TableHead align="right">Qty</TableHead>
              <TableHead>Item / Owner</TableHead>
              <TableHead>Posted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No matching inventory transactions" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.transId}</p>
                    {row.correlationId ? <p className="text-xs text-navy-400">{row.correlationId}</p> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.refType || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.refId || 'No document'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={transTypeTone(row.transType)}>{row.transType}</Badge>
                    {row.isReversal ? <Badge variant="danger">Reversal</Badge> : null}
                  </div>
                </TableCell>
                <TableCell align="right" className={String(row.qty).startsWith('-') ? 'text-warning font-semibold' : 'text-success font-semibold'}>{row.qty}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.item?.itemCode || row.itemId}</p>
                    <p className="text-xs text-navy-400">{row.owner?.ownerCode || 'No owner'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm text-navy-700">{row.postedAt ? new Date(row.postedAt).toLocaleString('vi-VN') : '—'}</p>
                    <p className="text-xs text-navy-400">{row.sourceApp || 'API'}</p>
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleChange('page', page)} />
      </div>

      <InventoryTransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
