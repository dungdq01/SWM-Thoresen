import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vesselApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useVesselNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.vessels, 'next-code'],
    queryFn: () => vesselApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useVesselList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.vessels, filters],
    queryFn: () => vesselApi.getList(filters),
    staleTime: 30000,
  })
}

export function useCreateVessel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => vesselApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vessels })
      toast.success('Tạo tàu/sà lan thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useUpdateVessel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => vesselApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vessels })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vesselDetail(id) })
      toast.success('Cập nhật tàu/sà lan thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useDeactivateVessel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => vesselApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vessels })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vesselDetail(id) })
      toast.success('Đã ngừng hoạt động tàu/sà lan')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useReactivateVessel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => vesselApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vessels })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vesselDetail(id) })
      toast.success('Đã kích hoạt lại tàu/sà lan')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}
