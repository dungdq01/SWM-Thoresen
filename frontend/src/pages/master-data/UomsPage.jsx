import { useState, useCallback } from 'react'
import { Scale } from 'lucide-react'
import {
  useUomList,
  PageHeader,
  FilterBar,
  StatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  UOM_CLASSES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const getUomClassLabel = (uomClass) => {
  const found = UOM_CLASSES.find((c) => c.value === uomClass)
  return found?.label || uomClass
}

export function UomsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    uomClass: '',
  })

  const { data: response, isLoading, refetch } = useUomList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    uomClass: filters.uomClass || undefined,
  })

  const uoms = response?.data || []
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
      uomClass: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'uomClass', placeholder: 'Loại đơn vị', options: UOM_CLASSES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý đơn vị tính"
        description="Danh sách các đơn vị tính trong hệ thống"
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
            uomClass: filters.uomClass,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã hoặc mô tả..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={uoms.length === 0}
        emptyMessage="Chưa có đơn vị tính nào"
        colSpan={5}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã đơn vị</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead align="center">Đơn vị cơ sở</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && uoms.length > 0 && (
          <TableBody>
            {uoms.map((uom) => (
              <TableRow key={uom.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-medium text-navy-900">{uom.uomCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">{uom.description || '—'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{getUomClassLabel(uom.uomClass)}</Badge>
                </TableCell>
                <TableCell align="center">
                  {uom.isBaseUom ? (
                    <Badge variant="success">Có</Badge>
                  ) : (
                    <span className="text-navy-400">—</span>
                  )}
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={uom.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>
    </div>
  )
}
