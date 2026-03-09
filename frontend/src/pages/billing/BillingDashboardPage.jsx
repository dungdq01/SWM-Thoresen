import { useBillingDashboard, useInvoices } from '@domains/billing'
import { Badge, Button, SummaryDonut, StatHighlight } from '@shared/ui'

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
        <h2 className="section-title">Tổng quan thanh toán</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Trạng thái hóa đơn</h3>
          <SummaryDonut
            centerLabel="Tổng"
            data={[
              { name: 'Nháp', value: dashboard.draftCount || 0, color: '#d97706' },
              { name: 'Đã duyệt', value: dashboard.approvedCount || 0, color: '#059669' },
              { name: 'SK chờ', value: dashboard.pendingEvents || 0, color: '#e11d48' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Doanh thu</h3>
          <StatHighlight value={dashboard.totalRevenue?.toLocaleString() || '0'} label="Tổng doanh thu (VND)" color="text-ice" bgColor="bg-navy-800/5" />
          <StatHighlight value={dashboard.activeRateCards || 0} label="Biểu giá hoạt động" color="text-blue-600" bgColor="bg-blue-50" />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Thống kê nhanh</h3>
          <StatHighlight value={dashboard.totalInvoices || 0} label="Tổng hóa đơn" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={dashboard.pendingEvents || 0} label="Sự kiện chờ" color="text-rose-600" bgColor="bg-rose-50" />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Hóa đơn gần đây</h3>
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
