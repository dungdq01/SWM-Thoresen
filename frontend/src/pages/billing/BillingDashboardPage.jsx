import { useBillingDashboard, useDebitNotes } from '@domains/billing'
import { Badge, Button, SummaryDonut, StatHighlight } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

export function BillingDashboardPage() {
  const { data: dashboardResponse, refetch: refetchDashboard } = useBillingDashboard()
  const { data: recentResponse, refetch: refetchRecent } = useDebitNotes({ page: 1, limit: 5 })

  const dashboard = dashboardResponse?.data || {}
  const recentDebitNotes = recentResponse?.data || []

  const handleRefresh = () => {
    refetchDashboard()
    refetchRecent()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Dashboard</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Invoice Status</h3>
          <SummaryDonut
            centerLabel="Total"
            data={[
              { name: 'Draft', value: dashboard.draftCount || 0, color: '#d97706' },
              { name: 'Approved', value: dashboard.approvedCount || 0, color: '#059669' },
              { name: 'Pending Events', value: dashboard.pendingEvents || 0, color: '#e11d48' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Revenue</h3>
          <StatHighlight value={dashboard.totalRevenue?.toLocaleString() || '0'} label="Total Revenue (VND)" color="text-ice" bgColor="bg-navy-800/5" />
          <StatHighlight value={dashboard.activeRateCards || 0} label="Active Rate Cards" color="text-blue-600" bgColor="bg-blue-50" />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Quick Stats</h3>
          <StatHighlight value={dashboard.totalInvoices || 0} label="Total Invoices" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={dashboard.pendingEvents || 0} label="Pending Events" color="text-rose-600" bgColor="bg-rose-50" />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Recent Invoices</h3>
        <div className="space-y-3">
          {recentDebitNotes.map((dn) => (
            <div key={dn.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
              <div>
                <p className="font-semibold text-navy-900">{dn.dnNumber || dn.invoiceNumber}</p>
                <p className="text-xs text-navy-400">{dn.owner?.code || dn.ownerId} · {dn.periodStart || dn.periodFrom} → {dn.periodEnd || dn.periodTo}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone(dn.status)}>{dn.status}</Badge>
                <p className="text-sm font-semibold text-navy-900 mt-1">{dn.totalAmount?.toLocaleString()} VND</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
