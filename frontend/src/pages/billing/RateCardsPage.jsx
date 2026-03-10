import { useState } from 'react'
import { useContracts, useCreateContract } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const initialDraft = {
  ownerId: '',
  serviceType: '',
  description: '',
  unitPrice: '',
  uom: 'KG',
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

  const validate = () => {
    const e = {}
    if (!draft.ownerId) e.ownerId = 'Owner is required'
    if (!draft.serviceType) e.serviceType = 'Service Type is required'
    if (!draft.unitPrice) e.unitPrice = 'Unit Price is required'
    if (!draft.effectiveFrom) e.effectiveFrom = 'Effective From is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createContract.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Contracts</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Create Contract</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'All' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
          <Select value={filters.serviceType} onChange={(e) => setFilters((prev) => ({ ...prev, serviceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'All' }, { value: 'STORAGE', label: 'STORAGE' }, { value: 'HANDLING_IN', label: 'HANDLING_IN' }, { value: 'HANDLING_OUT', label: 'HANDLING_OUT' }, { value: 'VAS_BAGGING', label: 'VAS_BAGGING' }]} placeholder="Service Type" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Owner</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead align="right">Unit Price</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead align="center">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No contracts found" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{row.serviceType}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{row.description}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.unitPrice?.toLocaleString()} {row.currency}/{row.uom}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{row.effectiveFrom}</p>
                  <p className="text-xs text-navy-400">→ {row.effectiveTo}</p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.isActive ? 'success' : 'default'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
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
        title="Create Contract"
        description="Set up service pricing for each owner."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createContract.isPending}>
              {createContract.isPending ? 'Creating...' : 'Create Contract'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Owner" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Select Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Service Type" value={draft.serviceType} onChange={(e) => setDraft((prev) => ({ ...prev, serviceType: e.target.value }))} options={[{ value: '', label: '-- Select Service Type --' }, { value: 'STORAGE', label: 'STORAGE' }, { value: 'HANDLING_IN', label: 'HANDLING_IN' }, { value: 'HANDLING_OUT', label: 'HANDLING_OUT' }, { value: 'VAS_BAGGING', label: 'VAS_BAGGING' }]} />
            {errors.serviceType && <p className="text-xs text-danger mt-1">{errors.serviceType}</p>}
          </div>
          <div>
            <Input label="Description" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Unit Price (VND)" type="number" value={draft.unitPrice} onChange={(e) => setDraft((prev) => ({ ...prev, unitPrice: e.target.value }))} />
              {errors.unitPrice && <p className="text-xs text-danger mt-1">{errors.unitPrice}</p>}
            </div>
            <Select label="UOM" value={draft.uom} onChange={(e) => setDraft((prev) => ({ ...prev, uom: e.target.value }))} options={[{ value: 'KG', label: 'KG' }, { value: 'BAG', label: 'BAG' }, { value: 'PALLET', label: 'PALLET' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Effective From" type="date" value={draft.effectiveFrom} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
              {errors.effectiveFrom && <p className="text-xs text-danger mt-1">{errors.effectiveFrom}</p>}
            </div>
            <Input label="Effective To" type="date" value={draft.effectiveTo} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  )
}
