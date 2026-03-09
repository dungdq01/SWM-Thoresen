import { useIntegrationOverview, useChannelHealth, useIntegrationStats } from '@domains/integration'
import { Badge, Button, SummaryDonut, StatHighlight } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warning'
  return 'danger'
}

export function MonitoringPage() {
  const { data: overviewResponse, refetch: refetchOverview } = useIntegrationOverview()
  const { data: healthResponse, refetch: refetchHealth } = useChannelHealth()
  const { data: statsResponse, refetch: refetchStats } = useIntegrationStats()

  const overview = overviewResponse?.data || {}
  const channels = healthResponse?.data || []
  const stats = statsResponse?.data || {}

  const handleRefresh = () => {
    refetchOverview()
    refetchHealth()
    refetchStats()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Giám sát tích hợp</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Sức khỏe kênh</h3>
          <SummaryDonut
            centerLabel="Kênh"
            data={[
              { name: 'Bình thường', value: overview.healthyChannels || 0, color: '#059669' },
              { name: 'Suy giảm', value: overview.degradedChannels || 0, color: '#d97706' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Cảnh báo & thiết bị</h3>
          <StatHighlight value={overview.openAlerts || 0} label="Cảnh báo mở" color="text-rose-600" bgColor="bg-rose-50" />
          <StatHighlight value={overview.activeDevices || 0} label="Thiết bị hoạt động" color="text-navy-900" bgColor="bg-moon-50" />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Trạm cân</h3>
          <StatHighlight value={stats.weighbridgeStats?.totalEvents || 0} label="Tổng sự kiện" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={`${stats.weighbridgeStats?.avgProcessingMs || 0}ms`} label="Xử lý TB" color="text-blue-600" bgColor="bg-blue-50" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="wrs-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-900">Sức khỏe kênh</h3>
          <div className="space-y-3">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
                <div>
                  <p className="font-semibold text-navy-800">{channel.name}</p>
                  <p className="text-xs text-navy-400">{channel.code}</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusTone(channel.status)}>{channel.status}</Badge>
                  <p className="text-xs text-navy-400 mt-1">Hoạt động: {channel.uptimePercent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Thống kê đồng bộ ERP</h3>
            <SummaryDonut
              centerLabel="Đẩy"
              size={120}
              data={[
                { name: 'Thành công', value: stats.erpSyncStats?.successfulPushes || 0, color: '#059669' },
                { name: 'Thất bại', value: stats.erpSyncStats?.failedPushes || 0, color: '#e11d48' },
              ]}
            />
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Thống kê đồng bộ Mobile</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatHighlight value={stats.mobileSyncStats?.totalSyncs || 0} label="Tổng đồng bộ" color="text-navy-900" bgColor="bg-moon-50" />
              <StatHighlight value={stats.mobileSyncStats?.pendingItems || 0} label="Mục chờ" color="text-amber-600" bgColor="bg-amber-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
