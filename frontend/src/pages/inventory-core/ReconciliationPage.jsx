import { useCallback, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, Play, RefreshCcw, Search } from 'lucide-react'
import {
  useReconciliationRuns,
  useReconciliationRunDetail,
  useCreateReconciliationRun,
  useReviewReconciliationResult,
  useResolveReconciliationResult,
} from '@domains/inventory-core'
import { useLookupWarehouses } from '@domains/master-data'
import {
  Badge,
  Button,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
  Pagination,
} from '@shared/ui'

const SCOPE_LABELS = {
  FULL: 'Toàn bộ',
  WAREHOUSE: 'Theo kho',
  OWNER: 'Theo chủ hàng',
  ITEM: 'Theo mặt hàng',
}

const RUN_TYPE_LABELS = {
  SCHEDULED: 'Lịch trình',
  ON_DEMAND: 'Thủ công',
  SYSTEM: 'Hệ thống',
}

const STATUS_TONE = {
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
}

const SEVERITY_TONE = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  INFO: 'default',
}

const RESULT_STATUS_LABELS = {
  MISMATCH: 'Chênh lệch',
  OK: 'Khớp',
  REVIEWED: 'Đã xem xét',
  RESOLVED: 'Đã xử lý',
}

const RESULT_STATUS_TONE = {
  MISMATCH: 'danger',
  OK: 'success',
  REVIEWED: 'warning',
  RESOLVED: 'info',
}

