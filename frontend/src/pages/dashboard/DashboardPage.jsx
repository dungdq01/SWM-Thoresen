import { useCallback } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Package, TrendingDown, TrendingUp, Activity, Boxes, Clock, Database, RefreshCw } from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useMockData } from '@shared/hooks/useMockData'
import { seedAll, clearAllMockData, getSeededAt } from '@shared/lib/mockStorage'
import {
  dashboardStats as defaultStats,
  inventoryFlow as defaultFlow,
  warehouseDistribution as defaultWarehouse,
  lowStockAlerts as defaultAlerts,
  topOutboundProducts as defaultTopProducts,
  recentActivities as defaultActivities,
  ALL_SEED_DATA,
} from '@shared/lib/mockSeedData'

const STAT_ICONS = [
  { icon: Package, iconBg: 'bg-navy-800', iconColor: 'text-ice-light' },
  { icon: ArrowDownToLine, iconBg: 'bg-success/10', iconColor: 'text-success' },
  { icon: ArrowUpFromLine, iconBg: 'bg-info/10', iconColor: 'text-info' },
  { icon: AlertTriangle, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
]

function formatStatValue(stat) {
  if (stat.key === 'totalProducts') return stat.value.toLocaleString()
  return String(stat.value)
}

function formatStatChange(stat) {
  if (stat.changeType === 'warning') return `+${stat.change} mới`
  const sign = stat.change > 0 ? '+' : ''
  return `${sign}${stat.change}%`
}

// Custom tooltip cho biểu đồ
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-moon-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-navy-800">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'inbound' ? 'Nhập kho' : 'Xuất kho'}: <span className="font-semibold">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

// MockDataBanner: hiển thị trạng thái mock data và nút reset
function MockDataBanner({ onReset }) {
  const seededAt = getSeededAt()
  
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-ice/30 bg-ice/5 px-3 py-2 sm:px-4 sm:py-2.5">
      <Database className="h-4 w-4 text-ice flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium text-navy-700">
        Dữ liệu mẫu
      </span>
      <span className="hidden sm:inline text-xs text-navy-400">
        Persist qua refresh · Tự xóa sau 24h
        {seededAt && (
          <> · Tạo lúc {seededAt.toLocaleTimeString('vi-VN')}</>
        )}
      </span>
      <button
        onClick={onReset}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-navy-600 shadow-sm border border-moon-200 hover:bg-moon-50 transition-colors"
        title="Reset về dữ liệu mặc định"
      >
        <RefreshCw className="h-3 w-3" />
        <span className="hidden sm:inline">Reset data</span>
        <span className="sm:hidden">Reset</span>
      </button>
    </div>
  )
}

