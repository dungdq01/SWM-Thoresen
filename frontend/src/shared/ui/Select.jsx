import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const Select = forwardRef(
  ({ label, error, hint, options = [], placeholder, className, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white text-navy-900 appearance-none',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-navy-200 hover:border-navy-300',
              props.disabled && 'bg-navy-50 text-navy-500 cursor-not-allowed',
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 pointer-events-none" />
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-sm text-navy-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
