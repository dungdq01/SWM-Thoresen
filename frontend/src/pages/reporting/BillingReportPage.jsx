import { useBillingReport } from '@domains/reporting'
import { Button, SummaryDonut, StatHighlight, MiniBarList } from '@shared/ui'

export function BillingReportPage() {
  const { data: response, refetch, isLoading } = useBillingReport()
  const report = response?.data || {}
  const summary = report.summary || {}
  const byOwner = report.byOwner || []
  const byServiceType = report.byServiceType || []

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Billing Report</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-navy-400">
            {summary.periodFrom} → {summary.periodTo}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
        ⚠️ Storage fee = (Opening + Inbound Today) × rate. KHÔNG trừ outbound trong ngày. Số liệu từ daily_storage_snapshot 23:59.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Revenue Breakdown</h3>
          <SummaryDonut
            centerLabel="Total"
            data={[
              { name: 'Approved', value: summary.approvedRevenue || 0, color: '#059669' },
              { name: 'Draft/Pending', value: summary.pendingRevenue || 0, color: '#d97706' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Revenue</h3>
          <StatHighlight value={summary.totalRevenue?.toLocaleString() || '0'} label="Total Revenue (VND)" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={summary.outstandingDNs || 0} label="Outstanding DNs" color="text-rose-600" bgColor="bg-rose-50" />
        </div>
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">DN Status</h3>
          <MiniBarList
            data={[
              { name: 'Approved', value: summary.approvedRevenue || 0, color: '#059669' },
              { name: 'Pending', value: summary.pendingRevenue || 0, color: '#d97706' },
              { name: 'Outstanding', value: summary.outstandingDNs || 0, color: '#e11d48' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* By Owner */}
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Revenue by Owner</h3>
          {isLoading ? (
            <p className="text-sm text-navy-400">Đang tải...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-moon-200">
                  <th className="text-left py-2 text-navy-500 font-medium">Owner</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Revenue</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Draft DNs</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Approved</th>
                  <th className="text-right py-2 text-navy-500 font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {byOwner.map((row) => (
                  <tr key={row.ownerId} className="border-b border-moon-100">
                    <td className="py-2">
                      <p className="font-semibold text-navy-900">{row.ownerCode}</p>
                      <p className="text-xs text-navy-400">{row.ownerName}</p>
                    </td>
                    <td className="py-2 text-right font-semibold text-navy-900">{row.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right text-amber-600">{row.draftDNs}</td>
                    <td className="py-2 text-right text-emerald-600">{row.approvedDNs}</td>
                    <td className="py-2 text-right text-navy-600">{row.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* By Service Type */}
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Revenue by Service Type</h3>
          {isLoading ? (
            <p className="text-sm text-navy-400">Đang tải...</p>
          ) : (
            <div className="space-y-3">
              {byServiceType.map((row) => (
                <div key={row.serviceType}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-navy-700">{row.label}</span>
                    <span className="font-semibold text-navy-900">{row.amount.toLocaleString()} <span className="text-navy-400 font-normal">({row.pct}%)</span></span>
                  </div>
                  <div className="w-full bg-moon-100 rounded-full h-2">
                    <div
                      className="bg-ice h-2 rounded-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
