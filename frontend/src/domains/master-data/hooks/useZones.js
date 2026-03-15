import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zoneApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useZoneList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.zones, filters],
    queryFn: () => zoneApi.getList(filters),
    staleTime: 30000,
  })
}

export function useZoneDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.zoneDetail(id),
    queryFn: () => zoneApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => zoneApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zones })
      toast.success('Tạo zone thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => zoneApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zones })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zoneDetail(id) })
      toast.success('Cập nhật zone thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => zoneApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zones })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zoneDetail(id) })
      toast.success('Đã ngừng hoạt động zone')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => zoneApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zones })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zoneDetail(id) })
      toast.success('Đã kích hoạt lại zone')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
