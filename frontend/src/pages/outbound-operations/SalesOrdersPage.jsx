import React, { useState, useCallback } from 'react'
import { Plus, Check, Trash2, Pencil, RotateCcw, FileOutput, ChevronDown, ChevronUp, Package, Truck, Lock, Ban } from 'lucide-react'
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCancelSalesOrder,
  useUnconfirmSalesOrder,
  useCloseSalesOrder,
  useNextSoNumber,
  useCreateShipment,
} from '@domains/outbound-operations'
import { useLookupOwners, useLookupItems, useLookupUoms, useLookupWarehouses, useLookupVessels } from '@domains/master-data'
import {
  Badge, Button, Input, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow,
} from '@shared/ui'
import { SOFormDrawer, CreateShipmentModal } from '@features/outbound-operations'

const SO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'WEIGHING', label: 'Đang cân' },
  { value: 'PARTIALLY_RELEASED', label: 'Xuất 1 phần' },
  { value: 'FULLY_RELEASED', label: 'Đã giao đủ phiếu' },
  { value: 'SHIPPED', label: 'Đã xuất kho' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'DRAFT') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (status === 'WEIGHING') return 'warning'
  if (status === 'PARTIALLY_RELEASED') return 'warning'
  if (status === 'FULLY_RELEASED') return 'success'
  if (status === 'SHIPPED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'warning'
}

