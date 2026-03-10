import { useState, useCallback } from 'react'
import { Ship } from 'lucide-react'
import {
  useVendorList,
  useCreateVendor,
  useUpdateVendor,
  useDeactivateVendor,
  useReactivateVendor,
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
  SUPPLIER_GROUPS,
} from '@domains/master-data'
import { VendorFormDrawer } from '@features/master-data'
import { Badge } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

const getSupplierGroupLabel = (group) => {
  const found = SUPPLIER_GROUPS.find((g) => g.value === group)
  return found?.label || group
}

export function VendorsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    supplierGroup: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useVendorList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    supplierGroup: filters.supplierGroup || undefined,
  })

  const createMutation = useCreateVendor()
  const updateMutation = useUpdateVendor()
  const deactivateMutation = useDeactivateVendor()
  const reactivateMutation = useReactivateVendor()

  const vendors = response?.data || []
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 }

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
      supplierGroup: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (vendor) => setDrawerState({ isOpen: true, data: vendor })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        // Remove vendorCode (immutable) and add rowVersion for optimistic locking
        const { vendorCode, ...updateFields } = data
        await updateMutation.mutateAsync({
          id: drawerState.data.id,
          data: {
            ...updateFields,
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

  const handleDeactivate = (vendor) => setDeactivateState({ isOpen: true, data: vendor })
  const handleReactivate = (vendor) => setReactivateState({ isOpen: true, data: vendor })

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
    { key: 'supplierGroup', placeholder: 'Nhóm NCC', options: SUPPLIER_GROUPS },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý nhà cung cấp"
        description="Danh sách nhà cung cấp và tàu trong hệ thống"
        onAdd={handleAdd}
        addLabel="Thêm NCC"
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      <div className="mb-6">
        <FilterBar
          keyword={filters.keyword}
          onKeywordChange={handleKeywordChange}
          filters={filterConfig}
          filterValues={{
            isActive: filters.isActive,
            supplierGroup: filters.supplierGroup,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã, tên NCC hoặc tên tàu..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={vendors.length === 0}
        emptyMessage="Chưa có nhà cung cấp nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã NCC</TableHead>
            <TableHead>Tên NCC</TableHead>
            <TableHead>Nhóm</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && vendors.length > 0 && (
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Ship className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-navy-900">{vendor.vendorCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{vendor.vendorName}</p>
                    {vendor.vesselName && (
                      <p className="text-xs text-navy-500">Tàu: {vendor.vesselName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{getSupplierGroupLabel(vendor.supplierGroup)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vendor.contactName && <p className="text-navy-700">{vendor.contactName}</p>}
                    {vendor.phone && <p className="text-navy-500">{vendor.phone}</p>}
                  </div>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={vendor.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(vendor)}
                    onDeactivate={() => handleDeactivate(vendor)}
                    onReactivate={() => handleReactivate(vendor)}
                    isActive={vendor.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <VendorFormDrawer
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
        entityName={deactivateState.data?.vendorName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.vendorName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
