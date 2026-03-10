import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useCustomerNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.customers, 'next-code'],
    queryFn: () => customerApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useCustomerList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.customers, filters],
    queryFn: () => customerApi.getList(filters),
    staleTime: 30000,
  })
}

export function useCustomerDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.customerDetail(id),
    queryFn: () => customerApi.getById(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.customers })
      toast.success('Thêm khách hàng thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể thêm khách hàng')
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => customerApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.customers })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.customerDetail(variables.id) })
      toast.success('Cập nhật khách hàng thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể cập nhật khách hàng')
    },
  })
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => customerApi.deactivate(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.customers })
      toast.success('Đã ngừng hoạt động khách hàng')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động khách hàng')
    },
  })
}

export function useReactivateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => customerApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.customers })
      toast.success('Đã kích hoạt lại khách hàng')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại khách hàng')
    },
  })
}
