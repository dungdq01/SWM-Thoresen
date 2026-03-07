import { forwardRef } from 'react'
import { cn } from '@shared/lib/cn'

export const Switch = forwardRef(
  ({ label, description, checked, onChange, disabled, className, ...props }, ref) => {
    return (
      <label className={cn('flex items-start gap-3 cursor-pointer', disabled && 'cursor-not-allowed opacity-60', className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange?.(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2',
            checked ? 'bg-primary-600' : 'bg-navy-200'
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0.5',
              'mt-0.5'
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium text-navy-900">{label}</span>}
            {description && <span className="text-sm text-navy-500">{description}</span>}
          </div>
        )}
      </label>
    )
  }
)

Switch.displayName = 'Switch'
