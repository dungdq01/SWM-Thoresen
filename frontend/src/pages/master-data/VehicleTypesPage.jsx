import { useState, useCallback } from 'react'
import { Truck } from 'lucide-react'
import {
  useVehicleTypeList,
  useCreateVehicleType,
  useUpdateVehicleType,
  useDeactivateVehicleType,
  useReactivateVehicleType,
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
  VEHICLE_CATEGORIES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'
import { VehicleTypeFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const getCategoryLabel = (category) => {
  const found = VEHICLE_CATEGORIES.find((c) => c.value === category)
  return found?.label || category
}

const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}

export function VehicleTypesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    category: '',
  })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useVehicleTypeList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    category: filters.category || undefined,
  })
  const createMutation = useCreateVehicleType()
  const updateMutation = useUpdateVehicleType()
  const deactivateMutation = useDeactivateVehicleType()
  const reactivateMutation = useReactivateVehicleType()

  const vehicleTypes = response?.data || []
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
      category: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (vehicleType) => setDrawerState({ isOpen: true, data: vehicleType })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        await updateMutation.mutateAsync({ id: drawerState.data.id, data })
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
    { key: 'category', placeholder: 'Danh mục', options: VEHICLE_CATEGORIES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý loại phương tiện"
        description="Danh sách tất cả loại phương tiện vận chuyển"
        onAdd={handleAdd}
        addLabel="Thêm loại xe"
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
            category: filters.category,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã hoặc tên..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={vehicleTypes.length === 0}
        emptyMessage="Chưa có loại phương tiện nào"
        colSpan={7}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã loại</TableHead>
            <TableHead>Tên loại</TableHead>
            <TableHead>Danh mục</TableHead>
            <TableHead>Tải trọng tối đa</TableHead>
            <TableHead>Trọng lượng bì</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && vehicleTypes.length > 0 && (
          <TableBody>
            {vehicleTypes.map((vt) => (
              <TableRow key={vt.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="font-medium text-navy-900">{vt.vehicleTypeCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{vt.vehicleTypeName}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{getCategoryLabel(vt.category)}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">
                    {vt.maxPayloadKg ? `${formatNumber(vt.maxPayloadKg)} kg` : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-navy-600">
                    {vt.defaultTareWeightKg ? `${formatNumber(vt.defaultTareWeightKg)} kg` : '—'}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={vt.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(vt)}
                    onDeactivate={() => setDeactivateState({ isOpen: true, data: vt })}
                    onReactivate={() => reactivateMutation.mutate(vt.id)}
                    isActive={vt.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <VehicleTypeFormDrawer
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
        entityName={deactivateState.data?.vehicleTypeName}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  )
}
