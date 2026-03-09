import { useState, useCallback } from 'react'
import { Grid3X3 } from 'lucide-react'
import {
  useZoneList,
  useCreateZone,
  useUpdateZone,
  useDeactivateZone,
  useReactivateZone,
  useLookupWarehouses,
  PageHeader,
  FilterBar,
  StatusBadge,
  ZoneTypeBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ZONE_TYPES,
} from '@domains/master-data'
import { ZoneFormDrawer } from '@features/master-data'
import { Badge } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}

export function ZonesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    warehouseId: '',
    zoneType: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: warehouses = [] } = useLookupWarehouses()

  const { data: response, isLoading, refetch } = useZoneList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    warehouseId: filters.warehouseId || undefined,
    zoneType: filters.zoneType || undefined,
  })

  const createMutation = useCreateZone()
  const updateMutation = useUpdateZone()
  const deactivateMutation = useDeactivateZone()
  const reactivateMutation = useReactivateZone()

  const zones = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))

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
      warehouseId: '',
      zoneType: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleDeactivate = (zone) => setDeactivateState({ isOpen: true, data: zone })
  const handleReactivate = (zone) => setReactivateState({ isOpen: true, data: zone })

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

  const filterConfig = [
    { key: 'isActive', placeholder: 'Status', options: STATUS_OPTIONS },
    { key: 'warehouseId', placeholder: 'Warehouse', options: warehouseOptions },
    { key: 'zoneType', placeholder: 'Zone Type', options: ZONE_TYPES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Zone Management"
        description="List of all zones in the warehouses"
        onAdd={() => setDrawerState({ isOpen: true, data: null })}
        addLabel="Add Zone"
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
            zoneType: filters.zoneType,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Search by code or name..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={zones.length === 0}
        emptyMessage="No zones available"
        colSpan={7}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Zone Code</TableHead>
            <TableHead>Zone Name</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && zones.length > 0 && (
          <TableBody>
            {zones.map((zone) => (
              <TableRow key={zone.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Grid3X3 className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="font-medium text-navy-900">{zone.zoneCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{zone.zoneName}</p>
                    {zone.isBillingZone && (
                      <Badge variant="success" className="mt-1">Billing Zone</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-navy-600">{zone.warehouse?.warehouseCode || '—'}</span>
                </TableCell>
                <TableCell>
                  <ZoneTypeBadge type={zone.zoneType} />
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">
                    {zone.maxCapacityMt ? `${formatNumber(zone.maxCapacityMt)} MT` : '—'}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={zone.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => setDrawerState({ isOpen: true, data: zone })}
                    onDeactivate={() => handleDeactivate(zone)}
                    onReactivate={() => handleReactivate(zone)}
                    isActive={zone.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <ZoneFormDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState({ isOpen: false, data: null })}
        onSubmit={async (data) => {
          if (drawerState.data) {
            await updateMutation.mutateAsync({ id: drawerState.data.id, data })
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
        onConfirm={handleConfirmDeactivate}
        entityName={deactivateState.data?.zoneName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.zoneName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
