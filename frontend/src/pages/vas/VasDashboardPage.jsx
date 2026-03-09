import { useVasDashboard, useVasWorkOrders } from '@domains/vas'
import { Badge, Button, SummaryDonut, StatHighlight } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

export function VasDashboardPage() {
  const { data: dashboardResponse, refetch: refetchDashboard } = useVasDashboard()
  const { data: recentResponse, refetch: refetchRecent } = useVasWorkOrders({ page: 1, limit: 5 })

  const dashboard = dashboardResponse?.data || {}
  const recentWos = recentResponse?.data || []

  const handleRefresh = () => {
    refetchDashboard()
    refetchRecent()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Tổng quan VAS</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Trạng thái lệnh</h3>
          <SummaryDonut
            centerLabel="Tổng"
            centerValue={dashboard.totalWorkOrders || 0}
            data={[
              { name: 'Nháp', value: dashboard.draftCount || 0, color: '#94a3b8' },
              { name: 'Đã phát hành', value: dashboard.releasedCount || 0, color: '#3b82f6' },
              { name: 'Đang thực hiện', value: dashboard.inProgressCount || 0, color: '#d97706' },
              { name: 'Hoàn thành', value: dashboard.completedCount || 0, color: '#059669' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Chỉ số trực tiếp</h3>
          <StatHighlight value={dashboard.activeSessions || 0} label="Phiên hoạt động" color="text-ice" bgColor="bg-navy-800/5" />
          <StatHighlight value={dashboard.totalBagsToday?.toLocaleString() || '0'} label="Bao sản xuất hôm nay" color="text-emerald-600" bgColor="bg-emerald-50" />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Lệnh gần đây</h3>
        <div className="space-y-3">
          {recentWos.map((wo) => (
            <div key={wo.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
              <div>
                <p className="font-semibold text-navy-900">{wo.woNumber}</p>
                <p className="text-xs text-navy-400">{wo.vasType} · {wo.sourceItem?.code || wo.sourceItemId}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone(wo.status)}>{wo.status}</Badge>
                <p className="text-xs text-navy-400 mt-1">{wo.actualBagsProduced} / {wo.targetQty} bags</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
