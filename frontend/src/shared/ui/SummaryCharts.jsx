import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const RADIAN = Math.PI / 180

/**
 * SummaryDonut — A donut chart with center label + right-side legend.
 * @param {{ data: { name: string, value: number, color: string }[], centerLabel?: string, centerValue?: string|number, size?: number, className?: string }} props
 */
export function SummaryDonut({ data, centerLabel, centerValue, size = 160, className = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const filteredData = data.filter((d) => d.value > 0)
  const chartData = filteredData.length > 0 ? filteredData : [{ name: 'Empty', value: 1, color: '#e5e7eb' }]
  const isEmpty = filteredData.length === 0

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <div style={{ width: size, height: size }} className="shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.46}
              paddingAngle={filteredData.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="none"
              animationDuration={600}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-navy-900 leading-none">{centerValue ?? total}</span>
            {centerLabel && <span className="text-[10px] text-navy-400 mt-0.5">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-navy-600 truncate flex-1">{item.name}</span>
            <span className="font-semibold text-navy-900 tabular-nums">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * MiniBarList — Horizontal bar list with labels and values.
 * @param {{ data: { name: string, value: number, color: string, maxValue?: number }[], className?: string }} props
 */
export function MiniBarList({ data, className = '' }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={`space-y-2.5 ${className}`}>
      {data.map((item) => {
        const pct = (item.value / (item.maxValue || maxVal)) * 100
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-navy-600">{item.name}</span>
              <span className="font-semibold text-navy-900 tabular-nums">{item.value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-moon-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * ProgressRing — Circular progress indicator for single metric.
 * @param {{ value: number, max?: number, size?: number, color?: string, label?: string, className?: string }} props
 */
export function ProgressRing({ value, max = 100, size = 80, color = '#3b82f6', label, className = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={6}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-navy-900">{pct.toFixed(0)}%</span>
        </div>
      </div>
      {label && <span className="text-xs text-navy-500 mt-1">{label}</span>}
    </div>
  )
}

/**
 * StatHighlight — A single stat with icon background, value, and label.
 * @param {{ value: string|number, label: string, color?: string, icon?: React.ReactNode, className?: string }} props
 */
export function StatHighlight({ value, label, color = 'text-navy-900', bgColor = 'bg-moon-50', icon, className = '' }) {
  return (
    <div className={`rounded-xl p-4 ${bgColor} ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className={`text-2xl font-bold leading-tight ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-xs text-navy-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * TrendMiniChart — A tiny area/bar chart for trend data.
 * @param {{ data: { label: string, value1: number, value2?: number }[], color1?: string, color2?: string, legend1?: string, legend2?: string, height?: number, className?: string }} props
 */
export function TrendMiniChart({ data, color1 = '#10b981', color2 = '#3b82f6', legend1, legend2, height = 180, className = '' }) {
  const hasSecondSeries = data.some((d) => d.value2 !== undefined)

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barGap={2} barSize={hasSecondSeries ? 12 : 20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            itemStyle={{ color: 'var(--color-text-secondary)' }}
            formatter={(value) => value.toLocaleString()}
          />
          <Bar dataKey="value1" fill={color1} radius={[4, 4, 0, 0]} name={legend1 || 'Series 1'} />
          {hasSecondSeries && <Bar dataKey="value2" fill={color2} radius={[4, 4, 0, 0]} name={legend2 || 'Series 2'} />}
        </BarChart>
      </ResponsiveContainer>
      {(legend1 || legend2) && (
        <div className="flex gap-4 mt-2 text-xs text-navy-400 justify-center">
          {legend1 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color1 }} />{legend1}</span>}
          {legend2 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color2 }} />{legend2}</span>}
        </div>
      )}
    </div>
  )
}
