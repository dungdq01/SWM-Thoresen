import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { useOnHandList } from '@domains/inventory-core'
import { useLookupInventoryStatuses, useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'
import { InventoryPostingModal } from '@features/inventory-core'

const TOTAL_COLS = 11

function formatQty(value, uomCode) {
  const num = Number(value)
  if (isNaN(num)) return '—'
  if (uomCode === 'KG') return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export function InventoryOnHandPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    itemId: '',
    warehouseId: '',
    ownerId: '',
    inventoryStatusId: '',
    hasStock: true,
  })
  const [showPostingModal, setShowPostingModal] = useState(false)

  const { data: response, isLoading, refetch } = useOnHandList({
    ...filters,
    itemId: filters.itemId || undefined,
    warehouseId: filters.warehouseId || undefined,
    ownerId: filters.ownerId || undefined,
    inventoryStatusId: filters.inventoryStatusId || undefined,
  })

  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: statusOptions = [] } = useLookupInventoryStatuses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Tồn kho hiện tại</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
          <Button size="sm" onClick={() => setShowPostingModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nhập tồn kho
          </Button>
        </div>
      </div>

      <Card hover={false}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Bộ lọc tồn kho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Select
              value={filters.ownerId}
              onChange={(e) => handleChange('ownerId', e.target.value)}
              placeholder="Tất cả chủ hàng"
              options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              placeholder="Tất cả mặt hàng"
              options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.inventoryStatusId}
              onChange={(e) => handleChange('inventoryStatusId', e.target.value)}
              placeholder="Tất cả trạng thái"
              options={statusOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.warehouseId}
              onChange={(e) => handleChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={String(filters.hasStock)}
              onChange={(e) => handleChange('hasStock', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Chỉ có tồn kho' },
                { value: 'false', label: 'Bao gồm tồn = 0' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Mã chủ hàng</TableHead>
                  <TableHead>Tên chủ hàng</TableHead>
                  <TableHead>Mã hàng</TableHead>
                  <TableHead>Tên hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lô</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead align="right">Thực tế</TableHead>
                  <TableHead align="right">Đã giữ</TableHead>
                  <TableHead align="right">Khả dụng</TableHead>
                  <TableHead>ĐVT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableLoading colSpan={TOTAL_COLS} /> : null}
                {!isLoading && rows.length === 0 ? <TableEmpty colSpan={TOTAL_COLS} message="Không có dữ liệu tồn kho phù hợp" /> : null}
                {!isLoading ? rows.map((row) => {
                  const uomCode = row.uom?.uomCode || ''
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.inventDim?.owner?.ownerCode || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.inventDim?.owner?.ownerName || '—'}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.item?.itemCode || row.item?.itemName || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.item?.itemName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={row.inventDim?.inventoryStatus?.isAllocatable ? 'success' : 'warning'}>
                          {row.inventDim?.inventoryStatus?.statusCode || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-navy-600">{row.inventDim?.location?.locationCode || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-navy-600">
                          {row.inventDim?.warehouse?.warehouseName || row.inventDim?.zone?.zoneName || '—'}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-semibold text-navy-900">{formatQty(row.physicalQty, uomCode)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-navy-600">{formatQty(row.reservedQty, uomCode)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-semibold text-emerald-600">{formatQty(row.availableQty, uomCode)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-navy-700">{uomCode || '—'}</span>
                      </TableCell>
                    </TableRow>
                  )
                }) : null}
              </TableBody>
            </Table>
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleChange('page', page)} />
        </CardContent>
      </Card>

      <InventoryPostingModal
        isOpen={showPostingModal}
        onClose={() => setShowPostingModal(false)}
      />
    </>
  )
}
