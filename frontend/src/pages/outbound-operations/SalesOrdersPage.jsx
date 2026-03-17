import React, { useState, useCallback } from 'react'
import { Plus, Check, Trash2, Pencil, RotateCcw, FileOutput, ChevronDown, ChevronUp, Package } from 'lucide-react'
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCancelSalesOrder,
  useUnconfirmSalesOrder,
  useNextSoNumber,
  useCreateShipment,
} from '@domains/outbound-operations'
import { useLookupOwners, useLookupItems, useLookupUoms, useLookupWarehouses } from '@domains/master-data'
import {
  Badge, Button, Input, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow,
} from '@shared/ui'
import { SOFormDrawer, CreateShipmentModal } from '@features/outbound-operations'

const SO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'WEIGHING', label: 'Đang cân' },
  { value: 'PARTIAL', label: 'Xuất 1 phần' },
  { value: 'SHIPPED', label: 'Xuất đủ' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'NEW') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (status === 'WEIGHING') return 'warning'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'SHIPPED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'warning'
}

const STATUS_LABELS = { NEW: 'Tạo mới', CONFIRMED: 'Đã xác nhận', WEIGHING: 'Đang cân', PARTIAL: 'Xuất 1 phần', SHIPPED: 'Xuất đủ', CLOSED: 'Đã đóng', CANCELLED: 'Đã hủy' }

