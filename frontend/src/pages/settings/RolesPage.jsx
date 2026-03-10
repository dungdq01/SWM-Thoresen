import { useState } from 'react'
import { Plus, Edit2, Shield } from 'lucide-react'
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
      title="Role Management"
      description="Tạo và quản lý các vai trò trong hệ thống. Mỗi vai trò có thể được gán các quyền khác nhau."
      actions={
        <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Create Role
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search by role code or name..."
          className="max-w-md"
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Role Code</TableHead>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading colSpan={6} />
            ) : filteredRoles.length === 0 ? (
              <TableEmpty
                colSpan={6}
                message={search ? 'No matching roles found' : 'No roles available'}
              />
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <span className="inline-flex items-center rounded-xl border border-moon-200 bg-moon-50 px-2.5 py-1 font-mono text-sm font-semibold text-navy-900">
                      {role.roleCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-navy-800">{role.roleName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-1 text-sm text-navy-400">{role.description || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ice-dark">
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-ice-dark"
                        title="Assign Permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(role)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-navy-900"
                        title="Edit"
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
