import { cn } from '@shared/lib/cn'

export function Card({ children, className, hover = true, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-6 shadow-card border border-navy-100/50',
        hover && 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardIcon({ children, className }) {
  return (
    <div className={cn(
      'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
      'bg-gradient-to-br from-primary-50 to-primary-100',
      className
    )}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-lg font-semibold text-navy-900 mb-2', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }) {
  return (
    <p className={cn('text-navy-600 text-sm leading-relaxed', className)}>
      {children}
    </p>
  )
}
