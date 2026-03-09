import { useIntegrationOverview, useChannelHealth, useIntegrationStats } from '@domains/integration'
import { Badge, Button } from '@shared/ui'

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
        <h2 className="section-title">Integration Monitoring</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="wrs-card p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{overview.healthyChannels || 0}</p>
          <p className="text-sm text-navy-500">Healthy Channels</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{overview.degradedChannels || 0}</p>
          <p className="text-sm text-navy-500">Degraded</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-3xl font-bold text-rose-600">{overview.openAlerts || 0}</p>
          <p className="text-sm text-navy-500">Open Alerts</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-3xl font-bold text-navy-900">{overview.activeDevices || 0}</p>
          <p className="text-sm text-navy-500">Active Devices</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="wrs-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-900">Channel Health</h3>
          <div className="space-y-3">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
                <div>
                  <p className="font-semibold text-navy-800">{channel.name}</p>
                  <p className="text-xs text-navy-400">{channel.code}</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusTone(channel.status)}>{channel.status}</Badge>
                  <p className="text-xs text-navy-400 mt-1">Uptime: {channel.uptimePercent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Weighbridge Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-navy-900">{stats.weighbridgeStats?.totalEvents || 0}</p>
                <p className="text-xs text-navy-500">Total Events</p>
              </div>
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-navy-900">{stats.weighbridgeStats?.avgProcessingMs || 0}ms</p>
                <p className="text-xs text-navy-500">Avg Processing</p>
              </div>
            </div>
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">ERP Sync Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-emerald-600">{stats.erpSyncStats?.successfulPushes || 0}</p>
                <p className="text-xs text-navy-500">Successful Pushes</p>
              </div>
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-rose-600">{stats.erpSyncStats?.failedPushes || 0}</p>
                <p className="text-xs text-navy-500">Failed Pushes</p>
              </div>
            </div>
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Mobile Sync Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-navy-900">{stats.mobileSyncStats?.totalSyncs || 0}</p>
                <p className="text-xs text-navy-500">Total Syncs</p>
              </div>
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-2xl font-bold text-amber-600">{stats.mobileSyncStats?.pendingItems || 0}</p>
                <p className="text-xs text-navy-500">Pending Items</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
