import { useState, useCallback } from 'react'
import { ArrowRightLeft, Edit2, Trash2 } from 'lucide-react'
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
import { UomConversionFormDrawer } from '@features/master-data'
import { Button, Modal } from '@shared/ui'

export function UomConversionsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
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

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (item) => setDrawerState({ isOpen: true, data: item })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data?.id) {
        await updateMutation.mutateAsync({ id: drawerState.data.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
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
    <div className="p-6">
      <PageHeader
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
        placeholder="Tìm theo UOM code, mô tả..."
      />

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={conversions.length === 0}
        emptyMessage="Chưa có quy đổi nào"
        colSpan={5}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Từ UOM</TableHead>
            <TableHead align="center"></TableHead>
            <TableHead>Đến UOM</TableHead>
            <TableHead align="right">Hệ số quy đổi</TableHead>
            <TableHead align="center" className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversions.map((conv) => (
            <TableRow key={conv.id} onClick={() => handleEdit(conv)}>
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
              <TableCell align="center">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(conv) }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-ice/15 hover:text-ice-dark"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, data: conv }) }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Xóa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </MasterDataTableWrapper>

      <UomConversionFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
        uomOptions={uomOptions}
      />

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-sm text-navy-700 mb-6">
          Bạn có chắc muốn xóa quy đổi{' '}
          <strong className="text-navy-900">
            {deleteModal.data?.fromUom?.uomCode} → {deleteModal.data?.toUom?.uomCode}
          </strong>
          ?
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
