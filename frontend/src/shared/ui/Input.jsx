import { forwardRef } from 'react'
import { cn } from '@shared/lib/cn'

export const Input = forwardRef(
  ({ label, error, hint, className, required, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
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
              'w-full px-4 py-2.5 rounded-xl border bg-white text-navy-900 placeholder:text-navy-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-navy-200 hover:border-navy-300',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              props.disabled && 'bg-navy-50 text-navy-500 cursor-not-allowed',
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
          <p className="mt-1.5 text-sm text-navy-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
