import { useState, useCallback } from 'react'
import { Users } from 'lucide-react'
import {
  useCustomerList,
  useCreateCustomer,
  useUpdateCustomer,
  useDeactivateCustomer,
  useReactivateCustomer,
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
  CUSTOMER_GROUPS,
  CUSTOMER_TYPES,
} from '@domains/master-data'
import { CustomerFormDrawer } from '@features/master-data'
import { Badge } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const CustomerGroupBadge = ({ group }) => {
  const config = {
    CORPORATE: { label: 'Doanh nghiệp', variant: 'info' },
    INDIVIDUAL: { label: 'Cá nhân', variant: 'warning' },
  }
  const { label, variant } = config[group] || { label: group, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

const CustomerTypeBadge = ({ type }) => {
  const config = {
    BUYER: { label: 'Người mua', variant: 'success' },
    CONSIGNEE: { label: 'Người nhận', variant: 'info' },
    SHIPPER: { label: 'Người gửi', variant: 'warning' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function CustomersPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    keyword: '',
    isActive: '',
    customerGroup: '',
    customerType: '',
  })

  const [drawerState, setDrawerState] = useState({ isOpen: false, data: null })
  const [deactivateState, setDeactivateState] = useState({ isOpen: false, data: null })
  const [reactivateState, setReactivateState] = useState({ isOpen: false, data: null })

  const { data: response, isLoading, refetch } = useCustomerList({
    page: filters.page,
    pageSize: filters.pageSize,
    keyword: filters.keyword || undefined,
    isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    customerGroup: filters.customerGroup || undefined,
    customerType: filters.customerType || undefined,
  })

  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deactivateMutation = useDeactivateCustomer()
  const reactivateMutation = useReactivateCustomer()

  const customers = response?.data || []
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
      customerGroup: '',
      customerType: '',
      page: 1,
    }))
  }, [])

  const handlePageChange = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleAdd = () => setDrawerState({ isOpen: true, data: null })
  const handleEdit = (customer) => setDrawerState({ isOpen: true, data: customer })
  const handleCloseDrawer = () => setDrawerState({ isOpen: false, data: null })

  const handleSubmit = async (data) => {
    try {
      if (drawerState.data) {
        // Remove customerCode (immutable) and add rowVersion for optimistic locking
        const { customerCode, ...updateFields } = data
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

  const handleDeactivate = (customer) => setDeactivateState({ isOpen: true, data: customer })
  const handleReactivate = (customer) => setReactivateState({ isOpen: true, data: customer })

  const confirmDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id: deactivateState.data.id, reason })
      setDeactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const confirmReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(reactivateState.data.id)
      setReactivateState({ isOpen: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const filterConfig = [
    {
      key: 'isActive',
      label: 'Trạng thái',
      options: STATUS_OPTIONS,
      value: filters.isActive,
    },
    {
      key: 'customerGroup',
      label: 'Nhóm KH',
      options: CUSTOMER_GROUPS,
      value: filters.customerGroup,
    },
    {
      key: 'customerType',
      label: 'Loại KH',
      options: CUSTOMER_TYPES,
      value: filters.customerType,
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        icon={Users}
        title="Khách hàng"
        description="Quản lý danh sách khách hàng"
        onAdd={handleAdd}
        addLabel="Thêm khách hàng"
      />

      <FilterBar
        keyword={filters.keyword}
        onKeywordChange={handleKeywordChange}
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchPlaceholder="Tìm theo mã, tên, MST..."
      />

      <MasterDataTableWrapper
        isLoading={isLoading}
        isEmpty={customers.length === 0}
        emptyMessage="Chưa có khách hàng nào"
        pagination={{
          currentPage: meta.page,
          totalPages: meta.totalPages,
          total: meta.total,
          onPageChange: handlePageChange,
        }}
      >
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead align="center">Nhóm</TableHead>
            <TableHead align="center">Loại</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead align="center">Trạng thái</TableHead>
            <TableHead align="center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id} onClick={() => handleEdit(customer)}>
              <TableCell>
                <span className="font-mono font-semibold text-navy-900">{customer.customerCode}</span>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-navy-900">{customer.customerName}</div>
                  {customer.shortName && (
                    <div className="text-xs text-navy-500">{customer.shortName}</div>
                  )}
                </div>
              </TableCell>
              <TableCell align="center">
                <CustomerGroupBadge group={customer.customerGroup} />
              </TableCell>
              <TableCell align="center">
                <CustomerTypeBadge type={customer.customerType} />
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {customer.contactName && <div className="text-navy-700">{customer.contactName}</div>}
                  {customer.phone && <div className="text-navy-500">{customer.phone}</div>}
                </div>
              </TableCell>
              <TableCell align="center">
                <StatusBadge isActive={customer.isActive} />
              </TableCell>
              <TableCell align="center">
                <ActionMenu
                  onEdit={() => handleEdit(customer)}
                  onDeactivate={customer.isActive ? () => handleDeactivate(customer) : undefined}
                  onReactivate={!customer.isActive ? () => handleReactivate(customer) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </MasterDataTableWrapper>

      <CustomerFormDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialData={drawerState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeactivateModal
        isOpen={deactivateState.isOpen}
        onClose={() => setDeactivateState({ isOpen: false, data: null })}
        onConfirm={confirmDeactivate}
        title="Ngừng hoạt động khách hàng"
        itemName={deactivateState.data?.customerName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateState.isOpen}
        onClose={() => setReactivateState({ isOpen: false, data: null })}
        onConfirm={confirmReactivate}
        title="Kích hoạt lại khách hàng"
        itemName={reactivateState.data?.customerName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
