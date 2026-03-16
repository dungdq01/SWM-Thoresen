import { useState, useCallback } from 'react'
import { Tags, Edit2 } from 'lucide-react'
import {
  useInventoryStatusList,
  useUpdateInventoryStatus,
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
import { Badge, Button, Input, Modal } from '@shared/ui'

export function InventoryStatusesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
  })

  const [editState, setEditState] = useState({ isOpen: false, data: null })
  const [editDesc, setEditDesc] = useState('')

  const { data: response, isLoading, refetch } = useInventoryStatusList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
  })
  const updateMutation = useUpdateInventoryStatus()

  const statuses = response?.data || []

  const openEdit = (status) => {
    setEditDesc(status.description || '')
    setEditState({ isOpen: true, data: status })
  }

  const handleSaveDesc = async () => {
    if (editState.data) {
      await updateMutation.mutateAsync({ id: editState.data.id, data: { description: editDesc, rowVersion: editState.data.rowVersion } })
      setEditState({ isOpen: false, data: null })
    }
  }
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
        description="Danh sách trạng thái tồn kho trong hệ thống (không thể thêm mới)"
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

      <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-subtle)', borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Lưu ý:</span> Trạng thái tồn kho là dữ liệu hệ thống, không thể tạo mới.
          Chỉ có thể cập nhật mô tả cho các trạng thái chưa bị khóa hệ thống.
        </p>
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={statuses.length === 0}
        emptyMessage="Chưa có trạng thái tồn kho nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã trạng thái</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead align="center">Cho phép xuất</TableHead>
            <TableHead align="center">Khóa hệ thống</TableHead>
            <TableHead align="center">Nhãn</TableHead>
            <TableHead align="center" className="w-16">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && statuses.length > 0 && (
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{status.statusCode}</span>
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
                <TableCell align="center">
                  {!status.isSystemLocked && (
                    <button
                      onClick={() => openEdit(status)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-muted"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Chỉnh sửa mô tả"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <Modal
        isOpen={editState.isOpen}
        onClose={() => setEditState({ isOpen: false, data: null })}
        title={`Chỉnh sửa: ${editState.data?.statusCode || ''}`}
        description="Cập nhật mô tả cho trạng thái tồn kho"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditState({ isOpen: false, data: null })}>Hủy</Button>
            <Button onClick={handleSaveDesc} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </>
        }
      >
        <Input
          label="Mô tả"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Nhập mô tả..."
        />
      </Modal>
    </div>
  )
}
