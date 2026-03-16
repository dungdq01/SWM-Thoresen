import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { carrierApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useCarrierNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.carriers, 'next-code'],
    queryFn: () => carrierApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useCarrierList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.carriers, filters],
    queryFn: () => carrierApi.getList(filters),
    staleTime: 30000,
  })
}

export function useCreateCarrier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => carrierApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carriers })
      toast.success('Tạo nhà vận chuyển thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useUpdateCarrier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => carrierApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carriers })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carrierDetail(id) })
      toast.success('Cập nhật nhà vận chuyển thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useDeactivateCarrier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => carrierApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carriers })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carrierDetail(id) })
      toast.success('Đã ngừng hoạt động nhà vận chuyển')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useReactivateCarrier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => carrierApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carriers })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.carrierDetail(id) })
      toast.success('Đã kích hoạt lại nhà vận chuyển')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}
