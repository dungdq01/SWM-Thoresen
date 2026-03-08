import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const Input = forwardRef(
  ({ label, error, hint, className, required, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-semibold text-navy-700">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'wrs-input flex file:border-0 file:bg-transparent file:text-sm file:font-medium ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-danger/40 focus-visible:ring-danger/20'
                : 'hover:border-moon-300',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              props.disabled && 'bg-moon-50 text-navy-300',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">
              {rightIcon}
            </div>
          )}
        </div>
        {hint && !error && (
          <p className="form-hint">{hint}</p>
        )}
        {error && (
          <p className="form-error">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
