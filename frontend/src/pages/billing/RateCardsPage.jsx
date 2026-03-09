import { useState } from 'react'
import { useRateCards, useCreateRateCard } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
  const [draft, setDraft] = useState(initialDraft)

  const { data: response, isLoading, refetch } = useRateCards(filters)
  const createRateCard = useCreateRateCard()

  const { data: owners = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleCreate = async () => {
    await createRateCard.mutateAsync(draft)
    setDraft(initialDraft)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Rate Cards</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
            <Select value={filters.serviceType} onChange={(e) => setFilters((prev) => ({ ...prev, serviceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'STORAGE', label: 'STORAGE' }, { value: 'HANDLING_IN', label: 'HANDLING_IN' }, { value: 'HANDLING_OUT', label: 'HANDLING_OUT' }, { value: 'VAS_BAGGING', label: 'VAS_BAGGING' }]} placeholder="Service Type" />
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
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No rate cards" /> : null}
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

        <div className="wrs-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Create Rate Card</h3>
            <p className="text-sm text-navy-400">Set up service pricing for each owner.</p>
          </div>
          <Select label="Owner" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
          <Select label="Service Type" value={draft.serviceType} onChange={(e) => setDraft((prev) => ({ ...prev, serviceType: e.target.value }))} options={[{ value: 'STORAGE', label: 'STORAGE' }, { value: 'HANDLING_IN', label: 'HANDLING_IN' }, { value: 'HANDLING_OUT', label: 'HANDLING_OUT' }, { value: 'VAS_BAGGING', label: 'VAS_BAGGING' }]} />
          <Input label="Description" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit Price (VND)" type="number" value={draft.unitPrice} onChange={(e) => setDraft((prev) => ({ ...prev, unitPrice: e.target.value }))} />
            <Select label="UOM" value={draft.uom} onChange={(e) => setDraft((prev) => ({ ...prev, uom: e.target.value }))} options={[{ value: 'KG', label: 'KG' }, { value: 'BAG', label: 'BAG' }, { value: 'PALLET', label: 'PALLET' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Effective From" type="date" value={draft.effectiveFrom} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
            <Input label="Effective To" type="date" value={draft.effectiveTo} onChange={(e) => setDraft((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
          </div>

          <Button variant="accent" onClick={handleCreate} disabled={createRateCard.isPending}>Create Rate Card</Button>
        </div>
      </div>
    </div>
  )
}
