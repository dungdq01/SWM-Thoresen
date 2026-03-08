import { cn } from '@shared/lib/cn'

const variants = {
  default: 'bg-navy-100 text-navy-700',
  neutral: 'bg-moon-100 text-navy-600',
  primary: 'bg-gold/15 text-gold-dark',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-[11px]',
  lg: 'px-3 py-1 text-xs',
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  dot = false,
  className 
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-bold',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-success',
          variant === 'warning' && 'bg-warning',
          variant === 'danger' && 'bg-danger',
          variant === 'info' && 'bg-info',
          variant === 'neutral' && 'bg-navy-400',
          variant === 'primary' && 'bg-gold',
          variant === 'default' && 'bg-navy-500',
        )} />
      )}
      {children}
    </span>
  )
}
