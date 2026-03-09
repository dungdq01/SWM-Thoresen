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
        'border-b transition-colors',
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
        'h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
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
        'p-4 align-middle text-sm text-foreground',
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
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-8 w-8 text-muted-foreground" />
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
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-ice" />
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
    <div className={cn('flex items-center justify-between border-t border-border px-4 py-4', className)}>
      <p className="text-sm text-muted-foreground">
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
