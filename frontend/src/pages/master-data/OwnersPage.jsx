import { useState, useCallback } from 'react'
import { Building2 } from 'lucide-react'
import {
  useOwnerList,
  useCreateOwner,
  useUpdateOwner,
  useDeactivateOwner,
  useReactivateOwner,
  PageHeader,
  FilterBar,
  StatusBadge,
  OwnerGroupBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  OWNER_GROUPS,
  OWNER_TYPES,
} from '@domains/master-data'
import { OwnerFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function OwnersPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    ownerGroup: '',
    ownerType: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useOwnerList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    ownerGroup: filters.ownerGroup || undefined,
    ownerType: filters.ownerType || undefined,
  })

  const createMutation = useCreateOwner()
  const updateMutation = useUpdateOwner()
  const deactivateMutation = useDeactivateOwner()
  const reactivateMutation = useReactivateOwner()

  const owners = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      keyword: '',
      isActive: '',
      ownerGroup: '',
      ownerType: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (owner) => setDrawerState({ isOpen: true, data: owner })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        await updateMutation.mutateAsync({ id: drawerState.data.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeactivate = (owner) => setDeactivateState({ isOpen: true, data: owner })
  const handleReactivate = (owner) => setReactivateState({ isOpen: true, data: owner })

  const handleConfirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleConfirmReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(reactivateState.data.id)
      setReactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'ownerGroup', placeholder: 'Nhóm', options: OWNER_GROUPS },
    { key: 'ownerType', placeholder: 'Loại', options: OWNER_TYPES },
  ]

  return (
    <div className="page-section">
      <PageHeader
        title="Quản lý chủ hàng"
        description="Danh sách các chủ hàng trong hệ thống"
        onAdd={handleAdd}
        addLabel="Thêm chủ hàng"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div>
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{
            isActive: filters.isActive,
            ownerGroup: filters.ownerGroup,
            ownerType: filters.ownerType,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã hoặc tên chủ hàng..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={owners.length === 0}
        emptyMessage="Chưa có chủ hàng nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã chủ hàng</TableHead>
            <TableHead>Tên chủ hàng</TableHead>
            <TableHead>Nhóm</TableHead>
            <TableHead>Mã số thuế</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && owners.length > 0 && (
          <TableBody>
            {owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-navy-900">{owner.ownerCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-800">{owner.ownerName}</p>
                    {owner.shortName && (
                      <p className="text-xs text-navy-400">{owner.shortName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <OwnerGroupBadge group={owner.ownerGroup} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-400">{owner.taxCode || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={owner.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(owner)}
                    onDeactivate={() => handleDeactivate(owner)}
                    onReactivate={() => handleReactivate(owner)}
                    isActive={owner.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <OwnerFormDrawer
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
        entityName={deactivateState.data?.ownerName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.ownerName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
