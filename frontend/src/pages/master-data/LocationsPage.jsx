import { useState, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import {
  useLocationList,
  useCreateLocation,
  useUpdateLocation,
  useDeactivateLocation,
  useReactivateLocation,
  useLookupWarehouses,
  useLookupZones,
  PageHeader,
  FilterBar,
  StatusBadge,
  LocationStatusBadge,
  LocationTypeBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LOCATION_TYPES,
} from '@domains/master-data'
import { LocationFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}

export function LocationsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    warehouseId: '',
    zoneId: '',
    locationType: '',
  })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: zones = [] } = useLookupZones(filters.warehouseId)

  const { data: response, isLoading, refetch } = useLocationList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    warehouseId: filters.warehouseId || undefined,
    zoneId: filters.zoneId || undefined,
    locationType: filters.locationType || undefined,
  })

  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deactivateMutation = useDeactivateLocation()
  const reactivateMutation = useReactivateLocation()

  const locations = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))
  const zoneOptions = zones.map((z) => ({ value: z.id, label: z.name }))

  const handleKeywordChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  const handleFilterChange = useCallback((key, value) => {
    if (key === 'warehouseId') {
      setFilters((prev) => ({ ...prev, warehouseId: value, zoneId: '', page: 1 }))
    } else {
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      keyword: '',
      isActive: '',
      warehouseId: '',
      zoneId: '',
      locationType: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'warehouseId', placeholder: 'Kho', options: warehouseOptions },
    { key: 'zoneId', placeholder: 'Zone', options: zoneOptions },
    { key: 'locationType', placeholder: 'Loại vị trí', options: LOCATION_TYPES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý vị trí"
        description="Danh sách tất cả vị trí lưu kho trong các kho"
        onAdd={() => setDrawerState({ isOpen: true, data: null })}
        addLabel="Thêm vị trí"
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
            warehouseId: filters.warehouseId,
            zoneId: filters.zoneId,
            locationType: filters.locationType,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã vị trí..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={locations.length === 0}
        emptyMessage="Chưa có vị trí nào"
        colSpan={8}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã vị trí</TableHead>
            <TableHead>Kho / Zone</TableHead>
            <TableHead align="center">Loại</TableHead>
            <TableHead>Diện tích</TableHead>
            <TableHead>Sức chứa</TableHead>
            <TableHead align="center">Trạng thái vị trí</TableHead>
            <TableHead align="center">Hoạt động</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && locations.length > 0 && (
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id} onClick={() => setDrawerState({ isOpen: true, data: loc })}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{loc.locationCode}</span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-navy-700">{loc.warehouse?.warehouseCode || '—'}</p>
                    <p className="text-navy-500">{loc.zone?.zoneCode || '—'}</p>
                  </div>
                </TableCell>
                <TableCell align="center">
                  <LocationTypeBadge type={loc.locationType} />
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">
                    {loc.areaM2 ? `${formatNumber(loc.areaM2)} m²` : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">
                    {loc.stackLimitKg ? `${formatNumber(loc.stackLimitKg)} kg` : '—'}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <LocationStatusBadge status={loc.status} />
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={loc.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => setDrawerState({ isOpen: true, data: loc })}
                    onDeactivate={() => setDeactivateState({ isOpen: true, data: loc })}
                    onReactivate={() => setReactivateState({ isOpen: true, data: loc })}
                    isActive={loc.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <LocationFormDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState({ isOpen: false, data: null })}
        onSubmit={async (data) => {
          if (drawerState.data) {
            // Remove immutable fields (locationCode, warehouseId, zoneId) and add rowVersion for optimistic locking
            const { locationCode, warehouseId, zoneId, ...updateFields } = data
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
          setDrawerState({ isOpen: false, data: null })
        }}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeactivateModal
        isOpen={deactivateState.isOpen}
        onClose={() => setDeactivateState({ isOpen: false, data: null })}
        onConfirm={async (reason) => {
          await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
          setDeactivateState({ isOpen: false, data: null })
        }}
        entityName={deactivateState.data?.locationCode}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={async () => {
          await reactivateMutation.mutateAsync(reactivateState.data.id)
          setReactivateState({ isOpen: false, data: null })
        }}
        entityName={reactivateState.data?.locationCode}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
