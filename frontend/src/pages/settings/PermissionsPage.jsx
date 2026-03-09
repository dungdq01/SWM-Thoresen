import { useState, useMemo } from 'react'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'
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
  Modal,
  Input,
} from '@shared/ui'
import { usePermissions, useCreatePermission, useUpdatePermission, useDeletePermission } from '@domains/auth'
import { SettingsLayout } from './components/SettingsLayout'

export function PermissionsPage() {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [draft, setDraft] = useState({ permissionCode: '', description: '', moduleCode: '', resourceCode: '', actionCode: '' })
  const [editDraft, setEditDraft] = useState({ description: '', resourceCode: '', actionCode: '' })
  const [errors, setErrors] = useState({})

  const { data: permissions = [], isLoading } = usePermissions()
  const createPermission = useCreatePermission()
  const updatePermission = useUpdatePermission()
  const deletePermission = useDeletePermission()

  const modules = useMemo(() => {
    const set = new Set(permissions.map((p) => p.moduleCode).filter(Boolean))
    return Array.from(set).map((m) => ({ value: m, label: m }))
  }, [permissions])

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        !search ||
        p.permissionCode?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      const matchesModule = !moduleFilter || p.moduleCode === moduleFilter
      return matchesSearch && matchesModule
    })
  }, [permissions, search, moduleFilter])

  const groupedPermissions = useMemo(() => {
    const groups = {}
    filteredPermissions.forEach((p) => {
      const module = p.moduleCode || 'Other'
      if (!groups[module]) groups[module] = []
      groups[module].push(p)
    })
    return groups
  }, [filteredPermissions])

  const validateCreate = () => {
    const e = {}
    if (!draft.permissionCode) e.permissionCode = 'Permission code là bắt buộc'
    if (!draft.moduleCode) e.moduleCode = 'Module là bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validateCreate()) return
    await createPermission.mutateAsync(draft)
    setDraft({ permissionCode: '', description: '', moduleCode: '', resourceCode: '', actionCode: '' })
    setErrors({})
    setCreateOpen(false)
  }

  const handleOpenEdit = (p) => {
    setEditData(p)
    setEditDraft({ description: p.description || '', resourceCode: p.resourceCode || '', actionCode: p.actionCode || '' })
  }

  const handleUpdate = async () => {
    await updatePermission.mutateAsync({ id: editData.id, data: editDraft })
    setEditData(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quyền này?')) {
      await deletePermission.mutateAsync(id)
    }
  }

  return (
    <SettingsLayout
      title="Permissions Catalog"
      description="Xem danh sách các quyền có trong hệ thống. Quyền được gán cho vai trò để kiểm soát truy cập."
      actions={
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setCreateOpen(true)}>
          Create Permission
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search by permission code or description..."
            className="flex-1 max-w-md"
          />
          <Select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            options={[{ value: '', label: 'All modules' }, ...modules]}
            className="w-48"
          />
        </div>

        <div className="text-sm text-navy-600">
          Total: <span className="font-semibold">{filteredPermissions.length}</span> permissions
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-navy-500">Loading...</div>
        ) : Object.keys(groupedPermissions).length === 0 ? (
          <div className="py-12 text-center text-navy-500">No matching permissions found</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="border border-navy-200 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 px-4 py-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <span className="font-semibold text-navy-900">{module}</span>
                  <Badge variant="primary" size="sm">{perms.length}</Badge>
                </div>
                <Table className="border-0 rounded-none">
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead className="w-1/4">Permission Code</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((p) => {
                      const parts = p.permissionCode?.split('.') || []
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <code className="text-sm bg-navy-100 px-2 py-1 rounded font-mono" title={p.permissionCode}>
                              {p.permissionCode.split('.').slice(1).join('.') || p.permissionCode}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-navy-600">{p.resourceCode || parts[1] || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" size="sm">{p.actionCode || parts[2] || '—'}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-navy-600 line-clamp-1">{p.description || p.permissionName || '—'}</span>
                          </TableCell>
                          <TableCell align="right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-primary/5 hover:text-primary"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-danger/5 hover:text-danger"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo quyền mới"
        description="Thêm một quyền mới vào hệ thống"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={createPermission.isPending}>
              {createPermission.isPending ? 'Đang xử lý...' : 'Tạo mới'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Input label="Permission Code" placeholder="VD: inventory.item.create" value={draft.permissionCode} onChange={(e) => setDraft((prev) => ({ ...prev, permissionCode: e.target.value }))} required />
            {errors.permissionCode && <p className="text-xs text-danger mt-1">{errors.permissionCode}</p>}
          </div>
          <div>
            <Input label="Module Code" placeholder="VD: INVENTORY" value={draft.moduleCode} onChange={(e) => setDraft((prev) => ({ ...prev, moduleCode: e.target.value }))} required />
            {errors.moduleCode && <p className="text-xs text-danger mt-1">{errors.moduleCode}</p>}
          </div>
          <Input label="Resource Code" placeholder="VD: item" value={draft.resourceCode} onChange={(e) => setDraft((prev) => ({ ...prev, resourceCode: e.target.value }))} />
          <Input label="Action Code" placeholder="VD: create" value={draft.actionCode} onChange={(e) => setDraft((prev) => ({ ...prev, actionCode: e.target.value }))} />
          <Input label="Mô tả" placeholder="Mô tả quyền..." value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        isOpen={!!editData}
        onClose={() => setEditData(null)}
        title="Chỉnh sửa quyền"
        description={editData ? `Cập nhật thông tin cho: ${editData.permissionCode}` : ''}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditData(null)}>Hủy</Button>
            <Button onClick={handleUpdate} disabled={updatePermission.isPending}>
              {updatePermission.isPending ? 'Đang xử lý...' : 'Cập nhật'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-navy-700 mb-1">Permission Code</p>
            <div className="wrs-input bg-moon-50 text-navy-500 cursor-not-allowed">{editData?.permissionCode}</div>
            <p className="text-xs text-navy-400 mt-1">Permission code không thể thay đổi</p>
          </div>
          <Input label="Resource Code" placeholder="VD: item" value={editDraft.resourceCode} onChange={(e) => setEditDraft((prev) => ({ ...prev, resourceCode: e.target.value }))} />
          <Input label="Action Code" placeholder="VD: create" value={editDraft.actionCode} onChange={(e) => setEditDraft((prev) => ({ ...prev, actionCode: e.target.value }))} />
          <Input label="Mô tả" placeholder="Mô tả quyền..." value={editDraft.description} onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
      </Modal>
    </SettingsLayout>
  )
}
