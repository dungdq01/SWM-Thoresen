import { cn } from '@shared/lib/cn'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, Loader2 } from 'lucide-react'

export function Table({ children, className, minWidth = 1000 }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm" style={{ minWidth }}>{children}</table>
      </div>
    </div>
  )
}

export function TableHeader({ children, className }) {
  return (
    <thead className={cn('[&_tr]:border-b', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>
}

export function TableRow({ children, className, onClick, hoverable = true }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'group border-b transition-colors',
        hoverable && 'hover:bg-muted/50',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className, align = 'left' }) {
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:h-11 sm:px-4 sm:text-xs',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className, align = 'left' }) {
  return (
    <td
      className={cn(
        'px-3 py-3 align-middle text-xs text-foreground sm:px-4 sm:py-4 sm:text-sm',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </td>
  )
}

export function TableEmpty({ message = 'Không có dữ liệu', colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center sm:px-4 sm:py-12">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted sm:h-16 sm:w-16">
            <Inbox className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">Hãy thay đổi bộ lọc hoặc thêm dữ liệu mới để tiếp tục.</p>
        </div>
      </td>
    </tr>
  )
}

export function TableLoading({ colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center sm:px-4 sm:py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-ice sm:h-8 sm:w-8" />
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </td>
    </tr>
  )
}

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages = []
  if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', totalPages)
  } else if (page >= totalPages - 3) {
    pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
  }
  return pages
}

export function Pagination({ page, totalPages, onPageChange, total, pageSize, className }) {
  const canGoPrev = page > 1
  const canGoNext = page < totalPages
  const pages = getPageNumbers(page, totalPages)

  const navBtn = (onClick, disabled, icon) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-muted cursor-pointer'
      )}
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
      }}
    >
      {icon}
    </button>
  )

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3', className)}
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Left: record info */}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {total != null && pageSize != null ? (
          <>
            Hiển thị{' '}
            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
              {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}
            </span>
            {' '}/ {total} bản ghi
          </>
        ) : (
          <>
            Trang <span className="font-medium" style={{ color: 'var(--color-text)' }}>{page}</span> / {totalPages}
          </>
        )}
      </p>

      {/* Right: navigation */}
      <div className="flex items-center gap-1">
        {navBtn(() => onPageChange(1), !canGoPrev, <ChevronsLeft className="w-4 h-4" />)}
        {navBtn(() => onPageChange(page - 1), !canGoPrev, <ChevronLeft className="w-4 h-4" />)}

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs select-none"
              style={{ color: 'var(--color-text-muted)' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium border transition-colors',
                p === page ? '' : 'hover:bg-muted cursor-pointer'
              )}
              style={p === page ? {
                backgroundColor: 'var(--color-ice, #60a5fa)',
                borderColor: 'var(--color-ice, #60a5fa)',
                color: '#fff',
              } : {
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text)',
              }}
            >
              {p}
            </button>
          )
        )}

        {navBtn(() => onPageChange(page + 1), !canGoNext, <ChevronRight className="w-4 h-4" />)}
        {navBtn(() => onPageChange(totalPages), !canGoNext, <ChevronsRight className="w-4 h-4" />)}
      </div>
    </div>
  )
}