export function DashboardPage() {
  // Load all collections từ localStorage (auto-seed nếu chưa có)
  const { data: statsData, refresh: refreshStats } = useMockData('dashboard_stats', { defaultData: defaultStats })
  const { data: flowData, refresh: refreshFlow } = useMockData('inventory_flow', { defaultData: defaultFlow })
  const { data: whData, refresh: refreshWh } = useMockData('warehouse_distribution', { defaultData: defaultWarehouse })
  const { data: alertsData, refresh: refreshAlerts } = useMockData('low_stock_alerts', { defaultData: defaultAlerts })
  const { data: topData, refresh: refreshTop } = useMockData('top_outbound', { defaultData: defaultTopProducts })
  const { data: activitiesData, refresh: refreshAct } = useMockData('recent_activities', { defaultData: defaultActivities })

  const handleReset = useCallback(() => {
    clearAllMockData()
    seedAll(ALL_SEED_DATA)
    refreshStats()
    refreshFlow()
    refreshWh()
    refreshAlerts()
    refreshTop()
    refreshAct()
  }, [refreshStats, refreshFlow, refreshWh, refreshAlerts, refreshTop, refreshAct])

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard vận hành SWM</h1>
        </div>
      </div>

      {/* Mock Data Banner */}
      <MockDataBanner onReset={handleReset} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 xl:grid-cols-4">
        {statsData.map((stat, index) => {
          const iconCfg = STAT_ICONS[index] || STAT_ICONS[0]
          const IconComp = iconCfg.icon
          return (
            <div key={stat.id} className={`stat-card animate-slide-up stagger-${Math.min(index + 1, 5)}`}>
              <div className="stat-card-row">
                <div className={`stat-card-icon shrink-0 ${iconCfg.iconBg}`}>
                  <IconComp className={`h-5 w-5 sm:h-6 sm:w-6 ${iconCfg.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="kpi-value-sm">{formatStatValue(stat)}</span>
                    <span className={`ml-auto flex items-center gap-1 text-[11px] font-bold ${
                      stat.changeType === 'positive' ? 'text-success' : stat.changeType === 'negative' ? 'text-danger' : 'text-warning'
                    }`}>
                      {stat.changeType === 'positive' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatStatChange(stat)}
                    </span>
                  </div>
                  <p className="mt-2 kpi-label">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Row 1: Main Chart + Low Stock Alerts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 xl:grid-cols-3">
        {/* Biểu đồ xuất nhập kho */}
        <div className="content-section xl:col-span-2">
          <div className="content-section-header">
            <div>
              <h2 className="section-title">Xuất nhập kho</h2>
              <p className="section-description">7 ngày gần nhất</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-navy-600">Nhập kho</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-info" />
                <span className="text-navy-600">Xuất kho</span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-56 sm:mt-6 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="inbound" 
                  stroke="#22C55E" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorInbound)" 
                  name="inbound"
                />
                <Area 
                  type="monotone" 
                  dataKey="outbound" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorOutbound)" 
                  name="outbound"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cảnh báo tồn kho thấp */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="section-title">Cảnh báo tồn kho thấp</h2>
            </div>
          </div>
          <p className="mb-4 mt-4 section-description">{alertsData.length} sản phẩm</p>
          
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {alertsData.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-800">{item.name}</span>
                  <span className="text-xs text-navy-400">{item.warehouse}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-moon-200">
                    <div 
                      className="h-full rounded-full bg-danger transition-all duration-500" 
                      style={{ width: `${Math.min((item.current / item.min) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-navy-500">
                    {item.current}/{item.min}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Warehouse Distribution + Top Products + Recent Activities */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
        {/* Phân bổ tồn kho theo kho */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-ice" />
              <h2 className="section-title">Phân bổ tồn kho</h2>
            </div>
          </div>
          <div className="mt-3 h-44 sm:mt-4 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={whData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {whData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()} SP`, 'Số lượng']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {whData.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-navy-600">{item.name}</span>
                <span className="ml-auto text-xs font-semibold text-navy-800">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top sản phẩm xuất kho */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <h2 className="section-title">Top xuất kho</h2>
            </div>
          </div>
          <div className="mt-3 h-48 sm:mt-4 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  width={80}
                />
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()} SP`, 'Số lượng']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="quantity" fill="#4DC3E8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-ice" />
              <h2 className="section-title">Hoạt động gần đây</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2">
            {activitiesData.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 rounded-lg bg-moon-50 p-3">
                <div className={`mt-0.5 h-2 w-2 rounded-full ${
                  activity.type === 'inbound' ? 'bg-success' : 
                  activity.type === 'outbound' ? 'bg-info' : 
                  activity.type === 'transfer' ? 'bg-warning' : 'bg-navy-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-800 truncate">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-xs font-semibold ${
                      activity.quantity.startsWith('+') ? 'text-success' : 
                      activity.quantity.startsWith('-') ? 'text-danger' : 'text-navy-600'
                    }`}>
                      {activity.quantity}
                    </span>
                    <span className="text-xs text-navy-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  activity.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                }`}>
                  {activity.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
