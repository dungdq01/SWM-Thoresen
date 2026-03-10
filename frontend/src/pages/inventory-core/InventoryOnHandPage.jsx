import { useCallback, useState } from 'react'
import { Boxes } from 'lucide-react'
import { useOnHandList } from '@domains/inventory-core'
import { useLookupInventoryStatuses, useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'

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
        <h2 className="section-title">Current Inventory On-Hand</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <Card hover={false}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">On-Hand Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Select
              value={filters.ownerId}
              onChange={(e) => handleChange('ownerId', e.target.value)}
              placeholder="All owners"
              options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              placeholder="All items"
              options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.inventoryStatusId}
              onChange={(e) => handleChange('inventoryStatusId', e.target.value)}
              placeholder="All statuses"
              options={statusOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.warehouseId}
              onChange={(e) => handleChange('warehouseId', e.target.value)}
              placeholder="All warehouses"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={String(filters.hasStock)}
              onChange={(e) => handleChange('hasStock', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Only records with stock' },
                { value: 'false', label: 'Include zero stock' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Owner</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead align="right">Physical</TableHead>
                  <TableHead align="right">Reserved</TableHead>
                  <TableHead align="right">Available</TableHead>
                  <TableHead>UOM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableLoading colSpan={TOTAL_COLS} /> : null}
                {!isLoading && rows.length === 0 ? <TableEmpty colSpan={TOTAL_COLS} message="No matching on-hand records" /> : null}
                {!isLoading ? rows.map((row) => {
                  const uomCode = row.uom?.uomCode || ''
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.inventDim?.owner?.ownerCode || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.inventDim?.owner?.ownerName || '—'}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.item?.itemCode || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.item?.itemName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={row.inventDim?.inventoryStatus?.isAllocatable ? 'success' : 'warning'}>
                          {row.inventDim?.inventoryStatus?.statusCode || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-navy-600">{row.lotNumber || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-navy-600">{row.inventDim?.location?.locationCode || '—'}</span>
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
    </>
  )
}
