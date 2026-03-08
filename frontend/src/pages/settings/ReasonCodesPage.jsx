import { useState, useMemo } from 'react'
import { Plus, Edit2, Power, AlertCircle, CheckCircle, FileText, CreditCard } from 'lucide-react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  SearchInput,
  Select,
  Badge,
} from '@shared/ui'
import { useReasonCodes, useDeactivateReasonCode, ActiveStatusBadge, REASON_CODE_CATEGORIES } from '@domains/auth'
import { ReasonCodeFormModal } from '@features/settings'
import { SettingsLayout } from './components/SettingsLayout'

export function ReasonCodesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })

  const { data: reasonCodes = [], isLoading } = useReasonCodes()
  const deactivate = useDeactivateReasonCode()

  const filteredCodes = useMemo(() => {
    return reasonCodes.filter((rc) => {
      const matchesSearch =
        !search ||
        rc.code?.toLowerCase().includes(search.toLowerCase()) ||
        rc.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !categoryFilter || rc.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [reasonCodes, search, categoryFilter])

  const openCreateModal = () => setFormModal({ open: true, data: null })
  const openEditModal = (code) => setFormModal({ open: true, data: code })
  const closeFormModal = () => setFormModal({ open: false, data: null })

  const handleDeactivate = async (id) => {
    if (window.confirm('Bạn có chắc muốn vô hiệu hóa mã lý do này?')) {
      await deactivate.mutateAsync(id)
    }
  }

  const getCategoryLabel = (category) => {
    return REASON_CODE_CATEGORIES.find((c) => c.value === category)?.label || category
  }

  return (
    <SettingsLayout
      title="Quản lý mã lý do"
      description="Danh sách các mã lý do dùng khi thực hiện điều chỉnh, sửa đổi trong hệ thống."
      actions={
        <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Tạo mã lý do
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Tìm theo mã hoặc mô tả..."
            className="flex-1 max-w-md"
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[{ value: '', label: 'Tất cả danh mục' }, ...REASON_CODE_CATEGORIES]}
            className="w-48"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Yêu cầu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading colSpan={7} />
            ) : filteredCodes.length === 0 ? (
              <TableEmpty colSpan={7} message={search ? 'Không tìm thấy mã lý do phù hợp' : 'Chưa có mã lý do nào'} />
            ) : (
              filteredCodes.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>
                    <code className="text-sm bg-navy-100 px-2 py-1 rounded font-mono">
                      {rc.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-navy-700 line-clamp-1">{rc.description}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" size="sm">{getCategoryLabel(rc.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-navy-600">{rc.domainCode}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rc.requiresApproval && (
                        <span title="Yêu cầu phê duyệt" className="text-amber-500">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      )}
                      {rc.requiresNote && (
                        <span title="Yêu cầu ghi chú" className="text-blue-500">
                          <FileText className="w-4 h-4" />
                        </span>
                      )}
                      {rc.affectsBilling && (
                        <span title="Ảnh hưởng thanh toán" className="text-purple-500">
                          <CreditCard className="w-4 h-4" />
                        </span>
                      )}
                      {!rc.requiresApproval && !rc.requiresNote && !rc.affectsBilling && '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={rc.isActive} />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(rc)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-navy-900"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {rc.isActive && (
                        <button
                          onClick={() => handleDeactivate(rc.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-danger/5 hover:text-danger"
                          title="Vô hiệu hóa"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReasonCodeFormModal
        isOpen={formModal.open}
        onClose={closeFormModal}
        editData={formModal.data}
      />
    </SettingsLayout>
  )
}
