import { useState, useCallback } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  useItemIncompatibilityList,
  useCreateItemIncompatibility,
  useUpdateItemIncompatibility,
  useDeactivateItemIncompatibility,
  useReactivateItemIncompatibility,
  useLookupItems,
  PageHeader,
  FilterBar,
  StatusBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  INCOMPATIBILITY_RULE_TYPES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'
import { ItemIncompatibilityFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const RULE_TYPE_LABEL = {
  ITEM_TO_ITEM: 'Item ↔ Item',
  ITEM_TO_GROUP: 'Item ↔ Nhóm',
  GROUP_TO_GROUP: 'Nhóm ↔ Nhóm',
}

const RULE_TYPE_VARIANT = {
  ITEM_TO_ITEM: 'info',
  ITEM_TO_GROUP: 'warning',
  GROUP_TO_GROUP: 'error',
}

export function ItemIncompatibilitiesPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', isActive: '', ruleType: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useItemIncompatibilityList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    ruleType: filters.ruleType || undefined,
  })

  const createMutation = useCreateItemIncompatibility()
  const updateMutation = useUpdateItemIncompatibility()
  const deactivateMutation = useDeactivateItemIncompatibility()
  const reactivateMutation = useReactivateItemIncompatibility()

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 })), [])
  const handleClearFilters = useCallback(() => setFilters((prev) => ({ ...prev, keyword: '', isActive: '', ruleType: '', page: 1 })), [])
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

  const handleDeactivate = (row) => setDeactivateState({ isOpen: true, data: row })
  const handleReactivate = (row) => setReactivateState({ isOpen: true, data: row })

  const handleConfirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {}
  }

  const handleConfirmReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(reactivateState.data.id)
      setReactivateState({ isOpen: false, data: null })
    } catch (error) {}
  }

  const getEntityLabel = (row, side) => {
    if (side === 'left') {
      if (row.item) return row.item.itemCode || row.item.itemName
      if (row.itemGroup) return row.itemGroup.itemGroupCode || row.itemGroup.itemGroupName
      return row.itemId || row.itemGroupId || '—'
    }
    if (row.incompatibleWithItem) return row.incompatibleWithItem.itemCode || row.incompatibleWithItem.itemName
    if (row.incompatibleWithGroup) return row.incompatibleWithGroup.itemGroupCode || row.incompatibleWithGroup.itemGroupName
    return row.incompatibleWithItemId || row.incompatibleWithGroupId || '—'
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'ruleType', placeholder: 'Loại quy tắc', options: INCOMPATIBILITY_RULE_TYPES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quy tắc không tương thích"
        description="Quản lý quy tắc hàng hóa không được xếp chung"
        onAdd={handleAdd}
        addLabel="Thêm quy tắc"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{ isActive: filters.isActive, ruleType: filters.ruleType }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo lý do, mã item..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có quy tắc không tương thích nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="quy tắc"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead align="center">Loại</TableHead>
            <TableHead>Đối tượng A</TableHead>
            <TableHead>Đối tượng B</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} onClick={() => handleEdit(row)}>
                <TableCell align="center">
                  <Badge variant={RULE_TYPE_VARIANT[row.ruleType] || 'default'}>
                    {RULE_TYPE_LABEL[row.ruleType] || row.ruleType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-1 rounded-md">
                    {getEntityLabel(row, 'left')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-1 rounded-md">
                    {getEntityLabel(row, 'right')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600 line-clamp-2">{row.reason || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={row.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(row)}
                    onDeactivate={() => handleDeactivate(row)}
                    onReactivate={() => handleReactivate(row)}
                    isActive={row.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <ItemIncompatibilityFormDrawer
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
        entityName="quy tắc này"
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName="quy tắc này"
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
