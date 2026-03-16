import { useState, useCallback } from 'react'
import { Layers } from 'lucide-react'
import {
  useItemGroupList,
  useCreateItemGroup,
  useUpdateItemGroup,
  useDeactivateItemGroup,
  useReactivateItemGroup,
  PageHeader,
  FilterBar,
  StatusBadge,
  ActionMenu,
  DeactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ITEM_GROUP_CARGO_FORMS,
} from '@domains/master-data'
import { Badge } from '@shared/ui'
import { ItemGroupFormDrawer } from '@features/master-data'

const CARGO_FORM_CONFIG = {
  BULK:       { label: 'Hàng rời',  variant: 'info' },
  BAGGED_25KG:{ label: 'Bao 25kg', variant: 'warning' },
  BAGGED_40KG:{ label: 'Bao 40kg', variant: 'warning' },
  BAGGED_50KG:{ label: 'Bao 50kg', variant: 'warning' },
  JUMBO:      { label: 'Jumbo',    variant: 'primary' },
  PACKAGING:  { label: 'Bao bì',   variant: 'success' },
  CONTAINER:  { label: 'Container',variant: 'success' },
  DRUM:       { label: 'Thùng',    variant: 'danger' },
  PALLET:     { label: 'Pallet',   variant: 'primary' },
  OTHER:      { label: 'Khác',     variant: 'neutral' },
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function ItemGroupsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', isActive: '', cargoForm: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useItemGroupList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    cargoForm: filters.cargoForm || undefined,
  })
  const createMutation = useCreateItemGroup()
  const updateMutation = useUpdateItemGroup()
  const deactivateMutation = useDeactivateItemGroup()
  const reactivateMutation = useReactivateItemGroup()

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 })), [])
  const handleClearFilters = useCallback(() => setFilters((prev) => ({ ...prev, keyword: '', isActive: '', cargoForm: '', page: 1 })), [])
  const handlePageChange = useCallback((page) => setFilters((prev) => ({ ...prev, page })), [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (row) => setDrawerState({ isOpen: true, data: row })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        const { itemGroupCode, ...updateFields } = data
        await updateMutation.mutateAsync({ id: drawerState.data.id, data: { ...updateFields, rowVersion: Number(drawerState.data.rowVersion) } })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {}
  }

  const handleConfirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {}
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'cargoForm', placeholder: 'Hình thức', options: ITEM_GROUP_CARGO_FORMS },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý nhóm hàng hóa"
        description="Phân loại hàng hóa theo nhóm và hình thức đóng gói"
        onAdd={handleAdd}
        addLabel="Thêm nhóm hàng"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{ isActive: filters.isActive, cargoForm: filters.cargoForm }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm mã, tên, mô tả..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có nhóm hàng hóa nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="nhóm hàng hóa"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã</TableHead>
            <TableHead>Tên nhóm</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead align="center">Hình thức</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} onClick={() => handleEdit(row)}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{row.itemGroupCode}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{row.itemGroupName}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-500">{row.description || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={(CARGO_FORM_CONFIG[row.cargoForm] || {}).variant || 'default'}>
                    {(CARGO_FORM_CONFIG[row.cargoForm] || {}).label || row.cargoForm}
                  </Badge>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={row.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(row)}
                    onDeactivate={() => setDeactivateState({ isOpen: true, data: row })}
                    onReactivate={() => reactivateMutation.mutate(row.id)}
                    isActive={row.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <ItemGroupFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeactivateModal
        isOpen={deactivateState.isOpen}
        onClose={() => setDeactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmDeactivate}
        entityName={deactivateState.data?.itemGroupName}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  )
}
