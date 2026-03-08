import { forwardRef } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const Select = forwardRef(
  ({ label, error, hint, options = [], placeholder, className, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-semibold text-navy-700">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'wrs-input flex appearance-none pr-10 ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-danger/40 focus-visible:ring-danger/20'
                : 'hover:border-moon-300',
              props.disabled && 'bg-moon-50 text-navy-300',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        </div>
        {hint && !error && (
          <p className="form-hint">{hint}</p>
        )}
        {error && (
          <p className="form-error"><AlertCircle className="h-3 w-3" />{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
