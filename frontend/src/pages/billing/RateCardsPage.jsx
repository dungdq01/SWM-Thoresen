import { useState } from 'react'
import { useContracts, useCreateContract } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { RateCardFormDrawer } from '@features/billing'

const FEE_TYPE_OPTIONS = [
  { value: 'STORAGE', label: 'Lưu trữ' },
  { value: 'HANDLING_INBOUND', label: 'Nhập hàng' },
  { value: 'HANDLING_OUTBOUND', label: 'Xuất hàng' },
  { value: 'BAGGING', label: 'Đóng gói' },
  { value: 'STUFFING', label: 'Đóng cont' },
]

export function RateCardsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, ownerId: '', serviceType: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useContracts(filters)
  const createContract = useCreateContract()

  const { data: owners = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))

  const handleSubmit = async (payload) => {
    await createContract.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Hợp đồng</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo Hợp đồng</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Chủ sở hữu" />
          <Select value={filters.serviceType} onChange={(e) => setFilters((prev) => ({ ...prev, serviceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'STORAGE', label: 'Lưu trữ' }, { value: 'HANDLING_IN', label: 'Nhập hàng' }, { value: 'HANDLING_OUT', label: 'Xuất hàng' }, { value: 'VAS_BAGGING', label: 'Đóng gói' }]} placeholder="Loại dịch vụ" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã HĐ</TableHead>
              <TableHead>Chủ sở hữu</TableHead>
              <TableHead>Loại phí</TableHead>
              <TableHead align="right">Đơn giá</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không tìm thấy hợp đồng" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.contractNumber}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.name || ownerMap[row.ownerId]?.name || '-'}</p>
                  <p className="text-xs text-navy-400">{row.owner?.code || ownerMap[row.ownerId]?.code}</p>
                </TableCell>
                <TableCell>
                  {row.feeLines?.map((fee, idx) => (
                    <Badge key={idx} variant="default" className="mr-1 mb-1">{FEE_TYPE_OPTIONS.find(o => o.value === fee.feeType)?.label || fee.feeType}</Badge>
                  ))}
                </TableCell>
                <TableCell align="right">
                  {row.feeLines?.map((fee, idx) => (
                    <p key={idx} className="text-sm text-navy-700">{fee.unitRate?.toLocaleString()} {row.currencyCode || 'VND'}/{fee.billingUom}</p>
                  ))}
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{row.effectiveFrom?.split('T')[0]}</p>
                  <p className="text-xs text-navy-400">→ {row.effectiveTo?.split('T')[0]}</p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.status === 'ACTIVE' ? 'success' : 'warning'}>{row.status === 'ACTIVE' ? 'Hoạt động' : row.status}</Badge>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <RateCardFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createContract.isPending}
        owners={owners}
      />
    </>
  )
}
