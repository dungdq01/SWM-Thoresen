import { useState, useCallback } from 'react'
import { Package } from 'lucide-react'
import {
  useLotList,
  useCreateLot,
  useUpdateLot,
  useDeactivateLot,
  useReactivateLot,
  useLookupOwners,
  useLookupItems,
  useLookupWarehouses,
  PageHeader,
  FilterBar,
  StatusBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LOT_STATUSES,
} from '@domains/master-data'
import { LotFormDrawer } from '@features/master-data'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('vi-VN')
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function LotsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    status: '',
    itemId: '',
    ownerId: '',
    warehouseId: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useLotList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    status: filters.status || undefined,
    itemId: filters.itemId || undefined,
    ownerId: filters.ownerId || undefined,
    warehouseId: filters.warehouseId || undefined,
  })

  const { data: ownersData } = useLookupOwners()
  const { data: itemsData } = useLookupItems()
  const { data: warehousesData } = useLookupWarehouses()

  const createMutation = useCreateLot()
  const updateMutation = useUpdateLot()
  const deactivateMutation = useDeactivateLot()
  const reactivateMutation = useReactivateLot()

  const lots = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

  const owners = ownersData?.data || []
  const items = itemsData?.data || []
  const warehouses = warehousesData?.data || []

  const ownerOptions = owners.map(o => ({ value: o.id, label: `${o.code} - ${o.name}` }))
  const itemOptions = items.map(i => ({ value: i.id, label: `${i.code} - ${i.name}` }))
  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))

  const handleKeywordChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, keyword: value, page: 1 }))
  }, [])

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      keyword: '',
      isActive: '',
      status: '',
      itemId: '',
      ownerId: '',
      warehouseId: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (lot) => setDrawerState({ isOpen: true, data: lot })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        await updateMutation.mutateAsync({
          id: drawerState.data.id,
          data: {
            status: data.status,
            attributes: data.attributes,
            notes: data.notes,
            rowVersion: Number(drawerState.data.rowVersion)
          }
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeactivate = (lot) => setDeactivateState({ isOpen: true, data: lot })
  const handleReactivate = (lot) => setReactivateState({ isOpen: true, data: lot })

  const handleConfirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleConfirmReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(reactivateState.data.id)
      setReactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const filterConfig = [
    { key: 'isActive', placeholder: 'Trạng thái', options: STATUS_OPTIONS },
    { key: 'status', placeholder: 'Trạng thái lô', options: LOT_STATUSES },
    { key: 'ownerId', placeholder: 'Chủ hàng', options: ownerOptions },
    { key: 'itemId', placeholder: 'Mặt hàng', options: itemOptions },
    { key: 'warehouseId', placeholder: 'Kho', options: warehouseOptions },
  ]

  const getOwnerName = (ownerId) => {
    const owner = owners.find(o => o.id === ownerId)
    return owner ? owner.code : '—'
  }

  const getItemName = (itemId) => {
    const item = items.find(i => i.id === itemId)
    return item ? item.code : '—'
  }

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId)
    return warehouse ? warehouse.code : '—'
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý lô hàng"
        description="Theo dõi hàng hóa theo từng lô nhập, hỗ trợ FIFO và truy vết nguồn gốc"
        onAdd={handleAdd}
        addLabel="Thêm lô hàng"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div>
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{
            isActive: filters.isActive,
            status: filters.status,
            ownerId: filters.ownerId,
            itemId: filters.itemId,
            warehouseId: filters.warehouseId,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã lô..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={lots.length === 0}
        emptyMessage="Chưa có lô hàng nào"
        colSpan={8}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã lô</TableHead>
            <TableHead>Mặt hàng</TableHead>
            <TableHead>Chủ hàng</TableHead>
            <TableHead>Kho</TableHead>
            <TableHead>Ngày nhập</TableHead>
            <TableHead align="center">Trạng thái lô</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && lots.length > 0 && (
          <TableBody>
            {lots.map((lot) => (
              <TableRow key={lot.id} onClick={() => handleEdit(lot)}>
                <TableCell>
                  <span className="inline-flex items-center font-mono text-xs font-semibold text-ice-dark dark:text-ice-light bg-ice/10 dark:bg-ice/15 border border-ice/20 px-2 py-1 rounded-md">
                    {lot.lotCode}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{lot.item?.itemCode || getItemName(lot.itemId)}</p>
                    {lot.item?.itemName && (
                      <p className="text-xs text-navy-400">{lot.item.itemName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{lot.owner?.ownerCode || getOwnerName(lot.ownerId)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{lot.warehouse?.warehouseCode || getWarehouseName(lot.warehouseId)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">{formatDate(lot.firstReceivedDate)}</span>
                </TableCell>
                <TableCell align="center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    lot.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lot.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={lot.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(lot)}
                    onDeactivate={() => handleDeactivate(lot)}
                    onReactivate={() => handleReactivate(lot)}
                    isActive={lot.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <LotFormDrawer
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
        entityName={deactivateState.data?.lotCode}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.lotCode}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
