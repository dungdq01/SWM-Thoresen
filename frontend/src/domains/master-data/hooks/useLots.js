import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lotApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useLotNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.lots, 'next-code'],
    queryFn: () => lotApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useLotList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.lots, filters],
    queryFn: () => lotApi.getList(filters),
    staleTime: 30000,
  })
}

export function useLotDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lotDetail(id),
    queryFn: () => lotApi.getById(id),
    enabled: !!id,
  })
}

export function useLotTraceability(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lotTraceability(id),
    queryFn: () => lotApi.getTraceability(id),
    enabled: !!id,
  })
}

export function useLotFifo(itemId, ownerId, warehouseId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lotFifo(itemId, ownerId, warehouseId),
    queryFn: () => lotApi.getFifo({ itemId, ownerId, warehouseId }),
    enabled: !!(itemId && ownerId && warehouseId),
  })
}

export function useCreateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => lotApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lots })
      toast.success('Tạo lô hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useGetOrCreateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => lotApi.getOrCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lots })
      if (result?.data?.created) {
        toast.success('Tạo lô hàng mới thành công')
      }
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => lotApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lots })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lotDetail(id) })
      toast.success('Cập nhật lô hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => lotApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lots })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lotDetail(id) })
      toast.success('Đã ngừng hoạt động lô hàng')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => lotApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lots })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lotDetail(id) })
      toast.success('Đã kích hoạt lại lô hàng')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
