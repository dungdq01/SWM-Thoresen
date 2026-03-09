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
        title="Inventory Status"
        description="List of all inventory statuses in the system (cannot add new)"
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
          placeholder="Search by code or description..."
        />
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Inventory statuses are system data and cannot be created. 
          You can only update descriptions for statuses that are not system locked.
        </p>
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={statuses.length === 0}
        emptyMessage="No inventory statuses available"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Status Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead align="center">Allocatable</TableHead>
            <TableHead align="center">System Locked</TableHead>
            <TableHead align="center">Badge</TableHead>
            <TableHead align="center" className="w-16">Actions</TableHead>
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
                    <Badge variant="success">Yes</Badge>
                  ) : (
                    <Badge variant="neutral">No</Badge>
                  )}
                </TableCell>
                <TableCell align="center">
                  {status.isSystemLocked ? (
                    <Badge variant="warning">Locked</Badge>
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-navy-900"
                      title="Edit description"
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
