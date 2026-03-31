import { useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Package,
  TrendingDown, TrendingUp, Activity, Boxes, Clock,
  ChevronRight, Zap, ShieldAlert, CheckCircle2,
  AlertCircle, Info, XCircle,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { Badge, AiSuggestionCard } from '@shared/ui'

// ─── Placeholder data (will be replaced by real API calls) ─────────────────────
const PLACEHOLDER_STATS = [
  { id: 1, key: 'totalProducts', label: 'Tổng sản phẩm', value: 0, change: 0, changeType: 'positive' },
  { id: 2, key: 'inboundToday', label: 'Nhập hôm nay', value: 0, change: 0, changeType: 'positive' },
  { id: 3, key: 'outboundToday', label: 'Xuất hôm nay', value: 0, change: 0, changeType: 'positive' },
  { id: 4, key: 'exceptions', label: 'Exception', value: 0, change: 0, changeType: 'warning' },
]
const PLACEHOLDER_FLOW = []
const PLACEHOLDER_WAREHOUSE = []
const PLACEHOLDER_ALERTS = []
const PLACEHOLDER_TOP = []
const PLACEHOLDER_ACTIVITIES = []
const PLACEHOLDER_EXCEPTIONS = []

// ─── Workflow status config (UX spec: Grey/Blue/Orange/Green/Red) ─────────────
const STATUS_CONFIG = {
  draft:     { label: 'Draft',      badgeVariant: 'draft',     icon: Clock },
  planned:   { label: 'Planned',    badgeVariant: 'planned',   icon: Info },
  transit:   { label: 'In Transit', badgeVariant: 'transit',   icon: Activity },
  completed: { label: 'Completed',  badgeVariant: 'completed', icon: CheckCircle2 },
  delayed:   { label: 'Trễ/Lỗi',   badgeVariant: 'delayed',   icon: XCircle },
}

// Priority config — dark mode compatible using Tailwind opacity modifiers
const PRIORITY_CONFIG = {
  critical: { label: 'Nghiêm trọng', color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-500/8 dark:bg-red-500/10',    border: 'border-red-300/60 dark:border-red-500/25',    dot: 'bg-red-500' },
  high:     { label: 'Cao',          color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/8 dark:bg-orange-500/10', border: 'border-orange-300/60 dark:border-orange-500/25', dot: 'bg-orange-500' },
  medium:   { label: 'Trung bình',   color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/8 dark:bg-blue-500/10',   border: 'border-blue-300/60 dark:border-blue-500/25',   dot: 'bg-blue-500' },
}

const STAT_ICONS = [
  { icon: Package,         iconBg: 'bg-navy-800',      iconColor: 'text-ice-light' },
  { icon: ArrowDownToLine, iconBg: 'bg-success/10',    iconColor: 'text-success' },
  { icon: ArrowUpFromLine, iconBg: 'bg-info/10',       iconColor: 'text-info' },
  { icon: AlertTriangle,   iconBg: 'bg-warning/10',    iconColor: 'text-warning' },
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

// ─── Custom chart tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-card)',
      padding: '10px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <p style={{ marginBottom: '6px', fontWeight: 600, color: 'var(--color-text)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ fontSize: '13px', color: entry.color }}>
          {entry.name === 'inbound' ? 'Nhập kho' : 'Xuất kho'}:{' '}
          <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Exception Card ────────────────────────────────────────────────────────────
// UX Principle #2: Exception-First Dashboard
function ExceptionCard({ item }) {
  const navigate = useNavigate()
  const priority = PRIORITY_CONFIG[item.priority]
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft
  const StatusIcon = statusCfg.icon

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:shadow-soft ${priority.bg} ${priority.border}`}
    >
      {/* Priority dot */}
      <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${priority.dot}`} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-bold ${priority.color}`}>{item.title}</span>
          <Badge variant={statusCfg.badgeVariant} dot size="sm">
            {statusCfg.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>{item.ref}</span>
          <span>{item.customer}</span>
          <span className={`font-semibold ${item.priority === 'critical' ? 'text-red-600 dark:text-red-400' : item.priority === 'high' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {item.dueLabel}
          </span>
        </div>
      </div>

      <button
        onClick={() => navigate(item.actionPath)}
        className="flex-shrink-0 flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
          color: 'var(--color-text)',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'}
      >
        {item.action}
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Exception Panel ───────────────────────────────────────────────────────────
function ExceptionPanel({ exceptions }) {
  const criticalCount = exceptions.filter(e => e.priority === 'critical').length
  const highCount = exceptions.filter(e => e.priority === 'high').length

  return (
    <div className="content-section border-l-4 border-l-red-500">
      <div className="content-section-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="section-title text-red-600 dark:text-red-400">Cần xử lý ngay</h2>
            <p className="section-description">
              {criticalCount > 0 && <span className="font-semibold text-red-600 dark:text-red-400">{criticalCount} nghiêm trọng</span>}
              {criticalCount > 0 && highCount > 0 && ' · '}
              {highCount > 0 && <span className="text-orange-600 dark:text-orange-400">{highCount} cao</span>}
              {exceptions.length - criticalCount - highCount > 0 && (
                <span> · {exceptions.length - criticalCount - highCount} trung bình</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[13px] font-bold text-white">
            {exceptions.length}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {exceptions.map(item => (
          <ExceptionCard key={item.id} item={item} />
        ))}
        {exceptions.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Không có exception. Hệ thống vận hành bình thường.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardPage() {
  // TODO: Replace with real API calls (e.g. useQuery from react-query)
  const statsData = PLACEHOLDER_STATS
  const flowData = PLACEHOLDER_FLOW
  const whData = PLACEHOLDER_WAREHOUSE
  const alertsData = PLACEHOLDER_ALERTS
  const topData = PLACEHOLDER_TOP
  const activitiesData = PLACEHOLDER_ACTIVITIES
  const exceptionsData = PLACEHOLDER_EXCEPTIONS

  const criticalCount = exceptionsData.filter(e => e.priority === 'critical').length

  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard vận hành SWM</h1>
          <p className="page-description">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-3 sm:px-4 py-2 sm:py-2.5">
            <AlertCircle className="h-4 w-4 text-[#ef4444] flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-[#b91c1c]">
              {criticalCount} vấn đề nghiêm trọng
            </span>
          </div>
        )}
      </div>

      {/* ── ZONE 1: Exception-First (UX Principle #2) ── */}
      <ExceptionPanel exceptions={exceptionsData} />

      {/* ── ZONE 1b: AI Suggestions (UX Principle #5: System-Suggest, Human-Approve) ── */}
      <div className="content-section">
        <div className="content-section-header">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff]">
              <Zap className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="section-title">Đề xuất từ AI</h2>
              <p className="section-description">Hệ thống phân tích và gợi ý hành động tối ưu</p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <AiSuggestionCard
            risk="medium"
            title="Tái phân bổ lộ trình lô OUT-2403-089"
            summary="Chuyển sang Carrier B (TVL Express) để giao đúng hạn. Tiết kiệm ước tính 2–3 giờ."
            reason="Carrier A hiện có 3 lô overdue trong cùng tuyến HCM–Bình Dương. Carrier B còn capacity và điểm xuất phát gần kho hơn 12km. Dữ liệu lịch sử 30 ngày: Carrier B có on-time rate 94% vs 81% của Carrier A."
            confidence={87}
            onApprove={() => {}}
            onDismiss={() => {}}
          />
          <AiSuggestionCard
            risk="medium"
            title="Tạo Purchase Order cho 3 SKU sắp hết hàng"
            summary="SKU BD-6205, VB-SKF-005, DN-SHELL-003 dự báo hết hàng trong 4–6 ngày. Đề xuất PO tự động."
            reason="Dựa trên tốc độ tiêu thụ trung bình 30 ngày và lead time lịch sử của NCC Samsung (3 ngày). Nếu không đặt hàng trong hôm nay, xác suất stockout là 78%."
            confidence={91}
            onApprove={() => {}}
            onDismiss={() => {}}
          />
          <AiSuggestionCard
            risk="high"
            title="Cảnh báo: Chia tách lô hàng PO-2403-112 có thể gây sai lệch GRN"
            summary="Lô hàng Samsung giao 2 chuyến. Nếu tạo GRN riêng biệt, tồn kho sẽ bị ghi nhận 2 lần."
            reason="Hệ thống phát hiện PO-2403-112 có 2 ASN từ cùng NCC trong cùng ngày. Theo quy trình, cần merge thành 1 GRN hoặc dùng Split Receipt. Thao tác này ảnh hưởng đến billing và audit trail — AI không tự xử lý."
            onApprove={() => {}}
            onDismiss={() => {}}
          />
        </div>
      </div>

      {/* ── ZONE 2: KPI Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 xl:grid-cols-4">
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
                      stat.changeType === 'positive' ? 'text-success'
                      : stat.changeType === 'negative' ? 'text-danger'
                      : 'text-warning'
                    }`}>
                      {stat.changeType === 'positive'
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
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

      {/* ── ZONE 3: Charts — Inventory Flow + Low Stock ── */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 xl:grid-cols-3">
        {/* Area chart */}
        <div className="content-section xl:col-span-2">
          <div className="content-section-header">
            <div>
              <h2 className="section-title">Xuất nhập kho</h2>
              <p className="section-description">7 ngày gần nhất</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#10b981]" />
                <span className="text-navy-600">Nhập</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#3b82f6]" />
                <span className="text-navy-600">Xuất</span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-56 sm:mt-6 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="inbound" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInbound)" name="inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOutbound)" name="outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="section-title">Cảnh báo tồn kho thấp</h2>
            </div>
          </div>
          <p className="mb-4 mt-4 section-description">{alertsData.length} sản phẩm</p>
          <div className="max-h-64 space-y-4 overflow-y-auto pr-2">
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

      {/* ── ZONE 4: Distribution + Top Products + Activities ── */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
        {/* Warehouse Distribution */}
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
                <Pie data={whData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {whData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v.toLocaleString()} SP`, 'Số lượng']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: 'var(--color-text-secondary)' }}
                  labelStyle={{ color: 'var(--color-text)' }}
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

        {/* Top Outbound */}
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
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={80} />
                <Tooltip
                  formatter={(v) => [`${v.toLocaleString()} SP`, 'Số lượng']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: 'var(--color-text-secondary)' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="content-section">
          <div className="content-section-header">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-ice" />
              <h2 className="section-title">Hoạt động gần đây</h2>
            </div>
          </div>
          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
            {activitiesData.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 rounded-lg bg-moon-50 p-3">
                <div className={`mt-0.5 h-2 w-2 rounded-full ${
                  activity.type === 'inbound'   ? 'bg-[#10b981]'
                  : activity.type === 'outbound' ? 'bg-[#3b82f6]'
                  : activity.type === 'transfer' ? 'bg-[#f97316]'
                  : 'bg-navy-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-800">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-xs font-semibold ${
                      activity.quantity.startsWith('+') ? 'text-[#10b981]'
                      : activity.quantity.startsWith('-') ? 'text-danger'
                      : 'text-navy-600'
                    }`}>
                      {activity.quantity}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-navy-400">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </span>
                  </div>
                </div>
                {/* Dùng workflow status badge */}
                <Badge
                  variant={activity.status === 'completed' ? 'completed' : 'transit'}
                  dot
                  size="sm"
                >
                  {activity.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
