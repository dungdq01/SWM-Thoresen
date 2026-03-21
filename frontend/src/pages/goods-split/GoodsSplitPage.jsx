import { useState } from 'react'
import { useGoodsSplits, useCreateGoodsSplit, useConfirmGoodsSplit, usePostGoodsSplit, useCancelGoodsSplit } from '@domains/goods-split'
import { useLookupOwners, useLookupItems, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { Plus, RefreshCw, Eye, Check, BookOpen, X, Split } from 'lucide-react'
import { GoodsSplitCreateDrawer } from './components/GoodsSplitCreateDrawer'
import { GoodsSplitDetailDrawer } from './components/GoodsSplitDetailDrawer'

const statusConfig = {
  DRAFT: { label: 'Nháp', tone: 'default' },
  CALCULATED: { label: 'Đã tính', tone: 'info' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'warning' },
  POSTED: { label: 'Đã ghi sổ', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
}

export function GoodsSplitPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)

  const { data: response, isLoading, refetch } = useGoodsSplits(filters)
  const createSplit = useCreateGoodsSplit()
  const confirmSplit = useConfirmGoodsSplit()
  const postSplit = usePostGoodsSplit()
  const cancelSplit = useCancelGoodsSplit()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleCreate = async (payload) => {
    await createSplit.mutateAsync(payload)
    setCreateOpen(false)
  }

  const handleConfirm = async (id) => {
    await confirmSplit.mutateAsync({ id, data: {} })
  }

  const handlePost = async (id) => {
    await postSplit.mutateAsync(id)
  }

  const handleCancel = async (id) => {
    await cancelSplit.mutateAsync({ id, reasonCode: 'USER_CANCEL' })
  }

  const statusFilters = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'CALCULATED', label: 'Đã tính' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'POSTED', label: 'Đã ghi sổ' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ice/10">
            <Split className="w-5 h-5 text-ice" />
          </div>
          <div>
            <h2 className="section-title">Chia hàng đổi chủ</h2>
            <p className="text-sm text-navy-400">Phân bổ hàng từ chủ ủy quyền sang chủ hàng thực tế</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Tạo phiếu
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((s) => (
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

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Chủ hàng gốc</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead>Kho</TableHead>
              <TableHead align="right">Tổng SL (kg)</TableHead>
              <TableHead align="center">Phân bổ</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={8} /> : null}
            {!isLoading && rows.length === 0 ? (
              <TableEmpty colSpan={8} message="Chưa có phiếu chia hàng nào. Nhấn 'Tạo phiếu' để bắt đầu." />
            ) : null}
            {!isLoading && rows.map((row) => {
              const cfg = statusConfig[row.status] || { label: row.status, tone: 'default' }
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <button
                      onClick={() => setDetailId(row.id)}
                      className="font-semibold text-ice hover:underline cursor-pointer"
                    >
                      {row.splitNumber}
                    </button>
                    <p className="text-xs text-navy-400">{row.details?.length || 0} chủ hàng đích</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.originalOwner?.ownerCode || '—'}</p>
                    <p className="text-xs text-navy-400">{row.originalOwner?.ownerName || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.item?.itemCode || '—'}</p>
                    <p className="text-xs text-navy-400">{row.item?.itemName || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-navy-800">{row.warehouse?.warehouseCode || '—'}</p>
                  </TableCell>
                  <TableCell align="right">
                    <p className="font-semibold text-navy-900 tabular-nums">{Number(row.totalQtyKg || 0).toLocaleString('vi-VN')}</p>
                  </TableCell>
                  <TableCell align="center">
                    <div className="text-sm">
                      <span className="font-semibold text-navy-900">{Number(row.allocatedQty || 0).toLocaleString('vi-VN')}</span>
                      <span className="text-navy-400"> / {Number(row.totalQty || 0).toLocaleString('vi-VN')}</span>
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={cfg.tone}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(row.id)} title="Chi tiết">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {['DRAFT', 'CALCULATED'].includes(row.status) && (
                        <Button variant="outline" size="sm" onClick={() => handleConfirm(row.id)} title="Xác nhận">
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {row.status === 'CONFIRMED' && (
                        <Button variant="accent" size="sm" onClick={() => handlePost(row.id)} title="Ghi sổ">
                          <BookOpen className="w-4 h-4" />
                        </Button>
                      )}
                      {['DRAFT', 'CALCULATED'].includes(row.status) && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(row.id)} title="Hủy">
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      <GoodsSplitCreateDrawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={createSplit.isPending}
        owners={owners}
        items={items}
        warehouses={warehouses}
      />

      {detailId && (
        <GoodsSplitDetailDrawer
          splitId={detailId}
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
          onConfirm={handleConfirm}
          onPost={handlePost}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