export function SalesOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [expandedId, setExpandedId] = useState(null)
  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])

  const isDrawerOpen = drawerState.isOpen
  const { data: nextSoNumber } = useNextSoNumber(isDrawerOpen && !drawerState.data)

  const { data: response, isLoading, refetch } = useSalesOrders({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const createSo = useCreateSalesOrder()
  const updateSo = useUpdateSalesOrder()
  const confirmSo = useConfirmSalesOrder()
  const cancelSo = useCancelSalesOrder()
  const unconfirmSo = useUnconfirmSalesOrder()

  // State for Shipment modal
  const createShipment = useCreateShipment()
  const [shipmentModalState, setShipmentModalState] = useState({ isOpen: false, so: null })
  const handleOpenShipmentModal = (so) => setShipmentModalState({ isOpen: true, so })
  const handleCloseShipmentModal = () => setShipmentModalState({ isOpen: false, so: null })
  const handleCreateShipment = async (payload) => {
    try {
      await createShipment.mutateAsync(payload)
      handleCloseShipmentModal()
    } catch {
      // Error handled by mutation
    }
  }

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || response?.items || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (so) => setDrawerState({ isOpen: true, data: so })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (payload) => {
    try {
      if (drawerState.data?.id) {
        await updateSo.mutateAsync({ id: drawerState.data.id, data: payload })
      } else {
        await createSo.mutateAsync(payload)
      }
      handleCloseDrawer()
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn bán hàng (Sales Orders)</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Tạo đơn xuất hàng
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {SO_STATUSES.map((s) => (
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
            placeholder="Tìm theo mã SO, khách hàng..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Số SO</TableHead>
              <TableHead>Loại SO</TableHead>
              <TableHead>Số B/L</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã xuất</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={10} />}
            {!isLoading && rows.length === 0 && (
              <TableEmpty colSpan={10}>
                <div className="flex flex-col items-center justify-center py-8">
                  <FileOutput className="h-12 w-12 text-navy-300 mb-3" />
                  <p className="text-navy-600 font-medium">Không có dữ liệu</p>
                  <p className="text-sm text-navy-400 mt-1">
                    Hãy thay đổi bộ lọc hoặc nhấn tải mới để tiếp tục.
                  </p>
                </div>
              </TableEmpty>
            )}
            {!isLoading && rows.map((so) => {
              const isExpanded = expandedId === so.id
              const totalExpectedFromLines = (so.lines || []).reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)
              const totalShippedFromLines = (so.lines || []).reduce((sum, l) => sum + Number(l.shippedQty || 0), 0)
              return (
                <React.Fragment key={so.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(so.id)}
                        className="p-1 text-navy-400 hover:text-ice transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-navy-900">{so.soNumber}</p>
                      <p className="text-xs text-navy-400">{so.lines?.length || so._count?.lines || 0} dòng</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={so.soType === 'SEA' ? 'info' : 'warning'} className="text-xs">
                        {so.soType === 'SEA' ? 'Đường thủy' : 'Đường bộ'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-navy-600">{so.blNumber || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-800">{so.owner?.ownerCode || so.owner?.code || so.ownerId}</p>
                      <p className="text-xs text-navy-400">{so.owner?.ownerName || so.owner?.name}</p>
                    </TableCell>
                    <TableCell>
                      {so.createdAt ? new Date(so.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell align="right" className="font-medium text-navy-900">
                      {totalExpectedFromLines.toLocaleString()} kg
                    </TableCell>
                    <TableCell align="right">
                      <span className={totalShippedFromLines > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                        {totalShippedFromLines.toLocaleString()} kg
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(so.status)}>{STATUS_LABELS[so.status] || so.status}</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        {so.status === 'NEW' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(so)} title="Chỉnh sửa">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="accent" size="sm" onClick={() => confirmSo.mutate(so.id)} title="Xác nhận">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelSo.mutate({ id: so.id, data: {} })} title="Xóa" className="text-danger hover:bg-danger/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {so.status === 'CONFIRMED' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => unconfirmSo.mutate(so.id)} title="Hủy xác nhận">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="accent" size="sm" onClick={() => handleOpenShipmentModal(so)} title="Tạo phiếu xuất">
                              <FileOutput className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {['PARTIAL', 'SHIPPED'].includes(so.status) && (
                          <span className="text-xs text-navy-400">Đang xử lý</span>
                        )}
                        {['CLOSED', 'CANCELLED'].includes(so.status) && (
                          <span className="text-xs text-navy-400">Hoàn tất</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expand: line details */}
                  {isExpanded && (
                    <tr key={`${so.id}-lines`}>
                      <td colSpan={10} className="p-0">
                        <div className="border-t border-b border-moon-200 bg-moon-50/70 px-6 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4 text-ice" />
                            <h4 className="text-sm font-semibold text-navy-900">Chi tiết dòng hàng — {so.soNumber}</h4>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                                <th className="pb-2 pr-3">#</th>
                                <th className="pb-2 pr-3">Mặt hàng</th>
                                <th className="pb-2 pr-3">ĐVT</th>
                                <th className="pb-2 pr-3 text-right">SL dự kiến</th>
                                <th className="pb-2 pr-3 text-right">SL đã xuất</th>
                                <th className="pb-2 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(so.lines || []).map((line, idx) => (
                                <tr key={line.id || idx} className="border-b border-moon-100 last:border-b-0">
                                  <td className="py-2 pr-3 text-navy-400">{idx + 1}</td>
                                  <td className="py-2 pr-3">
                                    <p className="font-medium text-navy-800">{line.item?.itemName || line.item?.itemCode || '(Mặt hàng không tồn tại)'}</p>
                                    <p className="text-xs text-navy-400">{line.item?.itemCode || line.itemId?.slice(0, 8)}</p>
                                  </td>
                                  <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || 'kg'}</td>
                                  <td className="py-2 pr-3 text-right font-medium text-navy-900">{Number(line.expectedQty || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-right">
                                    <span className={Number(line.shippedQty || 0) > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                      {Number(line.shippedQty || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <Badge
                                      variant={line.status === 'SHIPPED' ? 'success' : line.status === 'PARTIAL' ? 'warning' : 'default'}
                                      className="text-xs"
                                    >
                                      {line.status === 'OPEN' ? 'Mới' : line.status === 'SHIPPED' ? 'Đã xuất' : line.status === 'PARTIAL' ? 'Xuất 1 phần' : line.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-moon-300 font-semibold text-navy-900">
                                <td colSpan={3} className="pt-2 pr-3">Tổng</td>
                                <td className="pt-2 pr-3 text-right">{totalExpectedFromLines.toLocaleString()}</td>
                                <td className="pt-2 pr-3 text-right text-emerald-600">{totalShippedFromLines.toLocaleString()}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Drawer — Create / Edit */}
      <SOFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createSo.isPending || updateSo.isPending}
        nextSoNumber={nextSoNumber || ''}
        owners={owners}
        items={items}
        uoms={uoms}
      />

      {/* Modal — Create Shipment */}
      <CreateShipmentModal
        isOpen={shipmentModalState.isOpen}
        onClose={handleCloseShipmentModal}
        onSubmit={handleCreateShipment}
        salesOrder={shipmentModalState.so}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
        isLoading={createShipment.isPending}
      />
    </>
  )
}
