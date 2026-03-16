import { useState, useCallback } from 'react'
import { Ship } from 'lucide-react'
import {
  useVesselList,
  useCreateVessel,
  useUpdateVessel,
  useDeactivateVessel,
  useReactivateVessel,
  PageHeader,
  FilterBar,
  StatusBadge,
  ActionMenu,
  DeactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  VESSEL_TYPES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'
import { VesselFormDrawer } from '@features/master-data'

const TYPE_CONFIG = {
  BULK_CARRIER:   { label: 'Tàu hàng rời',      variant: 'info' },
  BARGE:          { label: 'Sà lan',             variant: 'success' },
  GENERAL_CARGO:  { label: 'Tàu hàng tổng hợp', variant: 'warning' },
  CONTAINER:      { label: 'Tàu container',      variant: 'primary' },
  TANKER:         { label: 'Tàu dầu',            variant: 'error' },
  OTHER:          { label: 'Khác',               variant: 'default' },
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function VesselsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', isActive: '', vesselType: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useVesselList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    vesselType: filters.vesselType || undefined,
  })
  const createMutation = useCreateVessel()
  const updateMutation = useUpdateVessel()
  const deactivateMutation = useDeactivateVessel()
  const reactivateMutation = useReactivateVessel()

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 })), [])
  const handleClearFilters = useCallback(() => setFilters((prev) => ({ ...prev, keyword: '', isActive: '', vesselType: '', page: 1 })), [])
  const handlePageChange = useCallback((page) => setFilters((prev) => ({ ...prev, page })), [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (row) => setDrawerState({ isOpen: true, data: row })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        const { vesselCode, ...updateFields } = data
        await updateMutation.mutateAsync({ id: drawerState.data.id, data: { ...updateFields, rowVersion: Number(drawerState.data.rowVersion) } })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {}
  }

  const handleConfirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {}
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'vesselType', placeholder: 'Loại tàu', options: VESSEL_TYPES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý tàu / sà lan"
        description="Danh sách tàu biển, sà lan phục vụ vận chuyển hàng hóa"
        onAdd={handleAdd}
        addLabel="Thêm tàu"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{ isActive: filters.isActive, vesselType: filters.vesselType }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm mã, tên tàu, IMO..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có tàu / sà lan nào"
        colSpan={8}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="tàu / sà lan"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã</TableHead>
            <TableHead>Tên tàu</TableHead>
            <TableHead>IMO</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Quốc tịch</TableHead>
            <TableHead align="right">DWT (tấn)</TableHead>
            <TableHead>Chủ tàu</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} onClick={() => handleEdit(row)}>
                <TableCell>
                  <div>
                    <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{row.vesselCode}</span>
                    {row.callSign && <p className="mt-1 text-xs text-navy-400">{row.callSign} · {row.yearBuilt}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{row.vesselName}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{row.imoNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_CONFIG[row.vesselType]?.variant || 'default'}>
                    {TYPE_CONFIG[row.vesselType]?.label || row.vesselType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{row.nationality || '—'}</span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-mono text-sm text-navy-700">{row.dwtTon ? row.dwtTon.toLocaleString('vi-VN') : '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{row.owner || '—'}</span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={row.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(row)}
                    onDeactivate={() => setDeactivateState({ isOpen: true, data: row })}
                    onReactivate={() => reactivateMutation.mutate(row.id)}
                    isActive={row.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <VesselFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeactivateModal
        isOpen={deactivateState.isOpen}
        onClose={() => setDeactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmDeactivate}
        entityName={deactivateState.data?.vesselName}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  )
}
