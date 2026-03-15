import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const variants = {
  primary:       'bg-navy-800 text-moon-100 shadow-sm hover:bg-navy-700 dark:bg-navy-700 dark:hover:bg-navy-600',
  secondary:     'border-2 border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg-subtle)]',
  outline:       'border-2 border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] shadow-sm hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]',
  'outline-light': 'border-2 border-white/30 bg-transparent text-white shadow-sm hover:bg-white/10 hover:border-white/50',
  ghost:         'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]',
  accent:        'bg-ice text-white shadow-glow-ice hover:bg-ice-dark',
  danger:        'bg-danger text-white shadow-sm hover:bg-danger/90',
  destructive:   'bg-danger text-white shadow-sm hover:bg-danger/90',
  link:          'h-auto p-0 text-ice-dark underline-offset-4 hover:underline',
}

const sizes = {
  sm:   'h-8 rounded-xl px-3 text-xs',
  md:   'h-10 rounded-xl px-4 text-sm',
  lg:   'h-12 rounded-xl px-8 text-sm',
  icon: 'h-10 w-10 rounded-xl p-0',
}

const Button = forwardRef(({
  children, variant = 'primary', size = 'md', className,
  icon, iconPosition = 'left', isLoading = false, ...props
}, ref) => {
  return (
    <button
      type={props.type ?? 'button'}
      ref={ref}
      className={cn(
        'btn-base inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/30 focus-visible:ring-offset-2',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        isLoading && 'cursor-wait opacity-80',
        className
      )}
      disabled={props.disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {icon && iconPosition === 'left'  ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
      {children                          ? <span className="inline-flex items-center">{children}</span> : null}
      {icon && iconPosition === 'right' ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
    </button>
  )
})

Button.displayName = 'Button'
export { Button }
