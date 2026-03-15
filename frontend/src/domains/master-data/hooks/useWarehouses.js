import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehouseApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

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
      toast.error(parseApiError(error))
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
      toast.error(parseApiError(error))
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
      toast.error(parseApiError(error))
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
      toast.error(parseApiError(error))
    },
  })
}
