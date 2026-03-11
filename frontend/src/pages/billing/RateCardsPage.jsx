import { useState } from 'react'
import { useContracts, useCreateContract } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const FEE_TYPE_OPTIONS = [
  { value: 'STORAGE', label: 'Lưu trữ' },
  { value: 'HANDLING_INBOUND', label: 'Nhập hàng' },
  { value: 'HANDLING_OUTBOUND', label: 'Xuất hàng' },
  { value: 'BAGGING', label: 'Đóng gói' },
  { value: 'STUFFING', label: 'Đóng cont' },
]

const initialDraft = {
  ownerId: '',
  feeType: '',
  notes: '',
  unitRate: '',
  billingUom: 'KG',
  effectiveFrom: '',
  effectiveTo: '',
}

export function RateCardsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, ownerId: '', serviceType: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useContracts(filters)
  const createContract = useCreateContract()

  const { data: owners = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))

  const validate = () => {
    const e = {}
    if (!draft.ownerId) e.ownerId = 'Chủ sở hữu là bắt buộc'
    if (!draft.feeType) e.feeType = 'Loại phí là bắt buộc'
    if (!draft.unitRate) e.unitRate = 'Đơn giá là bắt buộc'
    if (!draft.effectiveFrom) e.effectiveFrom = 'Ngày bắt đầu là bắt buộc'
    if (!draft.effectiveTo) e.effectiveTo = 'Ngày kết thúc là bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    const payload = {
      ownerId: draft.ownerId,
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo,
      notes: draft.notes || undefined,
      externalId: `CTR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      feeLines: [{
        feeType: draft.feeType,
        unitRate: parseFloat(draft.unitRate),
        billingUom: draft.billingUom,
      }],
    }
    await createContract.mutateAsync(payload)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Hợp đồng</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo Hợp đồng</Button>
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

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo Hợp đồng"
        description="Thiết lập giá dịch vụ cho từng chủ sở hữu."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createContract.isPending}>
              {createContract.isPending ? 'Đang tạo...' : 'Tạo Hợp đồng'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Chủ sở hữu" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Chủ sở hữu --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Loại phí" value={draft.feeType} onChange={(e) => setDraft((prev) => ({ ...prev, feeType: e.target.value }))} options={[{ value: '', label: '-- Chọn Loại phí --' }, ...FEE_TYPE_OPTIONS]} />
            {errors.feeType && <p className="text-xs text-danger mt-1">{errors.feeType}</p>}
          </div>
          <div>
            <Input label="Ghi chú" value={draft.notes} onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Đơn giá (VND)" type="number" value={draft.unitRate} onChange={(e) => setDraft((prev) => ({ ...prev, unitRate: e.target.value }))} />
              {errors.unitRate && <p className="text-xs text-danger mt-1">{errors.unitRate}</p>}
            </div>
            <Select label="Đơn vị tính" value={draft.billingUom} onChange={(e) => setDraft((prev) => ({ ...prev, billingUom: e.target.value }))} options={[{ value: 'KG', label: 'KG' }, { value: 'BAG', label: 'Bao' }, { value: 'PALLET', label: 'Pallet' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Ngày bắt đầu" type="date" value={draft.effectiveFrom} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
              {errors.effectiveFrom && <p className="text-xs text-danger mt-1">{errors.effectiveFrom}</p>}
            </div>
            <div>
              <Input label="Ngày kết thúc" type="date" value={draft.effectiveTo} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
              {errors.effectiveTo && <p className="text-xs text-danger mt-1">{errors.effectiveTo}</p>}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
