import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useVendorNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.vendors, 'next-code'],
    queryFn: () => vendorApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useVendorList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.vendors, filters],
    queryFn: () => vendorApi.getList(filters),
    staleTime: 30000,
  })
}

export function useVendorDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.vendorDetail(id),
    queryFn: () => vendorApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => vendorApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendors })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVendors })
      toast.success('Tạo nhà cung cấp thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tạo nhà cung cấp')
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => vendorApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendors })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendorDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVendors })
      toast.success('Cập nhật nhà cung cấp thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật nhà cung cấp')
      }
    },
  })
}

export function useDeactivateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => vendorApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendors })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendorDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVendors })
      toast.success('Đã ngừng hoạt động nhà cung cấp')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động nhà cung cấp')
    },
  })
}

export function useReactivateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => vendorApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendors })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.vendorDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupVendors })
      toast.success('Đã kích hoạt lại nhà cung cấp')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại nhà cung cấp')
    },
  })
}
