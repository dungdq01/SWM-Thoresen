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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
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
        <div className="wrs-card flex flex-wrap items-center gap-3 p-4">
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[160px]">
              <Select
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className="w-full"
              >
                <option value="">{filter.placeholder}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatusFilter({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-40">
      <option value="">Tất cả trạng thái</option>
      <option value="true">Hoạt động</option>
      <option value="false">Ngừng hoạt động</option>
    </Select>
  )
}
