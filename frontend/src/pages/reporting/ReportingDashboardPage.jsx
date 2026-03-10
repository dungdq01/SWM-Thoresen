import { useReportingDashboard } from '@domains/reporting'
import { Button, SummaryDonut, StatHighlight, ProgressRing, TrendMiniChart } from '@shared/ui'

export function ReportingDashboardPage() {
  const { data: response, refetch, isLoading } = useReportingDashboard()
  const dashboard = response?.data || {}
  const kpiByOwner = dashboard.kpiByOwner || []
  const movementTrend = dashboard.movementTrend || []

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">KPI Dashboard</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-5">
        <div className="wrs-card p-5">
          <StatHighlight value={dashboard.onHandQtyKg?.toLocaleString() || '0'} label="On-Hand (KG)" color="text-navy-900" bgColor="bg-moon-50" />
        </div>
        <div className="wrs-card p-5">
          <StatHighlight value={dashboard.activeShipments || 0} label="Active Shipments" color="text-blue-600" bgColor="bg-blue-50" />
        </div>
        <div className="wrs-card p-5">
          <div className="flex items-center gap-4">
            <StatHighlight value={dashboard.inboundToday || 0} label="Inbound Today" color="text-emerald-600" bgColor="bg-emerald-50" className="flex-1" />
          </div>
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <StatHighlight value={dashboard.pendingBillingEvents || 0} label="Pending Billing" color="text-amber-600" bgColor="bg-amber-50" />
          <StatHighlight value={dashboard.openAlerts || 0} label="Open Alerts" color="text-rose-600" bgColor="bg-rose-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* KPI by Owner */}
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">On-Hand by Owner</h3>
          {isLoading ? (
            <p className="text-sm text-navy-400">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-moon-200">
                  <th className="text-left py-2 text-navy-500 font-medium">Owner</th>
                  <th className="text-right py-2 text-navy-500 font-medium">On-Hand (KG)</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Shipments</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {kpiByOwner.map((row) => (
                  <tr key={row.ownerId} className="border-b border-moon-100">
                    <td className="py-2 font-semibold text-navy-900">{row.ownerCode}</td>
                    <td className="py-2 text-right text-navy-700">{row.onHandKg.toLocaleString()}</td>
                    <td className="py-2 text-right text-blue-600">{row.pendingShipments}</td>
                    <td className="py-2 text-right text-amber-600">{row.billingOutstanding.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Movement Trend */}
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Movement Trend (7 days)</h3>
          <TrendMiniChart
            data={movementTrend.map((row) => ({ label: row.date.slice(5), value1: row.inboundKg, value2: row.outboundKg }))}
            color1="#10b981"
            color2="#3b82f6"
            legend1="Inbound (KG)"
            legend2="Outbound (KG)"
            height={200}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="wrs-card p-5 flex items-center gap-4">
          <ProgressRing value={dashboard.warehouseUtilPct || 0} max={100} color="#00b4d8" label="Utilization" />
          <div>
            <p className="text-sm font-semibold text-navy-900">Warehouse Utilization</p>
            <p className="text-xs text-navy-400">Current capacity usage</p>
          </div>
        </div>
        <div className="wrs-card p-5 flex items-center gap-4">
          <ProgressRing value={dashboard.reconPassRate || 0} max={100} color="#059669" label="Pass Rate" />
          <div>
            <p className="text-sm font-semibold text-navy-900">RECON-001 Pass Rate</p>
            <p className="text-xs text-navy-400">Reconciliation accuracy</p>
          </div>
        </div>
        <div className="wrs-card p-5">
          <StatHighlight value={dashboard.totalOwners || 0} label="Total Owners" color="text-navy-900" bgColor="bg-moon-50" />
        </div>
      </div>
    </>
  )
}
