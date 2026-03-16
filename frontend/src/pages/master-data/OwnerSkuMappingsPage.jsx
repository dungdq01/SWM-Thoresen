import { useState, useCallback } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import {
  useOwnerSkuMappingList,
  useCreateOwnerSkuMapping,
  useUpdateOwnerSkuMapping,
  useDeleteOwnerSkuMapping,
  useLookupOwners,
  PageHeader,
  FilterBar,
  StatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@domains/master-data'
import { Badge, Button } from '@shared/ui'
import { OwnerSkuMappingFormDrawer } from '@features/master-data'

const BILLING_VARIANT = {
  ST01: 'info', ST02: 'warning', ST03: 'success', PR01: 'primary', PR02: 'error',
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function OwnerSkuMappingsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', isActive: '', ownerId: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deleteId, setDeleteId] = useState(null)

  const { data: response, isLoading, refetch } = useOwnerSkuMappingList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    ownerId: filters.ownerId || undefined,
  })
  const { data: owners = [] } = useLookupOwners()

  const createMutation = useCreateOwnerSkuMapping()
  const updateMutation = useUpdateOwnerSkuMapping()
  const deleteMutation = useDeleteOwnerSkuMapping()

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const ownerFilterOptions = owners.map((o) => ({ value: o.id, label: `${o.code} / ${o.name}` }))

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 })), [])
  const handleClearFilters = useCallback(() => setFilters((prev) => ({ ...prev, keyword: '', isActive: '', ownerId: '', page: 1 })), [])
  const handlePageChange = useCallback((page) => setFilters((prev) => ({ ...prev, page })), [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (row) => setDrawerState({ isOpen: true, data: row })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        await updateMutation.mutateAsync({ id: drawerState.data.id, data: { ...data, rowVersion: Number(drawerState.data.rowVersion) } })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {}
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xóa mapping này?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {}
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'ownerId', placeholder: 'Tất cả chủ hàng', options: ownerFilterOptions },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Mapping Owner - SKU"
        description="Quản lý mã SKU riêng của từng chủ hàng"
        onAdd={handleAdd}
        addLabel="Thêm mapping"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{ isActive: filters.isActive, ownerId: filters.ownerId }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm mã, tên SKU, SKU toàn cục..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có mapping nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="mapping"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Chủ hàng</TableHead>
            <TableHead>SKU toàn cục</TableHead>
            <TableHead>Mã SKU chủ hàng</TableHead>
            <TableHead>Tên SKU chủ hàng</TableHead>
            <TableHead align="center">Billing Class</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} onClick={() => handleEdit(row)}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">
                    {row.owner ? `${row.owner.ownerCode}/${row.owner.shortName || ''}` : row.ownerId}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">
                    {row.item ? row.item.itemCode : row.itemId}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{row.ownerSkuCode}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{row.ownerSkuName}</span>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={BILLING_VARIANT[row.billingClass] || 'default'}>
                    {row.billingClass}
                  </Badge>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={row.isActive} />
                </TableCell>
                <TableCell align="center">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(row.id) }}
                    className="rounded-lg p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Xóa mapping"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <OwnerSkuMappingFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
