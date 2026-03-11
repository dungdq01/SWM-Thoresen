import { useCallback, useState } from 'react'
import { Camera, BarChart3, RefreshCcw, Table2 } from 'lucide-react'
import {
  useSnapshotRuns,
  useCreateSnapshotRun,
  useSnapshotBilling,
  useSnapshotBillingAggregate,
} from '@domains/inventory-core'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import {
  Badge,
  Button,
  Input,
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

const RUN_MODE_LABELS = {
  SCHEDULED: 'Lịch trình',
  MANUAL: 'Thủ công',
  RERUN: 'Chạy lại',
}

const STATUS_TONE = {
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
}

function formatQty(value) {
  const num = Number(value)
  if (isNaN(num)) return '—'
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('vi-VN')
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

export function SnapshotBillingPage() {
  const [activeTab, setActiveTab] = useState('runs')
  const [runFilters, setRunFilters] = useState({ page: 1, pageSize: 20, status: '', warehouseId: '' })
  const [billingFilters, setBillingFilters] = useState({ page: 1, pageSize: 50, warehouseId: '', ownerId: '', fromDate: '', toDate: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ warehouseId: '', mode: 'MANUAL' })

  const { data: runResponse, isLoading: isLoadingRuns, refetch: refetchRuns } = useSnapshotRuns({
    ...runFilters,
    status: runFilters.status || undefined,
    warehouseId: runFilters.warehouseId || undefined,
  })

  const billingEnabled = activeTab === 'billing'
  const aggregateEnabled = activeTab === 'aggregate'

  const { data: billingResponse, isLoading: isLoadingBilling } = useSnapshotBilling(
    {
      ...billingFilters,
      warehouseId: billingFilters.warehouseId || undefined,
      ownerId: billingFilters.ownerId || undefined,
      fromDate: billingFilters.fromDate || undefined,
      toDate: billingFilters.toDate || undefined,
    },
    billingEnabled
  )

  const { data: aggregateData = [], isLoading: isLoadingAggregate } = useSnapshotBillingAggregate(
    {
      warehouseId: billingFilters.warehouseId || undefined,
      ownerId: billingFilters.ownerId || undefined,
      fromDate: billingFilters.fromDate || undefined,
      toDate: billingFilters.toDate || undefined,
    },
    aggregateEnabled
  )

  const createRun = useCreateSnapshotRun()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: ownerOptions = [] } = useLookupOwners()

  const runRows = runResponse?.data || []
  const runPagination = runResponse?.pagination || { page: 1, totalPages: 1 }
  const billingRows = billingResponse?.data || []
  const billingPagination = billingResponse?.pagination || { page: 1, totalPages: 1 }

  const handleRunFilterChange = useCallback((key, value) => {
    setRunFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const handleBillingFilterChange = useCallback((key, value) => {
    setBillingFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const handleCreate = async () => {
    await createRun.mutateAsync({
      warehouseId: createForm.warehouseId || undefined,
      mode: createForm.mode,
      correlationId: `corr-snap-${Date.now()}`,
    })
    setShowCreate(false)
    setCreateForm({ warehouseId: '', mode: 'MANUAL' })
    refetchRuns()
  }

  const tabs = [
    { id: 'runs', label: 'Phiên chụp', icon: Camera },
    { id: 'billing', label: 'Dữ liệu billing', icon: Table2 },
    { id: 'aggregate', label: 'Tổng hợp billing', icon: BarChart3 },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Snapshot & Billing</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetchRuns}>
            <RefreshCcw className="w-4 h-4 mr-1" />
            Làm mới
          </Button>
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>
            <Camera className="w-4 h-4 mr-1" />
            Chụp tồn kho
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 bg-navy-50 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-500 hover:text-navy-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Snapshot Runs */}
      {activeTab === 'runs' && (
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={runFilters.status}
              onChange={(e) => handleRunFilterChange('status', e.target.value)}
              placeholder="Tất cả trạng thái"
              options={[
                { value: 'RUNNING', label: 'Đang chạy' },
                { value: 'COMPLETED', label: 'Hoàn thành' },
                { value: 'FAILED', label: 'Thất bại' },
              ]}
            />
            <Select
              value={runFilters.warehouseId}
              onChange={(e) => handleRunFilterChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Mã phiên</TableHead>
                <TableHead>Ngày chụp</TableHead>
                <TableHead>Kho</TableHead>
                <TableHead>Chế độ</TableHead>
                <TableHead align="center">Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRuns ? <TableLoading colSpan={6} /> : null}
              {!isLoadingRuns && runRows.length === 0 ? (
                <TableEmpty colSpan={6} message="Chưa có phiên chụp tồn kho nào. Nhấn 'Chụp tồn kho' để tạo." />
              ) : null}
              {!isLoadingRuns
                ? runRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-semibold text-navy-900 font-mono text-sm">{row.runNo}</p>
                        <p className="text-xs text-navy-400">v{row.versionNo || 1}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-800">{formatDate(row.snapshotDate)}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">
                        {row.warehouse?.warehouseCode || 'Tất cả kho'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-navy-600">
                          {RUN_MODE_LABELS[row.runMode] || row.runMode}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <Badge variant={STATUS_TONE[row.status] || 'default'}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-navy-700">{formatDateTime(row.startedAt)}</p>
                        {row.completedAt && (
                          <p className="text-xs text-navy-400">{formatDateTime(row.completedAt)}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>

          <Pagination
            page={runPagination.page}
            totalPages={runPagination.totalPages}
            onPageChange={(page) => handleRunFilterChange('page', page)}
          />
        </div>
      )}

      {/* Tab: Billing Data */}
      {activeTab === 'billing' && (
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              value={billingFilters.warehouseId}
              onChange={(e) => handleBillingFilterChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={billingFilters.ownerId}
              onChange={(e) => handleBillingFilterChange('ownerId', e.target.value)}
              placeholder="Tất cả chủ hàng"
              options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Input
              type="date"
              value={billingFilters.fromDate}
              onChange={(e) => handleBillingFilterChange('fromDate', e.target.value)}
              placeholder="Từ ngày"
            />
            <Input
              type="date"
              value={billingFilters.toDate}
              onChange={(e) => handleBillingFilterChange('toDate', e.target.value)}
              placeholder="Đến ngày"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Ngày</TableHead>
                <TableHead>Chủ hàng</TableHead>
                <TableHead>Mặt hàng</TableHead>
                <TableHead>Kho / Vị trí</TableHead>
                <TableHead align="right">Đầu ngày</TableHead>
                <TableHead align="right">Nhập trong ngày</TableHead>
                <TableHead align="right">Xuất trong ngày</TableHead>
                <TableHead align="right">Cuối ngày</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBilling ? <TableLoading colSpan={8} /> : null}
              {!isLoadingBilling && billingRows.length === 0 ? (
                <TableEmpty colSpan={8} message="Không có dữ liệu billing. Chạy snapshot trước để tạo dữ liệu." />
              ) : null}
              {!isLoadingBilling
                ? billingRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium text-navy-800">{formatDate(row.snapshotDate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-navy-900">{row.owner?.ownerCode || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-800">{row.item?.itemCode || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-navy-700">{row.warehouse?.warehouseCode || '—'}</p>
                        <p className="text-xs text-navy-400">{row.location?.locationCode || '—'}</p>
                      </TableCell>
                      <TableCell align="right" className="font-mono text-navy-700">{formatQty(row.openingQty)}</TableCell>
                      <TableCell align="right" className="font-mono text-emerald-600">{formatQty(row.inboundTodayQty)}</TableCell>
                      <TableCell align="right" className="font-mono text-amber-600">{formatQty(row.outboundTodayQty)}</TableCell>
                      <TableCell align="right" className="font-mono font-semibold text-navy-900">{formatQty(row.closingQty)}</TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>

          <Pagination
            page={billingPagination.page}
            totalPages={billingPagination.totalPages}
            onPageChange={(page) => handleBillingFilterChange('page', page)}
          />
        </div>
      )}

      {/* Tab: Aggregate Billing */}
      {activeTab === 'aggregate' && (
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              value={billingFilters.warehouseId}
              onChange={(e) => handleBillingFilterChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={billingFilters.ownerId}
              onChange={(e) => handleBillingFilterChange('ownerId', e.target.value)}
              placeholder="Tất cả chủ hàng"
              options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Input
              type="date"
              value={billingFilters.fromDate}
              onChange={(e) => handleBillingFilterChange('fromDate', e.target.value)}
              placeholder="Từ ngày"
            />
            <Input
              type="date"
              value={billingFilters.toDate}
              onChange={(e) => handleBillingFilterChange('toDate', e.target.value)}
              placeholder="Đến ngày"
            />
          </div>

          {!billingFilters.fromDate || !billingFilters.toDate ? (
            <div className="text-center py-8 text-navy-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Chọn khoảng thời gian (từ ngày - đến ngày) để xem tổng hợp billing</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Chủ hàng</TableHead>
                  <TableHead>Mặt hàng</TableHead>
                  <TableHead align="right">Số ngày lưu kho</TableHead>
                  <TableHead align="right">TB tồn cuối ngày</TableHead>
                  <TableHead align="right">Tổng tấn×ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAggregate ? <TableLoading colSpan={5} /> : null}
                {!isLoadingAggregate && aggregateData.length === 0 ? (
                  <TableEmpty colSpan={5} message="Không có dữ liệu tổng hợp cho khoảng thời gian đã chọn" />
                ) : null}
                {!isLoadingAggregate
                  ? aggregateData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <span className="font-semibold text-navy-900">
                            {row.owner?.ownerCode || row.ownerId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-navy-800">
                            {row.item?.itemCode || row.itemId}
                          </span>
                        </TableCell>
                        <TableCell align="right" className="font-semibold text-navy-900">
                          {row.daysStored}
                        </TableCell>
                        <TableCell align="right" className="font-mono text-navy-800">
                          {formatQty(row.avgClosingQty)}
                        </TableCell>
                        <TableCell align="right" className="font-mono font-semibold text-navy-900">
                          {formatQty(row.totalQtyDays)}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Create Snapshot Run Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Chụp tồn kho cuối ngày"
        description="Ghi nhận tồn kho tại thời điểm hiện tại. Dữ liệu này dùng để tính billing lưu kho cho chủ hàng."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createRun.isPending}>
              {createRun.isPending ? 'Đang chụp...' : 'Bắt đầu chụp'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Kho (để trống = tất cả)</label>
            <select
              className="wrs-input"
              value={createForm.warehouseId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
            >
              <option value="">Tất cả kho</option>
              {warehouseOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.code} - {o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Chế độ</label>
            <select
              className="wrs-input"
              value={createForm.mode}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, mode: e.target.value }))}
            >
              <option value="MANUAL">Thủ công</option>
              <option value="RERUN">Chạy lại (ghi đè ngày hiện tại)</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
}
