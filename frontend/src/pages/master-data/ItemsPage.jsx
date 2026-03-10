import { useState, useCallback } from 'react'
import { Package } from 'lucide-react'
import {
  useItemList,
  useCreateItem,
  useUpdateItem,
  useDeactivateItem,
  useReactivateItem,
  PageHeader,
  FilterBar,
  StatusBadge,
  CargoFormBadge,
  ActionMenu,
  DeactivateModal,
  ReactivateModal,
  MasterDataTableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  CARGO_FORMS,
  PRODUCT_GROUPS,
} from '@domains/master-data'
import { ItemFormDrawer } from '@features/master-data'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function ItemsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    cargoForm: '',
    productGroup: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useItemList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    cargoForm: filters.cargoForm || undefined,
    productGroup: filters.productGroup || undefined,
  })

  const createMutation = useCreateItem()
  const updateMutation = useUpdateItem()
  const deactivateMutation = useDeactivateItem()
  const reactivateMutation = useReactivateItem()

  const items = response?.data || []
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
      cargoForm: '',
      productGroup: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (item) => setDrawerState({ isOpen: true, data: item })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        await updateMutation.mutateAsync({ id: drawerState.data.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseDrawer()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeactivate = (item) => setDeactivateState({ isOpen: true, data: item })
  const handleReactivate = (item) => setReactivateState({ isOpen: true, data: item })

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
    { key: 'cargoForm', placeholder: 'Dạng hàng', options: CARGO_FORMS },
    { key: 'productGroup', placeholder: 'Nhóm sản phẩm', options: PRODUCT_GROUPS },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý mặt hàng"
        description="Danh sách tất cả mặt hàng trong hệ thống"
        onAdd={handleAdd}
        addLabel="Thêm mặt hàng"
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
            cargoForm: filters.cargoForm,
            productGroup: filters.productGroup,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          placeholder="Tìm theo mã hoặc tên..."
        />
      </div>

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={items.length === 0}
        emptyMessage="Chưa có mặt hàng nào"
        colSpan={6}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã hàng</TableHead>
            <TableHead>Tên hàng</TableHead>
            <TableHead>Dạng hàng</TableHead>
            <TableHead>Trọng lượng chuẩn</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center" className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        {!isLoading && items.length > 0 && (
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/15 text-ice-dark">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-navy-900">{item.itemCode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-800">{item.itemName}</p>
                    {item.itemNameEn && (
                      <p className="text-xs text-navy-400">{item.itemNameEn}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <CargoFormBadge cargoForm={item.cargoForm} />
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {item.stdNetWeight && (
                      <p className="text-navy-700">{item.stdNetWeight} kg (tịnh)</p>
                    )}
                    {item.stdGrossWeight && (
                      <p className="text-navy-500">{item.stdGrossWeight} kg (tổng)</p>
                    )}
                    {!item.stdNetWeight && !item.stdGrossWeight && (
                      <span className="text-navy-400">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell align="center">
                  <StatusBadge isActive={item.isActive} />
                </TableCell>
                <TableCell align="center">
                  <ActionMenu
                    onEdit={() => handleEdit(item)}
                    onDeactivate={() => handleDeactivate(item)}
                    onReactivate={() => handleReactivate(item)}
                    isActive={item.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </MasterDataTableWrapper>

      <ItemFormDrawer
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
        entityName={deactivateState.data?.itemName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={handleConfirmReactivate}
        entityName={reactivateState.data?.itemName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
