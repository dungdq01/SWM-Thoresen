import { useState, useMemo } from 'react'
import { Modal, Button, SearchInput, Badge } from '@shared/ui'
import { Check, X } from 'lucide-react'
import { usePermissions, useAssignPermissionToRole, PERMISSION_EFFECT } from '@domains/auth'
import { cn } from '@shared/lib/cn'

export function AssignPermissionModal({ isOpen, onClose, role }) {
  const [search, setSearch] = useState('')
  const [changes, setChanges] = useState({})

  const { data: permissions = [], isLoading } = usePermissions()
  const assignPermission = useAssignPermissionToRole()

  const currentPermissions = useMemo(() => {
    const map = {}
    role?.permissions?.forEach((p) => {
      map[p.permission?.permissionCode] = p.effect || 'ALLOW'
    })
    return map
  }, [role])

  const filteredPermissions = useMemo(() => {
    if (!search) return permissions
    const lower = search.toLowerCase()
    return permissions.filter(
      (p) =>
        p.permissionCode?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    )
  }, [permissions, search])

  const groupedPermissions = useMemo(() => {
    const groups = {}
    filteredPermissions.forEach((p) => {
      const module = p.moduleCode || 'Khác'
      if (!groups[module]) groups[module] = []
      groups[module].push(p)
    })
    return groups
  }, [filteredPermissions])

  const getPermissionEffect = (permissionCode) => {
    if (changes[permissionCode] !== undefined) return changes[permissionCode]
    return currentPermissions[permissionCode] || null
  }

  const togglePermission = (permissionCode) => {
    const current = getPermissionEffect(permissionCode)
    if (current === 'ALLOW') {
      setChanges((prev) => ({ ...prev, [permissionCode]: 'DENY' }))
    } else if (current === 'DENY') {
      setChanges((prev) => ({ ...prev, [permissionCode]: null }))
    } else {
      setChanges((prev) => ({ ...prev, [permissionCode]: 'ALLOW' }))
    }
  }

  const handleSave = async () => {
    const changeList = Object.entries(changes)
      .filter(([, effect]) => effect !== undefined)
      .map(([permissionCode, effect]) => ({
        permissionCode,
        effect: effect || 'REMOVE',
      }))

    if (changeList.length === 0) {
      onClose()
      return
    }

    try {
      await assignPermission.mutateAsync({
        roleId: role.id,
        data: { changes: changeList },
      })
      setChanges({})
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phân quyền: ${role?.roleName || ''}`}
      description="Click để chuyển đổi: Không có → Cho phép → Từ chối → Không có"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || assignPermission.isPending}>
            {assignPermission.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Tìm theo mã hoặc mô tả quyền..."
        />

        <div className="max-h-[400px] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-navy-500">Đang tải...</div>
          ) : (
            Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="border border-navy-200 rounded-xl overflow-hidden">
                <div className="bg-navy-50 px-4 py-2 font-medium text-navy-700">
                  {module}
                </div>
                <div className="divide-y divide-navy-100">
                  {perms.map((p) => {
                    const effect = getPermissionEffect(p.permissionCode)
                    const isChanged = changes[p.permissionCode] !== undefined
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermission(p.permissionCode)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                          'hover:bg-navy-50',
                          isChanged && 'bg-primary-50'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">
                            {p.permissionCode}
                          </p>
                          {p.description && (
                            <p className="text-xs text-navy-500 truncate">{p.description}</p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {effect === 'ALLOW' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <Check className="w-3 h-3" /> Cho phép
                            </span>
                          )}
                          {effect === 'DENY' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <X className="w-3 h-3" /> Từ chối
                            </span>
                          )}
                          {!effect && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-100 text-navy-500">
                              Không có
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
