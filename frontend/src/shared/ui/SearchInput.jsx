import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const SearchInput = forwardRef(
  ({ value, onChange, onClear, placeholder = 'Tìm kiếm...', className, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 rounded-xl border border-navy-200 bg-white',
            'text-navy-900 placeholder:text-navy-400',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            'hover:border-navy-300'
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
