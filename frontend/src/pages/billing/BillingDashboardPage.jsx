import { useBillingDashboard, useInvoices } from '@domains/billing'
import { Badge, Button } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

export function BillingDashboardPage() {
  const { data: dashboardResponse, refetch: refetchDashboard } = useBillingDashboard()
  const { data: recentResponse, refetch: refetchRecent } = useInvoices({ page: 1, limit: 5 })

  const dashboard = dashboardResponse?.data || {}
  const recentInvoices = recentResponse?.data || []

  const handleRefresh = () => {
    refetchDashboard()
    refetchRecent()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Billing Dashboard</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{dashboard.totalInvoices || 0}</p>
          <p className="text-xs text-navy-500">Total Invoices</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{dashboard.draftCount || 0}</p>
          <p className="text-xs text-navy-500">Draft</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{dashboard.approvedCount || 0}</p>
          <p className="text-xs text-navy-500">Approved</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-ice">{dashboard.totalRevenue?.toLocaleString() || 0}</p>
          <p className="text-xs text-navy-500">Total Revenue (VND)</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-rose-600">{dashboard.pendingEvents || 0}</p>
          <p className="text-xs text-navy-500">Pending Events</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{dashboard.activeRateCards || 0}</p>
          <p className="text-xs text-navy-500">Active Rate Cards</p>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Recent Invoices</h3>
        <div className="space-y-3">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
              <div>
                <p className="font-semibold text-navy-900">{inv.invoiceNumber}</p>
                <p className="text-xs text-navy-400">{inv.owner?.code || inv.ownerId} · {inv.periodFrom} → {inv.periodTo}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone(inv.status)}>{inv.status}</Badge>
                <p className="text-sm font-semibold text-navy-900 mt-1">{inv.totalAmount?.toLocaleString()} VND</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
