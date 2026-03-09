import { cn } from '@shared/lib/cn'

const toneClasses = {
  navy: {
    chip: 'bg-navy-800 text-ice-light',
    stroke: '#1e3055',
    fill: 'rgba(30, 48, 85, 0.14)',
    accent: '#60a5fa',
  },
  ice: {
    chip: 'bg-ice/20 text-ice-dark',
    stroke: '#60a5fa',
    fill: 'rgba(96, 165, 250, 0.18)',
    accent: '#3b82f6',
  },
  success: {
    chip: 'bg-success/12 text-success',
    stroke: '#2E8B57',
    fill: 'rgba(46, 139, 87, 0.16)',
    accent: '#1F6B43',
  },
  warning: {
    chip: 'bg-warning/12 text-warning',
    stroke: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.16)',
    accent: '#B45309',
  },
  danger: {
    chip: 'bg-danger/12 text-danger',
    stroke: '#DC2626',
    fill: 'rgba(220, 38, 38, 0.14)',
    accent: '#991B1B',
  },
  info: {
    chip: 'bg-info/12 text-info',
    stroke: '#2563EB',
    fill: 'rgba(37, 99, 235, 0.14)',
    accent: '#1D4ED8',
  },
}

function createSyntheticSeries(item, fallback = 0) {
  const base = Math.max(8, Math.min(92, Number(fallback) || 0))
  const patternMap = {
    bar: [0.52, 0.74, 0.61, 0.88, 0.69, 0.82],
    line: [0.46, 0.58, 0.54, 0.72, 0.67, 0.81],
    area: [0.38, 0.52, 0.49, 0.71, 0.64, 0.78],
  }
  const chartType = item.chartType || 'bar'
  const pattern = patternMap[chartType] || patternMap.bar
  return pattern.map((factor, index) => {
    const drift = (index % 2 === 0 ? -1 : 1) * Math.min(8, base * 0.08)
    return Math.max(4, Math.min(100, Math.round(base * factor + drift + 18)))
  })
}

function normalizeSeries(series = [], item, fallback = 0) {
  const base = series.length ? series : createSyntheticSeries(item, fallback)
  return base.map((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  })
}

function buildSeries(item) {
  const fallback = Number(item.percent ?? 0)
  const series = normalizeSeries(item.series, item, fallback)
  if (series.some((value) => value > 1)) return series
  return series.map((value) => value * 100)
}

function toPoints(series, width, height, padding) {
  const max = Math.max(...series, 1)
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  return series.map((value, index) => {
    const x = padding + (innerWidth * index) / Math.max(series.length - 1, 1)
    const y = height - padding - (value / max) * innerHeight
    return [x, y]
  })
}

function buildPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
}

function buildAreaPath(points, width, height, padding) {
  if (!points.length) return ''
  const start = points[0]
  const end = points[points.length - 1]
  return `${buildPath(points)} L ${end[0]} ${height - padding} L ${start[0]} ${height - padding} Z`
}

function MiniChart({ item, tone }) {
  const type = item.chartType || 'bar'
  const width = 260
  const height = 92
  const padding = 10
  const series = buildSeries(item)
  const max = Math.max(...series, 1)
  const points = toPoints(series, width, height, padding)

  if (type === 'line' || type === 'area') {
    const linePath = buildPath(points)
    const areaPath = buildAreaPath(points, width, height, padding)

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="visual-chart" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`gradient-${item.key || item.title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone.fill} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((marker) => (
          <line
            key={marker}
            x1={padding}
            y1={height - padding - (height - padding * 2) * marker}
            x2={width - padding}
            y2={height - padding - (height - padding * 2) * marker}
            stroke="rgba(148, 163, 184, 0.18)"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill={`url(#gradient-${item.key || item.title})`} />
        <path d={linePath} fill="none" stroke={tone.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], index) => (
          <circle key={`${item.key || item.title}-${index}`} cx={x} cy={y} r="3.5" fill={tone.accent} />
        ))}
      </svg>
    )
  }

  const innerWidth = width - padding * 2
  const gap = 10
  const barWidth = (innerWidth - gap * (series.length - 1)) / series.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="visual-chart" role="img" aria-hidden="true">
      {[0.25, 0.5, 0.75].map((marker) => (
        <line
          key={marker}
          x1={padding}
          y1={height - padding - (height - padding * 2) * marker}
          x2={width - padding}
          y2={height - padding - (height - padding * 2) * marker}
          stroke="rgba(148, 163, 184, 0.18)"
          strokeDasharray="4 4"
        />
      ))}
      {series.map((value, index) => {
        const barHeight = (value / max) * (height - padding * 2)
        const x = padding + index * (barWidth + gap)
        const y = height - padding - barHeight

        return (
          <g key={`${item.key || item.title}-${index}`}>
            <rect x={x} y={padding} width={barWidth} height={height - padding * 2} rx="8" fill="rgba(148, 163, 184, 0.08)" />
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="8" fill={tone.stroke} />
          </g>
        )
      })}
    </svg>
  )
}

export function PageVisualDashboard({ items = [], className }) {
  if (!items.length) return null

  return (
    <div className={cn('page-visual-dashboard', className)}>
      {items.map((item) => {
        const tone = toneClasses[item.tone] || toneClasses.navy
        const Icon = item.icon

        return (
          <div key={item.key || item.title || item.label} className="visual-card animate-slide-up">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                {item.label ? <p className="visual-card-label">{item.label}</p> : null}
                <div className="flex items-center gap-2">
                  {Icon ? (
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tone.chip)}>
                      <Icon className="h-4 w-4" />
                    </div>
                  ) : null}
                  <div>
                    <p className="visual-card-title">{item.title}</p>
                    {item.value ? <p className="visual-card-value">{item.value}</p> : null}
                  </div>
                </div>
              </div>
              {item.badge ? <span className={cn('visual-card-badge', tone.chip)}>{item.badge}</span> : null}
            </div>

            <MiniChart item={item} tone={tone} />

            <div className="flex items-center justify-between gap-3">
              <p className="visual-card-note">{item.note}</p>
              {item.helper ? <span className="visual-card-helper">{item.helper}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
