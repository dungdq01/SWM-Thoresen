import { useState, useEffect } from 'react'
import { Warehouse, Trash2, Plus, KeyRound } from 'lucide-react'
import {
  useOwnerWarehouseAccess,
  useCreateOwnerWarehouseAccess,
  useDeleteOwnerWarehouseAccess,
  useLookupOwners,
  useLookupWarehouses,
  PageHeader,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@domains/master-data'
import { Button, Select } from '@shared/ui'

export function OwnerWarehouseAccessPage() {
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: response, isLoading, refetch } = useOwnerWarehouseAccess(selectedOwnerId)

  const createMutation = useCreateOwnerWarehouseAccess()
  const deleteMutation = useDeleteOwnerWarehouseAccess()

  // Auto-select first owner when data loads
  useEffect(() => {
    if (!selectedOwnerId && owners.length > 0) {
      setSelectedOwnerId(owners[0].id)
    }
  }, [owners, selectedOwnerId])

  const rows = response?.data || response || []

  const ownerOptions = owners.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` }))
  const selectedOwner = owners.find((o) => o.id === selectedOwnerId)

  const assignedWarehouseIds = new Set(rows.map((r) => r.warehouseId))
  const availableWarehouses = warehouses
    .filter((w) => !assignedWarehouseIds.has(w.id))
    .map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))

  const handleAssign = async () => {
    if (!selectedOwnerId || !selectedWarehouseId) return
    try {
      await createMutation.mutateAsync({ ownerId: selectedOwnerId, warehouseId: selectedWarehouseId })
      setSelectedWarehouseId('')
    } catch (error) {}
  }

  const handleRemove = async (warehouseId) => {
    if (!window.confirm('Xác nhận xóa quyền truy cập kho này?')) return
    try {
      await deleteMutation.mutateAsync({ ownerId: selectedOwnerId, warehouseId })
    } catch (error) {}
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Phân kho cho chủ hàng"
        description="Quản lý kho nào mà chủ hàng được phép sử dụng. Owner chỉ có thể tạo PO/Receipt tại các kho đã được gán."
        onRefresh={selectedOwnerId ? refetch : undefined}
        isRefreshing={isLoading}
      />

      {/* Owner selector + Assign form */}
      <div className="mb-6 space-y-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] max-w-md">
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Chọn chủ hàng</label>
            <Select
              value={selectedOwnerId}
              onChange={(e) => { setSelectedOwnerId(e.target.value); setSelectedWarehouseId('') }}
              placeholder="Chọn chủ hàng..."
              options={ownerOptions}
            />
          </div>

          {selectedOwnerId && (
            <>
              <div className="flex-1 min-w-[240px] max-w-sm">
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Gán thêm kho</label>
                <Select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  placeholder={availableWarehouses.length === 0 ? 'Đã gán hết kho' : 'Chọn kho để gán...'}
                  options={availableWarehouses}
                  disabled={availableWarehouses.length === 0}
                />
              </div>
              <Button
                onClick={handleAssign}
                disabled={!selectedWarehouseId || createMutation.isPending}
                isLoading={createMutation.isPending}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Gán kho
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info banner */}
      {selectedOwnerId && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-ice/5 border border-ice/20 rounded-xl text-sm text-navy-600">
          <KeyRound className="w-4 h-4 text-ice-dark flex-shrink-0" />
          <span>
            Đang xem quyền truy cập kho của <strong>{selectedOwner?.name || selectedOwner?.code || ''}</strong>
            {' '} — {rows.length} kho đã gán
            {availableWarehouses.length > 0 && `, còn ${availableWarehouses.length} kho chưa gán`}
          </span>
        </div>
      )}

      {/* Table */}
      {selectedOwnerId && (
        <MasterDataTableWrapper
          isLoading={isLoading}
          isEmpty={rows.length === 0}
          emptyMessage="Chủ hàng chưa được gán kho nào. Hãy chọn kho từ dropdown phía trên và bấm 'Gán kho'."
          colSpan={4}
        >
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã kho</TableHead>
              <TableHead>Tên kho</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center" className="w-20">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          {!isLoading && rows.length > 0 && (
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id || row.warehouseId}>
                  <TableCell>
                    <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark bg-ice/10 border border-ice/20 px-2 py-1 rounded-md">
                      {row.warehouseCode || row.warehouse?.warehouseCode || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-navy-800">{row.warehouseName || row.warehouse?.warehouseName || '—'}</span>
                  </TableCell>
                  <TableCell align="center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Đã gán
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(row.warehouseId) }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Xóa quyền truy cập kho này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </MasterDataTableWrapper>
      )}

      {!selectedOwnerId && (
        <div className="flex flex-col items-center justify-center py-16 text-navy-400">
          <Warehouse className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Đang tải danh sách chủ hàng...</p>
        </div>
      )}
    </div>
  )
}
