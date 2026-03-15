import React, { useState, useCallback } from 'react'
import { Plus, Check, Lock, Ban, ChevronDown, ChevronUp, Package, Pencil, RotateCcw, FileInput } from 'lucide-react'
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
  useUnconfirmPurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
  useNextPoNumber,
  useCreateInboundReceipt,
} from '@domains/inbound-operations'
import { useLookupOwners, useLookupVendors, useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import {
  Badge, Button, Input, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow,
} from '@shared/ui'
import { POFormDrawer, CreateInboundReceiptModal } from '@features/inbound-operations'

const PO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Xác nhận' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'NEW') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'warning'
}

const STATUS_LABELS = { NEW: 'Tạo mới', CONFIRMED: 'Xác nhận', CLOSED: 'Đã đóng', CANCELLED: 'Đã hủy' }

export function PurchaseOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '', vendorId: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [expandedId, setExpandedId] = useState(null)
  const [receiptModalState, setReceiptModalState] = useState({ isOpen: false, po: null })

  const isDrawerOpen = drawerState.isOpen
  const { data: nextPoResponse } = useNextPoNumber(isDrawerOpen && !drawerState.data)
  const nextPoNumber = nextPoResponse?.data?.code || ''

  const { data: response, isLoading, refetch } = usePurchaseOrders({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
    vendorId: filters.vendorId || undefined,
  })

  const createPo = useCreatePurchaseOrder()
  const updatePo = useUpdatePurchaseOrder()
  const confirmPo = useConfirmPurchaseOrder()
  const closePo = useClosePurchaseOrder()
  const cancelPo = useCancelPurchaseOrder()
  const unconfirmPo = useUnconfirmPurchaseOrder()
  const createReceipt = useCreateInboundReceipt()

  const { data: owners = [] } = useLookupOwners()
  const { data: vendors = [] } = useLookupVendors()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (po) => setDrawerState({ isOpen: true, data: po })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleOpenReceiptModal = (po) => setReceiptModalState({ isOpen: true, po })
  const handleCloseReceiptModal = () => setReceiptModalState({ isOpen: false, po: null })

  const handleCreateReceipt = async (payload) => {
    try {
      await createReceipt.mutateAsync(payload)
      handleCloseReceiptModal()
    } catch {
      // Error handled by mutation
    }
  }

  const handleSubmit = async (payload) => {
    try {
      if (drawerState.data?.id) {
        await updatePo.mutateAsync({ id: drawerState.data.id, data: payload })
      } else {
        await createPo.mutateAsync(payload)
      }
      handleCloseDrawer()
    } catch {
      // Error handled by mutation
    }
  }

  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn đặt hàng (PO)</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Tạo PO
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Tìm PO number, ghi chú..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={PO_STATUSES}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
          <Select
            value={filters.vendorId}
            onChange={(e) => setFilters((prev) => ({ ...prev, vendorId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả nhà cung cấp' }, ...vendors.map((v) => ({ value: v.id, label: `${v.code} - ${v.name}` }))]}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Số PO</TableHead>
              <TableHead>Loại PO</TableHead>
              <TableHead>Số B/L</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã nhận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={10} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={10} message="Chưa có Purchase Order nào" />}
            {!isLoading && rows.map((po) => (
              <React.Fragment key={po.id}>
                <TableRow>
                  <TableCell>
                    <button
                      onClick={() => toggleExpand(po.id)}
                      className="p-1 text-navy-400 hover:text-ice transition-colors"
                    >
                      {expandedId === po.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{po.poNumber}</p>
                    <p className="text-xs text-navy-400">{po.lines?.length || 0} dòng</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={po.poType === 'SEA' ? 'info' : 'warning'} className="text-xs">
                      {po.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-600">{po.blNumber || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{po.owner?.ownerCode || po.ownerId}</p>
                    <p className="text-xs text-navy-400">{po.owner?.ownerName}</p>
                  </TableCell>
                  <TableCell>
                    {po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell align="right" className="font-medium text-navy-900">
                    {(po.totalExpectedQty || 0).toLocaleString()} kg
                  </TableCell>
                  <TableCell align="right">
                    <span className={po.totalReceivedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                      {(po.totalReceivedQty || 0).toLocaleString()} kg
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusTone(po.status)}>{STATUS_LABELS[po.status] || po.status}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      {po.status === 'NEW' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(po)} title="Chỉnh sửa">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="accent" size="sm" onClick={() => confirmPo.mutate(po.id)} title="Xác nhận">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelPo.mutate(po.id)} title="Hủy PO">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {po.status === 'CONFIRMED' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => unconfirmPo.mutate(po.id)} title="Hủy xác nhận">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="accent" size="sm" onClick={() => handleOpenReceiptModal(po)} title="Tạo phiếu nhập">
                            <FileInput className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelPo.mutate(po.id)} title="Hủy PO">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {['CLOSED', 'CANCELLED'].includes(po.status) && (
                        <span className="text-xs text-navy-400">Hoàn tất</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expand: line details */}
                {expandedId === po.id && (
                  <tr key={`${po.id}-lines`}>
                    <td colSpan={10} className="p-0">
                      <div className="border-t border-b border-moon-200 bg-moon-50/70 px-6 py-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4 text-ice" />
                          <h4 className="text-sm font-semibold text-navy-900">Chi tiết dòng hàng — {po.poNumber}</h4>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-moon-200 text-left text-xs text-navy-400">
                              <th className="pb-2 pr-3">#</th>
                              <th className="pb-2 pr-3">Mặt hàng</th>
                              <th className="pb-2 pr-3">ĐVT</th>
                              <th className="pb-2 pr-3 text-right">SL dự kiến</th>
                              <th className="pb-2 pr-3 text-right">SL đã nhận</th>
                              <th className="pb-2 pr-3 text-right">Đơn giá</th>
                              <th className="pb-2 pr-3 text-right">Thành tiền</th>
                              <th className="pb-2 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(po.lines || []).map((line) => (
                              <tr key={line.id} className="border-b border-moon-100 last:border-b-0">
                                <td className="py-2 pr-3 text-navy-400">{line.lineNum}</td>
                                <td className="py-2 pr-3">
                                  <p className="font-medium text-navy-800">{line.item?.itemCode || line.itemId}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemName}</p>
                                </td>
                                <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || line.uomId}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-900">{(line.expectedQty || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={line.receivedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                    {(line.receivedQty || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right text-navy-600">{(line.unitPrice || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-800">
                                  {((line.expectedQty || 0) * (line.unitPrice || 0)).toLocaleString()}
                                </td>
                                <td className="py-2 text-center">
                                  <Badge
                                    variant={line.status === 'RECEIVED' ? 'success' : line.status === 'PARTIAL' ? 'warning' : 'default'}
                                    className="text-xs"
                                  >
                                    {line.status === 'OPEN' ? 'Mới' : line.status === 'RECEIVED' ? 'Đã nhận' : line.status === 'PARTIAL' ? 'Nhận 1 phần' : line.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-moon-300 font-semibold text-navy-900">
                              <td colSpan={3} className="pt-2 pr-3">Tổng</td>
                              <td className="pt-2 pr-3 text-right">{(po.totalExpectedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3 text-right text-emerald-600">{(po.totalReceivedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3"></td>
                              <td className="pt-2 pr-3 text-right">
                                {(po.lines || []).reduce((s, l) => s + (l.expectedQty || 0) * (l.unitPrice || 0), 0).toLocaleString()}
                              </td>
                              <td></td>
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
      <POFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createPo.isPending || updatePo.isPending}
        nextPoNumber={nextPoNumber}
        owners={owners}
        vendors={vendors}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
      />

      <CreateInboundReceiptModal
        isOpen={receiptModalState.isOpen}
        onClose={handleCloseReceiptModal}
        onSubmit={handleCreateReceipt}
        purchaseOrder={receiptModalState.po}
        isLoading={createReceipt.isPending}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
      />
    </>
  )
}
