import { cn } from '@shared/lib/cn'
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react'

export function Table({ children, className }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">{children}</table>
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

export function Pagination({ page, totalPages, onPageChange, className }) {
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  return (
    <div className={cn('flex items-center justify-between border-t border-border px-3 py-3 sm:px-4 sm:py-4', className)}>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Trang <span className="font-medium">{page}</span> / {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => canGoPrev && onPageChange(page - 1)}
          disabled={!canGoPrev}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors',
            canGoPrev
              ? 'text-foreground hover:bg-muted'
              : 'cursor-not-allowed text-muted-foreground opacity-50'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => canGoNext && onPageChange(page + 1)}
          disabled={!canGoNext}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors',
            canGoNext
              ? 'text-foreground hover:bg-muted'
              : 'cursor-not-allowed text-muted-foreground opacity-50'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