const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', WEIGHING: 'Đang cân', PARTIALLY_RELEASED: 'Xuất 1 phần', FULLY_RELEASED: 'Đã giao đủ phiếu', SHIPPED: 'Đã xuất kho', CLOSED: 'Đã đóng', CANCELLED: 'Đã hủy' }

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
  const closeSo = useCloseSalesOrder()
  const cancelSo = useCancelSalesOrder()
  const unconfirmSo = useUnconfirmSalesOrder()

  // State for Shipment modal
  const createShipment = useCreateShipment()
  const [shipmentModalState, setShipmentModalState] = useState({ isOpen: false, so: null })
  const handleOpenShipmentModal = (so) => setShipmentModalState({ isOpen: true, so })
  const handleCloseShipmentModal = () => setShipmentModalState({ isOpen: false, so: null })
  const [shipmentError, setShipmentError] = useState('')
  const handleCreateShipment = async (payload) => {
    setShipmentError('')
    try {
      await createShipment.mutateAsync(payload)
      handleCloseShipmentModal()
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.error?.message || err?.response?.data?.message || err?.message || 'Lỗi tạo phiếu xuất'
      setShipmentError(msg)
    }
  }

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: vessels = [] } = useLookupVessels()

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
        <Table minWidth={1200}>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Số SO</TableHead>
              <TableHead>Loại SO</TableHead>
              <TableHead>Số B/L</TableHead>
              <TableHead>Tên tàu</TableHead>
              <TableHead>Biển số xe</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã xuất</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={12} />}
            {!isLoading && rows.length === 0 && (
              <TableEmpty colSpan={12}>
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
              const totalExpectedFromLines = (so.lines || []).reduce((sum, l) => sum + Number(l.expectedQtyKg || l.expectedQty || 0), 0)
              const totalShippedFromLines = (so.lines || []).reduce((sum, l) => sum + Number(l.shippedQtyKg || l.shippedQty || 0), 0) || Number(so.totalShippedQtyKg || 0)
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
                      <span className="text-sm text-navy-600">{so.vesselName || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-navy-700">{so.vehiclePlate || '—'}</span>
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
                      <span className={totalShippedFromLines > 0 ? 'font-medium text-amber-500' : 'text-navy-400'}>
                        {totalShippedFromLines.toLocaleString()} kg
                      </span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const lines = so.lines || []
                        if (['PARTIALLY_RELEASED', 'FULLY_RELEASED', 'SHIPPED'].includes(so.status)) {
                          const hasPartial = lines.some(l => Number(l.shippedQtyKg || l.shippedQty || 0) > 0 && Number(l.shippedQtyKg || l.shippedQty || 0) < Number(l.expectedQtyKg || l.expectedQty || 0))
                          const allShipped = lines.length > 0 && lines.every(l => Number(l.shippedQtyKg || l.shippedQty || 0) >= Number(l.expectedQtyKg || l.expectedQty || 0) * 0.99)
                          if (allShipped) return <Badge variant="success">Đã xuất kho</Badge>
                          if (hasPartial || so.status === 'PARTIALLY_RELEASED') return <Badge variant="warning">Xuất 1 phần</Badge>
                        }
                        return <Badge variant={statusTone(so.status)}>{STATUS_LABELS[so.status] || so.status}</Badge>
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1.5">
                        {so.status === 'DRAFT' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(so)} title="Chỉnh sửa" className="gap-1">
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Sửa</span>
                            </Button>
                            <Button variant="accent" size="sm" onClick={() => confirmSo.mutate(so.id)} title="Xác nhận" className="gap-1">
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Xác nhận</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelSo.mutate({ id: so.id, data: {} })} title="Hủy SO" className="text-red-500 hover:bg-red-500/10 hover:text-red-600">
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {so.status === 'CONFIRMED' && (
                          <Button variant="accent" size="sm" onClick={() => handleOpenShipmentModal(so)} title="Tạo phiếu xuất" className="gap-1">
                            <FileOutput className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Tạo phiếu</span>
                          </Button>
                        )}
                        {['PARTIALLY_RELEASED', 'FULLY_RELEASED'].includes(so.status) && (
                          <>
                            <Button variant="accent" size="sm" onClick={() => handleOpenShipmentModal(so)} title="Tạo phiếu xuất" className="gap-1">
                              <FileOutput className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Tạo phiếu</span>
                            </Button>
                            <Button size="sm" onClick={() => closeSo.mutate(so.id)} title="Đóng SO" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                              <Lock className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Đóng</span>
                            </Button>
                          </>
                        )}
                        {so.status === 'SHIPPED' && (
                          <Button size="sm" onClick={() => closeSo.mutate(so.id)} title="Đóng SO" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                            <Lock className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Đóng SO</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expand: line details */}
                  {isExpanded && (
                    <tr key={`${so.id}-lines`}>
                      <td colSpan={12} className="p-0">
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
                                <th className="pb-2 pr-3 text-right">Đơn giá</th>
                                <th className="pb-2 pr-3 text-right">Thành tiền</th>
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
                                  <td className="py-2 pr-3 text-right font-medium text-navy-900">{Number(line.expectedQtyKg || line.expectedQty || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-right">
                                    <span className={Number(line.shippedQtyKg || line.shippedQty || 0) > 0 ? 'font-medium text-amber-500' : 'text-navy-400'}>
                                      {Number(line.shippedQtyKg || line.shippedQty || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 text-right text-navy-600">{(line.unitPrice || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-right font-medium text-navy-800">
                                    {((line.expectedQtyKg || line.expectedQty || 0) * (line.unitPrice || 0)).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Danh sách phiếu xuất (Shipments) */}
                          {(so.shipments || []).length > 0 && (
                            <div className="mt-4">
                              <div className="mb-2 flex items-center gap-2">
                                <Truck className="h-4 w-4 text-ice" />
                                <h4 className="text-sm font-semibold text-navy-900">Danh sách xe xuất hàng</h4>
                              </div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                                    <th className="pb-2 pr-3">#</th>
                                    <th className="pb-2 pr-3">Số phiếu xuất</th>
                                    <th className="pb-2 pr-3">Số xe</th>
                                    <th className="pb-2 pr-3 text-right">KL xuất (kg)</th>
                                    <th className="pb-2 pr-3">Trạng thái</th>
                                    <th className="pb-2">Ngày tạo</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {so.shipments.map((shp, idx) => {
                                    const shpTotalShipped = (shp.lines || []).reduce((s, l) => s + Number(l.shippedQty || l.netWeightKg || 0), 0)
                                    const shpStatusLabel = {
                                      DRAFT: ['Nháp', 'default'],
                                      NEW: ['Mới', 'info'],
                                      CONFIRMED: ['Xác nhận', 'info'],
                                      AWAITING_WEIGHING: ['Chờ cân', 'info'],
                                      LOADING: ['Đang chất', 'warning'],
                                      LOADED: ['Đã chất', 'warning'],
                                      WEIGHING: ['Đang cân', 'warning'],
                                      SHIPPED: ['Đã xuất', 'success'],
                                      CLOSED: ['Đã đóng', 'default'],
                                      CANCELLED: ['Đã hủy', 'danger'],
                                      ERROR: ['Lỗi', 'danger'],
                                    }
                                    const [label, tone] = shpStatusLabel[shp.status] || [shp.status, 'default']
                                    return (
                                      <tr key={shp.id} className="border-b border-moon-100 last:border-b-0">
                                        <td className="py-2 pr-3 text-navy-400">{idx + 1}</td>
                                        <td className="py-2 pr-3 font-medium text-navy-800">{shp.shipmentNumber || '—'}</td>
                                        <td className="py-2 pr-3 font-mono text-navy-700">{shp.vehicleNumber || '—'}</td>
                                        <td className="py-2 pr-3 text-right">
                                          <span className={shpTotalShipped > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                            {shpTotalShipped > 0 ? shpTotalShipped.toLocaleString() : '—'}
                                          </span>
                                        </td>
                                        <td className="py-2 pr-3"><Badge variant={tone} className="text-xs">{label}</Badge></td>
                                        <td className="py-2 text-navy-500 text-xs">{shp.createdAt ? new Date(shp.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
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
        vessels={vessels}
      />

      {/* Modal — Create Shipment */}
      <CreateShipmentModal
        isOpen={shipmentModalState.isOpen}
        onClose={() => { handleCloseShipmentModal(); setShipmentError(''); }}
        onSubmit={handleCreateShipment}
        salesOrder={shipmentModalState.so}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
        isLoading={createShipment.isPending}
        errorMessage={shipmentError}
      />
    </>
  )
}
