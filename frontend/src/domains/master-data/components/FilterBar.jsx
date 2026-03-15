import { Search, Filter, X } from 'lucide-react'
import { useState } from 'react'
import { Input, Select, Button } from '@shared/ui'
import { cn } from '@shared/lib/cn'

export function FilterBar({
  keyword,
  onKeywordChange,
  filters = [],
  onFilterChange,
  filterValues = {},
  onClearFilters,
  placeholder = 'Tìm kiếm...',
  className,
}) {
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters = Object.values(filterValues).some((v) => v !== '' && v !== undefined)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {filters.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && 'border-ice text-ice-dark')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Bộ lọc
            {hasActiveFilters && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-ice text-[11px] font-bold text-white">
                {Object.values(filterValues).filter((v) => v !== '' && v !== undefined).length}
              </span>
            )}
          </Button>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="wrs-card flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4">
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[120px] sm:min-w-[160px] flex-1 sm:flex-none">
              <Select
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                options={filter.options}
                placeholder={filter.placeholder}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatusFilter({ value, onChange }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-40"
      placeholder="Tất cả trạng thái"
      options={[
        { value: 'true', label: 'Hoạt động' },
        { value: 'false', label: 'Ngừng hoạt động' },
      ]}
    />
  )
}
