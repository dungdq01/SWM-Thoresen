import { useChannelHealth } from '@domains/integration'
import { Badge, Button } from '@shared/ui'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const statusIcon = (status) => {
  if (status === 'HEALTHY') return <CheckCircle className="h-6 w-6 text-emerald-500" />
  if (status === 'DEGRADED') return <AlertTriangle className="h-6 w-6 text-amber-500" />
  return <XCircle className="h-6 w-6 text-rose-500" />
}

const statusTone = (status) => {
  if (status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warning'
  return 'danger'
}

export function ChannelsPage() {
  const { data: response, refetch } = useChannelHealth()
  const channels = response?.data || []

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Kênh tích hợp</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {channels.map((channel) => (
          <div key={channel.id} className="wrs-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              {statusIcon(channel.status)}
              <Badge variant={statusTone(channel.status)}>{channel.status}</Badge>
            </div>
            <div>
              <p className="text-lg font-semibold text-navy-900">{channel.name}</p>
              <p className="text-sm text-navy-500">{channel.code}</p>
            </div>
            <div className="border-t border-moon-200 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">Hoạt động</span>
                <span className="font-semibold text-navy-800">{channel.uptimePercent}%</span>
              </div>
              <div className="w-full bg-moon-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full ${channel.status === 'HEALTHY' ? 'bg-emerald-500' : channel.status === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${channel.uptimePercent}%` }} />
              </div>
            </div>
            <p className="text-xs text-navy-400">Ping cuối: {new Date(channel.lastPingAt).toLocaleString('vi-VN')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
