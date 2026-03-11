import { useState } from 'react'
import { useCompleteInboundPutaway, useCloseInboundReceipt, useInboundPutawayQueue } from '@domains/inbound-operations'
import { useLookupItems, useLookupLocations, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const putawayTone = (status) => {
  if (status === 'CLOSED') return 'success'
  if (status === 'PUTAWAY') return 'warning'
  return 'info'
}

export function InboundPutawayPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', keyword: '', ownerId: '', warehouseId: '', itemId: '' })
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [putawayForm, setPutawayForm] = useState({ targetLocationId: '', note: '' })
  
  const { data: response, isLoading, refetch } = useInboundPutawayQueue({
    ...filters,
    status: filters.status || undefined,
    keyword: filters.keyword || undefined,
    ownerId: filters.ownerId || undefined,
    warehouseId: filters.warehouseId || undefined,
    itemId: filters.itemId || undefined,
  })
  const completePutaway = useCompleteInboundPutaway()
  const closeReceipt = useCloseInboundReceipt()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: locations = [] } = useLookupLocations(selectedReceipt?.warehouseId || undefined)

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const openModal = (receipt) => {
    setSelectedReceipt(receipt)
    setPutawayForm({ targetLocationId: '', note: '' })
  }

  const closeModal = () => {
    setSelectedReceipt(null)
    setPutawayForm({ targetLocationId: '', note: '' })
  }

  const handleSubmit = async () => {
    if (!selectedReceipt) return
    if (selectedReceipt.status === 'RECEIVED') {
      await completePutaway.mutateAsync({ id: selectedReceipt.id, data: { note: putawayForm.note, targetLocationId: putawayForm.targetLocationId } })
    } else {
      await closeReceipt.mutateAsync(selectedReceipt.id)
    }
    closeModal()
    refetch()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Cất hàng & đóng phiếu</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Tìm số phiếu, PO, B/L..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'RECEIVED', label: 'Đã nhận' }, { value: 'PUTAWAY', label: 'Đang lưu kho' }]}
            placeholder="Trạng thái"
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
            placeholder="Chủ hàng"
          />
          <Select
            value={filters.warehouseId}
            onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả kho' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
            placeholder="Kho"
          />
          <Select
            value={filters.itemId}
            onChange={(e) => setFilters((prev) => ({ ...prev, itemId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả hàng hóa' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]}
            placeholder="Hàng hóa"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu nhập</TableHead>
              <TableHead>Chủ hàng / Mặt hàng</TableHead>
              <TableHead>Tích hợp</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có phiếu trong hàng đợi lưu kho" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.receiptNumber}</p>
                    <p className="text-xs text-navy-400">{row.putawayWorkId || 'Chưa có mã công việc'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.ownerCode || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.item?.itemCode || row.itemId}</p>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-navy-500">
                    <p>Tồn kho: {row.postedTransId ? 'Đã ghi' : 'Chưa ghi'}</p>
                    <p>Lưu kho: {row.putawayWorkId ? 'Đã tạo' : 'Chưa tạo'}</p>
                    <p>Trọng lượng: {row.netWeightKg ? `${Number(row.netWeightKg).toLocaleString()} kg` : '—'}</p>
                  </div>
                </TableCell>
                <TableCell align="center"><Badge variant={putawayTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <Button variant="accent" size="sm" onClick={() => openModal(row)}>
                    {row.status === 'RECEIVED' ? 'Tạo bàn giao' : 'Đóng phiếu'}
                  </Button>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <Modal
        isOpen={!!selectedReceipt}
        onClose={closeModal}
        title={`Phiếu: ${selectedReceipt?.receiptNumber || ''}`}
        description={selectedReceipt?.status === 'RECEIVED' ? 'Tạo bàn giao lưu kho' : 'Đóng phiếu nhập'}
        size="md"
      >
        {selectedReceipt && (
          <div className="space-y-5">
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 grid grid-cols-2 gap-2">
              <p><strong>Trạng thái:</strong> {selectedReceipt.status}</p>
              <p><strong>Chủ hàng:</strong> {selectedReceipt.owner?.ownerCode || selectedReceipt.ownerId}</p>
              <p><strong>Mặt hàng:</strong> {selectedReceipt.item?.itemCode || selectedReceipt.itemId}</p>
              <p><strong>Trọng lượng:</strong> {selectedReceipt.netWeightKg ? `${Number(selectedReceipt.netWeightKg).toLocaleString()} kg` : '—'}</p>
              <p><strong>Tồn kho:</strong> {selectedReceipt.postedTransId ? 'Đã ghi' : 'Chưa ghi'}</p>
              <p><strong>Lưu kho:</strong> {selectedReceipt.putawayWorkId ? 'Đã tạo' : 'Chưa tạo'}</p>
            </div>

            {selectedReceipt.status === 'RECEIVED' && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Thông tin bàn giao</h4>
                <Select
                  label="Vị trí lưu kho đích"
                  value={putawayForm.targetLocationId}
                  onChange={(e) => setPutawayForm((prev) => ({ ...prev, targetLocationId: e.target.value }))}
                  options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: `${l.code} - ${l.zone?.zoneName || ''}` }))]}
                />
                <Textarea 
                  label="Ghi chú" 
                  rows={2} 
                  placeholder="Ghi chú thêm..." 
                  value={putawayForm.note} 
                  onChange={(e) => setPutawayForm((prev) => ({ ...prev, note: e.target.value }))} 
                />
              </div>
            )}
            {selectedReceipt.status === 'PUTAWAY' && (
              <div className="border-t border-moon-200 pt-4">
                <p className="text-sm text-navy-600">Xác nhận đóng phiếu này? Phiếu sẽ chuyển sang trạng thái CLOSED và không thể chỉnh sửa.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
              <Button variant="outline" size="sm" onClick={closeModal}>Hủy</Button>
              <Button variant="accent" size="sm" onClick={handleSubmit} disabled={completePutaway.isPending || closeReceipt.isPending}>
                {selectedReceipt.status === 'RECEIVED' ? 'Tạo bàn giao' : 'Đóng phiếu'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
