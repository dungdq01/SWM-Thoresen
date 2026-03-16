import { useState, useCallback } from 'react'
import { LayoutGrid, Edit2, Trash2, Sparkles } from 'lucide-react'
import {
  useLocationTypeList,
  useCreateLocationType,
  useUpdateLocationType,
  useDeleteLocationType,
  useLocationTypeNextCode,
  PageHeader,
  FilterBar,
  StatusBadge,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@domains/master-data'
import { Badge, Button, Input, Modal } from '@shared/ui'

const EMPTY_FORM = { locationTypeCode: '', locationTypeName: '', description: '', isDefault: false, isActive: true }

export function LocationTypesPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '' })
  const [modalState, setModalState] = useState({ isOpen: false, data: null })
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: response, isLoading, refetch } = useLocationTypeList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
  })
  const createMutation = useCreateLocationType()
  const updateMutation = useUpdateLocationType()
  const deleteMutation = useDeleteLocationType()

  const isEdit = !!modalState.data
  const { data: ltNextCodeResponse } = useLocationTypeNextCode(modalState.isOpen && !isEdit)
  const ltNextCode = ltNextCodeResponse?.data?.code || ''

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handlePageChange = useCallback((page) => setFilters((prev) => ({ ...prev, page })), [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setModalState({ isOpen: true, data: null })
  }

  const openEdit = (row) => {
    setForm({
      locationTypeCode: row.locationTypeCode,
      locationTypeName: row.locationTypeName,
      description: row.description || '',
      isDefault: row.isDefault || false,
      isActive: row.isActive,
    })
    setModalState({ isOpen: true, data: row })
  }

  const handleClose = () => setModalState({ isOpen: false, data: null })

  const handleSave = async () => {
    try {
      if (modalState.data) {
        await updateMutation.mutateAsync({
          id: modalState.data.id,
          data: { locationTypeName: form.locationTypeName, description: form.description, isDefault: form.isDefault, isActive: form.isActive, rowVersion: modalState.data.rowVersion },
        })
      } else {
        await createMutation.mutateAsync({ ...form, locationTypeCode: ltNextCode })
      }
      handleClose()
    } catch (error) {}
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa loại vị trí "${row.locationTypeCode}"?`)) return
    try { await deleteMutation.mutateAsync(row.id) } catch (error) {}
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6">
      <PageHeader
        title="Loại vị trí"
        description="Cấu hình các loại vị trí kho (storage, receiving, staging...)"
        onAdd={openAdd}
        addLabel="Thêm"
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
          placeholder="Tìm loại vị trí..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có loại vị trí nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="loại vị trí"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead align="center">Mặc định</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-20">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{row.locationTypeCode}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{row.locationTypeName}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{row.description || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  {row.isDefault ? <Badge variant="primary">Có</Badge> : <span className="text-navy-300">—</span>}
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={row.isActive} />
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        title={isEdit ? `Chỉnh sửa: ${modalState.data?.locationTypeCode}` : 'Thêm loại vị trí'}
        description={isEdit ? 'Cập nhật thông tin loại vị trí' : 'Nhập mã và tên loại vị trí mới'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Tạo mới'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-700">
              Mã loại vị trí {!isEdit && <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
            </label>
            {isEdit ? (
              <Input value={modalState.data?.locationTypeCode || ''} disabled className="uppercase bg-navy-50" />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-moon-300 bg-navy-50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-ice shrink-0" />
                <span className="font-mono font-semibold text-navy-900">{ltNextCode || '...'}</span>
              </div>
            )}
          </div>
          <Input
            label="Tên loại vị trí"
            required
            placeholder="VD: Lưu trữ"
            value={form.locationTypeName}
            onChange={(e) => setForm((prev) => ({ ...prev, locationTypeName: e.target.value }))}
          />
          <Input
            label="Mô tả"
            placeholder="Mô tả ngắn về loại vị trí..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="flex items-center justify-between rounded-lg border border-moon-200 px-4 py-3">
            <span className="text-sm font-medium text-navy-700">Đặt làm mặc định</span>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isDefault ? 'bg-blue-500' : 'bg-moon-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${form.isDefault ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-moon-200 px-4 py-3">
              <span className="text-sm font-medium text-navy-700">Trạng thái</span>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-moon-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
