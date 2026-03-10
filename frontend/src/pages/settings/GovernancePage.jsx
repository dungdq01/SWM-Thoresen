import { useState, useMemo } from 'react'
import { Plus, Edit2, BookOpen, FileCheck, Clock } from 'lucide-react'
import {
  Button,
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
  Badge,
} from '@shared/ui'
import { useRules, useDecisionLogs, RuleStatusBadge, RULE_DOMAINS } from '@domains/auth'
import { RuleFormModal } from '@features/settings'
import { SettingsLayout } from './components/SettingsLayout'
import dayjs from 'dayjs'

export function GovernancePage() {
  const [activeTab, setActiveTab] = useState('rules')
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })

  const { data: rules = [], isLoading: rulesLoading } = useRules()
  const { data: decisionLogs = [], isLoading: logsLoading } = useDecisionLogs()

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchesSearch =
        !search ||
        r.ruleCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.title?.toLowerCase().includes(search.toLowerCase())
      const matchesDomain = !domainFilter || r.domain === domainFilter
      return matchesSearch && matchesDomain
    })
  }, [rules, search, domainFilter])

  const filteredLogs = useMemo(() => {
    return decisionLogs.filter((log) => {
      return (
        !search ||
        log.decisionCode?.toLowerCase().includes(search.toLowerCase()) ||
        log.title?.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [decisionLogs, search])

  const openCreateModal = () => setFormModal({ open: true, data: null })
  const openEditModal = (rule) => setFormModal({ open: true, data: rule })
  const closeFormModal = () => setFormModal({ open: false, data: null })

  return (
    <SettingsLayout
      title="Quản trị"
      description="Quản lý quy tắc nghiệp vụ, nhật ký quyết định và kiểm soát thay đổi trong hệ thống."
      actions={
        activeTab === 'rules' && (
          <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
            Tạo quy tắc
          </Button>
        )
      }
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">
            <BookOpen className="w-4 h-4 mr-2" />
            Quy tắc nghiệp vụ
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <FileCheck className="w-4 h-4 mr-2" />
            Nhật ký quyết định
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                value={search}
                onChange={setSearch}
                onClear={() => setSearch('')}
                placeholder="Tìm theo mã hoặc tên quy tắc..."
                className="flex-1 max-w-md"
              />
              <Select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                options={[{ value: '', label: 'Tất cả lĩnh vực' }, ...RULE_DOMAINS]}
                className="w-48"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Mã quy tắc</TableHead>
                  <TableHead>Tên quy tắc</TableHead>
                  <TableHead>Lĩnh vực</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead align="right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  <TableLoading colSpan={6} />
                ) : filteredRules.length === 0 ? (
                  <TableEmpty colSpan={6} message="Chưa có quy tắc nghiệp vụ nào" />
                ) : (
                  filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <code className="text-sm bg-navy-100 px-2 py-1 rounded font-mono">
                          {rule.ruleCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-900">{rule.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" size="sm">{rule.domain}</Badge>
                      </TableCell>
                      <TableCell>
                        <RuleStatusBadge status={rule.currentStatus} />
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-600 line-clamp-1">{rule.description || '—'}</span>
                      </TableCell>
                      <TableCell align="right">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-2 text-navy-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="decisions">
          <div className="space-y-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Tìm kiếm quyết định..."
              className="max-w-md"
            />

            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Mã quyết định</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Người quyết định</TableHead>
                  <TableHead>Ngày quyết định</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableLoading colSpan={5} />
                ) : filteredLogs.length === 0 ? (
                  <TableEmpty colSpan={5} message="Chưa có nhật ký quyết định nào" />
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <code className="text-sm bg-navy-100 px-2 py-1 rounded font-mono">
                          {log.decisionCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-900">{log.title}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-600">{log.decidedBy || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-navy-600">
                          <Clock className="w-4 h-4" />
                          <span>{log.decidedAt ? dayjs(log.decidedAt).format('DD/MM/YYYY') : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-navy-600 line-clamp-1">{log.description || '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <RuleFormModal
        isOpen={formModal.open}
        onClose={closeFormModal}
        editData={formModal.data}
      />
    </SettingsLayout>
  )
}
