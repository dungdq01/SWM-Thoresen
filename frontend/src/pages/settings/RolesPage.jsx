import { useState } from 'react'
import { Plus, Edit2, Shield, Search } from 'lucide-react'
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
  EmptyState,
} from '@shared/ui'
import { useRoles, ActiveStatusBadge } from '@domains/auth'
import { RoleFormModal, AssignPermissionModal } from '@features/settings'
import { SettingsLayout } from './components/SettingsLayout'

export function RolesPage() {
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [permModal, setPermModal] = useState({ open: false, role: null })

  const { data: roles = [], isLoading } = useRoles()

  const filteredRoles = roles.filter(
    (role) =>
      role.roleCode?.toLowerCase().includes(search.toLowerCase()) ||
      role.roleName?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => setFormModal({ open: true, data: null })
  const openEditModal = (role) => setFormModal({ open: true, data: role })
  const closeFormModal = () => setFormModal({ open: false, data: null })

  const openPermModal = (role) => setPermModal({ open: true, role })
  const closePermModal = () => setPermModal({ open: false, role: null })

  return (
    <SettingsLayout
      title="Quản lý vai trò"
      description="Tạo và quản lý các vai trò trong hệ thống. Mỗi vai trò có thể được gán các quyền khác nhau."
      actions={
        <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Tạo vai trò
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Tìm theo mã hoặc tên vai trò..."
          className="max-w-md"
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã vai trò</TableHead>
              <TableHead>Tên vai trò</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số quyền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading colSpan={6} />
            ) : filteredRoles.length === 0 ? (
              <TableEmpty
                colSpan={6}
                message={search ? 'Không tìm thấy vai trò phù hợp' : 'Chưa có vai trò nào'}
              />
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <span className="font-mono text-sm bg-navy-100 px-2 py-1 rounded">
                      {role.roleCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-navy-900">{role.roleName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-navy-600 line-clamp-1">{role.description || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-primary-600">
                      <Shield className="w-4 h-4" />
                      {role.permissions?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={role.isActive} />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPermModal(role)}
                        className="p-2 text-navy-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Phân quyền"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(role)}
                        className="p-2 text-navy-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleFormModal
        isOpen={formModal.open}
        onClose={closeFormModal}
        editData={formModal.data}
      />

      <AssignPermissionModal
        isOpen={permModal.open}
        onClose={closePermModal}
        role={permModal.role}
      />
    </SettingsLayout>
  )
}
