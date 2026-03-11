import { useState, useCallback } from 'react'
import { ArrowRightLeft, Plus, Edit2, Trash2 } from 'lucide-react'
import {
  useUomConversionList,
  useCreateUomConversion,
  useUpdateUomConversion,
  useDeleteUomConversion,
  useLookupUoms,
  PageHeader,
  FilterBar,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@domains/master-data'
import { Button, Modal, Select, Input } from '@shared/ui'

export function UomConversionsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
  })

  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null })

  const { data: response, isLoading } = useUomConversionList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
  })

  const { data: uoms = [] } = useLookupUoms()

  const createMutation = useCreateUomConversion()
  const updateMutation = useUpdateUomConversion()
  const deleteMutation = useDeleteUomConversion()

  const conversions = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, keyword: '', page: 1 }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setFormModal({ open: true, data: null })
  const handleEdit = (item) => setFormModal({ open: true, data: item })
  const closeFormModal = () => setFormModal({ open: false, data: null })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      fromUomId: formData.get('fromUomId'),
      toUomId: formData.get('toUomId'),
      conversionFactor: parseFloat(formData.get('conversionFactor')),
      description: formData.get('description'),
    }

    try {
      if (formModal.data?.id) {
        await updateMutation.mutateAsync({ id: formModal.data.id, data: { ...data, rowVersion: Number(formModal.data.rowVersion) } })
      } else {
        await createMutation.mutateAsync(data)
      }
      closeFormModal()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteModal.data.id)
      setDeleteModal({ open: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const uomOptions = uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))

  return (
    <div className="page-section">
      <PageHeader
        icon={ArrowRightLeft}
        title="Quy đổi đơn vị"
        description="Quản lý tỉ lệ quy đổi giữa các đơn vị tính"
        onAdd={handleAdd}
        addLabel="Thêm quy đổi"
      />

      <FilterBar
        keyword={filters.keyword}
        onKeywordChange={handleKeywordChange}
        filters={[]}
        onFilterChange={() => {}}
        onClearFilters={handleClearFilters}
        searchPlaceholder="Tìm theo UOM code, mô tả..."
      />

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={conversions.length === 0}
        emptyMessage="Chưa có quy đổi nào"
        pagination={{
          currentPage: meta.page,
          totalPages: meta.totalPages,
          total: meta.total,
          onPageChange: handlePageChange,
        }}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Từ UOM</TableHead>
            <TableHead align="center">→</TableHead>
            <TableHead>Đến UOM</TableHead>
            <TableHead align="right">Hệ số quy đổi</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead align="center" className="w-24">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversions.map((conv) => (
            <TableRow key={conv.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-navy-900 bg-navy-100 px-2 py-1 rounded">
                    {conv.fromUom?.uomCode}
                  </span>
                  <span className="text-xs text-navy-500">{conv.fromUom?.description}</span>
                </div>
              </TableCell>
              <TableCell align="center">
                <ArrowRightLeft className="h-4 w-4 text-navy-400" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-navy-900 bg-navy-100 px-2 py-1 rounded">
                    {conv.toUom?.uomCode}
                  </span>
                  <span className="text-xs text-navy-500">{conv.toUom?.description}</span>
                </div>
              </TableCell>
              <TableCell align="right">
                <span className="font-mono font-bold text-ice text-lg">{conv.conversionFactor}</span>
              </TableCell>
              <TableCell>
                <span className="text-navy-600">{conv.description}</span>
              </TableCell>
              <TableCell align="center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleEdit(conv)}
                    className="p-1.5 text-navy-400 hover:text-ice hover:bg-ice/10 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ open: true, data: conv })}
                    className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </MasterDataTableWrapper>

      <Modal
        isOpen={formModal.open}
        onClose={closeFormModal}
        title={formModal.data?.id ? 'Chỉnh sửa quy đổi' : 'Thêm quy đổi mới'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Từ UOM"
              name="fromUomId"
              required
              defaultValue={formModal.data?.fromUomId || ''}
              options={uomOptions}
              disabled={!!formModal.data?.id}
            />
            <Select
              label="Đến UOM"
              name="toUomId"
              required
              defaultValue={formModal.data?.toUomId || ''}
              options={uomOptions}
              disabled={!!formModal.data?.id}
            />
          </div>
          <Input
            label="Hệ số quy đổi"
            name="conversionFactor"
            type="number"
            step="any"
            required
            defaultValue={formModal.data?.conversionFactor || ''}
            placeholder="VD: 1000 (1 MT = 1000 KG)"
          />
          <Input
            label="Mô tả"
            name="description"
            defaultValue={formModal.data?.description || ''}
            placeholder="VD: 1 MT = 1000 KG"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
            <Button variant="outline" type="button" onClick={closeFormModal}>
              Hủy
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {formModal.data?.id ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-navy-700 mb-6">
          Bạn có chắc muốn xóa quy đổi <strong>"{deleteModal.data?.description}"</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, data: null })}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  )
}
