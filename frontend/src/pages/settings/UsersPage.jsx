import { useState } from 'react'
import { Plus, Edit2, KeyRound, ToggleLeft, ToggleRight, Shield, UserCheck, UserX } from 'lucide-react'
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
import { SettingsLayout } from './components/SettingsLayout'
import { useAuth } from '@domains/auth'
import { UserFormModal, ResetPasswordModal } from '@features/settings'
import { useUsers, useToggleUserActive } from '@domains/auth/hooks/useUsers'

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  WH_MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
  WH_KEEPER: 'bg-green-100 text-green-700 border-green-200',
  WB_OPERATOR: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  OPS_SUPER: 'bg-purple-100 text-purple-700 border-purple-200',
  BILLING_OFC: 'bg-pink-100 text-pink-700 border-pink-200',
  GOVERNANCE_MANAGER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  CUST_VIEWER: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [resetPwModal, setResetPwModal] = useState({ open: false, user: null })
  const { hasPermission } = useAuth()

  const { data, isLoading } = useUsers({ search })
  const toggleActive = useToggleUserActive()
  const users = data?.items ?? []

  const canCreate = hasPermission('foundation.users.create')
  const canUpdate = hasPermission('foundation.users.update')
  const canResetPw = hasPermission('foundation.users.reset_password')

  return (
    <SettingsLayout
      title="Quản lý tài khoản"
      description="Tạo, chỉnh sửa và quản lý tài khoản người dùng. Gán vai trò và kho cho từng tài khoản."
      actions={
        canCreate && (
          <Button icon={<Plus className="w-5 h-5" />} onClick={() => setFormModal({ open: true, data: null })}>
            Tạo tài khoản
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Tìm theo tên, username, email..."
          className="max-w-md"
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Username</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Lần đăng nhập cuối</TableHead>
              <TableHead align="right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading colSpan={7} />
            ) : users.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={search ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản nào'}
              />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold">{user.username}</span>
                  </TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {user.email || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.length > 0 ? user.roles.map((r) => (
                        <span
                          key={r.roleCode}
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r.roleCode] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                        >
                          {r.roleName || r.roleCode}
                        </span>
                      )) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Chưa gán</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        <UserCheck className="w-3 h-3" /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                        <UserX className="w-3 h-3" /> Vô hiệu
                      </span>
                    )}
                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                      <span className="ml-1 inline-flex items-center rounded-lg bg-orange-100 border border-orange-200 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Đang khóa
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString('vi-VN')
                        : 'Chưa đăng nhập'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 className="w-4 h-4" />}
                            onClick={() => setFormModal({ open: true, data: user })}
                            title="Chỉnh sửa"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={user.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-red-500" />}
                            onClick={() => toggleActive.mutate(user.id)}
                            title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          />
                        </>
                      )}
                      {canResetPw && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<KeyRound className="w-4 h-4 text-orange-500" />}
                          onClick={() => setResetPwModal({ open: true, user })}
                          title="Đặt lại mật khẩu"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data?.total > 0 && (
          <div className="text-xs text-right" style={{ color: 'var(--color-text-muted)' }}>
            Hiển thị {users.length} / {data.total} tài khoản
          </div>
        )}
      </div>

      {formModal.open && (
        <UserFormModal
          data={formModal.data}
          onClose={() => setFormModal({ open: false, data: null })}
        />
      )}

      {resetPwModal.open && (
        <ResetPasswordModal
          user={resetPwModal.user}
          onClose={() => setResetPwModal({ open: false, user: null })}
        />
      )}
    </SettingsLayout>
  )
}
