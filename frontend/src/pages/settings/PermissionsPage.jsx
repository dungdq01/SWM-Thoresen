import { useState, useMemo } from 'react'
import { Shield, Filter } from 'lucide-react'
import {
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
import { usePermissions } from '@domains/auth'
import { SettingsLayout } from './components/SettingsLayout'

export function PermissionsPage() {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const { data: permissions = [], isLoading } = usePermissions()

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
      const module = p.moduleCode || 'Khác'
      if (!groups[module]) groups[module] = []
      groups[module].push(p)
    })
    return groups
  }, [filteredPermissions])

  return (
    <SettingsLayout
      title="Danh mục quyền"
      description="Xem danh sách các quyền có trong hệ thống. Quyền được gán cho vai trò để kiểm soát truy cập."
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Tìm theo mã hoặc mô tả quyền..."
            className="flex-1 max-w-md"
          />
          <Select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            options={[{ value: '', label: 'Tất cả module' }, ...modules]}
            className="w-48"
          />
        </div>

        <div className="text-sm text-navy-600">
          Tổng cộng: <span className="font-semibold">{filteredPermissions.length}</span> quyền
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-navy-500">Đang tải...</div>
        ) : Object.keys(groupedPermissions).length === 0 ? (
          <div className="py-12 text-center text-navy-500">Không tìm thấy quyền phù hợp</div>
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
                      <TableHead className="w-1/3">Mã quyền</TableHead>
                      <TableHead className="w-1/4">Resource</TableHead>
                      <TableHead className="w-1/4">Action</TableHead>
                      <TableHead>Mô tả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <code className="text-sm bg-navy-100 px-2 py-1 rounded font-mono">
                            {p.permissionCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-navy-600">{p.resourceCode || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-navy-600">{p.actionCode || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-navy-600 line-clamp-1">{p.description || '—'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsLayout>
  )
}
