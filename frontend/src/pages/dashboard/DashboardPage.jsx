import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'

const stats = [
  { 
    label: 'Tổng sản phẩm', 
    value: '12,458', 
    change: '+2.5%', 
    changeType: 'positive',
    icon: Package,
    iconBg: 'bg-navy-800',
    iconColor: 'text-gold'
  },
  { 
    label: 'Nhập kho hôm nay', 
    value: '234', 
    change: '+12.3%', 
    changeType: 'positive',
    icon: ArrowDownToLine,
    iconBg: 'bg-success/10',
    iconColor: 'text-success'
  },
  { 
    label: 'Xuất kho hôm nay', 
    value: '189', 
    change: '-3.1%', 
    changeType: 'negative',
    icon: ArrowUpFromLine,
    iconBg: 'bg-info/10',
    iconColor: 'text-info'
  },
  { 
    label: 'Cảnh báo tồn kho', 
    value: '23', 
    change: '+5 mới', 
    changeType: 'warning',
    icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning'
  },
]

export function DashboardPage() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard vận hành SWM</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`stat-card animate-slide-up stagger-${Math.min(index + 1, 5)}`}>
            <div className="stat-card-row">
              <div className={`stat-card-icon shrink-0 ${stat.iconBg}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="kpi-value-sm">{stat.value}</span>
                  <span className={`ml-auto flex items-center gap-1 text-[11px] font-bold ${
                    stat.changeType === 'positive' ? 'text-success' : stat.changeType === 'negative' ? 'text-danger' : 'text-warning'
                  }`}>
                    {stat.changeType === 'positive' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="mt-2 kpi-label">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="content-section xl:col-span-2">
          <div className="content-section-header">
            <div>
              <h2 className="section-title">Xuất nhập kho</h2>
              <p className="section-description">7 ngày gần nhất</p>
            </div>
          </div>
          <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-dashed border-moon-300 bg-moon-50 text-navy-400">
            <p>Biểu đồ sẽ được hiển thị ở đây</p>
          </div>
        </div>

        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gold" />
              <h2 className="section-title">Cảnh báo tồn kho thấp</h2>
            </div>
          </div>
          <p className="mb-4 mt-4 section-description">5 sản phẩm</p>
          
          <div className="space-y-4">
            {[
              { name: 'Ốc vít M8x25', warehouse: 'Kho A', current: 12, min: 100 },
              { name: 'Bạc đạn 6205', warehouse: 'Kho B', current: 5, min: 50 },
              { name: 'Dầu nhớt Shell', warehouse: 'Kho A', current: 8, min: 30 },
            ].map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-800">{item.name}</span>
                  <span className="text-xs text-navy-400">{item.warehouse}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-moon-200">
                    <div 
                      className="h-full rounded-full bg-danger" 
                      style={{ width: `${(item.current / item.min) * 100}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-xs text-navy-500">
                    {item.current}/{item.min}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
