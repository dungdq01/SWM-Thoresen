import { useReportingDashboard } from '@domains/reporting'
import { Button } from '@shared/ui'

export function ReportingDashboardPage() {
  const { data: response, refetch, isLoading } = useReportingDashboard()
  const dashboard = response?.data || {}
  const kpiByOwner = dashboard.kpiByOwner || []
  const movementTrend = dashboard.movementTrend || []

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">KPI Dashboard</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{dashboard.onHandQtyKg?.toLocaleString() || 0}</p>
          <p className="text-xs text-navy-500">On-Hand (KG)</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{dashboard.activeShipments || 0}</p>
          <p className="text-xs text-navy-500">Active Shipments</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{dashboard.inboundToday || 0}</p>
          <p className="text-xs text-navy-500">Inbound Today</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{dashboard.pendingBillingEvents || 0}</p>
          <p className="text-xs text-navy-500">Pending Billing</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-rose-600">{dashboard.openAlerts || 0}</p>
          <p className="text-xs text-navy-500">Open Alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* KPI by Owner */}
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">On-Hand by Owner</h3>
          {isLoading ? (
            <p className="text-sm text-navy-400">Đang tải...</p>
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
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Movement Trend (7 ngày)</h3>
          <div className="space-y-2">
            {movementTrend.map((row) => {
              const maxVal = Math.max(...movementTrend.map((r) => Math.max(r.inboundKg, r.outboundKg)))
              const inPct = maxVal > 0 ? (row.inboundKg / maxVal) * 100 : 0
              const outPct = maxVal > 0 ? (row.outboundKg / maxVal) * 100 : 0
              return (
                <div key={row.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-navy-500 shrink-0">{row.date.slice(5)}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <div className="flex-1 bg-moon-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${inPct}%` }} />
                      </div>
                      <span className="w-16 text-right text-navy-600">{row.inboundKg.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="flex-1 bg-moon-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${outPct}%` }} />
                      </div>
                      <span className="w-16 text-right text-navy-600">{row.outboundKg.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="flex gap-4 pt-1 text-xs text-navy-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Inbound (KG)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Outbound (KG)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="wrs-card p-4">
          <p className="text-xs text-navy-500 mb-1">Warehouse Utilization</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-moon-100 rounded-full h-3">
              <div
                className="bg-ice h-3 rounded-full"
                style={{ width: `${dashboard.warehouseUtilPct || 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-navy-900">{dashboard.warehouseUtilPct || 0}%</span>
          </div>
        </div>
        <div className="wrs-card p-4">
          <p className="text-xs text-navy-500 mb-1">RECON-001 Pass Rate</p>
          <p className="text-2xl font-bold text-emerald-600">{dashboard.reconPassRate || 0}%</p>
        </div>
        <div className="wrs-card p-4">
          <p className="text-xs text-navy-500 mb-1">Total Owners</p>
          <p className="text-2xl font-bold text-navy-900">{dashboard.totalOwners || 0}</p>
        </div>
      </div>
    </div>
  )
}
