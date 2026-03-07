import { MoreHorizontal, Edit, Power, PowerOff, Eye } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-soft-lg border border-navy-100 py-1 z-10">
          {onView && (
            <button
              onClick={() => { onView(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Xem chi tiết
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Chỉnh sửa
            </button>
          )}
          {isActive && onDeactivate && (
            <button
              onClick={() => { onDeactivate(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <PowerOff className="w-4 h-4" />
              Ngừng hoạt động
            </button>
          )}
          {!isActive && onReactivate && (
            <button
              onClick={() => { onReactivate(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
            >
              <Power className="w-4 h-4" />
              Kích hoạt lại
            </button>
          )}
        </div>
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
    <div className={cn('bg-white rounded-2xl shadow-soft-md overflow-hidden', className)}>
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
