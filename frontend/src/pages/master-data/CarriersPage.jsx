import { useState, useCallback } from 'react'
import { Truck } from 'lucide-react'
import {
  useCarrierList,
  useCreateCarrier,
  useUpdateCarrier,
  useDeactivateCarrier,
  useReactivateCarrier,
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
  CARRIER_GROUPS,
  CARRIER_TRANSPORT_MODES,
} from '@domains/master-data'
import { Badge } from '@shared/ui'
import { CarrierFormDrawer } from '@features/master-data'

const GROUP_CONFIG = {
  TRUCKING:          { label: 'Vận tải đường bộ', variant: 'warning' },
  SHIPPING_LINE:     { label: 'Hãng tàu',          variant: 'info' },
  FREIGHT_FORWARDER: { label: 'Đại lý vận chuyển', variant: 'primary' },
  BARGE_OPERATOR:    { label: 'Vận tải đường sông', variant: 'success' },
  OTHER:             { label: 'Khác',               variant: 'default' },
}

const MODE_CONFIG = {
  TRUCK:     { label: 'Xe tải',    variant: 'warning' },
  VESSEL:    { label: 'Tàu biển',  variant: 'info' },
  BARGE:     { label: 'Sà lan',    variant: 'success' },
  CONTAINER: { label: 'Container', variant: 'primary' },
  RAIL:      { label: 'Đường sắt', variant: 'default' },
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function CarriersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', isActive: '', carrierGroup: '', transportMode: '' })
  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useCarrierList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    carrierGroup: filters.carrierGroup || undefined,
    transportMode: filters.transportMode || undefined,
  })
  const createMutation = useCreateCarrier()
  const updateMutation = useUpdateCarrier()
  const deactivateMutation = useDeactivateCarrier()
  const reactivateMutation = useReactivateCarrier()

  const rows = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const handleKeywordChange = useCallback((value) => setFilters((prev) => ({ ...prev, keyword: value, page: 1 })), [])
  const handleFilterChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 })), [])
  const handleClearFilters = useCallback(() => setFilters((prev) => ({ ...prev, keyword: '', isActive: '', carrierGroup: '', transportMode: '', page: 1 })), [])
  const handlePageChange = useCallback((page) => setFilters((prev) => ({ ...prev, page })), [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (row) => setDrawerState({ isOpen: true, data: row })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        const { carrierCode, ...updateFields } = data
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
    { key: 'carrierGroup', placeholder: 'Nhóm', options: CARRIER_GROUPS },
    { key: 'transportMode', placeholder: 'Phương thức', options: CARRIER_TRANSPORT_MODES },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý nhà vận chuyển"
        description="Danh sách đơn vị vận chuyển hàng hóa đường bộ, đường thuỷ"
        onAdd={handleAdd}
        addLabel="Thêm NVC"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{ isActive: filters.isActive, carrierGroup: filters.carrierGroup, transportMode: filters.transportMode }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm NVC..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        emptyMessage="Chưa có nhà vận chuyển nào"
        colSpan={8}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        totalItems={meta.total}
        itemLabel="nhà vận chuyển"
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã</TableHead>
            <TableHead>Tên NVC</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>SĐT</TableHead>
            <TableHead>Nhóm</TableHead>
            <TableHead align="center">Phương thức</TableHead>
            <TableHead>Loại xe mặc định</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && rows.length > 0 && (
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} onClick={() => handleEdit(row)}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">{row.carrierCode}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-navy-900">{row.carrierName}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{row.contactName || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{row.phone || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-navy-500">{GROUP_CONFIG[row.carrierGroup]?.label || row.carrierGroup}</span>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={MODE_CONFIG[row.transportMode]?.variant || 'default'}>
                    {MODE_CONFIG[row.transportMode]?.label || row.transportMode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-navy-500">{row.defaultVehicleTypeCode || '—'}</span>
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

      <CarrierFormDrawer
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
        entityName={deactivateState.data?.carrierName}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  )
}
