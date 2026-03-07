import { useState, useCallback } from 'react'
import { Truck } from 'lucide-react'
import {
  useVehicleTypeList,
  PageHeader,
  FilterBar,
  StatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  VEHICLE_CATEGORIES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'

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

  const { data: response, isLoading, refetch } = useVehicleTypeList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    category: filters.category || undefined,
  })

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

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'category', placeholder: 'Loại', options: VEHICLE_CATEGORIES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý loại phương tiện"
        description="Danh sách các loại phương tiện vận chuyển"
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
          placeholder="Tìm theo mã hoặc tên loại phương tiện..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={vehicleTypes.length === 0}
        emptyMessage="Chưa có loại phương tiện nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã loại</TableHead>
            <TableHead>Tên loại</TableHead>
            <TableHead>Phân loại</TableHead>
            <TableHead>Tải trọng tối đa</TableHead>
            <TableHead>Tare Weight</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>
    </div>
  )
}