function formatQty(value) {
  const num = Number(value)
  if (isNaN(num)) return '—'
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

export function ReconciliationPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', warehouseId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [createForm, setCreateForm] = useState({ scopeType: 'FULL', warehouseId: '' })

  const { data: response, isLoading, refetch } = useReconciliationRuns({
    ...filters,
    status: filters.status || undefined,
    warehouseId: filters.warehouseId || undefined,
  })
  const { data: runDetail, isLoading: isLoadingDetail } = useReconciliationRunDetail(selectedRunId)
  const createRun = useCreateReconciliationRun()
  const reviewResult = useReviewReconciliationResult()
  const resolveResult = useResolveReconciliationResult()
  const { data: warehouseOptions = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const handleCreate = async () => {
    await createRun.mutateAsync({
      runType: 'ON_DEMAND',
      scopeType: createForm.scopeType,
      warehouseId: createForm.warehouseId || undefined,
      correlationId: `corr-recon-${Date.now()}`,
    })
    setShowCreate(false)
    setCreateForm({ scopeType: 'FULL', warehouseId: '' })
    refetch()
  }

  const detailResults = runDetail?.results || []

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đối soát tồn kho</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCcw className="w-4 h-4 mr-1" />
            Làm mới
          </Button>
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>
            <Play className="w-4 h-4 mr-1" />
            Chạy đối soát
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            placeholder="Tất cả trạng thái"
            options={[
              { value: 'RUNNING', label: 'Đang chạy' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'FAILED', label: 'Thất bại' },
            ]}
          />
          <Select
            value={filters.warehouseId}
            onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
            placeholder="Tất cả kho"
            options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã phiên</TableHead>
              <TableHead>Loại / Phạm vi</TableHead>
              <TableHead>Kho</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="right">Chênh lệch</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? (
              <TableEmpty colSpan={7} message="Chưa có phiên đối soát nào. Nhấn 'Chạy đối soát' để bắt đầu." />
            ) : null}
            {!isLoading
              ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-semibold text-navy-900 font-mono text-sm">{row.runNo}</p>
                      <p className="text-xs text-navy-400">{row.correlationId}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-800">{RUN_TYPE_LABELS[row.runType] || row.runType}</p>
                      <p className="text-xs text-navy-500">{SCOPE_LABELS[row.scopeType] || row.scopeType}</p>
                    </TableCell>
                    <TableCell className="text-navy-700">
                      {row.warehouse?.warehouseCode || 'Tất cả kho'}
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant={STATUS_TONE[row.status] || 'default'}>{row.status}</Badge>
                    </TableCell>
                    <TableCell align="right">
                      <span className={row.mismatchCount > 0 ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
                        {row.mismatchCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-navy-700">{formatDateTime(row.startedAt)}</p>
                      {row.completedAt && (
                        <p className="text-xs text-navy-400">{formatDateTime(row.completedAt)}</p>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRunId(row.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => handleFilterChange('page', page)}
        />
      </div>

      {/* Create Reconciliation Run Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Chạy đối soát tồn kho"
        description="So sánh tổng giao dịch (ledger) với tồn kho thực tế (on-hand) để phát hiện chênh lệch."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createRun.isPending}>
              {createRun.isPending ? 'Đang chạy...' : 'Bắt đầu đối soát'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Phạm vi đối soát</label>
            <select
              className="wrs-input"
              value={createForm.scopeType}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, scopeType: e.target.value }))}
            >
              <option value="FULL">Toàn bộ hệ thống</option>
              <option value="WAREHOUSE">Theo kho</option>
            </select>
          </div>
          {createForm.scopeType === 'WAREHOUSE' && (
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Chọn kho</label>
              <select
                className="wrs-input"
                value={createForm.warehouseId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
              >
                <option value="">Chọn kho</option>
                {warehouseOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.code} - {o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Run Detail Modal */}
      <Modal
        isOpen={!!selectedRunId}
        onClose={() => setSelectedRunId(null)}
        title={`Chi tiết đối soát ${runDetail?.runNo || ''}`}
        size="xl"
      >
        {isLoadingDetail ? (
          <div className="py-8 text-center text-navy-500">Đang tải...</div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-500">Trạng thái</p>
                <Badge variant={STATUS_TONE[runDetail?.status]}>{runDetail?.status}</Badge>
              </div>
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-500">Phạm vi</p>
                <p className="font-semibold text-navy-900">{SCOPE_LABELS[runDetail?.scopeType]}</p>
              </div>
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-500">Chênh lệch</p>
                <p className="font-semibold text-amber-600">{runDetail?.mismatchCount ?? 0}</p>
              </div>
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-500">Thời gian</p>
                <p className="text-sm font-medium text-navy-800">{formatDateTime(runDetail?.startedAt)}</p>
              </div>
            </div>

            {/* Results Table */}
            {detailResults.length === 0 ? (
              <div className="text-center py-6 text-navy-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p>Không phát hiện chênh lệch</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead>Mặt hàng</TableHead>
                      <TableHead align="right">Sổ cái</TableHead>
                      <TableHead align="right">On-hand</TableHead>
                      <TableHead align="right">Chênh lệch</TableHead>
                      <TableHead align="center">Mức độ</TableHead>
                      <TableHead align="center">Trạng thái</TableHead>
                      <TableHead align="center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <p className="font-medium text-navy-900">
                            {result.item?.itemCode || result.itemId}
                          </p>
                          <p className="text-xs text-navy-400">{result.ruleCode}</p>
                        </TableCell>
                        <TableCell align="right" className="font-mono text-navy-800">
                          {formatQty(result.ledgerQty)}
                        </TableCell>
                        <TableCell align="right" className="font-mono text-navy-800">
                          {formatQty(result.onhandPhysicalQty)}
                        </TableCell>
                        <TableCell align="right">
                          <span
                            className={
                              Number(result.diffQty) !== 0
                                ? 'font-semibold text-amber-600 font-mono'
                                : 'text-emerald-600 font-mono'
                            }
                          >
                            {Number(result.diffQty) > 0 ? '+' : ''}
                            {formatQty(result.diffQty)}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={SEVERITY_TONE[result.severity] || 'default'}>
                            {result.severity}
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={RESULT_STATUS_TONE[result.resultStatus] || 'default'}>
                            {RESULT_STATUS_LABELS[result.resultStatus] || result.resultStatus}
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex justify-center gap-1">
                            {result.resultStatus === 'MISMATCH' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reviewResult.mutate({ resultId: result.id, data: {} })}
                                disabled={reviewResult.isPending}
                              >
                                <Search className="w-3 h-3 mr-1" />
                                Xem xét
                              </Button>
                            )}
                            {result.resultStatus === 'REVIEWED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resolveResult.mutate({ resultId: result.id, data: {} })}
                                disabled={resolveResult.isPending}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Xử lý
                              </Button>
                            )}
                            {(result.resultStatus === 'OK' || result.resultStatus === 'RESOLVED') && (
                              <span className="text-xs text-navy-400">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
