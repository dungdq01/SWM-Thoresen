import { useVasDashboard, useVasWorkOrders } from '@domains/vas'
import { Badge, Button } from '@shared/ui'

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
        <h2 className="section-title">VAS Dashboard</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{dashboard.totalWorkOrders || 0}</p>
          <p className="text-xs text-navy-500">Total WO</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-500">{dashboard.draftCount || 0}</p>
          <p className="text-xs text-navy-500">Draft</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{dashboard.releasedCount || 0}</p>
          <p className="text-xs text-navy-500">Released</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{dashboard.inProgressCount || 0}</p>
          <p className="text-xs text-navy-500">In Progress</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{dashboard.completedCount || 0}</p>
          <p className="text-xs text-navy-500">Completed</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-ice">{dashboard.activeSessions || 0}</p>
          <p className="text-xs text-navy-500">Active Sessions</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{dashboard.totalBagsToday?.toLocaleString() || 0}</p>
          <p className="text-xs text-navy-500">Bags Today</p>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Recent Work Orders</h3>
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
