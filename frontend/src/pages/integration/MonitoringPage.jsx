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
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Integration Monitoring</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Channel Health</h3>
          <SummaryDonut
            centerLabel="Channels"
            data={[
              { name: 'Healthy', value: overview.healthyChannels || 0, color: '#059669' },
              { name: 'Degraded', value: overview.degradedChannels || 0, color: '#d97706' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Alerts & Devices</h3>
          <StatHighlight value={overview.openAlerts || 0} label="Open Alerts" color="text-rose-600" bgColor="bg-rose-50" />
          <StatHighlight value={overview.activeDevices || 0} label="Active Devices" color="text-navy-900" bgColor="bg-moon-50" />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Weighbridge</h3>
          <StatHighlight value={stats.weighbridgeStats?.totalEvents || 0} label="Total Events" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={`${stats.weighbridgeStats?.avgProcessingMs || 0}ms`} label="Avg Processing" color="text-blue-600" bgColor="bg-blue-50" />
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
            <h3 className="text-sm font-semibold text-navy-900">ERP Sync Stats</h3>
            <SummaryDonut
              centerLabel="Pushes"
              size={120}
              data={[
                { name: 'Successful', value: stats.erpSyncStats?.successfulPushes || 0, color: '#059669' },
                { name: 'Failed', value: stats.erpSyncStats?.failedPushes || 0, color: '#e11d48' },
              ]}
            />
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Mobile Sync Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatHighlight value={stats.mobileSyncStats?.totalSyncs || 0} label="Total Syncs" color="text-navy-900" bgColor="bg-moon-50" />
              <StatHighlight value={stats.mobileSyncStats?.pendingItems || 0} label="Pending Items" color="text-amber-600" bgColor="bg-amber-50" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
