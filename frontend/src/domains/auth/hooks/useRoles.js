import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useRoles(filters = {}) {
  return useQuery({
    queryKey: queryKeys.roles.list(filters),
    queryFn: () => authApi.getRoles(filters),
    select: (response) => response?.data ?? response ?? [],
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success('Tạo vai trò mới thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => authApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success('Cập nhật vai trò thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => authApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success('Đã xóa vai trò')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useAssignPermissionToRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ roleId, data }) => authApi.assignPermissionToRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success('Gán quyền thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
