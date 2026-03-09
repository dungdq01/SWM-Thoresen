import { useState, useMemo } from 'react'
import { FileText, AlertTriangle, CheckCircle, Clock, User, Filter } from 'lucide-react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  Button,
  Pagination,
} from '@shared/ui'
import { useAuditLogs, useExceptionLogs, useResolveExceptionLog, SeverityBadge, ResolvedBadge } from '@domains/auth'
import { SettingsLayout } from './components/SettingsLayout'
import dayjs from 'dayjs'

export function LogsPage() {
  const [activeTab, setActiveTab] = useState('audit')
  const [auditFilters, setAuditFilters] = useState({ page: 1, limit: 20, entity: '' })
  const [exceptionFilters, setExceptionFilters] = useState({ page: 1, limit: 20, resolved: '' })

  const { data: auditData, isLoading: auditLoading } = useAuditLogs(auditFilters)
  const { data: exceptionData, isLoading: exceptionLoading } = useExceptionLogs(exceptionFilters)
  const resolveException = useResolveExceptionLog()

  const auditLogs = auditData?.data || []
  const exceptionLogs = exceptionData?.data || []

  const handleResolve = async (id) => {
    if (window.confirm('Đánh dấu ngoại lệ này là đã xử lý?')) {
      await resolveException.mutateAsync(id)
    }
  }

  return (
    <SettingsLayout
      title="Nhật ký hệ thống"
      description="Tra cứu nhật ký kiểm toán và nhật ký ngoại lệ để giám sát hoạt động hệ thống."
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit">
            <FileText className="w-4 h-4 mr-2" />
            Nhật ký kiểm toán
          </TabsTrigger>
          <TabsTrigger value="exception">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Nhật ký ngoại lệ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                value={auditFilters.entity || ''}
                onChange={(val) => setAuditFilters((f) => ({ ...f, entity: val, page: 1 }))}
                onClear={() => setAuditFilters((f) => ({ ...f, entity: '', page: 1 }))}
                placeholder="Lọc theo loại thực thể..."
                className="max-w-md"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Thực thể</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLoading ? (
                  <TableLoading colSpan={6} />
                ) : auditLogs.length === 0 ? (
                  <TableEmpty colSpan={6} message="Chưa có nhật ký kiểm toán nào" />
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-navy-600 text-sm">
                          <Clock className="w-4 h-4" />
                          {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-navy-100 px-2 py-1 rounded">
                          {log.entityType}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-900">{log.action}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-navy-600">
                          <User className="w-4 h-4" />
                          <span className="text-sm">{log.userId || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-600">{log.sourceModule || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-500 text-sm line-clamp-1">
                          {log.entityId ? `ID: ${log.entityId}` : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {auditLogs.length > 0 && (
              <Pagination
                page={auditFilters.page}
                totalPages={Math.ceil((auditData?.meta?.total || 0) / auditFilters.limit)}
                onPageChange={(page) => setAuditFilters((f) => ({ ...f, page }))}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="exception">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={exceptionFilters.resolved}
                onChange={(e) => setExceptionFilters((f) => ({ ...f, resolved: e.target.value, page: 1 }))}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'false', label: 'Chưa xử lý' },
                  { value: 'true', label: 'Đã xử lý' },
                ]}
                className="w-48"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại ngoại lệ</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Thông điệp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead align="right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptionLoading ? (
                  <TableLoading colSpan={7} />
                ) : exceptionLogs.length === 0 ? (
                  <TableEmpty colSpan={7} message="Chưa có nhật ký ngoại lệ nào" />
                ) : (
                  exceptionLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-navy-600 text-sm">
                          <Clock className="w-4 h-4" />
                          {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          {log.exceptionType}
                        </code>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={log.severity} />
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-600">{log.sourceModule || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-700 text-sm line-clamp-1">{log.message}</span>
                      </TableCell>
                      <TableCell>
                        <ResolvedBadge isResolved={log.isResolved} />
                      </TableCell>
                      <TableCell align="right">
                        {!log.isResolved && (
                          <button
                            onClick={() => handleResolve(log.id)}
                            disabled={resolveException.isPending}
                            className="p-2 text-navy-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Đánh dấu đã xử lý"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {exceptionLogs.length > 0 && (
              <Pagination
                page={exceptionFilters.page}
                totalPages={Math.ceil((exceptionData?.meta?.total || 0) / exceptionFilters.limit)}
                onPageChange={(page) => setExceptionFilters((f) => ({ ...f, page }))}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  )
}
