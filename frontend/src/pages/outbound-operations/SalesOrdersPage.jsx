import React, { useState, useCallback } from 'react'
import { Plus, Check, Lock, Ban, ChevronDown, ChevronUp, Package, Ship, FileText } from 'lucide-react'
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCloseSalesOrder,
  useCancelSalesOrder,
  useNextSoNumber,
} from '@domains/sales-orders'
import { useLookupOwners, useLookupWarehouses, useLookupItems, useLookupUoms, useCustomerList } from '@domains/master-data'
import {
  Badge, Button, Input, Modal, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow, Textarea,
} from '@shared/ui'
import { SOFormDrawer } from '@features/outbound-operations'

const SO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PARTIALLY_RELEASED', label: 'Xuất 1 phần' },
  { value: 'FULLY_RELEASED', label: 'Xuất đủ' },
  { value: 'SHIPPED', label: 'Đã giao' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusVariant = (status) => {
  const map = { DRAFT: 'warning', CONFIRMED: 'info', PARTIALLY_RELEASED: 'warning', FULLY_RELEASED: 'success', SHIPPED: 'success', CLOSED: 'default', CANCELLED: 'danger' }
  return map[status] || 'default'
}

const statusLabel = (status) => SO_STATUSES.find((s) => s.value === status)?.label || status
const fmtKg = (val) => Number(val || 0).toLocaleString('vi-VN')
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

export function SalesOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '', status: '', ownerId: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [showCancel, setShowCancel] = useState(null)
  const [cancelReason, setCancelReason] = useState({ reasonCode: '', note: '' })
  const [expandedId, setExpandedId] = useState(null)

  const isDrawerOpen = drawerState.isOpen
  const { data: nextSoResponse } = useNextSoNumber(isDrawerOpen && !drawerState.data)
  const nextSoNumber = nextSoResponse?.code || ''

  const { data: response, isLoading, refetch } = useSalesOrders({
    ...filters,
    search: filters.search || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const createSo = useCreateSalesOrder()
  const updateSo = useUpdateSalesOrder()
  const confirmSo = useConfirmSalesOrder()
  const closeSo = useCloseSalesOrder()
  const cancelSo = useCancelSalesOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: customerResponse } = useCustomerList({ page: 1, pageSize: 200 })
  const customers = customerResponse?.items || customerResponse?.data || []

  const apiData = response?.data || response || {}
  const rows = apiData.items || apiData.data?.items || []
  const pagination = { page: apiData.page || 1, totalPages: apiData.totalPages || 1 }

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

  const handleCancel = async () => {
    if (!showCancel || !cancelReason.reasonCode) return
    await cancelSo.mutateAsync({ id: showCancel, data: cancelReason })
    setShowCancel(null)
    setCancelReason({ reasonCode: '', note: '' })
  }

  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn bán hàng (Sales Orders)</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Tạo SO
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Tìm theo mã SO, khách hàng..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={SO_STATUSES}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Mã SO</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Ngày giao</TableHead>
              <TableHead align="right">KL dự kiến</TableHead>
              <TableHead align="right">KL đã giao</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={9} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={9} message="Chưa có Đơn bán hàng nào" />}
            {!isLoading && rows.map((so) => (
              <React.Fragment key={so.id}>
                <TableRow onClick={() => toggleExpand(so.id)}>
                  <TableCell>
                    {expandedId === so.id
                      ? <ChevronUp className="h-4 w-4 text-navy-400" />
                      : <ChevronDown className="h-4 w-4 text-navy-400" />}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{so.soNumber}</p>
                    <p className="text-xs text-navy-400">{so._count?.lines || 0} dòng · {so._count?.shipmentHeaders || 0} shipment</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{so.customer?.customerName || '—'}</p>
                    <p className="text-xs text-navy-400">{so.customer?.customerCode || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{so.owner?.ownerCode || '—'}</p>
                    <p className="text-xs text-navy-400">{so.owner?.ownerName || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{fmtDate(so.expectedDeliveryDate)}</p>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-navy-900">
                    {fmtKg(so.totalExpectedQtyKg)} kg
                  </TableCell>
                  <TableCell align="right">
                    <span className={Number(so.totalShippedQtyKg) > 0 ? 'font-semibold text-emerald-600' : 'text-navy-400'}>
                      {fmtKg(so.totalShippedQtyKg)} kg
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusVariant(so.status)}>{statusLabel(so.status)}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {so.status === 'DRAFT' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(so)} title="Chỉnh sửa">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="accent" size="sm" onClick={() => confirmSo.mutate(so.id)} title="Xác nhận">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowCancel(so.id); setCancelReason({ reasonCode: '', note: '' }) }} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {so.status === 'CONFIRMED' && (
                        <Button variant="ghost" size="sm" onClick={() => { setShowCancel(so.id); setCancelReason({ reasonCode: '', note: '' }) }} title="Hủy">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {so.status === 'SHIPPED' && (
                        <Button variant="outline" size="sm" onClick={() => closeSo.mutate({ id: so.id, data: {} })} title="Đóng SO">
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {['PARTIALLY_RELEASED', 'FULLY_RELEASED'].includes(so.status) && (
                        <span className="text-xs text-navy-400 flex items-center gap-1"><Ship className="h-3 w-3" /> Đang xuất</span>
                      )}
                      {['CLOSED', 'CANCELLED'].includes(so.status) && (
                        <span className="text-xs text-navy-400">Đã kết thúc</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {expandedId === so.id && (
                  <tr key={`${so.id}-lines`}>
                    <td colSpan={9} className="p-0">
                      <div className="border-t border-b border-moon-200 bg-moon-50/70 px-6 py-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4 text-ice" />
                          <h4 className="text-sm font-semibold text-navy-900">Chi tiết SO — {so.soNumber}</h4>
                          {so.notes && <span className="text-xs text-navy-400 ml-2">({so.notes})</span>}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                              <th className="pb-2 pr-3">#</th>
                              <th className="pb-2 pr-3">Mặt hàng</th>
                              <th className="pb-2 pr-3">Hình thức</th>
                              <th className="pb-2 pr-3">ĐVT</th>
                              <th className="pb-2 pr-3 text-right">KL dự kiến</th>
                              <th className="pb-2 pr-3 text-right">KL đã xuất</th>
                              <th className="pb-2 pr-3 text-right">KL đã giao</th>
                              <th className="pb-2 pr-3">Ghi chú</th>
                              <th className="pb-2 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(so.lines || []).map((line) => (
                              <tr key={line.id} className="border-b border-moon-100 last:border-b-0">
                                <td className="py-2 pr-3 text-navy-400">{line.lineNumber}</td>
                                <td className="py-2 pr-3">
                                  <p className="font-medium text-navy-800">{line.item?.itemCode || line.itemId}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemName || ''}</p>
                                </td>
                                <td className="py-2 pr-3 text-navy-600">{line.cargoForm}</td>
                                <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || ''}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-900">{fmtKg(line.expectedQtyKg)}</td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={Number(line.releasedQtyKg) > 0 ? 'font-medium text-blue-600' : 'text-navy-400'}>
                                    {fmtKg(line.releasedQtyKg)}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={Number(line.shippedQtyKg) > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                    {fmtKg(line.shippedQtyKg)}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-xs text-navy-500">{line.notes || '—'}</td>
                                <td className="py-2 text-center">
                                  <Badge variant={statusVariant(line.status)} className="text-xs">{line.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-moon-300 font-semibold text-navy-900">
                              <td colSpan={4} className="pt-2 pr-3">Tổng</td>
                              <td className="pt-2 pr-3 text-right">{fmtKg(so.totalExpectedQtyKg)}</td>
                              <td className="pt-2 pr-3 text-right text-blue-600">{fmtKg(so.totalReleasedQtyKg)}</td>
                              <td className="pt-2 pr-3 text-right text-emerald-600">{fmtKg(so.totalShippedQtyKg)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

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
        nextSoNumber={nextSoNumber}
        owners={owners}
        customers={customers}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
      />

      {/* Modal — Cancel */}
      <Modal
        isOpen={!!showCancel}
        onClose={() => setShowCancel(null)}
        title="Hủy đơn bán hàng"
        description="Nhập lý do hủy SO. SO đã có shipment sẽ không thể hủy."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(null)}>Đóng</Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelSo.isPending || !cancelReason.reasonCode}>
              {cancelSo.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Mã lý do *"
            value={cancelReason.reasonCode}
            onChange={(e) => setCancelReason((p) => ({ ...p, reasonCode: e.target.value }))}
            placeholder="VD: CUSTOMER_REQUEST"
          />
          <Textarea
            label="Ghi chú"
            rows={2}
            value={cancelReason.note}
            onChange={(e) => setCancelReason((p) => ({ ...p, note: e.target.value }))}
          />
        </div>
      </Modal>
    </>
  )
}
