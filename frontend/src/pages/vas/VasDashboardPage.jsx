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

  // httpClient already unwraps { success, data } envelope, so response is data directly
  const dashboard = dashboardResponse || {}
  const recentWos = recentResponse?.data || []

  const handleRefresh = () => {
    refetchDashboard()
    refetchRecent()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Bảng Thống Ké VAS</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm Mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Trạng Thái Đơn Hàng</h3>
          <SummaryDonut
            centerLabel="Tổng Cộng"
            centerValue={dashboard.totalWorkOrders || 0}
            data={[
              { name: 'Nháp', value: dashboard.draftCount || 0, color: '#94a3b8' },
              { name: 'Đã Xác Nhận', value: dashboard.confirmedCount || 0, color: '#3b82f6' },
              { name: 'Đang Thực Hiện', value: dashboard.inProgressCount || 0, color: '#d97706' },
              { name: 'Hoàn Thành', value: dashboard.completedCount || 0, color: '#059669' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Chỉ Số Thời Gian Thực</h3>
          <StatHighlight value={dashboard.activeSessions || 0} label="Phiên Làm Việc Đang Hoạt Động" color="text-ice" bgColor="bg-navy-800/5" />
          <StatHighlight value={dashboard.totalBagsToday?.toLocaleString() || '0'} label="Bao Sản Xuất Hôm Nay" color="text-emerald-600" bgColor="bg-emerald-50" />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Đơn Hàng Gần Đây</h3>
        <div className="space-y-3">
          {recentWos.map((wo) => (
            <div key={wo.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
              <div>
                <p className="font-semibold text-navy-900">{wo.woNumber}</p>
                <p className="text-xs text-navy-400">{wo.bulkSourceItem?.itemCode || '-'}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone(wo.status)}>{wo.status}</Badge>
                <p className="text-xs text-navy-400 mt-1">{wo.actualBagCount || 0} / {wo.packagingQtyPlanned || 0} bao</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
