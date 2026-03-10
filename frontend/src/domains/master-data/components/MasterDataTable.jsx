import { MoreHorizontal, Edit, Power, PowerOff, Eye } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 176, // 176 = w-44 (11rem)
      })
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-navy-900"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="fixed z-50 w-44 rounded-xl border border-moon-200 bg-white py-1 text-navy-800 shadow-card-lg"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {onView && (
            <button
              onClick={() => { onView(); setIsOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-200 hover:bg-moon-50"
            >
              <Eye className="w-4 h-4" />
              Xem chi tiết
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-200 hover:bg-moon-50"
            >
              <Edit className="w-4 h-4" />
              Chỉnh sửa
            </button>
          )}
          {isActive && onDeactivate && (
            <button
              onClick={() => { onDeactivate(); setIsOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger transition-colors duration-200 hover:bg-danger/5"
            >
              <PowerOff className="w-4 h-4" />
              Ngừng hoạt động
            </button>
          )}
          {!isActive && onReactivate && (
            <button
              onClick={() => { onReactivate(); setIsOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-success transition-colors duration-200 hover:bg-success/5"
            >
              <Power className="w-4 h-4" />
              Kích hoạt lại
            </button>
          )}
        </div>,
        document.body
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
