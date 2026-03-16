import { useState } from 'react'
import { Mail } from 'lucide-react'
import {
  Button, Input, Select, Pagination,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from '@shared/ui'

/**
 * Lô hàng xuất (Outbound Shipments)
 * 
 * Status: 🔄 PENDING REDESIGN
 * Logic đã được xóa để định nghĩa lại từ đầu.
 * Giữ lại layout cơ bản.
 */

const SHIPMENT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'ALLOCATED', label: 'Đã phân bổ' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
  { value: 'LOADING', label: 'Đang xếp hàng' },
  { value: 'SHIPPED', label: 'Đã xuất' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '', status: '' })

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lô hàng xuất</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" disabled>+ Tạo lô xuất</Button>
          <Button variant="outline" size="sm">Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {SHIPMENT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Tìm theo mã lô, biển số xe..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
          <Select
            value=""
            onChange={() => {}}
            options={[{ value: '', label: 'Chọn...' }]}
            placeholder="Chọn..."
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã lô</TableHead>
              <TableHead>Xe / SO</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead align="right">KL dự kiến</TableHead>
              <TableHead align="right">KL đã xuất</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmpty colSpan={7}>
              <div className="flex flex-col items-center justify-center py-8">
                <Mail className="h-12 w-12 text-navy-300 mb-3" />
                <p className="text-navy-600 font-medium">Chưa có lô hàng xuất nào</p>
                <p className="text-sm text-navy-400 mt-1">
                  Hãy thay đổi bộ lọc hoặc nhấn tải mới để tiếp tục.
                </p>
              </div>
            </TableEmpty>
          </TableBody>
        </Table>

        {/* Pagination */}
        <Pagination
          page={filters.page}
          totalPages={1}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>
    </>
  )
}
