import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTransactionList } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'
import { InventoryTransactionDrawer } from '@features/inventory-core'

const transTypeTone = (type) => {
  if (['RECEIPT_IN', 'COUNT_GAIN', 'VAS_PRODUCE', 'TRANSFER_IN'].includes(type)) return 'success'
  if (['SHIPMENT_OUT', 'COUNT_LOSS', 'VAS_CONSUME', 'TRANSFER_OUT'].includes(type)) return 'warning'
  if (['MOVE', 'STATUS_CHANGE', 'ADJUSTMENT'].includes(type)) return 'info'
  return 'default'
}

const TRANS_TYPE_LABELS = {
  RECEIPT_IN: 'Nhập kho',
  SHIPMENT_OUT: 'Xuất kho',
  MOVE: 'Di chuyển',
  STATUS_CHANGE: 'Đổi trạng thái',
  ADJUSTMENT: 'Điều chỉnh',
  COUNT_GAIN: 'Kiểm kê tăng',
  COUNT_LOSS: 'Kiểm kê giảm',
  VAS_CONSUME: 'VAS tiêu thụ',
  VAS_PRODUCE: 'VAS sản xuất',
  TRANSFER_OUT: 'Chuyển ra',
  TRANSFER_IN: 'Chuyển vào',
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
  const [drawerOpen, setDrawerOpen] = useState(false)

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
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Tạo giao dịch
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select value={filters.itemId} onChange={(e) => handleChange('itemId', e.target.value)} placeholder="Tất cả mặt hàng"
            options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
          <Select value={filters.ownerId} onChange={(e) => handleChange('ownerId', e.target.value)} placeholder="Tất cả chủ hàng"
            options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
          <Input placeholder="Mã tham chiếu hoặc Correlation ID" value={filters.refId} onChange={(e) => handleChange('refId', e.target.value)} />
          <Input placeholder="Loại tham chiếu (RECEIPT, SHIPMENT...)" value={filters.refType} onChange={(e) => handleChange('refType', e.target.value)} />
          <Input placeholder="Loại giao dịch" value={filters.transType} onChange={(e) => handleChange('transType', e.target.value)} />
          <Input placeholder="Mã tương quan" value={filters.correlationId} onChange={(e) => handleChange('correlationId', e.target.value)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã giao dịch</TableHead>
              <TableHead>Tham chiếu</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead>Mặt hàng / Chủ hàng</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có giao dịch tồn kho phù hợp" /> : null}
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
                    <p className="text-xs text-navy-400">{row.refId || 'Không có chứng từ'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={transTypeTone(row.transType)}>{TRANS_TYPE_LABELS[row.transType] || row.transType}</Badge>
                    {row.isReversal ? <Badge variant="danger">Đảo ngược</Badge> : null}
                  </div>
                </TableCell>
                <TableCell align="right" className={String(row.qty).startsWith('-') ? 'text-warning font-semibold' : 'text-success font-semibold'}>{row.qty}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.item?.itemCode || row.itemId}</p>
                    <p className="text-xs text-navy-400">{row.owner?.ownerCode || 'Không có chủ hàng'}</p>
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

      <InventoryTransactionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
