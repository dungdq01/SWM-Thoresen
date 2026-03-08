import { useCallback, useMemo, useState } from 'react'
import { Boxes, Package, ShieldCheck, Warehouse } from 'lucide-react'
import { useOnHandList } from '@domains/inventory-core'
import { useLookupInventoryStatuses, useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'

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
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Tồn kho hiện tại</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới dữ liệu</Button>
      </div>

      <Card hover={false}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Bộ lọc on-hand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input placeholder="Lọc theo item ID..." value={filters.itemId} onChange={(e) => handleChange('itemId', e.target.value)} />
            <Select
              value={filters.ownerId}
              onChange={(e) => handleChange('ownerId', e.target.value)}
              placeholder="Tất cả owner"
              options={ownerOptions.map((option) => ({ value: option.id, label: `${option.code} - ${option.name}` }))}
            />
            <Select
              value={filters.warehouseId}
              onChange={(e) => handleChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((option) => ({ value: option.id, label: `${option.code} - ${option.name}` }))}
            />
            <Select
              value={filters.inventoryStatusId}
              onChange={(e) => handleChange('inventoryStatusId', e.target.value)}
              placeholder="Tất cả status"
              options={statusOptions.map((option) => ({ value: option.id, label: `${option.code} - ${option.name}` }))}
            />
            <Select
              value={String(filters.hasStock)}
              onChange={(e) => handleChange('hasStock', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Chỉ bản ghi có tồn' },
                { value: 'false', label: 'Bao gồm cả zero stock' },
              ]}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Item</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead align="right">Physical</TableHead>
                <TableHead align="right">Reserved</TableHead>
                <TableHead align="right">Available</TableHead>
                <TableHead>UOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={6} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có bản ghi on-hand phù hợp" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{row.item?.itemCode || row.itemId}</p>
                      <p className="text-xs text-navy-400">{row.item?.itemName || 'Không có tên item'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-navy-500">
                      <p><span className="font-semibold text-navy-700">Kho:</span> {row.inventDim?.warehouse?.warehouseCode || '—'}</p>
                      <p><span className="font-semibold text-navy-700">Vị trí:</span> {row.inventDim?.location?.locationCode || '—'}</p>
                      <p><span className="font-semibold text-navy-700">Owner:</span> {row.inventDim?.owner?.ownerCode || '—'}</p>
                      <Badge variant={row.inventDim?.inventoryStatus?.isAllocatable ? 'success' : 'warning'}>
                        {row.inventDim?.inventoryStatus?.statusCode || 'N/A'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-navy-900">{row.physicalQty}</TableCell>
                  <TableCell align="right">{row.reservedQty}</TableCell>
                  <TableCell align="right" className="font-semibold text-success">{row.availableQty}</TableCell>
                  <TableCell>{row.uom?.uomCode || '—'}</TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleChange('page', page)} />
        </CardContent>
      </Card>
    </div>
  )
}
