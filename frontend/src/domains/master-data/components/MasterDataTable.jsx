import { Edit, Power, PowerOff, Eye } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  Pagination,
} from '@shared/ui'

export function ActionMenu({ onView, onEdit, onDeactivate, onReactivate, isActive }) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {onView && (
        <button
          onClick={(e) => { e.stopPropagation(); onView() }}
          title="Xem chi tiết"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          title="Chỉnh sửa"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-ice/15 hover:text-ice-dark"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )}
      {isActive && onDeactivate && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeactivate() }}
          title="Ngừng hoạt động"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <PowerOff className="h-3.5 w-3.5" />
        </button>
      )}
      {!isActive && onReactivate && (
        <button
          onClick={(e) => { e.stopPropagation(); onReactivate() }}
          title="Kích hoạt lại"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-success/10 hover:text-success"
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function MasterDataTableWrapper({
  children,
  isLoading,
  isEmpty,
  emptyMessage = 'Không có dữ liệu',
  colSpan = 5,
  page,
  totalPages,
  onPageChange,
  className,
}) {
  return (
    <div className={cn('wrs-card overflow-hidden', className)}>
      <Table>
        {children}
        <TableBody>
          {isLoading && <TableLoading colSpan={colSpan} />}
          {!isLoading && isEmpty && <TableEmpty message={emptyMessage} colSpan={colSpan} />}
        </TableBody>
      </Table>
      {!isLoading && !isEmpty && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
