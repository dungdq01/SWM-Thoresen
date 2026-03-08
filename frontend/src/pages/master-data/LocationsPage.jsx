import { useState, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import {
  useLocationList,
  useLookupWarehouses,
  useLookupZones,
  PageHeader,
  FilterBar,
  StatusBadge,
  LocationStatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LOCATION_TYPES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'

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
        description="Danh sách các vị trí lưu trữ trong kho"
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
        colSpan={7}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã vị trí</TableHead>
            <TableHead>Kho / Zone</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Diện tích</TableHead>
            <TableHead>Sức chứa</TableHead>
            <TableHead align="center">Trạng thái vị trí</TableHead>
            <TableHead align="center">Hoạt động</TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && locations.length > 0 && (
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="font-medium text-navy-900">{loc.locationCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-navy-700">{loc.warehouse?.warehouseCode || '—'}</p>
                    <p className="text-navy-500">{loc.zone?.zoneCode || '—'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">
                    {LOCATION_TYPES.find((t) => t.value === loc.locationType)?.label || loc.locationType}
                  </Badge>
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
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>
    </div>
  )
}
