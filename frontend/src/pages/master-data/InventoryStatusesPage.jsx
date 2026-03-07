import { useState, useCallback } from 'react'
import { Tags } from 'lucide-react'
import {
  useInventoryStatusList,
  PageHeader,
  FilterBar,
  InventoryStatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@domains/master-data'
import { Badge } from '@shared/ui'

export function InventoryStatusesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
  })

  const { data: response, isLoading, refetch } = useInventoryStatusList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
  })

  const statuses = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  return (
    <div className="p-6">
      <PageHeader
        title="Trạng thái tồn kho"
        description="Danh sách các trạng thái tồn kho trong hệ thống (không thể thêm mới)"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={[]}
          filterValues={{}}
          onFilterChange={() => {}}
          onClearFilters={() => setFilters((prev) => ({ ...prev, keyword: '', page: 1 }))}
          placeholder="Tìm theo mã hoặc mô tả..."
        />
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Lưu ý:</strong> Trạng thái tồn kho là dữ liệu hệ thống và không thể tạo mới. 
          Chỉ có thể cập nhật mô tả cho các trạng thái không bị khóa hệ thống.
        </p>
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={statuses.length === 0}
        emptyMessage="Chưa có trạng thái tồn kho nào"
        colSpan={5}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã trạng thái</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead align="center">Có thể phân bổ</TableHead>
            <TableHead align="center">Khóa hệ thống</TableHead>
            <TableHead align="center">Badge</TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && statuses.length > 0 && (
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Tags className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="font-medium text-navy-900">{status.statusCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-navy-700">{status.description || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  {status.isAllocatable ? (
                    <Badge variant="success">Có</Badge>
                  ) : (
                    <Badge variant="neutral">Không</Badge>
                  )}
                </TableCell>
                <TableCell align="center">
                  {status.isSystemLocked ? (
                    <Badge variant="warning">Đã khóa</Badge>
                  ) : (
                    <span className="text-navy-400">—</span>
                  )}
                </TableCell>
                <TableCell align="center">
                  <InventoryStatusBadge 
                    statusCode={status.statusCode} 
                    isAllocatable={status.isAllocatable} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>
    </div>
  )
}
