import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vehicleTypeApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useVehicleTypeList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.vehicleTypes, filters],
    queryFn: () => vehicleTypeApi.getList(filters),
    staleTime: 30000,
  })
}

export function useVehicleTypeDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypeDetail(id),
    queryFn: () => vehicleTypeApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateVehicleType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => vehicleTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypes })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVehicleTypes })
      toast.success('Tạo loại phương tiện thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateVehicleType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => vehicleTypeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypes })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypeDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVehicleTypes })
      toast.success('Cập nhật loại phương tiện thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateVehicleType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => vehicleTypeApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypes })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypeDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVehicleTypes })
      toast.success('Đã ngừng hoạt động loại phương tiện')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateVehicleType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => vehicleTypeApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypes })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vehicleTypeDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVehicleTypes })
      toast.success('Đã kích hoạt lại loại phương tiện')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
