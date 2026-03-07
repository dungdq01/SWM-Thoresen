import { cn } from '@shared/lib/cn'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export function Table({ children, className }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-navy-200', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function TableHeader({ children, className }) {
  return (
    <thead className={cn('bg-navy-50 border-b border-navy-200', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }) {
  return <tbody className={cn('divide-y divide-navy-100', className)}>{children}</tbody>
}

export function TableRow({ children, className, onClick, hoverable = true }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        hoverable && 'hover:bg-navy-50/50',
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
        'px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider',
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
        'px-4 py-3 text-navy-700',
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
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-navy-500">{message}</p>
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
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-navy-500">Đang tải dữ liệu...</p>
        </div>
      </td>
    </tr>
  )
}

export function Pagination({ page, totalPages, onPageChange, className }) {
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-t border-navy-100', className)}>
      <p className="text-sm text-navy-600">
        Trang <span className="font-medium">{page}</span> / {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => canGoPrev && onPageChange(page - 1)}
          disabled={!canGoPrev}
          className={cn(
            'p-2 rounded-lg transition-colors',
            canGoPrev
              ? 'text-navy-600 hover:bg-navy-100'
              : 'text-navy-300 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => canGoNext && onPageChange(page + 1)}
          disabled={!canGoNext}
          className={cn(
            'p-2 rounded-lg transition-colors',
            canGoNext
              ? 'text-navy-600 hover:bg-navy-100'
              : 'text-navy-300 cursor-not-allowed'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
