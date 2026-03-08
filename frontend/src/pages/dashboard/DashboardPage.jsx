import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react'

const stats = [
  { 
    label: 'Tổng sản phẩm', 
    value: '12,458', 
    change: '+2.5%', 
    changeType: 'positive',
    icon: Package,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600'
  },
  { 
    label: 'Nhập kho hôm nay', 
    value: '234', 
    change: '+12.3%', 
    changeType: 'positive',
    icon: ArrowDownToLine,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  { 
    label: 'Xuất kho hôm nay', 
    value: '189', 
    change: '-3.1%', 
    changeType: 'negative',
    icon: ArrowUpFromLine,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600'
  },
  { 
    label: 'Cảnh báo tồn kho', 
    value: '23', 
    change: '+5 mới', 
    changeType: 'warning',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600'
  },
]

export function DashboardPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 text-sm">Dashboard quản lý kho hàng</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.changeType === 'positive' ? 'bg-emerald-50 text-emerald-600' :
                stat.changeType === 'negative' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Xuất nhập kho</h2>
          <p className="text-slate-500 text-sm">7 ngày gần nhất</p>
          <div className="h-64 flex items-center justify-center text-slate-400 mt-4">
            <p>Biểu đồ sẽ được hiển thị ở đây</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Cảnh báo tồn kho thấp</h2>
          </div>
          <p className="text-slate-500 text-sm mb-4">5 sản phẩm</p>
          
          <div className="space-y-4">
            {[
              { name: 'Ốc vít M8x25', warehouse: 'Kho A', current: 12, min: 100 },
              { name: 'Bạc đạn 6205', warehouse: 'Kho B', current: 5, min: 50 },
              { name: 'Dầu nhớt Shell', warehouse: 'Kho A', current: 8, min: 30 },
            ].map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.warehouse}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${(item.current / item.min) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
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
