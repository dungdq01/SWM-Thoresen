import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehouseApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useWarehouseList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.warehouses, filters],
    queryFn: () => warehouseApi.getList(filters),
    staleTime: 30000,
  })
}

export function useWarehouseDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.warehouseDetail(id),
    queryFn: () => warehouseApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => warehouseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouses })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupWarehouses })
      toast.success('Tạo kho thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tạo kho')
    },
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => warehouseApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouses })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouseDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupWarehouses })
      toast.success('Cập nhật kho thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật kho')
      }
    },
  })
}

export function useDeactivateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => warehouseApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouses })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouseDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupWarehouses })
      toast.success('Đã ngừng hoạt động kho')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động kho')
    },
  })
}

export function useReactivateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => warehouseApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouses })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouseDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupWarehouses })
      toast.success('Đã kích hoạt lại kho')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại kho')
    },
  })
}
