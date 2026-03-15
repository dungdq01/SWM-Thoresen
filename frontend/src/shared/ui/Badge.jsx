import { cn } from '@shared/lib/cn'

const variants = {
  default:  'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  neutral:  'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  primary:  'bg-ice/15 text-ice-dark dark:bg-ice/20 dark:text-ice-light',
  success:  'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning:  'bg-amber-500/12  text-amber-700  dark:bg-amber-500/15  dark:text-amber-400',
  danger:   'bg-red-500/12    text-red-600    dark:bg-red-500/15    dark:text-red-400',
  error:    'bg-red-500/12    text-red-600    dark:bg-red-500/15    dark:text-red-400',
  info:     'bg-blue-500/12   text-blue-600   dark:bg-blue-500/15   dark:text-blue-400',
  // Owner group — semantically distinct colors
  local:   'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  foreign: 'bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  // Workflow status — tự đổi sáng/tối qua CSS vars
  draft:     'bg-[var(--status-draft-bg)]   text-[var(--status-draft-text)]',
  planned:   'bg-[var(--status-planned-bg)] text-[var(--status-planned-text)]',
  transit:   'bg-[var(--status-transit-bg)] text-[var(--status-transit-text)]',
  completed: 'bg-[var(--status-done-bg)]    text-[var(--status-done-text)]',
  delayed:   'bg-[var(--status-delayed-bg)] text-[var(--status-delayed-text)]',
}

const dotColors = {
  success:   'bg-success',   warning: 'bg-warning',    danger:    'bg-danger',
  error:     'bg-red-500',   info:    'bg-info',        neutral: 'bg-[var(--color-text-muted)]',
  primary:   'bg-ice',       default: 'bg-[var(--color-text-muted)]',
  local:     'bg-emerald-500', foreign: 'bg-violet-500',
  draft:     'bg-[var(--status-draft-text)]',
  planned:   'bg-[var(--status-planned-text)]',
  transit:   'bg-[var(--status-transit-text)]',
  completed: 'bg-[var(--status-done-text)]',
  delayed:   'bg-[var(--status-delayed-text)]',
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-[11px]',
  lg: 'px-3 py-1 text-xs',
}

export function Badge({ children, variant = 'default', size = 'md', dot = false, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg font-bold', variants[variant], sizes[size], className)}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant] ?? 'bg-current')} />
      )}
      {children}
    </span>
  )
}
