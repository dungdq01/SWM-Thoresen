import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse } from 'lucide-react'
import {
  useWarehouseList,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeactivateWarehouse,
  useReactivateWarehouse,
  PageHeader,
  FilterBar,
  StatusBadge,
  WarehouseTypeBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  WAREHOUSE_TYPES,
} from '@domains/master-data'
import { WarehouseFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}

export function WarehousesPage() {
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    warehouseType: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useWarehouseList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    warehouseType: filters.warehouseType || undefined,
  })

  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()
  const deactivateMutation = useDeactivateWarehouse()
  const reactivateMutation = useReactivateWarehouse()

  const warehouses = response?.data || []
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
      warehouseType: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (warehouse) => setDrawerState({ isOpen: true, data: warehouse })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        // Remove warehouseCode (immutable) and add rowVersion for optimistic locking
        const { warehouseCode, ...updateFields } = data
        await updateMutation.mutateAsync({
          id: drawerState.data.id,
          data: {
            ...updateFields,
            rowVersion: Number(drawerState.data.rowVersion)
          }
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeactivate = (warehouse) => setDeactivateState({ isOpen: true, data: warehouse })
  const handleReactivate = (warehouse) => setReactivateState({ isOpen: true, data: warehouse })

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
    { key: 'warehouseType', placeholder: 'Loại kho', options: WAREHOUSE_TYPES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý kho"
        description="Danh sách tất cả kho trong hệ thống"
        onAdd={handleAdd}
        addLabel="Thêm kho"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{
            isActive: filters.isActive,
            warehouseType: filters.warehouseType,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã hoặc tên..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={warehouses.length === 0}
        emptyMessage="Chưa có kho nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã kho</TableHead>
            <TableHead>Tên kho</TableHead>
            <TableHead align="center">Loại</TableHead>
            <TableHead>Sức chứa</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && warehouses.length > 0 && (
          <TableBody>
            {warehouses.map((wh) => (
              <TableRow key={wh.id} onClick={() => handleEdit(wh)}>
                <TableCell>
                  <button
                    onClick={() => navigate(`/app/master-data/warehouses/${wh.id}`)}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-medium text-navy-900 group-hover:text-blue-600 transition-colors">{wh.warehouseCode}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{wh.warehouseName}</p>
                    {wh.address && (
                      <p className="text-xs text-navy-500 line-clamp-1">{wh.address}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell align="center">
                  <WarehouseTypeBadge type={wh.warehouseType} />
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {wh.maxCapacityMt && (
                      <p className="text-navy-700">{formatNumber(wh.maxCapacityMt)} MT</p>
                    )}
                    {wh.usableAreaM2 && (
                      <p className="text-navy-500">{formatNumber(wh.usableAreaM2)} m²</p>
                    )}
                    {!wh.maxCapacityMt && !wh.usableAreaM2 && (
                      <span className="text-navy-400">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={wh.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(wh)}
                    onDeactivate={() => handleDeactivate(wh)}
                    onReactivate={() => handleReactivate(wh)}
                    isActive={wh.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <WarehouseFormDrawer
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
        entityName={deactivateState.data?.warehouseName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.warehouseName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
