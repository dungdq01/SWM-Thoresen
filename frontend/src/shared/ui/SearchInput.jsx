import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const SearchInput = forwardRef(
  ({ value, onChange, onClear, placeholder = 'Tìm kiếm...', className, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ice" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'wrs-input pl-10 pr-10',
            'hover:border-moon-400'
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
